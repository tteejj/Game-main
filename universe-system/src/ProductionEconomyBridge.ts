/**
 * ProductionEconomyBridge.ts
 * Manages commodity transfers between ManufacturingSystem and EconomySystem
 * Bridges the gap between CommodityType enum and economy string IDs
 */

import { CommodityType, getCommodity } from './economy/commodity';
import { EconomySystem } from './EconomySystem';
import { ManufacturingSystem, ManufacturingFacility, ProductionJob } from './ManufacturingSystem';

/**
 * Maps CommodityType enum to EconomySystem's string-based commodity IDs
 */
export const COMMODITY_TYPE_TO_ECONOMY_ID: Map<CommodityType, string> = new Map([
  // Fuels
  [CommodityType.HYDROGEN_FUEL, 'fuel'],
  [CommodityType.OXYGEN, 'oxygen'],
  [CommodityType.WATER, 'water'],

  // Raw Materials / Minerals
  [CommodityType.METALLIC_ORE, 'iron'],
  [CommodityType.ROCKY_ORE, 'iron'],
  [CommodityType.RARE_EARTH, 'rare_earth'],
  [CommodityType.URANIUM, 'uranium'],

  // Food & Supplies
  [CommodityType.FOOD, 'food'],
  [CommodityType.MEDICAL_SUPPLIES, 'medicine'],

  // Technology & Manufactured
  [CommodityType.ELECTRONICS, 'electronics'],
  [CommodityType.WEAPONS, 'weapons'],

  // Luxury
  [CommodityType.JEWELRY, 'luxury_goods'],
  [CommodityType.ART, 'luxury_goods'],
  [CommodityType.ENTERTAINMENT, 'luxury_goods'],
]);

/**
 * Production event types
 */
export enum ProductionEventType {
  MANUFACTURING_COMPLETE = 'MANUFACTURING_COMPLETE',
  MANUFACTURING_STARTED = 'MANUFACTURING_STARTED',
  RESOURCE_SHORTAGE = 'RESOURCE_SHORTAGE',
  MARKET_SALE_COMPLETE = 'MARKET_SALE_COMPLETE',
  MARKET_PURCHASE_COMPLETE = 'MARKET_PURCHASE_COMPLETE',
  PRODUCTION_CHAIN_COMPLETE = 'PRODUCTION_CHAIN_COMPLETE',
  BOTTLENECK_DETECTED = 'BOTTLENECK_DETECTED'
}

/**
 * Production event
 */
export interface ProductionEvent {
  type: ProductionEventType;
  timestamp: number;
  stationId: string;
  facilityId?: string;
  jobId?: string;
  commodity?: CommodityType;
  amount?: number;
  message: string;
  data?: any;
}

/**
 * Resource bottleneck tracking
 */
export interface ResourceBottleneck {
  commodity: CommodityType;
  stationId: string;
  requiredAmount: number;
  availableAmount: number;
  affectedJobs: string[];
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

/**
 * Production chain tracking
 */
export interface ProductionChainStatus {
  stationId: string;
  inputsRequired: Map<CommodityType, number>;
  inputsAvailable: Map<CommodityType, number>;
  outputsProduced: Map<CommodityType, number>;
  outputsInMarket: Map<CommodityType, number>;
  bottlenecks: ResourceBottleneck[];
  efficiency: number;
}

/**
 * Bridge between Manufacturing and Economy systems
 */
export class ProductionEconomyBridge {
  private economySystem: EconomySystem;
  private manufacturingSystem: ManufacturingSystem;
  private events: ProductionEvent[] = [];
  private bottlenecks: Map<string, ResourceBottleneck> = new Map();
  private maxEventHistory: number = 100;

  constructor(economySystem: EconomySystem, manufacturingSystem: ManufacturingSystem) {
    this.economySystem = economySystem;
    this.manufacturingSystem = manufacturingSystem;
  }

  /**
   * Check if inputs are available in station market
   */
  checkInputsAvailable(
    stationId: string,
    inputs: Map<CommodityType, number>
  ): { available: boolean; missing: Map<CommodityType, number>; details: string[] } {
    const missing = new Map<CommodityType, number>();
    const details: string[] = [];

    for (const [commodityType, requiredAmount] of inputs) {
      const economyId = COMMODITY_TYPE_TO_ECONOMY_ID.get(commodityType);

      if (!economyId) {
        // Commodity not tradeable in economy, skip check
        details.push(`${commodityType}: Not traded in economy (facility inventory only)`);
        continue;
      }

      const market = this.economySystem.getMarket(stationId);
      if (!market) {
        details.push(`${commodityType}: No market data available`);
        missing.set(commodityType, requiredAmount);
        continue;
      }

      const marketData = market.get(economyId);
      if (!marketData) {
        details.push(`${commodityType}: Not available in market`);
        missing.set(commodityType, requiredAmount);
        continue;
      }

      // Convert kg to economy units (economy uses different scale)
      const requiredUnits = this.convertKgToEconomyUnits(requiredAmount);

      if (marketData.supply < requiredUnits) {
        const shortage = requiredAmount - this.convertEconomyUnitsToKg(marketData.supply);
        missing.set(commodityType, shortage);
        details.push(
          `${commodityType}: Short ${shortage.toFixed(1)}kg (need ${requiredAmount.toFixed(1)}kg, have ${this.convertEconomyUnitsToKg(marketData.supply).toFixed(1)}kg)`
        );
      } else {
        details.push(
          `${commodityType}: Available ${this.convertEconomyUnitsToKg(marketData.supply).toFixed(1)}kg (need ${requiredAmount.toFixed(1)}kg)`
        );
      }
    }

    return {
      available: missing.size === 0,
      missing,
      details
    };
  }

  /**
   * Consume inputs from station market
   */
  consumeInputs(
    stationId: string,
    facilityId: string,
    inputs: Map<CommodityType, number>
  ): { success: boolean; consumed: Map<CommodityType, number>; cost: number; message: string } {
    const consumed = new Map<CommodityType, number>();
    let totalCost = 0;
    const errors: string[] = [];

    // First, check all inputs are available
    const check = this.checkInputsAvailable(stationId, inputs);
    if (!check.available) {
      this.emitEvent({
        type: ProductionEventType.RESOURCE_SHORTAGE,
        timestamp: Date.now(),
        stationId,
        facilityId,
        message: `Resource shortage: ${Array.from(check.missing.keys()).join(', ')}`,
        data: { missing: Array.from(check.missing.entries()) }
      });

      // Track bottleneck
      for (const [commodity, shortage] of check.missing) {
        this.trackBottleneck(stationId, commodity, shortage, facilityId);
      }

      return {
        success: false,
        consumed: new Map(),
        cost: 0,
        message: `Resource shortage: ${check.details.join('; ')}`
      };
    }

    // Execute purchases
    for (const [commodityType, amount] of inputs) {
      const economyId = COMMODITY_TYPE_TO_ECONOMY_ID.get(commodityType);

      if (!economyId) {
        // Not traded in economy, consume from facility inventory instead
        const success = this.manufacturingSystem.removeFromInventory(facilityId, commodityType, amount);
        if (success) {
          consumed.set(commodityType, amount);
        } else {
          errors.push(`Failed to consume ${commodityType} from facility inventory`);
        }
        continue;
      }

      const units = this.convertKgToEconomyUnits(amount);
      const result = this.economySystem.executeTrade(stationId, economyId, units, true);

      if (result.success) {
        consumed.set(commodityType, amount);
        totalCost += result.total;

        this.emitEvent({
          type: ProductionEventType.MARKET_PURCHASE_COMPLETE,
          timestamp: Date.now(),
          stationId,
          facilityId,
          commodity: commodityType,
          amount,
          message: `Purchased ${amount.toFixed(1)}kg ${commodityType} for ${result.total.toFixed(0)} credits`,
          data: { price: result.price, units }
        });
      } else {
        errors.push(`Failed to purchase ${commodityType}: ${amount.toFixed(1)}kg`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        consumed,
        cost: totalCost,
        message: errors.join('; ')
      };
    }

    return {
      success: true,
      consumed,
      cost: totalCost,
      message: `Consumed inputs: ${consumed.size} commodities, ${totalCost.toFixed(0)} credits`
    };
  }

  /**
   * Produce outputs to station market
   */
  produceOutputs(
    stationId: string,
    facilityId: string,
    outputs: Map<CommodityType, number>
  ): { success: boolean; produced: Map<CommodityType, number>; revenue: number; message: string } {
    const produced = new Map<CommodityType, number>();
    let totalRevenue = 0;
    const errors: string[] = [];

    for (const [commodityType, amount] of outputs) {
      const economyId = COMMODITY_TYPE_TO_ECONOMY_ID.get(commodityType);

      if (!economyId) {
        // Not traded in economy, add to facility inventory instead
        this.manufacturingSystem.addToInventory(facilityId, commodityType, amount);
        produced.set(commodityType, amount);
        continue;
      }

      const units = this.convertKgToEconomyUnits(amount);
      const result = this.economySystem.executeTrade(stationId, economyId, units, false);

      if (result.success) {
        produced.set(commodityType, amount);
        totalRevenue += result.total;

        this.emitEvent({
          type: ProductionEventType.MARKET_SALE_COMPLETE,
          timestamp: Date.now(),
          stationId,
          facilityId,
          commodity: commodityType,
          amount,
          message: `Sold ${amount.toFixed(1)}kg ${commodityType} for ${result.total.toFixed(0)} credits`,
          data: { price: result.price, units }
        });
      } else {
        // Market rejected, store in facility inventory
        this.manufacturingSystem.addToInventory(facilityId, commodityType, amount);
        produced.set(commodityType, amount);
        errors.push(`Market rejected ${commodityType}, stored in facility`);
      }
    }

    return {
      success: errors.length === 0,
      produced,
      revenue: totalRevenue,
      message: errors.length > 0
        ? errors.join('; ')
        : `Produced outputs: ${produced.size} commodities, ${totalRevenue.toFixed(0)} credits revenue`
    };
  }

  /**
   * Validate production can start (inputs available)
   */
  validateProduction(
    stationId: string,
    inputs: Map<CommodityType, number>
  ): { valid: boolean; message: string; details: string[] } {
    const check = this.checkInputsAvailable(stationId, inputs);

    return {
      valid: check.available,
      message: check.available
        ? 'All inputs available'
        : `Missing inputs: ${Array.from(check.missing.keys()).join(', ')}`,
      details: check.details
    };
  }

  /**
   * Get production chain status for a station
   */
  getProductionChainStatus(stationId: string): ProductionChainStatus {
    const facilities = this.manufacturingSystem.getFacilitiesByStation(stationId);

    const inputsRequired = new Map<CommodityType, number>();
    const inputsAvailable = new Map<CommodityType, number>();
    const outputsProduced = new Map<CommodityType, number>();
    const outputsInMarket = new Map<CommodityType, number>();

    // Aggregate from all facilities
    for (const facility of facilities) {
      // Check facility inventories
      for (const [commodity, amount] of facility.inventory) {
        const existing = inputsAvailable.get(commodity) || 0;
        inputsAvailable.set(commodity, existing + amount);
      }
    }

    // Get market status
    const market = this.economySystem.getMarket(stationId);
    if (market) {
      for (const [economyId, marketData] of market) {
        // Find corresponding CommodityType
        for (const [commodityType, econId] of COMMODITY_TYPE_TO_ECONOMY_ID) {
          if (econId === economyId) {
            const amountKg = this.convertEconomyUnitsToKg(marketData.supply);
            outputsInMarket.set(commodityType, amountKg);
          }
        }
      }
    }

    // Get active bottlenecks for this station
    const bottlenecks = Array.from(this.bottlenecks.values())
      .filter(b => b.stationId === stationId);

    // Calculate efficiency (simple: available / required)
    let totalRequired = 0;
    let totalAvailable = 0;
    for (const [commodity, required] of inputsRequired) {
      totalRequired += required;
      totalAvailable += inputsAvailable.get(commodity) || 0;
    }
    const efficiency = totalRequired > 0 ? totalAvailable / totalRequired : 1.0;

    return {
      stationId,
      inputsRequired,
      inputsAvailable,
      outputsProduced,
      outputsInMarket,
      bottlenecks,
      efficiency
    };
  }

  /**
   * Track a resource bottleneck
   */
  private trackBottleneck(
    stationId: string,
    commodity: CommodityType,
    shortage: number,
    facilityId: string
  ): void {
    const key = `${stationId}-${commodity}`;

    const existing = this.bottlenecks.get(key);
    if (existing) {
      existing.affectedJobs.push(facilityId);
      existing.requiredAmount += shortage;
    } else {
      const severity = this.calculateBottleneckSeverity(shortage);
      this.bottlenecks.set(key, {
        commodity,
        stationId,
        requiredAmount: shortage,
        availableAmount: 0,
        affectedJobs: [facilityId],
        severity
      });

      this.emitEvent({
        type: ProductionEventType.BOTTLENECK_DETECTED,
        timestamp: Date.now(),
        stationId,
        commodity,
        amount: shortage,
        message: `Bottleneck detected: ${commodity} shortage of ${shortage.toFixed(1)}kg`,
        data: { severity }
      });
    }
  }

  /**
   * Calculate bottleneck severity
   */
  private calculateBottleneckSeverity(shortage: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    if (shortage < 100) return 'LOW';
    if (shortage < 500) return 'MODERATE';
    if (shortage < 1000) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Clear bottleneck when resolved
   */
  clearBottleneck(stationId: string, commodity: CommodityType): void {
    const key = `${stationId}-${commodity}`;
    this.bottlenecks.delete(key);
  }

  /**
   * Get all active bottlenecks
   */
  getBottlenecks(): ResourceBottleneck[] {
    return Array.from(this.bottlenecks.values());
  }

  /**
   * Get bottlenecks for a specific station
   */
  getStationBottlenecks(stationId: string): ResourceBottleneck[] {
    return Array.from(this.bottlenecks.values())
      .filter(b => b.stationId === stationId);
  }

  /**
   * Emit a production event
   */
  private emitEvent(event: ProductionEvent): void {
    this.events.push(event);

    // Maintain max history
    if (this.events.length > this.maxEventHistory) {
      this.events.shift();
    }

    console.log(`[PRODUCTION_EVENT] ${event.type}: ${event.message}`);
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 20): ProductionEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: ProductionEventType, limit: number = 20): ProductionEvent[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit);
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Convert kg to economy units
   * Economy system uses different scale (1 unit ≈ 1000kg for most commodities)
   */
  private convertKgToEconomyUnits(kg: number): number {
    return kg / 1000; // 1 economy unit = 1 ton = 1000kg
  }

  /**
   * Convert economy units to kg
   */
  private convertEconomyUnitsToKg(units: number): number {
    return units * 1000; // 1 economy unit = 1 ton = 1000kg
  }

  /**
   * Get current market price for a commodity
   */
  getMarketPrice(stationId: string, commodity: CommodityType): number {
    const economyId = COMMODITY_TYPE_TO_ECONOMY_ID.get(commodity);
    if (!economyId) return 0;

    return this.economySystem.getPrice(stationId, economyId);
  }

  /**
   * Estimate production profitability
   */
  estimateProductionProfit(
    stationId: string,
    inputs: Map<CommodityType, number>,
    outputs: Map<CommodityType, number>
  ): { profit: number; inputCost: number; outputValue: number; margin: number } {
    let inputCost = 0;
    let outputValue = 0;

    // Calculate input cost
    for (const [commodity, amount] of inputs) {
      const price = this.getMarketPrice(stationId, commodity);
      const units = this.convertKgToEconomyUnits(amount);
      inputCost += price * units;
    }

    // Calculate output value
    for (const [commodity, amount] of outputs) {
      const price = this.getMarketPrice(stationId, commodity);
      const units = this.convertKgToEconomyUnits(amount);
      outputValue += price * units;
    }

    const profit = outputValue - inputCost;
    const margin = inputCost > 0 ? (profit / inputCost) * 100 : 0;

    return { profit, inputCost, outputValue, margin };
  }
}
