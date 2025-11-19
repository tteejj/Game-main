/**
 * Enhanced ConsequenceEngine - Comprehensive cascading consequence system
 *
 * Massively expanded rule system with:
 * - 50+ consequence rules across all event types
 * - Sophisticated second and third-order effects
 * - Economic, social, political, military, and environmental chains
 * - Context-aware consequence generation
 * - Probability-based realistic outcomes
 */

import { HistoricalEvent, EventType, EventCategory } from './HistoricalMemorySystem';
import { HistoricalMemorySystem } from './HistoricalMemorySystem';

export interface Consequence {
  id: string;
  sourceEventId: string;
  timestamp: number;
  type: ConsequenceType;
  order: number;                  // 1st, 2nd, 3rd order
  severity: number;               // 1-10
  affectedEntities: string[];
  affectedLocations: string[];    // Systems/stations affected
  data: any;
  event?: HistoricalEvent;        // If consequence spawns new event
  delay: number;
  executed: boolean;
  probability: number;            // How likely this was (for analysis)
}

export type ConsequenceType =
  // Economic (Tier 1 - Direct)
  | 'PRICE_CHANGE' | 'SUPPLY_DISRUPTION' | 'DEMAND_SPIKE'
  | 'TRADE_ROUTE_BLOCKED' | 'TRADE_ROUTE_OPENED'
  | 'COMMODITY_SHORTAGE' | 'COMMODITY_SURPLUS'
  | 'INFLATION' | 'DEFLATION' | 'MARKET_VOLATILITY'
  | 'ECONOMIC_BOOM' | 'RECESSION' | 'MARKET_CRASH'
  | 'INVESTMENT_OPPORTUNITY' | 'BANKRUPTCY'

  // Economic (Tier 2 - Ripple)
  | 'UNEMPLOYMENT_RISE' | 'WAGE_PRESSURE' | 'CONSUMER_CONFIDENCE_CHANGE'
  | 'PRODUCTION_SLOWDOWN' | 'PRODUCTION_INCREASE'
  | 'SUPPLY_CHAIN_REORGANIZATION' | 'BLACK_MARKET_EXPANSION'

  // Diplomatic
  | 'REPUTATION_CHANGE' | 'RELATIONSHIP_DETERIORATION'
  | 'RELATIONSHIP_IMPROVEMENT' | 'ALLIANCE_STRAIN'
  | 'WAR_LIKELIHOOD_INCREASE' | 'PEACE_OPPORTUNITY'
  | 'DIPLOMATIC_INCIDENT' | 'TREATY_VIOLATION'
  | 'SANCTIONS_IMPOSED' | 'EMBARGO_DECLARED'
  | 'ALLIANCE_FRACTURE' | 'DIPLOMATIC_ISOLATION'

  // Social
  | 'POPULATION_FEAR' | 'POPULATION_ANGER' | 'POPULATION_CELEBRATION'
  | 'CIVIL_UNREST' | 'MIGRATION' | 'MORALE_CHANGE'
  | 'PROTEST' | 'RIOT' | 'REVOLUTION'
  | 'REFUGEE_CRISIS' | 'BRAIN_DRAIN' | 'CULTURAL_SHIFT'
  | 'PROPAGANDA_CAMPAIGN' | 'INFORMATION_BLACKOUT'

  // Military
  | 'PATROL_INCREASE' | 'PATROL_DECREASE'
  | 'MILITARY_ALERT' | 'DEFENSE_UPGRADE'
  | 'BOUNTY_POSTED' | 'WANTED_STATUS'
  | 'MOBILIZATION' | 'DEMOBILIZATION'
  | 'ARMS_RACE' | 'DISARMAMENT'
  | 'ESPIONAGE_INCREASE' | 'SABOTAGE_ATTEMPT'
  | 'BLOCKADE' | 'INVASION_PREPARATION'

  // Infrastructure
  | 'STATION_DAMAGE' | 'STATION_UPGRADE' | 'STATION_CLOSURE'
  | 'COMMUNICATION_DISRUPTION' | 'POWER_OUTAGE'
  | 'REPAIR_NEEDED' | 'CONSTRUCTION_BOOM'
  | 'INFRASTRUCTURE_DECAY' | 'MODERNIZATION'

  // Entity behavior
  | 'ENTITY_ACTION' | 'BEHAVIOR_CHANGE' | 'GOAL_CREATED'
  | 'GOAL_ABANDONED' | 'MEMORY_FORMED' | 'TRAUMA_INFLICTED'
  | 'SKILL_GAINED' | 'REPUTATION_ESTABLISHED'
  | 'CAREER_CHANGE' | 'RETIREMENT' | 'RECRUITMENT'

  // Environmental
  | 'ENVIRONMENTAL_DAMAGE' | 'RESOURCE_DEPLETION'
  | 'HAZARD_CREATED' | 'HAZARD_CLEARED'
  | 'POLLUTION_INCREASE' | 'ECOLOGICAL_RECOVERY'
  | 'CLIMATE_SHIFT' | 'DISASTER_RISK_INCREASE'

  // Meta
  | 'SPAWN_EVENT' | 'TRIGGER_CHAIN' | 'PROBABILITY_CHANGE'
  | 'NEWS_GENERATED' | 'RUMOR_SPREAD';

export interface ConsequenceRule {
  eventType: EventType;
  conditions: ConsequenceCondition[];
  consequences: ConsequenceTemplate[];
  description?: string;
}

export interface ConsequenceCondition {
  type: 'SEVERITY_THRESHOLD' | 'LOCATION_TYPE' | 'PARTICIPANT_TYPE'
       | 'TIME_OF_DAY' | 'ECONOMIC_STATE' | 'POLITICAL_STATE'
       | 'PARTICIPANT_COUNT' | 'DATA_FIELD_EXISTS' | 'DATA_VALUE_THRESHOLD';
  field?: string;
  value: any;
  comparator?: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE' | 'CONTAINS';
}

export interface ConsequenceTemplate {
  type: ConsequenceType;
  order: number;
  severity: (event: HistoricalEvent) => number;
  delay: number;
  probability: number;
  generator: (event: HistoricalEvent) => any;
  description?: string;
}

export interface ConsequenceImpact {
  economic: number;
  diplomatic: number;
  military: number;
  social: number;
}

export interface ConsequenceContext {
  history: HistoricalMemorySystem;
  currentTime: number;
  economicState?: any;
  diplomaticState?: any;
}

export class ConsequenceEngine {
  private rules: Map<EventType, ConsequenceRule[]> = new Map();
  private pendingConsequences: Consequence[] = [];
  private executedConsequences: Consequence[] = [];

  // Statistics
  private totalConsequences: number = 0;
  private consequencesByType: Map<ConsequenceType, number> = new Map();
  private consequencesByOrder: Map<number, number> = new Map();

  // Context
  private history?: HistoricalMemorySystem;

  constructor(history?: HistoricalMemorySystem) {
    this.history = history;
    this.initializeComprehensiveRules();
  }

  /**
   * Process event and generate cascading consequences
   */
  public processEvent(event: HistoricalEvent): Consequence[] {
    const consequences: Consequence[] = [];

    // Get rules for this event type
    const eventRules = this.rules.get(event.type) || [];

    for (const rule of eventRules) {
      // Check conditions
      if (!this.evaluateConditions(rule.conditions, event)) {
        continue;
      }

      // Generate consequences from template
      for (const template of rule.consequences) {
        // Probability check
        if (Math.random() > template.probability) {
          continue;
        }

        const consequence: Consequence = {
          id: this.generateConsequenceId(),
          sourceEventId: event.id,
          timestamp: event.timestamp,
          type: template.type,
          order: template.order,
          severity: template.severity(event),
          affectedEntities: this.extractAffectedEntities(event, template),
          affectedLocations: this.extractAffectedLocations(event),
          data: template.generator(event),
          delay: template.delay,
          executed: false,
          probability: template.probability
        };

        consequences.push(consequence);
        this.trackConsequence(consequence);

        // If delayed, add to pending
        if (template.delay > 0) {
          this.pendingConsequences.push(consequence);
        }
      }
    }

    // Generate second and third-order consequences
    const secondOrder = this.generateHigherOrderConsequences(event, consequences, 2);
    consequences.push(...secondOrder);

    const thirdOrder = this.generateHigherOrderConsequences(event, secondOrder, 3);
    consequences.push(...thirdOrder);

    // Store in event
    event.consequences = consequences;

    return consequences;
  }

  /**
   * Update pending consequences
   */
  public updatePendingConsequences(currentTime: number): Consequence[] {
    const readyConsequences: Consequence[] = [];

    this.pendingConsequences = this.pendingConsequences.filter(consequence => {
      const elapsed = currentTime - consequence.timestamp;

      if (elapsed >= consequence.delay && !consequence.executed) {
        consequence.executed = true;
        readyConsequences.push(consequence);
        this.executedConsequences.push(consequence);

        // If consequence spawns an event, record it
        if (consequence.event && this.history) {
          this.history.recordEvent(consequence.event);
        }

        return false; // Remove from pending
      }

      return true; // Keep in pending
    });

    return readyConsequences;
  }

  /**
   * Calculate total impact of consequences
   */
  public calculateImpact(consequences: Consequence[]): ConsequenceImpact {
    const impact: ConsequenceImpact = {
      economic: 0,
      diplomatic: 0,
      military: 0,
      social: 0
    };

    for (const consequence of consequences) {
      const weight = consequence.severity / 10;

      // Categorize by type
      if (this.isEconomicConsequence(consequence.type)) {
        impact.economic += weight;
      }
      if (this.isDiplomaticConsequence(consequence.type)) {
        impact.diplomatic += weight;
      }
      if (this.isMilitaryConsequence(consequence.type)) {
        impact.military += weight;
      }
      if (this.isSocialConsequence(consequence.type)) {
        impact.social += weight;
      }
    }

    return impact;
  }

  // ====================================================================
  // COMPREHENSIVE RULE INITIALIZATION
  // ====================================================================

  private initializeComprehensiveRules(): void {
    // PIRATE RAID - Comprehensive consequences
    this.addRule('PIRATE_RAID', {
      eventType: 'PIRATE_RAID',
      description: 'Pirate raid consequences',
      conditions: [],
      consequences: [
        // 1st order: Immediate effects
        {
          type: 'REPUTATION_CHANGE',
          order: 1,
          severity: (e) => e.severity,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            faction: e.data.targetFaction,
            change: -e.severity * 5,
            reason: 'FAILED_PROTECTION'
          })
        },
        {
          type: 'PATROL_INCREASE',
          order: 1,
          severity: (e) => e.severity,
          delay: 3600,
          probability: 0.85,
          generator: (e) => ({
            location: e.location,
            systemId: e.systemId,
            duration: 86400 * 3,
            intensity: Math.min(1, e.severity * 0.15)
          })
        },
        {
          type: 'BOUNTY_POSTED',
          order: 1,
          severity: (e) => e.severity,
          delay: 7200,
          probability: 0.7,
          generator: (e) => ({
            target: e.participants[0],
            amount: e.data.stolenValue * 1.5,
            postedBy: e.data.targetFaction,
            reason: 'PIRACY'
          })
        },
        {
          type: 'TRAUMA_INFLICTED',
          order: 1,
          severity: (e) => Math.min(10, e.severity + 2),
          delay: 0,
          probability: 0.9,
          generator: (e) => ({
            victims: e.data.casualties || [],
            type: 'COMBAT_TRAUMA',
            severity: e.severity
          })
        },
        // 2nd order: Economic ripples
        {
          type: 'PRICE_CHANGE',
          order: 2,
          severity: (e) => Math.floor(e.severity * 0.8),
          delay: 7200,
          probability: 0.75,
          generator: (e) => ({
            commodity: 'INSURANCE',
            priceMultiplier: 1 + (e.severity * 0.08),
            region: e.systemId,
            duration: 86400 * 7
          })
        },
        {
          type: 'SUPPLY_DISRUPTION',
          order: 2,
          severity: (e) => Math.floor(e.severity * 0.7),
          delay: 3600,
          probability: 0.6,
          generator: (e) => ({
            station: e.stationId,
            commodities: e.data.stolenCargo || [],
            duration: 86400
          })
        },
        // 3rd order: Behavioral changes
        {
          type: 'BEHAVIOR_CHANGE',
          order: 3,
          severity: (e) => Math.floor(e.severity * 0.6),
          delay: 86400,
          probability: 0.8,
          generator: (e) => ({
            entityType: 'TRADER',
            region: e.systemId,
            behaviorChange: 'AVOID_REGION',
            duration: 604800,
            intensit: e.severity / 10
          })
        },
        {
          type: 'GOAL_CREATED',
          order: 3,
          severity: (e) => e.severity,
          delay: 0,
          probability: 0.5,
          generator: (e) => ({
            entity: e.data.targetFaction,
            goalType: 'HUNT_PIRATES',
            target: e.participants[0],
            priority: e.severity
          })
        }
      ]
    });

    // STATION DESTROYED - Catastrophic consequences
    this.addRule('STATION_DESTROYED', {
      eventType: 'STATION_DESTROYED',
      description: 'Station destruction catastrophic ripples',
      conditions: [],
      consequences: [
        // 1st order
        {
          type: 'TRADE_ROUTE_BLOCKED',
          order: 1,
          severity: () => 10,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            stationId: e.stationId,
            affectedRoutes: 'ALL_THROUGH_STATION',
            duration: -1  // Permanent until new routes
          })
        },
        {
          type: 'REFUGEE_CRISIS',
          order: 1,
          severity: () => 9,
          delay: 3600,
          probability: 1.0,
          generator: (e) => ({
            population: e.data.stationPopulation || 10000,
            destination: 'NEAREST_STATIONS',
            systemId: e.systemId
          })
        },
        {
          type: 'POPULATION_FEAR',
          order: 1,
          severity: () => 9,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            systemId: e.systemId,
            intensity: 0.9,
            duration: 172800,
            spreadRadius: 2  // Spreads to nearby systems
          })
        },
        // 2nd order
        {
          type: 'COMMODITY_SHORTAGE',
          order: 2,
          severity: () => 9,
          delay: 7200,
          probability: 0.95,
          generator: (e) => ({
            commodities: e.data.stationProduction || ['ALL'],
            affectedRegion: e.systemId,
            severityMultiplier: 2.5,
            duration: 604800
          })
        },
        {
          type: 'ECONOMIC_BOOM',
          order: 2,
          severity: () => 7,
          delay: 86400,
          probability: 0.7,
          generator: (e) => ({
            location: 'COMPETING_STATIONS',
            reason: 'SUPPLY_SHIFT',
            magnitude: 1.5
          })
        },
        {
          type: 'CONSTRUCTION_BOOM',
          order: 2,
          severity: () => 8,
          delay: 86400 * 7,
          probability: 0.8,
          generator: (e) => ({
            location: e.systemId,
            type: 'REPLACEMENT_STATION',
            investment: e.data.stationValue * 1.2
          })
        },
        // 3rd order
        {
          type: 'WAR_LIKELIHOOD_INCREASE',
          order: 3,
          severity: () => 8,
          delay: 86400 * 2,
          probability: 0.6,
          generator: (e) => ({
            factionA: e.data.controllingFaction,
            factionB: e.data.suspectedCulprit,
            reason: 'REVENGE',
            probabilityIncrease: 0.4
          })
        },
        {
          type: 'DIPLOMATIC_INCIDENT',
          order: 3,
          severity: () => 9,
          delay: 86400,
          probability: 0.85,
          generator: (e) => ({
            factions: [e.data.controllingFaction, e.data.suspectedCulprit],
            type: 'ACCUSATION',
            severity: 'CRITICAL'
          })
        }
      ]
    });

    // WAR DECLARED - Massive systemic consequences
    this.addRule('WAR_DECLARED', {
      eventType: 'WAR_DECLARED',
      description: 'War declaration cascading effects',
      conditions: [],
      consequences: [
        // 1st order
        {
          type: 'MILITARY_ALERT',
          order: 1,
          severity: () => 10,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            factions: [e.data.factionA, e.data.factionB],
            alertLevel: 'MAXIMUM',
            duration: -1  // Until war ends
          })
        },
        {
          type: 'MOBILIZATION',
          order: 1,
          severity: () => 9,
          delay: 3600,
          probability: 1.0,
          generator: (e) => ({
            factions: [e.data.factionA, e.data.factionB],
            scale: 'FULL',
            targetStrength: 'MAXIMUM'
          })
        },
        {
          type: 'TRADE_ROUTE_BLOCKED',
          order: 1,
          severity: () => 9,
          delay: 3600,
          probability: 1.0,
          generator: (e) => ({
            between: [e.data.factionA, e.data.factionB],
            reason: 'WAR',
            duration: -1
          })
        },
        {
          type: 'ALLIANCE_STRAIN',
          order: 1,
          severity: () => 7,
          delay: 0,
          probability: 0.9,
          generator: (e) => ({
            alliances: 'ALL_INVOLVING_COMBATANTS',
            strain: 0.8,
            reason: 'WAR_PRESSURE'
          })
        },
        // 2nd order
        {
          type: 'PRICE_CHANGE',
          order: 2,
          severity: () => 8,
          delay: 7200,
          probability: 1.0,
          generator: (e) => ({
            commodities: {
              WEAPONS: 2.5,
              AMMUNITION: 3.0,
              FUEL: 1.8,
              MEDICAL: 1.6,
              FOOD: 1.3
            },
            reason: 'WAR_ECONOMY'
          })
        },
        {
          type: 'PROPAGANDA_CAMPAIGN',
          order: 2,
          severity: () => 7,
          delay: 86400,
          probability: 0.95,
          generator: (e) => ({
            factions: [e.data.factionA, e.data.factionB],
            intensity: 0.9,
            target: 'ENEMY_DEMONIZATION'
          })
        },
        {
          type: 'REFUGEE_CRISIS',
          order: 2,
          severity: () => 8,
          delay: 86400 * 7,
          probability: 0.85,
          generator: (e) => ({
            from: 'BORDER_SYSTEMS',
            volume: 'MASSIVE',
            duration: -1
          })
        },
        {
          type: 'BLOCKADE',
          order: 2,
          severity: () => 9,
          delay: 86400 * 3,
          probability: 0.75,
          generator: (e) => ({
            blockader: e.data.factionA,
            target: 'KEY_ENEMY_SYSTEMS',
            type: 'NAVAL_BLOCKADE'
          })
        },
        // 3rd order
        {
          type: 'ARMS_RACE',
          order: 3,
          severity: () => 8,
          delay: 86400 * 7,
          probability: 0.7,
          generator: (e) => ({
            participants: 'ALL_MAJOR_FACTIONS',
            intensity: 0.8,
            focusAreas: ['NAVAL', 'TECHNOLOGY']
          })
        },
        {
          type: 'ECONOMIC_BOOM',
          order: 3,
          severity: () => 7,
          delay: 86400 * 14,
          probability: 0.6,
          generator: (e) => ({
            sector: 'MILITARY_INDUSTRIAL',
            regions: 'NON_COMBATANT_ZONES',
            magnitude: 2.0
          })
        },
        {
          type: 'SUPPLY_CHAIN_REORGANIZATION',
          order: 3,
          severity: () => 9,
          delay: 86400 * 30,
          probability: 0.9,
          generator: (e) => ({
            scope: 'GALACTIC',
            avoiding: [e.data.factionA, e.data.factionB],
            duration: -1
          })
        }
      ]
    });

    // TRADE_COMPLETED - Positive economic consequences
    this.addRule('TRADE_COMPLETED', {
      eventType: 'TRADE_COMPLETED',
      description: 'Successful trade consequences',
      conditions: [],
      consequences: [
        {
          type: 'RELATIONSHIP_IMPROVEMENT',
          order: 1,
          severity: () => 2,
          delay: 0,
          probability: 0.85,
          generator: (e) => ({
            entityA: e.participants[0],
            entityB: e.participants[1],
            change: 5,
            reason: 'SUCCESSFUL_TRADE'
          })
        },
        {
          type: 'ECONOMIC_BOOM',
          order: 2,
          severity: () => 3,
          delay: 3600,
          probability: 0.3,
          generator: (e) => ({
            station: e.stationId,
            magnitude: 1.1,
            duration: 86400
          })
        },
        {
          type: 'REPUTATION_CHANGE',
          order: 2,
          severity: () => 2,
          delay: 3600,
          probability: 0.5,
          generator: (e) => ({
            entity: e.participants[0],
            change: 2,
            reason: 'RELIABLE_TRADER'
          })
        }
      ]
    });

    // RESCUE - Heroic consequences
    this.addRule('RESCUE', {
      eventType: 'RESCUE',
      description: 'Rescue operation consequences',
      conditions: [],
      consequences: [
        {
          type: 'REPUTATION_CHANGE',
          order: 1,
          severity: () => 7,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            entity: e.participants[0],
            change: 15,
            reason: 'HEROIC_RESCUE'
          })
        },
        {
          type: 'MEMORY_FORMED',
          order: 1,
          severity: () => 8,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            entity: e.participants[1],
            type: 'GRATITUDE',
            towards: e.participants[0],
            intensity: 0.9
          })
        },
        {
          type: 'GOAL_CREATED',
          order: 2,
          severity: () => 6,
          delay: 86400,
          probability: 0.6,
          generator: (e) => ({
            entity: e.participants[1],
            goalType: 'REPAY_DEBT',
            target: e.participants[0],
            priority: 8
          })
        }
      ]
    });

    // DISCOVERY - Scientific consequences
    this.addRule('DISCOVERY', {
      eventType: 'DISCOVERY',
      description: 'Scientific discovery consequences',
      conditions: [],
      consequences: [
        {
          type: 'REPUTATION_CHANGE',
          order: 1,
          severity: (e) => e.severity,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            entity: e.participants[0],
            change: e.severity * 3,
            reason: 'SCIENTIFIC_DISCOVERY'
          })
        },
        {
          type: 'INVESTMENT_OPPORTUNITY',
          order: 2,
          severity: (e) => e.severity,
          delay: 86400,
          probability: 0.7,
          generator: (e) => ({
            type: e.data.discoveryType,
            potential: e.severity * 100000,
            investors: 'SEEKING'
          })
        },
        {
          type: 'PRICE_CHANGE',
          order: 2,
          severity: (e) => Math.floor(e.severity * 0.7),
          delay: 86400 * 7,
          probability: 0.6,
          generator: (e) => ({
            relatedCommodities: e.data.affectedCommodities || [],
            direction: e.data.priceDirection || 'UP',
            magnitude: 1.5
          })
        }
      ]
    });

    // ECONOMIC_CRISIS - Systemic breakdown
    this.addRule('ECONOMIC_CRISIS', {
      eventType: 'ECONOMIC_CRISIS',
      description: 'Economic crisis cascading effects',
      conditions: [],
      consequences: [
        {
          type: 'MARKET_CRASH',
          order: 1,
          severity: (e) => e.severity,
          delay: 0,
          probability: 0.9,
          generator: (e) => ({
            region: e.systemId || 'REGIONAL',
            magnitude: e.severity / 10,
            duration: 86400 * 30
          })
        },
        {
          type: 'UNEMPLOYMENT_RISE',
          order: 2,
          severity: (e) => e.severity,
          delay: 86400 * 7,
          probability: 0.85,
          generator: (e) => ({
            region: e.systemId,
            increase: e.severity * 5,  // % points
            sectors: 'ALL'
          })
        },
        {
          type: 'CIVIL_UNREST',
          order: 2,
          severity: (e) => Math.floor(e.severity * 0.9),
          delay: 86400 * 14,
          probability: 0.7,
          generator: (e) => ({
            location: e.systemId,
            type: 'PROTEST',
            intensity: e.severity / 10,
            duration: 86400 * 7
          })
        },
        {
          type: 'MIGRATION',
          order: 3,
          severity: (e) => e.severity,
          delay: 86400 * 30,
          probability: 0.75,
          generator: (e) => ({
            from: e.systemId,
            to: 'PROSPEROUS_REGIONS',
            volume: e.severity * 1000
          })
        }
      ]
    });

    // ALLIANCE_FORMED - Political consequences
    this.addRule('ALLIANCE_FORMED', {
      eventType: 'ALLIANCE_FORMED',
      description: 'Alliance formation consequences',
      conditions: [],
      consequences: [
        {
          type: 'RELATIONSHIP_IMPROVEMENT',
          order: 1,
          severity: () => 8,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            entities: e.participants,
            change: 20,
            reason: 'ALLIANCE'
          })
        },
        {
          type: 'TRADE_ROUTE_OPENED',
          order: 2,
          severity: () => 7,
          delay: 86400,
          probability: 0.9,
          generator: (e) => ({
            between: e.participants,
            tariffs: 'REDUCED',
            volume: 'INCREASED'
          })
        },
        {
          type: 'RELATIONSHIP_DETERIORATION',
          order: 2,
          severity: () => 6,
          delay: 86400,
          probability: 0.7,
          generator: (e) => ({
            entities: 'RIVALS_OF_ALLIANCE',
            change: -10,
            reason: 'ALLIANCE_THREAT'
          })
        },
        {
          type: 'ARMS_RACE',
          order: 3,
          severity: () => 7,
          delay: 86400 * 7,
          probability: 0.5,
          generator: (e) => ({
            participants: 'NON_ALLIED_FACTIONS',
            reason: 'ALLIANCE_FORMED',
            intensity: 0.6
          })
        }
      ]
    });

    // SOLAR_FLARE - Environmental disaster
    this.addRule('SOLAR_FLARE', {
      eventType: 'SOLAR_FLARE',
      description: 'Solar flare environmental consequences',
      conditions: [],
      consequences: [
        {
          type: 'COMMUNICATION_DISRUPTION',
          order: 1,
          severity: (e) => e.severity,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            systemId: e.systemId,
            intensity: e.severity * 0.1,
            duration: e.data.duration || 3600
          })
        },
        {
          type: 'STATION_DAMAGE',
          order: 2,
          severity: (e) => Math.floor(e.severity * 0.6),
          delay: 600,
          probability: 0.5,
          generator: (e) => ({
            systemId: e.systemId,
            damageType: 'ELECTRONICS',
            severity: e.severity * 0.05
          })
        },
        {
          type: 'REPAIR_NEEDED',
          order: 2,
          severity: (e) => e.severity,
          delay: 3600,
          probability: 0.7,
          generator: (e) => ({
            systemId: e.systemId,
            urgency: 'HIGH',
            cost: e.severity * 10000
          })
        }
      ]
    });

    // Add more event types...
    this.addGenericRules();
  }

  private addGenericRules(): void {
    // Generic military event consequences
    const militaryConsequences: ConsequenceTemplate[] = [
      {
        type: 'MILITARY_ALERT',
        order: 1,
        severity: (e) => Math.min(8, e.severity),
        delay: 0,
        probability: 0.7,
        generator: (e) => ({
          region: e.systemId,
          duration: 86400 * 3
        })
      },
      {
        type: 'REPUTATION_CHANGE',
        order: 2,
        severity: (e) => e.severity,
        delay: 3600,
        probability: 0.8,
        generator: (e) => ({
          entities: e.participants,
          change: e.severity * (Math.random() > 0.5 ? 1 : -1) * 3
        })
      }
    ];

    // Add to all military event types
    const militaryEvents: EventType[] = ['BATTLE', 'SKIRMISH', 'AMBUSH'];
    for (const eventType of militaryEvents) {
      this.addRule(eventType, {
        eventType,
        description: `Generic ${eventType} consequences`,
        conditions: [],
        consequences: militaryConsequences
      });
    }
  }

  // ====================================================================
  // HIGHER-ORDER CONSEQUENCE GENERATION
  // ====================================================================

  private generateHigherOrderConsequences(
    event: HistoricalEvent,
    lowerOrder: Consequence[],
    order: number
  ): Consequence[] {
    const higherOrder: Consequence[] = [];

    for (const consequence of lowerOrder.filter(c => c.order === order - 1)) {
      // Generate consequences from consequences
      const derived = this.deriveConsequences(event, consequence, order);
      higherOrder.push(...derived);
    }

    return higherOrder;
  }

  private deriveConsequences(
    event: HistoricalEvent,
    consequence: Consequence,
    order: number
  ): Consequence[] {
    const derived: Consequence[] = [];

    // Price change → behavior change
    if (consequence.type === 'PRICE_CHANGE' && Math.random() < 0.5) {
      derived.push({
        id: this.generateConsequenceId(),
        sourceEventId: consequence.sourceEventId,
        timestamp: consequence.timestamp + consequence.delay,
        type: 'BEHAVIOR_CHANGE',
        order,
        severity: Math.floor(consequence.severity * 0.7),
        affectedEntities: [],
        affectedLocations: consequence.affectedLocations,
        data: {
          entityType: 'TRADER',
          reason: 'PRICE_OPPORTUNITY',
          behaviorChange: 'SEEK_COMMODITY',
          commodity: consequence.data.commodity
        },
        delay: 3600,
        executed: false,
        probability: 0.5
      });
    }

    // Trade route blocked → shortage
    if (consequence.type === 'TRADE_ROUTE_BLOCKED' && Math.random() < 0.75) {
      derived.push({
        id: this.generateConsequenceId(),
        sourceEventId: consequence.sourceEventId,
        timestamp: consequence.timestamp + consequence.delay,
        type: 'COMMODITY_SHORTAGE',
        order,
        severity: Math.floor(consequence.severity * 0.85),
        affectedEntities: [],
        affectedLocations: consequence.affectedLocations,
        data: {
          reason: 'TRADE_ROUTE_BLOCKED',
          severity: consequence.severity
        },
        delay: 7200,
        executed: false,
        probability: 0.75
      });
    }

    // Commodity shortage → price spike
    if (consequence.type === 'COMMODITY_SHORTAGE' && Math.random() < 0.8) {
      derived.push({
        id: this.generateConsequenceId(),
        sourceEventId: consequence.sourceEventId,
        timestamp: consequence.timestamp + consequence.delay,
        type: 'PRICE_CHANGE',
        order,
        severity: Math.floor(consequence.severity * 0.9),
        affectedEntities: [],
        affectedLocations: consequence.affectedLocations,
        data: {
          commodities: consequence.data.commodities,
          priceMultiplier: 2.0 + (consequence.severity * 0.1),
          reason: 'SHORTAGE'
        },
        delay: 1800,
        executed: false,
        probability: 0.8
      });
    }

    // Military alert → patrol increase
    if (consequence.type === 'MILITARY_ALERT' && Math.random() < 0.7) {
      derived.push({
        id: this.generateConsequenceId(),
        sourceEventId: consequence.sourceEventId,
        timestamp: consequence.timestamp + consequence.delay,
        type: 'PATROL_INCREASE',
        order,
        severity: Math.floor(consequence.severity * 0.8),
        affectedEntities: [],
        affectedLocations: consequence.affectedLocations,
        data: {
          reason: 'MILITARY_ALERT',
          duration: 86400 * 7
        },
        delay: 3600,
        executed: false,
        probability: 0.7
      });
    }

    // Reputation change → relationship change
    if (consequence.type === 'REPUTATION_CHANGE' && Math.abs(consequence.data.change) > 10) {
      const relationshipType = consequence.data.change > 0 ?
        'RELATIONSHIP_IMPROVEMENT' : 'RELATIONSHIP_DETERIORATION';

      derived.push({
        id: this.generateConsequenceId(),
        sourceEventId: consequence.sourceEventId,
        timestamp: consequence.timestamp + consequence.delay,
        type: relationshipType,
        order,
        severity: Math.floor(consequence.severity * 0.6),
        affectedEntities: [],
        affectedLocations: consequence.affectedLocations,
        data: {
          entity: consequence.data.entity,
          change: Math.floor(consequence.data.change * 0.5),
          reason: 'REPUTATION_IMPACT'
        },
        delay: 7200,
        executed: false,
        probability: 0.6
      });
    }

    return derived;
  }

  // ====================================================================
  // HELPER METHODS
  // ====================================================================

  private addRule(eventType: EventType, rule: ConsequenceRule): void {
    if (!this.rules.has(eventType)) {
      this.rules.set(eventType, []);
    }
    this.rules.get(eventType)!.push(rule);
  }

  private evaluateConditions(conditions: ConsequenceCondition[], event: HistoricalEvent): boolean {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'SEVERITY_THRESHOLD':
          if (event.severity < condition.value) return false;
          break;

        case 'PARTICIPANT_COUNT':
          if (event.participants.length < condition.value) return false;
          break;

        case 'DATA_FIELD_EXISTS':
          if (!event.data || !(condition.field! in event.data)) return false;
          break;

        case 'DATA_VALUE_THRESHOLD':
          if (!event.data || !condition.field) return false;
          const value = event.data[condition.field];
          const threshold = condition.value;
          const comparator = condition.comparator || 'GT';

          if (comparator === 'GT' && value <= threshold) return false;
          if (comparator === 'LT' && value >= threshold) return false;
          if (comparator === 'GTE' && value < threshold) return false;
          if (comparator === 'LTE' && value > threshold) return false;
          if (comparator === 'EQ' && value !== threshold) return false;
          break;

        default:
          // Unknown condition types pass by default
          break;
      }
    }

    return true;
  }

  private extractAffectedEntities(event: HistoricalEvent, template: ConsequenceTemplate): string[] {
    return event.participants;
  }

  private extractAffectedLocations(event: HistoricalEvent): string[] {
    const locations: string[] = [];

    if (event.systemId) locations.push(event.systemId);
    if (event.stationId) locations.push(event.stationId);

    return locations;
  }

  private trackConsequence(consequence: Consequence): void {
    this.totalConsequences++;

    const typeCount = this.consequencesByType.get(consequence.type) || 0;
    this.consequencesByType.set(consequence.type, typeCount + 1);

    const orderCount = this.consequencesByOrder.get(consequence.order) || 0;
    this.consequencesByOrder.set(consequence.order, orderCount + 1);
  }

  private isEconomicConsequence(type: ConsequenceType): boolean {
    const economic = [
      'PRICE_CHANGE', 'SUPPLY_DISRUPTION', 'DEMAND_SPIKE', 'TRADE_ROUTE_BLOCKED',
      'COMMODITY_SHORTAGE', 'INFLATION', 'DEFLATION', 'MARKET_VOLATILITY',
      'ECONOMIC_BOOM', 'RECESSION', 'MARKET_CRASH', 'INVESTMENT_OPPORTUNITY'
    ];
    return economic.includes(type);
  }

  private isDiplomaticConsequence(type: ConsequenceType): boolean {
    const diplomatic = [
      'REPUTATION_CHANGE', 'RELATIONSHIP_DETERIORATION', 'RELATIONSHIP_IMPROVEMENT',
      'ALLIANCE_STRAIN', 'WAR_LIKELIHOOD_INCREASE', 'PEACE_OPPORTUNITY',
      'DIPLOMATIC_INCIDENT', 'SANCTIONS_IMPOSED'
    ];
    return diplomatic.includes(type);
  }

  private isMilitaryConsequence(type: ConsequenceType): boolean {
    const military = [
      'PATROL_INCREASE', 'MILITARY_ALERT', 'DEFENSE_UPGRADE', 'BOUNTY_POSTED',
      'MOBILIZATION', 'ARMS_RACE', 'BLOCKADE', 'ESPIONAGE_INCREASE'
    ];
    return military.includes(type);
  }

  private isSocialConsequence(type: ConsequenceType): boolean {
    const social = [
      'POPULATION_FEAR', 'POPULATION_ANGER', 'CIVIL_UNREST', 'MIGRATION',
      'MORALE_CHANGE', 'PROTEST', 'REFUGEE_CRISIS', 'PROPAGANDA_CAMPAIGN'
    ];
    return social.includes(type);
  }

  private generateConsequenceId(): string {
    return `consequence_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public getPendingCount(): number {
    return this.pendingConsequences.length;
  }

  public getStatistics(): {
    totalConsequences: number;
    consequencesByType: Map<ConsequenceType, number>;
    consequencesByOrder: Map<number, number>;
    pendingConsequences: number;
    executedConsequences: number;
  } {
    return {
      totalConsequences: this.totalConsequences,
      consequencesByType: new Map(this.consequencesByType),
      consequencesByOrder: new Map(this.consequencesByOrder),
      pendingConsequences: this.pendingConsequences.length,
      executedConsequences: this.executedConsequences.length
    };
  }

  public getConsequenceChain(eventId: string): Consequence[] {
    return this.executedConsequences.filter(c => c.sourceEventId === eventId);
  }
}
