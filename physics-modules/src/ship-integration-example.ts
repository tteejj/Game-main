/**
 * Ship Integration Example
 *
 * Demonstrates how to use the unified ship system with all integrated mechanics:
 * - Ship creation and configuration
 * - Weapon systems (railguns, lasers, missiles)
 * - Damage and hull integrity
 * - Ship-to-ship combat
 * - World physics integration
 */

import { World } from './world';
import { CompleteSimulationSystem, UnifiedShipConfig } from './unified-ship-system';
import { WeaponType, Weapon } from './weapons';
import { ShipCombatComputer, CombatScenarios } from './ship-combat';
import { MaterialType } from './hull-damage';

/**
 * Example: Create a complete simulation with two ships in combat
 */
export function createCombatSimulationExample(): CompleteSimulationSystem {
  // Create world
  const world = new World();

  // Create simulation system
  const simulation = new CompleteSimulationSystem(world);

  // Configure Ship 1 - Frigate with railguns and missiles
  const frigateConfig: UnifiedShipConfig = {
    mass: 50000, // 50 tons
    radius: 15,  // 15m radius
    position: { x: 0, y: 0, z: 1000 },
    velocity: { x: 100, y: 0, z: 0 },
    orientation: { w: 1, x: 0, y: 0, z: 0 },
    hullConfig: {
      compartments: [
        {
          id: 'bridge',
          name: 'Bridge',
          volume: 100,
          pressure: 101325,
          atmosphereIntegrity: 1.0,
          structuralIntegrity: 1.0,
          breaches: [],
          systems: ['sensors', 'navigation'],
          connectedCompartments: ['corridor']
        },
        {
          id: 'engineering',
          name: 'Engineering',
          volume: 200,
          pressure: 101325,
          atmosphereIntegrity: 1.0,
          structuralIntegrity: 1.0,
          breaches: [],
          systems: ['reactor', 'life_support'],
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
          id: 'outer_armor',
          material: MaterialType.TITANIUM,
          thickness: 0.05, // 5cm titanium
          hardness: 970,   // Brinell hardness
          density: 4500,   // kg/m³
          integrity: 1.0,
          ablationDepth: 0
        },
        {
          id: 'inner_armor',
          material: MaterialType.STEEL,
          thickness: 0.03, // 3cm steel
          hardness: 500,
          density: 7850,
          integrity: 1.0,
          ablationDepth: 0
        }
      ]
    },
    weapons: [
      {
        id: 'railgun_1',
        type: WeaponType.RAILGUN,
        mountPoint: { x: 5, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 5000000,      // 5 MJ
        projectileSpeed: 3000, // 3 km/s
        projectileMass: 2,     // 2 kg
        range: 50000,          // 50 km
        rateOfFire: 10,        // 10 rounds/min
        powerDraw: 10000,      // 10 MW
        heatGeneration: 2000000,
        ammoCapacity: 100,
        ammoRemaining: 100,
        cooldown: 0,
        compartmentId: 'weapons'
      },
      {
        id: 'missile_1',
        type: WeaponType.MISSILE,
        mountPoint: { x: -5, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 10000000,     // 10 MJ warhead
        projectileMass: 100,  // 100 kg missile
        range: 100000,        // 100 km
        rateOfFire: 1,        // 1 per minute
        powerDraw: 100,
        heatGeneration: 100000,
        ammoCapacity: 20,
        ammoRemaining: 20,
        cooldown: 0,
        compartmentId: 'weapons'
      }
    ]
  };

  // Configure Ship 2 - Corvette with lasers
  const corvetteConfig: UnifiedShipConfig = {
    mass: 30000, // 30 tons
    radius: 12,  // 12m radius
    position: { x: 10000, y: 0, z: 1000 },
    velocity: { x: -50, y: 0, z: 0 },
    orientation: { w: 1, x: 0, y: 0, z: 0 },
    hullConfig: {
      compartments: [
        {
          id: 'main',
          name: 'Main Compartment',
          volume: 250,
          pressure: 101325,
          atmosphereIntegrity: 1.0,
          structuralIntegrity: 1.0,
          breaches: [],
          systems: ['all'],
          connectedCompartments: []
        }
      ],
      armorLayers: [
        {
          id: 'composite_armor',
          material: MaterialType.COMPOSITE,
          thickness: 0.04, // 4cm composite
          hardness: 800,
          density: 2000,
          integrity: 1.0,
          ablationDepth: 0
        }
      ]
    },
    weapons: [
      {
        id: 'laser_1',
        type: WeaponType.LASER,
        mountPoint: { x: 0, y: 5, z: 0 },
        aimDirection: { x: -1, y: 0, z: 0 },
        damage: 1000000,      // 1 MJ per pulse
        range: 30000,         // 30 km
        rateOfFire: 60,       // 60 Hz
        powerDraw: 50000,     // 50 MW
        heatGeneration: 500000,
        cooldown: 0,
        compartmentId: 'main'
      },
      {
        id: 'laser_2',
        type: WeaponType.LASER,
        mountPoint: { x: 0, y: -5, z: 0 },
        aimDirection: { x: -1, y: 0, z: 0 },
        damage: 1000000,
        range: 30000,
        rateOfFire: 60,
        powerDraw: 50000,
        heatGeneration: 500000,
        cooldown: 0,
        compartmentId: 'main'
      }
    ]
  };

  // Add ships to simulation
  const frigate = simulation.addShip(frigateConfig);
  const corvette = simulation.addShip(corvetteConfig);

  console.log('Combat simulation created:');
  console.log(`  Frigate at ${JSON.stringify(frigate.getPosition())}`);
  console.log(`  Corvette at ${JSON.stringify(corvette.getPosition())}`);
  console.log(`  Initial separation: ${Math.round(
    Math.sqrt(
      Math.pow(frigate.getPosition().x - corvette.getPosition().x, 2) +
      Math.pow(frigate.getPosition().y - corvette.getPosition().y, 2) +
      Math.pow(frigate.getPosition().z - corvette.getPosition().z, 2)
    )
  )} meters`);

  return simulation;
}

/**
 * Example: Run combat simulation for N seconds
 */
export function runCombatSimulation(
  simulation: CompleteSimulationSystem,
  duration: number,
  dt: number = 0.1
): void {
  const ships = simulation.getAllShips();

  if (ships.length < 2) {
    console.error('Need at least 2 ships for combat simulation');
    return;
  }

  // Create combat computers
  const combatComputers = ships.map(ship => new ShipCombatComputer(ship));

  let time = 0;
  const reportInterval = 1.0; // Report every second
  let nextReport = reportInterval;

  console.log('\n=== Starting Combat Simulation ===\n');

  while (time < duration) {
    // Update simulation
    simulation.update(dt);

    // Run combat AI for each ship
    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i];
      const computer = combatComputers[i];

      // Get other ships as targets
      const targets = ships.filter(s => s.getId() !== ship.getId());

      // Run simple combat AI
      CombatScenarios.runCombatAI(ship, computer, targets);
    }

    // Report status
    if (time >= nextReport) {
      console.log(`\n--- Time: ${time.toFixed(1)}s ---`);

      for (let i = 0; i < ships.length; i++) {
        const ship = ships[i];
        const integrity = ship.getHullIntegrity();
        const pos = ship.getPosition();
        const vel = ship.getVelocity();

        console.log(`Ship ${i + 1}:`);
        console.log(`  Position: (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`);
        console.log(`  Velocity: (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)}, ${vel.z.toFixed(1)})`);
        console.log(`  Hull Integrity: ${(integrity * 100).toFixed(1)}%`);

        // Show weapons status
        const weapons = ship.getWeapons();
        console.log(`  Weapons: ${weapons.length}`);
        for (const weapon of weapons) {
          const ammo = weapon.ammoRemaining !== undefined
            ? `${weapon.ammoRemaining}/${weapon.ammoCapacity}`
            : 'unlimited';
          const cooldown = weapon.cooldown > 0
            ? `cooling ${weapon.cooldown.toFixed(1)}s`
            : 'ready';
          console.log(`    ${weapon.id}: ${ammo} - ${cooldown}`);
        }
      }

      // Show combat entities
      const combatMgr = simulation.getCombatManager();
      console.log(`  Active Projectiles: ${combatMgr.getAllProjectiles().length}`);
      console.log(`  Active Missiles: ${combatMgr.getAllMissiles().length}`);

      nextReport += reportInterval;
    }

    time += dt;
  }

  console.log('\n=== Combat Simulation Complete ===\n');

  // Final summary
  console.log('Final Status:');
  for (let i = 0; i < ships.length; i++) {
    const ship = ships[i];
    const integrity = ship.getHullIntegrity();
    console.log(`  Ship ${i + 1}: ${(integrity * 100).toFixed(1)}% hull integrity`);

    if (integrity < 0.5) {
      console.log(`    CRITICAL DAMAGE`);
    } else if (integrity < 0.8) {
      console.log(`    Moderate damage`);
    } else {
      console.log(`    Minimal damage`);
    }
  }
}

/**
 * Example: Demonstrate weapon damage on a single ship
 */
export function demonstrateWeaponDamage(): void {
  console.log('\n=== Weapon Damage Demonstration ===\n');

  const world = new World();
  const simulation = new CompleteSimulationSystem(world);

  // Create target ship
  const targetConfig: UnifiedShipConfig = {
    mass: 10000,
    radius: 10,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    hullConfig: {
      compartments: [{
        id: 'hull',
        name: 'Hull',
        volume: 100,
        pressure: 101325,
        atmosphereIntegrity: 1.0,
        structuralIntegrity: 1.0,
        breaches: [],
        systems: [],
        connectedCompartments: []
      }],
      armorLayers: [{
        id: 'armor',
        material: MaterialType.STEEL,
        thickness: 0.02,
        hardness: 500,
        density: 7850,
        integrity: 1.0,
        ablationDepth: 0
      }]
    }
  };

  const target = simulation.addShip(targetConfig);

  console.log(`Initial hull integrity: ${(target.getHullIntegrity() * 100).toFixed(1)}%`);

  // Simulate kinetic impact
  console.log('\nApplying kinetic projectile damage...');
  target.getIntegratedShip().applyProjectileDamage(
    { x: 5, y: 0, z: 0 },
    { x: 2000, y: 0, z: 0 },
    2,
    5000000
  );

  console.log(`Hull integrity after kinetic impact: ${(target.getHullIntegrity() * 100).toFixed(1)}%`);

  // Simulate thermal damage
  console.log('\nApplying laser thermal damage...');
  target.getIntegratedShip().applyThermalDamage(
    { x: -5, y: 0, z: 0 },
    1000000,
    0.1
  );

  console.log(`Hull integrity after laser damage: ${(target.getHullIntegrity() * 100).toFixed(1)}%`);

  // Simulate explosive damage
  console.log('\nApplying explosive damage...');
  target.getIntegratedShip().applyExplosiveDamage(
    { x: 0, y: 5, z: 0 },
    10000000,
    20
  );

  console.log(`Hull integrity after explosive damage: ${(target.getHullIntegrity() * 100).toFixed(1)}%`);

  console.log('\n=== Damage Demonstration Complete ===\n');
}

// Example usage (uncomment to run):
// const sim = createCombatSimulationExample();
// runCombatSimulation(sim, 10.0);
// demonstrateWeaponDamage();
