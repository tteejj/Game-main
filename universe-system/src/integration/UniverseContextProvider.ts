/**
 * UniverseContextProvider - Environmental awareness for NPCs
 *
 * Provides NPCs with context about their surroundings:
 * - Nearby celestial bodies (planets, stars, stations)
 * - Active hazards and environmental dangers
 * - Points of interest and opportunities
 * - Faction territories and safe zones
 * - Navigation corridors and traffic lanes
 *
 * This is the "sensory system" that lets NPCs perceive the universe.
 */

import { Vector3 } from '../CelestialBody';
import { StarSystem } from '../StarSystem';
import { Hazard, HazardSeverity, HazardType } from '../HazardSystem';
import { SpaceStation } from '../StationGenerator';
import { PointOfInterest, POIType } from '../poi';

export interface UniverseContext {
  // Location info
  currentSystem: string;
  position: Vector3;

  // Nearby celestial bodies
  nearestStar: { distance: number; luminosity: number; radiation: number };
  nearestPlanet?: { name: string; distance: number; habitable: boolean };
  nearestStation?: { id: string; name: string; distance: number; faction?: string };
  nearestMoon?: { name: string; distance: number };

  // Hazards
  activeHazards: HazardInfo[];
  nearestHazard?: HazardInfo;
  inHazardZone: boolean;
  hazardThreatLevel: number; // 0-1

  // Opportunities
  nearbyPOIs: POIInfo[];
  nearestPOI?: POIInfo;

  // Navigation
  safeNavigationPath: boolean;
  recommendedSpeed: number; // m/s
  trafficDensity: number; // 0-1

  // Environmental conditions
  radiationLevel: number; // 0-1
  gravityStrength: number; // m/s²
  magneticInterference: number; // 0-1
  visibility: number; // 0-1

  // Strategic
  territoryController?: string; // faction controlling this area
  hostileFactions: string[];
  friendlyStations: string[];
  threatLevel: number; // 0-1 based on nearby threats
}

export interface HazardInfo {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  distance: number;
  position: Vector3;
  radius: number;
  isLethal: boolean;
  canAvoid: boolean;
  avoidanceVector?: Vector3; // Direction to move to avoid
}

export interface POIInfo {
  id: string;
  type: POIType;
  name: string;
  distance: number;
  position: Vector3;
  value: number; // Estimated value/importance
  risk: number; // 0-1
}

export interface ContextQuery {
  position: Vector3;
  scanRadius?: number; // How far to scan (default 100km)
  includeHazards?: boolean;
  includePOIs?: boolean;
  includeStations?: boolean;
  factionId?: string; // For faction-specific context
}

/**
 * Provides universe context to NPCs and AI systems
 */
export class UniverseContextProvider {
  private starSystem: StarSystem;
  private factionTerritories: Map<string, TerritoryInfo> = new Map();

  constructor(starSystem: StarSystem) {
    this.starSystem = starSystem;
  }

  /**
   * Get full universe context for a position
   */
  public getContext(query: ContextQuery): UniverseContext {
    const {
      position,
      scanRadius = 100000, // 100km default
      includeHazards = true,
      includePOIs = true,
      includeStations = true,
      factionId
    } = query;

    // Calculate nearest bodies
    const nearestStar = this.getNearestStar(position);
    const nearestPlanet = this.getNearestPlanet(position, scanRadius);
    const nearestStation = includeStations ? this.getNearestStation(position, scanRadius, factionId) : undefined;
    const nearestMoon = this.getNearestMoon(position, scanRadius);

    // Get hazards
    const activeHazards = includeHazards ? this.getHazardsInRange(position, scanRadius) : [];
    const nearestHazard = activeHazards.length > 0 ? activeHazards[0] : undefined;
    const inHazardZone = activeHazards.some(h => h.distance < h.radius);
    const hazardThreatLevel = this.calculateHazardThreat(position, activeHazards);

    // Get POIs
    const nearbyPOIs = includePOIs ? this.getPOIsInRange(position, scanRadius) : [];
    const nearestPOI = nearbyPOIs.length > 0 ? nearbyPOIs[0] : undefined;

    // Calculate environmental conditions
    const radiationLevel = this.calculateRadiation(position, nearestStar, activeHazards);
    const gravityStrength = this.calculateGravity(position, nearestPlanet);
    const magneticInterference = this.calculateMagneticInterference(position, activeHazards);
    const visibility = this.calculateVisibility(position, activeHazards);

    // Traffic and navigation
    const trafficDensity = this.calculateTrafficDensity(position);
    const safeNavigationPath = !inHazardZone && trafficDensity < 0.8;
    const recommendedSpeed = this.calculateRecommendedSpeed(trafficDensity, hazardThreatLevel, visibility);

    // Strategic info
    const territoryController = this.getTerritoryController(position);
    const hostileFactions = this.getHostileFactions(factionId, position);
    const friendlyStations = this.getFriendlyStations(factionId, scanRadius, position);
    const threatLevel = this.calculateThreatLevel(position, hostileFactions, activeHazards);

    return {
      currentSystem: this.starSystem.id,
      position,
      nearestStar,
      nearestPlanet,
      nearestStation,
      nearestMoon,
      activeHazards,
      nearestHazard,
      inHazardZone,
      hazardThreatLevel,
      nearbyPOIs,
      nearestPOI,
      safeNavigationPath,
      recommendedSpeed,
      trafficDensity,
      radiationLevel,
      gravityStrength,
      magneticInterference,
      visibility,
      territoryController,
      hostileFactions,
      friendlyStations,
      threatLevel
    };
  }

  /**
   * Quick threat assessment - is this position safe?
   */
  public isSafePosition(position: Vector3, factionId?: string): boolean {
    const context = this.getContext({ position, scanRadius: 50000, factionId });

    return context.hazardThreatLevel < 0.3 &&
           context.threatLevel < 0.4 &&
           !context.inHazardZone;
  }

  /**
   * Find nearest safe position
   */
  public findNearestSafePosition(position: Vector3, factionId?: string): Vector3 | null {
    // Sample points in a sphere around current position
    const searchRadius = 10000; // 10km
    const samples = 32;

    for (let r = searchRadius; r <= 100000; r += searchRadius) {
      for (let i = 0; i < samples; i++) {
        const theta = (i / samples) * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const testPos: Vector3 = {
          x: position.x + r * Math.sin(phi) * Math.cos(theta),
          y: position.y + r * Math.sin(phi) * Math.sin(theta),
          z: position.z + r * Math.cos(phi)
        };

        if (this.isSafePosition(testPos, factionId)) {
          return testPos;
        }
      }
    }

    return null;
  }

  /**
   * Get recommended escape vector from current position
   */
  public getEscapeVector(position: Vector3): Vector3 {
    const context = this.getContext({ position, scanRadius: 50000 });

    // If in hazard, move away from nearest hazard
    if (context.nearestHazard && context.inHazardZone) {
      const dx = position.x - context.nearestHazard.position.x;
      const dy = position.y - context.nearestHazard.position.y;
      const dz = position.z - context.nearestHazard.position.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      return {
        x: dx / dist,
        y: dy / dist,
        z: dz / dist
      };
    }

    // If near hostile territory, move toward nearest friendly station
    if (context.nearestStation) {
      const dx = context.nearestStation.distance > 0 ?
        (position.x - context.nearestStation.distance) : 0;
      const dy = 0;
      const dz = 0;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;

      return { x: dx / dist, y: dy / dist, z: dz / dist };
    }

    // Default: move away from star (outward)
    const dx = position.x - this.starSystem.star.position.x;
    const dy = position.y - this.starSystem.star.position.y;
    const dz = position.z - this.starSystem.star.position.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;

    return { x: dx / dist, y: dy / dist, z: dz / dist };
  }

  /**
   * Register faction territory
   */
  public registerTerritory(factionId: string, center: Vector3, radius: number, controlLevel: number = 1.0): void {
    this.factionTerritories.set(factionId, {
      center,
      radius,
      controlLevel
    });
  }

  // ====================================================================
  // PRIVATE CALCULATION METHODS
  // ====================================================================

  private getNearestStar(position: Vector3) {
    const star = this.starSystem.star;
    const dx = position.x - star.position.x;
    const dy = position.y - star.position.y;
    const dz = position.z - star.position.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

    return {
      distance,
      luminosity: star.luminosity,
      radiation: this.calculateStarRadiation(distance, star.luminosity)
    };
  }

  private getNearestPlanet(position: Vector3, maxDistance: number) {
    let nearest: any = null;
    let minDist = Infinity;

    for (const planet of this.starSystem.planets) {
      const dx = position.x - planet.position.x;
      const dy = position.y - planet.position.y;
      const dz = position.z - planet.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < minDist && distance < maxDistance) {
        minDist = distance;
        nearest = {
          name: planet.name,
          distance,
          habitable: planet.habitability > 0.5
        };
      }
    }

    return nearest;
  }

  private getNearestStation(position: Vector3, maxDistance: number, factionId?: string) {
    let nearest: any = null;
    let minDist = Infinity;

    for (const station of this.starSystem.stations) {
      const dx = position.x - station.position.x;
      const dy = position.y - station.position.y;
      const dz = position.z - station.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < minDist && distance < maxDistance) {
        minDist = distance;
        nearest = {
          id: station.id,
          name: station.name,
          distance,
          faction: station.faction
        };
      }
    }

    return nearest;
  }

  private getNearestMoon(position: Vector3, maxDistance: number) {
    let nearest: any = null;
    let minDist = Infinity;

    for (const moon of this.starSystem.moons) {
      const dx = position.x - moon.position.x;
      const dy = position.y - moon.position.y;
      const dz = position.z - moon.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < minDist && distance < maxDistance) {
        minDist = distance;
        nearest = { name: moon.name, distance };
      }
    }

    return nearest;
  }

  private getHazardsInRange(position: Vector3, radius: number): HazardInfo[] {
    const hazards: HazardInfo[] = [];

    for (const hazard of this.starSystem.hazardSystem.getActiveHazards()) {
      const dx = position.x - hazard.position.x;
      const dy = position.y - hazard.position.y;
      const dz = position.z - hazard.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < radius + hazard.radius) {
        const avoidanceVector = distance > 0 ? {
          x: dx / distance,
          y: dy / distance,
          z: dz / distance
        } : { x: 1, y: 0, z: 0 };

        hazards.push({
          id: hazard.id,
          type: hazard.type,
          severity: hazard.severity,
          distance,
          position: hazard.position,
          radius: hazard.radius,
          isLethal: hazard.severity >= HazardSeverity.EXTREME,
          canAvoid: distance > hazard.radius,
          avoidanceVector
        });
      }
    }

    // Sort by distance
    hazards.sort((a, b) => a.distance - b.distance);

    return hazards;
  }

  private getPOIsInRange(position: Vector3, radius: number): POIInfo[] {
    const pois: POIInfo[] = [];

    for (const poi of this.starSystem.poiManager.getAllPOIs()) {
      const dx = position.x - poi.position.x;
      const dy = position.y - poi.position.y;
      const dz = position.z - poi.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < radius) {
        pois.push({
          id: poi.id,
          type: poi.type,
          name: poi.name,
          distance,
          position: poi.position,
          value: this.estimatePOIValue(poi),
          risk: this.estimatePOIRisk(poi)
        });
      }
    }

    // Sort by distance
    pois.sort((a, b) => a.distance - b.distance);

    return pois;
  }

  private calculateHazardThreat(position: Vector3, hazards: HazardInfo[]): number {
    if (hazards.length === 0) return 0;

    let maxThreat = 0;

    for (const hazard of hazards) {
      // Threat increases with severity and proximity
      const proximityFactor = Math.max(0, 1 - (hazard.distance / (hazard.radius * 2)));
      const severityFactor = hazard.severity / 5; // Normalize to 0-1
      const threat = proximityFactor * severityFactor;

      maxThreat = Math.max(maxThreat, threat);
    }

    return Math.min(1, maxThreat);
  }

  private calculateRadiation(position: Vector3, starInfo: any, hazards: HazardInfo[]): number {
    // Base radiation from star
    const starRadiation = starInfo.radiation;

    // Additional radiation from hazards
    let hazardRadiation = 0;
    for (const hazard of hazards) {
      if (hazard.type === HazardType.SOLAR_STORM ||
          hazard.type === HazardType.RADIATION_BELT) {
        const intensity = Math.max(0, 1 - (hazard.distance / hazard.radius));
        hazardRadiation += intensity * 0.5;
      }
    }

    return Math.min(1, starRadiation + hazardRadiation);
  }

  private calculateGravity(position: Vector3, nearestPlanet: any): number {
    if (!nearestPlanet || nearestPlanet.distance > 1000000) {
      return 0; // Negligible
    }

    // Simplified gravity calculation
    const G = 6.674e-11;
    const planetMass = 5.972e24; // Approximate Earth mass
    const distanceMeters = nearestPlanet.distance;

    return (G * planetMass) / (distanceMeters * distanceMeters);
  }

  private calculateMagneticInterference(position: Vector3, hazards: HazardInfo[]): number {
    let interference = 0;

    for (const hazard of hazards) {
      if (hazard.type === HazardType.MAGNETIC_ANOMALY ||
          hazard.type === HazardType.ION_STORM) {
        const intensity = Math.max(0, 1 - (hazard.distance / hazard.radius));
        interference += intensity;
      }
    }

    return Math.min(1, interference);
  }

  private calculateVisibility(position: Vector3, hazards: HazardInfo[]): number {
    let visibility = 1.0;

    for (const hazard of hazards) {
      if (hazard.type === HazardType.DEBRIS_FIELD ||
          hazard.type === HazardType.PLASMA_CLOUD ||
          hazard.type === HazardType.ION_STORM) {
        const intensity = Math.max(0, 1 - (hazard.distance / hazard.radius));
        visibility -= intensity * 0.3;
      }
    }

    return Math.max(0, visibility);
  }

  private calculateTrafficDensity(position: Vector3): number {
    if (!this.starSystem.trafficManager) {
      return 0.1; // Default low traffic
    }

    const nearbyShips = this.starSystem.trafficManager.getVesselsNear(position, 10000);

    // Normalize based on expected traffic (0-20 ships = 0-1 density)
    return Math.min(1, nearbyShips.length / 20);
  }

  private calculateRecommendedSpeed(traffic: number, hazard: number, visibility: number): number {
    const baseSpeed = 1000; // 1 km/s

    // Reduce speed in dangerous conditions
    const trafficPenalty = 1 - (traffic * 0.5);
    const hazardPenalty = 1 - (hazard * 0.7);
    const visibilityPenalty = Math.max(0.2, visibility);

    return baseSpeed * trafficPenalty * hazardPenalty * visibilityPenalty;
  }

  private getTerritoryController(position: Vector3): string | undefined {
    for (const [factionId, territory] of this.factionTerritories) {
      const dx = position.x - territory.center.x;
      const dy = position.y - territory.center.y;
      const dz = position.z - territory.center.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < territory.radius) {
        return factionId;
      }
    }

    return undefined;
  }

  private getHostileFactions(factionId: string | undefined, position: Vector3): string[] {
    // TODO: Integrate with faction diplomacy system
    return [];
  }

  private getFriendlyStations(factionId: string | undefined, radius: number, position: Vector3): string[] {
    const friendly: string[] = [];

    for (const station of this.starSystem.stations) {
      const dx = position.x - station.position.x;
      const dy = position.y - station.position.y;
      const dz = position.z - station.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < radius) {
        // TODO: Check faction relationships
        if (!factionId || station.faction === factionId) {
          friendly.push(station.id);
        }
      }
    }

    return friendly;
  }

  private calculateThreatLevel(position: Vector3, hostileFactions: string[], hazards: HazardInfo[]): number {
    const hazardThreat = hazards.length > 0 ?
      Math.min(1, hazards.reduce((sum, h) => sum + h.severity / 10, 0)) : 0;

    const factionThreat = hostileFactions.length * 0.2;

    return Math.min(1, hazardThreat + factionThreat);
  }

  private calculateStarRadiation(distance: number, luminosity: number): number {
    // Radiation decreases with square of distance
    const au = 149597870700; // 1 AU in meters
    const normalizedDistance = distance / au;

    return Math.min(1, luminosity / (normalizedDistance * normalizedDistance + 0.1));
  }

  private estimatePOIValue(poi: PointOfInterest): number {
    // Simplified value estimation
    switch (poi.type) {
      case POIType.RESOURCE_ASTEROID: return 0.8;
      case POIType.DERELICT_SHIP: return 0.6;
      case POIType.ANCIENT_ARTIFACT: return 1.0;
      case POIType.DISTRESS_BEACON: return 0.3;
      default: return 0.5;
    }
  }

  private estimatePOIRisk(poi: PointOfInterest): number {
    // Simplified risk estimation
    switch (poi.type) {
      case POIType.PIRATE_BASE: return 0.9;
      case POIType.ANOMALY: return 0.7;
      case POIType.DERELICT_SHIP: return 0.4;
      default: return 0.2;
    }
  }
}

interface TerritoryInfo {
  center: Vector3;
  radius: number;
  controlLevel: number; // 0-1
}
