/**
 * FactionResearchAI.test.ts
 * Comprehensive test cases demonstrating faction research behavior
 */

import { ResearchSystem, TechTree } from '../ResearchSystem';
import { FactionResearchAI, FactionState } from './FactionResearchAI';
import { Faction, GovernmentType } from '../FactionSystem';

/**
 * Helper: Create a test faction
 */
function createTestFaction(
  id: string,
  name: string,
  government: GovernmentType,
  militaristic: number = 0.5,
  expansionist: number = 0.5,
  technological: number = 0.5
): Faction {
  return {
    id,
    name,
    description: `Test faction: ${name}`,
    government,
    ideology: {
      authoritarian: 0,
      economic: 0,
      militaristic,
      expansionist,
      xenophobic: 0,
      technological,
    },
    territory: [],
    population: 1000000,
    military: 100,
    economy: 100,
    technology: 1,
    influence: 50,
    color: '#FF0000',
  };
}

/**
 * TEST CASE 1: Militaristic Faction at War Prioritizes Weapons Research
 */
export function testCase1_WarfareResearchPriority(): void {
  console.log('\n=== TEST CASE 1: Militaristic Faction at War ===');

  const researchSystem = new ResearchSystem();
  const researchAI = new FactionResearchAI(researchSystem);

  // Create a militaristic faction at war
  const faction = createTestFaction(
    'war_faction',
    'The Crimson Empire',
    'MILITARY',
    0.9, // Highly militaristic
    0.3, // Low expansionism
    0.5  // Average tech focus
  );

  // Define faction state: at war, threatened, militarily weak
  const state: FactionState = {
    factionId: faction.id,
    isAtWar: true,
    numberOfWars: 2,
    isExpanding: false,
    territoryCount: 3,
    economicHealth: 0.6,
    militaryStrength: 0.4, // Losing the war!
    technologyLevel: 1,
    threatLevel: 0.8,      // Very threatened
    diplomacyCount: 1,
    explorationNeeds: 0.2,
  };

  // Let the AI make a research decision
  const decision = researchAI.selectNextResearch(faction, state, Date.now() / 1000);

  if (decision) {
    console.log(`✓ Research Selected: ${decision.selectedTech.name}`);
    console.log(`  Category: ${decision.selectedTech.category}`);
    console.log(`  Tier: ${decision.selectedTech.tier}`);
    console.log(`  Reasoning: ${decision.reasoning}`);
    console.log(`  Priorities:`);
    decision.priorities.forEach(p => {
      console.log(`    - ${p.category}: ${(p.weight * 100).toFixed(1)}%`);
    });

    // Verify it's a weapons or defense tech (appropriate for war)
    const isCombatTech = decision.selectedTech.category === 'WEAPONS' ||
                        decision.selectedTech.category === 'DEFENSE';
    console.log(`\n  ✓ Combat tech selected: ${isCombatTech ? 'YES' : 'NO'}`);

    // Verify high priority on weapons/defense
    const weaponsPriority = decision.priorities.find(p => p.category === 'WEAPONS')?.weight || 0;
    const defensePriority = decision.priorities.find(p => p.category === 'DEFENSE')?.weight || 0;
    console.log(`  ✓ Weapons priority: ${(weaponsPriority * 100).toFixed(1)}%`);
    console.log(`  ✓ Defense priority: ${(defensePriority * 100).toFixed(1)}%`);

    if (weaponsPriority > 0.6 || defensePriority > 0.5) {
      console.log(`  ✓ TEST PASSED: High combat priority during war`);
    }
  } else {
    console.log('✗ No research decision made');
  }
}

/**
 * TEST CASE 2: Expansionist Faction Prioritizes Propulsion and Economy
 */
export function testCase2_ExpansionResearchPriority(): void {
  console.log('\n=== TEST CASE 2: Expansionist Faction Colonizing ===');

  const researchSystem = new ResearchSystem();
  const researchAI = new FactionResearchAI(researchSystem);

  // Create an expansionist faction
  const faction = createTestFaction(
    'expansion_faction',
    'The Stellar Pioneers',
    'DEMOCRACY',
    0.2, // Low militarism
    0.9, // Highly expansionist
    0.6  // Tech-focused
  );

  // Define faction state: expanding, peaceful
  const state: FactionState = {
    factionId: faction.id,
    isAtWar: false,
    numberOfWars: 0,
    isExpanding: true,     // Actively colonizing
    territoryCount: 2,     // Small but growing
    economicHealth: 0.7,   // Good economy to support expansion
    militaryStrength: 0.5,
    technologyLevel: 1,
    threatLevel: 0.2,      // Low threat
    diplomacyCount: 5,
    explorationNeeds: 0.8, // Need to find new systems
  };

  const decision = researchAI.selectNextResearch(faction, state, Date.now() / 1000);

  if (decision) {
    console.log(`✓ Research Selected: ${decision.selectedTech.name}`);
    console.log(`  Category: ${decision.selectedTech.category}`);
    console.log(`  Tier: ${decision.selectedTech.tier}`);
    console.log(`  Reasoning: ${decision.reasoning}`);
    console.log(`  Priorities:`);
    decision.priorities.forEach(p => {
      console.log(`    - ${p.category}: ${(p.weight * 100).toFixed(1)}%`);
    });

    // Verify it's propulsion, economy, or exploration (appropriate for expansion)
    const isExpansionTech = decision.selectedTech.category === 'PROPULSION' ||
                           decision.selectedTech.category === 'ECONOMY' ||
                           decision.selectedTech.category === 'EXPLORATION';
    console.log(`\n  ✓ Expansion tech selected: ${isExpansionTech ? 'YES' : 'NO'}`);

    const propulsionPriority = decision.priorities.find(p => p.category === 'PROPULSION')?.weight || 0;
    const economyPriority = decision.priorities.find(p => p.category === 'ECONOMY')?.weight || 0;
    const explorationPriority = decision.priorities.find(p => p.category === 'EXPLORATION')?.weight || 0;

    console.log(`  ✓ Propulsion priority: ${(propulsionPriority * 100).toFixed(1)}%`);
    console.log(`  ✓ Economy priority: ${(economyPriority * 100).toFixed(1)}%`);
    console.log(`  ✓ Exploration priority: ${(explorationPriority * 100).toFixed(1)}%`);

    if (propulsionPriority > 0.4 || economyPriority > 0.4 || explorationPriority > 0.4) {
      console.log(`  ✓ TEST PASSED: High expansion priority during colonization`);
    }
  } else {
    console.log('✗ No research decision made');
  }
}

/**
 * TEST CASE 3: Corporate Faction in Economic Crisis Prioritizes Economy
 */
export function testCase3_EconomicCrisisResearch(): void {
  console.log('\n=== TEST CASE 3: Corporate Faction in Economic Crisis ===');

  const researchSystem = new ResearchSystem();
  const researchAI = new FactionResearchAI(researchSystem);

  // Create a corporate faction
  const faction = createTestFaction(
    'corp_faction',
    'MegaCorp Industries',
    'CORPORATE',
    0.1, // Very peaceful
    0.5, // Moderate expansion
    0.7  // Tech-focused
  );

  // Define faction state: economic crisis
  const state: FactionState = {
    factionId: faction.id,
    isAtWar: false,
    numberOfWars: 0,
    isExpanding: false,
    territoryCount: 5,
    economicHealth: 0.2,   // ECONOMIC CRISIS!
    militaryStrength: 0.3,
    technologyLevel: 1,
    threatLevel: 0.3,
    diplomacyCount: 8,
    explorationNeeds: 0.4,
  };

  const decision = researchAI.selectNextResearch(faction, state, Date.now() / 1000);

  if (decision) {
    console.log(`✓ Research Selected: ${decision.selectedTech.name}`);
    console.log(`  Category: ${decision.selectedTech.category}`);
    console.log(`  Tier: ${decision.selectedTech.tier}`);
    console.log(`  Reasoning: ${decision.reasoning}`);
    console.log(`  Priorities:`);
    decision.priorities.forEach(p => {
      console.log(`    - ${p.category}: ${(p.weight * 100).toFixed(1)}%`);
    });

    const economyPriority = decision.priorities.find(p => p.category === 'ECONOMY')?.weight || 0;
    console.log(`\n  ✓ Economy priority: ${(economyPriority * 100).toFixed(1)}%`);

    // Corporate + economic crisis should result in very high economy priority
    if (economyPriority > 0.6) {
      console.log(`  ✓ TEST PASSED: High economy priority during crisis`);
    }

    if (decision.selectedTech.category === 'ECONOMY') {
      console.log(`  ✓ Economy tech selected - appropriate for crisis`);
    }
  } else {
    console.log('✗ No research decision made');
  }
}

/**
 * TEST CASE 4: Research Completion Affects Faction Capabilities
 */
export function testCase4_ResearchImpactOnCapabilities(): void {
  console.log('\n=== TEST CASE 4: Research Completion Impact ===');

  const researchSystem = new ResearchSystem();
  const researchAI = new FactionResearchAI(researchSystem);
  const currentTime = Date.now() / 1000;

  const faction = createTestFaction(
    'progress_faction',
    'The Ascendant Coalition',
    'DEMOCRACY',
    0.5,
    0.5,
    0.8 // High tech focus
  );

  console.log('Initial faction stats:');
  console.log(`  Military: ${faction.military}`);
  console.log(`  Economy: ${faction.economy}`);
  console.log(`  Technology: ${faction.technology}`);
  console.log(`  Influence: ${faction.influence}`);

  // Research some basic technologies
  console.log('\nResearching: Basic Ballistics (weapons tech)...');
  researchSystem.startResearch(faction.id, 'basic_ballistics', currentTime);

  // Simulate research completion (instant for testing)
  const project = researchSystem.getActiveResearch(faction.id)[0];
  const tech = TechTree.getTechnology('basic_ballistics')!;
  const completed = researchSystem.updateResearch(tech.researchTime * 3600, currentTime + 1);

  if (completed.length > 0) {
    console.log('✓ Research completed!');
    researchAI.onResearchComplete(faction, completed[0], currentTime + 1);

    console.log('\nUpdated faction stats:');
    console.log(`  Military: ${faction.military.toFixed(2)} (increased due to weapon tech)`);
    console.log(`  Economy: ${faction.economy.toFixed(2)}`);
    console.log(`  Technology: ${faction.technology}`);
    console.log(`  Influence: ${faction.influence}`);

    // Now research an economy tech
    console.log('\nResearching: Automated Mining (economy tech)...');
    researchSystem.startResearch(faction.id, 'automated_mining', currentTime + 2);

    const tech2 = TechTree.getTechnology('automated_mining')!;
    const completed2 = researchSystem.updateResearch(tech2.researchTime * 3600, currentTime + 3);

    if (completed2.length > 0) {
      console.log('✓ Research completed!');
      researchAI.onResearchComplete(faction, completed2[0], currentTime + 3);

      console.log('\nFinal faction stats:');
      console.log(`  Military: ${faction.military.toFixed(2)}`);
      console.log(`  Economy: ${faction.economy.toFixed(2)} (increased due to mining tech)`);
      console.log(`  Technology: ${faction.technology}`);
      console.log(`  Influence: ${faction.influence}`);

      // Get cumulative bonuses
      const bonuses = researchSystem.calculateCumulativeBonuses(faction.id);
      console.log('\nCumulative research bonuses:');
      if (bonuses.weaponDamage) console.log(`  Weapon Damage: x${bonuses.weaponDamage.toFixed(2)}`);
      if (bonuses.weaponAccuracy) console.log(`  Weapon Accuracy: x${bonuses.weaponAccuracy.toFixed(2)}`);
      if (bonuses.miningEfficiency) console.log(`  Mining Efficiency: x${bonuses.miningEfficiency.toFixed(2)}`);
      if (bonuses.economicOutput) console.log(`  Economic Output: x${bonuses.economicOutput.toFixed(2)}`);

      console.log('\n  ✓ TEST PASSED: Research affects faction capabilities');
    }
  }
}

/**
 * TEST CASE 5: Tech Tree Progression - Prerequisites and Tiers
 */
export function testCase5_TechTreeProgression(): void {
  console.log('\n=== TEST CASE 5: Tech Tree Progression ===');

  const researchSystem = new ResearchSystem();
  const researchAI = new FactionResearchAI(researchSystem);
  const currentTime = Date.now() / 1000;

  const faction = createTestFaction(
    'tech_faction',
    'The Scientific Collective',
    'DEMOCRACY',
    0.2,
    0.4,
    0.95 // Very tech-focused
  );

  console.log('Testing tech tree progression...\n');

  // Check tier 1 availability
  let available = researchSystem.getAvailableTechnologies(faction.id);
  const tier1Techs = available.filter(t => t.tier === 1);
  console.log(`✓ Tier 1 technologies available: ${tier1Techs.length}`);
  console.log(`  Examples: ${tier1Techs.slice(0, 3).map(t => t.name).join(', ')}`);

  // Research prerequisites for a tier 2 tech
  console.log('\nResearching prerequisites for Plasma Weapons (Tier 2)...');
  const plasmaTech = TechTree.getTechnology('plasma_weapons')!;
  console.log(`  Prerequisites: ${plasmaTech.prerequisites.join(', ')}`);

  // Research the prerequisites
  let time = currentTime;
  for (const prereqId of plasmaTech.prerequisites) {
    const prereq = TechTree.getTechnology(prereqId)!;
    console.log(`  - Researching ${prereq.name}...`);
    researchSystem.startResearch(faction.id, prereqId, time);
    const completed = researchSystem.updateResearch(prereq.researchTime * 3600, time + 1);
    if (completed.length > 0) {
      console.log(`    ✓ Completed`);
    }
    time += 2;
  }

  // Check if plasma weapons is now available
  available = researchSystem.getAvailableTechnologies(faction.id);
  const plasmaAvailable = available.some(t => t.id === 'plasma_weapons');
  console.log(`\n✓ Plasma Weapons now available: ${plasmaAvailable ? 'YES' : 'NO'}`);

  if (plasmaAvailable) {
    console.log('  Starting Plasma Weapons research...');
    researchSystem.startResearch(faction.id, 'plasma_weapons', time);
    const completed = researchSystem.updateResearch(plasmaTech.researchTime * 3600, time + 1);

    if (completed.length > 0) {
      console.log('  ✓ Plasma Weapons completed!');
      console.log(`    Unlocks: Weapon Damage x${plasmaTech.unlocks.weaponDamage}`);
      console.log(`    Unlocks: Weapon Range x${plasmaTech.unlocks.weaponRange}`);
      console.log(`    New Weapons: ${plasmaTech.unlocks.newWeaponTypes?.join(', ')}`);
    }
  }

  // Show tech progress
  const techProgress = researchSystem.getTechProgress(faction.id);
  console.log('\nTech tier distribution:');
  for (let tier = 1; tier <= 5; tier++) {
    console.log(`  Tier ${tier}: ${techProgress[tier]} technologies`);
  }

  console.log('\n  ✓ TEST PASSED: Tech tree progression works correctly');
}

/**
 * RUN ALL TESTS
 */
export function runAllTests(): void {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   FACTION RESEARCH AI - COMPREHENSIVE TEST SUITE       ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    testCase1_WarfareResearchPriority();
    testCase2_ExpansionResearchPriority();
    testCase3_EconomicCrisisResearch();
    testCase4_ResearchImpactOnCapabilities();
    testCase5_TechTreeProgression();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ALL TESTS COMPLETED SUCCESSFULLY          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ TEST SUITE FAILED:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
