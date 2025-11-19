/**
 * MiningSystem - Mine asteroids and celestial bodies for resources
 * Mining lasers, extraction efficiency, ore types, refining
 * Integrates with ManufacturingSystem to convert ore into tradeable commodities
 */

import { Vector3 } from './CelestialBody';
import { UniverseOrchestrator } from './UniverseOrchestrator';
import { CommodityType } from './economy/commodity';
import { ORE_TO_COMMODITY_MAP } from './ManufacturingSystem';

export type OreType =
  | 'IRON'
  | 'NICKEL'
  | 'COPPER'
  | 'ALUMINUM'
  | 'TITANIUM'
  | 'GOLD'
  | 'PLATINUM'
  | 'URANIUM'
  | 'RARE_EARTHS'
  | 'WATER_ICE'
  | 'VOLATILES'
  | 'EXOTIC_MATTER';

export interface Asteroid {
  id: string;
  position: Vector3;
  mass: number; // kg
  composition: Map<OreType, number>; // ore type -> percentage
  value: number; // Total estimated value
  depleted: boolean;
  discovered: boolean;
}

export interface MiningLaser {
  id: string;
  name: string;

  // Performance
  miningRate: number; // kg per second
  efficiency: number; // 0-1, how much ore vs waste
  powerDraw: number; // kW
  range: number; // meters

  // Heat
  heatGeneration: number;
  temperature: number; // Current temp 0-1
  overheated: boolean;

  // State
  active: boolean;
  condition: number; // 0-1
}

export interface MiningYield {
  oreType: OreType;
  quantity: number; // kg
  value: number; // credits
  purity: number; // 0-1
}

export interface RefineryBay {
  capacity: number; // kg of ore
  currentLoad: number;
  refining: boolean;
  refineryEfficiency: number; // 0-1
  processedOre: Map<OreType, number>;
  waste: number;
}

/**
 * Refined ore ready for economy integration
 * Maps ore types to commodity types for trading
 */
export interface RefinedCommodities {
  commodities: Map<CommodityType, number>; // commodity type -> kg
  totalValue: number; // estimated credits
  refinedAt: number; // timestamp
}

export class MiningSystem {
  private orchestrator: UniverseOrchestrator;
  private miningLasers: MiningLaser[] = [];
  private refinery: RefineryBay;

  private currentTarget: Asteroid | null = null;
  private miningActive: boolean = false;

  // Track refined commodities ready for market
  private refinedCommodities: Map<CommodityType, number> = new Map();

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

  constructor(orchestrator: UniverseOrchestrator) {
    this.orchestrator = orchestrator;

    // Initialize with basic mining laser
    this.miningLasers.push({
      id: 'mining_laser_1',
      name: 'Basic Mining Laser',
      miningRate: 10, // 10 kg/s
      efficiency: 0.6,
      powerDraw: 5,
      range: 1000,
      heatGeneration: 0.2,
      temperature: 0,
      overheated: false,
      active: false,
      condition: 1.0
    });

    // Initialize refinery
    this.refinery = {
      capacity: 1000,
      currentLoad: 0,
      refining: false,
      refineryEfficiency: 0.7,
      processedOre: new Map(),
      waste: 0
    };
  }

  /**
   * Scan for asteroids
   */
  public scanForAsteroids(playerPosition: Vector3, scanRange: number): Asteroid[] {
    // Would scan current system for asteroids
    // For now, generate some procedural asteroids

    const asteroids: Asteroid[] = [];
    const numAsteroids = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < numAsteroids; i++) {
      asteroids.push(this.generateAsteroid(playerPosition));
    }

    return asteroids;
  }

  /**
   * Target asteroid for mining
   */
  public targetAsteroid(asteroid: Asteroid, playerPosition: Vector3): {
    success: boolean;
    message: string;
  } {
    const distance = this.calculateDistance(playerPosition, asteroid.position);
    const maxRange = Math.max(...this.miningLasers.map(l => l.range));

    if (distance > maxRange) {
      return {
        success: false,
        message: `Asteroid out of range: ${(distance / 1000).toFixed(1)}km (max: ${(maxRange / 1000).toFixed(1)}km)`
      };
    }

    this.currentTarget = asteroid;
    asteroid.discovered = true;

    console.log(`[MINING] Targeted asteroid ${asteroid.id}`);
    console.log(`  Mass: ${(asteroid.mass / 1000).toFixed(0)}t`);
    console.log(`  Estimated value: ${asteroid.value.toFixed(0)} credits`);
    console.log('  Composition:');
    for (const [ore, percentage] of asteroid.composition) {
      console.log(`    ${ore}: ${(percentage * 100).toFixed(1)}%`);
    }

    return {
      success: true,
      message: `Asteroid targeted: ${asteroid.value.toFixed(0)} credits estimated value`
    };
  }

  /**
   * Start mining
   */
  public startMining(powerAvailable: number): {
    success: boolean;
    message: string;
  } {
    if (!this.currentTarget) {
      return {
        success: false,
        message: 'No asteroid targeted'
      };
    }

    if (this.currentTarget.depleted) {
      return {
        success: false,
        message: 'Asteroid depleted'
      };
    }

    // Check power
    const totalPower = this.miningLasers.reduce((sum, laser) => sum + laser.powerDraw, 0);
    if (powerAvailable < totalPower) {
      return {
        success: false,
        message: `Insufficient power: need ${totalPower}kW, have ${powerAvailable.toFixed(1)}kW`
      };
    }

    // Check refinery capacity
    if (this.refinery.currentLoad >= this.refinery.capacity) {
      return {
        success: false,
        message: 'Refinery full - process ore first'
      };
    }

    this.miningActive = true;
    for (const laser of this.miningLasers) {
      laser.active = true;
    }

    console.log('[MINING] Mining started');

    return {
      success: true,
      message: 'Mining operations commenced'
    };
  }

  /**
   * Stop mining
   */
  public stopMining(): void {
    this.miningActive = false;
    for (const laser of this.miningLasers) {
      laser.active = false;
    }

    console.log('[MINING] Mining stopped');
  }

  /**
   * Update mining
   */
  public update(deltaTime: number): MiningYield[] {
    const yields: MiningYield[] = [];

    if (!this.miningActive || !this.currentTarget) {
      // Cool down lasers
      for (const laser of this.miningLasers) {
        laser.temperature = Math.max(0, laser.temperature - 0.1 * deltaTime);
        if (laser.temperature < 0.5) {
          laser.overheated = false;
        }
      }
      return yields;
    }

    // Mine with each laser
    for (const laser of this.miningLasers) {
      if (laser.overheated) {
        laser.temperature = Math.max(0, laser.temperature - 0.05 * deltaTime);
        if (laser.temperature < 0.5) {
          laser.overheated = false;
          console.log(`[MINING] ${laser.name} cooled down`);
        }
        continue;
      }

      const minedAmount = laser.miningRate * deltaTime * laser.condition;

      // Heat up
      laser.temperature += laser.heatGeneration * deltaTime;
      if (laser.temperature >= 1.0) {
        laser.overheated = true;
        laser.active = false;
        console.log(`[MINING] ${laser.name} overheated!`);
        continue;
      }

      // Extract ore
      const yield = this.extractOre(minedAmount, laser.efficiency);
      if (yield) {
        yields.push(yield);

        // Add to refinery
        this.refinery.currentLoad += yield.quantity;

        // Reduce asteroid mass
        this.currentTarget.mass -= minedAmount;

        if (this.currentTarget.mass <= 0) {
          this.currentTarget.depleted = true;
          this.stopMining();
          console.log('[MINING] Asteroid depleted');
        }
      }

      // Laser degradation
      laser.condition -= 0.00001 * deltaTime;
    }

    return yields;
  }

  /**
   * Process ore in refinery
   * Now converts ore to economy commodities
   */
  public processOre(duration: number): {
    processed: Map<OreType, number>;
    waste: number;
    commodities: Map<CommodityType, number>; // New: economy-ready commodities
  } {
    if (this.refinery.currentLoad === 0) {
      return {
        processed: new Map(),
        waste: 0,
        commodities: new Map()
      };
    }

    const processAmount = Math.min(this.refinery.currentLoad, duration * 5); // 5 kg/s

    // Simulated processing - would track actual ore types
    const processed = new Map<OreType, number>();
    const commodities = new Map<CommodityType, number>();
    const pureOre = processAmount * this.refinery.refineryEfficiency;
    const waste = processAmount * (1 - this.refinery.refineryEfficiency);

    // Distribute processed ore (simplified)
    if (this.currentTarget) {
      for (const [oreType, percentage] of this.currentTarget.composition) {
        const amount = pureOre * percentage;
        processed.set(oreType, amount);

        const existing = this.refinery.processedOre.get(oreType) || 0;
        this.refinery.processedOre.set(oreType, existing + amount);

        // Convert to commodity type for economy integration
        const commodityType = ORE_TO_COMMODITY_MAP.get(oreType);
        if (commodityType) {
          const existingCommodity = this.refinedCommodities.get(commodityType) || 0;
          this.refinedCommodities.set(commodityType, existingCommodity + amount);

          const commodityAmount = commodities.get(commodityType) || 0;
          commodities.set(commodityType, commodityAmount + amount);
        }
      }
    }

    this.refinery.currentLoad -= processAmount;
    this.refinery.waste += waste;

    console.log(`[REFINERY] Processed ${processAmount.toFixed(1)}kg ore -> ${pureOre.toFixed(1)}kg refined, ${waste.toFixed(1)}kg waste`);

    // Log commodity conversion
    if (commodities.size > 0) {
      console.log('[REFINERY] Converted to commodities:');
      for (const [commodity, amount] of commodities) {
        console.log(`  ${commodity}: ${amount.toFixed(1)}kg`);
      }
    }

    return {
      processed,
      waste,
      commodities
    };
  }

  /**
   * Sell processed ore (legacy method - for direct sale)
   */
  public sellProcessedOre(): {
    credits: number;
    sold: Map<OreType, number>;
  } {
    let totalCredits = 0;
    const sold = new Map<OreType, number>();

    for (const [oreType, quantity] of this.refinery.processedOre) {
      const value = (MiningSystem.ORE_VALUES.get(oreType) || 0) * quantity;
      totalCredits += value;
      sold.set(oreType, quantity);
    }

    this.refinery.processedOre.clear();
    // Also clear refined commodities when selling directly
    this.refinedCommodities.clear();

    console.log(`[MINING] Sold processed ore for ${totalCredits.toFixed(0)} credits`);

    return {
      credits: totalCredits,
      sold
    };
  }

  /**
   * Export refined commodities for economy/manufacturing use
   * Returns commodities without clearing inventory (for transfer to station/facility)
   */
  public getRefinedCommodities(): Map<CommodityType, number> {
    return new Map(this.refinedCommodities);
  }

  /**
   * Transfer refined commodities to a station/facility
   * Clears the specified amount from inventory
   */
  public transferCommodities(
    commodity: CommodityType,
    amount: number
  ): { success: boolean; transferred: number; message: string } {
    const available = this.refinedCommodities.get(commodity) || 0;

    if (available < amount) {
      return {
        success: false,
        transferred: 0,
        message: `Insufficient ${commodity}: requested ${amount}kg, have ${available.toFixed(1)}kg`
      };
    }

    this.refinedCommodities.set(commodity, available - amount);

    // Also reduce from processedOre (find matching ore type)
    for (const [oreType, commodityType] of ORE_TO_COMMODITY_MAP) {
      if (commodityType === commodity) {
        const oreAmount = this.refinery.processedOre.get(oreType) || 0;
        this.refinery.processedOre.set(oreType, Math.max(0, oreAmount - amount));
      }
    }

    console.log(`[MINING] Transferred ${amount.toFixed(1)}kg of ${commodity}`);

    return {
      success: true,
      transferred: amount,
      message: `Transferred ${amount.toFixed(1)}kg of ${commodity}`
    };
  }

  /**
   * Transfer all refined commodities (for bulk station delivery)
   */
  public transferAllCommodities(): Map<CommodityType, number> {
    const transferred = new Map(this.refinedCommodities);

    console.log('[MINING] Transferring all refined commodities:');
    for (const [commodity, amount] of transferred) {
      console.log(`  ${commodity}: ${amount.toFixed(1)}kg`);
    }

    this.refinedCommodities.clear();
    this.refinery.processedOre.clear();

    return transferred;
  }

  /**
   * Get mining status
   */
  public getMiningStatus(): string {
    const lines: string[] = [];

    lines.push('=== MINING STATUS ===');
    lines.push(`Mining: ${this.miningActive ? 'ACTIVE' : 'INACTIVE'}`);

    if (this.currentTarget) {
      lines.push('');
      lines.push(`Target: ${this.currentTarget.id}`);
      lines.push(`Mass remaining: ${(this.currentTarget.mass / 1000).toFixed(0)}t`);
      lines.push(`Depleted: ${this.currentTarget.depleted ? 'YES' : 'NO'}`);
    }

    lines.push('');
    lines.push('Mining Lasers:');
    for (const laser of this.miningLasers) {
      const temp = (laser.temperature * 100).toFixed(0);
      const status = laser.overheated ? '[OVERHEATED]' : laser.active ? '[ACTIVE]' : '[IDLE]';
      lines.push(`  ${laser.name} ${status}`);
      lines.push(`    Rate: ${laser.miningRate}kg/s, Efficiency: ${(laser.efficiency * 100).toFixed(0)}%`);
      lines.push(`    Temperature: ${temp}%, Condition: ${(laser.condition * 100).toFixed(0)}%`);
    }

    lines.push('');
    lines.push('Refinery:');
    lines.push(`  Ore: ${this.refinery.currentLoad.toFixed(1)}/${this.refinery.capacity}kg`);
    lines.push(`  Waste: ${this.refinery.waste.toFixed(1)}kg`);

    if (this.refinery.processedOre.size > 0) {
      lines.push('  Processed:');
      for (const [ore, qty] of this.refinery.processedOre) {
        const value = (MiningSystem.ORE_VALUES.get(ore) || 0) * qty;
        lines.push(`    ${ore}: ${qty.toFixed(1)}kg (${value.toFixed(0)} credits)`);
      }
    }

    // Show refined commodities ready for economy
    if (this.refinedCommodities.size > 0) {
      lines.push('');
      lines.push('Refined Commodities (Market-Ready):');
      for (const [commodity, qty] of this.refinedCommodities) {
        lines.push(`    ${commodity}: ${qty.toFixed(1)}kg`);
      }
    }

    return lines.join('\n');
  }

  // Private methods
  private generateAsteroid(nearPosition: Vector3): Asteroid {
    const id = `asteroid_${Math.random().toString(36).substr(2, 9)}`;

    // Random position near player
    const position: Vector3 = {
      x: nearPosition.x + (Math.random() - 0.5) * 50000,
      y: nearPosition.y + (Math.random() - 0.5) * 50000,
      z: nearPosition.z + (Math.random() - 0.5) * 50000
    };

    // Random mass
    const mass = Math.random() * 1000000 + 100000; // 100t - 1000t

    // Random composition
    const composition = new Map<OreType, number>();

    // Common ores
    composition.set('IRON', Math.random() * 0.4 + 0.2); // 20-60%
    composition.set('NICKEL', Math.random() * 0.2 + 0.05); // 5-25%
    composition.set('WATER_ICE', Math.random() * 0.3); // 0-30%

    // Rare ores (small chance)
    if (Math.random() > 0.7) {
      composition.set('TITANIUM', Math.random() * 0.1);
    }
    if (Math.random() > 0.85) {
      composition.set('PLATINUM', Math.random() * 0.05);
    }
    if (Math.random() > 0.95) {
      composition.set('RARE_EARTHS', Math.random() * 0.02);
    }
    if (Math.random() > 0.99) {
      composition.set('EXOTIC_MATTER', Math.random() * 0.001);
    }

    // Calculate value
    let value = 0;
    for (const [ore, percentage] of composition) {
      const oreValue = MiningSystem.ORE_VALUES.get(ore) || 0;
      value += (mass * percentage) * oreValue;
    }

    return {
      id,
      position,
      mass,
      composition,
      value,
      depleted: false,
      discovered: false
    };
  }

  private extractOre(amount: number, efficiency: number): MiningYield | null {
    if (!this.currentTarget) return null;

    // Random ore type based on composition
    const roll = Math.random();
    let cumulative = 0;

    for (const [oreType, percentage] of this.currentTarget.composition) {
      cumulative += percentage;
      if (roll < cumulative) {
        const actualYield = amount * efficiency;
        const purity = 0.5 + Math.random() * 0.5; // 50-100% purity
        const value = (MiningSystem.ORE_VALUES.get(oreType) || 0) * actualYield * purity;

        return {
          oreType,
          quantity: actualYield,
          value,
          purity
        };
      }
    }

    return null;
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
