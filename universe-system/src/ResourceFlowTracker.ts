/**
 * ResourceFlowTracker.ts
 *
 * Comprehensive resource flow tracking for the economy.
 * Tracks commodity flows between stations, identifies bottlenecks,
 * and provides supply chain analytics.
 *
 * Features:
 * - Real-time flow tracking
 * - Source/sink identification
 * - Bottleneck detection
 * - Flow rate calculation
 * - Supply chain health analysis
 * - Memory-efficient rolling window (24 hours)
 * - Fast querying (< 10ms)
 */

import { CommodityType } from './economy/commodity';
import { Vector3 } from './CelestialBody';

/**
 * Flow event types
 */
export enum FlowEventType {
  PRODUCTION = 'PRODUCTION',      // Commodity produced
  CONSUMPTION = 'CONSUMPTION',    // Commodity consumed
  TRADE = 'TRADE',                // Commodity traded between stations
  MINING = 'MINING',              // Ore extracted
  REFINING = 'REFINING',          // Ore refined into commodity
  CONSTRUCTION = 'CONSTRUCTION',  // Material used in construction
  TRANSFER = 'TRANSFER'           // Direct transfer between entities
}

/**
 * Flow event record
 */
export interface FlowEvent {
  id: string;
  timestamp: number;              // Unix timestamp (seconds)
  type: FlowEventType;
  commodity: CommodityType;
  quantity: number;               // kg

  // Source and destination
  sourceId?: string;              // Station/ship/facility ID
  sourceType?: 'STATION' | 'SHIP' | 'FACILITY' | 'ASTEROID';
  destinationId?: string;
  destinationType?: 'STATION' | 'SHIP' | 'FACILITY' | 'MARKET';

  // Context
  systemId?: string;              // Star system ID
  location?: Vector3;
  metadata?: Record<string, any>; // Additional context
}

/**
 * Flow summary for a commodity route
 */
export interface FlowSummary {
  commodity: CommodityType;
  sourceId: string;
  destinationId: string;

  // Flow metrics
  totalVolume: number;            // kg over time window
  averageRate: number;            // kg/hour
  peakRate: number;               // kg/hour (highest observed)
  eventCount: number;

  // Time window
  firstEvent: number;             // timestamp
  lastEvent: number;              // timestamp
  timeSpan: number;               // seconds
}

/**
 * Station production/consumption stats
 */
export interface StationFlowStats {
  stationId: string;

  // Production
  produced: Map<CommodityType, number>;      // commodity -> total kg produced
  productionRate: Map<CommodityType, number>; // commodity -> kg/hour

  // Consumption
  consumed: Map<CommodityType, number>;      // commodity -> total kg consumed
  consumptionRate: Map<CommodityType, number>; // commodity -> kg/hour

  // Net flow (production - consumption)
  netFlow: Map<CommodityType, number>;       // commodity -> kg/hour (+/-)

  // Trade
  exported: Map<CommodityType, number>;      // kg sent to other stations
  imported: Map<CommodityType, number>;      // kg received from other stations

  // Efficiency
  efficiency: number;             // 0-1 (how well supply meets demand)
  timeWindow: number;             // seconds covered by these stats
}

/**
 * Bottleneck identification
 */
export interface Bottleneck {
  stationId: string;
  commodity: CommodityType;
  severity: number;               // 0-1 (1 = critical shortage)

  // Shortage details
  demandRate: number;             // kg/hour needed
  supplyRate: number;             // kg/hour available
  shortfall: number;              // kg/hour deficit

  // Impact
  affectedStations: string[];     // Stations dependent on this supply
  estimatedTimeToDepletion: number; // hours until reserves exhausted

  // Recommendations
  suggestedSources: Array<{
    stationId: string;
    availableRate: number;        // kg/hour they can provide
    distance: number;             // arbitrary distance metric
  }>;
}

/**
 * Supply chain visualization node
 */
export interface FlowGraphNode {
  id: string;
  type: 'STATION' | 'SHIP' | 'FACILITY';
  label: string;

  // Production/consumption for this node
  produces: CommodityType[];
  consumes: CommodityType[];

  // Current state
  isBottleneck: boolean;
  healthScore: number;            // 0-1 (1 = healthy)
}

/**
 * Supply chain visualization edge
 */
export interface FlowGraphEdge {
  id: string;
  sourceId: string;
  destinationId: string;
  commodity: CommodityType;

  // Flow metrics
  volume: number;                 // kg/hour
  capacity: number;               // kg/hour (max sustainable)
  utilization: number;            // 0-1 (volume / capacity)

  // Visual properties
  thickness: number;              // Visual weight (based on volume)
  color: string;                  // Color code (based on commodity/health)
  isBottleneck: boolean;
}

/**
 * Supply chain graph for visualization
 */
export interface FlowGraph {
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];

  // Metadata
  commodity?: CommodityType;      // If filtered to one commodity
  timeWindow: number;             // seconds
  generatedAt: number;            // timestamp
}

/**
 * Shortage prediction
 */
export interface ShortagePrediction {
  commodity: CommodityType;
  stationId: string;

  // Prediction
  predictedShortageTime: number;  // timestamp when shortage expected
  hoursUntilShortage: number;
  severity: number;               // 0-1
  confidence: number;             // 0-1 (prediction confidence)

  // Current state
  currentReserves: number;        // kg
  consumptionRate: number;        // kg/hour
  productionRate: number;         // kg/hour
  netRate: number;                // kg/hour (production - consumption)

  // Factors
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  factors: string[];              // Contributing factors
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  type: 'INCREASE_PRODUCTION' | 'REDUCE_CONSUMPTION' | 'ESTABLISH_TRADE_ROUTE' | 'BUILD_FACILITY' | 'STOCKPILE';
  priority: number;               // 0-1 (1 = critical)

  // Target
  stationId?: string;
  commodity: CommodityType;

  // Details
  description: string;
  expectedImpact: number;         // kg/hour improvement
  estimatedCost: number;          // credits
  timeToImplement: number;        // hours

  // Implementation
  actionable: boolean;
  prerequisites: string[];
}

/**
 * Resource Flow Tracker
 *
 * Central system for tracking all commodity flows in the economy.
 * Maintains a rolling window of flow events and provides analytics.
 */
export class ResourceFlowTracker {
  // Flow event storage (rolling window)
  private events: FlowEvent[] = [];
  private eventIdCounter: number = 0;

  // Indexing for fast queries (O(1) lookups)
  private eventsByCommodity: Map<CommodityType, FlowEvent[]> = new Map();
  private eventsByStation: Map<string, FlowEvent[]> = new Map();
  private eventsByType: Map<FlowEventType, FlowEvent[]> = new Map();

  // Aggregated statistics (cached, updated incrementally)
  private stationStats: Map<string, StationFlowStats> = new Map();
  private flowSummaries: Map<string, FlowSummary> = new Map(); // key: "source->dest->commodity"

  // Configuration
  private readonly maxAgeHours: number = 24;
  private readonly maxEvents: number = 100000;
  private lastCleanup: number = Date.now() / 1000;

  // Performance tracking
  private queryCount: number = 0;
  private totalQueryTime: number = 0;

  constructor(maxAgeHours: number = 24) {
    this.maxAgeHours = maxAgeHours;
  }

  /**
   * Record a flow event
   *
   * @param event - Flow event to record (without id and timestamp if not provided)
   * @returns Generated event with id and timestamp
   */
  recordEvent(event: Omit<FlowEvent, 'id' | 'timestamp'> & Partial<Pick<FlowEvent, 'id' | 'timestamp'>>): FlowEvent {
    const now = Date.now() / 1000;

    const fullEvent: FlowEvent = {
      id: event.id || `flow_${this.eventIdCounter++}_${Date.now()}`,
      timestamp: event.timestamp || now,
      ...event
    };

    // Add to main storage
    this.events.push(fullEvent);

    // Add to indices
    this.indexEvent(fullEvent);

    // Update aggregated statistics
    this.updateStationStats(fullEvent);
    this.updateFlowSummary(fullEvent);

    // Cleanup old events periodically (every 5 minutes)
    if (now - this.lastCleanup > 300) {
      this.cleanup();
      this.lastCleanup = now;
    }

    return fullEvent;
  }

  /**
   * Record production event
   */
  recordProduction(
    stationId: string,
    facilityId: string,
    commodity: CommodityType,
    quantity: number,
    systemId?: string,
    location?: Vector3
  ): FlowEvent {
    return this.recordEvent({
      type: FlowEventType.PRODUCTION,
      commodity,
      quantity,
      sourceId: facilityId,
      sourceType: 'FACILITY',
      destinationId: stationId,
      destinationType: 'STATION',
      systemId,
      location,
      metadata: { facilityId }
    });
  }

  /**
   * Record consumption event
   */
  recordConsumption(
    stationId: string,
    facilityId: string,
    commodity: CommodityType,
    quantity: number,
    systemId?: string,
    location?: Vector3
  ): FlowEvent {
    return this.recordEvent({
      type: FlowEventType.CONSUMPTION,
      commodity,
      quantity,
      sourceId: stationId,
      sourceType: 'STATION',
      destinationId: facilityId,
      destinationType: 'FACILITY',
      systemId,
      location,
      metadata: { facilityId }
    });
  }

  /**
   * Record trade event
   */
  recordTrade(
    fromStationId: string,
    toStationId: string,
    shipId: string,
    commodity: CommodityType,
    quantity: number,
    systemId?: string
  ): FlowEvent {
    return this.recordEvent({
      type: FlowEventType.TRADE,
      commodity,
      quantity,
      sourceId: fromStationId,
      sourceType: 'STATION',
      destinationId: toStationId,
      destinationType: 'STATION',
      systemId,
      metadata: { shipId }
    });
  }

  /**
   * Record mining event
   */
  recordMining(
    shipId: string,
    asteroidId: string,
    commodity: CommodityType,
    quantity: number,
    systemId?: string,
    location?: Vector3
  ): FlowEvent {
    return this.recordEvent({
      type: FlowEventType.MINING,
      commodity,
      quantity,
      sourceId: asteroidId,
      sourceType: 'ASTEROID',
      destinationId: shipId,
      destinationType: 'SHIP',
      systemId,
      location,
      metadata: { asteroidId }
    });
  }

  /**
   * Record construction consumption event
   */
  recordConstruction(
    stationId: string,
    projectId: string,
    commodity: CommodityType,
    quantity: number,
    systemId?: string,
    location?: Vector3
  ): FlowEvent {
    return this.recordEvent({
      type: FlowEventType.CONSTRUCTION,
      commodity,
      quantity,
      sourceId: stationId,
      sourceType: 'STATION',
      destinationId: projectId,
      destinationType: 'FACILITY',
      systemId,
      location,
      metadata: { projectId }
    });
  }

  /**
   * Get supply chain for a commodity
   *
   * Returns complete flow map showing all sources, sinks, and trade routes.
   */
  getSupplyChainForCommodity(commodity: CommodityType, timeWindowHours: number = 24): FlowGraph {
    const startTime = performance.now();

    const events = this.eventsByCommodity.get(commodity) || [];
    const cutoff = Date.now() / 1000 - (timeWindowHours * 3600);
    const recentEvents = events.filter(e => e.timestamp >= cutoff);

    // Build nodes and edges
    const nodeMap = new Map<string, FlowGraphNode>();
    const edgeMap = new Map<string, FlowGraphEdge>();

    for (const event of recentEvents) {
      // Create/update nodes
      if (event.sourceId) {
        this.ensureNode(nodeMap, event.sourceId, event.sourceType || 'STATION', commodity);
      }
      if (event.destinationId) {
        this.ensureNode(nodeMap, event.destinationId, event.destinationType || 'STATION', commodity);
      }

      // Create/update edges
      if (event.sourceId && event.destinationId) {
        const edgeKey = `${event.sourceId}->${event.destinationId}->${commodity}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            id: edgeKey,
            sourceId: event.sourceId,
            destinationId: event.destinationId,
            commodity,
            volume: 0,
            capacity: 0,
            utilization: 0,
            thickness: 1,
            color: this.getCommodityColor(commodity),
            isBottleneck: false
          });
        }
        const edge = edgeMap.get(edgeKey)!;
        edge.volume += event.quantity;
      }
    }

    // Calculate edge metrics
    const hoursInWindow = Math.min(timeWindowHours, this.maxAgeHours);
    for (const edge of edgeMap.values()) {
      edge.volume = edge.volume / hoursInWindow; // Convert to kg/hour
      edge.capacity = edge.volume * 2; // Assume 50% utilization is nominal
      edge.utilization = edge.volume / edge.capacity;
      edge.thickness = Math.log10(edge.volume + 1); // Log scale for visibility
      edge.isBottleneck = edge.utilization > 0.9;
    }

    // Identify bottleneck nodes
    const bottlenecks = this.identifyBottlenecks(timeWindowHours);
    const bottleneckStations = new Set(bottlenecks.map(b => b.stationId));

    for (const node of nodeMap.values()) {
      node.isBottleneck = bottleneckStations.has(node.id);
      node.healthScore = node.isBottleneck ? 0.3 : 0.8;
    }

    const graph: FlowGraph = {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
      commodity,
      timeWindow: hoursInWindow * 3600,
      generatedAt: Date.now() / 1000
    };

    this.recordQueryTime(performance.now() - startTime);
    return graph;
  }

  /**
   * Identify bottlenecks in the supply chain
   *
   * Returns stations experiencing critical shortages.
   */
  identifyBottlenecks(timeWindowHours: number = 24): Bottleneck[] {
    const startTime = performance.now();
    const bottlenecks: Bottleneck[] = [];

    for (const [stationId, stats] of this.stationStats) {
      for (const [commodity, consumptionRate] of stats.consumptionRate) {
        const productionRate = stats.productionRate.get(commodity) || 0;
        const importRate = this.getImportRate(stationId, commodity, timeWindowHours);
        const supplyRate = productionRate + importRate;
        const demandRate = consumptionRate;

        // Bottleneck: demand exceeds supply by > 20%
        if (demandRate > supplyRate * 1.2) {
          const shortfall = demandRate - supplyRate;
          const severity = Math.min(1, shortfall / demandRate);

          // Estimate time to depletion (requires reserves data, use heuristic)
          const estimatedReserves = supplyRate * 24; // Assume 24 hours of reserves
          const netConsumption = demandRate - supplyRate;
          const timeToDepletion = netConsumption > 0 ? estimatedReserves / netConsumption : Infinity;

          bottlenecks.push({
            stationId,
            commodity,
            severity,
            demandRate,
            supplyRate,
            shortfall,
            affectedStations: this.getAffectedStations(stationId, commodity),
            estimatedTimeToDepletion: timeToDepletion,
            suggestedSources: this.findAlternativeSources(stationId, commodity, shortfall)
          });
        }
      }
    }

    // Sort by severity
    bottlenecks.sort((a, b) => b.severity - a.severity);

    this.recordQueryTime(performance.now() - startTime);
    return bottlenecks;
  }

  /**
   * Get flow rate between source and destination
   *
   * @returns kg/hour
   */
  getFlowRate(sourceId: string, destinationId: string, commodity: CommodityType, timeWindowHours: number = 1): number {
    const startTime = performance.now();

    const key = `${sourceId}->${destinationId}->${commodity}`;
    const summary = this.flowSummaries.get(key);

    if (!summary) {
      this.recordQueryTime(performance.now() - startTime);
      return 0;
    }

    // Recalculate for specific time window
    const cutoff = Date.now() / 1000 - (timeWindowHours * 3600);
    const commodityEvents = this.eventsByCommodity.get(commodity) || [];
    const relevantEvents = commodityEvents.filter(e =>
      e.timestamp >= cutoff &&
      e.sourceId === sourceId &&
      e.destinationId === destinationId
    );

    const totalVolume = relevantEvents.reduce((sum, e) => sum + e.quantity, 0);
    const rate = totalVolume / timeWindowHours;

    this.recordQueryTime(performance.now() - startTime);
    return rate;
  }

  /**
   * Predict shortages for a commodity
   */
  predictShortage(commodity: CommodityType, timeframeHours: number = 168): ShortagePrediction[] {
    const startTime = performance.now();
    const predictions: ShortagePrediction[] = [];

    for (const [stationId, stats] of this.stationStats) {
      const consumptionRate = stats.consumptionRate.get(commodity) || 0;
      const productionRate = stats.productionRate.get(commodity) || 0;
      const netRate = productionRate - consumptionRate;

      // Only predict shortages (negative net rate)
      if (netRate >= 0) continue;

      // Estimate current reserves (heuristic: 48 hours of consumption)
      const estimatedReserves = consumptionRate * 48;
      const hoursUntilDepletion = estimatedReserves / Math.abs(netRate);

      if (hoursUntilDepletion <= timeframeHours) {
        // Analyze trend
        const trend = this.analyzeTrend(stationId, commodity);
        const severity = Math.min(1, 1 - (hoursUntilDepletion / timeframeHours));
        const confidence = this.calculatePredictionConfidence(stationId, commodity);

        predictions.push({
          commodity,
          stationId,
          predictedShortageTime: Date.now() / 1000 + (hoursUntilDepletion * 3600),
          hoursUntilShortage: hoursUntilDepletion,
          severity,
          confidence,
          currentReserves: estimatedReserves,
          consumptionRate,
          productionRate,
          netRate,
          trend,
          factors: this.identifyShortageFactors(stationId, commodity, stats)
        });
      }
    }

    // Sort by urgency
    predictions.sort((a, b) => a.hoursUntilShortage - b.hoursUntilShortage);

    this.recordQueryTime(performance.now() - startTime);
    return predictions;
  }

  /**
   * Suggest optimizations for supply chain efficiency
   */
  suggestOptimizations(): OptimizationSuggestion[] {
    const startTime = performance.now();
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze bottlenecks
    const bottlenecks = this.identifyBottlenecks();

    for (const bottleneck of bottlenecks) {
      // Suggest increasing production
      if (bottleneck.suggestedSources.length > 0) {
        const bestSource = bottleneck.suggestedSources[0];
        suggestions.push({
          type: 'ESTABLISH_TRADE_ROUTE',
          priority: bottleneck.severity,
          stationId: bottleneck.stationId,
          commodity: bottleneck.commodity,
          description: `Establish trade route from ${bestSource.stationId} to ${bottleneck.stationId} for ${bottleneck.commodity}`,
          expectedImpact: Math.min(bottleneck.shortfall, bestSource.availableRate),
          estimatedCost: bestSource.distance * 100,
          timeToImplement: bestSource.distance / 100,
          actionable: true,
          prerequisites: []
        });
      } else {
        // No sources available, suggest building production
        suggestions.push({
          type: 'BUILD_FACILITY',
          priority: bottleneck.severity,
          stationId: bottleneck.stationId,
          commodity: bottleneck.commodity,
          description: `Build production facility for ${bottleneck.commodity} at ${bottleneck.stationId}`,
          expectedImpact: bottleneck.shortfall,
          estimatedCost: 100000,
          timeToImplement: 24,
          actionable: true,
          prerequisites: ['Available construction materials', 'Station capacity']
        });
      }
    }

    // Identify inefficient production (excess production with low utilization)
    for (const [stationId, stats] of this.stationStats) {
      for (const [commodity, productionRate] of stats.productionRate) {
        const consumptionRate = stats.consumptionRate.get(commodity) || 0;
        const exportRate = this.getExportRate(stationId, commodity);
        const utilization = (consumptionRate + exportRate) / productionRate;

        if (utilization < 0.5 && productionRate > 100) {
          suggestions.push({
            type: 'REDUCE_CONSUMPTION',
            priority: 0.3,
            stationId,
            commodity,
            description: `Reduce production of ${commodity} at ${stationId} (only ${(utilization * 100).toFixed(0)}% utilized)`,
            expectedImpact: productionRate * (1 - utilization),
            estimatedCost: 0,
            timeToImplement: 0,
            actionable: true,
            prerequisites: []
          });
        }
      }
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority);

    this.recordQueryTime(performance.now() - startTime);
    return suggestions.slice(0, 20); // Top 20 suggestions
  }

  /**
   * Get station flow statistics
   */
  getStationStats(stationId: string, timeWindowHours: number = 24): StationFlowStats | null {
    const startTime = performance.now();

    // Rebuild stats for specific time window
    const stats = this.buildStationStats(stationId, timeWindowHours);

    this.recordQueryTime(performance.now() - startTime);
    return stats;
  }

  /**
   * Get all flow events for a station
   */
  getStationEvents(stationId: string, timeWindowHours: number = 24): FlowEvent[] {
    const startTime = performance.now();

    const events = this.eventsByStation.get(stationId) || [];
    const cutoff = Date.now() / 1000 - (timeWindowHours * 3600);
    const result = events.filter(e => e.timestamp >= cutoff);

    this.recordQueryTime(performance.now() - startTime);
    return result;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    eventCount: number;
    avgQueryTime: number;
    memoryUsage: number;
    indexSizes: {
      byCommodity: number;
      byStation: number;
      byType: number;
    };
  } {
    return {
      eventCount: this.events.length,
      avgQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      memoryUsage: this.estimateMemoryUsage(),
      indexSizes: {
        byCommodity: this.eventsByCommodity.size,
        byStation: this.eventsByStation.size,
        byType: this.eventsByType.size
      }
    };
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Index event for fast lookups
   */
  private indexEvent(event: FlowEvent): void {
    // Index by commodity
    if (!this.eventsByCommodity.has(event.commodity)) {
      this.eventsByCommodity.set(event.commodity, []);
    }
    this.eventsByCommodity.get(event.commodity)!.push(event);

    // Index by station
    if (event.sourceId) {
      if (!this.eventsByStation.has(event.sourceId)) {
        this.eventsByStation.set(event.sourceId, []);
      }
      this.eventsByStation.get(event.sourceId)!.push(event);
    }
    if (event.destinationId && event.destinationId !== event.sourceId) {
      if (!this.eventsByStation.has(event.destinationId)) {
        this.eventsByStation.set(event.destinationId, []);
      }
      this.eventsByStation.get(event.destinationId)!.push(event);
    }

    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, []);
    }
    this.eventsByType.get(event.type)!.push(event);
  }

  /**
   * Update station statistics incrementally
   */
  private updateStationStats(event: FlowEvent): void {
    // Update source station
    if (event.sourceId && event.sourceType === 'STATION') {
      this.updateStationStatsForEvent(event.sourceId, event, 'source');
    }

    // Update destination station
    if (event.destinationId && event.destinationType === 'STATION') {
      this.updateStationStatsForEvent(event.destinationId, event, 'destination');
    }
  }

  /**
   * Update station stats for a specific event
   */
  private updateStationStatsForEvent(stationId: string, event: FlowEvent, role: 'source' | 'destination'): void {
    if (!this.stationStats.has(stationId)) {
      this.stationStats.set(stationId, {
        stationId,
        produced: new Map(),
        productionRate: new Map(),
        consumed: new Map(),
        consumptionRate: new Map(),
        netFlow: new Map(),
        exported: new Map(),
        imported: new Map(),
        efficiency: 1.0,
        timeWindow: this.maxAgeHours * 3600
      });
    }

    const stats = this.stationStats.get(stationId)!;

    // Update based on event type and role
    if (event.type === FlowEventType.PRODUCTION && role === 'destination') {
      const current = stats.produced.get(event.commodity) || 0;
      stats.produced.set(event.commodity, current + event.quantity);
    } else if (event.type === FlowEventType.CONSUMPTION && role === 'source') {
      const current = stats.consumed.get(event.commodity) || 0;
      stats.consumed.set(event.commodity, current + event.quantity);
    } else if (event.type === FlowEventType.TRADE) {
      if (role === 'source') {
        const current = stats.exported.get(event.commodity) || 0;
        stats.exported.set(event.commodity, current + event.quantity);
      } else {
        const current = stats.imported.get(event.commodity) || 0;
        stats.imported.set(event.commodity, current + event.quantity);
      }
    }

    // Rates will be recalculated during cleanup/query
  }

  /**
   * Update flow summary
   */
  private updateFlowSummary(event: FlowEvent): void {
    if (!event.sourceId || !event.destinationId) return;

    const key = `${event.sourceId}->${event.destinationId}->${event.commodity}`;

    if (!this.flowSummaries.has(key)) {
      this.flowSummaries.set(key, {
        commodity: event.commodity,
        sourceId: event.sourceId,
        destinationId: event.destinationId,
        totalVolume: 0,
        averageRate: 0,
        peakRate: 0,
        eventCount: 0,
        firstEvent: event.timestamp,
        lastEvent: event.timestamp,
        timeSpan: 0
      });
    }

    const summary = this.flowSummaries.get(key)!;
    summary.totalVolume += event.quantity;
    summary.eventCount++;
    summary.lastEvent = event.timestamp;
    summary.timeSpan = summary.lastEvent - summary.firstEvent;

    if (summary.timeSpan > 0) {
      summary.averageRate = summary.totalVolume / (summary.timeSpan / 3600);
    }
  }

  /**
   * Clean up old events (beyond rolling window)
   */
  private cleanup(): void {
    const cutoff = Date.now() / 1000 - (this.maxAgeHours * 3600);
    const initialCount = this.events.length;

    // Remove old events from main array
    this.events = this.events.filter(e => e.timestamp >= cutoff);

    // Rebuild indices (simpler than trying to incrementally update)
    this.rebuildIndices();

    // Recalculate station stats
    this.recalculateStationStats();

    // Limit total events
    if (this.events.length > this.maxEvents) {
      const excess = this.events.length - this.maxEvents;
      this.events = this.events.slice(excess);
      this.rebuildIndices();
      this.recalculateStationStats();
    }

    const removed = initialCount - this.events.length;
    if (removed > 0) {
      console.log(`[ResourceFlowTracker] Cleanup: removed ${removed} old events, ${this.events.length} remaining`);
    }
  }

  /**
   * Rebuild all indices
   */
  private rebuildIndices(): void {
    this.eventsByCommodity.clear();
    this.eventsByStation.clear();
    this.eventsByType.clear();

    for (const event of this.events) {
      this.indexEvent(event);
    }
  }

  /**
   * Recalculate all station statistics
   */
  private recalculateStationStats(): void {
    this.stationStats.clear();
    this.flowSummaries.clear();

    for (const event of this.events) {
      this.updateStationStats(event);
      this.updateFlowSummary(event);
    }

    // Calculate rates
    const timeWindowSeconds = this.maxAgeHours * 3600;
    for (const stats of this.stationStats.values()) {
      // Production rates
      for (const [commodity, total] of stats.produced) {
        stats.productionRate.set(commodity, (total / timeWindowSeconds) * 3600);
      }

      // Consumption rates
      for (const [commodity, total] of stats.consumed) {
        stats.consumptionRate.set(commodity, (total / timeWindowSeconds) * 3600);
      }

      // Net flow
      const allCommodities = new Set([
        ...stats.productionRate.keys(),
        ...stats.consumptionRate.keys()
      ]);

      for (const commodity of allCommodities) {
        const production = stats.productionRate.get(commodity) || 0;
        const consumption = stats.consumptionRate.get(commodity) || 0;
        stats.netFlow.set(commodity, production - consumption);
      }

      // Efficiency: ratio of supply meeting demand
      let totalDemand = 0;
      let totalMet = 0;
      for (const [commodity, demand] of stats.consumptionRate) {
        const supply = stats.productionRate.get(commodity) || 0;
        totalDemand += demand;
        totalMet += Math.min(demand, supply);
      }
      stats.efficiency = totalDemand > 0 ? totalMet / totalDemand : 1.0;
    }
  }

  /**
   * Build station stats for a specific time window
   */
  private buildStationStats(stationId: string, timeWindowHours: number): StationFlowStats | null {
    const cutoff = Date.now() / 1000 - (timeWindowHours * 3600);
    const events = (this.eventsByStation.get(stationId) || []).filter(e => e.timestamp >= cutoff);

    if (events.length === 0) return null;

    const stats: StationFlowStats = {
      stationId,
      produced: new Map(),
      productionRate: new Map(),
      consumed: new Map(),
      consumptionRate: new Map(),
      netFlow: new Map(),
      exported: new Map(),
      imported: new Map(),
      efficiency: 1.0,
      timeWindow: timeWindowHours * 3600
    };

    // Aggregate events
    for (const event of events) {
      if (event.type === FlowEventType.PRODUCTION && event.destinationId === stationId) {
        const current = stats.produced.get(event.commodity) || 0;
        stats.produced.set(event.commodity, current + event.quantity);
      } else if (event.type === FlowEventType.CONSUMPTION && event.sourceId === stationId) {
        const current = stats.consumed.get(event.commodity) || 0;
        stats.consumed.set(event.commodity, current + event.quantity);
      } else if (event.type === FlowEventType.TRADE) {
        if (event.sourceId === stationId) {
          const current = stats.exported.get(event.commodity) || 0;
          stats.exported.set(event.commodity, current + event.quantity);
        } else if (event.destinationId === stationId) {
          const current = stats.imported.get(event.commodity) || 0;
          stats.imported.set(event.commodity, current + event.quantity);
        }
      }
    }

    // Calculate rates (kg/hour)
    for (const [commodity, total] of stats.produced) {
      stats.productionRate.set(commodity, total / timeWindowHours);
    }
    for (const [commodity, total] of stats.consumed) {
      stats.consumptionRate.set(commodity, total / timeWindowHours);
    }

    // Net flow
    const allCommodities = new Set([
      ...stats.productionRate.keys(),
      ...stats.consumptionRate.keys()
    ]);

    for (const commodity of allCommodities) {
      const production = stats.productionRate.get(commodity) || 0;
      const consumption = stats.consumptionRate.get(commodity) || 0;
      stats.netFlow.set(commodity, production - consumption);
    }

    return stats;
  }

  /**
   * Ensure node exists in graph
   */
  private ensureNode(
    nodeMap: Map<string, FlowGraphNode>,
    id: string,
    type: 'STATION' | 'SHIP' | 'FACILITY',
    commodity: CommodityType
  ): void {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        type,
        label: id,
        produces: [],
        consumes: [],
        isBottleneck: false,
        healthScore: 1.0
      });
    }

    const node = nodeMap.get(id)!;

    // Track what this node produces/consumes
    const stats = this.stationStats.get(id);
    if (stats) {
      for (const c of stats.productionRate.keys()) {
        if (c === commodity && !node.produces.includes(c)) {
          node.produces.push(c);
        }
      }
      for (const c of stats.consumptionRate.keys()) {
        if (c === commodity && !node.consumes.includes(c)) {
          node.consumes.push(c);
        }
      }
    }
  }

  /**
   * Get commodity color for visualization
   */
  private getCommodityColor(commodity: CommodityType): string {
    const colors: Record<string, string> = {
      // Raw materials - earth tones
      'METALLIC_ORE': '#8B4513',
      'ROCKY_ORE': '#A0522D',
      'ICE': '#87CEEB',
      'RARE_EARTH': '#FFD700',
      'PLATINUM': '#E5E4E2',
      'URANIUM': '#00FF00',

      // Refined materials - metallics
      'STEEL': '#808080',
      'TITANIUM': '#C0C0C0',
      'ALUMINUM': '#DCDCDC',
      'SILICON': '#4169E1',
      'COPPER': '#B87333',
      'CARBON_FIBER': '#000000',

      // Manufactured goods - blues
      'ELECTRONICS': '#0000FF',
      'MACHINERY': '#000080',
      'SHIP_COMPONENTS': '#4682B4',
      'TOOLS': '#6495ED',
      'CONSTRUCTION_MATERIALS': '#708090',

      // Food & supplies - greens/blues
      'FOOD': '#90EE90',
      'WATER': '#00BFFF',
      'OXYGEN': '#AFEEEE',
      'MEDICAL_SUPPLIES': '#FF6347',

      // Luxury - purples
      'JEWELRY': '#9370DB',
      'ART': '#8B008B',
      'RARE_ARTIFACTS': '#FF00FF',
      'ENTERTAINMENT': '#DA70D6',

      // Technology - reds
      'COMPUTER_SYSTEMS': '#FF0000',
      'SENSORS': '#DC143C',
      'WEAPONS': '#8B0000',
      'SHIELD_GENERATORS': '#FF4500',

      // Fuel - yellows
      'HYDROGEN_FUEL': '#FFFF00',
      'FUSION_PELLETS': '#FFD700',
      'ANTIMATTER': '#FF1493'
    };

    return colors[commodity] || '#888888';
  }

  /**
   * Get import rate for a station and commodity
   */
  private getImportRate(stationId: string, commodity: CommodityType, timeWindowHours: number): number {
    const stats = this.stationStats.get(stationId);
    if (!stats) return 0;

    const totalImported = stats.imported.get(commodity) || 0;
    return (totalImported / this.maxAgeHours) * (this.maxAgeHours / timeWindowHours);
  }

  /**
   * Get export rate for a station and commodity
   */
  private getExportRate(stationId: string, commodity: CommodityType): number {
    const stats = this.stationStats.get(stationId);
    if (!stats) return 0;

    const totalExported = stats.exported.get(commodity) || 0;
    return totalExported / this.maxAgeHours;
  }

  /**
   * Get stations affected by a bottleneck
   */
  private getAffectedStations(bottleneckStationId: string, commodity: CommodityType): string[] {
    const affected: string[] = [];

    // Find stations that import this commodity from the bottleneck station
    for (const [key, summary] of this.flowSummaries) {
      if (summary.sourceId === bottleneckStationId && summary.commodity === commodity) {
        affected.push(summary.destinationId);
      }
    }

    return affected;
  }

  /**
   * Find alternative sources for a commodity
   */
  private findAlternativeSources(
    demandStationId: string,
    commodity: CommodityType,
    requiredRate: number
  ): Array<{ stationId: string; availableRate: number; distance: number }> {
    const sources: Array<{ stationId: string; availableRate: number; distance: number }> = [];

    for (const [stationId, stats] of this.stationStats) {
      if (stationId === demandStationId) continue;

      const productionRate = stats.productionRate.get(commodity) || 0;
      const consumptionRate = stats.consumptionRate.get(commodity) || 0;
      const exportRate = this.getExportRate(stationId, commodity);
      const availableRate = productionRate - consumptionRate - exportRate;

      if (availableRate > 0) {
        sources.push({
          stationId,
          availableRate,
          distance: Math.random() * 100 // TODO: Calculate actual distance
        });
      }
    }

    // Sort by availability (descending)
    sources.sort((a, b) => b.availableRate - a.availableRate);

    return sources.slice(0, 5); // Top 5 sources
  }

  /**
   * Analyze trend for a commodity at a station
   */
  private analyzeTrend(stationId: string, commodity: CommodityType): 'IMPROVING' | 'STABLE' | 'DEGRADING' {
    const events = this.eventsByStation.get(stationId) || [];
    const commodityEvents = events.filter(e => e.commodity === commodity);

    if (commodityEvents.length < 10) return 'STABLE';

    // Split into two halves and compare net flow
    const midpoint = Math.floor(commodityEvents.length / 2);
    const firstHalf = commodityEvents.slice(0, midpoint);
    const secondHalf = commodityEvents.slice(midpoint);

    const calcNetFlow = (events: FlowEvent[]) => {
      let production = 0;
      let consumption = 0;
      for (const e of events) {
        if (e.type === FlowEventType.PRODUCTION && e.destinationId === stationId) production += e.quantity;
        if (e.type === FlowEventType.CONSUMPTION && e.sourceId === stationId) consumption += e.quantity;
      }
      return production - consumption;
    };

    const firstNetFlow = calcNetFlow(firstHalf);
    const secondNetFlow = calcNetFlow(secondHalf);

    if (secondNetFlow > firstNetFlow * 1.1) return 'IMPROVING';
    if (secondNetFlow < firstNetFlow * 0.9) return 'DEGRADING';
    return 'STABLE';
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(stationId: string, commodity: CommodityType): number {
    const events = (this.eventsByStation.get(stationId) || []).filter(e => e.commodity === commodity);

    // More events = higher confidence
    const eventConfidence = Math.min(1, events.length / 100);

    // Recent events = higher confidence
    const now = Date.now() / 1000;
    const recentEvents = events.filter(e => now - e.timestamp < 3600).length;
    const recencyConfidence = Math.min(1, recentEvents / 10);

    return (eventConfidence + recencyConfidence) / 2;
  }

  /**
   * Identify factors contributing to shortage
   */
  private identifyShortageFactors(stationId: string, commodity: CommodityType, stats: StationFlowStats): string[] {
    const factors: string[] = [];

    const productionRate = stats.productionRate.get(commodity) || 0;
    const consumptionRate = stats.consumptionRate.get(commodity) || 0;
    const importRate = this.getImportRate(stationId, commodity, this.maxAgeHours);

    if (productionRate === 0) {
      factors.push('No local production');
    } else if (productionRate < consumptionRate * 0.5) {
      factors.push('Insufficient local production');
    }

    if (importRate === 0 && productionRate < consumptionRate) {
      factors.push('No import routes established');
    } else if (importRate > 0 && importRate < consumptionRate - productionRate) {
      factors.push('Import volume insufficient');
    }

    if (consumptionRate > productionRate * 2) {
      factors.push('High consumption rate');
    }

    const trend = this.analyzeTrend(stationId, commodity);
    if (trend === 'DEGRADING') {
      factors.push('Worsening trend');
    }

    return factors;
  }

  /**
   * Record query time for performance tracking
   */
  private recordQueryTime(milliseconds: number): void {
    this.queryCount++;
    this.totalQueryTime += milliseconds;
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    // Each event: ~200 bytes
    // Each index entry: ~50 bytes
    const eventMemory = this.events.length * 200;
    const indexMemory = (
      this.eventsByCommodity.size +
      this.eventsByStation.size +
      this.eventsByType.size
    ) * 50;
    const statsMemory = this.stationStats.size * 500;
    const summaryMemory = this.flowSummaries.size * 150;

    return eventMemory + indexMemory + statsMemory + summaryMemory;
  }
}
