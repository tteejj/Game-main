/**
 * ResourceFlowTrackerIntegration.ts
 *
 * Integration examples and helper functions for ResourceFlowTracker.
 * Shows how to integrate with ManufacturingSystem, NPCShipAI, MiningSystem, and ConstructionSystem.
 */

import { ResourceFlowTracker } from './ResourceFlowTracker';
import { ManufacturingSystem, ProductionJob, ManufacturingFacility } from './ManufacturingSystem';
import { NPCShipAI, NPCShip, TradeRoute } from './NPCShipAI';
import { MiningSystem, MiningYield } from './MiningSystem';
import { ConstructionSystem, ConstructionProject } from './ConstructionSystem';
import { CommodityType } from './economy/commodity';

/**
 * Integration helper for Manufacturing System
 *
 * Hooks into production/consumption events to track resource flows.
 */
export class ManufacturingFlowIntegration {
  constructor(
    private flowTracker: ResourceFlowTracker,
    private manufacturingSystem: ManufacturingSystem
  ) {}

  /**
   * Wrap the ManufacturingSystem.completeJob method to track flows
   *
   * Call this during initialization to automatically track all production events.
   */
  installHooks(): void {
    // Store original method
    const originalCompleteJob = (this.manufacturingSystem as any).completeJob.bind(this.manufacturingSystem);

    // Replace with tracked version
    (this.manufacturingSystem as any).completeJob = (facility: ManufacturingFacility, job: ProductionJob) => {
      // Record input consumption
      for (const [commodity, amount] of job.inputsConsumed) {
        this.flowTracker.recordConsumption(
          facility.stationId,
          facility.id,
          commodity,
          amount,
          undefined, // systemId not available in current structure
          undefined  // location not available
        );
      }

      // Call original method
      originalCompleteJob(facility, job);

      // Record output production
      for (const [commodity, amount] of job.outputsProduced) {
        this.flowTracker.recordProduction(
          facility.stationId,
          facility.id,
          commodity,
          amount,
          undefined,
          undefined
        );
      }

      console.log(`[FlowTracker] Tracked production job: ${job.recipe.name}`);
    };

    console.log('[FlowTracker] Manufacturing hooks installed');
  }

  /**
   * Manual tracking method (if you don't want to use hooks)
   *
   * Call this whenever a production job completes.
   */
  trackProductionJob(facility: ManufacturingFacility, job: ProductionJob): void {
    // Record inputs consumed
    for (const [commodity, amount] of job.inputsConsumed) {
      this.flowTracker.recordConsumption(
        facility.stationId,
        facility.id,
        commodity,
        amount
      );
    }

    // Record outputs produced
    for (const [commodity, amount] of job.outputsProduced) {
      this.flowTracker.recordProduction(
        facility.stationId,
        facility.id,
        commodity,
        amount
      );
    }
  }
}

/**
 * Integration helper for NPC Ship AI
 *
 * Tracks trade routes and cargo transfers.
 */
export class NPCShipFlowIntegration {
  constructor(
    private flowTracker: ResourceFlowTracker,
    private npcShipAI: NPCShipAI
  ) {}

  /**
   * Install hooks into NPC Ship AI trading system
   */
  installHooks(): void {
    // Store original method
    const originalHandleTradingState = (this.npcShipAI as any).handleTradingState.bind(this.npcShipAI);

    // Replace with tracked version
    (this.npcShipAI as any).handleTradingState = (
      ship: NPCShip,
      deltaTime: number,
      stations: Map<string, any>,
      factionSystem?: any
    ) => {
      // Call original method
      originalHandleTradingState(ship, deltaTime, stations, factionSystem);

      // Track completed trades
      if (ship.route && ship.cargo.length === 0 && ship.currentTarget === ship.route.toStation) {
        // Trade just completed, record it
        this.trackTrade(ship, ship.route);
      }
    };

    console.log('[FlowTracker] NPC Ship AI hooks installed');
  }

  /**
   * Manual tracking method for completed trades
   */
  trackTrade(ship: NPCShip, route: TradeRoute): void {
    // Estimate quantity from ship's cargo capacity and route
    const estimatedQuantity = ship.stats.cargoCapacity * 0.8; // Assume 80% capacity

    this.flowTracker.recordTrade(
      route.fromStation,
      route.toStation,
      ship.id,
      this.convertCommodityType(route.commodity),
      estimatedQuantity
    );

    console.log(`[FlowTracker] Tracked trade: ${ship.id} from ${route.fromStation} to ${route.toStation}`);
  }

  /**
   * Track individual cargo loading (if you have more granular data)
   */
  trackCargoLoading(ship: NPCShip, stationId: string, commodity: string, quantity: number): void {
    this.flowTracker.recordEvent({
      type: 'TRADE' as any,
      commodity: this.convertCommodityType(commodity),
      quantity,
      sourceId: stationId,
      sourceType: 'STATION',
      destinationId: ship.id,
      destinationType: 'SHIP',
      metadata: { shipId: ship.id, operation: 'LOAD' }
    });
  }

  /**
   * Track individual cargo unloading
   */
  trackCargoUnloading(ship: NPCShip, stationId: string, commodity: string, quantity: number): void {
    this.flowTracker.recordEvent({
      type: 'TRADE' as any,
      commodity: this.convertCommodityType(commodity),
      quantity,
      sourceId: ship.id,
      sourceType: 'SHIP',
      destinationId: stationId,
      destinationType: 'STATION',
      metadata: { shipId: ship.id, operation: 'UNLOAD' }
    });
  }

  /**
   * Convert economy commodity string to CommodityType enum
   */
  private convertCommodityType(commodity: string): CommodityType {
    const mapping: Record<string, CommodityType> = {
      'fuel': CommodityType.HYDROGEN_FUEL,
      'food': CommodityType.FOOD,
      'water': CommodityType.WATER,
      'iron': CommodityType.METALLIC_ORE,
      'rare_earth': CommodityType.RARE_EARTH,
      'uranium': CommodityType.URANIUM,
      'electronics': CommodityType.ELECTRONICS,
      'medicine': CommodityType.MEDICAL_SUPPLIES,
      'weapons': CommodityType.WEAPONS,
      'luxury_goods': CommodityType.JEWELRY
    };

    return mapping[commodity.toLowerCase()] || CommodityType.METALLIC_ORE;
  }
}

/**
 * Integration helper for Mining System
 *
 * Tracks ore extraction and refining.
 */
export class MiningFlowIntegration {
  constructor(
    private flowTracker: ResourceFlowTracker,
    private miningSystem: MiningSystem
  ) {}

  /**
   * Install hooks into Mining System
   */
  installHooks(): void {
    // Store original update method
    const originalUpdate = this.miningSystem.update.bind(this.miningSystem);

    // Replace with tracked version
    this.miningSystem.update = (deltaTime: number): MiningYield[] => {
      const yields = originalUpdate(deltaTime);

      // Track each yield
      for (const yield_ of yields) {
        this.trackMiningYield(yield_);
      }

      return yields;
    };

    // Store original processOre method
    const originalProcessOre = this.miningSystem.processOre.bind(this.miningSystem);

    // Replace with tracked version
    this.miningSystem.processOre = (duration: number) => {
      const result = originalProcessOre(duration);

      // Track refined commodities
      for (const [commodity, amount] of result.commodities) {
        this.trackRefining(commodity, amount);
      }

      return result;
    };

    console.log('[FlowTracker] Mining System hooks installed');
  }

  /**
   * Track mining yield
   */
  trackMiningYield(yield_: MiningYield): void {
    // Convert OreType to CommodityType
    const commodity = this.convertOreToCommodity(yield_.oreType);

    this.flowTracker.recordMining(
      'player_ship', // TODO: Get actual ship ID
      'asteroid_unknown', // TODO: Get actual asteroid ID
      commodity,
      yield_.quantity
    );
  }

  /**
   * Track ore refining
   */
  trackRefining(commodity: CommodityType, amount: number): void {
    this.flowTracker.recordEvent({
      type: 'REFINING' as any,
      commodity,
      quantity: amount,
      sourceId: 'refinery',
      sourceType: 'FACILITY',
      destinationId: 'player_ship',
      destinationType: 'SHIP',
      metadata: { operation: 'REFINE' }
    });
  }

  /**
   * Convert OreType to CommodityType
   */
  private convertOreToCommodity(oreType: string): CommodityType {
    const mapping: Record<string, CommodityType> = {
      'IRON': CommodityType.METALLIC_ORE,
      'NICKEL': CommodityType.METALLIC_ORE,
      'COPPER': CommodityType.COPPER,
      'ALUMINUM': CommodityType.ALUMINUM,
      'TITANIUM': CommodityType.TITANIUM,
      'GOLD': CommodityType.PLATINUM,
      'PLATINUM': CommodityType.PLATINUM,
      'URANIUM': CommodityType.URANIUM,
      'RARE_EARTHS': CommodityType.RARE_EARTH,
      'WATER_ICE': CommodityType.ICE,
      'VOLATILES': CommodityType.ICE,
      'EXOTIC_MATTER': CommodityType.RARE_EARTH
    };

    return mapping[oreType] || CommodityType.METALLIC_ORE;
  }
}

/**
 * Integration helper for Construction System
 *
 * Tracks material consumption in construction projects.
 */
export class ConstructionFlowIntegration {
  constructor(
    private flowTracker: ResourceFlowTracker,
    private constructionSystem: ConstructionSystem
  ) {}

  /**
   * Install hooks into Construction System
   */
  installHooks(): void {
    // Hook into construction start
    const originalStart = this.constructionSystem.startConstruction.bind(this.constructionSystem);

    this.constructionSystem.startConstruction = (type, position, owner, systemId?) => {
      const project = originalStart(type, position, owner, systemId);

      if (project) {
        // Track material consumption when construction starts
        this.trackConstructionStart(project);
      }

      return project;
    };

    console.log('[FlowTracker] Construction System hooks installed');
  }

  /**
   * Track construction material consumption
   */
  trackConstructionStart(project: ConstructionProject): void {
    for (const cost of project.costs) {
      this.flowTracker.recordConstruction(
        project.owner, // Assume owner is station ID
        project.id,
        cost.commodity,
        cost.quantity,
        project.systemId,
        project.position
      );
    }

    console.log(`[FlowTracker] Tracked construction: ${project.type}`);
  }

  /**
   * Track incremental material consumption (if construction uses materials over time)
   */
  trackIncrementalConsumption(
    project: ConstructionProject,
    commodity: CommodityType,
    quantity: number
  ): void {
    this.flowTracker.recordConstruction(
      project.owner,
      project.id,
      commodity,
      quantity,
      project.systemId,
      project.position
    );
  }
}

/**
 * Complete integration setup
 *
 * Use this to set up all integrations at once.
 */
export class ResourceFlowIntegrationManager {
  private manufacturingIntegration?: ManufacturingFlowIntegration;
  private npcShipIntegration?: NPCShipFlowIntegration;
  private miningIntegration?: MiningFlowIntegration;
  private constructionIntegration?: ConstructionFlowIntegration;

  constructor(private flowTracker: ResourceFlowTracker) {}

  /**
   * Set up manufacturing integration
   */
  setupManufacturing(manufacturingSystem: ManufacturingSystem): void {
    this.manufacturingIntegration = new ManufacturingFlowIntegration(
      this.flowTracker,
      manufacturingSystem
    );
    this.manufacturingIntegration.installHooks();
    console.log('[FlowIntegration] Manufacturing integration complete');
  }

  /**
   * Set up NPC ship integration
   */
  setupNPCShips(npcShipAI: NPCShipAI): void {
    this.npcShipIntegration = new NPCShipFlowIntegration(
      this.flowTracker,
      npcShipAI
    );
    this.npcShipIntegration.installHooks();
    console.log('[FlowIntegration] NPC Ship integration complete');
  }

  /**
   * Set up mining integration
   */
  setupMining(miningSystem: MiningSystem): void {
    this.miningIntegration = new MiningFlowIntegration(
      this.flowTracker,
      miningSystem
    );
    this.miningIntegration.installHooks();
    console.log('[FlowIntegration] Mining integration complete');
  }

  /**
   * Set up construction integration
   */
  setupConstruction(constructionSystem: ConstructionSystem): void {
    this.constructionIntegration = new ConstructionFlowIntegration(
      this.flowTracker,
      constructionSystem
    );
    this.constructionIntegration.installHooks();
    console.log('[FlowIntegration] Construction integration complete');
  }

  /**
   * Set up all integrations at once
   */
  setupAll(systems: {
    manufacturing?: ManufacturingSystem;
    npcShips?: NPCShipAI;
    mining?: MiningSystem;
    construction?: ConstructionSystem;
  }): void {
    if (systems.manufacturing) {
      this.setupManufacturing(systems.manufacturing);
    }
    if (systems.npcShips) {
      this.setupNPCShips(systems.npcShips);
    }
    if (systems.mining) {
      this.setupMining(systems.mining);
    }
    if (systems.construction) {
      this.setupConstruction(systems.construction);
    }

    console.log('[FlowIntegration] All integrations complete');
  }

  /**
   * Get the flow tracker
   */
  getFlowTracker(): ResourceFlowTracker {
    return this.flowTracker;
  }
}
