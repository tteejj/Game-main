# PopulationSystem Quick Start Guide

## 5-Minute Integration

### Step 1: Setup (One-time)
```typescript
import { PopulationSystem } from './PopulationSystem';
import { createCityPopulationSync } from './CityPopulationSync';

// Your existing cities
const cities: PlanetaryCity[] = [/* ... */];

// Create population system
const popSystem = new PopulationSystem();

// Link cities (REQUIRED!)
const cityMap = new Map();
cities.forEach(city => cityMap.set(city.id, city));
popSystem.linkCityRegistry(cityMap);

// Optional: Connect to event system
popSystem.setEventCallback((event) => {
  console.log(`[${event.type}] ${event.description}`);
  // Send to your event system here
});

// Create sync helper
const sync = createCityPopulationSync(popSystem, cities);

// Initialize each city's population
cities.forEach(city => popSystem.initializeCityPopulation(city));
```

### Step 2: Game Loop
```typescript
function gameUpdate(deltaTime: number) {
  // Update populations (modifies actual cities!)
  popSystem.update(deltaTime, cities);

  // Sync economic data
  cities.forEach(city => sync.syncCity(city));
}
```

### Step 3: Done!

Your cities now have:
- ✅ Real population counts (city.population updated automatically)
- ✅ Unemployment rates (city.economy.unemployment updated automatically)
- ✅ Migration between cities
- ✅ Social unrest when happiness is low
- ✅ Economic effects from population

## Common Use Cases

### Check City Happiness
```typescript
const stats = popSystem.getCityStatistics(cityId);
console.log(`Happiness: ${(stats.averageHappiness * 100).toFixed(1)}%`);

if (stats.averageHappiness < 0.3) {
  console.log('WARNING: Population very unhappy!');
}
```

### Monitor Migration
```typescript
const stats = popSystem.getCityStatistics(cityId);
const netMigration = stats.recentMigration.incoming - stats.recentMigration.outgoing;

if (netMigration < -10000) {
  console.log('Population exodus! People are leaving!');
}
```

### Respond to Unrest
```typescript
popSystem.setEventCallback((event) => {
  if (event.type === 'POPULATION_UNREST') {
    const unrest = event.data;
    console.log(`Unrest in ${event.participants[0]}`);
    console.log(`Type: ${unrest.unrestType}`);
    console.log(`Demands: ${event.consequences.join(', ')}`);

    // Your faction AI can respond here
    if (unrest.severity > 0.7) {
      deployPolice(event.data.cityId);
    }
  }
});
```

### Get Workforce Data
```typescript
const labor = popSystem.getLaborMarket(cityId);
console.log(`Unemployment: ${(labor.unemploymentRate * 100).toFixed(1)}%`);
console.log(`Skilled workers: ${labor.laborSupply.get(SkillCategory.SKILLED)}`);
```

### Calculate Resource Needs
```typescript
const consumption = sync.calculateCommodityConsumption(city);
console.log(`Daily food needed: ${consumption.food.toFixed(0)} tons`);
console.log(`Daily water needed: ${consumption.water.toLocaleString()} liters`);

// Check if city can meet needs
if (consumption.food > city.foodProduction) {
  console.log('FOOD SHORTAGE!');
}
```

### Get Economic Output
```typescript
const capacity = sync.getProductionCapacity(city);
console.log(`Manufacturing: ${capacity.manufacturing.toFixed(0)} units`);
console.log(`Services: ${capacity.services.toFixed(0)} units`);

const impact = sync.calculateEconomicImpact(city);
console.log(`Total GDP: ${(impact.totalGDP / 1e9).toFixed(2)}B credits`);
```

## Event Types

### POPULATION_MIGRATED
Emitted when significant migration occurs (>1000 people)

**Event Data:**
```typescript
{
  fromCityId: string,
  toCityId: string,
  count: number,
  reason: MigrationReason,
  skillCategory: SkillCategory
}
```

**Reasons:**
- `ECONOMIC_OPPORTUNITY` - Seeking jobs
- `ESCAPING_UNREST` - Fleeing protests/riots
- `FLEEING_CONFLICT` - Escaping danger
- `BETTER_LIVING_CONDITIONS` - General improvement

### POPULATION_UNREST
Emitted when social unrest begins

**Event Data:**
```typescript
{
  cityId: string,
  unrestType: UnrestType,
  severity: number,         // 0-1
  participants: number,     // Number of protesters
  demands: string[],
  economicImpact: number    // GDP reduction
}
```

**Unrest Types:**
- `PROTEST` - Peaceful demonstration
- `STRIKE` - Labor strike (affects production)
- `RIOT` - Violent unrest (increases crime)
- `REBELLION` - Armed resistance
- `REVOLUTION` - Government overthrow attempt

## Troubleshooting

### "City population not updating"
✅ **Fix:** Call `popSystem.linkCityRegistry(cityMap)` before initialization

### "No events being emitted"
✅ **Fix:** Call `popSystem.setEventCallback(callback)` to register handler

### "City GDP not changing"
✅ **Fix:** Call `sync.syncCity(city)` after population updates

### "Districts have zero population"
✅ **Fix:**
1. Ensure city has `districts` array
2. Call `sync.syncCity(city)` to distribute population

## Performance Tips

### Update Frequency
Population changes slowly - update less frequently:
```typescript
// Instead of every frame
if (gameTime % 3600 === 0) {  // Once per hour
  popSystem.update(3600, cities);
}
```

### Selective Updates
Only update cities with issues:
```typescript
const unhappyCities = cities.filter(city => {
  const stats = popSystem.getCityStatistics(city.id);
  return stats.averageHappiness < 0.5;
});
popSystem.update(deltaTime, unhappyCities);
```

## Integration Checklist

- [ ] Create PopulationSystem instance
- [ ] Link city registry with `linkCityRegistry()`
- [ ] Set event callback with `setEventCallback()` (optional but recommended)
- [ ] Create CityPopulationSync helper
- [ ] Initialize each city with `initializeCityPopulation()`
- [ ] Call `popSystem.update()` in game loop
- [ ] Call `sync.syncCity()` for economic updates
- [ ] Handle POPULATION_MIGRATED events
- [ ] Handle POPULATION_UNREST events
- [ ] Check city.population is updating (verify integration works)

## Next Steps

1. **Test:** Run examples in `PopulationSystem.integration.ts`
2. **Monitor:** Add logging for migration and unrest events
3. **Respond:** Implement faction AI responses to population events
4. **Expand:** Add market integration for commodity consumption
5. **Polish:** Add UI displays for population stats

## Need Help?

- Full documentation: `PopulationSystem.usage.md`
- Integration examples: `examples/PopulationSystem.integration.ts`
- Detailed changes: `POPULATION_SYSTEM_FIX_SUMMARY.md`

## That's It!

Your population system is now fully integrated and affecting actual game state. Cities will grow, decline, experience unrest, and migrate based on living conditions - all automatically!
