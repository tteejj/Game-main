/**
 * CommunicationInterface - Player communication with universe entities
 * Handles hailing stations, NPCs, receiving messages, distress calls, news
 */

import { SpaceStation } from './StationGenerator';
import { UniverseOrchestrator } from './UniverseOrchestrator';
import { Vector3 } from './CelestialBody';

export type MessageType =
  | 'HAIL_REQUEST'
  | 'HAIL_RESPONSE'
  | 'DOCKING_REQUEST'
  | 'DOCKING_APPROVED'
  | 'DOCKING_DENIED'
  | 'DISTRESS_CALL'
  | 'TRADE_OFFER'
  | 'THREAT'
  | 'SCAN_WARNING'
  | 'NEWS_BROADCAST'
  | 'MISSION_OFFER'
  | 'STATION_ANNOUNCEMENT'
  | 'NPC_CHAT'
  | 'FACTION_BROADCAST';

export interface CommunicationMessage {
  id: string;
  timestamp: number;

  // Parties
  senderId: string;
  senderName: string;
  senderType: 'STATION' | 'SHIP' | 'PLANET' | 'FACTION' | 'SYSTEM';
  receiverId: string;

  // Message
  type: MessageType;
  subject: string;
  content: string;
  tone: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE' | 'URGENT' | 'CASUAL';

  // Context
  location: Vector3;
  systemId: string;

  // Interaction
  requiresResponse: boolean;
  responseOptions?: CommunicationOption[];
  expiresAt?: number;

  // Status
  read: boolean;
  responded: boolean;
  archived: boolean;
}

export interface CommunicationOption {
  id: string;
  text: string;
  consequence: string; // What happens if selected
  reputationChange?: Map<string, number>;
  creditsChange?: number;
}

export interface HailResponse {
  success: boolean;
  entityId: string;
  entityName: string;
  message: string;
  tone: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE' | 'URGENT';
  options?: CommunicationOption[];
}

export interface DistressCall {
  id: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  position: Vector3;
  systemId: string;
  emergencyType: 'HULL_BREACH' | 'LIFE_SUPPORT' | 'FUEL' | 'PIRATES' | 'MEDICAL' | 'STRANDED';
  message: string;
  reward?: number;
  timeRemaining?: number;
}

export class CommunicationInterface {
  private orchestrator: UniverseOrchestrator;
  private messageHistory: CommunicationMessage[] = [];
  private activeDistressCalls: Map<string, DistressCall> = new Map();
  private playerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private playerSystemId: string = '';
  private playerShipId: string = 'player_ship';
  private messageIdCounter = 0;

  constructor(orchestrator: UniverseOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Update player state for communication
   */
  public updatePlayerState(position: Vector3, systemId: string): void {
    this.playerPosition = position;
    this.playerSystemId = systemId;
  }

  /**
   * Hail a station
   */
  public hailStation(station: SpaceStation): HailResponse {
    const distance = this.calculateDistance(this.playerPosition, station.position);
    const maxRange = 100000; // 100km

    if (distance > maxRange) {
      return {
        success: false,
        entityId: station.id,
        entityName: station.name,
        message: `Out of communication range. Distance: ${(distance / 1000).toFixed(1)}km (max: ${maxRange / 1000}km)`,
        tone: 'NEUTRAL'
      };
    }

    // Generate response based on station type and faction
    const greeting = this.generateStationGreeting(station);

    // Create message
    const message = this.createMessage({
      senderId: station.id,
      senderName: station.name,
      senderType: 'STATION',
      receiverId: this.playerShipId,
      type: 'HAIL_RESPONSE',
      subject: `Response from ${station.name}`,
      content: greeting.message,
      tone: greeting.tone,
      location: station.position,
      systemId: this.playerSystemId,
      requiresResponse: false
    });

    return {
      success: true,
      entityId: station.id,
      entityName: station.name,
      message: greeting.message,
      tone: greeting.tone,
      options: [
        {
          id: 'request_docking',
          text: 'Request docking permission',
          consequence: 'Initiates docking sequence'
        },
        {
          id: 'ask_services',
          text: 'What services do you offer?',
          consequence: 'Shows available station services'
        },
        {
          id: 'ask_news',
          text: 'Any news from around the system?',
          consequence: 'Shares local news and rumors'
        },
        {
          id: 'close',
          text: 'Close channel',
          consequence: 'Ends communication'
        }
      ]
    };
  }

  /**
   * Hail an NPC ship
   */
  public hailNPC(npcId: string, npcName: string, npcPosition: Vector3, npcFaction: string): HailResponse {
    const distance = this.calculateDistance(this.playerPosition, npcPosition);
    const maxRange = 50000; // 50km for ships

    if (distance > maxRange) {
      return {
        success: false,
        entityId: npcId,
        entityName: npcName,
        message: `Out of communication range. Distance: ${(distance / 1000).toFixed(1)}km`,
        tone: 'NEUTRAL'
      };
    }

    // Get NPC personality and state
    const aiSystems = this.orchestrator.getEntityAI(npcId);
    const greeting = this.generateNPCGreeting(npcId, npcName, npcFaction, aiSystems);

    const message = this.createMessage({
      senderId: npcId,
      senderName: npcName,
      senderType: 'SHIP',
      receiverId: this.playerShipId,
      type: 'HAIL_RESPONSE',
      subject: `Response from ${npcName}`,
      content: greeting.message,
      tone: greeting.tone,
      location: npcPosition,
      systemId: this.playerSystemId,
      requiresResponse: false
    });

    return {
      success: true,
      entityId: npcId,
      entityName: npcName,
      message: greeting.message,
      tone: greeting.tone,
      options: greeting.options
    };
  }

  /**
   * Send message to entity
   */
  public sendMessage(recipientId: string, content: string): boolean {
    // Would send message to NPC/station
    // NPC AI would process and potentially respond

    const message = this.createMessage({
      senderId: this.playerShipId,
      senderName: 'Player',
      senderType: 'SHIP',
      receiverId: recipientId,
      type: 'NPC_CHAT',
      subject: 'Message',
      content: content,
      tone: 'NEUTRAL',
      location: this.playerPosition,
      systemId: this.playerSystemId,
      requiresResponse: false
    });

    return true;
  }

  /**
   * Respond to message
   */
  public respondToMessage(messageId: string, optionId: string): {
    success: boolean;
    consequence: string;
    followUpMessage?: CommunicationMessage;
  } {
    const message = this.messageHistory.find(m => m.id === messageId);

    if (!message || !message.responseOptions) {
      return {
        success: false,
        consequence: 'Message not found or no response options'
      };
    }

    const option = message.responseOptions.find(o => o.id === optionId);

    if (!option) {
      return {
        success: false,
        consequence: 'Invalid response option'
      };
    }

    message.responded = true;

    // Apply consequences
    if (option.reputationChange) {
      // Would apply reputation changes
    }

    return {
      success: true,
      consequence: option.consequence
    };
  }

  /**
   * Get unread messages
   */
  public getUnreadMessages(): CommunicationMessage[] {
    return this.messageHistory.filter(m => !m.read && m.receiverId === this.playerShipId);
  }

  /**
   * Get all messages
   */
  public getAllMessages(limit: number = 50): CommunicationMessage[] {
    return this.messageHistory
      .filter(m => m.receiverId === this.playerShipId)
      .slice(-limit);
  }

  /**
   * Mark message as read
   */
  public markAsRead(messageId: string): void {
    const message = this.messageHistory.find(m => m.id === messageId);
    if (message) {
      message.read = true;
    }
  }

  /**
   * Broadcast distress call
   */
  public broadcastDistress(emergencyType: DistressCall['emergencyType'], message: string): void {
    const distress: DistressCall = {
      id: `distress_${Date.now()}`,
      timestamp: Date.now() / 1000,
      senderId: this.playerShipId,
      senderName: 'Player Ship',
      position: this.playerPosition,
      systemId: this.playerSystemId,
      emergencyType,
      message
    };

    // Record event
    this.orchestrator.recordEvent({
      id: distress.id,
      timestamp: distress.timestamp,
      type: 'DISTRESS_CALL' as any,
      category: 'EMERGENCY' as any,
      severity: 8,
      location: this.playerPosition,
      systemId: this.playerSystemId,
      participants: [this.playerShipId],
      description: `Distress call: ${emergencyType} - ${message}`,
      data: { emergencyType, message },
      consequences: [],
      witnessed: true,
      priority: 10,
      tags: ['distress', 'emergency']
    });

    console.log(`[COMMS] Broadcasting distress: ${emergencyType}`);
  }

  /**
   * Get nearby distress calls
   */
  public getNearbyDistressCalls(maxDistance: number = 500000): DistressCall[] {
    const nearby: DistressCall[] = [];

    for (const call of this.activeDistressCalls.values()) {
      if (call.systemId === this.playerSystemId) {
        const distance = this.calculateDistance(this.playerPosition, call.position);
        if (distance < maxDistance) {
          nearby.push(call);
        }
      }
    }

    return nearby.sort((a, b) => {
      const distA = this.calculateDistance(this.playerPosition, a.position);
      const distB = this.calculateDistance(this.playerPosition, b.position);
      return distA - distB;
    });
  }

  /**
   * Listen for system broadcasts
   */
  public getSystemBroadcasts(): CommunicationMessage[] {
    // Get faction broadcasts, news, etc. for current system
    const broadcasts: CommunicationMessage[] = [];

    // News broadcasts
    const news = this.orchestrator.getRecentNews(5);
    for (const article of news) {
      if (article.systemId === this.playerSystemId) {
        broadcasts.push(this.createMessage({
          senderId: 'news_network',
          senderName: 'Galactic News Network',
          senderType: 'SYSTEM',
          receiverId: this.playerShipId,
          type: 'NEWS_BROADCAST',
          subject: article.headline,
          content: article.content,
          tone: 'NEUTRAL',
          location: this.playerPosition,
          systemId: this.playerSystemId,
          requiresResponse: false
        }));
      }
    }

    return broadcasts;
  }

  /**
   * Get communication range status
   */
  public getCommRangeStatus(): {
    stationsInRange: Array<{ id: string; name: string; distance: number }>;
    shipsInRange: Array<{ id: string; name: string; distance: number }>;
    broadcastsAvailable: number;
  } {
    // Would scan for entities in communication range
    return {
      stationsInRange: [],
      shipsInRange: [],
      broadcastsAvailable: this.getSystemBroadcasts().length
    };
  }

  // Private methods
  private createMessage(params: {
    senderId: string;
    senderName: string;
    senderType: CommunicationMessage['senderType'];
    receiverId: string;
    type: MessageType;
    subject: string;
    content: string;
    tone: CommunicationMessage['tone'];
    location: Vector3;
    systemId: string;
    requiresResponse: boolean;
    responseOptions?: CommunicationOption[];
  }): CommunicationMessage {
    const message: CommunicationMessage = {
      id: `msg_${this.messageIdCounter++}`,
      timestamp: Date.now() / 1000,
      senderId: params.senderId,
      senderName: params.senderName,
      senderType: params.senderType,
      receiverId: params.receiverId,
      type: params.type,
      subject: params.subject,
      content: params.content,
      tone: params.tone,
      location: params.location,
      systemId: params.systemId,
      requiresResponse: params.requiresResponse,
      responseOptions: params.responseOptions,
      read: false,
      responded: false,
      archived: false
    };

    this.messageHistory.push(message);
    return message;
  }

  private generateStationGreeting(station: SpaceStation): {
    message: string;
    tone: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE' | 'URGENT';
  } {
    const greetings = [
      `${station.name} here. How can we assist you today?`,
      `Welcome to ${station.name}. State your business.`,
      `This is ${station.name} traffic control. Go ahead.`,
      `${station.name} receiving. What do you need?`
    ];

    const message = greetings[Math.floor(Math.random() * greetings.length)];

    let tone: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE' | 'URGENT' = 'NEUTRAL';

    if (station.stationType === 'TRADING') {
      tone = 'FRIENDLY';
    } else if (station.stationType === 'MILITARY') {
      tone = 'NEUTRAL';
    }

    return { message, tone };
  }

  private generateNPCGreeting(
    npcId: string,
    npcName: string,
    npcFaction: string,
    aiSystems: any
  ): {
    message: string;
    tone: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE' | 'URGENT';
    options?: CommunicationOption[];
  } {
    let message = `This is ${npcName}. What do you want?`;
    let tone: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE' | 'URGENT' = 'NEUTRAL';
    const options: CommunicationOption[] = [];

    if (aiSystems) {
      const personality = aiSystems.memory.getCurrentPersonality();

      if (personality.aggression > 0.7) {
        message = `You're in the wrong place, friend. Turn around.`;
        tone = 'HOSTILE';
        options.push({
          id: 'back_off',
          text: 'Sorry, leaving now',
          consequence: 'NPC lets you go'
        });
        options.push({
          id: 'stand_ground',
          text: 'This is free space, I go where I want',
          consequence: 'NPC becomes hostile',
          reputationChange: new Map([[npcFaction, -10]])
        });
      } else if (personality.sociability > 0.6) {
        message = `Hey there! Nice to see another ship out here. Need anything?`;
        tone = 'FRIENDLY';
        options.push({
          id: 'ask_trade',
          text: 'Got anything to trade?',
          consequence: 'Shows trade options'
        });
        options.push({
          id: 'ask_info',
          text: 'Know anything interesting nearby?',
          consequence: 'Shares rumors and info'
        });
      }
    }

    options.push({
      id: 'close',
      text: 'Nevermind, safe travels',
      consequence: 'Ends communication'
    });

    return { message, tone, options };
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
