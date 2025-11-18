# Ship Mechanics Integration Guide

This document describes the complete ship mechanics system and how all components integrate together.

## Overview

The ship mechanics system provides a complete, realistic spacecraft simulation with:

- **Physics Integration**: Ships exist as first-class celestial bodies in the world
- **Combat Systems**: Projectile weapons, lasers, and guided missiles with damage modeling
- **Hull Damage**: Armor penetration, breaches, and structural integrity
- **Subsystems**: Power, thermal, life support, fuel, and more (via Spacecraft class)
- **Landing Systems**: Realistic landing gear with suspension and tip-over detection
- **World Integration**: Ships interact with gravity, collisions, and other bodies

## Architecture

### Core Components

1. **IntegratedShip** (`integrated-ship.ts`)
   - Bridges spacecraft physics with world simulation
   - Handles gravity, collisions, and hull damage
   - Makes ships detectable by sensors and targetable by weapons

2. **WeaponSystem** (`weapons.ts`)
   - Manages all weapons on a ship
   - Implements projectile physics, hitscan lasers, and guided missiles
   - Integrates with hull damage system for realistic combat

3. **UnifiedShipSystem** (`unified-ship-system.ts`)
   - **NEW**: Single, cohesive interface to all ship functionality
   - Combines IntegratedShip + WeaponSystem + World integration
   - Recommended entry point for using ship mechanics

4. **ShipCombatComputer** (`ship-combat.ts`)
   - **NEW**: Targeting and fire control solutions
   - Calculates intercept points for moving targets
   - Provides combat AI helpers

## Quick Start

### Creating a Ship

```typescript
import { World } from './world';
import { CompleteSimulationSystem, UnifiedShipConfig } from './unified-ship-system';
import { WeaponType } from './weapons';
import { MaterialType } from './hull-damage';

// Create world and simulation
const world = new World();
const simulation = new CompleteSimulationSystem(world);

// Configure ship
const config: UnifiedShipConfig = {
  mass: 50000,  // 50 tons
  radius: 15,   // 15m
  position: { x: 0, y: 0, z: 1000 },
  velocity: { x: 100, y: 0, z: 0 },

  // Hull configuration
  hullConfig: {
    compartments: [/* ... */],
    armorLayers: [
      {
        id: 'armor',
        material: MaterialType.TITANIUM,
        thickness: 0.05,  // 5cm
        hardness: 970,
        density: 4500,
        integrity: 1.0,
        ablationDepth: 0
      }
    ]
  },

  // Weapons
  weapons: [
    {
      id: 'railgun',
      type: WeaponType.RAILGUN,
      mountPoint: { x: 5, y: 0, z: 0 },
      aimDirection: { x: 1, y: 0, z: 0 },
      damage: 5000000,      // 5 MJ
      projectileSpeed: 3000, // 3 km/s
      projectileMass: 2,     // 2 kg
      range: 50000,          // 50 km
      rateOfFire: 10,
      powerDraw: 10000,
      heatGeneration: 2000000,
      ammoCapacity: 100,
      ammoRemaining: 100,
      cooldown: 0,
      compartmentId: 'weapons'
    }
  ]
};

// Add ship to simulation
const ship = simulation.addShip(config);
```

### Running Simulation

```typescript
const dt = 0.1;  // 100ms timestep

// Main loop
setInterval(() => {
  simulation.update(dt);
}, dt * 1000);
```

### Combat

```typescript
import { ShipCombatComputer } from './ship-combat';

const ship1 = simulation.addShip(config1);
const ship2 = simulation.addShip(config2);

// Create combat computer
const combatComputer = new ShipCombatComputer(ship1);

// Calculate fire solution
const solution = combatComputer.calculateProjectileFireSolution(
  ship2,
  'railgun',
  3000  // projectile speed
);

if (solution.canFire) {
  // Fire weapon
  const target = ship2.getWorldBody();
  ship1.fireWeapon('railgun', solution.aimDirection, target);
}

// Or use auto-engage
combatComputer.autoEngage(ship2);
```

## Weapon Systems

### Weapon Types

#### 1. Railgun/Coilgun (Kinetic Projectiles)

```typescript
{
  type: WeaponType.RAILGUN,
  damage: 5000000,         // Joules
  projectileSpeed: 3000,   // m/s
  projectileMass: 2,       // kg
  range: 50000,            // meters
  rateOfFire: 10          // rounds/min
}
```

**Physics:**
- Ballistic trajectory affected by gravity
- Penetration calculated using DeMarre formula
- Creates spalling damage on armor impact
- Recoil applied to firing ship

#### 2. Laser (Hitscan)

```typescript
{
  type: WeaponType.LASER,
  damage: 1000000,    // Joules per pulse
  range: 30000,       // meters
  rateOfFire: 60      // Hz
}
```

**Physics:**
- Instant hit (speed of light)
- Thermal ablation of armor
- No ballistic drop
- High power consumption

#### 3. Guided Missile

```typescript
{
  type: WeaponType.MISSILE,
  damage: 10000000,   // Joules (warhead)
  range: 100000,      // meters
  rateOfFire: 1       // per minute
}
```

**Physics:**
- Proportional navigation guidance
- Self-propelled with fuel and thrust
- Proximity fuse detonation
- Combined kinetic + explosive damage

### Damage Model

Ships have a layered armor system with realistic penetration physics:

#### Kinetic Damage
- Projectile mass, velocity, and diameter
- Impact angle (oblique impacts less effective)
- Armor hardness and density
- Penetration depth calculated
- Spalling damage to interior

#### Thermal Damage
- Energy absorption and ablation
- Material-specific melting points
- Beam area and duration
- Armor burn-through

#### Explosive Damage
- Blast radius with falloff
- Area effect on armor
- Structural damage
- Multiple compartment impacts

## Hull Integrity System

### Compartments

Ships are divided into compartments with:
- Pressure and atmosphere tracking
- Breach mechanics (holes causing depressurization)
- Structural integrity (0-1)
- System locations

### Armor Layers

Multiple armor layers with:
- Material types (Steel, Titanium, Aluminum, Composite, Ceramic)
- Thickness and hardness
- Integrity tracking
- Ablation depth

### Breaches

When armor is penetrated:
- Breach created with area (m²)
- Atmospheric pressure loss
- Can be sealed by crew (future feature)
- Affects compartment integrity

## Landing Gear

**NEW**: Enhanced tip-over detection using spacecraft attitude

```typescript
import { LandingGear } from './landing-gear';

const landingGear = new LandingGear({
  numLegs: 4,
  legLength: 2.0,
  springConstant: 50000,
  damperConstant: 5000
});

// Deploy gear
landingGear.deploy();

// Get state with attitude
const state = landingGear.getState(shipOrientation);

console.log(`Tip angle: ${state.tipAngle}°`);
console.log(`Stable: ${state.isStable}`);
console.log(`Legs in contact: ${state.numLegsInContact}`);
```

**Features:**
- Realistic spring-damper suspension
- Ground contact detection
- **NEW**: Attitude-based tip angle calculation
- Stability analysis (requires 3+ legs, <45° tip)
- Hard landing damage model

## Integration Examples

See `ship-integration-example.ts` for complete examples:

1. **Combat Simulation**: Two ships in battle with weapons and damage
2. **Weapon Damage Demo**: Testing different damage types on armor
3. **Combat AI**: Automatic targeting and engagement

## System Updates

All ship systems update in a coordinated manner:

```typescript
simulation.update(dt);
```

This updates (in order):
1. World physics (orbits, n-body gravity)
2. Ship physics (thrust, rotation, collisions)
3. Ship subsystems (power, thermal, life support)
4. Weapons (cooldowns)
5. Projectiles and missiles (ballistics, guidance)

## Performance Considerations

- Use `CompleteSimulationSystem` for managing multiple ships
- Projectiles and missiles auto-cleanup when expired
- Hull damage calculations are optimized for gameplay balance
- Consider spatial partitioning for large numbers of ships

## Future Enhancements

Potential additions:
- Electronic warfare and countermeasures
- Point defense systems
- Shield systems
- Crew-based damage control
- Docking and resource transfer
- Advanced flight control (SAS, autopilot)

## File Reference

| File | Purpose |
|------|---------|
| `integrated-ship.ts` | World physics integration |
| `weapons.ts` | Weapon systems and projectiles |
| `hull-damage.ts` | Armor and damage modeling |
| `landing-gear.ts` | Landing gear mechanics |
| `unified-ship-system.ts` | **Main integration layer** |
| `ship-combat.ts` | Combat computers and AI |
| `ship-integration-example.ts` | Usage examples |

## API Summary

### UnifiedShipSystem

```typescript
class UnifiedShipSystem {
  update(dt: number): void
  applyForce(force: Vector3): void
  applyImpulse(impulse: Vector3): void
  fireWeapon(weaponId: string, aimDirection: Vector3, target?: CelestialBody)
  addWeapon(weapon: Weapon): void
  getPosition(): Vector3
  getVelocity(): Vector3
  getHullIntegrity(): number
  getWeapons(): Weapon[]
}
```

### ShipCombatComputer

```typescript
class ShipCombatComputer {
  calculateProjectileFireSolution(target: UnifiedShipSystem, weaponId: string, speed: number): FireSolution
  calculateLaserFireSolution(target: UnifiedShipSystem, weaponId: string): FireSolution
  calculateMissileFireSolution(target: UnifiedShipSystem, weaponId: string): FireSolution
  getTargetInfo(target: UnifiedShipSystem): TargetInfo
  autoEngage(target: UnifiedShipSystem): boolean
  calculateEvasiveManeuver(threats: UnifiedShipSystem[]): Vector3
}
```

### CompleteSimulationSystem

```typescript
class CompleteSimulationSystem {
  addShip(config: UnifiedShipConfig): UnifiedShipSystem
  removeShip(shipId: string): void
  update(dt: number): void
  getShip(id: string): UnifiedShipSystem | undefined
  getAllShips(): UnifiedShipSystem[]
  getCombatManager(): CombatManager
}
```

---

**For questions or issues, refer to the example file or individual module documentation.**
