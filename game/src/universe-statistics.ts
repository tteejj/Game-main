/**
 * COMPREHENSIVE UNIVERSE STATISTICS
 * Tracks EVERYTHING happening in the universe for complete visibility
 */

export interface FactionStats {
    name: string;
    shipCount: number;
    combatShips: number;
    civilianShips: number;
    totalWealth: number;
    activeWars: number;
    alliances: number;
    territoryControl: number; // 0-1
    militaryStrength: number;
    economicPower: number;
    researchLevel: number;
    population: number;
    populationGrowthRate: number; // per hour
}

export interface CombatStats {
    totalEngagements: number;
    engagementsLastHour: number;
    totalDamageDealt: number;
    totalShipsDestroyed: number;
    pirateAttacks: number;
    factionBattles: number;
    playerKills: number;
    playerDeaths: number;
}

export interface EconomicStats {
    totalTradeVolume: number; // credits
    tradeTransactions: number;
    averageTradeValue: number;
    totalCargoMoved: number; // tons
    commodityPrices: Map<string, { current: number, change24h: number }>;
    stationRevenue: Map<string, number>;
    marketActivity: number; // transactions per hour
}

export interface ManufacturingStats {
    totalFacilities: number;
    activeFacilities: number;
    totalProduction: number; // tons per hour
    completedJobs: number;
    activeJobs: number;
    facilityUtilization: number; // 0-1
    productionByType: Map<string, number>;
    resourceConsumption: Map<string, number>;
}

export interface PopulationStats {
    totalPopulation: number;
    populationGrowth: number; // per hour
    averageHappiness: number; // 0-1
    averageHealth: number; // 0-1
    unemployment: number; // 0-1
    unrestLevel: number; // 0-1
    migrations: number; // last hour
    births: number;
    deaths: number;
    citiesTotal: number;
}

export interface ResearchStats {
    activeProjects: number;
    completedProjects: number;
    totalResearchPoints: number;
    researchPerHour: number;
    techLevelByFaction: Map<string, number>;
    breakthroughs: number;
}

export interface TerritoryStats {
    controlledSystems: Map<string, string>; // system -> faction
    disputedTerritories: number;
    expansionRate: number; // systems per day
    colonizationMissions: number;
}

export interface TrafficStats {
    totalShips: number;
    shipsByType: Map<string, number>;
    shipsByFaction: Map<string, number>;
    averageSpeed: number;
    totalDistanceTraveled: number;
    dockingEvents: number;
}

/**
 * Comprehensive statistics tracker for the entire universe
 */
export class UniverseStatistics {
    // Core statistics
    public factionStats: Map<string, FactionStats> = new Map();
    public combat: CombatStats;
    public economy: EconomicStats;
    public manufacturing: ManufacturingStats;
    public population: PopulationStats;
    public research: ResearchStats;
    public territory: TerritoryStats;
    public traffic: TrafficStats;

    // Time tracking
    public gameTime: number = 0;
    public realTime: number = 0;
    public timeAcceleration: number = 1.0;

    // Event counters (last hour)
    private hourlyEvents: {
        combatEngagements: number;
        trades: number;
        migrations: number;
        productions: number;
        research: number;
        expansions: number;
    } = {
        combatEngagements: 0,
        trades: 0,
        migrations: 0,
        productions: 0,
        research: 0,
        expansions: 0
    };

    private lastHourReset: number = 0;

    constructor() {
        this.combat = {
            totalEngagements: 0,
            engagementsLastHour: 0,
            totalDamageDealt: 0,
            totalShipsDestroyed: 0,
            pirateAttacks: 0,
            factionBattles: 0,
            playerKills: 0,
            playerDeaths: 0
        };

        this.economy = {
            totalTradeVolume: 0,
            tradeTransactions: 0,
            averageTradeValue: 0,
            totalCargoMoved: 0,
            commodityPrices: new Map(),
            stationRevenue: new Map(),
            marketActivity: 0
        };

        this.manufacturing = {
            totalFacilities: 0,
            activeFacilities: 0,
            totalProduction: 0,
            completedJobs: 0,
            activeJobs: 0,
            facilityUtilization: 0,
            productionByType: new Map(),
            resourceConsumption: new Map()
        };

        this.population = {
            totalPopulation: 0,
            populationGrowth: 0,
            averageHappiness: 0,
            averageHealth: 0,
            unemployment: 0,
            unrestLevel: 0,
            migrations: 0,
            births: 0,
            deaths: 0,
            citiesTotal: 0
        };

        this.research = {
            activeProjects: 0,
            completedProjects: 0,
            totalResearchPoints: 0,
            researchPerHour: 0,
            techLevelByFaction: new Map(),
            breakthroughs: 0
        };

        this.territory = {
            controlledSystems: new Map(),
            disputedTerritories: 0,
            expansionRate: 0,
            colonizationMissions: 0
        };

        this.traffic = {
            totalShips: 0,
            shipsByType: new Map(),
            shipsByFaction: new Map(),
            averageSpeed: 0,
            totalDistanceTraveled: 0,
            dockingEvents: 0
        };
    }

    /**
     * Update statistics (call every frame or every second)
     */
    update(deltaTime: number, gameTime: number, timeAcceleration: number): void {
        this.gameTime = gameTime;
        this.realTime += deltaTime;
        this.timeAcceleration = timeAcceleration;

        // Reset hourly counters every hour of game time
        if (gameTime - this.lastHourReset >= 3600) {
            this.combat.engagementsLastHour = this.hourlyEvents.combatEngagements;
            this.economy.marketActivity = this.hourlyEvents.trades;
            this.population.migrations = this.hourlyEvents.migrations;

            // Reset counters
            this.hourlyEvents = {
                combatEngagements: 0,
                trades: 0,
                migrations: 0,
                productions: 0,
                research: 0,
                expansions: 0
            };
            this.lastHourReset = gameTime;
        }
    }

    /**
     * Record a combat engagement
     */
    recordCombat(damage: number, attacker: string, defender: string, destroyed: boolean): void {
        this.combat.totalEngagements++;
        this.hourlyEvents.combatEngagements++;
        this.combat.totalDamageDealt += damage;

        if (destroyed) {
            this.combat.totalShipsDestroyed++;
        }

        // Check if pirate or faction combat
        if (attacker === 'PIRATES' || defender === 'PIRATES') {
            this.combat.pirateAttacks++;
        } else if (attacker !== 'PLAYER' && defender !== 'PLAYER') {
            this.combat.factionBattles++;
        }

        if (attacker === 'PLAYER' && destroyed) {
            this.combat.playerKills++;
        }
        if (defender === 'PLAYER' && destroyed) {
            this.combat.playerDeaths++;
        }
    }

    /**
     * Record a trade transaction
     */
    recordTrade(value: number, cargoMass: number, stationId: string): void {
        this.economy.tradeTransactions++;
        this.hourlyEvents.trades++;
        this.economy.totalTradeVolume += value;
        this.economy.totalCargoMoved += cargoMass;
        this.economy.averageTradeValue = this.economy.totalTradeVolume / this.economy.tradeTransactions;

        const revenue = this.economy.stationRevenue.get(stationId) || 0;
        this.economy.stationRevenue.set(stationId, revenue + value * 0.05); // 5% commission
    }

    /**
     * Update commodity price
     */
    updateCommodityPrice(commodity: string, price: number, previousPrice: number): void {
        const change = ((price - previousPrice) / previousPrice) * 100;
        this.economy.commodityPrices.set(commodity, {
            current: price,
            change24h: change
        });
    }

    /**
     * Record manufacturing activity
     */
    recordManufacturing(completed: boolean, production: number, resourceType: string): void {
        if (completed) {
            this.manufacturing.completedJobs++;
            this.hourlyEvents.productions++;
        }

        const current = this.manufacturing.productionByType.get(resourceType) || 0;
        this.manufacturing.productionByType.set(resourceType, current + production);
    }

    /**
     * Update population statistics
     */
    updatePopulation(
        total: number,
        growth: number,
        happiness: number,
        health: number,
        unemployment: number,
        unrest: number,
        births: number,
        deaths: number,
        cities: number
    ): void {
        this.population.totalPopulation = total;
        this.population.populationGrowth = growth;
        this.population.averageHappiness = happiness;
        this.population.averageHealth = health;
        this.population.unemployment = unemployment;
        this.population.unrestLevel = unrest;
        this.population.births = births;
        this.population.deaths = deaths;
        this.population.citiesTotal = cities;
    }

    /**
     * Record migration event
     */
    recordMigration(populationMoved: number): void {
        this.hourlyEvents.migrations++;
    }

    /**
     * Update faction statistics
     */
    updateFactionStats(faction: string, stats: Partial<FactionStats>): void {
        const current = this.factionStats.get(faction) || {
            name: faction,
            shipCount: 0,
            combatShips: 0,
            civilianShips: 0,
            totalWealth: 0,
            activeWars: 0,
            alliances: 0,
            territoryControl: 0,
            militaryStrength: 0,
            economicPower: 0,
            researchLevel: 0,
            population: 0,
            populationGrowthRate: 0
        };

        this.factionStats.set(faction, { ...current, ...stats });
    }

    /**
     * Update traffic statistics
     */
    updateTraffic(ships: any[]): void {
        this.traffic.totalShips = ships.length;
        this.traffic.shipsByType.clear();
        this.traffic.shipsByFaction.clear();

        let totalSpeed = 0;
        let totalDistance = 0;

        for (const ship of ships) {
            // Count by type
            const typeCount = this.traffic.shipsByType.get(ship.type) || 0;
            this.traffic.shipsByType.set(ship.type, typeCount + 1);

            // Count by faction
            const factionCount = this.traffic.shipsByFaction.get(ship.faction) || 0;
            this.traffic.shipsByFaction.set(ship.faction, factionCount + 1);

            // Aggregate metrics
            const speed = ship.getVelocity ? ship.getVelocity().length() : 0;
            totalSpeed += speed;

            const pos = ship.getPosition ? ship.getPosition() : ship.position;
            if (pos) {
                totalDistance += Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
            }
        }

        this.traffic.averageSpeed = ships.length > 0 ? totalSpeed / ships.length : 0;
    }

    /**
     * Record research progress
     */
    recordResearch(faction: string, points: number, breakthrough: boolean): void {
        this.research.totalResearchPoints += points;
        this.hourlyEvents.research += points;

        if (breakthrough) {
            this.research.completedProjects++;
            this.research.breakthroughs++;
        }

        const techLevel = this.research.techLevelByFaction.get(faction) || 1;
        if (breakthrough) {
            this.research.techLevelByFaction.set(faction, techLevel + 1);
        }
    }

    /**
     * Record territory change
     */
    recordTerritoryChange(system: string, newOwner: string): void {
        this.territory.controlledSystems.set(system, newOwner);
        this.hourlyEvents.expansions++;
    }

    /**
     * Get formatted statistics summary
     */
    getSummary(): string {
        const lines: string[] = [];
        lines.push('=== UNIVERSE STATISTICS ===');
        lines.push(`Game Time: ${(this.gameTime / 3600).toFixed(1)}h (${this.timeAcceleration}x)`);
        lines.push('');

        // Traffic
        lines.push('TRAFFIC:');
        lines.push(`  Ships: ${this.traffic.totalShips}`);
        for (const [faction, count] of this.traffic.shipsByFaction) {
            lines.push(`    ${faction}: ${count}`);
        }
        lines.push(`  Avg Speed: ${(this.traffic.averageSpeed / 1000).toFixed(1)} km/s`);
        lines.push('');

        // Combat
        lines.push('COMBAT:');
        lines.push(`  Total Engagements: ${this.combat.totalEngagements}`);
        lines.push(`  Last Hour: ${this.combat.engagementsLastHour}`);
        lines.push(`  Pirate Attacks: ${this.combat.pirateAttacks}`);
        lines.push(`  Faction Battles: ${this.combat.factionBattles}`);
        lines.push(`  Ships Destroyed: ${this.combat.totalShipsDestroyed}`);
        lines.push('');

        // Economy
        lines.push('ECONOMY:');
        lines.push(`  Trade Volume: ${this.economy.totalTradeVolume.toFixed(0)} CR`);
        lines.push(`  Transactions: ${this.economy.tradeTransactions}`);
        lines.push(`  Avg Trade: ${this.economy.averageTradeValue.toFixed(0)} CR`);
        lines.push(`  Cargo Moved: ${this.economy.totalCargoMoved.toFixed(0)} tons`);
        lines.push(`  Market Activity: ${this.economy.marketActivity}/hour`);
        lines.push('');

        // Manufacturing
        lines.push('MANUFACTURING:');
        lines.push(`  Facilities: ${this.manufacturing.activeFacilities}/${this.manufacturing.totalFacilities}`);
        lines.push(`  Utilization: ${(this.manufacturing.facilityUtilization * 100).toFixed(1)}%`);
        lines.push(`  Jobs Completed: ${this.manufacturing.completedJobs}`);
        lines.push(`  Active Jobs: ${this.manufacturing.activeJobs}`);
        lines.push(`  Production: ${this.manufacturing.totalProduction.toFixed(0)} tons/h`);
        lines.push('');

        // Population
        lines.push('POPULATION:');
        lines.push(`  Total: ${(this.population.totalPopulation / 1e6).toFixed(2)}M`);
        lines.push(`  Growth: ${(this.population.populationGrowth * 100).toFixed(3)}%/hour`);
        lines.push(`  Happiness: ${(this.population.averageHappiness * 100).toFixed(1)}%`);
        lines.push(`  Health: ${(this.population.averageHealth * 100).toFixed(1)}%`);
        lines.push(`  Unemployment: ${(this.population.unemployment * 100).toFixed(1)}%`);
        lines.push(`  Unrest: ${(this.population.unrestLevel * 100).toFixed(1)}%`);
        lines.push(`  Cities: ${this.population.citiesTotal}`);
        lines.push('');

        // Research
        lines.push('RESEARCH:');
        lines.push(`  Active Projects: ${this.research.activeProjects}`);
        lines.push(`  Completed: ${this.research.completedProjects}`);
        lines.push(`  Breakthroughs: ${this.research.breakthroughs}`);
        lines.push(`  Total RP: ${this.research.totalResearchPoints.toFixed(0)}`);
        lines.push(`  RP/hour: ${this.research.researchPerHour.toFixed(1)}`);
        lines.push('');

        return lines.join('\n');
    }
}
