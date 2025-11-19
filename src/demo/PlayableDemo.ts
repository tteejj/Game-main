/**
 * PlayableDemo - A runnable demo of the player interaction systems
 * Run this to actually play the game in a terminal
 */

import { PlayerGameLoop } from '../game/PlayerGameLoop';
import { Spacecraft } from '../../physics-modules/src/spacecraft';
import { UniverseOrchestrator } from '../../universe-system/src/UniverseOrchestrator';
import { StarSystem } from '../../universe-system/src/StarSystem';
import { StationGenerator } from '../../universe-system/src/StationGenerator';

export class PlayableDemo {
  private gameLoop: PlayerGameLoop;
  private isRunning = false;
  private frameInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize universe
    console.log('Initializing universe...');
    const orchestrator = new UniverseOrchestrator();

    // Create starting system
    const startSystem = this.createStartingSystem();

    // Create player spacecraft
    const playerShip = new Spacecraft(
      'Player Ship',
      10000, // mass
      { x: 0, y: 0, z: 0 }, // position
      { x: 0, y: 0, z: 0 }  // velocity
    );

    // Initialize game loop
    this.gameLoop = new PlayerGameLoop(playerShip, orchestrator, startSystem);

    console.log('Universe initialized!');
    console.log('Starting game...\n');
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.clear();
    console.log('='.repeat(80));
    console.log('SPACE TRADER SIMULATOR - PLAYER INTERACTION DEMO');
    console.log('='.repeat(80));
    console.log('');
    console.log('Welcome, Commander!');
    console.log('');
    console.log('You are a spaceship captain in a living, breathing universe.');
    console.log('Trade, fight, explore, and build your reputation.');
    console.log('');
    console.log('Press H at any time for help.');
    console.log('Press Q to quit.');
    console.log('');
    console.log('Starting in 3 seconds...');

    setTimeout(() => {
      this.startGameLoop();
    }, 3000);
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    this.isRunning = false;
    console.log('\nGame stopped. Thanks for playing!');
  }

  /**
   * Main game loop
   */
  private startGameLoop(): void {
    // Run at 30 FPS (for demo purposes)
    const fps = 30;
    const frameDuration = 1000 / fps;

    this.frameInterval = setInterval(() => {
      this.gameLoop.update();
      this.renderFrame();
    }, frameDuration);
  }

  /**
   * Render current frame
   */
  private renderFrame(): void {
    // Clear console
    console.clear();

    // Render game
    const output = this.gameLoop.render();
    console.log(output);
  }

  /**
   * Create the starting star system with a station
   */
  private createStartingSystem(): StarSystem {
    const system: StarSystem = {
      id: 'sol',
      name: 'Sol System',
      position: { x: 0, y: 0, z: 0 },
      star: {
        type: 'G2V',
        mass: 1.989e30,
        radius: 696340,
        temperature: 5778,
        luminosity: 3.828e26
      },
      planets: [],
      stations: [],
      pointsOfInterest: [],
      economicActivity: 1.0,
      politicalStability: 0.8,
      militaryPresence: 0.5,
      controllingFaction: 'Trade Federation'
    };

    // Add a starting station
    const stationGen = new StationGenerator();
    const station = stationGen.generateStation('Gateway Station', 'Trade Federation', 'TRADING_HUB');
    station.position = { x: 1000, y: 0, z: 0 }; // 1km away
    system.stations = [station];

    return system;
  }
}

// If running directly (node PlayableDemo.js)
if (require.main === module) {
  const demo = new PlayableDemo();
  demo.start();

  // Handle quit
  process.on('SIGINT', () => {
    demo.stop();
    process.exit(0);
  });
}

export default PlayableDemo;
