/**
 * FactionMilitaryAI_FleetIntegration.ts
 *
 * Integration guide for FactionMilitaryAI to use FleetCoordinationSystem
 *
 * This shows how to modify FactionMilitaryAI to:
 * 1. Create fleets for military operations
 * 2. Assign ships to fleets based on operation needs
 * 3. Use fleets for sieges instead of raw troop numbers
 * 4. Track fleet status during operations
 */

import { FactionMilitaryAI, MilitaryOperation } from '../faction-dynamics/FactionMilitaryAI';
import { FleetCoordinationSystem, Fleet, FleetOrder } from '../FleetCoordinationSystem';
import { FleetAI } from '../FleetAI';
import { NPCShipAI, NPCShip } from '../NPCShipAI';
import { StationFaction } from '../StationGenerator';

/**
 * Extended FactionMilitaryAI with Fleet Integration
 *
 * This class shows how to enhance FactionMilitaryAI to use fleets
 */
export class FleetIntegratedMilitaryAI extends FactionMilitaryAI {
  private fleetCoordination: FleetCoordinationSystem;
  private fleetAI: FleetAI;
  private shipAI: NPCShipAI;

  // Track fleets by operation
  private operationFleets: Map<string, string> = new Map(); // Operation ID -> Fleet ID

  // Track ships available for fleet assembly
  private availableShips: Map<StationFaction, string[]> = new Map();

  constructor(
    conquestSystem: any,
    diplomacyEngine: any,
    economicNeeds: any,
    fleetCoordination: FleetCoordinationSystem,
    fleetAI: FleetAI,
    shipAI: NPCShipAI
  ) {
    super(conquestSystem, diplomacyEngine, economicNeeds);
    this.fleetCoordination = fleetCoordination;
    this.fleetAI = fleetAI;
    this.shipAI = shipAI;
  }

  /**
   * INTEGRATION POINT 1: Create Fleet for Military Operation
   *
   * When planning a siege, create a fleet instead of just allocating forces
   */
  public createOperationalFleet(
    faction: StationFaction,
    operationId: string,
    requiredFirepower: number,
    operationType: 'SIEGE' | 'PATROL' | 'ESCORT'
  ): Fleet | null {
    console.log(`[FleetIntegration] Creating operational fleet for ${faction}`);
    console.log(`  Operation: ${operationId}`);
    console.log(`  Required Firepower: ${requiredFirepower.toFixed(0)}`);

    // Get available ships for this faction
    const availableShipIds = this.availableShips.get(faction) || [];

    if (availableShipIds.length < 3) {
      console.warn(`[FleetIntegration] Insufficient ships for ${faction} fleet`);
      return null;
    }

    // Select ships based on firepower needed
    const selectedShips: string[] = [];
    let totalFirepower = 0;

    for (const shipId of availableShipIds) {
      const ship = this.shipAI.getAllShips().find(s => s.id === shipId);
      if (!ship) continue;

      selectedShips.push(shipId);
      totalFirepower += ship.stats.weaponPower;

      // Stop when we have enough firepower
      if (totalFirepower >= requiredFirepower) {
        break;
      }

      // Limit fleet size
      if (selectedShips.length >= 20) {
        break;
      }
    }

    if (selectedShips.length < 3) {
      console.warn(`[FleetIntegration] Could not assemble minimum fleet size`);
      return null;
    }

    // Create fleet
    const fleetName = this.generateFleetNameForOperation(faction, operationType);
    const fleet = this.fleetCoordination.createFleet(
      faction,
      selectedShips,
      fleetName
    );

    // Set appropriate formation for operation type
    const formation = this.selectFormationForOperation(operationType);
    this.fleetCoordination.setFormation(fleet.id, formation);

    // Track this fleet
    this.operationFleets.set(operationId, fleet.id);

    // Remove ships from available pool
    const remaining = availableShipIds.filter(id => !selectedShips.includes(id));
    this.availableShips.set(faction, remaining);

    console.log(`[FleetIntegration] ✓ Fleet created: ${fleet.name}`);
    console.log(`  Ships: ${fleet.ships.length}`);
    console.log(`  Firepower: ${fleet.totalFirepower.toFixed(0)} (${(fleet.totalFirepower / requiredFirepower * 100).toFixed(0)}% of required)`);
    console.log(`  Formation: ${fleet.formation}`);

    return fleet;
  }

  /**
   * INTEGRATION POINT 2: Execute Siege with Fleet
   *
   * Launch siege operation using fleet instead of raw force numbers
   */
  public executeSiegeWithFleet(
    operation: MilitaryOperation,
    targetStation: any
  ): boolean {
    const fleetId = this.operationFleets.get(operation.id);
    if (!fleetId) {
      console.error(`[FleetIntegration] No fleet assigned to operation ${operation.id}`);
      return false;
    }

    const fleet = this.fleetCoordination.getFleet(fleetId);
    if (!fleet) {
      console.error(`[FleetIntegration] Fleet ${fleetId} not found`);
      return false;
    }

    console.log(`[FleetIntegration] 🏴 Launching siege with ${fleet.name}`);
    console.log(`  Target: ${targetStation.name}`);
    console.log(`  Fleet Strength: ${fleet.totalFirepower.toFixed(0)}`);

    // Move fleet to target
    this.fleetCoordination.moveFleetTo(
      fleet.id,
      {
        x: targetStation.position.x + 2000,
        y: targetStation.position.y,
        z: targetStation.position.z
      },
      'LINE' // Line formation for bombardment
    );

    // Issue attack order
    this.fleetCoordination.attackTarget(fleet.id, targetStation.id, 'STATION');

    // Begin siege using fleet's effective combat power
    const siegeStrength = fleet.totalFirepower * fleet.combatEffectiveness * fleet.formationBonus;

    // Note: In real integration, you'd call conquestSystem.beginSiege() here
    console.log(`[FleetIntegration] Siege strength: ${siegeStrength.toFixed(0)}`);

    return true;
  }

  /**
   * INTEGRATION POINT 3: Monitor Fleet Operations
   *
   * Track ongoing fleet operations and update military AI state
   */
  public updateFleetOperations(deltaTime: number): void {
    for (const [operationId, fleetId] of this.operationFleets) {
      const fleet = this.fleetCoordination.getFleet(fleetId);
      if (!fleet) {
        // Fleet destroyed or disbanded
        this.operationFleets.delete(operationId);
        continue;
      }

      // Check fleet status
      if (fleet.damagePercent > 0.6) {
        console.log(`[FleetIntegration] ⚠️ ${fleet.name} heavily damaged (${(fleet.damagePercent * 100).toFixed(0)}%)`);

        // Request reinforcements
        const reinforcementRequests = this.fleetAI.getReinforcementRequests();
        const hasRequest = reinforcementRequests.some(r => r.requestingFleetId === fleetId);

        if (!hasRequest) {
          console.log(`[FleetIntegration] Requesting reinforcements for ${fleet.name}`);
          // In real integration, would trigger reinforcement fleet creation
        }
      }

      // Check if fleet is retreating
      if (fleet.status === 'RETREATING') {
        console.log(`[FleetIntegration] ${fleet.name} is retreating - operation failed`);
        // Mark operation as failed
        this.operationFleets.delete(operationId);
      }

      // Check if fleet completed objective
      if (fleet.status === 'READY' && fleet.currentOrder === 'HOLD') {
        console.log(`[FleetIntegration] ${fleet.name} completed objective`);
        // Mark operation as completed
        this.operationFleets.delete(operationId);

        // Return ships to available pool
        this.returnFleetShipsToPool(fleet);

        // Disband fleet
        this.fleetCoordination.disbandFleet(fleetId);
      }
    }
  }

  /**
   * INTEGRATION POINT 4: Tactical Assessment for Operations
   *
   * Use FleetAI to assess if operation is feasible
   */
  public assessOperationFeasibility(
    fleet: Fleet,
    target: any,
    enemyFleets: Fleet[]
  ): { feasible: boolean; confidence: number; reasoning: string } {
    // Get tactical assessment
    const assessment = this.fleetAI.assessSituation(
      fleet.id,
      [fleet, ...enemyFleets],
      [target],
      []
    );

    // Determine feasibility
    const feasible =
      assessment.tacticalAdvantage > -0.3 &&
      !assessment.retreatRecommended &&
      assessment.readinessLevel > 0.5;

    const confidence = assessment.readinessLevel * (assessment.tacticalAdvantage + 1) / 2;

    let reasoning = '';
    if (!feasible) {
      if (assessment.retreatRecommended) {
        reasoning = 'Fleet should retreat - too dangerous';
      } else if (assessment.tacticalAdvantage < -0.3) {
        reasoning = 'Enemy has significant tactical advantage';
      } else {
        reasoning = 'Fleet not ready for operation';
      }
    } else {
      reasoning = `Operation feasible - ${assessment.recommendedAction}`;
    }

    console.log(`[FleetIntegration] Operation Feasibility Assessment:`);
    console.log(`  Feasible: ${feasible}`);
    console.log(`  Confidence: ${(confidence * 100).toFixed(0)}%`);
    console.log(`  Reasoning: ${reasoning}`);

    return { feasible, confidence, reasoning };
  }

  /**
   * INTEGRATION POINT 5: Multi-Fleet Coordination
   *
   * Coordinate multiple fleets for large operations
   */
  public coordinateMultiFleetOperation(
    mainFleetId: string,
    supportFleetIds: string[],
    target: any
  ): void {
    const mainFleet = this.fleetCoordination.getFleet(mainFleetId);
    if (!mainFleet) return;

    console.log(`[FleetIntegration] Coordinating multi-fleet operation`);
    console.log(`  Main Fleet: ${mainFleet.name}`);
    console.log(`  Support Fleets: ${supportFleetIds.length}`);

    // Main fleet: frontal assault
    this.fleetCoordination.setFormation(mainFleetId, 'WEDGE');
    this.fleetCoordination.moveFleetTo(
      mainFleetId,
      target.position,
      'WEDGE'
    );

    console.log(`  ${mainFleet.name}: Frontal assault (WEDGE)`);

    // Support fleets: flanking positions
    supportFleetIds.forEach((fleetId, index) => {
      const fleet = this.fleetCoordination.getFleet(fleetId);
      if (!fleet) return;

      // Calculate flanking position
      const angle = (index / supportFleetIds.length) * Math.PI * 2;
      const flankDistance = 5000;

      const flankPosition = {
        x: target.position.x + Math.cos(angle) * flankDistance,
        y: target.position.y,
        z: target.position.z + Math.sin(angle) * flankDistance
      };

      this.fleetCoordination.setFormation(fleetId, 'LINE');
      this.fleetCoordination.moveFleetTo(fleetId, flankPosition, 'LINE');

      console.log(`  ${fleet.name}: Flanking position ${index + 1} (LINE)`);
    });

    // Calculate combined strength
    let totalFirepower = mainFleet.totalFirepower * mainFleet.formationBonus;

    for (const fleetId of supportFleetIds) {
      const fleet = this.fleetCoordination.getFleet(fleetId);
      if (fleet) {
        totalFirepower += fleet.totalFirepower * fleet.formationBonus;
      }
    }

    console.log(`  Combined Fleet Strength: ${totalFirepower.toFixed(0)}`);
  }

  // ====================================================================
  // HELPER METHODS
  // ====================================================================

  /**
   * Generate fleet name based on operation type
   */
  private generateFleetNameForOperation(
    faction: StationFaction,
    operationType: string
  ): string {
    const prefixes: Record<string, string> = {
      'SIEGE': 'Siege',
      'PATROL': 'Patrol',
      'ESCORT': 'Escort',
      'RAID': 'Raiding'
    };

    const prefix = prefixes[operationType] || 'Battle';
    const number = Math.floor(Math.random() * 99) + 1;

    return `${faction} ${prefix} Fleet ${number}`;
  }

  /**
   * Select formation for operation type
   */
  private selectFormationForOperation(operationType: string): any {
    const formations: Record<string, any> = {
      'SIEGE': 'LINE',       // Maximum bombardment
      'PATROL': 'SCREEN',    // Wide coverage
      'ESCORT': 'SPHERE',    // Protect center
      'RAID': 'WEDGE'        // Fast strike
    };

    return formations[operationType] || 'LINE';
  }

  /**
   * Return fleet ships to available pool
   */
  private returnFleetShipsToPool(fleet: Fleet): void {
    const availableShipIds = this.availableShips.get(fleet.faction) || [];
    availableShipIds.push(...fleet.ships);
    this.availableShips.set(fleet.faction, availableShipIds);

    console.log(`[FleetIntegration] Returned ${fleet.ships.length} ships to ${fleet.faction} pool`);
  }

  /**
   * Register ships for faction
   */
  public registerFactionShips(faction: StationFaction, shipIds: string[]): void {
    const existing = this.availableShips.get(faction) || [];
    this.availableShips.set(faction, [...existing, ...shipIds]);

    console.log(`[FleetIntegration] Registered ${shipIds.length} ships for ${faction}`);
  }
}

/**
 * USAGE EXAMPLE: Full Integration
 */
export function demonstrateFullIntegration() {
  console.log('\n=== FULL FACTION MILITARY AI + FLEET INTEGRATION ===\n');

  // Setup all systems
  const conquestSystem = {} as any; // Placeholder
  const diplomacyEngine = {} as any;
  const economicNeeds = {} as any;

  const fleetCoordination = new FleetCoordinationSystem();
  const fleetAI = new FleetAI(fleetCoordination);
  const shipAI = new NPCShipAI();

  const integratedMilitaryAI = new FleetIntegratedMilitaryAI(
    conquestSystem,
    diplomacyEngine,
    economicNeeds,
    fleetCoordination,
    fleetAI,
    shipAI
  );

  // Create faction ships
  console.log('--- Creating Faction Military Fleet ---');
  const marsShips: NPCShip[] = [];
  for (let i = 0; i < 25; i++) {
    const ship = shipAI.createShip(
      'PATROL',
      'MARS_FEDERATION',
      { x: Math.random() * 10000, y: Math.random() * 10000, z: Math.random() * 10000 }
    );
    marsShips.push(ship);
  }

  // Register ships with fleet system
  fleetCoordination.registerShips(marsShips);

  // Register ships with military AI
  integratedMilitaryAI.registerFactionShips(
    'MARS_FEDERATION',
    marsShips.map(s => s.id)
  );

  // Create operation
  console.log('\n--- Planning Military Operation ---');
  const operationId = 'op_mars_siege_belt_station';
  const targetStation = {
    id: 'station_belt_outpost_5',
    name: 'Belt Outpost 5',
    faction: 'BELT_ALLIANCE',
    position: { x: 15000, y: 0, z: 0 },
    defenseRating: 6
  };

  console.log(`Target: ${targetStation.name}`);
  console.log(`  Defense: ${targetStation.defenseRating}`);

  // Calculate required firepower
  const requiredFirepower = targetStation.defenseRating * 500;
  console.log(`  Required Firepower: ${requiredFirepower.toFixed(0)}`);

  // Create operational fleet
  const fleet = integratedMilitaryAI.createOperationalFleet(
    'MARS_FEDERATION',
    operationId,
    requiredFirepower,
    'SIEGE'
  );

  if (!fleet) {
    console.log('✗ Failed to create operational fleet');
    return;
  }

  // Assess operation feasibility
  console.log('\n--- Assessing Operation Feasibility ---');
  const assessment = integratedMilitaryAI.assessOperationFeasibility(
    fleet,
    targetStation,
    [] // No enemy fleets for this example
  );

  if (!assessment.feasible) {
    console.log('✗ Operation not feasible - aborting');
    return;
  }

  // Execute siege
  console.log('\n--- Executing Siege Operation ---');
  const mockOperation: MilitaryOperation = {
    id: operationId,
    type: 'SIEGE',
    faction: 'MARS_FEDERATION',
    targetId: targetStation.id,
    targetName: targetStation.name,
    forcesCommitted: fleet.totalFirepower,
    reserveForces: 0,
    status: 'EXECUTING',
    progress: 0,
    plannedAt: Date.now() / 1000,
    casualtiesInflicted: 0,
    casualtiesSuffered: 0
  };

  const siegeLaunched = integratedMilitaryAI.executeSiegeWithFleet(
    mockOperation,
    targetStation
  );

  if (siegeLaunched) {
    console.log('✓ Siege operation launched successfully');
  }

  // Simulate operation monitoring
  console.log('\n--- Monitoring Operation ---');
  for (let i = 0; i < 3; i++) {
    console.log(`\nUpdate ${i + 1}:`);
    integratedMilitaryAI.updateFleetOperations(60); // 60 second updates
    fleetCoordination.update(60);

    const currentFleet = fleetCoordination.getFleet(fleet.id);
    if (currentFleet) {
      console.log(`  ${currentFleet.name}: ${currentFleet.status}`);
      console.log(`  Ships: ${currentFleet.ships.length}, Damage: ${(currentFleet.damagePercent * 100).toFixed(0)}%`);
    }
  }

  console.log('\n✓ Full integration demonstration complete');
}

export default {
  FleetIntegratedMilitaryAI,
  demonstrateFullIntegration
};
