/**
 * HistoricalMemorySystem - Universal memory and event recording
 *
 * This is the "brain" of the living universe. Every significant event is recorded,
 * creating a queryable history that drives emergent narrative and consequences.
 *
 * Key features:
 * - Every event is recorded with full context
 * - Entities remember events they participated in
 * - Events can be queried by time, location, type, participants
 * - Generates chronicles and narratives from history
 */

import { Vector3 } from '../CelestialBody';

export interface HistoricalEvent {
  // Identity
  id: string;
  timestamp: number;              // Simulation time

  // Classification
  type: EventType;
  severity: number;               // 1-10 (1=minor, 10=catastrophic)
  category: EventCategory;

  // Location
  location: Vector3;
  systemId?: string;
  stationId?: string;

  // Participants
  participants: string[];          // Entity IDs involved
  initiator?: string;              // Who/what caused this
  victims?: string[];              // Who suffered

  // Description
  description: string;
  detailedLog?: string;

  // Data payload
  data: any;                       // Event-specific data

  // Consequences
  consequences: ConsequenceLink[];

  // Metadata
  witnessed: boolean;              // Was player present?
  priority: number;                // Event importance (for querying)
  tags: string[];                  // Searchable tags
}

export type EventType =
  // Economic
  | 'TRADE_COMPLETED' | 'TRADE_INTERRUPTED' | 'SHORTAGE' | 'SURPLUS'
  | 'ECONOMIC_BOOM' | 'ECONOMIC_RECESSION' | 'MARKET_CRASH'
  | 'SUPPLY_CHAIN_BROKEN' | 'TRADE_ROUTE_OPENED'

  // Combat & Conflict
  | 'COMBAT_STARTED' | 'COMBAT_ENDED' | 'SHIP_DESTROYED'
  | 'STATION_ATTACKED' | 'STATION_CAPTURED' | 'PIRATE_RAID'
  | 'WAR_DECLARED' | 'WAR_ENDED' | 'BATTLE' | 'AMBUSH'

  // Diplomatic
  | 'TREATY_SIGNED' | 'TREATY_BROKEN' | 'ALLIANCE_FORMED'
  | 'ALLIANCE_DISSOLVED' | 'TRADE_AGREEMENT' | 'EMBARGO'
  | 'REPUTATION_CHANGE'

  // Environmental
  | 'SOLAR_FLARE' | 'ASTEROID_IMPACT' | 'ION_STORM'
  | 'RADIATION_BURST' | 'METEOR_SHOWER' | 'ANOMALY_DETECTED'

  // Station & Population
  | 'STATION_FOUNDED' | 'STATION_ABANDONED' | 'STATION_DESTROYED'
  | 'POPULATION_BOOM' | 'POPULATION_DECLINE' | 'PLAGUE_OUTBREAK'
  | 'CIVIL_UNREST' | 'STRIKE' | 'CELEBRATION'

  // Discovery & Exploration
  | 'POI_DISCOVERED' | 'DERELICT_FOUND' | 'ANOMALY_INVESTIGATED'
  | 'NEW_ROUTE_DISCOVERED' | 'SYSTEM_MAPPED'

  // Personal (NPC & Player)
  | 'SHIP_SPAWNED' | 'SHIP_DOCKED' | 'SHIP_UNDOCKED'
  | 'RESCUE' | 'DISTRESS_SIGNAL' | 'ENCOUNTER'
  | 'GOAL_ACHIEVED' | 'GOAL_FAILED' | 'REPUTATION_EARNED'

  // System & Infrastructure
  | 'REACTOR_FAILURE' | 'FIRE' | 'HULL_BREACH' | 'SYSTEM_FAILURE'
  | 'REPAIR_COMPLETED' | 'UPGRADE_INSTALLED'

  // Collision
  | 'COLLISION' | 'NEAR_MISS' | 'DOCKING_SUCCESS' | 'DOCKING_FAILURE'

  // Generic
  | 'CUSTOM_EVENT';

export type EventCategory =
  | 'ECONOMIC' | 'MILITARY' | 'DIPLOMATIC' | 'ENVIRONMENTAL'
  | 'SOCIAL' | 'PERSONAL' | 'INFRASTRUCTURE' | 'DISCOVERY';

export interface ConsequenceLink {
  eventId: string;                // ID of consequence event
  type: string;                   // Type of consequence
  delay: number;                  // Delay before consequence triggered
}

export interface EntityMemory {
  entityId: string;
  entityType: 'SHIP' | 'STATION' | 'FACTION' | 'PLAYER';

  // Events this entity participated in
  experiences: HistoricalEvent[];

  // Relationships formed through shared experiences
  relationships: Map<string, Relationship>;

  // Emotional impact of events
  trauma: TraumaRecord[];
  achievements: Achievement[];

  // Learning from history
  learnedBehaviors: LearnedBehavior[];
}

export interface Relationship {
  targetEntityId: string;
  type: 'ALLY' | 'ENEMY' | 'NEUTRAL' | 'RIVAL' | 'PARTNER' | 'VICTIM' | 'RESCUER';
  strength: number;               // -100 to 100
  formedAt: number;               // Timestamp
  sharedEvents: string[];         // Event IDs
  lastInteraction: number;
}

export interface TraumaRecord {
  event: HistoricalEvent;
  emotionalImpact: number;        // 0-10
  behaviorChanges: string[];      // How it changed entity behavior
  triggerConditions: string[];    // What reminds entity of this
}

export interface Achievement {
  eventId: string;
  type: 'FIRST_TIME' | 'MILESTONE' | 'RARE' | 'HEROIC' | 'VILLAINOUS';
  description: string;
  fame: number;                   // How well-known is this
}

export interface LearnedBehavior {
  condition: string;              // "When in asteroid field..."
  action: string;                 // "...slow down and use sensors"
  confidence: number;             // 0-1, increases with successful application
  learnedFrom: string[];          // Event IDs that taught this
}

export interface HistoricalQuery {
  // Time range
  startTime?: number;
  endTime?: number;

  // Location filter
  location?: Vector3;
  locationRadius?: number;
  systemId?: string;

  // Type filter
  types?: EventType[];
  categories?: EventCategory[];
  severityMin?: number;
  severityMax?: number;

  // Participant filter
  participants?: string[];
  initiator?: string;

  // Metadata filter
  tags?: string[];
  witnessedByPlayer?: boolean;

  // Result limits
  limit?: number;
  sortBy?: 'timestamp' | 'severity' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface Chronicle {
  title: string;
  timespan: { start: number; end: number };
  events: HistoricalEvent[];
  narrative: string;              // Generated story
  keyFigures: string[];           // Important entities
  majorConsequences: string[];    // Long-term impacts
}

export class HistoricalMemorySystem {
  // Event storage
  private events: Map<string, HistoricalEvent> = new Map();
  private eventsByTime: HistoricalEvent[] = [];
  private eventsByType: Map<EventType, HistoricalEvent[]> = new Map();
  private eventsByLocation: Map<string, HistoricalEvent[]> = new Map();

  // Entity memories
  private entityMemories: Map<string, EntityMemory> = new Map();

  // Statistics
  private totalEvents: number = 0;
  private eventsByCategory: Map<EventCategory, number> = new Map();

  // Performance config
  private readonly MAX_EVENTS = 10000;      // Keep last 10,000 events
  private readonly INDEX_REBUILD_INTERVAL = 100; // Rebuild indexes every 100 events

  constructor() {
    this.initializeCategories();
  }

  /**
   * Record a new event to history
   */
  public recordEvent(event: HistoricalEvent): void {
    // Store event
    this.events.set(event.id, event);
    this.eventsByTime.push(event);
    this.totalEvents++;

    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, []);
    }
    this.eventsByType.get(event.type)!.push(event);

    // Index by location (grid-based)
    const locationKey = this.getLocationKey(event.location);
    if (!this.eventsByLocation.has(locationKey)) {
      this.eventsByLocation.set(locationKey, []);
    }
    this.eventsByLocation.get(locationKey)!.push(event);  // FIXED: was using event.location instead of locationKey

    // Update category stats
    this.updateCategoryStats(event.category);

    // Update participant memories
    for (const participantId of event.participants) {
      this.addEventToEntityMemory(participantId, event);
    }

    // Maintain size limit
    if (this.events.size > this.MAX_EVENTS) {
      this.pruneOldEvents();
    }

    // Rebuild indexes periodically
    if (this.totalEvents % this.INDEX_REBUILD_INTERVAL === 0) {
      this.rebuildIndexes();
    }

    console.log(`[HISTORY] Recorded: ${event.type} - ${event.description}`);
  }

  /**
   * Query events by criteria
   */
  public queryEvents(query: HistoricalQuery): HistoricalEvent[] {
    let results: HistoricalEvent[] = [...this.eventsByTime];

    // Apply filters
    if (query.startTime !== undefined) {
      results = results.filter(e => e.timestamp >= query.startTime!);
    }

    if (query.endTime !== undefined) {
      results = results.filter(e => e.timestamp <= query.endTime!);
    }

    if (query.types && query.types.length > 0) {
      results = results.filter(e => query.types!.includes(e.type));
    }

    if (query.categories && query.categories.length > 0) {
      results = results.filter(e => query.categories!.includes(e.category));
    }

    if (query.severityMin !== undefined) {
      results = results.filter(e => e.severity >= query.severityMin!);
    }

    if (query.severityMax !== undefined) {
      results = results.filter(e => e.severity <= query.severityMax!);
    }

    if (query.participants && query.participants.length > 0) {
      results = results.filter(e =>
        query.participants!.some(p => e.participants.includes(p))
      );
    }

    if (query.initiator) {
      results = results.filter(e => e.initiator === query.initiator);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(e =>
        query.tags!.some(t => e.tags.includes(t))
      );
    }

    if (query.witnessedByPlayer !== undefined) {
      results = results.filter(e => e.witnessed === query.witnessedByPlayer);
    }

    if (query.systemId) {
      results = results.filter(e => e.systemId === query.systemId);
    }

    if (query.location && query.locationRadius) {
      results = results.filter(e =>
        this.distanceSquared(e.location, query.location!) <= query.locationRadius! ** 2
      );
    }

    // Sort
    if (query.sortBy) {
      results.sort((a, b) => {
        let comparison = 0;
        if (query.sortBy === 'timestamp') {
          comparison = a.timestamp - b.timestamp;
        } else if (query.sortBy === 'severity') {
          comparison = a.severity - b.severity;
        } else if (query.sortBy === 'priority') {
          comparison = a.priority - b.priority;
        }
        return query.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get recent events
   */
  public getRecentEvents(timeWindow: number): HistoricalEvent[] {
    const currentTime = this.getCurrentTime();
    return this.queryEvents({
      startTime: currentTime - timeWindow,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * Get entity's full history
   */
  public getEntityHistory(entityId: string): EntityMemory | null {
    return this.entityMemories.get(entityId) || null;
  }

  /**
   * Get events involving entity
   */
  public getEntityEvents(entityId: string): HistoricalEvent[] {
    return this.queryEvents({
      participants: [entityId],
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * Generate chronicle (narrative history)
   */
  public generateChronicle(startTime: number, endTime: number): Chronicle {
    const events = this.queryEvents({
      startTime,
      endTime,
      sortBy: 'severity',
      sortOrder: 'desc',
      limit: 20 // Top 20 most significant events
    });

    // Extract key figures
    const participantCounts = new Map<string, number>();
    for (const event of events) {
      for (const participant of event.participants) {
        participantCounts.set(participant, (participantCounts.get(participant) || 0) + 1);
      }
    }

    const keyFigures = Array.from(participantCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    // Generate narrative
    const narrative = this.generateNarrative(events);

    // Find major consequences
    const majorConsequences = this.findMajorConsequences(events);

    return {
      title: this.generateChronicleTitle(events),
      timespan: { start: startTime, end: endTime },
      events,
      narrative,
      keyFigures,
      majorConsequences
    };
  }

  /**
   * Add relationship between entities
   */
  public addRelationship(
    entityA: string,
    entityB: string,
    type: Relationship['type'],
    strength: number,
    eventId: string
  ): void {
    // Ensure both entities have memory
    this.ensureEntityMemory(entityA);
    this.ensureEntityMemory(entityB);

    const memoryA = this.entityMemories.get(entityA)!;
    const memoryB = this.entityMemories.get(entityB)!;

    // Update A's relationship with B
    const relA: Relationship = memoryA.relationships.get(entityB) || {
      targetEntityId: entityB,
      type,
      strength: 0,
      formedAt: this.getCurrentTime(),
      sharedEvents: [],
      lastInteraction: 0
    };

    relA.type = type;
    relA.strength = Math.max(-100, Math.min(100, relA.strength + strength));
    relA.sharedEvents.push(eventId);
    relA.lastInteraction = this.getCurrentTime();
    memoryA.relationships.set(entityB, relA);

    // Update B's relationship with A (reciprocal)
    const relB: Relationship = memoryB.relationships.get(entityA) || {
      targetEntityId: entityA,
      type,
      strength: 0,
      formedAt: this.getCurrentTime(),
      sharedEvents: [],
      lastInteraction: 0
    };

    relB.type = type;
    relB.strength = Math.max(-100, Math.min(100, relB.strength + strength));
    relB.sharedEvents.push(eventId);
    relB.lastInteraction = this.getCurrentTime();
    memoryB.relationships.set(entityA, relB);
  }

  /**
   * Add trauma to entity memory
   */
  public addTrauma(entityId: string, event: HistoricalEvent, impact: number, changes: string[]): void {
    this.ensureEntityMemory(entityId);
    const memory = this.entityMemories.get(entityId)!;

    memory.trauma.push({
      event,
      emotionalImpact: impact,
      behaviorChanges: changes,
      triggerConditions: this.inferTriggerConditions(event)
    });
  }

  /**
   * Add learned behavior to entity
   */
  public addLearnedBehavior(
    entityId: string,
    condition: string,
    action: string,
    eventId: string
  ): void {
    this.ensureEntityMemory(entityId);
    const memory = this.entityMemories.get(entityId)!;

    const existing = memory.learnedBehaviors.find(lb =>
      lb.condition === condition && lb.action === action
    );

    if (existing) {
      // Increase confidence
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      existing.learnedFrom.push(eventId);
    } else {
      // New behavior
      memory.learnedBehaviors.push({
        condition,
        action,
        confidence: 0.5,
        learnedFrom: [eventId]
      });
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalEvents: number;
    eventsByCategory: Map<EventCategory, number>;
    totalEntities: number;
    averageEventsPerEntity: number;
  } {
    const totalEntities = this.entityMemories.size;
    const averageEventsPerEntity = totalEntities > 0
      ? this.totalEvents / totalEntities
      : 0;

    return {
      totalEvents: this.totalEvents,
      eventsByCategory: new Map(this.eventsByCategory),
      totalEntities,
      averageEventsPerEntity
    };
  }

  // ====================================================================
  // PRIVATE HELPER METHODS
  // ====================================================================

  private initializeCategories(): void {
    const categories: EventCategory[] = [
      'ECONOMIC', 'MILITARY', 'DIPLOMATIC', 'ENVIRONMENTAL',
      'SOCIAL', 'PERSONAL', 'INFRASTRUCTURE', 'DISCOVERY'
    ];

    for (const category of categories) {
      this.eventsByCategory.set(category, 0);
    }
  }

  private addEventToEntityMemory(entityId: string, event: HistoricalEvent): void {
    this.ensureEntityMemory(entityId);
    const memory = this.entityMemories.get(entityId)!;
    memory.experiences.push(event);
  }

  private ensureEntityMemory(entityId: string): void {
    if (!this.entityMemories.has(entityId)) {
      this.entityMemories.set(entityId, {
        entityId,
        entityType: 'SHIP', // Default, should be set properly
        experiences: [],
        relationships: new Map(),
        trauma: [],
        achievements: [],
        learnedBehaviors: []
      });
    }
  }

  private updateCategoryStats(category: EventCategory): void {
    const count = this.eventsByCategory.get(category) || 0;
    this.eventsByCategory.set(category, count + 1);
  }

  private pruneOldEvents(): void {
    // Keep newest events, remove oldest
    const sortedEvents = [...this.eventsByTime].sort((a, b) => b.timestamp - a.timestamp);
    const toKeep = sortedEvents.slice(0, this.MAX_EVENTS);
    const toRemove = sortedEvents.slice(this.MAX_EVENTS);

    for (const event of toRemove) {
      this.events.delete(event.id);
    }

    this.eventsByTime = toKeep;
    this.rebuildIndexes();
  }

  private rebuildIndexes(): void {
    // Clear indexes
    this.eventsByType.clear();
    this.eventsByLocation.clear();

    // Rebuild
    for (const event of this.eventsByTime) {
      // By type
      if (!this.eventsByType.has(event.type)) {
        this.eventsByType.set(event.type, []);
      }
      this.eventsByType.get(event.type)!.push(event);

      // By location
      const locationKey = this.getLocationKey(event.location);
      if (!this.eventsByLocation.has(locationKey)) {
        this.eventsByLocation.set(locationKey, []);
      }
      this.eventsByLocation.get(locationKey)!.push(event);
    }
  }

  private getLocationKey(location: Vector3): string {
    // Spatial hash: divide space into 100km grid cells
    const gridSize = 100000;
    const x = Math.floor(location.x / gridSize);
    const y = Math.floor(location.y / gridSize);
    const z = Math.floor(location.z / gridSize);
    return `${x},${y},${z}`;
  }

  private distanceSquared(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }

  private getCurrentTime(): number {
    // Should get from simulation controller
    return Date.now() / 1000;
  }

  private generateNarrative(events: HistoricalEvent[]): string {
    // Simple narrative generation
    const lines: string[] = [];

    for (const event of events) {
      lines.push(`${this.formatTimestamp(event.timestamp)}: ${event.description}`);
    }

    return lines.join('\n\n');
  }

  private generateChronicleTitle(events: HistoricalEvent[]): string {
    if (events.length === 0) return 'Quiet Times';

    // Find most significant event
    const mostSignificant = events.reduce((max, e) =>
      e.severity > max.severity ? e : max
    , events[0]);

    return `The ${mostSignificant.type.replace(/_/g, ' ')} Era`;
  }

  private findMajorConsequences(events: HistoricalEvent[]): string[] {
    const consequences: string[] = [];

    for (const event of events) {
      for (const consequence of event.consequences) {
        consequences.push(`${event.type} led to ${consequence.type}`);
      }
    }

    return consequences;
  }

  private inferTriggerConditions(event: HistoricalEvent): string[] {
    const conditions: string[] = [];

    // Infer based on event type
    if (event.type.includes('PIRATE')) {
      conditions.push('encounters pirates');
      conditions.push('enters dangerous region');
    }

    if (event.type.includes('COLLISION')) {
      conditions.push('navigates dense traffic');
      conditions.push('approaches asteroids');
    }

    return conditions;
  }

  private formatTimestamp(timestamp: number): string {
    // Convert to human-readable format
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
