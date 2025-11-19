/**
 * Manufacturing-Economy Integration Test
 * Demonstrates the complete integration between ManufacturingSystem and EconomySystem
 * Shows how production now consumes from and supplies to actual markets
 */

import { ManufacturingSystem, FacilityType, RecipeDatabase } from '../ManufacturingSystem';
import { EconomySystem } from '../EconomySystem';
import { ProductionChainManager } from '../EconomyIntegration';
import { MiningSystem } from '../MiningSystem';
import { SpaceStation } from '../StationGenerator';
import { CommodityType } from '../economy/commodity';

/**
 * Test: Basic economy integration
 */
function testBasicEconomyIntegration() {
  console.log('\n=== TEST: Basic Economy Integration ===\n');

  // Create systems
  const economySystem = new EconomySystem();
  const manufacturingSystem = new ManufacturingSystem();

  // Link manufacturing to economy
  manufacturingSystem.linkEconomySystem(economySystem);

  // Create a test station
  const station: SpaceStation = {
    id: 'station-1',
    name: 'Industrial Hub',
    stationType: 'TRADING_HUB',
    position: { x: 0, y: 0, z: 0 },
    faction: 'INDEPENDENT',
    population: 50000,
    economy: {
      gdp: 1000000,
      tradeVolume: 500000,
      wealthLevel: 0.7,
      demandGoods: ['Food', 'Water', 'Electronics'],
      supplyGoods: ['Steel', 'Tools', 'Machinery']
    },
    services: [],
    defenseLevel: 5,
    shipyardCapabilities: []
  };

  // Register station in economy
  economySystem.registerStation(station);

  // Create a refinery facility
  const refinery = manufacturingSystem.createFacility(station.id, FacilityType.REFINERY, 3);
  console.log(`Created refinery: ${refinery.id}`);

  // Check initial market prices
  const bridge = manufacturingSystem.getEconomyBridge()!;
  const steelPrice = bridge.getMarketPrice(station.id, CommodityType.STEEL);
  const orePrice = bridge.getMarketPrice(station.id, CommodityType.METALLIC_ORE);
  console.log(`\nInitial Market Prices:`);
  console.log(`  Metallic Ore: ${orePrice.toFixed(2)} credits/unit`);
  console.log(`  Steel: ${steelPrice.toFixed(2)} credits/unit`);

  // Check if we can produce steel (requires metallic ore in market)
  const steelRecipe = RecipeDatabase.getRecipe('refine_metallic_ore_to_steel')!;
  console.log(`\nChecking resources for: ${steelRecipe.name}`);

  const validation = bridge.validateProduction(station.id, steelRecipe.inputs);
  console.log(`  Inputs available: ${validation.valid}`);
  console.log(`  Message: ${validation.message}`);
  validation.details.forEach(detail => console.log(`    ${detail}`));

  // Estimate profitability
  const estimate = bridge.estimateProductionProfit(station.id, steelRecipe.inputs, steelRecipe.outputs);
  console.log(`\nProfitability Estimate:`);
  console.log(`  Input Cost: ${estimate.inputCost.toFixed(0)} credits`);
  console.log(`  Output Value: ${estimate.outputValue.toFixed(0)} credits`);
  console.log(`  Profit: ${estimate.profit.toFixed(0)} credits`);
  console.log(`  Margin: ${estimate.margin.toFixed(1)}%`);

  // Try to start production
  console.log(`\n--- Starting Production ---`);
  const result = manufacturingSystem.startProduction(refinery.id, steelRecipe.id);
  console.log(`Production Start: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Message: ${result.message}`);

  if (result.success) {
    console.log(`\nJob Details:`);
    console.log(`  Job ID: ${result.job!.id}`);
    console.log(`  Recipe: ${result.job!.recipe.name}`);
    console.log(`  Start Time: ${new Date(result.job!.startTime).toISOString()}`);
    console.log(`  ETA: ${new Date(result.job!.estimatedCompletion).toISOString()}`);

    // Fast-forward time to complete production
    console.log(`\n--- Simulating Production Completion ---`);
    const processingTime = result.job!.estimatedCompletion - result.job!.startTime;
    manufacturingSystem.update(processingTime / 1000);

    // Check market after production
    const newSteelPrice = bridge.getMarketPrice(station.id, CommodityType.STEEL);
    const newOrePrice = bridge.getMarketPrice(station.id, CommodityType.METALLIC_ORE);
    console.log(`\nMarket Prices After Production:`);
    console.log(`  Metallic Ore: ${newOrePrice.toFixed(2)} credits/unit (${((newOrePrice - orePrice) / orePrice * 100).toFixed(1)}% change)`);
    console.log(`  Steel: ${newSteelPrice.toFixed(2)} credits/unit (${((newSteelPrice - steelPrice) / steelPrice * 100).toFixed(1)}% change)`);

    // Check market supply
    const market = economySystem.getMarket(station.id)!;
    const oreMarket = market.get('iron')!;
    const steelMarket = market.get('steel')!;
    console.log(`\nMarket Supply:`);
    console.log(`  Metallic Ore: ${oreMarket.supply.toFixed(1)} units`);
    console.log(`  Steel: ${steelMarket ? steelMarket.supply.toFixed(1) : 'N/A'} units`);
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

/**
 * Test: Resource shortage handling
 */
function testResourceShortage() {
  console.log('\n=== TEST: Resource Shortage Handling ===\n');

  const economySystem = new EconomySystem();
  const manufacturingSystem = new ManufacturingSystem();
  manufacturingSystem.linkEconomySystem(economySystem);

  const station: SpaceStation = {
    id: 'station-2',
    name: 'Remote Outpost',
    stationType: 'MINING_PLATFORM',
    position: { x: 1000, y: 0, z: 0 },
    faction: 'INDEPENDENT',
    population: 5000,
    economy: {
      gdp: 100000,
      tradeVolume: 50000,
      wealthLevel: 0.3,
      demandGoods: ['Food', 'Water', 'Tools'],
      supplyGoods: ['Iron Ore']
    },
    services: [],
    defenseLevel: 2,
    shipyardCapabilities: []
  };

  economySystem.registerStation(station);

  const factory = manufacturingSystem.createFacility(station.id, FacilityType.ELECTRONICS_PLANT, 3);
  console.log(`Created electronics plant: ${factory.id}`);

  // Try to produce electronics (requires silicon, copper, rare earth)
  const electronicsRecipe = RecipeDatabase.getRecipe('manufacture_electronics')!;
  console.log(`\nAttempting to produce: ${electronicsRecipe.name}`);
  console.log(`Inputs required:`);
  for (const [commodity, amount] of electronicsRecipe.inputs) {
    console.log(`  ${commodity}: ${amount}kg`);
  }

  const bridge = manufacturingSystem.getEconomyBridge()!;
  const check = bridge.checkInputsAvailable(station.id, electronicsRecipe.inputs);

  console.log(`\nResource Check:`);
  console.log(`  All inputs available: ${check.available}`);
  if (!check.available) {
    console.log(`  Missing resources:`);
    for (const [commodity, shortage] of check.missing) {
      console.log(`    ${commodity}: ${shortage.toFixed(1)}kg short`);
    }
  }

  console.log(`\n--- Starting Production (Expected to Fail) ---`);
  const result = manufacturingSystem.startProduction(factory.id, electronicsRecipe.id);
  console.log(`Production Start: ${result.success ? 'SUCCESS' : 'FAILED (as expected)'}`);
  console.log(`Message: ${result.message}`);

  // Check for bottlenecks
  const bottlenecks = bridge.getStationBottlenecks(station.id);
  console.log(`\nBottlenecks Detected: ${bottlenecks.length}`);
  for (const bottleneck of bottlenecks) {
    console.log(`  ${bottleneck.commodity}:`);
    console.log(`    Required: ${bottleneck.requiredAmount.toFixed(1)}kg`);
    console.log(`    Available: ${bottleneck.availableAmount.toFixed(1)}kg`);
    console.log(`    Severity: ${bottleneck.severity}`);
    console.log(`    Affected Jobs: ${bottleneck.affectedJobs.length}`);
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

/**
 * Test: Full production chain
 */
function testFullProductionChain() {
  console.log('\n=== TEST: Full Production Chain ===\n');

  const miningSystem = new MiningSystem();
  const economySystem = new EconomySystem();
  const manufacturingSystem = new ManufacturingSystem();
  manufacturingSystem.linkEconomySystem(economySystem);

  const chainManager = new ProductionChainManager(miningSystem, manufacturingSystem, economySystem);

  const station: SpaceStation = {
    id: 'station-3',
    name: 'Manufacturing Complex',
    stationType: 'SHIPYARD',
    position: { x: 500, y: 500, z: 0 },
    faction: 'INDEPENDENT',
    population: 100000,
    economy: {
      gdp: 5000000,
      tradeVolume: 2000000,
      wealthLevel: 0.8,
      demandGoods: ['Ship Components', 'Tools', 'Electronics'],
      supplyGoods: ['Machinery', 'Construction Materials']
    },
    services: [],
    defenseLevel: 7,
    shipyardCapabilities: ['FRIGATE', 'DESTROYER']
  };

  economySystem.registerStation(station);

  // Create multiple facilities for production chain
  const refinery = manufacturingSystem.createFacility(station.id, FacilityType.REFINERY, 4);
  const foundry = manufacturingSystem.createFacility(station.id, FacilityType.FOUNDRY, 3);
  const factory = manufacturingSystem.createFacility(station.id, FacilityType.FACTORY, 4);

  console.log(`Created facilities:`);
  console.log(`  Refinery: ${refinery.id}`);
  console.log(`  Foundry: ${foundry.id}`);
  console.log(`  Factory: ${factory.id}`);

  // Get profitable production suggestions
  console.log(`\n--- Analyzing Market Opportunities ---`);
  const suggestions = chainManager.suggestProfitableChains(station.id, 5);

  console.log(`\nTop 5 Profitable Productions:`);
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    const recipe = RecipeDatabase.getRecipe(s.recipe)!;
    console.log(`\n${i + 1}. ${recipe.name}`);
    console.log(`   Output: ${s.commodity}`);
    console.log(`   Profit: ${s.profit.toFixed(0)} credits (${s.margin.toFixed(1)}% margin)`);
    console.log(`   Input Cost: ${s.inputCost.toFixed(0)} credits`);
    console.log(`   Output Value: ${s.outputValue.toFixed(0)} credits`);
    console.log(`   Inputs Available: ${s.inputsAvailable ? 'YES' : 'NO'}`);
  }

  // Try to execute full chain
  if (suggestions.length > 0 && suggestions[0].inputsAvailable) {
    console.log(`\n--- Executing Production Chain ---`);
    const topSuggestion = suggestions[0];
    const recipe = RecipeDatabase.getRecipe(topSuggestion.recipe)!;

    // Determine which facility to use
    let facilityId = refinery.id;
    if (recipe.facilityType === FacilityType.FOUNDRY) facilityId = foundry.id;
    if (recipe.facilityType === FacilityType.FACTORY) facilityId = factory.id;

    const chainResult = chainManager.executeFullChain(
      station.id,
      refinery.id,
      facilityId,
      topSuggestion.recipe
    );

    console.log(`\nChain Execution: ${chainResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Message:`);
    console.log(chainResult.message.split('\n').map(line => `  ${line}`).join('\n'));
    console.log(`\nEstimated Cost: ${chainResult.estimatedCost.toFixed(0)} credits`);
    console.log(`Estimated Revenue: ${chainResult.estimatedRevenue.toFixed(0)} credits`);
    console.log(`Expected Profit: ${(chainResult.estimatedRevenue - chainResult.estimatedCost).toFixed(0)} credits`);
  }

  // Get supply chain status
  console.log(`\n--- Supply Chain Status ---`);
  const chainStatus = chainManager.getSupplyChainStatus([station.id]);
  for (const status of chainStatus) {
    console.log(`\nStation: ${status.stationName}`);
    console.log(`  Bottlenecks: ${status.bottlenecks}`);
    console.log(`  Production Capacity: ${(status.productionCapacity * 100).toFixed(1)}%`);
    console.log(`  Market Health: ${(status.marketHealth * 100).toFixed(1)}%`);
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

/**
 * Test: Event tracking
 */
function testEventTracking() {
  console.log('\n=== TEST: Event Tracking ===\n');

  const economySystem = new EconomySystem();
  const manufacturingSystem = new ManufacturingSystem();
  manufacturingSystem.linkEconomySystem(economySystem);

  const station: SpaceStation = {
    id: 'station-4',
    name: 'Test Station',
    stationType: 'TRADING_HUB',
    position: { x: 0, y: 0, z: 0 },
    faction: 'INDEPENDENT',
    population: 30000,
    economy: {
      gdp: 500000,
      tradeVolume: 250000,
      wealthLevel: 0.6,
      demandGoods: ['Food', 'Electronics'],
      supplyGoods: ['Tools', 'Water']
    },
    services: [],
    defenseLevel: 4,
    shipyardCapabilities: []
  };

  economySystem.registerStation(station);

  const waterTreatment = manufacturingSystem.createFacility(station.id, FacilityType.WATER_TREATMENT, 2);
  console.log(`Created water treatment facility: ${waterTreatment.id}`);

  const bridge = manufacturingSystem.getEconomyBridge()!;

  // Start production to generate events
  console.log(`\n--- Starting Production to Generate Events ---`);
  const iceRecipe = RecipeDatabase.getRecipe('process_ice_to_water_oxygen')!;
  const result = manufacturingSystem.startProduction(waterTreatment.id, iceRecipe.id);

  console.log(`Production: ${result.success ? 'STARTED' : 'FAILED'}`);

  // Get recent events
  console.log(`\n--- Recent Production Events ---`);
  const events = bridge.getRecentEvents(10);
  console.log(`Total events: ${events.length}`);

  for (const event of events) {
    console.log(`\n[${event.type}] ${new Date(event.timestamp).toISOString()}`);
    console.log(`  Station: ${event.stationId}`);
    console.log(`  Message: ${event.message}`);
    if (event.commodity) {
      console.log(`  Commodity: ${event.commodity}`);
      console.log(`  Amount: ${event.amount?.toFixed(1)}kg`);
    }
    if (event.data) {
      console.log(`  Data:`, event.data);
    }
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

/**
 * Run all tests
 */
export function runManufacturingEconomyIntegrationTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Manufacturing-Economy Integration Tests                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    testBasicEconomyIntegration();
    testResourceShortage();
    testFullProductionChain();
    testEventTracking();

    console.log('\n✓ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Test failed with error:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runManufacturingEconomyIntegrationTests();
}
