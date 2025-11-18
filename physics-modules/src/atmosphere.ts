/**
 * Atmospheric Physics Module
 *
 * Implements:
 * - Exponential atmosphere density model
 * - Drag force calculation (quadratic drag)
 * - Aerodynamic heating (reentry)
 * - Lift force for aerodynamic surfaces
 * - Dynamic pressure calculation
 *
 * Gameplay Impact:
 * - Reentry heat management (need heat shields)
 * - Aerobraking maneuvers (save fuel)
 * - Atmospheric flight dynamics
 * - Terminal velocity limits
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AtmosphereConfig {
  // Planet atmosphere parameters
  surfaceDensity?: number;        // kg/m³ at sea level (Earth: 1.225)
  scaleHeight?: number;           // m (Earth: 8500)
  surfacePressure?: number;       // Pa (Earth: 101325)
  temperature?: number;           // K (Earth: 288)

  // Optional: variable composition
  gasConstant?: number;           // J/(kg·K)
  adiabaticIndex?: number;        // γ (Earth air: 1.4)
}

export interface VehicleAeroConfig {
  // Aerodynamic properties
  referenceArea?: number;         // m² (cross-sectional area)
  dragCoefficient?: number;       // Cd (typical: 0.2-2.0)
  liftCoefficient?: number;       // Cl (typical: 0-1.5)

  // Heat shield properties
  heatShieldArea?: number;        // m² (area exposed to airflow)
  heatShieldEmissivity?: number;  // 0-1 (how well it radiates heat)
  heatShieldCapacity?: number;    // J/K (thermal mass)
  heatShieldMaxTemp?: number;     // K (failure temperature)

  // Current state
  heatShieldTemperature?: number; // K (current temperature)
  heatShieldIntegrity?: number;   // 0-1 (1 = perfect, 0 = destroyed)
}

export interface AtmosphericForces {
  drag: Vector3;                  // N (opposing velocity)
  lift: Vector3;                  // N (perpendicular to velocity)
  heating: number;                // W (heat flux into vehicle)
  dynamicPressure: number;        // Pa (q = 0.5 * ρ * v²)
  density: number;                // kg/m³ (atmospheric density)
  machNumber: number;             // v / speedOfSound
}

export class AtmospherePhysics {
  // Atmosphere parameters
  private surfaceDensity: number;
  private scaleHeight: number;
  private surfacePressure: number;
  private temperature: number;
  private gasConstant: number;
  private adiabaticIndex: number;

  // Planet parameters
  private planetRadius: number;

  // Constants
  private readonly STEFAN_BOLTZMANN = 5.670374419e-8;  // W/(m²·K⁴)
  private readonly GAS_CONSTANT_AIR = 287.05;          // J/(kg·K) for Earth air

  constructor(config: AtmosphereConfig & { planetRadius: number }) {
    // Default to Earth-like atmosphere
    this.surfaceDensity = config.surfaceDensity ?? 1.225;
    this.scaleHeight = config.scaleHeight ?? 8500;
    this.surfacePressure = config.surfacePressure ?? 101325;
    this.temperature = config.temperature ?? 288;
    this.gasConstant = config.gasConstant ?? this.GAS_CONSTANT_AIR;
    this.adiabaticIndex = config.adiabaticIndex ?? 1.4;

    this.planetRadius = config.planetRadius;
  }

  /**
   * Calculate atmospheric density at altitude
   * Uses exponential atmosphere model: ρ = ρ₀ * exp(-h/H)
   */
  getDensity(altitude: number): number {
    if (altitude < 0) return this.surfaceDensity;  // Below surface
    if (altitude > this.scaleHeight * 10) return 0;  // Above atmosphere

    return this.surfaceDensity * Math.exp(-altitude / this.scaleHeight);
  }

  /**
   * Calculate atmospheric pressure at altitude
   * P = P₀ * exp(-h/H)
   */
  getPressure(altitude: number): number {
    if (altitude < 0) return this.surfacePressure;
    if (altitude > this.scaleHeight * 10) return 0;

    return this.surfacePressure * Math.exp(-altitude / this.scaleHeight);
  }

  /**
   * Calculate speed of sound at altitude
   * a = √(γ * R * T)
   */
  getSpeedOfSound(altitude: number): number {
    // Simplified: assume constant temperature
    // More realistic: temperature decreases with altitude (lapse rate)
    const temp = this.temperature - 0.0065 * Math.min(altitude, 11000);  // Troposphere lapse
    return Math.sqrt(this.adiabaticIndex * this.gasConstant * temp);
  }

  /**
   * Calculate all atmospheric forces on vehicle
   */
  calculateForces(
    position: Vector3,
    velocity: Vector3,
    planetRadius: number,
    aeroConfig: VehicleAeroConfig
  ): AtmosphericForces {
    // Calculate altitude
    const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
    const altitude = r - planetRadius;

    // Get atmospheric properties
    const density = this.getDensity(altitude);
    const speedOfSound = this.getSpeedOfSound(altitude);

    // Velocity magnitude
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

    // No forces in vacuum
    if (density < 1e-6 || speed < 0.1) {
      return {
        drag: { x: 0, y: 0, z: 0 },
        lift: { x: 0, y: 0, z: 0 },
        heating: 0,
        dynamicPressure: 0,
        density,
        machNumber: 0
      };
    }

    // Velocity direction (unit vector)
    const vHat = {
      x: velocity.x / speed,
      y: velocity.y / speed,
      z: velocity.z / speed
    };

    // Dynamic pressure: q = 0.5 * ρ * v²
    const q = 0.5 * density * speed * speed;

    // Drag force: D = q * Cd * A (opposes velocity)
    const Cd = aeroConfig.dragCoefficient ?? 0.5;
    const area = aeroConfig.referenceArea ?? 10;  // Default 10 m²
    const dragMag = q * Cd * area;

    const drag = {
      x: -dragMag * vHat.x,
      y: -dragMag * vHat.y,
      z: -dragMag * vHat.z
    };

    // Lift force: L = q * Cl * A (perpendicular to velocity, in "up" direction)
    // Simplified: assume lift acts radially outward
    const Cl = aeroConfig.liftCoefficient ?? 0.0;
    const liftMag = q * Cl * area;

    // Radial unit vector (away from planet center)
    const rHat = {
      x: position.x / r,
      y: position.y / r,
      z: position.z / r
    };

    const lift = {
      x: liftMag * rHat.x,
      y: liftMag * rHat.y,
      z: liftMag * rHat.z
    };

    // Aerodynamic heating: Q̇ = k * ρ^0.5 * v^3
    // Sutton-Graves heating equation
    const heatShieldArea = aeroConfig.heatShieldArea ?? area;
    const k = 1.83e-4;  // Heating constant for Earth atmosphere
    const heating = k * Math.sqrt(density) * Math.pow(speed, 3) * heatShieldArea;

    // Mach number
    const machNumber = speed / speedOfSound;

    return {
      drag,
      lift,
      heating,
      dynamicPressure: q,
      density,
      machNumber
    };
  }

  /**
   * Update heat shield temperature
   * Returns new temperature and integrity
   */
  updateHeatShield(
    heatFlux: number,        // W (from calculateForces)
    dt: number,              // seconds
    aeroConfig: VehicleAeroConfig
  ): { temperature: number; integrity: number; cooling: number } {
    const currentTemp = aeroConfig.heatShieldTemperature ?? 300;
    const capacity = aeroConfig.heatShieldCapacity ?? 1e6;  // J/K
    const emissivity = aeroConfig.heatShieldEmissivity ?? 0.8;
    const area = aeroConfig.heatShieldArea ?? 10;
    const maxTemp = aeroConfig.heatShieldMaxTemp ?? 3000;  // K
    const integrity = aeroConfig.heatShieldIntegrity ?? 1.0;

    // Heat input
    const heatIn = heatFlux * dt;

    // Radiative cooling: Q̇_rad = ε * σ * A * T⁴
    const coolingRate = emissivity * this.STEFAN_BOLTZMANN * area * Math.pow(currentTemp, 4);
    const heatOut = coolingRate * dt;

    // Net heat change
    const netHeat = heatIn - heatOut;

    // Temperature change: ΔT = Q / C
    const deltaT = netHeat / capacity;
    const newTemp = Math.max(300, currentTemp + deltaT);  // Min 300K

    // Integrity degradation from overheating
    let newIntegrity = integrity;
    if (newTemp > maxTemp) {
      const overheat = (newTemp - maxTemp) / maxTemp;
      const degradation = overheat * 0.1 * dt;  // 10% per second at 2x max temp
      newIntegrity = Math.max(0, integrity - degradation);
    }

    // Integrity improves slowly when cool
    if (newTemp < maxTemp * 0.8 && newIntegrity < 1.0) {
      newIntegrity = Math.min(1.0, newIntegrity + 0.01 * dt);  // 1% per second recovery
    }

    return {
      temperature: newTemp,
      integrity: newIntegrity,
      cooling: coolingRate
    };
  }

  /**
   * Check if vehicle has entered atmosphere
   */
  isInAtmosphere(altitude: number): boolean {
    return altitude < this.scaleHeight * 10 && this.getDensity(altitude) > 1e-6;
  }

  /**
   * Calculate terminal velocity for current altitude and configuration
   * v_terminal = √(2mg / (ρ * Cd * A))
   */
  calculateTerminalVelocity(altitude: number, mass: number, aeroConfig: VehicleAeroConfig): number {
    const density = this.getDensity(altitude);
    if (density < 1e-6) return Infinity;

    const Cd = aeroConfig.dragCoefficient ?? 0.5;
    const area = aeroConfig.referenceArea ?? 10;
    const g = 1.62;  // m/s² (Moon gravity - should be passed in ideally)

    return Math.sqrt((2 * mass * g) / (density * Cd * area));
  }

  /**
   * Estimate deceleration from drag at current conditions
   * a = F_drag / m = (0.5 * ρ * v² * Cd * A) / m
   */
  estimateDragDeceleration(
    altitude: number,
    velocity: number,
    mass: number,
    aeroConfig: VehicleAeroConfig
  ): number {
    const density = this.getDensity(altitude);
    const Cd = aeroConfig.dragCoefficient ?? 0.5;
    const area = aeroConfig.referenceArea ?? 10;

    return (0.5 * density * velocity * velocity * Cd * area) / mass;
  }

  /**
   * Get atmosphere description for telemetry
   */
  getAtmosphereInfo(altitude: number): {
    density: number;
    pressure: number;
    speedOfSound: number;
    regime: string;
  } {
    const density = this.getDensity(altitude);
    const pressure = this.getPressure(altitude);
    const speedOfSound = this.getSpeedOfSound(altitude);

    // Classify atmospheric regime
    let regime = 'vacuum';
    if (density > 0.1) regime = 'thick';
    else if (density > 0.01) regime = 'thin';
    else if (density > 1e-4) regime = 'upper';
    else if (density > 1e-6) regime = 'exosphere';

    return {
      density,
      pressure,
      speedOfSound,
      regime
    };
  }

  /**
   * Factory: Create Earth-like atmosphere
   */
  static createEarthAtmosphere(planetRadius: number = 6371000): AtmospherePhysics {
    return new AtmospherePhysics({
      planetRadius,
      surfaceDensity: 1.225,      // kg/m³
      scaleHeight: 8500,          // m
      surfacePressure: 101325,    // Pa
      temperature: 288,           // K
      gasConstant: 287.05,        // J/(kg·K)
      adiabaticIndex: 1.4
    });
  }

  /**
   * Factory: Create Mars-like atmosphere
   */
  static createMarsAtmosphere(planetRadius: number = 3389500): AtmospherePhysics {
    return new AtmospherePhysics({
      planetRadius,
      surfaceDensity: 0.020,      // kg/m³ (very thin)
      scaleHeight: 11100,         // m
      surfacePressure: 600,       // Pa (0.6% of Earth)
      temperature: 210,           // K
      gasConstant: 192,           // J/(kg·K) for CO₂
      adiabaticIndex: 1.3
    });
  }

  /**
   * Factory: Create Venus-like atmosphere
   */
  static createVenusAtmosphere(planetRadius: number = 6051800): AtmospherePhysics {
    return new AtmospherePhysics({
      planetRadius,
      surfaceDensity: 65.0,       // kg/m³ (very dense)
      scaleHeight: 15900,         // m
      surfacePressure: 9200000,   // Pa (92 bar!)
      temperature: 737,           // K
      gasConstant: 189,           // J/(kg·K) for CO₂
      adiabaticIndex: 1.3
    });
  }

  /**
   * Factory: Create Titan-like atmosphere
   */
  static createTitanAtmosphere(planetRadius: number = 2575500): AtmospherePhysics {
    return new AtmospherePhysics({
      planetRadius,
      surfaceDensity: 5.3,        // kg/m³ (1.5x Earth pressure but cold)
      scaleHeight: 20000,         // m (thick atmosphere)
      surfacePressure: 146000,    // Pa (1.45 bar)
      temperature: 94,            // K
      gasConstant: 297,           // J/(kg·K) for N₂
      adiabaticIndex: 1.4
    });
  }
}

/**
 * Helper: Calculate angle of attack from velocity and attitude
 * (For future aerodynamic modeling)
 */
export function calculateAngleOfAttack(
  velocity: Vector3,
  forwardDirection: Vector3
): number {
  const vMag = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
  const fMag = Math.sqrt(forwardDirection.x ** 2 + forwardDirection.y ** 2 + forwardDirection.z ** 2);

  if (vMag < 0.1 || fMag < 0.1) return 0;

  // Dot product gives cos(angle)
  const dot = (velocity.x * forwardDirection.x +
               velocity.y * forwardDirection.y +
               velocity.z * forwardDirection.z) / (vMag * fMag);

  return Math.acos(Math.max(-1, Math.min(1, dot)));
}
