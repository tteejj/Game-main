/**
 * ProceduralLoreSystem.ts
 * Procedural history and lore generation - Dwarf Fortress level depth
 * Generates entire civilizations, wars, artifacts, and legends
 */

export interface HistoricalEvent {
  id: string;
  timestamp: number;                    // Game time
  eventType: EventType;
  location: { latitude: number; longitude: number; bodyId: string };
  actors: string[];                     // Entity IDs involved
  outcome: string;
  consequences: string[];
  artifacts: string[];                  // Artifacts created/destroyed
  casualties: number;
  significance: number;                 // 0-1 (historical importance)
  narrativeDescription: string;
  shortDescription: string;
  rumorText: string;                    // What NPCs might say
  evidenceRemaining: boolean;
  discoverable: boolean;
}

export enum EventType {
  FOUNDING = 'FOUNDING',
  WAR = 'WAR',
  DISCOVERY = 'DISCOVERY',
  CATASTROPHE = 'CATASTROPHE',
  GOLDEN_AGE = 'GOLDEN_AGE',
  DARK_AGE = 'DARK_AGE',
  FIRST_CONTACT = 'FIRST_CONTACT',
  REBELLION = 'REBELLION',
  PLAGUE = 'PLAGUE',
  TECHNOLOGICAL_BREAKTHROUGH = 'TECHNOLOGICAL_BREAKTHROUGH',
  EXTINCTION = 'EXTINCTION',
  ASCENSION = 'ASCENSION',
  MYSTERIOUS_DISAPPEARANCE = 'MYSTERIOUS_DISAPPEARANCE',
  ARTIFACT_CREATION = 'ARTIFACT_CREATION',
  TERRAFORM = 'TERRAFORM',
  STATION_CONSTRUCTION = 'STATION_CONSTRUCTION'
}

export interface Civilization {
  id: string;
  name: string;
  founded: number;
  collapsed?: number;
  homeworld: string;
  species: string;
  government: GovernmentType;
  culturalTraits: CulturalTrait[];
  technology: TechnologyLevel;
  population: number;
  territories: string[];                // Body IDs they control
  allies: string[];                     // Civilization IDs
  enemies: string[];
  artifacts: string[];
  monuments: Monument[];
  heroes: Hero[];
  legends: Legend[];
  language: Language;
  status: CivilizationStatus;
}

export enum GovernmentType {
  DEMOCRACY = 'DEMOCRACY',
  AUTOCRACY = 'AUTOCRACY',
  OLIGARCHY = 'OLIGARCHY',
  THEOCRACY = 'THEOCRACY',
  HIVE_MIND = 'HIVE_MIND',
  CORPORATE = 'CORPORATE',
  ANARCHIST = 'ANARCHIST',
  AI_GOVERNED = 'AI_GOVERNED',
  TRIBAL = 'TRIBAL'
}

export enum CulturalTrait {
  WARLIKE = 'WARLIKE',
  PEACEFUL = 'PEACEFUL',
  SCIENTIFIC = 'SCIENTIFIC',
  SPIRITUAL = 'SPIRITUAL',
  MERCANTILE = 'MERCANTILE',
  ISOLATIONIST = 'ISOLATIONIST',
  EXPANSIONIST = 'EXPANSIONIST',
  ARTISTIC = 'ARTISTIC',
  MILITARISTIC = 'MILITARISTIC',
  DIPLOMATIC = 'DIPLOMATIC',
  XENOPHOBIC = 'XENOPHOBIC',
  XENOPHILIC = 'XENOPHILIC',
  MATERIALISTIC = 'MATERIALISTIC',
  EGALITARIAN = 'EGALITARIAN',
  AUTHORITARIAN = 'AUTHORITARIAN'
}

export enum TechnologyLevel {
  STONE_AGE = 1,
  BRONZE_AGE = 2,
  IRON_AGE = 3,
  INDUSTRIAL = 4,
  ATOMIC = 5,
  SPACE_AGE = 6,
  FUSION = 7,
  ANTIMATTER = 8,
  FTL = 9,
  SINGULARITY = 10
}

export enum CivilizationStatus {
  THRIVING = 'THRIVING',
  DECLINING = 'DECLINING',
  COLLAPSED = 'COLLAPSED',
  EXTINCT = 'EXTINCT',
  ASCENDED = 'ASCENDED',
  LOST = 'LOST'
}

export interface Monument {
  id: string;
  name: string;
  type: MonumentType;
  location: { latitude: number; longitude: number; bodyId: string };
  built: number;
  destroyed?: number;
  purpose: string;
  description: string;
  stillStands: boolean;
  discoverable: boolean;
  inscriptions: string[];
  culturalSignificance: number;         // 0-1
}

export enum MonumentType {
  TEMPLE = 'TEMPLE',
  PALACE = 'PALACE',
  LIBRARY = 'LIBRARY',
  WEAPON = 'WEAPON',
  TOMB = 'TOMB',
  STATUE = 'STATUE',
  MEGASTRUCTURE = 'MEGASTRUCTURE',
  OBSERVATORY = 'OBSERVATORY',
  MEMORIAL = 'MEMORIAL'
}

export interface Hero {
  id: string;
  name: string;
  title: string;
  born: number;
  died?: number;
  civilization: string;
  achievements: string[];
  personality: string[];
  deeds: HistoricalDeed[];
  fate: string;
  tomb?: string;                        // Monument ID
  legendary: boolean;
}

export interface HistoricalDeed {
  description: string;
  timestamp: number;
  location: { bodyId: string };
  witnesses: number;
  legendStatus: number;                 // 0-1 (how much it's been mythologized)
}

export interface Legend {
  id: string;
  title: string;
  originDate: number;
  basedOnEvents: string[];              // Historical event IDs
  narrative: string;
  truthValue: number;                   // 0-1 (how much is true)
  knownBy: string[];                    // Civilization IDs
  variants: LegendVariant[];
  prophecy?: string;
}

export interface LegendVariant {
  civilization: string;
  narrative: string;
  embellishments: string[];
}

export interface Artifact {
  id: string;
  name: string;
  description: string;
  type: ArtifactType;
  created: number;
  creator: string;                      // Hero or civilization
  material: string;
  power: ArtifactPower[];
  history: string[];                    // Chain of ownership/events
  currentLocation?: { latitude: number; longitude: number; bodyId: string };
  lost: boolean;
  legendary: boolean;
  curse?: string;
  blessing?: string;
}

export enum ArtifactType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  TOOL = 'TOOL',
  JEWELRY = 'JEWELRY',
  BOOK = 'BOOK',
  RELIC = 'RELIC',
  TECHNOLOGY = 'TECHNOLOGY',
  KEY = 'KEY',
  MAP = 'MAP',
  CRYSTAL = 'CRYSTAL'
}

export interface ArtifactPower {
  name: string;
  description: string;
  mechanical_effect?: string;
  activation: string;
}

export interface Language {
  name: string;
  phonology: string[];                  // Sound patterns
  sampleWords: Map<string, string>;     // English -> Native
  namingPattern: string;                // How they name things
  writingSystem: WritingSystemType;
  literaryWorks: string[];              // Famous texts
}

export enum WritingSystemType {
  LOGOGRAPHIC = 'LOGOGRAPHIC',
  ALPHABETIC = 'ALPHABETIC',
  SYLLABIC = 'SYLLABIC',
  PICTOGRAPHIC = 'PICTOGRAPHIC',
  BINARY = 'BINARY',
  GENETIC = 'GENETIC',
  MATHEMATICAL = 'MATHEMATICAL',
  QUANTUM = 'QUANTUM'
}

/**
 * Procedural lore generator
 */
export class ProceduralLoreSystem {
  private civilizations: Map<string, Civilization> = new Map();
  private events: HistoricalEvent[] = [];
  private artifacts: Map<string, Artifact> = new Map();
  private legends: Map<string, Legend> = new Map();
  private timeline: number = 0;
  private nameGenerator: NameGenerator;

  constructor(seed: number = Date.now()) {
    this.nameGenerator = new NameGenerator(seed);
  }

  /**
   * Generate procedural history for a star system
   */
  generateSystemHistory(systemId: string, ageInYears: number): void {
    this.timeline = 0;
    const yearInSeconds = 365.25 * 24 * 3600;

    // Generate 1-5 ancient civilizations
    const numCivs = Math.floor(Math.random() * 4) + 1;

    for (let i = 0; i < numCivs; i++) {
      const civStartTime = Math.random() * ageInYears * 0.8 * yearInSeconds;
      const civ = this.generateCivilization(systemId, civStartTime);

      // Simulate their history
      this.simulateCivilizationHistory(civ, ageInYears * yearInSeconds);
    }

    // Generate legends from events
    this.generateLegendsFromHistory();

    // Create mysterious artifacts
    this.generateAncientArtifacts(systemId);

    // Create ruins and monuments
    this.placeRuins();
  }

  /**
   * Generate a civilization
   */
  private generateCivilization(systemId: string, foundingTime: number): Civilization {
    const id = `civ_${this.civilizations.size}`;
    const name = this.nameGenerator.generateCivilizationName();

    const civ: Civilization = {
      id,
      name,
      founded: foundingTime,
      homeworld: systemId,
      species: this.nameGenerator.generateSpeciesName(),
      government: this.randomEnum(GovernmentType),
      culturalTraits: this.selectRandomTraits(),
      technology: TechnologyLevel.STONE_AGE,
      population: 1000 + Math.random() * 10000,
      territories: [systemId],
      allies: [],
      enemies: [],
      artifacts: [],
      monuments: [],
      heroes: [],
      legends: [],
      language: this.generateLanguage(),
      status: CivilizationStatus.THRIVING
    };

    this.civilizations.set(id, civ);

    // Founding event
    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp: foundingTime,
      eventType: EventType.FOUNDING,
      location: { latitude: Math.random() * Math.PI - Math.PI/2, longitude: Math.random() * 2 * Math.PI, bodyId: systemId },
      actors: [id],
      outcome: `${name} civilization founded`,
      consequences: ['First settlements established', 'Cultural identity formed'],
      artifacts: [],
      casualties: 0,
      significance: 0.8,
      narrativeDescription: `In the ${this.getEraName(foundingTime)}, the ${civ.species} people gathered in the fertile valleys of their homeworld. Under the guidance of the first elders, they formed the ${name}, a civilization that would endure for millennia.`,
      shortDescription: `${name} founded`,
      rumorText: `My grandfather's grandfather spoke of the founding days, when our ancestors first gathered under the old trees.`,
      evidenceRemaining: true,
      discoverable: true
    });

    return civ;
  }

  /**
   * Simulate civilization's history
   */
  private simulateCivilizationHistory(civ: Civilization, totalTime: number): void {
    let currentTime = civ.founded;
    const yearInSeconds = 365.25 * 24 * 3600;

    while (currentTime < totalTime && civ.status === CivilizationStatus.THRIVING) {
      // Random time jump (1-100 years)
      currentTime += yearInSeconds * (1 + Math.random() * 99);

      if (currentTime >= totalTime) break;

      // Technology advancement
      if (Math.random() < 0.05) {
        this.advanceTechnology(civ, currentTime);
      }

      // Random event
      const eventRoll = Math.random();

      if (eventRoll < 0.05) {
        this.generateWar(civ, currentTime);
      } else if (eventRoll < 0.10) {
        this.generateDiscovery(civ, currentTime);
      } else if (eventRoll < 0.12) {
        this.generateCatastrophe(civ, currentTime);
      } else if (eventRoll < 0.15) {
        this.generateHero(civ, currentTime);
      } else if (eventRoll < 0.17) {
        this.createMonument(civ, currentTime);
      } else if (eventRoll < 0.19) {
        this.createArtifact(civ, currentTime);
      }

      // Population growth
      if (civ.status === CivilizationStatus.THRIVING) {
        civ.population *= 1.01; // 1% growth
      }

      // Random collapse check
      if (Math.random() < 0.001 || civ.population < 100) {
        this.collapseCivilization(civ, currentTime);
      }
    }
  }

  /**
   * Advance civilization technology
   */
  private advanceTechnology(civ: Civilization, timestamp: number): void {
    if (civ.technology < TechnologyLevel.SINGULARITY) {
      civ.technology++;

      this.recordEvent({
        id: `event_${this.events.length}`,
        timestamp,
        eventType: EventType.TECHNOLOGICAL_BREAKTHROUGH,
        location: { latitude: 0, longitude: 0, bodyId: civ.homeworld },
        actors: [civ.id],
        outcome: `${civ.name} achieved ${TechnologyLevel[civ.technology]} technology`,
        consequences: ['New capabilities unlocked', 'Society transformed'],
        artifacts: [],
        casualties: 0,
        significance: 0.7,
        narrativeDescription: `The great minds of ${civ.name} unlocked the secrets of ${this.getTechnologyDescription(civ.technology)}. The age of ${TechnologyLevel[civ.technology].toLowerCase()} had begun.`,
        shortDescription: `${civ.name} technological advancement`,
        rumorText: `They say the scientists have done it again. Changed everything. Nothing will be the same.`,
        evidenceRemaining: true,
        discoverable: true
      });
    }
  }

  /**
   * Generate a war
   */
  private generateWar(civ: Civilization, timestamp: number): void {
    // Find or create enemy
    const enemies = Array.from(this.civilizations.values()).filter(c =>
      c.id !== civ.id && c.status === CivilizationStatus.THRIVING
    );

    let enemy: Civilization;
    if (enemies.length > 0 && Math.random() < 0.5) {
      enemy = enemies[Math.floor(Math.random() * enemies.length)];
    } else {
      // Create new civilization to fight
      enemy = this.generateCivilization(civ.homeworld, timestamp - 1000);
    }

    const casualties = Math.floor((civ.population + enemy.population) * (0.01 + Math.random() * 0.2));
    const civVictory = Math.random() < 0.5;

    civ.enemies.push(enemy.id);
    enemy.enemies.push(civ.id);

    civ.population -= Math.floor(casualties * 0.5);
    enemy.population -= Math.floor(casualties * 0.5);

    const warName = this.nameGenerator.generateWarName();

    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp,
      eventType: EventType.WAR,
      location: { latitude: Math.random() * Math.PI - Math.PI/2, longitude: Math.random() * 2 * Math.PI, bodyId: civ.homeworld },
      actors: [civ.id, enemy.id],
      outcome: civVictory ? `${civ.name} victorious` : `${enemy.name} victorious`,
      consequences: [
        `${casualties.toLocaleString()} casualties`,
        'Territorial changes',
        'Cultural trauma',
        'Weapons developed'
      ],
      artifacts: [],
      casualties,
      significance: 0.9,
      narrativeDescription: `${warName} raged for decades. The ${civ.species} of ${civ.name} clashed with the ${enemy.species} of ${enemy.name} in brutal combat. Cities burned. Entire generations were lost. When the fighting finally ceased, ${casualties.toLocaleString()} had perished, and the world was forever changed.`,
      shortDescription: warName,
      rumorText: `My parents never spoke of the war. The pain was too great. But I've seen the mass graves.`,
      evidenceRemaining: true,
      discoverable: true
    });
  }

  /**
   * Generate a discovery
   */
  private generateDiscovery(civ: Civilization, timestamp: number): void {
    const discoveries = [
      'Ancient alien ruins',
      'Vast underground caverns',
      'Deposits of rare crystals',
      'Precursor technology',
      'Portal to another dimension',
      'Evidence of time travel',
      'Living planet',
      'Frozen ancient beings',
      'Library of lost knowledge'
    ];

    const discovery = discoveries[Math.floor(Math.random() * discoveries.length)];

    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp,
      eventType: EventType.DISCOVERY,
      location: { latitude: Math.random() * Math.PI - Math.PI/2, longitude: Math.random() * 2 * Math.PI, bodyId: civ.homeworld },
      actors: [civ.id],
      outcome: `${discovery} discovered`,
      consequences: ['Scientific revolution', 'New questions raised', 'Expeditions launched'],
      artifacts: [],
      casualties: 0,
      significance: 0.8,
      narrativeDescription: `Explorers from ${civ.name} stumbled upon ${discovery}. The implications were staggering. Everything they thought they knew was wrong. The universe was far stranger than they had imagined.`,
      shortDescription: `Discovery of ${discovery}`,
      rumorText: `I know what they found out there. The government says it's classified, but I know. Changes everything.`,
      evidenceRemaining: true,
      discoverable: true
    });
  }

  /**
   * Generate a catastrophe
   */
  private generateCatastrophe(civ: Civilization, timestamp: number): void {
    const catastrophes = [
      { name: 'Plague', casualties: 0.3, type: EventType.PLAGUE },
      { name: 'Asteroid impact', casualties: 0.4, type: EventType.CATASTROPHE },
      { name: 'Volcanic super-eruption', casualties: 0.2, type: EventType.CATASTROPHE },
      { name: 'AI uprising', casualties: 0.5, type: EventType.CATASTROPHE },
      { name: 'Climate collapse', casualties: 0.25, type: EventType.CATASTROPHE }
    ];

    const catastrophe = catastrophes[Math.floor(Math.random() * catastrophes.length)];
    const casualties = Math.floor(civ.population * catastrophe.casualties);

    civ.population -= casualties;
    civ.status = CivilizationStatus.DECLINING;

    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp,
      eventType: catastrophe.type,
      location: { latitude: 0, longitude: 0, bodyId: civ.homeworld },
      actors: [civ.id],
      outcome: `${catastrophe.name} devastated ${civ.name}`,
      consequences: [
        `${casualties.toLocaleString()} dead`,
        'Infrastructure destroyed',
        'Dark age begins',
        'Population dispersed'
      ],
      artifacts: [],
      casualties,
      significance: 1.0,
      narrativeDescription: `${catastrophe.name} struck ${civ.name} without warning. In a matter of weeks, their civilization teetered on the brink of extinction. ${casualties.toLocaleString()} perished. Survivors fled to the wilderness. The great cities fell silent, slowly reclaimed by nature.`,
      shortDescription: `The Great ${catastrophe.name}`,
      rumorText: `They say you can still hear the screams at night. The dead don't rest easy.`,
      evidenceRemaining: true,
      discoverable: true
    });
  }

  /**
   * Generate a hero
   */
  private generateHero(civ: Civilization, timestamp: number): void {
    const hero: Hero = {
      id: `hero_${civ.heroes.length}`,
      name: this.nameGenerator.generateHeroName(),
      title: this.generateTitle(),
      born: timestamp,
      civilization: civ.id,
      achievements: [],
      personality: this.generatePersonalityTraits(),
      deeds: [],
      fate: '',
      legendary: Math.random() > 0.7
    };

    // Generate heroic deeds
    const numDeeds = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numDeeds; i++) {
      hero.deeds.push({
        description: this.generateHeroicDeed(hero.name),
        timestamp: timestamp + i * 1000000,
        location: { bodyId: civ.homeworld },
        witnesses: Math.floor(Math.random() * 10000),
        legendStatus: Math.random()
      });
    }

    // Death
    hero.died = timestamp + (Math.random() * 2000000000); // 20-60 years
    hero.fate = this.generateHeroicFate();

    civ.heroes.push(hero);

    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp,
      eventType: EventType.DISCOVERY,
      location: { latitude: Math.random() * Math.PI - Math.PI/2, longitude: Math.random() * 2 * Math.PI, bodyId: civ.homeworld },
      actors: [civ.id, hero.id],
      outcome: `${hero.name} ${hero.title} rose to prominence`,
      consequences: ['Inspired a generation', 'Changed the course of history'],
      artifacts: [],
      casualties: 0,
      significance: hero.legendary ? 0.9 : 0.6,
      narrativeDescription: `${hero.name} ${hero.title}, ${this.getHeroDescription(hero)}, became a living legend among the ${civ.species}. Their deeds would be sung of for generations.`,
      shortDescription: `Rise of ${hero.name}`,
      rumorText: `Everyone knows the story of ${hero.name}. True hero. They don't make them like that anymore.`,
      evidenceRemaining: true,
      discoverable: true
    });
  }

  /**
   * Create a monument
   */
  private createMonument(civ: Civilization, timestamp: number): void {
    const monument: Monument = {
      id: `monument_${civ.monuments.length}`,
      name: this.nameGenerator.generateMonumentName(),
      type: this.randomEnum(MonumentType),
      location: { latitude: Math.random() * Math.PI - Math.PI/2, longitude: Math.random() * 2 * Math.PI, bodyId: civ.homeworld },
      built: timestamp,
      purpose: this.getMonumentPurpose(),
      description: '',
      stillStands: Math.random() > 0.3,
      discoverable: true,
      inscriptions: this.generateInscriptions(),
      culturalSignificance: 0.5 + Math.random() * 0.5
    };

    monument.description = `${monument.name}, a ${monument.type.toLowerCase()} of immense scale. ${monument.purpose}. ${monument.stillStands ? 'Its ruins still stand, weathered but defiant.' : 'Lost to time, known only through legends.'}`;

    civ.monuments.push(monument);

    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp,
      eventType: EventType.STATION_CONSTRUCTION,
      location: monument.location,
      actors: [civ.id],
      outcome: `${monument.name} completed`,
      consequences: ['Cultural golden age', 'Population morale increased', 'Became symbol of civilization'],
      artifacts: [],
      casualties: 0,
      significance: monument.culturalSignificance,
      narrativeDescription: `The ${civ.name} poured their wealth and knowledge into ${monument.name}. For generations, workers toiled. When finally completed, it stood as a testament to their greatness, visible from space.`,
      shortDescription: `Construction of ${monument.name}`,
      rumorText: `The old ones built things to last. Not like today. ${monument.name} has stood for thousands of years.`,
      evidenceRemaining: monument.stillStands,
      discoverable: monument.stillStands
    });
  }

  /**
   * Create an artifact
   */
  private createArtifact(civ: Civilization, timestamp: number): void {
    const artifact: Artifact = {
      id: `artifact_${this.artifacts.size}`,
      name: this.nameGenerator.generateArtifactName(),
      description: '',
      type: this.randomEnum(ArtifactType),
      created: timestamp,
      creator: civ.id,
      material: this.getRandomMaterial(),
      power: this.generateArtifactPowers(),
      history: [],
      lost: Math.random() > 0.5,
      legendary: Math.random() > 0.8,
      currentLocation: Math.random() > 0.5 ? {
        latitude: Math.random() * Math.PI - Math.PI/2,
        longitude: Math.random() * 2 * Math.PI,
        bodyId: civ.homeworld
      } : undefined
    };

    artifact.description = `${artifact.name}, a ${artifact.type.toLowerCase()} of ${artifact.material}, created by the master craftsmen of ${civ.name}. ${artifact.legendary ? 'Legends speak of its incredible power.' : 'A remarkable creation of its time.'}`;

    if (Math.random() > 0.7) {
      artifact.curse = this.generateCurse();
    }

    if (Math.random() > 0.8) {
      artifact.blessing = this.generateBlessing();
    }

    this.artifacts.set(artifact.id, artifact);
    civ.artifacts.push(artifact.id);

    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp,
      eventType: EventType.ARTIFACT_CREATION,
      location: artifact.currentLocation || { latitude: 0, longitude: 0, bodyId: civ.homeworld },
      actors: [civ.id],
      outcome: `${artifact.name} created`,
      consequences: [artifact.legendary ? 'Legendary artifact enters the world' : 'Remarkable craftsmanship achieved'],
      artifacts: [artifact.id],
      casualties: 0,
      significance: artifact.legendary ? 0.9 : 0.5,
      narrativeDescription: `The master smiths worked for years, combining ${artifact.material} with techniques lost to time. When ${artifact.name} was finally completed, all who gazed upon it knew they beheld something extraordinary. ${artifact.curse ? 'But dark rumors soon spread...' : ''}`,
      shortDescription: `Forging of ${artifact.name}`,
      rumorText: artifact.curse ? `${artifact.name}? That thing is cursed. Doom follows all who possess it.` : `They say ${artifact.name} still exists, hidden somewhere, waiting to be found.`,
      evidenceRemaining: !artifact.lost,
      discoverable: !artifact.lost
    });
  }

  /**
   * Collapse a civilization
   */
  private collapseCivilization(civ: Civilization, timestamp: number): void {
    civ.collapsed = timestamp;
    civ.status = Math.random() > 0.5 ? CivilizationStatus.EXTINCT : CivilizationStatus.LOST;

    const mysteryRoll = Math.random();
    let outcome: string;

    if (mysteryRoll < 0.2) {
      outcome = 'Mysteriously vanished overnight. No bodies, no sign of struggle. Empty cities.';
    } else if (mysteryRoll < 0.4) {
      outcome = 'Ascended to a higher plane of existence, leaving only enigmatic messages.';
    } else if (mysteryRoll < 0.6) {
      outcome = 'Self-destructed in nuclear war. Radioactive ruins remain.';
    } else if (mysteryRoll < 0.8) {
      outcome = 'Destroyed by external threat. Origin unknown.';
    } else {
      outcome = 'Slow decline into barbarism. Culture forgotten.';
    }

    this.recordEvent({
      id: `event_${this.events.length}`,
      timestamp,
      eventType: civ.status === CivilizationStatus.EXTINCT ? EventType.EXTINCTION : EventType.MYSTERIOUS_DISAPPEARANCE,
      location: { latitude: 0, longitude: 0, bodyId: civ.homeworld },
      actors: [civ.id],
      outcome: `${civ.name} ${civ.status === CivilizationStatus.EXTINCT ? 'went extinct' : 'disappeared'}`,
      consequences: [
        'Ruins left behind',
        'Artifacts scattered',
        'Mysteries remain',
        'Warnings unheeded'
      ],
      artifacts: civ.artifacts,
      casualties: civ.population,
      significance: 1.0,
      narrativeDescription: `The ${civ.name}, who had endured for ${this.formatTimeDuration(timestamp - civ.founded)}, met their end. ${outcome} Their monuments still stand as silent testament to a lost age. Future explorers would find their cities and wonder: what happened here?`,
      shortDescription: `Fall of ${civ.name}`,
      rumorText: `The old ruins? Nobody knows who built them or what happened. Some say they'll return. Some say we should leave well enough alone.`,
      evidenceRemaining: true,
      discoverable: true
    });
  }

  /**
   * Generate legends from historical events
   */
  private generateLegendsFromHistory(): void {
    // Take significant events and mythologize them
    const significantEvents = this.events.filter(e => e.significance > 0.7);

    for (const event of significantEvents) {
      if (Math.random() < 0.4) { // 40% chance to become legend
        const legend = this.mythologizeEvent(event);
        this.legends.set(legend.id, legend);
      }
    }
  }

  /**
   * Turn a historical event into a legend
   */
  private mythologizeEvent(event: HistoricalEvent): Legend {
    const legend: Legend = {
      id: `legend_${this.legends.size}`,
      title: this.generateLegendTitle(event),
      originDate: event.timestamp,
      basedOnEvents: [event.id],
      narrative: '',
      truthValue: 0.3 + Math.random() * 0.4,
      knownBy: event.actors,
      variants: []
    };

    // Generate mythologized narrative
    legend.narrative = this.generateMythologizedNarrative(event, legend.truthValue);

    // Maybe add prophecy
    if (Math.random() > 0.8) {
      legend.prophecy = this.generateProphecy();
    }

    return legend;
  }

  /**
   * Generate ancient artifacts not tied to any civilization
   */
  private generateAncientArtifacts(systemId: string): void {
    const numArtifacts = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numArtifacts; i++) {
      const artifact: Artifact = {
        id: `ancient_artifact_${i}`,
        name: this.nameGenerator.generateAncientArtifactName(),
        description: 'An artifact of unknown origin. Predates all known civilizations.',
        type: this.randomEnum(ArtifactType),
        created: -1000000000, // Ancient
        creator: 'Unknown',
        material: 'Unknown alloy',
        power: this.generateExoticPowers(),
        history: ['Found in deep ruins', 'Origin unknown', 'Purpose unclear'],
        lost: false,
        legendary: true,
        currentLocation: {
          latitude: Math.random() * Math.PI - Math.PI/2,
          longitude: Math.random() * 2 * Math.PI,
          bodyId: systemId
        }
      };

      this.artifacts.set(artifact.id, artifact);
    }
  }

  /**
   * Place ruins from collapsed civilizations
   */
  private placeRuins(): void {
    for (const civ of this.civilizations.values()) {
      if (civ.status === CivilizationStatus.COLLAPSED || civ.status === CivilizationStatus.EXTINCT) {
        // Their monuments become ruins
        for (const monument of civ.monuments) {
          if (Math.random() < 0.6) {
            monument.stillStands = true;
            monument.discoverable = true;
          }
        }
      }
    }
  }

  private recordEvent(event: HistoricalEvent): void {
    this.events.push(event);
  }

  // Helper methods for procedural generation
  private generateLanguage(): Language {
    const consonants = ['k', 't', 'n', 's', 'h', 'm', 'r', 'w', 'l', 'p', 'g', 'd', 'b', 'z', 'th', 'sh', 'ch'];
    const vowels = ['a', 'e', 'i', 'o', 'u', 'ai', 'ei', 'ou'];

    const phonology: string[] = [];
    for (let i = 0; i < 20; i++) {
      const c = consonants[Math.floor(Math.random() * consonants.length)];
      const v = vowels[Math.floor(Math.random() * vowels.length)];
      phonology.push(c + v);
    }

    return {
      name: this.nameGenerator.generateLanguageName(),
      phonology,
      sampleWords: new Map([
        ['star', phonology[0]],
        ['home', phonology[1]],
        ['water', phonology[2]],
        ['fire', phonology[3]]
      ]),
      namingPattern: 'CV-CV-CV',
      writingSystem: this.randomEnum(WritingSystemType),
      literaryWorks: []
    };
  }

  private selectRandomTraits(): CulturalTrait[] {
    const allTraits = Object.values(CulturalTrait);
    const numTraits = Math.floor(Math.random() * 3) + 2;
    const selected: CulturalTrait[] = [];

    for (let i = 0; i < numTraits; i++) {
      const trait = allTraits[Math.floor(Math.random() * allTraits.length)] as CulturalTrait;
      if (!selected.includes(trait)) {
        selected.push(trait);
      }
    }

    return selected;
  }

  private generateTitle(): string {
    const titles = ['the Brave', 'the Wise', 'the Just', 'the Terrible', 'the Great', 'the Builder', 'the Destroyer', 'the Peacemaker', 'the Conqueror', 'the Prophet'];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private generatePersonalityTraits(): string[] {
    const traits = ['Courageous', 'Cunning', 'Compassionate', 'Ruthless', 'Charismatic', 'Brilliant', 'Stubborn', 'Visionary'];
    return [traits[Math.floor(Math.random() * traits.length)], traits[Math.floor(Math.random() * traits.length)]];
  }

  private generateHeroicDeed(name: string): string {
    const deeds = [
      `${name} slew the ancient beast`,
      `${name} united the warring tribes`,
      `${name} discovered the lost city`,
      `${name} saved the capital from invasion`,
      `${name} decoded the ancient texts`,
      `${name} prevented the catastrophe`,
      `${name} led the great exodus`
    ];
    return deeds[Math.floor(Math.random() * deeds.length)];
  }

  private generateHeroicFate(): string {
    const fates = [
      'Died in glorious battle',
      'Ascended to legend',
      'Mysteriously vanished',
      'Betrayed by trusted ally',
      'Sacrificed themselves for others',
      'Lived to old age, revered',
      'Body never found'
    ];
    return fates[Math.floor(Math.random() * fates.length)];
  }

  private getHeroDescription(hero: Hero): string {
    return `${hero.personality.join(' and ').toLowerCase()} ${hero.legendary ? 'legend' : 'leader'}`;
  }

  private getMonumentPurpose(): string {
    const purposes = [
      'Built to honor the gods',
      'Served as seat of government',
      'Repository of knowledge',
      'Commemorates a great victory',
      'Houses the royal tombs',
      'Observatory for cosmic events',
      'Defense against ancient threats'
    ];
    return purposes[Math.floor(Math.random() * purposes.length)];
  }

  private generateInscriptions(): string[] {
    return [
      'Here lies the truth that was forgotten',
      'Let none disturb this sacred place',
      'We who built this shall return',
      'The stars remember what we have done'
    ];
  }

  private getRandomMaterial(): string {
    const materials = ['Damascus steel', 'Mithril', 'Adamantium', 'Crystal', 'Living metal', 'Obsidian', 'Starlight-forged alloy', 'Unknown material'];
    return materials[Math.floor(Math.random() * materials.length)];
  }

  private generateArtifactPowers(): ArtifactPower[] {
    return [{
      name: 'Unknown Power',
      description: 'The artifact emanates strange energy',
      activation: 'Unknown'
    }];
  }

  private generateExoticPowers(): ArtifactPower[] {
    return [
      {
        name: 'Reality Distortion',
        description: 'Bends the fabric of spacetime in inexplicable ways',
        activation: 'Unknown - seems to activate randomly'
      },
      {
        name: 'Consciousness Transfer',
        description: 'May allow mind to exist beyond physical form',
        activation: 'Theoretical'
      }
    ];
  }

  private generateCurse(): string {
    const curses = [
      'All who possess it meet tragic ends',
      'Brings misfortune to the wielder\'s loved ones',
      'Slowly corrupts the mind',
      'Cannot be willingly given away'
    ];
    return curses[Math.floor(Math.random() * curses.length)];
  }

  private generateBlessing(): string {
    const blessings = [
      'Grants extended lifespan',
      'Protects from harm',
      'Brings wisdom and clarity',
      'Attracts good fortune'
    ];
    return blessings[Math.floor(Math.random() * blessings.length)];
  }

  private generateLegendTitle(event: HistoricalEvent): string {
    return `The Legend of ${event.shortDescription}`;
  }

  private generateMythologizedNarrative(event: HistoricalEvent, truthValue: number): string {
    const embellishment = truthValue < 0.5 ? ' (Though the truth has been greatly exaggerated)' : '';
    return `${event.narrativeDescription} Over time, the story grew in the telling.${embellishment}`;
  }

  private generateProphecy(): string {
    const prophecies = [
      'When the three moons align, they shall return',
      'The chosen one will be born when the star dies',
      'In the end times, the ancient weapon will awaken',
      'The cycle will repeat, as it always has'
    ];
    return prophecies[Math.floor(Math.random() * prophecies.length)];
  }

  private getTechnologyDescription(level: TechnologyLevel): string {
    const descriptions: Record<number, string> = {
      [TechnologyLevel.BRONZE_AGE]: 'metalworking',
      [TechnologyLevel.IRON_AGE]: 'iron smelting',
      [TechnologyLevel.INDUSTRIAL]: 'industrialization',
      [TechnologyLevel.ATOMIC]: 'nuclear fission',
      [TechnologyLevel.SPACE_AGE]: 'spaceflight',
      [TechnologyLevel.FUSION]: 'fusion power',
      [TechnologyLevel.ANTIMATTER]: 'antimatter containment',
      [TechnologyLevel.FTL]: 'faster-than-light travel',
      [TechnologyLevel.SINGULARITY]: 'technological singularity'
    };
    return descriptions[level] || 'unknown technology';
  }

  private getEraName(timestamp: number): string {
    return timestamp < 0 ? 'Age of Myths' : 'Ancient Times';
  }

  private formatTimeDuration(seconds: number): string {
    const years = Math.floor(seconds / (365.25 * 24 * 3600));
    return `${years.toLocaleString()} years`;
  }

  private randomEnum<T extends object>(enumObj: T): T[keyof T] {
    const values = Object.values(enumObj) as T[keyof T][];
    return values[Math.floor(Math.random() * values.length)];
  }

  // Public API
  getEvents(): HistoricalEvent[] {
    return this.events;
  }

  getCivilizations(): Civilization[] {
    return Array.from(this.civilizations.values());
  }

  getArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  getLegends(): Legend[] {
    return Array.from(this.legends.values());
  }

  getEventsAt(location: { bodyId: string }): HistoricalEvent[] {
    return this.events.filter(e => e.location.bodyId === location.bodyId);
  }

  getDiscoverableArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values()).filter(a => !a.lost && a.currentLocation);
  }
}

/**
 * Procedural name generator
 */
class NameGenerator {
  private rng: () => number;

  constructor(seed: number) {
    let s = seed;
    this.rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  generateCivilizationName(): string {
    const prefixes = ['Neo', 'Proto', 'First', 'United', 'Free', 'Grand', 'Imperial'];
    const roots = ['Terra', 'Sol', 'Luna', 'Nova', 'Stella', 'Astra', 'Cosm'];
    const suffixes = ['Federation', 'Empire', 'Republic', 'Collective', 'Alliance', 'Hegemony', 'Commonwealth'];

    return `${this.pick(prefixes)}-${this.pick(roots)} ${this.pick(suffixes)}`;
  }

  generateSpeciesName(): string {
    const parts = ['Anthropo', 'Xeno', 'Sapien', 'Homi', 'Pan', 'Syn'];
    return this.pick(parts) + this.pick(parts).toLowerCase();
  }

  generateHeroName(): string {
    const names = ['Zar', 'Kel', 'Dra', 'Mor', 'Val', 'Kyr', 'Tha', 'Len'];
    const suffixes = ['ion', 'an', 'eth', 'or', 'us', 'is'];
    return this.pick(names) + this.pick(suffixes);
  }

  generateMonumentName(): string {
    const adjectives = ['Great', 'Eternal', 'Sacred', 'Golden', 'Crystal', 'Shining'];
    const nouns = ['Spire', 'Temple', 'Library', 'Citadel', 'Monument', 'Palace'];
    return `The ${this.pick(adjectives)} ${this.pick(nouns)}`;
  }

  generateArtifactName(): string {
    const materials = ['Crystal', 'Star', 'Shadow', 'Light', 'Time', 'Void'];
    const items = ['Blade', 'Crown', 'Staff', 'Orb', 'Key', 'Codex'];
    return `${this.pick(materials)} ${this.pick(items)}`;
  }

  generateAncientArtifactName(): string {
    const prefixes = ['The First', 'The Last', 'The Eternal', 'The Forbidden'];
    const items = ['Mechanism', 'Cipher', 'Construct', 'Vessel', 'Engine', 'Archive'];
    return `${this.pick(prefixes)} ${this.pick(items)}`;
  }

  generateLanguageName(): string {
    const syllables = ['Ka', 'Tha', 'Mol', 'Var', 'Zen', 'Pla'];
    return this.pick(syllables) + this.pick(syllables).toLowerCase();
  }

  generateWarName(): string {
    const events = ['War of the', 'Conflict of', 'Battle for', 'Campaign of'];
    const subjects = ['Two Suns', 'Broken Alliance', 'Last Stand', 'Crimson Sky', 'Fallen Cities'];
    return `The ${this.pick(events)} ${this.pick(subjects)}`;
  }

  private pick<T>(array: T[]): T {
    return array[Math.floor(this.rng() * array.length)];
  }
}
