/**
 * Patched Conics Navigation Module
 *
 * Implements:
 * - Sphere of Influence (SOI) calculations
 * - Multi-body trajectory planning (Earth → Moon, etc.)
 * - SOI transition detection and handling
 * - Transfer orbit design (Hohmann, bi-elliptic)
 * - Gravity assists (flyby maneuvers)
 *
 * Gameplay Impact:
 * - Plan complex multi-body transfers
 * - Accurate delta-V budgeting for missions
 * - Gravity assist maneuvers to save fuel
 * - Realistic interplanetary navigation
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CelestialBody {
  name: string;
  mass: number;              // kg
  radius: number;            // m
  position: Vector3;         // m (inertial frame)
  velocity: Vector3;         // m/s (inertial frame)
  parentBody?: string;       // Name of parent (e.g., "Earth" for Moon)
  semiMajorAxis?: number;    // m (if orbiting parent)
}

export interface OrbitalElements {
  semiMajorAxis: number;     // m (a)
  eccentricity: number;      // e (0-1)
  inclination: number;       // rad
  longitudeOfAscendingNode: number;  // rad (Ω)
  argumentOfPeriapsis: number;       // rad (ω)
  trueAnomaly: number;       // rad (ν)
}

export interface TrajectorySegment {
  body: string;              // Name of dominant body
  enterTime: number;         // s (mission elapsed time)
  exitTime: number;          // s
  enterPosition: Vector3;    // m (relative to body)
  exitPosition: Vector3;     // m
  enterVelocity: Vector3;    // m/s
  exitVelocity: Vector3;     // m/s
  orbitalElements: OrbitalElements;
  periapsis: number;         // m (closest approach)
  apoapsis: number;          // m (farthest point)
}

export interface TransferPlan {
  segments: TrajectorySegment[];
  totalDeltaV: number;       // m/s
  totalTime: number;         // s
  maneuvers: TransferManeuver[];
}

export interface TransferManeuver {
  time: number;              // s (mission elapsed time)
  position: Vector3;         // m (inertial frame)
  deltaV: Vector3;           // m/s (inertial frame)
  magnitude: number;         // m/s
  description: string;
}

export interface SOITransition {
  time: number;              // s
  position: Vector3;         // m (inertial frame)
  velocity: Vector3;         // m/s
  fromBody: string;
  toBody: string;
  relativeVelocity: Vector3; // m/s (relative to new body)
}

export class PatchedConicsNavigator {
  private readonly G = 6.67430e-11;  // Gravitational constant
  private bodies: Map<string, CelestialBody> = new Map();

  /**
   * Register a celestial body
   */
  registerBody(body: CelestialBody): void {
    this.bodies.set(body.name, body);
  }

  /**
   * Calculate sphere of influence radius for a body orbiting a parent
   * r_SOI = a * (m_satellite / m_parent)^(2/5)
   */
  calculateSOI(bodyName: string): number {
    const body = this.bodies.get(bodyName);
    if (!body || !body.parentBody || !body.semiMajorAxis) {
      return Infinity;  // Primary body has infinite SOI
    }

    const parent = this.bodies.get(body.parentBody);
    if (!parent) return Infinity;

    const massRatio = body.mass / parent.mass;
    return body.semiMajorAxis * Math.pow(massRatio, 2/5);
  }

  /**
   * Determine which body's SOI contains the given position
   */
  getDominantBody(position: Vector3): string {
    let dominant = '';
    let minDistance = Infinity;

    // Check distance to each body
    this.bodies.forEach((body, name) => {
      const distance = this.vectorMagnitude(
        this.subtractVectors(position, body.position)
      );

      const soi = this.calculateSOI(name);

      // If inside SOI and closer than current dominant
      if (distance < soi && distance < minDistance) {
        dominant = name;
        minDistance = distance;
      }
    });

    // If no SOI contains position, use closest body
    if (!dominant) {
      this.bodies.forEach((body, name) => {
        const distance = this.vectorMagnitude(
          this.subtractVectors(position, body.position)
        );
        if (distance < minDistance) {
          dominant = name;
          minDistance = distance;
        }
      });
    }

    return dominant;
  }

  /**
   * Detect SOI transition along trajectory
   */
  detectSOITransition(
    startPos: Vector3,
    startVel: Vector3,
    startBody: string,
    dt: number,
    steps: number
  ): SOITransition | null {
    let pos = { ...startPos };
    let vel = { ...startVel };
    let currentBody = startBody;

    const body = this.bodies.get(startBody);
    if (!body) return null;

    const mu = this.G * body.mass;

    // Propagate orbit
    for (let i = 0; i < steps; i++) {
      const time = i * dt;

      // Simple two-body propagation
      const r = this.vectorMagnitude(pos);
      const accel = this.scaleVector(pos, -mu / (r * r * r));

      vel = this.addVectors(vel, this.scaleVector(accel, dt));
      pos = this.addVectors(pos, this.scaleVector(vel, dt));

      // Check dominant body
      const posInertial = this.addVectors(pos, body.position);
      const newBody = this.getDominantBody(posInertial);

      if (newBody !== currentBody) {
        // SOI transition detected
        const newBodyObj = this.bodies.get(newBody);
        if (!newBodyObj) continue;

        const relPos = this.subtractVectors(posInertial, newBodyObj.position);
        const velInertial = this.addVectors(vel, body.velocity);
        const relVel = this.subtractVectors(velInertial, newBodyObj.velocity);

        return {
          time,
          position: posInertial,
          velocity: velInertial,
          fromBody: currentBody,
          toBody: newBody,
          relativeVelocity: relVel
        };
      }
    }

    return null;
  }

  /**
   * Plan a Hohmann transfer between two circular orbits around same body
   */
  planHohmannTransfer(
    bodyName: string,
    r1: number,              // m (initial orbit radius)
    r2: number               // m (final orbit radius)
  ): {
    deltaV1: number;         // m/s (first burn)
    deltaV2: number;         // m/s (second burn)
    transferTime: number;    // s
    totalDeltaV: number;     // m/s
  } {
    const body = this.bodies.get(bodyName);
    if (!body) throw new Error(`Body ${bodyName} not found`);

    const mu = this.G * body.mass;

    // Circular orbit velocities
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);

    // Transfer orbit velocities at periapsis and apoapsis
    const a_transfer = (r1 + r2) / 2;
    const v_transfer_peri = Math.sqrt(mu * (2/r1 - 1/a_transfer));
    const v_transfer_apo = Math.sqrt(mu * (2/r2 - 1/a_transfer));

    // Delta-V requirements
    const deltaV1 = Math.abs(v_transfer_peri - v1);
    const deltaV2 = Math.abs(v2 - v_transfer_apo);

    // Transfer time (half period of transfer orbit)
    const transferTime = Math.PI * Math.sqrt(a_transfer ** 3 / mu);

    return {
      deltaV1,
      deltaV2,
      transferTime,
      totalDeltaV: deltaV1 + deltaV2
    };
  }

  /**
   * Plan Earth → Moon transfer (simplified patched conic)
   */
  planEarthMoonTransfer(
    parkingOrbitAlt: number = 200000  // m (LEO altitude)
  ): TransferPlan {
    const earth = this.bodies.get('Earth');
    const moon = this.bodies.get('Moon');

    if (!earth || !moon) {
      throw new Error('Earth and Moon must be registered');
    }

    const earthMu = this.G * earth.mass;
    const moonMu = this.G * moon.mass;

    // Parking orbit
    const r1 = earth.radius + parkingOrbitAlt;
    const v_parking = Math.sqrt(earthMu / r1);

    // Moon orbit (approximate as circular)
    const moonOrbitRadius = moon.semiMajorAxis || 384400000;  // 384,400 km

    // Trans-Lunar Injection (TLI) burn
    // Target: apogee at Moon's orbit
    const a_transfer = (r1 + moonOrbitRadius) / 2;
    const v_tli = Math.sqrt(earthMu * (2/r1 - 1/a_transfer));
    const deltaV_tli = v_tli - v_parking;

    // Transfer time to Moon
    const transferTime = Math.PI * Math.sqrt(a_transfer ** 3 / earthMu);

    // Velocity at Moon's orbit
    const v_at_moon = Math.sqrt(earthMu * (2/moonOrbitRadius - 1/a_transfer));

    // Moon's orbital velocity
    const v_moon = Math.sqrt(earthMu / moonOrbitRadius);

    // Relative velocity when entering Moon's SOI
    const v_rel = Math.abs(v_at_moon - v_moon);

    // Lunar orbit insertion (LOI) - capture into circular orbit
    const moonOrbitAlt = 100000;  // 100 km altitude
    const r_moon = moon.radius + moonOrbitAlt;
    const v_moon_orbit = Math.sqrt(moonMu / r_moon);

    // Hyperbolic approach to Moon
    const moonSOI = this.calculateSOI('Moon');
    const v_inf = v_rel;  // Hyperbolic excess velocity

    // Velocity at periapsis of hyperbolic trajectory
    const v_peri = Math.sqrt(v_inf * v_inf + 2 * moonMu / r_moon);

    // LOI delta-V
    const deltaV_loi = v_peri - v_moon_orbit;

    // Create maneuvers
    const maneuvers: TransferManeuver[] = [
      {
        time: 0,
        position: { x: r1, y: 0, z: 0 },
        deltaV: { x: deltaV_tli, y: 0, z: 0 },
        magnitude: deltaV_tli,
        description: 'Trans-Lunar Injection (TLI)'
      },
      {
        time: transferTime,
        position: { x: moonOrbitRadius, y: 0, z: 0 },
        deltaV: { x: -deltaV_loi, y: 0, z: 0 },
        magnitude: deltaV_loi,
        description: 'Lunar Orbit Insertion (LOI)'
      }
    ];

    return {
      segments: [],  // TODO: Fill in trajectory segments
      totalDeltaV: deltaV_tli + deltaV_loi,
      totalTime: transferTime,
      maneuvers
    };
  }

  /**
   * Calculate gravity assist delta-V from flyby
   *
   * Uses patched conic approximation for hyperbolic flyby
   */
  calculateGravityAssist(
    bodyName: string,
    v_inf_in: Vector3,       // m/s (hyperbolic excess velocity, incoming)
    periapsisAlt: number     // m (closest approach altitude)
  ): {
    v_inf_out: Vector3;      // m/s (hyperbolic excess velocity, outgoing)
    deltaAngle: number;      // rad (deflection angle)
    effectiveDeltaV: number; // m/s (effective delta-V gained)
  } {
    const body = this.bodies.get(bodyName);
    if (!body) throw new Error(`Body ${bodyName} not found`);

    const mu = this.G * body.mass;
    const v_inf = this.vectorMagnitude(v_inf_in);
    const rp = body.radius + periapsisAlt;

    // Turn angle: δ = 2 * arcsin(1 / (1 + r_p*v_∞²/μ))
    const e = 1 + (rp * v_inf * v_inf) / mu;  // Hyperbolic eccentricity
    const deltaAngle = 2 * Math.asin(1 / e);

    // Rotate v_inf by deltaAngle
    // Simplified: assume 2D flyby in xy-plane
    const cos_delta = Math.cos(deltaAngle);
    const sin_delta = Math.sin(deltaAngle);

    const v_inf_out = {
      x: v_inf_in.x * cos_delta - v_inf_in.y * sin_delta,
      y: v_inf_in.x * sin_delta + v_inf_in.y * cos_delta,
      z: v_inf_in.z
    };

    // Effective delta-V (magnitude of velocity change)
    const deltaV_vec = this.subtractVectors(v_inf_out, v_inf_in);
    const effectiveDeltaV = this.vectorMagnitude(deltaV_vec);

    return {
      v_inf_out,
      deltaAngle,
      effectiveDeltaV
    };
  }

  /**
   * Convert position and velocity to orbital elements
   * (Two-body problem)
   */
  stateVectorToOrbitalElements(
    position: Vector3,
    velocity: Vector3,
    mu: number
  ): OrbitalElements {
    const r = this.vectorMagnitude(position);
    const v = this.vectorMagnitude(velocity);

    // Specific orbital energy: ε = v²/2 - μ/r
    const epsilon = (v * v) / 2 - mu / r;

    // Semi-major axis: a = -μ/(2ε)
    const a = -mu / (2 * epsilon);

    // Angular momentum vector: h = r × v
    const h = this.crossProduct(position, velocity);
    const h_mag = this.vectorMagnitude(h);

    // Eccentricity vector: e = (v × h)/μ - r/|r|
    const vCrossH = this.crossProduct(velocity, h);
    const rHat = this.scaleVector(position, 1/r);
    const e_vec = this.subtractVectors(
      this.scaleVector(vCrossH, 1/mu),
      rHat
    );
    const e = this.vectorMagnitude(e_vec);

    // Inclination: i = arccos(h_z / |h|)
    const i = Math.acos(h.z / h_mag);

    // Node vector: n = k × h (where k = [0,0,1])
    const n = this.crossProduct({ x: 0, y: 0, z: 1 }, h);
    const n_mag = this.vectorMagnitude(n);

    // Longitude of ascending node: Ω = arccos(n_x / |n|)
    let RAAN = 0;
    if (n_mag > 1e-10) {
      RAAN = Math.acos(n.x / n_mag);
      if (n.y < 0) RAAN = 2 * Math.PI - RAAN;
    }

    // Argument of periapsis: ω = arccos(n · e / (|n||e|))
    let omega = 0;
    if (e > 1e-10 && n_mag > 1e-10) {
      omega = Math.acos(this.dotProduct(n, e_vec) / (n_mag * e));
      if (e_vec.z < 0) omega = 2 * Math.PI - omega;
    }

    // True anomaly: ν = arccos(e · r / (|e||r|))
    let nu = 0;
    if (e > 1e-10) {
      nu = Math.acos(this.dotProduct(e_vec, position) / (e * r));
      if (this.dotProduct(position, velocity) < 0) {
        nu = 2 * Math.PI - nu;
      }
    } else {
      // Circular orbit: use argument of latitude
      nu = Math.acos(this.dotProduct(n, position) / (n_mag * r));
      if (position.z < 0) nu = 2 * Math.PI - nu;
    }

    return {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: i,
      longitudeOfAscendingNode: RAAN,
      argumentOfPeriapsis: omega,
      trueAnomaly: nu
    };
  }

  /**
   * Get body by name
   */
  getBody(name: string): CelestialBody | undefined {
    return this.bodies.get(name);
  }

  // ========== Vector Math ==========

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
}

/**
 * Factory: Create Solar System navigation
 */
export function createSolarSystemNavigator(): PatchedConicsNavigator {
  const nav = new PatchedConicsNavigator();

  // Sun
  nav.registerBody({
    name: 'Sun',
    mass: 1.989e30,
    radius: 696000000,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 }
  });

  // Earth
  nav.registerBody({
    name: 'Earth',
    mass: 5.972e24,
    radius: 6371000,
    position: { x: 1.496e11, y: 0, z: 0 },  // 1 AU
    velocity: { x: 0, y: 29780, z: 0 },      // ~30 km/s
    parentBody: 'Sun',
    semiMajorAxis: 1.496e11
  });

  // Moon
  nav.registerBody({
    name: 'Moon',
    mass: 7.342e22,
    radius: 1737400,
    position: { x: 1.496e11 + 384400000, y: 0, z: 0 },
    velocity: { x: 0, y: 29780 + 1022, z: 0 },
    parentBody: 'Earth',
    semiMajorAxis: 384400000
  });

  // Mars
  nav.registerBody({
    name: 'Mars',
    mass: 6.39e23,
    radius: 3389500,
    position: { x: 2.279e11, y: 0, z: 0 },   // 1.52 AU
    velocity: { x: 0, y: 24070, z: 0 },       // ~24 km/s
    parentBody: 'Sun',
    semiMajorAxis: 2.279e11
  });

  return nav;
}
