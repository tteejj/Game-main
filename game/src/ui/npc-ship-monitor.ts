/**
 * NPC Ship Monitor
 * Monitors nearby NPC ships and generates alerts for distress situations
 */

import { NPCShip } from '../../../universe-system/src/npc-traffic/npc-ship';
import { AlertSystem, AlertPriority, AlertCategory } from './alert-system';

export interface NPCShipContact {
  id: string;
  name: string;
  type: string;
  distance: number;
  bearing: number;
  velocity: number;
  health: number;
  inDistress: boolean;
  needsAssistance: boolean;
  emergencyType: string | null;
  lastChatter: string;
}

export class NPCShipMonitor {
  private alertSystem: AlertSystem;
  private trackedShips: Map<string, { lastDistressAlert: number }> = new Map();
  private readonly ALERT_COOLDOWN = 30000; // 30 seconds between distress alerts per ship

  constructor(alertSystem: AlertSystem) {
    this.alertSystem = alertSystem;
  }

  /**
   * Monitor nearby NPC ships and generate alerts
   */
  public monitorNPCShips(
    npcShips: NPCShip[],
    playerPosition: { x: number; y: number; z: number },
    maxRange: number = 100000 // 100km default
  ): NPCShipContact[] {
    const contacts: NPCShipContact[] = [];
    const now = Date.now();

    for (const npc of npcShips) {
      const dx = npc.position.x - playerPosition.x;
      const dy = npc.position.y - playerPosition.y;
      const dz = npc.position.z - playerPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Only monitor ships within range
      if (distance > maxRange) continue;

      const bearing = Math.atan2(dy, dx) * (180 / Math.PI);
      const velocity = npc.velocity.length();
      const health = npc.subsystems.health.overall;
      const needsAssistance = npc.needsAssistance();
      const inDistress = npc.subsystems.isCriticallyDamaged();

      // Determine emergency type
      let emergencyType: string | null = null;
      if (needsAssistance) {
        const h = npc.subsystems.health;
        if (h.hull < 0.3) emergencyType = 'HULL_BREACH';
        else if (h.electrical < 0.2) emergencyType = 'POWER_FAILURE';
        else if (h.propulsion < 0.1) emergencyType = 'FUEL_DEPLETED';
        else if (h.lifeSupport < 0.3) emergencyType = 'LIFE_SUPPORT_FAILURE';
        else if (npc.subsystems.thermal.criticalOverheat) emergencyType = 'THERMAL_RUNAWAY';
        else emergencyType = 'SYSTEMS_CRITICAL';
      }

      // Generate alert for distressed ships
      if (needsAssistance && distance < 50000) { // 50km for distress alerts
        const tracked = this.trackedShips.get(npc.id);
        if (!tracked || (now - tracked.lastDistressAlert) > this.ALERT_COOLDOWN) {
          this.generateDistressAlert(npc, distance, emergencyType!);
          this.trackedShips.set(npc.id, { lastDistressAlert: now });
        }
      }

      contacts.push({
        id: npc.id,
        name: npc.name,
        type: npc.type,
        distance,
        bearing,
        velocity,
        health,
        inDistress,
        needsAssistance,
        emergencyType,
        lastChatter: npc.generateChatter()
      });
    }

    // Sort by distance (closest first)
    contacts.sort((a, b) => a.distance - b.distance);

    return contacts;
  }

  /**
   * Generate distress alert for NPC ship
   */
  private generateDistressAlert(npc: NPCShip, distance: number, emergencyType: string): void {
    const distanceKm = (distance / 1000).toFixed(1);

    const emergencyMessages: Record<string, string> = {
      'HULL_BREACH': `${npc.name} hull breach at ${distanceKm}km - requesting assistance`,
      'POWER_FAILURE': `${npc.name} power failure at ${distanceKm}km - battery critical`,
      'FUEL_DEPLETED': `${npc.name} fuel depleted at ${distanceKm}km - adrift`,
      'LIFE_SUPPORT_FAILURE': `${npc.name} life support failure at ${distanceKm}km - crew in danger`,
      'THERMAL_RUNAWAY': `${npc.name} reactor overheat at ${distanceKm}km - critical`,
      'SYSTEMS_CRITICAL': `${npc.name} multiple system failures at ${distanceKm}km`
    };

    const message = emergencyMessages[emergencyType] || `${npc.name} in distress at ${distanceKm}km`;

    // Determine priority based on distance and severity
    let priority = AlertPriority.P1_URGENT;
    if (distance < 10000) { // Within 10km - very close
      priority = AlertPriority.P0_CRITICAL;
    } else if (npc.subsystems.lifeSupport && npc.subsystems.health.lifeSupport < 0.2) {
      priority = AlertPriority.P0_CRITICAL; // Life support critical regardless of distance
    }

    this.alertSystem.addAlert(
      priority,
      AlertCategory.NAVIGATION,
      message,
      {
        station: 3, // Navigation station
        persistent: false,
        autoCloseDelay: 30 // Auto-close after 30 seconds
      }
    );
  }

  /**
   * Get detailed status for specific NPC ship
   */
  public getShipDetails(npc: NPCShip): string {
    const health = npc.subsystems.health;
    const elec = npc.subsystems.electrical;
    const fuel = npc.subsystems.fuel;
    const hull = npc.subsystems.hull;

    let status = `
╔══════════════════════════════════════════╗
║  ${npc.name.padEnd(38)} ║
║  ${npc.type.padEnd(38)} ║
╠══════════════════════════════════════════╣
║  STATUS: ${npc.status.padEnd(30)} ║
║  ─────────────────────────────────────── ║
║  SYSTEMS HEALTH:                         ║
║    Hull:        ${this.formatHealth(health.hull)}  ║
║    Electrical:  ${this.formatHealth(health.electrical)}  ║
║    Propulsion:  ${this.formatHealth(health.propulsion)}  ║`;

    if (npc.subsystems.lifeSupport) {
      status += `
║    Life Support:${this.formatHealth(health.lifeSupport)}  ║`;
    }

    if (npc.subsystems.weapons) {
      status += `
║    Weapons:     ${this.formatHealth(health.weapons)}  ║`;
    }

    status += `
║  ─────────────────────────────────────── ║
║  POWER:                                  ║
║    Reactor: ${elec.reactor.online ? 'ONLINE ' : 'OFFLINE'}                     ║
║    Battery: ${((elec.battery.charge / elec.battery.capacity) * 100).toFixed(0).padStart(3)}%                          ║
║  ─────────────────────────────────────── ║
║  FUEL:                                   ║
║    Main: ${((fuel.mainFuel.current / fuel.mainFuel.capacity) * 100).toFixed(0).padStart(3)}%                             ║
║    RCS:  ${((fuel.rcsFuel.current / fuel.rcsFuel.capacity) * 100).toFixed(0).padStart(3)}%                             ║
║  ─────────────────────────────────────── ║
║  HULL INTEGRITY: ${(hull.integrity * 100).toFixed(0).padStart(3)}%                   ║`;

    // Show breaches or fires
    const damaged = hull.compartments.filter(c => c.breached || c.onFire || c.integrity < 0.5);
    if (damaged.length > 0) {
      status += `
║  DAMAGE REPORT:                          ║`;
      for (const comp of damaged) {
        const status_str = comp.breached ? 'BREACH' : comp.onFire ? 'FIRE' : 'DAMAGED';
        status += `
║    ${comp.name.padEnd(20)} ${status_str.padEnd(10)}║`;
      }
    }

    status += `
╚══════════════════════════════════════════╝`;

    return status;
  }

  /**
   * Format health value with color indicators
   */
  private formatHealth(health: number): string {
    const percent = (health * 100).toFixed(0).padStart(3);
    let indicator = '█████'; // 5 bars

    if (health < 0.2) indicator = '█░░░░';
    else if (health < 0.4) indicator = '██░░░';
    else if (health < 0.6) indicator = '███░░';
    else if (health < 0.8) indicator = '████░';

    return `${percent}% ${indicator}`;
  }

  /**
   * Clear tracking for a specific ship (e.g., when it's destroyed or out of range)
   */
  public clearTracking(shipId: string): void {
    this.trackedShips.delete(shipId);
  }

  /**
   * Clear all tracking
   */
  public clearAllTracking(): void {
    this.trackedShips.clear();
  }
}
