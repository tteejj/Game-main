# Ship Mechanics Integration Guide

This document describes the complete ship mechanics system and how all components integrate together.

## ⭐ QUICK START - Use CompleteShip

**The ONE TRUE ship implementation is `CompleteShip` in `complete-ship.ts`**

All other ship classes are either deprecated or low-level components. Use CompleteShip for everything.

See **`complete-ship-example.ts`** for a full working example.

## What You Get

- ✅ Complete physics simulation (gravity, collisions, orbital mechanics)
- ✅ All subsystems (power, thermal, life support, damage control)
- ✅ Weapons (railguns, lasers, missiles) with auto-targeting
- ✅ Combat computer with fire solutions
- ✅ Hull damage and armor penetration
- ✅ Crew simulation with oxygen tracking
- ✅ Full event system

## Quick Example

```typescript
import { World } from './world';
import { CompleteSimulation } from './complete-ship';
import { createFrigate } from './complete-ship-example';

// Create simulation
const world = new World();
const simulation = new CompleteSimulation(world);

// Add ships
const ship1 = simulation.addShip(
  createFrigate({ x: 0, y: 0, z: 1000 }, { x: 100, y: 0, z: 0 })
);
const ship2 = simulation.addShip(
  createFrigate({ x: 10000, y: 0, z: 1000 }, { x: -50, y: 0, z: 0 })
);

// Run simulation
const dt = 0.1;
simulation.update(dt);

// Combat
ship1.combatComputer.autoEngage(ship2 as any);

// Check status
const status = ship1.getStatus();
console.log(`Hull: ${(status.ship.hullIntegrity * 100).toFixed(1)}%`);
console.log(`Power: ${status.power.generation}kW`);
console.log(`Crew: ${status.lifeSupport.crewHealthy}/${status.lifeSupport.crewTotal}`);
```

## Architecture

### ⭐ Use These Classes

**CompleteShip** (`complete-ship.ts`)
- The ONE TRUE ship class
- Has ALL features
- Use this for everything

**CompleteSimulation** (`complete-ship.ts`)
- Manages world and all ships
- Auto-tracks projectiles and missiles
- Centralized collision detection

### Don't Use Directly (Internal Components)

- `IntegratedShip` - Used internally by CompleteShip
- `WeaponSystem` - Used internally by CompleteShip
- `HullStructure` - Accessed via `ship.hull`
- Power/Thermal/LifeSupport - Accessed via `ship.power`, `ship.thermal`, etc.

### ⚠️ Deprecated (Being Removed)

- `UnifiedShip` → Use `CompleteShip`
- `UnifiedShipSystem` → Use `CompleteShip`
- `CompleteSimulationSystem` → Use `CompleteSimulation`

## Complete API

### CompleteShip

```typescript
class CompleteShip {
  // Identity
  readonly id: string
  readonly name: string
  readonly class: string

  // Update
  update(dt: number): void

  // Physics
  applyForce(force: Vector3): void
  applyImpulse(impulse: Vector3): void
  getPosition(): Vector3
  getVelocity(): Vector3
  getHullIntegrity(): number

  // Weapons
  fireWeapon(weaponId: string, aimDirection: Vector3, target?: CelestialBody)
  getWeapons(): Weapon[]

  // Status
  getStatus(): CompleteShipStatus

  // Subsystems (direct access)
  hull: HullStructure
  power: PowerBudgetSystem
  thermal: ThermalBudgetSystem
  lifeSupport: LifeSupportSystem
  systemDamage: SystemDamageManager
  damageControl: DamageControlSystem
  combatComputer: ShipCombatComputer

  // Events
  on(event: string, callback: Function): void
  emit(event: string, ...args: any[]): void
}
```

### CompleteSimulation

```typescript
class CompleteSimulation {
  addShip(config: CompleteShipConfig): CompleteShip
  removeShip(shipId: string): void
  update(dt: number): void
  
  getShip(id: string): CompleteShip | undefined
  getAllShips(): CompleteShip[]
  getAllProjectiles(): Projectile[]
  getAllMissiles(): Missile[]
  
  getSimulationTime(): number
  getWorld(): World
}
```

### Combat Computer

```typescript
ship.combatComputer.autoEngage(target)
ship.combatComputer.calculateProjectileFireSolution(target, weaponId, speed)
ship.combatComputer.calculateLaserFireSolution(target, weaponId)
ship.combatComputer.calculateEvasiveManeuver(threats)
```

## Weapon Types

### Railgun (Kinetic)
- High-velocity projectiles
- Ballistic trajectory (affected by gravity)
- Armor penetration calculated
- Recoil applied to ship

### Laser (Hitscan)
- Instant hit (speed of light)
- Thermal ablation damage
- High power consumption
- No ballistic drop

### Missile (Guided)
- Self-propelled with fuel
- Proportional navigation guidance
- Proximity fuse detonation
- Combined kinetic + explosive damage

## Hull Damage

Ships have layered armor with realistic damage:

- **Kinetic** - Projectile mass/velocity/angle → Penetration
- **Thermal** - Energy absorption → Ablation
- **Explosive** - Blast radius → Area damage

### Compartments
- Pressure tracking
- Breach mechanics
- Crew locations
- System locations

### Armor
- Multiple layers
- Material types (Steel, Titanium, Composite, Ceramic)
- Hardness and thickness
- Integrity tracking

## Events

```typescript
ship.on('collision', (event) => { /* ... */ })
ship.on('damage', (event) => { /* ... */ })
ship.on('weaponFired', (result) => { /* ... */ })
ship.on('laserFired', (event) => { /* ... */ })
```

## Files

| File | Purpose | Use It? |
|------|---------|---------|
| `complete-ship.ts` | ⭐ Main ship class | **YES** |
| `complete-ship-example.ts` | Working example | **YES** |
| `integrated-ship.ts` | Physics component | No (internal) |
| `weapons.ts` | Weapon component | No (internal) |
| `ship-combat.ts` | Combat computer | No (use `ship.combatComputer`) |
| `hull-damage.ts` | Hull system | No (use `ship.hull`) |
| `power-budget.ts` | Power system | No (use `ship.power`) |
| `thermal-budget.ts` | Thermal system | No (use `ship.thermal`) |
| `life-support.ts` | Life support | No (use `ship.lifeSupport`) |
| `system-damage.ts` | System damage | No (use `ship.systemDamage`) |
| `damage-control.ts` | Repair crews | No (use `ship.damageControl`) |
| `ship-configuration.ts` | Templates | Use `createFrigate()` helper |
| `unified-ship.ts` | ⚠️ Deprecated | **NO** |
| `unified-ship-system.ts` | ⚠️ Deprecated | **NO** |

## Migration

### From UnifiedShipSystem

```typescript
// OLD
import { CompleteSimulationSystem } from './unified-ship-system';
const sim = new CompleteSimulationSystem(world);

// NEW
import { CompleteSimulation } from './complete-ship';
const sim = new CompleteSimulation(world);
// Same API!
```

### From UnifiedShip

```typescript
// OLD
import { UnifiedShip } from './unified-ship';

// NEW
import { CompleteShip } from './complete-ship';
// More features!
```

---

**See `complete-ship-example.ts` for complete working code**
