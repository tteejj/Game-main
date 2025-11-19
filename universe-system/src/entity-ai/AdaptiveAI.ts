/**
 * AdaptiveAI - Learning and behavior modification system
 *
 * Enables NPCs to:
 * - Learn from success and failure
 * - Adapt strategies based on outcomes
 * - Modify behavior based on experiences
 * - Build expertise over time
 * - Recognize and avoid repeated mistakes
 */

import { ExtendedNPCMemory, Experience, Lesson, BehaviorModification, PersonalityTraits } from './ExtendedNPCMemory';
import { NPCGoalSystem, NPCGoal, PlannedAction } from './NPCGoalSystem';

export interface LearningEvent {
  timestamp: number;
  situation: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'MIXED';
  reward: number;                 // -10 to +10
  context: any;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;

  // When to use
  condition: string;
  applicableConditions: string[];

  // What to do
  actions: string[];

  // Performance tracking
  successCount: number;
  failureCount: number;
  totalAttempts: number;
  usageCount: number;
  successRate: number;

  // Metrics
  averageReward: number;
  confidence: number;             // 0-1 (based on data quality)
  lastUsed: number;

  // Evolution
  createdAt: number;
  parentStrategies?: string[];    // For evolved strategies
}

export interface Expertise {
  domain: ExpertiseDomain;
  level: number;                  // 0-100
  experiencePoints: number;

  // Skills in this domain
  skills: Map<string, Skill>;

  // Notable achievements
  milestones: Milestone[];
}

export type ExpertiseDomain =
  | 'TRADING' | 'COMBAT' | 'NAVIGATION' | 'DIPLOMACY'
  | 'EXPLORATION' | 'MINING' | 'SALVAGE' | 'SURVIVAL';

export interface Skill {
  name: string;
  proficiency: number;            // 0-100
  level: number;                  // 0-10 skill level
  practiceCount: number;          // Number of practice attempts
  practiceHours: number;
  successRate: number;            // 0-1
  lastPracticed: number;

  // Learning curve
  learningRate: number;           // How fast they improve
  plateauLevel?: number;          // Natural limit
  maxLevel?: number;              // Maximum achievable level
  baseLevel?: number;             // Minimum level (after decay)

  // Milestones
  lastMilestone: number;          // Last milestone achieved
}

export interface Milestone {
  name: string;
  description: string;
  achievedAt: number;
  experiencePointsEarned: number;
}

export interface DecisionContext {
  situation: string;
  availableActions: string[];
  currentGoal?: NPCGoal;
  resources: any;
  threats: string[];
  opportunities: string[];
}

export interface Decision {
  chosenAction: string;
  confidence: number;             // 0-1
  reasoning: string;
  expectedOutcome: string;
  riskAssessment: number;         // 0-1
}

export class AdaptiveAI {
  private memory: ExtendedNPCMemory;
  private goalSystem: NPCGoalSystem;

  // Learning
  private learningHistory: LearningEvent[] = [];
  private strategies: Map<string, Strategy> = new Map();

  // Q-Learning (Reinforcement Learning)
  private qTable: Map<string, Map<string, number>> = new Map();  // situation -> action -> Q-value

  // Expertise
  private expertise: Map<ExpertiseDomain, Expertise> = new Map();

  // Performance tracking
  private successfulOutcomes: number = 0;
  private failedOutcomes: number = 0;
  private totalDecisions: number = 0;

  // Strategy evolution tracking
  private strategySeedCounter: number = 0;

  // Simulated time tracking for decay
  private simulatedTime: number = 0;

  // Configuration
  private readonly LEARNING_RATE = 0.1;          // How fast to adapt
  private readonly EXPLORATION_RATE = 0.2;       // Chance to try new strategies
  private readonly DISCOUNT_FACTOR = 0.9;        // Q-learning discount
  private readonly MEMORY_WINDOW = 100;          // Keep last N learning events

  constructor(memory: ExtendedNPCMemory, goalSystem: NPCGoalSystem) {
    this.memory = memory;
    this.goalSystem = goalSystem;

    this.initializeExpertise();
  }

  /**
   * Make a decision given the context
   */
  public makeDecision(context: DecisionContext): Decision {
    this.totalDecisions++;

    const personality = this.memory.getCurrentPersonality();

    // Get applicable strategies
    const applicableStrategies = this.getApplicableStrategies(context.situation);

    // Get relevant lessons from memory
    const lessons = this.memory.getApplicableLessons(context.situation);

    // Exploration vs Exploitation
    let chosenStrategy: Strategy | null = null;

    if (Math.random() < this.EXPLORATION_RATE && personality.adaptability > 0.3) {
      // Explore: Try random action
      chosenStrategy = null;
    } else {
      // Exploit: Use best known strategy
      chosenStrategy = this.selectBestStrategy(applicableStrategies);
    }

    let chosenAction: string;
    let confidence: number;
    let reasoning: string;

    if (chosenStrategy) {
      // Use learned strategy
      chosenAction = chosenStrategy.actions[0];  // Simplified: use first action
      confidence = chosenStrategy.confidence;
      reasoning = `Using strategy "${chosenStrategy.name}" with ${chosenStrategy.totalAttempts} attempts and ${(chosenStrategy.averageReward > 0 ? '+' : '')}${chosenStrategy.averageReward.toFixed(1)} avg reward`;
    } else {
      // Random/exploration
      chosenAction = context.availableActions[Math.floor(Math.random() * context.availableActions.length)];
      confidence = 0.3;
      reasoning = 'Exploring new approach';
    }

    // Apply lessons from memory
    for (const lesson of lessons) {
      if (lesson.condition === context.situation && lesson.confidence > confidence) {
        chosenAction = lesson.action;
        confidence = lesson.confidence;
        reasoning = `Applying learned lesson (${lesson.successCount} successes)`;
      }
    }

    // Personality-based adjustments
    const riskAssessment = this.assessRisk(chosenAction, context, personality);

    // If too risky for personality, reconsider
    if (riskAssessment > personality.caution) {
      // Pick safer action
      const safeActions = context.availableActions.filter(a => this.assessRisk(a, context, personality) < personality.caution);
      if (safeActions.length > 0) {
        chosenAction = safeActions[0];
        reasoning += ' (modified for caution)';
      }
    }

    return {
      chosenAction,
      confidence,
      reasoning,
      expectedOutcome: this.predictOutcome(chosenAction, context),
      riskAssessment
    };
  }

  /**
   * Record outcome of decision/action
   */
  public recordOutcome(
    situation: string,
    action: string,
    outcome: 'SUCCESS' | 'FAILURE' | 'MIXED',
    reward: number,
    context?: any
  ): void {
    const learningEvent: LearningEvent = {
      timestamp: Date.now() / 1000,
      situation,
      action,
      outcome,
      reward,
      context
    };

    this.learningHistory.push(learningEvent);

    // Update performance tracking
    if (outcome === 'SUCCESS') {
      this.successfulOutcomes++;
    } else if (outcome === 'FAILURE') {
      this.failedOutcomes++;
    }

    // Learn from this outcome
    this.learn(learningEvent);

    // Update or create strategy
    this.updateStrategy(situation, action, outcome, reward);

    // Update expertise
    this.updateExpertise(learningEvent);

    // Prune old learning events
    if (this.learningHistory.length > this.MEMORY_WINDOW) {
      this.learningHistory = this.learningHistory.slice(-this.MEMORY_WINDOW);
    }
  }

  /**
   * Learn from experience
   */
  private learn(event: LearningEvent): void {
    const personality = this.memory.getCurrentPersonality();

    // Generate lesson
    if (event.outcome === 'SUCCESS' && event.reward > 5) {
      // Positive lesson
      const lesson: Lesson = {
        condition: event.situation,
        action: event.action,
        confidence: 0.5,
        learnedFrom: [`learning_event_${event.timestamp}`],
        successCount: 1,
        failureCount: 0,
        lastApplied: event.timestamp
      };

      // TODO: addLearnedBehavior method not implemented yet in ExtendedNPCMemory
      // this.memory.addLearnedBehavior(
      //   this.memory.entityId,
      //   lesson.condition,
      //   lesson.action,
      //   `learning_event_${event.timestamp}`
      // );
    } else if (event.outcome === 'FAILURE' && event.reward < -5) {
      // Negative lesson - avoid this
      const lesson: Lesson = {
        condition: event.situation,
        action: `AVOID: ${event.action}`,
        confidence: 0.5,
        learnedFrom: [`learning_event_${event.timestamp}`],
        successCount: 0,
        failureCount: 1,
        lastApplied: event.timestamp
      };

      // Record as trauma if severe enough
      if (event.reward < -8) {
        // This will be recorded as trauma in memory
        const experience: Experience = {
          id: `learning_failure_${event.timestamp}`,
          timestamp: event.timestamp,
          type: 'FAILURE',
          event: {
            id: `event_${event.timestamp}`,
            timestamp: event.timestamp,
            type: 'CUSTOM_EVENT',
            severity: Math.abs(event.reward),
            category: 'PERSONAL',
            location: { x: 0, y: 0, z: 0 },
            participants: [this.memory.entityId],
            description: `Failed: ${event.situation} - ${event.action}`,
            data: event,
            consequences: [],
            witnessed: true,
            priority: Math.abs(event.reward),
            tags: ['learning', 'failure']
          },
          emotionalImpact: event.reward,
          intensity: Math.abs(event.reward),
          location: { x: 0, y: 0, z: 0 },
          witnesses: [],
          lessonLearned: lesson,
          memoryStrength: 1.0,
          recallCount: 0,
          consolidated: false
        };

        this.memory.recordExperience(experience);
      }
    }

    // Personality modification based on experiences
    if (Math.abs(event.reward) > 7) {
      this.modifyPersonalityFromExperience(event, personality);
    }
  }

  /**
   * Update strategy based on outcome
   */
  private updateStrategy(
    situation: string,
    action: string,
    outcome: 'SUCCESS' | 'FAILURE' | 'MIXED',
    reward: number
  ): void {
    const key = `${situation}:${action}`;

    let strategy = this.strategies.get(key);

    if (!strategy) {
      // Create new strategy
      strategy = {
        id: `strategy_${this.strategySeedCounter++}`,
        name: `${situation} → ${action}`,
        description: `When "${situation}", do "${action}"`,
        condition: situation,
        applicableConditions: [situation],
        actions: [action],
        successCount: 0,
        failureCount: 0,
        totalAttempts: 0,
        usageCount: 0,
        successRate: 0,
        averageReward: 0,
        confidence: 0.1,
        lastUsed: Date.now() / 1000,
        createdAt: Date.now() / 1000
      };
      this.strategies.set(key, strategy);
    }

    // Update statistics
    strategy.totalAttempts++;
    strategy.usageCount++;
    strategy.lastUsed = Date.now() / 1000;

    if (outcome === 'SUCCESS') {
      strategy.successCount++;
    } else if (outcome === 'FAILURE') {
      strategy.failureCount++;
    }

    // Update average reward (moving average)
    const alpha = this.LEARNING_RATE;
    strategy.averageReward = strategy.averageReward * (1 - alpha) + reward * alpha;

    // Update success rate
    strategy.successRate = strategy.successCount / strategy.totalAttempts;

    // Update confidence based on data quality
    const sampleSize = Math.min(strategy.totalAttempts / 10, 1.0);  // More attempts = more confidence
    strategy.confidence = strategy.successRate * sampleSize;

    // Update Q-values
    this.updateQValue(situation, action, reward, situation);  // Simplified next state

    // Evolve strategies periodically
    this.evolveStrategies(outcome, reward);
  }

  /**
   * Update expertise levels
   */
  private updateExpertise(event: LearningEvent): void {
    // Determine which domain this applies to
    const domain = this.inferDomain(event.situation);

    if (!domain) return;

    let expertise = this.expertise.get(domain);
    if (!expertise) {
      expertise = {
        domain,
        level: 0,
        experiencePoints: 0,
        skills: new Map(),
        milestones: []
      };
      this.expertise.set(domain, expertise);
    }

    // Award experience points
    const xpGain = event.outcome === 'SUCCESS' ? 10 : 2;  // Still learn from failures
    expertise.experiencePoints += xpGain;

    // Update level (every 100 XP = 1 level)
    const newLevel = Math.floor(expertise.experiencePoints / 100);
    if (newLevel > expertise.level) {
      expertise.level = newLevel;

      // Award milestone
      expertise.milestones.push({
        name: `Level ${newLevel} ${domain}`,
        description: `Reached level ${newLevel} in ${domain}`,
        achievedAt: Date.now() / 1000,
        experiencePointsEarned: expertise.experiencePoints
      });
    }

    // Update skill proficiency
    const skillName = event.action;
    let skill = expertise.skills.get(skillName);

    if (!skill) {
      skill = {
        name: skillName,
        proficiency: 0,
        level: 1,
        practiceCount: 0,
        practiceHours: 0,
        successRate: 0,
        lastPracticed: this.simulatedTime,
        learningRate: 1.0,
        maxLevel: 10,
        baseLevel: 1,
        lastMilestone: 0
      };
      expertise.skills.set(skillName, skill);
    }

    // Update last practiced time
    skill.lastPracticed = this.simulatedTime;

    // Improve skill using power law of practice
    const practiceAmount = event.outcome === 'SUCCESS' ? 1 : 0.25;
    this.improveSkill(skill, practiceAmount);

    // Update success rate (moving average)
    const alpha = 0.1;
    skill.successRate = skill.successRate * (1 - alpha) + (event.outcome === 'SUCCESS' ? 1 : 0) * alpha;
  }

  /**
   * Modify personality based on significant experiences
   */
  private modifyPersonalityFromExperience(event: LearningEvent, personality: PersonalityTraits): void {
    const change = 0.05;  // Small incremental changes

    if (event.situation.includes('combat')) {
      if (event.outcome === 'SUCCESS' && event.reward > 7) {
        // Successful combat increases aggression
        personality.aggression = Math.min(1.0, personality.aggression + change);
      } else if (event.outcome === 'FAILURE' && event.reward < -7) {
        // Failed combat increases caution
        personality.caution = Math.min(1.0, personality.caution + change);
        personality.aggression = Math.max(0.0, personality.aggression - change);
      }
    }

    if (event.situation.includes('trade')) {
      if (event.outcome === 'SUCCESS' && event.reward > 7) {
        // Successful trade increases greed
        personality.greed = Math.min(1.0, personality.greed + change);
      }
    }

    if (event.situation.includes('betrayal') || event.situation.includes('ambush')) {
      // Betrayal decreases trustingness
      personality.trustingness = Math.max(0.0, personality.trustingness - change * 2);
      personality.caution = Math.min(1.0, personality.caution + change * 2);
    }

    if (event.situation.includes('rescue') || event.situation.includes('help')) {
      if (event.outcome === 'SUCCESS') {
        // Successful helping increases altruism (decreases greed)
        personality.greed = Math.max(0.0, personality.greed - change);
      }
    }
  }

  /**
   * Select best strategy from applicable ones
   */
  private selectBestStrategy(strategies: Strategy[]): Strategy | null {
    if (strategies.length === 0) return null;

    // Sort by expected value (average reward * confidence)
    strategies.sort((a, b) => {
      const scoreA = a.averageReward * a.confidence;
      const scoreB = b.averageReward * b.confidence;
      return scoreB - scoreA;
    });

    return strategies[0];
  }

  /**
   * Get applicable strategies for situation
   */
  private getApplicableStrategies(situation: string): Strategy[] {
    const applicable: Strategy[] = [];

    for (const strategy of this.strategies.values()) {
      if (strategy.applicableConditions.some(cond => situation.includes(cond))) {
        applicable.push(strategy);
      }
    }

    return applicable;
  }

  /**
   * Assess risk of action
   */
  private assessRisk(action: string, context: DecisionContext, personality: PersonalityTraits): number {
    let risk = 0.5;  // Default medium risk

    // High-risk keywords
    if (action.includes('combat') || action.includes('attack')) {
      risk = 0.8;
    }
    if (action.includes('flee') || action.includes('escape')) {
      risk = 0.6;
    }
    if (action.includes('trade') || action.includes('communicate')) {
      risk = 0.3;
    }
    if (action.includes('wait') || action.includes('hide')) {
      risk = 0.1;
    }

    // Context adjustments
    if (context.threats.length > 0) {
      risk += 0.2;
    }

    return Math.max(0, Math.min(1, risk));
  }

  /**
   * Predict outcome of action
   */
  private predictOutcome(action: string, context: DecisionContext): string {
    const strategies = this.getApplicableStrategies(context.situation);

    for (const strategy of strategies) {
      if (strategy.actions.includes(action)) {
        if (strategy.averageReward > 5) {
          return 'Likely success (based on past experience)';
        } else if (strategy.averageReward < -5) {
          return 'Likely failure (based on past experience)';
        } else {
          return 'Uncertain outcome';
        }
      }
    }

    return 'Unknown outcome (no prior experience)';
  }

  /**
   * Infer expertise domain from situation
   */
  private inferDomain(situation: string): ExpertiseDomain | null {
    const lower = situation.toLowerCase();

    if (lower.includes('trad') || lower.includes('market') || lower.includes('buy') || lower.includes('sell')) return 'TRADING';
    if (lower.includes('combat') || lower.includes('fight') || lower.includes('attack') || lower.includes('weapon')) return 'COMBAT';
    if (lower.includes('navigat') || lower.includes('travel') || lower.includes('route') || lower.includes('asteroid')) return 'NAVIGATION';
    if (lower.includes('negotiat') || lower.includes('diplomacy') || lower.includes('alliance')) return 'DIPLOMACY';
    if (lower.includes('explor') || lower.includes('discover') || lower.includes('unknown')) return 'EXPLORATION';
    if (lower.includes('min') || lower.includes('extract') || lower.includes('ore')) return 'MINING';
    if (lower.includes('salvage') || lower.includes('scavenge') || lower.includes('wreck')) return 'SALVAGE';
    if (lower.includes('surviv') || lower.includes('escape') || lower.includes('flee') || lower.includes('threat')) return 'SURVIVAL';

    return null;
  }

  /**
   * Initialize expertise tracking
   */
  private initializeExpertise(): void {
    const domains: ExpertiseDomain[] = [
      'TRADING', 'COMBAT', 'NAVIGATION', 'DIPLOMACY',
      'EXPLORATION', 'MINING', 'SALVAGE', 'SURVIVAL'
    ];

    for (const domain of domains) {
      this.expertise.set(domain, {
        domain,
        level: 0,
        experiencePoints: 0,
        skills: new Map(),
        milestones: []
      });
    }
  }

  // ====================================================================
  // MACHINE LEARNING ALGORITHMS
  // ====================================================================

  /**
   * Q-Learning: Update Q-value for situation-action pair
   */
  private updateQValue(
    situation: string,
    action: string,
    reward: number,
    nextSituation: string
  ): void {
    // Q(s,a) = Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
    const currentQ = this.getQValue(situation, action);
    const maxNextQ = this.getMaxQValue(nextSituation);

    const newQ = currentQ + this.LEARNING_RATE * (
      reward + this.DISCOUNT_FACTOR * maxNextQ - currentQ
    );

    this.setQValue(situation, action, newQ);
  }

  /**
   * Get Q-value for situation-action pair
   */
  private getQValue(situation: string, action: string): number {
    const actionMap = this.qTable.get(situation);
    if (!actionMap) return 0;
    return actionMap.get(action) || 0;
  }

  /**
   * Set Q-value for situation-action pair
   */
  private setQValue(situation: string, action: string, value: number): void {
    let actionMap = this.qTable.get(situation);
    if (!actionMap) {
      actionMap = new Map();
      this.qTable.set(situation, actionMap);
    }
    actionMap.set(action, value);
  }

  /**
   * Get maximum Q-value for next situation
   */
  private getMaxQValue(situation: string): number {
    const actionMap = this.qTable.get(situation);
    if (!actionMap || actionMap.size === 0) return 0;

    let maxQ = -Infinity;
    for (const q of actionMap.values()) {
      if (q > maxQ) maxQ = q;
    }
    return maxQ;
  }

  /**
   * Select action using ε-greedy strategy
   */
  private selectActionQLearning(situation: string, availableActions: string[]): string {
    // Exploration: try random action
    if (Math.random() < this.EXPLORATION_RATE) {
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    }

    // Exploitation: use best known action
    return this.getBestActionQLearning(situation, availableActions);
  }

  /**
   * Get best action based on Q-values
   */
  private getBestActionQLearning(situation: string, availableActions: string[]): string {
    let bestAction = availableActions[0];
    let bestQ = this.getQValue(situation, bestAction);

    for (const action of availableActions.slice(1)) {
      const q = this.getQValue(situation, action);
      if (q > bestQ) {
        bestQ = q;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Strategy Evolution: Successful strategies strengthen, unsuccessful weaken
   */
  private evolveStrategies(outcome: 'SUCCESS' | 'FAILURE' | 'MIXED', reward: number): void {
    const recentStrategies = this.getRecentlyUsedStrategies();

    for (const strategy of recentStrategies) {
      // Credit assignment (most recent strategies get more credit)
      const recency = 1 - (Date.now() / 1000 - strategy.lastUsed) / 3600;
      const credit = recency * reward;

      if (outcome === 'SUCCESS') {
        strategy.confidence += credit * 0.1;
        strategy.confidence = Math.min(1, strategy.confidence);
      } else if (outcome === 'FAILURE') {
        strategy.confidence -= credit * 0.15;
        strategy.confidence = Math.max(0.1, strategy.confidence);
      }
    }

    // Prune very unsuccessful strategies
    const strategiesToRemove: string[] = [];
    for (const [key, strategy] of this.strategies) {
      if (strategy.successRate < 0.2 && strategy.usageCount >= 5) {
        strategiesToRemove.push(key);
      }
    }
    for (const key of strategiesToRemove) {
      this.strategies.delete(key);
    }

    // Combine successful strategies (genetic algorithm)
    if (Math.random() < 0.1) {
      this.combineStrategies();
    }
  }

  /**
   * Get recently used strategies
   */
  private getRecentlyUsedStrategies(): Strategy[] {
    const recent: Strategy[] = [];
    const now = Date.now() / 1000;

    for (const strategy of this.strategies.values()) {
      if (now - strategy.lastUsed < 3600) {  // Within last hour
        recent.push(strategy);
      }
    }

    return recent;
  }

  /**
   * Combine successful strategies (genetic algorithm)
   */
  private combineStrategies(): void {
    const successful = Array.from(this.strategies.values())
      .filter(s => s.successRate > 0.7 && s.usageCount > 3)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    if (successful.length >= 2) {
      const parent1 = successful[0];
      const parent2 = successful[1];

      // Create hybrid strategy
      const child: Strategy = {
        id: `strategy_${this.strategySeedCounter++}`,
        name: `Evolved: ${parent1.name} × ${parent2.name}`,
        description: `Hybrid strategy from ${parent1.id} and ${parent2.id}`,
        condition: this.mergeConditions(parent1.condition, parent2.condition),
        applicableConditions: [...parent1.applicableConditions, ...parent2.applicableConditions],
        actions: this.mergeActions(parent1.actions, parent2.actions),
        successCount: 0,
        failureCount: 0,
        totalAttempts: 0,
        usageCount: 0,
        successRate: 0.5,
        averageReward: (parent1.averageReward + parent2.averageReward) / 2,
        confidence: (parent1.confidence + parent2.confidence) / 2,
        lastUsed: 0,
        createdAt: Date.now() / 1000,
        parentStrategies: [parent1.id, parent2.id]
      };

      const key = `${child.condition}:${child.actions[0]}`;
      this.strategies.set(key, child);
    }
  }

  /**
   * Merge conditions from two strategies
   */
  private mergeConditions(cond1: string, cond2: string): string {
    // Simple merge - combine both conditions
    return `${cond1} OR ${cond2}`;
  }

  /**
   * Merge actions from two strategies
   */
  private mergeActions(actions1: string[], actions2: string[]): string[] {
    // Take best actions from both
    const merged = [...actions1];
    for (const action of actions2) {
      if (!merged.includes(action)) {
        merged.push(action);
      }
    }
    return merged.slice(0, 3);  // Limit to 3 actions
  }

  /**
   * Generate unique strategy ID
   */
  private generateStrategyId(): string {
    return `strategy_${this.strategySeedCounter++}_${Date.now()}`;
  }

  /**
   * Improve skill using power law of practice
   */
  private improveSkill(skill: Skill, practiceAmount: number): void {
    // Power law: T(n) = T(1) * n^(-α) where α ≈ 0.4
    const alpha = 0.4;
    const practiceEffect = Math.pow(skill.practiceCount + practiceAmount, -alpha) -
                          Math.pow(skill.practiceCount, -alpha);

    skill.practiceCount += practiceAmount;
    skill.practiceHours += 0.1;
    skill.lastPracticed = this.simulatedTime;

    // Skill improves with diminishing returns
    const improvement = practiceEffect * skill.learningRate * 100;
    skill.level += improvement;
    skill.proficiency += improvement * 10;
    skill.level = Math.min(skill.maxLevel || 10, skill.level);
    skill.proficiency = Math.min(100, skill.proficiency);

    // Milestones unlock new abilities
    const newMilestone = Math.floor(skill.level);
    if (newMilestone > skill.lastMilestone) {
      this.unlockMilestone(skill, newMilestone);
      skill.lastMilestone = newMilestone;
    }
  }

  /**
   * Unlock milestone for skill
   */
  private unlockMilestone(skill: Skill, milestone: number): void {
    // Record milestone achievement (could trigger special abilities)
    console.log(`[AdaptiveAI] Unlocked ${skill.name} milestone: Level ${milestone}`);
  }

  /**
   * Skill decay: Use it or lose it
   */
  public decaySkills(deltaTime: number): void {
    // Advance simulated time
    this.simulatedTime += deltaTime;

    for (const expertise of this.expertise.values()) {
      // Find most recent practice time for this domain
      let mostRecentPractice = 0;
      for (const skill of expertise.skills.values()) {
        mostRecentPractice = Math.max(mostRecentPractice, skill.lastPracticed);
      }

      // Decay expertise XP if domain hasn't been practiced
      if (expertise.skills.size > 0) {
        const timeSincePractice = this.simulatedTime - mostRecentPractice;
        const daysSincePractice = timeSincePractice / 86400;

        if (daysSincePractice > 7) {
          // Decay starts after 1 week of no practice
          const decayRate = 0.01; // 1% per day
          const decay = decayRate * (daysSincePractice - 7);

          // Decay expertise XP
          expertise.experiencePoints *= (1 - decay);
          expertise.experiencePoints = Math.max(0, expertise.experiencePoints);

          // Recalculate level from XP
          expertise.level = Math.floor(expertise.experiencePoints / 100);
        }
      }

      // Decay individual skills
      for (const skill of expertise.skills.values()) {
        const timeSincePractice = this.simulatedTime - skill.lastPracticed;
        const daysSincePractice = timeSincePractice / 86400;

        if (daysSincePractice > 7) {
          // Decay starts after 1 week of no practice
          const decayRate = 0.01; // 1% per day
          const decay = decayRate * (daysSincePractice - 7);

          skill.level *= (1 - decay);
          skill.proficiency *= (1 - decay);
          skill.level = Math.max(skill.baseLevel || 1, skill.level);
          skill.proficiency = Math.max(10, skill.proficiency);
        }
      }
    }
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  /**
   * Get overall success rate
   */
  public getSuccessRate(): number {
    const total = this.successfulOutcomes + this.failedOutcomes;
    return total > 0 ? this.successfulOutcomes / total : 0;
  }

  /**
   * Get expertise in domain
   */
  public getExpertise(domain: ExpertiseDomain): Expertise | null {
    return this.expertise.get(domain) || null;
  }

  /**
   * Get all expertise
   */
  public getAllExpertise(): Map<ExpertiseDomain, Expertise> {
    return new Map(this.expertise);
  }

  /**
   * Get learning statistics
   */
  public getStatistics(): {
    totalDecisions: number;
    successRate: number;
    strategiesLearned: number;
    totalExpertiseLevels: number;
    topExpertise: { domain: ExpertiseDomain; level: number } | null;
  } {
    let totalLevels = 0;
    let topExpertise: { domain: ExpertiseDomain; level: number } | null = null;

    for (const [domain, expertise] of this.expertise) {
      totalLevels += expertise.level;

      if (!topExpertise || expertise.level > topExpertise.level) {
        topExpertise = { domain, level: expertise.level };
      }
    }

    return {
      totalDecisions: this.totalDecisions,
      successRate: this.getSuccessRate(),
      strategiesLearned: this.strategies.size,
      totalExpertiseLevels: totalLevels,
      topExpertise
    };
  }

  /**
   * Generate expertise report
   */
  public generateExpertiseReport(): string {
    const lines: string[] = [];

    lines.push('=== EXPERTISE REPORT ===');
    lines.push('');

    for (const [domain, expertise] of this.expertise) {
      if (expertise.level > 0) {
        lines.push(`${domain}: Level ${expertise.level} (${expertise.experiencePoints} XP)`);

        // List top skills
        const topSkills = Array.from(expertise.skills.values())
          .sort((a, b) => b.proficiency - a.proficiency)
          .slice(0, 3);

        for (const skill of topSkills) {
          lines.push(`  - ${skill.name}: ${skill.proficiency.toFixed(1)}% proficiency`);
        }

        lines.push('');
      }
    }

    lines.push(`Overall Success Rate: ${(this.getSuccessRate() * 100).toFixed(1)}%`);
    lines.push(`Total Decisions: ${this.totalDecisions}`);
    lines.push(`Strategies Learned: ${this.strategies.size}`);

    return lines.join('\n');
  }
}
