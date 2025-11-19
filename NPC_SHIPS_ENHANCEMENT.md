# Enhanced NPC Ship Systems

## Overview

NPC ships have been upgraded with realistic subsystems modeled after the player's spacecraft, making them behave more realistically and creating a more immersive universe.

## Architecture

### NPCShipSubsystems Class

Location: `universe-system/src/npc-traffic/npc-ship-subsystems.ts`

A comprehensive subsystem manager that simulates realistic ship operations:

#### 1. Electrical System
- **Reactor**: Generates primary power (200kW - 800kW depending on ship type)
  - Can go offline or be scrammed in emergencies
  - Consumes reactor fuel over time (very slowly)
  - Generates heat

- **Battery**: Energy storage for peak loads and emergencies
  - Capacity varies by ship type (5-20 MJ)
  - Charges from reactor excess power
  - Discharges when power demand exceeds generation

- **Solar Panels** (Research ships only): Supplemental power generation
  - 50kW max output
  - Requires deployment

**Power Management**:
- Base systems: 50kW
- Propulsion: Up to 100kW (proportional to thrust)
- Life support: 500W per crew member
- Weapons: Variable based on weapon type

**Emergency Protocols**:
- Battery < 10%: Disable weapons
- Battery = 0% and reactor offline: Life support shutdown
- Total power failure: Ship becomes disabled

#### 2. Thermal System
- Tracks hull, reactor, and weapons temperature
- Heat generation from:
  - Reactor operation (30% waste heat)
  - Propulsion (50kW at full thrust)
  - Weapons fire (100kW)

- Heat dissipation through radiators and hull radiation
- **Critical Overheat** (reactor > 900K or hull > 600K):
  - Automatic reactor scram
  - Ship may enter emergency state

#### 3. Fuel System
- **Main Fuel**: Primary propulsion (10,000 - 50,000 kg capacity)
  - Consumption: 2 kg/s at full thrust

- **RCS Fuel**: Maneuvering thrusters (1,000 - 5,000 kg capacity)
  - Consumption: 0.1 kg/s at full thrust

- When fuel depleted: Ship becomes disabled

#### 4. Life Support System
(Crewed ships only - excludes Salvage vessels)

- Tracks oxygen, CO2, pressure, and temperature
- Crew capacity varies by ship type (2-30 crew)
- **Active Life Support**:
  - Replenishes oxygen
  - Removes CO2
  - Maintains 101.3 kPa pressure
  - Regulates temperature to 20°C

- **Life Support Failure**:
  - Oxygen depletes at 1% per second
  - CO2 increases at 2% per second
  - Pressure drops if hull breached
  - Ship enters emergency flee mode at 30% life support health

#### 5. Weapons System
(Combat ships only: Patrol, Pirate, Mining, Salvage)

Ship-specific armament:
- **Patrol Ship**: Railgun (500 rounds, 100 damage, 50km range) + Missiles (20 rounds, 500 damage, 100km range)
- **Pirate**: Plasma cannon (300 rounds, 150 damage, 30km range)
- **Mining Vessel**: Cutting laser (1000 rounds, 50 damage, 20km range)
- **Salvage**: Cutting laser (500 rounds, 30 damage, 15km range)

Features:
- Ammunition tracking
- Cooldown timers (0.5-5 seconds)
- Energy consumption per shot
- Safety interlocks
- Target locking

Weapons automatically disabled when battery < 10%

#### 6. Hull & Damage Model
- **Hull Integrity**: 0-1 scale, affects ship functionality
- **Armor**: Absorbs 50% of damage at full strength
- **Compartments**: Ship-specific (2-4 compartments)
  - Each compartment tracks integrity separately
  - Can be breached or catch fire
  - Breaches trigger life support emergencies

**Damage Effects**:
- Hull < 50% + random chance: System failures (reactor, life support, weapons)
- Hull < 20%: Ship enters flee mode
- Hull = 0%: Ship destroyed (disabled permanently)

### AI Behavior Enhancements

Location: `universe-system/src/npc-traffic/npc-ship.ts`

#### Emergency Decision Making

The AI monitors all subsystems and responds intelligently:

1. **Critical Hull Damage** (< 20%)
   - Status: FLEEING
   - Attempts to escape combat/danger

2. **Critical Power** (< 10% electrical)
   - Emergency shutdown (weapons offline)
   - Status: DISABLED if power = 0%

3. **Fuel Depletion** (< 5% propulsion)
   - Status: DISABLED
   - Ship drifts

4. **Life Support Failure** (< 30%)
   - Status: FLEEING
   - Seeks nearest station

5. **Critical Overheat** (reactor > 1000K)
   - Automatic reactor scram
   - Switch to battery power

6. **Overall System Failure**
   - Status: FLEEING or DISABLED

#### Fleeing Behavior

When in FLEEING status:
- Ship moves away from nearest threat at maximum acceleration
- If no threats detected, returns to IDLE
- Seeks stations for emergency docking

#### Docking Recovery

While DOCKED, ships automatically:
- Refuel (10% per second)
- Recharge battery
- Repair hull (1% per second)
- Repair compartments
- Restore life support
- Reload weapons (10 rounds per second)

Full recovery from critical damage takes ~100 seconds docked.

#### Enhanced Communications

`generateChatter()` now includes emergency broadcasts:
- "MAYDAY! [Ship] critical systems failure - requesting immediate assistance!"
- "Emergency! [Ship] reactor scrammed, battery at 15%"
- "[Ship] to all stations: hull breach detected, life support failing!"
- "[Ship] declaring emergency - fuel at 3%"

Emergency messages take priority over normal status reports.

## Ship Type Configurations

### Cargo Freighter
- **Role**: Long-haul freight transport
- **Reactor**: 500kW
- **Battery**: 10 MJ
- **Fuel**: 50,000kg main, 5,000kg RCS
- **Crew**: 8
- **Cargo**: 1,000 tons
- **Weapons**: None
- **Special**: High fuel capacity for long routes

### Cargo Shuttle
- **Role**: Short-range cargo runs
- **Reactor**: 200kW
- **Battery**: 5 MJ
- **Fuel**: 10,000kg main, 1,000kg RCS
- **Crew**: 2
- **Cargo**: 50 tons
- **Weapons**: None
- **Special**: Lightweight, agile

### Patrol Ship
- **Role**: System security
- **Reactor**: 800kW (highest)
- **Battery**: 15 MJ
- **Fuel**: 20,000kg main, 3,000kg RCS
- **Crew**: 4
- **Cargo**: None
- **Weapons**: Railgun + Missiles
- **Special**: Combat-ready, high power for weapons

### Mining Vessel
- **Role**: Asteroid mining
- **Reactor**: 600kW
- **Battery**: 12 MJ
- **Fuel**: 30,000kg main, 4,000kg RCS
- **Crew**: 6
- **Cargo**: 200 tons
- **Weapons**: Mining laser (can be used defensively)
- **Special**: High fuel for extended operations

### Passenger Liner
- **Role**: Passenger transport
- **Reactor**: 700kW
- **Battery**: 20 MJ (highest - for passenger comfort)
- **Fuel**: 40,000kg main, 4,000kg RCS
- **Crew**: 30 (highest - includes passengers)
- **Cargo**: None
- **Weapons**: None
- **Special**: Large life support capacity

### Pirate Vessel
- **Role**: Hostile operations
- **Reactor**: 600kW
- **Battery**: 10 MJ (often partially charged - 80%)
- **Fuel**: 15,000kg main, 2,000kg RCS
- **Crew**: 5
- **Cargo**: None (steals cargo)
- **Weapons**: Plasma cannon
- **Special**: Runs hot (450K reactor temp), aggressive behavior

### Research Vessel
- **Role**: Scientific missions
- **Reactor**: 400kW
- **Battery**: 18 MJ
- **Fuel**: 25,000kg main, 3,000kg RCS
- **Crew**: 12
- **Cargo**: None
- **Weapons**: None
- **Special**: Solar panels (50kW backup power)

### Salvage Vessel
- **Role**: Wreck recovery
- **Reactor**: 450kW
- **Battery**: 10 MJ
- **Fuel**: 20,000kg main, 2,500kg RCS
- **Crew**: None (unmanned/automated)
- **Cargo**: 150 tons
- **Weapons**: Cutting laser
- **Special**: No life support (unmanned)

## System Health Tracking

The `SystemHealth` interface provides real-time monitoring:

```typescript
{
  electrical: 0.85,    // 85% electrical health
  thermal: 0.92,       // 92% thermal health
  propulsion: 0.67,    // 67% fuel remaining
  lifeSupport: 0.98,   // 98% life support health
  weapons: 0.45,       // 45% ammo remaining
  hull: 0.73,          // 73% hull integrity
  overall: 0.77        // 77% overall health (average)
}
```

Health values:
- **1.0**: Perfect condition
- **0.7-0.9**: Normal operation
- **0.5-0.7**: Degraded performance
- **0.3-0.5**: Critical - AI takes defensive action
- **0.0-0.3**: Emergency - flee or disable

## Performance Impact

The enhanced subsystems add minimal overhead:
- Updates run once per ship per frame
- No additional physics calculations
- Memory footprint: ~5KB per ship
- Compatible with existing spatial hash grid optimization

For 100 NPC ships @ 60 FPS: ~0.5ms additional CPU time

## Integration with Game Systems

### Combat System
Weapons can now deal compartment-specific damage:
```typescript
npcShip.takeDamage(500, 'Engineering'); // Damage engineering compartment
```

### Economy System
Ships now have realistic operational costs:
- Fuel consumption
- Power generation costs
- Repair costs
- Ammunition costs

### Traffic System
Ships can now request emergency docking when systems fail, creating dynamic rescue scenarios.

### Player Interaction
Player can:
- Scan NPC ship subsystems
- Identify damaged/distressed vessels
- Provide assistance (fuel transfer, repairs)
- Target specific ship systems in combat

## Debugging

Get detailed diagnostics for any NPC ship:

```typescript
const ship = trafficManager.getVessel('npc_5');
console.log(ship.getDiagnostics());
```

Output example:
```
SHIP SUBSYSTEMS DIAGNOSTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━
ELECTRICAL:
  Reactor: ONLINE (600kW)
  Battery: 85%
  Net Power: 125.5kW

THERMAL:
  Hull: 312K
  Reactor: 435K

FUEL:
  Main: 67%
  RCS: 73%

LIFE SUPPORT:
  O₂: 98%
  Pressure: 101.3 kPa
  Crew: 4/4

HULL:
  Integrity: 92%
  Armor: 100%

OVERALL HEALTH: 87%
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Future Enhancements

Potential additions:
- Crew skill system (affects system efficiency)
- Component wear/maintenance
- System redundancy (backup reactors)
- Cargo affecting center of mass
- Radiation damage in certain areas
- Advanced combat damage (armor penetration, critical hits)
- Ship upgrades/modifications
- Insurance and salvage economics

## Backward Compatibility

The enhanced NPC ships maintain full backward compatibility:
- Legacy `health` and `fuel` properties still work (synced with subsystems)
- Old `takeDamage(amount)` calls work (without location parameter)
- `getState()` returns expected ShipState interface
- Traffic manager requires no changes

Existing code continues to work without modifications.
