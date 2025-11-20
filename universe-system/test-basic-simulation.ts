/**
 * Basic Universe Simulation Test
 *
 * Simple test that runs core systems without complex integrations
 */

import { StarSystem } from './src/StarSystem';

console.log('═'.repeat(80));
console.log('BASIC UNIVERSE SIMULATION TEST');
console.log('═'.repeat(80));
console.log('');

// Create a simple star system
console.log('Creating Star System...');
const system = new StarSystem(
  'test-001',
  'Test System',
  {
    seed: 12345,
    numPlanets: { min: 3, max: 5 },
    allowStations: true,
    allowAsteroidBelt: true,
    allowNPCTraffic: true,
    civilizationLevel: 7
  }
);

console.log(`✓ Created: ${system.name}`);
console.log(`  Star: ${system.star.name} (${system.star.starClass})`);
console.log(`  Planets: ${system.planets.length}`);
console.log(`  Moons: ${system.moons.length}`);
console.log(`  Stations: ${system.stations.length}`);
console.log(`  Asteroids: ${system.asteroids.length}`);
console.log('');

// Run simulation
console.log('═'.repeat(80));
console.log('RUNNING SIMULATION');
console.log('═'.repeat(80));
console.log('');

const startTime = Date.now();
const runDuration = 30; // 30 seconds
let tickCount = 0;
let lastReportTime = startTime;

console.log(`Running for ${runDuration} seconds...`);
console.log('');

function report() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`[T+${elapsed}s] Tick ${tickCount}`);

  // Population stats
  if (system.populationSystem) {
    const totalPop = system.populationSystem.getTotalPopulation();
    const avgHappiness = system.populationSystem.getAverageHappiness();
    console.log(`  Population: ${totalPop.toLocaleString()} | Happiness: ${avgHappiness.toFixed(2)}`);
  }

  // Economic stats
  if (system.manufacturingSystem) {
    const facilities = system.manufacturingSystem.getAllFacilities();
    const totalOutput = system.manufacturingSystem.getTotalOutput();
    console.log(`  Manufacturing: ${facilities.length} facilities | Output: ${totalOutput.toFixed(0)}`);
  }

  // Military stats
  if (system.fleetCoordinationSystem) {
    const fleets = system.fleetCoordinationSystem.getAllFleets();
    console.log(`  Fleets: ${fleets.length}`);
  }

  // Research stats
  if (system.researchSystem) {
    const activeProjects = system.researchSystem.getActiveProjects();
    const completedProjects = system.researchSystem.getCompletedProjects();
    console.log(`  Research: ${activeProjects.length} active | ${completedProjects.length} completed`);
  }

  // Construction stats
  if (system.constructionSystem) {
    const activeConstructions = system.constructionSystem.getActiveProjects();
    const completedBuildings = system.constructionSystem.getCompletedProjects();
    console.log(`  Construction: ${activeConstructions.length} active | ${completedBuildings.length} completed`);
  }

  // NPC traffic
  if (system.trafficManager) {
    const ships = system.trafficManager.ships;
    console.log(`  NPC Ships: ${ships.length}`);
  }

  // Diplomacy
  if (system.factionDiplomacy) {
    const alliances = system.factionDiplomacy.getAllAlliances();
    const wars = system.factionDiplomacy.getActiveWars();
    console.log(`  Diplomacy: ${alliances.length} alliances | ${wars.length} wars`);
  }

  console.log('');
}

// Initial report
report();

// Run simulation loop
const interval = setInterval(() => {
  tickCount++;

  // Update at 60 FPS
  system.update(1/60);

  // Report every 5 seconds
  if (Date.now() - lastReportTime >= 5000) {
    report();
    lastReportTime = Date.now();
  }

  // Stop after duration
  if (Date.now() - startTime >= runDuration * 1000) {
    clearInterval(interval);

    console.log('═'.repeat(80));
    console.log('SIMULATION COMPLETE');
    console.log('═'.repeat(80));
    console.log('');
    console.log(`Total ticks: ${tickCount}`);
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('');

    // Final report
    report();

    process.exit(0);
  }
}, 16); // ~60 FPS
