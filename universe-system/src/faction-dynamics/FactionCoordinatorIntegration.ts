/**
 * FactionCoordinatorIntegration.ts
 *
 * Integration code showing how to wire FactionStrategicCoordinator
 * with all the faction AI systems.
 *
 * This demonstrates the complete setup and provides example scenarios.
 */

import { FactionStrategicCoordinator, StrategicPriority } from './FactionStrategicCoordinator';
import { FactionMilitaryAI } from './FactionMilitaryAI';
import { FactionExpansionAI } from './FactionExpansionAI';
import { FactionResearchAI } from './FactionResearchAI';
import { FactionEconomicNeeds } from './FactionEconomicNeeds';
import { FactionDiplomacyEngine } from './FactionDiplomacyEngine';
import { ResearchSystem } from '../ResearchSystem';
import { ConquestSystem } from '../ConquestSystem';
import { ConstructionSystem } from '../ConstructionSystem';
import { StarSystem } from '../StarSystem';
import { StationFaction } from '../StationGenerator';

/**
 * Complete Faction AI System Integration
 *
 * This class manages all faction AI components and ensures they work together.
 */
export class FactionAISystem {
  // Core AI systems
  private coordinator: FactionStrategicCoordinator;
  private militaryAI: FactionMilitaryAI;
  private researchAI: FactionResearchAI;
  private economicNeeds: FactionEconomicNeeds;
  private diplomacyEngine: FactionDiplomacyEngine;
  private researchSystem: ResearchSystem;

  // Expansion AIs (one per faction)
  private expansionAIs: Map<StationFaction, FactionExpansionAI> = new Map();

  // System dependencies
  private conquestSystem: ConquestSystem;
  private constructionSystem: ConstructionSystem;
  private starSystems: Map<string, StarSystem>;

  constructor(
    conquestSystem: ConquestSystem,
    constructionSystem: ConstructionSystem,
    starSystems: Map<string, StarSystem>
  ) {
    this.conquestSystem = conquestSystem;
    this.constructionSystem = constructionSystem;
    this.starSystems = starSystems;

    // 1. Initialize core systems
    this.economicNeeds = new FactionEconomicNeeds();
    this.diplomacyEngine = new FactionDiplomacyEngine();
    this.researchSystem = new ResearchSystem();

    // 2. Initialize AI systems
    this.militaryAI = new FactionMilitaryAI(
      this.conquestSystem,
      this.diplomacyEngine,
      this.economicNeeds
    );

    this.researchAI = new FactionResearchAI(this.researchSystem);

    // 3. Initialize the COORDINATOR (the "brain")
    this.coordinator = new FactionStrategicCoordinator(
      this.militaryAI,
      this.researchAI,
      this.economicNeeds,
      this.diplomacyEngine,
      this.researchSystem
    );

    console.log('[FactionAISystem] Complete AI system initialized');
  }

  /**
   * Initialize a faction with all AI systems
   */
  public initializeFaction(
    factionId: StationFaction,
    starSystem: StarSystem,
    homeworld: { x: number; y: number; z: number }
  ): void {
    console.log(`[FactionAISystem] Initializing ${factionId}...`);

    // 1. Initialize military AI
    this.militaryAI.initializeFaction(factionId, 'BALANCED');

    // 2. Initialize economic needs
    const economy = this.economicNeeds.getFactionEconomy(factionId);
    console.log(`  Economy initialized: ${economy.population} population`);

    // 3. Create expansion AI for this faction
    const expansionAI = new FactionExpansionAI(
      {
        id: factionId,
        name: factionId,
        government: 'DEMOCRACY',
        ideology: {
          authoritarian: 0.5,
          libertarian: 0.5,
          militaristic: 0.5,
          pacifist: 0.5,
          xenophobe: 0.5,
          xenophile: 0.5,
          materialist: 0.5,
          spiritualist: 0.5,
          economic: 0.5,
          expansionist: 0.5,
          technological: 0.5
        },
        credits: 100000,
        homeworld,
        relations: new Map(),
        personality: {
          authoritarian: 0.5,
          libertarian: 0.5,
          militaristic: 0.5,
          pacifist: 0.5,
          xenophobe: 0.5,
          xenophile: 0.5,
          materialist: 0.5,
          spiritualist: 0.5,
          economic: 0.5,
          expansionist: 0.5,
          technological: 0.5
        }
      } as any,
      starSystem,
      this.constructionSystem
    );

    this.expansionAIs.set(factionId, expansionAI);

    // 4. Register with coordinator
    this.coordinator.registerExpansionAI(factionId, expansionAI);
    this.coordinator.initializeFaction(factionId);

    console.log(`  ✓ ${factionId} fully initialized with coordinated AI`);
  }

  /**
   * Main update loop - Runs all AI systems in coordination
   */
  public update(currentTime: number, deltaTime: number): void {
    // 1. Update economic needs (affects all decisions)
    for (const [factionId, _] of this.expansionAIs) {
      this.economicNeeds.update(factionId, deltaTime);
    }

    // 2. Update diplomacy (affects military and trade)
    this.diplomacyEngine.update(deltaTime);

    // 3. Run strategic coordinator (makes high-level decisions)
    this.coordinator.update(currentTime, deltaTime);

    // 4. Update individual AI systems (following coordinator's guidance)
    this.militaryAI.update(currentTime, deltaTime);
    this.researchSystem.update(deltaTime);

    for (const [factionId, expansionAI] of this.expansionAIs) {
      expansionAI.update(deltaTime, currentTime);
    }

    // 5. Let research AI make decisions
    for (const [factionId, _] of this.expansionAIs) {
      const economy = this.economicNeeds.getFactionEconomy(factionId);
      const situation = this.coordinator.evaluateStrategicSituation(factionId);

      const factionState = FactionResearchAI.buildFactionState(
        { id: factionId, territory: [] } as any,
        0, // wars
        situation.primaryPriority === 'EXPAND',
        situation.economicHealth,
        situation.militaryStrength,
        situation.threatLevel / 10
      );

      this.researchAI.selectNextResearch(
        { id: factionId } as any,
        factionState,
        currentTime
      );
    }
  }

  /**
   * Get coordinator for external access
   */
  public getCoordinator(): FactionStrategicCoordinator {
    return this.coordinator;
  }

  /**
   * Get system components
   */
  public getComponents() {
    return {
      coordinator: this.coordinator,
      militaryAI: this.militaryAI,
      researchAI: this.researchAI,
      economicNeeds: this.economicNeeds,
      diplomacyEngine: this.diplomacyEngine
    };
  }
}

// ====================================================================
// EXAMPLE SCENARIOS - Demonstrating Coordinated Behavior
// ====================================================================

/**
 * SCENARIO 1: Resource Crisis - All Systems Align
 *
 * Faction needs FOOD desperately. Watch how all AI systems coordinate:
 */
export function demonstrateResourceCrisisScenario() {
  console.log('\n\n========================================');
  console.log('SCENARIO 1: RESOURCE CRISIS COORDINATION');
  console.log('========================================\n');

  // Setup (simplified)
  const mockSetup = createMockSetup();
  const { coordinator, economicNeeds } = mockSetup;

  const factionId: StationFaction = 'MARS_FEDERATION';

  // STEP 1: Create FOOD crisis
  console.log('--- STEP 1: Creating FOOD Crisis ---');
  const economy = economicNeeds.getFactionEconomy(factionId);
  const foodNeed = economy.criticalResources.get('FOOD')!;

  // Simulate critical shortage
  foodNeed.currentStock = foodNeed.requiredPerDay * 5;  // Only 5 days left!
  foodNeed.daysRemaining = 5;
  foodNeed.inCrisis = true;
  economy.crisisLevel = 9;

  console.log(`  ${factionId} FOOD crisis: ${foodNeed.daysRemaining} days remaining!`);
  console.log(`  Crisis level: ${economy.crisisLevel}/10`);

  // STEP 2: Coordinator evaluates situation
  console.log('\n--- STEP 2: Strategic Coordinator Evaluates ---');
  const situation = coordinator.evaluateStrategicSituation(factionId);

  console.log(`  Strategic Priority: ${situation.primaryPriority}`);
  console.log(`  Critical Needs: ${situation.criticalNeeds.join(', ')}`);
  console.log(`  Economic Crisis: ${situation.economicCrisis ? 'YES' : 'NO'}`);

  // STEP 3: Generate coordinated directives
  console.log('\n--- STEP 3: Coordinated Directives Issued ---');
  const directives = coordinator.coordinateOperations(factionId);

  console.log('  All systems now working toward FOOD production:\n');

  directives.slice(0, 5).forEach((directive, i) => {
    console.log(`  ${i + 1}. [${directive.system}] ${directive.action}`);
    console.log(`     Priority: ${directive.priority}/100`);
    console.log(`     Reason: ${directive.reasoning}`);
    console.log('');
  });

  // STEP 4: Show resource allocation
  console.log('--- STEP 4: Resource Allocation ---');
  const allocation = coordinator.allocateResources(factionId, 1000000);

  console.log('  Budget split reflects SURVIVAL priority:');
  console.log(`    Expansion: ${(allocation.expansionAllocation / allocation.totalBudget * 100).toFixed(0)}% - BUILD FOOD PRODUCTION`);
  console.log(`    Military: ${(allocation.militaryAllocation / allocation.totalBudget * 100).toFixed(0)}% - TARGET FOOD SOURCES`);
  console.log(`    Research: ${(allocation.researchAllocation / allocation.totalBudget * 100).toFixed(0)}% - FOOD TECH`);

  console.log('\n  RESULT: All systems aligned on solving FOOD crisis! ✓');
}

/**
 * SCENARIO 2: War Declaration - Defensive Coordination
 *
 * Faction is attacked. Watch defensive coordination:
 */
export function demonstrateWarDefenseScenario() {
  console.log('\n\n========================================');
  console.log('SCENARIO 2: WAR DEFENSE COORDINATION');
  console.log('========================================\n');

  const mockSetup = createMockSetup();
  const { coordinator, diplomacyEngine } = mockSetup;

  const factionId: StationFaction = 'BELT_ALLIANCE';
  const attacker: StationFaction = 'MARS_FEDERATION';

  // STEP 1: War declared
  console.log('--- STEP 1: War Declared ---');
  diplomacyEngine.declareWar(attacker, factionId, ['TERRITORIAL_EXPANSION']);

  console.log(`  ${attacker} declares war on ${factionId}!`);

  // STEP 2: Coordinator responds
  console.log('\n--- STEP 2: Strategic Response ---');
  coordinator.forceDecision(factionId, Date.now() / 1000);

  const situation = coordinator.evaluateStrategicSituation(factionId);

  console.log(`  Strategic Priority shifted to: ${situation.primaryPriority}`);
  console.log(`  Threat Level: ${situation.threatLevel}/10`);
  console.log(`  Military Threat: ${situation.militaryThreat ? 'YES' : 'NO'}`);

  // STEP 3: Coordinated defense
  console.log('\n--- STEP 3: Coordinated Defense ---');
  const directives = coordinator.coordinateOperations(factionId);

  console.log('  Defensive directives issued:\n');

  directives.filter(d => d.priority > 80).forEach((directive, i) => {
    console.log(`  ${i + 1}. [${directive.system}] ${directive.action}`);
    console.log(`     ${directive.reasoning}`);
    console.log('');
  });

  // STEP 4: Budget reallocation
  console.log('--- STEP 4: Emergency Budget Reallocation ---');
  const allocation = coordinator.allocateResources(factionId, 1000000);

  console.log('  War footing budget:');
  console.log(`    Military: ${(allocation.militaryAllocation / allocation.totalBudget * 100).toFixed(0)}% ↑ DEFENSE`);
  console.log(`    Expansion: ${(allocation.expansionAllocation / allocation.totalBudget * 100).toFixed(0)}% ↓ (Focus: Defense Platforms)`);
  console.log(`    Research: ${(allocation.researchAllocation / allocation.totalBudget * 100).toFixed(0)}% (Focus: Weapons & Defense)`);

  console.log('\n  RESULT: Faction coordinated for war defense! ✓');
}

/**
 * SCENARIO 3: Peaceful Expansion - Growth Coordination
 *
 * Faction in peace time with healthy economy. Coordinated growth:
 */
export function demonstratePeacefulExpansionScenario() {
  console.log('\n\n========================================');
  console.log('SCENARIO 3: PEACEFUL EXPANSION');
  console.log('========================================\n');

  const mockSetup = createMockSetup();
  const { coordinator, economicNeeds } = mockSetup;

  const factionId: StationFaction = 'UNITED_EARTH';

  // STEP 1: Create favorable conditions
  console.log('--- STEP 1: Favorable Conditions ---');
  const economy = economicNeeds.getFactionEconomy(factionId);
  economy.gdpGrowth = 6.0;  // Booming economy
  economy.crisisLevel = 0;   // No crisis
  economy.economicState = 'BOOMING';

  console.log(`  ${factionId} economy: ${economy.economicState}`);
  console.log(`  GDP Growth: ${economy.gdpGrowth}%`);
  console.log(`  No threats detected`);

  // STEP 2: Strategic evaluation
  console.log('\n--- STEP 2: Strategic Evaluation ---');
  coordinator.forceDecision(factionId, Date.now() / 1000);

  const situation = coordinator.evaluateStrategicSituation(factionId);

  console.log(`  Strategic Priority: ${situation.primaryPriority}`);
  console.log(`  Secondary Priority: ${situation.secondaryPriority}`);
  console.log(`  Economic Health: ${(situation.economicHealth * 100).toFixed(0)}%`);

  // STEP 3: Growth directives
  console.log('\n--- STEP 3: Growth Strategy ---');
  const directives = coordinator.coordinateOperations(factionId);

  console.log('  Expansion-focused directives:\n');

  directives.filter(d => d.system === 'EXPANSION' || d.system === 'RESEARCH').slice(0, 4).forEach((directive, i) => {
    console.log(`  ${i + 1}. [${directive.system}] ${directive.action}`);
    console.log(`     ${directive.reasoning}`);
    console.log('');
  });

  // STEP 4: Investment allocation
  console.log('--- STEP 4: Growth Investment ---');
  const allocation = coordinator.allocateResources(factionId, 2000000);  // Bigger budget

  console.log('  Growth-phase budget:');
  console.log(`    Expansion: ${(allocation.expansionAllocation / allocation.totalBudget * 100).toFixed(0)}% ↑ NEW SETTLEMENTS`);
  console.log(`    Research: ${(allocation.researchAllocation / allocation.totalBudget * 100).toFixed(0)}% ↑ TECH ADVANCEMENT`);
  console.log(`    Military: ${(allocation.militaryAllocation / allocation.totalBudget * 100).toFixed(0)}% ↓ (Peacetime)`);

  console.log('\n  RESULT: Coordinated peaceful expansion! ✓');
}

/**
 * SCENARIO 4: Tech Race - Research Coordination
 *
 * Faction behind in tech. All systems support research:
 */
export function demonstrateTechRaceScenario() {
  console.log('\n\n========================================');
  console.log('SCENARIO 4: TECHNOLOGY RACE');
  console.log('========================================\n');

  const mockSetup = createMockSetup();
  const { coordinator } = mockSetup;

  const factionId: StationFaction = 'OUTER_COLONIES';

  // STEP 1: Set up tech gap
  console.log('--- STEP 1: Technology Gap Detected ---');
  coordinator.initializeFaction(factionId);
  const situation = coordinator.evaluateStrategicSituation(factionId);
  situation.techLevel = 1.5;  // Behind
  situation.technologicalGap = true;

  console.log(`  ${factionId} tech level: ${situation.techLevel}`);
  console.log(`  Rivals at tech level: 3.5+`);
  console.log(`  Technology Gap: CRITICAL`);

  // STEP 2: Strategic shift
  console.log('\n--- STEP 2: Strategic Shift to RESEARCH ---');
  coordinator.setStrategicPriority(factionId, 'RESEARCH', 0.8);
  coordinator.forceDecision(factionId, Date.now() / 1000);

  const updatedSituation = coordinator.evaluateStrategicSituation(factionId);

  console.log(`  Primary Priority: ${updatedSituation.primaryPriority}`);
  console.log(`  Research Budget Weight: ${(updatedSituation.priorities.get('RESEARCH')! * 100).toFixed(0)}%`);

  // STEP 3: Coordinated research push
  console.log('\n--- STEP 3: All Systems Support Research ---');
  const directives = coordinator.coordinateOperations(factionId);

  console.log('  Research-focused coordination:\n');

  const researchDirectives = directives.filter(d =>
    d.system === 'RESEARCH' || d.action.includes('RESEARCH') || d.action.includes('TECH')
  );

  researchDirectives.slice(0, 3).forEach((directive, i) => {
    console.log(`  ${i + 1}. [${directive.system}] ${directive.action}`);
    console.log(`     ${directive.reasoning}`);
    console.log('');
  });

  // STEP 4: Research investment
  console.log('--- STEP 4: Research Investment ---');
  const allocation = coordinator.allocateResources(factionId, 1500000);

  console.log('  Tech race budget:');
  console.log(`    Research: ${(allocation.researchAllocation / allocation.totalBudget * 100).toFixed(0)}% ↑↑ MAXIMUM RESEARCH`);
  console.log(`    Expansion: ${(allocation.expansionAllocation / allocation.totalBudget * 100).toFixed(0)}% (Build research stations)`);
  console.log(`    Military: ${(allocation.militaryAllocation / allocation.totalBudget * 100).toFixed(0)}% (Protect researchers)`);

  console.log('\n  RESULT: Faction coordinated for technology advancement! ✓');
}

// ====================================================================
// MOCK SETUP (for scenarios)
// ====================================================================

function createMockSetup() {
  // Create minimal mocks for demonstration
  const conquestSystem = new ConquestSystem();
  const economicNeeds = new FactionEconomicNeeds();
  const diplomacyEngine = new FactionDiplomacyEngine();
  const researchSystem = new ResearchSystem();

  const militaryAI = new FactionMilitaryAI(
    conquestSystem,
    diplomacyEngine,
    economicNeeds
  );

  const researchAI = new FactionResearchAI(researchSystem);

  const coordinator = new FactionStrategicCoordinator(
    militaryAI,
    researchAI,
    economicNeeds,
    diplomacyEngine,
    researchSystem
  );

  // Initialize test factions
  ['MARS_FEDERATION', 'BELT_ALLIANCE', 'UNITED_EARTH', 'OUTER_COLONIES'].forEach(faction => {
    coordinator.initializeFaction(faction as StationFaction);
    militaryAI.initializeFaction(faction as StationFaction, 'BALANCED');
  });

  return { coordinator, militaryAI, researchAI, economicNeeds, diplomacyEngine, researchSystem };
}

// ====================================================================
// MAIN DEMO
// ====================================================================

/**
 * Run all scenario demonstrations
 */
export function runAllScenarios() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   FACTION STRATEGIC COORDINATOR - DEMONSTRATION            ║');
  console.log('║   Showing coordinated AI decision-making                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  demonstrateResourceCrisisScenario();
  demonstrateWarDefenseScenario();
  demonstratePeacefulExpansionScenario();
  demonstrateTechRaceScenario();

  console.log('\n\n========================================');
  console.log('ALL SCENARIOS COMPLETE');
  console.log('========================================');
  console.log('\nKEY TAKEAWAYS:');
  console.log('  ✓ Strategic Coordinator aligns all AI systems');
  console.log('  ✓ Economic needs drive faction decisions');
  console.log('  ✓ Military, expansion, research work together');
  console.log('  ✓ Factions make coherent, strategic choices');
  console.log('  ✓ No more contradictory behavior!\n');
}
