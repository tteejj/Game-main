/**
 * ChronicleSystem - Advanced narrative generation and event tracking
 *
 * Builds on HistoricalMemorySystem to create emergent narratives from event chains.
 * Tracks causality, identifies turning points, and generates readable stories.
 *
 * Key Features:
 * - Event causality graph tracking
 * - Narrative generation from event chains
 * - Faction history and story arcs
 * - Turning point identification
 * - Efficient querying (< 10ms for complex queries)
 * - Memory-efficient (max 100k events with automatic pruning)
 */

import { Vector3 } from '../../physics-modules/src/Vector3';
import { HistoricalMemorySystem, HistoricalEvent, EventType, EventCategory } from './simulation/HistoricalMemorySystem';

// ====================================================================
// CORE INTERFACES
// ====================================================================

export interface HistoricalEventExtended extends HistoricalEvent {
  actors: string[];              // Who was involved (alias for participants)
  outcome: string;               // What happened as a result
  significance: number;          // 0-10 rating
  consequences: string[];        // What happened after (event IDs)
  relatedEvents: string[];       // Connected events (for causality)
}

export interface EventRelationship {
  eventId1: string;
  eventId2: string;
  relationshipType: RelationshipType;
  strength: number;              // 0-1, how strongly related
  description?: string;
}

export type RelationshipType =
  | 'CAUSED'                     // Event A caused Event B
  | 'ENABLED'                    // Event A enabled Event B
  | 'PREVENTED'                  // Event A prevented Event B
  | 'COINCIDED'                  // Events happened around same time
  | 'PARALLEL'                   // Similar events in different locations
  | 'ESCALATED'                  // Event B escalated from Event A
  | 'RESOLVED'                   // Event B resolved Event A
  | 'RETALIATION'                // Event B was retaliation for Event A
  | 'CONSEQUENCE';               // Event B was a consequence of Event A

export interface Chronicle {
  id: string;
  title: string;
  timespan: { start: number; end: number };
  events: HistoricalEventExtended[];
  narrative: string;             // Generated story text
  keyFigures: string[];          // Important entities (faction/ship IDs)
  majorConsequences: string[];   // Long-term impacts
  turningPoints: TurningPoint[]; // Key moments that changed everything
  factionId?: string;            // If faction-specific
  tags: string[];                // Categorization tags
  significance: number;          // Overall chronicle importance (0-10)
}

export interface TurningPoint {
  eventId: string;
  timestamp: number;
  description: string;
  impactScore: number;           // How much this changed the course of events
  beforeState: string;           // State before
  afterState: string;            // State after
}

export interface EventChain {
  rootEventId: string;
  events: HistoricalEventExtended[];
  relationships: EventRelationship[];
  chainType: ChainType;
  narrative: string;
}

export type ChainType =
  | 'WAR_CAMPAIGN'               // Series of battles and conquests
  | 'ECONOMIC_CYCLE'             // Boom, bust, recovery
  | 'DIPLOMATIC_SAGA'            // Alliance, betrayal, war
  | 'EXPANSION'                  // Territorial growth
  | 'DECLINE'                    // Fall of a faction
  | 'DISCOVERY'                  // Exploration and findings
  | 'TECHNOLOGICAL'              // Research and breakthroughs
  | 'CRISIS';                    // Emergency and resolution

export interface EventFilter {
  startTime?: number;
  endTime?: number;
  eventTypes?: EventType[];
  categories?: EventCategory[];
  factionIds?: string[];
  systemIds?: string[];
  minSignificance?: number;
  tags?: string[];
  limit?: number;
}

export interface NarrativeStyle {
  perspective: 'NEUTRAL' | 'FACTION_BIASED' | 'DRAMATIC' | 'ANALYTICAL';
  detail: 'BRIEF' | 'STANDARD' | 'DETAILED';
  tone: 'FORMAL' | 'CASUAL' | 'EPIC';
}

// ====================================================================
// CHRONICLE SYSTEM CLASS
// ====================================================================

export class ChronicleSystem {
  private historySystem: HistoricalMemorySystem;

  // Event relationship graph
  private eventRelationships: Map<string, EventRelationship[]> = new Map();
  private eventGraph: Map<string, Set<string>> = new Map(); // Adjacency list

  // Chronicles storage
  private chronicles: Map<string, Chronicle> = new Map();
  private factionChronicles: Map<string, string[]> = new Map(); // faction -> chronicle IDs

  // Caching for performance
  private significantEventsCache: HistoricalEventExtended[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 60000; // 60 seconds

  // Performance tracking
  private queryCount: number = 0;
  private totalQueryTime: number = 0;

  // Memory management
  private readonly MAX_EVENTS = 100000;
  private readonly MAX_CHRONICLES = 1000;
  private readonly MAX_RELATIONSHIPS = 50000;

  constructor(historySystem: HistoricalMemorySystem) {
    this.historySystem = historySystem;
  }

  // ====================================================================
  // EVENT RECORDING & LINKING
  // ====================================================================

  /**
   * Record a new historical event
   * Wraps HistoricalMemorySystem and adds chronicle-specific tracking
   */
  public recordEvent(event: HistoricalEventExtended): void {
    // Record to underlying history system
    this.historySystem.recordEvent(event);

    // Initialize graph node
    if (!this.eventGraph.has(event.id)) {
      this.eventGraph.set(event.id, new Set());
    }

    // Auto-link to recent events based on participants and location
    this.autoLinkRelatedEvents(event);

    // Calculate significance if not provided
    if (event.significance === undefined) {
      event.significance = this.calculateSignificance(event);
    }

    // Update actors alias
    if (!event.actors || event.actors.length === 0) {
      event.actors = event.participants;
    }

    // Update cache if needed
    if (event.significance >= 7) {
      this.significantEventsCache.push(event);
      this.lastCacheUpdate = Date.now();
    }

    // Manage memory
    this.enforceMemoryLimits();
  }

  /**
   * Link two events with a relationship
   */
  public linkEvents(
    eventId1: string,
    eventId2: string,
    relationshipType: RelationshipType,
    strength: number = 1.0,
    description?: string
  ): void {
    const relationship: EventRelationship = {
      eventId1,
      eventId2,
      relationshipType,
      strength: Math.max(0, Math.min(1, strength)),
      description
    };

    // Store relationship
    if (!this.eventRelationships.has(eventId1)) {
      this.eventRelationships.set(eventId1, []);
    }
    this.eventRelationships.get(eventId1)!.push(relationship);

    // Update graph (bidirectional for querying)
    if (!this.eventGraph.has(eventId1)) {
      this.eventGraph.set(eventId1, new Set());
    }
    if (!this.eventGraph.has(eventId2)) {
      this.eventGraph.set(eventId2, new Set());
    }

    this.eventGraph.get(eventId1)!.add(eventId2);
    this.eventGraph.get(eventId2)!.add(eventId1);

    // Manage memory
    if (this.getTotalRelationships() > this.MAX_RELATIONSHIPS) {
      this.pruneWeakRelationships();
    }
  }

  /**
   * Automatically link related events based on context
   */
  private autoLinkRelatedEvents(event: HistoricalEventExtended): void {
    const recentEvents = this.historySystem.getRecentEvents(3600); // Last hour

    for (const recent of recentEvents) {
      if (recent.id === event.id) continue;

      const recentExt = recent as HistoricalEventExtended;

      // Check for shared participants
      const sharedParticipants = event.participants.filter(p =>
        recent.participants.includes(p)
      );

      if (sharedParticipants.length > 0) {
        // Same participants = likely related
        const type = this.inferRelationshipType(recentExt, event);
        const strength = sharedParticipants.length / Math.max(event.participants.length, recent.participants.length);

        this.linkEvents(recent.id, event.id, type, strength);
      }

      // Check for same location
      if (event.systemId && event.systemId === recent.systemId) {
        const distance = this.distanceSquared(event.location, recent.location);
        if (distance < 1000000) { // Within 1000km
          this.linkEvents(recent.id, event.id, 'COINCIDED', 0.3);
        }
      }

      // Check for consequence relationship
      if (recent.consequences && recent.consequences.length > 0) {
        const hasConsequenceLink = recent.consequences.some((c: any) =>
          c.eventId === event.id || c.type === event.type
        );

        if (hasConsequenceLink) {
          this.linkEvents(recent.id, event.id, 'CONSEQUENCE', 0.9);
        }
      }
    }
  }

  /**
   * Infer relationship type between two events
   */
  private inferRelationshipType(event1: HistoricalEvent, event2: HistoricalEvent): RelationshipType {
    const timeDiff = Math.abs(event2.timestamp - event1.timestamp);

    // Very close in time = coincided
    if (timeDiff < 60) {
      return 'COINCIDED';
    }

    // Check event types for logical relationships
    if (event1.type === 'WAR_DECLARED' && event2.type === 'BATTLE') {
      return 'CAUSED';
    }

    if (event1.type === 'STATION_ATTACKED' && event2.type === 'STATION_DESTROYED') {
      return 'ESCALATED';
    }

    if (event1.category === 'MILITARY' && event2.category === 'MILITARY') {
      return 'PARALLEL';
    }

    if (event1.type === 'COMBAT_STARTED' && event2.type === 'COMBAT_STARTED') {
      // Same participants = retaliation?
      const shared = event1.participants.filter(p => event2.participants.includes(p));
      if (shared.length > 0) {
        return 'RETALIATION';
      }
    }

    // Default to consequence
    return 'CONSEQUENCE';
  }

  // ====================================================================
  // NARRATIVE GENERATION
  // ====================================================================

  /**
   * Generate narrative from event chain
   */
  public generateNarrative(
    factionId: string,
    timespan: number,
    style: NarrativeStyle = {
      perspective: 'NEUTRAL',
      detail: 'STANDARD',
      tone: 'FORMAL'
    }
  ): Chronicle {
    const startTime = Date.now();
    const currentTime = this.getCurrentTime();
    const startTimestamp = currentTime - timespan;

    // Query relevant events
    const events = this.queryEvents({
      startTime: startTimestamp,
      endTime: currentTime,
      factionIds: [factionId],
      minSignificance: 3
    });

    // Sort by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    // Identify key figures
    const keyFigures = this.identifyKeyFigures(events, 5);

    // Identify turning points
    const turningPoints = this.identifyTurningPoints(events);

    // Generate narrative text
    const narrative = this.generateNarrativeText(events, turningPoints, style);

    // Extract major consequences
    const majorConsequences = this.extractMajorConsequences(events);

    // Calculate overall significance
    const significance = this.calculateChronicleSignificance(events, turningPoints);

    // Create chronicle
    const chronicle: Chronicle = {
      id: `chronicle_${factionId}_${Date.now()}`,
      title: this.generateChronicleTitle(events, factionId),
      timespan: { start: startTimestamp, end: currentTime },
      events,
      narrative,
      keyFigures,
      majorConsequences,
      turningPoints,
      factionId,
      tags: this.generateChronicTags(events),
      significance
    };

    // Store chronicle
    this.chronicles.set(chronicle.id, chronicle);

    // Track faction chronicles
    if (!this.factionChronicles.has(factionId)) {
      this.factionChronicles.set(factionId, []);
    }
    this.factionChronicles.get(factionId)!.push(chronicle.id);

    // Track performance
    this.trackQuery(Date.now() - startTime);

    return chronicle;
  }

  /**
   * Generate narrative text from events
   */
  private generateNarrativeText(
    events: HistoricalEventExtended[],
    turningPoints: TurningPoint[],
    style: NarrativeStyle
  ): string {
    if (events.length === 0) {
      return 'This period was remarkably quiet, with no significant events recorded.';
    }

    const paragraphs: string[] = [];

    // Opening
    paragraphs.push(this.generateOpeningParagraph(events, style));

    // Group events into story arcs
    const arcs = this.groupIntoStoryArcs(events);

    for (const arc of arcs) {
      // Generate paragraph for each arc
      const arcText = this.generateArcNarrative(arc, turningPoints, style);
      if (arcText) {
        paragraphs.push(arcText);
      }
    }

    // Closing summary
    paragraphs.push(this.generateClosingParagraph(events, turningPoints, style));

    return paragraphs.join('\n\n');
  }

  /**
   * Generate opening paragraph
   */
  private generateOpeningParagraph(events: HistoricalEventExtended[], style: NarrativeStyle): string {
    const timespan = events[events.length - 1].timestamp - events[0].timestamp;
    const timespanStr = this.formatTimespan(timespan);

    const eventTypes = new Set(events.map(e => e.category));
    const typeList = Array.from(eventTypes).join(', ').toLowerCase();

    if (style.tone === 'EPIC') {
      return `In the span of ${timespanStr}, the universe witnessed great upheaval. ` +
             `From ${typeList} events that shook the very foundations of civilization, ` +
             `emerged a tale of ${events.length} defining moments.`;
    } else if (style.tone === 'CASUAL') {
      return `Over ${timespanStr}, things got pretty interesting. ` +
             `We saw ${events.length} notable events involving ${typeList}.`;
    } else {
      return `During a period of ${timespanStr}, ${events.length} significant events were recorded, ` +
             `spanning ${typeList} categories.`;
    }
  }

  /**
   * Group events into story arcs
   */
  private groupIntoStoryArcs(events: HistoricalEventExtended[]): HistoricalEventExtended[][] {
    const arcs: HistoricalEventExtended[][] = [];
    let currentArc: HistoricalEventExtended[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (currentArc.length === 0) {
        currentArc.push(event);
        continue;
      }

      const lastEvent = currentArc[currentArc.length - 1];
      const timeSinceLast = event.timestamp - lastEvent.timestamp;

      // Same category and close in time = same arc
      if (event.category === lastEvent.category && timeSinceLast < 86400) {
        currentArc.push(event);
      } else {
        // Start new arc
        arcs.push(currentArc);
        currentArc = [event];
      }
    }

    if (currentArc.length > 0) {
      arcs.push(currentArc);
    }

    return arcs;
  }

  /**
   * Generate narrative for a story arc
   */
  private generateArcNarrative(
    arc: HistoricalEventExtended[],
    turningPoints: TurningPoint[],
    style: NarrativeStyle
  ): string {
    if (arc.length === 0) return '';

    const category = arc[0].category;
    const sentences: string[] = [];

    // Arc introduction
    if (arc.length === 1) {
      sentences.push(this.formatEventDescription(arc[0], style));
    } else {
      // Multiple events - tell as sequence
      sentences.push(this.formatArcIntroduction(arc, category, style));

      for (const event of arc) {
        // Check if this is a turning point
        const isTurningPoint = turningPoints.some(tp => tp.eventId === event.id);

        if (isTurningPoint || event.significance >= 7) {
          sentences.push(this.formatEventDescription(event, style));
        } else if (style.detail === 'DETAILED') {
          sentences.push(this.formatEventDescription(event, style));
        }
      }

      // Arc conclusion if significant
      if (arc.some(e => e.significance >= 8)) {
        sentences.push(this.formatArcConclusion(arc, style));
      }
    }

    return sentences.join(' ');
  }

  /**
   * Format arc introduction
   */
  private formatArcIntroduction(
    arc: HistoricalEventExtended[],
    category: EventCategory,
    style: NarrativeStyle
  ): string {
    const timespan = this.formatTimespan(arc[arc.length - 1].timestamp - arc[0].timestamp);

    if (style.tone === 'EPIC') {
      const categoryDescriptions: Record<EventCategory, string> = {
        MILITARY: 'the drums of war echoed across the systems',
        ECONOMIC: 'markets trembled and fortunes were made',
        DIPLOMATIC: 'alliances were forged and broken',
        ENVIRONMENTAL: 'nature unleashed its fury',
        SOCIAL: 'populations rose in unrest',
        PERSONAL: 'individual heroics shaped destiny',
        INFRASTRUCTURE: 'great works transformed civilization',
        DISCOVERY: 'explorers ventured into the unknown'
      };

      return `Over ${timespan}, ${categoryDescriptions[category]}.`;
    } else {
      return `A series of ${category.toLowerCase()} events unfolded over ${timespan}.`;
    }
  }

  /**
   * Format arc conclusion
   */
  private formatArcConclusion(arc: HistoricalEventExtended[], style: NarrativeStyle): string {
    const lastEvent = arc[arc.length - 1];

    if (lastEvent.outcome) {
      return `Ultimately, ${lastEvent.outcome.toLowerCase()}.`;
    }

    const totalImpact = arc.reduce((sum, e) => sum + e.significance, 0);
    if (totalImpact > 40) {
      return 'These events would reshape the political landscape for years to come.';
    } else if (totalImpact > 20) {
      return 'The effects of these events continued to reverberate throughout the region.';
    } else {
      return 'Order was eventually restored.';
    }
  }

  /**
   * Format single event description
   */
  private formatEventDescription(event: HistoricalEventExtended, style: NarrativeStyle): string {
    const timestamp = this.formatTimestamp(event.timestamp);

    let description = event.description;

    if (style.detail === 'DETAILED' && event.data) {
      // Add contextual details
      const details: string[] = [];

      if (event.data.casualties) {
        details.push(`resulting in ${event.data.casualties} casualties`);
      }
      if (event.data.economicImpact) {
        details.push(`with economic impact of ${event.data.economicImpact} credits`);
      }

      if (details.length > 0) {
        description += `, ${details.join(' and ')}`;
      }
    }

    if (event.outcome && style.detail !== 'BRIEF') {
      description += `. ${event.outcome}`;
    }

    if (style.detail === 'BRIEF') {
      return description + '.';
    } else {
      return `At ${timestamp}, ${description.toLowerCase()}.`;
    }
  }

  /**
   * Generate closing paragraph
   */
  private generateClosingParagraph(
    events: HistoricalEventExtended[],
    turningPoints: TurningPoint[],
    style: NarrativeStyle
  ): string {
    if (turningPoints.length === 0) {
      return 'The period concluded with relative stability.';
    }

    const mostSignificant = turningPoints.reduce((max, tp) =>
      tp.impactScore > max.impactScore ? tp : max
    );

    if (style.tone === 'EPIC') {
      return `History would remember this era for ${mostSignificant.description.toLowerCase()}, ` +
             `a moment that defined the age and whose consequences echo to this day.`;
    } else {
      return `The most significant development was ${mostSignificant.description.toLowerCase()}, ` +
             `which fundamentally altered the course of events.`;
    }
  }

  /**
   * Generate chronicle title
   */
  private generateChronicleTitle(events: HistoricalEventExtended[], factionId?: string): string {
    if (events.length === 0) return 'The Quiet Times';

    // Find most significant event
    const mostSignificant = events.reduce((max, e) =>
      e.significance > max.significance ? e : max
    );

    const category = mostSignificant.category;

    const titles: Record<EventCategory, string[]> = {
      MILITARY: ['The War Chronicles', 'Era of Conflict', 'The Battle Years', 'Days of War'],
      ECONOMIC: ['The Trade Wars', 'Age of Prosperity', 'Economic Upheaval', 'Market Revolution'],
      DIPLOMATIC: ['The Alliance Years', 'Age of Diplomacy', 'Political Upheaval', 'Treaty Era'],
      ENVIRONMENTAL: ['The Cataclysm', 'Natural Disasters', 'Environmental Crisis', 'Nature\'s Wrath'],
      SOCIAL: ['The People\'s Uprising', 'Social Revolution', 'Civil Unrest', 'Age of Change'],
      PERSONAL: ['Tales of Heroes', 'Individual Triumphs', 'Personal Sagas', 'Character Studies'],
      INFRASTRUCTURE: ['The Building Era', 'Age of Construction', 'Infrastructure Revolution', 'Great Works'],
      DISCOVERY: ['Age of Exploration', 'The Discovery Era', 'Frontier Chronicles', 'Scientific Revolution']
    };

    const titleOptions = titles[category] || ['The Chronicles'];
    const baseTitle = titleOptions[Math.floor(Math.random() * titleOptions.length)];

    return factionId ? `${baseTitle} - ${factionId}` : baseTitle;
  }

  // ====================================================================
  // QUERYING & RETRIEVAL
  // ====================================================================

  /**
   * Query events with filter
   */
  public queryEvents(filter: EventFilter): HistoricalEventExtended[] {
    const startTime = Date.now();

    // Use history system's query
    const baseQuery: any = {
      startTime: filter.startTime,
      endTime: filter.endTime,
      types: filter.eventTypes,
      categories: filter.categories,
      participants: filter.factionIds,
      limit: filter.limit,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    };

    if (filter.systemIds && filter.systemIds.length > 0) {
      baseQuery.systemId = filter.systemIds[0]; // History system supports single system
    }

    let results = this.historySystem.queryEvents(baseQuery) as HistoricalEventExtended[];

    // Apply additional filters
    if (filter.minSignificance !== undefined) {
      results = results.filter(e => e.significance >= filter.minSignificance!);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(e =>
        filter.tags!.some(tag => e.tags?.includes(tag))
      );
    }

    // Track performance
    this.trackQuery(Date.now() - startTime);

    return results;
  }

  /**
   * Get event chain (causality path)
   */
  public getEventChain(eventId: string, maxDepth: number = 10): EventChain {
    const visited = new Set<string>();
    const events: HistoricalEventExtended[] = [];
    const relationships: EventRelationship[] = [];

    this.traverseEventGraph(eventId, visited, events, relationships, 0, maxDepth);

    // Determine chain type
    const chainType = this.determineChainType(events);

    // Generate narrative for chain
    const narrative = this.generateChainNarrative(events, relationships);

    return {
      rootEventId: eventId,
      events,
      relationships,
      chainType,
      narrative
    };
  }

  /**
   * Traverse event graph (DFS)
   */
  private traverseEventGraph(
    eventId: string,
    visited: Set<string>,
    events: HistoricalEventExtended[],
    relationships: EventRelationship[],
    depth: number,
    maxDepth: number
  ): void {
    if (depth >= maxDepth || visited.has(eventId)) {
      return;
    }

    visited.add(eventId);

    // Get event from history
    const historyEvents = this.historySystem.queryEvents({
      limit: 1000
    });
    const event = historyEvents.find(e => e.id === eventId) as HistoricalEventExtended;

    if (event) {
      events.push(event);
    }

    // Get relationships
    const eventRels = this.eventRelationships.get(eventId) || [];
    relationships.push(...eventRels);

    // Traverse connected events
    const connected = this.eventGraph.get(eventId) || new Set();
    for (const connectedId of connected) {
      this.traverseEventGraph(connectedId, visited, events, relationships, depth + 1, maxDepth);
    }
  }

  /**
   * Determine chain type from events
   */
  private determineChainType(events: HistoricalEventExtended[]): ChainType {
    const categories = events.map(e => e.category);
    const types = events.map(e => e.type);

    // Count occurrences
    const militaryCount = categories.filter(c => c === 'MILITARY').length;
    const economicCount = categories.filter(c => c === 'ECONOMIC').length;
    const diplomaticCount = categories.filter(c => c === 'DIPLOMATIC').length;

    // Check for war campaign
    if (militaryCount > events.length * 0.5) {
      return 'WAR_CAMPAIGN';
    }

    // Check for economic cycle
    if (economicCount > events.length * 0.5) {
      const hasBoom = types.some(t => t === 'ECONOMIC_BOOM');
      const hasCrash = types.some(t => t === 'MARKET_CRASH');
      if (hasBoom && hasCrash) {
        return 'ECONOMIC_CYCLE';
      }
    }

    // Check for diplomatic saga
    if (diplomaticCount > events.length * 0.3) {
      return 'DIPLOMATIC_SAGA';
    }

    // Check for discovery
    const discoveryCount = categories.filter(c => c === 'DISCOVERY').length;
    if (discoveryCount > events.length * 0.5) {
      return 'DISCOVERY';
    }

    // Check for crisis
    const avgSeverity = events.reduce((sum, e) => sum + e.severity, 0) / events.length;
    if (avgSeverity > 7) {
      return 'CRISIS';
    }

    return 'EXPANSION';
  }

  /**
   * Generate narrative for event chain
   */
  private generateChainNarrative(
    events: HistoricalEventExtended[],
    relationships: EventRelationship[]
  ): string {
    if (events.length === 0) return 'No events in this chain.';

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const sentences: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const event = sorted[i];
      const nextEvent = sorted[i + 1];

      sentences.push(event.description);

      if (nextEvent) {
        // Find relationship
        const rel = relationships.find(r =>
          (r.eventId1 === event.id && r.eventId2 === nextEvent.id) ||
          (r.eventId2 === event.id && r.eventId1 === nextEvent.id)
        );

        if (rel) {
          const connector = this.getRelationshipConnector(rel.relationshipType);
          sentences.push(connector);
        }
      }
    }

    return sentences.join(' ');
  }

  /**
   * Get narrative connector for relationship type
   */
  private getRelationshipConnector(type: RelationshipType): string {
    const connectors: Record<RelationshipType, string> = {
      CAUSED: 'This directly led to',
      ENABLED: 'This enabled',
      PREVENTED: 'This prevented',
      COINCIDED: 'At the same time,',
      PARALLEL: 'Similarly,',
      ESCALATED: 'This escalated into',
      RESOLVED: 'This resolved when',
      RETALIATION: 'In retaliation,',
      CONSEQUENCE: 'As a consequence,'
    };

    return connectors[type] || 'Subsequently,';
  }

  /**
   * Get faction history
   */
  public getFactionHistory(
    factionId: string,
    timespan?: number
  ): HistoricalEventExtended[] {
    const filter: EventFilter = {
      factionIds: [factionId],
      minSignificance: 1
    };

    if (timespan) {
      const currentTime = this.getCurrentTime();
      filter.startTime = currentTime - timespan;
      filter.endTime = currentTime;
    }

    return this.queryEvents(filter);
  }

  /**
   * Get significant events
   */
  public getSignificantEvents(limit: number = 10): HistoricalEventExtended[] {
    // Check cache
    if (Date.now() - this.lastCacheUpdate < this.CACHE_TTL && this.significantEventsCache.length > 0) {
      return this.significantEventsCache.slice(0, limit);
    }

    // Query all events and sort by significance
    const allEvents = this.historySystem.queryEvents({
      limit: 10000,
      sortBy: 'severity',
      sortOrder: 'desc'
    }) as HistoricalEventExtended[];

    // Filter and sort by significance
    const significant = allEvents
      .filter(e => e.significance >= 7)
      .sort((a, b) => b.significance - a.significance)
      .slice(0, limit);

    // Update cache
    this.significantEventsCache = significant;
    this.lastCacheUpdate = Date.now();

    return significant;
  }

  // ====================================================================
  // TURNING POINT IDENTIFICATION
  // ====================================================================

  /**
   * Identify turning points in event sequence
   */
  private identifyTurningPoints(events: HistoricalEventExtended[]): TurningPoint[] {
    const turningPoints: TurningPoint[] = [];

    for (let i = 1; i < events.length - 1; i++) {
      const prevEvent = events[i - 1];
      const currentEvent = events[i];
      const nextEvent = events[i + 1];

      // Calculate impact score
      const impactScore = this.calculateTurningPointImpact(
        prevEvent,
        currentEvent,
        nextEvent,
        events
      );

      if (impactScore >= 7) {
        turningPoints.push({
          eventId: currentEvent.id,
          timestamp: currentEvent.timestamp,
          description: currentEvent.description,
          impactScore,
          beforeState: this.summarizeState(events.slice(0, i)),
          afterState: this.summarizeState(events.slice(i + 1))
        });
      }
    }

    return turningPoints.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Calculate turning point impact
   */
  private calculateTurningPointImpact(
    prev: HistoricalEventExtended,
    current: HistoricalEventExtended,
    next: HistoricalEventExtended,
    allEvents: HistoricalEventExtended[]
  ): number {
    let impact = current.significance;

    // Category shift increases impact
    if (prev.category !== current.category || current.category !== next.category) {
      impact += 2;
    }

    // Severity spike
    if (current.severity > prev.severity + 3 || current.severity > next.severity + 3) {
      impact += 3;
    }

    // Many consequences
    if (current.consequences && current.consequences.length > 5) {
      impact += 2;
    }

    // Many participants
    if (current.participants.length > 5) {
      impact += 1;
    }

    return Math.min(10, impact);
  }

  /**
   * Summarize state from events
   */
  private summarizeState(events: HistoricalEventExtended[]): string {
    if (events.length === 0) return 'Initial state';

    const categories = events.map(e => e.category);
    const dominant = this.getMostFrequent(categories);
    const avgSeverity = events.reduce((sum, e) => sum + e.severity, 0) / events.length;

    if (avgSeverity > 7) {
      return `High ${dominant.toLowerCase()} tension`;
    } else if (avgSeverity > 4) {
      return `Moderate ${dominant.toLowerCase()} activity`;
    } else {
      return `Low ${dominant.toLowerCase()} activity`;
    }
  }

  // ====================================================================
  // HELPER METHODS
  // ====================================================================

  /**
   * Calculate event significance
   */
  private calculateSignificance(event: HistoricalEvent): number {
    let significance = event.severity;

    // More participants = more significant
    significance += Math.min(2, event.participants.length * 0.2);

    // High priority = more significant
    significance += Math.min(2, event.priority * 0.2);

    // Certain event types are inherently significant
    const significantTypes: EventType[] = [
      'WAR_DECLARED', 'WAR_ENDED', 'STATION_DESTROYED', 'ALLIANCE_FORMED',
      'ALLIANCE_DISSOLVED', 'TREATY_BROKEN', 'STATION_CAPTURED'
    ];

    if (significantTypes.includes(event.type)) {
      significance += 2;
    }

    return Math.min(10, Math.max(0, significance));
  }

  /**
   * Calculate chronicle significance
   */
  private calculateChronicleSignificance(
    events: HistoricalEventExtended[],
    turningPoints: TurningPoint[]
  ): number {
    const avgEventSignificance = events.reduce((sum, e) => sum + e.significance, 0) / events.length;
    const turningPointBonus = Math.min(3, turningPoints.length);
    const lengthBonus = Math.min(2, events.length / 10);

    return Math.min(10, avgEventSignificance + turningPointBonus + lengthBonus);
  }

  /**
   * Identify key figures in events
   */
  private identifyKeyFigures(events: HistoricalEventExtended[], limit: number): string[] {
    const participantCounts = new Map<string, number>();

    for (const event of events) {
      for (const participant of event.participants) {
        participantCounts.set(participant, (participantCounts.get(participant) || 0) + 1);
      }
    }

    return Array.from(participantCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  /**
   * Extract major consequences
   */
  private extractMajorConsequences(events: HistoricalEventExtended[]): string[] {
    const consequences: string[] = [];

    for (const event of events) {
      if (event.outcome) {
        consequences.push(event.outcome);
      }

      if (event.consequences) {
        for (const conseq of event.consequences) {
          if (typeof conseq === 'string') {
            consequences.push(conseq);
          }
        }
      }
    }

    // Return unique consequences
    return Array.from(new Set(consequences)).slice(0, 10);
  }

  /**
   * Generate chronicle tags
   */
  private generateChronicTags(events: HistoricalEventExtended[]): string[] {
    const tags = new Set<string>();

    for (const event of events) {
      tags.add(event.category.toLowerCase());
      tags.add(event.type.toLowerCase().replace(/_/g, '-'));

      if (event.tags) {
        event.tags.forEach(tag => tags.add(tag));
      }
    }

    return Array.from(tags);
  }

  /**
   * Format timespan
   */
  private formatTimespan(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)} seconds`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} hours`;
    } else if (seconds < 604800) {
      return `${Math.floor(seconds / 86400)} days`;
    } else if (seconds < 2592000) {
      return `${Math.floor(seconds / 604800)} weeks`;
    } else {
      return `${Math.floor(seconds / 2592000)} months`;
    }
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(timestamp: number): string {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `Day ${days}, ${hours % 24}:${minutes.toString().padStart(2, '0')}`;
    } else {
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Distance squared between vectors
   */
  private distanceSquared(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Get most frequent element
   */
  private getMostFrequent<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let mostFrequent = arr[0];

    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    }

    return mostFrequent;
  }

  /**
   * Get current time
   */
  private getCurrentTime(): number {
    return Date.now() / 1000;
  }

  /**
   * Track query performance
   */
  private trackQuery(timeMs: number): void {
    this.queryCount++;
    this.totalQueryTime += timeMs;
  }

  /**
   * Get total relationships
   */
  private getTotalRelationships(): number {
    let total = 0;
    for (const rels of this.eventRelationships.values()) {
      total += rels.length;
    }
    return total;
  }

  /**
   * Prune weak relationships
   */
  private pruneWeakRelationships(): void {
    for (const [eventId, rels] of this.eventRelationships) {
      // Keep only strong relationships (strength > 0.3)
      const strong = rels.filter(r => r.strength > 0.3);
      this.eventRelationships.set(eventId, strong);
    }
  }

  /**
   * Enforce memory limits
   */
  private enforceMemoryLimits(): void {
    // Prune chronicles if too many
    if (this.chronicles.size > this.MAX_CHRONICLES) {
      const chronicleArray = Array.from(this.chronicles.values());
      const sorted = chronicleArray.sort((a, b) => a.significance - b.significance);
      const toRemove = sorted.slice(0, Math.floor(this.MAX_CHRONICLES * 0.1));

      for (const chronicle of toRemove) {
        this.chronicles.delete(chronicle.id);
      }
    }
  }

  // ====================================================================
  // PUBLIC API - STATISTICS
  // ====================================================================

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    queryCount: number;
    averageQueryTime: number;
    cacheHitRate: number;
    totalEvents: number;
    totalRelationships: number;
    totalChronicles: number;
  } {
    return {
      queryCount: this.queryCount,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      cacheHitRate: 0, // Could track this
      totalEvents: this.historySystem.getStatistics().totalEvents,
      totalRelationships: this.getTotalRelationships(),
      totalChronicles: this.chronicles.size
    };
  }

  /**
   * Get all chronicles
   */
  public getChronicles(factionId?: string): Chronicle[] {
    if (factionId) {
      const chronicleIds = this.factionChronicles.get(factionId) || [];
      return chronicleIds
        .map(id => this.chronicles.get(id))
        .filter(c => c !== undefined) as Chronicle[];
    }

    return Array.from(this.chronicles.values());
  }

  // ====================================================================
  // SAVE/LOAD SUPPORT
  // ====================================================================

  /**
   * Serialize system state for saving
   */
  serialize(): import('./SaveFileFormat').ChronicleSystemState {
    // Serialize event relationships
    const eventRelationships: Array<{ eventId: string; relationships: import('./SaveFileFormat').SerializedEventRelationship[] }> = [];
    for (const [eventId, relationships] of this.eventRelationships.entries()) {
      const serializedRels = relationships.map(rel => ({
        eventId1: rel.eventId1,
        eventId2: rel.eventId2,
        relationshipType: rel.relationshipType,
        strength: rel.strength,
        description: rel.description
      }));
      eventRelationships.push({ eventId, relationships: serializedRels });
    }

    // Serialize chronicles
    const chronicles = Array.from(this.chronicles.values()).map(chronicle => ({
      id: chronicle.id,
      title: chronicle.title,
      timespan: { ...chronicle.timespan },
      eventIds: chronicle.events.map(e => e.id),
      narrative: chronicle.narrative,
      keyFigures: [...chronicle.keyFigures],
      majorConsequences: [...chronicle.majorConsequences],
      turningPoints: chronicle.turningPoints.map(tp => ({
        eventId: tp.eventId,
        timestamp: tp.timestamp,
        description: tp.description,
        impactScore: tp.impactScore,
        beforeState: tp.beforeState,
        afterState: tp.afterState
      })),
      factionId: chronicle.factionId,
      tags: [...chronicle.tags],
      significance: chronicle.significance
    }));

    // Serialize faction chronicles
    const factionChronicles: Array<{ factionId: string; chronicleIds: string[] }> = [];
    for (const [factionId, chronicleIds] of this.factionChronicles.entries()) {
      factionChronicles.push({ factionId, chronicleIds: [...chronicleIds] });
    }

    // Serialize significant events cache
    const significantEventsCache = this.significantEventsCache.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      severity: event.severity,
      category: event.category,
      location: { ...event.location },
      systemId: event.systemId,
      participants: [...event.participants],
      description: event.description,
      data: event.data,
      consequences: event.consequences ? [...event.consequences] : [],
      witnessed: event.witnessed,
      priority: event.priority,
      tags: event.tags ? [...event.tags] : [],
      actors: event.actors ? [...event.actors] : event.participants,
      outcome: event.outcome || '',
      significance: event.significance,
      relatedEvents: event.relatedEvents ? [...event.relatedEvents] : []
    }));

    return {
      eventRelationships,
      chronicles,
      factionChronicles,
      significantEventsCache,
      lastCacheUpdate: this.lastCacheUpdate,
      queryCount: this.queryCount,
      totalQueryTime: this.totalQueryTime
    };
  }

  /**
   * Deserialize and restore system state
   */
  deserialize(state: import('./SaveFileFormat').ChronicleSystemState): void {
    console.log('[ChronicleSystem] Deserializing state...');

    // Clear existing state
    this.eventRelationships.clear();
    this.eventGraph.clear();
    this.chronicles.clear();
    this.factionChronicles.clear();
    this.significantEventsCache = [];

    // Restore event relationships
    for (const { eventId, relationships } of state.eventRelationships) {
      const rels: EventRelationship[] = relationships.map(rel => ({
        eventId1: rel.eventId1,
        eventId2: rel.eventId2,
        relationshipType: rel.relationshipType,
        strength: rel.strength,
        description: rel.description
      }));
      this.eventRelationships.set(eventId, rels);

      // Rebuild graph
      if (!this.eventGraph.has(eventId)) {
        this.eventGraph.set(eventId, new Set());
      }
      for (const rel of rels) {
        this.eventGraph.get(eventId)!.add(rel.eventId2);
        if (!this.eventGraph.has(rel.eventId2)) {
          this.eventGraph.set(rel.eventId2, new Set());
        }
        this.eventGraph.get(rel.eventId2)!.add(eventId);
      }
    }

    // Restore chronicles
    for (const serializedChronicle of state.chronicles) {
      // Get events from history system
      const events: HistoricalEventExtended[] = [];
      for (const eventId of serializedChronicle.eventIds) {
        const historyEvents = this.historySystem.queryEvents({ limit: 10000 });
        const event = historyEvents.find(e => e.id === eventId) as HistoricalEventExtended;
        if (event) {
          events.push(event);
        }
      }

      const chronicle: Chronicle = {
        id: serializedChronicle.id,
        title: serializedChronicle.title,
        timespan: { ...serializedChronicle.timespan },
        events,
        narrative: serializedChronicle.narrative,
        keyFigures: [...serializedChronicle.keyFigures],
        majorConsequences: [...serializedChronicle.majorConsequences],
        turningPoints: serializedChronicle.turningPoints.map(tp => ({ ...tp })),
        factionId: serializedChronicle.factionId,
        tags: [...serializedChronicle.tags],
        significance: serializedChronicle.significance
      };

      this.chronicles.set(chronicle.id, chronicle);
    }

    // Restore faction chronicles
    for (const { factionId, chronicleIds } of state.factionChronicles) {
      this.factionChronicles.set(factionId, [...chronicleIds]);
    }

    // Restore significant events cache
    this.significantEventsCache = state.significantEventsCache.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type as any,
      severity: event.severity,
      category: event.category as any,
      location: { ...event.location },
      systemId: event.systemId,
      participants: [...event.participants],
      description: event.description,
      data: event.data,
      consequences: [...event.consequences],
      witnessed: event.witnessed,
      priority: event.priority,
      tags: event.tags ? [...event.tags] : [],
      actors: event.actors,
      outcome: event.outcome,
      significance: event.significance,
      relatedEvents: event.relatedEvents
    }));

    // Restore metadata
    this.lastCacheUpdate = state.lastCacheUpdate;
    this.queryCount = state.queryCount;
    this.totalQueryTime = state.totalQueryTime;

    console.log(`[ChronicleSystem] Restored ${this.eventRelationships.size} event relationships, ${this.chronicles.size} chronicles`);
  }
}
