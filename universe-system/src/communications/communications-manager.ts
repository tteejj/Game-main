/**
 * communications-manager.ts
 * Central communications management system
 *
 * Implements:
 * - Message queue with priority
 * - Message routing through relay network
 * - Procedural message generation
 * - Traffic chatter simulation
 */

import { RelayNetwork, NetworkNode, MessageRoute } from './relay-network';

/**
 * Message priority levels
 */
export enum MessagePriority {
  EMERGENCY = 0, // Distress calls, critical alerts
  HIGH = 1, // Docking requests, official traffic
  NORMAL = 2, // Standard communications
  LOW = 3 // Background chatter, non-urgent
}

/**
 * Message types
 */
export enum MessageType {
  DISTRESS = 'DISTRESS',
  DOCKING_REQUEST = 'DOCKING_REQUEST',
  DOCKING_CLEARANCE = 'DOCKING_CLEARANCE',
  TRAFFIC_REPORT = 'TRAFFIC_REPORT',
  WEATHER_ALERT = 'WEATHER_ALERT',
  NAVIGATION_WARNING = 'NAVIGATION_WARNING',
  CARGO_MANIFEST = 'CARGO_MANIFEST',
  PASSENGER_UPDATE = 'PASSENGER_UPDATE',
  MINING_REPORT = 'MINING_REPORT',
  PATROL_STATUS = 'PATROL_STATUS',
  NEWS_BROADCAST = 'NEWS_BROADCAST',
  CHATTER = 'CHATTER'
}

/**
 * Communication message
 */
export interface Message {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: number;
  route?: MessageRoute;
  delivered: boolean;
  retries: number;
}

/**
 * Message template for generation
 */
interface MessageTemplate {
  type: MessageType;
  templates: string[];
  priority: MessagePriority;
}

/**
 * Communications Manager
 *
 * Manages all communications in the star system
 */
export class CommunicationsManager {
  private network: RelayNetwork;
  private messages: Message[] = [];
  private messageQueue: Message[] = [];
  private messageIdCounter: number = 0;
  private systemTime: number = 0;

  // Message generation
  private messageGenerationRate: number = 0.1; // Messages per second
  private timeSinceLastMessage: number = 0;

  // Statistics
  private stats = {
    totalMessagesSent: 0,
    totalMessagesDelivered: 0,
    totalMessagesFailed: 0,
    avgDeliveryTime: 0
  };

  constructor(network: RelayNetwork) {
    this.network = network;
  }

  /**
   * Send message from sender to receiver
   */
  public sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'delivered' | 'retries' | 'route'>): Message {
    const fullMessage: Message = {
      ...message,
      id: `msg-${this.messageIdCounter++}`,
      timestamp: this.systemTime,
      delivered: false,
      retries: 0
    };

    // Find route
    const route = this.network.findRoute(message.senderId, message.receiverId);

    if (route && route.success) {
      fullMessage.route = route;
      this.messageQueue.push(fullMessage);
      this.stats.totalMessagesSent++;

      // Add congestion to links in route
      if (route.path.length > 1) {
        for (let i = 0; i < route.path.length - 1; i++) {
          this.network.addCongestion(route.path[i], route.path[i + 1], 0.05);
        }
      }
    } else {
      // Message failed - no route
      fullMessage.delivered = false;
      this.stats.totalMessagesFailed++;
    }

    this.messages.push(fullMessage);
    return fullMessage;
  }

  /**
   * Process message queue
   */
  private processMessageQueue(dt: number): void {
    const deliveredMessages: number[] = [];

    for (let i = 0; i < this.messageQueue.length; i++) {
      const message = this.messageQueue[i];

      if (!message.route) continue;

      // Check if message has been in transit long enough
      const transitTime = (this.systemTime - message.timestamp) * 1000; // Convert to ms

      if (transitTime >= message.route.totalLatencyMs) {
        // Message delivered!
        message.delivered = true;
        this.stats.totalMessagesDelivered++;

        // Update average delivery time
        const deliveryTime = transitTime;
        this.stats.avgDeliveryTime =
          (this.stats.avgDeliveryTime * (this.stats.totalMessagesDelivered - 1) + deliveryTime) /
          this.stats.totalMessagesDelivered;

        deliveredMessages.push(i);
      }
    }

    // Remove delivered messages from queue (in reverse order to maintain indices)
    for (let i = deliveredMessages.length - 1; i >= 0; i--) {
      this.messageQueue.splice(deliveredMessages[i], 1);
    }
  }

  /**
   * Generate procedural message
   */
  public generateMessage(senderId: string, senderName: string, type?: MessageType): Message | null {
    const nodes = this.network.getNodes();
    if (nodes.length < 2) return null;

    // Find sender node
    const sender = nodes.find(n => n.id === senderId);
    if (!sender) return null;

    // Pick random receiver
    const receivers = nodes.filter(n => n.id !== senderId);
    if (receivers.length === 0) return null;

    const receiver = receivers[Math.floor(Math.random() * receivers.length)];

    // Generate message content
    const messageType = type || this.pickRandomMessageType();
    const content = this.generateMessageContent(messageType, senderName, receiver.id);
    const priority = this.getPriorityForType(messageType);

    return this.sendMessage({
      type: messageType,
      priority,
      senderId,
      senderName,
      receiverId: receiver.id,
      receiverName: receiver.id,
      content
    });
  }

  /**
   * Pick random message type based on probabilities
   */
  private pickRandomMessageType(): MessageType {
    const roll = Math.random();

    if (roll < 0.01) return MessageType.DISTRESS;
    if (roll < 0.05) return MessageType.DOCKING_REQUEST;
    if (roll < 0.1) return MessageType.DOCKING_CLEARANCE;
    if (roll < 0.2) return MessageType.TRAFFIC_REPORT;
    if (roll < 0.25) return MessageType.WEATHER_ALERT;
    if (roll < 0.3) return MessageType.NAVIGATION_WARNING;
    if (roll < 0.4) return MessageType.CARGO_MANIFEST;
    if (roll < 0.5) return MessageType.PASSENGER_UPDATE;
    if (roll < 0.6) return MessageType.MINING_REPORT;
    if (roll < 0.7) return MessageType.PATROL_STATUS;
    if (roll < 0.8) return MessageType.NEWS_BROADCAST;
    return MessageType.CHATTER;
  }

  /**
   * Generate message content based on type
   */
  private generateMessageContent(type: MessageType, senderName: string, receiverId: string): string {
    const templates: Record<MessageType, string[]> = {
      [MessageType.DISTRESS]: [
        `MAYDAY MAYDAY MAYDAY! ${senderName} experiencing critical systems failure!`,
        `${senderName} to all stations: Hull breach detected, requesting immediate assistance!`,
        `Emergency! ${senderName} life support failing, need rescue NOW!`,
        `${senderName} declaring emergency - reactor overload imminent!`
      ],
      [MessageType.DOCKING_REQUEST]: [
        `${senderName} requesting priority docking clearance`,
        `${receiverId}, this is ${senderName} requesting approach vector`,
        `${senderName} to ${receiverId}: Permission to dock?`,
        `${senderName} inbound, requesting docking bay assignment`
      ],
      [MessageType.DOCKING_CLEARANCE]: [
        `${senderName} cleared for docking, bay ${Math.floor(Math.random() * 10) + 1}`,
        `${receiverId}, you are clear for final approach`,
        `Docking clearance granted, proceed to nav beacon delta`,
        `${receiverId}, you have the green light for docking`
      ],
      [MessageType.TRAFFIC_REPORT]: [
        `${senderName} traffic control: Heavy congestion in sector ${Math.floor(Math.random() * 10)}`,
        `Traffic update from ${senderName}: All lanes clear, proceed as filed`,
        `${senderName}: Caution, multiple vessels in holding pattern`,
        `Traffic advisory: Recommend alternate route via waypoint ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
      ],
      [MessageType.WEATHER_ALERT]: [
        `${senderName} weather service: Solar flare activity elevated`,
        `Space weather alert: Particle storm approaching, take precautions`,
        `${senderName}: Radiation levels nominal, all clear`,
        `Meteorological update: Debris field detected in sector 7`
      ],
      [MessageType.NAVIGATION_WARNING]: [
        `NOTICE TO SPACERS: Hazard beacon ${Math.floor(Math.random() * 100)} offline for maintenance`,
        `${senderName} nav warning: Uncharted asteroid detected`,
        `Navigation alert: Jump point ${Math.floor(Math.random() * 5)} experiencing instability`,
        `${senderName}: Caution, derelict vessel drifting in shipping lane`
      ],
      [MessageType.CARGO_MANIFEST]: [
        `${senderName} transmitting cargo manifest: ${Math.floor(Math.random() * 500)}t general freight`,
        `Cargo update from ${senderName}: Perishables onboard, requesting expedited processing`,
        `${senderName}: Carrying high-value cargo, requesting security escort`,
        `Manifest transmission: ${Math.floor(Math.random() * 1000)}t ore, destination ${receiverId}`
      ],
      [MessageType.PASSENGER_UPDATE]: [
        `${senderName} passenger liner: ${Math.floor(Math.random() * 500)} souls onboard`,
        `${senderName} to ${receiverId}: Passenger transfer scheduled for ${Math.floor(Math.random() * 24)}:00 hours`,
        `Passenger manifest: VIP onboard, requesting priority handling`,
        `${senderName}: All passengers accounted for, proceeding on schedule`
      ],
      [MessageType.MINING_REPORT]: [
        `${senderName} reporting high-grade ore strike in sector ${Math.floor(Math.random() * 20)}`,
        `Mining update: ${Math.floor(Math.random() * 100)}t platinum extracted`,
        `${senderName}: Claim filed on asteroid ${Math.floor(Math.random() * 1000)}`,
        `Prospecting report: Rich metallic signatures detected`
      ],
      [MessageType.PATROL_STATUS]: [
        `${senderName} patrol: Sector ${Math.floor(Math.random() * 10)} secure`,
        `Security status from ${senderName}: All quiet, continuing patrol route`,
        `${senderName} to command: Suspicious contact identified, investigating`,
        `Patrol report: Routine inspection completed, all vessels compliant`
      ],
      [MessageType.NEWS_BROADCAST]: [
        `Breaking news: Trade agreement signed with neighboring system`,
        `System news: Station expansion project ahead of schedule`,
        `Economic report: Ore prices up ${Math.floor(Math.random() * 20)}% this quarter`,
        `Headlines: New colony ship arrives, population growth expected`
      ],
      [MessageType.CHATTER]: [
        `${senderName}: Beautiful view of the planet from here`,
        `Anyone else seeing those lights near the third moon?`,
        `${senderName} to ${receiverId}: Coffee's on me when you dock`,
        `Just another day in the black...`,
        `${senderName}: Running a bit behind schedule, as usual`,
        `This is the longest cargo run I've done in months`,
        `${senderName}: Sensors acting up again, need to get that checked`
      ]
    };

    const typeTemplates = templates[type] || templates[MessageType.CHATTER];
    return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
  }

  /**
   * Get priority for message type
   */
  private getPriorityForType(type: MessageType): MessagePriority {
    switch (type) {
      case MessageType.DISTRESS:
        return MessagePriority.EMERGENCY;
      case MessageType.DOCKING_REQUEST:
      case MessageType.DOCKING_CLEARANCE:
      case MessageType.WEATHER_ALERT:
      case MessageType.NAVIGATION_WARNING:
        return MessagePriority.HIGH;
      case MessageType.TRAFFIC_REPORT:
      case MessageType.CARGO_MANIFEST:
      case MessageType.PASSENGER_UPDATE:
      case MessageType.PATROL_STATUS:
        return MessagePriority.NORMAL;
      default:
        return MessagePriority.LOW;
    }
  }

  /**
   * Update communications system
   */
  public update(dt: number): void {
    this.systemTime += dt;

    // Update network
    this.network.update(dt);

    // Process message queue
    this.processMessageQueue(dt);

    // Generate random messages
    this.timeSinceLastMessage += dt;
    if (this.timeSinceLastMessage >= 1 / this.messageGenerationRate) {
      this.generateRandomMessage();
      this.timeSinceLastMessage = 0;
    }
  }

  /**
   * Generate random message from random node
   */
  private generateRandomMessage(): void {
    const nodes = this.network.getNodes();
    if (nodes.length < 2) return;

    const sender = nodes[Math.floor(Math.random() * nodes.length)];
    this.generateMessage(sender.id, sender.id);
  }

  /**
   * Get recent messages (last N)
   */
  public getRecentMessages(count: number = 10): Message[] {
    return this.messages.slice(-count);
  }

  /**
   * Get messages for specific receiver
   */
  public getMessagesFor(receiverId: string): Message[] {
    return this.messages.filter(m => m.receiverId === receiverId && m.delivered);
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalMessagesSent: number;
    totalMessagesDelivered: number;
    totalMessagesFailed: number;
    deliveryRate: number;
    avgDeliveryTimeMs: number;
    messagesInQueue: number;
  } {
    const deliveryRate =
      this.stats.totalMessagesSent > 0 ? this.stats.totalMessagesDelivered / this.stats.totalMessagesSent : 0;

    return {
      ...this.stats,
      deliveryRate,
      avgDeliveryTimeMs: this.stats.avgDeliveryTime,
      messagesInQueue: this.messageQueue.length
    };
  }

  /**
   * Set message generation rate
   */
  public setMessageGenerationRate(messagesPerSecond: number): void {
    this.messageGenerationRate = Math.max(0, messagesPerSecond);
  }

  /**
   * Clear all messages
   */
  public clearMessages(): void {
    this.messages = [];
    this.messageQueue = [];
  }

  /**
   * Get all messages
   */
  public getAllMessages(): Message[] {
    return this.messages;
  }
}
