# UniverseEventSystem - Quick Reference

## Overview

The UniverseEventSystem is a high-performance, type-safe event bus for 4X gameplay systems. It enables decoupled communication between systems like ConquestSystem, PopulationSystem, EconomySystem, and more.

## Key Features

- ✅ **Type-Safe**: Strongly typed events with TypeScript
- ✅ **High Performance**: <1ms per event emission
- ✅ **Priority-Based**: Events can be ordered by priority (0-10)
- ✅ **Async & Sync**: Support for both async and sync event processing
- ✅ **Event History**: Query past events with flexible filtering
- ✅ **Memory Efficient**: Automatic history pruning (max 10,000 events)
- ✅ **Event Logging**: Built-in debugging and monitoring
- ✅ **Event Cascading**: Parent-child event chains for complex scenarios

## Quick Start

### Basic Usage

```typescript
import { EventBus, UniverseEventType, EventPriority } from './UniverseEventSystem';

// Create event bus
const eventBus = new EventBus();

// Subscribe to events
eventBus.subscribe(
  UniverseEventType.TERRITORY_CAPTURED,
  (event) => {
    console.log(`Territory ${event.target} captured by ${event.data.newOwner}`);
  },
  EventPriority.HIGH
);

// Emit events
eventBus.emit(
  UniverseEventType.TERRITORY_CAPTURED,
  { newOwner: 'EMPIRE', previousOwner: 'REBELS' },
  {
    source: 'ConquestSystem',
    target: 'sector_7',
    priority: EventPriority.CRITICAL,
  }
);
```

### Using Global Singleton

```typescript
import { getGlobalEventBus } from './UniverseEventSystem';

// All systems share the same event bus
const eventBus = getGlobalEventBus();
```

## Event Types

### Construction Events
- `CONSTRUCTION_STARTED` - Building construction begins
- `CONSTRUCTION_COMPLETE` - Building finished
- `CONSTRUCTION_CANCELLED` - Construction aborted
- `CONSTRUCTION_PROGRESS` - Progress update

### Conquest Events
- `SIEGE_STARTED` - Siege warfare begins
- `SIEGE_ENDED` - Siege concluded
- `TERRITORY_CAPTURED` - Territory ownership changes
- `TERRITORY_LOST` - Lost control of territory
- `OCCUPATION_STARTED` - Occupying conquered territory
- `RESISTANCE_UPRISING` - Local resistance emerges

### Research Events
- `RESEARCH_STARTED` - Research project begins
- `RESEARCH_COMPLETED` - Research finished
- `RESEARCH_BREAKTHROUGH` - Unexpected discovery
- `TECHNOLOGY_UNLOCKED` - New tech available

### Population Events
- `POPULATION_GROWTH` - Population increases
- `POPULATION_DECLINE` - Population decreases
- `POPULATION_UNREST` - Civil unrest brewing
- `POPULATION_MIGRATED` - Citizens relocate
- `POPULATION_HAPPY` - High satisfaction
- `POPULATION_STARVING` - Food crisis

### Trade & Economy Events
- `TRADE_ROUTE_ESTABLISHED` - New trade route
- `TRADE_ROUTE_DISRUPTED` - Trade interrupted
- `TRADE_COMPLETED` - Transaction finished
- `MARKET_PRICE_SPIKE` - Prices surge
- `MARKET_PRICE_CRASH` - Prices collapse
- `ECONOMIC_BOOM` - Economic prosperity
- `ECONOMIC_RECESSION` - Economic downturn
- `RESOURCE_SHORTAGE` - Critical shortage
- `RESOURCE_SURPLUS` - Excess resources

### Combat Events
- `COMBAT_STARTED` - Battle begins
- `COMBAT_ENDED` - Battle concluded
- `SHIP_DESTROYED` - Ship eliminated
- `SHIP_DAMAGED` - Ship takes damage
- `STATION_ATTACKED` - Station under attack
- `STATION_DESTROYED` - Station destroyed

### Manufacturing Events
- `MANUFACTURING_STARTED` - Production begins
- `MANUFACTURING_COMPLETE` - Production finished
- `PRODUCTION_QUEUE_CHANGED` - Queue modified
- `STATION_CREATED` - New station built
- `SHIP_MANUFACTURED` - New ship produced

### Faction Events
- `FACTION_WAR_DECLARED` - War begins
- `FACTION_PEACE_TREATY` - Peace established
- `FACTION_ALLIANCE_FORMED` - Alliance created
- `FACTION_ALLIANCE_BROKEN` - Alliance dissolved
- `FACTION_REPUTATION_CHANGED` - Reputation shift
- `FACTION_DISCOVERED` - New faction encountered

## Event Priorities

```typescript
EventPriority.CRITICAL = 10  // System errors, shutdowns
EventPriority.URGENT = 8     // Combat, sieges, disasters
EventPriority.HIGH = 6       // Territory changes, wars
EventPriority.NORMAL = 5     // Most gameplay events
EventPriority.LOW = 3        // Background updates
EventPriority.TRIVIAL = 1    // Debug/logging
```

## Advanced Features

### Synchronous Events

Use `emitSync()` for critical events that require immediate processing:

```typescript
eventBus.emitSync(
  UniverseEventType.SYSTEM_ERROR,
  { error: 'Critical failure' },
  {
    source: 'CoreSystem',
    priority: EventPriority.CRITICAL,
  }
);
```

### Event History Filtering

```typescript
// Get events by type
const sieges = eventBus.getHistory({
  types: [UniverseEventType.SIEGE_STARTED, UniverseEventType.SIEGE_ENDED],
});

// Get events by priority
const critical = eventBus.getHistory({
  minPriority: EventPriority.CRITICAL,
});

// Get recent events
const recent = eventBus.getHistory({
  limit: 10,
});

// Get events by source system
const economyEvents = eventBus.getHistory({
  sources: ['EconomySystem'],
});

// Get events by time range
const lastHour = eventBus.getHistory({
  startTime: Date.now() - 3600000,
});

// Get events by tags
const warEvents = eventBus.getHistory({
  tags: ['warfare', 'combat'],
});
```

### Event Cascading

Create parent-child event chains:

```typescript
// Parent event
const siegeEndId = eventBus.emit(
  UniverseEventType.SIEGE_ENDED,
  { outcome: 'VICTORY' },
  { source: 'ConquestSystem', priority: EventPriority.HIGH }
);

// Child event (cascade)
eventBus.emit(
  UniverseEventType.TERRITORY_CAPTURED,
  { territoryId: 'sector_7' },
  {
    source: 'ConquestSystem',
    priority: EventPriority.HIGH,
    parentEventId: siegeEndId, // Links to parent
  }
);

// Query cascade chains
const children = eventBus.getEventsByParent(siegeEndId);
```

### Event Logger

```typescript
import { EventLogger } from './UniverseEventSystem';

const logger = new EventLogger(eventBus);

// Configure logging
logger.setLogLevel('HIGH'); // Only log HIGH+ priority
logger.setConsoleLogging(true);

// Start logging
logger.start();

// Export logs
const logs = logger.exportLogs();
console.log(logs);

// Stop logging
logger.stop();
```

### Statistics & Monitoring

```typescript
const stats = eventBus.getStats();

console.log(`Total events: ${stats.totalEventsEmitted}`);
console.log(`Average processing: ${stats.averageProcessingTime}ms`);
console.log(`Active subscriptions: ${stats.subscriptionCount}`);
console.log(`History size: ${stats.historySize}`);

// Events by type
stats.eventsByType.forEach((count, type) => {
  console.log(`${type}: ${count}`);
});

// Events by source
stats.eventsBySources.forEach((count, source) => {
  console.log(`${source}: ${count}`);
});
```

## System Integration Patterns

### Pattern 1: System Initialization

```typescript
class MyGameSystem {
  private eventBus: EventBus;

  constructor() {
    this.eventBus = getGlobalEventBus();
    this.setupEventHandlers();
    this.emitSystemReady();
  }

  private setupEventHandlers() {
    this.eventBus.subscribe(
      UniverseEventType.RESOURCE_SHORTAGE,
      (event) => this.handleResourceShortage(event),
      EventPriority.HIGH
    );
  }

  private emitSystemReady() {
    this.eventBus.emit(
      UniverseEventType.SYSTEM_INITIALIZED,
      { systemName: 'MyGameSystem' },
      { source: 'MyGameSystem', priority: EventPriority.NORMAL }
    );
  }
}
```

### Pattern 2: Cross-System Communication

```typescript
// EconomySystem triggers population events
class EconomySystem {
  private eventBus: EventBus;

  handleMarketCrash() {
    // Emit economic event
    const crashId = this.eventBus.emit(
      UniverseEventType.MARKET_PRICE_CRASH,
      { commodity: 'food', priceChange: -0.5 },
      { source: 'EconomySystem', priority: EventPriority.HIGH }
    );

    // This triggers PopulationSystem to respond
  }
}

// PopulationSystem listens and responds
class PopulationSystem {
  private eventBus: EventBus;

  constructor() {
    this.eventBus = getGlobalEventBus();

    this.eventBus.subscribe(
      UniverseEventType.MARKET_PRICE_CRASH,
      (event) => {
        if (event.data.commodity === 'food') {
          // Cascade: Economic crash → Resource shortage
          this.eventBus.emit(
            UniverseEventType.RESOURCE_SHORTAGE,
            { resource: 'food', severity: 0.8 },
            {
              source: 'PopulationSystem',
              priority: EventPriority.CRITICAL,
              parentEventId: event.id,
            }
          );
        }
      },
      EventPriority.HIGH
    );
  }
}
```

### Pattern 3: Event-Driven State Updates

```typescript
class ConquestSystem {
  private activeSieges: Map<string, Siege> = new Map();
  private eventBus: EventBus;

  updateSiege(siegeId: string, deltaTime: number) {
    const siege = this.activeSieges.get(siegeId);
    if (!siege) return;

    siege.progress += deltaTime;

    // Emit progress event
    this.eventBus.emit(
      UniverseEventType.SIEGE_PROGRESS,
      {
        siegeId,
        progress: siege.progress / siege.duration,
        estimatedTime: siege.duration - siege.progress,
      },
      {
        source: 'ConquestSystem',
        target: siege.targetId,
        priority: EventPriority.NORMAL,
      }
    );

    // Check for completion
    if (siege.progress >= siege.duration) {
      this.completeSiege(siegeId);
    }
  }

  private completeSiege(siegeId: string) {
    const siege = this.activeSieges.get(siegeId);

    // Emit completion event
    this.eventBus.emitSync(
      UniverseEventType.SIEGE_ENDED,
      {
        siegeId,
        outcome: 'ATTACKER_VICTORY',
        casualties: siege.casualties,
      },
      {
        source: 'ConquestSystem',
        target: siege.targetId,
        priority: EventPriority.CRITICAL,
      }
    );

    this.activeSieges.delete(siegeId);
  }
}
```

## Best Practices

### DO ✅

1. **Use the global singleton** for system-wide communication
   ```typescript
   const eventBus = getGlobalEventBus();
   ```

2. **Choose appropriate priorities**
   - CRITICAL for game-breaking events
   - URGENT for combat/disasters
   - HIGH for significant state changes
   - NORMAL for most gameplay events
   - LOW for background updates

3. **Use sync emission for critical events**
   ```typescript
   eventBus.emitSync(UniverseEventType.SYSTEM_ERROR, ...);
   ```

4. **Tag events for easy filtering**
   ```typescript
   eventBus.emit(type, data, {
     source: 'System',
     tags: ['warfare', 'critical', 'player-visible'],
   });
   ```

5. **Clean up subscriptions**
   ```typescript
   const subId = eventBus.subscribe(...);
   // Later...
   eventBus.unsubscribe(subId);
   ```

6. **Use typed event data**
   ```typescript
   interface MyEventData {
     value: number;
     reason: string;
   }
   eventBus.emit<MyEventData>(type, { value: 100, reason: 'test' }, ...);
   ```

### DON'T ❌

1. **Don't emit events in tight loops**
   ```typescript
   // BAD
   for (let i = 0; i < 10000; i++) {
     eventBus.emit(...);
   }

   // GOOD - batch or throttle
   if (shouldEmit) {
     eventBus.emit(...);
   }
   ```

2. **Don't do heavy work in event callbacks**
   ```typescript
   // BAD
   eventBus.subscribe(type, (event) => {
     // Heavy computation
     for (let i = 0; i < 1000000; i++) { ... }
   });

   // GOOD - defer heavy work
   eventBus.subscribe(type, (event) => {
     queueHeavyWork(event.data);
   });
   ```

3. **Don't create infinite event loops**
   ```typescript
   // BAD - infinite cascade
   eventBus.subscribe(UniverseEventType.COMBAT_STARTED, (event) => {
     eventBus.emit(UniverseEventType.COMBAT_STARTED, ...);
   });
   ```

4. **Don't forget to unsubscribe**
   ```typescript
   // BAD - memory leak
   setInterval(() => {
     eventBus.subscribe(type, callback);
   }, 1000);

   // GOOD
   const subId = eventBus.subscribe(type, callback);
   clearInterval(intervalId);
   eventBus.unsubscribe(subId);
   ```

## Performance Tips

1. **Use async emission by default** - Only use `emitSync()` when necessary
2. **Filter events early** - Subscribe to specific types instead of wildcard
3. **Batch history queries** - Query once and filter in memory
4. **Prune history regularly** - Use `clearHistory(beforeTimestamp)`
5. **Set appropriate history size** - Default 10,000 may be too much
6. **Use priority wisely** - High priority callbacks execute first

## Testing

```typescript
import { EventBus, resetGlobalEventBus } from './UniverseEventSystem';

describe('MySystem', () => {
  beforeEach(() => {
    resetGlobalEventBus(); // Clean slate for each test
  });

  test('should emit event on action', () => {
    const eventBus = getGlobalEventBus();
    const events: UniverseEvent[] = [];

    eventBus.subscribe('*', (event) => events.push(event));

    // Test your system
    mySystem.doAction();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(UniverseEventType.EXPECTED_TYPE);
  });
});
```

## Debugging

Enable verbose logging:

```typescript
const logger = new EventLogger(eventBus);
logger.setLogLevel('ALL');
logger.setConsoleLogging(true);
logger.start();

// All events are now logged to console with colored output
```

Monitor performance:

```typescript
eventBus.setPerformanceMode(true);
eventBus.setWarningThreshold(1.0); // Warn if >1ms

// Warnings appear in console for slow events
```

Inspect history:

```typescript
const allEvents = eventBus.getHistory();
console.table(allEvents.map(e => ({
  type: e.type,
  source: e.source,
  priority: e.priority,
  timestamp: new Date(e.timestamp).toISOString(),
})));
```

## Migration from DynamicEventSystem

The UniverseEventSystem is complementary to DynamicEventSystem:

- **DynamicEventSystem**: Player-facing gameplay events (emergencies, discoveries)
- **UniverseEventSystem**: System-to-system communication (state changes, triggers)

You can use both systems together:

```typescript
// DynamicEventSystem for player events
dynamicEvents.generateEmergency(...);

// UniverseEventSystem for system communication
eventBus.emit(UniverseEventType.SIEGE_STARTED, ...);
```

## Architecture Diagram

```
┌─────────────────┐
│  ConquestSystem │──┐
└─────────────────┘  │
                     │
┌─────────────────┐  │    ┌──────────────────┐
│ PopulationSystem│──┼───▶│  EventBus        │
└─────────────────┘  │    │  (Global)        │
                     │    └──────────────────┘
┌─────────────────┐  │           │
│  EconomySystem  │──┘           │
└─────────────────┘              │
                                 ▼
                          ┌──────────────┐
                          │Event History │
                          │(Max 10k)     │
                          └──────────────┘
```

## Support

For issues or questions:
1. Check the usage examples in `examples/UniverseEventSystem.usage.ts`
2. Review test cases in `__tests__/UniverseEventSystem.test.ts`
3. Enable debug logging with `EventLogger`
4. Check performance stats with `getStats()`

## License

Part of the 4X Game Universe System
