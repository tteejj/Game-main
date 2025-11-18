/**
 * Weapon Systems
 *
 * Implements railguns, coilguns, missiles, lasers, and projectile physics
 * NO RENDERING - physics only
 */

import { Vector3, VectorMath } from './math-utils';
import { World, CelestialBody } from './world';
import { CollisionDetector } from './collision';
import { IntegratedShip } from './integrated-ship';

export enum WeaponType {
  RAILGUN = 'railgun',
  COILGUN = 'coilgun',
  MISSILE = 'missile',
  LASER = 'laser'
}

export interface Weapon {
  id: string;
  type: WeaponType;

  // Physical properties
  mountPoint: Vector3;           // Position on ship
  aimDirection: Vector3;         // Current aim (unit vector)

  // Performance
  damage: number;                // Base damage (Joules)
  projectileSpeed?: number;      // m/s (for projectiles)
  projectileMass?: number;       // kg (for projectiles)
  range: number;                 // Maximum effective range (m)
  rateOfFire: number;            // rounds per minute

  // Resources
  powerDraw: number;             // kW when firing
  heatGeneration: number;        // J per shot
  ammoCapacity?: number;         // For projectiles
  ammoRemaining?: number;

  // State
  cooldown: number;              // Time until can fire again (seconds)
  compartmentId: string;         // Which compartment it's in
}

export interface FiringResult {
  success: boolean;
  reason?: string;
  projectile?: Projectile;
  missile?: Missile;
}

export interface ProjectileConfig {
  position: Vector3;
  velocity: Vector3;
  mass: number;
  damage: number;
  lifetime: number;              // seconds
  shipLookup?: (bodyId: string) => IntegratedShip | undefined;  // Optional ship lookup function
}

export interface MissileConfig {
  position: Vector3;
  velocity: Vector3;
  mass: number;
  damage: number;
  lifetime: number;
  target?: CelestialBody;        // Optional target for guidance
  thrust: number;                // Newtons
  fuel: number;                  // kg
  fuelBurnRate: number;          // kg/s
  guidanceGain: number;          // Proportional navigation constant
  proximityFuse: number;         // Detonation range (meters)
  shipLookup?: (bodyId: string) => IntegratedShip | undefined;
  world?: World;
}

type EventCallback = (...args: any[]) => void;

/**
 * Projectile - physical projectile in space
 */
export class Projectile {
  private position: Vector3;
  private velocity: Vector3;
  private mass: number;
  private damage: number;
  private lifetime: number;
  private alive: boolean = true;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private shipLookup?: (bodyId: string) => IntegratedShip | undefined;

  constructor(config: ProjectileConfig) {
    this.position = { ...config.position };
    this.velocity = { ...config.velocity };
    this.mass = config.mass;
    this.damage = config.damage;
    this.lifetime = config.lifetime;
    this.shipLookup = config.shipLookup;
  }

  /**
   * Update projectile physics
   */
  update(dt: number, world: World): void {
    if (!this.alive) return;

    // PHASE 1: Apply gravity
    const gravity = world.getGravityAt(this.position);
    this.velocity = VectorMath.add(
      this.velocity,
      VectorMath.scale(gravity, dt)
    );

    // PHASE 2: Calculate new position
    const displacement = VectorMath.scale(this.velocity, dt);
    const newPosition = VectorMath.add(this.position, displacement);

    // PHASE 3: Check for hits using sweep test
    const hit = this.checkHit(this.position, newPosition, world);

    if (hit) {
      this.handleImpact(hit.body, hit.point, world);
      this.alive = false;
      return;
    }

    // PHASE 4: Update position
    this.position = newPosition;

    // PHASE 5: Lifetime decay
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }

  /**
   * Check for hits along trajectory
   */
  private checkHit(startPos: Vector3, endPos: Vector3, world: World): { body: CelestialBody; point: Vector3 } | null {
    const bodies = world.getAllBodies();
    const direction = VectorMath.normalize(VectorMath.subtract(endPos, startPos));
    const distance = VectorMath.distance(startPos, endPos);

    let closestHit: { body: CelestialBody; point: Vector3; distance: number } | null = null;

    for (const body of bodies) {
      // Simple sphere intersection
      const toBody = VectorMath.subtract(body.position, startPos);
      const projection = VectorMath.dot(toBody, direction);

      // Check if body is ahead of us
      if (projection < 0 || projection > distance) continue;

      const closestPoint = VectorMath.add(startPos, VectorMath.scale(direction, projection));
      const distToBody = VectorMath.distance(closestPoint, body.position);

      if (distToBody <= body.radius) {
        const hitDistance = projection - Math.sqrt(body.radius * body.radius - distToBody * distToBody);
        if (!closestHit || hitDistance < closestHit.distance) {
          const hitPoint = VectorMath.add(startPos, VectorMath.scale(direction, hitDistance));
          closestHit = { body, point: hitPoint, distance: hitDistance };
        }
      }
    }

    if (closestHit) {
      return { body: closestHit.body, point: closestHit.point };
    }

    return null;
  }

  /**
   * Handle impact with target
   */
  private handleImpact(target: CelestialBody, point: Vector3, world: World): void {
    // Check if target is a ship and apply damage
    let damageResult: { damageApplied: number; breachCreated: boolean } | undefined;

    if (this.shipLookup) {
      const targetShip = this.shipLookup(target.id);
      if (targetShip) {
        // Apply damage to ship's hull system
        damageResult = targetShip.applyProjectileDamage(
          point,
          this.velocity,
          this.mass,
          this.damage
        );
      }
    }

    // Emit hit event with damage details
    this.emit('hit', {
      target,
      point,
      damage: this.damage,
      damageResult
    });
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
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        callback(...args);
      }
    }
  }

  // Getters
  getPosition(): Vector3 {
    return { ...this.position };
  }

  getVelocity(): Vector3 {
    return { ...this.velocity };
  }

  isAlive(): boolean {
    return this.alive;
  }
}

/**
 * Guided Missile - self-propelled guided projectile
 */
export class Missile {
  private position: Vector3;
  private velocity: Vector3;
  private mass: number;
  private damage: number;
  private lifetime: number;
  private fuel: number;
  private thrust: number;
  private fuelBurnRate: number;
  private guidanceGain: number;
  private proximityFuse: number;
  private target?: CelestialBody;
  private alive: boolean = true;
  private detonated: boolean = false;
  private shipLookup?: (bodyId: string) => IntegratedShip | undefined;
  private world?: World;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor(config: MissileConfig) {
    this.position = { ...config.position };
    this.velocity = { ...config.velocity };
    this.mass = config.mass;
    this.damage = config.damage;
    this.lifetime = config.lifetime;
    this.target = config.target;
    this.thrust = config.thrust;
    this.fuel = config.fuel;
    this.fuelBurnRate = config.fuelBurnRate;
    this.guidanceGain = config.guidanceGain;
    this.proximityFuse = config.proximityFuse;
    this.shipLookup = config.shipLookup;
    this.world = config.world;
  }

  /**
   * Update missile physics and guidance
   */
  update(dt: number, world: World): void {
    if (!this.alive) return;

    // PHASE 1: Apply gravity
    const gravity = world.getGravityAt(this.position);
    this.velocity = VectorMath.add(
      this.velocity,
      VectorMath.scale(gravity, dt)
    );

    // PHASE 2: Guidance and thrust
    if (this.fuel > 0 && this.target) {
      const guidance = this.calculateGuidance();

      if (guidance) {
        // Apply thrust in guidance direction
        const thrustAccel = VectorMath.scale(guidance, this.thrust / this.mass);
        this.velocity = VectorMath.add(
          this.velocity,
          VectorMath.scale(thrustAccel, dt)
        );

        // Consume fuel
        const fuelUsed = this.fuelBurnRate * dt;
        this.fuel = Math.max(0, this.fuel - fuelUsed);
        this.mass = Math.max(this.mass * 0.5, this.mass - fuelUsed);  // Dry mass is ~50% wet mass
      }
    }

    // PHASE 3: Calculate new position
    const displacement = VectorMath.scale(this.velocity, dt);
    const newPosition = VectorMath.add(this.position, displacement);

    // PHASE 4: Check proximity to target
    if (this.target) {
      const distToTarget = VectorMath.distance(this.position, this.target.position);
      if (distToTarget <= this.proximityFuse) {
        this.detonate();
        return;
      }
    }

    // PHASE 5: Check for direct hits
    const hit = this.checkHit(this.position, newPosition, world);
    if (hit) {
      this.handleImpact(hit.body, hit.point, world);
      this.alive = false;
      return;
    }

    // PHASE 6: Update position
    this.position = newPosition;

    // PHASE 7: Lifetime decay
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }

  /**
   * Calculate guidance direction using proportional navigation
   */
  private calculateGuidance(): Vector3 | null {
    if (!this.target) return null;

    // Vector to target
    const toTarget = VectorMath.subtract(this.target.position, this.position);
    const distance = VectorMath.magnitude(toTarget);

    if (distance < 0.1) return null;  // Too close

    // Line of sight direction
    const los = VectorMath.normalize(toTarget);

    // Closing velocity (how fast we're approaching)
    const relativeVelocity = VectorMath.subtract(this.velocity, this.target.velocity);
    const closingRate = -VectorMath.dot(relativeVelocity, los);

    if (closingRate <= 0) {
      // Target is moving away or parallel - just point at it
      return los;
    }

    // Rate of change of line of sight
    const lateralVelocity = VectorMath.subtract(
      relativeVelocity,
      VectorMath.scale(los, VectorMath.dot(relativeVelocity, los))
    );
    const losRate = VectorMath.magnitude(lateralVelocity) / distance;

    // Proportional navigation: acceleration perpendicular to LOS
    // a = N * Vc * λ_dot (where N is navigation constant, Vc is closing rate, λ_dot is LOS rate)
    const requiredAccel = this.guidanceGain * closingRate * losRate;

    // Direction perpendicular to LOS (in direction of lateral velocity)
    let guidanceDirection: Vector3;
    if (VectorMath.magnitude(lateralVelocity) > 0.01) {
      guidanceDirection = VectorMath.normalize(lateralVelocity);
    } else {
      guidanceDirection = los;
    }

    // Blend between pure pursuit (point at target) and proportional navigation
    const pursuitWeight = 0.3;
    const navWeight = 0.7;

    const combinedGuidance = VectorMath.add(
      VectorMath.scale(los, pursuitWeight),
      VectorMath.scale(guidanceDirection, navWeight)
    );

    return VectorMath.normalize(combinedGuidance);
  }

  /**
   * Check for hits along trajectory
   */
  private checkHit(startPos: Vector3, endPos: Vector3, world: World): { body: CelestialBody; point: Vector3 } | null {
    const bodies = world.getAllBodies();
    const direction = VectorMath.normalize(VectorMath.subtract(endPos, startPos));
    const distance = VectorMath.distance(startPos, endPos);

    let closestHit: { body: CelestialBody; point: Vector3; distance: number } | null = null;

    for (const body of bodies) {
      const toBody = VectorMath.subtract(body.position, startPos);
      const projection = VectorMath.dot(toBody, direction);

      if (projection < 0 || projection > distance) continue;

      const closestPoint = VectorMath.add(startPos, VectorMath.scale(direction, projection));
      const distToBody = VectorMath.distance(closestPoint, body.position);

      if (distToBody <= body.radius) {
        const hitDistance = projection - Math.sqrt(body.radius * body.radius - distToBody * distToBody);
        if (!closestHit || hitDistance < closestHit.distance) {
          const hitPoint = VectorMath.add(startPos, VectorMath.scale(direction, hitDistance));
          closestHit = { body, point: hitPoint, distance: hitDistance };
        }
      }
    }

    return closestHit ? { body: closestHit.body, point: closestHit.point } : null;
  }

  /**
   * Detonate proximity fuse
   */
  private detonate(): void {
    if (this.detonated) return;

    this.detonated = true;
    this.alive = false;

    // Apply explosive damage to target
    if (this.target && this.shipLookup) {
      const targetShip = this.shipLookup(this.target.id);
      if (targetShip) {
        targetShip.applyExplosiveDamage(
          this.position,
          this.damage,
          this.proximityFuse
        );
      }
    }

    // Emit detonation event
    this.emit('detonated', {
      position: this.position,
      target: this.target,
      damage: this.damage
    });
  }

  /**
   * Handle direct impact
   */
  private handleImpact(target: CelestialBody, point: Vector3, world: World): void {
    // Apply both kinetic and explosive damage
    let damageResult: { damageApplied: number; breachCreated: boolean } | undefined;

    if (this.shipLookup) {
      const targetShip = this.shipLookup(target.id);
      if (targetShip) {
        // Kinetic impact
        targetShip.applyProjectileDamage(point, this.velocity, this.mass, this.damage * 0.5);

        // Explosive detonation
        targetShip.applyExplosiveDamage(point, this.damage, 10);  // 10m blast radius
      }
    }

    this.emit('hit', {
      target,
      point,
      damage: this.damage,
      damageResult
    });
  }

  /**
   * Set target
   */
  setTarget(target: CelestialBody): void {
    this.target = target;
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
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        callback(...args);
      }
    }
  }

  // Getters
  getPosition(): Vector3 {
    return { ...this.position };
  }

  getVelocity(): Vector3 {
    return { ...this.velocity };
  }

  isAlive(): boolean {
    return this.alive;
  }

  getFuelRemaining(): number {
    return this.fuel;
  }

  getTarget(): CelestialBody | undefined {
    return this.target;
  }
}

/**
 * Weapon System - manages all weapons on a ship
 */
export class WeaponSystem {
  private ship: IntegratedShip;
  private weapons: Map<string, Weapon> = new Map();
  private shipLookup?: (bodyId: string) => IntegratedShip | undefined;
  private world?: World;

  constructor(ship: IntegratedShip, world?: World) {
    this.ship = ship;
    this.world = world;
  }

  /**
   * Set ship lookup function for damage integration
   */
  setShipLookup(lookup: (bodyId: string) => IntegratedShip | undefined): void {
    this.shipLookup = lookup;
  }

  /**
   * Set world reference for raycasting
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Add weapon to ship
   */
  addWeapon(weapon: Weapon): void {
    this.weapons.set(weapon.id, weapon);
  }

  /**
   * Fire a weapon
   */
  fire(weaponId: string, aimDirection: Vector3, target?: CelestialBody): FiringResult {
    const weapon = this.weapons.get(weaponId);
    if (!weapon) {
      return { success: false, reason: 'weapon_not_found' };
    }

    // Check cooldown
    if (weapon.cooldown > 0) {
      return { success: false, reason: 'on_cooldown' };
    }

    // Check ammo
    if (weapon.ammoRemaining !== undefined && weapon.ammoRemaining <= 0) {
      return { success: false, reason: 'out_of_ammo' };
    }

    // Fire based on weapon type
    let projectile: Projectile | undefined;
    let missile: Missile | undefined;

    switch (weapon.type) {
      case WeaponType.RAILGUN:
      case WeaponType.COILGUN:
        projectile = this.fireProjectileWeapon(weapon, aimDirection);
        break;

      case WeaponType.LASER:
        // Instant hit - hitscan laser
        this.fireLaserWeapon(weapon, aimDirection);
        break;

      case WeaponType.MISSILE:
        // Guided missile
        missile = this.fireMissileWeapon(weapon, aimDirection, target);
        break;
    }

    // Consume ammo
    if (weapon.ammoRemaining !== undefined) {
      weapon.ammoRemaining--;
    }

    // Set cooldown
    weapon.cooldown = 60 / weapon.rateOfFire;

    return {
      success: true,
      projectile,
      missile
    };
  }

  /**
   * Fire laser weapon (hitscan)
   */
  private fireLaserWeapon(weapon: Weapon, aimDirection: Vector3): void {
    const shipPos = this.ship.getPosition();
    const laserOrigin = VectorMath.add(shipPos, weapon.mountPoint);
    const laserDirection = VectorMath.normalize(aimDirection);

    // Get the world from the ship (we'll need to access it via a getter)
    // For now, we'll emit an event with the laser data and let the simulation handle it
    // This allows for visual effects and hit detection

    // Perform raycast to find hit
    const hit = this.performRaycast(laserOrigin, laserDirection, weapon.range);

    if (hit) {
      // Apply thermal damage to target
      if (this.shipLookup) {
        const targetShip = this.shipLookup(hit.body.id);
        if (targetShip) {
          targetShip.applyThermalDamage(
            hit.point,
            weapon.damage,  // Thermal energy in joules
            0.1  // Beam duration in seconds (10 Hz firing rate = 0.1s pulse)
          );
        }
      }

      // Emit laser fire event
      this.ship.emit('laserFired', {
        origin: laserOrigin,
        direction: laserDirection,
        range: weapon.range,
        hit: hit.point,
        target: hit.body,
        damage: weapon.damage
      });
    } else {
      // Laser missed - emit event with max range
      this.ship.emit('laserFired', {
        origin: laserOrigin,
        direction: laserDirection,
        range: weapon.range,
        hit: null,
        target: null,
        damage: 0
      });
    }
  }

  /**
   * Perform raycast to find first intersection
   */
  private performRaycast(
    origin: Vector3,
    direction: Vector3,
    maxRange: number
  ): { body: CelestialBody; point: Vector3; distance: number } | null {
    if (!this.world) {
      return null;
    }

    const bodies = this.world.getAllBodies();
    let closestHit: { body: CelestialBody; point: Vector3; distance: number } | null = null;

    for (const body of bodies) {
      // Skip our own ship
      if (body.id === this.ship.id) continue;

      // Ray-sphere intersection
      const toBody = VectorMath.subtract(body.position, origin);
      const projection = VectorMath.dot(toBody, direction);

      // Check if body is ahead of us and within range
      if (projection < 0 || projection > maxRange) continue;

      const closestPoint = VectorMath.add(origin, VectorMath.scale(direction, projection));
      const distToBody = VectorMath.distance(closestPoint, body.position);

      if (distToBody <= body.radius) {
        // Calculate exact hit point on sphere surface
        const hitDistance = projection - Math.sqrt(body.radius * body.radius - distToBody * distToBody);

        if (hitDistance >= 0 && (!closestHit || hitDistance < closestHit.distance)) {
          const hitPoint = VectorMath.add(origin, VectorMath.scale(direction, hitDistance));
          closestHit = { body, point: hitPoint, distance: hitDistance };
        }
      }
    }

    return closestHit;
  }

  /**
   * Fire missile weapon
   */
  private fireMissileWeapon(weapon: Weapon, aimDirection: Vector3, target?: CelestialBody): Missile {
    // Calculate missile launch position
    const shipPos = this.ship.getPosition();
    const missilePos = VectorMath.add(shipPos, weapon.mountPoint);

    // Calculate initial velocity (ship velocity + small boost)
    const shipVel = this.ship.getVelocity();
    const launchVelocity = VectorMath.scale(
      VectorMath.normalize(aimDirection),
      50  // 50 m/s launch velocity
    );
    const missileVel = VectorMath.add(shipVel, launchVelocity);

    // Create missile
    const missile = new Missile({
      position: missilePos,
      velocity: missileVel,
      mass: weapon.projectileMass || 100,  // Default 100kg missile
      damage: weapon.damage,
      lifetime: 120,  // 2 minutes
      target,
      thrust: 5000,  // 5 kN thrust
      fuel: 20,  // 20 kg fuel
      fuelBurnRate: 0.5,  // 0.5 kg/s burn rate = 40 seconds burn time
      guidanceGain: 3,  // Navigation constant (3-5 is typical for proportional navigation)
      proximityFuse: 50,  // Detonate within 50m of target
      shipLookup: this.shipLookup,
      world: this.world
    });

    // Apply small recoil to ship
    const recoilMomentum = VectorMath.scale(
      launchVelocity,
      -(weapon.projectileMass || 100)
    );
    this.ship.applyImpulse(recoilMomentum);

    return missile;
  }

  /**
   * Fire projectile weapon (railgun/coilgun)
   */
  private fireProjectileWeapon(weapon: Weapon, aimDirection: Vector3): Projectile {
    // Calculate projectile position (mount point + ship position)
    const shipPos = this.ship.getPosition();
    const projectilePos = VectorMath.add(shipPos, weapon.mountPoint);

    // Calculate projectile velocity (ship velocity + weapon velocity)
    const shipVel = this.ship.getVelocity();
    const weaponVelocity = VectorMath.scale(
      VectorMath.normalize(aimDirection),
      weapon.projectileSpeed || 0
    );
    const projectileVel = VectorMath.add(shipVel, weaponVelocity);

    // Create projectile
    const projectile = new Projectile({
      position: projectilePos,
      velocity: projectileVel,
      mass: weapon.projectileMass || 1,
      damage: weapon.damage,
      lifetime: 60,  // 1 minute default
      shipLookup: this.shipLookup  // Pass ship lookup for damage integration
    });

    // Apply recoil to ship
    const recoilMomentum = VectorMath.scale(
      weaponVelocity,
      -(weapon.projectileMass || 1)
    );
    this.ship.applyImpulse(recoilMomentum);

    return projectile;
  }

  /**
   * Update all weapons
   */
  update(dt: number): void {
    for (const weapon of this.weapons.values()) {
      if (weapon.cooldown > 0) {
        weapon.cooldown = Math.max(0, weapon.cooldown - dt);
      }
    }
  }

  /**
   * Get weapon by ID
   */
  getWeapon(id: string): Weapon | undefined {
    return this.weapons.get(id);
  }

  /**
   * Get all weapons
   */
  getAllWeapons(): Weapon[] {
    return Array.from(this.weapons.values());
  }
}

/**
 * Projectile Manager - tracks all projectiles in the world
 */
export class ProjectileManager {
  private projectiles: Projectile[] = [];

  /**
   * Add projectile to tracking
   */
  addProjectile(projectile: Projectile): void {
    this.projectiles.push(projectile);
  }

  /**
   * Update all projectiles
   */
  update(dt: number, world: World): void {
    // Update all projectiles
    for (const projectile of this.projectiles) {
      if (projectile.isAlive()) {
        projectile.update(dt, world);
      }
    }

    // Remove dead projectiles
    this.projectiles = this.projectiles.filter(p => p.isAlive());
  }

  /**
   * Get projectile count
   */
  getProjectileCount(): number {
    return this.projectiles.length;
  }

  /**
   * Get all projectiles
   */
  getAllProjectiles(): Projectile[] {
    return [...this.projectiles];
  }
}

/**
 * Missile Manager - tracks all missiles in the world
 */
export class MissileManager {
  private missiles: Missile[] = [];

  /**
   * Add missile to tracking
   */
  addMissile(missile: Missile): void {
    this.missiles.push(missile);
  }

  /**
   * Update all missiles
   */
  update(dt: number, world: World): void {
    // Update all missiles
    for (const missile of this.missiles) {
      if (missile.isAlive()) {
        missile.update(dt, world);
      }
    }

    // Remove dead missiles
    this.missiles = this.missiles.filter(m => m.isAlive());
  }

  /**
   * Get missile count
   */
  getMissileCount(): number {
    return this.missiles.length;
  }

  /**
   * Get all missiles
   */
  getAllMissiles(): Missile[] {
    return [...this.missiles];
  }

  /**
   * Get missiles targeting a specific body
   */
  getMissilesTargeting(bodyId: string): Missile[] {
    return this.missiles.filter(m => m.getTarget()?.id === bodyId);
  }
}
