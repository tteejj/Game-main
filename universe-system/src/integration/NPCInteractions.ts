/**
 * NPC-to-NPC Interactions
 *
 * Ships don't just navigate - they interact with each other:
 * - Combat (pirates attack traders, patrol ships defend)
 * - Trading (ships exchange cargo)
 * - Communication (distress calls, warnings, greetings)
 * - Alliances (temporary partnerships)
 * - Rivalries (grudges and revenge)
 *
 * This makes the universe feel ALIVE!
 */

import { Vector3 } from '../CelestialBody';
import { HistoricalEvent } from '../simulation/HistoricalMemorySystem';
import { ShipReputationSystem } from './ShipReputationSystem';
import { DiplomaticStatus } from '../faction-dynamics/FactionDiplomacyEngine';

export enum InteractionType {
  COMBAT = 'COMBAT',
  TRADE = 'TRADE',
  COMMUNICATION = 'COMMUNICATION',
  ALLIANCE = 'ALLIANCE',
  DISTRESS = 'DISTRESS',
  WARNING = 'WARNING',
  THREAT = 'THREAT'
}

export interface Interaction {
  id: string;
  type: InteractionType;
  initiator: string; // ship ID
  target: string; // ship ID
  timestamp: number;
  location: Vector3;
  outcome?: 'SUCCESS' | 'FAILURE' | 'ONGOING';
  data: any;
}

export interface CombatEncounter {
  id: string;
  attacker: string;
  defender: string;
  startTime: number;
  endTime?: number;
  location: Vector3;

  // Combat stats
  damageDealt: number;
  damageReceived: number;
  attackerWins: boolean;

  // Tactics
  attackerTactic: CombatTactic;
  defenderTactic: CombatTactic;

  // Loot/consequences
  cargoStolen?: number;
  creditsStolen?: number;
  factionsInvolved: string[];
}

export enum CombatTactic {
  AGGRESSIVE = 'AGGRESSIVE',     // All-out attack
  DEFENSIVE = 'DEFENSIVE',       // Minimize damage
  HIT_AND_RUN = 'HIT_AND_RUN',  // Quick strikes
  EVASIVE = 'EVASIVE',           // Dodge and flee
  BOARDING = 'BOARDING'          // Attempt to board
}

export interface TradeOffer {
  id: string;
  seller: string;
  buyer: string;
  commodity: string;
  amount: number;
  pricePerUnit: number;
  timestamp: number;
  location: Vector3;
  accepted: boolean;
}

export interface Alliance {
  id: string;
  ships: string[];
  formed: number;
  expires?: number;
  purpose: 'DEFENSE' | 'TRADE' | 'EXPLORATION' | 'RAID';
  active: boolean;
}

export interface Rivalry {
  id: string;
  shipA: string;
  shipB: string;
  reason: string;
  intensity: number; // 0-1
  since: number;
  lastEncounter?: number;
}

/**
 * Manages all NPC-to-NPC interactions
 */
export class NPCInteractionManager {
  private interactions: Map<string, Interaction> = new Map();
  private combatEncounters: Map<string, CombatEncounter> = new Map();
  private tradeOffers: Map<string, TradeOffer> = new Map();
  private alliances: Map<string, Alliance> = new Map();
  private rivalries: Map<string, Rivalry> = new Map();
  private distressCalls: Map<string, { shipId: string; location: Vector3; timestamp: number }> = new Map();

  // Reputation system
  public reputationSystem: ShipReputationSystem = new ShipReputationSystem();

  // Faction relations (set externally by orchestrator)
  private factionRelations: Map<string, Map<string, DiplomaticStatus>> = new Map();

  // Proximity thresholds
  private readonly COMBAT_RANGE = 5000; // 5km
  private readonly TRADE_RANGE = 10000; // 10km
  private readonly COMM_RANGE = 50000; // 50km

  /**
   * Update interactions - check for proximity-based interactions
   */
  public update(deltaTime: number, ships: any[]): Interaction[] {
    const newInteractions: Interaction[] = [];

    // Check all ship pairs for potential interactions
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        const shipA = ships[i];
        const shipB = ships[j];

        const distance = this.getDistance(shipA.ship.position, shipB.ship.position);

        // Combat range
        if (distance < this.COMBAT_RANGE) {
          const combat = this.checkCombatInteraction(shipA, shipB, distance);
          if (combat) {
            newInteractions.push(combat);
          }
        }

        // Trade range
        if (distance < this.TRADE_RANGE) {
          const trade = this.checkTradeInteraction(shipA, shipB, distance);
          if (trade) {
            newInteractions.push(trade);
          }
        }

        // Communication range
        if (distance < this.COMM_RANGE) {
          const comm = this.checkCommunicationInteraction(shipA, shipB, distance);
          if (comm) {
            newInteractions.push(comm);
          }
        }
      }
    }

    // Update ongoing combat
    this.updateCombat(deltaTime, ships);

    // Update alliances
    this.updateAlliances(deltaTime);

    return newInteractions;
  }

  /**
   * Check if combat should occur
   */
  private checkCombatInteraction(shipA: any, shipB: any): Interaction | null {
    // Check faction relations - allies/neutral don't attack
    const factionStatus = this.getFactionRelation(shipA, shipB);
    if (factionStatus === 'ALLIED' || factionStatus === 'FRIENDLY') {
      return null; // Don't attack allies
    }

    // Check reputation - don't attack friends
    const reputation = this.reputationSystem.getReputation(shipA.ship.id, shipB.ship.id);
    if (reputation >= 50) {
      return null; // Too friendly to attack
    }

    const aIsHostile = this.isHostileShipType(shipA.ship.type);
    const bIsHostile = this.isHostileShipType(shipB.ship.type);

    // Evaluate combat odds before attacking
    const aCanWin = this.evaluateCombatOdds(shipA, shipB) > 0.6;
    const bCanWin = this.evaluateCombatOdds(shipB, shipA) > 0.6;

    // Hostile reputation makes combat more likely
    const isHostileRep = reputation <= -30;

    // Pirate attacks non-pirate (if odds are good)
    if (aIsHostile && !bIsHostile && aCanWin && Math.random() < 0.1) {
      this.reputationSystem.recordInteraction(shipB.ship.id, shipA.ship.id, 'ATTACKED', 'Unprovoked pirate attack');
      return this.initiateCombat(shipA, shipB);
    }
    if (bIsHostile && !aIsHostile && bCanWin && Math.random() < 0.1) {
      this.reputationSystem.recordInteraction(shipA.ship.id, shipB.ship.id, 'ATTACKED', 'Unprovoked pirate attack');
      return this.initiateCombat(shipB, shipA);
    }

    // Patrol ship attacks pirate (regardless of odds - duty)
    if (this.isPatrolShip(shipA.ship.type) && bIsHostile && Math.random() < 0.2) {
      this.reputationSystem.recordInteraction(shipB.ship.id, shipA.ship.id, 'ATTACKED', 'Law enforcement action');
      return this.initiateCombat(shipA, shipB);
    }
    if (this.isPatrolShip(shipB.ship.type) && aIsHostile && Math.random() < 0.2) {
      this.reputationSystem.recordInteraction(shipA.ship.id, shipB.ship.id, 'ATTACKED', 'Law enforcement action');
      return this.initiateCombat(shipB, shipA);
    }

    // Hostile faction relations
    if (factionStatus === 'WAR' && Math.random() < 0.15) {
      this.reputationSystem.recordInteraction(shipB.ship.id, shipA.ship.id, 'ATTACKED', 'Faction warfare');
      return this.initiateCombat(shipA, shipB);
    }

    // Check rivalries
    const rivalry = this.getRivalry(shipA.ship.id, shipB.ship.id);
    if (rivalry && rivalry.intensity > 0.7 && Math.random() < 0.15) {
      this.reputationSystem.recordInteraction(shipB.ship.id, shipA.ship.id, 'ATTACKED', 'Personal rivalry');
      return this.initiateCombat(shipA, shipB);
    }

    // Hostile reputation + good odds = possible attack
    if (isHostileRep && aCanWin && Math.random() < 0.05) {
      this.reputationSystem.recordInteraction(shipB.ship.id, shipA.ship.id, 'ATTACKED', 'Revenge attack');
      return this.initiateCombat(shipA, shipB);
    }

    return null;
  }

  /**
   * Initiate combat between two ships
   */
  private initiateCombat(attacker: any, defender: any): Interaction {
    const encounterId = `combat_${Date.now()}_${Math.random()}`;

    // Determine tactics based on personality
    const attackerTactic = this.chooseCombatTactic(attacker);
    const defenderTactic = this.chooseCombatTactic(defender);

    const encounter: CombatEncounter = {
      id: encounterId,
      attacker: attacker.ship.id,
      defender: defender.ship.id,
      startTime: Date.now() / 1000,
      location: attacker.ship.position,
      damageDealt: 0,
      damageReceived: 0,
      attackerWins: false,
      attackerTactic,
      defenderTactic,
      factionsInvolved: [attacker.memory?.entityId || '', defender.memory?.entityId || ''].filter(Boolean)
    };

    this.combatEncounters.set(encounterId, encounter);

    // Set ships to combat status
    attacker.ship.status = 'ATTACKING';
    defender.ship.status = 'FLEEING'; // Default to fleeing unless aggressive

    // Create interaction record
    const interaction: Interaction = {
      id: encounterId,
      type: InteractionType.COMBAT,
      initiator: attacker.ship.id,
      target: defender.ship.id,
      timestamp: Date.now() / 1000,
      location: attacker.ship.position,
      outcome: 'ONGOING',
      data: encounter
    };

    this.interactions.set(encounterId, interaction);

    return interaction;
  }

  /**
   * Choose combat tactic based on personality
   */
  private chooseCombatTactic(ship: any): CombatTactic {
    const personality = ship.memory?.getCurrentPersonality();

    if (!personality) return CombatTactic.DEFENSIVE;

    if (personality.aggression > 0.8) {
      return CombatTactic.AGGRESSIVE;
    } else if (personality.caution > 0.7) {
      return CombatTactic.DEFENSIVE;
    } else if (personality.greed > 0.8) {
      return CombatTactic.BOARDING;
    } else if (ship.ship.health < 0.5) {
      return CombatTactic.EVASIVE;
    } else {
      return CombatTactic.HIT_AND_RUN;
    }
  }

  /**
   * Update ongoing combat encounters
   */
  private updateCombat(deltaTime: number, ships: any[]): void {
    const shipsMap = new Map(ships.map(s => [s.ship.id, s]));

    for (const [id, encounter] of this.combatEncounters) {
      if (encounter.endTime) continue; // Already ended

      const attacker = shipsMap.get(encounter.attacker);
      const defender = shipsMap.get(encounter.defender);

      if (!attacker || !defender) {
        this.endCombat(id, false);
        continue;
      }

      // Check distance
      const distance = this.getDistance(attacker.ship.position, defender.ship.position);

      if (distance > this.COMBAT_RANGE * 3) {
        // Too far apart - combat ends
        this.endCombat(id, false);
        continue;
      }

      // Simulate combat
      const combatResult = this.simulateCombatRound(attacker, defender, encounter, deltaTime);

      encounter.damageDealt += combatResult.attackerDamage;
      encounter.damageReceived += combatResult.defenderDamage;

      // Apply damage
      attacker.ship.takeDamage(combatResult.defenderDamage);
      defender.ship.takeDamage(combatResult.attackerDamage);

      // Check for victory
      if (defender.ship.health <= 0) {
        encounter.attackerWins = true;
        this.endCombat(id, true);

        // Loot cargo
        if (encounter.attackerTactic === CombatTactic.BOARDING || encounter.attackerTactic === CombatTactic.AGGRESSIVE) {
          encounter.cargoStolen = defender.ship.getCargoMass() * 0.5; // Steal 50% cargo
          encounter.creditsStolen = Math.floor(Math.random() * 10000);
        }
      } else if (attacker.ship.health <= 0) {
        encounter.attackerWins = false;
        this.endCombat(id, true);
      }

      // Check for escape
      if (defender.ship.status === 'FLEEING' && distance > this.COMBAT_RANGE * 2) {
        this.endCombat(id, false);
      }
    }
  }

  /**
   * Simulate one combat round
   */
  private simulateCombatRound(attacker: any, defender: any, encounter: CombatEncounter, deltaTime: number): {
    attackerDamage: number;
    defenderDamage: number;
  } {
    let attackerDamage = 0;
    let defenderDamage = 0;

    // Base damage based on ship type
    const attackerBaseDamage = this.getBaseDamage(attacker.ship.type);
    const defenderBaseDamage = this.getBaseDamage(defender.ship.type);

    // Tactic modifiers
    const attackerMod = this.getTacticModifier(encounter.attackerTactic, 'offense');
    const defenderMod = this.getTacticModifier(encounter.defenderTactic, 'defense');

    // Calculate damage
    attackerDamage = attackerBaseDamage * attackerMod * deltaTime;
    defenderDamage = defenderBaseDamage * defenderMod * deltaTime * 0.5; // Defender does half damage

    // Random variance
    attackerDamage *= (0.8 + Math.random() * 0.4);
    defenderDamage *= (0.8 + Math.random() * 0.4);

    return { attackerDamage, defenderDamage };
  }

  /**
   * Get base damage for ship type
   */
  private getBaseDamage(shipType: string): number {
    switch (shipType) {
      case 'PATROL_SHIP': return 0.15;
      case 'PIRATE': return 0.12;
      case 'CARGO_FREIGHTER': return 0.02;
      case 'MINING_VESSEL': return 0.03;
      case 'RESEARCH': return 0.01;
      default: return 0.05;
    }
  }

  /**
   * Get tactic modifier
   */
  private getTacticModifier(tactic: CombatTactic, type: 'offense' | 'defense'): number {
    if (type === 'offense') {
      switch (tactic) {
        case CombatTactic.AGGRESSIVE: return 1.5;
        case CombatTactic.HIT_AND_RUN: return 1.2;
        case CombatTactic.BOARDING: return 1.3;
        case CombatTactic.DEFENSIVE: return 0.7;
        case CombatTactic.EVASIVE: return 0.5;
      }
    } else {
      switch (tactic) {
        case CombatTactic.DEFENSIVE: return 0.5;
        case CombatTactic.EVASIVE: return 0.3;
        case CombatTactic.HIT_AND_RUN: return 0.8;
        case CombatTactic.AGGRESSIVE: return 1.5;
        case CombatTactic.BOARDING: return 1.2;
      }
    }
  }

  /**
   * End combat encounter
   */
  private endCombat(encounterId: string, decisiveVictory: boolean): void {
    const encounter = this.combatEncounters.get(encounterId);
    if (!encounter) return;

    encounter.endTime = Date.now() / 1000;

    const interaction = this.interactions.get(encounterId);
    if (interaction) {
      interaction.outcome = decisiveVictory ? 'SUCCESS' : 'FAILURE';
    }

    // Create rivalry if one doesn't exist
    if (decisiveVictory && !encounter.attackerWins) {
      // Defender won - they'll remember this
      this.createRivalry(encounter.defender, encounter.attacker, 'Combat defeat');
    }
  }

  /**
   * Check for trade interactions
   */
  private checkTradeInteraction(shipA: any, shipB: any, distance: number): Interaction | null {
    // Only traders trade with each other
    if (!this.isTradingShip(shipA.ship.type) || !this.isTradingShip(shipB.ship.type)) {
      return null;
    }

    // Random chance to trade
    if (Math.random() > 0.05) return null;

    // Check if they have cargo to trade
    if (shipA.ship.cargo.length === 0 || shipB.ship.cargo.length === 0) {
      return null;
    }

    // Create trade offer
    return this.createTradeOffer(shipA, shipB);
  }

  /**
   * Create trade offer
   */
  private createTradeOffer(seller: any, buyer: any): Interaction {
    const offerId = `trade_${Date.now()}_${Math.random()}`;

    const sellerCargo = seller.ship.cargo[0]; // Simplified: trade first cargo item
    const amount = Math.min(sellerCargo.amount, 10); // Trade up to 10 units
    const pricePerUnit = sellerCargo.value * (1 + Math.random() * 0.2); // 0-20% markup

    const offer: TradeOffer = {
      id: offerId,
      seller: seller.ship.id,
      buyer: buyer.ship.id,
      commodity: sellerCargo.type,
      amount,
      pricePerUnit,
      timestamp: Date.now() / 1000,
      location: seller.ship.position,
      accepted: Math.random() > 0.3 // 70% chance to accept
    };

    this.tradeOffers.set(offerId, offer);

    // Execute trade if accepted
    if (offer.accepted) {
      seller.ship.removeCargo(sellerCargo.type, amount);
      buyer.ship.addCargo({
        type: sellerCargo.type,
        amount,
        value: pricePerUnit
      });
    }

    return {
      id: offerId,
      type: InteractionType.TRADE,
      initiator: seller.ship.id,
      target: buyer.ship.id,
      timestamp: Date.now() / 1000,
      location: seller.ship.position,
      outcome: offer.accepted ? 'SUCCESS' : 'FAILURE',
      data: offer
    };
  }

  /**
   * Check for communication interactions
   */
  private checkCommunicationInteraction(shipA: any, shipB: any, distance: number): Interaction | null {
    // Distress calls
    if (shipA.ship.health < 0.3 && Math.random() < 0.1) {
      return this.createDistressCall(shipA, shipB);
    }
    if (shipB.ship.health < 0.3 && Math.random() < 0.1) {
      return this.createDistressCall(shipB, shipA);
    }

    // Warnings about hazards
    // (Would check context provider for nearby hazards)

    return null;
  }

  /**
   * Create distress call
   */
  private createDistressCall(distressed: any, nearby: any): Interaction {
    const interactionId = `distress_${Date.now()}_${Math.random()}`;

    return {
      id: interactionId,
      type: InteractionType.DISTRESS,
      initiator: distressed.ship.id,
      target: nearby.ship.id,
      timestamp: Date.now() / 1000,
      location: distressed.ship.position,
      outcome: 'ONGOING',
      data: {
        health: distressed.ship.health,
        fuel: distressed.ship.fuel,
        message: `Mayday! ${distressed.ship.name} requesting assistance!`
      }
    };
  }

  /**
   * Update alliances
   */
  private updateAlliances(deltaTime: number): void {
    const now = Date.now() / 1000;

    for (const [id, alliance] of this.alliances) {
      if (alliance.expires && now > alliance.expires) {
        alliance.active = false;
      }
    }
  }

  /**
   * Create rivalry
   */
  private createRivalry(shipA: string, shipB: string, reason: string): void {
    const rivalryId = `${shipA}_${shipB}`;

    this.rivalries.set(rivalryId, {
      id: rivalryId,
      shipA,
      shipB,
      reason,
      intensity: 0.5 + Math.random() * 0.5,
      since: Date.now() / 1000
    });
  }

  /**
   * Get rivalry between two ships
   */
  private getRivalry(shipA: string, shipB: string): Rivalry | undefined {
    return this.rivalries.get(`${shipA}_${shipB}`) || this.rivalries.get(`${shipB}_${shipA}`);
  }

  /**
   * Utility: Get distance between two positions
   */
  private getDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  /**
   * Utility: Check if ship type is hostile
   */
  private isHostileShipType(type: string): boolean {
    return type === 'PIRATE';
  }

  /**
   * Utility: Check if ship is patrol
   */
  private isPatrolShip(type: string): boolean {
    return type === 'PATROL_SHIP';
  }

  /**
   * Utility: Check if ship does trading
   */
  private isTradingShip(type: string): boolean {
    return type === 'CARGO_FREIGHTER' || type === 'CARGO_SHUTTLE';
  }

  /**
   * Get all active combat encounters
   */
  public getActiveCombat(): CombatEncounter[] {
    return Array.from(this.combatEncounters.values()).filter(c => !c.endTime);
  }

  /**
   * Get all recent interactions
   */
  public getRecentInteractions(count: number = 20): Interaction[] {
    return Array.from(this.interactions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Get statistics
   */
  public getStats() {
    return {
      totalInteractions: this.interactions.size,
      activeCombat: this.getActiveCombat().length,
      totalCombat: this.combatEncounters.size,
      activeTrades: Array.from(this.tradeOffers.values()).filter(t => t.accepted).length,
      activeAlliances: Array.from(this.alliances.values()).filter(a => a.active).length,
      activeRivalries: this.rivalries.size
    };
  }

  /**
   * Set faction relations (called by orchestrator)
   */
  public setFactionRelations(relations: Map<string, Map<string, DiplomaticStatus>>): void {
    this.factionRelations = relations;
  }

  /**
   * Get faction relation between two ships
   */
  private getFactionRelation(shipA: any, shipB: any): DiplomaticStatus | null {
    const factionA = shipA.memory?.entityId || shipA.factionId;
    const factionB = shipB.memory?.entityId || shipB.factionId;

    if (!factionA || !factionB) return null;

    const aRelations = this.factionRelations.get(factionA);
    if (!aRelations) return null;

    return aRelations.get(factionB) || null;
  }

  /**
   * Evaluate combat odds - returns 0-1 probability of winning
   */
  private evaluateCombatOdds(attacker: any, defender: any): number {
    let attackerScore = 0;
    let defenderScore = 0;

    // Health advantage
    attackerScore += attacker.ship.health * 40;
    defenderScore += defender.ship.health * 40;

    // Ship type advantages
    const attackerType = attacker.ship.type;
    const defenderType = defender.ship.type;

    if (attackerType === 'PATROL_SHIP' || attackerType === 'PIRATE') {
      attackerScore += 30; // Combat ships
    }
    if (defenderType === 'PATROL_SHIP' || defenderType === 'PIRATE') {
      defenderScore += 30;
    }

    // Cargo ships are weak
    if (defenderType === 'CARGO_FREIGHTER' || defenderType === 'CARGO_SHUTTLE') {
      attackerScore += 20;
    }
    if (attackerType === 'CARGO_FREIGHTER' || attackerType === 'CARGO_SHUTTLE') {
      defenderScore += 20;
    }

    // Personality factors
    const attackerPersonality = attacker.memory?.getCurrentPersonality();
    const defenderPersonality = defender.memory?.getCurrentPersonality();

    if (attackerPersonality) {
      attackerScore += attackerPersonality.aggression * 15;
      attackerScore += attackerPersonality.courage * 10;
    }

    if (defenderPersonality) {
      defenderScore += defenderPersonality.aggression * 15;
      defenderScore += defenderPersonality.courage * 10;
    }

    // Calculate win probability
    const totalScore = attackerScore + defenderScore;
    return totalScore > 0 ? attackerScore / totalScore : 0.5;
  }

  /**
   * Handle distress call responses
   */
  public checkDistressResponse(ships: any[]): Interaction[] {
    const responses: Interaction[] = [];
    const now = Date.now() / 1000;

    // Find ships in distress
    for (const ship of ships) {
      if (ship.ship.needsAssistance && ship.ship.needsAssistance()) {
        // Record distress call
        if (!this.distressCalls.has(ship.ship.id)) {
          this.distressCalls.set(ship.ship.id, {
            shipId: ship.ship.id,
            location: ship.ship.position,
            timestamp: now
          });
        }

        // Find nearby ships that can help
        for (const responder of ships) {
          if (responder.ship.id === ship.ship.id) continue;

          const distance = this.getDistance(ship.ship.position, responder.ship.position);

          if (distance < this.COMM_RANGE) {
            // Check if willing to help
            const reputation = this.reputationSystem.getReputation(responder.ship.id, ship.ship.id);
            const personality = responder.memory?.getCurrentPersonality();

            const helpProbability =
              (reputation > 0 ? 0.3 : 0.1) + // Reputation bonus
              (personality?.altruism || 0) * 0.4 + // Altruistic ships more likely to help
              (responder.ship.type === 'PATROL_SHIP' ? 0.4 : 0); // Patrol ships have duty to help

            if (Math.random() < helpProbability * 0.1) {
              // Record rescue
              this.reputationSystem.recordInteraction(ship.ship.id, responder.ship.id, 'RESCUED', 'Responded to distress call');
              this.reputationSystem.recordInteraction(responder.ship.id, ship.ship.id, 'HELPED', 'Rescued ship in distress');

              responses.push({
                id: `rescue_${Date.now()}_${Math.random()}`,
                type: InteractionType.DISTRESS,
                initiator: responder.ship.id,
                target: ship.ship.id,
                timestamp: now,
                location: ship.ship.position,
                outcome: 'SUCCESS',
                data: {
                  rescuer: responder.ship.id,
                  rescued: ship.ship.id,
                  assistanceProvided: 'fuel, repairs'
                }
              });

              // Actually help the ship
              if (ship.ship.health < 0.5) {
                ship.ship.repair(0.3); // Provide emergency repairs
              }
              if (ship.ship.fuel < 0.3) {
                ship.ship.refuel(0.5); // Provide fuel
              }
            } else {
              // Ignored distress call - negative reputation
              if (Math.random() < 0.05) {
                this.reputationSystem.recordInteraction(ship.ship.id, responder.ship.id, 'IGNORED_DISTRESS', 'Failed to respond to distress call');
              }
            }
          }
        }
      }
    }

    return responses;
  }
}
