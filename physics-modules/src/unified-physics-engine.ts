/**
 * Unified Physics Engine
 *
 * Integrates all advanced physics modules:
 * - Atmospheric drag and reentry
 * - Gravity gradient torque
 * - Solar radiation pressure
 * - Propellant slosh
 * - Enhanced collisions
 * - Patched conics navigation
 *
 * Provides a single interface for updating all physics systems
 */

import { AtmospherePhysics, AtmosphericForces, VehicleAeroConfig } from './atmosphere';
import { AdvancedGravityPhysics, GravityGradientResult, TidalForceResult, SolarRadiationResult } from './advanced-gravity';
import { PropellantSloshPhysics, PropellantTank, SloshForces } from './propellant-slosh';
import { EnhancedCollisionPhysics, CollisionBody, CollisionPoint, CollisionResult } from './enhanced-collision';
import { PatchedConicsNavigator, CelestialBody } from './patched-conics';

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

export interface PhysicsConfig {
  // Enable/disable systems
  enableAtmosphere?: boolean;
  enableGravityGradient?: boolean;
  enableSolarPressure?: boolean;
  enablePropellantSlosh?: boolean;
  enableEnhancedCollisions?: boolean;

  // Planet parameters
  planetRadius?: number;           // m
  planetMass?: number;             // kg

  // Atmosphere (if enabled)
  atmosphere?: AtmospherePhysics;

  // Sun position (for radiation pressure)
  sunPosition?: Vector3;           // m (inertial frame)
}

export interface VehicleState {
  // Dynamics
  position: Vector3;               // m (inertial frame)
  velocity: Vector3;               // m/s
  attitude: Quaternion;
  angularVelocity: Vector3;        // rad/s (body frame)
  mass: number;                    // kg
  momentOfInertia: Vector3;        // kg·m²

  // Geometry
  length: number;                  // m (longest dimension)
  referenceArea?: number;          // m² (for drag)
  dragCoefficient?: number;
  liftCoefficient?: number;

  // Propellant
  tanks?: PropellantTank[];

  // Solar panels (for radiation pressure)
  solarPanels?: Array<{
    area: number;
    normal: Vector3;              // Body frame
    reflectivity: number;
    centerOfPressure: Vector3;    // Body frame
  }>;

  // Material properties
  restitution?: number;            // 0-1
  friction?: number;
  hardness?: number;
  structuralIntegrity?: number;

  // Heat shield
  heatShieldConfig?: VehicleAeroConfig;
}

export interface PhysicsForces {
  // Linear forces (inertial frame)
  atmosphericDrag: Vector3;        // N
  atmosphericLift: Vector3;        // N
  solarRadiationForce: Vector3;    // N
  sloshForce: Vector3;             // N (body frame)

  // Torques (body frame)
  gravityGradientTorque: Vector3;  // N·m
  solarRadiationTorque: Vector3;   // N·m
  sloshTorque: Vector3;            // N·m

  // Additional data
  atmosphericData?: AtmosphericForces;
  gravityGradientData?: GravityGradientResult;
  tidalData?: TidalForceResult;
  solarRadiationData?: SolarRadiationResult;
  sloshData?: SloshForces;

  // Totals
  totalLinearForce: Vector3;       // N (inertial frame)
  totalTorque: Vector3;            // N·m (body frame)
}

export class UnifiedPhysicsEngine {
  // Physics modules
  private atmosphere?: AtmospherePhysics;
  private advancedGravity: AdvancedGravityPhysics;
  private sloshPhysics: PropellantSloshPhysics;
  private collisionPhysics: EnhancedCollisionPhysics;
  private navigator: PatchedConicsNavigator;

  // Configuration
  private config: PhysicsConfig;

  // Constants
  private readonly G = 6.67430e-11;

  constructor(config: PhysicsConfig) {
    this.config = {
      enableAtmosphere: config.enableAtmosphere ?? true,
      enableGravityGradient: config.enableGravityGradient ?? true,
      enableSolarPressure: config.enableSolarPressure ?? true,
      enablePropellantSlosh: config.enablePropellantSlosh ?? true,
      enableEnhancedCollisions: config.enableEnhancedCollisions ?? true,
      ...config
    };

    // Initialize modules
    if (this.config.enableAtmosphere && this.config.atmosphere) {
      this.atmosphere = this.config.atmosphere;
    }

    this.advancedGravity = new AdvancedGravityPhysics();
    this.sloshPhysics = new PropellantSloshPhysics();
    this.collisionPhysics = new EnhancedCollisionPhysics();
    this.navigator = new PatchedConicsNavigator();
  }

  /**
   * Calculate all physics forces for a vehicle
   */
  calculateForces(
    vehicle: VehicleState,
    linearAcceleration: Vector3,  // m/s² (from thrust/gravity, body frame)
    dt: number
  ): PhysicsForces {
    const forces: PhysicsForces = {
      atmosphericDrag: { x: 0, y: 0, z: 0 },
      atmosphericLift: { x: 0, y: 0, z: 0 },
      solarRadiationForce: { x: 0, y: 0, z: 0 },
      sloshForce: { x: 0, y: 0, z: 0 },
      gravityGradientTorque: { x: 0, y: 0, z: 0 },
      solarRadiationTorque: { x: 0, y: 0, z: 0 },
      sloshTorque: { x: 0, y: 0, z: 0 },
      totalLinearForce: { x: 0, y: 0, z: 0 },
      totalTorque: { x: 0, y: 0, z: 0 }
    };

    // 1. Atmospheric forces
    if (this.config.enableAtmosphere && this.atmosphere && this.config.planetRadius) {
      const aeroConfig: VehicleAeroConfig = {
        referenceArea: vehicle.referenceArea || 10,
        dragCoefficient: vehicle.dragCoefficient || 0.5,
        liftCoefficient: vehicle.liftCoefficient || 0.0,
        ...vehicle.heatShieldConfig
      };

      const atmoForces = this.atmosphere.calculateForces(
        vehicle.position,
        vehicle.velocity,
        this.config.planetRadius,
        aeroConfig
      );

      forces.atmosphericDrag = atmoForces.drag;
      forces.atmosphericLift = atmoForces.lift;
      forces.atmosphericData = atmoForces;

      // Update heat shield if present
      if (vehicle.heatShieldConfig && atmoForces.heating > 0) {
        const heatShieldUpdate = this.atmosphere.updateHeatShield(
          atmoForces.heating,
          dt,
          aeroConfig
        );

        // Update vehicle heat shield state (caller should handle this)
        forces.atmosphericData = {
          ...atmoForces,
          ...heatShieldUpdate
        } as any;
      }
    }

    // 2. Gravity gradient torque
    if (this.config.enableGravityGradient && this.config.planetMass) {
      const ggResult = this.advancedGravity.calculateGravityGradientTorque(
        vehicle.position,
        vehicle.attitude,
        vehicle.momentOfInertia,
        this.config.planetMass
      );

      forces.gravityGradientTorque = ggResult.torque;
      forces.gravityGradientData = ggResult;
    }

    // 3. Tidal forces
    if (this.config.planetMass) {
      const tidalResult = this.advancedGravity.calculateTidalForces(
        vehicle.position,
        vehicle.attitude,
        vehicle.length,
        vehicle.mass,
        this.config.planetMass,
        1e6  // Default structural strength
      );

      forces.tidalData = tidalResult;

      // Warning: if not safe, ship is being torn apart!
    }

    // 4. Solar radiation pressure
    if (this.config.enableSolarPressure &&
        this.config.sunPosition &&
        vehicle.solarPanels &&
        vehicle.solarPanels.length > 0) {

      const solarResult = this.advancedGravity.calculateSolarRadiationPressure(
        vehicle.position,
        this.config.sunPosition,
        vehicle.attitude,
        vehicle.solarPanels,
        { x: 0, y: 0, z: 0 }  // Assume CoM at origin
      );

      forces.solarRadiationForce = solarResult.force;
      forces.solarRadiationTorque = solarResult.torque;
      forces.solarRadiationData = solarResult;
    }

    // 5. Propellant slosh
    if (this.config.enablePropellantSlosh &&
        vehicle.tanks &&
        vehicle.tanks.length > 0) {

      const sloshResult = this.sloshPhysics.updateSlosh(
        vehicle.tanks,
        vehicle.angularVelocity,
        linearAcceleration,
        dt
      );

      forces.sloshForce = sloshResult.force;
      forces.sloshTorque = sloshResult.torque;
      forces.sloshData = sloshResult;
    }

    // 6. Calculate totals
    forces.totalLinearForce = this.addVectors(
      forces.atmosphericDrag,
      this.addVectors(
        forces.atmosphericLift,
        forces.solarRadiationForce
      )
    );

    // Note: slosh force is in body frame, needs rotation to inertial
    const sloshForceInertial = this.rotateVector(forces.sloshForce, vehicle.attitude);
    forces.totalLinearForce = this.addVectors(forces.totalLinearForce, sloshForceInertial);

    forces.totalTorque = this.addVectors(
      forces.gravityGradientTorque,
      this.addVectors(
        forces.solarRadiationTorque,
        forces.sloshTorque
      )
    );

    return forces;
  }

  /**
   * Handle collision between two vehicles
   */
  handleCollision(
    vehicleA: VehicleState,
    vehicleB: VehicleState,
    contactPoint: CollisionPoint,
    dt: number
  ): CollisionResult {
    if (!this.config.enableEnhancedCollisions) {
      // Return empty result
      return {
        linearImpulseA: { x: 0, y: 0, z: 0 },
        linearImpulseB: { x: 0, y: 0, z: 0 },
        angularImpulseA: { x: 0, y: 0, z: 0 },
        angularImpulseB: { x: 0, y: 0, z: 0 },
        kineticEnergyBefore: 0,
        kineticEnergyAfter: 0,
        energyDissipated: 0,
        damageA: 0,
        damageB: 0,
        debrisGenerated: [],
        impactSpeed: 0,
        impactForce: 0,
        isDestructive: false
      };
    }

    const bodyA: CollisionBody = {
      position: vehicleA.position,
      velocity: vehicleA.velocity,
      angularVelocity: vehicleA.angularVelocity,
      attitude: vehicleA.attitude,
      mass: vehicleA.mass,
      momentOfInertia: vehicleA.momentOfInertia,
      restitution: vehicleA.restitution ?? 0.3,
      friction: vehicleA.friction ?? 0.5,
      hardness: vehicleA.hardness ?? 0.5,
      structuralIntegrity: vehicleA.structuralIntegrity ?? 1.0
    };

    const bodyB: CollisionBody = {
      position: vehicleB.position,
      velocity: vehicleB.velocity,
      angularVelocity: vehicleB.angularVelocity,
      attitude: vehicleB.attitude,
      mass: vehicleB.mass,
      momentOfInertia: vehicleB.momentOfInertia,
      restitution: vehicleB.restitution ?? 0.3,
      friction: vehicleB.friction ?? 0.5,
      hardness: vehicleB.hardness ?? 0.5,
      structuralIntegrity: vehicleB.structuralIntegrity ?? 1.0
    };

    return this.collisionPhysics.resolveCollision(bodyA, bodyB, contactPoint, dt);
  }

  /**
   * Get navigation system
   */
  getNavigator(): PatchedConicsNavigator {
    return this.navigator;
  }

  /**
   * Get atmosphere system
   */
  getAtmosphere(): AtmospherePhysics | undefined {
    return this.atmosphere;
  }

  /**
   * Get slosh physics system
   */
  getSloshPhysics(): PropellantSloshPhysics {
    return this.sloshPhysics;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.atmosphere) {
      this.atmosphere = config.atmosphere;
    }
  }

  // ========== Vector/Quaternion Math ==========

  private addVectors(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
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

/**
 * Factory: Create Earth-Moon physics engine
 */
export function createEarthMoonPhysics(): UnifiedPhysicsEngine {
  const atmosphere = AtmospherePhysics.createEarthAtmosphere(6371000);

  return new UnifiedPhysicsEngine({
    enableAtmosphere: true,
    enableGravityGradient: true,
    enableSolarPressure: true,
    enablePropellantSlosh: true,
    enableEnhancedCollisions: true,
    planetRadius: 6371000,     // Earth radius
    planetMass: 5.972e24,      // Earth mass
    atmosphere,
    sunPosition: { x: -1.496e11, y: 0, z: 0 }  // 1 AU away
  });
}

/**
 * Factory: Create Moon physics engine (no atmosphere)
 */
export function createMoonPhysics(): UnifiedPhysicsEngine {
  return new UnifiedPhysicsEngine({
    enableAtmosphere: false,   // Moon has no atmosphere
    enableGravityGradient: true,
    enableSolarPressure: true,
    enablePropellantSlosh: true,
    enableEnhancedCollisions: true,
    planetRadius: 1737400,     // Moon radius
    planetMass: 7.342e22,      // Moon mass
    sunPosition: { x: -1.496e11, y: 0, z: 0 }
  });
}

/**
 * Factory: Create Mars physics engine
 */
export function createMarsPhysics(): UnifiedPhysicsEngine {
  const atmosphere = AtmospherePhysics.createMarsAtmosphere(3389500);

  return new UnifiedPhysicsEngine({
    enableAtmosphere: true,
    enableGravityGradient: true,
    enableSolarPressure: true,
    enablePropellantSlosh: true,
    enableEnhancedCollisions: true,
    planetRadius: 3389500,     // Mars radius
    planetMass: 6.39e23,       // Mars mass
    atmosphere,
    sunPosition: { x: -2.279e11, y: 0, z: 0 }  // 1.52 AU away
  });
}
