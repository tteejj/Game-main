/**
 * UniverseOrchestrator - Comprehensive Integration Layer
 *
 * Connects all Living Universe systems into a cohesive whole:
 * - Phase 1: Simulation (Macro/Meso/Micro ticks, Memory, Consequences)
 * - Phase 2: Entity AI (Deep memory, Goals, Adaptive learning)
 * - Phase 3: Faction Dynamics (Diplomacy, Economics)
 * - Phase 4: Storytelling (News, Rumors, Chronicles)
 *
 * This is the "central nervous system" of the living universe.
 */

import { UniverseSimulationController, SimulationConfig } from './simulation/UniverseSimulationController';
import { HistoricalMemorySystem, HistoricalEvent } from './simulation/HistoricalMemorySystem';
import { ConsequenceEngine } from './simulation/ConsequenceEngine';

import { ExtendedNPCMemory, PersonalityTraits } from './entity-ai/ExtendedNPCMemory';
import { NPCGoalSystem } from './entity-ai/NPCGoalSystem';
import { AdaptiveAI } from './entity-ai/AdaptiveAI';

import { FactionDiplomacyEngine } from './faction-dynamics/FactionDiplomacyEngine';
import { FactionEconomicNeeds, FactionEconomicState } from './faction-dynamics/FactionEconomicNeeds';

import { NewsGenerationEngine } from './storytelling/NewsGenerationEngine';
import { RumorPropagationSystem } from './storytelling/RumorPropagationSystem';
import { AbsenceSimulator } from './storytelling/AbsenceSimulator';
import { ChronicleGenerator } from './storytelling/ChronicleGenerator';

export interface OrchestratorConfig {
  simulation?: Partial<SimulationConfig>;
  enableEntityAI?: boolean;
  enableFactionDynamics?: boolean;
  enableStorytelling?: boolean;
  enableRumors?: boolean;
  enableChronicles?: boolean;
}

export interface UniverseState {
  currentTime: number;
  tickCount: number;
  activeEntities: number;
  activeFactions: number;
  newsArticlesGenerated: number;
  rumorsInCirculation: number;
  chroniclesWritten: number;
}

export interface EntityRegistration {
  id: string;
  type: 'SHIP' | 'STATION' | 'PLANET' | 'ASTEROID';
  factionId?: string;
  personality?: PersonalityTraits;
  hasAI?: boolean;
}

export interface FactionRegistration {
  id: string;
  name: string;
  initialEconomicState?: Partial<FactionEconomicState>;
}

/**
 * Main orchestrator that connects all universe systems
 */
export class UniverseOrchestrator {
  // Phase 1: Core simulation
  private simulationController: UniverseSimulationController;
  private history: HistoricalMemorySystem;
  private consequences: ConsequenceEngine;

  // Phase 2: Entity AI
  private entityMemories: Map<string, ExtendedNPCMemory> = new Map();
  private entityGoals: Map<string, NPCGoalSystem> = new Map();
  private entityAI: Map<string, AdaptiveAI> = new Map();

  // Phase 3: Faction dynamics
  private diplomacy: FactionDiplomacyEngine;
  private economics: FactionEconomicNeeds;
  private factionRegistry: Map<string, FactionRegistration> = new Map();

  // Phase 4: Storytelling
  private newsEngine: NewsGenerationEngine;
  private rumors: RumorPropagationSystem;
  private absenceSimulator: AbsenceSimulator;
  private chronicles: ChronicleGenerator;

  // State
  private config: OrchestratorConfig;
  private state: UniverseState;
  private lastSaveTime: number = 0;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      enableEntityAI: true,
      enableFactionDynamics: true,
      enableStorytelling: true,
      enableRumors: true,
      enableChronicles: true,
      ...config
    };

    // Initialize Phase 1
    this.history = new HistoricalMemorySystem();
    this.consequences = new ConsequenceEngine(this.history);
    this.simulationController = new UniverseSimulationController(
      this.history,
      this.consequences,
      config.simulation
    );

    // Initialize Phase 3
    this.diplomacy = new FactionDiplomacyEngine();
    this.economics = new FactionEconomicNeeds();

    // Initialize Phase 4
    this.newsEngine = new NewsGenerationEngine();
    this.rumors = new RumorPropagationSystem();
    this.absenceSimulator = new AbsenceSimulator(
      this.history,
      this.consequences,
      this.diplomacy,
      this.economics
    );
    this.chronicles = new ChronicleGenerator(this.history);

    this.state = {
      currentTime: Date.now() / 1000,
      tickCount: 0,
      activeEntities: 0,
      activeFactions: 0,
      newsArticlesGenerated: 0,
      rumorsInCirculation: 0,
      chroniclesWritten: 0
    };

    this.lastSaveTime = this.state.currentTime;

    console.log('[UNIVERSE ORCHESTRATOR] Initialized with all systems online');
  }

  // ====================================================================
  // MAIN UPDATE LOOP
  // ====================================================================

  /**
   * Main update - call this every frame
   */
  public update(deltaTime: number, playerSystem: any = null): void {
    this.state.currentTime += deltaTime;
    this.state.tickCount++;

    // Phase 1: Core simulation
    this.simulationController.update(deltaTime, playerSystem);

    // Phase 2: Update entity AI
    if (this.config.enableEntityAI) {
      this.updateEntityAI(deltaTime);
    }

    // Phase 3: Update faction dynamics
    if (this.config.enableFactionDynamics) {
      this.updateFactionDynamics(deltaTime);
    }

    // Phase 4: Process new events into stories
    if (this.config.enableStorytelling) {
      this.updateStorytelling(deltaTime);
    }
  }

  /**
   * Fast update loop for active entities near player
   */
  private updateEntityAI(deltaTime: number): void {
    for (const [entityId, ai] of this.entityAI) {
      const memory = this.entityMemories.get(entityId);
      const goals = this.entityGoals.get(entityId);

      if (!memory || !goals) continue;

      // Update memory (decay, etc.)
      memory.update(deltaTime);

      // Make decisions
      // In real game, would pass actual game state here
      // For now, just show the integration
    }
  }

  /**
   * Update faction relationships and economics
   */
  private updateFactionDynamics(deltaTime: number): void {
    // Update diplomacy
    this.diplomacy.update(deltaTime);

    // Update economics for each faction
    for (const [factionId, faction] of this.factionRegistry) {
      this.economics.update(factionId, deltaTime);

      // Check for resource-driven actions
      const actions = this.economics.evaluateEconomicActions(factionId);

      // Execute high-priority actions
      for (const action of actions) {
        if (action.priority >= 8) {
          this.executeEconomicAction(factionId, action);
        }
      }
    }
  }

  /**
   * Process events into news, rumors, chronicles
   */
  private updateStorytelling(deltaTime: number): void {
    // Get recent events
    const recentEvents = this.history.queryEvents({
      startTime: this.state.currentTime - 60,  // Last minute
      endTime: this.state.currentTime
    });

    // Generate news from significant events
    for (const event of recentEvents) {
      if (event.severity >= 5) {  // Newsworthy
        this.generateNewsForEvent(event);
      }

      if (event.severity >= 8) {  // Legendary
        this.generateLegendForEvent(event);
      }
    }

    // Periodically generate chronicles
    if (this.state.tickCount % 1000 === 0) {  // Every ~16 seconds at 60fps
      this.generateChronicles();
    }

    // Update rumors (propagate through network)
    if (this.config.enableRumors) {
      this.propagateRumors();
    }
  }

  // ====================================================================
  // ENTITY MANAGEMENT
  // ====================================================================

  /**
   * Register an entity with AI systems
   */
  public registerEntity(entity: EntityRegistration): void {
    if (!this.config.enableEntityAI || !entity.hasAI) {
      return;
    }

    // Create memory system
    const memory = new ExtendedNPCMemory(
      entity.id,
      entity.type,
      entity.personality
    );
    this.entityMemories.set(entity.id, memory);

    // Create goal system
    const goals = new NPCGoalSystem(memory);
    this.entityGoals.set(entity.id, goals);

    // Create adaptive AI
    const ai = new AdaptiveAI(memory, goals);
    this.entityAI.set(entity.id, ai);

    this.state.activeEntities++;

    console.log(`[ORCHESTRATOR] Registered entity ${entity.id} with full AI`);
  }

  /**
   * Unregister entity (destroyed, despawned, etc.)
   */
  public unregisterEntity(entityId: string): void {
    this.entityMemories.delete(entityId);
    this.entityGoals.delete(entityId);
    this.entityAI.delete(entityId);
    this.state.activeEntities--;
  }

  /**
   * Get entity's AI systems
   */
  public getEntityAI(entityId: string): {
    memory: ExtendedNPCMemory;
    goals: NPCGoalSystem;
    ai: AdaptiveAI;
  } | null {
    const memory = this.entityMemories.get(entityId);
    const goals = this.entityGoals.get(entityId);
    const ai = this.entityAI.get(entityId);

    if (!memory || !goals || !ai) return null;

    return { memory, goals, ai };
  }

  // ====================================================================
  // FACTION MANAGEMENT
  // ====================================================================

  /**
   * Register a faction
   */
  public registerFaction(faction: FactionRegistration): void {
    this.factionRegistry.set(faction.id, faction);

    // Initialize economic state
    if (faction.initialEconomicState) {
      // Economics system would initialize here
    }

    this.state.activeFactions++;

    console.log(`[ORCHESTRATOR] Registered faction ${faction.name}`);
  }

  /**
   * Get faction diplomatic status
   */
  public getFactionRelationship(factionA: string, factionB: string) {
    return this.diplomacy.getRelationship(factionA, factionB);
  }

  /**
   * Get faction economic state
   */
  public getFactionEconomics(factionId: string) {
    return this.economics.getEconomicState(factionId);
  }

  // ====================================================================
  // EVENT PROCESSING
  // ====================================================================

  /**
   * Record an event in the universe
   */
  public recordEvent(event: HistoricalEvent): void {
    // Record in history
    this.history.recordEvent(event);

    // Process consequences
    const consequences = this.consequences.processEvent(event);

    // Notify entities involved
    for (const participant of event.participants) {
      const memory = this.entityMemories.get(participant);
      if (memory) {
        // Entity will remember this
        memory.recordExperience({
          id: `exp_${event.id}`,
          timestamp: event.timestamp,
          type: this.mapEventToExperienceType(event),
          event,
          emotionalImpact: this.calculateEmotionalImpact(event),
          intensity: event.severity,
          location: event.location,
          witnesses: [],
          memoryStrength: 1.0,
          recallCount: 0
        });
      }
    }

    // Generate stories
    if (this.config.enableStorytelling && event.severity >= 5) {
      this.generateNewsForEvent(event);
    }

    console.log(`[ORCHESTRATOR] Processed event: ${event.description}`);
  }

  // ====================================================================
  // STORYTELLING INTEGRATION
  // ====================================================================

  /**
   * Generate news articles from event
   */
  private generateNewsForEvent(event: HistoricalEvent): void {
    // Generate from multiple perspectives
    const perspectives = event.participants.slice(0, 3);

    for (const participant of perspectives) {
      const faction = this.factionRegistry.get(participant);
      if (faction) {
        const article = this.newsEngine.generateNews(event, faction.name, 'NEUTRAL');

        // Create rumor from news
        if (this.config.enableRumors) {
          const rumor = this.rumors.createRumorFromNews(article, event.systemId || 'space');
          this.state.rumorsInCirculation++;
        }

        this.state.newsArticlesGenerated++;
      }
    }
  }

  /**
   * Generate legend from epic event
   */
  private generateLegendForEvent(event: HistoricalEvent): void {
    if (!this.config.enableChronicles) return;

    this.chronicles.createLegend(event, 'HERO_TALE', 0.3);
    console.log(`[ORCHESTRATOR] Legend created for: ${event.description}`);
  }

  /**
   * Generate chronicles from historical patterns
   */
  private generateChronicles(): void {
    if (!this.config.enableChronicles) return;

    const newChronicles = this.chronicles.generateChronicles({
      start: this.state.currentTime - 86400,  // Last day
      end: this.state.currentTime
    });

    this.state.chroniclesWritten += newChronicles.length;

    if (newChronicles.length > 0) {
      console.log(`[ORCHESTRATOR] Generated ${newChronicles.length} chronicles`);
    }
  }

  /**
   * Propagate rumors through network
   */
  private propagateRumors(): void {
    // Get all factions as communication nodes
    const nodes = Array.from(this.factionRegistry.keys());

    if (nodes.length < 2) return;

    // Each faction might spread rumors to neighbors
    for (let i = 0; i < Math.min(3, nodes.length - 1); i++) {
      const fromNode = nodes[Math.floor(Math.random() * nodes.length)];
      const toNode = nodes[Math.floor(Math.random() * nodes.length)];

      if (fromNode !== toNode) {
        // Spread a random rumor
        const allRumors = this.rumors.getAllRumors();
        if (allRumors.length > 0) {
          const rumor = allRumors[Math.floor(Math.random() * allRumors.length)];
          this.rumors.propagateRumor(rumor.id, fromNode, toNode);
        }
      }
    }
  }

  /**
   * Execute economic action (trade, raid, etc.)
   */
  private executeEconomicAction(factionId: string, action: any): void {
    // Create event for the action
    const event: HistoricalEvent = {
      id: `event_economic_${Date.now()}`,
      timestamp: this.state.currentTime,
      type: action.type,
      severity: action.priority,
      category: 'ECONOMIC',
      location: { x: 0, y: 0, z: 0 },
      participants: [factionId],
      description: action.description,
      data: { commodity: action.commodity },
      consequences: [],
      witnessed: false,
      priority: action.priority,
      tags: ['economic', 'automated']
    };

    this.recordEvent(event);
  }

  // ====================================================================
  // SAVE/LOAD & ABSENCE SIMULATION
  // ====================================================================

  /**
   * Called when player saves game
   */
  public onSaveGame(): void {
    this.lastSaveTime = this.state.currentTime;
    console.log(`[ORCHESTRATOR] Game saved at ${this.lastSaveTime}`);
  }

  /**
   * Called when player loads game after absence
   */
  public onLoadGame(currentTime: number): string {
    const elapsed = currentTime - this.lastSaveTime;

    if (elapsed < 600) {  // Less than 10 minutes
      return 'Welcome back!';
    }

    console.log(`[ORCHESTRATOR] Player was away for ${elapsed}s, simulating...`);

    // Simulate what happened while away
    const summary = this.absenceSimulator.simulate(
      this.lastSaveTime,
      currentTime
    );

    const report = this.absenceSimulator.generateTextSummary(summary);

    this.state.currentTime = currentTime;
    this.lastSaveTime = currentTime;

    return report;
  }

  // ====================================================================
  // QUERIES & REPORTS
  // ====================================================================

  /**
   * Get universe state
   */
  public getState(): UniverseState {
    return { ...this.state };
  }

  /**
   * Get recent news
   */
  public getRecentNews(count: number = 10) {
    return this.newsEngine.getAllNews().slice(-count);
  }

  /**
   * Get all chronicles
   */
  public getChronicles() {
    return this.chronicles.getAllChronicles();
  }

  /**
   * Get faction history
   */
  public getFactionHistory(factionId: string) {
    const faction = this.factionRegistry.get(factionId);
    if (!faction) return null;

    return this.chronicles.getFactionHistory(factionId) ||
           this.chronicles.generateFactionHistory(factionId, faction.name);
  }

  /**
   * Generate full universe report
   */
  public generateUniverseReport(): string {
    const lines: string[] = [];

    lines.push('═'.repeat(70));
    lines.push('UNIVERSE STATUS REPORT');
    lines.push('═'.repeat(70));
    lines.push('');

    lines.push(`Current Time: ${this.state.currentTime}`);
    lines.push(`Total Ticks: ${this.state.tickCount}`);
    lines.push('');

    lines.push('ACTIVE SYSTEMS:');
    lines.push(`  Entities with AI: ${this.state.activeEntities}`);
    lines.push(`  Factions: ${this.state.activeFactions}`);
    lines.push('');

    lines.push('HISTORICAL MEMORY:');
    const allEvents = this.history.getAllEvents();
    lines.push(`  Total events: ${allEvents.length}`);
    lines.push(`  Last 24h: ${this.history.queryEvents({
      startTime: this.state.currentTime - 86400,
      endTime: this.state.currentTime
    }).length}`);
    lines.push('');

    lines.push('STORYTELLING:');
    lines.push(`  News articles: ${this.state.newsArticlesGenerated}`);
    lines.push(`  Rumors in circulation: ${this.state.rumorsInCirculation}`);
    lines.push(`  Chronicles written: ${this.state.chroniclesWritten}`);
    lines.push(`  Legends: ${this.chronicles.getAllLegends().length}`);
    lines.push('');

    lines.push('FACTION DYNAMICS:');
    for (const [factionId, faction] of this.factionRegistry) {
      lines.push(`  ${faction.name}:`);
      const relationships = this.diplomacy.getAllRelationships()
        .filter(r => r.factionA === factionId || r.factionB === factionId);
      lines.push(`    Diplomatic relationships: ${relationships.length}`);
    }
    lines.push('');

    lines.push('═'.repeat(70));

    return lines.join('\n');
  }

  // ====================================================================
  // UTILITY
  // ====================================================================

  private mapEventToExperienceType(event: HistoricalEvent): any {
    // Map event types to experience types
    if (event.category === 'MILITARY') {
      return event.severity > 7 ? 'NEAR_DEATH' : 'COMBAT_VICTORY';
    } else if (event.category === 'ECONOMIC') {
      return 'SUCCESSFUL_TRADE';
    }
    return 'DISCOVERY';
  }

  private calculateEmotionalImpact(event: HistoricalEvent): number {
    // Positive for beneficial events, negative for harmful
    if (event.type === 'CRISIS' || event.category === 'MILITARY') {
      return -event.severity;
    }
    return event.severity / 2;
  }

  /**
   * Access to subsystems (for advanced users)
   */
  public getSubsystems() {
    return {
      simulation: this.simulationController,
      history: this.history,
      consequences: this.consequences,
      diplomacy: this.diplomacy,
      economics: this.economics,
      news: this.newsEngine,
      rumors: this.rumors,
      chronicles: this.chronicles,
      absenceSimulator: this.absenceSimulator
    };
  }
}
