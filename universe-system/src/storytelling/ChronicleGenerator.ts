/**
 * ChronicleGenerator - Auto-generated lore and historical narratives
 *
 * Transforms raw historical events into compelling narratives, legends,
 * and faction histories. Creates the "lore" of the universe dynamically.
 */

import { HistoricalMemorySystem, HistoricalEvent } from '../simulation/HistoricalMemorySystem';

export interface Chronicle {
  id: string;
  type: ChronicleType;
  title: string;
  narrative: string;
  timespan: { start: number; end: number };
  significance: number;              // 0-10
  perspective: 'NEUTRAL' | 'FACTION' | 'ENTITY' | 'CULTURAL';
  perspectiveId?: string;            // Faction/entity if not neutral
  sourceEvents: string[];            // Event IDs that contribute
  themes: string[];                  // e.g. 'war', 'trade', 'discovery'
  namedEntities: Map<string, string>; // entity ID -> name/title in narrative
  createdAt: number;
  causalChains?: CausalChain[];      // Identified cause-effect relationships
  patterns?: HistoricalPattern[];    // Detected patterns in this chronicle
  significance_breakdown?: {         // Detailed significance scoring
    scope: number;
    severity: number;
    consequences: number;
    uniqueness: number;
    impact: number;
  };
}

export interface CausalChain {
  cause: string;                     // Event ID
  effect: string;                    // Event ID
  strength: number;                  // 0-1 (confidence in causality)
  mechanism: string;                 // Description of how cause led to effect
  timeDelay: number;                 // Seconds between events
}

export interface HistoricalPattern {
  id: string;
  type: PatternType;
  description: string;
  events: string[];                  // Event IDs in pattern
  confidence: number;                // 0-1
  significance: number;              // 0-10
  previousOccurrences?: string[];   // IDs of similar patterns in history
}

export type PatternType =
  | 'ESCALATION'                     // Conflict escalating
  | 'CYCLE'                          // Repeating pattern
  | 'DOMINO_EFFECT'                  // Chain reaction
  | 'POWER_VACUUM'                   // Power shift creating instability
  | 'BOOM_BUST'                      // Economic cycle
  | 'REVENGE_SPIRAL'                 // Retaliatory actions
  | 'ALLIANCE_CASCADE'               // Alliances forming in response
  | 'HISTORICAL_PARALLEL';           // Similar to past events

export type ChronicleType =
  | 'WAR_CHRONICLE'           // Story of a conflict
  | 'TRADE_ERA'               // Economic period
  | 'GOLDEN_AGE'              // Period of prosperity
  | 'DARK_AGE'                // Period of decline
  | 'RISE_OF_POWER'           // Faction/entity ascendance
  | 'FALL_OF_POWER'           // Faction/entity decline
  | 'LEGENDARY_DEED'          // Single epic event
  | 'TRAGEDY'                 // Catastrophic event
  | 'DISCOVERY'               // Major scientific/exploration event
  | 'ALLIANCE_STORY'          // Formation/history of alliance
  | 'PROPHECY'                // Prediction based on trends
  | 'FOLK_TALE'               // Culturally significant story
  | 'HERO_BIOGRAPHY'          // Entity life story
  | 'FACTION_HISTORY';        // Comprehensive faction chronicle

export interface Legend {
  id: string;
  name: string;
  category: LegendCategory;
  status: 'MYTHICAL' | 'EXAGGERATED' | 'TRUE' | 'FALSE';
  basisInTruth: number;             // 0-1 (how much is real)
  narrative: string;
  moralLesson?: string;
  culturalSignificance: number;     // 0-10
  spreadRate: number;               // How fast it propagates
  believability: number;            // 0-1 (how believable)
  associatedEvents: string[];
  toldBy: string[];                 // Factions/entities that tell this
  variants: LegendVariant[];        // Different versions
}

export type LegendCategory =
  | 'HERO_TALE'
  | 'CAUTIONARY_TALE'
  | 'ORIGIN_STORY'
  | 'MONSTER_MYTH'
  | 'LOST_TREASURE'
  | 'CURSED_PLACE'
  | 'PROPHECY';

export interface LegendVariant {
  variantId: string;
  narrative: string;
  changeFromOriginal: string;
  toldBy: string;                   // Faction/cultural group
}

export interface Prophecy {
  id: string;
  proclamation: string;
  prophet: string;                  // Entity or system that made it
  createdAt: number;
  basedOnTrends: string[];          // What patterns support it
  likelihood: number;               // 0-1 (based on trend analysis)
  timeframe: { min: number; max: number };
  conditions: string[];             // What must happen for it to come true
  fulfilled: boolean;
  partiallyFulfilled: number;       // 0-1
  consequences: string[];           // If fulfilled, what happens
}

export interface FactionHistory {
  factionId: string;
  name: string;
  foundedAt: number;
  founderEntities: string[];
  eras: Era[];
  majorEvents: string[];            // Event IDs
  currentEra: string;
  culturalIdentity: string;         // Generated description
  achievements: string[];
  failures: string[];
  rivalries: Map<string, string>;   // faction -> reason
  alliances: Map<string, string>;   // faction -> reason
  narrative: string;                // Full history narrative
}

export interface Era {
  id: string;
  name: string;
  timespan: { start: number; end: number };
  type: 'FOUNDING' | 'EXPANSION' | 'GOLDEN_AGE' | 'WAR' | 'DECLINE' | 'RECOVERY';
  description: string;
  keyEvents: string[];
  significance: number;             // 0-10
}

export class ChronicleGenerator {
  private history: HistoricalMemorySystem;
  private chronicles: Map<string, Chronicle> = new Map();
  private legends: Map<string, Legend> = new Map();
  private prophecies: Map<string, Prophecy> = new Map();
  private factionHistories: Map<string, FactionHistory> = new Map();
  private patterns: Map<string, HistoricalPattern> = new Map();

  private nextChronicleId = 1;
  private nextLegendId = 1;
  private nextProphecyId = 1;
  private nextPatternId = 1;

  // Configuration for pattern recognition
  private readonly CAUSAL_TIME_WINDOW = 3600 * 24;  // 24 hours
  private readonly MIN_CAUSAL_STRENGTH = 0.3;
  private readonly PATTERN_CONFIDENCE_THRESHOLD = 0.6;

  constructor(history: HistoricalMemorySystem) {
    this.history = history;
  }

  // ====================================================================
  // CHRONICLE GENERATION
  // ====================================================================

  /**
   * Analyze events and generate chronicles
   */
  public generateChronicles(timespan?: { start: number; end: number }): Chronicle[] {
    const events = timespan
      ? this.history.queryEvents({ startTime: timespan.start, endTime: timespan.end })
      : this.history.getAllEvents();

    const newChronicles: Chronicle[] = [];

    // Look for war patterns
    newChronicles.push(...this.detectWarChronicles(events));

    // Look for economic eras
    newChronicles.push(...this.detectEconomicEras(events));

    // Look for legendary deeds
    newChronicles.push(...this.detectLegendaryDeeds(events));

    // Look for rise/fall patterns
    newChronicles.push(...this.detectPowerShifts(events));

    // Store all new chronicles
    for (const chronicle of newChronicles) {
      this.chronicles.set(chronicle.id, chronicle);
    }

    return newChronicles;
  }

  /**
   * Generate a specific chronicle from event cluster
   */
  public createChronicle(
    type: ChronicleType,
    events: HistoricalEvent[],
    perspective: Chronicle['perspective'] = 'NEUTRAL',
    perspectiveId?: string
  ): Chronicle {
    const id = `chronicle_${this.nextChronicleId++}`;

    const timespan = {
      start: Math.min(...events.map(e => e.timestamp)),
      end: Math.max(...events.map(e => e.timestamp))
    };

    // Enhanced significance calculation with breakdown
    const significance_breakdown = this.calculateDetailedSignificance(events);
    const significance = Object.values(significance_breakdown).reduce((sum, v) => sum + v, 0) / 5;

    // Analyze causal relationships
    const causalChains = this.analyzeCausalChains(events);

    // Detect historical patterns
    const patterns = this.detectPatterns(events, type);

    const themes = this.extractThemes(events);
    const namedEntities = this.buildNamedEntityMap(events);

    const narrative = this.generateNarrative(type, events, perspective, perspectiveId, namedEntities);
    const title = this.generateChronicleTitle(type, events, namedEntities);

    return {
      id,
      type,
      title,
      narrative,
      timespan,
      significance,
      perspective,
      perspectiveId,
      sourceEvents: events.map(e => e.id),
      themes,
      namedEntities,
      createdAt: Date.now() / 1000,
      causalChains,
      patterns,
      significance_breakdown
    };
  }

  // ====================================================================
  // LEGEND GENERATION
  // ====================================================================

  /**
   * Transform events into legends
   */
  public createLegend(
    event: HistoricalEvent,
    category: LegendCategory,
    exaggerationLevel: number = 0.5
  ): Legend {
    const id = `legend_${this.nextLegendId++}`;

    // Generate mythologized version
    const narrative = this.mythologizeEvent(event, category, exaggerationLevel);
    const name = this.generateLegendName(event, category);

    // Determine status based on exaggeration
    let status: Legend['status'];
    if (exaggerationLevel > 0.8) {
      status = 'MYTHICAL';
    } else if (exaggerationLevel > 0.4) {
      status = 'EXAGGERATED';
    } else {
      status = 'TRUE';
    }

    const legend: Legend = {
      id,
      name,
      category,
      status,
      basisInTruth: 1 - exaggerationLevel,
      narrative,
      moralLesson: this.generateMoralLesson(event, category),
      culturalSignificance: Math.min(10, event.severity + exaggerationLevel * 5),
      spreadRate: this.calculateLegendSpreadRate(event, exaggerationLevel),
      believability: this.calculateBelievability(event, exaggerationLevel),
      associatedEvents: [event.id],
      toldBy: event.participants.slice(0, 3),
      variants: []
    };

    this.legends.set(id, legend);
    return legend;
  }

  /**
   * Create variant of existing legend
   */
  public createLegendVariant(legendId: string, toldBy: string, changeFactor: number = 0.3): LegendVariant | null {
    const legend = this.legends.get(legendId);
    if (!legend) return null;

    const variantId = `${legendId}_var_${legend.variants.length + 1}`;

    // Modify narrative based on change factor
    const narrative = this.varyNarrative(legend.narrative, changeFactor);
    const changeDescription = this.describeChange(legend.narrative, narrative);

    const variant: LegendVariant = {
      variantId,
      narrative,
      changeFromOriginal: changeDescription,
      toldBy
    };

    legend.variants.push(variant);
    return variant;
  }

  // ====================================================================
  // PROPHECY GENERATION
  // ====================================================================

  /**
   * Generate prophecy based on current trends
   */
  public generateProphecy(prophet: string, currentTime: number): Prophecy {
    const id = `prophecy_${this.nextProphecyId++}`;

    // Analyze recent trends
    const recentEvents = this.history.queryEvents({
      startTime: currentTime - 86400,  // Last day
      endTime: currentTime
    });

    const trends = this.analyzeTrends(recentEvents);
    const proclamation = this.createProphecyText(trends);
    const likelihood = this.calculateTrendLikelihood(trends);

    return {
      id,
      proclamation,
      prophet,
      createdAt: currentTime,
      basedOnTrends: trends,
      likelihood,
      timeframe: {
        min: currentTime + 3600,       // 1 hour
        max: currentTime + 86400 * 7   // 7 days
      },
      conditions: this.identifyProphecyConditions(trends),
      fulfilled: false,
      partiallyFulfilled: 0,
      consequences: this.predictConsequences(trends)
    };
  }

  /**
   * Check if prophecy has been fulfilled
   */
  public checkProphecyFulfillment(prophecyId: string, currentTime: number): void {
    const prophecy = this.prophecies.get(prophecyId);
    if (!prophecy || prophecy.fulfilled) return;

    const recentEvents = this.history.queryEvents({
      startTime: prophecy.createdAt,
      endTime: currentTime
    });

    // Check conditions
    let fulfilledCount = 0;
    for (const condition of prophecy.conditions) {
      if (this.checkCondition(condition, recentEvents)) {
        fulfilledCount++;
      }
    }

    prophecy.partiallyFulfilled = fulfilledCount / prophecy.conditions.length;

    if (prophecy.partiallyFulfilled >= 0.8) {
      prophecy.fulfilled = true;
    }
  }

  // ====================================================================
  // FACTION HISTORY
  // ====================================================================

  /**
   * Generate comprehensive faction history
   */
  public generateFactionHistory(factionId: string, factionName: string): FactionHistory {
    // Get all events involving this faction
    const events = this.history.queryEvents({})
      .filter(e => e.participants.includes(factionId));

    if (events.length === 0) {
      // New faction, create minimal history
      return this.createNewFactionHistory(factionId, factionName);
    }

    const foundedAt = Math.min(...events.map(e => e.timestamp));
    const eras = this.identifyEras(events, factionId);

    const majorEvents = events
      .filter(e => e.severity >= 7)
      .map(e => e.id);

    const culturalIdentity = this.generateCulturalIdentity(events, factionId);
    const achievements = this.identifyAchievements(events);
    const failures = this.identifyFailures(events);
    const rivalries = this.identifyRivalries(events, factionId);
    const alliances = this.identifyAlliances(events, factionId);

    const narrative = this.generateFactionNarrative(
      factionName,
      eras,
      achievements,
      failures,
      rivalries,
      alliances
    );

    const history: FactionHistory = {
      factionId,
      name: factionName,
      foundedAt,
      founderEntities: this.identifyFounders(events),
      eras,
      majorEvents,
      currentEra: eras[eras.length - 1]?.id || 'modern',
      culturalIdentity,
      achievements,
      failures,
      rivalries,
      alliances,
      narrative
    };

    this.factionHistories.set(factionId, history);
    return history;
  }

  /**
   * Update faction history with new events
   */
  public updateFactionHistory(factionId: string, newEvents: HistoricalEvent[]): void {
    const history = this.factionHistories.get(factionId);
    if (!history) return;

    // Check if new era is emerging
    const currentEra = history.eras[history.eras.length - 1];
    if (this.shouldStartNewEra(currentEra, newEvents)) {
      const newEra = this.createEra(newEvents, history);
      history.eras.push(newEra);
      history.currentEra = newEra.id;
    }

    // Update narrative
    history.narrative = this.regenerateNarrative(history);
  }

  // ====================================================================
  // PRIVATE METHODS - CHRONICLE DETECTION
  // ====================================================================

  private detectWarChronicles(events: HistoricalEvent[]): Chronicle[] {
    const chronicles: Chronicle[] = [];
    const warEvents = events.filter(e => e.category === 'MILITARY' && e.severity >= 7);

    // Cluster by participants
    const warClusters = this.clusterEventsByParticipants(warEvents);

    for (const cluster of warClusters) {
      if (cluster.length >= 3) {  // At least 3 events = a war worth chronicling
        chronicles.push(this.createChronicle('WAR_CHRONICLE', cluster));
      }
    }

    return chronicles;
  }

  private detectEconomicEras(events: HistoricalEvent[]): Chronicle[] {
    const chronicles: Chronicle[] = [];
    const economicEvents = events.filter(e => e.category === 'ECONOMIC');

    // Look for periods of consistent economic activity
    const clusters = this.clusterEventsByTime(economicEvents, 3600 * 24);  // 1 day windows

    for (const cluster of clusters) {
      if (cluster.length >= 10) {
        const avgSeverity = cluster.reduce((sum, e) => sum + e.severity, 0) / cluster.length;

        const type: ChronicleType = avgSeverity > 6 ? 'GOLDEN_AGE' : 'TRADE_ERA';
        chronicles.push(this.createChronicle(type, cluster));
      }
    }

    return chronicles;
  }

  private detectLegendaryDeeds(events: HistoricalEvent[]): Chronicle[] {
    return events
      .filter(e => e.severity >= 9)  // Only truly epic events
      .map(e => this.createChronicle('LEGENDARY_DEED', [e]));
  }

  private detectPowerShifts(events: HistoricalEvent[]): Chronicle[] {
    const chronicles: Chronicle[] = [];

    // Group by faction
    const factionEvents = new Map<string, HistoricalEvent[]>();
    for (const event of events) {
      for (const participant of event.participants) {
        if (!factionEvents.has(participant)) {
          factionEvents.set(participant, []);
        }
        factionEvents.get(participant)!.push(event);
      }
    }

    // Analyze each faction's trajectory
    for (const [faction, factionEvts] of factionEvents) {
      if (factionEvts.length < 5) continue;

      const trend = this.calculatePowerTrend(factionEvts);

      if (trend > 0.5) {  // Rising power
        chronicles.push(this.createChronicle('RISE_OF_POWER', factionEvts, 'FACTION', faction));
      } else if (trend < -0.5) {  // Falling power
        chronicles.push(this.createChronicle('FALL_OF_POWER', factionEvts, 'FACTION', faction));
      }
    }

    return chronicles;
  }

  // ====================================================================
  // PRIVATE METHODS - NARRATIVE GENERATION
  // ====================================================================

  private generateNarrative(
    type: ChronicleType,
    events: HistoricalEvent[],
    perspective: Chronicle['perspective'],
    perspectiveId: string | undefined,
    namedEntities: Map<string, string>
  ): string {
    const lines: string[] = [];

    // Opening based on type
    switch (type) {
      case 'WAR_CHRONICLE':
        lines.push(this.generateWarOpening(events, namedEntities));
        break;
      case 'LEGENDARY_DEED':
        lines.push(this.generateLegendaryOpening(events[0], namedEntities));
        break;
      case 'GOLDEN_AGE':
        lines.push(this.generateGoldenAgeOpening(events, namedEntities));
        break;
      case 'RISE_OF_POWER':
        lines.push(this.generateRiseOpening(events, perspectiveId!, namedEntities));
        break;
      default:
        lines.push(this.generateGenericOpening(events));
    }

    lines.push('');

    // Main events
    const keyEvents = this.selectKeyEvents(events, 5);
    for (const event of keyEvents) {
      lines.push(this.narrativizeEvent(event, perspective, perspectiveId, namedEntities));
      lines.push('');
    }

    // Closing
    lines.push(this.generateClosing(type, events));

    return lines.join('\n');
  }

  private generateWarOpening(events: HistoricalEvent[], entities: Map<string, string>): string {
    const participants = [...new Set(events.flatMap(e => e.participants))];
    const factions = participants.slice(0, 2).map(p => entities.get(p) || p);

    const duration = Math.max(...events.map(e => e.timestamp)) - Math.min(...events.map(e => e.timestamp));
    const days = Math.floor(duration / 86400);

    return `The War of ${factions.join(' and ')} raged for ${days} days, ` +
           `shaping the destiny of all who dwelt in the contested regions. ` +
           `What began as a minor dispute escalated into one of the defining conflicts of this era.`;
  }

  private generateLegendaryOpening(event: HistoricalEvent, entities: Map<string, string>): string {
    const hero = entities.get(event.participants[0]) || 'An unknown entity';
    return `History remembers ${hero} for a deed that transcended ordinary achievement. ` +
           `On that fateful day, when ${event.description.toLowerCase()}, ` +
           `the course of history was forever altered.`;
  }

  private generateGoldenAgeOpening(events: HistoricalEvent[], entities: Map<string, string>): string {
    const duration = Math.max(...events.map(e => e.timestamp)) - Math.min(...events.map(e => e.timestamp));
    const days = Math.floor(duration / 86400);

    return `For ${days} days, prosperity reigned. Trade flourished, ` +
           `stations grew wealthy, and the people knew peace and abundance. ` +
           `Historians would later call this the Golden Era of Commerce.`;
  }

  private generateRiseOpening(events: HistoricalEvent[], factionId: string, entities: Map<string, string>): string {
    const factionName = entities.get(factionId) || factionId;
    return `The rise of ${factionName} is a story of ambition, strategy, and opportunity. ` +
           `From humble beginnings, they would ascend to become one of the dominant powers of the region.`;
  }

  private generateGenericOpening(events: HistoricalEvent[]): string {
    return `A period of ${events.length} significant events unfolded, ` +
           `each contributing to the tapestry of history in ways both subtle and profound.`;
  }

  private narrativizeEvent(
    event: HistoricalEvent,
    perspective: Chronicle['perspective'],
    perspectiveId: string | undefined,
    entities: Map<string, string>
  ): string {
    // Apply perspective bias
    let description = event.description;

    if (perspective === 'FACTION' && perspectiveId) {
      if (event.participants.includes(perspectiveId)) {
        description = this.applyHeroicTone(description);
      } else {
        description = this.applyNeutralTone(description);
      }
    }

    // Replace IDs with names
    for (const [id, name] of entities) {
      description = description.replace(new RegExp(id, 'g'), name);
    }

    return `• ${description}`;
  }

  private generateClosing(type: ChronicleType, events: HistoricalEvent[]): string {
    switch (type) {
      case 'WAR_CHRONICLE':
        return 'Thus ended the conflict, leaving scars that would shape politics for generations to come.';
      case 'LEGENDARY_DEED':
        return 'And so the legend was born, told and retold until fact and myth became inseparable.';
      case 'GOLDEN_AGE':
        return 'All golden ages must end, but the prosperity of this era would be remembered fondly.';
      default:
        return 'The consequences of these events continue to ripple through time.';
    }
  }

  // ====================================================================
  // PRIVATE METHODS - LEGEND GENERATION
  // ====================================================================

  private mythologizeEvent(event: HistoricalEvent, category: LegendCategory, exaggeration: number): string {
    let narrative = event.description;

    // Apply exaggeration multipliers
    const numbers = narrative.match(/\d+/g);
    if (numbers) {
      for (const num of numbers) {
        const original = parseInt(num);
        const exaggerated = Math.floor(original * (1 + exaggeration * 5));
        narrative = narrative.replace(num, exaggerated.toString());
      }
    }

    // Add mythological elements
    if (exaggeration > 0.6) {
      narrative += ' Witnesses spoke of omens and portents that preceded the event.';
    }

    if (exaggeration > 0.8) {
      narrative += ' Some claim divine intervention played a role, though such accounts cannot be verified.';
    }

    return narrative;
  }

  private generateLegendName(event: HistoricalEvent, category: LegendCategory): string {
    const prefixes = {
      HERO_TALE: 'The Tale of',
      CAUTIONARY_TALE: 'The Warning of',
      ORIGIN_STORY: 'The Birth of',
      MONSTER_MYTH: 'The Terror of',
      LOST_TREASURE: 'The Lost',
      CURSED_PLACE: 'The Curse of',
      PROPHECY: 'The Foretelling of'
    };

    return `${prefixes[category]} ${event.systemId || 'the Unknown'}`;
  }

  private generateMoralLesson(event: HistoricalEvent, category: LegendCategory): string | undefined {
    if (category === 'CAUTIONARY_TALE') {
      if (event.category === 'MILITARY') {
        return 'War brings only suffering and loss.';
      } else if (event.category === 'ECONOMIC') {
        return 'Greed leads to ruin.';
      }
    }

    return undefined;
  }

  // ====================================================================
  // PRIVATE METHODS - UTILITY
  // ====================================================================

  private calculateChronicleSignificance(events: HistoricalEvent[]): number {
    const avgSeverity = events.reduce((sum, e) => sum + e.severity, 0) / events.length;
    const uniqueParticipants = new Set(events.flatMap(e => e.participants)).size;

    return Math.min(10, avgSeverity + uniqueParticipants / 10);
  }

  // ====================================================================
  // ADVANCED ANALYSIS - CAUSAL CHAINS
  // ====================================================================

  /**
   * Analyze events to identify cause-and-effect relationships
   * Uses temporal proximity, participant overlap, and logical connections
   */
  private analyzeCausalChains(events: HistoricalEvent[]): CausalChain[] {
    const chains: CausalChain[] = [];
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const cause = sorted[i];
        const effect = sorted[j];

        // Calculate causal strength
        const strength = this.calculateCausalStrength(cause, effect);

        if (strength >= this.MIN_CAUSAL_STRENGTH) {
          chains.push({
            cause: cause.id,
            effect: effect.id,
            strength,
            mechanism: this.inferCausalMechanism(cause, effect),
            timeDelay: effect.timestamp - cause.timestamp
          });
        }

        // Stop looking if too much time has passed
        if (effect.timestamp - cause.timestamp > this.CAUSAL_TIME_WINDOW) {
          break;
        }
      }
    }

    return chains;
  }

  /**
   * Calculate strength of causal relationship between two events
   * Based on:
   * - Temporal proximity (closer = stronger)
   * - Participant overlap (same actors = stronger)
   * - Category relationship (logical connection)
   * - Severity ratio (cause should be significant enough)
   */
  private calculateCausalStrength(cause: HistoricalEvent, effect: HistoricalEvent): number {
    let strength = 0;

    // 1. Temporal proximity (40% weight)
    const timeDiff = effect.timestamp - cause.timestamp;
    if (timeDiff <= 0) return 0;  // Effect can't precede cause

    const temporalScore = Math.exp(-timeDiff / (this.CAUSAL_TIME_WINDOW / 3));
    strength += temporalScore * 0.4;

    // 2. Participant overlap (30% weight)
    const causeParticipants = new Set(cause.participants);
    const effectParticipants = new Set(effect.participants);
    const overlap = [...causeParticipants].filter(p => effectParticipants.has(p)).length;
    const maxParticipants = Math.max(causeParticipants.size, effectParticipants.size);
    const overlapRatio = maxParticipants > 0 ? overlap / maxParticipants : 0;
    strength += overlapRatio * 0.3;

    // 3. Category relationship (20% weight)
    const categoryScore = this.calculateCategoryConnection(cause.category, effect.category);
    strength += categoryScore * 0.2;

    // 4. Severity relationship (10% weight)
    // Cause should be significant enough to cause effect
    const severityRatio = Math.min(1, cause.severity / Math.max(1, effect.severity));
    strength += severityRatio * 0.1;

    return Math.min(1, strength);
  }

  /**
   * Determine how strongly two event categories are causally related
   */
  private calculateCategoryConnection(causeCategory: string, effectCategory: string): number {
    // Same category = strong connection
    if (causeCategory === effectCategory) return 1.0;

    // Known causal relationships
    const strongLinks: Record<string, string[]> = {
      'MILITARY': ['MILITARY', 'POLITICAL', 'ECONOMIC', 'SOCIAL'],
      'ECONOMIC': ['ECONOMIC', 'SOCIAL', 'POLITICAL'],
      'POLITICAL': ['MILITARY', 'DIPLOMATIC', 'ECONOMIC'],
      'SOCIAL': ['SOCIAL', 'POLITICAL'],
      'DISCOVERY': ['ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL']
    };

    if (strongLinks[causeCategory]?.includes(effectCategory)) {
      return 0.7;
    }

    return 0.3;  // Weak connection
  }

  /**
   * Infer the mechanism by which cause led to effect
   */
  private inferCausalMechanism(cause: HistoricalEvent, effect: HistoricalEvent): string {
    const overlap = cause.participants.filter(p => effect.participants.includes(p));

    if (cause.category === 'MILITARY' && effect.category === 'MILITARY') {
      return overlap.length > 0 ? 'Retaliatory action' : 'Escalation';
    }

    if (cause.category === 'ECONOMIC' && effect.category === 'ECONOMIC') {
      return 'Market reaction';
    }

    if (cause.category === 'MILITARY' && effect.category === 'ECONOMIC') {
      return 'Economic disruption from conflict';
    }

    if (cause.category === 'POLITICAL' && effect.category === 'MILITARY') {
      return 'Political decision leading to military action';
    }

    if (overlap.length > 0) {
      return 'Direct consequence';
    }

    return 'Indirect influence';
  }

  // ====================================================================
  // ADVANCED ANALYSIS - PATTERN RECOGNITION
  // ====================================================================

  /**
   * Detect historical patterns in events
   * Identifies cycles, escalations, domino effects, etc.
   */
  private detectPatterns(events: HistoricalEvent[], chronicleType: ChronicleType): HistoricalPattern[] {
    const patterns: HistoricalPattern[] = [];

    // 1. Detect escalation patterns
    const escalation = this.detectEscalation(events);
    if (escalation && escalation.confidence >= this.PATTERN_CONFIDENCE_THRESHOLD) {
      patterns.push(escalation);
    }

    // 2. Detect revenge spirals
    const revengeSpiral = this.detectRevengeSpiral(events);
    if (revengeSpiral && revengeSpiral.confidence >= this.PATTERN_CONFIDENCE_THRESHOLD) {
      patterns.push(revengeSpiral);
    }

    // 3. Detect domino effects
    const dominoEffect = this.detectDominoEffect(events);
    if (dominoEffect && dominoEffect.confidence >= this.PATTERN_CONFIDENCE_THRESHOLD) {
      patterns.push(dominoEffect);
    }

    // 4. Detect power vacuums
    const powerVacuum = this.detectPowerVacuum(events);
    if (powerVacuum && powerVacuum.confidence >= this.PATTERN_CONFIDENCE_THRESHOLD) {
      patterns.push(powerVacuum);
    }

    // 5. Detect boom-bust cycles
    const boomBust = this.detectBoomBust(events);
    if (boomBust && boomBust.confidence >= this.PATTERN_CONFIDENCE_THRESHOLD) {
      patterns.push(boomBust);
    }

    // Store patterns for future reference
    for (const pattern of patterns) {
      this.patterns.set(pattern.id, pattern);
    }

    return patterns;
  }

  /**
   * Detect escalation pattern - events growing in severity
   */
  private detectEscalation(events: HistoricalEvent[]): HistoricalPattern | null {
    if (events.length < 3) return null;

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Check if severity is generally increasing
    let increases = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].severity > sorted[i - 1].severity) {
        increases++;
      }
    }

    const escalationRatio = increases / (sorted.length - 1);

    if (escalationRatio >= 0.6) {  // 60% of events escalate
      const avgIncrease = sorted.reduce((sum, e, i) => {
        if (i === 0) return 0;
        return sum + (e.severity - sorted[i - 1].severity);
      }, 0) / (sorted.length - 1);

      return {
        id: `pattern_${this.nextPatternId++}`,
        type: 'ESCALATION',
        description: `Events escalated from severity ${sorted[0].severity} to ${sorted[sorted.length - 1].severity}`,
        events: sorted.map(e => e.id),
        confidence: escalationRatio,
        significance: Math.min(10, avgIncrease * 2),
        previousOccurrences: this.findSimilarPatterns('ESCALATION')
      };
    }

    return null;
  }

  /**
   * Detect revenge spiral - alternating attacks between same parties
   */
  private detectRevengeSpiral(events: HistoricalEvent[]): HistoricalPattern | null {
    const militaryEvents = events.filter(e => e.category === 'MILITARY');
    if (militaryEvents.length < 3) return null;

    const sorted = [...militaryEvents].sort((a, b) => a.timestamp - b.timestamp);

    // Look for alternating participant patterns
    let alternations = 0;
    const participantSets: Set<string>[] = sorted.map(e => new Set(e.participants));

    for (let i = 2; i < participantSets.length; i++) {
      // Check if event i has similar participants to event i-2 (skipping i-1)
      const similarity1 = this.setOverlap(participantSets[i], participantSets[i - 2]);
      const similarity2 = this.setOverlap(participantSets[i - 1], participantSets[i]);

      if (similarity1 > 0.5 && similarity2 > 0.5) {
        alternations++;
      }
    }

    const spiralRatio = alternations / Math.max(1, sorted.length - 2);

    if (spiralRatio >= 0.5) {
      return {
        id: `pattern_${this.nextPatternId++}`,
        type: 'REVENGE_SPIRAL',
        description: 'Tit-for-tat retaliatory attacks between factions',
        events: sorted.map(e => e.id),
        confidence: spiralRatio,
        significance: Math.min(10, sorted.length),
        previousOccurrences: this.findSimilarPatterns('REVENGE_SPIRAL')
      };
    }

    return null;
  }

  /**
   * Detect domino effect - one event triggering a cascade
   */
  private detectDominoEffect(events: HistoricalEvent[]): HistoricalPattern | null {
    if (events.length < 4) return null;

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Look for rapid succession of events with participant spillover
    const chains = this.analyzeCausalChains(events);

    // Find longest causal chain
    const chainLengths = new Map<string, number>();
    for (const chain of chains) {
      chainLengths.set(chain.effect, (chainLengths.get(chain.effect) || 0) + 1);
    }

    const maxChainLength = Math.max(...Array.from(chainLengths.values()), 0);

    if (maxChainLength >= 3 && chains.length >= events.length * 0.5) {
      return {
        id: `pattern_${this.nextPatternId++}`,
        type: 'DOMINO_EFFECT',
        description: `Chain reaction: initial event triggered ${maxChainLength} subsequent events`,
        events: sorted.map(e => e.id),
        confidence: Math.min(1, chains.length / events.length),
        significance: Math.min(10, maxChainLength),
        previousOccurrences: this.findSimilarPatterns('DOMINO_EFFECT')
      };
    }

    return null;
  }

  /**
   * Detect power vacuum - major power decline followed by conflicts
   */
  private detectPowerVacuum(events: HistoricalEvent[]): HistoricalPattern | null {
    if (events.length < 4) return null;

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Look for pattern: high-severity event followed by increased conflicts
    for (let i = 0; i < sorted.length - 3; i++) {
      const trigger = sorted[i];

      if (trigger.severity >= 7 && trigger.category === 'MILITARY') {
        // Count military events in next window
        const windowEnd = trigger.timestamp + 3600 * 24 * 3;  // 3 days
        const subsequentConflicts = sorted.slice(i + 1).filter(e =>
          e.category === 'MILITARY' &&
          e.timestamp <= windowEnd &&
          !e.participants.some(p => trigger.participants.includes(p))  // Different participants
        );

        if (subsequentConflicts.length >= 3) {
          return {
            id: `pattern_${this.nextPatternId++}`,
            type: 'POWER_VACUUM',
            description: 'Major power disruption led to widespread instability',
            events: [trigger, ...subsequentConflicts].map(e => e.id),
            confidence: 0.7,
            significance: Math.min(10, trigger.severity + subsequentConflicts.length),
            previousOccurrences: this.findSimilarPatterns('POWER_VACUUM')
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect boom-bust cycle - economic prosperity followed by crash
   */
  private detectBoomBust(events: HistoricalEvent[]): HistoricalPattern | null {
    const economicEvents = events.filter(e => e.category === 'ECONOMIC');
    if (economicEvents.length < 5) return null;

    const sorted = [...economicEvents].sort((a, b) => a.timestamp - b.timestamp);

    // Look for rising then falling severity
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const avgFirstHalf = firstHalf.reduce((sum, e) => sum + e.severity, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((sum, e) => sum + e.severity, 0) / secondHalf.length;

    // Boom: first half high severity, bust: second half lower
    if (avgFirstHalf >= 6 && avgSecondHalf < avgFirstHalf * 0.6) {
      return {
        id: `pattern_${this.nextPatternId++}`,
        type: 'BOOM_BUST',
        description: 'Economic boom followed by significant downturn',
        events: sorted.map(e => e.id),
        confidence: 0.65,
        significance: Math.min(10, avgFirstHalf - avgSecondHalf + 3),
        previousOccurrences: this.findSimilarPatterns('BOOM_BUST')
      };
    }

    return null;
  }

  /**
   * Find similar patterns in historical data
   */
  private findSimilarPatterns(type: PatternType): string[] {
    return Array.from(this.patterns.values())
      .filter(p => p.type === type)
      .map(p => p.id)
      .slice(0, 3);  // Return up to 3 previous occurrences
  }

  /**
   * Calculate overlap between two sets (Jaccard similarity)
   */
  private setOverlap(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // ====================================================================
  // ADVANCED ANALYSIS - DETAILED SIGNIFICANCE
  // ====================================================================

  /**
   * Calculate detailed significance breakdown
   * More sophisticated than simple average
   */
  private calculateDetailedSignificance(events: HistoricalEvent[]): {
    scope: number;
    severity: number;
    consequences: number;
    uniqueness: number;
    impact: number;
  } {
    // 1. Scope: number and diversity of participants
    const uniqueParticipants = new Set(events.flatMap(e => e.participants));
    const scopeScore = Math.min(10, uniqueParticipants.size * 0.5);

    // 2. Severity: average event severity
    const avgSeverity = events.reduce((sum, e) => sum + e.severity, 0) / events.length;
    const severityScore = Math.min(10, avgSeverity);

    // 3. Consequences: number of causal chains (cascading effects)
    const chains = this.analyzeCausalChains(events);
    const consequenceScore = Math.min(10, chains.length * 0.8);

    // 4. Uniqueness: how rare are these event types?
    const allHistoricalEvents = this.history.getAllEvents();
    const eventTypes = new Set(events.map(e => e.type));
    let raritySum = 0;
    for (const type of eventTypes) {
      const typeCount = allHistoricalEvents.filter(e => e.type === type).length;
      const rarity = 1 / (1 + Math.log(typeCount + 1));  // Logarithmic rarity
      raritySum += rarity;
    }
    const uniquenessScore = Math.min(10, (raritySum / eventTypes.size) * 10);

    // 5. Impact: combination of duration and intensity
    const duration = Math.max(...events.map(e => e.timestamp)) -
                     Math.min(...events.map(e => e.timestamp));
    const durationDays = duration / 86400;
    const avgIntensity = avgSeverity / 10;
    const impactScore = Math.min(10, (durationDays / 7) * avgIntensity * 5);

    return {
      scope: scopeScore,
      severity: severityScore,
      consequences: consequenceScore,
      uniqueness: uniquenessScore,
      impact: impactScore
    };
  }

  private extractThemes(events: HistoricalEvent[]): string[] {
    const themes = new Set<string>();

    for (const event of events) {
      themes.add(event.category.toLowerCase());
      for (const tag of event.tags) {
        themes.add(tag);
      }
    }

    return [...themes].slice(0, 5);
  }

  private buildNamedEntityMap(events: HistoricalEvent[]): Map<string, string> {
    const map = new Map<string, string>();

    // For demo purposes, use IDs as names (in real system, look up actual names)
    const allParticipants = new Set(events.flatMap(e => e.participants));

    for (const participant of allParticipants) {
      map.set(participant, this.generateEntityName(participant));
    }

    return map;
  }

  private generateEntityName(id: string): string {
    // Extract readable name from ID
    return id.split('_').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }

  private generateChronicleTitle(type: ChronicleType, events: HistoricalEvent[], entities: Map<string, string>): string {
    switch (type) {
      case 'WAR_CHRONICLE':
        const participants = [...new Set(events.flatMap(e => e.participants))].slice(0, 2);
        return `The War of ${participants.map(p => entities.get(p) || p).join(' and ')}`;

      case 'LEGENDARY_DEED':
        return `The Legend of ${entities.get(events[0].participants[0]) || 'the Hero'}`;

      case 'GOLDEN_AGE':
        return 'The Golden Age of Prosperity';

      default:
        return `Chronicle of ${type.replace(/_/g, ' ')}`;
    }
  }

  private clusterEventsByParticipants(events: HistoricalEvent[]): HistoricalEvent[][] {
    const clusters: HistoricalEvent[][] = [];
    const used = new Set<string>();

    for (const event of events) {
      if (used.has(event.id)) continue;

      const cluster = [event];
      used.add(event.id);

      // Find related events
      for (const other of events) {
        if (used.has(other.id)) continue;

        const overlap = event.participants.filter(p => other.participants.includes(p));
        if (overlap.length > 0) {
          cluster.push(other);
          used.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  private clusterEventsByTime(events: HistoricalEvent[], windowSize: number): HistoricalEvent[][] {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const clusters: HistoricalEvent[][] = [];

    let currentCluster: HistoricalEvent[] = [];
    let windowStart = 0;

    for (const event of sorted) {
      if (currentCluster.length === 0) {
        currentCluster.push(event);
        windowStart = event.timestamp;
      } else if (event.timestamp - windowStart <= windowSize) {
        currentCluster.push(event);
      } else {
        clusters.push(currentCluster);
        currentCluster = [event];
        windowStart = event.timestamp;
      }
    }

    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    return clusters;
  }

  private calculatePowerTrend(events: HistoricalEvent[]): number {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    let trend = 0;
    for (let i = 0; i < sorted.length; i++) {
      const weight = i / sorted.length;  // More recent = more weight
      const eventValue = sorted[i].severity > 5 ? 1 : -1;
      trend += eventValue * weight;
    }

    return trend / sorted.length;
  }

  private selectKeyEvents(events: HistoricalEvent[], maxCount: number): HistoricalEvent[] {
    return [...events]
      .sort((a, b) => b.severity - a.severity)
      .slice(0, maxCount);
  }

  private applyHeroicTone(description: string): string {
    return description.replace(/attacked/g, 'valiantly defended against')
                     .replace(/destroyed/g, 'eliminated the threat of')
                     .replace(/fled/g, 'tactically withdrew');
  }

  private applyNeutralTone(description: string): string {
    return description;  // Keep as-is
  }

  private calculateLegendSpreadRate(event: HistoricalEvent, exaggeration: number): number {
    return Math.min(1, (event.severity / 10) * (1 + exaggeration));
  }

  private calculateBelievability(event: HistoricalEvent, exaggeration: number): number {
    return Math.max(0, 1 - exaggeration * 0.8);
  }

  private varyNarrative(original: string, changeFactor: number): string {
    // Simple variation: add/remove details
    if (changeFactor > 0.5) {
      return original + ' Though some dispute these exact details.';
    }
    return original;
  }

  private describeChange(original: string, varied: string): string {
    if (original === varied) return 'No changes';
    return 'Minor details added';
  }

  private analyzeTrends(events: HistoricalEvent[]): string[] {
    const trends: string[] = [];

    // Count event types
    const typeCounts = new Map<string, number>();
    for (const event of events) {
      typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
    }

    // Identify dominant trends
    for (const [type, count] of typeCounts) {
      if (count >= 3) {
        trends.push(`increasing_${type.toLowerCase()}`);
      }
    }

    return trends;
  }

  private createProphecyText(trends: string[]): string {
    if (trends.some(t => t.includes('war') || t.includes('raid'))) {
      return 'Dark times approach. Conflict shall escalate, and blood will be spilled.';
    } else if (trends.some(t => t.includes('trade') || t.includes('economic'))) {
      return 'A period of prosperity draws near. Those who trade wisely shall prosper.';
    }

    return 'The future remains clouded. Great change is coming, though its nature is unclear.';
  }

  private calculateTrendLikelihood(trends: string[]): number {
    // More trends = more confident
    return Math.min(0.9, trends.length * 0.15);
  }

  private identifyProphecyConditions(trends: string[]): string[] {
    return trends.map(trend => `${trend} must continue`);
  }

  private predictConsequences(trends: string[]): string[] {
    return trends.map(trend => `${trend} will intensify`);
  }

  private checkCondition(condition: string, events: HistoricalEvent[]): boolean {
    // Simple check: condition mentions event type that occurred
    return events.some(e => condition.toLowerCase().includes(e.type.toLowerCase()));
  }

  private createNewFactionHistory(factionId: string, factionName: string): FactionHistory {
    return {
      factionId,
      name: factionName,
      foundedAt: Date.now() / 1000,
      founderEntities: [],
      eras: [],
      majorEvents: [],
      currentEra: 'founding',
      culturalIdentity: 'A newly formed faction',
      achievements: [],
      failures: [],
      rivalries: new Map(),
      alliances: new Map(),
      narrative: `${factionName} was recently established. Their story is just beginning.`
    };
  }

  private identifyEras(events: HistoricalEvent[], factionId: string): Era[] {
    const eras: Era[] = [];

    if (events.length === 0) return eras;

    // Simple era detection: cluster by time periods
    const clusters = this.clusterEventsByTime(events, 86400 * 7);  // Weekly eras

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const militaryEvents = cluster.filter(e => e.category === 'MILITARY').length;
      const economicEvents = cluster.filter(e => e.category === 'ECONOMIC').length;

      let type: Era['type'];
      if (i === 0) {
        type = 'FOUNDING';
      } else if (militaryEvents > economicEvents * 2) {
        type = 'WAR';
      } else if (economicEvents > 10) {
        type = 'GOLDEN_AGE';
      } else {
        type = 'EXPANSION';
      }

      eras.push({
        id: `era_${i}`,
        name: `Era ${i + 1}`,
        timespan: {
          start: Math.min(...cluster.map(e => e.timestamp)),
          end: Math.max(...cluster.map(e => e.timestamp))
        },
        type,
        description: `A period of ${type.toLowerCase().replace(/_/g, ' ')}`,
        keyEvents: cluster.slice(0, 5).map(e => e.id),
        significance: Math.min(10, cluster.length)
      });
    }

    return eras;
  }

  private generateCulturalIdentity(events: HistoricalEvent[], factionId: string): string {
    const military = events.filter(e => e.category === 'MILITARY').length;
    const economic = events.filter(e => e.category === 'ECONOMIC').length;

    if (military > economic * 2) {
      return 'A warlike culture forged in conflict';
    } else if (economic > military * 2) {
      return 'A mercantile society focused on trade and prosperity';
    }

    return 'A balanced culture valuing both strength and commerce';
  }

  private identifyAchievements(events: HistoricalEvent[]): string[] {
    return events
      .filter(e => e.severity >= 7 && e.type !== 'CRISIS')
      .slice(0, 5)
      .map(e => e.description);
  }

  private identifyFailures(events: HistoricalEvent[]): string[] {
    return events
      .filter(e => e.severity >= 7 && (e.type === 'CRISIS' || e.category === 'MILITARY'))
      .slice(0, 3)
      .map(e => e.description);
  }

  private identifyRivalries(events: HistoricalEvent[], factionId: string): Map<string, string> {
    const rivalries = new Map<string, string>();

    const conflicts = events.filter(e =>
      e.category === 'MILITARY' &&
      e.participants.includes(factionId) &&
      e.participants.length > 1
    );

    for (const conflict of conflicts) {
      const rival = conflict.participants.find(p => p !== factionId);
      if (rival) {
        rivalries.set(rival, conflict.description);
      }
    }

    return rivalries;
  }

  private identifyAlliances(events: HistoricalEvent[], factionId: string): Map<string, string> {
    const alliances = new Map<string, string>();

    const cooperations = events.filter(e =>
      e.type === 'ALLIANCE_FORMED' ||
      (e.category === 'ECONOMIC' && e.participants.includes(factionId) && e.participants.length > 1)
    );

    for (const coop of cooperations) {
      const ally = coop.participants.find(p => p !== factionId);
      if (ally) {
        alliances.set(ally, coop.description);
      }
    }

    return alliances;
  }

  private identifyFounders(events: HistoricalEvent[]): string[] {
    if (events.length === 0) return [];

    // Founders are participants in earliest events
    const earliest = events.sort((a, b) => a.timestamp - b.timestamp).slice(0, 3);
    return [...new Set(earliest.flatMap(e => e.participants))].slice(0, 5);
  }

  private generateFactionNarrative(
    name: string,
    eras: Era[],
    achievements: string[],
    failures: string[],
    rivalries: Map<string, string>,
    alliances: Map<string, string>
  ): string {
    const lines: string[] = [];

    lines.push(`THE HISTORY OF ${name.toUpperCase()}`);
    lines.push('='.repeat(70));
    lines.push('');

    // Eras
    if (eras.length > 0) {
      lines.push('ERAS:');
      for (const era of eras) {
        lines.push(`  ${era.name} (${era.type}): ${era.description}`);
      }
      lines.push('');
    }

    // Achievements
    if (achievements.length > 0) {
      lines.push('GREATEST ACHIEVEMENTS:');
      for (const achievement of achievements.slice(0, 3)) {
        lines.push(`  • ${achievement}`);
      }
      lines.push('');
    }

    // Rivalries
    if (rivalries.size > 0) {
      lines.push('NOTABLE RIVALRIES:');
      for (const [rival, reason] of Array.from(rivalries).slice(0, 3)) {
        lines.push(`  vs ${this.generateEntityName(rival)}: ${reason}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private shouldStartNewEra(currentEra: Era, newEvents: HistoricalEvent[]): boolean {
    if (!currentEra) return true;

    // Check if events indicate shift
    const avgSeverity = newEvents.reduce((sum, e) => sum + e.severity, 0) / newEvents.length;
    return avgSeverity >= 7;  // High severity = new era
  }

  private createEra(events: HistoricalEvent[], history: FactionHistory): Era {
    const id = `era_${history.eras.length + 1}`;
    const militaryEvents = events.filter(e => e.category === 'MILITARY').length;

    return {
      id,
      name: `Era ${history.eras.length + 1}`,
      timespan: {
        start: Math.min(...events.map(e => e.timestamp)),
        end: Math.max(...events.map(e => e.timestamp))
      },
      type: militaryEvents > events.length / 2 ? 'WAR' : 'EXPANSION',
      description: 'A new chapter unfolds',
      keyEvents: events.slice(0, 5).map(e => e.id),
      significance: Math.min(10, events.length)
    };
  }

  private regenerateNarrative(history: FactionHistory): string {
    return this.generateFactionNarrative(
      history.name,
      history.eras,
      history.achievements,
      history.failures,
      history.rivalries,
      history.alliances
    );
  }

  // ====================================================================
  // PUBLIC API - QUERIES
  // ====================================================================

  public getChronicle(id: string): Chronicle | undefined {
    return this.chronicles.get(id);
  }

  public getLegend(id: string): Legend | undefined {
    return this.legends.get(id);
  }

  public getProphecy(id: string): Prophecy | undefined {
    return this.prophecies.get(id);
  }

  public getFactionHistory(factionId: string): FactionHistory | undefined {
    return this.factionHistories.get(factionId);
  }

  public getAllChronicles(): Chronicle[] {
    return Array.from(this.chronicles.values());
  }

  public getAllLegends(): Legend[] {
    return Array.from(this.legends.values());
  }

  public getChroniclesByType(type: ChronicleType): Chronicle[] {
    return Array.from(this.chronicles.values()).filter(c => c.type === type);
  }

  public getLegendsByCategory(category: LegendCategory): Legend[] {
    return Array.from(this.legends.values()).filter(l => l.category === category);
  }

  public getFulfilledProphecies(): Prophecy[] {
    return Array.from(this.prophecies.values()).filter(p => p.fulfilled);
  }
}
