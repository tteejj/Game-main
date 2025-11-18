# Living Universe Simulation System

**Phase 1: Critical Foundation** - Making the Universe Alive

This directory contains the core systems that transform a static universe into a living, breathing world with emergent gameplay and persistent consequences.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 LIVING UNIVERSE SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  UniverseSimulationController                        │  │
│  │  (The Heart - Main Simulation Loop)                  │  │
│  │                                                       │  │
│  │  • MACRO TICK (every 1 hour game time)              │  │
│  │    - Faction actions, wars, treaties                │  │
│  │    - Universe-wide economic cycles                  │  │
│  │    - Historical event generation                    │  │
│  │                                                       │  │
│  │  • MESO TICK (every 1 minute game time)             │  │
│  │    - System-level economy                           │  │
│  │    - Local traffic patterns                         │  │
│  │    - Regional events                                │  │
│  │                                                       │  │
│  │  • MICRO TICK (60 FPS for nearby entities)          │  │
│  │    - Individual NPC AI                              │  │
│  │    - Player interactions                            │  │
│  │    - Real-time physics                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HistoricalMemorySystem                              │  │
│  │  (The Brain - Universal Memory)                      │  │
│  │                                                       │  │
│  │  • Records every significant event                   │  │
│  │  • Tracks entity experiences & memories              │  │
│  │  • Manages relationships between entities            │  │
│  │  • Generates chronicles and narratives               │  │
│  │  • Queryable history for emergent storytelling       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ConsequenceEngine                                    │  │
│  │  (The Nervous System - Cascading Effects)            │  │
│  │                                                       │  │
│  │  • 1st Order: Immediate effects                      │  │
│  │  • 2nd Order: Economic ripples                       │  │
│  │  • 3rd Order: Long-term consequences                 │  │
│  │  • Rule-based consequence generation                 │  │
│  │  • Delayed effect execution                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. UniverseSimulationController

**Purpose:** The main simulation heartbeat that processes the universe at multiple time scales.

**Key Features:**
- **Multi-scale simulation:** Processes universe at macro (hours), meso (minutes), and micro (frames) scales
- **Background simulation:** Universe evolves even when player isn't looking
- **Performance optimization:** LOD system for entities based on distance from player
- **Time scaling:** Supports slow-motion, real-time, and fast-forward
- **Event queue:** Prioritizes and processes events efficiently

**Usage:**
```typescript
import { UniverseSimulationController, HistoricalMemorySystem, ConsequenceEngine } from './simulation';

const history = new HistoricalMemorySystem();
const consequences = new ConsequenceEngine();
const simulation = new UniverseSimulationController(history, consequences);

// Every frame
simulation.update(deltaTime, playerSystem);
```

### 2. HistoricalMemorySystem

**Purpose:** Universal memory that records every significant event and entity experience.

**Key Features:**
- **Event recording:** Captures all significant events with full context
- **Entity memory:** Tracks individual experiences, relationships, and learned behaviors
- **Relationship management:** Entities form allies, enemies, rivals through shared experiences
- **Trauma system:** Negative experiences change behavior permanently
- **Query system:** Powerful event querying by time, location, type, participants
- **Chronicle generation:** Converts raw events into narrative history

**Usage:**
```typescript
// Record an event
history.recordEvent({
  id: 'event_001',
  type: 'PIRATE_RAID',
  severity: 7,
  description: 'Pirates attacked Mars Station',
  participants: ['pirate_fleet', 'mars_station'],
  // ... more details
});

// Query history
const recentEvents = history.getRecentEvents(3600); // Last hour
const militaryEvents = history.queryEvents({ categories: ['MILITARY'] });

// Entity memory
const shipMemory = history.getEntityHistory('trader_ship_042');
console.log(shipMemory.trauma); // What traumatized this ship?
console.log(shipMemory.relationships); // Who are friends/enemies?

// Generate narrative
const chronicle = history.generateChronicle(startTime, endTime);
console.log(chronicle.narrative); // Auto-generated story
```

### 3. ConsequenceEngine

**Purpose:** Processes events and generates cascading consequences that ripple through the simulation.

**Key Features:**
- **Multi-order consequences:** 1st (immediate), 2nd (ripples), 3rd (long-term)
- **Rule-based system:** Configurable rules for event → consequence mapping
- **Delayed effects:** Consequences can trigger hours/days later
- **Probability-based:** Random variation in consequence generation
- **Cascading chains:** Consequences can spawn more consequences
- **Economic/diplomatic/social impacts:** Comprehensive effect modeling

**Usage:**
```typescript
// Process event
const consequences = consequences.processEvent(pirateRaidEvent);

// Consequences generated:
// 1st order (immediate):
//   - Reputation change (pirates vs station)
//   - Patrol increase (security response)
//
// 2nd order (hours later):
//   - Price increases (insurance, weapons)
//   - Trade route avoidance (traders fear the area)
//
// 3rd order (days later):
//   - Faction tensions increase
//   - War declaration probability rises

// Check delayed consequences
const ready = consequences.updatePendingConsequences(currentTime);
for (const consequence of ready) {
  executeConsequence(consequence);
}
```

## Event Types

The system supports 40+ event types across 8 categories:

### Economic
- `TRADE_COMPLETED`, `SHORTAGE`, `SURPLUS`, `MARKET_CRASH`, `SUPPLY_CHAIN_BROKEN`

### Military
- `COMBAT_STARTED`, `SHIP_DESTROYED`, `STATION_ATTACKED`, `PIRATE_RAID`, `WAR_DECLARED`

### Diplomatic
- `TREATY_SIGNED`, `ALLIANCE_FORMED`, `TRADE_AGREEMENT`, `EMBARGO`, `REPUTATION_CHANGE`

### Environmental
- `SOLAR_FLARE`, `ASTEROID_IMPACT`, `ION_STORM`, `RADIATION_BURST`

### Social
- `STATION_FOUNDED`, `POPULATION_BOOM`, `PLAGUE_OUTBREAK`, `CIVIL_UNREST`

### Discovery
- `POI_DISCOVERED`, `DERELICT_FOUND`, `ANOMALY_INVESTIGATED`

### Personal
- `RESCUE`, `DISTRESS_SIGNAL`, `ENCOUNTER`, `GOAL_ACHIEVED`

### Infrastructure
- `REACTOR_FAILURE`, `FIRE`, `HULL_BREACH`, `REPAIR_COMPLETED`

## Consequence Types

30+ consequence types that modify the universe:

### Economic
- `PRICE_CHANGE`, `SUPPLY_DISRUPTION`, `DEMAND_SPIKE`, `TRADE_ROUTE_BLOCKED`

### Diplomatic
- `REPUTATION_CHANGE`, `RELATIONSHIP_DETERIORATION`, `WAR_LIKELIHOOD_INCREASE`

### Social
- `POPULATION_FEAR`, `CIVIL_UNREST`, `MIGRATION`, `MORALE_CHANGE`

### Military
- `PATROL_INCREASE`, `MILITARY_ALERT`, `BOUNTY_POSTED`, `WANTED_STATUS`

### Entity Behavior
- `ENTITY_ACTION`, `BEHAVIOR_CHANGE`, `GOAL_CREATED`, `MEMORY_FORMED`, `TRAUMA_INFLICTED`

## Integration Example

See `universe-system/examples/living-universe-demo.ts` for a complete integration example showing:

1. Event recording
2. Consequence generation
3. Entity memory management
4. Historical queries
5. Chronicle generation
6. Simulation loop
7. Performance tracking

Run the demo:
```bash
cd universe-system
npm install
npm run demo:living-universe
```

## Performance Characteristics

### Time Complexity
- Event recording: **O(1)**
- Event queries: **O(n)** with filtering, **O(log n)** with spatial indexing
- Consequence generation: **O(k)** where k = number of matching rules
- Memory usage: **O(n)** where n = number of events (capped at 10,000)

### Performance Targets
- **60 FPS** maintained with 100+ active entities
- **< 3ms** per frame for AI updates
- **< 5ms** per frame for rendering
- **10,000 events** in memory (oldest pruned automatically)

### Optimization Features
- Spatial hash grid for location queries (O(1))
- Event type indexing for fast filtering
- LOD system for distant entities
- Periodic index rebuilding
- Configurable tick rates for each simulation level

## Configuration

```typescript
const config = {
  macroTickRate: 3600,      // 1 hour
  mesoTickRate: 60,         // 1 minute
  microTickRate: 1/60,      // 60 FPS
  maxActiveEntities: 100,
  maxSimultaneousEvents: 50,
  enableMacroSim: true,
  enableMesoSim: true,
  enableMicroSim: true,
  timeScale: 1.0           // 1x = realtime, 10x = fast-forward
};

const simulation = new UniverseSimulationController(history, consequences, config);
```

## Design Philosophy

### "Dwarf Fortress Level" Depth

This system achieves emergent complexity through five pillars:

1. **Everything is simulated** - Not just rendered, but truly simulated
2. **Everything has memory** - Past affects future decisions
3. **Everything has consequences** - Actions ripple outward
4. **Everything has agency** - Entities pursue goals
5. **Everything is recorded** - History is queryable and generates narrative

### Emergent Gameplay Examples

**Example 1: Pirate Raid → War**
```
1. Pirates raid station (event)
2. Station faction anger increases (1st order consequence)
3. Patrol frequency doubles in region (1st order consequence)
4. Insurance prices spike (2nd order consequence)
5. Traders avoid region (2nd order consequence)
6. Station suffers economic downturn (2nd order consequence)
7. Faction declares war on pirate base (3rd order consequence)
```

**Example 2: Station Destroyed → Supply Chain Collapse**
```
1. Station destroyed by asteroid (event)
2. All trade routes through station blocked (1st order consequence)
3. Dependent stations face shortages (2nd order consequence)
4. Prices spike for missing commodities (2nd order consequence)
5. Faction economic crisis (3rd order consequence)
6. Civil unrest at affected stations (3rd order consequence)
7. Refugees migrate to other systems (3rd order consequence)
```

**Example 3: NPC Learning**
```
1. Trader nearly destroyed by pirates (event)
2. Trauma recorded in ship memory (consequence)
3. Ship develops "avoid pirate regions" behavior (learned)
4. Ship shares experience with faction members (social)
5. Other traders also avoid region (emergent)
6. Trade prices change due to reduced supply (systemic)
```

## Future Enhancements (Phase 2+)

### Phase 2: Entity Depth
- Extended NPC memory with complex decision trees
- Goal-driven behavior (NPCs pursue ambitions)
- Personality trait interactions
- Adaptive AI that learns from success/failure

### Phase 3: Faction Dynamics
- Dynamic diplomacy (wars, treaties, territorial changes)
- Faction economic needs (resource-driven conflicts)
- Political intrigue and subterfuge
- Supply chain warfare

### Phase 4: Storytelling
- News generation from events
- Rumor propagation and distortion
- "While you were away" summaries
- Procedural quest generation from history

## Related Documentation

- `/docs/08-AI-BACKGROUNDS-INTEGRATION.md` - AI and background systems design
- `/LIVING_UNIVERSE_ARCHITECTURE.md` - Original architecture spec
- `/LIVING_UNIVERSE_GAP_ANALYSIS.md` - Gap analysis and roadmap

## Development Status

**Phase 1: COMPLETE** ✅
- UniverseSimulationController
- HistoricalMemorySystem
- ConsequenceEngine

**Phase 2: IN PROGRESS** 🚧
- Extended entity memory
- NPC goal systems
- Emergent behavior engine

**Phase 3: PLANNED** 📋
- Dynamic diplomacy
- Faction economics
- Territorial control

**Phase 4: PLANNED** 📋
- News generation
- Chronicle system
- Procedural quests

---

*Built for "Dwarf Fortress level" emergent complexity*
