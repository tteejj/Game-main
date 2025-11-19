/**
 * FactionResearchAI.ts
 * Intelligent AI system that automatically selects research priorities for factions
 * based on their current situation, needs, and strategic goals
 */

import { ResearchSystem, Technology, TechCategory, TechTree, CompletedResearch } from '../ResearchSystem';
import { Faction } from '../FactionSystem';

export interface FactionState {
  factionId: string;
  isAtWar: boolean;
  numberOfWars: number;
  isExpanding: boolean;
  territoryCount: number;
  economicHealth: number;        // 0-1 (0 = poor, 1 = excellent)
  militaryStrength: number;      // Relative to enemies
  technologyLevel: number;       // Average tech tier
  threatLevel: number;           // How threatened the faction feels (0-1)
  diplomacyCount: number;        // Number of active diplomatic relations
  explorationNeeds: number;      // How much they need to explore (0-1)
}

export interface ResearchPriority {
  category: TechCategory;
  weight: number;                // 0-1 (importance of this category)
}

export interface ResearchDecision {
  selectedTechId: string;
  selectedTech: Technology;
  reasoning: string;
  priorities: ResearchPriority[];
}

/**
 * FactionResearchAI - Makes intelligent research decisions for factions
 */
export class FactionResearchAI {
  private researchSystem: ResearchSystem;
  private lastDecisionTime: Map<string, number> = new Map();
  private decisionCooldown: number = 60; // Minimum seconds between decisions

  constructor(researchSystem: ResearchSystem) {
    this.researchSystem = researchSystem;
  }

  /**
   * Main method: Evaluate and select next research for a faction
   */
  selectNextResearch(
    faction: Faction,
    state: FactionState,
    currentTime: number
  ): ResearchDecision | null {
    // Check if we're on cooldown
    const lastDecision = this.lastDecisionTime.get(faction.id) || 0;
    if (currentTime - lastDecision < this.decisionCooldown) {
      return null;
    }

    // Check if faction already has active research
    const activeResearch = this.researchSystem.getActiveResearch(faction.id);
    if (activeResearch.length > 0) {
      // Already researching something
      return null;
    }

    // Get available technologies
    const availableTechs = this.researchSystem.getAvailableTechnologies(faction.id);
    if (availableTechs.length === 0) {
      // No technologies available (all researched or prerequisites not met)
      return null;
    }

    // Calculate research priorities based on faction state
    const priorities = this.calculatePriorities(faction, state);

    // Score and select the best technology
    const decision = this.selectBestTechnology(availableTechs, priorities, faction, state);

    if (decision) {
      // Start the research
      const success = this.researchSystem.startResearch(faction.id, decision.selectedTechId, currentTime);
      if (success) {
        this.lastDecisionTime.set(faction.id, currentTime);
        return decision;
      }
    }

    return null;
  }

  /**
   * Calculate research priorities based on faction state
   */
  private calculatePriorities(faction: Faction, state: FactionState): ResearchPriority[] {
    const priorities: ResearchPriority[] = [];

    // === WEAPONS PRIORITY ===
    let weaponsPriority = 0.2; // Base priority

    if (state.isAtWar) {
      // At war - weapons are critical
      weaponsPriority += 0.4 + (state.numberOfWars * 0.1);
    }

    if (state.threatLevel > 0.5) {
      // Feeling threatened - prepare for war
      weaponsPriority += state.threatLevel * 0.3;
    }

    if (state.militaryStrength < 0.5) {
      // Militarily weak - need better weapons
      weaponsPriority += (0.5 - state.militaryStrength) * 0.4;
    }

    if (faction.ideology.militaristic > 0.6) {
      // Militaristic faction - always prioritize weapons
      weaponsPriority += faction.ideology.militaristic * 0.2;
    }

    priorities.push({
      category: 'WEAPONS',
      weight: Math.min(1.0, weaponsPriority),
    });

    // === DEFENSE PRIORITY ===
    let defensePriority = 0.15; // Base priority

    if (state.isAtWar && state.militaryStrength < 0.7) {
      // At war and not winning - need defense
      defensePriority += 0.35;
    }

    if (state.threatLevel > 0.6) {
      // Under threat - boost defenses
      defensePriority += state.threatLevel * 0.3;
    }

    if (state.territoryCount > 5) {
      // Large territory to defend
      defensePriority += Math.min(state.territoryCount / 20, 0.2);
    }

    if (faction.ideology.militaristic < 0.3) {
      // Peaceful faction - prefer defense over offense
      defensePriority += 0.2;
    }

    priorities.push({
      category: 'DEFENSE',
      weight: Math.min(1.0, defensePriority),
    });

    // === ECONOMY PRIORITY ===
    let economyPriority = 0.3; // Base priority (always important)

    if (state.economicHealth < 0.4) {
      // Poor economy - critical to fix
      economyPriority += (0.4 - state.economicHealth) * 0.5;
    }

    if (faction.government === 'CORPORATE') {
      // Corporations love economy
      economyPriority += 0.25;
    }

    if (faction.ideology.economic > 0.5) {
      // Free market ideology - boost economy
      economyPriority += faction.ideology.economic * 0.2;
    }

    if (!state.isAtWar && state.threatLevel < 0.3) {
      // Peaceful times - focus on growth
      economyPriority += 0.2;
    }

    if (state.isExpanding) {
      // Expanding needs economic support
      economyPriority += 0.15;
    }

    priorities.push({
      category: 'ECONOMY',
      weight: Math.min(1.0, economyPriority),
    });

    // === PROPULSION PRIORITY ===
    let propulsionPriority = 0.2; // Base priority

    if (state.isExpanding) {
      // Expanding - need better ships
      propulsionPriority += 0.3;
    }

    if (faction.ideology.expansionist > 0.6) {
      // Expansionist faction - always want better engines
      propulsionPriority += faction.ideology.expansionist * 0.25;
    }

    if (state.territoryCount < 3) {
      // Small faction - need to expand
      propulsionPriority += 0.2;
    }

    if (state.explorationNeeds > 0.5) {
      // Need to explore more space
      propulsionPriority += state.explorationNeeds * 0.2;
    }

    priorities.push({
      category: 'PROPULSION',
      weight: Math.min(1.0, propulsionPriority),
    });

    // === EXPLORATION PRIORITY ===
    let explorationPriority = 0.15; // Base priority

    if (state.explorationNeeds > 0.6) {
      // High exploration needs
      explorationPriority += state.explorationNeeds * 0.3;
    }

    if (faction.ideology.technological > 0.7) {
      // Tech-focused factions like exploration
      explorationPriority += 0.2;
    }

    if (state.isAtWar) {
      // At war - intel is valuable
      explorationPriority += 0.25;
    }

    if (state.territoryCount < 2) {
      // Small faction - need to find opportunities
      explorationPriority += 0.2;
    }

    if (faction.government === 'CORPORATE') {
      // Corporations want to find resources
      explorationPriority += 0.15;
    }

    priorities.push({
      category: 'EXPLORATION',
      weight: Math.min(1.0, explorationPriority),
    });

    return priorities;
  }

  /**
   * Select the best technology from available options
   */
  private selectBestTechnology(
    availableTechs: Technology[],
    priorities: ResearchPriority[],
    faction: Faction,
    state: FactionState
  ): ResearchDecision | null {
    if (availableTechs.length === 0) return null;

    let bestTech: Technology | null = null;
    let bestScore = -1;
    let bestReasoning = '';

    for (const tech of availableTechs) {
      const score = this.scoreTechnology(tech, priorities, faction, state);

      if (score.totalScore > bestScore) {
        bestScore = score.totalScore;
        bestTech = tech;
        bestReasoning = score.reasoning;
      }
    }

    if (!bestTech) return null;

    return {
      selectedTechId: bestTech.id,
      selectedTech: bestTech,
      reasoning: bestReasoning,
      priorities,
    };
  }

  /**
   * Score a technology based on current priorities and faction needs
   */
  private scoreTechnology(
    tech: Technology,
    priorities: ResearchPriority[],
    faction: Faction,
    state: FactionState
  ): { totalScore: number; reasoning: string } {
    let score = 0;
    const reasons: string[] = [];

    // Category priority score (40% of total)
    const categoryPriority = priorities.find(p => p.category === tech.category);
    const categoryScore = (categoryPriority?.weight || 0.1) * 40;
    score += categoryScore;
    reasons.push(`${tech.category} priority: ${categoryPriority?.weight.toFixed(2)}`);

    // Tier appropriateness (20% of total)
    // Prefer technologies close to current average tier
    const avgTier = state.technologyLevel;
    const tierDiff = Math.abs(tech.tier - avgTier);
    const tierScore = Math.max(0, 20 - (tierDiff * 5));
    score += tierScore;
    reasons.push(`Tier ${tech.tier} appropriateness: ${tierScore.toFixed(1)}`);

    // Cost efficiency (15% of total)
    // Prefer cheaper techs when economy is weak, expensive when strong
    const normalizedCost = tech.researchCost / 1000; // Normalize to 0-4 range
    let costScore = 15;
    if (state.economicHealth < 0.5 && normalizedCost > 2) {
      // Poor economy, expensive tech - penalize
      costScore -= (normalizedCost - 2) * 5;
    } else if (state.economicHealth > 0.7 && normalizedCost > 2) {
      // Rich economy, expensive tech - bonus (likely powerful)
      costScore += (normalizedCost - 2) * 2;
    }
    score += Math.max(0, costScore);
    reasons.push(`Cost efficiency: ${costScore.toFixed(1)}`);

    // Unlock value (25% of total)
    let unlockScore = 0;

    if (state.isAtWar || state.threatLevel > 0.5) {
      // Combat situation - value combat unlocks
      if (tech.unlocks.weaponDamage) unlockScore += 10;
      if (tech.unlocks.weaponRange) unlockScore += 5;
      if (tech.unlocks.shieldStrength) unlockScore += 8;
      if (tech.unlocks.armorRating) unlockScore += 6;
      if (tech.unlocks.specialAbilities?.some(a =>
        a.includes('defense') || a.includes('shield') || a.includes('weapon')))
        unlockScore += 7;
    }

    if (state.isExpanding || faction.ideology.expansionist > 0.5) {
      // Expansion situation - value mobility and economy
      if (tech.unlocks.engineSpeed) unlockScore += 8;
      if (tech.unlocks.jumpRange) unlockScore += 10;
      if (tech.unlocks.economicOutput) unlockScore += 7;
      if (tech.unlocks.newShipTypes) unlockScore += 6;
    }

    if (state.economicHealth < 0.5) {
      // Economic crisis - value economic unlocks highly
      if (tech.unlocks.economicOutput) unlockScore += 12;
      if (tech.unlocks.miningEfficiency) unlockScore += 8;
      if (tech.unlocks.tradeBonus) unlockScore += 6;
    }

    if (faction.ideology.technological > 0.6) {
      // Tech-focused - value research speed
      if (tech.unlocks.researchSpeed) unlockScore += 15;
      if (tech.unlocks.sensorRange) unlockScore += 5;
    }

    score += Math.min(25, unlockScore);
    reasons.push(`Unlock value: ${unlockScore.toFixed(1)}`);

    // Strategic value based on special abilities
    if (tech.unlocks.specialAbilities) {
      const strategicBonus = this.evaluateSpecialAbilities(
        tech.unlocks.specialAbilities,
        state
      );
      score += strategicBonus;
      if (strategicBonus > 0) {
        reasons.push(`Strategic abilities: +${strategicBonus.toFixed(1)}`);
      }
    }

    // Government type preferences
    const govBonus = this.evaluateGovernmentFit(tech, faction);
    score += govBonus;
    if (govBonus > 0) {
      reasons.push(`Government fit: +${govBonus.toFixed(1)}`);
    }

    return {
      totalScore: score,
      reasoning: `${tech.name}: ${reasons.join(', ')} = ${score.toFixed(1)} total`,
    };
  }

  /**
   * Evaluate the value of special abilities in current context
   */
  private evaluateSpecialAbilities(abilities: string[], state: FactionState): number {
    let bonus = 0;

    for (const ability of abilities) {
      // Combat abilities
      if (state.isAtWar || state.threatLevel > 0.6) {
        if (ability.includes('weapon') || ability.includes('damage')) bonus += 3;
        if (ability.includes('shield') || ability.includes('defense')) bonus += 2.5;
        if (ability.includes('immunity') || ability.includes('invuln')) bonus += 4;
      }

      // Exploration abilities
      if (state.explorationNeeds > 0.5) {
        if (ability.includes('scan') || ability.includes('sensor')) bonus += 2;
        if (ability.includes('cloak') || ability.includes('stealth')) bonus += 2.5;
        if (ability.includes('vision') || ability.includes('detect')) bonus += 2;
      }

      // Economic abilities
      if (state.economicHealth < 0.5) {
        if (ability.includes('efficiency') || ability.includes('production')) bonus += 3;
        if (ability.includes('energy') || ability.includes('resource')) bonus += 2.5;
      }

      // Expansion abilities
      if (state.isExpanding) {
        if (ability.includes('jump') || ability.includes('travel')) bonus += 2.5;
        if (ability.includes('construction') || ability.includes('build')) bonus += 2;
      }

      // Universal high-value abilities
      if (ability.includes('omniscient') || ability.includes('perfect')) bonus += 5;
      if (ability.includes('transcendent') || ability.includes('reality')) bonus += 4.5;
      if (ability.includes('dimension') || ability.includes('time')) bonus += 4;
    }

    return bonus;
  }

  /**
   * Evaluate how well a technology fits the faction's government type
   */
  private evaluateGovernmentFit(tech: Technology, faction: Faction): number {
    let bonus = 0;

    switch (faction.government) {
      case 'MILITARY':
        if (tech.category === 'WEAPONS') bonus += 3;
        if (tech.category === 'DEFENSE') bonus += 2;
        if (tech.unlocks.newShipTypes) bonus += 2;
        break;

      case 'CORPORATE':
        if (tech.category === 'ECONOMY') bonus += 4;
        if (tech.unlocks.tradeBonus) bonus += 2;
        if (tech.unlocks.miningEfficiency) bonus += 2;
        break;

      case 'DEMOCRACY':
        // Balanced approach - slight bonus to all
        bonus += 0.5;
        if (tech.category === 'EXPLORATION') bonus += 1;
        break;

      case 'AUTOCRACY':
        // Efficiency and control
        if (tech.unlocks.researchSpeed) bonus += 2;
        if (tech.category === 'WEAPONS' || tech.category === 'DEFENSE') bonus += 1.5;
        break;

      case 'THEOCRACY':
        // Traditional but strategic
        if (tech.tier <= 3) bonus += 1; // Prefer lower tier (more traditional)
        if (tech.category === 'DEFENSE') bonus += 2;
        break;

      case 'ANARCHY':
        // Chaotic - prefer unpredictable/powerful techs
        if (tech.unlocks.specialAbilities && tech.unlocks.specialAbilities.length > 0) bonus += 2;
        if (tech.tier >= 4) bonus += 1.5; // Like advanced chaos
        break;
    }

    return bonus;
  }

  /**
   * Handle research completion event - apply bonuses and evaluate next steps
   */
  onResearchComplete(
    faction: Faction,
    completedResearch: CompletedResearch,
    currentTime: number,
    factionShips?: any[],
    factionStations?: any[],
    manufacturingSystem?: any
  ): void {
    const tech = TechTree.getTechnology(completedResearch.techId);
    if (!tech) return;

    // Log the completion
    console.log(
      `[ResearchAI] ${faction.name} completed research: ${tech.name} (Tier ${tech.tier})`
    );

    // Apply faction-level bonuses using ResearchSystem
    this.researchSystem.applyBonusesToFaction(faction, faction.id);
    console.log(`[ResearchAI] Applied faction-level bonuses to ${faction.name}`);

    // Update all faction ships with new bonuses
    if (factionShips && factionShips.length > 0) {
      console.log(`[ResearchAI] Updating ${factionShips.length} ships with new tech bonuses...`);
      for (const ship of factionShips) {
        try {
          this.researchSystem.applyBonusesToShip(ship, faction.id);
        } catch (error) {
          console.error(`[ResearchAI] Failed to apply bonuses to ship ${ship.id}:`, error);
        }
      }
      console.log(`[ResearchAI] Ship upgrades complete`);
    }

    // Update all faction stations with new bonuses
    if (factionStations && factionStations.length > 0) {
      console.log(`[ResearchAI] Updating ${factionStations.length} stations with new tech bonuses...`);
      for (const station of factionStations) {
        try {
          this.researchSystem.applyBonusesToStation(station, faction.id);
        } catch (error) {
          console.error(`[ResearchAI] Failed to apply bonuses to station ${station.id}:`, error);
        }
      }
      console.log(`[ResearchAI] Station upgrades complete`);
    }

    // Enable newly unlocked manufacturing recipes
    if (manufacturingSystem && tech.unlocks.newBuildingTypes) {
      this.enableNewManufacturingRecipes(faction, tech, manufacturingSystem);
    }

    // Clear cooldown to immediately consider next research
    this.lastDecisionTime.set(faction.id, currentTime - this.decisionCooldown);

    // Log summary of what was unlocked
    this.logResearchUnlocks(faction, tech);
  }


  /**
   * Evaluate faction state from faction and game data
   * This is a helper to build FactionState from various game systems
   */
  static buildFactionState(
    faction: Faction,
    wars: number,
    expanding: boolean,
    economicHealth: number,
    relativeStrength: number,
    threatLevel: number
  ): FactionState {
    return {
      factionId: faction.id,
      isAtWar: wars > 0,
      numberOfWars: wars,
      isExpanding: expanding,
      territoryCount: faction.territory.length,
      economicHealth: Math.max(0, Math.min(1, economicHealth)),
      militaryStrength: Math.max(0, Math.min(1, relativeStrength)),
      technologyLevel: faction.technology,
      threatLevel: Math.max(0, Math.min(1, threatLevel)),
      diplomacyCount: 0, // Would be filled from diplomacy system
      explorationNeeds: expanding ? 0.7 : 0.3,
    };
  }

  /**
   * Get a summary of faction's research status
   */
  getResearchStatus(factionId: string): {
    currentResearch: string | null;
    completedCount: number;
    availableCount: number;
    techLevel: number;
  } {
    const active = this.researchSystem.getActiveResearch(factionId);
    const completed = this.researchSystem.getCompletedResearch(factionId);
    const available = this.researchSystem.getAvailableTechnologies(factionId);

    const currentResearch = active.length > 0
      ? TechTree.getTechnology(active[0].techId)?.name || null
      : null;

    const tierCounts = completed.reduce((acc, cr) => {
      const tech = TechTree.getTechnology(cr.techId);
      if (tech) acc += tech.tier;
      return acc;
    }, 0);

    const avgTier = completed.length > 0 ? tierCounts / completed.length : 0;

    return {
      currentResearch,
      completedCount: completed.length,
      availableCount: available.length,
      techLevel: Math.floor(avgTier * 10) / 10,
    };
  }

  /**
   * Force a research decision (used for testing or manual control)
   */
  forceResearch(factionId: string, techId: string, currentTime: number): boolean {
    return this.researchSystem.startResearch(factionId, techId, currentTime);
  }

  /**
   * Enable newly unlocked manufacturing recipes at faction stations
   */
  private enableNewManufacturingRecipes(
    faction: Faction,
    tech: Technology,
    manufacturingSystem: any
  ): void {
    if (!tech.unlocks.newBuildingTypes) return;

    console.log(
      `[ResearchAI] Enabling new manufacturing capabilities for ${faction.name}:`,
      tech.unlocks.newBuildingTypes
    );

    // Get all unlocked building types
    const unlockedBuildings = this.researchSystem.getUnlockedBuildingTypes(faction.id);

    // Map building types to facility types and recipes
    for (const building of tech.unlocks.newBuildingTypes) {
      const facilityType = this.mapBuildingToFacilityType(building);
      if (facilityType) {
        console.log(`[ResearchAI] ${faction.name} can now build ${facilityType} facilities`);
        // The actual facility creation would happen when stations are built/upgraded
        // This just logs the capability
      }

      // Check if this unlocks any specific recipes
      const unlockedRecipes = this.getRecipesUnlockedByBuilding(building);
      if (unlockedRecipes.length > 0) {
        console.log(
          `[ResearchAI] ${faction.name} unlocked ${unlockedRecipes.length} new production recipes`
        );
      }
    }
  }

  /**
   * Map building type to manufacturing facility type
   */
  private mapBuildingToFacilityType(building: string): string | null {
    const mapping: { [key: string]: string } = {
      'automated_factory': 'FACTORY',
      'shield_generator': 'ELECTRONICS_PLANT',
      'point_defense_grid': 'FACTORY',
      'orbital_ring': 'SHIPYARD',
      'space_elevator': 'FACTORY',
      'mega_shipyard': 'SHIPYARD',
      'dyson_sphere': 'REFINERY',
      'stellar_forge': 'FOUNDRY'
    };

    return mapping[building] || null;
  }

  /**
   * Get production recipes unlocked by a building type
   */
  private getRecipesUnlockedByBuilding(building: string): string[] {
    const recipeMapping: { [key: string]: string[] } = {
      'automated_factory': ['manufacture_machinery', 'manufacture_tools'],
      'shield_generator': ['manufacture_shield_generators'],
      'mega_shipyard': ['manufacture_ship_components'],
      'dyson_sphere': ['produce_fusion_pellets'],
      'stellar_forge': ['produce_carbon_fiber']
    };

    return recipeMapping[building] || [];
  }

  /**
   * Log summary of research unlocks
   */
  private logResearchUnlocks(faction: Faction, tech: Technology): void {
    console.log(`\n=== ${faction.name} RESEARCH COMPLETE: ${tech.name} ===`);

    const bonuses = tech.unlocks;
    const changes: string[] = [];

    // Multiplier bonuses
    if (bonuses.weaponDamage) changes.push(`Weapon Damage: +${((bonuses.weaponDamage - 1) * 100).toFixed(0)}%`);
    if (bonuses.weaponRange) changes.push(`Weapon Range: +${((bonuses.weaponRange - 1) * 100).toFixed(0)}%`);
    if (bonuses.weaponAccuracy) changes.push(`Weapon Accuracy: +${((bonuses.weaponAccuracy - 1) * 100).toFixed(0)}%`);
    if (bonuses.engineSpeed) changes.push(`Engine Speed: +${((bonuses.engineSpeed - 1) * 100).toFixed(0)}%`);
    if (bonuses.fuelEfficiency) changes.push(`Fuel Efficiency: +${((bonuses.fuelEfficiency - 1) * 100).toFixed(0)}%`);
    if (bonuses.jumpRange) changes.push(`Jump Range: +${((bonuses.jumpRange - 1) * 100).toFixed(0)}%`);
    if (bonuses.economicOutput) changes.push(`Economic Output: +${((bonuses.economicOutput - 1) * 100).toFixed(0)}%`);
    if (bonuses.tradeBonus) changes.push(`Trade Bonus: +${((bonuses.tradeBonus - 1) * 100).toFixed(0)}%`);
    if (bonuses.miningEfficiency) changes.push(`Mining Efficiency: +${((bonuses.miningEfficiency - 1) * 100).toFixed(0)}%`);
    if (bonuses.shieldStrength) changes.push(`Shield Strength: +${((bonuses.shieldStrength - 1) * 100).toFixed(0)}%`);
    if (bonuses.armorRating) changes.push(`Armor Rating: +${((bonuses.armorRating - 1) * 100).toFixed(0)}%`);
    if (bonuses.hullPoints) changes.push(`Hull Points: +${((bonuses.hullPoints - 1) * 100).toFixed(0)}%`);
    if (bonuses.sensorRange) changes.push(`Sensor Range: +${((bonuses.sensorRange - 1) * 100).toFixed(0)}%`);
    if (bonuses.stealthRating) changes.push(`Stealth Rating: +${((bonuses.stealthRating - 1) * 100).toFixed(0)}%`);
    if (bonuses.researchSpeed) changes.push(`Research Speed: +${((bonuses.researchSpeed - 1) * 100).toFixed(0)}%`);

    // Unlocks
    if (bonuses.newShipTypes) {
      changes.push(`NEW SHIPS: ${bonuses.newShipTypes.join(', ')}`);
    }
    if (bonuses.newWeaponTypes) {
      changes.push(`NEW WEAPONS: ${bonuses.newWeaponTypes.join(', ')}`);
    }
    if (bonuses.newBuildingTypes) {
      changes.push(`NEW BUILDINGS: ${bonuses.newBuildingTypes.join(', ')}`);
    }
    if (bonuses.specialAbilities) {
      changes.push(`SPECIAL ABILITIES: ${bonuses.specialAbilities.join(', ')}`);
    }

    if (changes.length > 0) {
      console.log('BONUSES APPLIED:');
      for (const change of changes) {
        console.log(`  - ${change}`);
      }
    }

    // Show cumulative progress
    const completed = this.researchSystem.getCompletedResearch(faction.id);
    const tierProgress = this.researchSystem.getTechProgress(faction.id);
    console.log(`\nTOTAL RESEARCH: ${completed.length} technologies completed`);
    console.log(`TIER PROGRESS: T1:${tierProgress[1]} T2:${tierProgress[2]} T3:${tierProgress[3]} T4:${tierProgress[4]} T5:${tierProgress[5]}`);
    console.log('==========================================\n');
  }

  /**
   * Update all ships for a faction with latest tech bonuses
   * Use this when ships need to be retroactively upgraded
   */
  updateAllFactionShips(faction: Faction, ships: any[]): void {
    console.log(`[ResearchAI] Retroactively applying tech bonuses to ${ships.length} ships...`);
    for (const ship of ships) {
      try {
        this.researchSystem.applyBonusesToShip(ship, faction.id);
      } catch (error) {
        console.error(`[ResearchAI] Failed to apply bonuses to ship ${ship.id}:`, error);
      }
    }
    console.log(`[ResearchAI] Ship tech upgrade complete`);
  }

  /**
   * Update all stations for a faction with latest tech bonuses
   */
  updateAllFactionStations(faction: Faction, stations: any[]): void {
    console.log(`[ResearchAI] Retroactively applying tech bonuses to ${stations.length} stations...`);
    for (const station of stations) {
      try {
        this.researchSystem.applyBonusesToStation(station, faction.id);
      } catch (error) {
        console.error(`[ResearchAI] Failed to apply bonuses to station ${station.id}:`, error);
      }
    }
    console.log(`[ResearchAI] Station tech upgrade complete`);
  }

  /**
   * Get tech-modified ship template for spawning new ships
   */
  getUpgradedShipTemplate(faction: Faction, shipType: string): any {
    return this.researchSystem.getShipTemplate(shipType, faction.id);
  }

  /**
   * Check if faction can build a specific ship type
   */
  canBuildShipType(faction: Faction, shipType: string): boolean {
    return this.researchSystem.hasShipTypeUnlocked(faction.id, shipType);
  }

  /**
   * Get all ship types available to faction
   */
  getAvailableShipTypes(faction: Faction): string[] {
    return this.researchSystem.getUnlockedShipTypes(faction.id);
  }

  /**
   * Get all weapon types available to faction
   */
  getAvailableWeaponTypes(faction: Faction): string[] {
    return this.researchSystem.getUnlockedWeaponTypes(faction.id);
  }

  /**
   * Get faction's cumulative research bonuses
   */
  getFactionBonuses(faction: Faction): any {
    return this.researchSystem.calculateCumulativeBonuses(faction.id);
  }
}
