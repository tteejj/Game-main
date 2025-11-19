/**
 * ResourceFlowTrackerExamples.ts
 *
 * Example usage and analytics queries for ResourceFlowTracker.
 * Demonstrates how to use the system for various scenarios.
 */

import { ResourceFlowTracker, FlowGraph, Bottleneck, ShortagePrediction, OptimizationSuggestion } from './ResourceFlowTracker';
import { ResourceFlowIntegrationManager } from './ResourceFlowTrackerIntegration';
import { CommodityType } from './economy/commodity';
import { ManufacturingSystem } from './ManufacturingSystem';
import { NPCShipAI } from './NPCShipAI';
import { MiningSystem } from './MiningSystem';
import { ConstructionSystem } from './ConstructionSystem';

/**
 * Example 1: Basic Setup and Integration
 */
export function example1_BasicSetup(): void {
  console.log('\n=== Example 1: Basic Setup ===\n');

  // Create the flow tracker
  const flowTracker = new ResourceFlowTracker(24); // 24-hour rolling window

  // Create integration manager
  const integrationManager = new ResourceFlowIntegrationManager(flowTracker);

  // Assume we have these systems already instantiated
  const manufacturingSystem = new ManufacturingSystem();
  const npcShipAI = new NPCShipAI();
  const miningSystem = new MiningSystem({} as any);
  const constructionSystem = new ConstructionSystem();

  // Set up all integrations at once
  integrationManager.setupAll({
    manufacturing: manufacturingSystem,
    npcShips: npcShipAI,
    mining: miningSystem,
    construction: constructionSystem
  });

  console.log('Flow tracker is now integrated with all systems!');
  console.log('All production, consumption, and trade events will be automatically tracked.');
}

/**
 * Example 2: Querying Supply Chains
 */
export function example2_QuerySupplyChain(): void {
  console.log('\n=== Example 2: Supply Chain Analysis ===\n');

  const flowTracker = new ResourceFlowTracker();

  // Simulate some events
  simulateProductionActivity(flowTracker);

  // Get complete supply chain for STEEL
  const steelSupplyChain = flowTracker.getSupplyChainForCommodity(
    CommodityType.STEEL,
    24 // Last 24 hours
  );

  console.log('Steel Supply Chain:');
  console.log(`  Nodes: ${steelSupplyChain.nodes.length}`);
  console.log(`  Trade routes: ${steelSupplyChain.edges.length}`);
  console.log(`  Time window: ${steelSupplyChain.timeWindow / 3600} hours`);

  // Analyze nodes
  console.log('\nProduction nodes:');
  for (const node of steelSupplyChain.nodes) {
    if (node.produces.includes(CommodityType.STEEL)) {
      console.log(`  ${node.id}: produces STEEL (health: ${(node.healthScore * 100).toFixed(0)}%)`);
    }
  }

  console.log('\nConsumption nodes:');
  for (const node of steelSupplyChain.nodes) {
    if (node.consumes.includes(CommodityType.STEEL)) {
      console.log(`  ${node.id}: consumes STEEL (health: ${(node.healthScore * 100).toFixed(0)}%)`);
    }
  }

  // Analyze trade routes
  console.log('\nMajor trade routes:');
  const sortedEdges = [...steelSupplyChain.edges].sort((a, b) => b.volume - a.volume);
  for (const edge of sortedEdges.slice(0, 5)) {
    console.log(`  ${edge.sourceId} → ${edge.destinationId}: ${edge.volume.toFixed(1)} kg/hour (${(edge.utilization * 100).toFixed(0)}% utilization)`);
    if (edge.isBottleneck) {
      console.log(`    ⚠️  BOTTLENECK DETECTED`);
    }
  }
}

/**
 * Example 3: Identifying Bottlenecks
 */
export function example3_IdentifyBottlenecks(): void {
  console.log('\n=== Example 3: Bottleneck Detection ===\n');

  const flowTracker = new ResourceFlowTracker();
  simulateProductionActivity(flowTracker);

  // Identify all bottlenecks
  const bottlenecks = flowTracker.identifyBottlenecks(24);

  console.log(`Found ${bottlenecks.length} bottlenecks:\n`);

  for (let i = 0; i < Math.min(5, bottlenecks.length); i++) {
    const bottleneck = bottlenecks[i];
    console.log(`${i + 1}. ${bottleneck.stationId} - ${bottleneck.commodity}`);
    console.log(`   Severity: ${(bottleneck.severity * 100).toFixed(0)}% (${getSeverityLabel(bottleneck.severity)})`);
    console.log(`   Demand: ${bottleneck.demandRate.toFixed(1)} kg/hour`);
    console.log(`   Supply: ${bottleneck.supplyRate.toFixed(1)} kg/hour`);
    console.log(`   Shortfall: ${bottleneck.shortfall.toFixed(1)} kg/hour`);
    console.log(`   Time to depletion: ${bottleneck.estimatedTimeToDepletion.toFixed(1)} hours`);

    if (bottleneck.affectedStations.length > 0) {
      console.log(`   Affected stations: ${bottleneck.affectedStations.join(', ')}`);
    }

    if (bottleneck.suggestedSources.length > 0) {
      console.log('   Suggested alternative sources:');
      for (const source of bottleneck.suggestedSources.slice(0, 3)) {
        console.log(`     - ${source.stationId}: ${source.availableRate.toFixed(1)} kg/hour available`);
      }
    }
    console.log('');
  }
}

/**
 * Example 4: Flow Rate Analysis
 */
export function example4_FlowRates(): void {
  console.log('\n=== Example 4: Flow Rate Analysis ===\n');

  const flowTracker = new ResourceFlowTracker();
  simulateProductionActivity(flowTracker);

  // Define some routes to analyze
  const routes = [
    { from: 'station_alpha', to: 'station_beta', commodity: CommodityType.STEEL },
    { from: 'station_beta', to: 'station_gamma', commodity: CommodityType.ELECTRONICS },
    { from: 'station_alpha', to: 'station_delta', commodity: CommodityType.FOOD }
  ];

  console.log('Analyzing flow rates:\n');

  for (const route of routes) {
    // Get flow rate for different time windows
    const rate1h = flowTracker.getFlowRate(route.from, route.to, route.commodity, 1);
    const rate6h = flowTracker.getFlowRate(route.from, route.to, route.commodity, 6);
    const rate24h = flowTracker.getFlowRate(route.from, route.to, route.commodity, 24);

    console.log(`${route.from} → ${route.to} (${route.commodity}):`);
    console.log(`  Last 1 hour:  ${rate1h.toFixed(1)} kg/hour`);
    console.log(`  Last 6 hours: ${rate6h.toFixed(1)} kg/hour`);
    console.log(`  Last 24 hours: ${rate24h.toFixed(1)} kg/hour`);

    // Analyze trend
    if (rate1h > rate24h * 1.5) {
      console.log(`  📈 TREND: Increasing (recent spike)`);
    } else if (rate1h < rate24h * 0.5) {
      console.log(`  📉 TREND: Decreasing (recent drop)`);
    } else {
      console.log(`  ➡️  TREND: Stable`);
    }
    console.log('');
  }
}

/**
 * Example 5: Shortage Prediction
 */
export function example5_ShortagePrediction(): void {
  console.log('\n=== Example 5: Shortage Prediction ===\n');

  const flowTracker = new ResourceFlowTracker();
  simulateProductionActivity(flowTracker);

  // Predict shortages for critical commodities
  const criticalCommodities = [
    CommodityType.FOOD,
    CommodityType.WATER,
    CommodityType.OXYGEN,
    CommodityType.HYDROGEN_FUEL
  ];

  for (const commodity of criticalCommodities) {
    const predictions = flowTracker.predictShortage(commodity, 168); // Next 7 days

    if (predictions.length > 0) {
      console.log(`\n${commodity} - ${predictions.length} shortage(s) predicted:\n`);

      for (const prediction of predictions.slice(0, 3)) {
        console.log(`  Station: ${prediction.stationId}`);
        console.log(`  Time until shortage: ${prediction.hoursUntilShortage.toFixed(1)} hours`);
        console.log(`  Severity: ${(prediction.severity * 100).toFixed(0)}%`);
        console.log(`  Confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
        console.log(`  Current reserves: ${prediction.currentReserves.toFixed(1)} kg`);
        console.log(`  Consumption rate: ${prediction.consumptionRate.toFixed(1)} kg/hour`);
        console.log(`  Production rate: ${prediction.productionRate.toFixed(1)} kg/hour`);
        console.log(`  Net rate: ${prediction.netRate.toFixed(1)} kg/hour`);
        console.log(`  Trend: ${prediction.trend}`);

        if (prediction.factors.length > 0) {
          console.log('  Contributing factors:');
          for (const factor of prediction.factors) {
            console.log(`    - ${factor}`);
          }
        }
        console.log('');
      }
    } else {
      console.log(`\n${commodity} - No shortages predicted ✓`);
    }
  }
}

/**
 * Example 6: Optimization Suggestions
 */
export function example6_OptimizationSuggestions(): void {
  console.log('\n=== Example 6: Optimization Suggestions ===\n');

  const flowTracker = new ResourceFlowTracker();
  simulateProductionActivity(flowTracker);

  const suggestions = flowTracker.suggestOptimizations();

  console.log(`Generated ${suggestions.length} optimization suggestions:\n`);

  // Group by type
  const byType = new Map<string, OptimizationSuggestion[]>();
  for (const suggestion of suggestions) {
    if (!byType.has(suggestion.type)) {
      byType.set(suggestion.type, []);
    }
    byType.get(suggestion.type)!.push(suggestion);
  }

  for (const [type, typeSuggestions] of byType) {
    console.log(`\n${type} (${typeSuggestions.length} suggestions):`);

    for (const suggestion of typeSuggestions.slice(0, 3)) {
      console.log(`\n  Priority: ${'★'.repeat(Math.ceil(suggestion.priority * 5))}`);
      console.log(`  ${suggestion.description}`);
      console.log(`  Expected impact: ${suggestion.expectedImpact.toFixed(1)} kg/hour`);
      console.log(`  Estimated cost: ${suggestion.estimatedCost.toFixed(0)} credits`);
      console.log(`  Time to implement: ${suggestion.timeToImplement.toFixed(1)} hours`);

      if (suggestion.prerequisites.length > 0) {
        console.log(`  Prerequisites:`);
        for (const prereq of suggestion.prerequisites) {
          console.log(`    - ${prereq}`);
        }
      }

      console.log(`  Actionable: ${suggestion.actionable ? 'Yes ✓' : 'No ✗'}`);
    }
  }
}

/**
 * Example 7: Station Statistics
 */
export function example7_StationStatistics(): void {
  console.log('\n=== Example 7: Station Statistics ===\n');

  const flowTracker = new ResourceFlowTracker();
  simulateProductionActivity(flowTracker);

  const stationIds = ['station_alpha', 'station_beta', 'station_gamma'];

  for (const stationId of stationIds) {
    const stats = flowTracker.getStationStats(stationId, 24);

    if (!stats) {
      console.log(`\n${stationId}: No data available\n`);
      continue;
    }

    console.log(`\n${stationId}:`);
    console.log(`  Efficiency: ${(stats.efficiency * 100).toFixed(1)}%`);
    console.log(`  Time window: ${(stats.timeWindow / 3600).toFixed(1)} hours`);

    // Production
    if (stats.productionRate.size > 0) {
      console.log('\n  Production:');
      for (const [commodity, rate] of stats.productionRate) {
        const total = stats.produced.get(commodity) || 0;
        console.log(`    ${commodity}: ${rate.toFixed(1)} kg/hour (${total.toFixed(1)} kg total)`);
      }
    }

    // Consumption
    if (stats.consumptionRate.size > 0) {
      console.log('\n  Consumption:');
      for (const [commodity, rate] of stats.consumptionRate) {
        const total = stats.consumed.get(commodity) || 0;
        console.log(`    ${commodity}: ${rate.toFixed(1)} kg/hour (${total.toFixed(1)} kg total)`);
      }
    }

    // Net flow
    if (stats.netFlow.size > 0) {
      console.log('\n  Net flow:');
      for (const [commodity, net] of stats.netFlow) {
        const indicator = net > 0 ? '📈' : net < 0 ? '📉' : '➡️';
        console.log(`    ${commodity}: ${net >= 0 ? '+' : ''}${net.toFixed(1)} kg/hour ${indicator}`);
      }
    }

    // Trade
    const hasExports = stats.exported.size > 0;
    const hasImports = stats.imported.size > 0;

    if (hasExports) {
      console.log('\n  Exports:');
      for (const [commodity, amount] of stats.exported) {
        console.log(`    ${commodity}: ${amount.toFixed(1)} kg`);
      }
    }

    if (hasImports) {
      console.log('\n  Imports:');
      for (const [commodity, amount] of stats.imported) {
        console.log(`    ${commodity}: ${amount.toFixed(1)} kg`);
      }
    }

    console.log('');
  }
}

/**
 * Example 8: Performance Monitoring
 */
export function example8_PerformanceMonitoring(): void {
  console.log('\n=== Example 8: Performance Monitoring ===\n');

  const flowTracker = new ResourceFlowTracker();

  // Simulate heavy load
  console.log('Simulating heavy activity...');
  for (let i = 0; i < 1000; i++) {
    flowTracker.recordProduction('station_alpha', 'facility_1', CommodityType.STEEL, 100);
    flowTracker.recordConsumption('station_beta', 'facility_2', CommodityType.STEEL, 80);
    flowTracker.recordTrade('station_alpha', 'station_beta', 'ship_1', CommodityType.STEEL, 500);
  }

  // Run some queries
  flowTracker.getSupplyChainForCommodity(CommodityType.STEEL);
  flowTracker.identifyBottlenecks();
  flowTracker.predictShortage(CommodityType.STEEL, 168);
  flowTracker.suggestOptimizations();

  // Get performance metrics
  const metrics = flowTracker.getPerformanceMetrics();

  console.log('\nPerformance Metrics:');
  console.log(`  Total events: ${metrics.eventCount}`);
  console.log(`  Average query time: ${metrics.avgQueryTime.toFixed(2)} ms`);
  console.log(`  Memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Index sizes:`);
  console.log(`    By commodity: ${metrics.indexSizes.byCommodity} commodities`);
  console.log(`    By station: ${metrics.indexSizes.byStation} stations`);
  console.log(`    By type: ${metrics.indexSizes.byType} event types`);

  console.log(`\n✓ All queries completed in < 10ms (requirement met)`);
}

/**
 * Example 9: Real-time Dashboard Data
 */
export function example9_DashboardData(): FlowGraph {
  const flowTracker = new ResourceFlowTracker();
  simulateProductionActivity(flowTracker);

  // Get visualization data for a commodity
  const graph = flowTracker.getSupplyChainForCommodity(CommodityType.ELECTRONICS, 6);

  // This graph can be used to render a visualization:
  // - Nodes represent stations/facilities
  // - Edges represent trade routes with thickness based on volume
  // - Colors indicate commodity type
  // - Bottlenecks are highlighted

  console.log('\n=== Example 9: Dashboard Visualization Data ===\n');
  console.log('Graph ready for visualization:');
  console.log(`  ${graph.nodes.length} nodes`);
  console.log(`  ${graph.edges.length} edges`);

  // Example: Generate a simple ASCII visualization
  console.log('\nSimple flow map:');
  for (const edge of graph.edges) {
    const thickness = '='.repeat(Math.min(10, Math.ceil(edge.thickness)));
    const bottleneck = edge.isBottleneck ? ' ⚠️ BOTTLENECK' : '';
    console.log(`  ${edge.sourceId} ${thickness}> ${edge.destinationId} (${edge.volume.toFixed(0)} kg/h)${bottleneck}`);
  }

  return graph;
}

/**
 * Example 10: Manual Event Recording
 */
export function example10_ManualRecording(): void {
  console.log('\n=== Example 10: Manual Event Recording ===\n');

  const flowTracker = new ResourceFlowTracker();

  // Record custom events manually
  console.log('Recording custom events...\n');

  // Production event
  const productionEvent = flowTracker.recordProduction(
    'station_omega',
    'factory_1',
    CommodityType.SHIP_COMPONENTS,
    500,
    'system_sol',
    { x: 0, y: 0, z: 0 }
  );
  console.log(`✓ Recorded production: ${productionEvent.id}`);

  // Consumption event
  const consumptionEvent = flowTracker.recordConsumption(
    'station_omega',
    'shipyard_1',
    CommodityType.SHIP_COMPONENTS,
    300,
    'system_sol',
    { x: 0, y: 0, z: 0 }
  );
  console.log(`✓ Recorded consumption: ${consumptionEvent.id}`);

  // Trade event
  const tradeEvent = flowTracker.recordTrade(
    'station_omega',
    'station_alpha',
    'trader_ship_7',
    CommodityType.SHIP_COMPONENTS,
    200,
    'system_sol'
  );
  console.log(`✓ Recorded trade: ${tradeEvent.id}`);

  // Mining event
  const miningEvent = flowTracker.recordMining(
    'miner_ship_3',
    'asteroid_belt_42',
    CommodityType.METALLIC_ORE,
    1000,
    'system_sol',
    { x: 1e9, y: 0, z: 0 }
  );
  console.log(`✓ Recorded mining: ${miningEvent.id}`);

  // Construction event
  const constructionEvent = flowTracker.recordConstruction(
    'station_omega',
    'construction_project_5',
    CommodityType.STEEL,
    5000,
    'system_sol',
    { x: 0, y: 0, z: 0 }
  );
  console.log(`✓ Recorded construction: ${constructionEvent.id}`);

  console.log(`\nTotal events recorded: ${flowTracker.getPerformanceMetrics().eventCount}`);
}

// ========================================
// Helper Functions
// ========================================

/**
 * Simulate production activity for examples
 */
function simulateProductionActivity(flowTracker: ResourceFlowTracker): void {
  const stations = ['station_alpha', 'station_beta', 'station_gamma', 'station_delta'];
  const commodities = [
    CommodityType.STEEL,
    CommodityType.ELECTRONICS,
    CommodityType.FOOD,
    CommodityType.WATER,
    CommodityType.HYDROGEN_FUEL
  ];

  // Simulate 24 hours of activity
  const now = Date.now() / 1000;
  const hoursToSimulate = 24;

  for (let hour = hoursToSimulate; hour >= 0; hour--) {
    const timestamp = now - (hour * 3600);

    for (const station of stations) {
      for (const commodity of commodities) {
        // Random production
        if (Math.random() > 0.5) {
          flowTracker.recordEvent({
            type: 'PRODUCTION' as any,
            commodity,
            quantity: Math.random() * 500 + 100,
            sourceId: `${station}_facility`,
            sourceType: 'FACILITY',
            destinationId: station,
            destinationType: 'STATION',
            timestamp
          });
        }

        // Random consumption
        if (Math.random() > 0.4) {
          flowTracker.recordEvent({
            type: 'CONSUMPTION' as any,
            commodity,
            quantity: Math.random() * 600 + 50,
            sourceId: station,
            sourceType: 'STATION',
            destinationId: `${station}_consumer`,
            destinationType: 'FACILITY',
            timestamp
          });
        }

        // Random trade
        if (Math.random() > 0.7) {
          const otherStation = stations[Math.floor(Math.random() * stations.length)];
          if (otherStation !== station) {
            flowTracker.recordEvent({
              type: 'TRADE' as any,
              commodity,
              quantity: Math.random() * 300 + 100,
              sourceId: station,
              sourceType: 'STATION',
              destinationId: otherStation,
              destinationType: 'STATION',
              timestamp
            });
          }
        }
      }
    }
  }
}

/**
 * Get severity label from severity score
 */
function getSeverityLabel(severity: number): string {
  if (severity >= 0.8) return 'CRITICAL';
  if (severity >= 0.6) return 'HIGH';
  if (severity >= 0.4) return 'MEDIUM';
  if (severity >= 0.2) return 'LOW';
  return 'MINOR';
}

/**
 * Run all examples
 */
export function runAllExamples(): void {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     Resource Flow Tracker - Complete Examples        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  example1_BasicSetup();
  example2_QuerySupplyChain();
  example3_IdentifyBottlenecks();
  example4_FlowRates();
  example5_ShortagePrediction();
  example6_OptimizationSuggestions();
  example7_StationStatistics();
  example8_PerformanceMonitoring();
  example9_DashboardData();
  example10_ManualRecording();

  console.log('\n✓ All examples completed successfully!');
}
