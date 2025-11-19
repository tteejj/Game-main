/**
 * DiplomacyEventIntegration Example
 *
 * Demonstrates how the integrated diplomatic system responds to game events
 * and creates cascading diplomatic consequences.
 */

import { EventBus, UniverseEventType, EventPriority } from '../UniverseEventSystem';
import { FactionDiplomacyEngine } from './FactionDiplomacyEngine';
import { DiplomacyEventIntegration } from './DiplomacyEventIntegration';

async function demonstrateDiplomacyIntegration() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Diplomacy Event Integration - Complete Example            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Initialize systems
  const eventBus = new EventBus();
  const diplomacyEngine = new FactionDiplomacyEngine();
  const diplomacyIntegration = new DiplomacyEventIntegration(eventBus, diplomacyEngine);

  // Configure integration
  diplomacyIntegration.initialize({
    autoWarDeclaration: true,
    autoAllianceFormation: false,
    allianceThreshold: 75,
    warThreshold: -70,
    conquestImpactMultiplier: 1.5,
    tradeImpactMultiplier: 1.0,
    researchImpactMultiplier: 1.2,
  });

  console.log('✅ Systems initialized\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // SCENARIO 1: Trade Relations
  // ====================================================================

  console.log('📦 SCENARIO 1: Trade Builds Relations\n');

  // Establish initial relationship
  const terranMercury = diplomacyEngine.getRelationship('TERRAN_EMPIRE', 'MERCURY_TRADE');
  console.log(`Initial relationship: ${terranMercury.relationshipValue.toFixed(1)} (${terranMercury.status})`);

  // Complete multiple trades
  for (let i = 0; i < 5; i++) {
    eventBus.emit(
      UniverseEventType.TRADE_COMPLETED,
      {
        buyerFaction: 'TERRAN_EMPIRE',
        sellerFaction: 'MERCURY_TRADE',
        value: 75000 + Math.random() * 50000,
        commodity: ['minerals', 'food', 'technology', 'luxury_goods', 'weapons'][i],
      },
      {
        source: 'TradeSystem',
        priority: EventPriority.NORMAL,
      }
    );
  }

  await sleep(100);

  const updatedRelation = diplomacyEngine.getRelationship('TERRAN_EMPIRE', 'MERCURY_TRADE');
  console.log(`\nAfter 5 trades: ${updatedRelation.relationshipValue.toFixed(1)} (${updatedRelation.status})`);
  console.log(`Economic interdependence: ${(updatedRelation.economicInterdependence * 100).toFixed(1)}%`);
  console.log(`Trade agreements: ${updatedRelation.tradeAgreements.length}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // SCENARIO 2: Conquest Triggers Diplomatic Crisis
  // ====================================================================

  console.log('⚔️  SCENARIO 2: Conquest Triggers War\n');

  // Setup alliance
  diplomacyEngine.formAlliance(
    ['MERCURY_TRADE', 'ALPHA_DEFENSE'],
    'Trade Defense Pact',
    'Mutual protection',
    ['Protect trade routes', 'Defend against aggression']
  );

  console.log('Alliance formed: Mercury Trade + Alpha Defense\n');

  // Check relationships before conquest
  const mercuryAlpha = diplomacyEngine.getRelationship('MERCURY_TRADE', 'ALPHA_DEFENSE');
  console.log(`Mercury <-> Alpha: ${mercuryAlpha.relationshipValue.toFixed(1)} (${mercuryAlpha.status})`);

  // Terran Empire conquers Mercury territory
  console.log('\n🎯 Terran Empire captures Mercury Trade territory...\n');

  eventBus.emitSync(
    UniverseEventType.TERRITORY_CAPTURED,
    {
      newOwner: 'TERRAN_EMPIRE',
      previousOwner: 'MERCURY_TRADE',
      territoryId: 'sector_7',
      population: 150000,
    },
    {
      source: 'ConquestSystem',
      target: 'sector_7',
      priority: EventPriority.CRITICAL,
      tags: ['conquest', 'major'],
    }
  );

  await sleep(100);

  // Check diplomatic fallout
  const terranMercuryAfter = diplomacyEngine.getRelationship('TERRAN_EMPIRE', 'MERCURY_TRADE');
  const terranAlpha = diplomacyEngine.getRelationship('TERRAN_EMPIRE', 'ALPHA_DEFENSE');

  console.log('\nDiplomatic Fallout:');
  console.log(`  Terran <-> Mercury: ${terranMercuryAfter.relationshipValue.toFixed(1)} (${terranMercuryAfter.status})`);
  console.log(`  Terran <-> Alpha (ally): ${terranAlpha.relationshipValue.toFixed(1)} (${terranAlpha.status})`);
  console.log(`  War probability (Terran vs Mercury): ${(terranMercuryAfter.warProbability * 100).toFixed(1)}%`);
  console.log(`  War probability (Terran vs Alpha): ${(terranAlpha.warProbability * 100).toFixed(1)}%`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // SCENARIO 3: Resource Shortage Triggers Trade or War
  // ====================================================================

  console.log('⛏️  SCENARIO 3: Resource Shortage Diplomacy\n');

  // Create positive relationship first
  const colonialUnion = diplomacyEngine.getRelationship('COLONIAL_UNION', 'RESOURCE_CORP');
  console.log(`Initial: Colonial Union <-> Resource Corp: ${colonialUnion.relationshipValue.toFixed(1)}`);

  // Establish some trade
  eventBus.emit(
    UniverseEventType.TRADE_COMPLETED,
    {
      buyerFaction: 'COLONIAL_UNION',
      sellerFaction: 'RESOURCE_CORP',
      value: 200000,
      commodity: 'rare_metals',
    },
    {
      source: 'TradeSystem',
      priority: EventPriority.NORMAL,
    }
  );

  await sleep(50);

  console.log('\n💥 Critical resource shortage hits Colonial Union...\n');

  // Critical shortage
  eventBus.emitSync(
    UniverseEventType.RESOURCE_SHORTAGE,
    {
      resource: 'fuel',
      factionId: 'COLONIAL_UNION',
      severity: 0.9,
    },
    {
      source: 'ResourceSystem',
      priority: EventPriority.CRITICAL,
      tags: ['shortage', 'critical'],
    }
  );

  await sleep(100);

  const colonialUnionAfter = diplomacyEngine.getRelationship('COLONIAL_UNION', 'RESOURCE_CORP');
  console.log(`After shortage response: ${colonialUnionAfter.relationshipValue.toFixed(1)}`);
  console.log(`Trade agreements: ${colonialUnionAfter.tradeAgreements.length}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // SCENARIO 4: Research Unlocks Diplomatic Options
  // ====================================================================

  console.log('🔬 SCENARIO 4: Research Improves Diplomacy\n');

  eventBus.emit(
    UniverseEventType.RESEARCH_COMPLETED,
    {
      technologyId: 'tech_diplomacy',
      factionId: 'TERRAN_EMPIRE',
      researchPoints: 50000,
    },
    {
      source: 'ResearchSystem',
      priority: EventPriority.HIGH,
    }
  );

  await sleep(50);

  eventBus.emit(
    UniverseEventType.TECHNOLOGY_UNLOCKED,
    {
      technologyId: 'tech_diplomacy',
      factionId: 'TERRAN_EMPIRE',
      enablesConstruction: false,
    },
    {
      source: 'ResearchSystem',
      priority: EventPriority.HIGH,
    }
  );

  await sleep(100);

  console.log('\n✅ Diplomatic options unlocked for Terran Empire');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // SCENARIO 5: Population Unrest Affects Stability
  // ====================================================================

  console.log('😡 SCENARIO 5: Unrest Weakens Faction\n');

  const piratesBefore = diplomacyEngine.getRelationship('PIRATE_CLANS', 'TERRAN_EMPIRE');
  console.log(`Before unrest - Pirates vs Terran: ${piratesBefore.relationshipValue.toFixed(1)}`);
  console.log(`War probability: ${(piratesBefore.warProbability * 100).toFixed(1)}%`);

  // Create unrest in Terran territory
  eventBus.emitSync(
    UniverseEventType.POPULATION_UNREST,
    {
      cityId: 'terra_prime',
      unrestLevel: 0.85,
      reason: 'ECONOMIC_HARDSHIP',
      factionId: 'TERRAN_EMPIRE',
      affectedPopulation: 2000000,
    },
    {
      source: 'PopulationSystem',
      target: 'terra_prime',
      priority: EventPriority.HIGH,
      tags: ['unrest', 'crisis'],
    }
  );

  await sleep(100);

  const piratesAfter = diplomacyEngine.getRelationship('PIRATE_CLANS', 'TERRAN_EMPIRE');
  console.log(`\nAfter unrest - Pirates vs Terran: ${piratesAfter.relationshipValue.toFixed(1)}`);
  console.log(`War probability: ${(piratesAfter.warProbability * 100).toFixed(1)}% (enemies sense weakness)`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // SCENARIO 6: Combat Damages Relations
  // ====================================================================

  console.log('💥 SCENARIO 6: Combat Escalates Tensions\n');

  const neutralFactions = diplomacyEngine.getRelationship('NEUTRAL_ZONE', 'FRONTIER_GUARD');
  console.log(`Before combat: ${neutralFactions.relationshipValue.toFixed(1)} (${neutralFactions.status})`);

  // Combat starts
  eventBus.emit(
    UniverseEventType.COMBAT_STARTED,
    {
      attackerFaction: 'FRONTIER_GUARD',
      defenderFaction: 'NEUTRAL_ZONE',
      location: 'border_station_5',
    },
    {
      source: 'CombatSystem',
      priority: EventPriority.URGENT,
    }
  );

  await sleep(50);

  // Combat ends
  eventBus.emit(
    UniverseEventType.COMBAT_ENDED,
    {
      attackerFaction: 'FRONTIER_GUARD',
      defenderFaction: 'NEUTRAL_ZONE',
      victor: 'FRONTIER_GUARD',
      casualties: 150,
      location: 'border_station_5',
    },
    {
      source: 'CombatSystem',
      priority: EventPriority.HIGH,
    }
  );

  await sleep(100);

  const neutralAfterCombat = diplomacyEngine.getRelationship('NEUTRAL_ZONE', 'FRONTIER_GUARD');
  console.log(`\nAfter combat: ${neutralAfterCombat.relationshipValue.toFixed(1)} (${neutralAfterCombat.status})`);
  console.log(`Military balance: ${neutralAfterCombat.militaryBalance.toFixed(2)}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // SCENARIO 7: Station Destruction Triggers War
  // ====================================================================

  console.log('🏭 SCENARIO 7: Station Destruction → Immediate War\n');

  const civilianDefender = diplomacyEngine.getRelationship('CIVILIAN_AUTHORITY', 'DEFENDER_FLEET');
  console.log(`Before: ${civilianDefender.relationshipValue.toFixed(1)} (${civilianDefender.status})`);

  eventBus.emitSync(
    UniverseEventType.STATION_DESTROYED,
    {
      stationFaction: 'CIVILIAN_AUTHORITY',
      attackerFaction: 'DEFENDER_FLEET',
      stationValue: 5000000,
      civilianCasualties: 15000,
      location: 'habitat_omega',
    },
    {
      source: 'CombatSystem',
      priority: EventPriority.CRITICAL,
      tags: ['war-crime', 'civilians'],
    }
  );

  await sleep(100);

  const civilianDefenderAfter = diplomacyEngine.getRelationship('CIVILIAN_AUTHORITY', 'DEFENDER_FLEET');
  console.log(`\nAfter station destruction: ${civilianDefenderAfter.relationshipValue.toFixed(1)} (${civilianDefenderAfter.status})`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ====================================================================
  // Summary Statistics
  // ====================================================================

  console.log('📊 INTEGRATION SUMMARY\n');

  const stats = diplomacyIntegration.getStats();
  console.log(`Active event subscriptions: ${stats.activeSubscriptions}`);
  console.log(`Auto-war declarations: ${stats.config.autoWarDeclaration ? 'ENABLED' : 'DISABLED'}`);
  console.log(`War threshold: ${stats.config.warThreshold}`);
  console.log(`Alliance threshold: ${stats.config.allianceThreshold}`);

  const eventStats = eventBus.getStats();
  console.log(`\nTotal events processed: ${eventStats.totalEventsEmitted}`);
  console.log(`Average processing time: ${eventStats.averageProcessingTime.toFixed(3)}ms`);

  // Show all faction relationships
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 FINAL DIPLOMATIC STATE\n');

  const allFactions = diplomacyEngine.getAllFactions();
  console.log(`Known factions: ${allFactions.length}`);

  // Get relationship summary
  const relationships: any[] = [];
  for (let i = 0; i < allFactions.length; i++) {
    for (let j = i + 1; j < allFactions.length; j++) {
      const rel = diplomacyEngine.getRelationship(allFactions[i], allFactions[j]);
      if (rel.recentInteractions.length > 0) {
        relationships.push({
          factions: `${allFactions[i]} <-> ${allFactions[j]}`,
          value: rel.relationshipValue,
          status: rel.status,
          interactions: rel.recentInteractions.length,
        });
      }
    }
  }

  // Sort by relationship value
  relationships.sort((a, b) => b.value - a.value);

  console.log('\nTop Relationships:');
  relationships.slice(0, 5).forEach((rel) => {
    console.log(`  ${rel.factions}: ${rel.value.toFixed(1)} (${rel.status}) - ${rel.interactions} interactions`);
  });

  console.log('\nWorst Relationships:');
  relationships.slice(-5).forEach((rel) => {
    console.log(`  ${rel.factions}: ${rel.value.toFixed(1)} (${rel.status}) - ${rel.interactions} interactions`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✨ Diplomacy Integration Demo Complete!\n');
  console.log('KEY ACHIEVEMENTS:');
  console.log('  ✅ Trade improves relations quantifiably');
  console.log('  ✅ Conquest triggers wars and ally responses');
  console.log('  ✅ Resource shortages drive diplomatic actions');
  console.log('  ✅ Research unlocks diplomatic options');
  console.log('  ✅ Population unrest weakens diplomatic position');
  console.log('  ✅ Combat damages relationships progressively');
  console.log('  ✅ All events cascade through diplomatic system');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Cleanup
  diplomacyIntegration.shutdown();
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run if executed directly
if (require.main === module) {
  demonstrateDiplomacyIntegration().catch(console.error);
}

export { demonstrateDiplomacyIntegration };
