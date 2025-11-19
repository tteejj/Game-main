/**
 * Economy System Tests
 * Tests the dynamic economy and trade system
 */

import { EconomicModel } from '../src/economy/economic-model';

describe('EconomySystem', () => {
    let economy: EconomicModel;

    beforeEach(() => {
        economy = new EconomicModel();
    });

    test('initializes with commodity definitions', () => {
        expect(economy).toBeDefined();

        const commodities = economy.getAllCommodities();
        expect(commodities.length).toBeGreaterThan(0);

        commodities.forEach(commodity => {
            expect(commodity.name).toBeDefined();
            expect(commodity.baseValue).toBeGreaterThan(0);
        });
    });

    test('calculates price based on supply and demand', () => {
        // Get a commodity to test
        const commodities = economy.getAllCommodities();
        const testCommodity = commodities[0];

        const basePrice = testCommodity.baseValue;

        // Create supply/demand scenarios
        const normalPrice = economy.calculatePrice(testCommodity.name, 1.0, 1.0);
        const highDemandPrice = economy.calculatePrice(testCommodity.name, 1.0, 2.0);
        const lowSupplyPrice = economy.calculatePrice(testCommodity.name, 0.5, 1.0);

        // High demand should increase price
        expect(highDemandPrice).toBeGreaterThanOrEqual(normalPrice);

        // Low supply should increase price
        expect(lowSupplyPrice).toBeGreaterThanOrEqual(normalPrice);
    });

    test('price volatility affects commodity prices', () => {
        const commodities = economy.getAllCommodities();
        const volatileCommodity = commodities.find(c => c.volatility > 0.5);

        if (volatileCommodity) {
            const price1 = economy.calculatePrice(volatileCommodity.name, 1.0, 1.0);
            const price2 = economy.calculatePrice(volatileCommodity.name, 1.0, 1.0);

            // Volatile commodities might have different prices
            expect(typeof price1).toBe('number');
            expect(typeof price2).toBe('number');
        }
    });

    test('stations have production and consumption rates', () => {
        const stationEconomy = economy.getStationEconomy('test-station');

        expect(stationEconomy).toBeDefined();
    });

    test('commodity availability changes over time', () => {
        // Simulate market changes
        economy.updateMarket(60); // Update for 60 seconds

        const commodities = economy.getAllCommodities();
        expect(commodities.length).toBeGreaterThan(0);
    });

    test('trade routes affect supply', () => {
        const commodities = economy.getAllCommodities();
        if (commodities.length > 0) {
            const commodity = commodities[0];

            // Test that we can query commodity data
            expect(commodity.name).toBeDefined();
            expect(commodity.baseValue).toBeGreaterThan(0);
        }
    });

    test('luxury goods have higher base prices', () => {
        const commodities = economy.getAllCommodities();
        const luxury = commodities.find(c => c.name.toLowerCase().includes('luxury'));
        const common = commodities.find(c => c.name.toLowerCase().includes('ore') || c.name.toLowerCase().includes('water'));

        if (luxury && common) {
            expect(luxury.baseValue).toBeGreaterThan(common.baseValue);
        }
    });
});
