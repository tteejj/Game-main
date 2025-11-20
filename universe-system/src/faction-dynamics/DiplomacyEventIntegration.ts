/**
 * DiplomacyEventIntegration.ts
 *
 * Integrates FactionDiplomacyEngine with UniverseEventSystem to create
 * a fully responsive diplomatic system where:
 * - Conquest triggers diplomatic crises
 * - Trade improves relations quantifiably
 * - Research unlocks new diplomatic actions
 * - All major events affect diplomacy
 *
 * This makes diplomacy feel ALIVE and REACTIVE to game events.
 */

import {
  EventBus,
  UniverseEvent,
  UniverseEventType,
  EventPriority,
} from '../UniverseEventSystem';
import {
  FactionDiplomacyEngine,
  DiplomaticInteraction,
  InteractionType,
  FactionRelationship,
  Treaty,
  TreatyType,
} from './FactionDiplomacyEngine';

export interface DiplomacyEventIntegrationConfig {
  /** Whether to auto-declare wars on severe diplomatic incidents */
  autoWarDeclaration: boolean;

  /** Whether to auto-form alliances when conditions are met */
  autoAllianceFormation: boolean;

  /** Minimum relationship value to auto-form alliance */
  allianceThreshold: number;

  /** Maximum relationship value before auto-war */
  warThreshold: number;

  /** How much territory capture affects relations */
  conquestImpactMultiplier: number;

  /** How much trade affects relations */
  tradeImpactMultiplier: number;

  /** How much research affects relations */
  researchImpactMultiplier: number;
}

export class DiplomacyEventIntegration {
  private eventBus: EventBus;
  private diplomacyEngine: FactionDiplomacyEngine;
  private subscriptionIds: string[] = [];

  private config: DiplomacyEventIntegrationConfig = {
    autoWarDeclaration: true,
    autoAllianceFormation: false,
    allianceThreshold: 75,
    warThreshold: -70,
    conquestImpactMultiplier: 1.5,
    tradeImpactMultiplier: 1.0,
    researchImpactMultiplier: 1.2,
  };

  constructor(eventBus: EventBus, diplomacyEngine: FactionDiplomacyEngine) {
    this.eventBus = eventBus;
    this.diplomacyEngine = diplomacyEngine;
  }

  /**
   * Initialize all event subscriptions
   */
  public initialize(config?: Partial<DiplomacyEventIntegrationConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('[DiplomacyIntegration] Initializing diplomatic event handlers...');

    // Subscribe to all relevant events
    this.subscribeToConquestEvents();
    this.subscribeToTradeEvents();
    this.subscribeToResearchEvents();
    this.subscribeToPopulationEvents();
    this.subscribeToResourceEvents();
    this.subscribeToCombatEvents();
    this.subscribeToFactionEvents();

    console.log('[DiplomacyIntegration] Initialized with active subscriptions:', this.subscriptionIds.length);
  }

  /**
   * Subscribe to all events (alias for initialize())
   */
  public subscribeToAllEvents(config?: Partial<DiplomacyEventIntegrationConfig>): void {
    this.initialize(config);
  }

  /**
   * Cleanup all subscriptions
   */
  public shutdown(): void {
    for (const subId of this.subscriptionIds) {
      this.eventBus.unsubscribe(subId);
    }
    this.subscriptionIds = [];
    console.log('[DiplomacyIntegration] Shutdown complete');
  }

  // ====================================================================
  // CONQUEST EVENT HANDLERS
  // ====================================================================

  private subscribeToConquestEvents(): void {
    // Territory capture is a MAJOR diplomatic event
    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.TERRITORY_CAPTURED,
        (event) => this.onTerritoryCapture(event),
        EventPriority.CRITICAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.SIEGE_STARTED,
        (event) => this.onSiegeStarted(event),
        EventPriority.URGENT
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.OCCUPATION_STARTED,
        (event) => this.onOccupationStarted(event),
        EventPriority.HIGH
      )
    );
  }

  private onTerritoryCapture(event: UniverseEvent): void {
    const { newOwner, previousOwner, territoryId, population } = event.data;

    console.log(
      `[DiplomacyIntegration] Territory captured: ${territoryId} - ${previousOwner} → ${newOwner}`
    );

    // Direct impact: Victim hates conqueror
    const victimConquerorRelation = this.diplomacyEngine.getRelationship(
      previousOwner,
      newOwner
    );

    const baseImpact = -35 - (population / 10000);
    const scaledImpact = baseImpact * this.config.conquestImpactMultiplier;

    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: previousOwner,
      factionB: newOwner,
      relationshipDelta: scaledImpact,
      reason: `Territory ${territoryId} captured`,
      eventType: 'TERRITORIAL_SEIZURE',
      cascadeToAllies: true,
      cascadeStrength: 0.6,
    });

    // Allies of victim get VERY angry
    const victimAllies = this.diplomacyEngine.getFactionAllies(previousOwner);
    for (const ally of victimAllies) {
      const allyConquerorRelation = this.diplomacyEngine.getRelationship(ally, newOwner);

      this.diplomacyEngine.applyDiplomaticConsequence({
        factionA: ally,
        factionB: newOwner,
        relationshipDelta: scaledImpact * 0.6,
        reason: `Allied ${previousOwner} lost territory ${territoryId} to ${newOwner}`,
        eventType: 'MILITARY_INCIDENT',
        cascadeToAllies: false,
      });

      // Allies may declare war in response
      if (
        this.config.autoWarDeclaration &&
        allyConquerorRelation.relationshipValue < this.config.warThreshold &&
        allyConquerorRelation.status !== 'WAR'
      ) {
        console.log(
          `[DiplomacyIntegration] Alliance response: ${ally} declares war on ${newOwner} for attacking ${previousOwner}`
        );

        this.diplomacyEngine.declareWar(ally, newOwner, [
          'DEFENSE_OF_ALLY',
          `TERRITORY_SEIZURE_${territoryId}`,
        ]);

        // Emit war declaration event
        this.eventBus.emit(
          UniverseEventType.FACTION_WAR_DECLARED,
          {
            faction1: ally,
            faction2: newOwner,
            reason: 'DEFENSE_OF_ALLY',
            triggeringEvent: territoryId,
          },
          {
            source: 'DiplomacyIntegration',
            priority: EventPriority.CRITICAL,
            tags: ['war', 'alliance-response', 'conquest'],
            parentEventId: event.id,
          }
        );
      }
    }

    // Check if this should trigger automatic war (if not already at war)
    if (
      this.config.autoWarDeclaration &&
      victimConquerorRelation.status !== 'WAR' &&
      victimConquerorRelation.relationshipValue < this.config.warThreshold
    ) {
      this.diplomacyEngine.declareWar(previousOwner, newOwner, [
        'TERRITORIAL_RECLAMATION',
        `LOST_${territoryId}`,
      ]);

      this.eventBus.emit(
        UniverseEventType.FACTION_WAR_DECLARED,
        {
          faction1: previousOwner,
          faction2: newOwner,
          reason: 'TERRITORIAL_RECLAMATION',
          triggeringTerritory: territoryId,
        },
        {
          source: 'DiplomacyIntegration',
          priority: EventPriority.CRITICAL,
          tags: ['war', 'conquest'],
          parentEventId: event.id,
        }
      );
    }
  }

  private onSiegeStarted(event: UniverseEvent): void {
    const { attackerFaction, defenderFaction, targetId } = event.data;

    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: defenderFaction,
      factionB: attackerFaction,
      relationshipDelta: -15,
      reason: `Siege of ${targetId} initiated`,
      eventType: 'MILITARY_INCIDENT',
      cascadeToAllies: true,
      cascadeStrength: 0.3,
    });
  }

  private onOccupationStarted(event: UniverseEvent): void {
    const { occupier, territory } = event.data;

    // Occupation generates ongoing diplomatic tension
    this.diplomacyEngine.createDiplomaticTension({
      factionA: occupier,
      territories: [territory],
      tensionType: 'OCCUPATION',
      severity: 0.7,
    });
  }

  // ====================================================================
  // TRADE EVENT HANDLERS
  // ====================================================================

  private subscribeToTradeEvents(): void {
    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.TRADE_COMPLETED,
        (event) => this.onTradeCompleted(event),
        EventPriority.NORMAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.TRADE_ROUTE_ESTABLISHED,
        (event) => this.onTradeRouteEstablished(event),
        EventPriority.NORMAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.TRADE_ROUTE_DISRUPTED,
        (event) => this.onTradeRouteDisrupted(event),
        EventPriority.HIGH
      )
    );
  }

  private onTradeCompleted(event: UniverseEvent): void {
    const { buyerFaction, sellerFaction, value, commodity } = event.data;

    if (!buyerFaction || !sellerFaction) return;

    // Trade improves relations quantifiably
    const baseImpact = Math.min(5, (value / 50000) * 2);
    const scaledImpact = baseImpact * this.config.tradeImpactMultiplier;

    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: buyerFaction,
      factionB: sellerFaction,
      relationshipDelta: scaledImpact,
      reason: `Trade completed: ${commodity} for ${value} credits`,
      eventType: 'TRADE_AGREEMENT',
      cascadeToAllies: false,
    });

    // Large trades increase economic interdependence
    if (value > 100000) {
      this.diplomacyEngine.increaseEconomicInterdependence(
        buyerFaction,
        sellerFaction,
        value / 1000000
      );
    }

    // Check if trade volume warrants a trade agreement
    const relationship = this.diplomacyEngine.getRelationship(buyerFaction, sellerFaction);
    const tradeHistory = relationship.recentInteractions.filter(
      (i) => i.type === 'TRADE_AGREEMENT'
    );

    if (
      tradeHistory.length > 10 &&
      relationship.tradeAgreements.length === 0 &&
      relationship.relationshipValue > 20
    ) {
      console.log(
        `[DiplomacyIntegration] Frequent trade triggers trade agreement: ${buyerFaction} <-> ${sellerFaction}`
      );

      this.diplomacyEngine.createTradeAgreement({
        factionA: buyerFaction,
        factionB: sellerFaction,
        commodities: [commodity],
        tariffReduction: 0.25,
        duration: 86400 * 365, // 1 year
      });
    }
  }

  private onTradeRouteEstablished(event: UniverseEvent): void {
    const { factionA, factionB, routeId } = event.data;

    if (!factionA || !factionB) return;

    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA,
      factionB,
      relationshipDelta: 8,
      reason: `New trade route established: ${routeId}`,
      eventType: 'TRADE_AGREEMENT',
      cascadeToAllies: false,
    });
  }

  private onTradeRouteDisrupted(event: UniverseEvent): void {
    const { routeId, reason, affectedFactions } = event.data;

    if (!affectedFactions || affectedFactions.length < 2) return;

    // Trade disruption damages relations
    for (let i = 0; i < affectedFactions.length; i++) {
      for (let j = i + 1; j < affectedFactions.length; j++) {
        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: affectedFactions[i],
          factionB: affectedFactions[j],
          relationshipDelta: -3,
          reason: `Trade route ${routeId} disrupted: ${reason}`,
          eventType: 'TRADE_DISPUTE',
          cascadeToAllies: false,
        });
      }
    }
  }

  // ====================================================================
  // RESEARCH EVENT HANDLERS
  // ====================================================================

  private subscribeToResearchEvents(): void {
    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.RESEARCH_COMPLETED,
        (event) => this.onResearchCompleted(event),
        EventPriority.HIGH
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.TECHNOLOGY_UNLOCKED,
        (event) => this.onTechnologyUnlocked(event),
        EventPriority.HIGH
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.RESEARCH_BREAKTHROUGH,
        (event) => this.onResearchBreakthrough(event),
        EventPriority.NORMAL
      )
    );
  }

  private onResearchCompleted(event: UniverseEvent): void {
    const { technologyId, factionId } = event.data;

    console.log(`[DiplomacyIntegration] Research completed: ${factionId} - ${technologyId}`);

    // Research completion can unlock diplomatic options
    this.diplomacyEngine.unlockDiplomaticOption({
      factionId,
      technologyId,
      optionType: this.determineDiplomaticOption(technologyId),
    });

    // Advanced research makes faction more attractive as ally
    const allFactions = this.diplomacyEngine.getAllFactions();
    for (const otherFaction of allFactions) {
      if (otherFaction === factionId) continue;

      const relationship = this.diplomacyEngine.getRelationship(factionId, otherFaction);
      if (relationship.relationshipValue > 30) {
        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: factionId,
          factionB: otherFaction,
          relationshipDelta: 2,
          reason: `Impressed by technological advancement: ${technologyId}`,
          eventType: 'CULTURAL_EXCHANGE',
          cascadeToAllies: false,
        });
      }
    }
  }

  private onTechnologyUnlocked(event: UniverseEvent): void {
    const { technologyId, factionId } = event.data;

    // Some technologies unlock specific diplomatic actions
    const diplomaticUnlocks: Record<string, string[]> = {
      tech_diplomacy: ['EMBASSY', 'CULTURAL_EXCHANGE_PROGRAM'],
      tech_communications: ['INSTANT_NEGOTIATION', 'SUMMIT'],
      tech_trade: ['FREE_TRADE_AGREEMENT', 'ECONOMIC_UNION'],
      tech_military_alliance: ['MUTUAL_DEFENSE_PACT', 'JOINT_OPERATIONS'],
      tech_espionage: ['SPY_NETWORK', 'INTELLIGENCE_SHARING'],
    };

    if (diplomaticUnlocks[technologyId]) {
      for (const option of diplomaticUnlocks[technologyId]) {
        this.diplomacyEngine.unlockDiplomaticOption({
          factionId,
          technologyId,
          optionType: option,
        });
      }

      console.log(
        `[DiplomacyIntegration] ${factionId} unlocked diplomatic options: ${diplomaticUnlocks[technologyId].join(', ')}`
      );
    }
  }

  private onResearchBreakthrough(event: UniverseEvent): void {
    const { factionId, breakthroughType } = event.data;

    // Major breakthroughs can shift power balance
    this.diplomacyEngine.updateMilitaryBalance({
      factionId,
      balanceChange: 0.1,
      reason: `Research breakthrough: ${breakthroughType}`,
    });
  }

  // ====================================================================
  // POPULATION EVENT HANDLERS
  // ====================================================================

  private subscribeToPopulationEvents(): void {
    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.POPULATION_UNREST,
        (event) => this.onPopulationUnrest(event),
        EventPriority.HIGH
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.POPULATION_MIGRATED,
        (event) => this.onPopulationMigrated(event),
        EventPriority.NORMAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.POPULATION_STARVING,
        (event) => this.onPopulationStarving(event),
        EventPriority.CRITICAL
      )
    );
  }

  private onPopulationUnrest(event: UniverseEvent): void {
    const { cityId, unrestLevel, reason, factionId } = event.data;

    // Population unrest reduces faction stability
    this.diplomacyEngine.reduceFactionStability({
      factionId,
      stabilityLoss: unrestLevel * 0.3,
      reason: `Unrest in ${cityId}: ${reason}`,
    });

    // High unrest makes faction vulnerable - enemies sense opportunity
    if (unrestLevel > 0.7) {
      const allFactions = this.diplomacyEngine.getAllFactions();
      for (const otherFaction of allFactions) {
        if (otherFaction === factionId) continue;

        const relationship = this.diplomacyEngine.getRelationship(factionId, otherFaction);
        if (relationship.relationshipValue < -30) {
          // Hostile factions become more aggressive
          this.diplomacyEngine.increaseWarProbability({
            factionA: otherFaction,
            factionB: factionId,
            increase: 0.15,
            reason: `${factionId} weakened by unrest`,
          });
        }
      }
    }
  }

  private onPopulationMigrated(event: UniverseEvent): void {
    const { fromFaction, toFaction, count, reason } = event.data;

    if (!fromFaction || !toFaction) return;

    // Large migrations can affect relations
    if (count > 10000) {
      if (reason === 'FLEEING_WAR' || reason === 'FLEEING_PERSECUTION') {
        // Refugee crisis damages relations
        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: fromFaction,
          factionB: toFaction,
          relationshipDelta: -5,
          reason: `Refugee crisis: ${count} fled from ${fromFaction}`,
          eventType: 'REFUGEE_CRISIS',
          cascadeToAllies: false,
        });

        // Accepting faction gains diplomatic capital with allies
        const toFactionAllies = this.diplomacyEngine.getFactionAllies(toFaction);
        for (const ally of toFactionAllies) {
          this.diplomacyEngine.modifyDiplomaticCapital(toFaction, ally, 5);
        }
      } else {
        // Economic migration improves relations
        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: fromFaction,
          factionB: toFaction,
          relationshipDelta: 3,
          reason: `Economic migration improved ties`,
          eventType: 'CULTURAL_EXCHANGE',
          cascadeToAllies: false,
        });
      }
    }
  }

  private onPopulationStarving(event: UniverseEvent): void {
    const { factionId, cityId, population } = event.data;

    // Starvation is a humanitarian crisis
    this.diplomacyEngine.reduceFactionStability({
      factionId,
      stabilityLoss: 0.4,
      reason: `Famine in ${cityId}`,
    });

    // Friendly factions may offer humanitarian aid
    const allFactions = this.diplomacyEngine.getAllFactions();
    for (const otherFaction of allFactions) {
      if (otherFaction === factionId) continue;

      const relationship = this.diplomacyEngine.getRelationship(factionId, otherFaction);
      if (relationship.relationshipValue > 40 && Math.random() < 0.3) {
        console.log(
          `[DiplomacyIntegration] ${otherFaction} offers humanitarian aid to ${factionId}`
        );

        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: otherFaction,
          factionB: factionId,
          relationshipDelta: 12,
          reason: `Humanitarian aid during famine in ${cityId}`,
          eventType: 'HUMANITARIAN_AID',
          cascadeToAllies: false,
        });

        this.eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {
            buyerFaction: factionId,
            sellerFaction: otherFaction,
            value: 0, // Aid is free
            commodity: 'food_aid',
            isHumanitarianAid: true,
          },
          {
            source: 'DiplomacyIntegration',
            priority: EventPriority.NORMAL,
            tags: ['humanitarian', 'aid'],
            parentEventId: event.id,
          }
        );
      }
    }
  }

  // ====================================================================
  // RESOURCE EVENT HANDLERS
  // ====================================================================

  private subscribeToResourceEvents(): void {
    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.RESOURCE_SHORTAGE,
        (event) => this.onResourceShortage(event),
        EventPriority.CRITICAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.RESOURCE_SURPLUS,
        (event) => this.onResourceSurplus(event),
        EventPriority.NORMAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.RESOURCE_DISCOVERED,
        (event) => this.onResourceDiscovered(event),
        EventPriority.NORMAL
      )
    );
  }

  private onResourceShortage(event: UniverseEvent): void {
    const { resource, factionId, severity } = event.data;

    console.log(`[DiplomacyIntegration] Resource shortage: ${factionId} - ${resource}`);

    // Critical shortages may trigger desperate actions
    if (severity > 0.8) {
      const allFactions = this.diplomacyEngine.getAllFactions();

      // Try to establish trade first (peaceful option)
      const friendlyFactions = allFactions.filter((f) => {
        if (f === factionId) return false;
        const rel = this.diplomacyEngine.getRelationship(factionId, f);
        return rel.relationshipValue > 0;
      });

      if (friendlyFactions.length > 0 && Math.random() < 0.6) {
        // Request trade agreement
        const partner = friendlyFactions[Math.floor(Math.random() * friendlyFactions.length)];
        console.log(
          `[DiplomacyIntegration] ${factionId} requests trade agreement with ${partner} for ${resource}`
        );

        this.diplomacyEngine.createTradeAgreement({
          factionA: factionId,
          factionB: partner,
          commodities: [resource],
          tariffReduction: 0.5,
          duration: 86400 * 180, // 6 months
        });

        this.eventBus.emit(
          UniverseEventType.TRADE_ROUTE_ESTABLISHED,
          {
            factionA: factionId,
            factionB: partner,
            routeId: `emergency_${resource}_${Date.now()}`,
            commodity: resource,
            isEmergency: true,
          },
          {
            source: 'DiplomacyIntegration',
            priority: EventPriority.HIGH,
            parentEventId: event.id,
          }
        );
      } else {
        // No friends available - consider war with resource-rich neighbors
        const resourceRichFactions = allFactions.filter((f) => {
          // Simplified: assume some factions have resources
          return f !== factionId && Math.random() < 0.3;
        });

        if (resourceRichFactions.length > 0 && this.config.autoWarDeclaration) {
          const target =
            resourceRichFactions[Math.floor(Math.random() * resourceRichFactions.length)];
          const relationship = this.diplomacyEngine.getRelationship(factionId, target);

          if (relationship.status !== 'WAR' && relationship.status !== 'ALLIED') {
            console.log(
              `[DiplomacyIntegration] ${factionId} considers war with ${target} for ${resource}`
            );

            // Deteriorate relations first
            this.diplomacyEngine.applyDiplomaticConsequence({
              factionA: factionId,
              factionB: target,
              relationshipDelta: -25,
              reason: `Resource competition: ${resource}`,
              eventType: 'TERRITORIAL_DISPUTE',
              cascadeToAllies: true,
              cascadeStrength: 0.4,
            });

            // May declare war
            if (relationship.relationshipValue < this.config.warThreshold) {
              this.diplomacyEngine.declareWar(factionId, target, [
                'RESOURCE_ACQUISITION',
                `SHORTAGE_${resource}`,
              ]);

              this.eventBus.emit(
                UniverseEventType.FACTION_WAR_DECLARED,
                {
                  faction1: factionId,
                  faction2: target,
                  reason: 'RESOURCE_ACQUISITION',
                  resource,
                },
                {
                  source: 'DiplomacyIntegration',
                  priority: EventPriority.CRITICAL,
                  tags: ['war', 'resources'],
                  parentEventId: event.id,
                }
              );
            }
          }
        }
      }
    }
  }

  private onResourceSurplus(event: UniverseEvent): void {
    const { resource, factionId } = event.data;

    // Surplus makes faction attractive trade partner
    const allFactions = this.diplomacyEngine.getAllFactions();
    for (const otherFaction of allFactions) {
      if (otherFaction === factionId) continue;

      const relationship = this.diplomacyEngine.getRelationship(factionId, otherFaction);
      if (relationship.relationshipValue > -20) {
        // Offer trade
        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: factionId,
          factionB: otherFaction,
          relationshipDelta: 1,
          reason: `Offered trade of surplus ${resource}`,
          eventType: 'TRADE_AGREEMENT',
          cascadeToAllies: false,
        });
      }
    }
  }

  private onResourceDiscovered(event: UniverseEvent): void {
    const { resource, location, discovererFaction } = event.data;

    // Valuable resource discoveries can create territorial disputes
    if (event.data.value && event.data.value > 1000000) {
      const nearbyFactions = event.data.nearbyFactions || [];

      for (const faction of nearbyFactions) {
        if (faction === discovererFaction) continue;

        this.diplomacyEngine.createTerritorialDispute({
          factionA: discovererFaction,
          factionB: faction,
          disputedTerritory: location,
          reason: `Valuable ${resource} deposit`,
        });

        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: discovererFaction,
          factionB: faction,
          relationshipDelta: -8,
          reason: `Territorial dispute over ${resource} at ${location}`,
          eventType: 'TERRITORIAL_DISPUTE',
          cascadeToAllies: false,
        });
      }
    }
  }

  // ====================================================================
  // COMBAT EVENT HANDLERS
  // ====================================================================

  private subscribeToCombatEvents(): void {
    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.COMBAT_STARTED,
        (event) => this.onCombatStarted(event),
        EventPriority.URGENT
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.COMBAT_ENDED,
        (event) => this.onCombatEnded(event),
        EventPriority.HIGH
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.SHIP_DESTROYED,
        (event) => this.onShipDestroyed(event),
        EventPriority.NORMAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.STATION_DESTROYED,
        (event) => this.onStationDestroyed(event),
        EventPriority.CRITICAL
      )
    );
  }

  private onCombatStarted(event: UniverseEvent): void {
    const { attackerFaction, defenderFaction, location } = event.data;

    if (!attackerFaction || !defenderFaction) return;

    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: attackerFaction,
      factionB: defenderFaction,
      relationshipDelta: -10,
      reason: `Combat initiated at ${location}`,
      eventType: 'MILITARY_INCIDENT',
      cascadeToAllies: true,
      cascadeStrength: 0.4,
    });
  }

  private onCombatEnded(event: UniverseEvent): void {
    const { attackerFaction, defenderFaction, victor, casualties } = event.data;

    if (!attackerFaction || !defenderFaction) return;

    const loser = victor === attackerFaction ? defenderFaction : attackerFaction;

    // Combat damages relationships
    const baseDamage = -8 - (casualties || 0) / 10;
    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: attackerFaction,
      factionB: defenderFaction,
      relationshipDelta: baseDamage,
      reason: `Combat concluded - ${casualties || 0} casualties`,
      eventType: 'MILITARY_INCIDENT',
      cascadeToAllies: true,
      cascadeStrength: 0.3,
    });

    // Update military balance
    if (victor) {
      this.diplomacyEngine.updateMilitaryBalance({
        factionId: victor,
        balanceChange: 0.05,
        reason: `Victory in combat`,
      });

      this.diplomacyEngine.updateMilitaryBalance({
        factionId: loser,
        balanceChange: -0.05,
        reason: `Defeat in combat`,
      });
    }
  }

  private onShipDestroyed(event: UniverseEvent): void {
    const { shipFaction, destroyerFaction, shipValue } = event.data;

    if (!shipFaction || !destroyerFaction) return;

    const impact = -5 - (shipValue || 0) / 100000;
    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: shipFaction,
      factionB: destroyerFaction,
      relationshipDelta: impact,
      reason: `Ship destroyed (value: ${shipValue})`,
      eventType: 'MILITARY_INCIDENT',
      cascadeToAllies: false,
    });
  }

  private onStationDestroyed(event: UniverseEvent): void {
    const { stationFaction, attackerFaction, stationValue, civilianCasualties } = event.data;

    if (!stationFaction || !attackerFaction) return;

    // Station destruction is EXTREMELY serious
    const baseImpact = -40 - (stationValue || 0) / 500000 - (civilianCasualties || 0) / 50;

    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: stationFaction,
      factionB: attackerFaction,
      relationshipDelta: baseImpact,
      reason: `Station destroyed - ${civilianCasualties || 0} civilian casualties`,
      eventType: 'MILITARY_INCIDENT',
      cascadeToAllies: true,
      cascadeStrength: 0.8,
    });

    // Almost always triggers war
    const relationship = this.diplomacyEngine.getRelationship(stationFaction, attackerFaction);
    if (this.config.autoWarDeclaration && relationship.status !== 'WAR') {
      this.diplomacyEngine.declareWar(stationFaction, attackerFaction, [
        'RETALIATION',
        'STATION_DESTRUCTION',
        'WAR_CRIME',
      ]);

      this.eventBus.emit(
        UniverseEventType.FACTION_WAR_DECLARED,
        {
          faction1: stationFaction,
          faction2: attackerFaction,
          reason: 'STATION_DESTRUCTION',
          civilianCasualties,
        },
        {
          source: 'DiplomacyIntegration',
          priority: EventPriority.CRITICAL,
          tags: ['war', 'retaliation'],
          parentEventId: event.id,
        }
      );
    }
  }

  // ====================================================================
  // FACTION EVENT HANDLERS
  // ====================================================================

  private subscribeToFactionEvents(): void {
    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.FACTION_WAR_DECLARED,
        (event) => this.onWarDeclared(event),
        EventPriority.CRITICAL
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.FACTION_PEACE_TREATY,
        (event) => this.onPeaceTreaty(event),
        EventPriority.HIGH
      )
    );

    this.subscriptionIds.push(
      this.eventBus.subscribe(
        UniverseEventType.FACTION_ALLIANCE_FORMED,
        (event) => this.onAllianceFormed(event),
        EventPriority.HIGH
      )
    );
  }

  private onWarDeclared(event: UniverseEvent): void {
    const { faction1, faction2 } = event.data;

    // War affects all diplomatic relations
    const allFactions = this.diplomacyEngine.getAllFactions();

    // Allies of both sides take notice
    const faction1Allies = this.diplomacyEngine.getFactionAllies(faction1);
    const faction2Allies = this.diplomacyEngine.getFactionAllies(faction2);

    // Mutual allies are put in awkward position
    const mutualAllies = faction1Allies.filter((a) => faction2Allies.includes(a));
    for (const ally of mutualAllies) {
      console.log(`[DiplomacyIntegration] ${ally} caught between warring allies ${faction1} and ${faction2}`);

      // May need to choose sides or dissolve alliances
      this.diplomacyEngine.createDiplomaticCrisis({
        factionId: ally,
        crisisType: 'ALLIANCE_CONFLICT',
        involvedFactions: [faction1, faction2],
      });
    }
  }

  private onPeaceTreaty(event: UniverseEvent): void {
    const { faction1, faction2, terms } = event.data;

    // Peace treaty improves relations slightly
    this.diplomacyEngine.applyDiplomaticConsequence({
      factionA: faction1,
      factionB: faction2,
      relationshipDelta: 25,
      reason: `Peace treaty signed`,
      eventType: 'DIPLOMATIC_SUMMIT',
      cascadeToAllies: false,
    });

    // Sign formal peace treaty
    this.diplomacyEngine.signTreaty([faction1, faction2], 'PEACE_TREATY', terms || [], 86400 * 365);
  }

  private onAllianceFormed(event: UniverseEvent): void {
    const { members, name } = event.data;

    // Alliance formation significantly improves relations
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        this.diplomacyEngine.applyDiplomaticConsequence({
          factionA: members[i],
          factionB: members[j],
          relationshipDelta: 35,
          reason: `Alliance formed: ${name}`,
          eventType: 'DIPLOMATIC_SUMMIT',
          cascadeToAllies: false,
        });
      }
    }
  }

  // ====================================================================
  // HELPER METHODS
  // ====================================================================

  private determineDiplomaticOption(technologyId: string): string {
    // Map technologies to diplomatic options
    const optionMap: Record<string, string> = {
      tech_diplomacy: 'EMBASSY',
      tech_communications: 'INSTANT_NEGOTIATION',
      tech_trade: 'FREE_TRADE',
      tech_espionage: 'SPY_NETWORK',
      tech_military: 'JOINT_OPERATIONS',
    };

    return optionMap[technologyId] || 'GENERAL_IMPROVEMENT';
  }

  /**
   * Get current configuration
   */
  public getConfig(): DiplomacyEventIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DiplomacyEventIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[DiplomacyIntegration] Configuration updated:', this.config);
  }

  /**
   * Get statistics about diplomatic event handling
   */
  public getStats(): {
    activeSubscriptions: number;
    config: DiplomacyEventIntegrationConfig;
  } {
    return {
      activeSubscriptions: this.subscriptionIds.length,
      config: this.getConfig(),
    };
  }
}
