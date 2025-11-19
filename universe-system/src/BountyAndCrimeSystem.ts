/**
 * BountyAndCrimeSystem - Wanted levels, bounties, security response
 * Track crimes, bounties on player head, security forces spawn and pursue
 */

import { Vector3 } from './CelestialBody';
import { StarSystem } from './StarSystem';
import { UniverseOrchestrator } from './UniverseOrchestrator';

export type CrimeType =
  | 'ASSAULT' // Attacking non-hostile ship
  | 'MURDER' // Destroying non-hostile ship
  | 'THEFT' // Stealing cargo
  | 'SMUGGLING' // Illegal cargo
  | 'TRESPASSING' // Entering restricted area
  | 'FLEEING' // Fleeing from security
  | 'RESISTING_SCAN' // Refusing cargo scan
  | 'STATION_ASSAULT' // Attacking station
  | 'PIRACY'; // Demanding cargo

export interface Crime {
  id: string;
  type: CrimeType;
  timestamp: number;
  systemId: string;
  factionId: string; // Faction laws violated

  // Details
  description: string;
  severity: number; // 1-10
  bountyAdded: number;
  witnessed: boolean;

  // Victims
  victimId?: string;
  victimName?: string;
}

export interface Bounty {
  factionId: string;
  factionName: string;
  amount: number; // credits
  crimes: Crime[];
  wantedLevel: number; // 1-5 stars
  issueDate: number;
  expiryDate?: number; // Some bounties expire

  // Status
  active: boolean;
  huntersDispatched: boolean;
  securityAlerted: boolean;
}

export interface SecurityResponse {
  systemId: string;
  factionId: string;
  threatLevel: number; // 1-10
  forcesDispatched: number; // Number of ships
  responseTime: number; // Seconds until arrival
  active: boolean;
}

export class BountyAndCrimeSystem {
  private orchestrator: UniverseOrchestrator;

  private crimes: Crime[] = [];
  private bounties: Map<string, Bounty> = new Map(); // factionId -> Bounty
  private activeResponses: SecurityResponse[] = [];

  private crimeIdCounter = 0;

  // Crime severity multipliers
  private readonly SEVERITY_MULTIPLIERS = {
    ASSAULT: 2,
    MURDER: 5,
    THEFT: 1.5,
    SMUGGLING: 3,
    TRESPASSING: 0.5,
    FLEEING: 1,
    RESISTING_SCAN: 1.5,
    STATION_ASSAULT: 8,
    PIRACY: 4
  };

  // Base bounties
  private readonly BASE_BOUNTIES = {
    ASSAULT: 500,
    MURDER: 5000,
    THEFT: 1000,
    SMUGGLING: 2000,
    TRESPASSING: 200,
    FLEEING: 500,
    RESISTING_SCAN: 300,
    STATION_ASSAULT: 10000,
    PIRACY: 3000
  };

  constructor(orchestrator: UniverseOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Commit a crime
   */
  public commitCrime(
    type: CrimeType,
    systemId: string,
    factionId: string,
    severity: number,
    witnessed: boolean,
    victimId?: string,
    victimName?: string
  ): Crime {
    const bountyAmount = this.calculateBounty(type, severity);

    const crime: Crime = {
      id: `crime_${this.crimeIdCounter++}`,
      type,
      timestamp: Date.now() / 1000,
      systemId,
      factionId,
      description: this.getCrimeDescription(type, victimName),
      severity,
      bountyAdded: bountyAmount,
      witnessed,
      victimId,
      victimName
    };

    this.crimes.push(crime);

    // Add to bounty
    if (witnessed) {
      this.addBounty(factionId, crime);
      console.log(`[CRIME] Witnessed ${type}! +${bountyAmount} credits bounty from ${factionId}`);
    } else {
      console.log(`[CRIME] Committed ${type} (unwitnessed)`);
    }

    // Record event
    this.orchestrator.recordEvent({
      id: crime.id,
      timestamp: crime.timestamp,
      type: 'CRIME' as any,
      category: 'PERSONAL' as any,
      severity: severity,
      location: { x: 0, y: 0, z: 0 },
      systemId,
      participants: ['player_ship', factionId],
      description: crime.description,
      data: { crimeType: type, bounty: bountyAmount, witnessed },
      consequences: [],
      witnessed: witnessed,
      priority: witnessed ? 8 : 5,
      tags: ['crime', type.toLowerCase()]
    });

    // Trigger security response if serious enough
    if (witnessed && severity >= 5) {
      this.triggerSecurityResponse(systemId, factionId, severity);
    }

    return crime;
  }

  /**
   * Add or update bounty
   */
  private addBounty(factionId: string, crime: Crime): void {
    let bounty = this.bounties.get(factionId);

    if (!bounty) {
      bounty = {
        factionId,
        factionName: factionId, // Would get from faction system
        amount: 0,
        crimes: [],
        wantedLevel: 0,
        issueDate: Date.now() / 1000,
        active: true,
        huntersDispatched: false,
        securityAlerted: false
      };
      this.bounties.set(factionId, bounty);
    }

    bounty.amount += crime.bountyAdded;
    bounty.crimes.push(crime);
    bounty.wantedLevel = this.calculateWantedLevel(bounty.amount);

    console.log(`[BOUNTY] ${factionId}: ${bounty.amount} credits (${bounty.wantedLevel} ★)`);

    // Dispatch bounty hunters at higher wanted levels
    if (bounty.wantedLevel >= 3 && !bounty.huntersDispatched) {
      bounty.huntersDispatched = true;
      console.log(`[BOUNTY] ⚠ Bounty hunters dispatched!`);
    }
  }

  /**
   * Trigger security response
   */
  private triggerSecurityResponse(systemId: string, factionId: string, threatLevel: number): void {
    // Check if already responding
    const existing = this.activeResponses.find(r => r.systemId === systemId && r.factionId === factionId);
    if (existing) {
      existing.threatLevel = Math.max(existing.threatLevel, threatLevel);
      existing.forcesDispatched += Math.floor(threatLevel / 2);
      return;
    }

    const forcesDispatched = Math.min(10, Math.floor(threatLevel / 2) + 1);
    const responseTime = 60 + Math.random() * 60; // 1-2 minutes

    const response: SecurityResponse = {
      systemId,
      factionId,
      threatLevel,
      forcesDispatched,
      responseTime,
      active: true
    };

    this.activeResponses.push(response);

    console.log(`[SECURITY] ⚠⚠⚠ ${factionId} security forces dispatched!`);
    console.log(`  Forces: ${forcesDispatched} ships`);
    console.log(`  ETA: ${Math.floor(responseTime)}s`);
  }

  /**
   * Update security responses
   */
  public update(deltaTime: number): SecurityResponse[] {
    const arrivals: SecurityResponse[] = [];

    for (const response of this.activeResponses) {
      response.responseTime -= deltaTime;

      if (response.responseTime <= 0 && response.active) {
        response.active = false;
        arrivals.push(response);
        console.log(`[SECURITY] Security forces have arrived! ${response.forcesDispatched} hostile ships!`);
      }
    }

    // Clean up inactive responses
    this.activeResponses = this.activeResponses.filter(r => r.responseTime > -60);

    return arrivals;
  }

  /**
   * Pay off bounty
   */
  public payBounty(factionId: string, credits: number): {
    success: boolean;
    message: string;
    amountPaid: number;
    remainingBounty: number;
  } {
    const bounty = this.bounties.get(factionId);

    if (!bounty || bounty.amount === 0) {
      return {
        success: false,
        message: 'No bounty with this faction',
        amountPaid: 0,
        remainingBounty: 0
      };
    }

    if (credits < bounty.amount) {
      return {
        success: false,
        message: `Insufficient credits. Bounty: ${bounty.amount}, have: ${credits}`,
        amountPaid: 0,
        remainingBounty: bounty.amount
      };
    }

    const amountPaid = bounty.amount;
    bounty.amount = 0;
    bounty.wantedLevel = 0;
    bounty.active = false;
    bounty.crimes = [];

    console.log(`[BOUNTY] Paid ${amountPaid} credits to clear bounty with ${factionId}`);

    return {
      success: true,
      message: `Bounty cleared with ${factionId}`,
      amountPaid,
      remainingBounty: 0
    };
  }

  /**
   * Get total bounty on player
   */
  public getTotalBounty(): number {
    let total = 0;
    for (const bounty of this.bounties.values()) {
      if (bounty.active) {
        total += bounty.amount;
      }
    }
    return total;
  }

  /**
   * Get bounty with faction
   */
  public getBounty(factionId: string): Bounty | null {
    return this.bounties.get(factionId) || null;
  }

  /**
   * Get all active bounties
   */
  public getActiveBounties(): Bounty[] {
    return Array.from(this.bounties.values()).filter(b => b.active && b.amount > 0);
  }

  /**
   * Get highest wanted level
   */
  public getHighestWantedLevel(): number {
    let max = 0;
    for (const bounty of this.bounties.values()) {
      if (bounty.active) {
        max = Math.max(max, bounty.wantedLevel);
      }
    }
    return max;
  }

  /**
   * Check if wanted by faction
   */
  public isWanted(factionId: string): boolean {
    const bounty = this.bounties.get(factionId);
    return bounty ? bounty.active && bounty.amount > 0 : false;
  }

  /**
   * Get bounty status string
   */
  public getBountyStatus(): string {
    const lines: string[] = [];

    lines.push('=== BOUNTY STATUS ===');

    const activeBounties = this.getActiveBounties();

    if (activeBounties.length === 0) {
      lines.push('No active bounties');
      lines.push('Status: LAW-ABIDING');
    } else {
      const totalBounty = this.getTotalBounty();
      const maxWanted = this.getHighestWantedLevel();

      lines.push(`Total Bounty: ${totalBounty.toFixed(0)} credits`);
      lines.push(`Max Wanted Level: ${maxWanted} ★`);
      lines.push('');

      for (const bounty of activeBounties) {
        const stars = '★'.repeat(bounty.wantedLevel) + '☆'.repeat(5 - bounty.wantedLevel);
        lines.push(`${bounty.factionName}:`);
        lines.push(`  Bounty: ${bounty.amount.toFixed(0)} credits`);
        lines.push(`  Wanted: ${stars}`);
        lines.push(`  Crimes: ${bounty.crimes.length}`);

        if (bounty.huntersDispatched) {
          lines.push(`  ⚠ Bounty hunters active`);
        }

        lines.push('');
      }

      // Recent crimes
      if (this.crimes.length > 0) {
        lines.push('Recent Crimes:');
        for (const crime of this.crimes.slice(-5).reverse()) {
          const time = Math.floor(Date.now() / 1000 - crime.timestamp);
          lines.push(`  [${time}s ago] ${crime.type}: ${crime.description} (+${crime.bountyAdded} credits)`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get security alert status
   */
  public getSecurityStatus(): string {
    if (this.activeResponses.length === 0) {
      return 'No active security alerts';
    }

    const lines: string[] = [];
    lines.push('⚠⚠⚠ ACTIVE SECURITY ALERTS ⚠⚠⚠');

    for (const response of this.activeResponses) {
      if (response.active) {
        lines.push(`${response.factionId}: ${response.forcesDispatched} ships ETA ${Math.floor(response.responseTime)}s`);
      }
    }

    return lines.join('\n');
  }

  // Private methods
  private calculateBounty(type: CrimeType, severity: number): number {
    const base = this.BASE_BOUNTIES[type] || 1000;
    const multiplier = this.SEVERITY_MULTIPLIERS[type] || 1;
    return Math.floor(base * multiplier * (severity / 5));
  }

  private calculateWantedLevel(bountyAmount: number): number {
    if (bountyAmount >= 50000) return 5;
    if (bountyAmount >= 20000) return 4;
    if (bountyAmount >= 10000) return 3;
    if (bountyAmount >= 5000) return 2;
    if (bountyAmount >= 1000) return 1;
    return 0;
  }

  private getCrimeDescription(type: CrimeType, victimName?: string): string {
    switch (type) {
      case 'ASSAULT':
        return victimName ? `Assault on ${victimName}` : 'Assault on civilian ship';
      case 'MURDER':
        return victimName ? `Murder of ${victimName}` : 'Murder of civilian';
      case 'THEFT':
        return 'Theft of cargo';
      case 'SMUGGLING':
        return 'Smuggling contraband';
      case 'TRESPASSING':
        return 'Trespassing in restricted area';
      case 'FLEEING':
        return 'Fleeing from authorities';
      case 'RESISTING_SCAN':
        return 'Resisting cargo scan';
      case 'STATION_ASSAULT':
        return victimName ? `Assault on ${victimName}` : 'Assault on station';
      case 'PIRACY':
        return 'Piracy and extortion';
      default:
        return 'Criminal activity';
    }
  }
}
