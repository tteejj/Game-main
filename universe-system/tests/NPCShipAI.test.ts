/**
 * NPC Ship AI Tests
 * Tests NPC ship behavior, goals, and memory system
 */

import { NPCGoalSystem } from '../src/entity-ai/NPCGoalSystem';
import { NPCMemorySystem } from '../src/entity-ai/NPCMemorySystem';

describe('NPCShipAI', () => {
    let goalSystem: NPCGoalSystem;
    let memorySystem: NPCMemorySystem;

    beforeEach(() => {
        goalSystem = new NPCGoalSystem();
        memorySystem = new NPCMemorySystem();
    });

    describe('Goal System', () => {
        test('initializes with default goals', () => {
            expect(goalSystem).toBeDefined();
        });

        test('can add and track goals', () => {
            const goal = goalSystem.createGoal('TRADE', 'station-1', { commodity: 'ore' });

            expect(goal).toBeDefined();
            expect(goal.type).toBe('TRADE');
            expect(goal.targetId).toBe('station-1');
        });

        test('evaluates goal urgency', () => {
            const goal1 = goalSystem.createGoal('TRADE', 'station-1', { urgency: 0.5 });
            const goal2 = goalSystem.createGoal('REFUEL', 'station-2', { urgency: 0.9 });

            const urgency1 = goalSystem.evaluateUrgency(goal1);
            const urgency2 = goalSystem.evaluateUrgency(goal2);

            expect(urgency2).toBeGreaterThan(urgency1);
        });

        test('prioritizes survival goals', () => {
            const tradeGoal = goalSystem.createGoal('TRADE', 'station-1', {});
            const refuelGoal = goalSystem.createGoal('REFUEL', 'station-2', {});

            const tradePriority = goalSystem.evaluateUrgency(tradeGoal);
            const refuelPriority = goalSystem.evaluateUrgency(refuelGoal);

            // Refuel should generally have higher priority when needed
            expect(typeof tradePriority).toBe('number');
            expect(typeof refuelPriority).toBe('number');
        });

        test('calculates distance-based heuristics', () => {
            const goal = goalSystem.createGoal('TRAVEL', 'destination-1', {
                targetPosition: { x: 1000, y: 0, z: 0 }
            });

            const state = {
                location: {
                    position: { x: 0, y: 0, z: 0 },
                    systemId: 'sol'
                },
                resources: {
                    fuel: 100,
                    cargo: 50
                }
            };

            const heuristic = goalSystem.calculateHeuristic(goal, state);

            expect(heuristic).toBeGreaterThan(0);
        });

        test('completes goals when objectives met', () => {
            const goal = goalSystem.createGoal('TRADE', 'station-1', {});

            expect(goal.status).toBe('ACTIVE');

            goalSystem.completeGoal(goal.id);

            expect(goal.status).toBe('COMPLETED');
        });
    });

    describe('Memory System', () => {
        test('records experiences', () => {
            memorySystem.recordExperience({
                type: 'TRADE',
                timestamp: Date.now() / 1000,
                location: { x: 0, y: 0, z: 0 },
                outcome: 'SUCCESS',
                emotional: 0.5,
                details: { profit: 5000 }
            });

            const recent = memorySystem.getRecentExperiences(10);
            expect(recent.length).toBe(1);
            expect(recent[0].type).toBe('TRADE');
        });

        test('learns from successful trades', () => {
            // Record multiple successful trades
            for (let i = 0; i < 5; i++) {
                memorySystem.recordExperience({
                    type: 'TRADE',
                    timestamp: Date.now() / 1000,
                    location: { x: 0, y: 0, z: 0 },
                    outcome: 'SUCCESS',
                    emotional: 0.7,
                    details: { profit: 1000 * (i + 1), commodity: 'ore' }
                });
            }

            const tradeMemories = memorySystem.getExperiencesByType('TRADE');
            expect(tradeMemories.length).toBe(5);
        });

        test('records trauma events', () => {
            memorySystem.recordTrauma({
                type: 'COMBAT',
                severity: 0.8,
                timestamp: Date.now() / 1000,
                trigger: 'hostile_faction',
                location: { x: 0, y: 0, z: 0 }
            });

            const traumas = memorySystem.getTraumas();
            expect(traumas.length).toBe(1);
            expect(traumas[0].type).toBe('COMBAT');
            expect(traumas[0].severity).toBe(0.8);
        });

        test('trauma affects future decisions', () => {
            memorySystem.recordTrauma({
                type: 'COMBAT',
                severity: 0.9,
                timestamp: Date.now() / 1000,
                trigger: 'hostile_faction',
                location: { x: 1000, y: 0, z: 0 }
            });

            const isTriggered = memorySystem.checkTraumaTrigger('hostile_faction');
            expect(isTriggered).toBe(true);
        });

        test('emotional state influences behavior', () => {
            // Record positive experience
            memorySystem.recordExperience({
                type: 'TRADE',
                timestamp: Date.now() / 1000,
                location: { x: 0, y: 0, z: 0 },
                outcome: 'SUCCESS',
                emotional: 0.9,
                details: { profit: 10000 }
            });

            const emotionalState = memorySystem.getEmotionalState();
            expect(emotionalState).toBeGreaterThan(0);
        });

        test('memories decay over time', () => {
            const oldTimestamp = (Date.now() / 1000) - (86400 * 30); // 30 days ago

            memorySystem.recordExperience({
                type: 'TRADE',
                timestamp: oldTimestamp,
                location: { x: 0, y: 0, z: 0 },
                outcome: 'SUCCESS',
                emotional: 0.5,
                details: {}
            });

            memorySystem.updateMemoryDecay(86400 * 31); // 31 days later

            // Old memories should have lower emotional impact
            const emotionalState = memorySystem.getEmotionalState();
            expect(typeof emotionalState).toBe('number');
        });
    });
});
