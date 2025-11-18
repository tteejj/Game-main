# Storytelling Systems - Phase 4

**Emergent Storytelling Layer** that transforms raw historical events into compelling narratives, news, rumors, and dynamic lore.

## Overview

The storytelling systems take the "raw data" of universe simulation and turn it into **engaging narratives** that make the universe feel alive and storied. Events become news, news becomes rumors, patterns become chronicles, and epic deeds become legends.

## Systems

### 1. NewsGenerationEngine

Converts historical events into news articles with multiple perspectives and biases.

**Features:**
- Template-based headline and body generation
- Multiple bias types (NEUTRAL, PRO_PARTICIPANT, ANTI_PARTICIPANT, SENSATIONALIST)
- Importance and veracity ratings
- Multi-perspective coverage of same event

**Example:**
```typescript
const newsEngine = new NewsGenerationEngine();

const article = newsEngine.generateNews(
  pirateRaidEvent,
  'Galactic Times',
  'NEUTRAL'
);

console.log(article.headline);
// "Pirate Gang Attacks Mars Trading Convoy"

// Generate from pirate's perspective
const pirateNews = newsEngine.generateNews(
  pirateRaidEvent,
  'Outer Rim Herald',
  'PRO_PARTICIPANT'
);
// Different spin on same event!
```

### 2. RumorPropagationSystem

Models how information spreads through communication networks and becomes distorted.

**Features:**
- Network-based propagation (nodes and connections)
- 7 distortion types (exaggeration, substitution, addition, omission, etc.)
- Credibility decay based on node reliability
- Hop tracking

**Example:**
```typescript
const rumors = new RumorPropagationSystem();

// Register communication network
rumors.registerNode('alpha_centauri', {
  reliability: 0.8,
  connections: ['sol', 'proxima']
});

// Create rumor from news
const rumor = rumors.createRumorFromNews(newsArticle, 'alpha_centauri');

// Propagate through network - content distorts!
const distorted = rumors.propagateRumor(rumor.id, 'alpha_centauri', 'sol');
```

### 3. AbsenceSimulator

Simulates what happened while player was away and generates summary.

**Features:**
- Fast-forward simulation at multiple time scales
- Categorizes events (wars, crises, economic changes, diplomatic shifts)
- Personal impact tracking for player faction
- Human-readable summary generation
- "While you were away" narrative

**Example:**
```typescript
const simulator = new AbsenceSimulator(history, consequences, diplomacy, economics);

// Player loads save 3 hours later
const summary = simulator.simulate(lastSaveTime, currentTime, playerFaction);
const report = simulator.generateTextSummary(summary);

console.log(report);
// ══════════════════════════════════════════════════════════════════════
// WHILE YOU WERE AWAY
// ══════════════════════════════════════════════════════════════════════
//
// Time Elapsed: 3 hours
//
// 🚨 BREAKING NEWS:
//   • War declared between Earth Federation and Mars Coalition
//   • Major battle in asteroid belt - 1500 casualties
// ...
```

### 4. ChronicleGenerator

Auto-generates lore, legends, and historical narratives from event patterns.

**Features:**
- 14 chronicle types (war, trade era, golden age, rise/fall, legendary deed, etc.)
- Auto-detection of historical patterns
- Legend creation with mythologization
- Prophecy generation from trend analysis
- Comprehensive faction history generation
- Era detection and categorization

**Example:**
```typescript
const chronicles = new ChronicleGenerator(history);

// Auto-detect patterns and generate chronicles
const newChronicles = chronicles.generateChronicles({
  start: dayStart,
  end: dayEnd
});

// War chronicle automatically created from military events!
// Economic era chronicle from trade patterns!

// Create legend from epic event
const legend = chronicles.createLegend(heroicEvent, 'HERO_TALE', 0.5);
// Event gets mythologized - numbers exaggerated, details added

// Generate prophecy
const prophecy = chronicles.generateProphecy('oracle', currentTime);
// Based on actual trend analysis!

// Get faction history
const history = chronicles.generateFactionHistory('earth_fed', 'Earth Federation');
// Complete chronicle with eras, achievements, rivalries
```

## Integration

All systems integrate with Phase 1 (HistoricalMemorySystem) to consume events and Phase 3 (Faction Dynamics) for context.

### Full Pipeline

```
Event Occurs
    ↓
HistoricalMemorySystem records it
    ↓
NewsGenerationEngine creates articles (multiple perspectives)
    ↓
RumorPropagationSystem spreads & distorts info through network
    ↓
ChronicleGenerator detects patterns, creates chronicles/legends
    ↓
Universe has emergent lore!
```

## Chronicle Types

1. **WAR_CHRONICLE** - Story of a conflict
2. **TRADE_ERA** - Economic period
3. **GOLDEN_AGE** - Prosperity period
4. **DARK_AGE** - Decline period
5. **RISE_OF_POWER** - Faction ascendance
6. **FALL_OF_POWER** - Faction decline
7. **LEGENDARY_DEED** - Single epic event
8. **TRAGEDY** - Catastrophic event
9. **DISCOVERY** - Scientific/exploration breakthrough
10. **ALLIANCE_STORY** - Alliance formation/history
11. **PROPHECY** - Prediction from trends
12. **FOLK_TALE** - Cultural story
13. **HERO_BIOGRAPHY** - Entity life story
14. **FACTION_HISTORY** - Comprehensive faction chronicle

## Legend Categories

1. **HERO_TALE** - Stories of heroic deeds
2. **CAUTIONARY_TALE** - Warnings and lessons
3. **ORIGIN_STORY** - How things began
4. **MONSTER_MYTH** - Terrifying entities
5. **LOST_TREASURE** - Hidden wealth
6. **CURSED_PLACE** - Dangerous locations
7. **PROPHECY** - Foretold events

## Distortion Types

When rumors propagate, they can be distorted in these ways:

1. **EXAGGERATION** - Numbers inflated
2. **MINIMIZATION** - Severity reduced
3. **SUBSTITUTION** - Details replaced
4. **ADDITION** - New details added
5. **OMISSION** - Details removed
6. **REVERSAL** - Facts inverted
7. **COMBINATION** - Multiple distortions

## Performance

- News generation: O(1) per event
- Rumor propagation: O(connections) per hop
- Chronicle detection: O(n log n) for event clustering
- Absence simulation: Scales by time range (10-100 ticks)

## Usage Example

See `examples/storytelling-demo.ts` for comprehensive demonstrations.

```typescript
import {
  NewsGenerationEngine,
  RumorPropagationSystem,
  AbsenceSimulator,
  ChronicleGenerator
} from './storytelling';

// Initialize systems
const news = new NewsGenerationEngine();
const rumors = new RumorPropagationSystem();
const chronicles = new ChronicleGenerator(history);

// When event occurs
const article = news.generateNews(event, 'Publisher', 'NEUTRAL');
const rumor = rumors.createRumorFromNews(article, location);

// Periodically generate chronicles
const newChronicles = chronicles.generateChronicles();
```

## Design Philosophy

**Everything tells a story.** Raw simulation data is meaningless to players - they need narrative context. These systems transform:

- Events → Understandable news
- News → Spreading information (rumors)
- Patterns → Historical meaning (chronicles)
- Epic moments → Cultural mythology (legends)
- Trends → Predictions (prophecies)

The universe doesn't just simulate - it **remembers, mythologizes, and tells its own stories**.

## Dwarf Fortress Level Features

- ✓ Auto-generated historical chronicles
- ✓ Legends that grow from real events
- ✓ Information distortion and propaganda
- ✓ Multiple perspectives on same events
- ✓ Faction histories that write themselves
- ✓ Prophecies based on actual trends
- ✓ "While you were away" summaries
- ✓ Events become mythology over time

## Future Enhancements

- Artist/bard NPCs who compose songs about events
- Cultural variations in storytelling styles
- Archaeological discovery of "ancient" chronicles
- Player-written history books from their perspective
- In-game libraries with searchable lore
- Reputation system based on how news portrays you
