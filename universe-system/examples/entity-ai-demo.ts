/**
 * Entity AI Integration Demo - Phase 2
 *
 * Demonstrates deep NPC memory, goal-driven behavior, and adaptive learning
 */

import {
  ExtendedNPCMemory,
  NPCGoalSystem,
  AdaptiveAI,
  GoalType,
  DecisionContext
} from '../src/entity-ai';

console.log('='.repeat(70));
console.log('ENTITY AI DEMO - Phase 2: Deep NPC Intelligence');
console.log('='.repeat(70));
console.log();

// ====================================================================
// SCENARIO 1: Create an NPC with personality
// ====================================================================

console.log('SCENARIO 1: Create NPC with personality');
console.log('-'.repeat(70));

const trader = new ExtendedNPCMemory('trader_alice', 'SHIP', {
  aggression: 0.2,    // Peaceful
  caution: 0.7,       // Careful
  greed: 0.8,         // Money-motivated
  curiosity: 0.4,     // Moderate explorer
  loyalty: 0.6,       // Fairly loyal
  trustingness: 0.5,  // Balanced
  sociability: 0.7,   // Social
  risktaking: 0.3,    // Risk-averse
  patience: 0.8,      // Very patient
  adaptability: 0.6   // Fairly adaptable
});

console.log('Created trader "Alice"');
console.log('Personality:');
console.log(`  Aggression: ${trader.personality.aggression * 100}%`);
console.log(`  Caution: ${trader.personality.caution * 100}%`);
console.log(`  Greed: ${trader.personality.greed * 100}%`);
console.log(`  Curiosity: ${trader.personality.curiosity * 100}%`);
console.log();

// ====================================================================
// SCENARIO 2: Record experiences
// ====================================================================

console.log('SCENARIO 2: Record life experiences');
console.log('-'.repeat(70));

// First successful trade
trader.recordExperience({
  id: 'exp_001',
  timestamp: 1000,
  type: 'SUCCESSFUL_TRADE',
  event: {
    id: 'event_trade_001',
    timestamp: 1000,
    type: 'TRADE_COMPLETED',
    severity: 3,
    category: 'ECONOMIC',
    location: { x: 1000, y: 2000, z: 500 },
    participants: ['trader_alice', 'station_mars'],
    description: 'Completed profitable water trade',
    data: { profit: 5000 },
    consequences: [],
    witnessed: false,
    priority: 3,
    tags: ['trade', 'water']
  },
  emotionalImpact: 7,
  intensity: 6,
  location: { x: 1000, y: 2000, z: 500 },
  witnesses: [],
  lessonLearned: {
    condition: 'When trading water',
    action: 'Target high-demand stations',
    confidence: 0.6,
    learnedFrom: ['exp_001'],
    successCount: 1,
    failureCount: 0,
    lastApplied: 1000
  },
  memoryStrength: 1.0,
  recallCount: 0
});

console.log('✓ Recorded first successful trade');
console.log('  Lesson learned: "When trading water, target high-demand stations"');
console.log();

// Near-death experience from pirate attack
trader.recordExperience({
  id: 'exp_002',
  timestamp: 2000,
  type: 'NEAR_DEATH',
  event: {
    id: 'event_pirate_002',
    timestamp: 2000,
    type: 'PIRATE_RAID',
    severity: 9,
    category: 'MILITARY',
    location: { x: 5000, y: 3000, z: 200 },
    participants: ['trader_alice', 'pirate_brutus'],
    description: 'Attacked by pirates, barely escaped',
    data: { damage: 75 },
    consequences: [],
    witnessed: false,
    priority: 9,
    tags: ['pirate', 'combat', 'escape']
  },
  emotionalImpact: -9,
  intensity: 10,
  location: { x: 5000, y: 3000, z: 200 },
  witnesses: ['nearby_patrol'],
  behaviorChange: {
    type: 'PERMANENT',
    description: 'Developed fear of pirates and risky routes',
    personalityShift: {
      caution: 0.1,      // Increase caution
      risktaking: -0.15  // Decrease risk-taking
    }
  },
  memoryStrength: 1.0,
  recallCount: 0
});

console.log('✓ Recorded traumatic pirate attack');
console.log('  Behavior changed: Increased caution, decreased risk-taking');
console.log('  Trauma recorded');
console.log();

const stats = trader.getStatistics();
console.log('Memory Statistics:');
console.log(`  Total experiences: ${stats.totalExperiences}`);
console.log(`  Significant experiences: ${stats.significantExperiences}`);
console.log(`  Traumas: ${stats.traumas}`);
console.log(`  Lessons learned: ${stats.lessons}`);
console.log();

// ====================================================================
// SCENARIO 3: Relationships
// ====================================================================

console.log('SCENARIO 3: Form relationships');
console.log('-'.repeat(70));

// Positive relationship with Mars Station
trader.updateRelationship('station_mars', {
  type: 'PARTNER',
  strength: 60,
  trustLevel: 70,
  respectLevel: 65
});

console.log('✓ Formed partnership with Mars Station');
console.log('  Type: PARTNER');
console.log('  Strength: +60');
console.log('  Trust: 70%');
console.log();

// Negative relationship with pirate
trader.updateRelationship('pirate_brutus', {
  type: 'ENEMY',
  strength: -80,
  trustLevel: 0,
  respectLevel: 10,
  fearLevel: 85
});

console.log('✓ Formed enemy relationship with pirate Brutus');
console.log('  Type: ENEMY');
console.log('  Strength: -80');
console.log('  Fear: 85%');
console.log();

// ====================================================================
// SCENARIO 4: Goal-driven behavior
// ====================================================================

console.log('SCENARIO 4: Goal-driven behavior');
console.log('-'.repeat(70));

const goalSystem = new NPCGoalSystem(trader);

// Add wealth accumulation goal
goalSystem.addGoal({
  id: 'goal_wealth_001',
  type: 'ACCUMULATE_WEALTH',
  category: 'ECONOMIC',
  name: 'Get Rich',
  description: 'Accumulate 100,000 credits through trading',
  priority: 80,
  urgency: 50,
  progress: 0.1,  // 10% complete (earned 10k of 100k)
  subgoals: [
    { description: 'Earn first 10,000 credits', completed: true, optional: false, progress: 1.0 },
    { description: 'Establish profitable trade route', completed: false, optional: false, progress: 0.3 },
    { description: 'Reach 50,000 credits', completed: false, optional: false, progress: 0 },
    { description: 'Invest in cargo expansion', completed: false, optional: true, progress: 0 },
    { description: 'Reach 100,000 credits', completed: false, optional: false, progress: 0 }
  ],
  currentSubgoal: 1,
  prerequisites: [],
  requiredResources: [
    { type: 'TIME', amount: 100000, current: 20000 },
    { type: 'CARGO_SPACE', amount: 100, current: 50 }
  ],
  motivation: {
    type: 'INTRINSIC',
    reason: 'Desire for financial security',
    emotionalDrive: 8
  },
  expectedReward: {
    credits: 100000,
    satisfaction: 9,
    unlocks: ['buy_own_station']
  },
  status: 'ACTIVE',
  attempts: 3,
  failures: 0,
  createdAt: 500,
  createdBy: 'SELF',
  tags: ['wealth', 'trading', 'long-term']
});

console.log('✓ Added goal: "Get Rich" (ACCUMULATE_WEALTH)');
console.log('  Priority: 80/100');
console.log('  Progress: 10%');
console.log('  Subgoals: 5 (1 completed)');
console.log();

// Add revenge goal (from pirate attack trauma)
goalSystem.addGoal({
  id: 'goal_revenge_001',
  type: 'AVENGE_WRONG',
  category: 'PERSONAL',
  name: 'Avenge Pirate Attack',
  description: 'Get revenge on pirate Brutus',
  priority: 60,
  urgency: 40,
  progress: 0,
  subgoals: [
    { description: 'Gather information on pirate Brutus', completed: false, optional: false, progress: 0 },
    { description: 'Hire protection or allies', completed: false, optional: true, progress: 0 },
    { description: 'Confront pirate', completed: false, optional: false, progress: 0 }
  ],
  currentSubgoal: 0,
  prerequisites: [],
  motivation: {
    type: 'COMPULSION',
    reason: 'Trauma from near-death experience',
    emotionalDrive: 7
  },
  expectedReward: {
    satisfaction: 10,
    reputation: new Map([['honest_traders', 20]])
  },
  status: 'ACTIVE',
  attempts: 0,
  failures: 0,
  createdAt: 2100,
  createdBy: 'SELF',
  relatedEntities: ['pirate_brutus'],
  tags: ['revenge', 'personal', 'trauma']
});

console.log('✓ Added goal: "Avenge Pirate Attack" (AVENGE_WRONG)');
console.log('  Priority: 60/100');
console.log('  Motivation: Trauma-driven');
console.log();

const goalStats = goalSystem.getStatistics();
console.log('Goal System Statistics:');
console.log(`  Active goals: ${goalStats.activeGoals}`);
console.log(`  Completed goals: ${goalStats.completedGoals}`);
console.log(`  Total goals: ${goalStats.totalGoals}`);
console.log();

// ====================================================================
// SCENARIO 5: Adaptive AI - Learning and decision making
// ====================================================================

console.log('SCENARIO 5: Adaptive AI - Learning from experiences');
console.log('-'.repeat(70));

const ai = new AdaptiveAI(trader, goalSystem);

// Record learning from successful trade
ai.recordOutcome(
  'trading water at high-demand station',
  'buy low, sell high',
  'SUCCESS',
  8,  // High reward
  { profit: 5000, timeSpent: 1800 }
);

console.log('✓ Learned from successful trade');
console.log('  Situation: "trading water at high-demand station"');
console.log('  Action: "buy low, sell high"');
console.log('  Outcome: SUCCESS (+8 reward)');
console.log();

// Record learning from pirate encounter
ai.recordOutcome(
  'encountered pirates in asteroid field',
  'attempted to fight',
  'FAILURE',
  -9,  // High penalty
  { damage: 75, escaped: true }
);

console.log('✓ Learned from pirate encounter');
console.log('  Situation: "encountered pirates in asteroid field"');
console.log('  Action: "attempted to fight"');
console.log('  Outcome: FAILURE (-9 reward)');
console.log('  Lesson: Avoid fighting pirates (recorded as trauma)');
console.log();

// Make decision in new situation
const decision = ai.makeDecision({
  situation: 'encountered pirates in asteroid field',
  availableActions: ['fight', 'flee', 'hide', 'call for help'],
  resources: { credits: 50000, fuel: 800, cargoSpace: 50, health: 100 },
  threats: ['pirate_brutus'],
  opportunities: []
});

console.log('✓ Made decision in dangerous situation:');
console.log(`  Chosen action: "${decision.chosenAction}"`);
console.log(`  Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
console.log(`  Reasoning: ${decision.reasoning}`);
console.log(`  Risk assessment: ${(decision.riskAssessment * 100).toFixed(0)}%`);
console.log(`  Expected outcome: ${decision.expectedOutcome}`);
console.log();

// Show expertise gained
const aiStats = ai.getStatistics();
console.log('AI Learning Statistics:');
console.log(`  Total decisions: ${aiStats.totalDecisions}`);
console.log(`  Success rate: ${(aiStats.successRate * 100).toFixed(1)}%`);
console.log(`  Strategies learned: ${aiStats.strategiesLearned}`);
console.log(`  Expertise levels earned: ${aiStats.totalExpertiseLevels}`);
if (aiStats.topExpertise) {
  console.log(`  Top expertise: ${aiStats.topExpertise.domain} (Level ${aiStats.topExpertise.level})`);
}
console.log();

// ====================================================================
// SCENARIO 6: Long-term evolution
// ====================================================================

console.log('SCENARIO 6: Simulate long-term evolution');
console.log('-'.repeat(70));

console.log('Simulating 10 trading cycles...');
console.log();

for (let i = 0; i < 10; i++) {
  // Simulate successful trades
  ai.recordOutcome(
    'trading at stations',
    'buy low, sell high',
    Math.random() > 0.3 ? 'SUCCESS' : 'FAILURE',
    Math.random() > 0.3 ? (5 + Math.random() * 5) : -(2 + Math.random() * 3)
  );

  // Update memory
  trader.update(3600);  // 1 hour passed
}

console.log('✓ Simulation complete');
console.log();

const finalStats = ai.getStatistics();
console.log('Final Statistics:');
console.log(`  Total decisions: ${finalStats.totalDecisions}`);
console.log(`  Success rate: ${(finalStats.successRate * 100).toFixed(1)}%`);
console.log(`  Strategies learned: ${finalStats.strategiesLearned}`);
console.log();

// Check personality changes
const currentPersonality = trader.getCurrentPersonality();
console.log('Personality Evolution:');
console.log(`  Aggression: ${trader.personality.aggression * 100}% → ${currentPersonality.aggression * 100}%`);
console.log(`  Caution: ${trader.personality.caution * 100}% → ${currentPersonality.caution * 100}%`);
console.log(`  Greed: ${trader.personality.greed * 100}% → ${currentPersonality.greed * 100}%`);
console.log();

// ====================================================================
// SCENARIO 7: Generate biography
// ====================================================================

console.log('SCENARIO 7: Generate NPC biography');
console.log('-'.repeat(70));

const biography = trader.generateBiography();
console.log(biography);
console.log();

const expertiseReport = ai.generateExpertiseReport();
console.log(expertiseReport);
console.log();

// ====================================================================
// SUMMARY
// ====================================================================

console.log('='.repeat(70));
console.log('DEMO COMPLETE - Entity AI Systems');
console.log('='.repeat(70));
console.log();
console.log('Phase 2 Features Demonstrated:');
console.log('  ✓ Extended NPC memory with experiences');
console.log('  ✓ Trauma and emotional responses');
console.log('  ✓ Learned behaviors from experiences');
console.log('  ✓ Complex relationship management');
console.log('  ✓ Goal-driven behavior with priorities');
console.log('  ✓ Multi-step action planning');
console.log('  ✓ Adaptive AI with learning');
console.log('  ✓ Strategy development from outcomes');
console.log('  ✓ Expertise and skill progression');
console.log('  ✓ Personality evolution over time');
console.log('  ✓ Biography and chronicle generation');
console.log();
console.log('This NPC now has:');
console.log(`  - ${stats.totalExperiences} life experiences`);
console.log(`  - ${stats.traumas} traumatic memories`);
console.log(`  - ${stats.lessons} learned lessons`);
console.log(`  - ${stats.relationships} relationships`);
console.log(`  - ${goalStats.activeGoals} active goals`);
console.log(`  - ${finalStats.strategiesLearned} learned strategies`);
console.log(`  - ${(finalStats.successRate * 100).toFixed(1)}% decision success rate`);
console.log();
console.log('The NPC is ALIVE with memories, goals, and learning ability!');
console.log();
