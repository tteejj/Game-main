# Future Features - Aspirational Systems

This document outlines advanced gameplay systems for future development. These features build upon the core player interaction systems (combat, missions, NPC interaction, reputation, crew, research, intel, smuggling) to create deeper strategic and emergent gameplay.

---

## 9. Ship Boarding & Capture 🏴‍☠️

**Status:** Not Implemented
**Difficulty:** ⭐⭐ HARD
**Estimated Work:** 2-3 weeks

### Overview
Allow players to board and capture disabled enemy vessels through EVA operations and crew combat.

### Requirements

#### Prerequisites
- Disable enemy ship systems (target engines, weapons)
- Match velocity with target
- Deploy EVA crew or use docking system

#### New Systems Needed

1. **EVA System**
   ```typescript
   interface EVAOperation {
     crew: CrewMember[];
     targetShip: Ship;
     distance: number;
     hazards: EVAHazard[];  // vacuum, debris, radiation
     timeRemaining: number;
   }
   ```

2. **Crew Combat Resolution**
   - Simple dice-roll system based on:
     - Crew count (attackers vs defenders)
     - Combat skill levels
     - Equipment quality
     - Ship layout (defender advantage)

   ```typescript
   function resolveBoardingAction(
     attackers: CrewMember[],
     defenders: CrewMember[],
     shipLayout: ShipLayout
   ): BoardingResult {
     // Roll-based combat with modifiers
     // Track casualties on both sides
     // Determine capture/repel outcome
   }
   ```

3. **Capture Mechanics**
   - Successful boarding grants:
     - Ship ownership transfer
     - Cargo looting
     - Salvage rights
   - Reputation consequences:
     - Major penalty for piracy against civilians
     - Bounty placed on player
     - Faction standing loss

### Implementation Path

**Phase 1: Disable & Approach**
- Add subsystem targeting to combat
- Velocity matching autopilot
- Proximity alerts (collision avoidance)

**Phase 2: EVA Operations**
- EVA suit management (oxygen, propulsion)
- Crew transfer between ships
- Risk calculation (distance, hazards)

**Phase 3: Crew Combat**
- Combat resolution engine
- Casualty tracking
- Equipment effects (armor, weapons)

**Phase 4: Post-Capture**
- Ship ownership transfer
- Crew reassignment
- Reputation/legal consequences

### Integration Points
- Modify: `universe-system/src/CombatSystem.ts` - Add subsystem targeting
- Create: `universe-system/src/EVASystem.ts` - New EVA operations
- Create: `universe-system/src/CrewCombatSystem.ts` - Boarding resolution
- Extend: `universe-system/src/PlayerShipIntegration.ts` - Add boarding commands

---

## 10. Multi-Ship Fleet Command 🚢🚢🚢

**Status:** Not Implemented
**Difficulty:** ⭐⭐ HARD
**Estimated Work:** 3-4 weeks

### Overview
Allow players to build and command a fleet of ships with NPC captains carrying out orders.

### Requirements

#### Fleet Management
```typescript
interface PlayerFleet {
  flagshipId: string;  // Player's current ship
  ownedShips: Ship[];
  captains: Map<string, NPCCaptain>;  // shipId -> captain
  formations: FleetFormation[];
}

interface FleetOrder {
  type: 'ESCORT' | 'PATROL' | 'TRADE_ROUTE' | 'ATTACK' | 'DEFEND';
  targetShipId?: string;
  waypoints?: Vector3[];
  route?: TradeRoute;
  rules: EngagementRules;
}
```

#### Ship Acquisition
- Purchase ships at shipyards
- Capture via boarding (feature #9)
- Commission new construction (long-term)

#### Captain Management
- Hire NPC captains with varying skills:
  - Combat proficiency
  - Trading acumen
  - Loyalty rating
  - Personality traits
- Pay wages and bonuses
- Fire/replace underperforming captains
- Risk of mutiny/betrayal with low loyalty

#### Fleet Operations

1. **Escort Duty**
   - Assign ships to follow and protect flagship
   - Formation flying
   - Automatic threat response

2. **Patrol Routes**
   - Define patrol waypoints
   - Engage pirates/hostiles automatically
   - Report findings to player

3. **Automated Trading**
   - Set up trade routes with buy/sell orders
   - Ships autonomously trade and earn profits
   - Share percentage of profits
   - Risk of loss (pirates, accidents)

4. **Combat Coordination**
   - Issue fleet-wide attack orders
   - Tactical formations (wall, sphere, wedge)
   - Concentrated fire on targets
   - Retreat commands

#### Profit & Loss
```typescript
interface FleetFinancials {
  totalAssets: number;
  maintenanceCosts: number;
  wagesOwed: number;
  tradeIncome: number;
  combatLosses: number;
  netProfit: number;
}
```

### Implementation Path

**Phase 1: Ship Ownership**
- Player can own multiple ships
- Storage/docking when not in use
- Basic switching between ships

**Phase 2: Captain AI**
- Extend existing `NPCShipAI.ts`
- Add order-following behavior
- Loyalty and skill system

**Phase 3: Fleet Orders**
- Command interface
- Order parsing and execution
- Fleet coordination logic

**Phase 4: Economics**
- Automated trading routes
- Profit sharing
- Maintenance costs

### Integration Points
- Extend: `universe-system/src/PlayerShipIntegration.ts` - Fleet ownership
- Create: `universe-system/src/FleetManagementSystem.ts` - Fleet operations
- Extend: `universe-system/src/NPCShipAI.ts` - Captain AI with orders
- Create: UI for fleet command and monitoring

---

## 11. Station/Territory Ownership 🏰

**Status:** Partial (`ConquestSystem.ts` exists for NPC factions)
**Difficulty:** ⭐ VERY HARD
**Estimated Work:** 1-2 months

### Overview
Allow players to own, manage, and defend space stations and territory, creating a strategic layer beyond ship operations.

### Requirements

#### Station Acquisition

1. **Purchase**
   - Buy existing stations (very expensive)
   - Negotiate with current faction owner
   - Requires high reputation

2. **Conquest**
   - Siege operations (requires fleet)
   - Disable defenses
   - Board and capture (see feature #9)
   - Major diplomatic consequences

3. **Construction**
   - Contract shipyard to build new station
   - Choose location and type
   - Long construction time (weeks)
   - Requires resources and credits

#### Station Management

```typescript
interface OwnedStation {
  stationId: string;
  location: Vector3;
  type: StationType;
  defenses: DefenseSystem[];
  services: StationService[];
  inventory: CargoManifest;

  // Economics
  dockingFees: number;
  tradeTaxRate: number;
  dailyIncome: number;
  maintenanceCost: number;

  // Staff
  crew: CrewMember[];
  garrison: number;  // Defense troops

  // Status
  controlLevel: number;  // 0-100
  factionSupport: Map<string, number>;
}
```

#### Revenue Streams

1. **Docking Fees**
   - Charge ships to dock
   - Player sets rates
   - High fees reduce traffic

2. **Trade Taxes**
   - Percentage of all trades conducted
   - Attracts traders if fair
   - Can set different rates per faction

3. **Service Fees**
   - Refueling, repairs, rearmament
   - Station provides services for profit

4. **Manufacturing**
   - Produce commodities
   - Sell to market
   - Requires raw materials

#### Station Defense

```typescript
interface DefenseSystem {
  type: 'MISSILE_BATTERY' | 'LASER_GRID' | 'RAILGUN_TURRET' | 'SHIELD_GENERATOR';
  health: number;
  effectiveness: number;
  powerConsumption: number;
  maintenanceCost: number;
}
```

- **Passive Defense:** Shield strength, armor rating
- **Active Defense:** Automated turrets, missile batteries
- **Fighter Wings:** Launch defensive fighters
- **Garrison:** Troops to repel boarding

#### Siege Mechanics

When attacked:
1. Shields absorb initial damage
2. Turrets engage attackers
3. Call for allied reinforcements
4. If shields fail, armor takes damage
5. Hull breaches reduce control level
6. If control drops to 0, station is captured

#### Territory Control

- Controlling multiple stations in a system = territory claim
- Collect taxes from all trade in territory
- Diplomatic recognition from factions
- Can set laws (contraband, tariffs)

### Implementation Path

**Phase 1: Basic Ownership**
- Purchase mechanic
- Station status tracking
- Simple income calculation

**Phase 2: Management**
- Staff assignment
- Service configuration
- Inventory management

**Phase 3: Defense**
- Defense systems
- Combat resolution
- Garrison mechanics

**Phase 4: Strategic Layer**
- Territory control
- Multi-station economics
- Diplomatic integration

### Integration Points
- Extend: `universe-system/src/ConquestSystem.ts` - Player participation
- Create: `universe-system/src/StationOwnershipSystem.ts`
- Extend: `universe-system/src/StationServices.ts` - Owner mode
- Extend: `universe-system/src/FactionSystem.ts` - Player as faction

---

## 12. Planet Surface Exploration 🌍

**Status:** Partial (landing gear exists, no surface gameplay)
**Difficulty:** ⭐ VERY HARD
**Estimated Work:** 1-2 months

### Overview
Extend the landing system to allow surface exploration, resource gathering, base building, and ground combat.

### Current State
- `physics-modules/src/landing-system.ts` handles:
  - Landing gear deployment
  - Terrain scanning
  - Touchdown mechanics
- **Missing:** Everything after landing

### Requirements

#### Surface Generation

```typescript
interface PlanetSurface {
  planetId: string;
  biome: BiomeType;
  terrain: TerrainMap;
  resources: ResourceDeposit[];
  structures: SurfaceStructure[];
  weather: WeatherSystem;
  hazards: EnvironmentalHazard[];
}

enum BiomeType {
  BARREN_ROCK = 'BARREN_ROCK',
  ICE_WORLD = 'ICE_WORLD',
  VOLCANIC = 'VOLCANIC',
  DESERT = 'DESERT',
  FOREST = 'FOREST',
  OCEAN = 'OCEAN',
  TOXIC_ATMOSPHERE = 'TOXIC_ATMOSPHERE'
}
```

#### Surface Movement

**Option 1: Top-Down Exploration**
- Player controls rover/suit in top-down view
- Tile-based or continuous 2D movement
- Simplified compared to space flight

**Option 2: First-Person Mode**
- Switch to FPS-style controls
- Walk around surface
- Enter buildings/caves

**Recommended:** Start with Option 1 (simpler)

#### Resource Gathering

```typescript
interface ResourceDeposit {
  type: CommodityType;
  quantity: number;
  location: Vector2;
  extractionDifficulty: number;
  requiresEquipment: MiningEquipment[];
}
```

Activities:
- Survey for deposits (orbital scan vs on-foot prospecting)
- Deploy mining equipment
- Extract resources to ship cargo
- Refine raw materials

#### Surface Structures

1. **Natural:**
   - Caves (shelter, resources, dangers)
   - Canyons, mountains, craters
   - Alien ruins (artifacts, lore)

2. **Constructed:**
   - Settlements (trade, missions)
   - Research stations
   - Mining outposts
   - Military bases
   - Abandoned facilities (exploration, salvage)

#### Environmental Hazards

```typescript
interface EnvironmentalHazard {
  type: 'EXTREME_HEAT' | 'EXTREME_COLD' | 'RADIATION' | 'TOXIC_AIR' | 'LOW_GRAVITY' | 'STORMS';
  severity: number;
  affectsPlayer: boolean;
  affectsEquipment: boolean;
  damageRate: number;
}
```

- Suit integrity management
- Oxygen consumption
- Temperature regulation
- Radiation exposure
- Gravity adaptation

#### Ground Vehicles

```typescript
interface SurfaceVehicle {
  type: 'ROVER' | 'WALKER' | 'HOVERBIKE' | 'DRILL_RIG';
  speed: number;
  cargoCapacity: number;
  equipment: VehicleEquipment[];
  fuel: number;
  durability: number;
}
```

#### Ground Combat

- NPC encounters (pirates, wildlife, hostile factions)
- FPS-style combat or tactical resolution
- Cover mechanics
- Environmental effects

#### Base Building (Advanced)

```typescript
interface PlayerBase {
  location: PlanetSurface;
  modules: BaseModule[];
  power: PowerSystem;
  lifeSupport: LifeSupportSystem;
  storage: Warehouse;
  defenses: GroundDefense[];
}
```

- Construct modules (habitat, power, storage, defenses)
- Automated resource extraction
- Ship resupply point
- Recruit/house crew

### Implementation Path

**Phase 1: Basic Surface**
- Procedural terrain generation
- Biome types with visual variety
- Exit ship and walk around (simple controls)

**Phase 2: Resource Gathering**
- Resource deposits on planets
- Mining mechanics
- Load cargo onto ship

**Phase 3: Structures & NPCs**
- Surface settlements
- Trading/missions on surface
- NPC encounters

**Phase 4: Advanced Features**
- Vehicles
- Ground combat
- Base building

### Integration Points
- Extend: `physics-modules/src/landing-system.ts` - Post-landing mode
- Create: `universe-system/src/PlanetSurfaceSystem.ts`
- Create: `universe-system/src/SurfaceExplorationSystem.ts`
- Create: New rendering mode for surface view

---

## 13. AI-Generated Dialogue 🤖💬

**Status:** Not Implemented (but strong foundation exists)
**Difficulty:** ⭐⭐⭐ MODERATE (with existing LLM tools)
**Estimated Work:** 1-2 weeks for basic integration

### Overview
Use Large Language Models (LLMs) to generate dynamic NPC conversations instead of hand-written dialogue trees.

### Why This Could Work

The game already has extensive NPC context systems:
- **Personality:** `NPCPersonalitySystem.ts` - Boldness, greed, loyalty, etc.
- **Memory:** `ExtendedNPCMemory.ts` - Traumatic events, achievements, relationships
- **Emotional State:** Current mood, stress, morale
- **Faction Relations:** Reputation, diplomatic status
- **Recent Events:** Combat, trades, travels

All of this can be fed to an LLM for contextual dialogue generation.

### Architecture

```typescript
interface DialogueContext {
  // NPC Identity
  npcId: string;
  npcName: string;
  npcType: NPCType;
  shipClass: string;

  // Personality (from NPCPersonalitySystem)
  personality: {
    boldness: number;      // 0-1
    greed: number;
    loyalty: number;
    aggression: number;
    curiosity: number;
    honor: number;
  };

  // Current State
  emotionalState: {
    currentMood: string;
    stress: number;
    morale: number;
    fear: number;
  };

  // Memory & History
  memory: {
    recentEvents: string[];          // Last 10 interactions
    traumaticEvents: string[];       // Major negative events
    achievements: string[];          // Proud moments
    relationshipWith: {              // How they feel about player
      player: number;                // -100 to 100
      history: string[];             // Past interactions
    };
  };

  // Faction Context
  faction: {
    name: string;
    playerReputation: number;
    diplomaticStatus: DiplomaticStatus;
    atWar: boolean;
  };

  // Current Situation
  situation: {
    location: string;
    hullIntegrity: number;
    inCombat: boolean;
    cargoValue: number;
    isBeingAttacked: boolean;
    needsHelp: boolean;
  };

  // Conversation State
  conversationHistory: DialogueTurn[];
  playerLastAction: string;
}

interface DialogueTurn {
  speaker: 'player' | 'npc';
  message: string;
  timestamp: number;
}
```

### LLM Integration Options

#### Option 1: Cloud API (OpenAI/Anthropic)
```typescript
import Anthropic from '@anthropic-ai/sdk';

class NPCDialogueAI {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateResponse(context: DialogueContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);
    const conversationMessages = this.formatConversation(context);

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      system: systemPrompt,
      messages: conversationMessages
    });

    return response.content[0].text;
  }

  private buildSystemPrompt(context: DialogueContext): string {
    return `You are ${context.npcName}, a ${context.npcType} operating a ${context.shipClass}.

PERSONALITY:
- Boldness: ${context.personality.boldness * 100}/100
- Greed: ${context.personality.greed * 100}/100
- Loyalty: ${context.personality.loyalty * 100}/100
- Aggression: ${context.personality.aggression * 100}/100

CURRENT STATE:
- Mood: ${context.emotionalState.currentMood}
- Stress: ${context.emotionalState.stress * 100}/100
- Hull Integrity: ${context.situation.hullIntegrity * 100}%
${context.situation.inCombat ? '- YOU ARE UNDER ATTACK!' : ''}

RELATIONSHIP WITH PLAYER:
- Personal opinion: ${context.memory.relationshipWith.player}/100
- Faction ${context.faction.name} reputation: ${context.faction.playerReputation}/100
- Diplomatic status: ${context.faction.diplomaticStatus}

RECENT MEMORY:
${context.memory.recentEvents.slice(-5).map(e => `- ${e}`).join('\n')}

${context.memory.traumaticEvents.length > 0 ? `TRAUMATIC MEMORIES:\n${context.memory.traumaticEvents.map(e => `- ${e}`).join('\n')}` : ''}

INSTRUCTIONS:
- Stay in character based on your personality
- Remember your relationship with the player
- Respond appropriately to your current situation
- Be concise (1-3 sentences)
- Use space-faring terminology
- If stressed or in danger, show it
- If you have negative history with player, be suspicious/hostile
- If you have positive history, be more friendly/trusting`;
  }

  private formatConversation(context: DialogueContext): any[] {
    return context.conversationHistory.map(turn => ({
      role: turn.speaker === 'player' ? 'user' : 'assistant',
      content: turn.message
    }));
  }
}
```

**Pros:**
- High-quality responses
- Excellent context understanding
- Nuanced personality expression

**Cons:**
- API costs (though small per request)
- Requires internet connection
- Latency (1-3 seconds per response)

#### Option 2: Local LLM (Llama, Mistral, etc.)
```typescript
import { Ollama } from 'ollama';

class LocalNPCDialogueAI {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
  }

  async generateResponse(context: DialogueContext): Promise<string> {
    const prompt = this.buildPrompt(context);

    const response = await this.ollama.generate({
      model: 'llama3.1:8b',  // or 'mistral', 'phi3', etc.
      prompt: prompt,
      options: {
        temperature: 0.8,
        max_tokens: 150
      }
    });

    return response.response;
  }
}
```

**Pros:**
- Free
- No internet required
- Low latency (if GPU available)
- Full privacy

**Cons:**
- Requires setup (Ollama or similar)
- Lower quality than cloud models
- Requires decent hardware (GPU recommended)

#### Option 3: Hybrid Approach
- Use local LLM for common interactions
- Use cloud API for critical/complex conversations
- Cache common responses
- Fallback to templates if AI unavailable

### Response Validation

```typescript
class DialogueValidator {
  validate(response: string, context: DialogueContext): ValidationResult {
    const issues: string[] = [];

    // Check length
    if (response.length > 500) {
      issues.push('Response too long');
    }

    // Check for inappropriate content
    if (this.containsInappropriateContent(response)) {
      issues.push('Inappropriate content detected');
    }

    // Check for breaking character
    if (this.breaksCharacter(response, context)) {
      issues.push('Response inconsistent with character');
    }

    // Check for game-breaking information
    if (this.revealsHiddenInfo(response)) {
      issues.push('Reveals information NPC should not know');
    }

    return {
      valid: issues.length === 0,
      issues,
      sanitizedResponse: this.sanitize(response)
    };
  }
}
```

### Player Response Generation

Instead of player typing free-form:
```typescript
class PlayerDialogueOptions {
  generateOptions(context: DialogueContext): string[] {
    // AI generates contextual player response options
    // Player selects from menu
    return [
      "Request to trade",
      "Ask about recent events in the system",
      "Threaten them",
      "Offer assistance",
      "End conversation"
    ];
  }
}
```

This gives structure while keeping AI-generated variety.

### Implementation Path

**Phase 1: Basic Integration (Week 1)**
- Set up LLM client (cloud or local)
- Build context gathering from existing systems
- Simple prompt engineering
- Basic response generation
- Manual testing

**Phase 2: Validation & Safety (Week 2)**
- Response validation
- Fallback to templates
- Caching system
- Edge case handling

**Phase 3: Enhancement (Week 3)**
- Player option generation
- Context optimization
- Response variety tuning
- Integration with reputation/faction systems

**Phase 4: Polish (Week 4)**
- Performance optimization
- Error handling
- Alternative models
- A/B testing different prompts

### Integration Points
- Extend: `universe-system/src/NPCShipAI.ts` - Add dialogue generation
- Use: `universe-system/src/NPCPersonalitySystem.ts` - Personality context
- Use: `universe-system/src/integration/ExtendedNPCMemory.ts` - Memory context
- Create: `universe-system/src/DialogueAISystem.ts` - New dialogue engine
- Modify: Player interaction UI to show AI responses

### Example Conversation

**Context:**
- NPC: Pirate captain "Red Sarah"
- Personality: High boldness (0.9), high greed (0.85), low honor (0.2)
- Player reputation with Pirates: +40 (somewhat respected)
- Recent memory: "Lost cargo to player in combat 3 days ago"
- Current: Not in combat, hull at 85%

**Player hails NPC**

**AI Response:**
> "Well, well. If it isn't the pilot who shot up my last haul. You've got guts hailing me, I'll give you that. You looking to make amends, or are you here to finish what you started?"

**Player selects: "Offer assistance"**

**AI Response:**
> "Assistance? From you? *Laughs* I'll be damned. What's the catch? Nobody offers help for free out here, especially not someone who's already cost me fifty thousand credits."

---

## 14. Dynamic Quest Generation 📖

**Status:** Not Implemented
**Difficulty:** ⭐⭐ HARD
**Estimated Work:** 3-4 weeks

### Overview
Use AI to generate multi-step story missions based on universe state, faction conflicts, and player actions.

### Why This Could Work

The game has rich state tracking:
- Faction warfare (`ConquestSystem.ts`)
- Economic simulation (`EconomySystem.ts`)
- News generation (`NewsGenerationSystem.ts`)
- NPC relationships and memory
- Player reputation and history

An AI could analyze this data and generate contextual quests.

### Architecture

```typescript
interface QuestGenerationContext {
  // Universe State
  activeFactionWars: War[];
  economicCrises: EconomicEvent[];
  recentNews: NewsArticle[];

  // Player Context
  playerLocation: StarSystem;
  playerReputation: Map<string, number>;
  playerSkills: PlayerSkills;
  playerAssets: { credits: number; shipClass: string; fleetSize: number };
  playerHistory: MajorEvent[];

  // Available NPCs
  nearbyNPCs: NPC[];
  enemyNPCs: NPC[];  // NPCs with grudges
  allyNPCs: NPC[];   // NPCs with positive relations

  // Story Hooks
  unfinishedBusinesss: StoryThread[];
  factionNeedsAnalysis: FactionNeed[];
}

interface GeneratedQuest {
  title: string;
  description: string;
  questGiver: NPC;
  questType: QuestType;

  // Multi-step structure
  phases: QuestPhase[];

  // Requirements
  requiredReputation?: Map<string, number>;
  requiredShipCapability?: ShipRequirement;

  // Rewards
  creditReward: number;
  reputationChanges: Map<string, number>;
  itemRewards?: Item[];
  unlocks?: string[];  // New systems, contacts, etc.

  // Story
  narrative: string;
  possibleOutcomes: QuestOutcome[];

  // Expiration
  timeLimit?: number;
  expiresIfNotAccepted?: number;
}

interface QuestPhase {
  phaseNumber: number;
  objective: string;
  location?: StarSystem;
  targetNPC?: NPC;
  requiredAction: QuestAction;

  // Branching
  successNextPhase?: number;
  failureNextPhase?: number;
  alternativePhases?: number[];

  // Story text
  briefing: string;
  completionText: string;
  failureText?: string;
}

enum QuestAction {
  TRAVEL_TO_SYSTEM = 'TRAVEL_TO_SYSTEM',
  DELIVER_CARGO = 'DELIVER_CARGO',
  DESTROY_TARGET = 'DESTROY_TARGET',
  SCAN_LOCATION = 'SCAN_LOCATION',
  TALK_TO_NPC = 'TALK_TO_NPC',
  ACQUIRE_ITEM = 'ACQUIRE_ITEM',
  SMUGGLE_CARGO = 'SMUGGLE_CARGO',
  DEFEND_LOCATION = 'DEFEND_LOCATION',
  RESCUE_SHIP = 'RESCUE_SHIP',
  GATHER_INTEL = 'GATHER_INTEL'
}
```

### AI-Powered Quest Generator

```typescript
class DynamicQuestGenerator {
  async generateQuest(context: QuestGenerationContext): Promise<GeneratedQuest> {
    const prompt = this.buildQuestPrompt(context);
    const response = await this.callLLM(prompt);
    const quest = this.parseQuestResponse(response);

    // Validate quest is achievable
    if (this.validateQuest(quest, context)) {
      return quest;
    } else {
      // Regenerate with constraints
      return this.generateQuest(context);
    }
  }

  private buildQuestPrompt(context: QuestGenerationContext): string {
    return `Generate a space trading/combat quest based on the following universe state:

ACTIVE CONFLICTS:
${context.activeFactionWars.map(w => `- ${w.faction1} vs ${w.faction2} over ${w.contestedSystem}`).join('\n')}

RECENT NEWS:
${context.recentNews.slice(0, 5).map(n => `- ${n.headline}`).join('\n')}

PLAYER STATUS:
- Location: ${context.playerLocation.name}
- Credits: ${context.playerAssets.credits}
- Ship: ${context.playerAssets.shipClass}
- Reputation: ${Array.from(context.playerReputation.entries()).map(([f, r]) => `${f}: ${r}`).join(', ')}

NEARBY NPCS WITH POTENTIAL QUESTS:
${context.nearbyNPCs.slice(0, 10).map(npc =>
  `- ${npc.name} (${npc.type}), Faction: ${npc.faction}, Relationship: ${context.playerReputation.get(npc.id)}`
).join('\n')}

PLAYER HISTORY (for callbacks/revenge plots):
${context.playerHistory.slice(-5).map(e => `- ${e.description}`).join('\n')}

REQUIREMENTS:
1. Create a 2-4 phase quest that ties into the current universe state
2. Quest should feel emergent from the situation, not random
3. Include moral choices or branching where appropriate
4. Rewards should be proportional to difficulty and player level
5. Quest giver should have logical motivation based on their faction/personality
6. Each phase should have clear objective and location
7. Include story text for briefing and completion

OUTPUT FORMAT (JSON):
{
  "title": "Quest title",
  "description": "One paragraph overview",
  "questGiverId": "NPC ID",
  "phases": [
    {
      "phaseNumber": 1,
      "objective": "Clear objective text",
      "location": "System name or null",
      "requiredAction": "QUEST_ACTION_ENUM",
      "briefing": "What NPC tells player",
      "completionText": "What happens on success"
    }
  ],
  "creditReward": number,
  "reputationChanges": {"FactionName": +/-number},
  "narrative": "Full story context"
}`;
  }
}
```

### Example Generated Quest

**Context:**
- Faction War: Trade Federation vs Pirates in Andromeda Sector
- Player has +60 rep with Trade Federation
- Recent news: "Trade convoy destroyed by pirate raiders"
- Player location: Gateway Station (Trade Federation space)

**Generated Quest:**

```json
{
  "title": "Retribution Run",
  "description": "Trade Federation merchant captain seeks revenge for lost convoy and needs someone expendable enough to take the risk.",
  "questGiverId": "npc_captain_valdez",
  "phases": [
    {
      "phaseNumber": 1,
      "objective": "Gather intelligence on pirate base location",
      "location": "Fringe Station",
      "requiredAction": "TALK_TO_NPC",
      "briefing": "Captain Valdez: 'Those pirate bastards hit my convoy three days ago. Took everything. I know a fence at Fringe Station who might know where they operate from. His name is Riko. Tell him Valdez sent you, and make it worth his while.'",
      "completionText": "Riko: 'Yeah, I know where they hole up. Asteroid field in the Obsidian System, sector 7. But here's the thing - they're expecting retaliation. Security's tight. You'll need a way in...'",
      "choices": [
        {
          "text": "Pay Riko 5000 credits for detailed intel",
          "cost": 5000,
          "effect": "Unlock Phase 2A (stealth approach)"
        },
        {
          "text": "Threaten Riko for information",
          "effect": "Unlock Phase 2B (direct assault), -10 rep with Fringe Underground"
        }
      ]
    },
    {
      "phaseNumber": 2,
      "objective": "Infiltrate pirate base and locate stolen cargo",
      "location": "Obsidian System",
      "requiredAction": "SCAN_LOCATION",
      "briefing": "With Riko's intel in hand, you plot a course to the Obsidian asteroid field. The pirate base is well-hidden among the rocks. You'll need to scan the sector to find it without triggering their defenses.",
      "completionText": "You locate the base tucked into a hollowed-out asteroid. Your scanners pick up Valdez's cargo signature - they haven't moved it yet. But six pirate fighters patrol the perimeter."
    },
    {
      "phaseNumber": 3,
      "objective": "Retrieve the stolen cargo",
      "location": "Obsidian System",
      "requiredAction": "ACQUIRE_ITEM",
      "briefing": "The cargo is there, but getting to it won't be easy. You have options: fight through the patrols, try to sneak in using a fake distress call, or negotiate with the pirate captain.",
      "choices": [
        {
          "text": "Attack the base and take the cargo by force",
          "requiredAction": "DESTROY_TARGET",
          "difficulty": "HARD",
          "effect": "+20 Trade Federation rep, -40 Pirate rep, possible ship damage"
        },
        {
          "text": "Negotiate to buy back the cargo",
          "requiredAction": "TALK_TO_NPC",
          "cost": 15000,
          "effect": "Neutral reputation change, peaceful resolution"
        },
        {
          "text": "Fake distress call and steal cargo during confusion",
          "requiredAction": "SMUGGLE_CARGO",
          "difficulty": "MEDIUM",
          "successChance": 0.7,
          "effect": "+15 Trade Federation rep, -20 Pirate rep if caught"
        }
      ]
    },
    {
      "phaseNumber": 4,
      "objective": "Return cargo to Captain Valdez",
      "location": "Gateway Station",
      "requiredAction": "DELIVER_CARGO",
      "briefing": "Cargo secured. Time to return to Gateway Station and collect your reward from Valdez.",
      "completionText": "Captain Valdez: 'You actually pulled it off. I didn't think I'd see this cargo again. Here's your payment, and then some. You've earned the Federation's gratitude - and mine.'"
    }
  ],
  "creditReward": 35000,
  "reputationChanges": {
    "Trade Federation": 25,
    "Pirates": -30
  },
  "possibleBonusRewards": {
    "condition": "Complete phase 3 by combat",
    "reward": "Salvage: Pirate Fighter Blueprints"
  },
  "narrative": "A Trade Federation merchant captain lost a valuable cargo convoy to pirate raiders. Seeking revenge and recovery, he contracts you to track down the stolen goods and deliver justice - or at least get his merchandise back. How you handle the pirates is up to you, but every choice has consequences in this volatile sector."
}
```

### Quest Validation

```typescript
class QuestValidator {
  validate(quest: GeneratedQuest, context: QuestGenerationContext): boolean {
    // Check quest is achievable
    if (!this.playerHasRequiredReputation(quest, context.playerReputation)) {
      return false;
    }

    // Check locations exist
    for (const phase of quest.phases) {
      if (phase.location && !this.systemExists(phase.location)) {
        return false;
      }
    }

    // Check NPCs exist and are accessible
    if (!this.npcExists(quest.questGiver)) {
      return false;
    }

    // Check rewards are reasonable
    if (quest.creditReward > 1000000 || quest.creditReward < 1000) {
      return false;
    }

    // Check phases form coherent chain
    if (!this.phasesAreConnected(quest.phases)) {
      return false;
    }

    return true;
  }
}
```

### Implementation Path

**Phase 1: Quest Templates (Week 1)**
- Create quest template system
- Manual quest creation to test structure
- Quest tracking and progression

**Phase 2: AI Generation (Week 2)**
- Integrate LLM for quest generation
- Context gathering from universe state
- JSON parsing and validation

**Phase 3: Branching & Choices (Week 3)**
- Implement quest branching
- Player choice tracking
- Multiple outcomes

**Phase 4: Integration (Week 4)**
- Connect to faction systems
- Reputation consequences
- Reward distribution
- Quest history tracking

### Integration Points
- Extend: `universe-system/src/MissionSystem.ts` - Add AI-generated quests
- Use: `universe-system/src/NewsGenerationSystem.ts` - Story context
- Use: `universe-system/src/FactionSystem.ts` - Political context
- Create: `universe-system/src/DynamicQuestGenerator.ts`

---

## 15. Emergent Narrative System 📰

**Status:** Partial (`NewsGenerationSystem.ts` exists)
**Difficulty:** ⭐⭐⭐ MODERATE
**Estimated Work:** 2-3 weeks

### Overview
Extend the existing news system to chronicle player actions and generate emergent stories about the player's impact on the universe.

### Current State
- `universe-system/src/NewsGenerationSystem.ts` generates news about faction events
- News is broadcast to stations and spreads as rumors
- Player actions are not currently included in news

### Enhancement: Player as News Subject

```typescript
interface PlayerNewsEvent {
  type: PlayerActionType;
  location: StarSystem;
  timestamp: number;
  details: any;
  witnesses: NPC[];
  evidence: string[];
  notoriety: number;  // How newsworthy (0-100)
}

enum PlayerActionType {
  MAJOR_COMBAT_VICTORY = 'MAJOR_COMBAT_VICTORY',
  PIRATE_ATTACK = 'PIRATE_ATTACK',
  RESCUE_OPERATION = 'RESCUE_OPERATION',
  MAJOR_TRADE_DEAL = 'MAJOR_TRADE_DEAL',
  FACTION_BETRAYAL = 'FACTION_BETRAYAL',
  STATION_DEFENSE = 'STATION_DEFENSE',
  FIRST_CONTACT = 'FIRST_CONTACT',
  SMUGGLING_BUST = 'SMUGGLING_BUST',
  HUMANITARIAN_AID = 'HUMANITARIAN_AID'
}
```

### Player Reputation Through Media

```typescript
class PlayerMediaReputation {
  aliases: Map<string, AliasProfile>;
  publicIdentity: PublicIdentity;

  // Player can be known by different names in different regions
  interface AliasProfile {
    name: string;
    region: StarSystem[];
    reputation: 'HERO' | 'VILLAIN' | 'MYSTERIOUS' | 'NOTORIOUS' | 'UNKNOWN';
    knownFor: string[];
    lastSighting: StarSystem;
    bounty?: number;
  }
}
```

Example:
- In Trade Federation space: Known as "Captain Reynolds, reliable courier"
- In Pirate territories: Known as "The Ghost, pirate hunter"
- In Independent systems: "Mysterious benefactor who donated medical supplies"

### AI-Generated News Articles

```typescript
class PlayerNewsGenerator {
  async generateNewsArticle(event: PlayerNewsEvent): Promise<NewsArticle> {
    const context = {
      event: event,
      playerReputation: this.getLocalReputation(event.location),
      recentPlayerActions: this.getRecentActions(7), // Last week
      factionPerspective: this.getFactionBias(event.location)
    };

    const prompt = `Generate a news article about this player action:

EVENT: ${event.type}
LOCATION: ${event.location.name}
DETAILS: ${JSON.stringify(event.details)}

PLAYER REPUTATION IN REGION: ${context.playerReputation}
RECENT PLAYER ACTIONS: ${context.recentPlayerActions.join(', ')}

FACTION PERSPECTIVE: ${context.factionPerspective}
(This news is being published by ${context.factionPerspective.faction}, which has ${context.factionPerspective.bias} bias)

Generate a news headline and 2-paragraph article from this faction's perspective. Include:
1. Factual description of event
2. Speculation about player's motives
3. Quotes from witnesses or officials
4. Appropriate bias based on faction relationship with player

Tone: ${context.factionPerspective.tone}`;

    const article = await this.callLLM(prompt);
    return this.parseArticle(article, event);
  }
}
```

### Example Generated Articles

**Event:** Player destroys 5 pirate ships attacking a civilian convoy

**Trade Federation News:**
> **HEADLINE:** "Heroic Pilot Saves Merchant Convoy from Pirate Ambush"
>
> Gateway Station - A lone fighter pilot, identified only as "Reynolds," single-handedly defended a Trade Federation convoy from a coordinated pirate attack in the Andromeda Sector yesterday. Five pirate vessels were destroyed in the engagement, with no civilian casualties reported.
>
> "They came out of nowhere," said convoy leader Captain Sarah Mills. "We were dead in the water. Then this pilot shows up and just... takes them all out. Never seen anything like it."
>
> Trade Federation officials are seeking to identify the pilot to offer official commendation. The Council of Merchants has authorized a 10,000 credit reward for information leading to the pilot's identification.

**Pirate News (Underground Channels):**
> **HEADLINE:** "Bounty Hunter 'Reynolds' Claims Five More Brothers"
>
> The pilot known in our circles as 'Reynolds' or 'The Ghost' struck again in Andromeda, ambushing a legitimate salvage operation and murdering five independent operators. Sources say the victims were simply investigating an abandoned convoy when Reynolds opened fire without warning.
>
> "This corporate lapdog has killed two dozen of our people in the last month," said Captain Redbeard of the Free Spacers Coalition. "A 50,000 credit bounty stands for anyone who takes him out. Dead or alive."

### Consequences of Media Coverage

```typescript
interface MediaConsequences {
  // Fame/Infamy affects NPC behavior
  recognitionChance: number;  // NPCs recognize player

  // Faction responses
  factionsOffering: Faction[];     // Want to hire player
  factionsHunting: Faction[];      // Want player dead

  // Economic
  priceModifiers: Map<Faction, number>;  // Discounts or markups

  // Access
  invitationsReceived: Invitation[];  // Special missions, events
  locationsBanned: Station[];         // Denied docking

  // Wanted status
  bounties: Bounty[];

  // Story
  rivalGeneration: NPC[];  // NPCs with grudges seek revenge
}
```

### Chronicle System

Track player's story arc over time:

```typescript
interface PlayerChronicle {
  chapters: ChronicleChapter[];
  majorMilestones: Milestone[];
  characterArc: string;  // AI-generated summary
}

interface ChronicleChapter {
  title: string;
  period: { start: Date; end: Date };
  summary: string;  // AI-generated
  keyEvents: PlayerNewsEvent[];
  characterGrowth: string;
  themeNarrative: string;
}
```

Example Chronicle Entry:
> **Chapter 3: "The Andromeda Campaign"**
> *Days 45-67*
>
> What began as simple courier runs evolved into a personal war against piracy. After witnessing a civilian transport destroyed, Reynolds took it upon himself to hunt down the perpetrators. Over three weeks, 24 pirate vessels fell to his guns. The Trade Federation hailed him as a hero; the pirate clans marked him for death. This chapter marked Reynolds' transition from neutral trader to active participant in the sector's conflicts.
>
> Key Events:
> - Convoy massacre witnessed (Day 45)
> - First pirate kill (Day 46)
> - Trade Federation contract accepted (Day 52)
> - Bounty placed by Pirate Coalition (Day 58)
> - Battle of Obsidian Belt - 8 pirate ships destroyed (Day 64)

### Rumor Propagation

```typescript
class RumorSystem {
  // Stories spread and mutate
  propagateRumor(originalEvent: PlayerNewsEvent): Rumor[] {
    const rumors: Rumor[] = [];

    // Truth degrades with distance
    const distanceFromEvent = this.calculateDistance(event.location);
    const accuracy = Math.max(0.3, 1 - (distanceFromEvent * 0.1));

    // Generate variants
    if (accuracy < 0.8) {
      // Exaggerated version
      rumors.push({
        type: 'EXAGGERATED',
        text: this.exaggerateEvent(originalEvent),
        believability: 0.6
      });
    }

    if (accuracy < 0.6) {
      // Completely wrong version
      rumors.push({
        type: 'DISTORTED',
        text: this.distortEvent(originalEvent),
        believability: 0.4
      });
    }

    return rumors;
  }
}
```

Example Rumor Evolution:

**Original (at event location):**
"A pilot in a Viper-class fighter destroyed 5 pirate ships."

**1 jump away:**
"Some hotshot pilot took out a whole pirate squadron single-handed."

**3 jumps away:**
"They say there's a ghost ship that appears out of nowhere and massacres entire pirate fleets."

**5 jumps away:**
"I heard the Trade Federation has a secret super-weapon that vaporizes pirates. Saw it myself."

### Implementation Path

**Phase 1: Player Event Tracking (Week 1)**
- Log significant player actions
- Calculate newsworthiness
- Integrate with existing news system

**Phase 2: AI Article Generation (Week 2)**
- LLM integration for article writing
- Faction bias in reporting
- Multiple perspectives on same event

**Phase 3: Consequences (Week 3)**
- Recognition system (NPCs know who you are)
- Bounty/reward generation
- Access changes based on reputation

**Phase 4: Chronicle System (Week 4)**
- Chapter generation
- Long-term story arc tracking
- Player history visualization

### Integration Points
- Extend: `universe-system/src/NewsGenerationSystem.ts` - Add player events
- Use: `universe-system/src/PlayerShipIntegration.ts` - Track player actions
- Create: `universe-system/src/PlayerMediaSystem.ts`
- Create: `universe-system/src/ChronicleSystem.ts`

---

## Summary

These aspirational features build on the solid foundation of the core player interaction systems (1-8). They represent the evolution from "player participates in universe" to "player shapes universe through their actions and becomes part of its ongoing story."

**Recommended Priority:**
1. **AI Dialogue** (#13) - Highest impact for NPC immersion, moderate difficulty
2. **Emergent Narrative** (#15) - Makes player feel their actions matter, extends existing news system
3. **Dynamic Quests** (#14) - Infinite content generation, but requires dialogue system first
4. **Boarding** (#9) - High player request, meaningful tactical depth
5. **Fleet Command** (#10) - Strategic layer, but complex
6. **Territory** (#11) - End-game content, very complex
7. **Planet Surface** (#12) - Essentially a second game, massive undertaking

**Quick Wins:**
- Emergent Narrative (#15) - Can start with simple player event logging and basic news generation
- AI Dialogue (#13) - With cloud APIs, could prototype in a weekend

**Long-term Projects:**
- Planet Surface (#12) - Save for major expansion
- Territory Ownership (#11) - End-game strategic layer
