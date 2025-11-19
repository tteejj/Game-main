# Faction Construction System - Quick Start Guide

## Overview

The Faction Construction System enables AI factions to autonomously build stations based on strategic needs. This guide shows how to integrate it into your game.

## Quick Setup (3 Steps)

### Step 1: Initialize Systems

```typescript
import { ConstructionSystem } from './universe-system/src/ConstructionSystem';
import { FactionExpansionAI, ExpandableFaction } from './universe-system/src/faction-dynamics/FactionExpansionAI';

// Create construction system (singleton for entire universe)
const constructionSystem = new ConstructionSystem();

// Create expansion AI for each faction
const factionAIs = new Map<string, FactionExpansionAI>();

factions.forEach(faction => {
  const expansionAI = new FactionExpansionAI(
    faction as ExpandableFaction,
    starSystem,
    constructionSystem
  );
  factionAIs.set(faction.id, expansionAI);
});
```

### Step 2: Update in Game Loop

```typescript
function gameUpdate(deltaTime: number) {
  const currentTime = Date.now() / 1000;

  // Update all faction AIs (they evaluate and start construction)
  factionAIs.forEach(ai => {
    ai.update(deltaTime, currentTime);
  });

  // Update construction progress
  constructionSystem.update(deltaTime);
}
```

### Step 3: Handle Completion

```typescript
// Register callback to create actual stations when construction completes
constructionSystem.onConstructionComplete((event) => {
  // Create station in game world
  const station = createStationAtPosition(
    event.type,
    event.position,
    event.owner
  );

  // Add to star system
  starSystem.addStation(station);

  // Notify player if visible
  if (isVisibleToPlayer(event.position)) {
    showNotification(`${event.owner} completed ${event.type}!`);
  }
});
```

## Faction Requirements

Your faction objects need these properties:

```typescript
interface ExpandableFaction {
  id: string;
  name: string;
  credits: number;  // Economic resources
  homeworld: Vector3;  // Starting position
  relations: Map<string, number>;  // factionId -> standing (-100 to 100)
  personality: {
    militaristic: number;  // 0-1
    economic: number;      // 0-1
    expansionist: number;  // 0-1
  };
}
```

## Customization

### Adjust Expansion Rate

```typescript
// Check for expansion every 5 minutes instead of 10
expansionAI.setExpansionInterval(300);
```

### Force Immediate Expansion

```typescript
// Useful for testing or triggered events
expansionAI.forceExpansionCheck();
```

### Monitor Expansion

```typescript
const stats = expansionAI.getExpansionStats();
console.log(`${stats.faction} has ${stats.stationCount} stations`);
console.log(`Next expansion check in ${stats.nextCheck - stats.lastCheck}s`);
```

## Station Types & Costs

| Type | Build Time | Primary Cost | Strategic Use |
|------|-----------|--------------|---------------|
| **MINING_PLATFORM** | 40 min | 500 materials | Resource extraction, early game |
| **REFINERY** | 45 min | 700 materials | Process raw materials, mid game |
| **OUTPOST** | 30 min | 250 materials | Cheap territory claims |
| **STATION** | 60 min | 800 materials | Trade hubs, late game |
| **DEFENSE_PLATFORM** | 50 min | 850 materials | Military defense, war |

## Decision Logic

Factions evaluate needs in priority order:

1. **War Response** (0.95 priority)
   - At war → Build defense platforms

2. **Resource Crisis** (0.9 priority)
   - Low credits → Build mining platforms

3. **Supply Chain** (0.8 priority)
   - Have mining but no refining → Build refineries

4. **Economic Growth** (0.7 priority)
   - Wealthy + trade-focused → Build trade stations

5. **Territory Expansion** (0.5 priority)
   - Few stations + expansionist → Build outposts

## Example: Custom Station Type

```typescript
// Add new station type to ConstructionSystem
const blueprints = {
  // ... existing types ...

  RESEARCH_LAB: {
    costs: [
      { commodity: CommodityType.ELECTRONICS, quantity: 300 },
      { commodity: CommodityType.COMPUTER_SYSTEMS, quantity: 100 }
    ],
    buildTime: 3300 // 55 minutes
  }
};
```

## Example: Custom Need Evaluation

```typescript
// Extend FactionExpansionAI
class CustomExpansionAI extends FactionExpansionAI {
  private evaluateResearchNeed(): number {
    // Scientific factions prioritize research labs
    if (this.faction.personality.technological > 0.8) {
      return 0.75;
    }
    return 0.1;
  }
}
```

## Debugging

### View Active Projects

```typescript
const projects = constructionSystem.getActiveProjects();
projects.forEach(p => {
  console.log(`${p.owner} building ${p.type}: ${(p.progress * 100).toFixed(0)}%`);
});
```

### View Faction Plans

```typescript
// Add temporary logging to see AI decisions
const need = expansionAI['evaluateExpansionNeed'](); // Access private method
console.log(`${faction.name} wants ${need.type} (score: ${need.score})`);
```

## Performance Tips

1. **Stagger Updates**: Don't update all factions in same frame
   ```typescript
   if (frameCount % 10 === factionIndex % 10) {
     expansionAI.update(deltaTime, currentTime);
   }
   ```

2. **Limit Active Projects**: Cap construction per faction
   ```typescript
   if (constructionSystem.getProjectsByOwner(faction.id).length < 3) {
     expansionAI.update(deltaTime, currentTime);
   }
   ```

3. **Zone-Based Checks**: Only update AIs for active systems
   ```typescript
   if (starSystem.hasRecentPlayerActivity()) {
     expansionAI.update(deltaTime, currentTime);
   }
   ```

## Integration with Existing Systems

### Economy System
```typescript
// Deduct actual commodities instead of credits
consumeFactionResources(costs) {
  costs.forEach(cost => {
    faction.stockpiles.set(
      cost.commodity,
      faction.stockpiles.get(cost.commodity) - cost.quantity
    );
  });
}
```

### Territory System
```typescript
// Claim territory when construction starts
constructionSystem.onConstructionComplete((event) => {
  territorySystem.claimTerritory(
    event.position,
    event.owner,
    stationInfluenceRadius
  );
});
```

### UI Updates
```typescript
// Show construction in UI
const projects = constructionSystem.getProjectsBySystem(currentSystemId);
projects.forEach(p => {
  ui.showConstructionMarker(p.position, p.type, p.progress);
});
```

## Testing

Run the test suite to verify everything works:

```bash
npx ts-node universe-system/tests/faction-expansion.test.ts
```

Expected output: 5 tests pass ✓

## Troubleshooting

**Problem**: Factions aren't building anything
- Check: `faction.credits >= 10000`
- Check: Need scores > 0.6 threshold
- Check: Expansion interval has passed

**Problem**: Construction never completes
- Check: `constructionSystem.update()` is being called
- Check: `deltaTime` is in seconds, not milliseconds

**Problem**: Stations appearing in wrong locations
- Check: `findBuildLocation()` has access to correct star system
- Check: Asteroid data available for mining platforms

## Next Steps

- Integrate with Task 3: Territory Control
- Add player construction UI
- Connect to economic simulation
- Implement construction cancellation UI

## Support

See full implementation details in:
- `TASK_2_IMPLEMENTATION_SUMMARY.md`
- `ACTION_PLAN_PHASE_3_4X_GAMEPLAY.md` (lines 377-887)
