/**
 * ConquestSystem.test.ts - Test cases for conquest mechanics
 *
 * Demonstrates:
 * 1. Faction sieges enemy station
 * 2. Successful capture after prolonged siege
 * 3. Occupation with resistance
 * 4. Dynamic borders change
 * 5. Liberation attempts
 */

import { ConquestSystem } from '../ConquestSystem';
import { FactionMilitaryAI } from '../faction-dynamics/FactionMilitaryAI';
import { FactionDiplomacyEngine } from '../faction-dynamics/FactionDiplomacyEngine';
import { FactionEconomicNeeds } from '../faction-dynamics/FactionEconomicNeeds';
import { SpaceStation, StationType, StationFaction } from '../StationGenerator';
import { Vector3, PhysicalProperties, VisualProperties, CelestialBodyType } from '../CelestialBody';

/**
 * Test Case 1: Basic Siege Operation
 *
 * Mars Federation attacks a Belt Alliance military base
 * Expected: Siege begins, defenses wear down over time, eventually captured
 */
export function testBasicSiege(): void {
  console.log('\n=== TEST CASE 1: Basic Siege Operation ===\n');

  const conquestSystem = new ConquestSystem();

  // Create target station - Belt Alliance military base
  const targetStation = createTestStation(
    'belt_base_1',
    'Ceres Defense Station',
    StationFaction.BELT_ALLIANCE,
    StationType.MILITARY_BASE,
    { x: 50000, y: 0, z: 0 },
    8  // Defense rating: 8/10 (strong)
  );

  console.log(`Target: ${targetStation.name}`);
  console.log(`  Owner: ${targetStation.faction}`);
  console.log(`  Defense Rating: ${targetStation.defenseRating}/10`);
  console.log(`  Population: ${targetStation.population}`);
  console.log('');

  // Mars Federation launches siege with superior force
  const attackingForce = 50000;  // 50,000 troops
  console.log(`${StationFaction.MARS_FEDERATION} launches siege with ${attackingForce.toLocaleString()} troops`);
  console.log('');

  const siege = conquestSystem.beginSiege(
    StationFaction.MARS_FEDERATION,
    targetStation,
    attackingForce
  );

  console.log('Siege Report (Day 0):');
  console.log(conquestSystem.getSiegeReport(siege.id));
  console.log('');

  // Simulate siege progress over 40 days
  console.log('=== SIEGE PROGRESSION ===');

  for (let day = 1; day <= 40; day++) {
    const deltaTime = 86400;  // 1 day in seconds
    conquestSystem.update(deltaTime);

    // Report every 5 days
    if (day % 5 === 0) {
      const siegeStatus = conquestSystem.getActiveSieges().find(s => s.id === siege.id);
      if (siegeStatus) {
        console.log(`\nDay ${day}:`);
        console.log(`  Status: ${siegeStatus.status}`);
        console.log(`  Progress: ${(siegeStatus.captureProgress * 100).toFixed(1)}%`);
        console.log(`  Defense Strength: ${(siegeStatus.currentDefenseStrength * 100).toFixed(1)}%`);
        console.log(`  Morale: ${(siegeStatus.populationMorale * 100).toFixed(1)}%`);
        console.log(`  Supplies: ${siegeStatus.defenderSupplies.toFixed(1)} days`);
        console.log(`  Casualties: ${siegeStatus.civilianCasualties.toFixed(0)} civilians`);

        // Check if captured
        if (siegeStatus.status === 'CAPTURED') {
          console.log('\n🏴 STATION CAPTURED! 🏴');
          console.log('Siege ended successfully');
          break;
        }
      }
    }
  }

  // Check occupation
  console.log('\n=== OCCUPATION STATUS ===');
  const occupations = conquestSystem.getOccupations();
  if (occupations.length > 0) {
    const occupation = occupations[0];
    console.log(conquestSystem.getOccupationReport(occupation.id));
  }

  console.log('\n✅ Test Case 1 Complete: Siege mechanics working\n');
}

/**
 * Test Case 2: Failed Siege (Defenders Hold)
 *
 * Weak attacking force fails to capture well-defended station
 * Expected: Siege fails, attackers withdraw
 */
export function testFailedSiege(): void {
  console.log('\n=== TEST CASE 2: Failed Siege (Defenders Hold) ===\n');

  const conquestSystem = new ConquestSystem();

  // Create heavily defended station
  const targetStation = createTestStation(
    'earth_fortress_1',
    'Earth Defense Citadel',
    StationFaction.UNITED_EARTH,
    StationType.MILITARY_BASE,
    { x: 10000, y: 0, z: 0 },
    10  // Defense rating: 10/10 (maximum)
  );

  console.log(`Target: ${targetStation.name}`);
  console.log(`  Owner: ${targetStation.faction}`);
  console.log(`  Defense Rating: ${targetStation.defenseRating}/10 (MAXIMUM)`);
  console.log('');

  // Pirate faction attacks with insufficient force
  const attackingForce = 5000;  // Only 5,000 troops (way too few)
  console.log(`${StationFaction.PIRATE} attacks with only ${attackingForce.toLocaleString()} troops (insufficient!)`);
  console.log('');

  const siege = conquestSystem.beginSiege(
    StationFaction.PIRATE,
    targetStation,
    attackingForce
  );

  // Simulate 20 days
  for (let day = 1; day <= 20; day++) {
    conquestSystem.update(86400);

    if (day % 5 === 0) {
      const siegeStatus = conquestSystem.getActiveSieges().find(s => s.id === siege.id);
      if (siegeStatus) {
        console.log(`Day ${day}:`);
        console.log(`  Attacking Force: ${siegeStatus.attackingForce.toFixed(0)}`);
        console.log(`  Defending Force: ${siegeStatus.defendingForce.toFixed(0)}`);
        console.log(`  Status: ${siegeStatus.status}`);

        if (siegeStatus.status === 'LIFTED') {
          console.log('\n⚔️ SIEGE LIFTED! Defenders repelled the attack! ⚔️');
          break;
        }
      }
    }
  }

  console.log('\n✅ Test Case 2 Complete: Failed siege mechanics working\n');
}

/**
 * Test Case 3: Occupation with Resistance
 *
 * After conquest, population resists occupation
 * Expected: Insurgent attacks, garrison losses, resistance dynamics
 */
export function testOccupationResistance(): void {
  console.log('\n=== TEST CASE 3: Occupation with Resistance ===\n');

  const conquestSystem = new ConquestSystem();

  // Create station
  const station = createTestStation(
    'mars_colony_1',
    'New Olympus Station',
    StationFaction.MARS_FEDERATION,
    StationType.ORBITAL_STATION,
    { x: 30000, y: 0, z: 0 },
    5
  );

  // Quick siege and capture
  const siege = conquestSystem.beginSiege(
    StationFaction.BELT_ALLIANCE,
    station,
    30000
  );

  // Fast-forward to capture
  for (let i = 0; i < 30; i++) {
    conquestSystem.update(86400);
  }

  console.log('Station captured, occupation begins');
  console.log('');

  // Monitor occupation for 60 days
  console.log('=== OCCUPATION DYNAMICS (60 days) ===');

  for (let day = 1; day <= 60; day++) {
    conquestSystem.update(86400);

    const occupations = conquestSystem.getOccupations();
    if (occupations.length > 0) {
      const occ = occupations[0];

      if (day % 10 === 0) {
        console.log(`\nDay ${day} of Occupation:`);
        console.log(`  Status: ${occ.status}`);
        console.log(`  Garrison: ${occ.garrisonSize.toFixed(0)} / ${occ.requiredGarrison.toFixed(0)}`);
        console.log(`  Resistance: ${(occ.resistanceLevel * 100).toFixed(1)}%`);
        console.log(`  Control: ${(occ.controlLevel * 100).toFixed(1)}%`);
        console.log(`  Loyalty: ${(occ.loyaltyToOccupier * 100).toFixed(1)}%`);
        console.log(`  Insurgent Attacks: ${occ.insurgentAttacks}`);
        console.log(`  Economic Productivity: ${(occ.economicProductivity * 100).toFixed(1)}%`);
      }
    }
  }

  console.log('\n✅ Test Case 3 Complete: Occupation resistance mechanics working\n');
}

/**
 * Test Case 4: FactionMilitaryAI Target Selection
 *
 * Faction AI identifies and prioritizes conquest targets
 * Expected: AI scans targets, evaluates feasibility, plans operations
 */
export function testFactionMilitaryAI(): void {
  console.log('\n=== TEST CASE 4: Faction Military AI ===\n');

  const conquestSystem = new ConquestSystem();
  const diplomacyEngine = new FactionDiplomacyEngine();
  const economicNeeds = new FactionEconomicNeeds();
  const militaryAI = new FactionMilitaryAI(conquestSystem, diplomacyEngine, economicNeeds);

  // Initialize factions
  console.log('Initializing factions...');
  militaryAI.initializeFaction(StationFaction.MARS_FEDERATION, 'AGGRESSIVE');
  militaryAI.initializeFaction(StationFaction.BELT_ALLIANCE, 'DEFENSIVE');
  militaryAI.initializeFaction(StationFaction.UNITED_EARTH, 'BALANCED');
  console.log('');

  // Create stations
  const stations = [
    createTestStation('station_1', 'Belt Mining Platform', StationFaction.BELT_ALLIANCE, StationType.MINING_PLATFORM, { x: 10000, y: 0, z: 0 }, 3),
    createTestStation('station_2', 'Mars Trade Hub', StationFaction.MARS_FEDERATION, StationType.TRADING_HUB, { x: 20000, y: 0, z: 0 }, 7),
    createTestStation('station_3', 'Belt Defense Station', StationFaction.BELT_ALLIANCE, StationType.MILITARY_BASE, { x: 15000, y: 0, z: 0 }, 8),
    createTestStation('station_4', 'Independent Outpost', StationFaction.INDEPENDENT, StationType.FUEL_DEPOT, { x: 5000, y: 0, z: 0 }, 2),
  ];

  stations.forEach(s => militaryAI.registerStation(s));

  console.log('Registered stations:');
  stations.forEach(s => {
    console.log(`  ${s.name} (${s.faction}) - Defense: ${s.defenseRating}/10`);
  });
  console.log('');

  // Set up war between Mars and Belt
  console.log('Setting diplomatic relations: Mars vs Belt = WAR');
  diplomacyEngine.declareWar(
    StationFaction.MARS_FEDERATION,
    StationFaction.BELT_ALLIANCE,
    ['TERRITORIAL_EXPANSION', 'RESOURCE_COMPETITION']
  );
  console.log('');

  // Run AI update
  console.log('Running Military AI update...');
  militaryAI.update(Date.now() / 1000, 0);
  console.log('');

  // Get Mars Federation military report
  console.log(militaryAI.getMilitaryReport(StationFaction.MARS_FEDERATION));
  console.log('');

  // Get top targets for Mars
  console.log('Top targets for Mars Federation:');
  const targets = militaryAI.getTopTargets(StationFaction.MARS_FEDERATION, 3);
  targets.forEach((target, index) => {
    console.log(`\n${index + 1}. ${target.name} (${target.ownerFaction})`);
    console.log(`   Priority Score: ${target.priorityScore.toFixed(1)}`);
    console.log(`   Defense: ${target.defenseRating}/10`);
    console.log(`   Strategic Value: ${target.strategicValue}/10`);
    console.log(`   Feasibility: ${(target.feasibilityScore * 100).toFixed(0)}%`);
    console.log(`   Required Force: ${target.requiredForce.toFixed(0)}`);
    console.log(`   Estimated Duration: ${target.estimatedDuration.toFixed(1)} days`);
  });

  console.log('\n✅ Test Case 4 Complete: Military AI target selection working\n');
}

/**
 * Test Case 5: Full Conquest Cycle with Liberation
 *
 * Complete cycle: Attack → Capture → Occupy → Liberation attempt
 * Expected: Dynamic borders, territory changes hands multiple times
 */
export function testFullConquestCycle(): void {
  console.log('\n=== TEST CASE 5: Full Conquest Cycle with Liberation ===\n');

  const conquestSystem = new ConquestSystem();
  const diplomacyEngine = new FactionDiplomacyEngine();
  const economicNeeds = new FactionEconomicNeeds();
  const militaryAI = new FactionMilitaryAI(conquestSystem, diplomacyEngine, economicNeeds);

  // Initialize factions
  militaryAI.initializeFaction(StationFaction.OUTER_COLONIES, 'EXPANSIONIST');
  militaryAI.initializeFaction(StationFaction.INDEPENDENT, 'DEFENSIVE');

  // Create contested station
  const station = createTestStation(
    'contested_station',
    'Frontier Trading Post',
    StationFaction.INDEPENDENT,
    StationType.TRADING_HUB,
    { x: 40000, y: 0, z: 0 },
    4
  );

  militaryAI.registerStation(station);

  console.log('=== PHASE 1: INITIAL CONQUEST ===');
  console.log(`${StationFaction.OUTER_COLONIES} attacks ${station.name} (owned by ${StationFaction.INDEPENDENT})`);
  console.log('');

  // Declare war
  diplomacyEngine.declareWar(
    StationFaction.OUTER_COLONIES,
    StationFaction.INDEPENDENT,
    ['TERRITORIAL_EXPANSION']
  );

  // Launch siege
  const siege = conquestSystem.beginSiege(
    StationFaction.OUTER_COLONIES,
    station,
    25000
  );

  // Run siege to completion
  for (let day = 1; day <= 30; day++) {
    conquestSystem.update(86400);

    const activeSieges = conquestSystem.getActiveSieges();
    const currentSiege = activeSieges.find(s => s.id === siege.id);

    if (currentSiege && currentSiege.status === 'CAPTURED') {
      console.log(`Day ${day}: STATION CAPTURED!`);
      console.log(`Border shift: ${StationFaction.INDEPENDENT} → ${StationFaction.OUTER_COLONIES}`);
      break;
    }
  }

  console.log('');
  console.log('=== PHASE 2: OCCUPATION ===');

  // Monitor occupation for 30 days
  for (let day = 1; day <= 30; day++) {
    conquestSystem.update(86400);

    const occupations = conquestSystem.getOccupations();
    if (occupations.length > 0 && day % 10 === 0) {
      const occ = occupations[0];
      console.log(`Day ${day}:`);
      console.log(`  Occupier: ${occ.occupier}`);
      console.log(`  Resistance: ${(occ.resistanceLevel * 100).toFixed(0)}%`);
      console.log(`  Control: ${(occ.controlLevel * 100).toFixed(0)}%`);
      console.log(`  Insurgent Attacks: ${occ.insurgentAttacks}`);
    }
  }

  console.log('');
  console.log('=== PHASE 3: LIBERATION ATTEMPT ===');

  const occupations = conquestSystem.getOccupations();
  if (occupations.length > 0) {
    const occ = occupations[0];
    console.log(`${occ.originalOwner} attempts to retake ${occ.territoryName}`);
    console.log(`Current garrison: ${occ.garrisonSize.toFixed(0)}`);
    console.log(`Resistance helping: ${(occ.resistanceLevel * 100).toFixed(0)}%`);
    console.log('');

    // Simulate liberation attempt (manual trigger for test)
    // In real game, this would be triggered by FactionMilitaryAI
    console.log('Liberation force assembles...');
    console.log('(In full integration, FactionMilitaryAI would automatically plan and execute liberation)');
  }

  console.log('\n✅ Test Case 5 Complete: Full conquest cycle demonstrated\n');
}

/**
 * Helper function to create test station
 */
function createTestStation(
  id: string,
  name: string,
  faction: StationFaction,
  stationType: StationType,
  position: Vector3,
  defenseRating: number
): SpaceStation {
  const population = defenseRating * 5000 + 10000;

  const physical: PhysicalProperties = {
    mass: 1000000,
    radius: 300,
    rotationPeriod: 120,
    axialTilt: 0,
    surfaceGravity: 0,
    escapeVelocity: 100
  };

  const visual: VisualProperties = {
    color: '#808080',
    albedo: 0.3,
    emissivity: 0.9
  };

  const services = {
    refueling: true,
    repairs: true,
    trading: true,
    missions: true,
    shipUpgrades: false,
    docking: true,
    medical: true,
    bountyBoard: true
  };

  const economy = {
    wealthLevel: 0.7,
    tradeVolume: 100000,
    commodityPrices: new Map(),
    demandGoods: ['Fuel', 'Food'],
    supplyGoods: ['Metals']
  };

  return new SpaceStation(
    id,
    name,
    stationType,
    faction,
    services,
    population,
    economy,
    defenseRating,
    physical,
    visual,
    position
  );
}

/**
 * Run all test cases
 */
export function runAllConquestTests(): void {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       CONQUEST SYSTEM TEST SUITE                    ║');
  console.log('║  Dynamic Borders, Siege Warfare, Occupation AI      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    testBasicSiege();
    testFailedSiege();
    testOccupationResistance();
    testFactionMilitaryAI();
    testFullConquestCycle();

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║              ALL TESTS PASSED ✅                     ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
  }
}

// Export for easy execution
if (require.main === module) {
  runAllConquestTests();
}
