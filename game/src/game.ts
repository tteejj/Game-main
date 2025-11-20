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
import { SpaceRenderer, ColorPalette } from './rendering/renderer';
import { VisualEffects } from './rendering/effects';
import { PerformanceMonitor } from './utils/performance-monitor';
import { PlayerShipIntegration } from '../../universe-system/src/PlayerShipIntegration';
import { UniverseOrchestrator } from '../../universe-system/src/UniverseOrchestrator';
import { UniverseStatistics } from './universe-statistics';

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

    // Player integration systems
    public playerIntegration: PlayerShipIntegration;
    private universeOrchestrator: UniverseOrchestrator;

    // Universe statistics - track EVERYTHING
    public statistics: UniverseStatistics;

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

    // Rendering systems (Phase 4)
    private spaceRenderer: SpaceRenderer;
    private visualEffects: VisualEffects;
    private perfMonitor: PerformanceMonitor;
    private showTrajectory: boolean = false;
    private showPerfStats: boolean = false;

    // Color palette for rendering
    private palette: ColorPalette = {
        background: '#000000',
        primary: '#00ff00',
        secondary: '#00aa00',
        accent: '#00ffff',
        good: '#00ff00',
        warning: '#ffff00',
        critical: '#ff0000'
    };

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

        // Initialize comprehensive statistics tracking
        this.statistics = new UniverseStatistics();
        console.log('✅ Universe statistics tracking initialized - tracking EVERYTHING');

        // Initialize rendering systems (Phase 4)
        this.spaceRenderer = new SpaceRenderer(this.ctx, this.palette);
        this.visualEffects = new VisualEffects(this.ctx);
        this.perfMonitor = new PerformanceMonitor();
        console.log('✅ Rendering systems initialized');

        // Initialize universe orchestrator for player systems
        this.universeOrchestrator = new UniverseOrchestrator();

        // Initialize player integration with real spacecraft
        this.playerIntegration = new PlayerShipIntegration(
            this.spacecraft.spacecraft,  // The actual physics Spacecraft
            this.universeOrchestrator,
            this.starSystem
        );

        // Sync initial state
        this.syncPlayerState();

        console.log('✅ Player integration systems initialized');

        console.log('🚀 All systems ready!');
    }

    /**
     * Initialize faction diplomacy with starting relationships, wars, and pirates
     */
    private initializeDiplomacy(): void {
        // === TRADE AGREEMENTS ===
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

        // === FACTION WARS ===
        // UNITED_EARTH vs BELT_ALLIANCE - Territory disputes escalated to war!
        const earthBelt = this.starSystem.getFactionRelationship('UNITED_EARTH', 'BELT_ALLIANCE');
        earthBelt.relationshipValue = -85;  // Deep hostility
        earthBelt.status = 'WAR';
        earthBelt.trend = 'DETERIORATING';
        earthBelt.territorialDisputes = 8;  // Major disputed territories
        earthBelt.militaryBalance = 0.3;  // Earth has military advantage
        console.log('  └─ WAR: UNITED_EARTH vs BELT_ALLIANCE (territorial disputes)');

        // MARS_FEDERATION vs INDEPENDENT - Economic conflict
        const marsIndep = this.starSystem.getFactionRelationship('MARS_FEDERATION', 'INDEPENDENT');
        marsIndep.relationshipValue = -60;
        marsIndep.status = 'HOSTILE';
        marsIndep.trend = 'RAPIDLY_DETERIORATING';
        marsIndep.economicInterdependence = 0.1;  // Low interdependence = can afford conflict
        marsIndep.warProbability = 0.75;  // High chance of escalation
        console.log('  └─ HOSTILE: MARS_FEDERATION vs INDEPENDENT (economic conflict, war imminent)');

        // === PIRATES - HOSTILE TO EVERYONE ===
        const allFactions = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'INDEPENDENT', 'PLAYER'];
        for (const faction of allFactions) {
            const pirateRel = this.starSystem.getFactionRelationship('PIRATES', faction);
            pirateRel.relationshipValue = -95;  // Maximum hostility
            pirateRel.status = 'WAR';
            pirateRel.trend = 'STABLE';  // Pirates always hostile
            pirateRel.militaryBalance = -0.4;  // Factions generally stronger
        }
        console.log('  └─ PIRATES declared hostile to all factions');

        // === PLAYER RELATIONS ===
        // Start player as cordial with UNITED_EARTH
        const playerEarth = this.starSystem.getFactionRelationship('PLAYER', 'UNITED_EARTH');
        playerEarth.relationshipValue = 30;
        playerEarth.status = 'CORDIAL';

        // Neutral with MARS
        const playerMars = this.starSystem.getFactionRelationship('PLAYER', 'MARS_FEDERATION');
        playerMars.relationshipValue = 10;
        playerMars.status = 'NEUTRAL';

        // Friendly with BELT (underdogs)
        const playerBelt = this.starSystem.getFactionRelationship('PLAYER', 'BELT_ALLIANCE');
        playerBelt.relationshipValue = 40;
        playerBelt.status = 'FRIENDLY';

        // === ALLIANCES ===
        // MARS + INDEPENDENT mutual defense (against Earth)
        this.starSystem.factionDiplomacy.signTreaty(
            ['MARS_FEDERATION', 'BELT_ALLIANCE'],
            'MUTUAL_DEFENSE',
            ['Defend against UNITED_EARTH aggression', 'Share military intelligence'],
            0
        );
        console.log('  └─ ALLIANCE: MARS_FEDERATION + BELT_ALLIANCE (mutual defense)');

        console.log('  └─ Initialized 5 treaties, 2 active wars, 1 brewing conflict, and pirate threat');
    }

    /**
     * Sync player state between Game and PlayerShipIntegration
     */
    private syncPlayerState(): void {
        // Sync credits
        const state = this.playerIntegration.getState();
        state.credits = this.playerCredits;

        // Sync cargo
        this.playerCargo.forEach((qty, commodity) => {
            state.cargo.set(commodity, qty);
        });
        state.cargoUsed = Array.from(this.playerCargo.values()).reduce((sum, qty) => sum + qty, 0);
    }

    /**
     * Get nearby ships for player combat system
     */
    private getNearbyShipsForCombat(): any[] {
        const playerPos = this.spacecraft.getPosition();
        const nearbyNPCs = this.trafficManager.getVesselsNear(
            playerPos,
            50000 // 50km range
        );

        return nearbyNPCs.map(npc => ({
            id: npc.id,
            name: npc.name,
            position: npc.position,
            faction: npc.faction,
            hostile: npc.hostile || false
        }));
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
     * Simulate NPC-to-NPC background events for LIVING, DYNAMIC universe
     * Called periodically to generate diplomatic activity
     */
    private simulateBackgroundEvents(deltaTime: number): void {
        // Process more frequently for a living universe
        if (!this.lastBackgroundEventTime) {
            this.lastBackgroundEventTime = this.gameTime;
        }

        const timeSinceLastEvent = this.gameTime - this.lastBackgroundEventTime;
        if (timeSinceLastEvent < 3) return; // Every 3 seconds (was 10)

        this.lastBackgroundEventTime = this.gameTime;

        // Get all NPC factions
        const npcVessels = this.trafficManager.getAllVessels();
        if (npcVessels.length < 2) return;

        // MUCH HIGHER chance of events for a living universe
        const roll = Math.random();

        if (roll < 0.35) { // 35% chance - Pirate raid (was 10%)
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

            // Record in statistics
            const destroyed = victim.subsystems.getHullIntegrity() <= 0;
            this.statistics.recordCombat(damage * 100, pirate.faction, victim.faction, destroyed);

            console.log(`☠️  Background event: ${pirate.faction} pirate raid on ${victim.faction}`);

        } else if (roll < 0.65) { // 30% chance - NPC trade (was 5%)
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

            // Record in statistics
            this.statistics.recordTrade(tradeValue, tradeVolume, trader1.faction);

            console.log(`📦 Background event: ${trader1.faction} traded with ${trader2.faction} (${tradeValue} credits)`);

        } else if (roll < 0.85) { // 20% chance - NPC combat (was 2%)
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

            // Record in statistics
            const destroyed = loser.subsystems.getHullIntegrity() <= 0;
            this.statistics.recordCombat(loserDamage * 100, winner.faction, loser.faction, destroyed);

            console.log(`⚔️  Background event: ${combatant1.faction} combat with ${combatant2.faction} (${winner.name} wins)`);
        }

        // Check if economic crises might trigger wars
        this.starSystem.checkEconomicWarTriggers();
    }

    /**
     * Update comprehensive universe statistics - track EVERYTHING
     */
    private updateStatistics(deltaTime: number): void {
        // Update base statistics
        this.statistics.update(deltaTime, this.gameTime, this.timeAcceleration);

        // Update traffic statistics
        const allVessels = this.trafficManager.getAllVessels();
        this.statistics.updateTraffic(allVessels);

        // Update faction statistics
        const factions = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'INDEPENDENT', 'PIRATES'];
        for (const faction of factions) {
            const factionShips = allVessels.filter(v => v.faction === faction);
            const combatShips = factionShips.filter(v =>
                v.type === ShipType.PATROL_SHIP || v.type === ShipType.PIRATE
            ).length;
            const civilianShips = factionShips.length - combatShips;

            // Get faction relationship data
            let activeWars = 0;
            let alliances = 0;
            for (const otherFaction of factions) {
                if (faction === otherFaction) continue;
                const rel = this.starSystem.getFactionRelationship(faction, otherFaction);
                if (rel.status === 'WAR') activeWars++;
                if (rel.status === 'ALLIED') alliances++;
            }

            this.statistics.updateFactionStats(faction, {
                name: faction,
                shipCount: factionShips.length,
                combatShips,
                civilianShips,
                activeWars,
                alliances,
                militaryStrength: combatShips * 100,
                economicPower: civilianShips * 50000
            });
        }

        // Update manufacturing statistics (if system exists)
        this.statistics.manufacturing.totalFacilities = this.starSystem.stations.length * 3; // Estimate 3 facilities per station
        this.statistics.manufacturing.activeFacilities = Math.floor(this.statistics.manufacturing.totalFacilities * 0.7); // 70% active
        this.statistics.manufacturing.facilityUtilization = 0.65; // 65% utilization
        this.statistics.manufacturing.activeJobs = this.statistics.manufacturing.activeFacilities * 2;

        // === DYNAMIC POPULATION GROWTH ===
        const basePopulation = this.starSystem.stations.length * 75000; // ~75k per station
        const gameHours = this.gameTime / 3600;

        // Population grows over time based on happiness and resources
        const avgHappiness = 0.72 - (stats.population.unrestLevel * 0.3);
        const healthFactor = 0.85;
        const combatPenalty = Math.min(stats.combat.totalEngagements / 100, 0.2); // Combat reduces growth

        const growthRateBase = 0.00015; // 0.015% per hour
        const actualGrowthRate = growthRateBase * avgHappiness * healthFactor * (1 - combatPenalty);

        // Accumulate population growth over time
        const totalPopulation = Math.floor(basePopulation * Math.pow(1 + actualGrowthRate, gameHours));
        const births = Math.floor(totalPopulation * actualGrowthRate * deltaTime / 3600);
        const deaths = Math.floor(totalPopulation * 0.00005 * deltaTime / 3600);

        // Unrest increases with combat and decreases with trade
        const combatUnrest = Math.min(stats.combat.engagementsLastHour / 50, 0.3);
        const tradeHappiness = Math.min(stats.economy.marketActivity / 100, 0.2);
        const currentUnrest = Math.max(0, Math.min(0.5, 0.12 + combatUnrest - tradeHappiness));

        this.statistics.updatePopulation(
            totalPopulation,
            actualGrowthRate,
            avgHappiness,
            healthFactor,
            0.08 + (currentUnrest * 0.2), // Unemployment rises with unrest
            currentUnrest,
            births,
            deaths,
            this.starSystem.stations.length
        );

        // === DYNAMIC RESEARCH PROGRESS ===
        this.statistics.research.activeProjects = factions.length * 2; // 2 projects per faction

        // Research progresses over time
        const researchPointsThisFrame = factions.length * 50 * (deltaTime / 3600); // 50 RP/hour per faction
        this.statistics.research.totalResearchPoints += researchPointsThisFrame;
        this.statistics.research.researchPerHour = factions.length * 50;

        // Check for research breakthroughs (every 5000 RP)
        const breakthroughThreshold = 5000;
        const currentBreakthroughs = Math.floor(this.statistics.research.totalResearchPoints / breakthroughThreshold);
        if (currentBreakthroughs > this.statistics.research.breakthroughs) {
            this.statistics.research.breakthroughs = currentBreakthroughs;
            this.statistics.research.completedProjects++;

            // Random faction gets tech level increase
            const luckyFaction = factions[Math.floor(Math.random() * factions.length)];
            const currentTech = this.statistics.research.techLevelByFaction.get(luckyFaction) || 5;
            this.statistics.research.techLevelByFaction.set(luckyFaction, currentTech + 1);

            console.log(`🔬 BREAKTHROUGH: ${luckyFaction} advanced to Tech Level ${currentTech + 1}!`);
        }

        // Initialize tech levels if not set
        for (const faction of factions) {
            if (!this.statistics.research.techLevelByFaction.has(faction)) {
                const baseTech = faction === 'UNITED_EARTH' ? 6 :
                                faction === 'MARS_FEDERATION' ? 6 :
                                faction === 'BELT_ALLIANCE' ? 5 :
                                faction === 'PIRATES' ? 4 : 5;
                this.statistics.research.techLevelByFaction.set(faction, baseTech);
            }
        }
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
     * Spawn initial NPC traffic with faction diversity and pirates
     */
    private spawnInitialTraffic(): void {
        if (this.starSystem.stations.length === 0 || this.starSystem.planets.length === 0) {
            return;
        }

        // Much more traffic for a living universe (30-50 ships)
        const numShips = 30 + Math.floor(Math.random() * 20);

        // Faction ship distribution
        const factions = [
            { name: 'UNITED_EARTH', weight: 0.25 },
            { name: 'MARS_FEDERATION', weight: 0.25 },
            { name: 'BELT_ALLIANCE', weight: 0.20 },
            { name: 'INDEPENDENT', weight: 0.20 },
            { name: 'PIRATES', weight: 0.10 }  // 10% pirates!
        ];

        // Ship types by faction preference
        const factionShipTypes: Record<string, { types: ShipType[], weights: number[] }> = {
            'UNITED_EARTH': {
                types: [ShipType.CARGO_FREIGHTER, ShipType.PASSENGER_LINER, ShipType.PATROL_SHIP, ShipType.CARGO_SHUTTLE],
                weights: [0.4, 0.2, 0.3, 0.1]
            },
            'MARS_FEDERATION': {
                types: [ShipType.MINING_VESSEL, ShipType.RESEARCH, ShipType.CARGO_FREIGHTER, ShipType.PATROL_SHIP],
                weights: [0.3, 0.2, 0.3, 0.2]
            },
            'BELT_ALLIANCE': {
                types: [ShipType.MINING_VESSEL, ShipType.CARGO_SHUTTLE, ShipType.SALVAGE, ShipType.PATROL_SHIP],
                weights: [0.5, 0.2, 0.2, 0.1]
            },
            'INDEPENDENT': {
                types: [ShipType.CARGO_FREIGHTER, ShipType.CARGO_SHUTTLE, ShipType.MINING_VESSEL, ShipType.SALVAGE],
                weights: [0.3, 0.3, 0.2, 0.2]
            },
            'PIRATES': {
                types: [ShipType.PIRATE, ShipType.PIRATE, ShipType.PIRATE, ShipType.CARGO_SHUTTLE],
                weights: [0.6, 0.2, 0.1, 0.1]  // Mostly pirates, some stolen freighters
            }
        };

        let pirateCount = 0;
        let factionCounts: Record<string, number> = {};

        for (let i = 0; i < numShips; i++) {
            // Select faction based on weights
            let faction = 'INDEPENDENT';
            let rand = Math.random();
            let cumulative = 0;
            for (const f of factions) {
                cumulative += f.weight;
                if (rand < cumulative) {
                    faction = f.name;
                    break;
                }
            }

            factionCounts[faction] = (factionCounts[faction] || 0) + 1;

            // Select ship type based on faction preferences
            const factionShips = factionShipTypes[faction];
            rand = Math.random();
            cumulative = 0;
            let shipType = factionShips.types[0];
            for (let j = 0; j < factionShips.types.length; j++) {
                cumulative += factionShips.weights[j];
                if (rand < cumulative) {
                    shipType = factionShips.types[j];
                    break;
                }
            }

            // Random position in system (closer spawning for more action)
            const angle = Math.random() * Math.PI * 2;
            const distance = 5e7 + Math.random() * 3e8; // 50M to 350M meters (closer than before!)

            const position = new Vector3Class(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance,
                (Math.random() - 0.5) * distance * 0.05
            );

            const velocity = new Vector3Class(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 200
            );

            const shipName = faction === 'PIRATES'
                ? `Raider-${++pirateCount}`
                : `${faction.substring(0, 3)}-${Math.floor(Math.random() * 999)}`;

            const ship = new NPCShip(
                `npc_${i}`,
                shipName,
                shipType,
                position,
                velocity
            );

            ship.faction = faction;

            this.trafficManager.addVessel(ship);
        }

        console.log(`   └─ Spawned ${numShips} NPC ships across factions:`);
        for (const [faction, count] of Object.entries(factionCounts)) {
            console.log(`      • ${faction}: ${count} ships${faction === 'PIRATES' ? ' (HOSTILE)' : ''}`);
        }
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
     * Toggle trajectory display
     */
    toggleTrajectory(): void {
        this.showTrajectory = !this.showTrajectory;
        console.log(`Trajectory display: ${this.showTrajectory ? 'ON' : 'OFF'}`);
    }

    /**
     * Toggle performance stats display
     */
    togglePerfStats(): void {
        this.showPerfStats = !this.showPerfStats;
        console.log(`Performance stats: ${this.showPerfStats ? 'ON' : 'OFF'}`);
    }

    /**
     * Zoom camera in
     */
    zoomIn(): void {
        const currentZoom = this.spaceRenderer.camera.zoom;
        this.spaceRenderer.camera.setZoom(currentZoom * 1.25);
        console.log(`Zoom: ${this.spaceRenderer.camera.zoom.toFixed(2)}x`);
    }

    /**
     * Zoom camera out
     */
    zoomOut(): void {
        const currentZoom = this.spaceRenderer.camera.zoom;
        this.spaceRenderer.camera.setZoom(currentZoom * 0.8);
        console.log(`Zoom: ${this.spaceRenderer.camera.zoom.toFixed(2)}x`);
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
        const frameStart = this.perfMonitor.startFrame();

        this.gameTime += deltaTime;

        // Update game world (terrain, environment, satellites, orbital mechanics)
        let start = this.perfMonitor.startUpdate('gameWorld');
        this.gameWorld.update(deltaTime);
        this.perfMonitor.endUpdate('gameWorld', start);

        // Update star system (planetary orbits, hazards)
        start = this.perfMonitor.startUpdate('starSystem');
        this.starSystem.update(deltaTime);
        this.perfMonitor.endUpdate('starSystem', start);

        // Apply multi-body gravity to spacecraft
        start = this.perfMonitor.startUpdate('gravity');
        this.applyGravity(deltaTime);
        this.perfMonitor.endUpdate('gravity', start);

        // Update spacecraft physics and all subsystems
        start = this.perfMonitor.startUpdate('spacecraft');
        this.spacecraft.update(deltaTime);
        this.perfMonitor.endUpdate('spacecraft', start);

        // Update player integration systems (missions, combat, crew, research)
        this.playerIntegration.update(deltaTime, this.getNearbyShipsForCombat());

        // Sync state back from player integration
        this.playerCredits = this.playerIntegration.getState().credits;

        // Update NPC traffic (navigation, collision avoidance)
        start = this.perfMonitor.startUpdate('traffic');
        this.updateTraffic(deltaTime);
        this.perfMonitor.endUpdate('traffic', start);

        // Simulate background diplomatic events (pirate raids, NPC combat, trade)
        start = this.perfMonitor.startUpdate('backgroundEvents');
        this.simulateBackgroundEvents(deltaTime);
        this.perfMonitor.endUpdate('backgroundEvents', start);

        // Economy is passive (pricing calculator), no update needed

        // Update communications network
        start = this.perfMonitor.startUpdate('communications');
        this.updateCommunications(deltaTime);
        this.perfMonitor.endUpdate('communications', start);

        // Check for collisions
        start = this.perfMonitor.startUpdate('collisions');
        this.checkCollisions();
        this.perfMonitor.endUpdate('collisions', start);

        this.perfMonitor.endFrame(frameStart);

        // Update sensors and contacts
        this.updateSensors();

        // Update terrain data
        this.updateTerrain();

        // Update comprehensive statistics
        this.updateStatistics(deltaTime);
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
        // Render space scene using Phase 4 SpaceRenderer
        const shipPos = this.spacecraft.getPosition();
        const shipVel = this.spacecraft.getVelocity();
        const mainEngineState = this.spacecraft.getMainEngineState();

        this.spaceRenderer.render({
            spacecraft: {
                position: shipPos,
                rotation: Math.atan2(shipVel.y, shipVel.x), // Point towards velocity
                engineFiring: mainEngineState.isOn,
                trajectory: [] // TODO: Add trajectory calculation
            },
            starSystem: {
                bodies: this.starSystem.planets.map(p => ({
                    position: p.position,
                    radius: p.radius,
                    name: p.name,
                    type: p.type || 'planet',
                    atmosphere: p.atmosphere
                })),
                stations: this.starSystem.stations,
                hazards: [] // TODO: Add hazards
            },
            npcShips: this.trafficManager.getAllVessels().map(v => ({
                position: v.position,
                heading: 0, // TODO: Get heading from NPC
                hostile: false // TODO: Get hostile status
            })),
            targetedContact: null, // TODO: Add targeting system
            showTrajectory: this.showTrajectory
        });

        // Update visual effects
        this.visualEffects.update(Date.now());

        // Render stats overlay (bottom-left corner)
        this.renderStats();

        // Render performance stats if enabled
        if (this.showPerfStats) {
            this.perfMonitor.renderStats(this.ctx, 10, 100);
        }

        // UI panels will be rendered on top by UIManager
    }

    /**
     * Render comprehensive universe statistics - EVERYTHING
     */
    private renderStats(): void {
        const ctx = this.ctx;
        ctx.font = '11px "Courier New"';

        const stats = this.statistics;
        let y = 15;
        const leftX = 10;
        const centerX = 320;
        const rightX = 630;

        // === LEFT COLUMN: SYSTEM & TRAFFIC ===
        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== SYSTEM ===', leftX, y);
        y += 14;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`FPS: ${this.fps}`, leftX, y);
        y += 12;
        ctx.fillText(`Time: ${(this.gameTime / 3600).toFixed(1)}h (${this.timeAcceleration}x)`, leftX, y);
        y += 12;
        const shipPos = this.spacecraft.getPosition();
        const dist = Math.sqrt(shipPos.x ** 2 + shipPos.y ** 2 + shipPos.z ** 2);
        ctx.fillText(`Range: ${(dist / 1e6).toFixed(2)} Mm`, leftX, y);
        y += 14;

        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== TRAFFIC ===', leftX, y);
        y += 14;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Ships: ${stats.traffic.totalShips}`, leftX, y);
        y += 12;
        ctx.fillText(`Speed: ${(stats.traffic.averageSpeed / 1000).toFixed(1)} km/s`, leftX, y);
        y += 12;
        for (const [faction, count] of stats.traffic.shipsByFaction) {
            const color = faction === 'PIRATES' ? '#ff0000' :
                         faction === 'PLAYER' ? '#00ffff' : '#00ff00';
            ctx.fillStyle = color;
            ctx.fillText(`  ${faction}: ${count}`, leftX, y);
            y += 12;
        }
        y += 2;

        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== COMBAT ===', leftX, y);
        y += 14;
        ctx.fillStyle = stats.combat.pirateAttacks > 0 ? '#ff0000' : '#00ff00';
        ctx.fillText(`Engagements: ${stats.combat.totalEngagements}`, leftX, y);
        y += 12;
        ctx.fillText(`  Last Hour: ${stats.combat.engagementsLastHour}`, leftX, y);
        y += 12;
        ctx.fillStyle = '#ff4444';
        ctx.fillText(`  Pirates: ${stats.combat.pirateAttacks}`, leftX, y);
        y += 12;
        ctx.fillStyle = '#ff8800';
        ctx.fillText(`  Faction: ${stats.combat.factionBattles}`, leftX, y);
        y += 12;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Ships Lost: ${stats.combat.totalShipsDestroyed}`, leftX, y);
        y += 12;
        ctx.fillText(`Damage: ${stats.combat.totalDamageDealt.toFixed(0)}`, leftX, y);

        // === CENTER COLUMN: ECONOMY & MANUFACTURING ===
        y = 15;
        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== ECONOMY ===', centerX, y);
        y += 14;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Trade Vol: ${(stats.economy.totalTradeVolume / 1000).toFixed(0)}k CR`, centerX, y);
        y += 12;
        ctx.fillText(`Transactions: ${stats.economy.tradeTransactions}`, centerX, y);
        y += 12;
        ctx.fillText(`Avg Trade: ${stats.economy.averageTradeValue.toFixed(0)} CR`, centerX, y);
        y += 12;
        ctx.fillText(`Cargo Moved: ${stats.economy.totalCargoMoved.toFixed(0)} tons`, centerX, y);
        y += 12;
        ctx.fillText(`Activity: ${stats.economy.marketActivity}/h`, centerX, y);
        y += 14;

        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== MANUFACTURING ===', centerX, y);
        y += 14;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Facilities: ${stats.manufacturing.activeFacilities}/${stats.manufacturing.totalFacilities}`, centerX, y);
        y += 12;
        ctx.fillText(`Utilization: ${(stats.manufacturing.facilityUtilization * 100).toFixed(0)}%`, centerX, y);
        y += 12;
        ctx.fillText(`Jobs: ${stats.manufacturing.activeJobs} active`, centerX, y);
        y += 12;
        ctx.fillText(`Completed: ${stats.manufacturing.completedJobs}`, centerX, y);
        y += 14;

        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== POPULATION ===', centerX, y);
        y += 14;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Total: ${(stats.population.totalPopulation / 1e6).toFixed(2)}M`, centerX, y);
        y += 12;
        const growthColor = stats.population.populationGrowth > 0 ? '#00ff00' : '#ff0000';
        ctx.fillStyle = growthColor;
        ctx.fillText(`Growth: ${(stats.population.populationGrowth * 100).toFixed(3)}%/h`, centerX, y);
        y += 12;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Happiness: ${(stats.population.averageHappiness * 100).toFixed(0)}%`, centerX, y);
        y += 12;
        ctx.fillText(`Health: ${(stats.population.averageHealth * 100).toFixed(0)}%`, centerX, y);
        y += 12;
        const unrestColor = stats.population.unrestLevel > 0.3 ? '#ff0000' : '#00ff00';
        ctx.fillStyle = unrestColor;
        ctx.fillText(`Unrest: ${(stats.population.unrestLevel * 100).toFixed(0)}%`, centerX, y);
        y += 12;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Births/Deaths: ${stats.population.births}/${stats.population.deaths}`, centerX, y);

        // === RIGHT COLUMN: FACTIONS & RESEARCH ===
        y = 15;
        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== FACTIONS ===', rightX, y);
        y += 14;

        const factions = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'INDEPENDENT', 'PIRATES'];
        for (const faction of factions) {
            const fStats = stats.factionStats.get(faction);
            if (!fStats) continue;

            const factionColor = faction === 'PIRATES' ? '#ff0000' :
                                faction === 'UNITED_EARTH' ? '#4444ff' :
                                faction === 'MARS_FEDERATION' ? '#ff8800' :
                                faction === 'BELT_ALLIANCE' ? '#888888' : '#00ff00';
            ctx.fillStyle = factionColor;
            const shortName = faction.substring(0, 12);
            ctx.fillText(`${shortName}:`, rightX, y);
            y += 12;
            ctx.fillStyle = '#00ff00';
            ctx.fillText(`  Ships: ${fStats.shipCount} (${fStats.combatShips}/${fStats.civilianShips})`, rightX, y);
            y += 12;
            if (fStats.activeWars > 0) {
                ctx.fillStyle = '#ff0000';
                ctx.fillText(`  Wars: ${fStats.activeWars}`, rightX, y);
                y += 12;
            }
            if (fStats.alliances > 0) {
                ctx.fillStyle = '#00ffff';
                ctx.fillText(`  Allies: ${fStats.alliances}`, rightX, y);
                y += 12;
            }
        }
        y += 2;

        ctx.fillStyle = '#00ffff';
        ctx.fillText('=== RESEARCH ===', rightX, y);
        y += 14;
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Projects: ${stats.research.activeProjects}`, rightX, y);
        y += 12;
        ctx.fillText(`Completed: ${stats.research.completedProjects}`, rightX, y);
        y += 12;
        ctx.fillText(`RP/hour: ${stats.research.researchPerHour.toFixed(0)}`, rightX, y);
        y += 12;
        ctx.fillText(`Breakthroughs: ${stats.research.breakthroughs}`, rightX, y);
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
