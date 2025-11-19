/**
 * NPCTradeIntegration.ts
 * Handles NPC ship trading with real market economy system
 * Validates trades, executes them, updates cargo, and emits events
 */

import { EconomySystem, COMMODITIES } from './EconomySystem';
import { NPCShip, ShipCargo } from './NPCShipAI';
import { SpaceStation } from './StationGenerator';

/**
 * Trade event types
 */
export enum TradeEventType {
  TRADE_COMPLETED = 'TRADE_COMPLETED',
  TRADE_FAILED = 'TRADE_FAILED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  INSUFFICIENT_CARGO_SPACE = 'INSUFFICIENT_CARGO_SPACE',
  INSUFFICIENT_SUPPLY = 'INSUFFICIENT_SUPPLY',
  PRICE_TOO_HIGH = 'PRICE_TOO_HIGH',
  MARKET_NOT_FOUND = 'MARKET_NOT_FOUND'
}

/**
 * Trade event
 */
export interface TradeEvent {
  type: TradeEventType;
  timestamp: number;
  shipId: string;
  stationId: string;
  commodity: string;
  amount: number;
  price: number;
  totalCost: number;
  buying: boolean;
  message: string;
  data?: any;
}

/**
 * Trade validation result
 */
export interface TradeValidationResult {
  valid: boolean;
  reason?: string;
  maxAmount?: number;
  estimatedPrice?: number;
  estimatedTotal?: number;
}

/**
 * Trade execution result
 */
export interface TradeResult {
  success: boolean;
  amount: number;
  price: number;
  total: number;
  profit?: number;
  message: string;
}

/**
 * NPC Trade Integration
 * Manages NPC ship trading with real economy system
 */
export class NPCTradeIntegration {
  private economySystem: EconomySystem;
  private events: TradeEvent[] = [];
  private maxEventHistory: number = 100;

  constructor(economySystem: EconomySystem) {
    this.economySystem = economySystem;
  }

  /**
   * Validate a trade before execution
   */
  validateTrade(
    ship: NPCShip,
    stationId: string,
    commodity: string,
    amount: number,
    buying: boolean
  ): TradeValidationResult {
    // Check if market exists
    const market = this.economySystem.getMarket(stationId);
    if (!market) {
      return {
        valid: false,
        reason: 'Market not found'
      };
    }

    const marketData = market.get(commodity);
    if (!marketData) {
      return {
        valid: false,
        reason: 'Commodity not available in market'
      };
    }

    const commodityDef = COMMODITIES.get(commodity);
    if (!commodityDef) {
      return {
        valid: false,
        reason: 'Unknown commodity'
      };
    }

    if (buying) {
      // Validate BUY trade

      // Check market supply
      if (marketData.supply < amount) {
        return {
          valid: false,
          reason: 'Insufficient market supply',
          maxAmount: marketData.supply,
          estimatedPrice: marketData.price
        };
      }

      // Check ship cargo space
      const usedCargo = ship.cargo.reduce((sum, c) => sum + c.amount * (COMMODITIES.get(c.commodity)?.volume || 1), 0);
      const availableSpace = ship.stats.cargoCapacity - usedCargo;
      const requiredSpace = amount * commodityDef.volume;

      if (requiredSpace > availableSpace) {
        const maxAffordableBySpace = Math.floor(availableSpace / commodityDef.volume);
        return {
          valid: false,
          reason: 'Insufficient cargo space',
          maxAmount: maxAffordableBySpace,
          estimatedPrice: marketData.price
        };
      }

      // Check ship credits
      const totalCost = amount * marketData.price;
      if (ship.credits < totalCost) {
        const maxAffordableByCredits = Math.floor(ship.credits / marketData.price);
        return {
          valid: false,
          reason: 'Insufficient credits',
          maxAmount: maxAffordableByCredits,
          estimatedPrice: marketData.price,
          estimatedTotal: totalCost
        };
      }

      return {
        valid: true,
        estimatedPrice: marketData.price,
        estimatedTotal: totalCost
      };
    } else {
      // Validate SELL trade

      // Check ship has commodity
      const shipCargo = ship.cargo.find(c => c.commodity === commodity);
      if (!shipCargo || shipCargo.amount < amount) {
        return {
          valid: false,
          reason: 'Ship does not have enough commodity to sell',
          maxAmount: shipCargo?.amount || 0,
          estimatedPrice: marketData.price
        };
      }

      return {
        valid: true,
        estimatedPrice: marketData.price,
        estimatedTotal: amount * marketData.price
      };
    }
  }

  /**
   * Buy commodity from station market
   */
  buyFromMarket(
    ship: NPCShip,
    stationId: string,
    commodity: string,
    amount: number
  ): TradeResult {
    // Validate trade
    const validation = this.validateTrade(ship, stationId, commodity, amount, true);

    if (!validation.valid) {
      this.emitEvent({
        type: this.getFailureEventType(validation.reason || 'Unknown'),
        timestamp: Date.now(),
        shipId: ship.id,
        stationId,
        commodity,
        amount,
        price: validation.estimatedPrice || 0,
        totalCost: validation.estimatedTotal || 0,
        buying: true,
        message: validation.reason || 'Trade validation failed'
      });

      return {
        success: false,
        amount: 0,
        price: validation.estimatedPrice || 0,
        total: 0,
        message: validation.reason || 'Trade validation failed'
      };
    }

    // Execute trade via economy system
    const tradeResult = this.economySystem.executeTrade(stationId, commodity, amount, true);

    if (!tradeResult.success) {
      this.emitEvent({
        type: TradeEventType.TRADE_FAILED,
        timestamp: Date.now(),
        shipId: ship.id,
        stationId,
        commodity,
        amount,
        price: tradeResult.price,
        totalCost: tradeResult.total,
        buying: true,
        message: 'Economy system rejected trade'
      });

      return {
        success: false,
        amount: 0,
        price: tradeResult.price,
        total: 0,
        message: 'Economy system rejected trade'
      };
    }

    // Update ship cargo
    const existingCargo = ship.cargo.find(c => c.commodity === commodity);
    if (existingCargo) {
      existingCargo.amount += amount;
      existingCargo.value += tradeResult.total;
    } else {
      ship.cargo.push({
        commodity,
        amount,
        value: tradeResult.total
      });
    }

    // Update ship credits
    ship.credits -= tradeResult.total;

    // Emit success event
    this.emitEvent({
      type: TradeEventType.TRADE_COMPLETED,
      timestamp: Date.now(),
      shipId: ship.id,
      stationId,
      commodity,
      amount,
      price: tradeResult.price,
      totalCost: tradeResult.total,
      buying: true,
      message: `Bought ${amount.toFixed(1)} units of ${commodity} for ${tradeResult.total.toFixed(0)} credits`
    });

    return {
      success: true,
      amount,
      price: tradeResult.price,
      total: tradeResult.total,
      message: `Successfully purchased ${amount.toFixed(1)} units of ${commodity}`
    };
  }

  /**
   * Sell commodity to station market
   */
  sellToMarket(
    ship: NPCShip,
    stationId: string,
    commodity: string,
    amount: number
  ): TradeResult {
    // Validate trade
    const validation = this.validateTrade(ship, stationId, commodity, amount, false);

    if (!validation.valid) {
      this.emitEvent({
        type: this.getFailureEventType(validation.reason || 'Unknown'),
        timestamp: Date.now(),
        shipId: ship.id,
        stationId,
        commodity,
        amount,
        price: validation.estimatedPrice || 0,
        totalCost: validation.estimatedTotal || 0,
        buying: false,
        message: validation.reason || 'Trade validation failed'
      });

      return {
        success: false,
        amount: 0,
        price: validation.estimatedPrice || 0,
        total: 0,
        message: validation.reason || 'Trade validation failed'
      };
    }

    // Get original purchase value for profit calculation
    const shipCargo = ship.cargo.find(c => c.commodity === commodity);
    const originalValue = shipCargo ? (shipCargo.value / shipCargo.amount) * amount : 0;

    // Execute trade via economy system
    const tradeResult = this.economySystem.executeTrade(stationId, commodity, amount, false);

    if (!tradeResult.success) {
      this.emitEvent({
        type: TradeEventType.TRADE_FAILED,
        timestamp: Date.now(),
        shipId: ship.id,
        stationId,
        commodity,
        amount,
        price: tradeResult.price,
        totalCost: tradeResult.total,
        buying: false,
        message: 'Economy system rejected trade'
      });

      return {
        success: false,
        amount: 0,
        price: tradeResult.price,
        total: 0,
        message: 'Economy system rejected trade'
      };
    }

    // Update ship cargo - remove sold items
    if (shipCargo) {
      shipCargo.amount -= amount;
      const valuePerUnit = shipCargo.value / (shipCargo.amount + amount);
      shipCargo.value -= valuePerUnit * amount;

      // Remove cargo entry if amount is 0
      if (shipCargo.amount <= 0.01) {
        const index = ship.cargo.indexOf(shipCargo);
        if (index > -1) {
          ship.cargo.splice(index, 1);
        }
      }
    }

    // Update ship credits
    ship.credits += tradeResult.total;

    // Calculate profit
    const profit = tradeResult.total - originalValue;

    // Emit success event
    this.emitEvent({
      type: TradeEventType.TRADE_COMPLETED,
      timestamp: Date.now(),
      shipId: ship.id,
      stationId,
      commodity,
      amount,
      price: tradeResult.price,
      totalCost: tradeResult.total,
      buying: false,
      message: `Sold ${amount.toFixed(1)} units of ${commodity} for ${tradeResult.total.toFixed(0)} credits (profit: ${profit.toFixed(0)})`,
      data: { profit }
    });

    return {
      success: true,
      amount,
      price: tradeResult.price,
      total: tradeResult.total,
      profit,
      message: `Successfully sold ${amount.toFixed(1)} units of ${commodity} for ${profit.toFixed(0)} credits profit`
    };
  }

  /**
   * Get market price for commodity at station
   */
  getMarketPrice(stationId: string, commodity: string): number {
    return this.economySystem.getPrice(stationId, commodity);
  }

  /**
   * Check if commodity is available at station
   */
  getCommodityAvailability(stationId: string, commodity: string): {
    available: boolean;
    supply: number;
    demand: number;
    price: number;
  } {
    const market = this.economySystem.getMarket(stationId);
    if (!market) {
      return { available: false, supply: 0, demand: 0, price: 0 };
    }

    const marketData = market.get(commodity);
    if (!marketData) {
      return { available: false, supply: 0, demand: 0, price: 0 };
    }

    return {
      available: true,
      supply: marketData.supply,
      demand: marketData.demand,
      price: marketData.price
    };
  }

  /**
   * Find best trade route considering real market data
   */
  findBestTradeRoute(
    ship: NPCShip,
    stations: Map<string, SpaceStation>
  ): { fromStation: string; toStation: string; commodity: string; profit: number; amount: number } | null {
    let bestRoute: { fromStation: string; toStation: string; commodity: string; profit: number; amount: number } | null = null;
    let bestProfit = 0;

    const stationList = Array.from(stations.values());

    for (let i = 0; i < stationList.length; i++) {
      for (let j = 0; j < stationList.length; j++) {
        if (i === j) continue;

        const fromStation = stationList[i];
        const toStation = stationList[j];

        // Check all commodities
        for (const [commodityId] of COMMODITIES) {
          const fromMarket = this.economySystem.getMarket(fromStation.id);
          const toMarket = this.economySystem.getMarket(toStation.id);

          if (!fromMarket || !toMarket) continue;

          const fromData = fromMarket.get(commodityId);
          const toData = toMarket.get(commodityId);

          if (!fromData || !toData) continue;

          // Calculate potential profit
          const buyPrice = fromData.price;
          const sellPrice = toData.price;
          const priceMargin = sellPrice - buyPrice;

          if (priceMargin <= 0) continue;

          // Determine amount we can trade
          const maxBySupply = fromData.supply;
          const maxByDemand = toData.demand;
          const maxByCredits = ship.credits / buyPrice;
          const commodityDef = COMMODITIES.get(commodityId);
          const maxByCargoSpace = commodityDef ? ship.stats.cargoCapacity / commodityDef.volume : 0;

          const tradeAmount = Math.min(maxBySupply, maxByDemand, maxByCredits, maxByCargoSpace);

          if (tradeAmount <= 0) continue;

          const profit = tradeAmount * priceMargin;

          // Factor in distance (simple distance penalty)
          const dx = fromStation.position.x - toStation.position.x;
          const dy = fromStation.position.y - toStation.position.y;
          const dz = fromStation.position.z - toStation.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const distancePenalty = distance / 1e8; // Reduce profit based on distance

          const adjustedProfit = profit - distancePenalty;

          if (adjustedProfit > bestProfit) {
            bestProfit = adjustedProfit;
            bestRoute = {
              fromStation: fromStation.id,
              toStation: toStation.id,
              commodity: commodityId,
              profit: adjustedProfit,
              amount: tradeAmount
            };
          }
        }
      }
    }

    return bestRoute;
  }

  /**
   * Emit a trade event
   */
  private emitEvent(event: TradeEvent): void {
    this.events.push(event);

    // Maintain max history
    if (this.events.length > this.maxEventHistory) {
      this.events.shift();
    }
  }

  /**
   * Get failure event type from reason
   */
  private getFailureEventType(reason: string): TradeEventType {
    if (reason.includes('credit')) return TradeEventType.INSUFFICIENT_CREDITS;
    if (reason.includes('cargo space')) return TradeEventType.INSUFFICIENT_CARGO_SPACE;
    if (reason.includes('supply')) return TradeEventType.INSUFFICIENT_SUPPLY;
    if (reason.includes('Market not found')) return TradeEventType.MARKET_NOT_FOUND;
    return TradeEventType.TRADE_FAILED;
  }

  /**
   * Get recent trade events
   */
  getRecentEvents(limit: number = 20): TradeEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for specific ship
   */
  getShipEvents(shipId: string, limit: number = 20): TradeEvent[] {
    return this.events
      .filter(e => e.shipId === shipId)
      .slice(-limit);
  }

  /**
   * Get successful trades count
   */
  getSuccessfulTradesCount(): number {
    return this.events.filter(e => e.type === TradeEventType.TRADE_COMPLETED).length;
  }

  /**
   * Get total trade volume (credits)
   */
  getTotalTradeVolume(): number {
    return this.events
      .filter(e => e.type === TradeEventType.TRADE_COMPLETED)
      .reduce((sum, e) => sum + e.totalCost, 0);
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.events = [];
  }
}
