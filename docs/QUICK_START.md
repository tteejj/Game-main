# Quick Start - Player Interaction Systems

Get up and running with the player interaction systems in 5 minutes.

---

## What You Get

**8 Complete Player Interaction Systems:**
1. ✅ Active Combat Controls
2. ✅ Mission System
3. ✅ NPC Interaction
4. ✅ Reputation & Consequences
5. ✅ Crew Management
6. ✅ Research & Upgrades
7. ✅ Intelligence Gathering
8. ✅ Cargo Scanning & Smuggling

---

## Installation

```bash
cd Game-main
npm install
```

---

## Running the Demo

### Option 1: Terminal Demo (Fastest)

```bash
npm run demo:player
```

This launches a terminal-based playable demo where you can:
- Press H for help/controls
- Press M for mission board
- Press C for crew roster
- Press R for research lab
- Press I for intelligence market
- Press N to hail NPCs
- Press D to dock/undock
- Space/F to fire weapons in combat

### Option 2: Build and Integrate

```bash
npm run build
```

Then import into your game:

```typescript
import { PlayerGameLoop } from './game/PlayerGameLoop';
import { PlayerShipIntegration } from '../universe-system/src/PlayerShipIntegration';

// See docs/INTEGRATION_GUIDE.md for full integration steps
```

---

## Testing Individual Systems

### Test Combat

```typescript
import { PlayerShipIntegration } from './universe-system/src/PlayerShipIntegration';
import { PlayerCombatInputHandler } from './universe-system/src/PlayerCombatInputHandler';

// Initialize player
const player = new PlayerShipIntegration(spacecraft, orchestrator, system);
const combatInput = new PlayerCombatInputHandler(player, inputManager);

// In game loop
combatInput.update();

// Combat events
player.targetNearestHostile();
player.firePrimaryWeapon();
player.fireSecondaryWeapon();
player.toggleShields();
```

### Test Missions

```typescript
// While docked
const missions = player.getAvailableMissions();
console.log(`${missions.length} missions available`);

// Accept mission
const result = player.acceptMission(missions[0].id);
if (result.success) {
  console.log(`Accepted: ${result.mission.title}`);
}

// Track progress (auto-updates in player.update())
const active = player.getActiveMissions();
console.log(`Active missions: ${active.length}`);

// Complete mission
const completion = player.completeMission(missionId);
console.log(`Earned ${completion.credits} credits`);
```

### Test NPC Interaction

```typescript
// Get nearby ships
const npcs = player.getNearbyNPCs();

// Hail first ship
const hail = player.hailNPC(npcs[0].id);
console.log(hail.response);
console.log('Options:', hail.availableOptions);

// Interact
const result = player.interactWithNPC(npcs[0].id, 'REQUEST_TRADE');
console.log(result.message);
console.log(result.npcResponse);
```

### Test Reputation

```typescript
// View reputation
console.log(player.getReputationSummary());

// Modify reputation
player.modifyReputation('Trade Federation', 10, 'Completed mission');

// Check standing
const standing = player.getReputationStanding('Trade Federation');
console.log(`Standing: ${standing}`);

// Try to dock
const canDock = player.canDockAt(station);
if (!canDock.allowed) {
  console.log(canDock.reason);
}

// Add/clear bounty
player.addBounty(5000, 'Trade Federation', 'Attacked patrol ship');
player.clearBounty('Trade Federation');
```

### Test Crew

```typescript
// View available crew at station
const available = player.getAvailableCrewForHire(5);
for (const crew of available) {
  console.log(`${crew.name} - ${crew.role} - ${crew.salary} cr/day`);
}

// Hire crew
const result = player.hireCrew(available[0]);
console.log(result.message);

// View crew
const crew = player.getCrew();
console.log(player.getCrewStatus());

// Get skill bonuses
const bonuses = player.getCrewSkillBonuses();
console.log(`Engineering bonus: +${bonuses.engineering}%`);

// Pay salaries
const payment = player.payCrewSalaries();
console.log(`Paid ${payment.totalPaid} credits`);
```

### Test Research

```typescript
// View available research
const projects = player.getAvailableResearch();
for (const proj of projects) {
  console.log(`${proj.name} - ${proj.cost} cr, ${proj.timeRequired} days`);
}

// Start research
const result = player.startResearch(projects[0].id);
console.log(result.message);

// Check progress (auto-updates in player.update())
const active = player.getActiveResearch();
if (active) {
  console.log(`${active.name}: ${(active.progress * 100).toFixed(1)}% complete`);
}

// Check unlocked tech
const completed = player.getCompletedResearch();
console.log(`Completed research: ${completed.join(', ')}`);
```

### Test Intelligence

```typescript
// Gather from news
const intel = player.gatherIntelFromNews();
console.log(`Gathered ${intel.length} intel reports`);

// View all intel
const all = player.getAllIntel();
for (const int of all) {
  console.log(`[${int.type}] ${int.content}`);
  console.log(`  Value: ${int.value} cr`);
}

// Sell intel
const result = player.sellIntel(intel[0].id);
console.log(`Sold for ${result.payment} credits`);
```

### Test Smuggling

```typescript
// Add contraband
player.addContraband({
  commodity: 'Illegal Weapons',
  quantity: 100,
  illegalIn: ['Trade Federation', 'Alliance'],
  baseValue: 50,
  blackMarketMultiplier: 3.0
});

// Check if carrying contraband for faction
const hasIllegal = player.hasContrabandFor('Trade Federation');
console.log(`Carrying contraband: ${hasIllegal}`);

// Station scan (automatic on docking)
const scan = player.performCargoScan('Trade Federation');
if (scan.contraband.length > 0) {
  console.log(`BUSTED! Fine: ${scan.fine} credits`);
}

// Bribe official
const bribe = player.bribeOfficial();
console.log(bribe.message);

// Sell on black market
const sale = player.sellContrabandOnBlackMarket('Illegal Weapons');
console.log(`Sold for ${sale.payment} credits`);
```

---

## Complete Example

```typescript
import { PlayerGameLoop } from './game/PlayerGameLoop';
import { Spacecraft } from '../physics-modules/src/spacecraft';
import { UniverseOrchestrator } from '../universe-system/src/UniverseOrchestrator';

// Create universe
const orchestrator = new UniverseOrchestrator();
const system = orchestrator.getSystem('sol');

// Create player ship
const ship = new Spacecraft('Player Ship', 10000, {x:0,y:0,z:0}, {x:0,y:0,z:0});

// Create game loop
const gameLoop = new PlayerGameLoop(ship, orchestrator, system);

// Main game loop
function update() {
  // Update all systems
  gameLoop.update();

  // Render
  console.clear();
  console.log(gameLoop.render());

  // Next frame
  setTimeout(update, 1000 / 30); // 30 FPS
}

update();
```

---

## Key Files

| File | Purpose |
|------|---------|
| `universe-system/src/PlayerShipIntegration.ts` | Main player API |
| `universe-system/src/PlayerCombatInputHandler.ts` | Combat input |
| `universe-system/src/NPCInteractionInterface.ts` | NPC dialogue |
| `universe-system/src/PlayerSystemsIntegration.ts` | Crew/research/intel/smuggling |
| `src/game/PlayerGameLoop.ts` | Game loop integration |
| `docs/PLAYER_INTERACTION_SYSTEMS.md` | Full API documentation |
| `docs/INTEGRATION_GUIDE.md` | How to integrate into your game |

---

## Troubleshooting

### "Cannot find module"
```bash
npm install
npm run build
```

### "Player has no credits"
```typescript
// Initialize with starting credits
const state = player.getState();
state.credits = 50000;
```

### "No missions available"
```typescript
// Make sure you're docked
await player.requestDocking();

// Missions generate automatically when you call getAvailableMissions()
const missions = player.getAvailableMissions();
```

### "Can't dock - reputation too low"
```typescript
// Check reputation
console.log(player.getReputationSummary());

// Increase reputation
player.modifyReputation('Trade Federation', 50, 'Testing');
```

### "No nearby ships to hail"
```typescript
// Pass nearby ships to update()
const contacts = [
  {
    id: 'npc_1',
    name: 'Trader Ship',
    type: 'TRADER',
    position: {x: 1000, y: 0, z: 0},
    distance: 1000,
    hostile: false,
    hull: 1.0,
    shields: 0.8
  }
];

player.update(deltaTime, contacts);
```

---

## What's Next?

1. **Try the demo** - See all systems working together
2. **Read the docs** - Full API and integration guide
3. **Build UI** - Create your game's interface
4. **Customize** - Modify values, add features
5. **Play!** - Start trading, fighting, exploring

Everything is ready to go - the universe is yours to explore! 🚀
