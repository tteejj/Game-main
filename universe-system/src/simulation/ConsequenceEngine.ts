/**
 * ConsequenceEngine - Cascading consequence processor
 *
 * This is the "nervous system" of the living universe. It takes events and generates
 * cascading consequences that ripple through the simulation.
 *
 * Key features:
 * - First, second, and third-order consequences
 * - Economic ripple effects
 * - Political ramifications
 * - Social impacts
 * - Environmental changes
 */

import { HistoricalEvent, EventType } from './HistoricalMemorySystem';
import { Vector3 } from '../types';

export interface Consequence {
  // Identity
  id: string;
  sourceEventId: string;          // Event that caused this
  timestamp: number;              // When consequence takes effect

  // Type
  type: ConsequenceType;
  order: number;                  // 1st, 2nd, 3rd order consequence

  // Impact
  severity: number;               // 1-10
  affectedEntities: string[];     // Who is affected

  // Data
  data: any;                      // Consequence-specific data
  event?: HistoricalEvent;        // If consequence spawns new event

  // Execution
  delay: number;                  // Delay before taking effect (seconds)
  executed: boolean;
}

export type ConsequenceType =
  // Economic
  | 'PRICE_CHANGE' | 'SUPPLY_DISRUPTION' | 'DEMAND_SPIKE'
  | 'TRADE_ROUTE_BLOCKED' | 'TRADE_ROUTE_OPENED'
  | 'COMMODITY_SHORTAGE' | 'COMMODITY_SURPLUS'
  | 'INFLATION' | 'DEFLATION' | 'MARKET_VOLATILITY'

  // Diplomatic
  | 'REPUTATION_CHANGE' | 'RELATIONSHIP_DETERIORATION'
  | 'RELATIONSHIP_IMPROVEMENT' | 'ALLIANCE_STRAIN'
  | 'WAR_LIKELIHOOD_INCREASE' | 'PEACE_OPPORTUNITY'

  // Social
  | 'POPULATION_FEAR' | 'POPULATION_ANGER' | 'POPULATION_CELEBRATION'
  | 'CIVIL_UNREST' | 'MIGRATION' | 'MORALE_CHANGE'

  // Military
  | 'PATROL_INCREASE' | 'PATROL_DECREASE'
  | 'MILITARY_ALERT' | 'DEFENSE_UPGRADE'
  | 'BOUNTY_POSTED' | 'WANTED_STATUS'

  // Infrastructure
  | 'STATION_DAMAGE' | 'STATION_UPGRADE' | 'STATION_CLOSURE'
  | 'COMMUNICATION_DISRUPTION' | 'POWER_OUTAGE'
  | 'REPAIR_NEEDED'

  // Entity behavior
  | 'ENTITY_ACTION' | 'BEHAVIOR_CHANGE' | 'GOAL_CREATED'
  | 'GOAL_ABANDONED' | 'MEMORY_FORMED' | 'TRAUMA_INFLICTED'

  // Environmental
  | 'ENVIRONMENTAL_DAMAGE' | 'RESOURCE_DEPLETION'
  | 'HAZARD_CREATED' | 'HAZARD_CLEARED'

  // Meta
  | 'SPAWN_EVENT' | 'TRIGGER_CHAIN' | 'PROBABILITY_CHANGE';

export interface ConsequenceRule {
  eventType: EventType;
  conditions: ConsequenceCondition[];
  consequences: ConsequenceTemplate[];
}

export interface ConsequenceCondition {
  type: 'SEVERITY_THRESHOLD' | 'LOCATION_TYPE' | 'PARTICIPANT_TYPE'
       | 'TIME_OF_DAY' | 'ECONOMIC_STATE' | 'POLITICAL_STATE';
  value: any;
}

export interface ConsequenceTemplate {
  type: ConsequenceType;
  order: number;
  severity: (event: HistoricalEvent) => number;
  delay: number;
  probability: number;            // 0-1
  generator: (event: HistoricalEvent) => any;
}

export class ConsequenceEngine {
  // Consequence rules
  private rules: Map<EventType, ConsequenceRule[]> = new Map();

  // Pending consequences (delayed execution)
  private pendingConsequences: Consequence[] = [];

  // Statistics
  private totalConsequences: number = 0;
  private consequencesByType: Map<ConsequenceType, number> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Process event and generate immediate consequences
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
          affectedEntities: [],
          data: template.generator(event),
          delay: template.delay,
          executed: false
        };

        consequences.push(consequence);
        this.totalConsequences++;

        // Track by type
        const count = this.consequencesByType.get(template.type) || 0;
        this.consequencesByType.set(template.type, count + 1);

        // If delayed, add to pending
        if (template.delay > 0) {
          this.pendingConsequences.push(consequence);
        }
      }
    }

    // Generate second-order consequences
    const secondOrder = this.generateSecondOrderConsequences(event, consequences);
    consequences.push(...secondOrder);

    console.log(`[CONSEQUENCE] ${event.type} → ${consequences.length} consequences`);

    return consequences;
  }

  /**
   * Process long-term effects of past events
   */
  public processLongTermEffects(event: HistoricalEvent, currentTime: number): Consequence[] {
    const consequences: Consequence[] = [];

    // Check for delayed consequences that should now trigger
    const elapsed = currentTime - event.timestamp;

    // Examples of long-term effects:

    // Station destroyed → trade routes adapt (after 24 hours)
    if (event.type === 'STATION_DESTROYED' && elapsed > 86400 && elapsed < 86400 + 3600) {
      consequences.push({
        id: this.generateConsequenceId(),
        sourceEventId: event.id,
        timestamp: currentTime,
        type: 'TRADE_ROUTE_OPENED',
        order: 2,
        severity: 5,
        affectedEntities: [],
        data: {
          reason: 'Alternative routes established after station destruction',
          newRoutes: this.generateAlternativeRoutes(event)
        },
        delay: 0,
        executed: false
      });
    }

    // War declared → economy adjusts (over days/weeks)
    if (event.type === 'WAR_DECLARED') {
      if (elapsed > 86400 && elapsed < 86400 + 3600) {
        // After 1 day: Military spending increases
        consequences.push(this.createWarEconomyConsequence(event, 'EARLY_WAR'));
      }

      if (elapsed > 604800 && elapsed < 604800 + 3600) {
        // After 1 week: Supply chains disrupted
        consequences.push(this.createWarEconomyConsequence(event, 'MID_WAR'));
      }
    }

    return consequences;
  }

  /**
   * Update pending consequences
   */
  public updatePendingConsequences(currentTime: number): Consequence[] {
    const readyConsequences: Consequence[] = [];

    // Find consequences ready to execute
    this.pendingConsequences = this.pendingConsequences.filter(consequence => {
      const elapsed = currentTime - consequence.timestamp;

      if (elapsed >= consequence.delay && !consequence.executed) {
        consequence.executed = true;
        readyConsequences.push(consequence);
        return false; // Remove from pending
      }

      return true; // Keep in pending
    });

    return readyConsequences;
  }

  /**
   * Get pending consequence count
   */
  public getPendingCount(): number {
    return this.pendingConsequences.length;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalConsequences: number;
    consequencesByType: Map<ConsequenceType, number>;
    pendingConsequences: number;
  } {
    return {
      totalConsequences: this.totalConsequences,
      consequencesByType: new Map(this.consequencesByType),
      pendingConsequences: this.pendingConsequences.length
    };
  }

  // ====================================================================
  // PRIVATE METHODS: Rule System
  // ====================================================================

  private initializeRules(): void {
    // PIRATE RAID rules
    this.addRule('PIRATE_RAID', {
      eventType: 'PIRATE_RAID',
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
            change: -e.severity * 5
          })
        },
        {
          type: 'PATROL_INCREASE',
          order: 1,
          severity: (e) => e.severity,
          delay: 3600, // 1 hour
          probability: 0.8,
          generator: (e) => ({
            location: e.location,
            duration: 86400, // 24 hours
            intensity: e.severity * 0.2
          })
        },

        // 2nd order: Economic ripples
        {
          type: 'PRICE_CHANGE',
          order: 2,
          severity: (e) => Math.floor(e.severity * 0.8),
          delay: 7200, // 2 hours
          probability: 0.6,
          generator: (e) => ({
            commodity: 'INSURANCE',
            priceMultiplier: 1 + (e.severity * 0.05),
            region: e.systemId
          })
        },

        // 3rd order: Behavioral changes
        {
          type: 'BEHAVIOR_CHANGE',
          order: 3,
          severity: (e) => Math.floor(e.severity * 0.5),
          delay: 86400, // 24 hours
          probability: 0.7,
          generator: (e) => ({
            entityType: 'TRADER',
            region: e.systemId,
            behaviorChange: 'AVOID_REGION',
            duration: 604800 // 1 week
          })
        }
      ]
    });

    // STATION DESTROYED rules
    this.addRule('STATION_DESTROYED', {
      eventType: 'STATION_DESTROYED',
      conditions: [],
      consequences: [
        // 1st order: Immediate
        {
          type: 'TRADE_ROUTE_BLOCKED',
          order: 1,
          severity: (e) => 10,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            stationId: e.stationId,
            affectedRoutes: this.findRoutesThrough(e.stationId)
          })
        },
        {
          type: 'POPULATION_FEAR',
          order: 1,
          severity: (e) => 9,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            systemId: e.systemId,
            intensity: 0.8,
            duration: 172800 // 2 days
          })
        },

        // 2nd order: Supply chain breakdown
        {
          type: 'COMMODITY_SHORTAGE',
          order: 2,
          severity: (e) => 8,
          delay: 3600,
          probability: 0.9,
          generator: (e) => ({
            commodities: e.data.stationProduction || [],
            affectedStations: this.findDependentStations(e.stationId),
            severityMultiplier: 2.0
          })
        },

        // 3rd order: Political consequences
        {
          type: 'WAR_LIKELIHOOD_INCREASE',
          order: 3,
          severity: (e) => 7,
          delay: 86400,
          probability: 0.5,
          generator: (e) => ({
            factionA: e.data.controllingFaction,
            factionB: e.initiator,
            reason: 'REVENGE_FOR_STATION_DESTRUCTION',
            probability: 0.3
          })
        }
      ]
    });

    // SOLAR FLARE rules
    this.addRule('SOLAR_FLARE', {
      eventType: 'SOLAR_FLARE',
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
          severity: (e) => Math.floor(e.severity * 0.7),
          delay: 600,
          probability: 0.4,
          generator: (e) => ({
            systemId: e.systemId,
            damageType: 'ELECTRONICS',
            severity: e.severity * 0.05
          })
        }
      ]
    });

    // TRADE COMPLETED rules
    this.addRule('TRADE_COMPLETED', {
      eventType: 'TRADE_COMPLETED',
      conditions: [],
      consequences: [
        {
          type: 'RELATIONSHIP_IMPROVEMENT',
          order: 1,
          severity: () => 2,
          delay: 0,
          probability: 0.8,
          generator: (e) => ({
            entityA: e.participants[0],
            entityB: e.participants[1],
            change: 5
          })
        },
        {
          type: 'SUPPLY_DISRUPTION',
          order: 2,
          severity: () => 3,
          delay: 1800,
          probability: 0.1,
          generator: (e) => ({
            stationId: e.stationId,
            commodity: e.data.commodity,
            reason: 'SOLD_OUT'
          })
        }
      ]
    });

    // WAR DECLARED rules
    this.addRule('WAR_DECLARED', {
      eventType: 'WAR_DECLARED',
      conditions: [],
      consequences: [
        {
          type: 'MILITARY_ALERT',
          order: 1,
          severity: () => 10,
          delay: 0,
          probability: 1.0,
          generator: (e) => ({
            factions: [e.data.factionA, e.data.factionB],
            alertLevel: 'MAXIMUM'
          })
        },
        {
          type: 'TRADE_ROUTE_BLOCKED',
          order: 2,
          severity: () => 8,
          delay: 3600,
          probability: 1.0,
          generator: (e) => ({
            between: [e.data.factionA, e.data.factionB],
            reason: 'WAR'
          })
        },
        {
          type: 'PRICE_CHANGE',
          order: 2,
          severity: () => 7,
          delay: 7200,
          probability: 0.9,
          generator: (e) => ({
            commodity: 'WEAPONS',
            priceMultiplier: 2.0,
            reason: 'WAR_DEMAND'
          })
        }
      ]
    });

    // Add more rules as needed...
  }

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

        case 'LOCATION_TYPE':
          // Check if event location matches
          // TODO: Implement location type checking
          break;

        case 'PARTICIPANT_TYPE':
          // Check if participants match type
          // TODO: Implement participant type checking
          break;

        default:
          console.warn(`Unknown condition type: ${condition.type}`);
      }
    }

    return true;
  }

  private generateSecondOrderConsequences(
    event: HistoricalEvent,
    firstOrder: Consequence[]
  ): Consequence[] {
    const secondOrder: Consequence[] = [];

    // Generate consequences from consequences
    for (const consequence of firstOrder) {
      if (consequence.order !== 1) continue;

      // Example: Price change → trader behavior change
      if (consequence.type === 'PRICE_CHANGE' && Math.random() < 0.5) {
        secondOrder.push({
          id: this.generateConsequenceId(),
          sourceEventId: consequence.sourceEventId,
          timestamp: consequence.timestamp,
          type: 'BEHAVIOR_CHANGE',
          order: 2,
          severity: Math.floor(consequence.severity * 0.7),
          affectedEntities: [],
          data: {
            entityType: 'TRADER',
            reason: 'PRICE_OPPORTUNITY',
            behaviorChange: 'SEEK_COMMODITY',
            commodity: consequence.data.commodity
          },
          delay: consequence.delay + 3600,
          executed: false
        });
      }

      // Example: Trade route blocked → shortage
      if (consequence.type === 'TRADE_ROUTE_BLOCKED' && Math.random() < 0.7) {
        secondOrder.push({
          id: this.generateConsequenceId(),
          sourceEventId: consequence.sourceEventId,
          timestamp: consequence.timestamp,
          type: 'COMMODITY_SHORTAGE',
          order: 2,
          severity: Math.floor(consequence.severity * 0.8),
          affectedEntities: consequence.data.affectedStations || [],
          data: {
            commodities: consequence.data.commodities || [],
            reason: 'TRADE_ROUTE_BLOCKED'
          },
          delay: consequence.delay + 7200,
          executed: false
        });
      }
    }

    return secondOrder;
  }

  private createWarEconomyConsequence(event: HistoricalEvent, phase: string): Consequence {
    return {
      id: this.generateConsequenceId(),
      sourceEventId: event.id,
      timestamp: event.timestamp,
      type: 'PRICE_CHANGE',
      order: 2,
      severity: 7,
      affectedEntities: [],
      data: {
        phase,
        commodities: ['WEAPONS', 'FUEL', 'ELECTRONICS'],
        priceMultipliers: { WEAPONS: 1.5, FUEL: 1.3, ELECTRONICS: 1.2 }
      },
      delay: 0,
      executed: false
    };
  }

  // ====================================================================
  // HELPER METHODS (Stubs - to be integrated with universe systems)
  // ====================================================================

  private findRoutesThrough(stationId: string | undefined): string[] {
    // TODO: Query trade route system
    return [];
  }

  private findDependentStations(stationId: string | undefined): string[] {
    // TODO: Query supply chain system
    return [];
  }

  private generateAlternativeRoutes(event: HistoricalEvent): any[] {
    // TODO: Calculate new optimal routes
    return [];
  }

  private generateConsequenceId(): string {
    return `consequence_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
