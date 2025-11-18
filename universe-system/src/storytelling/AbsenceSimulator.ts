/**
 * AbsenceSimulator - "While You Were Away" system
 *
 * When player loads save after time has passed, simulate what happened
 * and generate a summary so the universe feels alive even offline.
 */

import { HistoricalMemorySystem, HistoricalEvent } from '../simulation/HistoricalMemorySystem';
import { ConsequenceEngine } from '../simulation/ConsequenceEngine';
import { FactionDiplomacyEngine } from '../faction-dynamics/FactionDiplomacyEngine';
import { FactionEconomicNeeds } from '../faction-dynamics/FactionEconomicNeeds';

export interface AbsenceSummary {
  timeElapsed: number;                // Seconds
  simulatedTicks: number;

  // Major events
  majorEvents: HistoricalEvent[];
  crises: CrisisReport[];
  wars: WarUpdate[];

  // Economic changes
  economicChanges: EconomicChange[];
  priceChanges: Map<string, number>;  // commodity -> % change

  // Political changes
  diplomaticChanges: DiplomaticChange[];
  newAlliances: string[];
  brokenAlliances: string[];

  // Personal impacts
  personalImpacts: PersonalImpact[];
  reputation Changes: Map<string, number>;  // faction -> change

  // Messages & news
  unreadMessages: number;
  breakingNews: string[];

  // State of universe
  universeState: UniverseStateSnapshot;
}

export interface CrisisReport {
  type: 'ECONOMIC' | 'MILITARY' | 'ENVIRONMENTAL' | 'SOCIAL';
  severity: number;                   // 0-10
  location: string;
  description: string;
  resolved: boolean;
  casualties?: number;
}

export interface WarUpdate {
  factions: string[];
  status: 'STARTED' | 'ONGOING' | 'ENDED';
  casualties: number;
  outcome?: string;
}

export interface EconomicChange {
  type: 'BOOM' | 'RECESSION' | 'CRISIS' | 'RECOVERY';
  affectedFactions: string[];
  gdpChange: number;                  // % change
  description: string;
}

export interface DiplomaticChange {
  type: 'WAR_DECLARED' | 'PEACE_TREATY' | 'ALLIANCE_FORMED' | 'ALLIANCE_BROKEN';
  factions: string[];
  description: string;
  impact: string;
}

export interface PersonalImpact {
  type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
  severity: number;                   // 0-10
}

export interface UniverseStateSnapshot {
  activeWars: number;
  economicCrises: number;
  avgFactionRelationship: number;
  totalEvents: number;
  timestamp: number;
}

export class AbsenceSimulator {
  private history: HistoricalMemorySystem;
  private consequences: ConsequenceEngine;
  private diplomacy: FactionDiplomacyEngine;
  private economics: FactionEconomicNeeds;

  constructor(
    history: HistoricalMemorySystem,
    consequences: ConsequenceEngine,
    diplomacy: FactionDiplomacyEngine,
    economics: FactionEconomicNeeds
  ) {
    this.history = history;
    this.consequences = consequences;
    this.diplomacy = diplomacy;
    this.economics = economics;
  }

  /**
   * Simulate elapsed time and generate summary
   */
  public simulate(
    lastSaveTime: number,
    currentTime: number,
    playerFaction?: string
  ): AbsenceSummary {
    const elapsed = currentTime - lastSaveTime;

    console.log(`[ABSENCE SIMULATOR] Simulating ${elapsed}s (${(elapsed / 3600).toFixed(1)} hours)`);

    const summary: AbsenceSummary = {
      timeElapsed: elapsed,
      simulatedTicks: 0,
      majorEvents: [],
      crises: [],
      wars: [],
      economicChanges: [],
      priceChanges: new Map(),
      diplomaticChanges: [],
      newAlliances: [],
      brokenAlliances: [],
      personalImpacts: [],
      reputationChanges: new Map(),
      unreadMessages: 0,
      breakingNews: [],
      universeState: {
        activeWars: 0,
        economicCrises: 0,
        avgFactionRelationship: 0,
        totalEvents: 0,
        timestamp: currentTime
      }
    };

    // Fast-forward simulation
    const ticksToSimulate = this.calculateTicksNeeded(elapsed);
    summary.simulatedTicks = ticksToSimulate;

    for (let i = 0; i < ticksToSimulate; i++) {
      const tickTime = lastSaveTime + (elapsed / ticksToSimulate) * i;

      // Macro tick: Generate major events
      if (i % 10 === 0) {  // Every 10th tick
        const events = this.generateMacroEvents(tickTime, i / ticksToSimulate);
        summary.majorEvents.push(...events);

        // Process events
        for (const event of events) {
          this.history.recordEvent(event);
          this.consequences.processEvent(event);
        }
      }

      // Update systems
      if (i % 5 === 0) {  // Every 5th tick
        this.diplomacy.update(elapsed / ticksToSimulate);
        // economics.update would go here if we had faction list
      }
    }

    // Analyze what happened
    this.analyzeEvents(summary, lastSaveTime, currentTime, playerFaction);

    return summary;
  }

  /**
   * Generate text summary
   */
  public generateTextSummary(summary: AbsenceSummary): string {
    const lines: string[] = [];

    lines.push('═'.repeat(70));
    lines.push('WHILE YOU WERE AWAY');
    lines.push('═'.repeat(70));
    lines.push('');

    // Time elapsed
    const hours = Math.floor(summary.timeElapsed / 3600);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      lines.push(`Time Elapsed: ${days} days, ${hours % 24} hours`);
    } else {
      lines.push(`Time Elapsed: ${hours} hours`);
    }
    lines.push('');

    // Breaking news
    if (summary.breakingNews.length > 0) {
      lines.push('🚨 BREAKING NEWS:');
      for (const news of summary.breakingNews.slice(0, 3)) {
        lines.push(`  • ${news}`);
      }
      lines.push('');
    }

    // Wars
    if (summary.wars.length > 0) {
      lines.push('⚔️  MILITARY CONFLICTS:');
      for (const war of summary.wars) {
        if (war.status === 'STARTED') {
          lines.push(`  • WAR BEGAN: ${war.factions.join(' vs ')}`);
        } else if (war.status === 'ENDED') {
          lines.push(`  • WAR ENDED: ${war.factions.join(' vs ')} - ${war.outcome}`);
        }
        lines.push(`    Casualties: ${war.casualties}`);
      }
      lines.push('');
    }

    // Crises
    if (summary.crises.length > 0) {
      lines.push('🔥 CRISES:');
      for (const crisis of summary.crises) {
        const status = crisis.resolved ? '✓ RESOLVED' : '⚠️  ONGOING';
        lines.push(`  ${status} [${crisis.severity}/10] ${crisis.description}`);
      }
      lines.push('');
    }

    // Economic changes
    if (summary.economicChanges.length > 0) {
      lines.push('💰 ECONOMY:');
      for (const change of summary.economicChanges) {
        const trend = change.gdpChange > 0 ? '📈' : '📉';
        lines.push(`  ${trend} ${change.type}: ${change.description}`);
        lines.push(`    GDP ${change.gdpChange > 0 ? '+' : ''}${change.gdpChange.toFixed(1)}%`);
      }
      lines.push('');
    }

    // Price changes
    if (summary.priceChanges.size > 0) {
      lines.push('COMMODITY PRICES:');
      for (const [commodity, change] of summary.priceChanges) {
        const symbol = change > 0 ? '↑' : '↓';
        lines.push(`  ${symbol} ${commodity}: ${change > 0 ? '+' : ''}${change.toFixed(0)}%`);
      }
      lines.push('');
    }

    // Diplomatic changes
    if (summary.diplomaticChanges.length > 0) {
      lines.push('🤝 DIPLOMACY:');
      for (const change of summary.diplomaticChanges) {
        lines.push(`  • ${change.type.replace(/_/g, ' ')}: ${change.description}`);
      }
      lines.push('');
    }

    // Personal impacts
    if (summary.personalImpacts.length > 0) {
      lines.push('YOUR REPUTATION:');
      for (const impact of summary.personalImpacts) {
        const icon = impact.type === 'POSITIVE' ? '✓' : impact.type === 'NEGATIVE' ? '✗' : '•';
        lines.push(`  ${icon} ${impact.description}`);
      }

      if (summary.reputationChanges.size > 0) {
        lines.push('');
        lines.push('  Faction Standing:');
        for (const [faction, change] of summary.reputationChanges) {
          const symbol = change > 0 ? '+' : '';
          lines.push(`    ${faction}: ${symbol}${change}`);
        }
      }
      lines.push('');
    }

    // Messages
    if (summary.unreadMessages > 0) {
      lines.push(`📬 UNREAD MESSAGES: ${summary.unreadMessages}`);
      lines.push('');
    }

    // Major events summary
    if (summary.majorEvents.length > 0) {
      lines.push('NOTABLE EVENTS:');
      const topEvents = summary.majorEvents
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 5);

      for (const event of topEvents) {
        lines.push(`  • ${event.description}`);
      }
      lines.push('');
    }

    // Universe state
    lines.push('UNIVERSE STATUS:');
    lines.push(`  Active Wars: ${summary.universeState.activeWars}`);
    lines.push(`  Economic Crises: ${summary.universeState.economicCrises}`);
    lines.push(`  Events Recorded: ${summary.universeState.totalEvents}`);
    lines.push('');

    lines.push('═'.repeat(70));

    return lines.join('\n');
  }

  // ====================================================================
  // PRIVATE METHODS
  // ====================================================================

  private calculateTicksNeeded(elapsed: number): number {
    // Scale tick count based on time elapsed
    if (elapsed < 3600) {  // < 1 hour
      return 10;
    } else if (elapsed < 86400) {  // < 1 day
      return 20;
    } else if (elapsed < 604800) {  // < 1 week
      return 50;
    } else {  // 1 week+
      return 100;
    }
  }

  private generateMacroEvents(timestamp: number, progress: number): HistoricalEvent[] {
    const events: HistoricalEvent[] = [];

    // Random event generation (scaled by progress to spread events across time)
    const eventChance = 0.1 + (progress * 0.1);

    if (Math.random() < eventChance) {
      events.push(this.generateRandomEvent(timestamp));
    }

    return events;
  }

  private generateRandomEvent(timestamp: number): HistoricalEvent {
    const eventTypes = [
      'PIRATE_RAID',
      'TRADE_COMPLETED',
      'STATION_FOUNDED',
      'SOLAR_FLARE',
      'COMMODITY_SHORTAGE'
    ];

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)] as any;

    return {
      id: `event_absence_${timestamp}`,
      timestamp,
      type,
      severity: Math.floor(Math.random() * 10) + 1,
      category: 'ECONOMIC',
      location: { x: 0, y: 0, z: 0 },
      participants: [],
      description: `${type.replace(/_/g, ' ')} occurred during absence`,
      data: {},
      consequences: [],
      witnessed: false,
      priority: 5,
      tags: ['absence', 'simulated']
    };
  }

  private analyzeEvents(
    summary: AbsenceSummary,
    startTime: number,
    endTime: number,
    playerFaction?: string
  ): void {
    // Get events from history
    const events = this.history.queryEvents({
      startTime,
      endTime,
      sortBy: 'severity',
      sortOrder: 'desc'
    });

    summary.universeState.totalEvents = events.length;

    // Categorize events
    for (const event of events) {
      // Check for wars
      if (event.type === 'WAR_DECLARED') {
        summary.wars.push({
          factions: [event.data?.factionA, event.data?.factionB],
          status: 'STARTED',
          casualties: 0
        });

        summary.diplomaticChanges.push({
          type: 'WAR_DECLARED',
          factions: [event.data?.factionA, event.data?.factionB],
          description: `${event.data?.factionA} declared war on ${event.data?.factionB}`,
          impact: 'Major escalation'
        });

        summary.breakingNews.push(event.description);
        summary.universeState.activeWars++;
      }

      // Check for crises
      if (event.severity > 8) {
        summary.crises.push({
          type: event.category as any || 'ENVIRONMENTAL',
          severity: event.severity,
          location: event.systemId || 'Unknown',
          description: event.description,
          resolved: false,
          casualties: event.data?.casualties
        });

        if (event.severity >= 9) {
          summary.breakingNews.push(event.description);
        }
      }

      // Check for economic events
      if (event.category === 'ECONOMIC') {
        if (event.type === 'SHORTAGE' || event.type === 'MARKET_CRASH') {
          summary.economicChanges.push({
            type: 'CRISIS',
            affectedFactions: event.participants,
            gdpChange: -5,
            description: event.description
          });
          summary.universeState.economicCrises++;
        } else if (event.type === 'ECONOMIC_BOOM') {
          summary.economicChanges.push({
            type: 'BOOM',
            affectedFactions: event.participants,
            gdpChange: 5,
            description: event.description
          });
        }
      }

      // Personal impacts (if player faction specified)
      if (playerFaction && event.participants.includes(playerFaction)) {
        const impact: PersonalImpact = {
          type: event.severity > 5 ? 'NEGATIVE' : 'POSITIVE',
          description: `You were involved: ${event.description}`,
          severity: event.severity
        };
        summary.personalImpacts.push(impact);
      }
    }

    // Calculate price changes (simplified)
    const commodities = ['FOOD', 'WATER', 'FUEL', 'ELECTRONICS'];
    for (const commodity of commodities) {
      const change = (Math.random() - 0.5) * 40;  // -20% to +20%
      if (Math.abs(change) > 5) {
        summary.priceChanges.set(commodity, change);
      }
    }

    // Unread messages (estimated)
    summary.unreadMessages = Math.floor(events.length * 0.3);
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public quickSimulate(hoursElapsed: number): string {
    const summary = this.simulate(
      Date.now() / 1000 - hoursElapsed * 3600,
      Date.now() / 1000
    );

    return this.generateTextSummary(summary);
  }
}
