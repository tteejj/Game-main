/**
 * poi-manager.ts
 * POI Manager - Tracks and manages all Points of Interest
 *
 * Implements:
 * - POI tracking with spatial partitioning
 * - Discovery mechanics
 * - Procedural POI generation
 * - Discovery statistics
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';
import { PointOfInterest, POIType, DiscoveryState, DerelictShip, SpatialAnomaly, ResourceCache } from './point-of-interest';
import { ScanMechanics, ScannerConfig, ScanResult } from './scan-mechanics';

/**
 * POI discovery event
 */
export interface DiscoveryEvent {
  poi: PointOfInterest;
  discovererID: string;
  timestamp: number;
  discoveryType: 'DETECTED' | 'IDENTIFIED' | 'SCANNED';
  scanResult?: ScanResult;
}

/**
 * Discovery statistics
 */
export interface DiscoveryStats {
  totalPOIs: number;
  undiscovered: number;
  detected: number;
  identified: number;
  scanned: number;
  salvaged: number;
  byType: Map<POIType, number>;
  totalValue: number; // Total loot value of all POIs
  discoveredValue: number; // Value of discovered POIs
}

/**
 * Spatial grid cell for POI tracking
 */
interface SpatialCell {
  pois: Set<PointOfInterest>;
}

/**
 * POI generation configuration
 */
export interface POIGenerationConfig {
  density: number; // POIs per cubic AU
  derelictProbability: number; // 0-1
  anomalyProbability: number; // 0-1
  cacheProbability: number; // 0-1
  minDistanceFromStations: number; // meters
  maxDistanceFromStar: number; // meters
}

/**
 * POI Manager
 *
 * Manages all Points of Interest in a star system:
 * - Spatial partitioning for efficient queries
 * - Discovery tracking
 * - Procedural generation
 * - Statistics
 */
export class POIManager {
  private pois: Map<string, PointOfInterest> = new Map();
  private spatialGrid: Map<string, SpatialCell> = new Map();
  private cellSize: number = 100000; // 100 km cells
  private scanMechanics: ScanMechanics = new ScanMechanics();
  private discoveryEvents: DiscoveryEvent[] = [];
  private nextPOIId: number = 1;

  /**
   * Add POI to manager
   */
  public addPOI(poi: PointOfInterest): void {
    this.pois.set(poi.id, poi);
    this.addToSpatialGrid(poi);
  }

  /**
   * Remove POI from manager
   */
  public removePOI(poiID: string): void {
    const poi = this.pois.get(poiID);
    if (poi) {
      this.removeFromSpatialGrid(poi);
      this.pois.delete(poiID);
    }
  }

  /**
   * Get POI by ID
   */
  public getPOI(poiID: string): PointOfInterest | undefined {
    return this.pois.get(poiID);
  }

  /**
   * Get all POIs
   */
  public getAllPOIs(): PointOfInterest[] {
    return Array.from(this.pois.values());
  }

  /**
   * Get POIs within radius
   */
  public getPOIsNear(position: Vector3, radius: number): PointOfInterest[] {
    const nearby: PointOfInterest[] = [];
    const cells = this.getCellsInRadius(position, radius);

    for (const cellKey of cells) {
      const cell = this.spatialGrid.get(cellKey);
      if (cell) {
        for (const poi of cell.pois) {
          const distance = poi.getDistanceTo(position);
          if (distance <= radius) {
            nearby.push(poi);
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Get POIs by type
   */
  public getPOIsByType(type: POIType): PointOfInterest[] {
    return Array.from(this.pois.values()).filter(poi => poi.type === type);
  }

  /**
   * Get POIs by discovery state
   */
  public getPOIsByDiscoveryState(state: DiscoveryState): PointOfInterest[] {
    return Array.from(this.pois.values()).filter(poi => poi.discoveryState === state);
  }

  /**
   * Scan for POIs from a position
   *
   * @param scanner Scanner configuration
   * @param scannerPosition Scanner position
   * @param scannerID ID of scanning entity
   * @param currentTime Current game time
   * @param maxRange Maximum scan range
   * @returns Array of scan results for detected POIs
   */
  public scanForPOIs(
    scanner: ScannerConfig,
    scannerPosition: Vector3,
    scannerID: string,
    currentTime: number,
    maxRange: number
  ): Array<{ poi: PointOfInterest; scanResult: ScanResult }> {
    const results: Array<{ poi: PointOfInterest; scanResult: ScanResult }> = [];

    // Get POIs within max range
    const nearbyPOIs = this.getPOIsNear(scannerPosition, maxRange);

    for (const poi of nearbyPOIs) {
      // Perform scan
      const scanResult = this.scanMechanics.scan(scanner, poi, scannerPosition);

      if (scanResult.detected) {
        // Update discovery state
        this.updateDiscoveryState(poi, scanResult, scannerID, currentTime);

        results.push({ poi, scanResult });
      }
    }

    return results;
  }

  /**
   * Passive scan for emitting POIs
   */
  public passiveScanForPOIs(
    receiverPosition: Vector3,
    receiverSensitivity: number,
    receiverID: string,
    currentTime: number,
    maxRange: number
  ): Array<{ poi: PointOfInterest; scanResult: ScanResult }> {
    const results: Array<{ poi: PointOfInterest; scanResult: ScanResult }> = [];
    const nearbyPOIs = this.getPOIsNear(receiverPosition, maxRange);

    for (const poi of nearbyPOIs) {
      const scanResult = this.scanMechanics.passiveScan(poi, receiverPosition, receiverSensitivity);

      if (scanResult.detected) {
        this.updateDiscoveryState(poi, scanResult, receiverID, currentTime);
        results.push({ poi, scanResult });
      }
    }

    return results;
  }

  /**
   * Update POI discovery state based on scan result
   */
  private updateDiscoveryState(
    poi: PointOfInterest,
    scanResult: ScanResult,
    discovererID: string,
    currentTime: number
  ): void {
    const previousState = poi.discoveryState;

    // Update discovery state based on scan quality
    if (scanResult.canScan && poi.discoveryState !== DiscoveryState.SCANNED) {
      poi.scan();
      if (previousState !== DiscoveryState.SCANNED) {
        this.recordDiscovery(poi, discovererID, currentTime, 'SCANNED', scanResult);
      }
    } else if (scanResult.canIdentify && poi.discoveryState === DiscoveryState.DETECTED) {
      poi.identify();
      this.recordDiscovery(poi, discovererID, currentTime, 'IDENTIFIED', scanResult);
    } else if (scanResult.detected && !poi.isDiscovered()) {
      poi.discover(discovererID, currentTime);
      this.recordDiscovery(poi, discovererID, currentTime, 'DETECTED', scanResult);
    }
  }

  /**
   * Record discovery event
   */
  private recordDiscovery(
    poi: PointOfInterest,
    discovererID: string,
    timestamp: number,
    discoveryType: 'DETECTED' | 'IDENTIFIED' | 'SCANNED',
    scanResult?: ScanResult
  ): void {
    this.discoveryEvents.push({
      poi,
      discovererID,
      timestamp,
      discoveryType,
      scanResult
    });
  }

  /**
   * Get recent discovery events
   */
  public getRecentDiscoveries(count: number = 10): DiscoveryEvent[] {
    return this.discoveryEvents.slice(-count);
  }

  /**
   * Update all POIs
   */
  public update(deltaTime: number): void {
    for (const poi of this.pois.values()) {
      const oldPosition = poi.position.clone();
      poi.update(deltaTime);

      // Update spatial grid if POI moved to different cell
      if (this.getCellKey(oldPosition) !== this.getCellKey(poi.position)) {
        this.removeFromSpatialGrid(poi);
        this.addToSpatialGrid(poi);
      }
    }
  }

  /**
   * Get discovery statistics
   */
  public getStatistics(): DiscoveryStats {
    const byType = new Map<POIType, number>();
    let totalValue = 0;
    let discoveredValue = 0;

    const stats: DiscoveryStats = {
      totalPOIs: this.pois.size,
      undiscovered: 0,
      detected: 0,
      identified: 0,
      scanned: 0,
      salvaged: 0,
      byType,
      totalValue: 0,
      discoveredValue: 0
    };

    for (const poi of this.pois.values()) {
      // Count by state
      switch (poi.discoveryState) {
        case DiscoveryState.UNDISCOVERED:
          stats.undiscovered++;
          break;
        case DiscoveryState.DETECTED:
          stats.detected++;
          break;
        case DiscoveryState.IDENTIFIED:
          stats.identified++;
          break;
        case DiscoveryState.SCANNED:
          stats.scanned++;
          break;
        case DiscoveryState.SALVAGED:
          stats.salvaged++;
          break;
      }

      // Count by type
      const typeCount = byType.get(poi.type) || 0;
      byType.set(poi.type, typeCount + 1);

      // Calculate value
      const poiValue = poi.loot.reduce((sum, item) => sum + item.value, 0);
      totalValue += poiValue;
      if (poi.isDiscovered()) {
        discoveredValue += poiValue;
      }
    }

    stats.totalValue = totalValue;
    stats.discoveredValue = discoveredValue;

    return stats;
  }

  /**
   * Generate POIs procedurally
   */
  public generatePOIs(
    config: POIGenerationConfig,
    systemRadius: number,
    stationPositions: Vector3[] = []
  ): void {
    // Calculate volume (sphere)
    const AU = 149597870700; // meters
    const radiusAU = systemRadius / AU;
    const volume = (4 / 3) * Math.PI * Math.pow(radiusAU, 3); // cubic AU

    // Number of POIs to generate
    const targetCount = Math.floor(volume * config.density);

    for (let i = 0; i < targetCount; i++) {
      // Random position within sphere
      const position = this.randomPositionInSphere(systemRadius);

      // Check minimum distance from stations
      const tooCloseToStation = stationPositions.some(
        stationPos => position.subtract(stationPos).length() < config.minDistanceFromStations
      );

      if (tooCloseToStation) {
        continue; // Skip this POI
      }

      // Determine POI type based on probabilities
      const rand = Math.random();
      let poi: PointOfInterest;

      if (rand < config.derelictProbability) {
        poi = this.generateDerelict(position);
      } else if (rand < config.derelictProbability + config.anomalyProbability) {
        poi = this.generateAnomaly(position);
      } else if (rand < config.derelictProbability + config.anomalyProbability + config.cacheProbability) {
        poi = this.generateCache(position);
      } else {
        // Default to derelict
        poi = this.generateDerelict(position);
      }

      this.addPOI(poi);
    }
  }

  /**
   * Generate random derelict ship
   */
  private generateDerelict(position: Vector3): DerelictShip {
    const shipClasses = ['Freighter', 'Cruiser', 'Frigate', 'Transport', 'Scout', 'Destroyer'];
    const shipClass = shipClasses[Math.floor(Math.random() * shipClasses.length)];
    const condition = Math.random(); // 0-1
    const age = Math.floor(Math.random() * 100) + 1; // 1-100 years

    const id = `POI_DERELICT_${this.nextPOIId++}`;
    const name = `Derelict ${shipClass} #${Math.floor(Math.random() * 10000)}`;

    const derelict = new DerelictShip(id, name, position, shipClass, condition, age);

    // Random hazards
    derelict.isRadioactive = Math.random() > 0.8;
    derelict.hasBreach = Math.random() > 0.5;
    derelict.hasHostiles = Math.random() > 0.9;

    return derelict;
  }

  /**
   * Generate random spatial anomaly
   */
  private generateAnomaly(position: Vector3): SpatialAnomaly {
    const types: Array<'GRAVITATIONAL' | 'TEMPORAL' | 'ENERGY' | 'SPATIAL'> = [
      'GRAVITATIONAL',
      'TEMPORAL',
      'ENERGY',
      'SPATIAL'
    ];
    const anomalyType = types[Math.floor(Math.random() * types.length)];
    const intensity = Math.random() * 0.5 + 0.5; // 0.5-1.0

    const id = `POI_ANOMALY_${this.nextPOIId++}`;
    const name = `${anomalyType} Anomaly #${Math.floor(Math.random() * 10000)}`;

    return new SpatialAnomaly(id, name, position, anomalyType, intensity);
  }

  /**
   * Generate random resource cache
   */
  private generateCache(position: Vector3): ResourceCache {
    const types: Array<'SUPPLY' | 'FUEL' | 'VALUABLES' | 'MILITARY'> = [
      'SUPPLY',
      'FUEL',
      'VALUABLES',
      'MILITARY'
    ];
    const cacheType = types[Math.floor(Math.random() * types.length)];

    const id = `POI_CACHE_${this.nextPOIId++}`;
    const name = `${cacheType} Cache #${Math.floor(Math.random() * 10000)}`;

    return new ResourceCache(id, name, position, cacheType);
  }

  /**
   * Generate random position within sphere
   */
  private randomPositionInSphere(radius: number): Vector3 {
    // Use rejection sampling for uniform distribution
    let x, y, z, r2;
    do {
      x = (Math.random() - 0.5) * 2;
      y = (Math.random() - 0.5) * 2;
      z = (Math.random() - 0.5) * 2;
      r2 = x * x + y * y + z * z;
    } while (r2 > 1);

    // Scale to radius
    return new Vector3(x * radius, y * radius, z * radius);
  }

  /**
   * Spatial grid operations
   */

  private getCellKey(position: Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  private addToSpatialGrid(poi: PointOfInterest): void {
    const key = this.getCellKey(poi.position);
    let cell = this.spatialGrid.get(key);

    if (!cell) {
      cell = { pois: new Set() };
      this.spatialGrid.set(key, cell);
    }

    cell.pois.add(poi);
  }

  private removeFromSpatialGrid(poi: PointOfInterest): void {
    const key = this.getCellKey(poi.position);
    const cell = this.spatialGrid.get(key);

    if (cell) {
      cell.pois.delete(poi);

      // Clean up empty cells
      if (cell.pois.size === 0) {
        this.spatialGrid.delete(key);
      }
    }
  }

  private getCellsInRadius(position: Vector3, radius: number): string[] {
    const cells: string[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);

    const centerX = Math.floor(position.x / this.cellSize);
    const centerY = Math.floor(position.y / this.cellSize);
    const centerZ = Math.floor(position.z / this.cellSize);

    for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
      for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
        for (let z = centerZ - cellRadius; z <= centerZ + cellRadius; z++) {
          cells.push(`${x},${y},${z}`);
        }
      }
    }

    return cells;
  }

  /**
   * Clear all POIs
   */
  public clear(): void {
    this.pois.clear();
    this.spatialGrid.clear();
    this.discoveryEvents = [];
    this.nextPOIId = 1;
  }

  /**
   * Get total POI count
   */
  public getPOICount(): number {
    return this.pois.size;
  }
}
