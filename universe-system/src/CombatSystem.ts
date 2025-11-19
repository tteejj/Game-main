/**
 * CombatSystem - Space combat resolution for player and NPCs
 * Handles weapon targeting, damage calculation, shields, hull damage, subsystem damage
 */

import { Vector3 } from './CelestialBody';
import { UniverseOrchestrator } from './UniverseOrchestrator';
import { Spacecraft } from '../physics-modules/src/spacecraft';

export type WeaponType =
  | 'LASER'
  | 'RAILGUN'
  | 'MISSILE'
  | 'PLASMA'
  | 'TORPEDO'
  | 'BEAM'
  | 'EMP';

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;

  // Stats
  damage: number;
  range: number; // meters
  fireRate: number; // rounds per second
  energyCost: number; // energy per shot
  heatGeneration: number; // heat per shot

  // Ammunition (if applicable)
  usesAmmo: boolean;
  ammoType?: string;
  ammoCapacity?: number;
  ammoRemaining?: number;

  // Targeting
  accuracy: number; // 0-1
  trackingSpeed: number; // degrees per second
  minRange?: number; // minimum effective range

  // State
  temperature: number; // 0-1, overheats at 1.0
  coolingRate: number;
  reloadTime: number; // seconds
  timeSinceLastShot: number;
  isReloading: boolean;
}

export interface CombatTarget {
  id: string;
  name: string;
  position: Vector3;
  velocity: Vector3;
  distance: number;
  bearing: { azimuth: number; elevation: number };

  // Status
  hull: number; // 0-1
  shields: number; // 0-1
  threat: number; // 0-10
  hostile: boolean;

  // Capabilities
  weaponRange: number;
  canFireOnUs: boolean;
}

export interface CombatState {
  inCombat: boolean;
  targets: CombatTarget[];
  currentTarget: CombatTarget | null;
  weapons: Weapon[];

  // Ship status
  hullIntegrity: number; // 0-1
  shieldStrength: number; // 0-1
  powerAvailable: number;
  heatLevel: number; // 0-1

  // Tactical
  evasionMode: boolean;
  weaponsHot: boolean;
  shieldsUp: boolean;

  // Stats
  damageDealt: number;
  damageTaken: number;
  shotsHit: number;
  shotsFired: number;
}

export interface DamageResult {
  hit: boolean;
  damage: number;
  shieldDamage: number;
  hullDamage: number;
  subsystemDamage: Map<string, number>;
  criticalHit: boolean;
  targetDestroyed: boolean;
  message: string;
}

export class CombatSystem {
  private orchestrator: UniverseOrchestrator;
  private playerShip: Spacecraft;
  private combatState: CombatState;

  constructor(orchestrator: UniverseOrchestrator, playerShip: Spacecraft) {
    this.orchestrator = orchestrator;
    this.playerShip = playerShip;

    // Initialize combat state
    this.combatState = {
      inCombat: false,
      targets: [],
      currentTarget: null,
      weapons: this.initializeDefaultWeapons(),
      hullIntegrity: 1.0,
      shieldStrength: 1.0,
      powerAvailable: 100,
      heatLevel: 0,
      evasionMode: false,
      weaponsHot: true,
      shieldsUp: true,
      damageDealt: 0,
      damageTaken: 0,
      shotsHit: 0,
      shotsFired: 0
    };
  }

  /**
   * Update combat system
   */
  public update(deltaTime: number, nearbyContacts: any[]): void {
    // Cool weapons
    for (const weapon of this.combatState.weapons) {
      weapon.temperature = Math.max(0, weapon.temperature - weapon.coolingRate * deltaTime);
      weapon.timeSinceLastShot += deltaTime;

      if (weapon.isReloading && weapon.timeSinceLastShot >= weapon.reloadTime) {
        weapon.isReloading = false;
      }
    }

    // Cool ship heat
    this.combatState.heatLevel = Math.max(0, this.combatState.heatLevel - 0.1 * deltaTime);

    // Recharge shields
    if (this.combatState.shieldsUp && this.combatState.powerAvailable > 0) {
      this.combatState.shieldStrength = Math.min(
        1.0,
        this.combatState.shieldStrength + 0.05 * deltaTime
      );
    }

    // Update targets
    this.updateTargets(nearbyContacts);

    // Check if still in combat
    this.combatState.inCombat = this.combatState.targets.some(t => t.hostile && t.distance < 50000);
  }

  /**
   * Target nearest hostile
   */
  public targetNearestHostile(): CombatTarget | null {
    const hostiles = this.combatState.targets.filter(t => t.hostile);

    if (hostiles.length === 0) return null;

    const nearest = hostiles.reduce((closest, current) =>
      current.distance < closest.distance ? current : closest
    );

    this.combatState.currentTarget = nearest;
    console.log(`[COMBAT] Targeting: ${nearest.name} (${(nearest.distance / 1000).toFixed(1)}km)`);

    return nearest;
  }

  /**
   * Fire weapon at current target
   */
  public fireWeapon(weaponId: string): DamageResult {
    const weapon = this.combatState.weapons.find(w => w.id === weaponId);

    if (!weapon) {
      return this.createFailedResult('Weapon not found');
    }

    if (!this.combatState.currentTarget) {
      return this.createFailedResult('No target selected');
    }

    const target = this.combatState.currentTarget;

    // Check weapon ready
    if (weapon.isReloading) {
      return this.createFailedResult('Weapon reloading');
    }

    if (weapon.temperature >= 0.9) {
      return this.createFailedResult('Weapon overheated');
    }

    // Check range
    if (target.distance > weapon.range) {
      return this.createFailedResult(
        `Target out of range: ${(target.distance / 1000).toFixed(1)}km (max: ${(weapon.range / 1000).toFixed(1)}km)`
      );
    }

    if (weapon.minRange && target.distance < weapon.minRange) {
      return this.createFailedResult('Target too close for weapon');
    }

    // Check ammo
    if (weapon.usesAmmo && weapon.ammoRemaining !== undefined) {
      if (weapon.ammoRemaining <= 0) {
        return this.createFailedResult('Out of ammunition');
      }
      weapon.ammoRemaining--;
    }

    // Check power
    if (this.combatState.powerAvailable < weapon.energyCost) {
      return this.createFailedResult('Insufficient power');
    }

    // Fire weapon
    this.combatState.powerAvailable -= weapon.energyCost;
    weapon.temperature += weapon.heatGeneration;
    weapon.timeSinceLastShot = 0;
    this.combatState.shotsFired++;

    if (weapon.temperature >= 1.0) {
      weapon.isReloading = true;
      console.log(`[COMBAT] ${weapon.name} overheated! Cooling down...`);
    }

    this.combatState.heatLevel = Math.min(1.0, this.combatState.heatLevel + weapon.heatGeneration);

    // Calculate hit chance
    const baseAccuracy = weapon.accuracy;
    const rangeMultiplier = 1 - (target.distance / weapon.range) * 0.3;
    const movementPenalty = this.calculateMovementPenalty(target);
    const hitChance = baseAccuracy * rangeMultiplier * movementPenalty;

    const hit = Math.random() < hitChance;

    if (!hit) {
      console.log(`[COMBAT] Miss! (${(hitChance * 100).toFixed(0)}% chance)`);
      return this.createFailedResult('Shot missed target');
    }

    this.combatState.shotsHit++;

    // Calculate damage
    const baseDamage = weapon.damage;
    const critRoll = Math.random();
    const criticalHit = critRoll > 0.95;
    const finalDamage = criticalHit ? baseDamage * 2 : baseDamage;

    // Apply damage
    let shieldDamage = 0;
    let hullDamage = 0;
    const subsystemDamage = new Map<string, number>();

    if (target.shields > 0) {
      // Shields absorb damage
      shieldDamage = Math.min(finalDamage, target.shields * 100);
      target.shields -= shieldDamage / 100;

      const overflow = finalDamage - shieldDamage;
      if (overflow > 0) {
        hullDamage = overflow;
        target.hull -= hullDamage / 100;
      }
    } else {
      // Direct hull damage
      hullDamage = finalDamage;
      target.hull -= hullDamage / 100;

      // Chance of subsystem damage
      if (Math.random() > 0.7) {
        const subsystems = ['ENGINES', 'WEAPONS', 'LIFE_SUPPORT', 'SENSORS'];
        const damaged = subsystems[Math.floor(Math.random() * subsystems.length)];
        subsystemDamage.set(damaged, Math.random() * 0.2);
      }
    }

    this.combatState.damageDealt += finalDamage;

    const targetDestroyed = target.hull <= 0;

    if (targetDestroyed) {
      console.log(`[COMBAT] ${target.name} DESTROYED!`);
      this.handleTargetDestroyed(target);
    }

    // Record combat event
    this.orchestrator.recordEvent({
      id: `combat_hit_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: 'COMBAT_ACTION' as any,
      category: 'COMBAT' as any,
      severity: targetDestroyed ? 8 : 5,
      location: this.playerShip.position,
      participants: ['player_ship', target.id],
      description: targetDestroyed
        ? `Player destroyed ${target.name}`
        : `Player hit ${target.name} for ${finalDamage.toFixed(0)} damage`,
      data: { weapon: weapon.type, damage: finalDamage, criticalHit, targetDestroyed },
      consequences: [],
      witnessed: true,
      priority: targetDestroyed ? 8 : 5,
      tags: ['combat', 'player']
    });

    return {
      hit: true,
      damage: finalDamage,
      shieldDamage,
      hullDamage,
      subsystemDamage,
      criticalHit,
      targetDestroyed,
      message: criticalHit
        ? `CRITICAL HIT! ${finalDamage.toFixed(0)} damage to ${target.name}`
        : `Hit ${target.name} for ${finalDamage.toFixed(0)} damage`
    };
  }

  /**
   * Take incoming damage
   */
  public takeDamage(damage: number, sourceId: string, sourceName: string): void {
    let remainingDamage = damage;

    // Shields absorb first
    if (this.combatState.shieldsUp && this.combatState.shieldStrength > 0) {
      const shieldDamage = Math.min(damage, this.combatState.shieldStrength * 100);
      this.combatState.shieldStrength -= shieldDamage / 100;
      remainingDamage -= shieldDamage;

      console.log(`[COMBAT] Shields absorbed ${shieldDamage.toFixed(0)} damage`);

      if (this.combatState.shieldStrength <= 0) {
        console.log(`[COMBAT] SHIELDS DOWN!`);
      }
    }

    // Hull damage
    if (remainingDamage > 0) {
      this.combatState.hullIntegrity -= remainingDamage / 100;
      this.playerShip.hull = this.combatState.hullIntegrity;

      console.log(`[COMBAT] Hull hit for ${remainingDamage.toFixed(0)} damage! Hull: ${(this.combatState.hullIntegrity * 100).toFixed(0)}%`);

      if (this.combatState.hullIntegrity <= 0) {
        this.handlePlayerDestroyed();
      }
    }

    this.combatState.damageTaken += damage;

    // Record event
    this.orchestrator.recordEvent({
      id: `combat_damage_taken_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: 'COMBAT_ACTION' as any,
      category: 'COMBAT' as any,
      severity: 6,
      location: this.playerShip.position,
      participants: ['player_ship', sourceId],
      description: `Player took ${damage.toFixed(0)} damage from ${sourceName}`,
      data: { damage, sourceId, sourceName },
      consequences: [],
      witnessed: true,
      priority: 7,
      tags: ['combat', 'player', 'damage']
    });
  }

  /**
   * Get combat state
   */
  public getCombatState(): CombatState {
    return { ...this.combatState };
  }

  /**
   * Get combat status string
   */
  public getCombatStatus(): string {
    const lines: string[] = [];

    lines.push('=== COMBAT STATUS ===');
    lines.push(`Hull: ${(this.combatState.hullIntegrity * 100).toFixed(0)}%`);
    lines.push(`Shields: ${(this.combatState.shieldStrength * 100).toFixed(0)}%`);
    lines.push(`Power: ${this.combatState.powerAvailable.toFixed(0)}`);
    lines.push(`Heat: ${(this.combatState.heatLevel * 100).toFixed(0)}%`);
    lines.push('');

    if (this.combatState.currentTarget) {
      const t = this.combatState.currentTarget;
      lines.push(`Target: ${t.name}`);
      lines.push(`  Distance: ${(t.distance / 1000).toFixed(1)}km`);
      lines.push(`  Hull: ${(t.hull * 100).toFixed(0)}%`);
      lines.push(`  Shields: ${(t.shields * 100).toFixed(0)}%`);
      lines.push(`  Threat: ${t.threat}/10`);
    } else {
      lines.push('No target');
    }

    lines.push('');
    lines.push('Weapons:');
    for (const weapon of this.combatState.weapons) {
      const temp = (weapon.temperature * 100).toFixed(0);
      const status = weapon.isReloading ? '[RELOAD]' : weapon.temperature > 0.8 ? '[HOT]' : '[READY]';
      lines.push(`  ${weapon.name} ${status} (Heat: ${temp}%)`);
    }

    return lines.join('\n');
  }

  // Private methods
  private initializeDefaultWeapons(): Weapon[] {
    return [
      {
        id: 'laser_1',
        name: 'Pulse Laser',
        type: 'LASER',
        damage: 15,
        range: 5000,
        fireRate: 2,
        energyCost: 10,
        heatGeneration: 0.15,
        usesAmmo: false,
        accuracy: 0.85,
        trackingSpeed: 45,
        temperature: 0,
        coolingRate: 0.2,
        reloadTime: 2,
        timeSinceLastShot: 999,
        isReloading: false
      },
      {
        id: 'railgun_1',
        name: 'Railgun',
        type: 'RAILGUN',
        damage: 50,
        range: 10000,
        fireRate: 0.5,
        energyCost: 30,
        heatGeneration: 0.3,
        usesAmmo: true,
        ammoType: 'SLUGS',
        ammoCapacity: 100,
        ammoRemaining: 100,
        accuracy: 0.75,
        trackingSpeed: 30,
        minRange: 1000,
        temperature: 0,
        coolingRate: 0.15,
        reloadTime: 3,
        timeSinceLastShot: 999,
        isReloading: false
      }
    ];
  }

  private updateTargets(nearbyContacts: any[]): void {
    this.combatState.targets = nearbyContacts
      .filter(c => c.type === 'SHIP')
      .map(contact => ({
        id: contact.id,
        name: contact.name,
        position: contact.position,
        velocity: contact.velocity || { x: 0, y: 0, z: 0 },
        distance: contact.distance,
        bearing: contact.bearing,
        hull: contact.hull !== undefined ? contact.hull : 1.0,
        shields: contact.shields !== undefined ? contact.shields : 0.5,
        threat: contact.threat || 0,
        hostile: contact.hostile || false,
        weaponRange: 5000,
        canFireOnUs: contact.distance < 5000 && contact.hostile
      }));
  }

  private calculateMovementPenalty(target: CombatTarget): number {
    // Simple movement penalty based on angular velocity
    const speed = Math.sqrt(
      target.velocity.x ** 2 +
      target.velocity.y ** 2 +
      target.velocity.z ** 2
    );

    // Faster targets are harder to hit
    return Math.max(0.3, 1 - (speed / 1000) * 0.1);
  }

  private createFailedResult(message: string): DamageResult {
    return {
      hit: false,
      damage: 0,
      shieldDamage: 0,
      hullDamage: 0,
      subsystemDamage: new Map(),
      criticalHit: false,
      targetDestroyed: false,
      message
    };
  }

  private handleTargetDestroyed(target: CombatTarget): void {
    // Remove from targets
    this.combatState.targets = this.combatState.targets.filter(t => t.id !== target.id);

    if (this.combatState.currentTarget?.id === target.id) {
      this.combatState.currentTarget = null;
    }

    // Potential salvage, bounty rewards, reputation changes would go here
  }

  private handlePlayerDestroyed(): void {
    console.log('[COMBAT] PLAYER SHIP DESTROYED!');
    console.log('Game Over');

    // Would handle respawn, insurance, etc.
  }
}
