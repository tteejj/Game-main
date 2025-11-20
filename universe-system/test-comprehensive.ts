/**
 * Comprehensive Universe Simulation Test
 *
 * Runs for 5+ minutes and reports EVERYTHING:
 * - Ship interactions (combat, trade)
 * - Faction activities (wars, research, expansion)
 * - Economy (prices, supply/demand)
 * - Manufacturing (production)
 * - Population growth
 * - Historical events
 */

import { StarSystem } from './src/StarSystem';

console.log('═'.repeat(80));
console.log('COMPREHENSIVE UNIVERSE SIMULATION TEST');
console.log('═'.repeat(80));
console.log('Running for 5 minutes with detailed reporting every 30 seconds...');
console.log('');

const system = new StarSystem(
  'comprehensive-001',
  'Comprehensive Test System',
  {
    seed: 42,
    numPlanets: { min: 4, max: 6 },
    allowStations: true,
    allowAsteroidBelt: true,
    allowNPCTraffic: true,
    civilizationLevel: 8
  }
);

console.log(`System Created: ${system.name}`);
console.log(`  Stations: ${system.stations.length}`);
console.log(`  Planets: ${system.planets.length}`);
console.log(`  Asteroids: ${system.asteroids.length}`);
console.log('');

const startTime = Date.now();
const runDuration = 5 * 60; // 5 minutes
let tickCount = 0;
let lastReportTime = startTime;

function getDetailedReport() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(80));
  console.log(`COMPREHENSIVE STATUS - T+${elapsed}s (Tick ${tickCount})`);
  console.log('═'.repeat(80));

  // SHIPS - Detailed breakdown
  if (system.integratedOrchestrator) {
    const ships = system.integratedOrchestrator.getShips();
    console.log(`\n[SHIPS] Total: ${ships.length}`);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byFaction: Record<string, number> = {};
    let totalHealth = 0;
    let totalFuel = 0;

    ships.forEach(npc => {
      byType[npc.ship.type] = (byType[npc.ship.type] || 0) + 1;
      byStatus[npc.ship.status] = (byStatus[npc.ship.status] || 0) + 1;
      if (npc.factionId) {
        byFaction[npc.factionId] = (byFaction[npc.factionId] || 0) + 1;
      }
      totalHealth += npc.ship.health;
      totalFuel += npc.ship.fuel;
    });

    console.log('  By Type:', Object.entries(byType).map(([k,v]) => `${k}:${v}`).join(', '));
    console.log('  By Status:', Object.entries(byStatus).map(([k,v]) => `${k}:${v}`).join(', '));
    console.log('  By Faction:', Object.entries(byFaction).map(([k,v]) => `${k}:${v}`).join(', '));
    console.log(`  Avg Health: ${(totalHealth / ships.length * 100).toFixed(1)}%`);
    console.log(`  Avg Fuel: ${(totalFuel / ships.length * 100).toFixed(1)}%`);
  }

  // INTERACTIONS - Combat, Trade, Alliances
  if (system.integratedOrchestrator) {
    const stats = system.integratedOrchestrator.getInteractionStats();
    const combat = system.integratedOrchestrator.getActiveCombat();

    console.log(`\n[INTERACTIONS]`);
    console.log(`  Total Interactions: ${stats.totalInteractions}`);
    console.log(`  Combat - Active: ${stats.activeCombat}, Total: ${stats.totalCombat}`);
    console.log(`  Trade - Active: ${stats.activeTrades}`);
    console.log(`  Alliances: ${stats.activeAlliances}`);
    console.log(`  Rivalries: ${stats.activeRivalries}`);

    if (combat.length > 0) {
      console.log(`  COMBAT DETAILS:`);
      combat.slice(0, 3).forEach(c => {
        console.log(`    - ${c.attacker} vs ${c.defender} (Damage: ${c.damageDealt.toFixed(0)})`);
      });
    }
  }

  // FACTIONS - Wars, Research, Expansion
  if (system.factionDiplomacy) {
    console.log(`\n[FACTIONS]`);
    const factions = Array.from(system.factionExpansionAIs?.keys() || []);
    console.log(`  Active Factions: ${factions.join(', ')}`);

    // Check diplomatic relations
    let wars = 0;
    let alliances = 0;
    factions.forEach(f1 => {
      factions.forEach(f2 => {
        if (f1 < f2) {
          const rel = system.factionDiplomacy.getRelationship(f1, f2);
          if (rel === 'WAR') wars++;
          if (rel === 'ALLIED') alliances++;
        }
      });
    });
    console.log(`  Wars: ${wars}, Alliances: ${alliances}`);
  }

  // MANUFACTURING - Production stats
  if (system.manufacturingSystem) {
    console.log(`\n[MANUFACTURING]`);
    console.log(`  Status: Active`);
    // Would show facility stats if we had getAllFacilities()
  }

  // ECONOMY - Market activity
  if (system.markets) {
    console.log(`\n[ECONOMY]`);
    console.log(`  Markets: ${system.markets.size}`);

    let sampleCount = 0;
    system.markets.forEach((market, id) => {
      if (sampleCount < 2) {
        console.log(`  Market: ${id}`);
        // Would show commodity prices if accessible
        sampleCount++;
      }
    });
  }

  // POPULATION
  if (system.populationSystem) {
    let totalPop = 0;
    system.stations.forEach(s => {
      if (s.population) totalPop += s.population;
    });
    console.log(`\n[POPULATION]`);
    console.log(`  Total: ${(totalPop / 1_000_000).toFixed(2)}M across ${system.stations.length} stations`);
  }

  // EVENTS - Recent significant events
  console.log(`\n[EVENTS]`);
  console.log(`  Event Subscribers: ${system.eventSystem.getSubscriberCount()}`);

  console.log('');
}

// Initial report
getDetailedReport();

// Simulation loop
const interval = setInterval(() => {
  tickCount++;

  try {
    system.update(1/60); // 60 FPS

    // Report every 30 seconds
    if (Date.now() - lastReportTime >= 30000) {
      getDetailedReport();
      lastReportTime = Date.now();
    }

    // Stop after duration
    if (Date.now() - startTime >= runDuration * 1000) {
      clearInterval(interval);

      console.log('\n' + '═'.repeat(80));
      console.log('FINAL COMPREHENSIVE RESULTS');
      console.log('═'.repeat(80));
      console.log(`Total Ticks: ${tickCount}`);
      console.log(`Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
      console.log('');

      getDetailedReport();

      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    clearInterval(interval);
    process.exit(1);
  }
}, 16); // ~60 FPS
