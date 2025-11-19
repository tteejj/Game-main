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

        // Initialize faction panel
        ui.setStarSystem(game.starSystem);

        // Link input to UI
        input.onStationSwitch = (stationNum) => ui.setActiveStation(stationNum);
        input.onKeyPress = (key) => ui.handleInput(key);

        // Pass game reference to UI for NPC updates
        (window as any).game = game;
        (window as any).ui = ui;

        // Hide loading screen
        setTimeout(() => {
            loadingEl.style.display = 'none';

            // Start game loop
            game.start();
        }, 1000);

        console.log('Vector Moon Lander initialized successfully');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        statusEl.textContent = 'ERROR: Failed to initialize. Check console.';
        statusEl.style.color = '#ff0000';
    }
});
