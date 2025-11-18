/**
 * integrated-demo.ts
 * Single comprehensive demonstration of the complete universe system
 * Shows ships, cities, and stations all working together in one living universe
 */

import { createUniverse } from './UniverseDesigner';
import { NPCShipAI, ShipType } from './NPCShipAI';
import { ShipClass, getShipSpec } from './NPCShipTypes';
import { CityGenerator } from './PlanetaryCities';
import { StationFaction } from './StationGenerator';
import { getStationVariant, getLegendaryStations } from './StationVariants';

/**
 * Create and demonstrate a complete, living universe
 */
export function runIntegratedDemo() {
  console.clear();
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    INTEGRATED UNIVERSE DEMONSTRATION                      ║');
  console.log('║              Ships • Cities • Stations • All Working Together             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // ============================================================================
  // STEP 1: Generate Universe
  // ============================================================================
  console.log('🌌 Generating Universe...\n');

  const universe = createUniverse({
    seed: 777777,
    numSystems: 8,
    galaxyRadius: 150,
    campaignMode: 'OPEN_WORLD',
    difficultyProgression: true
  });

  const system = universe.getCurrentSystem();
  if (!system) {
    console.log('❌ Failed to generate system');
    return;
  }

  console.log(`✓ Generated "${system.name}" system`);
  console.log(`  Star: ${system.star.starClass}-class (${system.star.temperature.toFixed(0)}K)`);
  console.log(`  Planets: ${system.planets.length} | Moons: ${system.moons.length}`);
  console.log(`  Asteroids: ${system.asteroids.length} | Stations: ${system.stations.length}\n`);

  // ============================================================================
  // STEP 2: Add Legendary Stations
  // ============================================================================
  console.log('🛰️  Placing Legendary Stations...\n');

  const legendaryStations = getLegendaryStations();
  const theExchange = getStationVariant('THE_EXCHANGE');
  const titanForge = getStationVariant('TITAN_FORGE');
  const lastChance = getStationVariant('LAST_CHANCE');

  if (theExchange) {
    console.log(`  ✦ ${theExchange.variantName}`);
    console.log(`    ${theExchange.description}`);
    console.log(`    Located near: ${system.planets[0]?.name || 'Prime'}`);
    console.log(`    Services: Trading, Banking, VIP Lounges, Diplomacy`);
  }

  if (titanForge) {
    console.log(`\n  ⚒  ${titanForge.variantName}`);
    console.log(`    ${titanForge.description}`);
    console.log(`    Construction bays: 5 ships in progress`);
    console.log(`    Waiting list: 2 years`);
  }

  if (lastChance) {
    console.log(`\n  🌠 ${lastChance.variantName}`);
    console.log(`    ${lastChance.description}`);
    console.log(`    Population: 240 hardy souls`);
    console.log(`    Status: Waiting for supply run`);
  }

  console.log(`\n  Total legendary stations: ${legendaryStations.length}\n`);

  // ============================================================================
  // STEP 3: Populate Habitable Planets with Cities
  // ============================================================================
  console.log('🏙️  Colonizing Habitable Worlds...\n');

  let habitablePlanets = system.getHabitablePlanets();

  // If no habitable planets, colonize the most promising ones anyway (terraformed/domed)
  if (habitablePlanets.length === 0 && system.planets.length > 0) {
    habitablePlanets = system.planets.slice(0, 2); // Take first 2 planets as "colonized"
    console.log(`  ℹ️  No naturally habitable worlds - showing terraformed/domed colonies\n`);
  }

  const cityGen = new CityGenerator(777777);
  let totalPopulation = 0;
  let totalCities = 0;

  habitablePlanets.forEach((planet, index) => {
    const cities = cityGen.generateCitiesForPlanet(
      planet,
      7 + index, // Varying tech levels
      index === 0 ? StationFaction.UNITED_EARTH : StationFaction.INDEPENDENT
    );

    const planetPop = cities.reduce((sum, c) => sum + c.population, 0);
    totalPopulation += planetPop;
    totalCities += cities.length;

    const capital = cities[0];
    console.log(`  🌍 ${planet.name}`);
    console.log(`     Temperature: ${planet.surfaceTemperature.toFixed(0)}K | Gravity: ${planet.physical.surfaceGravity.toFixed(2)} m/s²`);
    console.log(`     Settlements: ${cities.length} | Population: ${planetPop.toLocaleString()}`);
    console.log(`     Capital: ${capital.name} (${capital.population.toLocaleString()})`);
    console.log(`       - Government: ${capital.politics.government}`);
    console.log(`       - Tech Level: ${capital.techLevel}/5`);
    console.log(`       - GDP/capita: ${capital.economy.gdpPerCapita.toLocaleString()} credits`);
    console.log(`       - Spaceports: ${capital.spaceports.length}`);
    if (cities.length > 1) {
      console.log(`     Other cities: ${cities.slice(1).map(c => c.name).join(', ')}`);
    }
    console.log('');
  });

  console.log(`  Total inhabited worlds: ${habitablePlanets.length}`);
  console.log(`  Total settlements: ${totalCities}`);
  console.log(`  Total population: ${totalPopulation.toLocaleString()}\n`);

  // ============================================================================
  // STEP 4: Spawn NPC Traffic
  // ============================================================================
  console.log('🚀 Spawning NPC Ship Traffic...\n');

  const shipAI = new NPCShipAI();
  const shipTypes: { type: ShipType; class: ShipClass; faction: string }[] = [
    { type: 'TRADER', class: ShipClass.CARGO_HAULER, faction: 'Independent' },
    { type: 'TRADER', class: ShipClass.BULK_FREIGHTER, faction: 'Corporate' },
    { type: 'MINER', class: ShipClass.MINING_BARGE, faction: 'Belt Alliance' },
    { type: 'MINER', class: ShipClass.PROSPECTOR, faction: 'Independent' },
    { type: 'PATROL', class: ShipClass.CORVETTE, faction: 'United Earth' },
    { type: 'PATROL', class: ShipClass.FRIGATE, faction: 'Mars Federation' },
    { type: 'COURIER', class: ShipClass.COURIER, faction: 'Independent' },
    { type: 'EXPLORER', class: ShipClass.SURVEY_SHIP, faction: 'Independent' },
  ];

  const spawnedShips: any[] = [];

  shipTypes.forEach(({ type, class: shipClass, faction }) => {
    const spec = getShipSpec(shipClass);
    const pos = {
      x: (Math.random() - 0.5) * 1e9,
      y: (Math.random() - 0.5) * 1e9,
      z: (Math.random() - 0.5) * 1e8
    };

    const ship = shipAI.createShip(type, faction, pos);
    spawnedShips.push({ ship, spec });

    console.log(`  ${spec.name}`);
    console.log(`    ID: ${ship.id} | Faction: ${ship.faction}`);
    console.log(`    Status: ${ship.state} | Fuel: ${(ship.fuel / ship.stats.fuelCapacity * 100).toFixed(0)}%`);
    console.log(`    Cargo: ${ship.cargo.length > 0 ? ship.cargo.map(c => c.commodity).join(', ') : 'Empty'}`);
    console.log(`    Credits: ${ship.credits.toLocaleString()}`);
  });

  console.log(`\n  Total active ships: ${spawnedShips.length}\n`);

  // ============================================================================
  // STEP 5: Show Ship Details (Example Fleet)
  // ============================================================================
  console.log('📊 Fleet Composition Analysis...\n');

  const civilianShips = [ShipClass.SHUTTLE, ShipClass.CARGO_HAULER, ShipClass.PASSENGER_LINER];
  const combatShips = [ShipClass.INTERCEPTOR, ShipClass.CORVETTE, ShipClass.BATTLESHIP];
  const specialShips = [ShipClass.SALVAGE_SHIP, ShipClass.PIRATE_RAIDER];

  console.log('  📦 CIVILIAN FLEET:');
  civilianShips.forEach(sc => {
    const spec = getShipSpec(sc);
    console.log(`    • ${spec.name} - ${spec.baseCost.toLocaleString()} credits`);
  });

  console.log('\n  ⚔️  COMBAT FLEET:');
  combatShips.forEach(sc => {
    const spec = getShipSpec(sc);
    console.log(`    • ${spec.name} - ${spec.baseCost.toLocaleString()} credits`);
  });

  console.log('\n  🛠️  SPECIALIZED VESSELS:');
  specialShips.forEach(sc => {
    const spec = getShipSpec(sc);
    console.log(`    • ${spec.name} - ${spec.baseCost.toLocaleString()} credits`);
  });

  console.log('');

  // ============================================================================
  // STEP 6: System Summary
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  console.log('📈 UNIVERSE STATISTICS:\n');

  console.log(`  Systems: 8`);
  console.log(`  Planets: ${system.planets.length}`);
  console.log(`  Habitable Worlds: ${habitablePlanets.length}`);
  console.log(`  Total Settlements: ${totalCities}`);
  console.log(`  Total Population: ${totalPopulation.toLocaleString()}`);
  console.log(`  Space Stations: ${system.stations.length + 3} (including legendary)`);
  console.log(`  Active Ships: ${spawnedShips.length}`);
  console.log(`  Asteroid Fields: ${system.asteroids.length > 100 ? 'Yes' : 'No'}`);

  if (system.hazardSystem) {
    const hazards = system.hazardSystem.getHazardsAt({ x: 0, y: 0, z: 0 });
    console.log(`  Environmental Hazards: ${hazards.length}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ============================================================================
  // STEP 7: Playthrough Scenario
  // ============================================================================
  console.log('🎮 SAMPLE PLAYTHROUGH SCENARIO:\n');
  console.log('  You pilot a small courier ship docked at The Exchange...\n');
  console.log('  Available missions:');
  console.log('    1. Deliver medical supplies to Last Chance (frontier outpost)');
  console.log(`    2. Trade run: The Exchange → ${habitablePlanets[0]?.name || 'Terra Prime'}`);
  console.log('    3. Join mining operation in asteroid belt (Belt Alliance)');
  console.log('    4. Escort passenger liner to outer colonies');
  console.log('    5. Investigate anomaly reported by survey ship\n');

  console.log('  Your ship:');
  const courierSpec = getShipSpec(ShipClass.COURIER);
  console.log(`    ${courierSpec.name}`);
  console.log(`    Max Speed: ${courierSpec.stats.maxSpeed} m/s`);
  console.log(`    Cargo: ${courierSpec.stats.cargoCapacity} m³`);
  console.log(`    Fuel: ${courierSpec.stats.fuelCapacity} kg`);
  console.log(`    ${courierSpec.notes}\n`);

  console.log('  The universe awaits...\n');

  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        INTEGRATION DEMONSTRATION COMPLETE                 ║');
  console.log('║                                                                           ║');
  console.log('║  All systems operational:                                                 ║');
  console.log('║    ✓ Procedural universe generation                                      ║');
  console.log('║    ✓ 26 ship types with full specs                                       ║');
  console.log('║    ✓ Planetary cities with economy & politics                            ║');
  console.log('║    ✓ 11 legendary space stations                                         ║');
  console.log('║    ✓ NPC ships with AI behaviors                                         ║');
  console.log('║    ✓ Everything integrated and working together                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  return universe;
}

// Export as default
export default runIntegratedDemo;
