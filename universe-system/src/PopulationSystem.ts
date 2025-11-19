/**
 * PopulationSystem.ts
 * Comprehensive population simulation with individual citizens, needs, and social dynamics
 *
 * Citizens are tracked as aggregated demographic groups for performance
 * Population mechanics drive faction behavior and city development
 *
 * FIXED: Now integrates with actual City instances instead of phantom data
 */

import { PlanetaryCity } from './PlanetaryCities';
import { StationFaction } from './StationGenerator';
import { HistoricalEvent } from './simulation/HistoricalMemorySystem';
import { Vector3 } from './CelestialBody';

/**
 * Demographic skill categories
 */
export enum SkillCategory {
  UNSKILLED = 'UNSKILLED',           // Manual labor, basic services
  SKILLED = 'SKILLED',               // Trained workers, technicians
  PROFESSIONAL = 'PROFESSIONAL',      // Engineers, doctors, scientists
  SPECIALIZED = 'SPECIALIZED',        // Advanced specialists, researchers
}

/**
 * Age demographic groups
 */
export enum AgeGroup {
  CHILD = 'CHILD',           // 0-18 years
  ADULT = 'ADULT',           // 19-65 years
  ELDERLY = 'ELDERLY',       // 65+ years
}

/**
 * Population needs that must be satisfied
 */
export interface PopulationNeeds {
  food: number;              // 0-1 (0 = starving, 1 = well-fed)
  water: number;             // 0-1 (0 = dehydrated, 1 = sufficient)
  shelter: number;           // 0-1 (0 = homeless, 1 = adequate housing)
  healthcare: number;        // 0-1 (0 = no medical, 1 = excellent care)
  entertainment: number;     // 0-1 (0 = none, 1 = abundant)
  employment: number;        // 0-1 (0 = unemployed, 1 = full employment)
  safety: number;            // 0-1 (0 = dangerous, 1 = very safe)
}

/**
 * Citizen demographic group
 * Represents aggregated population cohorts for performance
 */
export interface CitizenGroup {
  id: string;
  cityId: string;
  count: number;                    // Number of citizens in this group
  ageGroup: AgeGroup;
  skillCategory: SkillCategory;

  // Current state
  happiness: number;                // 0-1 (average happiness of group)
  health: number;                   // 0-1 (average health)
  education: number;                // 0-1 (average education level)
  wealth: number;                   // Credits per capita

  // Needs satisfaction levels
  needs: PopulationNeeds;

  // Social factors
  politicalEngagement: number;      // 0-1 (likelihood to protest/vote)
  crimePropensity: number;          // 0-1 (likelihood to commit crimes)
  migrationDesire: number;          // 0-1 (desire to leave city)
}

/**
 * Population growth parameters
 */
export interface GrowthFactors {
  baseBirthRate: number;            // Annual birth rate (0-1)
  baseDeathRate: number;            // Annual death rate (0-1)
  healthcareMod: number;            // Healthcare impact on death rate
  wealthMod: number;                // Wealth impact on birth rate
  happinessMod: number;             // Happiness impact on birth rate
  educationMod: number;             // Education impact (higher edu = lower birth)
}

/**
 * Migration event
 */
export interface MigrationEvent {
  fromCityId: string;
  toCityId: string;
  citizenGroupId: string;
  count: number;                    // Number of migrants
  reason: MigrationReason;
  timestamp: number;
}

export enum MigrationReason {
  ECONOMIC_OPPORTUNITY = 'ECONOMIC_OPPORTUNITY',
  ESCAPING_UNREST = 'ESCAPING_UNREST',
  BETTER_LIVING_CONDITIONS = 'BETTER_LIVING_CONDITIONS',
  FOLLOWING_JOBS = 'FOLLOWING_JOBS',
  FLEEING_CONFLICT = 'FLEEING_CONFLICT',
  RETIREMENT = 'RETIREMENT',
  EDUCATION = 'EDUCATION',
}

/**
 * Social unrest event
 */
export interface SocialUnrest {
  cityId: string;
  severity: number;                 // 0-1 (0 = minor, 1 = revolution)
  type: UnrestType;
  participants: number;             // Number of citizens involved
  demands: string[];                // What protesters want
  startTime: number;
  duration: number;                 // How long it lasts (hours)
  economicImpact: number;           // GDP reduction during unrest
}

export enum UnrestType {
  PROTEST = 'PROTEST',               // Peaceful demonstration
  STRIKE = 'STRIKE',                 // Labor strike
  RIOT = 'RIOT',                     // Violent unrest
  REBELLION = 'REBELLION',           // Armed uprising
  REVOLUTION = 'REVOLUTION',         // Attempt to overthrow government
}

/**
 * Labor market statistics
 */
export interface LaborMarket {
  totalWorkforce: number;            // All adults able to work
  employed: number;                  // Currently employed
  unemployed: number;                // Actively seeking work
  unemploymentRate: number;          // Percentage unemployed
  laborDemand: Map<SkillCategory, number>; // Jobs needed by skill
  laborSupply: Map<SkillCategory, number>; // Workers available by skill
  averageWage: number;               // Average wage in credits/month
}

/**
 * Event callback type for population events
 */
export type PopulationEventCallback = (event: HistoricalEvent) => void;

/**
 * Comprehensive population simulation system
 * NOW INTEGRATES WITH ACTUAL CITY INSTANCES
 */
export class PopulationSystem {
  private citizenGroups: Map<string, CitizenGroup> = new Map();
  private cityPopulations: Map<string, CitizenGroup[]> = new Map();
  private migrationEvents: MigrationEvent[] = [];
  private unrestEvents: Map<string, SocialUnrest[]> = new Map();
  private laborMarkets: Map<string, LaborMarket> = new Map();

  // FIXED: Reference to actual city instances
  private cityRegistry: Map<string, PlanetaryCity> = new Map();

  // Event callback for integration with event system
  private eventCallback?: PopulationEventCallback;

  // Configuration
  private readonly SIMULATION_TICK = 3600; // 1 hour in seconds
  private currentTime: number = 0;

  // Population dynamics constants
  private readonly BASE_BIRTH_RATE = 0.012;        // 1.2% per year
  private readonly BASE_DEATH_RATE = 0.008;        // 0.8% per year
  private readonly CHILD_RATIO = 0.20;             // 20% children
  private readonly ELDERLY_RATIO = 0.15;           // 15% elderly
  private readonly ADULT_RATIO = 0.65;             // 65% adults

  // Happiness thresholds
  private readonly HAPPINESS_UNREST_THRESHOLD = 0.3;
  private readonly HAPPINESS_MIGRATION_THRESHOLD = 0.4;
  private readonly HAPPINESS_REVOLT_THRESHOLD = 0.15;

  // Migration parameters
  private readonly MIGRATION_RATE_BASE = 0.02;     // 2% may migrate per year
  private readonly MIGRATION_DISTANCE_PENALTY = 0.1; // Cost per 1000km

  /**
   * FIXED: Link to city registry so we can modify actual city instances
   */
  linkCityRegistry(cityMap: Map<string, PlanetaryCity>): void {
    this.cityRegistry = cityMap;
  }

  /**
   * Set event callback for emitting population events
   */
  setEventCallback(callback: PopulationEventCallback): void {
    this.eventCallback = callback;
  }

  /**
   * Emit a population event
   */
  private emitEvent(event: HistoricalEvent): void {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  /**
   * Initialize population for a city
   */
  initializeCityPopulation(city: PlanetaryCity): void {
    const groups: CitizenGroup[] = [];

    // Distribute population across age groups
    const childCount = Math.floor(city.population * this.CHILD_RATIO);
    const elderlyCount = Math.floor(city.population * this.ELDERLY_RATIO);
    const adultCount = city.population - childCount - elderlyCount;

    // Create child groups (no skills yet)
    groups.push(this.createCitizenGroup(
      city.id,
      childCount,
      AgeGroup.CHILD,
      SkillCategory.UNSKILLED,
      city
    ));

    // Create adult groups distributed by skill level
    // Skill distribution based on city tech level
    const skillDistribution = this.calculateSkillDistribution(city.techLevel);
    for (const [skill, ratio] of skillDistribution) {
      const count = Math.floor(adultCount * ratio);
      if (count > 0) {
        groups.push(this.createCitizenGroup(
          city.id,
          count,
          AgeGroup.ADULT,
          skill,
          city
        ));
      }
    }

    // Create elderly groups (mostly unskilled/skilled)
    const elderlySkilled = Math.floor(elderlyCount * 0.3);
    const elderlyUnskilled = elderlyCount - elderlySkilled;

    groups.push(this.createCitizenGroup(
      city.id,
      elderlyUnskilled,
      AgeGroup.ELDERLY,
      SkillCategory.UNSKILLED,
      city
    ));

    if (elderlySkilled > 0) {
      groups.push(this.createCitizenGroup(
        city.id,
        elderlySkilled,
        AgeGroup.ELDERLY,
        SkillCategory.SKILLED,
        city
      ));
    }

    // Store groups
    this.cityPopulations.set(city.id, groups);
    for (const group of groups) {
      this.citizenGroups.set(group.id, group);
    }

    // Initialize labor market
    this.updateLaborMarket(city.id);
  }

  /**
   * Calculate skill distribution based on tech level
   */
  private calculateSkillDistribution(techLevel: number): Map<SkillCategory, number> {
    const dist = new Map<SkillCategory, number>();

    // Higher tech = more skilled/professional workers
    // Lower tech = more unskilled workers
    switch (Math.floor(techLevel)) {
      case 0: // Primitive
        dist.set(SkillCategory.UNSKILLED, 0.70);
        dist.set(SkillCategory.SKILLED, 0.25);
        dist.set(SkillCategory.PROFESSIONAL, 0.04);
        dist.set(SkillCategory.SPECIALIZED, 0.01);
        break;
      case 1: // Industrial
        dist.set(SkillCategory.UNSKILLED, 0.50);
        dist.set(SkillCategory.SKILLED, 0.35);
        dist.set(SkillCategory.PROFESSIONAL, 0.12);
        dist.set(SkillCategory.SPECIALIZED, 0.03);
        break;
      case 2: // Modern
        dist.set(SkillCategory.UNSKILLED, 0.35);
        dist.set(SkillCategory.SKILLED, 0.40);
        dist.set(SkillCategory.PROFESSIONAL, 0.20);
        dist.set(SkillCategory.SPECIALIZED, 0.05);
        break;
      case 3: // Advanced
        dist.set(SkillCategory.UNSKILLED, 0.25);
        dist.set(SkillCategory.SKILLED, 0.40);
        dist.set(SkillCategory.PROFESSIONAL, 0.25);
        dist.set(SkillCategory.SPECIALIZED, 0.10);
        break;
      case 4: // High-tech
        dist.set(SkillCategory.UNSKILLED, 0.15);
        dist.set(SkillCategory.SKILLED, 0.35);
        dist.set(SkillCategory.PROFESSIONAL, 0.35);
        dist.set(SkillCategory.SPECIALIZED, 0.15);
        break;
      default: // Cutting-edge (5+)
        dist.set(SkillCategory.UNSKILLED, 0.10);
        dist.set(SkillCategory.SKILLED, 0.30);
        dist.set(SkillCategory.PROFESSIONAL, 0.40);
        dist.set(SkillCategory.SPECIALIZED, 0.20);
        break;
    }

    return dist;
  }

  /**
   * Create a new citizen group
   */
  private createCitizenGroup(
    cityId: string,
    count: number,
    ageGroup: AgeGroup,
    skillCategory: SkillCategory,
    city: PlanetaryCity
  ): CitizenGroup {
    const id = `${cityId}-${ageGroup}-${skillCategory}-${Date.now()}-${Math.random()}`;

    // Calculate initial needs based on city infrastructure
    const needs = this.calculateNeeds(city);

    // Calculate initial happiness based on needs satisfaction
    const happiness = this.calculateHappiness(needs, city);

    // Calculate initial wealth based on city economy and skill level
    const wealthMultiplier = this.getSkillWealthMultiplier(skillCategory);
    const wealth = city.economy.gdpPerCapita * wealthMultiplier;

    return {
      id,
      cityId,
      count,
      ageGroup,
      skillCategory,
      happiness,
      health: 0.6 + city.infrastructure.medicalQuality * 0.4,
      education: city.techLevel * 0.15,
      wealth,
      needs,
      politicalEngagement: 0.3 + Math.random() * 0.3,
      crimePropensity: city.economy.crimeRate * (1 - happiness),
      migrationDesire: Math.max(0, 1 - happiness - 0.3)
    };
  }

  /**
   * Calculate needs satisfaction for a city
   */
  private calculateNeeds(city: PlanetaryCity): PopulationNeeds {
    return {
      food: Math.min(1, city.infrastructure.foodProduction * 1.2),
      water: Math.min(1, city.infrastructure.waterSupply / (city.population * 200)),
      shelter: Math.max(0.3, 1 - city.economy.unemployment * 0.5),
      healthcare: city.infrastructure.medicalQuality,
      entertainment: city.services.entertainment ? 0.7 : 0.3,
      employment: 1 - city.economy.unemployment,
      safety: 1 - city.economy.crimeRate
    };
  }

  /**
   * Calculate happiness from needs and city conditions
   */
  private calculateHappiness(needs: PopulationNeeds, city: PlanetaryCity): number {
    // Weighted average of needs satisfaction
    const needsScore = (
      needs.food * 0.25 +           // Food is critical
      needs.water * 0.20 +          // Water is critical
      needs.shelter * 0.15 +        // Shelter important
      needs.healthcare * 0.10 +     // Healthcare moderately important
      needs.entertainment * 0.05 +  // Entertainment nice to have
      needs.employment * 0.20 +     // Employment very important
      needs.safety * 0.05           // Safety moderately important
    );

    // Modify by city factors
    const stabilityBonus = city.politics.stability * 0.1;
    const wealthBonus = city.economy.wealthLevel * 0.1;
    const corruptionPenalty = city.politics.corruption * 0.15;

    const happiness = Math.max(0, Math.min(1,
      needsScore + stabilityBonus + wealthBonus - corruptionPenalty
    ));

    return happiness;
  }

  /**
   * Get wealth multiplier for skill category
   */
  private getSkillWealthMultiplier(skill: SkillCategory): number {
    switch (skill) {
      case SkillCategory.UNSKILLED: return 0.6;
      case SkillCategory.SKILLED: return 1.0;
      case SkillCategory.PROFESSIONAL: return 1.8;
      case SkillCategory.SPECIALIZED: return 2.5;
    }
  }

  /**
   * Update population simulation
   */
  update(deltaTime: number, cities: PlanetaryCity[]): void {
    this.currentTime += deltaTime;

    // Update each city's population
    for (const city of cities) {
      this.updateCityPopulation(city, deltaTime);
    }

    // Process migrations between cities
    this.processMigration(cities, deltaTime);

    // Update social unrest
    this.updateSocialUnrest(cities, deltaTime);

    // Clean up old events
    this.cleanupOldEvents();
  }

  /**
   * Update population for a single city
   */
  private updateCityPopulation(city: PlanetaryCity, deltaTime: number): void {
    const groups = this.cityPopulations.get(city.id) || [];

    // Update needs based on current city state
    const currentNeeds = this.calculateNeeds(city);

    for (const group of groups) {
      // Update needs
      group.needs = currentNeeds;

      // Update happiness
      group.happiness = this.calculateHappiness(group.needs, city);

      // Update health based on healthcare and food
      group.health = Math.max(0, Math.min(1,
        group.health +
        (group.needs.healthcare * 0.1 - 0.05) * deltaTime / 86400 +
        (group.needs.food * 0.1 - 0.05) * deltaTime / 86400
      ));

      // Update migration desire
      group.migrationDesire = this.calculateMigrationDesire(group, city);

      // Update crime propensity
      group.crimePropensity = Math.max(0, Math.min(1,
        city.economy.crimeRate * (1 - group.happiness) * (1 - group.needs.employment)
      ));

      // Apply growth/decline
      this.applyPopulationGrowth(group, city, deltaTime);

      // Age progression (slow process)
      this.processAging(group, deltaTime);
    }

    // FIXED: Update city's total population from groups
    const totalPopulation = groups.reduce((sum, g) => sum + g.count, 0);
    city.population = totalPopulation;

    // FIXED: Update city's unemployment rate from labor market
    this.updateLaborMarket(city.id);
    const labor = this.laborMarkets.get(city.id);
    if (labor) {
      city.economy.unemployment = labor.unemploymentRate;
    }
  }

  /**
   * Calculate migration desire for a citizen group
   */
  private calculateMigrationDesire(group: CitizenGroup, city: PlanetaryCity): number {
    // Base desire from unhappiness
    let desire = Math.max(0, 1 - group.happiness - 0.3);

    // Increase if unemployed
    if (group.needs.employment < 0.5) {
      desire += 0.3;
    }

    // Increase if unsafe
    if (group.needs.safety < 0.4) {
      desire += 0.2;
    }

    // Decrease if wealthy (less likely to migrate)
    if (group.wealth > city.economy.gdpPerCapita * 1.5) {
      desire *= 0.5;
    }

    // Elderly less likely to migrate
    if (group.ageGroup === AgeGroup.ELDERLY) {
      desire *= 0.3;
    }

    // Children follow parents (high migration if adults are migrating)
    if (group.ageGroup === AgeGroup.CHILD) {
      const adultGroups = this.cityPopulations.get(city.id)?.filter(g => g.ageGroup === AgeGroup.ADULT) || [];
      const avgAdultDesire = adultGroups.reduce((sum, g) => sum + g.migrationDesire, 0) / Math.max(1, adultGroups.length);
      desire = avgAdultDesire * 0.8;
    }

    return Math.min(1, desire);
  }

  /**
   * Apply population growth/decline based on conditions
   * FIXED: Now affects actual city population through group counts
   */
  private applyPopulationGrowth(group: CitizenGroup, city: PlanetaryCity, deltaTime: number): void {
    if (group.ageGroup !== AgeGroup.ADULT) {
      // Only adults produce children; handle aging separately
      return;
    }

    // Calculate growth factors
    const factors = this.calculateGrowthFactors(group, city);

    // Annual rates converted to delta time
    const yearFraction = deltaTime / (365.25 * 86400);

    // Birth rate affected by happiness, healthcare, wealth
    const birthRate = factors.baseBirthRate *
                     (1 + factors.happinessMod) *
                     (1 + factors.healthcareMod) *
                     (1 + factors.wealthMod) *
                     (1 - factors.educationMod * 0.3); // Higher education = lower birth rate

    // Death rate affected by healthcare, food, safety
    const deathRate = factors.baseDeathRate *
                     (1 - factors.healthcareMod) *
                     (1 - group.health * 0.5) *
                     (group.needs.food < 0.3 ? 2.0 : 1.0); // Starvation doubles death rate

    const netGrowth = (birthRate - deathRate) * yearFraction;

    // Apply growth
    const change = Math.floor(group.count * netGrowth);
    group.count = Math.max(0, group.count + change);

    // If birth rate is positive, create child population
    if (change > 0) {
      this.addChildrenToCity(city.id, change);
    }
  }

  /**
   * Calculate growth factors for a population group
   */
  private calculateGrowthFactors(group: CitizenGroup, city: PlanetaryCity): GrowthFactors {
    return {
      baseBirthRate: this.BASE_BIRTH_RATE,
      baseDeathRate: this.BASE_DEATH_RATE,
      healthcareMod: group.needs.healthcare * 0.5,
      wealthMod: (group.wealth / city.economy.gdpPerCapita - 0.8) * 0.3,
      happinessMod: (group.happiness - 0.5) * 0.4,
      educationMod: group.education
    };
  }

  /**
   * Add newborn children to city
   */
  private addChildrenToCity(cityId: string, count: number): void {
    const groups = this.cityPopulations.get(cityId) || [];
    const childGroup = groups.find(g => g.ageGroup === AgeGroup.CHILD);

    if (childGroup) {
      childGroup.count += count;
    }
  }

  /**
   * Process aging of population groups
   */
  private processAging(group: CitizenGroup, deltaTime: number): void {
    // Simplified aging: very slow process
    // In reality, would track sub-groups by exact age
    // For simulation, we use probabilistic transitions

    const yearsPerSecond = 1 / (365.25 * 86400);
    const years = deltaTime * yearsPerSecond;

    // Chance of aging to next bracket
    let agingChance = 0;

    switch (group.ageGroup) {
      case AgeGroup.CHILD:
        // Average 18 years to adult = ~5.5% per year
        agingChance = years * 0.055;
        break;
      case AgeGroup.ADULT:
        // Average 47 years as adult = ~2.1% per year
        agingChance = years * 0.021;
        break;
      case AgeGroup.ELDERLY:
        // Elderly eventually die, handled by death rate
        return;
    }

    // Determine how many age up
    const agingCount = Math.floor(group.count * agingChance);
    if (agingCount > 0 && agingCount < group.count) {
      group.count -= agingCount;

      // Create or add to next age group
      const nextAge = group.ageGroup === AgeGroup.CHILD ? AgeGroup.ADULT : AgeGroup.ELDERLY;
      this.moveToAgeGroup(group.cityId, agingCount, nextAge, group.skillCategory);
    }
  }

  /**
   * Move population to different age group
   */
  private moveToAgeGroup(
    cityId: string,
    count: number,
    targetAge: AgeGroup,
    skillCategory: SkillCategory
  ): void {
    const groups = this.cityPopulations.get(cityId) || [];
    const targetGroup = groups.find(g => g.ageGroup === targetAge && g.skillCategory === skillCategory);

    if (targetGroup) {
      targetGroup.count += count;
    } else {
      // Create new group
      const city = this.findCity(cityId);
      if (city) {
        const newGroup = this.createCitizenGroup(cityId, count, targetAge, skillCategory, city);
        groups.push(newGroup);
        this.citizenGroups.set(newGroup.id, newGroup);
      }
    }
  }

  /**
   * Process migration between cities
   * FIXED: Now updates actual city populations
   */
  private processMigration(cities: PlanetaryCity[], deltaTime: number): void {
    const yearFraction = deltaTime / (365.25 * 86400);

    for (const sourceCity of cities) {
      const groups = this.cityPopulations.get(sourceCity.id) || [];

      for (const group of groups) {
        // Only working-age adults migrate in significant numbers
        if (group.ageGroup !== AgeGroup.ADULT) continue;

        // Check if group wants to migrate
        if (group.migrationDesire < this.HAPPINESS_MIGRATION_THRESHOLD) continue;

        // Calculate migration rate
        const migrationRate = this.MIGRATION_RATE_BASE * group.migrationDesire * yearFraction;
        const potentialMigrants = Math.floor(group.count * migrationRate);

        if (potentialMigrants === 0) continue;

        // Find best destination city
        const destination = this.findBestMigrationDestination(sourceCity, group, cities);

        if (destination && destination.id !== sourceCity.id) {
          const actualMigrants = Math.min(potentialMigrants, Math.floor(group.count * 0.1)); // Max 10% per tick

          if (actualMigrants > 0) {
            this.executeMigration(group, sourceCity, destination, actualMigrants);
          }
        }
      }
    }
  }

  /**
   * Find best city to migrate to
   */
  private findBestMigrationDestination(
    sourceCity: PlanetaryCity,
    group: CitizenGroup,
    cities: PlanetaryCity[]
  ): PlanetaryCity | null {
    let bestCity: PlanetaryCity | null = null;
    let bestScore = -Infinity;

    for (const city of cities) {
      if (city.id === sourceCity.id) continue;

      // Calculate attractiveness score
      const cityNeeds = this.calculateNeeds(city);
      const employment = cityNeeds.employment;
      const happiness = this.calculateHappiness(cityNeeds, city);
      const wealth = city.economy.gdpPerCapita / sourceCity.economy.gdpPerCapita;

      // Distance penalty (simplified - would use actual coordinates)
      const distance = Math.abs(city.coordinates.latitude - sourceCity.coordinates.latitude) +
                      Math.abs(city.coordinates.longitude - sourceCity.coordinates.longitude);
      const distancePenalty = distance * this.MIGRATION_DISTANCE_PENALTY;

      const score = employment * 2 + happiness * 1.5 + Math.log(wealth) - distancePenalty;

      if (score > bestScore) {
        bestScore = score;
        bestCity = city;
      }
    }

    return bestCity;
  }

  /**
   * Execute migration from one city to another
   * FIXED: Now updates actual city populations and emits events
   */
  private executeMigration(
    sourceGroup: CitizenGroup,
    sourceCity: PlanetaryCity,
    destCity: PlanetaryCity,
    count: number
  ): void {
    // Remove from source
    sourceGroup.count -= count;

    // Add to destination
    const destGroups = this.cityPopulations.get(destCity.id) || [];
    const destGroup = destGroups.find(
      g => g.ageGroup === sourceGroup.ageGroup && g.skillCategory === sourceGroup.skillCategory
    );

    if (destGroup) {
      destGroup.count += count;
    } else {
      // Create new group in destination
      const newGroup = this.createCitizenGroup(
        destCity.id,
        count,
        sourceGroup.ageGroup,
        sourceGroup.skillCategory,
        destCity
      );
      destGroups.push(newGroup);
      this.citizenGroups.set(newGroup.id, newGroup);
      this.cityPopulations.set(destCity.id, destGroups);
    }

    // Record migration event
    const reason = this.determineMigrationReason(sourceGroup, sourceCity);
    const migrationEvent: MigrationEvent = {
      fromCityId: sourceCity.id,
      toCityId: destCity.id,
      citizenGroupId: sourceGroup.id,
      count,
      reason,
      timestamp: this.currentTime
    };
    this.migrationEvents.push(migrationEvent);

    // FIXED: Emit migration event for event system
    if (count > 1000) { // Only emit for significant migrations
      this.emitEvent({
        id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: this.currentTime,
        type: 'POPULATION_MIGRATED',
        severity: Math.min(10, Math.floor(count / 1000)),
        category: 'DEMOGRAPHIC',
        location: {
          x: sourceCity.coordinates.latitude,
          y: sourceCity.coordinates.longitude,
          z: 0
        },
        participants: [sourceCity.name, destCity.name],
        description: `${count} citizens migrated from ${sourceCity.name} to ${destCity.name} (${reason})`,
        data: {
          fromCityId: sourceCity.id,
          toCityId: destCity.id,
          count,
          reason,
          skillCategory: sourceGroup.skillCategory
        },
        consequences: [],
        witnessed: false,
        priority: Math.min(10, Math.floor(count / 1000)),
        tags: ['migration', 'population', 'demographic']
      });
    }
  }

  /**
   * Determine reason for migration
   */
  private determineMigrationReason(group: CitizenGroup, city: PlanetaryCity): MigrationReason {
    if (group.needs.employment < 0.3) return MigrationReason.ECONOMIC_OPPORTUNITY;
    if (group.needs.safety < 0.3) return MigrationReason.FLEEING_CONFLICT;
    if (group.happiness < 0.3) return MigrationReason.ESCAPING_UNREST;
    return MigrationReason.BETTER_LIVING_CONDITIONS;
  }

  /**
   * Update social unrest events
   */
  private updateSocialUnrest(cities: PlanetaryCity[], deltaTime: number): void {
    for (const city of cities) {
      const groups = this.cityPopulations.get(city.id) || [];

      // Calculate average happiness
      const totalPop = groups.reduce((sum, g) => sum + g.count, 0);
      const avgHappiness = groups.reduce((sum, g) => sum + g.happiness * g.count, 0) / Math.max(1, totalPop);

      // Check for new unrest
      if (avgHappiness < this.HAPPINESS_UNREST_THRESHOLD) {
        const existingUnrest = this.unrestEvents.get(city.id) || [];

        // Don't create new unrest if one is already active
        const activeUnrest = existingUnrest.filter(u =>
          this.currentTime < u.startTime + u.duration * 3600
        );

        if (activeUnrest.length === 0) {
          // Create new unrest event
          const unrest = this.createUnrestEvent(city, avgHappiness, groups);
          existingUnrest.push(unrest);
          this.unrestEvents.set(city.id, existingUnrest);

          // Apply immediate effects
          this.applyUnrestEffects(city, unrest);

          // FIXED: Emit unrest event
          this.emitEvent({
            id: `unrest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: this.currentTime,
            type: 'POPULATION_UNREST',
            severity: Math.floor(unrest.severity * 10),
            category: 'POLITICAL',
            location: {
              x: city.coordinates.latitude,
              y: city.coordinates.longitude,
              z: 0
            },
            participants: [city.name, city.faction],
            description: `${unrest.type} in ${city.name}: ${unrest.participants} citizens demanding change`,
            data: {
              cityId: city.id,
              unrestType: unrest.type,
              severity: unrest.severity,
              participants: unrest.participants,
              demands: unrest.demands,
              economicImpact: unrest.economicImpact
            },
            consequences: unrest.demands,
            witnessed: false,
            priority: Math.floor(unrest.severity * 10),
            tags: ['unrest', 'population', 'political', unrest.type]
          });
        }
      }

      // Update existing unrest
      const cityUnrest = this.unrestEvents.get(city.id) || [];
      for (const unrest of cityUnrest) {
        const elapsed = this.currentTime - unrest.startTime;
        if (elapsed < unrest.duration * 3600) {
          // Unrest still active - continue applying effects
          this.applyUnrestEffects(city, unrest);
        }
      }
    }
  }

  /**
   * Create a social unrest event
   */
  private createUnrestEvent(
    city: PlanetaryCity,
    avgHappiness: number,
    groups: CitizenGroup[]
  ): SocialUnrest {
    // Severity based on how unhappy population is
    const severity = Math.max(0, Math.min(1, (this.HAPPINESS_UNREST_THRESHOLD - avgHappiness) * 2));

    // Determine type based on severity and conditions
    let type: UnrestType;
    if (severity > 0.8 && avgHappiness < this.HAPPINESS_REVOLT_THRESHOLD) {
      type = UnrestType.REVOLUTION;
    } else if (severity > 0.6) {
      type = UnrestType.REBELLION;
    } else if (severity > 0.4) {
      type = UnrestType.RIOT;
    } else if (groups.some(g => g.needs.employment < 0.4)) {
      type = UnrestType.STRIKE;
    } else {
      type = UnrestType.PROTEST;
    }

    // Calculate participants (unhappy citizens)
    const unhappyGroups = groups.filter(g => g.happiness < this.HAPPINESS_UNREST_THRESHOLD);
    const participants = unhappyGroups.reduce((sum, g) => {
      return sum + Math.floor(g.count * g.politicalEngagement * severity);
    }, 0);

    // Determine demands
    const demands = this.generateUnrestDemands(groups, city);

    // Duration based on type
    const baseDuration = {
      [UnrestType.PROTEST]: 24,
      [UnrestType.STRIKE]: 72,
      [UnrestType.RIOT]: 48,
      [UnrestType.REBELLION]: 168,
      [UnrestType.REVOLUTION]: 336
    }[type];

    const duration = baseDuration * (0.5 + severity);

    return {
      cityId: city.id,
      severity,
      type,
      participants,
      demands,
      startTime: this.currentTime,
      duration,
      economicImpact: severity * 0.5 // Up to 50% GDP reduction
    };
  }

  /**
   * Generate demands for unrest
   */
  private generateUnrestDemands(groups: CitizenGroup[], city: PlanetaryCity): string[] {
    const demands: string[] = [];

    const avgNeeds = this.calculateAverageNeeds(groups);

    if (avgNeeds.food < 0.5) demands.push('Improve food supply');
    if (avgNeeds.employment < 0.5) demands.push('Create more jobs');
    if (avgNeeds.healthcare < 0.4) demands.push('Better healthcare');
    if (avgNeeds.safety < 0.4) demands.push('Reduce crime');
    if (city.economy.wealthLevel < 0.3) demands.push('Economic reforms');
    if (city.politics.corruption > 0.6) demands.push('End corruption');
    if (city.politics.civilRights < 0.4) demands.push('Expand civil rights');

    return demands.length > 0 ? demands : ['General discontent', 'Government reform'];
  }

  /**
   * Calculate average needs across all groups
   */
  private calculateAverageNeeds(groups: CitizenGroup[]): PopulationNeeds {
    const totalPop = groups.reduce((sum, g) => sum + g.count, 0);

    if (totalPop === 0) {
      return {
        food: 0.5,
        water: 0.5,
        shelter: 0.5,
        healthcare: 0.5,
        entertainment: 0.5,
        employment: 0.5,
        safety: 0.5
      };
    }

    return {
      food: groups.reduce((sum, g) => sum + g.needs.food * g.count, 0) / totalPop,
      water: groups.reduce((sum, g) => sum + g.needs.water * g.count, 0) / totalPop,
      shelter: groups.reduce((sum, g) => sum + g.needs.shelter * g.count, 0) / totalPop,
      healthcare: groups.reduce((sum, g) => sum + g.needs.healthcare * g.count, 0) / totalPop,
      entertainment: groups.reduce((sum, g) => sum + g.needs.entertainment * g.count, 0) / totalPop,
      employment: groups.reduce((sum, g) => sum + g.needs.employment * g.count, 0) / totalPop,
      safety: groups.reduce((sum, g) => sum + g.needs.safety * g.count, 0) / totalPop
    };
  }

  /**
   * Apply effects of unrest to city
   * FIXED: Now modifies actual city properties
   */
  private applyUnrestEffects(city: PlanetaryCity, unrest: SocialUnrest): void {
    // FIXED: Reduce economic output in actual city
    city.economy.wealthLevel = Math.max(0, city.economy.wealthLevel * (1 - unrest.economicImpact * 0.1));
    city.economy.gdpPerCapita = Math.max(0, city.economy.gdpPerCapita * (1 - unrest.economicImpact * 0.05));

    // FIXED: Increase crime during unrest
    if (unrest.type === UnrestType.RIOT || unrest.type === UnrestType.REBELLION) {
      city.economy.crimeRate = Math.min(1, city.economy.crimeRate + 0.1);
    }

    // FIXED: Decrease stability
    city.politics.stability = Math.max(0, city.politics.stability - unrest.severity * 0.05);

    // Major unrest can change government
    if (unrest.type === UnrestType.REVOLUTION && unrest.severity > 0.7) {
      // Revolution successful - reduce civil rights, increase instability
      city.politics.civilRights = Math.max(0, city.politics.civilRights - 0.2);
      city.politics.stability = Math.max(0, city.politics.stability - 0.3);
    }
  }

  /**
   * Update labor market for a city
   * FIXED: Now uses actual city reference
   */
  private updateLaborMarket(cityId: string): void {
    const groups = this.cityPopulations.get(cityId) || [];

    // Calculate workforce (adults only)
    const workforceGroups = groups.filter(g => g.ageGroup === AgeGroup.ADULT);
    const totalWorkforce = workforceGroups.reduce((sum, g) => sum + g.count, 0);

    // Calculate employment by skill
    const laborSupply = new Map<SkillCategory, number>();
    for (const skill of Object.values(SkillCategory)) {
      const count = workforceGroups
        .filter(g => g.skillCategory === skill)
        .reduce((sum, g) => sum + g.count, 0);
      laborSupply.set(skill as SkillCategory, count);
    }

    // FIXED: Use actual city reference
    const city = this.findCity(cityId);
    const employmentRate = city ? (1 - city.economy.unemployment) : 0.85;
    const employed = Math.floor(totalWorkforce * employmentRate);
    const unemployed = totalWorkforce - employed;

    const laborDemand = new Map<SkillCategory, number>();
    for (const [skill, supply] of laborSupply) {
      laborDemand.set(skill, Math.floor(supply * employmentRate));
    }

    const avgWage = city ? city.economy.gdpPerCapita / 12 : 3000;

    this.laborMarkets.set(cityId, {
      totalWorkforce,
      employed,
      unemployed,
      unemploymentRate: unemployed / Math.max(1, totalWorkforce),
      laborDemand,
      laborSupply,
      averageWage: avgWage
    });
  }

  /**
   * Find city by ID
   * FIXED: Now returns actual city instance from registry
   */
  private findCity(cityId: string): PlanetaryCity | null {
    return this.cityRegistry.get(cityId) || null;
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    // Remove migration events older than 30 days
    const cutoff = this.currentTime - (30 * 86400);
    this.migrationEvents = this.migrationEvents.filter(e => e.timestamp > cutoff);

    // Remove completed unrest events
    for (const [cityId, events] of this.unrestEvents) {
      const active = events.filter(e => this.currentTime < e.startTime + e.duration * 3600);
      this.unrestEvents.set(cityId, active);
    }
  }

  /**
   * Get population statistics for a city
   */
  getCityStatistics(cityId: string): {
    totalPopulation: number;
    averageHappiness: number;
    averageHealth: number;
    demographics: Map<AgeGroup, number>;
    skills: Map<SkillCategory, number>;
    activeUnrest: SocialUnrest[];
    recentMigration: { incoming: number; outgoing: number };
  } {
    const groups = this.cityPopulations.get(cityId) || [];
    const totalPop = groups.reduce((sum, g) => sum + g.count, 0);

    const avgHappiness = totalPop > 0
      ? groups.reduce((sum, g) => sum + g.happiness * g.count, 0) / totalPop
      : 0.5;

    const avgHealth = totalPop > 0
      ? groups.reduce((sum, g) => sum + g.health * g.count, 0) / totalPop
      : 0.5;

    const demographics = new Map<AgeGroup, number>();
    const skills = new Map<SkillCategory, number>();

    for (const age of Object.values(AgeGroup)) {
      const count = groups.filter(g => g.ageGroup === age).reduce((sum, g) => sum + g.count, 0);
      demographics.set(age as AgeGroup, count);
    }

    for (const skill of Object.values(SkillCategory)) {
      const count = groups.filter(g => g.skillCategory === skill).reduce((sum, g) => sum + g.count, 0);
      skills.set(skill as SkillCategory, count);
    }

    const activeUnrest = (this.unrestEvents.get(cityId) || []).filter(
      e => this.currentTime < e.startTime + e.duration * 3600
    );

    const recent = this.migrationEvents.filter(
      e => e.timestamp > this.currentTime - 86400 * 7 // Last 7 days
    );
    const incoming = recent.filter(e => e.toCityId === cityId).reduce((sum, e) => sum + e.count, 0);
    const outgoing = recent.filter(e => e.fromCityId === cityId).reduce((sum, e) => sum + e.count, 0);

    return {
      totalPopulation: totalPop,
      averageHappiness: avgHappiness,
      averageHealth: avgHealth,
      demographics,
      skills,
      activeUnrest,
      recentMigration: { incoming, outgoing }
    };
  }

  /**
   * Get labor market for a city
   */
  getLaborMarket(cityId: string): LaborMarket | null {
    return this.laborMarkets.get(cityId) || null;
  }

  /**
   * Get all citizen groups for a city
   */
  getCityGroups(cityId: string): CitizenGroup[] {
    return this.cityPopulations.get(cityId) || [];
  }

  /**
   * Get recent migration events
   */
  getRecentMigrations(limit: number = 100): MigrationEvent[] {
    return this.migrationEvents.slice(-limit);
  }

  /**
   * Get active unrest events
   */
  getActiveUnrest(): Map<string, SocialUnrest[]> {
    const active = new Map<string, SocialUnrest[]>();

    for (const [cityId, events] of this.unrestEvents) {
      const activeEvents = events.filter(e => this.currentTime < e.startTime + e.duration * 3600);
      if (activeEvents.length > 0) {
        active.set(cityId, activeEvents);
      }
    }

    return active;
  }

  /**
   * Handle city being destroyed/removed
   */
  removeCityPopulation(cityId: string): void {
    const groups = this.cityPopulations.get(cityId) || [];

    // Remove all citizen groups
    for (const group of groups) {
      this.citizenGroups.delete(group.id);
    }

    // Clean up all city data
    this.cityPopulations.delete(cityId);
    this.laborMarkets.delete(cityId);
    this.unrestEvents.delete(cityId);
    this.cityRegistry.delete(cityId);
  }

  // ====================================================================
  // SAVE/LOAD SUPPORT
  // ====================================================================

  /**
   * Serialize system state for saving
   */
  serialize(): import('./SaveFileFormat').PopulationSystemState {
    // Serialize citizen groups
    const citizenGroups = Array.from(this.citizenGroups.values()).map(group => ({
      id: group.id,
      cityId: group.cityId,
      count: group.count,
      ageGroup: group.ageGroup,
      skillCategory: group.skillCategory,
      happiness: group.happiness,
      health: group.health,
      education: group.education,
      wealth: group.wealth,
      needs: { ...group.needs },
      politicalEngagement: group.politicalEngagement,
      crimePropensity: group.crimePropensity,
      migrationDesire: group.migrationDesire
    }));

    // Serialize city populations
    const cityPopulations: Array<{ cityId: string; groupIds: string[] }> = [];
    for (const [cityId, groups] of this.cityPopulations.entries()) {
      cityPopulations.push({
        cityId,
        groupIds: groups.map(g => g.id)
      });
    }

    // Serialize migration events
    const migrationEvents = this.migrationEvents.map(event => ({
      fromCityId: event.fromCityId,
      toCityId: event.toCityId,
      citizenGroupId: event.citizenGroupId,
      count: event.count,
      reason: event.reason,
      timestamp: event.timestamp
    }));

    // Serialize unrest events
    const unrestEvents: Array<{ cityId: string; unrest: import('./SaveFileFormat').SerializedSocialUnrest[] }> = [];
    for (const [cityId, events] of this.unrestEvents.entries()) {
      const unrest = events.map(e => ({
        cityId: e.cityId,
        severity: e.severity,
        type: e.type,
        participants: e.participants,
        demands: [...e.demands],
        startTime: e.startTime,
        duration: e.duration,
        economicImpact: e.economicImpact
      }));
      unrestEvents.push({ cityId, unrest });
    }

    // Serialize labor markets
    const laborMarkets: Array<{ cityId: string; market: import('./SaveFileFormat').SerializedLaborMarket }> = [];
    for (const [cityId, market] of this.laborMarkets.entries()) {
      const serializedMarket: import('./SaveFileFormat').SerializedLaborMarket = {
        totalWorkforce: market.totalWorkforce,
        employed: market.employed,
        unemployed: market.unemployed,
        unemploymentRate: market.unemploymentRate,
        laborDemand: Array.from(market.laborDemand.entries()).map(([skill, count]) => ({ skill, count })),
        laborSupply: Array.from(market.laborSupply.entries()).map(([skill, count]) => ({ skill, count })),
        averageWage: market.averageWage
      };
      laborMarkets.push({ cityId, market: serializedMarket });
    }

    return {
      citizenGroups,
      cityPopulations,
      migrationEvents,
      unrestEvents,
      laborMarkets,
      currentTime: this.currentTime
    };
  }

  /**
   * Deserialize and restore system state
   */
  deserialize(state: import('./SaveFileFormat').PopulationSystemState): void {
    console.log('[PopulationSystem] Deserializing state...');

    // Clear existing state
    this.citizenGroups.clear();
    this.cityPopulations.clear();
    this.migrationEvents = [];
    this.unrestEvents.clear();
    this.laborMarkets.clear();

    // Restore citizen groups
    for (const serializedGroup of state.citizenGroups) {
      const group: CitizenGroup = {
        id: serializedGroup.id,
        cityId: serializedGroup.cityId,
        count: serializedGroup.count,
        ageGroup: serializedGroup.ageGroup,
        skillCategory: serializedGroup.skillCategory,
        happiness: serializedGroup.happiness,
        health: serializedGroup.health,
        education: serializedGroup.education,
        wealth: serializedGroup.wealth,
        needs: { ...serializedGroup.needs },
        politicalEngagement: serializedGroup.politicalEngagement,
        crimePropensity: serializedGroup.crimePropensity,
        migrationDesire: serializedGroup.migrationDesire
      };
      this.citizenGroups.set(group.id, group);
    }

    // Restore city populations
    for (const { cityId, groupIds } of state.cityPopulations) {
      const groups: CitizenGroup[] = [];
      for (const groupId of groupIds) {
        const group = this.citizenGroups.get(groupId);
        if (group) {
          groups.push(group);
        }
      }
      this.cityPopulations.set(cityId, groups);
    }

    // Restore migration events
    this.migrationEvents = state.migrationEvents.map(event => ({
      fromCityId: event.fromCityId,
      toCityId: event.toCityId,
      citizenGroupId: event.citizenGroupId,
      count: event.count,
      reason: event.reason,
      timestamp: event.timestamp
    }));

    // Restore unrest events
    for (const { cityId, unrest } of state.unrestEvents) {
      const events: SocialUnrest[] = unrest.map(e => ({
        cityId: e.cityId,
        severity: e.severity,
        type: e.type,
        participants: e.participants,
        demands: [...e.demands],
        startTime: e.startTime,
        duration: e.duration,
        economicImpact: e.economicImpact
      }));
      this.unrestEvents.set(cityId, events);
    }

    // Restore labor markets
    for (const { cityId, market } of state.laborMarkets) {
      const laborMarket: LaborMarket = {
        totalWorkforce: market.totalWorkforce,
        employed: market.employed,
        unemployed: market.unemployed,
        unemploymentRate: market.unemploymentRate,
        laborDemand: new Map(market.laborDemand.map(({ skill, count }) => [skill, count])),
        laborSupply: new Map(market.laborSupply.map(({ skill, count }) => [skill, count])),
        averageWage: market.averageWage
      };
      this.laborMarkets.set(cityId, laborMarket);
    }

    // Restore time
    this.currentTime = state.currentTime;

    console.log(`[PopulationSystem] Restored ${this.citizenGroups.size} citizen groups across ${this.cityPopulations.size} cities`);
  }
}
