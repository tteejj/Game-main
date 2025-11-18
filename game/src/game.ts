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
import { NPCShip, ShipType } from '../../universe-system/src/npc-traffic/npc-ship';
import { Vector3 as Vector3Class } from '../../physics-modules/src/Vector3';
import { EconomicModel } from '../../universe-system/src/economy/economic-model';
import { CommunicationsManager } from '../../universe-system/src/communications/communications-manager';
import { RelayNetwork, NetworkNode } from '../../universe-system/src/communications/relay-network';
import { GameWorld } from '../../physics-modules/src/game-world';
import { Camera, CameraMode } from './camera';
import { SpaceRenderer } from './renderer';
import { HUDRenderer } from './hud';

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
    public trafficManager: TrafficManager<NPCShip>;
    public economy: EconomicModel;
    public communications: CommunicationsManager;
    private commNetwork: RelayNetwork;
    private markets: Map<string, any> = new Map();

    // Rendering systems
    public camera: Camera;
    private renderer: SpaceRenderer;
    private hud: HUDRenderer;

    // Targeting
    private targetedObject: string | null = null;

    // Simple mission tracking
    private currentMissionObjective: string | null = null;
    private currentMissionTarget: Vector3 | null = null;

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
        this.trafficManager = new TrafficManager<NPCShip>(100000, 100); // 100km cells, max 100 vessels
        this.spawnInitialTraffic();
        console.log('✅ NPC Traffic system initialized');

        // Initialize economy
        this.economy = new EconomicModel();
        this.setupEconomy();
        console.log('✅ Economy system initialized');

        // Initialize communications network
        this.commNetwork = new RelayNetwork();
        this.communications = new CommunicationsManager(this.commNetwork);
        this.setupCommunications();
        console.log('✅ Communications network initialized');

        // Initialize camera and rendering systems
        this.camera = new Camera(canvas.width, canvas.height);
        this.camera.setMode(CameraMode.FOLLOW_SHIP);
        this.camera.setTarget(this.spacecraft.getPosition());
        this.camera.adjustZoom(0.5); // Start zoomed out
        this.renderer = new SpaceRenderer(canvas, this.camera);
        this.hud = new HUDRenderer(canvas, this.camera);
        console.log('✅ Rendering systems initialized');

        // Generate initial mission
        this.generateMission();
        console.log('✅ Mission objectives generated');

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
        const shipTypes: ShipType[] = [ShipType.CARGO_FREIGHTER, ShipType.CARGO_SHUTTLE, ShipType.PATROL_SHIP, ShipType.MINING_VESSEL];

        for (let i = 0; i < numShips; i++) {
            // Random position in system
            const angle = Math.random() * Math.PI * 2;
            const distance = 1e8 + Math.random() * 5e8; // 100M to 600M meters from center

            const position = new Vector3Class(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance,
                (Math.random() - 0.5) * distance * 0.1
            );

            const velocity = new Vector3Class(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 100
            );

            const shipType = shipTypes[Math.floor(Math.random() * shipTypes.length)];
            const ship = new NPCShip(
                `npc_${i}`,
                `Traffic-${i}`,
                shipType,
                position,
                velocity
            );

            this.trafficManager.addVessel(ship);
        }

        console.log(`   └─ Spawned ${numShips} NPC ships`);
    }

    /**
     * Setup economy for all stations
     */
    private setupEconomy(): void {
        // Store markets locally since EconomicModel is only a pricing calculator
        for (const station of this.starSystem.stations) {
            const market = {
                id: station.id,
                stationId: station.id,
                location: station.position,
                type: this.getMarketType(station.stationType),
                techLevel: Math.floor((station.economy?.wealthLevel || 0.5) * 10), // Convert wealthLevel (0-1) to techLevel (0-10)
                population: station.population,
                commodities: new Map() // Empty for now, can be populated later
            };
            this.markets.set(station.id, market);
        }
        console.log(`   └─ Setup ${this.starSystem.stations.length} markets`);
    }

    /**
     * Convert StationType to market type string
     */
    private getMarketType(stationType: any): string {
        const typeMap: Record<string, string> = {
            'TRADING_HUB': 'trade_hub',
            'MINING_PLATFORM': 'mining',
            'FUEL_DEPOT': 'refinery',
            'SHIPYARD': 'shipyard',
            'RESEARCH_FACILITY': 'research'
        };
        return typeMap[stationType] || 'station';
    }

    /**
     * Setup communications relays
     */
    private setupCommunications(): void {
        // Add stations as communication relays
        for (const station of this.starSystem.stations) {
            const node: NetworkNode = {
                id: station.id,
                position: new Vector3Class(station.position.x, station.position.y, station.position.z),
                transmitPower: 1000000, // 1MW transmission power
                antenna: {
                    gain: 20, // 20 dBi gain
                    frequency: 2.4e9 // 2.4 GHz
                },
                maxConnections: 50,
                isRelay: true
            };
            this.commNetwork.addNode(node);
        }

        // Add satellites from gameWorld as relays
        const satellites = this.gameWorld.getOperationalSatellites();
        for (const sat of satellites) {
            const satPos = sat.orbitalBody.position;
            const node: NetworkNode = {
                id: sat.name,
                position: new Vector3Class(satPos.x, satPos.y, satPos.z),
                transmitPower: 100000, // 100kW
                antenna: {
                    gain: 15, // 15 dBi gain
                    frequency: 2.4e9 // 2.4 GHz
                },
                maxConnections: 20,
                isRelay: true
            };
            this.commNetwork.addNode(node);
        }

        console.log(`   └─ Setup ${this.starSystem.stations.length + satellites.length} communication relays`);
    }

    /**
     * Generate a new mission
     */
    private generateMission(): void {
        const missionTypes = ['RENDEZVOUS', 'ORBIT', 'EXPLORATION', 'SURVEY'];
        const type = missionTypes[Math.floor(Math.random() * missionTypes.length)];

        if (type === 'RENDEZVOUS' && this.starSystem.stations.length > 0) {
            const station = this.starSystem.stations[Math.floor(Math.random() * this.starSystem.stations.length)];
            this.currentMissionTarget = station.position;
            this.currentMissionObjective = `Dock with ${station.name}`;
        } else if (type === 'ORBIT' && this.starSystem.planets.length > 0) {
            const planet = this.starSystem.planets[Math.floor(Math.random() * this.starSystem.planets.length)];
            this.currentMissionTarget = planet.position;
            this.currentMissionObjective = `Establish orbit around ${planet.name}`;
        } else if (type === 'EXPLORATION') {
            this.currentMissionObjective = `Explore the system and scan anomalies`;
            this.currentMissionTarget = null;
        } else {
            this.currentMissionObjective = `Survey nearby celestial bodies`;
            this.currentMissionTarget = null;
        }
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

        // Economy is passive (pricing calculator), no update needed

        // Update communications network
        this.updateCommunications(deltaTime);

        // Check for collisions
        this.checkCollisions();

        // Update sensors and contacts
        this.updateSensors();

        // Update camera
        const shipPos = this.spacecraft.getPosition();
        const shipState = this.spacecraft.getState();
        const shipVel = shipState.velocity;
        this.camera.update(deltaTime, shipPos, shipVel);
        this.camera.setTarget(shipPos);
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
        // Update NPC ships
        this.trafficManager.update(deltaTime);

        // Update NPC destinations (trade routes, etc)
        const ships = this.trafficManager.getAllVessels();
        for (const ship of ships) {
            // Simple logic: if ship is near destination, pick new one
            const currentWaypoint = ship.getNavigator().getCurrentWaypoint();
            if (currentWaypoint) {
                const destination = currentWaypoint.position;
                const dx = ship.position.x - destination.x;
                const dy = ship.position.y - destination.y;
                const dz = ship.position.z - destination.z; // Fixed typo: was ship.destination.z - ship.destination.z
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < 10000) { // Within 10km
                    // Pick random new destination
                    const stations = this.starSystem.stations;
                    if (stations.length > 0) {
                        const newDest = stations[Math.floor(Math.random() * stations.length)];
                        ship.setDestination(
                            new Vector3Class(newDest.position.x, newDest.position.y, newDest.position.z),
                            newDest.name
                        );
                    }
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
            const node = this.commNetwork.getNode(sat.name);
            if (node) {
                const satPos = sat.orbitalBody.position;
                node.position = new Vector3Class(satPos.x, satPos.y, satPos.z);
            }
        }

        // Periodically rebuild network topology to account for moving satellites
        this.commNetwork.updateTopology();

        this.communications.update(deltaTime);
    }

    /**
     * Update sensor contacts
     */
    private updateSensors(): void {
        const shipPos = this.spacecraft.getPosition();

        // Get contacts from NPC traffic
        const npcShips = this.trafficManager.getAllVessels();

        // Convert NPCs to radar contacts
        const radarContacts: any[] = [];
        const opticalContacts: any[] = [];

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
        const npcShips = this.trafficManager.getAllVessels();
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
        const shipState = this.spacecraft.getState();
        const shipPos = this.spacecraft.getPosition();

        // Render 3D space
        this.renderer.render(
            this.starSystem,
            this.gameWorld,
            this.trafficManager.getAllVessels(),
            {
                position: shipPos,
                velocity: shipState.velocity
            }
        );

        // Render HUD overlay
        const targetData = this.getTargetData();

        // Calculate mission progress if we have a target
        let missionProgress: number | undefined = undefined;
        if (this.currentMissionTarget) {
            const dx = this.currentMissionTarget.x - shipPos.x;
            const dy = this.currentMissionTarget.y - shipPos.y;
            const dz = this.currentMissionTarget.z - shipPos.z;
            const distanceToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const maxDistance = 1e9; // 1 million km
            missionProgress = Math.max(0, Math.min(1, 1 - (distanceToTarget / maxDistance)));
        }

        this.hud.render({
            position: shipPos,
            velocity: shipState.velocity,
            fuel: (shipState.fuel / shipState.fuelCapacity) * 100,
            power: (shipState.power / shipState.powerCapacity) * 100,
            health: shipState.hullIntegrity,
            targetName: targetData?.name,
            targetDistance: targetData?.distance,
            targetVelocity: targetData?.velocity,
            fps: this.fps,
            gameTime: this.gameTime,
            timeAcceleration: this.timeAcceleration,
            missionObjective: this.currentMissionObjective || undefined,
            missionProgress,
            npcCount: this.trafficManager.getAllVessels().length,
            stationCount: this.starSystem.stations.length
        });

        // UI panels will be rendered on top by UIManager
    }

    /**
     * Get data about currently targeted object
     */
    private getTargetData(): { name: string, distance: number, velocity: Vector3 } | null {
        if (!this.targetedObject) return null;

        const shipPos = this.spacecraft.getPosition();

        // Check if target is an NPC
        const npc = this.trafficManager.getAllVessels().find(v => v.id === this.targetedObject);
        if (npc) {
            const dx = npc.position.x - shipPos.x;
            const dy = npc.position.y - shipPos.y;
            const dz = npc.position.z - shipPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            return {
                name: npc.name,
                distance,
                velocity: { x: npc.velocity.x, y: npc.velocity.y, z: npc.velocity.z }
            };
        }

        // Check if target is a celestial body
        const body = this.starSystem.getAllBodies().find(b => b.id === this.targetedObject);
        if (body) {
            const dx = body.position.x - shipPos.x;
            const dy = body.position.y - shipPos.y;
            const dz = body.position.z - shipPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            return {
                name: body.name,
                distance,
                velocity: { x: 0, y: 0, z: 0 } // Celestial bodies move slowly relative to frame
            };
        }

        return null;
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
                ships: this.trafficManager.getAllVessels().length
            },
            economy: {
                markets: this.markets.size
            },
            communications: {
                relays: this.commNetwork.getNodeCount()
            }
        };
    }

    // ========== PUBLIC CONTROL METHODS ==========

    /**
     * Cycle camera mode
     */
    cycleCameraMode(): void {
        const modes = [CameraMode.FOLLOW_SHIP, CameraMode.CHASE_CAM, CameraMode.FREE_CAM, CameraMode.ORBIT_TARGET];
        const currentIndex = modes.indexOf(this.camera.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.camera.setMode(modes[nextIndex]);
        console.log(`📷 Camera mode: ${modes[nextIndex]}`);
    }

    /**
     * Adjust camera zoom
     */
    zoomCamera(delta: number): void {
        this.camera.adjustZoom(delta);
    }

    /**
     * Cycle through nearby targets
     */
    cycleTarget(): void {
        const shipPos = this.spacecraft.getPosition();
        const allObjects: Array<{ id: string, name: string, position: Vector3 }> = [];

        // Add NPCs
        for (const npc of this.trafficManager.getAllVessels()) {
            allObjects.push({
                id: npc.id,
                name: npc.name,
                position: { x: npc.position.x, y: npc.position.y, z: npc.position.z }
            });
        }

        // Add celestial bodies and stations
        for (const body of this.starSystem.getAllBodies()) {
            allObjects.push({
                id: body.id,
                name: body.name,
                position: body.position
            });
        }

        // Sort by distance
        allObjects.sort((a, b) => {
            const distA = Math.sqrt(
                (a.position.x - shipPos.x) ** 2 +
                (a.position.y - shipPos.y) ** 2 +
                (a.position.z - shipPos.z) ** 2
            );
            const distB = Math.sqrt(
                (b.position.x - shipPos.x) ** 2 +
                (b.position.y - shipPos.y) ** 2 +
                (b.position.z - shipPos.z) ** 2
            );
            return distA - distB;
        });

        // Find current target index
        let currentIndex = -1;
        if (this.targetedObject) {
            currentIndex = allObjects.findIndex(obj => obj.id === this.targetedObject);
        }

        // Cycle to next
        if (allObjects.length > 0) {
            const nextIndex = (currentIndex + 1) % allObjects.length;
            this.targetedObject = allObjects[nextIndex].id;
            this.renderer.setSelectedObject(this.targetedObject);
            console.log(`🎯 Target: ${allObjects[nextIndex].name}`);
        }
    }

    /**
     * Clear current target
     */
    clearTarget(): void {
        this.targetedObject = null;
        this.renderer.setSelectedObject(null);
        console.log('🎯 Target cleared');
    }

    /**
     * Toggle rendering options
     */
    toggleOrbits(): void {
        this.renderer.toggleOrbits();
        console.log('🔄 Toggled orbit display');
    }

    toggleLabels(): void {
        this.renderer.toggleLabels();
        console.log('🏷️  Toggled labels');
    }

    toggleVelocityVectors(): void {
        this.renderer.toggleVelocityVectors();
        console.log('➡️  Toggled velocity vectors');
    }

    toggleGrid(): void {
        this.renderer.toggleGrid();
        console.log('📐 Toggled reference grid');
    }

    toggleHUD(): void {
        this.hud.toggleHUD();
        console.log('📊 Toggled HUD');
    }

    /**
     * Fire weapons at target
     */
    fireWeapons(): void {
        if (!this.targetedObject) {
            console.log('⚠️  No target selected');
            return;
        }

        const targetData = this.getTargetData();
        if (!targetData) return;

        console.log(`🔫 Firing weapons at ${targetData.name} (${(targetData.distance / 1000).toFixed(1)} km)`);

        // TODO: Implement actual weapon firing logic
        // For now, just log
    }
}
