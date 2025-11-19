/**
 * UniverseNavigationIntegration - Connect navigation to universe entities
 * Allows player to set waypoints to stations, planets, POIs, mission objectives
 */

import { Vector3 } from './CelestialBody';
import { StarSystem } from './StarSystem';
import { SpaceStation } from './StationGenerator';
import { SensorIntegration, SensorContact } from './SensorIntegration';
import { MissionSystem, Mission } from './MissionSystem';

export interface NavigationWaypoint {
  id: string;
  name: string;
  type: 'STATION' | 'PLANET' | 'POI' | 'CUSTOM' | 'MISSION';
  position: Vector3;

  // Calculated data
  distance: number;
  bearing: { azimuth: number; elevation: number };
  eta: number | null; // seconds, null if not moving toward it

  // Optional metadata
  entityId?: string;
  missionId?: string;
  description?: string;
}

export interface Route {
  id: string;
  name: string;
  waypoints: NavigationWaypoint[];
  currentWaypointIndex: number;
  totalDistance: number;
  remainingDistance: number;
  estimatedTotalTime: number | null;
  estimatedRemainingTime: number | null;
}

export interface NavigationTarget {
  waypoint: NavigationWaypoint;
  approachVector: Vector3; // Unit vector toward target
  closingSpeed: number; // m/s
  timeToIntercept: number | null; // seconds
  interceptBurn: { deltaV: Vector3; duration: number } | null;
}

export class UniverseNavigationIntegration {
  private sensors: SensorIntegration;
  private missions: MissionSystem;
  private currentSystem: StarSystem | null = null;

  private playerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private playerVelocity: Vector3 = { x: 0, y: 0, z: 0 };

  private customWaypoints: Map<string, NavigationWaypoint> = new Map();
  private activeRoute: Route | null = null;
  private activeTarget: NavigationTarget | null = null;

  private waypointIdCounter = 0;

  constructor(sensors: SensorIntegration, missions: MissionSystem) {
    this.sensors = sensors;
    this.missions = missions;
  }

  /**
   * Update player state
   */
  public updatePlayerState(position: Vector3, velocity: Vector3, system: StarSystem): void {
    this.playerPosition = position;
    this.playerVelocity = velocity;
    this.currentSystem = system;

    // Update active target calculations
    if (this.activeTarget) {
      this.updateTargetCalculations();
    }

    // Update route progress
    if (this.activeRoute) {
      this.updateRouteProgress();
    }
  }

  /**
   * Set navigation target to station
   */
  public setTargetStation(station: SpaceStation): NavigationTarget {
    const waypoint = this.createWaypointFromStation(station);
    return this.setTarget(waypoint);
  }

  /**
   * Set navigation target to sensor contact
   */
  public setTargetContact(contact: SensorContact): NavigationTarget {
    const waypoint: NavigationWaypoint = {
      id: `waypoint_contact_${contact.id}`,
      name: contact.name,
      type: this.mapContactTypeToWaypointType(contact.type),
      position: contact.position,
      distance: contact.distance,
      bearing: contact.bearing,
      eta: null,
      entityId: contact.id
    };

    return this.setTarget(waypoint);
  }

  /**
   * Set navigation target to mission objective
   */
  public setTargetMissionObjective(mission: Mission): NavigationTarget | null {
    const currentObj = mission.objectives[mission.currentObjective];

    if (!currentObj || !currentObj.position) {
      console.log('[NAV] Mission objective has no position');
      return null;
    }

    const waypoint: NavigationWaypoint = {
      id: `waypoint_mission_${mission.id}_${currentObj.id}`,
      name: `Mission: ${currentObj.description}`,
      type: 'MISSION',
      position: currentObj.position,
      distance: this.calculateDistance(this.playerPosition, currentObj.position),
      bearing: this.calculateBearing(this.playerPosition, currentObj.position),
      eta: null,
      missionId: mission.id,
      description: currentObj.description
    };

    return this.setTarget(waypoint);
  }

  /**
   * Set custom navigation target
   */
  public setTargetPosition(position: Vector3, name: string = 'Custom Waypoint'): NavigationTarget {
    const waypoint: NavigationWaypoint = {
      id: `waypoint_custom_${this.waypointIdCounter++}`,
      name,
      type: 'CUSTOM',
      position,
      distance: this.calculateDistance(this.playerPosition, position),
      bearing: this.calculateBearing(this.playerPosition, position),
      eta: null,
      description: `Custom waypoint at ${position.x.toFixed(0)}, ${position.y.toFixed(0)}, ${position.z.toFixed(0)}`
    };

    this.customWaypoints.set(waypoint.id, waypoint);
    return this.setTarget(waypoint);
  }

  /**
   * Clear navigation target
   */
  public clearTarget(): void {
    this.activeTarget = null;
    console.log('[NAV] Target cleared');
  }

  /**
   * Get current navigation target
   */
  public getActiveTarget(): NavigationTarget | null {
    return this.activeTarget;
  }

  /**
   * Create route through multiple waypoints
   */
  public createRoute(name: string, waypoints: NavigationWaypoint[]): Route {
    const totalDistance = this.calculateRouteDistance(waypoints);

    const route: Route = {
      id: `route_${Date.now()}`,
      name,
      waypoints,
      currentWaypointIndex: 0,
      totalDistance,
      remainingDistance: totalDistance,
      estimatedTotalTime: null,
      estimatedRemainingTime: null
    };

    this.activeRoute = route;

    // Set first waypoint as target
    if (waypoints.length > 0) {
      this.setTarget(waypoints[0]);
    }

    return route;
  }

  /**
   * Create auto-route to station via nearest approach
   */
  public createAutoRouteToStation(station: SpaceStation): Route {
    const waypoints: NavigationWaypoint[] = [];

    // Add intermediate waypoint if needed (e.g., avoid obstacles)
    const directDistance = this.calculateDistance(this.playerPosition, station.position);

    // For now, just direct route
    waypoints.push(this.createWaypointFromStation(station));

    return this.createRoute(`Route to ${station.name}`, waypoints);
  }

  /**
   * Get available navigation targets in system
   */
  public getAvailableTargets(): {
    stations: NavigationWaypoint[];
    planets: NavigationWaypoint[];
    pois: NavigationWaypoint[];
    missions: NavigationWaypoint[];
    custom: NavigationWaypoint[];
  } {
    const targets = {
      stations: [] as NavigationWaypoint[],
      planets: [] as NavigationWaypoint[],
      pois: [] as NavigationWaypoint[],
      missions: [] as NavigationWaypoint[],
      custom: Array.from(this.customWaypoints.values())
    };

    if (!this.currentSystem) return targets;

    // Stations
    if (this.currentSystem.stations) {
      targets.stations = this.currentSystem.stations.map(s => this.createWaypointFromStation(s));
    }

    // Planets
    if (this.currentSystem.planets) {
      targets.planets = this.currentSystem.planets.map(p => ({
        id: `waypoint_planet_${p.id}`,
        name: p.name,
        type: 'PLANET' as const,
        position: p.position,
        distance: this.calculateDistance(this.playerPosition, p.position),
        bearing: this.calculateBearing(this.playerPosition, p.position),
        eta: null,
        entityId: p.id
      }));
    }

    // POIs
    if (this.currentSystem.pointsOfInterest) {
      targets.pois = this.currentSystem.pointsOfInterest.map(poi => ({
        id: `waypoint_poi_${poi.id}`,
        name: poi.name || 'Unknown POI',
        type: 'POI' as const,
        position: poi.position,
        distance: this.calculateDistance(this.playerPosition, poi.position),
        bearing: this.calculateBearing(this.playerPosition, poi.position),
        eta: null,
        entityId: poi.id
      }));
    }

    // Mission objectives
    const activeMissions = this.missions.getActiveMissions();
    for (const mission of activeMissions) {
      const currentObj = mission.objectives[mission.currentObjective];
      if (currentObj && currentObj.position) {
        targets.missions.push({
          id: `waypoint_mission_${mission.id}`,
          name: currentObj.description,
          type: 'MISSION',
          position: currentObj.position,
          distance: this.calculateDistance(this.playerPosition, currentObj.position),
          bearing: this.calculateBearing(this.playerPosition, currentObj.position),
          eta: null,
          missionId: mission.id
        });
      }
    }

    return targets;
  }

  /**
   * Get navigation status string
   */
  public getNavigationStatus(): string {
    const lines: string[] = [];

    lines.push('=== NAVIGATION ===');

    if (this.activeTarget) {
      const target = this.activeTarget.waypoint;
      lines.push(`Target: ${target.name}`);
      lines.push(`Distance: ${(target.distance / 1000).toFixed(1)} km`);
      lines.push(`Bearing: Az ${target.bearing.azimuth.toFixed(1)}° El ${target.bearing.elevation.toFixed(1)}°`);
      lines.push(`Closing: ${(this.activeTarget.closingSpeed / 1000).toFixed(2)} km/s`);

      if (this.activeTarget.timeToIntercept !== null) {
        lines.push(`ETA: ${this.formatTime(this.activeTarget.timeToIntercept)}`);
      }
    } else {
      lines.push('No target set');
    }

    if (this.activeRoute) {
      lines.push('');
      lines.push(`Route: ${this.activeRoute.name}`);
      lines.push(`Progress: ${this.activeRoute.currentWaypointIndex + 1}/${this.activeRoute.waypoints.length}`);
      lines.push(`Remaining: ${(this.activeRoute.remainingDistance / 1000).toFixed(1)} km`);
    }

    return lines.join('\n');
  }

  // Private methods
  private setTarget(waypoint: NavigationWaypoint): NavigationTarget {
    const approachVector = this.calculateApproachVector(waypoint.position);
    const closingSpeed = this.calculateClosingSpeed(waypoint.position);
    const timeToIntercept = closingSpeed > 0 ? waypoint.distance / closingSpeed : null;

    this.activeTarget = {
      waypoint,
      approachVector,
      closingSpeed,
      timeToIntercept,
      interceptBurn: null // Would calculate intercept burn
    };

    console.log(`[NAV] Target set: ${waypoint.name} (${(waypoint.distance / 1000).toFixed(1)} km)`);

    return this.activeTarget;
  }

  private updateTargetCalculations(): void {
    if (!this.activeTarget) return;

    const target = this.activeTarget;
    target.waypoint.distance = this.calculateDistance(this.playerPosition, target.waypoint.position);
    target.waypoint.bearing = this.calculateBearing(this.playerPosition, target.waypoint.position);
    target.approachVector = this.calculateApproachVector(target.waypoint.position);
    target.closingSpeed = this.calculateClosingSpeed(target.waypoint.position);
    target.timeToIntercept = target.closingSpeed > 0 ? target.waypoint.distance / target.closingSpeed : null;
    target.waypoint.eta = target.timeToIntercept;
  }

  private updateRouteProgress(): void {
    if (!this.activeRoute) return;

    const currentWaypoint = this.activeRoute.waypoints[this.activeRoute.currentWaypointIndex];
    const distance = this.calculateDistance(this.playerPosition, currentWaypoint.position);

    // Check if reached waypoint (within 1km)
    if (distance < 1000) {
      console.log(`[NAV] Reached waypoint: ${currentWaypoint.name}`);

      // Move to next waypoint
      this.activeRoute.currentWaypointIndex++;

      if (this.activeRoute.currentWaypointIndex < this.activeRoute.waypoints.length) {
        const nextWaypoint = this.activeRoute.waypoints[this.activeRoute.currentWaypointIndex];
        this.setTarget(nextWaypoint);
        console.log(`[NAV] Next waypoint: ${nextWaypoint.name}`);
      } else {
        console.log(`[NAV] Route complete!`);
        this.activeRoute = null;
        this.activeTarget = null;
      }
    }

    // Update remaining distance
    if (this.activeRoute) {
      this.activeRoute.remainingDistance = this.calculateRemainingRouteDistance();
    }
  }

  private createWaypointFromStation(station: SpaceStation): NavigationWaypoint {
    return {
      id: `waypoint_station_${station.id}`,
      name: station.name,
      type: 'STATION',
      position: station.position,
      distance: this.calculateDistance(this.playerPosition, station.position),
      bearing: this.calculateBearing(this.playerPosition, station.position),
      eta: null,
      entityId: station.id,
      description: `${station.stationType} Station - ${station.faction}`
    };
  }

  private calculateDistance(from: Vector3, to: Vector3): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateBearing(from: Vector3, to: Vector3): { azimuth: number; elevation: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;

    const azimuth = Math.atan2(dy, dx) * (180 / Math.PI);
    const elevation = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy)) * (180 / Math.PI);

    return { azimuth, elevation };
  }

  private calculateApproachVector(targetPos: Vector3): Vector3 {
    const dx = targetPos.x - this.playerPosition.x;
    const dy = targetPos.y - this.playerPosition.y;
    const dz = targetPos.z - this.playerPosition.z;
    const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return {
      x: dx / mag,
      y: dy / mag,
      z: dz / mag
    };
  }

  private calculateClosingSpeed(targetPos: Vector3): number {
    const approachVec = this.calculateApproachVector(targetPos);

    // Dot product of velocity with approach vector
    const closingSpeed = -(
      this.playerVelocity.x * approachVec.x +
      this.playerVelocity.y * approachVec.y +
      this.playerVelocity.z * approachVec.z
    );

    return closingSpeed;
  }

  private calculateRouteDistance(waypoints: NavigationWaypoint[]): number {
    if (waypoints.length === 0) return 0;

    let total = this.calculateDistance(this.playerPosition, waypoints[0].position);

    for (let i = 0; i < waypoints.length - 1; i++) {
      total += this.calculateDistance(waypoints[i].position, waypoints[i + 1].position);
    }

    return total;
  }

  private calculateRemainingRouteDistance(): number {
    if (!this.activeRoute) return 0;

    const waypoints = this.activeRoute.waypoints;
    const currentIdx = this.activeRoute.currentWaypointIndex;

    if (currentIdx >= waypoints.length) return 0;

    let remaining = this.calculateDistance(this.playerPosition, waypoints[currentIdx].position);

    for (let i = currentIdx; i < waypoints.length - 1; i++) {
      remaining += this.calculateDistance(waypoints[i].position, waypoints[i + 1].position);
    }

    return remaining;
  }

  private mapContactTypeToWaypointType(contactType: SensorContact['type']): NavigationWaypoint['type'] {
    switch (contactType) {
      case 'STATION': return 'STATION';
      case 'PLANET': return 'PLANET';
      case 'POI':
      case 'ANOMALY':
      case 'ASTEROID':
      case 'DEBRIS':
        return 'POI';
      default:
        return 'CUSTOM';
    }
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}
