/**
 * FactionAI - Strategic AI for faction-level decision making
 *
 * Controls:
 * - Territory expansion and defense
 * - Resource allocation
 * - Fleet deployment
 * - Diplomatic strategy
 * - Economic planning
 * - Military campaigns
 *
 * This is the "grand strategy" layer that NPCs follow.
 */

import { Vector3 } from '../CelestialBody';
import { StarSystem } from '../StarSystem';
import { FactionDiplomacyEngine, DiplomaticStatus } from '../faction-dynamics/FactionDiplomacyEngine';
import { FactionEconomicNeeds } from '../faction-dynamics/FactionEconomicNeeds';
import { UniverseContextProvider } from './UniverseContextProvider';
import { HistoricalMemorySystem, HistoricalEvent } from '../simulation/HistoricalMemorySystem';

export enum FactionStrategy {
  EXPANSIONIST = 'EXPANSIONIST',     // Aggressively expand territory
  ECONOMIC = 'ECONOMIC',             // Focus on trade and profit
  DEFENSIVE = 'DEFENSIVE',           // Protect what we have
  DIPLOMATIC = 'DIPLOMATIC',         // Build alliances
  MILITARISTIC = 'MILITARISTIC',     // Build military power
  SCIENTIFIC = 'SCIENTIFIC',         // Research and exploration
  OPPORTUNISTIC = 'OPPORTUNISTIC',   // Adapt to circumstances
  ISOLATIONIST = 'ISOLATIONIST'      // Minimal external interaction
}

export interface FactionGoal {
  id: string;
  type: 'TERRITORY' | 'ECONOMIC' | 'MILITARY' | 'DIPLOMATIC' | 'RESEARCH';
  description: string;
  priority: number; // 0-10
  progress: number; // 0-1
  deadline?: number;
  resources: {
    credits?: number;
    ships?: number;
    personnel?: number;
  };
}

export interface Territory {
  id: string;
  center: Vector3;
  radius: number;
  controlLevel: number; // 0-1 (how secure is control)
  population: number;
  economicValue: number; // credits per hour
  militaryPresence: number; // ships assigned
  strategicValue: number; // 0-1
  threats: string[]; // faction IDs that threaten this territory
}

export interface Fleet {
  id: string;
  name: string;
  ships: string[]; // ship IDs
  position: Vector3;
  mission: FleetMission;
  status: 'IDLE' | 'TRAVELING' | 'PATROLLING' | 'COMBAT' | 'RETREATING';
}

export interface FleetMission {
  type: 'PATROL' | 'ATTACK' | 'DEFEND' | 'ESCORT' | 'EXPLORE' | 'BLOCKADE';
  target?: Vector3;
  targetFaction?: string;
  priority: number; // 0-10
  expectedDuration: number; // seconds
}

export interface StrategicAction {
  type: 'EXPAND_TERRITORY' | 'DEPLOY_FLEET' | 'BUILD_STATION' | 'ESTABLISH_TRADE' |
        'DECLARE_WAR' | 'SEEK_PEACE' | 'FORM_ALLIANCE' | 'RESEARCH' | 'FORTIFY';
  description: string;
  priority: number; // 0-10
  cost: {
    credits?: number;
    ships?: number;
    time?: number; // seconds
  };
  expectedBenefit: number; // 0-10
  risk: number; // 0-1
}

/**
 * Strategic AI for a faction
 */
export class FactionAI {
  private factionId: string;
  private strategy: FactionStrategy;

  // Resources
  private territories: Map<string, Territory> = new Map();
  private fleets: Map<string, Fleet> = new Map();
  private goals: FactionGoal[] = [];

  // External systems
  private starSystem: StarSystem;
  private contextProvider: UniverseContextProvider;
  private diplomacy: FactionDiplomacyEngine;
  private economics: FactionEconomicNeeds;
  private history: HistoricalMemorySystem;

  // State
  private militaryStrength: number = 1.0;
  private economicPower: number = 1.0;
  private researchLevel: number = 0;
  private reputation: number = 0.5; // 0-1

  // Decision-making
  private threatAssessment: Map<string, number> = new Map(); // factionId -> threat level
  private opportunityScores: Map<string, number> = new Map(); // territoryId -> score

  constructor(
    factionId: string,
    strategy: FactionStrategy,
    starSystem: StarSystem,
    contextProvider: UniverseContextProvider,
    diplomacy: FactionDiplomacyEngine,
    economics: FactionEconomicNeeds,
    history: HistoricalMemorySystem
  ) {
    this.factionId = factionId;
    this.strategy = strategy;
    this.starSystem = starSystem;
    this.contextProvider = contextProvider;
    this.diplomacy = diplomacy;
    this.economics = economics;
    this.history = history;
  }

  /**
   * Main update loop - makes strategic decisions
   */
  public update(deltaTime: number): void {
    // Update territories
    this.updateTerritories(deltaTime);

    // Update fleets
    this.updateFleets(deltaTime);

    // Assess threats
    this.assessThreats();

    // Evaluate opportunities
    this.evaluateOpportunities();

    // Make strategic decisions (not every frame)
    if (Math.random() < 0.01) { // 1% chance per update
      this.makeStrategicDecision();
    }

    // Update goals
    this.updateGoals(deltaTime);
  }

  /**
   * Make a strategic decision
   */
  private makeStrategicDecision(): void {
    const actions = this.evaluateActions();

    if (actions.length === 0) return;

    // Sort by priority
    actions.sort((a, b) => b.priority - a.priority);

    const bestAction = actions[0];

    // Execute if priority is high enough
    if (bestAction.priority >= 7) {
      this.executeAction(bestAction);
    }
  }

  /**
   * Evaluate possible strategic actions
   */
  private evaluateActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Different strategies prioritize different actions
    switch (this.strategy) {
      case FactionStrategy.EXPANSIONIST:
        actions.push(...this.generateExpansionActions());
        actions.push(...this.generateMilitaryActions());
        break;

      case FactionStrategy.ECONOMIC:
        actions.push(...this.generateEconomicActions());
        actions.push(...this.generateTradeActions());
        break;

      case FactionStrategy.DEFENSIVE:
        actions.push(...this.generateDefensiveActions());
        actions.push(...this.generateFortificationActions());
        break;

      case FactionStrategy.DIPLOMATIC:
        actions.push(...this.generateDiplomaticActions());
        actions.push(...this.generateAllianceActions());
        break;

      case FactionStrategy.MILITARISTIC:
        actions.push(...this.generateMilitaryActions());
        actions.push(...this.generateWarActions());
        break;

      case FactionStrategy.SCIENTIFIC:
        actions.push(...this.generateResearchActions());
        actions.push(...this.generateExplorationActions());
        break;

      case FactionStrategy.OPPORTUNISTIC:
        // Evaluate all types and pick best
        actions.push(...this.generateExpansionActions());
        actions.push(...this.generateEconomicActions());
        actions.push(...this.generateMilitaryActions());
        break;
    }

    return actions;
  }

  // ====================================================================
  // ACTION GENERATORS
  // ====================================================================

  private generateExpansionActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Find unclaimed space near our territories
    for (const [id, territory] of this.territories) {
      if (territory.controlLevel > 0.7) {
        // This territory is secure, consider expanding from here
        const expandPos: Vector3 = {
          x: territory.center.x + territory.radius * 2,
          y: territory.center.y,
          z: territory.center.z
        };

        const context = this.contextProvider.getContext({ position: expandPos });

        if (context.threatLevel < 0.3) {
          actions.push({
            type: 'EXPAND_TERRITORY',
            description: `Expand from ${id} to new territory`,
            priority: 7 + (territory.economicValue / 100),
            cost: { credits: 10000, ships: 3, time: 3600 },
            expectedBenefit: 8,
            risk: context.threatLevel
          });
        }
      }
    }

    return actions;
  }

  private generateEconomicActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Build stations in profitable locations
    const profitableLocations = this.findProfitableStationLocations();

    for (const location of profitableLocations.slice(0, 3)) {
      actions.push({
        type: 'BUILD_STATION',
        description: `Build trading station at profitable location`,
        priority: 8,
        cost: { credits: 50000, time: 7200 },
        expectedBenefit: 9,
        risk: 0.2
      });
    }

    return actions;
  }

  private generateMilitaryActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Deploy fleets to threatened territories
    for (const [id, territory] of this.territories) {
      if (territory.threats.length > 0 && territory.militaryPresence < 3) {
        actions.push({
          type: 'DEPLOY_FLEET',
          description: `Deploy defensive fleet to ${id}`,
          priority: 9 - territory.militaryPresence,
          cost: { ships: 5, credits: 5000 },
          expectedBenefit: 7,
          risk: 0.3
        });
      }
    }

    return actions;
  }

  private generateDefensiveActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Fortify vulnerable territories
    for (const [id, territory] of this.territories) {
      if (territory.controlLevel < 0.6) {
        actions.push({
          type: 'FORTIFY',
          description: `Fortify territory ${id}`,
          priority: 8,
          cost: { credits: 20000, time: 3600 },
          expectedBenefit: 7,
          risk: 0.1
        });
      }
    }

    return actions;
  }

  private generateFortificationActions(): StrategicAction[] {
    return this.generateDefensiveActions();
  }

  private generateDiplomaticActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Seek peace with enemies if militarily weak
    if (this.militaryStrength < 0.5) {
      const relationships = this.diplomacy.getAllRelationships();

      for (const rel of relationships) {
        if (rel.status === DiplomaticStatus.WAR &&
            (rel.factionA === this.factionId || rel.factionB === this.factionId)) {

          const otherFaction = rel.factionA === this.factionId ? rel.factionB : rel.factionA;

          actions.push({
            type: 'SEEK_PEACE',
            description: `Negotiate peace with ${otherFaction}`,
            priority: 9,
            cost: { credits: 10000 },
            expectedBenefit: 8,
            risk: 0.4
          });
        }
      }
    }

    return actions;
  }

  private generateAllianceActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Form alliances with neutral factions
    const relationships = this.diplomacy.getAllRelationships();

    for (const rel of relationships) {
      if (rel.status === DiplomaticStatus.NEUTRAL &&
          (rel.factionA === this.factionId || rel.factionB === this.factionId)) {

        const otherFaction = rel.factionA === this.factionId ? rel.factionB : rel.factionA;

        actions.push({
          type: 'FORM_ALLIANCE',
          description: `Form alliance with ${otherFaction}`,
          priority: 6,
          cost: { credits: 5000 },
          expectedBenefit: 7,
          risk: 0.3
        });
      }
    }

    return actions;
  }

  private generateTradeActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Establish trade routes
    const friendlyFactions = this.diplomacy.getAllRelationships()
      .filter(r =>
        r.status === DiplomaticStatus.ALLIED ||
        r.status === DiplomaticStatus.FRIENDLY
      );

    for (const rel of friendlyFactions.slice(0, 3)) {
      const otherFaction = rel.factionA === this.factionId ? rel.factionB : rel.factionA;

      actions.push({
        type: 'ESTABLISH_TRADE',
        description: `Establish trade route with ${otherFaction}`,
        priority: 7,
        cost: { credits: 3000, ships: 2 },
        expectedBenefit: 8,
        risk: 0.1
      });
    }

    return actions;
  }

  private generateWarActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Only declare war if militarily strong
    if (this.militaryStrength > 0.7) {
      const threats = Array.from(this.threatAssessment.entries())
        .filter(([_, level]) => level > 0.5)
        .sort((a, b) => b[1] - a[1]);

      if (threats.length > 0) {
        const [targetFaction, _] = threats[0];

        actions.push({
          type: 'DECLARE_WAR',
          description: `Declare war on ${targetFaction}`,
          priority: 7,
          cost: { ships: 10, credits: 50000 },
          expectedBenefit: 9,
          risk: 0.8
        });
      }
    }

    return actions;
  }

  private generateResearchActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    actions.push({
      type: 'RESEARCH',
      description: 'Advance research capabilities',
      priority: 6 + this.researchLevel,
      cost: { credits: 15000, time: 7200 },
      expectedBenefit: 7,
      risk: 0.1
    });

    return actions;
  }

  private generateExplorationActions(): StrategicAction[] {
    const actions: StrategicAction[] = [];

    // Send exploration fleets to unknown regions
    const idleFleets = Array.from(this.fleets.values())
      .filter(f => f.status === 'IDLE');

    if (idleFleets.length > 0) {
      actions.push({
        type: 'DEPLOY_FLEET',
        description: 'Send fleet on exploration mission',
        priority: 5,
        cost: { ships: 2, credits: 2000 },
        expectedBenefit: 6,
        risk: 0.5
      });
    }

    return actions;
  }

  // ====================================================================
  // ACTION EXECUTION
  // ====================================================================

  private executeAction(action: StrategicAction): void {
    console.log(`[FACTION ${this.factionId}] Executing: ${action.description}`);

    // Create historical event
    const event: HistoricalEvent = {
      id: `faction_action_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: action.type,
      severity: action.priority,
      category: 'POLITICAL',
      location: { x: 0, y: 0, z: 0 },
      participants: [this.factionId],
      description: action.description,
      data: { action },
      consequences: [],
      witnessed: true,
      priority: action.priority,
      tags: ['faction', 'strategic', this.strategy]
    };

    this.history.recordEvent(event);

    // Execute specific action
    switch (action.type) {
      case 'EXPAND_TERRITORY':
        this.expandTerritory();
        break;
      case 'DEPLOY_FLEET':
        this.deployFleet();
        break;
      case 'BUILD_STATION':
        this.buildStation();
        break;
      case 'DECLARE_WAR':
        this.declareWar(action);
        break;
      case 'SEEK_PEACE':
        this.seekPeace(action);
        break;
      case 'FORM_ALLIANCE':
        this.formAlliance(action);
        break;
      case 'ESTABLISH_TRADE':
        this.establishTrade(action);
        break;
      case 'RESEARCH':
        this.conductResearch();
        break;
      case 'FORTIFY':
        this.fortifyTerritory(action);
        break;
    }
  }

  // ====================================================================
  // SPECIFIC ACTIONS
  // ====================================================================

  private expandTerritory(): void {
    const newTerritory: Territory = {
      id: `territory_${this.territories.size}`,
      center: { x: Math.random() * 1000000, y: 0, z: Math.random() * 1000000 },
      radius: 50000,
      controlLevel: 0.3,
      population: 1000,
      economicValue: 100,
      militaryPresence: 1,
      strategicValue: 0.5,
      threats: []
    };

    this.territories.set(newTerritory.id, newTerritory);
    this.contextProvider.registerTerritory(this.factionId, newTerritory.center, newTerritory.radius);
  }

  private deployFleet(): void {
    const fleet: Fleet = {
      id: `fleet_${this.fleets.size}`,
      name: `${this.factionId} Fleet ${this.fleets.size}`,
      ships: [],
      position: { x: 0, y: 0, z: 0 },
      mission: {
        type: 'PATROL',
        priority: 5,
        expectedDuration: 3600
      },
      status: 'IDLE'
    };

    this.fleets.set(fleet.id, fleet);
  }

  private buildStation(): void {
    // Would integrate with station building system
    this.economicPower += 0.1;
  }

  private declareWar(action: StrategicAction): void {
    if (action.targetFaction) {
      this.diplomacy.updateRelationship(this.factionId, action.targetFaction, -50);
    }
  }

  private seekPeace(action: StrategicAction): void {
    if (action.targetFaction) {
      this.diplomacy.updateRelationship(this.factionId, action.targetFaction, 30);
    }
  }

  private formAlliance(action: StrategicAction): void {
    if (action.targetFaction) {
      this.diplomacy.updateRelationship(this.factionId, action.targetFaction, 50);
    }
  }

  private establishTrade(action: StrategicAction): void {
    this.economicPower += 0.05;
  }

  private conductResearch(): void {
    this.researchLevel += 1;
  }

  private fortifyTerritory(action: StrategicAction): void {
    // Increase control level of weakest territory
    const weakest = Array.from(this.territories.values())
      .sort((a, b) => a.controlLevel - b.controlLevel)[0];

    if (weakest) {
      weakest.controlLevel = Math.min(1.0, weakest.controlLevel + 0.2);
      weakest.militaryPresence += 2;
    }
  }

  // ====================================================================
  // ASSESSMENT
  // ====================================================================

  private assessThreats(): void {
    this.threatAssessment.clear();

    const relationships = this.diplomacy.getAllRelationships();

    for (const rel of relationships) {
      if (rel.factionA === this.factionId) {
        const threat = this.calculateThreatLevel(rel.factionB, rel.status);
        this.threatAssessment.set(rel.factionB, threat);
      } else if (rel.factionB === this.factionId) {
        const threat = this.calculateThreatLevel(rel.factionA, rel.status);
        this.threatAssessment.set(rel.factionA, threat);
      }
    }
  }

  private calculateThreatLevel(factionId: string, status: DiplomaticStatus): number {
    let baseThreat = 0;

    switch (status) {
      case DiplomaticStatus.WAR:
        baseThreat = 1.0;
        break;
      case DiplomaticStatus.HOSTILE:
        baseThreat = 0.7;
        break;
      case DiplomaticStatus.UNFRIENDLY:
        baseThreat = 0.4;
        break;
      case DiplomaticStatus.NEUTRAL:
        baseThreat = 0.2;
        break;
      default:
        baseThreat = 0.0;
    }

    return baseThreat;
  }

  private evaluateOpportunities(): void {
    this.opportunityScores.clear();

    // Score potential expansion zones
    for (const [id, territory] of this.territories) {
      const score = this.scoreTerritoryOpportunity(territory);
      this.opportunityScores.set(id, score);
    }
  }

  private scoreTerritoryOpportunity(territory: Territory): number {
    let score = 0;

    score += territory.economicValue / 100;
    score += territory.strategicValue;
    score -= territory.threats.length * 0.2;
    score += territory.controlLevel * 0.3;

    return score;
  }

  private findProfitableStationLocations(): Vector3[] {
    const locations: Vector3[] = [];

    // Find locations near planets but away from hazards
    for (const planet of this.starSystem.planets) {
      const pos: Vector3 = {
        x: planet.position.x + planet.radius * 3,
        y: planet.position.y,
        z: planet.position.z
      };

      const context = this.contextProvider.getContext({ position: pos });

      if (context.threatLevel < 0.3 && context.hazardThreatLevel < 0.2) {
        locations.push(pos);
      }
    }

    return locations;
  }

  // ====================================================================
  // UPDATES
  // ====================================================================

  private updateTerritories(deltaTime: number): void {
    for (const territory of this.territories.values()) {
      // Generate income
      this.economicPower += (territory.economicValue * deltaTime) / 3600000;

      // Decay control if not defended
      if (territory.militaryPresence < 1) {
        territory.controlLevel = Math.max(0, territory.controlLevel - 0.0001 * deltaTime);
      }
    }
  }

  private updateFleets(deltaTime: number): void {
    for (const fleet of this.fleets.values()) {
      // Update fleet missions
      if (fleet.status === 'TRAVELING' && fleet.mission.target) {
        // Simplified - would move fleet toward target
      }
    }
  }

  private updateGoals(deltaTime: number): void {
    for (const goal of this.goals) {
      // Update progress (simplified)
      goal.progress = Math.min(1.0, goal.progress + 0.001 * deltaTime);
    }

    // Remove completed goals
    this.goals = this.goals.filter(g => g.progress < 1.0);
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public addTerritory(territory: Territory): void {
    this.territories.set(territory.id, territory);
    this.contextProvider.registerTerritory(this.factionId, territory.center, territory.radius);
  }

  public addGoal(goal: FactionGoal): void {
    this.goals.push(goal);
  }

  public getStatus() {
    return {
      factionId: this.factionId,
      strategy: this.strategy,
      territories: this.territories.size,
      fleets: this.fleets.size,
      militaryStrength: this.militaryStrength,
      economicPower: this.economicPower,
      researchLevel: this.researchLevel,
      reputation: this.reputation,
      activeGoals: this.goals.length
    };
  }

  public generateReport(): string {
    const lines: string[] = [];

    lines.push(`=== FACTION ${this.factionId} STATUS ===`);
    lines.push(`Strategy: ${this.strategy}`);
    lines.push('');
    lines.push(`Territories: ${this.territories.size}`);
    lines.push(`Fleets: ${this.fleets.size}`);
    lines.push(`Military Strength: ${(this.militaryStrength * 100).toFixed(0)}%`);
    lines.push(`Economic Power: ${this.economicPower.toFixed(2)}`);
    lines.push(`Research Level: ${this.researchLevel}`);
    lines.push('');

    if (this.threatAssessment.size > 0) {
      lines.push('THREATS:');
      for (const [faction, level] of this.threatAssessment) {
        lines.push(`  ${faction}: ${(level * 100).toFixed(0)}%`);
      }
      lines.push('');
    }

    if (this.goals.length > 0) {
      lines.push('ACTIVE GOALS:');
      for (const goal of this.goals.slice(0, 5)) {
        lines.push(`  - ${goal.description} (${(goal.progress * 100).toFixed(0)}%)`);
      }
    }

    return lines.join('\n');
  }
}
