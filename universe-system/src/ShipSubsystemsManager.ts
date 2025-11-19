/**
 * ShipSubsystemsManager - Detailed ship subsystems that can be damaged
 * Engines, life support, sensors, weapons, shields, power, cargo, comms all modeled
 */

import { Spacecraft } from '../physics-modules/src/spacecraft';
import { UniverseOrchestrator } from './UniverseOrchestrator';

export type SubsystemType =
  | 'ENGINES'
  | 'LIFE_SUPPORT'
  | 'SENSORS'
  | 'WEAPONS'
  | 'SHIELDS'
  | 'POWER'
  | 'CARGO_HOLD'
  | 'COMMUNICATIONS'
  | 'JUMP_DRIVE'
  | 'RCS_THRUSTERS'
  | 'COMPUTER'
  | 'HELM';

export interface Subsystem {
  type: SubsystemType;
  name: string;

  // Health
  integrity: number; // 0-1
  maxIntegrity: number;
  damaged: boolean; // Below 50%
  offline: boolean; // Below 10%

  // Performance
  efficiency: number; // 0-1, affected by damage
  powerDraw: number; // kW
  heatGeneration: number; // per second

  // Status
  online: boolean;
  degradation: number; // Wear and tear 0-1

  // Repair
  repairCost: number; // credits
  repairTime: number; // seconds
  canRepairInSpace: boolean;
}

export interface SubsystemDamage {
  subsystem: SubsystemType;
  damageAmount: number;
  newIntegrity: number;
  wentOffline: boolean;
  effects: string[];
}

export interface SystemsReport {
  overall: number; // 0-1
  damagedSystems: SubsystemType[];
  offlineSystems: SubsystemType[];
  criticalSystems: SubsystemType[];
  totalRepairCost: number;
  estimatedRepairTime: number;
}

export class ShipSubsystemsManager {
  private spacecraft: Spacecraft;
  private orchestrator: UniverseOrchestrator;

  private subsystems: Map<SubsystemType, Subsystem> = new Map();

  constructor(spacecraft: Spacecraft, orchestrator: UniverseOrchestrator) {
    this.spacecraft = spacecraft;
    this.orchestrator = orchestrator;

    this.initializeSubsystems();
  }

  /**
   * Initialize all ship subsystems
   */
  private initializeSubsystems(): void {
    const systems: Array<{
      type: SubsystemType;
      name: string;
      powerDraw: number;
      heatGen: number;
      repairCost: number;
      repairTime: number;
      canRepairInSpace: boolean;
    }> = [
      {
        type: 'ENGINES',
        name: 'Main Engines',
        powerDraw: 0,
        heatGen: 5,
        repairCost: 5000,
        repairTime: 3600,
        canRepairInSpace: false
      },
      {
        type: 'LIFE_SUPPORT',
        name: 'Life Support',
        powerDraw: 2,
        heatGen: 0.5,
        repairCost: 3000,
        repairTime: 1800,
        canRepairInSpace: true
      },
      {
        type: 'SENSORS',
        name: 'Sensor Array',
        powerDraw: 1,
        heatGen: 0.2,
        repairCost: 2000,
        repairTime: 900,
        canRepairInSpace: true
      },
      {
        type: 'WEAPONS',
        name: 'Weapon Systems',
        powerDraw: 5,
        heatGen: 2,
        repairCost: 4000,
        repairTime: 2400,
        canRepairInSpace: true
      },
      {
        type: 'SHIELDS',
        name: 'Shield Generator',
        powerDraw: 3,
        heatGen: 1,
        repairCost: 3500,
        repairTime: 1800,
        canRepairInSpace: false
      },
      {
        type: 'POWER',
        name: 'Power Plant',
        powerDraw: 0,
        heatGen: 3,
        repairCost: 8000,
        repairTime: 5400,
        canRepairInSpace: false
      },
      {
        type: 'CARGO_HOLD',
        name: 'Cargo Hold',
        powerDraw: 0.1,
        heatGen: 0,
        repairCost: 1500,
        repairTime: 600,
        canRepairInSpace: true
      },
      {
        type: 'COMMUNICATIONS',
        name: 'Communications',
        powerDraw: 0.5,
        heatGen: 0.1,
        repairCost: 1000,
        repairTime: 600,
        canRepairInSpace: true
      },
      {
        type: 'JUMP_DRIVE',
        name: 'Jump Drive',
        powerDraw: 10,
        heatGen: 4,
        repairCost: 10000,
        repairTime: 7200,
        canRepairInSpace: false
      },
      {
        type: 'RCS_THRUSTERS',
        name: 'RCS Thrusters',
        powerDraw: 0,
        heatGen: 0.5,
        repairCost: 2500,
        repairTime: 1200,
        canRepairInSpace: false
      },
      {
        type: 'COMPUTER',
        name: 'Flight Computer',
        powerDraw: 1.5,
        heatGen: 0.5,
        repairCost: 2000,
        repairTime: 900,
        canRepairInSpace: true
      },
      {
        type: 'HELM',
        name: 'Helm Control',
        powerDraw: 0.5,
        heatGen: 0.1,
        repairCost: 1500,
        repairTime: 600,
        canRepairInSpace: true
      }
    ];

    for (const sys of systems) {
      this.subsystems.set(sys.type, {
        type: sys.type,
        name: sys.name,
        integrity: 1.0,
        maxIntegrity: 1.0,
        damaged: false,
        offline: false,
        efficiency: 1.0,
        powerDraw: sys.powerDraw,
        heatGeneration: sys.heatGen,
        online: true,
        degradation: 0,
        repairCost: sys.repairCost,
        repairTime: sys.repairTime,
        canRepairInSpace: sys.canRepairInSpace
      });
    }
  }

  /**
   * Update subsystems
   */
  public update(deltaTime: number): void {
    for (const subsystem of this.subsystems.values()) {
      // Natural degradation over time
      if (subsystem.online) {
        subsystem.degradation += deltaTime * 0.00001; // Very slow degradation

        if (subsystem.degradation > 0.2) {
          subsystem.efficiency = 1 - subsystem.degradation;
        }
      }

      // Update status based on integrity
      subsystem.damaged = subsystem.integrity < 0.5;
      subsystem.offline = subsystem.integrity < 0.1;

      if (subsystem.offline && subsystem.online) {
        subsystem.online = false;
        console.log(`[SYSTEMS] ⚠ ${subsystem.name} OFFLINE!`);
        this.handleSystemOffline(subsystem.type);
      }

      // Efficiency based on integrity
      subsystem.efficiency = Math.max(0, subsystem.integrity);
    }
  }

  /**
   * Damage a subsystem
   */
  public damageSubsystem(type: SubsystemType, amount: number): SubsystemDamage | null {
    const subsystem = this.subsystems.get(type);

    if (!subsystem) return null;

    const oldIntegrity = subsystem.integrity;
    subsystem.integrity = Math.max(0, subsystem.integrity - amount);

    const effects: string[] = [];
    let wentOffline = false;

    if (subsystem.integrity <= 0) {
      subsystem.integrity = 0;
      subsystem.offline = true;
      subsystem.online = false;
      wentOffline = true;
      effects.push(`${subsystem.name} DESTROYED`);
    } else if (subsystem.integrity < 0.1 && oldIntegrity >= 0.1) {
      subsystem.offline = true;
      subsystem.online = false;
      wentOffline = true;
      effects.push(`${subsystem.name} offline`);
    } else if (subsystem.integrity < 0.5 && oldIntegrity >= 0.5) {
      subsystem.damaged = true;
      effects.push(`${subsystem.name} damaged - reduced efficiency`);
    }

    // Record event
    this.orchestrator.recordEvent({
      id: `subsystem_damage_${type}_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: 'SUBSYSTEM_DAMAGE' as any,
      category: 'TECHNICAL' as any,
      severity: wentOffline ? 8 : 5,
      location: this.spacecraft.position,
      participants: ['player_ship'],
      description: `${subsystem.name} damaged (${(subsystem.integrity * 100).toFixed(0)}% integrity)`,
      data: { subsystem: type, damage: amount, integrity: subsystem.integrity },
      consequences: [],
      witnessed: true,
      priority: wentOffline ? 9 : 6,
      tags: ['damage', 'subsystem']
    });

    console.log(`[SYSTEMS] ${subsystem.name} took ${(amount * 100).toFixed(0)}% damage (now ${(subsystem.integrity * 100).toFixed(0)}%)`);
    for (const effect of effects) {
      console.log(`  ${effect}`);
    }

    return {
      subsystem: type,
      damageAmount: amount,
      newIntegrity: subsystem.integrity,
      wentOffline,
      effects
    };
  }

  /**
   * Repair subsystem
   */
  public repairSubsystem(type: SubsystemType, amount: number = 1.0): {
    success: boolean;
    message: string;
    cost: number;
  } {
    const subsystem = this.subsystems.get(type);

    if (!subsystem) {
      return {
        success: false,
        message: 'Subsystem not found',
        cost: 0
      };
    }

    if (subsystem.integrity >= 1.0) {
      return {
        success: false,
        message: `${subsystem.name} is already fully operational`,
        cost: 0
      };
    }

    const repairAmount = Math.min(amount, 1.0 - subsystem.integrity);
    const cost = subsystem.repairCost * repairAmount;

    subsystem.integrity = Math.min(1.0, subsystem.integrity + repairAmount);
    subsystem.damaged = subsystem.integrity < 0.5;
    subsystem.offline = subsystem.integrity < 0.1;

    if (subsystem.integrity >= 0.1) {
      subsystem.online = true;
    }

    console.log(`[SYSTEMS] Repaired ${subsystem.name} to ${(subsystem.integrity * 100).toFixed(0)}% (cost: ${cost.toFixed(0)} credits)`);

    return {
      success: true,
      message: `${subsystem.name} repaired to ${(subsystem.integrity * 100).toFixed(0)}%`,
      cost
    };
  }

  /**
   * Get subsystem status
   */
  public getSubsystem(type: SubsystemType): Subsystem | null {
    return this.subsystems.get(type) || null;
  }

  /**
   * Get all subsystems
   */
  public getAllSubsystems(): Subsystem[] {
    return Array.from(this.subsystems.values());
  }

  /**
   * Get systems report
   */
  public getSystemsReport(): SystemsReport {
    const damagedSystems: SubsystemType[] = [];
    const offlineSystems: SubsystemType[] = [];
    const criticalSystems: SubsystemType[] = [];
    let totalIntegrity = 0;
    let totalRepairCost = 0;
    let totalRepairTime = 0;

    for (const subsystem of this.subsystems.values()) {
      totalIntegrity += subsystem.integrity;

      if (subsystem.offline) {
        offlineSystems.push(subsystem.type);
        criticalSystems.push(subsystem.type);
      } else if (subsystem.damaged) {
        damagedSystems.push(subsystem.type);

        // Critical if below 30%
        if (subsystem.integrity < 0.3) {
          criticalSystems.push(subsystem.type);
        }
      }

      if (subsystem.integrity < 1.0) {
        const repairNeeded = 1.0 - subsystem.integrity;
        totalRepairCost += subsystem.repairCost * repairNeeded;
        totalRepairTime += subsystem.repairTime * repairNeeded;
      }
    }

    const overall = totalIntegrity / this.subsystems.size;

    return {
      overall,
      damagedSystems,
      offlineSystems,
      criticalSystems,
      totalRepairCost,
      estimatedRepairTime: totalRepairTime
    };
  }

  /**
   * Get systems status string
   */
  public getSystemsStatus(): string {
    const lines: string[] = [];
    const report = this.getSystemsReport();

    lines.push('=== SHIP SYSTEMS ===');
    lines.push(`Overall Integrity: ${(report.overall * 100).toFixed(0)}%`);
    lines.push('');

    // Group by status
    const operational: Subsystem[] = [];
    const damaged: Subsystem[] = [];
    const offline: Subsystem[] = [];

    for (const subsystem of this.subsystems.values()) {
      if (subsystem.offline) {
        offline.push(subsystem);
      } else if (subsystem.damaged) {
        damaged.push(subsystem);
      } else {
        operational.push(subsystem);
      }
    }

    if (offline.length > 0) {
      lines.push('⛔ OFFLINE:');
      for (const sys of offline) {
        lines.push(`  ${sys.name}: ${(sys.integrity * 100).toFixed(0)}%`);
      }
      lines.push('');
    }

    if (damaged.length > 0) {
      lines.push('⚠ DAMAGED:');
      for (const sys of damaged) {
        const eff = (sys.efficiency * 100).toFixed(0);
        lines.push(`  ${sys.name}: ${(sys.integrity * 100).toFixed(0)}% (${eff}% efficiency)`);
      }
      lines.push('');
    }

    if (operational.length > 0) {
      lines.push('✓ OPERATIONAL:');
      for (const sys of operational.slice(0, 5)) {
        lines.push(`  ${sys.name}: ${(sys.integrity * 100).toFixed(0)}%`);
      }
      if (operational.length > 5) {
        lines.push(`  ... and ${operational.length - 5} more`);
      }
      lines.push('');
    }

    if (report.totalRepairCost > 0) {
      lines.push(`Repair Cost: ${report.totalRepairCost.toFixed(0)} credits`);
      lines.push(`Repair Time: ${this.formatTime(report.estimatedRepairTime)}`);
    }

    return lines.join('\n');
  }

  /**
   * Can use subsystem?
   */
  public canUseSubsystem(type: SubsystemType): boolean {
    const subsystem = this.subsystems.get(type);
    return subsystem ? subsystem.online && !subsystem.offline : false;
  }

  /**
   * Get subsystem efficiency
   */
  public getSubsystemEfficiency(type: SubsystemType): number {
    const subsystem = this.subsystems.get(type);
    return subsystem ? subsystem.efficiency : 0;
  }

  /**
   * Random subsystem damage (from combat, accidents)
   */
  public damageRandomSubsystem(severity: number = 0.1): SubsystemDamage | null {
    const systems = Array.from(this.subsystems.values());
    const randomSystem = systems[Math.floor(Math.random() * systems.length)];

    return this.damageSubsystem(randomSystem.type, severity);
  }

  // Private methods
  private handleSystemOffline(type: SubsystemType): void {
    switch (type) {
      case 'ENGINES':
        console.log('[SYSTEMS] ⚠ Cannot thrust! Engines offline!');
        break;
      case 'LIFE_SUPPORT':
        console.log('[SYSTEMS] ⚠⚠⚠ LIFE SUPPORT FAILURE! Oxygen depleting rapidly!');
        break;
      case 'WEAPONS':
        console.log('[SYSTEMS] ⚠ Weapons offline! Cannot fire!');
        break;
      case 'SHIELDS':
        console.log('[SYSTEMS] ⚠ Shields down!');
        break;
      case 'JUMP_DRIVE':
        console.log('[SYSTEMS] ⚠ Jump drive offline! Cannot jump!');
        break;
      case 'SENSORS':
        console.log('[SYSTEMS] ⚠ Sensors offline! Flying blind!');
        break;
      case 'COMMUNICATIONS':
        console.log('[SYSTEMS] ⚠ Communications offline! Cannot send/receive messages!');
        break;
    }
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
