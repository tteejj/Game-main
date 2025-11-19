/**
 * MissionSystem - Dynamic mission generation and tracking
 * Generates missions based on universe state, faction needs, economic conditions
 */

import { Vector3 } from './CelestialBody';
import { StarSystem } from './StarSystem';
import { SpaceStation } from './StationGenerator';
import { UniverseOrchestrator } from './UniverseOrchestrator';

export type MissionType =
  | 'CARGO_DELIVERY'
  | 'CARGO_PICKUP'
  | 'PASSENGER_TRANSPORT'
  | 'ASSASSINATION'
  | 'ESCORT'
  | 'PATROL'
  | 'SURVEY'
  | 'MINING'
  | 'RESCUE'
  | 'COMBAT'
  | 'EXPLORATION'
  | 'SMUGGLING'
  | 'RECONNAISSANCE'
  | 'REPUTATION';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;

  // Issuer
  issuer: string; // faction or station ID
  issuerName: string;
  issuerFaction: string;

  // Objectives
  objectives: MissionObjective[];
  currentObjective: number;

  // Location
  originSystem: string;
  originStation?: string;
  targetSystem?: string;
  targetStation?: string;
  targetLocation?: Vector3;

  // Rewards
  creditReward: number;
  reputationReward: Map<string, number>; // faction -> rep change
  itemRewards: Map<string, number>; // item -> quantity
  experienceReward: number;

  // Requirements
  requiredReputation?: Map<string, number>;
  requiredCombatRating?: number;
  requiredTradeRating?: number;
  requiredShipClass?: string;

  // Constraints
  timeLimit?: number; // seconds
  expiresAt?: number; // timestamp
  acceptedAt?: number;
  completedAt?: number;

  // Difficulty
  difficulty: number; // 1-10
  risk: number; // 0-1

  // State
  status: 'AVAILABLE' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  failureConditions: string[];

  // Procedural data
  cargo?: { commodity: string; quantity: number };
  passengers?: { count: number; type: string };
  target?: { id: string; name: string; type: string };

  // Story
  narrativeContext?: string;
  consequencesOnSuccess?: string[];
  consequencesOnFailure?: string[];
}

export interface MissionObjective {
  id: string;
  description: string;
  type: 'GOTO' | 'DELIVER' | 'PICKUP' | 'DESTROY' | 'SCAN' | 'WAIT' | 'TALK';
  completed: boolean;

  // Location
  systemId?: string;
  stationId?: string;
  position?: Vector3;

  // Targets
  targetId?: string;
  commodity?: string;
  quantity?: number;

  // Progress
  currentProgress?: number;
  requiredProgress?: number;
}

export interface MissionBoard {
  stationId: string;
  stationName: string;
  availableMissions: Mission[];
  refreshesAt: number;
}

export class MissionSystem {
  private missions: Map<string, Mission> = new Map();
  private boards: Map<string, MissionBoard> = new Map();
  private activeMissions: Set<string> = new Set();
  private completedMissions: Set<string> = new Set();
  private orchestrator: UniverseOrchestrator;

  private missionIdCounter = 0;

  constructor(orchestrator: UniverseOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Generate missions for a station based on universe state
   */
  public generateMissionsForStation(station: SpaceStation, count: number = 5): Mission[] {
    const missions: Mission[] = [];
    const state = this.orchestrator.getState();

    for (let i = 0; i < count; i++) {
      const missionType = this.selectMissionType(station);
      const mission = this.generateMission(missionType, station);

      if (mission) {
        missions.push(mission);
        this.missions.set(mission.id, mission);
      }
    }

    // Update or create board
    this.boards.set(station.id, {
      stationId: station.id,
      stationName: station.name,
      availableMissions: missions,
      refreshesAt: Date.now() / 1000 + 3600 // Refresh every hour
    });

    return missions;
  }

  /**
   * Get mission board for station
   */
  public getMissionBoard(stationId: string): MissionBoard | null {
    const board = this.boards.get(stationId);

    if (!board) return null;

    // Check if needs refresh
    if (Date.now() / 1000 > board.refreshesAt) {
      // Would regenerate missions here
    }

    return board;
  }

  /**
   * Accept a mission
   */
  public acceptMission(missionId: string, playerId: string): {
    success: boolean;
    mission?: Mission;
    message: string;
  } {
    const mission = this.missions.get(missionId);

    if (!mission) {
      return {
        success: false,
        message: 'Mission not found'
      };
    }

    if (mission.status !== 'AVAILABLE') {
      return {
        success: false,
        message: 'Mission no longer available'
      };
    }

    // Check requirements
    // Would check player reputation, combat rating, etc.

    mission.status = 'ACCEPTED';
    mission.acceptedAt = Date.now() / 1000;

    if (mission.timeLimit) {
      mission.expiresAt = mission.acceptedAt + mission.timeLimit;
    }

    this.activeMissions.add(missionId);

    // Remove from board
    for (const board of this.boards.values()) {
      board.availableMissions = board.availableMissions.filter(m => m.id !== missionId);
    }

    // Record event
    this.orchestrator.recordEvent({
      id: `mission_accepted_${missionId}`,
      timestamp: Date.now() / 1000,
      type: 'MISSION_ACCEPTED' as any,
      category: 'ECONOMIC' as any,
      severity: 3,
      location: { x: 0, y: 0, z: 0 },
      participants: [playerId, mission.issuer],
      description: `${playerId} accepted mission: ${mission.title}`,
      data: { missionId, missionType: mission.type },
      consequences: [],
      witnessed: false,
      priority: 3,
      tags: ['mission']
    });

    return {
      success: true,
      mission: mission,
      message: `Mission accepted: ${mission.title}`
    };
  }

  /**
   * Update mission progress
   */
  public updateMission(missionId: string, playerState: any): void {
    const mission = this.missions.get(missionId);

    if (!mission || mission.status !== 'ACCEPTED') return;

    // Check time limit
    if (mission.expiresAt && Date.now() / 1000 > mission.expiresAt) {
      this.failMission(missionId, 'Time limit exceeded');
      return;
    }

    // Check objectives
    const currentObj = mission.objectives[mission.currentObjective];

    if (currentObj && !currentObj.completed) {
      const completed = this.checkObjective(currentObj, playerState);

      if (completed) {
        currentObj.completed = true;
        mission.currentObjective++;

        // All objectives complete?
        if (mission.currentObjective >= mission.objectives.length) {
          this.completeMission(missionId, playerState.playerId);
        }
      }
    }
  }

  /**
   * Complete mission
   */
  public completeMission(missionId: string, playerId: string): {
    success: boolean;
    rewards: any;
    message: string;
  } {
    const mission = this.missions.get(missionId);

    if (!mission) {
      return {
        success: false,
        rewards: null,
        message: 'Mission not found'
      };
    }

    mission.status = 'COMPLETED';
    mission.completedAt = Date.now() / 1000;

    this.activeMissions.delete(missionId);
    this.completedMissions.add(missionId);

    // Apply consequences
    if (mission.consequencesOnSuccess) {
      // Would apply consequences to universe
    }

    // Record event
    this.orchestrator.recordEvent({
      id: `mission_completed_${missionId}`,
      timestamp: Date.now() / 1000,
      type: 'MISSION_COMPLETED' as any,
      category: 'ECONOMIC' as any,
      severity: 5,
      location: { x: 0, y: 0, z: 0 },
      participants: [playerId, mission.issuer],
      description: `${playerId} completed mission: ${mission.title}`,
      data: { missionId, missionType: mission.type },
      consequences: [],
      witnessed: false,
      priority: 5,
      tags: ['mission', 'success']
    });

    return {
      success: true,
      rewards: {
        credits: mission.creditReward,
        reputation: mission.reputationReward,
        items: mission.itemRewards,
        experience: mission.experienceReward
      },
      message: `Mission completed! Earned ${mission.creditReward} credits`
    };
  }

  /**
   * Fail mission
   */
  public failMission(missionId: string, reason: string): void {
    const mission = this.missions.get(missionId);

    if (!mission) return;

    mission.status = 'FAILED';
    this.activeMissions.delete(missionId);

    // Apply failure consequences
    if (mission.consequencesOnFailure) {
      // Would apply consequences
    }

    console.log(`Mission failed: ${mission.title} - ${reason}`);
  }

  /**
   * Get active missions
   */
  public getActiveMissions(): Mission[] {
    return Array.from(this.activeMissions)
      .map(id => this.missions.get(id))
      .filter(m => m !== undefined) as Mission[];
  }

  // Private methods
  private generateMission(type: MissionType, station: SpaceStation): Mission | null {
    const id = `mission_${this.missionIdCounter++}`;

    switch (type) {
      case 'CARGO_DELIVERY':
        return this.generateCargoDeliveryMission(id, station);

      case 'PASSENGER_TRANSPORT':
        return this.generatePassengerMission(id, station);

      case 'PATROL':
        return this.generatePatrolMission(id, station);

      case 'SURVEY':
        return this.generateSurveyMission(id, station);

      case 'ESCORT':
        return this.generateEscortMission(id, station);

      default:
        return this.generateGenericMission(id, type, station);
    }
  }

  private generateCargoDeliveryMission(id: string, station: SpaceStation): Mission {
    const commodities = ['FOOD', 'WATER', 'ELECTRONICS', 'MEDICAL_SUPPLIES', 'RARE_EARTHS'];
    const commodity = commodities[Math.floor(Math.random() * commodities.length)];
    const quantity = Math.floor(Math.random() * 50) + 10;
    const distance = Math.random() * 1000 + 100;
    const creditReward = Math.floor(quantity * 50 * (distance / 100));

    return {
      id,
      type: 'CARGO_DELIVERY',
      title: `Deliver ${quantity} units of ${commodity}`,
      description: `Transport ${quantity} units of ${commodity} to the destination station. Payment on delivery.`,

      issuer: station.id,
      issuerName: station.name,
      issuerFaction: station.faction,

      objectives: [
        {
          id: `${id}_obj_0`,
          description: `Pick up ${quantity} units of ${commodity} from ${station.name}`,
          type: 'PICKUP',
          completed: false,
          stationId: station.id,
          commodity,
          quantity
        },
        {
          id: `${id}_obj_1`,
          description: `Deliver cargo to destination`,
          type: 'DELIVER',
          completed: false,
          commodity,
          quantity
        }
      ],
      currentObjective: 0,

      originSystem: station.orbitingBody || 'UNKNOWN',
      originStation: station.id,

      creditReward,
      reputationReward: new Map([[station.faction, 5]]),
      itemRewards: new Map(),
      experienceReward: 100,

      timeLimit: 3600,

      difficulty: 2,
      risk: 0.1,

      status: 'AVAILABLE',
      failureConditions: ['Cargo destroyed', 'Time limit exceeded'],

      cargo: { commodity, quantity }
    };
  }

  private generatePassengerMission(id: string, station: SpaceStation): Mission {
    const passengerCount = Math.floor(Math.random() * 10) + 1;
    const passengerType = Math.random() > 0.5 ? 'CIVILIAN' : 'VIP';
    const creditReward = passengerCount * (passengerType === 'VIP' ? 500 : 100);

    return {
      id,
      type: 'PASSENGER_TRANSPORT',
      title: `Transport ${passengerCount} ${passengerType} passengers`,
      description: `Safely transport ${passengerCount} ${passengerType} passengers to their destination.`,

      issuer: station.id,
      issuerName: station.name,
      issuerFaction: station.faction,

      objectives: [
        {
          id: `${id}_obj_0`,
          description: `Pick up passengers from ${station.name}`,
          type: 'PICKUP',
          completed: false,
          stationId: station.id,
          quantity: passengerCount
        },
        {
          id: `${id}_obj_1`,
          description: `Deliver passengers safely`,
          type: 'DELIVER',
          completed: false,
          quantity: passengerCount
        }
      ],
      currentObjective: 0,

      originSystem: station.orbitingBody || 'UNKNOWN',
      originStation: station.id,

      creditReward,
      reputationReward: new Map([[station.faction, passengerType === 'VIP' ? 10 : 3]]),
      itemRewards: new Map(),
      experienceReward: 150,

      timeLimit: 7200,

      difficulty: passengerType === 'VIP' ? 4 : 2,
      risk: passengerType === 'VIP' ? 0.3 : 0.1,

      status: 'AVAILABLE',
      failureConditions: ['Passenger death', 'Ship damage > 50%', 'Time limit exceeded'],

      passengers: { count: passengerCount, type: passengerType }
    };
  }

  private generatePatrolMission(id: string, station: SpaceStation): Mission {
    const creditReward = 1000 + Math.floor(Math.random() * 500);

    return {
      id,
      type: 'PATROL',
      title: 'Patrol local space',
      description: 'Patrol the designated area and report any hostile activity.',

      issuer: station.id,
      issuerName: station.name,
      issuerFaction: station.faction,

      objectives: [
        {
          id: `${id}_obj_0`,
          description: 'Patrol waypoint 1',
          type: 'GOTO',
          completed: false,
          position: { x: Math.random() * 10000, y: Math.random() * 10000, z: Math.random() * 10000 }
        },
        {
          id: `${id}_obj_1`,
          description: 'Patrol waypoint 2',
          type: 'GOTO',
          completed: false,
          position: { x: Math.random() * 10000, y: Math.random() * 10000, z: Math.random() * 10000 }
        },
        {
          id: `${id}_obj_2`,
          description: 'Patrol waypoint 3',
          type: 'GOTO',
          completed: false,
          position: { x: Math.random() * 10000, y: Math.random() * 10000, z: Math.random() * 10000 }
        }
      ],
      currentObjective: 0,

      originSystem: station.orbitingBody || 'UNKNOWN',
      originStation: station.id,

      creditReward,
      reputationReward: new Map([[station.faction, 8]]),
      itemRewards: new Map(),
      experienceReward: 200,

      timeLimit: 1800,

      difficulty: 3,
      risk: 0.4,

      status: 'AVAILABLE',
      failureConditions: ['Ship destroyed', 'Time limit exceeded']
    };
  }

  private generateSurveyMission(id: string, station: SpaceStation): Mission {
    const creditReward = 1500 + Math.floor(Math.random() * 1000);

    return {
      id,
      type: 'SURVEY',
      title: 'Survey anomaly',
      description: 'Scan and gather data on the designated anomaly.',

      issuer: station.id,
      issuerName: station.name,
      issuerFaction: station.faction,

      objectives: [
        {
          id: `${id}_obj_0`,
          description: 'Navigate to anomaly location',
          type: 'GOTO',
          completed: false,
          position: { x: Math.random() * 50000, y: Math.random() * 50000, z: Math.random() * 50000 }
        },
        {
          id: `${id}_obj_1`,
          description: 'Scan anomaly',
          type: 'SCAN',
          completed: false,
          requiredProgress: 100
        }
      ],
      currentObjective: 0,

      originSystem: station.orbitingBody || 'UNKNOWN',
      originStation: station.id,

      creditReward,
      reputationReward: new Map([[station.faction, 12]]),
      itemRewards: new Map([['SURVEY_DATA', 1]]),
      experienceReward: 300,

      difficulty: 5,
      risk: 0.5,

      status: 'AVAILABLE',
      failureConditions: ['Ship destroyed', 'Data corrupted']
    };
  }

  private generateEscortMission(id: string, station: SpaceStation): Mission {
    const creditReward = 2000 + Math.floor(Math.random() * 1000);

    return {
      id,
      type: 'ESCORT',
      title: 'Escort merchant convoy',
      description: 'Protect merchant vessels from pirates during transit.',

      issuer: station.id,
      issuerName: station.name,
      issuerFaction: station.faction,

      objectives: [
        {
          id: `${id}_obj_0`,
          description: 'Rendezvous with convoy',
          type: 'GOTO',
          completed: false,
          stationId: station.id
        },
        {
          id: `${id}_obj_1`,
          description: 'Escort convoy to destination',
          type: 'WAIT',
          completed: false,
          requiredProgress: 100
        }
      ],
      currentObjective: 0,

      originSystem: station.orbitingBody || 'UNKNOWN',
      originStation: station.id,

      creditReward,
      reputationReward: new Map([[station.faction, 15]]),
      itemRewards: new Map(),
      experienceReward: 400,

      requiredCombatRating: 3,

      difficulty: 6,
      risk: 0.7,

      status: 'AVAILABLE',
      failureConditions: ['Convoy destroyed', 'Player fled combat']
    };
  }

  private generateGenericMission(id: string, type: MissionType, station: SpaceStation): Mission {
    return {
      id,
      type,
      title: `Generic ${type} mission`,
      description: `Complete this ${type} mission.`,

      issuer: station.id,
      issuerName: station.name,
      issuerFaction: station.faction,

      objectives: [],
      currentObjective: 0,

      originSystem: station.orbitingBody || 'UNKNOWN',
      originStation: station.id,

      creditReward: 500,
      reputationReward: new Map([[station.faction, 5]]),
      itemRewards: new Map(),
      experienceReward: 100,

      difficulty: 3,
      risk: 0.3,

      status: 'AVAILABLE',
      failureConditions: []
    };
  }

  private selectMissionType(station: SpaceStation): MissionType {
    const types: MissionType[] = [
      'CARGO_DELIVERY',
      'PASSENGER_TRANSPORT',
      'PATROL',
      'SURVEY',
      'ESCORT'
    ];

    // Weight by station type
    if (station.stationType === 'MILITARY') {
      types.push('PATROL', 'PATROL', 'COMBAT');
    } else if (station.stationType === 'TRADING') {
      types.push('CARGO_DELIVERY', 'CARGO_DELIVERY', 'ESCORT');
    } else if (station.stationType === 'RESEARCH') {
      types.push('SURVEY', 'SURVEY', 'EXPLORATION');
    }

    return types[Math.floor(Math.random() * types.length)];
  }

  private checkObjective(objective: MissionObjective, playerState: any): boolean {
    switch (objective.type) {
      case 'GOTO':
        if (objective.position && playerState.position) {
          const dx = objective.position.x - playerState.position.x;
          const dy = objective.position.y - playerState.position.y;
          const dz = objective.position.z - playerState.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          return dist < 1000; // Within 1km
        }
        return false;

      case 'PICKUP':
      case 'DELIVER':
        // Would check cargo/passenger state
        return false;

      case 'SCAN':
        // Would check scan progress
        return false;

      default:
        return false;
    }
  }
}
