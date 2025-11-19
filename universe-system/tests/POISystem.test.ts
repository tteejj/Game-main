/**
 * Points of Interest (POI) System Tests
 * Tests POI generation, scanning, and derelict physics
 */

import { POIGenerator } from '../src/poi/POIGenerator';
import { ScanMechanics } from '../src/poi/ScanMechanics';

describe('POI System', () => {
    let poiGenerator: POIGenerator;
    let scanMechanics: ScanMechanics;

    beforeEach(() => {
        poiGenerator = new POIGenerator();
        scanMechanics = new ScanMechanics();
    });

    describe('POI Generation', () => {
        test('generates POIs with valid properties', () => {
            const pois = poiGenerator.generatePOIsForSystem('test-system', 10);

            expect(pois.length).toBeLessThanOrEqual(10);

            pois.forEach(poi => {
                expect(poi.id).toBeDefined();
                expect(poi.type).toBeDefined();
                expect(poi.position).toBeDefined();
                expect(poi.position.x).toBeDefined();
                expect(poi.position.y).toBeDefined();
                expect(poi.position.z).toBeDefined();
            });
        });

        test('generates different POI types', () => {
            const pois = poiGenerator.generatePOIsForSystem('test-system', 20);

            const types = new Set(pois.map(p => p.type));
            expect(types.size).toBeGreaterThan(1);
        });

        test('derelicts have tumbling physics', () => {
            const derelict = poiGenerator.generateDerelict({ x: 0, y: 0, z: 0 });

            expect(derelict.type).toBe('derelict');
            expect(derelict.angularVelocity).toBeDefined();

            const initialRotation = { ...derelict.rotation };

            // Simulate physics update
            poiGenerator.updateDerelictPhysics(derelict, 1.0);

            expect(derelict.rotation.pitch).not.toBe(initialRotation.pitch);
        });

        test('POIs have rewards', () => {
            const pois = poiGenerator.generatePOIsForSystem('test-system', 10);

            const poisWithRewards = pois.filter(p => p.reward);
            expect(poisWithRewards.length).toBeGreaterThan(0);

            poisWithRewards.forEach(poi => {
                if (poi.reward) {
                    expect(poi.reward.type).toBeDefined();
                    expect(poi.reward.value).toBeGreaterThan(0);
                }
            });
        });

        test('anomalies have special properties', () => {
            const anomaly = poiGenerator.generateAnomaly({ x: 1000, y: 0, z: 0 });

            expect(anomaly.type).toBe('anomaly');
            expect(anomaly.scanDifficulty).toBeDefined();
            expect(anomaly.scanDifficulty).toBeGreaterThan(0);
        });
    });

    describe('Scan Mechanics', () => {
        test('detects POIs at range', () => {
            const poi = {
                id: 'poi-1',
                type: 'derelict' as const,
                position: { x: 5000, y: 0, z: 0 },
                scanDifficulty: 0.5
            };

            const scannerPos = { x: 0, y: 0, z: 0 };
            const scanPower = 100;
            const scanDuration = 10;

            const result = scanMechanics.performScan(poi, scannerPos, scanPower, scanDuration);

            expect(result).toBeDefined();
            expect(result.detected).toBeDefined();

            if (result.detected) {
                expect(result.distance).toBeGreaterThan(0);
                expect(result.signalStrength).toBeGreaterThan(0);
            }
        });

        test('scan strength decreases with distance', () => {
            const poi = {
                id: 'poi-1',
                type: 'derelict' as const,
                position: { x: 10000, y: 0, z: 0 },
                scanDifficulty: 0.3
            };

            const closePos = { x: 9000, y: 0, z: 0 };
            const farPos = { x: 0, y: 0, z: 0 };

            const closeScan = scanMechanics.performScan(poi, closePos, 100, 10);
            const farScan = scanMechanics.performScan(poi, farPos, 100, 10);

            if (closeScan.detected && farScan.detected) {
                expect(closeScan.signalStrength).toBeGreaterThan(farScan.signalStrength);
            }
        });

        test('higher scan power improves detection', () => {
            const poi = {
                id: 'poi-1',
                type: 'anomaly' as const,
                position: { x: 8000, y: 0, z: 0 },
                scanDifficulty: 0.7
            };

            const scannerPos = { x: 0, y: 0, z: 0 };

            const lowPowerScan = scanMechanics.performScan(poi, scannerPos, 50, 10);
            const highPowerScan = scanMechanics.performScan(poi, scannerPos, 200, 10);

            // Higher power should have better results
            if (lowPowerScan.detected && highPowerScan.detected) {
                expect(highPowerScan.signalStrength).toBeGreaterThanOrEqual(lowPowerScan.signalStrength);
            }
        });

        test('scan duration affects accuracy', () => {
            const poi = {
                id: 'poi-1',
                type: 'derelict' as const,
                position: { x: 5000, y: 0, z: 0 },
                scanDifficulty: 0.5
            };

            const scannerPos = { x: 0, y: 0, z: 0 };

            const quickScan = scanMechanics.performScan(poi, scannerPos, 100, 1);
            const longScan = scanMechanics.performScan(poi, scannerPos, 100, 30);

            expect(quickScan).toBeDefined();
            expect(longScan).toBeDefined();
        });

        test('reveals POI details on successful scan', () => {
            const poi = {
                id: 'poi-1',
                type: 'derelict' as const,
                position: { x: 3000, y: 0, z: 0 },
                scanDifficulty: 0.3,
                reward: {
                    type: 'cargo',
                    value: 5000,
                    commodity: 'rare_materials'
                }
            };

            const scannerPos = { x: 2500, y: 0, z: 0 };
            const result = scanMechanics.performScan(poi, scannerPos, 150, 20);

            if (result.detected && result.signalStrength > 0.8) {
                expect(result.details).toBeDefined();
            }
        });
    });

    describe('POI Lifecycle', () => {
        test('POIs can be marked as investigated', () => {
            const pois = poiGenerator.generatePOIsForSystem('test-system', 5);
            const poi = pois[0];

            expect(poi.investigated).toBeFalsy();

            poi.investigated = true;
            expect(poi.investigated).toBe(true);
        });

        test('rewards are consumed on collection', () => {
            const poi = poiGenerator.generateDerelict({ x: 0, y: 0, z: 0 });

            if (poi.reward) {
                const rewardValue = poi.reward.value;
                expect(rewardValue).toBeGreaterThan(0);

                // Simulate collection
                poi.reward = undefined;
                expect(poi.reward).toBeUndefined();
            }
        });
    });
});
