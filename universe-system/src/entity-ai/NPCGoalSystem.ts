/**
 * NPCGoalSystem - Goal-driven behavior for NPCs
 *
 * Gives NPCs agency by allowing them to:
 * - Pursue long-term goals
 * - Make plans to achieve goals
 * - Adapt when plans fail
 * - Abandon impossible goals
 * - Form new goals based on experiences
 */

import { Vector3 } from '../types';
import { ExtendedNPCMemory, PersonalityTraits } from './ExtendedNPCMemory';

export interface NPCGoal {
  id: string;
  type: GoalType;
  category: GoalCategory;

  // Description
  name: string;
  description: string;

  // Priority
  priority: number;               // 0-100 (higher = more important)
  urgency: number;                // 0-100 (higher = more time-sensitive)

  // Progress
  progress: number;               // 0-1
  subgoals: SubGoal[];
  currentSubgoal: number;

  // Requirements
  prerequisites: string[];        // Goal IDs that must be complete first
  requiredResources?: ResourceRequirement[];
  requiredCapabilities?: string[];

  // Constraints
  deadline?: number;              // Timestamp (undefined = no deadline)
  budget?: number;                // Credits willing to spend
  riskTolerance?: number;         // 0-1

  // Motivation
  motivation: GoalMotivation;
  expectedReward: ExpectedReward;

  // State
  status: GoalStatus;
  attempts: number;
  failures: number;
  lastAttempt?: number;

  // Context
  createdAt: number;
  createdBy: 'SELF' | 'FACTION' | 'EXTERNAL';
  relatedEntities?: string[];     // Entity IDs involved

  // Metadata
  tags: string[];
}

export type GoalType =
  // Economic
  | 'ACCUMULATE_WEALTH' | 'BECOME_WEALTHY' | 'ACHIEVE_FINANCIAL_SECURITY'
  | 'ESTABLISH_TRADE_ROUTE' | 'MONOPOLIZE_COMMODITY'
  | 'BUILD_TRADE_EMPIRE' | 'OWN_STATION'

  // Social
  | 'GAIN_REPUTATION' | 'BECOME_FAMOUS' | 'EARN_TITLE'
  | 'JOIN_FACTION' | 'RISE_IN_FACTION' | 'LEAD_FACTION'
  | 'MAKE_ALLY' | 'DESTROY_ENEMY' | 'FORM_PARTNERSHIP'

  // Personal
  | 'AVENGE_WRONG' | 'SETTLE_GRUDGE' | 'REPAY_DEBT'
  | 'EXPLORE_UNKNOWN' | 'DISCOVER_SECRET' | 'ACHIEVE_MASTERY'
  | 'RETIRE_WEALTHY' | 'FIND_HOME' | 'START_FAMILY'

  // Survival
  | 'ESCAPE_DANGER' | 'FIND_SAFETY' | 'REPAIR_SHIP'
  | 'FIND_FUEL' | 'FIND_SUPPLIES' | 'GET_MEDICAL_AID'

  // Career
  | 'BECOME_BEST_TRADER' | 'BECOME_ACE_PILOT' | 'BECOME_MASTER_EXPLORER'
  | 'EARN_PROMOTION' | 'CHANGE_CAREER' | 'MASTER_SKILL'

  // Mission-based
  | 'COMPLETE_CONTRACT' | 'DELIVER_CARGO' | 'ESCORT_SHIP'
  | 'INVESTIGATE_ANOMALY' | 'RESCUE_SURVIVORS' | 'HUNT_PIRATE'

  // Long-term
  | 'LEAVE_LEGACY' | 'ACHIEVE_IMMORTALITY' | 'CHANGE_UNIVERSE';

export type GoalCategory =
  | 'SURVIVAL' | 'ECONOMIC' | 'SOCIAL' | 'PERSONAL'
  | 'CAREER' | 'MISSION' | 'EXPLORATION';

export type GoalStatus =
  | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED'
  | 'ABANDONED' | 'IMPOSSIBLE' | 'BLOCKED';

export interface SubGoal {
  description: string;
  completed: boolean;
  optional: boolean;              // Can skip if needed
  progress: number;               // 0-1
}

export interface GoalMotivation {
  type: 'INTRINSIC' | 'EXTRINSIC' | 'COMPULSION';
  reason: string;
  emotionalDrive: number;         // 0-10 (how much they care)
}

export interface ExpectedReward {
  credits?: number;
  reputation?: Map<string, number>;  // faction -> change
  satisfaction?: number;          // 0-10 (emotional reward)
  unlocks?: string[];             // New opportunities
  items?: string[];               // Physical rewards
}

export interface ResourceRequirement {
  type: 'CREDITS' | 'FUEL' | 'CARGO_SPACE' | 'TIME' | 'ALLIES';
  amount: number;
  current: number;
}

export interface ActionPlan {
  goal: NPCGoal;
  steps: PlannedAction[];
  estimatedDuration: number;      // Seconds
  estimatedCost: number;          // Credits
  riskAssessment: number;         // 0-1 (0 = safe, 1 = very risky)
  successProbability: number;     // 0-1
}

export interface PlannedAction {
  id: string;
  type: ActionType;
  description: string;
  priority: number;

  // Execution
  target?: string;                // Entity ID or location name
  location?: Vector3;
  duration: number;               // Expected time (seconds)
  cost: number;                   // Expected cost (credits)

  // Requirements
  prerequisites: string[];        // Action IDs that must happen first
  requiredCapabilities: string[];

  // Risk
  risk: number;                   // 0-1
  contingencyPlan?: PlannedAction[];

  // Status
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  attempts: number;
}

export type ActionType =
  | 'TRAVEL_TO' | 'DOCK_AT' | 'TRADE_WITH' | 'COMMUNICATE_WITH'
  | 'SCAN' | 'INVESTIGATE' | 'MINE' | 'SALVAGE'
  | 'COMBAT' | 'FLEE' | 'HIDE' | 'WAIT'
  | 'REPAIR' | 'REFUEL' | 'RESTOCK'
  | 'HIRE' | 'RECRUIT' | 'NEGOTIATE' | 'BRIBE';

export interface GoalEvaluationContext {
  currentTime: number;
  currentLocation: Vector3;
  currentResources: {
    credits: number;
    fuel: number;
    cargoSpace: number;
    health: number;
  };
  threats: string[];              // Nearby threats
  opportunities: string[];        // Nearby opportunities
  allies: string[];
  enemies: string[];
}

export class NPCGoalSystem {
  private memory: ExtendedNPCMemory;
  private goals: Map<string, NPCGoal> = new Map();
  private completedGoals: NPCGoal[] = [];
  private abandonedGoals: NPCGoal[] = [];

  // Current state
  private currentGoal: NPCGoal | null = null;
  private currentPlan: ActionPlan | null = null;
  private currentAction: PlannedAction | null = null;

  // Configuration
  private readonly MAX_ACTIVE_GOALS = 5;
  private readonly GOAL_REEVALUATION_INTERVAL = 300;  // 5 minutes
  private lastEvaluation: number = 0;

  constructor(memory: ExtendedNPCMemory) {
    this.memory = memory;
  }

  /**
   * Add a new goal
   */
  public addGoal(goal: NPCGoal): void {
    // Check if goal already exists
    if (this.goals.has(goal.id)) {
      console.warn(`Goal ${goal.id} already exists`);
      return;
    }

    // Check prerequisites
    for (const prereqId of goal.prerequisites) {
      const prereq = this.goals.get(prereqId);
      if (!prereq || prereq.status !== 'COMPLETED') {
        goal.status = 'BLOCKED';
      }
    }

    this.goals.set(goal.id, goal);

    // Limit number of active goals
    if (this.getActiveGoals().length > this.MAX_ACTIVE_GOALS) {
      this.pruneLowestPriorityGoal();
    }
  }

  /**
   * Update goals and select action
   */
  public update(deltaTime: number, context: GoalEvaluationContext): PlannedAction | null {
    // Re-evaluate goals periodically
    if (context.currentTime - this.lastEvaluation > this.GOAL_REEVALUATION_INTERVAL) {
      this.evaluateAllGoals(context);
      this.lastEvaluation = context.currentTime;
    }

    // Check if current action is complete
    if (this.currentAction) {
      if (this.currentAction.status === 'COMPLETED') {
        this.advanceToNextAction();
      } else if (this.currentAction.status === 'FAILED') {
        this.handleActionFailure(context);
      }
    }

    // If no current action, select next goal/action
    if (!this.currentAction) {
      this.selectNextGoalAndAction(context);
    }

    return this.currentAction;
  }

  /**
   * Generate action plan for goal
   */
  public generatePlan(goal: NPCGoal, context: GoalEvaluationContext): ActionPlan | null {
    const steps: PlannedAction[] = [];
    let estimatedDuration = 0;
    let estimatedCost = 0;
    let cumulativeRisk = 0;

    // Generate steps based on goal type
    switch (goal.type) {
      case 'ACCUMULATE_WEALTH':
        steps.push(...this.planWealthAccumulation(goal, context));
        break;

      case 'ESTABLISH_TRADE_ROUTE':
        steps.push(...this.planTradeRoute(goal, context));
        break;

      case 'AVENGE_WRONG':
        steps.push(...this.planRevenge(goal, context));
        break;

      case 'ESCAPE_DANGER':
        steps.push(...this.planEscape(goal, context));
        break;

      case 'EXPLORE_UNKNOWN':
        steps.push(...this.planExploration(goal, context));
        break;

      default:
        // Generic plan
        steps.push(...this.planGeneric(goal, context));
    }

    // Calculate totals
    for (const step of steps) {
      estimatedDuration += step.duration;
      estimatedCost += step.cost;
      cumulativeRisk = Math.max(cumulativeRisk, step.risk);
    }

    // Calculate success probability
    const personality = this.memory.getCurrentPersonality();
    const successProbability = this.estimateSuccessProbability(goal, steps, personality, context);

    return {
      goal,
      steps,
      estimatedDuration,
      estimatedCost,
      riskAssessment: cumulativeRisk,
      successProbability
    };
  }

  /**
   * Mark goal as complete
   */
  public completeGoal(goalId: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.status = 'COMPLETED';
    goal.progress = 1.0;

    this.goals.delete(goalId);
    this.completedGoals.push(goal);

    // Record achievement
    this.memory.recordExperience({
      id: `goal_complete_${goalId}`,
      timestamp: Date.now() / 1000,
      type: 'GOAL_ACHIEVED',
      event: {
        id: `event_goal_${goalId}`,
        timestamp: Date.now() / 1000,
        type: 'GOAL_ACHIEVED',
        severity: goal.priority / 10,
        category: 'PERSONAL',
        location: { x: 0, y: 0, z: 0 },
        participants: [this.memory.entityId],
        description: `Achieved goal: ${goal.name}`,
        data: { goal },
        consequences: [],
        witnessed: false,
        priority: goal.priority / 10,
        tags: ['goal', 'achievement']
      },
      emotionalImpact: goal.expectedReward.satisfaction || 5,
      intensity: goal.priority / 10,
      location: { x: 0, y: 0, z: 0 },
      witnesses: [],
      memoryStrength: 1.0,
      recallCount: 0
    });

    // Unblock dependent goals
    this.unblockDependentGoals(goalId);

    // Generate new goals based on personality
    this.generateFollowUpGoals(goal);
  }

  /**
   * Abandon goal
   */
  public abandonGoal(goalId: string, reason: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.status = 'ABANDONED';

    this.goals.delete(goalId);
    this.abandonedGoals.push(goal);

    // Record experience
    this.memory.recordExperience({
      id: `goal_abandoned_${goalId}`,
      timestamp: Date.now() / 1000,
      type: 'GOAL_FAILED',
      event: {
        id: `event_abandon_${goalId}`,
        timestamp: Date.now() / 1000,
        type: 'GOAL_FAILED',
        severity: goal.priority / 20,
        category: 'PERSONAL',
        location: { x: 0, y: 0, z: 0 },
        participants: [this.memory.entityId],
        description: `Abandoned goal: ${goal.name} (${reason})`,
        data: { goal, reason },
        consequences: [],
        witnessed: false,
        priority: goal.priority / 20,
        tags: ['goal', 'failure']
      },
      emotionalImpact: -goal.priority / 20,
      intensity: goal.priority / 15,
      location: { x: 0, y: 0, z: 0 },
      witnesses: [],
      memoryStrength: 1.0,
      recallCount: 0
    });
  }

  // ====================================================================
  // PRIVATE METHODS: Goal Evaluation
  // ====================================================================

  private evaluateAllGoals(context: GoalEvaluationContext): void {
    const activeGoals = this.getActiveGoals();

    for (const goal of activeGoals) {
      // Check if goal is still achievable
      if (this.isGoalImpossible(goal, context)) {
        goal.status = 'IMPOSSIBLE';
        this.abandonGoal(goal.id, 'Goal became impossible');
        continue;
      }

      // Check deadline
      if (goal.deadline && context.currentTime > goal.deadline) {
        goal.status = 'FAILED';
        this.abandonGoal(goal.id, 'Deadline passed');
        continue;
      }

      // Update priority based on context
      this.updateGoalPriority(goal, context);
    }

    // Check for new goals to generate
    this.generateContextualGoals(context);
  }

  private selectNextGoalAndAction(context: GoalEvaluationContext): void {
    const activeGoals = this.getActiveGoals();

    // Calculate urgency score for each goal
    const scored = activeGoals.map(goal => ({
      goal,
      score: this.calculateGoalUrgency(goal, context)
    }));

    // Sort by urgency score
    scored.sort((a, b) => b.score - a.score);

    // Select highest urgency goal
    if (scored.length > 0) {
      this.currentGoal = scored[0].goal;

      // Generate plan if needed
      if (!this.currentPlan || this.currentPlan.goal.id !== this.currentGoal.id) {
        this.currentPlan = this.generatePlan(this.currentGoal, context);
      }

      // Select next action from plan
      if (this.currentPlan && this.currentPlan.steps.length > 0) {
        const pendingSteps = this.currentPlan.steps.filter(s => s.status === 'PENDING');
        if (pendingSteps.length > 0) {
          this.currentAction = pendingSteps[0];
          this.currentAction.status = 'IN_PROGRESS';
        }
      }
    }
  }

  private calculateGoalUrgency(goal: NPCGoal, context: GoalEvaluationContext): number {
    let score = goal.priority;

    // Increase urgency as deadline approaches
    if (goal.deadline) {
      const timeRemaining = goal.deadline - context.currentTime;
      const urgencyMultiplier = Math.max(1, 10 / (timeRemaining / 3600));  // Increases as time runs out
      score *= urgencyMultiplier;
    }

    // Survival goals always highest priority
    if (goal.category === 'SURVIVAL') {
      score *= 3;
    }

    // Personality influences
    const personality = this.memory.getCurrentPersonality();

    if (goal.category === 'ECONOMIC' && personality.greed > 0.7) {
      score *= 1.5;
    }

    if (goal.category === 'EXPLORATION' && personality.curiosity > 0.7) {
      score *= 1.5;
    }

    // Context influences
    if (context.threats.length > 0 && goal.category === 'SURVIVAL') {
      score *= 2;
    }

    return score;
  }

  private updateGoalPriority(goal: NPCGoal, context: GoalEvaluationContext): void {
    // Adjust priority based on progress
    if (goal.progress > 0.8) {
      goal.priority = Math.min(100, goal.priority * 1.2);  // Increase priority when close to completion
    }

    // Adjust based on failures
    if (goal.failures > 3) {
      goal.priority = Math.max(0, goal.priority * 0.8);  // Decrease priority after many failures
    }

    // Context-based adjustments
    if (context.threats.length > 0 && goal.category !== 'SURVIVAL') {
      goal.priority *= 0.7;  // Lower priority of non-survival goals when threatened
    }
  }

  private isGoalImpossible(goal: NPCGoal, context: GoalEvaluationContext): boolean {
    // Check resource requirements
    if (goal.requiredResources) {
      for (const req of goal.requiredResources) {
        if (req.type === 'CREDITS' && context.currentResources.credits < req.amount) {
          // Check if can ever earn enough
          if (req.amount > context.currentResources.credits * 10) {
            return true;  // Goal requires 10x current wealth
          }
        }
      }
    }

    // Check if too many failures
    if (goal.failures > 10) {
      return true;
    }

    return false;
  }

  private generateContextualGoals(context: GoalEvaluationContext): void {
    const personality = this.memory.getCurrentPersonality();

    // Survival goals from threats
    if (context.threats.length > 0) {
      const hasSurvivalGoal = this.getActiveGoals().some(g => g.category === 'SURVIVAL');
      if (!hasSurvivalGoal) {
        this.addGoal({
          id: `survival_${Date.now()}`,
          type: 'ESCAPE_DANGER',
          category: 'SURVIVAL',
          name: 'Escape Danger',
          description: 'Get away from threats',
          priority: 100,
          urgency: 100,
          progress: 0,
          subgoals: [],
          currentSubgoal: 0,
          prerequisites: [],
          motivation: {
            type: 'COMPULSION',
            reason: 'Survival instinct',
            emotionalDrive: 10
          },
          expectedReward: {
            satisfaction: 10
          },
          status: 'ACTIVE',
          attempts: 0,
          failures: 0,
          createdAt: context.currentTime,
          createdBy: 'SELF',
          tags: ['survival', 'urgent']
        });
      }
    }

    // Economic goals from opportunities
    if (context.opportunities.length > 0 && personality.greed > 0.5) {
      const hasEconomicGoal = this.getActiveGoals().some(g => g.category === 'ECONOMIC');
      if (!hasEconomicGoal && Math.random() < personality.greed) {
        this.addGoal({
          id: `trade_${Date.now()}`,
          type: 'ESTABLISH_TRADE_ROUTE',
          category: 'ECONOMIC',
          name: 'Capitalize on Opportunity',
          description: 'Establish profitable trade route',
          priority: 60,
          urgency: 50,
          progress: 0,
          subgoals: [],
          currentSubgoal: 0,
          prerequisites: [],
          motivation: {
            type: 'EXTRINSIC',
            reason: 'Profit opportunity',
            emotionalDrive: personality.greed * 10
          },
          expectedReward: {
            credits: 10000,
            satisfaction: 7
          },
          status: 'ACTIVE',
          attempts: 0,
          failures: 0,
          createdAt: context.currentTime,
          createdBy: 'SELF',
          tags: ['economic', 'trade']
        });
      }
    }
  }

  private generateFollowUpGoals(completedGoal: NPCGoal): void {
    const personality = this.memory.getCurrentPersonality();

    // Generate follow-up goals based on type
    switch (completedGoal.type) {
      case 'ACCUMULATE_WEALTH':
        if (personality.greed > 0.6) {
          // Want even more wealth
          this.addGoal({
            id: `wealth_next_${Date.now()}`,
            type: 'BECOME_WEALTHY',
            category: 'ECONOMIC',
            name: 'Become Wealthy',
            description: 'Accumulate even more wealth',
            priority: completedGoal.priority,
            urgency: 30,
            progress: 0,
            subgoals: [],
            currentSubgoal: 0,
            prerequisites: [],
            motivation: {
              type: 'INTRINSIC',
              reason: 'Never enough',
              emotionalDrive: personality.greed * 10
            },
            expectedReward: {
              credits: (completedGoal.expectedReward.credits || 0) * 2,
              satisfaction: 8
            },
            status: 'ACTIVE',
            attempts: 0,
            failures: 0,
            createdAt: Date.now() / 1000,
            createdBy: 'SELF',
            tags: ['economic', 'wealth']
          });
        }
        break;
    }
  }

  private unblockDependentGoals(completedGoalId: string): void {
    for (const goal of this.goals.values()) {
      if (goal.prerequisites.includes(completedGoalId) && goal.status === 'BLOCKED') {
        // Check if all prerequisites are now met
        const allMet = goal.prerequisites.every(prereqId => {
          const prereq = this.completedGoals.find(g => g.id === prereqId);
          return prereq !== undefined;
        });

        if (allMet) {
          goal.status = 'ACTIVE';
        }
      }
    }
  }

  private advanceToNextAction(): void {
    if (this.currentPlan) {
      const nextPending = this.currentPlan.steps.find(s => s.status === 'PENDING');
      if (nextPending) {
        this.currentAction = nextPending;
        this.currentAction.status = 'IN_PROGRESS';
      } else {
        // Plan complete
        if (this.currentGoal) {
          this.completeGoal(this.currentGoal.id);
        }
        this.currentAction = null;
        this.currentPlan = null;
        this.currentGoal = null;
      }
    }
  }

  private handleActionFailure(context: GoalEvaluationContext): void {
    if (!this.currentAction || !this.currentGoal) return;

    this.currentAction.attempts++;

    // Try contingency plan if available
    if (this.currentAction.contingencyPlan && this.currentAction.contingencyPlan.length > 0) {
      // Replace current action with contingency
      this.currentPlan!.steps = [
        ...this.currentAction.contingencyPlan,
        ...this.currentPlan!.steps.filter(s => s.id !== this.currentAction!.id)
      ];
      this.currentAction = this.currentAction.contingencyPlan[0];
      this.currentAction.status = 'IN_PROGRESS';
      return;
    }

    // Too many attempts?
    if (this.currentAction.attempts > 3) {
      this.currentGoal.failures++;

      if (this.currentGoal.failures > 5) {
        // Abandon goal
        this.abandonGoal(this.currentGoal.id, 'Too many failures');
      } else {
        // Regenerate plan
        this.currentPlan = this.generatePlan(this.currentGoal, context);
      }

      this.currentAction = null;
    } else {
      // Retry
      this.currentAction.status = 'PENDING';
    }
  }

  // ====================================================================
  // PRIVATE METHODS: Plan Generation
  // ====================================================================

  private planWealthAccumulation(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction[] {
    return [
      {
        id: 'find_trade',
        type: 'TRAVEL_TO',
        description: 'Travel to trading hub',
        priority: 80,
        duration: 3600,
        cost: 100,
        prerequisites: [],
        requiredCapabilities: ['navigation'],
        risk: 0.2,
        status: 'PENDING',
        attempts: 0
      },
      {
        id: 'execute_trades',
        type: 'TRADE_WITH',
        description: 'Execute profitable trades',
        priority: 90,
        duration: 1800,
        cost: 500,
        prerequisites: ['find_trade'],
        requiredCapabilities: ['trading'],
        risk: 0.3,
        status: 'PENDING',
        attempts: 0
      }
    ];
  }

  private planTradeRoute(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction[] {
    return [
      {
        id: 'research_markets',
        type: 'SCAN',
        description: 'Research market prices',
        priority: 70,
        duration: 600,
        cost: 0,
        prerequisites: [],
        requiredCapabilities: ['sensors'],
        risk: 0.1,
        status: 'PENDING',
        attempts: 0
      },
      {
        id: 'establish_route',
        type: 'TRAVEL_TO',
        description: 'Travel route and establish pattern',
        priority: 80,
        duration: 7200,
        cost: 200,
        prerequisites: ['research_markets'],
        requiredCapabilities: ['navigation'],
        risk: 0.3,
        status: 'PENDING',
        attempts: 0
      }
    ];
  }

  private planRevenge(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction[] {
    const personality = this.memory.getCurrentPersonality();

    if (personality.aggression > 0.7) {
      // Direct confrontation
      return [
        {
          id: 'track_target',
          type: 'SCAN',
          description: 'Track down target',
          priority: 90,
          duration: 3600,
          cost: 0,
          prerequisites: [],
          requiredCapabilities: ['sensors'],
          risk: 0.4,
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'confront',
          type: 'COMBAT',
          description: 'Confront enemy',
          priority: 100,
          duration: 1800,
          cost: 0,
          prerequisites: ['track_target'],
          requiredCapabilities: ['weapons'],
          risk: 0.8,
          status: 'PENDING',
          attempts: 0
        }
      ];
    } else {
      // Subtle approach
      return [
        {
          id: 'gather_info',
          type: 'COMMUNICATE_WITH',
          description: 'Gather information',
          priority: 80,
          duration: 1800,
          cost: 100,
          prerequisites: [],
          requiredCapabilities: ['communications'],
          risk: 0.2,
          status: 'PENDING',
          attempts: 0
        },
        {
          id: 'undermine',
          type: 'NEGOTIATE',
          description: 'Undermine enemy reputation',
          priority: 90,
          duration: 7200,
          cost: 500,
          prerequisites: ['gather_info'],
          requiredCapabilities: ['social'],
          risk: 0.4,
          status: 'PENDING',
          attempts: 0
        }
      ];
    }
  }

  private planEscape(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction[] {
    return [
      {
        id: 'flee_threats',
        type: 'FLEE',
        description: 'Flee from immediate threats',
        priority: 100,
        duration: 600,
        cost: 50,
        prerequisites: [],
        requiredCapabilities: ['propulsion'],
        risk: 0.5,
        status: 'PENDING',
        attempts: 0
      },
      {
        id: 'find_safety',
        type: 'TRAVEL_TO',
        description: 'Travel to safe location',
        priority: 90,
        duration: 1800,
        cost: 100,
        prerequisites: ['flee_threats'],
        requiredCapabilities: ['navigation'],
        risk: 0.3,
        status: 'PENDING',
        attempts: 0
      }
    ];
  }

  private planExploration(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction[] {
    return [
      {
        id: 'scan_region',
        type: 'SCAN',
        description: 'Scan unexplored region',
        priority: 70,
        duration: 3600,
        cost: 0,
        prerequisites: [],
        requiredCapabilities: ['sensors'],
        risk: 0.4,
        status: 'PENDING',
        attempts: 0
      },
      {
        id: 'investigate',
        type: 'INVESTIGATE',
        description: 'Investigate anomalies',
        priority: 80,
        duration: 1800,
        cost: 0,
        prerequisites: ['scan_region'],
        requiredCapabilities: ['sensors', 'navigation'],
        risk: 0.6,
        status: 'PENDING',
        attempts: 0
      }
    ];
  }

  private planGeneric(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction[] {
    // Default generic plan
    return [
      {
        id: 'generic_action',
        type: 'WAIT',
        description: 'Work toward goal',
        priority: 50,
        duration: 3600,
        cost: 0,
        prerequisites: [],
        requiredCapabilities: [],
        risk: 0.2,
        status: 'PENDING',
        attempts: 0
      }
    ];
  }

  private estimateSuccessProbability(
    goal: NPCGoal,
    steps: PlannedAction[],
    personality: PersonalityTraits,
    context: GoalEvaluationContext
  ): number {
    let probability = 1.0;

    // Factor in risks of each step
    for (const step of steps) {
      probability *= (1 - step.risk);
    }

    // Factor in personality
    if (goal.category === 'ECONOMIC' && personality.greed > 0.7) {
      probability *= 1.2;  // Greed drives success in economic goals
    }

    if (goal.category === 'EXPLORATION' && personality.curiosity > 0.7) {
      probability *= 1.2;
    }

    // Factor in adaptability
    probability *= (0.7 + personality.adaptability * 0.3);

    return Math.min(1.0, Math.max(0.0, probability));
  }

  private pruneLowestPriorityGoal(): void {
    const active = this.getActiveGoals();
    if (active.length === 0) return;

    // Find lowest priority
    const sorted = active.sort((a, b) => a.priority - b.priority);
    const lowest = sorted[0];

    this.abandonGoal(lowest.id, 'Resource constraints - too many goals');
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public getActiveGoals(): NPCGoal[] {
    return Array.from(this.goals.values()).filter(g =>
      g.status === 'ACTIVE' || g.status === 'PAUSED'
    );
  }

  public getCurrentGoal(): NPCGoal | null {
    return this.currentGoal;
  }

  public getCurrentAction(): PlannedAction | null {
    return this.currentAction;
  }

  public getStatistics(): {
    activeGoals: number;
    completedGoals: number;
    abandonedGoals: number;
    totalGoals: number;
  } {
    return {
      activeGoals: this.getActiveGoals().length,
      completedGoals: this.completedGoals.length,
      abandonedGoals: this.abandonedGoals.length,
      totalGoals: this.goals.size + this.completedGoals.length + this.abandonedGoals.length
    };
  }
}
