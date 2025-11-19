/**
 * PlayerGameLoop - Main game loop integrating all player systems
 * This is the actual playable game layer
 */

import { InputManager } from '../core/input';
import { PlayerShipIntegration } from '../../universe-system/src/PlayerShipIntegration';
import { PlayerCombatInputHandler } from '../../universe-system/src/PlayerCombatInputHandler';
import { Spacecraft } from '../../physics-modules/src/spacecraft';
import { UniverseOrchestrator } from '../../universe-system/src/UniverseOrchestrator';
import { StarSystem } from '../../universe-system/src/StarSystem';

export type GameMode = 'FLIGHT' | 'COMBAT' | 'DOCKED' | 'MISSION_BOARD' | 'CREW_ROSTER' | 'RESEARCH_LAB' | 'INTEL_MARKET' | 'NPC_DIALOGUE';

export interface GameMessage {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'combat';
  timestamp: number;
}

export class PlayerGameLoop {
  private player: PlayerShipIntegration;
  private input: InputManager;
  private combatInput: PlayerCombatInputHandler;

  private currentMode: GameMode = 'FLIGHT';
  private messages: GameMessage[] = [];
  private maxMessages = 10;

  // UI state
  private showCombatHUD = false;
  private showMissionBoard = false;
  private showCrewRoster = false;
  private showResearchLab = false;
  private showIntelMarket = false;
  private showNPCDialogue = false;
  private selectedNPCId: string | null = null;

  // Frame tracking
  private lastFrameTime = Date.now();
  private frameCount = 0;

  constructor(
    spacecraft: Spacecraft,
    orchestrator: UniverseOrchestrator,
    initialSystem: StarSystem
  ) {
    this.player = new PlayerShipIntegration(spacecraft, orchestrator, initialSystem);
    this.input = new InputManager();
    this.combatInput = new PlayerCombatInputHandler(this.player, this.input);

    // Set up combat input message callback
    this.combatInput.setMessageCallback((msg, type) => {
      this.addMessage(msg, type === 'info' ? 'combat' : type);
    });

    this.addMessage('Game initialized. Press H for help.', 'info');
  }

  /**
   * Main game loop - call this every frame
   */
  public update(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastFrameTime) / 1000; // seconds
    this.lastFrameTime = now;
    this.frameCount++;

    // Update player systems
    const nearbyContacts = this.getNearbyContacts(); // Would get from universe
    this.player.update(deltaTime, nearbyContacts);

    // Handle input based on current mode
    this.handleInput();

    // Update combat input if in combat
    const combatState = this.player.getCombatState();
    if (combatState.inCombat || this.currentMode === 'COMBAT') {
      this.combatInput.update();
      this.showCombatHUD = true;
    } else {
      this.showCombatHUD = false;
    }

    // Auto-pay crew salaries daily
    if (this.frameCount % (60 * 60) === 0) { // Every hour (at 60fps)
      this.payCrewSalaries();
    }

    // Clear old messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    // Update input manager
    this.input.update();
  }

  /**
   * Handle input for current game mode
   */
  private handleInput(): void {
    // Mode switching
    if (this.input.isKeyJustPressed('h')) {
      this.showHelp();
    }

    if (this.input.isKeyJustPressed('m')) {
      this.toggleMissionBoard();
    }

    if (this.input.isKeyJustPressed('c')) {
      this.toggleCrewRoster();
    }

    if (this.input.isKeyJustPressed('r')) {
      this.toggleResearchLab();
    }

    if (this.input.isKeyJustPressed('i')) {
      this.toggleIntelMarket();
    }

    if (this.input.isKeyJustPressed('n')) {
      this.toggleNPCDialogue();
    }

    // Docking
    if (this.input.isKeyJustPressed('d')) {
      this.handleDocking();
    }

    // Reputation display
    if (this.input.isKeyJustPressed('p')) {
      this.showReputation();
    }

    // ESC to close menus
    if (this.input.isKeyJustPressed('escape')) {
      this.closeAllMenus();
    }
  }

  /**
   * Render the game UI (text-based for now)
   */
  public render(): string {
    const lines: string[] = [];

    // Header
    lines.push('='.repeat(80));
    lines.push(`SPACE TRADER SIM - Mode: ${this.currentMode}`);
    lines.push('='.repeat(80));
    lines.push('');

    // Main view based on mode
    if (this.showMissionBoard) {
      lines.push(...this.renderMissionBoard());
    } else if (this.showCrewRoster) {
      lines.push(...this.renderCrewRoster());
    } else if (this.showResearchLab) {
      lines.push(...this.renderResearchLab());
    } else if (this.showIntelMarket) {
      lines.push(...this.renderIntelMarket());
    } else if (this.showNPCDialogue) {
      lines.push(...this.renderNPCDialogue());
    } else {
      // Default flight view
      lines.push(...this.renderFlightView());
    }

    lines.push('');

    // Combat HUD overlay
    if (this.showCombatHUD) {
      lines.push(...this.renderCombatHUD());
      lines.push('');
    }

    // Messages
    lines.push('--- MESSAGES ---');
    for (const msg of this.messages.slice(-5)) {
      const prefix = {
        'info': '[INFO]',
        'success': '[SUCCESS]',
        'warning': '[WARNING]',
        'error': '[ERROR]',
        'combat': '[COMBAT]'
      }[msg.type];
      lines.push(`${prefix} ${msg.text}`);
    }

    lines.push('');
    lines.push('Press H for help');

    return lines.join('\n');
  }

  private renderFlightView(): string[] {
    const state = this.player.getState();
    const lines: string[] = [];

    lines.push('--- FLIGHT STATUS ---');
    lines.push(this.player.getStatusString());
    lines.push('');

    // Nearby NPCs
    const npcs = this.player.getNearbyNPCs();
    if (npcs.length > 0) {
      lines.push('--- NEARBY SHIPS ---');
      for (const npc of npcs.slice(0, 5)) {
        const hostile = npc.hostile ? '[HOSTILE]' : '';
        lines.push(`${npc.name} - ${(npc.distance / 1000).toFixed(1)}km ${hostile}`);
      }
      lines.push('Press N to hail nearest ship');
      lines.push('');
    }

    // Active missions summary
    const missions = this.player.getActiveMissions();
    if (missions.length > 0) {
      lines.push(`Active Missions: ${missions.length}`);
      lines.push('Press M to view mission board');
      lines.push('');
    }

    return lines;
  }

  private renderCombatHUD(): string[] {
    const lines: string[] = [];
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            COMBAT ALERT                                    ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');

    const status = this.player.getCombatStatus();
    lines.push(...status.split('\n'));

    lines.push('');
    lines.push('Controls: T=Target, SPACE=Fire Primary, F=Fire Secondary, W=Weapons, S=Shields, E=Evade');

    return lines;
  }

  private renderMissionBoard(): string[] {
    const lines: string[] = [];
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            MISSION BOARD                                   ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const state = this.player.getState();
    if (!state.dockedAt) {
      lines.push('Must be docked at a station to view missions.');
      return lines;
    }

    const available = this.player.getAvailableMissions();
    const active = this.player.getActiveMissions();

    lines.push(`Station: ${state.dockedAt.name}`);
    lines.push(`Active Missions: ${active.length}`);
    lines.push('');

    if (active.length > 0) {
      lines.push('--- ACTIVE MISSIONS ---');
      for (let i = 0; i < active.length; i++) {
        const m = active[i];
        lines.push(`[${i + 1}] ${m.title}`);
        lines.push(`    Type: ${m.type} | Reward: ${m.creditReward} credits`);
        lines.push(`    ${m.description}`);
        if (m.timeLimit) {
          const remaining = (m.expiresAt || 0) - Date.now() / 1000;
          lines.push(`    Time remaining: ${Math.floor(remaining / 60)} minutes`);
        }
        lines.push('');
      }
    }

    lines.push('--- AVAILABLE MISSIONS ---');
    if (available.length === 0) {
      lines.push('No missions available at this station.');
    } else {
      for (let i = 0; i < available.length; i++) {
        const m = available[i];
        lines.push(`[${i + 1}] ${m.title}`);
        lines.push(`    Type: ${m.type} | Reward: ${m.creditReward} credits`);
        lines.push(`    ${m.description}`);
        lines.push(`    Press ${i + 1} to accept this mission`);
        lines.push('');
      }
    }

    lines.push('Press ESC to close | Press M to toggle');

    return lines;
  }

  private renderCrewRoster(): string[] {
    const lines: string[] = [];
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            CREW ROSTER                                     ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const crew = this.player.getCrew();
    const available = this.player.getAvailableCrewForHire(5);

    lines.push('--- CURRENT CREW ---');
    if (crew.length === 0) {
      lines.push('No crew members hired.');
    } else {
      lines.push(this.player.getCrewStatus());
    }
    lines.push('');

    const state = this.player.getState();
    if (state.dockedAt) {
      lines.push('--- AVAILABLE FOR HIRE ---');
      for (let i = 0; i < available.length; i++) {
        const c = available[i];
        const hiringBonus = c.salary * 30;
        lines.push(`[${i + 1}] ${c.name} - ${c.role}`);
        lines.push(`    Salary: ${c.salary} cr/day | Hiring bonus: ${hiringBonus} cr`);
        lines.push(`    Skills: ENG ${c.skills.engineering.toFixed(0)} | WPN ${c.skills.weapons.toFixed(0)} | PIL ${c.skills.piloting.toFixed(0)}`);
        if (c.traits.length > 0) {
          lines.push(`    Traits: ${c.traits.join(', ')}`);
        }
        lines.push(`    Press ${i + 1} to hire`);
        lines.push('');
      }
    }

    lines.push('Press ESC to close | Press C to toggle');

    return lines;
  }

  private renderResearchLab(): string[] {
    const lines: string[] = [];
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                          RESEARCH LABORATORY                               ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const active = this.player.getActiveResearch();
    const available = this.player.getAvailableResearch();
    const completed = this.player.getCompletedResearch();

    if (active) {
      lines.push('--- ACTIVE RESEARCH ---');
      lines.push(`${active.name}`);
      lines.push(`Progress: ${(active.progress! * 100).toFixed(1)}%`);
      const remaining = active.timeRequired * (1 - (active.progress || 0));
      lines.push(`Time remaining: ${remaining.toFixed(1)} days`);
      lines.push('');
    }

    lines.push(`Completed Research: ${completed.length}`);
    lines.push('');

    lines.push('--- AVAILABLE RESEARCH ---');
    if (available.length === 0) {
      lines.push('No research projects available.');
    } else {
      for (let i = 0; i < available.length; i++) {
        const r = available[i];
        lines.push(`[${i + 1}] ${r.name}`);
        lines.push(`    Cost: ${r.cost} credits | Time: ${r.timeRequired} days`);
        lines.push(`    ${r.description}`);
        if (r.requires && r.requires.length > 0) {
          lines.push(`    Requires: ${r.requires.join(', ')}`);
        }
        lines.push(`    Press ${i + 1} to start research`);
        lines.push('');
      }
    }

    lines.push('Press ESC to close | Press R to toggle');

    return lines;
  }

  private renderIntelMarket(): string[] {
    const lines: string[] = [];
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        INTELLIGENCE MARKET                                 ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const intel = this.player.getAllIntel();

    lines.push('--- YOUR INTELLIGENCE ---');
    if (intel.length === 0) {
      lines.push('No intelligence gathered.');
      lines.push('');
      lines.push('Press G to gather intel from recent news');
    } else {
      for (let i = 0; i < intel.length; i++) {
        const int = intel[i];
        const age = (Date.now() / 1000 - int.timestamp) / 3600;
        lines.push(`[${i + 1}] [${int.type}] ${int.content}`);
        lines.push(`    Value: ${int.value} cr | Reliability: ${(int.reliability * 100).toFixed(0)}% | Age: ${age.toFixed(1)}h`);
        lines.push(`    Press ${i + 1} to sell`);
        lines.push('');
      }
    }

    lines.push('Press ESC to close | Press I to toggle | Press G to gather from news');

    return lines;
  }

  private renderNPCDialogue(): string[] {
    const lines: string[] = [];
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                          NPC COMMUNICATION                                 ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const npcs = this.player.getNearbyNPCs();

    if (npcs.length === 0) {
      lines.push('No ships in range to hail.');
      return lines;
    }

    if (!this.selectedNPCId) {
      lines.push('--- NEARBY SHIPS ---');
      for (let i = 0; i < Math.min(npcs.length, 10); i++) {
        const npc = npcs[i];
        lines.push(`[${i + 1}] ${npc.name} - ${npc.type} (${(npc.distance / 1000).toFixed(1)}km)`);
      }
      lines.push('');
      lines.push('Press number to hail ship');
    } else {
      const npc = npcs.find(n => n.id === this.selectedNPCId);
      if (!npc) {
        this.selectedNPCId = null;
        lines.push('Ship out of range.');
        return lines;
      }

      const hail = this.player.hailNPC(npc.id);
      if (hail) {
        lines.push(`--- COMMUNICATION WITH ${npc.name} ---`);
        lines.push('');
        lines.push(hail.response);
        lines.push('');
        lines.push('--- ACTIONS ---');
        for (let i = 0; i < hail.availableOptions.length; i++) {
          const option = hail.availableOptions[i];
          lines.push(`[${i + 1}] ${option}`);
        }
        lines.push('');
        lines.push('Press number to select action');
      }
    }

    lines.push('');
    lines.push('Press ESC to close | Press N to toggle');

    return lines;
  }

  private showHelp(): void {
    console.clear();
    console.log('=== CONTROLS ===');
    console.log('');
    console.log('GENERAL:');
    console.log('  H - Show this help');
    console.log('  D - Dock/Undock at nearest station');
    console.log('  P - Show reputation');
    console.log('  ESC - Close menus');
    console.log('');
    console.log('MENUS:');
    console.log('  M - Mission Board (when docked)');
    console.log('  C - Crew Roster');
    console.log('  R - Research Lab');
    console.log('  I - Intelligence Market');
    console.log('  N - NPC Communication');
    console.log('');
    console.log('COMBAT:');
    console.log('  T - Target nearest hostile');
    console.log('  TAB - Cycle targets');
    console.log('  SPACE - Fire primary weapon');
    console.log('  F - Fire secondary weapon');
    console.log('  W - Toggle weapons armed/safe');
    console.log('  S - Toggle shields');
    console.log('  E - Toggle evasive maneuvers');
    console.log('');
    console.log(this.combatInput.getControlsHelp());
  }

  private toggleMissionBoard(): void {
    const state = this.player.getState();
    if (!state.dockedAt) {
      this.addMessage('Must be docked at a station to view missions.', 'warning');
      return;
    }
    this.showMissionBoard = !this.showMissionBoard;
    if (this.showMissionBoard) {
      this.closeOtherMenus('mission');
      this.currentMode = 'MISSION_BOARD';
    } else {
      this.currentMode = 'FLIGHT';
    }
  }

  private toggleCrewRoster(): void {
    this.showCrewRoster = !this.showCrewRoster;
    if (this.showCrewRoster) {
      this.closeOtherMenus('crew');
      this.currentMode = 'CREW_ROSTER';
    } else {
      this.currentMode = 'FLIGHT';
    }
  }

  private toggleResearchLab(): void {
    this.showResearchLab = !this.showResearchLab;
    if (this.showResearchLab) {
      this.closeOtherMenus('research');
      this.currentMode = 'RESEARCH_LAB';
    } else {
      this.currentMode = 'FLIGHT';
    }
  }

  private toggleIntelMarket(): void {
    this.showIntelMarket = !this.showIntelMarket;
    if (this.showIntelMarket) {
      this.closeOtherMenus('intel');
      this.currentMode = 'INTEL_MARKET';
    } else {
      this.currentMode = 'FLIGHT';
    }
  }

  private toggleNPCDialogue(): void {
    this.showNPCDialogue = !this.showNPCDialogue;
    if (this.showNPCDialogue) {
      this.closeOtherMenus('npc');
      this.currentMode = 'NPC_DIALOGUE';
    } else {
      this.currentMode = 'FLIGHT';
      this.selectedNPCId = null;
    }
  }

  private closeOtherMenus(except?: string): void {
    if (except !== 'mission') this.showMissionBoard = false;
    if (except !== 'crew') this.showCrewRoster = false;
    if (except !== 'research') this.showResearchLab = false;
    if (except !== 'intel') this.showIntelMarket = false;
    if (except !== 'npc') this.showNPCDialogue = false;
  }

  private closeAllMenus(): void {
    this.showMissionBoard = false;
    this.showCrewRoster = false;
    this.showResearchLab = false;
    this.showIntelMarket = false;
    this.showNPCDialogue = false;
    this.selectedNPCId = null;
    this.currentMode = 'FLIGHT';
  }

  private async handleDocking(): Promise<void> {
    const state = this.player.getState();

    if (state.isDocked) {
      const result = this.player.undock();
      this.addMessage(result.message, result.success ? 'success' : 'error');
    } else {
      const result = await this.player.requestDocking();
      this.addMessage(result.message, result.success ? 'success' : 'error');
      if (result.success) {
        this.currentMode = 'DOCKED';
      }
    }
  }

  private showReputation(): void {
    console.log('\n' + this.player.getReputationSummary() + '\n');
  }

  private payCrewSalaries(): void {
    const result = this.player.payCrewSalaries();
    if (result.totalPaid > 0) {
      this.addMessage(`Paid ${result.totalPaid} credits in crew salaries.`, 'info');
    }
  }

  private addMessage(text: string, type: GameMessage['type']): void {
    this.messages.push({
      text,
      type,
      timestamp: Date.now()
    });
  }

  private getNearbyContacts(): any[] {
    // This would get actual NPC ships from the universe
    // For now, return empty array
    return [];
  }

  /**
   * Get player integration for external access
   */
  public getPlayer(): PlayerShipIntegration {
    return this.player;
  }

  /**
   * Get current game mode
   */
  public getMode(): GameMode {
    return this.currentMode;
  }

  /**
   * Get recent messages
   */
  public getMessages(): GameMessage[] {
    return [...this.messages];
  }
}
