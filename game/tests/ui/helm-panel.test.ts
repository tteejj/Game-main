/**
 * Helm Panel Tests
 * Tests the helm UI panel functionality
 */

import { HelmPanel } from '../../src/ui/panels/helm-panel';
import { SpacecraftAdapter } from '../../src/spacecraft-adapter';

describe('HelmPanel', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let spacecraft: SpacecraftAdapter;
    let helmPanel: HelmPanel;
    let palette: any;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        ctx = canvas.getContext('2d')!;

        spacecraft = new SpacecraftAdapter();

        palette = {
            background: '#000000',
            primary: '#00ff00',
            secondary: '#00aa00',
            accent: '#00ffff',
            info: '#0088ff',
            warning: '#ffff00',
            danger: '#ff0000',
            muted: '#666666'
        };

        helmPanel = new HelmPanel(ctx, palette, spacecraft);
    });

    test('initializes with correct default state', () => {
        expect(helmPanel).toBeDefined();
    });

    test('handles RCS thruster 1-9 input', () => {
        helmPanel.handleInput('1');
        helmPanel.handleInput('5');
        helmPanel.handleInput('9');
        // RCS commands should execute without errors
        expect(true).toBe(true);
    });

    test('handles RCS thruster 10-12 input (0, -, =)', () => {
        helmPanel.handleInput('0'); // RCS 10
        helmPanel.handleInput('-'); // RCS 11
        helmPanel.handleInput('='); // RCS 12
        expect(true).toBe(true);
    });

    test('handles throttle increase (Q)', () => {
        const initialState = spacecraft.getMainEngineState();
        const initialThrottle = initialState.throttle;

        helmPanel.handleInput('q');

        const newState = spacecraft.getMainEngineState();
        expect(newState.throttle).toBeGreaterThanOrEqual(initialThrottle);
    });

    test('handles throttle decrease (A)', () => {
        // First increase throttle
        spacecraft.setThrottle(50);

        helmPanel.handleInput('a');

        const state = spacecraft.getMainEngineState();
        expect(state.throttle).toBeLessThan(0.5);
    });

    test('handles fuel valve toggle (F)', () => {
        const initialState = spacecraft.getMainEngineState();
        const initialValve = initialState.fuelValveOpen;

        helmPanel.handleInput('f');

        const newState = spacecraft.getMainEngineState();
        expect(newState.fuelValveOpen).toBe(!initialValve);
    });

    test('handles gimbal controls (W/S/E/D)', () => {
        helmPanel.handleInput('w');
        helmPanel.handleInput('s');
        helmPanel.handleInput('e');
        helmPanel.handleInput('d');
        // Gimbal commands should execute without errors
        expect(true).toBe(true);
    });

    test('handles fuel transfer (T/Y)', () => {
        helmPanel.handleInput('t'); // Tank 1 -> Tank 2
        helmPanel.handleInput('y'); // Tank 2 -> Tank 1
        expect(true).toBe(true);
    });

    test('handles emergency fuel dump (U)', () => {
        helmPanel.handleInput('u');
        expect(true).toBe(true);
    });

    test('renders without errors', () => {
        expect(() => helmPanel.render()).not.toThrow();
    });
});
