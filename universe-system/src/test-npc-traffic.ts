/**
 * test-npc-traffic.ts
 * Simple test to verify NPC traffic system works
 */

import { createKeplerStationSystem } from './demo-system';

// Create system
const system = createKeplerStationSystem();

// Verify NPC ships were generated
const shipCount = system.trafficManager.getVesselCount();

if (shipCount === 0) {
  throw new Error('No NPC ships were generated!');
}

// Verify ships have physics and navigation
const allShips = system.trafficManager.getAllVessels();
for (const ship of allShips) {
  const state = ship.getState();

  if (!state.position) {
    throw new Error(`Ship ${ship.name} has no position`);
  }

  if (!state.velocity) {
    throw new Error(`Ship ${ship.name} has no velocity`);
  }
}

// Verify traffic manager spatial grid
const stats = system.trafficManager.getStatistics();
if (stats.totalVessels !== shipCount) {
  throw new Error('Traffic manager statistics mismatch');
}

// Test update (simulate 1 second)
system.update(1.0);

// Verify ships updated
for (const ship of allShips) {
  const state = ship.getState();
  // Ships should have moved or maintained position
  if (isNaN(state.position.x) || isNaN(state.position.y) || isNaN(state.position.z)) {
    throw new Error(`Ship ${ship.name} has invalid position after update`);
  }
}

// Success!
process.stdout.write(`✓ NPC Traffic System Test Passed!\n`);
process.stdout.write(`  - Generated ${shipCount} NPC ships\n`);
process.stdout.write(`  - All ships have valid physics states\n`);
process.stdout.write(`  - Traffic manager working correctly\n`);
process.stdout.write(`  - System update successful\n`);
process.exit(0);
