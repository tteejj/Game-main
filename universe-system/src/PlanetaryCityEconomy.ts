/**
 * PlanetaryCityEconomy - Living cities on planets with populations and economies
 */

import { CelestialBody, Vector3 } from './CelestialBody';

export interface City {
  id: string;
  name: string;
  planet: string;

  // Location
  latitude: number;
  longitude: number;
  position: Vector3; // 3D position on planet surface

  // Demographics
  population: number;
  populationGrowthRate: number; // % per year
  speciesComposition: Map<string, number>; // species -> %

  // Infrastructure
  spaceports: number;
  factories: number;
  farms: number;
  powerPlants: number;
  habitats: number;

  // Economy
  gdp: number;
  unemploymentRate: number;
  averageIncome: number;

  // Production
  production: Map<string, number>; // commodity -> units/day
  consumption: Map<string, number>; // commodity -> units/day

  // Trade
  exports: Map<string, number>; // commodity -> units
  imports: Map<string, number>; // commodity -> units
  tradeBalance: number;

  // Resources
  localResources: string[]; // What can be mined/produced locally
  resourceDepletion: Map<string, number>; // resource -> depletion %

  // Social
  happiness: number; // 0-100
  crimeRate: number; // crimes per 1000
  healthcare: number; // 0-100
  education: number; // 0-100

  // Government
  governmentType: string;
  taxRate: number;
  controllingFaction: string;

  // Status
  underSiege: boolean;
  plagueActive: boolean;
  inRecession: boolean;
  celebrating: boolean;
}

export interface PlanetaryMarket {
  cityId: string;
  cityName: string;

  // Market data
  prices: Map<string, number>;
  supply: Map<string, number>;
  demand: Map<string, number>;

  // Market conditions
  volatility: number; // 0-1
  liquidityIndex: number; // 0-1

  // Trading
  dailyVolume: number;
  topExports: Array<{ commodity: string; volume: number }>;
  topImports: Array<{ commodity: string; volume: number }>;
}

export class PlanetaryCityEconomy {
  private cities: Map<string, City> = new Map();
  private markets: Map<string, PlanetaryMarket> = new Map();

  /**
   * Generate cities for a planet
   */
  public generateCities(planet: CelestialBody, count: number): City[] {
    const cities: City[] = [];
    const habitability = (planet as any).habitability || 0.5;
    const population = this.calculatePlanetPopulation(planet, habitability);

    for (let i = 0; i < count; i++) {
      const city = this.generateCity(planet, i, population / count, habitability);
      cities.push(city);
      this.cities.set(city.id, city);

      // Create market
      const market = this.createMarket(city);
      this.markets.set(city.id, market);
    }

    return cities;
  }

  /**
   * Update all cities (economics, population, etc.)
   */
  public update(deltaTime: number): void {
    for (const city of this.cities.values()) {
      this.updateCity(city, deltaTime);
      this.updateMarket(city);
    }
  }

  /**
   * Get city by ID
   */
  public getCity(cityId: string): City | null {
    return this.cities.get(cityId) || null;
  }

  /**
   * Get market for city
   */
  public getMarket(cityId: string): PlanetaryMarket | null {
    return this.markets.get(cityId) || null;
  }

  /**
   * Get all cities
   */
  public getAllCities(): City[] {
    return Array.from(this.cities.values());
  }

  /**
   * Player buys from city market
   */
  public buyFromCity(cityId: string, commodity: string, quantity: number, credits: number): {
    success: boolean;
    cost: number;
    message: string;
  } {
    const market = this.markets.get(cityId);
    const city = this.cities.get(cityId);

    if (!market || !city) {
      return {
        success: false,
        cost: 0,
        message: 'City not found'
      };
    }

    const price = market.prices.get(commodity);
    const supply = market.supply.get(commodity) || 0;

    if (!price) {
      return {
        success: false,
        cost: 0,
        message: `${commodity} not available in ${city.name}`
      };
    }

    if (supply < quantity) {
      return {
        success: false,
        cost: 0,
        message: `Only ${supply} units available`
      };
    }

    const cost = price * quantity * (1 + city.taxRate);

    if (cost > credits) {
      return {
        success: false,
        cost: cost,
        message: `Insufficient credits. Cost: ${cost.toFixed(2)}, Balance: ${credits}`
      };
    }

    // Execute trade
    market.supply.set(commodity, supply - quantity);
    market.dailyVolume += cost;

    return {
      success: true,
      cost: cost,
      message: `Purchased ${quantity} units of ${commodity} from ${city.name}`
    };
  }

  /**
   * Player sells to city market
   */
  public sellToCity(cityId: string, commodity: string, quantity: number): {
    success: boolean;
    earned: number;
    message: string;
  } {
    const market = this.markets.get(cityId);
    const city = this.cities.get(cityId);

    if (!market || !city) {
      return {
        success: false,
        earned: 0,
        message: 'City not found'
      };
    }

    const price = market.prices.get(commodity);
    const demand = market.demand.get(commodity) || 0;

    if (!price) {
      return {
        success: false,
        earned: 0,
        message: `${city.name} does not buy ${commodity}`
      };
    }

    // Cities always buy, but price drops if oversupplied
    const priceMultiplier = demand > 0 ? 1.0 : 0.5;
    const earned = price * quantity * priceMultiplier * (1 - city.taxRate);

    // Update market
    const currentSupply = market.supply.get(commodity) || 0;
    market.supply.set(commodity, currentSupply + quantity);
    market.dailyVolume += earned;

    return {
      success: true,
      earned: earned,
      message: `Sold ${quantity} units of ${commodity} to ${city.name}`
    };
  }

  // Private methods
  private generateCity(planet: CelestialBody, index: number, population: number, habitability: number): City {
    const lat = (Math.random() * 180) - 90;
    const lon = (Math.random() * 360) - 180;

    // Convert to 3D position on surface
    const radius = planet.radius;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    const x = radius * Math.cos(latRad) * Math.cos(lonRad);
    const y = radius * Math.cos(latRad) * Math.sin(lonRad);
    const z = radius * Math.sin(latRad);

    const cityNames = [
      'New Terra', 'Olympus City', 'Port Armstrong', 'Hellas Basin', 'Valles Marineris',
      'Tharsis City', 'Elysium', 'Utopia City', 'New Beijing', 'Neo Tokyo'
    ];

    const infrastructure = Math.floor(population / 10000);

    return {
      id: `${planet.name}_city_${index}`,
      name: cityNames[index % cityNames.length],
      planet: planet.name,

      latitude: lat,
      longitude: lon,
      position: { x, y, z },

      population: population,
      populationGrowthRate: habitability * 2, // % per year
      speciesComposition: new Map([
        ['HUMAN', 80],
        ['MARTIAN', 15],
        ['OTHER', 5]
      ]),

      spaceports: Math.max(1, Math.floor(infrastructure * 0.1)),
      factories: Math.floor(infrastructure * 0.3),
      farms: Math.floor(infrastructure * 0.2),
      powerPlants: Math.floor(infrastructure * 0.1),
      habitats: Math.floor(infrastructure * 0.3),

      gdp: population * 50000, // 50k per capita
      unemploymentRate: 5 + Math.random() * 10,
      averageIncome: 40000 + Math.random() * 20000,

      production: this.generateProduction(planet, population),
      consumption: this.generateConsumption(population),

      exports: new Map(),
      imports: new Map(),
      tradeBalance: 0,

      localResources: this.determineLocalResources(planet),
      resourceDepletion: new Map(),

      happiness: 60 + Math.random() * 30,
      crimeRate: 5 + Math.random() * 15,
      healthcare: 50 + habitability * 40,
      education: 50 + Math.random() * 40,

      governmentType: this.selectGovernmentType(),
      taxRate: 0.05 + Math.random() * 0.15,
      controllingFaction: 'UEC',

      underSiege: false,
      plagueActive: false,
      inRecession: false,
      celebrating: false
    };
  }

  private calculatePlanetPopulation(planet: CelestialBody, habitability: number): number {
    const basePopulation = 1000000; // 1 million
    const habitabilityMultiplier = Math.max(0.1, habitability);

    // Larger planets can support more people
    const sizeMultiplier = (planet.radius / 6371) ** 2; // Earth radius as baseline

    return Math.floor(basePopulation * habitabilityMultiplier * sizeMultiplier);
  }

  private generateProduction(planet: CelestialBody, population: number): Map<string, number> {
    const production = new Map<string, number>();

    // Base production scales with population
    const productionScale = population / 1000000;

    production.set('FOOD', 100 * productionScale);
    production.set('WATER', 150 * productionScale);
    production.set('OXYGEN', 120 * productionScale);
    production.set('ELECTRONICS', 50 * productionScale);
    production.set('MANUFACTURED_GOODS', 80 * productionScale);

    // Resource-specific production
    const resources = (planet as any).resources || [];
    if (resources.includes('IRON')) {
      production.set('IRON', 200 * productionScale);
    }
    if (resources.includes('RARE_EARTHS')) {
      production.set('RARE_EARTHS', 50 * productionScale);
    }

    return production;
  }

  private generateConsumption(population: number): Map<string, number> {
    const consumption = new Map<string, number>();

    const scale = population / 1000000;

    consumption.set('FOOD', 90 * scale);
    consumption.set('WATER', 140 * scale);
    consumption.set('OXYGEN', 110 * scale);
    consumption.set('POWER', 200 * scale);
    consumption.set('MEDICAL_SUPPLIES', 20 * scale);

    return consumption;
  }

  private determineLocalResources(planet: CelestialBody): string[] {
    const resources: string[] = [];

    // Based on planet type
    const geology = (planet as any).geology || {};

    if (geology.ironContent > 0.3) resources.push('IRON');
    if (geology.waterIce > 0.1) resources.push('WATER_ICE');
    if ((planet as any).atmosphere?.oxygen > 0.1) resources.push('OXYGEN');

    return resources;
  }

  private selectGovernmentType(): string {
    const types = ['DEMOCRACY', 'AUTOCRACY', 'CORPORATE', 'MILITARY', 'TECHNOCRACY'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private createMarket(city: City): PlanetaryMarket {
    const market: PlanetaryMarket = {
      cityId: city.id,
      cityName: city.name,

      prices: new Map(),
      supply: new Map(),
      demand: new Map(),

      volatility: 0.1 + Math.random() * 0.2,
      liquidityIndex: 0.6 + Math.random() * 0.3,

      dailyVolume: 0,
      topExports: [],
      topImports: []
    };

    // Initialize prices based on production/consumption
    for (const [commodity, production] of city.production) {
      const consumption = city.consumption.get(commodity) || 0;
      const surplus = production - consumption;

      // Price based on supply/demand
      const basePrice = this.getBaseCommodityPrice(commodity);
      const priceMultiplier = surplus > 0 ? 0.8 : 1.2;

      market.prices.set(commodity, basePrice * priceMultiplier);
      market.supply.set(commodity, Math.max(0, surplus * 100)); // 100 days of surplus
      market.demand.set(commodity, Math.max(0, -surplus * 100)); // 100 days of deficit
    }

    return market;
  }

  private updateCity(city: City, deltaTime: number): void {
    const hoursElapsed = deltaTime / 3600;

    // Update population
    const growthPerHour = city.populationGrowthRate / (365 * 24);
    city.population *= (1 + growthPerHour / 100);

    // Update production based on happiness and infrastructure
    const productionMultiplier = (city.happiness / 100) * (1 - city.unemploymentRate / 100);

    for (const [commodity, baseProduction] of city.production) {
      const actual = baseProduction * productionMultiplier;
      city.production.set(commodity, actual);
    }

    // Update happiness based on conditions
    if (city.underSiege) city.happiness -= 0.1 * hoursElapsed;
    if (city.plagueActive) city.happiness -= 0.2 * hoursElapsed;
    if (city.inRecession) city.happiness -= 0.05 * hoursElapsed;
    if (city.celebrating) city.happiness += 0.1 * hoursElapsed;

    city.happiness = Math.max(0, Math.min(100, city.happiness));

    // Random events
    if (Math.random() < 0.001) { // 0.1% chance per update
      this.triggerCityEvent(city);
    }
  }

  private updateMarket(city: City): void {
    const market = this.markets.get(city.id);
    if (!market) return;

    // Update prices based on supply/demand
    for (const [commodity, price] of market.prices) {
      const supply = market.supply.get(commodity) || 0;
      const demand = market.demand.get(commodity) || 0;

      let newPrice = price;

      if (supply > demand * 2) {
        // Oversupply - price drops
        newPrice *= 0.99;
      } else if (demand > supply * 2) {
        // High demand - price rises
        newPrice *= 1.01;
      }

      // Add volatility
      newPrice *= (1 + (Math.random() - 0.5) * market.volatility);

      market.prices.set(commodity, Math.max(1, newPrice));
    }

    // Reset daily volume
    market.dailyVolume = 0;
  }

  private triggerCityEvent(city: City): void {
    const events = ['FESTIVAL', 'STRIKE', 'DISCOVERY', 'ACCIDENT'];
    const event = events[Math.floor(Math.random() * events.length)];

    switch (event) {
      case 'FESTIVAL':
        city.celebrating = true;
        setTimeout(() => { city.celebrating = false; }, 86400000); // 1 day
        break;

      case 'STRIKE':
        city.production.forEach((value, key) => {
          city.production.set(key, value * 0.5);
        });
        break;

      case 'DISCOVERY':
        city.gdp *= 1.1;
        city.happiness += 10;
        break;

      case 'ACCIDENT':
        city.happiness -= 5;
        city.crimeRate += 1;
        break;
    }
  }

  private getBaseCommodityPrice(commodity: string): number {
    const prices: { [key: string]: number } = {
      'FOOD': 10,
      'WATER': 5,
      'OXYGEN': 15,
      'IRON': 50,
      'RARE_EARTHS': 500,
      'ELECTRONICS': 200,
      'MANUFACTURED_GOODS': 100,
      'MEDICAL_SUPPLIES': 300,
      'POWER': 20
    };

    return prices[commodity] || 100;
  }
}
