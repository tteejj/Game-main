/**
 * FactionCoordinatorUsage.example.ts
 *
 * Practical example of using FactionStrategicCoordinator in your game.
 */

import { FactionAISystem } from './FactionCoordinatorIntegration';
import { ConquestSystem } from '../ConquestSystem';
import { ConstructionSystem } from '../ConstructionSystem';
import { StarSystem } from '../StarSystem';
import { StationFaction } from '../StationGenerator';

/**
 * EXAMPLE 1: Basic Setup
 *
 * How to set up the coordinated faction AI system in your game.
 */
export function exampleBasicSetup(
  conquestSystem: ConquestSystem,
  constructionSystem: ConstructionSystem,
  starSystems: Map<string, StarSystem>
) {
  // 1. Create the unified faction AI system
  const factionAI = new FactionAISystem(
    conquestSystem,
    constructionSystem,
    starSystems
  );

  // 2. Initialize each faction
  const solarSystem = starSystems.get('SOL')!;

  factionAI.initializeFaction('UNITED_EARTH', solarSystem, { x: 0, y: 0, z: 0 });
  factionAI.initializeFaction('MARS_FEDERATION', solarSystem, { x: 228000000, y: 0, z: 0 });
  factionAI.initializeFaction('BELT_ALLIANCE', solarSystem, { x: 450000000, y: 0, z: 0 });

  // 3. Return the system for use in game loop
  return factionAI;
}

/**
 * EXAMPLE 2: Game Loop Integration
 *
 * How to update faction AI in your main game loop.
 */
export function exampleGameLoop(factionAI: FactionAISystem) {
  const currentTime = Date.now() / 1000;
  const deltaTime = 1.0;  // 1 second

  // Single call updates ALL coordinated AI systems
  factionAI.update(currentTime, deltaTime);

  // That's it! The coordinator ensures:
  // - Military targets align with economic needs
  // - Expansion builds the right stations
  // - Research priorities match strategy
  // - All systems work toward faction goals
}

/**
 * EXAMPLE 3: Querying Strategic State
 *
 * How to check what a faction is doing.
 */
export function exampleQueryState(factionAI: FactionAISystem) {
  const coordinator = factionAI.getCoordinator();

  // Get strategic report for a faction
  const report = coordinator.getStrategicReport('MARS_FEDERATION');
  console.log(report);

  // Output will be:
  // === STRATEGIC REPORT: MARS_FEDERATION ===
  //
  // PRIMARY STRATEGY: EXPAND
  // Secondary Strategy: CONSOLIDATE
  //
  // SITUATION ASSESSMENT:
  //   Economic Health: 72% 🟢
  //   Military Threat: 2.0/10 🟢
  //   Tech Level: 2.5 ✓
  //   Territory: 5 systems
  //
  // CRITICAL NEEDS:
  //   None - all needs met
  //
  // RESOURCE ALLOCATION:
  //   Military: 45000 credits
  //   Expansion: 67500 credits
  //   Research: 30000 credits
  //
  // PRIORITIES:
  //   EXPAND        ████████░░ 80%
  //   CONSOLIDATE   ██████░░░░ 60%
  //   RESEARCH      ████░░░░░░ 40%
  //   ...

  // Get recent strategic decisions
  const decisions = coordinator.getDecisionHistory('MARS_FEDERATION', 3);
  decisions.forEach(decision => {
    console.log(`Decision at ${new Date(decision.timestamp * 1000).toISOString()}:`);
    console.log(`  Priority: ${decision.situation.primaryPriority}`);
    console.log(`  Directives: ${decision.directives.length}`);
    console.log(`  Expected: ${decision.expectedOutcome}`);
  });
}

/**
 * EXAMPLE 4: Responding to Events
 *
 * How faction AI reacts to game events.
 */
export function exampleEventResponse(factionAI: FactionAISystem) {
  const coordinator = factionAI.getCoordinator();
  const { economicNeeds, diplomacyEngine } = factionAI.getComponents();

  // EVENT 1: Resource shortage detected
  console.log('\n--- EVENT: Resource Shortage ---');
  const economy = economicNeeds.getFactionEconomy('BELT_ALLIANCE');

  // Simulate fuel crisis
  const fuelNeed = economy.criticalResources.get('FUEL')!;
  fuelNeed.currentStock = fuelNeed.requiredPerDay * 8;  // 8 days left
  fuelNeed.daysRemaining = 8;
  fuelNeed.inCrisis = true;
  economy.crisisLevel = 7;

  // Coordinator will automatically respond on next update
  console.log('BELT_ALLIANCE fuel crisis detected!');
  console.log('Coordinator will:');
  console.log('  - Shift to SURVIVE priority');
  console.log('  - Direct military to target fuel sources');
  console.log('  - Order construction of refineries');
  console.log('  - Prioritize propulsion research');

  // EVENT 2: War declaration
  console.log('\n--- EVENT: War Declared ---');
  diplomacyEngine.declareWar('UNITED_EARTH', 'MARS_FEDERATION', ['BORDER_DISPUTE']);

  console.log('War between UNITED_EARTH and MARS_FEDERATION!');
  console.log('Both coordinators will:');
  console.log('  - Shift to ATTACK/CONSOLIDATE priorities');
  console.log('  - Increase military budgets');
  console.log('  - Build defense platforms');
  console.log('  - Research military tech');

  // Coordinators handle this automatically in their update loop
}

/**
 * EXAMPLE 5: Manual Strategic Override
 *
 * How to manually set faction strategy (for special scenarios).
 */
export function exampleManualOverride(factionAI: FactionAISystem) {
  const coordinator = factionAI.getCoordinator();

  // Scenario: Story event forces faction into tech race
  console.log('\n--- STORY EVENT: Ancient Alien Tech Discovered ---');

  // Force OUTER_COLONIES into research mode
  coordinator.setStrategicPriority('OUTER_COLONIES', 'RESEARCH', 0.9);

  console.log('OUTER_COLONIES priority overridden: RESEARCH');
  console.log('All AI systems will now focus on research:');
  console.log('  - Military protects research sites');
  console.log('  - Expansion builds research stations');
  console.log('  - 50%+ budget to research');

  // Force immediate decision update
  coordinator.forceDecision('OUTER_COLONIES', Date.now() / 1000);

  // Check the result
  const situation = coordinator.evaluateStrategicSituation('OUTER_COLONIES');
  console.log(`\nConfirmed priority: ${situation.primaryPriority}`);
  console.log(`Research budget: ${situation.researchBudget.toFixed(0)} credits`);
}

/**
 * EXAMPLE 6: Multi-Faction Coordination
 *
 * How different factions respond differently to same situation.
 */
export function exampleMultiFactionBehavior(factionAI: FactionAISystem) {
  const coordinator = factionAI.getCoordinator();

  console.log('\n--- SCENARIO: Galaxy-Wide Fuel Crisis ---');
  console.log('All factions face fuel shortage. Watch different responses:\n');

  const factions: StationFaction[] = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE'];

  for (const factionId of factions) {
    const situation = coordinator.evaluateStrategicSituation(factionId);
    const directives = coordinator.coordinateOperations(factionId);

    console.log(`${factionId}:`);
    console.log(`  Strategy: ${situation.primaryPriority}`);

    // Each faction responds based on their situation
    const militaryDirective = directives.find(d => d.system === 'MILITARY');
    const expansionDirective = directives.find(d => d.system === 'EXPANSION');

    if (militaryDirective) {
      console.log(`  Military: ${militaryDirective.action}`);
    }
    if (expansionDirective) {
      console.log(`  Expansion: ${expansionDirective.action}`);
    }

    console.log('');
  }

  // Possible outputs:
  // UNITED_EARTH (militarily strong):
  //   Strategy: ATTACK
  //   Military: TARGET_RESOURCE_PRODUCERS (conquer fuel sources)
  //   Expansion: BUILD_RESOURCE_PRODUCER (also build refineries)
  //
  // MARS_FEDERATION (fuel-rich):
  //   Strategy: TRADE
  //   Military: PROTECT_EXPANSION (defend refineries)
  //   Expansion: BUILD_RESOURCE_PRODUCER (expand fuel production)
  //
  // BELT_ALLIANCE (weak military):
  //   Strategy: SURVIVE
  //   Military: DEFENSIVE_POSTURE (defend existing)
  //   Expansion: BUILD_RESOURCE_PRODUCER (emergency refineries)
}

/**
 * EXAMPLE 7: Debug and Monitoring
 *
 * How to monitor AI decisions for debugging.
 */
export function exampleDebugMonitoring(factionAI: FactionAISystem) {
  const coordinator = factionAI.getCoordinator();
  const { economicNeeds } = factionAI.getComponents();

  console.log('\n=== AI DEBUG DASHBOARD ===\n');

  const factions: StationFaction[] = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE'];

  for (const factionId of factions) {
    console.log(`\n--- ${factionId} ---`);

    // 1. Strategic situation
    const situation = coordinator.evaluateStrategicSituation(factionId);
    console.log(`Priority: ${situation.primaryPriority}`);
    console.log(`Economic Health: ${(situation.economicHealth * 100).toFixed(0)}%`);
    console.log(`Threat Level: ${situation.threatLevel.toFixed(1)}/10`);

    // 2. Economic state
    const economy = economicNeeds.getFactionEconomy(factionId);
    console.log(`Economic State: ${economy.economicState}`);
    console.log(`Crisis Level: ${economy.crisisLevel}/10`);

    // 3. Critical needs
    const criticalNeeds = Array.from(economy.criticalResources.entries())
      .filter(([_, need]) => need.inCrisis || need.daysRemaining < 30);

    if (criticalNeeds.length > 0) {
      console.log('Critical Needs:');
      criticalNeeds.forEach(([commodity, need]) => {
        console.log(`  ${commodity}: ${need.daysRemaining.toFixed(0)} days`);
      });
    } else {
      console.log('Critical Needs: None');
    }

    // 4. Active directives
    const directives = coordinator.coordinateOperations(factionId);
    const highPriority = directives.filter(d => d.priority > 80);

    if (highPriority.length > 0) {
      console.log('High-Priority Directives:');
      highPriority.forEach(d => {
        console.log(`  [${d.system}] ${d.action} (${d.priority})`);
      });
    }
  }
}

/**
 * EXAMPLE 8: Full Integration Example
 *
 * Complete example from setup to running game.
 */
export class FactionCoordinatorGameExample {
  private factionAI: FactionAISystem;
  private gameTime: number = 0;

  constructor(
    conquestSystem: ConquestSystem,
    constructionSystem: ConstructionSystem,
    starSystems: Map<string, StarSystem>
  ) {
    // Setup
    this.factionAI = new FactionAISystem(conquestSystem, constructionSystem, starSystems);

    // Initialize factions
    const sol = starSystems.get('SOL')!;
    this.factionAI.initializeFaction('UNITED_EARTH', sol, { x: 0, y: 0, z: 0 });
    this.factionAI.initializeFaction('MARS_FEDERATION', sol, { x: 228000000, y: 0, z: 0 });

    console.log('[Game] Faction AI System initialized');
  }

  /**
   * Main game loop
   */
  public gameLoop(deltaTime: number): void {
    this.gameTime += deltaTime;

    // Update faction AI (handles all coordination automatically)
    this.factionAI.update(this.gameTime, deltaTime);

    // That's it! All faction AI systems are now coordinated:
    // - Strategic priorities evaluated
    // - Resources allocated
    // - Military, expansion, research aligned
    // - Coherent decisions made
  }

  /**
   * Handle game event
   */
  public onGameEvent(eventType: string, data: any): void {
    const { economicNeeds, diplomacyEngine } = this.factionAI.getComponents();

    switch (eventType) {
      case 'TRADE_COMPLETED':
        // Diplomacy system tracks this automatically
        break;

      case 'STATION_DESTROYED':
        // Updates economic needs and diplomacy automatically
        break;

      case 'RESOURCE_DISCOVERED':
        // Faction AI will adjust strategies automatically
        console.log(`Resource discovered: ${data.commodity}`);
        console.log('Factions will coordinate to exploit it');
        break;
    }
  }

  /**
   * Get faction status for UI
   */
  public getFactionStatus(factionId: StationFaction): string {
    const coordinator = this.factionAI.getCoordinator();
    return coordinator.getStrategicReport(factionId);
  }
}

// ====================================================================
// USAGE SUMMARY
// ====================================================================

/**
 * QUICK START GUIDE:
 *
 * 1. Create FactionAISystem:
 *    const factionAI = new FactionAISystem(conquest, construction, systems);
 *
 * 2. Initialize factions:
 *    factionAI.initializeFaction('UNITED_EARTH', starSystem, homeworld);
 *
 * 3. Update in game loop:
 *    factionAI.update(currentTime, deltaTime);
 *
 * 4. Query status:
 *    const coordinator = factionAI.getCoordinator();
 *    coordinator.getStrategicReport(factionId);
 *
 * That's it! The coordinator handles all the complexity of making
 * factions act coherently.
 *
 * KEY BENEFITS:
 * - No more contradictory AI decisions
 * - Economic needs drive all actions
 * - Military, expansion, research aligned
 * - Factions respond intelligently to crises
 * - Strategic priorities clear and coherent
 * - Easy to understand what factions are doing
 */
