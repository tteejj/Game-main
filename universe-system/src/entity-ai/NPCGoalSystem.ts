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

import { Vector3 } from '../CelestialBody';
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
  currentState: WorldState;       // Current world state for A* planning
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

// World state for A* planning
export interface WorldState {
  location: Vector3;
  resources: Record<string, number>;
  satisfied: string[];            // Satisfied prerequisites
  [key: string]: any;
}

// A* planning nodes
export interface PlanNode {
  actions: PlannedAction[];
  state: WorldState;
  gCost: number;                  // Cost so far
  hCost: number;                  // Estimated cost to goal
  fCost: number;                  // Total cost (g + h)
}

// HTN goal tree
export interface GoalTreeNode {
  goal: NPCGoal;
  subgoals: GoalTreeNode[];
  parent?: string;                // Parent goal ID
  status: GoalStatus;
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

  // HTN planning
  private goalTree: Map<string, GoalTreeNode> = new Map();  // Goal ID -> tree node

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
      recallCount: 0,
      consolidated: false
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
      recallCount: 0,
      consolidated: false
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
  // SOPHISTICATED AI PLANNING ALGORITHMS
  // ====================================================================

  /**
   * A* pathfinding adapted for goal/action space
   */
  private planActionsToGoal(goal: NPCGoal, context: GoalEvaluationContext): ActionPlan | null {
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
          goal,
          steps: current.actions,
          estimatedDuration: current.gCost,
          estimatedCost: this.calculateCost(current.actions),
          riskAssessment: this.calculateMaxRisk(current.actions),
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
        const newGCost = current.gCost + action.duration;
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

  /**
   * Heuristic: Estimate remaining cost to goal
   */
  private heuristic(state: WorldState, goal: NPCGoal): number {
    let h = 0;

    // Distance-based goals (exploration, escape, etc.)
    if ((goal.type === 'EXPLORE_UNKNOWN' || goal.type === 'ESCAPE_DANGER') && state.location) {
      const targetLoc = goal.relatedEntities?.[0]; // Simplified
      if (targetLoc) {
        h += 100; // Placeholder distance estimate
      }
    }

    // Missing resources
    if (goal.requiredResources) {
      for (const req of goal.requiredResources) {
        const resourceKey = req.type.toLowerCase();
        const have = state.resources[resourceKey] || 0;
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

  /**
   * Check if goal is satisfied in current state
   */
  private goalSatisfied(state: WorldState, goal: NPCGoal): boolean {
    // Check prerequisites
    if (goal.prerequisites.length > 0) {
      if (!goal.prerequisites.every(p => state.satisfied.includes(p))) {
        return false;
      }
    }

    // Check resources
    if (goal.requiredResources) {
      for (const req of goal.requiredResources) {
        const resourceKey = req.type.toLowerCase();
        const have = state.resources[resourceKey] || 0;
        if (have < req.amount) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get available actions in current state
   */
  private getAvailableActions(state: WorldState, context: GoalEvaluationContext): PlannedAction[] {
    const actions: PlannedAction[] = [];

    // Travel actions
    if (state.resources.fuel > 10) {
      actions.push({
        id: `travel_${Date.now()}`,
        type: 'TRAVEL_TO',
        description: 'Travel to location',
        priority: 50,
        duration: 3600,
        cost: 100,
        prerequisites: [],
        requiredCapabilities: ['navigation'],
        risk: 0.2,
        status: 'PENDING',
        attempts: 0
      });
    }

    // Trade actions
    if (state.resources.credits > 100) {
      actions.push({
        id: `trade_${Date.now()}`,
        type: 'TRADE_WITH',
        description: 'Execute trade',
        priority: 60,
        duration: 1800,
        cost: 500,
        prerequisites: [],
        requiredCapabilities: ['trading'],
        risk: 0.3,
        status: 'PENDING',
        attempts: 0
      });
    }

    // Refuel action
    if (state.resources.fuel < 50 && state.resources.credits > 50) {
      actions.push({
        id: `refuel_${Date.now()}`,
        type: 'REFUEL',
        description: 'Refuel ship',
        priority: 70,
        duration: 600,
        cost: 50,
        prerequisites: [],
        requiredCapabilities: [],
        risk: 0.1,
        status: 'PENDING',
        attempts: 0
      });
    }

    return actions;
  }

  /**
   * Apply action to state (state transition)
   */
  private applyAction(state: WorldState, action: PlannedAction): WorldState {
    const newState = { ...state };

    switch (action.type) {
      case 'TRAVEL_TO':
        // Update location (simplified)
        newState.resources.fuel = (newState.resources.fuel || 0) - 10;
        break;

      case 'TRADE_WITH':
        // Gain credits (simplified)
        newState.resources.credits = (newState.resources.credits || 0) + 200;
        break;

      case 'REFUEL':
        newState.resources.fuel = 100;
        newState.resources.credits = (newState.resources.credits || 0) - action.cost;
        break;
    }

    return newState;
  }

  /**
   * Hash state for comparison
   */
  private hashState(state: WorldState): string {
    return JSON.stringify({
      location: state.location,
      resources: state.resources,
      satisfied: state.satisfied.sort()
    });
  }

  /**
   * Calculate total cost of actions
   */
  private calculateCost(actions: PlannedAction[]): number {
    return actions.reduce((sum, a) => sum + a.cost, 0);
  }

  /**
   * Calculate maximum risk across actions
   */
  private calculateMaxRisk(actions: PlannedAction[]): number {
    return actions.reduce((max, a) => Math.max(max, a.risk), 0);
  }

  /**
   * Calculate success probability from actions
   */
  private calculateSuccessProbability(actions: PlannedAction[]): number {
    let probability = 1.0;
    for (const action of actions) {
      probability *= (1 - action.risk);
    }
    return probability;
  }

  // ====================================================================
  // HIERARCHICAL TASK NETWORK (HTN) PLANNING
  // ====================================================================

  /**
   * Decompose complex goals into subgoals
   */
  private decomposeGoal(goal: NPCGoal): NPCGoal[] {
    const subgoals: NPCGoal[] = [];
    const now = Date.now() / 1000;

    switch (goal.type) {
      case 'BECOME_WEALTHY':
        subgoals.push(
          {
            id: `find_trade_route_${now}`,
            type: 'ESTABLISH_TRADE_ROUTE',
            category: 'ECONOMIC',
            name: 'Find Trade Route',
            description: 'Establish profitable trade route',
            priority: 8,
            urgency: 70,
            progress: 0,
            subgoals: [],
            currentSubgoal: 0,
            prerequisites: [],
            motivation: { type: 'EXTRINSIC', reason: 'Step toward wealth', emotionalDrive: 7 },
            expectedReward: { credits: 5000, satisfaction: 5 },
            status: 'ACTIVE',
            attempts: 0,
            failures: 0,
            createdAt: now,
            createdBy: 'SELF',
            tags: ['economic', 'subgoal']
          },
          {
            id: `acquire_cargo_${now}`,
            type: 'MONOPOLIZE_COMMODITY',
            category: 'ECONOMIC',
            name: 'Acquire Cargo',
            description: 'Build up cargo inventory',
            priority: 7,
            urgency: 60,
            progress: 0,
            subgoals: [],
            currentSubgoal: 0,
            prerequisites: [`find_trade_route_${now}`],
            motivation: { type: 'EXTRINSIC', reason: 'Need goods to trade', emotionalDrive: 6 },
            expectedReward: { credits: 2000, satisfaction: 4 },
            status: 'BLOCKED',
            attempts: 0,
            failures: 0,
            createdAt: now,
            createdBy: 'SELF',
            tags: ['economic', 'subgoal']
          }
        );
        break;

      case 'HUNT_PIRATE':
        subgoals.push(
          {
            id: `gather_intel_${now}`,
            type: 'INVESTIGATE_ANOMALY',
            category: 'MISSION',
            name: 'Gather Intelligence',
            description: 'Find pirate locations',
            priority: 8,
            urgency: 80,
            progress: 0,
            subgoals: [],
            currentSubgoal: 0,
            prerequisites: [],
            motivation: { type: 'INTRINSIC', reason: 'Need intel to hunt', emotionalDrive: 8 },
            expectedReward: { satisfaction: 5 },
            status: 'ACTIVE',
            attempts: 0,
            failures: 0,
            createdAt: now,
            createdBy: 'SELF',
            tags: ['mission', 'subgoal']
          },
          {
            id: `upgrade_weapons_${now}`,
            type: 'ACHIEVE_MASTERY',
            category: 'PERSONAL',
            name: 'Upgrade Weapons',
            description: 'Prepare for combat',
            priority: 7,
            urgency: 70,
            progress: 0,
            subgoals: [],
            currentSubgoal: 0,
            prerequisites: [],
            motivation: { type: 'COMPULSION', reason: 'Need firepower', emotionalDrive: 7 },
            expectedReward: { satisfaction: 6 },
            status: 'ACTIVE',
            attempts: 0,
            failures: 0,
            createdAt: now,
            createdBy: 'SELF',
            tags: ['combat', 'subgoal']
          }
        );
        break;

      case 'EXPLORE_UNKNOWN':
        subgoals.push(
          {
            id: `prepare_exploration_${now}`,
            type: 'FIND_SUPPLIES',
            category: 'SURVIVAL',
            name: 'Prepare for Exploration',
            description: 'Stock up on supplies',
            priority: 7,
            urgency: 60,
            progress: 0,
            subgoals: [],
            currentSubgoal: 0,
            prerequisites: [],
            motivation: { type: 'INTRINSIC', reason: 'Safety first', emotionalDrive: 6 },
            expectedReward: { satisfaction: 4 },
            status: 'ACTIVE',
            attempts: 0,
            failures: 0,
            createdAt: now,
            createdBy: 'SELF',
            tags: ['exploration', 'subgoal']
          }
        );
        break;
    }

    return subgoals;
  }

  /**
   * Execute HTN with dynamic replanning
   */
  private executeHTN(goal: NPCGoal, context: GoalEvaluationContext): PlannedAction | null {
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

  /**
   * Get current active subgoal for a goal
   */
  private getCurrentSubgoal(goal: NPCGoal): NPCGoal | null {
    const treeNode = this.goalTree.get(goal.id);
    if (!treeNode || treeNode.subgoals.length === 0) return null;

    // Find first active subgoal
    for (const subNode of treeNode.subgoals) {
      if (subNode.status === 'ACTIVE') {
        return subNode.goal;
      }
    }

    return null;
  }

  /**
   * Check if subgoal is complete
   */
  private isSubgoalComplete(subgoal: NPCGoal): boolean {
    return subgoal.status === 'COMPLETED' || subgoal.progress >= 1.0;
  }

  /**
   * Add subgoals to goal tree
   */
  private addSubgoals(parentGoal: NPCGoal, subgoals: NPCGoal[]): void {
    let treeNode = this.goalTree.get(parentGoal.id);

    if (!treeNode) {
      treeNode = {
        goal: parentGoal,
        subgoals: [],
        status: parentGoal.status
      };
      this.goalTree.set(parentGoal.id, treeNode);
    }

    // Add subgoals as tree nodes
    for (const subgoal of subgoals) {
      const subNode: GoalTreeNode = {
        goal: subgoal,
        subgoals: [],
        parent: parentGoal.id,
        status: subgoal.status
      };
      treeNode.subgoals.push(subNode);
      this.goalTree.set(subgoal.id, subNode);
      this.goals.set(subgoal.id, subgoal);
    }
  }

  /**
   * Plan action for a specific subgoal
   */
  private planActionForSubgoal(subgoal: NPCGoal, context: GoalEvaluationContext): PlannedAction | null {
    // Use A* to plan actions for this subgoal
    const plan = this.planActionsToGoal(subgoal, context);
    if (plan && plan.steps.length > 0) {
      return plan.steps[0];
    }
    return null;
  }

  /**
   * Check if subgoal has alternatives
   */
  private hasAlternatives(subgoal: NPCGoal): boolean {
    // Simplified - could track alternative strategies
    return subgoal.attempts < 2;
  }

  /**
   * Try alternative approach to subgoal
   */
  private tryAlternative(subgoal: NPCGoal, context: GoalEvaluationContext): PlannedAction | null {
    // Simplified - regenerate plan with modified parameters
    subgoal.attempts++;
    return this.planActionForSubgoal(subgoal, context);
  }

  /**
   * Abandon a subgoal
   */
  private abandonSubgoal(subgoal: NPCGoal): void {
    subgoal.status = 'ABANDONED';
    const treeNode = this.goalTree.get(subgoal.id);
    if (treeNode) {
      treeNode.status = 'ABANDONED';
    }
  }

  // ====================================================================
  // DYNAMIC GOAL PRIORITIZATION
  // ====================================================================

  /**
   * Reorder goals based on changing conditions
   */
  private reprioritizeGoals(goals: NPCGoal[], context: GoalEvaluationContext): void {
    const now = context.currentTime;

    for (const goal of goals) {
      const basePriority = goal.priority || 50;
      let priority = basePriority;

      // Urgency increases priority
      if (goal.deadline) {
        const timeLeft = goal.deadline - now;
        const estimatedDuration = 3600; // Simplified
        const urgency = Math.max(0, 1 - timeLeft / estimatedDuration);
        priority += urgency * 30;
      }

      // Opportunity increases priority
      if (this.isOpportunityAvailable(goal, context)) {
        priority += 20;
      }

      // Difficulty affects priority (prefer achievable)
      const difficulty = this.estimateDifficulty(goal, context);
      priority -= difficulty * 5;

      // Motivation matters
      if (goal.motivation) {
        if (goal.motivation.type === 'COMPULSION') priority += 25;
        priority += goal.motivation.emotionalDrive * 2;
      }

      // Recently failed goals get lower priority (frustration)
      if (goal.failures > 0) {
        priority -= goal.failures * 5;
      }

      // Clamp priority
      goal.priority = Math.max(1, Math.min(100, priority));
    }

    // Sort goals by new priority
    goals.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if opportunity is available for goal
   */
  private isOpportunityAvailable(goal: NPCGoal, context: GoalEvaluationContext): boolean {
    // Check if context has relevant opportunities
    if (goal.category === 'ECONOMIC' && context.opportunities.length > 0) {
      return true;
    }
    return false;
  }

  /**
   * Estimate difficulty of goal
   */
  private estimateDifficulty(goal: NPCGoal, context: GoalEvaluationContext): number {
    let difficulty = 5; // Base difficulty

    // Resource requirements
    if (goal.requiredResources) {
      for (const req of goal.requiredResources) {
        if (req.type === 'CREDITS') {
          const ratio = req.amount / (context.currentResources.credits + 1);
          difficulty += Math.min(5, ratio * 2);
        }
      }
    }

    // Threats increase difficulty
    if (context.threats.length > 0 && goal.category !== 'SURVIVAL') {
      difficulty += context.threats.length * 2;
    }

    return Math.min(10, difficulty);
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
