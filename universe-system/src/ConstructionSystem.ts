/**
 * ConstructionSystem.ts
 *
 * Manages construction projects for stations, outposts, and other structures.
 * Factions use this system to build new infrastructure automatically.
 *
 * Features:
 * - Blueprint-based construction (different types have different costs/times)
 * - Progress tracking over time
 * - Construction completion and cancellation
 * - Resource cost management
 */

import { Vector3 } from './CelestialBody';
import { CommodityType } from './economy/commodity';

/**
 * Construction project types
 */
export type ConstructionProjectType =
  | 'STATION'           // Large trading hub
  | 'OUTPOST'           // Small outpost for territory control
  | 'MINING_PLATFORM'   // Resource extraction platform
  | 'REFINERY'          // Processes raw materials into refined goods
  | 'DEFENSE_PLATFORM'; // Military defense station

/**
 * Construction project data
 */
export interface ConstructionProject {
  id: string;
  type: ConstructionProjectType;
  position: Vector3;
  costs: Array<{ commodity: CommodityType; quantity: number }>;
  buildTime: number; // seconds
  progress: number; // 0-1
  startTime: number;
  owner: string; // Player or faction ID
  systemId?: string; // Star system where construction is happening
}

/**
 * Blueprint for a construction project
 */
interface ConstructionBlueprint {
  costs: Array<{ commodity: CommodityType; quantity: number }>;
  buildTime: number;
}

/**
 * Construction event data for completion notifications
 */
export interface ConstructionCompleteEvent {
  projectId: string;
  type: ConstructionProjectType;
  position: Vector3;
  owner: string;
  systemId?: string;
}

/**
 * ConstructionSystem
 *
 * Manages all active construction projects in the universe.
 * Handles project creation, progress updates, and completion.
 */
export class ConstructionSystem {
  private activeProjects: Map<string, ConstructionProject> = new Map();
  private completionCallbacks: Array<(event: ConstructionCompleteEvent) => void> = [];
  private nextProjectId: number = 1;

  /**
   * Start new construction project
   *
   * @param type - Type of structure to build
   * @param position - Location in 3D space
   * @param owner - Faction or player ID
   * @param systemId - Optional star system ID
   * @returns Created project or null if blueprint not found
   */
  startConstruction(
    type: ConstructionProjectType,
    position: Vector3,
    owner: string,
    systemId?: string
  ): ConstructionProject | null {
    const blueprint = this.getBlueprint(type);

    if (!blueprint) {
      console.warn(`No blueprint found for construction type: ${type}`);
      return null;
    }

    const project: ConstructionProject = {
      id: `construction_${this.nextProjectId++}_${Date.now()}`,
      type,
      position: { ...position }, // Clone position
      costs: blueprint.costs.map(c => ({ ...c })), // Clone costs
      buildTime: blueprint.buildTime,
      progress: 0,
      startTime: Date.now(),
      owner,
      systemId
    };

    this.activeProjects.set(project.id, project);

    console.log(`[ConstructionSystem] Started ${type} for ${owner} at`, position);

    return project;
  }

  /**
   * Get construction blueprint for station type
   *
   * Blueprints define the resources needed and time required for each structure type.
   *
   * @param type - Construction project type
   * @returns Blueprint with costs and build time, or null if not found
   */
  private getBlueprint(type: ConstructionProjectType): ConstructionBlueprint | null {
    const blueprints: Record<ConstructionProjectType, ConstructionBlueprint> = {
      // Large trading station - expensive, long build time
      STATION: {
        costs: [
          { commodity: CommodityType.STEEL, quantity: 500 },
          { commodity: CommodityType.ELECTRONICS, quantity: 200 },
          { commodity: CommodityType.MACHINERY, quantity: 100 }
        ],
        buildTime: 3600 // 1 hour
      },

      // Small outpost - cheap way to claim territory
      OUTPOST: {
        costs: [
          { commodity: CommodityType.STEEL, quantity: 200 },
          { commodity: CommodityType.ELECTRONICS, quantity: 50 }
        ],
        buildTime: 1800 // 30 minutes
      },

      // Mining platform - extracts resources from asteroids
      MINING_PLATFORM: {
        costs: [
          { commodity: CommodityType.STEEL, quantity: 300 },
          { commodity: CommodityType.MACHINERY, quantity: 150 },
          { commodity: CommodityType.FUSION_PELLETS, quantity: 50 }
        ],
        buildTime: 2400 // 40 minutes
      },

      // Refinery - processes raw materials into refined goods
      REFINERY: {
        costs: [
          { commodity: CommodityType.STEEL, quantity: 400 },
          { commodity: CommodityType.MACHINERY, quantity: 200 },
          { commodity: CommodityType.SILICON, quantity: 100 }
        ],
        buildTime: 2700 // 45 minutes
      },

      // Defense platform - military installation
      DEFENSE_PLATFORM: {
        costs: [
          { commodity: CommodityType.STEEL, quantity: 600 },
          { commodity: CommodityType.WEAPONS, quantity: 100 },
          { commodity: CommodityType.ELECTRONICS, quantity: 150 }
        ],
        buildTime: 3000 // 50 minutes
      }
    };

    return blueprints[type] || null;
  }

  /**
   * Update construction progress for all active projects
   *
   * @param deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime: number): void {
    const completedProjects: string[] = [];

    this.activeProjects.forEach((project, id) => {
      // Update progress (progress is 0-1, representing percentage complete)
      project.progress += deltaTime / project.buildTime;

      // Check if construction is complete
      if (project.progress >= 1.0) {
        project.progress = 1.0; // Cap at 100%
        this.completeConstruction(project);
        completedProjects.push(id);
      }
    });

    // Remove completed projects
    completedProjects.forEach(id => this.activeProjects.delete(id));
  }

  /**
   * Complete construction and notify listeners
   *
   * @param project - Completed construction project
   */
  private completeConstruction(project: ConstructionProject): void {
    console.log(`[ConstructionSystem] Construction complete: ${project.type} at`, project.position);

    // Create completion event
    const event: ConstructionCompleteEvent = {
      projectId: project.id,
      type: project.type,
      position: project.position,
      owner: project.owner,
      systemId: project.systemId
    };

    // Notify all registered callbacks
    this.completionCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[ConstructionSystem] Error in completion callback:', error);
      }
    });
  }

  /**
   * Cancel construction and refund partial resources
   *
   * Cancelling a project refunds resources based on progress.
   * The refund rate is 80% of progress (20% loss for cancellation).
   *
   * @param projectId - ID of project to cancel
   * @returns Array of refunded resources
   */
  cancelConstruction(projectId: string): Array<{ commodity: CommodityType; quantity: number }> {
    const project = this.activeProjects.get(projectId);

    if (!project) {
      console.warn(`[ConstructionSystem] Cannot cancel: project ${projectId} not found`);
      return [];
    }

    // Refund based on progress (lose 20% as cancellation penalty)
    const refundRate = Math.max(0, (1 - project.progress) * 0.8);
    const refunds = project.costs.map(cost => ({
      commodity: cost.commodity,
      quantity: Math.floor(cost.quantity * refundRate)
    }));

    this.activeProjects.delete(projectId);

    console.log(`[ConstructionSystem] Cancelled ${project.type} (${Math.round(project.progress * 100)}% complete)`);

    return refunds;
  }

  /**
   * Get all active construction projects
   *
   * @returns Array of all active projects
   */
  getActiveProjects(): ConstructionProject[] {
    return Array.from(this.activeProjects.values());
  }

  /**
   * Get active projects for a specific owner
   *
   * @param owner - Faction or player ID
   * @returns Array of projects owned by this entity
   */
  getProjectsByOwner(owner: string): ConstructionProject[] {
    return this.getActiveProjects().filter(p => p.owner === owner);
  }

  /**
   * Get active projects in a specific system
   *
   * @param systemId - Star system ID
   * @returns Array of projects in this system
   */
  getProjectsBySystem(systemId: string): ConstructionProject[] {
    return this.getActiveProjects().filter(p => p.systemId === systemId);
  }

  /**
   * Get project by ID
   *
   * @param projectId - Project ID
   * @returns Project or undefined if not found
   */
  getProject(projectId: string): ConstructionProject | undefined {
    return this.activeProjects.get(projectId);
  }

  /**
   * Register callback for construction completion events
   *
   * @param callback - Function to call when construction completes
   */
  onConstructionComplete(callback: (event: ConstructionCompleteEvent) => void): void {
    this.completionCallbacks.push(callback);
  }

  /**
   * Get blueprint costs for a construction type (for planning)
   *
   * @param type - Construction project type
   * @returns Blueprint or null if not found
   */
  getBlueprintCosts(type: ConstructionProjectType): Array<{ commodity: CommodityType; quantity: number }> | null {
    const blueprint = this.getBlueprint(type);
    return blueprint ? blueprint.costs.map(c => ({ ...c })) : null;
  }

  /**
   * Get blueprint build time for a construction type (for planning)
   *
   * @param type - Construction project type
   * @returns Build time in seconds, or 0 if not found
   */
  getBlueprintBuildTime(type: ConstructionProjectType): number {
    const blueprint = this.getBlueprint(type);
    return blueprint ? blueprint.buildTime : 0;
  }

  /**
   * Clear all active projects (useful for testing/reset)
   */
  clear(): void {
    this.activeProjects.clear();
    console.log('[ConstructionSystem] Cleared all active projects');
  }
}
