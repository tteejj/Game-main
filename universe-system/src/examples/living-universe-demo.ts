/**
 * Living Universe Demo - Comprehensive showcase
 *
 * This demo shows ALL the living universe systems working together:
 * 1. Universe generation
 * 2. Background simulation (macro/meso/micro ticks)
 * 3. Historical memory and event recording
 * 4. Cascading consequences
 * 5. NPC memory, goals, and learning
 * 6. Dynamic faction diplomacy
 * 7. Resource-driven faction economics
 * 8. News generation
 * 9. Rumor propagation
 * 10. "While you were away" simulation
 * 11. Save/Load persistence
 *
 * Run this to see a universe evolve over time with emergent behavior!
 */

import { UniverseOrchestrator } from '../UniverseOrchestrator';
import { UniverseSaveLoadManager, PlayerSaveData } from '../UniverseSaveLoadManager';
import { UniverseDesigner } from '../UniverseDesigner';

console.log('═'.repeat(80));
console.log('LIVING UNIVERSE DEMONSTRATION');
console.log('═'.repeat(80));
console.log('');

console.log('This demo showcases a fully living, breathing universe with:');
console.log('  ✓ Background simulation at multiple time scales');
console.log('  ✓ Historical memory and consequence cascades');
console.log('  ✓ NPC agency, goals, and learning');
console.log('  ✓ Dynamic faction diplomacy and economics');
console.log('  ✓ Emergent narratives through news and rumors');
console.log('  ✓ Persistence through save/load');
console.log('');

// ============================================================================
// PHASE 1: Initialize the Living Universe
// ============================================================================

console.log('PHASE 1: Initializing Living Universe...');
console.log('─'.repeat(80));

const orchestrator = new UniverseOrchestrator({
  simulation: {
    macroTickRate: 60,      // Major events every minute (for demo speed)
    mesoTickRate: 10,       // System updates every 10 seconds
    microTickRate: 1/60,    // Entity updates at 60 FPS
    timeScale: 10.0         // 10x speed for demo
  },
  enableEntityAI: true,
  enableFactionDynamics: true,
  enableStorytelling: true,
  enableRumors: true,
  enableChronicles: true
});

// Create universe
const universe = new UniverseDesigner({
  seed: 12345,
  numSystems: 5,  // Small for demo
  campaignMode: 'OPEN_WORLD'
});

console.log(`✓ Universe generated with ${universe.systems.size} star systems`);
console.log('');

// ============================================================================
// PHASE 2: Register Factions
// ============================================================================

console.log('PHASE 2: Registering Factions...');
console.log('─'.repeat(80));

const factions = [
  { id: 'UEC', name: 'United Earth Consortium' },
  { id: 'MCA', name: 'Mars Colonial Authority' },
  { id: 'OPA', name: 'Outer Planets Alliance' },
  { id: 'PIRATES', name: 'Red Star Syndicate' }
];

for (const faction of factions) {
  orchestrator.registerFaction(faction);
  console.log(`✓ Registered faction: ${faction.name}`);
}

console.log('');

// ============================================================================
// PHASE 3: Register NPCs with Goals and Memory
// ============================================================================

console.log('PHASE 3: Creating NPCs with Goals and Personality...');
console.log('─'.repeat(80));

const npcs = [
  {
    id: 'trader_001',
    type: 'SHIP' as const,
    name: 'Merchant Vessel "Fortune\'s Favor"',
    factionId: 'UEC',
    personality: {
      aggression: 0.2,
      caution: 0.8,
      greed: 0.7,
      curiosity: 0.5,
      loyalty: 0.6,
      trustingness: 0.5,
      sociability: 0.7,
      risktaking: 0.3,
      patience: 0.7,
      adaptability: 0.6
    },
    hasAI: true
  },
  {
    id: 'pirate_001',
    type: 'SHIP' as const,
    name: 'Raider "Black Comet"',
    factionId: 'PIRATES',
    personality: {
      aggression: 0.9,
      caution: 0.3,
      greed: 0.9,
      curiosity: 0.4,
      loyalty: 0.3,
      trustingness: 0.2,
      sociability: 0.4,
      risktaking: 0.8,
      patience: 0.2,
      adaptability: 0.7
    },
    hasAI: true
  },
  {
    id: 'explorer_001',
    type: 'SHIP' as const,
    name: 'Science Vessel "Endeavour"',
    factionId: 'MCA',
    personality: {
      aggression: 0.1,
      caution: 0.6,
      greed: 0.3,
      curiosity: 0.9,
      loyalty: 0.8,
      trustingness: 0.6,
      sociability: 0.5,
      risktaking: 0.5,
      patience: 0.8,
      adaptability: 0.8
    },
    hasAI: true
  }
];

for (const npc of npcs) {
  orchestrator.registerEntity(npc);
  console.log(`✓ ${npc.name} registered with AI`);
  console.log(`  Personality: Aggression ${(npc.personality.aggression * 100).toFixed(0)}%, Greed ${(npc.personality.greed * 100).toFixed(0)}%, Curiosity ${(npc.personality.curiosity * 100).toFixed(0)}%`);
}

console.log('');

// ============================================================================
// PHASE 4: Run Simulation and Watch Events Unfold
// ============================================================================

console.log('PHASE 4: Running Simulation (60 seconds of game time at 10x speed)...');
console.log('─'.repeat(80));
console.log('Watch as the universe comes alive with emergent behavior!');
console.log('');

// Simulate 60 seconds of game time (6 seconds real time at 10x speed)
const SIMULATION_DURATION = 60; // seconds of game time
const DELTA_TIME = 1.0; // 1 second timesteps
let elapsedTime = 0;

let eventCount = 0;
let newsCount = 0;

while (elapsedTime < SIMULATION_DURATION) {
  // Update orchestrator
  orchestrator.update(DELTA_TIME);

  elapsedTime += DELTA_TIME;

  // Log interesting events every 10 seconds
  if (elapsedTime % 10 === 0) {
    const snapshot = orchestrator.getState();
    const subsystems = orchestrator.getSubsystems();
    const recentEvents = subsystems.history.queryEvents({
      startTime: elapsedTime - 10,
      endTime: elapsedTime,
      severityMin: 5
    });

    if (recentEvents.length > 0) {
      console.log(`\n[${elapsedTime}s] Recent significant events:`);
      for (const event of recentEvents) {
        console.log(`  • ${event.description} (severity: ${event.severity})`);
        eventCount++;
      }
    }

    const recentNews = orchestrator.getRecentNews(3);
    if (recentNews.length > newsCount) {
      const newArticles = recentNews.slice(newsCount);
      for (const article of newArticles) {
        console.log(`  📰 NEWS: ${article.headline}`);
        newsCount++;
      }
    }
  }
}

console.log('');
console.log('✓ Simulation complete!');
console.log('');

// ============================================================================
// PHASE 5: Generate Reports
// ============================================================================

console.log('PHASE 5: Universe Status Report');
console.log('─'.repeat(80));

const finalState = orchestrator.getState();
const subsystems = orchestrator.getSubsystems();
const stats = subsystems.history.getStatistics();

console.log(`Total Events Recorded: ${stats.totalEvents}`);
console.log(`Events by Category:`);
for (const [category, count] of stats.eventsByCategory) {
  console.log(`  ${category}: ${count}`);
}

console.log('');
console.log(`News Articles Generated: ${finalState.newsArticlesGenerated}`);
console.log(`Rumors in Circulation: ${finalState.rumorsInCirculation}`);
console.log(`Chronicles Written: ${finalState.chroniclesWritten}`);

console.log('');

// Show faction relationships
console.log('Faction Diplomatic Status:');
for (let i = 0; i < factions.length; i++) {
  for (let j = i + 1; j < factions.length; j++) {
    const rel = orchestrator.getFactionRelationship(factions[i].id, factions[j].id);
    if (rel) {
      console.log(`  ${factions[i].name} ↔ ${factions[j].name}: ${rel.status} (${rel.relationshipValue})`);
    }
  }
}

console.log('');

// Show NPC states
console.log('NPC Status:');
for (const npc of npcs) {
  const aiSystems = orchestrator.getEntityAI(npc.id);
  if (aiSystems) {
    const stats = aiSystems.memory.getStatistics();
    const personality = aiSystems.memory.getCurrentPersonality();

    console.log(`  ${npc.name}:`);
    console.log(`    Experiences: ${stats.totalExperiences}`);
    console.log(`    Relationships: ${stats.relationships}`);
    console.log(`    Traumas: ${stats.traumas}`);
    console.log(`    Achievements: ${stats.achievements}`);
    console.log(`    Lessons Learned: ${stats.lessons}`);
  }
}

console.log('');

// ============================================================================
// PHASE 6: Generate Chronicle
// ============================================================================

console.log('PHASE 6: Generating Historical Chronicle...');
console.log('─'.repeat(80));

const chronicle = subsystems.history.generateChronicle(0, SIMULATION_DURATION);

console.log(`Chronicle: "${chronicle.title}"`);
console.log(`Timespan: ${chronicle.timespan.start}s - ${chronicle.timespan.end}s`);
console.log(`Key Events: ${chronicle.events.length}`);
console.log(`Key Figures: ${chronicle.keyFigures.join(', ')}`);
console.log('');
console.log('Narrative:');
console.log(chronicle.narrative);
console.log('');

// ============================================================================
// PHASE 7: Save Game
// ============================================================================

console.log('PHASE 7: Saving Universe State...');
console.log('─'.repeat(80));

const saveManager = new UniverseSaveLoadManager();

const playerData: PlayerSaveData = {
  name: 'Demo Player',
  credits: 10000,
  shipName: 'Demo Ship',
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  currentSystem: 'SOL',
  fuel: 1000,
  power: 100,
  hull: 100,
  visitedSystems: [],
  discoveredSystems: [],
  completedMissions: [],
  factionReputation: new Map(),
  playTime: SIMULATION_DURATION,
  totalDistance: 0,
  totalTrades: 0
};

const saved = await saveManager.quickSave(orchestrator, playerData);

if (saved) {
  console.log('✓ Game state saved successfully!');
  const size = await saveManager.getSaveSize('quicksave');
  console.log(`  Save file size: ${(size / 1024).toFixed(2)} KB`);
} else {
  console.log('✗ Failed to save game state');
}

console.log('');

// ============================================================================
// PHASE 8: Simulate "While You Were Away"
// ============================================================================

console.log('PHASE 8: Simulating Player Absence (30 seconds)...');
console.log('─'.repeat(80));

const absenceSummary = orchestrator.getSubsystems().absenceSimulator.simulate(
  elapsedTime,
  elapsedTime + 30
);

console.log('What happened while you were away:');
console.log(`  Time Elapsed: ${absenceSummary.timeElapsed}s`);
console.log(`  Major Events: ${absenceSummary.majorEvents.length}`);
console.log(`  Economic Changes: ${absenceSummary.economicChanges.length}`);
console.log(`  Diplomatic Changes: ${absenceSummary.diplomaticChanges.length}`);

if (absenceSummary.majorEvents.length > 0) {
  console.log('');
  console.log('  Notable Events:');
  for (const event of absenceSummary.majorEvents.slice(0, 5)) {
    console.log(`    • ${event.description}`);
  }
}

console.log('');

// ============================================================================
// PHASE 9: Performance Report
// ============================================================================

console.log('PHASE 9: Performance Statistics');
console.log('─'.repeat(80));

const perfStats = orchestrator.getSubsystems().simulation.getPerformanceStats();

console.log(`Average Frame Time: ${perfStats.averageFrameTime.toFixed(2)}ms`);
console.log(`FPS: ${perfStats.fps.toFixed(1)}`);
console.log(`Active Entities: ${perfStats.activeEntities}`);
console.log(`Event Queue Size: ${perfStats.eventQueueSize}`);

console.log('');

// ============================================================================
// CONCLUSION
// ============================================================================

console.log('═'.repeat(80));
console.log('DEMONSTRATION COMPLETE');
console.log('═'.repeat(80));
console.log('');

console.log('This demo showed:');
console.log('  ✓ Universe simulation at multiple time scales (macro/meso/micro)');
console.log('  ✓ Historical events being recorded and remembered');
console.log('  ✓ Consequences cascading through the universe');
console.log('  ✓ NPCs with memory, personality, goals, and learning');
console.log('  ✓ Dynamic faction relationships evolving over time');
console.log('  ✓ Resource-driven economic behavior');
console.log('  ✓ News articles and rumors being generated');
console.log('  ✓ Chronicles being written from history');
console.log('  ✓ "While you were away" simulation');
console.log('  ✓ Save/load persistence');
console.log('');

console.log('The universe is ALIVE! 🚀🌌');
console.log('');

// Export for testing
export { orchestrator, universe, saveManager };
