/**
 * SensorIntegration - What the player can detect in the universe
 * Integrates ship sensors with universe entities for realistic detection
 */

import { Vector3, CelestialBody } from './CelestialBody';
import { StarSystem } from './StarSystem';
import { SpaceStation } from './StationGenerator';
import { UniverseOrchestrator } from './UniverseOrchestrator';

export interface SensorContact {
  id: string;
  type: 'SHIP' | 'STATION' | 'PLANET' | 'ASTEROID' | 'DEBRIS' | 'ANOMALY' | 'POI';
  name: string;
  position: Vector3;
  velocity?: Vector3;
  distance: number;
  bearing: { azimuth: number; elevation: number };

  // Detection quality
  signalStrength: number; // 0-1
  identified: boolean; // True if fully identified
  classificationConfidence: number; // 0-1

  // Details (only if identified)
  faction?: string;
  hostile?: boolean;
  mass?: number;
  size?: number;
  emissions?: {
    thermal: number;
    em: number;
    radiation: number;
  };

  // Tactical
  threat: number; // 0-10
  isTracked: boolean;
  trackingQuality: number; // 0-1

  // Time
  firstDetected: number;
  lastUpdated: number;
}

export interface SensorScanResult {
  success: boolean;
  targetId: string;
  targetName: string;

  // Physical data
  mass: number;
  size: number;
  composition?: string[];

  // Ship data (if applicable)
  shipClass?: string;
  hull?: number;
  shields?: number;
  weapons?: string[];
  cargo?: Map<string, number>;

  // Station data (if applicable)
  population?: number;
  services?: string[];
  faction?: string;

  // Additional
  anomalies?: string[];
  valuableResources?: string[];
}

export interface SensorRange {
  passive: number; // Can detect without active scan
  active: number; // Active scan range
  identification: number; // Can identify details
  detailed: number; // Can get full scan
}

export class SensorIntegration {
  private orchestrator: UniverseOrchestrator;
  private playerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private playerVelocity: Vector3 = { x: 0, y: 0, z: 0 };
  private currentSystem: StarSystem | null = null;

  private contacts: Map<string, SensorContact> = new Map();
  private trackedTargets: Set<string> = new Set();

  // Sensor capabilities (would be based on ship equipment)
  private sensorRange: SensorRange = {
    passive: 50000, // 50km passive detection
    active: 200000, // 200km active scan
    identification: 20000, // 20km for ID
    detailed: 5000 // 5km for detailed scan
  };

  constructor(orchestrator: UniverseOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Update player state
   */
  public updatePlayerState(position: Vector3, velocity: Vector3, system: StarSystem): void {
    this.playerPosition = position;
    this.playerVelocity = velocity;
    this.currentSystem = system;
  }

  /**
   * Update sensor contacts
   */
  public update(deltaTime: number): void {
    if (!this.currentSystem) return;

    const now = Date.now() / 1000;

    // Scan for stations
    if (this.currentSystem.stations) {
      for (const station of this.currentSystem.stations) {
        this.processStationContact(station, now);
      }
    }

    // Scan for celestial bodies
    if (this.currentSystem.planets) {
      for (const planet of this.currentSystem.planets) {
        this.processPlanetContact(planet, now);
      }
    }

    // Scan for POIs
    if (this.currentSystem.pointsOfInterest) {
      for (const poi of this.currentSystem.pointsOfInterest) {
        this.processPOIContact(poi, now);
      }
    }

    // Scan for NPC ships
    this.processNPCContacts(now);

    // Clean up old contacts
    this.cleanupOldContacts(now);
  }

  /**
   * Get all detected contacts
   */
  public getContacts(filter?: {
    type?: SensorContact['type'];
    maxDistance?: number;
    identified?: boolean;
    hostile?: boolean;
  }): SensorContact[] {
    let contacts = Array.from(this.contacts.values());

    if (filter) {
      if (filter.type) {
        contacts = contacts.filter(c => c.type === filter.type);
      }
      if (filter.maxDistance !== undefined) {
        contacts = contacts.filter(c => c.distance <= filter.maxDistance);
      }
      if (filter.identified !== undefined) {
        contacts = contacts.filter(c => c.identified === filter.identified);
      }
      if (filter.hostile !== undefined) {
        contacts = contacts.filter(c => c.hostile === filter.hostile);
      }
    }

    return contacts.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get nearest contact of type
   */
  public getNearestContact(type?: SensorContact['type']): SensorContact | null {
    const contacts = this.getContacts({ type });
    return contacts.length > 0 ? contacts[0] : null;
  }

  /**
   * Perform active scan on target
   */
  public activeScan(targetId: string): SensorScanResult | null {
    const contact = this.contacts.get(targetId);

    if (!contact) {
      return null;
    }

    if (contact.distance > this.sensorRange.active) {
      console.log(`[SENSORS] Target out of active scan range: ${(contact.distance / 1000).toFixed(1)}km`);
      return null;
    }

    // Detailed scan only available at close range
    const detailed = contact.distance <= this.sensorRange.detailed;

    const result: SensorScanResult = {
      success: true,
      targetId: contact.id,
      targetName: contact.name,
      mass: contact.mass || 0,
      size: contact.size || 0
    };

    // Type-specific data
    if (contact.type === 'SHIP') {
      result.shipClass = this.identifyShipClass(contact);
      if (detailed) {
        result.hull = Math.random() * 100;
        result.shields = Math.random() * 100;
        result.weapons = ['LASER', 'MISSILES'];
        result.cargo = new Map([
          ['UNKNOWN', Math.floor(Math.random() * 100)]
        ]);
      }
    } else if (contact.type === 'STATION') {
      const station = this.currentSystem?.stations?.find(s => s.id === targetId);
      if (station) {
        result.population = station.population;
        result.services = station.services;
        result.faction = station.faction;
      }
    } else if (contact.type === 'PLANET') {
      result.composition = ['ROCK', 'ICE', 'METAL'];
      if (detailed) {
        result.valuableResources = ['IRON', 'WATER_ICE', 'RARE_EARTHS'];
      }
    } else if (contact.type === 'ANOMALY' || contact.type === 'POI') {
      if (detailed) {
        result.anomalies = ['UNUSUAL_READINGS', 'ENERGY_SIGNATURE'];
        result.valuableResources = ['UNKNOWN_ARTIFACT'];
      }
    }

    // Mark as identified
    contact.identified = true;
    contact.classificationConfidence = detailed ? 1.0 : 0.7;

    return result;
  }

  /**
   * Track target (maintain continuous update)
   */
  public trackTarget(targetId: string): boolean {
    const contact = this.contacts.get(targetId);

    if (!contact) return false;

    if (contact.distance > this.sensorRange.passive) {
      console.log(`[SENSORS] Target out of tracking range`);
      return false;
    }

    this.trackedTargets.add(targetId);
    contact.isTracked = true;

    return true;
  }

  /**
   * Untrack target
   */
  public untrackTarget(targetId: string): void {
    this.trackedTargets.delete(targetId);
    const contact = this.contacts.get(targetId);
    if (contact) {
      contact.isTracked = false;
    }
  }

  /**
   * Get sensor range info
   */
  public getSensorRangeInfo(): SensorRange {
    return { ...this.sensorRange };
  }

  /**
   * Upgrade sensor capabilities
   */
  public upgradeSensors(rangeMultiplier: number): void {
    this.sensorRange.passive *= rangeMultiplier;
    this.sensorRange.active *= rangeMultiplier;
    this.sensorRange.identification *= rangeMultiplier;
    this.sensorRange.detailed *= rangeMultiplier;
  }

  /**
   * Get tactical display data
   */
  public getTacticalDisplay(): {
    contacts: SensorContact[];
    threats: SensorContact[];
    nearestStation: SensorContact | null;
    nearestShip: SensorContact | null;
  } {
    const contacts = this.getContacts();
    const threats = contacts.filter(c => c.threat > 5);
    const nearestStation = this.getNearestContact('STATION');
    const nearestShip = this.getNearestContact('SHIP');

    return {
      contacts,
      threats,
      nearestStation,
      nearestShip
    };
  }

  // Private methods
  private processStationContact(station: SpaceStation, now: number): void {
    const distance = this.calculateDistance(this.playerPosition, station.position);

    if (distance > this.sensorRange.passive) {
      this.contacts.delete(station.id);
      return;
    }

    const existing = this.contacts.get(station.id);
    const signalStrength = this.calculateSignalStrength(distance, 'STATION');
    const bearing = this.calculateBearing(this.playerPosition, station.position);

    const contact: SensorContact = {
      id: station.id,
      type: 'STATION',
      name: station.name,
      position: station.position,
      distance,
      bearing,
      signalStrength,
      identified: distance <= this.sensorRange.identification,
      classificationConfidence: distance <= this.sensorRange.identification ? 1.0 : 0.5,
      faction: station.faction,
      hostile: false,
      mass: station.mass || 1000000,
      size: 1000,
      emissions: {
        thermal: 0.8,
        em: 0.9,
        radiation: 0.3
      },
      threat: 0,
      isTracked: this.trackedTargets.has(station.id),
      trackingQuality: signalStrength,
      firstDetected: existing?.firstDetected || now,
      lastUpdated: now
    };

    this.contacts.set(station.id, contact);
  }

  private processPlanetContact(planet: CelestialBody, now: number): void {
    const distance = this.calculateDistance(this.playerPosition, planet.position);

    // Planets are visible from very far
    if (distance > this.sensorRange.passive * 10) {
      this.contacts.delete(planet.id);
      return;
    }

    const existing = this.contacts.get(planet.id);
    const signalStrength = this.calculateSignalStrength(distance, 'PLANET');
    const bearing = this.calculateBearing(this.playerPosition, planet.position);

    const contact: SensorContact = {
      id: planet.id,
      type: 'PLANET',
      name: planet.name,
      position: planet.position,
      velocity: planet.velocity,
      distance,
      bearing,
      signalStrength,
      identified: true, // Planets are easy to identify
      classificationConfidence: 1.0,
      mass: planet.mass,
      size: planet.radius * 2,
      emissions: {
        thermal: 0.5,
        em: 0.1,
        radiation: 0.2
      },
      threat: 0,
      isTracked: this.trackedTargets.has(planet.id),
      trackingQuality: signalStrength,
      firstDetected: existing?.firstDetected || now,
      lastUpdated: now
    };

    this.contacts.set(planet.id, contact);
  }

  private processPOIContact(poi: any, now: number): void {
    const distance = this.calculateDistance(this.playerPosition, poi.position);

    if (distance > this.sensorRange.active) {
      this.contacts.delete(poi.id);
      return;
    }

    const existing = this.contacts.get(poi.id);
    const signalStrength = this.calculateSignalStrength(distance, 'POI');
    const bearing = this.calculateBearing(this.playerPosition, poi.position);

    const contact: SensorContact = {
      id: poi.id,
      type: poi.type === 'ANOMALY' ? 'ANOMALY' : 'POI',
      name: poi.name || 'Unknown Signal',
      position: poi.position,
      distance,
      bearing,
      signalStrength,
      identified: distance <= this.sensorRange.identification,
      classificationConfidence: distance <= this.sensorRange.identification ? 0.8 : 0.3,
      emissions: {
        thermal: Math.random(),
        em: Math.random(),
        radiation: Math.random()
      },
      threat: poi.dangerous ? 5 : 0,
      isTracked: this.trackedTargets.has(poi.id),
      trackingQuality: signalStrength,
      firstDetected: existing?.firstDetected || now,
      lastUpdated: now
    };

    this.contacts.set(poi.id, contact);
  }

  private processNPCContacts(now: number): void {
    // Would get NPC ships from orchestrator
    const state = this.orchestrator.getState();

    // For now, just process any NPCs we know about
    // In full implementation, would query orchestrator for ships in system
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
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

  private calculateSignalStrength(distance: number, type: string): number {
    let maxRange = this.sensorRange.passive;

    if (type === 'STATION') {
      maxRange *= 2; // Stations emit stronger signals
    } else if (type === 'PLANET') {
      maxRange *= 10; // Planets are huge
    }

    return Math.max(0, Math.min(1, 1 - (distance / maxRange)));
  }

  private identifyShipClass(contact: SensorContact): string {
    if (!contact.mass) return 'UNKNOWN';

    if (contact.mass < 10000) return 'FIGHTER';
    if (contact.mass < 50000) return 'CORVETTE';
    if (contact.mass < 200000) return 'FRIGATE';
    if (contact.mass < 500000) return 'DESTROYER';
    if (contact.mass < 2000000) return 'CRUISER';
    return 'CAPITAL';
  }

  private cleanupOldContacts(now: number): void {
    const TIMEOUT = 60; // 60 seconds

    for (const [id, contact] of this.contacts.entries()) {
      if (now - contact.lastUpdated > TIMEOUT && !contact.isTracked) {
        this.contacts.delete(id);
      }
    }
  }
}
