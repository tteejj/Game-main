/**
 * CityPopulationSync.ts
 * Synchronizes PopulationSystem state with actual City objects
 *
 * Handles:
 * - Population count updates
 * - Unemployment and happiness sync
 * - Economic output based on workforce
 * - Commodity consumption from markets
 * - Manufacturing output effects
 * - District population distribution
 */

import { PlanetaryCity, CityDistrict } from './PlanetaryCities';
import { PopulationSystem, CitizenGroup, AgeGroup, SkillCategory } from './PopulationSystem';

/**
 * Commodity consumption rates per capita per day
 */
export interface CommodityConsumption {
  food: number;           // Tons per 1000 people per day
  water: number;          // Liters per person per day
  power: number;          // MW per 1000 people
  medicalSupplies: number; // Units per 1000 people per day
  consumer_goods: number;  // Credits per person per day
}

/**
 * Production multipliers based on labor efficiency
 */
export interface ProductionEfficiency {
  manufacturing: number;  // 0-2 (0 = no production, 1 = normal, 2 = max efficiency)
  agriculture: number;    // 0-2
  services: number;       // 0-2
  research: number;       // 0-2
}

/**
 * Syncs population system with city instances
 */
export class CityPopulationSync {
  private populationSystem?: PopulationSystem;

  // Base consumption rates per capita
  private readonly BASE_FOOD_CONSUMPTION = 2.0;      // kg/person/day
  private readonly BASE_WATER_CONSUMPTION = 200;     // liters/person/day
  private readonly BASE_POWER_CONSUMPTION = 0.5;     // MW/1000 people
  private readonly BASE_MEDICAL_CONSUMPTION = 0.1;   // units/1000/day
  private readonly BASE_CONSUMER_GOODS = 10;         // credits/person/day

  constructor(populationSystem?: PopulationSystem) {
    this.populationSystem = populationSystem;
  }

  /**
   * Link to population system (for deferred initialization)
   */
  public linkPopulationSystem(populationSystem: PopulationSystem): void {
    this.populationSystem = populationSystem;
    console.log('[CityPopulationSync] Linked to PopulationSystem');
  }

  /**
   * Check if syncer is initialized
   */
  public isLinked(): boolean {
    return !!this.populationSystem;
  }

  /**
   * Synchronize all city data from population system
   */
  syncCity(city: PlanetaryCity): void {
    // Early return if not linked
    if (!this.populationSystem) return;

    const stats = this.populationSystem.getCityStatistics(city.id);
    const labor = this.populationSystem.getLaborMarket(city.id);

    if (!stats || !labor) return;

    // Update basic city stats
    city.population = stats.totalPopulation;

    // Update unemployment rate
    city.economy.unemployment = labor.unemploymentRate;

    // Calculate and update GDP per capita based on workforce
    this.updateCityEconomy(city, stats, labor);

    // Update infrastructure needs
    this.updateInfrastructureNeeds(city, stats);

    // Distribute population to districts
    if (city.districts.length > 0) {
      this.syncDistricts(city, stats);
    }
  }

  /**
   * Update city economic indicators based on population
   */
  private updateCityEconomy(
    city: PlanetaryCity,
    stats: any,
    labor: any
  ): void {
    // Calculate production efficiency based on employment
    const efficiency = this.calculateProductionEfficiency(city, labor, stats);

    // Update GDP based on workforce productivity
    const skillWeightedWorkforce = this.calculateSkillWeightedWorkforce(stats.skills);
    const baseGDPPerCapita = city.techLevel * 15000 + 10000;

    // Happiness affects productivity
    const happinessMultiplier = 0.5 + stats.averageHappiness * 1.0;
    // Health affects productivity
    const healthMultiplier = 0.7 + stats.averageHealth * 0.3;
    // Employment affects total output
    const employmentMultiplier = 0.6 + (1 - city.economy.unemployment) * 0.4;

    city.economy.gdpPerCapita = baseGDPPerCapita *
                                skillWeightedWorkforce *
                                happinessMultiplier *
                                healthMultiplier *
                                employmentMultiplier;

    // Update wealth level (0-1 scale)
    city.economy.wealthLevel = Math.min(1, city.economy.gdpPerCapita / 50000);

    // Update manufacturing output based on skilled workers
    this.updateManufacturingOutput(city, efficiency, labor);

    // Update service quality based on professional workers
    this.updateServiceQuality(city, stats.skills);
  }

  /**
   * Calculate production efficiency multipliers
   */
  private calculateProductionEfficiency(
    city: PlanetaryCity,
    labor: any,
    stats: any
  ): ProductionEfficiency {
    // Base efficiency from employment rate
    const employmentRate = 1 - city.economy.unemployment;

    // Happiness affects efficiency
    const happinessFactor = 0.5 + stats.averageHappiness;

    // Health affects efficiency
    const healthFactor = 0.7 + stats.averageHealth * 0.3;

    const baseEfficiency = employmentRate * happinessFactor * healthFactor;

    return {
      manufacturing: baseEfficiency * 1.0, // Manufacturing most affected by general workforce
      agriculture: baseEfficiency * 0.9,    // Agriculture less affected by skills
      services: baseEfficiency * 1.1,       // Services benefit from happiness
      research: baseEfficiency * 1.2 * (city.techLevel / 5) // Research needs tech infrastructure
    };
  }

  /**
   * Calculate skill-weighted workforce multiplier
   */
  private calculateSkillWeightedWorkforce(skills: Map<SkillCategory, number>): number {
    const total = Array.from(skills.values()).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 1.0;

    const weighted =
      (skills.get(SkillCategory.UNSKILLED) || 0) * 0.6 +
      (skills.get(SkillCategory.SKILLED) || 0) * 1.0 +
      (skills.get(SkillCategory.PROFESSIONAL) || 0) * 1.8 +
      (skills.get(SkillCategory.SPECIALIZED) || 0) * 2.5;

    return weighted / total;
  }

  /**
   * Update manufacturing output based on workforce
   */
  private updateManufacturingOutput(
    city: PlanetaryCity,
    efficiency: ProductionEfficiency,
    labor: any
  ): void {
    // Manufacturing output depends on skilled workers
    const skilledWorkers = labor.laborSupply.get(SkillCategory.SKILLED) || 0;
    const professionalWorkers = labor.laborSupply.get(SkillCategory.PROFESSIONAL) || 0;

    // Calculate manufacturing capacity
    const baseCapacity = city.population / 1000; // 1 factory per 1000 people baseline
    const skillBonus = (skilledWorkers + professionalWorkers * 2) / Math.max(1, labor.totalWorkforce);

    const manufacturingCapacity = baseCapacity * efficiency.manufacturing * (1 + skillBonus);

    // This could be used by an economy system to calculate actual production
    // For now, we store it as metadata
    (city as any).manufacturingCapacity = manufacturingCapacity;
  }

  /**
   * Update service quality based on professional workforce
   */
  private updateServiceQuality(city: PlanetaryCity, skills: Map<SkillCategory, number>): void {
    const totalPop = Array.from(skills.values()).reduce((sum, count) => sum + count, 0);
    if (totalPop === 0) return;

    // Professional and specialized workers improve service quality
    const professionals = skills.get(SkillCategory.PROFESSIONAL) || 0;
    const specialized = skills.get(SkillCategory.SPECIALIZED) || 0;
    const qualityRatio = (professionals + specialized * 1.5) / totalPop;

    // Update infrastructure quality based on skilled workforce
    const baseQuality = 0.3 + city.techLevel * 0.1;
    const workforceBonus = qualityRatio * 0.4;

    city.infrastructure.medicalQuality = Math.min(1, baseQuality + workforceBonus);
    city.infrastructure.communicationsQuality = Math.min(1, baseQuality + workforceBonus * 0.8);
    city.infrastructure.transportationQuality = Math.min(1, baseQuality + workforceBonus * 0.7);
  }

  /**
   * Update infrastructure needs based on population
   */
  private updateInfrastructureNeeds(city: PlanetaryCity, stats: any): void {
    const population = stats.totalPopulation;

    // Calculate required infrastructure
    const requiredWater = population * this.BASE_WATER_CONSUMPTION;
    const requiredPower = population * this.BASE_POWER_CONSUMPTION / 1000;

    // Update water supply capacity needs
    if (city.infrastructure.waterSupply < requiredWater * 0.9) {
      // Water shortage - affects happiness through needs
      city.infrastructure.waterSupply = Math.max(city.infrastructure.waterSupply, requiredWater * 0.8);
    }

    // Update power generation needs
    if (city.infrastructure.powerGeneration < requiredPower * 0.9) {
      // Power shortage - affects economy
      city.infrastructure.powerGeneration = Math.max(city.infrastructure.powerGeneration, requiredPower * 0.85);
    }

    // Food production needs
    const requiredFood = population * this.BASE_FOOD_CONSUMPTION / 1000000; // Convert to tons
    const foodSelfSufficiency = city.infrastructure.foodProduction;

    // Update food infrastructure status
    (city as any).foodRequirement = requiredFood;
    (city as any).foodDeficit = requiredFood * (1 - foodSelfSufficiency);
  }

  /**
   * Distribute city population to districts
   */
  private syncDistricts(city: PlanetaryCity, stats: any): void {
    if (city.districts.length === 0) return;

    const totalPopulation = stats.totalPopulation;
    const groups = this.populationSystem.getCityGroups(city.id);

    // Calculate district populations based on type
    const districtWeights = new Map<string, number>();
    let totalWeight = 0;

    for (const district of city.districts) {
      const weight = this.getDistrictPopulationWeight(district.type);
      districtWeights.set(district.id, weight);
      totalWeight += weight;
    }

    // Distribute population
    for (const district of city.districts) {
      const weight = districtWeights.get(district.id) || 1;
      const ratio = weight / totalWeight;
      district.population = Math.floor(totalPopulation * ratio);

      // Update district wealth and crime based on population groups
      this.updateDistrictStats(district, groups, ratio, stats);
    }
  }

  /**
   * Get population weight for district type
   */
  private getDistrictPopulationWeight(districtType: string): number {
    switch (districtType) {
      case 'Residential': return 3.0;
      case 'Commercial': return 1.5;
      case 'Industrial': return 1.0;
      case 'Government': return 0.5;
      case 'Entertainment': return 0.8;
      case 'Financial': return 0.6;
      case 'Academic': return 0.7;
      case 'Medical': return 0.6;
      case 'Slums': return 2.0;
      default: return 1.0;
    }
  }

  /**
   * Update district statistics
   */
  private updateDistrictStats(
    district: CityDistrict,
    groups: CitizenGroup[],
    populationRatio: number,
    cityStats: any
  ): void {
    // Calculate average wealth for this district's population
    let totalWealth = 0;
    let totalCrime = 0;
    let count = 0;

    for (const group of groups) {
      const groupShare = group.count * populationRatio;
      totalWealth += group.wealth * groupShare;
      totalCrime += group.crimePropensity * groupShare;
      count += groupShare;
    }

    if (count > 0) {
      const avgWealth = totalWealth / count;
      const avgCrime = totalCrime / count;

      // Update district wealth level (0-1)
      district.wealthLevel = Math.min(1, avgWealth / 60000); // Normalize to 0-1

      // Update district crime rate
      district.crimeRate = Math.min(1, avgCrime);

      // Slums have lower wealth, higher crime
      if (district.type === 'Slums') {
        district.wealthLevel *= 0.3;
        district.crimeRate = Math.min(1, district.crimeRate * 1.5 + 0.2);
      }

      // Financial districts have higher wealth
      if (district.type === 'Financial') {
        district.wealthLevel = Math.min(1, district.wealthLevel * 1.5 + 0.2);
        district.crimeRate *= 0.7;
      }
    }
  }

  /**
   * Calculate commodity consumption for a city
   */
  calculateCommodityConsumption(city: PlanetaryCity): CommodityConsumption {
    const stats = this.populationSystem.getCityStatistics(city.id);
    if (!stats) {
      return {
        food: 0,
        water: 0,
        power: 0,
        medicalSupplies: 0,
        consumer_goods: 0
      };
    }

    const population = stats.totalPopulation;

    return {
      food: (population / 1000) * this.BASE_FOOD_CONSUMPTION,
      water: population * this.BASE_WATER_CONSUMPTION,
      power: (population / 1000) * this.BASE_POWER_CONSUMPTION,
      medicalSupplies: (population / 1000) * this.BASE_MEDICAL_CONSUMPTION,
      consumer_goods: population * this.BASE_CONSUMER_GOODS * (0.5 + stats.averageHappiness * 0.5)
    };
  }

  /**
   * Apply commodity consumption to city markets
   * Returns true if consumption was successful, false if shortages occurred
   */
  applyCommodityConsumption(
    city: PlanetaryCity,
    consumption: CommodityConsumption,
    deltaTime: number
  ): boolean {
    // This would integrate with a market/economy system
    // For now, we just track what's needed

    const hoursFraction = deltaTime / 3600;

    // Calculate actual consumption for this time period
    const actualConsumption = {
      food: consumption.food * hoursFraction / 24, // Convert daily to hourly
      water: consumption.water * hoursFraction / 24,
      power: consumption.power,
      medicalSupplies: consumption.medicalSupplies * hoursFraction / 24,
      consumer_goods: consumption.consumer_goods * hoursFraction / 24
    };

    // Store consumption data on city for economy system to use
    (city as any).commodityConsumption = actualConsumption;

    // Check if city can meet needs
    const waterShortage = actualConsumption.water > city.infrastructure.waterSupply * hoursFraction / 24;
    const powerShortage = actualConsumption.power > city.infrastructure.powerGeneration;
    const foodShortage = city.infrastructure.foodProduction < 0.8; // Less than 80% self-sufficient

    // Return true if no major shortages
    return !waterShortage && !powerShortage && !foodShortage;
  }

  /**
   * Update city based on population changes
   */
  update(city: PlanetaryCity, deltaTime: number): void {
    // Sync all city data
    this.syncCity(city);

    // Calculate and apply commodity consumption
    const consumption = this.calculateCommodityConsumption(city);
    const adequateSupply = this.applyCommodityConsumption(city, consumption, deltaTime);

    // If supplies are inadequate, it will be reflected in the next population update
    // through the needs calculation (which reads from city infrastructure)
    if (!adequateSupply) {
      // Mark city as having resource issues
      (city as any).resourceShortage = true;
    } else {
      (city as any).resourceShortage = false;
    }
  }

  /**
   * Get production capacity breakdown for a city
   */
  getProductionCapacity(city: PlanetaryCity): {
    manufacturing: number;
    agriculture: number;
    services: number;
    research: number;
  } {
    const stats = this.populationSystem.getCityStatistics(city.id);
    const labor = this.populationSystem.getLaborMarket(city.id);

    if (!stats || !labor) {
      return { manufacturing: 0, agriculture: 0, services: 0, research: 0 };
    }

    const efficiency = this.calculateProductionEfficiency(city, labor, stats);
    const population = stats.totalPopulation;

    return {
      manufacturing: (population / 1000) * efficiency.manufacturing,
      agriculture: (population / 5000) * efficiency.agriculture,
      services: (population / 500) * efficiency.services,
      research: (population / 10000) * efficiency.research * city.techLevel
    };
  }

  /**
   * Get workforce breakdown by skill for a city
   */
  getWorkforceBreakdown(cityId: string): {
    total: number;
    employed: number;
    unemployed: number;
    bySkill: Map<SkillCategory, { total: number; employed: number }>;
  } {
    const labor = this.populationSystem.getLaborMarket(cityId);
    if (!labor) {
      return {
        total: 0,
        employed: 0,
        unemployed: 0,
        bySkill: new Map()
      };
    }

    const bySkill = new Map<SkillCategory, { total: number; employed: number }>();

    for (const [skill, supply] of labor.laborSupply) {
      const demand = labor.laborDemand.get(skill) || 0;
      bySkill.set(skill, {
        total: supply,
        employed: Math.min(supply, demand)
      });
    }

    return {
      total: labor.totalWorkforce,
      employed: labor.employed,
      unemployed: labor.unemployed,
      bySkill
    };
  }

  /**
   * Calculate economic impact of population on city GDP
   */
  calculateEconomicImpact(city: PlanetaryCity): {
    laborContribution: number;
    consumptionContribution: number;
    totalGDP: number;
  } {
    const stats = this.populationSystem.getCityStatistics(city.id);
    const labor = this.populationSystem.getLaborMarket(city.id);

    if (!stats || !labor) {
      return { laborContribution: 0, consumptionContribution: 0, totalGDP: 0 };
    }

    // Labor contribution (production)
    const laborContribution = labor.employed * labor.averageWage * 12; // Annual

    // Consumption contribution
    const consumption = this.calculateCommodityConsumption(city);
    const consumptionContribution = consumption.consumer_goods * 365; // Annual

    // Total GDP
    const totalGDP = city.population * city.economy.gdpPerCapita;

    return {
      laborContribution,
      consumptionContribution,
      totalGDP
    };
  }
}

/**
 * Helper function to create and link sync system
 */
export function createCityPopulationSync(
  populationSystem: PopulationSystem,
  cities: PlanetaryCity[]
): CityPopulationSync {
  // Create city registry map
  const cityMap = new Map<string, PlanetaryCity>();
  for (const city of cities) {
    cityMap.set(city.id, city);
  }

  // Link to population system
  populationSystem.linkCityRegistry(cityMap);

  // Create sync helper
  return new CityPopulationSync(populationSystem);
}

/**
 * Batch update all cities
 */
export function syncAllCities(
  sync: CityPopulationSync,
  cities: PlanetaryCity[],
  deltaTime: number
): void {
  for (const city of cities) {
    sync.update(city, deltaTime);
  }
}
