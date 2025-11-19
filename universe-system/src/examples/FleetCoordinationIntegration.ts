/**
 * FleetCoordinationIntegration.ts - Integration Examples
 *
 * Demonstrates how FleetCoordination integrates with:
 * - FactionMilitaryAI (strategic fleet creation)
 * - ConquestSystem (fleet-based sieges)
 * - NPCShipAI (individual ship coordination)
 */

import { FleetCoordinationSystem } from '../FleetCoordinationSystem';
import { FleetAI } from '../FleetAI';
import { FactionMilitaryAI } from '../faction-dynamics/FactionMilitaryAI';
import { ConquestSystem } from '../ConquestSystem';
import { NPCShipAI, NPCShip } from '../NPCShipAI';
import { FactionDiplomacyEngine } from '../faction-dynamics/FactionDiplomacyEngine';
import { FactionEconomicNeeds } from '../faction-dynamics/FactionEconomicNeeds';

/**
 * EXAMPLE 1: FactionMilitaryAI Creates Fleet for Conquest
 *
 * Shows how the military AI identifies a target, assembles a fleet,
 * and launches an attack operation.
 */
export function example1_MilitaryAICreatesFleet() {
  console.log('\n=== EXAMPLE 1: Military AI Creates Fleet ===\n');

  // Setup systems
  const conquestSystem = new ConquestSystem();
  const diplomacyEngine = new FactionDiplomacyEngine();
  const economicNeeds = new FactionEconomicNeeds();
  const militaryAI = new FactionMilitaryAI(conquestSystem, diplomacyEngine, economicNeeds);
  const fleetCoordination = new FleetCoordinationSystem();
  const fleetAI = new FleetAI(fleetCoordination);
  const shipAI = new NPCShipAI();

  // Initialize factions
  militaryAI.initializeFaction('MARS_FEDERATION', 'AGGRESSIVE');
  militaryAI.initializeFaction('BELT_ALLIANCE', 'DEFENSIVE');

  // Create some ships for Mars Federation
  const marsShips: NPCShip[] = [];
  for (let i = 0; i < 15; i++) {
    const ship = shipAI.createShip(
      i < 3 ? 'PATROL' : 'TRADER', // Mix of patrol and trader ships
      'MARS_FEDERATION',
      { x: Math.random() * 10000, y: Math.random() * 10000, z: Math.random() * 10000 }
    );
    marsShips.push(ship);
  }

  // Register ships with fleet coordination
  fleetCoordination.registerShips(marsShips);

  console.log(`Created ${marsShips.length} ships for MARS_FEDERATION`);

  // Create a fleet from these ships
  const fleet = fleetCoordination.createFleet(
    'MARS_FEDERATION',
    marsShips.map(s => s.id),
    'Mars Battle Fleet Alpha'
  );

  console.log(`\nFleet Created: ${fleet.name}`);
  console.log(`  Ships: ${fleet.ships.length}`);
  console.log(`  Firepower: ${fleet.totalFirepower.toFixed(0)}`);
  console.log(`  Formation: ${fleet.formation}`);

  // Set attack formation
  fleetCoordination.setFormation(fleet.id, 'WEDGE');
  console.log(`  Changed formation to WEDGE for assault`);

  // Issue attack order
  const targetStationId = 'station_belt_1';
  fleetCoordination.attackTarget(fleet.id, targetStationId, 'STATION');
  console.log(`  Ordered to attack ${targetStationId}`);

  // Military AI would track this fleet as part of an operation
  console.log(`\n✓ Military AI successfully created and deployed fleet for conquest`);
}

/**
 * EXAMPLE 2: Fleet Coordination in Combat
 *
 * Shows two fleets engaging in battle with formations,
 * focus fire, and tactical decisions.
 */
export function example2_FleetCombat() {
  console.log('\n=== EXAMPLE 2: Fleet Combat Engagement ===\n');

  const fleetCoordination = new FleetCoordinationSystem();
  const fleetAI = new FleetAI(fleetCoordination);
  const shipAI = new NPCShipAI();

  // Create attacking fleet (Mars)
  const marsShips: NPCShip[] = [];
  for (let i = 0; i < 10; i++) {
    marsShips.push(shipAI.createShip(
      'PATROL',
      'MARS_FEDERATION',
      { x: 0, y: 0, z: 0 }
    ));
  }

  // Create defending fleet (Belt)
  const beltShips: NPCShip[] = [];
  for (let i = 0; i < 8; i++) {
    beltShips.push(shipAI.createShip(
      'PATROL',
      'BELT_ALLIANCE',
      { x: 10000, y: 0, z: 0 } // 10km away
    ));
  }

  fleetCoordination.registerShips([...marsShips, ...beltShips]);

  // Create fleets
  const marsFleet = fleetCoordination.createFleet(
    'MARS_FEDERATION',
    marsShips.map(s => s.id),
    'Mars Attack Squadron'
  );

  const beltFleet = fleetCoordination.createFleet(
    'BELT_ALLIANCE',
    beltShips.map(s => s.id),
    'Belt Defense Wing'
  );

  console.log(`Mars Fleet: ${marsFleet.ships.length} ships, ${marsFleet.totalFirepower.toFixed(0)} firepower`);
  console.log(`Belt Fleet: ${beltFleet.ships.length} ships, ${beltFleet.totalFirepower.toFixed(0)} firepower`);

  // Mars fleet adopts aggressive formation
  fleetCoordination.setFormation(marsFleet.id, 'WEDGE');
  console.log(`\nMars fleet formed WEDGE for assault`);

  // Belt fleet adopts defensive formation
  fleetCoordination.setFormation(beltFleet.id, 'SPHERE');
  console.log(`Belt fleet formed SPHERE for defense`);

  // Assess situation for Mars fleet
  console.log(`\n--- Mars Fleet Tactical Assessment ---`);
  const assessment = fleetAI.assessSituation(
    marsFleet.id,
    [marsFleet, beltFleet],
    [],
    [...marsShips, ...beltShips]
  );

  console.log(`Enemy Fleets Detected: ${assessment.enemyFleets.length}`);
  console.log(`Overall Threat Level: ${assessment.overallThreatLevel.toFixed(1)}/10`);
  console.log(`Tactical Advantage: ${assessment.tacticalAdvantage.toFixed(2)}`);
  console.log(`Recommended Formation: ${assessment.recommendedFormation}`);
  console.log(`Recommended Action: ${assessment.recommendedAction}`);

  // Make tactical decision
  const decision = fleetAI.makeDecision(marsFleet.id, assessment);
  console.log(`\n--- Tactical Decision ---`);
  console.log(`Action: ${decision.action}`);
  console.log(`Formation: ${decision.formation}`);
  console.log(`Primary Target: ${decision.primaryTarget || 'None'}`);
  console.log(`Reasoning: ${decision.reasoning}`);
  console.log(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);

  // Execute decision
  fleetAI.executeDecision(decision);

  // Create engagement
  const engagement = fleetCoordination.createEngagement(marsFleet.id, beltFleet.id);
  console.log(`\n⚔️ ENGAGEMENT STARTED`);
  console.log(`Range: ${(engagement.range / 1000).toFixed(1)}km`);
  console.log(`Phase: ${engagement.phase}`);

  // Simulate some combat rounds
  console.log(`\n--- Simulating Combat ---`);
  for (let i = 0; i < 5; i++) {
    fleetCoordination.update(10); // 10 second updates
    console.log(`Round ${i + 1}:`);
    console.log(`  Mars: ${marsFleet.ships.length} ships, ${(marsFleet.damagePercent * 100).toFixed(0)}% damage, ${(marsFleet.morale * 100).toFixed(0)}% morale`);
    console.log(`  Belt: ${beltFleet.ships.length} ships, ${(beltFleet.damagePercent * 100).toFixed(0)}% damage, ${(beltFleet.morale * 100).toFixed(0)}% morale`);
  }

  console.log(`\n✓ Fleet combat simulation complete`);
}

/**
 * EXAMPLE 3: Fleet-Based Siege Operation
 *
 * Shows how fleets are used to besiege stations,
 * integrating with ConquestSystem.
 */
export function example3_FleetSiege() {
  console.log('\n=== EXAMPLE 3: Fleet-Based Siege ===\n');

  const conquestSystem = new ConquestSystem();
  const fleetCoordination = new FleetCoordinationSystem();
  const fleetAI = new FleetAI(fleetCoordination);
  const shipAI = new NPCShipAI();

  // Create attacking fleet
  const attackShips: NPCShip[] = [];
  for (let i = 0; i < 20; i++) {
    attackShips.push(shipAI.createShip(
      'PATROL',
      'MARS_FEDERATION',
      { x: 0, y: 0, z: 0 }
    ));
  }

  fleetCoordination.registerShips(attackShips);

  const siegeFleet = fleetCoordination.createFleet(
    'MARS_FEDERATION',
    attackShips.map(s => s.id),
    'Mars Siege Fleet'
  );

  console.log(`Siege Fleet Created: ${siegeFleet.name}`);
  console.log(`  Ships: ${siegeFleet.ships.length}`);
  console.log(`  Total Firepower: ${siegeFleet.totalFirepower.toFixed(0)}`);

  // Set siege formation
  fleetCoordination.setFormation(siegeFleet.id, 'LINE');
  console.log(`  Formation: LINE (maximum bombardment firepower)`);

  // Calculate fleet strength for siege
  const fleetStrength = siegeFleet.totalFirepower * siegeFleet.combatEffectiveness;
  console.log(`  Effective Siege Strength: ${fleetStrength.toFixed(0)}`);

  // Order fleet to attack station
  const targetStation = {
    id: 'station_belt_mining_7',
    name: 'Belt Mining Outpost 7',
    faction: 'BELT_ALLIANCE' as any,
    position: { x: 5000, y: 0, z: 0 },
    defenseRating: 5,
    population: 5000
  };

  console.log(`\nTarget: ${targetStation.name}`);
  console.log(`  Defense Rating: ${targetStation.defenseRating}`);
  console.log(`  Population: ${targetStation.population}`);

  // Move fleet to siege position
  const siegePosition = {
    x: targetStation.position.x + 3000, // 3km from station
    y: targetStation.position.y,
    z: targetStation.position.z
  };

  fleetCoordination.moveFleetTo(siegeFleet.id, siegePosition, 'LINE');
  console.log(`\nFleet moving to siege position...`);

  // Update until fleet arrives
  for (let i = 0; i < 10; i++) {
    fleetCoordination.update(60); // 1 minute updates
    if (siegeFleet.status === 'READY') {
      console.log(`Fleet arrived at siege position`);
      break;
    }
  }

  // Begin siege using fleet strength
  console.log(`\n🏴 SIEGE BEGINS`);
  const siege = conquestSystem.beginSiege(
    siegeFleet.faction,
    targetStation as any,
    fleetStrength // Use fleet's effective strength
  );

  console.log(`Siege Operation: ${siege.id}`);
  console.log(`  Attacking Force: ${siege.attackingForce.toFixed(0)}`);
  console.log(`  Defending Force: ${siege.defendingForce.toFixed(0)}`);
  console.log(`  Estimated Duration: ${siege.estimatedDaysToCapture.toFixed(1)} days`);

  // Simulate siege progress
  console.log(`\n--- Siege Progress ---`);
  for (let day = 1; day <= 5; day++) {
    conquestSystem.update(86400); // 1 day
    console.log(`Day ${day}:`);
    console.log(`  Progress: ${(siege.captureProgress * 100).toFixed(0)}%`);
    console.log(`  Defense Strength: ${(siege.currentDefenseStrength * 100).toFixed(0)}%`);
    console.log(`  Morale: ${(siege.populationMorale * 100).toFixed(0)}%`);
    console.log(`  Status: ${siege.status}`);

    if (siege.status === 'CAPTURED' || siege.status === 'LIFTED') {
      break;
    }
  }

  if (siege.status === 'CAPTURED') {
    console.log(`\n✓ VICTORY! ${targetStation.name} captured by ${siegeFleet.faction}`);
    console.log(`  Casualties: ${siege.civilianCasualties.toFixed(0)} civilians`);
    console.log(`  Fleet Losses: ${siegeFleet.casualtyCount} ships`);
  } else {
    console.log(`\nSiege ongoing... Status: ${siege.status}`);
  }

  console.log(`\n✓ Fleet siege operation complete`);
}

/**
 * EXAMPLE 4: Multi-Fleet Coordinated Attack
 *
 * Shows how multiple fleets coordinate to attack a heavily
 * defended target.
 */
export function example4_MultiFleetOperation() {
  console.log('\n=== EXAMPLE 4: Multi-Fleet Coordinated Attack ===\n');

  const fleetCoordination = new FleetCoordinationSystem();
  const fleetAI = new FleetAI(fleetCoordination);
  const shipAI = new NPCShipAI();

  // Create three attack fleets
  const fleets: any[] = [];

  for (let fleetNum = 1; fleetNum <= 3; fleetNum++) {
    const ships: NPCShip[] = [];
    for (let i = 0; i < 8; i++) {
      ships.push(shipAI.createShip(
        'PATROL',
        'MARS_FEDERATION',
        {
          x: fleetNum * 5000,
          y: 0,
          z: 0
        }
      ));
    }

    fleetCoordination.registerShips(ships);

    const fleet = fleetCoordination.createFleet(
      'MARS_FEDERATION',
      ships.map(s => s.id),
      `Mars Attack Wing ${fleetNum}`
    );

    fleets.push(fleet);
  }

  console.log(`Created ${fleets.length} attack fleets`);
  for (const fleet of fleets) {
    console.log(`  ${fleet.name}: ${fleet.ships.length} ships`);
  }

  // Assign different roles
  console.log(`\n--- Fleet Roles ---`);

  // Fleet 1: Main assault (WEDGE)
  fleetCoordination.setFormation(fleets[0].id, 'WEDGE');
  console.log(`${fleets[0].name}: Main assault force (WEDGE formation)`);

  // Fleet 2: Support (LINE)
  fleetCoordination.setFormation(fleets[1].id, 'LINE');
  console.log(`${fleets[1].name}: Fire support (LINE formation)`);

  // Fleet 3: Reserve (DEFENSIVE)
  fleetCoordination.setFormation(fleets[2].id, 'DEFENSIVE');
  console.log(`${fleets[2].name}: Reserve force (DEFENSIVE formation)`);

  // Coordinate attack on target
  const target = { x: 20000, y: 0, z: 0 };

  console.log(`\n--- Coordinated Attack Plan ---`);
  console.log(`Target: [${target.x}, ${target.y}, ${target.z}]`);

  // Main assault approaches from front
  fleetCoordination.moveFleetTo(fleets[0].id, target, 'WEDGE');
  console.log(`${fleets[0].name}: Frontal assault`);

  // Support fleet flanks
  const flankPosition = { x: target.x, y: 5000, z: 0 };
  fleetCoordination.moveFleetTo(fleets[1].id, flankPosition, 'LINE');
  console.log(`${fleets[1].name}: Flanking maneuver`);

  // Reserve holds back
  const reservePosition = { x: target.x - 10000, y: 0, z: 0 };
  fleetCoordination.moveFleetTo(fleets[2].id, reservePosition, 'DEFENSIVE');
  console.log(`${fleets[2].name}: Holding reserve position`);

  // Calculate combined strength
  const totalFirepower = fleets.reduce((sum: number, f: any) =>
    sum + f.totalFirepower * f.formationBonus, 0);

  console.log(`\n--- Combined Fleet Strength ---`);
  console.log(`Total Firepower: ${totalFirepower.toFixed(0)}`);
  console.log(`Total Ships: ${fleets.reduce((sum: number, f: any) => sum + f.ships.length, 0)}`);
  console.log(`Formation Bonuses Applied: Yes`);

  // Simulate coordination
  console.log(`\n--- Attack Execution ---`);
  for (let phase = 1; phase <= 3; phase++) {
    console.log(`\nPhase ${phase}:`);

    for (const fleet of fleets) {
      fleetCoordination.update(30);
      console.log(`  ${fleet.name}: ${fleet.status}, Cohesion: ${(fleet.formationCohesion * 100).toFixed(0)}%`);
    }
  }

  console.log(`\n✓ Multi-fleet coordinated attack demonstration complete`);
}

/**
 * EXAMPLE 5: Dynamic Fleet Reorganization
 *
 * Shows fleet splitting, merging, and ship reassignment
 * during ongoing operations.
 */
export function example5_FleetReorganization() {
  console.log('\n=== EXAMPLE 5: Dynamic Fleet Reorganization ===\n');

  const fleetCoordination = new FleetCoordinationSystem();
  const shipAI = new NPCShipAI();

  // Create initial fleet
  const ships: NPCShip[] = [];
  for (let i = 0; i < 20; i++) {
    ships.push(shipAI.createShip(
      'PATROL',
      'MARS_FEDERATION',
      { x: 0, y: 0, z: 0 }
    ));
  }

  fleetCoordination.registerShips(ships);

  const mainFleet = fleetCoordination.createFleet(
    'MARS_FEDERATION',
    ships.map(s => s.id),
    'Mars Combined Fleet'
  );

  console.log(`Initial Fleet: ${mainFleet.name}`);
  console.log(`  Ships: ${mainFleet.ships.length}`);
  console.log(`  Status: ${mainFleet.status}`);

  // Scenario: Fleet takes damage, needs reorganization
  mainFleet.damagePercent = 0.4;
  mainFleet.casualtyCount = 5;
  console.log(`\n⚠️ Fleet has taken 40% damage and lost 5 ships`);

  // Split damaged fleet into two groups
  const splitShips = mainFleet.ships.slice(0, 7); // Take 7 ships
  const detachment = fleetCoordination.splitFleet(mainFleet.id, splitShips);

  if (detachment) {
    console.log(`\n✓ Fleet Split Successful`);
    console.log(`Original Fleet: ${mainFleet.ships.length} ships remaining`);
    console.log(`Detachment: ${detachment.name} with ${detachment.ships.length} ships`);

    // Send detachment to regroup
    fleetCoordination.moveFleetTo(
      detachment.id,
      { x: -10000, y: 0, z: 0 },
      'COLUMN'
    );
    console.log(`${detachment.name} withdrawing for repairs`);

    // Main fleet continues mission
    mainFleet.status = 'READY';
    console.log(`${mainFleet.name} continues mission with reduced strength`);
  }

  // Later: Reinforcements arrive
  console.log(`\n--- Reinforcements Arriving ---`);
  const reinforcements: NPCShip[] = [];
  for (let i = 0; i < 10; i++) {
    reinforcements.push(shipAI.createShip(
      'PATROL',
      'MARS_FEDERATION',
      { x: -5000, y: 0, z: 0 }
    ));
  }

  fleetCoordination.registerShips(reinforcements);

  const reinforcementFleet = fleetCoordination.createFleet(
    'MARS_FEDERATION',
    reinforcements.map(s => s.id),
    'Mars Reinforcement Squadron'
  );

  console.log(`${reinforcementFleet.name} created: ${reinforcementFleet.ships.length} ships`);

  // Merge reinforcements with main fleet
  const mergedFleet = fleetCoordination.mergeFleets(mainFleet.id, reinforcementFleet.id);

  if (mergedFleet) {
    console.log(`\n✓ Fleet Merger Complete`);
    console.log(`${mergedFleet.name}: ${mergedFleet.ships.length} ships`);
    console.log(`  Total Firepower: ${mergedFleet.totalFirepower.toFixed(0)}`);
    console.log(`  Fleet restored to full strength`);
  }

  console.log(`\n✓ Fleet reorganization demonstration complete`);
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       FLEET COORDINATION SYSTEM - INTEGRATION EXAMPLES        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  example1_MilitaryAICreatesFleet();
  example2_FleetCombat();
  example3_FleetSiege();
  example4_MultiFleetOperation();
  example5_FleetReorganization();

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    ALL EXAMPLES COMPLETE                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
}

// Export for use
export default {
  example1_MilitaryAICreatesFleet,
  example2_FleetCombat,
  example3_FleetSiege,
  example4_MultiFleetOperation,
  example5_FleetReorganization,
  runAllExamples
};
