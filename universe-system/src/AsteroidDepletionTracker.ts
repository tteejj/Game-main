/**
 * AsteroidDepletionTracker.ts
 * Manages persistent asteroid fields with depletion and respawn mechanics
 * Supports competitive mining by multiple NPCs and players
 */

import { Vector3 } from './CelestialBody';
import { OreType } from './MiningSystem';

export interface PersistentAsteroid {
  id: string;
  position: Vector3;
  fieldId: string; // Which field this asteroid belongs to

  // Composition (original)
  originalMass: number; // kg - never changes
  originalComposition: Map<OreType, number>; // ore type -> percentage

  // Current state
  currentMass: number; // kg - depletes as mined
  remainingOre: Map<OreType, number>; // ore type -> kg remaining

  // Status
  depleted: boolean;
  discovered: boolean;
  lastMinedTime: number; // timestamp

  // Respawn
  respawnProgress: number; // 0-1, how much has regrown
  respawnRate: number; // fraction per hour

  // Mining activity
  activeMiners: Set<string>; // ship IDs currently mining this asteroid
  totalExtracted: number; // kg extracted lifetime

  // Value
  estimatedValue: number; // credits
}

export interface AsteroidField {
  id: string;
  name: string;
  center: Vector3;
  radius: number;

  // Composition distribution for this field
  oreDistribution: Map<OreType, number>; // percentage of each ore type

  // Asteroids in this field
  asteroidIds: string[];

  // Field properties
  density: number; // asteroids per cubic km
  averageMass: number; // kg
  discovered: boolean;

  // Respawn mechanics
  naturalRespawnRate: number; // How fast asteroids regenerate (0-1 per hour)
  maxAsteroids: number; // Maximum asteroids that can exist in field

  // Activity
  totalMinedLifetime: number; // kg
  activeMiners: number; // current miners in field
}

export class AsteroidDepletionTracker {
  private asteroids: Map<string, PersistentAsteroid> = new Map();
  private fields: Map<string, AsteroidField> = new Map();

  private asteroidIdCounter: number = 0;
  private fieldIdCounter: number = 0;

  // Constants
  private static readonly BASE_RESPAWN_RATE = 0.01; // 1% per hour base rate
  private static readonly FULL_DEPLETION_THRESHOLD = 0.05; // 5% remaining = depleted
  private static readonly RESPAWN_THRESHOLD = 0.9; // 90% respawned = restored

  // Ore value map (credits per kg)
  private static readonly ORE_VALUES: Map<OreType, number> = new Map([
    ['IRON', 5],
    ['NICKEL', 8],
    ['COPPER', 10],
    ['ALUMINUM', 7],
    ['TITANIUM', 20],
    ['GOLD', 100],
    ['PLATINUM', 150],
    ['URANIUM', 200],
    ['RARE_EARTHS', 300],
    ['WATER_ICE', 2],
    ['VOLATILES', 15],
    ['EXOTIC_MATTER', 5000]
  ]);

  constructor() {
    // Initialize with some default fields
    this.initializeDefaultFields();
  }

  /**
   * Initialize asteroid fields from game asteroids
   */
  public initializeAsteroidFields(asteroids: any[]): void {
    console.log(`[MINING] Initializing ${asteroids.length} asteroids for depletion tracking`);

    // Group asteroids by region/cluster for the pre-populated fields
    asteroids.forEach((asteroid, index) => {
      const fieldId = index < asteroids.length / 3 ? 'main_belt' :
                     index < 2 * asteroids.length / 3 ? 'prometheus_cluster' :
                     'kuiper_ice_field';

      this.registerAsteroid(fieldId, asteroid.id, {
        iron: Math.random() > 0.5 ? Math.floor(Math.random() * 10000) + 5000 : 0,
        nickel: Math.random() > 0.5 ? Math.floor(Math.random() * 5000) + 2000 : 0,
        rareEarth: Math.random() > 0.3 ? Math.floor(Math.random() * 2000) + 500 : 0,
        exoticMaterials: Math.random() > 0.8 ? Math.floor(Math.random() * 1000) + 100 : 0,
        waterIce: fieldId === 'kuiper_ice_field' ? Math.floor(Math.random() * 15000) + 8000 : 0,
        volatiles: fieldId === 'kuiper_ice_field' ? Math.floor(Math.random() * 8000) + 4000 : 0
      });
    });

    console.log(`[MINING] Registered ${asteroids.length} asteroids across 3 fields`);
  }

  /**
   * Initialize default asteroid fields for the system
   */
  private initializeDefaultFields(): void {
    // Main belt - iron/nickel rich
    this.createAsteroidField({
      name: 'Main Asteroid Belt',
      center: { x: 4e11, y: 0, z: 0 },
      radius: 1e11,
      density: 0.00001, // Very sparse
      averageMass: 500000, // 500 tons average
      oreDistribution: new Map([
        ['IRON', 0.45],
        ['NICKEL', 0.25],
        ['WATER_ICE', 0.15],
        ['COPPER', 0.08],
        ['ALUMINUM', 0.05],
        ['TITANIUM', 0.02]
      ]),
      maxAsteroids: 1000,
      naturalRespawnRate: 0.005 // 0.5% per hour
    });

    // Rare earth cluster - exotic materials
    this.createAsteroidField({
      name: 'Prometheus Cluster',
      center: { x: -3e11, y: 5e10, z: 2e11 },
      radius: 5e10,
      density: 0.00005, // Denser
      averageMass: 200000, // Smaller asteroids
      oreDistribution: new Map([
        ['RARE_EARTHS', 0.35],
        ['PLATINUM', 0.15],
        ['GOLD', 0.10],
        ['TITANIUM', 0.20],
        ['URANIUM', 0.10],
        ['EXOTIC_MATTER', 0.10]
      ]),
      maxAsteroids: 500,
      naturalRespawnRate: 0.002 // 0.2% per hour - slower respawn for rare materials
    });

    // Ice field - water/volatiles
    this.createAsteroidField({
      name: 'Kuiper Ice Field',
      center: { x: 6e11, y: -1e11, z: -3e11 },
      radius: 2e11,
      density: 0.00002,
      averageMass: 1000000, // Large icy bodies
      oreDistribution: new Map([
        ['WATER_ICE', 0.60],
        ['VOLATILES', 0.25],
        ['IRON', 0.10],
        ['NICKEL', 0.05]
      ]),
      maxAsteroids: 800,
      naturalRespawnRate: 0.01 // 1% per hour - ice reforms quickly
    });
  }

  /**
   * Create a new asteroid field
   */
  createAsteroidField(params: {
    name: string;
    center: Vector3;
    radius: number;
    density: number;
    averageMass: number;
    oreDistribution: Map<OreType, number>;
    maxAsteroids: number;
    naturalRespawnRate: number;
  }): AsteroidField {
    const field: AsteroidField = {
      id: `field_${this.fieldIdCounter++}`,
      name: params.name,
      center: params.center,
      radius: params.radius,
      oreDistribution: params.oreDistribution,
      asteroidIds: [],
      density: params.density,
      averageMass: params.averageMass,
      discovered: false,
      naturalRespawnRate: params.naturalRespawnRate,
      maxAsteroids: params.maxAsteroids,
      totalMinedLifetime: 0,
      activeMiners: 0
    };

    this.fields.set(field.id, field);

    // Populate with initial asteroids
    const initialCount = Math.floor(params.maxAsteroids * 0.8); // Start at 80% capacity
    for (let i = 0; i < initialCount; i++) {
      this.spawnAsteroidInField(field);
    }

    console.log(`[ASTEROIDS] Created field "${field.name}" with ${initialCount} asteroids`);

    return field;
  }

  /**
   * Spawn a new asteroid in a field
   */
  private spawnAsteroidInField(field: AsteroidField): PersistentAsteroid {
    // Random position within field
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const distance = Math.random() * field.radius;

    const position: Vector3 = {
      x: field.center.x + Math.cos(angle1) * Math.cos(angle2) * distance,
      y: field.center.y + Math.sin(angle1) * Math.cos(angle2) * distance,
      z: field.center.z + Math.sin(angle2) * distance
    };

    // Random mass around average (±50%)
    const mass = field.averageMass * (0.5 + Math.random());

    // Composition based on field distribution with some variation
    const composition = new Map<OreType, number>();
    const remainingOre = new Map<OreType, number>();

    for (const [ore, basePercentage] of field.oreDistribution) {
      // Add variation (±20%)
      const variance = 0.8 + Math.random() * 0.4;
      const percentage = basePercentage * variance;
      composition.set(ore, percentage);

      // Calculate kg of this ore
      const kg = mass * percentage;
      remainingOre.set(ore, kg);
    }

    // Normalize composition to sum to 1.0
    let total = 0;
    for (const [_, pct] of composition) {
      total += pct;
    }
    for (const [ore, pct] of composition) {
      composition.set(ore, pct / total);
    }

    // Calculate value
    let estimatedValue = 0;
    for (const [ore, kg] of remainingOre) {
      const valuePerKg = AsteroidDepletionTracker.ORE_VALUES.get(ore) || 0;
      estimatedValue += kg * valuePerKg;
    }

    const asteroid: PersistentAsteroid = {
      id: `asteroid_${field.id}_${this.asteroidIdCounter++}`,
      position,
      fieldId: field.id,
      originalMass: mass,
      originalComposition: new Map(composition),
      currentMass: mass,
      remainingOre: remainingOre,
      depleted: false,
      discovered: false,
      lastMinedTime: 0,
      respawnProgress: 0,
      respawnRate: field.naturalRespawnRate,
      activeMiners: new Set(),
      totalExtracted: 0,
      estimatedValue
    };

    this.asteroids.set(asteroid.id, asteroid);
    field.asteroidIds.push(asteroid.id);

    return asteroid;
  }

  /**
   * Find asteroids near a position
   */
  findAsteroidsNear(position: Vector3, range: number, includeDepl = false): PersistentAsteroid[] {
    const nearby: PersistentAsteroid[] = [];

    for (const asteroid of this.asteroids.values()) {
      if (!includeDepl && asteroid.depleted) continue;

      const distance = this.distance(position, asteroid.position);
      if (distance <= range) {
        nearby.push(asteroid);
      }
    }

    // Sort by distance
    nearby.sort((a, b) => {
      const distA = this.distance(position, a.position);
      const distB = this.distance(position, b.position);
      return distA - distB;
    });

    return nearby;
  }

  /**
   * Find asteroid fields near a position
   */
  findFieldsNear(position: Vector3, range: number): AsteroidField[] {
    const nearby: AsteroidField[] = [];

    for (const field of this.fields.values()) {
      const distance = this.distance(position, field.center);
      if (distance <= field.radius + range) {
        nearby.push(field);
      }
    }

    return nearby;
  }

  /**
   * Get asteroid by ID
   */
  getAsteroid(asteroidId: string): PersistentAsteroid | undefined {
    return this.asteroids.get(asteroidId);
  }

  /**
   * Get field by ID
   */
  getField(fieldId: string): AsteroidField | undefined {
    return this.fields.get(fieldId);
  }

  /**
   * Mine from an asteroid
   * Returns amount actually mined (may be less than requested if asteroid runs out)
   */
  mineAsteroid(
    asteroidId: string,
    minerId: string,
    requestedAmount: number // kg to mine
  ): {
    success: boolean;
    amountMined: number;
    oreYield: Map<OreType, number>; // ore type -> kg extracted
    depleted: boolean;
    message: string;
  } {
    const asteroid = this.asteroids.get(asteroidId);

    if (!asteroid) {
      return {
        success: false,
        amountMined: 0,
        oreYield: new Map(),
        depleted: false,
        message: 'Asteroid not found'
      };
    }

    if (asteroid.depleted) {
      return {
        success: false,
        amountMined: 0,
        oreYield: new Map(),
        depleted: true,
        message: 'Asteroid depleted'
      };
    }

    // Register miner
    asteroid.activeMiners.add(minerId);

    // Calculate actual amount we can mine
    const amountMined = Math.min(requestedAmount, asteroid.currentMass);

    // Extract ore proportionally
    const oreYield = new Map<OreType, number>();

    for (const [oreType, remainingKg] of asteroid.remainingOre) {
      const percentage = asteroid.originalComposition.get(oreType) || 0;
      const extracted = amountMined * percentage;
      const actualExtracted = Math.min(extracted, remainingKg);

      oreYield.set(oreType, actualExtracted);
      asteroid.remainingOre.set(oreType, remainingKg - actualExtracted);
    }

    // Update asteroid state
    asteroid.currentMass -= amountMined;
    asteroid.totalExtracted += amountMined;
    asteroid.lastMinedTime = Date.now() / 1000;

    // Update field statistics
    const field = this.fields.get(asteroid.fieldId);
    if (field) {
      field.totalMinedLifetime += amountMined;
    }

    // Check if depleted
    const depletionRatio = asteroid.currentMass / asteroid.originalMass;
    if (depletionRatio < AsteroidDepletionTracker.FULL_DEPLETION_THRESHOLD) {
      asteroid.depleted = true;
      asteroid.activeMiners.clear();
      console.log(`[ASTEROIDS] Asteroid ${asteroidId} depleted`);
    }

    return {
      success: true,
      amountMined,
      oreYield,
      depleted: asteroid.depleted,
      message: `Mined ${amountMined.toFixed(0)}kg from asteroid`
    };
  }

  /**
   * Unregister a miner from an asteroid
   */
  stopMining(asteroidId: string, minerId: string): void {
    const asteroid = this.asteroids.get(asteroidId);
    if (asteroid) {
      asteroid.activeMiners.delete(minerId);
    }
  }

  /**
   * Update asteroid respawn
   */
  update(deltaTime: number): void {
    const hoursElapsed = deltaTime / 3600;

    // Update asteroid respawn
    for (const asteroid of this.asteroids.values()) {
      if (asteroid.depleted && asteroid.activeMiners.size === 0) {
        // Regenerate depleted asteroids
        asteroid.respawnProgress += asteroid.respawnRate * hoursElapsed;

        if (asteroid.respawnProgress >= AsteroidDepletionTracker.RESPAWN_THRESHOLD) {
          this.respawnAsteroid(asteroid);
        }
      }
    }

    // Spawn new asteroids in fields below capacity
    for (const field of this.fields.values()) {
      const currentCount = field.asteroidIds.filter(id => {
        const ast = this.asteroids.get(id);
        return ast && !ast.depleted;
      }).length;

      if (currentCount < field.maxAsteroids) {
        // Chance to spawn new asteroid (based on natural respawn rate)
        const spawnChance = field.naturalRespawnRate * hoursElapsed;
        if (Math.random() < spawnChance) {
          this.spawnAsteroidInField(field);
          console.log(`[ASTEROIDS] Spawned new asteroid in ${field.name} (${currentCount + 1}/${field.maxAsteroids})`);
        }
      }
    }

    // Update field active miner counts
    for (const field of this.fields.values()) {
      let activeMiners = 0;
      for (const astId of field.asteroidIds) {
        const ast = this.asteroids.get(astId);
        if (ast) {
          activeMiners += ast.activeMiners.size;
        }
      }
      field.activeMiners = activeMiners;
    }
  }

  /**
   * Fully restore a depleted asteroid
   */
  private respawnAsteroid(asteroid: PersistentAsteroid): void {
    asteroid.currentMass = asteroid.originalMass;
    asteroid.depleted = false;
    asteroid.respawnProgress = 0;
    asteroid.totalExtracted = 0;

    // Restore ore amounts
    asteroid.remainingOre.clear();
    for (const [oreType, percentage] of asteroid.originalComposition) {
      const kg = asteroid.originalMass * percentage;
      asteroid.remainingOre.set(oreType, kg);
    }

    // Recalculate value
    let estimatedValue = 0;
    for (const [ore, kg] of asteroid.remainingOre) {
      const valuePerKg = AsteroidDepletionTracker.ORE_VALUES.get(ore) || 0;
      estimatedValue += kg * valuePerKg;
    }
    asteroid.estimatedValue = estimatedValue;

    console.log(`[ASTEROIDS] Asteroid ${asteroid.id} fully respawned`);
  }

  /**
   * Get field statistics
   */
  getFieldStats(fieldId: string): string {
    const field = this.fields.get(fieldId);
    if (!field) return 'Field not found';

    const activeAsteroids = field.asteroidIds.filter(id => {
      const ast = this.asteroids.get(id);
      return ast && !ast.depleted;
    }).length;

    const depletedAsteroids = field.asteroidIds.length - activeAsteroids;

    const lines: string[] = [];
    lines.push(`=== ${field.name} ===`);
    lines.push(`Location: (${(field.center.x / 1e9).toFixed(2)}e9, ${(field.center.y / 1e9).toFixed(2)}e9, ${(field.center.z / 1e9).toFixed(2)}e9)`);
    lines.push(`Radius: ${(field.radius / 1e9).toFixed(2)}e9 m`);
    lines.push('');
    lines.push(`Asteroids: ${activeAsteroids} active, ${depletedAsteroids} depleted, ${field.maxAsteroids} max`);
    lines.push(`Active miners: ${field.activeMiners}`);
    lines.push(`Total mined (lifetime): ${(field.totalMinedLifetime / 1000).toFixed(0)} tons`);
    lines.push('');
    lines.push('Ore Distribution:');
    for (const [ore, pct] of field.oreDistribution) {
      lines.push(`  ${ore}: ${(pct * 100).toFixed(1)}%`);
    }

    return lines.join('\n');
  }

  /**
   * Get all asteroid fields
   */
  getAllFields(): AsteroidField[] {
    return Array.from(this.fields.values());
  }

  /**
   * Get all asteroids
   */
  getAllAsteroids(): PersistentAsteroid[] {
    return Array.from(this.asteroids.values());
  }

  /**
   * Find best mining location for specific ore type
   */
  findBestMiningLocation(oreType: OreType, fromPosition: Vector3): {
    field: AsteroidField;
    asteroid: PersistentAsteroid;
    distance: number;
    oreAmount: number;
  } | null {
    let bestMatch: {
      field: AsteroidField;
      asteroid: PersistentAsteroid;
      distance: number;
      oreAmount: number;
    } | null = null;

    let bestScore = 0;

    for (const field of this.fields.values()) {
      // Check if field has this ore type
      const orePercentage = field.oreDistribution.get(oreType);
      if (!orePercentage || orePercentage < 0.05) continue; // Skip if <5% of this ore

      // Find best asteroid in this field
      for (const astId of field.asteroidIds) {
        const asteroid = this.asteroids.get(astId);
        if (!asteroid || asteroid.depleted) continue;

        const oreAmount = asteroid.remainingOre.get(oreType) || 0;
        if (oreAmount < 10) continue; // Skip if <10kg remaining

        const distance = this.distance(fromPosition, asteroid.position);

        // Score: ore amount / distance (prefer nearby rich asteroids)
        const score = oreAmount / (distance / 1e9); // Normalize distance to millions of km

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            field,
            asteroid,
            distance,
            oreAmount
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate distance between two points
   */
  private distance(p1: Vector3, p2: Vector3): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
