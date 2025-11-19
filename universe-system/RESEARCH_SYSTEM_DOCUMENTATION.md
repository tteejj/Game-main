# Faction Research System Documentation

## Overview

The Faction Research System is a comprehensive technology tree implementation that enables factions to automatically research technologies based on their current needs, strategic situation, and government type. The system features 30+ technologies across 5 tiers with intelligent AI-driven research selection.

## Key Features

- **30+ Technologies** organized across 5 tiers (early game to end game)
- **5 Technology Categories**: Weapons, Propulsion, Economy, Defense, Exploration
- **Intelligent AI Research Selection** based on faction state (at war, expanding, economic crisis, etc.)
- **Prerequisite System** requiring certain techs before advancing
- **Cumulative Bonuses** that stack and multiply as research progresses
- **Special Unlocks** including new ship types, weapons, buildings, and unique abilities
- **Government Type Integration** with different priorities for democracies, militaries, corporations, etc.

## File Structure

### Core Files

1. **`/universe-system/src/ResearchSystem.ts`** (720+ lines)
   - `TechTree` class with 30+ technology definitions
   - `ResearchSystem` class for managing research projects
   - Technology progression and prerequisite tracking
   - Cumulative bonus calculations

2. **`/universe-system/src/faction-dynamics/FactionResearchAI.ts`** (620+ lines)
   - `FactionResearchAI` class for intelligent research selection
   - Priority calculation based on faction state
   - Technology scoring and recommendation
   - Research completion handling and bonus application

3. **`/universe-system/src/faction-dynamics/FactionResearchAI.test.ts`** (410+ lines)
   - 5 comprehensive test cases
   - Demonstrations of AI behavior in various scenarios
   - Validation of tech tree progression

4. **`/universe-system/src/examples/research-integration-example.ts`** (400+ lines)
   - Complete integration guide
   - Example game loop implementation
   - UI data retrieval examples

## Technology Tree Structure

### Tier 1: Early Game (2-3 hours research time)
**Foundational technologies with modest improvements**

| Technology | Category | Unlocks |
|------------|----------|---------|
| Basic Ballistics | Weapons | +10% damage, +5% accuracy |
| Laser Focusing | Weapons | +15% damage, +10% range, new weapon: basic_laser |
| Efficient Thrusters | Propulsion | +20% fuel efficiency, +5% speed |
| Jump Calibration | Propulsion | +15% jump range |
| Automated Mining | Economy | +25% mining efficiency, +10% economic output |
| Trade Logistics | Economy | +15% trade bonus, +5% economic output |
| Reinforced Hulls | Defense | +15% hull points, +10% armor |
| Basic Shields | Defense | +20% shield strength, new building: shield_generator |
| Sensor Arrays | Exploration | +30% sensor range |

### Tier 2: Mid-Early Game (3.5-5 hours research time)
**Specialization and improved capabilities**

| Technology | Category | Prerequisites | Unlocks |
|------------|----------|--------------|---------|
| Plasma Weapons | Weapons | Laser Focusing, Basic Ballistics | +25% damage, +15% range, new weapon: plasma_cannon |
| Guided Missiles | Weapons | Basic Ballistics | +30% accuracy, +20% range, new weapon: missile_launcher |
| Fusion Drives | Propulsion | Efficient Thrusters | +30% speed, +25% fuel efficiency |
| Wormhole Theory | Propulsion | Jump Calibration | +40% jump range, ability: stable_wormholes |
| Industrial Automation | Economy | Automated Mining, Trade Logistics | +30% economic output, +20% mining, new building: automated_factory |
| Quantum Computing | Economy | Trade Logistics | +15% research speed, +20% trade bonus, +15% economic output |
| Adaptive Shields | Defense | Basic Shields | +40% shield strength, ability: shield_adaptation |
| Ablative Armor | Defense | Reinforced Hulls | +35% armor, +20% hull points |
| Deep Space Scanners | Exploration | Sensor Arrays | +60% sensor range, ability: system_wide_scan |
| Cloaking Theory | Exploration | Sensor Arrays | +50% stealth, ability: basic_cloak |

### Tier 3: Mid Game (8-12 hours research time)
**Advanced capabilities and powerful systems**

| Technology | Category | Key Unlocks |
|------------|----------|-------------|
| Antimatter Weapons | Weapons | +50% damage, +25% range, antimatter_torpedo |
| Point Defense | Weapons | +40% accuracy, missile_interception, point_defense_grid |
| Antimatter Drives | Propulsion | +60% speed, +40% fuel efficiency, capital_ship |
| Hyperspace Mastery | Propulsion | +80% jump range, instant_jump, jump_anywhere |
| Megastructures | Economy | +60% economic output, orbital_ring, space_elevator, mega_shipyard |
| Nanofabrication | Economy | +50% economic output, +60% mining, +25% research speed |
| Phase Shields | Defense | +80% shield strength, phase_defense, projectile_immunity |
| Regenerative Armor | Defense | +60% armor, +40% hull points, auto_repair |
| Subspace Sensors | Exploration | +100% sensor range, ftl_detection, galaxy_map |
| Advanced Cloaking | Exploration | +150% stealth, perfect_cloak, cloak_while_moving |

### Tier 4: Late Game (15-25 hours research time)
**Cutting-edge technology for dominant factions**

| Technology | Category | Key Unlocks |
|------------|----------|-------------|
| Singularity Weapons | Weapons | +100% damage, +50% range, singularity_cannon, gravitational_pull |
| Quantum Disruptors | Weapons | +80% damage, +60% accuracy, quantum_disruptor, shield_penetration |
| Zero-Point Energy | Propulsion | +100% speed, +200% fuel efficiency, infinite_fuel |
| Dyson Sphere | Economy | +200% economic output, dyson_sphere, stellar_forge, stellar_energy |
| Matter Replication | Economy | +150% economic output, +200% mining, create_anything |
| Temporal Shields | Defense | +150% shield strength, temporal_immunity, time_distortion |
| Omniscient Sensors | Exploration | +400% sensor range, galaxy_vision, predict_movements |

### Tier 5: End Game (35-45 hours research time)
**Game-changing supremacy technologies**

| Technology | Category | Key Unlocks |
|------------|----------|-------------|
| Reality Warping | Weapons | +400% damage, +200% range, rewrite_physics, instant_destruction |
| Dimensional Travel | Propulsion | +900% jump range, dimension_hop, parallel_universe |
| Transcendent AI | Economy | +900% economic output, +400% research speed, ai_governance, perfect_efficiency |
| Perfect Invulnerability | Defense | +900% shields & armor, total_immunity |
| Cosmic Awareness | Exploration | +9900% sensor range, +900% stealth, omniscience, future_sight |

## AI Research Selection Logic

### Priority Calculation

The AI evaluates research priorities based on:

1. **Faction State**
   - At war → +40-60% weapons priority
   - Under threat → +30% defense priority
   - Expanding → +30% propulsion priority
   - Economic crisis → +50% economy priority
   - High exploration needs → +30% exploration priority

2. **Government Type**
   - MILITARY: +3 bonus to weapons, +2 to defense
   - CORPORATE: +4 bonus to economy
   - DEMOCRACY: Balanced approach, +0.5 to all
   - AUTOCRACY: +2 to research speed techs
   - THEOCRACY: Prefers lower tier (traditional) tech
   - ANARCHY: Prefers high-tier chaotic tech

3. **Ideology**
   - Militaristic → More weapons research
   - Expansionist → More propulsion/exploration
   - Technological → More research speed bonuses
   - Economic → More economy techs

### Technology Scoring

Each available technology is scored (0-100+) based on:

- **Category Priority** (40% weight): How well it matches current needs
- **Tier Appropriateness** (20% weight): Close to current tech level
- **Cost Efficiency** (15% weight): Affordable for current economy
- **Unlock Value** (25% weight): How useful the bonuses are right now
- **Special Abilities Bonus**: Extra points for highly valuable abilities
- **Government Fit Bonus**: Extra points for matching government type

### Example Decision Logic

```typescript
// Faction at war with weak military
{
  isAtWar: true,
  militaryStrength: 0.4,
  threatLevel: 0.8
}

// Results in:
Weapons Priority: 100%    // Critical need
Defense Priority: 74%     // High need
Economy Priority: 30%     // Low priority during crisis
Propulsion Priority: 20%  // Low priority
Exploration Priority: 40% // Some value for intel

// Likely to select: Plasma Weapons, Point Defense, or similar combat tech
```

## Integration Guide

### Basic Setup

```typescript
import { ResearchSystem, TechTree } from './ResearchSystem';
import { FactionResearchAI, FactionState } from './faction-dynamics/FactionResearchAI';

// Initialize systems
const researchSystem = new ResearchSystem();
const researchAI = new FactionResearchAI(researchSystem);

// Set faction research speed (based on their tech focus)
researchSystem.setFactionResearchSpeed(faction.id, 1.5); // 50% faster research
```

### Game Loop Integration

```typescript
// Every frame/tick
function gameUpdate(deltaTime: number, currentTime: number) {
  // Update all active research
  const completed = researchSystem.updateResearch(deltaTime, currentTime);

  // Handle completions
  for (const research of completed) {
    const faction = getFaction(research.factionId);
    researchAI.onResearchComplete(faction, research, currentTime);
    applyResearchBonuses(faction, research.bonusesApplied);
  }
}

// Every 10-30 seconds (not every frame)
function evaluateResearch(currentTime: number) {
  for (const faction of allFactions) {
    // Build faction state from game data
    const state = buildFactionState(faction);

    // Let AI decide on research
    const decision = researchAI.selectNextResearch(faction, state, currentTime);

    if (decision) {
      console.log(`${faction.name} started: ${decision.selectedTech.name}`);
    }
  }
}
```

### Applying Research Bonuses

```typescript
function applyResearchBonuses(faction: Faction, bonuses: TechUnlocks) {
  // Apply to all faction ships
  for (const ship of faction.ships) {
    ship.weaponDamage *= bonuses.weaponDamage || 1.0;
    ship.weaponRange *= bonuses.weaponRange || 1.0;
    ship.maxSpeed *= bonuses.engineSpeed || 1.0;
    ship.shieldStrength *= bonuses.shieldStrength || 1.0;
    ship.sensorRange *= bonuses.sensorRange || 1.0;
  }

  // Update faction economy
  faction.economicMultiplier *= bonuses.economicOutput || 1.0;
  faction.miningMultiplier *= bonuses.miningEfficiency || 1.0;

  // Unlock new content
  if (bonuses.newShipTypes) {
    faction.availableShips.push(...bonuses.newShipTypes);
  }
  if (bonuses.newWeaponTypes) {
    faction.availableWeapons.push(...bonuses.newWeaponTypes);
  }
  if (bonuses.specialAbilities) {
    faction.abilities.push(...bonuses.specialAbilities);
  }
}
```

### Player Research UI

```typescript
// Get research data for UI display
function getResearchUIData(factionId: string) {
  return {
    // Current research
    active: researchSystem.getActiveResearch(factionId),

    // Available technologies (prerequisites met)
    available: researchSystem.getAvailableTechnologies(factionId),

    // Completed research
    completed: researchSystem.getCompletedResearch(factionId),

    // Total bonuses
    bonuses: researchSystem.calculateCumulativeBonuses(factionId),

    // Tech tier progress
    progress: researchSystem.getTechProgress(factionId),

    // Current research speed
    speed: researchSystem.getFactionResearchSpeed(factionId)
  };
}

// Player manually selects research
function playerSelectTech(factionId: string, techId: string) {
  const success = researchSystem.startResearch(factionId, techId, Date.now() / 1000);

  if (!success) {
    // Check why it failed
    const tech = TechTree.getTechnology(techId);
    const completed = researchSystem.getCompletedResearch(factionId);
    const completedIds = completed.map(c => c.techId);

    // Find missing prerequisites
    const missing = tech.prerequisites.filter(p => !completedIds.includes(p));
    console.log(`Cannot research: Missing ${missing.join(', ')}`);
  }
}
```

## Test Results

### Test Case 1: Militaristic Faction at War
```
Faction: The Crimson Empire (MILITARY)
State: At war (2 wars), threatened (80%), weak military (40%)

Result:
✓ Selected: Laser Focusing (WEAPONS)
✓ Weapons Priority: 100%
✓ Defense Priority: 74%
✓ TEST PASSED: Prioritized combat tech during war
```

### Test Case 2: Expansionist Faction Colonizing
```
Faction: The Stellar Pioneers (DEMOCRACY)
State: Expanding, peaceful, high exploration needs (80%)

Result:
✓ Selected: Jump Drive Calibration (PROPULSION)
✓ Propulsion Priority: 100%
✓ Economy Priority: 65%
✓ TEST PASSED: Prioritized expansion tech during colonization
```

### Test Case 3: Corporate Faction in Economic Crisis
```
Faction: MegaCorp Industries (CORPORATE)
State: Economic crisis (20% health), peaceful

Result:
✓ Selected: Automated Mining (ECONOMY)
✓ Economy Priority: 65%
✓ TEST PASSED: Prioritized economy tech during crisis
```

### Test Case 4: Research Impact on Capabilities
```
Initial Stats:
  Military: 100
  Economy: 100

After Basic Ballistics:
  Military: 105 (+5%)

After Automated Mining:
  Economy: 111.67 (+11.67%)

Cumulative Bonuses:
  Weapon Damage: x1.10
  Mining Efficiency: x1.25

✓ TEST PASSED: Research affects faction capabilities
```

### Test Case 5: Tech Tree Progression
```
✓ Tier 1: 9 technologies available initially
✓ Researched prerequisites: Laser Focusing, Basic Ballistics
✓ Plasma Weapons (Tier 2) now available
✓ Completed Plasma Weapons
✓ Unlocked: plasma_cannon weapon type
✓ TEST PASSED: Prerequisite system works correctly
```

## Performance Considerations

- **Research Updates**: Call `updateResearch()` every frame with deltaTime
- **AI Decisions**: Call `selectNextResearch()` every 10-60 seconds (has built-in cooldown)
- **Memory**: ~30KB for complete tech tree + ~1KB per active research project
- **CPU**: Minimal - O(n) for n available techs, typically 5-15 techs available at once

## Future Enhancements

Potential additions for Phase 3 integration:

1. **Tech Espionage**: Factions steal tech from each other
2. **Tech Trading**: Share research through treaties
3. **Tech Decay**: Unused techs become obsolete
4. **Faction-Specific Techs**: Unique tech trees per faction
5. **Research Cooperation**: Joint research projects between allies
6. **Tech Rush Events**: Emergency research at 2x speed
7. **Research Sabotage**: Enemies can set back research progress

## API Reference

### ResearchSystem

```typescript
class ResearchSystem {
  // Start new research
  startResearch(factionId: string, techId: string, currentTime: number): boolean

  // Update all active research
  updateResearch(deltaTime: number, currentTime: number): CompletedResearch[]

  // Query methods
  getActiveResearch(factionId: string): ResearchProject[]
  getCompletedResearch(factionId: string): CompletedResearch[]
  getAvailableTechnologies(factionId: string): Technology[]
  calculateCumulativeBonuses(factionId: string): TechUnlocks
  getTechProgress(factionId: string): { [tier: number]: number }

  // Utility
  cancelResearch(factionId: string, techId: string): boolean
  setResearchPriority(factionId: string, techId: string, priority: number): boolean
  getFactionResearchSpeed(factionId: string): number
  setFactionResearchSpeed(factionId: string, speed: number): void
  hasTechnology(factionId: string, techId: string): boolean
  getResearchProgress(factionId: string, techId: string): number
}
```

### FactionResearchAI

```typescript
class FactionResearchAI {
  // Main decision method
  selectNextResearch(faction: Faction, state: FactionState, currentTime: number): ResearchDecision | null

  // Event handling
  onResearchComplete(faction: Faction, completed: CompletedResearch, currentTime: number): void

  // Utility
  getResearchStatus(factionId: string): ResearchStatus
  forceResearch(factionId: string, techId: string, currentTime: number): boolean

  // Static helper
  static buildFactionState(faction: Faction, ...params): FactionState
}
```

### TechTree

```typescript
class TechTree {
  static initialize(): void
  static getTechnology(id: string): Technology | undefined
  static getAllTechnologies(): Technology[]
  static getTechnologiesByCategory(category: TechCategory): Technology[]
  static getTechnologiesByTier(tier: number): Technology[]
  static getAvailableTechnologies(completedTechIds: string[]): Technology[]
}
```

## Summary

The Faction Research System provides a complete, production-ready implementation of technology progression for 4X-style space games. With 30+ technologies, intelligent AI selection, and comprehensive integration examples, factions can now evolve and specialize based on their strategic situation, creating dynamic gameplay where technology disparity drives interesting strategic decisions.

All test cases pass, demonstrating:
- Factions research based on needs (war → weapons, expansion → propulsion, crisis → economy)
- Tech unlocks directly affect capabilities (weapons stronger, economy more productive)
- Tech tree progression works correctly (prerequisites enforced, tiers unlock in order)
- Government types and ideologies influence research priorities

The system is ready for integration into the main game simulation!
