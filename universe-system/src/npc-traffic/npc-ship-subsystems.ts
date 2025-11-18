/**
 * npc-ship-subsystems.ts
 * Realistic subsystems for NPC ships modeled after player ship
 *
 * Provides:
 * - Electrical power management (reactor, batteries, solar)
 * - Thermal management (heat generation and cooling)
 * - Fuel systems (RCS and main propulsion)
 * - Life support (oxygen, CO2, pressure)
 * - Weapons systems (ammo, cooldowns, targeting)
 * - Hull integrity and damage model
 * - System health and failures
 */

import { ShipType } from './npc-ship';

/**
 * Electrical system state
 */
export interface NPCElectricalSystem {
  reactor: {
    online: boolean;
    output: number; // watts
    maxOutput: number;
    temperature: number; // kelvin
    fuelRemaining: number; // 0-1
    scrammed: boolean;
  };
  battery: {
    charge: number; // joules
    capacity: number;
    chargeRate: number; // watts
    dischargeRate: number; // watts
  };
  solarPanels?: {
    deployed: boolean;
    output: number; // watts
    maxOutput: number;
    efficiency: number; // 0-1
  };
  totalPowerDraw: number; // watts
  netPower: number; // watts (positive = charging, negative = discharging)
}

/**
 * Thermal system state
 */
export interface NPCThermalSystem {
  hullTemperature: number; // kelvin
  reactorTemperature: number; // kelvin
  weaponsTemperature: number; // kelvin
  heatGeneration: number; // watts
  heatDissipation: number; // watts
  radiatorEfficiency: number; // 0-1
  criticalOverheat: boolean;
}

/**
 * Fuel system state
 */
export interface NPCFuelSystem {
  mainFuel: {
    current: number; // kg
    capacity: number;
    consumptionRate: number; // kg/s
  };
  rcsFuel: {
    current: number; // kg
    capacity: number;
    consumptionRate: number; // kg/s
  };
  totalMass: number; // kg
}

/**
 * Life support system state
 */
export interface NPCLifeSupport {
  crewCapacity: number;
  crewCount: number;
  oxygenLevel: number; // 0-1
  co2Level: number; // 0-1
  pressure: number; // kPa
  temperature: number; // kelvin
  lifeSupportOnline: boolean;
  breached: boolean;
}

/**
 * Weapons system state
 */
export interface NPCWeaponsSystem {
  armed: boolean;
  safetyOn: boolean;
  weapons: {
    type: 'railgun' | 'missile' | 'laser' | 'plasma';
    ammo: number;
    maxAmmo: number;
    cooldown: number; // seconds
    damage: number;
    range: number; // meters
    energyPerShot: number; // joules
  }[];
  targetLocked: boolean;
  targetId: string | null;
}

/**
 * Hull and damage state
 */
export interface NPCHullSystem {
  integrity: number; // 0-1
  armor: number; // 0-1
  compartments: {
    name: string;
    integrity: number; // 0-1
    breached: boolean;
    onFire: boolean;
  }[];
  totalDamage: number; // accumulated damage
}

/**
 * System health tracking
 */
export interface SystemHealth {
  electrical: number; // 0-1
  thermal: number; // 0-1
  propulsion: number; // 0-1
  lifeSupport: number; // 0-1
  weapons: number; // 0-1
  hull: number; // 0-1
  overall: number; // 0-1 (average)
}

/**
 * Complete NPC ship subsystems
 */
export class NPCShipSubsystems {
  public electrical: NPCElectricalSystem;
  public thermal: NPCThermalSystem;
  public fuel: NPCFuelSystem;
  public lifeSupport: NPCLifeSupport | null; // null for unmanned ships
  public weapons: NPCWeaponsSystem | null; // null for non-combat ships
  public hull: NPCHullSystem;
  public health: SystemHealth;

  // Ship configuration
  private shipType: ShipType;
  private mass: number; // kg

  constructor(shipType: ShipType, mass: number = 50000) {
    this.shipType = shipType;
    this.mass = mass;

    // Initialize subsystems based on ship type
    this.electrical = this.createElectricalSystem(shipType);
    this.thermal = this.createThermalSystem(shipType);
    this.fuel = this.createFuelSystem(shipType);
    this.lifeSupport = this.createLifeSupport(shipType);
    this.weapons = this.createWeaponsSystem(shipType);
    this.hull = this.createHullSystem(shipType);
    this.health = this.calculateSystemHealth();
  }

  /**
   * Create electrical system configuration for ship type
   */
  private createElectricalSystem(shipType: ShipType): NPCElectricalSystem {
    const configs: Record<ShipType, Partial<NPCElectricalSystem>> = {
      [ShipType.CARGO_FREIGHTER]: {
        reactor: {
          online: true,
          output: 500000,
          maxOutput: 500000,
          temperature: 400,
          fuelRemaining: 1.0,
          scrammed: false
        },
        battery: {
          charge: 10e6,
          capacity: 10e6,
          chargeRate: 100000,
          dischargeRate: 200000
        }
      },
      [ShipType.CARGO_SHUTTLE]: {
        reactor: {
          online: true,
          output: 200000,
          maxOutput: 200000,
          temperature: 380,
          fuelRemaining: 1.0,
          scrammed: false
        },
        battery: {
          charge: 5e6,
          capacity: 5e6,
          chargeRate: 50000,
          dischargeRate: 100000
        }
      },
      [ShipType.PATROL_SHIP]: {
        reactor: {
          online: true,
          output: 800000,
          maxOutput: 800000,
          temperature: 420,
          fuelRemaining: 1.0,
          scrammed: false
        },
        battery: {
          charge: 15e6,
          capacity: 15e6,
          chargeRate: 150000,
          dischargeRate: 300000
        }
      },
      [ShipType.MINING_VESSEL]: {
        reactor: {
          online: true,
          output: 600000,
          maxOutput: 600000,
          temperature: 410,
          fuelRemaining: 1.0,
          scrammed: false
        },
        battery: {
          charge: 12e6,
          capacity: 12e6,
          chargeRate: 120000,
          dischargeRate: 240000
        }
      },
      [ShipType.PASSENGER_LINER]: {
        reactor: {
          online: true,
          output: 700000,
          maxOutput: 700000,
          temperature: 400,
          fuelRemaining: 1.0,
          scrammed: false
        },
        battery: {
          charge: 20e6,
          capacity: 20e6,
          chargeRate: 150000,
          dischargeRate: 300000
        }
      },
      [ShipType.PIRATE]: {
        reactor: {
          online: true,
          output: 600000,
          maxOutput: 600000,
          temperature: 450,
          fuelRemaining: 0.8,
          scrammed: false
        },
        battery: {
          charge: 8e6,
          capacity: 10e6,
          chargeRate: 80000,
          dischargeRate: 250000
        }
      },
      [ShipType.RESEARCH]: {
        reactor: {
          online: true,
          output: 400000,
          maxOutput: 400000,
          temperature: 390,
          fuelRemaining: 1.0,
          scrammed: false
        },
        battery: {
          charge: 18e6,
          capacity: 18e6,
          chargeRate: 120000,
          dischargeRate: 180000
        },
        solarPanels: {
          deployed: true,
          output: 50000,
          maxOutput: 50000,
          efficiency: 0.9
        }
      },
      [ShipType.SALVAGE]: {
        reactor: {
          online: true,
          output: 450000,
          maxOutput: 450000,
          temperature: 400,
          fuelRemaining: 1.0,
          scrammed: false
        },
        battery: {
          charge: 10e6,
          capacity: 10e6,
          chargeRate: 90000,
          dischargeRate: 180000
        }
      }
    };

    const config = configs[shipType];
    return {
      reactor: config.reactor!,
      battery: config.battery!,
      solarPanels: config.solarPanels,
      totalPowerDraw: 0,
      netPower: 0
    };
  }

  /**
   * Create thermal system configuration
   */
  private createThermalSystem(shipType: ShipType): NPCThermalSystem {
    return {
      hullTemperature: 300, // ~room temp
      reactorTemperature: 400,
      weaponsTemperature: 300,
      heatGeneration: 0,
      heatDissipation: 10000, // 10kW base dissipation
      radiatorEfficiency: 0.8,
      criticalOverheat: false
    };
  }

  /**
   * Create fuel system configuration
   */
  private createFuelSystem(shipType: ShipType): NPCFuelSystem {
    const configs: Record<ShipType, { mainCap: number; rcsCap: number }> = {
      [ShipType.CARGO_FREIGHTER]: { mainCap: 50000, rcsCap: 5000 },
      [ShipType.CARGO_SHUTTLE]: { mainCap: 10000, rcsCap: 1000 },
      [ShipType.PATROL_SHIP]: { mainCap: 20000, rcsCap: 3000 },
      [ShipType.MINING_VESSEL]: { mainCap: 30000, rcsCap: 4000 },
      [ShipType.PASSENGER_LINER]: { mainCap: 40000, rcsCap: 4000 },
      [ShipType.PIRATE]: { mainCap: 15000, rcsCap: 2000 },
      [ShipType.RESEARCH]: { mainCap: 25000, rcsCap: 3000 },
      [ShipType.SALVAGE]: { mainCap: 20000, rcsCap: 2500 }
    };

    const config = configs[shipType];
    return {
      mainFuel: {
        current: config.mainCap,
        capacity: config.mainCap,
        consumptionRate: 0
      },
      rcsFuel: {
        current: config.rcsCap,
        capacity: config.rcsCap,
        consumptionRate: 0
      },
      totalMass: config.mainCap + config.rcsCap
    };
  }

  /**
   * Create life support system (only for crewed ships)
   */
  private createLifeSupport(shipType: ShipType): NPCLifeSupport | null {
    // Unmanned ships
    if ([ShipType.SALVAGE].includes(shipType)) {
      return null;
    }

    const crewSizes: Record<ShipType, number> = {
      [ShipType.CARGO_FREIGHTER]: 8,
      [ShipType.CARGO_SHUTTLE]: 2,
      [ShipType.PATROL_SHIP]: 4,
      [ShipType.MINING_VESSEL]: 6,
      [ShipType.PASSENGER_LINER]: 30,
      [ShipType.PIRATE]: 5,
      [ShipType.RESEARCH]: 12,
      [ShipType.SALVAGE]: 0
    };

    return {
      crewCapacity: crewSizes[shipType] || 4,
      crewCount: crewSizes[shipType] || 4,
      oxygenLevel: 1.0,
      co2Level: 0.1,
      pressure: 101.3, // standard atmosphere
      temperature: 293, // 20°C
      lifeSupportOnline: true,
      breached: false
    };
  }

  /**
   * Create weapons system (only for combat-capable ships)
   */
  private createWeaponsSystem(shipType: ShipType): NPCWeaponsSystem | null {
    // Non-combat ships
    if ([ShipType.CARGO_FREIGHTER, ShipType.CARGO_SHUTTLE, ShipType.PASSENGER_LINER, ShipType.RESEARCH].includes(shipType)) {
      return null;
    }

    const weaponConfigs: Record<string, any> = {
      [ShipType.PATROL_SHIP]: {
        weapons: [
          {
            type: 'railgun' as const,
            ammo: 500,
            maxAmmo: 500,
            cooldown: 0,
            damage: 100,
            range: 50000,
            energyPerShot: 100000
          },
          {
            type: 'missile' as const,
            ammo: 20,
            maxAmmo: 20,
            cooldown: 0,
            damage: 500,
            range: 100000,
            energyPerShot: 50000
          }
        ]
      },
      [ShipType.PIRATE]: {
        weapons: [
          {
            type: 'plasma' as const,
            ammo: 300,
            maxAmmo: 300,
            cooldown: 0,
            damage: 150,
            range: 30000,
            energyPerShot: 150000
          }
        ]
      },
      [ShipType.MINING_VESSEL]: {
        weapons: [
          {
            type: 'laser' as const,
            ammo: 1000,
            maxAmmo: 1000,
            cooldown: 0,
            damage: 50,
            range: 20000,
            energyPerShot: 50000
          }
        ]
      },
      [ShipType.SALVAGE]: {
        weapons: [
          {
            type: 'laser' as const,
            ammo: 500,
            maxAmmo: 500,
            cooldown: 0,
            damage: 30,
            range: 15000,
            energyPerShot: 40000
          }
        ]
      }
    };

    const config = weaponConfigs[shipType];
    if (!config) return null;

    return {
      armed: false,
      safetyOn: true,
      weapons: config.weapons,
      targetLocked: false,
      targetId: null
    };
  }

  /**
   * Create hull system configuration
   */
  private createHullSystem(shipType: ShipType): NPCHullSystem {
    const compartmentConfigs: Record<ShipType, string[]> = {
      [ShipType.CARGO_FREIGHTER]: ['Bridge', 'Cargo Bay', 'Engineering', 'Life Support'],
      [ShipType.CARGO_SHUTTLE]: ['Cockpit', 'Cargo', 'Engine'],
      [ShipType.PATROL_SHIP]: ['Bridge', 'Weapons Bay', 'Engineering', 'Crew Quarters'],
      [ShipType.MINING_VESSEL]: ['Bridge', 'Mining Bay', 'Processing', 'Engineering'],
      [ShipType.PASSENGER_LINER]: ['Bridge', 'Passenger Deck A', 'Passenger Deck B', 'Engineering'],
      [ShipType.PIRATE]: ['Bridge', 'Weapons', 'Loot Bay'],
      [ShipType.RESEARCH]: ['Bridge', 'Laboratory', 'Data Center', 'Engineering'],
      [ShipType.SALVAGE]: ['Control', 'Salvage Bay', 'Processing']
    };

    const compartments = (compartmentConfigs[shipType] || ['Main']).map(name => ({
      name,
      integrity: 1.0,
      breached: false,
      onFire: false
    }));

    return {
      integrity: 1.0,
      armor: 1.0,
      compartments,
      totalDamage: 0
    };
  }

  /**
   * Update all subsystems
   */
  public update(dt: number, thrustLevel: number, weaponsFiring: boolean): void {
    this.updateElectrical(dt, thrustLevel, weaponsFiring);
    this.updateThermal(dt, thrustLevel, weaponsFiring);
    this.updateFuel(dt, thrustLevel);
    this.updateLifeSupport(dt);
    this.updateWeapons(dt, weaponsFiring);
    this.health = this.calculateSystemHealth();
  }

  /**
   * Update electrical system
   */
  private updateElectrical(dt: number, thrustLevel: number, weaponsFiring: boolean): void {
    const elec = this.electrical;

    // Calculate power draw
    let powerDraw = 50000; // Base systems: 50kW

    // Propulsion power
    powerDraw += thrustLevel * 100000; // Up to 100kW for propulsion

    // Life support
    if (this.lifeSupport?.lifeSupportOnline) {
      powerDraw += this.lifeSupport.crewCount * 500; // 500W per crew member
    }

    // Weapons
    if (weaponsFiring && this.weapons) {
      const weaponPower = this.weapons.weapons.reduce((sum, w) => sum + (w.cooldown > 0 ? 0 : w.energyPerShot / 2), 0);
      powerDraw += weaponPower / dt; // Average power for weapons
    }

    elec.totalPowerDraw = powerDraw;

    // Calculate power generation
    let powerGeneration = 0;

    // Reactor
    if (elec.reactor.online && !elec.reactor.scrammed) {
      powerGeneration += elec.reactor.output;
      // Consume reactor fuel
      elec.reactor.fuelRemaining -= (dt * 0.0001); // 0.01% per second
      elec.reactor.fuelRemaining = Math.max(0, elec.reactor.fuelRemaining);

      if (elec.reactor.fuelRemaining <= 0) {
        elec.reactor.online = false;
      }
    }

    // Solar panels
    if (elec.solarPanels?.deployed) {
      powerGeneration += elec.solarPanels.output * elec.solarPanels.efficiency;
    }

    // Net power
    elec.netPower = powerGeneration - powerDraw;

    // Update battery
    if (elec.netPower > 0) {
      // Charging
      const chargeAmount = Math.min(elec.netPower, elec.battery.chargeRate) * dt;
      elec.battery.charge += chargeAmount;
      elec.battery.charge = Math.min(elec.battery.charge, elec.battery.capacity);
    } else {
      // Discharging
      const dischargeAmount = Math.min(Math.abs(elec.netPower), elec.battery.dischargeRate) * dt;
      elec.battery.charge -= dischargeAmount;
      elec.battery.charge = Math.max(0, elec.battery.charge);
    }

    // Emergency power management
    if (elec.battery.charge < elec.battery.capacity * 0.1) {
      // Critical battery - disable non-essential systems
      if (this.weapons) {
        this.weapons.armed = false;
      }
    }

    if (elec.battery.charge <= 0 && !elec.reactor.online) {
      // Total power failure - critical systems only
      if (this.lifeSupport) {
        this.lifeSupport.lifeSupportOnline = false;
      }
    }
  }

  /**
   * Update thermal system
   */
  private updateThermal(dt: number, thrustLevel: number, weaponsFiring: boolean): void {
    const thermal = this.thermal;

    // Heat generation
    let heatGen = 0;

    // Reactor heat
    if (this.electrical.reactor.online) {
      heatGen += this.electrical.reactor.output * 0.3; // 30% waste heat
    }

    // Propulsion heat
    heatGen += thrustLevel * 50000; // 50kW at full thrust

    // Weapons heat
    if (weaponsFiring && this.weapons) {
      heatGen += 100000; // 100kW when firing weapons
      thermal.weaponsTemperature += dt * 50; // Weapons heat up quickly
    } else {
      thermal.weaponsTemperature -= dt * 10; // Cool down slowly
    }

    thermal.heatGeneration = heatGen;

    // Heat dissipation (radiators + hull)
    const heatDiff = thermal.hullTemperature - 300; // Difference from ambient space
    thermal.heatDissipation = thermal.radiatorEfficiency * 10000 + Math.abs(heatDiff) * 100;

    // Update temperatures
    const netHeat = thermal.heatGeneration - thermal.heatDissipation;
    const tempChange = (netHeat / (this.mass * 900)) * dt; // Specific heat of aluminum ~900 J/kg·K

    thermal.hullTemperature += tempChange * 0.3; // Hull heats up slower
    thermal.reactorTemperature += tempChange;

    // Clamp temperatures
    thermal.hullTemperature = Math.max(100, Math.min(1000, thermal.hullTemperature));
    thermal.reactorTemperature = Math.max(300, Math.min(1200, thermal.reactorTemperature));
    thermal.weaponsTemperature = Math.max(300, Math.min(800, thermal.weaponsTemperature));

    // Check for critical overheat
    thermal.criticalOverheat = thermal.reactorTemperature > 900 || thermal.hullTemperature > 600;

    // Emergency reactor scram on overheat
    if (thermal.reactorTemperature > 1000) {
      this.electrical.reactor.scrammed = true;
      this.electrical.reactor.online = false;
    }
  }

  /**
   * Update fuel system
   */
  private updateFuel(dt: number, thrustLevel: number): void {
    const fuel = this.fuel;

    // Main fuel consumption (proportional to thrust)
    const mainConsumption = thrustLevel * 2.0 * dt; // 2 kg/s at full thrust
    fuel.mainFuel.current -= mainConsumption;
    fuel.mainFuel.current = Math.max(0, fuel.mainFuel.current);
    fuel.mainFuel.consumptionRate = mainConsumption / dt;

    // RCS fuel consumption (for maneuvering)
    const rcsConsumption = thrustLevel * 0.1 * dt; // 0.1 kg/s at full thrust
    fuel.rcsFuel.current -= rcsConsumption;
    fuel.rcsFuel.current = Math.max(0, fuel.rcsFuel.current);
    fuel.rcsFuel.consumptionRate = rcsConsumption / dt;

    // Update total mass
    fuel.totalMass = fuel.mainFuel.current + fuel.rcsFuel.current;
  }

  /**
   * Update life support system
   */
  private updateLifeSupport(dt: number): void {
    if (!this.lifeSupport) return;

    const ls = this.lifeSupport;

    if (!ls.lifeSupportOnline || ls.breached) {
      // Life support failing
      ls.oxygenLevel -= dt * 0.01; // 1% per second
      ls.co2Level += dt * 0.02; // 2% per second
      ls.pressure -= dt * 5; // 5 kPa per second if breached
    } else {
      // Life support active
      ls.oxygenLevel += dt * 0.05; // Slowly replenish
      ls.co2Level -= dt * 0.03; // Remove CO2
      ls.pressure = 101.3; // Maintain pressure
    }

    // Clamp values
    ls.oxygenLevel = Math.max(0, Math.min(1, ls.oxygenLevel));
    ls.co2Level = Math.max(0, Math.min(1, ls.co2Level));
    ls.pressure = Math.max(0, Math.min(101.3, ls.pressure));

    // Thermal regulation
    if (ls.lifeSupportOnline) {
      ls.temperature = 293 + (this.thermal.hullTemperature - 300) * 0.3;
    } else {
      ls.temperature = this.thermal.hullTemperature;
    }
  }

  /**
   * Update weapons system
   */
  private updateWeapons(dt: number, firing: boolean): void {
    if (!this.weapons) return;

    const weapons = this.weapons;

    // Update cooldowns
    for (const weapon of weapons.weapons) {
      if (weapon.cooldown > 0) {
        weapon.cooldown -= dt;
        weapon.cooldown = Math.max(0, weapon.cooldown);
      }

      // Fire weapon
      if (firing && !weapons.safetyOn && weapons.armed && weapon.cooldown <= 0 && weapon.ammo > 0) {
        weapon.ammo--;
        weapon.cooldown = weapon.type === 'missile' ? 5.0 : weapon.type === 'railgun' ? 1.0 : 0.5;
      }
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(): SystemHealth {
    const electrical = this.electrical.battery.charge / this.electrical.battery.capacity;
    const thermal = Math.max(0, 1 - (this.thermal.reactorTemperature - 400) / 600);
    const propulsion = (this.fuel.mainFuel.current / this.fuel.mainFuel.capacity) * 0.7 +
                        (this.fuel.rcsFuel.current / this.fuel.rcsFuel.capacity) * 0.3;
    const lifeSupport = this.lifeSupport ?
      (this.lifeSupport.oxygenLevel * 0.4 + (1 - this.lifeSupport.co2Level) * 0.3 + (this.lifeSupport.pressure / 101.3) * 0.3) : 1.0;
    const weapons = this.weapons ?
      (this.weapons.weapons.reduce((sum, w) => sum + (w.ammo / w.maxAmmo), 0) / this.weapons.weapons.length) : 1.0;
    const hull = this.hull.integrity;

    const overall = (electrical + thermal + propulsion + lifeSupport + weapons + hull) / 6;

    return {
      electrical,
      thermal,
      propulsion,
      lifeSupport,
      weapons,
      hull,
      overall
    };
  }

  /**
   * Apply damage to ship
   */
  public applyDamage(amount: number, location?: string): void {
    // Armor absorbs some damage
    const effectiveDamage = amount * (1 - this.hull.armor * 0.5);

    // Apply to hull
    this.hull.integrity -= effectiveDamage * 0.01; // Scale damage
    this.hull.integrity = Math.max(0, this.hull.integrity);
    this.hull.totalDamage += effectiveDamage;

    // Damage specific compartment if specified
    if (location) {
      const compartment = this.hull.compartments.find(c => c.name === location);
      if (compartment) {
        compartment.integrity -= effectiveDamage * 0.02;
        compartment.integrity = Math.max(0, compartment.integrity);

        // Chance of breach or fire
        if (compartment.integrity < 0.3 && Math.random() < 0.3) {
          compartment.breached = true;
          if (this.lifeSupport) {
            this.lifeSupport.breached = true;
          }
        }

        if (effectiveDamage > 500 && Math.random() < 0.2) {
          compartment.onFire = true;
        }
      }
    } else {
      // Random compartment damage
      const randomCompartment = this.hull.compartments[Math.floor(Math.random() * this.hull.compartments.length)];
      randomCompartment.integrity -= effectiveDamage * 0.015;
      randomCompartment.integrity = Math.max(0, randomCompartment.integrity);
    }

    // System failures from damage
    if (this.hull.integrity < 0.5 && Math.random() < 0.1) {
      // Random system failure
      const systems = ['reactor', 'lifeSupport', 'weapons'];
      const failedSystem = systems[Math.floor(Math.random() * systems.length)];

      if (failedSystem === 'reactor') {
        this.electrical.reactor.scrammed = true;
        this.electrical.reactor.online = false;
      } else if (failedSystem === 'lifeSupport' && this.lifeSupport) {
        this.lifeSupport.lifeSupportOnline = false;
      } else if (failedSystem === 'weapons' && this.weapons) {
        this.weapons.armed = false;
        this.weapons.safetyOn = true;
      }
    }
  }

  /**
   * Check if ship is critically damaged
   */
  public isCriticallyDamaged(): boolean {
    return this.hull.integrity < 0.2 ||
           this.health.overall < 0.3 ||
           (this.lifeSupport && this.lifeSupport.oxygenLevel < 0.2);
  }

  /**
   * Check if ship is destroyed
   */
  public isDestroyed(): boolean {
    return this.hull.integrity <= 0;
  }

  /**
   * Emergency power shutdown
   */
  public emergencyShutdown(): void {
    if (this.weapons) {
      this.weapons.armed = false;
      this.weapons.safetyOn = true;
    }
    this.electrical.reactor.output = this.electrical.reactor.maxOutput * 0.3; // Reduce to 30%
  }

  /**
   * Get diagnostic string for debugging
   */
  public getDiagnostics(): string {
    return `
SHIP SUBSYSTEMS DIAGNOSTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━
ELECTRICAL:
  Reactor: ${this.electrical.reactor.online ? 'ONLINE' : 'OFFLINE'} (${(this.electrical.reactor.output/1000).toFixed(0)}kW)
  Battery: ${((this.electrical.battery.charge/this.electrical.battery.capacity)*100).toFixed(0)}%
  Net Power: ${(this.electrical.netPower/1000).toFixed(1)}kW

THERMAL:
  Hull: ${this.thermal.hullTemperature.toFixed(0)}K
  Reactor: ${this.thermal.reactorTemperature.toFixed(0)}K
  ${this.thermal.criticalOverheat ? '⚠ OVERHEAT WARNING' : ''}

FUEL:
  Main: ${((this.fuel.mainFuel.current/this.fuel.mainFuel.capacity)*100).toFixed(0)}%
  RCS: ${((this.fuel.rcsFuel.current/this.fuel.rcsFuel.capacity)*100).toFixed(0)}%

${this.lifeSupport ? `LIFE SUPPORT:
  O₂: ${(this.lifeSupport.oxygenLevel*100).toFixed(0)}%
  Pressure: ${this.lifeSupport.pressure.toFixed(1)} kPa
  Crew: ${this.lifeSupport.crewCount}/${this.lifeSupport.crewCapacity}
` : ''}
HULL:
  Integrity: ${(this.hull.integrity*100).toFixed(0)}%
  Armor: ${(this.hull.armor*100).toFixed(0)}%

OVERALL HEALTH: ${(this.health.overall*100).toFixed(0)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}
