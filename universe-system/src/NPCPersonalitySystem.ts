/**
 * NPCPersonalitySystem.ts
 * Deep NPC personality and behavior system - Caves of Qud style
 * Every NPC has unique personality, goals, relationships, and emergent behavior
 */

export interface NPCPersonality {
  id: string;
  name: string;
  callsign: string;
  species: string;

  // Core personality traits (Big Five + extras)
  traits: {
    openness: number;                   // 0-1 (conservative vs. experimental)
    conscientiousness: number;          // 0-1 (reckless vs. dutiful)
    extraversion: number;               // 0-1 (shy vs. social)
    agreeableness: number;              // 0-1 (hostile vs. friendly)
    neuroticism: number;                // 0-1 (calm vs. anxious)
    courage: number;                    // 0-1 (cowardly vs. brave)
    greed: number;                      // 0-1 (generous vs. greedy)
    honor: number;                      // 0-1 (dishonest vs. honorable)
    curiosity: number;                  // 0-1 (incurious vs. inquisitive)
    ruthlessness: number;               // 0-1 (merciful vs. ruthless)
  };

  // Background
  background: NPCBackground;
  skills: Map<string, number>;          // Skill name -> proficiency (0-1)
  fears: string[];
  desires: string[];
  secrets: string[];

  // Current state
  mood: Mood;
  stress: number;                       // 0-1
  trust: Map<string, number>;           // Entity ID -> trust level (-1 to 1)
  relationships: Map<string, Relationship>;

  // Goals and motivations
  shortTermGoals: Goal[];
  longTermGoals: Goal[];
  ideology: Ideology;

  // Speech patterns
  vocabulary: VocabularyStyle;
  catchphrases: string[];
  topics: Map<string, Opinion>;         // What they think about various topics

  // Memory
  memories: Memory[];
  knownRumors: Rumor[];

  // Physical/mental state
  health: number;                       // 0-1
  sanity: number;                       // 0-1
  addiction?: string;
  trauma?: string[];
}

export interface NPCBackground {
  origin: string;                       // Where they're from
  occupation: string;
  pastOccupations: string[];
  education: string;
  familyStatus: string;
  majorLifeEvents: string[];
  reputation: number;                   // -1 to 1
  wealth: number;                       // 0-1
  criminalRecord: boolean;
  militaryService: boolean;
}

export enum Mood {
  ECSTATIC = 'ECSTATIC',
  HAPPY = 'HAPPY',
  CONTENT = 'CONTENT',
  NEUTRAL = 'NEUTRAL',
  UNEASY = 'UNEASY',
  ANGRY = 'ANGRY',
  TERRIFIED = 'TERRIFIED',
  DEPRESSED = 'DEPRESSED',
  MANIC = 'MANIC'
}

export interface Goal {
  description: string;
  priority: number;                     // 0-1
  progress: number;                     // 0-1
  deadline?: number;
  onCompletion: string;
  onFailure: string;
}

export interface Ideology {
  economic: number;                     // -1 (communist) to 1 (capitalist)
  authoritarian: number;                // -1 (libertarian) to 1 (authoritarian)
  militarism: number;                   // 0-1
  xenophobia: number;                   // 0-1
  environmentalism: number;             // 0-1
  technoOptimism: number;               // 0-1
  factionLoyalty: Map<string, number>;  // Faction ID -> loyalty (-1 to 1)
}

export enum VocabularyStyle {
  ELOQUENT = 'ELOQUENT',
  TECHNICAL = 'TECHNICAL',
  SLANG = 'SLANG',
  FORMAL = 'FORMAL',
  TERSE = 'TERSE',
  POETIC = 'POETIC',
  CRUDE = 'CRUDE',
  CRYPTIC = 'CRYPTIC'
}

export interface Opinion {
  subject: string;
  stance: number;                       // -1 (strongly against) to 1 (strongly for)
  conviction: number;                   // 0-1 (how strongly held)
  reasoning: string;
  willingToDiscuss: boolean;
}

export interface Memory {
  timestamp: number;
  event: string;
  emotionalImpact: number;              // -1 to 1
  participants: string[];
  importance: number;                   // 0-1
  reliability: number;                  // 0-1 (memories fade/distort)
}

export interface Rumor {
  id: string;
  content: string;
  truthValue: number;                   // 0-1
  source: string;
  timestamp: number;
  spreadCount: number;
}

export interface Relationship {
  target: string;                       // Entity ID
  type: RelationType;
  strength: number;                     // 0-1
  history: string[];
}

export enum RelationType {
  FAMILY = 'FAMILY',
  FRIEND = 'FRIEND',
  ALLY = 'ALLY',
  RIVAL = 'RIVAL',
  ENEMY = 'ENEMY',
  ROMANTIC = 'ROMANTIC',
  MENTOR = 'MENTOR',
  STUDENT = 'STUDENT',
  BUSINESS = 'BUSINESS',
  STRANGER = 'STRANGER'
}

/**
 * NPC decision-making and behavior
 */
export interface NPCBehavior {
  currentAction: Action;
  actionQueue: Action[];
  routines: Routine[];
  emergencyProtocols: Map<EmergencyType, Action[]>;
}

export interface Action {
  type: string;
  target?: string;
  parameters: Map<string, any>;
  startTime: number;
  duration: number;
  cancellable: boolean;
  onComplete?: () => void;
  onInterrupt?: () => void;
}

export interface Routine {
  name: string;
  schedule: Schedule;
  actions: Action[];
  priority: number;
}

export interface Schedule {
  startTime: number;                    // Seconds since day start
  endTime: number;
  daysOfWeek?: number[];                // Optional day restriction
}

export enum EmergencyType {
  HULL_BREACH = 'HULL_BREACH',
  FIRE = 'FIRE',
  HOSTILE_CONTACT = 'HOSTILE_CONTACT',
  SYSTEM_FAILURE = 'SYSTEM_FAILURE',
  MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY',
  EVACUATION = 'EVACUATION'
}

/**
 * Dialogue system
 */
export interface DialogueContext {
  speaker: string;
  listener: string;
  location: string;
  recentEvents: string[];
  speakerMood: Mood;
  listenerMood: Mood;
  relationship: Relationship | null;
}

export interface DialogueResponse {
  text: string;
  tone: DialogueTone;
  revealInformation: boolean;
  effectOnRelationship: number;          // -1 to 1
  triggersEvent?: string;
}

export enum DialogueTone {
  FRIENDLY = 'FRIENDLY',
  HOSTILE = 'HOSTILE',
  FEARFUL = 'FEARFUL',
  FORMAL = 'FORMAL',
  CASUAL = 'CASUAL',
  SARCASTIC = 'SARCASTIC',
  CRYPTIC = 'CRYPTIC',
  FLIRTATIOUS = 'FLIRTATIOUS',
  DESPERATE = 'DESPERATE'
}

/**
 * NPC Personality Generator and Manager
 */
export class NPCPersonalitySystem {
  private npcs: Map<string, NPCPersonality> = new Map();
  private behaviors: Map<string, NPCBehavior> = new Map();
  private conversationHistory: Map<string, DialogueContext[]> = new Map();

  /**
   * Generate a unique NPC personality
   */
  generateNPC(id: string, seed?: number): NPCPersonality {
    const rng = this.createRNG(seed || Math.random() * 1000000);

    const personality: NPCPersonality = {
      id,
      name: this.generateName(rng),
      callsign: this.generateCallsign(rng),
      species: this.generateSpecies(rng),
      traits: {
        openness: rng(),
        conscientiousness: rng(),
        extraversion: rng(),
        agreeableness: rng(),
        neuroticism: rng(),
        courage: rng(),
        greed: rng(),
        honor: rng(),
        curiosity: rng(),
        ruthlessness: rng()
      },
      background: this.generateBackground(rng),
      skills: this.generateSkills(rng),
      fears: this.generateFears(rng),
      desires: this.generateDesires(rng),
      secrets: this.generateSecrets(rng),
      mood: Mood.NEUTRAL,
      stress: rng() * 0.3,
      trust: new Map(),
      relationships: new Map(),
      shortTermGoals: this.generateShortTermGoals(rng),
      longTermGoals: this.generateLongTermGoals(rng),
      ideology: this.generateIdeology(rng),
      vocabulary: this.selectVocabulary(rng),
      catchphrases: this.generateCatchphrases(rng),
      topics: this.generateOpinions(rng),
      memories: [],
      knownRumors: [],
      health: 0.8 + rng() * 0.2,
      sanity: 0.7 + rng() * 0.3
    };

    // Maybe add trauma or addiction
    if (rng() < 0.2) {
      personality.trauma = this.generateTrauma(rng);
    }

    if (rng() < 0.1) {
      personality.addiction = this.generateAddiction(rng);
    }

    this.npcs.set(id, personality);

    // Initialize behavior
    this.behaviors.set(id, this.generateBehavior(personality, rng));

    return personality;
  }

  /**
   * Generate dialogue based on context
   */
  generateDialogue(
    speakerId: string,
    listenerId: string,
    context: Partial<DialogueContext> = {}
  ): DialogueResponse {
    const speaker = this.npcs.get(speakerId);
    const listener = this.npcs.get(listenerId);

    if (!speaker || !listener) {
      return {
        text: "...",
        tone: DialogueTone.CASUAL,
        revealInformation: false,
        effectOnRelationship: 0
      };
    }

    // Build full context
    const fullContext: DialogueContext = {
      speaker: speakerId,
      listener: listenerId,
      location: context.location || 'unknown',
      recentEvents: context.recentEvents || [],
      speakerMood: speaker.mood,
      listenerMood: listener.mood,
      relationship: speaker.relationships.get(listenerId) || null
    };

    // Determine tone based on personality and relationship
    const tone = this.determineTone(speaker, listener, fullContext);

    // Generate appropriate dialogue
    const text = this.composeDialogue(speaker, listener, tone, fullContext);

    // Calculate relationship effect
    const relationshipEffect = this.calculateRelationshipEffect(speaker, listener, tone);

    return {
      text,
      tone,
      revealInformation: this.shouldRevealInfo(speaker, listener),
      effectOnRelationship: relationshipEffect
    };
  }

  /**
   * NPC makes a decision
   */
  makeDecision(
    npcId: string,
    situation: Situation
  ): Action | null {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    // Evaluate situation based on personality
    const threat = this.evaluateThreat(npc, situation);
    const opportunity = this.evaluateOpportunity(npc, situation);

    // If stressed or threatened, prioritize safety
    if (threat > 0.7 || npc.stress > 0.8) {
      return this.chooseDefensiveAction(npc, situation);
    }

    // If opportunity and greedy/curious
    if (opportunity > 0.6 && (npc.traits.greed > 0.6 || npc.traits.curiosity > 0.7)) {
      return this.chooseOpportunisticAction(npc, situation);
    }

    // Check goals
    const goalAction = this.pursueGoals(npc, situation);
    if (goalAction) return goalAction;

    // Default behavior based on personality
    return this.chooseDefaultAction(npc, situation);
  }

  /**
   * Update NPC state
   */
  update(npcId: string, deltaTime: number): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    // Update mood based on events and personality
    this.updateMood(npc, deltaTime);

    // Decay stress
    npc.stress = Math.max(0, npc.stress - deltaTime / 3600 * 0.1);

    // Update memories (some fade)
    for (const memory of npc.memories) {
      memory.reliability *= 0.9999; // Very slow decay
    }

    // Update goals
    this.updateGoals(npc);
  }

  /**
   * NPC reacts to event
   */
  reactToEvent(npcId: string, event: GameEvent): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    // Create memory
    const memory: Memory = {
      timestamp: Date.now(),
      event: event.description,
      emotionalImpact: this.calculateEmotionalImpact(npc, event),
      participants: event.participants,
      importance: event.significance,
      reliability: 1.0
    };

    npc.memories.push(memory);

    // Update mood
    if (memory.emotionalImpact > 0.5) {
      npc.mood = Mood.HAPPY;
    } else if (memory.emotionalImpact < -0.5) {
      npc.mood = Mood.ANGRY;
    }

    // Update stress
    if (event.type === 'combat' || event.type === 'disaster') {
      npc.stress = Math.min(1, npc.stress + 0.3);
    }

    // Update relationships
    for (const participant of event.participants) {
      if (participant !== npcId) {
        this.updateRelationship(npc, participant, memory.emotionalImpact);
      }
    }
  }

  // === Helper Methods ===

  private createRNG(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  private generateName(rng: () => number): string {
    const first = ['Alex', 'Morgan', 'Jordan', 'Casey', 'Riley', 'Quinn', 'Skylar', 'Reese', 'Zara', 'Kiran'];
    const last = ['Chen', 'O\'Brien', 'Nakamura', 'Okafor', 'Rodriguez', 'Singh', 'Al-Rashid', 'Kowalski'];
    return `${this.pick(first, rng)} ${this.pick(last, rng)}`;
  }

  private generateCallsign(rng: () => number): string {
    const adjectives = ['Razor', 'Ghost', 'Viper', 'Nomad', 'Falcon', 'Shadow', 'Storm', 'Ace'];
    const numbers = Math.floor(rng() * 99) + 1;
    return rng() > 0.5 ? this.pick(adjectives, rng) : `${this.pick(adjectives, rng)}-${numbers}`;
  }

  private generateSpecies(rng: () => number): string {
    const species = ['Human', 'Cyborg', 'Android', 'Uplifted', 'Gene-Modded'];
    return this.pick(species, rng);
  }

  private generateBackground(rng: () => number): NPCBackground {
    const occupations = ['Pilot', 'Engineer', 'Trader', 'Mercenary', 'Scientist', 'Doctor', 'Navigator', 'Gunner'];
    const origins = ['Earth Colony', 'Mars', 'Belt Station', 'Deep Space Habitat', 'Unknown'];

    return {
      origin: this.pick(origins, rng),
      occupation: this.pick(occupations, rng),
      pastOccupations: [this.pick(occupations, rng)],
      education: rng() > 0.5 ? 'Formal Academy' : 'Self-Taught',
      familyStatus: rng() > 0.7 ? 'Family Alive' : 'Orphan',
      majorLifeEvents: this.generateLifeEvents(rng),
      reputation: rng() * 2 - 1,
      wealth: rng(),
      criminalRecord: rng() < 0.2,
      militaryService: rng() < 0.4
    };
  }

  private generateLifeEvents(rng: () => number): string[] {
    const events = [
      'Survived ship disaster',
      'Lost loved one',
      'Made fortune trading',
      'Betrayed by friend',
      'Discovered ancient artifact',
      'Witnessed war crime',
      'Saved a life',
      'Killed in self-defense'
    ];

    const numEvents = Math.floor(rng() * 3) + 1;
    const selected: string[] = [];
    for (let i = 0; i < numEvents; i++) {
      selected.push(this.pick(events, rng));
    }
    return selected;
  }

  private generateSkills(rng: () => number): Map<string, number> {
    const skills = new Map<string, number>();
    const skillNames = ['Piloting', 'Combat', 'Engineering', 'Negotiation', 'Stealth', 'Medicine', 'Science'];

    for (const skill of skillNames) {
      skills.set(skill, rng());
    }

    return skills;
  }

  private generateFears(rng: () => number): string[] {
    const fears = ['Death', 'Isolation', 'Failure', 'Betrayal', 'The Void', 'AI', 'Aliens'];
    return [this.pick(fears, rng)];
  }

  private generateDesires(rng: () => number): string[] {
    const desires = ['Wealth', 'Power', 'Knowledge', 'Peace', 'Revenge', 'Family', 'Freedom', 'Glory'];
    return [this.pick(desires, rng)];
  }

  private generateSecrets(rng: () => number): string[] {
    if (rng() < 0.7) return [];

    const secrets = [
      'Committed war crime',
      'Is a spy',
      'Sabotaged previous ship',
      'Knows location of treasure',
      'Is hiding their identity',
      'Made deal with criminals',
      'Knows about government conspiracy'
    ];

    return [this.pick(secrets, rng)];
  }

  private generateShortTermGoals(rng: () => number): Goal[] {
    const goals = ['Make credits', 'Repair ship', 'Find crew', 'Deliver cargo', 'Avoid authorities'];
    return [{
      description: this.pick(goals, rng),
      priority: rng(),
      progress: 0,
      onCompletion: 'Satisfied',
      onFailure: 'Frustrated'
    }];
  }

  private generateLongTermGoals(rng: () => number): Goal[] {
    const goals = ['Own a fleet', 'Find lost family', 'Retire wealthy', 'Discover alien tech', 'Build a legacy'];
    return [{
      description: this.pick(goals, rng),
      priority: rng(),
      progress: 0,
      onCompletion: 'Life fulfilled',
      onFailure: 'Regret'
    }];
  }

  private generateIdeology(rng: () => number): Ideology {
    return {
      economic: rng() * 2 - 1,
      authoritarian: rng() * 2 - 1,
      militarism: rng(),
      xenophobia: rng(),
      environmentalism: rng(),
      technoOptimism: rng(),
      factionLoyalty: new Map()
    };
  }

  private selectVocabulary(rng: () => number): VocabularyStyle {
    const styles = Object.values(VocabularyStyle);
    return styles[Math.floor(rng() * styles.length)] as VocabularyStyle;
  }

  private generateCatchphrases(rng: () => number): string[] {
    const phrases = [
      "That's the way the void spins",
      "Not my first solar flare",
      "Stars guide us",
      "Reactor's running hot",
      "All in a day's burn",
      "By the cosmos",
      "Like my old captain used to say..."
    ];

    return [this.pick(phrases, rng)];
  }

  private generateOpinions(rng: () => number): Map<string, Opinion> {
    const topics = ['AI Rights', 'Terraforming', 'FTL Research', 'Corporate Rule', 'Alien Contact'];
    const opinions = new Map<string, Opinion>();

    for (const topic of topics) {
      opinions.set(topic, {
        subject: topic,
        stance: rng() * 2 - 1,
        conviction: rng(),
        reasoning: 'Based on personal experience',
        willingToDiscuss: rng() > 0.3
      });
    }

    return opinions;
  }

  private generateTrauma(rng: () => number): string[] {
    const traumas = ['Combat PTSD', 'Survivor guilt', 'Trust issues', 'Claustrophobia'];
    return [this.pick(traumas, rng)];
  }

  private generateAddiction(rng: () => number): string {
    const addictions = ['Stims', 'Alcohol', 'VR', 'Gambling'];
    return this.pick(addictions, rng);
  }

  private generateBehavior(npc: NPCPersonality, rng: () => number): NPCBehavior {
    return {
      currentAction: { type: 'idle', parameters: new Map(), startTime: 0, duration: 0, cancellable: true },
      actionQueue: [],
      routines: [],
      emergencyProtocols: new Map()
    };
  }

  private determineTone(speaker: NPCPersonality, listener: NPCPersonality, context: DialogueContext): DialogueTone {
    const relationship = context.relationship;

    if (relationship?.type === RelationType.ENEMY) return DialogueTone.HOSTILE;
    if (speaker.mood === Mood.TERRIFIED) return DialogueTone.FEARFUL;
    if (speaker.traits.extraversion > 0.7) return DialogueTone.FRIENDLY;
    if (speaker.vocabulary === VocabularyStyle.FORMAL) return DialogueTone.FORMAL;

    return DialogueTone.CASUAL;
  }

  private composeDialogue(speaker: NPCPersonality, listener: NPCPersonality, tone: DialogueTone, context: DialogueContext): string {
    const templates: Record<DialogueTone, string[]> = {
      [DialogueTone.FRIENDLY]: [
        `Hey there, ${listener.name}! How's it going?`,
        `Good to see you, friend.`,
        `Always a pleasure running into you.`
      ],
      [DialogueTone.HOSTILE]: [
        `You again. What do you want?`,
        `Stay out of my way.`,
        `I've got nothing to say to you.`
      ],
      [DialogueTone.FEARFUL]: [
        `P-please, I don't want any trouble...`,
        `Just... just leave me alone!`,
        `Don't hurt me!`
      ],
      [DialogueTone.FORMAL]: [
        `Greetings, ${listener.callsign}.`,
        `I trust you are well?`,
        `Might I have a moment of your time?`
      ],
      [DialogueTone.CASUAL]: [
        `What's up?`,
        `Hey.`,
        `Yeah?`
      ],
      [DialogueTone.SARCASTIC]: [
        `Oh, wonderful. You.`,
        `This should be good.`,
        `Let me guess...`
      ],
      [DialogueTone.CRYPTIC]: [
        `The stars whisper secrets...`,
        `You seek answers. But are you ready for them?`,
        `Not all truths are meant to be spoken.`
      ],
      [DialogueTone.FLIRTATIOUS]: [
        `Well hello there...`,
        `I was hoping I'd run into you.`,
        `You know, we make a good team.`
      ],
      [DialogueTone.DESPERATE]: [
        `Please, I need your help!`,
        `You have to listen to me!`,
        `This is urgent!`
      ]
    };

    const options = templates[tone];
    const selected = options[Math.floor(Math.random() * options.length)];

    // Maybe add catchphrase
    if (Math.random() > 0.8 && speaker.catchphrases.length > 0) {
      return `${selected} ${speaker.catchphrases[0]}.`;
    }

    return selected;
  }

  private calculateRelationshipEffect(speaker: NPCPersonality, listener: NPCPersonality, tone: DialogueTone): number {
    const toneEffects: Record<DialogueTone, number> = {
      [DialogueTone.FRIENDLY]: 0.1,
      [DialogueTone.HOSTILE]: -0.2,
      [DialogueTone.FEARFUL]: -0.1,
      [DialogueTone.FORMAL]: 0.05,
      [DialogueTone.CASUAL]: 0.02,
      [DialogueTone.SARCASTIC]: -0.05,
      [DialogueTone.CRYPTIC]: 0,
      [DialogueTone.FLIRTATIOUS]: 0.15,
      [DialogueTone.DESPERATE]: -0.05
    };

    return toneEffects[tone];
  }

  private shouldRevealInfo(speaker: NPCPersonality, listener: NPCPersonality): boolean {
    const trust = speaker.trust.get(listener.id) || 0;
    return trust > 0.5 && speaker.traits.openness > 0.6;
  }

  private evaluateThreat(npc: NPCPersonality, situation: Situation): number {
    // Simple threat evaluation
    return situation.hostiles * 0.5 + (1 - npc.traits.courage) * 0.5;
  }

  private evaluateOpportunity(npc: NPCPersonality, situation: Situation): number {
    return situation.reward * npc.traits.greed;
  }

  private chooseDefensiveAction(npc: NPCPersonality, situation: Situation): Action {
    return {
      type: 'flee',
      parameters: new Map(),
      startTime: Date.now(),
      duration: 10000,
      cancellable: false
    };
  }

  private chooseOpportunisticAction(npc: NPCPersonality, situation: Situation): Action {
    return {
      type: 'investigate',
      parameters: new Map([['target', situation.interestPoint]]),
      startTime: Date.now(),
      duration: 5000,
      cancellable: true
    };
  }

  private pursueGoals(npc: NPCPersonality, situation: Situation): Action | null {
    const highestPriorityGoal = npc.shortTermGoals.sort((a, b) => b.priority - a.priority)[0];

    if (highestPriorityGoal && highestPriorityGoal.progress < 1.0) {
      // Convert goal to action (simplified)
      return {
        type: 'pursue_goal',
        parameters: new Map([['goal', highestPriorityGoal.description]]),
        startTime: Date.now(),
        duration: 1000,
        cancellable: true
      };
    }

    return null;
  }

  private chooseDefaultAction(npc: NPCPersonality, situation: Situation): Action {
    // Wander, socialize, or idle based on personality
    if (npc.traits.extraversion > 0.7 && Math.random() > 0.5) {
      return {
        type: 'socialize',
        parameters: new Map(),
        startTime: Date.now(),
        duration: 3000,
        cancellable: true
      };
    }

    return {
      type: 'idle',
      parameters: new Map(),
      startTime: Date.now(),
      duration: 1000,
      cancellable: true
    };
  }

  private updateMood(npc: NPCPersonality, deltaTime: number): void {
    // Mood gradually returns to neutral
    if (npc.mood === Mood.HAPPY || npc.mood === Mood.ANGRY) {
      if (Math.random() < deltaTime / 3600) {
        npc.mood = Mood.NEUTRAL;
      }
    }

    // High stress affects mood
    if (npc.stress > 0.8) {
      npc.mood = Mood.TERRIFIED;
    }
  }

  private updateGoals(npc: NPCPersonality): void {
    // Remove completed goals
    npc.shortTermGoals = npc.shortTermGoals.filter(g => g.progress < 1.0);
    npc.longTermGoals = npc.longTermGoals.filter(g => g.progress < 1.0);
  }

  private calculateEmotionalImpact(npc: NPCPersonality, event: GameEvent): number {
    if (event.type === 'success') return 0.5;
    if (event.type === 'failure') return -0.5;
    if (event.type === 'combat') return -0.3;
    if (event.type === 'discovery') return 0.7 * npc.traits.curiosity;
    return 0;
  }

  private updateRelationship(npc: NPCPersonality, targetId: string, emotionalImpact: number): void {
    const existing = npc.relationships.get(targetId);

    if (existing) {
      existing.strength += emotionalImpact * 0.1;
      existing.strength = Math.max(-1, Math.min(1, existing.strength));
    } else {
      npc.relationships.set(targetId, {
        target: targetId,
        type: RelationType.STRANGER,
        strength: emotionalImpact * 0.1,
        history: []
      });
    }
  }

  private pick<T>(array: T[], rng: () => number): T {
    return array[Math.floor(rng() * array.length)];
  }

  // Public API
  getNPC(id: string): NPCPersonality | undefined {
    return this.npcs.get(id);
  }

  getAllNPCs(): NPCPersonality[] {
    return Array.from(this.npcs.values());
  }
}

// Supporting interfaces
export interface Situation {
  location: string;
  hostiles: number;
  reward: number;
  interestPoint?: string;
}

export interface GameEvent {
  type: string;
  description: string;
  participants: string[];
  significance: number;
}
