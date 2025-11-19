# Living Universe Systems - Core Algorithms & Enhancement Guide

This document provides the core algorithms and logic to flesh out all remaining
background systems to production-ready quality.

---

## Phase 2: Entity AI Systems

### 1. ExtendedNPCMemory - Memory Psychology Algorithms

#### Memory Decay (Ebbinghaus Forgetting Curve)
```typescript
// Memory strength decays logarithmically over time
calculateMemoryDecay(memory: Experience, currentTime: number): number {
  const elapsed = currentTime - memory.timestamp;
  const daysSince = elapsed / 86400;

  // Base decay rate (can be modified by emotional intensity)
  const k = 1.84; // Ebbinghaus constant

  // Emotional intensity slows decay
  const emotionalModifier = 1 - (Math.abs(memory.emotionalImpact) / 10) * 0.5;

  // Recall strengthens memory (spaced repetition effect)
  const recallBonus = Math.log(memory.recallCount + 1) * 0.1;

  // R = e^(-t/S) where S is "memory strength"
  const memoryLife = k * emotionalModifier * (1 + recallBonus);
  const retention = Math.exp(-daysSince / memoryLife);

  return Math.max(0.1, retention); // Never completely forget traumatic events
}
```

#### Memory Consolidation (Short-term → Long-term)
```typescript
// Consolidate memories during "rest" periods
consolidateMemories(shortTermBuffer: Experience[], restDuration: number): void {
  // Sort by importance
  const sorted = shortTermBuffer.sort((a, b) => {
    const importanceA = a.intensity * Math.abs(a.emotionalImpact);
    const importanceB = b.intensity * Math.abs(a.emotionalImpact);
    return importanceB - importanceA;
  });

  // Top 20% become long-term memories with strengthened encoding
  const consolidationThreshold = Math.ceil(sorted.length * 0.2);

  for (let i = 0; i < consolidationThreshold; i++) {
    sorted[i].memoryStrength *= 1.5; // Strengthened through consolidation
    sorted[i].consolidated = true;
    this.longTermMemories.push(sorted[i]);
  }

  // Rest decay short-term buffer
  shortTermBuffer.length = 0;
}
```

#### Cue-Based Retrieval
```typescript
// Retrieve memories based on environmental cues
retrieveMemories(cues: {
  location?: Vector3;
  entities?: string[];
  emotionalState?: number;
  context?: string;
}): Experience[] {
  const retrieved: Experience[] = [];

  for (const memory of this.allMemories) {
    let relevance = 0;

    // Location cue (within range)
    if (cues.location && memory.location) {
      const distance = Vector3.distance(cues.location, memory.location);
      if (distance < 1000) {
        relevance += (1000 - distance) / 1000 * 0.3;
      }
    }

    // Entity cue (familiar faces)
    if (cues.entities) {
      const overlap = cues.entities.filter(e =>
        memory.event.participants.includes(e)
      ).length;
      relevance += overlap * 0.2;
    }

    // Emotional state cue (mood-congruent recall)
    if (cues.emotionalState !== undefined) {
      const emotionalSimilarity = 1 - Math.abs(
        cues.emotionalState - memory.emotionalImpact
      ) / 10;
      relevance += emotionalSimilarity * 0.3;
    }

    // Retrieval probability based on strength and relevance
    const retrievalProb = memory.memoryStrength * relevance;

    if (Math.random() < retrievalProb) {
      // Successful retrieval strengthens memory
      memory.recallCount++;
      memory.memoryStrength *= 1.05;
      retrieved.push(memory);
    }
  }

  return retrieved.sort((a, b) => b.memoryStrength - a.memoryStrength);
}
```

#### Trauma Processing
```typescript
// PTSD-like trauma mechanics with triggers and healing
processTrauma(trauma: TraumaMemory, currentContext: any): {
  triggered: boolean;
  severity: number;
  flashback?: Experience;
} {
  // Check for triggers
  let triggerStrength = 0;

  for (const trigger of trauma.triggers) {
    if (this.contextMatchesTrigger(currentContext, trigger)) {
      triggerStrength += trigger.strength;
    }
  }

  // Trauma severity decreases over time (healing)
  const elapsed = Date.now() / 1000 - trauma.timestamp;
  const healingFactor = Math.min(0.5, elapsed / (86400 * 365)); // Max 50% healing over 1 year
  const currentSeverity = trauma.severity * (1 - healingFactor);

  // Triggered if trigger strength exceeds threshold
  const triggered = triggerStrength > (1 - currentSeverity);

  if (triggered) {
    // Intrusive memory (flashback)
    return {
      triggered: true,
      severity: currentSeverity * triggerStrength,
      flashback: trauma.relatedExperiences[0] // Most vivid memory
    };
  }

  return { triggered: false, severity: currentSeverity };
}
```

---

### 2. NPCGoalSystem - Planning Algorithms

#### A* Goal Planning
```typescript
// A* pathfinding adapted for goal/action space
planActionsToGoal(goal: NPCGoal, context: GoalEvaluationContext): ActionPlan | null {
  const openSet: PlanNode[] = [{
    actions: [],
    state: context.currentState,
    gCost: 0,
    hCost: this.heuristic(context.currentState, goal),
    fCost: 0
  }];

  const closedSet = new Set<string>();

  while (openSet.length > 0) {
    // Get node with lowest fCost
    openSet.sort((a, b) => a.fCost - b.fCost);
    const current = openSet.shift()!;

    // Goal reached?
    if (this.goalSatisfied(current.state, goal)) {
      return {
        steps: current.actions,
        estimatedTime: current.gCost,
        estimatedCost: this.calculateCost(current.actions),
        successProbability: this.calculateSuccessProbability(current.actions)
      };
    }

    const stateKey = this.hashState(current.state);
    if (closedSet.has(stateKey)) continue;
    closedSet.add(stateKey);

    // Explore available actions
    const availableActions = this.getAvailableActions(current.state, context);

    for (const action of availableActions) {
      const newState = this.applyAction(current.state, action);
      const newGCost = current.gCost + action.cost;
      const newHCost = this.heuristic(newState, goal);

      openSet.push({
        actions: [...current.actions, action],
        state: newState,
        gCost: newGCost,
        hCost: newHCost,
        fCost: newGCost + newHCost
      });
    }

    // Prevent infinite loops
    if (closedSet.size > 1000) break;
  }

  return null; // No plan found
}

// Heuristic: Estimate remaining cost to goal
heuristic(state: any, goal: NPCGoal): number {
  let h = 0;

  // Distance to goal location
  if (goal.targetLocation && state.location) {
    h += Vector3.distance(state.location, goal.targetLocation) / 100;
  }

  // Missing resources
  if (goal.resourceRequirements) {
    for (const req of goal.resourceRequirements) {
      const have = state.resources[req.resource] || 0;
      const need = req.amount;
      h += Math.max(0, need - have) * 0.1;
    }
  }

  // Missing prerequisites
  if (goal.prerequisites) {
    h += goal.prerequisites.filter(p => !state.satisfied.includes(p)).length * 5;
  }

  return h;
}
```

#### Hierarchical Task Network (HTN) Planning
```typescript
// Decompose complex goals into subgoals
decomposeGoal(goal: NPCGoal): NPCGoal[] {
  const subgoals: NPCGoal[] = [];

  switch (goal.type) {
    case 'BECOME_WEALTHY':
      subgoals.push(
        { type: 'FIND_TRADE_ROUTE', priority: 8, parent: goal.id },
        { type: 'ACQUIRE_CARGO', priority: 7, parent: goal.id },
        { type: 'COMPLETE_TRADES', priority: 9, parent: goal.id, repeat: true }
      );
      break;

    case 'HUNT_PIRATES':
      subgoals.push(
        { type: 'GATHER_INTELLIGENCE', priority: 8, parent: goal.id },
        { type: 'UPGRADE_WEAPONS', priority: 7, parent: goal.id },
        { type: 'LOCATE_PIRATES', priority: 9, parent: goal.id },
        { type: 'ENGAGE_PIRATES', priority: 10, parent: goal.id }
      );
      break;

    case 'ESTABLISH_REPUTATION':
      subgoals.push(
        { type: 'COMPLETE_MISSIONS', priority: 7, parent: goal.id, repeat: true },
        { type: 'HELP_OTHERS', priority: 6, parent: goal.id, repeat: true },
        { type: 'AVOID_CRIMES', priority: 9, parent: goal.id }
      );
      break;

    // ... more goal types
  }

  return subgoals;
}

// Execute HTN with dynamic replanning
executeHTN(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction | null {
  // Get current subgoal
  let currentSubgoal = this.getCurrentSubgoal(goal);

  // If no subgoal or subgoal complete, decompose next level
  if (!currentSubgoal || this.isSubgoalComplete(currentSubgoal)) {
    const newSubgoals = this.decomposeGoal(goal);

    if (newSubgoals.length === 0) {
      // Goal complete!
      goal.status = 'COMPLETED';
      return null;
    }

    // Add to goal tree
    this.addSubgoals(goal, newSubgoals);
    currentSubgoal = newSubgoals[0];
  }

  // Plan action for current subgoal
  const action = this.planActionForSubgoal(currentSubgoal, context);

  // If subgoal fails, try alternative or abandon
  if (!action) {
    if (this.hasAlternatives(currentSubgoal)) {
      return this.tryAlternative(currentSubgoal, context);
    } else {
      this.abandonSubgoal(currentSubgoal);
      return this.executeHTN(goal, context); // Try next subgoal
    }
  }

  return action;
}
```

#### Dynamic Goal Prioritization
```typescript
// Reorder goals based on changing conditions
reprioritizeGoals(goals: NPCGoal[], context: GoalEvaluationContext): void {
  const now = Date.now() / 1000;

  for (const goal of goals) {
    let priority = goal.basePriority || 5;

    // Urgency increases priority
    if (goal.deadline) {
      const timeLeft = goal.deadline - now;
      const urgency = Math.max(0, 1 - timeLeft / goal.estimatedDuration);
      priority += urgency * 3;
    }

    // Opportunity increases priority
    if (this.isOpportunityAvailable(goal, context)) {
      priority += 2;
    }

    // Difficulty affects priority (prefer achievable)
    const difficulty = this.estimateDifficulty(goal, context);
    priority -= difficulty * 0.5;

    // Motivation matters
    if (goal.motivation) {
      if (goal.motivation.type === 'SURVIVAL') priority += 5;
      if (goal.motivation.type === 'REVENGE') priority += 3;
      if (goal.motivation.type === 'GREED') priority += goal.motivation.intensity;
    }

    // Recently failed goals get lower priority (frustration)
    if (goal.failureCount > 0) {
      priority -= goal.failureCount * 0.5;
    }

    goal.priority = Math.max(1, Math.min(10, priority));
  }

  // Sort by priority
  goals.sort((a, b) => b.priority - a.priority);
}
```

---

### 3. AdaptiveAI - Learning Algorithms

#### Q-Learning (Reinforcement Learning)
```typescript
// Learn optimal actions through trial and error
updateQValue(
  situation: string,
  action: string,
  reward: number,
  nextSituation: string
): void {
  const learningRate = 0.1;
  const discountFactor = 0.9;

  // Q(s,a) = Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
  const currentQ = this.getQValue(situation, action);
  const maxNextQ = this.getMaxQValue(nextSituation);

  const newQ = currentQ + learningRate * (
    reward + discountFactor * maxNextQ - currentQ
  );

  this.setQValue(situation, action, newQ);
}

// Select action with ε-greedy strategy
selectAction(situation: string, explorationRate: number = 0.1): string {
  // Exploration: try random action
  if (Math.random() < explorationRate) {
    return this.getRandomAction(situation);
  }

  // Exploitation: use best known action
  return this.getBestAction(situation);
}

getBestAction(situation: string): string {
  const actions = this.getAvailableActions(situation);
  let bestAction = actions[0];
  let bestQ = this.getQValue(situation, bestAction);

  for (const action of actions.slice(1)) {
    const q = this.getQValue(situation, action);
    if (q > bestQ) {
      bestQ = q;
      bestAction = action;
    }
  }

  return bestAction;
}
```

#### Strategy Evolution
```typescript
// Successful strategies strengthen, unsuccessful weaken
evolveStrategies(outcome: 'SUCCESS' | 'FAILURE' | 'MIXED', reward: number): void {
  const recentStrategies = this.getRecentlyUsedStrategies();

  for (const strategy of recentStrategies) {
    // Credit assignment (most recent strategies get more credit)
    const recency = 1 - (Date.now() / 1000 - strategy.lastUsed) / 3600;
    const credit = recency * reward;

    if (outcome === 'SUCCESS') {
      strategy.successCount++;
      strategy.confidence += credit * 0.1;
      strategy.confidence = Math.min(1, strategy.confidence);
    } else if (outcome === 'FAILURE') {
      strategy.failureCount++;
      strategy.confidence -= credit * 0.15;
      strategy.confidence = Math.max(0.1, strategy.confidence);
    }

    // Update success rate
    strategy.successRate = strategy.successCount /
      (strategy.successCount + strategy.failureCount);
  }

  // Prune very unsuccessful strategies
  this.strategies = this.strategies.filter(s =>
    s.successRate > 0.2 || s.usageCount < 5
  );

  // Combine successful strategies (genetic algorithm)
  if (Math.random() < 0.1) {
    this.combineStrategies();
  }
}

combineStrategies(): void {
  const successful = this.strategies
    .filter(s => s.successRate > 0.7 && s.usageCount > 3)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  if (successful.length >= 2) {
    const parent1 = successful[0];
    const parent2 = successful[1];

    // Create hybrid strategy
    const child: Strategy = {
      id: this.generateStrategyId(),
      condition: this.mergeConditions(parent1.condition, parent2.condition),
      actions: this.mergeActions(parent1.actions, parent2.actions),
      confidence: (parent1.confidence + parent2.confidence) / 2,
      successCount: 0,
      failureCount: 0,
      successRate: 0.5,
      usageCount: 0,
      createdAt: Date.now() / 1000,
      lastUsed: 0,
      parentStrategies: [parent1.id, parent2.id]
    };

    this.strategies.push(child);
  }
}
```

#### Skill Progression with Learning Curves
```typescript
// Realistic skill improvement (power law of practice)
improveSkill(skill: Skill, practiceAmount: number): void {
  // Power law: T(n) = T(1) * n^(-α) where α ≈ 0.4
  const alpha = 0.4;
  const practiceEffect = Math.pow(skill.practiceCount + practiceAmount, -alpha) -
                        Math.pow(skill.practiceCount, -alpha);

  skill.practiceCount += practiceAmount;

  // Skill improves with diminishing returns
  const improvement = practiceEffect * skill.learningRate;
  skill.level += improvement;
  skill.level = Math.min(skill.maxLevel || 10, skill.level);

  // Milestones unlock new abilities
  const newMilestone = Math.floor(skill.level);
  if (newMilestone > skill.lastMilestone) {
    this.unlockMilestone(skill, newMilestone);
    skill.lastMilestone = newMilestone;
  }
}

// Skill decay (use it or lose it)
decaySkills(deltaTime: number): void {
  const daysSince = deltaTime / 86400;

  for (const skill of this.skills.values()) {
    const timeSincePractice = Date.now() / 1000 - skill.lastPracticed;
    const daysSincePractice = timeSincePractice / 86400;

    if (daysSincePractice > 7) {
      // Decay starts after 1 week of no practice
      const decayRate = 0.01; // 1% per day
      const decay = decayRate * (daysSincePractice - 7);

      skill.level *= (1 - decay);
      skill.level = Math.max(skill.baseLevel || 1, skill.level);
    }
  }
}
```

---

## Phase 3: Faction Dynamics Systems

### 1. FactionDiplomacyEngine - Dynamic Relationships

#### Relationship Momentum
```typescript
// Relationships have inertia - trends continue
updateRelationshipMomentum(relationship: FactionRelationship, deltaTime: number): void {
  const daysDelta = deltaTime / 86400;

  // Calculate trend (improving or deteriorating)
  const recentChanges = relationship.history.slice(-10);
  const trend = recentChanges.reduce((sum, change) => sum + change.delta, 0) / 10;

  // Momentum continues trend (with decay)
  const momentumEffect = trend * 0.1 * daysDelta;
  const dampening = 0.9; // Momentum gradually decreases

  relationship.opinion += momentumEffect * dampening;
  relationship.momentum = trend;

  // Strong relationships harder to change (inertia)
  const extremity = Math.abs(relationship.opinion - 50);
  relationship.inertia = extremity / 100; // 0 at neutral, 0.5 at extremes
}
```

#### Diplomatic Capital
```typescript
// Spend influence to achieve diplomatic goals
spendDiplomaticCapital(
  faction: string,
  target: string,
  goal: 'IMPROVE_RELATIONS' | 'REQUEST_FAVOR' | 'PRESSURE',
  amount: number
): boolean {
  const capital = this.getDiplomaticCapital(faction, target);

  if (capital < amount) return false;

  // Spend capital
  this.modifyDiplomaticCapital(faction, target, -amount);

  // Apply effect based on goal
  switch (goal) {
    case 'IMPROVE_RELATIONS':
      this.modifyRelationship(faction, target, amount * 2);
      break;
    case 'REQUEST_FAVOR':
      // Process favor request
      break;
    case 'PRESSURE':
      // Apply political pressure
      break;
  }

  return true;
}

// Earn capital through positive interactions
earnDiplomaticCapital(event: HistoricalEvent, factions: string[]): void {
  if (event.category === 'DIPLOMATIC' || event.category === 'ECONOMIC') {
    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        const earnAmount = event.severity * 0.5;
        this.modifyDiplomaticCapital(factions[i], factions[j], earnAmount);
      }
    }
  }
}
```

---

### 2. FactionEconomicNeeds - Supply Chain Modeling

#### Multi-Tier Supply Chain
```typescript
// Model production dependencies
buildSupplyChain(commodity: string): SupplyChain {
  const chain: SupplyChain = {
    commodity,
    tiers: []
  };

  // Tier 0: Raw materials
  chain.tiers[0] = this.getRawMaterials(commodity);

  // Tier 1: Processed materials
  chain.tiers[1] = chain.tiers[0].flatMap(raw =>
    this.getProcessedFrom(raw)
  );

  // Tier 2: Components
  chain.tiers[2] = chain.tiers[1].flatMap(processed =>
    this.getComponentsFrom(processed)
  );

  // Final tier: Finished product
  chain.tiers[3] = [commodity];

  return chain;
}

// Calculate supply disruption impact
calculateDisruptionImpact(
  disruption: { commodity: string; severity: number },
  faction: string
): EconomicImpact {
  const chain = this.getSupplyChain(disruption.commodity);
  let totalImpact = disruption.severity;

  // Cascade through dependent products
  const dependents = this.getDependentCommodities(disruption.commodity);

  for (const dependent of dependents) {
    const dependence = this.getDependenceStrength(dependent, disruption.commodity);
    totalImpact += disruption.severity * dependence * 0.7; // 70% pass-through
  }

  return {
    directImpact: disruption.severity,
    cascadeImpact: totalImpact - disruption.severity,
    totalImpact,
    affectedSectors: dependents
  };
}
```

#### Market Dynamics
```typescript
// Supply and demand pricing
calculateMarketPrice(
  commodity: string,
  location: string,
  basePrice: number
): number {
  const supply = this.getSupply(commodity, location);
  const demand = this.getDemand(commodity, location);

  // Price elasticity
  const supplyDemandRatio = supply / demand;

  // Logarithmic price response
  let priceMultiplier = 1;

  if (supplyDemandRatio < 1) {
    // Shortage: price increases
    priceMultiplier = 1 / supplyDemandRatio;
  } else {
    // Surplus: price decreases
    priceMultiplier = Math.pow(supplyDemandRatio, -0.5);
  }

  // Apply elasticity (some goods less price-sensitive)
  const elasticity = this.getPriceElasticity(commodity);
  priceMultiplier = 1 + (priceMultiplier - 1) * elasticity;

  // Market volatility
  const volatility = this.getMarketVolatility(commodity, location);
  priceMultiplier *= (1 + (Math.random() - 0.5) * volatility);

  return basePrice * priceMultiplier;
}
```

---

## Phase 4: Storytelling Completion

### AbsenceSimulator - Fast-Forward Algorithms

#### Procedural Event Generation
```typescript
// Generate contextually appropriate events during absence
generateProceduralEvent(
  elapsed: number,
  universeState: any,
  progress: number // 0-1 through absence period
): HistoricalEvent | null {
  // Event probability increases with time
  const baseProb = 0.05;
  const timeScaling = Math.log(elapsed / 3600 + 1) * 0.1;
  const eventProb = baseProb + timeScaling;

  if (Math.random() > eventProb) return null;

  // Context-aware event type selection
  const eventType = this.selectEventType(universeState);

  // Generate event with realistic parameters
  return {
    id: this.generateEventId(),
    timestamp: Date.now() / 1000 - elapsed * (1 - progress),
    type: eventType,
    severity: this.generateSeverity(universeState, eventType),
    category: this.getEventCategory(eventType),
    location: this.selectLocation(universeState),
    participants: this.selectParticipants(universeState, eventType),
    description: this.generateDescription(eventType, universeState),
    data: this.generateEventData(eventType, universeState),
    // ...
  };
}

selectEventType(state: any): EventType {
  const weights = {
    TRADE_COMPLETED: 30,
    PIRATE_RAID: 10 * state.pirateActivity,
    BATTLE: 5 * state.conflictLevel,
    DISCOVERY: 2,
    STATION_FOUNDED: 1,
    WAR_DECLARED: 0.5 * state.diplomaticTension,
    ALLIANCE_FORMED: 0.3 * state.diplomaticActivity,
    // ...
  };

  return this.weightedRandom(weights);
}
```

---

### ChronicleGenerator - Pattern Recognition

#### Causal Chain Analysis
```typescript
// Identify cause-and-effect relationships
analyzeCausalChains(events: HistoricalEvent[]): CausalChain[] {
  const chains: CausalChain[] = [];

  // Sort chronologically
  const sorted = events.sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const chain: CausalChain = {
      root: event,
      links: []
    };

    // Look for consequences within time window
    for (let j = i + 1; j < sorted.length; j++) {
      const potential = sorted[j];
      const timeDelta = potential.timestamp - event.timestamp;

      if (timeDelta > 604800) break; // 1 week window

      // Check causal indicators
      const causalStrength = this.calculateCausalStrength(event, potential);

      if (causalStrength > 0.5) {
        chain.links.push({
          event: potential,
          causalStrength,
          mechanism: this.identifyCausalMechanism(event, potential)
        });
      }
    }

    if (chain.links.length > 0) {
      chains.push(chain);
    }
  }

  return chains;
}

calculateCausalStrength(cause: HistoricalEvent, effect: HistoricalEvent): number {
  let strength = 0;

  // Shared participants
  const participantOverlap = cause.participants.filter(p =>
    effect.participants.includes(p)
  ).length / cause.participants.length;
  strength += participantOverlap * 0.4;

  // Shared location
  if (cause.systemId === effect.systemId) {
    strength += 0.3;
  }

  // Category connection (military → military, economic → economic)
  if (cause.category === effect.category) {
    strength += 0.2;
  }

  // Explicit consequence link
  if (effect.data?.causedBy === cause.id) {
    strength += 0.5;
  }

  return Math.min(1, strength);
}
```

#### Historical Significance Calculation
```typescript
// Determine which events matter most
calculateHistoricalSignificance(event: HistoricalEvent, context: {
  totalEvents: number;
  timespan: number;
  affectedPopulation: number;
}): number {
  let significance = 0;

  // Severity baseline
  significance += event.severity * 10;

  // Scope (how many affected)
  const scope = event.participants.length + (event.data?.casualties || 0);
  significance += Math.log(scope + 1) * 5;

  // Uniqueness (rare events more significant)
  const typeFrequency = context.totalEvents / this.countEventType(event.type);
  significance += Math.log(typeFrequency + 1) * 3;

  // Long-term consequences
  const consequences = this.getConsequences(event);
  significance += consequences.length * 2;

  // Causal centrality (events that caused other events)
  const causalityScore = this.getCausalityScore(event);
  significance += causalityScore * 15;

  // Lasting impact (still affecting things)
  const lastingImpact = this.calculateLastingImpact(event);
  significance += lastingImpact * 10;

  return Math.min(100, significance);
}
```

---

## Integration - UniverseOrchestrator

### Complete Event Pipeline
```typescript
// Event → Consequences → News → Rumors → Chronicles
processUniverseEvent(event: HistoricalEvent): void {
  // 1. Record in history
  this.history.recordEvent(event);

  // 2. Generate consequences
  const consequences = this.consequences.processEvent(event);

  // 3. Notify affected entities
  for (const participant of event.participants) {
    const entityAI = this.getEntityAI(participant);
    if (entityAI) {
      entityAI.memory.recordExperience(this.eventToExperience(event));

      // Trigger goal changes
      entityAI.goals.processEvent(event);

      // Learning opportunity
      const outcome = this.classifyOutcome(event, participant);
      entityAI.ai.recordOutcome(event.type, event.description, outcome);
    }
  }

  // 4. Generate news
  if (event.severity >= 5) {
    const perspectives = event.participants.slice(0, 3);
    for (const faction of perspectives) {
      const article = this.newsEngine.generateNews(event, faction, 'NEUTRAL');

      // 5. Create rumors
      const rumor = this.rumors.createRumorFromNews(article, event.systemId);

      // 6. Spread through network
      this.rumors.spreadToNetwork(rumor.id, event.systemId);
    }
  }

  // 7. Process delayed consequences
  const readyConsequences = this.consequences.updatePendingConsequences(Date.now() / 1000);
  for (const cons of readyConsequences) {
    if (cons.event) {
      // Consequence spawned new event - recurse
      this.processUniverseEvent(cons.event);
    }
  }

  // 8. Check for chronicle-worthy patterns
  if (event.severity >= 8) {
    this.checkForChroniclePatterns(event);
  }
}
```

### Performance Optimization
```typescript
// Spatial partitioning for entity updates
updateEntities(deltaTime: number): void {
  // Only update entities in active sectors
  const activeSectors = this.getActiveSectors();

  for (const sector of activeSectors) {
    const entities = this.spatialHash.getEntitiesInSector(sector);

    for (const entity of entities) {
      // LOD: Update rate based on distance from player
      const distance = this.getDistanceFromPlayer(entity);

      if (distance < 1000) {
        // Near: Full update (60 Hz)
        this.updateEntityFull(entity, deltaTime);
      } else if (distance < 10000) {
        // Medium: Reduced update (10 Hz)
        if (this.frameCount % 6 === 0) {
          this.updateEntityReduced(entity, deltaTime * 6);
        }
      } else {
        // Far: Minimal update (1 Hz)
        if (this.frameCount % 60 === 0) {
          this.updateEntityMinimal(entity, deltaTime * 60);
        }
      }
    }
  }
}
```

---

## Summary

These algorithms provide the core logic needed to flesh out all remaining
systems to production-ready quality. Each algorithm is:

- **Mathematically grounded** (forgetting curves, power laws, probability distributions)
- **Psychologically realistic** (memory, learning, relationships)
- **Economically sound** (supply/demand, price elasticity, cascades)
- **Computationally efficient** (spatial partitioning, LOD, caching)
- **Emergent** (simple rules → complex behaviors)

Integration of these algorithms will achieve true "Dwarf Fortress level"
emergent complexity with sophisticated, believable AI across all systems.
