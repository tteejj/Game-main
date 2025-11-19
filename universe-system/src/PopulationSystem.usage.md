# PopulationSystem Usage Guide

## Overview

The `PopulationSystem` provides comprehensive population simulation for planetary cities, including:
- **Citizen Groups**: Aggregated population demographics with needs, skills, and happiness
- **Population Growth**: Birth/death mechanics based on living conditions
- **Migration**: Citizens move between cities seeking better opportunities
- **Social Unrest**: Unhappy populations protest, strike, or revolt
- **Labor Markets**: Workforce tracking by skill category
- **Economic Integration**: Population consumes goods and provides labor

## Quick Start

```typescript
import { PopulationSystem } from './PopulationSystem';
import { PlanetaryCity } from './PlanetaryCities';

// Create the population system
const popSystem = new PopulationSystem();

// Initialize population for a city
const city: PlanetaryCity = /* your city instance */;
popSystem.initializeCityPopulation(city);

// Update simulation (call every game tick)
const deltaTime = 1.0; // seconds
popSystem.update(deltaTime, [city]);

// Get population statistics
const stats = popSystem.getCityStatistics(city.id);
console.log(`Population: ${stats.totalPopulation}`);
console.log(`Happiness: ${stats.averageHappiness}`);
console.log(`Active Unrest: ${stats.activeUnrest.length}`);
```

## Core Concepts

### 1. Citizen Groups

Instead of tracking individual citizens (performance prohibitive), the system uses **aggregated demographic groups**:

```typescript
interface CitizenGroup {
  count: number;              // Number of citizens
  ageGroup: AgeGroup;         // CHILD, ADULT, ELDERLY
  skillCategory: SkillCategory; // UNSKILLED, SKILLED, PROFESSIONAL, SPECIALIZED
  happiness: number;          // 0-1
  needs: PopulationNeeds;     // Food, water, shelter, etc.
}
```

**Age Groups:**
- `CHILD` (0-18): Don't work, consume resources, eventually become adults
- `ADULT` (19-65): Working age, produce wealth, have children
- `ELDERLY` (65+): Retired, higher healthcare needs, higher death rates

**Skill Categories:**
- `UNSKILLED`: Manual labor, low wages (0.6x GDP per capita)
- `SKILLED`: Trained workers, average wages (1.0x)
- `PROFESSIONAL`: Engineers, doctors, high wages (1.8x)
- `SPECIALIZED`: Advanced specialists, very high wages (2.5x)

### 2. Population Needs

Citizens have seven core needs that must be satisfied:

```typescript
interface PopulationNeeds {
  food: number;         // 0-1 (critical - affects health/growth)
  water: number;        // 0-1 (critical - affects health)
  shelter: number;      // 0-1 (important - affects happiness)
  healthcare: number;   // 0-1 (affects death rate and health)
  entertainment: number;// 0-1 (affects happiness)
  employment: number;   // 0-1 (very important - affects wealth/happiness)
  safety: number;       // 0-1 (affects happiness and migration)
}
```

**How Needs Are Calculated:**

Needs are derived from city infrastructure and economy:

```typescript
food = min(1, city.infrastructure.foodProduction * 1.2)
water = min(1, city.infrastructure.waterSupply / (population * 200))
shelter = max(0.3, 1 - city.economy.unemployment * 0.5)
healthcare = city.infrastructure.medicalQuality
entertainment = city.services.entertainment ? 0.7 : 0.3
employment = 1 - city.economy.unemployment
safety = 1 - city.economy.crimeRate
```

### 3. Happiness System

Happiness is calculated as a weighted average of needs satisfaction:

```typescript
happiness =
  food * 0.25 +           // Food most critical
  water * 0.20 +          // Water critical
  shelter * 0.15 +        // Shelter important
  employment * 0.20 +     // Employment very important
  healthcare * 0.10 +     // Healthcare moderately important
  safety * 0.05 +         // Safety moderately important
  entertainment * 0.05 +  // Entertainment nice to have
  + stability_bonus + wealth_bonus - corruption_penalty
```

**Happiness Effects:**
- **High (>0.7)**: Population grows, low migration, no unrest, high productivity
- **Medium (0.4-0.7)**: Stable population, some migration
- **Low (0.3-0.4)**: Migration increases, protests may occur
- **Very Low (<0.3)**: Social unrest, riots, potential revolution

### 4. Population Growth

Birth and death rates are dynamically calculated:

```typescript
// Base rates
baseBirthRate = 1.2% per year
baseDeathRate = 0.8% per year

// Modified by conditions
actualBirthRate = baseBirthRate *
  (1 + happinessMod) *        // Happy people have more children
  (1 + healthcareMod) *       // Good healthcare reduces infant mortality
  (1 + wealthMod) *           // Wealthy have more resources for children
  (1 - education * 0.3)       // Educated have fewer children

actualDeathRate = baseDeathRate *
  (1 - healthcareMod) *       // Healthcare reduces deaths
  (1 - health * 0.5) *        // Healthy people live longer
  (food < 0.3 ? 2.0 : 1.0)    // Starvation doubles death rate
```

**Growth Outcomes:**
- **Prosperous cities**: 1-2% annual growth
- **Stable cities**: 0-1% annual growth
- **Struggling cities**: 0% to -1% decline
- **Failing cities**: -1% or worse decline

### 5. Migration Mechanics

Citizens migrate when unhappy:

```typescript
// Migration desire calculation
migrationDesire = max(0, 1 - happiness - 0.3)
+ (employment < 0.5 ? 0.3 : 0)    // Unemployed want to leave
+ (safety < 0.4 ? 0.2 : 0)        // Unsafe conditions drive migration
* (wealth > 1.5x avg ? 0.5 : 1.0) // Rich less likely to migrate
* (elderly ? 0.3 : 1.0)           // Elderly less mobile
```

**Migration Target Selection:**

Cities are scored based on:
```typescript
attractiveness =
  employment * 2.0 +          // Jobs are most important
  happiness * 1.5 +           // Overall quality of life
  log(wealthRatio) -          // Relative wealth
  distancePenalty             // Closer is better
```

**Migration Rate:**
- Base rate: 2% per year
- Modified by migration desire
- Maximum 10% of a group can migrate per tick (prevents oscillations)

### 6. Social Unrest

When happiness falls below thresholds, unrest occurs:

```typescript
// Unrest thresholds
HAPPINESS_UNREST_THRESHOLD = 0.3   // Protests begin
HAPPINESS_MIGRATION_THRESHOLD = 0.4 // People want to leave
HAPPINESS_REVOLT_THRESHOLD = 0.15  // Revolution possible
```

**Unrest Types (by severity):**

| Type | Severity | Happiness | Effects |
|------|----------|-----------|---------|
| PROTEST | 0-0.4 | 0.25-0.30 | Peaceful demonstration, minor disruption |
| STRIKE | 0.2-0.5 | 0.20-0.28 | Labor stoppage, economic impact |
| RIOT | 0.4-0.6 | 0.18-0.25 | Violence, property damage, crime increase |
| REBELLION | 0.6-0.8 | 0.15-0.20 | Armed resistance, major instability |
| REVOLUTION | 0.8-1.0 | <0.15 | Attempt to overthrow government |

**Unrest Effects:**
```typescript
economicImpact = severity * 0.5      // Up to 50% GDP loss
crimeIncrease = +10% during riots/rebellion
stabilityDecrease = severity * 5% per event
```

**Unrest Demands:**

The system generates realistic demands based on conditions:
- Food shortage → "Improve food supply"
- High unemployment → "Create more jobs"
- Poor healthcare → "Better healthcare"
- High crime → "Reduce crime"
- Corruption → "End corruption"
- Low civil rights → "Expand civil rights"

### 7. Labor Market

Tracks workforce by skill category:

```typescript
interface LaborMarket {
  totalWorkforce: number;              // All adults
  employed: number;                    // Currently employed
  unemployed: number;                  // Seeking work
  unemploymentRate: number;            // %
  laborDemand: Map<SkillCategory, number>;  // Jobs needed
  laborSupply: Map<SkillCategory, number>;  // Workers available
  averageWage: number;                 // Credits/month
}
```

**Skill Distribution by Tech Level:**

| Tech Level | Unskilled | Skilled | Professional | Specialized |
|------------|-----------|---------|--------------|-------------|
| 0 (Primitive) | 70% | 25% | 4% | 1% |
| 2 (Modern) | 35% | 40% | 20% | 5% |
| 4 (High-tech) | 15% | 35% | 35% | 15% |
| 5 (Cutting-edge) | 10% | 30% | 40% | 20% |

## Integration with Game Systems

### Integration with City Economy

```typescript
// Population consumes goods
const city: PlanetaryCity = /* ... */;
const stats = popSystem.getCityStatistics(city.id);

// Food consumption
const foodNeeded = stats.totalPopulation * FOOD_PER_CAPITA_PER_DAY;

// Water consumption
const waterNeeded = stats.totalPopulation * 200; // liters/day

// Production capacity (from workforce)
const labor = popSystem.getLaborMarket(city.id);
const productionMultiplier = labor.employed / labor.totalWorkforce;
```

### Integration with Faction System

```typescript
// Faction behavior driven by population happiness
const stats = popSystem.getCityStatistics(city.id);

if (stats.averageHappiness < 0.4) {
  // Faction needs to address population concerns
  faction.priorities.push('IMPROVE_LIVING_CONDITIONS');
}

if (stats.activeUnrest.length > 0) {
  // Faction must respond to unrest
  for (const unrest of stats.activeUnrest) {
    faction.handleUnrest(city, unrest);
    // Faction might: increase wages, improve infrastructure,
    // suppress unrest, make concessions, etc.
  }
}
```

### Integration with Event System

```typescript
// Generate events from population dynamics
const migrations = popSystem.getRecentMigrations();
for (const migration of migrations) {
  if (migration.count > 10000) {
    eventSystem.createEvent({
      type: 'MASS_MIGRATION',
      description: `${migration.count} citizens migrated from ${migration.fromCityId} to ${migration.toCityId}`,
      reason: migration.reason
    });
  }
}

const unrest = popSystem.getActiveUnrest();
for (const [cityId, events] of unrest) {
  eventSystem.createEvent({
    type: 'SOCIAL_UNREST',
    cityId,
    events
  });
}
```

## Example Scenarios

### Scenario 1: Boom Town

```typescript
// Tech company opens major facility in city
city.economy.unemployment = 0.03; // Very low
city.economy.wealthLevel = 0.85;  // High wages
city.infrastructure.medicalQuality = 0.8;

// Result after 5 years:
// - Population grows 8-12%
// - Skilled/professional population increases
// - In-migration from neighboring cities
// - Housing shortage may develop
```

### Scenario 2: Economic Collapse

```typescript
// Major employer closes
city.economy.unemployment = 0.45;  // Very high
city.economy.wealthLevel = 0.25;   // Poverty
city.infrastructure.foodProduction = 0.5; // Shortages

// Result after 1-2 years:
// - Happiness plummets to <0.3
// - Mass out-migration (10-20% of population)
// - Protests and strikes
// - Population decline 5-10%
// - Faction must intervene or city dies
```

### Scenario 3: War-Torn City

```typescript
// City under siege
city.infrastructure.foodProduction = 0.2;  // Blockade
city.economy.crimeRate = 0.7;              // Lawlessness
city.politics.stability = 0.2;             // Chaos

// Result:
// - Starvation (death rate doubles)
// - Riots and civil unrest
// - Mass exodus of refugees
// - Population decline 20-40%
// - Potential government collapse
```

## Performance Considerations

**Citizen Groups:**
- Cities have 5-15 citizen groups (not millions of individuals)
- O(n) complexity where n = number of groups
- Typical city: ~10 groups for 1M population

**Update Frequency:**
- Population changes are slow (months/years)
- Can update less frequently than other systems
- Recommended: Update every game hour or day

**Optimization Tips:**
```typescript
// Update population every hour instead of every second
if (gameTime % 3600 === 0) {
  popSystem.update(3600, cities);
}

// Only process migration for cities with high migration desire
const citiesToCheck = cities.filter(city => {
  const stats = popSystem.getCityStatistics(city.id);
  return stats.averageHappiness < 0.5;
});
popSystem.processMigration(citiesToCheck, deltaTime);
```

## API Reference

### Main Methods

#### `initializeCityPopulation(city: PlanetaryCity): void`
Creates initial citizen groups for a city based on its population and tech level.

#### `update(deltaTime: number, cities: PlanetaryCity[]): void`
Updates all population mechanics (growth, migration, unrest) for the given time delta.

#### `getCityStatistics(cityId: string): CityStatistics`
Returns comprehensive statistics about a city's population.

#### `getLaborMarket(cityId: string): LaborMarket | null`
Returns labor market data (workforce, unemployment, skills).

#### `getRecentMigrations(limit?: number): MigrationEvent[]`
Returns recent migration events.

#### `getActiveUnrest(): Map<string, SocialUnrest[]>`
Returns all currently active unrest events.

### Statistics Object

```typescript
{
  totalPopulation: number;
  averageHappiness: number;        // 0-1
  averageHealth: number;           // 0-1
  demographics: Map<AgeGroup, number>;
  skills: Map<SkillCategory, number>;
  activeUnrest: SocialUnrest[];
  recentMigration: { incoming: number; outgoing: number };
}
```

## Testing

Run the included test suite:

```bash
npm test PopulationSystem.test.ts
```

Or in code:
```typescript
import { runAllPopulationTests } from './PopulationSystem.test';
runAllPopulationTests();
```

Test coverage includes:
1. Population growth in prosperous cities
2. Population decline when needs unmet
3. Migration between cities
4. Social unrest generation
5. Demographic shifts over time

## Future Enhancements

Potential additions for deeper simulation:

- **Culture & Identity**: Ethnic/cultural groups with different values
- **Education System**: Schools improve skill levels over time
- **Healthcare Detail**: Diseases, pandemics, medical infrastructure
- **Housing Markets**: Housing supply/demand affects shelter needs
- **Immigration Policy**: Factions control migration rates
- **Age-Specific Mechanics**: Retirement, schooling, military service
- **Family Units**: Track relationships, inheritance
- **Social Classes**: Wealth inequality, class mobility

## Conclusion

The PopulationSystem provides a rich, dynamic population simulation that drives faction behavior and creates emergent gameplay. Cities with happy, well-cared-for populations grow and prosper, while cities that neglect their citizens face unrest, decline, and potential collapse.

The key design principle is that **population happiness and needs drive everything**. Factions must balance economic growth, military expansion, and population welfare - neglecting any one leads to problems.
