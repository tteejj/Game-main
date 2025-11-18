/**
 * Advanced Gravity Effects Module
 *
 * Implements:
 * - Gravity gradient torque (makes large ships hard to stabilize)
 * - Tidal forces (can rip ships apart near massive bodies)
 * - Solar radiation pressure (enables solar sailing)
 * - Non-spherical gravity (J2 perturbations)
 *
 * Gameplay Impact:
 * - Large ships need active stabilization near planets
 * - Ships experience structural stress near massive bodies
 * - Solar panels create torque and force
 * - Realistic orbital decay from J2
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

export interface GravityGradientResult {
  torque: Vector3;              // N·m (body frame)
  magnitude: number;            // N·m (for telemetry)
  stabilizingAxis: Vector3;     // Unit vector of minimum energy orientation
}

export interface TidalForceResult {
  differentialForce: Vector3;   // N (tearing force)
  stress: number;               // Pa (structural stress)
  isSafe: boolean;              // Whether ship is within safe limits
  rocheLimit: number;           // m (distance where tidal forces destroy ship)
}

export interface SolarRadiationResult {
  force: Vector3;               // N (radiation pressure force)
  torque: Vector3;              // N·m (from asymmetric pressure)
  pressure: number;             // Pa (radiation pressure)
  power: number;                // W (incident power on panels)
}

export interface J2PerturbationResult {
  acceleration: Vector3;        // m/s² (additional acceleration from oblateness)
  magnitude: number;            // m/s²
}

export class AdvancedGravityPhysics {
  private readonly G = 6.67430e-11;           // Gravitational constant
  private readonly SOLAR_CONSTANT = 1361;     // W/m² at 1 AU
  private readonly SPEED_OF_LIGHT = 299792458; // m/s

  /**
   * Calculate gravity gradient torque
   *
   * The torque on a rigid body in a gravity field from the differential
   * gravity across its length. Makes large ships want to align radially.
   *
   * τ = (3μ/r³) × (I_max - I_min) × sin(2θ)
   *
   * Gameplay: Large ships are harder to control near planets,
   * requires active RCS/reaction wheels to maintain attitude.
   */
  calculateGravityGradientTorque(
    position: Vector3,           // m (from planet center)
    attitude: Quaternion,        // Ship orientation
    momentOfInertia: Vector3,    // kg·m² (Ix, Iy, Iz principal moments)
    planetMass: number           // kg
  ): GravityGradientResult {
    const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);

    if (r < 1) {
      return {
        torque: { x: 0, y: 0, z: 0 },
        magnitude: 0,
        stabilizingAxis: { x: 0, y: 0, z: 1 }
      };
    }

    // Gravitational parameter μ = GM
    const mu = this.G * planetMass;

    // Radial direction in inertial frame
    const rHat = {
      x: position.x / r,
      y: position.y / r,
      z: position.z / r
    };

    // Rotate radial vector to body frame
    const rHatBody = this.rotateVectorInverse(rHat, attitude);

    // Find principal axes with min and max moments
    const I = momentOfInertia;
    const moments = [
      { axis: 0, value: I.x },
      { axis: 1, value: I.y },
      { axis: 2, value: I.z }
    ].sort((a, b) => a.value - b.value);

    const Imin = moments[0].value;
    const Imax = moments[2].value;

    // Axis of maximum moment (body frame)
    const maxAxis = moments[2].axis;
    let maxAxisVec = { x: 0, y: 0, z: 0 };
    if (maxAxis === 0) maxAxisVec = { x: 1, y: 0, z: 0 };
    if (maxAxis === 1) maxAxisVec = { x: 0, y: 1, z: 0 };
    if (maxAxis === 2) maxAxisVec = { x: 0, y: 0, z: 1 };

    // Angle between radial direction and max inertia axis
    const cosTheta = this.dotProduct(rHatBody, maxAxisVec);
    const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

    // Gravity gradient torque magnitude
    const coefficient = (3 * mu) / (2 * r * r * r);
    const torqueMag = coefficient * (Imax - Imin) * Math.sin(2 * theta);

    // Torque direction: tends to align max axis with radial
    // τ = (3μ/r³) × (r̂ × I·r̂)
    // Simplified: torque is perpendicular to both radial and max axis
    const torqueAxis = this.crossProduct(rHatBody, maxAxisVec);
    const torqueAxisMag = this.vectorMagnitude(torqueAxis);

    let torque = { x: 0, y: 0, z: 0 };
    if (torqueAxisMag > 1e-6) {
      torque = {
        x: (torqueAxis.x / torqueAxisMag) * torqueMag,
        y: (torqueAxis.y / torqueAxisMag) * torqueMag,
        z: (torqueAxis.z / torqueAxisMag) * torqueMag
      };
    }

    // Stabilizing axis: radial direction (minimum energy orientation)
    const stabilizingAxis = rHat;

    return {
      torque,
      magnitude: Math.abs(torqueMag),
      stabilizingAxis
    };
  }

  /**
   * Calculate tidal forces
   *
   * Differential gravity across ship length can tear it apart.
   * F_tidal = 2 * G * M * m * L / r³
   *
   * Gameplay: Don't get too close to massive bodies or your ship
   * takes structural damage and can break apart!
   */
  calculateTidalForces(
    position: Vector3,        // m (from planet center)
    attitude: Quaternion,     // Ship orientation
    shipLength: number,       // m (longest dimension)
    shipMass: number,         // kg (total mass)
    planetMass: number,       // kg
    structuralStrength: number = 1e6  // Pa (max stress before failure)
  ): TidalForceResult {
    const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);

    if (r < 1) {
      return {
        differentialForce: { x: 0, y: 0, z: 0 },
        stress: 0,
        isSafe: true,
        rocheLimit: 0
      };
    }

    // Radial direction
    const rHat = {
      x: position.x / r,
      y: position.y / r,
      z: position.z / r
    };

    // Tidal force magnitude: F = 2GMmL/r³
    const tidalForceMag = (2 * this.G * planetMass * shipMass * shipLength) / (r * r * r);

    // Force acts along radial direction (stretching)
    const differentialForce = {
      x: tidalForceMag * rHat.x,
      y: tidalForceMag * rHat.y,
      z: tidalForceMag * rHat.z
    };

    // Stress estimate: force per cross-sectional area
    // Assume cylindrical ship with diameter = length/5
    const diameter = shipLength / 5;
    const crossSection = Math.PI * (diameter / 2) ** 2;
    const stress = tidalForceMag / crossSection;

    // Roche limit (rigid body): d = 2.456 * R * (ρ_planet / ρ_satellite)^(1/3)
    // Simplified: use mass ratio
    const planetRadius = 1737400;  // Should be passed in
    const planetDensity = planetMass / ((4/3) * Math.PI * planetRadius ** 3);
    const shipVolume = shipLength ** 3;  // Rough estimate
    const shipDensity = shipMass / shipVolume;
    const rocheLimit = 2.456 * planetRadius * Math.pow(planetDensity / shipDensity, 1/3);

    // Check if safe
    const isSafe = stress < structuralStrength && r > rocheLimit;

    return {
      differentialForce,
      stress,
      isSafe,
      rocheLimit
    };
  }

  /**
   * Calculate solar radiation pressure
   *
   * Photons from the sun exert pressure on surfaces.
   * P = S / c (S = solar constant, c = speed of light)
   * F = P * A * (1 + reflectivity) * cos(angle)
   *
   * Gameplay:
   * - Solar panels create thrust and torque
   * - Solar sails enable fuel-free propulsion
   * - Panel orientation matters for power AND navigation
   */
  calculateSolarRadiationPressure(
    shipPosition: Vector3,        // m (from planet center)
    sunPosition: Vector3,         // m (from planet center)
    attitude: Quaternion,         // Ship orientation
    solarPanelAreas: Array<{      // Solar panels/sails
      area: number;               // m²
      normal: Vector3;            // Normal vector (body frame)
      reflectivity: number;       // 0-1 (0=absorb, 1=perfect mirror)
      centerOfPressure: Vector3;  // m (body frame, for torque)
    }>,
    centerOfMass: Vector3 = { x: 0, y: 0, z: 0 }  // m (body frame)
  ): SolarRadiationResult {
    // Vector from ship to sun (inertial frame)
    const sunDir = {
      x: sunPosition.x - shipPosition.x,
      y: sunPosition.y - shipPosition.y,
      z: sunPosition.z - shipPosition.z
    };

    const sunDist = this.vectorMagnitude(sunDir);

    if (sunDist < 1) {
      return {
        force: { x: 0, y: 0, z: 0 },
        torque: { x: 0, y: 0, z: 0 },
        pressure: 0,
        power: 0
      };
    }

    // Sun direction unit vector
    const sunHat = {
      x: sunDir.x / sunDist,
      y: sunDir.y / sunDist,
      z: sunDir.z / sunDist
    };

    // Solar constant at current distance (inverse square)
    // Assume sunPosition is at 1 AU initially
    const AU = 1.496e11;  // m
    const solarFlux = this.SOLAR_CONSTANT * (AU / sunDist) ** 2;

    // Radiation pressure
    const pressure = solarFlux / this.SPEED_OF_LIGHT;

    // Calculate force and torque from each panel
    let totalForce = { x: 0, y: 0, z: 0 };
    let totalTorque = { x: 0, y: 0, z: 0 };
    let totalPower = 0;

    for (const panel of solarPanelAreas) {
      // Rotate panel normal to inertial frame
      const normalInertial = this.rotateVector(panel.normal, attitude);

      // Angle between panel and sun
      const cosAngle = this.dotProduct(normalInertial, sunHat);

      // Only illuminated if facing sun
      if (cosAngle > 0) {
        // Force magnitude: F = P * A * (1 + r) * cos(θ)
        // Factor of (1+r) accounts for reflected photons (2x momentum change)
        const forceMag = pressure * panel.area * (1 + panel.reflectivity) * cosAngle;

        // Force direction: along sun direction (push away from sun)
        const force = {
          x: sunHat.x * forceMag,
          y: sunHat.y * forceMag,
          z: sunHat.z * forceMag
        };

        totalForce.x += force.x;
        totalForce.y += force.y;
        totalForce.z += force.z;

        // Torque: r × F (distance from CoM to center of pressure)
        const leverArm = {
          x: panel.centerOfPressure.x - centerOfMass.x,
          y: panel.centerOfPressure.y - centerOfMass.y,
          z: panel.centerOfPressure.z - centerOfMass.z
        };

        // Rotate force to body frame for torque calculation
        const forceBody = this.rotateVectorInverse(force, attitude);
        const torque = this.crossProduct(leverArm, forceBody);

        totalTorque.x += torque.x;
        totalTorque.y += torque.y;
        totalTorque.z += torque.z;

        // Power collected (for solar panels)
        const efficiency = 0.2;  // Typical solar panel efficiency
        totalPower += solarFlux * panel.area * cosAngle * efficiency;
      }
    }

    return {
      force: totalForce,
      torque: totalTorque,
      pressure,
      power: totalPower
    };
  }

  /**
   * Calculate J2 perturbation (non-spherical gravity from planet oblateness)
   *
   * Real planets are oblate (flattened at poles), causing orbital drift.
   *
   * Gameplay: Realistic orbital decay, need station-keeping for satellites
   */
  calculateJ2Perturbation(
    position: Vector3,      // m (from planet center)
    velocity: Vector3,      // m/s
    planetMass: number,     // kg
    planetRadius: number,   // m
    J2: number = 0.0010826  // Oblateness coefficient (Earth: 0.0010826)
  ): J2PerturbationResult {
    const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);

    if (r < planetRadius) {
      return {
        acceleration: { x: 0, y: 0, z: 0 },
        magnitude: 0
      };
    }

    const mu = this.G * planetMass;

    // Z-component (assuming z is rotation axis)
    const z = position.z;

    // J2 acceleration components
    const factor = (3 * mu * J2 * planetRadius * planetRadius) / (2 * r ** 5);

    const ax = factor * position.x * (5 * (z / r) ** 2 - 1);
    const ay = factor * position.y * (5 * (z / r) ** 2 - 1);
    const az = factor * z * (5 * (z / r) ** 2 - 3);

    const acceleration = { x: ax, y: ay, z: az };
    const magnitude = this.vectorMagnitude(acceleration);

    return {
      acceleration,
      magnitude
    };
  }

  /**
   * Calculate Lagrange points (L1-L5) for two-body system
   *
   * Gameplay: Special orbital zones where forces balance,
   * useful for space stations and fuel depots
   */
  calculateLagrangePoints(
    primaryMass: number,      // kg (e.g., Earth)
    secondaryMass: number,    // kg (e.g., Moon)
    separation: number        // m (distance between bodies)
  ): {
    L1: number;  // Distance from secondary toward primary
    L2: number;  // Distance from secondary away from primary
    L3: number;  // Distance from primary away from secondary
    // L4 and L5 form equilateral triangles, 60° ahead/behind
  } {
    const mu = secondaryMass / (primaryMass + secondaryMass);

    // L1: Between bodies (approximate)
    const L1 = separation * (1 - Math.pow(mu / 3, 1/3));

    // L2: Beyond secondary (approximate)
    const L2 = separation * (1 + Math.pow(mu / 3, 1/3));

    // L3: Beyond primary (approximate)
    const L3 = -separation * (1 + 5 * mu / 12);

    return { L1, L2, L3 };
  }

  // ========== Vector/Quaternion Math ==========

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
    // v' = q * v * q^(-1)
    const vQuat = { w: 0, x: v.x, y: v.y, z: v.z };
    const qConj = { w: q.w, x: -q.x, y: -q.y, z: -q.z };

    const temp = this.multiplyQuaternions(q, vQuat);
    const result = this.multiplyQuaternions(temp, qConj);

    return { x: result.x, y: result.y, z: result.z };
  }

  private rotateVectorInverse(v: Vector3, q: Quaternion): Vector3 {
    // v' = q^(-1) * v * q
    const vQuat = { w: 0, x: v.x, y: v.y, z: v.z };
    const qConj = { w: q.w, x: -q.x, y: -q.y, z: -q.z };

    const temp = this.multiplyQuaternions(qConj, vQuat);
    const result = this.multiplyQuaternions(temp, q);

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
