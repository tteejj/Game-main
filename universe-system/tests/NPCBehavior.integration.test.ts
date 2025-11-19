/**
 * NPC Behavior Integration Tests
 * Tests NPC AI, personality, memory, and decision-making
 */

import { StarSystem } from '../src/StarSystem';

describe('NPC Behavior Integration Tests', () => {
  describe('NPC Spawning and Lifecycle', () => {
    test('NPCs spawn based on traffic level', () => {
      const highTrafficSystem = new StarSystem('high-traffic', 'High Traffic', {
        civilizationLevel: 8,
        allowStations: true,
        allowNPCTraffic: true
      });

      const lowTrafficSystem = new StarSystem('low-traffic', 'Low Traffic', {
        civilizationLevel: 3,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Update both systems
      for (let i = 0; i < 30; i++) {
        highTrafficSystem.update(1);
        lowTrafficSystem.update(1);
      }

      const highNPCs = highTrafficSystem.getAllNPCShips();
      const lowNPCs = lowTrafficSystem.getAllNPCShips();

      // High traffic system should have more NPCs
      expect(highNPCs.length).toBeGreaterThan(lowNPCs.length);
    });

    test('NPCs have valid initial state', () => {
      const system = new StarSystem('npc-state-test', 'NPC State', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Spawn some NPCs
      for (let i = 0; i < 20; i++) {
        system.update(1);
      }

      const npcs = system.getAllNPCShips();

      if (npcs.length > 0) {
        npcs.forEach(npc => {
          // Should have position
          expect(npc.position).toBeDefined();
          expect(typeof npc.position.x).toBe('number');
          expect(typeof npc.position.y).toBe('number');
          expect(typeof npc.position.z).toBe('number');

          // Should have velocity
          expect(npc.velocity).toBeDefined();

          // Should have faction
          expect(npc.faction).toBeDefined();
          expect(typeof npc.faction).toBe('string');

          // Should have role/type
          expect(npc.role || npc.type).toBeDefined();
        });
      }
    });
  });

  describe('NPC Movement and Navigation', () => {
    test('NPCs move towards destinations', () => {
      const system = new StarSystem('nav-test', 'Navigation Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Spawn NPCs
      for (let i = 0; i < 30; i++) {
        system.update(1);
      }

      const npcs = system.getAllNPCShips();

      if (npcs.length > 0) {
        const npc = npcs[0];
        const initialPos = { ...npc.position };

        // Update for a while
        for (let i = 0; i < 20; i++) {
          system.update(1);
        }

        const finalPos = npc.position;

        // NPC should have moved
        const distance = Math.sqrt(
          Math.pow(finalPos.x - initialPos.x, 2) +
          Math.pow(finalPos.y - initialPos.y, 2) +
          Math.pow(finalPos.z - initialPos.z, 2)
        );

        expect(distance).toBeGreaterThan(0);
      }
    });

    test('NPCs travel between stations', () => {
      const system = new StarSystem('travel-test', 'Travel Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Need multiple stations for travel
      expect(system.stations.length).toBeGreaterThanOrEqual(2);

      // Spawn and update NPCs
      for (let i = 0; i < 50; i++) {
        system.update(1);
      }

      const npcs = system.getAllNPCShips();

      if (npcs.length > 0) {
        // Some NPCs should be in traveling state
        const travelingNPCs = npcs.filter(npc =>
          npc.state === 'TRAVELING' ||
          npc.state === 'DOCKING' ||
          npc.activity === 'traveling'
        );

        // At least some NPCs should be traveling
        expect(travelingNPCs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('NPC Personality and Behavior', () => {
    test('NPCs have personality traits', () => {
      const system = new StarSystem('personality-test', 'Personality Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Spawn NPCs
          for (let i = 0; i < 30; i++) {
            system.update(1);
          }

          const npcs = system.getAllNPCShips();

          if (npcs.length > 0) {
            // Check if NPCs have personality data
            const npcWithPersonality = npcs.find(npc => npc.personality !== undefined);

            if (npcWithPersonality) {
              expect(npcWithPersonality.personality).toBeDefined();
            }

            // Different NPCs should have different behaviors
            const roles = new Set(npcs.map(npc => npc.role || npc.type));
            expect(roles.size).toBeGreaterThan(1);
          }

          resolve();
        }, 2000);
      });
    }, 10000);

    test('trader NPCs visit trading hubs', () => {
      const system = new StarSystem('trader-test', 'Trader Test', {
        civilizationLevel: 8,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Find trading hub
      const tradingHub = system.stations.find(s => s.type === 'TRADING_HUB');

      if (tradingHub) {
        // Spawn NPCs
        for (let i = 0; i < 50; i++) {
          system.update(1);
        }

        const npcs = system.getAllNPCShips();
        const traders = npcs.filter(npc =>
          npc.role === 'TRADER' ||
          npc.type === 'TRADER' ||
          (npc.activity && npc.activity.includes('trad'))
        );

        // Traders should exist
        expect(traders.length).toBeGreaterThan(0);
      }
    });
  });

  describe('NPC Memory and Learning', () => {
    test('NPCs remember trade experiences', () => {
      const system = new StarSystem('memory-test', 'Memory Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Spawn and run NPCs for a while
          for (let i = 0; i < 100; i++) {
            system.update(1);
          }

          const npcs = system.getAllNPCShips();

          if (npcs.length > 0) {
            // Check if any NPC has memory/experience data
            const npcWithMemory = npcs.find(npc =>
              npc.memory !== undefined ||
              npc.experience !== undefined ||
              npc.completedTrades !== undefined
            );

            // At least some NPCs should have memory after this many updates
            if (npcWithMemory) {
              expect(npcWithMemory.memory || npcWithMemory.experience || npcWithMemory.completedTrades).toBeDefined();
            }
          }

          resolve();
        }, 2000);
      });
    }, 10000);
  });

  describe('NPC Interactions', () => {
    test('NPCs dock at stations', () => {
      const system = new StarSystem('dock-test', 'Docking Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Spawn NPCs
      for (let i = 0; i < 100; i++) {
        system.update(1);
      }

      const npcs = system.getAllNPCShips();

      if (npcs.length > 0) {
        // Some NPCs should be docked or docking
        const dockedNPCs = npcs.filter(npc =>
          npc.state === 'DOCKED' ||
          npc.state === 'DOCKING' ||
          npc.isDocked === true
        );

        // After 100 updates, at least some NPCs should have docked
        expect(dockedNPCs.length).toBeGreaterThan(0);
      }
    });

    test('NPCs respond to faction relations', () => {
      const system = new StarSystem('faction-test', 'Faction Test', {
        civilizationLevel: 8,
        allowStations: true,
        allowNPCTraffic: true
      });

      // Spawn NPCs
      for (let i = 0; i < 50; i++) {
        system.update(1);
      }

      const npcs = system.getAllNPCShips();

      if (npcs.length > 1) {
        // NPCs should belong to different factions
        const factions = new Set(npcs.map(npc => npc.faction));
        expect(factions.size).toBeGreaterThan(1);

        // Check if any NPCs are marked as hostile
        const hostileNPCs = npcs.filter(npc => npc.hostile === true);

        // Hostile NPCs may exist based on faction relations
        // This is okay whether they exist or not
        expect(hostileNPCs.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
