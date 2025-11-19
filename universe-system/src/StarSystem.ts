/**
 * StarSystem.ts
 * Complete star system generation with all bodies, stations, and hazards
 */

import {
  Star,
  Planet,
  Moon,
  Asteroid,
  CelestialBody,
  StarClass,
  PhysicalProperties,
  VisualProperties,
  Vector3
} from './CelestialBody';
import { PlanetGenerator } from './PlanetGenerator';
import { StationGenerator, SpaceStation } from './StationGenerator';
import { HazardSystem, Hazard } from './HazardSystem';
import { Satellite, SatelliteFactory, SatelliteType } from '../../physics-modules/src/satellite';
import { TrafficManager, NPCShip, ShipType } from './npc-traffic';
import {
  RelayNetwork,
  CommunicationsManager,
  NetworkNode,
  FrequencyBand,
  getFrequencyForBand,
  AntennaPresets
} from './communications';
import {
  Market,
  CommodityType
} from './economy';
import {
  POIManager,
  PointOfInterest
} from './poi';
import { Vector3 as Vector3Class } from '../../physics-modules/src/Vector3';
import { FactionDiplomacyEngine } from './faction-dynamics/FactionDiplomacyEngine';
import { FactionEconomicNeeds } from './faction-dynamics/FactionEconomicNeeds';

// Phase 3 4X Systems
import { ConstructionSystem } from './ConstructionSystem';
import { FactionExpansionAI } from './faction-dynamics/FactionExpansionAI';
import { ManufacturingSystem } from './ManufacturingSystem';
import { ProductionChainManager } from './EconomyIntegration';
import { ResearchSystem } from './ResearchSystem';
import { FactionResearchAI } from './faction-dynamics/FactionResearchAI';
import { PopulationSystem } from './PopulationSystem';
import { ConquestSystem } from './ConquestSystem';
import { FactionMilitaryAI } from './faction-dynamics/FactionMilitaryAI';

export interface StarSystemConfig {
  seed?: number;
  starClass?: StarClass;
  numPlanets?: { min: number; max: number };
  allowAsteroidBelt?: boolean;
  allowStations?: boolean;
  allowSatellites?: boolean;
  allowHazards?: boolean;
  allowNPCTraffic?: boolean;
  allowCommunications?: boolean;
  allowPOIs?: boolean;
  civilizationLevel?: number; // 0-10 (0 = uninhabited, 10 = high tech)
  position?: Vector3; // Position in galaxy
}

export interface StarSystemData {
  id: string;
  name: string;
  star: Star;
  planets: Planet[];
  moons: Moon[];
  asteroids: Asteroid[];
  stations: SpaceStation[];
  satellites: Satellite[];
  npcShips: NPCShip[];
  pois: PointOfInterest[];
  hazards: Hazard[];
  position: Vector3;
}

/**
 * Star System Generator
 */
export class StarSystem {
  public id: string;
  public name: string;
  public star: Star;
  public planets: Planet[] = [];
  public moons: Moon[] = [];
  public asteroids: Asteroid[] = [];
  public stations: SpaceStation[] = [];
  public satellites: Satellite[] = [];
  public trafficManager: TrafficManager<NPCShip>;
  public relayNetwork: RelayNetwork;
  public communicationsManager: CommunicationsManager;
  public markets: Map<string, Market> = new Map(); // station id -> market
  public poiManager: POIManager;
  public hazardSystem: HazardSystem;
  public position: Vector3;
  public factionDiplomacy: FactionDiplomacyEngine;
  public economicNeeds: FactionEconomicNeeds;

  // ========================================================================
  // PHASE 3: 4X GAMEPLAY SYSTEMS
  // ========================================================================

  // Construction & Expansion
  public constructionSystem: ConstructionSystem;
  public factionExpansionAIs: Map<string, FactionExpansionAI> = new Map();

  // Manufacturing & Production
  public manufacturingSystem: ManufacturingSystem;
  public productionChainManager: ProductionChainManager;

  // Research & Technology
  public researchSystem: ResearchSystem;
  public factionResearchAIs: Map<string, FactionResearchAI> = new Map();

  // Population Simulation
  public populationSystem: PopulationSystem;

  // Conquest & Military
  public conquestSystem: ConquestSystem;
  public factionMilitaryAIs: Map<string, FactionMilitaryAI> = new Map();

  // INTEGRATED UNIVERSE - Complete living universe orchestration
  public integratedOrchestrator: any; // Will be set after initialization
  private universeOrchestrator: any; // Base orchestrator
  private contextProvider: any; // Universe context provider

  private planetGenerator: PlanetGenerator;
  private stationGenerator: StationGenerator;
  private rng: {
    next: () => number;
    range: (min: number, max: number) => number;
    choice: <T>(arr: T[]) => T;
    bool: (p?: number) => boolean;
  };

  constructor(
    id: string,
    name: string,
    config: StarSystemConfig = {}
  ) {
    const seed = config.seed || Date.now();

    // Initialize RNG
    let s = seed;
    this.rng = {
      next: () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      },
      range: (min: number, max: number) => min + this.rng.next() * (max - min),
      choice: <T>(arr: T[]): T => arr[Math.floor(this.rng.next() * arr.length)],
      bool: (p: number = 0.5) => this.rng.next() < p
    };

    this.id = id;
    this.name = name;
    this.position = config.position || { x: 0, y: 0, z: 0 };

    // Initialize generators
    this.planetGenerator = new PlanetGenerator(seed);
    this.stationGenerator = new StationGenerator(seed + 1);
    this.hazardSystem = new HazardSystem(seed + 2);
    this.trafficManager = new TrafficManager<NPCShip>(100000, 100);
    this.relayNetwork = new RelayNetwork(1e10); // 10 million km max range
    this.communicationsManager = new CommunicationsManager(this.relayNetwork);
    this.poiManager = new POIManager();
    this.factionDiplomacy = new FactionDiplomacyEngine();
    this.economicNeeds = new FactionEconomicNeeds();

    // Generate the star
    this.star = this.generateStar(config.starClass);

    // Generate planets
    this.generatePlanets(config);

    // Generate moons
    this.generateMoons();

    // Generate asteroid belt
    if (config.allowAsteroidBelt !== false && this.rng.bool(0.6)) {
      this.generateAsteroidBelt();
    }

    // Generate stations
    if (config.allowStations !== false) {
      this.generateStations(config.civilizationLevel || 5);
    }

    // Generate satellites
    if (config.allowSatellites !== false) {
      this.generateSatellites(config.civilizationLevel || 5);
    }

    // Generate NPC traffic
    if (config.allowNPCTraffic !== false) {
      this.generateNPCTraffic(config.civilizationLevel || 5);
    }

    // Generate hazards
    if (config.allowHazards !== false) {
      this.hazardSystem.generateSystemHazards(
        this.id,
        [...this.planets, ...this.asteroids]
      );
    }

    // Build communications network
    if (config.allowCommunications !== false) {
      this.buildCommunicationsNetwork(config.civilizationLevel || 5);
    }

    // Initialize station markets
    this.initializeMarkets(config.civilizationLevel || 5);

    // Generate Points of Interest
    if (config.allowPOIs !== false) {
      this.generatePOIs(config.civilizationLevel || 5);
    }

    // ========================================================================
    // INTEGRATED UNIVERSE - Initialize complete living universe system
    // ========================================================================
    this.initializeIntegratedUniverse(config);

    // ========================================================================
    // PHASE 3: Initialize 4X Gameplay Systems
    // ========================================================================
    this.initializePhase3Systems(config);
  }

  /**
   * Generate the star
   */
  private generateStar(starClass?: StarClass): Star {
    // Select star class if not specified
    if (!starClass) {
      const distribution = [
        { class: StarClass.M, weight: 0.76 },
        { class: StarClass.K, weight: 0.12 },
        { class: StarClass.G, weight: 0.08 },
        { class: StarClass.F, weight: 0.03 },
        { class: StarClass.A, weight: 0.006 },
        { class: StarClass.B, weight: 0.001 },
        { class: StarClass.O, weight: 0.00003 }
      ];

      const roll = this.rng.next();
      let cumulative = 0;
      for (const { class: sc, weight } of distribution) {
        cumulative += weight;
        if (roll < cumulative) {
          starClass = sc;
          break;
        }
      }
      starClass = starClass || StarClass.M;
    }

    // Generate star properties based on class
    const { mass, radius, luminosity, temperature, color } = this.getStarProperties(starClass);

    const physical: PhysicalProperties = {
      mass,
      radius,
      rotationPeriod: this.rng.range(86400 * 10, 86400 * 30), // 10-30 days
      axialTilt: this.rng.range(0, Math.PI / 12),
      surfaceGravity: (6.674e-11 * mass) / (radius * radius),
      escapeVelocity: Math.sqrt(2 * 6.674e-11 * mass / radius)
    };

    const visual: VisualProperties = {
      color,
      albedo: 0.0, // Stars don't reflect light
      emissivity: 1.0
    };

    return new Star(
      `${this.id}-star`,
      this.name,
      starClass,
      physical,
      visual,
      luminosity,
      temperature
    );
  }

  /**
   * Get star properties based on class
   */
  private getStarProperties(starClass: StarClass): {
    mass: number;
    radius: number;
    luminosity: number;
    temperature: number;
    color: string;
  } {
    const solarMass = 1.989e30;
    const solarRadius = 6.96e8;
    const solarLuminosity = 3.828e26;

    switch (starClass) {
      case StarClass.O:
        return {
          mass: solarMass * this.rng.range(16, 50),
          radius: solarRadius * this.rng.range(6.6, 10),
          luminosity: solarLuminosity * this.rng.range(30000, 100000),
          temperature: this.rng.range(30000, 50000),
          color: '#9bb0ff'
        };
      case StarClass.B:
        return {
          mass: solarMass * this.rng.range(2.1, 16),
          radius: solarRadius * this.rng.range(1.8, 6.6),
          luminosity: solarLuminosity * this.rng.range(25, 30000),
          temperature: this.rng.range(10000, 30000),
          color: '#aabfff'
        };
      case StarClass.A:
        return {
          mass: solarMass * this.rng.range(1.4, 2.1),
          radius: solarRadius * this.rng.range(1.4, 1.8),
          luminosity: solarLuminosity * this.rng.range(5, 25),
          temperature: this.rng.range(7500, 10000),
          color: '#cad7ff'
        };
      case StarClass.F:
        return {
          mass: solarMass * this.rng.range(1.04, 1.4),
          radius: solarRadius * this.rng.range(1.15, 1.4),
          luminosity: solarLuminosity * this.rng.range(1.5, 5),
          temperature: this.rng.range(6000, 7500),
          color: '#f8f7ff'
        };
      case StarClass.G:
        return {
          mass: solarMass * this.rng.range(0.8, 1.04),
          radius: solarRadius * this.rng.range(0.96, 1.15),
          luminosity: solarLuminosity * this.rng.range(0.6, 1.5),
          temperature: this.rng.range(5200, 6000),
          color: '#fff4ea'
        };
      case StarClass.K:
        return {
          mass: solarMass * this.rng.range(0.45, 0.8),
          radius: solarRadius * this.rng.range(0.7, 0.96),
          luminosity: solarLuminosity * this.rng.range(0.08, 0.6),
          temperature: this.rng.range(3700, 5200),
          color: '#ffd2a1'
        };
      case StarClass.M:
        return {
          mass: solarMass * this.rng.range(0.08, 0.45),
          radius: solarRadius * this.rng.range(0.1, 0.7),
          luminosity: solarLuminosity * this.rng.range(0.001, 0.08),
          temperature: this.rng.range(2400, 3700),
          color: '#ffcc6f'
        };
      default:
        // Default to G-type (Sun-like)
        return {
          mass: solarMass,
          radius: solarRadius,
          luminosity: solarLuminosity,
          temperature: 5778,
          color: '#fff4ea'
        };
    }
  }

  /**
   * Generate planets
   */
  private generatePlanets(config: StarSystemConfig): void {
    const min = config.numPlanets?.min || 3;
    const max = config.numPlanets?.max || 12;
    const numPlanets = Math.floor(this.rng.range(min, max + 1));

    // Generate orbital radii using Titius-Bode-like law
    const orbitalRadii: number[] = [];
    for (let i = 0; i < numPlanets; i++) {
      // Modified formula: a = 0.4 + 0.3 * 2^n
      const a = 0.4 + 0.3 * Math.pow(2, i);
      // Add some randomness
      const radius = a * this.rng.range(0.8, 1.2);
      orbitalRadii.push(radius);
    }

    // Generate planets
    for (let i = 0; i < numPlanets; i++) {
      const planet = this.planetGenerator.generatePlanet(
        `${this.id}-planet-${i}`,
        this.generatePlanetName(i),
        orbitalRadii[i],
        this.star.physical.mass,
        {
          seed: config.seed,
          allowGasGiants: true,
          allowHabitableWorlds: true,
          allowExtremeWorlds: true
        }
      );

      this.star.addChild(planet);
      this.planets.push(planet);
    }
  }

  /**
   * Generate moons for all planets
   */
  private generateMoons(): void {
    for (const planet of this.planets) {
      const moons = this.planetGenerator.generateMoons(planet, {
        minMoons: 0,
        maxMoons: 8,
        minOrbitalRadius: 2,
        maxOrbitalRadius: 20
      });

      this.moons.push(...moons);
    }
  }

  /**
   * Generate asteroid belt
   */
  private generateAsteroidBelt(): void {
    // Find gap between planets (usually between inner rocky and outer gas giants)
    let beltPosition = 2.8; // Default ~Mars-Jupiter gap

    if (this.planets.length >= 4) {
      // Find largest gap
      let maxGap = 0;
      let gapPosition = 0;

      for (let i = 0; i < this.planets.length - 1; i++) {
        const innerRadius = this.planets[i].orbital!.semiMajorAxis / 1.496e11;
        const outerRadius = this.planets[i + 1].orbital!.semiMajorAxis / 1.496e11;
        const gap = outerRadius - innerRadius;

        if (gap > maxGap && innerRadius > 1.0 && outerRadius < 6.0) {
          maxGap = gap;
          gapPosition = (innerRadius + outerRadius) / 2;
        }
      }

      if (gapPosition > 0) beltPosition = gapPosition;
    }

    // Generate asteroids
    const numAsteroids = Math.floor(this.rng.range(50, 200));
    const innerRadius = beltPosition * 0.9;
    const outerRadius = beltPosition * 1.1;

    const asteroids = this.planetGenerator.generateAsteroidBelt(
      this.id,
      numAsteroids,
      innerRadius,
      outerRadius,
      this.star.physical.mass
    );

    // Set orbital elements for each asteroid
    for (const asteroid of asteroids) {
      const orbitalRadius = this.rng.range(innerRadius, outerRadius);
      asteroid.orbital = {
        semiMajorAxis: orbitalRadius * 1.496e11,
        eccentricity: this.rng.range(0, 0.3),
        inclination: this.rng.range(0, Math.PI / 6),
        longitudeOfAscendingNode: this.rng.range(0, 2 * Math.PI),
        argumentOfPeriapsis: this.rng.range(0, 2 * Math.PI),
        trueAnomaly: this.rng.range(0, 2 * Math.PI)
      };

      this.star.addChild(asteroid);
    }

    this.asteroids.push(...asteroids);
  }

  /**
   * Generate stations
   */
  private generateStations(civilizationLevel: number): void {
    // More advanced civilizations have more stations
    const stationMultiplier = civilizationLevel / 10;

    if (stationMultiplier < 0.2) return; // No stations in primitive systems

    const allBodies = [...this.planets, ...this.moons, ...this.asteroids];
    const stations = this.stationGenerator.generateStationsForSystem(this.id, allBodies);

    // Scale number of stations by civilization level
    const numStations = Math.floor(stations.length * stationMultiplier);
    this.stations = stations.slice(0, numStations);
  }

  /**
   * Generate satellites
   */
  private generateSatellites(civilizationLevel: number): void {
    // More advanced civilizations have more satellites
    if (civilizationLevel < 3) return; // Low-tech systems don't have satellites

    // Number of satellites scales with civilization level
    // Level 3-5: 1-2 satellites (basic comms)
    // Level 6-7: 3-5 satellites (comms + recon)
    // Level 8-10: 6-10 satellites (full constellation)

    let numSatellites = 0;
    if (civilizationLevel >= 8) {
      numSatellites = Math.floor(this.rng.range(6, 10));
    } else if (civilizationLevel >= 6) {
      numSatellites = Math.floor(this.rng.range(3, 5));
    } else {
      numSatellites = Math.floor(this.rng.range(1, 2));
    }

    // Find inhabited planets/moons to place satellites around
    const inhabitedBodies = this.planets.filter(p =>
      p.isHabitable || p.resources.size > 0 || p.children.length > 0
    );

    if (inhabitedBodies.length === 0 && this.planets.length > 0) {
      // Fall back to any planet
      inhabitedBodies.push(this.planets[0]);
    }

    if (inhabitedBodies.length === 0) return;

    // Generate satellites around inhabited bodies
    for (let i = 0; i < numSatellites; i++) {
      const body = this.rng.choice(inhabitedBodies);

      // Choose satellite type based on civilization level
      let satType: SatelliteType;
      const roll = this.rng.next();

      if (civilizationLevel >= 8) {
        // High-tech: mix of all types
        if (roll < 0.3) satType = SatelliteType.COMMUNICATIONS;
        else if (roll < 0.5) satType = SatelliteType.RECONNAISSANCE;
        else if (roll < 0.7) satType = SatelliteType.NAVIGATION;
        else satType = SatelliteType.WEATHER;
      } else if (civilizationLevel >= 6) {
        // Mid-tech: comms and recon
        if (roll < 0.6) satType = SatelliteType.COMMUNICATIONS;
        else satType = SatelliteType.RECONNAISSANCE;
      } else {
        // Basic tech: mostly comms
        satType = SatelliteType.COMMUNICATIONS;
      }

      // Determine orbit altitude (100km - 2000km)
      const orbitAltitude = this.rng.range(100000, 2000000);

      // Create satellite
      const satName = `${body.name}-Sat-${i + 1}`;
      let satellite: Satellite;

      switch (satType) {
        case SatelliteType.COMMUNICATIONS:
          satellite = SatelliteFactory.createCommunicationsSatellite(satName, orbitAltitude);
          break;
        case SatelliteType.RECONNAISSANCE:
          satellite = SatelliteFactory.createReconnaissanceSatellite(satName, orbitAltitude);
          break;
        case SatelliteType.NAVIGATION:
          satellite = SatelliteFactory.createNavigationSatellite(satName, orbitAltitude);
          break;
        case SatelliteType.WEATHER:
          satellite = SatelliteFactory.createWeatherSatellite(satName, orbitAltitude);
          break;
        default:
          satellite = SatelliteFactory.createCommunicationsSatellite(satName, orbitAltitude);
      }

      // Deploy systems
      satellite.deploySolarPanels();
      if (satType === SatelliteType.COMMUNICATIONS) {
        satellite.deployAntennas();
      }

      // Set attitude mode
      if (satType === SatelliteType.RECONNAISSANCE || satType === SatelliteType.WEATHER) {
        satellite.setAttitudeMode('earth_pointing');
      } else {
        satellite.setAttitudeMode('sun_pointing');
      }

      // Note: Orbital position randomization would require access to private M0 property
      // This is handled during satellite creation instead

      this.satellites.push(satellite);
    }
  }

  /**
   * Generate NPC traffic
   */
  private generateNPCTraffic(civilizationLevel: number): void {
    // No traffic in low-civilization systems
    if (civilizationLevel < 3) return;
    if (this.stations.length === 0) return; // Need stations for traffic

    // Number of ships scales with civilization level and number of stations
    // Level 3-5: 1-2 ships per station
    // Level 6-7: 2-4 ships per station
    // Level 8-10: 3-6 ships per station

    let shipsPerStation = 0;
    if (civilizationLevel >= 8) {
      shipsPerStation = Math.floor(this.rng.range(3, 6));
    } else if (civilizationLevel >= 6) {
      shipsPerStation = Math.floor(this.rng.range(2, 4));
    } else {
      shipsPerStation = Math.floor(this.rng.range(1, 2));
    }

    const numShips = Math.min(shipsPerStation * this.stations.length, 100); // Cap at 100 ships

    for (let i = 0; i < numShips; i++) {
      // Choose ship type based on station types and civilization level
      let shipType: ShipType;
      const roll = this.rng.next();

      if (roll < 0.3) {
        shipType = ShipType.CARGO_FREIGHTER;
      } else if (roll < 0.5) {
        shipType = ShipType.CARGO_SHUTTLE;
      } else if (roll < 0.65) {
        shipType = ShipType.MINING_VESSEL;
      } else if (roll < 0.8) {
        shipType = ShipType.PATROL_SHIP;
      } else if (roll < 0.9) {
        shipType = ShipType.PASSENGER_LINER;
      } else if (roll < 0.95) {
        shipType = ShipType.RESEARCH;
      } else {
        shipType = ShipType.SALVAGE;
      }

      // Create ship near a random station
      const station = this.rng.choice(this.stations);
      const stationPos = station.position;

      // Random offset from station (1000-10000 km)
      const offsetDistance = this.rng.range(1000000, 10000000);
      const offsetAngle = this.rng.range(0, 2 * Math.PI);
      const offsetPhi = this.rng.range(0, Math.PI);

      const position = {
        x: stationPos.x + offsetDistance * Math.sin(offsetPhi) * Math.cos(offsetAngle),
        y: stationPos.y + offsetDistance * Math.sin(offsetPhi) * Math.sin(offsetAngle),
        z: stationPos.z + offsetDistance * Math.cos(offsetPhi)
      };

      // Random velocity (0-100 m/s)
      const speed = this.rng.range(0, 100);
      const velAngle = this.rng.range(0, 2 * Math.PI);
      const velPhi = this.rng.range(0, Math.PI);

      const velocity = {
        x: speed * Math.sin(velPhi) * Math.cos(velAngle),
        y: speed * Math.sin(velPhi) * Math.sin(velAngle),
        z: speed * Math.cos(velPhi)
      };

      // Create ship (convert Vector3 interface to Vector3 class)
      const shipId = `${this.id}-ship-${i}`;
      const shipName = this.generateShipName(shipType, i);
      const ship = new NPCShip(
        shipId,
        shipName,
        shipType,
        new Vector3Class(position.x, position.y, position.z),
        new Vector3Class(velocity.x, velocity.y, velocity.z)
      );

      // Set a destination (another station)
      if (this.stations.length > 1) {
        // Pick different station as destination
        const destinations = this.stations.filter(s => s !== station);
        if (destinations.length > 0) {
          const destination = this.rng.choice(destinations);
          const destPos = destination.position;
          ship.setDestination(
            new Vector3Class(destPos.x, destPos.y, destPos.z),
            destination.name
          );
          ship.originName = station.name;
        }
      }

      // Add to traffic manager
      this.trafficManager.addVessel(ship);
    }
  }

  /**
   * Generate ship name
   */
  private generateShipName(type: ShipType, index: number): string {
    const prefixes: Record<ShipType, string[]> = {
      [ShipType.CARGO_FREIGHTER]: ['Titan\'s Bounty', 'Iron Hauler', 'Merchant Prince', 'Trade Wind'],
      [ShipType.CARGO_SHUTTLE]: ['Quick Silver', 'Swift Cargo', 'Rapid Transit', 'Express'],
      [ShipType.MINING_VESSEL]: ['Prospector', 'Ore Finder', 'Rock Hound', 'Claim Jumper'],
      [ShipType.PATROL_SHIP]: ['Defender', 'Guardian', 'Sentinel', 'Watchdog'],
      [ShipType.PASSENGER_LINER]: ['Stellar Princess', 'Star Voyager', 'Cosmic Cruise', 'Nebula Queen'],
      [ShipType.PIRATE]: ['Black Flag', 'Raider', 'Marauder', 'Rogue'],
      [ShipType.RESEARCH]: ['Discovery', 'Explorer', 'Surveyor', 'Science Vessel'],
      [ShipType.SALVAGE]: ['Scrap Hunter', 'Wreck Finder', 'Salvage King', 'Reclaimer']
    };

    const names = prefixes[type] || ['Unknown'];
    const baseName = this.rng.choice(names);

    return `${baseName} ${index + 1}`;
  }

  /**
   * Build communications network
   */
  private buildCommunicationsNetwork(civilizationLevel: number): void {
    // Add stations as network nodes
    for (const station of this.stations) {
      // Station communication power scales with civilization level
      const powerWatts = 100 + civilizationLevel * 20; // 100-300W
      const frequency = getFrequencyForBand(FrequencyBand.SHF); // 10 GHz for stations

      const stationPos = station.position;
      const node: NetworkNode = {
        id: station.id,
        position: new Vector3Class(stationPos.x, stationPos.y, stationPos.z),
        transmitPower: powerWatts,
        antenna: {
          gain: AntennaPresets.HIGH_GAIN.gain,
          frequency
        },
        maxConnections: 10,
        isRelay: true
      };

      this.relayNetwork.addNode(node);
    }

    // Add satellites as network nodes (if they have communication capabilities)
    for (const satellite of this.satellites) {
      // Only comms and nav satellites have relay capability
      const isCommsSat = satellite.type === SatelliteType.COMMUNICATIONS;
      const isNavSat = satellite.type === SatelliteType.NAVIGATION;

      if (isCommsSat || isNavSat) {
        const powerWatts = 50; // Satellites have less power than stations
        const frequency = getFrequencyForBand(FrequencyBand.SHF);

        const satPos = satellite.orbitalBody.position;
        const node: NetworkNode = {
          id: satellite.name,
          position: new Vector3Class(satPos.x, satPos.y, satPos.z),
          transmitPower: powerWatts,
          antenna: {
            gain: AntennaPresets.SATELLITE.gain,
            frequency
          },
          maxConnections: 5,
          isRelay: isCommsSat // Only comms sats relay
        };

        this.relayNetwork.addNode(node);
      }
    }

    // Add NPC ships as network nodes
    const ships = this.trafficManager.getAllVessels();
    for (const ship of ships) {
      const powerWatts = 20; // Ships have low power
      const frequency = getFrequencyForBand(FrequencyBand.UHF); // 1 GHz for ships

      const node: NetworkNode = {
        id: ship.id,
        position: ship.position,
        transmitPower: powerWatts,
        antenna: {
          gain: AntennaPresets.DIRECTIONAL.gain,
          frequency
        },
        maxConnections: 3,
        isRelay: false // Ships don't relay
      };

      this.relayNetwork.addNode(node);
    }

    // Build network topology
    this.relayNetwork.updateTopology();

    // Set message generation rate based on civilization
    const messagesPerSecond = 0.05 + civilizationLevel * 0.01; // 0.05-0.15 messages/s
    this.communicationsManager.setMessageGenerationRate(messagesPerSecond);
  }

  /**
   * Initialize markets for all stations
   */
  private initializeMarkets(civilizationLevel: number): void {
    for (const station of this.stations) {
      // Market size based on station type and civilization
      let marketSize = 1.0;
      switch (station.stationType) {
        case 'TRADING_HUB':
          marketSize = 3.0 + civilizationLevel * 0.5;
          break;
        case 'ORBITAL_STATION':
          marketSize = 2.0 + civilizationLevel * 0.3;
          break;
        case 'MINING_PLATFORM':
          marketSize = 1.5 + civilizationLevel * 0.2;
          break;
        case 'SHIPYARD':
          marketSize = 2.5 + civilizationLevel * 0.4;
          break;
        case 'FUEL_DEPOT':
          marketSize = 1.0 + civilizationLevel * 0.2;
          break;
        default:
          marketSize = 1.0 + civilizationLevel * 0.2;
      }

      // Create market
      const market = new Market(station.id, station.name, marketSize);

      // Determine which commodities to trade based on station type
      const commodities: CommodityType[] = [];

      switch (station.stationType) {
        case 'TRADING_HUB':
          // Trading hubs have everything
          commodities.push(
            ...Object.values(CommodityType)
          );
          break;

        case 'MINING_PLATFORM':
          // Mining platforms produce raw materials
          commodities.push(
            CommodityType.METALLIC_ORE,
            CommodityType.ROCKY_ORE,
            CommodityType.ICE,
            CommodityType.RARE_EARTH,
            CommodityType.PLATINUM,
            CommodityType.URANIUM,
            CommodityType.FOOD,
            CommodityType.WATER,
            CommodityType.OXYGEN,
            CommodityType.HYDROGEN_FUEL,
            CommodityType.MACHINERY,
            CommodityType.TOOLS
          );
          break;

        case 'SHIPYARD':
          // Shipyards need materials, produce components
          commodities.push(
            CommodityType.STEEL,
            CommodityType.TITANIUM,
            CommodityType.ALUMINUM,
            CommodityType.ELECTRONICS,
            CommodityType.SHIP_COMPONENTS,
            CommodityType.COMPUTER_SYSTEMS,
            CommodityType.SENSORS,
            CommodityType.MACHINERY,
            CommodityType.FOOD,
            CommodityType.WATER
          );
          break;

        case 'FUEL_DEPOT':
          // Fuel depots specialize in fuel
          commodities.push(
            CommodityType.HYDROGEN_FUEL,
            CommodityType.FUSION_PELLETS,
            CommodityType.ICE,
            CommodityType.FOOD,
            CommodityType.WATER,
            CommodityType.OXYGEN
          );
          break;

        case 'RESEARCH_FACILITY':
          // Research facilities need high-tech goods
          commodities.push(
            CommodityType.RARE_EARTH,
            CommodityType.SILICON,
            CommodityType.ELECTRONICS,
            CommodityType.COMPUTER_SYSTEMS,
            CommodityType.SENSORS,
            CommodityType.MEDICAL_SUPPLIES,
            CommodityType.FOOD,
            CommodityType.WATER
          );
          break;

        default:
          // General stations have common goods
          commodities.push(
            CommodityType.FOOD,
            CommodityType.WATER,
            CommodityType.OXYGEN,
            CommodityType.HYDROGEN_FUEL,
            CommodityType.MEDICAL_SUPPLIES,
            CommodityType.ELECTRONICS,
            CommodityType.MACHINERY,
            CommodityType.TOOLS,
            CommodityType.ENTERTAINMENT
          );
      }

      // Initialize market with commodities
      market.initialize(commodities, 100 * marketSize);

      // Set production/consumption rates based on station type
      this.setMarketProductionRates(market, station.stationType, civilizationLevel);

      // Store market
      this.markets.set(station.id, market);
    }
  }

  /**
   * Set production/consumption rates for a market
   */
  private setMarketProductionRates(
    market: Market,
    stationType: string,
    civilizationLevel: number
  ): void {
    const baseProdRate = 10 * civilizationLevel; // Base production rate

    switch (stationType) {
      case 'MINING_PLATFORM':
        // Produces raw materials
        market.setProductionRate(CommodityType.METALLIC_ORE, baseProdRate * 3, baseProdRate * 0.5);
        market.setProductionRate(CommodityType.ROCKY_ORE, baseProdRate * 2, baseProdRate * 0.3);
        market.setProductionRate(CommodityType.ICE, baseProdRate * 2, baseProdRate * 0.5);
        market.setProductionRate(CommodityType.RARE_EARTH, baseProdRate * 0.5, 0);
        break;

      case 'SHIPYARD':
        // Consumes materials, produces components
        market.setProductionRate(CommodityType.STEEL, baseProdRate * 0.2, baseProdRate * 2);
        market.setProductionRate(CommodityType.TITANIUM, 0, baseProdRate * 1);
        market.setProductionRate(CommodityType.SHIP_COMPONENTS, baseProdRate * 1, baseProdRate * 0.2);
        break;

      case 'FUEL_DEPOT':
        // Produces fuel
        market.setProductionRate(CommodityType.HYDROGEN_FUEL, baseProdRate * 2, baseProdRate * 0.5);
        market.setProductionRate(CommodityType.FUSION_PELLETS, baseProdRate * 0.5, baseProdRate * 0.2);
        break;

      case 'RESEARCH_FACILITY':
        // Consumes high-tech goods
        market.setProductionRate(CommodityType.ELECTRONICS, 0, baseProdRate * 0.5);
        market.setProductionRate(CommodityType.MEDICAL_SUPPLIES, baseProdRate * 0.3, baseProdRate * 0.3);
        break;
    }

    // All stations consume food/water/oxygen
    market.setProductionRate(CommodityType.FOOD, 0, baseProdRate * 0.5);
    market.setProductionRate(CommodityType.WATER, 0, baseProdRate * 0.3);
    market.setProductionRate(CommodityType.OXYGEN, 0, baseProdRate * 0.2);
  }

  /**
   * Generate Points of Interest
   */
  private generatePOIs(civilizationLevel: number): void {
    // Calculate system radius (outermost planet orbit + some buffer)
    let maxOrbit = this.star.physical.radius * 10; // Default minimum
    for (const planet of this.planets) {
      if (planet.orbital && planet.orbital.semiMajorAxis > maxOrbit) {
        maxOrbit = planet.orbital.semiMajorAxis;
      }
    }
    const systemRadius = maxOrbit * 1.5; // Add 50% buffer

    // Get station positions for minimum distance checking
    // Convert from Vector3 interface to Vector3 class
    const stationPositions = this.stations.map(s =>
      new Vector3Class(s.position.x, s.position.y, s.position.z)
    );

    // POI density increases with lower civilization
    // (uninhabited systems have more derelicts/anomalies)
    const baseDensity = 0.5; // POIs per cubic AU
    const densityMultiplier = 1 + (10 - civilizationLevel) * 0.2;
    const density = baseDensity * densityMultiplier;

    // Generate POIs
    this.poiManager.generatePOIs(
      {
        density,
        derelictProbability: 0.5, // 50% derelicts
        anomalyProbability: 0.3, // 30% anomalies
        cacheProbability: 0.2, // 20% caches
        minDistanceFromStations: 100000, // 100 km minimum
        maxDistanceFromStar: systemRadius
      },
      systemRadius,
      stationPositions
    );
  }

  /**
   * Update entire system
   */
  update(deltaTime: number): void {
    // ========================================================================
    // INTEGRATED UNIVERSE UPDATE - Complete living universe simulation
    // ========================================================================

    // If integrated orchestrator is initialized, it handles all NPC/faction AI
    if (this.integratedOrchestrator) {
      this.integratedOrchestrator.update(deltaTime);
    }

    // ========================================================================
    // PHASE 3: 4X SYSTEMS UPDATE
    // ========================================================================

    const currentTime = Date.now() / 1000; // Convert to seconds

    // Update Construction System
    if (this.constructionSystem) {
      this.constructionSystem.update(deltaTime);
    }

    // Update Manufacturing System
    if (this.manufacturingSystem) {
      this.manufacturingSystem.update(deltaTime);
    }

    // Update Population System (every hour)
    if (this.populationSystem && Math.floor(currentTime) % 3600 === 0) {
      // this.populationSystem.update(3600, allCities);
      // Note: Will be connected when city system is integrated
    }

    // Update Conquest System
    if (this.conquestSystem) {
      this.conquestSystem.update(deltaTime);
    }

    // Update Faction AI Systems
    if (this.factionExpansionAIs) {
      this.factionExpansionAIs.forEach((expansionAI, factionName) => {
        expansionAI.update(deltaTime, currentTime);
      });
    }

    if (this.factionResearchAIs) {
      this.factionResearchAIs.forEach((researchAI, factionName) => {
        researchAI.update(deltaTime);
      });
    }

    if (this.factionMilitaryAIs) {
      this.factionMilitaryAIs.forEach((militaryAI, factionName) => {
        militaryAI.update(currentTime, deltaTime);
      });
    }

    // ========================================================================
    // PHYSICS AND ORBITAL MECHANICS
    // ========================================================================

    // Update star
    // Stars don't move much, but might rotate

    // Update planets
    for (const planet of this.planets) {
      planet.updateOrbitalPosition(deltaTime);
    }

    // Update moons
    for (const moon of this.moons) {
      moon.updateOrbitalPosition(deltaTime);
    }

    // Update asteroids (expensive, might want to optimize)
    for (const asteroid of this.asteroids) {
      asteroid.updateOrbitalPosition(deltaTime);
    }

    // Update stations
    for (const station of this.stations) {
      station.updateOrbitalPosition(deltaTime);
    }

    // Update satellites with stellar body
    const stellarBody = {
      position: this.star.position,
      luminosity: this.star.luminosity
    };
    for (const satellite of this.satellites) {
      satellite.update(deltaTime, stellarBody);
    }

    // ========================================================================
    // NPC SHIPS - Only update if NOT using integrated orchestrator
    // (Integrated orchestrator handles NPC updates with universe-aware AI)
    // ========================================================================

    if (!this.integratedOrchestrator) {
      // Fallback: Basic NPC ship updates without universe-aware AI
      const allShips = this.trafficManager.getAllVessels();
      for (const ship of allShips) {
        // Get nearby ships for collision avoidance
        const nearbyShips = this.trafficManager.getVesselsNear(ship.position, 50000) // 50 km radius
          .filter(s => s.id !== ship.id); // Exclude self

        // Update ship with nearby ships for collision avoidance
        ship.update(deltaTime, nearbyShips);
      }
    }

    // Update traffic manager (rebuild spatial grid)
    this.trafficManager.update(deltaTime);

    // ========================================================================
    // OTHER SYSTEMS
    // ========================================================================

    // Update communications network
    this.communicationsManager.update(deltaTime);

    // Update markets
    for (const market of this.markets.values()) {
      market.update(deltaTime);
    }

    // Update Points of Interest
    this.poiManager.update(deltaTime);

    // Update hazards
    this.hazardSystem.update(deltaTime);

    // Update faction diplomacy (process relationship decay, trends, automatic events)
    this.factionDiplomacy.update(deltaTime);

    // Update faction economies (production, consumption, supply chains)
    this.updateFactionEconomies(deltaTime);
  }

  /**
   * Update all faction economies
   */
  private updateFactionEconomies(deltaTime: number): void {
    const factionIds = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'OUTER_COLONIES', 'INDEPENDENT'];

    for (const factionId of factionIds) {
      this.economicNeeds.update(factionId, deltaTime);
    }
  }

  /**
   * Process diplomatic event
   * Call this when significant events occur (combat, trade, rescue, etc.)
   */
  processDiplomaticEvent(event: any): void {
    if (this.factionDiplomacy) {
      const interactions = this.factionDiplomacy.processEvent(event);

      // Log major diplomatic shifts
      if (interactions.length > 0) {
        console.log(`[StarSystem] Processed diplomatic event: ${event.type} - ${interactions.length} interactions generated`);
      }
    }
  }

  /**
   * Get relationship between two factions
   */
  getFactionRelationship(factionA: string, factionB: string): any {
    return this.factionDiplomacy.getRelationship(factionA, factionB);
  }

  /**
   * Disrupt supply chain due to war/piracy/etc
   */
  public disruptSupplyChain(
    commodity: string,
    cause: string,
    duration: number,
    impactPercentage: number
  ): void {
    // Disrupt all supply chains for this commodity
    this.economicNeeds.disruptSupplyChain(commodity, cause, duration, impactPercentage);
  }

  /**
   * Check if economic crisis would trigger war
   */
  public checkEconomicWarTriggers(): void {
    const factionIds = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'OUTER_COLONIES'];

    for (const factionId of factionIds) {
      const economy = this.economicNeeds.getFactionEconomy(factionId);

      // Check each critical resource
      for (const [commodity, need] of economy.criticalResources) {
        if (need.inCrisis) {
          // Check if any other faction has this resource
          for (const targetFaction of factionIds) {
            if (targetFaction === factionId) continue;

            if (this.economicNeeds.wouldGoToWarForResource(factionId, commodity, targetFaction)) {
              console.log(`🚨 ${factionId} considering war with ${targetFaction} over ${commodity}!`);

              // Fire diplomatic event
              this.processDiplomaticEvent({
                type: 'ECONOMIC_CRISIS',
                category: 'ECONOMIC',
                timestamp: Date.now() / 1000,
                severity: 9,
                factionA: factionId,
                factionB: targetFaction,
                commodity: commodity,
                description: `${factionId} in crisis over ${commodity} shortage`
              });
            }
          }
        }
      }
    }
  }

  /**
   * Process trade - update market supply/demand
   */
  public processEconomicTrade(
    buyerFaction: string,
    sellerFaction: string,
    commodity: string,
    volume: number,
    price: number
  ): void {
    // Update faction economies
    const buyerEconomy = this.economicNeeds.getFactionEconomy(buyerFaction);
    const sellerEconomy = this.economicNeeds.getFactionEconomy(sellerFaction);

    // Add to buyer's stock
    const buyerNeed = buyerEconomy.criticalResources.get(commodity);
    if (buyerNeed) {
      buyerNeed.currentStock += volume;
      buyerNeed.imports += volume;
    }

    // Remove from seller's stock
    const sellerSurplus = sellerEconomy.surplusResources.get(commodity) || 0;
    sellerEconomy.surplusResources.set(commodity, Math.max(0, sellerSurplus - volume));

    // Update trade balance
    buyerEconomy.tradeBalance -= price;
    sellerEconomy.tradeBalance += price;

    console.log(`💰 Economic trade: ${buyerFaction} ← ${volume} ${commodity} ← ${sellerFaction} (${price} credits)`);
  }

  /**
   * Get all bodies in system
   */
  getAllBodies(): CelestialBody[] {
    return [
      this.star,
      ...this.planets,
      ...this.moons,
      ...this.asteroids,
      ...this.stations
    ];
  }

  /**
   * Find nearest body to a position
   */
  findNearestBody(position: Vector3, excludeTypes: string[] = []): CelestialBody | null {
    const bodies = this.getAllBodies().filter(b => !excludeTypes.includes(b.type));

    let nearest: CelestialBody | null = null;
    let minDistance = Infinity;

    for (const body of bodies) {
      const dx = position.x - body.position.x;
      const dy = position.y - body.position.y;
      const dz = position.z - body.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = body;
      }
    }

    return nearest;
  }

  /**
   * Find bodies within radius
   */
  findBodiesInRadius(position: Vector3, radius: number): CelestialBody[] {
    return this.getAllBodies().filter(body => {
      const dx = position.x - body.position.x;
      const dy = position.y - body.position.y;
      const dz = position.z - body.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return distance <= radius;
    });
  }

  /**
   * Get habitable planets
   */
  getHabitablePlanets(): Planet[] {
    return this.planets.filter(p => p.isHabitable);
  }

  /**
   * Export system data
   */
  export(): StarSystemData {
    return {
      id: this.id,
      name: this.name,
      star: this.star,
      planets: this.planets,
      moons: this.moons,
      asteroids: this.asteroids,
      stations: this.stations,
      satellites: this.satellites,
      npcShips: this.trafficManager.getAllVessels(),
      pois: this.poiManager.getAllPOIs(),
      hazards: this.hazardSystem.getActiveHazards(),
      position: this.position
    };
  }

  /**
   * Generate planet name
   */
  private generatePlanetName(index: number): string {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return `${this.name} ${romanNumerals[index] || (index + 1)}`;
  }

  // ====================================================================
  // INTEGRATED UNIVERSE SYSTEM - Complete living universe integration
  // ====================================================================

  /**
   * Initialize the integrated universe system
   * This connects all NPCs, factions, and AI systems together
   */
  private initializeIntegratedUniverse(config: StarSystemConfig): void {
    // Dynamically import to avoid circular dependencies
    import('./UniverseOrchestrator').then(({ UniverseOrchestrator }) => {
      import('./integration/UniverseContextProvider').then(({ UniverseContextProvider }) => {
        import('./integration/IntegratedUniverseOrchestrator').then(({ IntegratedUniverseOrchestrator }) => {
          import('./integration/FactionAI').then(({ FactionAI, FactionStrategy }) => {
            import('./entity-ai/ExtendedNPCMemory').then(({ ExtendedNPCMemory }) => {
              // Create base orchestrator
              this.universeOrchestrator = new UniverseOrchestrator({
                enableEntityAI: true,
                enableFactionDynamics: true,
                enableStorytelling: true,
                enableRumors: true,
                enableChronicles: true
              });

              // Create context provider
              this.contextProvider = new UniverseContextProvider(this);

              // Create integrated orchestrator
              this.integratedOrchestrator = new IntegratedUniverseOrchestrator(
                this,
                this.universeOrchestrator,
                {
                  enableDynamicEvents: true,
                  enableFactionAI: true,
                  npcUpdateFrequency: 10, // 10 Hz
                  factionUpdateFrequency: 0.1 // 0.1 Hz
                }
              );

              // Auto-register all existing NPCs with universe-aware AI
              this.registerAllNPCsWithAI(config.civilizationLevel || 5);

              // Auto-register factions from stations
              this.registerFactionsFromStations();

              console.log(`[INTEGRATED UNIVERSE] ${this.name} fully initialized with living universe systems`);
              console.log(`  - NPCs: ${this.trafficManager.getAllVessels().length} ships with universe-aware AI`);
              console.log(`  - Stations: ${this.stations.length} stations`);
              console.log(`  - Hazards: ${this.hazardSystem.getActiveHazards().length} active hazards`);
              console.log(`  - POIs: ${this.poiManager.getAllPOIs().length} points of interest`);
            });
          });
        });
      });
    });
  }

  /**
   * Initialize Phase 3 4X Gameplay Systems
   */
  private initializePhase3Systems(config: StarSystemConfig): void {
    console.log(`[PHASE 3] Initializing 4X Gameplay Systems for ${this.name}...`);

    // ========================================================================
    // CONSTRUCTION SYSTEM
    // ========================================================================
    this.constructionSystem = new ConstructionSystem();

    // ========================================================================
    // MANUFACTURING SYSTEM
    // ========================================================================
    this.manufacturingSystem = new ManufacturingSystem();
    this.productionChainManager = new ProductionChainManager(this.manufacturingSystem);

    // Initialize manufacturing facilities for existing stations
    this.stations.forEach(station => {
      // Determine facility type based on station type
      const facilityType = this.mapStationTypeToFacility(station.stationType);
      if (facilityType) {
        this.manufacturingSystem.createFacility(
          station.id,
          facilityType,
          station.faction
        );
        console.log(`[MANUFACTURING] Created ${facilityType} at ${station.name}`);
      }
    });

    // ========================================================================
    // RESEARCH SYSTEM
    // ========================================================================
    this.researchSystem = new ResearchSystem();

    // ========================================================================
    // POPULATION SYSTEM
    // ========================================================================
    this.populationSystem = new PopulationSystem();

    // ========================================================================
    // CONQUEST SYSTEM
    // ========================================================================
    this.conquestSystem = new ConquestSystem();

    // Register all stations with conquest system
    this.stations.forEach(station => {
      this.conquestSystem.registerTerritory({
        id: station.id,
        name: station.name,
        type: 'STATION',
        owner: station.faction,
        position: station.position,
        defenseRating: station.defenseRating || 5,
        population: station.population || 10000,
        strategicValue: this.calculateStrategicValue(station)
      });
    });

    // ========================================================================
    // FACTION AI SYSTEMS
    // ========================================================================
    // Initialize AI systems for each faction found in stations
    const factions = new Set(this.stations.map(s => s.faction));

    factions.forEach(factionName => {
      // Get faction data
      const factionStations = this.stations.filter(s => s.faction === factionName);
      const factionShips = this.trafficManager.getAllVessels().filter((s: any) => s.faction === factionName);

      // Create a simplified faction object for AI systems
      const faction = {
        name: factionName,
        credits: 100000, // Starting credits
        homeworld: factionStations[0]?.position || this.star.position,
        personality: {
          militaristic: Math.random(),
          expansionist: Math.random(),
          diplomatic: Math.random(),
          economic: Math.random()
        },
        relations: new Map<string, number>(),
        militaryStrength: factionShips.length * 10,
        economicStrength: factionStations.length * 100,
        technologyLevel: 1
      };

      // Initialize Expansion AI
      const expansionAI = new FactionExpansionAI(
        faction as any,
        this,
        this.constructionSystem
      );
      this.factionExpansionAIs.set(factionName, expansionAI);

      // Initialize Research AI
      const researchAI = new FactionResearchAI(
        faction as any,
        this.researchSystem
      );
      this.factionResearchAIs.set(factionName, researchAI);

      // Initialize Military AI
      const militaryAI = new FactionMilitaryAI(
        this.conquestSystem,
        this.factionDiplomacy,
        this.economicNeeds
      );

      // Set faction doctrine based on personality
      let doctrine: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE' | 'EXPANSIONIST' | 'OPPORTUNISTIC' = 'BALANCED';
      if (faction.personality.militaristic > 0.7) doctrine = 'AGGRESSIVE';
      else if (faction.personality.expansionist > 0.7) doctrine = 'EXPANSIONIST';
      else if (faction.personality.militaristic < 0.3) doctrine = 'DEFENSIVE';

      militaryAI.initializeFaction(factionName as any, doctrine);

      // CRITICAL: Link to StarSystem and sync territories
      // This populates the military AI's station/city registries from actual game state
      militaryAI.linkStarSystem(this);

      this.factionMilitaryAIs.set(factionName, militaryAI);

      console.log(`[FACTION AI] Initialized AI systems for ${factionName}: ${factionStations.length} stations, ${factionShips.length} ships`);
    });

    console.log(`[PHASE 3] 4X Systems initialized:`);
    console.log(`  - Construction: Ready`);
    console.log(`  - Manufacturing: ${this.manufacturingSystem.getAllFacilities().length} facilities`);
    console.log(`  - Research: ${this.researchSystem.getAllTechnologies().length} technologies`);
    console.log(`  - Population: Ready`);
    console.log(`  - Conquest: ${this.conquestSystem.getAllTerritories().length} territories`);
    console.log(`  - Faction AIs: ${factions.size} factions with expansion/research/military AI`);
  }

  /**
   * Map station type to manufacturing facility type
   */
  private mapStationTypeToFacility(stationType: string): string | null {
    const mapping: Record<string, string> = {
      'REFINERY': 'REFINERY',
      'MANUFACTURING_CENTER': 'FACTORY',
      'INDUSTRIAL_COMPLEX': 'FACTORY',
      'SHIPYARD': 'SHIPYARD',
      'RESEARCH_FACILITY': 'ELECTRONICS_PLANT',
      'MINING_PLATFORM': 'REFINERY'
    };

    return mapping[stationType] || null;
  }

  /**
   * Calculate strategic value of a station
   */
  private calculateStrategicValue(station: SpaceStation): number {
    let value = 1.0;

    // Economic value
    if (station.stationType === 'TRADING_HUB') value += 2.0;
    if (station.stationType === 'REFINERY') value += 1.5;
    if (station.stationType === 'MANUFACTURING_CENTER') value += 1.5;

    // Military value
    if (station.stationType === 'MILITARY_BASE') value += 3.0;
    if (station.stationType === 'SHIPYARD') value += 2.0;

    // Research value
    if (station.stationType === 'RESEARCH_FACILITY') value += 2.0;

    // Population value
    value += (station.population || 0) / 50000;

    return Math.min(value, 10.0);
  }

  /**
   * Register all NPCs with universe-aware AI
   */
  private registerAllNPCsWithAI(civilizationLevel: number): void {
    if (!this.integratedOrchestrator) return;

    const ships = this.trafficManager.getAllVessels();
    const { ShipType } = require('./npc-traffic/npc-ship');

    for (const ship of ships) {
      // Generate personality based on ship type
      const personality = this.generatePersonalityForShipType(ship.type);

      // Determine faction from station ownership
      let factionId: string | undefined;
      if (ship.originName) {
        const originStation = this.stations.find(s => s.name === ship.originName);
        if (originStation) {
          factionId = originStation.owningFaction;
        }
      }

      // Register with integrated system
      this.integratedOrchestrator.registerIntegratedNPC(ship, personality, factionId);
    }
  }

  /**
   * Register factions from stations
   */
  private registerFactionsFromStations(): void {
    if (!this.integratedOrchestrator) return;

    const { FactionStrategy } = require('./integration/FactionAI');

    // Group stations by faction
    const factionStations = new Map<string, typeof this.stations>();

    for (const station of this.stations) {
      if (station.owningFaction) {
        if (!factionStations.has(station.owningFaction)) {
          factionStations.set(station.owningFaction, []);
        }
        factionStations.get(station.owningFaction)!.push(station);
      }
    }

    // Register each faction
    for (const [factionId, stations] of factionStations) {
      // Determine strategy from faction name/type
      const strategy = this.determineFactionStrategy(factionId);

      // Create territories from station locations
      const territories = stations.map((station, i) => ({
        id: `${factionId}-territory-${i}`,
        center: station.position,
        radius: 100000, // 100km radius
        controlLevel: 0.8,
        population: station.population || 10000,
        economicValue: 500,
        militaryPresence: 2,
        strategicValue: 0.7,
        threats: []
      }));

      // Register faction
      this.integratedOrchestrator.registerFaction(factionId, strategy, territories);
    }
  }

  /**
   * Generate personality traits for ship type
   */
  private generatePersonalityForShipType(shipType: any): any {
    const { ShipType } = require('./npc-traffic/npc-ship');

    // Base personality
    const base = {
      aggression: 0.3,
      greed: 0.5,
      caution: 0.5,
      curiosity: 0.5,
      loyalty: 0.5,
      trustingness: 0.5,
      adaptability: 0.5,
      patience: 0.5
    };

    // Modify based on ship type
    switch (shipType) {
      case ShipType.CARGO_FREIGHTER:
        return { ...base, caution: 0.7, greed: 0.7, patience: 0.7 };

      case ShipType.MINING_VESSEL:
        return { ...base, greed: 0.9, patience: 0.9, caution: 0.8 };

      case ShipType.PATROL_SHIP:
        return { ...base, aggression: 0.6, loyalty: 0.9, caution: 0.6 };

      case ShipType.RESEARCH:
        return { ...base, curiosity: 0.9, patience: 0.8, caution: 0.5 };

      case ShipType.PIRATE:
        return { ...base, aggression: 0.9, greed: 0.9, caution: 0.3, trustingness: 0.2 };

      case ShipType.PASSENGER_LINER:
        return { ...base, caution: 0.9, patience: 0.8, loyalty: 0.7 };

      default:
        return base;
    }
  }

  /**
   * Determine faction strategy from faction ID
   */
  private determineFactionStrategy(factionId: string): any {
    const { FactionStrategy } = require('./integration/FactionAI');

    const id = factionId.toLowerCase();

    if (id.includes('mining') || id.includes('guild')) {
      return FactionStrategy.ECONOMIC;
    } else if (id.includes('military') || id.includes('defense')) {
      return FactionStrategy.MILITARISTIC;
    } else if (id.includes('trade') || id.includes('merchant')) {
      return FactionStrategy.ECONOMIC;
    } else if (id.includes('federation') || id.includes('alliance')) {
      return FactionStrategy.DIPLOMATIC;
    } else if (id.includes('pirate') || id.includes('raider')) {
      return FactionStrategy.MILITARISTIC;
    } else if (id.includes('research') || id.includes('science')) {
      return FactionStrategy.SCIENTIFIC;
    } else if (id.includes('colonial') || id.includes('frontier')) {
      return FactionStrategy.EXPANSIONIST;
    }

    return FactionStrategy.OPPORTUNISTIC;
  }
}

/**
 * Quick system generator function
 */
export function generateStarSystem(
  name: string,
  config: StarSystemConfig = {}
): StarSystem {
  const id = `system-${name.toLowerCase().replace(/\s+/g, '-')}`;
  return new StarSystem(id, name, config);
}
