/**
 * ManufacturingSystem.ts
 * Production chain management: Raw materials → Refined materials → Manufactured goods
 * Connects mining operations to the economy through multi-stage processing
 */

import { CommodityType, CommodityCategory, getCommodity } from './economy/commodity';
import { OreType } from './MiningSystem';
import { EconomySystem } from './EconomySystem';
import { ProductionEconomyBridge, ProductionEventType } from './ProductionEconomyBridge';

/**
 * Production recipe - defines how to transform inputs into outputs
 */
export interface ProductionRecipe {
  id: string;
  name: string;
  description: string;

  // Input requirements
  inputs: Map<CommodityType, number>; // commodity -> quantity (kg)

  // Output products
  outputs: Map<CommodityType, number>; // commodity -> quantity (kg)

  // Production parameters
  processingTime: number; // seconds
  energyRequired: number; // kWh
  efficiency: number; // 0-1, yield multiplier

  // Requirements
  facilityType: FacilityType;
  techLevel: number; // 1-10
}

/**
 * Facility types that can perform manufacturing
 */
export enum FacilityType {
  REFINERY = 'REFINERY',               // Ore → Refined metals
  FOUNDRY = 'FOUNDRY',                 // Metals → Alloys
  FACTORY = 'FACTORY',                 // Components → Finished goods
  CHEMICAL_PLANT = 'CHEMICAL_PLANT',   // Chemical processing
  ELECTRONICS_PLANT = 'ELECTRONICS_PLANT', // Electronics manufacturing
  SHIPYARD = 'SHIPYARD',               // Ship components
  FOOD_PROCESSOR = 'FOOD_PROCESSOR',   // Food production
  WATER_TREATMENT = 'WATER_TREATMENT'  // Ice → Water/Oxygen
}

/**
 * Manufacturing facility instance
 */
export interface ManufacturingFacility {
  id: string;
  stationId: string;
  facilityType: FacilityType;
  techLevel: number;

  // Capacity
  maxConcurrentJobs: number;
  productionRateMultiplier: number; // 1.0 = normal speed

  // Current state
  activeJobs: ProductionJob[];
  inventory: Map<CommodityType, number>; // stored materials

  // Efficiency factors
  efficiency: number; // 0-1
  condition: number; // 0-1, degrades over time
  powerAvailable: number; // kW
}

/**
 * Active production job
 */
export interface ProductionJob {
  id: string;
  recipe: ProductionRecipe;
  facilityId: string;

  // Progress
  startTime: number;
  estimatedCompletion: number;
  progress: number; // 0-1

  // Actual resources used/produced
  inputsConsumed: Map<CommodityType, number>;
  outputsProduced: Map<CommodityType, number>;

  // State
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason?: string;
}

/**
 * Maps mining ore types to economy commodity types
 */
export const ORE_TO_COMMODITY_MAP: Map<OreType, CommodityType> = new Map([
  ['IRON', CommodityType.METALLIC_ORE],
  ['NICKEL', CommodityType.METALLIC_ORE],
  ['COPPER', CommodityType.METALLIC_ORE],
  ['ALUMINUM', CommodityType.ROCKY_ORE],
  ['TITANIUM', CommodityType.ROCKY_ORE],
  ['GOLD', CommodityType.PLATINUM],
  ['PLATINUM', CommodityType.PLATINUM],
  ['URANIUM', CommodityType.URANIUM],
  ['RARE_EARTHS', CommodityType.RARE_EARTH],
  ['WATER_ICE', CommodityType.ICE],
  ['VOLATILES', CommodityType.ICE],
  ['EXOTIC_MATTER', CommodityType.RARE_EARTH] // Treat as rare earth for now
]);

/**
 * All available production recipes
 */
export class RecipeDatabase {
  private static recipes: Map<string, ProductionRecipe> = new Map();

  /**
   * Initialize all production recipes
   */
  static initialize(): void {
    // Clear existing
    this.recipes.clear();

    // ========================================
    // TIER 1: Raw Materials → Refined Materials
    // ========================================

    // Refine metallic ore to steel
    this.addRecipe({
      id: 'refine_metallic_ore_to_steel',
      name: 'Refine Metallic Ore to Steel',
      description: 'Process iron and nickel ore into steel alloy',
      inputs: new Map([[CommodityType.METALLIC_ORE, 1000]]), // 1 ton ore
      outputs: new Map([[CommodityType.STEEL, 700]]), // 700kg steel (30% waste)
      processingTime: 3600, // 1 hour
      energyRequired: 500,
      efficiency: 0.7,
      facilityType: FacilityType.REFINERY,
      techLevel: 1
    });

    // Refine rocky ore to aluminum
    this.addRecipe({
      id: 'refine_rocky_ore_to_aluminum',
      name: 'Refine Rocky Ore to Aluminum',
      description: 'Extract aluminum from rocky ore through electrolysis',
      inputs: new Map([[CommodityType.ROCKY_ORE, 1000]]), // 1 ton ore
      outputs: new Map([[CommodityType.ALUMINUM, 500]]), // 500kg aluminum (50% efficiency)
      processingTime: 7200, // 2 hours
      energyRequired: 1000,
      efficiency: 0.5,
      facilityType: FacilityType.REFINERY,
      techLevel: 2
    });

    // Refine rocky ore to titanium (harder)
    this.addRecipe({
      id: 'refine_rocky_ore_to_titanium',
      name: 'Refine Rocky Ore to Titanium',
      description: 'Extract titanium from ore (energy intensive)',
      inputs: new Map([[CommodityType.ROCKY_ORE, 1000]]), // 1 ton ore
      outputs: new Map([[CommodityType.TITANIUM, 300]]), // 300kg titanium (70% waste)
      processingTime: 10800, // 3 hours
      energyRequired: 2000,
      efficiency: 0.3,
      facilityType: FacilityType.REFINERY,
      techLevel: 3
    });

    // Process ice to water and oxygen
    this.addRecipe({
      id: 'process_ice_to_water_oxygen',
      name: 'Process Ice to Water and Oxygen',
      description: 'Melt ice and electrolyze into water and oxygen',
      inputs: new Map([[CommodityType.ICE, 1000]]), // 1 ton ice
      outputs: new Map([
        [CommodityType.WATER, 800], // 800kg water
        [CommodityType.OXYGEN, 150]  // 150kg oxygen
      ]),
      processingTime: 1800, // 30 minutes
      energyRequired: 300,
      efficiency: 0.95,
      facilityType: FacilityType.WATER_TREATMENT,
      techLevel: 1
    });

    // Refine rare earth to silicon
    this.addRecipe({
      id: 'refine_rare_earth_to_silicon',
      name: 'Refine Rare Earth to Silicon',
      description: 'Extract high-purity silicon from rare earth ore',
      inputs: new Map([[CommodityType.RARE_EARTH, 1000]]), // 1 ton ore
      outputs: new Map([[CommodityType.SILICON, 400]]), // 400kg silicon
      processingTime: 14400, // 4 hours
      energyRequired: 1500,
      efficiency: 0.4,
      facilityType: FacilityType.REFINERY,
      techLevel: 4
    });

    // Extract copper from metallic ore
    this.addRecipe({
      id: 'extract_copper_from_ore',
      name: 'Extract Copper from Ore',
      description: 'Separate and refine copper from metallic ore',
      inputs: new Map([[CommodityType.METALLIC_ORE, 1000]]), // 1 ton ore
      outputs: new Map([[CommodityType.COPPER, 600]]), // 600kg copper
      processingTime: 5400, // 1.5 hours
      energyRequired: 700,
      efficiency: 0.6,
      facilityType: FacilityType.REFINERY,
      techLevel: 2
    });

    // ========================================
    // TIER 2: Refined Materials → Advanced Materials
    // ========================================

    // Create carbon fiber from refined materials
    this.addRecipe({
      id: 'produce_carbon_fiber',
      name: 'Produce Carbon Fiber',
      description: 'Manufacture carbon fiber composite from processed materials',
      inputs: new Map([
        [CommodityType.SILICON, 100],
        [CommodityType.RARE_EARTH, 50]
      ]),
      outputs: new Map([[CommodityType.CARBON_FIBER, 120]]),
      processingTime: 7200, // 2 hours
      energyRequired: 1200,
      efficiency: 0.8,
      facilityType: FacilityType.CHEMICAL_PLANT,
      techLevel: 5
    });

    // ========================================
    // TIER 3: Refined Materials → Manufactured Goods
    // ========================================

    // Manufacture electronics
    this.addRecipe({
      id: 'manufacture_electronics',
      name: 'Manufacture Electronics',
      description: 'Produce electronic components from silicon and copper',
      inputs: new Map([
        [CommodityType.SILICON, 200],
        [CommodityType.COPPER, 100],
        [CommodityType.RARE_EARTH, 50]
      ]),
      outputs: new Map([[CommodityType.ELECTRONICS, 300]]),
      processingTime: 10800, // 3 hours
      energyRequired: 800,
      efficiency: 0.85,
      facilityType: FacilityType.ELECTRONICS_PLANT,
      techLevel: 3
    });

    // Manufacture machinery
    this.addRecipe({
      id: 'manufacture_machinery',
      name: 'Manufacture Machinery',
      description: 'Assemble industrial machinery from steel and components',
      inputs: new Map([
        [CommodityType.STEEL, 500],
        [CommodityType.ALUMINUM, 200],
        [CommodityType.ELECTRONICS, 100]
      ]),
      outputs: new Map([[CommodityType.MACHINERY, 700]]),
      processingTime: 14400, // 4 hours
      energyRequired: 1000,
      efficiency: 0.85,
      facilityType: FacilityType.FACTORY,
      techLevel: 3
    });

    // Manufacture tools
    this.addRecipe({
      id: 'manufacture_tools',
      name: 'Manufacture Tools',
      description: 'Produce tools and equipment from steel',
      inputs: new Map([
        [CommodityType.STEEL, 300],
        [CommodityType.TITANIUM, 100]
      ]),
      outputs: new Map([[CommodityType.TOOLS, 350]]),
      processingTime: 7200, // 2 hours
      energyRequired: 500,
      efficiency: 0.9,
      facilityType: FacilityType.FACTORY,
      techLevel: 2
    });

    // Manufacture construction materials
    this.addRecipe({
      id: 'manufacture_construction_materials',
      name: 'Manufacture Construction Materials',
      description: 'Produce prefabricated building components',
      inputs: new Map([
        [CommodityType.STEEL, 400],
        [CommodityType.ALUMINUM, 300],
        [CommodityType.SILICON, 100]
      ]),
      outputs: new Map([[CommodityType.CONSTRUCTION_MATERIALS, 700]]),
      processingTime: 10800, // 3 hours
      energyRequired: 900,
      efficiency: 0.85,
      facilityType: FacilityType.FACTORY,
      techLevel: 2
    });

    // ========================================
    // TIER 4: Complex Manufacturing
    // ========================================

    // Manufacture ship components
    this.addRecipe({
      id: 'manufacture_ship_components',
      name: 'Manufacture Ship Components',
      description: 'Produce advanced ship parts and systems',
      inputs: new Map([
        [CommodityType.TITANIUM, 300],
        [CommodityType.CARBON_FIBER, 200],
        [CommodityType.ELECTRONICS, 200],
        [CommodityType.MACHINERY, 100]
      ]),
      outputs: new Map([[CommodityType.SHIP_COMPONENTS, 700]]),
      processingTime: 21600, // 6 hours
      energyRequired: 2000,
      efficiency: 0.8,
      facilityType: FacilityType.SHIPYARD,
      techLevel: 5
    });

    // Manufacture computer systems
    this.addRecipe({
      id: 'manufacture_computer_systems',
      name: 'Manufacture Computer Systems',
      description: 'Assemble advanced computing hardware',
      inputs: new Map([
        [CommodityType.SILICON, 300],
        [CommodityType.RARE_EARTH, 100],
        [CommodityType.ELECTRONICS, 200]
      ]),
      outputs: new Map([[CommodityType.COMPUTER_SYSTEMS, 400]]),
      processingTime: 18000, // 5 hours
      energyRequired: 1500,
      efficiency: 0.75,
      facilityType: FacilityType.ELECTRONICS_PLANT,
      techLevel: 6
    });

    // Manufacture sensors
    this.addRecipe({
      id: 'manufacture_sensors',
      name: 'Manufacture Sensors',
      description: 'Produce advanced sensor arrays',
      inputs: new Map([
        [CommodityType.SILICON, 200],
        [CommodityType.RARE_EARTH, 150],
        [CommodityType.ELECTRONICS, 100]
      ]),
      outputs: new Map([[CommodityType.SENSORS, 350]]),
      processingTime: 14400, // 4 hours
      energyRequired: 1200,
      efficiency: 0.8,
      facilityType: FacilityType.ELECTRONICS_PLANT,
      techLevel: 5
    });

    // Manufacture weapons
    this.addRecipe({
      id: 'manufacture_weapons',
      name: 'Manufacture Weapons',
      description: 'Produce ship-mounted weapon systems',
      inputs: new Map([
        [CommodityType.STEEL, 300],
        [CommodityType.TITANIUM, 200],
        [CommodityType.ELECTRONICS, 150],
        [CommodityType.URANIUM, 50]
      ]),
      outputs: new Map([[CommodityType.WEAPONS, 500]]),
      processingTime: 18000, // 5 hours
      energyRequired: 1800,
      efficiency: 0.75,
      facilityType: FacilityType.FACTORY,
      techLevel: 6
    });

    // Manufacture shield generators
    this.addRecipe({
      id: 'manufacture_shield_generators',
      name: 'Manufacture Shield Generators',
      description: 'Produce defensive shield technology',
      inputs: new Map([
        [CommodityType.TITANIUM, 200],
        [CommodityType.RARE_EARTH, 150],
        [CommodityType.ELECTRONICS, 200],
        [CommodityType.URANIUM, 100]
      ]),
      outputs: new Map([[CommodityType.SHIELD_GENERATORS, 450]]),
      processingTime: 21600, // 6 hours
      energyRequired: 2500,
      efficiency: 0.7,
      facilityType: FacilityType.FACTORY,
      techLevel: 7
    });

    // ========================================
    // TIER 5: Luxury & Advanced
    // ========================================

    // Manufacture jewelry from platinum
    this.addRecipe({
      id: 'manufacture_jewelry',
      name: 'Manufacture Jewelry',
      description: 'Craft jewelry from precious metals',
      inputs: new Map([
        [CommodityType.PLATINUM, 100],
        [CommodityType.RARE_EARTH, 20]
      ]),
      outputs: new Map([[CommodityType.JEWELRY, 100]]),
      processingTime: 14400, // 4 hours
      energyRequired: 500,
      efficiency: 0.9,
      facilityType: FacilityType.FACTORY,
      techLevel: 3
    });

    // Process food
    this.addRecipe({
      id: 'process_food',
      name: 'Process Food',
      description: 'Produce preserved food from water and raw materials',
      inputs: new Map([
        [CommodityType.WATER, 600],
        [CommodityType.OXYGEN, 100],
        [CommodityType.RARE_EARTH, 50] // Nutrients
      ]),
      outputs: new Map([[CommodityType.FOOD, 500]]),
      processingTime: 10800, // 3 hours
      energyRequired: 700,
      efficiency: 0.7,
      facilityType: FacilityType.FOOD_PROCESSOR,
      techLevel: 2
    });

    // ========================================
    // FUEL PRODUCTION
    // ========================================

    // Produce hydrogen fuel from water
    this.addRecipe({
      id: 'produce_hydrogen_fuel',
      name: 'Produce Hydrogen Fuel',
      description: 'Electrolyze water to produce hydrogen fuel',
      inputs: new Map([[CommodityType.WATER, 1000]]),
      outputs: new Map([
        [CommodityType.HYDROGEN_FUEL, 111], // ~11% by mass
        [CommodityType.OXYGEN, 889] // ~89% by mass
      ]),
      processingTime: 3600, // 1 hour
      energyRequired: 800,
      efficiency: 0.9,
      facilityType: FacilityType.CHEMICAL_PLANT,
      techLevel: 2
    });

    // Produce fusion pellets
    this.addRecipe({
      id: 'produce_fusion_pellets',
      name: 'Produce Fusion Pellets',
      description: 'Create deuterium-tritium fuel pellets',
      inputs: new Map([
        [CommodityType.HYDROGEN_FUEL, 500],
        [CommodityType.URANIUM, 100]
      ]),
      outputs: new Map([[CommodityType.FUSION_PELLETS, 50]]),
      processingTime: 28800, // 8 hours
      energyRequired: 5000,
      efficiency: 0.6,
      facilityType: FacilityType.CHEMICAL_PLANT,
      techLevel: 8
    });
  }

  private static addRecipe(recipe: ProductionRecipe): void {
    this.recipes.set(recipe.id, recipe);
  }

  /**
   * Get recipe by ID
   */
  static getRecipe(id: string): ProductionRecipe | undefined {
    return this.recipes.get(id);
  }

  /**
   * Get all recipes
   */
  static getAllRecipes(): ProductionRecipe[] {
    return Array.from(this.recipes.values());
  }

  /**
   * Get recipes by facility type
   */
  static getRecipesByFacility(facilityType: FacilityType): ProductionRecipe[] {
    return Array.from(this.recipes.values()).filter(r => r.facilityType === facilityType);
  }

  /**
   * Get recipes that produce a specific commodity
   */
  static getRecipesProducing(commodity: CommodityType): ProductionRecipe[] {
    return Array.from(this.recipes.values()).filter(r => r.outputs.has(commodity));
  }

  /**
   * Get recipes that consume a specific commodity
   */
  static getRecipesConsuming(commodity: CommodityType): ProductionRecipe[] {
    return Array.from(this.recipes.values()).filter(r => r.inputs.has(commodity));
  }
}

/**
 * Manufacturing System - manages production across facilities
 */
export class ManufacturingSystem {
  private facilities: Map<string, ManufacturingFacility> = new Map();
  private jobIdCounter: number = 0;
  private economySystem: EconomySystem | null = null;
  private economyBridge: ProductionEconomyBridge | null = null;

  constructor() {
    // Initialize recipe database
    RecipeDatabase.initialize();
  }

  /**
   * Link to economy system for market integration
   */
  linkEconomySystem(economySystem: EconomySystem): void {
    this.economySystem = economySystem;
    this.economyBridge = new ProductionEconomyBridge(economySystem, this);
    console.log('[MANUFACTURING] Linked to economy system - production will now affect markets');
  }

  /**
   * Get economy bridge for external access
   */
  getEconomyBridge(): ProductionEconomyBridge | null {
    return this.economyBridge;
  }

  /**
   * Register a manufacturing facility
   */
  registerFacility(facility: ManufacturingFacility): void {
    this.facilities.set(facility.id, facility);
    console.log(`[MANUFACTURING] Registered ${facility.facilityType} facility at station ${facility.stationId}`);
  }

  /**
   * Create a facility for a station
   */
  createFacility(
    stationId: string,
    facilityType: FacilityType,
    techLevel: number = 1
  ): ManufacturingFacility {
    const facility: ManufacturingFacility = {
      id: `${stationId}-${facilityType}-${Date.now()}`,
      stationId,
      facilityType,
      techLevel,
      maxConcurrentJobs: this.getMaxJobsForFacility(facilityType),
      productionRateMultiplier: 1.0,
      activeJobs: [],
      inventory: new Map(),
      efficiency: 0.85,
      condition: 1.0,
      powerAvailable: this.getPowerForFacility(facilityType)
    };

    this.registerFacility(facility);
    return facility;
  }

  /**
   * Start a production job
   */
  startProduction(
    facilityId: string,
    recipeId: string,
    batchSize: number = 1
  ): { success: boolean; job?: ProductionJob; message: string } {
    const facility = this.facilities.get(facilityId);
    if (!facility) {
      return { success: false, message: 'Facility not found' };
    }

    const recipe = RecipeDatabase.getRecipe(recipeId);
    if (!recipe) {
      return { success: false, message: 'Recipe not found' };
    }

    // Check facility type matches
    if (recipe.facilityType !== facility.facilityType) {
      return {
        success: false,
        message: `Recipe requires ${recipe.facilityType} but facility is ${facility.facilityType}`
      };
    }

    // Check tech level
    if (recipe.techLevel > facility.techLevel) {
      return {
        success: false,
        message: `Recipe requires tech level ${recipe.techLevel}, facility is level ${facility.techLevel}`
      };
    }

    // Check concurrent job limit
    if (facility.activeJobs.length >= facility.maxConcurrentJobs) {
      return {
        success: false,
        message: 'Facility at capacity, cannot start new job'
      };
    }

    // Check inputs available (market + inventory)
    if (this.economyBridge && this.economySystem) {
      // Economy-integrated mode: Check market availability
      const validation = this.economyBridge.validateProduction(facility.stationId, recipe.inputs);
      if (!validation.valid) {
        console.log(`[MANUFACTURING] Production blocked - resource shortage:`);
        validation.details.forEach(detail => console.log(`  ${detail}`));
        return {
          success: false,
          message: validation.message
        };
      }
    } else {
      // Legacy mode: Check facility inventory only
      for (const [commodity, amount] of recipe.inputs) {
        const available = facility.inventory.get(commodity) || 0;
        const required = amount * batchSize;
        if (available < required) {
          const commodityInfo = getCommodity(commodity);
          return {
            success: false,
            message: `Insufficient ${commodityInfo.name}: need ${required}kg, have ${available}kg`
          };
        }
      }
    }

    // Check power
    if (facility.powerAvailable < recipe.energyRequired) {
      return {
        success: false,
        message: `Insufficient power: need ${recipe.energyRequired}kW, have ${facility.powerAvailable}kW`
      };
    }

    // Consume inputs
    if (this.economyBridge && this.economySystem) {
      // Economy-integrated mode: Purchase from market
      const consumeResult = this.economyBridge.consumeInputs(
        facility.stationId,
        facilityId,
        new Map(Array.from(recipe.inputs).map(([c, amt]) => [c, amt * batchSize]))
      );

      if (!consumeResult.success) {
        return {
          success: false,
          message: `Failed to acquire inputs: ${consumeResult.message}`
        };
      }

      console.log(`[MANUFACTURING] Consumed inputs from market: ${consumeResult.cost.toFixed(0)} credits`);
    } else {
      // Legacy mode: Consume from facility inventory
      for (const [commodity, amount] of recipe.inputs) {
        const current = facility.inventory.get(commodity) || 0;
        facility.inventory.set(commodity, current - (amount * batchSize));
      }
    }

    // Create job
    const now = Date.now();
    const processingTime = recipe.processingTime * batchSize / facility.productionRateMultiplier;

    const job: ProductionJob = {
      id: `job-${this.jobIdCounter++}`,
      recipe,
      facilityId,
      startTime: now,
      estimatedCompletion: now + processingTime * 1000,
      progress: 0,
      inputsConsumed: new Map(recipe.inputs),
      outputsProduced: new Map(),
      status: 'PROCESSING'
    };

    facility.activeJobs.push(job);

    console.log(`[MANUFACTURING] Started job ${job.id}: ${recipe.name} at facility ${facilityId}`);
    console.log(`  ETA: ${(processingTime / 60).toFixed(1)} minutes`);

    return {
      success: true,
      job,
      message: `Production started: ${recipe.name}`
    };
  }

  /**
   * Update all manufacturing facilities
   */
  update(deltaTime: number): void {
    for (const facility of this.facilities.values()) {
      this.updateFacility(facility, deltaTime);
    }
  }

  /**
   * Update a single facility
   */
  private updateFacility(facility: ManufacturingFacility, deltaTime: number): void {
    const now = Date.now();

    // Update each active job
    for (let i = facility.activeJobs.length - 1; i >= 0; i--) {
      const job = facility.activeJobs[i];

      if (job.status !== 'PROCESSING') continue;

      // Update progress
      const totalTime = job.estimatedCompletion - job.startTime;
      const elapsed = now - job.startTime;
      job.progress = Math.min(1.0, elapsed / totalTime);

      // Check if completed
      if (now >= job.estimatedCompletion) {
        this.completeJob(facility, job);
        facility.activeJobs.splice(i, 1);
      }
    }

    // Degrade facility condition slightly over time
    facility.condition -= 0.00001 * deltaTime;
    facility.condition = Math.max(0.1, facility.condition);

    // Efficiency decreases with poor condition
    facility.efficiency = 0.5 + (facility.condition * 0.5);

    // AUTO-PRODUCTION: If facility has capacity and no active jobs, start production
    if (facility.activeJobs.length < 3 && facility.availableRecipes.length > 0) {
      // Pick a random recipe the facility can produce
      const recipe = facility.availableRecipes[Math.floor(Math.random() * facility.availableRecipes.length)];
      const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 units

      // Try to start production (will check resources internally)
      const result = this.startProduction(facility.id, recipe.id, quantity);
      if (result.success) {
        console.log(`[MANUFACTURING] Auto-started: ${recipe.id} x${quantity} at ${facility.name}`);
      }
    }
  }

  /**
   * Complete a production job
   */
  private completeJob(facility: ManufacturingFacility, job: ProductionJob): void {
    job.status = 'COMPLETED';
    job.progress = 1.0;

    console.log(`[MANUFACTURING] Completed: ${job.recipe.id} at ${facility.name} (${job.quantity} units)`);

    // Calculate actual output based on efficiency
    const totalEfficiency = job.recipe.efficiency * facility.efficiency * facility.condition;

    const outputs = new Map<CommodityType, number>();
    for (const [commodity, amount] of job.recipe.outputs) {
      const actualOutput = amount * totalEfficiency;
      job.outputsProduced.set(commodity, actualOutput);
      outputs.set(commodity, actualOutput);
    }

    // Produce outputs
    if (this.economyBridge && this.economySystem) {
      // Economy-integrated mode: Sell to market
      const produceResult = this.economyBridge.produceOutputs(
        facility.stationId,
        facility.id,
        outputs
      );

      if (produceResult.success) {
        console.log(`[MANUFACTURING] Produced outputs to market: ${produceResult.revenue.toFixed(0)} credits revenue`);
      } else {
        console.log(`[MANUFACTURING] ${produceResult.message}`);
      }

      // Emit completion event
      if (this.economyBridge) {
        for (const [commodity, amount] of outputs) {
          const commodityInfo = getCommodity(commodity);
          console.log(`[MANUFACTURING] Produced ${amount.toFixed(1)}kg ${commodityInfo.name}`);
        }
      }
    } else {
      // Legacy mode: Add to facility inventory
      for (const [commodity, amount] of outputs) {
        const current = facility.inventory.get(commodity) || 0;
        facility.inventory.set(commodity, current + amount);

        const commodityInfo = getCommodity(commodity);
        console.log(`[MANUFACTURING] Produced ${amount.toFixed(1)}kg ${commodityInfo.name}`);
      }
    }

    console.log(`[MANUFACTURING] Job ${job.id} completed: ${job.recipe.name}`);
  }

  /**
   * Add materials to facility inventory
   */
  addToInventory(facilityId: string, commodity: CommodityType, amount: number): boolean {
    const facility = this.facilities.get(facilityId);
    if (!facility) return false;

    const current = facility.inventory.get(commodity) || 0;
    facility.inventory.set(commodity, current + amount);

    const commodityInfo = getCommodity(commodity);
    console.log(`[MANUFACTURING] Added ${amount.toFixed(1)}kg ${commodityInfo.name} to facility ${facilityId}`);

    return true;
  }

  /**
   * Remove materials from facility inventory
   */
  removeFromInventory(facilityId: string, commodity: CommodityType, amount: number): boolean {
    const facility = this.facilities.get(facilityId);
    if (!facility) return false;

    const current = facility.inventory.get(commodity) || 0;
    if (current < amount) return false;

    facility.inventory.set(commodity, current - amount);

    const commodityInfo = getCommodity(commodity);
    console.log(`[MANUFACTURING] Removed ${amount.toFixed(1)}kg ${commodityInfo.name} from facility ${facilityId}`);

    return true;
  }

  /**
   * Get facility status
   */
  getFacilityStatus(facilityId: string): string {
    const facility = this.facilities.get(facilityId);
    if (!facility) return 'Facility not found';

    const lines: string[] = [];
    lines.push(`=== ${facility.facilityType} ===`);
    lines.push(`Station: ${facility.stationId}`);
    lines.push(`Tech Level: ${facility.techLevel}`);
    lines.push(`Condition: ${(facility.condition * 100).toFixed(0)}%`);
    lines.push(`Efficiency: ${(facility.efficiency * 100).toFixed(0)}%`);
    lines.push(`Power: ${facility.powerAvailable}kW`);
    lines.push('');

    lines.push(`Active Jobs: ${facility.activeJobs.length}/${facility.maxConcurrentJobs}`);
    if (facility.activeJobs.length > 0) {
      for (const job of facility.activeJobs) {
        lines.push(`  ${job.recipe.name} - ${(job.progress * 100).toFixed(0)}% complete`);
      }
    }
    lines.push('');

    lines.push('Inventory:');
    if (facility.inventory.size === 0) {
      lines.push('  Empty');
    } else {
      for (const [commodity, amount] of facility.inventory) {
        if (amount > 0) {
          const commodityInfo = getCommodity(commodity);
          lines.push(`  ${commodityInfo.name}: ${amount.toFixed(1)}kg`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get all facilities for a station
   */
  getFacilitiesByStation(stationId: string): ManufacturingFacility[] {
    return Array.from(this.facilities.values()).filter(f => f.stationId === stationId);
  }

  /**
   * Get available recipes for a facility
   */
  getAvailableRecipes(facilityId: string): ProductionRecipe[] {
    const facility = this.facilities.get(facilityId);
    if (!facility) return [];

    return RecipeDatabase.getRecipesByFacility(facility.facilityType)
      .filter(r => r.techLevel <= facility.techLevel);
  }

  /**
   * Helper: Get max concurrent jobs for facility type
   */
  private getMaxJobsForFacility(type: FacilityType): number {
    switch (type) {
      case FacilityType.REFINERY: return 4;
      case FacilityType.FACTORY: return 3;
      case FacilityType.SHIPYARD: return 2;
      case FacilityType.ELECTRONICS_PLANT: return 3;
      case FacilityType.CHEMICAL_PLANT: return 3;
      default: return 2;
    }
  }

  /**
   * Helper: Get power capacity for facility type
   */
  private getPowerForFacility(type: FacilityType): number {
    switch (type) {
      case FacilityType.REFINERY: return 3000;
      case FacilityType.FACTORY: return 2000;
      case FacilityType.SHIPYARD: return 5000;
      case FacilityType.ELECTRONICS_PLANT: return 2500;
      case FacilityType.CHEMICAL_PLANT: return 3500;
      default: return 1500;
    }
  }

  // ====================================================================
  // SAVE/LOAD SUPPORT
  // ====================================================================

  /**
   * Serialize system state for saving
   */
  serialize(): import('./SaveFileFormat').ManufacturingSystemState {
    const facilities = Array.from(this.facilities.values()).map(facility => {
      // Serialize active jobs
      const activeJobs = facility.activeJobs.map(job => ({
        id: job.id,
        recipeId: job.recipe.id,
        facilityId: job.facilityId,
        startTime: job.startTime,
        estimatedCompletion: job.estimatedCompletion,
        progress: job.progress,
        inputsConsumed: Array.from(job.inputsConsumed.entries()).map(([commodity, quantity]) => ({ commodity, quantity })),
        outputsProduced: Array.from(job.outputsProduced.entries()).map(([commodity, quantity]) => ({ commodity, quantity })),
        status: job.status,
        failureReason: job.failureReason
      }));

      // Serialize inventory
      const inventory = Array.from(facility.inventory.entries()).map(([commodity, quantity]) => ({ commodity, quantity }));

      return {
        id: facility.id,
        stationId: facility.stationId,
        facilityType: facility.facilityType,
        techLevel: facility.techLevel,
        maxConcurrentJobs: facility.maxConcurrentJobs,
        productionRateMultiplier: facility.productionRateMultiplier,
        activeJobs,
        inventory,
        efficiency: facility.efficiency,
        condition: facility.condition,
        powerAvailable: facility.powerAvailable
      };
    });

    return {
      facilities,
      jobIdCounter: this.jobIdCounter
    };
  }

  /**
   * Deserialize and restore system state
   */
  deserialize(state: import('./SaveFileFormat').ManufacturingSystemState): void {
    console.log('[ManufacturingSystem] Deserializing state...');

    // Clear existing state
    this.facilities.clear();

    // Restore facilities
    for (const serializedFacility of state.facilities) {
      // Restore active jobs
      const activeJobs: ProductionJob[] = [];
      for (const serializedJob of serializedFacility.activeJobs) {
        const recipe = RecipeDatabase.getRecipe(serializedJob.recipeId);
        if (!recipe) {
          console.warn(`[ManufacturingSystem] Recipe ${serializedJob.recipeId} not found, skipping job ${serializedJob.id}`);
          continue;
        }

        const job: ProductionJob = {
          id: serializedJob.id,
          recipe,
          facilityId: serializedJob.facilityId,
          startTime: serializedJob.startTime,
          estimatedCompletion: serializedJob.estimatedCompletion,
          progress: serializedJob.progress,
          inputsConsumed: new Map(serializedJob.inputsConsumed.map(({ commodity, quantity }) => [commodity, quantity])),
          outputsProduced: new Map(serializedJob.outputsProduced.map(({ commodity, quantity }) => [commodity, quantity])),
          status: serializedJob.status,
          failureReason: serializedJob.failureReason
        };

        activeJobs.push(job);
      }

      // Restore inventory
      const inventory = new Map(serializedFacility.inventory.map(({ commodity, quantity }) => [commodity, quantity]));

      const facility: ManufacturingFacility = {
        id: serializedFacility.id,
        stationId: serializedFacility.stationId,
        facilityType: serializedFacility.facilityType,
        techLevel: serializedFacility.techLevel,
        maxConcurrentJobs: serializedFacility.maxConcurrentJobs,
        productionRateMultiplier: serializedFacility.productionRateMultiplier,
        activeJobs,
        inventory,
        efficiency: serializedFacility.efficiency,
        condition: serializedFacility.condition,
        powerAvailable: serializedFacility.powerAvailable
      };

      this.facilities.set(facility.id, facility);
    }

    // Restore counter
    this.jobIdCounter = state.jobIdCounter;

    console.log(`[ManufacturingSystem] Restored ${this.facilities.size} facilities`);
  }
}
