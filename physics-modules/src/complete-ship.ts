/**
 * Complete Ship - Hybrid Implementation
 *
 * Merges ALL functionality from:
 * - IntegratedShip (world physics, gravity, collisions)
 * - UnifiedShipSystem (weapons integration)
 * - CompleteShip (subsystems: power, thermal, life support, damage control)
 * - ShipPhysics (advanced orbital mechanics)
 *
 * This is the ONE TRUE ship class that has everything.
 */

import { Vector3, VectorMath, Quaternion, QuaternionMath } from './math-utils';
import { World, CelestialBody } from './world';
import { IntegratedShip, ShipConfiguration as PhysicsShipConfig } from './integrated-ship';
import { WeaponSystem, Weapon, Projectile, Missile } from './weapons';
import { HullDamageSystem, HullStructure, Compartment, ArmorLayer } from './hull-damage';
import { LifeSupportSystem, CrewMember, LifeSupportConfig } from './life-support';
import { PowerBudgetSystem, PowerSource, PowerConsumer, BatteryBank } from './power-budget';
import { ThermalBudgetSystem, ThermalComponent, ThermalCompartment, CoolingSystem } from './thermal-budget';
import { SystemDamageManager, ShipSystem } from './system-damage';
import { DamageControlSystem, RepairCrew } from './damage-control';
import { ShipCombatComputer, TargetInfo, FireSolution } from './ship-combat';

export interface CompleteShipConfig {
  // Identity
  id?: string;
  name: string;
  class: string;

  // Physical properties
  mass: number;              // kg
  radius: number;            // m
  position: Vector3;
  velocity: Vector3;
  orientation?: Quaternion;
  angularVelocity?: Vector3;

  // Hull Structure
  compartments: Compartment[];
  armorLayers: ArmorLayer[];

  // Power Systems
  powerSources: PowerSource[];
  powerConsumers: PowerConsumer[];
  batteries: BatteryBank[];

  // Thermal Systems
  thermalComponents: ThermalComponent[];
  thermalCompartments: ThermalCompartment[];
  coolingSystems: CoolingSystem[];

  // Ship Systems
  systems: ShipSystem[];

  // Life Support & Crew
  crew: CrewMember[];
  lifeSupport: LifeSupportConfig;

  // Weapons
  weapons?: Weapon[];
}

type EventCallback = (...args: any[]) => void;

/**
 * Complete Ship - The One True Ship Implementation
 *
 * Has ALL features:
 * - Exists in world as CelestialBody (detectable by sensors)
 * - Full physics simulation (gravity, collisions, orbital mechanics)
 * - Complete subsystems (power, thermal, life support, damage control)
 * - Weapons (railguns, lasers, missiles)
 * - Combat computer
 * - Hull damage and armor
 * - Event system
 */
export class CompleteShip {
  // Identity
  public readonly id: string;
  public readonly name: string;
  public readonly class: string;

  // Core Components (private - accessed via methods)
  private integratedShip: IntegratedShip;
  private weaponSystem: WeaponSystem;
  private world: World;

  // Subsystems
  public hull: HullStructure;
  public lifeSupport: LifeSupportSystem;
  public power: PowerBudgetSystem;
  public thermal: ThermalBudgetSystem;
  public systemDamage: SystemDamageManager;
  public damageControl: DamageControlSystem;
  public combatComputer: ShipCombatComputer;

  // Event listeners
  private eventListeners: Map<string, EventCallback[]> = new Map();

  // Ship counter for ID generation
  private static shipCounter = 0;

  constructor(config: CompleteShipConfig, world: World) {
    this.id = config.id || `ship-${CompleteShip.shipCounter++}`;
    this.name = config.name;
    this.class = config.class;
    this.world = world;

    // Create physics integration (IntegratedShip)
    const physicsConfig: PhysicsShipConfig = {
      mass: config.mass,
      radius: config.radius,
      position: config.position,
      velocity: config.velocity,
      orientation: config.orientation,
      angularVelocity: config.angularVelocity,
      hullConfig: {
        compartments: config.compartments,
        armorLayers: config.armorLayers
      }
    };

    this.integratedShip = new IntegratedShip(physicsConfig, world);

    // Create hull structure
    this.hull = new HullStructure({
      compartments: config.compartments,
      armorLayers: config.armorLayers
    });

    // Create power system
    this.power = new PowerBudgetSystem({
      sources: config.powerSources,
      consumers: config.powerConsumers,
      batteries: config.batteries
    });

    // Create thermal system
    this.thermal = new ThermalBudgetSystem({
      components: config.thermalComponents,
      compartments: config.thermalCompartments,
      coolingSystems: config.coolingSystems
    });

    // Create system damage manager
    this.systemDamage = new SystemDamageManager({
      systems: config.systems,
      hull: this.hull
    });

    // Create life support
    this.lifeSupport = new LifeSupportSystem(
      this.hull,
      config.crew,
      config.lifeSupport
    );

    // Create damage control
    const repairCrews: RepairCrew[] = config.crew.map(crewMember => ({
      crewMember,
      repairSkill: 0.8,
      efficiency: 1.0,
      currentTask: null,
      fatigueLevel: 0
    }));

    this.damageControl = new DamageControlSystem({
      repairCrews,
      hull: this.hull,
      systems: config.systems
    });

    // Create weapon system
    this.weaponSystem = new WeaponSystem(this.integratedShip, world);

    // Add weapons if provided
    if (config.weapons) {
      for (const weapon of config.weapons) {
        this.weaponSystem.addWeapon(weapon);
      }
    }

    // Create combat computer (casted to any since ShipCombatComputer expects UnifiedShipSystem)
    this.combatComputer = new ShipCombatComputer(this as any);

    // Forward events from IntegratedShip
    this.integratedShip.on('collision', (...args) => this.emit('collision', ...args));
    this.integratedShip.on('damage', (...args) => this.emit('damage', ...args));
    this.integratedShip.on('laserFired', (...args) => this.emit('laserFired', ...args));
  }

  /**
   * Main update loop - updates ALL systems
   */
  update(dt: number): void {
    // PHASE 1: Update physics (gravity, collisions, movement)
    this.integratedShip.update(dt);

    // PHASE 2: Update subsystems
    this.power.update(dt);
    this.thermal.update(dt);
    this.lifeSupport.update(dt);
    this.systemDamage.update(dt);
    this.damageControl.update(dt);

    // PHASE 3: Update weapons
    this.weaponSystem.update(dt);

    // PHASE 4: Combat computer doesn't have update method - no need to call
    // this.combatComputer.update(dt);
  }

  /**
   * Get ship ID (for compatibility with combat systems)
   */
  getId(): string {
    return this.id;
  }

  /**
   * Apply force to ship (for thrusters, engines)
   */
  applyForce(force: Vector3): void {
    this.integratedShip.applyForce(force);
  }

  /**
   * Apply impulse (instantaneous velocity change)
   */
  applyImpulse(impulse: Vector3): void {
    this.integratedShip.applyImpulse(impulse);
  }

  /**
   * Fire a weapon
   * Returns projectile/missile that was created (if any)
   */
  fireWeapon(
    weaponId: string,
    aimDirection: Vector3,
    target?: CelestialBody
  ): { projectile?: Projectile; missile?: Missile; success: boolean } {
    const result = this.weaponSystem.fire(weaponId, aimDirection, target);

    if (result.success) {
      // Emit weaponFired event with the result
      this.emit('weaponFired', result);
    }

    return {
      projectile: result.projectile,
      missile: result.missile,
      success: result.success
    };
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
   * Get weapon by ID
   */
  getWeapon(id: string): Weapon | undefined {
    return this.weaponSystem.getWeapon(id);
  }

  /**
   * Get ship position (from physics)
   */
  getPosition(): Vector3 {
    return this.integratedShip.getPosition();
  }

  /**
   * Get ship velocity (from physics)
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
   * Get hull damage system (for damage application)
   */
  getHullDamageSystem(): HullDamageSystem | undefined {
    return this.integratedShip.getHullDamageSystem();
  }

  /**
   * Get world body (for targeting, sensors, etc)
   */
  getWorldBody(): CelestialBody {
    return this.integratedShip.getWorldBody();
  }

  /**
   * Get integrated ship (for low-level physics access)
   */
  getIntegratedShip(): IntegratedShip {
    return this.integratedShip;
  }

  /**
   * Get weapon system (for advanced weapon management)
   */
  getWeaponSystem(): WeaponSystem {
    return this.weaponSystem;
  }

  /**
   * Get complete ship status
   */
  getStatus() {
    const powerStats = this.power.getStatistics();
    const thermalStats = this.thermal.getStatistics();
    const damageReport = this.systemDamage.getDamageReport();
    const lifeStats = this.lifeSupport.getStatistics();
    const pos = this.getPosition();
    const vel = this.getVelocity();

    return {
      ship: {
        id: this.id,
        name: this.name,
        class: this.class,
        position: pos,
        velocity: vel,
        hullIntegrity: this.getHullIntegrity()
      },
      power: {
        generation: powerStats.totalGeneration,
        consumption: powerStats.totalConsumption,
        batteryCharge: powerStats.batteryCharge,
        batteryCapacity: powerStats.batteryCapacity,
        brownout: powerStats.brownoutActive
      },
      thermal: {
        averageTemp: thermalStats.averageTemperature,
        hottestComponent: thermalStats.hottestComponent,
        hottestTemp: thermalStats.hottestTemperature
      },
      damage: {
        totalSystems: damageReport.totalSystems,
        operational: damageReport.operationalSystems,
        criticalFailures: damageReport.criticalFailures.length
      },
      lifeSupport: {
        crewHealthy: lifeStats.healthyCrew,
        crewTotal: this.lifeSupport.getCrew().length,
        oxygenConsumed: lifeStats.oxygenConsumed
      },
      weapons: {
        count: this.getWeapons().length,
        weapons: this.getWeapons().map(w => ({
          id: w.id,
          type: w.type,
          ammo: w.ammoRemaining !== undefined ? `${w.ammoRemaining}/${w.ammoCapacity}` : 'unlimited',
          cooldown: w.cooldown
        }))
      }
    };
  }

  /**
   * Event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Emit event (PUBLIC so weapon system can emit)
   */
  emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        callback(...args);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.integratedShip.destroy();
  }
}

/**
 * Complete Simulation System - Manages world and all ships
 *
 * Merges functionality from:
 * - SimulationController (from integrated-ship.ts)
 * - CompleteSimulationSystem (from unified-ship-system.ts)
 */
export class CompleteSimulation {
  private world: World;
  private ships: Map<string, CompleteShip> = new Map();
  private projectiles: Projectile[] = [];
  private missiles: Missile[] = [];
  private simulationTime: number = 0;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Add ship to simulation
   */
  addShip(config: CompleteShipConfig): CompleteShip {
    const ship = new CompleteShip(config, this.world);
    this.ships.set(ship.id, ship);

    // Set up ship lookup for weapon damage
    ship.getWeaponSystem().setShipLookup((bodyId: string) => {
      return this.ships.get(bodyId)?.getIntegratedShip();
    });

    // Subscribe to weapon fire events
    ship.on('weaponFired', (result: any) => {
      if (result.projectile) {
        this.projectiles.push(result.projectile);
      }
      if (result.missile) {
        this.missiles.push(result.missile);
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
   * Get ship by ID
   */
  getShip(id: string): CompleteShip | undefined {
    return this.ships.get(id);
  }

  /**
   * Get all ships
   */
  getAllShips(): CompleteShip[] {
    return Array.from(this.ships.values());
  }

  /**
   * Main update loop
   */
  update(dt: number): void {
    // PHASE 1: Update world physics
    this.world.update(dt);

    // PHASE 2: Update all ships
    for (const ship of this.ships.values()) {
      ship.update(dt);
    }

    // PHASE 3: Update projectiles
    for (const projectile of this.projectiles) {
      if (projectile.isAlive()) {
        projectile.update(dt, this.world);
      }
    }
    this.projectiles = this.projectiles.filter(p => p.isAlive());

    // PHASE 4: Update missiles
    for (const missile of this.missiles) {
      if (missile.isAlive()) {
        missile.update(dt, this.world);
      }
    }
    this.missiles = this.missiles.filter(m => m.isAlive());

    // PHASE 5: Check ship-ship collisions (only once, not twice)
    this.checkShipCollisions();

    // PHASE 6: Update simulation time
    this.simulationTime += dt;
  }

  /**
   * Check collisions between ships (centralized to avoid double-checking)
   */
  private checkShipCollisions(): void {
    const shipArray = Array.from(this.ships.values());

    for (let i = 0; i < shipArray.length; i++) {
      for (let j = i + 1; j < shipArray.length; j++) {
        const ship1 = shipArray[i];
        const ship2 = shipArray[j];

        const body1 = ship1.getWorldBody();
        const body2 = ship2.getWorldBody();

        const dist = VectorMath.distance(body1.position, body2.position);
        const minDist = body1.radius + body2.radius;

        if (dist < minDist) {
          // Collision detected - apply physics response
          const relVel = VectorMath.subtract(
            ship1.getVelocity(),
            ship2.getVelocity()
          );
          const relSpeed = VectorMath.magnitude(relVel);

          if (relSpeed > 0.1) {  // Only process if relative motion exists
            const totalMass = body1.mass + body2.mass;
            const normal = VectorMath.normalize(
              VectorMath.subtract(body1.position, body2.position)
            );

            const impulse1 = VectorMath.scale(
              normal,
              -relSpeed * (body2.mass / totalMass)
            );

            const impulse2 = VectorMath.scale(
              normal,
              relSpeed * (body1.mass / totalMass)
            );

            ship1.applyImpulse(impulse1);
            ship2.applyImpulse(impulse2);
          }
        }
      }
    }
  }

  /**
   * Get all projectiles
   */
  getAllProjectiles(): Projectile[] {
    return [...this.projectiles];
  }

  /**
   * Get all missiles
   */
  getAllMissiles(): Missile[] {
    return [...this.missiles];
  }

  /**
   * Get simulation time
   */
  getSimulationTime(): number {
    return this.simulationTime;
  }

  /**
   * Get world
   */
  getWorld(): World {
    return this.world;
  }
}
