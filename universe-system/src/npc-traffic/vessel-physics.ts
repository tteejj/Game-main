/**
 * vessel-physics.ts
 * Physics simulation for NPC vessels
 *
 * Implements realistic vessel motion with:
 * - Position/velocity/acceleration integration
 * - Mass and inertia
 * - Thrust limits
 * - Numerical integration (RK4 for accuracy)
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';

/**
 * Physical state of a vessel
 */
export interface VesselPhysicsState {
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  mass: number;
  maxThrust: number;
  maxAcceleration: number;
}

/**
 * Physics engine for NPC vessels
 *
 * Uses RK4 integration for smooth, stable motion even at large time steps.
 * Handles thrust limits and realistic acceleration.
 */
export class VesselPhysics {
  // Current state
  public position: Vector3;
  public velocity: Vector3;
  private acceleration: Vector3;

  // Physical properties
  public mass: number; // kg
  public maxThrust: number; // N
  public maxAcceleration: number; // m/s²

  // Drag coefficient (for atmospheric flight or simplified space drag)
  private dragCoefficient: number = 0.001;

  constructor(
    position: Vector3 = new Vector3(0, 0, 0),
    velocity: Vector3 = new Vector3(0, 0, 0),
    mass: number = 50000, // Default: 50 tons
    maxThrust: number = 100000 // Default: 100 kN
  ) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.acceleration = new Vector3(0, 0, 0);
    this.mass = mass;
    this.maxThrust = maxThrust;
    this.maxAcceleration = maxThrust / mass; // F = ma => a = F/m
  }

  /**
   * Apply thrust force to vessel
   *
   * @param thrustVector Desired thrust vector (N)
   * @returns Actual thrust vector applied (clamped to maxThrust)
   */
  public applyThrust(thrustVector: Vector3): Vector3 {
    // Clamp to max thrust
    const thrustMagnitude = thrustVector.length();
    let actualThrust = thrustVector;

    if (thrustMagnitude > this.maxThrust) {
      actualThrust = thrustVector.normalize().scale(this.maxThrust);
    }

    // F = ma => a = F/m
    const thrustAcceleration = actualThrust.scale(1 / this.mass);
    this.acceleration = thrustAcceleration;

    return actualThrust;
  }

  /**
   * Apply acceleration directly (for simplified control)
   *
   * @param desiredAcceleration Desired acceleration vector (m/s²)
   * @returns Actual acceleration applied (clamped to maxAcceleration)
   */
  public applyAcceleration(desiredAcceleration: Vector3): Vector3 {
    const accelMagnitude = desiredAcceleration.length();

    if (accelMagnitude > this.maxAcceleration) {
      this.acceleration = desiredAcceleration.normalize().scale(this.maxAcceleration);
    } else {
      this.acceleration = desiredAcceleration.clone();
    }

    return this.acceleration;
  }

  /**
   * Update physics using RK4 integration
   *
   * RK4 provides 4th-order accuracy, much better than Euler integration
   * for the same time step size.
   *
   * @param dt Time step (seconds)
   */
  public update(dt: number): void {
    if (dt <= 0) return;

    // Use RK4 for better stability
    this.integrateRK4(dt);

    // Apply simple drag (optional, for realism)
    this.applyDrag(dt);
  }

  /**
   * Runge-Kutta 4th order integration
   *
   * More accurate than Euler, especially for curved trajectories
   */
  private integrateRK4(dt: number): void {
    const pos0 = this.position.clone();
    const vel0 = this.velocity.clone();
    const acc0 = this.acceleration.clone();

    // k1 = f(t, y)
    const k1_vel = acc0;
    const k1_pos = vel0;

    // k2 = f(t + dt/2, y + k1*dt/2)
    const vel_k2 = vel0.add(k1_vel.scale(dt / 2));
    const k2_vel = this.acceleration; // Acceleration is constant over this step
    const k2_pos = vel_k2;

    // k3 = f(t + dt/2, y + k2*dt/2)
    const vel_k3 = vel0.add(k2_vel.scale(dt / 2));
    const k3_vel = this.acceleration;
    const k3_pos = vel_k3;

    // k4 = f(t + dt, y + k3*dt)
    const vel_k4 = vel0.add(k3_vel.scale(dt));
    const k4_vel = this.acceleration;
    const k4_pos = vel_k4;

    // Combine: y_new = y + (dt/6) * (k1 + 2*k2 + 2*k3 + k4)
    this.velocity = vel0.add(
      k1_vel.add(k2_vel.scale(2)).add(k3_vel.scale(2)).add(k4_vel).scale(dt / 6)
    );

    this.position = pos0.add(
      k1_pos.add(k2_pos.scale(2)).add(k3_pos.scale(2)).add(k4_pos).scale(dt / 6)
    );
  }

  /**
   * Simple drag model to prevent infinite acceleration
   *
   * Drag force: F_drag = -0.5 * ρ * v² * C_d * A
   * Simplified: F_drag ≈ -k * v²
   */
  private applyDrag(dt: number): void {
    const speed = this.velocity.length();
    if (speed < 0.01) return; // Negligible at low speeds

    // Drag acceleration: a_drag = -k * v²
    const dragMagnitude = this.dragCoefficient * speed * speed;
    const dragDirection = this.velocity.normalize().scale(-1);
    const dragAcceleration = dragDirection.scale(dragMagnitude);

    // Apply drag to velocity
    const dragVelocityChange = dragAcceleration.scale(dt);

    // Don't let drag reverse direction
    if (dragVelocityChange.length() < speed) {
      this.velocity = this.velocity.add(dragVelocityChange);
    } else {
      this.velocity = new Vector3(0, 0, 0);
    }
  }

  /**
   * Get current kinetic energy (for diagnostics)
   *
   * KE = 0.5 * m * v²
   */
  public getKineticEnergy(): number {
    const speedSquared = this.velocity.dot(this.velocity);
    return 0.5 * this.mass * speedSquared;
  }

  /**
   * Get current momentum (for diagnostics)
   *
   * p = m * v
   */
  public getMomentum(): Vector3 {
    return this.velocity.scale(this.mass);
  }

  /**
   * Get distance to stop given current velocity and max deceleration
   *
   * Using: v² = v₀² + 2*a*d => d = -v₀² / (2*a)
   * (negative because deceleration)
   */
  public getStoppingDistance(): number {
    const speed = this.velocity.length();
    if (speed < 0.01) return 0;

    // d = v² / (2 * a_max)
    return (speed * speed) / (2 * this.maxAcceleration);
  }

  /**
   * Get time to stop given current velocity and max deceleration
   *
   * Using: v = v₀ + a*t => t = -v₀ / a
   */
  public getStoppingTime(): number {
    const speed = this.velocity.length();
    if (speed < 0.01) return 0;

    return speed / this.maxAcceleration;
  }

  /**
   * Calculate required thrust to reach target velocity in given time
   *
   * @param targetVelocity Desired final velocity
   * @param timeToReach Time to reach target (seconds)
   * @returns Required acceleration vector
   */
  public calculateRequiredAcceleration(targetVelocity: Vector3, timeToReach: number): Vector3 {
    if (timeToReach <= 0) return new Vector3(0, 0, 0);

    // a = (v_target - v_current) / t
    const deltaV = targetVelocity.subtract(this.velocity);
    return deltaV.scale(1 / timeToReach);
  }

  /**
   * Predict future position given current state and time
   *
   * Uses constant acceleration assumption:
   * x(t) = x₀ + v₀*t + 0.5*a*t²
   *
   * @param futureTime Time into future (seconds)
   * @returns Predicted position
   */
  public predictPosition(futureTime: number): Vector3 {
    // x = x₀ + v*t + 0.5*a*t²
    return this.position
      .add(this.velocity.scale(futureTime))
      .add(this.acceleration.scale(0.5 * futureTime * futureTime));
  }

  /**
   * Predict future velocity given current state and time
   *
   * v(t) = v₀ + a*t
   *
   * @param futureTime Time into future (seconds)
   * @returns Predicted velocity
   */
  public predictVelocity(futureTime: number): Vector3 {
    // v = v₀ + a*t
    return this.velocity.add(this.acceleration.scale(futureTime));
  }

  /**
   * Get current state snapshot
   */
  public getState(): VesselPhysicsState {
    return {
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      acceleration: this.acceleration.clone(),
      mass: this.mass,
      maxThrust: this.maxThrust,
      maxAcceleration: this.maxAcceleration
    };
  }

  /**
   * Set state from snapshot
   */
  public setState(state: VesselPhysicsState): void {
    this.position = state.position.clone();
    this.velocity = state.velocity.clone();
    this.acceleration = state.acceleration.clone();
    this.mass = state.mass;
    this.maxThrust = state.maxThrust;
    this.maxAcceleration = state.maxAcceleration;
  }

  /**
   * Clone this physics state
   */
  public clone(): VesselPhysics {
    const clone = new VesselPhysics(
      this.position,
      this.velocity,
      this.mass,
      this.maxThrust
    );
    clone.acceleration = this.acceleration.clone();
    return clone;
  }
}

/**
 * Preset vessel configurations
 */
export class VesselPresets {
  /**
   * Small cargo shuttle (agile)
   */
  static createCargoShuttle(position: Vector3): VesselPhysics {
    return new VesselPhysics(
      position,
      new Vector3(0, 0, 0),
      20000, // 20 tons
      80000  // 80 kN thrust
    );
  }

  /**
   * Large cargo freighter (slow, heavy)
   */
  static createCargoFreighter(position: Vector3): VesselPhysics {
    return new VesselPhysics(
      position,
      new Vector3(0, 0, 0),
      500000, // 500 tons
      500000  // 500 kN thrust (only 1 m/s² acceleration)
    );
  }

  /**
   * Mining vessel (moderate)
   */
  static createMiningVessel(position: Vector3): VesselPhysics {
    return new VesselPhysics(
      position,
      new Vector3(0, 0, 0),
      100000, // 100 tons
      200000  // 200 kN thrust
    );
  }

  /**
   * Patrol ship (fast, agile)
   */
  static createPatrolShip(position: Vector3): VesselPhysics {
    return new VesselPhysics(
      position,
      new Vector3(0, 0, 0),
      30000,  // 30 tons
      150000  // 150 kN thrust (5 m/s² acceleration!)
    );
  }

  /**
   * Passenger liner (large, moderate speed)
   */
  static createPassengerLiner(position: Vector3): VesselPhysics {
    return new VesselPhysics(
      position,
      new Vector3(0, 0, 0),
      300000, // 300 tons
      600000  // 600 kN thrust
    );
  }

  /**
   * Pirate vessel (fast, aggressive)
   */
  static createPirateVessel(position: Vector3): VesselPhysics {
    return new VesselPhysics(
      position,
      new Vector3(0, 0, 0),
      40000,  // 40 tons
      200000  // 200 kN thrust (5 m/s² acceleration)
    );
  }
}
