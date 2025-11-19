/**
 * Performance Optimizations
 *
 * Provides spatial partitioning, object pooling, and LOD systems
 * for improved game performance with large numbers of objects.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

/**
 * Spatial Hash Grid
 * Divides 3D space into cells for efficient proximity queries
 */
export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, Set<any>>;

  constructor(cellSize: number = 100000) {
    // Default cell size: 100km
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /**
   * Get cell key for a position
   */
  private getCellKey(position: Vector3): string {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  /**
   * Add object to grid
   */
  add(object: any, position: Vector3): void {
    const key = this.getCellKey(position);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(object);
  }

  /**
   * Remove object from grid
   */
  remove(object: any, position: Vector3): void {
    const key = this.getCellKey(position);
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(object);
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
  }

  /**
   * Update object position in grid
   */
  update(object: any, oldPosition: Vector3, newPosition: Vector3): void {
    const oldKey = this.getCellKey(oldPosition);
    const newKey = this.getCellKey(newPosition);

    // Only update if cell changed
    if (oldKey !== newKey) {
      this.remove(object, oldPosition);
      this.add(object, newPosition);
    }
  }

  /**
   * Get objects near a position (within same cell and adjacent cells)
   */
  getNearby(position: Vector3, maxDistance?: number): any[] {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);

    const nearby: any[] = [];

    // Check current cell and 26 adjacent cells (3x3x3 cube)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.grid.get(key);
          if (cell) {
            cell.forEach(obj => {
              // Optional distance filter
              if (maxDistance !== undefined && obj.position) {
                const dist = this.distance(position, obj.position);
                if (dist <= maxDistance) {
                  nearby.push(obj);
                }
              } else {
                nearby.push(obj);
              }
            });
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Clear all objects
   */
  clear(): void {
    this.grid.clear();
  }

  /**
   * Get total object count
   */
  getObjectCount(): number {
    let count = 0;
    this.grid.forEach(cell => {
      count += cell.size;
    });
    return count;
  }

  /**
   * Get cell count
   */
  getCellCount(): number {
    return this.grid.size;
  }

  /**
   * Calculate distance between two points
   */
  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

/**
 * Object Pool
 * Reuses objects to reduce garbage collection overhead
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  /**
   * Acquire object from pool
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    // Pool exhausted, create new object
    return this.createFn();
  }

  /**
   * Return object to pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
    // If pool is full, object will be garbage collected
  }

  /**
   * Get current pool size
   */
  getSize(): number {
    return this.pool.length;
  }

  /**
   * Clear pool
   */
  clear(): void {
    this.pool = [];
  }
}

/**
 * Level of Detail (LOD) Manager
 * Adjusts detail level based on distance from camera/player
 */
export class LODManager {
  private lodLevels: LODLevel[];

  constructor(lodLevels?: LODLevel[]) {
    this.lodLevels = lodLevels || [
      { maxDistance: 1000, detail: 'high' },     // < 1km: full detail
      { maxDistance: 10000, detail: 'medium' },  // 1-10km: medium detail
      { maxDistance: 100000, detail: 'low' },    // 10-100km: low detail
      { maxDistance: Infinity, detail: 'minimal' } // > 100km: minimal detail
    ];
  }

  /**
   * Get LOD level for an object based on distance
   */
  getLOD(distance: number): string {
    for (const level of this.lodLevels) {
      if (distance < level.maxDistance) {
        return level.detail;
      }
    }
    return 'minimal';
  }

  /**
   * Check if object should be rendered based on distance
   */
  shouldRender(distance: number, maxRenderDistance: number = 1000000): boolean {
    return distance < maxRenderDistance;
  }

  /**
   * Get update rate multiplier based on distance
   * Closer objects update more frequently
   */
  getUpdateRateMultiplier(distance: number): number {
    if (distance < 1000) return 1.0;       // < 1km: every frame
    if (distance < 10000) return 0.5;      // 1-10km: every other frame
    if (distance < 100000) return 0.25;    // 10-100km: every 4th frame
    return 0.1;                            // > 100km: every 10th frame
  }
}

export interface LODLevel {
  maxDistance: number;
  detail: string;
}

/**
 * Frustum Culling
 * Determines if objects are visible within camera view
 */
export class FrustumCuller {
  private frustumPlanes: Plane[] = [];

  /**
   * Update frustum from camera parameters
   */
  updateFrustum(position: Vector3, forward: Vector3, up: Vector3, fov: number, aspect: number, near: number, far: number): void {
    // Calculate frustum planes
    // This is a simplified version - a full implementation would calculate all 6 planes
    this.frustumPlanes = [];

    // For now, just use a distance-based culling (sphere test)
    // A full implementation would calculate:
    // - Near plane
    // - Far plane
    // - Left plane
    // - Right plane
    // - Top plane
    // - Bottom plane
  }

  /**
   * Test if a sphere is within the frustum
   */
  testSphere(center: Vector3, radius: number, cameraPosition: Vector3, maxDistance: number): boolean {
    // Simple distance-based culling for now
    const dx = center.x - cameraPosition.x;
    const dy = center.y - cameraPosition.y;
    const dz = center.z - cameraPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return distance - radius < maxDistance;
  }

  /**
   * Test if a bounding box is within the frustum
   */
  testBox(box: BoundingBox, cameraPosition: Vector3, maxDistance: number): boolean {
    // Test box center for simplicity
    const center = {
      x: (box.min.x + box.max.x) / 2,
      y: (box.min.y + box.max.y) / 2,
      z: (box.min.z + box.max.z) / 2
    };

    // Calculate box radius (diagonal / 2)
    const dx = (box.max.x - box.min.x) / 2;
    const dy = (box.max.y - box.min.y) / 2;
    const dz = (box.max.z - box.min.z) / 2;
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return this.testSphere(center, radius, cameraPosition, maxDistance);
  }
}

interface Plane {
  normal: Vector3;
  distance: number;
}

/**
 * Performance Monitor
 * Tracks and reports performance metrics
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private frameCount: number = 0;
  private lastReportTime: number = 0;
  private reportInterval: number = 1000; // Report every second

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        totalTime: 0,
        count: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0
      });
    }

    const metric = this.metrics.get(name)!;
    (metric as any).startTime = performance.now();
  }

  /**
   * End timing an operation
   */
  endTimer(name: string): void {
    const metric = this.metrics.get(name);
    if (metric && (metric as any).startTime !== undefined) {
      const elapsed = performance.now() - (metric as any).startTime;

      metric.totalTime += elapsed;
      metric.count++;
      metric.minTime = Math.min(metric.minTime, elapsed);
      metric.maxTime = Math.max(metric.maxTime, elapsed);
      metric.avgTime = metric.totalTime / metric.count;

      delete (metric as any).startTime;
    }
  }

  /**
   * Record frame
   */
  recordFrame(): void {
    this.frameCount++;

    const now = performance.now();
    if (now - this.lastReportTime >= this.reportInterval) {
      this.reportMetrics();
      this.lastReportTime = now;
      this.frameCount = 0;
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): Map<string, PerformanceMetric> {
    return this.metrics;
  }

  /**
   * Report metrics (can be overridden)
   */
  private reportMetrics(): void {
    // Override this method to implement custom reporting
    // For example, send to console, network, or UI
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
    this.frameCount = 0;
    this.lastReportTime = performance.now();
  }
}

export interface PerformanceMetric {
  totalTime: number;
  count: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}

/**
 * Batch Renderer
 * Groups similar objects for efficient rendering
 */
export class BatchRenderer {
  private batches: Map<string, any[]> = new Map();

  /**
   * Add object to batch
   */
  addToBatch(batchKey: string, object: any): void {
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, []);
    }
    this.batches.get(batchKey)!.push(object);
  }

  /**
   * Get batch
   */
  getBatch(batchKey: string): any[] {
    return this.batches.get(batchKey) || [];
  }

  /**
   * Clear all batches
   */
  clear(): void {
    this.batches.clear();
  }

  /**
   * Get all batch keys
   */
  getBatchKeys(): string[] {
    return Array.from(this.batches.keys());
  }
}
