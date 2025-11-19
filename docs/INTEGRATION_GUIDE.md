# Integration Guide - Making It Playable

This guide shows you how to integrate the player interaction systems into your actual game and make it playable.

---

## Quick Start - Terminal Demo

The fastest way to see everything working:

```bash
cd Game-main
npm install
npm run demo:player
```

This runs a terminal-based demo where you can:
- Fly your ship
- Dock at stations
- Accept missions
- Hire crew
- Start research
- Trade intelligence
- Engage in combat

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Your Game                            │
│                    (Rendering, Main Loop)                    │
└────────────────────────────┬────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │         PlayerGameLoop               │
          │  (Manages modes, input, updates)     │
          └──────────────────┬──────────────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
┌─────▼──────┐     ┌────────▼────────┐   ┌────────▼──────────┐
│   Input    │     │ PlayerShip      │   │ Combat Input      │
│  Manager   │     │ Integration     │   │   Handler         │
└────────────┘     └─────────────────┘   └───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐    ┌─────────▼────────┐   ┌─────▼──────┐
   │ Combat  │    │ Mission System    │   │ NPC Inter. │
   │ System  │    │                   │   │            │
   └─────────┘    └──────────────────┘   └────────────┘
                            │
                 ┌──────────▼──────────┐
                 │ Player Systems       │
                 │ (Crew, Research,     │
                 │  Intel, Smuggling)   │
                 └─────────────────────┘
```

---

## Step-by-Step Integration

### 1. Import Required Classes

```typescript
import { PlayerGameLoop } from './game/PlayerGameLoop';
import { Spacecraft } from '../physics-modules/src/spacecraft';
import { UniverseOrchestrator } from '../universe-system/src/UniverseOrchestrator';
import { StarSystem } from '../universe-system/src/StarSystem';
```

### 2. Initialize the Game

```typescript
class YourGame {
  private gameLoop: PlayerGameLoop;
  private isRunning = false;

  constructor() {
    // Create universe
    const orchestrator = new UniverseOrchestrator();

    // Create player ship
    const playerShip = new Spacecraft(
      'Wanderer',
      10000,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    );

    // Get starting system (from your universe generation)
    const startSystem = orchestrator.getSystem('sol');

    // Initialize game loop
    this.gameLoop = new PlayerGameLoop(
      playerShip,
      orchestrator,
      startSystem
    );
  }

  start() {
    this.isRunning = true;
    this.loop();
  }

  private loop() {
    if (!this.isRunning) return;

    // Update game state
    this.gameLoop.update();

    // Render (your rendering code here)
    this.render();

    // Next frame
    requestAnimationFrame(() => this.loop());
  }

  private render() {
    // Get rendered output
    const output = this.gameLoop.render();

    // Display however you want (canvas, DOM, terminal, etc.)
    console.log(output);
  }
}
```

### 3. Handle Input

Input is handled automatically by `PlayerGameLoop`, but you can customize key bindings:

```typescript
import { PlayerCombatInputHandler } from '../universe-system/src/PlayerCombatInputHandler';

// Custom combat bindings
const combatInput = new PlayerCombatInputHandler(
  player,
  inputManager,
  {
    targetNearestHostile: 't',
    cycleTargets: 'tab',
    firePrimary: ' ',  // space
    fireSecondary: 'f',
    toggleWeapons: 'w',
    toggleShields: 's',
    toggleEvasion: 'e'
  }
);
```

### 4. Access Player State

```typescript
const player = gameLoop.getPlayer();

// Get current state
const state = player.getState();
console.log(`Credits: ${state.credits}`);
console.log(`Location: ${state.currentSystem?.name}`);
console.log(`Cargo: ${state.cargoUsed}/${state.cargoCapacity}`);

// Get combat info
const combatState = player.getCombatState();
console.log(`Hull: ${(combatState.hullIntegrity * 100).toFixed(0)}%`);
console.log(`Shields: ${(combatState.shieldStrength * 100).toFixed(0)}%`);

// Get missions
const missions = player.getActiveMissions();
console.log(`Active missions: ${missions.length}`);

// Get crew
const crew = player.getCrew();
console.log(`Crew members: ${crew.length}`);
```

---

## Building a UI

### Option 1: Terminal UI (Simplest)

Use the built-in `PlayerGameLoop.render()` method:

```typescript
setInterval(() => {
  gameLoop.update();
  console.clear();
  console.log(gameLoop.render());
}, 1000 / 30); // 30 FPS
```

### Option 2: Web UI (HTML/CSS)

Create UI components for each system:

```html
<!-- Mission Board -->
<div id="mission-board" class="hidden">
  <h2>Mission Board</h2>
  <div id="available-missions"></div>
  <div id="active-missions"></div>
</div>

<!-- Combat HUD -->
<div id="combat-hud" class="hidden">
  <div class="status-bar">
    <span>Hull: <span id="hull-percent"></span>%</span>
    <span>Shields: <span id="shield-percent"></span>%</span>
    <span>Target: <span id="target-name"></span></span>
  </div>
</div>

<!-- Crew Roster -->
<div id="crew-roster" class="hidden">
  <h2>Crew Roster</h2>
  <div id="crew-list"></div>
  <div id="hire-crew"></div>
</div>
```

Update UI in your render loop:

```typescript
function updateUI() {
  const player = gameLoop.getPlayer();
  const state = player.getState();

  // Update HUD
  document.getElementById('credits').textContent = state.credits.toString();
  document.getElementById('location').textContent = state.currentSystem?.name || 'Unknown';

  // Update combat HUD if in combat
  const combatState = player.getCombatState();
  if (combatState.inCombat) {
    document.getElementById('combat-hud').classList.remove('hidden');
    document.getElementById('hull-percent').textContent =
      (combatState.hullIntegrity * 100).toFixed(0);
    document.getElementById('shield-percent').textContent =
      (combatState.shieldStrength * 100).toFixed(0);

    if (combatState.currentTarget) {
      document.getElementById('target-name').textContent =
        combatState.currentTarget.name;
    }
  } else {
    document.getElementById('combat-hud').classList.add('hidden');
  }

  // Update mission board when opened
  if (gameLoop.getMode() === 'MISSION_BOARD') {
    updateMissionBoard(player);
  }
}

function updateMissionBoard(player) {
  const available = player.getAvailableMissions();
  const active = player.getActiveMissions();

  const availableContainer = document.getElementById('available-missions');
  availableContainer.innerHTML = '';

  available.forEach((mission, index) => {
    const missionEl = document.createElement('div');
    missionEl.className = 'mission-card';
    missionEl.innerHTML = `
      <h3>${mission.title}</h3>
      <p>${mission.description}</p>
      <p>Reward: ${mission.creditReward} credits</p>
      <button onclick="acceptMission('${mission.id}')">Accept</button>
    `;
    availableContainer.appendChild(missionEl);
  });
}

function acceptMission(missionId) {
  const player = gameLoop.getPlayer();
  const result = player.acceptMission(missionId);
  if (result.success) {
    showMessage(result.message, 'success');
  } else {
    showMessage(result.message, 'error');
  }
}
```

### Option 3: Canvas/WebGL UI

For a more game-like feel:

```typescript
class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private player: PlayerShipIntegration;

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render space background
    this.renderStarfield();

    // Render ship
    this.renderPlayerShip();

    // Render nearby NPCs
    this.renderNPCs();

    // Render HUD overlay
    this.renderHUD();

    // Render active UI panels
    if (this.gameLoop.getMode() === 'MISSION_BOARD') {
      this.renderMissionBoard();
    } else if (this.gameLoop.getMode() === 'COMBAT') {
      this.renderCombatOverlay();
    }
  }

  private renderHUD() {
    const state = this.player.getState();

    // Top-left status
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Credits: ${state.credits}`, 10, 20);
    this.ctx.fillText(`Cargo: ${state.cargoUsed}/${state.cargoCapacity}`, 10, 40);
    this.ctx.fillText(`System: ${state.currentSystem?.name}`, 10, 60);

    // Combat info if in combat
    const combatState = this.player.getCombatState();
    if (combatState.inCombat) {
      this.renderCombatHUD(combatState);
    }
  }

  private renderCombatHUD(combatState: CombatState) {
    const x = this.canvas.width - 200;
    const y = 20;

    // Hull bar
    this.renderBar(x, y, 180, 20, combatState.hullIntegrity, '#00ff00');
    this.ctx.fillText('Hull', x, y - 5);

    // Shield bar
    this.renderBar(x, y + 30, 180, 20, combatState.shieldStrength, '#0088ff');
    this.ctx.fillText('Shields', x, y + 25);

    // Target info
    if (combatState.currentTarget) {
      const t = combatState.currentTarget;
      this.ctx.fillText(`Target: ${t.name}`, x, y + 60);
      this.ctx.fillText(`Distance: ${(t.distance / 1000).toFixed(1)}km`, x, y + 75);
      this.renderBar(x, y + 85, 180, 15, t.hull, '#ff0000');
    }
  }

  private renderBar(x: number, y: number, width: number, height: number, value: number, color: string) {
    // Background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(x, y, width, height);

    // Fill
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width * value, height);

    // Border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.strokeRect(x, y, width, height);
  }
}
```

---

## Integration Patterns

### Pattern 1: Menu-Driven Game

Best for strategy/management focused games:

```typescript
class MenuDrivenGame {
  private currentMenu: string = 'main';

  update() {
    this.gameLoop.update();

    // Check for menu transitions
    if (this.input.isKeyJustPressed('m')) {
      this.currentMenu = 'missions';
    } else if (this.input.isKeyJustPressed('c')) {
      this.currentMenu = 'crew';
    } else if (this.input.isKeyJustPressed('escape')) {
      this.currentMenu = 'main';
    }
  }

  render() {
    switch (this.currentMenu) {
      case 'main':
        this.renderMainMenu();
        break;
      case 'missions':
        this.renderMissionMenu();
        break;
      case 'crew':
        this.renderCrewMenu();
        break;
      case 'combat':
        this.renderCombatView();
        break;
    }
  }
}
```

### Pattern 2: Real-Time Action Game

Best for flight sim/action focused games:

```typescript
class ActionGame {
  update() {
    // Always update player
    this.gameLoop.update();

    // Combat is always active when enemies nearby
    const combatState = this.player.getCombatState();
    if (combatState.inCombat) {
      // Show combat HUD overlay
      this.showCombatHUD = true;

      // Auto-target nearest hostile if no target
      if (!combatState.currentTarget) {
        this.player.targetNearestHostile();
      }
    }

    // Show station menu only when very close and stopped
    const state = this.player.getState();
    if (state.distanceToStation < 100 && this.isPlayerStopped()) {
      this.showStationMenu = true;
    }
  }

  render() {
    // Always render flight view
    this.renderFlightView();

    // Overlay HUDs
    if (this.showCombatHUD) {
      this.renderCombatOverlay();
    }

    if (this.showStationMenu) {
      this.renderStationOverlay();
    }
  }
}
```

### Pattern 3: Hybrid (Recommended)

Combines both approaches:

```typescript
class HybridGame {
  private pauseForMenus = false;

  update() {
    // Always update player systems
    this.gameLoop.update();

    // Pause physics/movement when in menus
    if (!this.pauseForMenus) {
      this.updatePhysics();
      this.updateUniverse();
    }

    // Combat is real-time
    if (this.player.getCombatState().inCombat) {
      this.pauseForMenus = false;
    }
  }

  render() {
    if (this.gameLoop.getMode() === 'FLIGHT' || this.gameLoop.getMode() === 'COMBAT') {
      // Real-time view
      this.renderFlightView();
      if (this.player.getCombatState().inCombat) {
        this.renderCombatHUD();
      }
    } else {
      // Paused menu view
      this.renderMenuView();
    }
  }

  openMenu(menu: string) {
    this.pauseForMenus = true;
    this.gameLoop.setMode(menu);
  }

  closeMenu() {
    this.pauseForMenus = false;
    this.gameLoop.setMode('FLIGHT');
  }
}
```

---

## Common Integration Tasks

### Task: Add "Accept Mission" Button

```typescript
function onAcceptMissionClick(missionId: string) {
  const player = gameLoop.getPlayer();
  const result = player.acceptMission(missionId);

  if (result.success) {
    showNotification(`Mission accepted: ${result.mission?.title}`, 'success');
    closeMenu('missions');
  } else {
    showNotification(result.message, 'error');
  }
}
```

### Task: Display Combat Damage Numbers

```typescript
function firePrimaryWeapon() {
  const result = player.firePrimaryWeapon();

  if (result.hit) {
    // Spawn damage number at target
    spawnFloatingText(
      targetPosition,
      `-${result.damage.toFixed(0)}`,
      result.criticalHit ? '#ff0000' : '#ffff00'
    );

    // Screen shake on critical
    if (result.criticalHit) {
      screenShake(5, 200);
    }

    // Show hit marker
    showHitMarker(targetPosition);
  } else {
    // Show miss effect
    if (result.message !== 'Shot missed target') {
      showNotification(result.message, 'warning');
    }
  }
}
```

### Task: Auto-Save Player Progress

```typescript
function saveGame() {
  const state = player.getState();
  const saveData = {
    version: '1.0',
    timestamp: Date.now(),
    player: {
      credits: state.credits,
      position: state.position,
      system: state.currentSystem?.id,
      cargo: Array.from(state.cargo.entries()),
      reputation: Array.from(state.factionReputation.entries()),
      activeMissions: state.activeMissions,
      completedMissions: state.completedMissions,
      bounty: state.bounty
    },
    crew: player.getCrew(),
    research: player.getCompletedResearch(),
    intel: player.getAllIntel()
  };

  localStorage.setItem('spacegame_save', JSON.stringify(saveData));
  showNotification('Game saved', 'success');
}

function loadGame() {
  const saveJson = localStorage.getItem('spacegame_save');
  if (!saveJson) return false;

  const saveData = JSON.parse(saveJson);

  // Restore player state
  const state = player.getState();
  state.credits = saveData.player.credits;
  state.position = saveData.player.position;
  state.cargo = new Map(saveData.player.cargo);
  state.factionReputation = new Map(saveData.player.reputation);
  // ... restore other fields

  showNotification('Game loaded', 'success');
  return true;
}

// Auto-save every 5 minutes
setInterval(saveGame, 5 * 60 * 1000);
```

### Task: Display Reputation Changes

```typescript
function modifyReputationWithFeedback(faction: string, change: number, reason: string) {
  player.modifyReputation(faction, change, reason);

  // Show floating reputation change
  const changeText = change > 0 ? `+${change}` : `${change}`;
  showFloatingText({
    text: `${faction}: ${changeText}`,
    color: change > 0 ? '#00ff00' : '#ff0000',
    duration: 3000,
    position: 'top-right'
  });

  // Play sound
  if (change > 0) {
    playSound('reputation_gain');
  } else {
    playSound('reputation_loss');
  }
}
```

---

## Performance Optimization

### Optimize Update Loop

```typescript
class OptimizedGameLoop {
  private lastUpdate = 0;
  private updateInterval = 1000 / 60; // 60 FPS

  update(timestamp: number) {
    const deltaTime = timestamp - this.lastUpdate;

    if (deltaTime >= this.updateInterval) {
      // Update game
      this.gameLoop.update();

      // Track frame time
      this.lastUpdate = timestamp - (deltaTime % this.updateInterval);
    }

    requestAnimationFrame((t) => this.update(t));
  }
}
```

### Lazy Load Systems

```typescript
class LazyLoadedGame {
  private crewSystemLoaded = false;
  private researchSystemLoaded = false;

  openCrewRoster() {
    if (!this.crewSystemLoaded) {
      // First time opening crew roster
      this.loadCrewSystem();
      this.crewSystemLoaded = true;
    }

    this.showCrewRoster();
  }
}
```

### Cache Frequently Accessed Data

```typescript
class CachedGameData {
  private cachedState: PlayerState;
  private cachedCombatState: CombatState;
  private cacheTime = 0;
  private cacheLifetime = 100; // ms

  getCachedState(): PlayerState {
    const now = Date.now();
    if (now - this.cacheTime > this.cacheLifetime) {
      this.cachedState = this.player.getState();
      this.cachedCombatState = this.player.getCombatState();
      this.cacheTime = now;
    }

    return this.cachedState;
  }
}
```

---

## Debugging

### Enable Debug Logging

```typescript
// In PlayerGameLoop
console.log('[DEBUG] Player Credits:', state.credits);
console.log('[DEBUG] Combat State:', combatState);
console.log('[DEBUG] Active Missions:', missions.length);
```

### Debug Panel

```typescript
function renderDebugPanel() {
  const state = player.getState();
  const combatState = player.getCombatState();

  return `
=== DEBUG PANEL ===
Credits: ${state.credits}
Position: ${JSON.stringify(state.position)}
System: ${state.currentSystem?.name}
Docked: ${state.isDocked}
Combat: ${combatState.inCombat}
Targets: ${combatState.targets.length}
Hull: ${(combatState.hullIntegrity * 100).toFixed(1)}%
Shields: ${(combatState.shieldStrength * 100).toFixed(1)}%
Crew: ${player.getCrew().length}
Research: ${player.getCompletedResearch().length}
Intel: ${player.getAllIntel().length}
  `;
}
```

---

## Next Steps

1. **Run the Demo:** `npm run demo:player` to see it in action
2. **Build Your UI:** Choose one of the UI patterns above
3. **Customize:** Modify keybindings, HUD layout, menu flow
4. **Extend:** Add your own systems on top of these
5. **Balance:** Tune rewards, costs, difficulty based on playtesting

The systems are ready - now make it your own!
