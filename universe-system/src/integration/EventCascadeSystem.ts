/**
 * Event Cascade System
 *
 * Events trigger other events in chain reactions:
 * - Solar flare → Ships flee → Trade route disrupted → Price spike → Opportunistic traders rush in
 * - Pirate attack → Distress call → Patrol responds → Combat → Faction tensions rise
 * - Station destroyed → Refugees flee → Overcrowding → Disease outbreak
 * - Resource discovery → Mining rush → Territory conflicts → War
 *
 * This creates EMERGENT STORYTELLING!
 */

import { HistoricalEvent } from '../simulation/HistoricalMemorySystem';
import { Vector3 } from '../CelestialBody';

export interface CascadeRule {
  id: string;
  name: string;
  description: string;

  // When does this cascade trigger?
  triggerEventType: string;
  triggerConditions: CascadeTriggerCondition[];

  // What events does it generate?
  cascadedEvents: CascadeEventTemplate[];

  // How likely is it to trigger?
  probability: number; // 0-1

  // How long to wait before cascading?
  delay: number; // seconds
}

export interface CascadeTriggerCondition {
  type: 'SEVERITY' | 'LOCATION' | 'PARTICIPANTS' | 'CATEGORY' | 'DATA';
  operator: '>' | '<' | '=' | 'CONTAINS' | 'IN_RANGE';
  value: any;
}

export interface CascadeEventTemplate {
  type: string;
  severityMultiplier: number; // Multiply original event severity
  category: string;
  descriptionTemplate: string; // Use {variable} for substitution
  participantRule: 'SAME' | 'NEARBY' | 'FACTION' | 'RANDOM';
  dataTransform?: (originalData: any) => any;
}

export interface CascadeChain {
  id: string;
  rootEvent: HistoricalEvent;
  cascadedEvents: HistoricalEvent[];
  totalSeverity: number;
  chainLength: number;
  startTime: number;
  endTime?: number;
  active: boolean;
}

/**
 * Manages event cascades and chain reactions
 */
export class EventCascadeSystem {
  private rules: Map<string, CascadeRule> = new Map();
  private cascadeChains: Map<string, CascadeChain> = new Map();
  private pendingCascades: Array<{
    rule: CascadeRule;
    triggerEvent: HistoricalEvent;
    executeAt: number;
  }> = [];

  private currentTime: number = 0;

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default cascade rules
   */
  private initializeDefaultRules(): void {
    // Solar flare → Trade disruption
    this.addRule({
      id: 'solar_flare_disruption',
      name: 'Solar Flare Trade Disruption',
      description: 'Solar flare causes ships to flee, disrupting trade routes',
      triggerEventType: 'SOLAR_STORM',
      triggerConditions: [
        { type: 'SEVERITY', operator: '>', value: 5 }
      ],
      cascadedEvents: [
        {
          type: 'TRADE_DISRUPTION',
          severityMultiplier: 0.8,
          category: 'ECONOMIC',
          descriptionTemplate: 'Trade route disrupted due to solar flare',
          participantRule: 'NEARBY'
        },
        {
          type: 'PRICE_SPIKE',
          severityMultiplier: 0.6,
          category: 'ECONOMIC',
          descriptionTemplate: 'Commodity prices spike due to supply disruption',
          participantRule: 'FACTION'
        }
      ],
      probability: 0.8,
      delay: 10
    });

    // Pirate attack → Security response
    this.addRule({
      id: 'pirate_security_response',
      name: 'Pirate Security Response',
      description: 'Pirate attack triggers security patrol response',
      triggerEventType: 'COMBAT',
      triggerConditions: [
        { type: 'PARTICIPANTS', operator: 'CONTAINS', value: 'PIRATE' },
        { type: 'SEVERITY', operator: '>', value: 6 }
      ],
      cascadedEvents: [
        {
          type: 'SECURITY_ALERT',
          severityMultiplier: 0.7,
          category: 'MILITARY',
          descriptionTemplate: 'Security alert issued in response to pirate activity',
          participantRule: 'FACTION'
        },
        {
          type: 'PATROL_DISPATCH',
          severityMultiplier: 0.6,
          category: 'MILITARY',
          descriptionTemplate: 'Patrol ships dispatched to hunt pirates',
          participantRule: 'NEARBY'
        }
      ],
      probability: 0.9,
      delay: 5
    });

    // Ship destroyed → Salvage opportunity
    this.addRule({
      id: 'ship_destroyed_salvage',
      name: 'Salvage Opportunity',
      description: 'Destroyed ship creates salvage opportunity',
      triggerEventType: 'SHIP_DESTROYED',
      triggerConditions: [
        { type: 'SEVERITY', operator: '>', value: 7 }
      ],
      cascadedEvents: [
        {
          type: 'SALVAGE_OPPORTUNITY',
          severityMultiplier: 0.5,
          category: 'ECONOMIC',
          descriptionTemplate: 'Salvage crews report valuable wreckage',
          participantRule: 'NEARBY'
        }
      ],
      probability: 0.7,
      delay: 15
    });

    // Resource discovery → Mining rush
    this.addRule({
      id: 'resource_discovery_rush',
      name: 'Mining Rush',
      description: 'Resource discovery triggers mining rush',
      triggerEventType: 'RESOURCE_DISCOVERY',
      triggerConditions: [
        { type: 'DATA', operator: '>', value: { resourceValue: 1000 } }
      ],
      cascadedEvents: [
        {
          type: 'MINING_RUSH',
          severityMultiplier: 0.9,
          category: 'ECONOMIC',
          descriptionTemplate: 'Mining rush begins as news of discovery spreads',
          participantRule: 'RANDOM'
        },
        {
          type: 'TERRITORY_CLAIM',
          severityMultiplier: 0.8,
          category: 'POLITICAL',
          descriptionTemplate: 'Factions begin claiming territory around discovery',
          participantRule: 'FACTION'
        }
      ],
      probability: 0.85,
      delay: 20
    });

    // Territory claim → Diplomatic tension
    this.addRule({
      id: 'territory_tension',
      name: 'Territorial Tensions',
      description: 'Territory claims create diplomatic tensions',
      triggerEventType: 'TERRITORY_CLAIM',
      triggerConditions: [
        { type: 'SEVERITY', operator: '>', value: 6 }
      ],
      cascadedEvents: [
        {
          type: 'DIPLOMATIC_INCIDENT',
          severityMultiplier: 0.7,
          category: 'POLITICAL',
          descriptionTemplate: 'Diplomatic tensions rise over territorial dispute',
          participantRule: 'FACTION'
        },
        {
          type: 'MILITARY_BUILDUP',
          severityMultiplier: 0.6,
          category: 'MILITARY',
          descriptionTemplate: 'Military forces deployed to contested region',
          participantRule: 'FACTION'
        }
      ],
      probability: 0.6,
      delay: 30
    });

    // Distress call → Rescue mission
    this.addRule({
      id: 'distress_rescue',
      name: 'Rescue Mission',
      description: 'Distress call triggers rescue mission',
      triggerEventType: 'DISTRESS',
      triggerConditions: [
        { type: 'SEVERITY', operator: '>', value: 5 }
      ],
      cascadedEvents: [
        {
          type: 'RESCUE_MISSION',
          severityMultiplier: 0.8,
          category: 'PERSONAL',
          descriptionTemplate: 'Rescue mission launched in response to distress call',
          participantRule: 'NEARBY'
        }
      ],
      probability: 0.75,
      delay: 3
    });

    // Station damaged → Refugee crisis
    this.addRule({
      id: 'station_damage_refugees',
      name: 'Refugee Crisis',
      description: 'Damaged station creates refugee crisis',
      triggerEventType: 'STATION_DAMAGED',
      triggerConditions: [
        { type: 'SEVERITY', operator: '>', value: 8 }
      ],
      cascadedEvents: [
        {
          type: 'REFUGEE_CRISIS',
          severityMultiplier: 0.9,
          category: 'HUMANITARIAN',
          descriptionTemplate: 'Refugees flee damaged station, creating crisis',
          participantRule: 'NEARBY'
        },
        {
          type: 'HUMANITARIAN_AID',
          severityMultiplier: 0.7,
          category: 'HUMANITARIAN',
          descriptionTemplate: 'Aid organizations mobilize to help refugees',
          participantRule: 'FACTION'
        }
      ],
      probability: 0.8,
      delay: 10
    });
  }

  /**
   * Add a cascade rule
   */
  public addRule(rule: CascadeRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Process an event and check for cascades
   */
  public processEvent(event: HistoricalEvent, currentTime: number): HistoricalEvent[] {
    this.currentTime = currentTime;
    const cascadedEvents: HistoricalEvent[] = [];

    // Check all rules
    for (const rule of this.rules.values()) {
      if (this.shouldTriggerCascade(event, rule)) {
        // Schedule cascade
        this.pendingCascades.push({
          rule,
          triggerEvent: event,
          executeAt: currentTime + rule.delay
        });
      }
    }

    return cascadedEvents;
  }

  /**
   * Update cascade system
   */
  public update(deltaTime: number): HistoricalEvent[] {
    this.currentTime += deltaTime;
    const generatedEvents: HistoricalEvent[] = [];

    // Process pending cascades
    const toExecute = this.pendingCascades.filter(p => p.executeAt <= this.currentTime);
    this.pendingCascades = this.pendingCascades.filter(p => p.executeAt > this.currentTime);

    for (const pending of toExecute) {
      const events = this.executeCascade(pending.rule, pending.triggerEvent);
      generatedEvents.push(...events);

      // Update cascade chain
      this.updateCascadeChain(pending.triggerEvent, events);
    }

    return generatedEvents;
  }

  /**
   * Check if cascade should trigger
   */
  private shouldTriggerCascade(event: HistoricalEvent, rule: CascadeRule): boolean {
    // Check event type
    if (event.type !== rule.triggerEventType) {
      return false;
    }

    // Check probability
    if (Math.random() > rule.probability) {
      return false;
    }

    // Check conditions
    for (const condition of rule.triggerConditions) {
      if (!this.evaluateCondition(event, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a trigger condition
   */
  private evaluateCondition(event: HistoricalEvent, condition: CascadeTriggerCondition): boolean {
    switch (condition.type) {
      case 'SEVERITY':
        return this.compareValues(event.severity, condition.operator, condition.value);

      case 'CATEGORY':
        return condition.operator === '=' ? event.category === condition.value : true;

      case 'PARTICIPANTS':
        if (condition.operator === 'CONTAINS') {
          return event.participants.some(p => p.includes(condition.value));
        }
        return true;

      case 'LOCATION':
        // Would check location range
        return true;

      case 'DATA':
        // Would check event data
        return true;

      default:
        return true;
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(a: any, operator: string, b: any): boolean {
    switch (operator) {
      case '>': return a > b;
      case '<': return a < b;
      case '=': return a === b;
      default: return false;
    }
  }

  /**
   * Execute a cascade
   */
  private executeCascade(rule: CascadeRule, triggerEvent: HistoricalEvent): HistoricalEvent[] {
    const events: HistoricalEvent[] = [];

    for (const template of rule.cascadedEvents) {
      const event = this.generateEventFromTemplate(template, triggerEvent, rule);
      events.push(event);
    }

    return events;
  }

  /**
   * Generate event from template
   */
  private generateEventFromTemplate(
    template: CascadeEventTemplate,
    triggerEvent: HistoricalEvent,
    rule: CascadeRule
  ): HistoricalEvent {
    const id = `cascade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate severity
    const severity = Math.floor(triggerEvent.severity * template.severityMultiplier);

    // Determine participants
    const participants = this.getParticipants(template.participantRule, triggerEvent);

    // Transform data
    const data = template.dataTransform ?
      template.dataTransform(triggerEvent.data) :
      { cascadedFrom: triggerEvent.id, originalType: triggerEvent.type };

    return {
      id,
      timestamp: this.currentTime,
      type: template.type,
      severity,
      category: template.category,
      location: triggerEvent.location,
      participants,
      description: this.fillTemplate(template.descriptionTemplate, triggerEvent),
      data,
      consequences: [],
      witnessed: false,
      priority: severity,
      tags: ['cascade', 'automated', rule.id]
    };
  }

  /**
   * Get participants based on rule
   */
  private getParticipants(rule: string, triggerEvent: HistoricalEvent): string[] {
    switch (rule) {
      case 'SAME':
        return [...triggerEvent.participants];

      case 'NEARBY':
        // Would query nearby entities
        return triggerEvent.participants.slice(0, 1);

      case 'FACTION':
        // Would query faction members
        return [];

      case 'RANDOM':
        return [];

      default:
        return [];
    }
  }

  /**
   * Fill template with event data
   */
  private fillTemplate(template: string, event: HistoricalEvent): string {
    return template
      .replace('{type}', event.type)
      .replace('{severity}', event.severity.toString())
      .replace('{location}', `(${event.location.x.toFixed(0)}, ${event.location.y.toFixed(0)}, ${event.location.z.toFixed(0)})`);
  }

  /**
   * Update cascade chain
   */
  private updateCascadeChain(rootEvent: HistoricalEvent, cascadedEvents: HistoricalEvent[]): void {
    // Find existing chain or create new one
    let chain = this.findChainForEvent(rootEvent.id);

    if (!chain) {
      chain = {
        id: `chain_${rootEvent.id}`,
        rootEvent,
        cascadedEvents: [],
        totalSeverity: rootEvent.severity,
        chainLength: 1,
        startTime: rootEvent.timestamp,
        active: true
      };
      this.cascadeChains.set(chain.id, chain);
    }

    // Add cascaded events
    chain.cascadedEvents.push(...cascadedEvents);
    chain.chainLength += cascadedEvents.length;
    chain.totalSeverity += cascadedEvents.reduce((sum, e) => sum + e.severity, 0);
  }

  /**
   * Find chain for event
   */
  private findChainForEvent(eventId: string): CascadeChain | undefined {
    for (const chain of this.cascadeChains.values()) {
      if (chain.rootEvent.id === eventId) {
        return chain;
      }
      if (chain.cascadedEvents.some(e => e.id === eventId)) {
        return chain;
      }
    }
    return undefined;
  }

  /**
   * Get active cascade chains
   */
  public getActiveCascades(): CascadeChain[] {
    return Array.from(this.cascadeChains.values()).filter(c => c.active);
  }

  /**
   * Get cascade statistics
   */
  public getStats() {
    const chains = Array.from(this.cascadeChains.values());

    return {
      totalChains: chains.length,
      activeChains: chains.filter(c => c.active).length,
      longestChain: Math.max(...chains.map(c => c.chainLength), 0),
      highestSeverityChain: Math.max(...chains.map(c => c.totalSeverity), 0),
      pendingCascades: this.pendingCascades.length,
      totalRules: this.rules.size
    };
  }

  /**
   * Get recent cascade chains
   */
  public getRecentChains(count: number = 10): CascadeChain[] {
    return Array.from(this.cascadeChains.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, count);
  }
}
