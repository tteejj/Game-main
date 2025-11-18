/**
 * INTEGRATED GAME SYSTEM
 * Complete space game with all systems working together:
 * - Spacecraft with full subsystems (helm, engineering, nav, life support, weapons)
 * - Universe with star systems, planets, moons, stations
 * - NPC traffic and collision avoidance
 * - Dynamic economy and trade
 * - Communications network
 * - Satellites and orbital mechanics
 * - Sensors and combat
 */

import { SpacecraftAdapter } from './spacecraft-adapter';
import { StarSystem } from '../../universe-system/src/StarSystem';
import { Vector3 } from '../../universe-system/src/CelestialBody';
import { TrafficManager } from '../../universe-system/src/npc-traffic/traffic-manager';
import { EconomicModel } from '../../universe-system/src/economy/economic-model';
import { CommunicationsManager } from '../../universe-system/src/communications/communications-manager';
import { GameWorld } from '../../physics-modules/src/game-world';

export class Game {
    private ctx: CanvasRenderingContext2D;
    private running: boolean = false;
    private lastFrameTime: number = 0;
    private fixedTimestep: number = 1 / 60; // 60 FPS
    private gameTime: number = 0;

    // Game state
    private paused: boolean = false;
    private timeAcceleration: number = 1.0; // 1x = real-time

    // Core systems
    public spacecraft: SpacecraftAdapter;
    public starSystem: StarSystem;
    public gameWorld: GameWorld;
    public trafficManager: TrafficManager;
    public economy: EconomicModel;
    public communications: CommunicationsManager;

    // Performance tracking
    private frameCount: number = 0;
    private fps: number = 0;
    private lastFpsUpdate: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;

        console.log('🎮 Initializing Integrated Game System...');

        // Create game world with all physics systems
        this.gameWorld = new GameWorld({
            createMoon: true,
            createAdvancedSatellites: true,
            createWaypoints: true,
            terrainSeed: 12345
        });
        console.log('✅ Game World initialized (terrain, satellites, orbital mechanics)');

        // Create star system
        this.starSystem = new StarSystem('sol', 'Sol System', {
            seed: 42,
            numPlanets: { min: 5, max: 8 },
            allowStations: true,
            allowHazards: true,
            civilizationLevel: 7
        });

        console.log(`✅ Star System created`);
        console.log(`   └─ Star: ${this.starSystem.star.name} (${this.starSystem.star.starClass}-class)`);
        console.log(`   └─ Planets: ${this.starSystem.planets.length}`);
        console.log(`   └─ Stations: ${this.starSystem.stations.length}`);
        console.log(`   └─ Satellites: ${this.gameWorld.satellites.getState().satellites.length}`);

        // Initialize spacecraft
        this.spacecraft = new SpacecraftAdapter();

        // Place ship in orbit around first planet
        this.placeShipInOrbit();

        // Initialize NPC traffic system
        this.trafficManager = new TrafficManager();
        this.spawnInitialTraffic();
        console.log('✅ NPC Traffic system initialized');

        // Initialize economy
        this.economy = new EconomicModel();
        this.setupEconomy();
        console.log('✅ Economy system initialized');

        // Initialize communications
        this.communications = new CommunicationsManager();
        this.setupCommunications();
        console.log('✅ Communications network initialized');

        console.log('🚀 All systems ready!');
    }

    /**
     * Place spacecraft in orbit around first planet
     */
    private placeShipInOrbit(): void {
        if (this.starSystem.planets.length > 0) {
            const planet = this.starSystem.planets[0];
            const orbitHeight = planet.physical.radius * 2; // 2x radius

            // Calculate orbital velocity for circular orbit
            const G = 6.674e-11;
            const r = planet.physical.radius + orbitHeight;
            const orbitalSpeed = Math.sqrt((G * planet.physical.mass) / r);

            const startPos: Vector3 = {
                x: planet.position.x + orbitHeight,
                y: planet.position.y,
                z: planet.position.z
            };

            const startVel: Vector3 = {
                x: 0,
                y: orbitalSpeed * 0.95, // Slightly elliptical
                z: 0
            };

            this.spacecraft.setPosition(startPos);
            // Note: Spacecraft adapter doesn't expose setVelocity, so ship will need to boost to orbital speed

            console.log(`✅ Ship placed near ${planet.name}`);
            console.log(`   └─ Altitude: ${(orbitHeight / 1000).toFixed(0)} km`);
            console.log(`   └─ Required orbital speed: ${(orbitalSpeed / 1000).toFixed(2)} km/s`);
        }
    }

    /**
     * Spawn initial NPC traffic
     */
    private spawnInitialTraffic(): void {
        if (this.starSystem.stations.length === 0 || this.starSystem.planets.length === 0) {
            return;
        }

        // Add traffic between stations and planets
        const numShips = 5 + Math.floor(Math.random() * 5); // 5-10 ships

        for (let i = 0; i < numShips; i++) {
            // Random position in system
            const angle = Math.random() * Math.PI * 2;
            const distance = 1e8 + Math.random() * 5e8; // 100M to 600M meters from center

            const position: Vector3 = {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                z: (Math.random() - 0.5) * distance * 0.1
            };

            const velocity: Vector3 = {
                x: (Math.random() - 0.5) * 1000,
                y: (Math.random() - 0.5) * 1000,
                z: (Math.random() - 0.5) * 100
            };

            this.trafficManager.addShip({
                id: `npc_${i}`,
                position,
                velocity,
                mass: 50000 + Math.random() * 200000,
                destination: this.starSystem.stations[Math.floor(Math.random() * this.starSystem.stations.length)].position,
                maxThrust: 100000,
                maxTurnRate: 0.1
            });
        }

        console.log(`   └─ Spawned ${numShips} NPC ships`);
    }

    /**
     * Setup economy for all stations
     */
    private setupEconomy(): void {
        for (const station of this.starSystem.stations) {
            this.economy.addMarket(station.id, {
                location: station.position,
                type: station.type === 'TRADE_HUB' ? 'trade_hub' :
                      station.type === 'MINING_OUTPOST' ? 'mining' :
                      station.type === 'REFINERY' ? 'refinery' : 'station',
                techLevel: station.techLevel,
                population: 1000 + Math.random() * 50000
            });
        }
        console.log(`   └─ Setup ${this.starSystem.stations.length} markets`);
    }

    /**
     * Setup communications relays
     */
    private setupCommunications(): void {
        // Add stations as communication relays
        for (const station of this.starSystem.stations) {
            this.communications.addRelay({
                id: station.id,
                position: station.position,
                power: 1000000, // 1MW transmission power
                range: 1e9, // 1 million km range
                frequency: 2.4e9 // 2.4 GHz
            });
        }

        // Add satellites from gameWorld as relays
        const satellites = this.gameWorld.getOperationalSatellites();
        for (const sat of satellites) {
            this.communications.addRelay({
                id: sat.id,
                position: sat.position,
                power: 100000, // 100kW
                range: 5e8, // 500k km
                frequency: 2.4e9
            });
        }

        console.log(`   └─ Setup ${this.starSystem.stations.length + satellites.length} communication relays`);
    }

    /**
     * Start the game loop
     */
    start(): void {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = performance.now();
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
        console.log(this.paused ? '⏸️  PAUSED' : '▶️  RESUMED');
    }

    /**
     * Adjust time acceleration
     */
    setTimeAcceleration(factor: number): void {
        this.timeAcceleration = Math.max(0.1, Math.min(10, factor));
        console.log(`⏱️  Time acceleration: ${this.timeAcceleration}x`);
    }

    /**
     * Main game loop
     */
    private gameLoop = (): void => {
        if (!this.running) return;

        const currentTime = performance.now();
        let deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        if (!this.paused) {
            // Apply time acceleration
            deltaTime *= this.timeAcceleration;

            // Use fixed timestep for stability
            const dt = Math.min(deltaTime, this.fixedTimestep * 2);

            this.update(dt);
        }

        this.render();
        requestAnimationFrame(this.gameLoop);
    };

    /**
     * Update all game systems
     */
    private update(deltaTime: number): void {
        this.gameTime += deltaTime;

        // Update game world (terrain, environment, satellites, orbital mechanics)
        this.gameWorld.update(deltaTime);

        // Update star system (planetary orbits, hazards)
        this.starSystem.update(deltaTime);

        // Apply multi-body gravity to spacecraft
        this.applyGravity(deltaTime);

        // Update spacecraft physics and all subsystems
        this.spacecraft.update(deltaTime);

        // Update NPC traffic (navigation, collision avoidance)
        this.updateTraffic(deltaTime);

        // Update economy (price fluctuations, supply/demand)
        this.economy.update(deltaTime);

        // Update communications network
        this.updateCommunications(deltaTime);

        // Check for collisions
        this.checkCollisions();

        // Update sensors and contacts
        this.updateSensors();
    }

    /**
     * Apply gravity from all celestial bodies
     */
    private applyGravity(deltaTime: number): void {
        const shipPos = this.spacecraft.getPosition();

        // Get nearby bodies from star system
        const nearbyBodies = this.starSystem.findBodiesInRadius(shipPos, 1e12);

        let totalGravity: Vector3 = { x: 0, y: 0, z: 0 };
        const G = 6.674e-11;

        for (const body of nearbyBodies) {
            if (body.type === 'STATION') continue; // Stations too small

            const dx = body.position.x - shipPos.x;
            const dy = body.position.y - shipPos.y;
            const dz = body.position.z - shipPos.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            const dist = Math.sqrt(distSq);

            if (dist < body.physical.radius) continue; // Inside body

            // Gravitational acceleration: a = GM / r²
            const accelMag = (G * body.physical.mass) / distSq;

            totalGravity.x += (dx / dist) * accelMag;
            totalGravity.y += (dy / dist) * accelMag;
            totalGravity.z += (dz / dist) * accelMag;
        }

        this.spacecraft.applyGravity(totalGravity, deltaTime);
    }

    /**
     * Update NPC traffic
     */
    private updateTraffic(deltaTime: number): void {
        const shipPos = this.spacecraft.getPosition();
        const shipVel = this.spacecraft.getVelocity();

        // Update NPC ships
        this.trafficManager.update(deltaTime, {
            playerPosition: shipPos,
            playerVelocity: shipVel,
            hazards: this.starSystem.hazards.getActiveHazards()
        });

        // Update NPC destinations (trade routes, etc)
        const ships = this.trafficManager.getAllShips();
        for (const ship of ships) {
            // Simple logic: if ship is near destination, pick new one
            const dx = ship.position.x - ship.destination.x;
            const dy = ship.position.y - ship.destination.y;
            const dz = ship.position.z - ship.destination.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 10000) { // Within 10km
                // Pick random new destination
                const stations = this.starSystem.stations;
                if (stations.length > 0) {
                    const newDest = stations[Math.floor(Math.random() * stations.length)];
                    ship.destination = newDest.position;
                }
            }
        }
    }

    /**
     * Update communications network
     */
    private updateCommunications(deltaTime: number): void {
        // Update relay positions from satellites
        const satellites = this.gameWorld.getOperationalSatellites();
        for (const sat of satellites) {
            this.communications.updateRelayPosition(sat.id, sat.position);
        }

        this.communications.update(deltaTime);
    }

    /**
     * Update sensor contacts
     */
    private updateSensors(): void {
        const shipPos = this.spacecraft.getPosition();
        const sensorState = this.spacecraft.getSensorTelemetry();

        // Get contacts from NPC traffic
        const npcShips = this.trafficManager.getAllShips();

        // Convert NPCs to radar contacts
        const radarContacts: any[] = [];
        const opticalContacts: any[] = [];
        const esmContacts: any[] = [];

        for (const npc of npcShips) {
            const dx = npc.position.x - shipPos.x;
            const dy = npc.position.y - shipPos.y;
            const dz = npc.position.z - shipPos.z;
            const range = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Check if within sensor range (simplified)
            if (range < 1e6) { // 1000 km
                const bearing = Math.atan2(dy, dx) * (180 / Math.PI);

                radarContacts.push({
                    id: npc.id,
                    range,
                    bearing,
                    classification: 'UNKNOWN',
                    rcs: 50 // Radar cross-section
                });

                // If close enough for optical
                if (range < 5e5) {
                    opticalContacts.push({
                        id: npc.id,
                        range,
                        bearing,
                        visualMagnitude: 2.0
                    });
                }
            }
        }

        // Add stations as contacts
        for (const station of this.starSystem.stations) {
            const dx = station.position.x - shipPos.x;
            const dy = station.position.y - shipPos.y;
            const dz = station.position.z - shipPos.z;
            const range = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (range < 1e7) { // 10,000 km
                const bearing = Math.atan2(dy, dx) * (180 / Math.PI);

                radarContacts.push({
                    id: station.id,
                    range,
                    bearing,
                    classification: 'STATION',
                    rcs: 1000
                });
            }
        }

        // Store contacts in spacecraft sensor system
        // (Note: This would require extending spacecraft-adapter to accept sensor data)
    }

    /**
     * Check for collisions
     */
    private checkCollisions(): void {
        const shipPos = this.spacecraft.getPosition();
        const shipState = this.spacecraft.getState();

        // Check collisions with celestial bodies
        for (const body of this.starSystem.getAllBodies()) {
            if (body.type === 'STATION') continue;

            const dx = body.position.x - shipPos.x;
            const dy = body.position.y - shipPos.y;
            const dz = body.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < body.physical.radius + 50) { // Ship size ~50m
                console.log(`💥 COLLISION with ${body.name}!`);
                console.log(`   └─ Impact speed: ${Math.sqrt(
                    shipState.velocity.x ** 2 +
                    shipState.velocity.y ** 2 +
                    shipState.velocity.z ** 2
                ).toFixed(0)} m/s`);
                this.paused = true;
            }
        }

        // Check collisions with NPCs
        const npcShips = this.trafficManager.getAllShips();
        for (const npc of npcShips) {
            const dx = npc.position.x - shipPos.x;
            const dy = npc.position.y - shipPos.y;
            const dz = npc.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 100) { // Collision threshold
                console.log(`💥 COLLISION with NPC ${npc.id}!`);
                this.paused = true;
            }
        }

        // Check proximity to stations for docking
        for (const station of this.starSystem.stations) {
            const dx = station.position.x - shipPos.x;
            const dy = station.position.y - shipPos.y;
            const dz = station.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 500 && dist > 450) {
                // In docking range - show hint
                // (Could trigger UI prompt)
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

        // Simple stats overlay (bottom-left corner)
        this.renderStats();

        // UI panels will be rendered on top by UIManager
    }

    /**
     * Render game stats
     */
    private renderStats(): void {
        const ctx = this.ctx;
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = '#00ff00';

        let y = this.ctx.canvas.height - 120;
        const x = 10;

        ctx.fillText(`FPS: ${this.fps}`, x, y);
        y += 15;
        ctx.fillText(`Time: ${this.gameTime.toFixed(1)}s (${this.timeAcceleration}x)`, x, y);
        y += 15;
        ctx.fillText(`NPCs: ${this.trafficManager.getAllShips().length}`, x, y);
        y += 15;
        ctx.fillText(`Stations: ${this.starSystem.stations.length}`, x, y);
        y += 15;
        ctx.fillText(`Satellites: ${this.gameWorld.satellites.getState().satellites.length}`, x, y);
        y += 15;
        ctx.fillText(`Markets: ${this.economy.getAllMarkets().length}`, x, y);
        y += 15;

        const shipPos = this.spacecraft.getPosition();
        const dist = Math.sqrt(shipPos.x ** 2 + shipPos.y ** 2 + shipPos.z ** 2);
        ctx.fillText(`Range: ${(dist / 1000).toFixed(0)} km`, x, y);
    }

    /**
     * Get complete game state
     */
    getState() {
        return {
            gameTime: this.gameTime,
            paused: this.paused,
            timeAcceleration: this.timeAcceleration,
            spacecraft: this.spacecraft.getState(),
            starSystem: {
                name: this.starSystem.name,
                bodies: this.starSystem.getAllBodies().length,
                stations: this.starSystem.stations.length
            },
            traffic: {
                ships: this.trafficManager.getAllShips().length
            },
            economy: {
                markets: this.economy.getAllMarkets().length
            },
            communications: {
                relays: this.communications.getRelayCount()
            }
        };
    }
}
