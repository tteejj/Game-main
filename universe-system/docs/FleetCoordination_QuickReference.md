# Fleet Coordination Quick Reference

## Quick Start (5 Minutes)

```typescript
// 1. Setup
import { FleetCoordinationSystem } from './FleetCoordinationSystem';
import { FleetAI } from './FleetAI';

const fleetCoord = new FleetCoordinationSystem();
const fleetAI = new FleetAI(fleetCoord);

// 2. Register ships
fleetCoord.registerShips(npcShipArray);

// 3. Create fleet
const fleet = fleetCoord.createFleet(
  'MARS_FEDERATION',
  shipIds,
  'Fleet Name'
);

// 4. Set formation
fleetCoord.setFormation(fleet.id, 'WEDGE');

// 5. Attack!
fleetCoord.attackTarget(fleet.id, targetId, 'FLEET');
```

## Formation Cheat Sheet

```
WEDGE     → Aggressive assault    (+50% offense, -15% defense)
LINE      → Broadside firepower   (+30% offense, -10% defense)
SPHERE    → Maximum defense       (+0% offense, +40% defense)
DEFENSIVE → Hold the line         (-10% offense, +50% defense)
SCATTER   → Evasive maneuvers     (-20% offense, +20% defense)
COLUMN    → Fast travel           (-30% offense, -20% defense)
SCREEN    → Forward scouts        (+10% offense, +0% defense)
```

## Formation Counters

```
WEDGE → Beats LINE, DEFENSIVE | Loses to SPHERE
LINE → Beats COLUMN, SCATTER | Loses to WEDGE
SPHERE → Beats WEDGE, SCATTER | Loses to LINE
```

## Common Operations

### Create and Deploy Fleet
```typescript
const fleet = fleetCoord.createFleet(faction, shipIds, name);
fleetCoord.setFormation(fleet.id, 'WEDGE');
fleetCoord.moveFleetTo(fleet.id, destination);
```

### Assess Situation
```typescript
const assessment = fleetAI.assessSituation(fleetId, allFleets, stations, ships);
console.log(`Threat: ${assessment.overallThreatLevel}/10`);
console.log(`Action: ${assessment.recommendedAction}`);
```

### Make Tactical Decision
```typescript
const decision = fleetAI.makeDecision(fleetId, assessment);
fleetAI.executeDecision(decision);
```

### Create Fleet Combat
```typescript
const engagement = fleetCoord.createEngagement(fleetA.id, fleetB.id);
// Combat auto-resolves in update loop
fleetCoord.update(deltaTime);
```

### Split Fleet
```typescript
const newFleet = fleetCoord.splitFleet(fleetId, shipIdsToSplit);
```

### Merge Fleets
```typescript
const mergedFleet = fleetCoord.mergeFleets(fleetA.id, fleetB.id);
```

### Siege with Fleet
```typescript
const fleetStrength = fleet.totalFirepower *
                      fleet.combatEffectiveness *
                      fleet.formationBonus;

conquestSystem.beginSiege(faction, station, fleetStrength);
```

## Status Codes

### Fleet Status
- `FORMING` - Gathering ships
- `READY` - Awaiting orders
- `MOVING` - Traveling
- `ENGAGED` - In combat
- `SIEGING` - Besieging target
- `DAMAGED` - Needs repairs
- `RETREATING` - Withdrawing
- `DISBANDED` - Dissolved

### Tactical Actions
- `ENGAGE_PRIMARY` - Attack main target
- `ENGAGE_OPPORTUNITY` - Attack vulnerable target
- `DEFEND_POSITION` - Hold ground
- `RETREAT_TACTICAL` - Tactical withdrawal
- `RETREAT_FULL` - Full retreat
- `AWAIT_REINFORCEMENTS` - Wait for backup
- `MANEUVER_KITE` - Maintain distance

## Key Formulas

### Combat Effectiveness
```
effectiveness = (morale × 0.4) + ((1 - damage%) × 0.4) + (cohesion × 0.2)
```

### Formation Bonus
```
bonus = ((offensive + defensive) / 2) × cohesion
```

### Effective Firepower
```
power = baseFirepower × effectiveness × formationBonus × focusFire(1.5)
```

### Tactical Advantage
```
advantage = ourPower / enemyPower
  >= 2.0  → Overwhelming (+1.0)
  >= 1.5  → Strong advantage (+0.7)
  >= 1.2  → Moderate (+0.4)
  >= 0.8  → Even (0.0)
  >= 0.6  → Disadvantage (-0.3)
  >= 0.4  → Strong disadvantage (-0.6)
  < 0.4   → Overwhelming disadvantage (-1.0)
```

## Retreat Conditions

Fleet auto-retreats when:
- Damage > 60%
- Morale < 30%
- Tactical advantage < -0.6 AND threat > 7
- Supplies < 2 days AND losing

## Performance Tips

```typescript
// Batch updates (every 10 seconds)
setInterval(() => fleetCoord.update(10), 10000);

// Cleanup old data
fleetAI.cleanupOldDecisions(3600);

// Limit active fleets
const MAX_FLEETS_PER_FACTION = 10;

// Cache assessments
const assessmentCache = new Map();
```

## Common Patterns

### Convoy Escort
```typescript
const convoy = fleetCoord.createFleet(faction, civilianShips, 'Convoy');
const escort = fleetCoord.createFleet(faction, militaryShips, 'Escort');

fleetCoord.setFormation(convoy.id, 'COLUMN');
fleetCoord.setFormation(escort.id, 'SCREEN');

// Escort moves with convoy
escort.objective = {
  type: 'ESCORT_TARGET',
  targetId: convoy.id,
  priority: 90,
  mustComplete: true
};
```

### Pincer Attack
```typescript
// Main force
const main = fleetCoord.createFleet(faction, mainShips, 'Main Force');
fleetCoord.setFormation(main.id, 'WEDGE');
fleetCoord.moveFleetTo(main.id, target);

// Left flank
const left = fleetCoord.createFleet(faction, flankShips1, 'Left Flank');
fleetCoord.setFormation(left.id, 'LINE');
fleetCoord.moveFleetTo(left.id, leftPosition);

// Right flank
const right = fleetCoord.createFleet(faction, flankShips2, 'Right Flank');
fleetCoord.setFormation(right.id, 'LINE');
fleetCoord.moveFleetTo(right.id, rightPosition);
```

### Defensive Stand
```typescript
const defender = fleetCoord.createFleet(faction, ships, 'Defense Fleet');
fleetCoord.setFormation(defender.id, 'DEFENSIVE');

defender.currentOrder = 'DEFEND';
defender.objective = {
  type: 'DEFEND_LOCATION',
  targetLocation: position,
  priority: 100,
  mustComplete: true
};
```

### Hit and Run
```typescript
const raiders = fleetCoord.createFleet(faction, fastShips, 'Raiders');
fleetCoord.setFormation(raiders.id, 'SCATTER');

// Quick strike
fleetCoord.attackTarget(raiders.id, targetId, 'STATION');

// Auto-retreat after damage
if (raiders.damagePercent > 0.3) {
  const decision = fleetAI.makeDecision(raiders.id, assessment);
  // Will likely choose RETREAT_TACTICAL
  fleetAI.executeDecision(decision);
}
```

## Debug Commands

```typescript
// Fleet status
console.log(fleetCoord.getFleetReport(fleetId));

// Tactical assessment
const assessment = fleetAI.assessSituation(fleetId, ...);
console.log(JSON.stringify(assessment, null, 2));

// Active engagements
const engagements = fleetCoord.getActiveEngagements();
console.log(`${engagements.length} active battles`);

// Fleet list
const fleets = fleetCoord.getAllFleets();
fleets.forEach(f => console.log(`${f.name}: ${f.ships.length} ships, ${f.status}`));
```

## Error Handling

```typescript
try {
  const fleet = fleetCoord.createFleet(faction, shipIds, name);
} catch (error) {
  if (error.message.includes('at least')) {
    console.error('Not enough ships (need 3 minimum)');
  } else if (error.message.includes('exceed')) {
    console.error('Too many ships (max 50)');
  }
}

// Check before operations
const fleet = fleetCoord.getFleet(fleetId);
if (!fleet) {
  console.error('Fleet not found');
  return;
}

if (fleet.status === 'DISBANDED') {
  console.error('Fleet disbanded');
  return;
}
```

## Integration Checklist

- [ ] FleetCoordinationSystem created
- [ ] FleetAI created
- [ ] Ships registered with `registerShips()`
- [ ] Update loop calls `fleetCoord.update(deltaTime)`
- [ ] FactionMilitaryAI creates fleets for operations
- [ ] ConquestSystem uses fleet strength for sieges
- [ ] Tactical assessments used for decisions
- [ ] Formations change based on combat phase
- [ ] Retreat conditions honored
- [ ] Reinforcement requests handled
- [ ] Fleet performance tracked
- [ ] Cleanup routines in place

## Resources

- Full documentation: `FleetCoordination_README.md`
- Examples: `examples/FleetCoordinationIntegration.ts`
- Military AI integration: `examples/FactionMilitaryAI_FleetIntegration.ts`
- Source code:
  - `FleetCoordinationSystem.ts` (826 lines)
  - `FleetAI.ts` (847 lines)
