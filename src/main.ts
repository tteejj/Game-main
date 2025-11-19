/**
 * Main Entry Point - Space Trader Simulator
 * Integrated player interaction systems with canvas-based UI
 */

import { Renderer } from './core/renderer';
import { SpaceGame } from './game/SpaceGame';

// Initialize and start the game
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  console.log('Initializing Space Trader Simulator...');

  const renderer = new Renderer({
    canvas,
    palette: 'green',
    enableScanlines: true,
    enableGlow: true
  });

  const game = new SpaceGame(renderer);
  game.start();

  console.log('Game started! Press H for help.');
});
