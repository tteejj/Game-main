/**
 * Complete Ship Example
 *
 * Demonstrates the new CompleteShip class that has ALL functionality:
 * - Physics (gravity, collisions, orbital mechanics)
 * - Subsystems (power, thermal, life support, damage control)
 * - Weapons (railguns, lasers, missiles)
 * - Combat
 */

import { World, CelestialBodyFactory } from './world';
import { CompleteShip, CompleteSimulation, CompleteShipConfig } from './complete-ship';
import { WeaponType } from './weapons';
import { MaterialType } from './hull-damage';
import { PowerSourceType, PowerPriority } from './power-budget';
import { CrewStatus } from './life-support';
import { SystemType, SystemStatus } from './system-damage';

/**
 * Create a frigate with all systems
 */
export function createFrigate(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number }
): CompleteShipConfig {
  return {
    name: 'UNS Dauntless',
    class: 'Frigate',
    mass: 50000,  // 50 tons
    radius: 15,   // 15m radius

    position,
    velocity,
    orientation: { w: 1, x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },

    // Hull: 4 compartments with titanium armor
    compartments: [
      {
        id: 'bridge',
        name: 'Bridge',
        volume: 100,
        pressure: 101325,
        atmosphereIntegrity: 1.0,
        structuralIntegrity: 1.0,
        breaches: [],
        systems: ['nav', 'sensors'],
        connectedCompartments: ['corridor']
      },
      {
        id: 'corridor',
        name: 'Central Corridor',
        volume: 50,
        pressure: 101325,
        atmosphereIntegrity: 1.0,
        structuralIntegrity: 1.0,
        breaches: [],
        systems: [],
        connectedCompartments: ['bridge', 'engineering', 'weapons']
      },
      {
        id: 'engineering',
        name: 'Engineering',
        volume: 200,
        pressure: 101325,
        atmosphereIntegrity: 1.0,
        structuralIntegrity: 1.0,
        breaches: [],
        systems: ['reactor', 'life-support'],
        connectedCompartments: ['corridor']
      },
      {
        id: 'weapons',
        name: 'Weapons Bay',
        volume: 150,
        pressure: 101325,
        atmosphereIntegrity: 1.0,
        structuralIntegrity: 1.0,
        breaches: [],
        systems: ['weapons'],
        connectedCompartments: ['corridor']
      }
    ],

    armorLayers: [
      {
        id: 'outer-titanium',
        material: MaterialType.TITANIUM,
        thickness: 0.05,  // 5cm
        hardness: 970,    // Brinell hardness
        density: 4500,    // kg/m³
        integrity: 1.0,
        ablationDepth: 0
      },
      {
        id: 'inner-steel',
        material: MaterialType.STEEL,
        thickness: 0.03,  // 3cm
        hardness: 500,
        density: 7850,
        integrity: 1.0,
        ablationDepth: 0
      }
    ],

    // Power: Nuclear reactor + batteries
    powerSources: [
      {
        id: 'reactor-1',
        type: PowerSourceType.REACTOR,
        maxOutput: 100,  // 100 kW
        currentOutput: 0,
        efficiency: 0.92,
        powered: true
      }
    ],

    powerConsumers: [
      {
        id: 'life-support',
        name: 'Life Support',
        powerDraw: 5,
        priority: PowerPriority.CRITICAL,
        powered: true,
        actualPower: 0
      },
      {
        id: 'sensors',
        name: 'Sensors',
        powerDraw: 3,
        priority: PowerPriority.HIGH,
        powered: true,
        actualPower: 0
      },
      {
        id: 'weapons',
        name: 'Weapons',
        powerDraw: 15,
        priority: PowerPriority.MEDIUM,
        powered: true,
        actualPower: 0
      },
      {
        id: 'engines',
        name: 'Engines',
        powerDraw: 20,
        priority: PowerPriority.LOW,
        powered: true,
        actualPower: 0
      }
    ],

    batteries: [
      {
        id: 'battery-main',
        capacity: 200,  // 200 kWh
        currentCharge: 160,
        maxChargeRate: 30,
        maxDischargeRate: 50,
        efficiency: 0.95
      }
    ],

    // Thermal: Reactor heat + cooling
    thermalComponents: [
      {
        id: 'reactor-thermal',
        name: 'Reactor Heat',
        temperature: 400,
        mass: 2000,
        specificHeat: 500,
        surfaceArea: 10,
        heatGeneration: 8000,  // 8 kW waste heat
        compartmentId: 'engineering'
      }
    ],

    thermalCompartments: [
      {
        id: 'bridge',
        name: 'Bridge',
        temperature: 293,
        volume: 100,
        airMass: 120,
        connectedCompartments: ['corridor']
      },
      {
        id: 'corridor',
        name: 'Corridor',
        temperature: 293,
        volume: 50,
        airMass: 60,
        connectedCompartments: ['bridge', 'engineering', 'weapons']
      },
      {
        id: 'engineering',
        name: 'Engineering',
        temperature: 293,
        volume: 200,
        airMass: 240,
        connectedCompartments: ['corridor']
      },
      {
        id: 'weapons',
        name: 'Weapons Bay',
        temperature: 293,
        volume: 150,
        airMass: 180,
        connectedCompartments: ['corridor']
      }
    ],

    coolingSystems: [],

    // Ship Systems
    systems: [
      {
        id: 'reactor-sys',
        name: 'Main Reactor',
        type: SystemType.POWER,
        compartmentId: 'engineering',
        integrity: 1.0,
        status: SystemStatus.ONLINE,
        powerDraw: 0,
        operational: true,
        isCritical: true
      },
      {
        id: 'life-support-sys',
        name: 'Life Support',
        type: SystemType.LIFE_SUPPORT,
        compartmentId: 'engineering',
        integrity: 1.0,
        status: SystemStatus.ONLINE,
        powerDraw: 5,
        operational: true,
        isCritical: true,
        dependencies: ['reactor-sys']
      },
      {
        id: 'sensors-sys',
        name: 'Sensor Array',
        type: SystemType.SENSORS,
        compartmentId: 'bridge',
        integrity: 1.0,
        status: SystemStatus.ONLINE,
        powerDraw: 3,
        operational: true,
        isCritical: false
      },
      {
        id: 'weapons-sys',
        name: 'Weapon Control',
        type: SystemType.WEAPONS,
        compartmentId: 'weapons',
        integrity: 1.0,
        status: SystemStatus.ONLINE,
        powerDraw: 15,
        operational: true,
        isCritical: false
      }
    ],

    // Crew
    crew: [
      {
        id: 'captain',
        name: 'Captain Sarah Chen',
        location: 'bridge',
        health: 1.0,
        oxygenLevel: 1.0,
        status: CrewStatus.HEALTHY
      },
      {
        id: 'pilot',
        name: 'Lt. Marcus Webb',
        location: 'bridge',
        health: 1.0,
        oxygenLevel: 1.0,
        status: CrewStatus.HEALTHY
      },
      {
        id: 'engineer',
        name: 'Chief Engineer Priya Patel',
        location: 'engineering',
        health: 1.0,
        oxygenLevel: 1.0,
        status: CrewStatus.HEALTHY
      },
      {
        id: 'weapons',
        name: 'Weapons Officer James Rodriguez',
        location: 'weapons',
        health: 1.0,
        oxygenLevel: 1.0,
        status: CrewStatus.HEALTHY
      }
    ],

    lifeSupport: {
      oxygenGenerationRate: 1.0,  // kg/hr (enough for 4 crew)
      co2ScrubberRate: 1.0,
      powered: true
    },

    // Weapons: Railgun + Missiles
    weapons: [
      {
        id: 'railgun-bow',
        type: WeaponType.RAILGUN,
        mountPoint: { x: 10, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 5000000,       // 5 MJ
        projectileSpeed: 3000, // 3 km/s
        projectileMass: 2,     // 2 kg
        range: 50000,          // 50 km
        rateOfFire: 10,        // 10 rpm
        powerDraw: 12000,      // 12 MW
        heatGeneration: 2000000,
        ammoCapacity: 100,
        ammoRemaining: 100,
        cooldown: 0,
        compartmentId: 'weapons'
      },
      {
        id: 'missile-launcher-1',
        type: WeaponType.MISSILE,
        mountPoint: { x: -8, y: 5, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 15000000,      // 15 MJ warhead
        projectileMass: 150,   // 150 kg missile
        range: 100000,         // 100 km
        rateOfFire: 2,         // 2 per minute
        powerDraw: 200,
        heatGeneration: 100000,
        ammoCapacity: 24,
        ammoRemaining: 24,
        cooldown: 0,
        compartmentId: 'weapons'
      }
    ]
  };
}

/**
 * Example: Two ships in combat
 */
export function runCombatExample(): void {
  console.log('\n=== Complete Ship Combat Example ===\n');

  // Create world with moon
  const world = new World();
  const moon = CelestialBodyFactory.createMoon();
  world.addBody(moon);

  // Create simulation
  const simulation = new CompleteSimulation(world);

  // Add two frigates
  const frigate1Config = createFrigate(
    { x: 0, y: 0, z: moon.radius + 100000 },
    { x: 100, y: 0, z: 0 }
  );
  frigate1Config.name = 'UNS Dauntless';

  const frigate2Config = createFrigate(
    { x: 15000, y: 0, z: moon.radius + 100000 },
    { x: -50, y: 0, z: 0 }
  );
  frigate2Config.name = 'UNS Relentless';

  const ship1 = simulation.addShip(frigate1Config);
  const ship2 = simulation.addShip(frigate2Config);

  console.log(`${ship1.name} created at position:`, ship1.getPosition());
  console.log(`${ship2.name} created at position:`, ship2.getPosition());
  console.log(`Initial separation: ${Math.round(
    Math.sqrt(
      Math.pow(ship1.getPosition().x - ship2.getPosition().x, 2) +
      Math.pow(ship1.getPosition().y - ship2.getPosition().y, 2) +
      Math.pow(ship1.getPosition().z - ship2.getPosition().z, 2)
    )
  )}m\n`);

  // Run simulation for 30 seconds
  const dt = 0.1;
  let time = 0;
  let reportInterval = 5.0;
  let nextReport = reportInterval;

  while (time < 30) {
    // Update simulation
    simulation.update(dt);

    // Ship 1 engages ship 2 (cast to any for compatibility)
    if (time > 2.0 && time < 25.0 && Math.random() < 0.2) {
      ship1.combatComputer.autoEngage(ship2 as any);
    }

    // Ship 2 engages ship 1 (cast to any for compatibility)
    if (time > 3.0 && time < 25.0 && Math.random() < 0.2) {
      ship2.combatComputer.autoEngage(ship1 as any);
    }

    // Status report
    if (time >= nextReport) {
      console.log(`\n--- Time: ${time.toFixed(1)}s ---`);

      const status1 = ship1.getStatus();
      const status2 = ship2.getStatus();

      console.log(`\n${ship1.name}:`);
      console.log(`  Hull: ${(status1.ship.hullIntegrity * 100).toFixed(1)}%`);
      console.log(`  Power: ${status1.power.generation.toFixed(0)}kW gen, ${status1.power.consumption.toFixed(0)}kW use`);
      console.log(`  Battery: ${((status1.power.batteryCharge / status1.power.batteryCapacity) * 100).toFixed(1)}%`);
      console.log(`  Crew: ${status1.lifeSupport.crewHealthy}/${status1.lifeSupport.crewTotal} healthy`);
      console.log(`  Weapons:`);
      for (const w of status1.weapons.weapons) {
        console.log(`    ${w.id}: ${w.ammo} - ${w.cooldown > 0 ? `cooling ${w.cooldown.toFixed(1)}s` : 'ready'}`);
      }

      console.log(`\n${ship2.name}:`);
      console.log(`  Hull: ${(status2.ship.hullIntegrity * 100).toFixed(1)}%`);
      console.log(`  Power: ${status2.power.generation.toFixed(0)}kW gen, ${status2.power.consumption.toFixed(0)}kW use`);
      console.log(`  Battery: ${((status2.power.batteryCharge / status2.power.batteryCapacity) * 100).toFixed(1)}%`);
      console.log(`  Crew: ${status2.lifeSupport.crewHealthy}/${status2.lifeSupport.crewTotal} healthy`);

      console.log(`\n  Projectiles in flight: ${simulation.getAllProjectiles().length}`);
      console.log(`  Missiles in flight: ${simulation.getAllMissiles().length}`);

      nextReport += reportInterval;
    }

    time += dt;
  }

  console.log('\n=== Combat Simulation Complete ===\n');

  // Final status
  const finalStatus1 = ship1.getStatus();
  const finalStatus2 = ship2.getStatus();

  console.log('Final Status:');
  console.log(`  ${ship1.name}: ${(finalStatus1.ship.hullIntegrity * 100).toFixed(1)}% hull integrity`);
  console.log(`  ${ship2.name}: ${(finalStatus2.ship.hullIntegrity * 100).toFixed(1)}% hull integrity`);
}

// Uncomment to run:
// runCombatExample();
