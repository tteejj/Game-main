/**
 * StarSystem Integration Tests
 * Tests the complete star system generation and operation
 */

import { StarSystem } from '../src/StarSystem';
import { StationGenerator } from '../src/StationGenerator';

describe('StarSystem Integration Tests', () => {
  describe('System Generation', () => {
    test('generates system with valid structure', () => {
      const system = new StarSystem('test-system', 'Test System', {
        civilizationLevel: 5,
        allowStations: true,
        allowNPCTraffic: true
      });

      expect(system).toBeDefined();
      expect(system.name).toBe('Test System');
      expect(system.id).toBe('test-system');
    });

    test('generates celestial bodies with orbital mechanics', () => {
      const system = new StarSystem('test-system', 'Test System', {
        civilizationLevel: 5,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Should have at least some celestial bodies
      const bodies = system.getAllCelestialBodies();
      expect(bodies.length).toBeGreaterThan(0);

      // Each body should have valid properties
      bodies.forEach(body => {
        expect(body.position).toBeDefined();
        expect(body.position.x).toBeDefined();
        expect(body.position.y).toBeDefined();
        expect(body.position.z).toBeDefined();
        expect(body.mass).toBeGreaterThan(0);
        expect(body.radius).toBeGreaterThan(0);
      });
    });

    test('generates stations based on civilization level', () => {
      const lowCivSystem = new StarSystem('low-civ', 'Low Civ System', {
        civilizationLevel: 2,
        allowStations: true,
        allowNPCTraffic: false
      });

      const highCivSystem = new StarSystem('high-civ', 'High Civ System', {
        civilizationLevel: 8,
        allowStations: true,
        allowNPCTraffic: false
      });

      // Higher civilization should have more stations
      expect(highCivSystem.stations.length).toBeGreaterThan(lowCivSystem.stations.length);

      // All stations should have valid properties
      highCivSystem.stations.forEach(station => {
        expect(station.name).toBeDefined();
        expect(station.position).toBeDefined();
        expect(station.faction).toBeDefined();
        expect(station.population).toBeGreaterThan(0);
      });
    });

    test('stations have functioning economy', () => {
      const system = new StarSystem('econ-test', 'Economy Test System', {
        civilizationLevel: 6,
        allowStations: true,
        allowNPCTraffic: false
      });

      expect(system.stations.length).toBeGreaterThan(0);

      const station = system.stations[0];
      expect(station.economy).toBeDefined();
      expect(station.economy.commodities).toBeDefined();

      // Should have some commodity prices
      const commodities = Object.keys(station.economy.commodities);
      expect(commodities.length).toBeGreaterThan(0);

      // Prices should be positive numbers
      commodities.forEach(commodity => {
        const price = station.economy.commodities[commodity].basePrice;
        expect(price).toBeGreaterThan(0);
        expect(typeof price).toBe('number');
      });
    });
  });

  describe('System Updates', () => {
    test('system updates without errors', () => {
      const system = new StarSystem('update-test', 'Update Test', {
        civilizationLevel: 5,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Update for 10 seconds
      expect(() => {
        for (let i = 0; i < 10; i++) {
          system.update(1); // 1 second timestep
        }
      }).not.toThrow();
    });

    test('NPC ships spawn and move', () => {
      const system = new StarSystem('npc-test', 'NPC Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Update for a while to allow NPC spawning
      for (let i = 0; i < 30; i++) {
        system.update(1);
      }

      const npcShips = system.getAllNPCShips();

      // Should have spawned some NPCs
      if (npcShips.length > 0) {
        const ship = npcShips[0];
        expect(ship.position).toBeDefined();
        expect(ship.velocity).toBeDefined();
        expect(ship.faction).toBeDefined();

        // Store initial position
        const initialX = ship.position.x;
        const initialY = ship.position.y;

        // Update more
        for (let i = 0; i < 10; i++) {
          system.update(1);
        }

        // Position should have changed (ship moved)
        const movedX = Math.abs(ship.position.x - initialX) > 0.01;
        const movedY = Math.abs(ship.position.y - initialY) > 0.01;
        expect(movedX || movedY).toBe(true);
      }
    });

    test('Phase 3 systems initialize and update', () => {
      const system = new StarSystem('phase3-test', 'Phase 3 Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Wait for async initialization
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Check Phase 3 systems are initialized
          expect(system.constructionSystem).toBeDefined();
          expect(system.manufacturingSystem).toBeDefined();
          expect(system.researchSystem).toBeDefined();
          expect(system.populationSystem).toBeDefined();
          expect(system.conquestSystem).toBeDefined();

          // Systems should update without errors
          expect(() => {
            system.update(1);
          }).not.toThrow();

          resolve();
        }, 2000);
      });
    }, 10000); // Longer timeout for async
  });

  describe('Station Generation', () => {
    test('StationGenerator creates valid stations', () => {
      const generator = new StationGenerator();
      const system = new StarSystem('station-gen-test', 'Station Gen', {
        civilizationLevel: 5,
        allowStations: false, // Don't auto-generate
        allowNPCTraffic: false
      });

      const station = generator.generateStation(
        'Test Station',
        'Test Faction',
        'TRADING_HUB',
        system
      );

      expect(station.name).toBe('Test Station');
      expect(station.faction).toBe('Test Faction');
      expect(station.type).toBe('TRADING_HUB');
      expect(station.position).toBeDefined();
      expect(station.population).toBeGreaterThan(0);
      expect(station.economy).toBeDefined();
    });

    test('different station types have appropriate properties', () => {
      const generator = new StationGenerator();
      const system = new StarSystem('type-test', 'Type Test', {
        civilizationLevel: 5,
        allowStations: false,
        allowNPCTraffic: false
      });

      const tradingHub = generator.generateStation('Trade', 'Faction', 'TRADING_HUB', system);
      const miningPlatform = generator.generateStation('Mine', 'Faction', 'MINING_PLATFORM', system);
      const militaryBase = generator.generateStation('Military', 'Faction', 'MILITARY_BASE', system);

      // Trading hub should have larger population
      expect(tradingHub.population).toBeGreaterThan(miningPlatform.population);

      // Military base should have higher defense rating
      expect(militaryBase.defenseRating).toBeGreaterThan(tradingHub.defenseRating);

      // All should have unique characteristics
      expect(tradingHub.type).toBe('TRADING_HUB');
      expect(miningPlatform.type).toBe('MINING_PLATFORM');
      expect(militaryBase.type).toBe('MILITARY_BASE');
    });
  });

  describe('System Performance', () => {
    test('handles large number of NPCs efficiently', () => {
      const system = new StarSystem('perf-test', 'Performance Test', {
        civilizationLevel: 9, // Max civ for lots of NPCs
        allowStations: true,
        allowNPCTraffic: true
      });

      // Spawn many NPCs
      for (let i = 0; i < 50; i++) {
        system.update(1);
      }

      // Update should complete in reasonable time
      const startTime = performance.now();
      system.update(1);
      const updateTime = performance.now() - startTime;

      // Should complete in less than 50ms even with many NPCs
      expect(updateTime).toBeLessThan(50);
    });

    test('memory usage remains stable over time', () => {
      const system = new StarSystem('mem-test', 'Memory Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      const initialNPCCount = system.getAllNPCShips().length;

      // Run for many updates
      for (let i = 0; i < 1000; i++) {
        system.update(0.1);
      }

      const finalNPCCount = system.getAllNPCShips().length;

      // NPC count should be bounded (not growing infinitely)
      expect(finalNPCCount).toBeLessThan(initialNPCCount + 100);
    });
  });
});
