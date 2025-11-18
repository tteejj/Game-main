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
  name: string;
  description: string;

  // When to use
  applicableConditions: string[];

  // What to do
  actions: string[];

  // Performance tracking
  successCount: number;
  failureCount: number;
  totalAttempts: number;

  // Metrics
  averageReward: number;
  confidence: number;             // 0-1 (based on data quality)
  lastUsed: number;
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
  practiceHours: number;
  successRate: number;            // 0-1
  lastPracticed: number;

  // Learning curve
  learningRate: number;           // How fast they improve
  plateauLevel?: number;          // Natural limit
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

  // Expertise
  private expertise: Map<ExpertiseDomain, Expertise> = new Map();

  // Performance tracking
  private successfulOutcomes: number = 0;
  private failedOutcomes: number = 0;
  private totalDecisions: number = 0;

  // Configuration
  private readonly LEARNING_RATE = 0.1;          // How fast to adapt
  private readonly EXPLORATION_RATE = 0.2;       // Chance to try new strategies
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

      this.memory.addLearnedBehavior(
        this.memory.entityId,
        lesson.condition,
        lesson.action,
        `learning_event_${event.timestamp}`
      );
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
          recallCount: 0
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
        name: `${situation} → ${action}`,
        description: `When "${situation}", do "${action}"`,
        applicableConditions: [situation],
        actions: [action],
        successCount: 0,
        failureCount: 0,
        totalAttempts: 0,
        averageReward: 0,
        confidence: 0.1,
        lastUsed: Date.now() / 1000
      };
      this.strategies.set(key, strategy);
    }

    // Update statistics
    strategy.totalAttempts++;
    strategy.lastUsed = Date.now() / 1000;

    if (outcome === 'SUCCESS') {
      strategy.successCount++;
    } else if (outcome === 'FAILURE') {
      strategy.failureCount++;
    }

    // Update average reward (moving average)
    const alpha = this.LEARNING_RATE;
    strategy.averageReward = strategy.averageReward * (1 - alpha) + reward * alpha;

    // Update confidence based on data quality
    const successRate = strategy.successCount / strategy.totalAttempts;
    const sampleSize = Math.min(strategy.totalAttempts / 10, 1.0);  // More attempts = more confidence
    strategy.confidence = successRate * sampleSize;
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
        practiceHours: 0,
        successRate: 0,
        lastPracticed: Date.now() / 1000,
        learningRate: 1.0
      };
      expertise.skills.set(skillName, skill);
    }

    // Increase proficiency
    skill.practiceHours += 0.1;
    skill.lastPracticed = Date.now() / 1000;

    const improvement = skill.learningRate * (event.outcome === 'SUCCESS' ? 2 : 0.5);
    skill.proficiency = Math.min(100, skill.proficiency + improvement);

    // Update success rate (moving average)
    const alpha = 0.1;
    skill.successRate = skill.successRate * (1 - alpha) + (event.outcome === 'SUCCESS' ? 1 : 0) * alpha;

    // Learning rate decreases as proficiency increases (harder to improve when expert)
    skill.learningRate = 1.0 / (1 + skill.proficiency / 50);
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
    if (situation.includes('trade') || situation.includes('market')) return 'TRADING';
    if (situation.includes('combat') || situation.includes('fight')) return 'COMBAT';
    if (situation.includes('navigate') || situation.includes('travel')) return 'NAVIGATION';
    if (situation.includes('negotiate') || situation.includes('diplomacy')) return 'DIPLOMACY';
    if (situation.includes('explore') || situation.includes('discover')) return 'EXPLORATION';
    if (situation.includes('mine') || situation.includes('extract')) return 'MINING';
    if (situation.includes('salvage') || situation.includes('scavenge')) return 'SALVAGE';
    if (situation.includes('survive') || situation.includes('escape')) return 'SURVIVAL';

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
