/**
 * Living Universe Integration Demo
 *
 * This example shows how to use the three core Phase 1 systems together:
 * 1. UniverseSimulationController - Main simulation loop
 * 2. HistoricalMemorySystem - Event recording and memory
 * 3. ConsequenceEngine - Cascading effects
 */

import {
  UniverseSimulationController,
  HistoricalMemorySystem,
  ConsequenceEngine,
  HistoricalEvent
} from '../src/simulation';

import { StarSystem } from '../src/StarSystem';

// ====================================================================
// SETUP
// ====================================================================

console.log('='.repeat(60));
console.log('LIVING UNIVERSE - Integration Demo');
console.log('='.repeat(60));
console.log();

// Create the three core systems
const history = new HistoricalMemorySystem();
const consequences = new ConsequenceEngine();
const simulation = new UniverseSimulationController(history, consequences, {
  macroTickRate: 10,    // Fast for demo (10 seconds)
  mesoTickRate: 2,      // 2 seconds
  microTickRate: 1/60,  // 60 FPS
  timeScale: 1.0,
  enableMacroSim: true,
  enableMesoSim: true,
  enableMicroSim: true
});

// Create a mock star system
const solarSystem: Partial<StarSystem> = {
  name: 'Sol System',
  id: 'sol',
  stations: []
};

// Add system to simulation
simulation.addSystem(solarSystem as StarSystem);

console.log('✓ Simulation systems initialized');
console.log();

// ====================================================================
// SCENARIO 1: Pirate Raid Event
// ====================================================================

console.log('SCENARIO 1: Pirate Raid');
console.log('-'.repeat(60));

// Create a pirate raid event
const pirateRaid: HistoricalEvent = {
  id: 'event_001',
  timestamp: 0,
  type: 'PIRATE_RAID',
  severity: 7,
  category: 'MILITARY',
  location: { x: 10000, y: 5000, z: 0 },
  systemId: 'sol',
  stationId: 'mars_station',
  participants: ['pirate_ship_001', 'mars_station'],
  initiator: 'pirate_ship_001',
  victims: ['mars_station'],
  description: 'Pirate fleet attacked Mars Station, 15 casualties',
  data: {
    targetFaction: 'mars_consortium',
    casualties: 15,
    cargoStolen: 5000
  },
  consequences: [],
  witnessed: true,
  priority: 8,
  tags: ['pirate', 'attack', 'mars']
};

// Record to history
history.recordEvent(pirateRaid);

console.log(`Event recorded: ${pirateRaid.description}`);
console.log(`Severity: ${pirateRaid.severity}/10`);
console.log();

// Generate consequences
const raidConsequences = consequences.processEvent(pirateRaid);

console.log(`Generated ${raidConsequences.length} consequences:`);
for (const consequence of raidConsequences) {
  console.log(`  [Order ${consequence.order}] ${consequence.type}`);
  if (consequence.delay > 0) {
    console.log(`    → Delayed by ${consequence.delay}s`);
  }
}
console.log();

// ====================================================================
// SCENARIO 2: Station Destroyed Event
// ====================================================================

console.log('SCENARIO 2: Station Destroyed');
console.log('-'.repeat(60));

const stationDestroyed: HistoricalEvent = {
  id: 'event_002',
  timestamp: 3600,
  type: 'STATION_DESTROYED',
  severity: 10,
  category: 'INFRASTRUCTURE',
  location: { x: 20000, y: 10000, z: 5000 },
  systemId: 'sol',
  stationId: 'europa_hub',
  participants: ['europa_hub'],
  initiator: 'unknown',
  victims: ['europa_hub', 'civilian_population'],
  description: 'Europa Hub catastrophically destroyed, 200 casualties',
  data: {
    controllingFaction: 'jupiter_alliance',
    casualties: 200,
    stationProduction: ['WATER', 'ICE', 'OXYGEN']
  },
  consequences: [],
  witnessed: false,
  priority: 10,
  tags: ['disaster', 'station', 'jupiter']
};

history.recordEvent(stationDestroyed);

console.log(`Event recorded: ${stationDestroyed.description}`);
console.log(`Severity: ${stationDestroyed.severity}/10`);
console.log();

const destructionConsequences = consequences.processEvent(stationDestroyed);

console.log(`Generated ${destructionConsequences.length} consequences:`);
for (const consequence of destructionConsequences) {
  console.log(`  [Order ${consequence.order}] ${consequence.type}`);
  console.log(`    Severity: ${consequence.severity}/10`);
  if (consequence.delay > 0) {
    console.log(`    Delayed: ${consequence.delay}s`);
  }
}
console.log();

// ====================================================================
// SCENARIO 3: Entity Memory & Relationships
// ====================================================================

console.log('SCENARIO 3: Entity Memory & Relationships');
console.log('-'.repeat(60));

// Add relationship between pirate and station
history.addRelationship(
  'pirate_ship_001',
  'mars_station',
  'ENEMY',
  -50,
  pirateRaid.id
);

// Add trauma to station
history.addTrauma(
  'mars_station',
  pirateRaid,
  8,
  ['INCREASED_SECURITY', 'DISTRUST_UNKNOWNS', 'FEAR_OF_PIRATES']
);

// Add learned behavior to nearby traders
history.addLearnedBehavior(
  'trader_ship_042',
  'When approaching Mars',
  'Request escort or wait for patrol',
  pirateRaid.id
);

const stationMemory = history.getEntityHistory('mars_station');
if (stationMemory) {
  console.log(`Mars Station memory:`);
  console.log(`  Experiences: ${stationMemory.experiences.length}`);
  console.log(`  Relationships: ${stationMemory.relationships.size}`);
  console.log(`  Trauma: ${stationMemory.trauma.length}`);

  const pirateRelationship = stationMemory.relationships.get('pirate_ship_001');
  if (pirateRelationship) {
    console.log(`  → Relationship with pirate: ${pirateRelationship.type} (${pirateRelationship.strength})`);
  }
}
console.log();

// ====================================================================
// SCENARIO 4: History Queries
// ====================================================================

console.log('SCENARIO 4: History Queries');
console.log('-'.repeat(60));

// Query all high-severity events
const highSeverityEvents = history.queryEvents({
  severityMin: 7,
  sortBy: 'severity',
  sortOrder: 'desc'
});

console.log(`High severity events (7+): ${highSeverityEvents.length}`);
for (const event of highSeverityEvents) {
  console.log(`  [${event.severity}/10] ${event.type}: ${event.description}`);
}
console.log();

// Query military events
const militaryEvents = history.queryEvents({
  categories: ['MILITARY'],
  sortBy: 'timestamp',
  sortOrder: 'desc'
});

console.log(`Military events: ${militaryEvents.length}`);
for (const event of militaryEvents) {
  console.log(`  ${event.type}: ${event.description}`);
}
console.log();

// ====================================================================
// SCENARIO 5: Chronicle Generation
// ====================================================================

console.log('SCENARIO 5: Chronicle Generation');
console.log('-'.repeat(60));

const chronicle = history.generateChronicle(0, 7200);

console.log(`Chronicle: "${chronicle.title}"`);
console.log(`Timespan: ${chronicle.timespan.start}s to ${chronicle.timespan.end}s`);
console.log(`Major events: ${chronicle.events.length}`);
console.log();
console.log('Narrative:');
console.log(chronicle.narrative);
console.log();

// ====================================================================
// SCENARIO 6: Simulation Loop
// ====================================================================

console.log('SCENARIO 6: Running Simulation Loop');
console.log('-'.repeat(60));

console.log('Running 10 simulation frames...');

for (let i = 0; i < 10; i++) {
  const deltaTime = 1/60; // 60 FPS
  simulation.update(deltaTime, solarSystem as StarSystem);

  if (i === 5) {
    // Trigger an event mid-simulation
    const tradeEvent: HistoricalEvent = {
      id: 'event_003',
      timestamp: simulation.getState().simulationTime,
      type: 'TRADE_COMPLETED',
      severity: 2,
      category: 'ECONOMIC',
      location: { x: 5000, y: 2000, z: 1000 },
      systemId: 'sol',
      stationId: 'mars_station',
      participants: ['trader_alpha', 'mars_station'],
      initiator: 'trader_alpha',
      description: 'Trade completed: 50 tons of water',
      data: {
        commodity: 'WATER',
        quantity: 50,
        price: 1000
      },
      consequences: [],
      witnessed: false,
      priority: 3,
      tags: ['trade', 'water']
    };

    history.recordEvent(tradeEvent);
    consequences.processEvent(tradeEvent);

    console.log(`  Frame ${i}: Trade event triggered`);
  }
}

const state = simulation.getState();
console.log('Simulation state:');
console.log(`  Simulation time: ${state.simulationTime.toFixed(2)}s`);
console.log(`  Tick count: ${state.tickCount}`);
console.log(`  Average frame time: ${state.averageFrameTime.toFixed(2)}ms`);
console.log();

// ====================================================================
// SCENARIO 7: Statistics
// ====================================================================

console.log('SCENARIO 7: System Statistics');
console.log('-'.repeat(60));

const historyStats = history.getStatistics();
console.log('Historical Memory:');
console.log(`  Total events: ${historyStats.totalEvents}`);
console.log(`  Total entities: ${historyStats.totalEntities}`);
console.log(`  Avg events/entity: ${historyStats.averageEventsPerEntity.toFixed(2)}`);
console.log();

const consequenceStats = consequences.getStatistics();
console.log('Consequence Engine:');
console.log(`  Total consequences: ${consequenceStats.totalConsequences}`);
console.log(`  Pending: ${consequenceStats.pendingConsequences}`);
console.log();

const perfStats = simulation.getPerformanceStats();
console.log('Simulation Performance:');
console.log(`  Average frame time: ${perfStats.averageFrameTime.toFixed(2)}ms`);
console.log(`  FPS: ${perfStats.fps.toFixed(1)}`);
console.log(`  Event queue size: ${perfStats.eventQueueSize}`);
console.log(`  Active entities: ${perfStats.activeEntities}`);
console.log();

// ====================================================================
// SUMMARY
// ====================================================================

console.log('='.repeat(60));
console.log('DEMO COMPLETE');
console.log('='.repeat(60));
console.log();
console.log('Key Features Demonstrated:');
console.log('  ✓ Event recording to history');
console.log('  ✓ Cascading consequence generation');
console.log('  ✓ Entity memory and relationships');
console.log('  ✓ Historical queries');
console.log('  ✓ Chronicle/narrative generation');
console.log('  ✓ Macro/Meso/Micro simulation ticks');
console.log('  ✓ Performance tracking');
console.log();
console.log('This is Phase 1 - Critical Foundation');
console.log('Next: Phase 2 - Entity Depth (Deep NPC Memory & Goals)');
console.log();
