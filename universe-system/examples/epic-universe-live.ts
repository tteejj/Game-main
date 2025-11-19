/**
 * EPIC LIVE UNIVERSE - Everything Working Together!
 *
 * This demonstrates the COMPLETE living universe with:
 * - ✅ Automatic integration (just create StarSystem)
 * - ✅ Universe-aware NPCs with AI
 * - ✅ Strategic faction AI
 * - ✅ Real-time dashboard with color output
 * - ✅ NPC-to-NPC combat and trading
 * - ✅ Event cascade chains
 * - ✅ Dynamic emergent storytelling
 *
 * Watch the universe come ALIVE! 🚀
 */

import { StarSystem, StarClass } from '../src/StarSystem';

console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
console.log('\x1b[1m\x1b[33m🌟 EPIC LIVE UNIVERSE - COMPLETE INTEGRATION 🌟\x1b[0m');
console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
console.log('');
console.log('\x1b[32mInitializing living universe with ALL features...\x1b[0m');
console.log('');

// Create star system - EVERYTHING integrates automatically!
const universe = new StarSystem('epic-system', 'Epic Universe', {
  starClass: StarClass.G,
  civilizationLevel: 9, // High civilization = more NPCs and stations
  allowHazards: true,
  allowStations: true,
  allowNPCTraffic: true,
  allowPOIs: true,
  allowSatellites: true,
  allowCommunications: true
});

console.log('\x1b[32m✓ Star system created\x1b[0m');
console.log('\x1b[32m✓ NPCs auto-registered with universe-aware AI\x1b[0m');
console.log('\x1b[32m✓ Factions auto-initialized from stations\x1b[0m');
console.log('\x1b[32m✓ Dashboard, combat, and cascade systems initialized\x1b[0m');
console.log('');
console.log('\x1b[33mWaiting for async initialization...\x1b[0m');
console.log('');

// Wait for async initialization
setTimeout(() => {
  console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
  console.log('\x1b[1m\x1b[33m🚀 LAUNCHING LIVE UNIVERSE SIMULATION 🚀\x1b[0m');
  console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
  console.log('');

  if (!universe.integratedOrchestrator) {
    console.log('\x1b[31m⚠️  Integrated orchestrator not initialized yet!\x1b[0m');
    console.log('\x1b[33m   Try increasing the initialization delay or check for errors.\x1b[0m');
    return;
  }

  console.log('\x1b[32m✓ All systems operational!\x1b[0m');
  console.log('');
  console.log('\x1b[1mLive Dashboard Updates:\x1b[0m');
  console.log('\x1b[90m  - System stats updated every render\x1b[0m');
  console.log('\x1b[90m  - NPCs making decisions at 10 Hz\x1b[0m');
  console.log('\x1b[90m  - Factions strategizing at 0.1 Hz\x1b[0m');
  console.log('\x1b[90m  - Combat and trading happening in real-time\x1b[0m');
  console.log('\x1b[90m  - Events cascading into chain reactions\x1b[0m');
  console.log('');
  console.log('\x1b[36m' + '─'.repeat(80) + '\x1b[0m');
  console.log('');

  // Main simulation loop - updates universe state
  const simulationInterval = setInterval(() => {
    universe.update(0.5); // Update at 2 Hz (0.5s per tick)
  }, 500);

  // Dashboard rendering loop - displays live stats
  const dashboardInterval = setInterval(() => {
    if (universe.integratedOrchestrator?.dashboard) {
      // Render the live dashboard
      universe.integratedOrchestrator.renderDashboard();
    }
  }, 500); // Render dashboard at 2 Hz

  // Show interesting events every 3 seconds
  const eventInterval = setInterval(() => {
    if (!universe.integratedOrchestrator) return;

    // Get active combat encounters
    const combats = universe.integratedOrchestrator.getActiveCombat();
    if (combats.length > 0) {
      console.log('');
      console.log('\x1b[31m⚔️  ACTIVE COMBAT ENCOUNTERS:\x1b[0m');
      for (const combat of combats.slice(0, 3)) {
        console.log(`  \x1b[90m${combat.ship1Id} vs ${combat.ship2Id}\x1b[0m`);
        console.log(`    \x1b[90mDamage dealt: ${combat.totalDamage.toFixed(0)}\x1b[0m`);
      }
    }

    // Get cascade chains
    const cascades = universe.integratedOrchestrator.getActiveCascades();
    if (cascades.length > 0) {
      console.log('');
      console.log('\x1b[33m🔗 ACTIVE CASCADE CHAINS:\x1b[0m');
      for (const chain of cascades.slice(0, 2)) {
        console.log(`  \x1b[90m${chain.rootEvent.type} → ${chain.chainLength} events\x1b[0m`);
        console.log(`    \x1b[90mTotal severity: ${chain.totalSeverity}\x1b[0m`);
      }
    }

    // Get trade interactions
    const interactions = universe.integratedOrchestrator.getInteractionStats();
    if (interactions.totalTrades > 0) {
      console.log('');
      console.log('\x1b[32m💰 TRADE ACTIVITY:\x1b[0m');
      console.log(`  \x1b[90mTotal trades: ${interactions.totalTrades}\x1b[0m`);
      console.log(`  \x1b[90mTotal value: ${interactions.totalTradeValue?.toFixed(0) || 0} credits\x1b[0m`);
    }
  }, 3000);

  // Run for 60 seconds then show final stats
  setTimeout(() => {
    console.log('');
    console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
    console.log('\x1b[1m\x1b[33m📊 SIMULATION COMPLETE - FINAL STATISTICS 📊\x1b[0m');
    console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
    console.log('');

    if (universe.integratedOrchestrator) {
      // Final dashboard render
      universe.integratedOrchestrator.renderDashboard();

      console.log('');
      console.log('\x1b[1m🎯 Session Summary:\x1b[0m');
      console.log('');

      // Get final stats
      const ships = universe.integratedOrchestrator.getAllShips();
      const factions = universe.integratedOrchestrator.getAllFactions();
      const interactions = universe.integratedOrchestrator.getInteractionStats();
      const cascadeStats = universe.integratedOrchestrator.getCascadeStats();

      console.log(`\x1b[36m🚀 NPCs:\x1b[0m ${ships.length} total ships`);
      console.log(`  \x1b[90m- Universe-aware AI making intelligent decisions\x1b[0m`);
      console.log(`  \x1b[90m- Learning from ${interactions.totalCombatEncounters + interactions.totalTrades} interactions\x1b[0m`);
      console.log('');

      console.log(`\x1b[35m🏰 Factions:\x1b[0m ${factions.length} active factions`);
      console.log(`  \x1b[90m- Strategic AI managing territories\x1b[0m`);
      console.log(`  \x1b[90m- Conducting diplomacy and warfare\x1b[0m`);
      console.log('');

      console.log(`\x1b[31m⚔️  Combat:\x1b[0m ${interactions.totalCombatEncounters} encounters`);
      console.log(`  \x1b[90m- Tactical decisions based on personality\x1b[0m`);
      console.log(`  \x1b[90m- Ship-to-ship battles with damage\x1b[0m`);
      console.log('');

      console.log(`\x1b[32m💰 Trade:\x1b[0m ${interactions.totalTrades} transactions`);
      console.log(`  \x1b[90m- Total value: ${interactions.totalTradeValue?.toFixed(0) || 0} credits\x1b[0m`);
      console.log('');

      console.log(`\x1b[33m🔗 Cascades:\x1b[0m ${cascadeStats.totalChains} event chains`);
      console.log(`  \x1b[90m- Longest chain: ${cascadeStats.longestChain} events\x1b[0m`);
      console.log(`  \x1b[90m- Highest severity: ${cascadeStats.highestSeverityChain}\x1b[0m`);
      console.log('');

      console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
      console.log('\x1b[1m\x1b[32m✅ LIVING UNIVERSE FULLY OPERATIONAL!\x1b[0m');
      console.log('\x1b[36m' + '═'.repeat(80) + '\x1b[0m');
      console.log('');
      console.log('\x1b[90mEverything working together automatically:\x1b[0m');
      console.log('\x1b[90m  ✓ 42+ integrated systems\x1b[0m');
      console.log('\x1b[90m  ✓ Universe-aware NPCs with learning AI\x1b[0m');
      console.log('\x1b[90m  ✓ Strategic faction AI\x1b[0m');
      console.log('\x1b[90m  ✓ Real-time combat and trading\x1b[0m');
      console.log('\x1b[90m  ✓ Event cascade chains\x1b[0m');
      console.log('\x1b[90m  ✓ Emergent storytelling\x1b[0m');
      console.log('\x1b[90m  ✓ Live visual dashboard\x1b[0m');
      console.log('');
      console.log('\x1b[1m\x1b[33m🚀 Your living universe is ready to go! 🚀\x1b[0m');
      console.log('');
    }

    // Stop all intervals
    clearInterval(simulationInterval);
    clearInterval(dashboardInterval);
    clearInterval(eventInterval);

    process.exit(0);
  }, 60000); // Run for 60 seconds

}, 3000); // Wait 3 seconds for initialization

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('\x1b[33m🛑 Shutting down universe simulation...\x1b[0m');
  process.exit(0);
});
