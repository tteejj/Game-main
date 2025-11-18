/**
 * relay-network.ts
 * Communication relay network with routing
 *
 * Implements:
 * - Network topology management
 * - Dijkstra's algorithm for shortest path routing
 * - Signal relay through satellites and stations
 * - Network congestion tracking
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';
import { SignalPropagation, SignalTransmission, FrequencyBand, getFrequencyForBand } from './signal-propagation';

/**
 * Network node (station, satellite, ship)
 */
export interface NetworkNode {
  id: string;
  position: Vector3;
  transmitPower: number; // Watts
  antenna: {
    gain: number; // dBi
    frequency: number; // Hz
  };
  maxConnections: number;
  isRelay: boolean; // Can relay messages
}

/**
 * Network link between two nodes
 */
export interface NetworkLink {
  fromNodeId: string;
  toNodeId: string;
  signalQuality: number; // 0-1
  latencyMs: number;
  bandwidthBps: number;
  congestion: number; // 0-1
}

/**
 * Routing table entry
 */
export interface RouteEntry {
  destination: string;
  nextHop: string;
  cost: number;
  hops: number;
  path: string[];
}

/**
 * Message route
 */
export interface MessageRoute {
  path: string[]; // Node IDs
  totalLatencyMs: number;
  totalHops: number;
  quality: number; // Worst link quality
  success: boolean;
}

/**
 * Relay Network
 *
 * Manages communication network topology and routing using
 * Dijkstra's algorithm for shortest path.
 */
export class RelayNetwork {
  private nodes: Map<string, NetworkNode> = new Map();
  private links: Map<string, NetworkLink> = new Map();
  private signalPropagation: SignalPropagation;

  // Routing cache
  private routingTable: Map<string, Map<string, RouteEntry>> = new Map();
  private routingTableDirty: boolean = true;

  // Performance settings
  private maxRoutingDistance: number = 1e10; // 10 million km
  private routingUpdateInterval: number = 10; // seconds
  private timeSinceRoutingUpdate: number = 0;

  constructor(maxRoutingDistance: number = 1e10) {
    this.signalPropagation = new SignalPropagation();
    this.maxRoutingDistance = maxRoutingDistance;
  }

  /**
   * Add node to network
   */
  public addNode(node: NetworkNode): void {
    this.nodes.set(node.id, node);
    this.routingTableDirty = true;
  }

  /**
   * Remove node from network
   */
  public removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);

    // Remove all links involving this node
    const linksToRemove: string[] = [];
    for (const [linkId, link] of this.links) {
      if (link.fromNodeId === nodeId || link.toNodeId === nodeId) {
        linksToRemove.push(linkId);
      }
    }
    linksToRemove.forEach(id => this.links.delete(id));

    this.routingTableDirty = true;
  }

  /**
   * Update network topology
   *
   * Recalculates all links based on node positions and signal strength
   */
  public updateTopology(): void {
    this.links.clear();

    const nodeList = Array.from(this.nodes.values());

    // Check all possible node pairs
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];

        // Check if nodes can communicate
        const linkAB = this.calculateLink(nodeA, nodeB);
        if (linkAB) {
          const linkId = `${nodeA.id}-${nodeB.id}`;
          this.links.set(linkId, linkAB);
        }

        // Check reverse direction (may have different signal quality)
        const linkBA = this.calculateLink(nodeB, nodeA);
        if (linkBA) {
          const linkId = `${nodeB.id}-${nodeA.id}`;
          this.links.set(linkId, linkBA);
        }
      }
    }

    this.routingTableDirty = true;
  }

  /**
   * Calculate link between two nodes
   *
   * Returns null if nodes cannot communicate
   */
  private calculateLink(from: NetworkNode, to: NetworkNode): NetworkLink | null {
    const distance = from.position.subtract(to.position).length();

    // Too far apart
    if (distance > this.maxRoutingDistance) {
      return null;
    }

    // Calculate signal strength
    const transmission: SignalTransmission = {
      transmitterPosition: from.position,
      receiverPosition: to.position,
      transmitPowerWatts: from.transmitPower,
      frequencyHz: from.antenna.frequency,
      transmitGain: from.antenna.gain,
      receiveGain: to.antenna.gain
    };

    const reception = this.signalPropagation.calculateReception(transmission);

    // Cannot receive signal
    if (!reception.canReceive) {
      return null;
    }

    // Calculate latency (speed of light delay)
    const latencyMs = (distance / 299792458) * 1000; // c = 299,792,458 m/s

    // Estimate bandwidth based on signal quality
    // Better signal = higher bandwidth
    const baseBandwidth = 1e6; // 1 Mbps base
    const bandwidthBps = baseBandwidth * reception.quality;

    return {
      fromNodeId: from.id,
      toNodeId: to.id,
      signalQuality: reception.quality,
      latencyMs,
      bandwidthBps,
      congestion: 0 // Initially no congestion
    };
  }

  /**
   * Find route from source to destination using Dijkstra's algorithm
   *
   * Returns the optimal path through the network
   */
  public findRoute(sourceId: string, destinationId: string): MessageRoute | null {
    // Check if nodes exist
    if (!this.nodes.has(sourceId) || !this.nodes.has(destinationId)) {
      return null;
    }

    // If direct neighbors, return direct route
    if (sourceId === destinationId) {
      return {
        path: [sourceId],
        totalLatencyMs: 0,
        totalHops: 0,
        quality: 1,
        success: true
      };
    }

    // Dijkstra's algorithm implementation
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const unvisited = new Set<string>();

    // Initialize
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      unvisited.add(nodeId);
    }
    distances.set(sourceId, 0);

    while (unvisited.size > 0) {
      // Find node with smallest distance
      let currentNode: string | null = null;
      let smallestDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < smallestDistance) {
          smallestDistance = distance;
          currentNode = nodeId;
        }
      }

      // No reachable nodes left
      if (currentNode === null || smallestDistance === Infinity) {
        break;
      }

      // Found destination
      if (currentNode === destinationId) {
        break;
      }

      unvisited.delete(currentNode);

      // Check all neighbors
      for (const [linkId, link] of this.links) {
        if (link.fromNodeId !== currentNode) continue;

        const neighbor = link.toNodeId;
        if (!unvisited.has(neighbor)) continue;

        // Cost is latency + quality penalty
        const linkCost = link.latencyMs + (1 - link.signalQuality) * 100;
        const altDistance = distances.get(currentNode)! + linkCost;

        if (altDistance < distances.get(neighbor)!) {
          distances.set(neighbor, altDistance);
          previous.set(neighbor, currentNode);
        }
      }
    }

    // Reconstruct path
    if (!previous.has(destinationId)) {
      // No route found
      return {
        path: [],
        totalLatencyMs: 0,
        totalHops: 0,
        quality: 0,
        success: false
      };
    }

    const path: string[] = [];
    let current = destinationId;
    while (current !== sourceId) {
      path.unshift(current);
      const prev = previous.get(current);
      if (!prev) break;
      current = prev;
    }
    path.unshift(sourceId);

    // Calculate route metrics
    let totalLatency = 0;
    let minQuality = 1;

    for (let i = 0; i < path.length - 1; i++) {
      const linkId = `${path[i]}-${path[i + 1]}`;
      const link = this.links.get(linkId);

      if (link) {
        totalLatency += link.latencyMs;
        minQuality = Math.min(minQuality, link.signalQuality);
      }
    }

    return {
      path,
      totalLatencyMs: totalLatency,
      totalHops: path.length - 1,
      quality: minQuality,
      success: true
    };
  }

  /**
   * Build routing table for all nodes
   *
   * Pre-calculates routes for fast lookup
   */
  public buildRoutingTable(): void {
    this.routingTable.clear();

    const nodeIds = Array.from(this.nodes.keys());

    for (const source of nodeIds) {
      const routes = new Map<string, RouteEntry>();

      for (const destination of nodeIds) {
        if (source === destination) continue;

        const route = this.findRoute(source, destination);
        if (route && route.success) {
          routes.set(destination, {
            destination,
            nextHop: route.path[1] || destination,
            cost: route.totalLatencyMs,
            hops: route.totalHops,
            path: route.path
          });
        }
      }

      this.routingTable.set(source, routes);
    }

    this.routingTableDirty = false;
  }

  /**
   * Get next hop for message from routing table
   */
  public getNextHop(sourceId: string, destinationId: string): string | null {
    if (this.routingTableDirty) {
      this.buildRoutingTable();
    }

    const routes = this.routingTable.get(sourceId);
    if (!routes) return null;

    const route = routes.get(destinationId);
    return route ? route.nextHop : null;
  }

  /**
   * Get all reachable nodes from source
   */
  public getReachableNodes(sourceId: string): string[] {
    if (this.routingTableDirty) {
      this.buildRoutingTable();
    }

    const routes = this.routingTable.get(sourceId);
    if (!routes) return [];

    return Array.from(routes.keys());
  }

  /**
   * Get network statistics
   */
  public getNetworkStats(): {
    nodeCount: number;
    linkCount: number;
    avgLatency: number;
    avgQuality: number;
    connectedComponents: number;
  } {
    let totalLatency = 0;
    let totalQuality = 0;

    for (const link of this.links.values()) {
      totalLatency += link.latencyMs;
      totalQuality += link.signalQuality;
    }

    const linkCount = this.links.size;

    return {
      nodeCount: this.nodes.size,
      linkCount,
      avgLatency: linkCount > 0 ? totalLatency / linkCount : 0,
      avgQuality: linkCount > 0 ? totalQuality / linkCount : 0,
      connectedComponents: this.countConnectedComponents()
    };
  }

  /**
   * Count connected components in network
   *
   * Uses DFS to find isolated network segments
   */
  private countConnectedComponents(): number {
    const visited = new Set<string>();
    let components = 0;

    const dfs = (nodeId: string) => {
      visited.add(nodeId);

      // Find all neighbors
      for (const link of this.links.values()) {
        if (link.fromNodeId === nodeId && !visited.has(link.toNodeId)) {
          dfs(link.toNodeId);
        }
        if (link.toNodeId === nodeId && !visited.has(link.fromNodeId)) {
          dfs(link.fromNodeId);
        }
      }
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
        components++;
      }
    }

    return components;
  }

  /**
   * Update network (call periodically)
   */
  public update(dt: number): void {
    this.timeSinceRoutingUpdate += dt;

    // Rebuild routing table periodically
    if (this.timeSinceRoutingUpdate >= this.routingUpdateInterval) {
      if (this.routingTableDirty) {
        this.buildRoutingTable();
      }
      this.timeSinceRoutingUpdate = 0;
    }

    // Decay congestion over time
    for (const link of this.links.values()) {
      link.congestion = Math.max(0, link.congestion - dt * 0.1); // 10% decay per second
    }
  }

  /**
   * Add congestion to link (when message sent)
   */
  public addCongestion(fromId: string, toId: string, amount: number = 0.1): void {
    const linkId = `${fromId}-${toId}`;
    const link = this.links.get(linkId);
    if (link) {
      link.congestion = Math.min(1, link.congestion + amount);
    }
  }

  /**
   * Get all nodes
   */
  public getNodes(): NetworkNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get total node count
   */
  public getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get all links
   */
  public getLinks(): NetworkLink[] {
    return Array.from(this.links.values());
  }

  /**
   * Get node by ID
   */
  public getNode(nodeId: string): NetworkNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Check if two nodes can communicate (direct or relayed)
   */
  public canCommunicate(sourceId: string, destinationId: string): boolean {
    const route = this.findRoute(sourceId, destinationId);
    return route !== null && route.success;
  }

  /**
   * Mark topology as dirty (needs update)
   */
  public markDirty(): void {
    this.routingTableDirty = true;
  }
}
