# Universe Integration Module

## Complete Integration of Space, NPCs, and AI Systems

This module provides the **complete integration layer** that brings together:

- ✅ **Space/Universe Systems**: Procedural generation, physics, hazards, stations
- ✅ **NPC Ships**: Realistic physics, navigation, and subsystems
- ✅ **Universe-Aware AI**: Environmental decision-making with learning
- ✅ **Faction Strategic AI**: Territory control and grand strategy
- ✅ **Dynamic Events**: Event-driven behaviors and emergent gameplay

---

## Quick Start

```typescript
import {
  StarSystem,
  UniverseOrchestrator,
  IntegratedUniverseOrchestrator,
  FactionStrategy,
  NPCShip,
  ShipType
} from 'universe-system';

// 1. Create a star system
const starSystem = new StarSystem('sol', 'Solar System', {
  civilizationLevel: 8,
  allowHazards: true,
  allowStations: true,
  allowNPCTraffic: true
});

// 2. Create orchestrators
const baseOrchestrator = new UniverseOrchestrator();
const integrated = new IntegratedUniverseOrchestrator(
  starSystem,
  baseOrchestrator
);

// 3. Register a faction with strategic AI
integrated.registerFaction('earth-gov', FactionStrategy.DIPLOMATIC, [
  {
    id: 'earth-space',
    center: { x: 0, y: 0, z: 0 },
    radius: 200000,
    controlLevel: 0.9,
    population: 1000000,
    economicValue: 1000,
    militaryPresence: 10,
    strategicValue: 1.0,
    threats: []
  }
]);

// 4. Create an NPC with universe-aware AI
const ship = new NPCShip(
  'trader-1',
  'Merchant Vessel Aurora',
  ShipType.CARGO_FREIGHTER,
  new Vector3(100000, 0, 0)
);

integrated.registerIntegratedNPC(ship, {
  greed: 0.8,        // High profit motivation
  caution: 0.7,      // Careful navigator
  curiosity: 0.5,    // Moderate explorer
  aggression: 0.2,   // Peaceful trader
  loyalty: 0.6,
  trustingness: 0.5,
  adaptability: 0.7,
  patience: 0.6
}, 'earth-gov');

// 5. Run simulation
setInterval(() => {
  integrated.update(1.0); // 1 second per update

  // Get NPC status
  const npcShip = integrated.getShip('trader-1');
  if (npcShip?.lastDecision) {
    console.log(`Action: ${npcShip.lastDecision.chosenAction}`);
    console.log(`Reason: ${npcShip.lastDecision.reasoning}`);
  }
}, 1000);
```

---

## Architecture Overview

### 1. UniverseContextProvider
**Environmental awareness for NPCs**

Provides real-time context about:
- Nearby celestial bodies (planets, stars, stations)
- Active hazards (solar storms, debris fields, radiation)
- Points of interest (asteroids, derelicts, anomalies)
- Faction territories and safe zones
- Navigation conditions (traffic, visibility, radiation)

```typescript
const context = contextProvider.getContext({
  position: ship.position,
  scanRadius: 100000, // 100km
  factionId: 'earth-gov'
});

console.log(`Threat Level: ${context.threatLevel * 100}%`);
console.log(`Active Hazards: ${context.activeHazards.length}`);
console.log(`Nearest Station: ${context.nearestStation?.name}`);
```

### 2. UniverseAwareAI
**Decision-making integrated with environment**

Makes intelligent decisions based on:
- Environmental hazards and safety
- Opportunities (mining, salvage, exploration)
- Ship status (fuel, hull, cargo)
- Faction relationships
- Personality traits

```typescript
const decision = ai.makeUniverseDecision({
  situation: 'cargo_hauling',
  universeContext: context,
  position: ship.position,
  velocity: ship.velocity,
  fuelLevel: 0.6,
  hullIntegrity: 0.9,
  availableActions: ['TRAVEL', 'DOCK', 'TRADE', 'FLEE'],
  resources: { fuel: 0.6, cargo: 50 },
  threats: [],
  opportunities: ['TRADE_STATION']
});

console.log(`Chosen Action: ${decision.chosenAction}`);
console.log(`Confidence: ${decision.confidence * 100}%`);
console.log(`Reasoning: ${decision.reasoning}`);
```

**Decision Priorities** (highest to lowest):
1. **Critical hazard avoidance** - Immediate survival
2. **Moderate hazard avoidance** - Safety
3. **Navigation safety** - Path finding
4. **Opportunities** - Profit/exploration (when safe)
5. **Fuel conservation** - Resource management
6. **Hull repairs** - Maintenance

### 3. FactionAI
**Strategic control and territory management**

Handles faction-level decisions:
- Territory expansion and defense
- Fleet deployment
- Economic planning
- Diplomatic strategy
- Military campaigns

```typescript
const faction = new FactionAI(
  'mining-guild',
  FactionStrategy.ECONOMIC,
  starSystem,
  contextProvider,
  diplomacy,
  economics,
  history
);

// Faction will automatically:
// - Evaluate expansion opportunities
// - Deploy fleets to defend territory
// - Build stations in profitable locations
// - Form alliances or declare war
// - Manage resources and supply chains
```

**Faction Strategies:**
- **EXPANSIONIST** - Aggressively expand territory
- **ECONOMIC** - Focus on trade and profit
- **DEFENSIVE** - Protect existing territory
- **DIPLOMATIC** - Build alliances
- **MILITARISTIC** - Build military power
- **SCIENTIFIC** - Research and exploration
- **OPPORTUNISTIC** - Adapt to circumstances
- **ISOLATIONIST** - Minimal external interaction

### 4. IntegratedUniverseOrchestrator
**Main integration hub**

Coordinates all systems:
- Updates NPCs with universe-aware AI
- Updates faction strategic AI
- Generates dynamic events
- Records historical events
- Manages event propagation

```typescript
// The orchestrator handles everything:
integratedOrchestrator.update(deltaTime);

// NPCs automatically:
// - Perceive their environment
// - Make context-aware decisions
// - Navigate safely around hazards
// - Pursue opportunities
// - React to events
// - Learn from experiences

// Factions automatically:
// - Evaluate strategic options
// - Expand territory
// - Deploy military forces
// - Conduct diplomacy
// - Manage economy
```

---

## Key Features

### Environmental Awareness
NPCs perceive and react to:
- ☀️ Solar storms and radiation
- 💥 Debris fields and asteroid belts
- 🌍 Gravitational fields
- 🔴 Magnetic anomalies
- 👁️ Visibility and sensor interference
- 🚦 Traffic density
- 🏴 Hostile territories

### Intelligent Decision Making
NPCs decide based on:
- 🛡️ **Safety** (0-100%) - Hazard avoidance priority
- 💰 **Profit** (0-100%) - Opportunity pursuit
- ⚡ **Efficiency** (0-100%) - Resource management
- 🔍 **Exploration** (0-100%) - Curiosity drive
- 🗺️ **Territorial** (0-100%) - Faction loyalty

### Personality-Driven Behavior
Different personalities behave differently:

**Cautious Trader** (high caution, low aggression):
- Avoids hazards at all costs
- Takes safe, established routes
- Flees from threats immediately
- Docks frequently for repairs

**Bold Explorer** (high curiosity, low caution):
- Investigates anomalies despite danger
- Takes risky shortcuts
- Pushes fuel limits
- Seeks unknown territories

**Aggressive Pirate** (high aggression, high greed):
- Pursues valuable targets
- Ignores moderate hazards
- Engages in combat
- Raids trade lanes

### Learning and Adaptation
NPCs learn from experience:
- Build expertise in domains (trading, combat, navigation)
- Develop strategies based on success/failure
- Modify personality from traumatic events
- Remember lessons and apply them

### Dynamic Events
Events drive emergent behavior:
- 🌟 Solar flares affect navigation
- 🏴‍☠️ Pirate raids trigger security responses
- 💎 Resource discoveries attract miners
- 📡 Distress signals prompt rescue missions
- 💥 Market crashes affect trade routes
- 🔬 Technology breakthroughs shift balance

---

## Integration Layers

```
┌─────────────────────────────────────────────────┐
│   IntegratedUniverseOrchestrator (Main Loop)    │
│  - Coordinates all systems                      │
│  - Generates dynamic events                     │
│  - Records history                              │
└───────────────┬─────────────────────────────────┘
                │
    ┌───────────┴───────────┬─────────────────────────┐
    │                       │                         │
┌───▼──────────┐    ┌──────▼────────┐    ┌──────────▼──────┐
│ Star System  │    │ NPCs with AI  │    │  Faction AI     │
│ - Hazards    │    │ - Context     │    │  - Strategy     │
│ - Stations   │    │ - Decisions   │    │  - Territory    │
│ - Physics    │    │ - Learning    │    │  - Diplomacy    │
└──────────────┘    └───────────────┘    └─────────────────┘
        │                    │                     │
        │    ┌───────────────▼────────────┐        │
        └────► UniverseContextProvider    ◄────────┘
             │ - Spatial awareness        │
             │ - Hazard detection         │
             │ - Opportunity assessment   │
             └────────────────────────────┘
```

---

## Example Scenarios

### Scenario 1: Hazard Navigation
```typescript
// Merchant ship encounters debris field
// AI automatically:
// 1. Detects hazard via UniverseContextProvider
// 2. Assesses severity and distance
// 3. Calculates safe route
// 4. Adjusts speed for visibility
// 5. Records experience for future reference
```

### Scenario 2: Opportunistic Pirate
```typescript
// Pirate ship spots valuable trader
// AI automatically:
// 1. Evaluates target cargo value
// 2. Assesses risk (escort ships? defenses?)
// 3. Checks fuel and hull status
// 4. Compares to personality (greed vs caution)
// 5. Decides to pursue or ignore
```

### Scenario 3: Faction Expansion
```typescript
// Mining Guild identifies rich asteroid field
// Faction AI automatically:
// 1. Evaluates strategic value
// 2. Checks territorial threats
// 3. Calculates costs and benefits
// 4. Deploys defensive fleet
// 5. Builds mining station
// 6. Registers territory claim
```

---

## Performance Optimization

The integration module is designed for efficiency:

- **Throttled Updates**: NPCs update at configurable frequency (default: 10 Hz)
- **Faction Updates**: Strategic AI runs less frequently (default: 0.1 Hz)
- **Spatial Queries**: Efficient range-based context gathering
- **Event Batching**: Multiple events processed together
- **Lazy Evaluation**: Only compute what's needed when needed

---

## API Reference

### IntegratedUniverseOrchestrator

#### Methods

```typescript
// Register an integrated NPC
registerIntegratedNPC(
  ship: NPCShip,
  personality?: PersonalityTraits,
  factionId?: string
): void

// Register a faction
registerFaction(
  factionId: string,
  strategy: FactionStrategy,
  territories?: Territory[]
): void

// Main update loop
update(deltaTime: number): void

// Query systems
getShip(id: string): IntegratedNPCShip | undefined
getFaction(id: string): FactionAI | undefined
getContextProvider(): UniverseContextProvider
getStarSystem(): StarSystem

// Generate reports
generateStatusReport(): string
```

### UniverseContextProvider

```typescript
// Get full context
getContext(query: ContextQuery): UniverseContext

// Safety checks
isSafePosition(position: Vector3, factionId?: string): boolean
findNearestSafePosition(position: Vector3): Vector3 | null
getEscapeVector(position: Vector3): Vector3

// Territory management
registerTerritory(factionId: string, center: Vector3, radius: number): void
```

### UniverseAwareAI

```typescript
// Make decision
makeUniverseDecision(context: UniverseDecisionContext): UniverseDecision

// Record outcome
recordUniverseOutcome(
  context: UniverseDecisionContext,
  action: string,
  outcome: 'SUCCESS' | 'FAILURE' | 'MIXED',
  reward: number,
  damageReceived?: number,
  fuelConsumed?: number,
  profitEarned?: number
): void

// Introspection
getWeights(): DecisionWeights
setWeights(weights: Partial<DecisionWeights>): void
getStatistics(): AIStatistics
generateSituationReport(context: UniverseDecisionContext): string
```

### FactionAI

```typescript
// Update faction
update(deltaTime: number): void

// Manage resources
addTerritory(territory: Territory): void
addGoal(goal: FactionGoal): void

// Query status
getStatus(): FactionStatus
generateReport(): string
```

---

## Complete Example

See `examples/integrated-universe-demo.ts` for a complete, runnable example demonstrating:

- Star system creation with all features
- Multiple factions with different strategies
- NPCs with diverse personalities
- Real-time simulation with event generation
- Detailed status reporting

Run it with:
```bash
npm run example:integrated
```

---

## What's Next?

This integration module is **production-ready** and provides:

✅ Complete space environment simulation
✅ Intelligent, learning NPCs
✅ Strategic faction AI
✅ Dynamic, emergent gameplay
✅ Full historical tracking
✅ Event-driven storytelling

**Your living universe is ready to go!** 🚀
