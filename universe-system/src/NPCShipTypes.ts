/**
 * NPCShipTypes.ts
 * Detailed specifications for all NPC ship classes in the game
 *
 * Ship classes range from tiny shuttles to massive capital ships
 * Each has unique characteristics, roles, and visual designs
 */

import { ShipStats } from './NPCShipAI';

export enum ShipClass {
  // Civilian vessels
  SHUTTLE = 'SHUTTLE',                    // Small personnel transport
  CARGO_HAULER = 'CARGO_HAULER',          // Freight transport
  BULK_FREIGHTER = 'BULK_FREIGHTER',      // Massive cargo vessel
  PASSENGER_LINER = 'PASSENGER_LINER',    // Luxury transport
  MINING_BARGE = 'MINING_BARGE',          // Heavy mining ship
  PROSPECTOR = 'PROSPECTOR',              // Light mining vessel
  SCIENCE_VESSEL = 'SCIENCE_VESSEL',      // Research ship

  // Combat vessels
  INTERCEPTOR = 'INTERCEPTOR',            // Fast attack craft
  FIGHTER = 'FIGHTER',                    // Standard combat ship
  CORVETTE = 'CORVETTE',                  // Light warship
  FRIGATE = 'FRIGATE',                    // Medium warship
  DESTROYER = 'DESTROYER',                // Heavy warship
  CRUISER = 'CRUISER',                    // Capital warship
  BATTLESHIP = 'BATTLESHIP',              // Super-heavy capital
  CARRIER = 'CARRIER',                    // Fighter carrier

  // Specialized vessels
  COURIER = 'COURIER',                    // Fast delivery
  SALVAGE_SHIP = 'SALVAGE_SHIP',          // Wreck recovery
  TANKER = 'TANKER',                      // Fuel/liquid transport
  COLONY_SHIP = 'COLONY_SHIP',            // Settlement vessel
  PIRATE_RAIDER = 'PIRATE_RAIDER',        // Pirate combat ship
  SMUGGLER = 'SMUGGLER',                  // Illicit cargo runner
  PATROL_CUTTER = 'PATROL_CUTTER',        // Law enforcement
  SURVEY_SHIP = 'SURVEY_SHIP',            // Exploration vessel
}

export interface ShipSpecification {
  class: ShipClass;
  name: string;
  description: string;
  role: string;

  // Physical characteristics
  length: number;           // meters
  mass: number;            // kg
  crew: { min: number; max: number; optimal: number };

  // Performance stats
  stats: ShipStats;

  // Economic
  baseCost: number;        // credits
  operatingCost: number;   // credits per day

  // Visual design
  visual: {
    primaryColor: string;
    secondaryColor: string;
    shape: string;         // Description for procedural generation
    engineGlow: string;
    lights: string[];
  };

  // Lore
  manufacturer?: string;
  commonOwners: string[];  // Factions/organizations
  notes: string;
}

/**
 * Complete ship specifications database
 */
export const SHIP_SPECS: Record<ShipClass, ShipSpecification> = {

  // ==================== CIVILIAN VESSELS ====================

  [ShipClass.SHUTTLE]: {
    class: ShipClass.SHUTTLE,
    name: 'Type-4 Personnel Shuttle',
    description: 'Ubiquitous short-range personnel transport found throughout civilized space',
    role: 'Personnel transport, station-to-ship transfers, short system hops',
    length: 15,
    mass: 8000,
    crew: { min: 1, max: 2, optimal: 1 },
    stats: {
      maxSpeed: 150,
      acceleration: 25,
      turnRate: 1.5,
      cargoCapacity: 20,
      fuelCapacity: 500,
      hullStrength: 40,
      shieldStrength: 20,
      weaponPower: 0,
      sensorRange: 50000
    },
    baseCost: 25000,
    operatingCost: 50,
    visual: {
      primaryColor: '#c0c0c0',
      secondaryColor: '#505050',
      shape: 'Boxy with rear engines, cockpit bubble',
      engineGlow: '#4080ff',
      lights: ['#ffffff', '#ff0000', '#00ff00']
    },
    manufacturer: 'Consolidated Spaceworks',
    commonOwners: ['All factions', 'Independent', 'Corporate'],
    notes: 'The workhorse of space travel. Cheap, reliable, everywhere.'
  },

  [ShipClass.CARGO_HAULER]: {
    class: ShipClass.CARGO_HAULER,
    name: 'Mammoth-class Cargo Hauler',
    description: 'Standard interstellar freight vessel, the backbone of interplanetary commerce',
    role: 'Medium-range cargo transport, trading, supply runs',
    length: 85,
    mass: 450000,
    crew: { min: 3, max: 12, optimal: 6 },
    stats: {
      maxSpeed: 120,
      acceleration: 15,
      turnRate: 0.4,
      cargoCapacity: 5000,
      fuelCapacity: 12000,
      hullStrength: 150,
      shieldStrength: 60,
      weaponPower: 15,
      sensorRange: 150000
    },
    baseCost: 850000,
    operatingCost: 800,
    visual: {
      primaryColor: '#8b7355',
      secondaryColor: '#d4a373',
      shape: 'Cylindrical cargo pods with engineering section',
      engineGlow: '#ff8040',
      lights: ['#ffaa00', '#00ff00']
    },
    manufacturer: 'Stellar Dynamics',
    commonOwners: ['Independent traders', 'Corporate', 'Belt Alliance'],
    notes: 'Modular cargo pods can be swapped at stations for quick turnaround'
  },

  [ShipClass.BULK_FREIGHTER]: {
    class: ShipClass.BULK_FREIGHTER,
    name: 'Leviathan Super-Freighter',
    description: 'Massive bulk cargo hauler for raw materials and bulk goods',
    role: 'Long-haul bulk transport, ore hauling, mass cargo delivery',
    length: 380,
    mass: 8500000,
    crew: { min: 12, max: 50, optimal: 25 },
    stats: {
      maxSpeed: 60,
      acceleration: 5,
      turnRate: 0.1,
      cargoCapacity: 50000,
      fuelCapacity: 80000,
      hullStrength: 400,
      shieldStrength: 100,
      weaponPower: 30,
      sensorRange: 200000
    },
    baseCost: 12000000,
    operatingCost: 5000,
    visual: {
      primaryColor: '#404040',
      secondaryColor: '#808080',
      shape: 'Massive rectangular cargo holds, tiny drive section',
      engineGlow: '#ff4000',
      lights: ['#ff0000', '#ffffff']
    },
    manufacturer: 'Titan Heavy Industries',
    commonOwners: ['Corporations', 'Mining companies', 'Belt Alliance'],
    notes: 'So large they rarely enter atmosphere. Requires tugboats for docking'
  },

  [ShipClass.PASSENGER_LINER]: {
    class: ShipClass.PASSENGER_LINER,
    name: 'Starliner Excelsior-class',
    description: 'Luxury passenger vessel offering comfort on long interstellar journeys',
    role: 'Passenger transport, tourism, VIP transit',
    length: 210,
    mass: 2200000,
    crew: { min: 20, max: 100, optimal: 60 },
    stats: {
      maxSpeed: 180,
      acceleration: 20,
      turnRate: 0.3,
      cargoCapacity: 800,
      fuelCapacity: 25000,
      hullStrength: 200,
      shieldStrength: 150,
      weaponPower: 20,
      sensorRange: 180000
    },
    baseCost: 15000000,
    operatingCost: 8000,
    visual: {
      primaryColor: '#ffffff',
      secondaryColor: '#4169e1',
      shape: 'Sleek hull with observation decks and rotating habitat rings',
      engineGlow: '#80c0ff',
      lights: ['#ffffff', '#ffd700', '#00ffff']
    },
    manufacturer: 'Celestial Cruise Lines',
    commonOwners: ['Corporate', 'United Earth', 'Independent luxury operators'],
    notes: 'Features artificial gravity via rotation. Some have casinos and zero-g sports'
  },

  [ShipClass.MINING_BARGE]: {
    class: ShipClass.MINING_BARGE,
    name: 'Rockbreaker Heavy Mining Barge',
    description: 'Industrial asteroid mining platform with massive processing capacity',
    role: 'Asteroid mining, ore processing, resource extraction',
    length: 145,
    mass: 1800000,
    crew: { min: 15, max: 80, optimal: 40 },
    stats: {
      maxSpeed: 40,
      acceleration: 8,
      turnRate: 0.2,
      cargoCapacity: 15000,
      fuelCapacity: 30000,
      hullStrength: 300,
      shieldStrength: 80,
      weaponPower: 25,
      sensorRange: 100000
    },
    baseCost: 6000000,
    operatingCost: 3000,
    visual: {
      primaryColor: '#8b7355',
      secondaryColor: '#ff4500',
      shape: 'Industrial framework with massive ore processors and drilling arms',
      engineGlow: '#ff6000',
      lights: ['#ffaa00', '#ff0000']
    },
    manufacturer: 'Belt Mining Consortium',
    commonOwners: ['Belt Alliance', 'Corporate mining ops', 'Independent prospectors'],
    notes: 'Equipped with plasma drills and magnetic scoops. Can anchor to asteroids'
  },

  [ShipClass.PROSPECTOR]: {
    class: ShipClass.PROSPECTOR,
    name: 'Scout-class Prospector',
    description: 'Light mining ship for independent operators and small-scale operations',
    role: 'Prospecting, light mining, claim staking',
    length: 35,
    mass: 65000,
    crew: { min: 1, max: 4, optimal: 2 },
    stats: {
      maxSpeed: 90,
      acceleration: 12,
      turnRate: 0.7,
      cargoCapacity: 400,
      fuelCapacity: 3000,
      hullStrength: 80,
      shieldStrength: 40,
      weaponPower: 10,
      sensorRange: 120000
    },
    baseCost: 380000,
    operatingCost: 200,
    visual: {
      primaryColor: '#b8860b',
      secondaryColor: '#708090',
      shape: 'Compact with mining arms and ore storage pods',
      engineGlow: '#ffa500',
      lights: ['#ffffff', '#ffd700']
    },
    manufacturer: 'Frontier Mining Solutions',
    commonOwners: ['Independent', 'Belt Alliance', 'Small operations'],
    notes: 'The dream of every belter - own your own prospector, strike it rich'
  },

  [ShipClass.SCIENCE_VESSEL]: {
    class: ShipClass.SCIENCE_VESSEL,
    name: 'Research Vessel Discovery-class',
    description: 'Advanced research platform with cutting-edge sensor arrays and laboratories',
    role: 'Scientific research, anomaly investigation, deep space exploration',
    length: 95,
    mass: 420000,
    crew: { min: 10, max: 60, optimal: 30 },
    stats: {
      maxSpeed: 140,
      acceleration: 18,
      turnRate: 0.5,
      cargoCapacity: 600,
      fuelCapacity: 15000,
      hullStrength: 120,
      shieldStrength: 100,
      weaponPower: 15,
      sensorRange: 500000
    },
    baseCost: 8500000,
    operatingCost: 4000,
    visual: {
      primaryColor: '#e0e0e0',
      secondaryColor: '#4682b4',
      shape: 'Sensor dishes, telescope arrays, modular lab sections',
      engineGlow: '#00bfff',
      lights: ['#ffffff', '#00ffff', '#4169e1']
    },
    manufacturer: 'United Earth Science Foundation',
    commonOwners: ['United Earth', 'Research institutions', 'Independent'],
    notes: 'Equipped with quantum sensors, spectroscopes, and AI-assisted analysis'
  },

  // ==================== COMBAT VESSELS ====================

  [ShipClass.INTERCEPTOR]: {
    class: ShipClass.INTERCEPTOR,
    name: 'Raptor Mk-IV Interceptor',
    description: 'Ultra-fast attack craft designed for hit-and-run tactics and pursuit',
    role: 'Fast attack, interception, pursuit, recon',
    length: 12,
    mass: 5500,
    crew: { min: 1, max: 1, optimal: 1 },
    stats: {
      maxSpeed: 500,
      acceleration: 80,
      turnRate: 3.0,
      cargoCapacity: 10,
      fuelCapacity: 800,
      hullStrength: 50,
      shieldStrength: 40,
      weaponPower: 60,
      sensorRange: 180000
    },
    baseCost: 620000,
    operatingCost: 400,
    visual: {
      primaryColor: '#2c3e50',
      secondaryColor: '#e74c3c',
      shape: 'Arrow-shaped, minimal profile, oversized engines',
      engineGlow: '#ff0040',
      lights: ['#ff0000', '#00ffff']
    },
    manufacturer: 'Velocity Arms',
    commonOwners: ['Military factions', 'Pirates', 'Bounty hunters'],
    notes: 'Glass cannon - devastating firepower but paper-thin armor. Speed is life'
  },

  [ShipClass.FIGHTER]: {
    class: ShipClass.FIGHTER,
    name: 'Gladius-class Space Superiority Fighter',
    description: 'Balanced combat craft, the standard military fighter across human space',
    role: 'Space superiority, patrol, escort, combat ops',
    length: 18,
    mass: 12000,
    crew: { min: 1, max: 2, optimal: 1 },
    stats: {
      maxSpeed: 350,
      acceleration: 55,
      turnRate: 2.2,
      cargoCapacity: 30,
      fuelCapacity: 1500,
      hullStrength: 85,
      shieldStrength: 70,
      weaponPower: 75,
      sensorRange: 200000
    },
    baseCost: 980000,
    operatingCost: 650,
    visual: {
      primaryColor: '#34495e',
      secondaryColor: '#95a5a6',
      shape: 'Delta wing configuration, twin engines, weapon hardpoints',
      engineGlow: '#4080ff',
      lights: ['#ff0000', '#00ff00', '#ffffff']
    },
    manufacturer: 'Aegis Aerospace',
    commonOwners: ['All military factions', 'Mercenaries', 'Well-funded pirates'],
    notes: 'Modular weapon mounts allow for various loadouts. Carrier-capable'
  },

  [ShipClass.CORVETTE]: {
    class: ShipClass.CORVETTE,
    name: 'Tempest-class Corvette',
    description: 'Fast attack warship, smallest vessel classified as a "capital ship"',
    role: 'Patrol, anti-piracy, fast response, system defense',
    length: 65,
    mass: 180000,
    crew: { min: 8, max: 25, optimal: 15 },
    stats: {
      maxSpeed: 220,
      acceleration: 35,
      turnRate: 0.9,
      cargoCapacity: 200,
      fuelCapacity: 6000,
      hullStrength: 180,
      shieldStrength: 140,
      weaponPower: 120,
      sensorRange: 300000
    },
    baseCost: 3800000,
    operatingCost: 1800,
    visual: {
      primaryColor: '#2c3e50',
      secondaryColor: '#3498db',
      shape: 'Sleek predator profile, forward-swept weapons, compact bridge',
      engineGlow: '#00bfff',
      lights: ['#ffffff', '#ff0000', '#00ff00']
    },
    manufacturer: 'United Earth Naval Yards',
    commonOwners: ['United Earth', 'Mars Federation', 'Patrol fleets'],
    notes: 'Often first on scene. Fast enough to chase, tough enough to fight'
  },

  [ShipClass.FRIGATE]: {
    class: ShipClass.FRIGATE,
    name: 'Sentinel-class Frigate',
    description: 'Multi-role medium warship, workhorse of most navies',
    role: 'Escort, patrol, combat operations, fleet support',
    length: 120,
    mass: 850000,
    crew: { min: 35, max: 120, optimal: 75 },
    stats: {
      maxSpeed: 160,
      acceleration: 22,
      turnRate: 0.5,
      cargoCapacity: 600,
      fuelCapacity: 18000,
      hullStrength: 320,
      shieldStrength: 250,
      weaponPower: 200,
      sensorRange: 400000
    },
    baseCost: 12000000,
    operatingCost: 6000,
    visual: {
      primaryColor: '#34495e',
      secondaryColor: '#7f8c8d',
      shape: 'Hammerhead bridge, spine-mounted railguns, layered armor plating',
      engineGlow: '#4080ff',
      lights: ['#ffffff', '#ff8800', '#0080ff']
    },
    manufacturer: 'Mars Shipbuilding Corporation',
    commonOwners: ['Mars Federation', 'United Earth', 'Outer Colonies'],
    notes: 'Versatile and reliable. Can operate independently for months'
  },

  [ShipClass.DESTROYER]: {
    class: ShipClass.DESTROYER,
    name: 'Thunderbolt-class Destroyer',
    description: 'Heavy warship optimized for ship-to-ship combat and fire support',
    role: 'Fleet combat, fire support, capital ship hunting',
    length: 185,
    mass: 2400000,
    crew: { min: 80, max: 250, optimal: 150 },
    stats: {
      maxSpeed: 130,
      acceleration: 16,
      turnRate: 0.3,
      cargoCapacity: 1000,
      fuelCapacity: 35000,
      hullStrength: 480,
      shieldStrength: 380,
      weaponPower: 350,
      sensorRange: 500000
    },
    baseCost: 35000000,
    operatingCost: 15000,
    visual: {
      primaryColor: '#1c1c1c',
      secondaryColor: '#ff4500',
      shape: 'Aggressive angular design, heavy weapons, armored prow',
      engineGlow: '#ff4000',
      lights: ['#ff0000', '#ffffff', '#ff8800']
    },
    manufacturer: 'Titan Naval Systems',
    commonOwners: ['Major military powers', 'Mars Federation'],
    notes: 'Bristling with weapons. Can reduce a space station to debris'
  },

  [ShipClass.CRUISER]: {
    class: ShipClass.CRUISER,
    name: 'Sovereign-class Heavy Cruiser',
    description: 'Powerful capital warship, backbone of major fleet operations',
    role: 'Fleet command, major combat operations, power projection',
    length: 320,
    mass: 6800000,
    crew: { min: 250, max: 800, optimal: 500 },
    stats: {
      maxSpeed: 95,
      acceleration: 10,
      turnRate: 0.15,
      cargoCapacity: 2500,
      fuelCapacity: 80000,
      hullStrength: 720,
      shieldStrength: 600,
      weaponPower: 550,
      sensorRange: 800000
    },
    baseCost: 180000000,
    operatingCost: 50000,
    visual: {
      primaryColor: '#0f0f0f',
      secondaryColor: '#4169e1',
      shape: 'Massive layered hull, command tower, multiple weapon batteries',
      engineGlow: '#0080ff',
      lights: ['#ffffff', '#4169e1', '#ff0000']
    },
    manufacturer: 'United Earth Fleet Command',
    commonOwners: ['United Earth', 'Mars Federation', 'Major powers only'],
    notes: 'Centerpiece of fleet operations. Can coordinate entire battle groups'
  },

  [ShipClass.BATTLESHIP]: {
    class: ShipClass.BATTLESHIP,
    name: 'Dreadnought-class Battleship',
    description: 'Super-heavy capital ship, the ultimate expression of naval power',
    role: 'Fleet flagship, planetary assault, deterrent weapon',
    length: 580,
    mass: 18000000,
    crew: { min: 800, max: 2500, optimal: 1500 },
    stats: {
      maxSpeed: 65,
      acceleration: 6,
      turnRate: 0.08,
      cargoCapacity: 5000,
      fuelCapacity: 200000,
      hullStrength: 1200,
      shieldStrength: 1000,
      weaponPower: 900,
      sensorRange: 1000000
    },
    baseCost: 800000000,
    operatingCost: 200000,
    visual: {
      primaryColor: '#000000',
      secondaryColor: '#8b0000',
      shape: 'Fortress-like, massive weapon arrays, layered armor, command citadel',
      engineGlow: '#ff0000',
      lights: ['#ff0000', '#ffffff', '#ffd700']
    },
    manufacturer: 'Strategic Weapons Division',
    commonOwners: ['United Earth only', 'Extremely rare'],
    notes: 'City-killers. Only 7 exist. Seeing one is career-defining'
  },

  [ShipClass.CARRIER]: {
    class: ShipClass.CARRIER,
    name: 'Valkyrie-class Fleet Carrier',
    description: 'Massive carrier deploying squadrons of fighters and support craft',
    role: 'Fighter deployment, fleet support, mobile base',
    length: 650,
    mass: 22000000,
    crew: { min: 1000, max: 4000, optimal: 2500 },
    stats: {
      maxSpeed: 50,
      acceleration: 4,
      turnRate: 0.05,
      cargoCapacity: 12000,
      fuelCapacity: 300000,
      hullStrength: 900,
      shieldStrength: 850,
      weaponPower: 400,
      sensorRange: 1200000
    },
    baseCost: 950000000,
    operatingCost: 250000,
    visual: {
      primaryColor: '#2f4f4f',
      secondaryColor: '#b8860b',
      shape: 'Elongated with flight decks, hangar bays, launch catapults',
      engineGlow: '#4080ff',
      lights: ['#00ff00', '#ff0000', '#ffffff', '#ffff00']
    },
    manufacturer: 'Olympus Fleet Systems',
    commonOwners: ['United Earth', 'Mars Federation'],
    notes: 'Can carry 200+ fighters. Mobile city with gardens, schools, shops'
  },

  // ==================== SPECIALIZED VESSELS ====================

  [ShipClass.COURIER]: {
    class: ShipClass.COURIER,
    name: 'Mercury Fast Courier',
    description: 'Ultra-fast delivery vessel prioritizing speed over everything',
    role: 'Express delivery, VIP transport, urgent communications',
    length: 22,
    mass: 18000,
    crew: { min: 1, max: 3, optimal: 2 },
    stats: {
      maxSpeed: 450,
      acceleration: 70,
      turnRate: 2.5,
      cargoCapacity: 80,
      fuelCapacity: 2500,
      hullStrength: 60,
      shieldStrength: 50,
      weaponPower: 15,
      sensorRange: 150000
    },
    baseCost: 780000,
    operatingCost: 600,
    visual: {
      primaryColor: '#ff6347',
      secondaryColor: '#ffd700',
      shape: 'Needle-like, streamlined, oversized engines, minimal everything else',
      engineGlow: '#ffff00',
      lights: ['#ffff00', '#ff6347']
    },
    manufacturer: 'Swift Systems',
    commonOwners: ['Corporate courier services', 'Independent', 'Smugglers'],
    notes: 'When it absolutely, positively has to be there tomorrow. Or else.'
  },

  [ShipClass.SALVAGE_SHIP]: {
    class: ShipClass.SALVAGE_SHIP,
    name: 'Reclaimer-class Salvage Vessel',
    description: 'Industrial salvage ship for recovering wrecks and abandoned hardware',
    role: 'Salvage operations, wreck recovery, debris cleanup',
    length: 110,
    mass: 680000,
    crew: { min: 10, max: 40, optimal: 20 },
    stats: {
      maxSpeed: 70,
      acceleration: 10,
      turnRate: 0.3,
      cargoCapacity: 8000,
      fuelCapacity: 20000,
      hullStrength: 250,
      shieldStrength: 90,
      weaponPower: 20,
      sensorRange: 220000
    },
    baseCost: 4200000,
    operatingCost: 2000,
    visual: {
      primaryColor: '#ff8c00',
      secondaryColor: '#2f4f4f',
      shape: 'Industrial framework, cutting arms, magnetic grapples, storage bays',
      engineGlow: '#ffa500',
      lights: ['#ff8c00', '#ffffff', '#00ff00']
    },
    manufacturer: 'Frontier Salvage Industries',
    commonOwners: ['Independent salvagers', 'Corporate cleanup crews'],
    notes: 'Vultures of space. Where there\'s wreckage, there\'s profit'
  },

  [ShipClass.TANKER]: {
    class: ShipClass.TANKER,
    name: 'Prometheus-class Fuel Tanker',
    description: 'Specialized vessel for transporting volatile fuels and liquids',
    role: 'Fuel transport, refueling operations, depot supply',
    length: 200,
    mass: 3200000,
    crew: { min: 15, max: 45, optimal: 25 },
    stats: {
      maxSpeed: 80,
      acceleration: 8,
      turnRate: 0.2,
      cargoCapacity: 25000,
      fuelCapacity: 100000,
      hullStrength: 300,
      shieldStrength: 120,
      weaponPower: 25,
      sensorRange: 180000
    },
    baseCost: 8500000,
    operatingCost: 3500,
    visual: {
      primaryColor: '#ff4500',
      secondaryColor: '#ffd700',
      shape: 'Spherical tanks connected by framework, warning stripes',
      engineGlow: '#ff8800',
      lights: ['#ff0000', '#ffff00', '#ffffff']
    },
    manufacturer: 'Titan Energy Solutions',
    commonOwners: ['Fuel depot operators', 'Corporate', 'Independent'],
    notes: 'Heavily shielded fuel tanks. Explosion hazard - keep distance!'
  },

  [ShipClass.COLONY_SHIP]: {
    class: ShipClass.COLONY_SHIP,
    name: 'Ark-class Colony Transport',
    description: 'Massive vessel designed to establish new settlements on distant worlds',
    role: 'Colony establishment, long-duration transit, settlement transport',
    length: 420,
    mass: 12000000,
    crew: { min: 200, max: 5000, optimal: 1000 },
    stats: {
      maxSpeed: 55,
      acceleration: 5,
      turnRate: 0.08,
      cargoCapacity: 30000,
      fuelCapacity: 180000,
      hullStrength: 600,
      shieldStrength: 300,
      weaponPower: 50,
      sensorRange: 250000
    },
    baseCost: 280000000,
    operatingCost: 80000,
    visual: {
      primaryColor: '#4682b4',
      secondaryColor: '#ffffff',
      shape: 'Multiple hab-rings, agricultural sections, storage pods, prefab buildings',
      engineGlow: '#87ceeb',
      lights: ['#00ff00', '#ffffff', '#4169e1']
    },
    manufacturer: 'Outer Colonies Development Corp',
    commonOwners: ['Outer Colonies', 'Colony ventures', 'Corporate'],
    notes: 'Carries everything needed to start a new world. Hope on a grand scale'
  },

  [ShipClass.PIRATE_RAIDER]: {
    class: ShipClass.PIRATE_RAIDER,
    name: 'Reaver-class Raider',
    description: 'Modified combat vessel optimized for ambush and boarding actions',
    role: 'Piracy, raiding, smuggling, illicit combat',
    length: 55,
    mass: 95000,
    crew: { min: 8, max: 30, optimal: 15 },
    stats: {
      maxSpeed: 280,
      acceleration: 45,
      turnRate: 1.3,
      cargoCapacity: 600,
      fuelCapacity: 5000,
      hullStrength: 140,
      shieldStrength: 110,
      weaponPower: 140,
      sensorRange: 200000
    },
    baseCost: 2400000,
    operatingCost: 1200,
    visual: {
      primaryColor: '#8b0000',
      secondaryColor: '#000000',
      shape: 'Predatory, asymmetric, mismatched parts, boarding claws',
      engineGlow: '#ff0000',
      lights: ['#ff0000', '#8b0000', '#ff4500']
    },
    manufacturer: 'Unlicensed modifications',
    commonOwners: ['Pirates', 'Criminals', 'Outlaws'],
    notes: 'Cobbled together from stolen parts. No two are alike. Deadly nonetheless'
  },

  [ShipClass.SMUGGLER]: {
    class: ShipClass.SMUGGLER,
    name: 'Shadow Runner',
    description: 'Fast blockade runner with hidden cargo bays and sensor jammers',
    role: 'Smuggling, blockade running, illicit transport',
    length: 45,
    mass: 75000,
    crew: { min: 2, max: 8, optimal: 4 },
    stats: {
      maxSpeed: 320,
      acceleration: 50,
      turnRate: 1.8,
      cargoCapacity: 800,
      fuelCapacity: 8000,
      hullStrength: 90,
      shieldStrength: 80,
      weaponPower: 45,
      sensorRange: 180000
    },
    baseCost: 1800000,
    operatingCost: 900,
    visual: {
      primaryColor: '#2f4f4f',
      secondaryColor: '#696969',
      shape: 'Low profile, sensor-absorbent hull, concealed compartments',
      engineGlow: '#404040',
      lights: ['#404040', '#696969']
    },
    manufacturer: 'Various unlicensed yards',
    commonOwners: ['Smugglers', 'Pirates', 'Gray market traders'],
    notes: 'Equipped with false transponders and smuggling compartments. "What cargo?"'
  },

  [ShipClass.PATROL_CUTTER]: {
    class: ShipClass.PATROL_CUTTER,
    name: 'Enforcer-class Patrol Cutter',
    description: 'Law enforcement vessel for customs and security operations',
    role: 'Law enforcement, customs, anti-smuggling, rescue',
    length: 48,
    mass: 85000,
    crew: { min: 6, max: 20, optimal: 12 },
    stats: {
      maxSpeed: 240,
      acceleration: 38,
      turnRate: 1.1,
      cargoCapacity: 150,
      fuelCapacity: 6000,
      hullStrength: 160,
      shieldStrength: 130,
      weaponPower: 90,
      sensorRange: 280000
    },
    baseCost: 3200000,
    operatingCost: 1500,
    visual: {
      primaryColor: '#ffffff',
      secondaryColor: '#4169e1',
      shape: 'Clean lines, prominent sensor arrays, police markings, spotlight',
      engineGlow: '#4080ff',
      lights: ['#0000ff', '#ff0000', '#ffffff']
    },
    manufacturer: 'Law Enforcement Systems',
    commonOwners: ['United Earth', 'Mars Federation', 'Station security'],
    notes: 'Fast enough to chase, tough enough to board. "This is Customs. Heave to."'
  },

  [ShipClass.SURVEY_SHIP]: {
    class: ShipClass.SURVEY_SHIP,
    name: 'Pathfinder-class Survey Vessel',
    description: 'Long-range exploration ship for charting unknown systems',
    role: 'Exploration, survey, first contact, anomaly investigation',
    length: 125,
    mass: 580000,
    crew: { min: 20, max: 80, optimal: 45 },
    stats: {
      maxSpeed: 110,
      acceleration: 14,
      turnRate: 0.4,
      cargoCapacity: 1200,
      fuelCapacity: 45000,
      hullStrength: 180,
      shieldStrength: 150,
      weaponPower: 30,
      sensorRange: 800000
    },
    baseCost: 14000000,
    operatingCost: 6000,
    visual: {
      primaryColor: '#4682b4',
      secondaryColor: '#f0e68c',
      shape: 'Explorer profile, extended sensor booms, mapping arrays, lab modules',
      engineGlow: '#00bfff',
      lights: ['#00ffff', '#ffffff', '#ffd700']
    },
    manufacturer: 'Frontier Exploration Company',
    commonOwners: ['Explorers', 'Survey companies', 'United Earth'],
    notes: 'Built for the long haul. Months alone mapping uncharted space'
  }
};

/**
 * Get ship specification by class
 */
export function getShipSpec(shipClass: ShipClass): ShipSpecification {
  return SHIP_SPECS[shipClass];
}

/**
 * Get all civilian ship classes
 */
export function getCivilianShips(): ShipClass[] {
  return [
    ShipClass.SHUTTLE,
    ShipClass.CARGO_HAULER,
    ShipClass.BULK_FREIGHTER,
    ShipClass.PASSENGER_LINER,
    ShipClass.MINING_BARGE,
    ShipClass.PROSPECTOR,
    ShipClass.SCIENCE_VESSEL
  ];
}

/**
 * Get all combat ship classes
 */
export function getCombatShips(): ShipClass[] {
  return [
    ShipClass.INTERCEPTOR,
    ShipClass.FIGHTER,
    ShipClass.CORVETTE,
    ShipClass.FRIGATE,
    ShipClass.DESTROYER,
    ShipClass.CRUISER,
    ShipClass.BATTLESHIP,
    ShipClass.CARRIER
  ];
}

/**
 * Get all specialized ship classes
 */
export function getSpecializedShips(): ShipClass[] {
  return [
    ShipClass.COURIER,
    ShipClass.SALVAGE_SHIP,
    ShipClass.TANKER,
    ShipClass.COLONY_SHIP,
    ShipClass.PIRATE_RAIDER,
    ShipClass.SMUGGLER,
    ShipClass.PATROL_CUTTER,
    ShipClass.SURVEY_SHIP
  ];
}

/**
 * Get ships by price range
 */
export function getShipsByPriceRange(minPrice: number, maxPrice: number): ShipClass[] {
  return Object.values(ShipClass).filter(shipClass => {
    const spec = SHIP_SPECS[shipClass];
    return spec.baseCost >= minPrice && spec.baseCost <= maxPrice;
  });
}

/**
 * Get ships by faction affinity
 */
export function getShipsByFaction(faction: string): ShipClass[] {
  return Object.values(ShipClass).filter(shipClass => {
    const spec = SHIP_SPECS[shipClass];
    return spec.commonOwners.some(owner =>
      owner.toLowerCase().includes(faction.toLowerCase())
    );
  });
}
