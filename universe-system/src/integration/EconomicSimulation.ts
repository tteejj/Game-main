/**
 * Economic Simulation
 *
 * Dynamic economy with:
 * - Supply and demand affecting prices
 * - Resource scarcity
 * - Trade routes
 * - Market manipulation by factions
 * - Economic events (shortages, surpluses, embargoes)
 */

export interface Commodity {
  name: string;
  basePrice: number; // credits per ton
  currentPrice: number;
  supply: number; // Available quantity
  demand: number; // Desired quantity
  volatility: number; // 0-1, how much price fluctuates
  category: 'FOOD' | 'FUEL' | 'MINERALS' | 'TECHNOLOGY' | 'LUXURY' | 'WEAPONS' | 'MEDICINE';
}

export interface Market {
  stationId: string;
  stationName: string;
  commodities: Map<string, Commodity>;
  lastUpdate: number;
}

export interface TradeRoute {
  id: string;
  from: string; // Station ID
  to: string; // Station ID
  commodity: string;
  volume: number; // Tons per day
  profit: number; // Credits per ton
  active: boolean;
}

export interface EconomicEvent {
  id: string;
  type: 'SHORTAGE' | 'SURPLUS' | 'EMBARGO' | 'DISCOVERY' | 'DISASTER' | 'BOOM';
  affectedCommodity: string;
  affectedStation?: string;
  magnitude: number; // Impact on price/supply
  duration: number; // Seconds
  startTime: number;
  endTime: number;
}

/**
 * Simulates universe economy
 */
export class EconomicSimulation {
  private markets: Map<string, Market> = new Map();
  private tradeRoutes: Map<string, TradeRoute> = new Map();
  private activeEvents: Map<string, EconomicEvent> = new Map();
  private priceHistory: Map<string, number[]> = new Map(); // Commodity -> price history

  private readonly BASE_COMMODITIES = [
    { name: 'Food', basePrice: 100, volatility: 0.3, category: 'FOOD' as const },
    { name: 'Water', basePrice: 50, volatility: 0.2, category: 'FOOD' as const },
    { name: 'Oxygen', basePrice: 150, volatility: 0.4, category: 'FOOD' as const },
    { name: 'Hydrogen Fuel', basePrice: 200, volatility: 0.5, category: 'FUEL' as const },
    { name: 'Helium-3', basePrice: 500, volatility: 0.6, category: 'FUEL' as const },
    { name: 'Iron Ore', basePrice: 80, volatility: 0.3, category: 'MINERALS' as const },
    { name: 'Gold', basePrice: 2000, volatility: 0.4, category: 'MINERALS' as const },
    { name: 'Rare Earth', basePrice: 1500, volatility: 0.7, category: 'MINERALS' as const },
    { name: 'Electronics', basePrice: 800, volatility: 0.5, category: 'TECHNOLOGY' as const },
    { name: 'Medical Supplies', basePrice: 1200, volatility: 0.6, category: 'MEDICINE' as const },
    { name: 'Luxury Goods', basePrice: 3000, volatility: 0.8, category: 'LUXURY' as const },
    { name: 'Weapons', basePrice: 5000, volatility: 0.9, category: 'WEAPONS' as const }
  ];

  constructor() {
    // Initialize price history
    for (const commodity of this.BASE_COMMODITIES) {
      this.priceHistory.set(commodity.name, [commodity.basePrice]);
    }
  }

  /**
   * Create a market for a station
   */
  public createMarket(stationId: string, stationName: string): void {
    const market: Market = {
      stationId,
      stationName,
      commodities: new Map(),
      lastUpdate: Date.now() / 1000
    };

    // Initialize commodities with random supply/demand
    for (const base of this.BASE_COMMODITIES) {
      const supply = Math.random() * 1000 + 100;
      const demand = Math.random() * 1000 + 100;

      market.commodities.set(base.name, {
        name: base.name,
        basePrice: base.basePrice,
        currentPrice: this.calculatePrice(base.basePrice, supply, demand, base.volatility),
        supply,
        demand,
        volatility: base.volatility,
        category: base.category
      });
    }

    this.markets.set(stationId, market);
  }

  /**
   * Calculate price based on supply and demand
   */
  private calculatePrice(basePrice: number, supply: number, demand: number, volatility: number): number {
    // Price increases when demand > supply
    const ratio = demand / (supply + 1); // +1 to avoid division by zero
    const adjustment = Math.pow(ratio, volatility);

    const price = basePrice * adjustment;

    // Add some random volatility
    const randomFactor = 1 + (Math.random() - 0.5) * volatility * 0.2;

    return Math.max(1, price * randomFactor);
  }

  /**
   * Update markets over time
   */
  public update(deltaTime: number): void {
    const now = Date.now() / 1000;

    // Update each market
    for (const [stationId, market] of this.markets) {
      for (const [commodityName, commodity] of market.commodities) {
        // Simulate consumption (demand decreases supply)
        const consumptionRate = commodity.demand * 0.001; // 0.1% per update
        commodity.supply = Math.max(0, commodity.supply - consumptionRate * deltaTime);

        // Simulate production (supply gradually increases)
        const productionRate = 10 * deltaTime; // Fixed production
        commodity.supply += productionRate;

        // Supply affects demand (scarcity increases demand)
        if (commodity.supply < 100) {
          commodity.demand += 50 * deltaTime; // Panic buying
        } else {
          commodity.demand *= 0.999; // Slow decay toward equilibrium
        }

        // Update price based on new supply/demand
        commodity.currentPrice = this.calculatePrice(
          commodity.basePrice,
          commodity.supply,
          commodity.demand,
          commodity.volatility
        );

        // Record price history
        const history = this.priceHistory.get(commodityName) || [];
        history.push(commodity.currentPrice);

        // Keep only last 100 price points
        if (history.length > 100) {
          history.shift();
        }

        this.priceHistory.set(commodityName, history);
      }

      market.lastUpdate = now;
    }

    // Update active economic events
    this.updateEconomicEvents(deltaTime, now);

    // Generate random economic events
    if (Math.random() < 0.001 * deltaTime) { // Low probability
      this.generateRandomEvent();
    }
  }

  /**
   * Update active economic events
   */
  private updateEconomicEvents(deltaTime: number, now: number): void {
    for (const [id, event] of this.activeEvents) {
      if (now >= event.endTime) {
        // Event ended - remove it
        this.activeEvents.delete(id);
        continue;
      }

      // Apply event effects
      this.applyEventEffects(event, deltaTime);
    }
  }

  /**
   * Apply economic event effects
   */
  private applyEventEffects(event: EconomicEvent, deltaTime: number): void {
    const markets = event.affectedStation
      ? [this.markets.get(event.affectedStation)].filter(Boolean)
      : Array.from(this.markets.values());

    for (const market of markets) {
      const commodity = market.commodities.get(event.affectedCommodity);
      if (!commodity) continue;

      switch (event.type) {
        case 'SHORTAGE':
          commodity.supply *= (1 - event.magnitude * 0.01 * deltaTime);
          commodity.demand *= (1 + event.magnitude * 0.02 * deltaTime);
          break;

        case 'SURPLUS':
          commodity.supply *= (1 + event.magnitude * 0.02 * deltaTime);
          commodity.demand *= (1 - event.magnitude * 0.01 * deltaTime);
          break;

        case 'EMBARGO':
          commodity.demand *= (1 - event.magnitude * 0.03 * deltaTime);
          break;

        case 'DISCOVERY':
          commodity.supply *= (1 + event.magnitude * 0.05 * deltaTime);
          break;

        case 'DISASTER':
          commodity.supply *= (1 - event.magnitude * 0.04 * deltaTime);
          break;

        case 'BOOM':
          commodity.demand *= (1 + event.magnitude * 0.04 * deltaTime);
          break;
      }
    }
  }

  /**
   * Generate a random economic event
   */
  private generateRandomEvent(): void {
    const eventTypes: EconomicEvent['type'][] = [
      'SHORTAGE', 'SURPLUS', 'EMBARGO', 'DISCOVERY', 'DISASTER', 'BOOM'
    ];

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const commodity = this.BASE_COMMODITIES[Math.floor(Math.random() * this.BASE_COMMODITIES.length)];
    const duration = Math.random() * 3600 + 600; // 10 minutes to 1 hour
    const now = Date.now() / 1000;

    const event: EconomicEvent = {
      id: `event_${Date.now()}_${Math.random()}`,
      type,
      affectedCommodity: commodity.name,
      magnitude: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
      duration,
      startTime: now,
      endTime: now + duration
    };

    this.activeEvents.set(event.id, event);
  }

  /**
   * Execute a trade
   */
  public executeTrade(
    fromStation: string,
    toStation: string,
    commodity: string,
    amount: number
  ): { cost: number; profit: number } | null {
    const fromMarket = this.markets.get(fromStation);
    const toMarket = this.markets.get(toStation);

    if (!fromMarket || !toMarket) return null;

    const fromCommodity = fromMarket.commodities.get(commodity);
    const toCommodity = toMarket.commodities.get(commodity);

    if (!fromCommodity || !toCommodity) return null;

    // Check if enough supply at source
    if (fromCommodity.supply < amount) return null;

    // Calculate costs
    const buyCost = fromCommodity.currentPrice * amount;
    const sellRevenue = toCommodity.currentPrice * amount;
    const profit = sellRevenue - buyCost;

    // Execute trade
    fromCommodity.supply -= amount;
    fromCommodity.demand += amount * 0.1; // Buying increases local demand slightly

    toCommodity.supply += amount;
    toCommodity.demand -= amount * 0.1; // Selling decreases local demand slightly

    return { cost: buyCost, profit };
  }

  /**
   * Get best trade routes
   */
  public calculateBestTradeRoutes(): TradeRoute[] {
    const routes: TradeRoute[] = [];

    // Check all station pairs
    const stations = Array.from(this.markets.values());

    for (let i = 0; i < stations.length; i++) {
      for (let j = i + 1; j < stations.length; j++) {
        const from = stations[i];
        const to = stations[j];

        // Check all commodities
        for (const [commodityName, fromCommodity] of from.commodities) {
          const toCommodity = to.commodities.get(commodityName);
          if (!toCommodity) continue;

          const profitPerTon = toCommodity.currentPrice - fromCommodity.currentPrice;

          // Only profitable routes
          if (profitPerTon > 0) {
            routes.push({
              id: `${from.stationId}-${to.stationId}-${commodityName}`,
              from: from.stationId,
              to: to.stationId,
              commodity: commodityName,
              volume: Math.min(fromCommodity.supply, toCommodity.demand) * 0.1,
              profit: profitPerTon,
              active: true
            });
          }
        }
      }
    }

    // Sort by profit
    return routes.sort((a, b) => b.profit - a.profit);
  }

  /**
   * Get market for a station
   */
  public getMarket(stationId: string): Market | undefined {
    return this.markets.get(stationId);
  }

  /**
   * Get commodity price at station
   */
  public getPrice(stationId: string, commodity: string): number | null {
    const market = this.markets.get(stationId);
    if (!market) return null;

    const comm = market.commodities.get(commodity);
    return comm ? comm.currentPrice : null;
  }

  /**
   * Get price history for a commodity
   */
  public getPriceHistory(commodity: string): number[] {
    return this.priceHistory.get(commodity) || [];
  }

  /**
   * Get active events
   */
  public getActiveEvents(): EconomicEvent[] {
    return Array.from(this.activeEvents.values());
  }

  /**
   * Get statistics
   */
  public getStats(): any {
    return {
      totalMarkets: this.markets.size,
      activeEvents: this.activeEvents.size,
      totalCommodities: this.BASE_COMMODITIES.length,
      avgPriceVolatility: this.BASE_COMMODITIES.reduce((sum, c) => sum + c.volatility, 0) / this.BASE_COMMODITIES.length
    };
  }
}
