/**
 * ExtendedNPCMemory - Deep memory system for NPCs
 *
 * This extends the basic ship memory from NPCShipAI.ts to include:
 * - Detailed experience tracking
 * - Complex relationship management
 * - Trauma and emotional responses
 * - Learning from experiences
 * - Reputation tracking
 * - Personal history and biography
 */

import { Vector3 } from '../types';
import { HistoricalEvent, Relationship } from './HistoricalMemorySystem';

export interface Experience {
  id: string;
  timestamp: number;
  type: ExperienceType;

  // What happened
  event: HistoricalEvent;

  // How the NPC felt about it
  emotionalImpact: number;        // -10 to +10 (negative = bad, positive = good)
  intensity: number;              // 0-10 (how memorable)

  // What the NPC learned
  lessonLearned?: Lesson;
  behaviorChange?: BehaviorModification;

  // Context
  location: Vector3;
  witnesses: string[];            // Other entities present

  // Decay
  memoryStrength: number;         // 1.0 = fresh, decays over time
  recallCount: number;            // How many times recalled (strengthens memory)

  // Memory consolidation
  consolidated: boolean;          // Short-term → long-term
  consolidationStrength?: number; // Bonus strength from consolidation
}

export type ExperienceType =
  | 'NEAR_DEATH' | 'SUCCESSFUL_TRADE' | 'PROFITABLE_DISCOVERY'
  | 'BETRAYAL' | 'RESCUE' | 'BEING_RESCUED'
  | 'COMBAT_VICTORY' | 'COMBAT_DEFEAT' | 'FLEEING'
  | 'FIRST_TIME' | 'MILESTONE' | 'FAILURE'
  | 'FRIENDSHIP_FORMED' | 'FRIENDSHIP_BROKEN'
  | 'REPUTATION_GAINED' | 'REPUTATION_LOST'
  | 'GOAL_ACHIEVED' | 'GOAL_FAILED'
  | 'DISCOVERY' | 'EXPLORATION' | 'LEARNING';

export interface Lesson {
  condition: string;              // "When in asteroid field..."
  action: string;                 // "...slow down and use sensors"
  confidence: number;             // 0-1 (increases with successful applications)
  learnedFrom: string[];          // Experience IDs
  successCount: number;
  failureCount: number;
  lastApplied: number;
}

export interface BehaviorModification {
  type: 'PERMANENT' | 'TEMPORARY' | 'CONDITIONAL';
  description: string;
  trigger?: string;               // What triggers this behavior
  duration?: number;              // For TEMPORARY (seconds)
  expiresAt?: number;

  // What changed
  personalityShift?: Partial<PersonalityTraits>;
  preferenceChange?: { [key: string]: number };
  avoidancePattern?: string;      // "Avoid Sol system"
  seekingPattern?: string;        // "Seek high-security regions"
}

export interface PersonalityTraits {
  // Core traits (0-1 scale)
  aggression: number;             // 0 = peaceful, 1 = hostile
  caution: number;                // 0 = reckless, 1 = paranoid
  greed: number;                  // 0 = altruistic, 1 = greedy
  curiosity: number;              // 0 = routine, 1 = explorer
  loyalty: number;                // 0 = mercenary, 1 = devoted

  // Social traits
  trustingness: number;           // 0 = suspicious, 1 = naive
  sociability: number;            // 0 = loner, 1 = social

  // Operational traits
  risktaking: number;             // 0 = safe, 1 = gambler
  patience: number;               // 0 = impulsive, 1 = methodical
  adaptability: number;           // 0 = rigid, 1 = flexible
}

export interface DetailedRelationship extends Relationship {
  // Extended relationship data
  trustLevel: number;             // 0-100
  respectLevel: number;           // 0-100
  fearLevel: number;              // 0-100

  // History
  firstMet: number;               // Timestamp
  significantEvents: Experience[];
  favorsDone: number;
  favorsOwed: number;

  // Interaction patterns
  communicationFrequency: number;
  lastCommunication: number;
  preferredContactMethod: 'DIRECT' | 'INTERMEDIARY' | 'AVOID';

  // Behavioral impact
  influenceOnDecisions: number;   // 0-1 (how much this entity affects choices)
}

export interface TraumaMemory {
  experience: Experience;
  severity: number;               // 0-10
  timestamp: number;              // When trauma occurred

  // Triggers that recall this trauma
  triggers: TriggerPattern[];

  // Effects on behavior
  phobias: string[];              // "Avoid pirates", "Fear asteroid fields"
  hypervigilance: string[];       // "Always scan for pirates"
  avoidancePatterns: string[];

  // Recovery
  healingProgress: number;        // 0-1 (0 = fresh wound, 1 = healed)
  copingMechanisms: string[];

  // When triggered
  triggeredCount: number;
  lastTriggered: number;

  // Related experiences
  relatedExperiences: Experience[];
}

export interface TriggerPattern {
  type: 'LOCATION' | 'ENTITY_TYPE' | 'SITUATION' | 'SENSORY';
  pattern: string;
  sensitivity: number;            // 0-1 (how easily triggered)
  strength: number;               // 0-1 (how strong the trigger is)
}

export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;

  // When earned
  earnedAt: number;
  experience: Experience;

  // Reputation impact
  fame: number;                   // 0-100 (how well-known)
  factionReputationBonus: Map<string, number>;

  // Unlocks
  unlocks?: string[];             // New behaviors, opportunities, etc.
}

export type AchievementType =
  | 'FIRST_TRADE' | 'PROFITABLE_TRADER' | 'MASTER_TRADER'
  | 'FIRST_RESCUE' | 'HEROIC_RESCUER' | 'SAVIOR'
  | 'FIRST_KILL' | 'COMBAT_ACE' | 'LEGENDARY_WARRIOR'
  | 'EXPLORER' | 'DISCOVERER' | 'PATHFINDER'
  | 'SURVIVOR' | 'NEAR_DEATH_ESCAPE' | 'UNKILLABLE'
  | 'WEALTHY' | 'TYCOON' | 'MAGNATE'
  | 'NOTORIOUS' | 'INFAMOUS' | 'LEGENDARY';

export interface Reputation {
  // Faction reputation
  factionStanding: Map<string, number>;  // -100 to 100

  // General reputation
  fame: number;                   // 0-100 (how well-known)
  infamy: number;                 // 0-100 (how notorious)

  // Specific reputations
  traderReputation: number;       // 0-100
  combatReputation: number;       // 0-100
  explorerReputation: number;     // 0-100

  // Titles earned
  titles: string[];

  // How others see this NPC
  perceivedTraits: Partial<PersonalityTraits>;
}

export interface Biography {
  // Origin
  birthLocation?: string;
  birthTime?: number;
  faction?: string;

  // Career
  careerPath: CareerMilestone[];
  currentOccupation: string;
  yearsOfExperience: number;

  // Life story
  majorEvents: Experience[];
  turningPoints: Experience[];

  // Goals and aspirations
  lifeGoal?: string;
  achievedGoals: string[];
  abandonedGoals: string[];

  // Relationships
  significantRelationships: string[];  // Entity IDs

  // Legacy
  legendaryDeeds: Achievement[];
  notorious For: string[];
}

export interface CareerMilestone {
  timestamp: number;
  type: 'PROMOTION' | 'CAREER_CHANGE' | 'MAJOR_ACHIEVEMENT' | 'SETBACK';
  description: string;
  impact: number;                 // -10 to +10
}

export class ExtendedNPCMemory {
  // Identity
  public readonly entityId: string;
  public readonly entityType: 'SHIP' | 'STATION' | 'FACTION';

  // Core personality (relatively stable)
  public personality: PersonalityTraits;

  // Experiences
  private experiences: Map<string, Experience> = new Map();
  private experiencesByType: Map<ExperienceType, Experience[]> = new Map();
  private significantExperiences: Experience[] = [];  // Top 20 most impactful

  // Memory consolidation
  private shortTermBuffer: Experience[] = [];         // Recent, unconsolidated memories
  private longTermMemories: Experience[] = [];        // Consolidated memories

  // Relationships
  private relationships: Map<string, DetailedRelationship> = new Map();

  // Trauma
  private traumas: TraumaMemory[] = [];
  private activePhobias: Set<string> = new Set();

  // Learning
  private lessons: Map<string, Lesson> = new Map();
  private behaviorModifications: BehaviorModification[] = [];

  // Achievements
  private achievements: Map<string, Achievement> = new Map();

  // Reputation
  public reputation: Reputation;

  // Biography
  public biography: Biography;

  // Statistics
  private totalExperiences: number = 0;
  private memoryCapacity: number = 1000;  // Max experiences to remember

  constructor(
    entityId: string,
    entityType: 'SHIP' | 'STATION' | 'FACTION',
    initialPersonality?: Partial<PersonalityTraits>
  ) {
    this.entityId = entityId;
    this.entityType = entityType;

    // Initialize personality (random if not provided)
    this.personality = {
      aggression: initialPersonality?.aggression ?? Math.random(),
      caution: initialPersonality?.caution ?? Math.random(),
      greed: initialPersonality?.greed ?? Math.random(),
      curiosity: initialPersonality?.curiosity ?? Math.random(),
      loyalty: initialPersonality?.loyalty ?? Math.random(),
      trustingness: initialPersonality?.trustingness ?? Math.random(),
      sociability: initialPersonality?.sociability ?? Math.random(),
      risktaking: initialPersonality?.risktaking ?? Math.random(),
      patience: initialPersonality?.patience ?? Math.random(),
      adaptability: initialPersonality?.adaptability ?? Math.random()
    };

    // Initialize reputation
    this.reputation = {
      factionStanding: new Map(),
      fame: 0,
      infamy: 0,
      traderReputation: 0,
      combatReputation: 0,
      explorerReputation: 0,
      titles: [],
      perceivedTraits: {}
    };

    // Initialize biography
    this.biography = {
      careerPath: [],
      currentOccupation: 'Unknown',
      yearsOfExperience: 0,
      majorEvents: [],
      turningPoints: [],
      achievedGoals: [],
      abandonedGoals: [],
      significantRelationships: [],
      legendaryDeeds: [],
      notoriousFor: []
    };
  }

  /**
   * Record a new experience
   */
  public recordExperience(experience: Experience): void {
    // Initialize consolidation properties
    experience.consolidated = false;
    experience.consolidationStrength = 0;

    // Store experience
    this.experiences.set(experience.id, experience);
    this.totalExperiences++;

    // Add to short-term buffer (not yet consolidated)
    this.shortTermBuffer.push(experience);

    // Index by type
    if (!this.experiencesByType.has(experience.type)) {
      this.experiencesByType.set(experience.type, []);
    }
    this.experiencesByType.get(experience.type)!.push(experience);

    // Update significant experiences (keep top 20 by intensity)
    this.updateSignificantExperiences(experience);

    // Check for trauma
    if (experience.emotionalImpact < -7 && experience.intensity > 7) {
      this.recordTrauma(experience);
    }

    // Check for achievement
    this.checkForAchievements(experience);

    // Apply behavior modification
    if (experience.behaviorChange) {
      this.applyBehaviorModification(experience.behaviorChange);
    }

    // Learn lesson
    if (experience.lessonLearned) {
      this.learnLesson(experience.lessonLearned);
    }

    // Update biography
    if (experience.intensity > 8) {
      this.biography.majorEvents.push(experience);

      if (this.isLifeChanging(experience)) {
        this.biography.turningPoints.push(experience);
      }
    }

    // Prune old memories if over capacity
    if (this.experiences.size > this.memoryCapacity) {
      this.pruneOldMemories();
    }
  }

  /**
   * Update or create relationship
   */
  public updateRelationship(
    targetEntityId: string,
    changes: Partial<DetailedRelationship>,
    experience?: Experience
  ): void {
    let relationship = this.relationships.get(targetEntityId);

    if (!relationship) {
      // Create new relationship
      relationship = {
        targetEntityId,
        type: changes.type || 'NEUTRAL',
        strength: changes.strength || 0,
        formedAt: Date.now() / 1000,
        sharedEvents: experience ? [experience.event.id] : [],
        lastInteraction: Date.now() / 1000,
        trustLevel: 50,
        respectLevel: 50,
        fearLevel: 0,
        firstMet: Date.now() / 1000,
        significantEvents: experience ? [experience] : [],
        favorsDone: 0,
        favorsOwed: 0,
        communicationFrequency: 0,
        lastCommunication: 0,
        preferredContactMethod: 'DIRECT',
        influenceOnDecisions: 0.1
      };
    }

    // Apply changes
    Object.assign(relationship, changes);

    // Add experience
    if (experience) {
      relationship.significantEvents.push(experience);
      if (!relationship.sharedEvents.includes(experience.event.id)) {
        relationship.sharedEvents.push(experience.event.id);
      }
    }

    // Store
    this.relationships.set(targetEntityId, relationship);

    // Update biography
    if (relationship.strength > 50 || relationship.strength < -50) {
      if (!this.biography.significantRelationships.includes(targetEntityId)) {
        this.biography.significantRelationships.push(targetEntityId);
      }
    }
  }

  /**
   * Recall experiences matching criteria
   */
  public recallExperiences(criteria: {
    type?: ExperienceType;
    emotionalImpact?: { min?: number; max?: number };
    intensity?: { min?: number; max?: number };
    timeRange?: { start?: number; end?: number };
    involving?: string;  // Entity ID
    limit?: number;
  }): Experience[] {
    let results: Experience[] = [];

    // Filter by type
    if (criteria.type) {
      results = this.experiencesByType.get(criteria.type) || [];
    } else {
      results = Array.from(this.experiences.values());
    }

    // Filter by emotional impact
    if (criteria.emotionalImpact) {
      results = results.filter(e => {
        if (criteria.emotionalImpact!.min !== undefined && e.emotionalImpact < criteria.emotionalImpact!.min) return false;
        if (criteria.emotionalImpact!.max !== undefined && e.emotionalImpact > criteria.emotionalImpact!.max) return false;
        return true;
      });
    }

    // Filter by intensity
    if (criteria.intensity) {
      results = results.filter(e => {
        if (criteria.intensity!.min !== undefined && e.intensity < criteria.intensity!.min) return false;
        if (criteria.intensity!.max !== undefined && e.intensity > criteria.intensity!.max) return false;
        return true;
      });
    }

    // Filter by time range
    if (criteria.timeRange) {
      results = results.filter(e => {
        if (criteria.timeRange!.start !== undefined && e.timestamp < criteria.timeRange!.start) return false;
        if (criteria.timeRange!.end !== undefined && e.timestamp > criteria.timeRange!.end) return false;
        return true;
      });
    }

    // Filter by involvement
    if (criteria.involving) {
      results = results.filter(e =>
        e.event.participants.includes(criteria.involving!) ||
        e.witnesses.includes(criteria.involving!)
      );
    }

    // Strengthen recalled memories
    for (const experience of results) {
      experience.recallCount++;
      experience.memoryStrength = Math.min(1.0, experience.memoryStrength + 0.1);
    }

    // Sort by memory strength (most vivid first)
    results.sort((a, b) => {
      const scoreA = a.memoryStrength * a.intensity * (1 + a.recallCount * 0.1);
      const scoreB = b.memoryStrength * b.intensity * (1 + b.recallCount * 0.1);
      return scoreB - scoreA;
    });

    // Limit
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Get relationship with entity
   */
  public getRelationship(targetEntityId: string): DetailedRelationship | null {
    return this.relationships.get(targetEntityId) || null;
  }

  /**
   * Check if situation triggers trauma
   */
  public checkTraumaTriggers(situation: {
    location?: Vector3;
    entityTypes?: string[];
    situationType?: string;
  }): TraumaMemory[] {
    const triggered: TraumaMemory[] = [];

    for (const trauma of this.traumas) {
      for (const trigger of trauma.triggers) {
        let isTriggered = false;

        switch (trigger.type) {
          case 'LOCATION':
            if (situation.location && this.isNearLocation(situation.location, trauma.experience.location)) {
              isTriggered = Math.random() < trigger.sensitivity;
            }
            break;

          case 'ENTITY_TYPE':
            if (situation.entityTypes && situation.entityTypes.some(t => trigger.pattern.includes(t))) {
              isTriggered = Math.random() < trigger.sensitivity;
            }
            break;

          case 'SITUATION':
            if (situation.situationType && trigger.pattern === situation.situationType) {
              isTriggered = Math.random() < trigger.sensitivity;
            }
            break;
        }

        if (isTriggered) {
          trauma.triggeredCount++;
          trauma.lastTriggered = Date.now() / 1000;
          triggered.push(trauma);
          break;
        }
      }
    }

    return triggered;
  }

  /**
   * Get applicable lessons for situation
   */
  public getApplicableLessons(situation: string): Lesson[] {
    const applicable: Lesson[] = [];

    for (const lesson of this.lessons.values()) {
      if (this.matchesSituation(lesson.condition, situation)) {
        applicable.push(lesson);
      }
    }

    // Sort by confidence
    applicable.sort((a, b) => b.confidence - a.confidence);

    return applicable;
  }

  /**
   * Get current personality (including modifications)
   */
  public getCurrentPersonality(): PersonalityTraits {
    const current = { ...this.personality };

    // Apply temporary modifications
    for (const mod of this.behaviorModifications) {
      if (mod.type === 'PERMANENT' || (mod.type === 'TEMPORARY' && (!mod.expiresAt || mod.expiresAt > Date.now() / 1000))) {
        if (mod.personalityShift) {
          Object.assign(current, mod.personalityShift);
        }
      }
    }

    return current;
  }

  /**
   * Update memory over time (decay, healing, consolidation)
   */
  public update(deltaTime: number): void {
    const currentTime = Date.now() / 1000;

    // Decay memories using Ebbinghaus forgetting curve
    for (const experience of this.experiences.values()) {
      experience.memoryStrength = this.calculateMemoryDecay(experience, currentTime);
    }

    // Heal trauma over time
    for (const trauma of this.traumas) {
      const healingRate = 0.001;  // Very slow healing
      trauma.healingProgress = Math.min(1.0, trauma.healingProgress + healingRate * deltaTime / 86400);

      // Reduce sensitivity as healing progresses
      for (const trigger of trauma.triggers) {
        trigger.sensitivity = Math.max(0.1, trigger.sensitivity * (1 - trauma.healingProgress));
      }
    }

    // Expire temporary behavior modifications
    this.behaviorModifications = this.behaviorModifications.filter(mod =>
      mod.type === 'PERMANENT' ||
      (mod.type === 'TEMPORARY' && (!mod.expiresAt || mod.expiresAt > currentTime))
    );
  }

  /**
   * Calculate memory decay using Ebbinghaus forgetting curve
   */
  private calculateMemoryDecay(memory: Experience, currentTime: number): number {
    const elapsed = currentTime - memory.timestamp;
    const daysSince = elapsed / 86400;

    // Base decay rate (can be modified by emotional intensity)
    const k = 1.84; // Ebbinghaus constant

    // Emotional intensity slows decay
    const emotionalModifier = 1 - (Math.abs(memory.emotionalImpact) / 10) * 0.5;

    // Recall strengthens memory (spaced repetition effect)
    const recallBonus = Math.log(memory.recallCount + 1) * 0.1;

    // Consolidation strengthens memory
    const consolidationBonus = memory.consolidated ? (memory.consolidationStrength || 0.5) : 0;

    // R = e^(-t/S) where S is "memory strength"
    const memoryLife = k * emotionalModifier * (1 + recallBonus + consolidationBonus);
    const retention = Math.exp(-daysSince / memoryLife);

    return Math.max(0.1, retention); // Never completely forget traumatic events
  }

  /**
   * Consolidate memories during "rest" periods (short-term → long-term)
   */
  public consolidateMemories(restDuration: number): number {
    if (this.shortTermBuffer.length === 0) return 0;

    // Sort by importance
    const sorted = [...this.shortTermBuffer].sort((a, b) => {
      const importanceA = a.intensity * Math.abs(a.emotionalImpact);
      const importanceB = b.intensity * Math.abs(b.emotionalImpact);
      return importanceB - importanceA;
    });

    // Top 20% become long-term memories with strengthened encoding
    const consolidationThreshold = Math.max(1, Math.ceil(sorted.length * 0.2));
    let consolidated = 0;

    for (let i = 0; i < consolidationThreshold; i++) {
      sorted[i].memoryStrength *= 1.5; // Strengthened through consolidation
      sorted[i].consolidated = true;
      sorted[i].consolidationStrength = 0.5;
      this.longTermMemories.push(sorted[i]);
      consolidated++;
    }

    // Clear short-term buffer
    this.shortTermBuffer.length = 0;

    return consolidated;
  }

  /**
   * Retrieve memories based on environmental cues (sophisticated retrieval)
   */
  public retrieveMemoriesByCues(cues: {
    location?: Vector3;
    entities?: string[];
    emotionalState?: number;
    context?: string;
  }): Experience[] {
    const retrieved: Experience[] = [];
    const allMemories = [...this.experiences.values()];

    for (const memory of allMemories) {
      let relevance = 0;

      // Location cue (within range)
      if (cues.location && memory.location) {
        const dx = cues.location.x - memory.location.x;
        const dy = cues.location.y - memory.location.y;
        const dz = cues.location.z - memory.location.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
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

      // Context cue
      if (cues.context) {
        if (memory.event.description.toLowerCase().includes(cues.context.toLowerCase())) {
          relevance += 0.2;
        }
      }

      // Retrieval probability based on strength and relevance
      const retrievalProb = memory.memoryStrength * relevance;

      if (Math.random() < retrievalProb) {
        // Successful retrieval strengthens memory
        memory.recallCount++;
        memory.memoryStrength = Math.min(1.0, memory.memoryStrength * 1.05);
        retrieved.push(memory);
      }
    }

    return retrieved.sort((a, b) => b.memoryStrength - a.memoryStrength);
  }

  /**
   * Process trauma with PTSD-like mechanics (triggers, flashbacks, healing)
   */
  public processTrauma(trauma: TraumaMemory, currentContext: {
    location?: Vector3;
    entityTypes?: string[];
    situationType?: string;
  }): {
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
    const currentTime = Date.now() / 1000;
    const elapsed = currentTime - trauma.timestamp;
    const daysSince = elapsed / 86400;
    const healingFactor = Math.min(0.5, daysSince / 365); // Max 50% healing over 1 year
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

  /**
   * Check if context matches a trigger
   */
  private contextMatchesTrigger(context: any, trigger: TriggerPattern): boolean {
    switch (trigger.type) {
      case 'LOCATION':
        if (context.location) {
          // Simple proximity check
          return true; // Simplified - would need actual location comparison
        }
        break;

      case 'ENTITY_TYPE':
        if (context.entityTypes) {
          return context.entityTypes.some((t: string) => trigger.pattern.includes(t));
        }
        break;

      case 'SITUATION':
        if (context.situationType) {
          return trigger.pattern === context.situationType;
        }
        break;
    }

    return false;
  }

  /**
   * Generate summary/biography string
   */
  public generateBiography(): string {
    const lines: string[] = [];

    lines.push(`=== ${this.entityId} ===`);
    lines.push('');
    lines.push('PERSONALITY:');
    lines.push(`  Aggression: ${(this.personality.aggression * 100).toFixed(0)}%`);
    lines.push(`  Caution: ${(this.personality.caution * 100).toFixed(0)}%`);
    lines.push(`  Greed: ${(this.personality.greed * 100).toFixed(0)}%`);
    lines.push(`  Curiosity: ${(this.personality.curiosity * 100).toFixed(0)}%`);
    lines.push('');

    lines.push('REPUTATION:');
    lines.push(`  Fame: ${this.reputation.fame}/100`);
    lines.push(`  Infamy: ${this.reputation.infamy}/100`);
    if (this.reputation.titles.length > 0) {
      lines.push(`  Titles: ${this.reputation.titles.join(', ')}`);
    }
    lines.push('');

    lines.push('MAJOR LIFE EVENTS:');
    for (const event of this.biography.majorEvents.slice(0, 5)) {
      lines.push(`  - ${event.event.description}`);
    }
    lines.push('');

    if (this.achievements.size > 0) {
      lines.push('ACHIEVEMENTS:');
      for (const achievement of this.achievements.values()) {
        lines.push(`  - ${achievement.name}: ${achievement.description}`);
      }
      lines.push('');
    }

    if (this.traumas.length > 0) {
      lines.push('TRAUMAS:');
      for (const trauma of this.traumas) {
        lines.push(`  - ${trauma.experience.event.description} (severity: ${trauma.severity}/10)`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ====================================================================
  // PRIVATE HELPER METHODS
  // ====================================================================

  private updateSignificantExperiences(experience: Experience): void {
    this.significantExperiences.push(experience);
    this.significantExperiences.sort((a, b) => {
      const scoreA = a.intensity * Math.abs(a.emotionalImpact) * a.memoryStrength;
      const scoreB = b.intensity * Math.abs(b.emotionalImpact) * b.memoryStrength;
      return scoreB - scoreA;
    });
    this.significantExperiences = this.significantExperiences.slice(0, 20);
  }

  private recordTrauma(experience: Experience): void {
    const trauma: TraumaMemory = {
      experience,
      severity: Math.abs(experience.emotionalImpact),
      timestamp: experience.timestamp,
      triggers: this.generateTriggers(experience),
      phobias: [],
      hypervigilance: [],
      avoidancePatterns: [],
      healingProgress: 0,
      copingMechanisms: [],
      triggeredCount: 0,
      lastTriggered: 0,
      relatedExperiences: [experience]
    };

    // Generate phobias based on experience type
    switch (experience.type) {
      case 'NEAR_DEATH':
        trauma.phobias.push('fear_of_death');
        trauma.hypervigilance.push('constant_sensor_scanning');
        break;
      case 'BETRAYAL':
        trauma.phobias.push('trust_issues');
        trauma.hypervigilance.push('suspicious_of_others');
        break;
      case 'COMBAT_DEFEAT':
        trauma.phobias.push('fear_of_combat');
        trauma.avoidancePatterns.push('flee_from_conflict');
        break;
    }

    this.traumas.push(trauma);

    // Add phobias to active set
    for (const phobia of trauma.phobias) {
      this.activePhobias.add(phobia);
    }
  }

  private generateTriggers(experience: Experience): TriggerPattern[] {
    const triggers: TriggerPattern[] = [];

    // Location trigger
    triggers.push({
      type: 'LOCATION',
      pattern: `near_${this.locationKey(experience.location)}`,
      sensitivity: 0.8,
      strength: 0.7
    });

    // Entity type trigger
    if (experience.event.participants.length > 0) {
      triggers.push({
        type: 'ENTITY_TYPE',
        pattern: experience.event.type,
        sensitivity: 0.7,
        strength: 0.6
      });
    }

    // Situation trigger
    triggers.push({
      type: 'SITUATION',
      pattern: experience.type,
      sensitivity: 0.6,
      strength: 0.5
    });

    return triggers;
  }

  private applyBehaviorModification(mod: BehaviorModification): void {
    this.behaviorModifications.push(mod);

    // Apply permanent personality shifts immediately
    if (mod.type === 'PERMANENT' && mod.personalityShift) {
      for (const [trait, value] of Object.entries(mod.personalityShift)) {
        (this.personality as any)[trait] = Math.max(0, Math.min(1, (this.personality as any)[trait] + value));
      }
    }
  }

  private learnLesson(lesson: Lesson): void {
    const key = `${lesson.condition}:${lesson.action}`;

    if (this.lessons.has(key)) {
      // Strengthen existing lesson
      const existing = this.lessons.get(key)!;
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      existing.learnedFrom.push(...lesson.learnedFrom);
    } else {
      // New lesson
      this.lessons.set(key, lesson);
    }
  }

  private checkForAchievements(experience: Experience): void {
    // Check for achievement conditions
    // This would be implemented based on specific achievement criteria
    // For now, just placeholder logic

    if (experience.type === 'SUCCESSFUL_TRADE' && this.countExperienceType('SUCCESSFUL_TRADE') === 1) {
      this.awardAchievement({
        id: 'first_trade',
        type: 'FIRST_TRADE',
        name: 'First Trade',
        description: 'Completed first successful trade',
        earnedAt: experience.timestamp,
        experience,
        fame: 5,
        factionReputationBonus: new Map()
      });
    }
  }

  private awardAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);
    this.reputation.fame += achievement.fame;
    this.biography.legendaryDeeds.push(achievement);
  }

  private isLifeChanging(experience: Experience): boolean {
    return Math.abs(experience.emotionalImpact) >= 8 && experience.intensity >= 8;
  }

  private pruneOldMemories(): void {
    // Remove weakest memories
    const sorted = Array.from(this.experiences.values()).sort((a, b) => {
      const scoreA = a.memoryStrength * a.intensity * (1 + a.recallCount);
      const scoreB = b.memoryStrength * b.intensity * (1 + b.recallCount);
      return scoreA - scoreB;  // Lowest first
    });

    const toRemove = sorted.slice(0, sorted.length - this.memoryCapacity);
    for (const experience of toRemove) {
      this.experiences.delete(experience.id);
    }
  }

  private countExperienceType(type: ExperienceType): number {
    return (this.experiencesByType.get(type) || []).length;
  }

  private isNearLocation(pos1: Vector3, pos2: Vector3): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    return distSq < 1000000; // Within 1000 km
  }

  private locationKey(location: Vector3): string {
    return `${Math.floor(location.x / 10000)},${Math.floor(location.y / 10000)},${Math.floor(location.z / 10000)}`;
  }

  private matchesSituation(condition: string, situation: string): boolean {
    // Simple string matching for now
    // Could be made more sophisticated with pattern matching
    return situation.toLowerCase().includes(condition.toLowerCase());
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public getStatistics(): {
    totalExperiences: number;
    significantExperiences: number;
    relationships: number;
    traumas: number;
    achievements: number;
    lessons: number;
  } {
    return {
      totalExperiences: this.totalExperiences,
      significantExperiences: this.significantExperiences.length,
      relationships: this.relationships.size,
      traumas: this.traumas.length,
      achievements: this.achievements.size,
      lessons: this.lessons.size
    };
  }
}
