# Detailed Systems Guide
## Dwarf Fortress/Caves of Qud Level Game Depth

This document describes the advanced simulation systems that provide unprecedented depth to the game world.

---

## Table of Contents
1. [Material System](#material-system)
2. [Biome System](#biome-system)
3. [Procedural Lore System](#procedural-lore-system)
4. [NPC Personality System](#npc-personality-system)
5. [Integration Guide](#integration-guide)

---

## Material System

**File:** `universe-system/src/MaterialSystem.ts`

### Overview
A comprehensive material properties database with realistic physics simulation. Every material in the game has detailed properties affecting gameplay.

### Features

#### Physical Properties
- **Density** - Mass per unit volume (kg/m³)
- **Melting/Boiling Points** - Phase transition temperatures
- **Thermal Conductivity** - Heat transfer rate
- **Electrical Conductivity** - Current flow capacity
- **Hardness** - Resistance to deformation (Mohs scale)
- **Strength** - Tensile, compressive, and shear strength
- **Elasticity** - Young's modulus

#### Chemical Properties
- **Corrosion Resistance** - Reaction to environment
- **Reactivity** - How readily it reacts
- **Oxidation** - Rust and tarnish rates
- **Toxicity** - Danger to organic life
- **Radioactivity** - Nuclear decay rate

#### Gameplay Properties
- **Value** - Economic worth per kilogram
- **Rarity** - How difficult to find (0-1)
- **Utility Score** - Overall usefulness
- **Extraction Difficulty** - Mining/harvesting challenge
- **Refinement Cost** - Processing requirements

### Material Categories

1. **Metals** - Steel, titanium, aluminum, platinum, gold
2. **Exotic Materials** - Graphene, aerogel, neutronium, strange matter
3. **Fuels** - RP-1, liquid hydrogen, helium-3
4. **Ceramics** - Tungsten carbide
5. **Life Support** - Lithium hydroxide (CO2 scrubbing)

### Example Usage

```typescript
import { MaterialDatabase, MaterialCategory } from './MaterialSystem';

// Initialize database
MaterialDatabase.initialize();

// Get specific material
const steel = MaterialDatabase.getMaterial('steel');
console.log(steel.tensileStrength); // 400 MPa
console.log(steel.description); // Full lore text

// Get all metals
const metals = MaterialDatabase.getMaterialsByCategory(MaterialCategory.METAL);

// Check material state at temperature
const state = MaterialDatabase.getMaterialState(steel, 2000); // 'LIQUID'

// Calculate material interaction
const interaction = MaterialDatabase.calculateInteraction(
  steel,
  titanium,
  800, // temperature in K
  101325 // pressure in Pa
);
console.log(interaction.reactionRate);
console.log(interaction.productsDescription);
```

### Special Materials

#### Neutronium
- Density: 4×10^17 kg/m³
- From neutron stars
- A teaspoon weighs a billion tons
- Requires gravity manipulation to handle

#### Strange Matter
- Hypothetical quark matter
- Contact converts normal matter to strange matter
- Could theoretically destroy a planet
- Handle with... well, you can't

#### Helium-3
- Holy grail of fusion fuel
- Worth $50,000 per kg
- Rare on Earth, abundant on Moon
- Powers future civilization

---

## Biome System

**File:** `universe-system/src/BiomeSystem.ts`

### Overview
Procedurally generated biomes with rich ecosystems, unique flora/fauna, and environmental storytelling.

### Biome Types

#### Frozen Worlds
- **Cryogenic Plains** - Nitrogen ice, quasi-life forms, methane swimmers
- **Ammonia Ice Fields** - Toxic storms, frost lichen

#### Temperate Worlds
- **Xenoflora Rainforest** - 200m Titan Trees, singing vines, crystal flowers
  - Canopy Gliders - Six-winged creatures with echolocation
  - Bioluminescent waterfalls
  - Ancient groves 10,000+ years old
- **Endless Prairie** - 3m purple grass, Thunder Beasts, Grass Stalkers
  - Migration routes millions of years old
  - Grass fires racing at 60 km/h

#### Hot Worlds
- **Volcanic Hellscape** - Lava flows, obsidian spires, magma worms
  - Silicon-based life
  - Glowing red skies
  - Continuous eruptions

#### Special Biomes
- **Floating Islands** - Magnetic levitation, sky whales, cloud cities
  - Islands drift on magnetic fields
  - Ancient civilization ruins
  - The Grand Convergence (every 20 years)
- **Crystal Desert** - Living crystals, sand sailors, singing glass
  - Silicon-based quasi-life
  - Storms of microscopic glass
  - Crystal forests that sing

### Flora System

Each plant species has:
- Scientific name
- Height range and lifecycle
- Edibility, medicinal value, toxicity
- Bioluminescence
- Propagation method (seeds, spores, runners, budding)
- Symbiotic relationships

Example - **Titan Tree:**
```
Name: Titan Tree
Scientific: Arbor giganticus
Height: 150-250 meters
Lifecycle: 2000 years
Properties: Bioluminescent bark bacteria, hallucinogenic sap
Symbiosis: Nitrogen-fixing nodules, Root Burrowers
```

### Fauna System

Each creature has:
- Size and mass
- Diet type (herbivore, carnivore, lithotroph, photosynthetic)
- Behavior (solitary, pack, herd, colony)
- Intelligence and aggression levels
- Domesticability
- Special adaptations

Example - **Cloud Whale:**
```
Length: 50 meters
Mass: 50,000 kg
Diet: Atmospheric plankton filter-feeder
Behavior: Solitary
Intelligence: 0.9 (highly intelligent)
Special: Magnetic field manipulation for flight
Notes: Songs echo for hundreds of kilometers
```

### Environmental Features

- **Ancient Groves** - Trees remembering the dawn of life
- **Bioluminescent Waterfalls** - Glowing microorganisms
- **Singing Crystals** - Wind creates otherworldly music
- **Pressure Ridges** - Tectonic ice mountains
- **Nitrogen Geysers** - Frozen eruptions creating ice spires

### Hazards

Each biome has unique dangers:
- **Spore Clouds** - Hallucinogenic or deadly
- **Predatory Plants** - Venus flytraps on steroids
- **Stampedes** - Thunder Beast herds
- **Atmospheric Collapse** - Freezing nitrogen snow
- **Silicon Storms** - Glass shards stripping flesh

---

## Procedural Lore System

**File:** `universe-system/src/ProceduralLoreSystem.ts`

### Overview
Generates complete alternate histories with civilizations, wars, heroes, artifacts, and legends. Creates deep background lore for every star system.

### Civilization Generation

Each civilization has:
- **Name and Species** - Procedurally generated
- **Government Type** - Democracy, autocracy, hive mind, etc.
- **Cultural Traits** - Warlike, peaceful, scientific, spiritual...
- **Technology Level** - Stone age to singularity (1-10)
- **Territory** - Planets and stations controlled
- **Allies and Enemies** - Diplomatic relations
- **Language** - Unique phonology and writing system

### Historical Events

The system simulates thousands of years of history:

#### Event Types
- **Founding** - Birth of civilization
- **Wars** - Conflicts with detailed casualties
- **Discoveries** - Ancient ruins, alien tech, dimensional portals
- **Catastrophes** - Plagues, asteroids, AI uprisings
- **Golden/Dark Ages** - Periods of flourishing or decline
- **First Contact** - Meeting other civilizations
- **Technological Breakthroughs** - Nuclear power, FTL, etc.
- **Mysterious Disappearances** - Entire civilizations vanishing

#### Example Event
```
The War of Two Suns
Timestamp: -15,234,567 seconds
Actors: Neo-Terra Federation, Xeno-Sol Empire
Casualties: 45,234,891
Outcome: Pyrrhic victory for Neo-Terra
Significance: 0.9

Narrative: "The War of Two Suns raged for decades. Cities burned.
Entire generations were lost. When the fighting finally ceased,
45 million had perished, and the world was forever changed."

Rumor: "My parents never spoke of the war. The pain was too great.
But I've seen the mass graves."

Evidence: Ancient battlefields, mass graves, destroyed cities
```

### Heroes and Legends

#### Hero System
- Unique names and titles ("Zarian the Brave")
- Personality traits
- Major achievements
- Heroic deeds with witnesses
- Legendary status
- Fate (glorious death, betrayal, ascension, etc.)
- Tomb locations

#### Example Hero
```
Name: Kelion the Just
Title: The Peacemaker
Traits: Compassionate, Visionary
Deeds:
  - United the warring tribes (10,000 witnesses)
  - Prevented the catastrophe
  - Decoded the ancient texts
Fate: Ascended to legend
Tomb: The Golden Monument
```

### Artifacts

Procedurally generated items with:
- Unique names and descriptions
- Material composition
- Special powers (reality distortion, consciousness transfer)
- Creation history
- Chain of ownership
- Curses and blessings
- Current location (maybe lost)

#### Example Artifact
```
Name: Crystal Blade
Type: Weapon
Material: Starlight-forged alloy
Created: -2,500,000,000 seconds ago
Creator: Proto-Astra Empire
Power: "Cuts through any material"
Curse: "All who possess it meet tragic ends"
Location: Hidden in ancient ruins at (34.2°N, 118.5°W)
```

### Monuments

Ancient structures scattered across worlds:
- **Types** - Temples, palaces, libraries, tombs, megastructures
- **Purpose** - Honor gods, seat of government, knowledge repository
- **Inscriptions** - Ancient warnings and prophecies
- **Status** - Still standing or ruined
- **Discoverable** - Players can find them

### Legends

Historical events mythologized over time:
- Based on real events
- Truth value (30-70% accurate)
- Different civilization variants
- Prophecies about future events

Example:
```
Legend: The Fall of the First Empire
Based On: Actual extinction event 5 million years ago
Truth: 40% (heavily embellished)
Narrative: "They say the First Empire didn't fall - they ascended
to become beings of pure energy. Some nights, you can still see
their lights dancing in the upper atmosphere."
Prophecy: "When the three moons align, they shall return."
```

---

## NPC Personality System

**File:** `universe-system/src/NPCPersonalitySystem.ts`

### Overview
Every NPC is a unique individual with deep personality, memories, relationships, goals, and emergent behavior.

### Personality Traits

#### Big Five Personality Model
- **Openness** - Conservative vs. experimental (0-1)
- **Conscientiousness** - Reckless vs. dutiful
- **Extraversion** - Shy vs. social
- **Agreeableness** - Hostile vs. friendly
- **Neuroticism** - Calm vs. anxious

#### Additional Traits
- **Courage** - Cowardly vs. brave
- **Greed** - Generous vs. greedy
- **Honor** - Dishonest vs. honorable
- **Curiosity** - Incurious vs. inquisitive
- **Ruthlessness** - Merciful vs. ruthless

### Background System

Every NPC has:
- **Origin** - Earth Colony, Mars, Belt Station, etc.
- **Occupation** - Pilot, engineer, trader, mercenary...
- **Past Occupations** - Career history
- **Education** - Formal academy or self-taught
- **Family Status** - Alive, orphan, unknown
- **Major Life Events** - Ship disasters, betrayals, discoveries
- **Reputation** - -1 to 1
- **Criminal Record** - Maybe
- **Military Service** - Maybe

### Skills
Each NPC has varying proficiency in:
- Piloting
- Combat
- Engineering
- Negotiation
- Stealth
- Medicine
- Science

### Emotional System

#### Moods
- Ecstatic
- Happy
- Content
- Neutral
- Uneasy
- Angry
- Terrified
- Depressed
- Manic

Moods affected by:
- Recent events
- Personality traits
- Stress levels
- Relationships

#### Stress System
- Accumulates from combat, disasters, conflicts
- Affects decision-making
- High stress → poor decisions, panic
- Decays slowly over time

### Memory System

NPCs remember:
- Important events with emotional impact
- People they've met
- Places they've been
- Things they've witnessed

Memories have:
- **Emotional Impact** - How it affected them
- **Importance** - How significant
- **Reliability** - Memories fade and distort over time

### Relationship System

NPCs track relationships with others:
- **Type** - Family, friend, ally, rival, enemy, romantic
- **Strength** - How strong the relationship is
- **History** - Events that shaped it

Relationships evolve based on interactions.

### Goals and Motivations

#### Short-Term Goals
- Make credits
- Repair ship
- Find crew
- Deliver cargo
- Avoid authorities

#### Long-Term Goals
- Own a fleet
- Find lost family
- Retire wealthy
- Discover alien tech
- Build a legacy

Goals have:
- Priority level
- Progress tracking
- Consequences of completion/failure

### Ideology

NPCs have political/philosophical beliefs:
- **Economic** - Communist to capitalist
- **Authoritarian** - Libertarian to authoritarian
- **Militarism** - Pacifist to warlike
- **Xenophobia** - Xenophilic to xenophobic
- **Techno-Optimism** - Luddite to transhumanist
- **Faction Loyalties** - Which groups they support

### Dialogue System

Context-aware dialogue generation based on:
- Personality traits
- Current mood
- Relationship with listener
- Recent events
- Vocabulary style (eloquent, technical, slang, formal, etc.)

#### Dialogue Tones
- Friendly
- Hostile
- Fearful
- Formal
- Casual
- Sarcastic
- Cryptic
- Flirtatious
- Desperate

#### Example Dialogue

High extraversion, friendly relationship:
```
"Hey there, Morgan! How's it going? Good to see you, friend.
That's the way the void spins!"
```

Low agreeableness, enemy relationship:
```
"You again. What do you want? Stay out of my way."
```

High neuroticism, high stress:
```
"P-please, I don't want any trouble... Just leave me alone!"
```

### Decision-Making

NPCs make decisions based on:
1. **Threat Assessment** - How dangerous is the situation?
2. **Opportunity Evaluation** - What's the potential reward?
3. **Personality** - What would THIS character do?
4. **Goals** - Does this help achieve goals?
5. **Relationships** - Who else is involved?

#### Decision Examples

High courage, low greed:
```
Situation: Distress call from unknown ship
Decision: Investigate and offer help (heroic)
```

Low courage, high greed:
```
Situation: Dangerous salvage opportunity
Decision: Flee (too risky)
```

High curiosity, high openness:
```
Situation: Strange alien artifact
Decision: Study it extensively (scientific)
```

### Emergent Behavior

The combination of personality, memories, relationships, and goals creates emergent storytelling:

- NPCs form friendships and rivalries naturally
- They pursue their own agendas
- They remember and reference past events
- They change based on experiences
- They spread rumors and share information
- They make mistakes based on personality flaws

---

## Integration Guide

### How Systems Work Together

#### 1. Planet Generation Flow
```
PlanetGenerator creates basic planet
  ↓
GeologicalActivity adds tectonics, volcanoes
  ↓
BiomeSystem generates ecosystems based on geology
  ↓
WeatherSystem simulates climate
  ↓
ProceduralLoreSystem adds ancient civilizations and ruins
  ↓
MaterialSystem determines resource deposits
```

#### 2. NPC-World Interaction
```
NPC spawns with personality from NPCPersonalitySystem
  ↓
NPC learns about world through exploration
  ↓
NPC forms opinions about locations, factions
  ↓
NPC creates memories of events
  ↓
NPC shares rumors and lore with player
  ↓
NPC makes decisions based on personality and knowledge
```

#### 3. Discovery Loop
```
Player explores planet
  ↓
Finds ancient monument (from ProceduralLoreSystem)
  ↓
Reads inscriptions (historical lore)
  ↓
Learns about artifact location
  ↓
Searches biome (from BiomeSystem)
  ↓
Encounters hazards and creatures
  ↓
Finds artifact made of special material
  ↓
Material properties affect gameplay
  ↓
NPCs react based on personality and ideology
```

### Example Integration: Landing on New Planet

```typescript
// 1. Generate planet
const planet = planetGenerator.generatePlanet('planet_001', 'Kepler-442b', 1.2, starMass);

// 2. Add geology
const geology = new GeologicalActivity(planet);

// 3. Generate biomes
const biomeSystem = new BiomeSystem(planet);
const biomes = biomeSystem.getAllBiomes();

// 4. Create weather
const weather = new WeatherSystem(planet);

// 5. Generate history
const loreSystem = new ProceduralLoreSystem(seed);
loreSystem.generateSystemHistory('kepler-442', 4.5e9); // 4.5 billion years

// 6. Get ancient ruins
const ruins = loreSystem.getCivilizations()
  .filter(civ => civ.status === CivilizationStatus.EXTINCT)
  .flatMap(civ => civ.monuments);

// 7. Place NPCs
const npcSystem = new NPCPersonalitySystem();
const explorer = npcSystem.generateNPC('npc_001', seed);

// 8. NPC learns lore
const localLegends = loreSystem.getLegends()
  .filter(legend => legend.knownBy.length > 0);

explorer.knownRumors = localLegends.map(leg => ({
  id: leg.id,
  content: leg.narrative,
  truthValue: leg.truthValue,
  source: 'ancient_texts',
  timestamp: Date.now(),
  spreadCount: 0
}));

// 9. Player lands
const landingSpot = { latitude: 0.5, longitude: 1.2 };
const localBiome = biomeSystem.getBiomeAt(landingSpot.latitude, landingSpot.longitude, 0);
const localWeather = weather.getWeatherAt(landingSpot.latitude, landingSpot.longitude, 0);

console.log(`Landing in ${localBiome.name}`);
console.log(`Weather: ${localWeather.weather?.type}, Wind: ${localWeather.wind?.speed} m/s`);
console.log(`Hazards: ${localBiome.hazards.map(h => h.name).join(', ')}`);

// 10. NPC reacts
const dialogue = npcSystem.generateDialogue(explorer.id, 'player', {
  location: localBiome.name,
  recentEvents: ['landing', 'storm_approaching']
});

console.log(`${explorer.name}: "${dialogue.text}"`);
```

### Performance Considerations

#### Lazy Generation
- Don't generate everything at once
- Generate biomes as player approaches
- Generate NPCs as needed
- Cache generated content

#### Memory Management
- Limit active NPCs (e.g., 100)
- Prune old memories periodically
- Archive distant chunks

#### Update Frequency
- Weather: Every 60 seconds
- NPC decisions: Every 5 seconds
- Geological events: Every hour (game time)
- Lore: Static after generation

---

## Future Enhancements

### Planned Features

1. **Faction System**
   - Dynamic faction creation
   - Territory control
   - Economic warfare
   - Cultural evolution

2. **Advanced Ecology**
   - Food webs
   - Predator-prey dynamics
   - Evolution simulation
   - Extinction events

3. **Detailed Damage Model**
   - Component wear and tear
   - Maintenance requirements
   - Cascading failures
   - Repair complexity

4. **Economic Simulation**
   - Supply chains
   - Trade routes
   - Market manipulation
   - Economic cycles

5. **Cultural Evolution**
   - Art and music generation
   - Cultural exchange
   - Religious movements
   - Scientific progress

6. **Emergent Narratives**
   - Quest generation from NPC goals
   - Dynamic faction storylines
   - Player impact on history

---

## Appendix: Example Scenarios

### Scenario 1: The Lost Civilization

Player arrives at desert planet. Explores Crystal Desert biome. Finds singing crystal formations. Follows sound to ancient monument - "The Great Library". Reads inscriptions about the "Proto-Stellar Empire". Learns they were searching for "The First Mechanism". NPC engineer has rumor about artifact location. Player finds artifact in dangerous lava biome. Artifact is made of unknown material with reality-distorting properties. Studying it reveals connection to current faction conflict.

### Scenario 2: The Haunted Station

Abandoned station orbiting gas giant. NPCs refuse to dock due to rumors. Investigation reveals it was research station for extinct civilization. Lore system shows it was destroyed in AI uprising 500 years ago. Still contains valuable data and artifacts. But automated defenses still active. Weather system creates electromagnetic storms that disable shields. NPCs with high courage and curiosity will help. Those with fear of AI will refuse. Different personalities lead to different outcomes.

### Scenario 3: The Prophet

NPC with high neuroticism and low sanity has been studying ancient texts. Claims to have decoded prophecy about "return of the ancients". Other NPCs react based on ideology (spiritual believe, scientific dismiss). Player investigates ruins mentioned in prophecy. Discovers lore about civilization that "ascended to higher plane". Weather system creates aurora phenomenon matching prophecy. Ancient artifact activates. NPCs' beliefs are vindicated or crushed based on outcome. Relationships shift dramatically.

---

## Conclusion

These systems create unprecedented depth:

- **Materials matter** - Every component has realistic properties
- **Biomes live** - Ecosystems with real ecology
- **History is tangible** - Ancient events leave evidence
- **NPCs are people** - Complex personalities and motivations
- **Stories emerge** - Unscripted narratives from simulation

The game world feels real because it IS simulated at deep levels. Like Dwarf Fortress and Caves of Qud, the fun comes from the simulation itself, not scripted content.

---

**Last Updated:** 2025-11-18
**Version:** 1.0
**Author:** Claude (Anthropic)
