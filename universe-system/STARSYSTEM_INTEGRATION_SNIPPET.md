# StarSystem.ts Integration Snippet for Phase 3 4X Systems

This document contains the code snippets to add to StarSystem.ts to integrate all Phase 3 systems.

## 1. ADD IMPORTS (After line 40)

Add these imports after the existing imports:

```typescript
// Phase 3 4X Systems
import { ConstructionSystem } from './ConstructionSystem';
import { FactionExpansionAI } from './faction-dynamics/FactionExpansionAI';
import { ManufacturingSystem } from './ManufacturingSystem';
import { ProductionChainManager } from './EconomyIntegration';
import { ResearchSystem } from './ResearchSystem';
import { FactionResearchAI } from './faction-dynamics/FactionResearchAI';
import { PopulationSystem } from './PopulationSystem';
import { ConquestSystem } from './ConquestSystem';
import { FactionMilitaryAI } from './faction-dynamics/FactionMilitaryAI';
```

## 2. ADD PROPERTIES (After line 92, before line 94)

Add these properties to the StarSystem class:

```typescript
  // ========================================================================
  // PHASE 3: 4X GAMEPLAY SYSTEMS
  // ========================================================================

  // Construction & Expansion
  public constructionSystem: ConstructionSystem;
  public factionExpansionAIs: Map<string, FactionExpansionAI> = new Map();

  // Manufacturing & Production
  public manufacturingSystem: ManufacturingSystem;
  public productionChainManager: ProductionChainManager;

  // Research & Technology
  public researchSystem: ResearchSystem;
  public factionResearchAIs: Map<string, FactionResearchAI> = new Map();

  // Population Simulation
  public populationSystem: PopulationSystem;

  // Conquest & Military
  public conquestSystem: ConquestSystem;
  public factionMilitaryAIs: Map<string, FactionMilitaryAI> = new Map();
```

## 3. ADD INITIALIZATION (After line 195, before closing constructor)

Add this initialization code in the constructor, right after `this.initializeIntegratedUniverse(config);`:

```typescript
    // ========================================================================
    // PHASE 3: Initialize 4X Gameplay Systems
    // ========================================================================
    this.initializePhase3Systems(config);
```

## 4. ADD INITIALIZATION METHOD (After initializeIntegratedUniverse method, around line 1333)

Add this complete initialization method:

```typescript
  /**
   * Initialize Phase 3 4X Gameplay Systems
   */
  private initializePhase3Systems(config: StarSystemConfig): void {
    console.log(`[PHASE 3] Initializing 4X Gameplay Systems for ${this.name}...`);

    // ========================================================================
    // CONSTRUCTION SYSTEM
    // ========================================================================
    this.constructionSystem = new ConstructionSystem();

    // Setup construction completion callback
    this.constructionSystem.onConstructionComplete((project) => {
      console.log(`[CONSTRUCTION] ${project.owner} completed ${project.type} at`, project.position);
      // Create actual station/structure when construction completes
      // This will be handled by game engine layer
    });

    // ========================================================================
    // MANUFACTURING SYSTEM
    // ========================================================================
    this.manufacturingSystem = new ManufacturingSystem();
    this.productionChainManager = new ProductionChainManager(this.manufacturingSystem);

    // Initialize manufacturing facilities for existing stations
    this.stations.forEach(station => {
      // Determine facility type based on station type
      const facilityType = this.mapStationTypeToFacility(station.stationType);
      if (facilityType) {
        const facility = this.manufacturingSystem.createFacility(
          station.id,
          facilityType,
          station.faction
        );
        console.log(`[MANUFACTURING] Created ${facilityType} at ${station.name}`);
      }
    });

    // ========================================================================
    // RESEARCH SYSTEM
    // ========================================================================
    this.researchSystem = new ResearchSystem();

    // ========================================================================
    // POPULATION SYSTEM
    // ========================================================================
    this.populationSystem = new PopulationSystem();

    // Initialize population for cities (will be connected when cities are generated)
    // For now, mark as initialized

    // ========================================================================
    // CONQUEST SYSTEM
    // ========================================================================
    this.conquestSystem = new ConquestSystem();

    // Register all stations with conquest system
    this.stations.forEach(station => {
      this.conquestSystem.registerTerritory({
        id: station.id,
        name: station.name,
        type: 'STATION',
        owner: station.faction,
        position: station.position,
        defenseRating: station.defenseRating || 5,
        population: station.population || 10000,
        strategicValue: this.calculateStrategicValue(station)
      });
    });

    // ========================================================================
    // FACTION AI SYSTEMS
    // ========================================================================
    // Initialize AI systems for each faction found in stations
    const factions = new Set(this.stations.map(s => s.faction));

    factions.forEach(factionName => {
      // Get faction data (would be from a faction registry in full implementation)
      const factionStations = this.stations.filter(s => s.faction === factionName);
      const factionShips = this.trafficManager.getAllVessels().filter((s: any) => s.faction === factionName);

      // Create a simplified faction object for AI systems
      const faction = {
        name: factionName,
        credits: 100000, // Starting credits
        homeworld: factionStations[0]?.position || this.star.position,
        personality: {
          militaristic: Math.random(),
          expansionist: Math.random(),
          diplomatic: Math.random(),
          economic: Math.random()
        },
        relations: new Map<string, number>(),
        militaryStrength: factionShips.length * 10,
        economicStrength: factionStations.length * 100,
        technologyLevel: 1
      };

      // Initialize Expansion AI
      const expansionAI = new FactionExpansionAI(
        faction as any,
        this,
        this.constructionSystem
      );
      this.factionExpansionAIs.set(factionName, expansionAI);

      // Initialize Research AI
      const researchAI = new FactionResearchAI(
        faction as any,
        this.researchSystem
      );
      this.factionResearchAIs.set(factionName, researchAI);

      // Initialize Military AI
      const militaryAI = new FactionMilitaryAI(
        this.conquestSystem,
        this.factionDiplomacy,
        this.economicNeeds
      );

      // Set faction doctrine based on personality
      let doctrine: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE' | 'EXPANSIONIST' | 'OPPORTUNISTIC' = 'BALANCED';
      if (faction.personality.militaristic > 0.7) doctrine = 'AGGRESSIVE';
      else if (faction.personality.expansionist > 0.7) doctrine = 'EXPANSIONIST';
      else if (faction.personality.militaristic < 0.3) doctrine = 'DEFENSIVE';

      militaryAI.initializeFaction(factionName as any, doctrine);

      // Register faction's territories
      factionStations.forEach(station => {
        militaryAI.registerStation(station as any);
      });

      this.factionMilitaryAIs.set(factionName, militaryAI);

      console.log(`[FACTION AI] Initialized AI systems for ${factionName}: ${factionStations.length} stations, ${factionShips.length} ships`);
    });

    console.log(`[PHASE 3] 4X Systems initialized:`);
    console.log(`  - Construction: Ready`);
    console.log(`  - Manufacturing: ${this.manufacturingSystem.getAllFacilities().length} facilities`);
    console.log(`  - Research: ${this.researchSystem.getAllTechnologies().length} technologies`);
    console.log(`  - Population: Ready`);
    console.log(`  - Conquest: ${this.conquestSystem.getAllTerritories().length} territories`);
    console.log(`  - Faction AIs: ${factions.size} factions with expansion/research/military AI`);
  }

  /**
   * Map station type to manufacturing facility type
   */
  private mapStationTypeToFacility(stationType: string): string | null {
    const mapping: Record<string, string> = {
      'REFINERY': 'REFINERY',
      'MANUFACTURING_CENTER': 'FACTORY',
      'INDUSTRIAL_COMPLEX': 'FACTORY',
      'SHIPYARD': 'SHIPYARD',
      'RESEARCH_FACILITY': 'ELECTRONICS_PLANT',
      'MINING_PLATFORM': 'REFINERY'
    };

    return mapping[stationType] || null;
  }

  /**
   * Calculate strategic value of a station
   */
  private calculateStrategicValue(station: SpaceStation): number {
    let value = 1.0;

    // Economic value
    if (station.stationType === 'TRADING_HUB') value += 2.0;
    if (station.stationType === 'REFINERY') value += 1.5;
    if (station.stationType === 'MANUFACTURING_CENTER') value += 1.5;

    // Military value
    if (station.stationType === 'MILITARY_BASE') value += 3.0;
    if (station.stationType === 'SHIPYARD') value += 2.0;

    // Research value
    if (station.stationType === 'RESEARCH_FACILITY') value += 2.0;

    // Population value
    value += (station.population || 0) / 50000;

    return Math.min(value, 10.0);
  }
```

## 5. ADD UPDATE CALLS (In the update() method, after line 993)

Add these update calls in the update method, right after the integrated orchestrator update:

```typescript
    // ========================================================================
    // PHASE 3: 4X SYSTEMS UPDATE
    // ========================================================================

    const currentTime = Date.now() / 1000; // Convert to seconds

    // Update Construction System
    this.constructionSystem.update(deltaTime);

    // Update Manufacturing System
    this.manufacturingSystem.update(deltaTime);

    // Update Population System (every hour)
    if (Math.floor(currentTime) % 3600 === 0) {
      // this.populationSystem.update(3600, allCities);
      // Note: Will be connected when city system is integrated
    }

    // Update Conquest System
    this.conquestSystem.update(deltaTime);

    // Update Faction AI Systems
    this.factionExpansionAIs.forEach((expansionAI, factionName) => {
      expansionAI.update(deltaTime, currentTime);
    });

    this.factionResearchAIs.forEach((researchAI, factionName) => {
      researchAI.update(deltaTime);
    });

    this.factionMilitaryAIs.forEach((militaryAI, factionName) => {
      militaryAI.update(currentTime, deltaTime);
    });
```

## Implementation Checklist

- [ ] Add imports (Section 1)
- [ ] Add properties (Section 2)
- [ ] Add initialization call in constructor (Section 3)
- [ ] Add initializePhase3Systems method (Section 4)
- [ ] Add update calls (Section 5)
- [ ] Test that StarSystem still compiles
- [ ] Test that all systems are initialized
- [ ] Test that updates run without errors

## Notes

- All new systems are self-contained and won't break existing functionality
- The integrated orchestrator will continue to work alongside Phase 3 systems
- Faction AI systems create simplified faction objects since full faction system may not be fully implemented yet
- Population system is initialized but city integration is marked as a TODO for when city generation is enhanced
- Construction completion callback is set up for game engine integration
