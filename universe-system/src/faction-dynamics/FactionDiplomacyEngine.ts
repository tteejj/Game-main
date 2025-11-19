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
  impact: number;                 // -10 to +10
  description: string;
  witnesses: string[];            // Other factions that know
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
      recentInteractions: [],
      trend: 'STABLE',
      trendStrength: 0,
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
    // Extract faction IDs from event
    // This would integrate with actual faction system
    return [];  // TODO: Implement
  }

  private processPirateRaid(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    // TODO: Generate diplomatic interactions from pirate raid
    return [];
  }

  private processStationDestroyed(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    return [];
  }

  private processTradeCompleted(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    return [];
  }

  private processRescue(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    return [];
  }

  private processCombatEvent(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    return [];
  }

  private processGenericEvent(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    return [];
  }

  private applyInteraction(interaction: DiplomaticInteraction): void {
    // TODO: Apply interaction to relationship
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

  private getAllies(factionId: string): string[] {
    // TODO: Get allies from alliance system
    return [];
  }

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
   * Modify diplomatic capital
   */
  private modifyDiplomaticCapital(faction: string, target: string, amount: number): void {
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
}
