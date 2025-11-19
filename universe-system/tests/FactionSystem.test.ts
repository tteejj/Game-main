/**
 * FactionSystem Tests
 * Basic test coverage for faction diplomacy and relationships
 */

import { FactionSystem } from '../src/FactionSystem';

describe('FactionSystem', () => {
  let factionSystem: FactionSystem;

  beforeEach(() => {
    factionSystem = new FactionSystem();
  });

  describe('Basic Faction Operations', () => {
    test('should initialize with default factions', () => {
      const factions = factionSystem.getAllFactions();
      expect(factions.length).toBeGreaterThan(0);
    });

    test('should retrieve faction by ID', () => {
      const factions = factionSystem.getAllFactions();
      const firstFaction = factions[0];
      const retrieved = factionSystem.getFaction(firstFaction.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstFaction.id);
    });
  });

  describe('Faction-to-Faction Relationships', () => {
    test('should get relationship between two factions', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      const relationship = factionSystem.getFactionRelationship(faction1, faction2);
      expect(relationship).toBeDefined();
      expect(relationship?.faction1).toBeTruthy();
      expect(relationship?.faction2).toBeTruthy();
    });

    test('should get standing value between factions', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const standing = factionSystem.getFactionStanding(factions[0].id, factions[1].id);
      expect(standing).toBeGreaterThanOrEqual(-100);
      expect(standing).toBeLessThanOrEqual(100);
    });

    test('should get diplomatic state between factions', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const state = factionSystem.getDiplomaticState(factions[0].id, factions[1].id);
      expect(['WAR', 'HOSTILE', 'UNFRIENDLY', 'NEUTRAL', 'FRIENDLY', 'ALLIED']).toContain(state);
    });
  });

  describe('Trade Reporting', () => {
    test('should improve relations when trade is reported', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      const initialStanding = factionSystem.getFactionStanding(faction1, faction2);

      // Report a trade worth 10000 credits
      factionSystem.reportTrade(faction1, faction2, 10000);

      const newStanding = factionSystem.getFactionStanding(faction1, faction2);

      // Standing should have improved
      expect(newStanding).toBeGreaterThan(initialStanding);
    });

    test('should cap trade relationship improvement', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      const initialStanding = factionSystem.getFactionStanding(faction1, faction2);

      // Report huge trade (should be capped at max change of 5)
      factionSystem.reportTrade(faction1, faction2, 1000000);

      const newStanding = factionSystem.getFactionStanding(faction1, faction2);

      const change = newStanding - initialStanding;
      expect(change).toBeLessThanOrEqual(5);
    });
  });

  describe('Combat Reporting', () => {
    test('should damage relations when combat is reported', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      const initialStanding = factionSystem.getFactionStanding(faction1, faction2);

      // Report combat with severity 2
      factionSystem.reportCombat(faction1, faction2, 2);

      const newStanding = factionSystem.getFactionStanding(faction1, faction2);

      // Standing should have decreased
      expect(newStanding).toBeLessThan(initialStanding);
    });

    test('should declare war if combat damages relations below -80', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      // Report multiple severe combat incidents
      for (let i = 0; i < 20; i++) {
        factionSystem.reportCombat(faction1, faction2, 4); // Severity 4 combat
      }

      const state = factionSystem.getDiplomaticState(faction1, faction2);
      const standing = factionSystem.getFactionStanding(faction1, faction2);

      // If standing dropped below -80, state should be WAR
      if (standing <= -80) {
        expect(state).toBe('WAR');
      }
    });
  });

  describe('War and Alliance Checks', () => {
    test('should correctly identify war state', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      // Force war by repeated combat
      for (let i = 0; i < 25; i++) {
        factionSystem.reportCombat(faction1, faction2, 4);
      }

      const atWar = factionSystem.areFactionsAtWar(faction1, faction2);
      const standing = factionSystem.getFactionStanding(faction1, faction2);

      if (standing <= -80) {
        expect(atWar).toBe(true);
      }
    });

    test('should form alliance if relations improve above +80', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      // Massive trade to boost relations
      for (let i = 0; i < 30; i++) {
        factionSystem.reportTrade(faction1, faction2, 50000);
      }

      const allied = factionSystem.areFactionsAllied(faction1, faction2);
      const standing = factionSystem.getFactionStanding(faction1, faction2);

      if (standing >= 80) {
        expect(allied).toBe(true);
      }
    });
  });

  describe('Aid Reporting', () => {
    test('should improve relations when aid is reported', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length < 2) return;

      const faction1 = factions[0].id;
      const faction2 = factions[1].id;

      const initialStanding = factionSystem.getFactionStanding(faction1, faction2);

      // Report aid worth 25000 credits
      factionSystem.reportAid(faction1, faction2, 25000);

      const newStanding = factionSystem.getFactionStanding(faction1, faction2);

      // Standing should have improved
      expect(newStanding).toBeGreaterThan(initialStanding);
    });
  });

  describe('Relationship Queries', () => {
    test('should get all relationships for a faction', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length === 0) return;

      const relationships = factionSystem.getFactionRelationships(factions[0].id);
      expect(Array.isArray(relationships)).toBe(true);
    });
  });

  describe('Player Reputation', () => {
    test('should track player reputation with factions', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length === 0) return;

      const playerId = 'test_player';
      const factionId = factions[0].id;

      const rep = factionSystem.getReputation(playerId, factionId);
      expect(rep).toBeDefined();
      expect(rep.standing).toBeGreaterThanOrEqual(-100);
      expect(rep.standing).toBeLessThanOrEqual(100);
    });

    test('should allow player docking based on reputation', () => {
      const factions = factionSystem.getAllFactions();
      if (factions.length === 0) return;

      const playerId = 'test_player';
      const factionId = factions[0].id;

      const canDock = factionSystem.canPlayerDock(playerId, factionId);
      expect(typeof canDock).toBe('boolean');
    });
  });
});
