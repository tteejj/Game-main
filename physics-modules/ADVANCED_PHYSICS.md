# Advanced Physics Systems

This document describes the new advanced physics systems added to enhance realism and gameplay depth.

## Overview

The advanced physics modules add seven major systems that significantly improve the universe simulation:

1. **Atmospheric Drag & Reentry** - Realistic atmospheric flight and reentry heating
2. **Gravity Gradient Torque** - Large ships experience torque near massive bodies
3. **Solar Radiation Pressure** - Solar panels create force and enable solar sailing
4. **Propellant Slosh** - Fuel movement affects ship control
5. **Enhanced Collisions** - Realistic impulse-based collisions with debris generation
6. **Patched Conics Navigation** - Multi-body trajectory planning
7. **Tidal Forces** - Structural stress near massive bodies

## 1. Atmospheric Physics

**Module:** `atmosphere.ts`

### Features

- Exponential atmosphere density model
- Drag force calculation (quadratic drag)
- Aerodynamic heating (reentry)
- Heat shield thermal dynamics with ablation
- Lift force for aerodynamic surfaces
- Dynamic pressure and Mach number

### Gameplay Impact

- **Reentry Challenge**: Ships entering atmosphere experience intense heating, requiring heat shield management
- **Aerobraking**: Save fuel by using atmospheric drag to slow down
- **Terminal Velocity**: Falling objects reach realistic terminal velocities
- **Atmospheric Flight**: Enables winged vehicles and atmospheric skimming

### Usage

```typescript
import { AtmospherePhysics } from './atmosphere';

// Create Earth-like atmosphere
const atmosphere = AtmospherePhysics.createEarthAtmosphere(6371000);

// Configure vehicle aerodynamics
const aeroConfig = {
  referenceArea: 15,              // m² cross-section
  dragCoefficient: 0.7,           // Cd
  liftCoefficient: 0.3,           // Cl
  heatShieldArea: 12,             // m²
  heatShieldEmissivity: 0.85,
  heatShieldCapacity: 2e6,        // J/K
  heatShieldMaxTemp: 3000,        // K
  heatShieldTemperature: 300,
  heatShieldIntegrity: 1.0
};

// Calculate forces every frame
const forces = atmosphere.calculateForces(
  position,      // Ship position
  velocity,      // Ship velocity
  planetRadius,
  aeroConfig
);

// Apply drag and lift to ship
applyForce(forces.drag);
applyForce(forces.lift);

// Update heat shield temperature
const heatShield = atmosphere.updateHeatShield(
  forces.heating,
  dt,
  aeroConfig
);

if (heatShield.integrity < 0.5) {
  console.warn("Heat shield critical!");
}
```

### Atmospheric Presets

- **Earth**: Dense atmosphere, 1.225 kg/m³ surface density
- **Mars**: Thin atmosphere, 0.020 kg/m³ (0.6% of Earth)
- **Venus**: Very dense, 65 kg/m³ (crushing pressure!)
- **Titan**: Thick atmosphere, 5.3 kg/m³

## 2. Advanced Gravity Effects

**Module:** `advanced-gravity.ts`

### Features

- **Gravity Gradient Torque**: Differential gravity across ship length
- **Tidal Forces**: Stretching force that can destroy ships
- **Solar Radiation Pressure**: Photon pressure from sunlight
- **J2 Perturbations**: Orbital decay from planet oblateness
- **Lagrange Points**: L1/L2/L3 calculation

### Gameplay Impact

- **Large Ship Stability**: Big ships harder to keep stable near planets
- **Roche Limit**: Don't get too close to massive bodies!
- **Solar Sailing**: Use solar panels for fuel-free propulsion
- **Realistic Orbits**: Satellites naturally decay over time

### Usage

#### Gravity Gradient Torque

```typescript
import { AdvancedGravityPhysics } from './advanced-gravity';

const gravityPhysics = new AdvancedGravityPhysics();

// Calculate torque on large ship
const ggTorque = gravityPhysics.calculateGravityGradientTorque(
  shipPosition,        // m from planet center
  shipAttitude,        // Quaternion
  momentOfInertia,     // kg·m² (larger ships = more torque)
  planetMass
);

// Apply torque to ship
applyTorque(ggTorque.torque);

// The ship will naturally want to align with the radial direction
// Requires active RCS/reaction wheels to maintain attitude!
```

#### Tidal Forces

```typescript
// Check if ship is safe from tidal forces
const tidalForces = gravityPhysics.calculateTidalForces(
  shipPosition,
  shipAttitude,
  shipLength,          // m (longer ships = more stress)
  shipMass,
  planetMass,
  structuralStrength   // Pa
);

if (!tidalForces.isSafe) {
  console.error(`Tidal stress: ${tidalForces.stress / 1e6} MPa`);
  console.error(`Roche limit: ${tidalForces.rocheLimit / 1000} km`);
  // Ship is being torn apart!
  applyStructuralDamage(tidalForces.stress);
}
```

#### Solar Radiation Pressure

```typescript
// Define solar panels
const solarPanels = [
  {
    area: 20,                          // m²
    normal: { x: 0, y: 1, z: 0 },     // Pointing in +Y (body frame)
    reflectivity: 0.9,                 // Highly reflective
    centerOfPressure: { x: 0, y: 3, z: 0 }  // 3m from CoM
  },
  // Add more panels...
];

const solarPressure = gravityPhysics.calculateSolarRadiationPressure(
  shipPosition,
  sunPosition,
  shipAttitude,
  solarPanels
);

// Apply forces
applyForce(solarPressure.force);      // Thrust away from sun
applyTorque(solarPressure.torque);    // Torque from asymmetric panels

// Bonus: solar power!
console.log(`Solar power: ${solarPressure.power / 1000} kW`);
```

## 3. Propellant Slosh Dynamics

**Module:** `propellant-slosh.ts`

### Features

- Spring-mass-damper model for fuel sloshing
- Dynamic center of mass shifts
- Torque from moving propellant
- Baffle damping simulation
- Slosh severity indicators

### Gameplay Impact

- **Fuel Management**: Partially-full tanks are harder to control
- **RCS Compensation**: Need more RCS thrust to counteract slosh
- **Design Trade-offs**: Heavy baffles vs. control difficulty
- **Realistic Maneuvers**: Large burns with low fuel create control challenges

### Usage

```typescript
import { PropellantSloshPhysics, calculateOptimalBaffles } from './propellant-slosh';

const sloshPhysics = new PropellantSloshPhysics();

// Define propellant tanks
const tanks: PropellantTank[] = [
  {
    id: 'main-tank',
    position: { x: 0, y: -2, z: 0 },  // 2m below CoM
    capacity: 5000,                     // kg
    currentMass: 2500,                  // 50% full (maximum slosh!)
    radius: 1.5,                        // m
    height: 3.0,                        // m
    axis: { x: 0, y: 1, z: 0 },
    baffleDamping: 0.5                  // Medium baffles
  }
];

// Every frame, update slosh
const sloshForces = sloshPhysics.updateSlosh(
  tanks,
  shipAngularVelocity,
  shipLinearAcceleration,
  dt
);

// Apply forces and torques
applyForce(sloshForces.force);        // Force on tank walls
applyTorque(sloshForces.torque);      // Unpredictable torque!

// Update center of mass
updateCoM(sloshForces.comShift);

// Check slosh severity for UI
const severity = sloshPhysics.getSloshSeverity('main-tank', tanks[0]);
if (severity > 0.7) {
  console.warn("Severe propellant slosh!");
}
```

#### Design Baffles

```typescript
// Help players choose baffle configuration
const baffleConfig = calculateOptimalBaffles(
  5000,   // Tank capacity (kg)
  0.6     // Desired damping (0-1)
);

console.log(`Baffle mass: ${baffleConfig.baffleMass} kg`);
console.log(`Recommendation: ${baffleConfig.recommendation}`);
// "Medium damping: Balanced approach"
```

## 4. Enhanced Collision Physics

**Module:** `enhanced-collision.ts`

### Features

- Impulse-based collision response
- Realistic energy transfer
- Spin-up from off-center impacts
- Debris generation from high-energy collisions
- Structural damage accumulation
- Friction modeling

### Gameplay Impact

- **Combat Realism**: Ships spin when hit off-center
- **Debris Fields**: High-speed impacts create dangerous debris
- **Structural Damage**: Multiple impacts weaken hull integrity
- **Realistic Docking**: Gentle docking vs. catastrophic impact

### Usage

```typescript
import { EnhancedCollisionPhysics } from './enhanced-collision';

const collisionPhysics = new EnhancedCollisionPhysics();

// Detect collision and get contact point
const contactPoint = {
  position: { x: 100, y: 50, z: 30 },           // World space
  normal: { x: 0, y: 1, z: 0 },                 // From A to B
  penetrationDepth: 0.5,                         // m
  relativeVelocity: { x: 10, y: -5, z: 0 }      // m/s
};

// Resolve collision
const result = collisionPhysics.resolveCollision(
  vehicleA,
  vehicleB,
  contactPoint,
  dt
);

// Apply results
applyImpulse(vehicleA, result.linearImpulseA, result.angularImpulseA);
applyImpulse(vehicleB, result.linearImpulseB, result.angularImpulseB);

// Handle damage
vehicleA.integrity -= result.damageA;
vehicleB.integrity -= result.damageB;

// Spawn debris
for (const debris of result.debrisGenerated) {
  spawnDebrisParticle(debris);
}

// Check if destructive
if (result.isDestructive) {
  console.error(`Collision destroyed ship! Energy: ${result.energyDissipated / 1e6} MJ`);
}

console.log(`Impact: ${result.impactSpeed} m/s, ${result.impactForce / 1000} kN`);
```

## 5. Patched Conics Navigation

**Module:** `patched-conics.ts`

### Features

- Sphere of Influence (SOI) calculations
- Multi-body trajectory planning
- SOI transition detection
- Hohmann transfer design
- Gravity assist calculations
- Orbital elements conversion

### Gameplay Impact

- **Mission Planning**: Plan complex Earth → Moon → Mars transfers
- **Delta-V Budgeting**: Accurate fuel requirements
- **Gravity Assists**: Save fuel with planetary flybys
- **Realistic Navigation**: Professional-grade trajectory planning

### Usage

```typescript
import { PatchedConicsNavigator, createSolarSystemNavigator } from './patched-conics';

// Create navigator with solar system bodies
const navigator = createSolarSystemNavigator();

// Or create custom
const nav = new PatchedConicsNavigator();
nav.registerBody({
  name: 'Earth',
  mass: 5.972e24,
  radius: 6371000,
  position: { x: 1.496e11, y: 0, z: 0 },
  velocity: { x: 0, y: 29780, z: 0 },
  parentBody: 'Sun',
  semiMajorAxis: 1.496e11
});

// Check sphere of influence
const earthSOI = navigator.calculateSOI('Earth');
console.log(`Earth SOI: ${earthSOI / 1000} km`);

// Plan Hohmann transfer
const transfer = navigator.planHohmannTransfer(
  'Earth',
  6371000 + 200000,    // LEO (200km altitude)
  6371000 + 35786000   // GEO
);

console.log(`Delta-V: ${transfer.totalDeltaV} m/s`);
console.log(`Transfer time: ${transfer.transferTime / 3600} hours`);

// Plan Earth-Moon transfer
const moonTransfer = navigator.planEarthMoonTransfer(200000);
console.log(`TLI burn: ${moonTransfer.maneuvers[0].magnitude} m/s`);
console.log(`LOI burn: ${moonTransfer.maneuvers[1].magnitude} m/s`);
console.log(`Total: ${moonTransfer.totalDeltaV} m/s`);

// Calculate gravity assist
const assist = navigator.calculateGravityAssist(
  'Jupiter',
  { x: 10000, y: 5000, z: 0 },  // Incoming v_infinity
  200000                          // Periapsis altitude
);

console.log(`Deflection: ${assist.deltaAngle * 180 / Math.PI}°`);
console.log(`Effective delta-V gained: ${assist.effectiveDeltaV} m/s`);
```

## 6. Unified Physics Engine

**Module:** `unified-physics-engine.ts`

The unified engine integrates all advanced physics systems into a single easy-to-use interface.

### Features

- Single update call for all physics
- Configurable enable/disable per system
- Factory functions for common scenarios
- Automatic force accumulation

### Usage

```typescript
import { createEarthMoonPhysics } from './unified-physics-engine';

// Create physics engine for Earth-Moon system
const physics = createEarthMoonPhysics();

// Or create custom
const physics = new UnifiedPhysicsEngine({
  enableAtmosphere: true,
  enableGravityGradient: true,
  enableSolarPressure: true,
  enablePropellantSlosh: true,
  enableEnhancedCollisions: true,
  planetRadius: 6371000,
  planetMass: 5.972e24,
  atmosphere: AtmospherePhysics.createEarthAtmosphere(6371000),
  sunPosition: { x: -1.496e11, y: 0, z: 0 }
});

// Define vehicle state
const vehicle = {
  position: { x: 0, y: 0, z: 6571000 },      // 200km altitude
  velocity: { x: 7800, y: 0, z: 0 },          // Orbital velocity
  attitude: { w: 1, x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
  mass: 10000,
  momentOfInertia: { x: 5000, y: 5000, z: 2000 },
  length: 20,
  referenceArea: 15,
  dragCoefficient: 0.5,
  tanks: [/* propellant tanks */],
  solarPanels: [/* solar panels */]
};

// Every frame: calculate all forces
const forces = physics.calculateForces(
  vehicle,
  thrustAcceleration,  // From engines
  dt
);

// Apply forces
applyLinearForce(forces.totalLinearForce);
applyTorque(forces.totalTorque);

// Check individual systems
if (forces.atmosphericData && forces.atmosphericData.heating > 1e6) {
  console.warn("High heating!");
}

if (forces.tidalData && !forces.tidalData.isSafe) {
  console.error("Tidal forces critical!");
}

if (forces.sloshData && forces.sloshData.totalSloshMass > 1000) {
  console.log("Significant fuel slosh");
}
```

## Integration Examples

### Complete Ship Update Loop

```typescript
import { UnifiedPhysicsEngine, createEarthMoonPhysics } from './unified-physics-engine';

class Spacecraft {
  private physics: UnifiedPhysicsEngine;

  constructor() {
    this.physics = createEarthMoonPhysics();
  }

  update(dt: number) {
    // 1. Get thrust from engines
    const engineThrust = this.calculateEngineThrust();
    const thrustAccel = {
      x: engineThrust.x / this.mass,
      y: engineThrust.y / this.mass,
      z: engineThrust.z / this.mass
    };

    // 2. Calculate all physics forces
    const forces = this.physics.calculateForces(
      this.getVehicleState(),
      thrustAccel,
      dt
    );

    // 3. Apply total forces
    this.applyForce(forces.totalLinearForce);
    this.applyTorque(forces.totalTorque);

    // 4. Handle special cases
    if (forces.atmosphericData?.heating > 5e6) {
      this.damageHeatShield(dt);
    }

    if (forces.tidalData && !forces.tidalData.isSafe) {
      this.applyStructuralDamage(forces.tidalData.stress);
    }

    // 5. Update telemetry
    this.telemetry.atmosphericDensity = forces.atmosphericData?.density || 0;
    this.telemetry.heatFlux = forces.atmosphericData?.heating || 0;
    this.telemetry.gravityGradientTorque = forces.gravityGradientData?.magnitude || 0;
    this.telemetry.sloshSeverity = forces.sloshData?.totalSloshMass || 0;
  }
}
```

## Performance Considerations

- **Atmospheric calculations**: Fast (< 0.1ms per vehicle)
- **Gravity gradient**: Very fast (< 0.05ms)
- **Solar pressure**: Depends on number of panels
- **Propellant slosh**: Fast for < 10 tanks
- **Collisions**: Only calculate when needed
- **Patched conics**: Use for planning, not every frame

## Physics Accuracy

All systems use realistic physics equations:

- Drag: F = 0.5 × ρ × v² × Cd × A
- Heating: Sutton-Graves equation
- Gravity gradient: τ = (3μ/r³) × (I_max - I_min) × sin(2θ)
- Solar pressure: P = S/c
- Slosh: Spring-mass-damper (pendulum analog)
- Collisions: Full rigid body dynamics with impulses
- Orbital mechanics: Kepler's laws, conic sections

## Future Enhancements

Possible additions:
- Magnetic field interactions (for magnetorquers)
- Electric propulsion (ion drives)
- Multi-phase flow in tanks
- Flexible body dynamics
- Computational fluid dynamics for atmosphere
- N-body perturbations (3+ bodies)
- General relativity corrections

## Conclusion

These advanced physics systems transform the game from a simple orbital simulator into a realistic space flight simulator with deep gameplay mechanics. Each system adds authentic challenges that require player skill and planning to overcome.

**Key Gameplay Pillars:**

1. **Atmospheric flight** requires heat management and trajectory planning
2. **Large ships** need active stabilization systems
3. **Solar sailing** enables fuel-efficient missions
4. **Fuel management** affects control authority
5. **Collisions** have realistic consequences
6. **Navigation** requires understanding of orbital mechanics
7. **Tidal forces** create exclusion zones near planets

The result: A universe that feels alive, detailed, and filled with authentic physics challenges!
