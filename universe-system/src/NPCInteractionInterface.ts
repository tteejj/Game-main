/**
 * NPCInteractionInterface - Menu-driven system for player-NPC interactions
 */

import { Vector3 } from './CelestialBody';

export type InteractionOption =
  | 'HAIL'
  | 'REQUEST_TRADE'
  | 'REQUEST_ASSISTANCE'
  | 'THREATEN'
  | 'SCAN_CARGO'
  | 'REQUEST_DOCK'
  | 'ASK_INFORMATION'
  | 'OFFER_ESCORT'
  | 'END_CONVERSATION';

export interface NPCShipContact {
  id: string;
  name: string;
  type: string; // 'TRADER', 'PIRATE', 'PATROL', etc.
  faction: string;
  position: Vector3;
  distance: number;
  hostile: boolean;

  // Status
  hull: number;
  shields?: number;
  cargoValue?: number;

  // Relationship
  reputation?: number; // -100 to 100
}

export interface InteractionResponse {
  success: boolean;
  message: string;
  npcResponse?: string;
  options?: InteractionOption[];
  consequences?: {
    reputationChange?: number;
    creditsTransfer?: number;
    hostilityChange?: boolean;
  };
}

export interface HailResult {
  success: boolean;
  npc: NPCShipContact;
  response: string;
  availableOptions: InteractionOption[];
}

export class NPCInteractionInterface {
  private activeConversations: Map<string, {
    npcId: string;
    history: string[];
    startedAt: number;
  }> = new Map();

  /**
   * Hail a nearby NPC ship
   */
  public hailNPC(npc: NPCShipContact, playerReputation: number): HailResult {
    // Generate response based on NPC type and relationship
    const response = this.generateHailResponse(npc, playerReputation);
    const options = this.getAvailableOptions(npc, playerReputation);

    // Track conversation
    this.activeConversations.set(npc.id, {
      npcId: npc.id,
      history: [response],
      startedAt: Date.now()
    });

    return {
      success: true,
      npc,
      response,
      availableOptions: options
    };
  }

  /**
   * Perform an interaction with an NPC
   */
  public interact(
    npc: NPCShipContact,
    option: InteractionOption,
    playerState: {
      credits: number;
      cargo: Map<string, number>;
      reputation: number;
    }
  ): InteractionResponse {
    switch (option) {
      case 'REQUEST_TRADE':
        return this.handleRequestTrade(npc, playerState);

      case 'REQUEST_ASSISTANCE':
        return this.handleRequestAssistance(npc, playerState);

      case 'THREATEN':
        return this.handleThreaten(npc, playerState);

      case 'SCAN_CARGO':
        return this.handleScanCargo(npc, playerState);

      case 'ASK_INFORMATION':
        return this.handleAskInformation(npc, playerState);

      case 'OFFER_ESCORT':
        return this.handleOfferEscort(npc, playerState);

      case 'END_CONVERSATION':
        return this.handleEndConversation(npc);

      default:
        return {
          success: false,
          message: 'Invalid interaction option'
        };
    }
  }

  /**
   * End conversation with NPC
   */
  public endConversation(npcId: string): void {
    this.activeConversations.delete(npcId);
  }

  // Private helper methods

  private generateHailResponse(npc: NPCShipContact, playerReputation: number): string {
    // Generate contextual response based on NPC type and reputation
    const rep = playerReputation || 0;

    if (npc.type === 'PIRATE') {
      if (rep < -50) {
        return `${npc.name}: "Well, well. Look who it is. You've got a lot of nerve hailing us."`;
      } else if (rep > 50) {
        return `${npc.name}: "Ah, a fellow entrepreneur. What do you want?"`;
      } else {
        return `${npc.name}: "State your business, quickly."`;
      }
    }

    if (npc.type === 'TRADER') {
      if (rep > 50) {
        return `${npc.name}: "Greetings, friend! Good to hear from you. What can I do for you?"`;
      } else if (rep < -50) {
        return `${npc.name}: "I don't conduct business with your kind. Move along."`;
      } else {
        return `${npc.name}: "This is ${npc.name}. How can I help you?"`;
      }
    }

    if (npc.type === 'PATROL') {
      if (rep < -50) {
        return `${npc.name}: "This is ${npc.faction} patrol. Power down your weapons and prepare for inspection."`;
      } else if (rep > 50) {
        return `${npc.name}: "${npc.faction} patrol here. Everything alright out there?"`;
      } else {
        return `${npc.name}: "${npc.faction} patrol. State your business in this sector."`;
      }
    }

    if (npc.type === 'PASSENGER') {
      return `${npc.name}: "Civilian transport. We're just passing through."`;
    }

    // Default response
    return `${npc.name}: "This is ${npc.name}. What do you need?"`;
  }

  private getAvailableOptions(npc: NPCShipContact, playerReputation: number): InteractionOption[] {
    const options: InteractionOption[] = [];

    // Trade option for traders and some others
    if (npc.type === 'TRADER' || npc.type === 'MINER') {
      options.push('REQUEST_TRADE');
    }

    // Request assistance (repairs, fuel)
    if (!npc.hostile && playerReputation > -50) {
      options.push('REQUEST_ASSISTANCE');
    }

    // Scan cargo (hostile action if not authority)
    options.push('SCAN_CARGO');

    // Information
    if (!npc.hostile) {
      options.push('ASK_INFORMATION');
    }

    // Threaten (hostile action)
    if (npc.type !== 'PATROL') {
      options.push('THREATEN');
    }

    // Escort offer for civilians
    if (npc.type === 'TRADER' || npc.type === 'PASSENGER') {
      options.push('OFFER_ESCORT');
    }

    // Always allow ending conversation
    options.push('END_CONVERSATION');

    return options;
  }

  private handleRequestTrade(npc: NPCShipContact, playerState: any): InteractionResponse {
    if (npc.type !== 'TRADER' && npc.type !== 'MINER') {
      return {
        success: false,
        message: `${npc.name}: "I'm not a trader. Try docking at a station."`,
        options: this.getAvailableOptions(npc, playerState.reputation)
      };
    }

    // Simple trade scenario
    const tradeSuccess = Math.random() > 0.3; // 70% success rate

    if (tradeSuccess) {
      return {
        success: true,
        message: `${npc.name}: "Sure, I've got some goods to move. Let's talk business."`,
        npcResponse: 'Trade menu would open here. (Not yet implemented)',
        options: this.getAvailableOptions(npc, playerState.reputation)
      };
    } else {
      return {
        success: false,
        message: `${npc.name}: "Sorry, I've got nothing you'd want right now."`,
        options: this.getAvailableOptions(npc, playerState.reputation)
      };
    }
  }

  private handleRequestAssistance(npc: NPCShipContact, playerState: any): InteractionResponse {
    if (npc.hostile) {
      return {
        success: false,
        message: `${npc.name}: "You must be joking."`,
        options: []
      };
    }

    const reputation = playerState.reputation || 0;

    if (reputation < -20) {
      return {
        success: false,
        message: `${npc.name}: "I don't help criminals. You're on your own."`,
        options: this.getAvailableOptions(npc, reputation)
      };
    }

    // Assistance costs credits
    const cost = 1000;

    if (playerState.credits < cost) {
      return {
        success: false,
        message: `${npc.name}: "I'd help, but it'll cost ${cost} credits. Looks like you can't afford it."`,
        options: this.getAvailableOptions(npc, reputation)
      };
    }

    return {
      success: true,
      message: `${npc.name}: "Alright, I can spare some fuel and supplies. That'll be ${cost} credits."`,
      npcResponse: 'Received fuel and repair nanites.',
      consequences: {
        creditsTransfer: -cost,
        reputationChange: 5
      },
      options: this.getAvailableOptions(npc, reputation)
    };
  }

  private handleThreaten(npc: NPCShipContact, playerState: any): InteractionResponse {
    const npcBoldness = Math.random(); // Would come from NPC personality

    if (npcBoldness > 0.6 || npc.type === 'PATROL' || npc.type === 'MILITARY') {
      return {
        success: false,
        message: `${npc.name}: "Big mistake, friend. You just made yourself an enemy."`,
        npcResponse: 'The NPC targets you and prepares to attack!',
        consequences: {
          hostilityChange: true,
          reputationChange: -20
        },
        options: []
      };
    }

    // NPC submits
    return {
      success: true,
      message: `${npc.name}: "Okay, okay! Take it easy. I'll drop some cargo and get out of here."`,
      npcResponse: 'The NPC jettisons cargo and flees.',
      consequences: {
        reputationChange: -15
      },
      options: ['END_CONVERSATION']
    };
  }

  private handleScanCargo(npc: NPCShipContact, playerState: any): InteractionResponse {
    if (npc.type === 'PATROL') {
      return {
        success: true,
        message: `${npc.name}: "Scan away. We've got nothing to hide."`,
        npcResponse: `Cargo scan: ${npc.cargoValue || 0} credits worth of legal goods.`,
        options: this.getAvailableOptions(npc, playerState.reputation)
      };
    }

    // Most NPCs don't like being scanned
    const allowScan = Math.random() > 0.7;

    if (allowScan) {
      return {
        success: true,
        message: `${npc.name}: "Fine, but make it quick."`,
        npcResponse: `Cargo detected: ${npc.cargoValue || 'minimal'} value. Contents: ${this.generateRandomCargo()}`,
        consequences: {
          reputationChange: -5
        },
        options: this.getAvailableOptions(npc, playerState.reputation)
      };
    }

    return {
      success: false,
      message: `${npc.name}: "That's private. Back off before this gets ugly."`,
      consequences: {
        reputationChange: -10
      },
      options: this.getAvailableOptions(npc, playerState.reputation)
    };
  }

  private handleAskInformation(npc: NPCShipContact, playerState: any): InteractionResponse {
    const infoTopics = [
      `${npc.name}: "I heard there's a good trade route between here and the ${this.randomSystemName()} system."`,
      `${npc.name}: "Watch yourself in the ${this.randomSystemName()} sector. Pirates have been active there."`,
      `${npc.name}: "The ${npc.faction} and another faction have been at each other's throats lately. Could mean opportunities for the right pilot."`,
      `${npc.name}: "Stations are paying top dollar for medical supplies right now. Supply shortage."`,
      `${npc.name}: "I don't know much. I just fly my route and mind my business."`
    ];

    const info = infoTopics[Math.floor(Math.random() * infoTopics.length)];

    return {
      success: true,
      message: info,
      consequences: {
        reputationChange: 2
      },
      options: this.getAvailableOptions(npc, playerState.reputation)
    };
  }

  private handleOfferEscort(npc: NPCShipContact, playerState: any): InteractionResponse {
    if (npc.type !== 'TRADER' && npc.type !== 'PASSENGER') {
      return {
        success: false,
        message: `${npc.name}: "I don't need an escort."`,
        options: this.getAvailableOptions(npc, playerState.reputation)
      };
    }

    const acceptsEscort = Math.random() > 0.5;

    if (acceptsEscort) {
      return {
        success: true,
        message: `${npc.name}: "Actually, that would be helpful. I'll pay you 2000 credits to escort me to my destination."`,
        npcResponse: 'Escort mission offered (Not yet implemented)',
        options: this.getAvailableOptions(npc, playerState.reputation)
      };
    }

    return {
      success: false,
      message: `${npc.name}: "Thanks for the offer, but I'll manage on my own."`,
      options: this.getAvailableOptions(npc, playerState.reputation)
    };
  }

  private handleEndConversation(npc: NPCShipContact): InteractionResponse {
    this.endConversation(npc.id);

    return {
      success: true,
      message: `${npc.name}: "Safe travels."`,
      options: []
    };
  }

  // Utility methods

  private generateRandomCargo(): string {
    const cargos = [
      'Food supplies',
      'Medical equipment',
      'Electronics',
      'Raw minerals',
      'Consumer goods',
      'Industrial parts',
      'Luxury items'
    ];

    return cargos[Math.floor(Math.random() * cargos.length)];
  }

  private randomSystemName(): string {
    const names = ['Alpha Centauri', 'Sol', 'Betelgeuse', 'Sirius', 'Vega', 'Altair'];
    return names[Math.floor(Math.random() * names.length)];
  }
}
