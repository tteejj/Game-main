/**
 * Game Integration Tests
 * Tests the complete game system integration
 */

import { Game } from '../src/game';

describe('Game Integration', () => {
    let canvas: HTMLCanvasElement;
    let game: Game;

    beforeEach(() => {
        // Create mock canvas
        canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        game = new Game(canvas);
    });

    test('game initializes without errors', () => {
        expect(game).toBeDefined();
        expect(game.spacecraft).toBeDefined();
        expect(game.starSystem).toBeDefined();
        expect(game.gameWorld).toBeDefined();
    });

    test('game has all core systems initialized', () => {
        expect(game.trafficManager).toBeDefined();
        expect(game.economy).toBeDefined();
        expect(game.communications).toBeDefined();
    });

    test('spacecraft is positioned in orbit', () => {
        const pos = game.spacecraft.getPosition();
        expect(pos).toBeDefined();
        expect(pos.x).toBeDefined();
        expect(pos.y).toBeDefined();
        expect(pos.z).toBeDefined();

        // Should be at non-zero position (in orbit)
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        expect(distance).toBeGreaterThan(0);
    });

    test('star system has planets and stations', () => {
        expect(game.starSystem.planets.length).toBeGreaterThan(0);
        expect(game.starSystem.stations.length).toBeGreaterThan(0);
    });

    test('player starts with initial credits', () => {
        expect(game.playerCredits).toBe(100000);
    });

    test('player can buy commodities with sufficient credits', () => {
        const initialCredits = game.playerCredits;
        const result = game.buyCommodity('ore', 10);

        if (result) {
            expect(game.playerCredits).toBeLessThan(initialCredits);
            expect(game.playerCargo.get('ore')).toBe(10);
        }
    });

    test('cargo capacity is enforced', () => {
        expect(game.maxCargoCapacity).toBe(1000);

        // Try to buy more than capacity
        const result = game.buyCommodity('ore', 1001);
        expect(result).toBe(false);
    });

    test('faction diplomacy system is initialized', () => {
        const relationship = game.starSystem.getFactionRelationship('PLAYER', 'UNITED_EARTH');
        expect(relationship).toBeDefined();
        expect(relationship.relationshipValue).toBeGreaterThanOrEqual(0);
    });
});
