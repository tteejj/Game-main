/**
 * RumorPropagationSystem - Information spreads and distorts
 *
 * Creates realistic information flow where:
 * - Rumors spread through communication networks
 * - Information gets distorted with each hop
 * - Distance and relay quality affect accuracy
 * - Sensational rumors spread faster
 * - Players must evaluate source reliability
 */

import { NewsArticle } from './NewsGenerationEngine';

export interface Rumor {
  id: string;
  originalSource: string;           // Original event/news ID
  currentVersion: string;            // Current text (may be distorted)
  originalVersion: string;           // Original text
  truthValue: number;                // 0-1 (1 = completely true)

  // Propagation
  originLocation: string;            // System/station ID where it started
  currentLocations: Set<string>;     // Where it's currently known
  hops: number;                      // Number of relay hops
  spreadRate: number;                // How fast it spreads (0-1)

  // Distortion
  distortions: DistortionRecord[];
  exaggerationLevel: number;         // 0-10 (how much exaggerated)
  credibility: number;               // 0-1 (how believable)

  // Metadata
  createdAt: number;
  lastSpread: number;
  heardBy: Set<string>;              // Entity IDs who know this
  believedBy: Set<string>;           // Entity IDs who believe it

  // Classification
  category: RumorCategory;
  tags: string[];
}

export type RumorCategory =
  | 'FACT'              // True information
  | 'EXAGGERATION'      // Based on truth but blown out of proportion
  | 'DISTORTION'        // Misunderstood or misremembered
  | 'FABRICATION'       // Completely made up
  | 'CONSPIRACY'        // Elaborate false narrative
  | 'PROPAGANDA';       // Deliberate misinformation

export interface DistortionRecord {
  hop: number;
  location: string;
  distortionType: DistortionType;
  before: string;
  after: string;
  timestamp: number;
}

export type DistortionType =
  | 'EXAGGERATION'      // Numbers get bigger
  | 'MINIMIZATION'      // Numbers get smaller
  | 'SUBSTITUTION'      // Details change
  | 'ADDITION'          // New details added
  | 'OMISSION'          // Details removed
  | 'REVERSAL'          // Meaning flipped
  | 'EMBELLISHMENT';    // Made more dramatic

export interface PropagationNode {
  id: string;                        // Station/system ID
  reliability: number;               // 0-1 (how accurately they relay)
  connections: string[];             // Connected nodes
  rumorBuffer: Rumor[];              // Rumors known here
  propagationDelay: number;          // Seconds before relay
}

export class RumorPropagationSystem {
  private rumors: Map<string, Rumor> = new Map();
  private nodes: Map<string, PropagationNode> = new Map();

  // Configuration
  private readonly DISTORTION_CHANCE_PER_HOP = 0.2;
  private readonly EXAGGERATION_MULTIPLIER = 1.5;
  private readonly MAX_HOPS = 10;
  private readonly CREDIBILITY_DECAY_RATE = 0.05;

  constructor() {
    // Initialize
  }

  /**
   * Create rumor from news article
   */
  public createRumorFromNews(
    article: NewsArticle,
    originLocation: string
  ): Rumor {
    const rumor: Rumor = {
      id: `rumor_${article.id}`,
      originalSource: article.id,
      currentVersion: article.summary,
      originalVersion: article.summary,
      truthValue: article.veracity,
      originLocation,
      currentLocations: new Set([originLocation]),
      hops: 0,
      spreadRate: article.importance / 10,
      distortions: [],
      exaggerationLevel: 0,
      credibility: article.trustworthiness,
      createdAt: article.timestamp,
      lastSpread: article.timestamp,
      heardBy: new Set(),
      believedBy: new Set(),
      category: 'FACT',
      tags: article.tags
    };

    this.rumors.set(rumor.id, rumor);

    // Add to origin node
    this.addRumorToNode(originLocation, rumor);

    return rumor;
  }

  /**
   * Create rumor from scratch (fabrication)
   */
  public createFabrication(
    text: string,
    originLocation: string,
    category: RumorCategory = 'FABRICATION'
  ): Rumor {
    const rumor: Rumor = {
      id: `rumor_fab_${Date.now()}`,
      originalSource: 'fabricated',
      currentVersion: text,
      originalVersion: text,
      truthValue: 0,
      originLocation,
      currentLocations: new Set([originLocation]),
      hops: 0,
      spreadRate: 0.7,  // Fabrications spread fast
      distortions: [],
      exaggerationLevel: 0,
      credibility: 0.3,  // Low initial credibility
      createdAt: Date.now() / 1000,
      lastSpread: Date.now() / 1000,
      heardBy: new Set(),
      believedBy: new Set(),
      category,
      tags: ['rumor', 'unverified']
    };

    this.rumors.set(rumor.id, rumor);
    this.addRumorToNode(originLocation, rumor);

    return rumor;
  }

  /**
   * Propagate rumor through network
   */
  public propagateRumor(rumorId: string, fromNode: string, toNode: string): Rumor | null {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) return null;

    // Check if already at destination
    if (rumor.currentLocations.has(toNode)) {
      return rumor;
    }

    // Check hop limit
    if (rumor.hops >= this.MAX_HOPS) {
      return null;
    }

    // Get node reliability
    const node = this.nodes.get(fromNode);
    const reliability = node?.reliability || 0.7;

    // Create propagated version (may be distorted)
    const propagatedRumor = this.applyDistortion(rumor, toNode, reliability);

    // Update rumor
    propagatedRumor.hops++;
    propagatedRumor.currentLocations.add(toNode);
    propagatedRumor.lastSpread = Date.now() / 1000;

    // Decay credibility with each hop
    propagatedRumor.credibility *= (1 - this.CREDIBILITY_DECAY_RATE);

    // Add to destination node
    this.addRumorToNode(toNode, propagatedRumor);

    // Update in storage
    this.rumors.set(rumorId, propagatedRumor);

    return propagatedRumor;
  }

  /**
   * Spread rumor to all connected nodes
   */
  public spreadToNetwork(rumorId: string, fromNode: string): void {
    const node = this.nodes.get(fromNode);
    if (!node) return;

    for (const connectedNode of node.connections) {
      // Probability of spread based on rumor spread rate
      const rumor = this.rumors.get(rumorId);
      if (rumor && Math.random() < rumor.spreadRate) {
        this.propagateRumor(rumorId, fromNode, connectedNode);
      }
    }
  }

  /**
   * Entity hears rumor
   */
  public entityHearsRumor(entityId: string, rumorId: string, beliefThreshold: number = 0.5): boolean {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) return false;

    rumor.heardBy.add(entityId);

    // Decide if they believe it
    if (rumor.credibility >= beliefThreshold) {
      rumor.believedBy.add(entityId);
      return true;
    }

    return false;
  }

  /**
   * Compare rumor to truth
   */
  public compareToTruth(rumorId: string): {
    truthValue: number;
    distortions: number;
    exaggeration: number;
    category: RumorCategory;
  } {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) {
      return {
        truthValue: 0,
        distortions: 0,
        exaggeration: 0,
        category: 'FABRICATION'
      };
    }

    return {
      truthValue: rumor.truthValue,
      distortions: rumor.distortions.length,
      exaggeration: rumor.exaggerationLevel,
      category: rumor.category
    };
  }

  /**
   * Get rumors at location
   */
  public getRumorsAt(locationId: string): Rumor[] {
    return Array.from(this.rumors.values())
      .filter(r => r.currentLocations.has(locationId));
  }

  /**
   * Update rumor propagation
   */
  public update(deltaTime: number): void {
    for (const rumor of this.rumors.values()) {
      // Spread to connected nodes periodically
      for (const location of rumor.currentLocations) {
        const timeSinceLastSpread = Date.now() / 1000 - rumor.lastSpread;

        if (timeSinceLastSpread > 300) {  // Every 5 minutes
          this.spreadToNetwork(rumor.id, location);
        }
      }

      // Decay old rumors
      const age = Date.now() / 1000 - rumor.createdAt;
      if (age > 86400 * 7) {  // 7 days old
        rumor.credibility *= 0.9;  // Decay credibility
      }
    }
  }

  // ====================================================================
  // PRIVATE METHODS
  // ====================================================================

  private applyDistortion(rumor: Rumor, toNode: string, reliability: number): Rumor {
    const distorted = { ...rumor };

    // Chance of distortion based on reliability
    if (Math.random() > reliability + (rumor.truthValue * 0.3)) {
      const distortionType = this.selectDistortionType(rumor);
      const distortedVersion = this.distortText(rumor.currentVersion, distortionType);

      distorted.currentVersion = distortedVersion;
      distorted.distortions.push({
        hop: rumor.hops,
        location: toNode,
        distortionType,
        before: rumor.currentVersion,
        after: distortedVersion,
        timestamp: Date.now() / 1000
      });

      // Update truth value
      distorted.truthValue *= 0.8;

      // Update category
      if (distorted.truthValue < 0.3) {
        distorted.category = 'FABRICATION';
      } else if (distorted.truthValue < 0.6) {
        distorted.category = 'DISTORTION';
      } else if (distortionType === 'EXAGGERATION') {
        distorted.category = 'EXAGGERATION';
      }

      // Track exaggeration
      if (distortionType === 'EXAGGERATION') {
        distorted.exaggerationLevel++;
      }
    }

    return distorted;
  }

  private selectDistortionType(rumor: Rumor): DistortionType {
    const types: DistortionType[] = [
      'EXAGGERATION',
      'MINIMIZATION',
      'SUBSTITUTION',
      'ADDITION',
      'OMISSION',
      'EMBELLISHMENT'
    ];

    // Exaggeration more likely for dramatic rumors
    if (rumor.spreadRate > 0.7) {
      return Math.random() < 0.5 ? 'EXAGGERATION' : 'EMBELLISHMENT';
    }

    return types[Math.floor(Math.random() * types.length)];
  }

  private distortText(text: string, type: DistortionType): string {
    switch (type) {
      case 'EXAGGERATION':
        return this.exaggerateNumbers(text);

      case 'MINIMIZATION':
        return this.minimizeNumbers(text);

      case 'SUBSTITUTION':
        return this.substituteDetails(text);

      case 'ADDITION':
        return this.addDetails(text);

      case 'OMISSION':
        return this.removeDetails(text);

      case 'EMBELLISHMENT':
        return this.embellish(text);

      case 'REVERSAL':
        return this.reverseDetails(text);

      default:
        return text;
    }
  }

  private exaggerateNumbers(text: string): string {
    // Find numbers and multiply them
    return text.replace(/(\d+)/g, (match) => {
      const num = parseInt(match);
      const exaggerated = Math.floor(num * this.EXAGGERATION_MULTIPLIER);
      return exaggerated.toString();
    });
  }

  private minimizeNumbers(text: string): string {
    return text.replace(/(\d+)/g, (match) => {
      const num = parseInt(match);
      const minimized = Math.floor(num / this.EXAGGERATION_MULTIPLIER);
      return Math.max(1, minimized).toString();
    });
  }

  private substituteDetails(text: string): string {
    // Substitute specific words
    const substitutions: Record<string, string> = {
      'attacked': 'destroyed',
      'damaged': 'obliterated',
      'few': 'many',
      'some': 'hundreds of',
      'station': 'entire system'
    };

    let result = text;
    for (const [original, replacement] of Object.entries(substitutions)) {
      if (Math.random() < 0.3) {
        result = result.replace(new RegExp(original, 'gi'), replacement);
      }
    }

    return result;
  }

  private addDetails(text: string): string {
    const additions = [
      ', sources say',
      ', according to witnesses',
      ', insiders claim',
      ', experts warn',
      ', authorities confirm'
    ];

    return text + additions[Math.floor(Math.random() * additions.length)];
  }

  private removeDetails(text: string): string {
    // Remove words after commas
    const parts = text.split(',');
    return parts[0];
  }

  private embellish(text: string): string {
    const adjectives = ['massive', 'devastating', 'unprecedented', 'shocking', 'terrifying'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];

    // Add adjective before first noun
    return text.replace(/\b(attack|raid|disaster|event|incident)\b/i, `${adj} $1`);
  }

  private reverseDetails(text: string): string {
    // Flip meaning (rare)
    return text
      .replace(/attacked/gi, 'defended')
      .replace(/destroyed/gi, 'saved')
      .replace(/killed/gi, 'rescued');
  }

  private addRumorToNode(nodeId: string, rumor: Rumor): void {
    if (!this.nodes.has(nodeId)) {
      this.nodes.set(nodeId, {
        id: nodeId,
        reliability: 0.7,
        connections: [],
        rumorBuffer: [],
        propagationDelay: 60
      });
    }

    const node = this.nodes.get(nodeId)!;
    if (!node.rumorBuffer.find(r => r.id === rumor.id)) {
      node.rumorBuffer.push(rumor);
    }
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public addNode(nodeId: string, reliability: number, connections: string[]): void {
    this.nodes.set(nodeId, {
      id: nodeId,
      reliability,
      connections,
      rumorBuffer: [],
      propagationDelay: 60
    });
  }

  public getRumor(id: string): Rumor | null {
    return this.rumors.get(id) || null;
  }

  public getAllRumors(): Rumor[] {
    return Array.from(this.rumors.values());
  }

  public getStatistics(): {
    totalRumors: number;
    byCategory: Map<RumorCategory, number>;
    averageTruthValue: number;
    averageHops: number;
    mostBelieved: Rumor | null;
  } {
    const all = this.getAllRumors();
    const byCategory = new Map<RumorCategory, number>();

    let totalTruth = 0;
    let totalHops = 0;
    let mostBelieved: Rumor | null = null;
    let maxBelievers = 0;

    for (const rumor of all) {
      byCategory.set(rumor.category, (byCategory.get(rumor.category) || 0) + 1);
      totalTruth += rumor.truthValue;
      totalHops += rumor.hops;

      if (rumor.believedBy.size > maxBelievers) {
        maxBelievers = rumor.believedBy.size;
        mostBelieved = rumor;
      }
    }

    return {
      totalRumors: all.length,
      byCategory,
      averageTruthValue: all.length > 0 ? totalTruth / all.length : 0,
      averageHops: all.length > 0 ? totalHops / all.length : 0,
      mostBelieved
    };
  }
}
