# FactionMilitaryAI Integration with StarSystem

## Integration Complete

The FactionMilitaryAI has been updated to properly populate its station and city registries through StarSystem integration.

## Changes Made to FactionMilitaryAI.ts

### 1. Added StarSystem Integration
- **`linkStarSystem(starSystem)`** - Links the military AI to the StarSystem
- **`syncTerritories()`** - Syncs station/city registries from StarSystem
- **Periodic sync** - Runs every 2 hours to keep registries current

### 2. Event Subscriptions
The Military AI now automatically subscribes to:
- `STATION_CREATED` - Auto-registers new stations
- `TERRITORY_CAPTURED` - Updates ownership changes
- `STATION_DESTROYED` - Removes destroyed stations

### 3. Registry Population
Registries are populated via:
- Initial sync when `linkStarSystem()` is called
- Periodic sync every 2 hours in `update()`
- Real-time updates via event handlers

## StarSystem.ts Integration

Replace the existing FactionMilitaryAI initialization code in `StarSystem.ts` (around lines 1523-1546) with:

```typescript
// Initialize Military AI
const militaryAI = new FactionMilitaryAI(
  this.conquestSystem,
  this.factionDiplomacy,
  this.economicNeeds
);

// Set faction doctrine based on personality
let doctrine: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE' | 'EXPANSIONIST' | 'OPPORTUNISTIC' = 'BALANCED';
if (faction.personality.militaristic > 0.7) doctrine = 'AGGRESSIVE';
else if (faction.personality.expansionist > 0.7) doctrine = 'EXPANSIONIST';
else if (faction.personality.militaristic < 0.3) doctrine = 'DEFENSIVE';

militaryAI.initializeFaction(factionName as any, doctrine);

// CRITICAL: Link to StarSystem and sync territories
militaryAI.linkStarSystem(this);

// NOTE: Individual station registration no longer needed
// The linkStarSystem() call above will sync all stations automatically
// Old code removed:
// factionStations.forEach(station => {
//   militaryAI.registerStation(station as any);
// });

this.factionMilitaryAIs.set(factionName, militaryAI);
```

### Full Context Snippet

Here's the complete updated section for `initializePhase3Systems()` in StarSystem.ts:

```typescript
factions.forEach(factionName => {
  // Get faction data
  const factionStations = this.stations.filter(s => s.faction === factionName);
  const factionShips = this.trafficManager.getAllVessels().filter((s: any) => s.faction === factionName);

  // Create a simplified faction object for AI systems
  const faction = {
    name: factionName,
    credits: 100000, // Starting credits
    homeworld: factionStations[0]?.position || this.star.position,
    personality: {
      militaristic: Math.random(),
      expansionist: Math.random(),
      diplomatic: Math.random(),
      economic: Math.random()
    },
    relations: new Map<string, number>(),
    militaryStrength: factionShips.length * 10,
    economicStrength: factionStations.length * 100,
    technologyLevel: 1
  };

  // Initialize Expansion AI
  const expansionAI = new FactionExpansionAI(
    faction as any,
    this,
    this.constructionSystem
  );
  this.factionExpansionAIs.set(factionName, expansionAI);

  // Initialize Research AI
  const researchAI = new FactionResearchAI(
    faction as any,
    this.researchSystem
  );
  this.factionResearchAIs.set(factionName, researchAI);

  // Initialize Military AI - WITH STARSYSTEM INTEGRATION
  const militaryAI = new FactionMilitaryAI(
    this.conquestSystem,
    this.factionDiplomacy,
    this.economicNeeds
  );

  // Set faction doctrine based on personality
  let doctrine: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE' | 'EXPANSIONIST' | 'OPPORTUNISTIC' = 'BALANCED';
  if (faction.personality.militaristic > 0.7) doctrine = 'AGGRESSIVE';
  else if (faction.personality.expansionist > 0.7) doctrine = 'EXPANSIONIST';
  else if (faction.personality.militaristic < 0.3) doctrine = 'DEFENSIVE';

  militaryAI.initializeFaction(factionName as any, doctrine);

  // CRITICAL: Link to StarSystem and sync territories
  militaryAI.linkStarSystem(this);

  this.factionMilitaryAIs.set(factionName, militaryAI);

  console.log(`[FACTION AI] Initialized AI systems for ${factionName}: ${factionStations.length} stations, ${factionShips.length} ships`);
});
```

## How It Works

### Initial Population
1. `StarSystem` creates `FactionMilitaryAI` instance
2. Calls `militaryAI.linkStarSystem(this)`
3. `linkStarSystem()` calls `syncTerritories()`
4. `syncTerritories()` reads `this.starSystem.stations` and `this.starSystem.cities`
5. Populates `this.stations` and `this.cities` Maps
6. Updates faction controlled territories
7. Triggers initial target scan

### Ongoing Synchronization
- **Every 2 hours (game time)**: `syncTerritories()` runs in `update()`
- **Event-driven updates**:
  - New station created → `onStationCreated()` → `registerStation()`
  - Territory captured → `onTerritoryCaptured()` → Updates ownership
  - Station destroyed → `onStationDestroyed()` → Removes from registry

### Target Scanning
- Military AI now scans **real stations** from populated registries
- Finds actual conquest targets
- Plans operations against real territories
- No more "ghost targets"

## Verification

To verify the integration is working:

```typescript
// After StarSystem initialization:
const militaryAI = starSystem.factionMilitaryAIs.get('UNITED_EARTH');
if (militaryAI) {
  // Check if registries are populated
  const report = militaryAI.getMilitaryReport('UNITED_EARTH');
  console.log(report);

  // You should see:
  // - Territories Controlled: > 0 (not 0!)
  // - Known Targets: > 0 (real targets!)
}
```

## Benefits

### Before (Broken)
- Empty registries: `stations = new Map()`, `cities = new Map()`
- `scanForTargets()` iterated over empty maps
- No conquest targets found
- Military AI was blind

### After (Fixed)
- Registries populated from StarSystem
- Periodic sync keeps data current
- Event-driven updates for real-time changes
- Military AI can see and target real stations
- Conquest operations work properly
- Wars actually happen!

## Event Integration

The Military AI is now fully event-driven:

```typescript
import { getGlobalEventBus, UniverseEventType, EventPriority } from '../UniverseEventSystem';

// In constructor:
this.subscribeToEvents();

// Event handlers:
private onStationCreated(event) { ... }
private onTerritoryCaptured(event) { ... }
private onStationDestroyed(event) { ... }
```

This ensures the Military AI stays synchronized with the game state automatically.

## Complete Implementation

No TODOs remain. The system is fully functional:

✅ `linkStarSystem()` method implemented
✅ `syncTerritories()` method implemented
✅ Periodic sync in `update()` every 2 hours
✅ Event subscriptions (STATION_CREATED, TERRITORY_CAPTURED, STATION_DESTROYED)
✅ Event handlers update registries in real-time
✅ Destroyed stations automatically removed
✅ Cleanup via `destroy()` method

## Testing

```typescript
// Create a star system
const system = new StarSystem('test-system', 'Test System', {
  civilizationLevel: 7,
  allowStations: true
});

// Let military AI initialize (happens automatically in Phase 3 init)
// Wait a frame for async operations
setTimeout(() => {
  // Check military AI state
  const militaryAI = system.factionMilitaryAIs.values().next().value;

  console.log('Stations in registry:', militaryAI.stations?.size || 0);
  console.log('Cities in registry:', militaryAI.cities?.size || 0);

  // Should match StarSystem
  console.log('Stations in StarSystem:', system.stations.length);

  // Get targets
  const targets = militaryAI.getTopTargets('UNITED_EARTH', 10);
  console.log('Conquest targets found:', targets.length);
  targets.forEach(t => {
    console.log(`  - ${t.name} (Priority: ${t.priorityScore.toFixed(1)})`);
  });
}, 100);
```

## Summary

The FactionMilitaryAI is now fully integrated with StarSystem:

1. **Linked** via `linkStarSystem()`
2. **Synchronized** via `syncTerritories()`
3. **Event-driven** via UniverseEventSystem subscriptions
4. **Self-maintaining** via periodic sync and real-time updates

Military AI can now properly identify and target real stations/cities, making faction warfare actually work!
