/**
 * construction-integration-example.ts
 *
 * Example demonstrating the complete ConstructionSystem integration with station creation.
 * Shows how to link systems and handle station construction events.
 */

import { StarSystem } from '../StarSystem';
import { StationGenerator } from '../StationGenerator';
import { ConstructionSystem } from '../ConstructionSystem';
import { Vector3 } from '../CelestialBody';

/**
 * Setup and demonstrate the construction system with real station creation
 */
function setupConstructionSystemExample() {
  console.log('\n=== Construction System Integration Example ===\n');

  // Create a star system
  const starSystem = new StarSystem('sol-system', {
    seed: 12345,
    starClass: 'G' as any,
    allowStations: true,
    civilizationLevel: 7
  });

  console.log(`✓ Star system created: ${starSystem.name}`);
  console.log(`  Initial stations: ${starSystem.stations.length}`);

  // Create station generator
  const stationGenerator = new StationGenerator(12345);

  // Create construction system
  const constructionSystem = new ConstructionSystem();

  // CRITICAL: Link the systems for station creation to work!
  constructionSystem.linkStationGenerator(stationGenerator);
  constructionSystem.linkStarSystem(starSystem);

  console.log(`✓ Systems linked - station creation enabled: ${constructionSystem.isStationCreationEnabled()}`);

  // Register event handlers
  constructionSystem.onConstructionComplete((event) => {
    console.log(`\n[Event] Construction Complete!`);
    console.log(`  Project: ${event.projectId}`);
    console.log(`  Type: ${event.type}`);
    console.log(`  Owner: ${event.owner}`);
    if (event.station) {
      console.log(`  ✓ Station Created: ${event.station.name} (${event.station.id})`);
    }
  });

  constructionSystem.onStationCreated((event) => {
    console.log(`\n[Event] Station Created!`);
    console.log(`  Station: ${event.station.name}`);
    console.log(`  Type: ${event.station.stationType}`);
    console.log(`  Faction: ${event.station.faction}`);
    console.log(`  Population: ${event.station.population.toLocaleString()}`);
    console.log(`  Docking Ports: ${event.station.dockingPorts.length}`);
    console.log(`  Defense Rating: ${event.station.defenseRating}/10`);
    console.log(`  Construction Time: ${event.constructionTime.toFixed(2)}s`);
  });

  // Start construction projects for different factions
  console.log('\n--- Starting Construction Projects ---\n');

  // United Earth builds a trading hub
  const position1: Vector3 = {
    x: 1.5e11, // 1 AU from star
    y: 0,
    z: 0
  };

  const project1 = constructionSystem.startConstruction(
    'STATION',
    position1,
    'UNITED_EARTH',
    starSystem.id
  );

  if (project1) {
    console.log(`✓ Started: ${project1.type} for ${project1.owner}`);
    console.log(`  Build time: ${project1.buildTime}s`);
    console.log(`  Costs: ${project1.costs.length} commodities`);
  }

  // Mars Federation builds a mining platform
  const position2: Vector3 = {
    x: 2.3e11, // 1.5 AU from star
    y: 5e10,
    z: 0
  };

  const project2 = constructionSystem.startConstruction(
    'MINING_PLATFORM',
    position2,
    'MARS_FEDERATION',
    starSystem.id
  );

  if (project2) {
    console.log(`✓ Started: ${project2.type} for ${project2.owner}`);
  }

  // Belt Alliance builds an outpost
  const position3: Vector3 = {
    x: 4e11,
    y: 1e11,
    z: 5e9
  };

  const project3 = constructionSystem.startConstruction(
    'OUTPOST',
    position3,
    'BELT_ALLIANCE',
    starSystem.id
  );

  if (project3) {
    console.log(`✓ Started: ${project3.type} for ${project3.owner}`);
  }

  console.log(`\n--- Simulating Construction ---\n`);
  console.log(`Active projects: ${constructionSystem.getActiveProjects().length}`);

  // Simulate construction over time
  const tickDuration = 100; // 100 seconds per tick
  const maxTicks = 40; // Run for up to 4000 seconds

  for (let tick = 0; tick < maxTicks; tick++) {
    constructionSystem.update(tickDuration);

    const activeProjects = constructionSystem.getActiveProjects();

    if (activeProjects.length > 0) {
      console.log(`\nTick ${tick + 1} (${(tick + 1) * tickDuration}s elapsed):`);
      activeProjects.forEach(project => {
        const progressPercent = (project.progress * 100).toFixed(1);
        console.log(`  ${project.type} - ${progressPercent}% complete`);
      });
    }

    // All construction complete?
    if (activeProjects.length === 0 && tick > 0) {
      console.log(`\n✓ All construction projects completed!`);
      break;
    }
  }

  // Show final results
  console.log(`\n--- Final Results ---\n`);
  console.log(`Total stations in system: ${starSystem.stations.length}`);

  starSystem.stations.forEach((station, index) => {
    console.log(`\nStation ${index + 1}:`);
    console.log(`  Name: ${station.name}`);
    console.log(`  Type: ${station.stationType}`);
    console.log(`  Faction: ${station.faction}`);
    console.log(`  Position: (${station.position.x.toExponential(2)}, ${station.position.y.toExponential(2)}, ${station.position.z.toExponential(2)})`);
    console.log(`  Parent: ${station.parent?.name || 'None'}`);
    console.log(`  Population: ${station.population.toLocaleString()}`);
    console.log(`  Services:`);
    console.log(`    - Refueling: ${station.services.refueling ? '✓' : '✗'}`);
    console.log(`    - Repairs: ${station.services.repairs ? '✓' : '✗'}`);
    console.log(`    - Trading: ${station.services.trading ? '✓' : '✗'}`);
    console.log(`    - Docking: ${station.services.docking ? '✓' : '✗'}`);
  });

  // Test query methods
  console.log(`\n--- Query Tests ---\n`);

  const earthStations = starSystem.stations.filter(s => s.faction === 'UNITED_EARTH' as any);
  console.log(`United Earth stations: ${earthStations.length}`);

  const marsStations = starSystem.stations.filter(s => s.faction === 'MARS_FEDERATION' as any);
  console.log(`Mars Federation stations: ${marsStations.length}`);

  const beltStations = starSystem.stations.filter(s => s.faction === 'BELT_ALLIANCE' as any);
  console.log(`Belt Alliance stations: ${beltStations.length}`);

  return {
    starSystem,
    constructionSystem,
    stationGenerator
  };
}

/**
 * Example: Cancel construction mid-progress
 */
function demonstrateCancellation() {
  console.log('\n\n=== Construction Cancellation Example ===\n');

  const starSystem = new StarSystem('test-system', { seed: 99999 });
  const stationGenerator = new StationGenerator(99999);
  const constructionSystem = new ConstructionSystem();

  constructionSystem.linkStationGenerator(stationGenerator);
  constructionSystem.linkStarSystem(starSystem);

  // Start expensive construction
  const project = constructionSystem.startConstruction(
    'DEFENSE_PLATFORM',
    { x: 1e11, y: 0, z: 0 },
    'CORPORATE',
    starSystem.id
  );

  if (project) {
    console.log(`Started: ${project.type}`);
    console.log(`Build time: ${project.buildTime}s`);

    // Progress to 50%
    constructionSystem.update(project.buildTime * 0.5);

    const progress = constructionSystem.getProject(project.id);
    if (progress) {
      console.log(`Progress: ${(progress.progress * 100).toFixed(1)}%`);
    }

    // Cancel construction
    console.log('\nCancelling construction...');
    const refunds = constructionSystem.cancelConstruction(project.id);

    console.log('Refunds received:');
    refunds.forEach(refund => {
      console.log(`  ${refund.commodity}: ${refund.quantity}`);
    });

    console.log(`\nStations created: ${starSystem.stations.length}`);
    console.log('(No station created - construction was cancelled)');
  }
}

/**
 * Example: Multiple factions building simultaneously
 */
function demonstrateMultipleFactions() {
  console.log('\n\n=== Multiple Faction Construction Example ===\n');

  const starSystem = new StarSystem('contested-system', { seed: 55555 });
  const stationGenerator = new StationGenerator(55555);
  const constructionSystem = new ConstructionSystem();

  constructionSystem.linkStationGenerator(stationGenerator);
  constructionSystem.linkStarSystem(starSystem);

  // Multiple factions compete for territory
  const factions = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'CORPORATE'];

  console.log('Multiple factions starting construction...\n');

  factions.forEach((faction, index) => {
    const position: Vector3 = {
      x: (index + 1) * 1e11,
      y: Math.sin(index) * 5e10,
      z: Math.cos(index) * 5e10
    };

    const types = ['STATION', 'OUTPOST', 'MINING_PLATFORM', 'DEFENSE_PLATFORM'] as const;
    const type = types[index % types.length];

    const project = constructionSystem.startConstruction(
      type,
      position,
      faction,
      starSystem.id
    );

    if (project) {
      console.log(`✓ ${faction}: ${type}`);
    }
  });

  // Fast-forward construction
  console.log('\nFast-forwarding construction...\n');
  constructionSystem.update(4000); // Complete all

  console.log(`Total stations: ${starSystem.stations.length}`);

  // Show faction distribution
  const factionCounts = new Map<string, number>();
  starSystem.stations.forEach(station => {
    const count = factionCounts.get(station.faction) || 0;
    factionCounts.set(station.faction, count + 1);
  });

  console.log('\nFaction distribution:');
  factionCounts.forEach((count, faction) => {
    console.log(`  ${faction}: ${count} station(s)`);
  });
}

// Run examples
if (require.main === module) {
  setupConstructionSystemExample();
  demonstrateCancellation();
  demonstrateMultipleFactions();

  console.log('\n=== Examples Complete ===\n');
}

export {
  setupConstructionSystemExample,
  demonstrateCancellation,
  demonstrateMultipleFactions
};
