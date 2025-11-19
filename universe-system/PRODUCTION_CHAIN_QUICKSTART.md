# Production Chain Quick Start Guide

## Quick Setup

```typescript
import { MiningSystem } from './MiningSystem';
import { ManufacturingSystem, FacilityType } from './ManufacturingSystem';
import { EconomySystem } from './EconomySystem';
import { ProductionChainManager } from './EconomyIntegration';
import { CommodityType } from './economy/commodity';

// Initialize systems
const miningSystem = new MiningSystem(orchestrator);
const manufacturingSystem = new ManufacturingSystem();
const economySystem = new EconomySystem();

// Create production chain manager
const chainManager = new ProductionChainManager(
  miningSystem,
  manufacturingSystem,
  economySystem
);
```

## 1. Simple Mining Example

```typescript
// Scan for asteroids
const playerPos = { x: 0, y: 0, z: 0 };
const asteroids = miningSystem.scanForAsteroids(playerPos, 100000);

// Target richest asteroid
const target = asteroids.reduce((best, current) =>
  current.value > best.value ? current : best
);
miningSystem.targetAsteroid(target, playerPos);

// Start mining
miningSystem.startMining(1000); // 1000kW power

// Update for 60 seconds
for (let i = 0; i < 60; i++) {
  miningSystem.update(1.0); // 1 second delta
}

// Stop and refine
miningSystem.stopMining();
const refined = miningSystem.processOre(30); // 30 seconds

console.log('Commodities produced:');
for (const [commodity, amount] of refined.commodities) {
  console.log(`  ${commodity}: ${amount.toFixed(1)}kg`);
}
```

**Output:**
```
Commodities produced:
  METALLIC_ORE: 245.3kg
  ICE: 89.7kg
  RARE_EARTH: 12.1kg
```

## 2. Station Refinery Example

```typescript
// Create refinery at station
const refinery = manufacturingSystem.createFacility(
  'station-alpha',
  FacilityType.REFINERY,
  3 // Tech level
);

// Transfer ore from mining ship
const commodities = miningSystem.transferAllCommodities();
for (const [commodity, amount] of commodities) {
  manufacturingSystem.addToInventory(refinery.id, commodity, amount);
}

// Start refining to steel
const result = manufacturingSystem.startProduction(
  refinery.id,
  'refine_metallic_ore_to_steel'
);

console.log(result.message);
// Output: "Production started: Refine Metallic Ore to Steel"

// Simulate 1 hour
for (let i = 0; i < 3600; i++) {
  manufacturingSystem.update(1.0);
}

// Check results
console.log(manufacturingSystem.getFacilityStatus(refinery.id));
```

**Output:**
```
=== REFINERY ===
Station: station-alpha
Tech Level: 3
Condition: 100%
Efficiency: 85%

Active Jobs: 0/4

Inventory:
  STEEL: 171.7kg
```

## 3. Manufacturing Example

```typescript
// Create electronics plant
const electronicsPlant = manufacturingSystem.createFacility(
  'station-alpha',
  FacilityType.ELECTRONICS_PLANT,
  5
);

// Add materials
manufacturingSystem.addToInventory(electronicsPlant.id, CommodityType.SILICON, 200);
manufacturingSystem.addToInventory(electronicsPlant.id, CommodityType.COPPER, 100);
manufacturingSystem.addToInventory(electronicsPlant.id, CommodityType.RARE_EARTH, 50);

// Start production
const job = manufacturingSystem.startProduction(
  electronicsPlant.id,
  'manufacture_electronics'
);

// Simulate 3 hours
for (let i = 0; i < 10800; i++) {
  manufacturingSystem.update(1.0);
}

// Result: 300kg of ELECTRONICS produced
```

## 4. Complete Chain with Trading

```typescript
// Setup station and facilities
const station = createStation('trade-hub-alpha');
economySystem.registerStation(station);

const refinery = manufacturingSystem.createFacility(
  station.id,
  FacilityType.REFINERY,
  5
);

// Mine asteroid
miningSystem.targetAsteroid(asteroid, playerPos);
miningSystem.startMining(2000);
for (let i = 0; i < 120; i++) miningSystem.update(1.0);
miningSystem.stopMining();

// Refine ore
miningSystem.processOre(60);

// Transfer to station
chainManager.transferOreToRefinery(station.id, refinery.id);

// Produce steel
manufacturingSystem.startProduction(refinery.id, 'refine_metallic_ore_to_steel');
for (let i = 0; i < 3600; i++) manufacturingSystem.update(1.0);

// Sell to market
const steelAmount = manufacturingSystem
  .getFacilitiesByStation(station.id)[0]
  .inventory.get(CommodityType.STEEL) || 0;

const saleResult = chainManager.transferGoodsToMarket(
  refinery.id,
  station.id,
  CommodityType.STEEL,
  steelAmount
);

console.log(saleResult.message);
// Output: "Sold 700.0kg for 70000 credits"
```

## 5. Automated Station Production

```typescript
import { StationProductionAutomation } from './EconomyIntegration';

// For each NPC station
for (const station of npcStations) {
  const automation = new StationProductionAutomation(
    station,
    manufacturingSystem,
    economySystem
  );

  // This will automatically:
  // - Select appropriate recipes for station type
  // - Start production if materials available
  // - Manage facility queues
  automation.autoProduceForStation();
}
```

## 6. Finding Profitable Recipes

```typescript
// Get most profitable production chains
const suggestions = chainManager.suggestProfitableChains('trade-hub-alpha', 5);

console.log('Top 5 Profitable Chains:');
for (const suggestion of suggestions) {
  console.log(`${suggestion.commodity}: ${suggestion.profit.toFixed(0)} credits profit`);
  console.log(`  Recipe: ${suggestion.recipe}`);
  console.log(`  Demand: ${suggestion.demand.toFixed(0)} units`);
}
```

**Output:**
```
Top 5 Profitable Chains:
SHIP_COMPONENTS: 15000 credits profit
  Recipe: manufacture_ship_components
  Demand: 250 units
ELECTRONICS: 8500 credits profit
  Recipe: manufacture_electronics
  Demand: 450 units
MACHINERY: 7200 credits profit
  Recipe: manufacture_machinery
  Demand: 320 units
```

## 7. Production Statistics

```typescript
// Get production report
console.log(chainManager.getProductionReport());
```

**Output:**
```
=== PRODUCTION CHAIN REPORT ===

Mining:
  Asteroids Mined: 5
  Raw Ore Extracted: 3542.8kg
  Ore Types:
    IRON: 1823.4kg
    ICE: 987.2kg
    RARE_EARTH: 732.2kg

Refining:
  Ore Refined: 2845.7kg
  Waste: 697.1kg
  Refined Commodities:
    METALLIC_ORE: 1276.8kg
    ICE: 889.6kg
    RARE_EARTH: 679.3kg

Manufacturing:
  Goods Produced: 1843.2kg
  Jobs Completed: 12
  Total Time: 18.5 hours

Trading:
  Commodities Sold: 1843.2kg
  Credits Earned: 287500

Efficiency:
  Overall: 52.0%
  Value Added: 287500 credits
```

## 8. Complex Multi-Stage Production

```typescript
// Production chain for Ship Components
// Requires: Titanium, Carbon Fiber, Electronics, Machinery

// Stage 1: Refine raw materials (12 hours)
manufacturingSystem.startProduction(refinery.id, 'refine_rocky_ore_to_titanium');
manufacturingSystem.startProduction(refinery.id, 'refine_rare_earth_to_silicon');
manufacturingSystem.startProduction(refinery.id, 'refine_metallic_ore_to_steel');

// Stage 2: Produce advanced materials (4-5 hours)
manufacturingSystem.startProduction(chemPlant.id, 'produce_carbon_fiber');
manufacturingSystem.startProduction(electronicsPlant.id, 'manufacture_electronics');

// Stage 3: Produce machinery (4 hours)
manufacturingSystem.startProduction(factory.id, 'manufacture_machinery');

// Stage 4: Assemble ship components (6 hours)
manufacturingSystem.startProduction(shipyard.id, 'manufacture_ship_components');

// Total: ~27 hours, 700kg Ship Components worth ~700,000 credits
```

## Common Recipes Quick Reference

### Tier 1: Refining
```typescript
'refine_metallic_ore_to_steel'         // 1000kg ore → 700kg steel (1h)
'refine_rocky_ore_to_aluminum'         // 1000kg ore → 500kg aluminum (2h)
'refine_rocky_ore_to_titanium'         // 1000kg ore → 300kg titanium (3h)
'process_ice_to_water_oxygen'          // 1000kg ice → 800kg water + 150kg oxygen (30m)
'refine_rare_earth_to_silicon'         // 1000kg ore → 400kg silicon (4h)
'extract_copper_from_ore'              // 1000kg ore → 600kg copper (1.5h)
```

### Tier 2: Manufacturing
```typescript
'manufacture_electronics'              // Silicon + Copper + Rare Earth → Electronics (3h)
'manufacture_machinery'                // Steel + Aluminum + Electronics → Machinery (4h)
'manufacture_tools'                    // Steel + Titanium → Tools (2h)
'manufacture_construction_materials'   // Steel + Aluminum + Silicon → Construction (3h)
```

### Tier 3: Advanced
```typescript
'produce_carbon_fiber'                 // Silicon + Rare Earth → Carbon Fiber (2h)
'manufacture_ship_components'          // Titanium + Carbon Fiber + Electronics + Machinery → Ship Components (6h)
'manufacture_computer_systems'         // Silicon + Rare Earth + Electronics → Computer Systems (5h)
'manufacture_sensors'                  // Silicon + Rare Earth + Electronics → Sensors (4h)
'manufacture_weapons'                  // Steel + Titanium + Electronics + Uranium → Weapons (5h)
```

### Tier 4: Luxury & Fuel
```typescript
'manufacture_jewelry'                  // Platinum + Rare Earth → Jewelry (4h)
'process_food'                         // Water + Oxygen + Rare Earth → Food (3h)
'produce_hydrogen_fuel'                // Water → Hydrogen Fuel + Oxygen (1h)
'produce_fusion_pellets'               // Hydrogen Fuel + Uranium → Fusion Pellets (8h)
```

## Integration with Game Loop

```typescript
class GameLoop {
  private miningSystem: MiningSystem;
  private manufacturingSystem: ManufacturingSystem;
  private economySystem: EconomySystem;

  update(deltaTime: number) {
    // Update mining (if player is mining)
    if (this.player.isMining) {
      this.miningSystem.update(deltaTime);
    }

    // Update all manufacturing facilities
    this.manufacturingSystem.update(deltaTime);

    // Update economy (price changes, supply/demand)
    this.economySystem.update(deltaTime);

    // Auto-production for NPC stations (once per minute)
    if (this.frameCount % 3600 === 0) { // 60 fps * 60 seconds
      this.runNPCProduction();
    }
  }

  runNPCProduction() {
    for (const station of this.npcStations) {
      const automation = new StationProductionAutomation(
        station,
        this.manufacturingSystem,
        this.economySystem
      );
      automation.autoProduceForStation();
    }
  }
}
```

## Error Handling

```typescript
// Always check result.success
const result = manufacturingSystem.startProduction(facilityId, recipeId);

if (!result.success) {
  console.log(`Production failed: ${result.message}`);
  // Common failures:
  // - "Insufficient materials"
  // - "Facility at capacity"
  // - "Insufficient power"
  // - "Recipe requires higher tech level"
}

// Check transfer results
const transfer = miningSystem.transferCommodities(CommodityType.METALLIC_ORE, 500);
if (!transfer.success) {
  console.log(transfer.message); // "Insufficient METALLIC_ORE: requested 500kg, have 234.5kg"
}
```

## Tips and Best Practices

1. **Always refine ore on-ship first** before transferring to station
2. **Check facility inventory** before starting production
3. **Monitor facility condition** - it degrades over time
4. **Use ProductionChainManager** for automated workflows
5. **Batch production** by queuing multiple jobs in succession
6. **Watch power consumption** - facilities need power to operate
7. **Station type matters** - Mining platforms should have refineries, shipyards should have manufacturing
8. **Market prices fluctuate** - sell when prices are high
9. **Tech level requirements** - upgrade stations to unlock advanced recipes
10. **Efficiency compounds** - facility condition affects output quality

## Next Steps

- Integrate with StarSystem for background simulation
- Add NPC trading fleets that use production chains
- Implement player-owned facilities
- Add research system to unlock recipes
- Create supply chain networks between stations
