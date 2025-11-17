# Satellite System Documentation

## Overview

The satellite system is a comprehensive modeling framework equivalent to the spacecraft system, providing realistic satellite simulation with full subsystem integration. Satellites now have the same level of detail and functionality as the main spacecraft.

## Architecture

### Comparison: Spacecraft vs Satellite

| Feature | Spacecraft | Satellite |
|---------|-----------|-----------|
| **Power** | Reactor + Battery | Solar Panels + Battery |
| **Propulsion** | Main Engine + RCS | Attitude Thrusters (optional) |
| **Attitude Control** | RCS + Gimbal | Reaction Wheels + Magnetorquers |
| **Thermal** | Radiators + Coolant | Radiators + Heaters |
| **Communications** | Long-range + Data Link | Transponders + Relay |
| **Sensors** | Radar + Optical + ESM | Mission-specific Sensors |
| **Weapons** | Kinetic + Energy + Missiles | N/A (except military) |
| **Life Support** | Full ECLSS | N/A (unmanned) |
| **Navigation** | Full Nav Computer | GPS/Navigation Beacons |

## Satellite Types

### 1. Communications Satellite (CommRelay)
**Purpose**: Data relay and communications
- **Mass**: 3,000 kg
- **Orbit**: 200km circular
- **Power**: 2x 20m² solar arrays (12 kW)
- **Key Systems**:
  - 100W transponder @ 12 GHz
  - 2.5m directional antenna (45 dB gain)
  - 5,000 Wh battery
  - 3-axis stabilization

**Use Cases**:
- Ship-to-ground communications relay
- Inter-satellite data links
- Navigation signal relay

### 2. Reconnaissance Satellite (ReconSat)
**Purpose**: Intelligence gathering and surveillance
- **Mass**: 6,000 kg
- **Orbit**: 100km circular (low for high-resolution imaging)
- **Power**: 50m² solar array (16 kW)
- **Key Systems**:
  - Optical telescope (0.3m resolution)
  - SAR radar (1m resolution)
  - 200W data link @ 26 GHz
  - 10,000 Wh battery
  - Earth-pointing attitude control

**Use Cases**:
- Surface mapping
- Target identification
- Terrain analysis
- Environmental monitoring

### 3. Navigation Satellite (NavSat)
**Purpose**: GPS-like positioning system
- **Mass**: 1,700 kg
- **Orbit**: 1,000km circular, 60° inclination
- **Power**: 25m² solar array (7.5 kW)
- **Key Systems**:
  - Dual-frequency beacons (L1 @ 1.575 GHz, L2 @ 1.227 GHz)
  - Omnidirectional antennas
  - Atomic clock (not modeled)
  - 3,000 Wh battery

**Constellation**: Deployed in groups of 3+ for triangulation

**Use Cases**:
- Ship position determination
- Velocity measurement
- Time synchronization

### 4. Weather Satellite (WeatherSat)
**Purpose**: Environmental and atmospheric monitoring
- **Mass**: 2,500 kg
- **Orbit**: 500km polar orbit
- **Power**: 30m² solar array (9 kW)
- **Key Systems**:
  - Multispectral imager (2m resolution)
  - Infrared sensor (5m resolution)
  - 75W telemetry link @ 8 GHz
  - 4,000 Wh battery
  - Earth-pointing attitude

**Use Cases**:
- Dust storm detection
- Surface temperature mapping
- Solar wind monitoring
- Landing site evaluation

## Subsystems

### 1. Power Subsystem (`SatellitePowerSystem`)

**Solar Power Generation**:
```typescript
powerOutput = panelArea × efficiency × solarConstant × cos(angle) × degradation
```
- Solar constant: 1361 W/m² at 1 AU
- Panel efficiency: ~30%
- Degradation over time from radiation

**Battery Management**:
- Charge during sunlight
- Discharge during eclipse
- Cycle counting for health tracking
- Brownout protection

**Power Buses**:
- Voltage regulation
- Load monitoring
- Overload protection

### 2. Thermal Subsystem (`SatelliteThermalSystem`)

**Heat Sources**:
- Solar radiation (when in sunlight)
- Internal component heat
- Electronic waste heat

**Heat Rejection**:
- Radiative cooling via radiators
- Stefan-Boltzmann law: `Q = ε × σ × A × T⁴`

**Thermal Control**:
- Automatic heaters below 273K
- Radiator deployment
- Component temperature tracking

### 3. Attitude Control Subsystem (`SatelliteAttitudeControl`)

**Reaction Wheels**:
- 3-axis control (x, y, z)
- Momentum storage
- Desaturation (via magnetorquers or thrusters)
- Power: ~50W per wheel

**Magnetorquers**:
- Use planetary magnetic field
- Wheel desaturation
- Low power consumption

**Control Modes**:
- `sun_pointing`: Solar panels face sun
- `earth_pointing`: Sensors face ground
- `inertial`: Fixed orientation
- `detumble`: Reduce rotation
- `off`: Free drift

### 4. Communications Subsystem (`SatelliteCommunications`)

**Link Budget Calculation**:
```
Signal Strength = (TX Power × Antenna Gain × Path Loss) / 1000
Path Loss ∝ 1/distance²
```

**Data Management**:
- Onboard buffer storage (1000 MB typical)
- Automatic downlink when ground station visible
- Data rate scales with signal strength

**Transponders**:
- Frequency: 1-40 GHz range
- Bandwidth: 20-2000 MHz
- TX Power: 50-200 W

### 5. Sensor Subsystem (`SatelliteSensorSystem`)

**Sensor Types**:
1. **Optical**: Visual imaging, 0.3-5m resolution
2. **Radar**: SAR, all-weather, 1-10m resolution
3. **Infrared**: Thermal imaging
4. **Multispectral**: Multiple wavelength bands
5. **Lidar**: Laser ranging

**Data Generation**:
- Optical: 50 MB/s
- Radar: 100 MB/s
- Infrared: 10 MB/s
- Stored in communications buffer

## Physical Layout (`SatelliteLayout`)

Each satellite has a defined physical structure:

```typescript
interface SatelliteLayout {
  busLength: number;        // Main body size
  busWidth: number;
  busHeight: number;
  busMass: number;

  solarPanelSpan: number;   // Deployed wingspan
  solarPanelArea: number;   // Total area

  mainAntennaDiameter: number;
  antennaCount: number;

  payloadMass: number;      // Sensor/instrument mass
  propellantMass: number;   // For attitude control
  dryMass: number;          // Total without propellant

  centerOfMass: Vector3;
  momentOfInertia: {        // For attitude dynamics
    Ixx: number;
    Iyy: number;
    Izz: number;
  };
}
```

## Orbital Mechanics Integration

Satellites use the existing `OrbitalBody` class for position/velocity:
- Keplerian orbit propagation
- Full orbital elements (a, e, i, Ω, ω, M)
- Kepler equation solving
- Frame transformations

**Stellar Body Interactions**:
- Eclipse detection
- Solar pressure (future)
- Gravity gradient torque (future)

## Usage Examples

### Creating a Satellite Network

```typescript
import { GameWorld, SatelliteFactory } from './physics-modules';

// Create game world with advanced satellites
const world = new GameWorld({
  createAdvancedSatellites: true  // Creates default constellation
});

// Or create custom satellites
const customSat = SatelliteFactory.createCommunicationsSatellite('CustomRelay', 300000);
customSat.deploySolarPanels();
customSat.deployAntennas();
world.satellites.addSatellite(customSat);
```

### Monitoring Satellite Health

```typescript
// Update simulation
world.update(dt);

// Get satellite state
const sat = world.satellites.getSatellite('CommRelay-1');
const state = sat.getState();

console.log(`Battery: ${state.power.batteryChargePercent}%`);
console.log(`Temperature: ${state.thermal.averageTemperature}K`);
console.log(`Attitude: ${state.attitude.mode}`);
console.log(`Downlink: ${state.communications.downlink?.connected}`);
```

### Using Relay Network

```typescript
// Check relay network status
const network = world.getRelayNetworkStatus();
console.log(`Relays: ${network.operationalRelays}/${network.totalRelays}`);
console.log(`Signal: ${network.averageSignalStrength.toFixed(2)}`);
console.log(`Data Buffer: ${network.totalDataBuffer.toFixed(0)} MB`);
```

### Sensor Operations

```typescript
const reconSat = world.satellites.getSatellite('ReconSat-1');

// Start imaging scan (30 second duration)
const success = reconSat.startScan('optical_telescope', 30);

if (success) {
  console.log('Imaging scan started');
  // Data will accumulate in communications buffer
}
```

### Attitude Control

```typescript
const sat = world.satellites.getSatellite('ReconSat-1');

// Change attitude mode
sat.setAttitudeMode('earth_pointing');  // Point sensors at ground
sat.setAttitudeMode('sun_pointing');    // Maximize solar power
sat.setAttitudeMode('inertial');        // Fixed orientation
sat.setAttitudeMode('detumble');        // Stabilize rotation
```

## Mission Status States

Satellites automatically transition between states:

1. **OPERATIONAL**: Normal operations
   - All systems functioning
   - Battery charge > 50%
   - Temperature within limits

2. **DEGRADED**: Reduced capability
   - Some systems malfunctioning
   - Temperature outside optimal range
   - Battery health declining

3. **SAFE_MODE**: Emergency mode
   - Battery critically low (< 10%)
   - Non-essential systems shut down
   - Waiting for sun/charging

4. **DERELICT**: Non-functional
   - Complete power loss
   - Control lost
   - Orbital debris

5. **DESTROYED**: Physical destruction
   - Collision
   - Weapon impact
   - Structural failure

## Integration with Game Systems

### With Spacecraft
```typescript
// Find nearest satellite for docking
const nearest = world.getNearestSatellite(spacecraft.position);
if (nearest && nearest.distance < 1000) {
  // Initiate docking sequence
  spacecraft.docking.setTarget(nearest.satellite.getPosition());
}
```

### With Stellar Bodies
```typescript
// Satellites automatically calculate:
// - Sun direction for solar panels
// - Eclipse state for power management
// - Earth direction for attitude pointing
```

### With GameWorld
```typescript
// All satellites update together
world.update(dt);

// Query satellite constellation
const navSats = world.satellites.getSatellitesByType(SatelliteType.NAVIGATION);
const operational = world.getOperationalSatellites();
```

## Performance Considerations

**Per-Satellite Update Cost**:
- Orbital propagation: ~100 FLOPS
- Power calculation: ~50 FLOPS
- Thermal simulation: ~200 FLOPS
- Attitude control: ~100 FLOPS
- Communications: ~50 FLOPS
- **Total**: ~500 FLOPS per satellite per frame

**Recommended Limits**:
- Small constellation: 3-10 satellites
- Medium network: 10-50 satellites
- Large network: 50-200 satellites

## Future Enhancements

### Planned Features
1. **Inter-Satellite Links**: Direct sat-to-sat communication
2. **Station-Keeping**: Active orbit maintenance
3. **Collision Avoidance**: Automatic maneuvers
4. **Radiation Damage**: Component degradation over time
5. **Solar Pressure**: Orbit perturbations
6. **Magnetic Field Interaction**: Magnetorquer modeling
7. **Thermal Cycling**: Temperature variation modeling
8. **Component Failures**: Random malfunctions
9. **Repair Missions**: Spacecraft can service satellites
10. **Custom Payloads**: User-defined instruments

### Advanced Orbital Mechanics
- J2 perturbations
- Atmospheric drag (low orbits)
- Third-body effects
- Resonance orbits
- Formation flying

## Technical Specifications Summary

| Satellite Type | Mass (kg) | Power (kW) | Orbit (km) | Battery (Wh) | Data Rate (Mbps) |
|----------------|-----------|------------|------------|--------------|------------------|
| Communications | 3,000 | 12 | 200 | 5,000 | 150 |
| Reconnaissance | 6,000 | 16 | 100 | 10,000 | 800 |
| Navigation | 1,700 | 7.5 | 1,000 | 3,000 | 0.05 |
| Weather | 2,500 | 9 | 500 | 4,000 | 50 |

## Conclusion

The satellite system is now fully equivalent to the spacecraft in terms of modeling depth. Each satellite is a complete, self-contained system with:

✅ **Power generation and storage**
✅ **Thermal management**
✅ **Attitude control**
✅ **Communications relay**
✅ **Sensor payloads**
✅ **Physical layout and structure**
✅ **Stellar body interactions**
✅ **Orbital mechanics integration**
✅ **Mission status tracking**
✅ **Manager for constellation control**

Satellites can now be used for realistic mission scenarios including:
- Communications relays
- Reconnaissance and mapping
- Navigation systems
- Weather monitoring
- Scientific research
- Military applications

The system is fully integrated with the GameWorld and can be extended for future gameplay features.
