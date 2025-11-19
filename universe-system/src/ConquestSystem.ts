/**
 * ConquestSystem.ts - Siege Warfare and Territory Conquest
 *
 * Complete implementation of conquest mechanics:
 * - Sieges: Prolonged attacks on stations/colonies to wear down defenses
 * - Capture: Successful sieges transfer ownership
 * - Occupation: Maintaining control of captured territory
 * - Resistance: Local population resists occupation
 * - Liberation: Original owners can retake territory
 * - Consequences: Wars have real impact on borders, resources, population
 */

import { Vector3 } from './CelestialBody';
import { SpaceStation, StationFaction } from './StationGenerator';
import { PlanetaryCity } from './PlanetaryCities';
import { Faction, Territory } from './FactionSystem';

export interface SiegeOperation {
  id: string;

  // Parties
  attackerFaction: StationFaction;
  defenderFaction: StationFaction;

  // Target
  targetId: string;
  targetName: string;
  targetType: 'STATION' | 'CITY';
  targetLocation: Vector3;

  // Military forces
  attackingForce: number;              // Total military strength committed
  defendingForce: number;              // Garrison + defenders

  // Defense strength
  baseDefenseRating: number;           // Original defense rating (0-10)
  currentDefenseStrength: number;      // Current defense % (0-1)
  structuralIntegrity: number;         // Physical damage (0-1)

  // Siege progress
  siegeStarted: number;                // Timestamp
  siegeDuration: number;               // Seconds elapsed
  bombardmentIntensity: number;        // Attack strength per day

  // Population impact
  civilianCasualties: number;
  populationMorale: number;            // 0-1 (low morale speeds surrender)
  evacuees: number;

  // Supply and resources
  defenderSupplies: number;            // Days of supplies remaining
  attackerLogistics: number;           // Attacker supply line strength (0-1)

  // Progress tracking
  estimatedDaysToCapture: number;
  captureProgress: number;             // 0-1

  // Status
  status: SiegeStatus;
  outcome?: SiegeOutcome;
  endedAt?: number;

  // Events
  battleEvents: BattleEvent[];
}

export type SiegeStatus =
  | 'PREPARING'        // Gathering forces
  | 'BLOCKADE'         // Cutting off supplies
  | 'BOMBARDMENT'      // Active bombardment
  | 'GROUND_ASSAULT'   // Final assault phase
  | 'SURRENDER_TALKS'  // Negotiations
  | 'CAPTURED'         // Successful capture
  | 'LIFTED'           // Siege ended, defenders won
  | 'STALEMATE';       // Ongoing but no progress

export type SiegeOutcome =
  | 'ATTACKER_VICTORY'    // Captured
  | 'DEFENDER_VICTORY'    // Siege lifted
  | 'NEGOTIATED_SURRENDER' // Surrender with terms
  | 'RELIEF_FORCE'        // Allied reinforcements broke siege
  | 'ATTACKER_WITHDRAWAL' // Attackers gave up
  | 'MUTUAL_EXHAUSTION';  // Both sides too weak

export interface BattleEvent {
  timestamp: number;
  type: 'BOMBARDMENT' | 'ASSAULT' | 'SORTIE' | 'SUPPLY_DROP' | 'CIVILIAN_EXODUS';
  description: string;
  attackerLosses: number;
  defenderLosses: number;
  civilianCasualties: number;
  impactOnProgress: number;           // How much this changed capture progress
}

export interface OccupationState {
  id: string;

  // Territory
  territoryId: string;
  territoryName: string;
  territoryType: 'STATION' | 'CITY';
  originalOwner: StationFaction;
  occupier: StationFaction;

  // Occupation forces
  garrisonSize: number;                // Military personnel
  requiredGarrison: number;            // Minimum to maintain control
  garrisonStrength: number;            // Combat effectiveness (0-1)

  // Population
  population: number;
  resistanceLevel: number;             // 0-1 (high = active resistance)
  collaborationLevel: number;          // 0-1 (% cooperating with occupier)
  loyaltyToOccupier: number;          // -1 to +1 (negative = want liberation)

  // Control
  controlLevel: number;                // 0-1 (how firmly occupier controls)
  stabilityIndex: number;              // 0-1 (low = insurgency, high = pacified)

  // Resources
  resourceExtraction: number;          // % of normal production occupier gets
  occupationCost: number;              // Credits per day to maintain
  economicProductivity: number;        // % of pre-occupation levels

  // Timeline
  occupationStarted: number;
  daysSinceOccupation: number;

  // Resistance activity
  insurgentAttacks: number;            // Total attacks since occupation
  lastAttackTimestamp: number;
  insurgentStrength: number;           // 0-100

  // Pacification efforts
  pacificationLevel: number;           // Occupier's efforts (0-1)
  heartsAndMinds: number;              // Success of winning over population (0-1)
  represionLevel: number;              // How brutal the occupation (0-1)

  // Liberation
  liberationAttempts: number;
  liberationProgress: number;          // 0-1 (original owner trying to retake)

  // Status
  status: OccupationStatus;
}

export type OccupationStatus =
  | 'INITIAL_OCCUPATION'   // Just captured, chaotic
  | 'INSURGENCY'           // Active resistance
  | 'CONTESTED'            // Fighting between garrison and resistance
  | 'PACIFIED'             // Resistance crushed, stable control
  | 'INTEGRATED'           // Population accepts new owner
  | 'LIBERATION_IMMINENT'  // Original owner about to retake
  | 'LIBERATED';           // Returned to original owner

export interface ConquestConsequences {
  // Territory changes
  territoryTransferred: boolean;
  newOwner: StationFaction;
  oldOwner: StationFaction;

  // Casualties
  militaryCasualties: Map<StationFaction, number>;
  civilianCasualties: number;

  // Economic impact
  infrastructureDamage: number;        // % destroyed (0-1)
  economicLoss: number;                // Credits
  productionLoss: number;              // % reduction in output

  // Population
  refugees: number;
  populationLoss: number;              // Deaths + evacuees
  populationMoraleChange: number;      // Impact on remaining population

  // Diplomatic
  reputationChange: Map<StationFaction, number>; // How other factions view this
  warCrimesCommitted: boolean;

  // Strategic
  strategicValue: number;              // How important this conquest was (0-10)
  borderChange: boolean;               // Did this shift the border?
  controllingPower: StationFaction;    // Who controls this space now
}

/**
 * Event emitter interface for conquest events
 */
export interface ConquestEventListener {
  onTerritoryCapture?(event: TerritoryCapturEvent): void;
  onTerritoryLiberated?(event: TerritoryLiberationEvent): void;
  onSiegeStarted?(event: SiegeStartEvent): void;
  onSiegeEnded?(event: SiegeEndEvent): void;
}

export interface TerritoryCapturEvent {
  type: 'TERRITORY_CAPTURED';
  timestamp: number;
  stationId: string;
  stationName: string;
  previousOwner: StationFaction;
  newOwner: StationFaction;
  consequences: ConquestConsequences;
  siegeId: string;
}

export interface TerritoryLiberationEvent {
  type: 'TERRITORY_LIBERATED';
  timestamp: number;
  territoryId: string;
  territoryName: string;
  liberator: StationFaction;
  occupier: StationFaction;
  occupationDuration: number;
}

export interface SiegeStartEvent {
  type: 'SIEGE_STARTED';
  timestamp: number;
  siegeId: string;
  targetId: string;
  targetName: string;
  attacker: StationFaction;
  defender: StationFaction;
}

export interface SiegeEndEvent {
  type: 'SIEGE_ENDED';
  timestamp: number;
  siegeId: string;
  outcome: SiegeOutcome;
  winner: StationFaction;
}

export class ConquestSystem {
  private activeSieges: Map<string, SiegeOperation> = new Map();
  private occupations: Map<string, OccupationState> = new Map();
  private conquestHistory: ConquestRecord[] = [];

  // Integration points
  private stations: Map<string, SpaceStation> = new Map();
  private cities: Map<string, PlanetaryCity> = new Map();
  private factions: Map<string, Faction> = new Map();
  private eventListeners: ConquestEventListener[] = [];

  // Configuration - siege dynamics
  private readonly BASE_SIEGE_DAYS_PER_DEFENSE_POINT = 5;  // Base: 5 days per defense rating point
  private readonly MIN_GARRISON_PERCENT = 0.15;            // Need 15% of population as garrison minimum
  private readonly RESISTANCE_DECAY_RATE = 0.01;           // Resistance decreases 1% per day if no incidents
  private readonly INSURGENT_SPAWN_RATE = 0.02;            // 2% of population become insurgents
  private readonly PACIFICATION_THRESHOLD = 0.3;           // Resistance below 30% = pacified

  constructor() {
    console.log('[ConquestSystem] Initialized - Wars now have consequences');
  }

  // ====================================================================
  // INTEGRATION METHODS
  // ====================================================================

  /**
   * Link to universe system to access actual stations
   */
  public linkStations(stations: SpaceStation[]): void {
    this.stations.clear();
    for (const station of stations) {
      this.stations.set(station.id, station);
    }
    console.log(`[ConquestSystem] Linked ${stations.length} stations`);
  }

  /**
   * Link to planetary cities
   */
  public linkCities(cities: PlanetaryCity[]): void {
    this.cities.clear();
    for (const city of cities) {
      this.cities.set(city.id, city);
    }
    console.log(`[ConquestSystem] Linked ${cities.length} cities`);
  }

  /**
   * Link to faction system
   */
  public linkFactions(factions: Map<string, Faction>): void {
    this.factions = factions;
    console.log(`[ConquestSystem] Linked ${factions.size} factions`);
  }

  /**
   * Register event listener
   */
  public addEventListener(listener: ConquestEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: ConquestEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get station by ID (with safety checks)
   */
  private getStation(stationId: string): SpaceStation | null {
    const station = this.stations.get(stationId);
    if (!station) {
      console.warn(`[ConquestSystem] Station ${stationId} not found`);
      return null;
    }
    return station;
  }

  /**
   * Get city by ID (with safety checks)
   */
  private getCity(cityId: string): PlanetaryCity | null {
    const city = this.cities.get(cityId);
    if (!city) {
      console.warn(`[ConquestSystem] City ${cityId} not found`);
      return null;
    }
    return city;
  }

  // ====================================================================
  // OWNERSHIP TRANSFER - THE ACTUAL FIX
  // ====================================================================

  /**
   * Transfer station ownership - THIS IS THE KEY FIX
   */
  public transferStationOwnership(
    stationId: string,
    newOwner: StationFaction,
    consequences: ConquestConsequences
  ): boolean {
    const station = this.getStation(stationId);
    if (!station) {
      console.error(`[ConquestSystem] Cannot transfer ownership - station ${stationId} not found`);
      return false;
    }

    const oldOwner = station.faction;

    console.log(`[ConquestSystem] 🔄 Transferring ownership: ${station.name}`);
    console.log(`  Old owner: ${oldOwner} → New owner: ${newOwner}`);

    // 1. ACTUALLY CHANGE THE STATION FACTION
    station.faction = newOwner;

    // 2. Update defense rating based on damage
    const damageMultiplier = 1 - consequences.infrastructureDamage;
    const oldDefense = station.defenseRating;
    station.defenseRating = Math.max(1, Math.floor(station.defenseRating * damageMultiplier));

    console.log(`  Defense: ${oldDefense} → ${station.defenseRating} (damage: ${(consequences.infrastructureDamage * 100).toFixed(0)}%)`);

    // 3. Update population (casualties + refugees)
    station.population = Math.max(100, station.population - consequences.populationLoss);

    // 4. Update faction territories
    this.updateFactionTerritories(stationId, oldOwner, newOwner);

    // 5. Update station reputation - new owner gets positive, old owner gets negative
    station.reputation.set(newOwner, 75);  // Loyalty to new owner
    station.reputation.set(oldOwner, -50); // Resentment from old loyalists

    // 6. Emit TERRITORY_CAPTURED event
    this.emitTerritoryCapture({
      type: 'TERRITORY_CAPTURED',
      timestamp: Date.now() / 1000,
      stationId: station.id,
      stationName: station.name,
      previousOwner: oldOwner,
      newOwner: newOwner,
      consequences: consequences,
      siegeId: `siege_${stationId}_${Date.now()}`
    });

    console.log(`[ConquestSystem] ✓ Ownership transferred successfully`);
    return true;
  }

  /**
   * Transfer city ownership
   */
  public transferCityOwnership(
    cityId: string,
    newOwner: StationFaction,
    consequences: ConquestConsequences
  ): boolean {
    const city = this.getCity(cityId);
    if (!city) {
      console.error(`[ConquestSystem] Cannot transfer ownership - city ${cityId} not found`);
      return false;
    }

    const oldOwner = city.faction;

    console.log(`[ConquestSystem] 🔄 Transferring city ownership: ${city.name}`);
    console.log(`  Old owner: ${oldOwner} → New owner: ${newOwner}`);

    // 1. Change city faction
    city.faction = newOwner;

    // 2. Update defense
    const damageMultiplier = 1 - consequences.infrastructureDamage;
    city.defense.defenseRating = Math.max(1, Math.floor(city.defense.defenseRating * damageMultiplier));

    // 3. Update population
    city.population = Math.max(1000, city.population - consequences.populationLoss);

    // 4. Update faction territories
    this.updateFactionTerritories(cityId, oldOwner, newOwner);

    // 5. Emit event
    this.emitTerritoryCapture({
      type: 'TERRITORY_CAPTURED',
      timestamp: Date.now() / 1000,
      stationId: city.id,
      stationName: city.name,
      previousOwner: oldOwner,
      newOwner: newOwner,
      consequences: consequences,
      siegeId: `siege_${cityId}_${Date.now()}`
    });

    console.log(`[ConquestSystem] ✓ City ownership transferred successfully`);
    return true;
  }

  /**
   * Update faction territory lists
   */
  private updateFactionTerritories(
    territoryId: string,
    oldOwner: StationFaction,
    newOwner: StationFaction
  ): void {
    // Remove from old owner's territory
    const oldFaction = this.factions.get(oldOwner);
    if (oldFaction) {
      for (const territory of oldFaction.territory) {
        const index = territory.stations.indexOf(territoryId);
        if (index !== -1) {
          territory.stations.splice(index, 1);
          console.log(`  Removed ${territoryId} from ${oldOwner} territory`);
          break;
        }
      }
    }

    // Add to new owner's territory
    const newFaction = this.factions.get(newOwner);
    if (newFaction) {
      // Find or create territory for this system
      let territory = newFaction.territory.find(t => t.systemId === 'current_system'); // TODO: Get actual system ID
      if (!territory) {
        territory = {
          systemId: 'current_system',
          controlLevel: 0,
          stations: [],
          contested: false
        };
        newFaction.territory.push(territory);
      }

      territory.stations.push(territoryId);
      territory.controlLevel = territory.stations.length / 10; // Rough estimate
      console.log(`  Added ${territoryId} to ${newOwner} territory`);
    }
  }

  /**
   * Emit territory capture event to all listeners
   */
  private emitTerritoryCapture(event: TerritoryCapturEvent): void {
    console.log(`[ConquestSystem] 📢 Event: TERRITORY_CAPTURED - ${event.stationName}`);
    for (const listener of this.eventListeners) {
      if (listener.onTerritoryCapture) {
        try {
          listener.onTerritoryCapture(event);
        } catch (error) {
          console.error('[ConquestSystem] Error in event listener:', error);
        }
      }
    }
  }

  /**
   * Emit territory liberation event
   */
  private emitTerritoryLiberation(event: TerritoryLiberationEvent): void {
    console.log(`[ConquestSystem] 📢 Event: TERRITORY_LIBERATED - ${event.territoryName}`);
    for (const listener of this.eventListeners) {
      if (listener.onTerritoryLiberated) {
        try {
          listener.onTerritoryLiberated(event);
        } catch (error) {
          console.error('[ConquestSystem] Error in event listener:', error);
        }
      }
    }
  }

  /**
   * Emit siege started event
   */
  private emitSiegeStarted(event: SiegeStartEvent): void {
    console.log(`[ConquestSystem] 📢 Event: SIEGE_STARTED - ${event.targetName}`);
    for (const listener of this.eventListeners) {
      if (listener.onSiegeStarted) {
        try {
          listener.onSiegeStarted(event);
        } catch (error) {
          console.error('[ConquestSystem] Error in event listener:', error);
        }
      }
    }
  }

  /**
   * Emit siege ended event
   */
  private emitSiegeEnded(event: SiegeEndEvent): void {
    console.log(`[ConquestSystem] 📢 Event: SIEGE_ENDED - Outcome: ${event.outcome}`);
    for (const listener of this.eventListeners) {
      if (listener.onSiegeEnded) {
        try {
          listener.onSiegeEnded(event);
        } catch (error) {
          console.error('[ConquestSystem] Error in event listener:', error);
        }
      }
    }
  }

  // ====================================================================
  // SIEGE OPERATIONS
  // ====================================================================

  /**
   * Start a siege operation
   */
  public beginSiege(
    attackerFaction: StationFaction,
    target: SpaceStation | PlanetaryCity,
    attackingForce: number
  ): SiegeOperation {
    const isStation = target instanceof SpaceStation;
    const targetId = target.id;
    const targetName = target.name;
    const defenderFaction = target.faction;

    // Get defense parameters
    const defenseRating = isStation
      ? (target as SpaceStation).defenseRating
      : (target as PlanetaryCity).defense.defenseRating;

    const population = isStation
      ? (target as SpaceStation).population
      : (target as PlanetaryCity).population;

    // Calculate defending force (garrison + militia)
    const garrisonRatio = isStation ? 0.05 : 0.03;  // Stations have more military personnel
    const defendingForce = population * garrisonRatio + defenseRating * 1000;

    // Calculate initial supplies
    const defenderSupplies = defenseRating * 10;  // Defense rating * 10 days of supplies

    // Create siege operation
    const siege: SiegeOperation = {
      id: `siege_${targetId}_${Date.now()}`,
      attackerFaction,
      defenderFaction,
      targetId,
      targetName,
      targetType: isStation ? 'STATION' : 'CITY',
      targetLocation: isStation ? target.position : { x: 0, y: 0, z: 0 }, // Cities need planet-relative position
      attackingForce,
      defendingForce,
      baseDefenseRating: defenseRating,
      currentDefenseStrength: 1.0,
      structuralIntegrity: 1.0,
      siegeStarted: Date.now() / 1000,
      siegeDuration: 0,
      bombardmentIntensity: this.calculateBombardmentIntensity(attackingForce, defenseRating),
      civilianCasualties: 0,
      populationMorale: 0.7,  // Start at 70% morale
      evacuees: 0,
      defenderSupplies,
      attackerLogistics: 1.0,  // Perfect logistics initially
      estimatedDaysToCapture: this.estimateSiegeDuration(defenseRating, attackingForce, defendingForce),
      captureProgress: 0,
      status: 'BLOCKADE',
      battleEvents: []
    };

    // Record initial event
    siege.battleEvents.push({
      timestamp: Date.now() / 1000,
      type: 'BOMBARDMENT',
      description: `${attackerFaction} begins siege of ${targetName} (Defense: ${defenseRating})`,
      attackerLosses: 0,
      defenderLosses: 0,
      civilianCasualties: 0,
      impactOnProgress: 0
    });

    this.activeSieges.set(siege.id, siege);

    // Emit siege started event
    this.emitSiegeStarted({
      type: 'SIEGE_STARTED',
      timestamp: Date.now() / 1000,
      siegeId: siege.id,
      targetId,
      targetName,
      attacker: attackerFaction,
      defender: defenderFaction
    });

    console.log(`[Conquest] 🏴 SIEGE BEGINS: ${attackerFaction} attacks ${targetName}`);
    console.log(`  Attacking Force: ${attackingForce.toFixed(0)} vs Defending Force: ${defendingForce.toFixed(0)}`);
    console.log(`  Estimated Duration: ${siege.estimatedDaysToCapture.toFixed(1)} days`);

    return siege;
  }

  /**
   * Update all active sieges
   */
  public update(deltaTime: number): void {
    // Update sieges
    for (const siege of this.activeSieges.values()) {
      if (siege.status !== 'CAPTURED' && siege.status !== 'LIFTED') {
        this.updateSiege(siege, deltaTime);
      }
    }

    // Update occupations
    for (const occupation of this.occupations.values()) {
      if (occupation.status !== 'LIBERATED') {
        this.updateOccupation(occupation, deltaTime);
      }
    }
  }

  /**
   * Update a single siege operation
   */
  private updateSiege(siege: SiegeOperation, deltaTime: number): void {
    const daysDelta = deltaTime / 86400;
    siege.siegeDuration += deltaTime;

    // Check attacker logistics (supply lines can be disrupted)
    this.updateAttackerLogistics(siege, daysDelta);

    // Bombardment phase
    if (siege.status === 'BOMBARDMENT' || siege.status === 'BLOCKADE') {
      // Wear down defenses
      const damagePerDay = siege.bombardmentIntensity * siege.attackerLogistics;
      const defenseDamage = (damagePerDay / 100) * daysDelta;

      siege.currentDefenseStrength -= defenseDamage;
      siege.structuralIntegrity -= defenseDamage * 0.5;  // Physical damage slower

      // Reduce defender supplies
      siege.defenderSupplies -= daysDelta;

      // Civilian impact
      const civilianCasualtiesThisUpdate = damagePerDay * 10 * daysDelta;
      siege.civilianCasualties += civilianCasualtiesThisUpdate;

      // Morale impact
      siege.populationMorale -= defenseDamage * 0.3;
      if (siege.defenderSupplies < 10) {
        siege.populationMorale -= 0.05 * daysDelta;  // Starvation hurts morale
      }

      // Attacker casualties (defenders fight back)
      const counterAttackStrength = siege.defendingForce * siege.currentDefenseStrength * 0.1;
      const attackerLosses = counterAttackStrength * daysDelta;
      siege.attackingForce = Math.max(0, siege.attackingForce - attackerLosses);

      // Defender casualties
      const defenderLosses = damagePerDay * 5 * daysDelta;
      siege.defendingForce = Math.max(0, siege.defendingForce - defenderLosses);

      // Update progress
      siege.captureProgress = 1 - (siege.currentDefenseStrength * 0.7 + siege.populationMorale * 0.3);

      // Check for status changes
      if (siege.currentDefenseStrength < 0.3 && siege.captureProgress > 0.7) {
        siege.status = 'GROUND_ASSAULT';
        this.recordBattleEvent(siege, 'ASSAULT', 'Ground assault phase begins', attackerLosses, defenderLosses, civilianCasualtiesThisUpdate);
      }

      if (siege.populationMorale < 0.2 || siege.defenderSupplies < 1) {
        siege.status = 'SURRENDER_TALKS';
        console.log(`[Conquest] ${siege.targetName} considering surrender - Morale: ${(siege.populationMorale * 100).toFixed(0)}%, Supplies: ${siege.defenderSupplies.toFixed(1)} days`);
      }

      if (siege.attackingForce < siege.defendingForce * 0.3) {
        // Attackers too weak to continue
        this.liftSiege(siege, 'DEFENDER_VICTORY');
        return;
      }
    }

    // Ground assault phase - final push
    if (siege.status === 'GROUND_ASSAULT') {
      const assaultIntensity = siege.attackingForce / Math.max(1, siege.defendingForce);

      // High casualties in ground assault
      const attackerLosses = siege.attackingForce * 0.02 * daysDelta;  // 2% per day
      const defenderLosses = siege.defendingForce * 0.05 * daysDelta;  // 5% per day
      const civilianCasualties = defenderLosses * 2;  // Civilians caught in crossfire

      siege.attackingForce -= attackerLosses;
      siege.defendingForce -= defenderLosses;
      siege.civilianCasualties += civilianCasualties;

      siege.captureProgress += assaultIntensity * 0.1 * daysDelta;

      // Check for capture
      if (siege.captureProgress >= 1.0 || siege.defendingForce < 100) {
        this.captureTerritoryFromSiege(siege);
        return;
      }

      // Check for attacker defeat
      if (siege.attackingForce < 500) {
        this.liftSiege(siege, 'ATTACKER_WITHDRAWAL');
        return;
      }
    }

    // Surrender negotiations
    if (siege.status === 'SURRENDER_TALKS') {
      // 50% chance per day of surrender
      if (Math.random() < 0.5 * daysDelta) {
        this.captureTerritoryFromSiege(siege, 'NEGOTIATED_SURRENDER');
      }
    }

    // Periodic battle events
    if (Math.random() < 0.1 * daysDelta) {
      this.generateRandomBattleEvent(siege);
    }
  }

  /**
   * Update attacker logistics (supply lines can be disrupted)
   */
  private updateAttackerLogistics(siege: SiegeOperation, daysDelta: number): void {
    // Logistics degrade over time if siege drags on
    if (siege.siegeDuration > 86400 * 30) {  // After 30 days
      siege.attackerLogistics -= 0.01 * daysDelta;  // 1% per day degradation
      siege.attackerLogistics = Math.max(0.3, siege.attackerLogistics);  // Minimum 30%
    }

    // Random supply line disruptions
    if (Math.random() < 0.05 * daysDelta) {
      siege.attackerLogistics *= 0.8;
      this.recordBattleEvent(siege, 'SUPPLY_DROP', 'Supply convoy disrupted', 0, 0, 0);
    }
  }

  /**
   * Calculate bombardment intensity based on forces and defense
   */
  private calculateBombardmentIntensity(attackingForce: number, defenseRating: number): number {
    // Higher attacking force = more damage per day
    // Higher defense = reduces damage
    const baseIntensity = attackingForce / 1000;  // 1000 troops = 1 intensity
    const defenseDampening = 1 + (defenseRating / 10);
    return baseIntensity / defenseDampening;
  }

  /**
   * Estimate how long siege will take
   */
  private estimateSiegeDuration(defenseRating: number, attackingForce: number, defendingForce: number): number {
    const baseDays = this.BASE_SIEGE_DAYS_PER_DEFENSE_POINT * defenseRating;
    const forceRatio = attackingForce / Math.max(1, defendingForce);

    if (forceRatio > 3) {
      // Overwhelming force - faster
      return baseDays * 0.5;
    } else if (forceRatio > 1.5) {
      // Superior force - normal
      return baseDays;
    } else {
      // Evenly matched or weaker - slower
      return baseDays * 1.5;
    }
  }

  /**
   * Lift siege (defenders won)
   */
  private liftSiege(siege: SiegeOperation, outcome: SiegeOutcome): void {
    siege.status = 'LIFTED';
    siege.outcome = outcome;
    siege.endedAt = Date.now() / 1000;

    console.log(`[Conquest] ⚔️ SIEGE LIFTED: ${siege.targetName} - ${outcome}`);
    console.log(`  Duration: ${(siege.siegeDuration / 86400).toFixed(1)} days`);
    console.log(`  Casualties: Military ${(siege.defendingForce * 0.3).toFixed(0)}, Civilian ${siege.civilianCasualties.toFixed(0)}`);

    // Emit siege ended event
    this.emitSiegeEnded({
      type: 'SIEGE_ENDED',
      timestamp: Date.now() / 1000,
      siegeId: siege.id,
      outcome,
      winner: siege.defenderFaction
    });

    // Record in history
    this.conquestHistory.push({
      timestamp: Date.now() / 1000,
      type: 'SIEGE_LIFTED',
      attacker: siege.attackerFaction,
      defender: siege.defenderFaction,
      target: siege.targetName,
      outcome,
      duration: siege.siegeDuration
    });
  }

  /**
   * Capture territory after successful siege - NOW WITH REAL OWNERSHIP TRANSFER
   */
  private captureTerritoryFromSiege(siege: SiegeOperation, outcome: SiegeOutcome = 'ATTACKER_VICTORY'): void {
    siege.status = 'CAPTURED';
    siege.outcome = outcome;
    siege.endedAt = Date.now() / 1000;

    console.log(`[Conquest] 🏴 TERRITORY CAPTURED: ${siege.targetName}`);
    console.log(`  ${siege.defenderFaction} → ${siege.attackerFaction}`);
    console.log(`  Duration: ${(siege.siegeDuration / 86400).toFixed(1)} days`);
    console.log(`  Casualties: Attacker ${(siege.attackingForce * 0.4).toFixed(0)}, Defender ${siege.defendingForce.toFixed(0)}, Civilian ${siege.civilianCasualties.toFixed(0)}`);

    // Calculate consequences
    const consequences = this.calculateConsequences(siege);

    // === THE FIX: ACTUALLY TRANSFER OWNERSHIP ===
    let ownershipTransferred = false;
    if (siege.targetType === 'STATION') {
      ownershipTransferred = this.transferStationOwnership(siege.targetId, siege.attackerFaction, consequences);
    } else if (siege.targetType === 'CITY') {
      ownershipTransferred = this.transferCityOwnership(siege.targetId, siege.attackerFaction, consequences);
    }

    if (!ownershipTransferred) {
      console.error(`[Conquest] ❌ Failed to transfer ownership of ${siege.targetName} - target may have been destroyed`);
      // Handle edge case: station/city was destroyed during siege
      return;
    }

    // Create occupation state
    this.createOccupation(siege, consequences);

    // Emit siege ended event
    this.emitSiegeEnded({
      type: 'SIEGE_ENDED',
      timestamp: Date.now() / 1000,
      siegeId: siege.id,
      outcome,
      winner: siege.attackerFaction
    });

    // Record in history
    this.conquestHistory.push({
      timestamp: Date.now() / 1000,
      type: 'TERRITORY_CAPTURED',
      attacker: siege.attackerFaction,
      defender: siege.defenderFaction,
      target: siege.targetName,
      outcome,
      duration: siege.siegeDuration,
      consequences
    });
  }

  /**
   * Calculate consequences of conquest
   */
  private calculateConsequences(siege: SiegeOperation): ConquestConsequences {
    // Calculate infrastructure damage
    const infrastructureDamage = 1 - siege.structuralIntegrity;

    // Military casualties
    const militaryCasualties = new Map<StationFaction, number>();
    militaryCasualties.set(siege.attackerFaction, siege.attackingForce * 0.4);  // 40% losses
    militaryCasualties.set(siege.defenderFaction, siege.defendingForce);  // All defenders

    // Economic loss
    const economicLoss = infrastructureDamage * 1000000 * (siege.baseDefenseRating + 1);

    // Calculate refugees
    const populationEstimate = 10000 * (siege.baseDefenseRating + 1);  // Rough estimate
    const refugees = populationEstimate * (0.1 + infrastructureDamage * 0.3);

    // Reputation impact
    const reputationChange = new Map<StationFaction, number>();
    // War crimes if excessive civilian casualties
    const warCrimes = siege.civilianCasualties > populationEstimate * 0.1;

    if (warCrimes) {
      console.log(`  ⚠️ WAR CRIMES: Excessive civilian casualties (${siege.civilianCasualties.toFixed(0)})`);
    }

    return {
      territoryTransferred: true,
      newOwner: siege.attackerFaction,
      oldOwner: siege.defenderFaction,
      militaryCasualties,
      civilianCasualties: siege.civilianCasualties,
      infrastructureDamage,
      economicLoss,
      productionLoss: infrastructureDamage * 0.5,
      refugees,
      populationLoss: siege.civilianCasualties + refugees,
      populationMoraleChange: -0.5,
      reputationChange,
      warCrimesCommitted: warCrimes,
      strategicValue: siege.baseDefenseRating,
      borderChange: true,
      controllingPower: siege.attackerFaction
    };
  }

  /**
   * Create occupation state for captured territory
   */
  private createOccupation(siege: SiegeOperation, consequences: ConquestConsequences): void {
    const population = 10000 * (siege.baseDefenseRating + 1) - consequences.populationLoss;
    const requiredGarrison = population * this.MIN_GARRISON_PERCENT;

    const occupation: OccupationState = {
      id: `occupation_${siege.targetId}_${Date.now()}`,
      territoryId: siege.targetId,
      territoryName: siege.targetName,
      territoryType: siege.targetType,
      originalOwner: siege.defenderFaction,
      occupier: siege.attackerFaction,
      garrisonSize: Math.min(siege.attackingForce * 0.6, requiredGarrison * 2),  // Leave 60% as garrison
      requiredGarrison,
      garrisonStrength: 0.8,  // Tired from battle
      population,
      resistanceLevel: 0.7,  // High initial resistance
      collaborationLevel: 0.1,  // Few collaborators initially
      loyaltyToOccupier: -0.8,  // Very hostile
      controlLevel: 0.5,  // Partial control
      stabilityIndex: 0.2,  // Unstable
      resourceExtraction: 0.3,  // Only getting 30% of resources initially
      occupationCost: requiredGarrison * 10,  // Cost per day
      economicProductivity: 1 - consequences.infrastructureDamage,
      occupationStarted: Date.now() / 1000,
      daysSinceOccupation: 0,
      insurgentAttacks: 0,
      lastAttackTimestamp: 0,
      insurgentStrength: population * this.INSURGENT_SPAWN_RATE,
      pacificationLevel: 0,
      heartsAndMinds: 0,
      represionLevel: 0.5,  // Moderate repression
      liberationAttempts: 0,
      liberationProgress: 0,
      status: 'INITIAL_OCCUPATION'
    };

    this.occupations.set(occupation.id, occupation);

    console.log(`[Conquest] 👥 OCCUPATION BEGINS: ${siege.targetName}`);
    console.log(`  Garrison: ${occupation.garrisonSize.toFixed(0)} / ${requiredGarrison.toFixed(0)} required`);
    console.log(`  Population: ${population.toFixed(0)} (Resistance: ${(occupation.resistanceLevel * 100).toFixed(0)}%)`);
  }

  /**
   * Update occupation state
   */
  private updateOccupation(occupation: OccupationState, deltaTime: number): void {
    const daysDelta = deltaTime / 86400;
    occupation.daysSinceOccupation += daysDelta;

    // Check garrison adequacy
    const garrisonRatio = occupation.garrisonSize / occupation.requiredGarrison;

    if (garrisonRatio < 0.5) {
      // Severely under-garrisoned - lose control
      occupation.controlLevel -= 0.1 * daysDelta;
      occupation.resistanceLevel = Math.min(1, occupation.resistanceLevel + 0.05 * daysDelta);
    } else if (garrisonRatio < 1.0) {
      // Under-garrisoned - slow control loss
      occupation.controlLevel -= 0.03 * daysDelta;
    } else {
      // Adequate garrison - can maintain/improve control
      occupation.controlLevel = Math.min(1, occupation.controlLevel + 0.02 * daysDelta);
    }

    // Resistance dynamics
    if (occupation.controlLevel > 0.7) {
      // Strong control reduces resistance
      occupation.resistanceLevel -= this.RESISTANCE_DECAY_RATE * daysDelta;
    } else {
      // Weak control allows resistance to grow
      occupation.resistanceLevel = Math.min(1, occupation.resistanceLevel + 0.02 * daysDelta);
    }

    // Insurgent activity
    if (occupation.resistanceLevel > 0.5) {
      // Chance of insurgent attack
      if (Math.random() < occupation.resistanceLevel * 0.1 * daysDelta) {
        this.insurgentAttack(occupation);
      }
    }

    // Pacification efforts
    if (occupation.pacificationLevel > 0.3) {
      // Hearts and minds campaign
      occupation.heartsAndMinds += 0.01 * occupation.pacificationLevel * daysDelta;
      occupation.loyaltyToOccupier += 0.005 * daysDelta;
      occupation.collaborationLevel = Math.min(0.5, occupation.collaborationLevel + 0.005 * daysDelta);
    }

    // Repression
    if (occupation.represionLevel > 0.5) {
      // Heavy repression crushes resistance but increases hate
      occupation.resistanceLevel *= (1 - 0.05 * daysDelta);
      occupation.loyaltyToOccupier -= 0.01 * daysDelta;
      occupation.insurgentStrength *= (1 - 0.03 * daysDelta);
    }

    // Economic productivity
    if (occupation.stabilityIndex > 0.6) {
      // Stable occupation allows economy to recover
      occupation.economicProductivity = Math.min(0.9, occupation.economicProductivity + 0.02 * daysDelta);
      occupation.resourceExtraction = Math.min(0.8, occupation.resourceExtraction + 0.03 * daysDelta);
    } else {
      // Unstable occupation hurts economy
      occupation.economicProductivity = Math.max(0.3, occupation.economicProductivity - 0.01 * daysDelta);
    }

    // Update status
    this.updateOccupationStatus(occupation);

    // Check for liberation attempts
    if (occupation.resistanceLevel > 0.7 && Math.random() < 0.01 * daysDelta) {
      this.liberationAttempt(occupation);
    }
  }

  /**
   * Insurgent attack on occupation forces
   */
  private insurgentAttack(occupation: OccupationState): void {
    occupation.insurgentAttacks++;
    occupation.lastAttackTimestamp = Date.now() / 1000;

    // Calculate casualties
    const attackStrength = occupation.insurgentStrength * occupation.resistanceLevel;
    const garrisonLosses = attackStrength * 0.1;
    const insurgentLosses = garrisonLosses * 0.5;  // Garrison fights back

    occupation.garrisonSize = Math.max(0, occupation.garrisonSize - garrisonLosses);
    occupation.insurgentStrength = Math.max(0, occupation.insurgentStrength - insurgentLosses);

    // Impact on control
    occupation.controlLevel -= 0.05;
    occupation.stabilityIndex -= 0.1;

    console.log(`[Conquest] 💥 Insurgent attack in ${occupation.territoryName}: ${garrisonLosses.toFixed(0)} garrison casualties`);

    // Reprisal increases repression
    if (occupation.represionLevel < 0.9) {
      occupation.represionLevel += 0.1;
    }
  }

  /**
   * Original owner attempts liberation
   */
  private liberationAttempt(occupation: OccupationState): void {
    occupation.liberationAttempts++;

    console.log(`[Conquest] 🗽 Liberation attempt #${occupation.liberationAttempts} in ${occupation.territoryName} by ${occupation.originalOwner}`);

    // Liberation force strength (would come from faction military)
    const liberationForce = occupation.population * 0.1;
    const garrisonEffective = occupation.garrisonSize * occupation.garrisonStrength;

    if (liberationForce > garrisonEffective * 1.5) {
      // Successful liberation
      this.liberateTerritory(occupation);
    } else {
      // Failed attempt
      occupation.liberationProgress += 0.2;
      occupation.garrisonSize *= 0.9;  // Garrison takes losses

      if (occupation.liberationProgress > 0.8) {
        occupation.status = 'LIBERATION_IMMINENT';
      }
    }
  }

  /**
   * Liberate occupied territory - NOW WITH REAL OWNERSHIP TRANSFER
   */
  private liberateTerritory(occupation: OccupationState): void {
    occupation.status = 'LIBERATED';

    console.log(`[Conquest] 🗽 LIBERATED: ${occupation.territoryName} returned to ${occupation.originalOwner}`);
    console.log(`  Occupation duration: ${occupation.daysSinceOccupation.toFixed(1)} days`);
    console.log(`  Insurgent attacks: ${occupation.insurgentAttacks}`);

    // === THE FIX: ACTUALLY TRANSFER BACK TO ORIGINAL OWNER ===
    const consequences: ConquestConsequences = {
      territoryTransferred: true,
      newOwner: occupation.originalOwner,
      oldOwner: occupation.occupier,
      militaryCasualties: new Map([[occupation.occupier, occupation.garrisonSize]]),
      civilianCasualties: occupation.population * 0.05, // 5% casualties in liberation
      infrastructureDamage: 0.2, // Less damage during liberation
      economicLoss: 100000,
      productionLoss: 0.1,
      refugees: occupation.population * 0.05,
      populationLoss: occupation.population * 0.1,
      populationMoraleChange: 0.5, // Morale boost from liberation
      reputationChange: new Map(),
      warCrimesCommitted: false,
      strategicValue: 5,
      borderChange: true,
      controllingPower: occupation.originalOwner
    };

    let ownershipTransferred = false;
    if (occupation.territoryType === 'STATION') {
      ownershipTransferred = this.transferStationOwnership(occupation.territoryId, occupation.originalOwner, consequences);
    } else if (occupation.territoryType === 'CITY') {
      ownershipTransferred = this.transferCityOwnership(occupation.territoryId, occupation.originalOwner, consequences);
    }

    if (!ownershipTransferred) {
      console.error(`[Conquest] ❌ Failed to liberate ${occupation.territoryName} - target may have been destroyed`);
      return;
    }

    // Emit liberation event
    this.emitTerritoryLiberation({
      type: 'TERRITORY_LIBERATED',
      timestamp: Date.now() / 1000,
      territoryId: occupation.territoryId,
      territoryName: occupation.territoryName,
      liberator: occupation.originalOwner,
      occupier: occupation.occupier,
      occupationDuration: occupation.daysSinceOccupation * 86400
    });

    // Record in history
    this.conquestHistory.push({
      timestamp: Date.now() / 1000,
      type: 'LIBERATION',
      attacker: occupation.originalOwner,
      defender: occupation.occupier,
      target: occupation.territoryName,
      outcome: 'DEFENDER_VICTORY',
      duration: occupation.daysSinceOccupation * 86400
    });
  }

  /**
   * Update occupation status based on conditions
   */
  private updateOccupationStatus(occupation: OccupationState): void {
    if (occupation.daysSinceOccupation < 7) {
      occupation.status = 'INITIAL_OCCUPATION';
    } else if (occupation.resistanceLevel > 0.6) {
      occupation.status = 'INSURGENCY';
    } else if (occupation.resistanceLevel > 0.3) {
      occupation.status = 'CONTESTED';
    } else if (occupation.resistanceLevel < this.PACIFICATION_THRESHOLD) {
      occupation.status = 'PACIFIED';
    }

    if (occupation.loyaltyToOccupier > 0.5 && occupation.collaborationLevel > 0.4) {
      occupation.status = 'INTEGRATED';
    }

    if (occupation.liberationProgress > 0.8) {
      occupation.status = 'LIBERATION_IMMINENT';
    }

    // Update stability index
    occupation.stabilityIndex =
      occupation.controlLevel * 0.4 +
      (1 - occupation.resistanceLevel) * 0.3 +
      occupation.collaborationLevel * 0.3;
  }

  /**
   * Record battle event in siege
   */
  private recordBattleEvent(
    siege: SiegeOperation,
    type: BattleEvent['type'],
    description: string,
    attackerLosses: number,
    defenderLosses: number,
    civilianCasualties: number
  ): void {
    siege.battleEvents.push({
      timestamp: Date.now() / 1000,
      type,
      description,
      attackerLosses,
      defenderLosses,
      civilianCasualties,
      impactOnProgress: 0.05
    });

    // Keep only last 20 events
    if (siege.battleEvents.length > 20) {
      siege.battleEvents = siege.battleEvents.slice(-20);
    }
  }

  /**
   * Generate random battle event
   */
  private generateRandomBattleEvent(siege: SiegeOperation): void {
    const eventTypes: BattleEvent['type'][] = ['BOMBARDMENT', 'SORTIE', 'SUPPLY_DROP', 'CIVILIAN_EXODUS'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    let description = '';
    let attackerLosses = 0;
    let defenderLosses = 0;
    let civilianCasualties = 0;

    switch (type) {
      case 'SORTIE':
        description = 'Defenders launch desperate sortie';
        attackerLosses = Math.random() * 100;
        defenderLosses = Math.random() * 50;
        break;
      case 'CIVILIAN_EXODUS':
        description = 'Civilians flee under fire';
        civilianCasualties = Math.random() * 200;
        siege.evacuees += civilianCasualties;
        break;
      case 'SUPPLY_DROP':
        description = 'Relief supplies reach defenders';
        siege.defenderSupplies += 5;
        siege.populationMorale += 0.1;
        break;
    }

    this.recordBattleEvent(siege, type, description, attackerLosses, defenderLosses, civilianCasualties);
  }

  /**
   * Get all active sieges
   */
  public getActiveSieges(): SiegeOperation[] {
    return Array.from(this.activeSieges.values());
  }

  /**
   * Get all occupations
   */
  public getOccupations(): OccupationState[] {
    return Array.from(this.occupations.values());
  }

  /**
   * Get occupation by territory ID
   */
  public getOccupationByTerritory(territoryId: string): OccupationState | null {
    for (const occupation of this.occupations.values()) {
      if (occupation.territoryId === territoryId) {
        return occupation;
      }
    }
    return null;
  }

  /**
   * Get siege status report
   */
  public getSiegeReport(siegeId: string): string {
    const siege = this.activeSieges.get(siegeId);
    if (!siege) return 'Siege not found';

    const lines: string[] = [];
    lines.push(`=== SIEGE REPORT: ${siege.targetName} ===`);
    lines.push(`Status: ${siege.status}`);
    lines.push(`Duration: ${(siege.siegeDuration / 86400).toFixed(1)} days`);
    lines.push(`Progress: ${(siege.captureProgress * 100).toFixed(0)}%`);
    lines.push('');
    lines.push(`Attacker: ${siege.attackerFaction} (${siege.attackingForce.toFixed(0)} troops)`);
    lines.push(`Defender: ${siege.defenderFaction} (${siege.defendingForce.toFixed(0)} troops)`);
    lines.push('');
    lines.push(`Defense Strength: ${(siege.currentDefenseStrength * 100).toFixed(0)}%`);
    lines.push(`Structural Integrity: ${(siege.structuralIntegrity * 100).toFixed(0)}%`);
    lines.push(`Population Morale: ${(siege.populationMorale * 100).toFixed(0)}%`);
    lines.push(`Defender Supplies: ${siege.defenderSupplies.toFixed(1)} days`);
    lines.push('');
    lines.push(`Casualties: Military ${(siege.defendingForce * 0.3).toFixed(0)}, Civilian ${siege.civilianCasualties.toFixed(0)}`);
    lines.push(`Evacuees: ${siege.evacuees.toFixed(0)}`);
    lines.push('');
    lines.push(`Estimated capture: ${siege.estimatedDaysToCapture.toFixed(1)} days`);

    return lines.join('\n');
  }

  /**
   * Get occupation status report
   */
  public getOccupationReport(occupationId: string): string {
    const occ = this.occupations.get(occupationId);
    if (!occ) return 'Occupation not found';

    const lines: string[] = [];
    lines.push(`=== OCCUPATION REPORT: ${occ.territoryName} ===`);
    lines.push(`Status: ${occ.status}`);
    lines.push(`Occupier: ${occ.occupier} (was ${occ.originalOwner})`);
    lines.push(`Duration: ${occ.daysSinceOccupation.toFixed(1)} days`);
    lines.push('');
    lines.push(`Garrison: ${occ.garrisonSize.toFixed(0)} / ${occ.requiredGarrison.toFixed(0)} required`);
    lines.push(`Control Level: ${(occ.controlLevel * 100).toFixed(0)}%`);
    lines.push(`Stability: ${(occ.stabilityIndex * 100).toFixed(0)}%`);
    lines.push('');
    lines.push(`Population: ${occ.population.toFixed(0)}`);
    lines.push(`Resistance: ${(occ.resistanceLevel * 100).toFixed(0)}%`);
    lines.push(`Loyalty: ${(occ.loyaltyToOccupier * 100).toFixed(0)}%`);
    lines.push(`Collaboration: ${(occ.collaborationLevel * 100).toFixed(0)}%`);
    lines.push('');
    lines.push(`Insurgent Strength: ${occ.insurgentStrength.toFixed(0)}`);
    lines.push(`Attacks: ${occ.insurgentAttacks}`);
    lines.push('');
    lines.push(`Economic Productivity: ${(occ.economicProductivity * 100).toFixed(0)}%`);
    lines.push(`Resource Extraction: ${(occ.resourceExtraction * 100).toFixed(0)}%`);
    lines.push(`Occupation Cost: ${occ.occupationCost.toFixed(0)} credits/day`);

    return lines.join('\n');
  }

  // ====================================================================
  // SAVE/LOAD SUPPORT
  // ====================================================================

  /**
   * Serialize system state for saving
   */
  serialize(): import('./SaveFileFormat').ConquestSystemState {
    // Serialize active sieges
    const activeSieges = Array.from(this.activeSieges.values()).map(siege => ({
      id: siege.id,
      attackerFaction: siege.attackerFaction,
      defenderFaction: siege.defenderFaction,
      targetId: siege.targetId,
      targetName: siege.targetName,
      targetType: siege.targetType,
      targetLocation: { ...siege.targetLocation },
      attackingForce: siege.attackingForce,
      defendingForce: siege.defendingForce,
      baseDefenseRating: siege.baseDefenseRating,
      currentDefenseStrength: siege.currentDefenseStrength,
      structuralIntegrity: siege.structuralIntegrity,
      siegeStarted: siege.siegeStarted,
      siegeDuration: siege.siegeDuration,
      bombardmentIntensity: siege.bombardmentIntensity,
      civilianCasualties: siege.civilianCasualties,
      populationMorale: siege.populationMorale,
      evacuees: siege.evacuees,
      defenderSupplies: siege.defenderSupplies,
      attackerLogistics: siege.attackerLogistics,
      estimatedDaysToCapture: siege.estimatedDaysToCapture,
      captureProgress: siege.captureProgress,
      status: siege.status,
      outcome: siege.outcome,
      endedAt: siege.endedAt,
      battleEvents: siege.battleEvents.map(event => ({ ...event }))
    }));

    // Serialize occupations
    const occupations = Array.from(this.occupations.values()).map(occ => ({
      id: occ.id,
      territoryId: occ.territoryId,
      territoryName: occ.territoryName,
      territoryType: occ.territoryType,
      originalOwner: occ.originalOwner,
      occupier: occ.occupier,
      garrisonSize: occ.garrisonSize,
      requiredGarrison: occ.requiredGarrison,
      garrisonStrength: occ.garrisonStrength,
      population: occ.population,
      resistanceLevel: occ.resistanceLevel,
      collaborationLevel: occ.collaborationLevel,
      loyaltyToOccupier: occ.loyaltyToOccupier,
      controlLevel: occ.controlLevel,
      stabilityIndex: occ.stabilityIndex,
      resourceExtraction: occ.resourceExtraction,
      occupationCost: occ.occupationCost,
      economicProductivity: occ.economicProductivity,
      occupationStarted: occ.occupationStarted,
      daysSinceOccupation: occ.daysSinceOccupation,
      insurgentAttacks: occ.insurgentAttacks,
      lastAttackTimestamp: occ.lastAttackTimestamp,
      insurgentStrength: occ.insurgentStrength,
      pacificationLevel: occ.pacificationLevel,
      heartsAndMinds: occ.heartsAndMinds,
      represionLevel: occ.represionLevel,
      liberationAttempts: occ.liberationAttempts,
      liberationProgress: occ.liberationProgress,
      status: occ.status
    }));

    // Serialize conquest history
    const conquestHistory = this.conquestHistory.map(record => {
      const serialized: import('./SaveFileFormat').SerializedConquestRecord = {
        timestamp: record.timestamp,
        type: record.type,
        attacker: record.attacker,
        defender: record.defender,
        target: record.target,
        outcome: record.outcome,
        duration: record.duration
      };

      if (record.consequences) {
        serialized.consequences = {
          territoryTransferred: record.consequences.territoryTransferred,
          newOwner: record.consequences.newOwner,
          oldOwner: record.consequences.oldOwner,
          militaryCasualties: Array.from(record.consequences.militaryCasualties.entries()).map(([faction, casualties]) => ({ faction, casualties })),
          civilianCasualties: record.consequences.civilianCasualties,
          infrastructureDamage: record.consequences.infrastructureDamage,
          economicLoss: record.consequences.economicLoss,
          productionLoss: record.consequences.productionLoss,
          refugees: record.consequences.refugees,
          populationLoss: record.consequences.populationLoss,
          populationMoraleChange: record.consequences.populationMoraleChange,
          reputationChange: Array.from(record.consequences.reputationChange.entries()).map(([faction, change]) => ({ faction, change })),
          warCrimesCommitted: record.consequences.warCrimesCommitted,
          strategicValue: record.consequences.strategicValue,
          borderChange: record.consequences.borderChange,
          controllingPower: record.consequences.controllingPower
        };
      }

      return serialized;
    });

    return {
      activeSieges,
      occupations,
      conquestHistory
    };
  }

  /**
   * Deserialize and restore system state
   */
  deserialize(state: import('./SaveFileFormat').ConquestSystemState): void {
    console.log('[ConquestSystem] Deserializing state...');

    // Clear existing state
    this.activeSieges.clear();
    this.occupations.clear();
    this.conquestHistory = [];

    // Restore active sieges
    for (const serializedSiege of state.activeSieges) {
      const siege: SiegeOperation = {
        id: serializedSiege.id,
        attackerFaction: serializedSiege.attackerFaction,
        defenderFaction: serializedSiege.defenderFaction,
        targetId: serializedSiege.targetId,
        targetName: serializedSiege.targetName,
        targetType: serializedSiege.targetType,
        targetLocation: { ...serializedSiege.targetLocation },
        attackingForce: serializedSiege.attackingForce,
        defendingForce: serializedSiege.defendingForce,
        baseDefenseRating: serializedSiege.baseDefenseRating,
        currentDefenseStrength: serializedSiege.currentDefenseStrength,
        structuralIntegrity: serializedSiege.structuralIntegrity,
        siegeStarted: serializedSiege.siegeStarted,
        siegeDuration: serializedSiege.siegeDuration,
        bombardmentIntensity: serializedSiege.bombardmentIntensity,
        civilianCasualties: serializedSiege.civilianCasualties,
        populationMorale: serializedSiege.populationMorale,
        evacuees: serializedSiege.evacuees,
        defenderSupplies: serializedSiege.defenderSupplies,
        attackerLogistics: serializedSiege.attackerLogistics,
        estimatedDaysToCapture: serializedSiege.estimatedDaysToCapture,
        captureProgress: serializedSiege.captureProgress,
        status: serializedSiege.status,
        outcome: serializedSiege.outcome,
        endedAt: serializedSiege.endedAt,
        battleEvents: serializedSiege.battleEvents.map(event => ({ ...event }))
      };
      this.activeSieges.set(siege.id, siege);
    }

    // Restore occupations
    for (const serializedOcc of state.occupations) {
      const occupation: OccupationState = {
        id: serializedOcc.id,
        territoryId: serializedOcc.territoryId,
        territoryName: serializedOcc.territoryName,
        territoryType: serializedOcc.territoryType,
        originalOwner: serializedOcc.originalOwner,
        occupier: serializedOcc.occupier,
        garrisonSize: serializedOcc.garrisonSize,
        requiredGarrison: serializedOcc.requiredGarrison,
        garrisonStrength: serializedOcc.garrisonStrength,
        population: serializedOcc.population,
        resistanceLevel: serializedOcc.resistanceLevel,
        collaborationLevel: serializedOcc.collaborationLevel,
        loyaltyToOccupier: serializedOcc.loyaltyToOccupier,
        controlLevel: serializedOcc.controlLevel,
        stabilityIndex: serializedOcc.stabilityIndex,
        resourceExtraction: serializedOcc.resourceExtraction,
        occupationCost: serializedOcc.occupationCost,
        economicProductivity: serializedOcc.economicProductivity,
        occupationStarted: serializedOcc.occupationStarted,
        daysSinceOccupation: serializedOcc.daysSinceOccupation,
        insurgentAttacks: serializedOcc.insurgentAttacks,
        lastAttackTimestamp: serializedOcc.lastAttackTimestamp,
        insurgentStrength: serializedOcc.insurgentStrength,
        pacificationLevel: serializedOcc.pacificationLevel,
        heartsAndMinds: serializedOcc.heartsAndMinds,
        represionLevel: serializedOcc.represionLevel,
        liberationAttempts: serializedOcc.liberationAttempts,
        liberationProgress: serializedOcc.liberationProgress,
        status: serializedOcc.status
      };
      this.occupations.set(occupation.id, occupation);
    }

    // Restore conquest history
    this.conquestHistory = state.conquestHistory.map(serialized => {
      const record: ConquestRecord = {
        timestamp: serialized.timestamp,
        type: serialized.type,
        attacker: serialized.attacker,
        defender: serialized.defender,
        target: serialized.target,
        outcome: serialized.outcome,
        duration: serialized.duration
      };

      if (serialized.consequences) {
        record.consequences = {
          territoryTransferred: serialized.consequences.territoryTransferred,
          newOwner: serialized.consequences.newOwner,
          oldOwner: serialized.consequences.oldOwner,
          militaryCasualties: new Map(serialized.consequences.militaryCasualties.map(({ faction, casualties }) => [faction, casualties])),
          civilianCasualties: serialized.consequences.civilianCasualties,
          infrastructureDamage: serialized.consequences.infrastructureDamage,
          economicLoss: serialized.consequences.economicLoss,
          productionLoss: serialized.consequences.productionLoss,
          refugees: serialized.consequences.refugees,
          populationLoss: serialized.consequences.populationLoss,
          populationMoraleChange: serialized.consequences.populationMoraleChange,
          reputationChange: new Map(serialized.consequences.reputationChange.map(({ faction, change }) => [faction, change])),
          warCrimesCommitted: serialized.consequences.warCrimesCommitted,
          strategicValue: serialized.consequences.strategicValue,
          borderChange: serialized.consequences.borderChange,
          controllingPower: serialized.consequences.controllingPower
        };
      }

      return record;
    });

    console.log(`[ConquestSystem] Restored ${this.activeSieges.size} sieges, ${this.occupations.size} occupations, ${this.conquestHistory.length} history records`);
  }
}

interface ConquestRecord {
  timestamp: number;
  type: 'SIEGE_STARTED' | 'SIEGE_LIFTED' | 'TERRITORY_CAPTURED' | 'LIBERATION';
  attacker: StationFaction;
  defender: StationFaction;
  target: string;
  outcome: SiegeOutcome;
  duration: number;
  consequences?: ConquestConsequences;
}
