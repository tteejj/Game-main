/**
 * npc-ship.ts
 * NPC ship entity integrating physics, navigation, and AI
 *
 * Brings together:
 * - VesselPhysics for movement
 * - VesselNavigator for pathfinding
 * - CollisionAvoidance for safety
 * - Ship behavior and AI
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';
import { VesselPhysics, VesselPresets } from './vessel-physics';
import { VesselNavigator, Waypoint, NavigationObstacle } from './vessel-navigator';
import { CollisionAvoidance } from './collision-avoidance';
import { ITrackableVessel } from './traffic-manager';

/**
 * Ship types
 */
export enum ShipType {
  CARGO_FREIGHTER = 'CARGO_FREIGHTER',
  CARGO_SHUTTLE = 'CARGO_SHUTTLE',
  MINING_VESSEL = 'MINING_VESSEL',
  PATROL_SHIP = 'PATROL_SHIP',
  PASSENGER_LINER = 'PASSENGER_LINER',
  PIRATE = 'PIRATE',
  RESEARCH = 'RESEARCH',
  SALVAGE = 'SALVAGE'
}

/**
 * Ship status
 */
export enum ShipStatus {
  IDLE = 'IDLE',
  TRAVELING = 'TRAVELING',
  DOCKING = 'DOCKING',
  DOCKED = 'DOCKED',
  MINING = 'MINING',
  PATROLLING = 'PATROLLING',
  ATTACKING = 'ATTACKING',
  FLEEING = 'FLEEING',
  DISABLED = 'DISABLED'
}

/**
 * Cargo item
 */
export interface CargoItem {
  type: string;
  amount: number; // tons
  value: number; // credits per ton
}

/**
 * Ship state snapshot
 */
export interface ShipState {
  id: string;
  name: string;
  type: ShipType;
  status: ShipStatus;
  position: Vector3;
  velocity: Vector3;
  speed: number;
  destination: Vector3 | null;
  destinationName: string | null;
  distanceToDestination: number;
  eta: number; // seconds
  cargo: CargoItem[];
  cargoCapacity: number;
  cargoMass: number;
  health: number; // 0-1
  fuel: number; // 0-1
}

/**
 * NPC Ship
 *
 * Autonomous vessel with physics, navigation, and behavior AI
 */
export class NPCShip implements ITrackableVessel {
  // Identity
  public readonly id: string;
  public name: string;
  public type: ShipType;
  public status: ShipStatus = ShipStatus.IDLE;

  // Core systems
  private physics: VesselPhysics;
  private navigator: VesselNavigator;
  private collisionAvoidance: CollisionAvoidance;

  // Ship properties
  public cargo: CargoItem[] = [];
  public cargoCapacity: number = 100; // tons
  public health: number = 1.0; // 0-1
  public fuel: number = 1.0; // 0-1

  // Destination tracking
  public destinationName: string | null = null;
  public originName: string | null = null;

  // Behavior parameters
  private aggressiveness: number = 0; // 0-1, affects combat behavior
  private caution: number = 0.5; // 0-1, affects collision avoidance sensitivity

  // Internal state
  private avoidanceManeuverTimeRemaining: number = 0;

  constructor(
    id: string,
    name: string,
    type: ShipType,
    position: Vector3 = new Vector3(0, 0, 0),
    velocity: Vector3 = new Vector3(0, 0, 0)
  ) {
    this.id = id;
    this.name = name;
    this.type = type;

    // Create physics based on ship type
    this.physics = this.createPhysicsForType(type, position, velocity);

    // Create navigator
    this.navigator = new VesselNavigator();

    // Create collision avoidance
    this.collisionAvoidance = new CollisionAvoidance();

    // Set cargo capacity based on type
    this.cargoCapacity = this.getCargoCapacityForType(type);
  }

  /**
   * Create physics configuration for ship type
   */
  private createPhysicsForType(type: ShipType, position: Vector3, velocity: Vector3): VesselPhysics {
    switch (type) {
      case ShipType.CARGO_FREIGHTER:
        return VesselPresets.createCargoFreighter(position);
      case ShipType.CARGO_SHUTTLE:
        return VesselPresets.createCargoShuttle(position);
      case ShipType.MINING_VESSEL:
        return VesselPresets.createMiningVessel(position);
      case ShipType.PATROL_SHIP:
        return VesselPresets.createPatrolShip(position);
      case ShipType.PASSENGER_LINER:
        return VesselPresets.createPassengerLiner(position);
      case ShipType.PIRATE:
        return VesselPresets.createPirateVessel(position);
      case ShipType.RESEARCH:
        return new VesselPhysics(position, velocity, 60000, 120000);
      case ShipType.SALVAGE:
        return new VesselPhysics(position, velocity, 80000, 160000);
      default:
        return new VesselPhysics(position, velocity);
    }
  }

  /**
   * Get cargo capacity for ship type
   */
  private getCargoCapacityForType(type: ShipType): number {
    switch (type) {
      case ShipType.CARGO_FREIGHTER:
        return 1000;
      case ShipType.CARGO_SHUTTLE:
        return 50;
      case ShipType.MINING_VESSEL:
        return 200;
      case ShipType.SALVAGE:
        return 150;
      default:
        return 0;
    }
  }

  /**
   * Set destination (single waypoint)
   */
  public setDestination(position: Vector3, name?: string, arrivalRadius: number = 1000): void {
    this.navigator.setDestination(position, arrivalRadius);
    this.destinationName = name || null;
    this.status = ShipStatus.TRAVELING;
  }

  /**
   * Set route (multiple waypoints)
   */
  public setRoute(waypoints: Waypoint[], destinationName?: string): void {
    this.navigator.setRoute(waypoints);
    this.destinationName = destinationName || null;
    this.status = ShipStatus.TRAVELING;
  }

  /**
   * Update ship AI and physics
   *
   * @param dt Time step (seconds)
   * @param nearbyShips Other ships for collision avoidance
   * @param obstacles Static obstacles
   */
  public update(dt: number, nearbyShips: NPCShip[] = [], obstacles: NavigationObstacle[] = []): void {
    // Update based on status
    switch (this.status) {
      case ShipStatus.TRAVELING:
        this.updateTraveling(dt, nearbyShips, obstacles);
        break;
      case ShipStatus.PATROLLING:
        this.updatePatrolling(dt, nearbyShips, obstacles);
        break;
      case ShipStatus.MINING:
        this.updateMining(dt);
        break;
      case ShipStatus.DOCKED:
        // Do nothing while docked
        break;
      case ShipStatus.IDLE:
        // Idle - just apply physics
        this.physics.applyAcceleration(new Vector3(0, 0, 0));
        this.physics.update(dt);
        break;
      default:
        this.physics.update(dt);
    }

    // Consume fuel based on thrust
    this.consumeFuel(dt);
  }

  /**
   * Update traveling behavior
   */
  private updateTraveling(dt: number, nearbyShips: NPCShip[], obstacles: NavigationObstacle[]): void {
    // Navigate toward destination
    const otherPhysics = nearbyShips.map(s => s.physics);

    // Convert obstacles for navigator
    const navObstacles = [
      ...obstacles,
      ...otherPhysics.map(p => ({
        position: p.position,
        radius: 500,
        repulsionStrength: 1.0
      }))
    ];

    const navResult = this.navigator.navigate(this.physics, navObstacles, dt);

    // Check if arrived
    if (navResult.hasArrived) {
      if (this.navigator.isComplete()) {
        this.status = ShipStatus.IDLE;
        this.physics.applyAcceleration(new Vector3(0, 0, 0));
      }
      this.physics.update(dt);
      return;
    }

    // Collision avoidance
    let finalAcceleration = navResult.desiredAcceleration;

    // Check for collision threats
    const avoidanceManeuver = this.collisionAvoidance.calculateCombinedAvoidance(
      this.physics,
      otherPhysics
    );

    if (avoidanceManeuver.type !== 'NONE') {
      // Blend navigation and avoidance based on severity
      const avoidanceWeight = avoidanceManeuver.severity * this.caution;
      const navigationWeight = 1 - avoidanceWeight;

      finalAcceleration = navResult.desiredAcceleration
        .scale(navigationWeight)
        .add(avoidanceManeuver.avoidanceAcceleration.scale(avoidanceWeight));

      this.avoidanceManeuverTimeRemaining = avoidanceManeuver.maneuverDuration;
    }

    // Apply acceleration
    this.physics.applyAcceleration(finalAcceleration);
    this.physics.update(dt);

    // Decrement avoidance timer
    if (this.avoidanceManeuverTimeRemaining > 0) {
      this.avoidanceManeuverTimeRemaining -= dt;
    }
  }

  /**
   * Update patrolling behavior
   */
  private updatePatrolling(dt: number, nearbyShips: NPCShip[], obstacles: NavigationObstacle[]): void {
    // Patrol is just traveling with looping waypoints
    this.updateTraveling(dt, nearbyShips, obstacles);

    // If completed route, restart
    if (this.navigator.isComplete()) {
      // This would need patrol route logic
      this.status = ShipStatus.IDLE;
    }
  }

  /**
   * Update mining behavior
   */
  private updateMining(dt: number): void {
    // Stay stationary while mining
    this.physics.applyAcceleration(new Vector3(0, 0, 0));

    // Slowly brake to zero velocity
    if (this.physics.velocity.length() > 0.1) {
      const braking = this.physics.velocity.normalize().scale(-this.physics.maxAcceleration * 0.5);
      this.physics.applyAcceleration(braking);
    }

    this.physics.update(dt);

    // Mining would accumulate cargo over time
    // (Implementation depends on game resource system)
  }

  /**
   * Consume fuel based on acceleration
   */
  private consumeFuel(dt: number): void {
    // Fuel consumption proportional to thrust used
    const accelMagnitude = this.physics.getState().acceleration.length();
    const accelFraction = accelMagnitude / this.physics.maxAcceleration;

    // Consume fuel (arbitrary rate)
    const fuelConsumptionRate = 0.001; // 0.1% per second at max thrust
    this.fuel -= fuelConsumptionRate * accelFraction * dt;
    this.fuel = Math.max(0, this.fuel);

    // If out of fuel, disable
    if (this.fuel <= 0) {
      this.status = ShipStatus.DISABLED;
    }
  }

  /**
   * Add cargo
   */
  public addCargo(cargo: CargoItem): boolean {
    const currentMass = this.getCargoMass();

    if (currentMass + cargo.amount > this.cargoCapacity) {
      return false; // Over capacity
    }

    // Check if already have this cargo type
    const existing = this.cargo.find(c => c.type === cargo.type);
    if (existing) {
      existing.amount += cargo.amount;
    } else {
      this.cargo.push({ ...cargo });
    }

    return true;
  }

  /**
   * Remove cargo
   */
  public removeCargo(type: string, amount: number): CargoItem | null {
    const existing = this.cargo.find(c => c.type === type);
    if (!existing) return null;

    const removedAmount = Math.min(amount, existing.amount);
    existing.amount -= removedAmount;

    // Remove if empty
    if (existing.amount <= 0) {
      const index = this.cargo.indexOf(existing);
      this.cargo.splice(index, 1);
    }

    return {
      type,
      amount: removedAmount,
      value: existing.value
    };
  }

  /**
   * Get total cargo mass
   */
  public getCargoMass(): number {
    return this.cargo.reduce((sum, c) => sum + c.amount, 0);
  }

  /**
   * Get cargo value
   */
  public getCargoValue(): number {
    return this.cargo.reduce((sum, c) => sum + c.amount * c.value, 0);
  }

  /**
   * Check if cargo hold is full
   */
  public isCargoFull(): boolean {
    return this.getCargoMass() >= this.cargoCapacity;
  }

  /**
   * Get current state snapshot
   */
  public getState(): ShipState {
    const currentWaypoint = this.navigator.getCurrentWaypoint();
    const destination = currentWaypoint ? currentWaypoint.position : null;
    const distanceToDestination = destination
      ? this.position.subtract(destination).length()
      : 0;

    // Estimate ETA
    const speed = this.velocity.length();
    const eta = speed > 0 ? distanceToDestination / speed : Infinity;

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      speed,
      destination: destination ? destination.clone() : null,
      destinationName: this.destinationName,
      distanceToDestination,
      eta,
      cargo: [...this.cargo],
      cargoCapacity: this.cargoCapacity,
      cargoMass: this.getCargoMass(),
      health: this.health,
      fuel: this.fuel
    };
  }

  /**
   * ITrackableVessel interface
   */
  public get position(): Vector3 {
    return this.physics.position;
  }

  public get velocity(): Vector3 {
    return this.physics.velocity;
  }

  /**
   * Get physics system
   */
  public getPhysics(): VesselPhysics {
    return this.physics;
  }

  /**
   * Get navigator
   */
  public getNavigator(): VesselNavigator {
    return this.navigator;
  }

  /**
   * Dock at station
   */
  public dock(): void {
    this.status = ShipStatus.DOCKED;
    this.physics.velocity = new Vector3(0, 0, 0);
    this.physics.applyAcceleration(new Vector3(0, 0, 0));
  }

  /**
   * Undock from station
   */
  public undock(): void {
    this.status = ShipStatus.IDLE;
  }

  /**
   * Take damage
   */
  public takeDamage(amount: number): void {
    this.health -= amount;
    this.health = Math.max(0, this.health);

    if (this.health <= 0) {
      this.status = ShipStatus.DISABLED;
    }
  }

  /**
   * Repair ship
   */
  public repair(amount: number): void {
    this.health += amount;
    this.health = Math.min(1, this.health);

    if (this.health > 0 && this.status === ShipStatus.DISABLED) {
      this.status = ShipStatus.IDLE;
    }
  }

  /**
   * Refuel ship
   */
  public refuel(amount: number): void {
    this.fuel += amount;
    this.fuel = Math.min(1, this.fuel);
  }

  /**
   * Set behavior parameters
   */
  public setBehavior(aggressiveness: number, caution: number): void {
    this.aggressiveness = Math.max(0, Math.min(1, aggressiveness));
    this.caution = Math.max(0, Math.min(1, caution));
  }

  /**
   * Generate traffic chatter message
   */
  public generateChatter(): string {
    const messages: Record<ShipStatus, string[]> = {
      [ShipStatus.IDLE]: [
        `${this.name} standing by`,
        `${this.name} awaiting orders`
      ],
      [ShipStatus.TRAVELING]: [
        `${this.name} en route to ${this.destinationName}`,
        `This is ${this.name}, inbound with ${this.getCargoMass().toFixed(0)}t cargo`,
        `${this.name} requesting priority clearance`
      ],
      [ShipStatus.DOCKING]: [
        `${this.name} requesting docking clearance`,
        `${this.name} final approach initiated`
      ],
      [ShipStatus.DOCKED]: [
        `${this.name} docked, beginning offload`,
        `${this.name} secured at station`
      ],
      [ShipStatus.MINING]: [
        `${this.name} reporting: high-grade ore strike`,
        `${this.name} mining operations nominal`
      ],
      [ShipStatus.PATROLLING]: [
        `${this.name} on patrol, all clear`,
        `${this.name} patrol route delta-seven`
      ],
      [ShipStatus.ATTACKING]: [
        `${this.name} engaging hostile!`,
        `${this.name} weapons hot!`
      ],
      [ShipStatus.FLEEING]: [
        `${this.name} taking damage, breaking off!`,
        `Mayday! ${this.name} under attack!`
      ],
      [ShipStatus.DISABLED]: [
        `${this.name} critical systems failure`,
        `Mayday! ${this.name} life support failing!`
      ]
    };

    const statusMessages = messages[this.status] || [];
    if (statusMessages.length === 0) return '';

    return statusMessages[Math.floor(Math.random() * statusMessages.length)];
  }
}
