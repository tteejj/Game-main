# Narrative Mission System - "Out There" Style

## Overview

This mission system brings "Out There"-style gameplay to the space simulator: atmospheric exploration, resource scarcity, meaningful narrative choices, and ethical dilemmas. Less combat, more discovery and survival.

## Files

- **NarrativeMission.ts** - Core system types, interfaces, and manager class
- **MissionDatabase.ts** - Concrete mission implementations and content
- **mission-design-out-there.md** - Design philosophy and documentation (in `/docs`)

## Mission Types

### 1. Signal Encounters (Discovery)
Unknown signals requiring investigation. Each choice affects resources and outcomes.

**Example:** Silent Beacon - Ancient derelict with mysterious disappearance

### 2. Resource Crises (Survival)
Critical shortages force impossible trade-offs between bad options.

**Example:** The Dead Zone - Fuel critical, multiple desperate solutions

### 3. Faction Crossroads (Diplomacy)
Choices that affect reputation with competing factions.

**Example:** Disputed Claim - Two factions want the same salvage

### 4. Ancient Mysteries (Exploration)
Alien artifacts and precursor technology to discover.

**Example:** The Monolith - Perfect alien structure transmitting patterns

### 5. Moral Dilemmas (Ethics)
No good choices, only what you can live with.

**Example:** Life Pod Calculus - Four distress calls, fuel for one

## Key Features

### Meaningful Choices
- No perfect solutions
- Resource costs for every option
- Probabilistic outcomes (uncertainty)
- Irreversible consequences

### Persistent State
- Knowledge accumulated over time
- Faction reputation matters
- Story flags track your choices
- Decisions echo across the campaign

### Resource Integration
- Fuel scarcity drives choices
- Power limitations create pressure
- Time costs affect planning
- Hull damage has consequences

### Atmospheric Storytelling
- Visual descriptions
- Sensor readouts
- Environmental context
- Emotional narrative weight

## Usage

### Basic Setup

```typescript
import { NarrativeMissionManager } from './NarrativeMission';
import { ALL_MISSIONS } from './MissionDatabase';

// Initialize manager
const missionManager = new NarrativeMissionManager();

// Register all missions
missionManager.registerMissions(ALL_MISSIONS);
```

### Checking for Available Missions

```typescript
// Get missions available at current location with current resources
const available = missionManager.getAvailableMissions(
  'deep_space', // Current location
  {
    fuel: 500,  // Current fuel in kg
    power: 5000, // Current power in Wh
    time: 24,    // Available time in hours
    // ... other resources
  }
);

// Present to player
available.forEach(mission => {
  console.log(`${mission.title}: ${mission.description}`);
  console.log(`Type: ${mission.type} | Weight: ${mission.narrativeWeight}`);
});
```

### Starting a Mission

```typescript
// Player selects a mission
const missionId = 'signal_derelict_beacon_01';
const stage = missionManager.startMission(missionId);

if (stage) {
  // Present the stage
  console.log(stage.title);
  console.log(stage.narrativeText);
  console.log(stage.visualDescription);

  // Show choices
  stage.choices.forEach(choice => {
    console.log(`[${choice.id}] ${choice.text}`);
    console.log(`  ${choice.description}`);

    // Show requirements
    if (choice.requires) {
      console.log(`  Requires: ${JSON.stringify(choice.requires)}`);
    }

    // Show risk level
    console.log(`  Risk: ${choice.riskLevel}`);
  });
}
```

### Making a Choice

```typescript
// Player makes choice
const choiceId = 'investigate_full';
const outcome = missionManager.makeChoice(
  missionId,
  stage.id,
  choiceId
);

if (outcome) {
  // Present outcome
  console.log(outcome.narrativeText);

  // Apply resource changes to player ship
  if (outcome.resourceChange) {
    applyResourceChanges(playerShip, outcome.resourceChange);
  }

  // Apply reputation changes
  if (outcome.reputationChange) {
    applyReputationChanges(playerFactions, outcome.reputationChange);
  }

  // Grant knowledge
  if (outcome.knowledgeGained) {
    outcome.knowledgeGained.forEach(knowledge => {
      console.log(`New Knowledge: ${knowledge.title}`);
      console.log(knowledge.loreText);
    });
  }

  // Check for next stage
  if (outcome.nextStageId) {
    const nextStage = missionManager.getCurrentStage(missionId);
    // Continue with next stage...
  } else {
    console.log('Mission Complete!');
  }
}
```

### Checking if Player Can Afford a Choice

```typescript
const canAfford = missionManager.canAffordChoice(choice, {
  fuel: playerShip.fuel,
  power: playerShip.power,
  time: 24,
  // ... other resources
});

if (!canAfford) {
  console.log('Insufficient resources for this choice');
}
```

### Save/Load State

```typescript
// Save narrative state
const saveData = {
  // ... other game data
  narrativeState: missionManager.getState(),
};

// Load narrative state
missionManager.setState(savedData.narrativeState);
```

## Current Mission Content

### Implemented Missions (5)

1. **Silent Beacon** - Derelict investigation with mystery
2. **The Dead Zone** - Fuel crisis with desperate choices
3. **Disputed Claim** - Faction conflict over salvage rights
4. **The Monolith** - Ancient alien artifact discovery
5. **The Numbers** - Impossible rescue choice (life pod calculus)

### Mission Statistics
- Total mission stages: 11
- Total unique choices: 35
- Total possible outcomes: 57
- Knowledge items: 4
- Faction relationships tracked: 8+

## Design Principles

### 1. Resource Scarcity
Every choice costs something. Fuel, power, time, or moral weight.

### 2. No Perfect Solutions
Even "good" outcomes have costs. Success means managing losses.

### 3. Uncertainty
Some choices have probabilistic outcomes. Risk vs reward.

### 4. Persistence
Your choices matter. Reputation, knowledge, and flags affect future missions.

### 5. Atmosphere
Rich narrative text, environmental descriptions, emotional weight.

### 6. Player Agency
Multiple approaches to each situation. Your choices define your story.

## Integration Points

### With Existing Systems

**Universe System:**
- Mission triggers based on location type
- Hazards can trigger crisis missions
- Station proximity affects availability

**Resource System:**
- Fuel costs for investigation
- Power costs for scanning
- Time pressure from life support

**Faction System:**
- Reputation gates some missions
- Choices affect faction standing
- Access to stations and tech

**Economy:**
- Knowledge can be sold
- Tech unlocks tradable
- Rewards integrate with trading

## Future Expansion

### Planned Features
- Mission chains (multi-part arcs)
- Alien language translation minigame
- Crew morale effects
- Ship damage integration
- Random encounter generation
- Procedural mission templates

### Content Expansion
- 10+ additional hand-crafted missions
- Procedural mission variants
- Faction-specific mission chains
- Endgame mystery arc
- Hidden legendary encounters

## Atmospheric Elements

### Mood Types
- **Wonder**: Discovery and awe
- **Dread**: Cosmic horror and danger
- **Mystery**: Unknown and strange
- **Desperation**: Survival pressure
- **Tension**: Danger approaching
- **Isolation**: Loneliness of space

### Narrative Weight
- **Minor**: Quick encounters
- **Major**: Significant story beats
- **Critical**: Campaign-defining moments

## Statistics Tracking

The system tracks player statistics:
- Encounters total
- Choices made
- Resources spent
- People helped vs sacrificed
- Mysteries solved vs abandoned

These can be used for:
- Endgame summaries
- Achievement triggers
- Story adaptation
- Playstyle recognition

## Example Player Journey

1. **Early Game**: Find derelict beacon
   - Choose to investigate (curiosity)
   - Discover ancient nav charts
   - Unlock hidden routes

2. **Mid Game**: Fuel runs critically low
   - Forced into desperate choices
   - Jettison cargo to survive
   - Barely reach station

3. **Mid-Late**: Find monolith
   - Study it comprehensively
   - Decode precursor message
   - Gain profound knowledge

4. **Late Game**: Moral crisis
   - Multiple distress calls
   - Choose which lives to save
   - Live with consequences

5. **Endgame**: Follow monolith coordinates
   - Journey to origin point
   - Discover precursor truth
   - Campaign conclusion

## Technical Notes

### Performance
- Missions are lazy-loaded
- Trigger checks are O(n) but cached
- State is JSON-serializable

### Extensibility
- Easy to add new mission types
- Modular outcome system
- Pluggable knowledge categories
- Flexible trigger conditions

### Balancing
- Probabilities tuned for drama
- Resource costs balanced against ship capabilities
- Reputation changes scaled to impact
- Knowledge unlocks gated appropriately

## Writing Guidelines

When creating new missions:

1. **Start with emotion** - What should player feel?
2. **No perfect choice** - Every option has a cost
3. **Show, don't tell** - Use sensory details
4. **Consequences matter** - Choices affect future
5. **Trust the player** - Give hard decisions
6. **Atmosphere first** - Create mood through text
7. **Respect resources** - Costs should be meaningful

## Credits

Design inspired by:
- **Out There** - Resource scarcity and narrative focus
- **FTL** - Event structure and consequences
- **The Long Dark** - Survival choices
- **Sunless Sea** - Atmospheric writing
- **80 Days** - Branching narratives

---

*"In the vast darkness between stars, every choice echoes. Every resource matters. Every discovery changes you."*
