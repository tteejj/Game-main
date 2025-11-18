# Ship Systems Architecture Diagram

## High-Level System Integration

```
┌──────────────────────────────────────────────────────────────────┐
│                          GAME LOOP                               │
│                      (game/src/game.ts)                          │
│  • Universe generation (Star systems, planets, moons)            │
│  • NPC traffic management (5-10 ships)                           │
│  • Gravity simulation (multi-body)                               │
│  • Collision detection                                           │
│  • Sensor updates                                                │
│  • Time management (1-10x acceleration)                          │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SPACECRAFT ADAPTER                             │
│           (game/src/spacecraft-adapter.ts)                       │
│  • Game ←→ Physics interface                                     │
│  • Command translation                                           │
│  • State querying                                                │
│  • Telemetry distribution                                        │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MAIN SPACECRAFT CLASS                         │
│        (physics-modules/src/spacecraft.ts)                       │
│  Contains 24 integrated subsystems (see below)                   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Physics      Subsystems      Integration
    Layer          Layer          Layer
```

## Physics Layer

```
┌─────────────────────────────────────────────────────┐
│            PHYSICS SIMULATION                       │
│  (physics-modules/src/ship-physics.ts)             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  State:                                             │
│  • Position: Vector3 (meters)                      │
│  • Velocity: Vector3 (m/s)                         │
│  • Attitude: Quaternion (rotation)                 │
│  • Angular Velocity: Vector3 (rad/s)              │
│  • Dry Mass: number (kg)                           │
│  • Propellant Mass: number (kg)                    │
│                                                     │
│  Forces Applied:                                   │
│  • Gravity: F = GM/r² (from celestial bodies)     │
│  • Main Engine Thrust: (3-axis vector)            │
│  • RCS Torque: (rotation vectors)                 │
│  • Drag: (from atmosphere)                        │
│                                                     │
│  Update Loop:                                       │
│  1. Calculate acceleration (gravity + thrust)     │
│  2. Integrate velocity → position                 │
│  3. Integrate angular velocity → attitude         │
│  4. Update mass (fuel consumption)                │
│                                                     │
└─────────────────────────────────────────────────────┘
        │                           │
        ▼                           ▼
   ┌─────────────┐         ┌──────────────────┐
   │ Integrated  │         │ Unified Ship     │
   │ Ship        │         │                  │
   │             │         │ (Seamless        │
   │ • Collisions│         │  integration     │
   │ • Damage    │         │  of physics +    │
   │ • Sensors   │         │  subsystems)     │
   └─────────────┘         └──────────────────┘
```

## Complete Subsystems Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     SPACECRAFT (24 SYSTEMS)                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PROPULSION (2)           POWER & THERMAL (5)              │
│  ├─ MainEngine            ├─ FuelSystem                     │
│  │  ├─ Thrust: 100kN      │  ├─ Multi-tank                 │
│  │  ├─ Gimbal: ±15°       │  ├─ Crossfeed valve           │
│  │  └─ ISP: 300s          │  ├─ Dump/vent                  │
│  └─ RCSSystem             │  └─ Propellant slosh           │
│     ├─ 12 thrusters       ├─ ElectricalSystem              │
│     ├─ 8 groups           │  ├─ Reactor (50kW)            │
│     └─ 5kN each           │  ├─ Batteries (1MWh)          │
│                           │  ├─ Solar (10kW)              │
│  CONTROL (3)              │  └─ Breakers                    │
│  ├─ FlightControl         ├─ CompressedGas                 │
│  │  ├─ SAS (9 modes)      │  ├─ N2, O2, He               │
│  │  ├─ Autopilot          │  └─ Pressure tanks            │
│  │  └─ PID loops          ├─ ThermalSystem                │
│  ├─ Navigation            │  ├─ Heat tracking             │
│  │  ├─ Trajectory         │  ├─ Temp warnings             │
│  │  ├─ Impact calc        │  └─ Overheat damage           │
│  │  └─ Telemetry          └─ CoolantSystem                │
│  └─ NavComputer           ├─ Radiators                     │
│     ├─ Intercept          ├─ Pumps (2)                    │
│     └─ Burn timing        └─ Cross-connect                 │
│                                                             │
│  SENSORS (4)              WEAPONS & COMBAT (3)             │
│  ├─ RadarSystem           ├─ WeaponsControl                │
│  │  ├─ Range: 1000km      │  ├─ Fire control              │
│  │  ├─ 10GHz              │  ├─ Targeting                 │
│  │  └─ 100kW              │  └─ Safety interlocks         │
│  ├─ OpticalSensors        ├─ CombatComputer               │
│  │  └─ Range: 500km       │  ├─ Intercept calc           │
│  ├─ ESMSystem             │  ├─ Lead calculation          │
│  │  └─ Passive            │  └─ Damage predict            │
│  └─ SensorFusion          └─ Countermeasures              │
│     └─ Fusion             ├─ Flares (100)                 │
│                           └─ Decoys                        │
│  DAMAGE & STRUCTURE (2)                                    │
│  ├─ Hull                  SPECIAL SYSTEMS (3)             │
│  │  ├─ Compartments       ├─ CenterOfMass                 │
│  │  ├─ Armor layers       │  ├─ Mass tracking             │
│  │  └─ Breaches           │  └─ Moment update             │
│  └─ SystemDamage          ├─ OrbitalMechanics             │
│     ├─ Damage tracking    │  ├─ Parameters                │
│     ├─ Cascading fail     │  └─ Hohmann (planned)         │
│     └─ Repair             └─ SystemsIntegrator            │
│                              ├─ Power dist                │
│  DOCKING & LANDING (3)       ├─ Thermal mgt               │
│  ├─ DockingSystem        └─ Damage cascade               │
│  │  ├─ Ports                                              │
│  │  └─ Capture           OTHER SYSTEMS (3)               │
│  ├─ LandingSystem         ├─ LifeSupport                  │
│  │  ├─ Gear               │  ├─ O2/CO2                    │
│  │  └─ Suspension         │  ├─ Pressure                  │
│  └─ TerrainRadar          │  └─ Temp                      │
│     └─ Detection          ├─ CrewSystem                    │
│                           │  ├─ Count                     │
│  COMMS & EW (2)           │  ├─ Skills                    │
│  ├─ Communications        │  └─ Fatigue                   │
│  │  ├─ Radio              ├─ Environmental                │
│  │  └─ Relay              │  ├─ HVAC                      │
│  └─ ElectronicWarfare     │  └─ Humidity                  │
│     ├─ Jamming            └─ CargoMgmt                    │
│     └─ Decoys             ├─ Loading                      │
│                           └─ Weight dist                  │
│                                                             │
└──────────────────────────────────────────────────────────────┘
```

## System Interconnections

```
Power Distribution Network:
┌─ Reactor (50kW) ──┐
├─ Solar (10kW) ────┤
├─ Battery (1MWh) ──┼─→ Main Bus ──┬─→ MainEngine (20kW)
└─ Backup Bus ──────┘              ├─→ RCS (5kW)
                                   ├─→ Radar (10kW)
                                   ├─→ Life Support (5kW)
                                   ├─→ Coolant Pumps (3kW)
                                   └─→ Other Systems (7kW)

Thermal Network:
Heat Sources          Cooling Systems        Monitor
├─ Reactor ──┐
├─ Engine ───┼─→ Coolant Loop ──→ Radiators ──→ Thermal System
├─ Weapons ──┤              │                    (Temperature)
└─ Friction ─┘              └─→ Atmosphere (if applicable)

Fuel Distribution:
Main Tank ──┬─→ MainEngine (consumption)
            ├─→ RCS Tank (crossfeed valve)
            └─→ Auxiliary Tank (dump/vent)

Control Loop:
User Input ──→ FlightControl ──┬─→ MainEngine (thrust)
             (SAS, Autopilot)  └─→ RCS (torque)
                                     ↓
                              Physics Update
                                     ↓
                              Navigation (telemetry)
                                     ↓
                              Display/UI

Sensor System:
RadarSystem ──┐
OpticalSensors├─→ SensorFusion ──→ Contact List ──→ Weapons (targeting)
ESMSystem ────┘                                    Navigation (tracking)
                                                   UI (display)

Damage Propagation:
Collision ──→ Hull ──→ Armor Check ──┬─→ Hull Breach
              Breaches               ├─→ Compartment Pressure Loss
                                    ├─→ Fire
                                    └─→ System Damage ──→ Cascading Failures
                                        (Cascades through systems)
```

## Control Station Layout

```
┌─────────────────────────────────────────────┐
│  UI MANAGER (5 Stations)                   │
│  Press 1-5 to switch, TAB to cycle          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ HELM PANEL ────────────────────────┐   │
│  │ Controls: Main Engine, RCS, Gimbal  │   │
│  │ Displays: Throttle, Fuel, Velocity  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─ ENGINEERING PANEL ──────────────────┐  │
│  │ Controls: Reactor, Coolant, Breakers│  │
│  │ Displays: Power, Thermal, Fuel      │  │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─ NAVIGATION PANEL ───────────────────┐  │
│  │ Controls: Radar, Autopilot, Nav Comp│  │
│  │ Displays: Contacts, Trajectory      │  │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─ LIFE SUPPORT PANEL ─────────────────┐  │
│  │ Controls: O2/CO2, Doors, Fire Supp   │  │
│  │ Displays: Pressure, Temp, Crew      │  │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─ WEAPONS PANEL ──────────────────────┐  │
│  │ Controls: Firing, Targeting, EW     │  │
│  │ Displays: Weapons, Ammo, Targets    │  │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

## Data Flow Diagram

```
INPUT                PROCESSING              OUTPUT
────────────────────────────────────────────────────

Keyboard ──→ InputManager ──→ UIManager ──→ Canvas (Display)
              (key events)    (5 panels)     (1280x720)
                  ↓
            Panel Handlers
                  ↓
            SpacecraftAdapter
                  ↓
    ┌─ MainEngine.setThrottle()
    ├─ RCS.activateGroup()
    ├─ Electrical.setReactorThrottle()
    ├─ Thermal.monitorTemp()
    ├─ Weapons.selectTarget()
    └─ Navigation.plotCourse()
                  ↓
            Spacecraft (24 systems)
                  ↓
      ShipPhysics.update(forces, torques)
                  ↓
    ┌─ Gravity acceleration
    ├─ Thrust application
    ├─ Position/velocity integration
    ├─ Attitude quaternion update
    ├─ Mass tracking (fuel burn)
    └─ Collision detection
                  ↓
     IntegratedShip (world bridge)
                  ↓
    ┌─ Position sync to systems
    ├─ Sensor updates (contacts)
    ├─ Damage application (collisions)
    └─ Thermal effects
                  ↓
         All 24 systems updated
                  ↓
      Game.applyGravity() (multi-body)
         Game.checkCollisions()
         Game.updateSensors()
                  ↓
         SpacecraftAdapter.getState()
         Get telemetry (position, velocity, etc.)
                  ↓
       UIManager renders current panel
         Display updated on canvas
```

## Update Sequence (Per Frame @ 60 FPS)

```
Frame Start (16.7 ms)
│
├─ Input.onKeyDown() ──→ ProcessInput() ──→ Panel.handleInput()
│                                              │
│                                              ▼
│                                        Execute command
│                                        (e.g., setThrottle)
│
├─ Game.gameLoop()
│  │
│  ├─ Time management (deltaTime, acceleration)
│  │
│  ├─ GameWorld.update()     ──→ Terrain, satellites
│  │
│  ├─ StarSystem.update()    ──→ Planetary orbits
│  │
│  ├─ Game.applyGravity()    ──→ Multi-body gravity calculation
│  │
│  ├─ SpacecraftAdapter.update()
│  │  │
│  │  └─ Spacecraft.update()
│  │     │
│  │     ├─ ShipPhysics.update()     ──→ 6-DOF dynamics
│  │     │
│  │     ├─ Each subsystem.update()  ──→ Power, thermal, etc.
│  │     │
│  │     └─ SystemsIntegrator        ──→ Coordinate all systems
│  │
│  ├─ Game.updateTraffic()           ──→ NPC ships
│  │
│  ├─ Game.checkCollisions()         ──→ Impact detection
│  │
│  ├─ Game.updateSensors()           ──→ Radar, optical, ESM
│  │
│  └─ Game.render()                  ──→ Draw stats overlay
│
├─ UIManager.startRenderLoop()
│  │
│  └─ ActivePanel.render()           ──→ Draw current station
│
└─ requestAnimationFrame(gameLoop)   ──→ Next frame
```

## File Organization

```
Game-main/
├── physics-modules/src/
│   ├── spacecraft.ts                  ← Main class (24 systems)
│   ├── ship-physics.ts                ← 6-DOF dynamics
│   ├── integrated-ship.ts             ← World bridge
│   ├── unified-ship.ts                ← Physics + subsystems
│   │
│   ├── [Propulsion]
│   ├── main-engine.ts
│   ├── rcs-system.ts
│   │
│   ├── [Power]
│   ├── electrical-system.ts
│   ├── fuel-system.ts
│   │
│   ├── [Thermal]
│   ├── thermal-system.ts
│   ├── coolant-system.ts
│   │
│   ├── [Control]
│   ├── flight-control.ts
│   ├── navigation.ts
│   ├── nav-computer.ts
│   │
│   ├── [Sensors]
│   ├── radar-system.ts
│   ├── optical-sensors.ts
│   ├── esm-system.ts
│   ├── sensor-fusion.ts
│   │
│   ├── [Weapons]
│   ├── weapons.ts
│   ├── combat-computer.ts
│   ├── kinetic-weapons.ts
│   ├── missile-weapons.ts
│   ├── energy-weapons.ts
│   │
│   ├── [Damage]
│   ├── hull-damage.ts
│   ├── system-damage.ts
│   │
│   ├── [Other]
│   ├── docking-system.ts
│   ├── landing-system.ts
│   ├── life-support.ts
│   ├── environmental-systems.ts
│   ├── communications.ts
│   ├── cargo-management.ts
│   ├── electronic-warfare.ts
│   ├── countermeasures.ts
│   ├── crew-system.ts
│   ├── orbital-mechanics.ts
│   └── ... (60+ files total)
│
├── game/src/
│   ├── game.ts                        ← Main game loop
│   ├── spacecraft-adapter.ts          ← Physics bridge
│   ├── input.ts                       ← Input handler
│   ├── ui/
│   │   ├── ui-manager.ts              ← Station manager
│   │   └── panels/
│   │       ├── helm-panel.ts          ← Propulsion station
│   │       ├── engineering-panel.ts   ← Power station
│   │       ├── navigation-panel.ts    ← Navigation station
│   │       ├── lifesupport-panel.ts   ← Life support station
│   │       └── weapons-panel.ts       ← Weapons station
│
└── src/ui/components/
    ├── controls.ts                    ← UI components (buttons, etc.)
    ├── analog-gauge.ts
    ├── seven-segment-display.ts
    ├── ascii-box.ts
    └── wire-graphics.ts
```

## Performance Characteristics

```
Frame Budget: 16.7 ms (60 FPS target)

Typical Frame Breakdown:
├─ Input processing       ~0.5 ms
├─ Physics update         ~3.0 ms
│  ├─ Gravity calc       ~0.5 ms
│  ├─ Integration        ~0.5 ms
│  └─ Subsystems         ~2.0 ms
├─ Collision detection    ~1.0 ms
├─ Sensor updates         ~0.5 ms
├─ NPC traffic            ~1.0 ms
├─ UI rendering           ~8.0 ms
│  ├─ Clear canvas       ~0.5 ms
│  ├─ Draw graphics      ~5.0 ms
│  └─ Draw text          ~2.5 ms
└─ Buffer/overhead        ~2.5 ms
────────────────────────────────
  Total                  ~16.5 ms ✓

Memory Usage (approximate):
├─ Game world            ~5 MB
├─ Spacecraft systems    ~2 MB
├─ NPC ships (10x)       ~1 MB
├─ Terrain/satellites    ~3 MB
├─ Canvas buffer         ~4 MB
└─ Other                 ~5 MB
────────────────────────
  Total                  ~20 MB ✓
```

