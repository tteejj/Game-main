/**
 * BiomeSystem.ts
 * Detailed biome generation with ecology, weather, and environmental storytelling
 */

import { Planet } from './CelestialBody';
import { MaterialDatabase } from './MaterialSystem';

export interface BiomeProperties {
  id: string;
  name: string;
  description: string;

  // Climate
  temperatureRange: { min: number; max: number }; // K
  precipitation: number;                            // mm/year
  humidity: number;                                // 0-1
  windSpeed: { min: number; max: number };         // m/s

  // Terrain
  elevation: { min: number; max: number };         // meters
  roughness: number;                               // 0-1
  soilType: string;
  dominantMinerals: string[];

  // Ecology
  flora: BiomeFlora[];
  fauna: BiomeFauna[];
  microbialLife: boolean;
  biomass: number;                                 // kg/m²

  // Special features
  features: BiomeFeature[];
  hazards: BiomeHazard[];

  // Aesthetics
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  skyColor: string;
  visibility: number;                              // meters

  // Lore
  nativeNames: string[];
  historicalEvents: string[];
}

export interface BiomeFlora {
  name: string;
  scientificName: string;
  description: string;
  abundance: number;                               // 0-1
  height: { min: number; max: number };            // meters
  lifeCycle: number;                               // years
  edible: boolean;
  medicinal: boolean;
  toxic: boolean;
  bioluminescent: boolean;
  color: string;
  propagation: 'SEEDS' | 'SPORES' | 'RUNNERS' | 'BUDDING';
  symbiosis?: string;                              // What it lives with
}

export interface BiomeFauna {
  name: string;
  scientificName: string;
  description: string;
  abundance: number;                               // 0-1
  size: { length: number; mass: number };
  diet: 'HERBIVORE' | 'CARNIVORE' | 'OMNIVORE' | 'LITHOTROPH' | 'PHOTOSYNTHETIC';
  behavior: 'SOLITARY' | 'PACK' | 'HERD' | 'COLONY';
  aggression: number;                              // 0-1
  intelligence: number;                            // 0-1
  domesticable: boolean;
  bioluminescent: boolean;
  nightVision: boolean;
  specialAdaptation: string;
}

export interface BiomeFeature {
  name: string;
  description: string;
  rarity: number;                                  // 0-1
  locations: Array<{ latitude: number; longitude: number }>;
  discovered: boolean;
  lore?: string;
}

export interface BiomeHazard {
  name: string;
  type: 'ENVIRONMENTAL' | 'BIOLOGICAL' | 'GEOLOGICAL' | 'CHEMICAL';
  severity: number;                                // 0-1
  frequency: number;                               // times per year
  description: string;
  countermeasures: string[];
}

/**
 * Biome generator and manager
 */
export class BiomeSystem {
  private biomes: Map<string, BiomeProperties> = new Map();
  private planet: Planet;

  constructor(planet: Planet) {
    this.planet = planet;
    this.generateBiomes();
  }

  /**
   * Generate biomes based on planet properties
   */
  private generateBiomes(): void {
    const temp = this.planet.surfaceTemperature;
    const hasAtmosphere = this.planet.physical.atmospherePressure !== undefined;
    const hasWater = this.hasLiquidWater();

    // Determine possible biomes
    if (temp < 150) {
      // Frozen worlds
      this.addFrozenBiomes();
    } else if (temp < 273) {
      // Cold worlds
      this.addColdBiomes();
    } else if (temp < 320) {
      // Temperate worlds
      if (hasWater) {
        this.addTemperateBiomes();
      } else {
        this.addAridBiomes();
      }
    } else if (temp < 400) {
      // Hot worlds
      this.addHotBiomes();
    } else {
      // Extreme hot worlds
      this.addExtremeBiomes();
    }

    // Special biomes
    if (hasAtmosphere && Math.random() > 0.7) {
      this.addCloudCities();
    }

    if (this.planet.physical.radius > 1e7) {
      this.addHighGravityBiomes();
    }
  }

  private addFrozenBiomes(): void {
    // Cryogenic plains
    this.biomes.set('cryogenic_plain', {
      id: 'cryogenic_plain',
      name: 'Cryogenic Plains',
      description: 'Endless frozen wastes of nitrogen and methane ice. The air itself has frozen solid and fallen like snow.',
      temperatureRange: { min: 40, max: 100 },
      precipitation: 0,
      humidity: 0,
      windSpeed: { min: 0, max: 5 },
      elevation: { min: -100, max: 100 },
      roughness: 0.1,
      soilType: 'frozen_nitrogen',
      dominantMinerals: ['nitrogen_ice', 'methane_ice', 'ammonia_ice'],
      flora: [{
        name: 'Cryo-crystals',
        scientificName: 'Crystallus frigidus',
        description: 'Not truly alive, but grows like a living thing. Silicon-based quasi-life forms geometric patterns in the ice.',
        abundance: 0.3,
        height: { min: 0.01, max: 0.5 },
        lifeCycle: 1000,
        edible: false,
        medicinal: false,
        toxic: false,
        bioluminescent: true,
        color: '#80D0FF',
        propagation: 'BUDDING'
      }],
      fauna: [{
        name: 'Methane Swimmer',
        scientificName: 'Natator methanicus',
        description: 'Swims through liquid methane seas beneath the ice. Bioluminescent trails mark their passage.',
        abundance: 0.1,
        size: { length: 2, mass: 50 },
        diet: 'LITHOTROPH',
        behavior: 'SOLITARY',
        aggression: 0.1,
        intelligence: 0.3,
        domesticable: false,
        bioluminescent: true,
        nightVision: true,
        specialAdaptation: 'Survives in liquid methane'
      }],
      microbialLife: true,
      biomass: 0.01,
      features: [{
        name: 'Nitrogen Geysers',
        description: 'Frozen nitrogen erupts from below, creating towering ice spires that last for centuries.',
        rarity: 0.4,
        locations: [],
        discovered: false,
        lore: 'Ancient probe detected these geysers. The first explorers thought they were alien structures.'
      }],
      hazards: [{
        name: 'Atmospheric Collapse',
        type: 'ENVIRONMENTAL',
        severity: 0.9,
        frequency: 0.1,
        description: 'When temperature drops, atmosphere freezes and falls as deadly nitrogen snow.',
        countermeasures: ['Heated shelters', 'Thermal monitoring', 'Emergency evacuation']
      }],
      colors: {
        primary: '#E0F0FF',
        secondary: '#C0D0E8',
        accent: '#80D0FF'
      },
      skyColor: '#000000',
      visibility: 50000,
      nativeNames: ['The Eternal Ice', 'Frozen Silence', 'Crystal Desert'],
      historicalEvents: ['Outpost Korolev established 2156', 'Great Sublimation of 2203']
    });

    // Ammonia ice fields
    this.biomes.set('ammonia_ice', {
      id: 'ammonia_ice',
      name: 'Ammonia Ice Fields',
      description: 'Vast fields of frozen ammonia stretch to the horizon. Toxic yet strangely beautiful.',
      temperatureRange: { min: 100, max: 195 },
      precipitation: 5,
      humidity: 0.1,
      windSpeed: { min: 5, max: 50 },
      elevation: { min: 0, max: 500 },
      roughness: 0.3,
      soilType: 'ammonia_ice',
      dominantMinerals: ['ammonia', 'water_ice', 'methane'],
      flora: [{
        name: 'Frost Lichen',
        scientificName: 'Lichen ammonialis',
        description: 'Hardy organisms that extract energy from chemical reactions in the ice.',
        abundance: 0.5,
        height: { min: 0.001, max: 0.01 },
        lifeCycle: 500,
        edible: false,
        medicinal: false,
        toxic: true,
        bioluminescent: false,
        color: '#808080',
        propagation: 'SPORES',
        symbiosis: 'Nitrogen-fixing bacteria'
      }],
      fauna: [],
      microbialLife: true,
      biomass: 0.05,
      features: [{
        name: 'Pressure Ridges',
        description: 'Tectonic forces push ice into jagged mountain ranges that glow blue in the starlight.',
        rarity: 0.3,
        locations: [],
        discovered: false
      }],
      hazards: [{
        name: 'Ammonia Storms',
        type: 'CHEMICAL',
        severity: 0.8,
        frequency: 20,
        description: 'Sublimating ammonia creates toxic storms. Extremely corrosive to equipment.',
        countermeasures: ['Anti-corrosion coatings', 'Sealed habitats', 'Storm shelters']
      }],
      colors: {
        primary: '#D0D0D8',
        secondary: '#A0A0A8',
        accent: '#C0C0FF'
      },
      skyColor: '#1A1A2E',
      visibility: 10000,
      nativeNames: ['The Poison Fields', 'Ammonia Wastes'],
      historicalEvents: []
    });
  }

  private addTemperateBiomes(): void {
    // Alien rainforest
    this.biomes.set('alien_rainforest', {
      id: 'alien_rainforest',
      name: 'Xenoflora Rainforest',
      description: 'Dense jungle of alien vegetation. Everything glows faintly at night. The air thrums with unseen life.',
      temperatureRange: { min: 285, max: 310 },
      precipitation: 3000,
      humidity: 0.9,
      windSpeed: { min: 0, max: 15 },
      elevation: { min: 0, max: 800 },
      roughness: 0.7,
      soilType: 'rich_organic',
      dominantMinerals: ['carbon', 'nitrogen', 'phosphorus'],
      flora: [
        {
          name: 'Titan Tree',
          scientificName: 'Arbor giganticus',
          description: 'Towers 200 meters high. Bark contains bioluminescent bacteria. Sap is mildly hallucinogenic.',
          abundance: 0.6,
          height: { min: 150, max: 250 },
          lifeCycle: 2000,
          edible: false,
          medicinal: true,
          toxic: false,
          bioluminescent: true,
          color: '#2E7D32',
          propagation: 'SEEDS',
          symbiosis: 'Nitrogen-fixing nodules'
        },
        {
          name: 'Singing Vine',
          scientificName: 'Vitis resonans',
          description: 'Hollow vines create haunting music as wind passes through. Ancient cultures thought them sacred.',
          abundance: 0.8,
          height: { min: 10, max: 100 },
          lifeCycle: 50,
          edible: true,
          medicinal: false,
          toxic: false,
          bioluminescent: false,
          color: '#1B5E20',
          propagation: 'RUNNERS'
        },
        {
          name: 'Crystal Flower',
          scientificName: 'Flos crystallinus',
          description: 'Petals contain silicon crystals that focus sunlight for photosynthesis. Incredibly beautiful.',
          abundance: 0.4,
          height: { min: 0.5, max: 2 },
          lifeCycle: 10,
          edible: false,
          medicinal: true,
          toxic: false,
          bioluminescent: true,
          color: '#FF69B4'propagation: 'SEEDS'
        }
      ],
      fauna: [
        {
          name: 'Canopy Glider',
          scientificName: 'Volans arboreus',
          description: 'Six-winged mammalian analog. Hunts at dusk. Calls sound like human laughter.',
          abundance: 0.3,
          size: { length: 1.5, mass: 15 },
          diet: 'CARNIVORE',
          behavior: 'PACK',
          aggression: 0.6,
          intelligence: 0.7,
          domesticable: true,
          bioluminescent: true,
          nightVision: true,
          specialAdaptation: 'Echolocation in dense canopy'
        },
        {
          name: 'Root Burrower',
          scientificName: 'Fossor radicus',
          description: 'Lives in symbiosis with Titan Trees. Processes nutrients for the tree, receives shelter.',
          abundance: 0.5,
          size: { length: 0.3, mass: 2 },
          diet: 'HERBIVORE',
          behavior: 'COLONY',
          aggression: 0.1,
          intelligence: 0.4,
          domesticable: false,
          bioluminescent: true,
          nightVision: true,
          specialAdaptation: 'Perfect symbiosis with flora'
        }
      ],
      microbialLife: true,
      biomass: 45,
      features: [
        {
          name: 'Ancient Grove',
          description: 'Titan Trees over 10,000 years old. Their roots form underground cathedrals.',
          rarity: 0.9,
          locations: [],
          discovered: false,
          lore: 'Legend says these trees remember the dawn of life on this world.'
        },
        {
          name: 'Bioluminescent Waterfalls',
          description: 'Water glows blue from trillions of microscopic organisms. Considered holy by locals.',
          rarity: 0.6,
          locations: [],
          discovered: false
        }
      ],
      hazards: [
        {
          name: 'Spore Clouds',
          type: 'BIOLOGICAL',
          severity: 0.5,
          frequency: 100,
          description: 'Various fungi release spores. Most harmless, some hallucinogenic, few deadly.',
          countermeasures: ['Respirators', 'Antifungal treatments', 'Spore identification']
        },
        {
          name: 'Predatory Plants',
          type: 'BIOLOGICAL',
          severity: 0.7,
          frequency: 50,
          description: 'Some plants actively hunt. Vines that move, flowers that bite.',
          countermeasures: ['Botanical database', 'Cutting tools', 'Fire']
        }
      ],
      colors: {
        primary: '#1B5E20',
        secondary: '#2E7D32',
        accent: '#80D0FF'
      },
      skyColor: '#87CEEB',
      visibility: 200,
      nativeNames: ['The Living Cathedral', 'Eternal Garden', 'Song of Trees'],
      historicalEvents: [
        'First Landing: 2134 - Crew reported "trees that sing and glow"',
        'Great Bloom of 2189 - All Crystal Flowers bloomed simultaneously',
        'Contact with Canopy Tribes - 2201'
      ]
    });

    // Grasslands
    this.biomes.set('endless_prairie', {
      id: 'endless_prairie',
      name: 'Endless Prairie',
      description: 'Grass as far as the eye can see. Three-meter tall purple stalks wave in constant wind.',
      temperatureRange: { min: 270, max: 305 },
      precipitation: 600,
      humidity: 0.5,
      windSpeed: { min: 10, max: 40 },
      elevation: { min: 0, max: 300 },
      roughness: 0.1,
      soilType: 'fertile_loam',
      dominantMinerals: ['silicon', 'carbon', 'nitrogen'],
      flora: [
        {
          name: 'Titan Grass',
          scientificName: 'Gramen procerus',
          description: 'Purple photosynthetic grass. Grows up to 3 meters tall. Stems strong as wood.',
          abundance: 0.95,
          height: { min: 2, max: 3.5 },
          lifeCycle: 5,
          edible: true,
          medicinal: false,
          toxic: false,
          bioluminescent: false,
          color: '#9C27B0',
          propagation: 'SEEDS'
        }
      ],
      fauna: [
        {
          name: 'Thunder Beast',
          scientificName: 'Bos tonitrus',
          description: 'Massive herbivore. Herds of thousands shake the ground. Each weighs 2 tons.',
          abundance: 0.7,
          size: { length: 4, mass: 2000 },
          diet: 'HERBIVORE',
          behavior: 'HERD',
          aggression: 0.3,
          intelligence: 0.4,
          domesticable: true,
          bioluminescent: false,
          nightVision: false,
          specialAdaptation: 'Ultrasonic communication across vast distances'
        },
        {
          name: 'Grass Stalker',
          scientificName: 'Predator gramineus',
          description: 'Apex predator. Camouflaged in grass. Hunts Thunder Beasts through coordinated pack tactics.',
          abundance: 0.05,
          size: { length: 2.5, mass: 150 },
          diet: 'CARNIVORE',
          behavior: 'PACK',
          aggression: 0.9,
          intelligence: 0.8,
          domesticable: false,
          bioluminescent: false,
          nightVision: true,
          specialAdaptation: 'Perfect camouflage, enhanced hearing'
        }
      ],
      microbialLife: true,
      biomass: 15,
      features: [
        {
          name: 'Migration Routes',
          description: 'Ancient paths worn into stone by countless Thunder Beast migrations.',
          rarity: 0.3,
          locations: [],
          discovered: true,
          lore: 'Some routes are millions of years old. They remember when this world had oceans.'
        }
      ],
      hazards: [
        {
          name: 'Stampedes',
          type: 'ENVIRONMENTAL',
          severity: 0.8,
          frequency: 30,
          description: 'Thunder Beast stampedes can flatten anything in their path.',
          countermeasures: ['Early warning systems', 'Underground bunkers', 'Sonic deterrents']
        },
        {
          name: 'Grass Fires',
          type: 'ENVIRONMENTAL',
          severity: 0.7,
          frequency: 10,
          description: 'Lightning ignites grass. Fires race across continents at 60 km/h.',
          countermeasures: ['Firebreaks', 'Controlled burns', 'Fire shelters']
        }
      ],
      colors: {
        primary: '#9C27B0',
        secondary: '#7B1FA2',
        accent: '#CE93D8'
      },
      skyColor: '#FFD700',
      visibility: 50000,
      nativeNames: ['The Purple Ocean', 'Thunder Plains', 'Endless Wind'],
      historicalEvents: [
        'The Great Fire of 2178 - Burned for three months',
        'First Thunder Beast domestication - 2195'
      ]
    });
  }

  private addHotBiomes(): void {
    // Lava fields
    this.biomes.set('lava_fields', {
      id: 'lava_fields',
      name: 'Volcanic Hellscape',
      description: 'Rivers of molten rock flow between obsidian mountains. The air shimmers with heat. Life, improbably, persists.',
      temperatureRange: { min: 370, max: 650 },
      precipitation: 0,
      humidity: 0,
      windSpeed: { min: 0, max: 80 },
      elevation: { min: -500, max: 3000 },
      roughness: 0.9,
      soilType: 'volcanic_ash',
      dominantMinerals: ['basalt', 'obsidian', 'sulfur'],
      flora: [
        {
          name: 'Ember Moss',
          scientificName: 'Bryophyta igneus',
          description: 'Grows on cooling lava. Harvests geothermal energy directly. Glows red-hot.',
          abundance: 0.4,
          height: { min: 0.001, max: 0.05 },
          lifeCycle: 100,
          edible: false,
          medicinal: false,
          toxic: false,
          bioluminescent: true,
          color: '#FF4500',
          propagation: 'SPORES'
        }
      ],
      fauna: [
        {
          name: 'Magma Worm',
          scientificName: 'Vermis lavae',
          description: 'Swims through molten rock. Silicon-based biology. Body temperature 800K.',
          abundance: 0.2,
          size: { length: 5, mass: 500 },
          diet: 'LITHOTROPH',
          behavior: 'SOLITARY',
          aggression: 0.8,
          intelligence: 0.2,
          domesticable: false,
          bioluminescent: true,
          nightVision: true,
          specialAdaptation: 'Survives in molten rock'
        }
      ],
      microbialLife: true,
      biomass: 0.5,
      features: [
        {
          name: 'Obsidian Spires',
          description: 'Natural glass towers hundreds of meters tall. Ring like bells in the wind.',
          rarity: 0.5,
          locations: [],
          discovered: false,
          lore: 'Ancient legend speaks of singing glass mountains where the world was born.'
        }
      ],
      hazards: [
        {
          name: 'Lava Eruptions',
          type: 'GEOLOGICAL',
          severity: 1.0,
          frequency: 365,
          description: 'Continuous volcanic activity. Lava fountains, pyroclastic flows, toxic gases.',
          countermeasures: ['Heat shields', 'Real-time geological monitoring', 'Escape pods']
        }
      ],
      colors: {
        primary: '#8B0000',
        secondary: '#FF4500',
        accent: '#FFD700'
      },
      skyColor: '#8B0000',
      visibility: 1000,
      nativeNames: ['The Forge', 'Hell\'s Garden', 'Eternal Fire'],
      historicalEvents: [
        'Outpost Prometheus destroyed 2167 - Lava lake drainage',
        'First Magma Worm specimen captured 2199'
      ]
    });
  }

  private addCloudCities(): void {
    this.biomes.set('floating_archipelago', {
      id: 'floating_archipelago',
      name: 'Floating Islands',
      description: 'Massive chunks of rock float in the upper atmosphere, held aloft by magnetic fields and lighter-than-air flora.',
      temperatureRange: { min: 260, max: 290 },
      precipitation: 1500,
      humidity: 0.8,
      windSpeed: { min: 30, max: 100 },
      elevation: { min: 10000, max: 15000 },
      roughness: 0.6,
      soilType: 'magnetic_mineral',
      dominantMinerals: ['magnetite', 'floating_stone', 'aerogel_deposits'],
      flora: [
        {
          name: 'Sky Bladder Tree',
          scientificName: 'Arbor levitas',
          description: 'Produces hydrogen bladders that provide lift. Entire ecosystems float on these.',
          abundance: 0.7,
          height: { min: 20, max: 100 },
          lifeCycle: 500,
          edible: true,
          medicinal: false,
          toxic: false,
          bioluminescent: false,
          color: '#98D8C8',
          propagation: 'SEEDS'
        }
      ],
      fauna: [
        {
          name: 'Cloud Whale',
          scientificName: 'Cetus nubium',
          description: 'Massive flying creature. Filters atmospheric plankton. Songs echo for hundreds of kilometers.',
          abundance: 0.1,
          size: { length: 50, mass: 50000 },
          diet: 'HERBIVORE',
          behavior: 'SOLITARY',
          aggression: 0.1,
          intelligence: 0.9,
          domesticable: false,
          bioluminescent: true,
          nightVision: false,
          specialAdaptation: 'Magnetic field manipulation for flight'
        }
      ],
      microbialLife: true,
      biomass: 8,
      features: [
        {
          name: 'The Grand Convergence',
          description: 'Once every 20 years, all floating islands align. Ancient festival site.',
          rarity: 0.95,
          locations: [],
          discovered: true,
          lore: 'Pre-human civilization built temples here. Abandoned for unknown reasons.'
        }
      ],
      hazards: [
        {
          name: 'Island Collisions',
          type: 'ENVIRONMENTAL',
          severity: 0.9,
          frequency: 5,
          description: 'Floating islands sometimes collide. Devastating for anyone caught between.',
          countermeasures: ['Trajectory prediction', 'Magnetic deflectors', 'Emergency evacuation']
        }
      ],
      colors: {
        primary: '#87CEEB',
        secondary: '#98D8C8',
        accent: '#FFD700'
      },
      skyColor: '#E0F6FF',
      visibility: 100000,
      nativeNames: ['The Sky Islands', 'Realm Above', 'Magnetic Archipelago'],
      historicalEvents: [
        'Ancient ruins discovered 2145',
        'Cloud Whale migration pattern decoded 2188'
      ]
    });
  }

  private addAridBiomes(): void {
    // Desert with crystal formations
    this.biomes.set('crystal_desert', {
      id: 'crystal_desert',
      name: 'Crystal Desert',
      description: 'Silicon-based life forms massive crystalline structures. They grow toward the sun like plants, but they\'re mineral.',
      temperatureRange: { min: 280, max: 340 },
      precipitation: 50,
      humidity: 0.1,
      windSpeed: { min: 5, max: 60 },
      elevation: { min: 0, max: 1000 },
      roughness: 0.5,
      soilType: 'silicate_sand',
      dominantMinerals: ['quartz', 'silicon', 'rare_earth_elements'],
      flora: [
        {
          name: 'Living Crystal',
          scientificName: 'Crystallus vivens',
          description: 'Not quite alive, not quite mineral. Grows, reproduces, responds to stimuli. Defies classification.',
          abundance: 0.6,
          height: { min: 0.1, max: 50 },
          lifeCycle: 10000,
          edible: false,
          medicinal: false,
          toxic: false,
          bioluminescent: true,
          color: '#FF6EC7',
          propagation: 'BUDDING',
          symbiosis: 'Silicon bacteria'
        }
      ],
      fauna: [
        {
          name: 'Sand Sailor',
          scientificName: 'Velifer arenae',
          description: 'Uses membrane sails to catch desert winds. Glides across dunes at 40 km/h.',
          abundance: 0.3,
          size: { length: 3, mass: 80 },
          diet: 'LITHOTROPH',
          behavior: 'SOLITARY',
          aggression: 0.2,
          intelligence: 0.5,
          domesticable: true,
          bioluminescent: false,
          nightVision: true,
          specialAdaptation: 'Wind-powered locomotion'
        }
      ],
      microbialLife: true,
      biomass: 2,
      features: [
        {
          name: 'Singing Crystals',
          description: 'Wind resonates through crystal forests, creating otherworldly music.',
          rarity: 0.7,
          locations: [],
          discovered: true,
          lore: 'Some explorers report the crystals sing songs they\'ve never heard, but somehow remember.'
        }
      ],
      hazards: [
        {
          name: 'Silicon Storms',
          type: 'ENVIRONMENTAL',
          severity: 0.8,
          frequency: 50,
          description: 'Sandstorms of microscopic glass shards. Can strip flesh from bone.',
          countermeasures: ['Hardened shelters', 'Storm prediction', 'Full body armor']
        }
      ],
      colors: {
        primary: '#F4A460',
        secondary: '#DEB887',
        accent: '#FF6EC7'
      },
      skyColor: '#FFE4B5',
      visibility: 20000,
      nativeNames: ['The Singing Sands', 'Crystal Wastes', 'Garden of Glass'],
      historicalEvents: [
        'Largest crystal formation discovered 2177 - 200m tall',
        'Silicon-based life confirmed 2181 - paradigm shift in biology'
      ]
    });
  }

  private addExtremeBiomes(): void {
    // Implement extreme temperature biomes
  }

  private addHighGravityBiomes(): void {
    // Implement high-gravity specific biomes
  }

  private hasLiquidWater(): boolean {
    const temp = this.planet.surfaceTemperature;
    const pressure = this.planet.physical.atmospherePressure || 0;
    return temp > 273 && temp < 373 && pressure > 611;
  }

  /**
   * Get biome at specific location
   */
  getBiomeAt(latitude: number, longitude: number, elevation: number): BiomeProperties | null {
    // Simplified - in reality would use noise functions and climate zones
    const biomeArray = Array.from(this.biomes.values());
    if (biomeArray.length === 0) return null;

    // Use lat/lon to select biome
    const index = Math.floor((latitude + Math.PI/2) / Math.PI * biomeArray.length);
    return biomeArray[Math.min(index, biomeArray.length - 1)];
  }

  /**
   * Get all biomes
   */
  getAllBiomes(): BiomeProperties[] {
    return Array.from(this.biomes.values());
  }

  /**
   * Discover a biome feature
   */
  discoverFeature(biomeId: string, featureName: string): boolean {
    const biome = this.biomes.get(biomeId);
    if (!biome) return false;

    const feature = biome.features.find(f => f.name === featureName);
    if (!feature) return false;

    feature.discovered = true;
    return true;
  }
}
