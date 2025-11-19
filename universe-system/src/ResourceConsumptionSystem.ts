/**
 * ResourceConsumptionSystem - Fuel and life support consumption
 * Makes survival a concern - need to manage fuel, oxygen, food, water
 */

import { Spacecraft } from '../physics-modules/src/spacecraft';
import { UniverseOrchestrator } from './UniverseOrchestrator';

export interface ResourceLevels {
  // Fuel
  fuelMain: number; // kg
  fuelMainCapacity: number;
  fuelRCS: number; // kg
  fuelRCSCapacity: number;

  // Life Support
  oxygen: number; // hours remaining
  oxygenCapacity: number;
  food: number; // meals remaining
  foodCapacity: number;
  water: number; // liters
  waterCapacity: number;

  // Power
  power: number; // kWh
  powerCapacity: number;
  powerGeneration: number; // kW

  // Status
  criticalResources: string[]; // Resources below 20%
  emergencyLevel: number; // 0-10
}

export interface ConsumptionRates {
  // Base rates per second
  fuelMainIdle: number;
  fuelMainThrust: number;
  fuelRCSRotation: number;

  oxygenPerCrew: number; // hours per crew per hour
  foodPerCrew: number; // meals per crew per day
  waterPerCrew: number; // liters per crew per day

  powerIdle: number; // kW
  powerLifeSupport: number; // kW
  powerSensors: number; // kW
  powerWeapons: number; // kW
  powerShields: number; // kW
}

export interface ResourceWarning {
  resource: string;
  level: number; // 0-1
  timeRemaining: number | null; // seconds, null if not depleting
  severity: 'CRITICAL' | 'WARNING' | 'LOW';
  message: string;
}

export class ResourceConsumptionSystem {
  private spacecraft: Spacecraft;
  private orchestrator: UniverseOrchestrator;

  private resources: ResourceLevels;
  private rates: ConsumptionRates;

  private crewCount: number = 1;
  private systemsActive: Set<string> = new Set(['LIFE_SUPPORT', 'SENSORS']);

  private warnings: ResourceWarning[] = [];
  private lastWarningTime: Map<string, number> = new Map();

  constructor(spacecraft: Spacecraft, orchestrator: UniverseOrchestrator) {
    this.spacecraft = spacecraft;
    this.orchestrator = orchestrator;

    // Initialize resources
    this.resources = {
      fuelMain: 1000,
      fuelMainCapacity: 1000,
      fuelRCS: 100,
      fuelRCSCapacity: 100,

      oxygen: 48, // 48 hours
      oxygenCapacity: 48,
      food: 30, // 30 meals
      foodCapacity: 30,
      water: 100, // 100 liters
      waterCapacity: 100,

      power: 100,
      powerCapacity: 100,
      powerGeneration: 10, // 10 kW generation

      criticalResources: [],
      emergencyLevel: 0
    };

    // Consumption rates
    this.rates = {
      fuelMainIdle: 0.01, // kg/s
      fuelMainThrust: 1.0, // kg/s at full throttle
      fuelRCSRotation: 0.05, // kg/s when rotating

      oxygenPerCrew: 1.0, // 1 hour per crew per hour
      foodPerCrew: 3, // 3 meals per crew per day
      waterPerCrew: 3, // 3 liters per crew per day

      powerIdle: 1, // 1 kW idle
      powerLifeSupport: 2, // 2 kW life support
      powerSensors: 1, // 1 kW sensors
      powerWeapons: 5, // 5 kW weapons
      powerShields: 3 // 3 kW shields
    };
  }

  /**
   * Update resource consumption
   */
  public update(deltaTime: number, throttle: number = 0, rotating: boolean = false): void {
    const dt = deltaTime;

    // Fuel consumption
    this.consumeFuel(dt, throttle, rotating);

    // Life support consumption
    this.consumeLifeSupport(dt);

    // Power consumption/generation
    this.updatePower(dt);

    // Check for warnings
    this.checkWarnings();

    // Update emergency level
    this.updateEmergencyLevel();
  }

  /**
   * Get resource levels
   */
  public getResourceLevels(): ResourceLevels {
    return { ...this.resources };
  }

  /**
   * Get active warnings
   */
  public getWarnings(): ResourceWarning[] {
    return [...this.warnings];
  }

  /**
   * Get resource status string
   */
  public getResourceStatus(): string {
    const lines: string[] = [];

    lines.push('=== RESOURCE STATUS ===');
    lines.push('');

    // Fuel
    const fuelPercent = (this.resources.fuelMain / this.resources.fuelMainCapacity) * 100;
    lines.push(`Fuel (Main): ${this.resources.fuelMain.toFixed(0)}/${this.resources.fuelMainCapacity} kg (${fuelPercent.toFixed(0)}%)`);
    lines.push(`Fuel (RCS): ${this.resources.fuelRCS.toFixed(0)}/${this.resources.fuelRCSCapacity} kg`);
    lines.push('');

    // Life Support
    lines.push('Life Support:');
    lines.push(`  Oxygen: ${this.resources.oxygen.toFixed(1)}/${this.resources.oxygenCapacity} hours`);
    lines.push(`  Food: ${this.resources.food.toFixed(0)}/${this.resources.foodCapacity} meals`);
    lines.push(`  Water: ${this.resources.water.toFixed(1)}/${this.resources.waterCapacity} liters`);
    lines.push('');

    // Power
    const powerPercent = (this.resources.power / this.resources.powerCapacity) * 100;
    lines.push(`Power: ${this.resources.power.toFixed(1)}/${this.resources.powerCapacity} kWh (${powerPercent.toFixed(0)}%)`);
    lines.push(`Generation: ${this.resources.powerGeneration} kW`);
    lines.push('');

    // Warnings
    if (this.warnings.length > 0) {
      lines.push('⚠ WARNINGS:');
      for (const warning of this.warnings) {
        lines.push(`  ${warning.severity}: ${warning.message}`);
        if (warning.timeRemaining !== null) {
          lines.push(`    Time remaining: ${this.formatTime(warning.timeRemaining)}`);
        }
      }
      lines.push('');
    }

    // Emergency level
    if (this.resources.emergencyLevel > 0) {
      lines.push(`EMERGENCY LEVEL: ${this.resources.emergencyLevel}/10`);
    }

    return lines.join('\n');
  }

  /**
   * Refill resource
   */
  public refillResource(resource: string, amount: number): void {
    switch (resource) {
      case 'FUEL_MAIN':
        this.resources.fuelMain = Math.min(
          this.resources.fuelMainCapacity,
          this.resources.fuelMain + amount
        );
        break;
      case 'FUEL_RCS':
        this.resources.fuelRCS = Math.min(
          this.resources.fuelRCSCapacity,
          this.resources.fuelRCS + amount
        );
        break;
      case 'OXYGEN':
        this.resources.oxygen = Math.min(
          this.resources.oxygenCapacity,
          this.resources.oxygen + amount
        );
        break;
      case 'FOOD':
        this.resources.food = Math.min(
          this.resources.foodCapacity,
          this.resources.food + amount
        );
        break;
      case 'WATER':
        this.resources.water = Math.min(
          this.resources.waterCapacity,
          this.resources.water + amount
        );
        break;
      case 'POWER':
        this.resources.power = Math.min(
          this.resources.powerCapacity,
          this.resources.power + amount
        );
        break;
    }
  }

  /**
   * Set crew count
   */
  public setCrewCount(count: number): void {
    this.crewCount = Math.max(0, count);
  }

  /**
   * Toggle system
   */
  public toggleSystem(system: string, active: boolean): void {
    if (active) {
      this.systemsActive.add(system);
    } else {
      this.systemsActive.delete(system);
    }
  }

  /**
   * Check if can afford resource cost
   */
  public canAffordCost(resource: string, amount: number): boolean {
    switch (resource) {
      case 'FUEL_MAIN':
        return this.resources.fuelMain >= amount;
      case 'POWER':
        return this.resources.power >= amount;
      default:
        return true;
    }
  }

  // Private methods
  private consumeFuel(dt: number, throttle: number, rotating: boolean): void {
    // Main fuel consumption
    let fuelRate = this.rates.fuelMainIdle;

    if (throttle > 0) {
      fuelRate += this.rates.fuelMainThrust * throttle;
    }

    this.resources.fuelMain = Math.max(0, this.resources.fuelMain - fuelRate * dt);

    // RCS fuel
    if (rotating) {
      this.resources.fuelRCS = Math.max(
        0,
        this.resources.fuelRCS - this.rates.fuelRCSRotation * dt
      );
    }

    // Check if out of fuel
    if (this.resources.fuelMain <= 0) {
      // Can't thrust
      this.issueWarning('FUEL_MAIN', 0, null, 'CRITICAL', 'Out of fuel!');
    }
  }

  private consumeLifeSupport(dt: number): void {
    if (!this.systemsActive.has('LIFE_SUPPORT')) {
      // Life support offline - critical!
      this.issueWarning('LIFE_SUPPORT', 0, 3600, 'CRITICAL', 'Life support OFFLINE! Oxygen depleting rapidly!');
      this.resources.oxygen -= (dt / 3600) * this.crewCount * 10; // 10x consumption rate
    } else {
      // Normal consumption
      this.resources.oxygen -= (dt / 3600) * this.crewCount * this.rates.oxygenPerCrew;
    }

    // Food consumption (meals per day)
    this.resources.food -= (dt / 86400) * this.crewCount * this.rates.foodPerCrew;

    // Water consumption
    this.resources.water -= (dt / 86400) * this.crewCount * this.rates.waterPerCrew;

    // Clamp to zero
    this.resources.oxygen = Math.max(0, this.resources.oxygen);
    this.resources.food = Math.max(0, this.resources.food);
    this.resources.water = Math.max(0, this.resources.water);

    // Death conditions
    if (this.resources.oxygen <= 0) {
      this.handleCrewDeath('oxygen deprivation');
    }
    if (this.resources.water <= 0) {
      this.handleCrewDeath('dehydration');
    }
  }

  private updatePower(dt: number): void {
    // Power generation
    const generated = this.resources.powerGeneration * (dt / 3600);

    // Power consumption
    let consumed = this.rates.powerIdle * (dt / 3600);

    if (this.systemsActive.has('LIFE_SUPPORT')) {
      consumed += this.rates.powerLifeSupport * (dt / 3600);
    }

    if (this.systemsActive.has('SENSORS')) {
      consumed += this.rates.powerSensors * (dt / 3600);
    }

    if (this.systemsActive.has('WEAPONS')) {
      consumed += this.rates.powerWeapons * (dt / 3600);
    }

    if (this.systemsActive.has('SHIELDS')) {
      consumed += this.rates.powerShields * (dt / 3600);
    }

    // Net power
    const net = generated - consumed;
    this.resources.power = Math.max(
      0,
      Math.min(this.resources.powerCapacity, this.resources.power + net)
    );

    // Auto-shutdown systems if out of power
    if (this.resources.power <= 0) {
      // Critical systems stay on, others shut down
      this.systemsActive.delete('WEAPONS');
      this.systemsActive.delete('SHIELDS');

      if (this.resources.power < -10) {
        this.systemsActive.delete('SENSORS');
      }

      if (this.resources.power < -20) {
        this.systemsActive.delete('LIFE_SUPPORT');
      }
    }
  }

  private checkWarnings(): void {
    this.warnings = [];
    this.resources.criticalResources = [];

    // Fuel
    const fuelPercent = this.resources.fuelMain / this.resources.fuelMainCapacity;
    if (fuelPercent <= 0.05) {
      this.resources.criticalResources.push('FUEL_MAIN');
      this.issueWarning('FUEL_MAIN', fuelPercent, null, 'CRITICAL', 'Fuel critically low!');
    } else if (fuelPercent <= 0.2) {
      this.issueWarning('FUEL_MAIN', fuelPercent, null, 'WARNING', 'Fuel low');
    }

    // Oxygen
    if (this.resources.oxygen <= 2) {
      this.resources.criticalResources.push('OXYGEN');
      this.issueWarning('OXYGEN', this.resources.oxygen / this.resources.oxygenCapacity, this.resources.oxygen * 3600, 'CRITICAL', 'Oxygen critical!');
    } else if (this.resources.oxygen <= 12) {
      this.issueWarning('OXYGEN', this.resources.oxygen / this.resources.oxygenCapacity, this.resources.oxygen * 3600, 'WARNING', 'Oxygen low');
    }

    // Food
    if (this.resources.food <= 3) {
      this.resources.criticalResources.push('FOOD');
      this.issueWarning('FOOD', this.resources.food / this.resources.foodCapacity, null, 'WARNING', 'Food supplies low');
    }

    // Water
    if (this.resources.water <= 5) {
      this.resources.criticalResources.push('WATER');
      this.issueWarning('WATER', this.resources.water / this.resources.waterCapacity, null, 'WARNING', 'Water supplies low');
    }

    // Power
    const powerPercent = this.resources.power / this.resources.powerCapacity;
    if (powerPercent <= 0.1) {
      this.resources.criticalResources.push('POWER');
      this.issueWarning('POWER', powerPercent, null, 'CRITICAL', 'Power critical!');
    } else if (powerPercent <= 0.3) {
      this.issueWarning('POWER', powerPercent, null, 'WARNING', 'Power low');
    }
  }

  private issueWarning(
    resource: string,
    level: number,
    timeRemaining: number | null,
    severity: ResourceWarning['severity'],
    message: string
  ): void {
    const warning: ResourceWarning = {
      resource,
      level,
      timeRemaining,
      severity,
      message
    };

    this.warnings.push(warning);

    // Don't spam warnings - max once per 60 seconds for same resource
    const now = Date.now() / 1000;
    const lastWarning = this.lastWarningTime.get(resource) || 0;

    if (severity === 'CRITICAL' && now - lastWarning > 60) {
      console.log(`[RESOURCES] ${severity}: ${message}`);
      this.lastWarningTime.set(resource, now);

      // Record event
      this.orchestrator.recordEvent({
        id: `resource_warning_${resource}_${Date.now()}`,
        timestamp: now,
        type: 'RESOURCE_WARNING' as any,
        category: 'EMERGENCY' as any,
        severity: severity === 'CRITICAL' ? 9 : 5,
        location: this.spacecraft.position,
        participants: ['player_ship'],
        description: message,
        data: { resource, level, timeRemaining },
        consequences: [],
        witnessed: true,
        priority: severity === 'CRITICAL' ? 10 : 6,
        tags: ['resources', 'survival']
      });
    }
  }

  private updateEmergencyLevel(): void {
    let level = 0;

    // Count critical resources
    level += this.resources.criticalResources.length * 2;

    // Immediate death conditions
    if (this.resources.oxygen <= 0.5) level += 5;
    if (this.resources.water <= 0.5) level += 3;
    if (!this.systemsActive.has('LIFE_SUPPORT')) level += 4;

    this.resources.emergencyLevel = Math.min(10, level);
  }

  private handleCrewDeath(cause: string): void {
    console.log(`[RESOURCES] CREW DEATH: ${cause}`);
    console.log('Game Over');

    this.orchestrator.recordEvent({
      id: `crew_death_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: 'CREW_DEATH' as any,
      category: 'EMERGENCY' as any,
      severity: 10,
      location: this.spacecraft.position,
      participants: ['player_ship'],
      description: `Crew died from ${cause}`,
      data: { cause },
      consequences: [],
      witnessed: true,
      priority: 10,
      tags: ['death', 'survival', 'game_over']
    });

    // Would handle game over, respawn, etc.
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m`;
    } else {
      return `${(seconds / 3600).toFixed(1)}h`;
    }
  }
}
