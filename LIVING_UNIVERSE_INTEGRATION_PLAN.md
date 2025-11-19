# Living Universe Systems Integration Plan

**Status:** Phase 2-4 systems are implemented but NOT integrated into game loop

---

## Integration Gap Summary

### Current State
- ✅ **Phase 1 Complete**: UniverseSimulationController, HistoricalMemorySystem, ConsequenceEngine
- 🟡 **Phase 2 Implemented but Disconnected**: ExtendedNPCMemory, NPCGoalSystem, AdaptiveAI
- 🟡 **Phase 3 Implemented but Disconnected**: FactionDiplomacyEngine, FactionEconomicNeeds
- 🟡 **Phase 4 Implemented but Disconnected**: AbsenceSimulator, ChronicleGenerator

### Problem
NPCShipAI uses simple `ShipMemory` (visitedStations, knownThreats) instead of the sophisticated `ExtendedNPCMemory` system with:
- Ebbinghaus forgetting curves
- PTSD and trauma
- Relationships
- Memory consolidation
- Cue-based retrieval

---

## Integration Tasks

### Task 1: Integrate ExtendedNPCMemory with NPCShipAI (HIGH PRIORITY)

**Current Architecture:**
```typescript
// NPCShipAI.ts:59-65
interface ShipMemory {
  visitedStations: Set<string>;
  knownThreats: Map<string, number>;
  profitableRoutes: TradeRoute[];
  lastTradeTime: number;
  totalProfit: number;
}
```

**Target Architecture:**
```typescript
import { ExtendedNPCMemory, Experience, TraumaMemory } from './entity-ai/ExtendedNPCMemory';

interface NPCShip {
  // ... existing fields
  memory: ExtendedNPCMemory;  // Replace ShipMemory
  emotionalState: {
    stress: number;
    satisfaction: number;
    fear: number;
  };
}
```

**Implementation Steps:**
1. Add ExtendedNPCMemory instance to each NPCShip
2. Convert station visits to Experience entries
3. Convert threats to TraumaMemory when severe
4. Modify decision-making to check for trauma triggers
5. Use memory decay for "forgetting" old routes/threats
6. Implement memory consolidation during docking (rest period)

**Impact:**
- NPCs will "remember" traumatic pirate attacks and avoid those routes
- Successful trades become consolidated long-term memories
- Failed missions decay from memory over time
- Personality influenced by accumulated experiences

---

### Task 2: Integrate NPCGoalSystem with NPCShipAI (HIGH PRIORITY)

**Current:** Simple state machine (IDLE → TRAVELING → DOCKING → DOCKED → repeat)

**Target:** Goal-based planning with A* and HTN

**Implementation Steps:**
1. Convert ship states to NPCGoals:
   - BECOME_WEALTHY → find trade routes
   - SURVIVE → avoid threats, repair
   - SERVE_FACTION → patrol, defend
2. Use A* planning in `handleIdleState()` to find action sequences
3. Dynamic goal prioritization based on:
   - Fuel level (urgency)
   - Credits (motivation)
   - Threats (survival priority)
   - Personality (emotional drive)
4. HTN decomposition for complex goals:
   - BECOME_WEALTHY → [FIND_CARGO, BUY_LOW, FIND_BUYER, SELL_HIGH]

**Impact:**
- Ships make intelligent multi-step plans
- Goals adapt to changing circumstances
- Personality affects goal selection

---

### Task 3: Integrate AdaptiveAI with NPCShipAI (MEDIUM PRIORITY)

**Target:** Ships learn from experience and evolve strategies

**Implementation Steps:**
1. Track action outcomes (trade profit, combat result, route success)
2. Update Q-table after each significant action
3. Breed successful trading strategies (genetic algorithm)
4. Implement skill progression:
   - Trading skill improves with practice
   - Navigation skill improves with distance traveled
   - Combat skill improves with engagements
5. Add skill decay (1% per day without practice)

**Impact:**
- Veteran traders become more profitable over time
- Ships learn which routes are safest
- Strategies evolve based on success rates

---

### Task 4: Connect FactionDiplomacyEngine to FactionSystem (HIGH PRIORITY)

**Current Problem:**
```typescript
// FactionSystem.ts uses static relationships
interface Faction {
  relationships: Map<string, number>; // -100 to 100, static
}

// But FactionDiplomacyEngine.ts has dynamic system
class FactionDiplomacyEngine {
  relationships: Map<string, FactionRelationship>;
  // With momentum, inertia, diplomatic capital
}
```

**Implementation Steps:**
1. Replace FactionSystem.relationships Map with FactionDiplomacyEngine instance
2. Update `getRelationshipWith()` to query diplomacy engine
3. Call `updateRelationshipMomentum()` in faction update loop
4. Emit events (trade, combat, alliance) to diplomacy engine
5. Use diplomatic capital for faction actions

**Files to Modify:**
- `FactionSystem.ts` - Remove static relationships
- `NPCShipAI.ts` - Report faction interactions to diplomacy engine
- `EconomySystem.ts` - Trade events affect relationships

**Impact:**
- Faction relationships evolve dynamically
- Wars can escalate or de-escalate naturally
- Alliances form and break based on events
- Diplomatic actions have costs (capital)

---

### Task 5: Integrate FactionEconomicNeeds (MEDIUM PRIORITY)

**Implementation Steps:**
1. Connect `FactionEconomicNeeds.evaluateNeeds()` to trader AI
2. Generate trade missions based on faction shortages
3. Faction behavior changes when resources critical
4. Supply chain disruptions cause cascading effects

**Impact:**
- Factions pursue economically rational goals
- Blockades have real economic consequences
- Trade missions generated dynamically

---

### Task 6: Integrate AbsenceSimulator (LOW PRIORITY)

**Implementation Steps:**
1. Hook into save/load system
2. Call `simulateAbsence()` when loading game
3. Generate events for time elapsed
4. Apply consequences to world state

**Impact:**
- Universe continues while player is away
- Return to find changed political landscape
- NPCs have made progress toward goals

---

### Task 7: Integrate ChronicleGenerator (LOW PRIORITY)

**Implementation Steps:**
1. Call `generateChronicles()` periodically (every in-game week)
2. Analyze recent events for patterns
3. Generate chronicles for significant events
4. Store in universe history
5. Display in "News" or "History" UI

**Impact:**
- Auto-generated lore
- Pattern detection (escalations, revenge spirals)
- Historical significance scoring
- Emergent narratives

---

## Implementation Priority

### Week 1: Critical Integrations
1. Task 4: FactionDiplomacyEngine → FactionSystem (2-3 hours)
2. Task 1: ExtendedNPCMemory → NPCShipAI (4-6 hours)

### Week 2: AI Enhancement
3. Task 2: NPCGoalSystem → NPCShipAI (6-8 hours)
4. Task 3: AdaptiveAI → NPCShipAI (4-6 hours)

### Week 3: Economic & Historical
5. Task 5: FactionEconomicNeeds integration (3-4 hours)
6. Task 6: AbsenceSimulator integration (2-3 hours)
7. Task 7: ChronicleGenerator integration (2-3 hours)

**Total Estimated Effort:** 23-33 hours

---

## Quick Win: Faction Diplomacy Integration

The smallest, highest-impact integration is Task 4 (FactionDiplomacyEngine).

**Why Start Here:**
- Affects all faction interactions
- Small API surface (just relationship queries)
- Already working code, just needs connection
- Immediate visible impact (dynamic relationships)
- Enables other features (wars, alliances, trade agreements)

**Code Changes Required:**
1. `FactionSystem.ts:50` - Replace `relationships: Map` with `diplomacyEngine: FactionDiplomacyEngine`
2. `FactionSystem.ts:getRelationshipWith()` - Query engine instead of map
3. `NPCShipAI.ts:handleDockedState()` - Report trade completion to engine
4. `NPCShipAI.ts:handleAttackingState()` - Report combat to engine

**Testing:**
- Create two factions with neutral relationship
- Have their ships trade repeatedly
- Verify relationship improves over time
- Have them fight
- Verify relationship deteriorates
- Check for momentum (relationship continues trending)

---

## Success Metrics

### Before Integration:
- NPCs use simple memory (5 fields)
- Factions have static relationships
- No learning or adaptation
- No goal planning
- No historical analysis

### After Integration:
- NPCs remember experiences realistically
- Trauma affects behavior
- Factions relationships evolve dynamically
- NPCs plan multi-step goals
- Ships learn and improve strategies
- Chronicles auto-generate
- Patterns detected (escalations, cycles)

**Result:** True "Dwarf Fortress level" emergent complexity where the simulation drives the narrative.
