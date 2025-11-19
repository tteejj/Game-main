# Action Plan - Phase 3: 4X Gameplay Systems

**Status**: Ready for execution after Phase 2 (Economy Integration)
**Estimated Time**: 40-60 hours
**Dependencies**: Phase 1 (Infrastructure) + Phase 2 (Economy) completed
**Goal**: Create living background universe simulation (DF-style world gen)

---

## Overview

**FOCUS**: Background simulation FIRST, player interaction LATER

**CRITICAL FINDING**: The game has sophisticated systems but they're **isolated silos, not interconnected webs**.

You have:
- ✅ NPCPersonalitySystem (869 LOC) with moods, fears, desires
- ✅ ExtendedNPCMemory (200 LOC) with PTSD, forgetting curves
- ✅ NPCGoalSystem (300 LOC) with 40+ goal types
- ✅ Mining system (247 LOC) complete
- ✅ 31 commodities, 20+ materials defined
- ✅ Station/city generators

But:
- ❌ NPCShipAI doesn't use personality/memory/goals
- ❌ Mining doesn't connect to economy
- ❌ Factions don't build new stations/colonies
- ❌ No tech tree/research (factions don't advance)
- ❌ No population simulation (cities are just numbers)
- ❌ No conquest mechanics (wars declared but nothing happens)

**This phase makes the universe ALIVE and SELF-SIMULATING.**

### Philosophy: Dwarf Fortress World Gen

Like DF's "Legends Mode", this creates a universe that simulates itself:
- Factions build colonies, research tech, wage wars
- NPCs have personalities, memories, relationships
- Population grows, migrates, dies
- Economy drives faction behavior (shortages → wars)
- Player observes emergent stories

**Player interaction comes later** (Phase 4+). First: make universe breathe.

---

## 4X Pillars Status

| Pillar | Current | After Phase 3 | Gap |
|--------|---------|---------------|-----|
| **eXplore** | 40% | 90% | Add research, fog of war |
| **eXpand** | 0% | 85% | Add construction system |
| **eXploit** | 25% | 90% | Add manufacturing chains |
| **eXterminate** | 30% | 80% | Add conquest, fleets |

---

## Task 1: Connect NPC Personality Systems (4-6 hours)

### 1.1 Wire NPCShipAI to NPCPersonalitySystem

**Problem**: NPCPersonalitySystem (869 lines) exists but NPCShipAI doesn't use it

**File**: `/universe-system/src/NPCShipAI.ts`

**Changes**:

**Add import and property** (top of file):

```typescript
import { NPCPersonalitySystem, PersonalityArchetype } from './personality/NPCPersonalitySystem';

export class NPCShipAI {
    // ... existing properties ...

    // ADD:
    private personalitySystem: NPCPersonalitySystem;

    constructor(ship: NPCShip, starSystem: StarSystem) {
        // ... existing code ...

        // ADD after line 150:
        this.personalitySystem = new NPCPersonalitySystem(ship.id);

        // Set archetype based on faction or random
        const archetypes: PersonalityArchetype[] = [
            'merchant', 'explorer', 'warrior', 'scientist', 'diplomat'
        ];
        const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
        this.personalitySystem.setArchetype(archetype);
    }
}
```

**Replace decision-making with personality-driven behavior**:

**Current code** (lines 400-450): Hardcoded if/else for goal selection

**Replace with**:

```typescript
private updateGoals(): void {
    // Use personality system to evaluate goals
    const personalityState = this.personalitySystem.getPersonalityState();
    const currentMood = personalityState.currentMood;

    // Personality affects goal preferences
    const goalScores = new Map<string, number>();

    // 1. Trade goal - appeals to greedy/cautious NPCs
    if (personalityState.traits.greed > 0.6 && this.ship.cargo.length < this.ship.maxCargo) {
        goalScores.set('trade', personalityState.traits.greed * 100);
    }

    // 2. Explore goal - appeals to curious NPCs
    const unexploredPOIs = this.starSystem.pointsOfInterest.filter(poi =>
        !this.hasVisited(poi.id)
    );
    if (unexploredPOIs.length > 0 && personalityState.traits.curiosity > 0.5) {
        goalScores.set('explore', personalityState.traits.curiosity * 80);
    }

    // 3. Combat goal - appeals to aggressive/courageous NPCs
    const threats = this.findThreats();
    if (threats.length > 0) {
        if (personalityState.traits.aggression > 0.7 && personalityState.traits.courage > 0.6) {
            goalScores.set('attack', personalityState.traits.aggression * 90);
        } else if (personalityState.traits.caution > 0.7) {
            goalScores.set('flee', personalityState.traits.caution * 95); // Flee if cautious
        }
    }

    // 4. Social goal - appeals to empathetic NPCs
    if (personalityState.traits.empathy > 0.6) {
        const needyShips = this.findShipsInDistress();
        if (needyShips.length > 0) {
            goalScores.set('assist', personalityState.traits.empathy * 70);
        }
    }

    // 5. Mood affects risk tolerance
    if (currentMood === 'fearful' || currentMood === 'stressed') {
        // Avoid risky goals
        goalScores.delete('attack');
        goalScores.delete('explore');
        goalScores.set('retreat', 100); // Go to safe station
    } else if (currentMood === 'confident' || currentMood === 'excited') {
        // Boost risky goals
        const attackScore = goalScores.get('attack') || 0;
        goalScores.set('attack', attackScore * 1.5);
    }

    // Select highest-scored goal
    let bestGoal = 'idle';
    let bestScore = 0;
    goalScores.forEach((score, goal) => {
        if (score > bestScore) {
            bestScore = score;
            bestGoal = goal;
        }
    });

    this.ship.goal = bestGoal;
}
```

**Add personality-driven reactions**:

```typescript
/**
 * React to event using personality
 */
private reactToEvent(event: { type: string; data: any }): void {
    const reaction = this.personalitySystem.reactToEvent(event);

    // Apply mood changes
    if (reaction.moodChange) {
        this.personalitySystem.updateMood(reaction.moodChange);
    }

    // Relationship changes affect behavior
    if (reaction.relationshipChanges) {
        reaction.relationshipChanges.forEach((change, entityId) => {
            this.personalitySystem.updateRelationship(entityId, change);

            // Hostile relationships trigger avoidance/attack
            const relationship = this.personalitySystem.getRelationship(entityId);
            if (relationship < -50) {
                this.addThreat(entityId);
            }
        });
    }

    // Fear responses
    if (reaction.fearResponse) {
        this.ship.goal = 'flee';
        this.ship.destination = this.findSafeLocation();
    }
}
```

### 1.2 Enable ExtendedNPCMemory

**File**: `/universe-system/src/NPCShipAI.ts`

**Replace simple memory array with ExtendedNPCMemory**:

```typescript
import { ExtendedNPCMemory } from './memory/ExtendedNPCMemory';

export class NPCShipAI {
    // REPLACE:
    // private memories: Memory[] = [];

    // WITH:
    private memory: ExtendedNPCMemory;

    constructor(ship: NPCShip, starSystem: StarSystem) {
        // ... existing code ...

        // ADD:
        this.memory = new ExtendedNPCMemory(ship.id);
    }

    /**
     * Add memory using extended system
     */
    addMemory(memoryData: any): void {
        this.memory.addMemory({
            ...memoryData,
            emotionalIntensity: this.calculateEmotionalIntensity(memoryData.type),
            context: { location: this.ship.position, faction: this.ship.faction }
        });

        // Check for PTSD triggers
        if (memoryData.type === 'combat' || memoryData.type === 'near_death') {
            const traumaLevel = this.memory.getTraumaLevel();
            if (traumaLevel > 0.7) {
                // NPC develops PTSD, becomes more cautious
                this.personalitySystem.modifyTrait('caution', 0.2);
                this.personalitySystem.modifyTrait('courage', -0.3);
            }
        }
    }

    /**
     * Retrieve memories using forgetting curve
     */
    private recallMemories(context: string): any[] {
        return this.memory.recall(context, 0.5); // 50% confidence threshold
    }

    /**
     * Calculate emotional intensity based on event type
     */
    private calculateEmotionalIntensity(eventType: string): number {
        const intensityMap: Record<string, number> = {
            'near_death': 1.0,
            'combat': 0.8,
            'betrayal': 0.9,
            'major_profit': 0.7,
            'discovery': 0.6,
            'trade_success': 0.3,
            'casual_encounter': 0.1
        };

        return intensityMap[eventType] || 0.5;
    }
}
```

### 1.3 Integrate NPCGoalSystem

**File**: `/universe-system/src/NPCShipAI.ts`

**Add goal planning using NPCGoalSystem**:

```typescript
import { NPCGoalSystem, GoalType } from './ai/NPCGoalSystem';

export class NPCShipAI {
    // ADD:
    private goalSystem: NPCGoalSystem;

    constructor(ship: NPCShip, starSystem: StarSystem) {
        // ... existing code ...

        // ADD:
        this.goalSystem = new NPCGoalSystem(ship);
    }

    /**
     * Use goal system for long-term planning
     */
    private planLongTermGoals(): void {
        // Evaluate all possible goals
        const availableGoals: GoalType[] = [
            'ACCUMULATE_WEALTH',
            'EXPLORE_UNIVERSE',
            'GAIN_REPUTATION',
            'ACQUIRE_SHIP_UPGRADES',
            'ESTABLISH_TRADE_ROUTE',
            'COMPLETE_FACTION_MISSION'
        ];

        const goalEvaluations = availableGoals.map(goalType => {
            const score = this.goalSystem.evaluateGoal({
                type: goalType,
                priority: this.calculateGoalPriority(goalType),
                requirements: this.getGoalRequirements(goalType)
            });

            return { goalType, score };
        });

        // Select top 3 goals
        const topGoals = goalEvaluations
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        // Set active goals in goal system
        topGoals.forEach(({ goalType }) => {
            this.goalSystem.addGoal({
                type: goalType,
                priority: this.calculateGoalPriority(goalType),
                requirements: this.getGoalRequirements(goalType)
            });
        });
    }

    /**
     * Update behavior based on active goals
     */
    private updateGoalBasedBehavior(deltaTime: number): void {
        const activeGoals = this.goalSystem.getActiveGoals();

        activeGoals.forEach(goal => {
            switch (goal.type) {
                case 'ACCUMULATE_WEALTH':
                    // Prioritize profitable trade routes
                    this.seekProfitableTrade();
                    break;

                case 'EXPLORE_UNIVERSE':
                    // Visit unexplored POIs
                    this.seekUnexploredLocation();
                    break;

                case 'GAIN_REPUTATION':
                    // Take faction missions, help others
                    this.seekReputationOpportunity();
                    break;

                case 'ESTABLISH_TRADE_ROUTE':
                    // Find profitable recurring route
                    this.establishTradeRoute();
                    break;
            }
        });

        // Update goal progress
        this.goalSystem.update(deltaTime);
    }
}
```

**Success Criteria**:
- NPCs make decisions based on personality (greed, caution, curiosity)
- Mood affects behavior (fearful NPCs flee, confident ones explore)
- Memories persist with forgetting curves
- Traumatic events cause PTSD (increased caution)
- NPCs pursue long-term goals, not just immediate needs
- Relationships affect interactions (hostile NPCs avoid each other)

---

## Task 2: Add Faction Construction System (8-12 hours)

**FOCUS**: Factions build stations/colonies automatically (background simulation)
**Player interaction**: Added later in Phase 4+

### 2.1 Create Construction System

**File**: `/universe-system/src/ConstructionSystem.ts` (NEW - in universe, not game-engine)

```typescript
import { Vector3 } from './Vector3';
import { CommodityType } from '../universe-system/src/economy/commodity';

export interface ConstructionProject {
    id: string;
    type: 'STATION' | 'OUTPOST' | 'MINING_PLATFORM' | 'REFINERY' | 'DEFENSE_PLATFORM';
    position: Vector3;
    costs: Array<{ commodity: CommodityType; quantity: number }>;
    buildTime: number; // seconds
    progress: number; // 0-1
    startTime: number;
    owner: string; // Player or faction ID
}

export class ConstructionSystem {
    private activeProjects: Map<string, ConstructionProject> = new Map();

    /**
     * Start new construction project
     */
    startConstruction(
        type: ConstructionProject['type'],
        position: Vector3,
        owner: string
    ): ConstructionProject | null {
        const blueprint = this.getBlueprint(type);

        if (!blueprint) return null;

        const project: ConstructionProject = {
            id: `construction_${Date.now()}`,
            type,
            position,
            costs: blueprint.costs,
            buildTime: blueprint.buildTime,
            progress: 0,
            startTime: Date.now(),
            owner
        };

        this.activeProjects.set(project.id, project);

        return project;
    }

    /**
     * Get construction blueprint for station type
     */
    private getBlueprint(type: ConstructionProject['type']): {
        costs: Array<{ commodity: CommodityType; quantity: number }>;
        buildTime: number;
    } | null {
        const blueprints = {
            STATION: {
                costs: [
                    { commodity: 'METALS' as CommodityType, quantity: 500 },
                    { commodity: 'ELECTRONICS' as CommodityType, quantity: 200 },
                    { commodity: 'MACHINERY' as CommodityType, quantity: 100 }
                ],
                buildTime: 3600 // 1 hour
            },

            OUTPOST: {
                costs: [
                    { commodity: 'METALS' as CommodityType, quantity: 200 },
                    { commodity: 'ELECTRONICS' as CommodityType, quantity: 50 }
                ],
                buildTime: 1800 // 30 minutes
            },

            MINING_PLATFORM: {
                costs: [
                    { commodity: 'METALS' as CommodityType, quantity: 300 },
                    { commodity: 'MACHINERY' as CommodityType, quantity: 150 },
                    { commodity: 'POWER_CELLS' as CommodityType, quantity: 50 }
                ],
                buildTime: 2400 // 40 minutes
            },

            REFINERY: {
                costs: [
                    { commodity: 'METALS' as CommodityType, quantity: 400 },
                    { commodity: 'MACHINERY' as CommodityType, quantity: 200 },
                    { commodity: 'CHEMICALS' as CommodityType, quantity: 100 }
                ],
                buildTime: 2700 // 45 minutes
            },

            DEFENSE_PLATFORM: {
                costs: [
                    { commodity: 'METALS' as CommodityType, quantity: 600 },
                    { commodity: 'WEAPONS' as CommodityType, quantity: 100 },
                    { commodity: 'ELECTRONICS' as CommodityType, quantity: 150 }
                ],
                buildTime: 3000 // 50 minutes
            }
        };

        return blueprints[type] || null;
    }

    /**
     * Update construction progress
     */
    update(deltaTime: number): void {
        this.activeProjects.forEach((project, id) => {
            project.progress += deltaTime / project.buildTime;

            if (project.progress >= 1.0) {
                // Construction complete!
                this.completeConstruction(project);
                this.activeProjects.delete(id);
            }
        });
    }

    /**
     * Complete construction, create actual station
     */
    private completeConstruction(project: ConstructionProject): void {
        console.log(`Construction complete: ${project.type} at`, project.position);

        // Emit event for game engine to create actual station
        // (handled by SpaceGameEnhanced)
    }

    /**
     * Cancel construction and refund partial resources
     */
    cancelConstruction(projectId: string): Array<{ commodity: CommodityType; quantity: number }> {
        const project = this.activeProjects.get(projectId);

        if (!project) return [];

        // Refund based on progress (lose 20%)
        const refundRate = Math.max(0, project.progress * 0.8);
        const refunds = project.costs.map(cost => ({
            commodity: cost.commodity,
            quantity: Math.floor(cost.quantity * refundRate)
        }));

        this.activeProjects.delete(projectId);

        return refunds;
    }

    /**
     * Get all active construction projects
     */
    getActiveProjects(): ConstructionProject[] {
        return Array.from(this.activeProjects.values());
    }
}
```

### 2.2 Add Faction Construction AI

**File**: `/universe-system/src/faction-dynamics/FactionExpansionAI.ts` (NEW)

**Purpose**: Factions automatically build stations/colonies based on needs

```typescript
import { Faction } from './Faction';
import { StarSystem } from '../StarSystem';
import { ConstructionSystem, ConstructionProject } from '../ConstructionSystem';
import { Vector3 } from '../Vector3';

export class FactionExpansionAI {
    private faction: Faction;
    private starSystem: StarSystem;
    private constructionSystem: ConstructionSystem;

    // Expansion parameters
    private minStationDistance = 50000; // km
    private expansionInterval = 600; // seconds (10 min)
    private lastExpansionCheck = 0;

    constructor(faction: Faction, starSystem: StarSystem, constructionSystem: ConstructionSystem) {
        this.faction = faction;
        this.starSystem = starSystem;
        this.constructionSystem = constructionSystem;
    }

    /**
     * Update faction expansion logic
     */
    update(deltaTime: number, currentTime: number): void {
        if (currentTime - this.lastExpansionCheck < this.expansionInterval) {
            return; // Don't check too frequently
        }

        this.lastExpansionCheck = currentTime;

        // Evaluate expansion needs
        const expansionNeed = this.evaluateExpansionNeed();

        if (expansionNeed.score > 0.6) {
            // Faction wants to expand!
            this.attemptExpansion(expansionNeed.type);
        }
    }

    /**
     * Evaluate what type of station faction needs most
     */
    private evaluateExpansionNeed(): { type: ConstructionProject['type']; score: number } {
        const needs = {
            MINING_PLATFORM: this.evaluateMiningNeed(),
            REFINERY: this.evaluateRefineryNeed(),
            STATION: this.evaluateTradeStationNeed(),
            DEFENSE_PLATFORM: this.evaluateDefenseNeed(),
            OUTPOST: this.evaluateOutpostNeed()
        };

        // Find highest need
        let bestType: ConstructionProject['type'] = 'OUTPOST';
        let bestScore = 0;

        Object.entries(needs).forEach(([type, score]) => {
            if (score > bestScore) {
                bestScore = score;
                bestType = type as ConstructionProject['type'];
            }
        });

        return { type: bestType, score: bestScore };
    }

    /**
     * Evaluate need for mining platform
     */
    private evaluateMiningNeed(): number {
        // Check if faction has mineral shortage
        const mineralNeed = this.faction.economicNeeds.getResourceStatus('MINERALS');

        if (mineralNeed.critical) return 0.9;
        if (mineralNeed.low) return 0.7;

        // Count existing mining platforms
        const miningStations = this.starSystem.pointsOfInterest.filter(
            poi => poi.faction === this.faction.name && poi.subType === 'MINING_PLATFORM'
        );

        // Want at least 2 mining platforms
        if (miningStations.length < 2) return 0.5;

        return 0.2;
    }

    /**
     * Evaluate need for refinery
     */
    private evaluateRefineryNeed(): number {
        // Refineries process raw materials → finished goods
        const metalNeed = this.faction.economicNeeds.getResourceStatus('METALS');

        if (metalNeed.critical) return 0.8;

        // Want 1 refinery per 2 mining platforms
        const miningStations = this.starSystem.pointsOfInterest.filter(
            poi => poi.faction === this.faction.name && poi.subType === 'MINING_PLATFORM'
        );

        const refineries = this.starSystem.pointsOfInterest.filter(
            poi => poi.faction === this.faction.name && poi.subType === 'REFINERY'
        );

        const ratio = refineries.length / (miningStations.length + 1);

        if (ratio < 0.5) return 0.6;

        return 0.1;
    }

    /**
     * Evaluate need for trade station
     */
    private evaluateTradeStationNeed(): number {
        // Factions with high trade activity need more trading hubs
        const factionShips = this.starSystem.npcShips.filter(s => s.faction === this.faction.name);
        const traders = factionShips.filter(s => s.goal === 'trade');

        const tradeRatio = traders.length / (factionShips.length + 1);

        if (tradeRatio > 0.5) return 0.7; // Many traders, need hub

        // Check faction credits (wealthy factions expand)
        if (this.faction.credits > 100000) return 0.5;

        return 0.2;
    }

    /**
     * Evaluate need for defense platform
     */
    private evaluateDefenseNeed(): number {
        // Check if at war
        const atWar = Array.from(this.faction.relations.values()).some(rel => rel < -70);

        if (atWar) return 0.95; // High priority during war

        // Check if neighbors are hostile
        const hostileNeighbors = Array.from(this.faction.relations.values()).filter(rel => rel < -30);

        if (hostileNeighbors.length > 0) return 0.6;

        // Defensive factions always want some defenses
        const defensePlatforms = this.starSystem.pointsOfInterest.filter(
            poi => poi.faction === this.faction.name && poi.subType === 'DEFENSE_PLATFORM'
        );

        if (defensePlatforms.length < 1) return 0.4;

        return 0.1;
    }

    /**
     * Evaluate need for generic outpost
     */
    private evaluateOutpostNeed(): number {
        // Outposts are cheap way to claim territory
        const factionStations = this.starSystem.pointsOfInterest.filter(
            poi => poi.faction === this.faction.name
        );

        // Want at least 3 stations total
        if (factionStations.length < 3) return 0.5;

        // Expansionist factions keep building
        if (this.faction.personality?.expansionist > 0.7) return 0.4;

        return 0.1;
    }

    /**
     * Attempt to build new station
     */
    private attemptExpansion(type: ConstructionProject['type']): void {
        // Find suitable location
        const location = this.findBuildLocation(type);

        if (!location) {
            console.log(`Faction ${this.faction.name} can't find location for ${type}`);
            return;
        }

        // Check if faction has resources
        const blueprint = this.constructionSystem['getBlueprint'](type);

        if (!blueprint) return;

        const canAfford = this.factionHasResources(blueprint.costs);

        if (!canAfford) {
            console.log(`Faction ${this.faction.name} can't afford ${type}`);
            return;
        }

        // Consume faction resources (from faction treasury/stockpile)
        this.consumeFactionResources(blueprint.costs);

        // Start construction
        const project = this.constructionSystem.startConstruction(type, location, this.faction.name);

        if (project) {
            console.log(`Faction ${this.faction.name} started building ${type} at`, location);
        }
    }

    /**
     * Find suitable build location
     */
    private findBuildLocation(type: ConstructionProject['type']): Vector3 | null {
        // For mining platforms: near asteroid fields
        if (type === 'MINING_PLATFORM') {
            return this.findLocationNearAsteroids();
        }

        // For others: near faction homeworld or existing stations
        return this.findLocationNearTerritory();
    }

    /**
     * Find location near asteroid fields
     */
    private findLocationNearAsteroids(): Vector3 | null {
        // Look for POIs near asteroid belts
        // (simplified - would use actual asteroid field data)
        const homeworld = this.faction.homeworld;

        // Build in orbit around homeworld system
        return {
            x: homeworld.x + (Math.random() - 0.5) * 100000,
            y: homeworld.y + (Math.random() - 0.5) * 100000,
            z: homeworld.z + (Math.random() - 0.5) * 20000
        };
    }

    /**
     * Find location near faction territory
     */
    private findLocationNearTerritory(): Vector3 | null {
        const factionStations = this.starSystem.pointsOfInterest.filter(
            poi => poi.faction === this.faction.name
        );

        if (factionStations.length === 0) {
            // Use homeworld
            return this.faction.homeworld;
        }

        // Build near existing station
        const randomStation = factionStations[Math.floor(Math.random() * factionStations.length)];

        return {
            x: randomStation.position.x + (Math.random() - 0.5) * this.minStationDistance,
            y: randomStation.position.y + (Math.random() - 0.5) * this.minStationDistance,
            z: randomStation.position.z + (Math.random() - 0.5) * 5000
        };
    }

    /**
     * Check if faction has resources
     */
    private factionHasResources(costs: Array<{ commodity: any; quantity: number }>): boolean {
        // Check faction's resource stockpiles
        // (would integrate with FactionEconomicNeeds)
        return this.faction.credits > 10000; // Simplified
    }

    /**
     * Consume resources from faction
     */
    private consumeFactionResources(costs: Array<{ commodity: any; quantity: number }>): void {
        // Deduct from faction treasury
        const totalCost = costs.reduce((sum, cost) => sum + cost.quantity * 10, 0);
        this.faction.credits -= totalCost;
    }
}
```

### 2.3 Wire Faction AI into StarSystem

**File**: `/universe-system/src/StarSystem.ts`

**Add construction system and faction expansion**:

```typescript
import { ConstructionSystem } from './ConstructionSystem';
import { FactionExpansionAI } from './faction-dynamics/FactionExpansionAI';

export class StarSystem {
    // ... existing properties ...

    // ADD:
    private constructionSystem: ConstructionSystem;
    private factionExpansionAIs: Map<string, FactionExpansionAI> = new Map();

    constructor(config: StarSystemConfig) {
        // ... existing code ...

        // ADD after faction generation (around line 200):
        this.constructionSystem = new ConstructionSystem();

        // Create expansion AI for each faction
        this.factions.forEach(faction => {
            const expansionAI = new FactionExpansionAI(
                faction,
                this,
                this.constructionSystem
            );
            this.factionExpansionAIs.set(faction.name, expansionAI);
        });
    }

    update(deltaTime: number): void {
        // ... existing code ...

        const currentTime = Date.now();

        // ADD: Update faction expansion AIs
        this.factionExpansionAIs.forEach(expansionAI => {
            expansionAI.update(deltaTime, currentTime);
        });

        // UPDATE: Construction system
        this.constructionSystem.update(deltaTime);

        // When construction completes, create actual station
        // (construction system emits event, handled here)
    }
}
```

**Success Criteria**:
- Factions automatically build stations based on needs
- Mineral shortage → build mining platform
- At war → build defense platform
- Wealthy factions expand more
- Construction takes time (visible progress)
- Universe grows dynamically (more stations appear over time)

---

## Task 3: Add Manufacturing Chains (Continuing...)

**NOTE**: Due to length, Tasks 3-6 are outlined below. Full implementation details available on request.

### Task 3 Summary: Wire Mining to Economy (6-8h)
- Connect MiningSystem to station production
- Mining ships deliver ore to refineries
- Refineries produce metals for manufacturing
- Manufacturing creates finished goods
- Full production chain: Asteroid → Ore → Metal → Goods → Trade

### Task 4 Summary: Add Faction Research System (10-15h)
- Tech tree with 30+ technologies
- Factions research automatically based on needs
- Research unlocks: better weapons, faster engines, new buildings
- Tech spreads through espionage/trade
- Creates tech disparity (advanced vs primitive factions)

### Task 5 Summary: Add Population Simulation (12-18h)
- Cities have individual citizens (not just count)
- Citizens have needs (food, shelter, happiness)
- Birth/death/migration mechanics
- Population grows when needs met, declines when not
- Social unrest if population unhappy
- Drives faction behavior (need to keep population happy)

### Task 6 Summary: Add Conquest Mechanics (8-12h)
- Factions can capture enemy stations/colonies
- Siege warfare (attack until defenses down)
- Occupation mechanics (resistance, garrison)
- Territory flips ownership
- Wars have real consequences (gain/lose territory)
- Creates dynamic borders

---

## Overall Success Criteria (Phase 3)

After completing all tasks:

✅ **Living Universe** (Dwarf Fortress-style)
- Factions build, expand, research, conquer autonomously
- NPCs have personality/memory/goals driving behavior
- Population grows/migrates/dies naturally
- Economy drives faction decisions (shortages → expansion → wars)

✅ **Emergent Stories**
- "Faction A went to war with Faction B over food shortage"
- "Traumatized NPC became cautious trader after pirate attack"
- "Population revolt led to faction collapse"
- "Tech advantage allowed rapid conquest"

✅ **Background Simulation**
- Universe simulates without player
- Player observes living world
- Player can participate but isn't required

✅ **4X Pillars Complete**
- eXplore: 90% (research system, discoveries)
- eXpand: 85% (faction construction)
- eXploit: 90% (manufacturing chains)
- eXterminate: 80% (conquest mechanics)

---

## Files Created/Modified Summary

**New Files** (~3,500 lines):
- `/universe-system/src/ConstructionSystem.ts` (250 lines)
- `/universe-system/src/faction-dynamics/FactionExpansionAI.ts` (350 lines)
- `/universe-system/src/ResearchSystem.ts` (400 lines)
- `/universe-system/src/faction-dynamics/FactionResearchAI.ts` (300 lines)
- `/universe-system/src/PopulationSystem.ts` (600 lines)
- `/universe-system/src/ConquestSystem.ts` (400 lines)
- `/universe-system/src/faction-dynamics/FactionMilitaryAI.ts` (500 lines)
- Plus updates to mining integration (200 lines)

**Modified Files** (~1,200 lines changed):
- `/universe-system/src/NPCShipAI.ts` (integrate personality/memory/goals - 400 lines)
- `/universe-system/src/StarSystem.ts` (wire all new systems - 300 lines)
- `/universe-system/src/faction-dynamics/FactionEconomicNeeds.ts` (integrate production - 200 lines)
- `/universe-system/src/faction-dynamics/FactionDiplomacyEngine.ts` (add conquest events - 200 lines)
- `/universe-system/src/EconomySystem.ts` (add manufacturing - 100 lines)

**Total**: ~4,700 lines of new/modified code

---

## Time Breakdown (Revised for Background Simulation Focus)

- Task 1: Connect NPC Systems (4-6h) ← Same
- Task 2: Faction Construction (6-8h) ← Reduced (no UI needed yet)
- Task 3: Manufacturing Chains (6-8h) ← Same
- Task 4: Faction Research (8-12h) ← Reduced (no player UI)
- Task 5: Population Simulation (12-18h) ← Same
- Task 6: Conquest Mechanics (6-10h) ← Reduced (no player conquest yet)

**Total: 42-62 hours** (background simulation focused)

---

## Integration Notes

**This phase REQUIRES**:
- Phase 1: Critical Infrastructure (NPC navigation fixed)
- Phase 2: Economy Integration (unified pricing, trading)

**This phase ENABLES**:
- Phase 4: Player interaction (build UI for player to participate)
- Phase 5: Polish & Testing (test emergent behavior)

**Philosophy Change**:
- **OLD**: Player-focused 4X game
- **NEW**: Dwarf Fortress-style world simulation
- Player observes/participates in living universe
- Universe doesn't need player to function

**After Phase 3**: You have a living, breathing universe that simulates itself. Factions rise and fall, wars reshape borders, technology advances, populations grow and decline - all driven by needs, personalities, and emergent behavior.

**This is the dream.** 🌌
