/**
 * PlayerShipIntegration - Connects player spacecraft to living universe
 * The player exists in and affects the universe, and the universe affects the player
 */

import { Spacecraft } from '../physics-modules/src/spacecraft';
import { Vector3 } from './CelestialBody';
import { StarSystem } from './StarSystem';
import { SpaceStation } from './StationGenerator';
import { StationServices } from './StationServices';
import { UniverseOrchestrator } from './UniverseOrchestrator';
import { CombatSystem, CombatState, DamageResult, CombatTarget } from './CombatSystem';
import { MissionSystem, Mission, MissionBoard } from './MissionSystem';
import { NPCInteractionInterface, NPCShipContact, InteractionOption, HailResult, InteractionResponse } from './NPCInteractionInterface';
import { PlayerSystemsIntegration } from './PlayerSystemsIntegration';
import { CrewManagementSystem, CrewMember, CrewRole } from './CrewManagementSystem';
import { ResearchSystem } from './ResearchSystem';
import { NewsGenerationSystem } from './NewsGenerationSystem';

export interface PlayerState {
  // Identity
  shipId: string;
  shipName: string;
  callsign: string;

  // Location
  position: Vector3;
  velocity: Vector3;
  currentSystem: StarSystem | null;
  nearestStation: SpaceStation | null;
  distanceToStation: number;

  // Economy
  credits: number;
  cargo: Map<string, number>;
  cargoCapacity: number;
  cargoUsed: number;

  // Status
  isDocked: boolean;
  dockedAt: SpaceStation | null;
  isInCombat: boolean;
  isScanningPOI: boolean;

  // Reputation
  factionReputation: Map<string, number>;
  bounty: number;
  criminalStatus: boolean;

  // Knowledge
  discoveredSystems: Set<string>;
  discoveredStations: Set<string>;
  discoveredPOIs: Set<string>;
  knownRumors: Set<string>;
  knownNews: Set<string>;

  // Missions
  activeMissions: string[];
  completedMissions: string[];

  // Stats
  totalDistance: number;
  totalJumps: number;
  totalTrades: number;
  totalCombats: number;
}

export class PlayerShipIntegration {
  private spacecraft: Spacecraft;
  private orchestrator: UniverseOrchestrator;
  private state: PlayerState;
  private stationServices: Map<string, StationServices> = new Map();
  private combatSystem: CombatSystem;
  private missionSystem: MissionSystem;
  private npcInteraction: NPCInteractionInterface;
  private playerSystems: PlayerSystemsIntegration;

  constructor(spacecraft: Spacecraft, orchestrator: UniverseOrchestrator, initialSystem: StarSystem) {
    this.spacecraft = spacecraft;
    this.orchestrator = orchestrator;

    // Initialize combat system
    this.combatSystem = new CombatSystem(orchestrator, spacecraft);

    // Initialize mission system
    this.missionSystem = new MissionSystem(orchestrator);

    // Initialize NPC interaction system
    this.npcInteraction = new NPCInteractionInterface();

    // Initialize advanced player systems (crew, research, intel, smuggling)
    const crewSystem = new CrewManagementSystem(6);
    const researchSystem = new ResearchSystem();
    const newsSystem = new NewsGenerationSystem();
    this.playerSystems = new PlayerSystemsIntegration(crewSystem, researchSystem, newsSystem);

    // Initialize player state
    this.state = {
      shipId: 'player_ship',
      shipName: spacecraft.name || 'Player Ship',
      callsign: 'PLAYER-1',

      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      currentSystem: initialSystem,
      nearestStation: null,
      distanceToStation: Infinity,

      credits: 10000,
      cargo: new Map(),
      cargoCapacity: 100,
      cargoUsed: 0,

      isDocked: false,
      dockedAt: null,
      isInCombat: false,
      isScanningPOI: false,

      factionReputation: new Map(),
      bounty: 0,
      criminalStatus: false,

      discoveredSystems: new Set([initialSystem.id]),
      discoveredStations: new Set(),
      discoveredPOIs: new Set(),
      knownRumors: new Set(),
      knownNews: new Set(),

      activeMissions: [],
      completedMissions: [],

      totalDistance: 0,
      totalJumps: 0,
      totalTrades: 0,
      totalCombats: 0
    };
  }

  /**
   * Update player integration with universe every frame
   */
  public update(deltaTime: number, nearbyContacts: any[] = []): void {
    // Update position from spacecraft
    this.updatePosition();

    // Find nearest station
    this.updateNearestStation();

    // Update discoveries
    this.updateDiscoveries();

    // Receive universe news
    this.updateNews();

    // Update combat system
    this.combatSystem.update(deltaTime, nearbyContacts);
    const combatState = this.combatSystem.getCombatState();
    this.state.isInCombat = combatState.inCombat;

    // Update mission progress
    this.updateMissionProgress();

    // Update research progress
    const researchResult = this.playerSystems.updateResearch(deltaTime);
    if (researchResult.completed && researchResult.project) {
      console.log(`[PLAYER] Research completed: ${researchResult.project.name}`);
    }

    // Track distance
    const speed = Math.sqrt(
      this.state.velocity.x ** 2 +
      this.state.velocity.y ** 2 +
      this.state.velocity.z ** 2
    );
    this.state.totalDistance += speed * deltaTime;
  }

  /**
   * Request docking at nearest station
   */
  public async requestDocking(): Promise<{
    success: boolean;
    station?: SpaceStation;
    port?: number;
    fee?: number;
    message: string;
  }> {
    if (this.state.isDocked) {
      return {
        success: false,
        message: 'Already docked'
      };
    }

    if (!this.state.nearestStation) {
      return {
        success: false,
        message: 'No station in range'
      };
    }

    if (this.state.distanceToStation > 1000) {
      return {
        success: false,
        message: `Station too far: ${(this.state.distanceToStation / 1000).toFixed(1)}km (max 1km)`
      };
    }

    // Check reputation restrictions
    const canDock = this.canDockAt(this.state.nearestStation);
    if (!canDock.allowed) {
      return {
        success: false,
        message: canDock.reason || 'Docking denied'
      };
    }

    const service = this.getStationService(this.state.nearestStation);
    const response = service.requestDocking({
      shipId: this.state.shipId,
      shipName: this.state.shipName,
      shipMass: this.spacecraft.mass,
      emergencyDocking: this.spacecraft.hull < 0.2,
      creditBalance: this.state.credits
    });

    if (response.approved && response.portAssigned !== undefined) {
      this.state.isDocked = true;
      this.state.dockedAt = this.state.nearestStation;
      this.state.credits -= response.fee;

      // Record event
      this.recordPlayerEvent('SHIP_DOCKED', {
        station: this.state.nearestStation.name,
        fee: response.fee
      });

      return {
        success: true,
        station: this.state.nearestStation,
        port: response.portAssigned,
        fee: response.fee,
        message: `Docked at ${this.state.nearestStation.name}, Port ${response.portAssigned}. Fee: ${response.fee} credits`
      };
    }

    return {
      success: false,
      message: response.reason || 'Docking denied'
    };
  }

  /**
   * Undock from current station
   */
  public undock(): { success: boolean; message: string } {
    if (!this.state.isDocked || !this.state.dockedAt) {
      return { success: false, message: 'Not currently docked' };
    }

    const service = this.getStationService(this.state.dockedAt);
    service.undock(this.state.shipId);

    const stationName = this.state.dockedAt.name;

    this.state.isDocked = false;
    this.state.dockedAt = null;

    this.recordPlayerEvent('SHIP_UNDOCKED', { station: stationName });

    return {
      success: true,
      message: `Undocked from ${stationName}`
    };
  }

  /**
   * Refuel ship at current station
   */
  public refuel(fuelType: string, amount: number): {
    success: boolean;
    amountRefueled: number;
    cost: number;
    message: string;
  } {
    if (!this.state.dockedAt) {
      return {
        success: false,
        amountRefueled: 0,
        cost: 0,
        message: 'Must be docked to refuel'
      };
    }

    const service = this.getStationService(this.state.dockedAt);
    const result = service.refuel(this.state.shipId, fuelType, amount, this.state.credits);

    if (result.success) {
      this.state.credits = result.remainingCredits;

      // Actually refuel the spacecraft
      this.spacecraft.fuelSystem.addFuel('main', result.amountRefueled);

      this.recordPlayerEvent('REFUEL_COMPLETED', {
        amount: result.amountRefueled,
        cost: result.cost
      });
    }

    return {
      success: result.success,
      amountRefueled: result.amountRefueled,
      cost: result.cost,
      message: result.reason || `Refueled ${result.amountRefueled}kg for ${result.cost} credits`
    };
  }

  /**
   * Repair ship at current station
   */
  public repair(repairType: 'HULL' | 'SYSTEM', systemName?: string): {
    success: boolean;
    cost: number;
    message: string;
  } {
    if (!this.state.dockedAt) {
      return {
        success: false,
        cost: 0,
        message: 'Must be docked to repair'
      };
    }

    const service = this.getStationService(this.state.dockedAt);
    const result = service.repair(this.state.shipId, repairType, systemName || null, this.state.credits);

    if (result.success) {
      this.state.credits = result.remainingCredits;

      // Actually repair the spacecraft
      if (repairType === 'HULL') {
        this.spacecraft.hull = Math.min(1.0, this.spacecraft.hull + (result.repairAmount / 100));
      }

      this.recordPlayerEvent('REPAIR_COMPLETED', {
        type: repairType,
        cost: result.cost
      });
    }

    return {
      success: result.success,
      cost: result.cost,
      message: result.reason || `Repair complete. Cost: ${result.cost} credits`
    };
  }

  /**
   * Buy cargo from station
   */
  public buyCargo(commodity: string, quantity: number): {
    success: boolean;
    cost: number;
    message: string;
  } {
    if (!this.state.dockedAt) {
      return {
        success: false,
        cost: 0,
        message: 'Must be docked to trade'
      };
    }

    if (this.state.cargoUsed + quantity > this.state.cargoCapacity) {
      return {
        success: false,
        cost: 0,
        message: `Insufficient cargo space. Available: ${this.state.cargoCapacity - this.state.cargoUsed}`
      };
    }

    const service = this.getStationService(this.state.dockedAt);
    const result = service.buyCargo(this.state.shipId, commodity, quantity, this.state.credits);

    if (result.success && result.transaction) {
      this.state.credits = result.remainingCredits;

      // Add to cargo
      const current = this.state.cargo.get(commodity) || 0;
      this.state.cargo.set(commodity, current + quantity);
      this.state.cargoUsed += quantity;

      this.state.totalTrades++;

      this.recordPlayerEvent('TRADE_COMPLETED', {
        type: 'BUY',
        commodity,
        quantity,
        cost: result.transaction.totalPrice + result.transaction.tax
      });

      return {
        success: true,
        cost: result.transaction.totalPrice + result.transaction.tax,
        message: `Purchased ${quantity} units of ${commodity} for ${(result.transaction.totalPrice + result.transaction.tax).toFixed(2)} credits`
      };
    }

    return {
      success: false,
      cost: 0,
      message: result.reason || 'Trade failed'
    };
  }

  /**
   * Sell cargo to station
   */
  public sellCargo(commodity: string, quantity: number): {
    success: boolean;
    earned: number;
    message: string;
  } {
    if (!this.state.dockedAt) {
      return {
        success: false,
        earned: 0,
        message: 'Must be docked to trade'
      };
    }

    const current = this.state.cargo.get(commodity) || 0;
    if (current < quantity) {
      return {
        success: false,
        earned: 0,
        message: `Only have ${current} units of ${commodity}`
      };
    }

    const service = this.getStationService(this.state.dockedAt);
    const result = service.sellCargo(this.state.shipId, commodity, quantity);

    if (result.success && result.transaction) {
      this.state.credits += result.creditsEarned;

      // Remove from cargo
      this.state.cargo.set(commodity, current - quantity);
      this.state.cargoUsed -= quantity;

      this.state.totalTrades++;

      this.recordPlayerEvent('TRADE_COMPLETED', {
        type: 'SELL',
        commodity,
        quantity,
        earned: result.creditsEarned
      });

      return {
        success: true,
        earned: result.creditsEarned,
        message: `Sold ${quantity} units of ${commodity} for ${result.creditsEarned.toFixed(2)} credits`
      };
    }

    return {
      success: false,
      earned: 0,
      message: result.reason || 'Trade failed'
    };
  }

  /**
   * Get available services at current/nearest station
   */
  public getStationServiceMenu(): any {
    const station = this.state.dockedAt || this.state.nearestStation;
    if (!station) return null;

    const service = this.getStationService(station);
    const reputation = this.state.factionReputation.get(station.faction) || 0;

    return service.getServiceMenu(this.state.shipId, reputation);
  }

  /**
   * Get current player state
   */
  public getState(): PlayerState {
    return { ...this.state };
  }

  /**
   * Get status string for HUD
   */
  public getStatusString(): string {
    const lines: string[] = [];

    lines.push(`Ship: ${this.state.shipName}`);
    lines.push(`Credits: ${this.state.credits.toFixed(0)}`);
    lines.push(`Cargo: ${this.state.cargoUsed}/${this.state.cargoCapacity}`);

    if (this.state.isDocked && this.state.dockedAt) {
      lines.push(`Docked: ${this.state.dockedAt.name}`);
    } else if (this.state.nearestStation) {
      lines.push(`Nearest: ${this.state.nearestStation.name} (${(this.state.distanceToStation / 1000).toFixed(1)}km)`);
    }

    if (this.state.currentSystem) {
      lines.push(`System: ${this.state.currentSystem.name}`);
    }

    return lines.join('\n');
  }

  /**
   * Get recent news relevant to player
   */
  public getRecentNews(): any[] {
    const news = this.orchestrator.getRecentNews(10);

    // Filter to newsthe player should know about
    return news.filter(article => {
      if (this.state.knownNews.has(article.id)) return true;

      // Discover news if in same system or about player's faction
      if (article.systemId === this.state.currentSystem?.id) {
        this.state.knownNews.add(article.id);
        return true;
      }

      return false;
    });
  }

  // ===== COMBAT METHODS =====

  /**
   * Target nearest hostile ship
   */
  public targetNearestHostile(): { success: boolean; target?: CombatTarget; message: string } {
    const target = this.combatSystem.targetNearestHostile();

    if (target) {
      return {
        success: true,
        target,
        message: `Targeting ${target.name} at ${(target.distance / 1000).toFixed(1)}km`
      };
    }

    return {
      success: false,
      message: 'No hostile targets in range'
    };
  }

  /**
   * Cycle through available targets
   */
  public cycleTargets(): { success: boolean; target?: CombatTarget; message: string } {
    const combatState = this.combatSystem.getCombatState();

    if (combatState.targets.length === 0) {
      return { success: false, message: 'No targets available' };
    }

    const currentIndex = combatState.currentTarget
      ? combatState.targets.findIndex(t => t.id === combatState.currentTarget!.id)
      : -1;

    const nextIndex = (currentIndex + 1) % combatState.targets.length;
    const nextTarget = combatState.targets[nextIndex];

    // Set as current target (we'll need to add this method to CombatSystem)
    const result = this.targetSpecific(nextTarget.id);
    return result;
  }

  /**
   * Target a specific ship by ID
   */
  public targetSpecific(targetId: string): { success: boolean; target?: CombatTarget; message: string } {
    const combatState = this.combatSystem.getCombatState();
    const target = combatState.targets.find(t => t.id === targetId);

    if (!target) {
      return { success: false, message: 'Target not found' };
    }

    // Manually set target in combat state
    (this.combatSystem as any).combatState.currentTarget = target;

    return {
      success: true,
      target,
      message: `Targeting ${target.name}`
    };
  }

  /**
   * Fire primary weapon (laser)
   */
  public firePrimaryWeapon(): DamageResult {
    const result = this.combatSystem.fireWeapon('laser_1');

    if (result.hit) {
      this.state.totalCombats++;
    }

    return result;
  }

  /**
   * Fire secondary weapon (railgun)
   */
  public fireSecondaryWeapon(): DamageResult {
    const result = this.combatSystem.fireWeapon('railgun_1');

    if (result.hit) {
      this.state.totalCombats++;
    }

    return result;
  }

  /**
   * Toggle weapons hot/cold
   */
  public toggleWeapons(): { success: boolean; weaponsHot: boolean; message: string } {
    const combatState = this.combatSystem.getCombatState();
    const newState = !combatState.weaponsHot;
    (this.combatSystem as any).combatState.weaponsHot = newState;

    return {
      success: true,
      weaponsHot: newState,
      message: newState ? 'Weapons armed' : 'Weapons safe'
    };
  }

  /**
   * Toggle shields
   */
  public toggleShields(): { success: boolean; shieldsUp: boolean; message: string } {
    const combatState = this.combatSystem.getCombatState();
    const newState = !combatState.shieldsUp;
    (this.combatSystem as any).combatState.shieldsUp = newState;

    return {
      success: true,
      shieldsUp: newState,
      message: newState ? 'Shields raised' : 'Shields lowered'
    };
  }

  /**
   * Toggle evasion mode
   */
  public toggleEvasion(): { success: boolean; evasionMode: boolean; message: string } {
    const combatState = this.combatSystem.getCombatState();
    const newState = !combatState.evasionMode;
    (this.combatSystem as any).combatState.evasionMode = newState;

    return {
      success: true,
      evasionMode: newState,
      message: newState ? 'Evasive maneuvers engaged' : 'Normal flight mode'
    };
  }

  /**
   * Get current combat state
   */
  public getCombatState(): CombatState {
    return this.combatSystem.getCombatState();
  }

  /**
   * Get combat status string for HUD
   */
  public getCombatStatus(): string {
    return this.combatSystem.getCombatStatus();
  }

  /**
   * Get list of nearby ships that can be targeted
   */
  public getTargetableShips(): CombatTarget[] {
    return this.combatSystem.getCombatState().targets;
  }

  // ===== MISSION METHODS =====

  /**
   * Get available missions at current station
   */
  public getAvailableMissions(): Mission[] {
    if (!this.state.dockedAt) {
      return [];
    }

    // Generate missions for this station if not already generated
    let board = this.missionSystem.getMissionBoard(this.state.dockedAt.id);

    if (!board) {
      this.missionSystem.generateMissionsForStation(this.state.dockedAt, 10);
      board = this.missionSystem.getMissionBoard(this.state.dockedAt.id);
    }

    return board?.availableMissions || [];
  }

  /**
   * Accept a mission
   */
  public acceptMission(missionId: string): {
    success: boolean;
    mission?: Mission;
    message: string;
  } {
    if (!this.state.dockedAt) {
      return {
        success: false,
        message: 'Must be docked at a station to accept missions'
      };
    }

    const result = this.missionSystem.acceptMission(missionId, this.state.shipId);

    if (result.success && result.mission) {
      this.state.activeMissions.push(missionId);
    }

    return result;
  }

  /**
   * Get active missions
   */
  public getActiveMissions(): Mission[] {
    return this.missionSystem.getActiveMissions();
  }

  /**
   * Update mission progress based on current player state
   */
  public updateMissionProgress(): void {
    for (const missionId of this.state.activeMissions) {
      this.missionSystem.updateMission(missionId, {
        position: this.state.position,
        currentSystem: this.state.currentSystem,
        dockedAt: this.state.dockedAt,
        cargo: this.state.cargo
      });
    }
  }

  /**
   * Complete a mission and collect rewards
   */
  public completeMission(missionId: string): {
    success: boolean;
    credits?: number;
    reputation?: Map<string, number>;
    message: string;
  } {
    const result = this.missionSystem.completeMission(missionId, this.state.shipId);

    if (result.success && result.mission) {
      // Award credits
      this.state.credits += result.mission.creditReward;

      // Award reputation
      for (const [faction, repChange] of result.mission.reputationReward.entries()) {
        const current = this.state.factionReputation.get(faction) || 0;
        this.state.factionReputation.set(faction, current + repChange);
      }

      // Remove from active missions, add to completed
      this.state.activeMissions = this.state.activeMissions.filter(id => id !== missionId);
      this.state.completedMissions.push(missionId);

      return {
        success: true,
        credits: result.mission.creditReward,
        reputation: result.mission.reputationReward,
        message: result.message
      };
    }

    return {
      success: false,
      message: result.message
    };
  }

  /**
   * Abandon/fail a mission
   */
  public abandonMission(missionId: string): { success: boolean; message: string } {
    this.missionSystem.failMission(missionId, 'Abandoned by player');

    // Remove from active missions
    this.state.activeMissions = this.state.activeMissions.filter(id => id !== missionId);

    return {
      success: true,
      message: 'Mission abandoned'
    };
  }

  /**
   * Get mission status summary
   */
  public getMissionSummary(): string {
    const active = this.getActiveMissions();
    const completed = this.state.completedMissions.length;

    const lines: string[] = [];
    lines.push('=== MISSIONS ===');
    lines.push(`Active: ${active.length}`);
    lines.push(`Completed: ${completed}`);
    lines.push('');

    if (active.length > 0) {
      lines.push('Active Missions:');
      for (const mission of active) {
        lines.push(`- ${mission.title}`);
        lines.push(`  Reward: ${mission.creditReward} credits`);

        if (mission.timeLimit) {
          const remaining = (mission.expiresAt || 0) - Date.now() / 1000;
          lines.push(`  Time: ${Math.floor(remaining / 60)} minutes remaining`);
        }
      }
    }

    return lines.join('\n');
  }

  // ===== NPC INTERACTION METHODS =====

  /**
   * Get nearby NPC ships that can be hailed
   */
  public getNearbyNPCs(): NPCShipContact[] {
    const targets = this.getTargetableShips();

    return targets.map(target => ({
      id: target.id,
      name: target.name,
      type: 'UNKNOWN', // Would be populated from actual NPC data
      faction: 'UNKNOWN',
      position: target.position,
      distance: target.distance,
      hostile: target.hostile,
      hull: target.hull,
      shields: target.shields,
      reputation: this.state.factionReputation.get('UNKNOWN')
    }));
  }

  /**
   * Hail an NPC ship
   */
  public hailNPC(npcId: string): HailResult | null {
    const npcs = this.getNearbyNPCs();
    const npc = npcs.find(n => n.id === npcId);

    if (!npc) {
      return null;
    }

    if (npc.distance > 10000) {
      // Too far to hail (10km limit)
      return null;
    }

    const reputation = this.state.factionReputation.get(npc.faction) || 0;
    const result = this.npcInteraction.hailNPC(npc, reputation);

    return result;
  }

  /**
   * Interact with an NPC (choose an option)
   */
  public interactWithNPC(npcId: string, option: InteractionOption): InteractionResponse {
    const npcs = this.getNearbyNPCs();
    const npc = npcs.find(n => n.id === npcId);

    if (!npc) {
      return {
        success: false,
        message: 'NPC not found or out of range'
      };
    }

    const reputation = this.state.factionReputation.get(npc.faction) || 0;

    const result = this.npcInteraction.interact(npc, option, {
      credits: this.state.credits,
      cargo: this.state.cargo,
      reputation
    });

    // Apply consequences
    if (result.consequences) {
      if (result.consequences.creditsTransfer) {
        this.state.credits += result.consequences.creditsTransfer;
      }

      if (result.consequences.reputationChange) {
        const current = this.state.factionReputation.get(npc.faction) || 0;
        this.state.factionReputation.set(npc.faction, current + result.consequences.reputationChange);
      }

      if (result.consequences.hostilityChange) {
        // Would mark NPC as hostile in combat system
        console.log(`[NPC INTERACTION] ${npc.name} is now hostile!`);
      }
    }

    return result;
  }

  /**
   * End conversation with NPC
   */
  public endNPCConversation(npcId: string): void {
    this.npcInteraction.endConversation(npcId);
  }

  // ===== REPUTATION METHODS =====

  /**
   * Get reputation with a specific faction
   */
  public getReputationWith(faction: string): number {
    return this.state.factionReputation.get(faction) || 0;
  }

  /**
   * Get reputation standing description
   */
  public getReputationStanding(faction: string): string {
    const rep = this.getReputationWith(faction);

    if (rep >= 80) return 'Allied';
    if (rep >= 50) return 'Friendly';
    if (rep >= 20) return 'Liked';
    if (rep >= -20) return 'Neutral';
    if (rep >= -50) return 'Disliked';
    if (rep >= -80) return 'Hostile';
    return 'Enemy';
  }

  /**
   * Get all faction reputations
   */
  public getAllReputations(): Map<string, number> {
    return new Map(this.state.factionReputation);
  }

  /**
   * Modify reputation with a faction
   */
  public modifyReputation(faction: string, change: number, reason: string): void {
    const current = this.getReputationWith(faction);
    const newRep = Math.max(-100, Math.min(100, current + change));

    this.state.factionReputation.set(faction, newRep);

    // Record event
    this.recordPlayerEvent('REPUTATION_CHANGE', {
      faction,
      change,
      newReputation: newRep,
      reason
    });

    console.log(`[REPUTATION] ${faction}: ${current} -> ${newRep} (${change > 0 ? '+' : ''}${change}) - ${reason}`);
  }

  /**
   * Check if player can dock at station based on faction reputation
   */
  public canDockAt(station: SpaceStation): { allowed: boolean; reason?: string } {
    const rep = this.getReputationWith(station.faction);

    if (rep < -50) {
      return {
        allowed: false,
        reason: `Docking denied: You are ${this.getReputationStanding(station.faction)} with ${station.faction}`
      };
    }

    if (this.state.bounty > 0 && station.faction !== 'PIRATE') {
      return {
        allowed: false,
        reason: `Docking denied: You have an active bounty of ${this.state.bounty} credits`
      };
    }

    return { allowed: true };
  }

  /**
   * Get reputation summary string
   */
  public getReputationSummary(): string {
    const lines: string[] = [];
    lines.push('=== FACTION REPUTATIONS ===');
    lines.push('');

    if (this.state.factionReputation.size === 0) {
      lines.push('No faction standings yet');
      return lines.join('\n');
    }

    // Sort by reputation value
    const sorted = Array.from(this.state.factionReputation.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [faction, rep] of sorted) {
      const standing = this.getReputationStanding(faction);
      const bar = this.createReputationBar(rep);
      lines.push(`${faction}: ${bar} ${standing} (${rep.toFixed(0)})`);
    }

    if (this.state.bounty > 0) {
      lines.push('');
      lines.push(`WANTED: ${this.state.bounty} credit bounty`);
    }

    return lines.join('\n');
  }

  /**
   * Create a visual reputation bar
   */
  private createReputationBar(rep: number): string {
    // -100 to 100 scale, show as bar
    const normalized = (rep + 100) / 200; // 0 to 1
    const barLength = 20;
    const filled = Math.floor(normalized * barLength);
    const empty = barLength - filled;

    const bar = '[' + '='.repeat(filled) + ' '.repeat(empty) + ']';
    return bar;
  }

  /**
   * Place bounty on player (for illegal actions)
   */
  public addBounty(amount: number, faction: string, reason: string): void {
    this.state.bounty += amount;
    this.state.criminalStatus = true;

    // Also decrease reputation
    this.modifyReputation(faction, -20, reason);

    this.recordPlayerEvent('BOUNTY_ADDED', {
      amount,
      faction,
      totalBounty: this.state.bounty,
      reason
    });

    console.log(`[BOUNTY] +${amount} credits bounty added by ${faction}. Total: ${this.state.bounty}. Reason: ${reason}`);
  }

  /**
   * Clear bounty (pay fine or complete justice mission)
   */
  public clearBounty(faction: string): { success: boolean; cost: number; message: string } {
    if (this.state.bounty === 0) {
      return {
        success: false,
        cost: 0,
        message: 'No active bounty'
      };
    }

    const fine = Math.floor(this.state.bounty * 1.5); // 150% of bounty

    if (this.state.credits < fine) {
      return {
        success: false,
        cost: fine,
        message: `Insufficient funds. Fine: ${fine} credits (you have ${this.state.credits})`
      };
    }

    this.state.credits -= fine;
    this.state.bounty = 0;
    this.state.criminalStatus = false;

    this.recordPlayerEvent('BOUNTY_CLEARED', {
      faction,
      fine
    });

    return {
      success: true,
      cost: fine,
      message: `Bounty cleared. Paid ${fine} credits in fines.`
    };
  }

  // ===== CREW MANAGEMENT METHODS =====

  public getAvailableCrewForHire(count?: number) {
    return this.playerSystems.getAvailableCrewForHire(count);
  }

  public hireCrew(crewMember: CrewMember) {
    const result = this.playerSystems.hireCrew(crewMember, this.state.credits);
    if (result.success && result.hiringBonus) {
      this.state.credits -= result.hiringBonus;
    }
    return result;
  }

  public fireCrew(crewId: string) {
    const result = this.playerSystems.fireCrew(crewId);
    if (result.success && result.severancePay) {
      this.state.credits -= result.severancePay;
    }
    return result;
  }

  public getCrew() {
    return this.playerSystems.getCrew();
  }

  public getCrewStatus() {
    return this.playerSystems.getCrewStatus();
  }

  public payCrewSalaries() {
    const result = this.playerSystems.payCrewSalaries(this.state.credits);
    if (result.success) {
      this.state.credits = result.remaining;
    }
    return result;
  }

  public getCrewSkillBonuses() {
    return this.playerSystems.getCrewSkillBonuses();
  }

  // ===== RESEARCH METHODS =====

  public getAvailableResearch() {
    return this.playerSystems.getAvailableResearch();
  }

  public startResearch(projectId: string) {
    const result = this.playerSystems.startResearch(projectId, this.state.credits);
    if (result.success && result.cost) {
      this.state.credits -= result.cost;
    }
    return result;
  }

  public getActiveResearch() {
    return this.playerSystems.getActiveResearch();
  }

  public getCompletedResearch() {
    return this.playerSystems.getCompletedResearch();
  }

  public hasResearched(projectId: string) {
    return this.playerSystems.hasResearched(projectId);
  }

  // ===== INTELLIGENCE METHODS =====

  public gatherIntelFromNews() {
    return this.playerSystems.gatherIntelFromNews(this.state.currentSystem?.id || '');
  }

  public buyIntel(intelId: string) {
    const result = this.playerSystems.buyIntel(intelId, this.state.credits);
    if (result.success && result.cost) {
      this.state.credits -= result.cost;
    }
    return result;
  }

  public sellIntel(intelId: string) {
    const result = this.playerSystems.sellIntel(intelId);
    if (result.success && result.payment) {
      this.state.credits += result.payment;
    }
    return result;
  }

  public getAllIntel() {
    return this.playerSystems.getAllIntel();
  }

  // ===== SMUGGLING METHODS =====

  public addContraband(item: any) {
    return this.playerSystems.addContraband(item);
  }

  public hasContrabandFor(faction: string) {
    return this.playerSystems.hasContrabandFor(faction);
  }

  public performCargoScan(stationFaction: string) {
    return this.playerSystems.performCargoScan(stationFaction);
  }

  public confiscateContraband(faction: string) {
    return this.playerSystems.confiscateContraband(faction);
  }

  public sellContrabandOnBlackMarket(commodity: string) {
    const result = this.playerSystems.sellContrabandOnBlackMarket(commodity);
    if (result.success && result.payment) {
      this.state.credits += result.payment;
    }
    return result;
  }

  public getContraband() {
    return this.playerSystems.getContraband();
  }

  public bribeOfficial() {
    const result = this.playerSystems.bribeOfficial(this.state.credits);
    if (result.success && result.cost) {
      this.state.credits -= result.cost;
    } else if (!result.success && result.cost) {
      // Failed bribe attempt costs money AND reputation
      this.state.credits -= result.cost;
      this.addBounty(5000, this.state.dockedAt?.faction || 'AUTHORITY', 'Attempted bribery of official');
    }
    return result;
  }

  // Private methods
  private updatePosition(): void {
    this.state.position = this.spacecraft.position;
    this.state.velocity = this.spacecraft.velocity;
  }

  private updateNearestStation(): void {
    if (!this.state.currentSystem || !this.state.currentSystem.stations) {
      this.state.nearestStation = null;
      this.state.distanceToStation = Infinity;
      return;
    }

    let nearest: SpaceStation | null = null;
    let minDist = Infinity;

    for (const station of this.state.currentSystem.stations) {
      const dx = station.position.x - this.state.position.x;
      const dy = station.position.y - this.state.position.y;
      const dz = station.position.z - this.state.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    }

    this.state.nearestStation = nearest;
    this.state.distanceToStation = minDist;

    // Auto-discover stations within 100km
    if (nearest && minDist < 100000) {
      this.state.discoveredStations.add(nearest.id);
    }
  }

  private updateDiscoveries(): void {
    if (!this.state.currentSystem) return;

    // Discover system
    this.state.discoveredSystems.add(this.state.currentSystem.id);

    // Discover POIs when scanning
    if (this.state.isScanningPOI && this.state.currentSystem.pointsOfInterest) {
      for (const poi of this.state.currentSystem.pointsOfInterest) {
        const dx = poi.position.x - this.state.position.x;
        const dy = poi.position.y - this.state.position.y;
        const dz = poi.position.z - this.state.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 10000) { // 10km scan range
          this.state.discoveredPOIs.add(poi.id);
        }
      }
    }
  }

  private updateNews(): void {
    const news = this.orchestrator.getRecentNews(5);

    for (const article of news) {
      if (!this.state.knownNews.has(article.id)) {
        // Player learns news if in same system
        if (article.sourceEvent.systemId === this.state.currentSystem?.id) {
          this.state.knownNews.add(article.id);
        }
      }
    }
  }

  private recordPlayerEvent(type: string, data: any): void {
    const event = {
      id: `player_event_${Date.now()}`,
      timestamp: Date.now() / 1000,
      type: type as any,
      category: 'PERSONAL' as any,
      severity: 3,
      location: this.state.position,
      systemId: this.state.currentSystem?.id,
      participants: [this.state.shipId],
      description: `Player ${type.toLowerCase().replace(/_/g, ' ')}`,
      data,
      consequences: [],
      witnessed: true,
      priority: 5,
      tags: ['player']
    };

    this.orchestrator.recordEvent(event);
  }

  private getStationService(station: SpaceStation): StationServices {
    if (!this.stationServices.has(station.id)) {
      this.stationServices.set(station.id, new StationServices(station));
    }
    return this.stationServices.get(station.id)!;
  }
}
