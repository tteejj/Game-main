/**
 * Propellant Slosh Dynamics Module
 *
 * Implements:
 * - Fuel sloshing in tanks (pendulum/spring-mass-damper model)
 * - Dynamic center of mass shift
 * - Torque from moving propellant
 * - Slosh damping (baffles)
 *
 * Gameplay Impact:
 * - Partially-full tanks are harder to control
 * - Need to account for fuel slosh during maneuvers
 * - Baffles reduce slosh but add mass
 * - RCS must compensate for unpredictable torques
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PropellantTank {
  id: string;
  position: Vector3;           // m (tank center in body frame)
  capacity: number;            // kg (max propellant mass)
  currentMass: number;         // kg (current propellant mass)
  radius: number;              // m (tank radius, assumed cylindrical)
  height: number;              // m (tank height)
  axis: Vector3;               // Tank long axis (unit vector, body frame)
  baffleDamping: number;       // 0-1 (0=no baffles, 1=fully damped)
}

export interface SloshState {
  tankId: string;
  sloshMass: number;           // kg (mass participating in slosh)
  sloshPosition: Vector3;      // m (displaced from tank center, body frame)
  sloshVelocity: Vector3;      // m/s (slosh velocity, body frame)
  centerOfMassShift: Vector3;  // m (contribution to overall CoM shift)
}

export interface SloshForces {
  force: Vector3;              // N (force on tank walls, body frame)
  torque: Vector3;             // N·m (torque about ship CoM, body frame)
  comShift: Vector3;           // m (total CoM shift from all tanks)
  totalSloshMass: number;      // kg (total mass sloshing)
  damping: number;             // Energy dissipated (W)
}

export class PropellantSloshPhysics {
  private sloshStates: Map<string, SloshState> = new Map();

  /**
   * Initialize slosh state for a tank
   */
  initializeTank(tank: PropellantTank): void {
    // Slosh mass: approximate as fraction of propellant
    // More mass sloshes when tank is partially full
    const fillFraction = tank.currentMass / tank.capacity;
    const sloshFraction = this.getSloshFraction(fillFraction);
    const sloshMass = tank.currentMass * sloshFraction;

    this.sloshStates.set(tank.id, {
      tankId: tank.id,
      sloshMass,
      sloshPosition: { x: 0, y: 0, z: 0 },  // Initially at rest
      sloshVelocity: { x: 0, y: 0, z: 0 },
      centerOfMassShift: { x: 0, y: 0, z: 0 }
    });
  }

  /**
   * Calculate slosh fraction based on fill level
   * Maximum slosh occurs at ~50% fill
   */
  private getSloshFraction(fillFraction: number): number {
    if (fillFraction < 0.05 || fillFraction > 0.95) {
      return 0.05;  // Minimal slosh when nearly empty/full
    }

    // Parabolic: peaks at 50%
    // f(x) = 4x(1-x), max at x=0.5
    return 0.3 * 4 * fillFraction * (1 - fillFraction);
  }

  /**
   * Update slosh dynamics
   *
   * Models each tank as a spring-mass-damper (pendulum analog)
   * F = -k*x - c*v
   * where k depends on surface tension and geometry
   */
  updateSlosh(
    tanks: PropellantTank[],
    angularVelocity: Vector3,    // rad/s (ship angular velocity, body frame)
    linearAcceleration: Vector3,  // m/s² (ship acceleration, body frame)
    dt: number
  ): SloshForces {
    let totalForce = { x: 0, y: 0, z: 0 };
    let totalTorque = { x: 0, y: 0, z: 0 };
    let totalCoMShift = { x: 0, y: 0, z: 0 };
    let totalSloshMass = 0;
    let totalDamping = 0;

    for (const tank of tanks) {
      // Initialize if needed
      if (!this.sloshStates.has(tank.id)) {
        this.initializeTank(tank);
      }

      const state = this.sloshStates.get(tank.id)!;

      // Update slosh mass based on current fill
      const fillFraction = tank.currentMass / tank.capacity;
      const sloshFraction = this.getSloshFraction(fillFraction);
      state.sloshMass = tank.currentMass * sloshFraction;

      if (state.sloshMass < 1) continue;  // Skip if negligible

      // Natural frequency: ω = √(g/L) for pendulum
      // Use effective gravity = local gravity + ship acceleration
      const effectiveG = this.vectorMagnitude(linearAcceleration) || 1.62;  // Moon gravity
      const pendulumLength = tank.radius;  // Characteristic length
      const omega = Math.sqrt(effectiveG / pendulumLength);

      // Spring constant: k = m * ω²
      const k = state.sloshMass * omega * omega;

      // Damping coefficient (depends on baffles)
      const baseDamping = 0.1;  // Minimal natural damping
      const baffleDamping = tank.baffleDamping * 2.0;  // Baffles increase damping
      const dampingRatio = baseDamping + baffleDamping;
      const c = 2 * dampingRatio * state.sloshMass * omega;

      // Forces on slosh mass:
      // 1. Restoring force (spring): -k * x
      // 2. Damping force: -c * v
      // 3. Pseudo-forces from ship acceleration and rotation

      // Restoring force
      const springForce = {
        x: -k * state.sloshPosition.x,
        y: -k * state.sloshPosition.y,
        z: -k * state.sloshPosition.z
      };

      // Damping force
      const dampingForce = {
        x: -c * state.sloshVelocity.x,
        y: -c * state.sloshVelocity.y,
        z: -c * state.sloshVelocity.z
      };

      // Centrifugal force from ship rotation: ω × (ω × r)
      const omegaCrossR = this.crossProduct(angularVelocity, state.sloshPosition);
      const centrifugal = this.crossProduct(angularVelocity, omegaCrossR);
      const centrifugalForce = {
        x: state.sloshMass * centrifugal.x,
        y: state.sloshMass * centrifugal.y,
        z: state.sloshMass * centrifugal.z
      };

      // Linear acceleration force (pseudo-force in accelerating frame)
      const accelForce = {
        x: -state.sloshMass * linearAcceleration.x,
        y: -state.sloshMass * linearAcceleration.y,
        z: -state.sloshMass * linearAcceleration.z
      };

      // Total force on slosh mass
      const netForce = {
        x: springForce.x + dampingForce.x + centrifugalForce.x + accelForce.x,
        y: springForce.y + dampingForce.y + centrifugalForce.y + accelForce.y,
        z: springForce.z + dampingForce.z + centrifugalForce.z + accelForce.z
      };

      // Acceleration of slosh mass: a = F / m
      const sloshAccel = {
        x: netForce.x / state.sloshMass,
        y: netForce.y / state.sloshMass,
        z: netForce.z / state.sloshMass
      };

      // Update slosh velocity and position (simple Euler integration)
      state.sloshVelocity.x += sloshAccel.x * dt;
      state.sloshVelocity.y += sloshAccel.y * dt;
      state.sloshVelocity.z += sloshAccel.z * dt;

      state.sloshPosition.x += state.sloshVelocity.x * dt;
      state.sloshPosition.y += state.sloshVelocity.y * dt;
      state.sloshPosition.z += state.sloshVelocity.z * dt;

      // Limit slosh displacement (can't exceed tank radius)
      const sloshDist = this.vectorMagnitude(state.sloshPosition);
      const maxSlosh = tank.radius * 0.8;  // 80% of radius
      if (sloshDist > maxSlosh) {
        const scale = maxSlosh / sloshDist;
        state.sloshPosition.x *= scale;
        state.sloshPosition.y *= scale;
        state.sloshPosition.z *= scale;
        // Dampen velocity on collision with wall
        state.sloshVelocity.x *= 0.5;
        state.sloshVelocity.y *= 0.5;
        state.sloshVelocity.z *= 0.5;
      }

      // Reaction force on tank (equal and opposite)
      const tankForce = {
        x: -netForce.x,
        y: -netForce.y,
        z: -netForce.z
      };

      totalForce.x += tankForce.x;
      totalForce.y += tankForce.y;
      totalForce.z += tankForce.z;

      // Torque: r × F (distance from ship CoM to slosh mass)
      const sloshGlobalPos = {
        x: tank.position.x + state.sloshPosition.x,
        y: tank.position.y + state.sloshPosition.y,
        z: tank.position.z + state.sloshPosition.z
      };

      const torque = this.crossProduct(sloshGlobalPos, tankForce);
      totalTorque.x += torque.x;
      totalTorque.y += torque.y;
      totalTorque.z += torque.z;

      // CoM shift contribution
      state.centerOfMassShift.x = sloshGlobalPos.x * state.sloshMass;
      state.centerOfMassShift.y = sloshGlobalPos.y * state.sloshMass;
      state.centerOfMassShift.z = sloshGlobalPos.z * state.sloshMass;

      totalCoMShift.x += state.centerOfMassShift.x;
      totalCoMShift.y += state.centerOfMassShift.y;
      totalCoMShift.z += state.centerOfMassShift.z;

      totalSloshMass += state.sloshMass;

      // Energy dissipation: P = c * v²
      const dampingPower = c * this.dotProduct(state.sloshVelocity, state.sloshVelocity);
      totalDamping += dampingPower;
    }

    // Normalize CoM shift by total mass
    if (totalSloshMass > 0) {
      totalCoMShift.x /= totalSloshMass;
      totalCoMShift.y /= totalSloshMass;
      totalCoMShift.z /= totalSloshMass;
    }

    return {
      force: totalForce,
      torque: totalTorque,
      comShift: totalCoMShift,
      totalSloshMass,
      damping: totalDamping
    };
  }

  /**
   * Get slosh state for telemetry
   */
  getSloshState(tankId: string): SloshState | null {
    return this.sloshStates.get(tankId) || null;
  }

  /**
   * Get all slosh states
   */
  getAllSloshStates(): SloshState[] {
    return Array.from(this.sloshStates.values());
  }

  /**
   * Calculate slosh severity (0-1) for UI indicator
   */
  getSloshSeverity(tankId: string, tank: PropellantTank): number {
    const state = this.sloshStates.get(tankId);
    if (!state) return 0;

    const maxDisplacement = tank.radius * 0.8;
    const displacement = this.vectorMagnitude(state.sloshPosition);
    return Math.min(1, displacement / maxDisplacement);
  }

  /**
   * Reset slosh state (e.g., after tank is refilled or ship lands)
   */
  resetSlosh(tankId: string): void {
    const state = this.sloshStates.get(tankId);
    if (state) {
      state.sloshPosition = { x: 0, y: 0, z: 0 };
      state.sloshVelocity = { x: 0, y: 0, z: 0 };
      state.centerOfMassShift = { x: 0, y: 0, z: 0 };
    }
  }

  /**
   * Clear all slosh states
   */
  clearAll(): void {
    this.sloshStates.clear();
  }

  // ========== Vector Math ==========

  private dotProduct(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private crossProduct(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  private vectorMagnitude(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }
}

/**
 * Helper: Estimate optimal baffle configuration
 *
 * Gameplay: Players can choose baffle mass vs control difficulty
 */
export function calculateOptimalBaffles(
  tankCapacity: number,        // kg
  desiredDamping: number       // 0-1 (0=none, 1=maximum)
): {
  baffleMass: number;          // kg (added mass from baffles)
  dampingFactor: number;       // 0-1 (achieved damping)
  recommendation: string;
} {
  // Baffles typically add 1-5% of tank capacity in mass
  const baffleMass = tankCapacity * 0.01 * desiredDamping * 5;
  const dampingFactor = desiredDamping;

  let recommendation = '';
  if (desiredDamping < 0.3) {
    recommendation = 'Low damping: Lightweight but harder to control';
  } else if (desiredDamping < 0.7) {
    recommendation = 'Medium damping: Balanced approach';
  } else {
    recommendation = 'High damping: Heavier but stable';
  }

  return {
    baffleMass,
    dampingFactor,
    recommendation
  };
}
