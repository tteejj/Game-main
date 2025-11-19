/**
 * ChronicleSystem Tests
 *
 * Comprehensive test suite demonstrating all features
 */

import { ChronicleSystem, HistoricalEventExtended } from './ChronicleSystem';
import { HistoricalMemorySystem } from './simulation/HistoricalMemorySystem';
import { Vector3 } from '../../physics-modules/src/Vector3';

// ====================================================================
// TEST UTILITIES
// ====================================================================

function createTestEvent(overrides: Partial<HistoricalEventExtended> = {}): HistoricalEventExtended {
  return {
    id: `evt_${Date.now()}_${Math.random()}`,
    timestamp: Date.now() / 1000,
    type: 'CUSTOM_EVENT',
    severity: 5,
    category: 'MILITARY',
    location: new Vector3(0, 0, 0),
    participants: ['faction_test'],
    actors: ['faction_test'],
    description: 'Test event',
    outcome: 'Test outcome',
    significance: 5,
    consequences: [],
    relatedEvents: [],
    data: {},
    witnessed: false,
    priority: 5,
    tags: ['test'],
    ...overrides
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

// ====================================================================
// TEST SUITES
// ====================================================================

function testEventRecording() {
  console.log('\n=== Test: Event Recording ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  // Test 1: Record single event
  const event1 = createTestEvent({
    id: 'test_001',
    description: 'First test event',
    significance: 8
  });

  chronicle.recordEvent(event1);

  const events = chronicle.queryEvents({ limit: 10 });
  assert(events.length === 1, 'Event recorded successfully');
  assert(events[0].id === 'test_001', 'Correct event retrieved');

  // Test 2: Record multiple events
  for (let i = 0; i < 5; i++) {
    chronicle.recordEvent(createTestEvent({
      id: `test_${i}`,
      significance: i + 5
    }));
  }

  const allEvents = chronicle.queryEvents({ limit: 100 });
  assert(allEvents.length === 6, 'Multiple events recorded');

  // Test 3: Auto-calculation of significance
  const autoEvent = createTestEvent({
    severity: 8,
    participants: ['faction_a', 'faction_b', 'faction_c'],
    type: 'WAR_DECLARED'
  });

  chronicle.recordEvent(autoEvent);
  assert(autoEvent.significance >= 8, 'Significance auto-calculated correctly');

  console.log('All event recording tests passed!\n');
}

function testEventLinking() {
  console.log('\n=== Test: Event Linking ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  // Create related events
  const event1 = createTestEvent({ id: 'link_001', timestamp: 1000 });
  const event2 = createTestEvent({ id: 'link_002', timestamp: 1500 });
  const event3 = createTestEvent({ id: 'link_003', timestamp: 2000 });

  chronicle.recordEvent(event1);
  chronicle.recordEvent(event2);
  chronicle.recordEvent(event3);

  // Test 1: Manual linking
  chronicle.linkEvents('link_001', 'link_002', 'CAUSED', 0.9);
  chronicle.linkEvents('link_002', 'link_003', 'ESCALATED', 0.8);

  // Get event chain
  const chain = chronicle.getEventChain('link_001', 10);
  assert(chain.events.length >= 2, 'Event chain contains linked events');
  assert(chain.relationships.length >= 1, 'Relationships tracked');

  // Test 2: Auto-linking by participants
  const auto1 = createTestEvent({
    id: 'auto_001',
    timestamp: 3000,
    participants: ['faction_shared']
  });

  const auto2 = createTestEvent({
    id: 'auto_002',
    timestamp: 3100,
    participants: ['faction_shared']
  });

  chronicle.recordEvent(auto1);
  chronicle.recordEvent(auto2);

  const autoChain = chronicle.getEventChain('auto_001', 5);
  assert(autoChain.events.length >= 1, 'Auto-linking by participants works');

  console.log('All event linking tests passed!\n');
}

function testNarrativeGeneration() {
  console.log('\n=== Test: Narrative Generation ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  // Create story arc
  const baseTime = Date.now() / 1000;

  const events = [
    createTestEvent({
      id: 'story_001',
      timestamp: baseTime,
      type: 'WAR_DECLARED',
      category: 'MILITARY',
      severity: 9,
      participants: ['faction_a', 'faction_b'],
      description: 'Faction A declared war on Faction B',
      outcome: 'War began',
      significance: 9
    }),
    createTestEvent({
      id: 'story_002',
      timestamp: baseTime + 1000,
      type: 'BATTLE',
      category: 'MILITARY',
      severity: 8,
      participants: ['faction_a', 'faction_b'],
      description: 'Major battle at Alpha Station',
      outcome: 'Faction A victorious',
      significance: 8
    }),
    createTestEvent({
      id: 'story_003',
      timestamp: baseTime + 2000,
      type: 'STATION_CAPTURED',
      category: 'MILITARY',
      severity: 8,
      participants: ['faction_a', 'faction_b'],
      description: 'Alpha Station captured',
      outcome: 'Faction A controls station',
      significance: 8
    }),
    createTestEvent({
      id: 'story_004',
      timestamp: baseTime + 3000,
      type: 'REFUGEE_CRISIS',
      category: 'SOCIAL',
      severity: 6,
      participants: ['faction_b'],
      description: 'Refugees flee captured station',
      outcome: 'Humanitarian crisis',
      significance: 6
    })
  ];

  events.forEach(e => chronicle.recordEvent(e));

  // Link events
  chronicle.linkEvents('story_001', 'story_002', 'CAUSED', 1.0);
  chronicle.linkEvents('story_002', 'story_003', 'CAUSED', 1.0);
  chronicle.linkEvents('story_003', 'story_004', 'CONSEQUENCE', 0.9);

  // Test 1: Generate formal narrative
  const formalChronicle = chronicle.generateNarrative('faction_a', 10000, {
    perspective: 'NEUTRAL',
    detail: 'STANDARD',
    tone: 'FORMAL'
  });

  assert(formalChronicle.title.length > 0, 'Chronicle has title');
  assert(formalChronicle.narrative.length > 0, 'Narrative generated');
  assert(formalChronicle.events.length === 4, 'All events included');
  assert(formalChronicle.significance > 0, 'Chronicle significance calculated');

  // Test 2: Generate epic narrative
  const epicChronicle = chronicle.generateNarrative('faction_a', 10000, {
    perspective: 'FACTION_BIASED',
    detail: 'DETAILED',
    tone: 'EPIC'
  });

  assert(epicChronicle.narrative !== formalChronicle.narrative, 'Different tones produce different narratives');

  // Test 3: Generate brief narrative
  const briefChronicle = chronicle.generateNarrative('faction_a', 10000, {
    perspective: 'NEUTRAL',
    detail: 'BRIEF',
    tone: 'CASUAL'
  });

  assert(briefChronicle.narrative.length < formalChronicle.narrative.length, 'Brief narrative is shorter');

  console.log('\nSample Formal Narrative:');
  console.log('-'.repeat(60));
  console.log(formalChronicle.narrative);
  console.log('-'.repeat(60));

  console.log('\nAll narrative generation tests passed!\n');
}

function testEventQuerying() {
  console.log('\n=== Test: Event Querying ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  // Create diverse events
  const baseTime = Date.now() / 1000;

  for (let i = 0; i < 20; i++) {
    chronicle.recordEvent(createTestEvent({
      id: `query_${i}`,
      timestamp: baseTime + i * 100,
      type: i % 2 === 0 ? 'BATTLE' : 'TRADE_COMPLETED',
      category: i % 2 === 0 ? 'MILITARY' : 'ECONOMIC',
      severity: i % 10,
      participants: i % 3 === 0 ? ['faction_a'] : ['faction_b'],
      significance: i % 10,
      systemId: i % 5 === 0 ? 'system_001' : 'system_002',
      tags: i % 2 === 0 ? ['war'] : ['trade']
    }));
  }

  // Test 1: Filter by category
  const militaryEvents = chronicle.queryEvents({
    categories: ['MILITARY']
  });
  assert(militaryEvents.length === 10, 'Category filter works');

  // Test 2: Filter by significance
  const significantEvents = chronicle.queryEvents({
    minSignificance: 7
  });
  assert(significantEvents.every(e => e.significance >= 7), 'Significance filter works');

  // Test 3: Filter by faction
  const factionEvents = chronicle.queryEvents({
    factionIds: ['faction_a']
  });
  assert(factionEvents.every(e => e.participants.includes('faction_a')), 'Faction filter works');

  // Test 4: Filter by time range
  const timeRangeEvents = chronicle.queryEvents({
    startTime: baseTime,
    endTime: baseTime + 500
  });
  assert(timeRangeEvents.every(e => e.timestamp >= baseTime && e.timestamp <= baseTime + 500), 'Time filter works');

  // Test 5: Combined filters with limit
  const complexQuery = chronicle.queryEvents({
    categories: ['MILITARY'],
    minSignificance: 5,
    factionIds: ['faction_a'],
    limit: 3
  });
  assert(complexQuery.length <= 3, 'Limit works');
  assert(complexQuery.every(e => e.category === 'MILITARY'), 'Combined filters work');

  // Test 6: Get significant events
  const topEvents = chronicle.getSignificantEvents(5);
  assert(topEvents.length <= 5, 'getSignificantEvents respects limit');

  console.log('All event querying tests passed!\n');
}

function testEventChains() {
  console.log('\n=== Test: Event Chains ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  // Create war campaign chain
  const baseTime = Date.now() / 1000;

  const warEvents = [
    createTestEvent({
      id: 'war_001',
      timestamp: baseTime,
      type: 'WAR_DECLARED',
      category: 'MILITARY',
      severity: 9
    }),
    createTestEvent({
      id: 'war_002',
      timestamp: baseTime + 100,
      type: 'BATTLE',
      category: 'MILITARY',
      severity: 8
    }),
    createTestEvent({
      id: 'war_003',
      timestamp: baseTime + 200,
      type: 'BATTLE',
      category: 'MILITARY',
      severity: 7
    }),
    createTestEvent({
      id: 'war_004',
      timestamp: baseTime + 300,
      type: 'STATION_CAPTURED',
      category: 'MILITARY',
      severity: 8
    }),
    createTestEvent({
      id: 'war_005',
      timestamp: baseTime + 400,
      type: 'WAR_ENDED',
      category: 'MILITARY',
      severity: 9
    })
  ];

  warEvents.forEach(e => chronicle.recordEvent(e));

  // Link chain
  for (let i = 0; i < warEvents.length - 1; i++) {
    chronicle.linkEvents(warEvents[i].id, warEvents[i + 1].id, 'CAUSED', 0.9);
  }

  // Test 1: Get complete chain
  const chain = chronicle.getEventChain('war_001', 20);
  assert(chain.events.length === 5, 'Complete chain retrieved');
  assert(chain.chainType === 'WAR_CAMPAIGN', 'Chain type correctly identified');

  // Test 2: Chain narrative
  assert(chain.narrative.length > 0, 'Chain narrative generated');
  assert(chain.narrative.includes('War'), 'Narrative describes war');

  // Test 3: Economic cycle chain
  const economicEvents = [
    createTestEvent({ id: 'eco_001', type: 'ECONOMIC_BOOM', category: 'ECONOMIC', timestamp: baseTime + 500 }),
    createTestEvent({ id: 'eco_002', type: 'MARKET_CRASH', category: 'ECONOMIC', timestamp: baseTime + 600 }),
    createTestEvent({ id: 'eco_003', type: 'ECONOMIC_RECESSION', category: 'ECONOMIC', timestamp: baseTime + 700 })
  ];

  economicEvents.forEach(e => chronicle.recordEvent(e));
  chronicle.linkEvents('eco_001', 'eco_002', 'CAUSED', 1.0);
  chronicle.linkEvents('eco_002', 'eco_003', 'CAUSED', 1.0);

  const ecoChain = chronicle.getEventChain('eco_001', 10);
  assert(ecoChain.chainType === 'ECONOMIC_CYCLE', 'Economic cycle identified');

  console.log('\nSample Chain Narrative:');
  console.log('-'.repeat(60));
  console.log(chain.narrative);
  console.log('-'.repeat(60));

  console.log('\nAll event chain tests passed!\n');
}

function testTurningPoints() {
  console.log('\n=== Test: Turning Point Identification ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  const baseTime = Date.now() / 1000;

  // Create events with a clear turning point
  const events = [
    createTestEvent({
      id: 'turn_001',
      timestamp: baseTime,
      category: 'ECONOMIC',
      severity: 4,
      significance: 4
    }),
    createTestEvent({
      id: 'turn_002',
      timestamp: baseTime + 100,
      category: 'ECONOMIC',
      severity: 5,
      significance: 5
    }),
    createTestEvent({
      id: 'turn_003',
      timestamp: baseTime + 200,
      type: 'WAR_DECLARED',
      category: 'MILITARY',
      severity: 9,
      significance: 9,
      participants: ['faction_a', 'faction_b', 'faction_c'],
      consequences: ['turn_004', 'turn_005', 'turn_006', 'turn_007', 'turn_008', 'turn_009']
    }),
    createTestEvent({
      id: 'turn_004',
      timestamp: baseTime + 300,
      category: 'MILITARY',
      severity: 8,
      significance: 8
    }),
    createTestEvent({
      id: 'turn_005',
      timestamp: baseTime + 400,
      category: 'MILITARY',
      severity: 7,
      significance: 7
    })
  ];

  events.forEach(e => chronicle.recordEvent(e));

  // Generate chronicle
  const testChronicle = chronicle.generateNarrative('faction_a', 10000);

  // Test: Turning point identified
  assert(testChronicle.turningPoints.length > 0, 'Turning points identified');

  const majorTurningPoint = testChronicle.turningPoints.find(tp => tp.impactScore >= 7);
  assert(majorTurningPoint !== undefined, 'Major turning point detected');

  if (majorTurningPoint) {
    assert(majorTurningPoint.beforeState.length > 0, 'Before state captured');
    assert(majorTurningPoint.afterState.length > 0, 'After state captured');
    console.log(`\nTurning Point Detected:`);
    console.log(`- Description: ${majorTurningPoint.description}`);
    console.log(`- Impact Score: ${majorTurningPoint.impactScore}/10`);
    console.log(`- Before: ${majorTurningPoint.beforeState}`);
    console.log(`- After: ${majorTurningPoint.afterState}`);
  }

  console.log('\nAll turning point tests passed!\n');
}

function testFactionHistory() {
  console.log('\n=== Test: Faction History ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  const baseTime = Date.now() / 1000;

  // Create events for multiple factions
  for (let i = 0; i < 10; i++) {
    chronicle.recordEvent(createTestEvent({
      id: `faction_a_${i}`,
      timestamp: baseTime + i * 100,
      participants: ['faction_a'],
      significance: 6
    }));

    chronicle.recordEvent(createTestEvent({
      id: `faction_b_${i}`,
      timestamp: baseTime + i * 100,
      participants: ['faction_b'],
      significance: 5
    }));
  }

  // Test 1: Get faction-specific history
  const factionAHistory = chronicle.getFactionHistory('faction_a');
  assert(factionAHistory.length === 10, 'Faction A history retrieved');
  assert(factionAHistory.every(e => e.participants.includes('faction_a')), 'All events belong to Faction A');

  const factionBHistory = chronicle.getFactionHistory('faction_b');
  assert(factionBHistory.length === 10, 'Faction B history retrieved');

  // Test 2: Get faction history with timespan
  const recentHistory = chronicle.getFactionHistory('faction_a', 500);
  assert(recentHistory.length <= factionAHistory.length, 'Timespan filter works');

  // Test 3: Generate multiple faction chronicles
  const chronicleA = chronicle.generateNarrative('faction_a', 10000);
  const chronicleB = chronicle.generateNarrative('faction_b', 10000);

  assert(chronicleA.factionId === 'faction_a', 'Chronicle A tagged with faction');
  assert(chronicleB.factionId === 'faction_b', 'Chronicle B tagged with faction');

  // Test 4: Get all chronicles for faction
  const allChroniclesA = chronicle.getChronicles('faction_a');
  assert(allChroniclesA.length >= 1, 'Can retrieve faction chronicles');
  assert(allChroniclesA.every(c => c.factionId === 'faction_a'), 'All chronicles belong to faction');

  console.log('All faction history tests passed!\n');
}

function testPerformance() {
  console.log('\n=== Test: Performance ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  // Create many events
  console.log('Creating 1000 events...');
  const startCreate = Date.now();

  for (let i = 0; i < 1000; i++) {
    chronicle.recordEvent(createTestEvent({
      id: `perf_${i}`,
      timestamp: Date.now() / 1000 + i,
      significance: Math.floor(Math.random() * 10)
    }));
  }

  const createTime = Date.now() - startCreate;
  console.log(`Created 1000 events in ${createTime}ms`);
  assert(createTime < 5000, 'Event creation is fast enough');

  // Test query performance
  console.log('Running complex queries...');
  const startQuery = Date.now();

  for (let i = 0; i < 10; i++) {
    chronicle.queryEvents({
      minSignificance: 7,
      limit: 20
    });
  }

  const queryTime = (Date.now() - startQuery) / 10;
  console.log(`Average query time: ${queryTime.toFixed(2)}ms`);
  assert(queryTime < 10, 'Query performance < 10ms');

  // Test chronicle generation performance
  console.log('Generating chronicle...');
  const startNarrative = Date.now();

  chronicle.generateNarrative('faction_test', 10000);

  const narrativeTime = Date.now() - startNarrative;
  console.log(`Chronicle generation: ${narrativeTime}ms`);
  assert(narrativeTime < 100, 'Chronicle generation < 100ms');

  // Check stats
  const stats = chronicle.getPerformanceStats();
  console.log('\nPerformance Statistics:');
  console.log(`- Total queries: ${stats.queryCount}`);
  console.log(`- Average query time: ${stats.averageQueryTime.toFixed(2)}ms`);
  console.log(`- Total events: ${stats.totalEvents}`);
  console.log(`- Total relationships: ${stats.totalRelationships}`);
  console.log(`- Total chronicles: ${stats.totalChronicles}`);

  assert(stats.averageQueryTime < 10, 'Average query time within limits');

  console.log('\nAll performance tests passed!\n');
}

function testMemoryManagement() {
  console.log('\n=== Test: Memory Management ===\n');

  const history = new HistoricalMemorySystem();
  const chronicle = new ChronicleSystem(history);

  // Test: System handles many events
  console.log('Testing event limit handling...');

  // Create events (system should auto-manage)
  for (let i = 0; i < 150; i++) {
    chronicle.recordEvent(createTestEvent({
      id: `memory_${i}`,
      significance: Math.random() * 10
    }));
  }

  const stats = chronicle.getPerformanceStats();
  console.log(`Events after bulk creation: ${stats.totalEvents}`);
  assert(stats.totalEvents >= 100, 'Events are being tracked');

  // Test: Chronicle limit
  console.log('Testing chronicle limit...');
  for (let i = 0; i < 15; i++) {
    chronicle.generateNarrative(`faction_${i}`, 10000);
  }

  const chronicleStats = chronicle.getPerformanceStats();
  console.log(`Chronicles created: ${chronicleStats.totalChronicles}`);

  console.log('\nAll memory management tests passed!\n');
}

// ====================================================================
// RUN ALL TESTS
// ====================================================================

export function runAllTests() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║        CHRONICLE SYSTEM - TEST SUITE           ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    testEventRecording();
    testEventLinking();
    testNarrativeGeneration();
    testEventQuerying();
    testEventChains();
    testTurningPoints();
    testFactionHistory();
    testPerformance();
    testMemoryManagement();

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS PASSED!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('✗ TEST FAILED!');
    console.error('='.repeat(60));
    console.error(error);
    throw error;
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}
