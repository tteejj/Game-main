# Action Plan - Phase 2: Economy Integration

**Status**: Ready for execution after Phase 1
**Estimated Time**: 8-12 hours
**Dependencies**: Phase 1 completed (NPC navigation working)
**Goal**: Connect three separate economy systems into unified, functional economic simulation

---

## Overview

**CRITICAL PROBLEM**: The game has sophisticated individual systems (markets, commodities, materials, factions, buildings) but they don't interact:
- 3 separate economy systems don't talk to each other
- NPCs use hardcoded prices instead of real market data
- Stations have supplies but never produce them
- Factions detect shortages but can't find resources
- Diplomacy doesn't affect trade
- Buildings exist but don't produce/consume anything

**This phase connects everything into a living economy.**

---

## Gap Analysis Summary

From comprehensive investigation of universe-system/:

### What EXISTS (Individual Systems):
✅ **31 Commodities** defined with prices, volatility (`commodity.ts:1-518`)
✅ **20+ Materials** with physics properties (`MaterialSystem.ts:1-716`)
✅ **Station Markets** with supply/demand curves (`EconomySystem.ts:1-567`)
✅ **City Markets** for planetary trade (`PlanetaryCityEconomy.ts:1-289`)
✅ **Faction Economic Needs** tracking consumption (`FactionEconomicNeeds.ts:1-746`)
✅ **9 Station Types** (trading hub, mining, refinery, etc.)
✅ **9 City Types** (manufacturing, agricultural, etc.)
✅ **Supply/Demand Elasticity** calculations
✅ **Price Volatility** simulation

### What's BROKEN (Integration):
❌ NPCs ignore market prices (hardcoded `price = credits/100`)
❌ Stations never produce their `supplyGoods`
❌ Factions can't find resources (`findResourceLocation()` returns null)
❌ Three economy systems use different pricing
❌ Wars don't affect trade
❌ Player trades don't affect prices
❌ Buildings don't produce/consume
❌ No production chains

**Overall Integration: ~20%** (systems work alone but don't interact)

---

## Task 1: Unify Economic Systems (2-3 hours)

### 1.1 Create Unified Price Manager

**Problem**: Three systems calculate prices differently
- `EconomySystem.ts:303-326` - Station markets
- `PlanetaryCityEconomy.ts:145-178` - City markets
- `FactionEconomicNeeds.ts:729-739` - Returns random values

**Solution**: Single source of truth for all commodity prices

**File**: `/universe-system/src/economy/UnifiedEconomyManager.ts` (NEW)

```typescript
import { Commodity, CommodityType } from './commodity';
import { EconomySystem } from '../EconomySystem';
import { PlanetaryCityEconomy } from '../PlanetaryCityEconomy';

/**
 * Unified economy manager that synchronizes prices across all systems
 */
export class UnifiedEconomyManager {
    private stationMarkets: Map<string, EconomySystem> = new Map();
    private cityMarkets: Map<string, PlanetaryCityEconomy> = new Map();

    // Global commodity state
    private globalPrices: Map<CommodityType, number> = new Map();
    private globalSupply: Map<CommodityType, number> = new Map();
    private globalDemand: Map<CommodityType, number> = new Map();

    constructor() {
        this.initializeGlobalPrices();
    }

    /**
     * Initialize global prices from commodity base values
     */
    private initializeGlobalPrices(): void {
        // Load all commodities from commodity.ts
        const commodities = this.getAllCommodities();

        commodities.forEach(commodity => {
            this.globalPrices.set(commodity.type, commodity.basePrice);
            this.globalSupply.set(commodity.type, 0);
            this.globalDemand.set(commodity.type, 0);
        });
    }

    /**
     * Get all commodity definitions
     */
    private getAllCommodities(): Commodity[] {
        // Import from commodity.ts:31-518
        return [
            // Food & Agriculture
            { type: 'GRAIN', basePrice: 50, volatility: 0.3, ... },
            { type: 'VEGETABLES', basePrice: 80, volatility: 0.4, ... },
            // ... all 31 commodities
        ];
    }

    /**
     * Register a station's market
     */
    registerStationMarket(stationId: string, market: EconomySystem): void {
        this.stationMarkets.set(stationId, market);
    }

    /**
     * Register a city's market
     */
    registerCityMarket(cityId: string, market: PlanetaryCityEconomy): void {
        this.cityMarkets.set(cityId, market);
    }

    /**
     * Update global prices based on all local markets
     * Call this each tick
     */
    update(deltaTime: number): void {
        // 1. Aggregate supply/demand from all markets
        this.aggregateMarketData();

        // 2. Calculate new global prices
        this.updateGlobalPrices(deltaTime);

        // 3. Push prices back to local markets
        this.synchronizeMarkets();
    }

    /**
     * Aggregate supply/demand from all markets
     */
    private aggregateMarketData(): void {
        // Reset
        this.globalSupply.forEach((_, type) => this.globalSupply.set(type, 0));
        this.globalDemand.forEach((_, type) => this.globalDemand.set(type, 0));

        // Sum station markets
        this.stationMarkets.forEach(market => {
            market.getInventory().forEach(item => {
                const current = this.globalSupply.get(item.commodity) || 0;
                this.globalSupply.set(item.commodity, current + item.quantity);
            });

            market.getDemand().forEach((quantity, commodity) => {
                const current = this.globalDemand.get(commodity) || 0;
                this.globalDemand.set(commodity, current + quantity);
            });
        });

        // Sum city markets (same pattern)
        this.cityMarkets.forEach(market => {
            // Add city inventory to global supply
            // Add city demand to global demand
        });
    }

    /**
     * Update global prices based on supply/demand
     */
    private updateGlobalPrices(deltaTime: number): void {
        this.globalPrices.forEach((price, commodity) => {
            const supply = this.globalSupply.get(commodity) || 0;
            const demand = this.globalDemand.get(commodity) || 0;

            // Supply/demand ratio affects price
            const ratio = demand / (supply + 1); // +1 to avoid divide by zero

            // Price adjustment (elasticity = 0.1 for slow changes)
            const elasticity = 0.1;
            const targetPrice = price * (1 + elasticity * (ratio - 1));

            // Apply volatility
            const commodityDef = this.getAllCommodities().find(c => c.type === commodity);
            const volatility = commodityDef?.volatility || 0.1;
            const randomFactor = 1 + (Math.random() - 0.5) * volatility;

            const newPrice = targetPrice * randomFactor;

            // Clamp to reasonable bounds (0.5x to 3x base price)
            const basePrice = commodityDef?.basePrice || 100;
            const clampedPrice = Math.max(basePrice * 0.5, Math.min(basePrice * 3, newPrice));

            this.globalPrices.set(commodity, clampedPrice);
        });
    }

    /**
     * Push global prices to all markets
     */
    private synchronizeMarkets(): void {
        // Update all station markets with new prices
        this.stationMarkets.forEach(market => {
            this.globalPrices.forEach((price, commodity) => {
                market.setPrice(commodity, price);
            });
        });

        // Update all city markets
        this.cityMarkets.forEach(market => {
            this.globalPrices.forEach((price, commodity) => {
                market.updatePrice(commodity, price);
            });
        });
    }

    /**
     * Get current global price for commodity
     * THIS IS THE METHOD NPCs SHOULD CALL
     */
    getPrice(commodity: CommodityType): number {
        return this.globalPrices.get(commodity) || 100;
    }

    /**
     * Get current supply for commodity across universe
     */
    getGlobalSupply(commodity: CommodityType): number {
        return this.globalSupply.get(commodity) || 0;
    }

    /**
     * Get current demand for commodity across universe
     */
    getGlobalDemand(commodity: CommodityType): number {
        return this.globalDemand.get(commodity) || 0;
    }

    /**
     * Find locations with supply of commodity (for faction needs)
     */
    findSupplyLocations(commodity: CommodityType, minQuantity: number): Array<{
        stationId?: string;
        cityId?: string;
        quantity: number;
        price: number;
    }> {
        const locations = [];

        // Check stations
        this.stationMarkets.forEach((market, stationId) => {
            const quantity = market.getQuantity(commodity);
            if (quantity >= minQuantity) {
                locations.push({
                    stationId,
                    quantity,
                    price: market.getPrice(commodity)
                });
            }
        });

        // Check cities
        this.cityMarkets.forEach((market, cityId) => {
            const quantity = market.getSupply(commodity);
            if (quantity >= minQuantity) {
                locations.push({
                    cityId,
                    quantity,
                    price: market.getPrice(commodity)
                });
            }
        });

        return locations.sort((a, b) => a.price - b.price); // Cheapest first
    }
}
```

### 1.2 Wire into StarSystem

**File**: `/universe-system/src/StarSystem.ts`

**Change at line ~1358** (end of class):

```typescript
export class StarSystem {
    // ... existing properties ...

    // ADD:
    public economyManager: UnifiedEconomyManager;

    constructor(config: StarSystemConfig) {
        // ... existing code ...

        // ADD after POI generation (around line 180):
        this.economyManager = new UnifiedEconomyManager();

        // Register all station markets
        this.pointsOfInterest.forEach(poi => {
            if (poi.type === 'station' && poi.economySystem) {
                this.economyManager.registerStationMarket(poi.id, poi.economySystem);
            }
        });

        // Register all city markets
        this.celestialBodies.forEach(body => {
            if (body.cities) {
                body.cities.forEach(city => {
                    if (city.economy) {
                        this.economyManager.registerCityMarket(city.id, city.economy);
                    }
                });
            }
        });
    }

    update(deltaTime: number): void {
        // ... existing code ...

        // ADD after line 820:
        this.economyManager.update(deltaTime);
    }
}
```

---

## Task 2: Wire NPC Trading to Real Prices (1.5-2 hours)

### 2.1 Fix NPCShipAI Trading Logic

**Problem**: Line 709 uses `this.ship.credits / 100` instead of market prices
**Problem**: Line 703 comment says "Simplified trading logic"

**File**: `/universe-system/src/NPCShipAI.ts`

**Replace lines 691-794** (entire `executeTrade` method):

```typescript
private executeTrade(station: PointOfInterest): void {
    if (!station.economySystem) return;

    const economyManager = this.starSystem.economyManager;

    // 1. Decide what to buy/sell based on REAL market data
    const tradeDecisions = this.evaluateTradeOpportunities(station, economyManager);

    if (tradeDecisions.length === 0) {
        this.addMemory({
            type: 'trade_failure',
            description: 'No profitable trades available',
            location: { ...this.ship.position },
            timestamp: Date.now()
        });
        return;
    }

    // 2. Execute most profitable trade
    const bestTrade = tradeDecisions[0]; // Already sorted by profit

    if (bestTrade.action === 'buy') {
        const cost = bestTrade.price * bestTrade.quantity;

        if (this.ship.credits >= cost) {
            // Buy from station
            const success = station.economySystem.sell(
                bestTrade.commodity,
                bestTrade.quantity,
                this.ship.id
            );

            if (success) {
                this.ship.credits -= cost;
                this.addCargoItem(bestTrade.commodity, bestTrade.quantity);

                this.addMemory({
                    type: 'trade_success',
                    description: `Bought ${bestTrade.quantity}x ${bestTrade.commodity} for ${cost} credits`,
                    profitEstimate: bestTrade.profitEstimate,
                    location: { ...this.ship.position },
                    timestamp: Date.now()
                });

                // Update personality: successful trade reduces caution
                this.personality.caution = Math.max(0.1, this.personality.caution - 0.01);
            }
        }
    } else if (bestTrade.action === 'sell') {
        const revenue = bestTrade.price * bestTrade.quantity;

        // Sell to station
        const success = station.economySystem.buy(
            bestTrade.commodity,
            bestTrade.quantity,
            this.ship.id,
            revenue
        );

        if (success) {
            this.ship.credits += revenue;
            this.removeCargoItem(bestTrade.commodity, bestTrade.quantity);

            this.addMemory({
                type: 'trade_success',
                description: `Sold ${bestTrade.quantity}x ${bestTrade.commodity} for ${revenue} credits`,
                profitActual: revenue,
                location: { ...this.ship.position },
                timestamp: Date.now()
            });

            // Update personality: greed increases with profit
            this.personality.greed = Math.min(1.0, this.personality.greed + 0.02);
        }
    }
}

/**
 * Evaluate all possible trades at this station
 */
private evaluateTradeOpportunities(
    station: PointOfInterest,
    economyManager: UnifiedEconomyManager
): Array<{
    action: 'buy' | 'sell';
    commodity: CommodityType;
    quantity: number;
    price: number;
    profitEstimate: number;
}> {
    const opportunities = [];

    // 1. Check what station is selling (we might buy)
    station.economySystem.getInventory().forEach(item => {
        const localPrice = station.economySystem.getPrice(item.commodity);
        const globalPrice = economyManager.getPrice(item.commodity);

        // Buy if local price < global price (can sell elsewhere for profit)
        if (localPrice < globalPrice * 0.9) { // 10% margin
            const profitPerUnit = globalPrice - localPrice;
            const affordableQuantity = Math.floor(this.ship.credits / localPrice);
            const cargoSpace = this.ship.maxCargo - this.ship.cargo.length;
            const quantity = Math.min(affordableQuantity, cargoSpace, item.quantity);

            if (quantity > 0) {
                opportunities.push({
                    action: 'buy',
                    commodity: item.commodity,
                    quantity,
                    price: localPrice,
                    profitEstimate: profitPerUnit * quantity
                });
            }
        }
    });

    // 2. Check what we're carrying (might sell)
    this.ship.cargo.forEach(cargoItem => {
        const localPrice = station.economySystem.getPrice(cargoItem.commodity);
        const purchasePrice = cargoItem.purchasePrice || 0;

        // Sell if we make profit
        if (localPrice > purchasePrice * 1.1) { // 10% minimum profit
            const profitPerUnit = localPrice - purchasePrice;

            opportunities.push({
                action: 'sell',
                commodity: cargoItem.commodity,
                quantity: cargoItem.quantity,
                price: localPrice,
                profitEstimate: profitPerUnit * cargoItem.quantity
            });
        }
    });

    // 3. Sort by profit (best first)
    opportunities.sort((a, b) => b.profitEstimate - a.profitEstimate);

    // 4. Apply personality factors
    opportunities.forEach(opp => {
        // Greedy NPCs prefer high-profit trades
        if (this.personality.greed > 0.7) {
            opp.profitEstimate *= 1.2;
        }

        // Cautious NPCs prefer safe, small trades
        if (this.personality.caution > 0.7 && opp.quantity > 10) {
            opp.profitEstimate *= 0.8;
        }
    });

    return opportunities;
}

/**
 * Add item to cargo, tracking purchase price
 */
private addCargoItem(commodity: CommodityType, quantity: number, purchasePrice?: number): void {
    const existing = this.ship.cargo.find(c => c.commodity === commodity);

    if (existing) {
        existing.quantity += quantity;
    } else {
        this.ship.cargo.push({
            commodity,
            quantity,
            purchasePrice: purchasePrice || this.starSystem.economyManager.getPrice(commodity)
        });
    }
}

/**
 * Remove item from cargo
 */
private removeCargoItem(commodity: CommodityType, quantity: number): void {
    const index = this.ship.cargo.findIndex(c => c.commodity === commodity);
    if (index >= 0) {
        this.ship.cargo[index].quantity -= quantity;
        if (this.ship.cargo[index].quantity <= 0) {
            this.ship.cargo.splice(index, 1);
        }
    }
}
```

**Success Criteria**:
- NPCs use `economyManager.getPrice()` instead of hardcoded values
- NPCs buy low, sell high based on real market data
- Personality affects trade decisions (greed, caution)
- Trade success updates memories

---

## Task 3: Add Station Production (2-3 hours)

### 3.1 Define Production Chains

**Problem**: Stations have `supplyGoods` but never produce them

**File**: `/universe-system/src/economy/ProductionChains.ts` (NEW)

```typescript
import { CommodityType } from './commodity';

export interface ProductionRecipe {
    inputs: Array<{ commodity: CommodityType; quantity: number }>;
    outputs: Array<{ commodity: CommodityType; quantity: number }>;
    duration: number; // seconds
    laborCost: number; // credits per production cycle
}

export interface StationProductionConfig {
    stationType: string;
    recipes: ProductionRecipe[];
    productionRate: number; // cycles per hour
}

/**
 * Production configurations for each station type
 */
export const STATION_PRODUCTION: Record<string, StationProductionConfig> = {
    MINING_PLATFORM: {
        stationType: 'MINING_PLATFORM',
        productionRate: 2, // 2 cycles/hour
        recipes: [
            {
                inputs: [],
                outputs: [
                    { commodity: 'RAW_MINERALS', quantity: 100 },
                    { commodity: 'METALS', quantity: 20 }
                ],
                duration: 1800, // 30 minutes
                laborCost: 50
            }
        ]
    },

    REFINERY_COMPLEX: {
        stationType: 'REFINERY_COMPLEX',
        productionRate: 4, // 4 cycles/hour
        recipes: [
            {
                inputs: [
                    { commodity: 'RAW_MINERALS', quantity: 100 }
                ],
                outputs: [
                    { commodity: 'METALS', quantity: 50 },
                    { commodity: 'RARE_METALS', quantity: 10 }
                ],
                duration: 900, // 15 minutes
                laborCost: 100
            },
            {
                inputs: [
                    { commodity: 'ORGANIC_COMPOUNDS', quantity: 50 }
                ],
                outputs: [
                    { commodity: 'CHEMICALS', quantity: 80 }
                ],
                duration: 600, // 10 minutes
                laborCost: 75
            }
        ]
    },

    AGRICULTURAL_DOME: {
        stationType: 'AGRICULTURAL_DOME',
        productionRate: 6, // 6 cycles/hour
        recipes: [
            {
                inputs: [
                    { commodity: 'WATER', quantity: 10 }
                ],
                outputs: [
                    { commodity: 'GRAIN', quantity: 100 },
                    { commodity: 'VEGETABLES', quantity: 50 }
                ],
                duration: 600, // 10 minutes
                laborCost: 30
            }
        ]
    },

    MANUFACTURING_CENTER: {
        stationType: 'MANUFACTURING_CENTER',
        productionRate: 3,
        recipes: [
            {
                inputs: [
                    { commodity: 'METALS', quantity: 50 },
                    { commodity: 'ELECTRONICS', quantity: 20 }
                ],
                outputs: [
                    { commodity: 'MACHINERY', quantity: 30 },
                    { commodity: 'CONSUMER_GOODS', quantity: 40 }
                ],
                duration: 1200, // 20 minutes
                laborCost: 150
            }
        ]
    },

    SHIPYARD: {
        stationType: 'SHIPYARD',
        productionRate: 1, // 1 cycle/hour (ships take long)
        recipes: [
            {
                inputs: [
                    { commodity: 'METALS', quantity: 200 },
                    { commodity: 'ELECTRONICS', quantity: 100 },
                    { commodity: 'MACHINERY', quantity: 50 }
                ],
                outputs: [
                    { commodity: 'SPACECRAFT', quantity: 1 }
                ],
                duration: 3600, // 1 hour
                laborCost: 1000
            }
        ]
    },

    // TRADING_HUB doesn't produce, just facilitates trade
    TRADING_HUB: {
        stationType: 'TRADING_HUB',
        productionRate: 0,
        recipes: []
    },

    // RESEARCH_STATION produces knowledge/tech (abstract as RESEARCH_DATA)
    RESEARCH_STATION: {
        stationType: 'RESEARCH_STATION',
        productionRate: 2,
        recipes: [
            {
                inputs: [
                    { commodity: 'ELECTRONICS', quantity: 30 }
                ],
                outputs: [
                    { commodity: 'RESEARCH_DATA', quantity: 10 }
                ],
                duration: 1800, // 30 minutes
                laborCost: 200
            }
        ]
    }
};
```

### 3.2 Add Production System to Stations

**File**: `/universe-system/src/StationProduction.ts` (NEW)

```typescript
import { STATION_PRODUCTION, ProductionRecipe } from './economy/ProductionChains';
import { EconomySystem } from './EconomySystem';
import { CommodityType } from './economy/commodity';

export class StationProduction {
    private stationType: string;
    private economySystem: EconomySystem;
    private config: any;

    private activeRecipes: Array<{
        recipe: ProductionRecipe;
        startTime: number;
        progress: number; // 0-1
    }> = [];

    constructor(stationType: string, economySystem: EconomySystem) {
        this.stationType = stationType;
        this.economySystem = economySystem;
        this.config = STATION_PRODUCTION[stationType];

        if (!this.config) {
            console.warn(`No production config for station type: ${stationType}`);
        }
    }

    /**
     * Update production cycles
     */
    update(deltaTime: number): void {
        if (!this.config || this.config.recipes.length === 0) return;

        // Update existing recipes
        this.activeRecipes = this.activeRecipes.filter(active => {
            active.progress += deltaTime / active.recipe.duration;

            if (active.progress >= 1.0) {
                // Production complete!
                this.completeProduction(active.recipe);
                return false; // Remove from active
            }

            return true; // Keep processing
        });

        // Start new recipes if capacity available
        const maxConcurrent = this.config.productionRate;
        while (this.activeRecipes.length < maxConcurrent) {
            const started = this.tryStartProduction();
            if (!started) break; // No valid recipes available
        }
    }

    /**
     * Try to start a production cycle
     */
    private tryStartProduction(): boolean {
        if (!this.config || !this.config.recipes) return false;

        // Try each recipe
        for (const recipe of this.config.recipes) {
            // Check if we have inputs
            const hasInputs = recipe.inputs.every(input => {
                const available = this.economySystem.getQuantity(input.commodity);
                return available >= input.quantity;
            });

            if (hasInputs) {
                // Consume inputs
                recipe.inputs.forEach(input => {
                    this.economySystem.removeQuantity(input.commodity, input.quantity);
                });

                // Start production
                this.activeRecipes.push({
                    recipe,
                    startTime: Date.now(),
                    progress: 0
                });

                return true;
            }
        }

        return false; // No recipe could start
    }

    /**
     * Complete a production cycle
     */
    private completeProduction(recipe: ProductionRecipe): void {
        // Add outputs to economy
        recipe.outputs.forEach(output => {
            this.economySystem.addQuantity(output.commodity, output.quantity);
        });

        console.log(`Station produced:`, recipe.outputs);
    }

    /**
     * Get current production status
     */
    getStatus(): Array<{
        recipe: ProductionRecipe;
        progress: number;
        timeRemaining: number;
    }> {
        return this.activeRecipes.map(active => ({
            recipe: active.recipe,
            progress: active.progress,
            timeRemaining: active.recipe.duration * (1 - active.progress)
        }));
    }
}
```

### 3.3 Wire into PointOfInterest

**File**: `/universe-system/src/points-of-interest/PointOfInterest.ts`

**Add property around line 50**:

```typescript
export class PointOfInterest {
    // ... existing properties ...

    // ADD:
    public production?: StationProduction;

    constructor(config: POIConfig) {
        // ... existing code ...

        // ADD after economy system initialization (around line 150):
        if (this.type === 'station' && this.economySystem) {
            this.production = new StationProduction(
                this.subType || 'TRADING_HUB',
                this.economySystem
            );
        }
    }

    update(deltaTime: number): void {
        // ... existing code ...

        // ADD after economy update (around line 280):
        if (this.production) {
            this.production.update(deltaTime);
        }
    }
}
```

**Success Criteria**:
- Stations produce commodities based on type
- Mining platforms produce minerals
- Refineries transform raw minerals to metals
- Agricultural domes produce food
- Manufacturing centers create goods
- Production requires inputs (except mining)
- Production takes time (cycles)

---

## Task 4: Connect Faction Needs to Economy (2-3 hours)

### 4.1 Fix FactionEconomicNeeds Integration

**Problem**: `findResourceLocation()` returns null (line 564)
**Problem**: `getSupply/Demand()` return random data (lines 729, 737)

**File**: `/universe-system/src/faction-dynamics/FactionEconomicNeeds.ts`

**Replace method at line 564**:

```typescript
/**
 * Find where faction can acquire needed resource
 * NOW INTEGRATED with UnifiedEconomyManager
 */
private findResourceLocation(
    resource: ResourceType,
    amount: number
): { location: Vector3; distance: number; cost: number } | null {
    // Get commodity type from resource
    const commodity = this.resourceToCommodity(resource);

    // Use unified economy to find supply
    const locations = this.starSystem.economyManager.findSupplyLocations(
        commodity,
        amount
    );

    if (locations.length === 0) return null;

    // Find closest location
    let closest: any = null;
    let minDistance = Infinity;

    locations.forEach(loc => {
        let position: Vector3;

        if (loc.stationId) {
            const station = this.starSystem.pointsOfInterest.find(p => p.id === loc.stationId);
            if (station) position = station.position;
        } else if (loc.cityId) {
            // Find city position on planet
            const city = this.findCityById(loc.cityId);
            if (city) position = city.position;
        }

        if (position) {
            const distance = this.calculateDistance(this.faction.homeworld, position);

            if (distance < minDistance) {
                minDistance = distance;
                closest = {
                    location: position,
                    distance,
                    cost: loc.price * amount
                };
            }
        }
    });

    return closest;
}

/**
 * Map resource types to commodity types
 */
private resourceToCommodity(resource: ResourceType): CommodityType {
    const mapping: Record<ResourceType, CommodityType> = {
        FOOD: 'GRAIN', // Or 'FOOD' if you add it to commodities
        WATER: 'WATER',
        FUEL: 'FUEL',
        MINERALS: 'RAW_MINERALS',
        ENERGY: 'POWER_CELLS', // Abstract energy as power cells
        MEDICINE: 'MEDICINE'
    };

    return mapping[resource] || 'GRAIN';
}

/**
 * Find city by ID across all planets
 */
private findCityById(cityId: string): any {
    for (const body of this.starSystem.celestialBodies) {
        if (body.cities) {
            const city = body.cities.find((c: any) => c.id === cityId);
            if (city) return city;
        }
    }
    return null;
}
```

**Replace methods at lines 729-739**:

```typescript
/**
 * Get current supply from economy (NOT random!)
 */
private getSupply(resource: ResourceType, faction: Faction): number {
    const commodity = this.resourceToCommodity(resource);
    return this.starSystem.economyManager.getGlobalSupply(commodity);
}

/**
 * Get current demand from economy (NOT random!)
 */
private getDemand(resource: ResourceType, faction: Faction): number {
    const commodity = this.resourceToCommodity(resource);
    return this.starSystem.economyManager.getGlobalDemand(commodity);
}
```

### 4.2 Enable Faction Resource Acquisition

**Add new method to FactionEconomicNeeds.ts**:

```typescript
/**
 * Send NPCs to acquire resources when faction is in shortage
 */
public attemptResourceAcquisition(resource: ResourceType, amount: number): boolean {
    const location = this.findResourceLocation(resource, amount);

    if (!location) {
        console.log(`Faction ${this.faction.name} cannot find ${resource}`);
        return false;
    }

    // Find available faction NPC ships
    const factionShips = this.starSystem.npcShips.filter(ship =>
        ship.faction === this.faction.name &&
        ship.goal !== 'trade' && // Not already trading
        ship.cargo.length < ship.maxCargo // Has cargo space
    );

    if (factionShips.length === 0) {
        console.log(`Faction ${this.faction.name} has no available ships`);
        return false;
    }

    // Assign closest ship
    const ship = factionShips[0]; // TODO: Find actually closest

    // Set ship goal to acquire resource
    ship.goal = 'trade';
    ship.destination = location.location;
    ship.tradeTarget = this.resourceToCommodity(resource);
    ship.tradeAmount = amount;

    console.log(`Faction ${this.faction.name} dispatched ship to acquire ${resource}`);

    return true;
}
```

**Wire into faction update loop** (StarSystem.ts around line 850):

```typescript
// In StarSystem.update():
this.factions.forEach(faction => {
    const needs = faction.economicNeeds; // Assumes FactionEconomicNeeds is exposed

    // Check each resource
    ['FOOD', 'WATER', 'FUEL'].forEach(resource => {
        const status = needs.getResourceStatus(resource);

        if (status.critical) {
            // Try to acquire resource
            needs.attemptResourceAcquisition(resource, status.shortfall);
        }
    });
});
```

**Success Criteria**:
- Factions can find resources in real economy
- Factions dispatch NPCs when in shortage
- NPCs fulfill faction needs through trade
- Supply/demand values come from real markets

---

## Task 5: Integrate Diplomacy with Economy (1.5-2 hours)

### 5.1 Wire Economic Events to Diplomacy

**Problem**: FactionDiplomacyEngine event processors are empty stubs (lines 597-619)

**File**: `/universe-system/src/faction-dynamics/FactionDiplomacyEngine.ts`

**Replace method at line 597**:

```typescript
/**
 * Process economic cooperation event
 */
private processEconomicCooperation(event: DiplomaticEvent): void {
    const { faction1, faction2 } = event;

    if (!faction1 || !faction2) return;

    // Economic cooperation improves relations
    this.adjustRelations(faction1, faction2, 5);

    // Apply trade bonuses
    faction1.economicNeeds.addTradePartner(faction2.name, 0.9); // 10% discount
    faction2.economicNeeds.addTradePartner(faction1.name, 0.9);

    console.log(`Economic cooperation between ${faction1.name} and ${faction2.name}`);
}

/**
 * Process trade dispute event
 */
private processTradeDispute(event: DiplomaticEvent): void {
    const { faction1, faction2, data } = event;

    if (!faction1 || !faction2) return;

    // Trade disputes harm relations
    const severity = data?.severity || 1;
    this.adjustRelations(faction1, faction2, -10 * severity);

    // May lead to embargo
    const relations = this.getRelation(faction1.name, faction2.name);
    if (relations < -50) {
        this.processEmbargo({ type: 'embargo', faction1, faction2, timestamp: Date.now() });
    }
}

/**
 * Process embargo event
 */
private processEmbargo(event: DiplomaticEvent): void {
    const { faction1, faction2 } = event;

    if (!faction1 || !faction2) return;

    // Embargo blocks trade
    faction1.economicNeeds.removeTradePartner(faction2.name);
    faction2.economicNeeds.removeTradePartner(faction1.name);

    // Relations worsen significantly
    this.adjustRelations(faction1, faction2, -20);

    // NPCs of embargoed faction are hostile
    this.starSystem.npcShips.forEach(ship => {
        if (ship.faction === faction1.name) {
            ship.setHostile(faction2.name);
        }
        if (ship.faction === faction2.name) {
            ship.setHostile(faction1.name);
        }
    });

    console.log(`${faction1.name} embargoed ${faction2.name} - trade blocked`);
}

/**
 * Process resource conflict event
 */
private processResourceConflict(event: DiplomaticEvent): void {
    const { faction1, faction2, data } = event;

    if (!faction1 || !faction2) return;

    const resource = data?.resource || 'MINERALS';

    // Resource conflicts severely harm relations
    this.adjustRelations(faction1, faction2, -25);

    // May lead to war if resources critical
    const relations = this.getRelation(faction1.name, faction2.name);
    const faction1Critical = faction1.economicNeeds.isCritical(resource);
    const faction2Critical = faction2.economicNeeds.isCritical(resource);

    if (relations < -70 && (faction1Critical || faction2Critical)) {
        this.processMilitaryAction({
            type: 'military_action',
            faction1,
            faction2,
            data: { reason: `${resource} shortage` },
            timestamp: Date.now()
        });
    }

    console.log(`Resource conflict over ${resource} between ${faction1.name} and ${faction2.name}`);
}
```

### 5.2 Add Trade Partner System to FactionEconomicNeeds

**File**: `/universe-system/src/faction-dynamics/FactionEconomicNeeds.ts`

**Add to class**:

```typescript
export class FactionEconomicNeeds {
    // ... existing properties ...

    // ADD:
    private tradePartners: Map<string, number> = new Map(); // faction name -> price multiplier

    /**
     * Add trade partner with price modifier
     */
    addTradePartner(factionName: string, priceMultiplier: number): void {
        this.tradePartners.set(factionName, priceMultiplier);
    }

    /**
     * Remove trade partner (embargo)
     */
    removeTradePartner(factionName: string): void {
        this.tradePartners.delete(factionName);
    }

    /**
     * Check if faction is embargoed
     */
    isEmbargoed(factionName: string): boolean {
        return !this.tradePartners.has(factionName) && this.tradePartners.size > 0;
    }

    /**
     * Get price multiplier for trading with faction
     */
    getPriceMultiplier(factionName: string): number {
        return this.tradePartners.get(factionName) || 1.0;
    }
}
```

### 5.3 Apply Diplomacy to NPC Trading

**File**: `/universe-system/src/NPCShipAI.ts`

**Modify `executeTrade` to respect embargoes**:

```typescript
private executeTrade(station: PointOfInterest): void {
    if (!station.economySystem) return;

    // ADD: Check if embargoed
    const stationFaction = station.faction;
    if (stationFaction && this.faction) {
        const factionNeeds = this.starSystem.getFactionEconomicNeeds(this.faction);

        if (factionNeeds && factionNeeds.isEmbargoed(stationFaction)) {
            this.addMemory({
                type: 'trade_blocked',
                description: `Embargo prevents trade with ${stationFaction}`,
                location: { ...this.ship.position },
                timestamp: Date.now()
            });
            return; // Cannot trade due to embargo
        }

        // Apply price multiplier for allied factions
        const priceMultiplier = factionNeeds?.getPriceMultiplier(stationFaction) || 1.0;
        // Use this in price calculations below...
    }

    // ... rest of existing code ...
}
```

**Success Criteria**:
- Economic cooperation improves faction relations
- Trade disputes harm relations and can lead to embargoes
- Embargoes block NPC trading
- Resource conflicts can trigger wars
- Allied factions get trade discounts

---

## Task 6: Enable Player Economic Impact (1 hour)

### 6.1 Wire Player Trades to Economy

**Problem**: Player actions don't affect market prices

**File**: `/game-engine/src/SpaceGameEnhanced.ts` (or `SpaceGame.ts`)

**Add method**:

```typescript
export class SpaceGameEnhanced extends SpaceGame {
    // ... existing code ...

    /**
     * Player trades with station
     */
    tradeWithStation(
        stationId: string,
        commodity: CommodityType,
        quantity: number,
        action: 'buy' | 'sell'
    ): boolean {
        const station = this.starSystem.pointsOfInterest.find(p => p.id === stationId);

        if (!station || !station.economySystem) return false;

        if (action === 'buy') {
            const cost = station.economySystem.getPrice(commodity) * quantity;

            if (this.spacecraft.credits < cost) return false;

            const success = station.economySystem.sell(commodity, quantity, 'player');

            if (success) {
                this.spacecraft.credits -= cost;
                this.spacecraft.cargo.push({ commodity, quantity });

                // Emit event for UI feedback
                this.emit('trade_complete', {
                    action: 'buy',
                    commodity,
                    quantity,
                    cost
                });

                return true;
            }
        } else if (action === 'sell') {
            const revenue = station.economySystem.getPrice(commodity) * quantity;

            // Remove from player cargo
            const cargoIndex = this.spacecraft.cargo.findIndex(c => c.commodity === commodity);
            if (cargoIndex < 0 || this.spacecraft.cargo[cargoIndex].quantity < quantity) {
                return false;
            }

            const success = station.economySystem.buy(commodity, quantity, 'player', revenue);

            if (success) {
                this.spacecraft.credits += revenue;
                this.spacecraft.cargo[cargoIndex].quantity -= quantity;

                if (this.spacecraft.cargo[cargoIndex].quantity === 0) {
                    this.spacecraft.cargo.splice(cargoIndex, 1);
                }

                this.emit('trade_complete', {
                    action: 'sell',
                    commodity,
                    quantity,
                    revenue
                });

                return true;
            }
        }

        return false;
    }

    /**
     * Player pirates NPC ship (disrupts supply chain)
     */
    pirateShip(npcShipId: string): void {
        const npcShip = this.starSystem.npcShips.find(s => s.id === npcShipId);

        if (!npcShip) return;

        // Steal cargo
        const stolenCargo = [...npcShip.cargo];
        npcShip.cargo = [];

        // Add to player cargo
        stolenCargo.forEach(item => {
            this.spacecraft.cargo.push(item);
        });

        // Harm faction relations
        if (npcShip.faction) {
            const faction = this.starSystem.factions.find(f => f.name === npcShip.faction);
            if (faction) {
                // Player becomes hostile to faction
                faction.relations.set('player', -50);

                // NPC remembers trauma
                npcShip.traumaLevel += 0.3;
            }
        }

        // Destroy supply chain for that cargo
        // (cargo never reaches destination, affecting market)
        this.emit('piracy_complete', {
            victim: npcShipId,
            cargo: stolenCargo
        });
    }
}
```

**Success Criteria**:
- Player buy/sell affects station inventory
- Large player trades move market prices
- Player piracy disrupts NPC supply chains
- Player actions affect faction relations

---

## Integration Success Criteria

After completing Phase 2, the economy should be **fully integrated**:

✅ **Unified Pricing**: All systems use UnifiedEconomyManager
✅ **NPC Trading**: NPCs use real market data, not hardcoded values
✅ **Station Production**: Stations produce commodities based on type
✅ **Faction Needs**: Factions find resources, dispatch NPCs to acquire
✅ **Diplomacy Integration**: Embargoes block trade, alliances give discounts
✅ **Player Impact**: Player trades/piracy affect economy
✅ **Supply Chains**: Production → Trade → Consumption loops work

### Test Checklist:

1. Start game, wait 5 minutes:
   - [ ] Station inventories change (production working)
   - [ ] NPC ships trade at stations
   - [ ] Market prices fluctuate based on supply/demand

2. Check NPC behavior:
   - [ ] NPCs buy low, sell high
   - [ ] NPCs carry cargo between stations
   - [ ] NPCs remember profitable routes

3. Check faction behavior:
   - [ ] Factions detect shortages
   - [ ] Factions dispatch NPCs to acquire resources
   - [ ] Faction relations affect trade

4. Player interaction:
   - [ ] Player can buy/sell at stations
   - [ ] Player trades affect station inventory
   - [ ] Large player trades move prices

5. Diplomacy effects:
   - [ ] Allied factions give trade discounts
   - [ ] Embargoes prevent NPC trading
   - [ ] Resource conflicts trigger events

---

## Files Created/Modified Summary

**New Files**:
- `/universe-system/src/economy/UnifiedEconomyManager.ts` (350 lines)
- `/universe-system/src/economy/ProductionChains.ts` (150 lines)
- `/universe-system/src/StationProduction.ts` (180 lines)

**Modified Files**:
- `/universe-system/src/StarSystem.ts` (~30 lines changed)
- `/universe-system/src/NPCShipAI.ts` (~150 lines changed)
- `/universe-system/src/points-of-interest/PointOfInterest.ts` (~20 lines changed)
- `/universe-system/src/faction-dynamics/FactionEconomicNeeds.ts` (~100 lines changed)
- `/universe-system/src/faction-dynamics/FactionDiplomacyEngine.ts` (~80 lines changed)
- `/game-engine/src/SpaceGameEnhanced.ts` (~100 lines added)

**Total**: ~1,160 lines of new/modified code

---

## Notes

- This phase MUST come after Phase 1 (NPC navigation fix)
- This phase should come BEFORE current Phase 2 (Foundation Systems)
- Economy integration affects UI (Phase 3 will show real data)
- Economy integration affects testing (Phase 4 needs working economy)
- Consider this the "make the universe alive" phase

After Phase 2, the game transforms from individual systems to an **integrated economic simulation** where:
- NPCs have real motivations (profit)
- Factions have real needs (resources)
- Wars have real causes (shortages)
- Player has real impact (supply/demand)

**This is the heart of the living universe.** 🌌
