/**
 * Basic Universe Simulation Test
 *
 * Simple test that runs core systems without complex integrations
 */

import { StarSystem } from './src/StarSystem';

console.log('═'.repeat(80));
console.log('BASIC UNIVERSE SIMULATION TEST');
console.log('═'.repeat(80));
console.log('');

// Create a simple star system
console.log('Creating Star System...');
const system = new StarSystem(
  'test-001',
  'Test System',
  {
    seed: 12345,
    numPlanets: { min: 3, max: 5 },
    allowStations: true,
    allowAsteroidBelt: true,
    allowNPCTraffic: true,
    civilizationLevel: 7
  }
);

console.log(`✓ Created: ${system.name}`);
console.log(`  Star: ${system.star.name} (${system.star.starClass})`);
console.log(`  Planets: ${system.planets.length}`);
console.log(`  Moons: ${system.moons.length}`);
console.log(`  Stations: ${system.stations.length}`);
console.log(`  Asteroids: ${system.asteroids.length}`);
console.log('');

// Run simulation
console.log('═'.repeat(80));
console.log('RUNNING SIMULATION');
console.log('═'.repeat(80));
console.log('');

const startTime = Date.now();
const runDuration = 30; // 30 seconds
let tickCount = 0;
let lastReportTime = startTime;

console.log(`Running for ${runDuration} seconds...`);
console.log('');

function report() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('═'.repeat(80));
  console.log(`MACRO STATUS - T+${elapsed}s (Tick ${tickCount})`);
  console.log('═'.repeat(80));

  // ========== UNIVERSE STATS ==========
  console.log('\n[UNIVERSE]');
  console.log(`  Stations: ${system.stations.length}`);
  console.log(`  Markets: ${system.markets.size}`);
  console.log(`  Asteroids: ${system.asteroids.length}`);

  // ========== NPC SHIPS ==========
  if (system.integratedOrchestrator) {
    const ships = system.integratedOrchestrator.getShips();
    console.log(`\n[SHIPS] Total: ${ships.length}`);

    // Count by type
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let lowHealth = 0;
    let lowFuel = 0;

    for (const npc of ships) {
      const type = npc.ship.type || 'UNKNOWN';
      byType[type] = (byType[type] || 0) + 1;

      const status = npc.ship.status || 'IDLE';
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (npc.ship.health < 0.3) lowHealth++;
      if (npc.ship.fuel < 0.2) lowFuel++;
    }

    console.log('  By Type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

    console.log('  By Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });

    if (lowHealth > 0) console.log(`  ⚠ Low health: ${lowHealth} ships`);
    if (lowFuel > 0) console.log(`  ⚠ Low fuel: ${lowFuel} ships`);
  }

  // ========== SHIP INTERACTIONS ==========
  if (system.integratedOrchestrator) {
    const stats = system.integratedOrchestrator.getInteractionStats();
    console.log('\n[INTERACTIONS]');
    console.log(`  Total: ${stats.totalInteractions}`);
    console.log(`  Active Combat: ${stats.activeCombat}`);
    console.log(`  Total Combat: ${stats.totalCombat}`);
    console.log(`  Active Trades: ${stats.activeTrades}`);
    console.log(`  Alliances: ${stats.activeAlliances}`);
    console.log(`  Rivalries: ${stats.activeRivalries}`);
  }

  // ========== MANUFACTURING ==========
  if (system.manufacturingSystem) {
    console.log('\n[MANUFACTURING]');
    console.log(`  System Active: Yes`);
    // Detailed stats require methods that may not be exposed yet
  }

  // ========== FACTIONS ==========
  if (system.factionDiplomacy) {
    console.log(`\n[FACTIONS]`);
    console.log(`  System Active: Yes`);
    // Detailed faction stats require API methods
  }

  // ========== POPULATION ==========
  if (system.populationSystem) {
    const stations = system.stations;
    let totalPop = 0;

    for (const station of stations) {
      if (station.population) totalPop += station.population;
    }

    console.log(`\n[POPULATION]`);
    console.log(`  Total: ${(totalPop / 1_000_000).toFixed(2)}M across ${stations.length} stations`);
  }

  // ========== ECONOMY ==========
  if (system.markets && system.markets.size > 0) {
    console.log(`\n[ECONOMY]`);
    console.log(`  Markets: ${system.markets.size}`);
    console.log(`  System Active: Yes`);
  }

  // ========== EVENTS ==========
  if (system.eventSystem) {
    console.log(`\n[EVENTS]`);
    console.log(`  Subscribers: ${system.eventSystem.getSubscriberCount()}`);
  }

  console.log('');
}

// Initial report
report();

// Run simulation loop
const interval = setInterval(() => {
  tickCount++;

  // Update at 60 FPS
  system.update(1/60);

  // Report every 5 seconds
  if (Date.now() - lastReportTime >= 5000) {
    report();
    lastReportTime = Date.now();
  }

  // Stop after duration
  if (Date.now() - startTime >= runDuration * 1000) {
    clearInterval(interval);

    console.log('═'.repeat(80));
    console.log('SIMULATION COMPLETE');
    console.log('═'.repeat(80));
    console.log('');
    console.log(`Total ticks: ${tickCount}`);
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('');

    // Final report
    report();

    process.exit(0);
  }
}, 16); // ~60 FPS
