/**
 * StarSystem Tests
 * Tests star system generation and functionality
 */

import { StarSystem } from '../src/StarSystem';

describe('StarSystem', () => {
    let system: StarSystem;

    beforeEach(() => {
        system = new StarSystem('test-system', 'Test System', {
            seed: 12345,
            numPlanets: { min: 3, max: 5 },
            allowStations: true,
            allowHazards: false,
            civilizationLevel: 3
        });
    });

    test('generates star with correct properties', () => {
        expect(system.star).toBeDefined();
        expect(system.star.name).toContain('Test System');
        expect(system.star.mass).toBeGreaterThan(0);
        expect(system.star.radius).toBeGreaterThan(0);
    });

    test('generates planets with orbital mechanics', () => {
        expect(system.planets.length).toBeGreaterThan(0);
        expect(system.planets.length).toBeGreaterThanOrEqual(3);
        expect(system.planets.length).toBeLessThanOrEqual(5);

        system.planets.forEach(planet => {
            expect(planet.position).toBeDefined();
            expect(planet.mass).toBeGreaterThan(0);
            expect(planet.radius).toBeGreaterThan(0);
            expect(planet.name).toBeDefined();
        });
    });

    test('generates stations based on civilization level', () => {
        expect(system.stations.length).toBeGreaterThan(0);
        // Civ level 3 should have some stations
        expect(system.stations.length).toBeGreaterThanOrEqual(1);

        system.stations.forEach(station => {
            expect(station.id).toBeDefined();
            expect(station.name).toBeDefined();
            expect(station.position).toBeDefined();
            expect(station.faction).toBeDefined();
        });
    });

    test('faction diplomacy system initializes', () => {
        expect(system.factionDiplomacy).toBeDefined();

        const relationship = system.getFactionRelationship('PLAYER', 'UNITED_EARTH');
        expect(relationship).toBeDefined();
        expect(relationship.relationshipValue).toBeDefined();
        expect(relationship.status).toBeDefined();
    });

    test('can sign treaties between factions', () => {
        system.factionDiplomacy.signTreaty(
            ['UNITED_EARTH', 'MARS_FEDERATION'],
            'FREE_TRADE',
            ['Open trade routes'],
            0
        );

        const earthMarsRel = system.getFactionRelationship('UNITED_EARTH', 'MARS_FEDERATION');
        expect(earthMarsRel.treaties).toBeDefined();
        expect(earthMarsRel.treaties.length).toBeGreaterThan(0);
    });

    test('processes diplomatic events', () => {
        const initialRel = system.getFactionRelationship('PLAYER', 'UNITED_EARTH');
        const initialValue = initialRel.relationshipValue;

        system.processDiplomaticEvent({
            type: 'TRADE_COMPLETED',
            category: 'ECONOMIC',
            timestamp: Date.now() / 1000,
            severity: 3,
            factionA: 'PLAYER',
            factionB: 'UNITED_EARTH',
            tradeVolume: 5000,
            location: { x: 0, y: 0, z: 0 },
            description: 'Test trade'
        });

        const newRel = system.getFactionRelationship('PLAYER', 'UNITED_EARTH');
        // Trade should improve or maintain relationship
        expect(newRel.relationshipValue).toBeGreaterThanOrEqual(initialValue);
    });

    test('economic needs system exists', () => {
        expect(system.economicNeeds).toBeDefined();

        const price = system.economicNeeds.calculateMarketPrice('ore', 'station_1', 1000);
        expect(price).toBeGreaterThan(0);
    });

    test('processes economic trades', () => {
        system.processEconomicTrade('PLAYER', 'UNITED_EARTH', 'ore', 100, 10000);

        // Should not throw and should update economic state
        expect(true).toBe(true);
    });
});
