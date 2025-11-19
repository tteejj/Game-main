/**
 * UniverseEventSystem.ts
 *
 * Central event bus for 4X gameplay systems communication.
 * This is a foundational system-to-system event bus, distinct from player-facing events.
 *
 * Performance target: <1ms per event emission
 * Memory limit: 10,000 events in history
 * Thread-safe: Uses synchronous event processing with async option
 */

/**
 * Event types covering all critical state changes in the 4X systems
 */
export enum UniverseEventType {
  // Construction Events
  CONSTRUCTION_STARTED = 'CONSTRUCTION_STARTED',
  CONSTRUCTION_COMPLETE = 'CONSTRUCTION_COMPLETE',
  CONSTRUCTION_CANCELLED = 'CONSTRUCTION_CANCELLED',
  CONSTRUCTION_PROGRESS = 'CONSTRUCTION_PROGRESS',

  // Conquest & Territory Events
  SIEGE_STARTED = 'SIEGE_STARTED',
  SIEGE_ENDED = 'SIEGE_ENDED',
  TERRITORY_CAPTURED = 'TERRITORY_CAPTURED',
  TERRITORY_LOST = 'TERRITORY_LOST',
  OCCUPATION_STARTED = 'OCCUPATION_STARTED',
  RESISTANCE_UPRISING = 'RESISTANCE_UPRISING',

  // Research Events
  RESEARCH_STARTED = 'RESEARCH_STARTED',
  RESEARCH_COMPLETED = 'RESEARCH_COMPLETED',
  RESEARCH_BREAKTHROUGH = 'RESEARCH_BREAKTHROUGH',
  TECHNOLOGY_UNLOCKED = 'TECHNOLOGY_UNLOCKED',

  // Population Events
  POPULATION_GROWTH = 'POPULATION_GROWTH',
  POPULATION_DECLINE = 'POPULATION_DECLINE',
  POPULATION_UNREST = 'POPULATION_UNREST',
  POPULATION_MIGRATED = 'POPULATION_MIGRATED',
  POPULATION_HAPPY = 'POPULATION_HAPPY',
  POPULATION_STARVING = 'POPULATION_STARVING',

  // Trade & Economy Events
  TRADE_ROUTE_ESTABLISHED = 'TRADE_ROUTE_ESTABLISHED',
  TRADE_ROUTE_DISRUPTED = 'TRADE_ROUTE_DISRUPTED',
  TRADE_COMPLETED = 'TRADE_COMPLETED',
  MARKET_PRICE_SPIKE = 'MARKET_PRICE_SPIKE',
  MARKET_PRICE_CRASH = 'MARKET_PRICE_CRASH',
  ECONOMIC_BOOM = 'ECONOMIC_BOOM',
  ECONOMIC_RECESSION = 'ECONOMIC_RECESSION',
  RESOURCE_SHORTAGE = 'RESOURCE_SHORTAGE',
  RESOURCE_SURPLUS = 'RESOURCE_SURPLUS',

  // Combat Events
  COMBAT_STARTED = 'COMBAT_STARTED',
  COMBAT_ENDED = 'COMBAT_ENDED',
  SHIP_DESTROYED = 'SHIP_DESTROYED',
  SHIP_DAMAGED = 'SHIP_DAMAGED',
  STATION_ATTACKED = 'STATION_ATTACKED',
  STATION_DESTROYED = 'STATION_DESTROYED',

  // Manufacturing Events
  MANUFACTURING_STARTED = 'MANUFACTURING_STARTED',
  MANUFACTURING_COMPLETE = 'MANUFACTURING_COMPLETE',
  PRODUCTION_QUEUE_CHANGED = 'PRODUCTION_QUEUE_CHANGED',
  STATION_CREATED = 'STATION_CREATED',
  SHIP_MANUFACTURED = 'SHIP_MANUFACTURED',

  // Faction Events
  FACTION_WAR_DECLARED = 'FACTION_WAR_DECLARED',
  FACTION_PEACE_TREATY = 'FACTION_PEACE_TREATY',
  FACTION_ALLIANCE_FORMED = 'FACTION_ALLIANCE_FORMED',
  FACTION_ALLIANCE_BROKEN = 'FACTION_ALLIANCE_BROKEN',
  FACTION_REPUTATION_CHANGED = 'FACTION_REPUTATION_CHANGED',
  FACTION_DISCOVERED = 'FACTION_DISCOVERED',

  // Mining Events
  MINING_STARTED = 'MINING_STARTED',
  MINING_COMPLETE = 'MINING_COMPLETE',
  RESOURCE_DISCOVERED = 'RESOURCE_DISCOVERED',
  ASTEROID_DEPLETED = 'ASTEROID_DEPLETED',

  // Mission Events
  MISSION_OFFERED = 'MISSION_OFFERED',
  MISSION_ACCEPTED = 'MISSION_ACCEPTED',
  MISSION_COMPLETED = 'MISSION_COMPLETED',
  MISSION_FAILED = 'MISSION_FAILED',

  // System Events
  SYSTEM_INITIALIZED = 'SYSTEM_INITIALIZED',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  TICK_UPDATE = 'TICK_UPDATE',

  // Discovery Events
  ANOMALY_DISCOVERED = 'ANOMALY_DISCOVERED',
  PLANET_DISCOVERED = 'PLANET_DISCOVERED',
  DERELICT_FOUND = 'DERELICT_FOUND',

  // Environmental Events
  ENVIRONMENTAL_DISASTER = 'ENVIRONMENTAL_DISASTER',
  STELLAR_FLARE = 'STELLAR_FLARE',
  ASTEROID_IMPACT = 'ASTEROID_IMPACT',
}

/**
 * Event priority levels (0-10)
 * Higher priority events are processed first in priority queues
 */
export enum EventPriority {
  CRITICAL = 10,    // System-critical events (errors, shutdowns)
  URGENT = 8,       // Combat, sieges, disasters
  HIGH = 6,         // Territory changes, wars, major economic events
  NORMAL = 5,       // Most gameplay events
  LOW = 3,          // Background updates, minor changes
  TRIVIAL = 1,      // Debug/logging events
}

/**
 * Core event interface
 */
export interface UniverseEvent<T = any> {
  /** Unique event identifier */
  id: string;

  /** Event type from UniverseEventType enum */
  type: UniverseEventType;

  /** Unix timestamp (milliseconds) when event was created */
  timestamp: number;

  /** Source system that emitted the event */
  source: string;

  /** Target entity affected by the event (optional) */
  target?: string;

  /** Event-specific payload data */
  data: T;

  /** Event priority (0-10) */
  priority: EventPriority;

  /** Tags for filtering and categorization */
  tags?: string[];

  /** Parent event ID if this is a cascade event */
  parentEventId?: string;
}

/**
 * Event subscription callback
 */
export type EventCallback<T = any> = (event: UniverseEvent<T>) => void | Promise<void>;

/**
 * Event filter for history queries
 */
export interface EventFilter {
  /** Filter by event type(s) */
  types?: UniverseEventType[];

  /** Filter by source system(s) */
  sources?: string[];

  /** Filter by target entity(s) */
  targets?: string[];

  /** Filter by priority level (minimum) */
  minPriority?: EventPriority;

  /** Filter by time range */
  startTime?: number;
  endTime?: number;

  /** Filter by tags */
  tags?: string[];

  /** Maximum results to return */
  limit?: number;
}

/**
 * Subscription handle for managing subscriptions
 */
interface Subscription {
  id: string;
  eventType: UniverseEventType | '*';
  callback: EventCallback;
  priority: EventPriority;
}

/**
 * Event statistics for monitoring
 */
export interface EventStats {
  totalEventsEmitted: number;
  eventsByType: Map<UniverseEventType, number>;
  eventsBySources: Map<string, number>;
  averageProcessingTime: number;
  lastEventTime: number;
  subscriptionCount: number;
  historySize: number;
}

/**
 * Central event bus for universe systems
 */
export class EventBus {
  private subscriptions: Map<UniverseEventType | '*', Set<Subscription>> = new Map();
  private history: UniverseEvent[] = [];
  private maxHistorySize: number = 10000;
  private nextEventId: number = 0;
  private nextSubscriptionId: number = 0;

  // Statistics tracking
  private stats = {
    totalEventsEmitted: 0,
    eventsByType: new Map<UniverseEventType, number>(),
    eventsBySources: new Map<string, number>(),
    totalProcessingTime: 0,
    lastEventTime: 0,
  };

  // Performance monitoring
  private performanceMode: boolean = true;
  private warningThreshold: number = 1; // 1ms warning threshold

  /**
   * Subscribe to events of a specific type
   * @param eventType - Event type to subscribe to, or '*' for all events
   * @param callback - Callback function to invoke when event occurs
   * @param priority - Callback priority (higher = called first)
   * @returns Subscription ID for unsubscribing
   */
  subscribe(
    eventType: UniverseEventType | '*',
    callback: EventCallback,
    priority: EventPriority = EventPriority.NORMAL
  ): string {
    const subscriptionId = `sub_${this.nextSubscriptionId++}`;

    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      callback,
      priority,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    this.subscriptions.get(eventType)!.add(subscription);

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   * @param subscriptionId - ID returned from subscribe()
   * @returns True if subscription was found and removed
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      for (const sub of subs) {
        if (sub.id === subscriptionId) {
          subs.delete(sub);
          if (subs.size === 0) {
            this.subscriptions.delete(eventType);
          }
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Unsubscribe all callbacks for a specific event type
   * @param eventType - Event type to clear subscriptions for
   */
  unsubscribeAll(eventType: UniverseEventType | '*'): void {
    this.subscriptions.delete(eventType);
  }

  /**
   * Emit an event asynchronously (non-blocking)
   * Callbacks are invoked asynchronously via Promise.resolve()
   * @param eventType - Type of event to emit
   * @param data - Event payload data
   * @param options - Additional event options
   * @returns Event ID
   */
  emit<T = any>(
    eventType: UniverseEventType,
    data: T,
    options: {
      source: string;
      target?: string;
      priority?: EventPriority;
      tags?: string[];
      parentEventId?: string;
    }
  ): string {
    const event = this.createEvent(eventType, data, options);

    // Add to history
    this.addToHistory(event);

    // Update statistics
    this.updateStats(event);

    // Process asynchronously
    this.processEventAsync(event);

    return event.id;
  }

  /**
   * Emit an event synchronously (blocking)
   * All callbacks are invoked immediately before returning
   * Use for critical events that require immediate processing
   * @param eventType - Type of event to emit
   * @param data - Event payload data
   * @param options - Additional event options
   * @returns Event ID
   */
  emitSync<T = any>(
    eventType: UniverseEventType,
    data: T,
    options: {
      source: string;
      target?: string;
      priority?: EventPriority;
      tags?: string[];
      parentEventId?: string;
    }
  ): string {
    const event = this.createEvent(eventType, data, options);

    // Add to history
    this.addToHistory(event);

    // Update statistics
    this.updateStats(event);

    // Process synchronously
    this.processEventSync(event);

    return event.id;
  }

  /**
   * Create an event object
   */
  private createEvent<T>(
    eventType: UniverseEventType,
    data: T,
    options: {
      source: string;
      target?: string;
      priority?: EventPriority;
      tags?: string[];
      parentEventId?: string;
    }
  ): UniverseEvent<T> {
    return {
      id: `evt_${this.nextEventId++}_${Date.now()}`,
      type: eventType,
      timestamp: Date.now(),
      source: options.source,
      target: options.target,
      data,
      priority: options.priority ?? EventPriority.NORMAL,
      tags: options.tags,
      parentEventId: options.parentEventId,
    };
  }

  /**
   * Process event asynchronously
   */
  private processEventAsync(event: UniverseEvent): void {
    const startTime = performance.now();

    // Get subscribers for this specific event type
    const specificSubs = this.subscriptions.get(event.type);
    // Get wildcard subscribers
    const wildcardSubs = this.subscriptions.get('*');

    // Combine and sort by priority
    const allSubs = [
      ...(specificSubs ? Array.from(specificSubs) : []),
      ...(wildcardSubs ? Array.from(wildcardSubs) : []),
    ].sort((a, b) => b.priority - a.priority);

    // Invoke callbacks asynchronously
    for (const sub of allSubs) {
      Promise.resolve().then(() => {
        try {
          sub.callback(event);
        } catch (error) {
          console.error(`Error in event callback for ${event.type}:`, error);
        }
      });
    }

    // Performance check
    const processingTime = performance.now() - startTime;
    this.checkPerformance(processingTime, event);
  }

  /**
   * Process event synchronously
   */
  private processEventSync(event: UniverseEvent): void {
    const startTime = performance.now();

    // Get subscribers for this specific event type
    const specificSubs = this.subscriptions.get(event.type);
    // Get wildcard subscribers
    const wildcardSubs = this.subscriptions.get('*');

    // Combine and sort by priority
    const allSubs = [
      ...(specificSubs ? Array.from(specificSubs) : []),
      ...(wildcardSubs ? Array.from(wildcardSubs) : []),
    ].sort((a, b) => b.priority - a.priority);

    // Invoke callbacks synchronously
    for (const sub of allSubs) {
      try {
        const result = sub.callback(event);
        // If callback returns a promise, we still process it sync by not awaiting
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Error in async event callback for ${event.type}:`, error);
          });
        }
      } catch (error) {
        console.error(`Error in event callback for ${event.type}:`, error);
      }
    }

    // Performance check
    const processingTime = performance.now() - startTime;
    this.stats.totalProcessingTime += processingTime;
    this.checkPerformance(processingTime, event);
  }

  /**
   * Add event to history with size limit
   */
  private addToHistory(event: UniverseEvent): void {
    this.history.push(event);

    // Maintain max history size
    if (this.history.length > this.maxHistorySize) {
      // Remove oldest events (FIFO)
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(event: UniverseEvent): void {
    this.stats.totalEventsEmitted++;
    this.stats.lastEventTime = event.timestamp;

    // Track by type
    const typeCount = this.stats.eventsByType.get(event.type) || 0;
    this.stats.eventsByType.set(event.type, typeCount + 1);

    // Track by source
    const sourceCount = this.stats.eventsBySources.get(event.source) || 0;
    this.stats.eventsBySources.set(event.source, sourceCount + 1);
  }

  /**
   * Check performance and warn if threshold exceeded
   */
  private checkPerformance(processingTime: number, event: UniverseEvent): void {
    if (this.performanceMode && processingTime > this.warningThreshold) {
      console.warn(
        `[EventBus] Performance warning: Event ${event.type} took ${processingTime.toFixed(2)}ms to process (threshold: ${this.warningThreshold}ms)`
      );
    }
  }

  /**
   * Query event history with filters
   * @param filter - Filter criteria
   * @returns Filtered events sorted by timestamp (newest first)
   */
  getHistory(filter?: EventFilter): UniverseEvent[] {
    let results = [...this.history];

    if (filter) {
      // Filter by types
      if (filter.types && filter.types.length > 0) {
        const typeSet = new Set(filter.types);
        results = results.filter(e => typeSet.has(e.type));
      }

      // Filter by sources
      if (filter.sources && filter.sources.length > 0) {
        const sourceSet = new Set(filter.sources);
        results = results.filter(e => sourceSet.has(e.source));
      }

      // Filter by targets
      if (filter.targets && filter.targets.length > 0) {
        const targetSet = new Set(filter.targets);
        results = results.filter(e => e.target && targetSet.has(e.target));
      }

      // Filter by priority
      if (filter.minPriority !== undefined) {
        results = results.filter(e => e.priority >= filter.minPriority!);
      }

      // Filter by time range
      if (filter.startTime !== undefined) {
        results = results.filter(e => e.timestamp >= filter.startTime!);
      }
      if (filter.endTime !== undefined) {
        results = results.filter(e => e.timestamp <= filter.endTime!);
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(e => {
          if (!e.tags) return false;
          return filter.tags!.some(tag => e.tags!.includes(tag));
        });
      }

      // Apply limit
      if (filter.limit !== undefined && filter.limit > 0) {
        results = results.slice(-filter.limit);
      }
    }

    // Sort by timestamp descending (newest first)
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear event history
   * @param beforeTimestamp - Optional: only clear events before this timestamp
   */
  clearHistory(beforeTimestamp?: number): number {
    if (beforeTimestamp !== undefined) {
      const originalLength = this.history.length;
      this.history = this.history.filter(e => e.timestamp >= beforeTimestamp);
      return originalLength - this.history.length;
    } else {
      const count = this.history.length;
      this.history = [];
      return count;
    }
  }

  /**
   * Get event statistics
   */
  getStats(): EventStats {
    return {
      totalEventsEmitted: this.stats.totalEventsEmitted,
      eventsByType: new Map(this.stats.eventsByType),
      eventsBySources: new Map(this.stats.eventsBySources),
      averageProcessingTime:
        this.stats.totalEventsEmitted > 0
          ? this.stats.totalProcessingTime / this.stats.totalEventsEmitted
          : 0,
      lastEventTime: this.stats.lastEventTime,
      subscriptionCount: Array.from(this.subscriptions.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
      historySize: this.history.length,
    };
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(100, Math.min(100000, size));

    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }

  /**
   * Enable/disable performance monitoring
   */
  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
  }

  /**
   * Set performance warning threshold in milliseconds
   */
  setWarningThreshold(ms: number): void {
    this.warningThreshold = ms;
  }

  /**
   * Get event by ID from history
   */
  getEventById(eventId: string): UniverseEvent | undefined {
    return this.history.find(e => e.id === eventId);
  }

  /**
   * Get events by parent event ID (cascade chains)
   */
  getEventsByParent(parentEventId: string): UniverseEvent[] {
    return this.history.filter(e => e.parentEventId === parentEventId);
  }

  /**
   * Reset the event bus (clear all subscriptions and history)
   * Use with caution - typically only for testing
   */
  reset(): void {
    this.subscriptions.clear();
    this.history = [];
    this.stats = {
      totalEventsEmitted: 0,
      eventsByType: new Map(),
      eventsBySources: new Map(),
      totalProcessingTime: 0,
      lastEventTime: 0,
    };
  }
}

/**
 * Event logger for debugging and monitoring
 */
export class EventLogger {
  private enabled: boolean = true;
  private logLevel: 'ALL' | 'CRITICAL' | 'URGENT' | 'HIGH' | 'NONE' = 'ALL';
  private logToConsole: boolean = true;
  private logs: string[] = [];
  private maxLogs: number = 1000;

  constructor(private eventBus: EventBus) {}

  /**
   * Start logging events
   */
  start(): void {
    this.enabled = true;

    // Subscribe to all events
    this.eventBus.subscribe('*', (event) => {
      this.logEvent(event);
    }, EventPriority.TRIVIAL);
  }

  /**
   * Stop logging events
   */
  stop(): void {
    this.enabled = false;
  }

  /**
   * Log an event
   */
  private logEvent(event: UniverseEvent): void {
    if (!this.enabled) return;

    // Filter by log level
    if (this.logLevel !== 'ALL') {
      if (this.logLevel === 'CRITICAL' && event.priority < EventPriority.CRITICAL) return;
      if (this.logLevel === 'URGENT' && event.priority < EventPriority.URGENT) return;
      if (this.logLevel === 'HIGH' && event.priority < EventPriority.HIGH) return;
      if (this.logLevel === 'NONE') return;
    }

    const timestamp = new Date(event.timestamp).toISOString();
    const logEntry = `[${timestamp}] ${event.source} -> ${event.type}${
      event.target ? ` (target: ${event.target})` : ''
    } [P${event.priority}]`;

    this.logs.push(logEntry);

    // Maintain max logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.logToConsole) {
      const color = this.getPriorityColor(event.priority);
      console.log(`%c${logEntry}`, `color: ${color}`);
    }
  }

  /**
   * Get console color based on priority
   */
  private getPriorityColor(priority: EventPriority): string {
    if (priority >= EventPriority.CRITICAL) return '#ff0000'; // Red
    if (priority >= EventPriority.URGENT) return '#ff8800'; // Orange
    if (priority >= EventPriority.HIGH) return '#ffff00'; // Yellow
    if (priority >= EventPriority.NORMAL) return '#00ff00'; // Green
    return '#888888'; // Gray
  }

  /**
   * Set log level
   */
  setLogLevel(level: 'ALL' | 'CRITICAL' | 'URGENT' | 'HIGH' | 'NONE'): void {
    this.logLevel = level;
  }

  /**
   * Enable/disable console logging
   */
  setConsoleLogging(enabled: boolean): void {
    this.logToConsole = enabled;
  }

  /**
   * Get all logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs to string
   */
  exportLogs(): string {
    return this.logs.join('\n');
  }
}

/**
 * Singleton instance of the event bus
 * This ensures all systems use the same event bus
 */
let globalEventBus: EventBus | null = null;

/**
 * Get the global event bus instance
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

/**
 * Reset the global event bus (primarily for testing)
 */
export function resetGlobalEventBus(): void {
  if (globalEventBus) {
    globalEventBus.reset();
  }
  globalEventBus = null;
}
