/**
 * MiningFleetAI.ts
 * Coordinates faction-level mining operations
 * Assigns miners to asteroid fields, routes ore to refineries
 * Tracks mining efficiency and responds to faction economic needs
 */

import { Vector3 } from './CelestialBody';
import { AsteroidDepletionTracker, PersistentAsteroid, AsteroidField } from './AsteroidDepletionTracker';
import { OreType } from './MiningSystem';
import { NPCShip } from './NPCShipAI';
import { SpaceStation, StationType } from './StationGenerator';
import { FactionEconomicNeeds } from './faction-dynamics/FactionEconomicNeeds';
import { ManufacturingSystem } from './ManufacturingSystem';

export interface MiningAssignment {
  minerId: string; // ship ID
  asteroidId: string;
  targetOre: OreType;
  assignedTime: number;
  priority: number; // 0-10
  status: 'TRAVELING' | 'MINING' | 'RETURNING' | 'DELIVERING';
  currentCargo: number; // kg
  deliveryStation: string | null; // station ID for delivery
}

export interface MiningOperation {
  id: string;
  factionId: string;
  fieldId: string;
  targetOre: OreType[];
  assignedMiners: string[]; // ship IDs
  homeStation: string; // refinery station ID
  totalMined: number; // kg
  efficiency: number; // 0-1
  active: boolean;
}

export interface RefineryStation {
  stationId: string;
  position: Vector3;
  factionId: string;
  processingCapacity: number; // kg per hour
  currentInventory: Map<OreType, number>; // ore type -> kg in storage
  queuedDeliveries: string[]; // miner ship IDs en route
  manufacturingFacilityId?: string; // connected manufacturing facility
}

export class MiningFleetAI {
  private asteroidTracker: AsteroidDepletionTracker;
  private manufacturingSystem: ManufacturingSystem | null = null;

  // Mining operations
  private operations: Map<string, MiningOperation> = new Map();
  private assignments: Map<string, MiningAssignment> = new Map(); // minerId -> assignment
  private refineries: Map<string, RefineryStation> = new Map();

  // Efficiency tracking
  private totalOreDelivered: Map<string, number> = new Map(); // factionId -> kg
  private operationIdCounter: number = 0;

  constructor(asteroidTracker: AsteroidDepletionTracker) {
    this.asteroidTracker = asteroidTracker;
  }

  /**
   * Link manufacturing system for ore processing
   */
  linkManufacturingSystem(manufacturingSystem: ManufacturingSystem): void {
    this.manufacturingSystem = manufacturingSystem;
    console.log('[MINING_FLEET_AI] Linked to manufacturing system');
  }

  /**
   * Register a refinery station
   */
  registerRefinery(
    stationId: string,
    position: Vector3,
    factionId: string,
    processingCapacity: number = 1000
  ): void {
    this.refineries.set(stationId, {
      stationId,
      position,
      factionId,
      processingCapacity,
      currentInventory: new Map(),
      queuedDeliveries: [],
      manufacturingFacilityId: undefined
    });

    console.log(`[MINING_FLEET_AI] Registered refinery ${stationId} for faction ${factionId}`);
  }

  /**
   * Link refinery to manufacturing facility
   */
  linkRefineryToManufacturing(stationId: string, facilityId: string): void {
    const refinery = this.refineries.get(stationId);
    if (refinery) {
      refinery.manufacturingFacilityId = facilityId;
      console.log(`[MINING_FLEET_AI] Linked refinery ${stationId} to manufacturing facility ${facilityId}`);
    }
  }

  /**
   * Create a mining operation for a faction
   */
  createMiningOperation(
    factionId: string,
    fieldId: string,
    targetOres: OreType[],
    homeStationId: string
  ): MiningOperation {
    const operation: MiningOperation = {
      id: `mining_op_${this.operationIdCounter++}`,
      factionId,
      fieldId,
      targetOre: targetOres,
      assignedMiners: [],
      homeStation: homeStationId,
      totalMined: 0,
      efficiency: 0,
      active: true
    };

    this.operations.set(operation.id, operation);

    console.log(`[MINING_FLEET_AI] Created mining operation ${operation.id} for ${factionId} in field ${fieldId}`);

    return operation;
  }

  /**
   * Assign a miner ship to an operation
   */
  assignMiner(
    minerId: string,
    operationId: string,
    targetOre: OreType,
    priority: number = 5
  ): MiningAssignment | null {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.log(`[MINING_FLEET_AI] Operation ${operationId} not found`);
      return null;
    }

    // Check if miner already assigned
    if (this.assignments.has(minerId)) {
      console.log(`[MINING_FLEET_AI] Miner ${minerId} already assigned`);
      return null;
    }

    // Find best asteroid in the field for this ore type
    const field = this.asteroidTracker.getField(operation.fieldId);
    if (!field) {
      console.log(`[MINING_FLEET_AI] Field ${operation.fieldId} not found`);
      return null;
    }

    // Get refinery station position for routing
    const refinery = this.refineries.get(operation.homeStation);
    if (!refinery) {
      console.log(`[MINING_FLEET_AI] Refinery ${operation.homeStation} not found`);
      return null;
    }

    // Find best asteroid for this ore type near the field
    const bestMatch = this.asteroidTracker.findBestMiningLocation(
      targetOre,
      field.center
    );

    if (!bestMatch) {
      console.log(`[MINING_FLEET_AI] No suitable asteroid found for ${targetOre} in field ${operation.fieldId}`);
      return null;
    }

    const assignment: MiningAssignment = {
      minerId,
      asteroidId: bestMatch.asteroid.id,
      targetOre,
      assignedTime: Date.now() / 1000,
      priority,
      status: 'TRAVELING',
      currentCargo: 0,
      deliveryStation: operation.homeStation
    };

    this.assignments.set(minerId, assignment);
    operation.assignedMiners.push(minerId);

    console.log(`[MINING_FLEET_AI] Assigned miner ${minerId} to asteroid ${bestMatch.asteroid.id} for ${targetOre}`);

    return assignment;
  }

  /**
   * Auto-assign miners to operation based on faction economic needs
   */
  autoAssignMiners(
    operationId: string,
    availableMiners: NPCShip[],
    factionNeeds?: FactionEconomicNeeds
  ): number {
    const operation = this.operations.get(operationId);
    if (!operation) return 0;

    let assigned = 0;

    // Determine priority ore types based on faction needs
    const orePriorities = new Map<OreType, number>();

    if (factionNeeds) {
      // Map commodity needs to ore types
      const economy = factionNeeds.getEconomicStatus();

      for (const [commodity, need] of economy.criticalResources) {
        const priority = need.inCrisis ? 10 : Math.max(1, 100 - need.daysRemaining) / 10;

        // Map commodities to ore types
        if (commodity === 'iron') {
          orePriorities.set('IRON', priority);
          orePriorities.set('NICKEL', priority * 0.8);
        } else if (commodity === 'rare_earth') {
          orePriorities.set('RARE_EARTHS', priority);
          orePriorities.set('PLATINUM', priority * 0.6);
        } else if (commodity === 'uranium') {
          orePriorities.set('URANIUM', priority);
        }
      }
    }

    // Default priorities if no specific needs
    if (orePriorities.size === 0) {
      orePriorities.set('IRON', 5);
      orePriorities.set('NICKEL', 4);
      orePriorities.set('RARE_EARTHS', 6);
    }

    // Assign available miners to highest priority ores
    const sortedOres = Array.from(orePriorities.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const miner of availableMiners) {
      if (assigned >= availableMiners.length) break;

      // Assign to highest priority ore
      const [targetOre, priority] = sortedOres[assigned % sortedOres.length];

      const assignment = this.assignMiner(
        miner.id,
        operationId,
        targetOre,
        priority
      );

      if (assignment) {
        assigned++;
      }
    }

    console.log(`[MINING_FLEET_AI] Auto-assigned ${assigned} miners to operation ${operationId}`);

    return assigned;
  }

  /**
   * Update miner assignment (called by NPC ship AI)
   */
  updateMinerStatus(
    minerId: string,
    status: 'TRAVELING' | 'MINING' | 'RETURNING' | 'DELIVERING',
    cargoAmount?: number
  ): void {
    const assignment = this.assignments.get(minerId);
    if (!assignment) return;

    assignment.status = status;

    if (cargoAmount !== undefined) {
      assignment.currentCargo = cargoAmount;
    }

    // If delivering, add to refinery queue
    if (status === 'DELIVERING' && assignment.deliveryStation) {
      const refinery = this.refineries.get(assignment.deliveryStation);
      if (refinery && !refinery.queuedDeliveries.includes(minerId)) {
        refinery.queuedDeliveries.push(minerId);
      }
    }
  }

  /**
   * Deliver ore to refinery
   */
  deliverOre(
    minerId: string,
    stationId: string,
    oreDelivery: Map<OreType, number> // ore type -> kg
  ): { success: boolean; message: string } {
    const refinery = this.refineries.get(stationId);
    if (!refinery) {
      return {
        success: false,
        message: `Refinery ${stationId} not found`
      };
    }

    const assignment = this.assignments.get(minerId);
    if (!assignment) {
      return {
        success: false,
        message: `Miner ${minerId} has no assignment`
      };
    }

    // Add ore to refinery inventory
    let totalDelivered = 0;
    for (const [oreType, amount] of oreDelivery) {
      const existing = refinery.currentInventory.get(oreType) || 0;
      refinery.currentInventory.set(oreType, existing + amount);
      totalDelivered += amount;
    }

    // Update operation stats
    const operation = this.operations.get(
      Array.from(this.operations.values())
        .find(op => op.assignedMiners.includes(minerId))?.id || ''
    );

    if (operation) {
      operation.totalMined += totalDelivered;

      // Update faction total
      const factionTotal = this.totalOreDelivered.get(operation.factionId) || 0;
      this.totalOreDelivered.set(operation.factionId, factionTotal + totalDelivered);
    }

    // Remove from delivery queue
    const queueIndex = refinery.queuedDeliveries.indexOf(minerId);
    if (queueIndex >= 0) {
      refinery.queuedDeliveries.splice(queueIndex, 1);
    }

    // Reset assignment cargo
    assignment.currentCargo = 0;
    assignment.status = 'TRAVELING';

    console.log(`[MINING_FLEET_AI] Miner ${minerId} delivered ${totalDelivered.toFixed(0)}kg ore to ${stationId}`);

    // Process ore through refinery if manufacturing system is linked
    if (this.manufacturingSystem && refinery.manufacturingFacilityId) {
      this.processRefineryOre(stationId);
    }

    return {
      success: true,
      message: `Delivered ${totalDelivered.toFixed(0)}kg ore to refinery`
    };
  }

  /**
   * Process ore in refinery through manufacturing system
   */
  private processRefineryOre(stationId: string): void {
    const refinery = this.refineries.get(stationId);
    if (!refinery || !refinery.manufacturingFacilityId || !this.manufacturingSystem) {
      return;
    }

    // Transfer ore to manufacturing facility
    for (const [oreType, amount] of refinery.currentInventory) {
      if (amount > 100) { // Only process batches of 100kg+
        // Map ore to commodity type and add to facility
        // This would use the ORE_TO_COMMODITY_MAP from ManufacturingSystem
        // For now, just log
        console.log(`[MINING_FLEET_AI] Processing ${amount.toFixed(0)}kg of ${oreType} at refinery ${stationId}`);

        // Clear inventory after processing
        refinery.currentInventory.set(oreType, 0);
      }
    }
  }

  /**
   * Find nearest refinery for a miner
   */
  findNearestRefinery(position: Vector3, factionId: string): RefineryStation | null {
    let nearest: RefineryStation | null = null;
    let minDistance = Infinity;

    for (const refinery of this.refineries.values()) {
      if (refinery.factionId !== factionId) continue;

      const distance = this.distance(position, refinery.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = refinery;
      }
    }

    return nearest;
  }

  /**
   * Get mining assignment for a ship
   */
  getAssignment(minerId: string): MiningAssignment | undefined {
    return this.assignments.get(minerId);
  }

  /**
   * Remove assignment (miner destroyed or reassigned)
   */
  removeAssignment(minerId: string): void {
    const assignment = this.assignments.get(minerId);
    if (!assignment) return;

    // Stop mining at asteroid
    this.asteroidTracker.stopMining(assignment.asteroidId, minerId);

    // Remove from operation
    for (const operation of this.operations.values()) {
      const index = operation.assignedMiners.indexOf(minerId);
      if (index >= 0) {
        operation.assignedMiners.splice(index, 1);
      }
    }

    // Remove from refinery queue
    if (assignment.deliveryStation) {
      const refinery = this.refineries.get(assignment.deliveryStation);
      if (refinery) {
        const queueIndex = refinery.queuedDeliveries.indexOf(minerId);
        if (queueIndex >= 0) {
          refinery.queuedDeliveries.splice(queueIndex, 1);
        }
      }
    }

    this.assignments.delete(minerId);
    console.log(`[MINING_FLEET_AI] Removed assignment for miner ${minerId}`);
  }

  /**
   * Update all mining operations
   */
  update(deltaTime: number): void {
    // Update operation efficiency
    for (const operation of this.operations.values()) {
      if (!operation.active) continue;

      const activeMiners = operation.assignedMiners.filter(id => {
        const assignment = this.assignments.get(id);
        return assignment && assignment.status === 'MINING';
      }).length;

      // Efficiency = active miners / total assigned
      operation.efficiency = operation.assignedMiners.length > 0
        ? activeMiners / operation.assignedMiners.length
        : 0;
    }

    // Process refinery ore periodically
    if (this.manufacturingSystem) {
      for (const refinery of this.refineries.values()) {
        if (refinery.manufacturingFacilityId) {
          // Process ore every update cycle
          this.processRefineryOre(refinery.stationId);
        }
      }
    }
  }

  /**
   * Get operation statistics
   */
  getOperationStats(operationId: string): string {
    const operation = this.operations.get(operationId);
    if (!operation) return 'Operation not found';

    const field = this.asteroidTracker.getField(operation.fieldId);
    const refinery = this.refineries.get(operation.homeStation);

    const lines: string[] = [];
    lines.push(`=== Mining Operation ${operation.id} ===`);
    lines.push(`Faction: ${operation.factionId}`);
    lines.push(`Field: ${field?.name || operation.fieldId}`);
    lines.push(`Home Station: ${operation.homeStation}`);
    lines.push('');
    lines.push(`Target Ores: ${operation.targetOre.join(', ')}`);
    lines.push(`Assigned Miners: ${operation.assignedMiners.length}`);
    lines.push(`Efficiency: ${(operation.efficiency * 100).toFixed(0)}%`);
    lines.push(`Total Mined: ${(operation.totalMined / 1000).toFixed(1)} tons`);
    lines.push(`Active: ${operation.active ? 'YES' : 'NO'}`);
    lines.push('');

    if (refinery) {
      lines.push('Refinery Inventory:');
      if (refinery.currentInventory.size === 0) {
        lines.push('  Empty');
      } else {
        for (const [ore, amount] of refinery.currentInventory) {
          lines.push(`  ${ore}: ${amount.toFixed(0)}kg`);
        }
      }
      lines.push(`Queued Deliveries: ${refinery.queuedDeliveries.length}`);
    }

    return lines.join('\n');
  }

  /**
   * Get faction mining statistics
   */
  getFactionStats(factionId: string): string {
    const factionOps = Array.from(this.operations.values())
      .filter(op => op.factionId === factionId);

    const totalMiners = factionOps.reduce((sum, op) => sum + op.assignedMiners.length, 0);
    const totalMined = factionOps.reduce((sum, op) => sum + op.totalMined, 0);
    const avgEfficiency = factionOps.length > 0
      ? factionOps.reduce((sum, op) => sum + op.efficiency, 0) / factionOps.length
      : 0;

    const lines: string[] = [];
    lines.push(`=== ${factionId} Mining Fleet ===`);
    lines.push(`Active Operations: ${factionOps.filter(op => op.active).length}`);
    lines.push(`Total Miners: ${totalMiners}`);
    lines.push(`Total Mined: ${(totalMined / 1000).toFixed(1)} tons`);
    lines.push(`Average Efficiency: ${(avgEfficiency * 100).toFixed(0)}%`);
    lines.push('');

    const factionRefineries = Array.from(this.refineries.values())
      .filter(r => r.factionId === factionId);

    lines.push(`Refineries: ${factionRefineries.length}`);
    for (const refinery of factionRefineries) {
      const totalInventory = Array.from(refinery.currentInventory.values())
        .reduce((sum, amt) => sum + amt, 0);
      lines.push(`  ${refinery.stationId}: ${(totalInventory / 1000).toFixed(1)} tons stored`);
    }

    return lines.join('\n');
  }

  /**
   * Get all operations
   */
  getAllOperations(): MiningOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get operations for a faction
   */
  getFactionOperations(factionId: string): MiningOperation[] {
    return Array.from(this.operations.values())
      .filter(op => op.factionId === factionId);
  }

  /**
   * Calculate distance
   */
  private distance(p1: Vector3, p2: Vector3): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
