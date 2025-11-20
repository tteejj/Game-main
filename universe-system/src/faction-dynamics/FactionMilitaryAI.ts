/**
 * FactionMilitaryAI.ts - Autonomous Military Decision Making
 *
 * Makes factions act like living civilizations with military ambitions:
 * - Identify conquest targets (enemy stations/colonies)
 * - Evaluate military feasibility
 * - Launch sieges when advantageous
 * - Maintain garrisons on captured territory
 * - Respond to threats and opportunities
 * - Dynamic borders that shift with wars
 * - Strategic military planning
 */

import { Vector3 } from '../CelestialBody';
import { SpaceStation, StationFaction } from '../StationGenerator';
import { PlanetaryCity } from '../PlanetaryCities';
import { ConquestSystem, SiegeOperation, OccupationState } from '../ConquestSystem';
import { FactionDiplomacyEngine, DiplomaticStatus } from './FactionDiplomacyEngine';
import { FactionEconomicNeeds } from './FactionEconomicNeeds';
import { getGlobalEventBus, UniverseEventType, EventPriority } from '../UniverseEventSystem';

export interface MilitaryTarget {
  id: string;
  name: string;
  type: 'STATION' | 'CITY';
  location: Vector3;

  // Owner
  ownerFaction: StationFaction;

  // Military assessment
  defenseRating: number;             // 0-10
  garrisonStrength: number;           // Estimated military personnel
  estimatedDefenders: number;

  // Strategic value
  strategicValue: number;             // 0-10 (how important to capture)
  economicValue: number;              // Credits per year
  populationValue: number;            // Population size
  resourceValue: number;              // Resource production

  // Tactical
  distance: number;                   // Distance from our nearest base
  supportingAllies: number;           // Allied stations nearby
  vulnerabilityScore: number;         // 0-1 (1 = easy target)

  // Feasibility
  feasibilityScore: number;           // 0-1 (1 = very feasible)
  requiredForce: number;              // Troops needed to capture
  estimatedCasualties: number;        // Expected losses
  estimatedDuration: number;          // Days to capture

  // Priority
  priorityScore: number;              // Overall conquest priority (0-100)
}

export interface MilitaryOperation {
  id: string;
  type: OperationType;
  faction: StationFaction;

  // Target
  targetId: string;
  targetName: string;

  // Forces
  forcesCommitted: number;
  reserveForces: number;

  // Status
  status: OperationStatus;
  progress: number;                   // 0-1

  // Timeline
  plannedAt: number;
  launchedAt?: number;
  completedAt?: number;

  // Outcome
  success?: boolean;
  casualtiesInflicted: number;
  casualtiesSuffered: number;
}

export type OperationType =
  | 'SIEGE'
  | 'RAID'
  | 'LIBERATION'
  | 'GARRISON_REINFORCEMENT'
  | 'PATROL'
  | 'BLOCKADE';

export type OperationStatus =
  | 'PLANNING'
  | 'MOBILIZING'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface FactionMilitaryState {
  factionId: StationFaction;

  // Military strength
  totalMilitaryPersonnel: number;
  availableForces: number;             // Not deployed
  deployedForces: number;
  reserveForces: number;

  // Military tech level
  techLevel: number;                   // 0-10
  trainingLevel: number;               // 0-1
  moraleLevel: number;                 // 0-1

  // Resources
  militaryBudget: number;              // Credits per year
  militaryBudgetUsed: number;
  recruitmentRate: number;             // New troops per day

  // Doctrine
  militaryDoctrine: MilitaryDoctrine;
  aggressiveness: number;              // 0-1 (how eager to attack)
  expansionism: number;                // 0-1 (how much they want more territory)

  // Territory
  controlledTerritories: string[];     // Station/City IDs
  occupiedTerritories: string[];       // IDs of territories occupied
  frontierTerritories: string[];       // Border territories at risk

  // Operations
  activeOperations: string[];          // Operation IDs
  plannedOperations: string[];

  // Strategic state
  atWar: boolean;
  enemies: StationFaction[];
  threatLevel: number;                 // 0-10 (how threatened we are)

  // Intelligence
  knownTargets: Map<string, MilitaryTarget>;
  targetPriorities: string[];          // Sorted target IDs by priority
}

export type MilitaryDoctrine =
  | 'DEFENSIVE'         // Focus on defending territory
  | 'BALANCED'          // Mix of offense and defense
  | 'AGGRESSIVE'        // Actively seek conquest
  | 'EXPANSIONIST'      // Rapid territorial growth
  | 'OPPORTUNISTIC';    // Attack when advantageous

export class FactionMilitaryAI {
  private conquestSystem: ConquestSystem;
  private diplomacyEngine: FactionDiplomacyEngine;
  private economicNeeds: FactionEconomicNeeds;

  // Faction military states
  private factionStates: Map<StationFaction, FactionMilitaryState> = new Map();

  // All operations
  private operations: Map<string, MilitaryOperation> = new Map();

  // Available stations and cities - NOW POPULATED VIA STARSYSTEM INTEGRATION
  private stations: Map<string, SpaceStation> = new Map();
  private cities: Map<string, PlanetaryCity> = new Map();

  // StarSystem integration
  private starSystem: any = null;  // Will be set via linkStarSystem()
  private fleetCoordination: any = null;  // Will be set via linkFleetCoordination()
  private eventSubscriptions: string[] = [];

  // Configuration
  private readonly UPDATE_INTERVAL = 3600;  // Update every hour (game time)
  private readonly TARGET_SCAN_INTERVAL = 86400;  // Scan for targets daily
  private readonly SYNC_INTERVAL = 7200;  // Sync territories every 2 hours
  private readonly FORCE_RATIO_FOR_ATTACK = 1.5;  // Need 1.5x defender strength
  private readonly MAX_OPERATIONS_PER_FACTION = 3;

  private lastUpdate = 0;
  private lastTargetScan = 0;
  private lastSync = 0;

  constructor(
    conquestSystem: ConquestSystem,
    diplomacyEngine: FactionDiplomacyEngine,
    economicNeeds: FactionEconomicNeeds
  ) {
    this.conquestSystem = conquestSystem;
    this.diplomacyEngine = diplomacyEngine;
    this.economicNeeds = economicNeeds;

    // Subscribe to universe events for automatic registry updates
    this.subscribeToEvents();

    console.log('[FactionMilitaryAI] Initialized - Factions can now wage war');
  }

  /**
   * Link to StarSystem for accessing stations and cities
   */
  public linkStarSystem(starSystem: any): void {
    this.starSystem = starSystem;
    console.log('[FactionMilitaryAI] Linked to StarSystem - gaining access to territories');

    // Perform initial sync
    this.syncTerritories();
  }

  /**
   * Link to fleet coordination system for advanced fleet tactics
   */
  public linkFleetCoordination(fleetCoordination: any): void {
    this.fleetCoordination = fleetCoordination;
    console.log('[FactionMilitaryAI] Linked to FleetCoordinationSystem - advanced tactics enabled');
  }

  /**
   * Synchronize registries with StarSystem's actual stations and cities
   * This ensures military AI always has up-to-date territory information
   */
  public syncTerritories(): void {
    if (!this.starSystem) {
      console.warn('[FactionMilitaryAI] Cannot sync - no StarSystem linked');
      return;
    }

    const beforeStations = this.stations.size;
    const beforeCities = this.cities.size;

    // Clear old registries
    this.stations.clear();
    this.cities.clear();

    // Sync stations from StarSystem
    if (this.starSystem.stations && Array.isArray(this.starSystem.stations)) {
      for (const station of this.starSystem.stations) {
        this.stations.set(station.id, station);

        // Update faction's controlled territories
        const state = this.getFactionState(station.faction);
        if (state && !state.controlledTerritories.includes(station.id)) {
          state.controlledTerritories.push(station.id);
        }
      }
    }

    // Sync cities from StarSystem (if available)
    if (this.starSystem.cities && Array.isArray(this.starSystem.cities)) {
      for (const city of this.starSystem.cities) {
        this.cities.set(city.id, city);

        // Update faction's controlled territories
        const state = this.getFactionState(city.faction);
        if (state && !state.controlledTerritories.includes(city.id)) {
          state.controlledTerritories.push(city.id);
        }
      }
    }

    const afterStations = this.stations.size;
    const afterCities = this.cities.size;

    console.log(`[FactionMilitaryAI] Territory sync complete:`);
    console.log(`  Stations: ${beforeStations} -> ${afterStations}`);
    console.log(`  Cities: ${beforeCities} -> ${afterCities}`);

    // Force a target scan after sync to populate with real targets
    this.scanForTargets();
  }

  /**
   * Subscribe to universe events for automatic updates
   */
  private subscribeToEvents(): void {
    const eventBus = getGlobalEventBus();

    // Subscribe to STATION_CREATED
    const stationCreatedSub = eventBus.subscribe(
      UniverseEventType.STATION_CREATED,
      (event) => this.onStationCreated(event),
      EventPriority.HIGH
    );
    this.eventSubscriptions.push(stationCreatedSub);

    // Subscribe to TERRITORY_CAPTURED
    const territoryCapturedSub = eventBus.subscribe(
      UniverseEventType.TERRITORY_CAPTURED,
      (event) => this.onTerritoryCaptured(event),
      EventPriority.URGENT
    );
    this.eventSubscriptions.push(territoryCapturedSub);

    // Subscribe to STATION_DESTROYED
    const stationDestroyedSub = eventBus.subscribe(
      UniverseEventType.STATION_DESTROYED,
      (event) => this.onStationDestroyed(event),
      EventPriority.HIGH
    );
    this.eventSubscriptions.push(stationDestroyedSub);

    console.log('[FactionMilitaryAI] Subscribed to universe events');
  }

  /**
   * Handle STATION_CREATED event
   */
  private onStationCreated(event: any): void {
    const station = event.data?.station;
    if (!station) return;

    console.log(`[FactionMilitaryAI] Station created: ${station.name} (${station.faction})`);

    // Register the new station
    this.registerStation(station);

    // Trigger immediate target scan for factions
    this.scanForTargets();
  }

  /**
   * Handle TERRITORY_CAPTURED event
   */
  private onTerritoryCaptured(event: any): void {
    const { territoryId, oldOwner, newOwner } = event.data || {};
    if (!territoryId) return;

    console.log(`[FactionMilitaryAI] Territory captured: ${territoryId} (${oldOwner} -> ${newOwner})`);

    // Update station/city ownership
    const station = this.stations.get(territoryId);
    if (station) {
      station.faction = newOwner;
    }

    const city = this.cities.get(territoryId);
    if (city) {
      city.faction = newOwner;
    }

    // Update faction territories
    const oldOwnerState = this.getFactionState(oldOwner);
    if (oldOwnerState) {
      oldOwnerState.controlledTerritories = oldOwnerState.controlledTerritories.filter(
        id => id !== territoryId
      );
    }

    const newOwnerState = this.getFactionState(newOwner);
    if (newOwnerState && !newOwnerState.controlledTerritories.includes(territoryId)) {
      newOwnerState.controlledTerritories.push(territoryId);
    }

    // Rescan targets - borders have shifted
    this.scanForTargets();
  }

  /**
   * Handle STATION_DESTROYED event
   */
  private onStationDestroyed(event: any): void {
    const stationId = event.data?.stationId || event.target;
    if (!stationId) return;

    console.log(`[FactionMilitaryAI] Station destroyed: ${stationId}`);

    // Remove from registries
    const station = this.stations.get(stationId);
    if (station) {
      // Remove from faction's territories
      const state = this.getFactionState(station.faction);
      if (state) {
        state.controlledTerritories = state.controlledTerritories.filter(
          id => id !== stationId
        );
      }

      this.stations.delete(stationId);
    }

    // Also check cities
    const city = this.cities.get(stationId);
    if (city) {
      const state = this.getFactionState(city.faction);
      if (state) {
        state.controlledTerritories = state.controlledTerritories.filter(
          id => id !== stationId
        );
      }

      this.cities.delete(stationId);
    }

    // Cancel any operations targeting this station
    for (const operation of this.operations.values()) {
      if (operation.targetId === stationId && operation.status === 'EXECUTING') {
        operation.status = 'CANCELLED';
        console.log(`[FactionMilitaryAI] Operation ${operation.id} cancelled - target destroyed`);
      }
    }
  }

  /**
   * Initialize faction military state
   */
  public initializeFaction(factionId: StationFaction, doctrine: MilitaryDoctrine = 'BALANCED'): void {
    if (this.factionStates.has(factionId)) return;

    // Calculate initial military strength based on faction
    const populationMultipliers: Record<string, number> = {
      'UNITED_EARTH': 5.0,
      'MARS_FEDERATION': 3.0,
      'BELT_ALLIANCE': 1.5,
      'OUTER_COLONIES': 0.8,
      'INDEPENDENT': 0.5,
      'CORPORATE': 2.0,
      'PIRATE': 0.3
    };

    const popMultiplier = populationMultipliers[factionId] || 1.0;
    const baseMilitary = 50000 * popMultiplier;  // Base military personnel

    // Doctrine modifiers
    const doctrineMultipliers: Record<MilitaryDoctrine, number> = {
      'DEFENSIVE': 0.8,
      'BALANCED': 1.0,
      'AGGRESSIVE': 1.3,
      'EXPANSIONIST': 1.5,
      'OPPORTUNISTIC': 1.1
    };

    const doctrineMultiplier = doctrineMultipliers[doctrine];
    const totalMilitary = baseMilitary * doctrineMultiplier;

    // Aggressiveness by doctrine
    const aggressivenessMap: Record<MilitaryDoctrine, number> = {
      'DEFENSIVE': 0.2,
      'BALANCED': 0.5,
      'AGGRESSIVE': 0.8,
      'EXPANSIONIST': 0.9,
      'OPPORTUNISTIC': 0.6
    };

    const state: FactionMilitaryState = {
      factionId,
      totalMilitaryPersonnel: totalMilitary,
      availableForces: totalMilitary * 0.7,  // 70% available, 30% in training/reserve
      deployedForces: 0,
      reserveForces: totalMilitary * 0.3,
      techLevel: 5,  // Mid-level tech
      trainingLevel: 0.7,
      moraleLevel: 0.8,
      militaryBudget: totalMilitary * 100,  // 100 credits per soldier per year
      militaryBudgetUsed: 0,
      recruitmentRate: totalMilitary * 0.001,  // 0.1% growth per day
      militaryDoctrine: doctrine,
      aggressiveness: aggressivenessMap[doctrine],
      expansionism: doctrine === 'EXPANSIONIST' ? 0.9 : 0.5,
      controlledTerritories: [],
      occupiedTerritories: [],
      frontierTerritories: [],
      activeOperations: [],
      plannedOperations: [],
      atWar: false,
      enemies: [],
      threatLevel: 0,
      knownTargets: new Map(),
      targetPriorities: []
    };

    this.factionStates.set(factionId, state);

    console.log(`[MilitaryAI] ${factionId} initialized: ${totalMilitary.toFixed(0)} troops, Doctrine: ${doctrine}`);
  }

  /**
   * Register a station with the military AI
   */
  public registerStation(station: SpaceStation): void {
    this.stations.set(station.id, station);

    // Add to controlling faction's territories
    const state = this.getFactionState(station.faction);
    if (state && !state.controlledTerritories.includes(station.id)) {
      state.controlledTerritories.push(station.id);
    }
  }

  /**
   * Register a city with the military AI
   */
  public registerCity(city: PlanetaryCity): void {
    this.cities.set(city.id, city);

    // Add to controlling faction's territories
    const state = this.getFactionState(city.faction);
    if (state && !state.controlledTerritories.includes(city.id)) {
      state.controlledTerritories.push(city.id);
    }
  }

  /**
   * Main update loop - factions make military decisions
   */
  public update(currentTime: number, deltaTime: number): void {
    // Throttle updates
    if (currentTime - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdate = currentTime;

    // Periodic territory sync to ensure registries stay current
    if (currentTime - this.lastSync > this.SYNC_INTERVAL) {
      this.syncTerritories();
      this.lastSync = currentTime;
    }

    // Scan for targets periodically
    if (currentTime - this.lastTargetScan > this.TARGET_SCAN_INTERVAL) {
      this.scanForTargets();
      this.lastTargetScan = currentTime;
    }

    // Update each faction's military AI
    for (const state of this.factionStates.values()) {
      this.updateFactionMilitary(state, currentTime, deltaTime);
    }

    // Update operations
    for (const operation of this.operations.values()) {
      this.updateOperation(operation, currentTime, deltaTime);
    }
  }

  /**
   * Update a single faction's military AI
   */
  private updateFactionMilitary(state: FactionMilitaryState, currentTime: number, deltaTime: number): void {
    // Update military resources
    this.updateMilitaryResources(state, deltaTime);

    // Assess threats
    this.assessThreats(state);

    // Check occupation garrisons
    this.maintainGarrisons(state);

    // Evaluate conquest opportunities
    if (state.availableForces > state.totalMilitaryPersonnel * 0.3) {
      // Only consider new operations if we have >30% forces available
      this.evaluateConquestOpportunities(state);
    }

    // Execute planned operations
    this.executePlannedOperations(state, currentTime);

    // Check for necessary liberations
    this.checkLiberationNeeds(state);
  }

  /**
   * Update military resources (recruitment, budget, morale)
   */
  private updateMilitaryResources(state: FactionMilitaryState, deltaTime: number): void {
    const daysDelta = deltaTime / 86400;

    // Recruitment
    const newTroops = state.recruitmentRate * daysDelta;
    state.totalMilitaryPersonnel += newTroops;
    state.availableForces += newTroops;

    // Morale changes
    if (state.atWar) {
      // War reduces morale over time
      state.moraleLevel = Math.max(0.3, state.moraleLevel - 0.01 * daysDelta);
    } else {
      // Peace restores morale
      state.moraleLevel = Math.min(1.0, state.moraleLevel + 0.02 * daysDelta);
    }

    // Budget usage
    const dailyBudgetUse = state.deployedForces * 1.5;  // Deployed forces cost more
    state.militaryBudgetUsed += dailyBudgetUse * daysDelta;
  }

  /**
   * Assess current threats to faction
   */
  private assessThreats(state: FactionMilitaryState): void {
    let totalThreat = 0;
    state.enemies = [];

    // Check relationships with all other factions
    const allFactions = this.getAllFactions();

    for (const otherFaction of allFactions) {
      if (otherFaction === state.factionId) continue;

      const relationship = this.diplomacyEngine.getRelationship(state.factionId, otherFaction);

      // Identify enemies
      if (relationship.status === 'WAR' || relationship.status === 'HOSTILE') {
        state.enemies.push(otherFaction);

        // Calculate threat from this enemy
        const enemyState = this.getFactionState(otherFaction);
        if (enemyState) {
          const militaryThreat = enemyState.totalMilitaryPersonnel / state.totalMilitaryPersonnel;
          totalThreat += militaryThreat * 3;  // War = high threat
        }
      } else if (relationship.status === 'COLD_WAR' || relationship.status === 'TENSE') {
        // Potential threat
        const enemyState = this.getFactionState(otherFaction);
        if (enemyState) {
          const militaryThreat = enemyState.totalMilitaryPersonnel / state.totalMilitaryPersonnel;
          totalThreat += militaryThreat * 0.5;  // Lower threat
        }
      }
    }

    state.threatLevel = Math.min(10, totalThreat);
    state.atWar = state.enemies.length > 0;

    // Adjust doctrine based on threat
    if (state.threatLevel > 7 && state.militaryDoctrine !== 'DEFENSIVE') {
      console.log(`[MilitaryAI] ${state.factionId} switching to DEFENSIVE doctrine (threat level: ${state.threatLevel.toFixed(1)})`);
      state.militaryDoctrine = 'DEFENSIVE';
      state.aggressiveness *= 0.5;
    }
  }

  /**
   * Maintain garrisons on occupied territories
   */
  private maintainGarrisons(state: FactionMilitaryState): void {
    const occupations = this.conquestSystem.getOccupations();

    for (const occupation of occupations) {
      if (occupation.occupier !== state.factionId) continue;

      // Check if garrison is adequate
      const garrisonDeficit = occupation.requiredGarrison - occupation.garrisonSize;

      if (garrisonDeficit > 0 && state.availableForces > garrisonDeficit) {
        // Reinforce garrison
        const reinforcements = Math.min(garrisonDeficit * 1.5, state.availableForces * 0.2);

        console.log(`[MilitaryAI] ${state.factionId} reinforcing garrison at ${occupation.territoryName}: +${reinforcements.toFixed(0)} troops`);

        occupation.garrisonSize += reinforcements;
        state.availableForces -= reinforcements;
        state.deployedForces += reinforcements;

        // Create reinforcement operation
        this.createOperation(state.factionId, 'GARRISON_REINFORCEMENT', occupation.territoryId, occupation.territoryName, reinforcements);
      } else if (garrisonDeficit > state.availableForces && state.availableForces > 0) {
        // Critical shortage - send what we have
        console.log(`[MilitaryAI] ⚠️ ${state.factionId} critically short on garrison for ${occupation.territoryName}`);

        const reinforcements = state.availableForces;
        occupation.garrisonSize += reinforcements;
        state.availableForces = 0;
        state.deployedForces += reinforcements;
      }

      // Track occupied territories
      if (!state.occupiedTerritories.includes(occupation.territoryId)) {
        state.occupiedTerritories.push(occupation.territoryId);
      }
    }
  }

  /**
   * Scan for potential military targets
   */
  private scanForTargets(): void {
    console.log('[MilitaryAI] Scanning for conquest targets...');

    for (const state of this.factionStates.values()) {
      // Clear old targets
      state.knownTargets.clear();

      // Scan all stations
      for (const station of this.stations.values()) {
        if (station.faction === state.factionId) continue;  // Don't target our own

        // Check if enemy or potential target
        const relationship = this.diplomacyEngine.getRelationship(state.factionId, station.faction);

        if (this.isValidTarget(state, station.faction, relationship.status)) {
          const target = this.analyzeTarget(state, station, null);
          state.knownTargets.set(target.id, target);
        }
      }

      // Scan all cities
      for (const city of this.cities.values()) {
        if (city.faction === state.factionId) continue;

        const relationship = this.diplomacyEngine.getRelationship(state.factionId, city.faction);

        if (this.isValidTarget(state, city.faction, relationship.status)) {
          const target = this.analyzeTarget(state, null, city);
          state.knownTargets.set(target.id, target);
        }
      }

      // Sort targets by priority
      this.prioritizeTargets(state);
    }
  }

  /**
   * Check if a faction is a valid target
   */
  private isValidTarget(state: FactionMilitaryState, targetFaction: StationFaction, status: DiplomaticStatus): boolean {
    // Always valid if at war
    if (status === 'WAR') return true;

    // Valid if hostile and we're aggressive
    if (status === 'HOSTILE' && state.aggressiveness > 0.6) return true;

    // Expansionists will attack neutral/cordial targets
    if (state.militaryDoctrine === 'EXPANSIONIST' && state.aggressiveness > 0.8) {
      if (status === 'NEUTRAL' || status === 'TENSE') return true;
    }

    // Opportunists attack weak targets regardless of relationship
    if (state.militaryDoctrine === 'OPPORTUNISTIC') {
      const targetState = this.getFactionState(targetFaction);
      if (targetState && targetState.totalMilitaryPersonnel < state.totalMilitaryPersonnel * 0.3) {
        return true;  // Target is very weak
      }
    }

    return false;
  }

  /**
   * Analyze a target and calculate scores
   */
  private analyzeTarget(
    state: FactionMilitaryState,
    station: SpaceStation | null,
    city: PlanetaryCity | null
  ): MilitaryTarget {
    const isStation = station !== null;
    const target = isStation ? station! : city!;

    // Basic info
    const targetId = target.id;
    const targetName = target.name;
    const ownerFaction = target.faction;
    const location = isStation ? station!.position : { x: 0, y: 0, z: 0 };

    // Defense assessment
    const defenseRating = isStation
      ? station!.defenseRating
      : city!.defense.defenseRating;

    const population = isStation ? station!.population : city!.population;

    // Estimate defenders
    const garrisonRatio = isStation ? 0.05 : 0.03;
    const estimatedDefenders = population * garrisonRatio + defenseRating * 1000;
    const garrisonStrength = estimatedDefenders;

    // Strategic value
    const strategicValue = this.calculateStrategicValue(target, isStation, state);
    const economicValue = isStation
      ? station!.economy.tradeVolume * 365
      : city!.economy.gdpPerCapita * population;
    const populationValue = population / 10000;  // Normalized
    const resourceValue = this.estimateResourceValue(target, isStation);

    // Distance to our nearest base
    const distance = this.calculateDistanceToNearest(location, state);

    // Supporting allies
    const supportingAllies = this.countNearbyAllies(location, ownerFaction, 50000);

    // Vulnerability (inverse of defense + allies)
    const vulnerabilityScore = Math.max(0, Math.min(1,
      (1 - defenseRating / 10) * 0.7 +
      (supportingAllies === 0 ? 0.3 : 0)
    ));

    // Required force
    const requiredForce = estimatedDefenders * this.FORCE_RATIO_FOR_ATTACK;

    // Estimated casualties
    const estimatedCasualties = requiredForce * 0.3;  // Expect 30% casualties

    // Estimated duration
    const estimatedDuration = defenseRating * 5;  // 5 days per defense point

    // Feasibility
    const feasibilityScore = this.calculateFeasibility(
      state,
      requiredForce,
      estimatedCasualties,
      distance,
      supportingAllies
    );

    // Priority score (0-100)
    const priorityScore =
      strategicValue * 30 +
      (economicValue / 1000000) * 20 +
      vulnerabilityScore * 30 +
      feasibilityScore * 20;

    return {
      id: targetId,
      name: targetName,
      type: isStation ? 'STATION' : 'CITY',
      location,
      ownerFaction,
      defenseRating,
      garrisonStrength,
      estimatedDefenders,
      strategicValue,
      economicValue,
      populationValue,
      resourceValue,
      distance,
      supportingAllies,
      vulnerabilityScore,
      feasibilityScore,
      requiredForce,
      estimatedCasualties,
      estimatedDuration,
      priorityScore
    };
  }

  /**
   * Calculate strategic value of target
   */
  private calculateStrategicValue(target: SpaceStation | PlanetaryCity, isStation: boolean, state: FactionMilitaryState): number {
    let value = 5;  // Base value

    // Stations are more valuable
    if (isStation) {
      const station = target as SpaceStation;

      // Trading hubs are valuable
      if (station.stationType === 'TRADING_HUB') value += 2;

      // Military bases are strategic
      if (station.stationType === 'MILITARY_BASE') value += 3;

      // Shipyards for military production
      if (station.stationType === 'SHIPYARD') value += 2;
    } else {
      const city = target as PlanetaryCity;

      // Capitals are very valuable
      if (city.type === 'CAPITAL_CITY') value += 4;

      // Military bases
      if (city.type === 'MILITARY_BASE') value += 3;

      // Resource production
      if (city.type === 'MINING_COLONY' || city.type === 'REFINERY_COMPLEX') value += 2;
    }

    // Check if this fills an economic need
    const economy = this.economicNeeds.getFactionEconomy(state.factionId);
    if (economy.crisisLevel > 5) {
      // Desperate for resources
      value += 3;
    }

    return Math.min(10, value);
  }

  /**
   * Estimate resource value of target
   */
  private estimateResourceValue(target: SpaceStation | PlanetaryCity, isStation: boolean): number {
    if (isStation) {
      const station = target as SpaceStation;
      return station.economy.tradeVolume;
    } else {
      const city = target as PlanetaryCity;
      // Check exports
      return city.economy.exports.length * 100000;
    }
  }

  /**
   * Calculate distance to nearest controlled territory
   */
  private calculateDistanceToNearest(location: Vector3, state: FactionMilitaryState): number {
    let minDistance = Infinity;

    for (const territoryId of state.controlledTerritories) {
      const station = this.stations.get(territoryId);
      if (station) {
        const dist = this.distance3D(location, station.position);
        minDistance = Math.min(minDistance, dist);
      }
    }

    return minDistance === Infinity ? 100000 : minDistance;
  }

  /**
   * Count nearby allied stations
   */
  private countNearbyAllies(location: Vector3, faction: StationFaction, radius: number): number {
    let count = 0;

    for (const station of this.stations.values()) {
      if (station.faction === faction) {
        const dist = this.distance3D(location, station.position);
        if (dist < radius) count++;
      }
    }

    return count;
  }

  /**
   * Calculate feasibility of conquest
   */
  private calculateFeasibility(
    state: FactionMilitaryState,
    requiredForce: number,
    estimatedCasualties: number,
    distance: number,
    supportingAllies: number
  ): number {
    let score = 1.0;

    // Do we have enough forces?
    if (requiredForce > state.availableForces) {
      score *= 0.3;  // Very hard if we don't have enough
    } else if (requiredForce > state.availableForces * 0.7) {
      score *= 0.7;  // Requires most of our forces
    }

    // Can we afford casualties?
    const casualtyRatio = estimatedCasualties / state.totalMilitaryPersonnel;
    if (casualtyRatio > 0.3) {
      score *= 0.4;  // Too costly
    } else if (casualtyRatio > 0.1) {
      score *= 0.7;  // Expensive
    }

    // Distance penalty
    if (distance > 50000) {
      score *= 0.6;  // Far away
    } else if (distance > 20000) {
      score *= 0.8;
    }

    // Allied support is a problem
    if (supportingAllies > 2) {
      score *= 0.5;  // Multiple allies nearby
    } else if (supportingAllies > 0) {
      score *= 0.8;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Prioritize targets for faction
   */
  private prioritizeTargets(state: FactionMilitaryState): void {
    const targets = Array.from(state.knownTargets.values());

    // Sort by priority score
    targets.sort((a, b) => b.priorityScore - a.priorityScore);

    state.targetPriorities = targets.map(t => t.id);

    if (targets.length > 0) {
      console.log(`[MilitaryAI] ${state.factionId} identified ${targets.length} targets. Top target: ${targets[0].name} (Priority: ${targets[0].priorityScore.toFixed(1)})`);
    }
  }

  /**
   * Evaluate conquest opportunities and plan operations
   */
  private evaluateConquestOpportunities(state: FactionMilitaryState): void {
    // Don't plan too many operations at once
    if (state.activeOperations.length >= this.MAX_OPERATIONS_PER_FACTION) {
      return;
    }

    // Get top targets
    const topTargets = state.targetPriorities
      .slice(0, 5)
      .map(id => state.knownTargets.get(id))
      .filter(t => t !== undefined) as MilitaryTarget[];

    for (const target of topTargets) {
      // Check if we should attack this target
      if (this.shouldAttackTarget(state, target)) {
        this.planSiegeOperation(state, target);
        break;  // Only plan one operation per update
      }
    }
  }

  /**
   * Determine if faction should attack a target
   */
  private shouldAttackTarget(state: FactionMilitaryState, target: MilitaryTarget): boolean {
    // Must be feasible
    if (target.feasibilityScore < 0.5) return false;

    // Must have enough forces available
    if (target.requiredForce > state.availableForces * 0.8) return false;

    // Check aggressiveness vs priority
    const attackThreshold = (1 - state.aggressiveness) * 50;  // Lower aggressiveness = higher threshold
    if (target.priorityScore < attackThreshold) return false;

    // At war = always consider high priority targets
    if (state.atWar && target.ownerFaction in state.enemies) {
      return target.priorityScore > 40;
    }

    // Expansionists attack more readily
    if (state.militaryDoctrine === 'EXPANSIONIST') {
      return target.priorityScore > 30;
    }

    // Defensive doctrine rarely attacks
    if (state.militaryDoctrine === 'DEFENSIVE') {
      return target.priorityScore > 70 && state.threatLevel < 3;
    }

    // Balanced doctrine needs good opportunity
    return target.priorityScore > 50;
  }

  /**
   * Plan a siege operation
   */
  private planSiegeOperation(state: FactionMilitaryState, target: MilitaryTarget): void {
    // Allocate forces
    const forcesToCommit = Math.min(
      target.requiredForce * 1.2,  // 20% buffer
      state.availableForces * 0.6  // Max 60% of available
    );

    console.log(`[MilitaryAI] 📋 ${state.factionId} planning siege of ${target.name}`);
    console.log(`  Forces: ${forcesToCommit.toFixed(0)} / ${target.requiredForce.toFixed(0)} required`);
    console.log(`  Priority: ${target.priorityScore.toFixed(1)}, Feasibility: ${(target.feasibilityScore * 100).toFixed(0)}%`);

    const operation = this.createOperation(
      state.factionId,
      'SIEGE',
      target.id,
      target.name,
      forcesToCommit
    );

    operation.status = 'PLANNING';
    state.plannedOperations.push(operation.id);
  }

  /**
   * Execute planned operations
   */
  private executePlannedOperations(state: FactionMilitaryState, currentTime: number): void {
    for (const operationId of state.plannedOperations) {
      const operation = this.operations.get(operationId);
      if (!operation) continue;

      // Check if we can execute
      if (operation.forcesCommitted <= state.availableForces) {
        this.executeOperation(state, operation, currentTime);
      }
    }
  }

  /**
   * Execute a military operation
   */
  private executeOperation(state: FactionMilitaryState, operation: MilitaryOperation, currentTime: number): void {
    console.log(`[MilitaryAI] ⚔️ ${state.factionId} launching ${operation.type}: ${operation.targetName}`);

    operation.status = 'EXECUTING';
    operation.launchedAt = currentTime;

    // Remove from planned, add to active
    state.plannedOperations = state.plannedOperations.filter(id => id !== operation.id);
    state.activeOperations.push(operation.id);

    // Commit forces
    state.availableForces -= operation.forcesCommitted;
    state.deployedForces += operation.forcesCommitted;

    // Execute based on type
    if (operation.type === 'SIEGE') {
      // Get target
      const station = this.stations.get(operation.targetId);
      const city = this.cities.get(operation.targetId);

      if (station) {
        this.conquestSystem.beginSiege(state.factionId, station, operation.forcesCommitted);
      } else if (city) {
        this.conquestSystem.beginSiege(state.factionId, city, operation.forcesCommitted);
      }
    }
  }

  /**
   * Update a military operation
   */
  private updateOperation(operation: MilitaryOperation, currentTime: number, deltaTime: number): void {
    if (operation.status !== 'EXECUTING') return;

    // Check if associated siege is complete
    const sieges = this.conquestSystem.getActiveSieges();
    const associatedSiege = sieges.find(s =>
      s.targetId === operation.targetId &&
      s.attackerFaction === operation.faction
    );

    if (associatedSiege) {
      // Update progress
      operation.progress = associatedSiege.captureProgress;

      // Check if siege ended
      if (associatedSiege.status === 'CAPTURED') {
        this.completeOperation(operation, true, currentTime);
      } else if (associatedSiege.status === 'LIFTED') {
        this.completeOperation(operation, false, currentTime);
      }
    }
  }

  /**
   * Complete a military operation
   */
  private completeOperation(operation: MilitaryOperation, success: boolean, currentTime: number): void {
    operation.status = success ? 'COMPLETED' : 'FAILED';
    operation.success = success;
    operation.completedAt = currentTime;

    const state = this.getFactionState(operation.faction);
    if (state) {
      // Remove from active operations
      state.activeOperations = state.activeOperations.filter(id => id !== operation.id);

      // Return surviving forces
      const survivingForces = operation.forcesCommitted * (success ? 0.7 : 0.5);
      state.availableForces += survivingForces;
      state.deployedForces -= operation.forcesCommitted;
    }

    console.log(`[MilitaryAI] Operation ${success ? 'SUCCESS' : 'FAILED'}: ${operation.faction} ${operation.type} on ${operation.targetName}`);
  }

  /**
   * Check if faction needs to liberate occupied territories
   */
  private checkLiberationNeeds(state: FactionMilitaryState): void {
    const occupations = this.conquestSystem.getOccupations();

    for (const occupation of occupations) {
      // Check if this is our territory being occupied
      if (occupation.originalOwner === state.factionId && occupation.status !== 'LIBERATED') {
        // Evaluate if we should try to liberate
        if (this.shouldAttemptLiberation(state, occupation)) {
          this.planLiberationOperation(state, occupation);
        }
      }
    }
  }

  /**
   * Determine if faction should attempt liberation
   */
  private shouldAttemptLiberation(state: FactionMilitaryState, occupation: OccupationState): boolean {
    // Need sufficient forces
    const requiredForce = occupation.garrisonSize * 1.5;
    if (requiredForce > state.availableForces * 0.5) return false;

    // High resistance makes liberation easier
    if (occupation.resistanceLevel < 0.5) return false;

    // Strategic value
    if (occupation.population > 100000) return true;  // Large territory

    // Random chance if smaller territory
    return Math.random() < 0.1;
  }

  /**
   * Plan liberation operation
   */
  private planLiberationOperation(state: FactionMilitaryState, occupation: OccupationState): void {
    const forcesNeeded = occupation.garrisonSize * 1.5;

    console.log(`[MilitaryAI] 🗽 ${state.factionId} planning liberation of ${occupation.territoryName}`);

    const operation = this.createOperation(
      state.factionId,
      'LIBERATION',
      occupation.territoryId,
      occupation.territoryName,
      forcesNeeded
    );

    operation.status = 'PLANNING';
    state.plannedOperations.push(operation.id);
  }

  /**
   * Create a military operation
   */
  private createOperation(
    faction: StationFaction,
    type: OperationType,
    targetId: string,
    targetName: string,
    forces: number
  ): MilitaryOperation {
    const operation: MilitaryOperation = {
      id: `op_${faction}_${type}_${Date.now()}`,
      type,
      faction,
      targetId,
      targetName,
      forcesCommitted: forces,
      reserveForces: forces * 0.2,
      status: 'PLANNING',
      progress: 0,
      plannedAt: Date.now() / 1000,
      casualtiesInflicted: 0,
      casualtiesSuffered: 0
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  /**
   * Get faction military state
   */
  private getFactionState(faction: StationFaction): FactionMilitaryState | undefined {
    return this.factionStates.get(faction);
  }

  /**
   * Get all factions
   */
  private getAllFactions(): StationFaction[] {
    return Array.from(this.factionStates.keys());
  }

  /**
   * Calculate 3D distance
   */
  private distance3D(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get military status report for faction
   */
  public getMilitaryReport(factionId: StationFaction): string {
    const state = this.getFactionState(factionId);
    if (!state) return 'Faction not found';

    const lines: string[] = [];
    lines.push(`=== MILITARY REPORT: ${factionId} ===`);
    lines.push(`Doctrine: ${state.militaryDoctrine}`);
    lines.push(`Aggressiveness: ${(state.aggressiveness * 100).toFixed(0)}%`);
    lines.push('');
    lines.push(`Total Personnel: ${state.totalMilitaryPersonnel.toFixed(0)}`);
    lines.push(`  Available: ${state.availableForces.toFixed(0)}`);
    lines.push(`  Deployed: ${state.deployedForces.toFixed(0)}`);
    lines.push(`  Reserve: ${state.reserveForces.toFixed(0)}`);
    lines.push('');
    lines.push(`Tech Level: ${state.techLevel}/10`);
    lines.push(`Training: ${(state.trainingLevel * 100).toFixed(0)}%`);
    lines.push(`Morale: ${(state.moraleLevel * 100).toFixed(0)}%`);
    lines.push('');
    lines.push(`Territories Controlled: ${state.controlledTerritories.length}`);
    lines.push(`Territories Occupied: ${state.occupiedTerritories.length}`);
    lines.push('');
    lines.push(`At War: ${state.atWar ? 'YES' : 'NO'}`);
    if (state.enemies.length > 0) {
      lines.push(`Enemies: ${state.enemies.join(', ')}`);
    }
    lines.push(`Threat Level: ${state.threatLevel.toFixed(1)}/10`);
    lines.push('');
    lines.push(`Active Operations: ${state.activeOperations.length}`);
    lines.push(`Planned Operations: ${state.plannedOperations.length}`);
    lines.push(`Known Targets: ${state.knownTargets.size}`);

    return lines.join('\n');
  }

  /**
   * Get top targets for faction
   */
  public getTopTargets(factionId: StationFaction, count: number = 5): MilitaryTarget[] {
    const state = this.getFactionState(factionId);
    if (!state) return [];

    return state.targetPriorities
      .slice(0, count)
      .map(id => state.knownTargets.get(id))
      .filter(t => t !== undefined) as MilitaryTarget[];
  }

  /**
   * Cleanup subscriptions on destroy
   */
  public destroy(): void {
    const eventBus = getGlobalEventBus();

    // Unsubscribe from all events
    for (const subId of this.eventSubscriptions) {
      eventBus.unsubscribe(subId);
    }

    this.eventSubscriptions = [];
    console.log('[FactionMilitaryAI] Destroyed - cleaned up event subscriptions');
  }
}
