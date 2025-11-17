/**
 * traffic-manager.ts
 * Manages all NPC traffic in a star system
 *
 * Implements:
 * - Spatial hash grid for efficient nearest-neighbor queries
 * - Traffic density tracking
 * - Vessel spawning/despawning
 * - Global traffic coordination
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';

/**
 * Spatial hash grid for O(1) nearest-neighbor queries
 *
 * Divides space into cells and tracks which vessels are in each cell.
 * Queries only need to check nearby cells instead of all vessels.
 */
export class SpatialHashGrid<T> {
  private cellSize: number;
  private grid: Map<string, T[]> = new Map();

  constructor(cellSize: number = 100000) {
    // Default cell size: 100 km
    this.cellSize = cellSize;
  }

  /**
   * Convert position to grid cell coordinates
   */
  private positionToCell(position: Vector3): { x: number; y: number; z: number } {
    return {
      x: Math.floor(position.x / this.cellSize),
      y: Math.floor(position.y / this.cellSize),
      z: Math.floor(position.z / this.cellSize)
    };
  }

  /**
   * Convert cell coordinates to hash key
   */
  private cellToKey(cell: { x: number; y: number; z: number }): string {
    return `${cell.x},${cell.y},${cell.z}`;
  }

  /**
   * Add item to grid at position
   */
  public add(position: Vector3, item: T): void {
    const cell = this.positionToCell(position);
    const key = this.cellToKey(cell);

    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }

    this.grid.get(key)!.push(item);
  }

  /**
   * Remove item from grid
   * Note: Less efficient than add, requires checking cells
   */
  public remove(position: Vector3, item: T): boolean {
    const cell = this.positionToCell(position);
    const key = this.cellToKey(cell);

    const items = this.grid.get(key);
    if (!items) return false;

    const index = items.indexOf(item);
    if (index === -1) return false;

    items.splice(index, 1);

    // Remove empty cells
    if (items.length === 0) {
      this.grid.delete(key);
    }

    return true;
  }

  /**
   * Query items within radius of position
   *
   * Only checks nearby cells, not entire grid
   */
  public query(position: Vector3, radius: number): T[] {
    const results: T[] = [];

    // Calculate which cells to check
    const centerCell = this.positionToCell(position);
    const cellRadius = Math.ceil(radius / this.cellSize);

    // Check all cells within range
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const cell = {
            x: centerCell.x + dx,
            y: centerCell.y + dy,
            z: centerCell.z + dz
          };

          const key = this.cellToKey(cell);
          const items = this.grid.get(key);

          if (items) {
            results.push(...items);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get all items in grid
   */
  public getAll(): T[] {
    const results: T[] = [];

    for (const items of this.grid.values()) {
      results.push(...items);
    }

    return results;
  }

  /**
   * Clear entire grid
   */
  public clear(): void {
    this.grid.clear();
  }

  /**
   * Get number of occupied cells
   */
  public getCellCount(): number {
    return this.grid.size;
  }

  /**
   * Get total number of items
   */
  public getItemCount(): number {
    let count = 0;
    for (const items of this.grid.values()) {
      count += items.length;
    }
    return count;
  }

  /**
   * Get grid statistics for debugging
   */
  public getStats(): {
    cellCount: number;
    itemCount: number;
    avgItemsPerCell: number;
    maxItemsPerCell: number;
  } {
    const cellCount = this.grid.size;
    const itemCount = this.getItemCount();

    let maxItemsPerCell = 0;
    for (const items of this.grid.values()) {
      maxItemsPerCell = Math.max(maxItemsPerCell, items.length);
    }

    return {
      cellCount,
      itemCount,
      avgItemsPerCell: cellCount > 0 ? itemCount / cellCount : 0,
      maxItemsPerCell
    };
  }
}

/**
 * Traffic density information
 */
export interface TrafficDensity {
  position: Vector3;
  radius: number;
  vesselCount: number;
  density: number; // vessels per cubic kilometer
}

/**
 * Traffic statistics
 */
export interface TrafficStatistics {
  totalVessels: number;
  vesselsByType: Map<string, number>;
  avgSpeed: number;
  maxSpeed: number;
  totalKineticEnergy: number;
  gridStats: {
    cellCount: number;
    itemCount: number;
    avgItemsPerCell: number;
    maxItemsPerCell: number;
  };
}

/**
 * Interface for trackable vessels
 */
export interface ITrackableVessel {
  id: string;
  position: Vector3;
  velocity: Vector3;
  type: string;
}

/**
 * Traffic Manager
 *
 * Manages all NPC vessels in a star system using spatial hash grid
 * for efficient queries.
 */
export class TrafficManager<T extends ITrackableVessel> {
  private vessels: Map<string, T> = new Map();
  private spatialGrid: SpatialHashGrid<T>;
  private maxVessels: number;

  // Performance optimization
  private gridNeedsRebuild: boolean = false;
  private rebuildInterval: number = 1.0; // Rebuild grid every N seconds
  private timeSinceRebuild: number = 0;

  constructor(gridCellSize: number = 100000, maxVessels: number = 100) {
    this.spatialGrid = new SpatialHashGrid<T>(gridCellSize);
    this.maxVessels = maxVessels;
  }

  /**
   * Add vessel to traffic system
   */
  public addVessel(vessel: T): boolean {
    // Check vessel limit
    if (this.vessels.size >= this.maxVessels) {
      return false;
    }

    // Add to map and grid
    this.vessels.set(vessel.id, vessel);
    this.spatialGrid.add(vessel.position, vessel);

    return true;
  }

  /**
   * Remove vessel from traffic system
   */
  public removeVessel(vesselId: string): boolean {
    const vessel = this.vessels.get(vesselId);
    if (!vessel) return false;

    this.vessels.delete(vesselId);
    this.spatialGrid.remove(vessel.position, vessel);

    return true;
  }

  /**
   * Get vessel by ID
   */
  public getVessel(vesselId: string): T | undefined {
    return this.vessels.get(vesselId);
  }

  /**
   * Get all vessels
   */
  public getAllVessels(): T[] {
    return Array.from(this.vessels.values());
  }

  /**
   * Get vessels within radius of position
   *
   * Uses spatial grid for O(1) average case performance
   */
  public getVesselsNear(position: Vector3, radius: number): T[] {
    const candidates = this.spatialGrid.query(position, radius);

    // Filter to exact radius (grid query is approximate)
    return candidates.filter(vessel => {
      const distance = vessel.position.subtract(position).length();
      return distance <= radius;
    });
  }

  /**
   * Get N nearest vessels to position
   */
  public getNearestVessels(position: Vector3, count: number): T[] {
    // Start with nearby vessels
    let searchRadius = 10000; // Start with 10 km
    let vessels: T[] = [];

    // Expand search until we find enough vessels
    while (vessels.length < count && searchRadius < 1e10) {
      vessels = this.getVesselsNear(position, searchRadius);
      searchRadius *= 2;
    }

    // Sort by distance
    vessels.sort((a, b) => {
      const distA = a.position.subtract(position).length();
      const distB = b.position.subtract(position).length();
      return distA - distB;
    });

    // Return top N
    return vessels.slice(0, count);
  }

  /**
   * Get traffic density at position
   */
  public getTrafficDensity(position: Vector3, radius: number): TrafficDensity {
    const vessels = this.getVesselsNear(position, radius);

    // Volume of sphere: (4/3) * π * r³
    const volume = (4 / 3) * Math.PI * Math.pow(radius / 1000, 3); // in km³

    return {
      position,
      radius,
      vesselCount: vessels.length,
      density: vessels.length / volume
    };
  }

  /**
   * Get vessels by type
   */
  public getVesselsByType(type: string): T[] {
    return Array.from(this.vessels.values()).filter(v => v.type === type);
  }

  /**
   * Get traffic statistics
   */
  public getStatistics(): TrafficStatistics {
    const vessels = this.getAllVessels();

    // Count by type
    const vesselsByType = new Map<string, number>();
    let totalSpeed = 0;
    let maxSpeed = 0;
    let totalKineticEnergy = 0;

    for (const vessel of vessels) {
      // Type counting
      const count = vesselsByType.get(vessel.type) || 0;
      vesselsByType.set(vessel.type, count + 1);

      // Speed statistics
      const speed = vessel.velocity.length();
      totalSpeed += speed;
      maxSpeed = Math.max(maxSpeed, speed);

      // Kinetic energy (assuming 50 ton vessels for now)
      // KE = 0.5 * m * v²
      const mass = 50000; // kg
      totalKineticEnergy += 0.5 * mass * speed * speed;
    }

    return {
      totalVessels: vessels.length,
      vesselsByType,
      avgSpeed: vessels.length > 0 ? totalSpeed / vessels.length : 0,
      maxSpeed,
      totalKineticEnergy,
      gridStats: this.spatialGrid.getStats()
    };
  }

  /**
   * Update traffic manager
   *
   * Rebuilds spatial grid periodically as vessels move
   */
  public update(dt: number): void {
    this.timeSinceRebuild += dt;

    // Rebuild grid periodically
    if (this.timeSinceRebuild >= this.rebuildInterval || this.gridNeedsRebuild) {
      this.rebuildSpatialGrid();
      this.timeSinceRebuild = 0;
      this.gridNeedsRebuild = false;
    }
  }

  /**
   * Rebuild spatial grid from current vessel positions
   */
  private rebuildSpatialGrid(): void {
    this.spatialGrid.clear();

    for (const vessel of this.vessels.values()) {
      this.spatialGrid.add(vessel.position, vessel);
    }
  }

  /**
   * Force grid rebuild on next update
   */
  public markGridDirty(): void {
    this.gridNeedsRebuild = true;
  }

  /**
   * Clear all vessels
   */
  public clear(): void {
    this.vessels.clear();
    this.spatialGrid.clear();
  }

  /**
   * Get vessel count
   */
  public getVesselCount(): number {
    return this.vessels.size;
  }

  /**
   * Check if at capacity
   */
  public isFull(): boolean {
    return this.vessels.size >= this.maxVessels;
  }

  /**
   * Get available capacity
   */
  public getAvailableCapacity(): number {
    return this.maxVessels - this.vessels.size;
  }

  /**
   * Set max vessels
   */
  public setMaxVessels(max: number): void {
    this.maxVessels = max;
  }

  /**
   * Check if position is congested
   *
   * @param position Position to check
   * @param radius Radius to check
   * @param threshold Congestion threshold (vessels per km³)
   * @returns true if congested
   */
  public isCongested(position: Vector3, radius: number, threshold: number = 0.1): boolean {
    const density = this.getTrafficDensity(position, radius);
    return density.density > threshold;
  }

  /**
   * Find least congested position near target
   *
   * Useful for spawning vessels in uncongested areas
   */
  public findLeastCongestedPosition(
    targetPosition: Vector3,
    searchRadius: number,
    samples: number = 8
  ): Vector3 {
    let bestPosition = targetPosition;
    let lowestDensity = Infinity;

    // Sample positions around target
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * 2 * Math.PI;
      const radius = searchRadius * Math.random();

      const samplePosition = new Vector3(
        targetPosition.x + radius * Math.cos(angle),
        targetPosition.y + (Math.random() - 0.5) * radius * 0.5,
        targetPosition.z + radius * Math.sin(angle)
      );

      const density = this.getTrafficDensity(samplePosition, 5000);

      if (density.density < lowestDensity) {
        lowestDensity = density.density;
        bestPosition = samplePosition;
      }
    }

    return bestPosition;
  }
}
