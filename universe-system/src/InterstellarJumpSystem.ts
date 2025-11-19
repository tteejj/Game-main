/**
 * InterstellarJumpSystem - FTL travel between star systems
 * Handles jump calculations, fuel requirements, jump sickness, misjumps, interdiction
 */

import { Vector3 } from './CelestialBody';
import { StarSystem } from './StarSystem';
import { UniverseOrchestrator } from './UniverseOrchestrator';
import { Spacecraft } from '../physics-modules/src/spacecraft';

export type JumpDriveType = 'STANDARD' | 'MILITARY' | 'EXPERIMENTAL';

export interface JumpDrive {
  id: string;
  name: string;
  type: JumpDriveType;

  // Capabilities
  maxJumpRange: number; // light years
  fuelEfficiency: number; // 0-1, higher is better
  chargeTime: number; // seconds
  cooldownTime: number; // seconds

  // Safety
  misjumpChance: number; // 0-1, lower is better
  interdictionResistance: number; // 0-1

  // State
  charged: boolean;
  charging: boolean;
  chargeProgress: number; // 0-1
  cooldownRemaining: number; // seconds
  lastJumpTime: number;
  totalJumps: number;

  // Condition
  condition: number; // 0-1, degrades with use
  requiresMaintenance: boolean;
}

export interface JumpRoute {
  fromSystem: StarSystem;
  toSystem: StarSystem;
  distance: number; // light years
  fuelRequired: number; // kg
  jumpTime: number; // seconds
  safetyRating: number; // 0-1
  hazards: string[];
  waypoints?: StarSystem[]; // For multi-jump routes
}

export interface JumpCalculation {
  canJump: boolean;
  route: JumpRoute | null;
  reasons: string[];
  warnings: string[];
  fuelCheck: boolean;
  rangeCheck: boolean;
  readyCheck: boolean;
}

export interface JumpResult {
  success: boolean;
  arrived: boolean;
  arrivalSystem: StarSystem;
  arrivalPosition: Vector3;

  // Jump effects
  fuelConsumed: number;
  jumpTime: number;
  misjumped: boolean;
  misjumpDistance?: number; // How far off course
  interdicted: boolean;

  // Consequences
  driveConditionLoss: number;
  crewJumpSickness: boolean;
  systemDamage?: string[]; // Systems damaged in misjump

  message: string;
}

export class InterstellarJumpSystem {
  private orchestrator: UniverseOrchestrator;
  private spacecraft: Spacecraft;
  private jumpDrive: JumpDrive;

  private currentSystem: StarSystem | null = null;
  private availableSystems: Map<string, StarSystem> = new Map();

  // Jump constants
  private readonly FUEL_PER_LY = 50; // kg per light year
  private readonly LIGHT_YEAR = 9.461e15; // meters

  constructor(orchestrator: UniverseOrchestrator, spacecraft: Spacecraft) {
    this.orchestrator = orchestrator;
    this.spacecraft = spacecraft;

    // Initialize with standard jump drive
    this.jumpDrive = {
      id: 'jump_drive_1',
      name: 'Standard Jump Drive',
      type: 'STANDARD',
      maxJumpRange: 20,
      fuelEfficiency: 0.7,
      chargeTime: 30,
      cooldownTime: 60,
      misjumpChance: 0.05,
      interdictionResistance: 0.5,
      charged: false,
      charging: false,
      chargeProgress: 0,
      cooldownRemaining: 0,
      lastJumpTime: 0,
      totalJumps: 0,
      condition: 1.0,
      requiresMaintenance: false
    };
  }

  /**
   * Set available systems for jumping
   */
  public setAvailableSystems(systems: Map<string, StarSystem>): void {
    this.availableSystems = systems;
  }

  /**
   * Set current system
   */
  public setCurrentSystem(system: StarSystem): void {
    this.currentSystem = system;
  }

  /**
   * Update jump drive state
   */
  public update(deltaTime: number): void {
    // Cooldown
    if (this.jumpDrive.cooldownRemaining > 0) {
      this.jumpDrive.cooldownRemaining = Math.max(0, this.jumpDrive.cooldownRemaining - deltaTime);
    }

    // Charging
    if (this.jumpDrive.charging) {
      this.jumpDrive.chargeProgress += deltaTime / this.jumpDrive.chargeTime;

      if (this.jumpDrive.chargeProgress >= 1.0) {
        this.jumpDrive.chargeProgress = 1.0;
        this.jumpDrive.charged = true;
        this.jumpDrive.charging = false;
        console.log('[JUMP] Jump drive fully charged! Ready to jump.');
      }
    }
  }

  /**
   * Calculate jump route to target system
   */
  public calculateJumpRoute(targetSystemId: string): JumpRoute | null {
    if (!this.currentSystem) {
      console.log('[JUMP] No current system set');
      return null;
    }

    const targetSystem = this.availableSystems.get(targetSystemId);
    if (!targetSystem) {
      console.log('[JUMP] Target system not found');
      return null;
    }

    // Calculate distance
    const dx = targetSystem.position.x - this.currentSystem.position.x;
    const dy = targetSystem.position.y - this.currentSystem.position.y;
    const dz = targetSystem.position.z - this.currentSystem.position.z;
    const distanceMeters = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const distanceLY = distanceMeters / this.LIGHT_YEAR;

    // Calculate fuel required
    const baseFuel = distanceLY * this.FUEL_PER_LY;
    const fuelRequired = baseFuel / this.jumpDrive.fuelEfficiency;

    // Jump time (longer for farther jumps)
    const jumpTime = 10 + distanceLY * 2; // Base 10s + 2s per LY

    // Safety rating based on distance and drive condition
    let safetyRating = 1.0;
    safetyRating -= (distanceLY / this.jumpDrive.maxJumpRange) * 0.3; // Longer jumps less safe
    safetyRating -= (1 - this.jumpDrive.condition) * 0.4; // Poor condition less safe
    safetyRating = Math.max(0, Math.min(1, safetyRating));

    // Hazards
    const hazards: string[] = [];
    if (distanceLY > this.jumpDrive.maxJumpRange * 0.8) {
      hazards.push('Near maximum jump range');
    }
    if (this.jumpDrive.condition < 0.5) {
      hazards.push('Jump drive in poor condition');
    }
    if (safetyRating < 0.5) {
      hazards.push('High misjump risk');
    }

    // Check if multi-jump needed
    let waypoints: StarSystem[] | undefined;
    if (distanceLY > this.jumpDrive.maxJumpRange) {
      // Need intermediate jumps
      waypoints = this.calculateWaypoints(this.currentSystem, targetSystem);
      if (waypoints.length === 0) {
        console.log('[JUMP] No route available - target too far');
        return null;
      }
    }

    return {
      fromSystem: this.currentSystem,
      toSystem: targetSystem,
      distance: distanceLY,
      fuelRequired,
      jumpTime,
      safetyRating,
      hazards,
      waypoints
    };
  }

  /**
   * Check if can jump to target
   */
  public canJumpTo(targetSystemId: string, fuelAvailable: number): JumpCalculation {
    const route = this.calculateJumpRoute(targetSystemId);

    if (!route) {
      return {
        canJump: false,
        route: null,
        reasons: ['No route available'],
        warnings: [],
        fuelCheck: false,
        rangeCheck: false,
        readyCheck: false
      };
    }

    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check range
    const rangeCheck = route.distance <= this.jumpDrive.maxJumpRange;
    if (!rangeCheck) {
      reasons.push(`Target out of range: ${route.distance.toFixed(1)} LY (max: ${this.jumpDrive.maxJumpRange} LY)`);
    }

    // Check fuel
    const fuelCheck = fuelAvailable >= route.fuelRequired;
    if (!fuelCheck) {
      reasons.push(`Insufficient fuel: need ${route.fuelRequired.toFixed(0)} kg, have ${fuelAvailable.toFixed(0)} kg`);
    }

    // Check drive ready
    let readyCheck = true;
    if (this.jumpDrive.cooldownRemaining > 0) {
      reasons.push(`Jump drive cooling down: ${this.jumpDrive.cooldownRemaining.toFixed(0)}s remaining`);
      readyCheck = false;
    }
    if (!this.jumpDrive.charged) {
      reasons.push('Jump drive not charged');
      readyCheck = false;
    }
    if (this.jumpDrive.requiresMaintenance) {
      warnings.push('Jump drive requires maintenance - increased misjump risk');
    }

    // Warnings
    for (const hazard of route.hazards) {
      warnings.push(hazard);
    }

    const canJump = rangeCheck && fuelCheck && readyCheck;

    return {
      canJump,
      route,
      reasons,
      warnings,
      fuelCheck,
      rangeCheck,
      readyCheck
    };
  }

  /**
   * Initiate jump drive charging
   */
  public chargeJumpDrive(): boolean {
    if (this.jumpDrive.cooldownRemaining > 0) {
      console.log(`[JUMP] Cannot charge: cooling down (${this.jumpDrive.cooldownRemaining.toFixed(0)}s)`);
      return false;
    }

    if (this.jumpDrive.charged) {
      console.log('[JUMP] Jump drive already charged');
      return true;
    }

    this.jumpDrive.charging = true;
    this.jumpDrive.chargeProgress = 0;
    console.log(`[JUMP] Charging jump drive... (${this.jumpDrive.chargeTime}s)`);

    return true;
  }

  /**
   * Execute jump to target system
   */
  public executeJump(targetSystemId: string, fuelAvailable: number): JumpResult | null {
    const check = this.canJumpTo(targetSystemId, fuelAvailable);

    if (!check.canJump || !check.route) {
      console.log('[JUMP] Cannot execute jump:');
      for (const reason of check.reasons) {
        console.log(`  - ${reason}`);
      }
      return null;
    }

    const route = check.route;

    console.log(`[JUMP] Executing jump to ${route.toSystem.name}...`);
    console.log(`  Distance: ${route.distance.toFixed(1)} LY`);
    console.log(`  Fuel required: ${route.fuelRequired.toFixed(0)} kg`);
    console.log(`  Safety: ${(route.safetyRating * 100).toFixed(0)}%`);

    // Calculate misjump chance
    let misjumpChance = this.jumpDrive.misjumpChance;
    misjumpChance += (1 - route.safetyRating) * 0.1;
    misjumpChance += (1 - this.jumpDrive.condition) * 0.15;

    const misjumped = Math.random() < misjumpChance;

    // Calculate interdiction chance (random event)
    const interdictionChance = 0.02 * (1 - this.jumpDrive.interdictionResistance);
    const interdicted = Math.random() < interdictionChance;

    // Arrival position
    let arrivalSystem = route.toSystem;
    let arrivalPosition: Vector3 = {
      x: Math.random() * 100000 - 50000,
      y: Math.random() * 100000 - 50000,
      z: Math.random() * 100000 - 50000
    };

    let misjumpDistance: number | undefined;
    let systemDamage: string[] | undefined;

    if (misjumped) {
      console.log('[JUMP] ⚠ MISJUMP DETECTED!');

      // Misjump effects
      misjumpDistance = (Math.random() * 0.5 + 0.1) * route.distance; // 10-60% off course

      // Might arrive at wrong position in system
      arrivalPosition = {
        x: (Math.random() - 0.5) * 500000,
        y: (Math.random() - 0.5) * 500000,
        z: (Math.random() - 0.5) * 500000
      };

      // Possible system damage
      const damageRoll = Math.random();
      if (damageRoll < 0.3) {
        systemDamage = ['JUMP_DRIVE', 'NAVIGATION'];
        this.jumpDrive.condition -= 0.1;
      } else if (damageRoll < 0.6) {
        systemDamage = ['SENSORS'];
      }
    }

    if (interdicted) {
      console.log('[JUMP] ⚠ INTERDICTED! Hostile forces present at arrival point!');
    }

    // Consume fuel
    const fuelConsumed = route.fuelRequired;

    // Drive degradation
    const driveConditionLoss = 0.01 + (misjumped ? 0.05 : 0);
    this.jumpDrive.condition = Math.max(0, this.jumpDrive.condition - driveConditionLoss);

    if (this.jumpDrive.condition < 0.3) {
      this.jumpDrive.requiresMaintenance = true;
    }

    // Crew effects
    const crewJumpSickness = Math.random() < 0.1; // 10% chance

    // Update drive state
    this.jumpDrive.charged = false;
    this.jumpDrive.chargeProgress = 0;
    this.jumpDrive.cooldownRemaining = this.jumpDrive.cooldownTime;
    this.jumpDrive.lastJumpTime = Date.now() / 1000;
    this.jumpDrive.totalJumps++;

    // Update current system
    this.currentSystem = arrivalSystem;

    // Record event
    this.orchestrator.recordEvent({
      id: `jump_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: 'JUMP' as any,
      category: 'TRAVEL' as any,
      severity: misjumped ? 7 : 3,
      location: arrivalPosition,
      systemId: arrivalSystem.id,
      participants: ['player_ship'],
      description: misjumped
        ? `Misjumped to ${arrivalSystem.name} - ${misjumpDistance?.toFixed(1)} LY off course`
        : `Jumped to ${arrivalSystem.name}`,
      data: {
        fromSystem: route.fromSystem.id,
        toSystem: arrivalSystem.id,
        distance: route.distance,
        misjumped,
        interdicted,
        fuelConsumed
      },
      consequences: [],
      witnessed: true,
      priority: misjumped ? 7 : 4,
      tags: ['jump', 'travel', misjumped ? 'misjump' : 'success']
    });

    const result: JumpResult = {
      success: !misjumped,
      arrived: true,
      arrivalSystem,
      arrivalPosition,
      fuelConsumed,
      jumpTime: route.jumpTime,
      misjumped,
      misjumpDistance,
      interdicted,
      driveConditionLoss,
      crewJumpSickness,
      systemDamage,
      message: misjumped
        ? `MISJUMP! Arrived at ${arrivalSystem.name} off course. ${systemDamage ? 'Systems damaged!' : ''}`
        : `Successfully jumped to ${arrivalSystem.name}`
    };

    console.log(`[JUMP] ${result.message}`);

    return result;
  }

  /**
   * Get nearby systems within jump range
   */
  public getReachableSystems(): Array<{
    system: StarSystem;
    distance: number;
    fuelRequired: number;
  }> {
    if (!this.currentSystem) return [];

    const reachable: Array<{
      system: StarSystem;
      distance: number;
      fuelRequired: number;
    }> = [];

    for (const system of this.availableSystems.values()) {
      if (system.id === this.currentSystem.id) continue;

      const route = this.calculateJumpRoute(system.id);
      if (route && route.distance <= this.jumpDrive.maxJumpRange) {
        reachable.push({
          system,
          distance: route.distance,
          fuelRequired: route.fuelRequired
        });
      }
    }

    return reachable.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get jump drive status
   */
  public getJumpDriveStatus(): string {
    const lines: string[] = [];

    lines.push('=== JUMP DRIVE ===');
    lines.push(`${this.jumpDrive.name} (${this.jumpDrive.type})`);
    lines.push('');
    lines.push(`Range: ${this.jumpDrive.maxJumpRange} LY`);
    lines.push(`Condition: ${(this.jumpDrive.condition * 100).toFixed(0)}%`);
    lines.push(`Total Jumps: ${this.jumpDrive.totalJumps}`);
    lines.push('');

    if (this.jumpDrive.cooldownRemaining > 0) {
      lines.push(`Status: COOLING DOWN (${this.jumpDrive.cooldownRemaining.toFixed(0)}s)`);
    } else if (this.jumpDrive.charging) {
      lines.push(`Status: CHARGING (${(this.jumpDrive.chargeProgress * 100).toFixed(0)}%)`);
    } else if (this.jumpDrive.charged) {
      lines.push('Status: READY TO JUMP');
    } else {
      lines.push('Status: OFFLINE');
    }

    if (this.jumpDrive.requiresMaintenance) {
      lines.push('⚠ REQUIRES MAINTENANCE');
    }

    lines.push('');
    lines.push('Reachable Systems:');
    const reachable = this.getReachableSystems();
    for (const r of reachable.slice(0, 5)) {
      lines.push(`  ${r.system.name}: ${r.distance.toFixed(1)} LY (${r.fuelRequired.toFixed(0)} kg fuel)`);
    }

    return lines.join('\n');
  }

  /**
   * Repair jump drive
   */
  public repairJumpDrive(amount: number): void {
    this.jumpDrive.condition = Math.min(1.0, this.jumpDrive.condition + amount);

    if (this.jumpDrive.condition > 0.5) {
      this.jumpDrive.requiresMaintenance = false;
    }

    console.log(`[JUMP] Jump drive repaired to ${(this.jumpDrive.condition * 100).toFixed(0)}%`);
  }

  // Private methods
  private calculateWaypoints(from: StarSystem, to: StarSystem): StarSystem[] {
    // Simple waypoint calculation - find intermediate systems
    // In a full implementation, would use A* pathfinding
    const waypoints: StarSystem[] = [];

    // For now, just indicate multi-jump needed
    // Would find intermediate systems within range

    return waypoints;
  }
}
