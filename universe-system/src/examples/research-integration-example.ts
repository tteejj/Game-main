/**
 * research-integration-example.ts
 * Example showing how to integrate the Research System into your game
 */

import { ResearchSystem, TechTree, Technology } from '../ResearchSystem';
import { FactionResearchAI, FactionState } from '../faction-dynamics/FactionResearchAI';
import { Faction } from '../FactionSystem';

/**
 * Example: Complete Research System Integration
 *
 * This example demonstrates how to:
 * 1. Initialize the research system
 * 2. Set up factions with research AI
 * 3. Update research each game tick
 * 4. Apply research bonuses to gameplay
 */
export class ResearchGameIntegration {
  private researchSystem: ResearchSystem;
  private researchAI: FactionResearchAI;
  private factions: Map<string, Faction>;

  constructor() {
    this.researchSystem = new ResearchSystem();
    this.researchAI = new FactionResearchAI(this.researchSystem);
    this.factions = new Map();
  }

  /**
   * Initialize research for all factions in the game
   */
  initializeFactionResearch(factions: Faction[]): void {
    console.log('Initializing faction research systems...');

    for (const faction of factions) {
      this.factions.set(faction.id, faction);

      // Set initial research speed based on faction properties
      const baseSpeed = 1.0;
      const techBonus = faction.ideology.technological * 0.5;
      const govBonus = faction.government === 'DEMOCRACY' ? 0.2 : 0;
      const totalSpeed = baseSpeed + techBonus + govBonus;

      this.researchSystem.setFactionResearchSpeed(faction.id, totalSpeed);

      console.log(`  ${faction.name}: Research speed ${totalSpeed.toFixed(2)}x`);
    }
  }

  /**
   * Game tick update - should be called every frame or game tick
   */
  updateResearch(deltaTime: number, currentTime: number): void {
    // Update all active research projects
    const completedResearch = this.researchSystem.updateResearch(deltaTime, currentTime);

    // Handle completed research
    for (const completed of completedResearch) {
      const faction = this.factions.get(completed.factionId);
      if (!faction) continue;

      // Notify the AI system
      this.researchAI.onResearchComplete(faction, completed, currentTime);

      // Apply bonuses to game systems (examples)
      this.applyResearchBonuses(faction, completed);

      // Log for player visibility
      const tech = TechTree.getTechnology(completed.techId);
      if (tech) {
        console.log(`[RESEARCH] ${faction.name} completed: ${tech.name}`);
      }
    }
  }

  /**
   * Make research decisions for all AI factions
   * Call this periodically (e.g., every 10 seconds)
   */
  evaluateAIResearch(currentTime: number): void {
    for (const faction of this.factions.values()) {
      // Skip player faction (if applicable)
      // if (faction.isPlayer) continue;

      // Build faction state from game data
      const state = this.buildFactionState(faction, currentTime);

      // Let AI make research decision
      const decision = this.researchAI.selectNextResearch(faction, state, currentTime);

      if (decision) {
        console.log(
          `[AI] ${faction.name} starting research: ${decision.selectedTech.name} ` +
          `(${decision.selectedTech.category} Tier ${decision.selectedTech.tier})`
        );
      }
    }
  }

  /**
   * Build faction state from game data
   */
  private buildFactionState(faction: Faction, currentTime: number): FactionState {
    // In a real game, you would get this data from various game systems
    // This is a simplified example

    // Check if faction is at war (from diplomacy system)
    const wars = 0; // Get from DiplomacyEngine
    const isAtWar = wars > 0;

    // Check if expanding (from territory system)
    const recentTerritoryGain = false; // Check if territory grew recently
    const isExpanding = recentTerritoryGain || faction.ideology.expansionist > 0.7;

    // Economic health (from economy system)
    const economicHealth = Math.min(1.0, faction.economy / 200);

    // Military strength relative to enemies
    const avgEnemyStrength = 100; // Calculate from all enemies
    const militaryStrength = faction.military / avgEnemyStrength;

    // Threat level (from diplomacy + military analysis)
    let threatLevel = 0;
    if (isAtWar) threatLevel += 0.5;
    if (militaryStrength < 0.5) threatLevel += 0.3;
    // Add more threat factors...

    return FactionResearchAI.buildFactionState(
      faction,
      wars,
      isExpanding,
      economicHealth,
      militaryStrength,
      threatLevel
    );
  }

  /**
   * Apply research bonuses to actual game systems
   */
  private applyResearchBonuses(faction: Faction, completed: any): void {
    const bonuses = completed.bonusesApplied;

    // === WEAPON BONUSES ===
    if (bonuses.weaponDamage || bonuses.weaponRange || bonuses.weaponAccuracy) {
      // Apply to all faction ships
      // For each ship in faction.ships:
      //   ship.weaponDamage *= bonuses.weaponDamage || 1;
      //   ship.weaponRange *= bonuses.weaponRange || 1;
      //   ship.weaponAccuracy *= bonuses.weaponAccuracy || 1;

      console.log(`  Applied weapon bonuses to ${faction.name}'s fleet`);
    }

    // === PROPULSION BONUSES ===
    if (bonuses.engineSpeed || bonuses.fuelEfficiency || bonuses.jumpRange) {
      // Apply to all faction ships
      // For each ship in faction.ships:
      //   ship.maxSpeed *= bonuses.engineSpeed || 1;
      //   ship.fuelConsumption /= bonuses.fuelEfficiency || 1;
      //   ship.jumpRange *= bonuses.jumpRange || 1;

      console.log(`  Applied propulsion bonuses to ${faction.name}'s fleet`);
    }

    // === ECONOMIC BONUSES ===
    if (bonuses.economicOutput || bonuses.miningEfficiency || bonuses.tradeBonus) {
      // Apply to faction economy
      // faction.incomeMultiplier *= bonuses.economicOutput || 1;
      // faction.miningMultiplier *= bonuses.miningEfficiency || 1;
      // faction.tradeMultiplier *= bonuses.tradeBonus || 1;

      console.log(`  Applied economic bonuses to ${faction.name}`);
    }

    // === DEFENSE BONUSES ===
    if (bonuses.shieldStrength || bonuses.armorRating || bonuses.hullPoints) {
      // Apply to all faction ships and stations
      // For each ship/station:
      //   entity.shieldStrength *= bonuses.shieldStrength || 1;
      //   entity.armorRating *= bonuses.armorRating || 1;
      //   entity.maxHullPoints *= bonuses.hullPoints || 1;

      console.log(`  Applied defense bonuses to ${faction.name}'s assets`);
    }

    // === EXPLORATION BONUSES ===
    if (bonuses.sensorRange || bonuses.stealthRating) {
      // Apply to faction ships
      // For each ship:
      //   ship.sensorRange *= bonuses.sensorRange || 1;
      //   ship.stealthRating *= bonuses.stealthRating || 1;

      console.log(`  Applied exploration bonuses to ${faction.name}'s ships`);
    }

    // === NEW UNLOCKS ===
    if (bonuses.newShipTypes) {
      // Enable new ship types for construction
      // faction.availableShipTypes.push(...bonuses.newShipTypes);
      console.log(`  Unlocked ship types: ${bonuses.newShipTypes.join(', ')}`);
    }

    if (bonuses.newWeaponTypes) {
      // Enable new weapon types
      // faction.availableWeapons.push(...bonuses.newWeaponTypes);
      console.log(`  Unlocked weapons: ${bonuses.newWeaponTypes.join(', ')}`);
    }

    if (bonuses.newBuildingTypes) {
      // Enable new station modules
      // faction.availableBuildings.push(...bonuses.newBuildingTypes);
      console.log(`  Unlocked buildings: ${bonuses.newBuildingTypes.join(', ')}`);
    }

    if (bonuses.specialAbilities) {
      // Grant special abilities
      // faction.abilities.push(...bonuses.specialAbilities);
      console.log(`  Gained abilities: ${bonuses.specialAbilities.join(', ')}`);
    }
  }

  /**
   * Get research UI data for a faction
   */
  getResearchUIData(factionId: string): any {
    const active = this.researchSystem.getActiveResearch(factionId);
    const completed = this.researchSystem.getCompletedResearch(factionId);
    const available = this.researchSystem.getAvailableTechnologies(factionId);
    const bonuses = this.researchSystem.calculateCumulativeBonuses(factionId);
    const techProgress = this.researchSystem.getTechProgress(factionId);

    return {
      currentResearch: active.map(project => {
        const tech = TechTree.getTechnology(project.techId);
        return {
          tech,
          progress: this.researchSystem.getResearchProgress(factionId, project.techId),
          priority: project.priority,
          estimatedCompletion: project.estimatedCompletion,
        };
      }),
      completedCount: completed.length,
      availableTechs: available,
      cumulativeBonuses: bonuses,
      tierProgress: techProgress,
      researchSpeed: this.researchSystem.getFactionResearchSpeed(factionId),
    };
  }

  /**
   * Player manually selects research (if player controls a faction)
   */
  playerSelectResearch(factionId: string, techId: string, currentTime: number): boolean {
    const tech = TechTree.getTechnology(techId);
    if (!tech) {
      console.error(`Technology ${techId} not found`);
      return false;
    }

    const success = this.researchSystem.startResearch(factionId, techId, currentTime);
    if (success) {
      console.log(`Started researching: ${tech.name}`);
      return true;
    } else {
      console.error('Failed to start research (check prerequisites)');
      return false;
    }
  }

  /**
   * Get technology recommendations for player
   */
  getRecommendedTechs(factionId: string, state: FactionState): Technology[] {
    const faction = this.factions.get(factionId);
    if (!faction) return [];

    const available = this.researchSystem.getAvailableTechnologies(factionId);
    const priorities = this.researchAI['calculatePriorities'](faction, state);

    // Score all available techs
    const scored = available.map(tech => {
      const score = this.researchAI['scoreTechnology'](tech, priorities, faction, state);
      return { tech, score: score.totalScore };
    });

    // Sort by score and return top 5
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(item => item.tech);
  }
}

/**
 * USAGE EXAMPLE
 */
export function demonstrateResearchIntegration(): void {
  console.log('=== RESEARCH SYSTEM INTEGRATION DEMO ===\n');

  const integration = new ResearchGameIntegration();

  // Create some test factions
  const factions: Faction[] = [
    {
      id: 'empire',
      name: 'Galactic Empire',
      description: 'Military dictatorship',
      government: 'MILITARY',
      ideology: {
        authoritarian: 0.9,
        economic: 0.3,
        militaristic: 0.95,
        expansionist: 0.8,
        xenophobic: 0.6,
        technological: 0.5,
      },
      territory: [],
      population: 5000000,
      military: 150,
      economy: 100,
      technology: 1,
      influence: 70,
      color: '#FF0000',
    },
    {
      id: 'federation',
      name: 'United Federation',
      description: 'Democratic alliance',
      government: 'DEMOCRACY',
      ideology: {
        authoritarian: -0.5,
        economic: 0.6,
        militaristic: 0.3,
        expansionist: 0.6,
        xenophobic: -0.4,
        technological: 0.8,
      },
      territory: [],
      population: 8000000,
      military: 100,
      economy: 150,
      technology: 1,
      influence: 60,
      color: '#0000FF',
    },
  ];

  // Initialize
  integration.initializeFactionResearch(factions);

  // Simulate game loop
  console.log('\n--- Game Loop Simulation ---\n');

  let currentTime = Date.now() / 1000;

  // Initial research decisions
  console.log('Initial AI research selection:');
  integration.evaluateAIResearch(currentTime);

  // Simulate 10 seconds of game time
  console.log('\n--- Fast-forward 10 seconds ---\n');
  for (let i = 0; i < 10; i++) {
    integration.updateResearch(1.0, currentTime + i);
  }
  currentTime += 10;

  // Check research status
  console.log('\n--- Research Status ---\n');
  for (const faction of factions) {
    const status = integration['researchAI'].getResearchStatus(faction.id);
    console.log(`${faction.name}:`);
    console.log(`  Current: ${status.currentResearch || 'None'}`);
    console.log(`  Completed: ${status.completedCount} techs`);
    console.log(`  Available: ${status.availableCount} techs`);
    console.log(`  Tech Level: ${status.techLevel}`);
  }

  console.log('\n=== DEMO COMPLETE ===');
}

// Run demo if executed directly
if (require.main === module) {
  demonstrateResearchIntegration();
}
