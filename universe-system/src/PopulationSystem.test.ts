/**
 * PopulationSystem.test.ts
 * Test cases demonstrating population dynamics
 */

import { PopulationSystem, SkillCategory, AgeGroup, UnrestType, MigrationReason } from './PopulationSystem';
import { PlanetaryCity, SettlementType, CityTechLevel, CityEnvironment } from './PlanetaryCities';
import { StationFaction } from './StationGenerator';

/**
 * Helper function to create a test city
 */
function createTestCity(
  id: string,
  name: string,
  population: number,
  techLevel: CityTechLevel,
  wealthLevel: number,
  unemployment: number,
  crimeRate: number,
  stability: number,
  corruption: number
): PlanetaryCity {
  const city = new PlanetaryCity(
    id,
    name,
    SettlementType.CITY,
    'test-planet',
    StationFaction.INDEPENDENT,
    population,
    techLevel,
    CityEnvironment.EARTHLIKE,
    { latitude: 0, longitude: 0 }
  );

  // Override economy values for testing
  city.economy.wealthLevel = wealthLevel;
  city.economy.unemployment = unemployment;
  city.economy.crimeRate = crimeRate;

  // Override politics
  city.politics.stability = stability;
  city.politics.corruption = corruption;

  return city;
}

/**
 * Test 1: Population Growth When Happy
 *
 * Demonstrates that a prosperous city with happy citizens experiences population growth
 */
export function testPopulationGrowthWhenHappy(): void {
  console.log('\n=== TEST 1: Population Growth When Happy ===\n');

  const popSystem = new PopulationSystem();

  // Create a prosperous city with good conditions
  const prosperousCity = createTestCity(
    'city-prosperous',
    'Prosperity City',
    1000000,
    CityTechLevel.ADVANCED,
    0.85,  // High wealth
    0.05,  // Low unemployment (5%)
    0.10,  // Low crime (10%)
    0.90,  // High stability
    0.15   // Low corruption
  );

  // Initialize population
  popSystem.initializeCityPopulation(prosperousCity);

  const initialStats = popSystem.getCityStatistics(prosperousCity.id);
  console.log(`Initial Population: ${initialStats.totalPopulation.toLocaleString()}`);
  console.log(`Initial Happiness: ${(initialStats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`Initial Health: ${(initialStats.averageHealth * 100).toFixed(1)}%`);

  // Simulate 5 years (1 year = 365.25 * 86400 seconds)
  const oneYear = 365.25 * 86400;
  const simulationYears = 5;

  console.log(`\nSimulating ${simulationYears} years of growth...\n`);

  for (let year = 1; year <= simulationYears; year++) {
    // Update in monthly chunks for better granularity
    for (let month = 0; month < 12; month++) {
      popSystem.update(oneYear / 12, [prosperousCity]);
    }

    const stats = popSystem.getCityStatistics(prosperousCity.id);
    const growthRate = ((stats.totalPopulation / initialStats.totalPopulation - 1) * 100);

    console.log(`Year ${year}:`);
    console.log(`  Population: ${stats.totalPopulation.toLocaleString()} (+${growthRate.toFixed(2)}%)`);
    console.log(`  Happiness: ${(stats.averageHappiness * 100).toFixed(1)}%`);
    console.log(`  Health: ${(stats.averageHealth * 100).toFixed(1)}%`);

    const labor = popSystem.getLaborMarket(prosperousCity.id);
    if (labor) {
      console.log(`  Workforce: ${labor.totalWorkforce.toLocaleString()}`);
      console.log(`  Unemployment: ${(labor.unemploymentRate * 100).toFixed(1)}%`);
    }
  }

  const finalStats = popSystem.getCityStatistics(prosperousCity.id);
  const totalGrowth = ((finalStats.totalPopulation / initialStats.totalPopulation - 1) * 100);

  console.log(`\n✓ Result: Population grew by ${totalGrowth.toFixed(2)}% over ${simulationYears} years`);
  console.log(`  Final happiness: ${(finalStats.averageHappiness * 100).toFixed(1)}%`);
  console.log('  Interpretation: Happy, healthy populations with good living conditions grow naturally\n');
}

/**
 * Test 2: Population Decline When Needs Unmet
 *
 * Demonstrates that cities with poor conditions experience population decline
 */
export function testPopulationDeclineWhenNeedsUnmet(): void {
  console.log('\n=== TEST 2: Population Decline When Needs Unmet ===\n');

  const popSystem = new PopulationSystem();

  // Create a struggling city with poor conditions
  const strugglingCity = createTestCity(
    'city-struggling',
    'Struggling City',
    500000,
    CityTechLevel.INDUSTRIAL,
    0.25,  // Low wealth
    0.35,  // High unemployment (35%)
    0.55,  // High crime (55%)
    0.40,  // Low stability
    0.65   // High corruption
  );

  // Make infrastructure poor
  strugglingCity.infrastructure.foodProduction = 0.4; // Food shortage
  strugglingCity.infrastructure.medicalQuality = 0.3; // Poor healthcare
  strugglingCity.infrastructure.waterSupply = strugglingCity.population * 150; // Water shortage

  // Initialize population
  popSystem.initializeCityPopulation(strugglingCity);

  const initialStats = popSystem.getCityStatistics(strugglingCity.id);
  console.log(`Initial Population: ${initialStats.totalPopulation.toLocaleString()}`);
  console.log(`Initial Happiness: ${(initialStats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`Initial Health: ${(initialStats.averageHealth * 100).toFixed(1)}%`);

  console.log('\nCity Conditions:');
  console.log(`  Wealth Level: ${(strugglingCity.economy.wealthLevel * 100).toFixed(1)}%`);
  console.log(`  Unemployment: ${(strugglingCity.economy.unemployment * 100).toFixed(1)}%`);
  console.log(`  Crime Rate: ${(strugglingCity.economy.crimeRate * 100).toFixed(1)}%`);
  console.log(`  Food Production: ${(strugglingCity.infrastructure.foodProduction * 100).toFixed(1)}%`);
  console.log(`  Healthcare Quality: ${(strugglingCity.infrastructure.medicalQuality * 100).toFixed(1)}%`);

  // Simulate 5 years
  const oneYear = 365.25 * 86400;
  const simulationYears = 5;

  console.log(`\nSimulating ${simulationYears} years...\n`);

  for (let year = 1; year <= simulationYears; year++) {
    for (let month = 0; month < 12; month++) {
      popSystem.update(oneYear / 12, [strugglingCity]);
    }

    const stats = popSystem.getCityStatistics(strugglingCity.id);
    const change = ((stats.totalPopulation / initialStats.totalPopulation - 1) * 100);

    console.log(`Year ${year}:`);
    console.log(`  Population: ${stats.totalPopulation.toLocaleString()} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`);
    console.log(`  Happiness: ${(stats.averageHappiness * 100).toFixed(1)}%`);
    console.log(`  Health: ${(stats.averageHealth * 100).toFixed(1)}%`);

    if (stats.activeUnrest.length > 0) {
      console.log(`  ⚠ Active Unrest: ${stats.activeUnrest.length} event(s)`);
      for (const unrest of stats.activeUnrest) {
        console.log(`    - ${unrest.type}: ${unrest.participants.toLocaleString()} participants`);
      }
    }
  }

  const finalStats = popSystem.getCityStatistics(strugglingCity.id);
  const totalChange = ((finalStats.totalPopulation / initialStats.totalPopulation - 1) * 100);

  console.log(`\n✓ Result: Population changed by ${totalChange.toFixed(2)}% over ${simulationYears} years`);
  console.log(`  Final happiness: ${(finalStats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`  Unrest events: ${finalStats.activeUnrest.length}`);
  console.log('  Interpretation: Poor conditions lead to unhappiness, health decline, and potential population loss\n');
}

/**
 * Test 3: Migration Between Cities
 *
 * Demonstrates citizens migrating from poor cities to better ones
 */
export function testMigrationBetweenCities(): void {
  console.log('\n=== TEST 3: Migration Between Cities ===\n');

  const popSystem = new PopulationSystem();

  // Create a poor city (source)
  const poorCity = createTestCity(
    'city-poor',
    'Poor City',
    300000,
    CityTechLevel.INDUSTRIAL,
    0.30,  // Low wealth
    0.40,  // High unemployment
    0.45,  // High crime
    0.50,  // Moderate stability
    0.50   // Moderate corruption
  );

  // Create a rich city (destination)
  const richCity = createTestCity(
    'city-rich',
    'Rich City',
    800000,
    CityTechLevel.HIGH_TECH,
    0.80,  // High wealth
    0.08,  // Low unemployment
    0.12,  // Low crime
    0.85,  // High stability
    0.20   // Low corruption
  );

  // Initialize populations
  popSystem.initializeCityPopulation(poorCity);
  popSystem.initializeCityPopulation(richCity);

  const poorInitial = popSystem.getCityStatistics(poorCity.id);
  const richInitial = popSystem.getCityStatistics(richCity.id);

  console.log('Initial State:');
  console.log(`\nPoor City:`);
  console.log(`  Population: ${poorInitial.totalPopulation.toLocaleString()}`);
  console.log(`  Happiness: ${(poorInitial.averageHappiness * 100).toFixed(1)}%`);
  console.log(`  Unemployment: ${(poorCity.economy.unemployment * 100).toFixed(1)}%`);

  console.log(`\nRich City:`);
  console.log(`  Population: ${richInitial.totalPopulation.toLocaleString()}`);
  console.log(`  Happiness: ${(richInitial.averageHappiness * 100).toFixed(1)}%`);
  console.log(`  Unemployment: ${(richCity.economy.unemployment * 100).toFixed(1)}%`);

  // Simulate 3 years
  const oneYear = 365.25 * 86400;
  const simulationYears = 3;

  console.log(`\nSimulating ${simulationYears} years of migration...\n`);

  for (let year = 1; year <= simulationYears; year++) {
    for (let month = 0; month < 12; month++) {
      popSystem.update(oneYear / 12, [poorCity, richCity]);
    }

    const poorStats = popSystem.getCityStatistics(poorCity.id);
    const richStats = popSystem.getCityStatistics(richCity.id);

    console.log(`Year ${year}:`);
    console.log(`  Poor City: ${poorStats.totalPopulation.toLocaleString()} (${poorStats.recentMigration.outgoing > 0 ? '-' : ''}${poorStats.recentMigration.outgoing.toLocaleString()} out, +${poorStats.recentMigration.incoming.toLocaleString()} in)`);
    console.log(`  Rich City: ${richStats.totalPopulation.toLocaleString()} (+${richStats.recentMigration.incoming.toLocaleString()} in, ${richStats.recentMigration.outgoing > 0 ? '-' : ''}${richStats.recentMigration.outgoing.toLocaleString()} out)`);
  }

  const poorFinal = popSystem.getCityStatistics(poorCity.id);
  const richFinal = popSystem.getCityStatistics(richCity.id);

  const poorChange = poorFinal.totalPopulation - poorInitial.totalPopulation;
  const richChange = richFinal.totalPopulation - richInitial.totalPopulation;

  console.log(`\n✓ Result after ${simulationYears} years:`);
  console.log(`  Poor City: ${poorChange >= 0 ? '+' : ''}${poorChange.toLocaleString()} (${((poorChange / poorInitial.totalPopulation) * 100).toFixed(2)}%)`);
  console.log(`  Rich City: ${richChange >= 0 ? '+' : ''}${richChange.toLocaleString()} (${((richChange / richInitial.totalPopulation) * 100).toFixed(2)}%)`);

  const migrations = popSystem.getRecentMigrations();
  const poorToRich = migrations.filter(m => m.fromCityId === poorCity.id && m.toCityId === richCity.id);
  const totalMigrated = poorToRich.reduce((sum, m) => sum + m.count, 0);

  console.log(`  Total migrated from poor to rich: ${totalMigrated.toLocaleString()}`);
  console.log('  Interpretation: Citizens migrate from poor conditions to better opportunities\n');
}

/**
 * Test 4: Social Unrest and Protests
 *
 * Demonstrates unrest events when population is very unhappy
 */
export function testSocialUnrest(): void {
  console.log('\n=== TEST 4: Social Unrest and Protests ===\n');

  const popSystem = new PopulationSystem();

  // Create a city with terrible conditions
  const oppressedCity = createTestCity(
    'city-oppressed',
    'Oppressed City',
    600000,
    CityTechLevel.MODERN,
    0.20,  // Very low wealth
    0.50,  // Very high unemployment (50%)
    0.60,  // Very high crime
    0.30,  // Low stability
    0.75   // Very high corruption
  );

  // Make conditions even worse
  oppressedCity.infrastructure.foodProduction = 0.35; // Severe food shortage
  oppressedCity.infrastructure.medicalQuality = 0.25;
  oppressedCity.infrastructure.waterSupply = oppressedCity.population * 120; // Water shortage
  oppressedCity.politics.civilRights = 0.20; // Oppressive government

  // Initialize population
  popSystem.initializeCityPopulation(oppressedCity);

  const initialStats = popSystem.getCityStatistics(oppressedCity.id);

  console.log('City Conditions:');
  console.log(`  Population: ${initialStats.totalPopulation.toLocaleString()}`);
  console.log(`  Happiness: ${(initialStats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`  Unemployment: ${(oppressedCity.economy.unemployment * 100).toFixed(1)}%`);
  console.log(`  Crime Rate: ${(oppressedCity.economy.crimeRate * 100).toFixed(1)}%`);
  console.log(`  Food Production: ${(oppressedCity.infrastructure.foodProduction * 100).toFixed(1)}%`);
  console.log(`  Corruption: ${(oppressedCity.politics.corruption * 100).toFixed(1)}%`);
  console.log(`  Civil Rights: ${(oppressedCity.politics.civilRights * 100).toFixed(1)}%`);

  // Simulate until unrest occurs
  const oneDay = 86400;
  const maxDays = 365;

  console.log(`\nSimulating up to ${maxDays} days...\n`);

  let unrestOccurred = false;
  for (let day = 1; day <= maxDays && !unrestOccurred; day++) {
    popSystem.update(oneDay, [oppressedCity]);

    if (day % 30 === 0) {
      const stats = popSystem.getCityStatistics(oppressedCity.id);
      console.log(`Day ${day}: Happiness ${(stats.averageHappiness * 100).toFixed(1)}%, Unrest events: ${stats.activeUnrest.length}`);

      if (stats.activeUnrest.length > 0) {
        unrestOccurred = true;
        console.log('\n⚠ UNREST DETECTED!\n');

        for (const unrest of stats.activeUnrest) {
          console.log(`Unrest Type: ${unrest.type}`);
          console.log(`Severity: ${(unrest.severity * 100).toFixed(1)}%`);
          console.log(`Participants: ${unrest.participants.toLocaleString()} citizens`);
          console.log(`Economic Impact: ${(unrest.economicImpact * 100).toFixed(1)}% GDP reduction`);
          console.log(`Duration: ${unrest.duration.toFixed(1)} hours`);
          console.log('\nDemands:');
          for (const demand of unrest.demands) {
            console.log(`  - ${demand}`);
          }
        }
      }
    }
  }

  const finalStats = popSystem.getCityStatistics(oppressedCity.id);

  console.log(`\n✓ Result:`);
  console.log(`  Unrest events triggered: ${finalStats.activeUnrest.length > 0 ? 'YES' : 'NO'}`);
  console.log(`  Final happiness: ${(finalStats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`  Final stability: ${(oppressedCity.politics.stability * 100).toFixed(1)}%`);
  console.log('  Interpretation: Severe unhappiness and unmet needs cause social unrest\n');
}

/**
 * Test 5: Demographic Shifts and Skill Development
 *
 * Demonstrates how population composition changes over time
 */
export function testDemographicShifts(): void {
  console.log('\n=== TEST 5: Demographic Shifts and Skill Development ===\n');

  const popSystem = new PopulationSystem();

  // Create a developing city that invests in education
  const developingCity = createTestCity(
    'city-developing',
    'Developing City',
    400000,
    CityTechLevel.MODERN,
    0.55,  // Moderate wealth
    0.15,  // Moderate unemployment
    0.25,  // Moderate crime
    0.70,  // Good stability
    0.30   // Low corruption
  );

  // Initialize population
  popSystem.initializeCityPopulation(developingCity);

  const initialStats = popSystem.getCityStatistics(developingCity.id);

  console.log('Initial Demographics:');
  console.log(`  Total Population: ${initialStats.totalPopulation.toLocaleString()}`);
  console.log('\nAge Distribution:');
  for (const [age, count] of initialStats.demographics) {
    const pct = (count / initialStats.totalPopulation * 100).toFixed(1);
    console.log(`  ${age}: ${count.toLocaleString()} (${pct}%)`);
  }

  console.log('\nSkill Distribution:');
  for (const [skill, count] of initialStats.skills) {
    const pct = (count / initialStats.totalPopulation * 100).toFixed(1);
    console.log(`  ${skill}: ${count.toLocaleString()} (${pct}%)`);
  }

  // Simulate 10 years to see demographic shifts
  const oneYear = 365.25 * 86400;
  const simulationYears = 10;

  console.log(`\nSimulating ${simulationYears} years of development...\n`);

  for (let year = 1; year <= simulationYears; year++) {
    for (let month = 0; month < 12; month++) {
      popSystem.update(oneYear / 12, [developingCity]);
    }

    if (year % 5 === 0) {
      const stats = popSystem.getCityStatistics(developingCity.id);
      console.log(`Year ${year}:`);
      console.log(`  Total Population: ${stats.totalPopulation.toLocaleString()}`);
      console.log(`  Happiness: ${(stats.averageHappiness * 100).toFixed(1)}%`);

      console.log('  Age Distribution:');
      for (const [age, count] of stats.demographics) {
        const pct = (count / stats.totalPopulation * 100).toFixed(1);
        console.log(`    ${age}: ${pct}%`);
      }

      const labor = popSystem.getLaborMarket(developingCity.id);
      if (labor) {
        console.log(`  Workforce: ${labor.totalWorkforce.toLocaleString()}`);
      }
    }
  }

  const finalStats = popSystem.getCityStatistics(developingCity.id);

  console.log('\n✓ Result after 10 years:');
  console.log(`  Population growth: ${((finalStats.totalPopulation / initialStats.totalPopulation - 1) * 100).toFixed(2)}%`);
  console.log('  Final Skill Distribution:');
  for (const [skill, count] of finalStats.skills) {
    const pct = (count / finalStats.totalPopulation * 100).toFixed(1);
    const initialCount = initialStats.skills.get(skill) || 0;
    const initialPct = (initialCount / initialStats.totalPopulation * 100);
    const change = (parseFloat(pct) - initialPct).toFixed(1);
    console.log(`    ${skill}: ${pct}% (${change >= '0' ? '+' : ''}${change}%)`);
  }
  console.log('  Interpretation: Population grows and skill composition evolves over time\n');
}

/**
 * Run all tests
 */
export function runAllPopulationTests(): void {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Population System Test Suite                      ║');
  console.log('║                                                            ║');
  console.log('║  Demonstrating comprehensive population dynamics:         ║');
  console.log('║  • Birth/death mechanics based on living conditions       ║');
  console.log('║  • Migration between cities                               ║');
  console.log('║  • Social unrest when needs are unmet                     ║');
  console.log('║  • Demographic shifts over time                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  testPopulationGrowthWhenHappy();
  testPopulationDeclineWhenNeedsUnmet();
  testMigrationBetweenCities();
  testSocialUnrest();
  testDemographicShifts();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                All Tests Complete                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllPopulationTests();
}
