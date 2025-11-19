/**
 * EconomyIntegration.ts
 * Utilities for connecting Mining → Manufacturing → Economy → Trade
 * Provides helpers for the full production chain
 */

import { MiningSystem, OreType } from './MiningSystem';
import { ManufacturingSystem, FacilityType, RecipeDatabase } from './ManufacturingSystem';
import { EconomySystem } from './EconomySystem';
import { CommodityType, getCommodity } from './economy/commodity';
import { SpaceStation } from './StationGenerator';

/**
 * Production chain tracker
 * Tracks the flow from asteroids → ore → refined → manufactured → trade
 */
export interface ProductionChainStats {
  // Mining
  asteroidsMined: number;
  rawOreExtracted: number; // kg
  oreTypesExtracted: Map<OreType, number>;

  // Refining
  oreRefined: number; // kg
  refiningWaste: number; // kg
  refinedCommodities: Map<CommodityType, number>;

  // Manufacturing
  goodsProduced: number; // kg
  manufacturingJobsCompleted: number;
  productionTime: number; // total seconds

  // Trading
  commoditiesSold: number; // kg
  creditsEarned: number;

  // Efficiency
  overallEfficiency: number; // 0-1
  valueAdded: number; // credits added through processing
}

/**
 * Integration helper for managing production chains
 */
export class ProductionChainManager {
  private miningSystem: MiningSystem;
  private manufacturingSystem: ManufacturingSystem;
  private economySystem: EconomySystem;

  private stats: ProductionChainStats;

  constructor(
    miningSystem: MiningSystem,
    manufacturingSystem: ManufacturingSystem,
    economySystem: EconomySystem
  ) {
    this.miningSystem = miningSystem;
    this.manufacturingSystem = manufacturingSystem;
    this.economySystem = economySystem;

    this.stats = this.initializeStats();
  }

  /**
   * Initialize stats tracker
   */
  private initializeStats(): ProductionChainStats {
    return {
      asteroidsMined: 0,
      rawOreExtracted: 0,
      oreTypesExtracted: new Map(),
      oreRefined: 0,
      refiningWaste: 0,
      refinedCommodities: new Map(),
      goodsProduced: 0,
      manufacturingJobsCompleted: 0,
      productionTime: 0,
      commoditiesSold: 0,
      creditsEarned: 0,
      overallEfficiency: 0,
      valueAdded: 0
    };
  }

  /**
   * Transfer refined ore from mining ship to station refinery
   */
  transferOreToRefinery(
    stationId: string,
    refineryFacilityId: string
  ): { success: boolean; transferred: Map<CommodityType, number>; message: string } {
    // Get refined commodities from mining system
    const commodities = this.miningSystem.transferAllCommodities();

    if (commodities.size === 0) {
      return {
        success: false,
        transferred: new Map(),
        message: 'No refined ore available to transfer'
      };
    }

    // Add to refinery facility inventory
    let totalTransferred = 0;
    for (const [commodity, amount] of commodities) {
      this.manufacturingSystem.addToInventory(refineryFacilityId, commodity, amount);
      totalTransferred += amount;

      // Update stats
      const existing = this.stats.refinedCommodities.get(commodity) || 0;
      this.stats.refinedCommodities.set(commodity, existing + amount);
    }

    this.stats.oreRefined += totalTransferred;

    console.log(`[INTEGRATION] Transferred ${totalTransferred.toFixed(1)}kg refined ore to refinery ${refineryFacilityId}`);

    return {
      success: true,
      transferred: commodities,
      message: `Transferred ${totalTransferred.toFixed(1)}kg of refined ore to station refinery`
    };
  }

  /**
   * Transfer manufactured goods from facility to station market
   */
  transferGoodsToMarket(
    facilityId: string,
    stationId: string,
    commodity: CommodityType,
    amount: number
  ): { success: boolean; message: string } {
    // Remove from facility
    const removed = this.manufacturingSystem.removeFromInventory(facilityId, commodity, amount);
    if (!removed) {
      return {
        success: false,
        message: 'Failed to remove goods from facility inventory'
      };
    }

    // Add to station market (by selling to the station)
    const result = this.economySystem.executeTrade(stationId, commodity, amount, false);

    if (result.success) {
      this.stats.commoditiesSold += amount;
      this.stats.creditsEarned += result.total;
      this.stats.goodsProduced += amount;

      console.log(`[INTEGRATION] Sold ${amount.toFixed(1)}kg of ${commodity} to market for ${result.total.toFixed(0)} credits`);

      return {
        success: true,
        message: `Sold ${amount.toFixed(1)}kg for ${result.total.toFixed(0)} credits`
      };
    } else {
      // Failed to sell, add back to inventory
      this.manufacturingSystem.addToInventory(facilityId, commodity, amount);
      return {
        success: false,
        message: 'Market rejected goods (low demand)'
      };
    }
  }

  /**
   * Execute full production chain: Mine → Refine → Manufacture → Sell
   * This is a convenience method for automated production
   */
  executeFullChain(
    stationId: string,
    refineryId: string,
    factoryId: string,
    recipeId: string
  ): { success: boolean; message: string; creditsEarned: number } {
    const steps: string[] = [];

    // Step 1: Transfer ore to refinery
    const transferResult = this.transferOreToRefinery(stationId, refineryId);
    if (!transferResult.success) {
      return { success: false, message: transferResult.message, creditsEarned: 0 };
    }
    steps.push(`Transferred ${transferResult.transferred.size} ore types to refinery`);

    // Step 2: Start manufacturing with recipe
    const productionResult = this.manufacturingSystem.startProduction(factoryId, recipeId);
    if (!productionResult.success) {
      return { success: false, message: productionResult.message, creditsEarned: 0 };
    }
    steps.push(`Started production: ${productionResult.job!.recipe.name}`);

    // Note: Selling happens after production completes, not immediately
    // This is just the setup

    return {
      success: true,
      message: steps.join('\n'),
      creditsEarned: 0 // Will earn after production completes
    };
  }

  /**
   * Get optimal production chain for a commodity
   * Finds the best recipe chain to produce a target commodity
   */
  getOptimalChain(targetCommodity: CommodityType): {
    recipes: string[];
    requiredInputs: Map<CommodityType, number>;
    estimatedOutput: number;
    estimatedTime: number;
    estimatedValue: number;
  } {
    // Find recipes that produce the target
    const producingRecipes = RecipeDatabase.getRecipesProducing(targetCommodity);
    if (producingRecipes.length === 0) {
      return {
        recipes: [],
        requiredInputs: new Map(),
        estimatedOutput: 0,
        estimatedTime: 0,
        estimatedValue: 0
      };
    }

    // Pick the most efficient recipe (highest output per input)
    let bestRecipe = producingRecipes[0];
    let bestEfficiency = 0;

    for (const recipe of producingRecipes) {
      const inputMass = Array.from(recipe.inputs.values()).reduce((sum, amt) => sum + amt, 0);
      const outputMass = Array.from(recipe.outputs.values()).reduce((sum, amt) => sum + amt, 0);
      const efficiency = (outputMass / inputMass) * recipe.efficiency;

      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        bestRecipe = recipe;
      }
    }

    // Calculate requirements
    const requiredInputs = new Map(bestRecipe.inputs);
    const estimatedOutput = bestRecipe.outputs.get(targetCommodity) || 0;
    const estimatedTime = bestRecipe.processingTime;

    const commodityDef = getCommodity(targetCommodity);
    const estimatedValue = estimatedOutput * commodityDef.basePrice;

    return {
      recipes: [bestRecipe.id],
      requiredInputs,
      estimatedOutput,
      estimatedTime,
      estimatedValue
    };
  }

  /**
   * Suggest profitable production chains based on market conditions
   */
  suggestProfitableChains(stationId: string, limit: number = 5): {
    commodity: CommodityType;
    recipe: string;
    profit: number;
    demand: number;
  }[] {
    const suggestions: {
      commodity: CommodityType;
      recipe: string;
      profit: number;
      demand: number;
    }[] = [];

    const market = this.economySystem.getMarket(stationId);
    if (!market) return suggestions;

    // Check all recipes
    const allRecipes = RecipeDatabase.getAllRecipes();

    for (const recipe of allRecipes) {
      // Get first output commodity (simplified)
      const outputs = Array.from(recipe.outputs.entries());
      if (outputs.length === 0) continue;

      const [commodity, outputAmount] = outputs[0];

      // Get market data
      const marketData = market.get(commodity);
      if (!marketData) continue;

      // Calculate input cost (simplified - using base prices)
      let inputCost = 0;
      for (const [inputCommodity, inputAmount] of recipe.inputs) {
        const inputCommodityDef = getCommodity(inputCommodity);
        inputCost += inputAmount * inputCommodityDef.basePrice;
      }

      // Calculate output value at market price
      const outputValue = outputAmount * marketData.price * recipe.efficiency;

      // Calculate profit
      const profit = outputValue - inputCost;

      // Only suggest if profitable and has demand
      if (profit > 0 && marketData.demand > 0) {
        suggestions.push({
          commodity,
          recipe: recipe.id,
          profit,
          demand: marketData.demand
        });
      }
    }

    // Sort by profit
    suggestions.sort((a, b) => b.profit - a.profit);

    return suggestions.slice(0, limit);
  }

  /**
   * Get production chain statistics
   */
  getStats(): ProductionChainStats {
    // Calculate overall efficiency
    if (this.stats.rawOreExtracted > 0) {
      const totalProcessed = this.stats.oreRefined + this.stats.goodsProduced;
      this.stats.overallEfficiency = totalProcessed / this.stats.rawOreExtracted;
    }

    // Calculate value added
    // Value added = credits earned - raw material value
    // (simplified calculation)
    this.stats.valueAdded = this.stats.creditsEarned;

    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Get production summary report
   */
  getProductionReport(): string {
    const stats = this.getStats();
    const lines: string[] = [];

    lines.push('=== PRODUCTION CHAIN REPORT ===');
    lines.push('');

    lines.push('Mining:');
    lines.push(`  Asteroids Mined: ${stats.asteroidsMined}`);
    lines.push(`  Raw Ore Extracted: ${stats.rawOreExtracted.toFixed(1)}kg`);
    if (stats.oreTypesExtracted.size > 0) {
      lines.push('  Ore Types:');
      for (const [ore, amount] of stats.oreTypesExtracted) {
        lines.push(`    ${ore}: ${amount.toFixed(1)}kg`);
      }
    }
    lines.push('');

    lines.push('Refining:');
    lines.push(`  Ore Refined: ${stats.oreRefined.toFixed(1)}kg`);
    lines.push(`  Waste: ${stats.refiningWaste.toFixed(1)}kg`);
    if (stats.refinedCommodities.size > 0) {
      lines.push('  Refined Commodities:');
      for (const [commodity, amount] of stats.refinedCommodities) {
        lines.push(`    ${commodity}: ${amount.toFixed(1)}kg`);
      }
    }
    lines.push('');

    lines.push('Manufacturing:');
    lines.push(`  Goods Produced: ${stats.goodsProduced.toFixed(1)}kg`);
    lines.push(`  Jobs Completed: ${stats.manufacturingJobsCompleted}`);
    lines.push(`  Total Time: ${(stats.productionTime / 3600).toFixed(1)} hours`);
    lines.push('');

    lines.push('Trading:');
    lines.push(`  Commodities Sold: ${stats.commoditiesSold.toFixed(1)}kg`);
    lines.push(`  Credits Earned: ${stats.creditsEarned.toFixed(0)}`);
    lines.push('');

    lines.push('Efficiency:');
    lines.push(`  Overall: ${(stats.overallEfficiency * 100).toFixed(1)}%`);
    lines.push(`  Value Added: ${stats.valueAdded.toFixed(0)} credits`);

    return lines.join('\n');
  }
}

/**
 * Station production automation
 * Automatically runs production chains for a station
 */
export class StationProductionAutomation {
  private station: SpaceStation;
  private manufacturingSystem: ManufacturingSystem;
  private economySystem: EconomySystem;

  constructor(
    station: SpaceStation,
    manufacturingSystem: ManufacturingSystem,
    economySystem: EconomySystem
  ) {
    this.station = station;
    this.manufacturingSystem = manufacturingSystem;
    this.economySystem = economySystem;
  }

  /**
   * Auto-produce based on station type
   */
  autoProduceForStation(): void {
    const facilities = this.manufacturingSystem.getFacilitiesByStation(this.station.id);

    for (const facility of facilities) {
      // Get available recipes
      const recipes = this.manufacturingSystem.getAvailableRecipes(facility.id);

      // Pick a recipe based on facility type and station needs
      const recipe = this.selectRecipeForStation(recipes);

      if (recipe) {
        // Try to start production
        const result = this.manufacturingSystem.startProduction(facility.id, recipe.id);
        if (result.success) {
          console.log(`[AUTO-PRODUCTION] ${this.station.name}: Started ${recipe.name}`);
        }
      }
    }
  }

  /**
   * Select appropriate recipe for station type
   */
  private selectRecipeForStation(recipes: any[]): any {
    if (recipes.length === 0) return null;

    // Filter based on station type
    const stationType = this.station.stationType;

    // Mining platforms produce refined metals
    if (stationType === 'MINING_PLATFORM') {
      const metalRecipes = recipes.filter(r =>
        r.id.includes('refine') || r.id.includes('steel') || r.id.includes('aluminum')
      );
      return metalRecipes[0] || recipes[0];
    }

    // Fuel depots produce fuel
    if (stationType === 'FUEL_DEPOT') {
      const fuelRecipes = recipes.filter(r =>
        r.id.includes('hydrogen') || r.id.includes('fuel')
      );
      return fuelRecipes[0] || recipes[0];
    }

    // Shipyards produce ship components
    if (stationType === 'SHIPYARD') {
      const shipRecipes = recipes.filter(r =>
        r.id.includes('ship') || r.id.includes('component')
      );
      return shipRecipes[0] || recipes[0];
    }

    // Default: pick first recipe
    return recipes[0];
  }
}
