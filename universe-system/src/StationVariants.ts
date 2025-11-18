/**
 * StationVariants.ts
 * Detailed specifications for unique space station variants
 *
 * Expands on base StationGenerator with specific named variants,
 * each with unique characteristics, histories, and game significance
 */

import { StationType, StationFaction } from './StationGenerator';

export interface StationVariant {
  variantName: string;
  baseType: StationType;
  description: string;
  uniqueFeatures: string[];
  visualDesign: {
    architecture: string;
    size: string;
    notableFeatures: string[];
    colors: { primary: string; secondary: string; accent: string };
  };
  history: string;
  economicModifiers: {
    priceMultiplier: number;
    specialGoods?: string[];
    restrictions?: string[];
  };
  defenseModifiers: {
    rating: number;
    specialDefenses?: string[];
  };
  uniqueServices?: string[];
  reputation: {
    requirement?: string;
    bonuses?: string[];
  };
  lore: {
    founder?: string;
    significantEvents?: string[];
    currentStatus: string;
    notableResident?: string;
  };
}

/**
 * Station variant specifications
 */
export const STATION_VARIANTS: Record<string, StationVariant> = {

  // ==================== TRADING HUBS ====================

  THE_EXCHANGE: {
    variantName: 'The Exchange',
    baseType: StationType.TRADING_HUB,
    description: 'The largest and most prestigious trading hub in civilized space',
    uniqueFeatures: [
      'Neutral ground - all factions welcome',
      'Real-time commodity exchange',
      'Luxury shopping district',
      'Diplomatic quarter',
      'Maximum security trading floors'
    ],
    visualDesign: {
      architecture: 'Massive rotating torus with 8 radial spokes',
      size: '2.5km diameter, accommodates 150,000 permanent residents',
      notableFeatures: [
        'Transparent diamond viewing galleries',
        'Zero-G gardens in central hub',
        'Gilded trading floor visible from space',
        'Dedicated VIP docking ring'
      ],
      colors: {
        primary: '#d4af37', // Gold
        secondary: '#e5e4e2', // Platinum
        accent: '#4169e1'    // Royal blue
      }
    },
    history: 'Founded 2185 as neutral trading post after the Belt Wars. Became the de facto financial capital of human space.',
    economicModifiers: {
      priceMultiplier: 1.0, // Fair prices, high volume
      specialGoods: [
        'Rare artifacts',
        'Luxury goods',
        'Cutting-edge technology',
        'Exotic materials',
        'Fine wines and spirits'
      ]
    },
    defenseModifiers: {
      rating: 9,
      specialDefenses: [
        'Treaty-protected neutral status',
        'Private security fleet (200+ ships)',
        'Point defense grid',
        'Multiple faction patrols'
      ]
    },
    uniqueServices: [
      'Broker services for large contracts',
      'Secure vault storage',
      'Loan and investment banking',
      'Auction house',
      'Diplomatic meeting rooms'
    ],
    reputation: {
      requirement: 'No bounties, neutral reputation',
      bonuses: [
        'Access to exclusive contracts',
        'Reduced trading fees',
        'VIP lounge access'
      ]
    },
    lore: {
      founder: 'Consortium of mega-corporations',
      significantEvents: [
        '2201: Survived pirate siege',
        '2245: Hosted the Accord Conference',
        '2278: Bombing attempt foiled'
      ],
      currentStatus: 'Thriving. Handles 40% of all interstellar trade',
      notableResident: 'Director Evelyn Cross, de facto ruler of The Exchange'
    }
  },

  FREEPORT_ZETA: {
    variantName: 'Freeport Zeta',
    baseType: StationType.TRADING_HUB,
    description: 'Notorious "no questions asked" trading station on the frontier',
    uniqueFeatures: [
      'No customs enforcement',
      'Black market hub',
      'Minimal regulations',
      'Pirate-friendly',
      'Information broker network'
    ],
    visualDesign: {
      architecture: 'Chaotic assemblage of modules and ships welded together',
      size: 'Ever-expanding, current est. 800m across',
      notableFeatures: [
        'Hidden docking bays',
        'Smuggler compartment inspection services',
        'Shielded cargo zones',
        'Multiple emergency exits'
      ],
      colors: {
        primary: '#2f4f4f',
        secondary: '#8b4513',
        accent: '#ff4500'
      }
    },
    history: 'Started as abandoned mining platform. Squatters turned it into independent haven. Tolerated by authorities as "useful evil".',
    economicModifiers: {
      priceMultiplier: 1.3, // High prices for shady goods
      specialGoods: [
        'Contraband',
        'Stolen goods',
        'Forged documents',
        'Untraceable weapons',
        'Exotic narcotics'
      ],
      restrictions: ['Law enforcement unwelcome']
    },
    defenseModifiers: {
      rating: 7,
      specialDefenses: [
        'Defensive minefield',
        'Armed inhabitants',
        'Secret pirate pacts',
        'Automated turrets'
      ]
    },
    uniqueServices: [
      'Document forgery',
      'Bounty removal (illegal)',
      'Ship modification (off-the-books)',
      'Information trading',
      'Witness protection (criminal)'
    ],
    reputation: {
      requirement: 'Must be wanted or independent',
      bonuses: [
        'Access to black market',
        'No questions asked',
        'Criminal contact network'
      ]
    },
    lore: {
      founder: 'Unknown - probably multiple squatter groups',
      significantEvents: [
        '2235: Repelled United Earth raid',
        '2260: "Incident" - details classified',
        '2282: New management after power struggle'
      ],
      currentStatus: 'Thriving in legal gray zone',
      notableResident: 'The Broker - mysterious information dealer'
    }
  },

  // ==================== MILITARY BASES ====================

  SENTINEL_PRIME: {
    variantName: 'Sentinel Prime',
    baseType: StationType.MILITARY_BASE,
    description: 'United Earth\'s primary forward military installation',
    uniqueFeatures: [
      'Fleet headquarters',
      'Advanced sensor array',
      'Strategic command center',
      'Fighter wing base (500+ craft)',
      'Restricted military zone'
    ],
    visualDesign: {
      architecture: 'Fortified octagonal superstructure with armored modules',
      size: '1.8km across, heavily armored',
      notableFeatures: [
        'Massive railgun batteries',
        'Layered shield generators',
        'Fighter launch tubes',
        'Command citadel',
        'Sensor dishes array'
      ],
      colors: {
        primary: '#2c3e50',
        secondary: '#34495e',
        accent: '#e74c3c'
      }
    },
    history: 'Built 2195 as response to growing outer system tensions. Has never been successfully attacked.',
    economicModifiers: {
      priceMultiplier: 0.9, // Subsidized military prices
      specialGoods: ['Military supplies', 'Weapons', 'Ammunition'],
      restrictions: ['Civilians restricted to commercial zone']
    },
    defenseModifiers: {
      rating: 10,
      specialDefenses: [
        '2000-ship defense fleet',
        'Planet-killer railguns',
        'Multiple shield layers',
        'Point defense swarms',
        'Automated combat AI'
      ]
    },
    uniqueServices: [
      'Military contracts',
      'Mercenary recruitment',
      'Tactical briefings',
      'Ship requisition (rank required)',
      'Emergency evacuation beacon'
    ],
    reputation: {
      requirement: 'United Earth reputation > 50',
      bonuses: [
        'Military discount',
        'Priority docking',
        'Access to classified missions'
      ]
    },
    lore: {
      founder: 'United Earth Strategic Command',
      significantEvents: [
        '2210: Repelled massive pirate fleet',
        '2248: Launched counter-offensive in Frontier War',
        '2275: Detected first extrasolar anomaly'
      ],
      currentStatus: 'Full combat readiness. Flagship of Admiral Morrison present',
      notableResident: 'Fleet Admiral Katherine Morrison, legendary tactician'
    }
  },

  THE_KEEP: {
    variantName: 'The Keep',
    baseType: StationType.MILITARY_BASE,
    description: 'Ancient defensive station guarding strategic chokepoint',
    uniqueFeatures: [
      'Pre-war construction',
      'Impenetrable armor',
      'Guardian AI system',
      'Self-sufficient for decades',
      'Legendary defensibility'
    ],
    visualDesign: {
      architecture: 'Cube-like fortress with gun emplacements on all faces',
      size: '1km cube, 50m thick armor plating',
      notableFeatures: [
        'Ancient railgun batteries (still functional)',
        'Redundant power systems',
        'Internal hydroponics',
        'Archaic but effective sensors',
        'Battle scars from 100+ engagements'
      ],
      colors: {
        primary: '#1c1c1c',
        secondary: '#696969',
        accent: '#8b0000'
      }
    },
    history: 'Built during First Expansion. Changed hands 14 times. Current garrison has held it for 30 years.',
    economicModifiers: {
      priceMultiplier: 1.5, // Everything expensive on fortress
      specialGoods: ['Antique weapons', 'Historical artifacts'],
      restrictions: ['Limited civilian access']
    },
    defenseModifiers: {
      rating: 10,
      specialDefenses: [
        'Legendary armor (never penetrated)',
        'Guardian AI (partially sentient)',
        'Overlapping fields of fire',
        'Ancient but deadly weapons',
        'Garrison of veterans'
      ]
    },
    uniqueServices: [
      'War stories (free)',
      'Tactical consultation',
      'Emergency shelter',
      'Historical archives'
    ],
    reputation: {
      requirement: 'Proven in combat',
      bonuses: [
        'Respect of garrison',
        'Access to restricted areas',
        'Training from veterans'
      ]
    },
    lore: {
      founder: 'Unknown - pre-dates most records',
      significantEvents: [
        '2087: First recorded siege',
        '2156: 90-day siege, defenders victorious',
        '2234: AI awakening incident',
        '2270: Repelled corporate takeover'
      ],
      currentStatus: 'Watchful. Garrison alert for 157th consecutive year',
      notableResident: 'Commander Silas Drake, "The Old Man of The Keep"'
    }
  },

  // ==================== RESEARCH FACILITIES ====================

  PROMETHEUS_LABS: {
    variantName: 'Prometheus Labs',
    baseType: StationType.RESEARCH_FACILITY,
    description: 'Cutting-edge research station pushing boundaries of science',
    uniqueFeatures: [
      'Experimental physics lab',
      'AI development division',
      'Quantum computing array',
      'Classified projects',
      'Nobel-level scientists'
    ],
    visualDesign: {
      architecture: 'Modular clusters around central supercomputer core',
      size: '1.2km across, constantly reconfiguring',
      notableFeatures: [
        'Quantum entanglement communication array',
        'Particle accelerator ring',
        'Zero-G manufacturing labs',
        'Biological containment sections',
        'Massive data storage crystals'
      ],
      colors: {
        primary: '#ffffff',
        secondary: '#4169e1',
        accent: '#00ffff'
      }
    },
    history: 'Established 2220 by tech consortium. 15 Nobel Prizes, 3 major scandals, 1 near-disaster.',
    economicModifiers: {
      priceMultiplier: 2.0, // Everything expensive
      specialGoods: [
        'Cutting-edge tech prototypes',
        'Research data',
        'Patent licenses',
        'Experimental materials'
      ],
      restrictions: ['High security clearance required for some areas']
    },
    defenseModifiers: {
      rating: 6,
      specialDefenses: [
        'Experimental weapons as last resort',
        'Autonomous defense drones',
        'EM warfare suite',
        'Emergency AI takeover'
      ]
    },
    uniqueServices: [
      'Tech upgrades (experimental)',
      'Research collaboration',
      'Data analysis',
      'Scientific consultation',
      'Prototype testing'
    ],
    reputation: {
      requirement: 'Science background or corporate sponsorship',
      bonuses: [
        'Access to experimental tech',
        'Participation in trials',
        'Research data access'
      ]
    },
    lore: {
      founder: 'Dr. Yuki Tanaka, Nobel laureate',
      significantEvents: [
        '2225: Quantum breakthrough',
        '2240: Containment breach (1 death)',
        '2258: First stable wormhole (microseconds)',
        '2279: AI Sophie achieves sentience'
      ],
      currentStatus: 'Active research on 200+ classified projects',
      notableResident: 'Dr. Sophie Chen (human) and Sophie-7 (AI)'
    }
  },

  // ==================== SHIPYARDS ====================

  TITAN_FORGE: {
    variantName: 'Titan Forge',
    baseType: StationType.SHIPYARD,
    description: 'Legendary shipyard where capital ships are born',
    uniqueFeatures: [
      'Capital ship construction',
      'Master shipwrights',
      'Custom ship design',
      'Historic ship registry',
      'Zero defect record'
    ],
    visualDesign: {
      architecture: 'Massive construction frames surrounding central factory core',
      size: '3km construction frames, 5+ ships in construction',
      notableFeatures: [
        'Kilometer-long construction bays',
        'Asteroid smelting facility',
        'Microgravity assembly halls',
        'Testing ranges',
        'Ship museum'
      ],
      colors: {
        primary: '#ff4500',
        secondary: '#2f4f4f',
        accent: '#ffd700'
      }
    },
    history: 'Built 2175. Every major capital ship has parts manufactured here. Pride of Mars.',
    economicModifiers: {
      priceMultiplier: 1.2, // Quality costs
      specialGoods: [
        'Custom ship components',
        'Upgraded engines',
        'Advanced weapons',
        'Rare ship blueprints'
      ]
    },
    defenseModifiers: {
      rating: 8,
      specialDefenses: [
        'Under Mars Federation protection',
        'Automated construction frames repurposed as weapons',
        'Prototype ships can be activated',
        'Massive workforce as militia'
      ]
    },
    uniqueServices: [
      'Ship construction (custom)',
      'Major overhauls',
      'Performance tuning',
      'Warranty repairs',
      'Ship appraisal'
    ],
    reputation: {
      requirement: 'Proven ship owner',
      bonuses: [
        'Master craftsman attention',
        'Custom design consultation',
        'Priority construction queue'
      ]
    },
    lore: {
      founder: 'Mars Shipbuilding Corporation',
      significantEvents: [
        '2189: Built first battleship',
        '2215: Completed UES Dreadnought',
        '2250: Worker\'s strike victory',
        '2280: Launched MFS Olympus - largest ship ever'
      ],
      currentStatus: 'Full production. 2-year waiting list for custom builds',
      notableResident: 'Master Shipwright Elena Volkov, 60 years experience'
    }
  },

  // ==================== SPECIAL STATIONS ====================

  LAST_CHANCE: {
    variantName: 'Last Chance',
    baseType: StationType.DEEP_SPACE_OUTPOST,
    description: 'Furthest outpost of civilization, gateway to the unknown',
    uniqueFeatures: [
      'Edge of explored space',
      'Frontier atmosphere',
      'Explorer hub',
      'Salvage operations',
      'Lawless territory beyond'
    ],
    visualDesign: {
      architecture: 'Hodgepodge of salvaged ship parts and habitats',
      size: 'Small - 300m, constantly growing',
      notableFeatures: [
        'Salvaged ship sections as modules',
        'Exposed framework',
        'Emergency patch panels everywhere',
        'Telescope array pointing into void',
        'Last fuel depot before darkness'
      ],
      colors: {
        primary: '#8b4513',
        secondary: '#696969',
        accent: '#ff8c00'
      }
    },
    history: 'Established 2265 by explorers. Has survived against all odds. Resupplied twice yearly.',
    economicModifiers: {
      priceMultiplier: 3.0, // Everything is expensive at the edge
      specialGoods: [
        'Frontier maps',
        'Salvaged alien tech',
        'Explorer equipment',
        'Emergency supplies'
      ]
    },
    defenseModifiers: {
      rating: 3,
      specialDefenses: [
        'Isolation (hard to find)',
        'Tough inhabitants',
        'Improvised weapons',
        'No one cares enough to attack'
      ]
    },
    uniqueServices: [
      'Explorer logs and maps',
      'Salvage tips',
      'Last chance supplies',
      'Rest before the unknown',
      'Memorial wall for the lost'
    ],
    reputation: {
      requirement: 'Must find it first',
      bonuses: [
        'Explorer community respect',
        'Free drinks (first time)',
        'Survival tips'
      ]
    },
    lore: {
      founder: 'Captain Marcus Reid, died 2271 exploring beyond',
      significantEvents: [
        '2267: First alien artifact recovered nearby',
        '2270: Contact lost for 6 months, survived',
        '2275: Discovery of The Anomaly (classified)',
        '2283: Mysterious signal received, investigation ongoing'
      ],
      currentStatus: 'Surviving. Population 240. Waiting for next supply run.',
      notableResident: 'Doc Harrow, medic who\'s seen everything'
    }
  },

  THE_GARDEN: {
    variantName: 'The Garden',
    baseType: StationType.ORBITAL_STATION,
    description: 'Unique biosphere station, an oasis in the void',
    uniqueFeatures: [
      'Massive internal biosphere',
      'Agricultural hub',
      'Natural environment in space',
      'Peaceful atmosphere',
      'Meditation and recovery center'
    ],
    visualDesign: {
      architecture: 'Translucent dome sections revealing green life within',
      size: '1.5km diameter, rotating for gravity',
      notableFeatures: [
        'Transparent aluminum viewing domes',
        'Internal forests and lakes',
        'Waterfall in central atrium',
        'Bird and fish populations',
        'Natural light from mirrors'
      ],
      colors: {
        primary: '#228b22',
        secondary: '#87ceeb',
        accent: '#ffd700'
      }
    },
    history: 'Built 2190 as agricultural experiment. Became spiritual retreat. Politically neutral.',
    economicModifiers: {
      priceMultiplier: 0.8, // Cheap fresh food
      specialGoods: [
        'Fresh food (real, not synth)',
        'Oxygen (premium)',
        'Seeds and plants',
        'Natural medicines',
        'Honey (rare luxury)'
      ]
    },
    defenseModifiers: {
      rating: 2,
      specialDefenses: [
        'Treaty protection (neutral status)',
        'Everyone likes The Garden',
        'Attacking it would be universally condemned'
      ]
    },
    uniqueServices: [
      'Meditation retreats',
      'Fresh food markets',
      'Natural healing',
      'Psychological counseling',
      'Art therapy',
      'Nature walks (in space!)'
    ],
    reputation: {
      requirement: 'Peaceful intent',
      bonuses: [
        'Reduced stress',
        'Psychological healing',
        'Tranquility buff'
      ]
    },
    lore: {
      founder: 'Agricultural consortium & Buddhist monks',
      significantEvents: [
        '2195: First tree bloomed in space',
        '2210: Achieved closed ecosystem',
        '2240: Survived disease outbreak',
        '2265: Hosted peace negotiations'
      ],
      currentStatus: 'Thriving. Ecosystem stable. Peace reigns.',
      notableResident: 'Mother Keiko, elderly caretaker and spiritual guide'
    }
  },

  NEXUS_STATION: {
    variantName: 'Nexus Station',
    baseType: StationType.RELAY_STATION,
    description: 'Central communications hub controlling data flow across sectors',
    uniqueFeatures: [
      'Quantum entanglement network',
      'Data storage vaults',
      'Communication relay',
      'Information trading',
      'News distribution'
    ],
    visualDesign: {
      architecture: 'Spherical core with communication arrays extending in all directions',
      size: '800m core, arrays extend 2km',
      notableFeatures: [
        'Massive antenna arrays',
        'Quantum comm dishes',
        'Data crystal storage banks',
        'Signal processing centers',
        'Journalist quarters'
      ],
      colors: {
        primary: '#4169e1',
        secondary: '#f0e68c',
        accent: '#00ffff'
      }
    },
    history: 'Built 2200 at junction of major routes. Handles 90% of intersystem communications.',
    economicModifiers: {
      priceMultiplier: 1.0,
      specialGoods: [
        'Information',
        'News subscriptions',
        'Data archives',
        'Communication services'
      ]
    },
    defenseModifiers: {
      rating: 7,
      specialDefenses: [
        'Critical infrastructure protection',
        'All factions defend it (need comms)',
        'Backup systems everywhere',
        'Multiple faction patrols'
      ]
    },
    uniqueServices: [
      'Secure communications',
      'Data mining',
      'News publication',
      'Archives search',
      'Message relay (guaranteed delivery)'
    ],
    reputation: {
      requirement: 'Journalist credentials or payment',
      bonuses: [
        'Priority message routing',
        'Access to archives',
        'News tips'
      ]
    },
    lore: {
      founder: 'Interstellar Communications Consortium',
      significantEvents: [
        '2205: First quantum link established',
        '2230: Survived hacking attempt',
        '2255: Broke major corruption scandal',
        '2277: Detected first extrasolar signal'
      ],
      currentStatus: 'Functioning at peak. 10 billion messages daily.',
      notableResident: 'Marcus Webb, investigative journalist of legendary skill'
    }
  }
};

/**
 * Get station variant by name
 */
export function getStationVariant(variantName: string): StationVariant | undefined {
  return STATION_VARIANTS[variantName];
}

/**
 * Get all variants of a specific type
 */
export function getVariantsByType(type: StationType): StationVariant[] {
  return Object.values(STATION_VARIANTS).filter(v => v.baseType === type);
}

/**
 * Get random variant for a station type
 */
export function getRandomVariant(type: StationType, rng: () => number): StationVariant | null {
  const variants = getVariantsByType(type);
  if (variants.length === 0) return null;
  return variants[Math.floor(rng() * variants.length)];
}

/**
 * Get legendary/famous stations
 */
export function getLegendaryStations(): StationVariant[] {
  return [
    STATION_VARIANTS.THE_EXCHANGE,
    STATION_VARIANTS.SENTINEL_PRIME,
    STATION_VARIANTS.THE_KEEP,
    STATION_VARIANTS.PROMETHEUS_LABS,
    STATION_VARIANTS.TITAN_FORGE
  ];
}

/**
 * Get frontier/dangerous stations
 */
export function getFrontierStations(): StationVariant[] {
  return [
    STATION_VARIANTS.FREEPORT_ZETA,
    STATION_VARIANTS.LAST_CHANCE
  ];
}

/**
 * Get peaceful/safe stations
 */
export function getPeacefulStations(): StationVariant[] {
  return [
    STATION_VARIANTS.THE_GARDEN,
    STATION_VARIANTS.THE_EXCHANGE
  ];
}
