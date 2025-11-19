/**
 * Ship Reputation System
 *
 * Tracks how ships view each other based on interactions:
 * - Positive reputation: Helped in combat, fair trades, rescued from distress
 * - Negative reputation: Attacked, unfair trades, ignored distress calls
 *
 * Affects future interactions - ships are more likely to:
 * - Trade with high-reputation ships
 * - Attack low-reputation ships
 * - Help ships they have positive history with
 * - Avoid ships they have negative history with
 */

export interface ReputationRecord {
  shipId: string;
  reputation: number; // -100 to +100
  lastInteraction: number; // timestamp
  interactions: ReputationInteraction[];
}

export interface ReputationInteraction {
  type: 'ATTACKED' | 'HELPED' | 'TRADED' | 'IGNORED_DISTRESS' | 'RESCUED' | 'BETRAYED' | 'SHARED_INTEL';
  timestamp: number;
  reputationChange: number;
  details?: string;
}

/**
 * Manages reputation between all ships in the universe
 */
export class ShipReputationSystem {
  // Map of "observerShipId -> Map of targetShipId -> ReputationRecord"
  private reputations: Map<string, Map<string, ReputationRecord>> = new Map();

  /**
   * Get reputation that shipA has for shipB
   */
  public getReputation(observerShipId: string, targetShipId: string): number {
    const observerReps = this.reputations.get(observerShipId);
    if (!observerReps) return 0; // Neutral if never met

    const record = observerReps.get(targetShipId);
    return record ? record.reputation : 0;
  }

  /**
   * Record an interaction that affects reputation
   */
  public recordInteraction(
    observerShipId: string,
    targetShipId: string,
    type: ReputationInteraction['type'],
    details?: string
  ): void {
    // Don't track reputation with self
    if (observerShipId === targetShipId) return;

    // Get or create observer's reputation map
    if (!this.reputations.has(observerShipId)) {
      this.reputations.set(observerShipId, new Map());
    }

    const observerReps = this.reputations.get(observerShipId)!;

    // Get or create reputation record
    if (!observerReps.has(targetShipId)) {
      observerReps.set(targetShipId, {
        shipId: targetShipId,
        reputation: 0,
        lastInteraction: Date.now() / 1000,
        interactions: []
      });
    }

    const record = observerReps.get(targetShipId)!;

    // Calculate reputation change based on interaction type
    const change = this.getReputationChange(type);

    // Update reputation
    record.reputation += change;
    record.reputation = Math.max(-100, Math.min(100, record.reputation)); // Clamp to -100 to +100
    record.lastInteraction = Date.now() / 1000;

    // Record interaction
    record.interactions.push({
      type,
      timestamp: Date.now() / 1000,
      reputationChange: change,
      details
    });

    // Keep only last 20 interactions
    if (record.interactions.length > 20) {
      record.interactions.shift();
    }
  }

  /**
   * Get reputation change for interaction type
   */
  private getReputationChange(type: ReputationInteraction['type']): number {
    switch (type) {
      case 'ATTACKED':
        return -30;
      case 'HELPED':
        return +25;
      case 'TRADED':
        return +5;
      case 'IGNORED_DISTRESS':
        return -20;
      case 'RESCUED':
        return +40;
      case 'BETRAYED':
        return -50;
      case 'SHARED_INTEL':
        return +10;
      default:
        return 0;
    }
  }

  /**
   * Get reputation level description
   */
  public getReputationLevel(reputation: number): string {
    if (reputation >= 80) return 'ALLIED';
    if (reputation >= 50) return 'FRIENDLY';
    if (reputation >= 20) return 'POSITIVE';
    if (reputation >= -20) return 'NEUTRAL';
    if (reputation >= -50) return 'UNFRIENDLY';
    if (reputation >= -80) return 'HOSTILE';
    return 'ENEMY';
  }

  /**
   * Get all reputation records for a ship
   */
  public getShipReputations(shipId: string): Map<string, ReputationRecord> {
    return this.reputations.get(shipId) || new Map();
  }

  /**
   * Check if two ships are likely to cooperate based on reputation
   */
  public willCooperate(shipA: string, shipB: string): boolean {
    const aViewsB = this.getReputation(shipA, shipB);
    const bViewsA = this.getReputation(shipB, shipA);

    // Both must have positive view
    return aViewsB >= 20 && bViewsA >= 20;
  }

  /**
   * Check if two ships are hostile to each other
   */
  public areHostile(shipA: string, shipB: string): boolean {
    const aViewsB = this.getReputation(shipA, shipB);
    const bViewsA = this.getReputation(shipB, shipA);

    // Either has hostile view
    return aViewsB <= -30 || bViewsA <= -30;
  }

  /**
   * Decay reputations over time (people forget)
   */
  public update(deltaTime: number): void {
    const now = Date.now() / 1000;
    const DECAY_RATE = 0.5; // 0.5 points per day
    const SECONDS_PER_DAY = 86400;

    for (const [observerId, repsMap] of this.reputations) {
      for (const [targetId, record] of repsMap) {
        const timeSinceLastInteraction = now - record.lastInteraction;
        const daysElapsed = timeSinceLastInteraction / SECONDS_PER_DAY;

        // Decay toward neutral (0)
        if (record.reputation > 0) {
          record.reputation = Math.max(0, record.reputation - (DECAY_RATE * daysElapsed));
        } else if (record.reputation < 0) {
          record.reputation = Math.min(0, record.reputation + (DECAY_RATE * daysElapsed));
        }
      }
    }
  }

  /**
   * Get statistics
   */
  public getStats(): any {
    let totalRecords = 0;
    let avgReputation = 0;
    let hostileCount = 0;
    let friendlyCount = 0;

    for (const repsMap of this.reputations.values()) {
      for (const record of repsMap.values()) {
        totalRecords++;
        avgReputation += record.reputation;

        if (record.reputation <= -30) hostileCount++;
        if (record.reputation >= 30) friendlyCount++;
      }
    }

    return {
      totalRecords,
      avgReputation: totalRecords > 0 ? avgReputation / totalRecords : 0,
      hostileRelationships: hostileCount,
      friendlyRelationships: friendlyCount
    };
  }
}
