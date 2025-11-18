/**
 * Satellite System
 *
 * Comprehensive satellite modeling equivalent to the Spacecraft system:
 * - Multiple satellite types (communications, reconnaissance, navigation, weather, etc.)
 * - Power subsystem (solar panels, batteries, capacitors)
 * - Thermal subsystem (radiators, heaters, thermal control)
 * - Attitude control (reaction wheels, magnetorquers, thrusters)
 * - Communications subsystem (transponders, antennas, data relay)
 * - Sensor systems (cameras, radar, IR, etc.)
 * - Data processing and storage
 * - Orbital mechanics integration
 * - Stellar body interactions (solar pressure, eclipse, gravity gradient)
 * - Physical layout and structure
 */

import { OrbitalBody, OrbitalBodyConfig, Vector3, DockingPort } from './orbital-bodies';

// ============================================================================
// SATELLITE TYPES AND CONFIGURATIONS
// ============================================================================

export enum SatelliteType {
  COMMUNICATIONS = 'COMMUNICATIONS',     // Relay satellites
  RECONNAISSANCE = 'RECONNAISSANCE',     // Spy satellites
  NAVIGATION = 'NAVIGATION',             // GPS-like satellites
  WEATHER = 'WEATHER',                   // Environmental monitoring
  SCIENTIFIC = 'SCIENTIFIC',             // Research payloads
  MILITARY = 'MILITARY',                 // Weapons platforms
  SPACE_STATION = 'SPACE_STATION',       // Crewed habitats
  DEBRIS = 'DEBRIS'                      // Derelict/defunct satellites
}

export enum SatelliteMissionStatus {
  OPERATIONAL = 'OPERATIONAL',
  DEGRADED = 'DEGRADED',
  SAFE_MODE = 'SAFE_MODE',
  DERELICT = 'DERELICT',
  DESTROYED = 'DESTROYED'
}

// ============================================================================
// POWER SUBSYSTEM
// ============================================================================

export interface SolarPanel {
  id: string;
  area: number;              // m²
  efficiency: number;        // 0-1 (typically 0.3 for space solar panels)
  orientation: Vector3;      // Panel normal vector
  deployable: boolean;
  deployed: boolean;
  degradation: number;       // 0-1 (1 = new, 0 = dead)
  temperature: number;       // K
}

export interface SatelliteBattery {
  id: string;
  capacityWh: number;        // Watt-hours
  currentChargeWh: number;
  maxChargeRateW: number;
  maxDischargeRateW: number;
  voltage: number;           // V
  cycleCount: number;
  health: number;            // 0-1
  temperature: number;       // K
}

export interface PowerBus {
  id: string;
  voltage: number;           // V
  currentLoad: number;       // A
  maxLoad: number;           // A
  status: 'nominal' | 'overload' | 'failed';
}

export class SatellitePowerSystem {
  public solarPanels: SolarPanel[] = [];
  public batteries: SatelliteBattery[] = [];
  public powerBuses: PowerBus[] = [];
  public totalPowerGeneration: number = 0;  // W
  public totalPowerConsumption: number = 0; // W
  public batteryChargeRate: number = 0;     // W (positive = charging)

  constructor() {
    // Will be initialized by satellite configuration
  }

  update(dt: number, sunDirection: Vector3, inEclipse: boolean, powerDemand: number): void {
    // Calculate solar power generation
    this.totalPowerGeneration = 0;
    if (!inEclipse) {
      for (const panel of this.solarPanels) {
        if (panel.deployed) {
          // Calculate angle to sun
          const cosAngle = Math.abs(this.dot(panel.orientation, sunDirection));
          const solarConstant = 1361; // W/m² at 1 AU
          const powerOutput = panel.area * panel.efficiency * solarConstant * cosAngle * panel.degradation;
          this.totalPowerGeneration += powerOutput;
        }
      }
    }

    this.totalPowerConsumption = powerDemand;

    // Calculate battery charge/discharge
    const powerBalance = this.totalPowerGeneration - this.totalPowerConsumption;
    this.batteryChargeRate = powerBalance;

    // Update batteries
    for (const battery of this.batteries) {
      if (powerBalance > 0) {
        // Charging
        const chargeAmount = Math.min(powerBalance * dt / 3600, battery.maxChargeRateW * dt / 3600);
        battery.currentChargeWh = Math.min(
          battery.currentChargeWh + chargeAmount,
          battery.capacityWh
        );
      } else if (powerBalance < 0) {
        // Discharging
        const dischargeAmount = Math.min(Math.abs(powerBalance) * dt / 3600, battery.maxDischargeRateW * dt / 3600);
        battery.currentChargeWh = Math.max(
          battery.currentChargeWh - dischargeAmount,
          0
        );
      }

      // Update battery health based on cycles
      battery.cycleCount += Math.abs(powerBalance) * dt / (battery.capacityWh * 3600 * 2);
      battery.health = Math.max(0, 1 - battery.cycleCount / 5000); // 5000 cycles to degradation
    }

    // Check power bus status
    for (const bus of this.powerBuses) {
      if (bus.currentLoad > bus.maxLoad * 1.2) {
        bus.status = 'failed';
      } else if (bus.currentLoad > bus.maxLoad) {
        bus.status = 'overload';
      } else {
        bus.status = 'nominal';
      }
    }
  }

  getBatteryCharge(): number {
    const totalCapacity = this.batteries.reduce((sum, b) => sum + b.capacityWh, 0);
    const totalCharge = this.batteries.reduce((sum, b) => sum + b.currentChargeWh, 0);
    return totalCapacity > 0 ? totalCharge / totalCapacity : 0;
  }

  private dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  getState() {
    return {
      solarPanels: this.solarPanels.map(p => ({ ...p })),
      batteries: this.batteries.map(b => ({ ...b })),
      powerBuses: this.powerBuses.map(b => ({ ...b })),
      totalPowerGeneration: this.totalPowerGeneration,
      totalPowerConsumption: this.totalPowerConsumption,
      batteryChargeRate: this.batteryChargeRate,
      batteryChargePercent: this.getBatteryCharge() * 100
    };
  }
}

// ============================================================================
// THERMAL SUBSYSTEM
// ============================================================================

export interface ThermalComponent {
  id: string;
  mass: number;              // kg
  specificHeat: number;      // J/(kg·K)
  temperature: number;       // K
  heatGeneration: number;    // W
  thermalConductivity: number; // W/(m·K)
}

export interface Radiator {
  id: string;
  area: number;              // m²
  emissivity: number;        // 0-1
  orientation: Vector3;      // Radiator normal vector
  temperature: number;       // K
  deployable: boolean;
  deployed: boolean;
}

export class SatelliteThermalSystem {
  public components: Map<string, ThermalComponent> = new Map();
  public radiators: Radiator[] = [];
  public heaters: Map<string, { powerW: number; active: boolean }> = new Map();
  public averageTemperature: number = 280; // K

  constructor() {
    // Will be initialized by satellite configuration
  }

  update(dt: number, sunDirection: Vector3, inEclipse: boolean): void {
    const stefanBoltzmann = 5.67e-8; // W/(m²·K⁴)
    const solarConstant = 1361; // W/m²

    // Calculate solar heating
    let solarHeating = 0;
    if (!inEclipse) {
      for (const radiator of this.radiators) {
        if (radiator.deployed) {
          const cosAngle = Math.max(0, this.dot(radiator.orientation, sunDirection));
          solarHeating += radiator.area * solarConstant * cosAngle * (1 - radiator.emissivity);
        }
      }
    }

    // Calculate radiative cooling
    let radiativeCooling = 0;
    for (const radiator of this.radiators) {
      if (radiator.deployed) {
        const radiantPower = radiator.area * radiator.emissivity * stefanBoltzmann * Math.pow(radiator.temperature, 4);
        radiativeCooling += radiantPower;
        radiator.temperature = this.averageTemperature; // Simplified coupling
      }
    }

    // Calculate internal heat generation
    let internalHeat = 0;
    for (const component of this.components.values()) {
      internalHeat += component.heatGeneration;
    }

    // Add heater heat
    for (const heater of this.heaters.values()) {
      if (heater.active) {
        internalHeat += heater.powerW;
      }
    }

    // Calculate total thermal mass
    let totalThermalMass = 0;
    for (const component of this.components.values()) {
      totalThermalMass += component.mass * component.specificHeat;
    }

    // Update average temperature
    if (totalThermalMass > 0) {
      const netHeat = solarHeating + internalHeat - radiativeCooling;
      const tempChange = (netHeat * dt) / totalThermalMass;
      this.averageTemperature += tempChange;
      this.averageTemperature = Math.max(4, Math.min(2000, this.averageTemperature)); // Physical limits
    }

    // Update component temperatures (simplified - all at average)
    for (const component of this.components.values()) {
      component.temperature = this.averageTemperature;
    }

    // Auto-enable heaters if too cold
    if (this.averageTemperature < 273) {
      for (const heater of this.heaters.values()) {
        heater.active = true;
      }
    } else if (this.averageTemperature > 293) {
      for (const heater of this.heaters.values()) {
        heater.active = false;
      }
    }
  }

  private dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  getState() {
    return {
      averageTemperature: this.averageTemperature,
      components: Array.from(this.components.entries()).map(([id, c]) => ({ id, ...c })),
      radiators: this.radiators.map(r => ({ ...r })),
      heaters: Array.from(this.heaters.entries()).map(([id, h]) => ({ id, ...h }))
    };
  }
}

// ============================================================================
// ATTITUDE CONTROL SUBSYSTEM
// ============================================================================

export interface ReactionWheel {
  id: string;
  axis: Vector3;             // Spin axis
  maxTorque: number;         // N·m
  maxMomentum: number;       // N·m·s
  currentMomentum: number;   // N·m·s
  powerConsumption: number;  // W
  operational: boolean;
}

export interface Magnetorquer {
  id: string;
  axis: Vector3;             // Magnetic moment direction
  maxDipoleMoment: number;   // A·m²
  powerConsumption: number;  // W
  operational: boolean;
}

export interface AttitudeThuster {
  id: string;
  position: Vector3;         // m from CoM
  direction: Vector3;        // Thrust direction
  thrust: number;            // N
  fuelRemaining: number;     // kg
  operational: boolean;
}

export class SatelliteAttitudeControl {
  public reactionWheels: ReactionWheel[] = [];
  public magnetorquers: Magnetorquer[] = [];
  public thrusters: AttitudeThuster[] = [];
  public targetAttitude: { pitch: number; yaw: number; roll: number } | null = null;
  public currentAttitude: { pitch: number; yaw: number; roll: number } = { pitch: 0, yaw: 0, roll: 0 };
  public angularVelocity: Vector3 = { x: 0, y: 0, z: 0 };
  public mode: 'sun_pointing' | 'earth_pointing' | 'inertial' | 'detumble' | 'off' = 'sun_pointing';

  constructor() {
    // Will be initialized by satellite configuration
  }

  update(dt: number, sunDirection: Vector3, earthDirection: Vector3): void {
    // Simplified attitude control - just track mode
    // In full implementation, would use quaternions and PID control

    if (this.mode === 'sun_pointing') {
      // Point solar panels at sun (simplified)
      this.targetAttitude = this.calculateAttitudeToPoint(sunDirection);
    } else if (this.mode === 'earth_pointing') {
      // Point sensors at Earth
      this.targetAttitude = this.calculateAttitudeToPoint(earthDirection);
    } else if (this.mode === 'detumble') {
      // Reduce angular velocity
      this.angularVelocity = {
        x: this.angularVelocity.x * 0.99,
        y: this.angularVelocity.y * 0.99,
        z: this.angularVelocity.z * 0.99
      };
    }

    // Update reaction wheel momentum (simplified)
    for (const wheel of this.reactionWheels) {
      if (wheel.operational && this.targetAttitude) {
        // Desaturation logic would go here
        wheel.currentMomentum = Math.min(wheel.maxMomentum * 0.8, wheel.currentMomentum + dt);
      }
    }
  }

  private calculateAttitudeToPoint(target: Vector3): { pitch: number; yaw: number; roll: number } {
    // Simplified attitude calculation
    const magnitude = Math.sqrt(target.x ** 2 + target.y ** 2 + target.z ** 2);
    if (magnitude === 0) return { pitch: 0, yaw: 0, roll: 0 };

    const normalized = {
      x: target.x / magnitude,
      y: target.y / magnitude,
      z: target.z / magnitude
    };

    return {
      pitch: Math.asin(-normalized.z),
      yaw: Math.atan2(normalized.y, normalized.x),
      roll: 0
    };
  }

  getPowerConsumption(): number {
    let total = 0;
    for (const wheel of this.reactionWheels) {
      if (wheel.operational) total += wheel.powerConsumption;
    }
    for (const mag of this.magnetorquers) {
      if (mag.operational) total += mag.powerConsumption;
    }
    return total;
  }

  getState() {
    return {
      mode: this.mode,
      currentAttitude: { ...this.currentAttitude },
      targetAttitude: this.targetAttitude ? { ...this.targetAttitude } : null,
      angularVelocity: { ...this.angularVelocity },
      reactionWheels: this.reactionWheels.map(w => ({ ...w })),
      magnetorquers: this.magnetorquers.map(m => ({ ...m })),
      thrusters: this.thrusters.map(t => ({ ...t }))
    };
  }
}

// ============================================================================
// COMMUNICATIONS SUBSYSTEM
// ============================================================================

export interface Transponder {
  id: string;
  frequency: number;         // GHz
  bandwidth: number;         // MHz
  transmitPower: number;     // W
  receiveGain: number;       // dB
  dataRate: number;          // Mbps
  operational: boolean;
}

export interface Antenna {
  id: string;
  type: 'omnidirectional' | 'directional' | 'phased_array';
  gain: number;              // dB
  beamwidth: number;         // degrees
  pointing: Vector3;         // Direction (for directional)
  deployable: boolean;
  deployed: boolean;
}

export class SatelliteCommunications {
  public transponders: Transponder[] = [];
  public antennas: Antenna[] = [];
  public dataBuffer: number = 0;      // MB stored
  public dataBufferCapacity: number = 1000; // MB
  public uplink: { connected: boolean; dataRate: number; signalStrength: number } | null = null;
  public downlink: { connected: boolean; dataRate: number; signalStrength: number } | null = null;

  constructor() {
    // Will be initialized by satellite configuration
  }

  update(dt: number, earthDirection: Vector3, distanceToEarth: number): void {
    // Calculate link budget (simplified)
    const transmitPower = this.transponders.filter(t => t.operational).reduce((sum, t) => sum + t.transmitPower, 0);
    const antennaGain = this.antennas.filter(a => a.deployed).reduce((sum, a) => sum + a.gain, 0);

    // Free space path loss: FSPL = 20*log10(d) + 20*log10(f) + 92.45
    // Simplified: signal strength decreases with distance
    const pathLoss = Math.max(0, 1 - (distanceToEarth / 384400000)); // Normalized to Moon distance

    const signalStrength = (transmitPower * antennaGain * pathLoss) / 1000; // Simplified

    // Update downlink
    if (signalStrength > 0.1) {
      const dataRate = this.transponders.reduce((sum, t) => t.operational ? sum + t.dataRate : sum, 0);
      this.downlink = {
        connected: true,
        dataRate: dataRate * pathLoss,
        signalStrength: signalStrength
      };

      // Transmit data from buffer
      const dataTransmitted = (this.downlink.dataRate * dt) / 1000; // Convert to MB
      this.dataBuffer = Math.max(0, this.dataBuffer - dataTransmitted);
    } else {
      this.downlink = {
        connected: false,
        dataRate: 0,
        signalStrength: 0
      };
    }

    // Uplink would be calculated similarly
    this.uplink = this.downlink; // Simplified
  }

  addDataToBuffer(dataMB: number): boolean {
    if (this.dataBuffer + dataMB <= this.dataBufferCapacity) {
      this.dataBuffer += dataMB;
      return true;
    }
    return false;
  }

  getPowerConsumption(): number {
    return this.transponders.filter(t => t.operational).reduce((sum, t) => sum + t.transmitPower, 0);
  }

  getState() {
    return {
      transponders: this.transponders.map(t => ({ ...t })),
      antennas: this.antennas.map(a => ({ ...a })),
      dataBuffer: this.dataBuffer,
      dataBufferCapacity: this.dataBufferCapacity,
      uplink: this.uplink,
      downlink: this.downlink
    };
  }
}

// ============================================================================
// SENSOR SUBSYSTEM
// ============================================================================

export interface SatelliteSensor {
  id: string;
  type: 'optical' | 'radar' | 'infrared' | 'multispectral' | 'lidar';
  resolution: number;        // meters per pixel at nadir
  swathWidth: number;        // km
  pointing: Vector3;         // Direction
  operational: boolean;
  powerConsumption: number;  // W
  dataGenerationRate: number; // MB per second
}

export class SatelliteSensorSystem {
  public sensors: SatelliteSensor[] = [];
  public activeScans: Array<{ sensorId: string; startTime: number; duration: number }> = [];

  constructor() {
    // Will be initialized by satellite configuration
  }

  update(dt: number, currentTime: number, earthDirection: Vector3): void {
    // Update active scans
    this.activeScans = this.activeScans.filter(scan => {
      const elapsed = currentTime - scan.startTime;
      return elapsed < scan.duration;
    });

    // Auto-scan logic could go here
  }

  startScan(sensorId: string, duration: number, currentTime: number, comms: SatelliteCommunications): boolean {
    const sensor = this.sensors.find(s => s.id === sensorId);
    if (!sensor || !sensor.operational) return false;

    // Calculate data generated
    const dataMB = sensor.dataGenerationRate * duration;

    // Add to buffer if space available
    if (comms.addDataToBuffer(dataMB)) {
      this.activeScans.push({ sensorId, startTime: currentTime, duration });
      return true;
    }

    return false;
  }

  getPowerConsumption(): number {
    let total = 0;
    for (const scan of this.activeScans) {
      const sensor = this.sensors.find(s => s.id === scan.sensorId);
      if (sensor) total += sensor.powerConsumption;
    }
    return total;
  }

  getState() {
    return {
      sensors: this.sensors.map(s => ({ ...s })),
      activeScans: this.activeScans.map(s => ({ ...s }))
    };
  }
}

// ============================================================================
// SATELLITE PHYSICAL LAYOUT
// ============================================================================

export interface SatelliteLayout {
  // Bus (main body)
  busLength: number;         // m
  busWidth: number;          // m
  busHeight: number;         // m
  busMass: number;           // kg

  // Solar panels
  solarPanelSpan: number;    // m (deployed)
  solarPanelArea: number;    // m² (total)

  // Antennas
  mainAntennaDiameter: number; // m
  antennaCount: number;

  // Payload bay
  payloadMass: number;       // kg
  payloadPower: number;      // W

  // Propellant
  propellantMass: number;    // kg
  dryMass: number;           // kg

  // Center of mass (body frame)
  centerOfMass: Vector3;

  // Moment of inertia (kg·m²)
  momentOfInertia: {
    Ixx: number;
    Iyy: number;
    Izz: number;
  };
}

// ============================================================================
// MAIN SATELLITE CLASS
// ============================================================================

export interface SatelliteConfig {
  // Basic properties
  name: string;
  type: SatelliteType;
  mass: number;              // kg
  radius: number;            // m (for collision and docking)

  // Orbital parameters (from OrbitalBodyConfig)
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  longitudeOfAN: number;
  argOfPeriapsis: number;
  meanAnomalyEpoch: number;

  // Docking
  hasDockingPort?: boolean;
  dockingPortPosition?: Vector3;
  dockingPortDirection?: Vector3;
  dockingRadius?: number;

  // Subsystem configurations
  layout?: SatelliteLayout;
  solarPanels?: SolarPanel[];
  batteries?: SatelliteBattery[];
  reactionWheels?: ReactionWheel[];
  magnetorquers?: Magnetorquer[];
  transponders?: Transponder[];
  antennas?: Antenna[];
  sensors?: SatelliteSensor[];
  radiators?: Radiator[];
}

/**
 * Comprehensive Satellite class - equivalent to Spacecraft
 * Integrates all subsystems for realistic satellite simulation
 */
export class Satellite {
  // Basic properties
  public name: string;
  public type: SatelliteType;
  public status: SatelliteMissionStatus = SatelliteMissionStatus.OPERATIONAL;
  public layout: SatelliteLayout;

  // Orbital mechanics (delegates to OrbitalBody)
  public orbitalBody: OrbitalBody;

  // Subsystems
  public power: SatellitePowerSystem;
  public thermal: SatelliteThermalSystem;
  public attitude: SatelliteAttitudeControl;
  public communications: SatelliteCommunications;
  public sensors: SatelliteSensorSystem;

  // Simulation time
  public simulationTime: number = 0;

  constructor(config: SatelliteConfig) {
    this.name = config.name;
    this.type = config.type;

    // Initialize orbital body for position/velocity tracking
    this.orbitalBody = new OrbitalBody({
      name: config.name,
      mass: config.mass,
      radius: config.radius,
      semiMajorAxis: config.semiMajorAxis,
      eccentricity: config.eccentricity,
      inclination: config.inclination,
      longitudeOfAN: config.longitudeOfAN,
      argOfPeriapsis: config.argOfPeriapsis,
      meanAnomalyEpoch: config.meanAnomalyEpoch,
      hasDockingPort: config.hasDockingPort,
      dockingPortPosition: config.dockingPortPosition,
      dockingPortDirection: config.dockingPortDirection,
      dockingRadius: config.dockingRadius,
      isTargetable: true
    });

    // Initialize layout
    this.layout = config.layout || this.createDefaultLayout(config.type);

    // Initialize subsystems
    this.power = new SatellitePowerSystem();
    if (config.solarPanels) this.power.solarPanels = config.solarPanels;
    if (config.batteries) this.power.batteries = config.batteries;

    this.thermal = new SatelliteThermalSystem();
    if (config.radiators) this.thermal.radiators = config.radiators;

    this.attitude = new SatelliteAttitudeControl();
    if (config.reactionWheels) this.attitude.reactionWheels = config.reactionWheels;
    if (config.magnetorquers) this.attitude.magnetorquers = config.magnetorquers;

    this.communications = new SatelliteCommunications();
    if (config.transponders) this.communications.transponders = config.transponders;
    if (config.antennas) this.communications.antennas = config.antennas;

    this.sensors = new SatelliteSensorSystem();
    if (config.sensors) this.sensors.sensors = config.sensors;
  }

  /**
   * Create default layout based on satellite type
   */
  private createDefaultLayout(type: SatelliteType): SatelliteLayout {
    switch (type) {
      case SatelliteType.COMMUNICATIONS:
        return {
          busLength: 3,
          busWidth: 2,
          busHeight: 2,
          busMass: 2000,
          solarPanelSpan: 15,
          solarPanelArea: 40,
          mainAntennaDiameter: 2.5,
          antennaCount: 2,
          payloadMass: 500,
          payloadPower: 5000,
          propellantMass: 500,
          dryMass: 2500,
          centerOfMass: { x: 0, y: 0, z: 0 },
          momentOfInertia: { Ixx: 5000, Iyy: 5000, Izz: 3000 }
        };

      case SatelliteType.RECONNAISSANCE:
        return {
          busLength: 5,
          busWidth: 2.5,
          busHeight: 2.5,
          busMass: 4000,
          solarPanelSpan: 20,
          solarPanelArea: 50,
          mainAntennaDiameter: 1.5,
          antennaCount: 1,
          payloadMass: 2000,
          payloadPower: 8000,
          propellantMass: 800,
          dryMass: 6000,
          centerOfMass: { x: 0, y: 0, z: -1 },
          momentOfInertia: { Ixx: 15000, Iyy: 15000, Izz: 8000 }
        };

      case SatelliteType.NAVIGATION:
        return {
          busLength: 2,
          busWidth: 2,
          busHeight: 2,
          busMass: 1500,
          solarPanelSpan: 10,
          solarPanelArea: 25,
          mainAntennaDiameter: 1.0,
          antennaCount: 4,
          payloadMass: 200,
          payloadPower: 2000,
          propellantMass: 300,
          dryMass: 1700,
          centerOfMass: { x: 0, y: 0, z: 0 },
          momentOfInertia: { Ixx: 2000, Iyy: 2000, Izz: 2000 }
        };

      default:
        // Generic satellite
        return {
          busLength: 2,
          busWidth: 1.5,
          busHeight: 1.5,
          busMass: 1000,
          solarPanelSpan: 8,
          solarPanelArea: 20,
          mainAntennaDiameter: 0.5,
          antennaCount: 1,
          payloadMass: 300,
          payloadPower: 1000,
          propellantMass: 200,
          dryMass: 1300,
          centerOfMass: { x: 0, y: 0, z: 0 },
          momentOfInertia: { Ixx: 1000, Iyy: 1000, Izz: 800 }
        };
    }
  }

  /**
   * Master update loop - integrates all subsystems
   */
  update(dt: number, stellarBody: { position: Vector3; luminosity: number } | null): void {
    // 1. Update orbital position
    this.orbitalBody.update(dt, this.simulationTime);

    // 2. Calculate sun direction and eclipse state
    let sunDirection: Vector3 = { x: 1, y: 0, z: 0 };
    let inEclipse = false;
    let distanceToEarth = 0;

    if (stellarBody) {
      const dx = stellarBody.position.x - this.orbitalBody.position.x;
      const dy = stellarBody.position.y - this.orbitalBody.position.y;
      const dz = stellarBody.position.z - this.orbitalBody.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0) {
        sunDirection = { x: dx / dist, y: dy / dist, z: dz / dist };
      }

      // Simple eclipse detection (TODO: improve with actual body occlusion)
      const altitude = Math.sqrt(
        this.orbitalBody.position.x ** 2 +
        this.orbitalBody.position.y ** 2 +
        this.orbitalBody.position.z ** 2
      );
      inEclipse = altitude < 1737400; // Below lunar surface = eclipse (simplified)
    }

    // Earth direction (assumes Earth at origin for now)
    const earthDx = 0 - this.orbitalBody.position.x;
    const earthDy = 0 - this.orbitalBody.position.y;
    const earthDz = 0 - this.orbitalBody.position.z;
    distanceToEarth = Math.sqrt(earthDx ** 2 + earthDy ** 2 + earthDz ** 2);
    const earthDirection: Vector3 = distanceToEarth > 0
      ? { x: earthDx / distanceToEarth, y: earthDy / distanceToEarth, z: earthDz / distanceToEarth }
      : { x: 0, y: 0, z: 0 };

    // 3. Calculate power demand from all subsystems
    const attitudePower = this.attitude.getPowerConsumption();
    const commsPower = this.communications.getPowerConsumption();
    const sensorPower = this.sensors.getPowerConsumption();
    const basePower = 100; // Base bus power (W)
    const totalPowerDemand = attitudePower + commsPower + sensorPower + basePower;

    // 4. Update power system
    this.power.update(dt, sunDirection, inEclipse, totalPowerDemand);

    // 5. Check for power failures
    const batteryCharge = this.power.getBatteryCharge();
    if (batteryCharge < 0.1 && this.power.totalPowerGeneration === 0) {
      this.status = SatelliteMissionStatus.SAFE_MODE;
      // Shut down non-critical systems
      this.sensors.activeScans = [];
    } else if (this.status === SatelliteMissionStatus.SAFE_MODE && batteryCharge > 0.5) {
      this.status = SatelliteMissionStatus.OPERATIONAL;
    }

    // 6. Update thermal system
    this.thermal.update(dt, sunDirection, inEclipse);

    // 7. Update attitude control
    this.attitude.update(dt, sunDirection, earthDirection);

    // 8. Update communications
    this.communications.update(dt, earthDirection, distanceToEarth);

    // 9. Update sensors
    this.sensors.update(dt, this.simulationTime, earthDirection);

    // 10. Check thermal limits
    if (this.thermal.averageTemperature < 200 || this.thermal.averageTemperature > 400) {
      this.status = SatelliteMissionStatus.DEGRADED;
    }

    // 11. Increment time
    this.simulationTime += dt;
  }

  /**
   * Get complete satellite state
   */
  getState() {
    return {
      name: this.name,
      type: this.type,
      status: this.status,
      simulationTime: this.simulationTime,
      orbital: this.orbitalBody.getState(),
      power: this.power.getState(),
      thermal: this.thermal.getState(),
      attitude: this.attitude.getState(),
      communications: this.communications.getState(),
      sensors: this.sensors.getState(),
      layout: this.layout
    };
  }

  /**
   * Get position (delegates to orbital body)
   */
  getPosition(): Vector3 {
    return this.orbitalBody.position;
  }

  /**
   * Get velocity (delegates to orbital body)
   */
  getVelocity(): Vector3 {
    return this.orbitalBody.velocity;
  }

  /**
   * Command: Deploy solar panels
   */
  deploySolarPanels(): boolean {
    let anyDeployed = false;
    for (const panel of this.power.solarPanels) {
      if (panel.deployable && !panel.deployed) {
        panel.deployed = true;
        anyDeployed = true;
      }
    }
    return anyDeployed;
  }

  /**
   * Command: Deploy antennas
   */
  deployAntennas(): boolean {
    let anyDeployed = false;
    for (const antenna of this.communications.antennas) {
      if (antenna.deployable && !antenna.deployed) {
        antenna.deployed = true;
        anyDeployed = true;
      }
    }
    return anyDeployed;
  }

  /**
   * Command: Set attitude control mode
   */
  setAttitudeMode(mode: 'sun_pointing' | 'earth_pointing' | 'inertial' | 'detumble' | 'off'): void {
    this.attitude.mode = mode;
  }

  /**
   * Command: Start sensor scan
   */
  startScan(sensorId: string, duration: number): boolean {
    return this.sensors.startScan(sensorId, duration, this.simulationTime, this.communications);
  }
}

// ============================================================================
// SATELLITE MANAGER - MANAGES MULTIPLE SATELLITES
// ============================================================================

export class SatelliteManager {
  private satellites: Map<string, Satellite> = new Map();

  /**
   * Add a satellite to the manager
   */
  addSatellite(satellite: Satellite): void {
    this.satellites.set(satellite.name, satellite);
  }

  /**
   * Remove a satellite
   */
  removeSatellite(name: string): boolean {
    return this.satellites.delete(name);
  }

  /**
   * Get satellite by name
   */
  getSatellite(name: string): Satellite | undefined {
    return this.satellites.get(name);
  }

  /**
   * Get all satellites
   */
  getAllSatellites(): Satellite[] {
    return Array.from(this.satellites.values());
  }

  /**
   * Update all satellites
   */
  update(dt: number, stellarBody: { position: Vector3; luminosity: number } | null): void {
    for (const satellite of this.satellites.values()) {
      satellite.update(dt, stellarBody);
    }
  }

  /**
   * Find nearest satellite to a position
   */
  findNearestSatellite(position: Vector3): { satellite: Satellite; distance: number } | null {
    let nearest: { satellite: Satellite; distance: number } | null = null;
    let minDist = Infinity;

    for (const satellite of this.satellites.values()) {
      const satPos = satellite.getPosition();
      const dx = satPos.x - position.x;
      const dy = satPos.y - position.y;
      const dz = satPos.z - position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        nearest = { satellite, distance: dist };
      }
    }

    return nearest;
  }

  /**
   * Get all operational satellites
   */
  getOperationalSatellites(): Satellite[] {
    return this.getAllSatellites().filter(
      s => s.status === SatelliteMissionStatus.OPERATIONAL || s.status === SatelliteMissionStatus.DEGRADED
    );
  }

  /**
   * Get satellites by type
   */
  getSatellitesByType(type: SatelliteType): Satellite[] {
    return this.getAllSatellites().filter(s => s.type === type);
  }

  /**
   * Get communication relay network status
   */
  getRelayNetworkStatus(): {
    totalRelays: number;
    operationalRelays: number;
    averageSignalStrength: number;
    totalDataBuffer: number;
  } {
    const relays = this.getSatellitesByType(SatelliteType.COMMUNICATIONS);
    const operational = relays.filter(r => r.status === SatelliteMissionStatus.OPERATIONAL);

    let totalSignal = 0;
    let totalData = 0;

    for (const relay of operational) {
      const state = relay.getState();
      if (state.communications.downlink) {
        totalSignal += state.communications.downlink.signalStrength;
      }
      totalData += state.communications.dataBuffer;
    }

    return {
      totalRelays: relays.length,
      operationalRelays: operational.length,
      averageSignalStrength: operational.length > 0 ? totalSignal / operational.length : 0,
      totalDataBuffer: totalData
    };
  }

  /**
   * Get complete state of all satellites
   */
  getState() {
    return {
      totalSatellites: this.satellites.size,
      satellites: Array.from(this.satellites.values()).map(s => s.getState())
    };
  }
}

// ============================================================================
// SATELLITE FACTORY - PRE-CONFIGURED SATELLITE TYPES
// ============================================================================

export class SatelliteFactory {
  /**
   * Create a communications relay satellite
   */
  static createCommunicationsSatellite(name: string, orbitAltitude: number): Satellite {
    const MOON_RADIUS = 1737400;
    const a = MOON_RADIUS + orbitAltitude;

    return new Satellite({
      name,
      type: SatelliteType.COMMUNICATIONS,
      mass: 3000,
      radius: 3,
      semiMajorAxis: a,
      eccentricity: 0,
      inclination: 0,
      longitudeOfAN: 0,
      argOfPeriapsis: 0,
      meanAnomalyEpoch: 0,
      hasDockingPort: true,
      solarPanels: [
        {
          id: 'port_array',
          area: 20,
          efficiency: 0.3,
          orientation: { x: -1, y: 0, z: 0 },
          deployable: true,
          deployed: false,
          degradation: 1.0,
          temperature: 280
        },
        {
          id: 'starboard_array',
          area: 20,
          efficiency: 0.3,
          orientation: { x: 1, y: 0, z: 0 },
          deployable: true,
          deployed: false,
          degradation: 1.0,
          temperature: 280
        }
      ],
      batteries: [
        {
          id: 'main_battery',
          capacityWh: 5000,
          currentChargeWh: 5000,
          maxChargeRateW: 2000,
          maxDischargeRateW: 3000,
          voltage: 28,
          cycleCount: 0,
          health: 1.0,
          temperature: 280
        }
      ],
      reactionWheels: [
        { id: 'rw_x', axis: { x: 1, y: 0, z: 0 }, maxTorque: 0.2, maxMomentum: 50, currentMomentum: 0, powerConsumption: 50, operational: true },
        { id: 'rw_y', axis: { x: 0, y: 1, z: 0 }, maxTorque: 0.2, maxMomentum: 50, currentMomentum: 0, powerConsumption: 50, operational: true },
        { id: 'rw_z', axis: { x: 0, y: 0, z: 1 }, maxTorque: 0.2, maxMomentum: 50, currentMomentum: 0, powerConsumption: 50, operational: true }
      ],
      transponders: [
        { id: 'main_transponder', frequency: 12, bandwidth: 500, transmitPower: 100, receiveGain: 40, dataRate: 150, operational: true }
      ],
      antennas: [
        { id: 'main_dish', type: 'directional', gain: 45, beamwidth: 2, pointing: { x: 0, y: 0, z: 1 }, deployable: true, deployed: false }
      ],
      radiators: [
        { id: 'radiator_1', area: 5, emissivity: 0.9, orientation: { x: 0, y: 1, z: 0 }, temperature: 280, deployable: false, deployed: true }
      ]
    });
  }

  /**
   * Create a reconnaissance/spy satellite
   */
  static createReconnaissanceSatellite(name: string, orbitAltitude: number): Satellite {
    const MOON_RADIUS = 1737400;
    const a = MOON_RADIUS + orbitAltitude;

    return new Satellite({
      name,
      type: SatelliteType.RECONNAISSANCE,
      mass: 6000,
      radius: 4,
      semiMajorAxis: a,
      eccentricity: 0,
      inclination: Math.PI / 4, // 45 degree inclined orbit
      longitudeOfAN: 0,
      argOfPeriapsis: 0,
      meanAnomalyEpoch: 0,
      solarPanels: [
        {
          id: 'main_array',
          area: 50,
          efficiency: 0.32,
          orientation: { x: 0, y: 1, z: 0 },
          deployable: true,
          deployed: false,
          degradation: 1.0,
          temperature: 280
        }
      ],
      batteries: [
        {
          id: 'main_battery',
          capacityWh: 10000,
          currentChargeWh: 10000,
          maxChargeRateW: 4000,
          maxDischargeRateW: 6000,
          voltage: 28,
          cycleCount: 0,
          health: 1.0,
          temperature: 280
        }
      ],
      reactionWheels: [
        { id: 'rw_x', axis: { x: 1, y: 0, z: 0 }, maxTorque: 0.5, maxMomentum: 100, currentMomentum: 0, powerConsumption: 80, operational: true },
        { id: 'rw_y', axis: { x: 0, y: 1, z: 0 }, maxTorque: 0.5, maxMomentum: 100, currentMomentum: 0, powerConsumption: 80, operational: true },
        { id: 'rw_z', axis: { x: 0, y: 0, z: 1 }, maxTorque: 0.5, maxMomentum: 100, currentMomentum: 0, powerConsumption: 80, operational: true }
      ],
      transponders: [
        { id: 'data_link', frequency: 26, bandwidth: 2000, transmitPower: 200, receiveGain: 50, dataRate: 800, operational: true }
      ],
      antennas: [
        { id: 'phased_array', type: 'phased_array', gain: 35, beamwidth: 5, pointing: { x: 0, y: 0, z: -1 }, deployable: false, deployed: true }
      ],
      sensors: [
        {
          id: 'optical_telescope',
          type: 'optical',
          resolution: 0.3,
          swathWidth: 15,
          pointing: { x: 0, y: 0, z: -1 },
          operational: true,
          powerConsumption: 500,
          dataGenerationRate: 50
        },
        {
          id: 'sar_radar',
          type: 'radar',
          resolution: 1.0,
          swathWidth: 50,
          pointing: { x: 0, y: 0, z: -1 },
          operational: true,
          powerConsumption: 2000,
          dataGenerationRate: 100
        }
      ],
      radiators: [
        { id: 'radiator_1', area: 10, emissivity: 0.9, orientation: { x: 0, y: 1, z: 0 }, temperature: 280, deployable: false, deployed: true }
      ]
    });
  }

  /**
   * Create a navigation satellite (GPS-like)
   */
  static createNavigationSatellite(name: string, orbitAltitude: number): Satellite {
    const MOON_RADIUS = 1737400;
    const a = MOON_RADIUS + orbitAltitude;

    return new Satellite({
      name,
      type: SatelliteType.NAVIGATION,
      mass: 1700,
      radius: 2,
      semiMajorAxis: a,
      eccentricity: 0,
      inclination: Math.PI / 3, // 60 degree inclined orbit
      longitudeOfAN: 0,
      argOfPeriapsis: 0,
      meanAnomalyEpoch: 0,
      solarPanels: [
        {
          id: 'solar_array',
          area: 25,
          efficiency: 0.3,
          orientation: { x: 0, y: 1, z: 0 },
          deployable: true,
          deployed: false,
          degradation: 1.0,
          temperature: 280
        }
      ],
      batteries: [
        {
          id: 'main_battery',
          capacityWh: 3000,
          currentChargeWh: 3000,
          maxChargeRateW: 1000,
          maxDischargeRateW: 1500,
          voltage: 28,
          cycleCount: 0,
          health: 1.0,
          temperature: 280
        }
      ],
      reactionWheels: [
        { id: 'rw_x', axis: { x: 1, y: 0, z: 0 }, maxTorque: 0.1, maxMomentum: 20, currentMomentum: 0, powerConsumption: 30, operational: true },
        { id: 'rw_y', axis: { x: 0, y: 1, z: 0 }, maxTorque: 0.1, maxMomentum: 20, currentMomentum: 0, powerConsumption: 30, operational: true },
        { id: 'rw_z', axis: { x: 0, y: 0, z: 1 }, maxTorque: 0.1, maxMomentum: 20, currentMomentum: 0, powerConsumption: 30, operational: true }
      ],
      transponders: [
        { id: 'nav_beacon_l1', frequency: 1.575, bandwidth: 20, transmitPower: 50, receiveGain: 10, dataRate: 0.05, operational: true },
        { id: 'nav_beacon_l2', frequency: 1.227, bandwidth: 20, transmitPower: 50, receiveGain: 10, dataRate: 0.05, operational: true }
      ],
      antennas: [
        { id: 'earth_antenna_1', type: 'omnidirectional', gain: 12, beamwidth: 30, pointing: { x: 0, y: 0, z: -1 }, deployable: false, deployed: true },
        { id: 'earth_antenna_2', type: 'omnidirectional', gain: 12, beamwidth: 30, pointing: { x: 0, y: 0, z: -1 }, deployable: false, deployed: true }
      ],
      radiators: [
        { id: 'radiator', area: 3, emissivity: 0.85, orientation: { x: 0, y: 1, z: 0 }, temperature: 280, deployable: false, deployed: true }
      ]
    });
  }

  /**
   * Create a weather/environmental monitoring satellite
   */
  static createWeatherSatellite(name: string, orbitAltitude: number): Satellite {
    const MOON_RADIUS = 1737400;
    const a = MOON_RADIUS + orbitAltitude;

    return new Satellite({
      name,
      type: SatelliteType.WEATHER,
      mass: 2500,
      radius: 2.5,
      semiMajorAxis: a,
      eccentricity: 0,
      inclination: Math.PI / 2, // Polar orbit
      longitudeOfAN: 0,
      argOfPeriapsis: 0,
      meanAnomalyEpoch: 0,
      solarPanels: [
        {
          id: 'solar_array',
          area: 30,
          efficiency: 0.3,
          orientation: { x: 0, y: 1, z: 0 },
          deployable: true,
          deployed: false,
          degradation: 1.0,
          temperature: 280
        }
      ],
      batteries: [
        {
          id: 'main_battery',
          capacityWh: 4000,
          currentChargeWh: 4000,
          maxChargeRateW: 1500,
          maxDischargeRateW: 2000,
          voltage: 28,
          cycleCount: 0,
          health: 1.0,
          temperature: 280
        }
      ],
      reactionWheels: [
        { id: 'rw_x', axis: { x: 1, y: 0, z: 0 }, maxTorque: 0.3, maxMomentum: 40, currentMomentum: 0, powerConsumption: 60, operational: true },
        { id: 'rw_y', axis: { x: 0, y: 1, z: 0 }, maxTorque: 0.3, maxMomentum: 40, currentMomentum: 0, powerConsumption: 60, operational: true },
        { id: 'rw_z', axis: { x: 0, y: 0, z: 1 }, maxTorque: 0.3, maxMomentum: 40, currentMomentum: 0, powerConsumption: 60, operational: true }
      ],
      transponders: [
        { id: 'telemetry', frequency: 8, bandwidth: 100, transmitPower: 75, receiveGain: 30, dataRate: 50, operational: true }
      ],
      antennas: [
        { id: 'omni_antenna', type: 'omnidirectional', gain: 15, beamwidth: 60, pointing: { x: 0, y: 0, z: -1 }, deployable: false, deployed: true }
      ],
      sensors: [
        {
          id: 'multispectral',
          type: 'multispectral',
          resolution: 2.0,
          swathWidth: 100,
          pointing: { x: 0, y: 0, z: -1 },
          operational: true,
          powerConsumption: 300,
          dataGenerationRate: 20
        },
        {
          id: 'infrared',
          type: 'infrared',
          resolution: 5.0,
          swathWidth: 200,
          pointing: { x: 0, y: 0, z: -1 },
          operational: true,
          powerConsumption: 200,
          dataGenerationRate: 10
        }
      ],
      radiators: [
        { id: 'radiator', area: 6, emissivity: 0.9, orientation: { x: 0, y: 1, z: 0 }, temperature: 280, deployable: false, deployed: true }
      ]
    });
  }
}
