/**
 * Enhanced RumorPropagationSystem - Sophisticated information distortion
 *
 * Advanced features:
 * - Context-aware distortions
 * - Social network propagation modeling
 * - Belief propagation based on source trust
 * - Rumor mutations and variants
 * - Fact-checking mechanics
 */

import { NewsArticle } from './NewsGenerationEngine';
import { ContentGenerator } from './ContentGenerationLibrary';

export interface Rumor {
  id: string;
  originalSource: string;           // Original event/news ID
  currentVersion: string;            // Current text (may be distorted)
  originalVersion: string;           // Original text
  truthValue: number;                // 0-1 (1 = completely true)

  // Propagation
  originLocation: string;            // System/station ID where it started
  currentLocations: Set<string>;     // Where it's currently known
  hops: number;                      // Number of relay hops
  spreadRate: number;                // How fast it spreads (0-1)

  // Distortion
  distortions: DistortionRecord[];
  exaggerationLevel: number;         // 0-10 (how much exaggerated)
  credibility: number;               // 0-1 (how believable)

  // Social dynamics
  heardBy: Set<string>;              // Entity IDs who know this
  believedBy: Set<string>;           // Entity IDs who believe it
  challengedBy: Set<string>;         // Entity IDs who dispute it
  amplifiedBy: Set<string>;          // Entity IDs spreading it actively

  // Metadata
  createdAt: number;
  lastSpread: number;
  variants: RumorVariant[];          // Different versions
  factChecks: FactCheck[];           // Attempts to verify

  // Classification
  category: RumorCategory;
  tags: string[];
  emotionalTone: EmotionalTone;
}

export interface RumorVariant {
  id: string;
  version: string;
  createdAt: number;
  location: string;
  believability: number;
}

export interface FactCheck {
  timestamp: number;
  checker: string;
  conclusion: 'TRUE' | 'MOSTLY_TRUE' | 'MIXED' | 'MOSTLY_FALSE' | 'FALSE' | 'UNVERIFIABLE';
  evidence: string;
  impact: number;                    // How much this affected belief
}

export type EmotionalTone = 'NEUTRAL' | 'FEARFUL' | 'HOPEFUL' | 'ANGRY' | 'EXCITING' | 'TRAGIC';

export type RumorCategory =
  | 'FACT'              // True information
  | 'EXAGGERATION'      // Based on truth but blown out of proportion
  | 'DISTORTION'        // Misunderstood or misremembered
  | 'FABRICATION'       // Completely made up
  | 'CONSPIRACY'        // Elaborate false narrative
  | 'PROPAGANDA';       // Deliberate misinformation

export interface DistortionRecord {
  hop: number;
  location: string;
  distortionType: DistortionType;
  before: string;
  after: string;
  timestamp: number;
  reliability: number;               // Reliability of node that caused distortion
}

export type DistortionType =
  | 'EXAGGERATION'      // Numbers get bigger
  | 'MINIMIZATION'      // Numbers get smaller
  | 'SUBSTITUTION'      // Details change
  | 'ADDITION'          // New details added
  | 'OMISSION'          // Details removed
  | 'REVERSAL'          // Meaning flipped
  | 'EMBELLISHMENT'     // Made more dramatic
  | 'SIMPLIFICATION'    // Nuance removed
  | 'PERSONALIZATION'   // Made more personal/relatable
  | 'POLARIZATION';     // Made more extreme

export interface RumorNode {
  id: string;                        // Station/system ID
  reliability: number;               // 0-1 (how accurately they relay)
  connections: string[];             // Connected nodes
  connectionStrength: Map<string, number>; // How strong each connection
  rumorBuffer: Rumor[];              // Rumors known here
  propagationDelay: number;          // Seconds before relay
  factCheckProbability: number;      // Chance to fact-check
  amplificationBias: number;         // Tendency to amplify (-1 to 1)
}

export interface PropagationResult {
  success: boolean;
  rumor: Rumor | null;
  distorted: boolean;
  distortionType?: DistortionType;
  believersGained: number;
}

export class RumorPropagationSystem {
  private rumors: Map<string, Rumor> = new Map();
  private nodes: Map<string, RumorNode> = new Map();
  private contentGen: ContentGenerator;

  // Configuration
  private readonly BASE_DISTORTION_CHANCE = 0.15;
  private readonly EXAGGERATION_MULTIPLIER_MIN = 1.3;
  private readonly EXAGGERATION_MULTIPLIER_MAX = 2.5;
  private readonly MAX_HOPS = 15;
  private readonly CREDIBILITY_DECAY_BASE = 0.04;
  private readonly VIRAL_THRESHOLD = 0.8;

  constructor(seed?: number) {
    this.contentGen = new ContentGenerator(seed);
  }

  /**
   * Create rumor from news article
   */
  public createRumorFromNews(article: NewsArticle, originLocation: string): Rumor {
    const emotionalTone = this.inferEmotionalTone(article);

    const rumor: Rumor = {
      id: `rumor_${article.id}`,
      originalSource: article.id,
      currentVersion: article.summary,
      originalVersion: article.summary,
      truthValue: article.veracity,
      originLocation,
      currentLocations: new Set([originLocation]),
      hops: 0,
      spreadRate: this.calculateSpreadRate(article, emotionalTone),
      distortions: [],
      exaggerationLevel: 0,
      credibility: article.trustworthiness,
      heardBy: new Set(),
      believedBy: new Set(),
      challengedBy: new Set(),
      amplifiedBy: new Set(),
      createdAt: article.timestamp,
      lastSpread: article.timestamp,
      variants: [],
      factChecks: [],
      category: article.bias === 'PROPAGANDA' ? 'PROPAGANDA' : 'FACT',
      tags: [...article.tags],
      emotionalTone
    };

    this.rumors.set(rumor.id, rumor);
    this.addRumorToNode(originLocation, rumor);

    return rumor;
  }

  /**
   * Create fabricated rumor
   */
  public createFabrication(
    text: string,
    originLocation: string,
    category: RumorCategory = 'FABRICATION',
    emotionalTone: EmotionalTone = 'EXCITING'
  ): Rumor {
    const rumor: Rumor = {
      id: `rumor_fab_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      originalSource: 'fabricated',
      currentVersion: text,
      originalVersion: text,
      truthValue: 0,
      originLocation,
      currentLocations: new Set([originLocation]),
      hops: 0,
      spreadRate: 0.75,  // Fabrications often spread fast
      distortions: [],
      exaggerationLevel: 2,  // Start exaggerated
      credibility: 0.35,
      heardBy: new Set(),
      believedBy: new Set(),
      challengedBy: new Set(),
      amplifiedBy: new Set(),
      createdAt: Date.now() / 1000,
      lastSpread: Date.now() / 1000,
      variants: [],
      factChecks: [],
      category,
      tags: ['rumor', 'unverified', 'speculation'],
      emotionalTone
    };

    this.rumors.set(rumor.id, rumor);
    this.addRumorToNode(originLocation, rumor);

    return rumor;
  }

  /**
   * Propagate rumor from one node to another with sophisticated distortion
   */
  public propagateRumor(
    rumorId: string,
    fromNode: string,
    toNode: string
  ): PropagationResult {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) {
      return { success: false, rumor: null, distorted: false, believersGained: 0 };
    }

    // Check if already at destination
    if (rumor.currentLocations.has(toNode)) {
      return { success: false, rumor, distorted: false, believersGained: 0 };
    }

    // Check hop limit
    if (rumor.hops >= this.MAX_HOPS) {
      return { success: false, rumor, distorted: false, believersGained: 0 };
    }

    // Get node properties
    const sourceNode = this.nodes.get(fromNode);
    const destNode = this.nodes.get(toNode);
    const reliability = sourceNode?.reliability || 0.7;
    const connectionStrength = sourceNode?.connectionStrength.get(toNode) || 0.5;

    // Calculate distortion probability
    const distortionChance = this.calculateDistortionChance(rumor, reliability, connectionStrength);

    let distorted = false;
    let distortionType: DistortionType | undefined;

    // Apply distortion
    if (Math.random() < distortionChance) {
      distortionType = this.selectDistortionType(rumor, destNode);
      const distortionResult = this.applyDistortion(rumor, toNode, reliability, distortionType);

      rumor.currentVersion = distortionResult.newVersion;
      rumor.distortions.push(distortionResult.record);
      rumor.truthValue *= distortionResult.truthDecay;
      rumor.exaggerationLevel += distortionResult.exaggerationIncrease;

      // Update category based on distortion
      rumor.category = this.recategorizeRumor(rumor);

      distorted = true;

      // Maybe create variant
      if (distortionResult.significant && Math.random() < 0.3) {
        this.createVariant(rumor, toNode);
      }
    }

    // Update rumor propagation
    rumor.hops++;
    rumor.currentLocations.add(toNode);
    rumor.lastSpread = Date.now() / 1000;

    // Decay credibility based on hops and reliability
    const decayRate = this.CREDIBILITY_DECAY_BASE * (1 + rumor.hops * 0.1) * (1 - reliability);
    rumor.credibility *= (1 - decayRate);

    // Add to destination node
    this.addRumorToNode(toNode, rumor);

    // Simulate belief propagation at destination
    const believersGained = this.simulateBeliefPropagation(rumor, toNode);

    // Update in storage
    this.rumors.set(rumorId, rumor);

    return {
      success: true,
      rumor,
      distorted,
      distortionType,
      believersGained
    };
  }

  /**
   * Spread rumor through entire network from source
   */
  public spreadToNetwork(rumorId: string, fromNode: string): PropagationResult[] {
    const node = this.nodes.get(fromNode);
    if (!node) return [];

    const results: PropagationResult[] = [];

    for (const connectedNode of node.connections) {
      const rumor = this.rumors.get(rumorId);
      if (!rumor) continue;

      // Probability of spread based on rumor properties and connection strength
      const connectionStrength = node.connectionStrength.get(connectedNode) || 0.5;
      const spreadChance = rumor.spreadRate * connectionStrength;

      if (Math.random() < spreadChance) {
        const result = this.propagateRumor(rumorId, fromNode, connectedNode);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Entity hears rumor and decides whether to believe it
   */
  public entityHearsRumor(
    entityId: string,
    rumorId: string,
    sourceTrust: number = 0.5,
    skepticism: number = 0.5
  ): {
    heard: boolean;
    believed: boolean;
    willAmplify: boolean;
  } {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) {
      return { heard: false, believed: false, willAmplify: false };
    }

    rumor.heardBy.add(entityId);

    // Calculate belief probability
    const baseBeliefChance = rumor.credibility * sourceTrust * (1 - skepticism);

    // Emotional tone affects belief
    const emotionalMultiplier = this.getEmotionalBeliefMultiplier(rumor.emotionalTone);
    const beliefChance = baseBeliefChance * emotionalMultiplier;

    const believed = Math.random() < beliefChance;

    if (believed) {
      rumor.believedBy.add(entityId);

      // Will they amplify (spread it further)?
      const amplifyChance = beliefChance * rumor.spreadRate;
      const willAmplify = Math.random() < amplifyChance;

      if (willAmplify) {
        rumor.amplifiedBy.add(entityId);
      }

      return { heard: true, believed: true, willAmplify };
    } else {
      // Might challenge it
      if (Math.random() < skepticism * 0.3) {
        rumor.challengedBy.add(entityId);
      }

      return { heard: true, believed: false, willAmplify: false };
    }
  }

  /**
   * Fact-check a rumor
   */
  public factCheck(
    rumorId: string,
    checker: string,
    hasAccess: boolean = false
  ): FactCheck {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) {
      return {
        timestamp: Date.now() / 1000,
        checker,
        conclusion: 'UNVERIFIABLE',
        evidence: 'Rumor not found',
        impact: 0
      };
    }

    // Determine conclusion based on truth value and access to information
    let conclusion: FactCheck['conclusion'];

    if (hasAccess) {
      // With access to truth, can determine accurately
      if (rumor.truthValue >= 0.9) conclusion = 'TRUE';
      else if (rumor.truthValue >= 0.7) conclusion = 'MOSTLY_TRUE';
      else if (rumor.truthValue >= 0.5) conclusion = 'MIXED';
      else if (rumor.truthValue >= 0.3) conclusion = 'MOSTLY_FALSE';
      else conclusion = 'FALSE';
    } else {
      // Without access, must infer from credibility signals
      if (rumor.credibility >= 0.8 && rumor.distortions.length === 0) conclusion = 'MOSTLY_TRUE';
      else if (rumor.category === 'FABRICATION') conclusion = 'MOSTLY_FALSE';
      else if (rumor.distortions.length > 5) conclusion = 'MOSTLY_FALSE';
      else conclusion = 'MIXED';
    }

    const evidence = this.generateFactCheckEvidence(rumor, conclusion);

    // Calculate impact on belief
    let impact = 0;
    const beforeBelievers = rumor.believedBy.size;

    if (conclusion === 'FALSE' || conclusion === 'MOSTLY_FALSE') {
      // Remove some believers
      const toRemove = Math.floor(rumor.believedBy.size * 0.3);
      const believers = Array.from(rumor.believedBy);

      for (let i = 0; i < toRemove; i++) {
        rumor.believedBy.delete(believers[i]);
        rumor.challengedBy.add(believers[i]);
      }

      rumor.credibility *= 0.5;
      impact = beforeBelievers - rumor.believedBy.size;
    } else if (conclusion === 'TRUE' || conclusion === 'MOSTLY_TRUE') {
      // Might gain believers
      impact = Math.floor(rumor.heardBy.size * 0.1);
      rumor.credibility *= 1.2;
      rumor.credibility = Math.min(1, rumor.credibility);
    }

    const factCheck: FactCheck = {
      timestamp: Date.now() / 1000,
      checker,
      conclusion,
      evidence,
      impact
    };

    rumor.factChecks.push(factCheck);
    this.rumors.set(rumorId, rumor);

    return factCheck;
  }

  /**
   * Update rumor propagation over time
   */
  public update(deltaTime: number): void {
    const currentTime = Date.now() / 1000;

    for (const rumor of this.rumors.values()) {
      // Auto-spread to connected nodes periodically
      for (const location of rumor.currentLocations) {
        const timeSinceLastSpread = currentTime - rumor.lastSpread;

        // Viral rumors spread faster
        const spreadInterval = rumor.spreadRate > this.VIRAL_THRESHOLD ? 180 : 300;

        if (timeSinceLastSpread > spreadInterval) {
          this.spreadToNetwork(rumor.id, location);
        }
      }

      // Age-based credibility decay
      const age = currentTime - rumor.createdAt;
      if (age > 86400) {  // Older than 1 day
        rumor.credibility *= 0.995;
      }

      // Controversy increases spread
      if (rumor.challengedBy.size > rumor.believedBy.size * 0.3) {
        rumor.spreadRate *= 1.1;
        rumor.spreadRate = Math.min(1, rumor.spreadRate);
      }
    }
  }

  // ====================================================================
  // PRIVATE METHODS - DISTORTION
  // ====================================================================

  private calculateDistortionChance(
    rumor: Rumor,
    reliability: number,
    connectionStrength: number
  ): number {
    let chance = this.BASE_DISTORTION_CHANCE;

    // Lower reliability = more distortion
    chance += (1 - reliability) * 0.3;

    // Weak connections = more distortion
    chance += (1 - connectionStrength) * 0.2;

    // More hops = more distortion
    chance += rumor.hops * 0.03;

    // Already distorted rumors distort more
    chance += rumor.distortions.length * 0.02;

    // Emotional rumors distort more
    if (rumor.emotionalTone !== 'NEUTRAL') {
      chance += 0.1;
    }

    return Math.min(0.8, chance);
  }

  private selectDistortionType(rumor: Rumor, node?: RumorNode): DistortionType {
    const types: DistortionType[] = [
      'EXAGGERATION',
      'MINIMIZATION',
      'SUBSTITUTION',
      'ADDITION',
      'OMISSION',
      'EMBELLISHMENT',
      'SIMPLIFICATION',
      'PERSONALIZATION',
      'POLARIZATION'
    ];

    // Context-based selection
    if (rumor.emotionalTone === 'FEARFUL' || rumor.emotionalTone === 'ANGRY') {
      // Fear and anger lead to polarization and exaggeration
      if (Math.random() < 0.4) return 'POLARIZATION';
      if (Math.random() < 0.3) return 'EXAGGERATION';
    }

    if (rumor.spreadRate > 0.7) {
      // Viral content gets embellished and simplified
      if (Math.random() < 0.35) return 'EMBELLISHMENT';
      if (Math.random() < 0.25) return 'SIMPLIFICATION';
    }

    if (rumor.hops > 5) {
      // After many hops, details get lost
      if (Math.random() < 0.4) return 'OMISSION';
      if (Math.random() < 0.3) return 'SIMPLIFICATION';
    }

    if (node && node.amplificationBias > 0.5) {
      // Amplification-biased nodes exaggerate
      return 'EXAGGERATION';
    } else if (node && node.amplificationBias < -0.5) {
      // Minimization-biased nodes downplay
      return 'MINIMIZATION';
    }

    return this.contentGen.pick(types);
  }

  private applyDistortion(
    rumor: Rumor,
    toNode: string,
    reliability: number,
    type: DistortionType
  ): {
    newVersion: string;
    record: DistortionRecord;
    truthDecay: number;
    exaggerationIncrease: number;
    significant: boolean;
  } {
    const before = rumor.currentVersion;
    let after = before;
    let truthDecay = 0.85;
    let exaggerationIncrease = 0;
    let significant = false;

    switch (type) {
      case 'EXAGGERATION':
        after = this.exaggerateContent(before);
        truthDecay = 0.80;
        exaggerationIncrease = 1;
        significant = true;
        break;

      case 'MINIMIZATION':
        after = this.minimizeContent(before);
        truthDecay = 0.85;
        break;

      case 'SUBSTITUTION':
        after = this.substituteDetails(before, rumor.category);
        truthDecay = 0.75;
        significant = true;
        break;

      case 'ADDITION':
        after = this.addDetails(before, rumor.emotionalTone);
        truthDecay = 0.90;
        break;

      case 'OMISSION':
        after = this.removeDetails(before);
        truthDecay = 0.85;
        break;

      case 'EMBELLISHMENT':
        after = this.embellishContent(before, rumor.emotionalTone);
        truthDecay = 0.82;
        exaggerationIncrease = 0.5;
        break;

      case 'REVERSAL':
        after = this.reverseContent(before);
        truthDecay = 0.50;
        significant = true;
        break;

      case 'SIMPLIFICATION':
        after = this.simplifyContent(before);
        truthDecay = 0.88;
        break;

      case 'PERSONALIZATION':
        after = this.personalizeContent(before);
        truthDecay = 0.92;
        break;

      case 'POLARIZATION':
        after = this.polarizeContent(before, rumor.emotionalTone);
        truthDecay = 0.70;
        significant = true;
        break;
    }

    const record: DistortionRecord = {
      hop: rumor.hops,
      location: toNode,
      distortionType: type,
      before,
      after,
      timestamp: Date.now() / 1000,
      reliability
    };

    return {
      newVersion: after,
      record,
      truthDecay,
      exaggerationIncrease,
      significant
    };
  }

  // Enhanced distortion methods
  private exaggerateContent(text: string): string {
    let result = text;

    // Exaggerate numbers
    result = result.replace(/(\d+)/g, (match) => {
      const num = parseInt(match);
      const multiplier = this.EXAGGERATION_MULTIPLIER_MIN +
        Math.random() * (this.EXAGGERATION_MULTIPLIER_MAX - this.EXAGGERATION_MULTIPLIER_MIN);
      return Math.floor(num * multiplier).toString();
    });

    // Intensify adjectives
    result = result.replace(/\b(bad|terrible|good|great)\b/gi, (match) => {
      const intensified = {
        'bad': 'catastrophic',
        'terrible': 'apocalyptic',
        'good': 'miraculous',
        'great': 'legendary'
      };
      return intensified[match.toLowerCase() as keyof typeof intensified] || match;
    });

    return result;
  }

  private minimizeContent(text: string): string {
    let result = text;

    // Minimize numbers
    result = result.replace(/(\d+)/g, (match) => {
      const num = parseInt(match);
      const minimized = Math.floor(num / 2);
      return Math.max(1, minimized).toString();
    });

    // Soften language
    result = result.replace(/\b(destroyed|obliterated|devastated)\b/gi, 'damaged');
    result = result.replace(/\b(catastrophic|terrible)\b/gi, 'unfortunate');

    return result;
  }

  private substituteDetails(text: string, category: RumorCategory): string {
    const substitutions: Record<string, string[]> = {
      'attacked': ['ambushed', 'raided', 'struck at'],
      'destroyed': ['damaged', 'hit', 'struck'],
      'hundreds': ['dozens', 'many', 'several'],
      'station': ['facility', 'outpost', 'base'],
      'ship': ['vessel', 'craft', 'transport']
    };

    let result = text;

    for (const [original, replacements] of Object.entries(substitutions)) {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      if (regex.test(result) && Math.random() < 0.4) {
        const replacement = this.contentGen.pick(replacements);
        result = result.replace(regex, replacement);
      }
    }

    return result;
  }

  private addDetails(text: string, tone: EmotionalTone): string {
    const additions = {
      FEARFUL: [', sources fear the worst', ', panic is spreading', ', officials warn of escalation'],
      ANGRY: [', outrage is building', ', calls for retaliation grow', ', tensions are high'],
      HOPEFUL: [', there are signs of resolution', ', optimism is growing', ', positive developments expected'],
      EXCITING: [', this could change everything', ', unprecedented developments', ', historic moment'],
      TRAGIC: [', grief overwhelms survivors', ', the toll continues to rise', ', families devastated'],
      NEUTRAL: [', authorities investigating', ', more details emerging', ', situation developing']
    };

    const toneAdditions = additions[tone];
    return text + this.contentGen.pick(toneAdditions);
  }

  private removeDetails(text: string): string {
    // Remove clauses after commas or semicolons
    const parts = text.split(/[,;]/);
    return parts[0].trim();
  }

  private embellishContent(text: string, tone: EmotionalTone): string {
    const adjectives = {
      FEARFUL: ['terrifying', 'nightmarish', 'horrifying'],
      ANGRY: ['outrageous', 'unforgivable', 'shocking'],
      EXCITING: ['incredible', 'astounding', 'revolutionary'],
      TRAGIC: ['heartbreaking', 'devastating', 'catastrophic'],
      NEUTRAL: ['significant', 'notable', 'remarkable']
    };

    const toneAdjectives = adjectives[tone] || adjectives.NEUTRAL;
    const adj = this.contentGen.pick(toneAdjectives);

    // Add adjective before key nouns
    return text.replace(/\b(attack|event|incident|disaster|development)\b/i, `${adj} $1`);
  }

  private reverseContent(text: string): string {
    // Flip key verbs to opposite meaning (rare but dramatic)
    let result = text;

    const reversals: Record<string, string> = {
      'attacked': 'defended',
      'destroyed': 'saved',
      'killed': 'rescued',
      'failed': 'succeeded',
      'lost': 'won'
    };

    for (const [original, opposite] of Object.entries(reversals)) {
      result = result.replace(new RegExp(`\\b${original}\\b`, 'gi'), opposite);
    }

    return result;
  }

  private simplifyContent(text: string): string {
    // Remove complex clauses and qualifiers
    let result = text;

    // Remove parenthetical statements
    result = result.replace(/\([^)]*\)/g, '');

    // Remove qualifiers
    result = result.replace(/\b(allegedly|reportedly|apparently|supposedly)\b/gi, '');

    // Shorten to essential meaning
    const sentences = result.split('.').filter(s => s.trim());
    return sentences[0] + '.';
  }

  private personalizeContent(text: string): string {
    // Make it more personal/relatable
    const personalizations = [
      text.replace(/station/gi, 'our station'),
      text.replace(/system/gi, 'our system'),
      text + ' This affects us all.',
      text + ' We must take action.',
      text + ' People we know are involved.'
    ];

    return this.contentGen.pick(personalizations);
  }

  private polarizeContent(text: string, tone: EmotionalTone): string {
    // Make more extreme/divisive
    let result = text;

    // Add polarizing framing
    const framings = {
      FEARFUL: ['They say ', ' and it\'s only getting worse'],
      ANGRY: ['Everyone knows ', ' but nothing is being done'],
      NEUTRAL: ['The truth is ', ' despite what they tell you']
    };

    const framing = framings[tone] || framings.NEUTRAL;
    result = framing[0] + result.toLowerCase() + framing[1];

    // Intensify language
    result = result.replace(/some/gi, 'all');
    result = result.replace(/might/gi, 'will definitely');
    result = result.replace(/could/gi, 'will');

    return result;
  }

  // ====================================================================
  // PRIVATE METHODS - SOCIAL DYNAMICS
  // ====================================================================

  private simulateBeliefPropagation(rumor: Rumor, location: string): number {
    // Simulate how many entities at location believe the rumor
    const node = this.nodes.get(location);
    if (!node) return 0;

    // Estimate population at node (simplified)
    const population = 100; // Would be based on actual node data

    const beliefRate = rumor.credibility * 0.5;
    const believers = Math.floor(population * beliefRate * Math.random());

    return believers;
  }

  private createVariant(rumor: Rumor, location: string): void {
    const variant: RumorVariant = {
      id: `${rumor.id}_variant_${rumor.variants.length}`,
      version: rumor.currentVersion,
      createdAt: Date.now() / 1000,
      location,
      believability: rumor.credibility
    };

    rumor.variants.push(variant);
  }

  private generateFactCheckEvidence(rumor: Rumor, conclusion: FactCheck['conclusion']): string {
    const evidenceTemplates = {
      TRUE: [
        'Multiple independent sources confirm the core facts.',
        'Original documentation supports this account.',
        'Verified through primary sources.'
      ],
      MOSTLY_TRUE: [
        'Core facts are accurate, though some details vary.',
        'Substantiated by credible sources with minor discrepancies.',
        'Generally accurate with some exaggeration.'
      ],
      MIXED: [
        'Contains both accurate and inaccurate information.',
        'Some facts check out, others cannot be verified.',
        'Partially true but missing important context.'
      ],
      MOSTLY_FALSE: [
        'Significant distortions from the actual events.',
        'Key facts are incorrect or unsupported.',
        'Based on misunderstanding or misrepresentation.'
      ],
      FALSE: [
        'No credible evidence supports these claims.',
        'Contradicts verified facts.',
        'Appears to be fabricated.'
      ],
      UNVERIFIABLE: [
        'Insufficient evidence to determine accuracy.',
        'Sources unavailable or unreliable.',
        'Cannot confirm or deny at this time.'
      ]
    };

    const templates = evidenceTemplates[conclusion];
    return this.contentGen.pick(templates);
  }

  // ====================================================================
  // PRIVATE METHODS - UTILITY
  // ====================================================================

  private inferEmotionalTone(article: NewsArticle): EmotionalTone {
    if (article.category === 'DISASTER' || article.importance >= 9) {
      return article.tags.includes('tragedy') ? 'TRAGIC' : 'FEARFUL';
    }

    if (article.category === 'MILITARY') {
      return 'ANGRY';
    }

    if (article.category === 'SCIENCE') {
      return 'EXCITING';
    }

    if (article.bias === 'SENSATIONALIST') {
      return 'EXCITING';
    }

    return 'NEUTRAL';
  }

  private calculateSpreadRate(article: NewsArticle, tone: EmotionalTone): number {
    let rate = article.importance / 10;

    // Emotional content spreads faster
    const emotionalMultipliers: Record<EmotionalTone, number> = {
      FEARFUL: 1.4,
      ANGRY: 1.5,
      EXCITING: 1.3,
      TRAGIC: 1.2,
      HOPEFUL: 1.1,
      NEUTRAL: 1.0
    };

    rate *= emotionalMultipliers[tone];

    // Sensational news spreads faster
    if (article.bias === 'SENSATIONALIST') {
      rate *= 1.3;
    }

    return Math.min(1, rate);
  }

  private getEmotionalBeliefMultiplier(tone: EmotionalTone): number {
    const multipliers: Record<EmotionalTone, number> = {
      FEARFUL: 1.3,      // People believe fearful content more readily
      ANGRY: 1.2,
      EXCITING: 1.15,
      TRAGIC: 1.1,
      HOPEFUL: 0.95,     // Skeptical of hopeful content
      NEUTRAL: 1.0
    };

    return multipliers[tone];
  }

  private recategorizeRumor(rumor: Rumor): RumorCategory {
    if (rumor.truthValue < 0.2) return 'FABRICATION';
    if (rumor.truthValue < 0.5) return 'DISTORTION';
    if (rumor.exaggerationLevel >= 3) return 'EXAGGERATION';
    if (rumor.truthValue >= 0.8) return 'FACT';
    return 'DISTORTION';
  }

  private addRumorToNode(nodeId: string, rumor: Rumor): void {
    if (!this.nodes.has(nodeId)) {
      this.registerNode(nodeId, {
        reliability: 0.7,
        connections: [],
        factCheckProbability: 0.1,
        amplificationBias: 0
      });
    }

    const node = this.nodes.get(nodeId)!;
    if (!node.rumorBuffer.find(r => r.id === rumor.id)) {
      node.rumorBuffer.push(rumor);

      // Node might fact-check new rumors
      if (Math.random() < node.factCheckProbability) {
        setTimeout(() => {
          this.factCheck(rumor.id, nodeId, false);
        }, 1000);
      }
    }
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public registerNode(
    nodeId: string,
    config: {
      reliability: number;
      connections: string[];
      factCheckProbability?: number;
      amplificationBias?: number;
    }
  ): void {
    const connectionStrength = new Map<string, number>();

    // Initialize connection strengths
    for (const conn of config.connections) {
      connectionStrength.set(conn, 0.5 + Math.random() * 0.5); // 0.5-1.0
    }

    this.nodes.set(nodeId, {
      id: nodeId,
      reliability: config.reliability,
      connections: config.connections,
      connectionStrength,
      rumorBuffer: [],
      propagationDelay: 60,
      factCheckProbability: config.factCheckProbability || 0.05,
      amplificationBias: config.amplificationBias || 0
    });
  }

  public getRumor(id: string): Rumor | null {
    return this.rumors.get(id) || null;
  }

  public getAllRumors(): Rumor[] {
    return Array.from(this.rumors.values());
  }

  public getRumorsAt(locationId: string): Rumor[] {
    return Array.from(this.rumors.values())
      .filter(r => r.currentLocations.has(locationId));
  }

  public getStatistics(): {
    totalRumors: number;
    byCategory: Map<RumorCategory, number>;
    averageTruthValue: number;
    averageHops: number;
    averageCredibility: number;
    mostBelieved: Rumor | null;
    mostDistorted: Rumor | null;
    factChecksPerformed: number;
  } {
    const all = this.getAllRumors();
    const byCategory = new Map<RumorCategory, number>();

    let totalTruth = 0;
    let totalHops = 0;
    let totalCredibility = 0;
    let totalFactChecks = 0;
    let mostBelieved: Rumor | null = null;
    let mostDistorted: Rumor | null = null;
    let maxBelievers = 0;
    let maxDistortions = 0;

    for (const rumor of all) {
      byCategory.set(rumor.category, (byCategory.get(rumor.category) || 0) + 1);
      totalTruth += rumor.truthValue;
      totalHops += rumor.hops;
      totalCredibility += rumor.credibility;
      totalFactChecks += rumor.factChecks.length;

      if (rumor.believedBy.size > maxBelievers) {
        maxBelievers = rumor.believedBy.size;
        mostBelieved = rumor;
      }

      if (rumor.distortions.length > maxDistortions) {
        maxDistortions = rumor.distortions.length;
        mostDistorted = rumor;
      }
    }

    return {
      totalRumors: all.length,
      byCategory,
      averageTruthValue: all.length > 0 ? totalTruth / all.length : 0,
      averageHops: all.length > 0 ? totalHops / all.length : 0,
      averageCredibility: all.length > 0 ? totalCredibility / all.length : 0,
      mostBelieved,
      mostDistorted,
      factChecksPerformed: totalFactChecks
    };
  }
}
