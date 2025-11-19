/**
 * Unified Ship System - Complete Integration Layer
 *
 * @deprecated Use CompleteShip from complete-ship.ts instead
 * This class is kept for backwards compatibility but will be removed in a future version.
 * CompleteShip has ALL functionality including subsystems (power, thermal, life support, etc.)
 * that this class is missing.
 *
 * This module provides a single, cohesive interface that integrates:
 * - IntegratedShip (world physics integration)
 * - Spacecraft (full subsystems)
 * - WeaponSystem (combat)
 * - World (environment)
 *
 * Use CompleteShip instead of managing multiple ship classes separately.
 */

import { Vector3, VectorMath, Quaternion } from './math-utils';
import { World, CelestialBody } from './world';
import { IntegratedShip, ShipConfiguration, SimulationController } from './integrated-ship';
import { WeaponSystem, Weapon, Projectile, Missile, ProjectileManager, MissileManager } from './weapons';
import { HullDamageSystem } from './hull-damage';

export interface UnifiedShipConfig {
  // Physical properties
  mass: number;
  radius: number;
  position: Vector3;
  velocity: Vector3;
  orientation?: Quaternion;
  angularVelocity?: Vector3;

  // Hull configuration (proper types from hull-damage.ts)
  hullConfig?: {
    compartments: import('./hull-damage').Compartment[];
    armorLayers: import('./hull-damage').ArmorLayer[];
  };

  // Weapon mounts
  weapons?: Weapon[];
}

/**
 * Unified Ship - Complete integration of all ship systems
 *
 * @deprecated Use CompleteShip from complete-ship.ts instead
 */
export class UnifiedShipSystem {
  private integratedShip: IntegratedShip;
  private weaponSystem: WeaponSystem;
  private world: World;
  private simulationController?: SimulationController;

  constructor(config: UnifiedShipConfig, world: World, simulationController?: SimulationController) {
    this.world = world;
    this.simulationController = simulationController;

    // Create integrated ship (handles world physics, collisions, damage)
    const shipConfig: ShipConfiguration = {
      mass: config.mass,
      radius: config.radius,
      position: config.position,
      velocity: config.velocity,
      orientation: config.orientation,
      angularVelocity: config.angularVelocity,
      hullConfig: config.hullConfig
    };

    this.integratedShip = new IntegratedShip(shipConfig, world);

    // Create weapon system
    this.weaponSystem = new WeaponSystem(this.integratedShip, world);

    // Set up ship lookup for damage integration
    if (simulationController) {
      this.weaponSystem.setShipLookup((bodyId: string) => {
        return simulationController.getShipByBodyId(bodyId);
      });
    }

    // Add weapons if provided
    if (config.weapons) {
      for (const weapon of config.weapons) {
        this.weaponSystem.addWeapon(weapon);
      }
    }
  }

  /**
   * Main update loop - updates all ship systems
   */
  update(dt: number): void {
    // Update integrated ship (physics, collisions, damage)
    this.integratedShip.update(dt);

    // Update weapon cooldowns
    this.weaponSystem.update(dt);
  }

  /**
   * Apply force to ship
   */
  applyForce(force: Vector3): void {
    this.integratedShip.applyForce(force);
  }

  /**
   * Apply impulse to ship
   */
  applyImpulse(impulse: Vector3): void {
    this.integratedShip.applyImpulse(impulse);
  }

  /**
   * Fire a weapon
   */
  fireWeapon(weaponId: string, aimDirection: Vector3, target?: CelestialBody) {
    return this.weaponSystem.fire(weaponId, aimDirection, target);
  }

  /**
   * Add weapon to ship
   */
  addWeapon(weapon: Weapon): void {
    this.weaponSystem.addWeapon(weapon);
  }

  /**
   * Get all weapons
   */
  getWeapons(): Weapon[] {
    return this.weaponSystem.getAllWeapons();
  }

  /**
   * Get ship position
   */
  getPosition(): Vector3 {
    return this.integratedShip.getPosition();
  }

  /**
   * Get ship velocity
   */
  getVelocity(): Vector3 {
    return this.integratedShip.getVelocity();
  }

  /**
   * Get hull integrity (0-1)
   */
  getHullIntegrity(): number {
    return this.integratedShip.getHullIntegrity();
  }

  /**
   * Get hull damage system
   */
  getHullDamageSystem(): HullDamageSystem | undefined {
    return this.integratedShip.getHullDamageSystem();
  }

  /**
   * Get world body
   */
  getWorldBody(): CelestialBody {
    return this.integratedShip.getWorldBody();
  }

  /**
   * Get ship ID
   */
  getId(): string {
    return this.integratedShip.id;
  }

  /**
   * Get integrated ship instance (for advanced access)
   */
  getIntegratedShip(): IntegratedShip {
    return this.integratedShip;
  }

  /**
   * Get weapon system instance (for advanced access)
   */
  getWeaponSystem(): WeaponSystem {
    return this.weaponSystem;
  }

  /**
   * Subscribe to ship events
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.integratedShip.on(event, callback);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.integratedShip.destroy();
  }
}

/**
 * Combat Manager - manages all combat-related entities in the world
 */
export class CombatManager {
  private projectileManager: ProjectileManager;
  private missileManager: MissileManager;
  private world: World;

  constructor(world: World) {
    this.world = world;
    this.projectileManager = new ProjectileManager();
    this.missileManager = new MissileManager();
  }

  /**
   * Add projectile to tracking
   */
  addProjectile(projectile: Projectile): void {
    this.projectileManager.addProjectile(projectile);
  }

  /**
   * Add missile to tracking
   */
  addMissile(missile: Missile): void {
    this.missileManager.addMissile(missile);
  }

  /**
   * Update all combat entities
   */
  update(dt: number): void {
    this.projectileManager.update(dt, this.world);
    this.missileManager.update(dt, this.world);
  }

  /**
   * Get all projectiles
   */
  getAllProjectiles(): Projectile[] {
    return this.projectileManager.getAllProjectiles();
  }

  /**
   * Get all missiles
   */
  getAllMissiles(): Missile[] {
    return this.missileManager.getAllMissiles();
  }

  /**
   * Get missiles targeting a specific body
   */
  getMissilesTargeting(bodyId: string): Missile[] {
    return this.missileManager.getMissilesTargeting(bodyId);
  }

  /**
   * Get total combat entity count
   */
  getEntityCount(): number {
    return this.projectileManager.getProjectileCount() + this.missileManager.getMissileCount();
  }
}

/**
 * Complete Simulation System - integrates everything
 *
 * @deprecated Use CompleteSimulation from complete-ship.ts instead
 */
export class CompleteSimulationSystem {
  private world: World;
  private simulationController: SimulationController;
  private combatManager: CombatManager;
  private ships: Map<string, UnifiedShipSystem> = new Map();

  constructor(world: World) {
    this.world = world;
    this.simulationController = new SimulationController(world);
    this.combatManager = new CombatManager(world);
  }

  /**
   * Add ship to simulation
   */
  addShip(config: UnifiedShipConfig): UnifiedShipSystem {
    const ship = new UnifiedShipSystem(config, this.world, this.simulationController);
    this.ships.set(ship.getId(), ship);

    // Subscribe to weapon fire events to add projectiles/missiles to combat manager
    ship.on('weaponFired', (result: any) => {
      if (result.projectile) {
        this.combatManager.addProjectile(result.projectile);
      }
      if (result.missile) {
        this.combatManager.addMissile(result.missile);
      }
    });

    return ship;
  }

  /**
   * Remove ship from simulation
   */
  removeShip(shipId: string): void {
    const ship = this.ships.get(shipId);
    if (ship) {
      ship.destroy();
      this.ships.delete(shipId);
    }
  }

  /**
   * Main update loop
   */
  update(dt: number): void {
    // Update world physics
    this.simulationController.update(dt);

    // Update all ships
    for (const ship of this.ships.values()) {
      ship.update(dt);
    }

    // Update combat (projectiles, missiles)
    this.combatManager.update(dt);
  }

  /**
   * Get ship by ID
   */
  getShip(id: string): UnifiedShipSystem | undefined {
    return this.ships.get(id);
  }

  /**
   * Get all ships
   */
  getAllShips(): UnifiedShipSystem[] {
    return Array.from(this.ships.values());
  }

  /**
   * Get combat manager
   */
  getCombatManager(): CombatManager {
    return this.combatManager;
  }

  /**
   * Get simulation controller
   */
  getSimulationController(): SimulationController {
    return this.simulationController;
  }

  /**
   * Get world
   */
  getWorld(): World {
    return this.world;
  }
}
