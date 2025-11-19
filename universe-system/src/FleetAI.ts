/**
 * FleetAI.ts - Tactical Fleet Intelligence
 *
 * Intelligent decision-making for fleet operations:
 * - Target prioritization (focus fire)
 * - Formation selection based on enemy and situation
 * - Tactical maneuvers (flanking, kiting, etc.)
 * - Retreat decisions based on casualties and objectives
 * - Reinforcement requests
 * - Coordinated multi-fleet operations
 */

import { Vector3 } from './CelestialBody';
import {
  Fleet,
  FleetCoordinationSystem,
  FormationType,
  FleetOrder,
  FleetCombatStats,
  FleetEngagement
} from './FleetCoordinationSystem';
import { StationFaction } from './StationGenerator';
import { NPCShip } from './NPCShipAI';

export interface TacticalAssessment {
  fleetId: string;

  // Situation
  enemyFleets: string[];
  enemyStations: string[];
  alliedFleets: string[];
  neutralShips: number;

  // Threat analysis
  immediateThreats: ThreatProfile[];
  overallThreatLevel: number;        // 0-10

  // Opportunity analysis
  vulnerableTargets: TargetProfile[];
  strategicObjectives: ObjectiveProfile[];

  // Tactical situation
  tacticalAdvantage: number;         // -1 to +1 (negative = disadvantage)
  recommendedFormation: FormationType;
  recommendedAction: TacticalAction;

  // Resource state
  readinessLevel: number;            // 0-1 (combat ready?)
  reinforcementsNeeded: boolean;
  retreatRecommended: boolean;
}

export interface ThreatProfile {
  id: string;
  type: 'FLEET' | 'STATION' | 'FORTIFICATION';
  location: Vector3;
  distance: number;
  threatLevel: number;               // 0-10
  combatPower: number;
  canEngageUs: boolean;
  estimatedTimeToContact: number;    // Seconds
}

export interface TargetProfile {
  id: string;
  type: 'FLEET' | 'STATION' | 'SHIP';
  location: Vector3;
  distance: number;
  vulnerability: number;             // 0-1 (1 = very vulnerable)
  strategicValue: number;            // 0-10
  expectedCasualties: number;
  timeToCapture: number;             // Seconds
  priority: number;                  // 0-100 (final target priority)
}

export interface ObjectiveProfile {
  id: string;
  type: 'DESTROY_FLEET' | 'CAPTURE_STATION' | 'DEFEND_LOCATION' | 'ESCORT_TARGET';
  description: string;
  priority: number;                  // 0-100
  timeToComplete: number;
  successProbability: number;        // 0-1
  risksInvolved: string[];
}

export type TacticalAction =
  | 'ENGAGE_PRIMARY'      // Attack primary target
  | 'ENGAGE_OPPORTUNITY'  // Attack target of opportunity
  | 'DEFEND_POSITION'     // Hold current position
  | 'MANEUVER_FLANK'      // Flanking maneuver
  | 'MANEUVER_KITE'       // Kiting (maintain distance while firing)
  | 'RETREAT_TACTICAL'    // Tactical withdrawal
  | 'RETREAT_FULL'        // Full retreat
  | 'REGROUP'             // Regroup with allies
  | 'AWAIT_REINFORCEMENTS' // Hold and wait for backup
  | 'PURSUE'              // Chase fleeing enemy
  | 'INTERCEPT';          // Intercept enemy movement

export interface TacticalDecision {
  fleetId: string;
  timestamp: number;

  // Decision
  action: TacticalAction;
  formation: FormationType;
  primaryTarget?: string;
  secondaryTargets: string[];

  // Target assignment (focus fire)
  shipTargetAssignments: Map<string, string>; // Ship ID -> Target ID

  // Movement
  destination?: Vector3;
  maintainDistance?: number;

  // Reasoning
  reasoning: string;
  confidence: number;                // 0-1 (how confident in this decision)
  alternatives: TacticalAction[];    // Other options considered
}

export interface ReinforcementRequest {
  requestingFleetId: string;
  requestingFaction: StationFaction;
  location: Vector3;
  urgency: number;                   // 0-10 (10 = critical)
  reason: string;
  enemyStrength: number;
  ownStrength: number;
  neededShips: number;
  timeframe: number;                 // Seconds until critical
}

export interface FleetTactic {
  name: string;
  description: string;
  formations: FormationType[];       // Suitable formations
  idealSituation: string;
  counters: string[];                // What this tactic counters
  weakAgainst: string[];             // What counters this tactic
  executeCommand: (fleet: Fleet, enemy: Fleet) => void;
}

export class FleetAI {
  private fleetCoordination: FleetCoordinationSystem;

  // Tactical knowledge base
  private tactics: Map<string, FleetTactic> = new Map();

  // Active decisions
  private fleetDecisions: Map<string, TacticalDecision> = new Map();

  // Reinforcement requests
  private reinforcementRequests: Map<string, ReinforcementRequest> = new Map();

  // Performance tracking
  private tacticSuccessRates: Map<string, number> = new Map();

  // Configuration
  private readonly THREAT_RANGE = 50000;           // Consider threats within 50km
  private readonly RETREAT_DAMAGE_THRESHOLD = 0.6;  // Retreat at 60% damage
  private readonly RETREAT_MORALE_THRESHOLD = 0.3;  // Retreat at 30% morale
  private readonly FOCUS_FIRE_SHIPS_PER_TARGET = 3; // 3 ships per target
  private readonly REINFORCEMENT_THRESHOLD = 0.5;   // Request reinforcements if enemy 2x stronger

  constructor(fleetCoordination: FleetCoordinationSystem) {
    this.fleetCoordination = fleetCoordination;
    this.initializeTactics();
    console.log('[FleetAI] Tactical AI initialized - Fleets can now think');
  }

  /**
   * Initialize tactical knowledge base
   */
  private initializeTactics(): void {
    // Hammer and Anvil - pincer attack
    this.tactics.set('HAMMER_ANVIL', {
      name: 'Hammer and Anvil',
      description: 'Pin enemy with defensive formation while flanking force strikes',
      formations: ['DEFENSIVE', 'WEDGE'],
      idealSituation: 'Multiple fleets available, enemy in open space',
      counters: ['SCATTER'],
      weakAgainst: ['MOBILE_DEFENSE'],
      executeCommand: (fleet, enemy) => {
        // Implementation would coordinate multiple fleets
      }
    });

    // Focus Fire - concentrated firepower
    this.tactics.set('FOCUS_FIRE', {
      name: 'Focus Fire',
      description: 'Concentrate all firepower on single high-value targets',
      formations: ['LINE', 'WEDGE'],
      idealSituation: 'Enemy has weak ships that can be quickly eliminated',
      counters: ['WEAK_FLEET'],
      weakAgainst: ['SPHERE'],
      executeCommand: (fleet, enemy) => {
        // Assign all ships to single target
      }
    });

    // Kiting - maintain range
    this.tactics.set('KITING', {
      name: 'Kiting',
      description: 'Maintain maximum range while dealing damage',
      formations: ['SCATTER', 'LINE'],
      idealSituation: 'We have range advantage, enemy is slow',
      counters: ['SLOW_ENEMY'],
      weakAgainst: ['FAST_INTERCEPTORS'],
      executeCommand: (fleet, enemy) => {
        // Move away while maintaining fire
      }
    });

    // Bum Rush - all-out assault
    this.tactics.set('BUM_RUSH', {
      name: 'Bum Rush',
      description: 'Maximum speed assault to close distance quickly',
      formations: ['WEDGE', 'COLUMN'],
      idealSituation: 'Enemy is weak or isolated, we need quick victory',
      counters: ['DEFENSIVE_FORMATION'],
      weakAgainst: ['PREPARED_DEFENSE'],
      executeCommand: (fleet, enemy) => {
        // Max speed approach
      }
    });

    // Defensive Stand - hold the line
    this.tactics.set('DEFENSIVE_STAND', {
      name: 'Defensive Stand',
      description: 'Fortify position and repel enemy assaults',
      formations: ['DEFENSIVE', 'SPHERE'],
      idealSituation: 'Defending objective, outnumbered but in strong position',
      counters: ['AGGRESSIVE_ASSAULT'],
      weakAgainst: ['SIEGE', 'FLANKING'],
      executeCommand: (fleet, enemy) => {
        // Hold position, maximize defense
      }
    });

    console.log(`[FleetAI] Loaded ${this.tactics.size} tactical doctrines`);
  }

  // ====================================================================
  // TACTICAL ASSESSMENT
  // ====================================================================

  /**
   * Assess tactical situation for fleet
   */
  public assessSituation(
    fleetId: string,
    allFleets: Fleet[],
    stations: any[],
    ships: NPCShip[]
  ): TacticalAssessment {
    const fleet = this.fleetCoordination.getFleet(fleetId);
    if (!fleet) {
      throw new Error(`Fleet ${fleetId} not found`);
    }

    // Identify friends and foes
    const enemyFleets = allFleets.filter(f =>
      f.faction !== fleet.faction &&
      this.calculateDistance(f.centerPosition, fleet.centerPosition) < this.THREAT_RANGE
    );

    const alliedFleets = allFleets.filter(f =>
      f.faction === fleet.faction &&
      f.id !== fleet.id &&
      this.calculateDistance(f.centerPosition, fleet.centerPosition) < this.THREAT_RANGE
    );

    const enemyStations = stations.filter((s: any) =>
      s.faction !== fleet.faction &&
      this.calculateDistance(s.position, fleet.centerPosition) < this.THREAT_RANGE
    );

    // Analyze threats
    const immediateThreats = this.analyzeThreats(fleet, enemyFleets, enemyStations);
    const overallThreatLevel = this.calculateOverallThreat(immediateThreats);

    // Find targets
    const vulnerableTargets = this.identifyVulnerableTargets(fleet, enemyFleets, enemyStations);

    // Strategic objectives
    const strategicObjectives = this.identifyObjectives(fleet, enemyFleets, enemyStations);

    // Tactical advantage
    const tacticalAdvantage = this.calculateTacticalAdvantage(fleet, enemyFleets, alliedFleets);

    // Recommend formation
    const recommendedFormation = this.recommendFormation(fleet, enemyFleets, tacticalAdvantage);

    // Recommend action
    const recommendedAction = this.recommendAction(
      fleet,
      tacticalAdvantage,
      overallThreatLevel,
      vulnerableTargets.length > 0
    );

    // Readiness check
    const readinessLevel = this.assessReadiness(fleet);

    // Reinforcement needs
    const reinforcementsNeeded = this.shouldRequestReinforcements(
      fleet,
      enemyFleets,
      alliedFleets,
      overallThreatLevel
    );

    // Retreat recommendation
    const retreatRecommended = this.shouldRetreat(fleet, tacticalAdvantage, overallThreatLevel);

    return {
      fleetId: fleet.id,
      enemyFleets: enemyFleets.map(f => f.id),
      enemyStations: enemyStations.map((s: any) => s.id),
      alliedFleets: alliedFleets.map(f => f.id),
      neutralShips: 0,
      immediateThreats,
      overallThreatLevel,
      vulnerableTargets,
      strategicObjectives,
      tacticalAdvantage,
      recommendedFormation,
      recommendedAction,
      readinessLevel,
      reinforcementsNeeded,
      retreatRecommended
    };
  }

  /**
   * Analyze immediate threats
   */
  private analyzeThreats(
    fleet: Fleet,
    enemyFleets: Fleet[],
    enemyStations: any[]
  ): ThreatProfile[] {
    const threats: ThreatProfile[] = [];

    // Enemy fleets
    for (const enemy of enemyFleets) {
      const distance = this.calculateDistance(fleet.centerPosition, enemy.centerPosition);
      const combatPower = enemy.totalFirepower * enemy.combatEffectiveness;
      const ourPower = fleet.totalFirepower * fleet.combatEffectiveness;

      const threatLevel = Math.min(10, (combatPower / ourPower) * 5);
      const canEngageUs = distance < 20000; // Within engagement range
      const timeToContact = distance / enemy.averageSpeed;

      threats.push({
        id: enemy.id,
        type: 'FLEET',
        location: enemy.centerPosition,
        distance,
        threatLevel,
        combatPower,
        canEngageUs,
        estimatedTimeToContact: timeToContact
      });
    }

    // Enemy stations (if we're close)
    for (const station of enemyStations) {
      const distance = this.calculateDistance(fleet.centerPosition, station.position);
      if (distance < 10000) { // Only threat if very close
        const defenseRating = station.defenseRating || 5;
        const threatLevel = defenseRating;

        threats.push({
          id: station.id,
          type: 'STATION',
          location: station.position,
          distance,
          threatLevel,
          combatPower: defenseRating * 500,
          canEngageUs: distance < 5000,
          estimatedTimeToContact: 0
        });
      }
    }

    // Sort by threat level
    threats.sort((a, b) => b.threatLevel - a.threatLevel);

    return threats;
  }

  /**
   * Calculate overall threat level
   */
  private calculateOverallThreat(threats: ThreatProfile[]): number {
    if (threats.length === 0) return 0;

    let totalThreat = 0;
    for (const threat of threats) {
      // Closer threats are more dangerous
      const distanceFactor = 1 - (threat.distance / this.THREAT_RANGE);
      totalThreat += threat.threatLevel * (0.5 + distanceFactor * 0.5);
    }

    return Math.min(10, totalThreat);
  }

  /**
   * Identify vulnerable targets
   */
  private identifyVulnerableTargets(
    fleet: Fleet,
    enemyFleets: Fleet[],
    enemyStations: any[]
  ): TargetProfile[] {
    const targets: TargetProfile[] = [];

    // Enemy fleets
    for (const enemy of enemyFleets) {
      const distance = this.calculateDistance(fleet.centerPosition, enemy.centerPosition);

      // Vulnerability factors
      const damageFactor = enemy.damagePercent; // More damaged = more vulnerable
      const moraleFactor = 1 - enemy.morale;    // Low morale = vulnerable
      const sizeFactor = fleet.ships.length / enemy.ships.length; // Outnumbered = vulnerable

      const vulnerability = (damageFactor * 0.4 + moraleFactor * 0.4 + Math.min(1, sizeFactor) * 0.2);

      // Strategic value
      const strategicValue = Math.min(10, enemy.ships.length / 2);

      // Expected casualties
      const powerRatio = fleet.totalFirepower / Math.max(1, enemy.totalFirepower);
      const expectedCasualties = fleet.ships.length * (1 - powerRatio) * 0.3;

      // Time to capture/destroy
      const timeToCapture = (enemy.totalDefense / fleet.totalFirepower) * 60; // Rough estimate in seconds

      // Priority score
      const priority =
        vulnerability * 40 +
        strategicValue * 30 +
        (1 - expectedCasualties / fleet.ships.length) * 20 +
        (distance < 10000 ? 10 : 0);

      targets.push({
        id: enemy.id,
        type: 'FLEET',
        location: enemy.centerPosition,
        distance,
        vulnerability,
        strategicValue,
        expectedCasualties,
        timeToCapture,
        priority
      });
    }

    // Enemy stations (if attackable)
    for (const station of enemyStations) {
      const distance = this.calculateDistance(fleet.centerPosition, station.position);
      const defenseRating = station.defenseRating || 5;

      // Stations are less vulnerable than fleets
      const vulnerability = Math.max(0, 1 - (defenseRating / 10));

      // High strategic value
      const strategicValue = 8;

      // Casualties depend on defense
      const expectedCasualties = fleet.ships.length * (defenseRating / 10) * 0.4;

      // Long time to capture
      const timeToCapture = defenseRating * 3600; // Hours

      const priority =
        vulnerability * 30 +
        strategicValue * 40 +
        (1 - expectedCasualties / fleet.ships.length) * 20 +
        (distance < 5000 ? 10 : 0);

      targets.push({
        id: station.id,
        type: 'STATION',
        location: station.position,
        distance,
        vulnerability,
        strategicValue,
        expectedCasualties,
        timeToCapture,
        priority
      });
    }

    // Sort by priority
    targets.sort((a, b) => b.priority - a.priority);

    return targets;
  }

  /**
   * Identify strategic objectives
   */
  private identifyObjectives(
    fleet: Fleet,
    enemyFleets: Fleet[],
    enemyStations: any[]
  ): ObjectiveProfile[] {
    const objectives: ObjectiveProfile[] = [];

    // Check current fleet objective
    if (fleet.objective) {
      objectives.push({
        id: fleet.objective.targetId || 'current',
        type: fleet.objective.type as any,
        description: fleet.objective.completionCriteria,
        priority: fleet.objective.priority,
        timeToComplete: 3600, // Placeholder
        successProbability: 0.6,
        risksInvolved: ['Heavy casualties', 'Enemy reinforcements']
      });
    }

    return objectives;
  }

  /**
   * Calculate tactical advantage
   */
  private calculateTacticalAdvantage(
    fleet: Fleet,
    enemyFleets: Fleet[],
    alliedFleets: Fleet[]
  ): number {
    if (enemyFleets.length === 0) return 1.0; // No enemies = full advantage

    // Our total power
    let ourPower = fleet.totalFirepower * fleet.combatEffectiveness;
    for (const ally of alliedFleets) {
      ourPower += ally.totalFirepower * ally.combatEffectiveness * 0.7; // 70% effectiveness for allies
    }

    // Enemy total power
    let enemyPower = 0;
    for (const enemy of enemyFleets) {
      enemyPower += enemy.totalFirepower * enemy.combatEffectiveness;
    }

    // Power ratio
    const ratio = ourPower / Math.max(1, enemyPower);

    // Convert to -1 to +1 scale
    if (ratio >= 2.0) return 1.0;  // Overwhelming advantage
    if (ratio >= 1.5) return 0.7;  // Strong advantage
    if (ratio >= 1.2) return 0.4;  // Moderate advantage
    if (ratio >= 0.8) return 0.0;  // Even
    if (ratio >= 0.6) return -0.3; // Disadvantage
    if (ratio >= 0.4) return -0.6; // Strong disadvantage
    return -1.0;                   // Overwhelming disadvantage
  }

  /**
   * Recommend formation based on situation
   */
  private recommendFormation(
    fleet: Fleet,
    enemyFleets: Fleet[],
    tacticalAdvantage: number
  ): FormationType {
    // No enemies - travel formation
    if (enemyFleets.length === 0) {
      return 'COLUMN';
    }

    // Find closest enemy
    let closestEnemy: Fleet | null = null;
    let closestDistance = Infinity;

    for (const enemy of enemyFleets) {
      const distance = this.calculateDistance(fleet.centerPosition, enemy.centerPosition);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    if (!closestEnemy) return fleet.formation;

    // At disadvantage - defensive formations
    if (tacticalAdvantage < -0.3) {
      if (fleet.currentOrder === 'DEFEND') {
        return 'DEFENSIVE';
      }
      return 'SPHERE'; // Defensive sphere
    }

    // At advantage - aggressive formations
    if (tacticalAdvantage > 0.3) {
      // Check enemy formation
      if (closestEnemy.formation === 'LINE') {
        return 'WEDGE'; // Wedge counters line
      }
      if (closestEnemy.formation === 'DEFENSIVE') {
        return 'WEDGE'; // Wedge breaks through defensive walls
      }
      return 'LINE'; // Default aggressive
    }

    // Even fight - balanced formation
    return 'LINE';
  }

  /**
   * Recommend tactical action
   */
  private recommendAction(
    fleet: Fleet,
    tacticalAdvantage: number,
    threatLevel: number,
    hasVulnerableTargets: boolean
  ): TacticalAction {
    // Check fleet status
    if (fleet.damagePercent > this.RETREAT_DAMAGE_THRESHOLD) {
      return 'RETREAT_FULL';
    }

    if (fleet.morale < this.RETREAT_MORALE_THRESHOLD) {
      return 'RETREAT_TACTICAL';
    }

    // Overwhelming disadvantage
    if (tacticalAdvantage < -0.6) {
      return 'RETREAT_FULL';
    }

    // Moderate disadvantage
    if (tacticalAdvantage < -0.3) {
      if (threatLevel > 7) {
        return 'RETREAT_TACTICAL';
      }
      return 'AWAIT_REINFORCEMENTS';
    }

    // Defensive orders
    if (fleet.currentOrder === 'DEFEND') {
      return 'DEFEND_POSITION';
    }

    // Attack orders
    if (fleet.currentOrder === 'ATTACK') {
      if (hasVulnerableTargets) {
        return 'ENGAGE_OPPORTUNITY';
      }
      return 'ENGAGE_PRIMARY';
    }

    // At advantage - be aggressive
    if (tacticalAdvantage > 0.4 && hasVulnerableTargets) {
      return 'ENGAGE_OPPORTUNITY';
    }

    // Even fight - engage primary target
    if (fleet.currentTarget) {
      return 'ENGAGE_PRIMARY';
    }

    // Default - hold position
    return 'DEFEND_POSITION';
  }

  /**
   * Assess fleet readiness
   */
  private assessReadiness(fleet: Fleet): number {
    let readiness = 1.0;

    // Damage reduces readiness
    readiness -= fleet.damagePercent * 0.5;

    // Low morale reduces readiness
    readiness -= (1 - fleet.morale) * 0.3;

    // Low supplies
    if (fleet.suppliesRemaining < 5) {
      readiness *= 0.7;
    }

    // Poor formation cohesion
    readiness -= (1 - fleet.formationCohesion) * 0.2;

    return Math.max(0, Math.min(1, readiness));
  }

  /**
   * Check if fleet should request reinforcements
   */
  private shouldRequestReinforcements(
    fleet: Fleet,
    enemyFleets: Fleet[],
    alliedFleets: Fleet[],
    threatLevel: number
  ): boolean {
    if (enemyFleets.length === 0) return false;

    // Calculate power imbalance
    let enemyPower = 0;
    for (const enemy of enemyFleets) {
      enemyPower += enemy.totalFirepower;
    }

    const ourPower = fleet.totalFirepower;
    const ratio = ourPower / Math.max(1, enemyPower);

    // Need reinforcements if outnumbered significantly
    if (ratio < this.REINFORCEMENT_THRESHOLD) {
      return true;
    }

    // High threat level
    if (threatLevel > 7 && ratio < 0.8) {
      return true;
    }

    return false;
  }

  /**
   * Check if fleet should retreat
   */
  private shouldRetreat(
    fleet: Fleet,
    tacticalAdvantage: number,
    threatLevel: number
  ): boolean {
    // Heavy damage
    if (fleet.damagePercent > this.RETREAT_DAMAGE_THRESHOLD) {
      return true;
    }

    // Low morale
    if (fleet.morale < this.RETREAT_MORALE_THRESHOLD) {
      return true;
    }

    // Overwhelming enemy force
    if (tacticalAdvantage < -0.6 && threatLevel > 7) {
      return true;
    }

    // Low supplies and no victory in sight
    if (fleet.suppliesRemaining < 2 && tacticalAdvantage < 0) {
      return true;
    }

    return false;
  }

  // ====================================================================
  // TACTICAL DECISION MAKING
  // ====================================================================

  /**
   * Make tactical decision for fleet
   */
  public makeDecision(
    fleetId: string,
    assessment: TacticalAssessment
  ): TacticalDecision {
    const fleet = this.fleetCoordination.getFleet(fleetId);
    if (!fleet) {
      throw new Error(`Fleet ${fleetId} not found`);
    }

    // Determine action
    const action = assessment.recommendedAction;

    // Select formation
    const formation = assessment.recommendedFormation;

    // Select targets
    const primaryTarget = assessment.vulnerableTargets.length > 0
      ? assessment.vulnerableTargets[0].id
      : undefined;

    const secondaryTargets = assessment.vulnerableTargets
      .slice(1, 4)
      .map(t => t.id);

    // Assign ships to targets (focus fire)
    const shipTargetAssignments = this.assignTargets(fleet, assessment.vulnerableTargets);

    // Determine movement
    let destination: Vector3 | undefined;
    let maintainDistance: number | undefined;

    if (action === 'ENGAGE_PRIMARY' && primaryTarget) {
      const target = assessment.vulnerableTargets[0];
      destination = target.location;
    } else if (action === 'RETREAT_FULL' || action === 'RETREAT_TACTICAL') {
      // Move away from threats
      destination = this.calculateRetreatVector(fleet, assessment.immediateThreats);
    } else if (action === 'MANEUVER_KITE') {
      destination = this.calculateKitingPosition(fleet, assessment.immediateThreats);
      maintainDistance = 8000; // Maintain 8km distance
    }

    // Reasoning
    const reasoning = this.generateReasoning(action, assessment);

    // Confidence
    const confidence = this.calculateConfidence(assessment);

    // Alternatives
    const alternatives = this.generateAlternatives(action, assessment);

    const decision: TacticalDecision = {
      fleetId,
      timestamp: Date.now() / 1000,
      action,
      formation,
      primaryTarget,
      secondaryTargets,
      shipTargetAssignments,
      destination,
      maintainDistance,
      reasoning,
      confidence,
      alternatives
    };

    this.fleetDecisions.set(fleetId, decision);

    console.log(`[FleetAI] ${fleet.name} decision: ${action} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    console.log(`  Reasoning: ${reasoning}`);

    return decision;
  }

  /**
   * Assign ships to targets for focus fire
   */
  private assignTargets(fleet: Fleet, targets: TargetProfile[]): Map<string, string> {
    const assignments = new Map<string, string>();

    if (targets.length === 0) return assignments;

    // Assign ships to targets in groups
    let targetIndex = 0;
    let shipsAssignedToCurrentTarget = 0;

    for (const shipId of fleet.ships) {
      const target = targets[targetIndex];
      if (!target) break;

      assignments.set(shipId, target.id);
      shipsAssignedToCurrentTarget++;

      // Move to next target after assigning enough ships
      if (shipsAssignedToCurrentTarget >= this.FOCUS_FIRE_SHIPS_PER_TARGET) {
        targetIndex++;
        shipsAssignedToCurrentTarget = 0;

        // Wrap around if we run out of targets
        if (targetIndex >= targets.length) {
          targetIndex = 0;
        }
      }
    }

    return assignments;
  }

  /**
   * Calculate retreat vector away from threats
   */
  private calculateRetreatVector(fleet: Fleet, threats: ThreatProfile[]): Vector3 {
    if (threats.length === 0) {
      // Retreat in random direction
      return {
        x: fleet.centerPosition.x + Math.random() * 50000 - 25000,
        y: fleet.centerPosition.y + Math.random() * 50000 - 25000,
        z: fleet.centerPosition.z + Math.random() * 50000 - 25000
      };
    }

    // Calculate average threat position
    let avgX = 0, avgY = 0, avgZ = 0;
    for (const threat of threats) {
      avgX += threat.location.x;
      avgY += threat.location.y;
      avgZ += threat.location.z;
    }
    avgX /= threats.length;
    avgY /= threats.length;
    avgZ /= threats.length;

    // Retreat in opposite direction
    const dx = fleet.centerPosition.x - avgX;
    const dy = fleet.centerPosition.y - avgY;
    const dz = fleet.centerPosition.z - avgZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance === 0) {
      return fleet.centerPosition;
    }

    // Retreat 50km away
    const retreatDistance = 50000;
    return {
      x: fleet.centerPosition.x + (dx / distance) * retreatDistance,
      y: fleet.centerPosition.y + (dy / distance) * retreatDistance,
      z: fleet.centerPosition.z + (dz / distance) * retreatDistance
    };
  }

  /**
   * Calculate kiting position (maintain distance while firing)
   */
  private calculateKitingPosition(fleet: Fleet, threats: ThreatProfile[]): Vector3 {
    // Similar to retreat, but maintain optimal firing range
    return this.calculateRetreatVector(fleet, threats);
  }

  /**
   * Generate reasoning for decision
   */
  private generateReasoning(action: TacticalAction, assessment: TacticalAssessment): string {
    switch (action) {
      case 'ENGAGE_PRIMARY':
        return `Engaging primary target - tactical advantage: ${assessment.tacticalAdvantage.toFixed(2)}`;

      case 'ENGAGE_OPPORTUNITY':
        return `Attacking vulnerable target of opportunity`;

      case 'DEFEND_POSITION':
        return `Holding position as ordered`;

      case 'RETREAT_FULL':
        return `Full retreat - heavy damage or overwhelming enemy force`;

      case 'RETREAT_TACTICAL':
        return `Tactical withdrawal to regroup`;

      case 'AWAIT_REINFORCEMENTS':
        return `Holding position and awaiting reinforcements - threat level: ${assessment.overallThreatLevel.toFixed(1)}`;

      case 'MANEUVER_KITE':
        return `Kiting enemy - maintaining range advantage`;

      default:
        return `Executing ${action}`;
    }
  }

  /**
   * Calculate confidence in decision
   */
  private calculateConfidence(assessment: TacticalAssessment): number {
    let confidence = 0.7; // Base confidence

    // More confident with clear advantage
    if (assessment.tacticalAdvantage > 0.5) {
      confidence += 0.2;
    } else if (assessment.tacticalAdvantage < -0.5) {
      confidence += 0.2; // Also confident in retreat decisions
    }

    // Less confident with many threats
    if (assessment.immediateThreats.length > 3) {
      confidence -= 0.2;
    }

    // More confident with high readiness
    confidence += assessment.readinessLevel * 0.1;

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Generate alternative actions considered
   */
  private generateAlternatives(
    chosenAction: TacticalAction,
    assessment: TacticalAssessment
  ): TacticalAction[] {
    const alternatives: TacticalAction[] = [];

    // Always consider defense
    if (chosenAction !== 'DEFEND_POSITION') {
      alternatives.push('DEFEND_POSITION');
    }

    // Consider retreat if threatened
    if (assessment.overallThreatLevel > 5 && chosenAction !== 'RETREAT_TACTICAL') {
      alternatives.push('RETREAT_TACTICAL');
    }

    // Consider engagement if targets available
    if (assessment.vulnerableTargets.length > 0 && chosenAction !== 'ENGAGE_PRIMARY') {
      alternatives.push('ENGAGE_PRIMARY');
    }

    return alternatives.slice(0, 3); // Return top 3
  }

  // ====================================================================
  // EXECUTION
  // ====================================================================

  /**
   * Execute tactical decision
   */
  public executeDecision(decision: TacticalDecision): void {
    const fleet = this.fleetCoordination.getFleet(decision.fleetId);
    if (!fleet) return;

    console.log(`[FleetAI] Executing ${decision.action} for ${fleet.name}`);

    // Set formation if different
    if (decision.formation !== fleet.formation) {
      this.fleetCoordination.setFormation(fleet.id, decision.formation);
    }

    // Execute action
    switch (decision.action) {
      case 'ENGAGE_PRIMARY':
      case 'ENGAGE_OPPORTUNITY':
        if (decision.primaryTarget) {
          this.fleetCoordination.attackTarget(fleet.id, decision.primaryTarget, 'FLEET');
        }
        break;

      case 'RETREAT_FULL':
      case 'RETREAT_TACTICAL':
        if (decision.destination) {
          this.fleetCoordination.moveFleetTo(fleet.id, decision.destination, 'COLUMN');
          fleet.currentOrder = 'RETREAT';
          fleet.status = 'RETREATING';
        }
        break;

      case 'DEFEND_POSITION':
        fleet.currentOrder = 'DEFEND';
        fleet.status = 'READY';
        break;

      case 'AWAIT_REINFORCEMENTS':
        fleet.currentOrder = 'HOLD';
        fleet.status = 'READY';
        this.requestReinforcements(fleet, decision);
        break;

      case 'MANEUVER_KITE':
        if (decision.destination) {
          this.fleetCoordination.moveFleetTo(fleet.id, decision.destination, 'SCATTER');
        }
        break;
    }
  }

  /**
   * Request reinforcements for fleet
   */
  private requestReinforcements(fleet: Fleet, decision: TacticalDecision): void {
    const request: ReinforcementRequest = {
      requestingFleetId: fleet.id,
      requestingFaction: fleet.faction,
      location: fleet.centerPosition,
      urgency: 7,
      reason: decision.reasoning,
      enemyStrength: 10000, // Placeholder
      ownStrength: fleet.totalFirepower,
      neededShips: Math.ceil(fleet.ships.length * 0.5), // Need 50% more ships
      timeframe: 3600 // 1 hour
    };

    this.reinforcementRequests.set(fleet.id, request);

    console.log(`[FleetAI] ${fleet.name} requesting reinforcements: ${request.neededShips} ships`);
  }

  // ====================================================================
  // UTILITY FUNCTIONS
  // ====================================================================

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
   * Get all active reinforcement requests
   */
  public getReinforcementRequests(): ReinforcementRequest[] {
    return Array.from(this.reinforcementRequests.values());
  }

  /**
   * Get fleet decision
   */
  public getDecision(fleetId: string): TacticalDecision | undefined {
    return this.fleetDecisions.get(fleetId);
  }

  /**
   * Clear old decisions (cleanup)
   */
  public cleanupOldDecisions(maxAge: number = 3600): void {
    const now = Date.now() / 1000;

    for (const [fleetId, decision] of this.fleetDecisions) {
      if (now - decision.timestamp > maxAge) {
        this.fleetDecisions.delete(fleetId);
      }
    }
  }
}
