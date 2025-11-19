/**
 * TechnologyEffectApplicator.ts
 * Applies technology bonuses to game entities (ships, stations, factions)
 * Handles cumulative bonuses, validates applications, and emits events
 */

import { TechUnlocks } from './ResearchSystem';
import { NPCShip, ShipType } from './npc-traffic/npc-ship';
import { SpaceStation } from './StationGenerator';
import { Faction } from './FactionSystem';

/**
 * Event emitted when research effects are applied
 */
export interface ResearchEffectAppliedEvent {
  timestamp: number;
  entityType: 'SHIP' | 'STATION' | 'FACTION';
  entityId: string;
  entityName: string;
  bonusesApplied: TechUnlocks;
  previousStats: any;
  newStats: any;
  techIdsApplied: string[];
}

/**
 * Bonus type classification for proper application
 */
export type BonusType = 'MULTIPLIER' | 'FLAT' | 'UNLOCK';

/**
 * Validation result for bonus application
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * TechnologyEffectApplicator - Applies tech bonuses to entities
 */
export class TechnologyEffectApplicator {
  private eventListeners: Array<(event: ResearchEffectAppliedEvent) => void> = [];

  /**
   * Register listener for research effect application events
   */
  onResearchEffectApplied(callback: (event: ResearchEffectAppliedEvent) => void): void {
    this.eventListeners.push(callback);
  }

  /**
   * Emit research effect applied event
   */
  private emitResearchEffectApplied(event: ResearchEffectAppliedEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[TechEffectApplicator] Error in event listener:', error);
      }
    }
  }

  /**
   * Apply cumulative bonuses to a ship
   * Modifies the ship's stats based on all completed faction technologies
   */
  applyBonusesToShip(
    ship: NPCShip,
    cumulativeBonuses: TechUnlocks,
    techIdsApplied: string[]
  ): ValidationResult {
    const validation = this.validateShipBonusApplication(ship, cumulativeBonuses);
    if (!validation.valid) {
      console.warn(`[TechEffectApplicator] Ship bonus validation failed for ${ship.name}:`, validation.errors);
      return validation;
    }

    // Capture previous stats
    const previousStats = {
      cargoCapacity: ship.cargoCapacity,
      health: ship.health,
      fuel: ship.fuel,
      subsystemsSnapshot: this.captureSubsystemStats(ship)
    };

    // Apply multiplier bonuses
    this.applyShipMultiplierBonuses(ship, cumulativeBonuses);

    // Apply unlock bonuses (new ship types handled during creation)
    this.applyShipUnlockBonuses(ship, cumulativeBonuses);

    // Capture new stats
    const newStats = {
      cargoCapacity: ship.cargoCapacity,
      health: ship.health,
      fuel: ship.fuel,
      subsystemsSnapshot: this.captureSubsystemStats(ship)
    };

    // Emit event
    this.emitResearchEffectApplied({
      timestamp: Date.now() / 1000,
      entityType: 'SHIP',
      entityId: ship.id,
      entityName: ship.name,
      bonusesApplied: cumulativeBonuses,
      previousStats,
      newStats,
      techIdsApplied
    });

    console.log(`[TechEffectApplicator] Applied tech bonuses to ship ${ship.name}`);
    if (validation.warnings.length > 0) {
      console.warn(`[TechEffectApplicator] Warnings:`, validation.warnings);
    }

    return validation;
  }

  /**
   * Apply multiplier bonuses to ship
   */
  private applyShipMultiplierBonuses(ship: NPCShip, bonuses: TechUnlocks): void {
    const physics = ship.getPhysics();

    // Weapon bonuses (affect subsystems if present)
    if (ship.subsystems.weapons) {
      if (bonuses.weaponDamage) {
        for (const weapon of ship.subsystems.weapons.weapons) {
          weapon.damage *= bonuses.weaponDamage;
        }
      }
      if (bonuses.weaponRange) {
        for (const weapon of ship.subsystems.weapons.weapons) {
          weapon.range *= bonuses.weaponRange;
        }
      }
      if (bonuses.weaponAccuracy) {
        for (const weapon of ship.subsystems.weapons.weapons) {
          weapon.accuracy *= bonuses.weaponAccuracy;
        }
      }
    }

    // Propulsion bonuses
    if (bonuses.engineSpeed) {
      physics.maxAcceleration *= bonuses.engineSpeed;
      physics.maxVelocity *= bonuses.engineSpeed;
    }

    if (bonuses.fuelEfficiency && ship.subsystems.fuel) {
      // Increase fuel capacity
      const fuelMultiplier = bonuses.fuelEfficiency;
      ship.subsystems.fuel.mainFuel.capacity *= fuelMultiplier;
      ship.subsystems.fuel.rcsFuel.capacity *= fuelMultiplier;
      // Also increase current fuel proportionally
      ship.subsystems.fuel.mainFuel.current *= fuelMultiplier;
      ship.subsystems.fuel.rcsFuel.current *= fuelMultiplier;
    }

    if (bonuses.jumpRange) {
      // Jump range is abstract - could be stored as property
      // For now, we'll increase max velocity as proxy for jump capability
      physics.maxVelocity *= Math.sqrt(bonuses.jumpRange);
    }

    // Defense bonuses
    if (bonuses.shieldStrength && ship.subsystems.shields) {
      ship.subsystems.shields.maxShieldStrength *= bonuses.shieldStrength;
      ship.subsystems.shields.currentShieldStrength *= bonuses.shieldStrength;
      ship.subsystems.shields.rechargeRate *= bonuses.shieldStrength;
    }

    if (bonuses.armorRating && ship.subsystems.hull) {
      // Armor rating increases hull strength
      ship.subsystems.hull.maxIntegrity *= bonuses.armorRating;
      ship.subsystems.hull.integrity = Math.min(
        1.0,
        ship.subsystems.hull.integrity * bonuses.armorRating
      );
    }

    if (bonuses.hullPoints && ship.subsystems.hull) {
      // Hull points directly increase health
      ship.subsystems.hull.maxIntegrity *= bonuses.hullPoints;
      ship.health *= bonuses.hullPoints;
      ship.health = Math.min(1.0, ship.health);
    }

    // Sensor bonuses
    if (bonuses.sensorRange && ship.subsystems.sensors) {
      ship.subsystems.sensors.maxRange *= bonuses.sensorRange;
      ship.subsystems.sensors.currentRange *= bonuses.sensorRange;
    }

    // Stealth bonuses (lower signature = harder to detect)
    if (bonuses.stealthRating) {
      // Reduce sensor signature
      if (ship.subsystems.sensors) {
        ship.subsystems.sensors.signature /= bonuses.stealthRating;
      }
    }

    // Economic bonuses
    if (bonuses.economicOutput) {
      // Increase cargo capacity for economic ships
      if (ship.type === ShipType.CARGO_FREIGHTER || ship.type === ShipType.CARGO_SHUTTLE) {
        ship.cargoCapacity *= bonuses.economicOutput;
      }
    }

    if (bonuses.miningEfficiency && ship.type === ShipType.MINING_VESSEL) {
      // Increase cargo capacity for mining vessels
      ship.cargoCapacity *= bonuses.miningEfficiency;
    }
  }

  /**
   * Apply unlock bonuses to ship
   */
  private applyShipUnlockBonuses(ship: NPCShip, bonuses: TechUnlocks): void {
    // Special abilities can enable new ship behaviors
    if (bonuses.specialAbilities) {
      // Could store these on the ship for behavior modifications
      // For now, just log them
      console.log(`[TechEffectApplicator] Ship ${ship.name} gained special abilities:`, bonuses.specialAbilities);
    }

    // New weapon types would be applied during weapon loadout
    if (bonuses.newWeaponTypes) {
      console.log(`[TechEffectApplicator] Ship ${ship.name} has access to new weapons:`, bonuses.newWeaponTypes);
    }
  }

  /**
   * Apply cumulative bonuses to a station
   */
  applyBonusesToStation(
    station: SpaceStation,
    cumulativeBonuses: TechUnlocks,
    techIdsApplied: string[]
  ): ValidationResult {
    const validation = this.validateStationBonusApplication(station, cumulativeBonuses);
    if (!validation.valid) {
      console.warn(`[TechEffectApplicator] Station bonus validation failed for ${station.name}:`, validation.errors);
      return validation;
    }

    // Capture previous stats
    const previousStats = {
      population: station.population,
      defenseRating: station.defenseRating,
      economicOutput: station.economy.wealthLevel,
      tradeVolume: station.economy.tradeVolume
    };

    // Apply bonuses
    this.applyStationBonuses(station, cumulativeBonuses);

    // Capture new stats
    const newStats = {
      population: station.population,
      defenseRating: station.defenseRating,
      economicOutput: station.economy.wealthLevel,
      tradeVolume: station.economy.tradeVolume
    };

    // Emit event
    this.emitResearchEffectApplied({
      timestamp: Date.now() / 1000,
      entityType: 'STATION',
      entityId: station.id,
      entityName: station.name,
      bonusesApplied: cumulativeBonuses,
      previousStats,
      newStats,
      techIdsApplied
    });

    console.log(`[TechEffectApplicator] Applied tech bonuses to station ${station.name}`);
    return validation;
  }

  /**
   * Apply bonuses to station
   */
  private applyStationBonuses(station: SpaceStation, bonuses: TechUnlocks): void {
    // Economic bonuses
    if (bonuses.economicOutput) {
      station.economy.wealthLevel *= bonuses.economicOutput;
      station.economy.wealthLevel = Math.min(1.0, station.economy.wealthLevel);
      station.economy.tradeVolume *= bonuses.economicOutput;
    }

    if (bonuses.tradeBonus) {
      station.economy.tradeVolume *= bonuses.tradeBonus;
      // Improve all commodity prices slightly
      for (const [commodity, price] of station.economy.commodityPrices) {
        station.economy.commodityPrices.set(commodity, price * (1 + (bonuses.tradeBonus - 1) * 0.5));
      }
    }

    if (bonuses.miningEfficiency) {
      // Increase supply of raw materials
      station.economy.supplyGoods.push('Metals', 'Minerals');
    }

    // Defense bonuses
    if (bonuses.shieldStrength || bonuses.armorRating) {
      const defenseBonus = Math.max(bonuses.shieldStrength || 1, bonuses.armorRating || 1);
      station.defenseRating *= defenseBonus;
      station.defenseRating = Math.min(10, station.defenseRating);
    }

    // New building types unlock new services
    if (bonuses.newBuildingTypes) {
      for (const building of bonuses.newBuildingTypes) {
        if (building.includes('shield') && !station.services.repairs) {
          station.services.repairs = true;
        }
        if (building.includes('shipyard')) {
          station.services.shipUpgrades = true;
        }
        if (building.includes('factory') || building.includes('automated')) {
          station.economy.wealthLevel *= 1.1;
        }
      }
      console.log(`[TechEffectApplicator] Station ${station.name} unlocked new buildings:`, bonuses.newBuildingTypes);
    }

    // Population growth from economic/technological advancement
    if (bonuses.economicOutput && bonuses.economicOutput > 1.2) {
      station.population *= 1.05; // 5% population growth from prosperity
    }
  }

  /**
   * Apply cumulative bonuses to faction capabilities
   */
  applyBonusesToFaction(
    faction: Faction,
    cumulativeBonuses: TechUnlocks,
    techIdsApplied: string[]
  ): ValidationResult {
    const validation = this.validateFactionBonusApplication(faction, cumulativeBonuses);
    if (!validation.valid) {
      console.warn(`[TechEffectApplicator] Faction bonus validation failed for ${faction.name}:`, validation.errors);
      return validation;
    }

    // Capture previous stats
    const previousStats = {
      military: faction.military,
      economy: faction.economy,
      technology: faction.technology,
      influence: faction.influence
    };

    // Apply bonuses
    this.applyFactionBonuses(faction, cumulativeBonuses);

    // Capture new stats
    const newStats = {
      military: faction.military,
      economy: faction.economy,
      technology: faction.technology,
      influence: faction.influence
    };

    // Emit event
    this.emitResearchEffectApplied({
      timestamp: Date.now() / 1000,
      entityType: 'FACTION',
      entityId: faction.id,
      entityName: faction.name,
      bonusesApplied: cumulativeBonuses,
      previousStats,
      newStats,
      techIdsApplied
    });

    console.log(`[TechEffectApplicator] Applied tech bonuses to faction ${faction.name}`);
    return validation;
  }

  /**
   * Apply bonuses to faction
   */
  private applyFactionBonuses(faction: Faction, bonuses: TechUnlocks): void {
    // Military bonuses
    if (bonuses.weaponDamage || bonuses.weaponRange || bonuses.weaponAccuracy) {
      const militaryBoost = (
        (bonuses.weaponDamage || 1) +
        (bonuses.weaponRange || 1) +
        (bonuses.weaponAccuracy || 1)
      ) / 3;
      faction.military *= militaryBoost;
    }

    if (bonuses.shieldStrength || bonuses.armorRating || bonuses.hullPoints) {
      const defenseBoost = (
        (bonuses.shieldStrength || 1) +
        (bonuses.armorRating || 1) +
        (bonuses.hullPoints || 1)
      ) / 3;
      faction.military *= defenseBoost;
    }

    // Economic bonuses
    if (bonuses.economicOutput || bonuses.tradeBonus || bonuses.miningEfficiency) {
      const economicBoost = (
        (bonuses.economicOutput || 1) +
        (bonuses.tradeBonus || 1) +
        (bonuses.miningEfficiency || 1)
      ) / 3;
      faction.economy *= economicBoost;
    }

    // Technology level
    if (bonuses.researchSpeed) {
      faction.technology += Math.floor(bonuses.researchSpeed);
      faction.technology = Math.min(10, faction.technology);
    }

    // Influence from advanced capabilities
    if (bonuses.specialAbilities) {
      faction.influence += bonuses.specialAbilities.length * 2;
      faction.influence = Math.min(100, faction.influence);
    }

    // New ship types increase military power
    if (bonuses.newShipTypes) {
      faction.military *= 1.1; // 10% military boost per new ship type category
    }
  }

  /**
   * Validate ship bonus application
   */
  private validateShipBonusApplication(ship: NPCShip, bonuses: TechUnlocks): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check ship exists
    if (!ship) {
      errors.push('Ship is null or undefined');
      return { valid: false, errors, warnings };
    }

    // Check subsystems exist
    if (!ship.subsystems) {
      errors.push('Ship has no subsystems');
      return { valid: false, errors, warnings };
    }

    // Warn if applying bonuses that ship can't use
    if (bonuses.weaponDamage && !ship.subsystems.weapons) {
      warnings.push('Ship has no weapons subsystem for weapon bonuses');
    }

    if (bonuses.shieldStrength && !ship.subsystems.shields) {
      warnings.push('Ship has no shields subsystem for shield bonuses');
    }

    if (bonuses.sensorRange && !ship.subsystems.sensors) {
      warnings.push('Ship has no sensors subsystem for sensor bonuses');
    }

    return { valid: true, errors, warnings };
  }

  /**
   * Validate station bonus application
   */
  private validateStationBonusApplication(station: SpaceStation, bonuses: TechUnlocks): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!station) {
      errors.push('Station is null or undefined');
      return { valid: false, errors, warnings };
    }

    if (!station.economy) {
      errors.push('Station has no economy data');
      return { valid: false, errors, warnings };
    }

    return { valid: true, errors, warnings };
  }

  /**
   * Validate faction bonus application
   */
  private validateFactionBonusApplication(faction: Faction, bonuses: TechUnlocks): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!faction) {
      errors.push('Faction is null or undefined');
      return { valid: false, errors, warnings };
    }

    return { valid: true, errors, warnings };
  }

  /**
   * Capture current subsystem stats for comparison
   */
  private captureSubsystemStats(ship: NPCShip): any {
    const stats: any = {};

    if (ship.subsystems.weapons) {
      stats.weaponDamage = ship.subsystems.weapons.weapons.map(w => w.damage);
      stats.weaponRange = ship.subsystems.weapons.weapons.map(w => w.range);
    }

    if (ship.subsystems.shields) {
      stats.shieldStrength = ship.subsystems.shields.maxShieldStrength;
    }

    if (ship.subsystems.sensors) {
      stats.sensorRange = ship.subsystems.sensors.maxRange;
    }

    if (ship.subsystems.hull) {
      stats.hullIntegrity = ship.subsystems.hull.maxIntegrity;
    }

    const physics = ship.getPhysics();
    stats.maxAcceleration = physics.maxAcceleration;
    stats.maxVelocity = physics.maxVelocity;

    return stats;
  }

  /**
   * Classify bonus type for proper handling
   */
  classifyBonusType(bonusKey: keyof TechUnlocks, bonusValue: any): BonusType {
    // Array bonuses are unlocks
    if (Array.isArray(bonusValue)) {
      return 'UNLOCK';
    }

    // Number bonuses are multipliers if > 0 and < 100
    if (typeof bonusValue === 'number') {
      if (bonusValue >= 0.1 && bonusValue <= 100) {
        return 'MULTIPLIER';
      } else {
        return 'FLAT';
      }
    }

    return 'MULTIPLIER'; // Default
  }

  /**
   * Get statistics about applied effects
   */
  getStatistics(): {
    totalApplications: number;
    shipApplications: number;
    stationApplications: number;
    factionApplications: number;
  } {
    // In a full implementation, we'd track these
    return {
      totalApplications: this.eventListeners.length,
      shipApplications: 0,
      stationApplications: 0,
      factionApplications: 0
    };
  }
}
