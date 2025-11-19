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
 * - ACTUAL STATION CREATION (not just callbacks!)
 */

import { Vector3 } from './CelestialBody';
import { CommodityType } from './economy/commodity';
import { StationGenerator, SpaceStation } from './StationGenerator';
import { StarSystem } from './StarSystem';
import { StationCreationIntegration } from './StationCreationIntegration';

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
  station?: SpaceStation; // NOW INCLUDES THE ACTUAL STATION!
}

/**
 * Station creation event data
 */
export interface StationCreatedEvent {
  station: SpaceStation;
  constructionProjectId: string;
  owner: string;
  systemId: string;
  constructionTime: number; // seconds it took to build
}

/**
 * ConstructionSystem
 *
 * Manages all active construction projects in the universe.
 * Handles project creation, progress updates, and completion.
 *
 * NOW ACTUALLY CREATES STATIONS WHEN CONSTRUCTION COMPLETES!
 */
export class ConstructionSystem {
  private activeProjects: Map<string, ConstructionProject> = new Map();
  private completionCallbacks: Array<(event: ConstructionCompleteEvent) => void> = [];
  private stationCreatedCallbacks: Array<(event: StationCreatedEvent) => void> = [];
  private nextProjectId: number = 1;

  // Linked systems for station creation
  private stationGenerator: StationGenerator | null = null;
  private starSystem: StarSystem | null = null;
  private stationCreationIntegration: StationCreationIntegration | null = null;

  /**
   * Link the StationGenerator for creating stations
   *
   * @param generator - StationGenerator instance
   */
  linkStationGenerator(generator: StationGenerator): void {
    this.stationGenerator = generator;
    this.updateIntegration();
    console.log('[ConstructionSystem] StationGenerator linked');
  }

  /**
   * Link the StarSystem for station registration
   *
   * @param starSystem - StarSystem instance
   */
  linkStarSystem(starSystem: StarSystem): void {
    this.starSystem = starSystem;
    this.updateIntegration();
    console.log('[ConstructionSystem] StarSystem linked');
  }

  /**
   * Update integration helper when both systems are linked
   */
  private updateIntegration(): void {
    if (this.stationGenerator && this.starSystem && !this.stationCreationIntegration) {
      this.stationCreationIntegration = new StationCreationIntegration(
        this.stationGenerator,
        this.starSystem
      );
      console.log('[ConstructionSystem] Station creation integration initialized');
    }
  }

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
   * Complete construction and CREATE THE ACTUAL STATION!
   *
   * This is where the magic happens - we actually create a real SpaceStation object
   * and integrate it with the universe.
   *
   * @param project - Completed construction project
   */
  private completeConstruction(project: ConstructionProject): void {
    console.log(`[ConstructionSystem] Construction complete: ${project.type} at`, project.position);

    let createdStation: SpaceStation | undefined;

    // ACTUALLY CREATE THE STATION (if systems are linked)
    if (this.stationCreationIntegration && project.systemId) {
      const result = this.stationCreationIntegration.createStation(
        project.type,
        project.position,
        project.owner,
        project.systemId
      );

      if (result.success && result.station) {
        createdStation = result.station;

        // Register station with all relevant systems
        this.stationCreationIntegration.registerStation(createdStation);

        // Register station with faction (add to faction's territory)
        this.registerStationWithFaction(createdStation, project.owner);

        // Calculate construction time
        const constructionTime = (Date.now() - project.startTime) / 1000;

        // Emit STATION_CREATED event
        const stationCreatedEvent: StationCreatedEvent = {
          station: createdStation,
          constructionProjectId: project.id,
          owner: project.owner,
          systemId: project.systemId,
          constructionTime
        };

        this.notifyStationCreated(stationCreatedEvent);

        console.log(`[ConstructionSystem] ✓ STATION CREATED: ${createdStation.name} (${createdStation.id})`);
      } else {
        console.error(`[ConstructionSystem] Failed to create station: ${result.error}`);
      }
    } else {
      if (!this.stationCreationIntegration) {
        console.warn('[ConstructionSystem] Station creation skipped - systems not linked. Call linkStationGenerator() and linkStarSystem()');
      }
    }

    // Create completion event
    const event: ConstructionCompleteEvent = {
      projectId: project.id,
      type: project.type,
      position: project.position,
      owner: project.owner,
      systemId: project.systemId,
      station: createdStation // Include the actual station!
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
   * Register station with owning faction
   *
   * @param station - Created station
   * @param owner - Owner faction ID
   */
  private registerStationWithFaction(station: SpaceStation, owner: string): void {
    // This would integrate with FactionSystem to add station to faction's territory
    // For now, we log the registration
    console.log(`[ConstructionSystem] Registered station ${station.id} with faction ${owner}`);

    // Future integration:
    // if (this.factionSystem) {
    //   this.factionSystem.addStationToTerritory(owner, station.id, station.systemId);
    // }
  }

  /**
   * Notify all station created callbacks
   *
   * @param event - Station created event
   */
  private notifyStationCreated(event: StationCreatedEvent): void {
    this.stationCreatedCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[ConstructionSystem] Error in station created callback:', error);
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
   * Register callback for station created events
   *
   * These fire AFTER the station is fully created and integrated.
   *
   * @param callback - Function to call when station is created
   */
  onStationCreated(callback: (event: StationCreatedEvent) => void): void {
    this.stationCreatedCallbacks.push(callback);
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
   * Check if systems are properly linked
   *
   * @returns True if station creation is enabled
   */
  isStationCreationEnabled(): boolean {
    return this.stationCreationIntegration !== null;
  }

  /**
   * Clear all active projects (useful for testing/reset)
   */
  clear(): void {
    this.activeProjects.clear();
    console.log('[ConstructionSystem] Cleared all active projects');
  }

  // ====================================================================
  // SAVE/LOAD SUPPORT
  // ====================================================================

  /**
   * Serialize system state for saving
   */
  serialize(): import('./SaveFileFormat').ConstructionSystemState {
    const projects = Array.from(this.activeProjects.values()).map(project => ({
      id: project.id,
      type: project.type,
      position: { ...project.position },
      costs: project.costs.map(c => ({ ...c })),
      buildTime: project.buildTime,
      progress: project.progress,
      startTime: project.startTime,
      owner: project.owner,
      systemId: project.systemId
    }));

    return {
      activeProjects: projects,
      nextProjectId: this.nextProjectId
    };
  }

  /**
   * Deserialize and restore system state
   */
  deserialize(state: import('./SaveFileFormat').ConstructionSystemState): void {
    console.log('[ConstructionSystem] Deserializing state...');

    // Clear existing state
    this.activeProjects.clear();

    // Restore projects
    for (const serializedProject of state.activeProjects) {
      const project: ConstructionProject = {
        id: serializedProject.id,
        type: serializedProject.type,
        position: { ...serializedProject.position },
        costs: serializedProject.costs.map(c => ({ ...c })),
        buildTime: serializedProject.buildTime,
        progress: serializedProject.progress,
        startTime: serializedProject.startTime,
        owner: serializedProject.owner,
        systemId: serializedProject.systemId
      };

      this.activeProjects.set(project.id, project);
    }

    // Restore counter
    this.nextProjectId = state.nextProjectId;

    console.log(`[ConstructionSystem] Restored ${this.activeProjects.size} active projects`);
  }
}
