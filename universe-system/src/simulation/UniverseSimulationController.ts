/**
 * UniverseSimulationController - Core simulation engine
 *
 * This is the "heart" of the living universe. It processes simulation at three scales:
 * - MACRO: Universe-wide events (wars, economic cycles, faction dynamics)
 * - MESO: System-level events (station activity, local economy, traffic)
 * - MICRO: Entity-level events (individual ship AI, player interactions)
 *
 * Key principle: Everything simulates even when player isn't looking.
 */

import { StarSystem } from '../StarSystem';
import { HistoricalMemorySystem, HistoricalEvent } from './HistoricalMemorySystem';
import { ConsequenceEngine, Consequence } from './ConsequenceEngine';
import { Faction } from '../FactionSystem';
import { NPCShip } from '../NPCShipAI';

export interface SimulationConfig {
  // Tick rates (seconds between updates)
  macroTickRate: number;   // Default: 3600 (1 hour game time)
  mesoTickRate: number;    // Default: 60 (1 minute game time)
  microTickRate: number;   // Default: 1/60 (realtime for nearby entities)

  // Performance limits
  maxActiveEntities: number;        // Default: 100
  maxSimultaneousEvents: number;    // Default: 50

  // Simulation depth
  enableMacroSim: boolean;          // Universe-wide
  enableMesoSim: boolean;           // System-level
  enableMicroSim: boolean;          // Entity-level

  // Time scale
  timeScale: number;                // 1.0 = realtime, 10.0 = 10x speed
}

export interface UniverseState {
  simulationTime: number;           // Total elapsed simulation time (seconds)
  realTime: number;                 // Real-world time elapsed
  tickCount: number;                // Total ticks processed

  // Active elements
  activeSystems: StarSystem[];
  activeFactions: Faction[];
  activeShips: NPCShip[];

  // Simulation health
  averageFrameTime: number;
  eventQueueSize: number;
  memoryUsage: number;
}

export class UniverseSimulationController {
  private config: SimulationConfig;
  private state: UniverseState;
  private history: HistoricalMemorySystem;
  private consequences: ConsequenceEngine;

  // Tick accumulators
  private macroAccumulator: number = 0;
  private mesoAccumulator: number = 0;
  private microAccumulator: number = 0;

  // Event queue
  private pendingEvents: HistoricalEvent[] = [];

  // Performance tracking
  private frameTimeSamples: number[] = [];
  private lastTickTime: number = 0;

  constructor(
    history: HistoricalMemorySystem,
    consequences: ConsequenceEngine,
    config?: Partial<SimulationConfig>
  ) {
    this.history = history;
    this.consequences = consequences;

    this.config = {
      macroTickRate: 3600,
      mesoTickRate: 60,
      microTickRate: 1/60,
      maxActiveEntities: 100,
      maxSimultaneousEvents: 50,
      enableMacroSim: true,
      enableMesoSim: true,
      enableMicroSim: true,
      timeScale: 1.0,
      ...config
    };

    this.state = {
      simulationTime: 0,
      realTime: 0,
      tickCount: 0,
      activeSystems: [],
      activeFactions: [],
      activeShips: [],
      averageFrameTime: 0,
      eventQueueSize: 0,
      memoryUsage: 0
    };
  }

  /**
   * Main update loop - call every frame
   */
  public update(deltaTime: number, playerSystem: StarSystem | null): void {
    const startTime = performance.now();

    // Apply time scale
    const scaledDelta = deltaTime * this.config.timeScale;
    this.state.simulationTime += scaledDelta;
    this.state.realTime += deltaTime;
    this.state.tickCount++;

    // Accumulate time for different tick rates
    this.macroAccumulator += scaledDelta;
    this.mesoAccumulator += scaledDelta;
    this.microAccumulator += scaledDelta;

    // MACRO TICK: Universe-wide simulation
    if (this.config.enableMacroSim && this.macroAccumulator >= this.config.macroTickRate) {
      this.processMacroTick();
      this.macroAccumulator = 0;
    }

    // MESO TICK: System-level simulation
    if (this.config.enableMesoSim && this.mesoAccumulator >= this.config.mesoTickRate) {
      this.processMesoTick(this.state.activeSystems);
      this.mesoAccumulator = 0;
    }

    // MICRO TICK: Entity-level simulation (every frame for nearby entities)
    if (this.config.enableMicroSim && this.microAccumulator >= this.config.microTickRate) {
      this.processMicroTick(deltaTime, playerSystem);
      this.microAccumulator = 0;
    }

    // Process pending events
    this.processEventQueue();

    // Update performance metrics
    const frameTime = performance.now() - startTime;
    this.updatePerformanceMetrics(frameTime);
  }

  /**
   * MACRO TICK: Process universe-wide events
   * Runs every 1 hour game time (configurable)
   *
   * Handles:
   * - Faction diplomatic changes
   * - Large-scale economic cycles
   * - Wars, treaties, territorial changes
   * - Historical event generation
   */
  private processMacroTick(): void {
    console.log(`[MACRO TICK] ${this.state.simulationTime}s`);

    // 1. Process faction actions
    this.processFactionActions();

    // 2. Process economic cycles
    this.processEconomicCycles();

    // 3. Generate major historical events
    this.generateMajorEvents();

    // 4. Update faction relationships
    this.updateFactionDiplomacy();

    // 5. Process long-term consequences
    this.processLongTermConsequences();
  }

  /**
   * MESO TICK: Process system-level events
   * Runs every 1 minute game time (configurable)
   *
   * Handles:
   * - Station economy updates
   * - Local traffic patterns
   * - Regional events
   * - Communication network updates
   */
  private processMesoTick(systems: StarSystem[]): void {
    for (const system of systems) {
      // Skip systems far from player (optimization)
      if (!this.isSystemActive(system)) {
        continue;
      }

      // Process system economy
      this.processSystemEconomy(system);

      // Process system traffic
      this.processSystemTraffic(system);

      // Generate system events
      this.generateSystemEvents(system);

      // Update communication network
      this.updateCommunications(system);
    }
  }

  /**
   * MICRO TICK: Process entity-level events
   * Runs every frame (60 FPS) for nearby entities
   *
   * Handles:
   * - Individual NPC AI
   * - Player interactions
   * - Immediate consequences
   * - Real-time physics
   */
  private processMicroTick(deltaTime: number, playerSystem: StarSystem | null): void {
    if (!playerSystem) return;

    // Process only entities near player
    const nearbyShips = this.getNearbyShips(playerSystem, 200000); // 200km radius

    for (const ship of nearbyShips) {
      // Update ship AI
      ship.update(deltaTime);

      // Check for immediate events
      this.checkImmediateEvents(ship, playerSystem);
    }

    // Update player system in detail
    playerSystem.update(deltaTime);
  }

  /**
   * Process faction-level actions (wars, expansions, treaties)
   */
  private processFactionActions(): void {
    for (const faction of this.state.activeFactions) {
      // Evaluate faction goals
      const goals = this.evaluateFactionGoals(faction);

      // Take actions toward goals
      for (const goal of goals) {
        const action = this.planFactionAction(faction, goal);

        if (action) {
          this.executeFactionAction(action);
        }
      }
    }
  }

  /**
   * Process universe-wide economic cycles
   */
  private processEconomicCycles(): void {
    // Check for economic events
    const economicEvents = this.generateEconomicEvents();

    for (const event of economicEvents) {
      // Record to history
      this.history.recordEvent(event);

      // Generate consequences
      const consequences = this.consequences.processEvent(event);

      // Execute consequences
      this.executeConsequences(consequences);
    }
  }

  /**
   * Generate major historical events
   */
  private generateMajorEvents(): void {
    // Chance for major event (wars, discoveries, disasters)
    if (Math.random() < 0.1) { // 10% chance per macro tick
      const eventType = this.selectMajorEventType();
      const event = this.createMajorEvent(eventType);

      if (event) {
        this.pendingEvents.push(event);
      }
    }
  }

  /**
   * Update faction diplomatic relationships
   */
  private updateFactionDiplomacy(): void {
    for (let i = 0; i < this.state.activeFactions.length; i++) {
      for (let j = i + 1; j < this.state.activeFactions.length; j++) {
        const factionA = this.state.activeFactions[i];
        const factionB = this.state.activeFactions[j];

        this.updateRelationship(factionA, factionB);
      }
    }
  }

  /**
   * Process long-term consequences of past events
   */
  private processLongTermConsequences(): void {
    const recentEvents = this.history.getRecentEvents(this.config.macroTickRate);

    for (const event of recentEvents) {
      const consequences = this.consequences.processLongTermEffects(event, this.state.simulationTime);
      this.executeConsequences(consequences);
    }
  }

  /**
   * Process system-level economy
   */
  private processSystemEconomy(system: StarSystem): void {
    // Update station inventories
    for (const station of system.stations) {
      station.updateEconomy(this.config.mesoTickRate);
    }

    // Process trade routes
    this.updateTradeRoutes(system);

    // Check for shortages/surpluses
    this.checkEconomicImbalances(system);
  }

  /**
   * Process system traffic patterns
   */
  private processSystemTraffic(system: StarSystem): void {
    // Spawn new ships based on economic activity
    this.spawnTrafficShips(system);

    // Update existing ships
    for (const ship of this.getSystemShips(system)) {
      ship.update(this.config.mesoTickRate);
    }

    // Despawn distant ships
    this.cullDistantShips(system);
  }

  /**
   * Generate system-level events
   */
  private generateSystemEvents(system: StarSystem): void {
    // Random events (solar flares, asteroid strikes, etc.)
    const events = system.generateEvents(this.config.mesoTickRate);

    for (const event of events) {
      this.pendingEvents.push(event);
    }
  }

  /**
   * Update communication networks
   */
  private updateCommunications(system: StarSystem): void {
    // Process message propagation
    system.communicationsManager?.update(this.config.mesoTickRate);

    // Generate traffic control messages
    this.generateTrafficMessages(system);
  }

  /**
   * Check for immediate events (collisions, encounters)
   */
  private checkImmediateEvents(ship: NPCShip, system: StarSystem): void {
    // Check for collisions
    const collision = this.checkCollisions(ship, system);
    if (collision) {
      const event = this.createCollisionEvent(ship, collision);
      this.pendingEvents.push(event);
    }

    // Check for encounters
    const encounter = this.checkEncounters(ship, system);
    if (encounter) {
      const event = this.createEncounterEvent(ship, encounter);
      this.pendingEvents.push(event);
    }
  }

  /**
   * Process event queue with priority
   */
  private processEventQueue(): void {
    // Sort by priority
    this.pendingEvents.sort((a, b) => b.priority - a.priority);

    // Process up to max simultaneous events
    const eventsToProcess = this.pendingEvents.splice(0, this.config.maxSimultaneousEvents);

    for (const event of eventsToProcess) {
      // Record to history
      this.history.recordEvent(event);

      // Generate consequences
      const consequences = this.consequences.processEvent(event);

      // Execute consequences
      this.executeConsequences(consequences);
    }

    this.state.eventQueueSize = this.pendingEvents.length;
  }

  /**
   * Execute consequences generated by events
   */
  private executeConsequences(consequences: Consequence[]): void {
    for (const consequence of consequences) {
      switch (consequence.type) {
        case 'ECONOMIC_IMPACT':
          this.applyEconomicConsequence(consequence);
          break;
        case 'DIPLOMATIC_IMPACT':
          this.applyDiplomaticConsequence(consequence);
          break;
        case 'ENTITY_ACTION':
          this.triggerEntityAction(consequence);
          break;
        case 'SPAWN_EVENT':
          this.pendingEvents.push(consequence.event);
          break;
        default:
          console.warn(`Unknown consequence type: ${consequence.type}`);
      }
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(frameTime: number): void {
    this.frameTimeSamples.push(frameTime);

    // Keep last 60 samples (1 second at 60 FPS)
    if (this.frameTimeSamples.length > 60) {
      this.frameTimeSamples.shift();
    }

    // Calculate average
    this.state.averageFrameTime =
      this.frameTimeSamples.reduce((a, b) => a + b, 0) / this.frameTimeSamples.length;
  }

  // ====================================================================
  // HELPER METHODS (Stubs - to be implemented with full logic)
  // ====================================================================

  private isSystemActive(system: StarSystem): boolean {
    // System is active if:
    // 1. Player is in it, or
    // 2. Recent player activity (last hour), or
    // 3. Has active ships/events
    // For now, simulate all active systems (can optimize later)
    return this.state.activeSystems.includes(system);
  }

  private getNearbyShips(system: StarSystem, radius: number): NPCShip[] {
    // Filter ships in this system and within radius
    // TODO: Optimize with spatial hash in future
    return this.state.activeShips.filter(ship => {
      if (ship.system !== system) return false;

      // Check distance if position available
      if (ship.position && system.star?.position) {
        const dx = ship.position.x - system.star.position.x;
        const dy = ship.position.y - system.star.position.y;
        const dz = ship.position.z - system.star.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        return distSq <= radius * radius;
      }

      return true; // Include if can't check distance
    });
  }

  private evaluateFactionGoals(faction: Faction): any[] {
    const goals: any[] = [];

    // Resource needs drive goals
    if ((faction as any).economy) {
      const economy = (faction as any).economy;

      // Check for critical shortages
      if (economy.criticalResources) {
        for (const [resource, need] of economy.criticalResources) {
          if (need.inCrisis) {
            goals.push({
              type: 'ACQUIRE_RESOURCE',
              priority: 100,
              resource,
              deficit: need.deficit
            });
          }
        }
      }

      // Check for expansion opportunities
      if (economy.gdpGrowth > 0.05) {
        goals.push({
          type: 'EXPAND_TERRITORY',
          priority: 60
        });
      }
    }

    // Diplomatic goals based on relationships
    if ((faction as any).relationships) {
      for (const [otherId, relationship] of Object.entries((faction as any).relationships || {})) {
        const rel = relationship as any;
        if (rel.value < -50) {
          goals.push({
            type: 'IMPROVE_RELATIONS',
            priority: 40,
            target: otherId
          });
        }
      }
    }

    return goals;
  }

  private planFactionAction(faction: Faction, goal: any): any {
    switch (goal.type) {
      case 'ACQUIRE_RESOURCE':
        return {
          type: 'TRADE_NEGOTIATION',
          target: goal.resource,
          faction: faction.id
        };

      case 'EXPAND_TERRITORY':
        return {
          type: 'ESTABLISH_OUTPOST',
          faction: faction.id
        };

      case 'IMPROVE_RELATIONS':
        return {
          type: 'DIPLOMATIC_MISSION',
          faction: faction.id,
          target: goal.target
        };

      default:
        return null;
    }
  }

  private executeFactionAction(action: any): void {
    // Create historical event for this action
    const event: HistoricalEvent = {
      id: this.generateEventId(),
      timestamp: this.state.simulationTime,
      type: 'CUSTOM_EVENT',
      category: 'DIPLOMATIC',
      severity: 5,
      location: { x: 0, y: 0, z: 0 },
      participants: [action.faction],
      description: `Faction ${action.faction} executed ${action.type}`,
      data: action,
      consequences: [],
      witnessed: false,
      priority: 5,
      tags: ['faction', 'action']
    };

    this.pendingEvents.push(event);
  }

  private generateEconomicEvents(): HistoricalEvent[] {
    const events: HistoricalEvent[] = [];

    // 5% chance of economic event per macro tick
    if (Math.random() < 0.05) {
      const eventTypes = ['ECONOMIC_BOOM', 'ECONOMIC_RECESSION', 'MARKET_CRASH'];
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)] as EventType;

      events.push({
        id: this.generateEventId(),
        timestamp: this.state.simulationTime,
        type,
        category: 'ECONOMIC',
        severity: 6,
        location: { x: 0, y: 0, z: 0 },
        participants: [],
        description: `Universe-wide ${type.replace(/_/g, ' ').toLowerCase()}`,
        data: {
          gdpImpact: type === 'ECONOMIC_BOOM' ? 0.2 : -0.15,
          duration: 604800 // 1 week
        },
        consequences: [],
        witnessed: false,
        priority: 7,
        tags: ['economy', 'macro']
      });
    }

    return events;
  }

  private selectMajorEventType(): string {
    const types = ['WAR', 'DISCOVERY', 'DISASTER', 'BREAKTHROUGH'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private createMajorEvent(type: string): HistoricalEvent | null {
    // Create major universe-altering event
    switch (type) {
      case 'WAR':
        if (this.state.activeFactions.length >= 2) {
          const factionA = this.state.activeFactions[Math.floor(Math.random() * this.state.activeFactions.length)];
          const factionB = this.state.activeFactions.filter(f => f !== factionA)[0];

          return {
            id: this.generateEventId(),
            timestamp: this.state.simulationTime,
            type: 'WAR_DECLARED',
            category: 'MILITARY',
            severity: 9,
            location: { x: 0, y: 0, z: 0 },
            participants: [factionA.id, factionB.id],
            description: `War declared between ${factionA.name} and ${factionB.name}`,
            data: { factionA: factionA.id, factionB: factionB.id, casusBelli: 'territorial_dispute' },
            consequences: [],
            witnessed: false,
            priority: 10,
            tags: ['war', 'major', 'diplomatic']
          };
        }
        break;

      case 'DISCOVERY':
        return {
          id: this.generateEventId(),
          timestamp: this.state.simulationTime,
          type: 'POI_DISCOVERED',
          category: 'DISCOVERY',
          severity: 7,
          location: { x: Math.random() * 1e9, y: Math.random() * 1e9, z: Math.random() * 1e9 },
          participants: [],
          description: 'Major scientific discovery made',
          data: { discoveryType: 'ANCIENT_ARTIFACT', value: 1000000 },
          consequences: [],
          witnessed: false,
          priority: 8,
          tags: ['discovery', 'science']
        };

      case 'DISASTER':
        if (this.state.activeSystems.length > 0) {
          const system = this.state.activeSystems[Math.floor(Math.random() * this.state.activeSystems.length)];
          return {
            id: this.generateEventId(),
            timestamp: this.state.simulationTime,
            type: 'SOLAR_FLARE',
            category: 'ENVIRONMENTAL',
            severity: 8,
            location: system.star?.position || { x: 0, y: 0, z: 0 },
            systemId: system.id,
            participants: [],
            description: `Massive solar flare in ${system.name}`,
            data: { duration: 7200, intensity: 9 },
            consequences: [],
            witnessed: false,
            priority: 9,
            tags: ['disaster', 'environmental']
          };
        }
        break;

      case 'BREAKTHROUGH':
        return {
          id: this.generateEventId(),
          timestamp: this.state.simulationTime,
          type: 'CUSTOM_EVENT',
          category: 'DISCOVERY',
          severity: 7,
          location: { x: 0, y: 0, z: 0 },
          participants: [],
          description: 'Technological breakthrough achieved',
          data: { technologyType: 'FTL_IMPROVEMENT', benefit: 0.2 },
          consequences: [],
          witnessed: false,
          priority: 7,
          tags: ['technology', 'breakthrough']
        };
    }

    return null;
  }

  private updateRelationship(factionA: Faction, factionB: Faction): void {
    // Update faction relationship based on recent interactions
    const recentEvents = this.history.getRecentEvents(this.config.macroTickRate);

    let relationshipDelta = 0;

    for (const event of recentEvents) {
      // Check if both factions involved
      if (event.participants.includes(factionA.id) && event.participants.includes(factionB.id)) {
        // Positive events improve relations
        if (event.type === 'TRADE_COMPLETED' || event.type === 'TRADE_AGREEMENT') {
          relationshipDelta += 2;
        }

        // Negative events worsen relations
        if (event.type === 'COMBAT_STARTED' || event.type === 'PIRATE_RAID') {
          relationshipDelta -= 5;
        }

        if (event.type === 'STATION_DESTROYED' || event.type === 'STATION_ATTACKED') {
          relationshipDelta -= 10;
        }
      }
    }

    // Apply natural drift toward neutral (very slow)
    const currentRel = (factionA as any).relationships?.[factionB.id] || 0;
    const drift = -currentRel * 0.01; // 1% drift toward 0

    relationshipDelta += drift;

    // Update relationship (would integrate with FactionDiplomacyEngine in full implementation)
    if ((factionA as any).relationships) {
      (factionA as any).relationships[factionB.id] = Math.max(-100, Math.min(100,
        ((factionA as any).relationships[factionB.id] || 0) + relationshipDelta
      ));
    }
  }

  private updateTradeRoutes(system: StarSystem): void {
    // Update trade route profitability based on prices
    // This would integrate with EconomySystem in full implementation
    if (!system.stations || system.stations.length < 2) return;

    for (let i = 0; i < system.stations.length; i++) {
      for (let j = i + 1; j < system.stations.length; j++) {
        const stationA = system.stations[i];
        const stationB = system.stations[j];

        // Check price differences for profitable routes
        if (stationA.economy && stationB.economy) {
          const pricesA = (stationA.economy as any).prices || {};
          const pricesB = (stationB.economy as any).prices || {};

          // Find arbitrage opportunities
          for (const commodity in pricesA) {
            if (pricesB[commodity]) {
              const profit = pricesB[commodity] - pricesA[commodity];
              if (Math.abs(profit) > pricesA[commodity] * 0.2) {
                // Profitable route - spawn trader (simplified)
                // Full implementation would use TrafficManager
              }
            }
          }
        }
      }
    }
  }

  private checkEconomicImbalances(system: StarSystem): void {
    // Check for supply/demand imbalances that could cause events
    if (!system.stations) return;

    for (const station of system.stations) {
      if (!station.economy) continue;

      const inventory = (station.economy as any).inventory || {};
      const consumption = (station.economy as any).consumption || {};

      for (const commodity in consumption) {
        const stock = inventory[commodity] || 0;
        const consumptionRate = consumption[commodity] || 0;
        const daysRemaining = consumptionRate > 0 ? stock / (consumptionRate / 86400) : Infinity;

        // Critical shortage - generate event
        if (daysRemaining < 3 && daysRemaining > 0) {
          const event: HistoricalEvent = {
            id: this.generateEventId(),
            timestamp: this.state.simulationTime,
            type: 'SHORTAGE',
            category: 'ECONOMIC',
            severity: 7,
            location: station.position,
            stationId: station.id,
            participants: [station.id],
            description: `Critical shortage of ${commodity} at ${station.name}`,
            data: { commodity, daysRemaining, station: station.id },
            consequences: [],
            witnessed: false,
            priority: 8,
            tags: ['shortage', 'economy', 'crisis']
          };

          this.pendingEvents.push(event);
        }
      }
    }
  }

  private spawnTrafficShips(system: StarSystem): void {
    // Spawn ships based on economic activity and station populations
    if (!system.stations || system.stations.length === 0) return;

    // Calculate spawn probability based on system activity
    const totalPopulation = system.stations.reduce((sum, s) => sum + ((s as any).population || 0), 0);
    const economicActivity = system.stations.reduce((sum, s) => {
      const economy = (s as any).economy;
      return sum + (economy?.gdp || 0);
    }, 0);

    // Base spawn rate: 1 ship per 10,000 population per hour
    const spawnProbability = (totalPopulation / 10000) * (this.config.mesoTickRate / 3600);

    if (Math.random() < spawnProbability && this.state.activeShips.length < this.config.maxActiveEntities) {
      // Would spawn ship using TrafficManager in full implementation
      // For now, just log
      console.log(`[TRAFFIC] Would spawn ship in ${system.name}`);
    }
  }

  private getSystemShips(system: StarSystem): NPCShip[] {
    return this.state.activeShips.filter(ship => ship.system === system);
  }

  private cullDistantShips(system: StarSystem): void {
    // Remove ships far from player to manage performance
    const MAX_DISTANCE = 1000000; // 1000 km

    this.state.activeShips = this.state.activeShips.filter(ship => {
      if (ship.system !== system) {
        // Keep ships in other systems for now
        return true;
      }

      // Check distance from system center
      if (ship.position && system.star?.position) {
        const dx = ship.position.x - system.star.position.x;
        const dy = ship.position.y - system.star.position.y;
        const dz = ship.position.z - system.star.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq > MAX_DISTANCE * MAX_DISTANCE) {
          console.log(`[CULL] Removing distant ship ${ship.name || ship.id}`);
          return false;
        }
      }

      return true;
    });
  }

  private generateTrafficMessages(system: StarSystem): void {
    // Generate traffic control messages for realism
    const ships = this.getSystemShips(system);

    if (ships.length > 0 && Math.random() < 0.1) {
      // 10% chance of traffic message
      const ship = ships[Math.floor(Math.random() * ships.length)];
      const messages = [
        `Traffic Control: ${ship.name || ship.id} cleared for departure`,
        `Traffic Control: ${ship.name || ship.id} on approach vector`,
        `Traffic Control: Course deviation detected for ${ship.name || ship.id}`,
        `Traffic Control: ${ships.length} vessels in system traffic`
      ];

      const message = messages[Math.floor(Math.random() * messages.length)];
      console.log(`[TRAFFIC] ${system.name}: ${message}`);
    }
  }

  private checkCollisions(ship: NPCShip, system: StarSystem): any {
    // Check for potential collisions with other ships
    const nearbyShips = this.getNearbyShips(system, 1000); // 1km radius

    for (const other of nearbyShips) {
      if (other === ship || !other.position || !ship.position) continue;

      const dx = other.position.x - ship.position.x;
      const dy = other.position.y - ship.position.y;
      const dz = other.position.z - ship.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // Collision threshold: 100m
      if (distSq < 100 * 100) {
        return {
          otherId: other.id,
          otherName: other.name || other.id,
          distance: Math.sqrt(distSq),
          relativeVelocity: this.calculateRelativeVelocity(ship, other)
        };
      }
    }

    return null;
  }

  private checkEncounters(ship: NPCShip, system: StarSystem): any {
    // Check for non-collision encounters (e.g., hailing distance)
    const nearbyShips = this.getNearbyShips(system, 10000); // 10km radius

    for (const other of nearbyShips) {
      if (other === ship || !other.position || !ship.position) continue;

      const dx = other.position.x - ship.position.x;
      const dy = other.position.y - ship.position.y;
      const dz = other.position.z - ship.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // Encounter threshold: 1-10km
      if (distSq > 1000 * 1000 && distSq < 10000 * 10000 && Math.random() < 0.01) {
        return {
          otherId: other.id,
          otherName: other.name || other.id,
          distance: Math.sqrt(distSq),
          encounterType: 'HAILING_DISTANCE'
        };
      }
    }

    return null;
  }

  private calculateRelativeVelocity(shipA: NPCShip, shipB: NPCShip): number {
    const velA = (shipA as any).velocity || { x: 0, y: 0, z: 0 };
    const velB = (shipB as any).velocity || { x: 0, y: 0, z: 0 };

    const dvx = velA.x - velB.x;
    const dvy = velA.y - velB.y;
    const dvz = velA.z - velB.z;

    return Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
  }

  private createCollisionEvent(ship: NPCShip, collision: any): HistoricalEvent {
    return {
      id: this.generateEventId(),
      timestamp: this.state.simulationTime,
      type: 'COLLISION',
      severity: 5,
      location: ship.position,
      participants: [ship.id, collision.otherId],
      description: `${ship.name} collided with ${collision.otherName}`,
      data: { ship, collision },
      consequences: [],
      priority: 8
    };
  }

  private createEncounterEvent(ship: NPCShip, encounter: any): HistoricalEvent {
    return {
      id: this.generateEventId(),
      timestamp: this.state.simulationTime,
      type: 'ENCOUNTER',
      severity: 3,
      location: ship.position,
      participants: [ship.id, encounter.otherId],
      description: `${ship.name} encountered ${encounter.otherName}`,
      data: { ship, encounter },
      consequences: [],
      priority: 5
    };
  }

  private applyEconomicConsequence(consequence: Consequence): void {
    // Apply economic consequences to the universe
    switch (consequence.type) {
      case 'PRICE_CHANGE':
        this.applyPriceChange(consequence);
        break;

      case 'SUPPLY_DISRUPTION':
        this.applySupplyDisruption(consequence);
        break;

      case 'COMMODITY_SHORTAGE':
        this.applyCommodityShortage(consequence);
        break;

      case 'TRADE_ROUTE_BLOCKED':
        this.applyTradeRouteBlock(consequence);
        break;

      default:
        console.log(`[ECONOMIC] Applied ${consequence.type}`);
    }
  }

  private applyDiplomaticConsequence(consequence: Consequence): void {
    // Apply diplomatic consequences
    switch (consequence.type) {
      case 'REPUTATION_CHANGE':
        if (consequence.data.faction && consequence.data.change) {
          const faction = this.state.activeFactions.find(f => f.id === consequence.data.faction);
          if (faction && (faction as any).reputation) {
            (faction as any).reputation += consequence.data.change;
            console.log(`[DIPLOMATIC] ${faction.name} reputation changed by ${consequence.data.change}`);
          }
        }
        break;

      case 'RELATIONSHIP_DETERIORATION':
      case 'RELATIONSHIP_IMPROVEMENT':
        if (consequence.data.entityA && consequence.data.entityB) {
          const change = consequence.type === 'RELATIONSHIP_IMPROVEMENT'
            ? consequence.data.change || 10
            : -(consequence.data.change || 10);

          // Update relationship (simplified)
          const factionA = this.state.activeFactions.find(f => f.id === consequence.data.entityA);
          const factionB = this.state.activeFactions.find(f => f.id === consequence.data.entityB);

          if (factionA && factionB) {
            if (!(factionA as any).relationships) (factionA as any).relationships = {};
            (factionA as any).relationships[factionB.id] =
              Math.max(-100, Math.min(100,
                ((factionA as any).relationships[factionB.id] || 0) + change
              ));

            console.log(`[DIPLOMATIC] Relationship between ${factionA.name} and ${factionB.name} changed by ${change}`);
          }
        }
        break;

      case 'WAR_LIKELIHOOD_INCREASE':
        console.log(`[DIPLOMATIC] War probability increased between ${consequence.data.factionA} and ${consequence.data.factionB}`);
        // Would integrate with FactionDiplomacyEngine
        break;

      default:
        console.log(`[DIPLOMATIC] Applied ${consequence.type}`);
    }
  }

  private triggerEntityAction(consequence: Consequence): void {
    // Trigger actions for specific entities
    if (consequence.data.entityType === 'TRADER') {
      // Trader behavioral change
      console.log(`[ENTITY] Trader behavior change: ${consequence.data.behaviorChange}`);
    }

    if (consequence.data.type === 'GOAL_CREATED') {
      // Create new goal for entity (would integrate with NPCGoalSystem)
      console.log(`[ENTITY] New goal created for ${consequence.affectedEntities.join(', ')}`);
    }

    if (consequence.data.type === 'BEHAVIOR_CHANGE') {
      // Apply behavior modification (would integrate with ExtendedNPCMemory)
      console.log(`[ENTITY] Behavior change for ${consequence.affectedEntities.join(', ')}`);
    }
  }

  // Helper methods for economic consequences
  private applyPriceChange(consequence: Consequence): void {
    const { commodity, priceMultiplier, region } = consequence.data;

    // Apply to all stations in region
    for (const system of this.state.activeSystems) {
      if (region && system.id !== region) continue;

      if (system.stations) {
        for (const station of system.stations) {
          if (station.economy && (station.economy as any).prices) {
            const currentPrice = (station.economy as any).prices[commodity] || 100;
            (station.economy as any).prices[commodity] = currentPrice * priceMultiplier;
          }
        }
      }
    }

    console.log(`[ECONOMIC] Price of ${commodity} changed by ${(priceMultiplier - 1) * 100}%`);
  }

  private applySupplyDisruption(consequence: Consequence): void {
    const { stationId, commodity } = consequence.data;

    for (const system of this.state.activeSystems) {
      const station = system.stations?.find(s => s.id === stationId);
      if (station && station.economy) {
        const inventory = (station.economy as any).inventory || {};
        inventory[commodity] = Math.max(0, (inventory[commodity] || 0) * 0.5); // Cut supply in half
        (station.economy as any).inventory = inventory;

        console.log(`[ECONOMIC] Supply disruption of ${commodity} at ${station.name}`);
      }
    }
  }

  private applyCommodityShortage(consequence: Consequence): void {
    const { commodities, affectedStations, severityMultiplier } = consequence.data;

    for (const stationId of affectedStations || []) {
      for (const system of this.state.activeSystems) {
        const station = system.stations?.find(s => s.id === stationId);
        if (station && station.economy) {
          for (const commodity of commodities || []) {
            const prices = (station.economy as any).prices || {};
            prices[commodity] = (prices[commodity] || 100) * (severityMultiplier || 2);
            (station.economy as any).prices = prices;
          }
        }
      }
    }

    console.log(`[ECONOMIC] Commodity shortage affecting ${affectedStations?.length || 0} stations`);
  }

  private applyTradeRouteBlock(consequence: Consequence): void {
    console.log(`[ECONOMIC] Trade route blocked: ${JSON.stringify(consequence.data)}`);
    // Would integrate with TrafficManager to actually block routes
  }

  private generateEventId(): string {
    return `event_${this.state.tickCount}_${Date.now()}`;
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  /**
   * Get current simulation state
   */
  public getState(): UniverseState {
    return { ...this.state };
  }

  /**
   * Set simulation time scale
   */
  public setTimeScale(scale: number): void {
    this.config.timeScale = Math.max(0.1, Math.min(100, scale));
  }

  /**
   * Pause/resume simulation
   */
  public setPaused(paused: boolean): void {
    this.config.timeScale = paused ? 0 : 1.0;
  }

  /**
   * Add star system to active simulation
   */
  public addSystem(system: StarSystem): void {
    if (!this.state.activeSystems.includes(system)) {
      this.state.activeSystems.push(system);
    }
  }

  /**
   * Remove star system from active simulation
   */
  public removeSystem(system: StarSystem): void {
    const index = this.state.activeSystems.indexOf(system);
    if (index !== -1) {
      this.state.activeSystems.splice(index, 1);
    }
  }

  /**
   * Add faction to active simulation
   */
  public addFaction(faction: Faction): void {
    if (!this.state.activeFactions.includes(faction)) {
      this.state.activeFactions.push(faction);
    }
  }

  /**
   * Add ship to active simulation
   */
  public addShip(ship: NPCShip): void {
    if (!this.state.activeShips.includes(ship)) {
      this.state.activeShips.push(ship);
    }
  }

  /**
   * Get performance stats
   */
  public getPerformanceStats(): {
    averageFrameTime: number;
    fps: number;
    eventQueueSize: number;
    activeEntities: number;
  } {
    return {
      averageFrameTime: this.state.averageFrameTime,
      fps: this.state.averageFrameTime > 0 ? 1000 / this.state.averageFrameTime : 0,
      eventQueueSize: this.state.eventQueueSize,
      activeEntities: this.state.activeShips.length + this.state.activeSystems.length
    };
  }
}
