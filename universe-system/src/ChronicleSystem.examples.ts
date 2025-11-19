/**
 * ChronicleSystem Examples and Usage
 *
 * Demonstrates how to use the Chronicle System and shows
 * example narratives it generates.
 */

import { ChronicleSystem, HistoricalEventExtended } from './ChronicleSystem';
import { HistoricalMemorySystem } from './simulation/HistoricalMemorySystem';
import { Vector3 } from '../../physics-modules/src/Vector3';

// ====================================================================
// BASIC USAGE EXAMPLES
// ====================================================================

export function basicUsageExample() {
  // 1. Create systems
  const historySystem = new HistoricalMemorySystem();
  const chronicleSystem = new ChronicleSystem(historySystem);

  console.log('=== Basic Chronicle System Usage ===\n');

  // 2. Record some events
  const event1: HistoricalEventExtended = {
    id: 'evt_001',
    timestamp: 1000,
    type: 'WAR_DECLARED',
    severity: 9,
    category: 'MILITARY',
    location: new Vector3(1000, 2000, 3000),
    participants: ['faction_crimson', 'faction_azure'],
    actors: ['faction_crimson', 'faction_azure'],
    description: 'The Crimson Federation declared war on the Azure Alliance',
    outcome: 'War began with initial skirmishes along the border',
    significance: 9,
    consequences: [],
    relatedEvents: [],
    data: {
      factionA: 'faction_crimson',
      factionB: 'faction_azure',
      casusBelli: 'territorial_dispute'
    },
    witnessed: false,
    priority: 10,
    tags: ['war', 'major', 'diplomatic']
  };

  const event2: HistoricalEventExtended = {
    id: 'evt_002',
    timestamp: 1500,
    type: 'BATTLE',
    severity: 7,
    category: 'MILITARY',
    location: new Vector3(1100, 2100, 3100),
    systemId: 'system_001',
    participants: ['faction_crimson', 'faction_azure'],
    actors: ['faction_crimson', 'faction_azure'],
    description: 'Battle of Proxima Nebula - Crimson forces attacked Azure mining station',
    outcome: 'Crimson victory, station captured',
    significance: 8,
    consequences: ['evt_003'],
    relatedEvents: ['evt_001'],
    data: {
      casualties: 2500,
      victor: 'faction_crimson'
    },
    witnessed: true,
    priority: 8,
    tags: ['battle', 'military', 'conquest']
  };

  const event3: HistoricalEventExtended = {
    id: 'evt_003',
    timestamp: 2000,
    type: 'STATION_CAPTURED',
    severity: 8,
    category: 'MILITARY',
    location: new Vector3(1100, 2100, 3100),
    systemId: 'system_001',
    stationId: 'station_proxima_alpha',
    participants: ['faction_crimson', 'faction_azure'],
    actors: ['faction_crimson'],
    description: 'Proxima Alpha Station fell to Crimson forces',
    outcome: 'Azure evacuated, Crimson established control',
    significance: 8,
    consequences: ['evt_004'],
    relatedEvents: ['evt_002'],
    data: {
      stationId: 'station_proxima_alpha',
      newController: 'faction_crimson',
      refugees: 5000
    },
    witnessed: true,
    priority: 9,
    tags: ['conquest', 'station', 'war']
  };

  const event4: HistoricalEventExtended = {
    id: 'evt_004',
    timestamp: 2500,
    type: 'REFUGEE_CRISIS',
    severity: 6,
    category: 'SOCIAL',
    location: new Vector3(1200, 2200, 3200),
    systemId: 'system_002',
    participants: ['faction_azure'],
    actors: [],
    description: '5,000 refugees from Proxima Alpha arrived at Azure Core Station',
    outcome: 'Humanitarian crisis, Azure struggling with resources',
    significance: 6,
    consequences: [],
    relatedEvents: ['evt_003'],
    data: {
      refugeeCount: 5000,
      destination: 'station_azure_core',
      resources: 'strained'
    },
    witnessed: false,
    priority: 7,
    tags: ['refugees', 'humanitarian', 'war-impact']
  };

  // Record events
  chronicleSystem.recordEvent(event1);
  chronicleSystem.recordEvent(event2);
  chronicleSystem.recordEvent(event3);
  chronicleSystem.recordEvent(event4);

  // 3. Link events manually (auto-linking also happens)
  chronicleSystem.linkEvents('evt_001', 'evt_002', 'CAUSED', 0.95, 'War declaration led to battle');
  chronicleSystem.linkEvents('evt_002', 'evt_003', 'CAUSED', 1.0, 'Battle resulted in station capture');
  chronicleSystem.linkEvents('evt_003', 'evt_004', 'CONSEQUENCE', 0.9, 'Capture caused refugee crisis');

  // 4. Generate chronicle
  const chronicle = chronicleSystem.generateNarrative('faction_crimson', 3600, {
    perspective: 'NEUTRAL',
    detail: 'DETAILED',
    tone: 'FORMAL'
  });

  console.log('Chronicle Title:', chronicle.title);
  console.log('Significance:', chronicle.significance);
  console.log('Key Figures:', chronicle.keyFigures);
  console.log('\nNarrative:\n');
  console.log(chronicle.narrative);
  console.log('\nTurning Points:');
  chronicle.turningPoints.forEach(tp => {
    console.log(`- ${tp.description} (Impact: ${tp.impactScore}/10)`);
  });

  // 5. Query events
  console.log('\n=== Event Queries ===\n');

  const militaryEvents = chronicleSystem.queryEvents({
    categories: ['MILITARY'],
    minSignificance: 7
  });
  console.log(`Military events (significance >= 7): ${militaryEvents.length}`);

  const factionEvents = chronicleSystem.getFactionHistory('faction_crimson');
  console.log(`Crimson Federation events: ${factionEvents.length}`);

  const significant = chronicleSystem.getSignificantEvents(5);
  console.log(`Top 5 significant events: ${significant.length}`);

  // 6. Get event chain
  console.log('\n=== Event Chain ===\n');
  const chain = chronicleSystem.getEventChain('evt_001', 10);
  console.log(`Chain type: ${chain.chainType}`);
  console.log(`Events in chain: ${chain.events.length}`);
  console.log(`Relationships: ${chain.relationships.length}`);
  console.log('\nChain narrative:');
  console.log(chain.narrative);

  // 7. Performance stats
  console.log('\n=== Performance Stats ===\n');
  const stats = chronicleSystem.getPerformanceStats();
  console.log(`Queries executed: ${stats.queryCount}`);
  console.log(`Average query time: ${stats.averageQueryTime.toFixed(2)}ms`);
  console.log(`Total events: ${stats.totalEvents}`);
  console.log(`Total relationships: ${stats.totalRelationships}`);
  console.log(`Total chronicles: ${stats.totalChronicles}`);
}

// ====================================================================
// EXAMPLE NARRATIVES
// ====================================================================

export const EXAMPLE_NARRATIVE_WAR = `
During a period of 72 hours, 15 significant events were recorded, spanning military, diplomatic, social categories.

Over 48 hours, the drums of war echoed across the systems. At Day 0, 16:40, the crimson federation declared war on the azure alliance. This directly led to at Day 0, 17:10, battle of proxima nebula - crimson forces attacked azure mining station, resulting in 2500 casualties. Ultimately, crimson victory, station captured. This caused at Day 0, 18:20, proxima alpha station fell to crimson forces. Azure evacuated, crimson established control.

A series of social events unfolded over 12 hours. At Day 0, 19:30, 5,000 refugees from proxima alpha arrived at azure core station. Humanitarian crisis, azure struggling with resources.

History would remember this era for the crimson federation declared war on the azure alliance, a moment that defined the age and whose consequences echo to this day.
`;

export const EXAMPLE_NARRATIVE_ECONOMIC = `
During a period of 14 days, 23 significant events were recorded, spanning economic, social, infrastructure categories.

Over 7 days, markets trembled and fortunes were made. At Day 1, 09:00, major commodity shortage detected in beta sector. Prices of food, water, and oxygen spiked by 300%. This enabled at Day 2, 14:30, black market expansion in beta sector. Criminal organizations seized opportunity. At Day 3, 08:00, azure alliance imposed price controls and rationing. Civil unrest began.

A series of social events unfolded over 3 days. At Day 5, 16:00, riots broke out on three major stations. Population demanded relief. In retaliation, at Day 6, 10:00, azure security forces cracked down on protesters, resulting in 47 casualties.

At Day 8, 12:00, emergency supply convoy arrived from crimson federation. Crisis averted, relations improved.

The most significant development was emergency supply convoy arrived from crimson federation, which fundamentally altered the course of events.
`;

export const EXAMPLE_NARRATIVE_DISCOVERY = `
In the span of 30 days, the universe witnessed great upheaval. From discovery, scientific, economic events that shook the very foundations of civilization, emerged a tale of 8 defining moments.

Over 15 days, explorers ventured into the unknown. At Day 1, 06:00, captain sarah chen discovered ancient alien artifact in omega nebula. Scientific community electrified. This enabled at Day 5, 12:00, joint research expedition launched by three factions. Unprecedented cooperation achieved. At Day 12, 18:00, artifact activated, revealing jump gate coordinates to new sector.

Over 8 days, markets trembled and fortunes were made. At Day 15, 10:00, claims rush began for new sector territories. Economic boom in exploration industry. At Day 20, 14:00, territorial disputes emerged between factions. Diplomatic tensions rising.

History would remember this era for captain sarah chen discovered ancient alien artifact in omega nebula, a moment that defined the age and whose consequences echo to this day.
`;

export const EXAMPLE_NARRATIVE_BRIEF = `
Over 24 hours, 12 notable events were recorded.

The crimson federation declared war on the azure alliance. Battle of proxima nebula - crimson forces attacked azure mining station. Proxima alpha station fell to crimson forces. 5,000 refugees arrived at azure core station. Emergency session of galactic council called.

The period concluded with relative stability.
`;

export const EXAMPLE_NARRATIVE_EPIC = `
In the span of three solar cycles, the universe witnessed great upheaval. From military, diplomatic, social events that shook the very foundations of civilization, emerged a tale of 27 defining moments that would echo through the ages.

THE BEGINNING OF HOSTILITIES

Over seven days, the drums of war echoed across the systems. In the first hour of the conflict, the mighty Crimson Federation, long the dominant power in the Proxima Sector, declared total war upon the Azure Alliance, citing ancient territorial claims and recent provocations. This momentous declaration sent shockwaves across known space. This directly led to the legendary Battle of Proxima Nebula, where Admiral Marcus Vale commanded the Crimson 7th Fleet in a devastating assault on the Azure mining installation. The battle raged for six hours, with 2,500 souls lost to the void. When the smoke cleared, the Crimson banner flew over Proxima Alpha Station, and 5,000 Azure citizens fled into the darkness of space.

THE TURNING OF THE TIDE

At the dawn of the second cycle, Azure Admiral Keiko Tanaka led a desperate counteroffensive, reclaiming three border outposts in a daring lightning campaign. The Azure population, once demoralized, rallied behind their heroes. Meanwhile, the neutral Stellar Compact watched nervously, knowing their neutrality could not hold forever.

THE FINAL RECKONING

As the third cycle approached, exhausted by months of brutal warfare, both sides agreed to the Treaty of New Haven, brokered by Compact mediators. The war had changed everything - old alliances shattered, new powers emerged, and the balance of galactic power shifted forever.

History would remember this era for the battle of proxima nebula, a moment that defined the age and whose consequences echo to this day. The names of Vale and Tanaka would be spoken with reverence and fear for generations to come, symbols of an age when titans clashed among the stars.
`;

// ====================================================================
// INTEGRATION EXAMPLE
// ====================================================================

export function integrationExample() {
  console.log('=== Integration with UniverseSimulationController ===\n');

  // This shows how ChronicleSystem integrates with the simulation

  const historySystem = new HistoricalMemorySystem();
  const chronicleSystem = new ChronicleSystem(historySystem);

  // The simulation controller records events, ChronicleSystem tracks them
  // In UniverseSimulationController.processMacroTick():

  function exampleSimulationIntegration() {
    // 1. Major event occurs
    const warEvent: HistoricalEventExtended = {
      id: `evt_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: 'WAR_DECLARED',
      severity: 9,
      category: 'MILITARY',
      location: new Vector3(0, 0, 0),
      participants: ['faction_a', 'faction_b'],
      actors: ['faction_a', 'faction_b'],
      description: 'War declared',
      outcome: 'Conflict initiated',
      significance: 9,
      consequences: [],
      relatedEvents: [],
      data: {},
      witnessed: false,
      priority: 10,
      tags: ['war']
    };

    // 2. Record to chronicle system (which also records to history)
    chronicleSystem.recordEvent(warEvent);

    // 3. Periodically generate chronicles (e.g., once per week game time)
    const weeklyChronicle = chronicleSystem.generateNarrative('faction_a', 604800, {
      perspective: 'FACTION_BIASED',
      detail: 'STANDARD',
      tone: 'EPIC'
    });

    // 4. Display to player via UI
    console.log('Chronicle generated for player:', weeklyChronicle.title);

    // 5. Use for AI faction memory
    const factionMemory = chronicleSystem.getFactionHistory('faction_a', 2592000); // Last month
    console.log(`Faction remembers ${factionMemory.length} events from last month`);

    // 6. Query for specific story arcs
    const warEvents = chronicleSystem.queryEvents({
      categories: ['MILITARY'],
      factionIds: ['faction_a'],
      minSignificance: 6
    });
    console.log(`War events for storytelling: ${warEvents.length}`);

    return { chronicle: weeklyChronicle, factionMemory, warEvents };
  }

  const result = exampleSimulationIntegration();
  console.log('\nIntegration complete!');
  console.log(`Generated chronicle: "${result.chronicle.title}"`);
  console.log(`Chronicle significance: ${result.chronicle.significance}/10`);
}

// ====================================================================
// ADVANCED USAGE
// ====================================================================

export function advancedUsageExample() {
  const historySystem = new HistoricalMemorySystem();
  const chronicleSystem = new ChronicleSystem(historySystem);

  console.log('=== Advanced Chronicle Features ===\n');

  // 1. Create complex event chain
  const events = createComplexEventChain();
  events.forEach(e => chronicleSystem.recordEvent(e));

  // 2. Generate multiple narrative styles
  console.log('--- FORMAL NARRATIVE ---');
  const formal = chronicleSystem.generateNarrative('faction_test', 86400, {
    perspective: 'NEUTRAL',
    detail: 'STANDARD',
    tone: 'FORMAL'
  });
  console.log(formal.narrative.substring(0, 200) + '...\n');

  console.log('--- EPIC NARRATIVE ---');
  const epic = chronicleSystem.generateNarrative('faction_test', 86400, {
    perspective: 'NEUTRAL',
    detail: 'DETAILED',
    tone: 'EPIC'
  });
  console.log(epic.narrative.substring(0, 200) + '...\n');

  console.log('--- CASUAL NARRATIVE ---');
  const casual = chronicleSystem.generateNarrative('faction_test', 86400, {
    perspective: 'NEUTRAL',
    detail: 'BRIEF',
    tone: 'CASUAL'
  });
  console.log(casual.narrative.substring(0, 200) + '...\n');

  // 3. Analyze event chains
  const chain = chronicleSystem.getEventChain(events[0].id, 20);
  console.log(`Event chain analysis:`);
  console.log(`- Type: ${chain.chainType}`);
  console.log(`- Events: ${chain.events.length}`);
  console.log(`- Relationships: ${chain.relationships.length}`);

  // 4. Get all faction chronicles
  const allChronicles = chronicleSystem.getChronicles('faction_test');
  console.log(`\nTotal chronicles for faction_test: ${allChronicles.length}`);

  allChronicles.forEach(c => {
    console.log(`- "${c.title}" (${c.events.length} events, significance: ${c.significance})`);
  });
}

function createComplexEventChain(): HistoricalEventExtended[] {
  const baseTime = Date.now() / 1000;

  return [
    {
      id: 'evt_chain_001',
      timestamp: baseTime,
      type: 'ECONOMIC_BOOM',
      severity: 6,
      category: 'ECONOMIC',
      location: new Vector3(0, 0, 0),
      participants: ['faction_test'],
      actors: ['faction_test'],
      description: 'Economic boom in mining sector',
      outcome: 'GDP increased 25%',
      significance: 7,
      consequences: ['evt_chain_002'],
      relatedEvents: [],
      data: { gdpGrowth: 0.25 },
      witnessed: false,
      priority: 6,
      tags: ['economy', 'growth']
    },
    {
      id: 'evt_chain_002',
      timestamp: baseTime + 3600,
      type: 'STATION_FOUNDED',
      severity: 5,
      category: 'INFRASTRUCTURE',
      location: new Vector3(100, 100, 100),
      participants: ['faction_test'],
      actors: ['faction_test'],
      description: 'New mining station established',
      outcome: 'Station operational with 1000 workers',
      significance: 6,
      consequences: ['evt_chain_003'],
      relatedEvents: ['evt_chain_001'],
      data: { stationPopulation: 1000 },
      witnessed: false,
      priority: 5,
      tags: ['construction', 'expansion']
    },
    {
      id: 'evt_chain_003',
      timestamp: baseTime + 7200,
      type: 'PIRATE_RAID',
      severity: 7,
      category: 'MILITARY',
      location: new Vector3(100, 100, 100),
      participants: ['faction_test', 'pirates_001'],
      actors: ['pirates_001'],
      description: 'Pirates attacked new mining station',
      outcome: 'Station defended but 50 casualties',
      significance: 7,
      consequences: ['evt_chain_004'],
      relatedEvents: ['evt_chain_002'],
      data: { casualties: 50, damage: 500000 },
      witnessed: true,
      priority: 8,
      tags: ['piracy', 'combat']
    },
    {
      id: 'evt_chain_004',
      timestamp: baseTime + 10800,
      type: 'PATROL_INCREASE',
      severity: 5,
      category: 'MILITARY',
      location: new Vector3(100, 100, 100),
      participants: ['faction_test'],
      actors: ['faction_test'],
      description: 'Increased military patrols around station',
      outcome: 'Security improved, pirate activity decreased',
      significance: 5,
      consequences: [],
      relatedEvents: ['evt_chain_003'],
      data: { patrolStrength: 0.8 },
      witnessed: false,
      priority: 6,
      tags: ['security', 'military']
    }
  ];
}

// ====================================================================
// RUN EXAMPLES
// ====================================================================

if (require.main === module) {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     CHRONICLE SYSTEM - EXAMPLES & USAGE        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  basicUsageExample();
  console.log('\n' + '='.repeat(60) + '\n');

  integrationExample();
  console.log('\n' + '='.repeat(60) + '\n');

  advancedUsageExample();
}
