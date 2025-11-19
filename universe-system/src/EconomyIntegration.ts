/**
 * EconomyIntegration.ts
 * Utilities for connecting Mining → Manufacturing → Economy → Trade
 * Provides helpers for the full production chain
 */

import { MiningSystem, OreType } from './MiningSystem';
import { ManufacturingSystem, FacilityType, RecipeDatabase, ProductionRecipe } from './ManufacturingSystem';
import { EconomySystem } from './EconomySystem';
import { CommodityType, getCommodity } from './economy/commodity';
import { SpaceStation } from './StationGenerator';
import { ProductionEconomyBridge } from './ProductionEconomyBridge';

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
   * Now uses ProductionEconomyBridge for proper commodity handling
   */
  transferGoodsToMarket(
    facilityId: string,
    stationId: string,
    commodity: CommodityType,
    amount: number
  ): { success: boolean; message: string; revenue: number } {
    const bridge = this.manufacturingSystem.getEconomyBridge();

    if (!bridge) {
      // Fallback to legacy mode
      const removed = this.manufacturingSystem.removeFromInventory(facilityId, commodity, amount);
      if (!removed) {
        return {
          success: false,
          message: 'Failed to remove goods from facility inventory',
          revenue: 0
        };
      }

      console.log(`[INTEGRATION] No economy bridge - stored ${amount.toFixed(1)}kg ${commodity} in facility`);
      return {
        success: true,
        message: `Stored ${amount.toFixed(1)}kg in facility (no market integration)`,
        revenue: 0
      };
    }

    // Validate facility has the goods
    const removed = this.manufacturingSystem.removeFromInventory(facilityId, commodity, amount);
    if (!removed) {
      return {
        success: false,
        message: 'Insufficient goods in facility inventory',
        revenue: 0
      };
    }

    // Use bridge to sell to market
    const outputs = new Map<CommodityType, number>([[commodity, amount]]);
    const result = bridge.produceOutputs(stationId, facilityId, outputs);

    if (result.success) {
      this.stats.commoditiesSold += amount;
      this.stats.creditsEarned += result.revenue;
      this.stats.goodsProduced += amount;

      console.log(`[INTEGRATION] Sold ${amount.toFixed(1)}kg of ${commodity} to market for ${result.revenue.toFixed(0)} credits`);

      return {
        success: true,
        message: result.message,
        revenue: result.revenue
      };
    } else {
      // Failed to sell, add back to inventory
      this.manufacturingSystem.addToInventory(facilityId, commodity, amount);
      return {
        success: false,
        message: result.message,
        revenue: 0
      };
    }
  }

  /**
   * Execute full production chain: Mine → Refine → Manufacture → Sell
   * This is a convenience method for automated production
   * With economy integration, purchasing and selling happens automatically during production
   */
  executeFullChain(
    stationId: string,
    refineryId: string,
    factoryId: string,
    recipeId: string
  ): { success: boolean; message: string; estimatedCost: number; estimatedRevenue: number } {
    const steps: string[] = [];
    const bridge = this.manufacturingSystem.getEconomyBridge();

    // Step 1: Transfer ore to refinery (if available from mining)
    const transferResult = this.transferOreToRefinery(stationId, refineryId);
    if (transferResult.success) {
      steps.push(`Transferred ${transferResult.transferred.size} ore types to refinery`);
    } else {
      steps.push(`No ore to transfer (will purchase from market if needed)`);
    }

    // Step 2: Validate recipe and estimate costs
    const recipe = RecipeDatabase.getRecipe(recipeId);
    if (!recipe) {
      return {
        success: false,
        message: 'Recipe not found',
        estimatedCost: 0,
        estimatedRevenue: 0
      };
    }

    // Estimate production economics
    let estimatedCost = 0;
    let estimatedRevenue = 0;

    if (bridge) {
      const estimate = bridge.estimateProductionProfit(stationId, recipe.inputs, recipe.outputs);
      estimatedCost = estimate.inputCost;
      estimatedRevenue = estimate.outputValue;

      steps.push(
        `Estimated: Cost ${estimatedCost.toFixed(0)} credits, Revenue ${estimatedRevenue.toFixed(0)} credits, Profit ${estimate.profit.toFixed(0)} (${estimate.margin.toFixed(1)}% margin)`
      );
    }

    // Step 3: Start manufacturing with recipe
    // With economy integration, this will automatically:
    // - Purchase inputs from market
    // - Consume them
    // - When complete, sell outputs to market
    const productionResult = this.manufacturingSystem.startProduction(factoryId, recipeId);
    if (!productionResult.success) {
      return {
        success: false,
        message: productionResult.message,
        estimatedCost,
        estimatedRevenue
      };
    }
    steps.push(`Started production: ${productionResult.job!.recipe.name}`);
    steps.push(`ETA: ${((productionResult.job!.estimatedCompletion - Date.now()) / 60000).toFixed(1)} minutes`);

    // Note: With economy integration, buying/selling happens automatically
    // Input purchase: At production start (already completed above)
    // Output sale: When production completes (happens in ManufacturingSystem.completeJob)

    return {
      success: true,
      message: steps.join('\n'),
      estimatedCost,
      estimatedRevenue
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
   * Now uses economy bridge for accurate pricing
   */
  suggestProfitableChains(stationId: string, limit: number = 5): {
    commodity: CommodityType;
    recipe: string;
    profit: number;
    margin: number;
    inputCost: number;
    outputValue: number;
    inputsAvailable: boolean;
  }[] {
    const suggestions: {
      commodity: CommodityType;
      recipe: string;
      profit: number;
      margin: number;
      inputCost: number;
      outputValue: number;
      inputsAvailable: boolean;
    }[] = [];

    const bridge = this.manufacturingSystem.getEconomyBridge();
    if (!bridge) return suggestions;

    const market = this.economySystem.getMarket(stationId);
    if (!market) return suggestions;

    // Check all recipes
    const allRecipes = RecipeDatabase.getAllRecipes();

    for (const recipe of allRecipes) {
      // Check if inputs are available
      const validation = bridge.checkInputsAvailable(stationId, recipe.inputs);

      // Estimate profitability
      const estimate = bridge.estimateProductionProfit(stationId, recipe.inputs, recipe.outputs);

      // Only suggest if profitable
      if (estimate.profit > 0) {
        // Get primary output commodity
        const outputs = Array.from(recipe.outputs.entries());
        if (outputs.length === 0) continue;
        const [commodity] = outputs[0];

        suggestions.push({
          commodity,
          recipe: recipe.id,
          profit: estimate.profit,
          margin: estimate.margin,
          inputCost: estimate.inputCost,
          outputValue: estimate.outputValue,
          inputsAvailable: validation.available
        });
      }
    }

    // Sort by profit, prioritizing recipes with available inputs
    suggestions.sort((a, b) => {
      // Prioritize available inputs
      if (a.inputsAvailable && !b.inputsAvailable) return -1;
      if (!a.inputsAvailable && b.inputsAvailable) return 1;
      // Then by profit
      return b.profit - a.profit;
    });

    return suggestions.slice(0, limit);
  }

  /**
   * Check resource availability for a recipe
   */
  checkResourceAvailability(
    stationId: string,
    recipeId: string
  ): {
    available: boolean;
    missing: Map<CommodityType, number>;
    details: string[];
    estimatedCost: number;
  } {
    const recipe = RecipeDatabase.getRecipe(recipeId);
    if (!recipe) {
      return {
        available: false,
        missing: new Map(),
        details: ['Recipe not found'],
        estimatedCost: 0
      };
    }

    const bridge = this.manufacturingSystem.getEconomyBridge();
    if (!bridge) {
      return {
        available: false,
        missing: new Map(),
        details: ['Economy bridge not initialized'],
        estimatedCost: 0
      };
    }

    const check = bridge.checkInputsAvailable(stationId, recipe.inputs);
    const estimate = bridge.estimateProductionProfit(stationId, recipe.inputs, recipe.outputs);

    return {
      available: check.available,
      missing: check.missing,
      details: check.details,
      estimatedCost: estimate.inputCost
    };
  }

  /**
   * Get supply chain status across multiple stations
   */
  getSupplyChainStatus(stationIds: string[]): {
    stationId: string;
    stationName: string;
    bottlenecks: number;
    productionCapacity: number;
    marketHealth: number;
  }[] {
    const bridge = this.manufacturingSystem.getEconomyBridge();
    if (!bridge) return [];

    const status = [];

    for (const stationId of stationIds) {
      const facilities = this.manufacturingSystem.getFacilitiesByStation(stationId);
      const bottlenecks = bridge.getStationBottlenecks(stationId);
      const chainStatus = bridge.getProductionChainStatus(stationId);

      // Calculate production capacity (active jobs / max jobs)
      let activeJobs = 0;
      let maxJobs = 0;
      for (const facility of facilities) {
        activeJobs += facility.activeJobs.length;
        maxJobs += facility.maxConcurrentJobs;
      }
      const productionCapacity = maxJobs > 0 ? activeJobs / maxJobs : 0;

      // Calculate market health (simple: based on efficiency and bottlenecks)
      const marketHealth = Math.max(0, chainStatus.efficiency - (bottlenecks.length * 0.1));

      status.push({
        stationId,
        stationName: stationId, // Would need to look up actual name
        bottlenecks: bottlenecks.length,
        productionCapacity,
        marketHealth
      });
    }

    return status;
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
