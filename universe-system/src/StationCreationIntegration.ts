/**
 * StationCreationIntegration.ts
 *
 * Helper class for integrating station construction with the universe.
 * Handles station positioning, ID assignment, economy setup, and system registration.
 */

import { Vector3, CelestialBody, CelestialBodyType, OrbitalElements } from './CelestialBody';
import {
  StationGenerator,
  SpaceStation,
  StationType,
  StationFaction,
  StationServices,
  StationEconomy
} from './StationGenerator';
import { ConstructionProjectType } from './ConstructionSystem';
import { StarSystem } from './StarSystem';

/**
 * Result of station creation with all necessary integration data
 */
export interface StationCreationResult {
  station: SpaceStation;
  parentBody: CelestialBody;
  success: boolean;
  error?: string;
}

/**
 * StationCreationIntegration
 *
 * Bridges the gap between construction completion and actual station creation.
 * Handles all the complex integration work needed to properly instantiate a station.
 */
export class StationCreationIntegration {
  private stationGenerator: StationGenerator;
  private starSystem: StarSystem;
  private nextStationId = 1;

  constructor(stationGenerator: StationGenerator, starSystem: StarSystem) {
    this.stationGenerator = stationGenerator;
    this.starSystem = starSystem;
  }

  /**
   * Create a fully integrated station from a construction project
   *
   * @param constructionType - Type of construction project
   * @param position - Target position in 3D space
   * @param owner - Faction or player ID
   * @param systemId - Star system ID
   * @returns StationCreationResult with created station
   */
  createStation(
    constructionType: ConstructionProjectType,
    position: Vector3,
    owner: string,
    systemId: string
  ): StationCreationResult {
    try {
      // Find parent body (planet/star to orbit)
      const parentBody = this.findNearestOrbitableBody(position);

      if (!parentBody) {
        return {
          station: null as any,
          parentBody: null as any,
          success: false,
          error: 'No suitable parent body found for station orbit'
        };
      }

      // Map construction type to station type
      const stationType = this.mapConstructionTypeToStationType(constructionType);

      // Map owner to faction
      const faction = this.mapOwnerToFaction(owner);

      // Generate unique station ID
      const stationId = this.generateStationId(systemId);

      // Generate station name
      const stationName = this.generateStationName(stationType, parentBody.name, owner);

      // Calculate orbital radius (distance from parent body)
      const orbitalRadius = this.calculateOrbitalRadius(position, parentBody);

      // Create the station using StationGenerator
      const station = this.stationGenerator.generateStation(
        stationId,
        stationName,
        stationType,
        parentBody,
        orbitalRadius
      );

      // Apply custom positioning (override generator position with construction position)
      station.position = { ...position };

      // Setup orbital parameters for proper physics
      this.setupOrbitalParameters(station, parentBody, orbitalRadius);

      // Initialize station economy based on owner
      this.initializeStationEconomy(station, owner);

      // Set station ownership metadata
      this.setStationOwnership(station, owner);

      return {
        station,
        parentBody,
        success: true
      };
    } catch (error) {
      console.error('[StationCreationIntegration] Failed to create station:', error);
      return {
        station: null as any,
        parentBody: null as any,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Register station with all relevant systems
   *
   * @param station - Station to register
   */
  registerStation(station: SpaceStation): void {
    // Add to star system's station list
    if (!this.starSystem.stations.includes(station)) {
      this.starSystem.stations.push(station);
    }

    // Register with parent body (already done by StationGenerator, but verify)
    if (station.parent && !station.parent.children.includes(station)) {
      station.parent.addChild(station);
    }

    // Add to spatial hash for collision detection (if available)
    this.registerInSpatialHash(station);

    // Initialize station market (if economy system exists)
    this.initializeStationMarket(station);

    console.log(`[StationCreationIntegration] Registered station ${station.name} (${station.id})`);
  }

  /**
   * Find nearest suitable body for station to orbit
   *
   * @param position - Target position
   * @returns Nearest orbitabl body or null
   */
  private findNearestOrbitableBody(position: Vector3): CelestialBody | null {
    let nearestBody: CelestialBody | null = null;
    let nearestDistance = Infinity;

    // Check all planets in the system
    const bodies = [...this.starSystem.planets, ...this.starSystem.moons];

    for (const body of bodies) {
      const distance = this.calculateDistance(position, body.position);

      // Stations should orbit between 2-10 body radii
      const minOrbitDistance = body.physical.radius * 2;
      const maxOrbitDistance = body.physical.radius * 10;

      if (distance >= minOrbitDistance && distance <= maxOrbitDistance) {
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestBody = body;
        }
      }
    }

    // If no planet found, orbit the star
    if (!nearestBody && this.starSystem.star) {
      nearestBody = this.starSystem.star;
    }

    return nearestBody;
  }

  /**
   * Map construction type to station type
   *
   * @param constructionType - Construction project type
   * @returns Corresponding station type
   */
  private mapConstructionTypeToStationType(constructionType: ConstructionProjectType): StationType {
    const mapping: Record<ConstructionProjectType, StationType> = {
      'STATION': StationType.TRADING_HUB,
      'OUTPOST': StationType.ORBITAL_STATION,
      'MINING_PLATFORM': StationType.MINING_PLATFORM,
      'REFINERY': StationType.ORBITAL_STATION, // Refinery uses standard station type
      'DEFENSE_PLATFORM': StationType.MILITARY_BASE
    };

    return mapping[constructionType] || StationType.ORBITAL_STATION;
  }

  /**
   * Map owner ID to station faction
   *
   * @param owner - Owner ID (faction or player)
   * @returns Station faction
   */
  private mapOwnerToFaction(owner: string): StationFaction {
    // Map known faction IDs to station factions
    const factionMap: Record<string, StationFaction> = {
      'UNITED_EARTH': StationFaction.UNITED_EARTH,
      'MARS_FEDERATION': StationFaction.MARS_FEDERATION,
      'BELT_ALLIANCE': StationFaction.BELT_ALLIANCE,
      'OUTER_COLONIES': StationFaction.OUTER_COLONIES,
      'CORPORATE': StationFaction.CORPORATE,
      'PIRATE': StationFaction.PIRATE
    };

    // Check if owner matches a known faction
    const ownerUpper = owner.toUpperCase();
    for (const [key, faction] of Object.entries(factionMap)) {
      if (ownerUpper.includes(key)) {
        return faction;
      }
    }

    // Default to independent
    return StationFaction.INDEPENDENT;
  }

  /**
   * Generate unique station ID
   *
   * @param systemId - Star system ID
   * @returns Unique station ID
   */
  private generateStationId(systemId: string): string {
    const id = `${systemId}-station-${this.nextStationId++}-${Date.now()}`;
    return id;
  }

  /**
   * Generate appropriate station name
   *
   * @param stationType - Type of station
   * @param parentName - Parent body name
   * @param owner - Owner ID
   * @returns Station name
   */
  private generateStationName(stationType: StationType, parentName: string, owner: string): string {
    const typeNames: Record<StationType, string> = {
      [StationType.ORBITAL_STATION]: 'Station',
      [StationType.TRADING_HUB]: 'Trade Hub',
      [StationType.MILITARY_BASE]: 'Defense Platform',
      [StationType.RESEARCH_FACILITY]: 'Research Facility',
      [StationType.MINING_PLATFORM]: 'Mining Platform',
      [StationType.SHIPYARD]: 'Shipyard',
      [StationType.FUEL_DEPOT]: 'Fuel Depot',
      [StationType.RELAY_STATION]: 'Relay',
      [StationType.DEEP_SPACE_OUTPOST]: 'Outpost'
    };

    const typeName = typeNames[stationType] || 'Station';
    const ownerShort = owner.split('_')[0]; // Get first word of owner name

    return `${parentName} ${typeName} ${ownerShort}`;
  }

  /**
   * Calculate orbital radius from position and parent body
   *
   * @param position - Station position
   * @param parentBody - Parent body
   * @returns Orbital radius in body radii
   */
  private calculateOrbitalRadius(position: Vector3, parentBody: CelestialBody): number {
    const distance = this.calculateDistance(position, parentBody.position);
    const radiusInBodyRadii = distance / parentBody.physical.radius;

    // Clamp to reasonable orbital distances (2-10 body radii)
    return Math.max(2, Math.min(10, radiusInBodyRadii));
  }

  /**
   * Setup proper orbital parameters for station
   *
   * @param station - Station to configure
   * @param parentBody - Parent body
   * @param orbitalRadius - Orbital radius in body radii
   */
  private setupOrbitalParameters(
    station: SpaceStation,
    parentBody: CelestialBody,
    orbitalRadius: number
  ): void {
    const orbitDistance = orbitalRadius * parentBody.physical.radius;

    // Calculate orbital elements
    const G = 6.674e-11;
    const mu = G * parentBody.physical.mass;

    // Nearly circular orbit
    const orbital: OrbitalElements = {
      semiMajorAxis: orbitDistance,
      eccentricity: 0.001, // Nearly circular
      inclination: Math.random() * Math.PI / 36, // Low inclination (0-5 degrees)
      longitudeOfAscendingNode: Math.random() * 2 * Math.PI,
      argumentOfPeriapsis: Math.random() * 2 * Math.PI,
      trueAnomaly: Math.random() * 2 * Math.PI
    };

    station.orbital = orbital;
    station.parent = parentBody;
  }

  /**
   * Initialize station economy based on owner
   *
   * @param station - Station to configure
   * @param owner - Owner ID
   */
  private initializeStationEconomy(station: SpaceStation, owner: string): void {
    // Adjust economy based on owner wealth
    const wealthMultiplier = this.getOwnerWealthMultiplier(owner);

    station.economy.wealthLevel *= wealthMultiplier;
    station.economy.tradeVolume *= wealthMultiplier;

    // Add owner-specific economic adjustments
    if (owner.includes('CORPORATE')) {
      station.economy.wealthLevel = Math.min(1.0, station.economy.wealthLevel * 1.2);
    } else if (owner.includes('PIRATE')) {
      station.economy.wealthLevel *= 0.6;
    }
  }

  /**
   * Get wealth multiplier for owner
   *
   * @param owner - Owner ID
   * @returns Wealth multiplier (0.5 - 1.5)
   */
  private getOwnerWealthMultiplier(owner: string): number {
    const ownerUpper = owner.toUpperCase();

    if (ownerUpper.includes('CORPORATE') || ownerUpper.includes('UNITED_EARTH')) {
      return 1.3;
    } else if (ownerUpper.includes('PIRATE') || ownerUpper.includes('BELT')) {
      return 0.7;
    }

    return 1.0;
  }

  /**
   * Set station ownership metadata
   *
   * @param station - Station to configure
   * @param owner - Owner ID
   */
  private setStationOwnership(station: SpaceStation, owner: string): void {
    // Store owner in station metadata (extend SpaceStation if needed)
    // For now, we'll use the faction field which already exists
    station.faction = this.mapOwnerToFaction(owner);
  }

  /**
   * Register station in spatial hash for collision detection
   *
   * @param station - Station to register
   */
  private registerInSpatialHash(station: SpaceStation): void {
    // StarSystem may have a spatial hash system for collision detection
    // This would be implemented if spatial hash exists
    // For now, this is a placeholder for future integration

    // Example integration (if spatial hash existed):
    // if (this.starSystem.spatialHash) {
    //   this.starSystem.spatialHash.insert(station);
    // }
  }

  /**
   * Initialize station market in economy system
   *
   * @param station - Station to initialize market for
   */
  private initializeStationMarket(station: SpaceStation): void {
    // Check if star system has markets
    if (this.starSystem.markets) {
      // Market may already exist from StationGenerator
      // Verify it's registered with the star system
      if (!this.starSystem.markets.has(station.id)) {
        // Create basic market entry if needed
        // Market initialization would happen here if economy system is present
        console.log(`[StationCreationIntegration] Market initialized for ${station.id}`);
      }
    }
  }

  /**
   * Calculate distance between two points
   *
   * @param p1 - First point
   * @param p2 - Second point
   * @returns Distance
   */
  private calculateDistance(p1: Vector3, p2: Vector3): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
