/**
 * FactionReputationSystem - Player reputation with all factions
 * Affects prices, mission availability, access to stations, faction attitude
 */

import { UniverseOrchestrator } from './UniverseOrchestrator';

export type ReputationLevel =
  | 'NEMESIS'       // -100 to -75
  | 'HOSTILE'       // -75 to -50
  | 'UNFRIENDLY'    // -50 to -25
  | 'NEUTRAL'       // -25 to 25
  | 'FRIENDLY'      // 25 to 50
  | 'HONORED'       // 50 to 75
  | 'REVERED'       // 75 to 100
  | 'EXALTED';      // 100

export interface FactionReputation {
  factionId: string;
  factionName: string;
  value: number; // -100 to 100
  level: ReputationLevel;

  // Modifiers
  priceMultiplier: number; // Affects trade prices
  accessLevel: number; // 0-5, affects what you can access
  missionQualityBonus: number; // Better missions at higher rep

  // History
  gainedToday: number;
  lostToday: number;
  majorEvents: Array<{
    timestamp: number;
    change: number;
    reason: string;
  }>;

  // Status
  canDockAt: boolean;
  canTrade: boolean;
  canAcceptMissions: boolean;
  attackOnSight: boolean;
}

export interface ReputationChange {
  factionId: string;
  oldValue: number;
  newValue: number;
  change: number;
  oldLevel: ReputationLevel;
  newLevel: ReputationLevel;
  levelChanged: boolean;
  reason: string;
}

export class FactionReputationSystem {
  private orchestrator: UniverseOrchestrator;
  private reputations: Map<string, FactionReputation> = new Map();
  private playerName: string;

  // Reputation triggers
  private readonly HOSTILE_THRESHOLD = -50;
  private readonly ATTACK_ON_SIGHT_THRESHOLD = -75;

  constructor(orchestrator: UniverseOrchestrator, playerName: string = 'Player') {
    this.orchestrator = orchestrator;
    this.playerName = playerName;
  }

  /**
   * Initialize reputation with faction
   */
  public initializeFaction(factionId: string, factionName: string, startingRep: number = 0): void {
    if (this.reputations.has(factionId)) return;

    const rep: FactionReputation = {
      factionId,
      factionName,
      value: startingRep,
      level: this.calculateLevel(startingRep),
      priceMultiplier: this.calculatePriceMultiplier(startingRep),
      accessLevel: this.calculateAccessLevel(startingRep),
      missionQualityBonus: this.calculateMissionBonus(startingRep),
      gainedToday: 0,
      lostToday: 0,
      majorEvents: [],
      canDockAt: startingRep > this.HOSTILE_THRESHOLD,
      canTrade: startingRep > this.HOSTILE_THRESHOLD,
      canAcceptMissions: startingRep > -25,
      attackOnSight: startingRep < this.ATTACK_ON_SIGHT_THRESHOLD
    };

    this.reputations.set(factionId, rep);
    console.log(`[REPUTATION] Initialized ${factionName}: ${rep.level} (${startingRep})`);
  }

  /**
   * Change reputation with faction
   */
  public changeReputation(
    factionId: string,
    change: number,
    reason: string,
    cascadeToAllies: boolean = true
  ): ReputationChange | null {
    const rep = this.reputations.get(factionId);

    if (!rep) {
      console.warn(`[REPUTATION] Unknown faction: ${factionId}`);
      return null;
    }

    const oldValue = rep.value;
    const oldLevel = rep.level;

    // Apply change with bounds
    rep.value = Math.max(-100, Math.min(100, rep.value + change));

    // Update stats
    if (change > 0) {
      rep.gainedToday += change;
    } else {
      rep.lostToday += Math.abs(change);
    }

    // Recalculate derived values
    rep.level = this.calculateLevel(rep.value);
    rep.priceMultiplier = this.calculatePriceMultiplier(rep.value);
    rep.accessLevel = this.calculateAccessLevel(rep.value);
    rep.missionQualityBonus = this.calculateMissionBonus(rep.value);
    rep.canDockAt = rep.value > this.HOSTILE_THRESHOLD;
    rep.canTrade = rep.value > this.HOSTILE_THRESHOLD;
    rep.canAcceptMissions = rep.value > -25;
    rep.attackOnSight = rep.value < this.ATTACK_ON_SIGHT_THRESHOLD;

    const levelChanged = oldLevel !== rep.level;

    // Record major event
    if (Math.abs(change) >= 5 || levelChanged) {
      rep.majorEvents.push({
        timestamp: Date.now() / 1000,
        change,
        reason
      });

      // Keep only recent events
      if (rep.majorEvents.length > 20) {
        rep.majorEvents = rep.majorEvents.slice(-20);
      }
    }

    console.log(
      `[REPUTATION] ${rep.factionName}: ${oldValue.toFixed(0)} -> ${rep.value.toFixed(0)} (${change > 0 ? '+' : ''}${change.toFixed(0)}) - ${reason}`
    );

    if (levelChanged) {
      console.log(`[REPUTATION] Reputation level changed: ${oldLevel} -> ${rep.level}`);

      // Record event in universe
      this.orchestrator.recordEvent({
        id: `rep_level_change_${Date.now()}`,
        timestamp: Date.now() / 1000,
        type: 'REPUTATION_CHANGE' as any,
        category: 'PERSONAL' as any,
        severity: 5,
        location: { x: 0, y: 0, z: 0 },
        participants: [this.playerName, factionId],
        description: `${this.playerName} is now ${rep.level} with ${rep.factionName}`,
        data: { oldLevel, newLevel: rep.level, value: rep.value },
        consequences: [],
        witnessed: true,
        priority: 6,
        tags: ['reputation', 'faction']
      });
    }

    // Cascade to allied/enemy factions
    if (cascadeToAllies) {
      this.cascadeReputationChange(factionId, change, reason);
    }

    return {
      factionId,
      oldValue,
      newValue: rep.value,
      change,
      oldLevel,
      newLevel: rep.level,
      levelChanged,
      reason
    };
  }

  /**
   * Get reputation with faction
   */
  public getReputation(factionId: string): FactionReputation | null {
    return this.reputations.get(factionId) || null;
  }

  /**
   * Get all reputations
   */
  public getAllReputations(): FactionReputation[] {
    return Array.from(this.reputations.values())
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Get reputation report
   */
  public getReputationReport(): string {
    const lines: string[] = [];

    lines.push('=== FACTION REPUTATION ===');
    lines.push('');

    const reps = this.getAllReputations();

    for (const rep of reps) {
      const bar = this.createReputationBar(rep.value);
      lines.push(`${rep.factionName}: ${rep.level}`);
      lines.push(`  ${bar} ${rep.value.toFixed(0)}/100`);
      lines.push(`  Price: ${((rep.priceMultiplier - 1) * 100).toFixed(0)}% ${rep.priceMultiplier >= 1 ? 'markup' : 'discount'}`);
      lines.push(`  Access Level: ${rep.accessLevel}/5`);

      if (rep.attackOnSight) {
        lines.push(`  ⚠ WILL ATTACK ON SIGHT`);
      } else if (!rep.canDockAt) {
        lines.push(`  ⚠ Cannot dock at stations`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Check if player can dock at faction station
   */
  public canDockAtStation(factionId: string): { allowed: boolean; reason?: string } {
    const rep = this.reputations.get(factionId);

    if (!rep) {
      return { allowed: false, reason: 'Unknown faction' };
    }

    if (rep.attackOnSight) {
      return { allowed: false, reason: 'Hostile - will attack on sight' };
    }

    if (!rep.canDockAt) {
      return { allowed: false, reason: `Insufficient reputation (${rep.value.toFixed(0)}/${this.HOSTILE_THRESHOLD})` };
    }

    return { allowed: true };
  }

  /**
   * Apply reputation modifiers to trade price
   */
  public applyReputationToPrice(factionId: string, basePrice: number): number {
    const rep = this.reputations.get(factionId);

    if (!rep) return basePrice;

    return basePrice * rep.priceMultiplier;
  }

  /**
   * Handle combat action against faction
   */
  public handleCombatAction(targetFactionId: string, targetDestroyed: boolean): void {
    // Lose rep with target faction
    const repLoss = targetDestroyed ? -15 : -5;
    this.changeReputation(targetFactionId, repLoss, targetDestroyed ? 'Destroyed faction ship' : 'Attacked faction ship');

    // Allied factions also lose rep with player
    const allies = this.getAlliedFactions(targetFactionId);
    for (const allyId of allies) {
      this.changeReputation(allyId, repLoss * 0.5, `Allied with ${targetFactionId}`, false);
    }

    // Enemy factions gain rep with player
    const enemies = this.getEnemyFactions(targetFactionId);
    for (const enemyId of enemies) {
      this.changeReputation(enemyId, Math.abs(repLoss) * 0.3, `Enemy of ${targetFactionId}`, false);
    }
  }

  /**
   * Handle mission completion
   */
  public handleMissionComplete(factionId: string, missionDifficulty: number): void {
    const repGain = 5 + missionDifficulty;
    this.changeReputation(factionId, repGain, `Completed mission (difficulty ${missionDifficulty})`);
  }

  /**
   * Handle trade with faction
   */
  public handleTrade(factionId: string, value: number): void {
    // Small rep gain for trading
    const repGain = Math.min(1, value / 10000);
    if (repGain > 0.1) {
      this.changeReputation(factionId, repGain, `Trade (${value.toFixed(0)} credits)`, false);
    }
  }

  /**
   * Handle crime against faction
   */
  public handleCrime(factionId: string, severity: number): void {
    const repLoss = -severity * 3;
    this.changeReputation(factionId, repLoss, `Criminal activity (severity ${severity})`);
  }

  // Private methods
  private calculateLevel(value: number): ReputationLevel {
    if (value >= 100) return 'EXALTED';
    if (value >= 75) return 'REVERED';
    if (value >= 50) return 'HONORED';
    if (value >= 25) return 'FRIENDLY';
    if (value >= -25) return 'NEUTRAL';
    if (value >= -50) return 'UNFRIENDLY';
    if (value >= -75) return 'HOSTILE';
    return 'NEMESIS';
  }

  private calculatePriceMultiplier(value: number): number {
    // Better rep = better prices
    // -100: 1.5x markup
    // 0: 1.0x normal
    // 100: 0.7x discount
    return 1.0 + (value / -200);
  }

  private calculateAccessLevel(value: number): number {
    if (value >= 75) return 5;
    if (value >= 50) return 4;
    if (value >= 25) return 3;
    if (value >= 0) return 2;
    if (value >= -25) return 1;
    return 0;
  }

  private calculateMissionBonus(value: number): number {
    // Higher rep = better mission rewards and quality
    return Math.max(0, value / 50);
  }

  private createReputationBar(value: number): string {
    const normalized = (value + 100) / 200; // 0 to 1
    const barLength = 20;
    const filled = Math.floor(normalized * barLength);
    const empty = barLength - filled;

    return '[' + '='.repeat(filled) + ' '.repeat(empty) + ']';
  }

  private cascadeReputationChange(sourceFactionId: string, change: number, reason: string): void {
    // Get faction relationships from orchestrator
    const allies = this.getAlliedFactions(sourceFactionId);
    const enemies = this.getEnemyFactions(sourceFactionId);

    // Allies gain/lose 30% of the change
    for (const allyId of allies) {
      const cascadeChange = change * 0.3;
      if (Math.abs(cascadeChange) > 0.5) {
        this.changeReputation(allyId, cascadeChange, `Allied with ${sourceFactionId}`, false);
      }
    }

    // Enemies gain/lose opposite of change at 20%
    for (const enemyId of enemies) {
      const cascadeChange = -change * 0.2;
      if (Math.abs(cascadeChange) > 0.5) {
        this.changeReputation(enemyId, cascadeChange, `Enemy of ${sourceFactionId}`, false);
      }
    }
  }

  private getAlliedFactions(factionId: string): string[] {
    // Would query orchestrator for allied factions
    // For now, return empty
    return [];
  }

  private getEnemyFactions(factionId: string): string[] {
    // Would query orchestrator for enemy factions
    return [];
  }
}
