/**
 * Spacecraft Integration Module
 *
 * Integrates all physics modules into a unified spacecraft simulation:
 * - Fuel System
 * - Electrical System
 * - Compressed Gas System
 * - Thermal System
 * - Coolant System
 * - Main Engine
 * - RCS System
 * - Ship Physics Core
 * - Flight Control System (PID, SAS, Autopilot)
 * - Navigation System (Trajectory, Telemetry)
 * - Mission System (Objectives, Scoring)
 * - Navigation Computer
 * - Countermeasures
 * - Docking System
 * - Landing System
 * - Communications
 * - Cargo Management
 * - Electronic Warfare
 * - Environmental Systems
 *
 * Handles:
 * - System interconnections
 * - Resource management
 * - Power distribution
 * - Thermal coupling
 * - Flight automation
 * - Navigation and guidance
 * - Mission management
 * - Combat and defensive systems
 * - Life support and environmental control
 * - Complete update loop
 */

import { FuelSystem } from './fuel-system';
import { ElectricalSystem } from './electrical-system';
import { CompressedGasSystem } from './compressed-gas-system';
import { ThermalSystem } from './thermal-system';
import { CoolantSystem } from './coolant-system';
import { MainEngine } from './main-engine';
import { RCSSystem } from './rcs-system';
import { ShipPhysics } from './ship-physics';
import { FlightControlSystem, type SASMode, type AutopilotMode } from './flight-control';
import { NavigationSystem } from './navigation';
import { MissionSystem, type Mission } from './mission';
import { NavigationComputer } from './nav-computer';
import { CountermeasureSystem } from './countermeasures';
import { DockingSystem } from './docking-system';
import { LandingSystem } from './landing-system';
import { CommunicationsSystem } from './communications';
import { CargoManagementSystem } from './cargo-management';
import { ElectronicWarfareSystem } from './electronic-warfare';
import { EnvironmentalSystem } from './environmental-systems';
import { SystemsIntegrator } from './systems-integrator';
import { WeaponsControlSystem } from './weapons-control';
import { KineticWeapon } from './kinetic-weapons';
import { MissileLauncherSystem } from './missile-weapons';
import { LaserWeapon } from './energy-weapons';
import { ParticleBeamWeapon } from './energy-weapons';
import { CenterOfMassSystem } from './center-of-mass';
import { RadarSystem } from './radar-system';
import { OpticalSensorsSystem } from './optical-sensors';
import { ESMSystem } from './esm-system';
import { SensorFusionSystem } from './sensor-fusion';
import { CrewSystem } from './crew-system';
import { OrbitalMechanicsSystem } from './orbital-mechanics';
import { LifeSupportSystem } from './life-support-enhanced';

export interface SpacecraftConfig {
  // Optional system configurations
  fuelConfig?: any;
  electricalConfig?: any;
  gasConfig?: any;
  thermalConfig?: any;
  coolantConfig?: any;
  mainEngineConfig?: any;
  rcsConfig?: any;
  shipPhysicsConfig?: any;
  flightControlConfig?: any;
  navigationConfig?: any;
  missionConfig?: any;
  navComputerConfig?: any;
  countermeasuresConfig?: any;
  dockingConfig?: any;
  landingConfig?: any;
  communicationsConfig?: any;
  cargoConfig?: any;
  ewConfig?: any;
  environmentalConfig?: any;
  lifeSupportConfig?: any;
}

export class Spacecraft {
  // Core physics subsystems
  public fuel: FuelSystem;
  public electrical: ElectricalSystem;
  public gas: CompressedGasSystem;
  public thermal: ThermalSystem;
  public coolant: CoolantSystem;
  public mainEngine: MainEngine;
  public rcs: RCSSystem;
  public physics: ShipPhysics;

  // Advanced flight systems
  public flightControl: FlightControlSystem;
  public navigation: NavigationSystem;
  public mission: MissionSystem;

  // Additional spacecraft subsystems
  public navComputer: NavigationComputer;
  public countermeasures: CountermeasureSystem;
  public docking: DockingSystem;
  public landing: LandingSystem;
  public communications: CommunicationsSystem;
  public cargo: CargoManagementSystem;
  public ew: ElectronicWarfareSystem;
  public environmental: EnvironmentalSystem;

  // Systems integration and management
  public systemsIntegrator: SystemsIntegrator;

  // Weapons systems
  public weapons: WeaponsControlSystem;

  // Center of Mass tracking
  public comSystem: CenterOfMassSystem;

  // Sensor systems
  public radar: RadarSystem;
  public opticalSensors: OpticalSensorsSystem;
  public esm: ESMSystem;
  public sensorFusion: SensorFusionSystem;

  // Crew management
  public crew: CrewSystem;

  // Orbital mechanics
  public orbitalMechanics: OrbitalMechanicsSystem;

  // Life support system
  public lifeSupport: LifeSupportSystem;

  // Simulation time
  public simulationTime: number = 0;

  // Initial fuel capacity (for delta-V calculations)
  private initialFuelCapacity: number = 0;

  constructor(config?: SpacecraftConfig) {
    // Initialize core physics systems
    this.fuel = new FuelSystem(config?.fuelConfig);
    this.electrical = new ElectricalSystem(config?.electricalConfig);
    this.gas = new CompressedGasSystem(config?.gasConfig);
    this.thermal = new ThermalSystem(config?.thermalConfig);
    this.coolant = new CoolantSystem(config?.coolantConfig);
    this.mainEngine = new MainEngine(config?.mainEngineConfig);
    this.rcs = new RCSSystem(config?.rcsConfig);
    this.physics = new ShipPhysics(config?.shipPhysicsConfig);

    // Initialize advanced flight systems
    this.flightControl = new FlightControlSystem(config?.flightControlConfig);
    this.navigation = new NavigationSystem();
    this.mission = new MissionSystem();

    // Initialize additional subsystems
    this.navComputer = new NavigationComputer(config?.navComputerConfig);
    this.countermeasures = new CountermeasureSystem(config?.countermeasuresConfig);
    this.docking = new DockingSystem(config?.dockingConfig);
    this.landing = new LandingSystem(config?.landingConfig);
    this.communications = new CommunicationsSystem(config?.communicationsConfig);
    this.cargo = new CargoManagementSystem(config?.cargoConfig);
    this.ew = new ElectronicWarfareSystem(config?.ewConfig);
    this.environmental = new EnvironmentalSystem(config?.environmentalConfig);

    // Initialize Center of Mass tracking FIRST (before weapons and integrator)
    this.comSystem = new CenterOfMassSystem();
    this.initializeMassComponents();

    // Register cargo system with CoM tracking
    this.cargo.registerCoMSystem(this.comSystem);

    // Initialize weapons control system
    this.weapons = new WeaponsControlSystem();
    this.initializeWeapons();

    // Register ammunition mass components AFTER weapons (Critical Fix: Ammunition CoM Tracking)
    this.registerAmmunitionMass();

    // Initialize sensor systems
    this.radar = new RadarSystem({
      peakPowerKW: 100, // 100 kW peak power
      antennaGainDB: 35, // 35 dB antenna gain
      frequencyGHz: 10, // X-band radar (10 GHz)
      maxRangeKm: 1000 // 1000 km maximum range
    });

    this.opticalSensors = new OpticalSensorsSystem({
      visualApertureM: 0.2, // 20cm telescope
      irApertureM: 0.15, // 15cm IR sensor
      fieldOfViewDegrees: 10, // 10 degree FOV
      minDetectableFlux: 1e-12 // W/m^2
    });

    this.esm = new ESMSystem({
      frequencyRangeGHz: [1, 40], // 1-40 GHz coverage
      antennaGainDB: 10, // 10 dB antenna gain
      sensitivityDBm: -90, // -90 dBm sensitivity
      directionFindingAccuracy: 5 // ±5 degrees
    });

    this.sensorFusion = new SensorFusionSystem({
      correlationThresholdDegrees: 10, // 10 degree correlation threshold
      trackConfirmationTime: 2 // 2 seconds to confirm track
    });

    // Initialize crew management system
    this.crew = new CrewSystem();

    // Initialize orbital mechanics system (default to Earth)
    this.orbitalMechanics = new OrbitalMechanicsSystem();

    // Initialize life support system
    this.lifeSupport = new LifeSupportSystem(config?.lifeSupportConfig);

    // Initialize systems integrator (MUST be last - needs all systems initialized)
    this.systemsIntegrator = new SystemsIntegrator(this);

    // Store initial fuel capacity for delta-V calculations
    this.initialFuelCapacity = this.fuel.getState().totalFuel;
  }

  /**
   * Initialize weapons based on MC-550 "Valkyrie" layout
   */
  private initializeWeapons(): void {
    // 1. Dorsal Autocannon (PD-20) - Point Defense
    const pdGun = new KineticWeapon({
      id: 'pd_autocannon',
      name: 'PD-20 Dorsal Autocannon',
      type: 'autocannon',
      caliber: 20,
      rateOfFire: 600,
      maxRange: 5,
      muzzleVelocity: 1500,
      turretConfig: {
        location: { x: 0, y: 6, z: 10 },
        maxAzimuthRate: 60,
        maxElevationRate: 60,
        azimuthMin: -180,
        azimuthMax: 180,
        elevationMin: -30,
        elevationMax: 80,
        gyroStabilized: true,
        trackingAccuracy: 0.5
      },
      magazineConfig: {
        capacity: 500,
        reloadTimeSeconds: 10
      }
    });
    this.weapons.addKineticWeapon(pdGun);

    // 2. Forward Railgun (RG-100) - Anti-Ship
    const railgun = new KineticWeapon({
      id: 'forward_railgun',
      name: 'RG-100 Forward Railgun',
      type: 'railgun',
      caliber: 100,
      rateOfFire: 6,
      maxRange: 1000,
      muzzleVelocity: 8000,
      turretConfig: {
        location: { x: 0, y: 1, z: 18 },
        maxAzimuthRate: 20,
        maxElevationRate: 20,
        azimuthMin: -20,
        azimuthMax: 20,
        elevationMin: -15,
        elevationMax: 15,
        gyroStabilized: true,
        trackingAccuracy: 0.3
      },
      magazineConfig: {
        capacity: 30,
        reloadTimeSeconds: 45
      }
    });
    this.weapons.addKineticWeapon(railgun);

    // 3. Port VLS Missiles
    const portVLS = new MissileLauncherSystem({
      id: 'port_vls',
      type: 'VLS',
      capacity: 4,
      missileType: 'MRM',
      reloadTime: 30
    });
    portVLS.launcher.location = { x: -6, y: 2, z: 8 };
    this.weapons.addMissileLauncher(portVLS);

    // 4. Starboard VLS Missiles
    const starboardVLS = new MissileLauncherSystem({
      id: 'starboard_vls',
      type: 'VLS',
      capacity: 4,
      missileType: 'MRM',
      reloadTime: 30
    });
    starboardVLS.launcher.location = { x: 6, y: 2, z: 8 };
    this.weapons.addMissileLauncher(starboardVLS);

    // 5. Ventral Pulse Laser (PL-5) - Point Defense
    const pulseLaser = new LaserWeapon({
      id: 'ventral_laser',
      name: 'PL-5 Ventral Pulse Laser',
      type: 'pulse_laser',
      peakPower: 5000000, // 5 MW
      wavelength: 'IR',
      apertureDiameter: 0.5
    });
    this.weapons.addLaserWeapon(pulseLaser);

    // 6. Forward Particle Beam (NPB-50) - Heavy Anti-Ship
    const particleBeam = new ParticleBeamWeapon({
      id: 'forward_pbeam',
      name: 'NPB-50 Forward Particle Beam',
      type: 'neutral',
      particleEnergy: 50,
      beamCurrent: 100
    });
    this.weapons.addParticleBeam(particleBeam);
  }

  /**
   * Initialize all mass components for Center of Mass tracking
   * Based on SPACECRAFT_INTEGRATION.md mass budget (Lines 312-326)
   */
  private initializeMassComponents(): void {
    // Fixed structural components
    this.comSystem.registerComponent({
      id: 'hull_structure',
      name: 'Hull Structure',
      mass: 15000, // kg
      position: { x: 0, y: 0, z: 0 }, // Distributed, use origin
      fixed: true
    });

    this.comSystem.registerComponent({
      id: 'reactor',
      name: 'Reactor + Shielding',
      mass: 8000,
      position: { x: 0, y: -2, z: -5 },
      fixed: true
    });

    this.comSystem.registerComponent({
      id: 'main_engine',
      name: 'Main Engine',
      mass: 5000,
      position: { x: 0, y: -3, z: -22 },
      fixed: true
    });

    this.comSystem.registerComponent({
      id: 'weapons_systems',
      name: 'Weapons Systems',
      mass: 4000,
      position: { x: 0, y: 1, z: 10 }, // Average of weapon locations
      fixed: true
    });

    this.comSystem.registerComponent({
      id: 'sensors_comms',
      name: 'Sensors/Communications',
      mass: 1000,
      position: { x: 0, y: 5, z: 20 }, // Forward/dorsal
      fixed: true
    });

    this.comSystem.registerComponent({
      id: 'life_support',
      name: 'Life Support',
      mass: 2000,
      position: { x: 0, y: 5, z: 12 }, // Deck 1
      fixed: true
    });

    this.comSystem.registerComponent({
      id: 'crew_supplies',
      name: 'Crew + Supplies',
      mass: 1000,
      position: { x: 0, y: 5, z: 15 }, // Crew quarters
      fixed: false // Can move slightly
    });

    // Fuel tanks (variable mass)
    // Register with initial full mass, will be updated as fuel is consumed
    const fuelState = this.fuel.getState();
    for (const tank of fuelState.tanks) {
      const position = this.getFuelTankPosition(tank.id);
      this.comSystem.registerComponent({
        id: `fuel_${tank.id}`,
        name: `Fuel Tank ${tank.id}`,
        mass: tank.fuelMass,
        position: position,
        fixed: true // Tank location is fixed, mass changes
      });
    }

    // RCS propellant (distributed)
    this.comSystem.registerComponent({
      id: 'rcs_propellant',
      name: 'RCS Propellant',
      mass: 1000, // Initial estimate, will be updated
      position: { x: 0, y: 0, z: 0 }, // Distributed around ship
      fixed: true
    });

    // Cargo (initial empty)
    this.comSystem.registerComponent({
      id: 'cargo',
      name: 'Cargo Mass',
      mass: 0, // Start empty
      position: { x: 0, y: 1, z: 0 }, // Cargo bay
      fixed: false // Can be repositioned
    });
  }

  /**
   * Register ammunition mass components with CoM system
   * Called after weapons are initialized
   */
  private registerAmmunitionMass(): void {
    const magazines = this.weapons.getMagazines();

    for (const mag of magazines) {
      this.comSystem.registerComponent({
        id: `ammo_${mag.id}`,
        name: `Ammunition (${mag.weaponId})`,
        mass: mag.mass,
        position: mag.location,
        fixed: true // Magazine location is fixed, mass changes
      });
    }
  }

  /**
   * Map fuel tank IDs to physical positions from ship layout
   */
  private getFuelTankPosition(tankId: string): { x: number; y: number; z: number } {
    const positions: Record<string, { x: number; y: number; z: number }> = {
      'main_1': { x: -3, y: -2, z: -10 }, // Port main tank
      'main_2': { x: 3, y: -2, z: -10 },  // Starboard main tank (oxidizer)
      'rcs': { x: 0, y: -1, z: 0 }        // RCS tank (distributed, use average)
    };
    return positions[tankId] || { x: 0, y: 0, z: 0 };
  }

  /**
   * Master update loop - integrates all systems
   */
  update(dt: number): void {
    const t = this.simulationTime;

    // 1. Update electrical system (power generation)
    this.electrical.update(dt, t);

    // 2. Update main engine
    this.mainEngine.update(dt, t);

    // 3. Update RCS system
    this.rcs.update(dt, t);

    // 4. Get current physics state for flight control
    const physicsState = this.physics.getState();
    const mainEngineState = this.mainEngine.getState();

    // 5. Update flight control system (SAS, autopilot)
    const maxThrust = this.mainEngine.maxThrustN;
    const currentThrust = this.mainEngine.currentThrustN;
    const totalMass = this.physics.dryMass + this.physics.propellantMass;
    const gravity = this.physics.getLocalGravity();

    const flightControlState = this.flightControl.update(
      physicsState.attitude,
      physicsState.angularVelocity,
      null, // targetAttitude (can be set by autopilot mode)
      physicsState.velocity,
      physicsState.position,
      physicsState.altitude,
      physicsState.verticalSpeed,
      totalMass,
      maxThrust,
      currentThrust,
      gravity,
      dt
    );

    // 6. Apply autopilot throttle commands (if active)
    if (flightControlState.autopilotMode !== 'off' && mainEngineState.status === 'running') {
      this.mainEngine.setThrottle(flightControlState.throttleCommand.throttle);
    }

    // 7. Apply gimbal autopilot commands (if active)
    if (this.flightControl.isGimbalAutopilotEnabled() && mainEngineState.status === 'running') {
      this.mainEngine.setGimbal(
        flightControlState.gimbalCommand.pitch,
        flightControlState.gimbalCommand.yaw
      );
    }

    // 8. Get propellant consumption from engines
    const mainEngineRates = this.mainEngine.getConsumptionRates();
    const rcsFuelConsumption = this.rcs.consumeFuel(dt, this.getAvailableRCSFuel());

    // 9. Consume fuel from tanks
    const mainFuelTank = this.fuel.getTank('main_1')!;
    const mainOxidizerTank = this.fuel.getTank('main_2')!;
    const rcsTank = this.fuel.getTank('rcs')!;

    const mainFuelAmount = mainEngineRates.fuelKgPerSec * dt;
    const mainOxidizerAmount = mainEngineRates.oxidizerKgPerSec * dt;

    this.fuel.consumeFuel('main_1', mainFuelAmount);
    this.fuel.consumeFuel('main_2', mainOxidizerAmount);

    this.mainEngine.consumePropellant(dt, mainFuelTank.fuelMass, mainOxidizerTank.fuelMass);

    this.fuel.consumeFuel('rcs', rcsFuelConsumption);

    // 9.5. Update Center of Mass with new fuel masses
    const fuelStateAfterConsumption = this.fuel.getState();
    for (const tank of fuelStateAfterConsumption.tanks) {
      this.comSystem.updateMass(`fuel_${tank.id}`, tank.fuelMass);
    }

    // Also update RCS propellant mass (from fuel tank)
    const rcsTankState = this.fuel.getTank('rcs');
    if (rcsTankState) {
      this.comSystem.updateMass('rcs_propellant', rcsTankState.fuelMass);
    }

    // 9.6. Update ammunition mass (Critical Fix: Ammunition CoM Tracking)
    const magazines = this.weapons.getMagazines();
    for (const mag of magazines) {
      this.comSystem.updateMass(`ammo_${mag.id}`, mag.mass);
    }

    // 10. Update ship mass in physics
    const totalPropellantMass = this.fuel.getTotalFuelMass();
    this.physics.propellantMass = totalPropellantMass;

    // 11. Get thrust and torque vectors
    const mainEngineThrust = this.mainEngine.getThrustVector();
    const mainEngineTorque = { x: 0, y: 0, z: 0 };  // Gimbal torque (simplified for now)

    // 11.3. Update RCS with current CoM for proper torque compensation
    // (Critical Fix: RCS CoM Compensation)
    const comOffset = this.comSystem.getCoM();
    this.rcs.setCoMOffset(comOffset);

    const rcsThrust = this.rcs.getTotalThrustVector();
    const rcsTorque = this.rcs.getTotalTorque();

    // 11.4. Get weapon recoil (Critical Fix #4: Weapons Physics Integration)
    const weaponRecoil = this.weapons.getRecoilForce();
    // Note: Recoil is opposite to projectile direction, already signed correctly

    // 11.5. Update physics with current CoM and moment of inertia
    const momentOfInertia = this.comSystem.getMomentOfInertia();
    this.physics.setCoMOffset(comOffset);
    this.physics.setMomentOfInertia(momentOfInertia);

    // Also update the dry mass from CoM system (more accurate than hardcoded)
    this.physics.dryMass = this.comSystem.getTotalMass() - totalPropellantMass;

    // 12. Update ship physics (with weapon recoil applied)
    const totalPropellantConsumed = mainFuelAmount + mainOxidizerAmount + rcsFuelConsumption;

    // Apply weapon recoil as additional thrust (recoil pushes ship in opposite direction)
    const totalRCSplusRecoil = {
      x: rcsThrust.x + weaponRecoil.x,
      y: rcsThrust.y + weaponRecoil.y,
      z: rcsThrust.z + weaponRecoil.z
    };

    this.physics.update(
      dt,
      mainEngineThrust,
      mainEngineTorque,
      totalRCSplusRecoil,  // RCS + weapon recoil
      rcsTorque,
      totalPropellantConsumed
    );

    // 13. Update thermal system with heat generation
    const componentTemps = new Map<string, number>();

    // Main engine generates heat
    const mainEngineHeat = this.mainEngine.getHeatGenerationW();
    this.thermal.setHeatGeneration('main_engine', mainEngineHeat);

    // Reactor generates heat
    const reactorHeat = this.electrical.reactor.heatGenerationW;
    this.thermal.setHeatGeneration('reactor', reactorHeat);

    // Battery generates heat during discharge (simplified)
    // Heat generation proportional to discharge rate
    const batteryHeat = this.electrical.battery.chargeKWh < this.electrical.battery.capacityKWh ? 50 : 0;
    this.thermal.setHeatGeneration('battery', batteryHeat);

    // Weapons generate heat (Critical Fix #3: Weapons Thermal Integration)
    const weaponsHeat = this.weapons.getHeatGeneration();
    this.thermal.setHeatGeneration('weapons', weaponsHeat);

    this.thermal.update(dt, t);

    // 14. Update coolant system with component temperatures
    for (const [name, component] of this.thermal.heatSources) {
      componentTemps.set(name, component.temperature);
    }

    this.coolant.update(dt, t, componentTemps);

    // 15. Update compressed gas system
    this.gas.update(dt, t);

    // 16. Update fuel system
    this.fuel.update(dt, t);

    // 17. Update mission checklists (if mission loaded)
    this.mission.updateChecklists();

    // 18. Update additional subsystems
    this.navComputer.updateNavSolution(1.0, dt); // Assume full star visibility for now
    this.countermeasures.update(dt);
    this.docking.update(dt);
    this.landing.update(dt);
    this.communications.update(dt);
    this.cargo.update(dt);
    this.ew.update(dt);
    this.environmental.update(dt);
    this.crew.update(dt);
    this.lifeSupport.update(dt);

    // 18.5. Update weapons control system
    this.weapons.updateShipState(physicsState.position, {
      x: physicsState.velocity.x,
      y: physicsState.velocity.y,
      z: physicsState.velocity.z
    });

    // Set available power for brownout enforcement (Critical Fix: Power Brownout Enforcement)
    const reactorPowerW = this.electrical.reactor.currentOutputKW * 1000;
    const batteryPowerW = this.electrical.battery.maxDischargeRateKW * 1000;
    const totalAvailablePowerW = reactorPowerW + batteryPowerW;
    this.weapons.setPowerAvailable(totalAvailablePowerW);

    // Set gravity for projectile ballistics (Critical Fix: Projectile Gravity Physics)
    // Default to zero (deep space). Spacecraft can set this based on proximity to planetary bodies.
    // Example: Near Earth surface would be { x: 0, y: 0, z: -9.80665 }
    this.weapons.setGravity({ x: 0, y: 0, z: 0 });

    this.weapons.update(dt);

    // 18.6. Update sensor systems
    const orientation = {
      pitch: physicsState.eulerAngles.pitch,
      roll: physicsState.eulerAngles.roll,
      yaw: physicsState.eulerAngles.yaw
    };

    // Get potential targets from universe/environment
    // For now, use empty arrays - will be populated by game/universe
    const radarTargets: Array<{
      id: string;
      position: { x: number; y: number; z: number };
      velocity: { x: number; y: number; z: number };
      rcs: number;
    }> = [];

    const opticalTargets: Array<{
      id: string;
      position: { x: number; y: number; z: number };
      velocity: { x: number; y: number; z: number };
      radius: number;
      temperature: number;
      engineFiring: boolean;
    }> = [];

    const esmEmitters: Array<{
      id: string;
      position: { x: number; y: number; z: number };
      emitting: boolean;
      emissionType: 'radar' | 'communications' | 'jammer';
      frequencyGHz: number;
      powerKW: number;
    }> = [];

    // Update individual sensor systems
    this.radar.update(dt, physicsState.position, orientation, radarTargets);
    this.opticalSensors.update(dt, physicsState.position, orientation, opticalTargets);
    this.esm.update(dt, physicsState.position, orientation, esmEmitters);

    // Sensor fusion - combine all sensor contacts
    const radarContacts = this.radar.getContacts();
    const radarTracks = this.radar.getTracks();
    const opticalContacts = this.opticalSensors.getContacts();
    const esmContacts = this.esm.getContacts();

    this.sensorFusion.update(
      dt,
      radarContacts,
      radarTracks,
      opticalContacts,
      esmContacts,
      physicsState.position,
      physicsState.velocity
    );

    // 18.7. Import sensor fusion tracks into weapons control
    // (Critical Gap Fill: Sensor-Weapons Integration)
    const fusedTracks = this.sensorFusion.getTracks();
    this.weapons.importSensorTracks(fusedTracks);

    // 19. Update systems integrator (power management, damage propagation, automation)
    this.systemsIntegrator.update(dt);

    // 20. Check for high-G cargo damage
    // Calculate acceleration from thrust and mass
    const totalThrust = Math.sqrt(
      (mainEngineThrust.x + rcsThrust.x) ** 2 +
      (mainEngineThrust.y + rcsThrust.y) ** 2 +
      (mainEngineThrust.z + rcsThrust.z) ** 2
    );
    const gForce = (totalThrust / totalMass) / 9.81;
    if (gForce > 1.5) {
      this.cargo.checkCargoIntegrity(gForce);
    }

    // 21. Increment time
    this.simulationTime += dt;
  }

  /**
   * Get available RCS fuel
   */
  private getAvailableRCSFuel(): number {
    const rcsTank = this.fuel.getTank('rcs');
    return rcsTank ? rcsTank.fuelMass : 0;
  }

  /**
   * Get comprehensive spacecraft state
   */
  getState() {
    return {
      simulationTime: this.simulationTime,
      physics: this.physics.getState(),
      fuel: this.fuel.getState(),
      electrical: this.electrical.getState(),
      gas: this.gas.getState(),
      thermal: this.thermal.getState(),
      coolant: this.coolant.getState(),
      mainEngine: this.mainEngine.getState(),
      rcs: this.rcs.getState(),
      flightControl: this.flightControl.getState(),
      navigation: this.getNavigationTelemetry(),
      mission: this.mission.getCurrentMission(),
      navComputer: this.navComputer.getState(),
      countermeasures: this.countermeasures.getState(),
      docking: this.docking.getState(),
      landing: this.landing.getState(),
      communications: this.communications.getState(),
      cargo: this.cargo.getState(),
      ew: this.ew.getState(),
      environmental: this.environmental.getState(),
      weapons: this.weapons.getState(),
      systemsIntegration: this.systemsIntegrator.getState(),
      centerOfMass: this.comSystem.getState(),
      sensors: {
        radar: this.radar.getState(),
        optical: this.opticalSensors.getState(),
        esm: this.esm.getState(),
        fusion: this.sensorFusion.getState()
      },
      crew: this.crew.getState(),
      orbitalMechanics: {
        centralBody: this.orbitalMechanics.getCentralBody().name,
        mu: this.orbitalMechanics.getCentralBody().mu
      },
      lifeSupport: this.lifeSupport.getState()
    };
  }

  /**
   * Get navigation telemetry
   */
  getNavigationTelemetry() {
    const physicsState = this.physics.getState();
    const mainEngineState = this.mainEngine.getState();
    const fuelState = this.fuel.getState();
    const totalMass = this.physics.dryMass + this.physics.propellantMass;

    // Get thrust direction from ship attitude (simplified)
    const thrustDir = { x: 0, y: 0, z: 1 };  // Local Z-axis

    return this.navigation.getTelemetry(
      physicsState.position,
      physicsState.velocity,
      physicsState.attitude,
      totalMass,
      this.mainEngine.currentThrustN,
      thrustDir,
      mainEngineState.throttle,
      fuelState.totalFuel,
      this.initialFuelCapacity,
      this.mainEngine.specificImpulseSec
    );
  }

  /**
   * Command interface: Ignite main engine
   */
  igniteMainEngine(): boolean {
    return this.mainEngine.ignite();
  }

  /**
   * Command interface: Shutdown main engine
   */
  shutdownMainEngine(): void {
    this.mainEngine.shutdown();
  }

  /**
   * Command interface: Set main engine throttle
   */
  setMainEngineThrottle(throttle: number): void {
    this.mainEngine.setThrottle(throttle);
  }

  /**
   * Command interface: Activate RCS group
   */
  activateRCS(groupName: string): boolean {
    return this.rcs.activateGroup(groupName);
  }

  /**
   * Command interface: Deactivate RCS group
   */
  deactivateRCS(groupName: string): void {
    this.rcs.deactivateGroup(groupName);
  }

  /**
   * Command interface: Start reactor
   */
  startReactor(): boolean {
    return this.electrical.startReactor();
  }

  /**
   * Command interface: Start coolant pump
   */
  startCoolantPump(loopId: number): boolean {
    return this.coolant.startPump(loopId);
  }

  // =============================================================================
  // Flight Control System Commands
  // =============================================================================

  /**
   * Set SAS mode
   */
  setSASMode(mode: SASMode): void {
    this.flightControl.setSASMode(mode);
  }

  /**
   * Get current SAS mode
   */
  getSASMode(): SASMode {
    return this.flightControl.getSASMode();
  }

  /**
   * Set autopilot mode
   */
  setAutopilotMode(mode: AutopilotMode): void {
    this.flightControl.setAutopilotMode(mode);
  }

  /**
   * Get current autopilot mode
   */
  getAutopilotMode(): AutopilotMode {
    return this.flightControl.getAutopilotMode();
  }

  /**
   * Set target altitude for altitude hold autopilot
   */
  setTargetAltitude(altitude: number): void {
    this.flightControl.setTargetAltitude(altitude);
  }

  /**
   * Set target vertical speed for vertical speed hold autopilot
   */
  setTargetVerticalSpeed(speed: number): void {
    this.flightControl.setTargetVerticalSpeed(speed);
  }

  /**
   * Enable/disable gimbal autopilot
   */
  setGimbalAutopilot(enabled: boolean): void {
    this.flightControl.setGimbalAutopilot(enabled);
  }

  // =============================================================================
  // Navigation System Commands
  // =============================================================================

  /**
   * Set navigation target
   */
  setNavigationTarget(position: { x: number; y: number; z: number }): void {
    this.navigation.setTarget(position);
  }

  /**
   * Clear navigation target
   */
  clearNavigationTarget(): void {
    this.navigation.clearTarget();
  }

  /**
   * Get trajectory prediction
   */
  predictTrajectory() {
    const physicsState = this.physics.getState();
    const totalMass = this.physics.dryMass + this.physics.propellantMass;
    const thrustDir = { x: 0, y: 0, z: 1 };

    return this.navigation.predictImpact(
      physicsState.position,
      physicsState.velocity,
      totalMass,
      this.mainEngine.currentThrustN,
      thrustDir
    );
  }

  /**
   * Get suicide burn data
   */
  getSuicideBurnData() {
    const physicsState = this.physics.getState();
    const totalMass = this.physics.dryMass + this.physics.propellantMass;

    return this.navigation.calculateSuicideBurn(
      physicsState.altitude,
      physicsState.verticalSpeed,
      totalMass,
      this.mainEngine.maxThrustN
    );
  }

  /**
   * Render navball display
   */
  renderNavball(): string {
    const physicsState = this.physics.getState();
    return this.navigation.renderNavball(
      physicsState.attitude,
      physicsState.velocity
    );
  }

  // =============================================================================
  // Mission System Commands
  // =============================================================================

  /**
   * Load mission
   */
  loadMission(mission: Mission): void {
    this.mission.loadMission(mission);
  }

  /**
   * Start mission
   */
  startMission(): void {
    this.mission.startMission(this.simulationTime);
  }

  /**
   * Get current mission
   */
  getCurrentMission(): Mission | null {
    return this.mission.getCurrentMission();
  }

  /**
   * Complete mission objective
   */
  completeObjective(objectiveId: string): void {
    this.mission.completeObjective(objectiveId);
  }

  /**
   * Calculate mission score
   */
  calculateMissionScore(landingSpeed: number, landingAngle: number) {
    const physicsState = this.physics.getState();
    const fuelState = this.fuel.getState();
    const currentMission = this.mission.getCurrentMission();

    if (!currentMission) {
      throw new Error('No active mission');
    }

    // Get target position from landing zone
    const targetPos = { x: 0, y: 0, z: 1737400 };  // Simplified

    return this.mission.calculateMissionScore(
      landingSpeed,
      landingAngle,
      physicsState.position,
      targetPos,
      fuelState.totalFuel,
      95,  // System health (simplified)
      this.simulationTime
    );
  }

  /**
   * Get all system events
   */
  getAllEvents() {
    return {
      fuel: this.fuel.getEvents(),
      electrical: this.electrical.getEvents(),
      gas: this.gas.getEvents(),
      thermal: this.thermal.getEvents(),
      coolant: this.coolant.getEvents(),
      mainEngine: this.mainEngine.getEvents(),
      rcs: this.rcs.getEvents(),
      physics: this.physics.getEvents(),
      navComputer: this.navComputer.events,
      countermeasures: this.countermeasures.events,
      docking: this.docking.events,
      landing: this.landing.events,
      communications: this.communications.events,
      cargo: this.cargo.events,
      ew: this.ew.events,
      environmental: this.environmental.events,
      radar: this.radar.getEvents(),
      opticalSensors: this.opticalSensors.getEvents(),
      esm: this.esm.getEvents(),
      sensorFusion: this.sensorFusion.getEvents(),
      crew: this.crew.getEvents()
    };
  }

  // =============================================================================
  // Additional Command Interface Methods (for UI integration)
  // =============================================================================

  /**
   * Open main engine fuel valve
   */
  openMainEngineFuelValve(): void {
    // Set valve state - this is a simplified interface
    // In a more detailed simulation, this would control actual valve positions
    console.log('Main engine fuel valve opened');
  }

  /**
   * Close main engine fuel valve
   */
  closeMainEngineFuelValve(): void {
    console.log('Main engine fuel valve closed');
  }

  /**
   * Arm main engine for ignition
   */
  armMainEngine(): void {
    // Prepare engine for ignition sequence
    console.log('Main engine armed');
  }

  /**
   * Set main engine gimbal angles
   */
  setMainEngineGimbal(pitchRad: number, yawRad: number): void {
    this.mainEngine.setGimbal(pitchRad, yawRad);
  }

  /**
   * Fire RCS thruster by index
   */
  fireRCSThruster(thrusterIndex: number): void {
    // Map thruster index to RCS groups
    // This is simplified - actual implementation would map to specific thrusters
    const groupMap = [
      'bow_port', 'bow_starboard', 'bow_dorsal', 'bow_ventral',
      'mid_port', 'mid_starboard', 'mid_dorsal', 'mid_ventral',
      'stern_port', 'stern_starboard', 'stern_dorsal', 'stern_ventral'
    ];

    if (thrusterIndex >= 0 && thrusterIndex < groupMap.length) {
      this.rcs.activateGroup(groupMap[thrusterIndex]);
    }
  }

  /**
   * Stop RCS thruster by index
   */
  stopRCSThruster(thrusterIndex: number): void {
    const groupMap = [
      'bow_port', 'bow_starboard', 'bow_dorsal', 'bow_ventral',
      'mid_port', 'mid_starboard', 'mid_dorsal', 'mid_ventral',
      'stern_port', 'stern_starboard', 'stern_dorsal', 'stern_ventral'
    ];

    if (thrusterIndex >= 0 && thrusterIndex < groupMap.length) {
      this.rcs.deactivateGroup(groupMap[thrusterIndex]);
    }
  }

  /**
   * Emergency reactor SCRAM (shutdown)
   */
  scramReactor(): void {
    this.electrical.scramReactor();
  }

  /**
   * Set reactor power output (0-1)
   */
  setReactorPower(powerFraction: number): void {
    this.electrical.setReactorPower(powerFraction);
  }

  /**
   * Set circuit breaker state
   */
  setCircuitBreaker(index: number, state: boolean): void {
    this.electrical.setCircuitBreaker(index, state);
  }

  /**
   * Deploy thermal radiators
   */
  deployRadiators(): void {
    this.thermal.deployRadiators();
  }

  /**
   * Retract thermal radiators
   */
  retractRadiators(): void {
    this.thermal.retractRadiators();
  }

  /**
   * Stop coolant pump
   */
  stopCoolantPump(loopId: number): void {
    this.coolant.stopPump(loopId);
  }

  /**
   * Set radar active state
   */
  setRadarActive(active: boolean): void {
    this.radar.setActive(active);
  }

  /**
   * Set radar range in meters
   */
  setRadarRange(rangeMeters: number): void {
    this.radar.setRange(rangeMeters);
  }

  /**
   * Get life support telemetry for UI
   */
  getLifeSupportTelemetry() {
    const state = this.lifeSupport.getState();

    // Return telemetry for selected compartment (default to center)
    const centerCompartment = state.compartments.find(c => c.id === 'center');

    if (!centerCompartment) {
      return {
        o2Percent: 21,
        co2Percent: 0.04,
        pressure: 101,
        temperature: 293,
        o2GeneratorOn: state.o2GeneratorActive,
        co2ScrubberOn: state.co2ScrubberActive,
        compartments: state.compartments
      };
    }

    // Calculate percentages from masses and volume
    const totalMass = centerCompartment.o2Mass + centerCompartment.co2Mass + centerCompartment.n2Mass;
    const o2Percent = (centerCompartment.o2Mass / totalMass) * 100;
    const co2Percent = (centerCompartment.co2Mass / totalMass) * 100;

    // Calculate pressure from ideal gas law: PV = nRT
    const R = 8.314; // J/(mol·K)
    const o2Moles = centerCompartment.o2Mass / 0.032;
    const co2Moles = centerCompartment.co2Mass / 0.044;
    const n2Moles = centerCompartment.n2Mass / 0.028;
    const totalMoles = o2Moles + co2Moles + n2Moles;
    const pressure = (totalMoles * R * centerCompartment.temperature) / centerCompartment.volume / 1000; // kPa

    return {
      o2Percent: parseFloat(o2Percent.toFixed(1)),
      co2Percent: parseFloat(co2Percent.toFixed(2)),
      pressure: parseFloat(pressure.toFixed(1)),
      temperature: parseFloat(centerCompartment.temperature.toFixed(1)),
      o2GeneratorOn: state.o2GeneratorActive,
      co2ScrubberOn: state.co2ScrubberActive,
      compartments: state.compartments
    };
  }

  /**
   * Toggle O2 generator
   */
  toggleO2Generator(on: boolean): void {
    this.lifeSupport.o2GeneratorActive = on;
  }

  /**
   * Toggle CO2 scrubber
   */
  toggleCO2Scrubber(on: boolean): void {
    this.lifeSupport.co2ScrubberActive = on;
  }

  /**
   * Get sensor telemetry for navigation panel
   */
  getSensorTelemetry() {
    const radarState = this.radar.getState();

    return {
      radarActive: radarState.active,
      radarRange: radarState.maxRange / 1000, // Convert to km
      radarGain: 100, // Simplified - actual gain would come from radar config
      lidarActive: false, // LIDAR not implemented yet
      radarContacts: radarState.contacts,
      radarTracks: radarState.tracks
    };
  }

  // =============================================================================
  // Landing Gear Control Methods
  // =============================================================================

  /**
   * Deploy landing gear
   */
  deployLandingGear(): boolean {
    return this.landing.deployGear();
  }

  /**
   * Retract landing gear
   */
  retractLandingGear(): boolean {
    return this.landing.retractGear();
  }

  /**
   * Toggle landing lights
   */
  toggleLandingLights(on: boolean): void {
    this.landing.toggleLights(on);
  }

  /**
   * Activate terrain scanning radar
   */
  activateTerrainRadar(): boolean {
    return this.landing.activateTerrainRadar();
  }

  /**
   * Deactivate terrain scanning radar
   */
  deactivateTerrainRadar(): void {
    this.landing.deactivateTerrainRadar();
  }

  /**
   * Check if safe to land
   */
  checkLandingSafety(): { safe: boolean; reasons: string[] } {
    return this.landing.isSafeToLand();
  }

  /**
   * Get landing gear telemetry
   */
  getLandingGearTelemetry() {
    const state = this.landing.getState();
    return {
      deployed: state.allGearDeployed,
      locked: state.allGearLocked,
      surfaceContact: state.surfaceContact,
      gearHealth: Array.from(state.gear.values()).map(g => ({
        id: g.id,
        deployed: g.deployed,
        locked: g.locked,
        contact: g.contact,
        health: g.health,
        compression: g.strut.compression
      })),
      terrainRadarActive: state.terrainRadarActive,
      terrainData: state.terrainData,
      lightsOn: state.lightsOn
    };
  }

  // =============================================================================
  // Docking System Control Methods
  // =============================================================================

  /**
   * Initiate docking sequence
   */
  initiateDocking(portId: string, target: any): boolean {
    return this.docking.initiateDocking(portId, target);
  }

  /**
   * Attempt to capture docking target
   */
  attemptDockingCapture(): boolean {
    return this.docking.attemptCapture();
  }

  /**
   * Complete hard dock
   */
  completeHardDock(): boolean {
    return this.docking.completeHardDock();
  }

  /**
   * Undock from target
   */
  undock(portId: string): boolean {
    return this.docking.undock(portId);
  }

  /**
   * Get docking alignment guidance
   */
  getDockingGuidance() {
    return this.docking.getAlignmentGuidance();
  }

  /**
   * Get docking system telemetry
   */
  getDockingTelemetry() {
    const state = this.docking.getState();
    return {
      operational: state.operational,
      activePort: state.activePort,
      dockingInProgress: state.dockingInProgress,
      latchProgress: state.latchProgress,
      ports: Array.from(state.ports.values()).map(p => ({
        id: p.id,
        type: p.type,
        status: p.status,
        connectedTo: p.connectedTo,
        sealIntegrity: p.sealIntegrity,
        alignmentError: p.alignmentError
      })),
      targetData: state.targetData,
      approachRate: state.approachRate
    };
  }

  // =============================================================================
  // Coolant and Thermal Control Methods
  // =============================================================================

  /**
   * Get coolant system telemetry
   */
  getCoolantTelemetry() {
    const state = this.coolant.getState();
    return {
      loops: state.loops.map(loop => ({
        id: loop.id,
        name: loop.name,
        pumpActive: loop.pumpActive,
        temperature: loop.temperature,
        flowRate: loop.flowRateLPerMin,
        coolantMass: loop.coolantMassKg,
        maxCapacity: loop.maxCapacityKg,
        radiatorTemp: loop.radiatorTemperature,
        frozen: loop.frozen,
        boiling: loop.boiling,
        leakRate: loop.leakRateLPerMin
      })),
      crossConnectOpen: state.crossConnectOpen
    };
  }

  /**
   * Get thermal system telemetry
   */
  getThermalTelemetry() {
    const state = this.thermal.getState();
    return {
      radiatorsDeployed: state.radiatorsDeployed,
      radiatorHealth: state.radiatorHealth,
      nodes: state.nodes
    };
  }

  // =============================================================================
  // Life Support Door and Breach Control Methods
  // =============================================================================

  /**
   * Toggle a bulkhead door between two compartments
   */
  toggleBulkheadDoor(comp1Id: string, comp2Id: string): boolean {
    return this.lifeSupport.toggleBulkheadDoor(comp1Id, comp2Id);
  }

  /**
   * Seal a breach in a compartment
   */
  sealBreach(compartmentId: string): boolean {
    return this.lifeSupport.sealBreach(compartmentId);
  }

  /**
   * Vent a compartment to space (emergency depressurization)
   */
  ventCompartment(compartmentId: string): void {
    this.lifeSupport.ventCompartment(compartmentId);
  }

  /**
   * Suppress fire in a compartment
   */
  suppressFire(compartmentId: string): boolean {
    return this.lifeSupport.suppressFire(compartmentId);
  }

  /**
   * Get door status for all compartment connections
   */
  getDoorStatus(): Array<{ comp1: string; comp2: string; open: boolean }> {
    const state = this.lifeSupport.getState();
    return state.connections.map(conn => ({
      comp1: conn.compartment1,
      comp2: conn.compartment2,
      open: conn.doorOpen
    }));
  }

  /**
   * Get breach status for all compartments
   */
  getBreachStatus(): Array<{ id: string; breached: boolean; breachSize: number }> {
    const state = this.lifeSupport.getState();
    return state.compartments.map(comp => ({
      id: comp.id,
      breached: comp.breached,
      breachSize: comp.breachSize
    }));
  }
}
