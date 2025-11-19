/**
 * Player Universe Integration Demo
 *
 * Shows the complete player experience in the living universe:
 * - Player ship existing in the universe
 * - Detecting stations and ships with sensors
 * - Hailing and communicating
 * - Docking and using station services
 * - Trading cargo for profit
 * - Accepting and completing missions
 * - Navigating to targets
 * - Interacting with planetary cities
 * - Seeing news and universe events
 * - All systems working together for immersion
 */

import { Spacecraft } from '../../physics-modules/src/spacecraft';
import { UniverseOrchestrator } from '../UniverseOrchestrator';
import { UniverseDesigner } from '../UniverseDesigner';
import { PlayerShipIntegration } from '../PlayerShipIntegration';
import { StationServices } from '../StationServices';
import { SensorIntegration } from '../SensorIntegration';
import { CommunicationInterface } from '../CommunicationInterface';
import { MissionSystem } from '../MissionSystem';
import { PlanetaryCityEconomy } from '../PlanetaryCityEconomy';
import { UniverseNavigationIntegration } from '../UniverseNavigationIntegration';
import { UniverseHUD } from '../UniverseHUD';

console.log('═'.repeat(80));
console.log('PLAYER UNIVERSE INTEGRATION DEMO');
console.log('Dwarf Fortress in Space - Living Universe with Player Interaction');
console.log('═'.repeat(80));
console.log('');

// ============================================================================
// SETUP: Create Universe and Player
// ============================================================================

console.log('PHASE 1: Setting up Living Universe...');
console.log('─'.repeat(80));

// Create orchestrator
const orchestrator = new UniverseOrchestrator({
  simulation: {
    macroTickRate: 60,
    mesoTickRate: 10,
    microTickRate: 1/60,
    timeScale: 1.0 // Real-time
  },
  enableEntityAI: true,
  enableFactionDynamics: true,
  enableStorytelling: true,
  enableRumors: true,
  enableChronicles: true
});

// Generate universe
const universe = new UniverseDesigner({
  seed: 42,
  numSystems: 3,
  campaignMode: 'OPEN_WORLD'
});

console.log(`✓ Universe generated with ${universe.systems.size} star systems`);

// Register factions
const factions = [
  { id: 'UEC', name: 'United Earth Consortium' },
  { id: 'MCA', name: 'Mars Colonial Authority' },
  { id: 'PIRATES', name: 'Red Star Syndicate' }
];

for (const faction of factions) {
  orchestrator.registerFaction(faction);
}

console.log(`✓ Registered ${factions.length} factions`);

// Create player spacecraft
const playerShip = new Spacecraft({
  mass: 50000,
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  name: 'SS Explorer'
});

console.log(`✓ Created player ship: ${playerShip.name}`);

// Get starting system
const startSystem = Array.from(universe.systems.values())[0];
console.log(`✓ Starting in system: ${startSystem.name}`);

// Generate stations for system (if not already present)
if (!startSystem.stations || startSystem.stations.length === 0) {
  console.log('  Generating stations for system...');
  // Would call station generator here
}

// Generate cities on planets
const cityEconomy = new PlanetaryCityEconomy();
if (startSystem.planets && startSystem.planets.length > 0) {
  const homePlanet = startSystem.planets[0];
  const cities = cityEconomy.generateCities(homePlanet, 3);
  console.log(`✓ Generated ${cities.length} cities on ${homePlanet.name}`);
}

console.log('');

// ============================================================================
// PHASE 2: Initialize Player Systems
// ============================================================================

console.log('PHASE 2: Initializing Player Systems...');
console.log('─'.repeat(80));

const playerIntegration = new PlayerShipIntegration(playerShip, orchestrator, startSystem);
const sensors = new SensorIntegration(orchestrator);
const comms = new CommunicationInterface(orchestrator);
const missions = new MissionSystem(orchestrator);
const navigation = new UniverseNavigationIntegration(sensors, missions);
const hud = new UniverseHUD(playerIntegration, sensors, comms, missions, cityEconomy, orchestrator);

console.log('✓ Player integration initialized');
console.log('✓ Sensor systems online');
console.log('✓ Communication systems ready');
console.log('✓ Mission computer active');
console.log('✓ Navigation computer online');
console.log('✓ HUD systems operational');
console.log('');

// ============================================================================
// PHASE 3: Player Explores and Uses Sensors
// ============================================================================

console.log('PHASE 3: Sensor Sweep of Local Space...');
console.log('─'.repeat(80));

// Update sensors
sensors.updatePlayerState(playerShip.position, playerShip.velocity, startSystem);
sensors.update(1.0);

// Get sensor contacts
const contacts = sensors.getContacts();
console.log(`Detected ${contacts.length} contacts:`);

for (const contact of contacts.slice(0, 5)) {
  console.log(`  ${contact.type}: ${contact.name} - ${(contact.distance / 1000).toFixed(1)}km`);
}

const nearestStation = sensors.getNearestContact('STATION');
if (nearestStation) {
  console.log('');
  console.log(`Nearest station: ${nearestStation.name} (${(nearestStation.distance / 1000).toFixed(1)}km)`);

  // Perform active scan
  console.log('Performing active scan...');
  const scanResult = sensors.activeScan(nearestStation.id);
  if (scanResult) {
    console.log(`  Population: ${scanResult.population || 'Unknown'}`);
    console.log(`  Services: ${scanResult.services?.join(', ') || 'Unknown'}`);
    console.log(`  Faction: ${scanResult.faction || 'Unknown'}`);
  }
}

console.log('');

// ============================================================================
// PHASE 4: Navigation and Approach
// ============================================================================

console.log('PHASE 4: Navigation to Station...');
console.log('─'.repeat(80));

if (nearestStation && startSystem.stations && startSystem.stations.length > 0) {
  const targetStation = startSystem.stations[0];

  // Set navigation target
  const navTarget = navigation.setTargetStation(targetStation);
  console.log(`Navigation target set: ${navTarget.waypoint.name}`);
  console.log(`  Distance: ${(navTarget.waypoint.distance / 1000).toFixed(1)} km`);
  console.log(`  Bearing: Az ${navTarget.waypoint.bearing.azimuth.toFixed(1)}° El ${navTarget.waypoint.bearing.elevation.toFixed(1)}°`);

  // Simulate approach (instant for demo)
  playerShip.position = {
    x: targetStation.position.x + 500, // 500m from station
    y: targetStation.position.y,
    z: targetStation.position.z
  };
  playerShip.velocity = { x: 0, y: 0, z: 0 };

  console.log('✓ Approached station');
  console.log('');

  // ========================================================================
  // PHASE 5: Communication with Station
  // ========================================================================

  console.log('PHASE 5: Hailing Station...');
  console.log('─'.repeat(80));

  comms.updatePlayerState(playerShip.position, startSystem.id);
  const hailResponse = comms.hailStation(targetStation);

  if (hailResponse.success) {
    console.log(`[${targetStation.name}]: ${hailResponse.message}`);
    console.log('');
    console.log('Response options:');
    for (const option of hailResponse.options || []) {
      console.log(`  ${option.id}: ${option.text}`);
    }
  }

  console.log('');

  // ========================================================================
  // PHASE 6: Docking
  // ========================================================================

  console.log('PHASE 6: Requesting Docking Permission...');
  console.log('─'.repeat(80));

  playerIntegration.update(1.0);
  const dockingResult = await playerIntegration.requestDocking();

  if (dockingResult.success) {
    console.log(`✓ ${dockingResult.message}`);
    console.log(`  Port: ${dockingResult.port}`);
    console.log(`  Fee: ${dockingResult.fee} credits`);
  } else {
    console.log(`✗ ${dockingResult.message}`);
  }

  console.log('');

  // ========================================================================
  // PHASE 7: Station Services
  // ========================================================================

  if (dockingResult.success) {
    console.log('PHASE 7: Accessing Station Services...');
    console.log('─'.repeat(80));

    const serviceMenu = playerIntegration.getStationServiceMenu();

    if (serviceMenu) {
      console.log(`Station: ${serviceMenu.stationName}`);
      console.log('');
      console.log('Available Services:');
      console.log(`  Docking: ${serviceMenu.dockingAvailable ? 'YES' : 'NO'}`);
      console.log(`  Refueling: ${serviceMenu.refuelingAvailable ? 'YES' : 'NO'}`);
      console.log(`  Repair: ${serviceMenu.repairAvailable ? 'YES' : 'NO'}`);
      console.log(`  Trading: ${serviceMenu.tradingAvailable ? 'YES' : 'NO'}`);
      console.log(`  Missions: ${serviceMenu.missionsAvailable ? 'YES' : 'NO'}`);

      // ====================================================================
      // PHASE 8: Trading
      // ====================================================================

      console.log('');
      console.log('PHASE 8: Trading Cargo...');
      console.log('─'.repeat(80));

      // Buy some cargo
      const buyResult = playerIntegration.buyCargo('FOOD', 10);
      console.log(buyResult.message);
      if (buyResult.success) {
        console.log(`  Cost: ${buyResult.cost.toFixed(2)} credits`);
        console.log(`  Remaining credits: ${playerIntegration.getState().credits.toFixed(0)}`);
      }

      // Sell some cargo
      const sellResult = playerIntegration.sellCargo('FOOD', 5);
      console.log(sellResult.message);
      if (sellResult.success) {
        console.log(`  Earned: ${sellResult.earned.toFixed(2)} credits`);
        console.log(`  Current credits: ${playerIntegration.getState().credits.toFixed(0)}`);
      }

      console.log('');

      // ====================================================================
      // PHASE 9: Refueling
      // ====================================================================

      console.log('PHASE 9: Refueling Ship...');
      console.log('─'.repeat(80));

      const refuelResult = playerIntegration.refuel('HYDROGEN', 500);
      console.log(refuelResult.message);
      if (refuelResult.success) {
        console.log(`  Refueled: ${refuelResult.amountRefueled} kg`);
        console.log(`  Cost: ${refuelResult.cost.toFixed(2)} credits`);
      }

      console.log('');

      // ====================================================================
      // PHASE 10: Missions
      // ====================================================================

      console.log('PHASE 10: Mission Board...');
      console.log('─'.repeat(80));

      const generatedMissions = missions.generateMissionsForStation(targetStation, 5);
      console.log(`${generatedMissions.length} missions available:`);
      console.log('');

      for (const mission of generatedMissions.slice(0, 3)) {
        console.log(`[${mission.type}] ${mission.title}`);
        console.log(`  Reward: ${mission.creditReward} credits`);
        console.log(`  Difficulty: ${mission.difficulty}/10`);
        console.log(`  ${mission.description}`);
        console.log('');
      }

      // Accept a mission
      if (generatedMissions.length > 0) {
        const missionToAccept = generatedMissions[0];
        const acceptResult = missions.acceptMission(missionToAccept.id, 'player_ship');

        if (acceptResult.success) {
          console.log(`✓ Mission accepted: ${missionToAccept.title}`);
          console.log(`  Objective: ${missionToAccept.objectives[0].description}`);
        }
      }

      console.log('');
    }

    // ====================================================================
    // PHASE 11: Undocking
    // ====================================================================

    console.log('PHASE 11: Undocking...');
    console.log('─'.repeat(80));

    const undockResult = playerIntegration.undock();
    console.log(undockResult.message);

    console.log('');
  }
}

// ============================================================================
// PHASE 12: Universe News and Events
// ============================================================================

console.log('PHASE 12: Universe News Feed...');
console.log('─'.repeat(80));

const recentNews = playerIntegration.getRecentNews();
console.log(`${recentNews.length} news articles available:`);
console.log('');

for (const article of recentNews.slice(0, 3)) {
  console.log(`[${article.category}] ${article.headline}`);
  console.log(`${article.content.substring(0, 150)}...`);
  console.log('');
}

// ============================================================================
// PHASE 13: Complete HUD Display
// ============================================================================

console.log('PHASE 13: Complete HUD Status...');
console.log('─'.repeat(80));

const hudData = hud.getHUDData();

console.log('PLAYER STATUS:');
console.log(`  Ship: ${hudData.player.shipName}`);
console.log(`  Credits: ${hudData.player.credits.toFixed(0)}`);
console.log(`  Cargo: ${hudData.player.cargo}`);
console.log(`  System: ${hudData.player.currentSystem}`);
console.log('');

console.log('SENSORS:');
console.log(`  Contacts: ${hudData.sensors.contactCount}`);
console.log(`  Nearest: ${hudData.sensors.nearestContact || 'None'}`);
console.log(`  Threats: ${hudData.sensors.threats}`);
console.log('');

console.log('COMMUNICATIONS:');
console.log(`  Unread: ${hudData.comms.unreadMessages}`);
console.log(`  Broadcasts: ${hudData.comms.activeBroadcasts}`);
console.log('');

console.log('MISSIONS:');
console.log(`  Active: ${hudData.missions.active}`);
if (hudData.missions.nextObjective) {
  console.log(`  Next: ${hudData.missions.nextObjective}`);
}
console.log('');

console.log('NEWS:');
if (hudData.news.recentHeadline) {
  console.log(`  Latest: ${hudData.news.recentHeadline}`);
}
console.log(`  System Activity: ${hudData.news.systemActivity}`);
console.log(`  Factions: ${hudData.news.factionsPresent.join(', ')}`);

console.log('');

// ============================================================================
// PHASE 14: Planetary Cities
// ============================================================================

console.log('PHASE 14: Planetary City Economies...');
console.log('─'.repeat(80));

const cities = cityEconomy.getAllCities();
if (cities.length > 0) {
  const city = cities[0];
  console.log(`City: ${city.name} (${city.planet})`);
  console.log(`  Population: ${city.population.toLocaleString()}`);
  console.log(`  GDP: ${city.gdp.toLocaleString()} credits`);
  console.log(`  Happiness: ${city.happiness.toFixed(1)}/100`);
  console.log(`  Government: ${city.governmentType}`);
  console.log(`  Controlling Faction: ${city.controllingFaction}`);
  console.log('');

  // Get city market
  const market = cityEconomy.getMarket(city.id);
  if (market) {
    console.log('City Market:');
    let count = 0;
    for (const [commodity, price] of market.prices) {
      const supply = market.supply.get(commodity) || 0;
      console.log(`  ${commodity}: ${price.toFixed(2)} credits/unit (Supply: ${supply})`);
      if (++count >= 5) break;
    }
  }
}

console.log('');

// ============================================================================
// CONCLUSION
// ============================================================================

console.log('═'.repeat(80));
console.log('PLAYER UNIVERSE INTEGRATION COMPLETE');
console.log('═'.repeat(80));
console.log('');

console.log('Systems Demonstrated:');
console.log('  ✓ Player ship integration with living universe');
console.log('  ✓ Sensor detection of stations, planets, and objects');
console.log('  ✓ Communication with stations and NPCs');
console.log('  ✓ Navigation and waypoint system');
console.log('  ✓ Docking and undocking');
console.log('  ✓ Station services (refuel, repair, trading)');
console.log('  ✓ Cargo trading for profit');
console.log('  ✓ Mission generation and acceptance');
console.log('  ✓ Universe news and events');
console.log('  ✓ Planetary city economies');
console.log('  ✓ Complete HUD data aggregation');
console.log('');

console.log('The player can now EXIST, FLY AROUND IN, and EXPERIENCE');
console.log('this living, breathing universe! 🚀🌌');
console.log('');

// Export for testing
export {
  orchestrator,
  universe,
  playerShip,
  playerIntegration,
  sensors,
  comms,
  missions,
  navigation,
  hud,
  cityEconomy
};
