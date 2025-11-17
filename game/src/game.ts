/**
 * Main Game Class
 * Orchestrates game loop, physics simulation, and rendering
 */

import { SpacecraftAdapter } from './spacecraft-adapter';
import { StarSystem } from '../../universe-system/src/StarSystem';
import { Vector3 } from '../../universe-system/src/CelestialBody';

export class Game {
    private ctx: CanvasRenderingContext2D;
    private running: boolean = false;
    private lastFrameTime: number = 0;
    private fixedTimestep: number = 1 / 60; // 60 FPS

    // Game state
    private paused: boolean = false;

    // Spacecraft simulation
    public spacecraft: SpacecraftAdapter;

    // Universe
    public starSystem: StarSystem;

    constructor(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = ctx;

        // Set up canvas for crisp rendering
        this.ctx.imageSmoothingEnabled = false;

        // Create star system
        this.starSystem = new StarSystem('sol', 'Sol', {
            seed: 42,
            numPlanets: { min: 8, max: 8 },
            allowStations: true,
            allowHazards: true,
            civilizationLevel: 7
        });

        console.log(`🌟 Created ${this.starSystem.name} system`);
        console.log(`   Star: ${this.starSystem.star.starClass}-class`);
        console.log(`   Planets: ${this.starSystem.planets.length}`);
        console.log(`   Stations: ${this.starSystem.stations.length}`);

        // Initialize spacecraft and place in system
        this.spacecraft = new SpacecraftAdapter();

        // Place ship near first planet
        if (this.starSystem.planets.length > 0) {
            const planet = this.starSystem.planets[0];
            const orbitHeight = planet.physical.radius * 2;
            const startPos = {
                x: planet.position.x + orbitHeight,
                y: planet.position.y,
                z: planet.position.z
            };
            this.spacecraft.setPosition(startPos);
            console.log(`🚀 Ship placed near ${planet.name} at altitude ${(orbitHeight / 1000).toFixed(0)} km`);
        }

        console.log('Spacecraft initialized');
    }

    /**
     * Start the game loop
     */
    start(): void {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        this.running = false;
    }

    /**
     * Toggle pause
     */
    togglePause(): void {
        this.paused = !this.paused;
    }

    /**
     * Main game loop using requestAnimationFrame
     */
    private gameLoop = (): void => {
        if (!this.running) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;

        if (!this.paused) {
            // Update game state
            this.update(deltaTime);
        }

        // Render always (even when paused, to show pause screen)
        this.render();

        // Request next frame
        requestAnimationFrame(this.gameLoop);
    };

    /**
     * Update game state
     */
    private update(deltaTime: number): void {
        // Use fixed timestep for stability
        const dt = Math.min(deltaTime, this.fixedTimestep * 2); // Clamp to prevent spiral of death

        // Update star system (orbital mechanics)
        this.starSystem.update(dt);

        // Apply multi-body gravity to spacecraft
        this.applyGravity(dt);

        // Update spacecraft physics simulation
        this.spacecraft.update(dt);

        // Check collisions
        this.checkCollisions();
    }

    /**
     * Apply gravity from all celestial bodies
     */
    private applyGravity(deltaTime: number): void {
        const shipPos = this.spacecraft.getPosition();
        const nearbyBodies = this.starSystem.findBodiesInRadius(shipPos, 1e12); // Very large radius

        let totalGravity: Vector3 = { x: 0, y: 0, z: 0 };

        for (const body of nearbyBodies) {
            if (body.type === 'STATION') continue; // Stations too small

            const dx = body.position.x - shipPos.x;
            const dy = body.position.y - shipPos.y;
            const dz = body.position.z - shipPos.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            const dist = Math.sqrt(distSq);

            if (dist < body.physical.radius) continue; // Inside body

            // Gravitational acceleration: a = GM / r²
            const G = 6.674e-11;
            const accelMag = (G * body.physical.mass) / distSq;

            // Direction towards body
            totalGravity.x += (dx / dist) * accelMag;
            totalGravity.y += (dy / dist) * accelMag;
            totalGravity.z += (dz / dist) * accelMag;
        }

        // Apply gravity to ship
        this.spacecraft.applyGravity(totalGravity, deltaTime);
    }

    /**
     * Check for collisions with celestial bodies
     */
    private checkCollisions(): void {
        const shipPos = this.spacecraft.getPosition();

        for (const body of this.starSystem.getAllBodies()) {
            if (body.type === 'STATION') continue;

            const dx = body.position.x - shipPos.x;
            const dy = body.position.y - shipPos.y;
            const dz = body.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < body.physical.radius) {
                console.log(`💥 COLLISION with ${body.name}!`);
                this.paused = true;
            }
        }
    }

    /**
     * Render the current frame
     */
    private render(): void {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, 1280, 720);

        // UI will be rendered on top by UIManager
    }
}
