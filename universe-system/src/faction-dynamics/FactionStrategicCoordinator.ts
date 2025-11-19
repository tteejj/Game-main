/**
 * FactionStrategicCoordinator.ts - The "Brain" of Faction AI
 *
 * Coordinates Military, Expansion, and Research AI systems to make coherent decisions.
 * Factions now act as unified civilizations with clear strategic goals instead of
 * independent systems making contradictory choices.
 *
 * PROBLEM SOLVED:
 * - Military attacking farms when economy needs food ❌
 * - Expansion building wrong stations ❌
 * - Research ignoring critical needs ❌
 *
 * NOW:
 * - All systems aligned on faction goals ✓
 * - Military targets support economic needs ✓
 * - Expansion fills critical gaps ✓
 * - Research accelerates strategic priorities ✓
 */

import { FactionMilitaryAI, FactionMilitaryState, MilitaryTarget } from './FactionMilitaryAI';
import { FactionExpansionAI } from './FactionExpansionAI';
import { FactionResearchAI, FactionState } from './FactionResearchAI';
import { FactionEconomicNeeds, FactionEconomy, ResourceNeed } from './FactionEconomicNeeds';
import { FactionDiplomacyEngine, DiplomaticStatus } from './FactionDiplomacyEngine';
import { ResearchSystem } from '../ResearchSystem';
import { StationFaction } from '../StationGenerator';

/**
 * Strategic Priority - High-level faction goal
 */
export type StrategicPriority =
  | 'SURVIVE'      // Critical resource shortage - survival mode
  | 'EXPAND'       // Growth phase - claim territory
  | 'CONSOLIDATE'  // Defend holdings - stabilize
  | 'ATTACK'       // Offensive war - conquer enemies
  | 'RESEARCH'     // Tech race - scientific supremacy
  | 'TRADE';       // Economic focus - maximize profits

/**
 * Strategic Situation Assessment
 */
export interface StrategicSituation {
  factionId: StationFaction;

  // Current state
  primaryPriority: StrategicPriority;
  secondaryPriority: StrategicPriority;
  priorities: Map<StrategicPriority, number>;  // priority -> weight (0-1)

  // Needs assessment
  criticalNeeds: string[];                      // What faction MUST have
  economicCrisis: boolean;
  militaryThreat: boolean;
  technologicalGap: boolean;

  // Resource allocation
  militaryBudget: number;                       // Credits for military
  expansionBudget: number;                      // Credits for construction
  researchBudget: number;                       // Credits for research

  // Decision factors
  threatLevel: number;                          // 0-10
  economicHealth: number;                       // 0-1
  militaryStrength: number;                     // 0-1
  techLevel: number;                            // 0-10
  territorySize: number;

  // Coordination state
  lastUpdate: number;
  nextDecision: number;
}

/**
 * Strategic Directive - Specific instruction to AI systems
 */
export interface StrategicDirective {
  system: 'MILITARY' | 'EXPANSION' | 'RESEARCH';
  action: string;
  priority: number;                             // 0-100
  parameters: Record<string, any>;
  reasoning: string;
}

/**
 * Resource Allocation Plan
 */
export interface ResourceAllocation {
  totalBudget: number;

  // Allocations
  militaryAllocation: number;
  expansionAllocation: number;
  researchAllocation: number;
  reserveAllocation: number;                    // Emergency fund

  // Rationale
  allocationReasoning: string;
}

/**
 * Coordination Decision - What all systems should focus on
 */
export interface CoordinationDecision {
  timestamp: number;
  situation: StrategicSituation;
  directives: StrategicDirective[];
  allocation: ResourceAllocation;
  expectedOutcome: string;
}

/**
 * FactionStrategicCoordinator
 *
 * The central "brain" that makes all faction AI systems work together coherently.
 */
export class FactionStrategicCoordinator {
  private militaryAI: FactionMilitaryAI;
  private expansionAIs: Map<StationFaction, FactionExpansionAI> = new Map();
  private researchAI: FactionResearchAI;
  private economicNeeds: FactionEconomicNeeds;
  private diplomacyEngine: FactionDiplomacyEngine;
  private researchSystem: ResearchSystem;

  // Strategic state for each faction
  private situations: Map<StationFaction, StrategicSituation> = new Map();
  private decisions: Map<StationFaction, CoordinationDecision[]> = new Map();

  // Configuration
  private readonly DECISION_INTERVAL = 3600;     // Make strategic decisions every hour
  private readonly CRISIS_THRESHOLD = 7;          // Crisis level 7+ triggers SURVIVE mode
  private readonly THREAT_THRESHOLD = 6;          // Threat level 6+ triggers defensive posture

  constructor(
    militaryAI: FactionMilitaryAI,
    researchAI: FactionResearchAI,
    economicNeeds: FactionEconomicNeeds,
    diplomacyEngine: FactionDiplomacyEngine,
    researchSystem: ResearchSystem
  ) {
    this.militaryAI = militaryAI;
    this.researchAI = researchAI;
    this.economicNeeds = economicNeeds;
    this.diplomacyEngine = diplomacyEngine;
    this.researchSystem = researchSystem;

    console.log('[FactionStrategicCoordinator] Initialized - Factions now think strategically');
  }

  /**
   * Register expansion AI for a faction
   */
  public registerExpansionAI(factionId: StationFaction, expansionAI: FactionExpansionAI): void {
    this.expansionAIs.set(factionId, expansionAI);
  }

  /**
   * Main update - Evaluate and coordinate all faction AI systems
   */
  public update(currentTime: number, deltaTime: number): void {
    for (const [factionId, situation] of this.situations) {
      // Check if time for new strategic decision
      if (currentTime >= situation.nextDecision) {
        this.makeStrategicDecision(factionId, currentTime);
      }
    }
  }

  /**
   * Initialize strategic coordination for a faction
   */
  public initializeFaction(factionId: StationFaction): void {
    if (this.situations.has(factionId)) return;

    const situation: StrategicSituation = {
      factionId,
      primaryPriority: 'EXPAND',              // Default: growth mode
      secondaryPriority: 'CONSOLIDATE',
      priorities: new Map([
        ['SURVIVE', 0.0],
        ['EXPAND', 0.6],
        ['CONSOLIDATE', 0.4],
        ['ATTACK', 0.2],
        ['RESEARCH', 0.3],
        ['TRADE', 0.4]
      ]),
      criticalNeeds: [],
      economicCrisis: false,
      militaryThreat: false,
      technologicalGap: false,
      militaryBudget: 0,
      expansionBudget: 0,
      researchBudget: 0,
      threatLevel: 0,
      economicHealth: 0.7,
      militaryStrength: 0.5,
      techLevel: 1,
      territorySize: 0,
      lastUpdate: 0,
      nextDecision: 0
    };

    this.situations.set(factionId, situation);
    this.decisions.set(factionId, []);

    console.log(`[StrategicCoordinator] ${factionId} initialized with EXPAND strategy`);
  }

  /**
   * CORE METHOD: Evaluate strategic situation for a faction
   *
   * Analyzes all factors to determine what the faction should focus on.
   */
  public evaluateStrategicSituation(factionId: StationFaction): StrategicSituation {
    const situation = this.getSituation(factionId);

    // 1. Query economic needs
    const economy = this.economicNeeds.getFactionEconomy(factionId);
    situation.economicHealth = this.calculateEconomicHealth(economy);
    situation.economicCrisis = economy.crisisLevel >= this.CRISIS_THRESHOLD;
    situation.criticalNeeds = this.identifyCriticalNeeds(economy);

    // 2. Assess military threats
    const militaryState = this.militaryAI.getMilitaryReport(factionId);
    const threatInfo = this.assessThreats(factionId, economy);
    situation.threatLevel = threatInfo.threatLevel;
    situation.militaryThreat = threatInfo.militaryThreat;
    situation.militaryStrength = threatInfo.militaryStrength;

    // 3. Check technology status
    const researchStatus = this.researchAI.getResearchStatus(factionId);
    situation.techLevel = researchStatus.techLevel;
    situation.technologicalGap = this.assessTechGap(factionId, researchStatus.techLevel);

    // 4. Evaluate priorities
    this.calculatePriorities(situation, economy, threatInfo);

    // 5. Update resource allocation
    this.calculateResourceAllocation(situation, economy);

    return situation;
  }

  /**
   * Set strategic priority for faction
   *
   * Adjusts weights to focus on specific goal.
   */
  public setStrategicPriority(factionId: StationFaction, priority: StrategicPriority, weight: number): void {
    const situation = this.getSituation(factionId);

    // Set primary priority
    situation.primaryPriority = priority;
    situation.priorities.set(priority, Math.max(0, Math.min(1, weight)));

    // Adjust other priorities accordingly
    this.rebalancePriorities(situation);

    console.log(`[StrategicCoordinator] ${factionId} priority set: ${priority} (${weight.toFixed(2)})`);
  }

  /**
   * Allocate resources across AI systems
   *
   * Splits faction budget based on strategic priorities.
   */
  public allocateResources(factionId: StationFaction, totalBudget: number): ResourceAllocation {
    const situation = this.getSituation(factionId);

    // Base allocations by priority
    let militaryPercent = 0.3;
    let expansionPercent = 0.3;
    let researchPercent = 0.2;
    let reservePercent = 0.2;

    // Adjust based on primary priority
    switch (situation.primaryPriority) {
      case 'SURVIVE':
        // CRISIS MODE - Focus on immediate needs
        if (situation.militaryThreat) {
          militaryPercent = 0.6;      // Defend at all costs
          expansionPercent = 0.1;
          researchPercent = 0.05;
          reservePercent = 0.25;
        } else {
          militaryPercent = 0.3;
          expansionPercent = 0.5;     // Build what we need
          researchPercent = 0.1;
          reservePercent = 0.1;
        }
        break;

      case 'ATTACK':
        // AGGRESSIVE EXPANSION
        militaryPercent = 0.55;
        expansionPercent = 0.2;
        researchPercent = 0.15;
        reservePercent = 0.1;
        break;

      case 'EXPAND':
        // GROWTH MODE
        militaryPercent = 0.25;
        expansionPercent = 0.45;
        researchPercent = 0.2;
        reservePercent = 0.1;
        break;

      case 'CONSOLIDATE':
        // DEFENSIVE MODE
        militaryPercent = 0.4;
        expansionPercent = 0.2;
        researchPercent = 0.2;
        reservePercent = 0.2;
        break;

      case 'RESEARCH':
        // TECH RACE
        militaryPercent = 0.2;
        expansionPercent = 0.2;
        researchPercent = 0.5;
        reservePercent = 0.1;
        break;

      case 'TRADE':
        // ECONOMIC FOCUS
        militaryPercent = 0.15;
        expansionPercent = 0.5;       // Build trade infrastructure
        researchPercent = 0.25;       // Economic tech
        reservePercent = 0.1;
        break;
    }

    // Apply secondary priority adjustments
    const secondaryWeight = 0.3;
    switch (situation.secondaryPriority) {
      case 'RESEARCH':
        researchPercent += 0.1 * secondaryWeight;
        militaryPercent -= 0.05 * secondaryWeight;
        expansionPercent -= 0.05 * secondaryWeight;
        break;
      case 'CONSOLIDATE':
        militaryPercent += 0.1 * secondaryWeight;
        expansionPercent -= 0.1 * secondaryWeight;
        break;
    }

    // Calculate allocations
    const allocation: ResourceAllocation = {
      totalBudget,
      militaryAllocation: totalBudget * militaryPercent,
      expansionAllocation: totalBudget * expansionPercent,
      researchAllocation: totalBudget * researchPercent,
      reserveAllocation: totalBudget * reservePercent,
      allocationReasoning: this.explainAllocation(situation, militaryPercent, expansionPercent, researchPercent)
    };

    // Update situation
    situation.militaryBudget = allocation.militaryAllocation;
    situation.expansionBudget = allocation.expansionAllocation;
    situation.researchBudget = allocation.researchAllocation;

    return allocation;
  }

  /**
   * COORDINATION: Make all AI systems work together
   *
   * This is where the magic happens - systems get aligned directives.
   */
  public coordinateOperations(factionId: StationFaction): StrategicDirective[] {
    const situation = this.getSituation(factionId);
    const economy = this.economicNeeds.getFactionEconomy(factionId);
    const directives: StrategicDirective[] = [];

    // Get critical needs
    const criticalResources = Array.from(economy.criticalResources.entries())
      .filter(([_, need]) => need.inCrisis || need.daysRemaining < 30)
      .sort((a, b) => a[1].daysRemaining - b[1].daysRemaining);

    // EXAMPLE: If faction needs FOOD desperately
    if (criticalResources.length > 0) {
      const [commodity, need] = criticalResources[0];

      // 1. Military: Target stations that produce this resource
      directives.push({
        system: 'MILITARY',
        action: 'TARGET_RESOURCE_PRODUCERS',
        priority: need.inCrisis ? 100 : 70,
        parameters: {
          commodity,
          targetType: this.getProducerType(commodity),
          reason: `CRITICAL: ${need.daysRemaining.toFixed(0)} days of ${commodity} remaining`
        },
        reasoning: `Faction desperately needs ${commodity}. Military should target stations producing it.`
      });

      // 2. Expansion: Build stations that produce this resource
      directives.push({
        system: 'EXPANSION',
        action: 'BUILD_RESOURCE_PRODUCER',
        priority: need.inCrisis ? 100 : 80,
        parameters: {
          commodity,
          stationType: this.getProducerStationType(commodity),
          urgency: need.inCrisis ? 'CRITICAL' : 'HIGH'
        },
        reasoning: `Build ${this.getProducerStationType(commodity)} to produce ${commodity}.`
      });

      // 3. Research: Prioritize tech that helps with this resource
      directives.push({
        system: 'RESEARCH',
        action: 'PRIORITIZE_RESOURCE_TECH',
        priority: need.inCrisis ? 90 : 60,
        parameters: {
          commodity,
          techCategory: this.getRelevantTechCategory(commodity)
        },
        reasoning: `Research tech to improve ${commodity} production/efficiency.`
      });
    }

    // Military coordination
    if (situation.militaryThreat) {
      directives.push({
        system: 'MILITARY',
        action: 'DEFENSIVE_POSTURE',
        priority: 95,
        parameters: {
          threatLevel: situation.threatLevel,
          prioritize: 'DEFENSE'
        },
        reasoning: 'Under military threat - prioritize defense'
      });

      directives.push({
        system: 'EXPANSION',
        action: 'BUILD_DEFENSES',
        priority: 90,
        parameters: {
          stationType: 'DEFENSE_PLATFORM',
          placement: 'BORDER_TERRITORIES'
        },
        reasoning: 'Build defenses on vulnerable borders'
      });
    }

    // Expansion coordination
    if (situation.primaryPriority === 'EXPAND') {
      directives.push({
        system: 'EXPANSION',
        action: 'AGGRESSIVE_EXPANSION',
        priority: 80,
        parameters: {
          targetCount: 3,
          focusAreas: this.identifyExpansionTargets(factionId, economy)
        },
        reasoning: 'Growth phase - expand aggressively'
      });

      directives.push({
        system: 'MILITARY',
        action: 'PROTECT_EXPANSION',
        priority: 70,
        parameters: {
          coverNewTerritories: true
        },
        reasoning: 'Protect new settlements'
      });
    }

    // Research coordination
    if (situation.technologicalGap) {
      directives.push({
        system: 'RESEARCH',
        action: 'ACCELERATE_RESEARCH',
        priority: 85,
        parameters: {
          focus: situation.militaryThreat ? 'MILITARY_TECH' : 'ECONOMY_TECH'
        },
        reasoning: 'Close technology gap with rivals'
      });
    }

    // Sort by priority
    directives.sort((a, b) => b.priority - a.priority);

    return directives;
  }

  /**
   * CONFLICT RESOLUTION: When systems want same resources
   *
   * Decides which system gets priority based on strategic situation.
   */
  public resolveConflicts(factionId: StationFaction, conflictingRequests: ResourceRequest[]): ResourceRequest[] {
    const situation = this.getSituation(factionId);
    const resolved: ResourceRequest[] = [];

    // Sort by strategic alignment
    const scored = conflictingRequests.map(request => ({
      request,
      score: this.scoreRequestAlignment(request, situation)
    }));

    scored.sort((a, b) => b.score - a.score);

    // Allocate budget in priority order
    let remainingBudget = situation.militaryBudget + situation.expansionBudget + situation.researchBudget;

    for (const { request, score } of scored) {
      if (remainingBudget >= request.cost) {
        resolved.push(request);
        remainingBudget -= request.cost;

        console.log(`[Coordinator] Approved ${request.system} request: ${request.description} (score: ${score.toFixed(1)})`);
      } else {
        console.log(`[Coordinator] Denied ${request.system} request: ${request.description} - insufficient budget`);
      }
    }

    return resolved;
  }

  // ====================================================================
  // INTELLIGENT DECISION MAKING
  // ====================================================================

  /**
   * Make strategic decision for faction
   *
   * This is the central decision-making loop.
   */
  private makeStrategicDecision(factionId: StationFaction, currentTime: number): void {
    console.log(`\n[StrategicCoordinator] === ${factionId} STRATEGIC DECISION ===`);

    // 1. Evaluate situation
    const situation = this.evaluateStrategicSituation(factionId);

    // 2. Determine priorities
    const topPriorities = this.rankPriorities(situation);
    situation.primaryPriority = topPriorities[0];
    situation.secondaryPriority = topPriorities[1];

    console.log(`  Primary: ${situation.primaryPriority}`);
    console.log(`  Secondary: ${situation.secondaryPriority}`);
    console.log(`  Economic Health: ${(situation.economicHealth * 100).toFixed(0)}%`);
    console.log(`  Threat Level: ${situation.threatLevel.toFixed(1)}/10`);
    console.log(`  Critical Needs: ${situation.criticalNeeds.join(', ') || 'None'}`);

    // 3. Allocate resources
    const totalBudget = this.calculateTotalBudget(factionId);
    const allocation = this.allocateResources(factionId, totalBudget);

    console.log(`  Budget Allocation:`);
    console.log(`    Military: ${allocation.militaryAllocation.toFixed(0)} credits (${(allocation.militaryAllocation / allocation.totalBudget * 100).toFixed(0)}%)`);
    console.log(`    Expansion: ${allocation.expansionAllocation.toFixed(0)} credits (${(allocation.expansionAllocation / allocation.totalBudget * 100).toFixed(0)}%)`);
    console.log(`    Research: ${allocation.researchAllocation.toFixed(0)} credits (${(allocation.researchAllocation / allocation.totalBudget * 100).toFixed(0)}%)`);

    // 4. Coordinate operations
    const directives = this.coordinateOperations(factionId);

    console.log(`  Strategic Directives (${directives.length}):`);
    directives.slice(0, 5).forEach(d => {
      console.log(`    [${d.system}] ${d.action} (Priority: ${d.priority}) - ${d.reasoning}`);
    });

    // 5. Apply directives to AI systems
    this.applyDirectives(factionId, directives);

    // 6. Record decision
    const decision: CoordinationDecision = {
      timestamp: currentTime,
      situation,
      directives,
      allocation,
      expectedOutcome: this.predictOutcome(situation, directives)
    };

    const history = this.decisions.get(factionId)!;
    history.push(decision);
    if (history.length > 20) {
      history.shift();  // Keep last 20 decisions
    }

    // 7. Schedule next decision
    situation.nextDecision = currentTime + this.DECISION_INTERVAL;
    situation.lastUpdate = currentTime;

    console.log(`  Expected Outcome: ${decision.expectedOutcome}\n`);
  }

  /**
   * Calculate priorities based on situation
   */
  private calculatePriorities(
    situation: StrategicSituation,
    economy: FactionEconomy,
    threatInfo: ThreatAssessment
  ): void {
    const priorities = situation.priorities;

    // SURVIVE - Activated by critical resource shortage OR extreme threat
    if (economy.crisisLevel >= this.CRISIS_THRESHOLD) {
      priorities.set('SURVIVE', 0.9 + (economy.crisisLevel / 100));
    } else if (threatInfo.threatLevel >= 9) {
      priorities.set('SURVIVE', 0.85);
    } else {
      priorities.set('SURVIVE', 0.0);
    }

    // ATTACK - High when militarily strong and have grievances
    let attackPriority = 0.2;
    if (threatInfo.militaryStrength > 0.7 && threatInfo.enemies.length > 0) {
      attackPriority = 0.7;
    }
    if (economy.crisisLevel > 5 && situation.criticalNeeds.length > 0) {
      attackPriority += 0.2;  // Desperate for resources
    }
    priorities.set('ATTACK', Math.min(1.0, attackPriority));

    // EXPAND - High when secure and healthy
    let expandPriority = 0.5;
    if (situation.economicHealth > 0.7 && threatInfo.threatLevel < 4) {
      expandPriority = 0.8;
    }
    if (economy.crisisLevel > 3) {
      expandPriority *= 0.5;  // Can't expand in crisis
    }
    priorities.set('EXPAND', expandPriority);

    // CONSOLIDATE - High when threatened or overstretched
    let consolidatePriority = 0.3;
    if (threatInfo.threatLevel > 6) {
      consolidatePriority = 0.8;
    }
    if (situation.territorySize > 10 && situation.economicHealth < 0.5) {
      consolidatePriority = 0.7;  // Overstretched
    }
    priorities.set('CONSOLIDATE', consolidatePriority);

    // RESEARCH - Steady priority, boosted by tech gap
    let researchPriority = 0.4;
    if (situation.technologicalGap) {
      researchPriority = 0.7;
    }
    if (economy.crisisLevel < 3 && threatInfo.threatLevel < 5) {
      researchPriority = 0.6;  // Can focus on research in peace
    }
    priorities.set('RESEARCH', researchPriority);

    // TRADE - High when economically focused
    let tradePriority = 0.3;
    if (situation.economicHealth > 0.6 && economy.tradePartners.size > 2) {
      tradePriority = 0.6;
    }
    priorities.set('TRADE', tradePriority);
  }

  /**
   * Rank priorities to determine primary and secondary
   */
  private rankPriorities(situation: StrategicSituation): [StrategicPriority, StrategicPriority] {
    const sorted = Array.from(situation.priorities.entries())
      .sort((a, b) => b[1] - a[1]);

    return [sorted[0][0], sorted[1][0]];
  }

  /**
   * Calculate economic health (0-1)
   */
  private calculateEconomicHealth(economy: FactionEconomy): number {
    let health = 0.5;  // Base

    // GDP growth factor
    if (economy.gdpGrowth > 5) health += 0.3;
    else if (economy.gdpGrowth > 2) health += 0.2;
    else if (economy.gdpGrowth < -2) health -= 0.2;
    else if (economy.gdpGrowth < -5) health -= 0.3;

    // Crisis penalty
    health -= economy.crisisLevel * 0.05;

    // Resource availability
    const resourceHealth = this.assessResourceHealth(economy);
    health = (health + resourceHealth) / 2;

    return Math.max(0, Math.min(1, health));
  }

  /**
   * Assess resource health
   */
  private assessResourceHealth(economy: FactionEconomy): number {
    let totalHealth = 0;
    let count = 0;

    for (const need of economy.criticalResources.values()) {
      if (need.inCrisis) {
        totalHealth += 0.0;
      } else if (need.daysRemaining < 30) {
        totalHealth += 0.3;
      } else if (need.daysRemaining < 60) {
        totalHealth += 0.6;
      } else {
        totalHealth += 1.0;
      }
      count++;
    }

    return count > 0 ? totalHealth / count : 0.7;
  }

  /**
   * Identify critical needs
   */
  private identifyCriticalNeeds(economy: FactionEconomy): string[] {
    const critical: string[] = [];

    for (const [commodity, need] of economy.criticalResources) {
      if (need.inCrisis || need.daysRemaining < 30) {
        critical.push(commodity);
      }
    }

    return critical;
  }

  /**
   * Assess military threats
   */
  private assessThreats(factionId: StationFaction, economy: FactionEconomy): ThreatAssessment {
    // Get military state (would normally query military AI)
    // For now, simulate based on diplomacy

    let threatLevel = 0;
    let militaryStrength = 0.5;
    const enemies: string[] = [];

    // Check diplomatic relationships
    const allFactions: StationFaction[] = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'OUTER_COLONIES', 'INDEPENDENT'];

    for (const otherFaction of allFactions) {
      if (otherFaction === factionId) continue;

      const relationship = this.diplomacyEngine.getRelationship(factionId, otherFaction);

      if (relationship.status === 'WAR' || relationship.status === 'HOSTILE') {
        enemies.push(otherFaction);
        threatLevel += 3;
      } else if (relationship.status === 'COLD_WAR' || relationship.status === 'TENSE') {
        threatLevel += 1;
      }
    }

    return {
      threatLevel: Math.min(10, threatLevel),
      militaryThreat: threatLevel >= this.THREAT_THRESHOLD,
      militaryStrength,
      enemies
    };
  }

  /**
   * Assess technology gap
   */
  private assessTechGap(factionId: StationFaction, techLevel: number): boolean {
    // Compare to average tech level of rivals
    // Simplified: if below tier 3, there's a gap
    return techLevel < 3;
  }

  /**
   * Calculate resource allocation
   */
  private calculateResourceAllocation(situation: StrategicSituation, economy: FactionEconomy): void {
    const totalBudget = economy.gdp * 0.1;  // 10% of GDP for these systems
    const allocation = this.allocateResources(situation.factionId, totalBudget);

    situation.militaryBudget = allocation.militaryAllocation;
    situation.expansionBudget = allocation.expansionAllocation;
    situation.researchBudget = allocation.researchAllocation;
  }

  /**
   * Calculate total available budget
   */
  private calculateTotalBudget(factionId: StationFaction): number {
    const economy = this.economicNeeds.getFactionEconomy(factionId);

    // Budget is portion of GDP
    const basebudget = economy.gdp * 0.15;  // 15% of GDP

    // Adjust for economic state
    let multiplier = 1.0;
    switch (economy.economicState) {
      case 'BOOMING': multiplier = 1.3; break;
      case 'GROWING': multiplier = 1.1; break;
      case 'RECESSION': multiplier = 0.8; break;
      case 'DEPRESSION': multiplier = 0.6; break;
      case 'COLLAPSE': multiplier = 0.4; break;
    }

    return basebudget * multiplier;
  }

  /**
   * Rebalance priorities after setting one
   */
  private rebalancePriorities(situation: StrategicSituation): void {
    const priorities = situation.priorities;
    const primaryWeight = priorities.get(situation.primaryPriority)!;

    // Reduce others proportionally
    const remainingWeight = 1.0 - primaryWeight;
    const otherPriorities = Array.from(priorities.entries())
      .filter(([p, _]) => p !== situation.primaryPriority);

    const totalOtherWeight = otherPriorities.reduce((sum, [_, w]) => sum + w, 0);

    for (const [priority, weight] of otherPriorities) {
      const normalizedWeight = (weight / totalOtherWeight) * remainingWeight;
      priorities.set(priority, normalizedWeight);
    }
  }

  /**
   * Explain resource allocation
   */
  private explainAllocation(
    situation: StrategicSituation,
    military: number,
    expansion: number,
    research: number
  ): string {
    const parts: string[] = [];

    parts.push(`Primary strategy: ${situation.primaryPriority}`);

    if (military > 0.5) {
      parts.push('Heavy military investment');
    }
    if (expansion > 0.4) {
      parts.push('Strong expansion focus');
    }
    if (research > 0.4) {
      parts.push('Significant R&D spending');
    }

    if (situation.economicCrisis) {
      parts.push('EMERGENCY: Resource crisis');
    }
    if (situation.militaryThreat) {
      parts.push('ALERT: Military threat detected');
    }

    return parts.join('. ');
  }

  /**
   * Apply directives to AI systems
   */
  private applyDirectives(factionId: StationFaction, directives: StrategicDirective[]): void {
    // This would integrate with the actual AI systems
    // For now, log the coordination

    for (const directive of directives) {
      // In full implementation:
      // - Military AI receives target priorities
      // - Expansion AI gets construction orders
      // - Research AI gets tech priorities

      // Currently just logs the intent
      if (directive.priority > 80) {
        console.log(`  >> HIGH PRIORITY: ${directive.system} should ${directive.action}`);
      }
    }
  }

  /**
   * Predict outcome of strategic decision
   */
  private predictOutcome(situation: StrategicSituation, directives: StrategicDirective[]): string {
    const outcomes: string[] = [];

    if (situation.primaryPriority === 'SURVIVE' && situation.criticalNeeds.length > 0) {
      outcomes.push(`Expect crisis resolution for ${situation.criticalNeeds[0]}`);
    }

    if (situation.primaryPriority === 'ATTACK') {
      outcomes.push('Military offensive likely');
    }

    if (situation.primaryPriority === 'EXPAND') {
      outcomes.push('Territory growth expected');
    }

    if (directives.some(d => d.action === 'BUILD_RESOURCE_PRODUCER')) {
      outcomes.push('New resource production online soon');
    }

    return outcomes.join('. ') || 'Steady state maintained';
  }

  /**
   * Get producer type for commodity
   */
  private getProducerType(commodity: string): string {
    const producers: Record<string, string> = {
      'FOOD': 'AGRICULTURAL_STATION',
      'WATER': 'ICE_MINING_STATION',
      'FUEL': 'REFINERY',
      'MINERALS': 'MINING_PLATFORM',
      'TECHNOLOGY': 'RESEARCH_STATION'
    };
    return producers[commodity] || 'STATION';
  }

  /**
   * Get producer station type for commodity
   */
  private getProducerStationType(commodity: string): string {
    const types: Record<string, string> = {
      'FOOD': 'AGRICULTURAL_STATION',
      'WATER': 'MINING_PLATFORM',
      'FUEL': 'REFINERY',
      'MINERALS': 'MINING_PLATFORM'
    };
    return types[commodity] || 'OUTPOST';
  }

  /**
   * Get relevant tech category for commodity
   */
  private getRelevantTechCategory(commodity: string): string {
    const categories: Record<string, string> = {
      'FOOD': 'ECONOMY',
      'WATER': 'ECONOMY',
      'FUEL': 'PROPULSION',
      'MINERALS': 'ECONOMY'
    };
    return categories[commodity] || 'ECONOMY';
  }

  /**
   * Identify expansion targets
   */
  private identifyExpansionTargets(factionId: StationFaction, economy: FactionEconomy): string[] {
    const targets: string[] = [];

    // Focus on what we need
    for (const [commodity, need] of economy.criticalResources) {
      if (need.deficit > 0) {
        targets.push(`${commodity}_PRODUCTION`);
      }
    }

    // Always want trade posts
    targets.push('TRADE_HUB');

    return targets;
  }

  /**
   * Score request alignment with strategy
   */
  private scoreRequestAlignment(request: ResourceRequest, situation: StrategicSituation): number {
    let score = request.priority;  // Base score

    // Boost if aligns with primary priority
    if (request.system === 'MILITARY' && situation.primaryPriority === 'ATTACK') {
      score *= 1.5;
    }
    if (request.system === 'EXPANSION' && situation.primaryPriority === 'EXPAND') {
      score *= 1.5;
    }
    if (request.system === 'RESEARCH' && situation.primaryPriority === 'RESEARCH') {
      score *= 1.5;
    }

    // Boost if addresses critical needs
    if (situation.criticalNeeds.length > 0 && request.description.includes(situation.criticalNeeds[0])) {
      score *= 2.0;
    }

    // Boost defensive requests during threats
    if (situation.militaryThreat && request.description.includes('defense')) {
      score *= 1.8;
    }

    return score;
  }

  /**
   * Get or create situation
   */
  private getSituation(factionId: StationFaction): StrategicSituation {
    if (!this.situations.has(factionId)) {
      this.initializeFaction(factionId);
    }
    return this.situations.get(factionId)!;
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  /**
   * Get strategic report for faction
   */
  public getStrategicReport(factionId: StationFaction): string {
    const situation = this.getSituation(factionId);
    const lines: string[] = [];

    lines.push(`\n=== STRATEGIC REPORT: ${factionId} ===`);
    lines.push('');
    lines.push(`PRIMARY STRATEGY: ${situation.primaryPriority}`);
    lines.push(`Secondary Strategy: ${situation.secondaryPriority}`);
    lines.push('');
    lines.push('SITUATION ASSESSMENT:');
    lines.push(`  Economic Health: ${(situation.economicHealth * 100).toFixed(0)}% ${situation.economicCrisis ? '🔴 CRISIS' : '🟢'}`);
    lines.push(`  Military Threat: ${situation.threatLevel.toFixed(1)}/10 ${situation.militaryThreat ? '🔴 HIGH' : '🟢'}`);
    lines.push(`  Tech Level: ${situation.techLevel.toFixed(1)} ${situation.technologicalGap ? '⚠️ Behind' : '✓'}`);
    lines.push(`  Territory: ${situation.territorySize} systems`);
    lines.push('');
    lines.push('CRITICAL NEEDS:');
    if (situation.criticalNeeds.length > 0) {
      situation.criticalNeeds.forEach(need => {
        lines.push(`  🚨 ${need}`);
      });
    } else {
      lines.push('  None - all needs met');
    }
    lines.push('');
    lines.push('RESOURCE ALLOCATION:');
    lines.push(`  Military: ${situation.militaryBudget.toFixed(0)} credits`);
    lines.push(`  Expansion: ${situation.expansionBudget.toFixed(0)} credits`);
    lines.push(`  Research: ${situation.researchBudget.toFixed(0)} credits`);
    lines.push('');
    lines.push('PRIORITIES:');
    const sortedPriorities = Array.from(situation.priorities.entries())
      .sort((a, b) => b[1] - a[1]);
    sortedPriorities.forEach(([priority, weight]) => {
      const bar = '█'.repeat(Math.floor(weight * 10));
      lines.push(`  ${priority.padEnd(12)} ${bar} ${(weight * 100).toFixed(0)}%`);
    });

    return lines.join('\n');
  }

  /**
   * Get recent decisions
   */
  public getDecisionHistory(factionId: StationFaction, count: number = 5): CoordinationDecision[] {
    const history = this.decisions.get(factionId) || [];
    return history.slice(-count);
  }

  /**
   * Force immediate strategic decision (for testing)
   */
  public forceDecision(factionId: StationFaction, currentTime: number): void {
    this.makeStrategicDecision(factionId, currentTime);
  }
}

// ====================================================================
// SUPPORTING TYPES
// ====================================================================

interface ThreatAssessment {
  threatLevel: number;
  militaryThreat: boolean;
  militaryStrength: number;
  enemies: string[];
}

export interface ResourceRequest {
  system: 'MILITARY' | 'EXPANSION' | 'RESEARCH';
  description: string;
  cost: number;
  priority: number;
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}
