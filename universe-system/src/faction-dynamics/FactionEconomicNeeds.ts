/**
 * FactionEconomicNeeds - Resource-driven faction behavior
 *
 * Factions act like living civilizations with:
 * - Critical resource needs
 * - Production and consumption
 * - Supply chain dependencies
 * - Economic-driven decision making
 * - Resource wars and trade
 */

export interface FactionEconomy {
  factionId: string;

  // Resource tracking
  criticalResources: Map<string, ResourceNeed>;    // What they MUST have
  surplusResources: Map<string, number>;           // What they have too much of
  strategicReserves: Map<string, number>;          // Stockpiles

  // Production
  productionCapacity: Map<string, number>;         // commodity -> units/day
  activeProduction: Map<string, number>;           // Current production rate
  productionEfficiency: number;                    // 0-1

  // Consumption
  consumptionRate: Map<string, number>;            // commodity -> units/day
  population: number;

  // Economic health
  gdp: number;
  gdpGrowth: number;                               // % per year
  unemployment: number;                            // %
  inflation: number;                               // %
  tradeBalance: number;                            // Exports - Imports

  // Supply chains
  supplyChains: SupplyChain[];
  criticalDependencies: Dependency[];              // If broken, causes crisis

  // Trade
  tradePartners: Map<string, number>;              // factionId -> trade volume
  embargoedFactions: Set<string>;

  // State
  economicState: EconomicState;
  crisisLevel: number;                             // 0-10
}

export interface ResourceNeed {
  commodity: string;
  requiredPerDay: number;
  currentStock: number;
  daysRemaining: number;                           // At current consumption

  // Criticality
  essential: boolean;                              // Civilization collapses without
  substitutes: string[];                           // Alternative resources

  // Sources
  domesticProduction: number;                      // How much we make
  imports: number;                                 // How much we import
  deficit: number;                                 // Shortfall (negative = surplus)

  // Crisis
  crisisThreshold: number;                         // Days of stock before crisis
  inCrisis: boolean;
}

export type EconomicState =
  | 'BOOMING'           // >5% GDP growth
  | 'GROWING'           // 2-5% GDP growth
  | 'STABLE'            // 0-2% GDP growth
  | 'STAGNANT'          // -2-0% GDP growth
  | 'RECESSION'         // -5--2% GDP growth
  | 'DEPRESSION'        // <-5% GDP growth
  | 'COLLAPSE';         // Economic system failing

export interface SupplyChain {
  id: string;
  commodity: string;

  // Flow
  source: string;                                  // Where it comes from
  destination: string;                             // Where it goes
  intermediaries: string[];                        // Stations/systems in between

  // Volume
  capacity: number;                                // Max units/day
  actualFlow: number;                              // Current units/day
  utilization: number;                             // 0-1

  // Reliability
  uptime: number;                                  // 0-1 (% time operational)
  disruptions: Disruption[];

  // Vulnerability
  criticalPoints: string[];                        // Chokepoints
  vulnerability: number;                           // 0-10
}

export interface Disruption {
  timestamp: number;
  cause: string;
  duration: number;
  impactPercentage: number;                        // % of flow lost
  resolved: boolean;
}

export interface Dependency {
  resourceType: string;
  dependsOn: string;                               // Faction or system ID
  criticality: number;                             // 0-10 (10 = total dependence)
  alternativeSources: string[];
  timeToSwitchSources: number;                     // Seconds
}

export interface EconomicAction {
  type: EconomicActionType;
  priority: number;                                // 0-100
  targetFaction?: string;
  targetResource?: string;
  expectedBenefit: number;
  estimatedCost: number;
  riskLevel: number;                               // 0-1
}

export type EconomicActionType =
  | 'EMERGENCY_PURCHASE'                           // Buy at any price
  | 'SEEK_TRADE_AGREEMENT'                         // Negotiate trade deal
  | 'INCREASE_PRODUCTION'                          // Boost domestic production
  | 'EMBARGO_RIVAL'                                // Cut off trade
  | 'SEIZE_RESOURCES'                              // Military action for resources
  | 'BUILD_STOCKPILE'                              // Prepare for shortage
  | 'DEVELOP_SUBSTITUTE'                           // Research alternative
  | 'SECURE_SUPPLY_LINE'                           // Protect critical route
  | 'DIVERSIFY_SOURCES'                            // Reduce dependency
  | 'DUMP_SURPLUS';                                // Sell excess cheaply

export class FactionEconomicNeeds {
  private economies: Map<string, FactionEconomy> = new Map();

  // Configuration
  private readonly CRISIS_DAYS_THRESHOLD = 30;     // Days of stock before crisis
  private readonly GDP_RESOURCE_MULTIPLIER = 1000;  // Credits per unit of critical resource

  constructor() {
    // Initialize
  }

  /**
   * Create or get faction economy
   */
  public getFactionEconomy(factionId: string): FactionEconomy {
    if (!this.economies.has(factionId)) {
      this.createFactionEconomy(factionId);
    }
    return this.economies.get(factionId)!;
  }

  /**
   * Update faction economy
   */
  public update(factionId: string, deltaTime: number): void {
    const economy = this.getFactionEconomy(factionId);

    // Update production
    this.updateProduction(economy, deltaTime);

    // Update consumption
    this.updateConsumption(economy, deltaTime);

    // Check resource needs
    this.checkResourceNeeds(economy);

    // Update supply chains
    this.updateSupplyChains(economy, deltaTime);

    // Calculate economic state
    this.calculateEconomicState(economy);

    // Update GDP
    this.updateGDP(economy, deltaTime);
  }

  /**
   * Evaluate what actions faction should take
   */
  public evaluateEconomicActions(factionId: string): EconomicAction[] {
    const economy = this.getFactionEconomy(factionId);
    const actions: EconomicAction[] = [];

    // Check for critical shortages
    for (const [commodity, need] of economy.criticalResources) {
      if (need.inCrisis) {
        // CRISIS - Emergency action needed
        actions.push({
          type: 'EMERGENCY_PURCHASE',
          priority: 100,
          targetResource: commodity,
          expectedBenefit: 1000,
          estimatedCost: need.requiredPerDay * 100,  // Willing to pay 100x normal
          riskLevel: 0.1  // Low risk, just expensive
        });

        // If no one selling, consider military action
        if (need.daysRemaining < 7 && economy.crisisLevel > 8) {
          const resourceLocation = this.findResourceLocation(commodity);
          if (resourceLocation && resourceLocation.controllingFaction !== factionId) {
            actions.push({
              type: 'SEIZE_RESOURCES',
              priority: 95,
              targetFaction: resourceLocation.controllingFaction,
              targetResource: commodity,
              expectedBenefit: 10000,
              estimatedCost: 5000,  // War is expensive
              riskLevel: 0.9  // Very risky
            });
          }
        }
      } else if (need.daysRemaining < this.CRISIS_DAYS_THRESHOLD) {
        // Pre-crisis - Take preventative action
        actions.push({
          type: 'SEEK_TRADE_AGREEMENT',
          priority: 70,
          targetResource: commodity,
          expectedBenefit: 500,
          estimatedCost: 200,
          riskLevel: 0.3
        });

        actions.push({
          type: 'INCREASE_PRODUCTION',
          priority: 60,
          targetResource: commodity,
          expectedBenefit: 400,
          estimatedCost: 300,
          riskLevel: 0.2
        });

        actions.push({
          type: 'BUILD_STOCKPILE',
          priority: 50,
          targetResource: commodity,
          expectedBenefit: 300,
          estimatedCost: need.requiredPerDay * 10,
          riskLevel: 0.1
        });
      }
    }

    // Check for surplus - can use as leverage
    for (const [commodity, amount] of economy.surplusResources) {
      if (amount > economy.consumptionRate.get(commodity)! * 30) {
        // More than 30 days surplus - can trade or dump
        actions.push({
          type: 'SEEK_TRADE_AGREEMENT',
          priority: 40,
          targetResource: commodity,
          expectedBenefit: amount * 10,  // Sell for profit
          estimatedCost: 0,
          riskLevel: 0.1
        });
      }
    }

    // Check for vulnerable supply chains
    for (const chain of economy.supplyChains) {
      if (chain.vulnerability > 7 && economy.criticalResources.has(chain.commodity)) {
        actions.push({
          type: 'SECURE_SUPPLY_LINE',
          priority: 80,
          targetResource: chain.commodity,
          expectedBenefit: 800,
          estimatedCost: 400,
          riskLevel: 0.4
        });

        actions.push({
          type: 'DIVERSIFY_SOURCES',
          priority: 70,
          targetResource: chain.commodity,
          expectedBenefit: 700,
          estimatedCost: 500,
          riskLevel: 0.3
        });
      }
    }

    // Sort by priority
    actions.sort((a, b) => b.priority - a.priority);

    return actions;
  }

  /**
   * Check if faction would go to war for resources
   */
  public wouldGoToWarForResource(
    factionId: string,
    commodity: string,
    targetFaction: string
  ): boolean {
    const economy = this.getFactionEconomy(factionId);
    const need = economy.criticalResources.get(commodity);

    if (!need) return false;

    // Conditions for resource war:
    // 1. Resource is essential
    // 2. Less than 7 days remaining
    // 3. No alternative sources
    // 4. Economic crisis
    return (
      need.essential &&
      need.daysRemaining < 7 &&
      need.substitutes.length === 0 &&
      economy.crisisLevel > 7
    );
  }

  /**
   * Simulate supply chain disruption
   */
  public disruptSupplyChain(chainId: string, cause: string, duration: number, impact: number): void {
    for (const economy of this.economies.values()) {
      const chain = economy.supplyChains.find(c => c.id === chainId);
      if (chain) {
        const disruption: Disruption = {
          timestamp: Date.now() / 1000,
          cause,
          duration,
          impactPercentage: impact,
          resolved: false
        };

        chain.disruptions.push(disruption);
        chain.actualFlow *= (1 - impact);

        // Check if this creates resource crisis
        const need = economy.criticalResources.get(chain.commodity);
        if (need) {
          need.imports *= (1 - impact);
          need.deficit = need.requiredPerDay - (need.domesticProduction + need.imports);

          if (need.deficit > 0) {
            need.daysRemaining = need.currentStock / need.deficit;
            if (need.daysRemaining < this.CRISIS_DAYS_THRESHOLD) {
              need.inCrisis = true;
              economy.crisisLevel = Math.min(10, economy.crisisLevel + 2);
            }
          }
        }
      }
    }
  }

  // ====================================================================
  // PRIVATE METHODS
  // ====================================================================

  private createFactionEconomy(factionId: string): void {
    const economy: FactionEconomy = {
      factionId,
      criticalResources: new Map(),
      surplusResources: new Map(),
      strategicReserves: new Map(),
      productionCapacity: new Map(),
      activeProduction: new Map(),
      productionEfficiency: 0.8,
      consumptionRate: new Map(),
      population: 1000000,  // Default population
      gdp: 1000000000,      // 1 billion credits
      gdpGrowth: 2.0,       // 2% per year
      unemployment: 5.0,
      inflation: 2.0,
      tradeBalance: 0,
      supplyChains: [],
      criticalDependencies: [],
      tradePartners: new Map(),
      embargoedFactions: new Set(),
      economicState: 'STABLE',
      crisisLevel: 0
    };

    // Initialize with basic critical resources
    economy.criticalResources.set('FOOD', {
      commodity: 'FOOD',
      requiredPerDay: economy.population * 0.5,  // 0.5 units per person
      currentStock: economy.population * 30,      // 30 days
      daysRemaining: 30,
      essential: true,
      substitutes: [],
      domesticProduction: economy.population * 0.4,
      imports: economy.population * 0.1,
      deficit: 0,
      crisisThreshold: this.CRISIS_DAYS_THRESHOLD,
      inCrisis: false
    });

    economy.criticalResources.set('WATER', {
      commodity: 'WATER',
      requiredPerDay: economy.population * 1.0,
      currentStock: economy.population * 60,
      daysRemaining: 60,
      essential: true,
      substitutes: [],
      domesticProduction: economy.population * 0.8,
      imports: economy.population * 0.2,
      deficit: 0,
      crisisThreshold: this.CRISIS_DAYS_THRESHOLD,
      inCrisis: false
    });

    economy.criticalResources.set('FUEL', {
      commodity: 'FUEL',
      requiredPerDay: 10000,
      currentStock: 500000,
      daysRemaining: 50,
      essential: true,
      substitutes: ['ALTERNATIVE_FUEL'],
      domesticProduction: 8000,
      imports: 2000,
      deficit: 0,
      crisisThreshold: this.CRISIS_DAYS_THRESHOLD,
      inCrisis: false
    });

    this.economies.set(factionId, economy);
  }

  private updateProduction(economy: FactionEconomy, deltaTime: number): void {
    for (const [commodity, capacity] of economy.productionCapacity) {
      const productionRate = capacity * economy.productionEfficiency;
      const produced = productionRate * (deltaTime / 86400);  // Convert to days

      economy.activeProduction.set(commodity, productionRate);

      // Add to surplus
      const current = economy.surplusResources.get(commodity) || 0;
      economy.surplusResources.set(commodity, current + produced);

      // Update critical resources
      const need = economy.criticalResources.get(commodity);
      if (need) {
        need.domesticProduction = productionRate;
        need.currentStock += produced;
      }
    }
  }

  private updateConsumption(economy: FactionEconomy, deltaTime: number): void {
    for (const [commodity, rate] of economy.consumptionRate) {
      const consumed = rate * (deltaTime / 86400);

      // Remove from surplus
      const current = economy.surplusResources.get(commodity) || 0;
      economy.surplusResources.set(commodity, Math.max(0, current - consumed));

      // Update critical resources
      const need = economy.criticalResources.get(commodity);
      if (need) {
        need.currentStock = Math.max(0, need.currentStock - consumed);
        need.deficit = need.requiredPerDay - (need.domesticProduction + need.imports);

        if (need.deficit > 0) {
          need.daysRemaining = need.currentStock / need.deficit;
        } else {
          need.daysRemaining = Infinity;
        }
      }
    }
  }

  private checkResourceNeeds(economy: FactionEconomy): void {
    for (const need of economy.criticalResources.values()) {
      if (need.daysRemaining < need.crisisThreshold) {
        need.inCrisis = true;
        economy.crisisLevel = Math.max(economy.crisisLevel, 10 - need.daysRemaining);
      } else {
        need.inCrisis = false;
      }
    }

    // Overall crisis level is worst individual crisis
    const maxCrisis = Math.max(...Array.from(economy.criticalResources.values())
      .map(n => n.inCrisis ? (10 - n.daysRemaining) : 0));
    economy.crisisLevel = Math.max(0, Math.min(10, maxCrisis));
  }

  private updateSupplyChains(economy: FactionEconomy, deltaTime: number): void {
    for (const chain of economy.supplyChains) {
      // Update disruptions
      chain.disruptions = chain.disruptions.filter(d => {
        if (!d.resolved) {
          const elapsed = Date.now() / 1000 - d.timestamp;
          if (elapsed > d.duration) {
            d.resolved = true;
            chain.actualFlow /= (1 - d.impactPercentage);  // Restore flow
            return false;
          }
        }
        return !d.resolved;
      });

      // Calculate uptime
      const activeDisruptions = chain.disruptions.filter(d => !d.resolved);
      if (activeDisruptions.length > 0) {
        const totalImpact = activeDisruptions.reduce((sum, d) => sum + d.impactPercentage, 0);
        chain.uptime = Math.max(0, 1 - totalImpact);
      } else {
        chain.uptime = 1.0;
      }

      chain.utilization = chain.actualFlow / chain.capacity;
    }
  }

  private calculateEconomicState(economy: FactionEconomy): void {
    if (economy.gdpGrowth > 5) {
      economy.economicState = 'BOOMING';
    } else if (economy.gdpGrowth > 2) {
      economy.economicState = 'GROWING';
    } else if (economy.gdpGrowth > 0) {
      economy.economicState = 'STABLE';
    } else if (economy.gdpGrowth > -2) {
      economy.economicState = 'STAGNANT';
    } else if (economy.gdpGrowth > -5) {
      economy.economicState = 'RECESSION';
    } else if (economy.crisisLevel < 8) {
      economy.economicState = 'DEPRESSION';
    } else {
      economy.economicState = 'COLLAPSE';
    }
  }

  private updateGDP(economy: FactionEconomy, deltaTime: number): void {
    // GDP affected by:
    // - Resource availability
    // - Production efficiency
    // - Crisis level

    let gdpMultiplier = 1.0;

    // Crisis reduces GDP
    gdpMultiplier *= (1 - economy.crisisLevel * 0.05);

    // Efficiency affects GDP
    gdpMultiplier *= economy.productionEfficiency;

    // Apply growth
    const yearlyGrowth = economy.gdpGrowth / 100;
    const periodGrowth = yearlyGrowth * (deltaTime / 31536000);  // Seconds in year
    economy.gdp *= (1 + periodGrowth * gdpMultiplier);

    // Update growth rate based on conditions
    if (economy.crisisLevel > 5) {
      economy.gdpGrowth = Math.max(-10, economy.gdpGrowth - 0.5);
    } else {
      economy.gdpGrowth = Math.min(10, economy.gdpGrowth + 0.1);
    }
  }

  private findResourceLocation(commodity: string): { controllingFaction: string } | null {
    // TODO: Integrate with universe system to find where resource is produced
    return null;
  }

  // ====================================================================
  // SOPHISTICATED ECONOMIC ALGORITHMS
  // ====================================================================

  /**
   * Build multi-tier supply chain model
   */
  public buildSupplyChain(commodity: string): { commodity: string; tiers: string[][] } {
    const chain = {
      commodity,
      tiers: [] as string[][]
    };

    // Tier 0: Raw materials
    chain.tiers[0] = this.getRawMaterials(commodity);

    // Tier 1: Processed materials
    chain.tiers[1] = chain.tiers[0].flatMap(raw =>
      this.getProcessedFrom(raw)
    );

    // Tier 2: Components
    chain.tiers[2] = chain.tiers[1].flatMap(processed =>
      this.getComponentsFrom(processed)
    );

    // Final tier: Finished product
    chain.tiers[3] = [commodity];

    return chain;
  }

  /**
   * Get raw materials for commodity
   */
  private getRawMaterials(commodity: string): string[] {
    const materials: Record<string, string[]> = {
      'WEAPONS': ['METAL_ORE', 'RARE_MINERALS'],
      'FUEL': ['HYDROGEN', 'HELIUM'],
      'ELECTRONICS': ['SILICON', 'RARE_EARTH'],
      'FOOD': ['WATER', 'ORGANIC_MATTER'],
      'MEDICINE': ['CHEMICALS', 'ORGANIC_MATTER']
    };
    return materials[commodity] || [];
  }

  /**
   * Get processed materials from raw
   */
  private getProcessedFrom(raw: string): string[] {
    const processed: Record<string, string[]> = {
      'METAL_ORE': ['STEEL', 'ALLOYS'],
      'SILICON': ['WAFERS', 'CHIPS'],
      'HYDROGEN': ['DEUTERIUM'],
      'CHEMICALS': ['PHARMACEUTICALS']
    };
    return processed[raw] || [raw];
  }

  /**
   * Get components from processed materials
   */
  private getComponentsFrom(processed: string): string[] {
    const components: Record<string, string[]> = {
      'STEEL': ['HULL_PLATES'],
      'CHIPS': ['PROCESSORS'],
      'PHARMACEUTICALS': ['MEDICINE']
    };
    return components[processed] || [processed];
  }

  /**
   * Calculate supply disruption impact with cascading effects
   */
  public calculateDisruptionImpact(
    disruption: { commodity: string; severity: number },
    factionId: string
  ): {
    directImpact: number;
    cascadeImpact: number;
    totalImpact: number;
    affectedSectors: string[];
  } {
    let totalImpact = disruption.severity;
    const affectedSectors: string[] = [];

    // Get dependent commodities
    const dependents = this.getDependentCommodities(disruption.commodity);

    for (const dependent of dependents) {
      const dependence = this.getDependenceStrength(dependent, disruption.commodity);
      const cascadeEffect = disruption.severity * dependence * 0.7; // 70% pass-through
      totalImpact += cascadeEffect;
      affectedSectors.push(dependent);
    }

    return {
      directImpact: disruption.severity,
      cascadeImpact: totalImpact - disruption.severity,
      totalImpact,
      affectedSectors
    };
  }

  /**
   * Get commodities that depend on this one
   */
  private getDependentCommodities(commodity: string): string[] {
    const dependencies: Record<string, string[]> = {
      'FUEL': ['SHIPPING', 'MANUFACTURING', 'POWER'],
      'FOOD': ['POPULATION', 'MORALE'],
      'WEAPONS': ['MILITARY', 'SECURITY'],
      'ELECTRONICS': ['MANUFACTURING', 'COMMUNICATIONS']
    };
    return dependencies[commodity] || [];
  }

  /**
   * Get dependence strength (0-1)
   */
  private getDependenceStrength(dependent: string, commodity: string): number {
    // Critical dependencies have higher strength
    if (dependent === 'POPULATION' && commodity === 'FOOD') return 1.0;
    if (dependent === 'MILITARY' && commodity === 'WEAPONS') return 0.9;
    if (dependent === 'SHIPPING' && commodity === 'FUEL') return 0.95;
    return 0.5;
  }

  /**
   * Calculate market price using supply/demand dynamics
   */
  public calculateMarketPrice(
    commodity: string,
    location: string,
    basePrice: number
  ): number {
    const supply = this.getSupply(commodity, location);
    const demand = this.getDemand(commodity, location);

    // Price elasticity - logarithmic response
    const supplyDemandRatio = supply / Math.max(1, demand);

    let priceMultiplier = 1;

    if (supplyDemandRatio < 1) {
      // Shortage: price increases exponentially
      priceMultiplier = 1 / supplyDemandRatio;
      priceMultiplier = Math.min(priceMultiplier, 5.0); // Cap at 5x
    } else {
      // Surplus: price decreases logarithmically
      priceMultiplier = 1 / Math.sqrt(supplyDemandRatio);
      priceMultiplier = Math.max(priceMultiplier, 0.2); // Floor at 20%
    }

    return basePrice * priceMultiplier;
  }

  /**
   * Get supply at location
   */
  private getSupply(commodity: string, location: string): number {
    // Simplified - would integrate with actual economy
    return 1000 + Math.random() * 500;
  }

  /**
   * Get demand at location
   */
  private getDemand(commodity: string, location: string): number {
    // Simplified - would integrate with actual economy
    return 1000 + Math.random() * 500;
  }

  /**
   * Predict price elasticity for commodity
   */
  public predictPriceElasticity(commodity: string): {
    elasticity: number;
    description: string;
  } {
    // Necessities are inelastic, luxuries are elastic
    const elasticities: Record<string, number> = {
      'FOOD': 0.3,        // Inelastic - must buy regardless of price
      'WATER': 0.2,       // Very inelastic
      'FUEL': 0.4,        // Somewhat inelastic
      'MEDICINE': 0.35,   // Inelastic
      'WEAPONS': 0.7,     // Elastic
      'LUXURY_GOODS': 1.5 // Very elastic
    };

    const elasticity = elasticities[commodity] || 0.8;

    let description = '';
    if (elasticity < 0.5) {
      description = 'Inelastic - demand stable regardless of price';
    } else if (elasticity < 1.0) {
      description = 'Somewhat elastic - moderate price sensitivity';
    } else {
      description = 'Elastic - high price sensitivity';
    }

    return { elasticity, description };
  }

  /**
   * Simulate economic shock propagation
   */
  public simulateEconomicShock(
    factionId: string,
    shockType: 'PRICE_SPIKE' | 'SUPPLY_CUT' | 'DEMAND_CRASH',
    commodity: string,
    magnitude: number
  ): {
    immediateImpact: number;
    weekOneImpact: number;
    monthOneImpact: number;
    recoveryTime: number; // days
  } {
    const economy = this.getFactionEconomy(factionId);
    let immediateImpact = 0;
    let weekOneImpact = 0;
    let monthOneImpact = 0;
    let recoveryTime = 0;

    switch (shockType) {
      case 'PRICE_SPIKE':
        // Immediate: budget strain
        immediateImpact = magnitude * 10;
        // Week 1: consumption reduction, rationing
        weekOneImpact = magnitude * 7;
        // Month 1: market adjustment, substitution
        monthOneImpact = magnitude * 3;
        recoveryTime = 30 + magnitude * 10;
        break;

      case 'SUPPLY_CUT':
        // Immediate: shortage panic
        immediateImpact = magnitude * 15;
        // Week 1: cascading shortages
        weekOneImpact = magnitude * 12;
        // Month 1: supply chain reorganization
        monthOneImpact = magnitude * 8;
        recoveryTime = 45 + magnitude * 15;
        break;

      case 'DEMAND_CRASH':
        // Immediate: inventory buildup
        immediateImpact = magnitude * 5;
        // Week 1: production cuts
        weekOneImpact = magnitude * 8;
        // Month 1: unemployment rises
        monthOneImpact = magnitude * 10;
        recoveryTime = 60 + magnitude * 20;
        break;
    }

    return {
      immediateImpact,
      weekOneImpact,
      monthOneImpact,
      recoveryTime
    };
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public getEconomicReport(factionId: string): string {
    const economy = this.getFactionEconomy(factionId);
    const lines: string[] = [];

    lines.push(`=== ECONOMIC REPORT: ${factionId} ===`);
    lines.push('');
    lines.push(`State: ${economy.economicState}`);
    lines.push(`GDP: ${economy.gdp.toExponential(2)} credits`);
    lines.push(`GDP Growth: ${economy.gdpGrowth.toFixed(1)}%`);
    lines.push(`Crisis Level: ${economy.crisisLevel}/10`);
    lines.push('');

    lines.push('CRITICAL RESOURCES:');
    for (const [commodity, need] of economy.criticalResources) {
      const status = need.inCrisis ? '🔴 CRISIS' : need.daysRemaining < 30 ? '🟡 WARNING' : '🟢 OK';
      lines.push(`  ${status} ${commodity}: ${need.daysRemaining.toFixed(0)} days remaining`);
      lines.push(`    Required: ${need.requiredPerDay.toFixed(0)}/day`);
      lines.push(`    Production: ${need.domesticProduction.toFixed(0)}/day`);
      lines.push(`    Imports: ${need.imports.toFixed(0)}/day`);
      lines.push(`    Deficit: ${need.deficit.toFixed(0)}/day`);
    }

    return lines.join('\n');
  }
}
