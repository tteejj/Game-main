/**
 * Narrative Mission System - "Out There" Style
 *
 * Focus: Exploration, resource scarcity, meaningful choices, atmospheric storytelling
 * Less combat, more discovery and survival decisions
 */

export type MissionType =
  | 'signal'      // Discovery-focused encounters
  | 'crisis'      // Resource scarcity survival
  | 'faction'     // Diplomatic crossroads
  | 'mystery'     // Ancient alien phenomena
  | 'moral';      // Ethical dilemmas

export type MoodType =
  | 'wonder'      // Awe and discovery
  | 'dread'       // Cosmic horror
  | 'mystery'     // Unknown and strange
  | 'desperation' // Survival pressure
  | 'awe'         // Overwhelming scale
  | 'isolation'   // Loneliness
  | 'tension';    // Danger approaching

export type NarrativeWeight =
  | 'minor'       // Small encounter, quick choice
  | 'major'       // Significant story beat
  | 'critical';   // Campaign-defining moment

export type LocationType =
  | 'deep_space'
  | 'asteroid_field'
  | 'nebula'
  | 'orbit'
  | 'station_proximity'
  | 'planet_surface'
  | 'debris_field'
  | 'unknown';

export type KnowledgeCategory =
  | 'alien_language'
  | 'precursor_tech'
  | 'scientific'
  | 'faction_intel'
  | 'navigation'
  | 'xenobiology'
  | 'archaeology';

// Resource requirements for choices
export interface ResourceCost {
  fuel?: number;          // kg of fuel
  power?: number;         // Wh of electrical power
  time?: number;          // hours of time
  hull?: number;          // hull integrity points
  supplies?: number;      // generic supplies
  cargo_space?: number;   // cargo units
}

// Reputation changes with factions
export interface ReputationChange {
  [factionId: string]: number; // -100 to +100
}

// Knowledge unlocked by missions
export interface Knowledge {
  id: string;
  category: KnowledgeCategory;
  title: string;
  description: string;
  loreText: string;

  // Effects of this knowledge
  unlocksMissions?: string[];     // Mission IDs now available
  techBonus?: string;             // Technical capability gained
  marketValue?: number;           // Can sell this data
  navigationBonus?: string;       // Reveals locations
}

// Trigger conditions for missions
export interface TriggerConditions {
  location?: LocationType[];          // Where this can trigger
  minReputation?: ReputationChange;   // Minimum faction standing
  requiredKnowledge?: string[];       // Knowledge needed
  minFuel?: number;                   // Minimum fuel to trigger
  maxFuel?: number;                   // Maximum fuel (for crisis)
  storyFlags?: string[];              // Previous choices matter
  probability?: number;               // 0-1, chance to appear
}

// Individual outcome from a choice
export interface Outcome {
  id: string;
  probability: number;        // 0-1, chance of this outcome (total should = 1)
  description: string;        // What happens

  // Effects on player
  resourceChange?: ResourceCost;      // Gain or lose (negative = cost)
  reputationChange?: ReputationChange;
  knowledgeGained?: Knowledge[];
  hullDamage?: number;
  crewEffect?: string;        // Morale, injury, etc.

  // Narrative
  narrativeText: string;      // Story description
  nextStageId?: string;       // Chain to next stage
  setFlags?: string[];        // Story flags for future

  // Special effects
  techUnlock?: string;        // New equipment/capability
  mapReveal?: string;         // Reveal location
  merchantUnlock?: boolean;   // Access new trading
}

// A choice the player can make
export interface Choice {
  id: string;
  text: string;               // Button/menu text
  description: string;        // Full explanation

  // Requirements to see/select this option
  requires?: ResourceCost;
  requiresKnowledge?: string[];
  requiresReputation?: ReputationChange;
  requiresTech?: string[];

  // What happens
  outcomes: Outcome[];
  isProbabilistic: boolean;   // If true, outcome is uncertain
  isIrreversible: boolean;    // Can't undo this

  // Flavor
  flavorText?: string;        // Additional atmospheric text
  riskLevel?: 'low' | 'medium' | 'high' | 'extreme';
}

// A stage in a multi-part mission
export interface MissionStage {
  id: string;
  title: string;
  description: string;
  narrativeText: string;      // The story being told

  choices: Choice[];

  // Atmospheric details
  visualDescription?: string; // What player sees
  audioDescription?: string;  // What player hears
  sensorData?: string;        // Technical readings

  // Pacing
  timeLimit?: number;         // Seconds to decide (optional)
  canPause?: boolean;         // Can player pause and think?
}

// Complete narrative mission
export interface NarrativeMission {
  id: string;
  type: MissionType;
  title: string;
  description: string;

  // When/where this appears
  triggerConditions: TriggerConditions;

  // Mission structure
  stages: MissionStage[];
  initialStageId: string;

  // Atmosphere
  mood: MoodType;
  narrativeWeight: NarrativeWeight;

  // Meta
  isRepeatable: boolean;
  isPartOfChain?: string;     // Chain ID if multi-mission arc
  estimatedDuration?: number; // Minutes

  // Rewards (if completed successfully)
  baseRewards?: {
    credits?: number;
    knowledge?: Knowledge[];
    reputation?: ReputationChange;
    tech?: string[];
  };
}

// Player's persistent knowledge state
export interface KnowledgeState {
  discovered: Map<string, Knowledge>;

  // Fragments of knowledge (partial understanding)
  fragments: Map<string, number>; // fragmentId -> completionPercent

  // Alien language translation progress
  languageProgress: Map<string, number>; // languageId -> fluency 0-100
}

// Player's story state
export interface NarrativeState {
  completedMissions: Set<string>;
  activeMissions: Map<string, string>; // missionId -> currentStageId
  storyFlags: Set<string>;             // Choices made

  knowledge: KnowledgeState;

  // Faction reputation
  reputation: Map<string, number>;     // factionId -> -100 to +100

  // Statistics for story generation
  stats: {
    encountersTotal: number;
    choicesMade: number;
    resourcesSpent: ResourceCost;
    peopleHelped: number;
    peopleSacrificed: number;
    mysteriesSolved: number;
    mysteriesAbandoned: number;
  };
}

// Atmospheric event (environmental storytelling)
export interface AtmosphericEvent {
  id: string;
  type: 'ambient' | 'visual' | 'audio' | 'sensor';

  // Content
  message?: string;           // Text message
  visualEffect?: string;      // Visual description
  audioEffect?: string;       // Sound description
  sensorReading?: string;     // Technical data

  // Context
  location: LocationType;
  mood: MoodType;

  // Frequency
  isPersistent: boolean;      // Continues or one-time
  duration?: number;          // Seconds (if persistent)
}

/**
 * Narrative Mission Manager
 * Handles mission triggering, progression, and state management
 */
export class NarrativeMissionManager {
  private missions: Map<string, NarrativeMission> = new Map();
  private narrativeState: NarrativeState;

  constructor() {
    this.narrativeState = this.createInitialState();
  }

  private createInitialState(): NarrativeState {
    return {
      completedMissions: new Set(),
      activeMissions: new Map(),
      storyFlags: new Set(),
      knowledge: {
        discovered: new Map(),
        fragments: new Map(),
        languageProgress: new Map(),
      },
      reputation: new Map(),
      stats: {
        encountersTotal: 0,
        choicesMade: 0,
        resourcesSpent: {
          fuel: 0,
          power: 0,
          time: 0,
          hull: 0,
          supplies: 0,
          cargo_space: 0,
        },
        peopleHelped: 0,
        peopleSacrificed: 0,
        mysteriesSolved: 0,
        mysteriesAbandoned: 0,
      },
    };
  }

  /**
   * Register a mission in the system
   */
  registerMission(mission: NarrativeMission): void {
    this.missions.set(mission.id, mission);
  }

  /**
   * Register multiple missions
   */
  registerMissions(missions: NarrativeMission[]): void {
    missions.forEach(m => this.registerMission(m));
  }

  /**
   * Check if a mission can trigger given current conditions
   */
  canTrigger(
    missionId: string,
    currentLocation: LocationType,
    playerResources: ResourceCost,
  ): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    // Already completed and not repeatable
    if (
      this.narrativeState.completedMissions.has(missionId) &&
      !mission.isRepeatable
    ) {
      return false;
    }

    // Already active
    if (this.narrativeState.activeMissions.has(missionId)) {
      return false;
    }

    const conditions = mission.triggerConditions;

    // Location check
    if (
      conditions.location &&
      !conditions.location.includes(currentLocation)
    ) {
      return false;
    }

    // Fuel requirements
    if (conditions.minFuel && playerResources.fuel! < conditions.minFuel) {
      return false;
    }
    if (conditions.maxFuel && playerResources.fuel! > conditions.maxFuel) {
      return false;
    }

    // Knowledge requirements
    if (conditions.requiredKnowledge) {
      for (const knowledgeId of conditions.requiredKnowledge) {
        if (!this.narrativeState.knowledge.discovered.has(knowledgeId)) {
          return false;
        }
      }
    }

    // Story flag requirements
    if (conditions.storyFlags) {
      for (const flag of conditions.storyFlags) {
        if (!this.narrativeState.storyFlags.has(flag)) {
          return false;
        }
      }
    }

    // Reputation requirements
    if (conditions.minReputation) {
      for (const [faction, minRep] of Object.entries(conditions.minReputation)) {
        const currentRep = this.narrativeState.reputation.get(faction) || 0;
        if (currentRep < minRep) {
          return false;
        }
      }
    }

    // Probability check
    if (conditions.probability !== undefined) {
      return Math.random() < conditions.probability;
    }

    return true;
  }

  /**
   * Get available missions for current conditions
   */
  getAvailableMissions(
    currentLocation: LocationType,
    playerResources: ResourceCost,
  ): NarrativeMission[] {
    const available: NarrativeMission[] = [];

    for (const [missionId, mission] of this.missions) {
      if (this.canTrigger(missionId, currentLocation, playerResources)) {
        available.push(mission);
      }
    }

    return available;
  }

  /**
   * Start a mission
   */
  startMission(missionId: string): MissionStage | null {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    // Set as active
    this.narrativeState.activeMissions.set(missionId, mission.initialStageId);
    this.narrativeState.stats.encountersTotal++;

    // Get initial stage
    const stage = mission.stages.find(s => s.id === mission.initialStageId);
    return stage || null;
  }

  /**
   * Make a choice in a mission
   */
  makeChoice(
    missionId: string,
    stageId: string,
    choiceId: string,
  ): Outcome | null {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    const stage = mission.stages.find(s => s.id === stageId);
    if (!stage) return null;

    const choice = stage.choices.find(c => c.id === choiceId);
    if (!choice) return null;

    // Select outcome (probabilistic or deterministic)
    let outcome: Outcome;
    if (choice.isProbabilistic && choice.outcomes.length > 1) {
      outcome = this.selectProbabilisticOutcome(choice.outcomes);
    } else {
      outcome = choice.outcomes[0];
    }

    // Apply outcome
    this.applyOutcome(outcome);

    // Update mission state
    if (outcome.nextStageId) {
      // Continue to next stage
      this.narrativeState.activeMissions.set(missionId, outcome.nextStageId);
    } else {
      // Mission complete
      this.narrativeState.activeMissions.delete(missionId);
      this.narrativeState.completedMissions.add(missionId);
    }

    this.narrativeState.stats.choicesMade++;

    return outcome;
  }

  /**
   * Select outcome based on probabilities
   */
  private selectProbabilisticOutcome(outcomes: Outcome[]): Outcome {
    const roll = Math.random();
    let cumulative = 0;

    for (const outcome of outcomes) {
      cumulative += outcome.probability;
      if (roll < cumulative) {
        return outcome;
      }
    }

    // Fallback to last outcome
    return outcomes[outcomes.length - 1];
  }

  /**
   * Apply outcome effects to narrative state
   */
  private applyOutcome(outcome: Outcome): void {
    // Knowledge gained
    if (outcome.knowledgeGained) {
      for (const knowledge of outcome.knowledgeGained) {
        this.narrativeState.knowledge.discovered.set(knowledge.id, knowledge);
        this.narrativeState.stats.mysteriesSolved++;
      }
    }

    // Reputation changes
    if (outcome.reputationChange) {
      for (const [faction, change] of Object.entries(outcome.reputationChange)) {
        const current = this.narrativeState.reputation.get(faction) || 0;
        const newRep = Math.max(-100, Math.min(100, current + change));
        this.narrativeState.reputation.set(faction, newRep);
      }
    }

    // Story flags
    if (outcome.setFlags) {
      for (const flag of outcome.setFlags) {
        this.narrativeState.storyFlags.add(flag);
      }
    }

    // Resource tracking
    if (outcome.resourceChange) {
      const stats = this.narrativeState.stats.resourcesSpent;
      if (outcome.resourceChange.fuel) {
        stats.fuel = (stats.fuel || 0) + Math.abs(outcome.resourceChange.fuel);
      }
      if (outcome.resourceChange.power) {
        stats.power = (stats.power || 0) + Math.abs(outcome.resourceChange.power);
      }
      if (outcome.resourceChange.time) {
        stats.time = (stats.time || 0) + Math.abs(outcome.resourceChange.time);
      }
    }
  }

  /**
   * Get current stage of active mission
   */
  getCurrentStage(missionId: string): MissionStage | null {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    const stageId = this.narrativeState.activeMissions.get(missionId);
    if (!stageId) return null;

    return mission.stages.find(s => s.id === stageId) || null;
  }

  /**
   * Get player's narrative state (for save/load)
   */
  getState(): NarrativeState {
    return this.narrativeState;
  }

  /**
   * Set player's narrative state (for save/load)
   */
  setState(state: NarrativeState): void {
    this.narrativeState = state;
  }

  /**
   * Check if player can afford a choice
   */
  canAffordChoice(choice: Choice, playerResources: ResourceCost): boolean {
    if (!choice.requires) return true;

    const req = choice.requires;

    if (req.fuel && playerResources.fuel! < req.fuel) return false;
    if (req.power && playerResources.power! < req.power) return false;
    if (req.time && playerResources.time! < req.time) return false;
    if (req.supplies && playerResources.supplies! < req.supplies) return false;
    if (req.cargo_space && playerResources.cargo_space! < req.cargo_space) return false;

    return true;
  }

  /**
   * Get reputation with faction
   */
  getReputation(factionId: string): number {
    return this.narrativeState.reputation.get(factionId) || 0;
  }

  /**
   * Get all discovered knowledge
   */
  getKnowledge(): Knowledge[] {
    return Array.from(this.narrativeState.knowledge.discovered.values());
  }
}
