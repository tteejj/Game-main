/**
 * point-of-interest.ts
 * Points of Interest - Discoverable objects in space
 *
 * Implements:
 * - Base POI classes
 * - Derelict ships
 * - Anomalies and phenomena
 * - Discovery mechanics
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';

/**
 * POI types
 */
export enum POIType {
  DERELICT_SHIP = 'DERELICT_SHIP',
  DEBRIS_FIELD = 'DEBRIS_FIELD',
  SPATIAL_ANOMALY = 'SPATIAL_ANOMALY',
  ENERGY_SIGNATURE = 'ENERGY_SIGNATURE',
  ANCIENT_STRUCTURE = 'ANCIENT_STRUCTURE',
  RESOURCE_CACHE = 'RESOURCE_CACHE',
  WRECKAGE = 'WRECKAGE',
  MYSTERIOUS_SIGNAL = 'MYSTERIOUS_SIGNAL'
}

/**
 * POI discovery state
 */
export enum DiscoveryState {
  UNDISCOVERED = 'UNDISCOVERED',
  DETECTED = 'DETECTED', // Appears on sensors
  IDENTIFIED = 'IDENTIFIED', // Type known
  SCANNED = 'SCANNED', // Fully analyzed
  SALVAGED = 'SALVAGED' // Looted/depleted
}

/**
 * Salvage loot item
 */
export interface LootItem {
  type: string; // Commodity or item type
  quantity: number;
  value: number; // Credits
  rarity: number; // 0-1 (0 = common, 1 = legendary)
}

/**
 * Base Point of Interest
 */
export class PointOfInterest {
  public readonly id: string;
  public name: string;
  public type: POIType;
  public position: Vector3;
  public velocity: Vector3;

  // Discovery
  public discoveryState: DiscoveryState = DiscoveryState.UNDISCOVERED;
  public discoveredBy: string | null = null;
  public discoveryTime: number = 0;

  // Detection properties
  public signatureStrength: number; // Detection range multiplier
  public scanDifficulty: number; // 0-1 (0 = easy, 1 = hard)

  // Rewards
  public loot: LootItem[] = [];
  public experienceReward: number = 0;
  public description: string = '';

  // Physics
  public radius: number; // meters
  public mass: number; // kg

  constructor(
    id: string,
    name: string,
    type: POIType,
    position: Vector3,
    velocity: Vector3 = new Vector3(0, 0, 0),
    signatureStrength: number = 1.0,
    scanDifficulty: number = 0.5,
    radius: number = 100,
    mass: number = 10000
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.signatureStrength = signatureStrength;
    this.scanDifficulty = scanDifficulty;
    this.radius = radius;
    this.mass = mass;
  }

  /**
   * Update POI position
   */
  public update(deltaTime: number): void {
    // Update position based on velocity
    const displacement = this.velocity.scale(deltaTime);
    this.position = this.position.add(displacement);
  }

  /**
   * Check if POI is discovered
   */
  public isDiscovered(): boolean {
    return this.discoveryState !== DiscoveryState.UNDISCOVERED;
  }

  /**
   * Mark as discovered
   */
  public discover(discovererID: string, currentTime: number): void {
    if (!this.isDiscovered()) {
      this.discoveryState = DiscoveryState.DETECTED;
      this.discoveredBy = discovererID;
      this.discoveryTime = currentTime;
    }
  }

  /**
   * Mark as identified
   */
  public identify(): void {
    if (this.discoveryState === DiscoveryState.DETECTED) {
      this.discoveryState = DiscoveryState.IDENTIFIED;
    }
  }

  /**
   * Mark as scanned
   */
  public scan(): void {
    if (this.discoveryState === DiscoveryState.IDENTIFIED || this.discoveryState === DiscoveryState.DETECTED) {
      this.discoveryState = DiscoveryState.SCANNED;
    }
  }

  /**
   * Salvage loot from POI
   */
  public salvage(): LootItem[] {
    const salvaged = [...this.loot];
    this.loot = [];
    this.discoveryState = DiscoveryState.SALVAGED;
    return salvaged;
  }

  /**
   * Get detection range
   *
   * Based on signature strength and scanner power
   */
  public getDetectionRange(scannerPower: number): number {
    const baseRange = 100000; // 100 km base
    return baseRange * this.signatureStrength * scannerPower;
  }

  /**
   * Get distance to point
   */
  public getDistanceTo(point: Vector3): number {
    return this.position.subtract(point).length();
  }

  /**
   * Clone POI
   */
  public clone(): PointOfInterest {
    const clone = new PointOfInterest(
      this.id,
      this.name,
      this.type,
      this.position,
      this.velocity,
      this.signatureStrength,
      this.scanDifficulty,
      this.radius,
      this.mass
    );

    clone.discoveryState = this.discoveryState;
    clone.discoveredBy = this.discoveredBy;
    clone.discoveryTime = this.discoveryTime;
    clone.loot = [...this.loot];
    clone.experienceReward = this.experienceReward;
    clone.description = this.description;

    return clone;
  }
}

/**
 * Derelict Ship - Abandoned spacecraft
 */
export class DerelictShip extends PointOfInterest {
  public shipClass: string; // Freighter, Cruiser, etc.
  public condition: number; // 0-1 (0 = debris, 1 = intact)
  public age: number; // Years abandoned

  // Tumbling motion (realistic physics)
  public angularVelocity: Vector3; // rad/s
  public orientation: Vector3; // Euler angles

  // Hazards
  public isRadioactive: boolean = false;
  public hasBreach: boolean = false;
  public hasHostiles: boolean = false; // Pirates, creatures, etc.

  constructor(
    id: string,
    name: string,
    position: Vector3,
    shipClass: string,
    condition: number = 0.5,
    age: number = 10
  ) {
    super(
      id,
      name,
      POIType.DERELICT_SHIP,
      position,
      new Vector3(
        (Math.random() - 0.5) * 10, // 0-10 m/s drift
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      0.8, // High signature (metal)
      0.3 + condition * 0.4, // Easier to scan if intact
      50 + condition * 200, // Size based on condition
      10000 + condition * 90000 // Mass based on condition
    );

    this.shipClass = shipClass;
    this.condition = Math.max(0, Math.min(1, condition));
    this.age = age;

    // Tumbling motion (realistic for derelicts)
    this.angularVelocity = new Vector3(
      (Math.random() - 0.5) * 0.1, // Slow tumble
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );
    this.orientation = new Vector3(
      Math.random() * 2 * Math.PI,
      Math.random() * 2 * Math.PI,
      Math.random() * 2 * Math.PI
    );

    // Generate description
    this.description = this.generateDescription();

    // Generate loot based on condition
    this.generateLoot();
  }

  /**
   * Update derelict (includes tumbling)
   */
  public update(deltaTime: number): void {
    super.update(deltaTime);

    // Update orientation (tumbling)
    const rotationDelta = this.angularVelocity.scale(deltaTime);
    this.orientation = this.orientation.add(rotationDelta);

    // Wrap angles to 0-2π
    this.orientation = new Vector3(
      this.orientation.x % (2 * Math.PI),
      this.orientation.y % (2 * Math.PI),
      this.orientation.z % (2 * Math.PI)
    );
  }

  /**
   * Generate description
   */
  private generateDescription(): string {
    const descriptions = [
      `${this.shipClass} class vessel, abandoned approximately ${this.age} years ago`,
      `Derelict ${this.shipClass} detected. Hull integrity ${(this.condition * 100).toFixed(0)}%`,
      `Ancient ${this.shipClass} wreck. Signs of ${this.age > 50 ? 'extreme' : 'moderate'} decay`,
      `Ghost ship of ${this.shipClass} class. Last transponder signal: ${this.age} years ago`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Generate loot
   */
  private generateLoot(): void {
    const lootCount = Math.floor(this.condition * 5) + 1;

    for (let i = 0; i < lootCount; i++) {
      const rarity = Math.random();
      let lootType: string;
      let quantity: number;
      let value: number;

      if (rarity > 0.9) {
        // Rare tech
        lootType = 'RARE_TECH';
        quantity = 1;
        value = 5000 + Math.random() * 10000;
      } else if (rarity > 0.7) {
        // Ship components
        lootType = 'SHIP_COMPONENTS';
        quantity = Math.floor(Math.random() * 5) + 1;
        value = 1000 * quantity;
      } else if (rarity > 0.4) {
        // Scrap metal
        lootType = 'SCRAP_METAL';
        quantity = Math.floor(Math.random() * 20) + 10;
        value = 50 * quantity;
      } else {
        // Debris
        lootType = 'DEBRIS';
        quantity = Math.floor(Math.random() * 50) + 10;
        value = 10 * quantity;
      }

      this.loot.push({
        type: lootType,
        quantity,
        value,
        rarity
      });
    }

    // Experience reward based on condition and age
    this.experienceReward = Math.floor(this.condition * 100 + this.age * 10);
  }
}

/**
 * Spatial Anomaly - Strange phenomena
 */
export class SpatialAnomaly extends PointOfInterest {
  public anomalyType: 'GRAVITATIONAL' | 'TEMPORAL' | 'ENERGY' | 'SPATIAL';
  public intensity: number; // 0-1
  public isPeriodic: boolean; // Pulses on/off
  public period: number; // seconds (if periodic)
  private phase: number = 0; // Current phase

  constructor(
    id: string,
    name: string,
    position: Vector3,
    anomalyType: 'GRAVITATIONAL' | 'TEMPORAL' | 'ENERGY' | 'SPATIAL',
    intensity: number = 0.5
  ) {
    super(
      id,
      name,
      POIType.SPATIAL_ANOMALY,
      position,
      new Vector3(0, 0, 0), // Anomalies don't move
      1.5 + intensity, // High signature
      0.6 + intensity * 0.3, // Harder to scan if intense
      1000 * intensity, // Size based on intensity
      0 // No mass
    );

    this.anomalyType = anomalyType;
    this.intensity = Math.max(0, Math.min(1, intensity));
    this.isPeriodic = Math.random() > 0.5;
    this.period = 10 + Math.random() * 90; // 10-100s period

    this.description = this.generateDescription();
    this.experienceReward = Math.floor(this.intensity * 200);
  }

  /**
   * Update anomaly
   */
  public update(deltaTime: number): void {
    super.update(deltaTime);

    if (this.isPeriodic) {
      this.phase += deltaTime;
      if (this.phase > this.period) {
        this.phase -= this.period;
      }
    }
  }

  /**
   * Get current intensity (accounting for periodic variation)
   */
  public getCurrentIntensity(): number {
    if (!this.isPeriodic) return this.intensity;

    // Sine wave variation
    const variation = Math.sin((this.phase / this.period) * 2 * Math.PI);
    return this.intensity * (0.5 + 0.5 * variation);
  }

  /**
   * Generate description
   */
  private generateDescription(): string {
    const descriptions: Record<typeof this.anomalyType, string[]> = {
      GRAVITATIONAL: [
        'Gravitational distortion detected. Extreme mass concentration',
        'Gravity well of unknown origin. Navigation hazard',
        'Localized gravitational anomaly. Possible micro black hole'
      ],
      TEMPORAL: [
        'Temporal distortion field. Time dilation effects observed',
        'Chronometric anomaly detected. Extreme caution advised',
        'Time flow irregularity. Unknown physics at work'
      ],
      ENERGY: [
        'Massive energy discharge. Source unknown',
        'Exotic radiation signature. Unknown particle emissions',
        'Energy concentration exceeding theoretical limits'
      ],
      SPATIAL: [
        'Spatial tear detected. Fabric of space-time disrupted',
        'Dimensional instability. Reality fluctuations observed',
        'Space-time anomaly of unknown origin'
      ]
    };

    const typeDescriptions = descriptions[this.anomalyType];
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }
}

/**
 * Resource Cache - Hidden supplies
 */
export class ResourceCache extends PointOfInterest {
  public cacheType: 'SUPPLY' | 'FUEL' | 'VALUABLES' | 'MILITARY';
  public isTrapped: boolean = false;
  public requiresKey: boolean = false;

  constructor(
    id: string,
    name: string,
    position: Vector3,
    cacheType: 'SUPPLY' | 'FUEL' | 'VALUABLES' | 'MILITARY'
  ) {
    super(
      id,
      name,
      POIType.RESOURCE_CACHE,
      position,
      new Vector3(0, 0, 0),
      0.3, // Low signature (hidden)
      0.7, // Hard to scan
      10, // Small
      1000 // Light
    );

    this.cacheType = cacheType;
    this.isTrapped = Math.random() > 0.7;
    this.requiresKey = Math.random() > 0.8;

    this.description = this.generateDescription();
    this.generateLoot();
  }

  /**
   * Generate description
   */
  private generateDescription(): string {
    const descriptions: Record<typeof this.cacheType, string[]> = {
      SUPPLY: ['Emergency supply cache', 'Abandoned provisions', 'Hidden supply depot'],
      FUEL: ['Fuel cache', 'Emergency fuel reserve', 'Hidden fuel depot'],
      VALUABLES: ['Smuggler\'s stash', 'Hidden valuables', 'Secret treasure cache'],
      MILITARY: ['Military supply cache', 'Weapons depot', 'Restricted military supplies']
    };

    return descriptions[this.cacheType][Math.floor(Math.random() * descriptions[this.cacheType].length)];
  }

  /**
   * Generate loot
   */
  private generateLoot(): void {
    const lootCount = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < lootCount; i++) {
      let lootType: string;
      let quantity: number;
      let value: number;
      const rarity = Math.random();

      switch (this.cacheType) {
        case 'SUPPLY':
          lootType = Math.random() > 0.5 ? 'FOOD' : 'MEDICAL_SUPPLIES';
          quantity = Math.floor(Math.random() * 20) + 10;
          value = 100 * quantity;
          break;
        case 'FUEL':
          lootType = 'HYDROGEN_FUEL';
          quantity = Math.floor(Math.random() * 50) + 20;
          value = 150 * quantity;
          break;
        case 'VALUABLES':
          lootType = rarity > 0.7 ? 'RARE_ARTIFACTS' : 'JEWELRY';
          quantity = Math.floor(Math.random() * 5) + 1;
          value = (rarity > 0.7 ? 10000 : 2000) * quantity;
          break;
        case 'MILITARY':
          lootType = 'WEAPONS';
          quantity = Math.floor(Math.random() * 3) + 1;
          value = 3000 * quantity;
          break;
      }

      this.loot.push({
        type: lootType,
        quantity,
        value,
        rarity
      });
    }

    this.experienceReward = Math.floor(this.loot.reduce((sum, item) => sum + item.value, 0) / 100);
  }
}
