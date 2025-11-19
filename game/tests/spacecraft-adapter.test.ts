/**
 * SpacecraftAdapter Tests
 * Tests the spacecraft integration layer
 */

import { SpacecraftAdapter } from '../src/spacecraft-adapter';

describe('SpacecraftAdapter', () => {
    let adapter: SpacecraftAdapter;

    beforeEach(() => {
        adapter = new SpacecraftAdapter();
    });

    test('initializes spacecraft systems', () => {
        expect(adapter.spacecraft).toBeDefined();
    });

    test('fuel valve controls work', () => {
        adapter.setFuelValve(true);
        const state = adapter.getMainEngineState();
        expect(state.fuelValveOpen).toBe(true);
    });

    test('throttle controls work', () => {
        adapter.setThrottle(75);
        const state = adapter.getMainEngineState();
        expect(state.throttle).toBeCloseTo(0.75);
    });

    test('door controls work', () => {
        const result = adapter.toggleDoorByDirection(2, 'forward');
        expect(typeof result).toBe('boolean');
    });

    test('getCompartmentDoors returns valid doors', () => {
        const doors = adapter.getCompartmentDoors(2);
        expect(Array.isArray(doors)).toBe(true);
        expect(doors.length).toBeGreaterThan(0);
    });
});
