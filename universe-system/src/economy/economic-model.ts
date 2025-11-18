/**
 * economic-model.ts
 * Supply/demand economic model with price calculations
 *
 * Implements:
 * - Supply and demand curves
 * - Dynamic price calculations
 * - Price elasticity
 * - Market equilibrium
 */

import { CommodityType, getCommodity } from './commodity';

/**
 * Market listing for a commodity
 */
export interface MarketListing {
  commodity: CommodityType;
  supply: number; // tons available
  demand: number; // tons wanted
  currentPrice: number; // credits per ton
  basePrice: number; // reference price
  priceChange24h: number; // percentage change
  volatility: number; // 0-1
}

/**
 * Economic transaction
 */
export interface Transaction {
  commodity: CommodityType;
  quantity: number; // tons
  pricePerTon: number;
  totalCost: number;
  buyerId: string;
  sellerId: string;
  timestamp: number;
}

/**
 * Economic Model
 *
 * Calculates prices based on supply and demand using:
 * P = P_base × (demand / supply)^elasticity
 *
 * Where:
 * - P_base: Base price of commodity
 * - demand: Market demand (tons)
 * - supply: Market supply (tons)
 * - elasticity: Price elasticity (typically 0.5-2.0)
 */
export class EconomicModel {
  private priceElasticity: number = 1.0; // Default elasticity
  private minPriceMultiplier: number = 0.1; // Prices won't drop below 10% of base
  private maxPriceMultiplier: number = 10.0; // Prices won't exceed 1000% of base
  private randomNoiseLevel: number = 0.05; // 5% random price fluctuation

  /**
   * Calculate price based on supply and demand
   *
   * P = P_base × (demand / supply)^elasticity
   *
   * Special cases:
   * - If supply = 0: Price = max price
   * - If demand = 0: Price = min price
   * - Add random noise for realism
   */
  public calculatePrice(
    commodity: CommodityType,
    supply: number,
    demand: number,
    customElasticity?: number
  ): number {
    const commodityDef = getCommodity(commodity);
    const basePrice = commodityDef.basePrice;
    const elasticity = customElasticity || this.priceElasticity;

    // Handle edge cases
    if (supply <= 0 && demand > 0) {
      // No supply, infinite demand = maximum price
      return basePrice * this.maxPriceMultiplier;
    }

    if (demand <= 0) {
      // No demand = minimum price
      return basePrice * this.minPriceMultiplier;
    }

    if (supply <= 0) {
      // No supply, no demand = base price
      return basePrice;
    }

    // Calculate price using supply/demand ratio
    const ratio = demand / supply;
    let priceMultiplier = Math.pow(ratio, elasticity);

    // Clamp to reasonable range
    priceMultiplier = Math.max(this.minPriceMultiplier, Math.min(this.maxPriceMultiplier, priceMultiplier));

    // Base price calculation
    let price = basePrice * priceMultiplier;

    // Add random noise based on volatility
    const noise = (Math.random() - 0.5) * 2 * this.randomNoiseLevel;
    price *= 1 + noise * commodityDef.priceVolatility;

    return Math.max(1, Math.round(price)); // Minimum 1 credit
  }

  /**
   * Calculate market equilibrium
   *
   * Finds the price where supply equals demand
   */
  public calculateEquilibrium(
    commodity: CommodityType,
    maxSupply: number,
    maxDemand: number
  ): {
    equilibriumPrice: number;
    equilibriumQuantity: number;
  } {
    const commodityDef = getCommodity(commodity);
    const basePrice = commodityDef.basePrice;

    // Simplified equilibrium: average of supply and demand
    const equilibriumQuantity = (maxSupply + maxDemand) / 2;
    const equilibriumPrice = this.calculatePrice(commodity, equilibriumQuantity, equilibriumQuantity);

    return {
      equilibriumPrice,
      equilibriumQuantity
    };
  }

  /**
   * Calculate profit from trade
   *
   * @param commodity Commodity type
   * @param quantity Amount to trade (tons)
   * @param buyPrice Price per ton when buying
   * @param sellPrice Price per ton when selling
   * @returns Net profit (negative if loss)
   */
  public calculateProfit(
    commodity: CommodityType,
    quantity: number,
    buyPrice: number,
    sellPrice: number
  ): number {
    const buyCost = quantity * buyPrice;
    const sellRevenue = quantity * sellPrice;
    return sellRevenue - buyCost;
  }

  /**
   * Calculate profit margin
   *
   * @returns Percentage profit margin (0-100)
   */
  public calculateProfitMargin(buyPrice: number, sellPrice: number): number {
    if (buyPrice <= 0) return 0;
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }

  /**
   * Simulate price change over time
   *
   * Prices drift toward equilibrium plus random walk
   */
  public simulatePriceChange(
    currentPrice: number,
    equilibriumPrice: number,
    deltaTime: number,
    volatility: number = 0.5
  ): number {
    // Drift toward equilibrium (mean reversion)
    const driftRate = 0.1; // 10% per time unit
    const drift = (equilibriumPrice - currentPrice) * driftRate * deltaTime;

    // Random walk (Brownian motion)
    const randomWalk = (Math.random() - 0.5) * volatility * currentPrice * Math.sqrt(deltaTime);

    return currentPrice + drift + randomWalk;
  }

  /**
   * Calculate supply shock impact
   *
   * When supply suddenly changes (e.g., mine discovered, factory destroyed)
   */
  public calculateSupplyShock(
    commodity: CommodityType,
    currentSupply: number,
    currentDemand: number,
    supplyChange: number
  ): {
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    percentageChange: number;
  } {
    const oldPrice = this.calculatePrice(commodity, currentSupply, currentDemand);
    const newSupply = Math.max(0, currentSupply + supplyChange);
    const newPrice = this.calculatePrice(commodity, newSupply, currentDemand);

    return {
      oldPrice,
      newPrice,
      priceChange: newPrice - oldPrice,
      percentageChange: ((newPrice - oldPrice) / oldPrice) * 100
    };
  }

  /**
   * Calculate demand shock impact
   *
   * When demand suddenly changes (e.g., war breaks out, colony established)
   */
  public calculateDemandShock(
    commodity: CommodityType,
    currentSupply: number,
    currentDemand: number,
    demandChange: number
  ): {
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    percentageChange: number;
  } {
    const oldPrice = this.calculatePrice(commodity, currentSupply, currentDemand);
    const newDemand = Math.max(0, currentDemand + demandChange);
    const newPrice = this.calculatePrice(commodity, currentSupply, newDemand);

    return {
      oldPrice,
      newPrice,
      priceChange: newPrice - oldPrice,
      percentageChange: ((newPrice - oldPrice) / oldPrice) * 100
    };
  }

  /**
   * Calculate optimal trade quantity
   *
   * Finds the quantity that maximizes profit given price impact
   */
  public calculateOptimalTradeQuantity(
    commodity: CommodityType,
    buySupply: number,
    buyDemand: number,
    sellSupply: number,
    sellDemand: number,
    maxQuantity: number
  ): number {
    let bestProfit = -Infinity;
    let bestQuantity = 0;

    // Try different quantities
    for (let q = 0; q <= maxQuantity; q += Math.max(1, maxQuantity / 100)) {
      // Price when buying q units (increases price at buy market)
      const buyPrice = this.calculatePrice(commodity, buySupply - q, buyDemand);

      // Price when selling q units (decreases price at sell market)
      const sellPrice = this.calculatePrice(commodity, sellSupply + q, sellDemand);

      const profit = this.calculateProfit(commodity, q, buyPrice, sellPrice);

      if (profit > bestProfit) {
        bestProfit = profit;
        bestQuantity = q;
      }
    }

    return Math.floor(bestQuantity);
  }

  /**
   * Set price elasticity
   *
   * Higher elasticity = prices more sensitive to supply/demand changes
   * - Elastic (> 1): Luxury goods, optional items
   * - Inelastic (< 1): Necessities, fuel, food
   */
  public setPriceElasticity(elasticity: number): void {
    this.priceElasticity = Math.max(0.1, Math.min(5.0, elasticity));
  }

  /**
   * Set price bounds
   */
  public setPriceBounds(minMultiplier: number, maxMultiplier: number): void {
    this.minPriceMultiplier = Math.max(0.01, minMultiplier);
    this.maxPriceMultiplier = Math.max(this.minPriceMultiplier, maxMultiplier);
  }

  /**
   * Set random noise level
   */
  public setNoiseLevel(level: number): void {
    this.randomNoiseLevel = Math.max(0, Math.min(1, level));
  }

  /**
   * Get elasticity for commodity category
   *
   * Different goods have different price sensitivity
   */
  public static getElasticityForCommodity(commodity: CommodityType): number {
    const commodityDef = getCommodity(commodity);

    // Use volatility as proxy for elasticity
    // High volatility goods = more elastic prices
    return 0.5 + commodityDef.priceVolatility;
  }
}
