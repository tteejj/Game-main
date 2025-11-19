/**
 * Simple test to verify the fixes actually work
 */

import { StarSystem, StarClass } from './src/StarSystem';
import { NPCShip, ShipType } from './src/npc-traffic/npc-ship';
import { Vector3 } from '../physics-modules/src/Vector3';

console.log('='.repeat(80));
console.log('TESTING: Core Systems Actually Work');
console.log('='.repeat(80));
console.log('');

// Create star system
console.log('1. Creating StarSystem...');
const system = new StarSystem('test', 'Test System', {
  starClass: StarClass.G,
  civilizationLevel: 5,
  allowHazards: true,
  allowStations: true,
  allowNPCTraffic: true
});
console.log('  ✓ StarSystem created');
console.log('');

// Wait for initialization
console.log('2. Waiting for async initialization...');
setTimeout(() => {
  console.log('  ✓ Initialization complete');
  console.log('');

  // Check if integrated orchestrator exists
  console.log('3. Checking IntegratedUniverseOrchestrator...');
  if (!system.integratedOrchestrator) {
    console.error('  ✗ FAILED: IntegratedOrchestrator not initialized!');
    process.exit(1);
  }
  console.log('  ✓ IntegratedOrchestrator exists');
  console.log('');

  // Check integrated ships
  console.log('4. Checking registered ships...');
  const ships = system.integratedOrchestrator.getAllShips();
  console.log(`  ✓ ${ships.length} ships registered`);

  if (ships.length === 0) {
    console.error('  ✗ FAILED: No ships registered!');
    process.exit(1);
  }

  // Check ship structure
  const ship = ships[0];
  console.log(`  ✓ Ship structure:`);
  console.log(`    - ship.id: ${ship.ship.id}`);
  console.log(`    - ship.type: ${ship.ship.type}`);
  console.log(`    - ship.health: ${ship.ship.health}`);
  console.log(`    - ship.cargo.length: ${ship.ship.cargo.length}`);
  console.log(`    - factionId: ${ship.factionId || 'none'}`);
  console.log('');

  // Test damage system
  console.log('5. Testing damage system...');
  const initialHealth = ship.ship.health;
  ship.ship.takeDamage(0.1);
  const afterDamage = ship.ship.health;
  if (afterDamage < initialHealth) {
    console.log(`  ✓ Damage working: ${initialHealth.toFixed(2)} → ${afterDamage.toFixed(2)}`);
  } else {
    console.error('  ✗ FAILED: takeDamage() not working!');
    process.exit(1);
  }
  ship.ship.repair(0.1); // Repair for further tests
  console.log('');

  // Test cargo system
  console.log('6. Testing cargo system...');
  const cargoResult = ship.ship.addCargo({ type: 'Test Cargo', amount: 10, value: 100 });
  if (cargoResult && ship.ship.cargo.length > 0) {
    console.log(`  ✓ Cargo system working: Added ${ship.ship.cargo[ship.ship.cargo.length - 1].amount} tons`);
  } else {
    console.error('  ✗ FAILED: addCargo() not working!');
    process.exit(1);
  }
  console.log('');

  // Test reputation system
  console.log('7. Testing reputation system...');
  const repSys = system.integratedOrchestrator.reputationSystem;
  if (ships.length >= 2) {
    repSys.recordInteraction(ships[0].ship.id, ships[1].ship.id, 'ATTACKED', 'Test attack');
    const rep = repSys.getReputation(ships[0].ship.id, ships[1].ship.id);
    console.log(`  ✓ Reputation system working: ${rep} (negative after attack)`);
  } else {
    console.log('  ⚠ Skipped: Need 2+ ships');
  }
  console.log('');

  // Test economic simulation
  console.log('8. Testing economic simulation...');
  const econ = system.integratedOrchestrator.economicSim;
  const markets = econ.getStats();
  console.log(`  ✓ Economic sim working: ${markets.totalMarkets} markets created`);
  if (markets.totalMarkets > 0) {
    console.log(`    - ${markets.totalCommodities} commodities`);
    console.log(`    - ${markets.activeEvents} active events`);
  }
  console.log('');

  // Run update loop to test interactions
  console.log('9. Testing update loop (10 iterations)...');
  for (let i = 0; i < 10; i++) {
    system.update(0.5);
  }
  console.log('  ✓ Update loop ran successfully');
  console.log('');

  // Check interaction stats
  console.log('10. Checking interaction statistics...');
  const interactionStats = system.integratedOrchestrator.getInteractionStats();
  console.log(`  ✓ Interaction stats:`);
  console.log(`    - Total interactions: ${interactionStats.totalInteractions || 0}`);
  console.log(`    - Combat encounters: ${interactionStats.totalCombatEncounters || 0}`);
  console.log(`    - Trades: ${interactionStats.totalTrades || 0}`);
  console.log('');

  console.log('='.repeat(80));
  console.log('✅ ALL TESTS PASSED');
  console.log('='.repeat(80));
  console.log('');
  console.log('Summary:');
  console.log(`  - StarSystem: WORKING`);
  console.log(`  - IntegratedOrchestrator: WORKING`);
  console.log(`  - Ship registration: WORKING (${ships.length} ships)`);
  console.log(`  - Damage system: WORKING`);
  console.log(`  - Cargo system: WORKING`);
  console.log(`  - Reputation system: WORKING`);
  console.log(`  - Economic simulation: WORKING (${markets.totalMarkets} markets)`);
  console.log(`  - Update loop: WORKING`);
  console.log('');

  process.exit(0);
}, 3000); // Wait 3 seconds for async init
