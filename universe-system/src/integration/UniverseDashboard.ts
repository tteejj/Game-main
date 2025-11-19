/**
 * Real-Time Universe Dashboard
 *
 * Live visualization of the entire universe:
 * - Active NPCs and their current actions
 * - Faction status and territorial control
 * - Active hazards and events
 * - Performance metrics
 * - Event log with cascading effects
 *
 * This is the "mission control" for your living universe!
 */

export interface DashboardConfig {
  updateFrequency: number; // Hz
  maxEventLog: number;
  showNPCDetails: boolean;
  showFactionDetails: boolean;
  showPerformance: boolean;
  colorEnabled: boolean;
}

export interface DashboardStats {
  // Universe
  systemName: string;
  uptime: number;
  totalUpdates: number;

  // NPCs
  totalNPCs: number;
  activeNPCs: number;
  npcsByStatus: Map<string, number>;
  npcsByType: Map<string, number>;

  // Factions
  totalFactions: number;
  territoriesControlled: number;
  activeConflicts: number;
  activeDiplomacy: number;

  // Environment
  activeHazards: number;
  hazardsBySeverity: Map<string, number>;
  activePOIs: number;

  // Events
  eventsThisSecond: number;
  totalEvents: number;
  eventCascades: number;

  // Performance
  fps: number;
  updateTime: number; // ms
  memoryUsage: number; // MB
}

export interface LiveEvent {
  timestamp: number;
  type: string;
  severity: number;
  description: string;
  participants: string[];
  cascadedFrom?: string;
  triggeredEvents: string[];
}

export class UniverseDashboard {
  private config: DashboardConfig;
  private stats: DashboardStats;
  private eventLog: LiveEvent[] = [];
  private startTime: number;
  private lastUpdate: number = 0;
  private updateCount: number = 0;

  // Color codes (ANSI)
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
  };

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      updateFrequency: 2, // 2 Hz
      maxEventLog: 50,
      showNPCDetails: true,
      showFactionDetails: true,
      showPerformance: true,
      colorEnabled: true,
      ...config
    };

    this.startTime = Date.now();

    this.stats = {
      systemName: 'Unknown',
      uptime: 0,
      totalUpdates: 0,
      totalNPCs: 0,
      activeNPCs: 0,
      npcsByStatus: new Map(),
      npcsByType: new Map(),
      totalFactions: 0,
      territoriesControlled: 0,
      activeConflicts: 0,
      activeDiplomacy: 0,
      activeHazards: 0,
      hazardsBySeverity: new Map(),
      activePOIs: 0,
      eventsThisSecond: 0,
      totalEvents: 0,
      eventCascades: 0,
      fps: 0,
      updateTime: 0,
      memoryUsage: 0
    };
  }

  /**
   * Update dashboard with current universe state
   */
  public update(integratedOrchestrator: any): void {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    this.updateCount++;

    // Update stats
    this.stats.uptime = (now - this.startTime) / 1000;
    this.stats.totalUpdates = this.updateCount;
    this.stats.fps = deltaTime > 0 ? 1 / deltaTime : 0;

    // Update from orchestrator
    if (integratedOrchestrator) {
      this.updateFromOrchestrator(integratedOrchestrator);
    }

    // Update memory usage
    if (process.memoryUsage) {
      this.stats.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    }
  }

  /**
   * Extract stats from integrated orchestrator
   */
  private updateFromOrchestrator(orchestrator: any): void {
    const starSystem = orchestrator.getStarSystem();
    this.stats.systemName = starSystem.name;

    // NPCs
    const ships = orchestrator.getAllShips();
    this.stats.totalNPCs = ships.length;
    this.stats.activeNPCs = ships.filter((s: any) => s.ship.status !== 'IDLE' && s.ship.status !== 'DOCKED').length;

    // Count by status
    this.stats.npcsByStatus.clear();
    this.stats.npcsByType.clear();

    for (const npc of ships) {
      const status = npc.ship.status;
      const type = npc.ship.type;

      this.stats.npcsByStatus.set(status, (this.stats.npcsByStatus.get(status) || 0) + 1);
      this.stats.npcsByType.set(type, (this.stats.npcsByType.get(type) || 0) + 1);
    }

    // Hazards
    const hazards = starSystem.hazardSystem.getActiveHazards();
    this.stats.activeHazards = hazards.length;
    this.stats.hazardsBySeverity.clear();

    for (const hazard of hazards) {
      const severity = hazard.severity.toString();
      this.stats.hazardsBySeverity.set(severity, (this.stats.hazardsBySeverity.get(severity) || 0) + 1);
    }

    // POIs
    this.stats.activePOIs = starSystem.poiManager.getAllPOIs().length;

    // Events
    this.stats.totalEvents = this.eventLog.length;
    this.stats.eventCascades = this.eventLog.filter(e => e.triggeredEvents.length > 0).length;
  }

  /**
   * Record an event
   */
  public recordEvent(event: LiveEvent): void {
    this.eventLog.push(event);
    this.stats.eventsThisSecond++;

    // Trim log
    if (this.eventLog.length > this.config.maxEventLog) {
      this.eventLog = this.eventLog.slice(-this.config.maxEventLog);
    }
  }

  /**
   * Clear the console
   */
  private clearConsole(): void {
    console.clear();
  }

  /**
   * Color text
   */
  private color(text: string, color: keyof typeof this.colors): string {
    if (!this.config.colorEnabled) return text;
    return this.colors[color] + text + this.colors.reset;
  }

  /**
   * Render dashboard
   */
  public render(): void {
    this.clearConsole();

    const lines: string[] = [];

    // Header
    lines.push(this.color('═'.repeat(100), 'cyan'));
    lines.push(this.color(`  🌌 UNIVERSE MISSION CONTROL - ${this.stats.systemName.toUpperCase()}`, 'bright'));
    lines.push(this.color('═'.repeat(100), 'cyan'));
    lines.push('');

    // System Status
    lines.push(this.color('⚡ SYSTEM STATUS', 'yellow'));
    lines.push(`  Uptime: ${this.formatTime(this.stats.uptime)} | Updates: ${this.stats.totalUpdates} | FPS: ${this.stats.fps.toFixed(1)}`);
    lines.push(`  Memory: ${this.stats.memoryUsage.toFixed(1)} MB | Update Time: ${this.stats.updateTime.toFixed(2)} ms`);
    lines.push('');

    // NPCs
    if (this.config.showNPCDetails) {
      lines.push(this.color('🚀 NPCs', 'green'));
      lines.push(`  Total: ${this.stats.totalNPCs} | Active: ${this.color(this.stats.activeNPCs.toString(), 'bright')}`);

      if (this.stats.npcsByStatus.size > 0) {
        const statusLine = Array.from(this.stats.npcsByStatus.entries())
          .map(([status, count]) => {
            const statusColor = this.getStatusColor(status);
            return `${status}: ${this.color(count.toString(), statusColor)}`;
          })
          .join(' | ');
        lines.push(`  ${statusLine}`);
      }

      if (this.stats.npcsByType.size > 0) {
        const typeLine = Array.from(this.stats.npcsByType.entries())
          .map(([type, count]) => `${type}: ${count}`)
          .join(' | ');
        lines.push(`  ${typeLine}`);
      }
      lines.push('');
    }

    // Environment
    lines.push(this.color('⚠️  ENVIRONMENT', 'yellow'));
    lines.push(`  Hazards: ${this.color(this.stats.activeHazards.toString(), 'red')} | POIs: ${this.stats.activePOIs}`);

    if (this.stats.hazardsBySeverity.size > 0) {
      const hazardLine = Array.from(this.stats.hazardsBySeverity.entries())
        .map(([severity, count]) => {
          const severityColor = parseInt(severity) >= 4 ? 'red' : parseInt(severity) >= 2 ? 'yellow' : 'white';
          return `Severity ${severity}: ${this.color(count.toString(), severityColor)}`;
        })
        .join(' | ');
      lines.push(`  ${hazardLine}`);
    }
    lines.push('');

    // Events
    lines.push(this.color('📡 EVENTS', 'magenta'));
    lines.push(`  Total: ${this.stats.totalEvents} | Cascades: ${this.color(this.stats.eventCascades.toString(), 'bright')} | This Second: ${this.stats.eventsThisSecond}`);
    lines.push('');

    // Recent events
    lines.push(this.color('📜 RECENT EVENTS', 'cyan'));
    const recentEvents = this.eventLog.slice(-10).reverse();

    if (recentEvents.length === 0) {
      lines.push(this.color('  No recent events', 'dim'));
    } else {
      for (const event of recentEvents) {
        const age = ((Date.now() / 1000) - event.timestamp).toFixed(0);
        const severityColor = event.severity >= 8 ? 'red' : event.severity >= 5 ? 'yellow' : 'white';
        const cascadeIndicator = event.triggeredEvents.length > 0 ? ` ⚡${event.triggeredEvents.length}` : '';

        lines.push(`  ${this.color(`[${age}s ago]`, 'dim')} ${this.color(event.type, severityColor)}${cascadeIndicator}`);
        lines.push(`    ${this.color(event.description, 'white')}`);

        if (event.cascadedFrom) {
          lines.push(`    ${this.color(`↳ Cascaded from: ${event.cascadedFrom}`, 'dim')}`);
        }
      }
    }

    lines.push('');
    lines.push(this.color('═'.repeat(100), 'cyan'));

    // Print all lines
    console.log(lines.join('\n'));

    // Reset events per second counter
    this.stats.eventsThisSecond = 0;
  }

  /**
   * Get color for ship status
   */
  private getStatusColor(status: string): keyof typeof this.colors {
    switch (status) {
      case 'TRAVELING': return 'green';
      case 'DOCKING': return 'yellow';
      case 'DOCKED': return 'dim';
      case 'FLEEING': return 'red';
      case 'ATTACKING': return 'red';
      case 'DISABLED': return 'red';
      case 'MINING': return 'cyan';
      case 'PATROLLING': return 'blue';
      default: return 'white';
    }
  }

  /**
   * Format seconds to human-readable time
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Get current stats
   */
  public getStats(): DashboardStats {
    return { ...this.stats };
  }

  /**
   * Get recent events
   */
  public getRecentEvents(count: number = 10): LiveEvent[] {
    return this.eventLog.slice(-count);
  }
}
