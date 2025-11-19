/**
 * StationServices - Complete station interaction system
 * Handles docking, refueling, repair, trading, missions, crew management
 */

import { SpaceStation } from './StationGenerator';
import { Spacecraft } from '../physics-modules/src/spacecraft';
import { Vector3 } from './CelestialBody';

export interface DockingRequest {
  shipId: string;
  shipName: string;
  shipMass: number;
  dockingPortPreference?: number;
  emergencyDocking?: boolean;
  creditBalance: number;
}

export interface DockingResponse {
  approved: boolean;
  portAssigned?: number;
  fee: number;
  reason?: string;
  waitTime?: number;
}

export interface RefuelService {
  fuelType: 'HYDROGEN' | 'DEUTERIUM' | 'ANTIMATTER' | 'CHEMICAL';
  available: number;
  pricePerKg: number;
  refuelRate: number; // kg/s
}

export interface RepairService {
  available: boolean;
  hullRepairCost: number; // credits per %
  systemRepairCost: number; // credits per system
  repairTimeEstimate: number; // seconds
  capabilities: string[];
}

export interface CargoTransaction {
  commodity: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  tax: number;
}

export interface StationServiceMenu {
  stationId: string;
  stationName: string;

  // Services available
  dockingAvailable: boolean;
  refuelingAvailable: boolean;
  repairAvailable: boolean;
  tradingAvailable: boolean;
  missionsAvailable: boolean;
  crewHiringAvailable: boolean;

  // Prices
  dockingFee: number;
  refuelServices: RefuelService[];
  repairService: RepairService;

  // Trading
  buyPrices: Map<string, number>;
  sellPrices: Map<string, number>;
  inventory: Map<string, number>;

  // Restrictions
  reputationRequired: number;
  factionRequired?: string;
  restricted: boolean;
}

export class StationServices {
  private station: SpaceStation;
  private dockedShips: Map<number, string> = new Map(); // port -> shipId
  private activeTransactions: Map<string, CargoTransaction[]> = new Map();

  constructor(station: SpaceStation) {
    this.station = station;
  }

  /**
   * Request docking permission
   */
  public requestDocking(request: DockingRequest): DockingResponse {
    // Check if station allows docking
    if (!this.station.services?.includes('DOCKING')) {
      return {
        approved: false,
        fee: 0,
        reason: 'Station does not offer docking services'
      };
    }

    // Check reputation
    const requiredRep = (this.station as any).reputationRequired || 0;
    const playerRep = this.getPlayerReputation(request.shipId);

    if (playerRep < requiredRep) {
      return {
        approved: false,
        fee: 0,
        reason: `Insufficient reputation. Required: ${requiredRep}, Current: ${playerRep}`
      };
    }

    // Find available port
    const availablePort = this.findAvailablePort();
    if (availablePort === -1) {
      return {
        approved: false,
        fee: 0,
        reason: 'No docking ports available',
        waitTime: this.estimateWaitTime()
      };
    }

    // Calculate fee
    const baseFee = this.station.dockingFee || 100;
    const massFee = request.shipMass * 0.1;
    const emergencyMultiplier = request.emergencyDocking ? 3 : 1;
    const fee = (baseFee + massFee) * emergencyMultiplier;

    // Check if can afford
    if (request.creditBalance < fee) {
      return {
        approved: false,
        fee: fee,
        reason: `Insufficient credits. Fee: ${fee}, Balance: ${request.creditBalance}`
      };
    }

    // Approve
    this.dockedShips.set(availablePort, request.shipId);

    return {
      approved: true,
      portAssigned: availablePort,
      fee: fee
    };
  }

  /**
   * Undock from station
   */
  public undock(shipId: string): boolean {
    for (const [port, docked] of this.dockedShips.entries()) {
      if (docked === shipId) {
        this.dockedShips.delete(port);
        return true;
      }
    }
    return false;
  }

  /**
   * Get available services menu
   */
  public getServiceMenu(shipId: string, playerReputation: number): StationServiceMenu {
    const isDocked = Array.from(this.dockedShips.values()).includes(shipId);

    return {
      stationId: this.station.id,
      stationName: this.station.name,

      dockingAvailable: this.station.services?.includes('DOCKING') || false,
      refuelingAvailable: isDocked && (this.station.services?.includes('REFUEL') || false),
      repairAvailable: isDocked && (this.station.services?.includes('REPAIR') || false),
      tradingAvailable: isDocked && (this.station.services?.includes('TRADING') || false),
      missionsAvailable: isDocked && (this.station.services?.includes('MISSIONS') || false),
      crewHiringAvailable: isDocked && (this.station.services?.includes('CREW') || false),

      dockingFee: this.station.dockingFee || 100,
      refuelServices: this.getRefuelOptions(),
      repairService: this.getRepairOptions(),

      buyPrices: this.getBuyPrices(),
      sellPrices: this.getSellPrices(),
      inventory: this.getInventory(),

      reputationRequired: (this.station as any).reputationRequired || 0,
      factionRequired: this.station.faction,
      restricted: playerReputation < ((this.station as any).reputationRequired || 0)
    };
  }

  /**
   * Refuel ship
   */
  public refuel(shipId: string, fuelType: string, amount: number, credits: number): {
    success: boolean;
    amountRefueled: number;
    cost: number;
    remainingCredits: number;
    reason?: string;
  } {
    if (!this.isShipDocked(shipId)) {
      return {
        success: false,
        amountRefueled: 0,
        cost: 0,
        remainingCredits: credits,
        reason: 'Ship must be docked to refuel'
      };
    }

    const service = this.getRefuelOptions().find(s => s.fuelType === fuelType);
    if (!service) {
      return {
        success: false,
        amountRefueled: 0,
        cost: 0,
        remainingCredits: credits,
        reason: `Fuel type ${fuelType} not available`
      };
    }

    const availableAmount = Math.min(amount, service.available);
    const cost = availableAmount * service.pricePerKg;

    if (cost > credits) {
      const affordableAmount = Math.floor(credits / service.pricePerKg);
      return {
        success: true,
        amountRefueled: affordableAmount,
        cost: affordableAmount * service.pricePerKg,
        remainingCredits: credits - (affordableAmount * service.pricePerKg),
        reason: 'Partial refuel - insufficient credits'
      };
    }

    // Update station inventory
    if (this.station.economy) {
      const inv = (this.station.economy as any).inventory || {};
      inv[fuelType] = (inv[fuelType] || 0) - availableAmount;
      (this.station.economy as any).inventory = inv;
    }

    return {
      success: true,
      amountRefueled: availableAmount,
      cost: cost,
      remainingCredits: credits - cost
    };
  }

  /**
   * Repair ship
   */
  public repair(shipId: string, repairType: 'HULL' | 'SYSTEM', systemName: string | null, credits: number): {
    success: boolean;
    cost: number;
    repairAmount: number;
    timeRequired: number;
    remainingCredits: number;
    reason?: string;
  } {
    if (!this.isShipDocked(shipId)) {
      return {
        success: false,
        cost: 0,
        repairAmount: 0,
        timeRequired: 0,
        remainingCredits: credits,
        reason: 'Ship must be docked for repairs'
      };
    }

    const service = this.getRepairOptions();
    if (!service.available) {
      return {
        success: false,
        cost: 0,
        repairAmount: 0,
        timeRequired: 0,
        remainingCredits: credits,
        reason: 'Repair services not available at this station'
      };
    }

    if (repairType === 'HULL') {
      // Assume 50% hull damage for demo
      const damagePercent = 50;
      const cost = damagePercent * service.hullRepairCost;
      const time = damagePercent * 10; // 10 seconds per %

      if (cost > credits) {
        return {
          success: false,
          cost: cost,
          repairAmount: 0,
          timeRequired: time,
          remainingCredits: credits,
          reason: `Insufficient credits. Cost: ${cost}, Balance: ${credits}`
        };
      }

      return {
        success: true,
        cost: cost,
        repairAmount: damagePercent,
        timeRequired: time,
        remainingCredits: credits - cost
      };
    } else {
      // System repair
      const cost = service.systemRepairCost;
      const time = 300; // 5 minutes

      if (!systemName) {
        return {
          success: false,
          cost: 0,
          repairAmount: 0,
          timeRequired: 0,
          remainingCredits: credits,
          reason: 'Must specify system to repair'
        };
      }

      if (cost > credits) {
        return {
          success: false,
          cost: cost,
          repairAmount: 0,
          timeRequired: time,
          remainingCredits: credits,
          reason: `Insufficient credits. Cost: ${cost}, Balance: ${credits}`
        };
      }

      return {
        success: true,
        cost: cost,
        repairAmount: 100,
        timeRequired: time,
        remainingCredits: credits - cost
      };
    }
  }

  /**
   * Buy cargo from station
   */
  public buyCargo(shipId: string, commodity: string, quantity: number, credits: number): {
    success: boolean;
    transaction?: CargoTransaction;
    remainingCredits: number;
    reason?: string;
  } {
    if (!this.isShipDocked(shipId)) {
      return {
        success: false,
        remainingCredits: credits,
        reason: 'Ship must be docked to trade'
      };
    }

    const prices = this.getBuyPrices();
    const inventory = this.getInventory();

    const price = prices.get(commodity);
    if (!price) {
      return {
        success: false,
        remainingCredits: credits,
        reason: `Commodity ${commodity} not available for sale`
      };
    }

    const available = inventory.get(commodity) || 0;
    if (available < quantity) {
      return {
        success: false,
        remainingCredits: credits,
        reason: `Only ${available} units available`
      };
    }

    const totalCost = price * quantity;
    const tax = totalCost * 0.05; // 5% tax
    const finalCost = totalCost + tax;

    if (finalCost > credits) {
      return {
        success: false,
        remainingCredits: credits,
        reason: `Insufficient credits. Cost: ${finalCost.toFixed(2)}, Balance: ${credits}`
      };
    }

    // Update station inventory
    if (this.station.economy) {
      const inv = (this.station.economy as any).inventory || {};
      inv[commodity] = (inv[commodity] || 0) - quantity;
      (this.station.economy as any).inventory = inv;
    }

    const transaction: CargoTransaction = {
      commodity,
      quantity,
      pricePerUnit: price,
      totalPrice: totalCost,
      tax
    };

    return {
      success: true,
      transaction,
      remainingCredits: credits - finalCost
    };
  }

  /**
   * Sell cargo to station
   */
  public sellCargo(shipId: string, commodity: string, quantity: number): {
    success: boolean;
    transaction?: CargoTransaction;
    creditsEarned: number;
    reason?: string;
  } {
    if (!this.isShipDocked(shipId)) {
      return {
        success: false,
        creditsEarned: 0,
        reason: 'Ship must be docked to trade'
      };
    }

    const prices = this.getSellPrices();
    const price = prices.get(commodity);

    if (!price) {
      return {
        success: false,
        creditsEarned: 0,
        reason: `Station does not buy ${commodity}`
      };
    }

    const totalValue = price * quantity;
    const tax = totalValue * 0.05;
    const finalPayout = totalValue - tax;

    // Update station inventory
    if (this.station.economy) {
      const inv = (this.station.economy as any).inventory || {};
      inv[commodity] = (inv[commodity] || 0) + quantity;
      (this.station.economy as any).inventory = inv;
    }

    const transaction: CargoTransaction = {
      commodity,
      quantity,
      pricePerUnit: price,
      totalPrice: totalValue,
      tax
    };

    return {
      success: true,
      transaction,
      creditsEarned: finalPayout
    };
  }

  // Private helpers
  private findAvailablePort(): number {
    const totalPorts = this.station.dockingPorts || 8;
    for (let i = 0; i < totalPorts; i++) {
      if (!this.dockedShips.has(i)) {
        return i;
      }
    }
    return -1;
  }

  private estimateWaitTime(): number {
    return 300 + Math.random() * 600; // 5-15 minutes
  }

  private isShipDocked(shipId: string): boolean {
    return Array.from(this.dockedShips.values()).includes(shipId);
  }

  private getPlayerReputation(shipId: string): number {
    // Would integrate with faction system
    return 0;
  }

  private getRefuelOptions(): RefuelService[] {
    const inv = (this.station.economy as any)?.inventory || {};

    return [
      {
        fuelType: 'HYDROGEN',
        available: inv['HYDROGEN'] || 10000,
        pricePerKg: 2.5,
        refuelRate: 100
      },
      {
        fuelType: 'DEUTERIUM',
        available: inv['DEUTERIUM'] || 5000,
        pricePerKg: 15.0,
        refuelRate: 50
      }
    ];
  }

  private getRepairOptions(): RepairService {
    const hasRepair = this.station.services?.includes('REPAIR');

    return {
      available: hasRepair || false,
      hullRepairCost: 50, // per %
      systemRepairCost: 1000,
      repairTimeEstimate: 300,
      capabilities: hasRepair ? ['HULL', 'SYSTEMS', 'ELECTRONICS'] : []
    };
  }

  private getBuyPrices(): Map<string, number> {
    const prices = new Map<string, number>();
    const stationPrices = (this.station.economy as any)?.prices || {};

    for (const [commodity, price] of Object.entries(stationPrices)) {
      prices.set(commodity, (price as number) * 1.2); // 20% markup for buying
    }

    return prices;
  }

  private getSellPrices(): Map<string, number> {
    const prices = new Map<string, number>();
    const stationPrices = (this.station.economy as any)?.prices || {};

    for (const [commodity, price] of Object.entries(stationPrices)) {
      prices.set(commodity, (price as number) * 0.8); // 20% markdown when selling to station
    }

    return prices;
  }

  private getInventory(): Map<string, number> {
    const inv = new Map<string, number>();
    const stationInv = (this.station.economy as any)?.inventory || {};

    for (const [commodity, amount] of Object.entries(stationInv)) {
      inv.set(commodity, amount as number);
    }

    return inv;
  }
}
