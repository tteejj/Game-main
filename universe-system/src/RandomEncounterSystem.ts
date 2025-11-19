/**
 * RandomEncounterSystem - Dynamic encounters while traveling
 * Pirates, traders, distress calls, anomalies, patrols, derelicts
 */

import { Vector3 } from './CelestialBody';
import { UniverseOrchestrator } from './UniverseOrchestrator';
import { StarSystem } from './StarSystem';

export type EncounterType =
  | 'PIRATE_AMBUSH'
  | 'MERCHANT_CONVOY'
  | 'DISTRESS_CALL'
  | 'PATROL'
  | 'DERELICT_SHIP'
  | 'ANOMALY'
  | 'SMUGGLER'
  | 'BOUNTY_HUNTER'
  | 'REFUGEE_SHIP'
  | 'SCIENTIFIC_EXPEDITION';

export interface Encounter {
  id: string;
  type: EncounterType;
  timestamp: number;

  // Location
  position: Vector3;
  systemId: string;
  systemName: string;

  // Description
  title: string;
  description: string;
  initialMessage: string;

  // Entities
  ships: EncounterShip[];

  // Interaction
  options: EncounterOption[];
  completed: boolean;
  outcome?: string;

  // Rewards/Consequences
  potentialRewards: {
    credits?: number;
    reputation?: Map<string, number>;
    cargo?: Map<string, number>;
    salvage?: string[];
  };

  // Danger
  threatLevel: number; // 0-10
  hostileByDefault: boolean;
}

export interface EncounterShip {
  id: string;
  name: string;
  type: string; // FIGHTER, FREIGHTER, etc.
  faction: string;
  hostile: boolean;
  hull: number;
  shields: number;
  position: Vector3;
  velocity: Vector3;
  cargo?: Map<string, number>;
}

export interface EncounterOption {
  id: string;
  text: string;
  consequence: string;
  requirements?: {
    minReputation?: Map<string, number>;
    minCredits?: number;
    minCombatRating?: number;
  };
  outcomes: {
    success: number; // Probability 0-1
    onSuccess: string;
    onFailure: string;
    rewards?: any;
    consequences?: any;
  };
}

export class RandomEncounterSystem {
  private orchestrator: UniverseOrchestrator;
  private activeEncounters: Map<string, Encounter> = new Map();
  private encounterHistory: Encounter[] = [];
  private encounterIdCounter = 0;

  // Probabilities (per second in space)
  private readonly BASE_ENCOUNTER_RATE = 0.0001; // 0.01% per second
  private encounterCooldown = 0;
  private readonly MIN_COOLDOWN = 300; // 5 minutes between encounters

  constructor(orchestrator: UniverseOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Update encounter system
   */
  public update(
    deltaTime: number,
    playerPosition: Vector3,
    playerSystem: StarSystem,
    playerVelocity: Vector3
  ): Encounter | null {
    this.encounterCooldown = Math.max(0, this.encounterCooldown - deltaTime);

    // Check for new encounter
    if (this.encounterCooldown <= 0) {
      const encounterRoll = Math.random();
      const encounterChance = this.calculateEncounterChance(playerSystem, playerVelocity);

      if (encounterRoll < encounterChance * deltaTime) {
        return this.generateEncounter(playerPosition, playerSystem);
      }
    }

    return null;
  }

  /**
   * Generate random encounter
   */
  public generateEncounter(position: Vector3, system: StarSystem): Encounter {
    const types: EncounterType[] = [
      'PIRATE_AMBUSH',
      'MERCHANT_CONVOY',
      'DISTRESS_CALL',
      'PATROL',
      'DERELICT_SHIP',
      'ANOMALY'
    ];

    // Weight by system danger level
    const dangerLevel = (system as any).dangerLevel || 0.5;

    if (dangerLevel > 0.7) {
      types.push('PIRATE_AMBUSH', 'PIRATE_AMBUSH', 'BOUNTY_HUNTER');
    } else if (dangerLevel < 0.3) {
      types.push('MERCHANT_CONVOY', 'MERCHANT_CONVOY', 'SCIENTIFIC_EXPEDITION');
    }

    const type = types[Math.floor(Math.random() * types.length)];

    let encounter: Encounter;

    switch (type) {
      case 'PIRATE_AMBUSH':
        encounter = this.generatePirateAmbush(position, system);
        break;
      case 'MERCHANT_CONVOY':
        encounter = this.generateMerchantConvoy(position, system);
        break;
      case 'DISTRESS_CALL':
        encounter = this.generateDistressCall(position, system);
        break;
      case 'PATROL':
        encounter = this.generatePatrol(position, system);
        break;
      case 'DERELICT_SHIP':
        encounter = this.generateDerelictShip(position, system);
        break;
      case 'ANOMALY':
        encounter = this.generateAnomaly(position, system);
        break;
      default:
        encounter = this.generatePirateAmbush(position, system);
    }

    this.activeEncounters.set(encounter.id, encounter);
    this.encounterCooldown = this.MIN_COOLDOWN;

    // Record event
    this.orchestrator.recordEvent({
      id: encounter.id,
      timestamp: encounter.timestamp,
      type: 'ENCOUNTER' as any,
      category: 'RANDOM_EVENT' as any,
      severity: encounter.threatLevel,
      location: position,
      systemId: system.id,
      participants: encounter.ships.map(s => s.id),
      description: encounter.title,
      data: { encounterType: type, threatLevel: encounter.threatLevel },
      consequences: [],
      witnessed: true,
      priority: encounter.threatLevel,
      tags: ['encounter', type.toLowerCase()]
    });

    console.log(`[ENCOUNTER] ${encounter.title}`);

    return encounter;
  }

  /**
   * Resolve encounter option
   */
  public resolveEncounterOption(encounterId: string, optionId: string): {
    success: boolean;
    message: string;
    rewards?: any;
  } {
    const encounter = this.activeEncounters.get(encounterId);

    if (!encounter) {
      return {
        success: false,
        message: 'Encounter not found'
      };
    }

    const option = encounter.options.find(o => o.id === optionId);

    if (!option) {
      return {
        success: false,
        message: 'Invalid option'
      };
    }

    // Roll for success
    const roll = Math.random();
    const success = roll < option.outcomes.success;

    encounter.completed = true;
    encounter.outcome = success ? option.outcomes.onSuccess : option.outcomes.onFailure;

    this.encounterHistory.push(encounter);
    this.activeEncounters.delete(encounterId);

    console.log(`[ENCOUNTER] ${encounter.outcome}`);

    return {
      success,
      message: encounter.outcome,
      rewards: success ? option.outcomes.rewards : undefined
    };
  }

  /**
   * Get active encounters
   */
  public getActiveEncounters(): Encounter[] {
    return Array.from(this.activeEncounters.values());
  }

  // Private encounter generators
  private generatePirateAmbush(position: Vector3, system: StarSystem): Encounter {
    const pirateCount = Math.floor(Math.random() * 3) + 1;
    const ships: EncounterShip[] = [];

    for (let i = 0; i < pirateCount; i++) {
      ships.push({
        id: `pirate_${this.encounterIdCounter}_${i}`,
        name: `Pirate ${['Raider', 'Marauder', 'Corsair'][i % 3]}`,
        type: 'FIGHTER',
        faction: 'PIRATES',
        hostile: true,
        hull: 1.0,
        shields: 0.5,
        position: {
          x: position.x + (Math.random() - 0.5) * 2000,
          y: position.y + (Math.random() - 0.5) * 2000,
          z: position.z + (Math.random() - 0.5) * 2000
        },
        velocity: { x: 0, y: 0, z: 0 }
      });
    }

    return {
      id: `encounter_${this.encounterIdCounter++}`,
      type: 'PIRATE_AMBUSH',
      timestamp: Date.now() / 1000,
      position,
      systemId: system.id,
      systemName: system.name,
      title: 'Pirate Ambush!',
      description: `${pirateCount} pirate ships have dropped out of nowhere and are demanding your cargo!`,
      initialMessage: 'Drop your cargo and we might let you live!',
      ships,
      options: [
        {
          id: 'fight',
          text: 'Engage hostiles',
          consequence: 'Combat initiated',
          outcomes: {
            success: 0.6,
            onSuccess: 'Pirates destroyed!',
            onFailure: 'Took heavy damage from pirates',
            rewards: { credits: 500, salvage: ['PIRATE_LOOT'] }
          }
        },
        {
          id: 'flee',
          text: 'Attempt to escape',
          consequence: 'Full throttle away',
          outcomes: {
            success: 0.7,
            onSuccess: 'Successfully escaped',
            onFailure: 'Hit by weapons fire while fleeing'
          }
        },
        {
          id: 'surrender',
          text: 'Surrender cargo',
          consequence: 'Drop cargo and hope they leave',
          outcomes: {
            success: 1.0,
            onSuccess: 'Pirates took cargo and left',
            onFailure: ''
          }
        }
      ],
      completed: false,
      potentialRewards: {
        credits: 500,
        salvage: ['PIRATE_LOOT']
      },
      threatLevel: 7,
      hostileByDefault: true
    };
  }

  private generateMerchantConvoy(position: Vector3, system: StarSystem): Encounter {
    const ships: EncounterShip[] = [
      {
        id: `merchant_${this.encounterIdCounter}_0`,
        name: 'Merchant Freighter',
        type: 'FREIGHTER',
        faction: 'UEC',
        hostile: false,
        hull: 1.0,
        shields: 0.3,
        position,
        velocity: { x: 100, y: 0, z: 0 },
        cargo: new Map([
          ['ELECTRONICS', 50],
          ['MANUFACTURED_GOODS', 100]
        ])
      }
    ];

    return {
      id: `encounter_${this.encounterIdCounter++}`,
      type: 'MERCHANT_CONVOY',
      timestamp: Date.now() / 1000,
      position,
      systemId: system.id,
      systemName: system.name,
      title: 'Merchant Convoy',
      description: 'A merchant freighter is passing through. They might have goods to trade.',
      initialMessage: 'Greetings, traveler. Safe journey to you.',
      ships,
      options: [
        {
          id: 'trade',
          text: 'Request trade',
          consequence: 'Open trade dialog',
          outcomes: {
            success: 1.0,
            onSuccess: 'Merchant willing to trade',
            onFailure: ''
          }
        },
        {
          id: 'ignore',
          text: 'Continue on',
          consequence: 'Ignore merchant',
          outcomes: {
            success: 1.0,
            onSuccess: 'Continue journey',
            onFailure: ''
          }
        }
      ],
      completed: false,
      potentialRewards: {
        cargo: new Map([['ELECTRONICS', 10]])
      },
      threatLevel: 0,
      hostileByDefault: false
    };
  }

  private generateDistressCall(position: Vector3, system: StarSystem): Encounter {
    const ships: EncounterShip[] = [
      {
        id: `distress_${this.encounterIdCounter}_0`,
        name: 'Damaged Civilian Ship',
        type: 'SHUTTLE',
        faction: 'UEC',
        hostile: false,
        hull: 0.2,
        shields: 0.0,
        position,
        velocity: { x: 0, y: 0, z: 0 }
      }
    ];

    return {
      id: `encounter_${this.encounterIdCounter++}`,
      type: 'DISTRESS_CALL',
      timestamp: Date.now() / 1000,
      position,
      systemId: system.id,
      systemName: system.name,
      title: 'Distress Call',
      description: 'A ship is broadcasting a distress signal. Life support failing.',
      initialMessage: 'Mayday! Mayday! Life support critical! Please help!',
      ships,
      options: [
        {
          id: 'rescue',
          text: 'Rescue survivors',
          consequence: 'Dock and rescue crew',
          requirements: { minCredits: 0 },
          outcomes: {
            success: 1.0,
            onSuccess: 'Rescued 5 survivors. They are grateful.',
            onFailure: '',
            rewards: { reputation: new Map([['UEC', 10]]) }
          }
        },
        {
          id: 'salvage',
          text: 'Salvage the wreck',
          consequence: 'Loot the ship',
          outcomes: {
            success: 1.0,
            onSuccess: 'Salvaged materials from wreck',
            onFailure: '',
            rewards: { salvage: ['SCRAP', 'COMPONENTS'] },
            consequences: { reputation: new Map([['UEC', -5]]) }
          }
        },
        {
          id: 'ignore',
          text: 'Ignore distress call',
          consequence: 'Continue on',
          outcomes: {
            success: 1.0,
            onSuccess: 'Left them to their fate',
            onFailure: '',
            consequences: { reputation: new Map([['UEC', -2]]) }
          }
        }
      ],
      completed: false,
      potentialRewards: {
        reputation: new Map([['UEC', 10]]),
        salvage: ['SCRAP', 'COMPONENTS']
      },
      threatLevel: 2,
      hostileByDefault: false
    };
  }

  private generatePatrol(position: Vector3, system: StarSystem): Encounter {
    const ships: EncounterShip[] = [
      {
        id: `patrol_${this.encounterIdCounter}_0`,
        name: 'UEC Patrol Corvette',
        type: 'CORVETTE',
        faction: 'UEC',
        hostile: false,
        hull: 1.0,
        shields: 0.8,
        position,
        velocity: { x: 50, y: 0, z: 0 }
      }
    ];

    return {
      id: `encounter_${this.encounterIdCounter++}`,
      type: 'PATROL',
      timestamp: Date.now() / 1000,
      position,
      systemId: system.id,
      systemName: system.name,
      title: 'Security Patrol',
      description: 'A faction patrol ship is conducting routine scans.',
      initialMessage: 'This is UEC patrol. Heave to for cargo inspection.',
      ships,
      options: [
        {
          id: 'comply',
          text: 'Comply with scan',
          consequence: 'Allow cargo scan',
          outcomes: {
            success: 1.0,
            onSuccess: 'Scan complete. You are free to go.',
            onFailure: ''
          }
        },
        {
          id: 'refuse',
          text: 'Refuse scan',
          consequence: 'Deny scan request',
          outcomes: {
            success: 0.3,
            onSuccess: 'They let you go with a warning',
            onFailure: 'Patrol opens fire!',
            consequences: { reputation: new Map([['UEC', -10]]) }
          }
        },
        {
          id: 'flee',
          text: 'Flee',
          consequence: 'Escape before they can react',
          outcomes: {
            success: 0.6,
            onSuccess: 'Escaped successfully',
            onFailure: 'Patrol pursues and engages',
            consequences: { reputation: new Map([['UEC', -15]]) }
          }
        }
      ],
      completed: false,
      potentialRewards: {},
      threatLevel: 4,
      hostileByDefault: false
    };
  }

  private generateDerelictShip(position: Vector3, system: StarSystem): Encounter {
    return {
      id: `encounter_${this.encounterIdCounter++}`,
      type: 'DERELICT_SHIP',
      timestamp: Date.now() / 1000,
      position,
      systemId: system.id,
      systemName: system.name,
      title: 'Derelict Ship',
      description: 'An abandoned ship drifts in space. No life signs detected.',
      initialMessage: '[No response]',
      ships: [],
      options: [
        {
          id: 'salvage',
          text: 'Board and salvage',
          consequence: 'Dock with derelict',
          outcomes: {
            success: 0.8,
            onSuccess: 'Found valuable salvage',
            onFailure: 'Ship booby-trapped! Took damage.',
            rewards: { credits: 1000, salvage: ['RARE_COMPONENTS'] }
          }
        },
        {
          id: 'scan',
          text: 'Scan from distance',
          consequence: 'Remote scan',
          outcomes: {
            success: 1.0,
            onSuccess: 'Ship appears to be safe for boarding',
            onFailure: ''
          }
        },
        {
          id: 'ignore',
          text: 'Leave it alone',
          consequence: 'Continue on',
          outcomes: {
            success: 1.0,
            onSuccess: 'Continue journey',
            onFailure: ''
          }
        }
      ],
      completed: false,
      potentialRewards: {
        credits: 1000,
        salvage: ['RARE_COMPONENTS']
      },
      threatLevel: 3,
      hostileByDefault: false
    };
  }

  private generateAnomaly(position: Vector3, system: StarSystem): Encounter {
    return {
      id: `encounter_${this.encounterIdCounter++}`,
      type: 'ANOMALY',
      timestamp: Date.now() / 1000,
      position,
      systemId: system.id,
      systemName: system.name,
      title: 'Spatial Anomaly',
      description: 'Sensors detecting unusual readings. Unknown phenomenon ahead.',
      initialMessage: '[WARNING: Anomalous readings detected]',
      ships: [],
      options: [
        {
          id: 'investigate',
          text: 'Investigate anomaly',
          consequence: 'Approach anomaly',
          outcomes: {
            success: 0.5,
            onSuccess: 'Discovered rare materials!',
            onFailure: 'Anomaly damaged ship systems!',
            rewards: { salvage: ['EXOTIC_MATTER'] }
          }
        },
        {
          id: 'avoid',
          text: 'Avoid anomaly',
          consequence: 'Give it a wide berth',
          outcomes: {
            success: 1.0,
            onSuccess: 'Safely avoided anomaly',
            onFailure: ''
          }
        }
      ],
      completed: false,
      potentialRewards: {
        salvage: ['EXOTIC_MATTER']
      },
      threatLevel: 5,
      hostileByDefault: false
    };
  }

  private calculateEncounterChance(system: StarSystem, velocity: Vector3): number {
    let chance = this.BASE_ENCOUNTER_RATE;

    // Higher chance in dangerous systems
    const dangerLevel = (system as any).dangerLevel || 0.5;
    chance *= (1 + dangerLevel);

    // Higher chance when moving fast
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    if (speed > 1000) {
      chance *= 1.5;
    }

    return chance;
  }
}
