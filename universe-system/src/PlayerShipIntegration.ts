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

  constructor(spacecraft: Spacecraft, orchestrator: UniverseOrchestrator, initialSystem: StarSystem) {
    this.spacecraft = spacecraft;
    this.orchestrator = orchestrator;

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
  public update(deltaTime: number): void {
    // Update position from spacecraft
    this.updatePosition();

    // Find nearest station
    this.updateNearestStation();

    // Update discoveries
    this.updateDiscoveries();

    // Receive universe news
    this.updateNews();

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
