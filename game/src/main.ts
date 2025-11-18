/**
 * Vector Moon Lander - Main Entry Point
 * Initializes the game and UI systems
 */

import { Game } from './game';
import { UIManager } from './ui/ui-manager';
import { InputManager } from './input';

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const loadingEl = document.getElementById('loading')!;
    const statusEl = document.getElementById('loadingStatus')!;

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Set canvas size
    canvas.width = 1280;
    canvas.height = 720;

    // Update loading status
    statusEl.textContent = 'Initializing spacecraft systems...';

    try {
        // Initialize game
        const game = new Game(canvas);
        const ui = new UIManager(canvas, game.spacecraft);
        const input = new InputManager();

        // Link input to game and UI
        input.setGame(game);
        input.onStationSwitch = (stationNum) => ui.setActiveStation(stationNum);
        input.onKeyPress = (key) => ui.handleInput(key);

        // Hide loading screen
        setTimeout(() => {
            loadingEl.style.display = 'none';

            // Start game loop
            game.start();

            // Print controls to console
            console.log('═══════════════════════════════════════');
            console.log('           CONTROLS REFERENCE          ');
            console.log('═══════════════════════════════════════');
            console.log('GAME CONTROLS:');
            console.log('  P           - Pause/Resume');
            console.log('  + / -       - Time acceleration');
            console.log('');
            console.log('CAMERA:');
            console.log('  C           - Cycle camera mode');
            console.log('  Mouse Wheel - Zoom in/out');
            console.log('');
            console.log('TARGETING:');
            console.log('  T           - Cycle through targets');
            console.log('  ESC         - Clear target');
            console.log('  F           - Fire weapons');
            console.log('');
            console.log('VIEW OPTIONS:');
            console.log('  O           - Toggle orbits');
            console.log('  L           - Toggle labels');
            console.log('  V           - Toggle velocity vectors');
            console.log('  G           - Toggle grid');
            console.log('  H           - Toggle HUD');
            console.log('');
            console.log('UI STATIONS:');
            console.log('  1-5         - Switch control stations');
            console.log('═══════════════════════════════════════');
        }, 1000);

        console.log('Vector Moon Lander initialized successfully');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        statusEl.textContent = 'ERROR: Failed to initialize. Check console.';
        statusEl.style.color = '#ff0000';
    }
});
