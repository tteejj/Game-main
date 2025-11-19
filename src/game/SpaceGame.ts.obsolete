/**
 * SpaceGame - Main integrated game with player interaction systems
 * Extends the base Game class and integrates all player systems with canvas-based UI
 */

import { Game, GameState } from '../core/game';
import { Renderer } from '../core/renderer';
import { InputManager } from '../core/input';
import { PlayerShipIntegration } from '../../universe-system/src/PlayerShipIntegration';
import { UniverseOrchestrator } from '../../universe-system/src/UniverseOrchestrator';
import { StarSystem } from '../../universe-system/src/StarSystem';
import { StationGenerator } from '../../universe-system/src/StationGenerator';
import { Spacecraft } from '../../physics-modules/src/spacecraft';
import { SevenSegmentDisplay } from '../ui/components/seven-segment-display';
import { AnalogGauge } from '../ui/components/analog-gauge';
import { AsciiBox } from '../ui/components/ascii-box';
import { Controls } from '../ui/components/controls';
import { SpaceRenderer, SpaceScene } from '../rendering/space-renderer';
import { VisualEffects } from '../rendering/visual-effects';
import { PerformanceMonitor } from '../utils/performance-monitor';

type GameMode = 'FLIGHT' | 'DOCKED' | 'MISSION_BOARD' | 'CREW_ROSTER' |
                'RESEARCH_LAB' | 'INTEL_BROKER' | 'CARGO_HOLD' | 'TRAVEL_MAP';

interface ShipContact {
  id: string;
  name: string;
  distance: number;
  faction: string;
  type: string;
  hostile: boolean;
}

export class SpaceGame extends Game {
  // Core systems
  private input: InputManager;
  private player: PlayerShipIntegration;
  private orchestrator: UniverseOrchestrator;
  private currentSystem: StarSystem;
  private playerShip: Spacecraft;

  // Game mode
  private mode: GameMode = 'FLIGHT';
  private previousMode: GameMode = 'FLIGHT';

  // UI Components
  private sevenSegment: SevenSegmentDisplay;
  private asciiBox: AsciiBox;
  private controls: Controls;

  // Rendering components
  private spaceRenderer: SpaceRenderer;
  private visualEffects: VisualEffects;
  private perfMonitor: PerformanceMonitor;

  // UI State
  private selectedMenuIndex: number = 0;
  private scrollOffset: number = 0;
  private showHelp: boolean = false;
  private showTrajectory: boolean = true;
  private showPerfStats: boolean = false;

  // Nearby contacts for UI
  private nearbyContacts: ShipContact[] = [];

  constructor(renderer: Renderer) {
    super(renderer);

    console.log('Initializing Space Game...');

    // Initialize input
    this.input = new InputManager();

    // Initialize UI components
    this.sevenSegment = new SevenSegmentDisplay({
      digitWidth: 20,
      digitHeight: 30,
      segmentWidth: 2,
      spacing: 5,
      glowIntensity: 0.2
    });
    this.asciiBox = new AsciiBox();
    this.controls = new Controls();

    // Initialize rendering components
    this.spaceRenderer = new SpaceRenderer(renderer.ctx, renderer.palette);
    this.visualEffects = new VisualEffects(renderer.ctx, renderer.palette);
    this.perfMonitor = new PerformanceMonitor();

    // Initialize universe
    this.orchestrator = new UniverseOrchestrator();
    this.currentSystem = this.createStartingSystem();

    // Create player spacecraft with default config
    this.playerShip = new Spacecraft();

    // Initialize player integration (creates its own crew/research/news systems)
    this.player = new PlayerShipIntegration(
      this.playerShip,
      this.orchestrator,
      this.currentSystem
    );

    // Auto-dock at starting station
    const startStation = this.currentSystem.stations[0];
    if (startStation) {
      this.player.requestDocking();
      this.mode = 'DOCKED';
    }

    this.setState(GameState.PLAYING);
    console.log('Space Game initialized!');
  }

  protected update(dt: number): void {
    // Start frame timing
    const frameStart = this.perfMonitor.startFrame();

    this.input.update();

    // Global controls
    if (this.input.isKeyJustPressed('h')) {
      this.showHelp = !this.showHelp;
    }

    if (this.input.isKeyJustPressed('f3')) {
      this.showPerfStats = !this.showPerfStats;
    }

    if (this.input.isKeyJustPressed('escape')) {
      this.togglePause();
    }

    if (this.showHelp) {
      return; // Don't process other input when help is shown
    }

    // Update player systems with timing
    let perfStart = this.perfMonitor.startUpdate('player');
    this.nearbyContacts = this.getNearbyShips();
    this.player.update(dt, this.nearbyContacts.map(c => ({
      id: c.id,
      name: c.name,
      position: { x: 0, y: 0, z: 0 }, // Would be real positions
      faction: c.faction,
      hostile: c.hostile
    })));
    this.perfMonitor.endUpdate('player', perfStart);

    // Update universe systems with timing
    perfStart = this.perfMonitor.startUpdate('universe');
    this.orchestrator.update(dt);
    this.perfMonitor.endUpdate('universe', perfStart);

    // Mode-specific input
    switch (this.mode) {
      case 'FLIGHT':
        this.handleFlightInput();
        break;
      case 'DOCKED':
        this.handleDockedInput();
        break;
      case 'MISSION_BOARD':
        this.handleMissionBoardInput();
        break;
      case 'CREW_ROSTER':
        this.handleCrewRosterInput();
        break;
      case 'RESEARCH_LAB':
        this.handleResearchLabInput();
        break;
      case 'INTEL_BROKER':
        this.handleIntelBrokerInput();
        break;
      case 'CARGO_HOLD':
        this.handleCargoHoldInput();
        break;
      case 'TRAVEL_MAP':
        this.handleTravelMapInput();
        break;
    }

    // End frame timing
    this.perfMonitor.endFrame(frameStart);
  }

  protected render(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    renderer.clear();

    if (this.showHelp) {
      this.renderHelp();
    } else {
      // Render based on current mode
      switch (this.mode) {
        case 'FLIGHT':
          this.renderFlightView();
          break;
        case 'DOCKED':
          this.renderDockedView();
          break;
        case 'MISSION_BOARD':
          this.renderMissionBoard();
          break;
        case 'CREW_ROSTER':
          this.renderCrewRoster();
          break;
        case 'RESEARCH_LAB':
          this.renderResearchLab();
          break;
        case 'INTEL_BROKER':
          this.renderIntelBroker();
          break;
        case 'CARGO_HOLD':
          this.renderCargoHold();
          break;
        case 'TRAVEL_MAP':
          this.renderTravelMap();
          break;
      }
    }

    // Apply CRT effects
    renderer.applyScanlines();
    renderer.applyGlow();

    // Performance stats
    if (this.showPerfStats) {
      this.perfMonitor.renderStats(ctx, 10, renderer.height - 220, palette);
    } else {
      // Just show FPS
      this.perfMonitor.renderMini(ctx, renderer.width - 10, 10, palette);
    }
  }

  // ===== INPUT HANDLERS =====

  private handleFlightInput(): void {
    const combatState = this.player.getCombatState();

    // Combat controls
    if (this.input.isKeyJustPressed('t')) {
      this.player.targetNearestHostile();
    }
    if (this.input.isKeyJustPressed('tab')) {
      this.player.cycleTargets();
    }
    if (this.input.isKeyPressed(' ')) {
      this.player.firePrimaryWeapon();
    }
    if (this.input.isKeyJustPressed('f')) {
      this.player.fireSecondaryWeapon();
    }
    if (this.input.isKeyJustPressed('w')) {
      this.player.toggleWeapons();
    }
    if (this.input.isKeyJustPressed('s')) {
      this.player.toggleShields();
    }

    // Navigation
    if (this.input.isKeyJustPressed('d')) {
      // Request docking if near station
      const state = this.player.getState();
      if (!state.isDocked && this.currentSystem.stations.length > 0) {
        this.player.requestDocking();
        this.mode = 'DOCKED';
      }
    }

    // View controls
    if (this.input.isKeyJustPressed('[')) {
      this.spaceRenderer.zoomOut();
    }
    if (this.input.isKeyJustPressed(']')) {
      this.spaceRenderer.zoomIn();
    }
    if (this.input.isKeyJustPressed('v')) {
      this.showTrajectory = !this.showTrajectory;
    }

    // Menu access (when docked)
    const state = this.player.getState();
    if (state.isDocked) {
      if (this.input.isKeyJustPressed('m')) {
        this.mode = 'MISSION_BOARD';
        this.selectedMenuIndex = 0;
      }
      if (this.input.isKeyJustPressed('c')) {
        this.mode = 'CREW_ROSTER';
        this.selectedMenuIndex = 0;
      }
      if (this.input.isKeyJustPressed('r')) {
        this.mode = 'RESEARCH_LAB';
        this.selectedMenuIndex = 0;
      }
    }
  }

  private handleDockedInput(): void {
    // Navigation keys for menu
    if (this.input.isKeyJustPressed('arrowup')) {
      this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
    }
    if (this.input.isKeyJustPressed('arrowdown')) {
      this.selectedMenuIndex = Math.min(7, this.selectedMenuIndex + 1);
    }
    if (this.input.isKeyJustPressed('enter')) {
      this.handleDockedMenuSelection();
    }

    // Quick keys
    if (this.input.isKeyJustPressed('m')) {
      this.mode = 'MISSION_BOARD';
      this.selectedMenuIndex = 0;
    }
    if (this.input.isKeyJustPressed('c')) {
      this.mode = 'CREW_ROSTER';
      this.selectedMenuIndex = 0;
    }
    if (this.input.isKeyJustPressed('r')) {
      this.mode = 'RESEARCH_LAB';
      this.selectedMenuIndex = 0;
    }
    if (this.input.isKeyJustPressed('i')) {
      this.mode = 'INTEL_BROKER';
      this.selectedMenuIndex = 0;
    }

    // Undock
    if (this.input.isKeyJustPressed('u')) {
      this.player.undock();
      this.mode = 'FLIGHT';
    }

    // Back
    if (this.input.isKeyJustPressed('backspace')) {
      this.player.undock();
      this.mode = 'FLIGHT';
    }
  }

  private handleDockedMenuSelection(): void {
    switch (this.selectedMenuIndex) {
      case 0: // Mission Board
        this.mode = 'MISSION_BOARD';
        this.selectedMenuIndex = 0;
        break;
      case 1: // Crew Roster
        this.mode = 'CREW_ROSTER';
        this.selectedMenuIndex = 0;
        break;
      case 2: // Research Lab
        this.mode = 'RESEARCH_LAB';
        this.selectedMenuIndex = 0;
        break;
      case 3: // Intel Broker
        this.mode = 'INTEL_BROKER';
        this.selectedMenuIndex = 0;
        break;
      case 4: // Cargo Hold
        this.mode = 'CARGO_HOLD';
        this.selectedMenuIndex = 0;
        break;
      case 5: // Refuel/Repair
        // Refuel main tank with hydrazine
        this.player.refuel('hydrazine', 1000);
        break;
      case 6: // Travel Map
        this.mode = 'TRAVEL_MAP';
        this.selectedMenuIndex = 0;
        break;
      case 7: // Undock
        this.player.undock();
        this.mode = 'FLIGHT';
        break;
    }
  }

  private handleMissionBoardInput(): void {
    const missions = this.player.getAvailableMissions();

    if (this.input.isKeyJustPressed('arrowup')) {
      this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
    }
    if (this.input.isKeyJustPressed('arrowdown')) {
      this.selectedMenuIndex = Math.min(missions.length - 1, this.selectedMenuIndex + 1);
    }
    if (this.input.isKeyJustPressed('enter') && missions.length > 0) {
      const mission = missions[this.selectedMenuIndex];
      this.player.acceptMission(mission.id);
    }
    if (this.input.isKeyJustPressed('backspace')) {
      this.mode = 'DOCKED';
      this.selectedMenuIndex = 0;
    }
  }

  private handleCrewRosterInput(): void {
    const crew = this.player.getCrew();

    if (this.input.isKeyJustPressed('arrowup')) {
      this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
    }
    if (this.input.isKeyJustPressed('arrowdown')) {
      this.selectedMenuIndex = Math.min(crew.length, this.selectedMenuIndex + 1);
    }
    if (this.input.isKeyJustPressed('backspace')) {
      this.mode = 'DOCKED';
      this.selectedMenuIndex = 0;
    }
  }

  private handleResearchLabInput(): void {
    const available = this.player.getAvailableResearch();
    const active = this.player.getActiveResearch();

    const totalItems = available.length + (active ? 1 : 0);

    if (this.input.isKeyJustPressed('arrowup')) {
      this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
    }
    if (this.input.isKeyJustPressed('arrowdown')) {
      this.selectedMenuIndex = Math.min(totalItems - 1, this.selectedMenuIndex + 1);
    }
    if (this.input.isKeyJustPressed('enter') && available.length > 0 && !active) {
      const project = available[this.selectedMenuIndex];
      const state = this.player.getState();
      this.player.startResearch(project.id, state.credits);
    }
    if (this.input.isKeyJustPressed('backspace')) {
      this.mode = 'DOCKED';
      this.selectedMenuIndex = 0;
    }
  }

  private handleIntelBrokerInput(): void {
    const intel = this.player.getAllIntel();

    if (this.input.isKeyJustPressed('arrowup')) {
      this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
    }
    if (this.input.isKeyJustPressed('arrowdown')) {
      this.selectedMenuIndex = Math.min(intel.length, this.selectedMenuIndex + 1);
    }
    if (this.input.isKeyJustPressed('backspace')) {
      this.mode = 'DOCKED';
      this.selectedMenuIndex = 0;
    }
  }

  private handleCargoHoldInput(): void {
    if (this.input.isKeyJustPressed('backspace')) {
      this.mode = 'DOCKED';
      this.selectedMenuIndex = 0;
    }
  }

  private handleTravelMapInput(): void {
    if (this.input.isKeyJustPressed('backspace')) {
      this.mode = 'DOCKED';
      this.selectedMenuIndex = 0;
    }
  }

  // ===== RENDER METHODS =====

  private renderFlightView(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    const state = this.player.getState();
    const combatState = this.player.getCombatState();

    // Render 3D space scene first (background)
    this.renderSpaceScene();

    // Update visual effects
    this.visualEffects.update(Date.now());

    // Then draw UI overlays on top
    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SPACE TRADER SIMULATOR', renderer.width / 2, 15);

    // System name
    ctx.fillStyle = palette.primary;
    ctx.font = '14px monospace';
    ctx.fillText(`SYSTEM: ${this.currentSystem.name.toUpperCase()}`, renderer.width / 2, 40);

    // Status
    const status = state.isDocked ? `DOCKED AT ${state.dockedAt?.name}` : 'IN FLIGHT';
    ctx.fillStyle = state.isDocked ? palette.accent : palette.primary;
    ctx.fillText(status, renderer.width / 2, 60);

    const leftX = 30;
    const rightX = renderer.width - 350;
    const topY = 100;

    // Left panel - Ship status
    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: topY, width: 300, height: 400, title: 'SHIP STATUS', style: 'double' },
      palette
    );

    // Credits display
    ctx.fillStyle = palette.accent;
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('CREDITS:', leftX + 20, topY + 30);
    this.sevenSegment.drawNumber(ctx, leftX + 120, topY + 25, state.credits, palette, 8, 0);

    // Shield gauge
    const shieldGauge = new AnalogGauge({
      radius: 50,
      minValue: 0,
      maxValue: 100,
      label: 'SHIELDS',
      unit: '%',
      warningZone: { start: 0, end: 30 },
      dangerZone: { start: 0, end: 15 }
    });
    shieldGauge.draw(
      ctx,
      leftX + 80,
      topY + 120,
      combatState.shieldStrength * 100,
      palette
    );

    // Weapons status
    const weaponsGauge = new AnalogGauge({
      radius: 50,
      minValue: 0,
      maxValue: 100,
      label: 'WEAPONS',
      unit: '%'
    });
    weaponsGauge.draw(
      ctx,
      leftX + 200,
      topY + 120,
      combatState.weaponsHot ? 100 : 0,
      palette
    );

    // System status
    ctx.fillStyle = palette.primary;
    ctx.fillText('SYSTEMS:', leftX + 20, topY + 200);

    this.asciiBox.drawStatus(
      ctx,
      leftX + 20,
      topY + 220,
      combatState.weaponsHot ? 'WEAPONS HOT' : 'WEAPONS SAFE',
      combatState.weaponsHot ? 'warning' : 'good',
      palette
    );

    this.asciiBox.drawStatus(
      ctx,
      leftX + 20,
      topY + 245,
      combatState.shieldsUp ? 'SHIELDS UP' : 'SHIELDS DOWN',
      combatState.shieldsUp ? 'good' : 'warning',
      palette
    );

    this.asciiBox.drawStatus(
      ctx,
      leftX + 20,
      topY + 270,
      combatState.inCombat ? 'IN COMBAT' : 'CLEAR',
      combatState.inCombat ? 'critical' : 'good',
      palette
    );

    // Right panel - Contacts
    this.asciiBox.drawBox(
      ctx,
      { x: rightX, y: topY, width: 320, height: 400, title: 'CONTACTS', style: 'double' },
      palette
    );

    ctx.fillStyle = palette.primary;
    ctx.font = '11px monospace';
    let contactY = topY + 30;

    if (this.nearbyContacts.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.fillText('No contacts detected', rightX + 20, contactY);
    } else {
      for (let i = 0; i < Math.min(10, this.nearbyContacts.length); i++) {
        const contact = this.nearbyContacts[i];
        const isTarget = combatState.currentTarget?.id === contact.id;

        if (isTarget) {
          ctx.fillStyle = palette.accent;
          ctx.fillText('>', rightX + 10, contactY);
        }

        ctx.fillStyle = contact.hostile ? palette.accent : palette.primary;
        ctx.fillText(
          `${contact.name.substring(0, 20).padEnd(20)} ${Math.floor(contact.distance)}km`,
          rightX + 30,
          contactY
        );

        contactY += 20;
      }
    }

    // Target info
    if (combatState.currentTarget) {
      this.asciiBox.drawBox(
        ctx,
        { x: rightX, y: topY + 420, width: 320, height: 150, title: 'TARGET INFO', style: 'single' },
        palette
      );

      ctx.fillStyle = palette.accent;
      ctx.font = '12px monospace';
      ctx.fillText(`NAME: ${combatState.currentTarget.name}`, rightX + 20, topY + 445);
      ctx.fillStyle = palette.primary;
      ctx.fillText(`DISTANCE: ${Math.floor(combatState.currentTarget.distance)}km`, rightX + 20, topY + 465);
      ctx.fillStyle = combatState.currentTarget.hostile ? palette.accent : palette.primary;
      ctx.fillText(`STATUS: ${combatState.currentTarget.hostile ? 'HOSTILE' : 'NEUTRAL'}`, rightX + 20, topY + 485);
    }

    // Active missions
    const activeMissions = this.player.getActiveMissions();
    if (activeMissions.length > 0) {
      this.asciiBox.drawBox(
        ctx,
        { x: leftX, y: topY + 420, width: 300, height: 150, title: 'ACTIVE MISSIONS', style: 'single' },
        palette
      );

      ctx.fillStyle = palette.primary;
      ctx.font = '11px monospace';
      let missionY = topY + 445;
      for (let i = 0; i < Math.min(3, activeMissions.length); i++) {
        const mission = activeMissions[i];
        ctx.fillText(`• ${mission.title.substring(0, 30)}`, leftX + 20, missionY);
        missionY += 20;
      }
    }

    // Controls hint
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      state.isDocked
        ? '[M] Missions | [C] Crew | [R] Research | [I] Intel | [U] Undock | [H] Help'
        : '[T] Target | [SPACE] Fire | [W] Weapons | [S] Shields | [D] Dock | [H] Help',
      renderer.width / 2,
      renderer.height - 30
    );
  }

  private renderDockedView(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    const state = this.player.getState();
    const station = state.dockedAt;
    if (!station) {
      this.mode = 'FLIGHT';
      return;
    }

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`STATION: ${station.name.toUpperCase()}`, renderer.width / 2, 15);

    ctx.fillStyle = palette.primary;
    ctx.font = '14px monospace';
    ctx.fillText(`FACTION: ${station.controllingFaction}`, renderer.width / 2, 45);

    // Main menu
    const menuX = renderer.width / 2 - 200;
    const menuY = 120;

    this.asciiBox.drawBox(
      ctx,
      { x: menuX - 20, y: menuY - 20, width: 440, height: 450, title: 'STATION SERVICES', style: 'double' },
      palette
    );

    const menuItems = [
      { key: 'M', label: 'MISSION BOARD', desc: 'Accept new contracts and missions' },
      { key: 'C', label: 'CREW ROSTER', desc: 'Hire and manage crew members' },
      { key: 'R', label: 'RESEARCH LAB', desc: 'Research ship upgrades and technologies' },
      { key: 'I', label: 'INTEL BROKER', desc: 'Buy and sell intelligence' },
      { key: 'G', label: 'CARGO HOLD', desc: 'Manage cargo and contraband' },
      { key: 'F', label: 'REFUEL & REPAIR', desc: 'Service and maintain your ship' },
      { key: 'T', label: 'TRAVEL MAP', desc: 'Navigate to other systems' },
      { key: 'U', label: 'UNDOCK', desc: 'Leave the station' }
    ];

    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      const y = menuY + i * 50;
      const isSelected = i === this.selectedMenuIndex;

      // Selection indicator
      if (isSelected) {
        ctx.fillStyle = palette.accent;
        ctx.fillText('>', menuX - 5, y);
      }

      // Key binding
      ctx.fillStyle = palette.accent;
      ctx.fillText(`[${item.key}]`, menuX + 10, y);

      // Label
      ctx.fillStyle = isSelected ? palette.accent : palette.primary;
      ctx.fillText(item.label, menuX + 60, y);

      // Description
      ctx.fillStyle = palette.secondary;
      ctx.font = '11px monospace';
      ctx.fillText(item.desc, menuX + 60, y + 18);
      ctx.font = '14px monospace';
    }

    // Instructions
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[↑↓] Navigate | [ENTER] Select | [H] Help', renderer.width / 2, renderer.height - 30);
  }

  private renderMissionBoard(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    const missions = this.player.getAvailableMissions();
    const activeMissions = this.player.getActiveMissions();

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MISSION BOARD', renderer.width / 2, 20);

    const leftX = 50;
    const rightX = renderer.width / 2 + 50;
    const topY = 80;

    // Available missions
    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: topY, width: renderer.width / 2 - 80, height: 500, title: 'AVAILABLE MISSIONS', style: 'double' },
      palette
    );

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    if (missions.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.fillText('No missions available', leftX + 20, topY + 40);
    } else {
      let missionY = topY + 30;
      for (let i = 0; i < Math.min(8, missions.length); i++) {
        const mission = missions[i];
        const isSelected = i === this.selectedMenuIndex;

        if (isSelected) {
          ctx.fillStyle = palette.accent;
          ctx.fillText('>', leftX + 10, missionY);
        }

        ctx.fillStyle = isSelected ? palette.accent : palette.primary;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(mission.title.substring(0, 35), leftX + 30, missionY);

        ctx.fillStyle = palette.secondary;
        ctx.font = '10px monospace';
        ctx.fillText(mission.description.substring(0, 45), leftX + 30, missionY + 15);
        const timeLeft = mission.expiresAt ? Math.ceil((mission.expiresAt - Date.now() / 1000) / 86400) : '?';
        ctx.fillText(`Reward: ${mission.creditReward} credits | Expires in ${timeLeft} days`, leftX + 30, missionY + 30);

        missionY += 60;
      }
    }

    // Active missions
    this.asciiBox.drawBox(
      ctx,
      { x: rightX, y: topY, width: renderer.width / 2 - 100, height: 500, title: 'ACTIVE MISSIONS', style: 'double' },
      palette
    );

    if (activeMissions.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.font = '11px monospace';
      ctx.fillText('No active missions', rightX + 20, topY + 40);
    } else {
      let missionY = topY + 30;
      for (const mission of activeMissions) {
        ctx.fillStyle = palette.primary;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`• ${mission.title.substring(0, 30)}`, rightX + 20, missionY);

        ctx.fillStyle = palette.secondary;
        ctx.font = '10px monospace';
        ctx.fillText(mission.description.substring(0, 40), rightX + 30, missionY + 15);
        ctx.fillText(`Reward: ${mission.creditReward} credits`, rightX + 30, missionY + 30);

        // Progress
        const progress = Math.floor(mission.currentObjective / mission.objectives.length * 100);
        ctx.fillText(`Progress: ${progress}%`, rightX + 30, missionY + 45);

        missionY += 75;
      }
    }

    // Instructions
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[↑↓] Navigate | [ENTER] Accept | [BACKSPACE] Back | [H] Help', renderer.width / 2, renderer.height - 30);
  }

  private renderCrewRoster(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    const crew = this.player.getCrew();

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CREW ROSTER', renderer.width / 2, 20);

    const leftX = 50;
    const topY = 80;

    // Crew list
    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: topY, width: renderer.width - 100, height: 500, title: `CREW (${crew.length})`, style: 'double' },
      palette
    );

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    if (crew.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.fillText('No crew members. Consider hiring some!', leftX + 20, topY + 40);
    } else {
      let crewY = topY + 30;
      for (let i = 0; i < crew.length; i++) {
        const member = crew[i];

        ctx.fillStyle = palette.primary;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${member.name} - ${member.role}`, leftX + 30, crewY);

        ctx.fillStyle = palette.secondary;
        ctx.font = '10px monospace';
        ctx.fillText(`Level ${member.skillLevel} | Exp: ${member.experience}/${member.experienceForNextLevel}`, leftX + 30, crewY + 15);
        ctx.fillText(`Salary: ${member.salary} credits/day | Morale: ${Math.floor(member.morale * 100)}%`, leftX + 30, crewY + 30);

        // Skill bars
        const skillX = leftX + 400;
        ctx.fillText(`Skills:`, skillX, crewY);
        Object.entries(member.skills).forEach(([skill, value], idx) => {
          const barWidth = 100;
          const barHeight = 8;
          const barY = crewY + 15 + idx * 15;

          ctx.fillStyle = palette.secondary;
          ctx.fillText(skill.substring(0, 8), skillX, barY);

          ctx.strokeStyle = palette.primary;
          ctx.strokeRect(skillX + 80, barY, barWidth, barHeight);

          ctx.fillStyle = palette.accent;
          ctx.fillRect(skillX + 80, barY, barWidth * value, barHeight);
        });

        crewY += 80;
      }
    }

    // Instructions
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[BACKSPACE] Back | [H] Help', renderer.width / 2, renderer.height - 30);
  }

  private renderResearchLab(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    const available = this.player.getAvailableResearch();
    const active = this.player.getActiveResearch();
    const completed = this.player.getCompletedResearch();

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('RESEARCH LAB', renderer.width / 2, 20);

    const leftX = 50;
    const rightX = renderer.width / 2 + 50;
    const topY = 80;

    // Active research
    if (active) {
      this.asciiBox.drawBox(
        ctx,
        { x: leftX, y: topY, width: renderer.width - 100, height: 100, title: 'ACTIVE RESEARCH', style: 'double' },
        palette
      );

      ctx.fillStyle = palette.accent;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(active.name, leftX + 20, topY + 30);

      ctx.fillStyle = palette.secondary;
      ctx.font = '10px monospace';
      ctx.fillText(active.description, leftX + 20, topY + 50);

      // Progress bar
      const progressBarWidth = renderer.width - 160;
      const progressBarHeight = 15;
      const progressBarY = topY + 70;

      ctx.strokeStyle = palette.primary;
      ctx.strokeRect(leftX + 20, progressBarY, progressBarWidth, progressBarHeight);

      ctx.fillStyle = palette.accent;
      ctx.fillRect(leftX + 20, progressBarY, progressBarWidth * (active.progress || 0), progressBarHeight);

      ctx.fillStyle = palette.primary;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor((active.progress || 0) * 100)}%`, leftX + 20 + progressBarWidth / 2, progressBarY + 3);
    }

    // Available research
    const availableY = active ? topY + 130 : topY;
    const availableHeight = active ? 370 : 500;

    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: availableY, width: renderer.width / 2 - 80, height: availableHeight, title: 'AVAILABLE RESEARCH', style: 'double' },
      palette
    );

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    if (available.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.fillText('No research available', leftX + 20, availableY + 40);
    } else {
      let researchY = availableY + 30;
      for (let i = 0; i < Math.min(6, available.length); i++) {
        const project = available[i];
        const isSelected = i === this.selectedMenuIndex;

        if (isSelected) {
          ctx.fillStyle = palette.accent;
          ctx.fillText('>', leftX + 10, researchY);
        }

        ctx.fillStyle = isSelected ? palette.accent : palette.primary;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(project.name.substring(0, 30), leftX + 30, researchY);

        ctx.fillStyle = palette.secondary;
        ctx.font = '10px monospace';
        ctx.fillText(project.description.substring(0, 35), leftX + 30, researchY + 15);
        ctx.fillText(`Cost: ${project.cost} credits | Time: ${project.timeRequired} days`, leftX + 30, researchY + 30);

        researchY += 55;
      }
    }

    // Completed research
    this.asciiBox.drawBox(
      ctx,
      { x: rightX, y: availableY, width: renderer.width / 2 - 100, height: availableHeight, title: 'COMPLETED', style: 'double' },
      palette
    );

    if (completed.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.font = '11px monospace';
      ctx.fillText('No completed research', rightX + 20, availableY + 40);
    } else {
      let completedY = availableY + 30;
      for (const projectId of completed) {
        ctx.fillStyle = palette.primary;
        ctx.font = '11px monospace';
        ctx.fillText(`✓ ${projectId}`, rightX + 20, completedY);
        completedY += 20;
      }
    }

    // Instructions
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[↑↓] Navigate | [ENTER] Start Research | [BACKSPACE] Back | [H] Help', renderer.width / 2, renderer.height - 30);
  }

  private renderIntelBroker(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    const intel = this.player.getAllIntel();

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('INTELLIGENCE BROKER', renderer.width / 2, 20);

    const leftX = 50;
    const topY = 80;

    // Intel list
    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: topY, width: renderer.width - 100, height: 500, title: `INTELLIGENCE (${intel.length})`, style: 'double' },
      palette
    );

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    if (intel.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.fillText('No intelligence gathered yet', leftX + 20, topY + 40);
    } else {
      let intelY = topY + 30;
      for (let i = 0; i < Math.min(8, intel.length); i++) {
        const data = intel[i];

        ctx.fillStyle = palette.primary;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`[${data.type}] ${data.location}`, leftX + 30, intelY);

        ctx.fillStyle = palette.secondary;
        ctx.font = '10px monospace';
        ctx.fillText(data.content.substring(0, 60), leftX + 30, intelY + 15);
        ctx.fillText(`Value: ${data.value} credits | Reliability: ${Math.floor(data.reliability * 100)}%`, leftX + 30, intelY + 30);

        intelY += 60;
      }
    }

    // Instructions
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[BACKSPACE] Back | [H] Help', renderer.width / 2, renderer.height - 30);
  }

  private renderCargoHold(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    const contraband = this.player.getContraband();

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CARGO HOLD', renderer.width / 2, 20);

    const leftX = 50;
    const topY = 80;

    // Cargo list
    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: topY, width: renderer.width - 100, height: 500, title: 'CARGO', style: 'double' },
      palette
    );

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    if (contraband.length === 0) {
      ctx.fillStyle = palette.secondary;
      ctx.fillText('Cargo hold empty', leftX + 20, topY + 40);
    } else {
      let cargoY = topY + 30;
      for (const item of contraband) {
        ctx.fillStyle = palette.accent;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${item.commodity} (CONTRABAND)`, leftX + 30, cargoY);

        ctx.fillStyle = palette.secondary;
        ctx.font = '10px monospace';
        ctx.fillText(`Quantity: ${item.quantity} | Base Value: ${item.baseValue} credits`, leftX + 30, cargoY + 15);
        ctx.fillText(`Illegal in: ${item.illegalIn.join(', ')}`, leftX + 30, cargoY + 30);

        cargoY += 60;
      }
    }

    // Instructions
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[BACKSPACE] Back | [H] Help', renderer.width / 2, renderer.height - 30);
  }

  private renderTravelMap(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('TRAVEL MAP', renderer.width / 2, 20);

    const leftX = 50;
    const topY = 80;

    // Map box
    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: topY, width: renderer.width - 100, height: 500, title: 'KNOWN SYSTEMS', style: 'double' },
      palette
    );

    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Travel system not yet implemented', leftX + 20, topY + 40);

    ctx.fillStyle = palette.primary;
    ctx.fillText(`Current System: ${this.currentSystem.name}`, leftX + 20, topY + 70);

    // Instructions
    ctx.fillStyle = palette.secondary;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[BACKSPACE] Back | [H] Help', renderer.width / 2, renderer.height - 30);
  }

  private renderHelp(): void {
    const renderer = this.getRenderer();
    const ctx = renderer.ctx;
    const palette = renderer.palette;

    // Title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('HELP & CONTROLS', renderer.width / 2, 20);

    const leftX = 100;
    const topY = 80;

    // Help box
    this.asciiBox.drawBox(
      ctx,
      { x: leftX, y: topY, width: renderer.width - 200, height: 500, title: 'CONTROLS', style: 'double' },
      palette
    );

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.primary;

    const helpText = [
      'FLIGHT CONTROLS:',
      '  [T] - Target nearest hostile',
      '  [TAB] - Cycle targets',
      '  [SPACE] - Fire primary weapon',
      '  [F] - Fire secondary weapon',
      '  [W] - Toggle weapons hot/safe',
      '  [S] - Toggle shields up/down',
      '  [D] - Request docking',
      '',
      'STATION CONTROLS (when docked):',
      '  [M] - Mission board',
      '  [C] - Crew roster',
      '  [R] - Research lab',
      '  [I] - Intel broker',
      '  [G] - Cargo hold',
      '  [U] - Undock from station',
      '',
      'MENU NAVIGATION:',
      '  [↑↓] - Navigate menu items',
      '  [ENTER] - Select item',
      '  [BACKSPACE] - Go back',
      '',
      'GENERAL:',
      '  [H] - Toggle this help screen',
      '  [ESC] - Pause game',
      '',
      'Press [H] to close this help screen'
    ];

    let helpY = topY + 30;
    for (const line of helpText) {
      if (line.startsWith(' ')) {
        ctx.fillStyle = palette.secondary;
      } else {
        ctx.fillStyle = palette.accent;
      }
      ctx.fillText(line, leftX + 30, helpY);
      helpY += 18;
    }
  }

  private renderSpaceScene(): void {
    const renderer = this.getRenderer();
    const combatState = this.player.getCombatState();

    // Build scene data from game state
    const scene: SpaceScene = {
      spacecraft: {
        position: this.playerShip.position,
        rotation: this.playerShip.attitude.yaw || 0,
        engineFiring: this.playerShip.isMainEngineOn(),
        name: 'PLAYER'
      },
      celestialBodies: this.currentSystem.planets.map(planet => ({
        position: planet.position,
        radius: planet.radius,
        name: planet.name,
        type: 'planet' as const,
        atmosphere: planet.atmosphere ? { density: planet.atmosphere.density } : undefined
      })),
      stations: this.currentSystem.stations.map(station => ({
        position: station.position,
        name: station.name,
        faction: station.faction
      })),
      npcShips: this.orchestrator.getAllNPCShips().map(ship => ({
        position: ship.position,
        heading: ship.heading || 0,
        hostile: ship.hostile || false,
        name: ship.name
      })),
      hazards: [], // TODO: Add hazards from game world
      targetedContact: combatState.currentTarget ? {
        position: combatState.currentTarget.position || { x: 0, y: 0, z: 0 },
        name: combatState.currentTarget.name,
        distance: combatState.currentTarget.distance
      } : null,
      showTrajectory: this.showTrajectory,
      trajectory: [] // TODO: Get trajectory from navigation system
    };

    // Render the space scene
    this.spaceRenderer.render(scene, renderer.width, renderer.height);
  }

  // ===== HELPER METHODS =====

  private createStartingSystem(): StarSystem {
    const system: StarSystem = {
      id: 'sol',
      name: 'Sol System',
      position: { x: 0, y: 0, z: 0 },
      star: {
        type: 'M',
        mass: 1.989e30,
        radius: 696340,
        temperature: 5778,
        luminosity: 3.828e26
      },
      planets: [],
      stations: [],
      pointsOfInterest: [],
      economicActivity: 1.0,
      politicalStability: 0.8,
      militaryPresence: 0.5,
      controllingFaction: 'Trade Federation'
    };

    // Add starting station
    const stationGen = new StationGenerator();
    const station = stationGen.generateStation('Gateway Station', 'Trade Federation', 'TRADING_HUB', system);
    station.position = { x: 1000, y: 0, z: 0 }; // 1km away
    system.stations = [station];

    return system;
  }

  private getNearbyShips(): ShipContact[] {
    // Mock data - would be real ship data from orchestrator
    const mockContacts: ShipContact[] = [
      { id: '1', name: 'Merchant Freighter', distance: 5.2, faction: 'Trade Federation', type: 'FREIGHTER', hostile: false },
      { id: '2', name: 'Patrol Ship Alpha', distance: 8.7, faction: 'Trade Federation', type: 'PATROL', hostile: false },
      { id: '3', name: 'Pirate Raider', distance: 12.3, faction: 'Pirates', type: 'FIGHTER', hostile: true },
      { id: '4', name: 'Mining Vessel', distance: 15.1, faction: 'Independent', type: 'MINING', hostile: false }
    ];

    return mockContacts;
  }
}

export default SpaceGame;
