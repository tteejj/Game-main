/**
 * Ship-to-Ship Combat System
 *
 * Provides helper functions and utilities for ship combat scenarios:
 * - Target acquisition and tracking
 * - Fire control solutions
 * - Intercept calculations
 * - Combat AI helpers
 */

import { Vector3, VectorMath } from './math-utils';
import { UnifiedShipSystem } from './unified-ship-system';
import { CelestialBody } from './world';
import { WeaponType } from './weapons';

export interface FireSolution {
  aimDirection: Vector3;
  leadAngle: number;          // degrees
  timeToImpact: number;       // seconds
  probability: number;        // 0-1 hit probability
  inRange: boolean;
  canFire: boolean;
}

export interface TargetInfo {
  target: UnifiedShipSystem;
  distance: number;
  relativeVelocity: Vector3;
  closingRate: number;        // m/s (positive = approaching)
  bearing: Vector3;           // unit vector to target
  inWeaponRange: boolean;
  threatLevel: number;        // 0-1
}

/**
 * Combat Computer - handles targeting and fire solutions
 */
export class ShipCombatComputer {
  private ship: UnifiedShipSystem;

  constructor(ship: UnifiedShipSystem) {
    this.ship = ship;
  }

  /**
   * Calculate fire solution for projectile weapon
   */
  calculateProjectileFireSolution(
    target: UnifiedShipSystem,
    weaponId: string,
    projectileSpeed: number
  ): FireSolution {
    const shipPos = this.ship.getPosition();
    const shipVel = this.ship.getVelocity();
    const targetPos = target.getPosition();
    const targetVel = target.getVelocity();

    // Calculate intercept point using iterative approach
    const intercept = this.calculateInterceptPoint(
      shipPos,
      shipVel,
      targetPos,
      targetVel,
      projectileSpeed
    );

    if (!intercept) {
      return {
        aimDirection: VectorMath.normalize(VectorMath.subtract(targetPos, shipPos)),
        leadAngle: 0,
        timeToImpact: Infinity,
        probability: 0,
        inRange: false,
        canFire: false
      };
    }

    // Calculate aim direction
    const aimDirection = VectorMath.normalize(VectorMath.subtract(intercept.position, shipPos));

    // Calculate lead angle
    const directLine = VectorMath.normalize(VectorMath.subtract(targetPos, shipPos));
    const leadAngle = Math.acos(
      Math.max(-1, Math.min(1, VectorMath.dot(aimDirection, directLine)))
    ) * (180 / Math.PI);

    // Calculate hit probability based on distance and relative velocity
    const distance = VectorMath.distance(shipPos, targetPos);
    const relVel = VectorMath.magnitude(VectorMath.subtract(targetVel, shipVel));

    // Probability decreases with distance and relative velocity
    const distanceFactor = Math.exp(-distance / 10000); // 10km scale
    const velocityFactor = Math.exp(-relVel / 1000);    // 1km/s scale
    const probability = distanceFactor * velocityFactor;

    // Get weapon range
    const weapons = this.ship.getWeapons();
    const weapon = weapons.find(w => w.id === weaponId);
    const range = weapon?.range || 10000;

    return {
      aimDirection,
      leadAngle,
      timeToImpact: intercept.timeToIntercept,
      probability,
      inRange: distance <= range,
      canFire: distance <= range && probability > 0.1
    };
  }

  /**
   * Calculate intercept point for moving target
   * Uses iterative approach to find where projectile and target meet
   */
  private calculateInterceptPoint(
    shooterPos: Vector3,
    shooterVel: Vector3,
    targetPos: Vector3,
    targetVel: Vector3,
    projectileSpeed: number
  ): { position: Vector3; timeToIntercept: number } | null {
    const MAX_ITERATIONS = 10;
    const TOLERANCE = 1.0; // 1 meter tolerance

    let interceptPos = { ...targetPos };
    let timeToIntercept = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Calculate time for projectile to reach current intercept point
      const toIntercept = VectorMath.subtract(interceptPos, shooterPos);
      const distance = VectorMath.magnitude(toIntercept);

      // Account for shooter velocity
      const relativeProjectileSpeed = projectileSpeed; // Simplified
      timeToIntercept = distance / relativeProjectileSpeed;

      // Calculate where target will be at that time
      const targetDisplacement = VectorMath.scale(targetVel, timeToIntercept);
      const newInterceptPos = VectorMath.add(targetPos, targetDisplacement);

      // Check convergence
      const error = VectorMath.distance(interceptPos, newInterceptPos);
      if (error < TOLERANCE) {
        return { position: newInterceptPos, timeToIntercept };
      }

      interceptPos = newInterceptPos;
    }

    // Did not converge - target may be moving too fast to intercept
    return null;
  }

  /**
   * Calculate fire solution for laser weapon (hitscan)
   */
  calculateLaserFireSolution(target: UnifiedShipSystem, weaponId: string): FireSolution {
    const shipPos = this.ship.getPosition();
    const targetPos = target.getPosition();

    const distance = VectorMath.distance(shipPos, targetPos);
    const aimDirection = VectorMath.normalize(VectorMath.subtract(targetPos, shipPos));

    // Lasers are instant hit
    const weapons = this.ship.getWeapons();
    const weapon = weapons.find(w => w.id === weaponId);
    const range = weapon?.range || 50000;

    return {
      aimDirection,
      leadAngle: 0,
      timeToImpact: 0, // Instant
      probability: distance <= range ? 0.95 : 0, // High probability if in range
      inRange: distance <= range,
      canFire: distance <= range
    };
  }

  /**
   * Calculate fire solution for missile
   */
  calculateMissileFireSolution(target: UnifiedShipSystem, weaponId: string): FireSolution {
    const shipPos = this.ship.getPosition();
    const targetPos = target.getPosition();

    const distance = VectorMath.distance(shipPos, targetPos);
    const aimDirection = VectorMath.normalize(VectorMath.subtract(targetPos, shipPos));

    // Missiles have guidance, so just aim at current position
    const weapons = this.ship.getWeapons();
    const weapon = weapons.find(w => w.id === weaponId);
    const range = weapon?.range || 100000;

    // Missile probability is high due to guidance
    const probability = distance <= range ? 0.8 : 0;

    return {
      aimDirection,
      leadAngle: 0, // Missile will guide itself
      timeToImpact: distance / 100, // Rough estimate at 100 m/s average
      probability,
      inRange: distance <= range,
      canFire: distance <= range
    };
  }

  /**
   * Get target information
   */
  getTargetInfo(target: UnifiedShipSystem): TargetInfo {
    const shipPos = this.ship.getPosition();
    const shipVel = this.ship.getVelocity();
    const targetPos = target.getPosition();
    const targetVel = target.getVelocity();

    const distance = VectorMath.distance(shipPos, targetPos);
    const bearing = VectorMath.normalize(VectorMath.subtract(targetPos, shipPos));
    const relativeVelocity = VectorMath.subtract(targetVel, shipVel);
    const closingRate = -VectorMath.dot(relativeVelocity, bearing); // Positive if closing

    // Check if in weapon range (use longest range weapon)
    const weapons = this.ship.getWeapons();
    const maxRange = Math.max(...weapons.map(w => w.range), 0);
    const inWeaponRange = distance <= maxRange;

    // Calculate threat level based on distance and approach
    let threatLevel = 0;
    if (inWeaponRange) {
      threatLevel = 1.0 - (distance / maxRange);
      if (closingRate > 0) {
        threatLevel *= 1.5; // Increase threat if approaching
      }
      threatLevel = Math.min(1, threatLevel);
    }

    return {
      target,
      distance,
      relativeVelocity,
      closingRate,
      bearing,
      inWeaponRange,
      threatLevel
    };
  }

  /**
   * Auto-engage target with best weapon
   */
  autoEngage(target: UnifiedShipSystem): boolean {
    const weapons = this.ship.getWeapons();

    // Try each weapon type in priority order
    for (const weapon of weapons) {
      if (weapon.cooldown > 0) continue;
      if (weapon.ammoRemaining !== undefined && weapon.ammoRemaining <= 0) continue;

      let solution: FireSolution;

      switch (weapon.type) {
        case WeaponType.LASER:
          solution = this.calculateLaserFireSolution(target, weapon.id);
          break;

        case WeaponType.MISSILE:
          solution = this.calculateMissileFireSolution(target, weapon.id);
          break;

        case WeaponType.RAILGUN:
        case WeaponType.COILGUN:
          solution = this.calculateProjectileFireSolution(
            target,
            weapon.id,
            weapon.projectileSpeed || 2000
          );
          break;

        default:
          continue;
      }

      if (solution.canFire) {
        // Fire the weapon
        const targetBody = target.getWorldBody();
        this.ship.fireWeapon(weapon.id, solution.aimDirection, targetBody);
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate evasive maneuver direction
   */
  calculateEvasiveManeuver(threats: UnifiedShipSystem[]): Vector3 {
    if (threats.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const shipPos = this.ship.getPosition();

    // Calculate average threat direction
    let threatDir = { x: 0, y: 0, z: 0 };
    for (const threat of threats) {
      const toThreat = VectorMath.subtract(threat.getPosition(), shipPos);
      const normalized = VectorMath.normalize(toThreat);
      threatDir = VectorMath.add(threatDir, normalized);
    }

    // Evade perpendicular to threat direction
    if (VectorMath.magnitude(threatDir) > 0.01) {
      const normalized = VectorMath.normalize(threatDir);

      // Pick a perpendicular direction
      let perpendicular: Vector3;
      if (Math.abs(normalized.z) < 0.9) {
        // Use cross product with Z axis
        perpendicular = VectorMath.normalize({
          x: -normalized.y,
          y: normalized.x,
          z: 0
        });
      } else {
        // Use cross product with X axis
        perpendicular = VectorMath.normalize({
          x: 0,
          y: -normalized.z,
          z: normalized.y
        });
      }

      return perpendicular;
    }

    return { x: 1, y: 0, z: 0 }; // Default evasion direction
  }
}

/**
 * Combat scenario helper functions
 */
export class CombatScenarios {
  /**
   * Set up a 1v1 duel between two ships
   */
  static setupDuel(ship1: UnifiedShipSystem, ship2: UnifiedShipSystem): {
    combatComputer1: ShipCombatComputer;
    combatComputer2: ShipCombatComputer;
  } {
    const cc1 = new ShipCombatComputer(ship1);
    const cc2 = new ShipCombatComputer(ship2);

    return {
      combatComputer1: cc1,
      combatComputer2: cc2
    };
  }

  /**
   * Run combat AI for a ship
   */
  static runCombatAI(
    ship: UnifiedShipSystem,
    combatComputer: ShipCombatComputer,
    targets: UnifiedShipSystem[]
  ): void {
    if (targets.length === 0) return;

    // Find closest threat
    let closestThreat: UnifiedShipSystem | null = null;
    let minDistance = Infinity;

    for (const target of targets) {
      const info = combatComputer.getTargetInfo(target);
      if (info.distance < minDistance) {
        minDistance = info.distance;
        closestThreat = target;
      }
    }

    if (closestThreat) {
      // Engage closest threat
      combatComputer.autoEngage(closestThreat);
    }
  }
}
