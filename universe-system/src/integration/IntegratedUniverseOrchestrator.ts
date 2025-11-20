/**
 * IntegratedUniverseOrchestrator - Complete integration layer
 *
 * Brings together:
 * - Universe/Space systems (stars, planets, hazards, stations)
 * - NPC ships with physics and navigation
 * - Universe-aware AI with environmental decision making
 * - Faction-level strategic AI
 * - Event-driven dynamic behaviors
 *
 * This is the "complete nervous system" of the living universe.
 */

import { StarSystem } from '../StarSystem';
import { UniverseOrchestrator, EntityRegistration } from '../UniverseOrchestrator';
import { UniverseContextProvider, UniverseContext } from './UniverseContextProvider';
import { UniverseAwareAI, UniverseDecisionContext } from './UniverseAwareAI';
import { FactionAI, FactionStrategy, Territory } from './FactionAI';
import { UniverseDashboard, LiveEvent } from './UniverseDashboard';
import { NPCInteractionManager, Interaction, InteractionType } from './NPCInteractions';
import { EventCascadeSystem, CascadeChain } from './EventCascadeSystem';
import { ShipReputationSystem } from './ShipReputationSystem';
import { EconomicSimulation } from './EconomicSimulation';

import { NPCShip, ShipType, ShipStatus } from '../npc-traffic/npc-ship';
import { Vector3 as Vector3Class } from '../../../physics-modules/src/Vector3';
import { ExtendedNPCMemory, PersonalityTraits } from '../entity-ai/ExtendedNPCMemory';
import { NPCGoalSystem, GoalType } from '../entity-ai/NPCGoalSystem';
import { HistoricalEvent } from '../simulation/HistoricalMemorySystem';

export interface IntegratedNPCShip {
  ship: NPCShip;
  memory: ExtendedNPCMemory;
  goals: NPCGoalSystem;
  ai: UniverseAwareAI;
  factionId?: string; // CRITICAL: Track faction for interactions
  lastDecision?: any;
  lastContext?: UniverseContext;
}

export interface UniverseConfig {
  systemSeed?: number;
  enableDynamicEvents?: boolean;
  enableFactionAI?: boolean;
  enableDashboard?: boolean;
  enableNPCInteractions?: boolean;
  enableEventCascades?: boolean;
  npcUpdateFrequency?: number; // Updates per second
  factionUpdateFrequency?: number; // Updates per second
  dashboardUpdateFrequency?: number; // Updates per second
}

/**
 * Fully integrated universe orchestrator
 */
export class IntegratedUniverseOrchestrator {
  // Core systems
  private starSystem: StarSystem;
  private baseOrchestrator: UniverseOrchestrator;
  private contextProvider: UniverseContextProvider;

  // AWESOME NEW FEATURES
  public dashboard: UniverseDashboard;
  private interactionManager: NPCInteractionManager;
  private cascadeSystem: EventCascadeSystem;
  public economicSim: EconomicSimulation;
  public reputationSystem: ShipReputationSystem;

  // NPCs
  private integratedShips: Map<string, IntegratedNPCShip> = new Map();

  // Factions
  private factionAIs: Map<string, FactionAI> = new Map();

  // Config
  private config: UniverseConfig;

  // State
  private time: number = 0;
  private updateCounter: number = 0;

  constructor(
    starSystem: StarSystem,
    baseOrchestrator: UniverseOrchestrator,
    config: UniverseConfig = {}
  ) {
    this.starSystem = starSystem;
    this.baseOrchestrator = baseOrchestrator;
    this.contextProvider = new UniverseContextProvider(starSystem);

    this.config = {
      enableDynamicEvents: true,
      enableFactionAI: true,
      enableDashboard: true,
      enableNPCInteractions: true,
      enableEventCascades: true,
      npcUpdateFrequency: 10, // 10 updates per second
      factionUpdateFrequency: 0.1, // Once per 10 seconds
      dashboardUpdateFrequency: 2, // 2 updates per second
      ...config
    };

    // Initialize AWESOME features
    this.dashboard = new UniverseDashboard({
      updateFrequency: this.config.dashboardUpdateFrequency!,
      colorEnabled: true,
      showNPCDetails: true,
      showFactionDetails: true,
      showPerformance: true
    });

    this.interactionManager = new NPCInteractionManager();
    this.cascadeSystem = new EventCascadeSystem();
    this.economicSim = new EconomicSimulation();
    this.reputationSystem = this.interactionManager.reputationSystem; // Reference the same system

    // Wire systems together
    this.interactionManager.setEconomicSimulation(this.economicSim);

    // Create markets for all stations
    if (starSystem.stations) {
      for (const station of starSystem.stations) {
        this.economicSim.createMarket(station.id, station.name);
      }
    }

    console.log('[INTEGRATED ORCHESTRATOR] Initialized with AWESOME features!');
    console.log('  ✓ Real-time Dashboard');
    console.log('  ✓ NPC-to-NPC Interactions (combat, trade, communication)');
    console.log('  ✓ Event Cascade System (emergent storytelling)');
    console.log('  ✓ Ship Reputation System (ships remember each other)');
    console.log('  ✓ Economic Simulation (dynamic prices, trade routes)');
  }

  /**
   * Main update loop
   */
  public update(deltaTime: number): void {
    const startTime = Date.now();

    this.time += deltaTime;
    this.updateCounter++;

    // Update base orchestrator
    this.baseOrchestrator.update(deltaTime);

    // ========================================================================
    // UPDATE NPCs (throttled)
    // ========================================================================
    const npcUpdateInterval = 1.0 / this.config.npcUpdateFrequency!;
    if (this.time % npcUpdateInterval < deltaTime) {
      this.updateNPCs(deltaTime);
    }

    // ========================================================================
    // UPDATE NPC INTERACTIONS (combat, trade, communication)
    // ========================================================================
    if (this.config.enableNPCInteractions) {
      const ships = Array.from(this.integratedShips.values());

      // Update faction relations for interaction manager
      this.updateFactionRelationsForInteractions();

      const interactions = this.interactionManager.update(deltaTime, ships);

      // Record interaction events
      for (const interaction of interactions) {
        this.recordInteractionEvent(interaction);
      }

      // Check distress call responses
      const distressResponses = this.interactionManager.checkDistressResponse(ships);
      for (const response of distressResponses) {
        this.recordInteractionEvent(response);
      }
    }

    // ========================================================================
    // UPDATE REPUTATION SYSTEM (decay over time)
    // ========================================================================
    this.reputationSystem.update(deltaTime);

    // ========================================================================
    // UPDATE ECONOMIC SIMULATION
    // ========================================================================
    this.economicSim.update(deltaTime);

    // ========================================================================
    // UPDATE EVENT CASCADES (emergent storytelling)
    // ========================================================================
    if (this.config.enableEventCascades) {
      const cascadedEvents = this.cascadeSystem.update(deltaTime);

      // Record cascaded events
      for (const event of cascadedEvents) {
        this.baseOrchestrator.recordEvent(event);

        // Dashboard event
        if (this.config.enableDashboard) {
          this.dashboard.recordEvent({
            timestamp: event.timestamp,
            type: event.type,
            severity: event.severity,
            description: event.description,
            participants: event.participants,
            cascadedFrom: event.data?.cascadedFrom,
            triggeredEvents: []
          });
        }
      }
    }

    // ========================================================================
    // UPDATE FACTION AIs (throttled more)
    // ========================================================================
    const factionUpdateInterval = 1.0 / this.config.factionUpdateFrequency!;
    if (this.time % factionUpdateInterval < deltaTime) {
      this.updateFactions(deltaTime);
    }

    // ========================================================================
    // GENERATE DYNAMIC EVENTS
    // ========================================================================
    if (this.config.enableDynamicEvents && Math.random() < 0.001) {
      this.generateDynamicEvent();
    }

    // ========================================================================
    // UPDATE STAR SYSTEM (traffic, hazards, etc.)
    // ========================================================================
    this.starSystem.update(deltaTime);

    // ========================================================================
    // UPDATE DASHBOARD
    // ========================================================================
    if (this.config.enableDashboard) {
      const dashboardUpdateInterval = 1.0 / this.config.dashboardUpdateFrequency!;
      if (this.time % dashboardUpdateInterval < deltaTime) {
        const updateTime = Date.now() - startTime;
        this.dashboard.update(this);
        // Auto-render dashboard would go here if in interactive mode
      }
    }
  }

  /**
   * Register an integrated NPC ship
   */
  public registerIntegratedNPC(
    ship: NPCShip,
    personality?: PersonalityTraits,
    factionId?: string
  ): void {
    // Create memory system
    const memory = new ExtendedNPCMemory(
      ship.id,
      'SHIP',
      personality
    );

    // Create goal system
    const goals = new NPCGoalSystem(memory);

    // Create universe-aware AI
    const ai = new UniverseAwareAI(
      memory,
      goals,
      this.contextProvider,
      factionId
    );

    // Set initial goals based on ship type
    this.setInitialGoals(ship.type, goals);

    // Store integrated ship
    const integrated: IntegratedNPCShip = {
      ship,
      memory,
      goals,
      ai,
      factionId // Store faction ID for interactions
    };

    this.integratedShips.set(ship.id, integrated);

    // Register with base orchestrator
    const registration: EntityRegistration = {
      id: ship.id,
      type: 'SHIP',
      factionId,
      personality,
      hasAI: true
    };

    this.baseOrchestrator.registerEntity(registration);

    // Add to traffic manager
    this.starSystem.trafficManager.addVessel(ship);

    console.log(`[INTEGRATED ORCHESTRATOR] Registered ${ship.name} (${ship.type})`);
  }

  /**
   * Update all NPCs
   */
  private updateNPCs(deltaTime: number): void {
    for (const [id, npc] of this.integratedShips) {
      this.updateSingleNPC(npc, deltaTime);
    }
  }

  /**
   * Update a single NPC
   */
  private updateSingleNPC(npc: IntegratedNPCShip, deltaTime: number): void {
    const { ship, memory, goals, ai } = npc;

    // Get universe context
    const context: UniverseDecisionContext = {
      situation: this.describeSituation(ship),
      availableActions: this.getAvailableActions(ship),
      currentGoal: goals.getCurrentGoal() || undefined,
      resources: this.getShipResources(ship),
      threats: this.getThreats(ship),
      opportunities: this.getOpportunities(ship),
      universeContext: this.contextProvider.getContext({ position: ship.position }),
      position: ship.position,
      velocity: ship.velocity,
      fuelLevel: ship.fuel,
      hullIntegrity: ship.health
    };

    npc.lastContext = context.universeContext;

    // Make decision
    const decision = ai.makeUniverseDecision(context);
    npc.lastDecision = decision;

    // Execute decision
    this.executeDecision(ship, decision, context);

    // Record outcome (simplified - would be done after action completes)
    if (Math.random() < 0.1) { // 10% chance to record outcome
      const outcome = Math.random() > 0.5 ? 'SUCCESS' : 'FAILURE';
      const reward = outcome === 'SUCCESS' ? 5 : -3;

      ai.recordUniverseOutcome(
        context,
        decision.chosenAction,
        outcome,
        reward
      );
    }

    // Update ship physics/navigation (NPCShip handles this internally)
    const nearbyShips = this.starSystem.trafficManager.getNearbyVessels(ship.position, 10000)
      .filter(s => s.id !== ship.id) as NPCShip[];

    ship.update(deltaTime, nearbyShips, []);

    // Check for critical events
    this.checkCriticalEvents(npc);
  }

  /**
   * Execute AI decision
   */
  private executeDecision(ship: NPCShip, decision: any, context: UniverseDecisionContext): void {
    const action = decision.chosenAction;

    switch (action) {
      case 'EMERGENCY_EVASIVE_MANEUVER':
        this.performEmergencyEvasion(ship, decision.hazardAvoidance);
        break;

      case 'AVOID_HAZARD':
        this.performHazardAvoidance(ship, decision.hazardAvoidance);
        break;

      case 'FIND_SAFE_ROUTE':
        this.findSafeRoute(ship);
        break;

      case 'INVESTIGATE_OPPORTUNITY':
        this.investigateOpportunity(ship, decision.opportunityAssessment);
        break;

      case 'SEEK_REFUEL':
        this.seekNearestStation(ship, 'refuel');
        break;

      case 'SEEK_REPAIRS':
        this.seekNearestStation(ship, 'repair');
        break;

      default:
        // Use navigation advice if available
        if (decision.navigationAdvice?.shouldReroute) {
          this.applyNavigationAdvice(ship, decision.navigationAdvice);
        }
    }
  }

  // ====================================================================
  // ACTION IMPLEMENTATIONS
  // ====================================================================

  private performEmergencyEvasion(ship: NPCShip, avoidance: any): void {
    if (!avoidance?.avoidanceManeuver) return;

    const escapeVector = this.contextProvider.getEscapeVector(ship.position);
    const escapePosition = new Vector3Class(
      ship.position.x + escapeVector.x * 50000,
      ship.position.y + escapeVector.y * 50000,
      ship.position.z + escapeVector.z * 50000
    );

    ship.setDestination(escapePosition, 'SAFE_ZONE');
    ship.status = ShipStatus.FLEEING;

    // Record emergency event
    this.recordShipEvent(ship, 'EMERGENCY_EVASION', 8, 'Emergency evasion maneuver executed');
  }

  private performHazardAvoidance(ship: NPCShip, avoidance: any): void {
    if (!avoidance?.avoidanceManeuver) return;

    const safePos = this.contextProvider.findNearestSafePosition(ship.position);

    if (safePos) {
      const safeVec = new Vector3Class(safePos.x, safePos.y, safePos.z);
      ship.setDestination(safeVec, 'SAFE_POSITION');
    }
  }

  private findSafeRoute(ship: NPCShip): void {
    const safePos = this.contextProvider.findNearestSafePosition(ship.position);

    if (safePos) {
      const safeVec = new Vector3Class(safePos.x, safePos.y, safePos.z);
      ship.setDestination(safeVec, 'SAFE_ROUTE');
    }
  }

  private investigateOpportunity(ship: NPCShip, assessment: any): void {
    if (!assessment?.bestOpportunity) return;

    const poi = assessment.bestOpportunity;
    const poiVec = new Vector3Class(poi.position.x, poi.position.y, poi.position.z);

    ship.setDestination(poiVec, poi.name);

    this.recordShipEvent(ship, 'INVESTIGATE_POI', 5, `Investigating ${poi.name}`);
  }

  private seekNearestStation(ship: NPCShip, purpose: 'refuel' | 'repair'): void {
    const context = this.contextProvider.getContext({ position: ship.position, scanRadius: 500000 });

    if (context.nearestStation) {
      // Find actual station
      const station = this.starSystem.stations.find(s => s.id === context.nearestStation!.id);

      if (station) {
        const stationVec = new Vector3Class(
          station.position.x,
          station.position.y,
          station.position.z
        );

        ship.setDestination(stationVec, station.name);
        ship.status = ShipStatus.TRAVELING;

        this.recordShipEvent(ship, 'SEEK_STATION', 6, `Heading to ${station.name} for ${purpose}`);
      }
    }
  }

  private applyNavigationAdvice(ship: NPCShip, advice: any): void {
    if (advice.safeWaypoints && advice.safeWaypoints.length > 0) {
      const waypoint = advice.safeWaypoints[0];
      const waypointVec = new Vector3Class(waypoint.x, waypoint.y, waypoint.z);

      ship.setDestination(waypointVec, 'SAFE_WAYPOINT');
    }
  }

  // ====================================================================
  // FACTION MANAGEMENT
  // ====================================================================

  /**
   * Register a faction AI
   */
  public registerFaction(
    factionId: string,
    strategy: FactionStrategy,
    initialTerritories: Territory[] = []
  ): void {
    const subsystems = this.baseOrchestrator.getSubsystems();

    const factionAI = new FactionAI(
      factionId,
      strategy,
      this.starSystem,
      this.contextProvider,
      subsystems.diplomacy,
      subsystems.economics,
      subsystems.history
    );

    // Add initial territories
    for (const territory of initialTerritories) {
      factionAI.addTerritory(territory);
    }

    this.factionAIs.set(factionId, factionAI);

    // Register with base orchestrator
    this.baseOrchestrator.registerFaction({ id: factionId, name: factionId });

    console.log(`[INTEGRATED ORCHESTRATOR] Registered faction ${factionId} with strategy ${strategy}`);
  }

  /**
   * Update all factions
   */
  private updateFactions(deltaTime: number): void {
    for (const factionAI of this.factionAIs.values()) {
      factionAI.update(deltaTime);
    }
  }

  /**
   * Update faction relations for interaction manager
   */
  private updateFactionRelationsForInteractions(): void {
    // Build faction relations map from faction AIs
    const relations = new Map<string, Map<string, any>>();

    for (const [factionId, factionAI] of this.factionAIs) {
      const factionRelations = new Map<string, any>();

      // Get diplomatic status with other factions
      for (const [otherFactionId, otherFactionAI] of this.factionAIs) {
        if (factionId !== otherFactionId) {
          // Get diplomatic status (would need to access faction AI's internal state)
          // For now, default to neutral unless at war
          const status = this.getDiplomaticStatus(factionAI, otherFactionAI);
          factionRelations.set(otherFactionId, status);
        }
      }

      relations.set(factionId, factionRelations);
    }

    this.interactionManager.setFactionRelations(relations);
  }

  /**
   * Get diplomatic status between two faction AIs
   */
  private getDiplomaticStatus(factionA: FactionAI, factionB: FactionAI): string {
    // This would ideally access the faction's diplomacy engine
    // For now, return 'NEUTRAL' as default
    // In a full implementation, you'd get this from FactionDiplomacyEngine
    return 'NEUTRAL';
  }

  // ====================================================================
  // DYNAMIC EVENTS
  // ====================================================================

  /**
   * Generate random dynamic event
   */
  private generateDynamicEvent(): void {
    const eventTypes = [
      'SOLAR_FLARE',
      'PIRATE_RAID',
      'RESOURCE_DISCOVERY',
      'DISTRESS_SIGNAL',
      'DIPLOMATIC_INCIDENT',
      'MARKET_CRASH',
      'TECHNOLOGY_BREAKTHROUGH'
    ];

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const event: HistoricalEvent = {
      id: `dynamic_event_${Date.now()}`,
      timestamp: this.time,
      type,
      severity: 3 + Math.floor(Math.random() * 5),
      category: 'DYNAMIC',
      location: this.getRandomLocation(),
      participants: [],
      description: `Dynamic event: ${type}`,
      data: {},
      consequences: [],
      witnessed: false,
      priority: 5,
      tags: ['dynamic', 'procedural']
    };

    this.baseOrchestrator.recordEvent(event);

    // Feed into cascade system
    if (this.config.enableEventCascades) {
      this.cascadeSystem.processEvent(event, this.time);
    }

    // Dashboard event
    if (this.config.enableDashboard) {
      this.dashboard.recordEvent({
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity,
        description: event.description,
        participants: event.participants,
        triggeredEvents: []
      });
    }

    // React to event - notify nearby NPCs
    this.notifyNearbyNPCs(event);

    console.log(`[DYNAMIC EVENT] ${type} occurred at (${event.location.x.toFixed(0)}, ${event.location.y.toFixed(0)}, ${event.location.z.toFixed(0)})`);
  }

  /**
   * Notify NPCs about events
   */
  private notifyNearbyNPCs(event: HistoricalEvent): void {
    const eventRange = 100000; // 100km

    for (const [id, npc] of this.integratedShips) {
      const dx = npc.ship.position.x - event.location.x;
      const dy = npc.ship.position.y - event.location.y;
      const dz = npc.ship.position.z - event.location.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < eventRange) {
        // NPC can witness this event
        npc.memory.recordExperience({
          id: `exp_${event.id}`,
          timestamp: event.timestamp,
          type: 'WITNESS',
          event,
          emotionalImpact: event.severity - 5, // -2 to +5
          intensity: event.severity,
          location: event.location,
          witnesses: [id],
          memoryStrength: 1.0,
          recallCount: 0
        });
      }
    }
  }

  // ====================================================================
  // UTILITIES
  // ====================================================================

  private describeSituation(ship: NPCShip): string {
    return `${ship.type}_${ship.status}`;
  }

  private getAvailableActions(ship: NPCShip): string[] {
    return [
      'TRAVEL',
      'DOCK',
      'MINE',
      'TRADE',
      'PATROL',
      'FLEE',
      'INVESTIGATE',
      'WAIT'
    ];
  }

  private getShipResources(ship: NPCShip): any {
    return {
      fuel: ship.fuel,
      health: ship.health,
      cargo: ship.getCargoMass(),
      cargoCapacity: ship.cargoCapacity
    };
  }

  private getThreats(ship: NPCShip): string[] {
    const context = this.contextProvider.getContext({ position: ship.position });
    const threats: string[] = [];

    if (context.inHazardZone) {
      threats.push('HAZARD');
    }

    if (context.hostileFactions.length > 0) {
      threats.push('HOSTILE_FACTION');
    }

    return threats;
  }

  private getOpportunities(ship: NPCShip): string[] {
    const context = this.contextProvider.getContext({ position: ship.position });
    return context.nearbyPOIs.map(poi => poi.type);
  }

  private checkCriticalEvents(npc: IntegratedNPCShip): void {
    const { ship } = npc;

    // Critical hull damage
    if (ship.health < 0.2 && ship.status !== ShipStatus.FLEEING) {
      this.recordShipEvent(ship, 'CRITICAL_DAMAGE', 9, `${ship.name} critically damaged!`);
    }

    // Out of fuel
    if (ship.fuel < 0.05 && ship.status !== ShipStatus.DISABLED) {
      this.recordShipEvent(ship, 'OUT_OF_FUEL', 8, `${ship.name} out of fuel!`);
      ship.status = ShipStatus.DISABLED;
    }

    // Entered hazard zone
    if (npc.lastContext?.inHazardZone) {
      this.recordShipEvent(ship, 'HAZARD_ENTRY', 6, `${ship.name} entered hazard zone`);
    }
  }

  /**
   * Record interaction event
   */
  private recordInteractionEvent(interaction: Interaction): void {
    const event: HistoricalEvent = {
      id: interaction.id,
      timestamp: interaction.timestamp,
      type: interaction.type,
      severity: this.getInteractionSeverity(interaction),
      category: this.getInteractionCategory(interaction),
      location: interaction.location,
      participants: [interaction.initiator, interaction.target],
      description: this.describeInteraction(interaction),
      data: interaction.data,
      consequences: [],
      witnessed: true,
      priority: 5,
      tags: ['interaction', interaction.type.toLowerCase()]
    };

    this.baseOrchestrator.recordEvent(event);

    // Feed into cascade system
    if (this.config.enableEventCascades) {
      this.cascadeSystem.processEvent(event, this.time);
    }

    // Dashboard event
    if (this.config.enableDashboard) {
      this.dashboard.recordEvent({
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity,
        description: event.description,
        participants: event.participants,
        triggeredEvents: []
      });
    }
  }

  private getInteractionSeverity(interaction: Interaction): number {
    switch (interaction.type) {
      case InteractionType.COMBAT: return 8;
      case InteractionType.DISTRESS: return 7;
      case InteractionType.WARNING: return 5;
      case InteractionType.TRADE: return 3;
      case InteractionType.COMMUNICATION: return 2;
      default: return 3;
    }
  }

  private getInteractionCategory(interaction: Interaction): string {
    switch (interaction.type) {
      case InteractionType.COMBAT: return 'MILITARY';
      case InteractionType.TRADE: return 'ECONOMIC';
      case InteractionType.ALLIANCE: return 'POLITICAL';
      case InteractionType.DISTRESS: return 'HUMANITARIAN';
      default: return 'SOCIAL';
    }
  }

  private describeInteraction(interaction: Interaction): string {
    const initiatorShip = this.integratedShips.get(interaction.initiator);
    const targetShip = this.integratedShips.get(interaction.target);

    const initiatorName = initiatorShip?.ship.name || interaction.initiator;
    const targetName = targetShip?.ship.name || interaction.target;

    switch (interaction.type) {
      case InteractionType.COMBAT:
        return `${initiatorName} engaged ${targetName} in combat`;
      case InteractionType.TRADE:
        return `${initiatorName} traded with ${targetName}`;
      case InteractionType.DISTRESS:
        return `${initiatorName} sent distress call to ${targetName}`;
      case InteractionType.ALLIANCE:
        return `${initiatorName} formed alliance with ${targetName}`;
      case InteractionType.COMMUNICATION:
        return `${initiatorName} communicated with ${targetName}`;
      default:
        return `${initiatorName} interacted with ${targetName}`;
    }
  }

  private recordShipEvent(ship: NPCShip, type: string, severity: number, description: string): void {
    const event: HistoricalEvent = {
      id: `ship_event_${ship.id}_${Date.now()}`,
      timestamp: this.time,
      type,
      severity,
      category: 'PERSONAL',
      location: ship.position,
      participants: [ship.id],
      description,
      data: { shipType: ship.type, shipStatus: ship.status },
      consequences: [],
      witnessed: true,
      priority: severity,
      tags: ['ship', 'npc']
    };

    this.baseOrchestrator.recordEvent(event);

    // Feed into cascade system
    if (this.config.enableEventCascades) {
      this.cascadeSystem.processEvent(event, this.time);
    }

    // Dashboard event
    if (this.config.enableDashboard) {
      this.dashboard.recordEvent({
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity,
        description: event.description,
        participants: event.participants,
        triggeredEvents: []
      });
    }
  }

  private getRandomLocation(): { x: number; y: number; z: number } {
    return {
      x: (Math.random() - 0.5) * 1000000,
      y: (Math.random() - 0.5) * 100000,
      z: (Math.random() - 0.5) * 1000000
    };
  }

  private setInitialGoals(shipType: ShipType, goals: NPCGoalSystem): void {
    switch (shipType) {
      case ShipType.CARGO_FREIGHTER:
        goals.addGoal(GoalType.ECONOMIC, 'Transport cargo profitably', 8);
        break;

      case ShipType.MINING_VESSEL:
        goals.addGoal(GoalType.ECONOMIC, 'Mine valuable resources', 9);
        break;

      case ShipType.PATROL_SHIP:
        goals.addGoal(GoalType.SURVIVAL, 'Patrol territory and maintain security', 7);
        break;

      case ShipType.RESEARCH:
        goals.addGoal(GoalType.PERSONAL, 'Explore and discover anomalies', 8);
        break;

      case ShipType.PIRATE:
        goals.addGoal(GoalType.ECONOMIC, 'Raid and plunder', 9);
        goals.addGoal(GoalType.SURVIVAL, 'Avoid authorities', 7);
        break;

      default:
        goals.addGoal(GoalType.SURVIVAL, 'Stay alive and operational', 6);
    }
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  /**
   * Get integrated ship by ID
   */
  public getShip(id: string): IntegratedNPCShip | undefined {
    return this.integratedShips.get(id);
  }

  /**
   * Get all ships
   */
  public getAllShips(): IntegratedNPCShip[] {
    return Array.from(this.integratedShips.values());
  }

  /**
   * Get faction AI
   */
  public getFaction(id: string): FactionAI | undefined {
    return this.factionAIs.get(id);
  }

  /**
   * Get context provider
   */
  public getContextProvider(): UniverseContextProvider {
    return this.contextProvider;
  }

  /**
   * Get star system
   */
  public getStarSystem(): StarSystem {
    return this.starSystem;
  }

  /**
   * Generate full status report
   */
  public generateStatusReport(): string {
    const lines: string[] = [];

    lines.push('═'.repeat(80));
    lines.push('INTEGRATED UNIVERSE STATUS');
    lines.push('═'.repeat(80));
    lines.push('');

    lines.push(`Time: ${this.time.toFixed(2)}s`);
    lines.push(`Updates: ${this.updateCounter}`);
    lines.push('');

    lines.push('STAR SYSTEM:');
    lines.push(`  Name: ${this.starSystem.name}`);
    lines.push(`  Planets: ${this.starSystem.planets.length}`);
    lines.push(`  Stations: ${this.starSystem.stations.length}`);
    lines.push(`  Active Hazards: ${this.starSystem.hazardSystem.getActiveHazards().length}`);
    lines.push('');

    lines.push('NPCs:');
    lines.push(`  Total Ships: ${this.integratedShips.size}`);

    const statuses = new Map<ShipStatus, number>();
    for (const npc of this.integratedShips.values()) {
      const count = statuses.get(npc.ship.status) || 0;
      statuses.set(npc.ship.status, count + 1);
    }

    for (const [status, count] of statuses) {
      lines.push(`    ${status}: ${count}`);
    }
    lines.push('');

    lines.push('FACTIONS:');
    lines.push(`  Total Factions: ${this.factionAIs.size}`);
    for (const [id, faction] of this.factionAIs) {
      const status = faction.getStatus();
      lines.push(`  ${id}: ${status.territories} territories, ${status.fleets} fleets`);
    }
    lines.push('');

    lines.push('BASE ORCHESTRATOR:');
    const baseReport = this.baseOrchestrator.generateUniverseReport();
    lines.push(baseReport);

    lines.push('═'.repeat(80));

    return lines.join('\n');
  }

  // ====================================================================
  // AWESOME FEATURE ACCESSORS
  // ====================================================================

  /**
   * Get interaction manager stats
   */
  public getInteractionStats() {
    return this.interactionManager.getStats();
  }

  /**
   * Get active combat encounters
   */
  public getActiveCombat() {
    return this.interactionManager.getActiveCombat();
  }

  /**
   * Get recent interactions
   */
  public getRecentInteractions(count: number = 20) {
    return this.interactionManager.getRecentInteractions(count);
  }

  /**
   * Get cascade system stats
   */
  public getCascadeStats() {
    return this.cascadeSystem.getStats();
  }

  /**
   * Get active cascade chains
   */
  public getActiveCascades() {
    return this.cascadeSystem.getActiveCascades();
  }

  /**
   * Get recent cascade chains
   */
  public getRecentCascades(count: number = 10) {
    return this.cascadeSystem.getRecentChains(count);
  }

  /**
   * Render dashboard to console
   */
  public renderDashboard(): void {
    if (this.config.enableDashboard) {
      this.dashboard.render();
    }
  }

  /**
   * Get dashboard stats
   */
  public getDashboardStats() {
    if (this.config.enableDashboard) {
      return this.dashboard.getStats();
    }
    return null;
  }
}
