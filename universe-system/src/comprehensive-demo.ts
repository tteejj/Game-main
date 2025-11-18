/**
 * comprehensive-demo.ts
 * Complete demonstration of the integrated universe system with ships, cities, and stations
 */

import { createUniverse } from './UniverseDesigner';
import { generateStarSystem } from './StarSystem';
import { StarClass, PlanetClass } from './CelestialBody';
import { NPCShipAI, ShipType } from './NPCShipAI';
import { ShipClass, getShipSpec, SHIP_SPECS } from './NPCShipTypes';
import { CityGenerator, SettlementType, FAMOUS_CITIES } from './PlanetaryCities';
import { StationFaction } from './StationGenerator';
import { getStationVariant, STATION_VARIANTS, getLegendaryStations } from './StationVariants';

/**
 * Demo 1: Complete Universe with Everything
 */
export function demoCompleteUniverse() {
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 1: COMPLETE UNIVERSE GENERATION');
  console.log('='.repeat(80) + '\n');

  // Create a medium-sized universe
  const universe = createUniverse({
    seed: 42,
    numSystems: 10,
    galaxyRadius: 100,
    campaignMode: 'OPEN_WORLD',
    difficultyProgression: true
  });

  const currentSystem = universe.getCurrentSystem();
  if (!currentSystem) {
    console.log('No current system available');
    return universe;
  }
  console.log(`Starting system: ${currentSystem.name}`);
  console.log(`Star type: ${currentSystem.star.starClass}-class (${currentSystem.star.temperature}K)`);
  console.log(`Planets: ${currentSystem.planets.length}`);
  console.log(`Moons: ${currentSystem.moons.length}`);
  console.log(`Stations: ${currentSystem.stations.length}`);
  console.log(`Asteroids: ${currentSystem.asteroids.length}`);

  // Show planets
  console.log('\n--- Planets ---');
  currentSystem.planets.forEach(planet => {
    console.log(`  ${planet.name}:`);
    console.log(`    Class: ${planet.planetClass}`);
    console.log(`    Mass: ${(planet.physical.mass / 5.972e24).toFixed(2)} Earth masses`);
    console.log(`    Radius: ${(planet.physical.radius / 6371000).toFixed(2)} Earth radii`);
    console.log(`    Temperature: ${planet.surfaceTemperature.toFixed(0)}K`);
    console.log(`    Habitable: ${planet.isHabitable ? 'YES ✓' : 'No'}`);
    if (planet.children.length > 0) {
      console.log(`    Moons: ${planet.children.length}`);
    }
  });

  // Show stations
  console.log('\n--- Space Stations ---');
  currentSystem.stations.forEach(station => {
    console.log(`  ${station.name}:`);
    console.log(`    Type: ${station.stationType}`);
    console.log(`    Faction: ${station.faction}`);
    console.log(`    Population: ${station.population.toLocaleString()}`);
    console.log(`    Services: ${Object.entries(station.services).filter(([k,v]) => v).map(([k]) => k).join(', ')}`);
    console.log(`    Docking ports: ${station.dockingPorts.length}`);
  });

  return universe;
}

/**
 * Demo 2: Detailed Planetary Cities
 */
export function demoPlanetaryCities() {
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 2: PLANETARY CITIES AND SETTLEMENTS');
  console.log('='.repeat(80) + '\n');

  // Create a civilized star system
  const system = generateStarSystem('New Terra', {
    seed: 777,
    starClass: StarClass.G,
    numPlanets: { min: 6, max: 8 },
    allowStations: true,
    civilizationLevel: 8 // High civilization
  });

  // Find habitable planets
  const habitablePlanets = system.getHabitablePlanets();
  console.log(`Found ${habitablePlanets.length} habitable planets\n`);

  const cityGen = new CityGenerator(777);

  habitablePlanets.forEach(planet => {
    console.log(`\n--- ${planet.name} ---`);
    console.log(`Class: ${planet.planetClass}, Temp: ${planet.surfaceTemperature.toFixed(0)}K`);

    // Generate cities for this planet
    const cities = cityGen.generateCitiesForPlanet(
      planet,
      8, // High civilization level
      StationFaction.UNITED_EARTH
    );

    console.log(`\nCities: ${cities.length}`);
    cities.forEach(city => {
      console.log(`\n  ${city.name} (${city.type})`);
      console.log(`    Population: ${city.population.toLocaleString()}`);
      console.log(`    Tech Level: ${city.techLevel}/5`);
      console.log(`    Environment: ${city.environment}`);
      console.log(`    GDP/capita: ${city.economy.gdpPerCapita.toLocaleString()} credits`);
      console.log(`    Wealth: ${(city.economy.wealthLevel * 100).toFixed(0)}%`);
      console.log(`    Crime Rate: ${(city.economy.crimeRate * 100).toFixed(0)}%`);
      console.log(`    Defense Rating: ${city.defense.defenseRating}/10`);
      console.log(`    Government: ${city.politics.government}`);

      if (city.spaceports.length > 0) {
        console.log(`    Spaceports: ${city.spaceports.length}`);
        city.spaceports.forEach(sp => {
          console.log(`      - ${sp.name}`);
        });
      }

      if (city.landmarks.length > 0) {
        console.log(`    Landmarks: ${city.landmarks.slice(0, 3).map(l => l.name).join(', ')}${city.landmarks.length > 3 ? '...' : ''}`);
      }

      if (city.districts.length > 0) {
        console.log(`    Districts: ${city.districts.length}`);
        city.districts.slice(0, 3).forEach(d => {
          console.log(`      - ${d.name} (${d.type}): ${d.population.toLocaleString()} people`);
        });
      }
    });
  });

  // Show famous cities
  console.log('\n\n--- FAMOUS CITIES ---');
  Object.entries(FAMOUS_CITIES).forEach(([location, city]) => {
    console.log(`\n${location.toUpperCase()}: ${city.name}`);
    console.log(`  ${city.description}`);
    console.log(`  Population: ${city.population.toLocaleString()}`);
  });
}

/**
 * Demo 3: NPC Ship Fleet Showcase
 */
export function demoNPCShipFleet() {
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 3: NPC SHIP TYPES AND FLEET');
  console.log('='.repeat(80) + '\n');

  const shipAI = new NPCShipAI();

  // Create a diverse fleet
  const startPos = { x: 0, y: 0, z: 0 };

  console.log('--- CIVILIAN FLEET ---\n');

  // Civilian ships
  const shuttle = shipAI.createShip('TRADER', 'Independent', startPos);
  const spec = getShipSpec(ShipClass.SHUTTLE);
  console.log(`${spec.name}`);
  console.log(`  Role: ${spec.role}`);
  console.log(`  Length: ${spec.length}m, Mass: ${spec.mass}kg`);
  console.log(`  Crew: ${spec.crew.min}-${spec.crew.max} (optimal: ${spec.crew.optimal})`);
  console.log(`  Cost: ${spec.baseCost.toLocaleString()} credits`);
  console.log(`  Operating cost: ${spec.operatingCost}/day`);
  console.log(`  Max speed: ${spec.stats.maxSpeed} m/s`);
  console.log(`  Cargo: ${spec.stats.cargoCapacity} m³`);
  console.log(`  Manufacturer: ${spec.manufacturer}`);
  console.log(`  ${spec.notes}`);

  const specs = [
    ShipClass.CARGO_HAULER,
    ShipClass.PASSENGER_LINER,
    ShipClass.MINING_BARGE,
    ShipClass.SCIENCE_VESSEL
  ];

  specs.forEach(shipClass => {
    const s = getShipSpec(shipClass);
    console.log(`\n${s.name}`);
    console.log(`  ${s.description}`);
    console.log(`  Price: ${s.baseCost.toLocaleString()} credits | Length: ${s.length}m | Crew: ${s.crew.optimal}`);
  });

  console.log('\n\n--- MILITARY FLEET ---\n');

  const combatSpecs = [
    ShipClass.INTERCEPTOR,
    ShipClass.FIGHTER,
    ShipClass.CORVETTE,
    ShipClass.FRIGATE,
    ShipClass.DESTROYER,
    ShipClass.CRUISER,
    ShipClass.BATTLESHIP,
    ShipClass.CARRIER
  ];

  combatSpecs.forEach(shipClass => {
    const s = getShipSpec(shipClass);
    console.log(`${s.name}`);
    console.log(`  ${s.description}`);
    console.log(`  Length: ${s.length}m | Crew: ${s.crew.optimal} | Weapons: ${s.stats.weaponPower}`);
    console.log(`  Price: ${s.baseCost.toLocaleString()} credits | Speed: ${s.stats.maxSpeed} m/s`);
    console.log(`  ${s.notes}`);
    console.log('');
  });

  console.log('\n--- SPECIALIZED VESSELS ---\n');

  const specialSpecs = [
    ShipClass.COURIER,
    ShipClass.SALVAGE_SHIP,
    ShipClass.PIRATE_RAIDER,
    ShipClass.SMUGGLER,
    ShipClass.SURVEY_SHIP
  ];

  specialSpecs.forEach(shipClass => {
    const s = getShipSpec(shipClass);
    console.log(`${s.name}: ${s.description}`);
  });

  // Show total fleet value
  const totalValue = Object.values(SHIP_SPECS).reduce((sum, spec) => sum + spec.baseCost, 0);
  console.log(`\n\nTotal catalog value: ${totalValue.toLocaleString()} credits`);
  console.log(`Ship types available: ${Object.keys(SHIP_SPECS).length}`);
}

/**
 * Demo 4: Legendary Space Stations
 */
export function demoLegendaryStations() {
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 4: LEGENDARY SPACE STATIONS');
  console.log('='.repeat(80) + '\n');

  const legendary = getLegendaryStations();

  legendary.forEach(station => {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`${station.variantName.toUpperCase()}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`Type: ${station.baseType}`);
    console.log(`\n${station.description}\n`);

    console.log(`Architecture:`);
    console.log(`  ${station.visualDesign.architecture}`);
    console.log(`  Size: ${station.visualDesign.size}`);

    console.log(`\nUnique Features:`);
    station.uniqueFeatures.forEach(feature => {
      console.log(`  • ${feature}`);
    });

    console.log(`\nHistory:`);
    console.log(`  ${station.history}`);

    console.log(`\nCurrent Status:`);
    console.log(`  ${station.lore.currentStatus}`);

    if (station.lore.notableResident) {
      console.log(`\nNotable Resident:`);
      console.log(`  ${station.lore.notableResident}`);
    }

    console.log(`\nDefense Rating: ${station.defenseModifiers.rating}/10`);
    if (station.defenseModifiers.specialDefenses) {
      console.log(`Special Defenses:`);
      station.defenseModifiers.specialDefenses.forEach(def => {
        console.log(`  • ${def}`);
      });
    }

    if (station.uniqueServices) {
      console.log(`\nUnique Services:`);
      station.uniqueServices.forEach(service => {
        console.log(`  • ${service}`);
      });
    }

    if (station.economicModifiers.specialGoods) {
      console.log(`\nSpecial Goods Available:`);
      station.economicModifiers.specialGoods.forEach(good => {
        console.log(`  • ${good}`);
      });
    }
  });

  console.log(`\n\nTotal legendary stations: ${legendary.length}`);
}

/**
 * Demo 5: Full System Showcase
 */
export function demoFullSystemShowcase() {
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 5: COMPLETE SYSTEM INTEGRATION');
  console.log('='.repeat(80) + '\n');

  // Generate a rich, fully-populated system
  const system = generateStarSystem('Nexus Prime', {
    seed: 12345,
    starClass: StarClass.G,
    numPlanets: { min: 8, max: 12 },
    allowAsteroidBelt: true,
    allowStations: true,
    allowHazards: true,
    civilizationLevel: 9 // Very high tech
  });

  console.log(`System: ${system.name}`);
  console.log(`Star: ${system.star.name} (${system.star.starClass}-class)`);
  console.log(`Luminosity: ${system.star.luminosity.toExponential(2)} watts`);
  console.log(`\nCelestial Bodies: ${system.planets.length + system.moons.length + system.asteroids.length}`);
  console.log(`  Planets: ${system.planets.length}`);
  console.log(`  Moons: ${system.moons.length}`);
  console.log(`  Asteroids: ${system.asteroids.length}`);
  console.log(`  Stations: ${system.stations.length}`);

  // Add legendary stations to the system
  console.log('\n--- LEGENDARY STATIONS IN SYSTEM ---');
  const exchange = getStationVariant('THE_EXCHANGE');
  if (exchange) {
    console.log(`\n✦ ${exchange.variantName}`);
    console.log(`  ${exchange.description}`);
    console.log(`  Defense: ${exchange.defenseModifiers.rating}/10`);
  }

  // Generate cities for habitable worlds
  const habitablePlanets = system.getHabitablePlanets();
  if (habitablePlanets.length > 0) {
    console.log(`\n--- HABITABLE WORLDS (${habitablePlanets.length}) ---`);

    const cityGen = new CityGenerator(12345);

    habitablePlanets.forEach(planet => {
      console.log(`\n${planet.name}:`);
      console.log(`  Temperature: ${planet.surfaceTemperature.toFixed(0)}K`);
      console.log(`  Gravity: ${planet.physical.surfaceGravity.toFixed(2)} m/s²`);

      const cities = cityGen.generateCitiesForPlanet(
        planet,
        9,
        StationFaction.UNITED_EARTH
      );

      console.log(`  Settlements: ${cities.length}`);
      const totalPop = cities.reduce((sum, c) => sum + c.population, 0);
      console.log(`  Total population: ${totalPop.toLocaleString()}`);

      cities.forEach(city => {
        console.log(`    • ${city.name} - ${city.population.toLocaleString()} (${city.type})`);
      });
    });
  }

  // Spawn NPC ships
  console.log('\n--- NPC TRAFFIC ---');
  const shipAI = new NPCShipAI();
  const shipTypes: ShipType[] = ['TRADER', 'MINER', 'PATROL', 'COURIER', 'EXPLORER'];

  console.log(`Spawning ${shipTypes.length} NPC ships...`);
  shipTypes.forEach((type, i) => {
    const pos = {
      x: Math.random() * 1e9,
      y: Math.random() * 1e9,
      z: Math.random() * 1e9
    };
    const ship = shipAI.createShip(type, 'Independent', pos);
    console.log(`  ${ship.name} (${ship.type}) - ${ship.state}`);
  });

  // Show hazards
  if (system.hazardSystem) {
    const hazards = system.hazardSystem.getAllHazards();
    console.log(`\n--- ENVIRONMENTAL HAZARDS (${hazards.length}) ---`);
    hazards.forEach(hazard => {
      console.log(`  ⚠ ${hazard.name} (${hazard.type}) - Severity ${hazard.severity}/5`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('SYSTEM INTEGRATION COMPLETE');
  console.log('='.repeat(80));
}

/**
 * Run all demos
 */
export function runAllDemos() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + 'UNIVERSE SYSTEM - COMPLETE DEMONSTRATION' + ' '.repeat(22) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  demoCompleteUniverse();
  demoPlanetaryCities();
  demoNPCShipFleet();
  demoLegendaryStations();
  demoFullSystemShowcase();

  console.log('\n\n' + '═'.repeat(80));
  console.log('ALL DEMOS COMPLETE');
  console.log('═'.repeat(80) + '\n');
}

// Export main demo function
export default runAllDemos;
