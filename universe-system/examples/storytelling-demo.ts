/**
 * Storytelling Systems Demo - Phase 4
 *
 * Demonstrates news generation, rumor propagation, absence simulation,
 * and auto-generated chronicles/lore.
 */

import { HistoricalMemorySystem, HistoricalEvent } from '../src/simulation/HistoricalMemorySystem';
import { ConsequenceEngine } from '../src/simulation/ConsequenceEngine';
import { FactionDiplomacyEngine } from '../src/faction-dynamics/FactionDiplomacyEngine';
import { FactionEconomicNeeds } from '../src/faction-dynamics/FactionEconomicNeeds';

import {
  NewsGenerationEngine,
  RumorPropagationSystem,
  AbsenceSimulator,
  ChronicleGenerator
} from '../src/storytelling';

console.log('='.repeat(70));
console.log('STORYTELLING SYSTEMS DEMO - Phase 4: Emergent Storytelling');
console.log('='.repeat(70));
console.log();

// ====================================================================
// SETUP
// ====================================================================

const history = new HistoricalMemorySystem();
const consequences = new ConsequenceEngine(history);
const diplomacy = new FactionDiplomacyEngine();
const economics = new FactionEconomicNeeds();

const newsEngine = new NewsGenerationEngine();
const rumors = new RumorPropagationSystem();
const absenceSimulator = new AbsenceSimulator(history, consequences, diplomacy, economics);
const chronicles = new ChronicleGenerator(history);

// ====================================================================
// SCENARIO 1: Generate News from Event
// ====================================================================

console.log('SCENARIO 1: News Generation from Events');
console.log('-'.repeat(70));

// Create a major event
const pirateRaidEvent: HistoricalEvent = {
  id: 'event_raid_001',
  timestamp: 1000,
  type: 'PIRATE_RAID',
  severity: 8,
  category: 'MILITARY',
  location: { x: 1000, y: 2000, z: 500 },
  systemId: 'alpha_centauri',
  participants: ['pirate_gang', 'mars_trading_co', 'local_militia'],
  description: 'Pirate gang attacked Mars Trading convoy near Alpha Centauri, stealing 50,000 credits worth of cargo',
  data: {
    stolenCargo: 50000,
    casualties: 3,
    escapedPirates: true
  },
  consequences: [],
  witnessed: true,
  priority: 8,
  tags: ['pirate', 'theft', 'violence']
};

history.recordEvent(pirateRaidEvent);

// Generate news from multiple perspectives
console.log('Generating news from different publishers with different biases...');
console.log();

const neutralNews = newsEngine.generateNews(pirateRaidEvent, 'Galactic Times', 'NEUTRAL');
console.log(`[${neutralNews.publisher}] - NEUTRAL PERSPECTIVE`);
console.log(`Headline: ${neutralNews.headline}`);
console.log(`Body: ${neutralNews.body}`);
console.log(`Importance: ${neutralNews.importance} | Veracity: ${neutralNews.veracity}%`);
console.log();

const proPirateNews = newsEngine.generateNews(pirateRaidEvent, 'Outer Rim Herald', 'PRO_PARTICIPANT');
console.log(`[${proPirateNews.publisher}] - PRO-PARTICIPANT (Pirate sympathetic)`);
console.log(`Headline: ${proPirateNews.headline}`);
console.log(`Body: ${proPirateNews.body}`);
console.log();

const antiPirateNews = newsEngine.generateNews(pirateRaidEvent, 'Corporate Security Bulletin', 'ANTI_PARTICIPANT');
console.log(`[${antiPirateNews.publisher}] - ANTI-PARTICIPANT (Corporate view)`);
console.log(`Headline: ${antiPirateNews.headline}`);
console.log(`Body: ${antiPirateNews.body}`);
console.log();

// ====================================================================
// SCENARIO 2: Rumor Propagation
// ====================================================================

console.log('SCENARIO 2: Rumor Propagation and Distortion');
console.log('-'.repeat(70));

// Create rumor from news
const originalRumor = rumors.createRumorFromNews(neutralNews, 'alpha_centauri');

console.log('✓ Original rumor created from news');
console.log(`  Origin: ${originalRumor.originLocation}`);
console.log(`  Credibility: ${(originalRumor.credibility * 100).toFixed(0)}%`);
console.log(`  Content: "${originalRumor.content}"`);
console.log();

// Register communication network
rumors.registerNode('alpha_centauri', { reliability: 0.8, connections: ['sol_system', 'proxima'] });
rumors.registerNode('sol_system', { reliability: 0.9, connections: ['alpha_centauri', 'proxima', 'tau_ceti'] });
rumors.registerNode('proxima', { reliability: 0.6, connections: ['alpha_centauri', 'sol_system'] });
rumors.registerNode('tau_ceti', { reliability: 0.5, connections: ['sol_system'] });

console.log('Communication network established:');
console.log('  Alpha Centauri (0.8) <-> Sol (0.9) <-> Tau Ceti (0.5)');
console.log('                    \\            /');
console.log('                     Proxima (0.6)');
console.log();

// Propagate rumor through network
console.log('Propagating rumor through network...');
console.log();

// Hop 1: Alpha Centauri -> Sol
const hop1 = rumors.propagateRumor(originalRumor.id, 'alpha_centauri', 'sol_system');
if (hop1) {
  console.log(`Hop 1: Alpha Centauri → Sol System`);
  console.log(`  Credibility: ${(originalRumor.credibility * 100).toFixed(0)}% → ${(hop1.credibility * 100).toFixed(0)}%`);
  console.log(`  Content: "${hop1.content}"`);
  if (hop1.distortions.length > 0) {
    console.log(`  Distortion: ${hop1.distortions[hop1.distortions.length - 1].type}`);
  }
  console.log();
}

// Hop 2: Sol -> Proxima
const hop2 = rumors.propagateRumor(originalRumor.id, 'sol_system', 'proxima');
if (hop2) {
  console.log(`Hop 2: Sol System → Proxima`);
  console.log(`  Credibility: ${hop1?.credibility ? (hop1.credibility * 100).toFixed(0) : 0}% → ${(hop2.credibility * 100).toFixed(0)}%`);
  console.log(`  Content: "${hop2.content}"`);
  if (hop2.distortions.length > 0) {
    console.log(`  Distortion: ${hop2.distortions[hop2.distortions.length - 1].type}`);
  }
  console.log();
}

// Hop 3: Sol -> Tau Ceti (unreliable node)
const hop3 = rumors.propagateRumor(originalRumor.id, 'sol_system', 'tau_ceti');
if (hop3) {
  console.log(`Hop 3: Sol System → Tau Ceti (unreliable)`);
  console.log(`  Credibility: ${hop1?.credibility ? (hop1.credibility * 100).toFixed(0) : 0}% → ${(hop3.credibility * 100).toFixed(0)}%`);
  console.log(`  Content: "${hop3.content}"`);
  if (hop3.distortions.length > 0) {
    console.log(`  Distortion: ${hop3.distortions[hop3.distortions.length - 1].type}`);
  }
  console.log();
}

console.log('Notice how the rumor degraded as it passed through less reliable nodes!');
console.log();

// ====================================================================
// SCENARIO 3: "While You Were Away" Absence Simulation
// ====================================================================

console.log('SCENARIO 3: Absence Simulation - "While You Were Away"');
console.log('-'.repeat(70));

// Simulate player being away for 3 hours
const saveTime = Date.now() / 1000;
const returnTime = saveTime + (3600 * 3);  // 3 hours later

console.log('Simulating 3 hours of absence...');
console.log();

const absenceSummary = absenceSimulator.simulate(saveTime, returnTime, 'mars_trading_co');

// Generate and display summary
const summaryText = absenceSimulator.generateTextSummary(absenceSummary);
console.log(summaryText);
console.log();

// ====================================================================
// SCENARIO 4: Chronicle Generation - Auto-generated Lore
// ====================================================================

console.log('SCENARIO 4: Chronicle Generation - Auto-generated Lore');
console.log('-'.repeat(70));

// Add more events to create a war chronicle
const warEvents: HistoricalEvent[] = [
  {
    id: 'event_war_001',
    timestamp: 2000,
    type: 'WAR_DECLARED',
    severity: 9,
    category: 'MILITARY',
    location: { x: 0, y: 0, z: 0 },
    systemId: 'sol_system',
    participants: ['earth_federation', 'mars_coalition'],
    description: 'Earth Federation declares war on Mars Coalition over resource disputes',
    data: { factionA: 'earth_federation', factionB: 'mars_coalition' },
    consequences: [],
    witnessed: true,
    priority: 9,
    tags: ['war', 'declaration']
  },
  {
    id: 'event_war_002',
    timestamp: 2500,
    type: 'BATTLE',
    severity: 8,
    category: 'MILITARY',
    location: { x: 100, y: 200, z: 50 },
    systemId: 'asteroid_belt',
    participants: ['earth_federation', 'mars_coalition'],
    description: 'Major battle in asteroid belt results in heavy casualties on both sides',
    data: { casualties: 1500 },
    consequences: [],
    witnessed: true,
    priority: 8,
    tags: ['war', 'battle']
  },
  {
    id: 'event_war_003',
    timestamp: 3000,
    type: 'BATTLE',
    severity: 7,
    category: 'MILITARY',
    location: { x: 200, y: 300, z: 100 },
    systemId: 'mars_orbit',
    participants: ['earth_federation', 'mars_coalition'],
    description: 'Mars Coalition repels Federation attack near Mars orbit',
    data: { casualties: 800 },
    consequences: [],
    witnessed: true,
    priority: 7,
    tags: ['war', 'defense']
  }
];

for (const event of warEvents) {
  history.recordEvent(event);
}

console.log('Generating chronicle from war events...');
console.log();

// Auto-detect and generate war chronicle
const autoChronicles = chronicles.generateChronicles({
  start: 2000,
  end: 3000
});

console.log(`✓ Generated ${autoChronicles.length} chronicles`);
console.log();

for (const chronicle of autoChronicles) {
  console.log('─'.repeat(70));
  console.log(`CHRONICLE: ${chronicle.title}`);
  console.log(`Type: ${chronicle.type} | Significance: ${chronicle.significance}/10`);
  console.log(`Timespan: ${chronicle.timespan.start} - ${chronicle.timespan.end}`);
  console.log(`Themes: ${chronicle.themes.join(', ')}`);
  console.log('─'.repeat(70));
  console.log();
  console.log(chronicle.narrative);
  console.log();
}

// ====================================================================
// SCENARIO 5: Legend Creation
// ====================================================================

console.log('SCENARIO 5: Legend Creation from Epic Event');
console.log('-'.repeat(70));

// Create legendary event
const heroicEvent: HistoricalEvent = {
  id: 'event_hero_001',
  timestamp: 4000,
  type: 'HEROIC_DEED',
  severity: 10,
  category: 'MILITARY',
  location: { x: 500, y: 600, z: 200 },
  systemId: 'europa',
  participants: ['captain_nova'],
  description: 'Captain Nova single-handedly saved Europa Station from reactor meltdown, sacrificing their ship',
  data: { livesSSaved: 10000 },
  consequences: [],
  witnessed: true,
  priority: 10,
  tags: ['heroism', 'sacrifice', 'legend']
};

history.recordEvent(heroicEvent);

// Create legend with moderate exaggeration
const legend = chronicles.createLegend(heroicEvent, 'HERO_TALE', 0.5);

console.log('✓ Legend created from heroic event');
console.log();
console.log(`Name: ${legend.name}`);
console.log(`Status: ${legend.status}`);
console.log(`Basis in Truth: ${(legend.basisInTruth * 100).toFixed(0)}%`);
console.log(`Cultural Significance: ${legend.culturalSignificance}/10`);
console.log(`Believability: ${(legend.believability * 100).toFixed(0)}%`);
console.log();
console.log('Narrative:');
console.log(legend.narrative);
console.log();

// Create variant (legend evolves as it's retold)
const variant = chronicles.createLegendVariant(legend.id, 'outer_colonies', 0.4);
if (variant) {
  console.log('✓ Legend variant created (as told by Outer Colonies)');
  console.log(`  Changes: ${variant.changeFromOriginal}`);
  console.log();
}

// ====================================================================
// SCENARIO 6: Prophecy Generation
// ====================================================================

console.log('SCENARIO 6: Prophecy Generation from Trends');
console.log('-'.repeat(70));

// Generate prophecy based on recent war events
const prophecy = chronicles.generateProphecy('oracle_of_titan', 5000);

console.log('✓ Prophecy generated by Oracle of Titan');
console.log();
console.log(`Proclamation: "${prophecy.proclamation}"`);
console.log(`Likelihood: ${(prophecy.likelihood * 100).toFixed(0)}%`);
console.log(`Timeframe: ${prophecy.timeframe.min} - ${prophecy.timeframe.max}`);
console.log(`Based on trends: ${prophecy.basedOnTrends.join(', ')}`);
console.log();
console.log('Conditions for fulfillment:');
for (const condition of prophecy.conditions) {
  console.log(`  • ${condition}`);
}
console.log();

// ====================================================================
// SCENARIO 7: Faction History
// ====================================================================

console.log('SCENARIO 7: Auto-generated Faction History');
console.log('-'.repeat(70));

// Generate comprehensive faction history
const earthHistory = chronicles.generateFactionHistory('earth_federation', 'Earth Federation');

console.log('✓ Generated faction history for Earth Federation');
console.log();
console.log(earthHistory.narrative);
console.log();

console.log(`Founded: ${earthHistory.foundedAt}`);
console.log(`Current Era: ${earthHistory.currentEra}`);
console.log(`Total Eras: ${earthHistory.eras.length}`);
console.log(`Major Events: ${earthHistory.majorEvents.length}`);
console.log(`Achievements: ${earthHistory.achievements.length}`);
console.log(`Rivalries: ${earthHistory.rivalries.size}`);
console.log();

// ====================================================================
// SCENARIO 8: Multi-perspective News
// ====================================================================

console.log('SCENARIO 8: Multi-perspective News Coverage');
console.log('-'.repeat(70));

// Create trade deal event
const tradeEvent: HistoricalEvent = {
  id: 'event_trade_001',
  timestamp: 6000,
  type: 'TRADE_AGREEMENT',
  severity: 6,
  category: 'ECONOMIC',
  location: { x: 0, y: 0, z: 0 },
  systemId: 'neutral_zone',
  participants: ['earth_federation', 'mars_coalition', 'belt_miners'],
  description: 'Historic tri-lateral trade agreement signed to end resource shortages',
  data: { tradeValue: 1000000 },
  consequences: [],
  witnessed: true,
  priority: 6,
  tags: ['trade', 'peace', 'economics']
};

history.recordEvent(tradeEvent);

console.log('Generating multiple perspectives on trade agreement...');
console.log();

const perspectives = newsEngine.generateMultiplePerspectives(
  tradeEvent,
  ['earth_federation', 'mars_coalition', 'belt_miners']
);

for (const article of perspectives) {
  console.log(`[${article.publisher}]`);
  console.log(`  ${article.headline}`);
  console.log(`  Bias: ${article.bias}`);
  console.log();
}

// ====================================================================
// SUMMARY
// ====================================================================

console.log('='.repeat(70));
console.log('DEMO COMPLETE - Storytelling Systems');
console.log('='.repeat(70));
console.log();

console.log('Phase 4 Features Demonstrated:');
console.log('  ✓ News generation from events with bias');
console.log('  ✓ Multi-perspective news coverage');
console.log('  ✓ Rumor propagation through communication networks');
console.log('  ✓ Information distortion over distance/unreliability');
console.log('  ✓ "While you were away" absence simulation');
console.log('  ✓ Auto-generated war chronicles');
console.log('  ✓ Legend creation from epic events');
console.log('  ✓ Legend variants (stories evolve)');
console.log('  ✓ Prophecy generation from trend analysis');
console.log('  ✓ Comprehensive faction history generation');
console.log();

const stats = {
  events: history.getAllEvents().length,
  news: newsEngine.getAllNews().length,
  rumors: rumors.getAllRumors().length,
  chronicles: chronicles.getAllChronicles().length,
  legends: chronicles.getAllLegends().length
};

console.log('Statistics:');
console.log(`  Historical events: ${stats.events}`);
console.log(`  News articles: ${stats.news}`);
console.log(`  Rumors in circulation: ${stats.rumors}`);
console.log(`  Chronicles written: ${stats.chronicles}`);
console.log(`  Legends created: ${stats.legends}`);
console.log();

console.log('The universe now tells its own stories!');
console.log('Events → News → Rumors → Chronicles → Legends → History');
console.log();
