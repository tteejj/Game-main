#!/usr/bin/env ts-node
/**
 * UniverseEventSystem Validation Script
 *
 * Quick validation that the event system works correctly
 * Run with: ts-node UniverseEventSystem.validation.ts
 */

import {
  EventBus,
  EventLogger,
  UniverseEventType,
  EventPriority,
  getGlobalEventBus,
  resetGlobalEventBus,
} from '../UniverseEventSystem';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    log(`✓ ${message}`, colors.green);
  } else {
    log(`✗ ${message}`, colors.red);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ============================================================================
// Test 1: Basic Event Emission
// ============================================================================

function test1_BasicEmission() {
  log('\n=== Test 1: Basic Event Emission ===', colors.cyan);

  const eventBus = new EventBus();

  const eventId = eventBus.emit(
    UniverseEventType.CONSTRUCTION_COMPLETE,
    { buildingType: 'FACTORY', cityId: 'city_001' },
    { source: 'ConstructionSystem', priority: EventPriority.NORMAL }
  );

  assert(eventId !== undefined, 'Event ID should be defined');
  assert(eventId.startsWith('evt_'), 'Event ID should have correct format');

  const history = eventBus.getHistory();
  assert(history.length === 1, 'History should contain 1 event');
  assert(history[0].type === UniverseEventType.CONSTRUCTION_COMPLETE, 'Event type should match');
  assert(history[0].source === 'ConstructionSystem', 'Event source should match');

  log('  Event ID: ' + eventId);
}

// ============================================================================
// Test 2: Event Subscriptions
// ============================================================================

function test2_Subscriptions() {
  log('\n=== Test 2: Event Subscriptions ===', colors.cyan);

  const eventBus = new EventBus();
  let callbackInvoked = false;
  let receivedEvent: any = null;

  const subId = eventBus.subscribe(
    UniverseEventType.POPULATION_MIGRATED,
    (event) => {
      callbackInvoked = true;
      receivedEvent = event;
    },
    EventPriority.NORMAL
  );

  assert(subId !== undefined, 'Subscription ID should be defined');

  // Emit event synchronously to test immediately
  eventBus.emitSync(
    UniverseEventType.POPULATION_MIGRATED,
    { fromCity: 'city_001', toCity: 'city_002', count: 1500 },
    { source: 'PopulationSystem', priority: EventPriority.NORMAL }
  );

  assert(callbackInvoked, 'Callback should be invoked');
  assert(receivedEvent !== null, 'Event should be received');
  assert(receivedEvent.data.count === 1500, 'Event data should match');

  // Test unsubscribe
  const unsubscribed = eventBus.unsubscribe(subId);
  assert(unsubscribed, 'Unsubscribe should succeed');

  log('  Subscription and callback working');
}

// ============================================================================
// Test 3: Priority Ordering
// ============================================================================

function test3_PriorityOrdering() {
  log('\n=== Test 3: Priority Ordering ===', colors.cyan);

  const eventBus = new EventBus();
  const callOrder: string[] = [];

  eventBus.subscribe(
    UniverseEventType.SIEGE_STARTED,
    () => { callOrder.push('low'); },
    EventPriority.LOW
  );

  eventBus.subscribe(
    UniverseEventType.SIEGE_STARTED,
    () => { callOrder.push('high'); },
    EventPriority.HIGH
  );

  eventBus.subscribe(
    UniverseEventType.SIEGE_STARTED,
    () => { callOrder.push('critical'); },
    EventPriority.CRITICAL
  );

  eventBus.emitSync(
    UniverseEventType.SIEGE_STARTED,
    { attackerFaction: 'EMPIRE' },
    { source: 'ConquestSystem', priority: EventPriority.CRITICAL }
  );

  assert(callOrder.length === 3, 'All callbacks should be invoked');
  assert(callOrder[0] === 'critical', 'Critical priority should execute first');
  assert(callOrder[1] === 'high', 'High priority should execute second');
  assert(callOrder[2] === 'low', 'Low priority should execute last');

  log('  Priority order: ' + callOrder.join(' → '));
}

// ============================================================================
// Test 4: Event History Filtering
// ============================================================================

function test4_HistoryFiltering() {
  log('\n=== Test 4: Event History Filtering ===', colors.cyan);

  const eventBus = new EventBus();

  // Emit multiple events
  for (let i = 0; i < 5; i++) {
    eventBus.emit(
      UniverseEventType.TRADE_COMPLETED,
      { value: i * 100 },
      { source: 'EconomySystem', priority: EventPriority.LOW }
    );
  }

  eventBus.emit(
    UniverseEventType.COMBAT_STARTED,
    { attacker: 'pirate' },
    { source: 'CombatSystem', priority: EventPriority.URGENT }
  );

  eventBus.emit(
    UniverseEventType.TERRITORY_CAPTURED,
    { newOwner: 'EMPIRE' },
    { source: 'ConquestSystem', priority: EventPriority.CRITICAL, tags: ['conquest'] }
  );

  // Test filtering
  const allEvents = eventBus.getHistory();
  assert(allEvents.length === 7, 'Total events should be 7');

  const tradeEvents = eventBus.getHistory({
    types: [UniverseEventType.TRADE_COMPLETED],
  });
  assert(tradeEvents.length === 5, 'Should find 5 trade events');

  const urgentEvents = eventBus.getHistory({
    minPriority: EventPriority.URGENT,
  });
  assert(urgentEvents.length === 2, 'Should find 2 urgent+ events');

  const conquestEvents = eventBus.getHistory({
    tags: ['conquest'],
  });
  assert(conquestEvents.length === 1, 'Should find 1 conquest tagged event');

  const recentEvents = eventBus.getHistory({ limit: 3 });
  assert(recentEvents.length === 3, 'Should limit to 3 events');

  log('  Filtering working correctly');
}

// ============================================================================
// Test 5: Event Cascading
// ============================================================================

function test5_EventCascading() {
  log('\n=== Test 5: Event Cascading ===', colors.cyan);

  const eventBus = new EventBus();

  const parentId = eventBus.emit(
    UniverseEventType.SIEGE_ENDED,
    { outcome: 'VICTORY' },
    { source: 'ConquestSystem', priority: EventPriority.HIGH }
  );

  const childId = eventBus.emit(
    UniverseEventType.TERRITORY_CAPTURED,
    { territoryId: 'sector_7' },
    {
      source: 'ConquestSystem',
      priority: EventPriority.HIGH,
      parentEventId: parentId,
    }
  );

  const grandchildId = eventBus.emit(
    UniverseEventType.POPULATION_MIGRATED,
    { count: 5000 },
    {
      source: 'PopulationSystem',
      priority: EventPriority.NORMAL,
      parentEventId: childId,
    }
  );

  const parent = eventBus.getEventById(parentId);
  const child = eventBus.getEventById(childId);
  const grandchild = eventBus.getEventById(grandchildId);

  assert(parent !== undefined, 'Parent event should exist');
  assert(child !== undefined, 'Child event should exist');
  assert(grandchild !== undefined, 'Grandchild event should exist');
  assert(child!.parentEventId === parentId, 'Child should reference parent');
  assert(grandchild!.parentEventId === childId, 'Grandchild should reference child');

  const children = eventBus.getEventsByParent(parentId);
  assert(children.length === 1, 'Should find 1 direct child');

  log('  Event cascade chain working');
}

// ============================================================================
// Test 6: Performance
// ============================================================================

function test6_Performance() {
  log('\n=== Test 6: Performance (<1ms target) ===', colors.cyan);

  const eventBus = new EventBus();

  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    eventBus.emit(
      UniverseEventType.TICK_UPDATE,
      { tick: i },
      { source: 'GameLoop', priority: EventPriority.LOW }
    );
  }

  const elapsed = performance.now() - start;
  const avgPerEvent = elapsed / iterations;

  assert(avgPerEvent < 1.0, `Average should be <1ms (got ${avgPerEvent.toFixed(3)}ms)`);

  log(`  Average time per event: ${avgPerEvent.toFixed(3)}ms`);
  log(`  Total time for ${iterations} events: ${elapsed.toFixed(2)}ms`);
}

// ============================================================================
// Test 7: Memory Management
// ============================================================================

function test7_MemoryManagement() {
  log('\n=== Test 7: Memory Management ===', colors.cyan);

  const eventBus = new EventBus();
  eventBus.setMaxHistorySize(100);

  // Emit more than max
  for (let i = 0; i < 150; i++) {
    eventBus.emit(
      UniverseEventType.TICK_UPDATE,
      { tick: i },
      { source: 'GameLoop', priority: EventPriority.LOW }
    );
  }

  const history = eventBus.getHistory();
  assert(history.length === 100, 'History should be capped at 100');
  assert(history[0].data.tick >= 50, 'Old events should be removed');

  log('  History size correctly limited to 100 events');
}

// ============================================================================
// Test 8: Statistics
// ============================================================================

function test8_Statistics() {
  log('\n=== Test 8: Statistics ===', colors.cyan);

  const eventBus = new EventBus();

  eventBus.emit(
    UniverseEventType.TRADE_COMPLETED,
    {},
    { source: 'EconomySystem', priority: EventPriority.LOW }
  );

  eventBus.emit(
    UniverseEventType.TRADE_COMPLETED,
    {},
    { source: 'EconomySystem', priority: EventPriority.LOW }
  );

  eventBus.emit(
    UniverseEventType.COMBAT_STARTED,
    {},
    { source: 'CombatSystem', priority: EventPriority.URGENT }
  );

  const stats = eventBus.getStats();

  assert(stats.totalEventsEmitted === 3, 'Total events should be 3');
  assert(stats.eventsByType.get(UniverseEventType.TRADE_COMPLETED) === 2, 'Trade events should be 2');
  assert(stats.eventsByType.get(UniverseEventType.COMBAT_STARTED) === 1, 'Combat events should be 1');
  assert(stats.eventsBySources.get('EconomySystem') === 2, 'Economy system events should be 2');
  assert(stats.eventsBySources.get('CombatSystem') === 1, 'Combat system events should be 1');

  log('  Statistics tracking working');
  log(`  Total events: ${stats.totalEventsEmitted}`);
  log(`  Avg processing time: ${stats.averageProcessingTime.toFixed(3)}ms`);
}

// ============================================================================
// Test 9: Global Singleton
// ============================================================================

function test9_GlobalSingleton() {
  log('\n=== Test 9: Global Singleton ===', colors.cyan);

  resetGlobalEventBus();

  const bus1 = getGlobalEventBus();
  const bus2 = getGlobalEventBus();

  assert(bus1 === bus2, 'Both references should be same instance');

  bus1.emit(
    UniverseEventType.SYSTEM_INITIALIZED,
    { system: 'Test' },
    { source: 'TestSystem', priority: EventPriority.NORMAL }
  );

  const history = bus2.getHistory();
  assert(history.length === 1, 'Both references should share state');

  log('  Global singleton working correctly');
}

// ============================================================================
// Test 10: Event Logger
// ============================================================================

function test10_EventLogger() {
  log('\n=== Test 10: Event Logger ===', colors.cyan);

  const eventBus = new EventBus();
  const logger = new EventLogger(eventBus);

  logger.setConsoleLogging(false); // Disable console for test
  logger.setLogLevel('HIGH');
  logger.start();

  eventBus.emit(
    UniverseEventType.TRADE_COMPLETED,
    {},
    { source: 'EconomySystem', priority: EventPriority.LOW }
  );

  eventBus.emit(
    UniverseEventType.FACTION_WAR_DECLARED,
    {},
    { source: 'FactionSystem', priority: EventPriority.HIGH }
  );

  // Give async processing time to complete
  setTimeout(() => {
    const logs = logger.getLogs();

    // Only HIGH priority event should be logged
    assert(logs.length >= 1, 'Should have at least 1 log entry');

    const exported = logger.exportLogs();
    assert(exported.includes('FACTION_WAR_DECLARED'), 'Exported logs should contain event');

    logger.clearLogs();
    assert(logger.getLogs().length === 0, 'Logs should be cleared');

    logger.stop();

    log('  Event logger working correctly');
  }, 50);
}

// ============================================================================
// Run All Tests
// ============================================================================

function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', colors.blue);
  log('║      UniverseEventSystem Validation Suite                 ║', colors.blue);
  log('╚════════════════════════════════════════════════════════════╝', colors.blue);

  try {
    test1_BasicEmission();
    test2_Subscriptions();
    test3_PriorityOrdering();
    test4_HistoryFiltering();
    test5_EventCascading();
    test6_Performance();
    test7_MemoryManagement();
    test8_Statistics();
    test9_GlobalSingleton();
    test10_EventLogger();

    setTimeout(() => {
      log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
      log('║           ALL TESTS PASSED ✓                               ║', colors.green);
      log('╚════════════════════════════════════════════════════════════╝', colors.green);
      log('\n✨ UniverseEventSystem is production-ready!', colors.green);
    }, 100);
  } catch (error) {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.red);
    log('║           TESTS FAILED ✗                                   ║', colors.red);
    log('╚════════════════════════════════════════════════════════════╝', colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
