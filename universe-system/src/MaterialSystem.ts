/**
 * MaterialSystem.ts
 * Comprehensive material properties system - Dwarf Fortress style
 * Every material has physical, chemical, and gameplay properties
 */

export interface MaterialProperties {
  // Identity
  id: string;
  name: string;
  pluralName: string;
  adjective: string;

  // Physical properties
  density: number;              // kg/m³
  meltingPoint: number;         // K
  boilingPoint: number;         // K
  thermalConductivity: number;  // W/(m·K)
  electricalConductivity: number; // S/m
  hardness: number;             // Mohs scale (0-10)
  tensileStrength: number;      // MPa
  compressiveStrength: number;  // MPa
  shearStrength: number;        // MPa
  elasticity: number;           // GPa (Young's modulus)
  fractureResistance: number;   // 0-1

  // Thermal properties
  specificHeat: number;         // J/(kg·K)
  thermalExpansion: number;     // 1/K
  ignitionPoint?: number;       // K (if flammable)
  combustionEnergy?: number;    // kJ/kg

  // Chemical properties
  corrosionResistance: number;  // 0-1
  reactivity: number;           // 0-1 (how reactive with other materials)
  oxidation: number;            // 0-1 (rust, tarnish)
  toxicity: number;             // 0-1
  radioactivity: number;        // Bq/kg

  // Optical properties
  color: string;                // Hex color
  transparency: number;         // 0-1
  reflectivity: number;         // 0-1
  emissivity: number;           // 0-1

  // Game properties
  value: number;                // Credits per kg
  rarity: number;               // 0-1 (how rare in universe)
  utilityScore: number;         // 0-100 (general usefulness)

  // State at STP
  stateAtSTP: 'SOLID' | 'LIQUID' | 'GAS' | 'PLASMA';

  // Categories
  categories: MaterialCategory[];

  // Special properties
  magnetic?: boolean;
  superconducting?: boolean;
  piezoelectric?: boolean;
  photoreactive?: boolean;
  selfHealing?: boolean;

  // Processing requirements
  extractionDifficulty: number; // 0-1
  refinementCost: number;       // Credits per kg

  // Description
  description: string;
  discoveryLore?: string;
}

export enum MaterialCategory {
  METAL = 'METAL',
  NON_METAL = 'NON_METAL',
  CERAMIC = 'CERAMIC',
  POLYMER = 'POLYMER',
  COMPOSITE = 'COMPOSITE',
  CRYSTAL = 'CRYSTAL',
  ORGANIC = 'ORGANIC',
  EXOTIC = 'EXOTIC',
  SEMICONDUCTOR = 'SEMICONDUCTOR',
  NOBLE_GAS = 'NOBLE_GAS',
  FUEL = 'FUEL',
  EXPLOSIVE = 'EXPLOSIVE',
  STRUCTURAL = 'STRUCTURAL',
  INSULATOR = 'INSULATOR',
  CONDUCTOR = 'CONDUCTOR',
  COOLANT = 'COOLANT',
  PROPELLANT = 'PROPELLANT',
  LIFE_SUPPORT = 'LIFE_SUPPORT'
}

/**
 * Comprehensive material database
 */
export class MaterialDatabase {
  private static materials: Map<string, MaterialProperties> = new Map();
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    // Structural metals
    this.registerMaterial({
      id: 'steel',
      name: 'Steel',
      pluralName: 'Steel ingots',
      adjective: 'steel',
      density: 7850,
      meltingPoint: 1811,
      boilingPoint: 3273,
      thermalConductivity: 50,
      electricalConductivity: 1.4e6,
      hardness: 5.5,
      tensileStrength: 400,
      compressiveStrength: 250,
      shearStrength: 350,
      elasticity: 200,
      fractureResistance: 0.8,
      specificHeat: 490,
      thermalExpansion: 1.2e-5,
      corrosionResistance: 0.3,
      reactivity: 0.4,
      oxidation: 0.6,
      toxicity: 0.05,
      radioactivity: 0,
      color: '#8B8B8B',
      transparency: 0,
      reflectivity: 0.55,
      emissivity: 0.8,
      value: 5,
      rarity: 0.1,
      utilityScore: 95,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.METAL, MaterialCategory.STRUCTURAL, MaterialCategory.CONDUCTOR],
      extractionDifficulty: 0.3,
      refinementCost: 2,
      description: 'Iron-carbon alloy, the backbone of industrial civilization. Strong, versatile, and abundant.'
    });

    this.registerMaterial({
      id: 'titanium',
      name: 'Titanium',
      pluralName: 'Titanium ingots',
      adjective: 'titanium',
      density: 4506,
      meltingPoint: 1941,
      boilingPoint: 3560,
      thermalConductivity: 21.9,
      electricalConductivity: 2.38e6,
      hardness: 6,
      tensileStrength: 434,
      compressiveStrength: 970,
      shearStrength: 550,
      elasticity: 116,
      fractureResistance: 0.85,
      specificHeat: 523,
      thermalExpansion: 8.6e-6,
      corrosionResistance: 0.95,
      reactivity: 0.3,
      oxidation: 0.1,
      toxicity: 0,
      radioactivity: 0,
      color: '#C0C0C8',
      transparency: 0,
      reflectivity: 0.65,
      emissivity: 0.6,
      value: 45,
      rarity: 0.4,
      utilityScore: 92,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.METAL, MaterialCategory.STRUCTURAL],
      extractionDifficulty: 0.7,
      refinementCost: 25,
      description: 'Lightweight, corrosion-resistant metal. Strength-to-weight ratio makes it ideal for spacecraft construction.'
    });

    this.registerMaterial({
      id: 'aluminum',
      name: 'Aluminum',
      pluralName: 'Aluminum ingots',
      adjective: 'aluminum',
      density: 2700,
      meltingPoint: 933,
      boilingPoint: 2743,
      thermalConductivity: 237,
      electricalConductivity: 3.5e7,
      hardness: 2.75,
      tensileStrength: 310,
      compressiveStrength: 228,
      shearStrength: 283,
      elasticity: 69,
      fractureResistance: 0.6,
      specificHeat: 897,
      thermalExpansion: 2.31e-5,
      corrosionResistance: 0.7,
      reactivity: 0.5,
      oxidation: 0.3,
      toxicity: 0.1,
      radioactivity: 0,
      color: '#E0E0E8',
      transparency: 0,
      reflectivity: 0.92,
      emissivity: 0.09,
      value: 3,
      rarity: 0.05,
      utilityScore: 85,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.METAL, MaterialCategory.STRUCTURAL, MaterialCategory.CONDUCTOR],
      extractionDifficulty: 0.5,
      refinementCost: 4,
      description: 'Lightweight metal with excellent thermal conductivity. Common in heat sinks and structural components.'
    });

    // Precious metals
    this.registerMaterial({
      id: 'platinum',
      name: 'Platinum',
      pluralName: 'Platinum bars',
      adjective: 'platinum',
      density: 21450,
      meltingPoint: 2041,
      boilingPoint: 4098,
      thermalConductivity: 71.6,
      electricalConductivity: 9.43e6,
      hardness: 4,
      tensileStrength: 125,
      compressiveStrength: 280,
      shearStrength: 200,
      elasticity: 168,
      fractureResistance: 0.7,
      specificHeat: 133,
      thermalExpansion: 8.8e-6,
      corrosionResistance: 0.99,
      reactivity: 0.05,
      oxidation: 0,
      toxicity: 0,
      radioactivity: 0,
      color: '#E5E4E2',
      transparency: 0,
      reflectivity: 0.71,
      emissivity: 0.1,
      value: 850,
      rarity: 0.9,
      utilityScore: 75,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.METAL, MaterialCategory.CONDUCTOR],
      extractionDifficulty: 0.9,
      refinementCost: 400,
      description: 'Rare noble metal. Chemically inert, used in catalysts and advanced electronics. Symbol of wealth.',
      discoveryLore: 'First isolated from South American ores in 1735. Pre-Columbian civilizations used it for decorative artifacts.'
    });

    this.registerMaterial({
      id: 'gold',
      name: 'Gold',
      pluralName: 'Gold bars',
      adjective: 'golden',
      density: 19320,
      meltingPoint: 1337,
      boilingPoint: 3243,
      thermalConductivity: 318,
      electricalConductivity: 4.52e7,
      hardness: 2.5,
      tensileStrength: 124,
      compressiveStrength: 240,
      shearStrength: 180,
      elasticity: 78,
      fractureResistance: 0.5,
      specificHeat: 129,
      thermalExpansion: 1.42e-5,
      corrosionResistance: 1.0,
      reactivity: 0.01,
      oxidation: 0,
      toxicity: 0,
      radioactivity: 0,
      color: '#FFD700',
      transparency: 0,
      reflectivity: 0.47,
      emissivity: 0.02,
      value: 1200,
      rarity: 0.85,
      utilityScore: 60,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.METAL, MaterialCategory.CONDUCTOR],
      extractionDifficulty: 0.8,
      refinementCost: 500,
      description: 'The eternal metal. Does not corrode, highly conductive. Universal currency and status symbol.',
      discoveryLore: 'Used by humanity for over 6000 years. Found in ancient Egyptian tombs and modern circuit boards alike.'
    });

    // Exotic materials
    this.registerMaterial({
      id: 'graphene',
      name: 'Graphene',
      pluralName: 'Graphene sheets',
      adjective: 'graphene',
      density: 2267,
      meltingPoint: 5000,
      boilingPoint: 5300,
      thermalConductivity: 5000,
      electricalConductivity: 1e8,
      hardness: 10,
      tensileStrength: 130000,
      compressiveStrength: 100000,
      shearStrength: 80000,
      elasticity: 1000,
      fractureResistance: 0.95,
      specificHeat: 710,
      thermalExpansion: -8e-6,
      corrosionResistance: 0.98,
      reactivity: 0.1,
      oxidation: 0.05,
      toxicity: 0.15,
      radioactivity: 0,
      color: '#2C2C2C',
      transparency: 0.023,
      reflectivity: 0.02,
      emissivity: 0.92,
      value: 5000,
      rarity: 0.95,
      utilityScore: 98,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.EXOTIC, MaterialCategory.CONDUCTOR, MaterialCategory.STRUCTURAL],
      extractionDifficulty: 0.95,
      refinementCost: 3000,
      description: 'Single layer of carbon atoms. Strongest material known. Revolutionary properties.',
      discoveryLore: 'Isolated in 2004, earned its discoverers the Nobel Prize. Changed materials science forever.'
    });

    this.registerMaterial({
      id: 'aerogel',
      name: 'Aerogel',
      pluralName: 'Aerogel blocks',
      adjective: 'aerogel',
      density: 150,
      meltingPoint: 1473,
      boilingPoint: 2503,
      thermalConductivity: 0.02,
      electricalConductivity: 1e-12,
      hardness: 1,
      tensileStrength: 0.02,
      compressiveStrength: 0.3,
      shearStrength: 0.01,
      elasticity: 0.001,
      fractureResistance: 0.1,
      specificHeat: 1000,
      thermalExpansion: 2e-6,
      corrosionResistance: 0.9,
      reactivity: 0.1,
      oxidation: 0,
      toxicity: 0,
      radioactivity: 0,
      color: '#E0F0FF',
      transparency: 0.7,
      reflectivity: 0.01,
      emissivity: 0.05,
      value: 800,
      rarity: 0.85,
      utilityScore: 75,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.INSULATOR, MaterialCategory.EXOTIC],
      extractionDifficulty: 0.85,
      refinementCost: 600,
      description: 'Frozen smoke. 99.8% air. Best thermal insulator known. Ethereal and fragile.',
      discoveryLore: 'Created in 1931. NASA uses it to catch comet particles in space.'
    });

    // Fuels
    this.registerMaterial({
      id: 'RP1',
      name: 'RP-1',
      pluralName: 'RP-1 fuel',
      adjective: 'RP-1',
      density: 810,
      meltingPoint: 216,
      boilingPoint: 489,
      thermalConductivity: 0.15,
      electricalConductivity: 1e-12,
      hardness: 0,
      tensileStrength: 0,
      compressiveStrength: 0,
      shearStrength: 0,
      elasticity: 0,
      fractureResistance: 0,
      specificHeat: 2010,
      thermalExpansion: 9.5e-4,
      ignitionPoint: 483,
      combustionEnergy: 43000,
      corrosionResistance: 0.4,
      reactivity: 0.7,
      oxidation: 0,
      toxicity: 0.5,
      radioactivity: 0,
      color: '#F5DEB3',
      transparency: 0.1,
      reflectivity: 0.05,
      emissivity: 0.9,
      value: 2,
      rarity: 0.2,
      utilityScore: 90,
      stateAtSTP: 'LIQUID',
      categories: [MaterialCategory.FUEL, MaterialCategory.PROPELLANT, MaterialCategory.ORGANIC],
      extractionDifficulty: 0.4,
      refinementCost: 1.5,
      description: 'Highly refined kerosene. Powers rockets and dreams. Sweet, dangerous smell.',
      discoveryLore: 'Developed for rocket applications in the 1950s. "RP" stands for Refined Petroleum.'
    });

    this.registerMaterial({
      id: 'liquid_hydrogen',
      name: 'Liquid Hydrogen',
      pluralName: 'LH2',
      adjective: 'hydrogen',
      density: 71,
      meltingPoint: 14,
      boilingPoint: 20,
      thermalConductivity: 0.18,
      electricalConductivity: 1e-10,
      hardness: 0,
      tensileStrength: 0,
      compressiveStrength: 0,
      shearStrength: 0,
      elasticity: 0,
      fractureResistance: 0,
      specificHeat: 14300,
      thermalExpansion: 0,
      ignitionPoint: 858,
      combustionEnergy: 142000,
      corrosionResistance: 1,
      reactivity: 0.95,
      oxidation: 0,
      toxicity: 0.1,
      radioactivity: 0,
      color: '#E0F0FF',
      transparency: 0.9,
      reflectivity: 0.02,
      emissivity: 0.05,
      value: 15,
      rarity: 0.1,
      utilityScore: 95,
      stateAtSTP: 'LIQUID',
      categories: [MaterialCategory.FUEL, MaterialCategory.PROPELLANT, MaterialCategory.COOLANT],
      extractionDifficulty: 0.7,
      refinementCost: 8,
      description: 'Cryogenic rocket fuel. Highest energy per mass. Evaporates at room temperature. Handle with extreme care.',
      discoveryLore: 'First liquefied in 1898. Powers the most efficient rocket engines ever built.'
    });

    this.registerMaterial({
      id: 'helium3',
      name: 'Helium-3',
      pluralName: 'Helium-3',
      adjective: 'helium-3',
      density: 0.59,
      meltingPoint: 0.95,
      boilingPoint: 3.19,
      thermalConductivity: 0.15,
      electricalConductivity: 0,
      hardness: 0,
      tensileStrength: 0,
      compressiveStrength: 0,
      shearStrength: 0,
      elasticity: 0,
      fractureResistance: 0,
      specificHeat: 5193,
      thermalExpansion: 0,
      combustionEnergy: 3.5e8, // Fusion energy!
      corrosionResistance: 1,
      reactivity: 0.01,
      oxidation: 0,
      toxicity: 0,
      radioactivity: 0,
      color: '#FFE0FF',
      transparency: 1,
      reflectivity: 0,
      emissivity: 0,
      value: 50000,
      rarity: 0.99,
      utilityScore: 100,
      stateAtSTP: 'GAS',
      categories: [MaterialCategory.NOBLE_GAS, MaterialCategory.FUEL, MaterialCategory.EXOTIC],
      extractionDifficulty: 0.99,
      refinementCost: 25000,
      description: 'Holy grail of fusion fuel. Rare on Earth, abundant on the Moon. Powers the future.',
      discoveryLore: 'Predicted in 1934, discovered in 1939. The most valuable substance in the solar system.'
    });

    // Ceramics and composites
    this.registerMaterial({
      id: 'tungsten_carbide',
      name: 'Tungsten Carbide',
      pluralName: 'Tungsten carbide pieces',
      adjective: 'carbide',
      density: 15630,
      meltingPoint: 3058,
      boilingPoint: 6273,
      thermalConductivity: 110,
      electricalConductivity: 2e6,
      hardness: 9,
      tensileStrength: 344,
      compressiveStrength: 5500,
      shearStrength: 3500,
      elasticity: 550,
      fractureResistance: 0.9,
      specificHeat: 203,
      thermalExpansion: 5.2e-6,
      corrosionResistance: 0.9,
      reactivity: 0.2,
      oxidation: 0.1,
      toxicity: 0.3,
      radioactivity: 0,
      color: '#505060',
      transparency: 0,
      reflectivity: 0.3,
      emissivity: 0.85,
      value: 250,
      rarity: 0.7,
      utilityScore: 88,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.CERAMIC, MaterialCategory.STRUCTURAL],
      extractionDifficulty: 0.8,
      refinementCost: 150,
      description: 'Ultra-hard ceramic composite. Can cut through almost anything. Used in drill bits and armor.',
      discoveryLore: 'Synthesized in 1893. Changed metalworking forever.'
    });

    // Life support materials
    this.registerMaterial({
      id: 'lithium_hydroxide',
      name: 'Lithium Hydroxide',
      pluralName: 'LiOH canisters',
      adjective: 'lithium hydroxide',
      density: 1460,
      meltingPoint: 735,
      boilingPoint: 1697,
      thermalConductivity: 0.5,
      electricalConductivity: 1e-8,
      hardness: 2,
      tensileStrength: 5,
      compressiveStrength: 20,
      shearStrength: 10,
      elasticity: 5,
      fractureResistance: 0.3,
      specificHeat: 2300,
      thermalExpansion: 0,
      corrosionResistance: 0.3,
      reactivity: 0.8,
      oxidation: 0,
      toxicity: 0.6,
      radioactivity: 0,
      color: '#FFFFFF',
      transparency: 0,
      reflectivity: 0.9,
      emissivity: 0.95,
      value: 80,
      rarity: 0.5,
      utilityScore: 95,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.LIFE_SUPPORT],
      extractionDifficulty: 0.5,
      refinementCost: 40,
      description: 'CO2 scrubber. Each kilogram absorbs 450g of carbon dioxide. Keeps crews breathing.',
      discoveryLore: 'Saved Apollo 13. The crew improvised filters with this chemical, duct tape, and hope.'
    });

    // Exotic alien materials
    this.registerMaterial({
      id: 'neutronium',
      name: 'Neutronium',
      pluralName: 'Neutronium samples',
      adjective: 'neutronium',
      density: 4e17,
      meltingPoint: 1e10,
      boilingPoint: 1e11,
      thermalConductivity: 1e6,
      electricalConductivity: 1e10,
      hardness: 10,
      tensileStrength: 1e12,
      compressiveStrength: 1e14,
      shearStrength: 1e13,
      elasticity: 1e6,
      fractureResistance: 1.0,
      specificHeat: 1,
      thermalExpansion: 0,
      corrosionResistance: 1.0,
      reactivity: 0,
      oxidation: 0,
      toxicity: 0,
      radioactivity: 1e20,
      color: '#FFFFFF',
      transparency: 0,
      reflectivity: 1,
      emissivity: 0,
      value: 1e12,
      rarity: 1.0,
      utilityScore: 50,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.EXOTIC],
      magnetic: true,
      extractionDifficulty: 1.0,
      refinementCost: 1e10,
      description: 'Degenerate matter from neutron stars. A teaspoon weighs a billion tons. Defies conventional physics.',
      discoveryLore: 'Theoretical until first sample recovered from neutron star fragment in 2247. Handling requires gravity manipulation.'
    });

    this.registerMaterial({
      id: 'strange_matter',
      name: 'Strange Matter',
      pluralName: 'Strange matter samples',
      adjective: 'strange',
      density: 1e18,
      meltingPoint: 1e12,
      boilingPoint: 1e13,
      thermalConductivity: 1e8,
      electricalConductivity: 1e12,
      hardness: 10,
      tensileStrength: 1e15,
      compressiveStrength: 1e16,
      shearStrength: 1e15,
      elasticity: 1e8,
      fractureResistance: 1.0,
      specificHeat: 0.1,
      thermalExpansion: 0,
      corrosionResistance: 1.0,
      reactivity: 0.99,
      oxidation: 0,
      toxicity: 1.0,
      radioactivity: 1e22,
      color: '#FF00FF',
      transparency: 0,
      reflectivity: 0,
      emissivity: 1,
      value: 1e15,
      rarity: 1.0,
      utilityScore: 20,
      stateAtSTP: 'SOLID',
      categories: [MaterialCategory.EXOTIC],
      selfHealing: true,
      extractionDifficulty: 1.0,
      refinementCost: 1e12,
      description: 'Hypothetical quark matter. Contact with normal matter causes conversion. Could destroy the universe. Handle with... well, you can\'t.',
      discoveryLore: 'Still theoretical. If it exists, touching it would convert Earth into a strange star. Do not open.'
    });

    this.initialized = true;
  }

  private static registerMaterial(props: MaterialProperties): void {
    this.materials.set(props.id, props);
  }

  static getMaterial(id: string): MaterialProperties | undefined {
    if (!this.initialized) this.initialize();
    return this.materials.get(id);
  }

  static getAllMaterials(): MaterialProperties[] {
    if (!this.initialized) this.initialize();
    return Array.from(this.materials.values());
  }

  static getMaterialsByCategory(category: MaterialCategory): MaterialProperties[] {
    if (!this.initialized) this.initialize();
    return Array.from(this.materials.values()).filter(m => m.categories.includes(category));
  }

  static getRandomMaterial(rng?: () => number): MaterialProperties {
    if (!this.initialized) this.initialize();
    const materials = Array.from(this.materials.values());
    const rand = rng ? rng() : Math.random();
    return materials[Math.floor(rand * materials.length)];
  }

  /**
   * Get material state at given temperature
   */
  static getMaterialState(material: MaterialProperties, temperature: number): 'SOLID' | 'LIQUID' | 'GAS' | 'PLASMA' {
    if (temperature > 1e6) return 'PLASMA';
    if (temperature > material.boilingPoint) return 'GAS';
    if (temperature > material.meltingPoint) return 'LIQUID';
    return 'SOLID';
  }

  /**
   * Calculate material interaction (corrosion, reaction, etc.)
   */
  static calculateInteraction(
    material1: MaterialProperties,
    material2: MaterialProperties,
    temperature: number,
    pressure: number
  ): {
    reactionRate: number;
    energyReleased: number;
    productsDescription: string;
  } {
    const avgReactivity = (material1.reactivity + material2.reactivity) / 2;
    const tempFactor = Math.min(10, temperature / 500); // Higher temp = faster reaction
    const pressureFactor = Math.min(2, pressure / 101325); // Higher pressure = faster reaction

    const reactionRate = avgReactivity * tempFactor * pressureFactor;
    const energyReleased = reactionRate * 1000; // kJ

    let productsDescription = 'No significant reaction';
    if (reactionRate > 0.5) {
      productsDescription = `${material1.name} and ${material2.name} react vigorously`;
    } else if (reactionRate > 0.1) {
      productsDescription = `Slow corrosion between ${material1.name} and ${material2.name}`;
    }

    return { reactionRate, energyReleased, productsDescription };
  }
}
