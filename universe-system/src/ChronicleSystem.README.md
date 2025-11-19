# Chronicle System Documentation

## Overview

The Chronicle System is an advanced narrative generation and event tracking system that creates emergent stories from historical events in your 4X space game. It tracks causality, identifies turning points, and generates readable narratives that make the universe feel alive and reactive.

## Features

### Core Capabilities

✅ **Event Recording & Tracking**
- Records all significant events with full context
- Tracks event relationships and causality
- Automatic event linking based on participants, location, and timing
- Memory-efficient storage (max 100k events)

✅ **Narrative Generation**
- Generates readable stories from event chains
- Multiple narrative styles (Formal, Epic, Casual)
- Faction-specific narratives with bias
- Automatic story arc detection

✅ **Event Causality**
- Tracks cause-and-effect relationships
- Builds event causality graphs
- Identifies event chains (war campaigns, economic cycles, etc.)
- Multiple relationship types (CAUSED, ENABLED, ESCALATED, etc.)

✅ **Turning Point Identification**
- Automatically identifies key moments
- Calculates event impact scores
- Tracks state changes before/after events

✅ **Efficient Querying**
- Complex queries complete in < 10ms
- Cached significant events
- Indexed by time, type, location, participants
- Flexible filtering system

✅ **Integration Ready**
- Works with existing HistoricalMemorySystem
- Integrates with UniverseSimulationController
- Event subscriber pattern
- UI-ready outputs

## Architecture

```
ChronicleSystem
├── Event Recording
│   ├── recordEvent() - Add events to history
│   └── linkEvents() - Connect related events
│
├── Narrative Generation
│   ├── generateNarrative() - Create stories
│   ├── Story arc detection
│   └── Multiple narrative styles
│
├── Querying
│   ├── queryEvents() - Filter events
│   ├── getEventChain() - Follow causality
│   ├── getFactionHistory() - Faction timeline
│   └── getSignificantEvents() - Major milestones
│
└── Analysis
    ├── identifyTurningPoints()
    ├── calculateSignificance()
    └── Performance tracking
```

## Installation & Setup

### Basic Setup

```typescript
import { ChronicleSystem } from './ChronicleSystem';
import { HistoricalMemorySystem } from './simulation/HistoricalMemorySystem';

// 1. Create history system
const historySystem = new HistoricalMemorySystem();

// 2. Create chronicle system
const chronicleSystem = new ChronicleSystem(historySystem);
```

### Integration with Simulation

```typescript
import { EnhancedSimulationController } from './ChronicleSystem.integration';

// Use enhanced controller for automatic chronicle generation
const simulation = new EnhancedSimulationController(
  historySystem,
  consequenceEngine,
  config
);

// Configure chronicle generation
simulation.configureChronicles({
  enabled: true,
  autoGenerateInterval: 604800,    // Weekly
  minEventsForChronicle: 5,
  significanceThreshold: 3
});
```

## API Reference

### Recording Events

```typescript
// Record an event
const event: HistoricalEventExtended = {
  id: 'evt_001',
  timestamp: Date.now() / 1000,
  type: 'WAR_DECLARED',
  severity: 9,
  category: 'MILITARY',
  location: new Vector3(1000, 2000, 3000),
  participants: ['faction_a', 'faction_b'],
  actors: ['faction_a', 'faction_b'],
  description: 'War declared between Faction A and Faction B',
  outcome: 'Hostilities commenced',
  significance: 9,
  consequences: [],
  relatedEvents: [],
  data: { casusBelli: 'territorial_dispute' },
  witnessed: false,
  priority: 10,
  tags: ['war', 'major']
};

chronicleSystem.recordEvent(event);
```

### Linking Events

```typescript
// Manually link related events
chronicleSystem.linkEvents(
  'evt_001',              // Event 1 ID
  'evt_002',              // Event 2 ID
  'CAUSED',               // Relationship type
  0.95,                   // Strength (0-1)
  'War declaration led to first battle'  // Optional description
);
```

**Relationship Types:**
- `CAUSED` - Event A directly caused Event B
- `ENABLED` - Event A made Event B possible
- `PREVENTED` - Event A stopped Event B
- `COINCIDED` - Events happened at same time
- `PARALLEL` - Similar events in different places
- `ESCALATED` - Event B escalated from Event A
- `RESOLVED` - Event B resolved Event A
- `RETALIATION` - Event B was retaliation for Event A
- `CONSEQUENCE` - Event B was a consequence of Event A

### Generating Narratives

```typescript
// Generate chronicle for faction
const chronicle = chronicleSystem.generateNarrative(
  'faction_crimson',      // Faction ID
  604800,                 // Timespan (1 week in seconds)
  {
    perspective: 'FACTION_BIASED',  // or 'NEUTRAL', 'DRAMATIC', 'ANALYTICAL'
    detail: 'STANDARD',             // or 'BRIEF', 'DETAILED'
    tone: 'EPIC'                    // or 'FORMAL', 'CASUAL'
  }
);

console.log(chronicle.title);
console.log(chronicle.narrative);
console.log(chronicle.turningPoints);
```

**Chronicle Object:**
```typescript
interface Chronicle {
  id: string;
  title: string;                    // Generated title
  timespan: { start: number; end: number };
  events: HistoricalEventExtended[];
  narrative: string;                // Generated story text
  keyFigures: string[];             // Important participants
  majorConsequences: string[];      // Long-term impacts
  turningPoints: TurningPoint[];    // Key moments
  factionId?: string;
  tags: string[];
  significance: number;             // 0-10 rating
}
```

### Querying Events

```typescript
// Query events with filters
const events = chronicleSystem.queryEvents({
  startTime: 1000,
  endTime: 5000,
  eventTypes: ['WAR_DECLARED', 'BATTLE'],
  categories: ['MILITARY'],
  factionIds: ['faction_a'],
  systemIds: ['system_001'],
  minSignificance: 7,
  tags: ['war'],
  limit: 20
});
```

### Getting Event Chains

```typescript
// Get complete event chain from a root event
const chain = chronicleSystem.getEventChain('evt_001', 10);

console.log(chain.chainType);      // WAR_CAMPAIGN, ECONOMIC_CYCLE, etc.
console.log(chain.events);         // All events in chain
console.log(chain.relationships);  // Connections between events
console.log(chain.narrative);      // Generated chain story
```

**Chain Types:**
- `WAR_CAMPAIGN` - Series of battles
- `ECONOMIC_CYCLE` - Boom/bust patterns
- `DIPLOMATIC_SAGA` - Alliance/betrayal
- `EXPANSION` - Territorial growth
- `DECLINE` - Fall of faction
- `DISCOVERY` - Exploration events
- `TECHNOLOGICAL` - Research breakthroughs
- `CRISIS` - Emergency situations

### Faction History

```typescript
// Get all events for a faction
const history = chronicleSystem.getFactionHistory(
  'faction_crimson',
  2592000  // Optional: last 30 days
);

// Get all chronicles for a faction
const chronicles = chronicleSystem.getChronicles('faction_crimson');
```

### Significant Events

```typescript
// Get most significant events
const significant = chronicleSystem.getSignificantEvents(10);

// These are cached for performance
// Events with significance >= 7 are automatically cached
```

## Event Types Tracked

### Military Events
- `WAR_DECLARED` - War begins
- `WAR_ENDED` - War concludes
- `BATTLE` - Military engagement
- `STATION_ATTACKED` - Station under attack
- `STATION_CAPTURED` - Station seized
- `STATION_DESTROYED` - Station obliterated
- `PIRATE_RAID` - Pirate attack

### Economic Events
- `ECONOMIC_BOOM` - Market surge
- `ECONOMIC_RECESSION` - Economic downturn
- `MARKET_CRASH` - Market collapse
- `TRADE_COMPLETED` - Successful trade
- `SHORTAGE` - Resource shortage
- `SURPLUS` - Resource surplus

### Diplomatic Events
- `ALLIANCE_FORMED` - New alliance
- `ALLIANCE_DISSOLVED` - Alliance ends
- `TREATY_SIGNED` - Treaty established
- `TREATY_BROKEN` - Treaty violated
- `TRADE_AGREEMENT` - Trade deal
- `EMBARGO` - Trade restrictions

### Social Events
- `POPULATION_BOOM` - Population growth
- `POPULATION_DECLINE` - Population loss
- `CIVIL_UNREST` - Social upheaval
- `STRIKE` - Labor action
- `CELEBRATION` - Public celebration
- `REFUGEE_CRISIS` - Mass migration

### Discovery Events
- `POI_DISCOVERED` - Point of interest found
- `DERELICT_FOUND` - Abandoned ship/station
- `ANOMALY_DETECTED` - Unusual phenomenon
- `SYSTEM_MAPPED` - System fully explored

### Infrastructure Events
- `STATION_FOUNDED` - New station built
- `STATION_ABANDONED` - Station deserted
- `REACTOR_FAILURE` - Power failure
- `REPAIR_COMPLETED` - Repairs finished

## Example Narratives

### Epic War Chronicle

```
THE CRIMSON-AZURE WAR

In the span of three solar cycles, the universe witnessed great upheaval. From
military, diplomatic, social events that shook the very foundations of
civilization, emerged a tale of 27 defining moments.

THE BEGINNING OF HOSTILITIES

Over seven days, the drums of war echoed across the systems. In the first hour
of the conflict, the mighty Crimson Federation declared total war upon the
Azure Alliance. This directly led to the legendary Battle of Proxima Nebula,
where 2,500 souls were lost to the void.

THE TURNING OF THE TIDE

At the dawn of the second cycle, Azure forces led a desperate counteroffensive,
reclaiming three border outposts. The population rallied behind their heroes.

THE FINAL RECKONING

As the third cycle approached, both sides agreed to the Treaty of New Haven.
The war had changed everything - old alliances shattered, new powers emerged,
and the balance of galactic power shifted forever.
```

### Formal Economic Chronicle

```
BETA SECTOR ECONOMIC CRISIS

During a period of 14 days, 23 significant events were recorded, spanning
economic, social, infrastructure categories.

At Day 1, 09:00, major commodity shortage detected in Beta Sector. Prices of
food, water, and oxygen spiked by 300%. This enabled black market expansion.
At Day 3, 08:00, Azure Alliance imposed price controls and rationing, leading
to civil unrest.

At Day 8, 12:00, emergency supply convoy arrived from Crimson Federation,
averting the crisis and improving relations between factions.

The most significant development was the emergency supply convoy arrival,
which fundamentally altered the course of events.
```

### Casual Discovery Chronicle

```
THE OMEGA NEBULA DISCOVERY

Over 30 days, things got pretty interesting in the Omega Nebula region.

Captain Sarah Chen discovered an ancient alien artifact, which got everyone
excited. Three factions launched a joint research expedition - unprecedented
cooperation. When the artifact activated, it revealed jump gate coordinates
to a whole new sector.

Then things got messy. Claims rush for new territories, disputes between
factions, the usual. But hey, we found a new sector!
```

## Performance Characteristics

### Query Performance
- Simple queries: < 5ms
- Complex filtered queries: < 10ms
- Event chain traversal: < 15ms
- Chronicle generation: < 50ms

### Memory Management
- Max events: 100,000 (automatic pruning)
- Max chronicles: 1,000 per faction
- Max relationships: 50,000 (weak links pruned)
- Significant events cached for 60s

### Scalability
- Handles 1000+ events/minute
- Efficient graph traversal (DFS)
- Indexed lookups by time, type, location
- Background chronicle generation

## Integration Patterns

### Pattern 1: Automatic Recording

```typescript
// In UniverseSimulationController
private generateMajorEvents(): void {
  const event = this.createMajorEvent('WAR');

  // Record to both systems
  this.history.recordEvent(event);
  this.chronicleSystem.recordEvent(event as HistoricalEventExtended);
}
```

### Pattern 2: Event Subscriber

```typescript
// Subscribe to all simulation events
const subscriber = new ChronicleEventSubscriber(chronicleSystem);

// In your event system
eventEmitter.on('historical-event', (event) => {
  subscriber.onSimulationEvent(event);
});
```

### Pattern 3: UI Integration

```typescript
// UI Manager for displaying chronicles
const uiManager = new ChronicleUIManager(chronicleSystem);

// Get new chronicles for player
const newChronicles = uiManager.getNewChronicles();

// Format for display
const formatted = uiManager.formatChronicleForDisplay(chronicle);

// News ticker
const news = uiManager.getNewsTicker(5);
```

## Advanced Features

### Custom Relationship Types

```typescript
// Define custom relationships
type CustomRelationType = RelationshipType | 'BETRAYAL' | 'HEROIC_RESCUE';

// Use in linking
chronicleSystem.linkEvents(
  'evt_alliance',
  'evt_backstab',
  'BETRAYAL' as RelationshipType,
  1.0
);
```

### Narrative Style Customization

```typescript
// Create custom narrative generator
const customNarrative = chronicleSystem.generateNarrative(
  'faction_id',
  timespan,
  {
    perspective: 'FACTION_BIASED',  // Tell story from faction's POV
    detail: 'DETAILED',             // Include all context
    tone: 'EPIC'                    // Dramatic language
  }
);
```

### Event Significance Calculation

```typescript
// Significance is calculated from:
// - Event severity (1-10)
// - Number of participants
// - Event priority
// - Event type importance
// - Player witness status

// Events with significance >= 7 are automatically tracked as "major"
```

### Turning Point Detection

Turning points are identified when:
- Event severity spikes (> +3 from previous)
- Event category shifts
- Event has many consequences (> 5)
- Event has many participants (> 5)

```typescript
// Access turning points
chronicle.turningPoints.forEach(tp => {
  console.log(`${tp.description}`);
  console.log(`Impact: ${tp.impactScore}/10`);
  console.log(`Before: ${tp.beforeState}`);
  console.log(`After: ${tp.afterState}`);
});
```

## Best Practices

### 1. Event Recording
```typescript
// ✅ Good: Include all context
const event: HistoricalEventExtended = {
  id: generateId(),
  timestamp: getCurrentTime(),
  type: 'BATTLE',
  severity: 8,
  category: 'MILITARY',
  location: battleLocation,
  participants: [attackerId, defenderId],
  actors: [attackerId],  // Who initiated
  description: 'Clear, concise description',
  outcome: 'What happened as a result',
  significance: 8,
  consequences: ['evt_next'],
  relatedEvents: ['evt_previous'],
  data: { casualties: 1500, victor: attackerId }
};

// ❌ Bad: Missing context
const event = {
  id: 'evt_001',
  description: 'Battle happened'
  // Missing crucial data
};
```

### 2. Chronicle Generation Timing
```typescript
// ✅ Good: Generate periodically
setInterval(() => {
  simulation.generateAllFactionChronicles();
}, 604800000);  // Weekly

// ❌ Bad: Generate on every event
eventEmitter.on('event', () => {
  chronicleSystem.generateNarrative();  // Too frequent!
});
```

### 3. Memory Management
```typescript
// ✅ Good: Let system manage memory
chronicleSystem.recordEvent(event);
// Automatic pruning when limits reached

// ❌ Bad: Store references indefinitely
const allEvents = [];
chronicleSystem.recordEvent(event);
allEvents.push(event);  // Memory leak!
```

### 4. Query Optimization
```typescript
// ✅ Good: Use filters
const events = chronicleSystem.queryEvents({
  categories: ['MILITARY'],
  minSignificance: 7,
  limit: 20
});

// ❌ Bad: Filter after query
const events = chronicleSystem.queryEvents({}).filter(e =>
  e.category === 'MILITARY' && e.significance >= 7
);
```

## Troubleshooting

### Chronicle Not Generating
```typescript
// Check if enough events
const history = chronicleSystem.getFactionHistory('faction_id');
console.log(`Events: ${history.length}`);  // Need >= 5 by default

// Check configuration
simulation.configureChronicles({
  minEventsForChronicle: 3  // Lower threshold
});
```

### Queries Too Slow
```typescript
// Check query complexity
const stats = chronicleSystem.getPerformanceStats();
console.log(`Average query: ${stats.averageQueryTime}ms`);

// Optimize with better filters
const events = chronicleSystem.queryEvents({
  limit: 100,  // Add limit
  categories: ['MILITARY']  // Narrow scope
});
```

### Memory Issues
```typescript
// Check memory usage
const stats = chronicleSystem.getPerformanceStats();
console.log(`Total events: ${stats.totalEvents}`);
console.log(`Relationships: ${stats.totalRelationships}`);

// System auto-prunes at limits, but you can force cleanup
// by configuring lower thresholds in ChronicleSystem constructor
```

## Examples

See `ChronicleSystem.examples.ts` for:
- Basic usage example
- Integration example
- Advanced features example
- Multiple narrative styles

See `ChronicleSystem.integration.ts` for:
- UniverseSimulationController integration
- Event subscriber pattern
- UI manager implementation

## Contributing

When extending the Chronicle System:

1. Maintain performance characteristics (< 10ms queries)
2. Follow memory limits (100k events max)
3. Add new relationship types thoughtfully
4. Test narrative generation with various event sequences
5. Update documentation with new features

## License

Part of the 4X Space Game Universe System
