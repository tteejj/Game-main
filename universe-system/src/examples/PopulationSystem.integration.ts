/**
 * PopulationSystem Integration Example
 * Demonstrates how to use the fixed PopulationSystem with actual City instances
 */

import { PopulationSystem, SkillCategory, AgeGroup } from '../PopulationSystem';
import { PlanetaryCity, SettlementType, CityTechLevel, CityEnvironment, StationFaction } from '../PlanetaryCities';
import { CityPopulationSync, createCityPopulationSync, syncAllCities } from '../CityPopulationSync';
import { HistoricalEvent } from '../simulation/HistoricalMemorySystem';

/**
 * Example: Setting up the population system with actual cities
 */
export function setupPopulationSystem() {
  // Create some example cities
  const cities: PlanetaryCity[] = [
    new PlanetaryCity(
      'mars-01',
      'Olympus City',
      SettlementType.CAPITAL_CITY,
      'mars',
      StationFaction.UNITED_EARTH,
      5000000, // 5 million population
      CityTechLevel.ADVANCED,
      CityEnvironment.DOME,
      { latitude: 18.0, longitude: 226.0 }
    ),
    new PlanetaryCity(
      'mars-02',
      'Hellas Mining Colony',
      SettlementType.MINING_COLONY,
      'mars',
      StationFaction.CORPORATE,
      500000, // 500k population
      CityTechLevel.MODERN,
      CityEnvironment.UNDERGROUND,
      { latitude: -42.0, longitude: 70.0 }
    ),
    new PlanetaryCity(
      'mars-03',
      'Port Armstrong',
      SettlementType.SPACEPORT,
      'mars',
      StationFaction.INDEPENDENT,
      1200000, // 1.2 million
      CityTechLevel.HIGH_TECH,
      CityEnvironment.DOME,
      { latitude: 10.0, longitude: 180.0 }
    )
  ];

  // Create population system
  const popSystem = new PopulationSystem();

  // Set up event callback to receive population events
  popSystem.setEventCallback((event: HistoricalEvent) => {
    console.log(`[POPULATION EVENT] ${event.type}: ${event.description}`);
    console.log(`  Severity: ${event.severity}, Category: ${event.category}`);
    if (event.data) {
      console.log(`  Data:`, event.data);
    }
  });

  // Create sync helper and link cities
  const sync = createCityPopulationSync(popSystem, cities);

  // Initialize population for each city
  for (const city of cities) {
    popSystem.initializeCityPopulation(city);
    console.log(`Initialized population for ${city.name}: ${city.population.toLocaleString()}`);
  }

  return { popSystem, sync, cities };
}

/**
 * Example: Running the simulation and seeing actual city changes
 */
export function runSimulationExample() {
  console.log('\n=== POPULATION SYSTEM INTEGRATION TEST ===\n');

  const { popSystem, sync, cities } = setupPopulationSystem();

  // Simulate 30 days
  const SECONDS_PER_DAY = 86400;
  const SIMULATION_DAYS = 30;

  console.log('\n--- Initial City States ---');
  for (const city of cities) {
    printCityStats(city, popSystem);
  }

  // Run simulation
  console.log(`\n--- Simulating ${SIMULATION_DAYS} days ---\n`);

  for (let day = 1; day <= SIMULATION_DAYS; day++) {
    // Update population system (this modifies actual city objects!)
    popSystem.update(SECONDS_PER_DAY, cities);

    // Sync population data to city properties
    syncAllCities(sync, cities, SECONDS_PER_DAY);

    // Print updates every 10 days
    if (day % 10 === 0) {
      console.log(`\n--- Day ${day} ---`);
      for (const city of cities) {
        printCityStats(city, popSystem);
      }
    }
  }

  console.log('\n--- Final City States ---');
  for (const city of cities) {
    printCityStats(city, popSystem);
  }

  // Show migration summary
  console.log('\n--- Migration Summary ---');
  const migrations = popSystem.getRecentMigrations();
  console.log(`Total migrations in last 30 days: ${migrations.length}`);
  for (const migration of migrations.slice(-5)) {
    console.log(`  ${migration.count} people: ${migration.fromCityId} → ${migration.toCityId} (${migration.reason})`);
  }

  // Show unrest summary
  console.log('\n--- Unrest Summary ---');
  const unrest = popSystem.getActiveUnrest();
  for (const [cityId, events] of unrest) {
    const city = cities.find(c => c.id === cityId);
    console.log(`  ${city?.name || cityId}:`);
    for (const event of events) {
      console.log(`    - ${event.type} (severity: ${event.severity.toFixed(2)}, ${event.participants} participants)`);
      console.log(`      Demands: ${event.demands.join(', ')}`);
    }
  }
}

/**
 * Example: Demonstrating economic integration
 */
export function economicIntegrationExample() {
  console.log('\n=== ECONOMIC INTEGRATION EXAMPLE ===\n');

  const { popSystem, sync, cities } = setupPopulationSystem();

  // Create an economic crisis in one city
  const crisisCity = cities[1]; // Mining colony
  console.log(`\nCreating economic crisis in ${crisisCity.name}...`);

  // Simulate bad economic conditions
  crisisCity.economy.unemployment = 0.35; // 35% unemployment
  crisisCity.economy.wealthLevel = 0.20; // Low wealth
  crisisCity.infrastructure.foodProduction = 0.4; // Food shortage

  // Run simulation for 60 days
  const SECONDS_PER_DAY = 86400;
  for (let day = 1; day <= 60; day++) {
    popSystem.update(SECONDS_PER_DAY, cities);
    syncAllCities(sync, cities, SECONDS_PER_DAY);

    if (day % 15 === 0) {
      console.log(`\n--- Day ${day} ---`);
      printCityStats(crisisCity, popSystem);

      // Show consumption vs capacity
      const consumption = sync.calculateCommodityConsumption(crisisCity);
      console.log(`  Food consumption: ${consumption.food.toFixed(0)} tons/day`);
      console.log(`  Water consumption: ${consumption.water.toLocaleString()} liters/day`);
      console.log(`  Power consumption: ${consumption.power.toFixed(1)} MW`);

      // Show production capacity
      const capacity = sync.getProductionCapacity(crisisCity);
      console.log(`  Manufacturing capacity: ${capacity.manufacturing.toFixed(0)} units`);
      console.log(`  Service capacity: ${capacity.services.toFixed(0)} units`);
    }
  }

  // Show what happened
  console.log('\n--- Crisis Impact Summary ---');
  const stats = popSystem.getCityStatistics(crisisCity.id);
  console.log(`Final population: ${stats.totalPopulation.toLocaleString()} (change: ${((stats.totalPopulation - 500000) / 500000 * 100).toFixed(1)}%)`);
  console.log(`Happiness: ${(stats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`Migration: ${stats.recentMigration.outgoing} left, ${stats.recentMigration.incoming} arrived`);
  console.log(`Active unrest events: ${stats.activeUnrest.length}`);

  // Show impact on other cities
  console.log('\n--- Impact on Other Cities ---');
  for (const city of cities) {
    if (city.id === crisisCity.id) continue;
    const cityStats = popSystem.getCityStatistics(city.id);
    if (cityStats.recentMigration.incoming > 0) {
      console.log(`${city.name}: Received ${cityStats.recentMigration.incoming} migrants from crisis`);
    }
  }
}

/**
 * Example: Workforce and skill distribution
 */
export function workforceExample() {
  console.log('\n=== WORKFORCE INTEGRATION EXAMPLE ===\n');

  const { popSystem, sync, cities } = setupPopulationSystem();

  for (const city of cities) {
    console.log(`\n${city.name} (Tech Level ${city.techLevel}):`);

    const workforce = sync.getWorkforceBreakdown(city.id);
    console.log(`  Total workforce: ${workforce.total.toLocaleString()}`);
    console.log(`  Employed: ${workforce.employed.toLocaleString()} (${((1 - city.economy.unemployment) * 100).toFixed(1)}%)`);
    console.log(`  Unemployed: ${workforce.unemployed.toLocaleString()}`);

    console.log(`  Skill breakdown:`);
    for (const [skill, data] of workforce.bySkill) {
      const skillPct = (data.total / workforce.total * 100).toFixed(1);
      const employedPct = (data.employed / data.total * 100).toFixed(1);
      console.log(`    ${skill}: ${data.total.toLocaleString()} workers (${skillPct}%) - ${employedPct}% employed`);
    }

    // Show economic impact
    const impact = sync.calculateEconomicImpact(city);
    console.log(`  Economic contribution:`);
    console.log(`    Labor: ${(impact.laborContribution / 1e9).toFixed(2)}B credits/year`);
    console.log(`    Consumption: ${(impact.consumptionContribution / 1e9).toFixed(2)}B credits/year`);
    console.log(`    Total GDP: ${(impact.totalGDP / 1e9).toFixed(2)}B credits`);
  }
}

/**
 * Helper function to print city statistics
 */
function printCityStats(city: PlanetaryCity, popSystem: PopulationSystem): void {
  const stats = popSystem.getCityStatistics(city.id);
  const labor = popSystem.getLaborMarket(city.id);

  console.log(`\n${city.name}:`);
  console.log(`  Population: ${city.population.toLocaleString()} (actual city object updated!)`);
  console.log(`  Happiness: ${(stats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`  Health: ${(stats.averageHealth * 100).toFixed(1)}%`);
  console.log(`  Unemployment: ${(city.economy.unemployment * 100).toFixed(1)}% (actual city object updated!)`);
  console.log(`  GDP per capita: ${city.economy.gdpPerCapita.toLocaleString()} credits`);

  if (labor) {
    console.log(`  Average wage: ${labor.averageWage.toLocaleString()} credits/month`);
  }

  if (stats.activeUnrest.length > 0) {
    console.log(`  ⚠ Active unrest: ${stats.activeUnrest[0].type}`);
  }

  const netMigration = stats.recentMigration.incoming - stats.recentMigration.outgoing;
  if (netMigration !== 0) {
    console.log(`  Migration: ${netMigration > 0 ? '+' : ''}${netMigration.toLocaleString()}`);
  }
}

/**
 * Example: District integration
 */
export function districtIntegrationExample() {
  console.log('\n=== DISTRICT INTEGRATION EXAMPLE ===\n');

  const { popSystem, sync, cities } = setupPopulationSystem();

  // Add districts to capital city
  const capital = cities[0];
  capital.districts = [
    {
      id: `${capital.id}-dist-1`,
      name: 'Financial District',
      type: 'Financial',
      population: 0,
      description: 'Banking and corporate headquarters',
      crimeRate: 0,
      wealthLevel: 0,
      landmarks: []
    },
    {
      id: `${capital.id}-dist-2`,
      name: 'Residential Zone',
      type: 'Residential',
      population: 0,
      description: 'Housing for middle class',
      crimeRate: 0,
      wealthLevel: 0,
      landmarks: []
    },
    {
      id: `${capital.id}-dist-3`,
      name: 'Industrial Sector',
      type: 'Industrial',
      population: 0,
      description: 'Manufacturing and production',
      crimeRate: 0,
      wealthLevel: 0,
      landmarks: []
    },
    {
      id: `${capital.id}-dist-4`,
      name: 'Lower City',
      type: 'Slums',
      population: 0,
      description: 'Poor residential area',
      crimeRate: 0,
      wealthLevel: 0,
      landmarks: []
    }
  ];

  // Sync to distribute population to districts
  sync.syncCity(capital);

  console.log(`${capital.name} Districts:\n`);
  for (const district of capital.districts) {
    console.log(`${district.name}:`);
    console.log(`  Type: ${district.type}`);
    console.log(`  Population: ${district.population.toLocaleString()}`);
    console.log(`  Wealth Level: ${(district.wealthLevel * 100).toFixed(1)}%`);
    console.log(`  Crime Rate: ${(district.crimeRate * 100).toFixed(1)}%`);
    console.log();
  }
}

/**
 * Run all examples
 */
export function runAllExamples(): void {
  runSimulationExample();
  economicIntegrationExample();
  workforceExample();
  districtIntegrationExample();

  console.log('\n=== ALL EXAMPLES COMPLETED ===\n');
}

// Uncomment to run when executed directly
// runAllExamples();
