/**
 * Enhanced Collision Physics Module
 *
 * Implements:
 * - Realistic impulse-based collision response
 * - Energy transfer (kinetic energy dissipation)
 * - Spin-up from off-center impacts
 * - Debris generation from high-energy collisions
 * - Material deformation and structural damage
 *
 * Gameplay Impact:
 * - Collisions feel realistic with proper momentum transfer
 * - Ships spin when hit off-center (combat!)
 * - High-speed impacts generate debris fields
 * - Structural damage accumulates over multiple impacts
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface CollisionBody {
  // Dynamics
  position: Vector3;            // m (center of mass)
  velocity: Vector3;            // m/s
  angularVelocity: Vector3;     // rad/s (body frame)
  attitude: Quaternion;         // orientation

  // Mass properties
  mass: number;                 // kg
  momentOfInertia: Vector3;     // kg·m² (Ix, Iy, Iz)

  // Material properties
  restitution: number;          // 0-1 (0=perfectly inelastic, 1=perfectly elastic)
  friction: number;             // Coefficient of friction
  hardness: number;             // 0-1 (resistance to deformation)
  structuralIntegrity: number;  // 0-1 (1=pristine, 0=destroyed)
}

export interface CollisionPoint {
  position: Vector3;            // m (world space)
  normal: Vector3;              // Unit vector (from body A to body B)
  penetrationDepth: number;     // m (how far objects overlap)
  relativeVelocity: Vector3;    // m/s (velocity of B relative to A at contact)
}

export interface CollisionResult {
  // Impulses applied
  linearImpulseA: Vector3;      // N·s (change in momentum for body A)
  linearImpulseB: Vector3;      // N·s
  angularImpulseA: Vector3;     // N·m·s (change in angular momentum, body frame)
  angularImpulseB: Vector3;     // N·m·s

  // Energy
  kineticEnergyBefore: number;  // J
  kineticEnergyAfter: number;   // J
  energyDissipated: number;     // J (converted to heat/deformation)

  // Damage
  damageA: number;              // 0-1 (integrity loss for body A)
  damageB: number;              // 0-1
  debrisGenerated: DebrisParticle[];

  // Metadata
  impactSpeed: number;          // m/s (relative velocity magnitude)
  impactForce: number;          // N (peak force)
  isDestructive: boolean;       // Whether collision destroys either body
}

export interface DebrisParticle {
  position: Vector3;            // m (world space)
  velocity: Vector3;            // m/s
  angularVelocity: Vector3;     // rad/s
  mass: number;                 // kg
  radius: number;               // m (approximate size)
  temperature: number;          // K (from impact heating)
}

export class EnhancedCollisionPhysics {
  // Physics constants
  private readonly DEBRIS_THRESHOLD = 1e6;      // J (energy needed to generate debris)
  private readonly DAMAGE_THRESHOLD = 1e5;      // J (energy needed to cause damage)
  private readonly FRAGMENTATION_FACTOR = 0.1;  // Fraction of mass that becomes debris

  /**
   * Resolve collision between two bodies
   *
   * Uses impulse-based collision response with friction
   */
  resolveCollision(
    bodyA: CollisionBody,
    bodyB: CollisionBody,
    contact: CollisionPoint,
    dt: number
  ): CollisionResult {
    // Calculate pre-collision kinetic energy
    const keBefore = this.calculateKineticEnergy(bodyA) + this.calculateKineticEnergy(bodyB);

    // Relative velocity at contact point
    const vRelBefore = this.getVelocityAtPoint(bodyB, contact.position);
    const vRelA = this.getVelocityAtPoint(bodyA, contact.position);
    const relVel = {
      x: vRelBefore.x - vRelA.x,
      y: vRelBefore.y - vRelA.y,
      z: vRelBefore.z - vRelA.z
    };

    const impactSpeed = this.vectorMagnitude(relVel);

    // Normal and tangent components
    const vn = this.dotProduct(relVel, contact.normal);  // Normal velocity (closing speed)
    const normalVel = this.scaleVector(contact.normal, vn);
    const tangentVel = {
      x: relVel.x - normalVel.x,
      y: relVel.y - normalVel.y,
      z: relVel.z - normalVel.z
    };

    // Don't resolve if separating
    if (vn > 0) {
      return this.createEmptyResult(keBefore, impactSpeed);
    }

    // Contact points relative to CoM (body frame for each body)
    const rA = this.subtractVectors(contact.position, bodyA.position);
    const rB = this.subtractVectors(contact.position, bodyB.position);

    // Effective mass for collision
    // 1/m_eff = 1/m_A + 1/m_B + (r_A × n)·(I_A^-1·(r_A × n)) + (r_B × n)·(I_B^-1·(r_B × n))
    const effectiveMass = this.calculateEffectiveMass(
      bodyA, bodyB, rA, rB, contact.normal
    );

    // Coefficient of restitution (average)
    const e = (bodyA.restitution + bodyB.restitution) / 2;

    // Normal impulse magnitude: j = -(1+e) * v_n / (1/m_eff)
    const jn = -(1 + e) * vn * effectiveMass;

    // Normal impulse vector
    const normalImpulse = this.scaleVector(contact.normal, jn);

    // Friction impulse (Coulomb friction)
    const mu = (bodyA.friction + bodyB.friction) / 2;
    const tangentSpeed = this.vectorMagnitude(tangentVel);
    let tangentImpulse = { x: 0, y: 0, z: 0 };

    if (tangentSpeed > 1e-6) {
      const tangentDir = this.scaleVector(tangentVel, 1 / tangentSpeed);
      const maxFriction = mu * Math.abs(jn);
      const jt = Math.min(maxFriction, tangentSpeed * effectiveMass);
      tangentImpulse = this.scaleVector(tangentDir, -jt);
    }

    // Total impulse
    const totalImpulse = this.addVectors(normalImpulse, tangentImpulse);

    // Apply linear impulses
    const linearImpulseA = this.scaleVector(totalImpulse, -1);
    const linearImpulseB = totalImpulse;

    // Apply angular impulses: L = r × J
    const angularImpulseA = this.crossProduct(rA, linearImpulseA);
    const angularImpulseB = this.crossProduct(rB, linearImpulseB);

    // Calculate post-collision kinetic energy
    const keAfter = this.estimateKineticEnergyAfter(
      bodyA, bodyB, linearImpulseA, linearImpulseB,
      angularImpulseA, angularImpulseB
    );

    const energyDissipated = keBefore - keAfter;

    // Calculate damage
    const impactEnergy = 0.5 * effectiveMass * impactSpeed * impactSpeed;
    const damageA = this.calculateDamage(bodyA, impactEnergy, contact.position);
    const damageB = this.calculateDamage(bodyB, impactEnergy, contact.position);

    // Generate debris if high-energy impact
    const debris = this.generateDebris(
      bodyA, bodyB, contact, impactEnergy, energyDissipated
    );

    // Peak force estimate: F = J / dt
    const impactForce = Math.abs(jn) / Math.max(dt, 0.001);

    // Check if destructive
    const isDestructive = (bodyA.structuralIntegrity - damageA <= 0) ||
                         (bodyB.structuralIntegrity - damageB <= 0);

    return {
      linearImpulseA,
      linearImpulseB,
      angularImpulseA,
      angularImpulseB,
      kineticEnergyBefore: keBefore,
      kineticEnergyAfter: keAfter,
      energyDissipated,
      damageA,
      damageB,
      debrisGenerated: debris,
      impactSpeed,
      impactForce,
      isDestructive
    };
  }

  /**
   * Apply collision result to bodies
   */
  applyCollisionResult(
    bodyA: CollisionBody,
    bodyB: CollisionBody,
    result: CollisionResult
  ): void {
    // Apply linear impulses
    bodyA.velocity.x += result.linearImpulseA.x / bodyA.mass;
    bodyA.velocity.y += result.linearImpulseA.y / bodyA.mass;
    bodyA.velocity.z += result.linearImpulseA.z / bodyA.mass;

    bodyB.velocity.x += result.linearImpulseB.x / bodyB.mass;
    bodyB.velocity.y += result.linearImpulseB.y / bodyB.mass;
    bodyB.velocity.z += result.linearImpulseB.z / bodyB.mass;

    // Apply angular impulses (Δω = I^-1 · L)
    bodyA.angularVelocity.x += result.angularImpulseA.x / bodyA.momentOfInertia.x;
    bodyA.angularVelocity.y += result.angularImpulseA.y / bodyA.momentOfInertia.y;
    bodyA.angularVelocity.z += result.angularImpulseA.z / bodyA.momentOfInertia.z;

    bodyB.angularVelocity.x += result.angularImpulseB.x / bodyB.momentOfInertia.x;
    bodyB.angularVelocity.y += result.angularImpulseB.y / bodyB.momentOfInertia.y;
    bodyB.angularVelocity.z += result.angularImpulseB.z / bodyB.momentOfInertia.z;

    // Apply damage
    bodyA.structuralIntegrity = Math.max(0, bodyA.structuralIntegrity - result.damageA);
    bodyB.structuralIntegrity = Math.max(0, bodyB.structuralIntegrity - result.damageB);
  }

  /**
   * Calculate velocity at a point on a rotating body
   * v = v_cm + ω × r
   */
  private getVelocityAtPoint(body: CollisionBody, point: Vector3): Vector3 {
    const r = this.subtractVectors(point, body.position);

    // Rotate angular velocity to world frame
    const omegaWorld = this.rotateVector(body.angularVelocity, body.attitude);

    // v = v_cm + ω × r
    const rotationalVel = this.crossProduct(omegaWorld, r);

    return this.addVectors(body.velocity, rotationalVel);
  }

  /**
   * Calculate effective mass for collision
   */
  private calculateEffectiveMass(
    bodyA: CollisionBody,
    bodyB: CollisionBody,
    rA: Vector3,
    rB: Vector3,
    normal: Vector3
  ): number {
    // 1/m_eff = 1/m_A + 1/m_B + ...
    let invMassEff = 1 / bodyA.mass + 1 / bodyB.mass;

    // Angular contribution for body A
    const rAxN = this.crossProduct(rA, normal);
    const invIA = {
      x: 1 / bodyA.momentOfInertia.x,
      y: 1 / bodyA.momentOfInertia.y,
      z: 1 / bodyA.momentOfInertia.z
    };
    const IinvRA = {
      x: rAxN.x * invIA.x,
      y: rAxN.y * invIA.y,
      z: rAxN.z * invIA.z
    };
    const termA = this.dotProduct(this.crossProduct(IinvRA, rA), normal);
    invMassEff += termA;

    // Angular contribution for body B
    const rBxN = this.crossProduct(rB, normal);
    const invIB = {
      x: 1 / bodyB.momentOfInertia.x,
      y: 1 / bodyB.momentOfInertia.y,
      z: 1 / bodyB.momentOfInertia.z
    };
    const IinvRB = {
      x: rBxN.x * invIB.x,
      y: rBxN.y * invIB.y,
      z: rBxN.z * invIB.z
    };
    const termB = this.dotProduct(this.crossProduct(IinvRB, rB), normal);
    invMassEff += termB;

    return 1 / invMassEff;
  }

  /**
   * Calculate kinetic energy of a body
   * KE = 0.5*m*v² + 0.5*I*ω²
   */
  private calculateKineticEnergy(body: CollisionBody): number {
    const linear = 0.5 * body.mass * this.dotProduct(body.velocity, body.velocity);
    const rotational = 0.5 * (
      body.momentOfInertia.x * body.angularVelocity.x ** 2 +
      body.momentOfInertia.y * body.angularVelocity.y ** 2 +
      body.momentOfInertia.z * body.angularVelocity.z ** 2
    );
    return linear + rotational;
  }

  /**
   * Estimate kinetic energy after collision
   */
  private estimateKineticEnergyAfter(
    bodyA: CollisionBody,
    bodyB: CollisionBody,
    linImpA: Vector3,
    linImpB: Vector3,
    angImpA: Vector3,
    angImpB: Vector3
  ): number {
    // New velocities
    const vA = this.addVectors(bodyA.velocity, this.scaleVector(linImpA, 1 / bodyA.mass));
    const vB = this.addVectors(bodyB.velocity, this.scaleVector(linImpB, 1 / bodyB.mass));

    const omegaA = this.addVectors(bodyA.angularVelocity, {
      x: angImpA.x / bodyA.momentOfInertia.x,
      y: angImpA.y / bodyA.momentOfInertia.y,
      z: angImpA.z / bodyA.momentOfInertia.z
    });

    const omegaB = this.addVectors(bodyB.angularVelocity, {
      x: angImpB.x / bodyB.momentOfInertia.x,
      y: angImpB.y / bodyB.momentOfInertia.y,
      z: angImpB.z / bodyB.momentOfInertia.z
    });

    const linearA = 0.5 * bodyA.mass * this.dotProduct(vA, vA);
    const linearB = 0.5 * bodyB.mass * this.dotProduct(vB, vB);
    const rotationalA = 0.5 * (
      bodyA.momentOfInertia.x * omegaA.x ** 2 +
      bodyA.momentOfInertia.y * omegaA.y ** 2 +
      bodyA.momentOfInertia.z * omegaA.z ** 2
    );
    const rotationalB = 0.5 * (
      bodyB.momentOfInertia.x * omegaB.x ** 2 +
      bodyB.momentOfInertia.y * omegaB.y ** 2 +
      bodyB.momentOfInertia.z * omegaB.z ** 2
    );

    return linearA + linearB + rotationalA + rotationalB;
  }

  /**
   * Calculate structural damage from impact
   */
  private calculateDamage(
    body: CollisionBody,
    impactEnergy: number,
    contactPoint: Vector3
  ): number {
    if (impactEnergy < this.DAMAGE_THRESHOLD) return 0;

    // Damage scales with energy and material hardness
    const energyFactor = (impactEnergy - this.DAMAGE_THRESHOLD) / 1e6;
    const hardnessFactor = 1 - body.hardness;
    const damage = energyFactor * hardnessFactor * 0.1;

    return Math.min(1, damage);  // Max 100% damage
  }

  /**
   * Generate debris particles from high-energy collision
   */
  private generateDebris(
    bodyA: CollisionBody,
    bodyB: CollisionBody,
    contact: CollisionPoint,
    impactEnergy: number,
    energyDissipated: number
  ): DebrisParticle[] {
    if (impactEnergy < this.DEBRIS_THRESHOLD) return [];

    const debris: DebrisParticle[] = [];

    // Number of particles based on energy
    const numParticles = Math.floor(Math.min(20, impactEnergy / this.DEBRIS_THRESHOLD));

    // Mass of debris
    const totalDebrisMass = (bodyA.mass + bodyB.mass) * this.FRAGMENTATION_FACTOR / numParticles;

    // Temperature from impact heating (simplified)
    const specificHeat = 500;  // J/(kg·K)
    const temperature = 300 + energyDissipated / (totalDebrisMass * numParticles * specificHeat);

    for (let i = 0; i < numParticles; i++) {
      // Random velocity away from impact
      const speed = Math.random() * 50 + 10;  // 10-60 m/s
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      const velocity = {
        x: speed * Math.sin(phi) * Math.cos(theta) + contact.relativeVelocity.x * 0.5,
        y: speed * Math.sin(phi) * Math.sin(theta) + contact.relativeVelocity.y * 0.5,
        z: speed * Math.cos(phi) + contact.relativeVelocity.z * 0.5
      };

      // Random angular velocity
      const angularVelocity = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10
      };

      // Size based on mass (assume density ~1000 kg/m³)
      const volume = totalDebrisMass / 1000;
      const radius = Math.pow(3 * volume / (4 * Math.PI), 1/3);

      debris.push({
        position: { ...contact.position },
        velocity,
        angularVelocity,
        mass: totalDebrisMass,
        radius,
        temperature
      });
    }

    return debris;
  }

  /**
   * Create empty result for no collision
   */
  private createEmptyResult(keBefore: number, impactSpeed: number): CollisionResult {
    return {
      linearImpulseA: { x: 0, y: 0, z: 0 },
      linearImpulseB: { x: 0, y: 0, z: 0 },
      angularImpulseA: { x: 0, y: 0, z: 0 },
      angularImpulseB: { x: 0, y: 0, z: 0 },
      kineticEnergyBefore: keBefore,
      kineticEnergyAfter: keBefore,
      energyDissipated: 0,
      damageA: 0,
      damageB: 0,
      debrisGenerated: [],
      impactSpeed,
      impactForce: 0,
      isDestructive: false
    };
  }

  // ========== Vector/Quaternion Math ==========

  private addVectors(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  private subtractVectors(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private scaleVector(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

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

  private rotateVector(v: Vector3, q: Quaternion): Vector3 {
    const vQuat = { w: 0, x: v.x, y: v.y, z: v.z };
    const qConj = { w: q.w, x: -q.x, y: -q.y, z: -q.z };

    const temp = this.multiplyQuaternions(q, vQuat);
    const result = this.multiplyQuaternions(temp, qConj);

    return { x: result.x, y: result.y, z: result.z };
  }

  private multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
    return {
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
    };
  }
}
