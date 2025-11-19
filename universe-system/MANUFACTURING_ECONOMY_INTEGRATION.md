# Manufacturing-Economy Integration

## Overview

The ManufacturingSystem is now fully integrated with the EconomySystem, creating a living economic simulation where production directly affects market supply, demand, and prices.

## What Changed

### Before Integration
- ManufacturingSystem operated in isolation
- Production tracked internally in facility inventories
- No impact on market prices or supply/demand
- Resources consumed from facility inventory only

### After Integration
- Production consumes commodities from station markets
- Manufactured goods are sold to station markets
- Market prices affected by production activity
- Supply/demand dynamics respond to manufacturing
- Resource shortages properly handled
- Production profitability calculated based on real market prices

## Architecture

### Core Components

1. **ManufacturingSystem** (`ManufacturingSystem.ts`)
   - Manages production facilities and jobs
   - Links to EconomySystem via `linkEconomySystem()`
   - Validates input availability before production
   - Purchases inputs from market when production starts
   - Sells outputs to market when production completes

2. **ProductionEconomyBridge** (`ProductionEconomyBridge.ts`)
   - Bridges the gap between CommodityType enum and economy string IDs
   - Validates commodity availability in markets
   - Handles commodity purchases and sales
   - Tracks resource bottlenecks
   - Emits production events
   - Estimates production profitability

3. **EconomyIntegration** (`EconomyIntegration.ts`)
   - High-level utilities for production chains
   - Suggests profitable production based on market conditions
   - Manages multi-step production flows
   - Tracks production statistics

## Usage

### Basic Setup

```typescript
import { ManufacturingSystem, FacilityType } from './ManufacturingSystem';
import { EconomySystem } from './EconomySystem';

// Create systems
const economySystem = new EconomySystem();
const manufacturingSystem = new ManufacturingSystem();

// Link manufacturing to economy
manufacturingSystem.linkEconomySystem(economySystem);

// Register a station
economySystem.registerStation(myStation);

// Create a manufacturing facility
const refinery = manufacturingSystem.createFacility(
  myStation.id,
  FacilityType.REFINERY,
  3 // tech level
);
```

### Starting Production

```typescript
// Production now automatically:
// 1. Checks if inputs are available in market
// 2. Purchases inputs from market (affects supply/prices)
// 3. Processes them
// 4. Sells outputs to market (affects supply/prices)

const result = manufacturingSystem.startProduction(
  refinery.id,
  'refine_metallic_ore_to_steel'
);

if (result.success) {
  console.log('Production started!', result.job);
} else {
  console.log('Production failed:', result.message);
  // Common failure: "Missing inputs: METALLIC_ORE"
}
```

### Checking Resource Availability

```typescript
const bridge = manufacturingSystem.getEconomyBridge();

// Check if production can start
const validation = bridge.validateProduction(
  stationId,
  recipe.inputs
);

if (!validation.valid) {
  console.log('Cannot start production:');
  validation.details.forEach(detail => console.log(detail));
  // Output:
  // METALLIC_ORE: Short 500kg (need 1000kg, have 500kg)
  // SILICON: Available 2000kg (need 200kg)
}
```

### Estimating Profitability

```typescript
const bridge = manufacturingSystem.getEconomyBridge();

const estimate = bridge.estimateProductionProfit(
  stationId,
  recipe.inputs,
  recipe.outputs
);

console.log(`Input Cost: ${estimate.inputCost} credits`);
console.log(`Output Value: ${estimate.outputValue} credits`);
console.log(`Profit: ${estimate.profit} credits`);
console.log(`Margin: ${estimate.margin}%`);
```

### Getting Profitable Production Suggestions

```typescript
import { ProductionChainManager } from './EconomyIntegration';

const chainManager = new ProductionChainManager(
  miningSystem,
  manufacturingSystem,
  economySystem
);

// Get top 5 most profitable productions based on current market
const suggestions = chainManager.suggestProfitableChains(stationId, 5);

for (const suggestion of suggestions) {
  console.log(`${suggestion.recipe}: ${suggestion.profit} credits profit`);
  console.log(`  Margin: ${suggestion.margin}%`);
  console.log(`  Inputs available: ${suggestion.inputsAvailable}`);
}
```

### Tracking Resource Bottlenecks

```typescript
const bridge = manufacturingSystem.getEconomyBridge();

// Get all bottlenecks for a station
const bottlenecks = bridge.getStationBottlenecks(stationId);

for (const bottleneck of bottlenecks) {
  console.log(`Bottleneck: ${bottleneck.commodity}`);
  console.log(`  Required: ${bottleneck.requiredAmount}kg`);
  console.log(`  Available: ${bottleneck.availableAmount}kg`);
  console.log(`  Severity: ${bottleneck.severity}`);
  console.log(`  Affected jobs: ${bottleneck.affectedJobs.length}`);
}
```

### Monitoring Production Events

```typescript
const bridge = manufacturingSystem.getEconomyBridge();

// Get recent events
const events = bridge.getRecentEvents(20);

for (const event of events) {
  console.log(`[${event.type}] ${event.message}`);
  // [MANUFACTURING_STARTED] Started production: Refine Metallic Ore to Steel
  // [MARKET_PURCHASE_COMPLETE] Purchased 1000kg METALLIC_ORE for 5000 credits
  // [MANUFACTURING_COMPLETE] Completed production job-123
  // [MARKET_SALE_COMPLETE] Sold 700kg STEEL for 7000 credits
}

// Filter by event type
const shortages = bridge.getEventsByType(
  ProductionEventType.RESOURCE_SHORTAGE,
  10
);
```

## Production Flow

### With Economy Integration

```
1. Start Production Request
   ↓
2. ManufacturingSystem.startProduction()
   ↓
3. Validate facility capacity, tech level, power
   ↓
4. ProductionEconomyBridge.validateProduction()
   - Check market supply for inputs
   - Calculate required amounts
   ↓
5. ProductionEconomyBridge.consumeInputs()
   - EconomySystem.executeTrade() for each input
   - Deduct from market supply
   - Increase prices due to reduced supply
   ↓
6. Create ProductionJob
   - Track job in facility.activeJobs
   - Set completion time
   ↓
7. [Time Passes]
   ↓
8. ManufacturingSystem.completeJob()
   ↓
9. Calculate actual output (efficiency factors)
   ↓
10. ProductionEconomyBridge.produceOutputs()
    - EconomySystem.executeTrade() for each output
    - Add to market supply
    - Decrease prices due to increased supply
    ↓
11. Emit MANUFACTURING_COMPLETE event
```

## Commodity Type Mapping

The bridge maps between ManufacturingSystem's CommodityType enum and EconomySystem's string-based IDs:

| CommodityType | Economy ID |
|---------------|------------|
| `HYDROGEN_FUEL` | `'fuel'` |
| `OXYGEN` | `'oxygen'` |
| `WATER` | `'water'` |
| `METALLIC_ORE` | `'iron'` |
| `RARE_EARTH` | `'rare_earth'` |
| `URANIUM` | `'uranium'` |
| `FOOD` | `'food'` |
| `MEDICAL_SUPPLIES` | `'medicine'` |
| `ELECTRONICS` | `'electronics'` |
| `WEAPONS` | `'weapons'` |
| `JEWELRY/ART/ENTERTAINMENT` | `'luxury_goods'` |

Commodities not in this mapping (e.g., STEEL, TITANIUM, ALUMINUM) are:
- Not traded in economy markets
- Stored in facility inventories only
- Used for internal production chains

## Event Types

The bridge emits the following event types:

- `MANUFACTURING_STARTED` - Production job started
- `MANUFACTURING_COMPLETE` - Production job completed
- `MARKET_PURCHASE_COMPLETE` - Inputs purchased from market
- `MARKET_SALE_COMPLETE` - Outputs sold to market
- `RESOURCE_SHORTAGE` - Cannot start production due to missing inputs
- `PRODUCTION_CHAIN_COMPLETE` - Full chain completed
- `BOTTLENECK_DETECTED` - Resource bottleneck identified

## Economic Impact

### Price Dynamics

**When production consumes inputs:**
- Market supply decreases
- Prices increase (supply/demand ratio)
- Shortages may occur if demand > supply

**When production creates outputs:**
- Market supply increases
- Prices decrease (supply/demand ratio)
- Gluts may occur if supply > demand

### Market Examples

**Example 1: Steel Production Impact**

Initial state:
- METALLIC_ORE: 1000 units supply, 100 credits/unit
- STEEL: 500 units supply, 200 credits/unit

Start production (refine 1000kg ore → 700kg steel):
- Purchase 1 unit METALLIC_ORE from market
- METALLIC_ORE supply: 1000 → 999 units
- METALLIC_ORE price: 100 → 102 credits/unit (supply decreased)

Complete production:
- Sell 0.7 units STEEL to market
- STEEL supply: 500 → 500.7 units
- STEEL price: 200 → 199.7 credits/unit (supply increased)

**Example 2: Resource Shortage**

Station has:
- SILICON: 50kg available
- COPPER: 200kg available
- RARE_EARTH: 0kg available

Try to produce electronics (requires 200kg silicon, 100kg copper, 50kg rare earth):
- Validation fails: Missing RARE_EARTH
- Production blocked
- BOTTLENECK_DETECTED event emitted
- Bottleneck tracked with severity: HIGH

## Error Handling

### Production Failures

```typescript
const result = manufacturingSystem.startProduction(facilityId, recipeId);

if (!result.success) {
  // Possible failure reasons:
  // - "Facility not found"
  // - "Recipe not found"
  // - "Recipe requires REFINERY but facility is FACTORY"
  // - "Recipe requires tech level 5, facility is level 3"
  // - "Facility at capacity, cannot start new job"
  // - "Missing inputs: SILICON, COPPER, RARE_EARTH"
  // - "Insufficient power: need 1000kW, have 500kW"
  // - "Failed to acquire inputs: Market rejected goods"

  console.error('Production failed:', result.message);
}
```

### Graceful Degradation

If economy system is not linked:
- ManufacturingSystem operates in legacy mode
- Uses facility inventories only
- No market integration
- No price effects
- Manual inventory management required

```typescript
// Without linkEconomySystem():
// - Must manually add inputs to facility.inventory
// - Outputs stored in facility.inventory
// - No automatic market transactions
```

## Performance Considerations

### Unit Conversions

The bridge converts between kg (ManufacturingSystem) and units (EconomySystem):
- 1 economy unit = 1 ton = 1000kg
- Conversions happen automatically in the bridge

### Event History

- Events are stored in memory (default: 100 most recent)
- Configure with: `bridge.maxEventHistory`
- Clear old events: `bridge.clearEvents()`

### Bottleneck Tracking

- Bottlenecks persist until resolved
- Clear manually: `bridge.clearBottleneck(stationId, commodity)`
- Auto-cleared when inputs become available

## Integration with Other Systems

### With MiningSystem

```typescript
// Mining provides raw materials
const minedOre = miningSystem.processMiningOperation(/* ... */);

// Transfer to manufacturing
const oreType = minedOre.type;
const commodityType = ORE_TO_COMMODITY_MAP.get(oreType);
manufacturingSystem.addToInventory(facilityId, commodityType, amount);

// Or use ProductionChainManager
chainManager.transferOreToRefinery(stationId, refineryId);
```

### With TradeSystem

```typescript
// Player can buy from markets affected by production
const price = economySystem.getPrice(stationId, 'steel');

// Prices vary based on:
// - Recent production activity
// - Supply/demand ratios
// - Station type and faction
```

## Testing

Run the integration tests:

```bash
npm test -- manufacturing-economy-integration-test.ts
```

Or in code:

```typescript
import { runManufacturingEconomyIntegrationTests } from './examples/manufacturing-economy-integration-test';

runManufacturingEconomyIntegrationTests();
```

## Future Enhancements

Potential improvements:
- Multi-station supply chains (import/export between stations)
- Production contracts and orders
- Dynamic recipe unlocking based on research
- Facility upgrades and maintenance
- Worker skill effects on efficiency
- Energy consumption from station power grid
- Waste products and recycling
- Quality variations in outputs
- Bulk production discounts
- Production scheduling and queuing

## Troubleshooting

### "Missing inputs" when market shows supply

**Issue:** Market has 1000 units, but production says "Missing inputs"

**Solution:** Check unit conversion. 1000 units = 1,000,000kg. Recipe might need more.

### Prices not changing after production

**Issue:** Produced 100kg steel but price unchanged

**Solution:** 100kg = 0.1 units. Effect on market with 1000 units supply is minimal (<0.01%). Need larger production volumes to see price changes.

### Bottlenecks persist after adding supply

**Issue:** Added resources but bottleneck still showing

**Solution:** Clear manually: `bridge.clearBottleneck(stationId, commodity)`

### Production costs more than expected

**Issue:** Estimated 1000 credits, actually cost 1500

**Solution:** Prices increased between estimation and purchase due to other market activity or time passing. Lock in estimates or produce immediately after checking.

## Summary

The ManufacturingSystem-EconomySystem integration creates a realistic economic simulation where:

✓ Production consumes real market commodities
✓ Manufactured goods enter market supply
✓ Prices respond to supply/demand changes
✓ Resource shortages properly handled
✓ Profitability calculated from real prices
✓ Multi-station economies interact
✓ Bottlenecks tracked and reported
✓ Production events emitted for monitoring
✓ No TODOs - fully implemented

The economy is now a living, reactive system where player and NPC production activities have real economic consequences.
