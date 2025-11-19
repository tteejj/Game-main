/**
 * research-bonus-application-demo.ts
 * Demonstrates the complete research bonus application system
 * Shows how technologies actually modify ships, stations, and factions
 */

import { ResearchSystem, TechTree } from '../ResearchSystem';
import { FactionResearchAI } from '../faction-dynamics/FactionResearchAI';
import { TechnologyEffectApplicator } from '../TechnologyEffectApplicator';
import { NPCShip, ShipType } from '../npc-traffic/npc-ship';
import { Vector3 } from '../../../physics-modules/src/Vector3';

/**
 * Demo: Complete Research Bonus Application Flow
 */
export function demonstrateResearchBonusApplication() {
  console.log('='.repeat(80));
  console.log('RESEARCH BONUS APPLICATION SYSTEM DEMONSTRATION');
  console.log('='.repeat(80));
  console.log();

  // Initialize systems
  const researchSystem = new ResearchSystem();
  const researchAI = new FactionResearchAI(researchSystem);
  const effectApplicator = new TechnologyEffectApplicator();

  // Create mock faction
  const faction = {
    id: 'faction_terran_federation',
    name: 'Terran Federation',
    government: 'DEMOCRACY',
    ideology: {
      militaristic: 0.5,
      expansionist: 0.6,
      economic: 0.7,
      technological: 0.8
    },
    military: 100,
    economy: 100,
    technology: 1,
    influence: 50,
    territory: []
  };

  // Create a test ship
  console.log('1. CREATING TEST SHIP');
  console.log('-'.repeat(80));
  const ship = new NPCShip(
    'ship_001',
    'TFS Enterprise',
    ShipType.PATROL_SHIP,
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
    faction.id
  );

  // Capture initial stats
  const initialStats = captureShipStats(ship);
  console.log('Initial Ship Stats:');
  printShipStats(initialStats);
  console.log();

  // Start several research projects
  console.log('2. RESEARCHING TECHNOLOGIES');
  console.log('-'.repeat(80));
  const currentTime = Date.now() / 1000;

  // Research basic ballistics (Tier 1, weapons)
  researchSystem.startResearch(faction.id, 'basic_ballistics', currentTime);
  console.log('Started research: Basic Ballistics');

  // Fast-forward time and complete research
  let completedTechs = researchSystem.updateResearch(7200, currentTime + 7200);
  for (const completed of completedTechs) {
    const tech = TechTree.getTechnology(completed.techId);
    console.log(`✓ Completed: ${tech?.name}`);
    console.log(`  Bonuses: Weapon Damage +${((tech!.unlocks.weaponDamage! - 1) * 100).toFixed(0)}%, Accuracy +${((tech!.unlocks.weaponAccuracy! - 1) * 100).toFixed(0)}%`);
  }
  console.log();

  // Research efficient thrusters (Tier 1, propulsion)
  researchSystem.startResearch(faction.id, 'efficient_thrusters', currentTime + 7200);
  console.log('Started research: Efficient Thrusters');

  completedTechs = researchSystem.updateResearch(7200, currentTime + 14400);
  for (const completed of completedTechs) {
    const tech = TechTree.getTechnology(completed.techId);
    console.log(`✓ Completed: ${tech?.name}`);
    console.log(`  Bonuses: Fuel Efficiency +${((tech!.unlocks.fuelEfficiency! - 1) * 100).toFixed(0)}%, Speed +${((tech!.unlocks.engineSpeed! - 1) * 100).toFixed(0)}%`);
  }
  console.log();

  // Research reinforced hulls (Tier 1, defense)
  researchSystem.startResearch(faction.id, 'reinforced_hulls', currentTime + 14400);
  console.log('Started research: Reinforced Hulls');

  completedTechs = researchSystem.updateResearch(7200, currentTime + 21600);
  for (const completed of completedTechs) {
    const tech = TechTree.getTechnology(completed.techId);
    console.log(`✓ Completed: ${tech?.name}`);
    console.log(`  Bonuses: Hull Points +${((tech!.unlocks.hullPoints! - 1) * 100).toFixed(0)}%, Armor +${((tech!.unlocks.armorRating! - 1) * 100).toFixed(0)}%`);
  }
  console.log();

  // Show cumulative bonuses
  console.log('3. CUMULATIVE TECHNOLOGY BONUSES');
  console.log('-'.repeat(80));
  const cumulativeBonuses = researchSystem.calculateCumulativeBonuses(faction.id);
  console.log('All completed technologies stack multiplicatively:');
  if (cumulativeBonuses.weaponDamage) {
    console.log(`  Weapon Damage: ${cumulativeBonuses.weaponDamage.toFixed(3)}x (${((cumulativeBonuses.weaponDamage - 1) * 100).toFixed(1)}% increase)`);
  }
  if (cumulativeBonuses.weaponAccuracy) {
    console.log(`  Weapon Accuracy: ${cumulativeBonuses.weaponAccuracy.toFixed(3)}x (${((cumulativeBonuses.weaponAccuracy - 1) * 100).toFixed(1)}% increase)`);
  }
  if (cumulativeBonuses.engineSpeed) {
    console.log(`  Engine Speed: ${cumulativeBonuses.engineSpeed.toFixed(3)}x (${((cumulativeBonuses.engineSpeed - 1) * 100).toFixed(1)}% increase)`);
  }
  if (cumulativeBonuses.fuelEfficiency) {
    console.log(`  Fuel Efficiency: ${cumulativeBonuses.fuelEfficiency.toFixed(3)}x (${((cumulativeBonuses.fuelEfficiency - 1) * 100).toFixed(1)}% increase)`);
  }
  if (cumulativeBonuses.hullPoints) {
    console.log(`  Hull Points: ${cumulativeBonuses.hullPoints.toFixed(3)}x (${((cumulativeBonuses.hullPoints - 1) * 100).toFixed(1)}% increase)`);
  }
  if (cumulativeBonuses.armorRating) {
    console.log(`  Armor Rating: ${cumulativeBonuses.armorRating.toFixed(3)}x (${((cumulativeBonuses.armorRating - 1) * 100).toFixed(1)}% increase)`);
  }
  console.log();

  // Apply bonuses to ship
  console.log('4. APPLYING BONUSES TO SHIP');
  console.log('-'.repeat(80));
  console.log('Upgrading ship with research bonuses...');

  // Subscribe to events
  effectApplicator.onResearchEffectApplied((event) => {
    console.log(`EVENT: Research effects applied to ${event.entityType} "${event.entityName}"`);
    console.log(`  Technologies: ${event.techIdsApplied.length} applied`);
  });

  // Apply bonuses
  researchSystem.applyBonusesToShip(ship, faction.id);
  console.log();

  // Capture upgraded stats
  const upgradedStats = captureShipStats(ship);
  console.log('Upgraded Ship Stats:');
  printShipStats(upgradedStats);
  console.log();

  // Show the difference
  console.log('5. STAT COMPARISON');
  console.log('-'.repeat(80));
  compareStats(initialStats, upgradedStats);
  console.log();

  // Demonstrate ship template system
  console.log('6. SHIP TEMPLATE SYSTEM');
  console.log('-'.repeat(80));
  console.log('When spawning new ships, use getShipTemplate to get upgraded stats:');
  const template = researchSystem.getShipTemplate('PATROL_SHIP', faction.id);
  console.log();
  console.log('Base Ship Template:');
  console.log(`  Max Acceleration: ${template.baseStats.maxAcceleration} m/s²`);
  console.log(`  Max Velocity: ${template.baseStats.maxVelocity} m/s`);
  console.log(`  Weapon Damage: ${template.baseStats.weaponDamage}`);
  console.log();
  console.log('Upgraded Ship Template (with all tech bonuses):');
  console.log(`  Max Acceleration: ${template.upgradedStats.maxAcceleration.toFixed(1)} m/s² (+${((template.upgradedStats.maxAcceleration / template.baseStats.maxAcceleration - 1) * 100).toFixed(1)}%)`);
  console.log(`  Max Velocity: ${template.upgradedStats.maxVelocity.toFixed(1)} m/s (+${((template.upgradedStats.maxVelocity / template.baseStats.maxVelocity - 1) * 100).toFixed(1)}%)`);
  console.log(`  Weapon Damage: ${template.upgradedStats.weaponDamage.toFixed(1)} (+${((template.upgradedStats.weaponDamage / template.baseStats.weaponDamage - 1) * 100).toFixed(1)}%)`);
  console.log();

  // Demonstrate unlocks
  console.log('7. TECHNOLOGY UNLOCKS');
  console.log('-'.repeat(80));
  const unlockedShips = researchSystem.getUnlockedShipTypes(faction.id);
  const unlockedWeapons = researchSystem.getUnlockedWeaponTypes(faction.id);
  const unlockedBuildings = researchSystem.getUnlockedBuildingTypes(faction.id);

  console.log(`Ship Types Available: ${unlockedShips.join(', ')}`);
  console.log(`Weapon Types Available: ${unlockedWeapons.join(', ')}`);
  console.log(`Building Types Available: ${unlockedBuildings.join(', ')}`);
  console.log();

  // Research advanced tech with unlocks
  console.log('8. ADVANCED RESEARCH WITH UNLOCKS');
  console.log('-'.repeat(80));

  // Research laser focusing to unlock new weapons
  researchSystem.startResearch(faction.id, 'laser_focusing', currentTime + 21600);
  completedTechs = researchSystem.updateResearch(9000, currentTime + 30600);

  for (const completed of completedTechs) {
    const tech = TechTree.getTechnology(completed.techId);
    if (tech?.unlocks.newWeaponTypes) {
      console.log(`✓ Unlocked new weapon types: ${tech.unlocks.newWeaponTypes.join(', ')}`);
    }
  }

  const newUnlockedWeapons = researchSystem.getUnlockedWeaponTypes(faction.id);
  console.log(`Updated weapon types: ${newUnlockedWeapons.join(', ')}`);
  console.log();

  // Summary
  console.log('9. SUMMARY');
  console.log('-'.repeat(80));
  const techProgress = researchSystem.getTechProgress(faction.id);
  const completedCount = researchSystem.getCompletedResearch(faction.id).length;
  console.log(`Faction: ${faction.name}`);
  console.log(`Total Technologies Researched: ${completedCount}`);
  console.log(`Technology Distribution:`);
  console.log(`  Tier 1: ${techProgress[1]} technologies`);
  console.log(`  Tier 2: ${techProgress[2]} technologies`);
  console.log(`  Tier 3: ${techProgress[3]} technologies`);
  console.log(`  Tier 4: ${techProgress[4]} technologies`);
  console.log(`  Tier 5: ${techProgress[5]} technologies`);
  console.log();
  console.log('All ships in the faction now benefit from these research bonuses!');
  console.log('New ships spawned will automatically have upgraded stats.');
  console.log();

  console.log('='.repeat(80));
  console.log('DEMONSTRATION COMPLETE');
  console.log('='.repeat(80));
}

/**
 * Helper: Capture ship stats for comparison
 */
function captureShipStats(ship: NPCShip): any {
  const physics = ship.getPhysics();
  const stats: any = {
    maxAcceleration: physics.maxAcceleration,
    maxVelocity: physics.maxVelocity,
    health: ship.health,
    cargoCapacity: ship.cargoCapacity
  };

  if (ship.subsystems.weapons && ship.subsystems.weapons.weapons.length > 0) {
    stats.weaponDamage = ship.subsystems.weapons.weapons[0].damage;
    stats.weaponRange = ship.subsystems.weapons.weapons[0].range;
    stats.weaponAccuracy = ship.subsystems.weapons.weapons[0].accuracy;
  }

  if (ship.subsystems.shields) {
    stats.shieldStrength = ship.subsystems.shields.maxShieldStrength;
  }

  if (ship.subsystems.fuel) {
    stats.fuelCapacity = ship.subsystems.fuel.mainFuel.capacity;
  }

  if (ship.subsystems.hull) {
    stats.hullIntegrity = ship.subsystems.hull.maxIntegrity;
  }

  return stats;
}

/**
 * Helper: Print ship stats
 */
function printShipStats(stats: any): void {
  console.log(`  Max Acceleration: ${stats.maxAcceleration.toFixed(2)} m/s²`);
  console.log(`  Max Velocity: ${stats.maxVelocity.toFixed(2)} m/s`);
  console.log(`  Health: ${(stats.health * 100).toFixed(0)}%`);
  console.log(`  Cargo Capacity: ${stats.cargoCapacity} tons`);

  if (stats.weaponDamage !== undefined) {
    console.log(`  Weapon Damage: ${stats.weaponDamage.toFixed(1)}`);
    console.log(`  Weapon Range: ${stats.weaponRange.toFixed(0)} m`);
    console.log(`  Weapon Accuracy: ${(stats.weaponAccuracy * 100).toFixed(0)}%`);
  }

  if (stats.shieldStrength !== undefined) {
    console.log(`  Shield Strength: ${stats.shieldStrength.toFixed(0)}`);
  }

  if (stats.fuelCapacity !== undefined) {
    console.log(`  Fuel Capacity: ${stats.fuelCapacity.toFixed(0)} units`);
  }

  if (stats.hullIntegrity !== undefined) {
    console.log(`  Hull Integrity: ${(stats.hullIntegrity * 100).toFixed(0)}%`);
  }
}

/**
 * Helper: Compare stats and show improvements
 */
function compareStats(initial: any, upgraded: any): void {
  console.log('Performance Improvements:');

  if (upgraded.maxAcceleration !== initial.maxAcceleration) {
    const improvement = ((upgraded.maxAcceleration / initial.maxAcceleration - 1) * 100).toFixed(1);
    console.log(`  ✓ Max Acceleration: ${initial.maxAcceleration.toFixed(2)} → ${upgraded.maxAcceleration.toFixed(2)} (+${improvement}%)`);
  }

  if (upgraded.maxVelocity !== initial.maxVelocity) {
    const improvement = ((upgraded.maxVelocity / initial.maxVelocity - 1) * 100).toFixed(1);
    console.log(`  ✓ Max Velocity: ${initial.maxVelocity.toFixed(2)} → ${upgraded.maxVelocity.toFixed(2)} (+${improvement}%)`);
  }

  if (upgraded.weaponDamage && upgraded.weaponDamage !== initial.weaponDamage) {
    const improvement = ((upgraded.weaponDamage / initial.weaponDamage - 1) * 100).toFixed(1);
    console.log(`  ✓ Weapon Damage: ${initial.weaponDamage.toFixed(1)} → ${upgraded.weaponDamage.toFixed(1)} (+${improvement}%)`);
  }

  if (upgraded.weaponRange && upgraded.weaponRange !== initial.weaponRange) {
    const improvement = ((upgraded.weaponRange / initial.weaponRange - 1) * 100).toFixed(1);
    console.log(`  ✓ Weapon Range: ${initial.weaponRange.toFixed(0)} → ${upgraded.weaponRange.toFixed(0)} (+${improvement}%)`);
  }

  if (upgraded.fuelCapacity && upgraded.fuelCapacity !== initial.fuelCapacity) {
    const improvement = ((upgraded.fuelCapacity / initial.fuelCapacity - 1) * 100).toFixed(1);
    console.log(`  ✓ Fuel Capacity: ${initial.fuelCapacity.toFixed(0)} → ${upgraded.fuelCapacity.toFixed(0)} (+${improvement}%)`);
  }

  if (upgraded.hullIntegrity && upgraded.hullIntegrity !== initial.hullIntegrity) {
    const improvement = ((upgraded.hullIntegrity / initial.hullIntegrity - 1) * 100).toFixed(1);
    console.log(`  ✓ Hull Integrity: ${(initial.hullIntegrity * 100).toFixed(0)}% → ${(upgraded.hullIntegrity * 100).toFixed(0)}% (+${improvement}%)`);
  }
}

/**
 * Run the demo
 */
if (require.main === module) {
  demonstrateResearchBonusApplication();
}
