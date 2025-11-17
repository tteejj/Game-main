/**
 * PlanetaryCities.ts
 * Planetary settlements, cities, and surface installations
 *
 * Creates living, breathing cities on habitable and colonized planets
 * Integrates with economy, faction, and mission systems
 */

import { Vector3, CelestialBody } from './CelestialBody';
import { StationFaction } from './StationGenerator';

export enum SettlementType {
  // Civilian settlements
  CAPITAL_CITY = 'CAPITAL_CITY',                    // Major planetary capital
  MEGACITY = 'MEGACITY',                            // Population 10M+
  CITY = 'CITY',                                    // Major urban center
  TOWN = 'TOWN',                                    // Small settlement
  OUTPOST = 'OUTPOST',                              // Frontier outpost
  RESEARCH_STATION = 'RESEARCH_STATION',            // Scientific base

  // Industrial facilities
  MINING_COLONY = 'MINING_COLONY',                  // Resource extraction
  MANUFACTURING_CENTER = 'MANUFACTURING_CENTER',     // Industrial production
  REFINERY_COMPLEX = 'REFINERY_COMPLEX',            // Ore/fuel processing
  AGRICULTURAL_DOME = 'AGRICULTURAL_DOME',          // Food production

  // Military installations
  MILITARY_BASE = 'MILITARY_BASE',                  // Armed forces base
  ORBITAL_DEFENSE_CENTER = 'ORBITAL_DEFENSE_CENTER', // Planetary defense
  FORTRESS = 'FORTRESS',                            // Heavily fortified base

  // Special locations
  SPACEPORT = 'SPACEPORT',                          // Major space traffic hub
  ABANDONED_RUINS = 'ABANDONED_RUINS',              // Dead civilization
  PIRATE_HAVEN = 'PIRATE_HAVEN',                    // Outlaw settlement
  CORPORATE_ARCOLOGY = 'CORPORATE_ARCOLOGY',        // Self-contained mega-structure
  DOME_CITY = 'DOME_CITY',                          // Pressurized habitat
  UNDERGROUND_CITY = 'UNDERGROUND_CITY',            // Subterranean settlement
}

export enum CityTechLevel {
  PRIMITIVE = 0,      // Pre-spaceflight
  INDUSTRIAL = 1,     // Early space age
  MODERN = 2,         // Current Earth equivalent
  ADVANCED = 3,       // Fusion power, basic AI
  HIGH_TECH = 4,      // Extensive automation
  CUTTING_EDGE = 5,   // Near-theoretical maximum
}

export enum CityEnvironment {
  EARTHLIKE = 'EARTHLIKE',         // Breathable atmosphere
  DOME = 'DOME',                   // Pressurized domes
  UNDERGROUND = 'UNDERGROUND',      // Below surface
  POLAR = 'POLAR',                 // Extreme cold climate
  DESERT = 'DESERT',               // Extreme heat/aridity
  OCEAN = 'OCEAN',                 // Floating/submarine
  TOXIC = 'TOXIC',                 // Hostile atmosphere
  VACUUM = 'VACUUM',               // Airless/sealed habs
}

export interface CityServices {
  trading: boolean;
  shipRepair: boolean;
  refueling: boolean;
  medical: boolean;
  employment: boolean;
  shopping: boolean;
  entertainment: boolean;
  banking: boolean;
  legal: boolean;
  blackMarket: boolean;
}

export interface CityEconomy {
  wealthLevel: number;              // 0-1 (poverty to prosperity)
  unemployment: number;              // 0-1
  gdpPerCapita: number;             // Credits per person
  primaryIndustry: string;
  exports: string[];
  imports: string[];
  taxRate: number;                  // 0-1
  crimeRate: number;                // 0-1
}

export interface CityInfrastructure {
  powerGeneration: number;          // MW
  waterSupply: number;              // liters/day
  foodProduction: number;           // % self-sufficient
  wasteRecycling: number;           // % recycled
  transportationQuality: number;    // 0-1
  communicationsQuality: number;    // 0-1
  medicalQuality: number;           // 0-1
}

export interface CityDefense {
  militaryPresence: number;         // Garrison size
  defenseRating: number;            // 0-10
  shieldGenerators: boolean;
  pointDefense: boolean;
  planetaryGuns: boolean;
  fighterSquadrons: number;
}

export interface CityPolitics {
  government: string;               // Democracy, Corporate, Military, etc.
  stability: number;                // 0-1 (chaos to stable)
  corruption: number;               // 0-1
  civilRights: number;              // 0-1
  law: string;                      // Legal system description
}

export interface PointOfInterest {
  id: string;
  name: string;
  type: string;                     // Museum, bar, market, etc.
  description: string;
  location: Vector3;                // Relative to city center
  accessible: boolean;
  services?: string[];
}

/**
 * Planetary Settlement/City
 */
export class PlanetaryCity {
  public id: string;
  public name: string;
  public type: SettlementType;
  public planet: string;                // Planet ID
  public faction: StationFaction;
  public population: number;
  public founded: number;               // Year
  public techLevel: CityTechLevel;
  public environment: CityEnvironment;
  public coordinates: { latitude: number; longitude: number };
  public elevation: number;             // meters above sea level (or datum)

  // Systems
  public services: CityServices;
  public economy: CityEconomy;
  public infrastructure: CityInfrastructure;
  public defense: CityDefense;
  public politics: CityPolitics;

  // Points of interest
  public landmarks: PointOfInterest[] = [];
  public spaceports: PointOfInterest[] = [];
  public districts: CityDistrict[] = [];

  // Reputation
  public reputation: Map<string, number> = new Map();

  // Dynamic state
  public currentEvents: string[] = [];
  public availableMissions: string[] = [];

  constructor(
    id: string,
    name: string,
    type: SettlementType,
    planet: string,
    faction: StationFaction,
    population: number,
    techLevel: CityTechLevel,
    environment: CityEnvironment,
    coordinates: { latitude: number; longitude: number }
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.planet = planet;
    this.faction = faction;
    this.population = population;
    this.founded = 2100 + Math.floor(Math.random() * 200);
    this.techLevel = techLevel;
    this.environment = environment;
    this.coordinates = coordinates;
    this.elevation = 0;

    // Initialize systems
    this.services = this.generateServices();
    this.economy = this.generateEconomy();
    this.infrastructure = this.generateInfrastructure();
    this.defense = this.generateDefense();
    this.politics = this.generatePolitics();
  }

  private generateServices(): CityServices {
    const isMajor = this.population > 1000000;
    return {
      trading: true,
      shipRepair: isMajor || this.type === SettlementType.SPACEPORT,
      refueling: this.population > 10000,
      medical: this.population > 5000,
      employment: true,
      shopping: this.population > 1000,
      entertainment: this.population > 50000,
      banking: this.population > 100000,
      legal: this.population > 50000,
      blackMarket: this.type === SettlementType.PIRATE_HAVEN || Math.random() < 0.3
    };
  }

  private generateEconomy(): CityEconomy {
    const baseGDP = this.techLevel * 15000 + Math.random() * 10000;
    const wealthMod = this.faction === StationFaction.CORPORATE ? 1.3 : 1.0;

    return {
      wealthLevel: Math.min(1, (baseGDP / 50000) * wealthMod),
      unemployment: Math.max(0, 0.15 - this.techLevel * 0.02 + Math.random() * 0.1),
      gdpPerCapita: baseGDP,
      primaryIndustry: this.getPrimaryIndustry(),
      exports: this.getExports(),
      imports: this.getImports(),
      taxRate: 0.15 + Math.random() * 0.15,
      crimeRate: Math.max(0, 0.2 - this.techLevel * 0.03 + Math.random() * 0.15)
    };
  }

  private generateInfrastructure(): CityInfrastructure {
    const quality = 0.3 + this.techLevel * 0.12 + Math.random() * 0.1;
    return {
      powerGeneration: this.population * (0.5 + this.techLevel * 0.2),
      waterSupply: this.population * 200,
      foodProduction: this.type === SettlementType.AGRICULTURAL_DOME ? 1.5 : Math.min(1, 0.3 + Math.random() * 0.4),
      wasteRecycling: Math.min(0.95, 0.4 + this.techLevel * 0.1),
      transportationQuality: quality,
      communicationsQuality: quality + 0.1,
      medicalQuality: quality
    };
  }

  private generateDefense(): CityDefense {
    const militaryTypes = [SettlementType.MILITARY_BASE, SettlementType.FORTRESS, SettlementType.CAPITAL_CITY];
    const isMilitary = militaryTypes.includes(this.type);

    return {
      militaryPresence: isMilitary ? this.population * 0.05 : this.population * 0.001,
      defenseRating: isMilitary ? 8 + Math.random() * 2 : 3 + Math.random() * 3,
      shieldGenerators: isMilitary && this.techLevel >= 3,
      pointDefense: this.population > 100000 || isMilitary,
      planetaryGuns: isMilitary || this.type === SettlementType.CAPITAL_CITY,
      fighterSquadrons: isMilitary ? Math.floor(5 + Math.random() * 10) : 0
    };
  }

  private generatePolitics(): CityPolitics {
    const govTypes = ['Democracy', 'Republic', 'Corporate Board', 'Military Junta', 'Council', 'Autocracy'];
    let government = govTypes[Math.floor(Math.random() * govTypes.length)];

    if (this.faction === StationFaction.CORPORATE) government = 'Corporate Board';
    if (this.type === SettlementType.MILITARY_BASE) government = 'Military Command';
    if (this.type === SettlementType.PIRATE_HAVEN) government = 'Anarchy';

    return {
      government,
      stability: Math.max(0.3, 0.7 + Math.random() * 0.3 - (this.economy.crimeRate * 0.5)),
      corruption: Math.max(0, 0.3 - this.techLevel * 0.04 + Math.random() * 0.3),
      civilRights: government === 'Democracy' ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4,
      law: this.getLawDescription(government)
    };
  }

  private getPrimaryIndustry(): string {
    switch (this.type) {
      case SettlementType.MINING_COLONY: return 'Mining & Extraction';
      case SettlementType.MANUFACTURING_CENTER: return 'Heavy Manufacturing';
      case SettlementType.REFINERY_COMPLEX: return 'Refining & Processing';
      case SettlementType.AGRICULTURAL_DOME: return 'Agriculture';
      case SettlementType.RESEARCH_STATION: return 'Research & Development';
      case SettlementType.SPACEPORT: return 'Logistics & Trade';
      case SettlementType.MILITARY_BASE: return 'Defense';
      case SettlementType.CORPORATE_ARCOLOGY: return 'Corporate Services';
      default: return 'Mixed Economy';
    }
  }

  private getExports(): string[] {
    const exports: string[] = [];
    switch (this.type) {
      case SettlementType.MINING_COLONY:
        exports.push('Raw Ore', 'Metals', 'Rare Earth Elements');
        break;
      case SettlementType.MANUFACTURING_CENTER:
        exports.push('Manufactured Goods', 'Machinery', 'Electronics');
        break;
      case SettlementType.REFINERY_COMPLEX:
        exports.push('Refined Metals', 'Fuel', 'Chemicals');
        break;
      case SettlementType.AGRICULTURAL_DOME:
        exports.push('Food', 'Organic Material', 'Water');
        break;
      case SettlementType.RESEARCH_STATION:
        exports.push('Technology', 'Patents', 'Data');
        break;
    }
    return exports;
  }

  private getImports(): string[] {
    const imports: string[] = [];
    if (this.infrastructure.foodProduction < 0.8) imports.push('Food');
    if (this.type !== SettlementType.REFINERY_COMPLEX) imports.push('Fuel');
    if (this.type !== SettlementType.MANUFACTURING_CENTER) imports.push('Manufactured Goods');
    imports.push('Luxury Items', 'Medicine');
    return imports;
  }

  private getLawDescription(government: string): string {
    const laws: Record<string, string> = {
      'Democracy': 'Constitutional law with civil protections',
      'Republic': 'Representative legal system',
      'Corporate Board': 'Corporate charter and regulations',
      'Military Junta': 'Military code and martial law',
      'Council': 'Council decrees and traditions',
      'Autocracy': 'Autocratic edicts',
      'Military Command': 'Unified Code of Military Justice',
      'Anarchy': 'Survival of the fittest'
    };
    return laws[government] || 'Standard legal framework';
  }

  /**
   * Add a point of interest
   */
  addLandmark(poi: PointOfInterest): void {
    this.landmarks.push(poi);
  }

  /**
   * Add a spaceport
   */
  addSpaceport(poi: PointOfInterest): void {
    this.spaceports.push(poi);
  }

  /**
   * Update city state
   */
  update(deltaTime: number): void {
    // Population growth/decline
    const growthRate = (this.economy.wealthLevel - this.economy.unemployment) * 0.00001;
    this.population *= (1 + growthRate * deltaTime);

    // Random events
    if (Math.random() < 0.001) {
      this.generateRandomEvent();
    }
  }

  private generateRandomEvent(): void {
    const events = [
      'Labor Strike',
      'Festival Week',
      'Tech Convention',
      'Political Protest',
      'Sporting Event',
      'Trade Fair',
      'Emergency Lockdown',
      'VIP Visit',
      'Infrastructure Failure',
      'Boom in Construction'
    ];
    this.currentEvents.push(events[Math.floor(Math.random() * events.length)]);
  }
}

/**
 * City District/Neighborhood
 */
export interface CityDistrict {
  id: string;
  name: string;
  type: string;             // Commercial, Residential, Industrial, etc.
  population: number;
  description: string;
  crimeRate: number;
  wealthLevel: number;
  landmarks: PointOfInterest[];
}

/**
 * City Generator
 */
export class CityGenerator {
  private rng: { next: () => number; range: (min: number, max: number) => number; choice: <T>(arr: T[]) => T };

  constructor(seed: number = Date.now()) {
    let s = seed;
    this.rng = {
      next: () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      },
      range: (min: number, max: number) => min + this.rng.next() * (max - min),
      choice: <T>(arr: T[]): T => arr[Math.floor(this.rng.next() * arr.length)]
    };
  }

  /**
   * Generate cities for a planet
   */
  generateCitiesForPlanet(
    planet: CelestialBody,
    civilizationLevel: number,
    faction: StationFaction
  ): PlanetaryCity[] {
    const cities: PlanetaryCity[] = [];

    // Determine number of settlements
    const numCities = Math.floor(this.rng.range(1, 5 + civilizationLevel * 2));

    // Determine tech level from civilization level
    const techLevel = Math.min(5, Math.floor(civilizationLevel / 2)) as CityTechLevel;

    // Determine environment type
    const environment = this.determineEnvironment(planet);

    for (let i = 0; i < numCities; i++) {
      const type = this.selectSettlementType(i, civilizationLevel);
      const population = this.generatePopulation(type, civilizationLevel);
      const coords = {
        latitude: this.rng.range(-90, 90),
        longitude: this.rng.range(-180, 180)
      };

      const city = new PlanetaryCity(
        `${planet.id}-city-${i}`,
        this.generateCityName(planet.name, type, i),
        type,
        planet.id,
        faction,
        population,
        techLevel,
        environment,
        coords
      );

      // Generate landmarks
      this.generateLandmarks(city);

      // Generate spaceports
      if (city.population > 100000 || type === SettlementType.SPACEPORT) {
        this.generateSpaceports(city);
      }

      // Generate districts for major cities
      if (city.population > 1000000) {
        this.generateDistricts(city);
      }

      cities.push(city);
    }

    return cities;
  }

  private determineEnvironment(planet: CelestialBody): CityEnvironment {
    // Would check planet type, atmosphere, temperature
    // Simplified for now
    const environments = Object.values(CityEnvironment);
    return this.rng.choice(environments);
  }

  private selectSettlementType(index: number, civilizationLevel: number): SettlementType {
    // First city is usually the capital or major city
    if (index === 0) {
      if (civilizationLevel >= 8) return SettlementType.CAPITAL_CITY;
      if (civilizationLevel >= 5) return SettlementType.MEGACITY;
      return SettlementType.CITY;
    }

    const types = [
      SettlementType.CITY,
      SettlementType.TOWN,
      SettlementType.MINING_COLONY,
      SettlementType.SPACEPORT,
      SettlementType.RESEARCH_STATION,
      SettlementType.MANUFACTURING_CENTER,
      SettlementType.AGRICULTURAL_DOME
    ];

    return this.rng.choice(types);
  }

  private generatePopulation(type: SettlementType, civilizationLevel: number): number {
    const multiplier = 1 + civilizationLevel * 0.5;

    switch (type) {
      case SettlementType.CAPITAL_CITY:
        return Math.floor(this.rng.range(10000000, 50000000) * multiplier);
      case SettlementType.MEGACITY:
        return Math.floor(this.rng.range(5000000, 15000000) * multiplier);
      case SettlementType.CITY:
        return Math.floor(this.rng.range(500000, 5000000) * multiplier);
      case SettlementType.TOWN:
        return Math.floor(this.rng.range(10000, 500000) * multiplier);
      case SettlementType.OUTPOST:
        return Math.floor(this.rng.range(100, 10000) * multiplier);
      case SettlementType.RESEARCH_STATION:
        return Math.floor(this.rng.range(500, 5000));
      case SettlementType.MINING_COLONY:
        return Math.floor(this.rng.range(5000, 100000));
      case SettlementType.MILITARY_BASE:
        return Math.floor(this.rng.range(10000, 200000));
      default:
        return Math.floor(this.rng.range(50000, 500000) * multiplier);
    }
  }

  private generateCityName(planetName: string, type: SettlementType, index: number): string {
    const prefixes = ['New', 'Port', 'Fort', 'Mount', 'Lake', 'North', 'South', 'East', 'West'];
    const suffixes = ['City', 'Station', 'Colony', 'Base', 'Settlement', 'Haven', 'Landing'];
    const names = ['Armstrong', 'Aldrin', 'Shepard', 'Glenn', 'Gagarin', 'Tereshkova', 'Ride', 'Jemison'];

    if (index === 0) {
      // Capital gets the planet name
      return `${planetName} City`;
    }

    if (type === SettlementType.MILITARY_BASE) {
      return `Fort ${this.rng.choice(names)}`;
    }

    if (type === SettlementType.SPACEPORT) {
      return `${planetName} Spaceport`;
    }

    const prefix = this.rng.next() > 0.5 ? this.rng.choice(prefixes) + ' ' : '';
    const base = this.rng.choice(names);
    const suffix = this.rng.next() > 0.6 ? ' ' + this.rng.choice(suffixes) : '';

    return prefix + base + suffix;
  }

  private generateLandmarks(city: PlanetaryCity): void {
    const numLandmarks = Math.min(10, Math.floor(city.population / 500000) + 1);

    const landmarkTypes = [
      { type: 'Monument', names: ['Victory Monument', 'Founder\'s Memorial', 'Unity Spire'] },
      { type: 'Museum', names: ['History Museum', 'Science Center', 'Art Gallery'] },
      { type: 'Park', names: ['Central Park', 'Botanical Gardens', 'Memorial Gardens'] },
      { type: 'Market', names: ['Grand Bazaar', 'Trade Center', 'Merchant Quarter'] },
      { type: 'Government', names: ['City Hall', 'Capitol Building', 'Administrative Center'] },
      { type: 'Entertainment', names: ['Arena', 'Theater District', 'Casino'] },
      { type: 'Religious', names: ['Cathedral', 'Temple', 'Meditation Center'] }
    ];

    for (let i = 0; i < numLandmarks; i++) {
      const landmark = this.rng.choice(landmarkTypes);
      const poi: PointOfInterest = {
        id: `${city.id}-landmark-${i}`,
        name: this.rng.choice(landmark.names),
        type: landmark.type,
        description: `Famous ${landmark.type.toLowerCase()} in ${city.name}`,
        location: {
          x: this.rng.range(-5000, 5000),
          y: this.rng.range(-5000, 5000),
          z: 0
        },
        accessible: true,
        services: landmark.type === 'Market' ? ['Trading', 'Shopping'] : undefined
      };
      city.addLandmark(poi);
    }
  }

  private generateSpaceports(city: PlanetaryCity): void {
    const numSpaceports = city.type === SettlementType.SPACEPORT ? this.rng.range(3, 8) :
                         city.population > 5000000 ? this.rng.range(2, 5) :
                         1;

    for (let i = 0; i < Math.floor(numSpaceports); i++) {
      const poi: PointOfInterest = {
        id: `${city.id}-spaceport-${i}`,
        name: i === 0 ? `${city.name} International Spaceport` : `${city.name} Spaceport ${i + 1}`,
        type: 'Spaceport',
        description: 'Major orbital and suborbital traffic hub',
        location: {
          x: this.rng.range(-10000, 10000),
          y: this.rng.range(-10000, 10000),
          z: 0
        },
        accessible: true,
        services: ['Refueling', 'Repairs', 'Trading', 'Lodging', 'Customs']
      };
      city.addSpaceport(poi);
    }
  }

  private generateDistricts(city: PlanetaryCity): void {
    const districtTypes = [
      { type: 'Commercial', name: 'Business District' },
      { type: 'Residential', name: 'Residential Zone' },
      { type: 'Industrial', name: 'Industrial Sector' },
      { type: 'Financial', name: 'Financial District' },
      { type: 'Government', name: 'Government Quarter' },
      { type: 'Entertainment', name: 'Entertainment District' },
      { type: 'Academic', name: 'University District' },
      { type: 'Medical', name: 'Medical Center' },
      { type: 'Slums', name: 'Lower City' }
    ];

    const numDistricts = Math.floor(this.rng.range(5, 12));

    for (let i = 0; i < numDistricts && i < districtTypes.length; i++) {
      const districtType = districtTypes[i];
      const populationPct = this.rng.range(0.05, 0.15);

      const district: CityDistrict = {
        id: `${city.id}-district-${i}`,
        name: districtType.name,
        type: districtType.type,
        population: Math.floor(city.population * populationPct),
        description: `${districtType.name} of ${city.name}`,
        crimeRate: districtType.type === 'Slums' ? 0.6 + Math.random() * 0.3 :
                  city.economy.crimeRate * (0.5 + Math.random() * 1.5),
        wealthLevel: districtType.type === 'Financial' ? 0.8 + Math.random() * 0.2 :
                    districtType.type === 'Slums' ? 0.1 + Math.random() * 0.2 :
                    city.economy.wealthLevel * (0.7 + Math.random() * 0.6),
        landmarks: []
      };

      city.districts.push(district);
    }
  }
}

/**
 * Pre-defined famous cities for lore
 */
export const FAMOUS_CITIES = {
  earth: {
    name: 'New York Arcology',
    description: 'Earth\'s largest mega-city, home to 50 million people in towering arcologies',
    population: 50000000
  },
  mars: {
    name: 'Olympus City',
    description: 'Capital of Mars Federation, built on the flanks of Olympus Mons',
    population: 15000000
  },
  titan: {
    name: 'Kraken Mare City',
    description: 'Floating city on Titan\'s methane seas',
    population: 2000000
  },
  europa: {
    name: 'Conamara Station',
    description: 'Underwater research city beneath Europa\'s ice',
    population: 50000
  },
  luna: {
    name: 'Armstrong Base',
    description: 'First permanent lunar settlement, now a sprawling underground metropolis',
    population: 8000000
  }
};
