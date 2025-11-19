/**
 * UniverseEventSystem Usage Examples
 *
 * Demonstrates how to integrate the event bus with existing 4X gameplay systems
 */

import {
  EventBus,
  EventLogger,
  UniverseEventType,
  EventPriority,
  UniverseEvent,
  getGlobalEventBus,
} from '../UniverseEventSystem';

// ============================================================================
// Example 1: Basic Event Emission
// ============================================================================

function example1_BasicEventEmission() {
  console.log('\n=== Example 1: Basic Event Emission ===\n');

  const eventBus = new EventBus();

  // Emit a simple event
  const eventId = eventBus.emit(
    UniverseEventType.CONSTRUCTION_COMPLETE,
    {
      buildingType: 'FACTORY',
      cityId: 'city_001',
      outputBonus: 0.15,
    },
    {
      source: 'ConstructionSystem',
      target: 'city_001',
      priority: EventPriority.NORMAL,
      tags: ['economy', 'production'],
    }
  );

  console.log(`Event emitted with ID: ${eventId}`);

  // Emit a critical event synchronously
  const criticalId = eventBus.emitSync(
    UniverseEventType.SIEGE_STARTED,
    {
      attackerFaction: 'PIRATES',
      defenderFaction: 'FEDERATION',
      stationId: 'station_alpha',
      attackingForce: 5000,
    },
    {
      source: 'ConquestSystem',
      target: 'station_alpha',
      priority: EventPriority.CRITICAL,
      tags: ['combat', 'siege'],
    }
  );

  console.log(`Critical event emitted synchronously: ${criticalId}`);
}

// ============================================================================
// Example 2: Subscribing to Events
// ============================================================================

function example2_SubscribingToEvents() {
  console.log('\n=== Example 2: Subscribing to Events ===\n');

  const eventBus = new EventBus();

  // Subscribe to specific event type
  const subId1 = eventBus.subscribe(
    UniverseEventType.POPULATION_MIGRATED,
    (event) => {
      console.log(`Population migrated from ${event.data.fromCity} to ${event.data.toCity}`);
      console.log(`  Count: ${event.data.count} citizens`);
      console.log(`  Reason: ${event.data.reason}`);
    },
    EventPriority.NORMAL
  );

  // Subscribe to all events with wildcard
  const subId2 = eventBus.subscribe(
    '*',
    (event) => {
      console.log(`[ALL EVENTS] ${event.type} from ${event.source}`);
    },
    EventPriority.LOW
  );

  // Emit some events to trigger subscriptions
  eventBus.emit(
    UniverseEventType.POPULATION_MIGRATED,
    {
      fromCity: 'city_001',
      toCity: 'city_002',
      count: 1500,
      reason: 'ECONOMIC_OPPORTUNITY',
    },
    {
      source: 'PopulationSystem',
      priority: EventPriority.NORMAL,
    }
  );

  eventBus.emit(
    UniverseEventType.RESEARCH_COMPLETED,
    {
      technologyId: 'tech_advanced_shields',
      factionId: 'faction_terran',
      researchTime: 86400,
    },
    {
      source: 'ResearchSystem',
      priority: EventPriority.HIGH,
    }
  );

  // Unsubscribe
  eventBus.unsubscribe(subId1);
  eventBus.unsubscribe(subId2);

  console.log('Subscriptions cleaned up');
}

// ============================================================================
// Example 3: Event History and Filtering
// ============================================================================

function example3_EventHistoryFiltering() {
  console.log('\n=== Example 3: Event History and Filtering ===\n');

  const eventBus = new EventBus();

  // Emit a series of events
  for (let i = 0; i < 5; i++) {
    eventBus.emit(
      UniverseEventType.TRADE_COMPLETED,
      { tradeValue: 1000 * (i + 1), goods: ['minerals', 'food'] },
      { source: 'EconomySystem', priority: EventPriority.LOW }
    );
  }

  eventBus.emit(
    UniverseEventType.COMBAT_STARTED,
    { attacker: 'pirate_001', defender: 'patrol_001' },
    { source: 'CombatSystem', priority: EventPriority.URGENT }
  );

  eventBus.emit(
    UniverseEventType.TERRITORY_CAPTURED,
    { attackerFaction: 'EMPIRE', capturedTerritory: 'sector_7' },
    { source: 'ConquestSystem', priority: EventPriority.CRITICAL, tags: ['conquest'] }
  );

  // Query all events
  const allEvents = eventBus.getHistory();
  console.log(`Total events in history: ${allEvents.length}`);

  // Filter by event type
  const tradeEvents = eventBus.getHistory({
    types: [UniverseEventType.TRADE_COMPLETED],
  });
  console.log(`Trade events: ${tradeEvents.length}`);

  // Filter by priority
  const urgentEvents = eventBus.getHistory({
    minPriority: EventPriority.URGENT,
  });
  console.log(`Urgent+ events: ${urgentEvents.length}`);

  // Filter by source
  const combatEvents = eventBus.getHistory({
    sources: ['CombatSystem'],
  });
  console.log(`Combat system events: ${combatEvents.length}`);

  // Filter by tags
  const conquestEvents = eventBus.getHistory({
    tags: ['conquest'],
  });
  console.log(`Conquest tagged events: ${conquestEvents.length}`);

  // Get recent events with limit
  const recentEvents = eventBus.getHistory({
    limit: 3,
  });
  console.log(`\nMost recent 3 events:`);
  recentEvents.forEach((e) => {
    console.log(`  - ${e.type} from ${e.source}`);
  });

  // Clear old events
  const now = Date.now();
  const cleared = eventBus.clearHistory(now - 5000); // Clear events older than 5 seconds
  console.log(`\nCleared ${cleared} old events`);
}

// ============================================================================
// Example 4: Integration with ConquestSystem
// ============================================================================

class ConquestSystemIntegration {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Listen for combat events that might escalate to sieges
    this.eventBus.subscribe(
      UniverseEventType.STATION_ATTACKED,
      (event) => this.handleStationAttacked(event),
      EventPriority.HIGH
    );

    // Listen for siege completions
    this.eventBus.subscribe(
      UniverseEventType.SIEGE_ENDED,
      (event) => this.handleSiegeEnded(event),
      EventPriority.HIGH
    );
  }

  private handleStationAttacked(event: UniverseEvent) {
    console.log(`[ConquestSystem] Station ${event.target} under attack!`);

    // If attack is severe enough, start a siege
    if (event.data.attackStrength > 1000) {
      this.startSiege(event.data);
    }
  }

  private startSiege(attackData: any) {
    // Emit siege started event
    this.eventBus.emitSync(
      UniverseEventType.SIEGE_STARTED,
      {
        attackerFaction: attackData.attackerFaction,
        defenderFaction: attackData.defenderFaction,
        targetId: attackData.targetId,
        estimatedDuration: 86400, // 24 hours in seconds
      },
      {
        source: 'ConquestSystem',
        target: attackData.targetId,
        priority: EventPriority.CRITICAL,
        tags: ['siege', 'warfare'],
      }
    );

    console.log(`[ConquestSystem] Siege initiated on ${attackData.targetId}`);
  }

  private handleSiegeEnded(event: UniverseEvent) {
    if (event.data.outcome === 'ATTACKER_VICTORY') {
      // Emit territory captured event
      this.eventBus.emit(
        UniverseEventType.TERRITORY_CAPTURED,
        {
          newOwner: event.data.attackerFaction,
          previousOwner: event.data.defenderFaction,
          territoryId: event.target,
          captureTime: Date.now(),
        },
        {
          source: 'ConquestSystem',
          target: event.target,
          priority: EventPriority.CRITICAL,
          tags: ['conquest', 'territorial'],
          parentEventId: event.id, // Create event chain
        }
      );

      console.log(`[ConquestSystem] Territory ${event.target} captured!`);
    }
  }

  // Simulate siege progression
  updateSiege(siegeId: string, progress: number) {
    if (progress >= 1.0) {
      this.eventBus.emit(
        UniverseEventType.SIEGE_ENDED,
        {
          siegeId,
          outcome: 'ATTACKER_VICTORY',
          attackerFaction: 'EMPIRE',
          defenderFaction: 'FEDERATION',
          duration: 86400,
          casualties: 5000,
        },
        {
          source: 'ConquestSystem',
          target: 'station_alpha',
          priority: EventPriority.CRITICAL,
        }
      );
    }
  }
}

function example4_ConquestIntegration() {
  console.log('\n=== Example 4: ConquestSystem Integration ===\n');

  const eventBus = new EventBus();
  const conquestSystem = new ConquestSystemIntegration(eventBus);

  // Simulate a station attack
  eventBus.emit(
    UniverseEventType.STATION_ATTACKED,
    {
      attackerFaction: 'EMPIRE',
      defenderFaction: 'FEDERATION',
      targetId: 'station_alpha',
      attackStrength: 1500,
    },
    {
      source: 'CombatSystem',
      target: 'station_alpha',
      priority: EventPriority.URGENT,
    }
  );

  // Simulate siege completion
  setTimeout(() => {
    conquestSystem.updateSiege('siege_001', 1.0);

    // Show event chain
    const events = eventBus.getHistory();
    console.log('\nEvent chain:');
    events.forEach((e) => {
      console.log(`  ${e.type}${e.parentEventId ? ` (child of ${e.parentEventId})` : ''}`);
    });
  }, 100);
}

// ============================================================================
// Example 5: Integration with PopulationSystem
// ============================================================================

class PopulationSystemIntegration {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Listen for economic events that affect population
    this.eventBus.subscribe(
      UniverseEventType.ECONOMIC_RECESSION,
      (event) => this.handleEconomicChange(event, 'recession'),
      EventPriority.NORMAL
    );

    this.eventBus.subscribe(
      UniverseEventType.ECONOMIC_BOOM,
      (event) => this.handleEconomicChange(event, 'boom'),
      EventPriority.NORMAL
    );

    // Listen for sieges that affect population
    this.eventBus.subscribe(
      UniverseEventType.SIEGE_STARTED,
      (event) => this.handleSiegeImpact(event),
      EventPriority.HIGH
    );

    // Listen for resource shortages
    this.eventBus.subscribe(
      UniverseEventType.RESOURCE_SHORTAGE,
      (event) => this.handleResourceShortage(event),
      EventPriority.HIGH
    );
  }

  private handleEconomicChange(event: UniverseEvent, type: 'boom' | 'recession') {
    if (type === 'recession') {
      // Trigger unrest
      this.eventBus.emit(
        UniverseEventType.POPULATION_UNREST,
        {
          cityId: event.target,
          unrestLevel: 0.6,
          reason: 'ECONOMIC_HARDSHIP',
          affectedPopulation: 50000,
        },
        {
          source: 'PopulationSystem',
          target: event.target,
          priority: EventPriority.HIGH,
          tags: ['unrest', 'economic'],
          parentEventId: event.id,
        }
      );

      console.log(`[PopulationSystem] Unrest brewing in ${event.target} due to recession`);
    } else {
      // Population growth during boom
      this.eventBus.emit(
        UniverseEventType.POPULATION_GROWTH,
        {
          cityId: event.target,
          growthRate: 0.05,
          newPopulation: 52500,
        },
        {
          source: 'PopulationSystem',
          target: event.target,
          priority: EventPriority.NORMAL,
          parentEventId: event.id,
        }
      );

      console.log(`[PopulationSystem] Population boom in ${event.target}!`);
    }
  }

  private handleSiegeImpact(event: UniverseEvent) {
    // Civilians flee from siege
    this.eventBus.emit(
      UniverseEventType.POPULATION_MIGRATED,
      {
        fromCity: event.target,
        toCity: 'refugee_camp_001',
        count: 10000,
        reason: 'FLEEING_CONFLICT',
        urgency: 'CRITICAL',
      },
      {
        source: 'PopulationSystem',
        target: event.target,
        priority: EventPriority.URGENT,
        tags: ['migration', 'refugees', 'war'],
        parentEventId: event.id,
      }
    );

    console.log(`[PopulationSystem] 10,000 refugees fleeing ${event.target}`);
  }

  private handleResourceShortage(event: UniverseEvent) {
    if (event.data.resource === 'food') {
      // Food shortage causes starvation
      this.eventBus.emitSync(
        UniverseEventType.POPULATION_STARVING,
        {
          cityId: event.target,
          affectedPopulation: event.data.population,
          severity: 'HIGH',
          daysOfSupply: event.data.daysRemaining,
        },
        {
          source: 'PopulationSystem',
          target: event.target,
          priority: EventPriority.CRITICAL,
          tags: ['humanitarian', 'crisis'],
          parentEventId: event.id,
        }
      );

      console.log(`[PopulationSystem] CRITICAL: Population starving in ${event.target}!`);
    }
  }
}

function example5_PopulationIntegration() {
  console.log('\n=== Example 5: PopulationSystem Integration ===\n');

  const eventBus = new EventBus();
  const populationSystem = new PopulationSystemIntegration(eventBus);

  // Trigger economic recession
  eventBus.emit(
    UniverseEventType.ECONOMIC_RECESSION,
    {
      gdpChange: -0.15,
      unemploymentRate: 0.25,
      duration: 30 * 86400, // 30 days
    },
    {
      source: 'EconomySystem',
      target: 'city_metropolis',
      priority: EventPriority.HIGH,
    }
  );

  // Trigger resource shortage
  setTimeout(() => {
    eventBus.emit(
      UniverseEventType.RESOURCE_SHORTAGE,
      {
        resource: 'food',
        population: 100000,
        daysRemaining: 3,
        severity: 0.9,
      },
      {
        source: 'EconomySystem',
        target: 'city_outpost',
        priority: EventPriority.CRITICAL,
      }
    );

    // Show cascade effects
    const events = eventBus.getHistory();
    console.log('\n=== Event Cascade Effects ===');
    events.forEach((e) => {
      console.log(`${e.type} [P${e.priority}]${e.parentEventId ? ' ↳' : ''}`);
    });
  }, 100);
}

// ============================================================================
// Example 6: Event Logger Usage
// ============================================================================

function example6_EventLogger() {
  console.log('\n=== Example 6: Event Logger ===\n');

  const eventBus = new EventBus();
  const logger = new EventLogger(eventBus);

  // Configure logger
  logger.setLogLevel('HIGH'); // Only log HIGH+ priority events
  logger.setConsoleLogging(true);

  // Start logging
  logger.start();

  // Emit various events
  eventBus.emit(
    UniverseEventType.TRADE_COMPLETED,
    { value: 500 },
    { source: 'EconomySystem', priority: EventPriority.LOW }
  ); // Won't be logged (LOW priority)

  eventBus.emit(
    UniverseEventType.FACTION_WAR_DECLARED,
    { faction1: 'EMPIRE', faction2: 'REBELS' },
    { source: 'FactionSystem', priority: EventPriority.HIGH }
  ); // Will be logged

  eventBus.emit(
    UniverseEventType.STATION_DESTROYED,
    { stationId: 'station_001' },
    { source: 'CombatSystem', priority: EventPriority.CRITICAL }
  ); // Will be logged

  // Export logs
  setTimeout(() => {
    const logs = logger.exportLogs();
    console.log('\n=== Exported Logs ===');
    console.log(logs);

    logger.stop();
  }, 100);
}

// ============================================================================
// Example 7: Performance Monitoring
// ============================================================================

function example7_PerformanceMonitoring() {
  console.log('\n=== Example 7: Performance Monitoring ===\n');

  const eventBus = new EventBus();

  // Enable performance warnings
  eventBus.setPerformanceMode(true);
  eventBus.setWarningThreshold(0.5); // Warn if event takes >0.5ms

  // Add a slow subscriber (simulated)
  eventBus.subscribe(
    UniverseEventType.TICK_UPDATE,
    (event) => {
      // Simulate slow processing
      const start = performance.now();
      while (performance.now() - start < 2) {
        // Busy wait for 2ms
      }
    },
    EventPriority.NORMAL
  );

  // Emit event (will trigger performance warning)
  eventBus.emit(
    UniverseEventType.TICK_UPDATE,
    { deltaTime: 16.67 },
    { source: 'GameLoop', priority: EventPriority.NORMAL }
  );

  // Get statistics
  setTimeout(() => {
    const stats = eventBus.getStats();
    console.log('\n=== Event Bus Statistics ===');
    console.log(`Total events emitted: ${stats.totalEventsEmitted}`);
    console.log(`Average processing time: ${stats.averageProcessingTime.toFixed(3)}ms`);
    console.log(`Subscription count: ${stats.subscriptionCount}`);
    console.log(`History size: ${stats.historySize}`);

    console.log('\nEvents by type:');
    stats.eventsByType.forEach((count, type) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\nEvents by source:');
    stats.eventsBySources.forEach((count, source) => {
      console.log(`  ${source}: ${count}`);
    });
  }, 100);
}

// ============================================================================
// Example 8: Global Event Bus Pattern
// ============================================================================

function example8_GlobalEventBus() {
  console.log('\n=== Example 8: Global Event Bus Pattern ===\n');

  // Get global singleton instance
  const eventBus1 = getGlobalEventBus();
  const eventBus2 = getGlobalEventBus();

  console.log(`Same instance? ${eventBus1 === eventBus2}`); // true

  // All systems can now share the same event bus
  eventBus1.emit(
    UniverseEventType.SYSTEM_INITIALIZED,
    { systemName: 'PopulationSystem' },
    { source: 'PopulationSystem', priority: EventPriority.NORMAL }
  );

  eventBus2.subscribe(UniverseEventType.SYSTEM_INITIALIZED, (event) => {
    console.log(`System initialized: ${event.data.systemName}`);
  });

  // Emit another event to trigger subscription
  eventBus1.emit(
    UniverseEventType.SYSTEM_INITIALIZED,
    { systemName: 'EconomySystem' },
    { source: 'EconomySystem', priority: EventPriority.NORMAL }
  );
}

// ============================================================================
// Example 9: Complete System Integration
// ============================================================================

class CompleteSystemIntegration {
  private eventBus: EventBus;
  private logger: EventLogger;

  constructor() {
    this.eventBus = getGlobalEventBus();
    this.logger = new EventLogger(this.eventBus);

    this.setupLogging();
    this.setupCrossSy stemHandlers();
  }

  private setupLogging() {
    this.logger.setLogLevel('HIGH');
    this.logger.start();
  }

  private setupCrossSystemHandlers() {
    // Economy affects population
    this.eventBus.subscribe(
      UniverseEventType.MARKET_PRICE_SPIKE,
      (event) => {
        if (event.data.commodity === 'food') {
          this.eventBus.emit(
            UniverseEventType.RESOURCE_SHORTAGE,
            {
              resource: 'food',
              severity: 0.7,
              affectedCities: event.data.affectedCities,
            },
            {
              source: 'EconomySystem',
              priority: EventPriority.HIGH,
              parentEventId: event.id,
            }
          );
        }
      },
      EventPriority.NORMAL
    );

    // Research unlocks new constructions
    this.eventBus.subscribe(
      UniverseEventType.TECHNOLOGY_UNLOCKED,
      (event) => {
        console.log(`[Integration] New technology unlocked: ${event.data.technologyId}`);

        if (event.data.enablesConstruction) {
          this.eventBus.emit(
            UniverseEventType.CONSTRUCTION_STARTED,
            {
              buildingType: event.data.newBuilding,
              cityId: event.data.cityId,
              enabledBy: event.data.technologyId,
            },
            {
              source: 'ConstructionSystem',
              target: event.data.cityId,
              priority: EventPriority.NORMAL,
              parentEventId: event.id,
            }
          );
        }
      },
      EventPriority.NORMAL
    );

    // Territory capture affects trade routes
    this.eventBus.subscribe(
      UniverseEventType.TERRITORY_CAPTURED,
      (event) => {
        this.eventBus.emit(
          UniverseEventType.TRADE_ROUTE_DISRUPTED,
          {
            routeId: `route_via_${event.target}`,
            reason: 'TERRITORY_CAPTURED',
            newOwner: event.data.newOwner,
          },
          {
            source: 'EconomySystem',
            priority: EventPriority.HIGH,
            parentEventId: event.id,
          }
        );
      },
      EventPriority.HIGH
    );
  }

  simulate() {
    console.log('\n=== Full System Simulation ===\n');

    // Start with research completion
    this.eventBus.emit(
      UniverseEventType.RESEARCH_COMPLETED,
      {
        technologyId: 'tech_advanced_manufacturing',
        factionId: 'faction_terran',
      },
      {
        source: 'ResearchSystem',
        priority: EventPriority.HIGH,
      }
    );

    // Which unlocks technology
    setTimeout(() => {
      this.eventBus.emit(
        UniverseEventType.TECHNOLOGY_UNLOCKED,
        {
          technologyId: 'tech_advanced_manufacturing',
          enablesConstruction: true,
          newBuilding: 'ADVANCED_FACTORY',
          cityId: 'city_001',
        },
        {
          source: 'ResearchSystem',
          priority: EventPriority.NORMAL,
        }
      );
    }, 50);

    // Show full event cascade
    setTimeout(() => {
      const events = eventBus.getHistory();
      console.log('\n=== Complete Event Chain ===');
      events.forEach((e, i) => {
        const indent = e.parentEventId ? '  ↳ ' : '';
        console.log(`${indent}${i + 1}. ${e.type} [${e.source}]`);
      });

      // Show statistics
      const stats = this.eventBus.getStats();
      console.log(`\nTotal events: ${stats.totalEventsEmitted}`);
      console.log(`Average processing: ${stats.averageProcessingTime.toFixed(3)}ms`);
    }, 200);
  }
}

function example9_CompleteIntegration() {
  const integration = new CompleteSystemIntegration();
  integration.simulate();
}

// ============================================================================
// Run All Examples
// ============================================================================

function runAllExamples() {
  example1_BasicEventEmission();

  setTimeout(() => {
    example2_SubscribingToEvents();
  }, 200);

  setTimeout(() => {
    example3_EventHistoryFiltering();
  }, 400);

  setTimeout(() => {
    example4_ConquestIntegration();
  }, 600);

  setTimeout(() => {
    example5_PopulationIntegration();
  }, 1000);

  setTimeout(() => {
    example6_EventLogger();
  }, 1400);

  setTimeout(() => {
    example7_PerformanceMonitoring();
  }, 1600);

  setTimeout(() => {
    example8_GlobalEventBus();
  }, 1800);

  setTimeout(() => {
    example9_CompleteIntegration();
  }, 2000);
}

// Export for use
export {
  example1_BasicEventEmission,
  example2_SubscribingToEvents,
  example3_EventHistoryFiltering,
  example4_ConquestIntegration,
  example5_PopulationIntegration,
  example6_EventLogger,
  example7_PerformanceMonitoring,
  example8_GlobalEventBus,
  example9_CompleteIntegration,
  runAllExamples,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
