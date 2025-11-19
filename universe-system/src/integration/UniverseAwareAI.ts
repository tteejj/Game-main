/**
 * UniverseAwareAI - Decision-making integrated with universe context
 *
 * Extends AdaptiveAI to make NPCs aware of:
 * - Environmental hazards
 * - Spatial opportunities
 * - Faction territories
 * - Navigation challenges
 *
 * This makes NPCs behave realistically in the space environment.
 */

import { AdaptiveAI, DecisionContext, Decision, LearningEvent, ExpertiseDomain } from '../entity-ai/AdaptiveAI';
import { ExtendedNPCMemory } from '../entity-ai/ExtendedNPCMemory';
import { NPCGoalSystem, NPCGoal } from '../entity-ai/NPCGoalSystem';
import { UniverseContextProvider, UniverseContext, HazardInfo, POIInfo } from './UniverseContextProvider';
import { Vector3 } from '../CelestialBody';
import { HazardType, HazardSeverity } from '../HazardSystem';

export interface UniverseDecisionContext extends DecisionContext {
  universeContext: UniverseContext;
  position: Vector3;
  velocity: Vector3;
  fuelLevel: number; // 0-1
  hullIntegrity: number; // 0-1
}

export interface UniverseDecision extends Decision {
  navigationAdvice?: NavigationAdvice;
  hazardAvoidance?: HazardAvoidance;
  opportunityAssessment?: OpportunityAssessment;
}

export interface NavigationAdvice {
  recommendedHeading: Vector3;
  recommendedSpeed: number;
  shouldReroute: boolean;
  rerouteReason?: string;
  safeWaypoints?: Vector3[];
}

export interface HazardAvoidance {
  hazardDetected: boolean;
  hazardType?: HazardType;
  severity?: HazardSeverity;
  avoidanceManeuver?: Vector3;
  urgency: number; // 0-1
  shouldFlee: boolean;
}

export interface OpportunityAssessment {
  opportunities: POIInfo[];
  bestOpportunity?: POIInfo;
  worthPursuing: boolean;
  estimatedReward: number;
  estimatedRisk: number;
}

/**
 * AI that makes decisions based on universe context
 */
export class UniverseAwareAI extends AdaptiveAI {
  private contextProvider: UniverseContextProvider;
  private factionId?: string;

  // Decision weights (learned over time)
  private weights = {
    safety: 0.7,        // Importance of avoiding hazards
    profit: 0.5,        // Importance of pursuing opportunities
    efficiency: 0.6,    // Importance of fuel/time efficiency
    exploration: 0.3,   // Willingness to explore
    territorial: 0.5    // Respect for faction territories
  };

  constructor(
    memory: ExtendedNPCMemory,
    goalSystem: NPCGoalSystem,
    contextProvider: UniverseContextProvider,
    factionId?: string
  ) {
    super(memory, goalSystem);
    this.contextProvider = contextProvider;
    this.factionId = factionId;

    // Adjust weights based on personality
    this.adjustWeightsFromPersonality();
  }

  /**
   * Make universe-aware decision
   */
  public makeUniverseDecision(context: UniverseDecisionContext): UniverseDecision {
    // Get base decision from parent
    const baseDecision = super.makeDecision(context);

    // Enhance with universe awareness
    const navigationAdvice = this.generateNavigationAdvice(context);
    const hazardAvoidance = this.assessHazards(context);
    const opportunityAssessment = this.assessOpportunities(context);

    // Modify decision based on universe context
    let finalAction = baseDecision.chosenAction;
    let confidence = baseDecision.confidence;
    let reasoning = baseDecision.reasoning;

    // PRIORITY 1: Critical hazard avoidance
    if (hazardAvoidance.shouldFlee) {
      finalAction = 'EMERGENCY_EVASIVE_MANEUVER';
      confidence = 1.0;
      reasoning = `CRITICAL: ${hazardAvoidance.hazardType} detected - immediate evasion required!`;
    }
    // PRIORITY 2: Moderate hazard avoidance
    else if (hazardAvoidance.hazardDetected && hazardAvoidance.urgency > 0.5) {
      finalAction = 'AVOID_HAZARD';
      confidence = 0.9;
      reasoning = `Hazard avoidance: ${hazardAvoidance.hazardType} at severity ${hazardAvoidance.severity}`;
    }
    // PRIORITY 3: Navigation safety
    else if (!navigationAdvice.safeWaypoints && context.universeContext.inHazardZone) {
      finalAction = 'FIND_SAFE_ROUTE';
      confidence = 0.8;
      reasoning = 'Current path unsafe - rerouting required';
    }
    // PRIORITY 4: Opportunities (if safe)
    else if (opportunityAssessment.worthPursuing &&
             context.universeContext.threatLevel < 0.3 &&
             context.hullIntegrity > 0.7) {
      finalAction = 'INVESTIGATE_OPPORTUNITY';
      confidence = 0.7;
      reasoning = `Opportunity detected: ${opportunityAssessment.bestOpportunity?.name}`;
    }
    // PRIORITY 5: Fuel conservation
    else if (context.fuelLevel < 0.2) {
      finalAction = 'SEEK_REFUEL';
      confidence = 0.9;
      reasoning = 'Low fuel - seeking nearest station';
    }
    // PRIORITY 6: Hull repairs
    else if (context.hullIntegrity < 0.4) {
      finalAction = 'SEEK_REPAIRS';
      confidence = 0.85;
      reasoning = 'Critical hull damage - seeking repair facility';
    }

    return {
      ...baseDecision,
      chosenAction: finalAction,
      confidence,
      reasoning,
      navigationAdvice,
      hazardAvoidance,
      opportunityAssessment
    };
  }

  /**
   * Record universe-specific outcome
   */
  public recordUniverseOutcome(
    context: UniverseDecisionContext,
    action: string,
    outcome: 'SUCCESS' | 'FAILURE' | 'MIXED',
    reward: number,
    damageReceived: number = 0,
    fuelConsumed: number = 0,
    profitEarned: number = 0
  ): void {
    // Record base outcome
    super.recordOutcome(
      this.describeUniverseSituation(context.universeContext),
      action,
      outcome,
      reward,
      context
    );

    // Learn from universe-specific outcomes
    if (damageReceived > 0.3) {
      // Learned to be more cautious about hazards
      this.weights.safety = Math.min(1.0, this.weights.safety + 0.05);
      this.weights.exploration = Math.max(0.0, this.weights.exploration - 0.02);
    }

    if (profitEarned > 100) {
      // Learned that opportunities can be worth it
      this.weights.profit = Math.min(1.0, this.weights.profit + 0.03);
    }

    if (fuelConsumed > 0.5 && outcome === 'FAILURE') {
      // Learned about fuel efficiency
      this.weights.efficiency = Math.min(1.0, this.weights.efficiency + 0.04);
    }
  }

  // ====================================================================
  // NAVIGATION
  // ====================================================================

  private generateNavigationAdvice(context: UniverseDecisionContext): NavigationAdvice {
    const uContext = context.universeContext;

    // Default: continue current heading
    let recommendedHeading = this.normalizeVector(context.velocity);
    let recommendedSpeed = uContext.recommendedSpeed;
    let shouldReroute = false;
    let rerouteReason: string | undefined;
    let safeWaypoints: Vector3[] | undefined;

    // Check if current path is safe
    if (!uContext.safeNavigationPath) {
      shouldReroute = true;
      rerouteReason = 'Unsafe navigation path detected';

      // Find safe position
      const safePos = this.contextProvider.findNearestSafePosition(
        context.position,
        this.factionId
      );

      if (safePos) {
        recommendedHeading = this.getDirectionTo(context.position, safePos);
        safeWaypoints = [safePos];
      }
    }

    // Hazard avoidance
    if (uContext.nearestHazard && uContext.nearestHazard.distance < uContext.nearestHazard.radius * 2) {
      const avoidVector = uContext.nearestHazard.avoidanceVector;
      if (avoidVector) {
        recommendedHeading = avoidVector;
        shouldReroute = true;
        rerouteReason = `Avoiding ${uContext.nearestHazard.type}`;
      }
    }

    // Speed adjustments
    if (uContext.visibility < 0.5) {
      recommendedSpeed *= 0.6; // Slow down in poor visibility
    }

    if (uContext.trafficDensity > 0.7) {
      recommendedSpeed *= 0.5; // Slow down in heavy traffic
    }

    return {
      recommendedHeading,
      recommendedSpeed,
      shouldReroute,
      rerouteReason,
      safeWaypoints
    };
  }

  // ====================================================================
  // HAZARD ASSESSMENT
  // ====================================================================

  private assessHazards(context: UniverseDecisionContext): HazardAvoidance {
    const uContext = context.universeContext;

    if (uContext.activeHazards.length === 0) {
      return {
        hazardDetected: false,
        urgency: 0,
        shouldFlee: false
      };
    }

    const nearestHazard = uContext.nearestHazard!;

    // Calculate urgency based on hazard severity and distance
    const distanceFactor = Math.max(0, 1 - (nearestHazard.distance / nearestHazard.radius));
    const severityFactor = nearestHazard.severity / 5;
    const urgency = distanceFactor * severityFactor;

    // Should flee if lethal hazard or very high urgency
    const shouldFlee = nearestHazard.isLethal ||
                       urgency > 0.8 ||
                       (urgency > 0.5 && context.hullIntegrity < 0.5);

    // Calculate avoidance maneuver
    const avoidanceManeuver = nearestHazard.canAvoid ?
      nearestHazard.avoidanceVector :
      this.contextProvider.getEscapeVector(context.position);

    return {
      hazardDetected: true,
      hazardType: nearestHazard.type,
      severity: nearestHazard.severity,
      avoidanceManeuver,
      urgency,
      shouldFlee
    };
  }

  // ====================================================================
  // OPPORTUNITY ASSESSMENT
  // ====================================================================

  private assessOpportunities(context: UniverseDecisionContext): OpportunityAssessment {
    const uContext = context.universeContext;

    if (uContext.nearbyPOIs.length === 0) {
      return {
        opportunities: [],
        worthPursuing: false,
        estimatedReward: 0,
        estimatedRisk: 0
      };
    }

    // Evaluate each opportunity
    const evaluatedPOIs = uContext.nearbyPOIs.map(poi => ({
      ...poi,
      score: this.scorePOI(poi, context)
    }));

    // Sort by score
    evaluatedPOIs.sort((a, b) => b.score - a.score);

    const bestOpportunity = evaluatedPOIs[0];
    const estimatedReward = bestOpportunity.value * 100;
    const estimatedRisk = bestOpportunity.risk;

    // Worth pursuing if reward > risk and aligns with goals
    const worthPursuing =
      estimatedReward > estimatedRisk * 50 &&
      context.hullIntegrity > 0.6 &&
      context.fuelLevel > 0.3 &&
      uContext.threatLevel < 0.4;

    return {
      opportunities: evaluatedPOIs,
      bestOpportunity,
      worthPursuing,
      estimatedReward,
      estimatedRisk
    };
  }

  private scorePOI(poi: POIInfo, context: UniverseDecisionContext): number {
    // Score based on value, risk, distance, and personality
    const personality = this.memory.getCurrentPersonality();

    const valueScore = poi.value * this.weights.profit;
    const riskPenalty = poi.risk * (1 - this.weights.safety);
    const distancePenalty = Math.min(1, poi.distance / 100000) * this.weights.efficiency;
    const explorationBonus = this.weights.exploration * 0.3;

    const score = valueScore - riskPenalty - distancePenalty + explorationBonus;

    // Personality adjustments
    const greedMultiplier = 1 + personality.greed * 0.5;
    const cautionPenalty = personality.caution * riskPenalty * 0.5;

    return (score * greedMultiplier) - cautionPenalty;
  }

  // ====================================================================
  // UTILITY
  // ====================================================================

  private describeUniverseSituation(context: UniverseContext): string {
    const parts: string[] = [];

    if (context.inHazardZone) {
      parts.push(`in_hazard:${context.nearestHazard?.type}`);
    }

    if (context.threatLevel > 0.5) {
      parts.push('high_threat');
    }

    if (context.nearestStation) {
      parts.push('near_station');
    }

    if (context.nearbyPOIs.length > 0) {
      parts.push(`poi:${context.nearestPOI?.type}`);
    }

    if (context.trafficDensity > 0.7) {
      parts.push('heavy_traffic');
    }

    return parts.join('_') || 'normal_space';
  }

  private adjustWeightsFromPersonality(): void {
    const personality = this.memory.getCurrentPersonality();

    this.weights.safety = 0.3 + (personality.caution * 0.6);
    this.weights.profit = 0.2 + (personality.greed * 0.7);
    this.weights.exploration = 0.1 + (personality.curiosity * 0.6);
    this.weights.efficiency = 0.4 + ((1 - personality.greed) * 0.4);
  }

  private normalizeVector(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private getDirectionTo(from: Vector3, to: Vector3): Vector3 {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    return { x: dx / len, y: dy / len, z: dz / len };
  }

  /**
   * Get decision weights (for debugging/tuning)
   */
  public getWeights() {
    return { ...this.weights };
  }

  /**
   * Manually adjust weights (for behavior tuning)
   */
  public setWeights(weights: Partial<typeof this.weights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Generate situation report
   */
  public generateSituationReport(context: UniverseDecisionContext): string {
    const lines: string[] = [];

    lines.push('=== SITUATION REPORT ===');
    lines.push('');
    lines.push(`Location: ${context.universeContext.currentSystem}`);
    lines.push(`Position: (${context.position.x.toFixed(0)}, ${context.position.y.toFixed(0)}, ${context.position.z.toFixed(0)})`);
    lines.push('');

    lines.push('ENVIRONMENTAL:');
    lines.push(`  Radiation: ${(context.universeContext.radiationLevel * 100).toFixed(0)}%`);
    lines.push(`  Visibility: ${(context.universeContext.visibility * 100).toFixed(0)}%`);
    lines.push(`  Traffic: ${(context.universeContext.trafficDensity * 100).toFixed(0)}%`);
    lines.push(`  Threat Level: ${(context.universeContext.threatLevel * 100).toFixed(0)}%`);
    lines.push('');

    if (context.universeContext.activeHazards.length > 0) {
      lines.push('HAZARDS:');
      for (const hazard of context.universeContext.activeHazards.slice(0, 3)) {
        lines.push(`  - ${hazard.type} (${HazardSeverity[hazard.severity]}) at ${(hazard.distance / 1000).toFixed(1)}km`);
      }
      lines.push('');
    }

    if (context.universeContext.nearbyPOIs.length > 0) {
      lines.push('OPPORTUNITIES:');
      for (const poi of context.universeContext.nearbyPOIs.slice(0, 3)) {
        lines.push(`  - ${poi.name} at ${(poi.distance / 1000).toFixed(1)}km`);
      }
      lines.push('');
    }

    lines.push('SHIP STATUS:');
    lines.push(`  Hull: ${(context.hullIntegrity * 100).toFixed(0)}%`);
    lines.push(`  Fuel: ${(context.fuelLevel * 100).toFixed(0)}%`);
    lines.push(`  Speed: ${Math.sqrt(context.velocity.x**2 + context.velocity.y**2 + context.velocity.z**2).toFixed(0)} m/s`);
    lines.push('');

    lines.push('DECISION WEIGHTS:');
    lines.push(`  Safety: ${(this.weights.safety * 100).toFixed(0)}%`);
    lines.push(`  Profit: ${(this.weights.profit * 100).toFixed(0)}%`);
    lines.push(`  Efficiency: ${(this.weights.efficiency * 100).toFixed(0)}%`);
    lines.push(`  Exploration: ${(this.weights.exploration * 100).toFixed(0)}%`);

    return lines.join('\n');
  }
}
