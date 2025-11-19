/**
 * Complete Integration Example
 *
 * Demonstrates how UniverseEventSystem integrates with all 4X gameplay systems
 * This shows the event-driven architecture in action.
 */

import {
  getGlobalEventBus,
  UniverseEventType,
  EventPriority,
  EventLogger,
  UniverseEvent,
} from '../UniverseEventSystem';

// ============================================================================
// MOCK SYSTEMS (In real implementation, these would be actual game systems)
// ============================================================================

/**
 * Population System - Manages city populations
 */
class PopulationSystemIntegrated {
  private eventBus = getGlobalEventBus();
  private populations: Map<string, number> = new Map();

  constructor() {
    this.setupEventHandlers();
    this.emitSystemInit();
  }

  private setupEventHandlers() {
    // Listen for economic events
    this.eventBus.subscribe(
      UniverseEventType.ECONOMIC_RECESSION,
      (event) => this.handleEconomicRecession(event),
      EventPriority.HIGH
    );

    this.eventBus.subscribe(
      UniverseEventType.RESOURCE_SHORTAGE,
      (event) => this.handleResourceShortage(event),
      EventPriority.CRITICAL
    );

    // Listen for war events
    this.eventBus.subscribe(
      UniverseEventType.SIEGE_STARTED,
      (event) => this.handleSiege(event),
      EventPriority.URGENT
    );
  }

  private emitSystemInit() {
    this.eventBus.emit(
      UniverseEventType.SYSTEM_INITIALIZED,
      { systemName: 'PopulationSystem', version: '1.0' },
      { source: 'PopulationSystem', priority: EventPriority.NORMAL }
    );
  }

  private handleEconomicRecession(event: UniverseEvent) {
    console.log(`[Population] Economic recession affecting ${event.target}`);

    // Trigger unrest
    this.eventBus.emit(
      UniverseEventType.POPULATION_UNREST,
      {
        cityId: event.target,
        unrestLevel: 0.65,
        reason: 'ECONOMIC_HARDSHIP',
        affectedPopulation: 50000,
      },
      {
        source: 'PopulationSystem',
        target: event.target,
        priority: EventPriority.HIGH,
        tags: ['unrest', 'economy'],
        parentEventId: event.id,
      }
    );
  }

  private handleResourceShortage(event: UniverseEvent) {
    if (event.data.resource === 'food') {
      console.log(`[Population] CRITICAL: Food shortage in ${event.target}`);

      // Population starts migrating
      this.eventBus.emitSync(
        UniverseEventType.POPULATION_MIGRATED,
        {
          fromCity: event.target,
          toCity: 'refugee_camp',
          count: 10000,
          reason: 'FOOD_SHORTAGE',
        },
        {
          source: 'PopulationSystem',
          target: event.target,
          priority: EventPriority.CRITICAL,
          tags: ['migration', 'crisis'],
          parentEventId: event.id,
        }
      );
    }
  }

  private handleSiege(event: UniverseEvent) {
    console.log(`[Population] Siege at ${event.target} - evacuating civilians`);

    this.eventBus.emit(
      UniverseEventType.POPULATION_MIGRATED,
      {
        fromCity: event.target,
        toCity: 'safe_zone',
        count: 25000,
        reason: 'FLEEING_WAR',
      },
      {
        source: 'PopulationSystem',
        target: event.target,
        priority: EventPriority.URGENT,
        tags: ['war', 'refugees'],
        parentEventId: event.id,
      }
    );
  }
}

/**
 * Economy System - Manages trade and resources
 */
class EconomySystemIntegrated {
  private eventBus = getGlobalEventBus();
  private tradeRoutes: Map<string, any> = new Map();

  constructor() {
    this.setupEventHandlers();
    this.emitSystemInit();
  }

  private setupEventHandlers() {
    // Listen for population changes
    this.eventBus.subscribe(
      UniverseEventType.POPULATION_MIGRATED,
      (event) => this.handleMigration(event),
      EventPriority.NORMAL
    );

    // Listen for territory changes
    this.eventBus.subscribe(
      UniverseEventType.TERRITORY_CAPTURED,
      (event) => this.handleTerritoryChange(event),
      EventPriority.HIGH
    );

    // Listen for construction
    this.eventBus.subscribe(
      UniverseEventType.CONSTRUCTION_COMPLETE,
      (event) => this.handleConstruction(event),
      EventPriority.NORMAL
    );
  }

  private emitSystemInit() {
    this.eventBus.emit(
      UniverseEventType.SYSTEM_INITIALIZED,
      { systemName: 'EconomySystem', version: '1.0' },
      { source: 'EconomySystem', priority: EventPriority.NORMAL }
    );
  }

  private handleMigration(event: UniverseEvent) {
    const { fromCity, toCity, count } = event.data;

    console.log(`[Economy] ${count} migrants affect labor market`);

    // Labor shortage in origin city
    this.eventBus.emit(
      UniverseEventType.RESOURCE_SHORTAGE,
      {
        resource: 'labor',
        cityId: fromCity,
        severity: 0.7,
      },
      {
        source: 'EconomySystem',
        target: fromCity,
        priority: EventPriority.HIGH,
        parentEventId: event.id,
      }
    );
  }

  private handleTerritoryChange(event: UniverseEvent) {
    console.log(`[Economy] Territory ${event.target} captured - disrupting trade`);

    this.eventBus.emit(
      UniverseEventType.TRADE_ROUTE_DISRUPTED,
      {
        routeId: `route_via_${event.target}`,
        reason: 'TERRITORY_CAPTURED',
        affectedTraders: ['merchant_1', 'merchant_2'],
      },
      {
        source: 'EconomySystem',
        priority: EventPriority.HIGH,
        tags: ['trade', 'disruption'],
        parentEventId: event.id,
      }
    );

    // Price spike due to disruption
    setTimeout(() => {
      this.eventBus.emit(
        UniverseEventType.MARKET_PRICE_SPIKE,
        {
          commodity: 'food',
          priceChange: 0.5,
          affectedMarkets: [event.target],
        },
        {
          source: 'EconomySystem',
          priority: EventPriority.NORMAL,
        }
      );
    }, 100);
  }

  private handleConstruction(event: UniverseEvent) {
    if (event.data.buildingType === 'FACTORY') {
      console.log(`[Economy] New factory completed - economic boost`);

      this.eventBus.emit(
        UniverseEventType.ECONOMIC_BOOM,
        {
          cityId: event.target,
          growthRate: 0.15,
          newJobs: 500,
        },
        {
          source: 'EconomySystem',
          target: event.target,
          priority: EventPriority.NORMAL,
          parentEventId: event.id,
        }
      );
    }
  }
}

/**
 * Conquest System - Manages warfare and territory
 */
class ConquestSystemIntegrated {
  private eventBus = getGlobalEventBus();
  private activeSieges: Map<string, any> = new Map();

  constructor() {
    this.setupEventHandlers();
    this.emitSystemInit();
  }

  private setupEventHandlers() {
    // Listen for war declarations
    this.eventBus.subscribe(
      UniverseEventType.FACTION_WAR_DECLARED,
      (event) => this.handleWarDeclaration(event),
      EventPriority.CRITICAL
    );

    // Listen for combat
    this.eventBus.subscribe(
      UniverseEventType.COMBAT_ENDED,
      (event) => this.handleCombatEnd(event),
      EventPriority.HIGH
    );
  }

  private emitSystemInit() {
    this.eventBus.emit(
      UniverseEventType.SYSTEM_INITIALIZED,
      { systemName: 'ConquestSystem', version: '1.0' },
      { source: 'ConquestSystem', priority: EventPriority.NORMAL }
    );
  }

  private handleWarDeclaration(event: UniverseEvent) {
    const { faction1, faction2 } = event.data;
    console.log(`[Conquest] War declared: ${faction1} vs ${faction2}`);

    // Start initial siege
    setTimeout(() => {
      this.startSiege('station_alpha', faction1, faction2);
    }, 50);
  }

  private startSiege(targetId: string, attacker: string, defender: string) {
    console.log(`[Conquest] Starting siege on ${targetId}`);

    const siegeId = `siege_${Date.now()}`;
    this.activeSieges.set(siegeId, {
      targetId,
      attacker,
      defender,
      progress: 0,
    });

    this.eventBus.emitSync(
      UniverseEventType.SIEGE_STARTED,
      {
        siegeId,
        attackerFaction: attacker,
        defenderFaction: defender,
        targetId,
        estimatedDuration: 86400,
      },
      {
        source: 'ConquestSystem',
        target: targetId,
        priority: EventPriority.CRITICAL,
        tags: ['siege', 'war'],
      }
    );
  }

  private handleCombatEnd(event: UniverseEvent) {
    if (event.data.outcome === 'ATTACKER_VICTORY') {
      console.log(`[Conquest] Siege successful - capturing territory`);

      this.eventBus.emit(
        UniverseEventType.TERRITORY_CAPTURED,
        {
          territoryId: event.target,
          newOwner: event.data.attacker,
          previousOwner: event.data.defender,
          population: 100000,
        },
        {
          source: 'ConquestSystem',
          target: event.target,
          priority: EventPriority.CRITICAL,
          tags: ['conquest', 'victory'],
          parentEventId: event.id,
        }
      );
    }
  }

  // Simulate siege completion
  completeSiege(siegeId: string, outcome: string) {
    const siege = this.activeSieges.get(siegeId);
    if (!siege) return;

    this.eventBus.emit(
      UniverseEventType.COMBAT_ENDED,
      {
        siegeId,
        outcome,
        attacker: siege.attacker,
        defender: siege.defender,
        casualties: 5000,
      },
      {
        source: 'ConquestSystem',
        target: siege.targetId,
        priority: EventPriority.HIGH,
      }
    );

    this.activeSieges.delete(siegeId);
  }
}

/**
 * Research System - Manages technology
 */
class ResearchSystemIntegrated {
  private eventBus = getGlobalEventBus();

  constructor() {
    this.setupEventHandlers();
    this.emitSystemInit();
  }

  private setupEventHandlers() {
    // Research can be accelerated by economic booms
    this.eventBus.subscribe(
      UniverseEventType.ECONOMIC_BOOM,
      (event) => this.handleEconomicBoom(event),
      EventPriority.NORMAL
    );
  }

  private emitSystemInit() {
    this.eventBus.emit(
      UniverseEventType.SYSTEM_INITIALIZED,
      { systemName: 'ResearchSystem', version: '1.0' },
      { source: 'ResearchSystem', priority: EventPriority.NORMAL }
    );
  }

  private handleEconomicBoom(event: UniverseEvent) {
    console.log(`[Research] Economic boom accelerating research`);

    // Complete research faster
    setTimeout(() => {
      this.completeResearch('tech_shields', event.target!);
    }, 100);
  }

  completeResearch(techId: string, factionId: string) {
    console.log(`[Research] Research completed: ${techId}`);

    this.eventBus.emit(
      UniverseEventType.RESEARCH_COMPLETED,
      {
        technologyId: techId,
        factionId,
        researchPoints: 10000,
      },
      {
        source: 'ResearchSystem',
        priority: EventPriority.HIGH,
      }
    );

    // Unlock technology
    setTimeout(() => {
      this.eventBus.emit(
        UniverseEventType.TECHNOLOGY_UNLOCKED,
        {
          technologyId: techId,
          factionId,
          enablesConstruction: true,
          newBuilding: 'SHIELD_GENERATOR',
        },
        {
          source: 'ResearchSystem',
          priority: EventPriority.NORMAL,
        }
      );
    }, 50);
  }
}

/**
 * Construction System - Manages building
 */
class ConstructionSystemIntegrated {
  private eventBus = getGlobalEventBus();

  constructor() {
    this.setupEventHandlers();
    this.emitSystemInit();
  }

  private setupEventHandlers() {
    // Technology unlocks enable new construction
    this.eventBus.subscribe(
      UniverseEventType.TECHNOLOGY_UNLOCKED,
      (event) => this.handleTechUnlock(event),
      EventPriority.NORMAL
    );
  }

  private emitSystemInit() {
    this.eventBus.emit(
      UniverseEventType.SYSTEM_INITIALIZED,
      { systemName: 'ConstructionSystem', version: '1.0' },
      { source: 'ConstructionSystem', priority: EventPriority.NORMAL }
    );
  }

  private handleTechUnlock(event: UniverseEvent) {
    if (event.data.enablesConstruction) {
      console.log(`[Construction] Starting construction of ${event.data.newBuilding}`);

      this.startConstruction(event.data.newBuilding, 'city_001');
    }
  }

  startConstruction(buildingType: string, cityId: string) {
    this.eventBus.emit(
      UniverseEventType.CONSTRUCTION_STARTED,
      {
        buildingType,
        cityId,
        estimatedTime: 3600,
      },
      {
        source: 'ConstructionSystem',
        target: cityId,
        priority: EventPriority.NORMAL,
      }
    );

    // Simulate construction completion
    setTimeout(() => {
      this.completeConstruction(buildingType, cityId);
    }, 100);
  }

  completeConstruction(buildingType: string, cityId: string) {
    console.log(`[Construction] ${buildingType} completed in ${cityId}`);

    this.eventBus.emit(
      UniverseEventType.CONSTRUCTION_COMPLETE,
      {
        buildingType,
        cityId,
        productionBonus: 0.25,
      },
      {
        source: 'ConstructionSystem',
        target: cityId,
        priority: EventPriority.NORMAL,
        tags: ['construction', 'complete'],
      }
    );
  }
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

async function demonstrateIntegratedSystems() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   UniverseEventSystem - Complete Integration Demo        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const eventBus = getGlobalEventBus();

  // Setup event logger
  const logger = new EventLogger(eventBus);
  logger.setLogLevel('ALL');
  logger.setConsoleLogging(false); // We'll handle output
  logger.start();

  // Initialize all systems
  console.log('🔧 Initializing Systems...\n');
  const populationSystem = new PopulationSystemIntegrated();
  const economySystem = new EconomySystemIntegrated();
  const conquestSystem = new ConquestSystemIntegrated();
  const researchSystem = new ResearchSystemIntegrated();
  const constructionSystem = new ConstructionSystemIntegrated();

  // Wait for async event processing
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚔️  Triggering Event Cascade: WAR DECLARATION\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Trigger war (this will cascade through multiple systems)
  eventBus.emit(
    UniverseEventType.FACTION_WAR_DECLARED,
    {
      faction1: 'TERRAN_EMPIRE',
      faction2: 'REBEL_ALLIANCE',
      reason: 'TERRITORIAL_DISPUTE',
    },
    {
      source: 'FactionSystem',
      priority: EventPriority.CRITICAL,
      tags: ['war', 'critical'],
    }
  );

  // Wait for cascade to complete
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Simulate siege completion
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🏰 Completing Siege...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sieges = Array.from((conquestSystem as any).activeSieges.keys()) as string[];
  if (sieges.length > 0) {
    conquestSystem.completeSiege(sieges[0], 'ATTACKER_VICTORY');
  }

  // Wait for cascade
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Trigger economic recession
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📉 Economic Recession Hits\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  eventBus.emit(
    UniverseEventType.ECONOMIC_RECESSION,
    {
      severity: 0.8,
      affectedRegions: ['city_metropolis', 'city_outpost'],
    },
    {
      source: 'EconomySystem',
      target: 'city_metropolis',
      priority: EventPriority.HIGH,
    }
  );

  // Wait for cascade
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Analyze event cascades
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Event Cascade Analysis\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allEvents = eventBus.getHistory();
  console.log(`Total Events Generated: ${allEvents.length}\n`);

  // Group by type
  const byType = new Map<string, number>();
  allEvents.forEach((e) => {
    byType.set(e.type, (byType.get(e.type) || 0) + 1);
  });

  console.log('Events by Type:');
  byType.forEach((count, type) => {
    console.log(`  ${type}: ${count}`);
  });

  // Show cascade chains
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 Event Cascade Chains\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rootEvents = allEvents.filter((e) => !e.parentEventId);
  rootEvents.forEach((root) => {
    console.log(`📍 ${root.type} (${root.source})`);
    showEventChain(eventBus, root.id, 1);
  });

  // Statistics
  const stats = eventBus.getStats();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 Performance Statistics\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total Events: ${stats.totalEventsEmitted}`);
  console.log(`Average Processing Time: ${stats.averageProcessingTime.toFixed(3)}ms`);
  console.log(`Active Subscriptions: ${stats.subscriptionCount}`);
  console.log(`History Size: ${stats.historySize}`);

  console.log('\n✨ Integration Demo Complete!\n');
}

function showEventChain(eventBus: any, parentId: string, depth: number): void {
  const children = eventBus.getEventsByParent(parentId);
  children.forEach((child: any) => {
    const indent = '  '.repeat(depth);
    console.log(`${indent}↳ ${child.type} (${child.source})`);
    showEventChain(eventBus, child.id as string, depth + 1);
  });
}

// Run demonstration
if (require.main === module) {
  demonstrateIntegratedSystems().catch(console.error);
}

export { demonstrateIntegratedSystems };
