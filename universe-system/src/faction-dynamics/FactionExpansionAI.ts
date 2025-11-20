/**
 * FactionExpansionAI.ts
 *
 * AI system for autonomous faction expansion and construction.
 * Factions evaluate their needs and build stations/colonies automatically.
 *
 * Features:
 * - Autonomous need evaluation (mining, refining, defense, trade)
 * - Intelligent station placement
 * - Resource management
 * - Strategic expansion based on faction personality
 */

import { Vector3 } from '../CelestialBody';
import { StarSystem } from '../StarSystem';
import { ConstructionSystem, ConstructionProject, ConstructionProjectType } from '../ConstructionSystem';
import { CommodityType } from '../economy/commodity';
import { Faction, Ideology } from '../FactionSystem';
import { FactionEconomicNeeds } from './FactionEconomicNeeds';

/**
 * Extended faction interface for expansion AI
 * (adapts existing Faction interface with needed properties)
 */
export interface ExpandableFaction extends Faction {
  credits: number;
  homeworld: Vector3;
  relations: Map<string, number>; // factionId -> standing (-100 to 100)
  personality: Ideology; // Use existing Ideology as personality
}

/**
 * Resource status information
 */
interface ResourceStatus {
  critical: boolean;   // Immediate crisis
  low: boolean;       // Running low
  adequate: boolean;  // Sufficient
  surplus: boolean;   // Excess
}

/**
 * FactionExpansionAI
 *
 * Controls faction expansion behavior:
 * - Evaluates economic and military needs
 * - Decides what type of station to build
 * - Finds suitable locations
 * - Manages construction resources
 */
export class FactionExpansionAI {
  private faction: ExpandableFaction;
  private starSystem: StarSystem;
  private constructionSystem: ConstructionSystem;
  private economicNeeds: FactionEconomicNeeds | null = null;

  // Expansion parameters
  private minStationDistance = 50000; // km - minimum distance between stations
  private expansionInterval = 600; // seconds (10 min) - how often to check expansion
  private lastExpansionCheck = 0;

  // Expansion thresholds
  private readonly NEED_THRESHOLD = 0.6; // Need score must be > this to expand
  private readonly MIN_CREDITS = 10000; // Minimum credits needed to build

  constructor(faction: ExpandableFaction, starSystem: StarSystem, constructionSystem: ConstructionSystem) {
    this.faction = faction;
    this.starSystem = starSystem;
    this.constructionSystem = constructionSystem;
  }

  /**
   * Link FactionEconomicNeeds system for real commodity tracking
   *
   * @param economicNeeds - FactionEconomicNeeds instance
   */
  linkFactionEconomicNeeds(economicNeeds: FactionEconomicNeeds): void {
    this.economicNeeds = economicNeeds;
    console.log(`[FactionExpansionAI] ${this.faction.name} linked to economic needs system`);
  }

  /**
   * Alias for linkFactionEconomicNeeds (compatibility)
   */
  linkEconomicNeeds(economicNeeds: FactionEconomicNeeds): void {
    this.linkFactionEconomicNeeds(economicNeeds);
  }

  /**
   * Update faction expansion logic
   *
   * Periodically evaluates faction needs and attempts expansion.
   *
   * @param deltaTime - Time elapsed since last update (seconds)
   * @param currentTime - Current game time (seconds)
   */
  update(deltaTime: number, currentTime: number): void {
    // Don't check too frequently (performance optimization)
    if (currentTime - this.lastExpansionCheck < this.expansionInterval) {
      return;
    }

    this.lastExpansionCheck = currentTime;

    // Evaluate expansion needs
    const expansionNeed = this.evaluateExpansionNeed();

    // If need is high enough, attempt to expand
    if (expansionNeed.score > this.NEED_THRESHOLD) {
      console.log(`[FactionExpansionAI] ${this.faction.name} wants to build ${expansionNeed.type} (need: ${expansionNeed.score.toFixed(2)})`);
      this.attemptExpansion(expansionNeed.type);
    }
  }

  /**
   * Evaluate what type of station faction needs most
   *
   * Calculates need scores for different station types and returns the highest.
   *
   * @returns Type of station needed and score (0-1)
   */
  private evaluateExpansionNeed(): { type: ConstructionProjectType; score: number } {
    const needs = {
      MINING_PLATFORM: this.evaluateMiningNeed(),
      REFINERY: this.evaluateRefineryNeed(),
      STATION: this.evaluateTradeStationNeed(),
      DEFENSE_PLATFORM: this.evaluateDefenseNeed(),
      OUTPOST: this.evaluateOutpostNeed()
    };

    // Find highest need
    let bestType: ConstructionProjectType = 'OUTPOST';
    let bestScore = 0;

    Object.entries(needs).forEach(([type, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as ConstructionProjectType;
      }
    });

    return { type: bestType, score: bestScore };
  }

  /**
   * Evaluate need for mining platform
   *
   * Mining platforms are needed when:
   * - Faction has resource shortages
   * - Few existing mining platforms
   *
   * @returns Need score (0-1)
   */
  private evaluateMiningNeed(): number {
    // Check resource availability (simplified - checks if faction has enough money)
    // In full implementation, would check specific commodity stockpiles
    const hasResourceShortage = this.faction.credits < 50000;

    if (hasResourceShortage) return 0.9;

    // Count existing mining platforms
    const miningStations = this.getFactionStations('MINING_PLATFORM');

    // Want at least 2 mining platforms per faction
    if (miningStations.length < 2) return 0.6;
    if (miningStations.length < 4) return 0.4;

    return 0.2;
  }

  /**
   * Evaluate need for refinery
   *
   * Refineries process raw materials into finished goods.
   * Need increases when:
   * - Have mining platforms but no refineries
   * - Economic production is low
   *
   * @returns Need score (0-1)
   */
  private evaluateRefineryNeed(): number {
    const miningStations = this.getFactionStations('MINING_PLATFORM');
    const refineries = this.getFactionStations('REFINERY');

    // Want 1 refinery per 2 mining platforms
    const ratio = refineries.length / (miningStations.length + 0.5);

    if (miningStations.length > 0 && refineries.length === 0) {
      return 0.8; // Have mining but no refining capability
    }

    if (ratio < 0.5) return 0.6;
    if (ratio < 1.0) return 0.3;

    return 0.1;
  }

  /**
   * Evaluate need for trade station
   *
   * Trade stations are economic hubs. Need increases when:
   * - Faction is wealthy and wants to expand trade
   * - High trade activity needs more infrastructure
   *
   * @returns Need score (0-1)
   */
  private evaluateTradeStationNeed(): number {
    // Wealthy factions expand trade infrastructure
    if (this.faction.credits > 100000) return 0.7;
    if (this.faction.credits > 50000) return 0.5;

    // Check faction personality - economic factions prioritize trade
    if (this.faction.personality.economic > 0.6) return 0.6;

    // Expansionist factions want trading posts in new territory
    if (this.faction.personality.expansionist > 0.7) return 0.5;

    return 0.2;
  }

  /**
   * Evaluate need for defense platform
   *
   * Defense platforms protect faction territory. Need increases when:
   * - At war or facing threats
   * - Hostile neighbors
   * - Militaristic faction personality
   *
   * @returns Need score (0-1)
   */
  private evaluateDefenseNeed(): number {
    // Check if at war (relation < -70)
    const atWar = Array.from(this.faction.relations.values()).some(rel => rel < -70);

    if (atWar) return 0.95; // High priority during war

    // Check for hostile neighbors (relation < -30)
    const hostileCount = Array.from(this.faction.relations.values()).filter(rel => rel < -30).length;

    if (hostileCount > 2) return 0.7;
    if (hostileCount > 0) return 0.5;

    // Militaristic factions always want defenses
    if (this.faction.personality.militaristic > 0.7) return 0.6;

    // Always want at least one defense platform
    const defensePlatforms = this.getFactionStations('DEFENSE_PLATFORM');
    if (defensePlatforms.length < 1) return 0.4;

    return 0.1;
  }

  /**
   * Evaluate need for generic outpost
   *
   * Outposts are cheap ways to claim territory. Need increases when:
   * - Few stations overall
   * - Expansionist personality
   *
   * @returns Need score (0-1)
   */
  private evaluateOutpostNeed(): number {
    const factionStations = this.getFactionStations();

    // Want at least 3 stations total
    if (factionStations.length < 3) return 0.5;
    if (factionStations.length < 6) return 0.3;

    // Expansionist factions keep building outposts
    if (this.faction.personality.expansionist > 0.7) return 0.4;

    return 0.1;
  }

  /**
   * Attempt to build new station
   *
   * Checks resources, finds location, and starts construction.
   *
   * @param type - Type of station to build
   */
  private attemptExpansion(type: ConstructionProjectType): void {
    // Find suitable location
    const location = this.findBuildLocation(type);

    if (!location) {
      console.log(`[FactionExpansionAI] ${this.faction.name} can't find location for ${type}`);
      return;
    }

    // Check if faction has resources
    const costs = this.constructionSystem.getBlueprintCosts(type);

    if (!costs) {
      console.warn(`[FactionExpansionAI] No blueprint costs for ${type}`);
      return;
    }

    const canAfford = this.factionHasResources(costs);

    if (!canAfford) {
      console.log(`[FactionExpansionAI] ${this.faction.name} can't afford ${type}`);
      this.emitResourceShortage(type, costs);
      return;
    }

    // Consume faction resources
    this.consumeFactionResources(costs);

    // Start construction
    const project = this.constructionSystem.startConstruction(
      type,
      location,
      this.faction.name,
      this.starSystem.id
    );

    if (project) {
      console.log(`[FactionExpansionAI] ${this.faction.name} started building ${type} at (${location.x.toFixed(0)}, ${location.y.toFixed(0)}, ${location.z.toFixed(0)})`);
    }
  }

  /**
   * Find suitable build location
   *
   * Different station types need different locations:
   * - Mining platforms: near asteroid belts
   * - Others: near faction territory
   *
   * @param type - Type of station to build
   * @returns Position or null if no location found
   */
  private findBuildLocation(type: ConstructionProjectType): Vector3 | null {
    // Mining platforms should be near asteroid fields
    if (type === 'MINING_PLATFORM') {
      return this.findLocationNearAsteroids();
    }

    // All other types: build near existing faction territory
    return this.findLocationNearTerritory();
  }

  /**
   * Find location near asteroid fields
   *
   * Looks for areas with asteroids (resource-rich regions).
   * Falls back to random orbit if no asteroids found.
   *
   * @returns Position in 3D space
   */
  private findLocationNearAsteroids(): Vector3 | null {
    // Check if star system has asteroids
    if (this.starSystem.asteroids && this.starSystem.asteroids.length > 0) {
      // Pick a random asteroid as anchor point
      const asteroid = this.starSystem.asteroids[Math.floor(Math.random() * this.starSystem.asteroids.length)];

      // Build near the asteroid (within 50km)
      return {
        x: asteroid.position.x + (Math.random() - 0.5) * 50000,
        y: asteroid.position.y + (Math.random() - 0.5) * 50000,
        z: asteroid.position.z + (Math.random() - 0.5) * 10000
      };
    }

    // No asteroids - build in orbit around homeworld
    return this.findLocationNearTerritory();
  }

  /**
   * Find location near faction territory
   *
   * Builds near existing faction stations to consolidate control.
   * If no stations exist, builds near homeworld.
   *
   * @returns Position in 3D space
   */
  private findLocationNearTerritory(): Vector3 | null {
    const factionStations = this.getFactionStations();

    if (factionStations.length === 0) {
      // No stations yet - build near homeworld
      const hw = this.faction.homeworld;
      return {
        x: hw.x + (Math.random() - 0.5) * 100000,
        y: hw.y + (Math.random() - 0.5) * 100000,
        z: hw.z + (Math.random() - 0.5) * 20000
      };
    }

    // Build near existing station (expand territory)
    const randomStation = factionStations[Math.floor(Math.random() * factionStations.length)];

    return {
      x: randomStation.position.x + (Math.random() - 0.5) * this.minStationDistance,
      y: randomStation.position.y + (Math.random() - 0.5) * this.minStationDistance,
      z: randomStation.position.z + (Math.random() - 0.5) * 5000
    };
  }

  /**
   * Check if faction has resources to build
   *
   * Checks actual commodity stockpiles in faction's strategic reserves.
   * If economic needs system is not linked, falls back to credit-only check.
   *
   * @param costs - Array of commodity costs
   * @returns True if faction has all required commodities
   */
  private factionHasResources(costs: Array<{ commodity: CommodityType; quantity: number }>): boolean {
    // Fallback: If economic needs not linked, use credit-only check
    if (!this.economicNeeds) {
      const totalCost = this.calculateCost(costs);
      return this.faction.credits >= totalCost && this.faction.credits >= this.MIN_CREDITS;
    }

    // Get faction economy
    const economy = this.economicNeeds.getFactionEconomy(this.faction.id);

    if (!economy) {
      console.warn(`[FactionExpansionAI] ${this.faction.name} not found in economic system`);
      return false;
    }

    // Check each required commodity
    const missing: Array<{ commodity: string; needed: number; available: number }> = [];

    for (const cost of costs) {
      const commodityName = this.mapCommodityTypeToEconomyName(cost.commodity);
      const available = economy.strategicReserves.get(commodityName) || 0;
      const needed = cost.quantity;

      if (available < needed) {
        missing.push({
          commodity: commodityName,
          needed,
          available
        });
      }
    }

    // Log shortages
    if (missing.length > 0) {
      console.log(`[FactionExpansionAI] ${this.faction.name} resource shortage:`);
      for (const shortage of missing) {
        console.log(`  ${shortage.commodity}: need ${shortage.needed}, have ${shortage.available} (short ${shortage.needed - shortage.available})`);
      }
      return false;
    }

    // Also check minimum credits
    if (this.faction.credits < this.MIN_CREDITS) {
      console.log(`[FactionExpansionAI] ${this.faction.name} insufficient credits: ${this.faction.credits} < ${this.MIN_CREDITS}`);
      return false;
    }

    return true;
  }

  /**
   * Calculate total credit cost from commodity costs
   *
   * Estimates cost by multiplying quantity by average commodity value.
   * Used as fallback when economic system not linked.
   *
   * @param costs - Array of commodity costs
   * @returns Total cost in credits
   */
  private calculateCost(costs: Array<{ commodity: CommodityType; quantity: number }>): number {
    // Simplified cost calculation - $10 per unit as baseline
    return costs.reduce((sum, cost) => sum + (cost.quantity * 10), 0);
  }

  /**
   * Consume resources from faction stockpile
   *
   * Actually deducts commodities from faction's strategic reserves.
   * If economic needs system not linked, falls back to credit deduction.
   *
   * @param costs - Array of commodity costs
   */
  private consumeFactionResources(costs: Array<{ commodity: CommodityType; quantity: number }>): void {
    // Fallback: If economic needs not linked, use credit-only deduction
    if (!this.economicNeeds) {
      const totalCost = this.calculateCost(costs);
      this.faction.credits -= totalCost;
      console.log(`[FactionExpansionAI] ${this.faction.name} spent ${totalCost} credits (${this.faction.credits} remaining)`);
      return;
    }

    // Get faction economy
    const economy = this.economicNeeds.getFactionEconomy(this.faction.id);

    if (!economy) {
      console.error(`[FactionExpansionAI] ${this.faction.name} not found in economic system - cannot consume resources`);
      return;
    }

    // Consume each commodity from strategic reserves
    console.log(`[FactionExpansionAI] ${this.faction.name} consuming construction materials:`);

    for (const cost of costs) {
      const commodityName = this.mapCommodityTypeToEconomyName(cost.commodity);
      const current = economy.strategicReserves.get(commodityName) || 0;
      const newAmount = Math.max(0, current - cost.quantity);

      economy.strategicReserves.set(commodityName, newAmount);

      console.log(`  ${commodityName}: ${cost.quantity} consumed (${current} -> ${newAmount})`);
    }

    // Also deduct minimum credits for labor/energy costs
    const laborCost = this.MIN_CREDITS;
    this.faction.credits -= laborCost;

    console.log(`[FactionExpansionAI] ${this.faction.name} spent ${laborCost} credits for labor/energy (${this.faction.credits} remaining)`);
  }

  /**
   * Map CommodityType enum to FactionEconomicNeeds commodity names
   *
   * Translates between the CommodityType enum used in construction
   * and the string-based commodity names used in FactionEconomicNeeds.
   *
   * @param commodityType - CommodityType enum value
   * @returns String name used in economy system
   */
  private mapCommodityTypeToEconomyName(commodityType: CommodityType): string {
    // Map CommodityType enum to economy system names
    // Economy system uses simple uppercase strings
    const mapping: Record<string, string> = {
      // Refined materials (used in construction)
      'STEEL': 'STEEL',
      'TITANIUM': 'TITANIUM',
      'ALUMINUM': 'ALUMINUM',
      'SILICON': 'SILICON',
      'COPPER': 'COPPER',
      'CARBON_FIBER': 'CARBON_FIBER',

      // Manufactured goods
      'ELECTRONICS': 'ELECTRONICS',
      'MACHINERY': 'MACHINERY',
      'TOOLS': 'TOOLS',
      'CONSTRUCTION_MATERIALS': 'CONSTRUCTION_MATERIALS',
      'WEAPONS': 'WEAPONS',
      'SHIELD_GENERATORS': 'SHIELD_GENERATORS',
      'SHIP_COMPONENTS': 'SHIP_COMPONENTS',
      'COMPUTER_SYSTEMS': 'COMPUTER_SYSTEMS',
      'SENSORS': 'SENSORS',

      // Fuels
      'HYDROGEN_FUEL': 'FUEL',
      'FUSION_PELLETS': 'FUSION_PELLETS',
      'OXYGEN': 'OXYGEN',

      // Raw materials
      'METALLIC_ORE': 'METALLIC_ORE',
      'ROCKY_ORE': 'ROCKY_ORE',
      'ICE': 'ICE',
      'RARE_EARTH': 'RARE_EARTH',
      'PLATINUM': 'PLATINUM',
      'URANIUM': 'URANIUM',

      // Consumables
      'FOOD': 'FOOD',
      'WATER': 'WATER',
      'MEDICAL_SUPPLIES': 'MEDICINE',

      // Luxury
      'JEWELRY': 'JEWELRY',
      'ART': 'ART',
      'ENTERTAINMENT': 'ENTERTAINMENT'
    };

    return mapping[commodityType] || commodityType;
  }

  /**
   * Emit RESOURCE_SHORTAGE event when faction can't build
   *
   * Logs detailed information about what resources are missing
   * and what the faction was trying to build.
   *
   * @param projectType - Type of construction that was blocked
   * @param costs - Required costs that couldn't be met
   */
  private emitResourceShortage(
    projectType: ConstructionProjectType,
    costs: Array<{ commodity: CommodityType; quantity: number }>
  ): void {
    console.log(`[FactionExpansionAI] 🚨 RESOURCE_SHORTAGE: ${this.faction.name} blocked from building ${projectType}`);

    // If economic needs linked, show detailed shortage info
    if (this.economicNeeds) {
      const economy = this.economicNeeds.getFactionEconomy(this.faction.id);

      if (economy) {
        console.log(`[FactionExpansionAI] Required resources for ${projectType}:`);

        for (const cost of costs) {
          const commodityName = this.mapCommodityTypeToEconomyName(cost.commodity);
          const available = economy.strategicReserves.get(commodityName) || 0;
          const needed = cost.quantity;
          const shortage = Math.max(0, needed - available);

          if (shortage > 0) {
            console.log(`  ❌ ${commodityName}: need ${needed}, have ${available} (SHORT ${shortage})`);
          } else {
            console.log(`  ✓ ${commodityName}: need ${needed}, have ${available}`);
          }
        }

        // Also check credits
        if (this.faction.credits < this.MIN_CREDITS) {
          console.log(`  ❌ CREDITS: need ${this.MIN_CREDITS}, have ${this.faction.credits} (SHORT ${this.MIN_CREDITS - this.faction.credits})`);
        } else {
          console.log(`  ✓ CREDITS: need ${this.MIN_CREDITS}, have ${this.faction.credits}`);
        }
      }
    } else {
      // Economic needs not linked - show credit-only info
      const totalCost = this.calculateCost(costs);
      console.log(`[FactionExpansionAI] Required credits: ${totalCost} (have ${this.faction.credits})`);
    }
  }

  /**
   * Get faction stations by type
   *
   * Searches star system for stations owned by this faction.
   *
   * @param type - Optional station type to filter by
   * @returns Array of matching stations
   */
  private getFactionStations(type?: string): any[] {
    // Get all stations in the system
    if (!this.starSystem.stations) return [];

    // Filter by faction
    const factionStations = this.starSystem.stations.filter(
      station => station.faction === this.faction.name || station.faction === this.faction.id
    );

    // Filter by type if specified
    if (type) {
      return factionStations.filter(station =>
        // Check stationType property (from SpaceStation class)
        (station as any).stationType === type ||
        // Also check for custom type properties (from mock/test data)
        (station as any).type === type ||
        (station as any).subType === type
      );
    }

    return factionStations;
  }

  /**
   * Get simulated resource status for a commodity
   *
   * Simplified resource check based on faction economic state.
   * Full implementation would integrate with FactionEconomicNeeds.
   *
   * @param commodity - Commodity type to check
   * @returns Resource status
   */
  private getResourceStatus(commodity: string): ResourceStatus {
    // Simplified simulation based on faction credits
    const critical = this.faction.credits < 10000;
    const low = this.faction.credits < 30000;
    const adequate = this.faction.credits >= 30000 && this.faction.credits < 100000;
    const surplus = this.faction.credits >= 100000;

    return { critical, low, adequate, surplus };
  }

  /**
   * Set expansion interval (useful for testing/configuration)
   *
   * @param seconds - Time between expansion checks
   */
  setExpansionInterval(seconds: number): void {
    this.expansionInterval = seconds;
  }

  /**
   * Force immediate expansion check (useful for testing)
   */
  forceExpansionCheck(): void {
    this.lastExpansionCheck = 0;
  }

  /**
   * Get faction expansion statistics
   *
   * @returns Current expansion state info
   */
  getExpansionStats() {
    return {
      faction: this.faction.name,
      credits: this.faction.credits,
      stationCount: this.getFactionStations().length,
      miningPlatforms: this.getFactionStations('MINING_PLATFORM').length,
      refineries: this.getFactionStations('REFINERY').length,
      defensePlatforms: this.getFactionStations('DEFENSE_PLATFORM').length,
      lastCheck: this.lastExpansionCheck,
      nextCheck: this.lastExpansionCheck + this.expansionInterval
    };
  }
}
