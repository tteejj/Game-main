/**
 * Universe Simulation Test - Run and monitor the complete universe
 *
 * This script:
 * 1. Creates a complete star system with all 4X systems
 * 2. Runs the simulation for a period
 * 3. Logs detailed metrics and trends
 * 4. Reports on economic, military, diplomatic, and population dynamics
 */

import { StarSystem } from '../StarSystem';

// Simulation metrics tracking
interface SimulationMetrics {
  tick: number;
  timestamp: number;

  // Economic metrics
  totalCreditsInEconomy: number;
  totalTradeVolume: number;
  averageStationWealth: number;

  // Population metrics
  totalPopulation: number;
  populationGrowthRate: number;
  averageHappiness: number;

  // Military metrics
  totalFleets: number;
  activeConflicts: number;

  // Diplomatic metrics
  averageRelations: number;
  activeAlliances: number;
  activeWars: number;

  // Research metrics
  totalResearchProjects: number;
  completedProjects: number;

  // Construction metrics
  activeConstructions: number;
  completedBuildings: number;

  // NPC activity
  activeNPCShips: number;
  tradingShips: number;
  miningShips: number;
  militaryShips: number;
}

class UniverseSimulationTest {
  private starSystem!: StarSystem;

  private metrics: SimulationMetrics[] = [];
  private tickCount: number = 0;
  private startTime: number = 0;

  private factionIds = [
    'FEDERATION',
    'EMPIRE',
    'REPUBLIC',
    'SYNDICATE',
    'ALLIANCE'
  ];

  constructor() {}

  // Initialize the universe
  public async initialize(): Promise<void> {
    console.log('═'.repeat(80));
    console.log('UNIVERSE SIMULATION TEST');
    console.log('═'.repeat(80));
    console.log('');

    console.log('Initializing Star System...');
    console.log('─'.repeat(80));

    // Create star system with all features enabled
    this.starSystem = new StarSystem(
      'test_system_001',
      'Alpha Centauri',
      {
        seed: 42,
        numPlanets: { min: 4, max: 6 },
        allowAsteroidBelt: true,
        allowStations: true,
        allowSatellites: true,
        allowHazards: true,
        allowNPCTraffic: true,
        allowCommunications: true,
        allowPOIs: true,
        civilizationLevel: 8  // High tech system
      }
    );

    console.log(`✓ Star System created: ${this.starSystem.name}`);
    console.log(`  - Star: ${this.starSystem.star.name} (${this.starSystem.star.starClass})`);
    console.log(`  - Planets: ${this.starSystem.planets.length}`);
    console.log(`  - Moons: ${this.starSystem.moons.length}`);
    console.log(`  - Stations: ${this.starSystem.stations.length}`);
    console.log(`  - Asteroids: ${this.starSystem.asteroids.length}`);
    console.log('');

    this.startTime = Date.now();
    console.log('✓ Initialization complete!');
    console.log('');
  }

  // Run simulation for specified duration
  public async runSimulation(durationSeconds: number, reportIntervalSeconds: number = 5): Promise<void> {
    console.log('═'.repeat(80));
    console.log(`RUNNING SIMULATION FOR ${durationSeconds} SECONDS`);
    console.log('═'.repeat(80));
    console.log('');

    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    let lastReportTime = startTime;
    let lastMetricsTime = startTime;

    const deltaTime = 1/60; // 60 FPS simulation

    while (Date.now() < endTime) {
      this.tickCount++;

      // Update star system
      this.starSystem.update(deltaTime);

      // Collect metrics every second
      if (Date.now() - lastMetricsTime >= 1000) {
        this.collectMetrics();
        lastMetricsTime = Date.now();
      }

      // Report progress at intervals
      if (Date.now() - lastReportTime >= reportIntervalSeconds * 1000) {
        this.reportProgress();
        lastReportTime = Date.now();
      }

      // Yield to prevent blocking (in real use, this would be handled by game loop)
      await this.sleep(16); // ~60 FPS
    }

    console.log('');
    console.log('═'.repeat(80));
    console.log('SIMULATION COMPLETE');
    console.log('═'.repeat(80));
    console.log('');

    this.reportFinalResults();
  }

  // Collect current metrics
  private collectMetrics(): void {
    const metric: SimulationMetrics = {
      tick: this.tickCount,
      timestamp: Date.now() - this.startTime,

      // Economic
      totalCreditsInEconomy: this.calculateTotalCredits(),
      totalTradeVolume: this.calculateTradeVolume(),
      averageStationWealth: this.calculateAverageStationWealth(),

      // Population
      totalPopulation: this.calculateTotalPopulation(),
      populationGrowthRate: this.calculatePopulationGrowth(),
      averageHappiness: this.calculateAverageHappiness(),

      // Military
      totalFleets: this.countFleets(),
      activeConflicts: this.countConflicts(),

      // Diplomatic
      averageRelations: this.calculateAverageRelations(),
      activeAlliances: this.countAlliances(),
      activeWars: this.countWars(),

      // Research
      totalResearchProjects: this.countResearchProjects(),
      completedProjects: this.countCompletedResearch(),

      // Construction
      activeConstructions: this.countActiveConstructions(),
      completedBuildings: this.countCompletedBuildings(),

      // NPC
      activeNPCShips: this.starSystem.trafficManager?.ships.length || 0,
      tradingShips: this.countShipsByType('TRADER'),
      miningShips: this.countShipsByType('MINING'),
      militaryShips: this.countShipsByType('MILITARY')
    };

    this.metrics.push(metric);
  }

  // Report current progress
  private reportProgress(): void {
    if (this.metrics.length === 0) return;

    const current = this.metrics[this.metrics.length - 1];
    const elapsed = (current.timestamp / 1000).toFixed(1);

    console.log(`[T+${elapsed}s] Tick ${current.tick}`);
    console.log(`  Economy: ${current.totalCreditsInEconomy.toLocaleString()} credits | Trade: ${current.totalTradeVolume.toLocaleString()}`);
    console.log(`  Population: ${current.totalPopulation.toLocaleString()} | Growth: ${current.populationGrowthRate.toFixed(2)}%`);
    console.log(`  Military: ${current.totalFleets} fleets | ${current.activeConflicts} conflicts`);
    console.log(`  Diplomacy: Avg relations ${current.averageRelations.toFixed(2)} | ${current.activeAlliances} alliances | ${current.activeWars} wars`);
    console.log(`  Research: ${current.totalResearchProjects} active | ${current.completedProjects} completed`);
    console.log(`  Construction: ${current.activeConstructions} active | ${current.completedBuildings} completed`);
    console.log(`  NPCs: ${current.activeNPCShips} ships (${current.tradingShips} traders, ${current.miningShips} miners, ${current.militaryShips} military)`);
    console.log('');
  }

  // Report final results with trends
  private reportFinalResults(): void {
    if (this.metrics.length === 0) {
      console.log('No metrics collected!');
      return;
    }

    const first = this.metrics[0];
    const last = this.metrics[this.metrics.length - 1];

    console.log('FINAL RESULTS');
    console.log('─'.repeat(80));
    console.log(`Total Ticks: ${this.tickCount}`);
    console.log(`Duration: ${(last.timestamp / 1000).toFixed(1)} seconds`);
    console.log('');

    console.log('ECONOMIC TRENDS:');
    console.log(`  Total Credits: ${first.totalCreditsInEconomy.toLocaleString()} → ${last.totalCreditsInEconomy.toLocaleString()} (${this.calculateChange(first.totalCreditsInEconomy, last.totalCreditsInEconomy)})`);
    console.log(`  Trade Volume: ${first.totalTradeVolume.toLocaleString()} → ${last.totalTradeVolume.toLocaleString()} (${this.calculateChange(first.totalTradeVolume, last.totalTradeVolume)})`);
    console.log(`  Avg Station Wealth: ${first.averageStationWealth.toLocaleString()} → ${last.averageStationWealth.toLocaleString()} (${this.calculateChange(first.averageStationWealth, last.averageStationWealth)})`);
    console.log('');

    console.log('POPULATION TRENDS:');
    console.log(`  Total Population: ${first.totalPopulation.toLocaleString()} → ${last.totalPopulation.toLocaleString()} (${this.calculateChange(first.totalPopulation, last.totalPopulation)})`);
    console.log(`  Growth Rate: ${first.populationGrowthRate.toFixed(2)}% → ${last.populationGrowthRate.toFixed(2)}%`);
    console.log(`  Avg Happiness: ${first.averageHappiness.toFixed(2)} → ${last.averageHappiness.toFixed(2)}`);
    console.log('');

    console.log('MILITARY TRENDS:');
    console.log(`  Total Fleets: ${first.totalFleets} → ${last.totalFleets} (${this.calculateChange(first.totalFleets, last.totalFleets)})`);
    console.log(`  Conflicts: ${first.activeConflicts} → ${last.activeConflicts}`);
    console.log('');

    console.log('DIPLOMATIC TRENDS:');
    console.log(`  Avg Relations: ${first.averageRelations.toFixed(2)} → ${last.averageRelations.toFixed(2)}`);
    console.log(`  Alliances: ${first.activeAlliances} → ${last.activeAlliances} (${this.calculateChange(first.activeAlliances, last.activeAlliances)})`);
    console.log(`  Wars: ${first.activeWars} → ${last.activeWars} (${this.calculateChange(first.activeWars, last.activeWars)})`);
    console.log('');

    console.log('RESEARCH & CONSTRUCTION:');
    console.log(`  Research Projects: ${first.totalResearchProjects} → ${last.totalResearchProjects}`);
    console.log(`  Completed Research: ${first.completedProjects} → ${last.completedProjects} (+${last.completedProjects - first.completedProjects})`);
    console.log(`  Active Constructions: ${first.activeConstructions} → ${last.activeConstructions}`);
    console.log(`  Completed Buildings: ${first.completedBuildings} → ${last.completedBuildings} (+${last.completedBuildings - first.completedBuildings})`);
    console.log('');

    console.log('NPC ACTIVITY:');
    console.log(`  Total Ships: ${first.activeNPCShips} → ${last.activeNPCShips} (${this.calculateChange(first.activeNPCShips, last.activeNPCShips)})`);
    console.log(`  Traders: ${first.tradingShips} → ${last.tradingShips}`);
    console.log(`  Miners: ${first.miningShips} → ${last.miningShips}`);
    console.log(`  Military: ${first.militaryShips} → ${last.militaryShips}`);
    console.log('');
  }

  // Helper methods for metrics calculation
  private calculateTotalCredits(): number {
    let total = 0;
    for (const [_, market] of this.starSystem.markets) {
      // Markets don't have credits directly, use station wealth
      total += 1000000; // Placeholder
    }
    return total;
  }

  private calculateTradeVolume(): number {
    // Use manufacturing output as proxy
    if (!this.starSystem.manufacturingSystem) return 0;
    return this.starSystem.manufacturingSystem.getTotalOutput();
  }

  private calculateAverageStationWealth(): number {
    if (this.starSystem.stations.length === 0) return 0;
    return this.calculateTotalCredits() / this.starSystem.stations.length;
  }

  private calculateTotalPopulation(): number {
    if (!this.starSystem.populationSystem) return 0;
    return this.starSystem.populationSystem.getTotalPopulation();
  }

  private calculatePopulationGrowth(): number {
    if (!this.starSystem.populationSystem) return 0;
    const total = this.starSystem.populationSystem.getTotalPopulation();
    if (total === 0) return 0;
    // Simplified growth rate calculation
    return ((total / 1000000) - 1) * 100;
  }

  private calculateAverageHappiness(): number {
    if (!this.starSystem.populationSystem) return 0;
    return this.starSystem.populationSystem.getAverageHappiness();
  }

  private countFleets(): number {
    if (!this.starSystem.fleetCoordinationSystem) return 0;
    return this.starSystem.fleetCoordinationSystem.getAllFleets().length;
  }

  private countConflicts(): number {
    if (!this.starSystem.conquestSystem) return 0;
    return this.starSystem.conquestSystem.getActiveSieges().length;
  }

  private calculateAverageRelations(): number {
    if (!this.starSystem.factionDiplomacy) return 0;
    let total = 0;
    let count = 0;
    for (let i = 0; i < this.factionIds.length; i++) {
      for (let j = i + 1; j < this.factionIds.length; j++) {
        total += this.starSystem.factionDiplomacy.getRelationship(
          this.factionIds[i],
          this.factionIds[j]
        );
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  private countAlliances(): number {
    if (!this.starSystem.factionDiplomacy) return 0;
    return this.starSystem.factionDiplomacy.getAllAlliances().length;
  }

  private countWars(): number {
    if (!this.starSystem.factionDiplomacy) return 0;
    return this.starSystem.factionDiplomacy.getActiveWars().length;
  }

  private countResearchProjects(): number {
    if (!this.starSystem.researchSystem) return 0;
    return this.starSystem.researchSystem.getActiveProjects().length;
  }

  private countCompletedResearch(): number {
    if (!this.starSystem.researchSystem) return 0;
    return this.starSystem.researchSystem.getCompletedProjects().length;
  }

  private countActiveConstructions(): number {
    if (!this.starSystem.constructionSystem) return 0;
    return this.starSystem.constructionSystem.getActiveProjects().length;
  }

  private countCompletedBuildings(): number {
    if (!this.starSystem.constructionSystem) return 0;
    return this.starSystem.constructionSystem.getCompletedProjects().length;
  }

  private countShipsByType(type: string): number {
    if (!this.starSystem.trafficManager) return 0;
    return this.starSystem.trafficManager.ships.filter(
      ship => ship.type.toUpperCase().includes(type)
    ).length;
  }

  private getFactionName(id: string): string {
    const names: Record<string, string> = {
      'FEDERATION': 'United Federation of Planets',
      'EMPIRE': 'Galactic Empire',
      'REPUBLIC': 'Democratic Republic',
      'SYNDICATE': 'Trade Syndicate',
      'ALLIANCE': 'Free Alliance'
    };
    return names[id] || id;
  }

  private calculateChange(from: number, to: number): string {
    if (from === 0) return to > 0 ? '+∞' : '0%';
    const change = ((to - from) / from) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the simulation
async function main() {
  const test = new UniverseSimulationTest();

  try {
    await test.initialize();
    await test.runSimulation(60, 10); // Run for 60 seconds, report every 10 seconds
  } catch (error) {
    console.error('Error during simulation:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { UniverseSimulationTest };
