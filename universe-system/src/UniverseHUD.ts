/**
 * UniverseHUD - Display universe information to player
 * Aggregates data from all systems and presents it in a coherent interface
 */

import { PlayerShipIntegration, PlayerState } from './PlayerShipIntegration';
import { SensorIntegration, SensorContact } from './SensorIntegration';
import { CommunicationInterface, CommunicationMessage } from './CommunicationInterface';
import { MissionSystem, Mission } from './MissionSystem';
import { PlanetaryCityEconomy, City } from './PlanetaryCityEconomy';
import { UniverseOrchestrator } from './UniverseOrchestrator';

export interface HUDData {
  // Player status
  player: {
    shipName: string;
    credits: number;
    cargo: string; // "50/100"
    fuel: string; // "750/1000kg"
    hull: string; // "95%"
    currentSystem: string;
    nearestStation: string | null;
    distanceToStation: string | null;
  };

  // Sensors
  sensors: {
    contactCount: number;
    nearestContact: string | null;
    threats: number;
    tracked: number;
  };

  // Communications
  comms: {
    unreadMessages: number;
    recentMessage: string | null;
    activeBroadcasts: number;
  };

  // Missions
  missions: {
    active: number;
    nextObjective: string | null;
    timeRemaining: string | null;
  };

  // Economy
  economy: {
    nearestMarket: string | null;
    bestBuyOpportunity: string | null;
    bestSellOpportunity: string | null;
  };

  // News & Events
  news: {
    recentHeadline: string | null;
    systemActivity: string; // "HIGH" | "MODERATE" | "LOW"
    factionsPresent: string[];
  };

  // Navigation
  navigation: {
    velocity: string;
    eta: string | null;
    routePlanned: boolean;
  };
}

export interface DetailedStatus {
  // Complete player state
  playerState: PlayerState;

  // All sensor contacts
  contacts: SensorContact[];

  // All messages
  messages: CommunicationMessage[];

  // All missions
  missions: Mission[];

  // Available cities/markets
  cities: City[];

  // Universe news
  news: any[];

  // Faction standings
  reputation: Map<string, number>;
}

export class UniverseHUD {
  private playerIntegration: PlayerShipIntegration;
  private sensors: SensorIntegration;
  private comms: CommunicationInterface;
  private missions: MissionSystem;
  private cityEconomy: PlanetaryCityEconomy;
  private orchestrator: UniverseOrchestrator;

  constructor(
    playerIntegration: PlayerShipIntegration,
    sensors: SensorIntegration,
    comms: CommunicationInterface,
    missions: MissionSystem,
    cityEconomy: PlanetaryCityEconomy,
    orchestrator: UniverseOrchestrator
  ) {
    this.playerIntegration = playerIntegration;
    this.sensors = sensors;
    this.comms = comms;
    this.missions = missions;
    this.cityEconomy = cityEconomy;
    this.orchestrator = orchestrator;
  }

  /**
   * Get compact HUD data for main display
   */
  public getHUDData(): HUDData {
    const playerState = this.playerIntegration.getState();
    const contacts = this.sensors.getContacts();
    const threats = contacts.filter(c => c.threat > 5);
    const tracked = contacts.filter(c => c.isTracked);
    const nearestContact = this.sensors.getNearestContact();
    const unreadMessages = this.comms.getUnreadMessages();
    const activeMissions = this.missions.getActiveMissions();
    const news = this.orchestrator.getRecentNews(1);

    return {
      player: {
        shipName: playerState.shipName,
        credits: playerState.credits,
        cargo: `${playerState.cargoUsed}/${playerState.cargoCapacity}`,
        fuel: 'N/A', // Would get from spacecraft
        hull: 'N/A', // Would get from spacecraft
        currentSystem: playerState.currentSystem?.name || 'UNKNOWN',
        nearestStation: playerState.nearestStation?.name || null,
        distanceToStation: playerState.nearestStation
          ? `${(playerState.distanceToStation / 1000).toFixed(1)}km`
          : null
      },

      sensors: {
        contactCount: contacts.length,
        nearestContact: nearestContact ? `${nearestContact.name} (${(nearestContact.distance / 1000).toFixed(1)}km)` : null,
        threats: threats.length,
        tracked: tracked.length
      },

      comms: {
        unreadMessages: unreadMessages.length,
        recentMessage: unreadMessages.length > 0 ? unreadMessages[0].subject : null,
        activeBroadcasts: this.comms.getSystemBroadcasts().length
      },

      missions: {
        active: activeMissions.length,
        nextObjective: activeMissions.length > 0
          ? activeMissions[0].objectives[activeMissions[0].currentObjective]?.description
          : null,
        timeRemaining: activeMissions.length > 0 && activeMissions[0].expiresAt
          ? this.formatTime(activeMissions[0].expiresAt - Date.now() / 1000)
          : null
      },

      economy: {
        nearestMarket: playerState.nearestStation?.name || null,
        bestBuyOpportunity: null, // Would analyze market data
        bestSellOpportunity: null // Would analyze market data
      },

      news: {
        recentHeadline: news.length > 0 ? news[0].headline : null,
        systemActivity: this.calculateSystemActivity(playerState.currentSystem?.id),
        factionsPresent: this.getFactionsInSystem(playerState.currentSystem?.id)
      },

      navigation: {
        velocity: this.formatVelocity(playerState.velocity),
        eta: null, // Would calculate from navigation computer
        routePlanned: false // Would check navigation computer
      }
    };
  }

  /**
   * Get detailed status for full status screen
   */
  public getDetailedStatus(): DetailedStatus {
    const playerState = this.playerIntegration.getState();

    return {
      playerState,
      contacts: this.sensors.getContacts(),
      messages: this.comms.getAllMessages(50),
      missions: this.missions.getActiveMissions(),
      cities: this.cityEconomy.getAllCities(),
      news: this.orchestrator.getRecentNews(10),
      reputation: playerState.factionReputation
    };
  }

  /**
   * Get formatted player status string
   */
  public getPlayerStatusString(): string {
    const data = this.getHUDData();
    const lines: string[] = [];

    lines.push('=== PLAYER STATUS ===');
    lines.push(`Ship: ${data.player.shipName}`);
    lines.push(`Credits: ${data.player.credits.toFixed(0)}`);
    lines.push(`Cargo: ${data.player.cargo}`);
    lines.push(`Hull: ${data.player.hull}`);
    lines.push(`System: ${data.player.currentSystem}`);

    if (data.player.nearestStation) {
      lines.push(`Nearest Station: ${data.player.nearestStation} (${data.player.distanceToStation})`);
    }

    return lines.join('\n');
  }

  /**
   * Get formatted sensor report
   */
  public getSensorReportString(): string {
    const data = this.getHUDData();
    const lines: string[] = [];

    lines.push('=== SENSOR REPORT ===');
    lines.push(`Contacts: ${data.sensors.contactCount}`);
    lines.push(`Threats: ${data.sensors.threats}`);
    lines.push(`Tracked: ${data.sensors.tracked}`);

    if (data.sensors.nearestContact) {
      lines.push(`Nearest: ${data.sensors.nearestContact}`);
    }

    // Detailed contact list
    const contacts = this.sensors.getContacts({ maxDistance: 100000 });
    if (contacts.length > 0) {
      lines.push('');
      lines.push('Nearby Contacts:');
      for (const contact of contacts.slice(0, 10)) {
        const dist = (contact.distance / 1000).toFixed(1);
        const threat = contact.threat > 0 ? ' [THREAT]' : '';
        lines.push(`  ${contact.name} (${contact.type}) - ${dist}km${threat}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get formatted mission report
   */
  public getMissionReportString(): string {
    const data = this.getHUDData();
    const missions = this.missions.getActiveMissions();
    const lines: string[] = [];

    lines.push('=== ACTIVE MISSIONS ===');

    if (missions.length === 0) {
      lines.push('No active missions');
    } else {
      for (const mission of missions) {
        lines.push('');
        lines.push(`[${mission.type}] ${mission.title}`);
        lines.push(`  Reward: ${mission.creditReward} credits`);
        lines.push(`  Progress: ${mission.currentObjective}/${mission.objectives.length}`);

        const currentObj = mission.objectives[mission.currentObjective];
        if (currentObj) {
          lines.push(`  Next: ${currentObj.description}`);
        }

        if (mission.timeLimit && mission.expiresAt) {
          const remaining = mission.expiresAt - Date.now() / 1000;
          lines.push(`  Time: ${this.formatTime(remaining)}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get formatted communication log
   */
  public getCommLogString(): string {
    const messages = this.comms.getAllMessages(10);
    const lines: string[] = [];

    lines.push('=== COMMUNICATION LOG ===');

    if (messages.length === 0) {
      lines.push('No messages');
    } else {
      for (const msg of messages) {
        const read = msg.read ? '' : '[UNREAD] ';
        const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
        lines.push(`${read}[${time}] ${msg.senderName}: ${msg.subject}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get formatted market report
   */
  public getMarketReportString(): string {
    const playerState = this.playerIntegration.getState();
    const lines: string[] = [];

    lines.push('=== MARKET REPORT ===');

    if (playerState.dockedAt) {
      const menu = this.playerIntegration.getStationServiceMenu();

      if (menu && menu.tradingAvailable) {
        lines.push(`Station: ${menu.stationName}`);
        lines.push('');
        lines.push('Available Commodities:');

        for (const [commodity, price] of menu.buyPrices) {
          const stock = menu.inventory.get(commodity) || 0;
          lines.push(`  ${commodity}: ${price.toFixed(2)} credits/unit (Stock: ${stock})`);
        }

        lines.push('');
        lines.push('Selling Prices:');

        for (const [commodity, price] of menu.sellPrices) {
          lines.push(`  ${commodity}: ${price.toFixed(2)} credits/unit`);
        }
      }
    } else {
      lines.push('Dock at a station to access markets');
    }

    return lines.join('\n');
  }

  /**
   * Get formatted news report
   */
  public getNewsReportString(): string {
    const news = this.playerIntegration.getRecentNews();
    const lines: string[] = [];

    lines.push('=== GALACTIC NEWS ===');

    if (news.length === 0) {
      lines.push('No recent news');
    } else {
      for (const article of news.slice(0, 5)) {
        lines.push('');
        lines.push(`[${article.category}] ${article.headline}`);
        lines.push(article.content.substring(0, 200) + '...');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get complete HUD display string
   */
  public getCompleteHUDString(): string {
    const sections = [
      this.getPlayerStatusString(),
      this.getSensorReportString(),
      this.getMissionReportString(),
      this.getCommLogString(),
      this.getNewsReportString()
    ];

    return sections.join('\n\n' + '='.repeat(50) + '\n\n');
  }

  /**
   * Get tactical overlay data (for rendering)
   */
  public getTacticalOverlay(): {
    contacts: Array<{
      id: string;
      type: string;
      name: string;
      screenPos: { x: number; y: number }; // Would be calculated from 3D position
      distance: number;
      threat: number;
      icon: string;
    }>;
    threats: Array<{ id: string; name: string; threat: number }>;
    waypoints: Array<{ name: string; screenPos: { x: number; y: number } }>;
  } {
    const contacts = this.sensors.getContacts({ maxDistance: 50000 });
    const missions = this.missions.getActiveMissions();

    return {
      contacts: contacts.map(c => ({
        id: c.id,
        type: c.type,
        name: c.name,
        screenPos: { x: 0, y: 0 }, // Would project 3D -> 2D
        distance: c.distance,
        threat: c.threat,
        icon: this.getIconForType(c.type)
      })),
      threats: contacts
        .filter(c => c.threat > 5)
        .map(c => ({ id: c.id, name: c.name, threat: c.threat })),
      waypoints: []
    };
  }

  // Private methods
  private formatVelocity(velocity: { x: number; y: number; z: number }): string {
    const speed = Math.sqrt(
      velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
    );
    return `${(speed / 1000).toFixed(1)} km/s`;
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  private calculateSystemActivity(systemId?: string): string {
    if (!systemId) return 'LOW';

    const subsystems = this.orchestrator.getSubsystems();
    const recentEvents = subsystems.history.queryEvents({
      systemId,
      startTime: Date.now() / 1000 - 3600, // Last hour
      endTime: Date.now() / 1000
    });

    if (recentEvents.length > 20) return 'HIGH';
    if (recentEvents.length > 5) return 'MODERATE';
    return 'LOW';
  }

  private getFactionsInSystem(systemId?: string): string[] {
    if (!systemId) return [];

    // Would query orchestrator for factions with presence in system
    return ['UEC', 'MCA']; // Placeholder
  }

  private getIconForType(type: string): string {
    const icons: { [key: string]: string } = {
      'SHIP': '◊',
      'STATION': '⬢',
      'PLANET': '●',
      'ASTEROID': '•',
      'DEBRIS': '·',
      'ANOMALY': '?',
      'POI': '!'
    };

    return icons[type] || '?';
  }
}
