/**
 * ResourceFlowVisualization.ts
 *
 * Visualization helpers and data structures for ResourceFlowTracker.
 * Provides ready-to-use data formats for frontend rendering.
 */

import { ResourceFlowTracker, FlowGraph, FlowGraphNode, FlowGraphEdge, Bottleneck } from './ResourceFlowTracker';
import { CommodityType } from './economy/commodity';

/**
 * D3.js-compatible node format
 */
export interface D3Node {
  id: string;
  label: string;
  type: 'STATION' | 'SHIP' | 'FACILITY';
  x?: number;
  y?: number;
  fx?: number; // Fixed x position
  fy?: number; // Fixed y position
  radius: number;
  color: string;
  borderColor?: string;
  borderWidth?: number;
  produces: CommodityType[];
  consumes: CommodityType[];
  isBottleneck: boolean;
  healthScore: number;
  tooltip?: string;
}

/**
 * D3.js-compatible link format
 */
export interface D3Link {
  source: string;
  target: string;
  commodity: CommodityType;
  volume: number;
  capacity: number;
  utilization: number;
  thickness: number;
  color: string;
  isBottleneck: boolean;
  animated?: boolean;
  dashArray?: string;
  tooltip?: string;
}

/**
 * Complete D3 graph
 */
export interface D3Graph {
  nodes: D3Node[];
  links: D3Link[];
}

/**
 * Heatmap data for resource flow intensity
 */
export interface FlowHeatmapData {
  stations: string[];
  commodities: CommodityType[];
  matrix: number[][]; // [station][commodity] = intensity (0-1)
  maxValue: number;
  minValue: number;
}

/**
 * Time series data for flow rates
 */
export interface FlowTimeSeriesData {
  commodity: CommodityType;
  route?: { from: string; to: string };
  dataPoints: Array<{
    timestamp: number;
    value: number;
  }>;
  average: number;
  peak: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
}

/**
 * Sankey diagram data
 */
export interface SankeyData {
  nodes: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  links: Array<{
    source: number; // Index in nodes array
    target: number; // Index in nodes array
    value: number;
    color?: string;
  }>;
}

/**
 * Bottleneck visualization data
 */
export interface BottleneckVisualizationData {
  stationId: string;
  commodities: Array<{
    commodity: CommodityType;
    severity: number;
    shortfall: number;
    color: string;
  }>;
  overallSeverity: number;
  position?: { x: number; y: number };
}

/**
 * Visualization Helper Class
 *
 * Converts ResourceFlowTracker data into visualization-ready formats.
 */
export class FlowVisualizationHelper {
  constructor(private flowTracker: ResourceFlowTracker) {}

  /**
   * Convert FlowGraph to D3.js format
   */
  toD3Graph(flowGraph: FlowGraph): D3Graph {
    const nodes: D3Node[] = flowGraph.nodes.map(node => ({
      id: node.id,
      label: node.label || node.id,
      type: node.type,
      radius: this.calculateNodeRadius(node),
      color: this.getNodeColor(node),
      borderColor: node.isBottleneck ? '#FF0000' : undefined,
      borderWidth: node.isBottleneck ? 3 : undefined,
      produces: node.produces,
      consumes: node.consumes,
      isBottleneck: node.isBottleneck,
      healthScore: node.healthScore,
      tooltip: this.generateNodeTooltip(node)
    }));

    const links: D3Link[] = flowGraph.edges.map(edge => ({
      source: edge.sourceId,
      target: edge.destinationId,
      commodity: edge.commodity,
      volume: edge.volume,
      capacity: edge.capacity,
      utilization: edge.utilization,
      thickness: edge.thickness,
      color: edge.isBottleneck ? '#FF0000' : edge.color,
      isBottleneck: edge.isBottleneck,
      animated: edge.isBottleneck,
      dashArray: edge.isBottleneck ? '5,5' : undefined,
      tooltip: this.generateEdgeTooltip(edge)
    }));

    return { nodes, links };
  }

  /**
   * Generate heatmap data for resource flow intensity
   */
  generateFlowHeatmap(
    stationIds: string[],
    commodities: CommodityType[],
    timeWindowHours: number = 24
  ): FlowHeatmapData {
    const matrix: number[][] = [];
    let maxValue = 0;
    let minValue = Infinity;

    for (let i = 0; i < stationIds.length; i++) {
      matrix[i] = [];
      const stationId = stationIds[i];
      const stats = this.flowTracker.getStationStats(stationId, timeWindowHours);

      for (let j = 0; j < commodities.length; j++) {
        const commodity = commodities[j];
        let intensity = 0;

        if (stats) {
          const production = stats.productionRate.get(commodity) || 0;
          const consumption = stats.consumptionRate.get(commodity) || 0;
          intensity = production + consumption; // Total activity
        }

        matrix[i][j] = intensity;
        maxValue = Math.max(maxValue, intensity);
        if (intensity > 0) {
          minValue = Math.min(minValue, intensity);
        }
      }
    }

    if (minValue === Infinity) minValue = 0;

    return {
      stations: stationIds,
      commodities,
      matrix,
      maxValue,
      minValue
    };
  }

  /**
   * Generate time series data for a commodity flow
   */
  generateTimeSeries(
    commodity: CommodityType,
    route?: { from: string; to: string },
    hoursBack: number = 24,
    dataPoints: number = 48
  ): FlowTimeSeriesData {
    const now = Date.now() / 1000;
    const timeStep = (hoursBack * 3600) / dataPoints;
    const points: Array<{ timestamp: number; value: number }> = [];

    let total = 0;
    let peak = 0;

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - ((dataPoints - i) * timeStep);
      const windowStart = timestamp;
      const windowEnd = timestamp + timeStep;

      // Calculate flow rate for this time window
      let value = 0;
      if (route) {
        value = this.calculateFlowRateInWindow(
          route.from,
          route.to,
          commodity,
          windowStart,
          windowEnd
        );
      } else {
        value = this.calculateTotalFlowInWindow(commodity, windowStart, windowEnd);
      }

      points.push({ timestamp, value });
      total += value;
      peak = Math.max(peak, value);
    }

    const average = total / dataPoints;

    // Determine trend (compare first half to second half)
    const midpoint = Math.floor(dataPoints / 2);
    const firstHalfAvg = points.slice(0, midpoint).reduce((sum, p) => sum + p.value, 0) / midpoint;
    const secondHalfAvg = points.slice(midpoint).reduce((sum, p) => sum + p.value, 0) / (dataPoints - midpoint);

    let trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'INCREASING';
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'DECREASING';
    } else {
      trend = 'STABLE';
    }

    return {
      commodity,
      route,
      dataPoints: points,
      average,
      peak,
      trend
    };
  }

  /**
   * Generate Sankey diagram data
   */
  generateSankeyDiagram(
    commodity: CommodityType,
    timeWindowHours: number = 24
  ): SankeyData {
    const flowGraph = this.flowTracker.getSupplyChainForCommodity(commodity, timeWindowHours);

    // Build node array
    const nodeMap = new Map<string, number>();
    const nodes: SankeyData['nodes'] = [];

    for (const node of flowGraph.nodes) {
      const index = nodes.length;
      nodeMap.set(node.id, index);
      nodes.push({
        id: node.id,
        name: node.label || node.id,
        color: this.getNodeColor(node)
      });
    }

    // Build links array
    const links: SankeyData['links'] = [];

    for (const edge of flowGraph.edges) {
      const sourceIndex = nodeMap.get(edge.sourceId);
      const targetIndex = nodeMap.get(edge.destinationId);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: edge.volume,
          color: edge.color
        });
      }
    }

    return { nodes, links };
  }

  /**
   * Generate bottleneck visualization data
   */
  generateBottleneckVisualization(timeWindowHours: number = 24): BottleneckVisualizationData[] {
    const bottlenecks = this.flowTracker.identifyBottlenecks(timeWindowHours);

    // Group by station
    const byStation = new Map<string, Bottleneck[]>();
    for (const bottleneck of bottlenecks) {
      if (!byStation.has(bottleneck.stationId)) {
        byStation.set(bottleneck.stationId, []);
      }
      byStation.get(bottleneck.stationId)!.push(bottleneck);
    }

    const result: BottleneckVisualizationData[] = [];

    for (const [stationId, stationBottlenecks] of byStation) {
      const commodities = stationBottlenecks.map(b => ({
        commodity: b.commodity,
        severity: b.severity,
        shortfall: b.shortfall,
        color: this.getSeverityColor(b.severity)
      }));

      const overallSeverity = stationBottlenecks.reduce((max, b) => Math.max(max, b.severity), 0);

      result.push({
        stationId,
        commodities,
        overallSeverity
      });
    }

    return result;
  }

  /**
   * Generate flow comparison data (compare multiple commodities or routes)
   */
  generateFlowComparison(
    comparisons: Array<{
      label: string;
      commodity: CommodityType;
      route?: { from: string; to: string };
    }>,
    timeWindowHours: number = 24
  ): Array<{
    label: string;
    value: number;
    percentage: number;
    color: string;
  }> {
    const values: Array<{ label: string; value: number; commodity: CommodityType }> = [];
    let total = 0;

    for (const comparison of comparisons) {
      let value = 0;

      if (comparison.route) {
        value = this.flowTracker.getFlowRate(
          comparison.route.from,
          comparison.route.to,
          comparison.commodity,
          timeWindowHours
        );
      } else {
        // Total flow for commodity
        const stats = this.flowTracker.getStationStats('all', timeWindowHours);
        // Simplified: just use first station's data for now
        // In production, you'd aggregate across all stations
        value = Math.random() * 1000; // Placeholder
      }

      values.push({ label: comparison.label, value, commodity: comparison.commodity });
      total += value;
    }

    return values.map(v => ({
      label: v.label,
      value: v.value,
      percentage: total > 0 ? (v.value / total) * 100 : 0,
      color: this.getCommodityColor(v.commodity)
    }));
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Calculate node radius based on activity
   */
  private calculateNodeRadius(node: FlowGraphNode): number {
    const baseRadius = 10;
    const activityMultiplier = (node.produces.length + node.consumes.length) * 5;
    return baseRadius + activityMultiplier;
  }

  /**
   * Get node color based on health and type
   */
  private getNodeColor(node: FlowGraphNode): string {
    if (node.isBottleneck) {
      return '#FF4444'; // Red for bottlenecks
    }

    const health = node.healthScore;
    if (health >= 0.8) return '#44FF44'; // Green - healthy
    if (health >= 0.6) return '#88FF44'; // Yellow-green
    if (health >= 0.4) return '#FFFF44'; // Yellow
    if (health >= 0.2) return '#FFAA44'; // Orange
    return '#FF4444'; // Red - unhealthy
  }

  /**
   * Get commodity color
   */
  private getCommodityColor(commodity: CommodityType): string {
    const colors: Record<string, string> = {
      'METALLIC_ORE': '#8B4513',
      'STEEL': '#808080',
      'ELECTRONICS': '#0000FF',
      'FOOD': '#90EE90',
      'WATER': '#00BFFF',
      'HYDROGEN_FUEL': '#FFFF00',
      // Add more as needed
    };

    return colors[commodity] || '#888888';
  }

  /**
   * Get severity color
   */
  private getSeverityColor(severity: number): string {
    if (severity >= 0.8) return '#FF0000'; // Critical - red
    if (severity >= 0.6) return '#FF6600'; // High - orange
    if (severity >= 0.4) return '#FFAA00'; // Medium - yellow-orange
    if (severity >= 0.2) return '#FFDD00'; // Low - yellow
    return '#FFFF88'; // Minor - light yellow
  }

  /**
   * Generate tooltip for node
   */
  private generateNodeTooltip(node: FlowGraphNode): string {
    const lines: string[] = [];
    lines.push(`Station: ${node.label || node.id}`);
    lines.push(`Type: ${node.type}`);
    lines.push(`Health: ${(node.healthScore * 100).toFixed(0)}%`);

    if (node.produces.length > 0) {
      lines.push(`Produces: ${node.produces.join(', ')}`);
    }

    if (node.consumes.length > 0) {
      lines.push(`Consumes: ${node.consumes.join(', ')}`);
    }

    if (node.isBottleneck) {
      lines.push('⚠️ BOTTLENECK DETECTED');
    }

    return lines.join('\n');
  }

  /**
   * Generate tooltip for edge
   */
  private generateEdgeTooltip(edge: FlowGraphEdge): string {
    const lines: string[] = [];
    lines.push(`Route: ${edge.sourceId} → ${edge.destinationId}`);
    lines.push(`Commodity: ${edge.commodity}`);
    lines.push(`Flow: ${edge.volume.toFixed(1)} kg/hour`);
    lines.push(`Capacity: ${edge.capacity.toFixed(1)} kg/hour`);
    lines.push(`Utilization: ${(edge.utilization * 100).toFixed(0)}%`);

    if (edge.isBottleneck) {
      lines.push('⚠️ BOTTLENECK - NEAR CAPACITY');
    }

    return lines.join('\n');
  }

  /**
   * Calculate flow rate in a time window
   */
  private calculateFlowRateInWindow(
    sourceId: string,
    destinationId: string,
    commodity: CommodityType,
    windowStart: number,
    windowEnd: number
  ): number {
    const events = this.flowTracker.getStationEvents(sourceId);
    let total = 0;

    for (const event of events) {
      if (
        event.timestamp >= windowStart &&
        event.timestamp < windowEnd &&
        event.commodity === commodity &&
        event.destinationId === destinationId
      ) {
        total += event.quantity;
      }
    }

    const windowHours = (windowEnd - windowStart) / 3600;
    return windowHours > 0 ? total / windowHours : 0;
  }

  /**
   * Calculate total flow for a commodity in a time window
   */
  private calculateTotalFlowInWindow(
    commodity: CommodityType,
    windowStart: number,
    windowEnd: number
  ): number {
    // This is a simplified placeholder
    // In production, you'd aggregate across all stations
    return Math.random() * 1000;
  }
}

/**
 * Example: Render ASCII visualization
 */
export function renderASCIIFlowGraph(flowTracker: ResourceFlowTracker, commodity: CommodityType): string {
  const graph = flowTracker.getSupplyChainForCommodity(commodity, 24);
  const lines: string[] = [];

  lines.push(`\n╔═══════════════════════════════════════════════════════╗`);
  lines.push(`║  Flow Graph: ${commodity.padEnd(42)} ║`);
  lines.push(`╚═══════════════════════════════════════════════════════╝\n`);

  // Nodes
  lines.push('Nodes:');
  for (const node of graph.nodes) {
    const health = '█'.repeat(Math.floor(node.healthScore * 10));
    const bottleneck = node.isBottleneck ? ' ⚠️' : '';
    lines.push(`  ${node.id.padEnd(20)} [${health.padEnd(10)}]${bottleneck}`);
  }

  lines.push('\nFlows:');
  for (const edge of graph.edges) {
    const thickness = '═'.repeat(Math.min(20, Math.ceil(edge.thickness)));
    const utilization = `${(edge.utilization * 100).toFixed(0)}%`.padStart(4);
    const volume = `${edge.volume.toFixed(0)} kg/h`.padStart(12);
    const bottleneck = edge.isBottleneck ? ' ⚠️' : '';
    lines.push(`  ${edge.sourceId} ${thickness}> ${edge.destinationId}`);
    lines.push(`    ${volume} (${utilization} capacity)${bottleneck}`);
  }

  return lines.join('\n');
}
