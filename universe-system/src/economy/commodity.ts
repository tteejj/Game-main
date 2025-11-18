/**
 * commodity.ts
 * Commodity definitions and trading resources
 *
 * Defines all tradeable goods in the universe with their
 * economic properties.
 */

/**
 * Commodity categories
 */
export enum CommodityCategory {
  RAW_MATERIALS = 'RAW_MATERIALS',
  REFINED_MATERIALS = 'REFINED_MATERIALS',
  MANUFACTURED_GOODS = 'MANUFACTURED_GOODS',
  FOOD_SUPPLIES = 'FOOD_SUPPLIES',
  LUXURY_GOODS = 'LUXURY_GOODS',
  TECHNOLOGY = 'TECHNOLOGY',
  FUEL = 'FUEL',
  MEDICAL = 'MEDICAL'
}

/**
 * Commodity type identifier
 */
export enum CommodityType {
  // Raw Materials
  METALLIC_ORE = 'METALLIC_ORE',
  ROCKY_ORE = 'ROCKY_ORE',
  ICE = 'ICE',
  RARE_EARTH = 'RARE_EARTH',
  PLATINUM = 'PLATINUM',
  URANIUM = 'URANIUM',

  // Refined Materials
  STEEL = 'STEEL',
  TITANIUM = 'TITANIUM',
  ALUMINUM = 'ALUMINUM',
  SILICON = 'SILICON',
  COPPER = 'COPPER',
  CARBON_FIBER = 'CARBON_FIBER',

  // Manufactured Goods
  ELECTRONICS = 'ELECTRONICS',
  MACHINERY = 'MACHINERY',
  SHIP_COMPONENTS = 'SHIP_COMPONENTS',
  TOOLS = 'TOOLS',
  CONSTRUCTION_MATERIALS = 'CONSTRUCTION_MATERIALS',

  // Food & Supplies
  FOOD = 'FOOD',
  WATER = 'WATER',
  OXYGEN = 'OXYGEN',
  MEDICAL_SUPPLIES = 'MEDICAL_SUPPLIES',

  // Luxury Goods
  JEWELRY = 'JEWELRY',
  ART = 'ART',
  RARE_ARTIFACTS = 'RARE_ARTIFACTS',
  ENTERTAINMENT = 'ENTERTAINMENT',

  // Technology
  COMPUTER_SYSTEMS = 'COMPUTER_SYSTEMS',
  SENSORS = 'SENSORS',
  WEAPONS = 'WEAPONS',
  SHIELD_GENERATORS = 'SHIELD_GENERATORS',

  // Fuel
  HYDROGEN_FUEL = 'HYDROGEN_FUEL',
  FUSION_PELLETS = 'FUSION_PELLETS',
  ANTIMATTER = 'ANTIMATTER'
}

/**
 * Commodity properties and economic data
 */
export interface CommodityDefinition {
  type: CommodityType;
  category: CommodityCategory;
  name: string;
  description: string;
  basePrice: number; // Credits per ton
  priceVolatility: number; // 0-1, how much price fluctuates
  massPerUnit: number; // kg per unit (1 unit = 1 ton for most)
  isIllegal: boolean;
  isPerishable: boolean;
  shelfLife?: number; // days if perishable
}

/**
 * All commodity definitions
 */
export const COMMODITIES: Record<CommodityType, CommodityDefinition> = {
  // Raw Materials
  [CommodityType.METALLIC_ORE]: {
    type: CommodityType.METALLIC_ORE,
    category: CommodityCategory.RAW_MATERIALS,
    name: 'Metallic Ore',
    description: 'Iron, nickel, and other common metals in raw form',
    basePrice: 50,
    priceVolatility: 0.3,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.ROCKY_ORE]: {
    type: CommodityType.ROCKY_ORE,
    category: CommodityCategory.RAW_MATERIALS,
    name: 'Rocky Ore',
    description: 'Silicates and rocky materials for construction',
    basePrice: 30,
    priceVolatility: 0.2,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.ICE]: {
    type: CommodityType.ICE,
    category: CommodityCategory.RAW_MATERIALS,
    name: 'Ice',
    description: 'Water ice for life support and fuel production',
    basePrice: 40,
    priceVolatility: 0.25,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.RARE_EARTH]: {
    type: CommodityType.RARE_EARTH,
    category: CommodityCategory.RAW_MATERIALS,
    name: 'Rare Earth Elements',
    description: 'Valuable rare earth metals for high-tech manufacturing',
    basePrice: 500,
    priceVolatility: 0.5,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.PLATINUM]: {
    type: CommodityType.PLATINUM,
    category: CommodityCategory.RAW_MATERIALS,
    name: 'Platinum',
    description: 'Precious metal for catalysts and jewelry',
    basePrice: 800,
    priceVolatility: 0.4,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.URANIUM]: {
    type: CommodityType.URANIUM,
    category: CommodityCategory.RAW_MATERIALS,
    name: 'Uranium',
    description: 'Radioactive fuel for fission reactors',
    basePrice: 600,
    priceVolatility: 0.35,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  // Refined Materials
  [CommodityType.STEEL]: {
    type: CommodityType.STEEL,
    category: CommodityCategory.REFINED_MATERIALS,
    name: 'Steel',
    description: 'Refined iron alloy for construction',
    basePrice: 100,
    priceVolatility: 0.25,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.TITANIUM]: {
    type: CommodityType.TITANIUM,
    category: CommodityCategory.REFINED_MATERIALS,
    name: 'Titanium',
    description: 'Lightweight, strong metal for spacecraft',
    basePrice: 300,
    priceVolatility: 0.3,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.ALUMINUM]: {
    type: CommodityType.ALUMINUM,
    category: CommodityCategory.REFINED_MATERIALS,
    name: 'Aluminum',
    description: 'Light metal for structures and electronics',
    basePrice: 150,
    priceVolatility: 0.25,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.SILICON]: {
    type: CommodityType.SILICON,
    category: CommodityCategory.REFINED_MATERIALS,
    name: 'Silicon',
    description: 'Purified silicon for electronics',
    basePrice: 200,
    priceVolatility: 0.3,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.COPPER]: {
    type: CommodityType.COPPER,
    category: CommodityCategory.REFINED_MATERIALS,
    name: 'Copper',
    description: 'Conductive metal for wiring and circuits',
    basePrice: 120,
    priceVolatility: 0.25,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.CARBON_FIBER]: {
    type: CommodityType.CARBON_FIBER,
    category: CommodityCategory.REFINED_MATERIALS,
    name: 'Carbon Fiber',
    description: 'High-strength composite material',
    basePrice: 400,
    priceVolatility: 0.35,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  // Manufactured Goods
  [CommodityType.ELECTRONICS]: {
    type: CommodityType.ELECTRONICS,
    category: CommodityCategory.MANUFACTURED_GOODS,
    name: 'Electronics',
    description: 'General electronic components and systems',
    basePrice: 600,
    priceVolatility: 0.4,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.MACHINERY]: {
    type: CommodityType.MACHINERY,
    category: CommodityCategory.MANUFACTURED_GOODS,
    name: 'Machinery',
    description: 'Industrial equipment and tools',
    basePrice: 500,
    priceVolatility: 0.35,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.SHIP_COMPONENTS]: {
    type: CommodityType.SHIP_COMPONENTS,
    category: CommodityCategory.MANUFACTURED_GOODS,
    name: 'Ship Components',
    description: 'Parts and systems for spacecraft',
    basePrice: 1000,
    priceVolatility: 0.4,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.TOOLS]: {
    type: CommodityType.TOOLS,
    category: CommodityCategory.MANUFACTURED_GOODS,
    name: 'Tools',
    description: 'Hand tools and equipment',
    basePrice: 300,
    priceVolatility: 0.25,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.CONSTRUCTION_MATERIALS]: {
    type: CommodityType.CONSTRUCTION_MATERIALS,
    category: CommodityCategory.MANUFACTURED_GOODS,
    name: 'Construction Materials',
    description: 'Prefabricated building components',
    basePrice: 250,
    priceVolatility: 0.3,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  // Food & Supplies
  [CommodityType.FOOD]: {
    type: CommodityType.FOOD,
    category: CommodityCategory.FOOD_SUPPLIES,
    name: 'Food',
    description: 'Preserved food for long-duration spaceflight',
    basePrice: 200,
    priceVolatility: 0.5,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: true,
    shelfLife: 365
  },

  [CommodityType.WATER]: {
    type: CommodityType.WATER,
    category: CommodityCategory.FOOD_SUPPLIES,
    name: 'Water',
    description: 'Purified drinking water',
    basePrice: 50,
    priceVolatility: 0.4,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.OXYGEN]: {
    type: CommodityType.OXYGEN,
    category: CommodityCategory.FOOD_SUPPLIES,
    name: 'Oxygen',
    description: 'Breathable oxygen for life support',
    basePrice: 100,
    priceVolatility: 0.45,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.MEDICAL_SUPPLIES]: {
    type: CommodityType.MEDICAL_SUPPLIES,
    category: CommodityCategory.MEDICAL,
    name: 'Medical Supplies',
    description: 'Medicines and medical equipment',
    basePrice: 800,
    priceVolatility: 0.5,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: true,
    shelfLife: 180
  },

  // Luxury Goods
  [CommodityType.JEWELRY]: {
    type: CommodityType.JEWELRY,
    category: CommodityCategory.LUXURY_GOODS,
    name: 'Jewelry',
    description: 'Precious metals and gemstones',
    basePrice: 2000,
    priceVolatility: 0.6,
    massPerUnit: 100,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.ART]: {
    type: CommodityType.ART,
    category: CommodityCategory.LUXURY_GOODS,
    name: 'Art',
    description: 'Paintings, sculptures, and collectibles',
    basePrice: 5000,
    priceVolatility: 0.8,
    massPerUnit: 100,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.RARE_ARTIFACTS]: {
    type: CommodityType.RARE_ARTIFACTS,
    category: CommodityCategory.LUXURY_GOODS,
    name: 'Rare Artifacts',
    description: 'Ancient relics and historical items',
    basePrice: 10000,
    priceVolatility: 0.9,
    massPerUnit: 50,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.ENTERTAINMENT]: {
    type: CommodityType.ENTERTAINMENT,
    category: CommodityCategory.LUXURY_GOODS,
    name: 'Entertainment',
    description: 'Media, games, and entertainment systems',
    basePrice: 400,
    priceVolatility: 0.5,
    massPerUnit: 100,
    isIllegal: false,
    isPerishable: false
  },

  // Technology
  [CommodityType.COMPUTER_SYSTEMS]: {
    type: CommodityType.COMPUTER_SYSTEMS,
    category: CommodityCategory.TECHNOLOGY,
    name: 'Computer Systems',
    description: 'Advanced computing hardware',
    basePrice: 1500,
    priceVolatility: 0.55,
    massPerUnit: 500,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.SENSORS]: {
    type: CommodityType.SENSORS,
    category: CommodityCategory.TECHNOLOGY,
    name: 'Sensors',
    description: 'Advanced sensor arrays and equipment',
    basePrice: 1200,
    priceVolatility: 0.5,
    massPerUnit: 500,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.WEAPONS]: {
    type: CommodityType.WEAPONS,
    category: CommodityCategory.TECHNOLOGY,
    name: 'Weapons',
    description: 'Ship-mounted weapon systems',
    basePrice: 3000,
    priceVolatility: 0.6,
    massPerUnit: 1000,
    isIllegal: true, // Restricted in some systems
    isPerishable: false
  },

  [CommodityType.SHIELD_GENERATORS]: {
    type: CommodityType.SHIELD_GENERATORS,
    category: CommodityCategory.TECHNOLOGY,
    name: 'Shield Generators',
    description: 'Defensive shield technology',
    basePrice: 2500,
    priceVolatility: 0.55,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  // Fuel
  [CommodityType.HYDROGEN_FUEL]: {
    type: CommodityType.HYDROGEN_FUEL,
    category: CommodityCategory.FUEL,
    name: 'Hydrogen Fuel',
    description: 'Liquid hydrogen for fusion drives',
    basePrice: 150,
    priceVolatility: 0.4,
    massPerUnit: 1000,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.FUSION_PELLETS]: {
    type: CommodityType.FUSION_PELLETS,
    category: CommodityCategory.FUEL,
    name: 'Fusion Pellets',
    description: 'Deuterium-tritium fuel pellets',
    basePrice: 500,
    priceVolatility: 0.45,
    massPerUnit: 100,
    isIllegal: false,
    isPerishable: false
  },

  [CommodityType.ANTIMATTER]: {
    type: CommodityType.ANTIMATTER,
    category: CommodityCategory.FUEL,
    name: 'Antimatter',
    description: 'Exotic antimatter fuel for advanced drives',
    basePrice: 50000,
    priceVolatility: 0.7,
    massPerUnit: 1,
    isIllegal: false,
    isPerishable: false
  }
};

/**
 * Get commodity definition
 */
export function getCommodity(type: CommodityType): CommodityDefinition {
  return COMMODITIES[type];
}

/**
 * Get all commodities in a category
 */
export function getCommoditiesByCategory(category: CommodityCategory): CommodityDefinition[] {
  return Object.values(COMMODITIES).filter(c => c.category === category);
}

/**
 * Get random commodity
 */
export function getRandomCommodity(): CommodityDefinition {
  const types = Object.keys(COMMODITIES) as CommodityType[];
  const randomType = types[Math.floor(Math.random() * types.length)];
  return COMMODITIES[randomType];
}

/**
 * Get random commodity from category
 */
export function getRandomCommodityFromCategory(category: CommodityCategory): CommodityDefinition {
  const commodities = getCommoditiesByCategory(category);
  return commodities[Math.floor(Math.random() * commodities.length)];
}
