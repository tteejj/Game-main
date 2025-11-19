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

    // Background event tracking
    private lastBackgroundEventTime: number = 0;

    // Player economy
    public playerCredits: number = 100000; // Start with 100k credits
    public playerCargo: Map<string, number> = new Map(); // commodity -> quantity
    public readonly maxCargoCapacity: number = 1000; // Max 1000 units total

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

        // Initialize faction diplomacy with starting relationships
        this.initializeDiplomacy();
        console.log('✅ Faction diplomacy initialized');

        console.log('🚀 All systems ready!');
    }

    /**
     * Initialize faction diplomacy with starting relationships
     */
    private initializeDiplomacy(): void {
        // Set up some trade agreements
        this.starSystem.factionDiplomacy.signTreaty(
            ['UNITED_EARTH', 'MARS_FEDERATION'],
            'FREE_TRADE',
            ['Open trade routes', 'No tariffs on basic goods'],
            0  // Permanent
        );

        this.starSystem.factionDiplomacy.signTreaty(
            ['BELT_ALLIANCE', 'INDEPENDENT'],
            'NON_AGGRESSION_PACT',
            ['No military action', 'Respect territorial boundaries'],
            0
        );

        // Start player as neutral with everyone except UNITED_EARTH (cordial)
        const playerEarth = this.starSystem.getFactionRelationship('PLAYER', 'UNITED_EARTH');
        playerEarth.relationshipValue = 30;  // Cordial
        playerEarth.status = 'CORDIAL';

        // Set up some existing tensions
        const earthBelt = this.starSystem.getFactionRelationship('UNITED_EARTH', 'BELT_ALLIANCE');
        earthBelt.relationshipValue = -40;  // Tense
        earthBelt.status = 'TENSE';
        earthBelt.territorialDisputes = 3;  // Disputed asteroid claims

        console.log('  └─ Created 2 treaties');
        console.log('  └─ Set initial faction standings');
    }

    /**
     * Process successful docking with nearest station/NPC
     * Improves diplomatic relations through peaceful cooperation
     */
    public processDockingSuccess(): void {
        const shipPos = this.spacecraft.getPosition();

        // Find nearest station
        let nearestStation = null;
        let nearestDist = Infinity;
        for (const station of this.starSystem.stations) {
            const dx = station.position.x - shipPos.x;
            const dy = station.position.y - shipPos.y;
            const dz = station.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestStation = station;
            }
        }

        // If within docking range, process diplomatic event
        if (nearestStation && nearestDist < 1000) {
            const stationFaction = nearestStation.faction || 'INDEPENDENT';

            this.starSystem.processDiplomaticEvent({
                type: 'DOCKING_COMPLETED',
                category: 'ECONOMIC',
                timestamp: Date.now() / 1000,
                severity: 2,
                factionA: 'PLAYER',
                factionB: stationFaction,
                location: shipPos,
                description: `Player successfully docked at ${nearestStation.name}`
            });

            console.log(`🔗 Docked with ${nearestStation.name} (${stationFaction})`);
        }
    }

    /**
     * Process trade transaction
     * Improves diplomatic relations through economic cooperation
     */
    public processTradeTransaction(value: number, commodity?: string): void {
        const shipPos = this.spacecraft.getPosition();

        // Find nearest station
        let nearestStation = null;
        let nearestDist = Infinity;
        for (const station of this.starSystem.stations) {
            const dx = station.position.x - shipPos.x;
            const dy = station.position.y - shipPos.y;
            const dz = station.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestStation = station;
            }
        }

        // If within trading range, process diplomatic event
        if (nearestStation && nearestDist < 1000) {
            const stationFaction = nearestStation.faction || 'INDEPENDENT';

            this.starSystem.processDiplomaticEvent({
                type: 'TRADE_COMPLETED',
                category: 'ECONOMIC',
                timestamp: Date.now() / 1000,
                severity: Math.min(5, Math.floor(value / 1000)),
                factionA: 'PLAYER',
                factionB: stationFaction,
                tradeVolume: value,
                location: shipPos,
                description: commodity ? `Traded ${commodity} worth ${value} credits` : `Trade worth ${value} credits`
            });

            console.log(`💰 Trade completed with ${nearestStation.name} (${stationFaction}): ${value} credits`);
        }
    }

    /**
     * Buy commodity from nearest station
     */
    public buyCommodity(commodity: string, quantity: number): boolean {
        // Get market price
        const marketPrice = this.starSystem.economicNeeds.calculateMarketPrice(
            commodity,
            'station_1',
            this.getBasePriceFor(commodity)
        );

        const totalCost = marketPrice * quantity;

        // Check if player has enough credits
        if (this.playerCredits < totalCost) {
            console.log(`❌ Not enough credits! Need ${totalCost.toFixed(0)}, have ${this.playerCredits.toFixed(0)}`);
            return false;
        }

        // Check if player has cargo space
        const currentCargo = Array.from(this.playerCargo.values()).reduce((sum, qty) => sum + qty, 0);
        if (currentCargo + quantity > this.maxCargoCapacity) {
            console.log(`❌ Not enough cargo space! Need ${quantity}, have ${this.maxCargoCapacity - currentCargo} free`);
            return false;
        }

        // Execute purchase
        this.playerCredits -= totalCost;
        const current = this.playerCargo.get(commodity) || 0;
        this.playerCargo.set(commodity, current + quantity);

        // Fire trade event
        this.processTradeTransaction(totalCost, commodity);

        // Update economy
        const stationFaction = this.getNearestStationFaction();
        this.starSystem.processEconomicTrade('PLAYER', stationFaction, commodity, quantity, totalCost);

        console.log(`✅ Bought ${quantity} ${commodity} for ${totalCost.toFixed(0)} credits (${this.playerCredits.toFixed(0)} remaining)`);
        return true;
    }

    /**
     * Sell commodity to nearest station
     */
    public sellCommodity(commodity: string, quantity: number): boolean {
        // Check if player has commodity
        const playerHas = this.playerCargo.get(commodity) || 0;
        if (playerHas < quantity) {
            console.log(`❌ Not enough ${commodity}! Have ${playerHas}, trying to sell ${quantity}`);
            return false;
        }

        // Get market price (sell at 80% of buy price)
        const marketPrice = this.starSystem.economicNeeds.calculateMarketPrice(
            commodity,
            'station_1',
            this.getBasePriceFor(commodity)
        );
        const sellPrice = marketPrice * 0.8;
        const totalValue = sellPrice * quantity;

        // Execute sale
        this.playerCredits += totalValue;
        this.playerCargo.set(commodity, playerHas - quantity);

        // Fire trade event
        this.processTradeTransaction(totalValue, commodity);

        // Update economy
        const stationFaction = this.getNearestStationFaction();
        this.starSystem.processEconomicTrade(stationFaction, 'PLAYER', commodity, quantity, totalValue);

        console.log(`✅ Sold ${quantity} ${commodity} for ${totalValue.toFixed(0)} credits (${this.playerCredits.toFixed(0)} total)`);
        return true;
    }

    /**
     * Get base price for commodity
     */
    private getBasePriceFor(commodity: string): number {
        const basePrices: Record<string, number> = {
            'FOOD': 100,
            'WATER': 50,
            'FUEL': 200,
            'ELECTRONICS': 500,
            'WEAPONS': 1000,
            'MEDICINE': 300
        };
        return basePrices[commodity] || 100;
    }

    /**
     * Get nearest station faction
     */
    private getNearestStationFaction(): string {
        const shipPos = this.spacecraft.getPosition();
        let nearestStation = null;
        let nearestDist = Infinity;

        for (const station of this.starSystem.stations) {
            const dx = station.position.x - shipPos.x;
            const dy = station.position.y - shipPos.y;
            const dz = station.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestStation = station;
            }
        }

        return nearestStation?.faction || 'INDEPENDENT';
    }

    /**
     * Process player rescuing/assisting a distressed NPC
     * Significantly improves diplomatic relations
     */
    public processRescue(npcShip: any, assistanceType: 'REPAIR' | 'REFUEL' | 'TOW'): void {
        const shipPos = this.spacecraft.getPosition();

        // Apply assistance based on type
        let assistanceValue = 0;
        let description = '';

        switch (assistanceType) {
            case 'REPAIR':
                npcShip.repair(0.3); // Repair 30% hull
                assistanceValue = 30;
                description = `Player repaired ${npcShip.name}`;
                console.log(`🔧 Repaired ${npcShip.name} (${npcShip.faction})`);
                break;
            case 'REFUEL':
                npcShip.refuel(0.5); // Refuel 50%
                assistanceValue = 20;
                description = `Player refueled ${npcShip.name}`;
                console.log(`⛽ Refueled ${npcShip.name} (${npcShip.faction})`);
                break;
            case 'TOW':
                assistanceValue = 40;
                description = `Player towed ${npcShip.name} to safety`;
                console.log(`🚀 Towed ${npcShip.name} (${npcShip.faction}) to safety`);
                break;
        }

        // Fire diplomatic event
        this.starSystem.processDiplomaticEvent({
            type: 'RESCUE',
            category: 'HUMANITARIAN',
            timestamp: Date.now() / 1000,
            severity: 5,
            rescuerFaction: 'PLAYER',
            victimFaction: npcShip.faction,
            livesSaved: Math.floor(assistanceValue / 10),
            location: shipPos,
            description: description
        });

        console.log(`❤️  Rescue improved relations with ${npcShip.faction}`);
    }

    /**
     * Get nearest distressed NPC ship within range
     */
    public getNearestDistressedShip(maxRange: number = 50000): any | null {
        const shipPos = this.spacecraft.getPosition();
        const npcVessels = this.trafficManager.getAllVessels();

        let nearestShip = null;
        let nearestDist = Infinity;

        for (const npc of npcVessels) {
            if (!npc.needsAssistance()) continue;

            const dx = npc.position.x - shipPos.x;
            const dy = npc.position.y - shipPos.y;
            const dz = npc.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < maxRange && dist < nearestDist) {
                nearestDist = dist;
                nearestShip = npc;
            }
        }

        return nearestShip;
    }

    /**
     * Simulate NPC-to-NPC background events for dynamic universe
     * Called periodically to generate diplomatic activity
     */
    private simulateBackgroundEvents(deltaTime: number): void {
        // Only process every few seconds to avoid spam
        if (!this.lastBackgroundEventTime) {
            this.lastBackgroundEventTime = this.gameTime;
        }

        const timeSinceLastEvent = this.gameTime - this.lastBackgroundEventTime;
        if (timeSinceLastEvent < 10) return; // Every 10 seconds

        this.lastBackgroundEventTime = this.gameTime;

        // Get all NPC factions
        const npcVessels = this.trafficManager.getAllVessels();
        if (npcVessels.length < 2) return;

        // Small chance of background events
        const roll = Math.random();

        if (roll < 0.1) { // 10% chance - Pirate raid
            const pirateIndex = Math.floor(Math.random() * npcVessels.length);
            const victimIndex = (pirateIndex + 1) % npcVessels.length;
            const pirate = npcVessels[pirateIndex];
            const victim = npcVessels[victimIndex];

            // Skip if same faction
            if (pirate.faction === victim.faction) return;

            const stolenCargo = Math.floor(Math.random() * 50000) + 10000;

            this.starSystem.processDiplomaticEvent({
                type: 'PIRATE_RAID',
                category: 'MILITARY',
                timestamp: Date.now() / 1000,
                severity: 6,
                attackerFaction: pirate.faction,
                victimFaction: victim.faction,
                casualties: Math.floor(Math.random() * 5) + 1,
                stolenCargo: stolenCargo,
                location: pirate.position,
                description: `${pirate.faction} raided ${victim.faction} vessel`
            });

            // Disrupt supply chain - raids reduce trade flow
            const commodities = ['FUEL', 'FOOD', 'ELECTRONICS'];
            const commodity = commodities[Math.floor(Math.random() * commodities.length)];
            this.starSystem.disruptSupplyChain(commodity, 'PIRATE_RAID', 3600, 0.15); // 1hr, 15% impact

            // NPCs record combat experience
            const damage = Math.random() * 0.3; // 0-30% damage
            pirate.recordCombatExperience(victim.id, 'VICTORY', damage * 0.5, damage);
            victim.recordCombatExperience(pirate.id, 'DEFEAT', damage, damage * 0.5);
            victim.takeDamage(damage, undefined, pirate.id); // Actually damage victim

            console.log(`☠️  Background event: ${pirate.faction} pirate raid on ${victim.faction}`);

        } else if (roll < 0.15) { // 5% chance - NPC trade
            const trader1Index = Math.floor(Math.random() * npcVessels.length);
            const trader2Index = (trader1Index + 1) % npcVessels.length;
            const trader1 = npcVessels[trader1Index];
            const trader2 = npcVessels[trader2Index];

            // Skip if same faction
            if (trader1.faction === trader2.faction) return;

            const tradeValue = Math.floor(Math.random() * 100000) + 20000;
            const tradeCommodities = ['FUEL', 'FOOD', 'WATER', 'ELECTRONICS', 'WEAPONS'];
            const tradeCommodity = tradeCommodities[Math.floor(Math.random() * tradeCommodities.length)];
            const tradeVolume = Math.floor(Math.random() * 1000) + 100;

            this.starSystem.processDiplomaticEvent({
                type: 'TRADE_COMPLETED',
                category: 'ECONOMIC',
                timestamp: Date.now() / 1000,
                severity: 3,
                factionA: trader1.faction,
                factionB: trader2.faction,
                tradeVolume: tradeValue,
                location: trader1.position,
                description: `${trader1.faction} traded with ${trader2.faction}`
            });

            // Actually move commodities between economies
            this.starSystem.processEconomicTrade(
                trader1.faction,
                trader2.faction,
                tradeCommodity,
                tradeVolume,
                tradeValue
            );

            // NPCs record trade experience
            const profit1 = Math.floor(tradeValue * 0.1 * (Math.random() * 0.4 + 0.8)); // 8-12% profit
            const profit2 = Math.floor(tradeValue * 0.1 * (Math.random() * 0.4 + 0.8));
            trader1.recordTradeExperience(trader2.id, tradeCommodity, profit1, tradeVolume);
            trader2.recordTradeExperience(trader1.id, tradeCommodity, profit2, tradeVolume);

            console.log(`📦 Background event: ${trader1.faction} traded with ${trader2.faction} (${tradeValue} credits)`);

        } else if (roll < 0.17) { // 2% chance - NPC combat
            const combatant1Index = Math.floor(Math.random() * npcVessels.length);
            const combatant2Index = (combatant1Index + 1) % npcVessels.length;
            const combatant1 = npcVessels[combatant1Index];
            const combatant2 = npcVessels[combatant2Index];

            // Skip if same faction
            if (combatant1.faction === combatant2.faction) return;

            this.starSystem.processDiplomaticEvent({
                type: 'COMBAT_STARTED',
                category: 'MILITARY',
                timestamp: Date.now() / 1000,
                severity: 7,
                attackerFaction: combatant1.faction,
                defenderFaction: combatant2.faction,
                casualties: Math.floor(Math.random() * 10) + 2,
                location: combatant1.position,
                description: `${combatant1.faction} engaged in combat with ${combatant2.faction}`
            });

            // Combat disrupts supply chains - military action blocks trade routes
            const combatCommodities = ['FUEL', 'FOOD', 'WEAPONS'];
            const combatCommodity = combatCommodities[Math.floor(Math.random() * combatCommodities.length)];
            this.starSystem.disruptSupplyChain(combatCommodity, 'MILITARY_COMBAT', 7200, 0.25); // 2hr, 25% impact

            // NPCs record combat experience - determine winner
            const damage1 = Math.random() * 0.4; // 0-40% damage to combatant1
            const damage2 = Math.random() * 0.4; // 0-40% damage to combatant2
            const winner = damage1 < damage2 ? combatant1 : combatant2;
            const loser = winner === combatant1 ? combatant2 : combatant1;
            const winnerDamage = winner === combatant1 ? damage1 : damage2;
            const loserDamage = winner === combatant1 ? damage2 : damage1;

            winner.recordCombatExperience(loser.id, 'VICTORY', winnerDamage, loserDamage);
            loser.recordCombatExperience(winner.id, 'DEFEAT', loserDamage, winnerDamage);
            winner.takeDamage(winnerDamage, undefined, loser.id);
            loser.takeDamage(loserDamage, undefined, winner.id);

            console.log(`⚔️  Background event: ${combatant1.faction} combat with ${combatant2.faction} (${winner.name} wins)`);
        }

        // Check if economic crises might trigger wars
        this.starSystem.checkEconomicWarTriggers();
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

            // Set velocity perpendicular to radius for circular orbit
            const orbitalVel: Vector3 = {
                x: 0,
                y: orbitalSpeed,
                z: 0
            };

            this.spacecraft.setPosition(startPos);
            this.spacecraft.setVelocity(orbitalVel);

            console.log(`✅ Ship placed in orbit around ${planet.name}`);
            console.log(`   └─ Altitude: ${(orbitHeight / 1000).toFixed(0)} km`);
            console.log(`   └─ Orbital speed: ${(orbitalSpeed / 1000).toFixed(2)} km/s`);
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

        // Simulate background diplomatic events (pirate raids, NPC combat, trade)
        this.simulateBackgroundEvents(deltaTime);

        // Economy is passive (pricing calculator), no update needed

        // Update communications network
        this.updateCommunications(deltaTime);

        // Check for collisions
        this.checkCollisions();

        // Update sensors and contacts
        this.updateSensors();

        // Update terrain data
        this.updateTerrain();
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

        // Inject contacts into spacecraft sensor system
        this.spacecraft.injectRadarContacts(radarContacts);
        this.spacecraft.injectOpticalContacts(opticalContacts);
    }

    /**
     * Update terrain data for landing gear
     */
    private updateTerrain(): void {
        const shipPos = this.spacecraft.getPosition();

        // Get terrain altitude from game world
        const terrainAlt = this.gameWorld.terrain.getHeight(shipPos.x, shipPos.y);

        // Calculate ship altitude above terrain
        const shipAltitudeAboveTerrain = Math.sqrt(
            shipPos.x ** 2 + shipPos.y ** 2 + shipPos.z ** 2
        ) - terrainAlt;

        // Calculate terrain slope (simplified)
        const sampleDistance = 10; // 10 meters
        const height1 = this.gameWorld.terrain.getHeight(shipPos.x + sampleDistance, shipPos.y);
        const height2 = this.gameWorld.terrain.getHeight(shipPos.x, shipPos.y + sampleDistance);
        const slope = Math.sqrt(
            ((height1 - terrainAlt) / sampleDistance) ** 2 +
            ((height2 - terrainAlt) / sampleDistance) ** 2
        ) * (180 / Math.PI);

        // Determine surface type (simplified)
        const surfaceType = terrainAlt > 1000 ? 'highland' : 'mare';

        // Inject terrain data into spacecraft
        this.spacecraft.injectTerrainData(shipAltitudeAboveTerrain, slope, surfaceType);
    }

    /**
     * Check for collisions
     */
    private checkCollisions(): void {
        const shipPos = this.spacecraft.getPosition();

        // Check collisions with celestial bodies
        for (const body of this.starSystem.getAllBodies()) {
            if (body.type === 'STATION') continue;

            const dx = body.position.x - shipPos.x;
            const dy = body.position.y - shipPos.y;
            const dz = body.position.z - shipPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < body.physical.radius + 50) { // Ship size ~50m
                const velocity = this.spacecraft.getVelocity();
                const impactSpeed = Math.sqrt(
                    velocity.x ** 2 +
                    velocity.y ** 2 +
                    velocity.z ** 2
                );

                console.log(`💥 COLLISION with ${body.name}!`);
                console.log(`   └─ Impact speed: ${impactSpeed.toFixed(0)} m/s`);

                // Calculate damage based on impact speed
                // Speed > 100 m/s = catastrophic damage (100%)
                // Speed < 10 m/s = minor damage (5%)
                const damageFactor = Math.min(impactSpeed / 100, 1.0);
                const damagePercent = 5 + (damageFactor * 95); // 5-100% damage

                // Apply hull damage
                this.spacecraft.applyHullDamage(damagePercent, 'compartment_1');

                // Check hull integrity
                const hullIntegrity = this.spacecraft.getHullIntegrity();
                console.log(`   └─ Hull integrity: ${hullIntegrity.toFixed(1)}%`);

                if (hullIntegrity <= 0) {
                    console.log('💀 CRITICAL HULL FAILURE - Mission Failed');
                    // Game over - hull destroyed
                    this.paused = true;
                    // TODO: Trigger game over state/screen
                } else if (hullIntegrity < 30) {
                    console.log('⚠️  WARNING: Critical hull damage! Recommend immediate landing.');
                    this.paused = true;
                } else {
                    this.paused = true;
                }
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
                // Calculate relative velocity for collision damage
                const shipVel = this.spacecraft.getVelocity();
                const relVelX = shipVel.x - npc.velocity.x;
                const relVelY = shipVel.y - npc.velocity.y;
                const relVelZ = shipVel.z - npc.velocity.z;
                const relSpeed = Math.sqrt(relVelX ** 2 + relVelY ** 2 + relVelZ ** 2);

                console.log(`💥 COLLISION with NPC ${npc.id}!`);
                console.log(`   └─ Relative speed: ${relSpeed.toFixed(0)} m/s`);

                // Calculate damage based on relative speed
                const damageFactor = Math.min(relSpeed / 50, 1.0);
                const damagePercent = 10 + (damageFactor * 40); // 10-50% damage (less than planetary collision)

                // Apply hull damage
                this.spacecraft.applyHullDamage(damagePercent, 'compartment_1');

                // Check hull integrity
                const hullIntegrity = this.spacecraft.getHullIntegrity();
                console.log(`   └─ Hull integrity: ${hullIntegrity.toFixed(1)}%`);

                // ===== DIPLOMACY: Process collision as hostile incident =====
                this.starSystem.processDiplomaticEvent({
                    type: 'COMBAT_STARTED',
                    category: 'MILITARY',
                    timestamp: Date.now() / 1000,
                    severity: Math.min(10, Math.floor(relSpeed / 10)),
                    attackerFaction: 'PLAYER',
                    defenderFaction: npc.faction,
                    casualties: Math.floor(damagePercent / 10),
                    location: shipPos
                });

                if (hullIntegrity <= 0) {
                    console.log('💀 CRITICAL HULL FAILURE - Mission Failed');
                    this.paused = true;
                } else if (hullIntegrity < 30) {
                    console.log('⚠️  WARNING: Critical hull damage!');
                    this.paused = true;
                } else {
                    this.paused = true;
                }
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
        ctx.fillText(`NPCs: ${this.trafficManager.getAllVessels().length}`, x, y);
        y += 15;
        ctx.fillText(`Stations: ${this.starSystem.stations.length}`, x, y);
        y += 15;
        ctx.fillText(`Satellites: ${this.gameWorld.satellites.getState().satellites.length}`, x, y);
        y += 15;
        ctx.fillText(`Markets: ${this.markets.size}`, x, y);
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

    /**
     * Get all NPC vessels
     */
    getNPCVessels() {
        return this.trafficManager.getAllVessels();
    }

    /**
     * Get nearby NPC vessels
     */
    getNearbyNPCVessels(maxDistance: number = 100000) {
        const shipPos = this.spacecraft.getPosition();
        return this.trafficManager.getVesselsNear(shipPos, maxDistance);
    }
}
