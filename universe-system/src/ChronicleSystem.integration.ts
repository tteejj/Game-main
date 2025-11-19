/**
 * ChronicleSystem Integration with UniverseSimulationController
 *
 * Shows how to integrate the Chronicle System into the existing simulation
 * architecture for automatic narrative generation.
 */

import { ChronicleSystem, HistoricalEventExtended, Chronicle } from './ChronicleSystem';
import { HistoricalMemorySystem, HistoricalEvent } from './simulation/HistoricalMemorySystem';
import { UniverseSimulationController } from './simulation/UniverseSimulationController';
import { ConsequenceEngine } from './simulation/ConsequenceEngine';

// ====================================================================
// ENHANCED SIMULATION CONTROLLER WITH CHRONICLES
// ====================================================================

export interface ChronicleConfig {
  enabled: boolean;
  autoGenerateInterval: number;      // How often to auto-generate chronicles (seconds)
  minEventsForChronicle: number;     // Minimum events before generating
  maxChroniclesPerFaction: number;   // Memory management
  significanceThreshold: number;      // Only chronicle significant events
}

export class EnhancedSimulationController extends UniverseSimulationController {
  private chronicleSystem: ChronicleSystem;
  private chronicleConfig: ChronicleConfig;
  private lastChronicleGeneration: number = 0;
  private pendingNarratives: Map<string, Chronicle> = new Map();

  constructor(
    history: HistoricalMemorySystem,
    consequences: ConsequenceEngine,
    config?: any
  ) {
    super(history, consequences, config);

    // Initialize chronicle system
    this.chronicleSystem = new ChronicleSystem(history);

    // Default chronicle config
    this.chronicleConfig = {
      enabled: true,
      autoGenerateInterval: 604800,        // Weekly
      minEventsForChronicle: 5,
      maxChroniclesPerFaction: 10,
      significanceThreshold: 3
    };
  }

  /**
   * Override update to include chronicle generation
   */
  public override update(deltaTime: number, playerSystem: any): void {
    // Call parent update
    super.update(deltaTime, playerSystem);

    // Chronicle generation
    if (this.chronicleConfig.enabled) {
      this.updateChronicles();
    }
  }

  /**
   * Update chronicle generation
   */
  private updateChronicles(): void {
    const state = this.getState();
    const timeSinceLastChronicle = state.simulationTime - this.lastChronicleGeneration;

    if (timeSinceLastChronicle >= this.chronicleConfig.autoGenerateInterval) {
      this.generateAllFactionChronicles();
      this.lastChronicleGeneration = state.simulationTime;
    }
  }

  /**
   * Generate chronicles for all active factions
   */
  private generateAllFactionChronicles(): void {
    const state = this.getState();

    for (const faction of state.activeFactions) {
      // Check if faction has enough events
      const factionEvents = this.chronicleSystem.getFactionHistory(
        faction.id,
        this.chronicleConfig.autoGenerateInterval
      );

      if (factionEvents.length >= this.chronicleConfig.minEventsForChronicle) {
        // Generate chronicle
        const chronicle = this.chronicleSystem.generateNarrative(
          faction.id,
          this.chronicleConfig.autoGenerateInterval,
          {
            perspective: 'FACTION_BIASED',
            detail: 'STANDARD',
            tone: 'EPIC'
          }
        );

        // Store for player to read
        this.pendingNarratives.set(faction.id, chronicle);

        console.log(`[CHRONICLE] Generated "${chronicle.title}" for ${faction.name}`);
      }
    }
  }

  /**
   * Record event with chronicle tracking
   */
  public recordEventWithChronicle(event: HistoricalEvent): void {
    // Convert to extended event
    const extendedEvent: HistoricalEventExtended = {
      ...event,
      actors: event.participants,
      outcome: this.inferEventOutcome(event),
      significance: this.calculateEventSignificance(event),
      consequences: [],
      relatedEvents: []
    };

    // Record to chronicle system
    this.chronicleSystem.recordEvent(extendedEvent);
  }

  /**
   * Infer event outcome from data
   */
  private inferEventOutcome(event: HistoricalEvent): string {
    switch (event.type) {
      case 'WAR_DECLARED':
        return 'Hostilities commenced';

      case 'WAR_ENDED':
        return event.data?.victor ? `${event.data.victor} emerged victorious` : 'Peace treaty signed';

      case 'BATTLE':
        return event.data?.victor ? `${event.data.victor} victory` : 'Inconclusive battle';

      case 'STATION_DESTROYED':
        return `Station obliterated with all hands`;

      case 'STATION_CAPTURED':
        return `Station now under ${event.data?.newController} control`;

      case 'TRADE_COMPLETED':
        return `Trade successful, both parties profited`;

      case 'PIRATE_RAID':
        return event.data?.success ? 'Pirates escaped with cargo' : 'Pirates defeated';

      case 'ECONOMIC_BOOM':
        return `Markets surged, prosperity increased`;

      case 'MARKET_CRASH':
        return `Markets collapsed, fortunes lost`;

      default:
        return event.description;
    }
  }

  /**
   * Calculate significance for chronicle system
   */
  private calculateEventSignificance(event: HistoricalEvent): number {
    let significance = event.severity;

    // Adjust based on participants
    significance += Math.min(2, event.participants.length * 0.2);

    // Adjust based on event type
    const majorEvents = [
      'WAR_DECLARED', 'WAR_ENDED', 'STATION_DESTROYED',
      'ALLIANCE_FORMED', 'TREATY_SIGNED', 'STATION_CAPTURED'
    ];

    if (majorEvents.includes(event.type)) {
      significance += 2;
    }

    // Player witnessed = more significant to player
    if (event.witnessed) {
      significance += 1;
    }

    return Math.min(10, Math.max(0, significance));
  }

  /**
   * Get pending narratives for UI display
   */
  public getPendingNarratives(): Chronicle[] {
    return Array.from(this.pendingNarratives.values());
  }

  /**
   * Clear pending narrative (player has read it)
   */
  public markNarrativeRead(factionId: string): void {
    this.pendingNarratives.delete(factionId);
  }

  /**
   * Get faction chronicle summary (for UI)
   */
  public getFactionChronicles(factionId: string): Chronicle[] {
    return this.chronicleSystem.getChronicles(factionId);
  }

  /**
   * Generate on-demand chronicle (e.g., player requests history)
   */
  public generateChronicleOnDemand(
    factionId: string,
    timespan: number,
    style?: any
  ): Chronicle {
    return this.chronicleSystem.generateNarrative(factionId, timespan, style);
  }

  /**
   * Get significant events for news feed
   */
  public getNewsWorthyEvents(limit: number = 5): HistoricalEventExtended[] {
    return this.chronicleSystem.getSignificantEvents(limit);
  }

  /**
   * Get event chain for detailed investigation
   */
  public investigateEvent(eventId: string) {
    return this.chronicleSystem.getEventChain(eventId);
  }

  /**
   * Get chronicle system stats
   */
  public getChronicleStats() {
    return this.chronicleSystem.getPerformanceStats();
  }

  /**
   * Configure chronicle generation
   */
  public configureChronicles(config: Partial<ChronicleConfig>): void {
    this.chronicleConfig = { ...this.chronicleConfig, ...config };
  }
}

// ====================================================================
// INTEGRATION HELPERS
// ====================================================================

/**
 * Subscribe to simulation events and record to chronicles
 */
export class ChronicleEventSubscriber {
  private chronicleSystem: ChronicleSystem;

  constructor(chronicleSystem: ChronicleSystem) {
    this.chronicleSystem = chronicleSystem;
  }

  /**
   * Handle event from UniverseSimulationController
   */
  public onSimulationEvent(event: HistoricalEvent): void {
    // Convert to extended event
    const extended: HistoricalEventExtended = {
      ...event,
      actors: event.participants,
      outcome: this.generateOutcome(event),
      significance: this.calculateSignificance(event),
      consequences: [],
      relatedEvents: []
    };

    // Record to chronicle system
    this.chronicleSystem.recordEvent(extended);

    // Auto-link related events
    this.linkToRecentEvents(extended);
  }

  /**
   * Generate outcome text
   */
  private generateOutcome(event: HistoricalEvent): string {
    if (event.data?.outcome) return event.data.outcome;

    // Generate based on event type
    switch (event.category) {
      case 'MILITARY':
        return event.data?.victor
          ? `${event.data.victor} achieved military objective`
          : 'Conflict outcome unclear';

      case 'ECONOMIC':
        return event.severity > 6
          ? 'Major economic impact across region'
          : 'Local economic effects';

      case 'DIPLOMATIC':
        return 'Diplomatic landscape shifted';

      case 'SOCIAL':
        return event.severity > 6
          ? 'Widespread social unrest'
          : 'Limited social impact';

      default:
        return event.description;
    }
  }

  /**
   * Calculate significance
   */
  private calculateSignificance(event: HistoricalEvent): number {
    return Math.min(10, event.severity + (event.witnessed ? 1 : 0));
  }

  /**
   * Auto-link to recent related events
   */
  private linkToRecentEvents(event: HistoricalEventExtended): void {
    const recentEvents = this.chronicleSystem.queryEvents({
      endTime: event.timestamp,
      startTime: event.timestamp - 3600,
      limit: 10
    });

    for (const recent of recentEvents) {
      if (recent.id === event.id) continue;

      // Check for participant overlap
      const sharedParticipants = event.participants.filter(p =>
        recent.participants.includes(p)
      );

      if (sharedParticipants.length > 0) {
        this.chronicleSystem.linkEvents(
          recent.id,
          event.id,
          'CONSEQUENCE',
          sharedParticipants.length / Math.max(event.participants.length, recent.participants.length)
        );
      }
    }
  }
}

// ====================================================================
// UI INTEGRATION
// ====================================================================

/**
 * Chronicle UI Manager - for displaying chronicles to player
 */
export class ChronicleUIManager {
  private chronicleSystem: ChronicleSystem;
  private readChronicles: Set<string> = new Set();

  constructor(chronicleSystem: ChronicleSystem) {
    this.chronicleSystem = chronicleSystem;
  }

  /**
   * Get new chronicles for player
   */
  public getNewChronicles(): Chronicle[] {
    const allChronicles = this.chronicleSystem.getChronicles();
    return allChronicles.filter(c => !this.readChronicles.has(c.id));
  }

  /**
   * Mark chronicle as read
   */
  public markRead(chronicleId: string): void {
    this.readChronicles.add(chronicleId);
  }

  /**
   * Get chronicle summary for notification
   */
  public formatChronicleNotification(chronicle: Chronicle): string {
    return `New Chronicle: "${chronicle.title}" - ${chronicle.events.length} major events recorded`;
  }

  /**
   * Format chronicle for display
   */
  public formatChronicleForDisplay(chronicle: Chronicle): {
    title: string;
    subtitle: string;
    narrative: string;
    metadata: string[];
  } {
    const timespan = this.formatTimespan(chronicle.timespan.end - chronicle.timespan.start);

    return {
      title: chronicle.title,
      subtitle: `${timespan} • ${chronicle.events.length} events • Significance: ${chronicle.significance}/10`,
      narrative: chronicle.narrative,
      metadata: [
        `Key Figures: ${chronicle.keyFigures.join(', ')}`,
        `Turning Points: ${chronicle.turningPoints.length}`,
        `Tags: ${chronicle.tags.join(', ')}`
      ]
    };
  }

  /**
   * Get recent significant events for news ticker
   */
  public getNewsTicker(limit: number = 5): string[] {
    const events = this.chronicleSystem.getSignificantEvents(limit);
    return events.map(e => `BREAKING: ${e.description}`);
  }

  private formatTimespan(seconds: number): string {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
    return `${Math.floor(seconds / 604800)} weeks`;
  }
}

// ====================================================================
// USAGE EXAMPLE
// ====================================================================

export function demonstrateIntegration() {
  console.log('=== Chronicle System Integration Example ===\n');

  // 1. Set up systems
  const history = new HistoricalMemorySystem();
  const consequences = new ConsequenceEngine(history);
  const simulation = new EnhancedSimulationController(history, consequences);

  // 2. Configure chronicle generation
  simulation.configureChronicles({
    enabled: true,
    autoGenerateInterval: 86400,        // Daily chronicles
    minEventsForChronicle: 3,
    significanceThreshold: 5
  });

  // 3. Set up event subscriber
  const chronicleSystem = new ChronicleSystem(history);
  const subscriber = new ChronicleEventSubscriber(chronicleSystem);

  // 4. Set up UI manager
  const uiManager = new ChronicleUIManager(chronicleSystem);

  // Simulate events
  const event1: HistoricalEvent = {
    id: 'evt_001',
    timestamp: 1000,
    type: 'WAR_DECLARED',
    severity: 9,
    category: 'MILITARY',
    location: { x: 0, y: 0, z: 0 },
    participants: ['faction_a', 'faction_b'],
    description: 'War declared between Faction A and Faction B',
    data: {},
    consequences: [],
    witnessed: true,
    priority: 10,
    tags: ['war']
  };

  // 5. Record event through subscriber
  subscriber.onSimulationEvent(event1);

  // 6. Get chronicles for display
  const newChronicles = uiManager.getNewChronicles();
  console.log(`New chronicles available: ${newChronicles.length}`);

  // 7. Display news ticker
  const news = uiManager.getNewsTicker(3);
  console.log('\nNews Ticker:');
  news.forEach(n => console.log(`- ${n}`));

  // 8. Get stats
  const stats = simulation.getChronicleStats();
  console.log('\nChronicle System Statistics:');
  console.log(`- Total events tracked: ${stats.totalEvents}`);
  console.log(`- Total relationships: ${stats.totalRelationships}`);
  console.log(`- Total chronicles: ${stats.totalChronicles}`);
  console.log(`- Average query time: ${stats.averageQueryTime.toFixed(2)}ms`);

  console.log('\nIntegration demonstration complete!');
}

// ====================================================================
// EXPORT FOR USE IN MAIN SIMULATION
// ====================================================================

export {
  ChronicleSystem,
  ChronicleEventSubscriber,
  ChronicleUIManager,
  EnhancedSimulationController
};

// Run demonstration if executed directly
if (require.main === module) {
  demonstrateIntegration();
}
