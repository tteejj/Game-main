/**
 * FleetCoordinationSystem.ts - Group Military Operations
 *
 * Complete implementation of fleet coordination for organized warfare:
 * - Fleet formation and management (LINE, WEDGE, SPHERE, DEFENSIVE)
 * - Coordinated movement as cohesive units
 * - Fleet-level combat with formation bonuses
 * - Dynamic fleet composition and reorganization
 * - Integration with FactionMilitaryAI and ConquestSystem
 * - Focus fire and tactical coordination
 * - Fleet splitting and merging capabilities
 */

import { Vector3 } from './CelestialBody';
import { NPCShip, ShipStats } from './NPCShipAI';
import { StationFaction } from './StationGenerator';
import { ShipClass } from './NPCShipTypes';

export type FormationType =
  | 'LINE'        // Broadside formation - maximum firepower forward
  | 'WEDGE'       // Penetration formation - concentrated assault
  | 'SPHERE'      // Defensive sphere - protects center ships
  | 'DEFENSIVE'   // Wall formation - blocks and shields
  | 'SCATTER'     // Dispersed - evasive but weak
  | 'COLUMN'      // Single file - fast travel
  | 'SCREEN';     // Screening formation - scouts ahead

export type FleetOrder =
  | 'ATTACK'      // Engage enemy fleets/stations
  | 'DEFEND'      // Protect territory
  | 'PATROL'      // Guard trade routes
  | 'ESCORT'      // Protect specific ships/convoys
  | 'SIEGE'       // Lay siege to station/city
  | 'INTERCEPT'   // Pursue and engage fleeing enemy
  | 'REGROUP'     // Reform after battle
  | 'RETREAT'     // Withdraw from combat
  | 'HOLD';       // Maintain position

export type FleetStatus =
  | 'FORMING'       // Gathering ships
  | 'READY'         // Fully formed, awaiting orders
  | 'MOVING'        // Traveling to destination
  | 'ENGAGED'       // In combat
  | 'SIEGING'       // Besieging target
  | 'DAMAGED'       // Significant casualties, needs repair
  | 'RETREATING'    // Withdrawing from combat
  | 'DISBANDED';    // Fleet dissolved

export interface Fleet {
  id: string;
  name: string;
  faction: StationFaction;

  // Composition
  ships: string[];                    // Ship IDs in this fleet
  flagship?: string;                  // Command ship ID
  shipsByRole: Map<ShipRole, string[]>; // Organized by role

  // Formation
  formation: FormationType;
  formationPositions: Map<string, FormationPosition>; // Ship ID -> position in formation
  formationCohesion: number;          // 0-1 (how well ships maintain formation)

  // Orders
  currentOrder: FleetOrder;
  objective?: FleetObjective;
  orderQueue: FleetOrder[];           // Queued orders

  // Position and movement
  centerPosition: Vector3;            // Fleet center of mass
  heading: Vector3;                   // Direction of movement
  averageSpeed: number;               // Slowest ship determines fleet speed
  destination?: Vector3;

  // Combat strength
  totalFirepower: number;             // Combined weapon power
  totalDefense: number;               // Combined hull + shields
  combatEffectiveness: number;        // 0-1 (morale, damage, cohesion)
  formationBonus: number;             // Combat bonus from formation (1.0 = no bonus, 1.5 = +50%)

  // Status
  status: FleetStatus;
  morale: number;                     // 0-1 fleet morale
  suppliesRemaining: number;          // Days of supplies
  damagePercent: number;              // 0-1 average damage
  casualtyCount: number;              // Ships lost

  // Combat tracking
  engagements: number;                // Number of battles fought
  victories: number;                  // Battles won
  currentTarget?: string;             // ID of target fleet/station
  inCombatWith?: string[];            // Enemy fleet IDs

  // Timeline
  createdAt: number;
  lastOrderTime: number;
  lastCombatTime: number;
}

export interface FormationPosition {
  shipId: string;
  role: ShipRole;
  relativePosition: Vector3;          // Position relative to fleet center
  positionIndex: number;              // Position in formation array
  isInPosition: boolean;              // Ship has reached formation position
}

export type ShipRole =
  | 'FLAGSHIP'      // Command ship
  | 'CAPITAL'       // Heavy warships (battleships, cruisers)
  | 'LINE'          // Main battle line (destroyers, frigates)
  | 'SCREEN'        // Screening force (corvettes, fighters)
  | 'SUPPORT'       // Support vessels (carriers, tankers)
  | 'SCOUT';        // Fast recon ships (interceptors)

export interface FleetObjective {
  type: 'ATTACK_FLEET' | 'ATTACK_STATION' | 'DEFEND_STATION' | 'PATROL_ROUTE' | 'ESCORT_TARGET';
  targetId?: string;                  // Target fleet/station/route ID
  targetLocation?: Vector3;
  priority: number;                   // 0-100
  mustComplete: boolean;              // Can't abandon this objective
  completionCriteria: string;
}

export interface FleetCombatStats {
  fleetId: string;

  // Offensive
  totalWeaponPower: number;
  focusFireMultiplier: number;       // Bonus from coordinated targeting
  alphaStrikePotential: number;      // Max damage in opening volley
  sustainedDPS: number;               // Damage per second sustained

  // Defensive
  totalHullStrength: number;
  totalShieldStrength: number;
  pointDefenseRating: number;        // Anti-missile/fighter defense
  damageReduction: number;            // % reduction from formation

  // Tactical
  fleetSpeed: number;                 // Limited by slowest ship
  turnRate: number;                   // Fleet maneuverability
  sensorRange: number;                // Best sensors in fleet
  ecmStrength: number;                // Electronic countermeasures

  // Bonuses
  formationBonus: number;
  tacticBonus: number;                // From admiral skills
  moraleBonus: number;
}

export interface FleetEngagement {
  id: string;

  // Combatants
  fleetA: string;
  fleetB: string;

  // Location
  location: Vector3;
  startTime: number;
  duration: number;

  // Combat state
  phase: CombatPhase;
  range: number;                      // Distance between fleets

  // Damage tracking
  fleetALosses: number[];             // Ship IDs destroyed
  fleetBLosses: number[];
  fleetADamage: number;               // Total damage taken
  fleetBDamage: number;

  // Tactical state
  fleetAFormation: FormationType;
  fleetBFormation: FormationType;
  currentRound: number;

  // Outcome
  status: 'ONGOING' | 'FLED' | 'DECISIVE' | 'MUTUAL_WITHDRAWAL';
  victor?: string;                    // Winning fleet ID
}

export type CombatPhase =
  | 'APPROACH'      // Fleets closing distance
  | 'LONG_RANGE'    // Long-range fire exchange
  | 'MEDIUM_RANGE'  // Main engagement
  | 'CLOSE_RANGE'   // Knife-fight range
  | 'PURSUIT'       // Chasing fleeing enemy
  | 'DISENGAGING';  // Breaking off combat

export interface FormationTemplate {
  type: FormationType;
  description: string;

  // Combat modifiers
  offensiveBonus: number;             // Damage multiplier
  defensiveBonus: number;             // Damage reduction
  speedModifier: number;              // Movement speed modifier
  cohesionRequirement: number;        // How tight formation must be (0-1)

  // Tactical properties
  bestVs: FormationType[];            // Formations this counters
  weakVs: FormationType[];            // Formations weak against
  idealRange: number;                 // Optimal engagement distance

  // Ship requirements
  minShips: number;
  idealShips: number;

  // Position calculation
  generatePositions: (shipCount: number, roles: Map<ShipRole, number>) => Map<number, Vector3>;
}

export class FleetCoordinationSystem {
  private fleets: Map<string, Fleet> = new Map();
  private engagements: Map<string, FleetEngagement> = new Map();
  private formationTemplates: Map<FormationType, FormationTemplate> = new Map();

  // Ship registry (reference to NPCShipAI ships)
  private ships: Map<string, NPCShip> = new Map();

  // Performance tracking
  private fleetPerformance: Map<string, FleetPerformanceRecord> = new Map();

  // Configuration
  private readonly MAX_FLEET_SIZE = 50;
  private readonly MIN_FLEET_SIZE = 3;
  private readonly FORMATION_DISTANCE = 1000;    // Meters between ships in formation
  private readonly COHESION_DECAY_RATE = 0.01;   // Formation degrades over time
  private readonly FOCUS_FIRE_BONUS = 1.5;        // 50% bonus when coordinating attacks

  constructor() {
    this.initializeFormationTemplates();
    console.log('[FleetCoordination] System initialized - Fleets are now operational');
  }

  /**
   * Initialize formation templates with tactical properties
   */
  private initializeFormationTemplates(): void {
    // LINE formation - broadside firepower
    this.formationTemplates.set('LINE', {
      type: 'LINE',
      description: 'Ships form a battle line to maximize broadside firepower',
      offensiveBonus: 1.3,
      defensiveBonus: 0.9,
      speedModifier: 0.8,
      cohesionRequirement: 0.7,
      bestVs: ['COLUMN', 'SCATTER'],
      weakVs: ['WEDGE'],
      idealRange: 5000,
      minShips: 5,
      idealShips: 10,
      generatePositions: this.generateLineFormation.bind(this)
    });

    // WEDGE formation - penetrating strike
    this.formationTemplates.set('WEDGE', {
      type: 'WEDGE',
      description: 'Concentrated wedge for breaking through enemy lines',
      offensiveBonus: 1.5,
      defensiveBonus: 0.85,
      speedModifier: 1.0,
      cohesionRequirement: 0.8,
      bestVs: ['LINE', 'DEFENSIVE'],
      weakVs: ['SPHERE'],
      idealRange: 3000,
      minShips: 4,
      idealShips: 8,
      generatePositions: this.generateWedgeFormation.bind(this)
    });

    // SPHERE formation - defensive posture
    this.formationTemplates.set('SPHERE', {
      type: 'SPHERE',
      description: 'Spherical formation protecting vulnerable center ships',
      offensiveBonus: 1.0,
      defensiveBonus: 1.4,
      speedModifier: 0.6,
      cohesionRequirement: 0.9,
      bestVs: ['WEDGE', 'SCATTER'],
      weakVs: ['LINE'],
      idealRange: 4000,
      minShips: 6,
      idealShips: 12,
      generatePositions: this.generateSphereFormation.bind(this)
    });

    // DEFENSIVE formation - wall of steel
    this.formationTemplates.set('DEFENSIVE', {
      type: 'DEFENSIVE',
      description: 'Defensive wall to block enemy advance',
      offensiveBonus: 0.9,
      defensiveBonus: 1.5,
      speedModifier: 0.5,
      cohesionRequirement: 0.75,
      bestVs: ['SCATTER', 'COLUMN'],
      weakVs: ['WEDGE', 'LINE'],
      idealRange: 6000,
      minShips: 5,
      idealShips: 10,
      generatePositions: this.generateDefensiveFormation.bind(this)
    });

    // SCATTER formation - evasive
    this.formationTemplates.set('SCATTER', {
      type: 'SCATTER',
      description: 'Dispersed formation for evasion and guerrilla tactics',
      offensiveBonus: 0.8,
      defensiveBonus: 1.2,
      speedModifier: 1.2,
      cohesionRequirement: 0.3,
      bestVs: ['DEFENSIVE'],
      weakVs: ['LINE', 'SPHERE'],
      idealRange: 8000,
      minShips: 3,
      idealShips: 8,
      generatePositions: this.generateScatterFormation.bind(this)
    });

    // COLUMN formation - fast travel
    this.formationTemplates.set('COLUMN', {
      type: 'COLUMN',
      description: 'Single file column for rapid transit',
      offensiveBonus: 0.7,
      defensiveBonus: 0.8,
      speedModifier: 1.3,
      cohesionRequirement: 0.6,
      bestVs: [],
      weakVs: ['LINE', 'WEDGE'],
      idealRange: 10000,
      minShips: 2,
      idealShips: 6,
      generatePositions: this.generateColumnFormation.bind(this)
    });

    // SCREEN formation - forward scouts
    this.formationTemplates.set('SCREEN', {
      type: 'SCREEN',
      description: 'Screening force with scouts ahead of main fleet',
      offensiveBonus: 1.1,
      defensiveBonus: 1.0,
      speedModifier: 1.1,
      cohesionRequirement: 0.5,
      bestVs: ['SCATTER', 'COLUMN'],
      weakVs: ['WEDGE'],
      idealRange: 7000,
      minShips: 4,
      idealShips: 10,
      generatePositions: this.generateScreenFormation.bind(this)
    });

    console.log(`[FleetCoordination] Loaded ${this.formationTemplates.size} formation templates`);
  }

  // ====================================================================
  // FLEET CREATION AND MANAGEMENT
  // ====================================================================

  /**
   * Create a new fleet from a group of ships
   */
  public createFleet(
    faction: StationFaction,
    shipIds: string[],
    name?: string,
    flagship?: string
  ): Fleet {
    if (shipIds.length < this.MIN_FLEET_SIZE) {
      throw new Error(`Fleet requires at least ${this.MIN_FLEET_SIZE} ships`);
    }

    if (shipIds.length > this.MAX_FLEET_SIZE) {
      throw new Error(`Fleet cannot exceed ${this.MAX_FLEET_SIZE} ships`);
    }

    const fleetId = `fleet_${faction}_${Date.now()}`;
    const fleetName = name || this.generateFleetName(faction);

    // Organize ships by role
    const shipsByRole = this.categorizeShipsByRole(shipIds);

    // Select flagship if not provided
    const flagshipId = flagship || this.selectFlagship(shipIds);

    // Calculate fleet center position
    const centerPosition = this.calculateFleetCenter(shipIds);

    // Calculate combat stats
    const combatStats = this.calculateFleetCombatStats(shipIds, 'LINE');

    const fleet: Fleet = {
      id: fleetId,
      name: fleetName,
      faction,
      ships: [...shipIds],
      flagship: flagshipId,
      shipsByRole,
      formation: 'COLUMN',  // Start in travel formation
      formationPositions: new Map(),
      formationCohesion: 1.0,
      currentOrder: 'HOLD',
      orderQueue: [],
      centerPosition,
      heading: { x: 1, y: 0, z: 0 },
      averageSpeed: combatStats.fleetSpeed,
      totalFirepower: combatStats.totalWeaponPower,
      totalDefense: combatStats.totalHullStrength + combatStats.totalShieldStrength,
      combatEffectiveness: 1.0,
      formationBonus: 1.0,
      status: 'FORMING',
      morale: 0.8,
      suppliesRemaining: 30,
      damagePercent: 0,
      casualtyCount: 0,
      engagements: 0,
      victories: 0,
      createdAt: Date.now() / 1000,
      lastOrderTime: Date.now() / 1000,
      lastCombatTime: 0
    };

    // Assign formation positions
    this.assignFormationPositions(fleet);

    this.fleets.set(fleetId, fleet);

    // Mark ships as part of fleet
    for (const shipId of shipIds) {
      const ship = this.ships.get(shipId);
      if (ship) {
        (ship as any).fleetId = fleetId;
      }
    }

    console.log(`[FleetCoordination] Created ${fleetName}: ${shipIds.length} ships, Flagship: ${flagshipId}`);

    return fleet;
  }

  /**
   * Register ships from NPCShipAI system
   */
  public registerShips(ships: NPCShip[]): void {
    for (const ship of ships) {
      this.ships.set(ship.id, ship);
    }
    console.log(`[FleetCoordination] Registered ${ships.length} ships`);
  }

  /**
   * Add ship to existing fleet
   */
  public addShipToFleet(fleetId: string, shipId: string): boolean {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return false;

    if (fleet.ships.length >= this.MAX_FLEET_SIZE) {
      console.warn(`[FleetCoordination] Fleet ${fleet.name} is at maximum capacity`);
      return false;
    }

    if (fleet.ships.includes(shipId)) {
      return false; // Already in fleet
    }

    fleet.ships.push(shipId);

    // Update role categorization
    const ship = this.ships.get(shipId);
    if (ship) {
      const role = this.determineShipRole(ship);
      const roleShips = fleet.shipsByRole.get(role) || [];
      roleShips.push(shipId);
      fleet.shipsByRole.set(role, roleShips);

      (ship as any).fleetId = fleetId;
    }

    // Recalculate formation
    this.assignFormationPositions(fleet);

    console.log(`[FleetCoordination] Added ${shipId} to ${fleet.name}`);

    return true;
  }

  /**
   * Remove ship from fleet
   */
  public removeShipFromFleet(fleetId: string, shipId: string): boolean {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return false;

    const index = fleet.ships.indexOf(shipId);
    if (index === -1) return false;

    fleet.ships.splice(index, 1);
    fleet.casualtyCount++;

    // Remove from role mapping
    for (const [role, ships] of fleet.shipsByRole) {
      const roleIndex = ships.indexOf(shipId);
      if (roleIndex !== -1) {
        ships.splice(roleIndex, 1);
        if (ships.length === 0) {
          fleet.shipsByRole.delete(role);
        }
      }
    }

    // Remove from formation positions
    fleet.formationPositions.delete(shipId);

    // Clear fleet ID from ship
    const ship = this.ships.get(shipId);
    if (ship) {
      delete (ship as any).fleetId;
    }

    // Check if fleet still viable
    if (fleet.ships.length < this.MIN_FLEET_SIZE) {
      this.disbandFleet(fleetId);
      return true;
    }

    // Select new flagship if needed
    if (fleet.flagship === shipId) {
      fleet.flagship = this.selectFlagship(fleet.ships);
    }

    console.log(`[FleetCoordination] Removed ${shipId} from ${fleet.name} (${fleet.ships.length} remaining)`);

    return true;
  }

  /**
   * Disband a fleet
   */
  public disbandFleet(fleetId: string): void {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return;

    console.log(`[FleetCoordination] Disbanding ${fleet.name}`);

    // Clear fleet ID from all ships
    for (const shipId of fleet.ships) {
      const ship = this.ships.get(shipId);
      if (ship) {
        delete (ship as any).fleetId;
      }
    }

    fleet.status = 'DISBANDED';
    this.fleets.delete(fleetId);
  }

  /**
   * Merge two fleets
   */
  public mergeFleets(fleetAId: string, fleetBId: string): Fleet | null {
    const fleetA = this.fleets.get(fleetAId);
    const fleetB = this.fleets.get(fleetBId);

    if (!fleetA || !fleetB) return null;

    if (fleetA.faction !== fleetB.faction) {
      console.warn('[FleetCoordination] Cannot merge fleets from different factions');
      return null;
    }

    const totalShips = fleetA.ships.length + fleetB.ships.length;
    if (totalShips > this.MAX_FLEET_SIZE) {
      console.warn('[FleetCoordination] Merged fleet would exceed maximum size');
      return null;
    }

    console.log(`[FleetCoordination] Merging ${fleetB.name} into ${fleetA.name}`);

    // Add all ships from fleet B to fleet A
    for (const shipId of fleetB.ships) {
      fleetA.ships.push(shipId);

      const ship = this.ships.get(shipId);
      if (ship) {
        (ship as any).fleetId = fleetAId;
      }
    }

    // Merge role categorizations
    for (const [role, ships] of fleetB.shipsByRole) {
      const existingShips = fleetA.shipsByRole.get(role) || [];
      fleetA.shipsByRole.set(role, [...existingShips, ...ships]);
    }

    // Recalculate formation
    this.assignFormationPositions(fleetA);

    // Disband fleet B
    this.fleets.delete(fleetBId);

    return fleetA;
  }

  /**
   * Split fleet into two
   */
  public splitFleet(fleetId: string, shipIdsForNewFleet: string[]): Fleet | null {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return null;

    // Validate split
    const remainingShips = fleet.ships.filter(id => !shipIdsForNewFleet.includes(id));

    if (remainingShips.length < this.MIN_FLEET_SIZE || shipIdsForNewFleet.length < this.MIN_FLEET_SIZE) {
      console.warn('[FleetCoordination] Split would create undersized fleet(s)');
      return null;
    }

    console.log(`[FleetCoordination] Splitting ${fleet.name} (${shipIdsForNewFleet.length} ships to new fleet)`);

    // Remove ships from original fleet
    for (const shipId of shipIdsForNewFleet) {
      const index = fleet.ships.indexOf(shipId);
      if (index !== -1) {
        fleet.ships.splice(index, 1);
      }
    }

    // Create new fleet
    const newFleet = this.createFleet(
      fleet.faction,
      shipIdsForNewFleet,
      `${fleet.name} Detachment`
    );

    // Recalculate original fleet formation
    this.assignFormationPositions(fleet);

    return newFleet;
  }

  // ====================================================================
  // FORMATION MANAGEMENT
  // ====================================================================

  /**
   * Set fleet formation
   */
  public setFormation(fleetId: string, formation: FormationType): void {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return;

    const template = this.formationTemplates.get(formation);
    if (!template) {
      console.warn(`[FleetCoordination] Unknown formation: ${formation}`);
      return;
    }

    console.log(`[FleetCoordination] ${fleet.name} changing formation: ${fleet.formation} -> ${formation}`);

    fleet.formation = formation;
    fleet.formationCohesion = 0.5; // Formation change disrupts cohesion temporarily

    // Reassign positions
    this.assignFormationPositions(fleet);

    // Recalculate combat effectiveness
    this.updateFleetCombatStats(fleet);
  }

  /**
   * Assign formation positions to all ships in fleet
   */
  private assignFormationPositions(fleet: Fleet): void {
    const template = this.formationTemplates.get(fleet.formation);
    if (!template) return;

    // Count ships by role
    const roleCounts = new Map<ShipRole, number>();
    for (const [role, ships] of fleet.shipsByRole) {
      roleCounts.set(role, ships.length);
    }

    // Generate positions
    const positions = template.generatePositions(fleet.ships.length, roleCounts);

    fleet.formationPositions.clear();

    let index = 0;

    // Assign flagship first (center position)
    if (fleet.flagship) {
      fleet.formationPositions.set(fleet.flagship, {
        shipId: fleet.flagship,
        role: 'FLAGSHIP',
        relativePosition: { x: 0, y: 0, z: 0 },
        positionIndex: 0,
        isInPosition: false
      });
      index++;
    }

    // Assign other ships by role priority
    const rolePriority: ShipRole[] = ['CAPITAL', 'LINE', 'SCREEN', 'SUPPORT', 'SCOUT'];

    for (const role of rolePriority) {
      const roleShips = fleet.shipsByRole.get(role) || [];
      for (const shipId of roleShips) {
        if (shipId === fleet.flagship) continue; // Skip flagship

        const position = positions.get(index) || { x: 0, y: 0, z: 0 };

        fleet.formationPositions.set(shipId, {
          shipId,
          role,
          relativePosition: position,
          positionIndex: index,
          isInPosition: false
        });

        index++;
      }
    }
  }

  /**
   * Generate line formation positions
   */
  private generateLineFormation(shipCount: number, roles: Map<ShipRole, number>): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    const spacing = this.FORMATION_DISTANCE;
    const lineLength = (shipCount - 1) * spacing;
    const startX = -lineLength / 2;

    for (let i = 0; i < shipCount; i++) {
      positions.set(i, {
        x: startX + i * spacing,
        y: 0,
        z: 0
      });
    }

    return positions;
  }

  /**
   * Generate wedge formation positions
   */
  private generateWedgeFormation(shipCount: number, roles: Map<ShipRole, number>): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    const spacing = this.FORMATION_DISTANCE;

    // Flagship at tip (position 0 handled separately)
    let currentRow = 0;
    let shipsInRow = 1;
    let shipIndex = 1; // Start at 1, flagship is 0

    while (shipIndex < shipCount) {
      currentRow++;
      shipsInRow = Math.min(currentRow * 2 + 1, shipCount - shipIndex);

      const rowStartX = -(shipsInRow - 1) * spacing / 2;
      const rowZ = -currentRow * spacing;

      for (let i = 0; i < shipsInRow && shipIndex < shipCount; i++) {
        positions.set(shipIndex, {
          x: rowStartX + i * spacing,
          y: 0,
          z: rowZ
        });
        shipIndex++;
      }
    }

    return positions;
  }

  /**
   * Generate sphere formation positions
   */
  private generateSphereFormation(shipCount: number, roles: Map<ShipRole, number>): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    const radius = this.FORMATION_DISTANCE * 2;

    // Distribute ships evenly on sphere surface
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < shipCount; i++) {
      const y = 1 - (i / (shipCount - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      positions.set(i, {
        x: x * radius,
        y: y * radius,
        z: z * radius
      });
    }

    return positions;
  }

  /**
   * Generate defensive wall formation
   */
  private generateDefensiveFormation(shipCount: number, roles: Map<ShipRole, number>): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    const spacing = this.FORMATION_DISTANCE;

    // Create a two-layer wall
    const shipsPerRow = Math.ceil(shipCount / 2);

    for (let i = 0; i < shipCount; i++) {
      const row = Math.floor(i / shipsPerRow);
      const col = i % shipsPerRow;

      const rowStartX = -(shipsPerRow - 1) * spacing / 2;

      positions.set(i, {
        x: rowStartX + col * spacing,
        y: 0,
        z: row * spacing * 1.5
      });
    }

    return positions;
  }

  /**
   * Generate scatter formation positions
   */
  private generateScatterFormation(shipCount: number, roles: Map<ShipRole, number>): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    const spacing = this.FORMATION_DISTANCE * 3; // Wide spacing

    for (let i = 0; i < shipCount; i++) {
      // Random positions within sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * spacing;

      positions.set(i, {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi)
      });
    }

    return positions;
  }

  /**
   * Generate column formation positions
   */
  private generateColumnFormation(shipCount: number, roles: Map<ShipRole, number>): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    const spacing = this.FORMATION_DISTANCE * 0.8; // Tight spacing

    for (let i = 0; i < shipCount; i++) {
      positions.set(i, {
        x: 0,
        y: 0,
        z: -i * spacing // Single file
      });
    }

    return positions;
  }

  /**
   * Generate screen formation positions
   */
  private generateScreenFormation(shipCount: number, roles: Map<ShipRole, number>): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    const spacing = this.FORMATION_DISTANCE;

    // Scouts ahead in arc
    const scoutCount = roles.get('SCOUT') || 0;
    const mainCount = shipCount - scoutCount;

    // Main fleet in column
    for (let i = 0; i < mainCount; i++) {
      positions.set(i, {
        x: 0,
        y: 0,
        z: -i * spacing
      });
    }

    // Scouts in forward arc
    for (let i = 0; i < scoutCount; i++) {
      const angle = (i / (scoutCount - 1)) * Math.PI - Math.PI / 2;
      positions.set(mainCount + i, {
        x: Math.sin(angle) * spacing * 3,
        y: 0,
        z: Math.cos(angle) * spacing * 3
      });
    }

    return positions;
  }

  // ====================================================================
  // MOVEMENT AND COORDINATION
  // ====================================================================

  /**
   * Issue movement order to fleet
   */
  public moveFleetTo(fleetId: string, destination: Vector3, formation?: FormationType): void {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return;

    fleet.destination = destination;
    fleet.currentOrder = 'HOLD';
    fleet.status = 'MOVING';

    if (formation && formation !== fleet.formation) {
      this.setFormation(fleetId, formation);
    }

    // Calculate heading
    const dx = destination.x - fleet.centerPosition.x;
    const dy = destination.y - fleet.centerPosition.y;
    const dz = destination.z - fleet.centerPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > 0) {
      fleet.heading = {
        x: dx / distance,
        y: dy / distance,
        z: dz / distance
      };
    }

    console.log(`[FleetCoordination] ${fleet.name} moving to [${destination.x.toFixed(0)}, ${destination.y.toFixed(0)}, ${destination.z.toFixed(0)}]`);
  }

  /**
   * Update fleet movement and formation maintenance
   */
  public update(deltaTime: number): void {
    for (const fleet of this.fleets.values()) {
      this.updateFleet(fleet, deltaTime);
    }

    // Update engagements
    for (const engagement of this.engagements.values()) {
      if (engagement.status === 'ONGOING') {
        this.updateEngagement(engagement, deltaTime);
      }
    }
  }

  /**
   * Update single fleet
   */
  private updateFleet(fleet: Fleet, deltaTime: number): void {
    if (fleet.status === 'DISBANDED') return;

    // Update fleet center position
    fleet.centerPosition = this.calculateFleetCenter(fleet.ships);

    // Formation cohesion naturally decays
    fleet.formationCohesion = Math.max(0.3, fleet.formationCohesion - this.COHESION_DECAY_RATE * (deltaTime / 60));

    // Maintain formation
    if (fleet.status === 'MOVING' || fleet.status === 'ENGAGED') {
      this.maintainFormation(fleet, deltaTime);
    }

    // Movement
    if (fleet.status === 'MOVING' && fleet.destination) {
      this.moveFleet(fleet, deltaTime);
    }

    // Supply consumption
    fleet.suppliesRemaining -= (deltaTime / 86400); // Days

    // Update combat stats
    this.updateFleetCombatStats(fleet);

    // Check for low supplies
    if (fleet.suppliesRemaining < 5 && fleet.status !== 'RETREATING') {
      console.log(`[FleetCoordination] ⚠️ ${fleet.name} low on supplies (${fleet.suppliesRemaining.toFixed(1)} days)`);
    }
  }

  /**
   * Move fleet toward destination
   */
  private moveFleet(fleet: Fleet, deltaTime: number): void {
    if (!fleet.destination) return;

    const dx = fleet.destination.x - fleet.centerPosition.x;
    const dy = fleet.destination.y - fleet.centerPosition.y;
    const dz = fleet.destination.z - fleet.centerPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Arrived?
    if (distance < 1000) {
      fleet.status = 'READY';
      fleet.destination = undefined;
      console.log(`[FleetCoordination] ${fleet.name} arrived at destination`);
      return;
    }

    // Move fleet center
    const template = this.formationTemplates.get(fleet.formation);
    const speed = fleet.averageSpeed * (template?.speedModifier || 1.0);
    const moveDistance = speed * deltaTime;

    if (moveDistance < distance) {
      fleet.centerPosition.x += (dx / distance) * moveDistance;
      fleet.centerPosition.y += (dy / distance) * moveDistance;
      fleet.centerPosition.z += (dz / distance) * moveDistance;
    } else {
      // Arrived
      fleet.centerPosition = { ...fleet.destination };
      fleet.status = 'READY';
      fleet.destination = undefined;
    }
  }

  /**
   * Maintain formation cohesion
   */
  private maintainFormation(fleet: Fleet, deltaTime: number): void {
    const template = this.formationTemplates.get(fleet.formation);
    if (!template) return;

    let shipsInPosition = 0;

    // Check each ship's position
    for (const [shipId, formationPos] of fleet.formationPositions) {
      const ship = this.ships.get(shipId);
      if (!ship) continue;

      // Calculate target position (fleet center + relative position)
      const targetPos = {
        x: fleet.centerPosition.x + formationPos.relativePosition.x,
        y: fleet.centerPosition.y + formationPos.relativePosition.y,
        z: fleet.centerPosition.z + formationPos.relativePosition.z
      };

      // Check distance to target position
      const dx = targetPos.x - ship.position.x;
      const dy = targetPos.y - ship.position.y;
      const dz = targetPos.z - ship.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Ship is in position if within tolerance
      const tolerance = this.FORMATION_DISTANCE * 0.3;
      formationPos.isInPosition = distance < tolerance;

      if (formationPos.isInPosition) {
        shipsInPosition++;
      }
    }

    // Update cohesion based on ships in position
    const cohesionTarget = shipsInPosition / fleet.ships.length;
    fleet.formationCohesion += (cohesionTarget - fleet.formationCohesion) * 0.1; // Smooth transition

    // Update formation bonus based on cohesion
    this.updateFormationBonus(fleet);
  }

  /**
   * Update formation combat bonus
   */
  private updateFormationBonus(fleet: Fleet): void {
    const template = this.formationTemplates.get(fleet.formation);
    if (!template) {
      fleet.formationBonus = 1.0;
      return;
    }

    // Bonus scales with cohesion
    const cohesionMultiplier = fleet.formationCohesion;

    // Combine offensive and defensive bonuses
    const offensiveComponent = template.offensiveBonus * cohesionMultiplier;
    const defensiveComponent = template.defensiveBonus * cohesionMultiplier;

    // Overall bonus is average of offensive and defensive
    fleet.formationBonus = (offensiveComponent + defensiveComponent) / 2;
  }

  // ====================================================================
  // COMBAT COORDINATION
  // ====================================================================

  /**
   * Issue attack order to fleet
   */
  public attackTarget(fleetId: string, targetId: string, targetType: 'FLEET' | 'STATION'): void {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return;

    fleet.currentOrder = 'ATTACK';
    fleet.currentTarget = targetId;
    fleet.status = 'ENGAGED';

    fleet.objective = {
      type: targetType === 'FLEET' ? 'ATTACK_FLEET' : 'ATTACK_STATION',
      targetId,
      priority: 90,
      mustComplete: true,
      completionCriteria: `Destroy or rout ${targetType === 'FLEET' ? 'enemy fleet' : 'station defenses'}`
    };

    // Set aggressive formation
    if (fleet.formation === 'COLUMN' || fleet.formation === 'SCATTER') {
      this.setFormation(fleetId, 'WEDGE');
    }

    console.log(`[FleetCoordination] ⚔️ ${fleet.name} engaging ${targetType} ${targetId}`);
  }

  /**
   * Calculate fleet combat stats
   */
  private calculateFleetCombatStats(shipIds: string[], formation: FormationType): FleetCombatStats {
    let totalWeaponPower = 0;
    let totalHullStrength = 0;
    let totalShieldStrength = 0;
    let minSpeed = Infinity;
    let maxSensorRange = 0;
    let avgTurnRate = 0;

    for (const shipId of shipIds) {
      const ship = this.ships.get(shipId);
      if (!ship) continue;

      totalWeaponPower += ship.stats.weaponPower;
      totalHullStrength += ship.stats.hullStrength;
      totalShieldStrength += ship.stats.shieldStrength;
      minSpeed = Math.min(minSpeed, ship.stats.maxSpeed);
      maxSensorRange = Math.max(maxSensorRange, ship.stats.sensorRange);
      avgTurnRate += ship.stats.turnRate;
    }

    avgTurnRate /= shipIds.length;

    const template = this.formationTemplates.get(formation);
    const formationBonus = template ? (template.offensiveBonus + template.defensiveBonus) / 2 : 1.0;

    return {
      fleetId: '',
      totalWeaponPower,
      focusFireMultiplier: this.FOCUS_FIRE_BONUS,
      alphaStrikePotential: totalWeaponPower * this.FOCUS_FIRE_BONUS,
      sustainedDPS: totalWeaponPower * 0.7, // 70% sustained
      totalHullStrength,
      totalShieldStrength,
      pointDefenseRating: shipIds.length * 10, // Simplified
      damageReduction: template?.defensiveBonus || 1.0,
      fleetSpeed: minSpeed === Infinity ? 100 : minSpeed,
      turnRate: avgTurnRate,
      sensorRange: maxSensorRange,
      ecmStrength: shipIds.length * 5,
      formationBonus,
      tacticBonus: 1.0,
      moraleBonus: 1.0
    };
  }

  /**
   * Update fleet combat stats based on current status
   */
  private updateFleetCombatStats(fleet: Fleet): void {
    const stats = this.calculateFleetCombatStats(fleet.ships, fleet.formation);

    fleet.totalFirepower = stats.totalWeaponPower;
    fleet.totalDefense = stats.totalHullStrength + stats.totalShieldStrength;
    fleet.averageSpeed = stats.fleetSpeed;

    // Combat effectiveness factors in morale, damage, and cohesion
    fleet.combatEffectiveness =
      (fleet.morale * 0.4) +
      ((1 - fleet.damagePercent) * 0.4) +
      (fleet.formationCohesion * 0.2);
  }

  /**
   * Create fleet engagement between two fleets
   */
  public createEngagement(fleetAId: string, fleetBId: string): FleetEngagement {
    const fleetA = this.fleets.get(fleetAId);
    const fleetB = this.fleets.get(fleetBId);

    if (!fleetA || !fleetB) {
      throw new Error('Cannot create engagement - fleet not found');
    }

    const engagementId = `engagement_${fleetAId}_${fleetBId}_${Date.now()}`;

    // Calculate midpoint between fleets
    const location = {
      x: (fleetA.centerPosition.x + fleetB.centerPosition.x) / 2,
      y: (fleetA.centerPosition.y + fleetB.centerPosition.y) / 2,
      z: (fleetA.centerPosition.z + fleetB.centerPosition.z) / 2
    };

    const engagement: FleetEngagement = {
      id: engagementId,
      fleetA: fleetAId,
      fleetB: fleetBId,
      location,
      startTime: Date.now() / 1000,
      duration: 0,
      phase: 'APPROACH',
      range: this.calculateDistance(fleetA.centerPosition, fleetB.centerPosition),
      fleetALosses: [],
      fleetBLosses: [],
      fleetADamage: 0,
      fleetBDamage: 0,
      fleetAFormation: fleetA.formation,
      fleetBFormation: fleetB.formation,
      currentRound: 0,
      status: 'ONGOING'
    };

    this.engagements.set(engagementId, engagement);

    // Update fleet status
    fleetA.status = 'ENGAGED';
    fleetB.status = 'ENGAGED';
    fleetA.inCombatWith = [fleetBId];
    fleetB.inCombatWith = [fleetAId];
    fleetA.lastCombatTime = Date.now() / 1000;
    fleetB.lastCombatTime = Date.now() / 1000;

    console.log(`[FleetCoordination] ⚔️ ENGAGEMENT: ${fleetA.name} vs ${fleetB.name}`);
    console.log(`  Range: ${(engagement.range / 1000).toFixed(1)}km`);

    return engagement;
  }

  /**
   * Update ongoing engagement
   */
  private updateEngagement(engagement: FleetEngagement, deltaTime: number): void {
    engagement.duration += deltaTime;
    engagement.currentRound++;

    const fleetA = this.fleets.get(engagement.fleetA);
    const fleetB = this.fleets.get(engagement.fleetB);

    if (!fleetA || !fleetB) {
      engagement.status = 'MUTUAL_WITHDRAWAL';
      return;
    }

    // Update range
    engagement.range = this.calculateDistance(fleetA.centerPosition, fleetB.centerPosition);

    // Determine combat phase
    if (engagement.range > 10000) {
      engagement.phase = 'APPROACH';
    } else if (engagement.range > 5000) {
      engagement.phase = 'LONG_RANGE';
    } else if (engagement.range > 2000) {
      engagement.phase = 'MEDIUM_RANGE';
    } else {
      engagement.phase = 'CLOSE_RANGE';
    }

    // Execute combat round
    this.executeCombatRound(engagement, fleetA, fleetB, deltaTime);

    // Check for engagement end
    this.checkEngagementEnd(engagement, fleetA, fleetB);
  }

  /**
   * Execute combat round
   */
  private executeCombatRound(
    engagement: FleetEngagement,
    fleetA: Fleet,
    fleetB: Fleet,
    deltaTime: number
  ): void {
    // Calculate effective firepower (with formation bonuses)
    const firePowerA = fleetA.totalFirepower * fleetA.formationBonus * fleetA.combatEffectiveness;
    const firePowerB = fleetB.totalFirepower * fleetB.formationBonus * fleetB.combatEffectiveness;

    // Apply focus fire bonus
    const focusedFireA = firePowerA * this.FOCUS_FIRE_BONUS;
    const focusedFireB = firePowerB * this.FOCUS_FIRE_BONUS;

    // Calculate damage per second
    const dpsA = focusedFireA * 0.1; // 10% of firepower per second
    const dpsB = focusedFireB * 0.1;

    // Apply damage (reduced by enemy formation defensive bonus)
    const templateA = this.formationTemplates.get(fleetA.formation);
    const templateB = this.formationTemplates.get(fleetB.formation);

    const damageToB = dpsA * deltaTime / (templateB?.defensiveBonus || 1.0);
    const damageToA = dpsB * deltaTime / (templateA?.defensiveBonus || 1.0);

    engagement.fleetADamage += damageToA;
    engagement.fleetBDamage += damageToB;

    // Apply damage to fleets
    this.applyFleetDamage(fleetA, damageToA, engagement, 'A');
    this.applyFleetDamage(fleetB, damageToB, engagement, 'B');

    // Morale effects
    if (fleetA.damagePercent > 0.5) {
      fleetA.morale -= 0.01 * (deltaTime / 60);
    }
    if (fleetB.damagePercent > 0.5) {
      fleetB.morale -= 0.01 * (deltaTime / 60);
    }
  }

  /**
   * Apply damage to fleet
   */
  private applyFleetDamage(
    fleet: Fleet,
    damage: number,
    engagement: FleetEngagement,
    side: 'A' | 'B'
  ): void {
    // Distribute damage across ships
    const damagePerShip = damage / fleet.ships.length;

    for (const shipId of [...fleet.ships]) { // Copy array to avoid modification during iteration
      const ship = this.ships.get(shipId);
      if (!ship) continue;

      ship.stats.hullStrength -= damagePerShip;

      // Ship destroyed?
      if (ship.stats.hullStrength <= 0) {
        console.log(`[FleetCoordination] ${ship.name} destroyed in combat`);

        if (side === 'A') {
          engagement.fleetALosses.push(shipId);
        } else {
          engagement.fleetBLosses.push(shipId);
        }

        this.removeShipFromFleet(fleet.id, shipId);
      }
    }

    // Update fleet damage percentage
    let totalHullPercent = 0;
    for (const shipId of fleet.ships) {
      const ship = this.ships.get(shipId);
      if (ship) {
        totalHullPercent += ship.stats.hullStrength / 100; // Assume 100 is max
      }
    }
    fleet.damagePercent = 1 - (totalHullPercent / fleet.ships.length);
  }

  /**
   * Check if engagement should end
   */
  private checkEngagementEnd(engagement: FleetEngagement, fleetA: Fleet, fleetB: Fleet): void {
    // One fleet destroyed
    if (fleetA.ships.length === 0) {
      engagement.status = 'DECISIVE';
      engagement.victor = engagement.fleetB;
      fleetB.victories++;
      fleetB.engagements++;
      console.log(`[FleetCoordination] ${fleetB.name} achieves decisive victory`);
      return;
    }

    if (fleetB.ships.length === 0) {
      engagement.status = 'DECISIVE';
      engagement.victor = engagement.fleetA;
      fleetA.victories++;
      fleetA.engagements++;
      console.log(`[FleetCoordination] ${fleetA.name} achieves decisive victory`);
      return;
    }

    // Retreat due to low morale
    if (fleetA.morale < 0.2) {
      engagement.status = 'FLED';
      engagement.victor = engagement.fleetB;
      fleetA.status = 'RETREATING';
      fleetA.currentOrder = 'RETREAT';
      console.log(`[FleetCoordination] ${fleetA.name} retreats from combat`);
      return;
    }

    if (fleetB.morale < 0.2) {
      engagement.status = 'FLED';
      engagement.victor = engagement.fleetA;
      fleetB.status = 'RETREATING';
      fleetB.currentOrder = 'RETREAT';
      console.log(`[FleetCoordination] ${fleetB.name} retreats from combat`);
      return;
    }

    // Both heavily damaged - mutual withdrawal
    if (fleetA.damagePercent > 0.7 && fleetB.damagePercent > 0.7) {
      engagement.status = 'MUTUAL_WITHDRAWAL';
      fleetA.status = 'DAMAGED';
      fleetB.status = 'DAMAGED';
      console.log(`[FleetCoordination] Both fleets withdraw due to heavy damage`);
      return;
    }
  }

  // ====================================================================
  // HELPER FUNCTIONS
  // ====================================================================

  /**
   * Categorize ships by combat role
   */
  private categorizeShipsByRole(shipIds: string[]): Map<ShipRole, string[]> {
    const roleMap = new Map<ShipRole, string[]>();

    for (const shipId of shipIds) {
      const ship = this.ships.get(shipId);
      if (!ship) continue;

      const role = this.determineShipRole(ship);
      const roleShips = roleMap.get(role) || [];
      roleShips.push(shipId);
      roleMap.set(role, roleShips);
    }

    return roleMap;
  }

  /**
   * Determine ship's role in fleet
   */
  private determineShipRole(ship: NPCShip): ShipRole {
    const shipType = (ship as any).shipClass as ShipClass | undefined;

    if (!shipType) {
      // Fall back to stats-based determination
      if (ship.stats.weaponPower > 800) return 'CAPITAL';
      if (ship.stats.weaponPower > 300) return 'LINE';
      if (ship.stats.maxSpeed > 400) return 'SCOUT';
      return 'SCREEN';
    }

    // Role by ship class
    switch (shipType) {
      case 'BATTLESHIP':
      case 'CARRIER':
        return 'CAPITAL';

      case 'CRUISER':
      case 'DESTROYER':
        return 'CAPITAL';

      case 'FRIGATE':
      case 'CORVETTE':
        return 'LINE';

      case 'FIGHTER':
      case 'PATROL_CUTTER':
        return 'SCREEN';

      case 'INTERCEPTOR':
      case 'COURIER':
        return 'SCOUT';

      case 'TANKER':
      case 'SCIENCE_VESSEL':
        return 'SUPPORT';

      default:
        return 'SCREEN';
    }
  }

  /**
   * Select flagship from ship list
   */
  private selectFlagship(shipIds: string[]): string {
    let bestShip = shipIds[0];
    let bestScore = 0;

    for (const shipId of shipIds) {
      const ship = this.ships.get(shipId);
      if (!ship) continue;

      // Flagship score: size + sensors + command capability
      const score =
        ship.stats.cargoCapacity * 0.1 +
        ship.stats.sensorRange * 0.01 +
        ship.stats.hullStrength * 2;

      if (score > bestScore) {
        bestScore = score;
        bestShip = shipId;
      }
    }

    return bestShip;
  }

  /**
   * Calculate fleet center of mass
   */
  private calculateFleetCenter(shipIds: string[]): Vector3 {
    let sumX = 0, sumY = 0, sumZ = 0;
    let count = 0;

    for (const shipId of shipIds) {
      const ship = this.ships.get(shipId);
      if (!ship) continue;

      sumX += ship.position.x;
      sumY += ship.position.y;
      sumZ += ship.position.z;
      count++;
    }

    if (count === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    return {
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Generate fleet name
   */
  private generateFleetName(faction: StationFaction): string {
    const prefixes = ['Battle', 'Strike', 'Patrol', 'Defense', 'Assault', 'Expeditionary'];
    const suffixes = ['Fleet', 'Squadron', 'Task Force', 'Battle Group', 'Armada'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const number = Math.floor(Math.random() * 99) + 1;

    return `${faction} ${prefix} ${suffix} ${number}`;
  }

  /**
   * Get fleet by ID
   */
  public getFleet(fleetId: string): Fleet | undefined {
    return this.fleets.get(fleetId);
  }

  /**
   * Get all fleets
   */
  public getAllFleets(): Fleet[] {
    return Array.from(this.fleets.values());
  }

  /**
   * Get fleets by faction
   */
  public getFleetsByFaction(faction: StationFaction): Fleet[] {
    return Array.from(this.fleets.values()).filter(f => f.faction === faction);
  }

  /**
   * Get fleet by ship ID
   */
  public getFleetByShip(shipId: string): Fleet | undefined {
    for (const fleet of this.fleets.values()) {
      if (fleet.ships.includes(shipId)) {
        return fleet;
      }
    }
    return undefined;
  }

  /**
   * Get active engagements
   */
  public getActiveEngagements(): FleetEngagement[] {
    return Array.from(this.engagements.values()).filter(e => e.status === 'ONGOING');
  }

  /**
   * Get fleet status report
   */
  public getFleetReport(fleetId: string): string {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return 'Fleet not found';

    const lines: string[] = [];
    lines.push(`=== FLEET REPORT: ${fleet.name} ===`);
    lines.push(`Faction: ${fleet.faction}`);
    lines.push(`Status: ${fleet.status}`);
    lines.push(`Current Order: ${fleet.currentOrder}`);
    lines.push('');
    lines.push(`Ships: ${fleet.ships.length}`);
    lines.push(`Flagship: ${fleet.flagship || 'None'}`);
    lines.push(`Formation: ${fleet.formation} (Cohesion: ${(fleet.formationCohesion * 100).toFixed(0)}%)`);
    lines.push('');
    lines.push(`Total Firepower: ${fleet.totalFirepower.toFixed(0)}`);
    lines.push(`Total Defense: ${fleet.totalDefense.toFixed(0)}`);
    lines.push(`Formation Bonus: ${(fleet.formationBonus * 100 - 100).toFixed(0)}%`);
    lines.push(`Combat Effectiveness: ${(fleet.combatEffectiveness * 100).toFixed(0)}%`);
    lines.push('');
    lines.push(`Morale: ${(fleet.morale * 100).toFixed(0)}%`);
    lines.push(`Damage: ${(fleet.damagePercent * 100).toFixed(0)}%`);
    lines.push(`Supplies: ${fleet.suppliesRemaining.toFixed(1)} days`);
    lines.push(`Casualties: ${fleet.casualtyCount} ships lost`);
    lines.push('');
    lines.push(`Engagements: ${fleet.engagements} (Victories: ${fleet.victories})`);

    return lines.join('\n');
  }
}

interface FleetPerformanceRecord {
  fleetId: string;
  engagements: number;
  victories: number;
  shipsLost: number;
  enemiesDestroyed: number;
  averageCombatDuration: number;
}
