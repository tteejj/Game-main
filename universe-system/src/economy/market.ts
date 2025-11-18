/**
 * market.ts
 * Market system for stations
 *
 * Manages commodity trading at individual locations
 */

import { CommodityType, getCommodity, CommodityCategory } from './commodity';
import { EconomicModel, MarketListing, Transaction } from './economic-model';

/**
 * Production/consumption rate for a commodity
 */
interface ProductionRate {
  commodity: CommodityType;
  productionPerDay: number; // tons produced per day
  consumptionPerDay: number; // tons consumed per day
}

/**
 * Market state for a station or location
 */
export class Market {
  public readonly id: string;
  public readonly name: string;
  private listings: Map<CommodityType, MarketListing> = new Map();
  private economicModel: EconomicModel;
  private transactions: Transaction[] = [];
  private productionRates: Map<CommodityType, ProductionRate> = new Map();

  // Market properties
  private marketSize: number = 1.0; // 0-10, affects supply/demand scale
  private systemTime: number = 0;

  constructor(id: string, name: string, marketSize: number = 1.0) {
    this.id = id;
    this.name = name;
    this.marketSize = marketSize;
    this.economicModel = new EconomicModel();
  }

  /**
   * Initialize market with commodities
   *
   * @param commodities List of commodities to trade
   * @param initialStock Initial stock levels (as fraction of market size)
   */
  public initialize(commodities: CommodityType[], initialStock: number = 100): void {
    for (const commodity of commodities) {
      const commodityDef = getCommodity(commodity);

      // Initial supply/demand based on market size
      const baseQuantity = initialStock * this.marketSize;
      const supply = baseQuantity * (0.8 + Math.random() * 0.4); // 80-120% of base
      const demand = baseQuantity * (0.8 + Math.random() * 0.4);

      // Calculate initial price
      const currentPrice = this.economicModel.calculatePrice(commodity, supply, demand);

      const listing: MarketListing = {
        commodity,
        supply,
        demand,
        currentPrice,
        basePrice: commodityDef.basePrice,
        priceChange24h: 0,
        volatility: commodityDef.priceVolatility
      };

      this.listings.set(commodity, listing);
    }
  }

  /**
   * Set production/consumption rate for a commodity
   */
  public setProductionRate(
    commodity: CommodityType,
    productionPerDay: number,
    consumptionPerDay: number
  ): void {
    this.productionRates.set(commodity, {
      commodity,
      productionPerDay,
      consumptionPerDay
    });
  }

  /**
   * Buy commodity from market
   *
   * @returns Transaction record, or null if cannot afford/not available
   */
  public buy(
    commodity: CommodityType,
    quantity: number,
    buyerId: string,
    maxPricePerTon?: number
  ): Transaction | null {
    const listing = this.listings.get(commodity);
    if (!listing) return null;

    // Check if enough supply
    if (listing.supply < quantity) {
      quantity = listing.supply; // Buy what's available
    }

    if (quantity <= 0) return null;

    // Check price limit
    if (maxPricePerTon && listing.currentPrice > maxPricePerTon) {
      return null; // Too expensive
    }

    // Execute transaction
    listing.supply -= quantity;
    listing.demand += quantity * 0.1; // Buying increases demand slightly

    // Recalculate price
    const oldPrice = listing.currentPrice;
    listing.currentPrice = this.economicModel.calculatePrice(
      commodity,
      listing.supply,
      listing.demand
    );

    const transaction: Transaction = {
      commodity,
      quantity,
      pricePerTon: oldPrice,
      totalCost: quantity * oldPrice,
      buyerId,
      sellerId: this.id,
      timestamp: this.systemTime
    };

    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * Sell commodity to market
   *
   * @returns Transaction record
   */
  public sell(
    commodity: CommodityType,
    quantity: number,
    sellerId: string,
    minPricePerTon?: number
  ): Transaction | null {
    const listing = this.listings.get(commodity);
    if (!listing) return null;

    if (quantity <= 0) return null;

    // Check price limit
    if (minPricePerTon && listing.currentPrice < minPricePerTon) {
      return null; // Price too low
    }

    // Execute transaction
    listing.supply += quantity;
    listing.demand -= quantity * 0.1; // Selling decreases demand slightly
    listing.demand = Math.max(0, listing.demand);

    // Recalculate price
    const oldPrice = listing.currentPrice;
    listing.currentPrice = this.economicModel.calculatePrice(
      commodity,
      listing.supply,
      listing.demand
    );

    const transaction: Transaction = {
      commodity,
      quantity,
      pricePerTon: oldPrice,
      totalCost: quantity * oldPrice,
      buyerId: this.id,
      sellerId,
      timestamp: this.systemTime
    };

    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * Update market (simulate production/consumption)
   */
  public update(deltaTime: number): void {
    this.systemTime += deltaTime;

    // Update production/consumption
    for (const [commodity, rate] of this.productionRates) {
      const listing = this.listings.get(commodity);
      if (!listing) continue;

      const production = (rate.productionPerDay * deltaTime) / 86400; // Convert to seconds
      const consumption = (rate.consumptionPerDay * deltaTime) / 86400;

      const oldPrice = listing.currentPrice;

      // Update supply/demand
      listing.supply += production - consumption;
      listing.supply = Math.max(0, listing.supply);

      // Natural demand fluctuation
      const demandFluctuation = (Math.random() - 0.5) * 0.02 * listing.demand;
      listing.demand += demandFluctuation;
      listing.demand = Math.max(1, listing.demand);

      // Recalculate price
      listing.currentPrice = this.economicModel.calculatePrice(
        commodity,
        listing.supply,
        listing.demand
      );

      // Track 24h price change (simplified)
      listing.priceChange24h = ((listing.currentPrice - oldPrice) / oldPrice) * 100;
    }
  }

  /**
   * Get market listing for commodity
   */
  public getListing(commodity: CommodityType): MarketListing | null {
    return this.listings.get(commodity) || null;
  }

  /**
   * Get all market listings
   */
  public getAllListings(): MarketListing[] {
    return Array.from(this.listings.values());
  }

  /**
   * Get listings by category
   */
  public getListingsByCategory(category: CommodityCategory): MarketListing[] {
    return this.getAllListings().filter(listing => {
      const commodityDef = getCommodity(listing.commodity);
      return commodityDef.category === category;
    });
  }

  /**
   * Get recent transactions
   */
  public getRecentTransactions(count: number = 10): Transaction[] {
    return this.transactions.slice(-count);
  }

  /**
   * Get total trade volume
   */
  public getTotalTradeVolume(): number {
    return this.transactions.reduce((sum, t) => sum + t.totalCost, 0);
  }

  /**
   * Get most traded commodities
   */
  public getMostTradedCommodities(count: number = 5): CommodityType[] {
    const tradeCounts = new Map<CommodityType, number>();

    for (const transaction of this.transactions) {
      const current = tradeCounts.get(transaction.commodity) || 0;
      tradeCounts.set(transaction.commodity, current + transaction.quantity);
    }

    return Array.from(tradeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([commodity]) => commodity);
  }

  /**
   * Clear old transactions (keep last N)
   */
  public pruneTransactions(keepCount: number = 100): void {
    if (this.transactions.length > keepCount) {
      this.transactions = this.transactions.slice(-keepCount);
    }
  }

  /**
   * Get market statistics
   */
  public getStatistics(): {
    totalListings: number;
    totalSupply: number;
    totalDemand: number;
    avgPrice: number;
    totalTradeVolume: number;
    transactionCount: number;
  } {
    const listings = this.getAllListings();

    return {
      totalListings: listings.length,
      totalSupply: listings.reduce((sum, l) => sum + l.supply, 0),
      totalDemand: listings.reduce((sum, l) => sum + l.demand, 0),
      avgPrice: listings.reduce((sum, l) => sum + l.currentPrice, 0) / (listings.length || 1),
      totalTradeVolume: this.getTotalTradeVolume(),
      transactionCount: this.transactions.length
    };
  }

  /**
   * Find best commodities to buy (lowest relative price)
   */
  public getBestBuys(count: number = 5): MarketListing[] {
    return this.getAllListings()
      .map(listing => ({
        listing,
        priceRatio: listing.currentPrice / listing.basePrice
      }))
      .sort((a, b) => a.priceRatio - b.priceRatio)
      .slice(0, count)
      .map(item => item.listing);
  }

  /**
   * Find best commodities to sell (highest relative price)
   */
  public getBestSells(count: number = 5): MarketListing[] {
    return this.getAllListings()
      .map(listing => ({
        listing,
        priceRatio: listing.currentPrice / listing.basePrice
      }))
      .sort((a, b) => b.priceRatio - a.priceRatio)
      .slice(0, count)
      .map(item => item.listing);
  }

  /**
   * Get market health (0-1)
   *
   * Based on supply/demand balance
   */
  public getMarketHealth(): number {
    const listings = this.getAllListings();
    if (listings.length === 0) return 1;

    let totalImbalance = 0;

    for (const listing of listings) {
      const ratio = Math.abs(listing.supply - listing.demand) / (listing.supply + listing.demand);
      totalImbalance += ratio;
    }

    const avgImbalance = totalImbalance / listings.length;
    return Math.max(0, 1 - avgImbalance);
  }
}
