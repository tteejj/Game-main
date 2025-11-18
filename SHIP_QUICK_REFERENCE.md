# Ship Implementation Quick Reference

## Core Classes

### Spacecraft.ts (Main Class)
The primary spacecraft class with 24 integrated subsystems.

**Location:** `/home/user/Game-main/physics-modules/src/spacecraft.ts`

**Key subsystems:**
- Propulsion: `mainEngine`, `rcs`
- Power: `fuel`, `electrical`, `gas`
- Control: `flightControl`, `navigation`
- Sensors: `radar`, `opticalSensors`, `esm`
- Weapons: `weapons`, `countermeasures`
- Systems: `thermal`, `coolant`, `lifeSupport`, `environmental`
- And 12+ more...

### SpacecraftAdapter.ts (Game Bridge)
Interfaces between game code and physics simulation.

**Location:** `/home/user/Game-main/game/src/spacecraft-adapter.ts`

**Key methods:**
- Control: `setThrottle()`, `fireEngine()`, `setGimbal()`
- Power: `startReactor()`, `setReactorThrottle()`
- Weapons: `fireWeapon()`, `engageTarget()`
- Sensors: `setRadarMode()`, `getRadarContacts()`
- Telemetry: `getState()`, `getNavigationTelemetry()`

### Game.ts (Game World)
Main game loop and universe integration.

**Location:** `/home/user/Game-main/game/src/game.ts`

**Features:**
- SpacecraftAdapter for player ship
- StarSystem for universe generation
- TrafficManager for NPC ships
- GameWorld for terrain and orbital mechanics
- Gravity simulation
- Collision detection

---

## Control Stations (5 Total)

**Press 1-5 to switch, or TAB to cycle**

### 1. HELM (Propulsion)
- Main engine: `F` (valve), `G` (arm), `H` (fire), `R` (cutoff)
- Throttle: `Q`/`A` (up/down)
- Gimbal: `W`/`S`/`E`/`D` (pitch/roll)
- RCS: Arrow keys + `[`/`]`/`{`/`}`

### 2. ENGINEERING (Power & Thermal)
- Reactor: `R` (start), `Shift+R` (SCRAM)
- Throttle: `Q`/`A`
- Coolant: `C` (pump 0), `Shift+C` (pump 1), `X` (cross-connect)
- Breakers: `B`

### 3. NAVIGATION (Sensors & Autopilot)
- Radar: `R` (toggle), `Shift+R` (range), `T` (track), `U` (drop)
- Autopilot: `A` (cycle mode)
- Nav: `I` (intercept), `Ctrl+I` (solution)

### 4. LIFE SUPPORT (Environmental)
- O2/CO2: `O` (O2 gen), `C` (CO2 scrubber)
- Compartments: `B` (door), `E` (seal), `V` (vent), `F` (fire)

### 5. WEAPONS (Combat)
- Safety: `S` (toggle)
- Selection: `W`/`X` (weapons), `T` (target)
- Fire: `F` (selected), `E` (engage all)
- Defense: `P` (point defense), `A` (auto-engage), `J` (EW), `C` (countermeasures), `D` (deploy)

---

## Physics Architecture

```
ShipPhysics (6-DOF dynamics)
    ├── Position/Velocity (meters, m/s)
    ├── Attitude (quaternion)
    ├── Angular Velocity (rad/s)
    └── Mass (dry + propellant)

IntegratedShip (World Bridge)
    ├── SpacecraftPhysics
    ├── CelestialBody (for sensors/collisions)
    └── HullDamageSystem

UnifiedShip (Complete Integration)
    ├── IntegratedShip (physics)
    └── CompleteShip (subsystems)
```

---

## Physics Features

### Movement
- 6-DOF rigid body dynamics
- Quaternion-based attitude (no gimbal lock)
- Position integration: velocity -> position
- Attitude integration: angular velocity -> quaternion

### Forces
- Gravity from celestial bodies (inverse square law)
- Main engine thrust (3D vector)
- RCS torque (3-axis rotation)
- Atmospheric drag
- Thermal heating from friction

### Mass
- Dry mass: 5000 kg (default)
- Propellant: 3000 kg (default)
- Variable mass with fuel consumption
- Center of mass tracking

---

## Key Files

### Physics Core (12 files)
- `spacecraft.ts` - Main class (24 subsystems)
- `ship-physics.ts` - 6-DOF dynamics
- `integrated-ship.ts` - World integration
- `unified-ship.ts` - Physics + subsystems
- `flight-control.ts` - SAS, autopilot
- `navigation.ts` - Trajectory, telemetry
- `main-engine.ts` - Main thruster
- `rcs-system.ts` - RCS thrusters
- `electrical-system.ts` - Power distribution
- `thermal-system.ts` - Heat management
- `fuel-system.ts` - Fuel management
- `coolant-system.ts` - Cooling system

### Weapons & Combat (4 files)
- `weapons.ts` - Weapons system
- `combat-computer.ts` - Fire control
- `kinetic-weapons.ts` - Projectiles
- `missile-weapons.ts` - Guided missiles
- `energy-weapons.ts` - Lasers, particle beams
- `hull-damage.ts` - Damage modeling

### Game Integration (2 files)
- `game.ts` - Game loop and universe
- `spacecraft-adapter.ts` - Game bridge

### UI (6 files)
- `ui-manager.ts` - Station manager
- `helm-panel.ts` - Propulsion station
- `engineering-panel.ts` - Power station
- `navigation-panel.ts` - Navigation station
- `lifesupport-panel.ts` - Life support station
- `weapons-panel.ts` - Weapons station

### UI Components (5 files)
- `controls.ts` - Buttons, sliders, toggles, knobs
- `analog-gauge.ts` - Needle gauges
- `seven-segment-display.ts` - Digital displays
- `ascii-box.ts` - Text boxes
- `wire-graphics.ts` - Vector graphics

---

## Subsystem Overview

### Propulsion (2 systems)
- **MainEngine**: Thrust vectoring with gimbal control
  - Thrust: 100,000 N (default)
  - ISP: 300s (default)
  - Gimbal: ±15° pitch/roll
  
- **RCSSystem**: 12 thrusters for attitude control
  - 8 logical groups (bow-port, stern-starboard, etc.)
  - Each: 5,000 N thrust
  - Used for rotation and fine positioning

### Fuel (1 system)
- **FuelSystem**: Multi-tank with crossfeed
  - Tanks: Main, RCS, Auxiliary
  - Crossfeed valve
  - Emergency dump/vent
  - Propellant slosh simulation
  - Mass tracking

### Power (2 systems)
- **ElectricalSystem**: Power distribution
  - Nuclear reactor (50 kW)
  - Solar panels (10 kW)
  - Battery bank (1 MWh)
  - Circuit breakers
  - Power buses and distribution
  
- **CompressedGasSystem**: Gas storage
  - N2 (nitrogen)
  - O2 (oxygen)
  - He (helium)

### Thermal (2 systems)
- **ThermalSystem**: Heat generation and tracking
  - Heat sources: reactor, engine, weapons
  - Temperature monitoring
  - Overheat damage
  
- **CoolantSystem**: Cooling and temperature control
  - Radiators (passive cooling)
  - Coolant pumps (2)
  - Cross-connect valve
  - Flow rate management

### Flight Control (2 systems)
- **FlightControlSystem**: SAS and autopilot
  - 9 SAS modes: HOLD, PROGRADE, RETROGRADE, NORMAL, ANTINORMAL, RADIAL_IN, RADIAL_OUT, TARGET, LANDING_APPROACH
  - PID control loops
  - Attitude feedback
  - Autopilot attitude hold
  
- **NavigationSystem**: Trajectory and telemetry
  - Position/velocity vectors
  - Altitude and speed
  - Impact prediction
  - Suicide burn calculation
  - Flight telemetry

### Sensors (4 systems)
- **RadarSystem**: Active detection
  - Range: 1000 km
  - Frequency: 10 GHz
  - Power: 100 kW
  - Can track contacts
  
- **OpticalSensorsSystem**: Passive visual detection
  - Range: 500 km
  - Visual magnitude detection
  
- **ESMSystem**: Electronic Support Measures (passive)
  - Detects transmissions
  - Identifies emissions
  
- **SensorFusionSystem**: Combines all sensors
  - Contact fusion
  - Accuracy improvements

### Weapons (3 systems)
- **WeaponsControlSystem**: Fire control
  - Target selection
  - Weapon selection
  - Safety interlocks
  - Fire solution computation
  
- **CountermeasureSystem**: Defense
  - Flares for IR missiles
  - Decoys for radar
  - Storage: 100 rounds
  
- **CombatComputer**: Targeting
  - Intercept point calculation
  - Lead calculation
  - Damage prediction

### Damage & Structure (2 systems)
- **HullStructure**: Hull composition
  - Compartments (pressurized sections)
  - Armor layers (titanium, ceramic, etc.)
  - Material properties (hardness, ablation)
  
- **SystemDamageManager**: System health
  - Tracks damage to each system
  - Cascading failure simulation
  - Repair crew management

### Life Support (3 systems)
- **LifeSupportSystem**: Atmosphere and comfort
  - O2 generation
  - CO2 scrubbing
  - Pressure regulation
  - Temperature control
  
- **CrewSystem**: Crew management
  - Crew count and status
  - Skill levels
  - Fatigue tracking
  
- **EnvironmentalSystem**: HVAC
  - Air circulation
  - Thermal regulation
  - Humidity control

### Navigation & Docking (3 systems)
- **NavigationComputer**: Advanced calculations
  - Intercept course planning
  - Burn timing
  - Delta-V calculations
  
- **DockingSystem**: Docking operations
  - Docking port management
  - Capture sequence
  - Hard dock completion
  
- **LandingSystem**: Landing operations
  - Landing gear deployment
  - Suspension system
  - Terrain detection
  - Landing safety checks

### Cargo & Communications (3 systems)
- **CargoManagementSystem**: Cargo operations
  - Cargo loading/unloading
  - Cargo tracking
  - Weight distribution
  
- **CommunicationsSystem**: Radio
  - Messaging
  - Relay communication
  
- **ElectronicWarfareSystem**: EW operations
  - Jamming
  - Radar deception
  - Signature management

### Advanced Systems (3 systems)
- **OrbitalMechanicsSystem**: Orbital calculations
  - Orbital parameters
  - Hohmann transfers (planned)
  
- **CenterOfMassSystem**: Mass tracking
  - Center of mass calculation
  - Moment of inertia updates
  
- **SystemsIntegrator**: System coordination
  - Power distribution
  - Thermal management
  - Damage propagation

---

## Complete Feature List (Implemented: 95%)

### Physics ✅
- 6-DOF dynamics, gravity, atmosphere, drag, thermal heating
- Quaternion attitude, multi-body gravity
- Trajectory prediction, impact calculation, suicide burn

### Propulsion ✅
- Main engine with gimbal, RCS (12 thrusters)
- Fuel system with crossfeed, dump/vent
- Propellant slosh, ISP calculation

### Flight Control ✅
- SAS (9 modes), autopilot, PID loops
- Attitude hold, velocity vector modes
- Flight telemetry, impact prediction

### Power & Thermal ✅
- Reactor, batteries, solar panels
- Power distribution, breakers
- Thermal monitoring, radiators, coolant pumps

### Navigation & Sensors ✅
- Radar (active), optical (passive), ESM
- Sensor fusion, contact tracking
- Navigation computer, intercept calculation

### Weapons & Combat ✅
- Kinetic, laser, missile weapons
- Hull damage, armor penetration
- Point defense, countermeasures, EW

### Life Support & Environmental ✅
- O2/CO2 management, atmosphere
- Crew management, fire suppression
- Bulkhead doors, breach sealing

### Landing & Docking ✅
- Landing gear, suspension
- Terrain detection, landing checks
- Docking ports, capture sequence

### Game Integration ✅
- Universe generation, NPC traffic
- Gravity simulation, collisions
- Economy, communications

---

## Common Tasks

### Start the reactor
```
Station: ENGINEERING
Press: R (waits 30s), then Q/A to adjust throttle
```

### Fire the main engine
```
Station: HELM
Press: F (fuel valve), G (arm), H (fire)
Use Q/A for throttle, W/S for gimbal pitch
```

### Engage a target
```
Station: WEAPONS
Press: S (toggle safety OFF), T (cycle target), F (fire) or E (engage all)
Optional: P (point defense), J (EW), C/D (countermeasures)
```

### Take a radar reading
```
Station: NAVIGATION
Press: R (toggle), Shift+R (adjust range), T (track target)
Shows contacts with range/bearing
```

### Check ship status
```
Any Station: Press 1-2-3-4-5 to view different systems
Telemetry available in getState(), getNavigationTelemetry(), etc.
```

---

## Architecture Highlights

1. **Layered Design**: Physics -> Subsystems -> Game -> UI
2. **Component Based**: 24 independent subsystems
3. **Event Driven**: Damage via collision events
4. **Well Tested**: 219+ unit tests (99.5% pass)
5. **No Gimbal Lock**: Quaternion-based attitude
6. **Realistic**: Multi-body gravity, ISP, thermal modeling
7. **Extensible**: Easy to add new systems or features

---

## Gaps & Planned Features

### Missing Gameplay Features
- Save/load game
- Multiple ships
- Mission variety
- Faction system
- Reputation
- 3D visualization

### Missing Physics Features
- True N-body gravity
- Magnetic fields
- Solar wind
- Wind/turbulence
- Advanced gimbal

### Missing Propulsion
- Ion drives
- Nuclear pulse
- Variable ISP
- Control surfaces

### Missing Combat
- Ballistic prediction
- Weapon groups
- Shield systems
- Better AI

---

See `SHIP_IMPLEMENTATION_OVERVIEW.md` for comprehensive details.
