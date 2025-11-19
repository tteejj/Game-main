/**
 * FactionDiplomacyEngine - Dynamic diplomatic relationships
 *
 * Makes factions feel alive with:
 * - Evolving diplomatic relationships
 * - Dynamic wars, treaties, and alliances
 * - Diplomatic events and negotiations
 * - Faction memory and grudges
 * - Economic and military factors influencing diplomacy
 */

import { HistoricalEvent } from '../simulation/HistoricalMemorySystem';

export interface FactionRelationship {
  factionA: string;
  factionB: string;

  // Current diplomatic status
  status: DiplomaticStatus;
  relationshipValue: number;      // -100 to +100
  opinion: number;                // -100 to +100 (how they view each other)

  // Trends and momentum
  recentInteractions: DiplomaticInteraction[];
  trend: RelationshipTrend;
  trendStrength: number;          // 0-1 (how fast changing)
  momentum: number;               // Trend continuation tendency
  inertia: number;                // Resistance to change (0-1)
  history: RelationshipChange[];  // Track opinion changes

  // Diplomatic capital
  diplomaticCapital: number;      // Influence points (0-100)

  // Treaties and agreements
  treaties: Treaty[];
  tradeAgreements: TradeAgreement[];

  // Alliance structure
  sharedAllies: string[];
  sharedEnemies: string[];
  commonInterests: string[];

  // Historical context
  relationshipHistory: RelationshipEvent[];
  pastWars: WarRecord[];
  pastAlliances: AllianceRecord[];

  // Probability calculations
  warProbability: number;         // 0-1
  allianceProbability: number;    // 0-1

  // Factors
  economicInterdependence: number;  // 0-1
  militaryBalance: number;          // -1 to +1 (negative = A weaker)
  culturalCompatibility: number;    // 0-1
  territorialDisputes: number;      // 0-10 (number of disputed systems)
}

export interface RelationshipChange {
  timestamp: number;
  delta: number;                  // Change amount
  reason: string;
}

export type DiplomaticStatus =
  | 'WAR'              // Active conflict
  | 'HOSTILE'          // Tensions high, war imminent
  | 'COLD_WAR'         // Competitive but not fighting
  | 'TENSE'            // Strained relations
  | 'NEUTRAL'          // No strong feelings
  | 'CORDIAL'          // Positive interactions
  | 'FRIENDLY'         // Good relations
  | 'ALLIED'           // Formal alliance
  | 'INTEGRATED';      // Essentially merged

export type RelationshipTrend =
  | 'RAPIDLY_IMPROVING'
  | 'IMPROVING'
  | 'STABLE'
  | 'DETERIORATING'
  | 'RAPIDLY_DETERIORATING';

export interface DiplomaticInteraction {
  timestamp: number;
  type: InteractionType;
  factionA: string;               // Primary faction involved
  factionB: string;               // Secondary faction involved
  impact: number;                 // -10 to +10
  description: string;
  witnesses: string[];            // Other factions that know
  eventContext?: any;             // Reference to original event
}

export type InteractionType =
  | 'TRADE_AGREEMENT' | 'TRADE_DISPUTE' | 'TRADE_EMBARGO'
  | 'MILITARY_COOPERATION' | 'MILITARY_INCIDENT' | 'MILITARY_AID'
  | 'DIPLOMATIC_INSULT' | 'DIPLOMATIC_PRAISE' | 'DIPLOMATIC_SUMMIT'
  | 'TERRITORIAL_GIFT' | 'TERRITORIAL_SEIZURE' | 'TERRITORIAL_DISPUTE'
  | 'CULTURAL_EXCHANGE' | 'ESPIONAGE_DISCOVERED' | 'ASSASSINATION'
  | 'RESCUE_OPERATION' | 'REFUGEE_CRISIS' | 'HUMANITARIAN_AID';

export interface Treaty {
  id: string;
  name: string;
  type: TreatyType;

  // Parties
  signatories: string[];

  // Terms
  terms: string[];
  duration: number;               // Seconds (0 = permanent)
  expiresAt?: number;

  // Enforcement
  violations: TreatyViolation[];
  strength: number;               // 0-1 (how likely to be honored)

  // Status
  active: boolean;
  signedAt: number;
  brokenBy?: string;
  brokenAt?: number;
}

export type TreatyType =
  | 'NON_AGGRESSION_PACT'
  | 'MUTUAL_DEFENSE'
  | 'FREE_TRADE'
  | 'MILITARY_ACCESS'
  | 'TECHNOLOGY_SHARING'
  | 'BORDER_AGREEMENT'
  | 'CEASEFIRE'
  | 'PEACE_TREATY'
  | 'ALLIANCE';

export interface TreatyViolation {
  violator: string;
  term: string;
  timestamp: number;
  severity: number;               // 1-10
}

export interface TradeAgreement {
  id: string;
  parties: string[];

  // Terms
  commodities: string[];
  tariffReduction: number;        // 0-1 (% reduction)
  tradeVolume: number;            // Expected credits/year
  quotas: Map<string, number>;    // commodity -> max amount

  // Duration
  signedAt: number;
  duration: number;

  // Performance
  actualTradeVolume: number;
  compliance: number;             // 0-1
}

export interface RelationshipEvent {
  timestamp: number;
  type: 'WAR_STARTED' | 'WAR_ENDED' | 'TREATY_SIGNED' | 'TREATY_BROKEN'
       | 'ALLIANCE_FORMED' | 'ALLIANCE_DISSOLVED' | 'MAJOR_INCIDENT';
  description: string;
  impact: number;                 // -100 to +100
  relatedEvent?: HistoricalEvent;
}

export interface WarRecord {
  id: string;
  name: string;

  // Combatants
  sides: WarSide[];

  // Timeline
  startedAt: number;
  endedAt?: number;
  duration?: number;

  // Progress
  battles: Battle[];
  currentPhase: WarPhase;
  stalemate: boolean;

  // Casualties and costs
  totalCasualties: number;
  totalCostCredits: number;

  // Outcome
  victor?: string;
  outcome?: WarOutcome;
  peaceTreaty?: Treaty;

  // Causes
  casusBelli: string[];           // Reasons for war
  underlyingCauses: string[];
}

export interface WarSide {
  name: string;
  leader: string;                 // Faction ID
  members: string[];              // All faction IDs

  // Military
  militaryStrength: number;
  warExhaustion: number;          // 0-100

  // Objectives
  warGoals: string[];
  achievedGoals: string[];

  // Territory
  territoriesControlled: string[];
  territoriesLost: string[];
}

export interface Battle {
  timestamp: number;
  location: string;               // System ID
  attacker: string;               // Faction ID
  defender: string;

  // Forces
  attackerStrength: number;
  defenderStrength: number;

  // Outcome
  victor: string;
  casualties: Map<string, number>;  // faction -> casualties

  // Impact
  territoryChanged: boolean;
  strategicImportance: number;    // 0-10
}

export type WarPhase =
  | 'INITIAL_OFFENSIVE'
  | 'ESCALATION'
  | 'STALEMATE'
  | 'DECISIVE_BATTLE'
  | 'PEACE_NEGOTIATIONS'
  | 'FINAL_OFFENSIVE';

export type WarOutcome =
  | 'DECISIVE_VICTORY'
  | 'PYRRHIC_VICTORY'
  | 'STALEMATE_PEACE'
  | 'SURRENDER'
  | 'NEGOTIATED_SETTLEMENT'
  | 'COLLAPSE'                    // One side collapsed internally
  | 'INTERVENTION';               // Third party ended it

export interface AllianceRecord {
  id: string;
  name: string;

  // Members
  members: string[];
  leader: string;

  // Timeline
  formedAt: number;
  dissolvedAt?: number;
  duration?: number;

  // Purpose
  purpose: string;
  sharedGoals: string[];

  // Performance
  joinActions: number;            // How many times allies helped each other
  effectiveAgainstThreats: number; // 0-1

  // Dissolution
  dissolved: boolean;
  dissolutionReason?: string;
}

export class FactionDiplomacyEngine {
  private relationships: Map<string, FactionRelationship> = new Map();
  private activeTreaties: Map<string, Treaty> = new Map();
  private activeWars: Map<string, WarRecord> = new Map();
  private activeAlliances: Map<string, AllianceRecord> = new Map();

  // History
  private diplomaticHistory: RelationshipEvent[] = [];
  private completedWars: WarRecord[] = [];

  // Configuration
  private readonly INTERACTION_DECAY_RATE = 0.01;        // How fast old interactions fade
  private readonly RELATIONSHIP_MOMENTUM = 0.9;          // How much inertia relationships have
  private readonly WAR_THRESHOLD = -60;                  // Relationship value for war
  private readonly ALLIANCE_THRESHOLD = 70;              // Relationship value for alliance

  constructor() {
    // Initialize
  }

  /**
   * Get or create relationship between two factions
   */
  public getRelationship(factionA: string, factionB: string): FactionRelationship {
    const key = this.getRelationshipKey(factionA, factionB);

    if (!this.relationships.has(key)) {
      this.createRelationship(factionA, factionB);
    }

    return this.relationships.get(key)!;
  }

  /**
   * Process diplomatic event
   */
  public processEvent(event: HistoricalEvent): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    // Determine which factions are involved
    const factionsInvolved = this.extractFactions(event);

    // Process based on event type
    switch (event.type) {
      case 'PIRATE_RAID':
        interactions.push(...this.processPirateRaid(event, factionsInvolved));
        break;

      case 'STATION_DESTROYED':
        interactions.push(...this.processStationDestroyed(event, factionsInvolved));
        break;

      case 'TRADE_COMPLETED':
        interactions.push(...this.processTradeCompleted(event, factionsInvolved));
        break;

      case 'DOCKING_COMPLETED':
        interactions.push(...this.processDockingCompleted(event, factionsInvolved));
        break;

      case 'RESCUE':
        interactions.push(...this.processRescue(event, factionsInvolved));
        break;

      case 'COMBAT_STARTED':
      case 'COMBAT_ENDED':
        interactions.push(...this.processCombatEvent(event, factionsInvolved));
        break;

      default:
        // Generic event processing
        interactions.push(...this.processGenericEvent(event, factionsInvolved));
    }

    // Apply all interactions
    for (const interaction of interactions) {
      this.applyInteraction(interaction);
    }

    return interactions;
  }

  /**
   * Update all relationships (periodic update)
   */
  public update(deltaTime: number): void {
    for (const relationship of this.relationships.values()) {
      // Decay old interactions
      this.decayInteractions(relationship, deltaTime);

      // Recalculate relationship value
      this.recalculateRelationship(relationship);

      // Update trend
      this.updateTrend(relationship);

      // Check for status changes
      this.checkStatusChange(relationship);

      // Calculate war/alliance probability
      this.calculateProbabilities(relationship);

      // Check for automatic events
      this.checkAutomaticDiplomaticEvents(relationship);
    }

    // Update active wars
    for (const war of this.activeWars.values()) {
      this.updateWar(war, deltaTime);
    }

    // Update treaties
    for (const treaty of this.activeTreaties.values()) {
      this.updateTreaty(treaty, deltaTime);
    }
  }

  /**
   * Declare war between factions
   */
  public declareWar(
    factionA: string,
    factionB: string,
    casusBelli: string[],
    relatedEvent?: HistoricalEvent
  ): WarRecord {
    const relationship = this.getRelationship(factionA, factionB);

    // Create war record
    const war: WarRecord = {
      id: `war_${Date.now()}`,
      name: `${factionA} vs ${factionB}`,
      sides: [
        {
          name: `${factionA} Coalition`,
          leader: factionA,
          members: [factionA, ...this.getAllies(factionA)],
          militaryStrength: this.calculateMilitaryStrength(factionA),
          warExhaustion: 0,
          warGoals: [...casusBelli],
          achievedGoals: [],
          territoriesControlled: [],
          territoriesLost: []
        },
        {
          name: `${factionB} Coalition`,
          leader: factionB,
          members: [factionB, ...this.getAllies(factionB)],
          militaryStrength: this.calculateMilitaryStrength(factionB),
          warExhaustion: 0,
          warGoals: ['DEFEND'],
          achievedGoals: [],
          territoriesControlled: [],
          territoriesLost: []
        }
      ],
      startedAt: Date.now() / 1000,
      battles: [],
      currentPhase: 'INITIAL_OFFENSIVE',
      stalemate: false,
      totalCasualties: 0,
      totalCostCredits: 0,
      casusBelli,
      underlyingCauses: this.identifyUnderlyingCauses(relationship)
    };

    this.activeWars.set(war.id, war);

    // Update relationship status
    relationship.status = 'WAR';
    relationship.relationshipValue = -100;

    // Record in history
    relationship.relationshipHistory.push({
      timestamp: Date.now() / 1000,
      type: 'WAR_STARTED',
      description: `War declared: ${casusBelli.join(', ')}`,
      impact: -100,
      relatedEvent
    });

    relationship.pastWars.push(war);

    // Break treaties
    this.breakTreatiesBetween(factionA, factionB, 'WAR_DECLARED');

    return war;
  }

  /**
   * Form alliance between factions
   */
  public formAlliance(
    members: string[],
    name: string,
    purpose: string,
    sharedGoals: string[]
  ): AllianceRecord {
    const alliance: AllianceRecord = {
      id: `alliance_${Date.now()}`,
      name,
      members,
      leader: members[0],  // First member is leader
      formedAt: Date.now() / 1000,
      purpose,
      sharedGoals,
      joinActions: 0,
      effectiveAgainstThreats: 0,
      dissolved: false
    };

    this.activeAlliances.set(alliance.id, alliance);

    // Improve relationships between all members
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const relationship = this.getRelationship(members[i], members[j]);
        relationship.status = 'ALLIED';
        relationship.relationshipValue = Math.max(relationship.relationshipValue, 80);
        relationship.relationshipHistory.push({
          timestamp: Date.now() / 1000,
          type: 'ALLIANCE_FORMED',
          description: `Joined alliance: ${name}`,
          impact: +40
        });
        relationship.pastAlliances.push(alliance);
      }
    }

    return alliance;
  }

  /**
   * Sign treaty between factions
   */
  public signTreaty(
    signatories: string[],
    type: TreatyType,
    terms: string[],
    duration: number = 0
  ): Treaty {
    const treaty: Treaty = {
      id: `treaty_${Date.now()}`,
      name: `${type} - ${signatories.join(' & ')}`,
      type,
      signatories,
      terms,
      duration,
      expiresAt: duration > 0 ? Date.now() / 1000 + duration : undefined,
      violations: [],
      strength: 0.8,  // Initial strength
      active: true,
      signedAt: Date.now() / 1000
    };

    this.activeTreaties.set(treaty.id, treaty);

    // Improve relationships
    for (let i = 0; i < signatories.length; i++) {
      for (let j = i + 1; j < signatories.length; j++) {
        const relationship = this.getRelationship(signatories[i], signatories[j]);
        relationship.treaties.push(treaty);
        relationship.relationshipValue += 20;
        relationship.relationshipHistory.push({
          timestamp: Date.now() / 1000,
          type: 'TREATY_SIGNED',
          description: `Signed treaty: ${type}`,
          impact: +20
        });
      }
    }

    return treaty;
  }

  // ====================================================================
  // PRIVATE METHODS
  // ====================================================================

  private createRelationship(factionA: string, factionB: string): void {
    const key = this.getRelationshipKey(factionA, factionB);

    const relationship: FactionRelationship = {
      factionA,
      factionB,
      status: 'NEUTRAL',
      relationshipValue: 0,
      opinion: 0,
      recentInteractions: [],
      trend: 'STABLE',
      trendStrength: 0,
      momentum: 0,
      inertia: 0,
      history: [],
      diplomaticCapital: 0,
      treaties: [],
      tradeAgreements: [],
      sharedAllies: [],
      sharedEnemies: [],
      commonInterests: [],
      relationshipHistory: [],
      pastWars: [],
      pastAlliances: [],
      warProbability: 0,
      allianceProbability: 0,
      economicInterdependence: 0,
      militaryBalance: 0,
      culturalCompatibility: 0.5,  // Default neutral
      territorialDisputes: 0
    };

    this.relationships.set(key, relationship);
  }

  private getRelationshipKey(factionA: string, factionB: string): string {
    // Ensure consistent key regardless of order
    return [factionA, factionB].sort().join('_');
  }

  private extractFactions(event: HistoricalEvent): string[] {
    // Extract faction IDs from event metadata
    const factions: string[] = [];

    // Check common faction-related fields in event
    if ((event as any).factionId) {
      factions.push((event as any).factionId);
    }

    if ((event as any).attackerFaction) {
      factions.push((event as any).attackerFaction);
    }

    if ((event as any).defenderFaction) {
      factions.push((event as any).defenderFaction);
    }

    if ((event as any).buyerFaction) {
      factions.push((event as any).buyerFaction);
    }

    if ((event as any).sellerFaction) {
      factions.push((event as any).sellerFaction);
    }

    if ((event as any).rescuerFaction) {
      factions.push((event as any).rescuerFaction);
    }

    if ((event as any).victimFaction) {
      factions.push((event as any).victimFaction);
    }

    // Extract from participants array if it exists
    if ((event as any).participants && Array.isArray((event as any).participants)) {
      for (const participant of (event as any).participants) {
        if (participant.factionId) {
          factions.push(participant.factionId);
        }
      }
    }

    // Remove duplicates
    return [...new Set(factions)];
  }

  private processPirateRaid(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    if (factions.length < 2) return interactions;

    // Identify pirate faction and victim faction
    const pirateFaction = (event as any).attackerFaction || factions[0];
    const victimFaction = (event as any).victimFaction || factions[1];
    const witnesses = factions.filter(f => f !== pirateFaction && f !== victimFaction);

    // Get existing relationship to scale impact
    const relationship = this.getRelationship(pirateFaction, victimFaction);
    const casualties = (event as any).casualties || 0;
    const stolenCargo = (event as any).stolenValue || 0;

    // Base impact scaled by severity and existing relationship
    // If already hostile, raids matter less. If were friendly, this is a betrayal
    let baseImpact = -5 - (casualties / 5) - (stolenCargo / 50000);
    if (relationship.status === 'FRIENDLY' || relationship.status === 'ALLIED') {
      baseImpact *= 2.5; // Betrayal is worse
    } else if (relationship.status === 'HOSTILE' || relationship.status === 'WAR') {
      baseImpact *= 0.5; // Expected behavior
    }

    // Pirate raid damages relationship between pirate and victim
    interactions.push({
      timestamp: event.timestamp,
      type: 'MILITARY_INCIDENT',
      factionA: pirateFaction,
      factionB: victimFaction,
      impact: Math.max(-20, baseImpact),
      description: `Pirate raid by ${pirateFaction} against ${victimFaction}: ${casualties} casualties, ${stolenCargo} credits stolen`,
      witnesses: witnesses,
      eventContext: event
    });

    // Witness reactions - allies of victim condemn more strongly
    for (const witnessF of witnesses) {
      const witnessVictimRel = this.getRelationship(witnessF, victimFaction);
      const witnessPirateRel = this.getRelationship(witnessF, pirateFaction);

      let witnessImpact = -2;

      // Allies of victim are more upset
      if (witnessVictimRel.status === 'ALLIED') {
        witnessImpact = -8;
      } else if (witnessVictimRel.status === 'FRIENDLY') {
        witnessImpact = -5;
      }

      // Already enemies of pirate care less
      if (witnessPirateRel.status === 'HOSTILE' || witnessPirateRel.status === 'WAR') {
        witnessImpact *= 0.5;
      }

      interactions.push({
        timestamp: event.timestamp,
        type: witnessVictimRel.status === 'ALLIED' ? 'MILITARY_AID' : 'MILITARY_INCIDENT',
        factionA: witnessF,
        factionB: pirateFaction,
        impact: witnessImpact,
        description: `${witnessF} condemns pirate raid on ${victimFaction}`,
        witnesses: [victimFaction],
        eventContext: event
      });

      // Witness supports victim
      if (witnessVictimRel.status === 'ALLIED' || witnessVictimRel.status === 'FRIENDLY') {
        interactions.push({
          timestamp: event.timestamp,
          type: 'DIPLOMATIC_PRAISE',
          factionA: witnessF,
          factionB: victimFaction,
          impact: 3,
          description: `${witnessF} expresses solidarity with ${victimFaction}`,
          witnesses: [pirateFaction],
          eventContext: event
        });
      }
    }

    return interactions;
  }

  private processStationDestroyed(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    if (factions.length < 2) return interactions;

    // Identify attacker and owner
    const attackerFaction = (event as any).attackerFaction || factions[0];
    const ownerFaction = (event as any).ownerFaction || factions[1];
    const witnesses = factions.filter(f => f !== attackerFaction && f !== ownerFaction);
    const stationValue = (event as any).stationValue || 1000000;
    const civilianCasualties = (event as any).civilianCasualties || 0;

    // Get relationship context
    const relationship = this.getRelationship(attackerFaction, ownerFaction);

    // Station destruction is a MAJOR incident
    let baseImpact = -25 - (stationValue / 1000000) * 5 - (civilianCasualties / 100) * 10;

    // If they had treaties, this breaks them
    const hasTreaties = relationship.treaties.length > 0;
    if (hasTreaties) {
      baseImpact *= 1.5; // Treaty violation makes it worse
      // Break all treaties
      for (const treaty of relationship.treaties) {
        treaty.active = false;
        treaty.brokenBy = attackerFaction;
        treaty.brokenAt = event.timestamp;
      }
    }

    // If they were allied, this could trigger a coalition war
    const wasAllied = relationship.status === 'ALLIED';
    if (wasAllied) {
      baseImpact *= 3.0; // Extreme betrayal
    }

    interactions.push({
      timestamp: event.timestamp,
      type: 'MILITARY_INCIDENT',
      factionA: attackerFaction,
      factionB: ownerFaction,
      impact: Math.max(-50, baseImpact),
      description: `Station destroyed by ${attackerFaction} - owned by ${ownerFaction}. ${civilianCasualties} civilian casualties. Value: ${stationValue} credits.${hasTreaties ? ' TREATY VIOLATION!' : ''}`,
      witnesses: witnesses,
      eventContext: event
    });

    // This could trigger automatic war declaration
    if (relationship.relationshipValue > -80) {
      // Push them toward war threshold
      relationship.relationshipValue = Math.min(relationship.relationshipValue, -75);
    }

    // Allied factions react VERY negatively
    for (const faction of witnesses) {
      const factionOwnerRel = this.getRelationship(faction, ownerFaction);
      const factionAttackerRel = this.getRelationship(faction, attackerFaction);

      let witnessImpact = -10;

      // Allies might join the war
      if (factionOwnerRel.status === 'ALLIED') {
        witnessImpact = -30;
        // Check if should join war
        const ownerAllies = this.getAllies(ownerFaction);
        if (ownerAllies.includes(faction)) {
          // Mutual defense pact - consider joining
          interactions.push({
            timestamp: event.timestamp,
            type: 'MILITARY_COOPERATION',
            factionA: faction,
            factionB: ownerFaction,
            impact: 15,
            description: `${faction} considers military response to station destruction (allied with ${ownerFaction})`,
            witnesses: [attackerFaction],
            eventContext: event
          });
        }
      } else if (factionOwnerRel.status === 'FRIENDLY') {
        witnessImpact = -15;
      } else if (factionOwnerRel.status === 'CORDIAL') {
        witnessImpact = -8;
      }

      interactions.push({
        timestamp: event.timestamp,
        type: 'DIPLOMATIC_INSULT',
        factionA: faction,
        factionB: attackerFaction,
        impact: witnessImpact,
        description: `${faction} condemns station destruction as war crime`,
        witnesses: [ownerFaction, attackerFaction],
        eventContext: event
      });

      // Support for victim
      if (factionOwnerRel.relationshipValue > 0) {
        interactions.push({
          timestamp: event.timestamp,
          type: 'HUMANITARIAN_AID',
          factionA: faction,
          factionB: ownerFaction,
          impact: 5,
          description: `${faction} offers humanitarian aid to ${ownerFaction} survivors`,
          witnesses: witnesses,
          eventContext: event
        });
      }
    }

    return interactions;
  }

  private processTradeCompleted(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    if (factions.length < 2) return interactions;

    // Trade improves relationships
    const buyer = (event as any).buyerFaction || factions[0];
    const seller = (event as any).sellerFaction || factions[1];
    const tradeValue = (event as any).value || 1000;
    const commodity = (event as any).commodity || 'goods';

    const relationship = this.getRelationship(buyer, seller);

    // Scale impact based on trade value and relationship
    let baseImpact = Math.min(8, (tradeValue / 50000) * 3);

    // First trades with new factions matter more
    const tradeHistory = relationship.recentInteractions.filter(i => i.type === 'TRADE_AGREEMENT');
    if (tradeHistory.length === 0) {
      baseImpact *= 1.5; // First trade is memorable
    }

    // Large trades increase economic interdependence
    if (tradeValue > 100000) {
      relationship.economicInterdependence = Math.min(1.0,
        relationship.economicInterdependence + (tradeValue / 10000000)
      );
    }

    // Trade between hostile factions is a diplomatic breakthrough
    if (relationship.status === 'HOSTILE' || relationship.status === 'TENSE') {
      baseImpact *= 2.0;
    }

    // Check if there's a trade agreement
    const hasTradeAgreement = relationship.tradeAgreements.length > 0;
    if (hasTradeAgreement) {
      // Update trade volume
      for (const agreement of relationship.tradeAgreements) {
        agreement.actualTradeVolume += tradeValue;
      }
      baseImpact *= 1.2; // Following agreements is good
    }

    interactions.push({
      timestamp: event.timestamp,
      type: 'TRADE_AGREEMENT',
      factionA: buyer,
      factionB: seller,
      impact: baseImpact,
      description: `Trade completed: ${buyer} purchased ${commodity} from ${seller} for ${tradeValue} credits`,
      witnesses: [],
      eventContext: event
    });

    // Economic interdependence earns diplomatic capital
    if (relationship.economicInterdependence > 0.3) {
      relationship.diplomaticCapital = Math.min(100,
        (relationship.diplomaticCapital || 0) + baseImpact * 0.5
      );
    }

    return interactions;
  }

  private processDockingCompleted(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    if (factions.length < 2) return interactions;

    // Docking improves relationships through peaceful cooperation
    const dockingShip = (event as any).factionA || factions[0];
    const stationFaction = (event as any).factionB || factions[1];

    const relationship = this.getRelationship(dockingShip, stationFaction);

    // Base impact - peaceful docking is a positive but minor interaction
    let baseImpact = 1.5;

    // First docking with a faction is more significant
    const dockingHistory = relationship.recentInteractions.filter(
      i => i.description?.includes('docked') || i.description?.includes('Docking')
    );
    if (dockingHistory.length === 0) {
      baseImpact *= 1.5; // First contact matters
    }

    // Docking with hostile/tense factions is a diplomatic breakthrough
    if (relationship.status === 'HOSTILE' || relationship.status === 'TENSE') {
      baseImpact *= 2.5; // Significant peace gesture
    }

    // Docking shows trust - increases diplomatic capital
    relationship.diplomaticCapital = Math.min(100,
      (relationship.diplomaticCapital || 0) + baseImpact * 0.3
    );

    interactions.push({
      timestamp: event.timestamp,
      type: 'DIPLOMATIC_PRAISE',
      factionA: dockingShip,
      factionB: stationFaction,
      impact: baseImpact,
      description: event.description || `${dockingShip} docked peacefully with ${stationFaction} station`,
      witnesses: [],
      eventContext: event
    });

    return interactions;
  }

  private processRescue(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    if (factions.length < 2) return interactions;

    // Rescue significantly improves relationship
    const rescuer = (event as any).rescuerFaction || factions[0];
    const rescued = (event as any).victimFaction || factions[1];
    const liveSaved = (event as any).livesSaved || 1;
    const witnesses = factions.filter(f => f !== rescuer && f !== rescued);

    const relationship = this.getRelationship(rescuer, rescued);

    // Base impact scaled by lives saved
    let baseImpact = 15 + Math.min(10, liveSaved / 10);

    // Rescue of enemy faction is EXTREMELY significant (shows honor)
    if (relationship.status === 'HOSTILE' || relationship.status === 'WAR') {
      baseImpact *= 3.0;
    }

    // Rescue earns massive diplomatic capital
    relationship.diplomaticCapital = Math.min(100,
      (relationship.diplomaticCapital || 0) + baseImpact
    );

    interactions.push({
      timestamp: event.timestamp,
      type: 'RESCUE_OPERATION',
      factionA: rescuer,
      factionB: rescued,
      impact: baseImpact,
      description: `${rescuer} rescued ${liveSaved} ${rescued} personnel in daring operation`,
      witnesses: witnesses,
      eventContext: event
    });

    // Witnesses are impressed - this improves rescuer's reputation universally
    for (const faction of witnesses) {
      const witnessRescuerRel = this.getRelationship(faction, rescuer);
      const witnessRescuedRel = this.getRelationship(faction, rescued);

      // Everyone respects heroism
      let witnessImpact = 5;

      // Allies of rescued are especially grateful
      if (witnessRescuedRel.status === 'ALLIED') {
        witnessImpact = 12;
      } else if (witnessRescuedRel.status === 'FRIENDLY') {
        witnessImpact = 8;
      }

      interactions.push({
        timestamp: event.timestamp,
        type: 'HUMANITARIAN_AID',
        factionA: faction,
        factionB: rescuer,
        impact: witnessImpact,
        description: `${faction} commends ${rescuer} for heroic rescue of ${rescued} personnel`,
        witnesses: [rescued],
        eventContext: event
      });
    }

    return interactions;
  }

  private processCombatEvent(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    if (factions.length < 2) return interactions;

    // Combat damages relationships
    const attacker = (event as any).attackerFaction || factions[0];
    const defender = (event as any).defenderFaction || factions[1];
    const casualties = (event as any).casualties || 0;
    const victor = (event as any).victor;
    const witnesses = factions.filter(f => f !== attacker && f !== defender);

    const relationship = this.getRelationship(attacker, defender);

    // Scale impact based on casualties and relationship status
    let baseImpact = -5 - (casualties / 5);

    // First strike is shocking, but war is expected
    if (relationship.status === 'WAR') {
      baseImpact *= 0.3; // War combat is expected
    } else if (relationship.status === 'NEUTRAL' || relationship.status === 'CORDIAL') {
      baseImpact *= 2.5; // Unprovoked attack is severe
    }

    // Check if this violates treaties
    const violatesTreaty = relationship.treaties.some(t =>
      t.active && (t.type === 'NON_AGGRESSION_PACT' || t.type === 'PEACE_TREATY')
    );

    if (violatesTreaty) {
      baseImpact *= 2.0;
      // Break violated treaties
      for (const treaty of relationship.treaties) {
        if (treaty.type === 'NON_AGGRESSION_PACT' || treaty.type === 'PEACE_TREATY') {
          treaty.active = false;
          treaty.brokenBy = attacker;
          treaty.brokenAt = event.timestamp;
          treaty.violations.push({
            violator: attacker,
            term: 'Non-aggression',
            timestamp: event.timestamp,
            severity: 10
          });
        }
      }
    }

    interactions.push({
      timestamp: event.timestamp,
      type: 'MILITARY_INCIDENT',
      factionA: attacker,
      factionB: defender,
      impact: Math.max(-30, baseImpact),
      description: `Combat: ${attacker} vs ${defender} - ${casualties} casualties${violatesTreaty ? ' (TREATY VIOLATION)' : ''}`,
      witnesses: witnesses,
      eventContext: event
    });

    // Combat ended - process victor/loser dynamics
    if (event.type === 'COMBAT_ENDED' && victor) {
      const loser = victor === attacker ? defender : attacker;

      // Victor gains reputation
      for (const faction of witnesses) {
        const factionVictorRel = this.getRelationship(faction, victor);
        const factionLoserRel = this.getRelationship(faction, loser);

        let witnessImpact = 2;

        // Allies of loser are concerned
        if (factionLoserRel.status === 'ALLIED') {
          witnessImpact = -5; // Worry about allied defeat
        }
        // Enemies of loser are pleased
        else if (factionLoserRel.status === 'HOSTILE' || factionLoserRel.status === 'WAR') {
          witnessImpact = 5;
        }

        interactions.push({
          timestamp: event.timestamp,
          type: 'MILITARY_COOPERATION',
          factionA: faction,
          factionB: victor,
          impact: witnessImpact,
          description: `${faction} acknowledges ${victor} military victory over ${loser}`,
          witnesses: [attacker, defender],
          eventContext: event
        });
      }

      // Update military balance perception
      relationship.militaryBalance = victor === attacker ? 0.3 : -0.3;
    }

    return interactions;
  }

  private processGenericEvent(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    const interactions: DiplomaticInteraction[] = [];

    if (factions.length < 2) return interactions;

    // Generic event has mild diplomatic impact based on event category
    let baseImpact = 0;
    let type: InteractionType = 'DIPLOMATIC_SUMMIT';

    switch (event.category) {
      case 'DIPLOMATIC':
        baseImpact = 5;
        type = 'DIPLOMATIC_PRAISE';
        break;
      case 'MILITARY':
        baseImpact = -3;
        type = 'MILITARY_INCIDENT';
        break;
      case 'ECONOMIC':
        baseImpact = 2;
        type = 'TRADE_AGREEMENT';
        break;
      case 'SCIENTIFIC':
        baseImpact = 3;
        type = 'CULTURAL_EXCHANGE';
        break;
      default:
        baseImpact = 1;
        type = 'DIPLOMATIC_SUMMIT';
    }

    // Apply interaction between all faction pairs
    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        const relationship = this.getRelationship(factions[i], factions[j]);

        // Scale by event severity and relationship
        let scaledImpact = baseImpact * (event.severity / 10);

        // Cultural exchange more effective with compatible factions
        if (type === 'CULTURAL_EXCHANGE') {
          scaledImpact *= relationship.culturalCompatibility;
        }

        // Diplomatic events more effective between cordial factions
        if (type === 'DIPLOMATIC_PRAISE' || type === 'DIPLOMATIC_SUMMIT') {
          if (relationship.status === 'HOSTILE' || relationship.status === 'WAR') {
            scaledImpact *= 0.3; // Hard to improve hostile relations
          }
        }

        interactions.push({
          timestamp: event.timestamp,
          type: type,
          factionA: factions[i],
          factionB: factions[j],
          impact: scaledImpact,
          description: `${event.type} involving ${factions[i]} and ${factions[j]}`,
          witnesses: factions.filter(f => f !== factions[i] && f !== factions[j]),
          eventContext: event
        });
      }
    }

    return interactions;
  }

  private applyInteraction(interaction: DiplomaticInteraction): void {
    // Use faction IDs directly from interaction
    if (!interaction.factionA || !interaction.factionB) {
      console.warn('DiplomaticInteraction missing faction IDs:', interaction);
      return;
    }

    // Get or create relationship
    const relationship = this.getRelationship(interaction.factionA, interaction.factionB);

    // Add interaction to recent interactions
    relationship.recentInteractions.push(interaction);

    // Limit recent interactions to prevent memory bloat
    if (relationship.recentInteractions.length > 50) {
      relationship.recentInteractions = relationship.recentInteractions.slice(-50);
    }

    // Calculate effective impact (modified by relationship inertia and momentum)
    let effectiveImpact = interaction.impact;

    // Account for inertia - extreme relationships resist change
    const inertiaModifier = 1 - relationship.inertia;
    effectiveImpact *= inertiaModifier;

    // Account for momentum - trends continue
    if (relationship.momentum) {
      const momentumAlignment = Math.sign(relationship.momentum) === Math.sign(effectiveImpact) ? 1.2 : 0.8;
      effectiveImpact *= momentumAlignment;
    }

    // Update relationship value
    const oldValue = relationship.relationshipValue;
    relationship.relationshipValue = Math.max(-100, Math.min(100,
      relationship.relationshipValue + effectiveImpact
    ));

    // Update opinion (long-term view, changes slower)
    relationship.opinion = Math.max(-100, Math.min(100,
      relationship.opinion + effectiveImpact * 0.5
    ));

    // Record in history
    if (!relationship.history) {
      relationship.history = [];
    }
    relationship.history.push({
      timestamp: interaction.timestamp,
      delta: effectiveImpact,
      reason: interaction.description
    });

    // Keep history manageable
    if (relationship.history.length > 100) {
      relationship.history = relationship.history.slice(-100);
    }

    // Check if this interaction triggers a major event
    this.checkForTriggeredEvents(relationship, interaction);

    // Log significant changes
    const changeMagnitude = Math.abs(relationship.relationshipValue - oldValue);
    if (changeMagnitude > 10) {
      console.log(`[Diplomacy] Major shift: ${interaction.factionA} <-> ${interaction.factionB}: ${oldValue.toFixed(1)} → ${relationship.relationshipValue.toFixed(1)} (${effectiveImpact > 0 ? '+' : ''}${effectiveImpact.toFixed(1)})`);
      console.log(`   Reason: ${interaction.description}`);
    }
  }

  /**
   * Check if interaction triggers major diplomatic events (war, alliance, etc)
   */
  private checkForTriggeredEvents(relationship: FactionRelationship, trigger: DiplomaticInteraction): void {
    // Treaty violations might trigger immediate war
    if (trigger.description.includes('TREATY VIOLATION')) {
      if (relationship.relationshipValue < -70 && Math.random() < 0.4) {
        console.log(`[Diplomacy] Treaty violation pushes ${relationship.factionA} and ${relationship.factionB} toward war!`);
        // Could auto-declare war here
      }
    }

    // Station destruction often triggers war
    if (trigger.type === 'MILITARY_INCIDENT' && trigger.description.includes('Station destroyed')) {
      if (relationship.status !== 'WAR' && relationship.relationshipValue < -60) {
        console.log(`[Diplomacy] Station destruction may trigger war between ${relationship.factionA} and ${relationship.factionB}`);
        relationship.warProbability = Math.min(1.0, relationship.warProbability + 0.4);
      }
    }

    // Rescue of enemies can dramatically shift relations
    if (trigger.type === 'RESCUE_OPERATION') {
      if (relationship.status === 'HOSTILE' || relationship.status === 'WAR') {
        console.log(`[Diplomacy] Heroic rescue may lead to peace talks between ${relationship.factionA} and ${relationship.factionB}`);
      }
    }

    // Multiple trades increase alliance probability
    if (trigger.type === 'TRADE_AGREEMENT') {
      const tradeCount = relationship.recentInteractions.filter(i => i.type === 'TRADE_AGREEMENT').length;
      if (tradeCount > 10 && relationship.relationshipValue > 60) {
        relationship.allianceProbability = Math.min(1.0, relationship.allianceProbability + 0.05);
      }
    }
  }

  private decayInteractions(relationship: FactionRelationship, deltaTime: number): void {
    // Old interactions matter less over time
    for (const interaction of relationship.recentInteractions) {
      const age = Date.now() / 1000 - interaction.timestamp;
      const decay = Math.exp(-this.INTERACTION_DECAY_RATE * age / 86400);  // Decay per day
      interaction.impact *= decay;
    }

    // Remove very weak interactions
    relationship.recentInteractions = relationship.recentInteractions.filter(i =>
      Math.abs(i.impact) > 0.1
    );
  }

  private recalculateRelationship(relationship: FactionRelationship): void {
    // Sum recent interactions
    const interactionSum = relationship.recentInteractions.reduce((sum, i) => sum + i.impact, 0);

    // Apply with momentum (relationships don't change instantly)
    const targetValue = Math.max(-100, Math.min(100, interactionSum));
    relationship.relationshipValue =
      relationship.relationshipValue * this.RELATIONSHIP_MOMENTUM +
      targetValue * (1 - this.RELATIONSHIP_MOMENTUM);
  }

  private updateTrend(relationship: FactionRelationship): void {
    // Calculate change rate
    const recentChange = this.calculateRecentChange(relationship);

    if (recentChange > 10) {
      relationship.trend = 'RAPIDLY_IMPROVING';
      relationship.trendStrength = Math.min(1, recentChange / 20);
    } else if (recentChange > 3) {
      relationship.trend = 'IMPROVING';
      relationship.trendStrength = Math.min(1, recentChange / 10);
    } else if (recentChange < -10) {
      relationship.trend = 'RAPIDLY_DETERIORATING';
      relationship.trendStrength = Math.min(1, Math.abs(recentChange) / 20);
    } else if (recentChange < -3) {
      relationship.trend = 'DETERIORATING';
      relationship.trendStrength = Math.min(1, Math.abs(recentChange) / 10);
    } else {
      relationship.trend = 'STABLE';
      relationship.trendStrength = 0;
    }
  }

  private calculateRecentChange(relationship: FactionRelationship): number {
    const recent = relationship.recentInteractions.slice(-5);
    return recent.reduce((sum, i) => sum + i.impact, 0);
  }

  private checkStatusChange(relationship: FactionRelationship): void {
    const value = relationship.relationshipValue;

    if (value < -80 && relationship.status !== 'WAR') {
      relationship.status = 'HOSTILE';
    } else if (value < -50) {
      relationship.status = 'COLD_WAR';
    } else if (value < -20) {
      relationship.status = 'TENSE';
    } else if (value < 20) {
      relationship.status = 'NEUTRAL';
    } else if (value < 50) {
      relationship.status = 'CORDIAL';
    } else if (value < 70) {
      relationship.status = 'FRIENDLY';
    } else if (value >= 70 && relationship.status !== 'ALLIED') {
      relationship.status = 'FRIENDLY';
    }
  }

  private calculateProbabilities(relationship: FactionRelationship): void {
    // War probability
    if (relationship.relationshipValue < this.WAR_THRESHOLD) {
      const deficit = Math.abs(relationship.relationshipValue - this.WAR_THRESHOLD);
      relationship.warProbability = Math.min(1, deficit / 40);
    } else {
      relationship.warProbability = 0;
    }

    // Alliance probability
    if (relationship.relationshipValue > this.ALLIANCE_THRESHOLD) {
      const surplus = relationship.relationshipValue - this.ALLIANCE_THRESHOLD;
      relationship.allianceProbability = Math.min(1, surplus / 30);
    } else {
      relationship.allianceProbability = 0;
    }
  }

  private checkAutomaticDiplomaticEvents(relationship: FactionRelationship): void {
    // Check if war should be declared
    if (relationship.warProbability > 0.8 && Math.random() < 0.01) {
      this.declareWar(relationship.factionA, relationship.factionB, ['RELATIONSHIP_BREAKDOWN']);
    }

    // Check if alliance should form
    if (relationship.allianceProbability > 0.9 && Math.random() < 0.005) {
      this.formAlliance([relationship.factionA, relationship.factionB], 'Strategic Alliance', 'Mutual benefit', []);
    }
  }

  private updateWar(war: WarRecord, deltaTime: number): void {
    // Update war exhaustion
    for (const side of war.sides) {
      side.warExhaustion += deltaTime / 864000;  // 10 days to 100% exhaustion
    }

    // Check for peace
    if (war.sides.every(s => s.warExhaustion > 80)) {
      this.negotiatePeace(war);
    }
  }

  private updateTreaty(treaty: Treaty, deltaTime: number): void {
    // Check expiration
    if (treaty.expiresAt && Date.now() / 1000 > treaty.expiresAt) {
      treaty.active = false;
      this.activeTreaties.delete(treaty.id);
    }
  }

  // getAllies method moved to public section below for event integration

  private calculateMilitaryStrength(factionId: string): number {
    // TODO: Calculate from faction resources
    return 100;
  }

  private identifyUnderlyingCauses(relationship: FactionRelationship): string[] {
    const causes: string[] = [];

    if (relationship.territorialDisputes > 0) {
      causes.push('TERRITORIAL_DISPUTES');
    }

    if (relationship.economicInterdependence < 0.2) {
      causes.push('ECONOMIC_COMPETITION');
    }

    return causes;
  }

  private breakTreatiesBetween(factionA: string, factionB: string, reason: string): void {
    const relationship = this.getRelationship(factionA, factionB);

    for (const treaty of relationship.treaties) {
      treaty.active = false;
      treaty.brokenBy = factionA;
      treaty.brokenAt = Date.now() / 1000;
      this.activeTreaties.delete(treaty.id);
    }
  }

  private negotiatePeace(war: WarRecord): void {
    // TODO: Create peace treaty
    war.endedAt = Date.now() / 1000;
    war.duration = war.endedAt - war.startedAt;
    war.outcome = 'STALEMATE_PEACE';

    this.activeWars.delete(war.id);
    this.completedWars.push(war);
  }

  // ====================================================================
  // SOPHISTICATED DIPLOMACY ALGORITHMS
  // ====================================================================

  /**
   * Update relationship momentum - relationships have inertia and trends continue
   */
  public updateRelationshipMomentum(relationship: FactionRelationship, deltaTime: number): void {
    const daysDelta = deltaTime / 86400;

    // Initialize history if needed
    if (!relationship.history) {
      relationship.history = [];
    }

    // Calculate trend (improving or deteriorating)
    const recentChanges = relationship.history.slice(-10);
    const trend = recentChanges.length > 0
      ? recentChanges.reduce((sum, change) => sum + change.delta, 0) / recentChanges.length
      : 0;

    // Momentum continues trend (with decay)
    const momentumEffect = trend * 0.1 * daysDelta;
    const dampening = 0.9; // Momentum gradually decreases

    relationship.opinion += momentumEffect * dampening;
    relationship.momentum = trend;

    // Strong relationships harder to change (inertia)
    const extremity = Math.abs(relationship.opinion - 0);  // Opinion from neutral (0)
    relationship.inertia = Math.min(0.5, extremity / 200); // 0 at neutral, 0.5 at extremes
  }

  /**
   * Spend diplomatic capital to achieve goals
   */
  public spendDiplomaticCapital(
    faction: string,
    target: string,
    goal: 'IMPROVE_RELATIONS' | 'REQUEST_FAVOR' | 'PRESSURE',
    amount: number
  ): boolean {
    const relationship = this.getRelationship(faction, target);
    const capital = relationship.diplomaticCapital || 0;

    if (capital < amount) return false;

    // Spend capital
    relationship.diplomaticCapital -= amount;

    // Apply effect based on goal
    switch (goal) {
      case 'IMPROVE_RELATIONS':
        this.modifyRelationshipWithCapital(relationship, amount * 2, 'Diplomatic effort');
        break;
      case 'REQUEST_FAVOR':
        // Process favor request (simplified)
        break;
      case 'PRESSURE':
        // Apply political pressure (simplified)
        break;
    }

    return true;
  }

  /**
   * Modify relationship and track capital
   */
  private modifyRelationshipWithCapital(
    relationship: FactionRelationship,
    delta: number,
    reason: string
  ): void {
    // Account for inertia
    const actualDelta = delta * (1 - relationship.inertia);

    relationship.opinion += actualDelta;
    relationship.opinion = Math.max(-100, Math.min(100, relationship.opinion));

    // Track change in history
    if (!relationship.history) {
      relationship.history = [];
    }
    relationship.history.push({
      timestamp: Date.now() / 1000,
      delta: actualDelta,
      reason
    });

    // Keep last 20 changes
    if (relationship.history.length > 20) {
      relationship.history = relationship.history.slice(-20);
    }
  }

  /**
   * Earn diplomatic capital through positive interactions
   */
  public earnDiplomaticCapital(event: HistoricalEvent, factions: string[]): void {
    if (event.category === 'DIPLOMATIC' || event.category === 'ECONOMIC') {
      for (let i = 0; i < factions.length; i++) {
        for (let j = i + 1; j < factions.length; j++) {
          const relationship = this.getRelationship(factions[i], factions[j]);
          const earnAmount = event.severity * 0.5;
          relationship.diplomaticCapital = (relationship.diplomaticCapital || 0) + earnAmount;
          relationship.diplomaticCapital = Math.min(100, relationship.diplomaticCapital);
        }
      }
    }
  }

  /**
   * Get diplomatic capital between factions
   */
  private getDiplomaticCapital(faction: string, target: string): number {
    const relationship = this.getRelationship(faction, target);
    return relationship.diplomaticCapital || 0;
  }

  /**
   * Modify diplomatic capital (made public for event integration)
   */
  public modifyDiplomaticCapital(faction: string, target: string, amount: number): void {
    const relationship = this.getRelationship(faction, target);
    relationship.diplomaticCapital = (relationship.diplomaticCapital || 0) + amount;
    relationship.diplomaticCapital = Math.max(0, Math.min(100, relationship.diplomaticCapital));
  }

  /**
   * Event-driven relationship changes with momentum
   */
  public processEventImpact(event: HistoricalEvent, affectedFactions: string[]): void {
    for (let i = 0; i < affectedFactions.length; i++) {
      for (let j = i + 1; j < affectedFactions.length; j++) {
        const relationship = this.getRelationship(affectedFactions[i], affectedFactions[j]);

        let impact = 0;
        let reason = '';

        // Calculate impact based on event type
        switch (event.type) {
          case 'TRADE_COMPLETED':
            impact = event.severity * 0.5;
            reason = 'Successful trade';
            break;
          case 'PIRATE_RAID':
            impact = -event.severity * 0.3;
            reason = 'Pirate incident';
            break;
          case 'ALLIANCE_FORMED':
            impact = event.severity * 2;
            reason = 'Alliance formation';
            break;
          case 'WAR_DECLARED':
            impact = -event.severity * 3;
            reason = 'War declaration';
            break;
          case 'RESCUE':
            impact = event.severity;
            reason = 'Rescue operation';
            break;
        }

        if (impact !== 0) {
          this.modifyRelationshipWithCapital(relationship, impact, reason);
        }
      }
    }
  }

  // ====================================================================
  // DIPLOMATIC CONSEQUENCE METHODS (for Event Integration)
  // ====================================================================

  /**
   * Apply diplomatic consequence with optional cascade to allies
   */
  public applyDiplomaticConsequence(params: {
    factionA: string;
    factionB: string;
    relationshipDelta: number;
    reason: string;
    eventType: InteractionType;
    cascadeToAllies: boolean;
    cascadeStrength?: number;
  }): void {
    const { factionA, factionB, relationshipDelta, reason, eventType, cascadeToAllies, cascadeStrength = 0.5 } = params;

    // Apply to primary relationship
    const relationship = this.getRelationship(factionA, factionB);

    const interaction: DiplomaticInteraction = {
      timestamp: Date.now() / 1000,
      type: eventType,
      factionA,
      factionB,
      impact: relationshipDelta,
      description: reason,
      witnesses: []
    };

    this.applyInteraction(interaction);

    // Cascade to allies if requested
    if (cascadeToAllies) {
      const alliesA = this.getAllies(factionA);
      const alliesB = this.getAllies(factionB);

      // Allies of A react to B
      for (const ally of alliesA) {
        const allyInteraction: DiplomaticInteraction = {
          timestamp: Date.now() / 1000,
          type: eventType,
          factionA: ally,
          factionB,
          impact: relationshipDelta * cascadeStrength,
          description: `Ally reaction: ${reason}`,
          witnesses: [factionA]
        };
        this.applyInteraction(allyInteraction);
      }

      // Allies of B react to A
      for (const ally of alliesB) {
        const allyInteraction: DiplomaticInteraction = {
          timestamp: Date.now() / 1000,
          type: eventType,
          factionA: ally,
          factionB: factionA,
          impact: relationshipDelta * cascadeStrength,
          description: `Ally reaction: ${reason}`,
          witnesses: [factionB]
        };
        this.applyInteraction(allyInteraction);
      }
    }
  }

  /**
   * Get all allies of a faction
   */
  public getAllies(factionId: string): string[] {
    const allies: string[] = [];

    // Check all alliances
    for (const alliance of this.activeAlliances.values()) {
      if (alliance.members.includes(factionId)) {
        allies.push(...alliance.members.filter(m => m !== factionId));
      }
    }

    // Also check for ALLIED status relationships
    for (const [key, relationship] of this.relationships.entries()) {
      if (relationship.status === 'ALLIED') {
        if (relationship.factionA === factionId) {
          allies.push(relationship.factionB);
        } else if (relationship.factionB === factionId) {
          allies.push(relationship.factionA);
        }
      }
    }

    // Remove duplicates
    return [...new Set(allies)];
  }

  /**
   * Get all known factions
   */
  public getAllFactions(): string[] {
    const factions = new Set<string>();

    for (const relationship of this.relationships.values()) {
      factions.add(relationship.factionA);
      factions.add(relationship.factionB);
    }

    return Array.from(factions);
  }

  /**
   * Create trade agreement between factions
   */
  public createTradeAgreement(params: {
    factionA: string;
    factionB: string;
    commodities: string[];
    tariffReduction: number;
    duration: number;
  }): TradeAgreement {
    const { factionA, factionB, commodities, tariffReduction, duration } = params;

    const agreement: TradeAgreement = {
      id: `trade_${Date.now()}`,
      parties: [factionA, factionB],
      commodities,
      tariffReduction,
      tradeVolume: 0,
      quotas: new Map(),
      signedAt: Date.now() / 1000,
      duration,
      actualTradeVolume: 0,
      compliance: 1.0
    };

    const relationship = this.getRelationship(factionA, factionB);
    relationship.tradeAgreements.push(agreement);

    console.log(`[Diplomacy] Trade agreement created: ${factionA} <-> ${factionB} (${commodities.join(', ')})`);

    return agreement;
  }

  /**
   * Increase economic interdependence between factions
   */
  public increaseEconomicInterdependence(factionA: string, factionB: string, amount: number): void {
    const relationship = this.getRelationship(factionA, factionB);
    relationship.economicInterdependence = Math.min(1.0, relationship.economicInterdependence + amount);

    // High interdependence reduces war probability
    if (relationship.economicInterdependence > 0.5) {
      relationship.warProbability = Math.max(0, relationship.warProbability - amount * 0.2);
    }
  }

  /**
   * Unlock diplomatic option for a faction
   */
  public unlockDiplomaticOption(params: {
    factionId: string;
    technologyId: string;
    optionType: string;
  }): void {
    const { factionId, technologyId, optionType } = params;

    // Store unlocked options (you could extend FactionRelationship to track this)
    console.log(`[Diplomacy] ${factionId} unlocked diplomatic option: ${optionType} (via ${technologyId})`);

    // Improve diplomatic capital with all factions
    const allFactions = this.getAllFactions();
    for (const otherFaction of allFactions) {
      if (otherFaction === factionId) continue;
      this.modifyDiplomaticCapital(factionId, otherFaction, 3);
    }
  }

  /**
   * Reduce faction stability (affects diplomatic standing)
   */
  public reduceFactionStability(params: {
    factionId: string;
    stabilityLoss: number;
    reason: string;
  }): void {
    const { factionId, stabilityLoss, reason } = params;

    console.log(`[Diplomacy] ${factionId} stability reduced by ${(stabilityLoss * 100).toFixed(1)}%: ${reason}`);

    // Low stability makes faction vulnerable
    // This could be tracked in a faction state object
    // For now, we reduce diplomatic capital with all factions
    const allFactions = this.getAllFactions();
    for (const otherFaction of allFactions) {
      if (otherFaction === factionId) continue;
      this.modifyDiplomaticCapital(factionId, otherFaction, -stabilityLoss * 5);
    }
  }

  /**
   * Increase war probability between factions
   */
  public increaseWarProbability(params: {
    factionA: string;
    factionB: string;
    increase: number;
    reason: string;
  }): void {
    const { factionA, factionB, increase, reason } = params;
    const relationship = this.getRelationship(factionA, factionB);

    relationship.warProbability = Math.min(1.0, relationship.warProbability + increase);

    console.log(`[Diplomacy] War probability ${factionA} vs ${factionB}: ${(relationship.warProbability * 100).toFixed(1)}% (${reason})`);
  }

  /**
   * Create diplomatic tension (ongoing negative modifier)
   */
  public createDiplomaticTension(params: {
    factionA: string;
    territories?: string[];
    tensionType: string;
    severity: number;
  }): void {
    const { factionA, territories, tensionType, severity } = params;

    console.log(`[Diplomacy] Diplomatic tension created: ${factionA} - ${tensionType} (severity: ${severity})`);

    // Tensions reduce relations with all factions over time
    const allFactions = this.getAllFactions();
    for (const otherFaction of allFactions) {
      if (otherFaction === factionA) continue;

      const relationship = this.getRelationship(factionA, otherFaction);
      relationship.relationshipValue -= severity * 5;
    }
  }

  /**
   * Create territorial dispute between factions
   */
  public createTerritorialDispute(params: {
    factionA: string;
    factionB: string;
    disputedTerritory: string;
    reason: string;
  }): void {
    const { factionA, factionB, disputedTerritory, reason } = params;
    const relationship = this.getRelationship(factionA, factionB);

    relationship.territorialDisputes += 1;

    console.log(`[Diplomacy] Territorial dispute: ${factionA} vs ${factionB} over ${disputedTerritory} (${reason})`);
    console.log(`   Total disputes: ${relationship.territorialDisputes}`);

    // Disputes increase war probability
    relationship.warProbability = Math.min(1.0, relationship.warProbability + 0.1 * relationship.territorialDisputes);
  }

  /**
   * Update military balance perception
   */
  public updateMilitaryBalance(params: {
    factionId: string;
    balanceChange: number;
    reason: string;
  }): void {
    const { factionId, balanceChange, reason } = params;

    console.log(`[Diplomacy] Military balance updated: ${factionId} ${balanceChange > 0 ? '+' : ''}${balanceChange} (${reason})`);

    // Update balance with all factions
    const allFactions = this.getAllFactions();
    for (const otherFaction of allFactions) {
      if (otherFaction === factionId) continue;

      const relationship = this.getRelationship(factionId, otherFaction);
      relationship.militaryBalance += balanceChange;
      relationship.militaryBalance = Math.max(-1, Math.min(1, relationship.militaryBalance));

      // Weaker factions are more likely to be targeted
      if (relationship.militaryBalance < -0.5 && relationship.relationshipValue < 0) {
        relationship.warProbability = Math.min(1.0, relationship.warProbability + 0.05);
      }
    }
  }

  /**
   * Create diplomatic crisis (complex situation requiring resolution)
   */
  public createDiplomaticCrisis(params: {
    factionId: string;
    crisisType: string;
    involvedFactions: string[];
  }): void {
    const { factionId, crisisType, involvedFactions } = params;

    console.log(`[Diplomacy] CRISIS: ${factionId} - ${crisisType} involving ${involvedFactions.join(', ')}`);

    // Crisis damages diplomatic capital
    for (const faction of involvedFactions) {
      this.modifyDiplomaticCapital(factionId, faction, -15);
    }

    // May need to choose sides or dissolve alliances
    if (crisisType === 'ALLIANCE_CONFLICT') {
      // Faction may need to break alliance with one side
      const alliances = Array.from(this.activeAlliances.values()).filter(a =>
        a.members.includes(factionId)
      );

      for (const alliance of alliances) {
        const conflictMembers = alliance.members.filter(m => involvedFactions.includes(m));
        if (conflictMembers.length > 0) {
          console.log(`   Alliance ${alliance.name} is strained due to internal conflict`);
          // Could reduce alliance effectiveness or dissolve it
        }
      }
    }
  }

  /**
   * Get faction allies (wrapper for external access)
   */
  public getFactionAllies(factionId: string): string[] {
    return this.getAllies(factionId);
  }
}
