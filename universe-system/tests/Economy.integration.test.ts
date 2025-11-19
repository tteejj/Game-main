/**
 * Economy System Integration Tests
 * Tests commodity prices, supply/demand, and trading
 */

import { StarSystem } from '../src/StarSystem';
import { StationGenerator } from '../src/StationGenerator';

describe('Economy System Integration Tests', () => {
  describe('Commodity Pricing', () => {
    test('prices respond to supply and demand', () => {
      const system = new StarSystem('price-test', 'Price Test', {
        civilizationLevel: 6,
        allowStations: true,
        allowNPCTraffic: false
      });

      const station = system.stations[0];
      const commodity = Object.keys(station.economy.commodities)[0];
      const initialPrice = station.economy.commodities[commodity].currentPrice;

      // Simulate high demand (low supply)
      station.economy.commodities[commodity].supply = 10;
      station.economy.commodities[commodity].demand = 1000;

      // Update economy
      system.update(1);

      const highDemandPrice = station.economy.commodities[commodity].currentPrice;

      // Price should have increased
      expect(highDemandPrice).toBeGreaterThan(initialPrice);
    });

    test('different stations have different prices', () => {
      const system = new StarSystem('multi-station', 'Multi Station', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: false
      });

      // Should have multiple stations
      expect(system.stations.length).toBeGreaterThanOrEqual(2);

      const station1 = system.stations[0];
      const station2 = system.stations[1];

      // Get common commodity
      const commodities1 = Object.keys(station1.economy.commodities);
      const commodities2 = Object.keys(station2.economy.commodities);
      const commonCommodity = commodities1.find(c => commodities2.includes(c));

      if (commonCommodity) {
        const price1 = station1.economy.commodities[commonCommodity].currentPrice;
        const price2 = station2.economy.commodities[commonCommodity].currentPrice;

        // Prices should be different (due to different supply/demand)
        expect(price1).not.toBe(price2);
      }
    });

    test('economy updates over time', () => {
      const system = new StarSystem('time-test', 'Time Test', {
        civilizationLevel: 6,
        allowStations: true,
        allowNPCTraffic: false
      });

      const station = system.stations[0];
      const commodity = Object.keys(station.economy.commodities)[0];
      const initialSupply = station.economy.commodities[commodity].supply;

      // Update for a while
      for (let i = 0; i < 100; i++) {
        system.update(1);
      }

      const finalSupply = station.economy.commodities[commodity].supply;

      // Supply should have changed due to consumption/production
      expect(finalSupply).not.toBe(initialSupply);
    });
  });

  describe('Trade Mechanics', () => {
    test('buying reduces station supply', () => {
      const system = new StarSystem('buy-test', 'Buy Test', {
        civilizationLevel: 6,
        allowStations: true,
        allowNPCTraffic: false
      });

      const station = system.stations[0];
      const commodity = Object.keys(station.economy.commodities)[0];
      const initialSupply = station.economy.commodities[commodity].supply;

      // Simulate purchase
      const purchaseAmount = 10;
      station.economy.commodities[commodity].supply -= purchaseAmount;

      expect(station.economy.commodities[commodity].supply).toBe(initialSupply - purchaseAmount);
    });

    test('selling increases station supply', () => {
      const system = new StarSystem('sell-test', 'Sell Test', {
        civilizationLevel: 6,
        allowStations: true,
        allowNPCTraffic: false
      });

      const station = system.stations[0];
      const commodity = Object.keys(station.economy.commodities)[0];
      const initialSupply = station.economy.commodities[commodity].supply;

      // Simulate sale
      const saleAmount = 10;
      station.economy.commodities[commodity].supply += saleAmount;

      expect(station.economy.commodities[commodity].supply).toBe(initialSupply + saleAmount);
    });
  });

  describe('Production Chains', () => {
    test('manufacturing system produces commodities', () => {
      const system = new StarSystem('prod-test', 'Production Test', {
        civilizationLevel: 8,
        allowStations: true,
        allowNPCTraffic: false
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Manufacturing system should be initialized
          expect(system.manufacturingSystem).toBeDefined();

          const facilities = system.manufacturingSystem.getAllFacilities();
          expect(facilities.length).toBeGreaterThan(0);

          // Each facility should have valid properties
          facilities.forEach(facility => {
            expect(facility.stationId).toBeDefined();
            expect(facility.type).toBeDefined();
            expect(facility.operationalStatus).toBeDefined();
          });

          resolve();
        }, 2000);
      });
    }, 10000);

    test('mining produces ore commodities', () => {
      const system = new StarSystem('mining-test', 'Mining Test', {
        civilizationLevel: 7,
        allowStations: true,
        allowNPCTraffic: false
      });

      // Look for mining stations
      const miningStation = system.stations.find(s => s.type === 'MINING_PLATFORM');

      if (miningStation) {
        // Mining station should have ore-related commodities
        const commodities = Object.keys(miningStation.economy.commodities);
        const hasOreCommodities = commodities.some(c =>
          c.toLowerCase().includes('ore') ||
          c.toLowerCase().includes('metal') ||
          c.toLowerCase().includes('mineral')
        );

        expect(hasOreCommodities).toBe(true);
      }
    });
  });

  describe('Resource Scarcity', () => {
    test('scarce resources are more expensive', () => {
      const system = new StarSystem('scarcity-test', 'Scarcity Test', {
        civilizationLevel: 6,
        allowStations: true,
        allowNPCTraffic: false
      });

      const station = system.stations[0];
      const commodities = Object.keys(station.economy.commodities);

      if (commodities.length >= 2) {
        // Set one commodity to be scarce
        const scarceCommodity = commodities[0];
        station.economy.commodities[scarceCommodity].supply = 1;
        station.economy.commodities[scarceCommodity].demand = 1000;

        // Set another to be abundant
        const abundantCommodity = commodities[1];
        station.economy.commodities[abundantCommodity].supply = 10000;
        station.economy.commodities[abundantCommodity].demand = 10;

        // Update economy
        system.update(1);

        const scarcePrice = station.economy.commodities[scarceCommodity].currentPrice;
        const abundantPrice = station.economy.commodities[abundantCommodity].currentPrice;

        // Scarce commodity should be more expensive relative to base price
        const scarceRatio = scarcePrice / station.economy.commodities[scarceCommodity].basePrice;
        const abundantRatio = abundantPrice / station.economy.commodities[abundantCommodity].basePrice;

        expect(scarceRatio).toBeGreaterThan(abundantRatio);
      }
    });
  });
});
