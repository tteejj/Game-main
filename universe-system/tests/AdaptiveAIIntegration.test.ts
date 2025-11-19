/**
 * AdaptiveAIIntegration Tests
 * Tests for AdaptiveAI integration with NPCShipAI
 */

import { NPCShipAI } from '../src/NPCShipAI';
import { FactionSystem } from '../src/FactionSystem';
import { SpaceStation } from '../src/StationGenerator';

describe('Adaptive AI Integration', () => {
  let npcAI: NPCShipAI;
  let factionSystem: FactionSystem;
  let stations: Map<string, SpaceStation>;

  beforeEach(() => {
    npcAI = new NPCShipAI();
    factionSystem = new FactionSystem();
    // Use empty stations map for testing adaptive AI directly
    // Real integration would use StationGenerator
    stations = new Map();
  });

  describe('Skill Initialization', () => {
    test('should initialize ships with AdaptiveAI', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      expect(ship.adaptiveAI).toBeDefined();
      expect(ship.adaptiveAI.getSuccessRate()).toBe(0); // No decisions yet
    });

    test('should have expertise tracking for all domains', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      const tradingExpertise = ship.adaptiveAI.getExpertise('TRADING');
      const combatExpertise = ship.adaptiveAI.getExpertise('COMBAT');
      const navigationExpertise = ship.adaptiveAI.getExpertise('NAVIGATION');

      expect(tradingExpertise).toBeDefined();
      expect(combatExpertise).toBeDefined();
      expect(navigationExpertise).toBeDefined();

      // Initial level should be 0
      expect(tradingExpertise?.level).toBe(0);
      expect(combatExpertise?.level).toBe(0);
      expect(navigationExpertise?.level).toBe(0);
    });
  });

  describe('Learning from Trading', () => {
    test('should record successful trades and improve trading skills', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Initial trading expertise
      const initialExpertise = ship.adaptiveAI.getExpertise('TRADING');
      const initialXP = initialExpertise?.experiencePoints || 0;

      // Simulate a successful trade
      ship.adaptiveAI.recordOutcome(
        'trading_minerals',
        'route_station1_to_station2',
        'SUCCESS',
        5, // Good profit
        { profit: 5000 }
      );

      // Check that expertise increased
      const updatedExpertise = ship.adaptiveAI.getExpertise('TRADING');
      expect(updatedExpertise?.experiencePoints).toBeGreaterThan(initialXP);
    });

    test('should learn from failed trades', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      const initialXP = ship.adaptiveAI.getExpertise('TRADING')?.experiencePoints || 0;

      // Failed trade (still gains some XP)
      ship.adaptiveAI.recordOutcome(
        'trading_minerals',
        'route_station1_to_station2',
        'FAILURE',
        -5, // Lost money
        { profit: -1000 }
      );

      const updatedXP = ship.adaptiveAI.getExpertise('TRADING')?.experiencePoints || 0;
      expect(updatedXP).toBeGreaterThan(initialXP); // Still learn from failures
    });

    test('should improve success rate over time with successful trades', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Simulate multiple successful trades
      for (let i = 0; i < 5; i++) {
        ship.adaptiveAI.recordOutcome(
          'trading_minerals',
          'route_station1_to_station2',
          'SUCCESS',
          7,
          { profit: 7000 }
        );
      }

      const stats = ship.adaptiveAI.getStatistics();
      expect(stats.successRate).toBeGreaterThan(0.8); // Should have high success rate
      expect(stats.strategiesLearned).toBeGreaterThan(0); // Should have learned strategies
    });
  });

  describe('Learning from Combat', () => {
    test('should record successful combat and improve combat skills', () => {
      const ship = npcAI.createShip('PIRATE', 'test_faction', { x: 0, y: 0, z: 0 });

      const initialExpertise = ship.adaptiveAI.getExpertise('COMBAT');
      const initialXP = initialExpertise?.experiencePoints || 0;

      // Successful combat
      ship.adaptiveAI.recordOutcome(
        'combat_with_enemy_faction',
        'engage_attack',
        'SUCCESS',
        8, // Good combat outcome
        { severity: 2.5, weaponPower: 80 }
      );

      const updatedExpertise = ship.adaptiveAI.getExpertise('COMBAT');
      expect(updatedExpertise?.experiencePoints).toBeGreaterThan(initialXP);
    });

    test('should learn from combat defeats', () => {
      const ship = npcAI.createShip('PIRATE', 'test_faction', { x: 0, y: 0, z: 0 });

      const initialXP = ship.adaptiveAI.getExpertise('COMBAT')?.experiencePoints || 0;

      // Failed combat
      ship.adaptiveAI.recordOutcome(
        'combat_with_enemy_faction',
        'engage_attack',
        'FAILURE',
        -7, // Severe defeat
        { hullStrength: 20, distance: 1500 }
      );

      const updatedXP = ship.adaptiveAI.getExpertise('COMBAT')?.experiencePoints || 0;
      expect(updatedXP).toBeGreaterThan(initialXP); // Learn from defeats
    });

    test('should learn successful escape strategies', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      const initialExpertise = ship.adaptiveAI.getExpertise('SURVIVAL');
      const initialXP = initialExpertise?.experiencePoints || 0;

      // Successful escape (survival domain due to 'escape' keyword)
      ship.adaptiveAI.recordOutcome(
        'threat_from_pirate_faction',
        'flee_to_safety',
        'SUCCESS',
        5,
        { hullStrength: 45, distance: 15000 }
      );

      const updatedExpertise = ship.adaptiveAI.getExpertise('SURVIVAL');
      expect(updatedExpertise?.experiencePoints).toBeGreaterThan(initialXP);

      const stats = ship.adaptiveAI.getStatistics();
      expect(stats.successRate).toBeGreaterThan(0);
    });
  });

  describe('Skill Progression', () => {
    test('should level up expertise with sufficient XP', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Initial level 0
      expect(ship.adaptiveAI.getExpertise('TRADING')?.level).toBe(0);

      // Simulate enough trades to level up (100 XP per level)
      for (let i = 0; i < 10; i++) {
        ship.adaptiveAI.recordOutcome(
          'trading_minerals',
          'route_station1_to_station2',
          'SUCCESS',
          5,
          { profit: 5000 }
        );
      }

      // Should have leveled up (10 successes * 10 XP = 100 XP = level 1)
      const expertise = ship.adaptiveAI.getExpertise('TRADING');
      expect(expertise?.level).toBeGreaterThanOrEqual(1);
      expect(expertise?.experiencePoints).toBeGreaterThanOrEqual(100);
    });

    test('should track milestones on level up', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Generate enough XP to level up
      for (let i = 0; i < 15; i++) {
        ship.adaptiveAI.recordOutcome(
          'trading_minerals',
          'route_station1_to_station2',
          'SUCCESS',
          6,
          { profit: 6000 }
        );
      }

      const expertise = ship.adaptiveAI.getExpertise('TRADING');
      expect(expertise?.milestones.length).toBeGreaterThan(0);

      const latestMilestone = expertise?.milestones[expertise.milestones.length - 1];
      expect(latestMilestone?.name).toContain('TRADING');
    });
  });

  describe('Skill Decay', () => {
    test('should decay skills after extended inactivity', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Build up some trading skill
      for (let i = 0; i < 10; i++) {
        ship.adaptiveAI.recordOutcome(
          'trading_minerals',
          'route_station1_to_station2',
          'SUCCESS',
          5,
          { profit: 5000 }
        );
      }

      const expertise = ship.adaptiveAI.getExpertise('TRADING');
      const initialLevel = expertise?.level || 0;

      // Simulate 14 days of inactivity (7 days grace + 7 days decay)
      const fourteenDays = 14 * 24 * 60 * 60; // seconds
      ship.adaptiveAI.decaySkills(fourteenDays);

      const decayedLevel = ship.adaptiveAI.getExpertise('TRADING')?.level || 0;

      // Should have some decay (1% per day after 7 days = 7% decay)
      expect(decayedLevel).toBeLessThan(initialLevel);
    });

    test('should not decay skills within 7-day grace period', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Build up some skill
      for (let i = 0; i < 10; i++) {
        ship.adaptiveAI.recordOutcome(
          'trading_minerals',
          'route_station1_to_station2',
          'SUCCESS',
          5,
          { profit: 5000 }
        );
      }

      const initialLevel = ship.adaptiveAI.getExpertise('TRADING')?.level || 0;

      // Simulate 6 days (within grace period)
      const sixDays = 6 * 24 * 60 * 60;
      ship.adaptiveAI.decaySkills(sixDays);

      const afterLevel = ship.adaptiveAI.getExpertise('TRADING')?.level || 0;

      // No decay within grace period
      expect(afterLevel).toBe(initialLevel);
    });
  });

  describe('Strategy Learning', () => {
    test('should learn strategies from repeated successes', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Repeatedly use same strategy
      for (let i = 0; i < 5; i++) {
        ship.adaptiveAI.recordOutcome(
          'trading_minerals',
          'route_station1_to_station2',
          'SUCCESS',
          7,
          { profit: 7000 }
        );
      }

      const stats = ship.adaptiveAI.getStatistics();
      expect(stats.strategiesLearned).toBeGreaterThan(0); // Should have learned strategies
    });

    test('should track statistics across multiple domains', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Trading experiences
      ship.adaptiveAI.recordOutcome('trading_minerals', 'route_a_to_b', 'SUCCESS', 5, {});
      ship.adaptiveAI.recordOutcome('trading_food', 'route_c_to_d', 'SUCCESS', 6, {});

      // Navigation experiences
      ship.adaptiveAI.recordOutcome('navigate_asteroid_field', 'avoid_obstacles', 'SUCCESS', 4, {});

      // Combat experiences
      ship.adaptiveAI.recordOutcome('combat_with_pirates', 'engage_attack', 'FAILURE', -5, {});

      const stats = ship.adaptiveAI.getStatistics();
      expect(stats.successRate).toBe(0.75); // 3/4 successes
      expect(stats.totalExpertiseLevels).toBeGreaterThanOrEqual(0);
      expect(stats.strategiesLearned).toBeGreaterThan(0); // Should have learned strategies
    });
  });

  describe('Integration with Game Loop', () => {
    test('should call decaySkills during update loop', () => {
      const ship = npcAI.createShip('TRADER', 'test_faction', { x: 0, y: 0, z: 0 });

      // Build up skill
      for (let i = 0; i < 10; i++) {
        ship.adaptiveAI.recordOutcome('trading_minerals', 'route_a_to_b', 'SUCCESS', 5, {});
      }

      const decaySpy = jest.spyOn(ship.adaptiveAI, 'decaySkills');

      // Run update (which should call decaySkills)
      npcAI.update(1.0, stations, [], undefined, factionSystem);

      expect(decaySpy).toHaveBeenCalledWith(1.0);
    });
  });
});
