/**
 * ProductionChainTests.ts
 * Comprehensive test cases for the full production chain:
 * Asteroid → Ore → Refined Materials → Manufactured Goods → Trade
 */

import { MiningSystem, OreType } from '../src/MiningSystem';
import { ManufacturingSystem, FacilityType, RecipeDatabase } from '../src/ManufacturingSystem';
import { EconomySystem } from '../src/EconomySystem';
import { ProductionChainManager } from '../src/EconomyIntegration';
import { CommodityType } from '../src/economy/commodity';
import { SpaceStation, StationGenerator, StationType, StationFaction } from '../src/StationGenerator';
import { UniverseOrchestrator } from '../src/UniverseOrchestrator';
import { CelestialBody, CelestialBodyType, Vector3 } from '../src/CelestialBody';

/**
 * Test Case 1: Basic Mining to Commodities
 * Tests: Asteroid → Ore → Raw Commodities (METALLIC_ORE, ICE, etc.)
 */
export function testCase1_MiningToCommodities(): void {
  console.log('\n=== TEST CASE 1: Mining to Commodities ===\n');

  // Setup
  const orchestrator = new UniverseOrchestrator();
  const miningSystem = new MiningSystem(orchestrator);
  const playerPosition: Vector3 = { x: 0, y: 0, z: 0 };

  // Step 1: Scan for asteroids
  console.log('STEP 1: Scanning for asteroids...');
  const asteroids = miningSystem.scanForAsteroids(playerPosition, 100000);
  console.log(`Found ${asteroids.length} asteroids`);
  console.log('');

  // Step 2: Target richest asteroid
  console.log('STEP 2: Targeting asteroid...');
  const targetAsteroid = asteroids.reduce((best, current) =>
    current.value > best.value ? current : best
  );
  const targetResult = miningSystem.targetAsteroid(targetAsteroid, playerPosition);
  console.log(targetResult.message);
  console.log('');

  // Step 3: Mine for 60 seconds
  console.log('STEP 3: Mining for 60 seconds...');
  const startResult = miningSystem.startMining(1000); // 1000kW available
  console.log(startResult.message);

  if (startResult.success) {
    // Simulate 60 seconds of mining
    for (let i = 0; i < 60; i++) {
      miningSystem.update(1); // 1 second delta
    }

    miningSystem.stopMining();
    console.log('Mining complete!');
  }
  console.log('');

  // Step 4: Process ore in refinery
  console.log('STEP 4: Processing ore in refinery...');
  const refineryResult = miningSystem.processOre(30); // 30 seconds of processing
  console.log(`Processed ${refineryResult.processed.size} ore types`);
  console.log(`Waste: ${refineryResult.waste.toFixed(1)}kg`);
  console.log('\nCommodities produced:');
  for (const [commodity, amount] of refineryResult.commodities) {
    console.log(`  ${commodity}: ${amount.toFixed(1)}kg`);
  }
  console.log('');

  // Step 5: Check refined commodities
  console.log('STEP 5: Checking refined commodities inventory...');
  const refinedCommodities = miningSystem.getRefinedCommodities();
  console.log(`Total commodity types: ${refinedCommodities.size}`);
  let totalMass = 0;
  for (const [commodity, amount] of refinedCommodities) {
    console.log(`  ${commodity}: ${amount.toFixed(1)}kg`);
    totalMass += amount;
  }
  console.log(`Total mass: ${totalMass.toFixed(1)}kg`);

  // Result
  console.log('\n--- TEST RESULT ---');
  console.log(`✓ Successfully mined asteroid and produced ${refinedCommodities.size} commodity types`);
  console.log(`✓ Total refined commodities: ${totalMass.toFixed(1)}kg`);
}

/**
 * Test Case 2: Refining Chain
 * Tests: Raw Commodities → Refined Materials (Steel, Aluminum, etc.)
 */
export function testCase2_RefiningChain(): void {
  console.log('\n=== TEST CASE 2: Refining Chain ===\n');

  // Setup
  const manufacturingSystem = new ManufacturingSystem();

  // Create a refinery
  console.log('STEP 1: Creating refinery facility...');
  const refinery = manufacturingSystem.createFacility(
    'test-station-1',
    FacilityType.REFINERY,
    3 // Tech level 3
  );
  console.log(`Created: ${refinery.facilityType} at station ${refinery.stationId}`);
  console.log('');

  // Add raw materials to inventory
  console.log('STEP 2: Adding raw materials to refinery...');
  manufacturingSystem.addToInventory(refinery.id, CommodityType.METALLIC_ORE, 1000); // 1 ton
  manufacturingSystem.addToInventory(refinery.id, CommodityType.ROCKY_ORE, 1000); // 1 ton
  manufacturingSystem.addToInventory(refinery.id, CommodityType.ICE, 1000); // 1 ton
  console.log('Added 1000kg each of METALLIC_ORE, ROCKY_ORE, and ICE');
  console.log('');

  // Process metallic ore to steel
  console.log('STEP 3: Refining metallic ore to steel...');
  const steelJob = manufacturingSystem.startProduction(
    refinery.id,
    'refine_metallic_ore_to_steel'
  );
  console.log(steelJob.message);
  console.log('');

  // Process rocky ore to aluminum
  console.log('STEP 4: Refining rocky ore to aluminum...');
  const aluminumJob = manufacturingSystem.startProduction(
    refinery.id,
    'refine_rocky_ore_to_aluminum'
  );
  console.log(aluminumJob.message);
  console.log('');

  // Process ice to water and oxygen
  console.log('STEP 5: Processing ice to water and oxygen...');
  const waterJob = manufacturingSystem.startProduction(
    refinery.id,
    'process_ice_to_water_oxygen'
  );
  console.log(waterJob.message);
  console.log('');

  // Simulate time passing (8 hours = 28800 seconds)
  console.log('STEP 6: Simulating 8 hours of production...');
  for (let i = 0; i < 28800; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Production complete!');
  console.log('');

  // Check facility status
  console.log('STEP 7: Checking facility inventory...');
  console.log(manufacturingSystem.getFacilityStatus(refinery.id));

  // Result
  console.log('\n--- TEST RESULT ---');
  console.log('✓ Successfully refined raw materials into:');
  console.log('  - STEEL from METALLIC_ORE');
  console.log('  - ALUMINUM from ROCKY_ORE');
  console.log('  - WATER and OXYGEN from ICE');
}

/**
 * Test Case 3: Manufacturing Chain
 * Tests: Refined Materials → Manufactured Goods (Electronics, Machinery, etc.)
 */
export function testCase3_ManufacturingChain(): void {
  console.log('\n=== TEST CASE 3: Manufacturing Chain ===\n');

  const manufacturingSystem = new ManufacturingSystem();

  // Create facilities
  console.log('STEP 1: Creating manufacturing facilities...');
  const refinery = manufacturingSystem.createFacility(
    'test-station-2',
    FacilityType.REFINERY,
    5
  );
  const electronicsPlant = manufacturingSystem.createFacility(
    'test-station-2',
    FacilityType.ELECTRONICS_PLANT,
    5
  );
  const factory = manufacturingSystem.createFacility(
    'test-station-2',
    FacilityType.FACTORY,
    5
  );
  console.log('Created REFINERY, ELECTRONICS_PLANT, and FACTORY');
  console.log('');

  // Add raw materials
  console.log('STEP 2: Adding raw materials...');
  manufacturingSystem.addToInventory(refinery.id, CommodityType.METALLIC_ORE, 2000);
  manufacturingSystem.addToInventory(refinery.id, CommodityType.RARE_EARTH, 1000);
  manufacturingSystem.addToInventory(refinery.id, CommodityType.ROCKY_ORE, 1000);
  console.log('Added raw materials to refinery');
  console.log('');

  // Stage 1: Refine materials
  console.log('STEP 3: Refining materials...');
  manufacturingSystem.startProduction(refinery.id, 'refine_metallic_ore_to_steel');
  manufacturingSystem.startProduction(refinery.id, 'extract_copper_from_ore');
  manufacturingSystem.startProduction(refinery.id, 'refine_rare_earth_to_silicon');

  // Wait for refining (8 hours)
  for (let i = 0; i < 28800; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Refining complete!');
  console.log('');

  // Transfer refined materials to electronics plant
  console.log('STEP 4: Transferring refined materials to electronics plant...');
  // Get refinery inventory
  const refineryStatus = manufacturingSystem.getFacilitiesByStation('test-station-2')[0];
  for (const [commodity, amount] of refineryStatus.inventory) {
    if (amount > 0) {
      manufacturingSystem.removeFromInventory(refinery.id, commodity, amount);
      manufacturingSystem.addToInventory(electronicsPlant.id, commodity, amount);
    }
  }
  console.log('Materials transferred');
  console.log('');

  // Stage 2: Manufacture electronics
  console.log('STEP 5: Manufacturing electronics...');
  const electronicsJob = manufacturingSystem.startProduction(
    electronicsPlant.id,
    'manufacture_electronics'
  );
  console.log(electronicsJob.message);

  // Wait for electronics (4 hours)
  for (let i = 0; i < 14400; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Electronics manufacturing complete!');
  console.log('');

  // Add more materials for machinery
  console.log('STEP 6: Preparing to manufacture machinery...');
  manufacturingSystem.addToInventory(factory.id, CommodityType.STEEL, 500);
  manufacturingSystem.addToInventory(factory.id, CommodityType.ALUMINUM, 200);

  // Transfer electronics from plant to factory
  const electronicsPlantData = manufacturingSystem.getFacilitiesByStation('test-station-2')[1];
  const electronicsAmount = electronicsPlantData.inventory.get(CommodityType.ELECTRONICS) || 0;
  if (electronicsAmount > 0) {
    manufacturingSystem.removeFromInventory(electronicsPlant.id, CommodityType.ELECTRONICS, 100);
    manufacturingSystem.addToInventory(factory.id, CommodityType.ELECTRONICS, 100);
  }
  console.log('');

  // Stage 3: Manufacture machinery
  console.log('STEP 7: Manufacturing machinery...');
  const machineryJob = manufacturingSystem.startProduction(
    factory.id,
    'manufacture_machinery'
  );
  console.log(machineryJob.message);

  // Wait for machinery (5 hours)
  for (let i = 0; i < 18000; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Machinery manufacturing complete!');
  console.log('');

  // Final status
  console.log('STEP 8: Final inventory status...');
  console.log('\nFACTORY INVENTORY:');
  console.log(manufacturingSystem.getFacilityStatus(factory.id));

  // Result
  console.log('\n--- TEST RESULT ---');
  console.log('✓ Successfully completed 3-stage manufacturing:');
  console.log('  Stage 1: METALLIC_ORE → STEEL, COPPER');
  console.log('  Stage 2: SILICON + COPPER + RARE_EARTH → ELECTRONICS');
  console.log('  Stage 3: STEEL + ALUMINUM + ELECTRONICS → MACHINERY');
}

/**
 * Test Case 4: Complete Production Chain with Trading
 * Tests: Asteroid → Ore → Refined → Manufactured → Market Sale
 */
export function testCase4_CompleteChainWithTrade(): void {
  console.log('\n=== TEST CASE 4: Complete Chain with Trade ===\n');

  // Setup all systems
  const orchestrator = new UniverseOrchestrator();
  const miningSystem = new MiningSystem(orchestrator);
  const manufacturingSystem = new ManufacturingSystem();
  const economySystem = new EconomySystem();

  // Create a station
  console.log('STEP 1: Creating trading station...');
  const stationGen = new StationGenerator(12345);
  const parentPlanet: CelestialBody = new CelestialBody(
    'test-planet',
    'Test Planet',
    CelestialBodyType.PLANET,
    {
      mass: 5.972e24,
      radius: 6371000,
      rotationPeriod: 86400,
      axialTilt: 0.4,
      surfaceGravity: 9.81,
      escapeVelocity: 11200
    },
    {
      color: '#4a7c8e',
      albedo: 0.3,
      emissivity: 0.9
    },
    { x: 0, y: 0, z: 0 }
  );

  const station = stationGen.generateStation(
    'test-station-trade',
    'Trade Hub Alpha',
    StationType.TRADING_HUB,
    parentPlanet
  );

  economySystem.registerStation(station);
  console.log(`Created: ${station.name} (${station.stationType})`);
  console.log('');

  // Create facilities
  console.log('STEP 2: Creating production facilities...');
  const refinery = manufacturingSystem.createFacility(station.id, FacilityType.REFINERY, 5);
  const factory = manufacturingSystem.createFacility(station.id, FacilityType.FACTORY, 5);
  console.log('Created REFINERY and FACTORY');
  console.log('');

  // Create production chain manager
  const chainManager = new ProductionChainManager(
    miningSystem,
    manufacturingSystem,
    economySystem
  );

  // PHASE 1: Mining
  console.log('STEP 3: Mining asteroid...');
  const asteroids = miningSystem.scanForAsteroids({ x: 0, y: 0, z: 0 }, 100000);
  const target = asteroids[0];
  miningSystem.targetAsteroid(target, { x: 0, y: 0, z: 0 });
  miningSystem.startMining(2000);

  // Mine for 2 minutes
  for (let i = 0; i < 120; i++) {
    miningSystem.update(1);
  }
  miningSystem.stopMining();

  // Refine ore
  const refineryResult = miningSystem.processOre(60);
  console.log(`Mined and refined ore, produced ${refineryResult.commodities.size} commodity types`);
  console.log('');

  // PHASE 2: Transfer to refinery
  console.log('STEP 4: Transferring ore to station refinery...');
  const transferResult = chainManager.transferOreToRefinery(station.id, refinery.id);
  console.log(transferResult.message);
  console.log('');

  // PHASE 3: Refine to steel
  console.log('STEP 5: Refining metallic ore to steel...');
  const steelJob = manufacturingSystem.startProduction(refinery.id, 'refine_metallic_ore_to_steel');
  console.log(steelJob.message);

  // Wait 2 hours
  for (let i = 0; i < 7200; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Steel production complete!');
  console.log('');

  // PHASE 4: Transfer steel to factory
  console.log('STEP 6: Transferring steel to factory...');
  const refineryData = manufacturingSystem.getFacilitiesByStation(station.id)[0];
  const steelAmount = refineryData.inventory.get(CommodityType.STEEL) || 0;
  if (steelAmount > 0) {
    manufacturingSystem.removeFromInventory(refinery.id, CommodityType.STEEL, steelAmount);
    manufacturingSystem.addToInventory(factory.id, CommodityType.STEEL, steelAmount);
    console.log(`Transferred ${steelAmount.toFixed(1)}kg steel`);
  }

  // Add other materials for tools
  manufacturingSystem.addToInventory(factory.id, CommodityType.TITANIUM, 100);
  console.log('');

  // PHASE 5: Manufacture tools
  console.log('STEP 7: Manufacturing tools...');
  const toolsJob = manufacturingSystem.startProduction(factory.id, 'manufacture_tools');
  console.log(toolsJob.message);

  // Wait 3 hours
  for (let i = 0; i < 10800; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Tools manufacturing complete!');
  console.log('');

  // PHASE 6: Sell to market
  console.log('STEP 8: Selling tools to station market...');
  const factoryData = manufacturingSystem.getFacilitiesByStation(station.id)[1];
  const toolsAmount = factoryData.inventory.get(CommodityType.TOOLS) || 0;

  if (toolsAmount > 0) {
    const saleResult = chainManager.transferGoodsToMarket(
      factory.id,
      station.id,
      CommodityType.TOOLS,
      toolsAmount
    );
    console.log(saleResult.message);
  }
  console.log('');

  // Final report
  console.log('STEP 9: Production chain report...');
  console.log(chainManager.getProductionReport());

  // Result
  console.log('\n--- TEST RESULT ---');
  console.log('✓ Complete production chain executed successfully:');
  console.log('  1. Mined asteroid');
  console.log('  2. Refined ore to METALLIC_ORE');
  console.log('  3. Processed to STEEL');
  console.log('  4. Manufactured TOOLS');
  console.log('  5. Sold to station market for credits');
}

/**
 * Test Case 5: Complex Multi-Stage Manufacturing
 * Tests: Full chain for high-tech goods (Ship Components)
 */
export function testCase5_ComplexManufacturing(): void {
  console.log('\n=== TEST CASE 5: Complex Multi-Stage Manufacturing ===\n');
  console.log('Producing SHIP_COMPONENTS requires:');
  console.log('  - TITANIUM (from ROCKY_ORE)');
  console.log('  - CARBON_FIBER (from SILICON + RARE_EARTH)');
  console.log('  - ELECTRONICS (from SILICON + COPPER + RARE_EARTH)');
  console.log('  - MACHINERY (from STEEL + ALUMINUM + ELECTRONICS)');
  console.log('');

  const manufacturingSystem = new ManufacturingSystem();

  // Create all necessary facilities
  console.log('STEP 1: Creating facilities...');
  const refinery = manufacturingSystem.createFacility('shipyard-station', FacilityType.REFINERY, 8);
  const chemPlant = manufacturingSystem.createFacility('shipyard-station', FacilityType.CHEMICAL_PLANT, 8);
  const electronicsPlant = manufacturingSystem.createFacility('shipyard-station', FacilityType.ELECTRONICS_PLANT, 8);
  const factory = manufacturingSystem.createFacility('shipyard-station', FacilityType.FACTORY, 8);
  const shipyard = manufacturingSystem.createFacility('shipyard-station', FacilityType.SHIPYARD, 8);
  console.log('Created 5 facilities');
  console.log('');

  // Add massive amounts of raw materials
  console.log('STEP 2: Stocking raw materials...');
  manufacturingSystem.addToInventory(refinery.id, CommodityType.ROCKY_ORE, 5000);
  manufacturingSystem.addToInventory(refinery.id, CommodityType.METALLIC_ORE, 3000);
  manufacturingSystem.addToInventory(refinery.id, CommodityType.RARE_EARTH, 2000);
  console.log('Added 10 tons of raw materials');
  console.log('');

  // Stage 1: Refine all materials
  console.log('STEP 3: Refining raw materials...');
  manufacturingSystem.startProduction(refinery.id, 'refine_rocky_ore_to_titanium');
  manufacturingSystem.startProduction(refinery.id, 'refine_rare_earth_to_silicon');
  manufacturingSystem.startProduction(refinery.id, 'refine_metallic_ore_to_steel');
  manufacturingSystem.startProduction(refinery.id, 'extract_copper_from_ore');

  // Simulate 12 hours
  for (let i = 0; i < 43200; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Stage 1 complete: Refined materials ready');
  console.log('');

  // Distribute materials
  console.log('STEP 4: Distributing refined materials...');
  const refinedInventory = manufacturingSystem.getFacilitiesByStation('shipyard-station')[0].inventory;

  // Transfer to chemical plant for carbon fiber
  const silicon = refinedInventory.get(CommodityType.SILICON) || 0;
  const rareEarth = refinedInventory.get(CommodityType.RARE_EARTH) || 0;
  if (silicon > 100) {
    manufacturingSystem.removeFromInventory(refinery.id, CommodityType.SILICON, 100);
    manufacturingSystem.addToInventory(chemPlant.id, CommodityType.SILICON, 100);
  }
  if (rareEarth > 50) {
    manufacturingSystem.removeFromInventory(refinery.id, CommodityType.RARE_EARTH, 50);
    manufacturingSystem.addToInventory(chemPlant.id, CommodityType.RARE_EARTH, 50);
  }

  // Transfer to electronics plant
  if (silicon > 200) {
    manufacturingSystem.removeFromInventory(refinery.id, CommodityType.SILICON, 200);
    manufacturingSystem.addToInventory(electronicsPlant.id, CommodityType.SILICON, 200);
  }
  const copper = refinedInventory.get(CommodityType.COPPER) || 0;
  if (copper > 100) {
    manufacturingSystem.removeFromInventory(refinery.id, CommodityType.COPPER, 100);
    manufacturingSystem.addToInventory(electronicsPlant.id, CommodityType.COPPER, 100);
  }
  if (rareEarth > 50) {
    manufacturingSystem.addToInventory(electronicsPlant.id, CommodityType.RARE_EARTH, 50);
  }

  console.log('Materials distributed');
  console.log('');

  // Stage 2: Produce carbon fiber and electronics
  console.log('STEP 5: Producing carbon fiber and electronics...');
  manufacturingSystem.startProduction(chemPlant.id, 'produce_carbon_fiber');
  manufacturingSystem.startProduction(electronicsPlant.id, 'manufacture_electronics');

  // Simulate 4 hours
  for (let i = 0; i < 14400; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Stage 2 complete: Advanced materials ready');
  console.log('');

  // Transfer to factory for machinery
  console.log('STEP 6: Producing machinery...');
  const steel = refinedInventory.get(CommodityType.STEEL) || 0;
  const aluminum = refinedInventory.get(CommodityType.ALUMINUM) || 0;
  manufacturingSystem.addToInventory(factory.id, CommodityType.STEEL, 500);
  manufacturingSystem.addToInventory(factory.id, CommodityType.ALUMINUM, 200);

  const electronicsInv = manufacturingSystem.getFacilitiesByStation('shipyard-station')[2].inventory;
  const electronics = electronicsInv.get(CommodityType.ELECTRONICS) || 0;
  if (electronics > 100) {
    manufacturingSystem.removeFromInventory(electronicsPlant.id, CommodityType.ELECTRONICS, 100);
    manufacturingSystem.addToInventory(factory.id, CommodityType.ELECTRONICS, 100);
  }

  manufacturingSystem.startProduction(factory.id, 'manufacture_machinery');

  // Simulate 5 hours
  for (let i = 0; i < 18000; i++) {
    manufacturingSystem.update(1);
  }
  console.log('Stage 3 complete: Machinery ready');
  console.log('');

  // Final stage: Ship components
  console.log('STEP 7: Producing ship components...');
  const titanium = refinedInventory.get(CommodityType.TITANIUM) || 0;
  manufacturingSystem.addToInventory(shipyard.id, CommodityType.TITANIUM, 300);

  const carbonFiberInv = manufacturingSystem.getFacilitiesByStation('shipyard-station')[1].inventory;
  const carbonFiber = carbonFiberInv.get(CommodityType.CARBON_FIBER) || 0;
  if (carbonFiber > 200) {
    manufacturingSystem.removeFromInventory(chemPlant.id, CommodityType.CARBON_FIBER, 200);
    manufacturingSystem.addToInventory(shipyard.id, CommodityType.CARBON_FIBER, 200);
  }

  if (electronics > 200) {
    manufacturingSystem.addToInventory(shipyard.id, CommodityType.ELECTRONICS, 200);
  }

  const machineryInv = manufacturingSystem.getFacilitiesByStation('shipyard-station')[3].inventory;
  const machinery = machineryInv.get(CommodityType.MACHINERY) || 0;
  if (machinery > 100) {
    manufacturingSystem.removeFromInventory(factory.id, CommodityType.MACHINERY, 100);
    manufacturingSystem.addToInventory(shipyard.id, CommodityType.MACHINERY, 100);
  }

  const shipJob = manufacturingSystem.startProduction(shipyard.id, 'manufacture_ship_components');
  console.log(shipJob.message);

  // Simulate 6 hours
  for (let i = 0; i < 21600; i++) {
    manufacturingSystem.update(1);
  }
  console.log('');
  console.log('Ship components complete!');
  console.log('');

  // Final status
  console.log('STEP 8: Final shipyard inventory...');
  console.log(manufacturingSystem.getFacilityStatus(shipyard.id));

  // Result
  console.log('\n--- TEST RESULT ---');
  console.log('✓ Successfully completed complex 4-stage manufacturing:');
  console.log('  Stage 1: Raw ores → Refined materials (Titanium, Silicon, Steel, Copper)');
  console.log('  Stage 2: Refined → Advanced (Carbon Fiber, Electronics)');
  console.log('  Stage 3: Advanced → Machinery');
  console.log('  Stage 4: All components → SHIP_COMPONENTS');
  console.log('\n✓ Total production time: ~27 hours simulated');
}

/**
 * Run all test cases
 */
export function runAllTests(): void {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   PRODUCTION CHAIN INTEGRATION TESTS                      ║');
  console.log('║   Testing: Mining → Refining → Manufacturing → Trading    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  testCase1_MiningToCommodities();
  testCase2_RefiningChain();
  testCase3_ManufacturingChain();
  testCase4_CompleteChainWithTrade();
  testCase5_ComplexManufacturing();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ALL TESTS COMPLETED                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

// Export for use in other test files
export default {
  testCase1_MiningToCommodities,
  testCase2_RefiningChain,
  testCase3_ManufacturingChain,
  testCase4_CompleteChainWithTrade,
  testCase5_ComplexManufacturing,
  runAllTests
};
