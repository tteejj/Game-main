/**
 * ConstructionSystem.integration.test.ts
 *
 * Integration tests for ConstructionSystem with actual station creation
 */

import { ConstructionSystem } from '../ConstructionSystem';
import { StationGenerator } from '../StationGenerator';
import { StarSystem } from '../StarSystem';
import { Vector3 } from '../CelestialBody';

describe('ConstructionSystem Integration', () => {
  let constructionSystem: ConstructionSystem;
  let stationGenerator: StationGenerator;
  let starSystem: StarSystem;

  beforeEach(() => {
    // Setup systems
    starSystem = new StarSystem('test-system', {
      seed: 12345,
      starClass: 'G' as any,
      allowStations: true
    });

    stationGenerator = new StationGenerator(12345);
    constructionSystem = new ConstructionSystem();
  });

  describe('System Linking', () => {
    it('should link StationGenerator', () => {
      constructionSystem.linkStationGenerator(stationGenerator);
      expect(constructionSystem.isStationCreationEnabled()).toBe(false); // Need both systems
    });

    it('should link StarSystem', () => {
      constructionSystem.linkStarSystem(starSystem);
      expect(constructionSystem.isStationCreationEnabled()).toBe(false); // Need both systems
    });

    it('should enable station creation when both systems linked', () => {
      constructionSystem.linkStationGenerator(stationGenerator);
      constructionSystem.linkStarSystem(starSystem);
      expect(constructionSystem.isStationCreationEnabled()).toBe(true);
    });
  });

  describe('Station Creation', () => {
    beforeEach(() => {
      constructionSystem.linkStationGenerator(stationGenerator);
      constructionSystem.linkStarSystem(starSystem);
    });

    it('should create station when construction completes', () => {
      const initialStationCount = starSystem.stations.length;

      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'OUTPOST',
        position,
        'UNITED_EARTH',
        starSystem.id
      );

      expect(project).toBeTruthy();

      // Complete construction
      constructionSystem.update(project!.buildTime);

      // Check station was created
      expect(starSystem.stations.length).toBe(initialStationCount + 1);

      const newStation = starSystem.stations[starSystem.stations.length - 1];
      expect(newStation).toBeTruthy();
      expect(newStation.name).toBeTruthy();
      expect(newStation.id).toContain('test-system');
    });

    it('should create station with correct type', () => {
      const position: Vector3 = { x: 2e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'MINING_PLATFORM',
        position,
        'BELT_ALLIANCE',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);

      const newStation = starSystem.stations[starSystem.stations.length - 1];
      expect(newStation.stationType).toBe('MINING_PLATFORM');
    });

    it('should register station with parent body', () => {
      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'STATION',
        position,
        'CORPORATE',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);

      const newStation = starSystem.stations[starSystem.stations.length - 1];
      expect(newStation.parent).toBeTruthy();
      expect(newStation.parent?.children).toContain(newStation);
    });

    it('should assign orbital parameters', () => {
      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'DEFENSE_PLATFORM',
        position,
        'MARS_FEDERATION',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);

      const newStation = starSystem.stations[starSystem.stations.length - 1];
      expect(newStation.orbital).toBeTruthy();
      expect(newStation.orbital!.semiMajorAxis).toBeGreaterThan(0);
      expect(newStation.orbital!.eccentricity).toBeLessThan(0.1); // Nearly circular
    });

    it('should initialize station economy', () => {
      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'STATION',
        position,
        'UNITED_EARTH',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);

      const newStation = starSystem.stations[starSystem.stations.length - 1];
      expect(newStation.economy).toBeTruthy();
      expect(newStation.economy.wealthLevel).toBeGreaterThan(0);
      expect(newStation.economy.tradeVolume).toBeGreaterThan(0);
    });

    it('should create stations with docking ports', () => {
      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'STATION',
        position,
        'CORPORATE',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);

      const newStation = starSystem.stations[starSystem.stations.length - 1];
      expect(newStation.dockingPorts.length).toBeGreaterThan(0);
    });
  });

  describe('Construction Events', () => {
    beforeEach(() => {
      constructionSystem.linkStationGenerator(stationGenerator);
      constructionSystem.linkStarSystem(starSystem);
    });

    it('should fire CONSTRUCTION_COMPLETE event', (done) => {
      constructionSystem.onConstructionComplete((event) => {
        expect(event.projectId).toBeTruthy();
        expect(event.type).toBe('OUTPOST');
        expect(event.owner).toBe('UNITED_EARTH');
        expect(event.station).toBeTruthy();
        done();
      });

      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'OUTPOST',
        position,
        'UNITED_EARTH',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);
    });

    it('should fire STATION_CREATED event', (done) => {
      constructionSystem.onStationCreated((event) => {
        expect(event.station).toBeTruthy();
        expect(event.station.name).toBeTruthy();
        expect(event.constructionProjectId).toBeTruthy();
        expect(event.owner).toBe('MARS_FEDERATION');
        expect(event.constructionTime).toBeGreaterThan(0);
        done();
      });

      const position: Vector3 = { x: 2e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'MINING_PLATFORM',
        position,
        'MARS_FEDERATION',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);
    });

    it('should include station in completion event', (done) => {
      constructionSystem.onConstructionComplete((event) => {
        expect(event.station).toBeTruthy();
        expect(event.station!.id).toBeTruthy();
        expect(event.station!.name).toBeTruthy();
        done();
      });

      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'STATION',
        position,
        'CORPORATE',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);
    });
  });

  describe('Multiple Stations', () => {
    beforeEach(() => {
      constructionSystem.linkStationGenerator(stationGenerator);
      constructionSystem.linkStarSystem(starSystem);
    });

    it('should create multiple stations simultaneously', () => {
      const initialCount = starSystem.stations.length;

      // Start 3 construction projects
      const positions: Vector3[] = [
        { x: 1e11, y: 0, z: 0 },
        { x: 2e11, y: 0, z: 0 },
        { x: 3e11, y: 0, z: 0 }
      ];

      const projects = positions.map((pos, i) =>
        constructionSystem.startConstruction(
          'OUTPOST',
          pos,
          `FACTION_${i}`,
          starSystem.id
        )
      );

      expect(constructionSystem.getActiveProjects().length).toBe(3);

      // Complete all
      const maxBuildTime = Math.max(...projects.map(p => p!.buildTime));
      constructionSystem.update(maxBuildTime);

      expect(starSystem.stations.length).toBe(initialCount + 3);
    });

    it('should handle different construction types', () => {
      const types = ['STATION', 'MINING_PLATFORM', 'DEFENSE_PLATFORM', 'OUTPOST'] as const;

      types.forEach((type, i) => {
        const position: Vector3 = { x: (i + 1) * 1e11, y: 0, z: 0 };
        constructionSystem.startConstruction(
          type,
          position,
          'TEST_FACTION',
          starSystem.id
        );
      });

      // Complete all
      constructionSystem.update(4000);

      const createdStations = starSystem.stations.slice(-4);
      expect(createdStations.length).toBe(4);

      // Verify different types were created
      const stationTypes = new Set(createdStations.map(s => s.stationType));
      expect(stationTypes.size).toBeGreaterThan(1);
    });
  });

  describe('Without System Linking', () => {
    it('should not create stations without linked systems', () => {
      // Don't link systems
      const initialCount = starSystem.stations.length;

      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'OUTPOST',
        position,
        'UNITED_EARTH',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);

      // No stations should be created
      expect(starSystem.stations.length).toBe(initialCount);
    });

    it('should still fire completion callbacks without station creation', (done) => {
      constructionSystem.onConstructionComplete((event) => {
        expect(event.projectId).toBeTruthy();
        expect(event.station).toBeUndefined();
        done();
      });

      const position: Vector3 = { x: 1.5e11, y: 0, z: 0 };
      const project = constructionSystem.startConstruction(
        'OUTPOST',
        position,
        'UNITED_EARTH',
        starSystem.id
      );

      constructionSystem.update(project!.buildTime);
    });
  });
});
