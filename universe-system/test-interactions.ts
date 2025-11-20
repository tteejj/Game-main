/**
 * Test ship interactions with improved spawn distances
 */

import { StarSystem } from './src/StarSystem';

console.log('═'.repeat(80));
console.log('SHIP INTERACTION TEST');
console.log('═'.repeat(80));
console.log('Testing: Ships now spawn 5-30km apart (within interaction ranges)');
console.log('Interaction ranges: Combat 5km, Trade 10km, Comm 50km');
console.log('');

const system = new StarSystem(
  'test-001',
  'Interaction Test',
  {
    seed: 12345,
    numPlanets: { min: 3, max: 5 },
    allowStations: true,
    allowAsteroidBelt: true,
    allowNPCTraffic: true,
    civilizationLevel: 7
  }
);

console.log(`System Created: ${system.name}`);
console.log(`  Stations: ${system.stations.length}`);

const startTime = Date.now();
let tickCount = 0;

// Run for 30 seconds
const duration = 30 * 1000;

function checkProgress() {
  const elapsed = Date.now() - startTime;

  if (elapsed >= duration) {
    console.log('\n' + '═'.repeat(80));
    console.log('TEST COMPLETE');
    console.log('═'.repeat(80));
    console.log(`Total ticks: ${tickCount}`);
    console.log(`Duration: ${(elapsed / 1000).toFixed(1)}s`);

    if (system.integratedOrchestrator) {
      const ships = system.integratedOrchestrator.getShips();
      const stats = system.integratedOrchestrator.getInteractionStats();

      console.log(`\nFinal Stats:`);
      console.log(`  Ships: ${ships.length}`);
      console.log(`  Total Interactions: ${stats.totalInteractions}`);
      console.log(`  Combat Encounters: ${stats.totalCombat}`);
      console.log(`  Active Combat: ${stats.activeCombat}`);
      console.log(`  Trades: ${stats.activeTrades}`);
      console.log(`  Alliances: ${stats.activeAlliances}`);
      console.log(`  Rivalries: ${stats.activeRivalries}`);

      if (stats.totalInteractions > 0) {
        console.log('\n✅ SUCCESS: Ships are interacting!');
      } else {
        console.log('\n⚠️  WARNING: No interactions detected');
      }
    }

    process.exit(0);
  }
}

console.log('\nStarting simulation...\n');

const interval = setInterval(() => {
  try {
    system.update(1/60);
    tickCount++;

    // Check every 5 seconds
    if (tickCount % 300 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[T+${elapsed.toFixed(1)}s] Tick ${tickCount} - Running...`);

      if (system.integratedOrchestrator) {
        const stats = system.integratedOrchestrator.getInteractionStats();
        if (stats.totalInteractions > 0) {
          console.log(`  Interactions so far: ${stats.totalInteractions}`);
        }
      }
    }

    checkProgress();
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    clearInterval(interval);
    process.exit(1);
  }
}, 16);
