/**
 * NPCShipAI.ts
 * Intelligent NPC ship behaviors with state machines and decision-making
 */

import { Vector3, CelestialBody } from './CelestialBody';
import { SpaceStation } from './StationGenerator';
import { Commodity } from './EconomySystem';
import { FactionSystem } from './FactionSystem';
import {
  ExtendedNPCMemory,
  Experience,
  ExperienceType,
  TraumaMemory,
  PersonalityTraits as ExtendedPersonality
} from './entity-ai/ExtendedNPCMemory';
import { HistoricalEvent } from './simulation/HistoricalMemorySystem';
import {
  NPCGoalSystem,
  NPCGoal,
  GoalType,
  GoalEvaluationContext,
  PlannedAction,
  ActionPlan
} from './entity-ai/NPCGoalSystem';
import { AdaptiveAI, ExpertiseDomain } from './entity-ai/AdaptiveAI';

export type ShipType = 'TRADER' | 'MINER' | 'PIRATE' | 'PATROL' | 'COURIER' | 'EXPLORER' | 'PASSENGER';
export type ShipState = 'IDLE' | 'TRAVELING' | 'DOCKING' | 'DOCKED' | 'TRADING' | 'MINING' | 'ATTACKING' | 'FLEEING' | 'PATROLLING';

export interface ShipCargo {
  commodity: string;
  amount: number;
  value: number;
}

export interface ShipStats {
  maxSpeed: number;           // m/s
  acceleration: number;        // m/s²
  turnRate: number;           // rad/s
  cargoCapacity: number;      // m³
  fuelCapacity: number;       // kg
  hullStrength: number;       // 0-100
  shieldStrength: number;     // 0-100
  weaponPower: number;        // arbitrary units
  sensorRange: number;        // meters
}

export interface NPCShip {
  id: string;
  name: string;
  type: ShipType;
  faction: string;
  position: Vector3;
  velocity: Vector3;
  state: ShipState;
  stats: ShipStats;
  cargo: ShipCargo[];
  fuel: number;               // kg
  credits: number;
  currentTarget?: string;     // ID of target station/ship/location
  destination?: Vector3;
  threat?: string;            // ID of threatening ship
  personality: ShipPersonality;
  route?: TradeRoute;
  memory: ShipMemory;         // Legacy simple memory (for backward compatibility)
  extendedMemory: ExtendedNPCMemory;  // New sophisticated memory system
  goalSystem: NPCGoalSystem;  // Goal-based planning and decision making
  adaptiveAI: AdaptiveAI;     // Learning system for skill progression and strategy evolution
  emotionalState: {           // Current emotional state
    stress: number;           // 0-10
    satisfaction: number;     // -10 to +10
    fear: number;             // 0-10
  };
  currentGoalAction?: PlannedAction;  // Action from goal system being executed
}

export interface ShipPersonality {
  aggression: number;         // 0-1
  greed: number;              // 0-1
  caution: number;            // 0-1
  curiosity: number;          // 0-1
  loyalty: number;            // 0-1
}

export interface ShipMemory {
  visitedStations: Set<string>;
  knownThreats: Map<string, number>; // shipId -> threat level
  profitableRoutes: TradeRoute[];
  lastTradeTime: number;
  totalProfit: number;
  lastCombatReport: number;          // Timestamp of last combat reported to factions
}

export interface TradeRoute {
  fromStation: string;
  toStation: string;
  commodity: string;
  profit: number;
  lastCheck: number;
}

export interface NavigationPath {
  waypoints: Vector3[];
  totalDistance: number;
  estimatedTime: number;
  hazards: string[];
}

/**
 * NPC Ship AI Controller
 */
export class NPCShipAI {
  private ships: Map<string, NPCShip> = new Map();
  private nextShipId = 0;

  /**
   * Create a new NPC ship
   */
  createShip(
    type: ShipType,
    faction: string,
    position: Vector3,
    customStats?: Partial<ShipStats>
  ): NPCShip {
    const stats = this.getDefaultStats(type);
    if (customStats) {
      Object.assign(stats, customStats);
    }

    const shipId = `ship_${this.nextShipId++}`;
    const personality = this.generatePersonality(type);

    // Convert simple personality to extended personality traits
    const extendedPersonality: Partial<ExtendedPersonality> = {
      aggression: personality.aggression,
      caution: personality.caution,
      greed: personality.greed,
      curiosity: personality.curiosity,
      loyalty: personality.loyalty,
      // Additional traits based on ship type
      risktaking: type === 'PIRATE' ? 0.7 : type === 'TRADER' ? 0.3 : 0.5,
      patience: type === 'TRADER' ? 0.7 : type === 'PIRATE' ? 0.2 : 0.5,
      adaptability: type === 'EXPLORER' ? 0.8 : 0.5
    };

    // Create extended memory first (needed for goal system and adaptive AI)
    const extendedMemory = new ExtendedNPCMemory(shipId, 'SHIP', extendedPersonality);

    // Create goal system
    const goalSystem = new NPCGoalSystem(extendedMemory);

    // Create adaptive AI (learning and skill progression)
    const adaptiveAI = new AdaptiveAI(extendedMemory, goalSystem);

    const ship: NPCShip = {
      id: shipId,
      name: this.generateShipName(type, faction),
      type,
      faction,
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      state: 'IDLE',
      stats,
      cargo: [],
      fuel: stats.fuelCapacity,
      credits: this.getStartingCredits(type),
      personality,
      memory: {
        visitedStations: new Set(),
        knownThreats: new Map(),
        profitableRoutes: [],
        lastTradeTime: 0,
        totalProfit: 0,
        lastCombatReport: 0
      },
      extendedMemory,
      goalSystem,
      adaptiveAI,
      emotionalState: {
        stress: 0,
        satisfaction: 0,
        fear: 0
      }
    };

    // Generate initial goals based on ship type
    this.generateInitialGoals(ship);

    this.ships.set(ship.id, ship);
    return ship;
  }

  /**
   * Update all NPC ships
   */
  update(
    deltaTime: number,
    stations: Map<string, SpaceStation>,
    celestialBodies: CelestialBody[],
    playerShip?: { position: Vector3; faction: string; id: string },
    factionSystem?: FactionSystem
  ): void {
    for (const ship of this.ships.values()) {
      this.updateShip(ship, deltaTime, stations, celestialBodies, playerShip, factionSystem);
    }
  }

  /**
   * Update individual ship AI
   */
  private updateShip(
    ship: NPCShip,
    deltaTime: number,
    stations: Map<string, SpaceStation>,
    celestialBodies: CelestialBody[],
    playerShip?: { position: Vector3; faction: string; id: string },
    factionSystem?: FactionSystem
  ): void {
    // Fuel consumption
    const speed = this.magnitude(ship.velocity);
    const fuelConsumption = 0.001 * speed * deltaTime; // Simplified
    ship.fuel = Math.max(0, ship.fuel - fuelConsumption);

    // Check for threats
    if (playerShip) {
      this.evaluateThreat(ship, playerShip);
    }

    // Update goal system (goal-driven AI)
    const context = this.buildGoalContext(ship, stations, celestialBodies, playerShip);
    const goalAction = ship.goalSystem.update(deltaTime, context);

    // If goal system has an action, execute it (goal-driven behavior)
    // Otherwise fall back to state machine (legacy behavior)
    if (goalAction && goalAction.status !== 'FAILED') {
      ship.currentGoalAction = goalAction;
      this.executeGoalAction(ship, goalAction, stations, celestialBodies);
    } else {
      // Fall back to state machine for behaviors not yet goal-driven
      this.executeStateMachine(ship, deltaTime, stations, celestialBodies, playerShip, factionSystem);
    }

    // Skill decay: skills atrophy without practice (1% per day after 7 days)
    ship.adaptiveAI.decaySkills(deltaTime);

    // Update position
    ship.position.x += ship.velocity.x * deltaTime;
    ship.position.y += ship.velocity.y * deltaTime;
    ship.position.z += ship.velocity.z * deltaTime;
  }

  /**
   * Execute state machine (legacy behavior system)
   */
  private executeStateMachine(
    ship: NPCShip,
    deltaTime: number,
    stations: Map<string, SpaceStation>,
    celestialBodies: CelestialBody[],
    playerShip?: { position: Vector3; faction: string; id: string },
    factionSystem?: FactionSystem
  ): void {

    // State machine
    switch (ship.state) {
      case 'IDLE':
        this.handleIdleState(ship, stations);
        break;

      case 'TRAVELING':
        this.handleTravelingState(ship, deltaTime, stations, celestialBodies);
        break;

      case 'DOCKING':
        this.handleDockingState(ship, deltaTime, stations);
        break;

      case 'DOCKED':
        this.handleDockedState(ship, deltaTime, stations);
        break;

      case 'TRADING':
        this.handleTradingState(ship, deltaTime, stations, factionSystem);
        break;

      case 'ATTACKING':
        this.handleAttackingState(ship, deltaTime, playerShip, factionSystem);
        break;

      case 'FLEEING':
        this.handleFleeingState(ship, deltaTime, playerShip);
        break;

      case 'PATROLLING':
        this.handlePatrollingState(ship, deltaTime, stations, celestialBodies);
        break;

      case 'MINING':
        this.handleMiningState(ship, deltaTime, celestialBodies);
        break;
    }
  }

  /**
   * Build context for goal evaluation
   */
  private buildGoalContext(
    ship: NPCShip,
    stations: Map<string, SpaceStation>,
    celestialBodies: CelestialBody[],
    playerShip?: { position: Vector3; faction: string; id: string }
  ): GoalEvaluationContext {
    const threats: string[] = [];
    const opportunities: string[] = [];
    const allies: string[] = [];
    const enemies: string[] = [];

    // Detect threats and opportunities
    if (playerShip) {
      const distance = this.distance(ship.position, playerShip.position);
      if (distance < ship.stats.sensorRange) {
        if (playerShip.faction === ship.faction) {
          allies.push(playerShip.id);
        } else {
          // Check if at war or hostile
          if (ship.type === 'PIRATE' || playerShip.faction !== ship.faction) {
            threats.push(playerShip.id);
            enemies.push(playerShip.id);
          }
        }
      }
    }

    // Find nearby stations
    for (const [stationId, station] of stations) {
      const distance = this.distance(ship.position, station.position);
      if (distance < ship.stats.sensorRange) {
        opportunities.push(stationId);
      }
    }

    return {
      currentTime: Date.now() / 1000,
      currentLocation: { ...ship.position },
      currentState: {
        location: { ...ship.position },
        resources: {
          credits: ship.credits,
          fuel: ship.fuel,
          cargoSpace: ship.stats.cargoCapacity - ship.cargo.reduce((sum, c) => sum + c.amount, 0)
        },
        satisfied: []
      },
      currentResources: {
        credits: ship.credits,
        fuel: ship.fuel,
        cargoSpace: ship.stats.cargoCapacity - ship.cargo.reduce((sum, c) => sum + c.amount, 0),
        health: ship.stats.hullStrength
      },
      threats,
      opportunities,
      allies,
      enemies
    };
  }

  /**
   * Execute a goal-driven action
   */
  private executeGoalAction(
    ship: NPCShip,
    action: PlannedAction,
    stations: Map<string, SpaceStation>,
    celestialBodies: CelestialBody[]
  ): void {
    // Translate goal action type to ship behavior
    switch (action.type) {
      case 'TRAVEL_TO':
        if (action.location) {
          ship.state = 'TRAVELING';
          ship.destination = { ...action.location };
        } else if (action.target) {
          // Target is a station ID
          const station = stations.get(action.target);
          if (station) {
            ship.state = 'TRAVELING';
            ship.destination = { ...station.position };
            ship.currentTarget = action.target;
          }
        }
        break;

      case 'DOCK_AT':
        if (action.target) {
          ship.state = 'DOCKING';
          ship.currentTarget = action.target;
          const station = stations.get(action.target);
          if (station) {
            ship.destination = { ...station.position };
          }
        }
        break;

      case 'TRADE_WITH':
        if (action.target) {
          ship.state = 'TRADING';
          ship.currentTarget = action.target;
        }
        break;

      case 'COMBAT':
        ship.state = 'ATTACKING';
        if (action.target) {
          ship.threat = action.target;
        }
        break;

      case 'FLEE':
        ship.state = 'FLEEING';
        break;

      case 'WAIT':
        ship.state = 'IDLE';
        break;

      case 'MINE':
        ship.state = 'MINING';
        break;

      case 'SCAN':
      case 'INVESTIGATE':
        ship.state = 'PATROLLING';
        if (action.location) {
          ship.destination = { ...action.location };
        }
        break;

      default:
        // Unknown action type, fall back to idle
        ship.state = 'IDLE';
    }

    // Mark action as in progress
    if (action.status === 'PENDING') {
      action.status = 'IN_PROGRESS';
    }
  }

  /**
   * Handle IDLE state - decide what to do
   */
  private handleIdleState(ship: NPCShip, stations: Map<string, SpaceStation>): void {
    switch (ship.type) {
      case 'TRADER':
        // Find profitable trade route
        const bestRoute = this.findBestTradeRoute(ship, stations);
        if (bestRoute) {
          ship.route = bestRoute;
          ship.currentTarget = bestRoute.fromStation;
          ship.state = 'TRAVELING';
          const station = stations.get(bestRoute.fromStation);
          if (station) {
            ship.destination = { ...station.position };
          }
        }
        break;

      case 'PATROL':
        // Start patrol route
        ship.state = 'PATROLLING';
        break;

      case 'MINER':
        // Find nearest asteroid field
        ship.state = 'MINING';
        break;

      case 'PIRATE':
        // Look for targets
        if (Math.random() < ship.personality.aggression) {
          ship.state = 'PATROLLING';
        }
        break;

      case 'EXPLORER':
        // Random exploration
        ship.destination = this.generateRandomDestination(ship.position, 1e9);
        ship.state = 'TRAVELING';
        break;

      default:
        // Stay idle
        break;
    }
  }

  /**
   * Handle TRAVELING state - navigate to destination
   */
  private handleTravelingState(
    ship: NPCShip,
    deltaTime: number,
    stations: Map<string, SpaceStation>,
    celestialBodies: CelestialBody[]
  ): void {
    if (!ship.destination) {
      ship.state = 'IDLE';
      return;
    }

    // Check for trauma triggers at current location
    const traumatized = this.checkTraumaTriggers(ship, {
      location: ship.position,
      situationType: 'TRAVELING'
    });

    // If traumatized, abort current destination and flee
    if (traumatized) {
      ship.destination = this.generateRandomDestination(ship.position, 1e8);
      ship.currentTarget = undefined;
      ship.route = undefined;
      // Traumatized ships return to idle after fleeing from trigger
      if (Math.random() < 0.3) {
        ship.state = 'IDLE';
        return;
      }
    }

    // Calculate direction to destination
    const toDestination = {
      x: ship.destination.x - ship.position.x,
      y: ship.destination.y - ship.position.y,
      z: ship.destination.z - ship.position.z
    };
    const distance = this.magnitude(toDestination);

    // Arrived?
    if (distance < 1000) { // Within 1km
      if (ship.currentTarget && stations.has(ship.currentTarget)) {
        ship.state = 'DOCKING';
      } else {
        ship.state = 'IDLE';
        ship.destination = undefined;
      }
      return;
    }

    // Normalize direction
    const direction = {
      x: toDestination.x / distance,
      y: toDestination.y / distance,
      z: toDestination.z / distance
    };

    // Simple navigation - accelerate toward target
    const desiredVelocity = {
      x: direction.x * ship.stats.maxSpeed,
      y: direction.y * ship.stats.maxSpeed,
      z: direction.z * ship.stats.maxSpeed
    };

    // Smooth acceleration
    ship.velocity.x += (desiredVelocity.x - ship.velocity.x) * Math.min(1, ship.stats.acceleration * deltaTime / ship.stats.maxSpeed);
    ship.velocity.y += (desiredVelocity.y - ship.velocity.y) * Math.min(1, ship.stats.acceleration * deltaTime / ship.stats.maxSpeed);
    ship.velocity.z += (desiredVelocity.z - ship.velocity.z) * Math.min(1, ship.stats.acceleration * deltaTime / ship.stats.maxSpeed);

    // Deceleration zone
    const stoppingDistance = (ship.stats.maxSpeed * ship.stats.maxSpeed) / (2 * ship.stats.acceleration);
    if (distance < stoppingDistance) {
      const speedReduction = 1 - (stoppingDistance - distance) / stoppingDistance;
      ship.velocity.x *= speedReduction;
      ship.velocity.y *= speedReduction;
      ship.velocity.z *= speedReduction;
    }
  }

  /**
   * Handle DOCKING state
   */
  private handleDockingState(
    ship: NPCShip,
    deltaTime: number,
    stations: Map<string, SpaceStation>
  ): void {
    // Simulate docking time
    const dockingTime = 30; // 30 seconds

    // Decelerate
    ship.velocity.x *= 0.9;
    ship.velocity.y *= 0.9;
    ship.velocity.z *= 0.9;

    // After brief delay, transition to docked
    if (this.magnitude(ship.velocity) < 1) {
      ship.state = 'DOCKED';
      ship.memory.visitedStations.add(ship.currentTarget!);

      // Update goal progress: completed docking action
      if (ship.currentGoalAction && ship.currentGoalAction.type === 'DOCK_AT') {
        ship.currentGoalAction.status = 'COMPLETED';
        this.updateGoalProgress(ship, 'docked_at_station');
      }
    }
  }

  /**
   * Handle DOCKED state - perform station activities
   */
  private handleDockedState(
    ship: NPCShip,
    deltaTime: number,
    stations: Map<string, SpaceStation>
  ): void {
    if (!ship.currentTarget || !stations.has(ship.currentTarget)) {
      ship.state = 'IDLE';
      return;
    }

    const station = stations.get(ship.currentTarget)!;

    // Refuel
    if (ship.fuel < ship.stats.fuelCapacity * 0.9) {
      const refuelAmount = Math.min(
        ship.stats.fuelCapacity - ship.fuel,
        100 * deltaTime
      );
      ship.fuel += refuelAmount;
      ship.credits -= refuelAmount * 0.5; // Cost of fuel
    }

    // Memory consolidation during rest (simulates "sleep"/downtime)
    // Consolidate memories every ~5 seconds of docked time
    if (Math.random() < deltaTime * 0.2) {
      this.consolidateMemoriesWhileDocked(ship, deltaTime);

      // Record docking experience if first time at this station
      if (!ship.memory.visitedStations.has(ship.currentTarget)) {
        ship.memory.visitedStations.add(ship.currentTarget);
        this.recordExperience(
          ship,
          'FIRST_TIME',
          `First visit to ${station.name}`,
          2, // Slight positive emotional impact
          5, // Moderate intensity
          [station.id]
        );
      }
    }

    // Trading behavior
    if (ship.type === 'TRADER' && ship.route) {
      ship.state = 'TRADING';
    } else {
      // Stay docked for a bit, then leave
      if (Math.random() < 0.01) { // 1% chance per update to leave
        ship.currentTarget = undefined;
        ship.state = 'IDLE';
      }
    }
  }

  /**
   * Handle TRADING state
   */
  private handleTradingState(
    ship: NPCShip,
    deltaTime: number,
    stations: Map<string, SpaceStation>,
    factionSystem?: FactionSystem
  ): void {
    if (!ship.route) {
      ship.state = 'DOCKED';
      return;
    }

    // Simplified trading logic
    // In reality, this would interact with EconomySystem

    // Buy cargo at from station
    if (ship.currentTarget === ship.route.fromStation && ship.cargo.length === 0) {
      const affordableAmount = Math.min(
        ship.stats.cargoCapacity,
        ship.credits / 100 // Simplified pricing
      );

      ship.cargo.push({
        commodity: ship.route.commodity,
        amount: affordableAmount,
        value: affordableAmount * 100
      });
      ship.credits -= affordableAmount * 100;

      // Now travel to destination
      ship.currentTarget = ship.route.toStation;
      ship.state = 'TRAVELING';
    }
    // Sell cargo at destination
    else if (ship.currentTarget === ship.route.toStation && ship.cargo.length > 0) {
      const totalValue = ship.cargo.reduce((sum, c) => sum + c.value * 1.2, 0); // 20% profit
      ship.credits += totalValue;
      const profit = totalValue - ship.cargo.reduce((sum, c) => sum + c.value, 0);
      ship.memory.totalProfit += profit;
      ship.memory.lastTradeTime = Date.now() / 1000;

      // Report trade to faction system to improve relations
      if (factionSystem && ship.route) {
        const fromStation = stations.get(ship.route.fromStation);
        const toStation = stations.get(ship.route.toStation);

        if (fromStation && toStation && fromStation.faction && toStation.faction) {
          // Trade between different factions improves relations
          if (fromStation.faction !== toStation.faction) {
            factionSystem.reportTrade(fromStation.faction, toStation.faction, totalValue);
          }
        }
      }

      // Record successful trade experience
      const emotionalImpact = Math.min(10, profit / 500); // Higher profit = better feeling
      const intensity = profit > 1000 ? 7 : 5; // Very profitable trades are more memorable

      this.recordExperience(
        ship,
        profit > 1000 ? 'PROFITABLE_DISCOVERY' : 'SUCCESSFUL_TRADE',
        `Completed trade of ${ship.route.commodity}: ${profit.toFixed(0)} credits profit`,
        emotionalImpact,
        intensity,
        ship.route ? [ship.route.fromStation, ship.route.toStation] : []
      );

      // Update profitable routes memory
      if (profit > 0 && ship.route) {
        const existingRoute = ship.memory.profitableRoutes.find(
          r => r.fromStation === ship.route!.fromStation && r.toStation === ship.route!.toStation
        );
        if (existingRoute) {
          existingRoute.profit = (existingRoute.profit + profit) / 2; // Moving average
          existingRoute.lastCheck = Date.now() / 1000;
        } else {
          ship.memory.profitableRoutes.push({
            ...ship.route,
            profit,
            lastCheck: Date.now() / 1000
          });
        }
      }

      ship.cargo = [];
      ship.state = 'DOCKED';
      ship.route = undefined;

      // Update goal progress: completed a trade
      if (ship.currentGoalAction && ship.currentGoalAction.type === 'TRADE_WITH') {
        ship.currentGoalAction.status = 'COMPLETED';
      }
      this.updateGoalProgress(ship, 'completed_trade', { profit });

      // Record learning outcome for adaptive AI
      const normalizedReward = Math.max(-10, Math.min(10, profit / 1000)); // Normalize to -10 to +10
      ship.adaptiveAI.recordOutcome(
        `trading_${ship.route.commodity}`,
        `route_${ship.route.fromStation}_to_${ship.route.toStation}`,
        'SUCCESS',
        normalizedReward,
        { profit, commodity: ship.route.commodity }
      );
    }
  }

  /**
   * Handle ATTACKING state
   */
  private handleAttackingState(
    ship: NPCShip,
    deltaTime: number,
    playerShip?: { position: Vector3; faction: string; id: string },
    factionSystem?: FactionSystem
  ): void {
    if (!ship.threat || !playerShip || ship.threat !== playerShip.id) {
      ship.state = 'IDLE';
      return;
    }

    // Navigate toward target
    ship.destination = { ...playerShip.position };

    const distance = this.distance(ship.position, playerShip.position);

    // In weapon range?
    if (distance < 5000) {
      // Attack! (this would trigger weapon systems in a full implementation)

      // Report combat to faction system (max once per 10 seconds to avoid spam)
      const now = Date.now() / 1000;
      if (factionSystem && ship.faction && playerShip.faction && ship.faction !== playerShip.faction) {
        if (now - ship.memory.lastCombatReport > 10) {
          // Calculate combat severity based on damage potential
          const severity = (ship.stats.weaponPower / 100) + (distance < 2000 ? 0.5 : 0);
          factionSystem.reportCombat(ship.faction, playerShip.faction, severity);
          ship.memory.lastCombatReport = now;

          // Record combat experience
          this.recordExperience(
            ship,
            'COMBAT_VICTORY',
            `Engaged ${playerShip.faction} ship in combat`,
            -3, // Combat is stressful even when winning
            6,
            [playerShip.id]
          );

          // Record learning outcome for adaptive AI (successful combat engagement)
          const combatReward = severity * 3; // Higher severity = more impressive victory
          ship.adaptiveAI.recordOutcome(
            `combat_with_${playerShip.faction}`,
            'engage_attack',
            'SUCCESS',
            combatReward,
            { severity, distance, weaponPower: ship.stats.weaponPower }
          );
        }
      }
    }

    // Lost target or too damaged?
    if (distance > ship.stats.sensorRange || ship.stats.hullStrength < 30) {
      // Record combat defeat if hull is low
      if (ship.stats.hullStrength < 30) {
        this.recordExperience(
          ship,
          'COMBAT_DEFEAT',
          `Severely damaged by ${playerShip.faction} ship - retreating`,
          -8, // Very negative emotional impact
          9,  // Highly memorable
          [playerShip.id]
        );

        // Record learning outcome for adaptive AI (combat failure)
        const defeatPenalty = -(100 - ship.stats.hullStrength) / 10; // More damage = worse failure
        ship.adaptiveAI.recordOutcome(
          `combat_with_${playerShip.faction}`,
          'engage_attack',
          'FAILURE',
          defeatPenalty,
          { hullStrength: ship.stats.hullStrength, distance }
        );
      }

      ship.state = 'FLEEING';
      ship.threat = undefined;
    }
  }

  /**
   * Handle FLEEING state
   */
  private handleFleeingState(
    ship: NPCShip,
    deltaTime: number,
    playerShip?: { position: Vector3; faction: string; id: string }
  ): void {
    if (!playerShip) {
      ship.state = 'IDLE';
      return;
    }

    // Record near-death experience if hull is critically low
    // This will create trauma that affects future behavior
    if (ship.stats.hullStrength < 20 && Math.random() < 0.1) {
      this.recordExperience(
        ship,
        'NEAR_DEATH',
        `Barely escaped death from ${playerShip.faction} ship at ${ship.position.x.toFixed(0)}, ${ship.position.y.toFixed(0)}, ${ship.position.z.toFixed(0)}`,
        -10, // Maximum negative emotional impact
        10,  // Maximum intensity - will never forget
        [playerShip.id]
      );
      // Update threat memory
      ship.memory.knownThreats.set(playerShip.id, Date.now() / 1000);
    }

    // Flee in opposite direction
    const awayFromThreat = {
      x: ship.position.x - playerShip.position.x,
      y: ship.position.y - playerShip.position.y,
      z: ship.position.z - playerShip.position.z
    };

    const distance = this.magnitude(awayFromThreat);
    if (distance > ship.stats.sensorRange * 2) {
      // Successfully escaped
      if (ship.stats.hullStrength < 50) {
        // Record successful escape
        this.recordExperience(
          ship,
          'FLEEING',
          `Successfully escaped from ${playerShip.faction} threat`,
          3, // Relief
          7,
          [playerShip.id]
        );

        // Record learning outcome for adaptive AI (successful escape)
        const escapeReward = 5; // Successful survival is rewarding
        ship.adaptiveAI.recordOutcome(
          `threat_from_${playerShip.faction}`,
          'flee_to_safety',
          'SUCCESS',
          escapeReward,
          { hullStrength: ship.stats.hullStrength, distance }
        );
      }
      ship.state = 'IDLE';
      return;
    }

    ship.destination = {
      x: ship.position.x + awayFromThreat.x * 10,
      y: ship.position.y + awayFromThreat.y * 10,
      z: ship.position.z + awayFromThreat.z * 10
    };
  }

  /**
   * Handle PATROLLING state
   */
  private handlePatrollingState(
    ship: NPCShip,
    deltaTime: number,
    stations: Map<string, SpaceStation>,
    celestialBodies: CelestialBody[]
  ): void {
    // Generate patrol waypoints if needed
    if (!ship.destination) {
      ship.destination = this.generateRandomDestination(ship.position, 1e8);
    }

    // Continue to destination
    const distance = this.distance(ship.position, ship.destination);
    if (distance < 10000) {
      ship.destination = this.generateRandomDestination(ship.position, 1e8);
    }
  }

  /**
   * Handle MINING state
   */
  private handleMiningState(
    ship: NPCShip,
    deltaTime: number,
    celestialBodies: CelestialBody[]
  ): void {
    // Find nearest asteroid
    // Simplified: just generate cargo over time
    const miningRate = 0.1 * deltaTime; // units per second

    const usedCapacity = ship.cargo.reduce((sum, c) => sum + c.amount * 0.5, 0);
    if (usedCapacity < ship.stats.cargoCapacity) {
      const existing = ship.cargo.find(c => c.commodity === 'iron');
      if (existing) {
        existing.amount += miningRate;
        existing.value += miningRate * 80;
      } else {
        ship.cargo.push({
          commodity: 'iron',
          amount: miningRate,
          value: miningRate * 80
        });
      }
    } else {
      // Cargo full, go sell
      ship.state = 'IDLE';
    }
  }

  /**
   * Evaluate threat from another ship
   */
  private evaluateThreat(
    ship: NPCShip,
    otherShip: { position: Vector3; faction: string; id: string }
  ): void {
    const distance = this.distance(ship.position, otherShip.position);

    // Out of sensor range
    if (distance > ship.stats.sensorRange) {
      return;
    }

    // Same faction = friendly
    if (ship.faction === otherShip.faction) {
      return;
    }

    // Threat level calculation
    let threatLevel = 0;

    if (ship.type === 'PIRATE') {
      // Pirates see everyone as potential targets
      threatLevel = ship.personality.aggression;

      if (ship.cargo.length > 0 || ship.credits > 10000) {
        // Valuable target
        threatLevel += 0.3;
      }

      if (threatLevel > 0.6) {
        ship.threat = otherShip.id;
        ship.state = 'ATTACKING';
      }
    } else {
      // Non-pirates fear pirates
      if (otherShip.faction === 'PIRATE') {
        threatLevel = 0.8;
      }

      if (ship.personality.caution * threatLevel > 0.5) {
        ship.threat = otherShip.id;
        ship.state = 'FLEEING';
      }
    }

    ship.memory.knownThreats.set(otherShip.id, threatLevel);
  }

  /**
   * Find best trade route for ship
   */
  private findBestTradeRoute(
    ship: NPCShip,
    stations: Map<string, SpaceStation>
  ): TradeRoute | null {
    // Check memory first
    if (ship.memory.profitableRoutes.length > 0) {
      const route = ship.memory.profitableRoutes[0];
      // Verify stations still exist
      if (stations.has(route.fromStation) && stations.has(route.toStation)) {
        return route;
      }
    }

    // Find new route
    const stationList = Array.from(stations.values());
    let bestRoute: TradeRoute | null = null;
    let bestProfit = 0;

    for (let i = 0; i < stationList.length; i++) {
      for (let j = 0; j < stationList.length; j++) {
        if (i === j) continue;

        const from = stationList[i];
        const to = stationList[j];

        // Simplified profit calculation
        // In real implementation, would check actual market prices
        const distance = this.distance(from.position, to.position);
        const profit = 1000 - distance / 1e6; // Arbitrary profit model

        if (profit > bestProfit) {
          bestProfit = profit;
          bestRoute = {
            fromStation: from.id,
            toStation: to.id,
            commodity: 'fuel', // Simplified
            profit,
            lastCheck: Date.now()
          };
        }
      }
    }

    if (bestRoute) {
      ship.memory.profitableRoutes.push(bestRoute);
    }

    return bestRoute;
  }

  /**
   * Get default stats for ship type
   */
  private getDefaultStats(type: ShipType): ShipStats {
    const baseStats: Record<ShipType, ShipStats> = {
      TRADER: {
        maxSpeed: 200,
        acceleration: 20,
        turnRate: 0.5,
        cargoCapacity: 1000,
        fuelCapacity: 5000,
        hullStrength: 100,
        shieldStrength: 50,
        weaponPower: 10,
        sensorRange: 100000
      },
      MINER: {
        maxSpeed: 100,
        acceleration: 10,
        turnRate: 0.3,
        cargoCapacity: 2000,
        fuelCapacity: 8000,
        hullStrength: 150,
        shieldStrength: 30,
        weaponPower: 5,
        sensorRange: 50000
      },
      PIRATE: {
        maxSpeed: 300,
        acceleration: 40,
        turnRate: 1.0,
        cargoCapacity: 500,
        fuelCapacity: 3000,
        hullStrength: 80,
        shieldStrength: 70,
        weaponPower: 50,
        sensorRange: 150000
      },
      PATROL: {
        maxSpeed: 250,
        acceleration: 30,
        turnRate: 0.8,
        cargoCapacity: 200,
        fuelCapacity: 4000,
        hullStrength: 120,
        shieldStrength: 100,
        weaponPower: 40,
        sensorRange: 200000
      },
      COURIER: {
        maxSpeed: 400,
        acceleration: 50,
        turnRate: 1.2,
        cargoCapacity: 100,
        fuelCapacity: 2000,
        hullStrength: 60,
        shieldStrength: 40,
        weaponPower: 5,
        sensorRange: 80000
      },
      EXPLORER: {
        maxSpeed: 150,
        acceleration: 15,
        turnRate: 0.6,
        cargoCapacity: 300,
        fuelCapacity: 10000,
        hullStrength: 100,
        shieldStrength: 60,
        weaponPower: 15,
        sensorRange: 300000
      },
      PASSENGER: {
        maxSpeed: 180,
        acceleration: 25,
        turnRate: 0.7,
        cargoCapacity: 50,
        fuelCapacity: 3000,
        hullStrength: 90,
        shieldStrength: 80,
        weaponPower: 10,
        sensorRange: 100000
      }
    };

    return { ...baseStats[type] };
  }

  /**
   * Generate ship personality
   */
  private generatePersonality(type: ShipType): ShipPersonality {
    const base: Record<ShipType, ShipPersonality> = {
      TRADER: { aggression: 0.1, greed: 0.8, caution: 0.7, curiosity: 0.3, loyalty: 0.6 },
      MINER: { aggression: 0.1, greed: 0.6, caution: 0.8, curiosity: 0.2, loyalty: 0.7 },
      PIRATE: { aggression: 0.9, greed: 0.9, caution: 0.3, curiosity: 0.5, loyalty: 0.4 },
      PATROL: { aggression: 0.5, greed: 0.2, caution: 0.5, curiosity: 0.4, loyalty: 0.9 },
      COURIER: { aggression: 0.2, greed: 0.5, caution: 0.6, curiosity: 0.3, loyalty: 0.7 },
      EXPLORER: { aggression: 0.2, greed: 0.3, caution: 0.5, curiosity: 0.9, loyalty: 0.5 },
      PASSENGER: { aggression: 0.1, greed: 0.7, caution: 0.9, curiosity: 0.2, loyalty: 0.8 }
    };

    const personality = { ...base[type] };

    // Add some variation
    for (const key in personality) {
      personality[key as keyof ShipPersonality] += (Math.random() - 0.5) * 0.2;
      personality[key as keyof ShipPersonality] = Math.max(0, Math.min(1, personality[key as keyof ShipPersonality]));
    }

    return personality;
  }

  /**
   * Generate ship name
   */
  private generateShipName(type: ShipType, faction: string): string {
    const prefixes = ['SS', 'ISV', 'MSV', 'CSV', 'USV'];
    const names = [
      'Venture', 'Pioneer', 'Explorer', 'Pathfinder', 'Odyssey',
      'Horizon', 'Aurora', 'Nebula', 'Frontier', 'Discovery',
      'Liberty', 'Enterprise', 'Voyager', 'Serenity', 'Endeavor'
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const number = Math.floor(Math.random() * 999);

    return `${prefix} ${name}-${number}`;
  }

  /**
   * Get starting credits for ship type
   */
  private getStartingCredits(type: ShipType): number {
    const credits: Record<ShipType, number> = {
      TRADER: 50000,
      MINER: 30000,
      PIRATE: 10000,
      PATROL: 20000,
      COURIER: 25000,
      EXPLORER: 40000,
      PASSENGER: 35000
    };
    return credits[type];
  }

  /**
   * Generate random destination
   */
  private generateRandomDestination(from: Vector3, maxDistance: number): Vector3 {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const distance = Math.random() * maxDistance;

    return {
      x: from.x + Math.cos(angle1) * Math.cos(angle2) * distance,
      y: from.y + Math.sin(angle1) * Math.cos(angle2) * distance,
      z: from.z + Math.sin(angle2) * distance
    };
  }

  /**
   * Vector magnitude
   */
  private magnitude(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  /**
   * Distance between two points
   */
  private distance(p1: Vector3, p2: Vector3): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get all ships
   */
  getAllShips(): NPCShip[] {
    return Array.from(this.ships.values());
  }

  /**
   * Get ships by type
   */
  getShipsByType(type: ShipType): NPCShip[] {
    return Array.from(this.ships.values()).filter(s => s.type === type);
  }

  /**
   * Get ships by faction
   */
  getShipsByFaction(faction: string): NPCShip[] {
    return Array.from(this.ships.values()).filter(s => s.faction === faction);
  }

  /**
   * Get ships in range
   */
  getShipsInRange(position: Vector3, range: number): NPCShip[] {
    return Array.from(this.ships.values()).filter(s =>
      this.distance(s.position, position) <= range
    );
  }

  /**
   * Remove ship
   */
  removeShip(shipId: string): void {
    this.ships.delete(shipId);
  }

  /**
   * Record an experience in the ship's extended memory
   */
  private recordExperience(
    ship: NPCShip,
    type: ExperienceType,
    description: string,
    emotionalImpact: number,
    intensity: number,
    participants: string[] = []
  ): void {
    const experience: Experience = {
      id: `exp_${ship.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now() / 1000,
      type,
      event: {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now() / 1000,
        type: this.mapExperienceTypeToEventType(type),
        severity: Math.ceil(intensity / 2), // Convert 0-10 intensity to 1-5 severity
        category: this.mapExperienceToCategory(type),
        description,
        participants,
        initiator: ship.id,
        victims: emotionalImpact < 0 ? [ship.id] : undefined,
        location: { ...ship.position },
        systemId: undefined,
        stationId: undefined,
        data: {
          shipType: ship.type,
          faction: ship.faction,
          emotionalImpact,
          intensity
        },
        detailedLog: undefined,
        consequences: [],
        witnessed: false,
        priority: Math.ceil(intensity),
        tags: [ship.type, ship.faction, type]
      },
      emotionalImpact,
      intensity,
      location: { ...ship.position },
      witnesses: participants,
      memoryStrength: 1.0,
      recallCount: 0,
      consolidated: false
    };

    ship.extendedMemory.recordExperience(experience);

    // Update emotional state based on experience
    if (emotionalImpact < -5) {
      ship.emotionalState.stress += Math.abs(emotionalImpact) / 2;
      ship.emotionalState.satisfaction += emotionalImpact / 2;
    } else if (emotionalImpact > 5) {
      ship.emotionalState.satisfaction += emotionalImpact / 2;
      ship.emotionalState.stress = Math.max(0, ship.emotionalState.stress - 1);
    }

    // Cap emotional states
    ship.emotionalState.stress = Math.max(0, Math.min(10, ship.emotionalState.stress));
    ship.emotionalState.satisfaction = Math.max(-10, Math.min(10, ship.emotionalState.satisfaction));
    ship.emotionalState.fear = Math.max(0, Math.min(10, ship.emotionalState.fear));
  }

  /**
   * Map ExperienceType to HistoricalEvent EventType
   */
  private mapExperienceTypeToEventType(type: ExperienceType): HistoricalEvent['type'] {
    const mapping: Record<ExperienceType, HistoricalEvent['type']> = {
      'NEAR_DEATH': 'COMBAT_ENDED',
      'SUCCESSFUL_TRADE': 'TRADE_COMPLETED',
      'PROFITABLE_DISCOVERY': 'POI_DISCOVERED',
      'BETRAYAL': 'REPUTATION_CHANGE',
      'RESCUE': 'RESCUE',
      'BEING_RESCUED': 'RESCUE',
      'COMBAT_VICTORY': 'COMBAT_ENDED',
      'COMBAT_DEFEAT': 'COMBAT_ENDED',
      'FLEEING': 'COMBAT_ENDED',
      'FIRST_TIME': 'ENCOUNTER',
      'MILESTONE': 'GOAL_ACHIEVED',
      'FAILURE': 'GOAL_FAILED',
      'FRIENDSHIP_FORMED': 'REPUTATION_CHANGE',
      'FRIENDSHIP_BROKEN': 'REPUTATION_CHANGE',
      'REPUTATION_GAINED': 'REPUTATION_EARNED',
      'REPUTATION_LOST': 'REPUTATION_CHANGE',
      'GOAL_ACHIEVED': 'GOAL_ACHIEVED',
      'GOAL_FAILED': 'GOAL_FAILED',
      'DISCOVERY': 'POI_DISCOVERED',
      'EXPLORATION': 'SYSTEM_MAPPED',
      'LEARNING': 'GOAL_ACHIEVED'
    };
    return mapping[type] || 'ENCOUNTER';
  }

  /**
   * Map ExperienceType to HistoricalEvent EventCategory
   */
  private mapExperienceToCategory(type: ExperienceType): HistoricalEvent['category'] {
    const mapping: Record<ExperienceType, HistoricalEvent['category']> = {
      'NEAR_DEATH': 'MILITARY',
      'SUCCESSFUL_TRADE': 'ECONOMIC',
      'PROFITABLE_DISCOVERY': 'DISCOVERY',
      'BETRAYAL': 'SOCIAL',
      'RESCUE': 'PERSONAL',
      'BEING_RESCUED': 'PERSONAL',
      'COMBAT_VICTORY': 'MILITARY',
      'COMBAT_DEFEAT': 'MILITARY',
      'FLEEING': 'MILITARY',
      'FIRST_TIME': 'PERSONAL',
      'MILESTONE': 'PERSONAL',
      'FAILURE': 'PERSONAL',
      'FRIENDSHIP_FORMED': 'SOCIAL',
      'FRIENDSHIP_BROKEN': 'SOCIAL',
      'REPUTATION_GAINED': 'SOCIAL',
      'REPUTATION_LOST': 'SOCIAL',
      'GOAL_ACHIEVED': 'PERSONAL',
      'GOAL_FAILED': 'PERSONAL',
      'DISCOVERY': 'DISCOVERY',
      'EXPLORATION': 'DISCOVERY',
      'LEARNING': 'PERSONAL'
    };
    return mapping[type] || 'PERSONAL';
  }

  /**
   * Check for trauma triggers before making decisions
   * Returns true if ship is too traumatized to proceed
   */
  private checkTraumaTriggers(
    ship: NPCShip,
    situation: {
      location?: Vector3;
      entityTypes?: string[];
      situationType?: string;
    }
  ): boolean {
    const triggeredTraumas = ship.extendedMemory.checkTraumaTriggers(situation);

    if (triggeredTraumas.length > 0) {
      // Trauma triggered! Update emotional state
      ship.emotionalState.fear += triggeredTraumas.length * 2;
      ship.emotionalState.stress += triggeredTraumas.length;
      ship.emotionalState.fear = Math.min(10, ship.emotionalState.fear);
      ship.emotionalState.stress = Math.min(10, ship.emotionalState.stress);

      // If fear is too high, ship should avoid this situation
      return ship.emotionalState.fear > 7;
    }

    return false;
  }

  /**
   * Consolidate memories during rest period (docking)
   */
  private consolidateMemoriesWhileDocked(ship: NPCShip, dockingDuration: number): void {
    const consolidated = ship.extendedMemory.consolidateMemories(dockingDuration);

    if (consolidated > 0) {
      // Consolidation reduces stress
      ship.emotionalState.stress = Math.max(0, ship.emotionalState.stress - consolidated * 0.5);
    }
  }

  /**
   * Update goal progress based on completed actions
   */
  private updateGoalProgress(ship: NPCShip, event: string, data?: Record<string, unknown>): void {
    const currentGoal = ship.goalSystem.getCurrentGoal();
    if (!currentGoal) return;

    // Track progress based on event type
    let progressMade = false;

    switch (event) {
      case 'docked_at_station':
        // For trading goals, docking is a step toward trading
        if (currentGoal.type === 'ACCUMULATE_WEALTH' || currentGoal.type === 'BUILD_TRADE_EMPIRE') {
          const subgoal = currentGoal.subgoals[currentGoal.currentSubgoal];
          if (subgoal && subgoal.description.includes('trade route')) {
            subgoal.progress = Math.min(1, subgoal.progress + 0.2);
            progressMade = true;
          }
        }
        break;

      case 'completed_trade':
        // Trading goals - count trades
        if (currentGoal.type === 'ACCUMULATE_WEALTH' || currentGoal.type === 'BUILD_TRADE_EMPIRE') {
          const tradeCount = ship.memory.profitableRoutes.length;
          const targetTrades = 10; // From "Complete 10 profitable trades" subgoal

          // Update subgoal progress
          const subgoal = currentGoal.subgoals.find(sg => sg.description.includes('profitable trades'));
          if (subgoal) {
            subgoal.progress = Math.min(1, tradeCount / targetTrades);
            if (subgoal.progress >= 1) {
              subgoal.completed = true;
            }
            progressMade = true;
          }

          // Update overall goal progress
          currentGoal.progress = currentGoal.subgoals
            .filter(sg => !sg.optional)
            .reduce((sum, sg) => sum + sg.progress, 0) /
            currentGoal.subgoals.filter(sg => !sg.optional).length;

          // Check if goal is complete
          if (currentGoal.progress >= 1) {
            ship.goalSystem.completeGoal(currentGoal.id);

            // Update satisfaction based on achievement
            ship.emotionalState.satisfaction += currentGoal.expectedReward.satisfaction || 0;
            ship.emotionalState.satisfaction = Math.min(10, ship.emotionalState.satisfaction);
          }
        }
        break;

      case 'region_explored':
        // Exploration goals
        if (currentGoal.type === 'EXPLORE_UNKNOWN') {
          const subgoal = currentGoal.subgoals[currentGoal.currentSubgoal];
          if (subgoal) {
            subgoal.progress = Math.min(1, subgoal.progress + 0.2); // Each region = 20% of 5 regions
            if (subgoal.progress >= 1) {
              subgoal.completed = true;
              currentGoal.currentSubgoal++;
            }
            progressMade = true;
          }

          currentGoal.progress = currentGoal.subgoals
            .filter(sg => !sg.optional)
            .reduce((sum, sg) => sum + (sg.completed ? 1 : sg.progress), 0) /
            currentGoal.subgoals.filter(sg => !sg.optional).length;
        }
        break;

      case 'combat_won':
        // Pirate goals - raid count
        if (currentGoal.type === 'ACCUMULATE_WEALTH' && currentGoal.category === 'ECONOMIC') {
          const subgoal = currentGoal.subgoals.find(sg => sg.description.includes('raid'));
          if (subgoal) {
            subgoal.progress = Math.min(1, subgoal.progress + 0.2); // Each raid = 20% of 5 raids
            if (subgoal.progress >= 1) {
              subgoal.completed = true;
            }
            progressMade = true;
          }
        }
        break;
    }

    // Reduce stress slightly when making progress toward goals
    if (progressMade && currentGoal.motivation.emotionalDrive > 5) {
      ship.emotionalState.stress = Math.max(0, ship.emotionalState.stress - 0.5);
    }
  }

  /**
   * Generate initial goals based on ship type
   */
  private generateInitialGoals(ship: NPCShip): void {
    const now = Date.now() / 1000;
    let primaryGoal: NPCGoal | null = null;

    switch (ship.type) {
      case 'TRADER':
        primaryGoal = {
          id: `goal_${ship.id}_wealth`,
          type: 'ACCUMULATE_WEALTH',
          category: 'ECONOMIC',
          name: 'Build Trading Fortune',
          description: 'Accumulate wealth through profitable trade routes',
          priority: 80,
          urgency: 40,
          progress: 0,
          subgoals: [
            { description: 'Find profitable trade route', completed: false, optional: false, progress: 0 },
            { description: 'Complete 10 profitable trades', completed: false, optional: false, progress: 0 },
            { description: 'Build reputation with traders', completed: false, optional: true, progress: 0 }
          ],
          currentSubgoal: 0,
          prerequisites: [],
          motivation: {
            type: 'INTRINSIC',
            reason: 'Desire for financial success',
            emotionalDrive: ship.personality.greed * 10
          },
          expectedReward: {
            credits: 100000,
            satisfaction: 8
          },
          status: 'ACTIVE',
          attempts: 0,
          failures: 0,
          createdAt: now,
          createdBy: 'SELF',
          tags: ['trading', 'wealth', 'career']
        };
        break;

      case 'EXPLORER':
        primaryGoal = {
          id: `goal_${ship.id}_explore`,
          type: 'EXPLORE_UNKNOWN',
          category: 'EXPLORATION',
          name: 'Map the Unknown',
          description: 'Discover and map unexplored regions of space',
          priority: 85,
          urgency: 30,
          progress: 0,
          subgoals: [
            { description: 'Visit 5 unexplored regions', completed: false, optional: false, progress: 0 },
            { description: 'Discover points of interest', completed: false, optional: true, progress: 0 },
            { description: 'Return safely with data', completed: false, optional: false, progress: 0 }
          ],
          currentSubgoal: 0,
          prerequisites: [],
          motivation: {
            type: 'INTRINSIC',
            reason: 'Curiosity and love of discovery',
            emotionalDrive: ship.personality.curiosity * 10
          },
          expectedReward: {
            credits: 50000,
            satisfaction: 9,
            reputation: new Map([['explorers_guild', 20]])
          },
          status: 'ACTIVE',
          attempts: 0,
          failures: 0,
          createdAt: now,
          createdBy: 'SELF',
          tags: ['exploration', 'discovery', 'career']
        };
        break;

      case 'PIRATE':
        primaryGoal = {
          id: `goal_${ship.id}_plunder`,
          type: 'ACCUMULATE_WEALTH',
          category: 'ECONOMIC',
          name: 'Plunder and Profit',
          description: 'Acquire wealth through raiding and piracy',
          priority: 90,
          urgency: 60,
          progress: 0,
          subgoals: [
            { description: 'Find vulnerable targets', completed: false, optional: false, progress: 0 },
            { description: 'Successfully raid 5 ships', completed: false, optional: false, progress: 0 },
            { description: 'Avoid capture', completed: false, optional: false, progress: 0 }
          ],
          currentSubgoal: 0,
          prerequisites: [],
          motivation: {
            type: 'EXTRINSIC',
            reason: 'Need for resources and thrills',
            emotionalDrive: (ship.personality.aggression + ship.personality.greed) * 5
          },
          expectedReward: {
            credits: 75000,
            satisfaction: 7
          },
          status: 'ACTIVE',
          attempts: 0,
          failures: 0,
          createdAt: now,
          createdBy: 'SELF',
          tags: ['piracy', 'wealth', 'combat']
        };
        break;

      case 'PATROL':
        primaryGoal = {
          id: `goal_${ship.id}_protect`,
          type: 'RISE_IN_FACTION',
          category: 'CAREER',
          name: 'Protect Territory',
          description: 'Maintain security in assigned patrol zone',
          priority: 75,
          urgency: 50,
          progress: 0,
          subgoals: [
            { description: 'Patrol assigned routes', completed: false, optional: false, progress: 0 },
            { description: 'Respond to threats', completed: false, optional: false, progress: 0 },
            { description: 'Earn commendations', completed: false, optional: true, progress: 0 }
          ],
          currentSubgoal: 0,
          prerequisites: [],
          motivation: {
            type: 'EXTRINSIC',
            reason: 'Duty and loyalty to faction',
            emotionalDrive: ship.personality.loyalty * 10
          },
          expectedReward: {
            credits: 30000,
            satisfaction: 6,
            reputation: new Map([[ship.faction, 15]])
          },
          status: 'ACTIVE',
          attempts: 0,
          failures: 0,
          createdAt: now,
          createdBy: 'FACTION',
          tags: ['patrol', 'duty', 'security']
        };
        break;

      default:
        // Generic survival goal for other types
        primaryGoal = {
          id: `goal_${ship.id}_survive`,
          type: 'ACHIEVE_FINANCIAL_SECURITY',
          category: 'SURVIVAL',
          name: 'Survive and Thrive',
          description: 'Maintain ship operations and build financial security',
          priority: 70,
          urgency: 50,
          progress: 0,
          subgoals: [
            { description: 'Maintain fuel and supplies', completed: false, optional: false, progress: 0 },
            { description: 'Build emergency fund', completed: false, optional: false, progress: 0 }
          ],
          currentSubgoal: 0,
          prerequisites: [],
          motivation: {
            type: 'COMPULSION',
            reason: 'Need for security and stability',
            emotionalDrive: ship.personality.caution * 10
          },
          expectedReward: {
            credits: 50000,
            satisfaction: 5
          },
          status: 'ACTIVE',
          attempts: 0,
          failures: 0,
          createdAt: now,
          createdBy: 'SELF',
          tags: ['survival', 'financial']
        };
    }

    if (primaryGoal) {
      ship.goalSystem.addGoal(primaryGoal);
    }
  }
}
