# Living Universe - Technical Architecture & Implementation Plan

## Table of Contents
1. [System Overview](#system-overview)
2. [NPC Traffic System](#1-npc-traffic-system)
3. [Communications System](#2-communications-system)
4. [Dynamic Economy System](#3-dynamic-economy-system)
5. [Points of Interest System](#4-points-of-interest-system)
6. [Random Events System](#5-random-events-system)
7. [Faction & Security System](#6-faction--security-system)
8. [Integration Matrix](#integration-matrix)
9. [Performance Considerations](#performance-considerations)
10. [Implementation Order](#implementation-order)

---

## System Overview

### Architecture Layers
```
┌─────────────────────────────────────────────────────────────┐
│                    GAME LAYER                                │
│  (Player Interface, UI, Input Handling)                      │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                SIMULATION LAYER                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ NPC Traffic │  │ Communications│  │   Economy    │       │
│  │   System    │←→│    System     │←→│   System     │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│         ↕               ↕                    ↕               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Events    │  │   Factions   │  │     POIs     │       │
│  │   System    │←→│  & Security  │←→│    System    │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                 PHYSICS LAYER                                │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐             │
│  │  Orbital  │  │ Collision  │  │ Navigation │             │
│  │ Mechanics │  │ Detection  │  │   Physics  │             │
│  └───────────┘  └────────────┘  └────────────┘             │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  (StarSystem, Stations, Planets, Satellites, Spacecraft)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. NPC Traffic System

### Purpose
Simulate active vessel traffic throughout the star system to create a living, dynamic environment.

### Physics Components

#### 1.1 Vessel Physics Engine
```typescript
/**
 * Core physics for NPC vessels
 * Uses simplified Spacecraft physics (no detailed subsystems)
 */
interface VesselPhysics {
  // State
  position: Vector3;           // m
  velocity: Vector3;           // m/s
  acceleration: Vector3;       // m/s²
  mass: number;                // kg

  // Capabilities
  maxAcceleration: number;     // m/s² (0.5-5 depending on vessel type)
  maxVelocity: number;         // m/s (100-1000 depending on vessel type)
  turnRate: number;            // rad/s (how fast it can change direction)

  // Physics update
  update(dt: number, targetVelocity: Vector3): void;
}
```

**Physics Equations:**
```
Acceleration Control (PID-like):
  error = targetVelocity - currentVelocity
  acceleration = min(error * gainFactor, maxAcceleration)

Position Integration (Verlet):
  newPosition = position + velocity * dt + 0.5 * acceleration * dt²
  newVelocity = velocity + acceleration * dt

Turning Physics:
  directionError = targetDirection - currentDirection
  angularVelocity = min(directionError * turnGain, turnRate)
  currentDirection += angularVelocity * dt
```

#### 1.2 Navigation System
```typescript
/**
 * Path planning and navigation for NPC vessels
 */
class VesselNavigator {
  // Inputs
  currentPosition: Vector3;
  currentVelocity: Vector3;
  destination: Vector3;
  obstacles: CelestialBody[];  // Planets, moons, etc.

  // Outputs
  targetVelocity: Vector3;     // Desired velocity vector
  eta: number;                 // Estimated time to arrival (seconds)

  /**
   * Calculate optimal trajectory avoiding obstacles
   * Uses potential field navigation
   */
  calculatePath(): {
    waypoints: Vector3[];
    totalDistance: number;
    estimatedTime: number;
  } {
    // 1. Direct path check
    if (this.isPathClear(this.currentPosition, this.destination)) {
      return this.directPath();
    }

    // 2. Obstacle avoidance using artificial potential fields
    // Destination creates attractive potential
    // Obstacles create repulsive potential
    // Sum of potentials gives navigation vector

    const attractivePotential = this.calculateAttractive(this.destination);
    const repulsivePotential = this.calculateRepulsive(this.obstacles);
    const navigationVector = attractivePotential + repulsivePotential;

    return this.buildWaypointPath(navigationVector);
  }

  /**
   * Potential field physics:
   *
   * Attractive potential (destination):
   *   U_att = 0.5 * k_att * distance²
   *   F_att = -k_att * (currentPos - destination)
   *
   * Repulsive potential (obstacles):
   *   U_rep = 0.5 * k_rep * (1/distance - 1/influenceRadius)² if distance < influenceRadius
   *   F_rep = k_rep * (1/distance - 1/influenceRadius) * (1/distance²) * direction
   */
}
```

#### 1.3 Collision Avoidance
```typescript
/**
 * Real-time collision detection and avoidance
 */
class CollisionAvoidance {
  /**
   * Predict collisions using relative velocity
   *
   * Time to Closest Approach (TCA):
   *   relativePos = other.position - this.position
   *   relativeVel = other.velocity - this.velocity
   *   tca = -dot(relativePos, relativeVel) / dot(relativeVel, relativeVel)
   *
   * Closest Approach Distance:
   *   closestDistance = |relativePos + relativeVel * tca|
   */
  predictCollision(vessel: NPCVessel, other: NPCVessel | CelestialBody): {
    willCollide: boolean;
    timeToCollision: number;  // seconds
    closestDistance: number;  // meters
  } {
    const relPos = sub(other.position, vessel.position);
    const relVel = sub(other.velocity, vessel.velocity);

    const tca = -dot(relPos, relVel) / dot(relVel, relVel);

    if (tca < 0) return { willCollide: false, timeToCollision: Infinity, closestDistance: Infinity };

    const closestPoint = add(relPos, scale(relVel, tca));
    const closestDistance = magnitude(closestPoint);

    const combinedRadius = vessel.radius + other.radius + SAFETY_MARGIN;

    return {
      willCollide: closestDistance < combinedRadius,
      timeToCollision: tca,
      closestDistance
    };
  }

  /**
   * Generate avoidance maneuver
   * Uses perpendicular offset to collision vector
   */
  avoidanceManeuver(collision: CollisionPrediction): Vector3 {
    // Calculate perpendicular direction to collision
    const collisionNormal = normalize(collision.closestPoint);
    const perpendicular = cross(collisionNormal, { x: 0, y: 0, z: 1 });

    // Apply avoidance force inversely proportional to time
    const urgency = 1.0 / (collision.timeToCollision + 1);
    return scale(perpendicular, urgency * AVOIDANCE_STRENGTH);
  }
}
```

### Data Structures

#### 1.4 NPC Vessel Entity
```typescript
interface NPCVessel {
  // Identity
  id: string;
  name: string;
  type: VesselType;
  faction: string;

  // Physics state
  physics: VesselPhysics;

  // Navigation state
  route: Route;
  currentWaypoint: number;
  destination: string;       // Station ID or location name

  // Mission state
  cargo: CargoManifest | null;
  passengers: number;
  missionType: MissionType;

  // AI state
  behavior: BehaviorState;
  threat: number;            // 0-1, how dangerous this vessel is

  // Timestamps
  spawnTime: number;
  despawnTime: number;       // When to remove if out of range
}

enum VesselType {
  CARGO_FREIGHTER,    // Slow, heavy, high cargo
  BULK_HAULER,        // Very slow, massive cargo
  FAST_COURIER,       // Fast, light, small cargo
  MINING_SHIP,        // Moves to asteroids, stays put
  PASSENGER_LINER,    // Medium speed, no cargo, many passengers
  PATROL_SHIP,        // Fast, circular route, security
  PIRATE,             // Fast, aggressive, intercepts cargo
  RESEARCH_VESSEL,    // Slow, goes to POIs, scans
  TUG,                // Slow, moves derelicts/debris
}

interface Route {
  origin: string;
  destination: string;
  waypoints: Vector3[];
  totalDistance: number;
  estimatedDuration: number; // seconds
}

interface CargoManifest {
  items: Map<string, number>;  // commodity -> quantity (tons)
  totalMass: number;           // kg
  value: number;               // credits
}

enum BehaviorState {
  IDLE,              // Stationary (docked, mining)
  TRAVELING,         // En route to destination
  DOCKING,           // Approaching docking port
  UNDOCKING,         // Leaving station
  EVADING,           // Collision avoidance active
  FLEEING,           // Running from threat
  ATTACKING,         // Hostile engagement (pirates)
  PATROLLING,        // Following patrol route
  MINING,            // Extracting resources
  SCANNING,          // Researching POI
}
```

#### 1.5 Traffic Manager
```typescript
/**
 * Central controller for all NPC traffic
 */
class TrafficManager {
  private vessels: Map<string, NPCVessel> = new Map();
  private spawnSchedule: TrafficSchedule;
  private spatialHash: SpatialHashGrid;  // For efficient proximity queries

  // Configuration
  private readonly MAX_ACTIVE_VESSELS = 50;
  private readonly SPAWN_RADIUS = 100000;  // 100 km from player
  private readonly DESPAWN_RADIUS = 150000; // 150 km from player

  /**
   * Main update loop
   */
  update(dt: number, playerPosition: Vector3, system: StarSystem): void {
    // 1. Update all active vessels
    for (const vessel of this.vessels.values()) {
      this.updateVessel(vessel, dt, system);
    }

    // 2. Spatial hash update (for collision queries)
    this.spatialHash.update(Array.from(this.vessels.values()));

    // 3. Check for vessels that should despawn
    this.cullDistantVessels(playerPosition);

    // 4. Spawn new vessels if under limit
    if (this.vessels.size < this.MAX_ACTIVE_VESSELS) {
      this.spawnVessels(playerPosition, system);
    }

    // 5. Generate traffic events (arrivals, departures, emergencies)
    this.generateTrafficEvents(system);
  }

  /**
   * Update single vessel
   */
  private updateVessel(vessel: NPCVessel, dt: number, system: StarSystem): void {
    // 1. Behavior-specific logic
    switch (vessel.behavior) {
      case BehaviorState.TRAVELING:
        this.updateTraveling(vessel, dt);
        break;
      case BehaviorState.MINING:
        this.updateMining(vessel, dt);
        break;
      case BehaviorState.PATROLLING:
        this.updatePatrolling(vessel, dt);
        break;
      // ... other behaviors
    }

    // 2. Collision avoidance
    const nearbyVessels = this.spatialHash.query(vessel.physics.position, 10000); // 10km radius
    const collisionRisk = this.checkCollisions(vessel, nearbyVessels);
    if (collisionRisk) {
      vessel.physics.velocity = this.avoidanceManeuver(vessel, collisionRisk);
    }

    // 3. Physics integration
    vessel.physics.update(dt, vessel.navigator.targetVelocity);

    // 4. Check for arrival at waypoint
    if (this.reachedWaypoint(vessel)) {
      this.advanceToNextWaypoint(vessel);
    }
  }

  /**
   * Spawn vessels based on traffic patterns
   */
  private spawnVessels(playerPosition: Vector3, system: StarSystem): void {
    // Get traffic density for current time
    const density = this.spawnSchedule.getDensity(system.getTime());

    // Spawn based on economy and station activity
    for (const station of system.stations) {
      const trafficLevel = station.economy.tradeVolume / 1000000; // Normalized
      const spawnProbability = trafficLevel * density * dt / 3600; // Per second

      if (Math.random() < spawnProbability) {
        this.spawnVesselAt(station, system);
      }
    }
  }

  /**
   * Create vessel with route
   */
  private spawnVesselAt(origin: SpaceStation, system: StarSystem): NPCVessel {
    // 1. Determine vessel type based on station type and economy
    const vesselType = this.selectVesselType(origin);

    // 2. Select destination
    const destination = this.selectDestination(origin, system, vesselType);

    // 3. Generate cargo/mission
    const cargo = this.generateCargo(origin, destination, vesselType);

    // 4. Calculate route
    const route = this.calculateRoute(origin.position, destination.position, system);

    // 5. Create vessel
    const vessel: NPCVessel = {
      id: generateId(),
      name: this.generateVesselName(vesselType),
      type: vesselType,
      faction: origin.faction,
      physics: this.createVesselPhysics(vesselType, origin.position),
      route,
      currentWaypoint: 0,
      destination: destination.id,
      cargo,
      passengers: vesselType === VesselType.PASSENGER_LINER ? randomInt(50, 1000) : 0,
      missionType: this.selectMissionType(vesselType),
      behavior: BehaviorState.UNDOCKING,
      threat: vesselType === VesselType.PIRATE ? 0.8 : 0.1,
      spawnTime: system.getTime(),
      despawnTime: 0
    };

    this.vessels.set(vessel.id, vessel);

    // 6. Generate departure message
    this.comms.broadcast({
      source: origin.id,
      type: 'TRAFFIC_CONTROL',
      content: `${vessel.name} departing for ${destination.name}`,
      priority: 'LOW'
    });

    return vessel;
  }
}
```

### Integration Points

#### With StarSystem:
- **Input**: Celestial body positions for obstacle avoidance
- **Input**: Station positions for route planning
- **Input**: Hazard zones to avoid
- **Output**: Vessel positions for rendering
- **Output**: Traffic density heatmaps

#### With Communications:
- **Output**: Traffic control messages (departures, arrivals)
- **Output**: Distress signals (emergencies)
- **Output**: Ship-to-ship chatter
- **Input**: Player hails/requests

#### With Economy:
- **Input**: Trade prices to determine cargo routes
- **Output**: Cargo deliveries (affect station supply)
- **Output**: Passenger traffic (affect station population)

#### With Events:
- **Input**: Event notifications (solar flares, pirate raids)
- **Output**: Emergency responses (vessels flee, call for help)

#### With Player:
- **Input**: Player position for spawning/despawning
- **Input**: Player reputation for hostile/friendly behavior
- **Output**: Interaction opportunities (hail, scan, attack)

### Performance Optimization

```typescript
/**
 * Spatial hash grid for O(1) proximity queries
 */
class SpatialHashGrid {
  private cellSize: number = 10000; // 10 km cells
  private grid: Map<string, NPCVessel[]> = new Map();

  /**
   * Hash position to grid cell
   */
  private hash(position: Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  /**
   * Query nearby vessels (O(1) instead of O(n))
   */
  query(position: Vector3, radius: number): NPCVessel[] {
    const cellsToCheck = Math.ceil(radius / this.cellSize);
    const nearby: NPCVessel[] = [];

    const centerCell = this.hash(position);
    const [cx, cy, cz] = centerCell.split(',').map(Number);

    // Check neighboring cells
    for (let dx = -cellsToCheck; dx <= cellsToCheck; dx++) {
      for (let dy = -cellsToCheck; dy <= cellsToCheck; dy++) {
        for (let dz = -cellsToCheck; dz <= cellsToCheck; dz++) {
          const cell = `${cx + dx},${cy + dy},${cz + dz}`;
          const vessels = this.grid.get(cell) || [];
          nearby.push(...vessels);
        }
      }
    }

    return nearby;
  }
}
```

**LOD (Level of Detail) System:**
```typescript
/**
 * Vessels far from player use simplified physics
 */
class TrafficLOD {
  updateVesselLOD(vessel: NPCVessel, distanceToPlayer: number): void {
    if (distanceToPlayer < 10000) {
      // High detail: Full physics, collision avoidance
      vessel.updateRate = 60; // 60 Hz
      vessel.physicsDetail = PhysicsDetail.FULL;
    } else if (distanceToPlayer < 50000) {
      // Medium detail: Simplified physics
      vessel.updateRate = 10; // 10 Hz
      vessel.physicsDetail = PhysicsDetail.SIMPLIFIED;
    } else {
      // Low detail: Waypoint interpolation only
      vessel.updateRate = 1; // 1 Hz
      vessel.physicsDetail = PhysicsDetail.WAYPOINTS_ONLY;
    }
  }
}
```

---

## 2. Communications System

### Purpose
Provide a realistic communication network with signal propagation, relay networks, and message prioritization.

### Physics Components

#### 2.1 Signal Propagation Physics
```typescript
/**
 * Electromagnetic signal propagation through space
 */
class SignalPropagation {
  /**
   * Calculate signal strength between two points
   *
   * Free Space Path Loss (Friis Equation):
   *   FSPL (dB) = 20*log10(d) + 20*log10(f) + 20*log10(4π/c)
   *
   * Received Power:
   *   P_r = P_t * G_t * G_r * (λ / (4πd))²
   *
   * Where:
   *   P_t = Transmit power (W)
   *   G_t = Transmit antenna gain
   *   G_r = Receive antenna gain
   *   λ = Wavelength (m)
   *   d = Distance (m)
   *   c = Speed of light (m/s)
   */
  calculateSignalStrength(
    transmitter: CommNode,
    receiver: CommNode,
    distance: number,
    obstacles: CelestialBody[]
  ): number {
    // 1. Free space loss
    const wavelength = 3e8 / transmitter.frequency; // c / f
    const pathLoss = Math.pow(wavelength / (4 * Math.PI * distance), 2);

    // 2. Antenna gains (linear, not dB)
    const txGain = Math.pow(10, transmitter.antennaGain / 10);
    const rxGain = Math.pow(10, receiver.antennaGain / 10);

    // 3. Base signal strength
    let signalStrength = transmitter.powerWatts * txGain * rxGain * pathLoss;

    // 4. Obstruction loss (line-of-sight check)
    if (!this.hasLineOfSight(transmitter.position, receiver.position, obstacles)) {
      signalStrength *= 0.1; // 10 dB loss through obstacles
    }

    // 5. Atmospheric attenuation (if in atmosphere)
    const atmosphericLoss = this.calculateAtmosphericLoss(
      transmitter.position,
      receiver.position,
      obstacles
    );
    signalStrength *= atmosphericLoss;

    return signalStrength;
  }

  /**
   * Line of sight check using ray casting
   */
  private hasLineOfSight(
    from: Vector3,
    to: Vector3,
    obstacles: CelestialBody[]
  ): boolean {
    const ray = normalize(sub(to, from));
    const distance = magnitude(sub(to, from));

    for (const body of obstacles) {
      // Ray-sphere intersection test
      const oc = sub(from, body.position);
      const a = dot(ray, ray);
      const b = 2 * dot(oc, ray);
      const c = dot(oc, oc) - body.physical.radius * body.physical.radius;
      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0) {
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t > 0 && t < distance) {
          return false; // Obstruction
        }
      }
    }

    return true;
  }
}
```

#### 2.2 Relay Network Routing
```typescript
/**
 * Multi-hop relay network using Dijkstra's algorithm
 */
class RelayNetwork {
  private nodes: Map<string, CommNode> = new Map();

  /**
   * Find optimal relay path from source to destination
   * Uses Dijkstra's algorithm with signal strength as cost
   */
  findRelayPath(
    source: string,
    destination: string,
    system: StarSystem
  ): RelayPath | null {
    // Build communication graph
    const graph = this.buildCommGraph(system);

    // Dijkstra's algorithm
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string> = new Map();
    const unvisited = new Set(this.nodes.keys());

    // Initialize
    distances.set(source, 0);
    for (const node of this.nodes.keys()) {
      if (node !== source) {
        distances.set(node, Infinity);
      }
    }

    while (unvisited.size > 0) {
      // Find minimum distance unvisited node
      let current = null;
      let minDist = Infinity;
      for (const node of unvisited) {
        const dist = distances.get(node)!;
        if (dist < minDist) {
          minDist = dist;
          current = node;
        }
      }

      if (current === null || current === destination) break;
      unvisited.delete(current);

      // Update neighbors
      const neighbors = graph.get(current) || [];
      for (const [neighbor, cost] of neighbors) {
        const alt = distances.get(current)! + cost;
        if (alt < distances.get(neighbor)!) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current);
        }
      }
    }

    // Reconstruct path
    if (!previous.has(destination)) return null;

    const path: string[] = [];
    let current = destination;
    while (current !== source) {
      path.unshift(current);
      current = previous.get(current)!;
    }
    path.unshift(source);

    return {
      nodes: path,
      totalLatency: distances.get(destination)!,
      bandwidth: this.calculatePathBandwidth(path)
    };
  }

  /**
   * Build communication graph with signal strengths
   */
  private buildCommGraph(system: StarSystem): Map<string, [string, number][]> {
    const graph = new Map<string, [string, number][]>();

    // Add all comm nodes (stations, satellites, ships)
    const allNodes = [
      ...system.stations.map(s => ({ id: s.id, position: s.position, type: 'station' })),
      ...system.satellites.map(s => ({ id: s.name, position: s.getPosition(), type: 'satellite' })),
      // NPCs with comm equipment would go here
    ];

    // For each node, find reachable neighbors
    for (const nodeA of allNodes) {
      const neighbors: [string, number][] = [];

      for (const nodeB of allNodes) {
        if (nodeA.id === nodeB.id) continue;

        const distance = magnitude(sub(nodeB.position, nodeA.position));
        const signalStrength = this.signalPropagation.calculateSignalStrength(
          nodeA,
          nodeB,
          distance,
          system.planets
        );

        // Only add if signal is strong enough
        if (signalStrength > MIN_SIGNAL_THRESHOLD) {
          // Cost = latency (distance / speed of light)
          const latency = distance / 3e8; // seconds
          neighbors.push([nodeB.id, latency]);
        }
      }

      graph.set(nodeA.id, neighbors);
    }

    return graph;
  }
}
```

### Data Structures

#### 2.3 Message System
```typescript
interface Message {
  id: string;
  timestamp: number;

  // Routing
  source: string;            // Node ID
  destination: string;       // Node ID or 'BROADCAST'
  relay: string[];           // Path through network

  // Content
  type: MessageType;
  priority: MessagePriority;
  content: string;
  data: any;                 // Structured data payload

  // Network state
  transmitted: boolean;
  received: boolean;
  signalStrength: number;
  latency: number;           // Propagation delay
}

enum MessageType {
  TRAFFIC_CONTROL,           // Station broadcasts
  DISTRESS,                  // Emergency signals
  TRADE_BROADCAST,           // Economic announcements
  NEWS,                      // Local news
  SHIP_TO_SHIP,              // Direct comms
  PLAYER_HAIL,               // Player initiated
  STATION_ANNOUNCEMENT,      // Public announcements
  NAVIGATION_BEACON,         // Automated beacons
  WEATHER_ALERT,             // Environmental warnings
}

enum MessagePriority {
  EMERGENCY = 4,             // Immediate, override all
  HIGH = 3,                  // Important, queue front
  NORMAL = 2,                // Standard priority
  LOW = 1,                   // Background traffic
  SPAM = 0,                  // Commercial ads
}

/**
 * Message queue with priority handling
 */
class MessageQueue {
  private queue: Message[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  enqueue(message: Message): boolean {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      // Drop lowest priority messages
      this.queue.sort((a, b) => a.priority - b.priority);
      this.queue.shift();
    }

    this.queue.push(message);
    this.queue.sort((a, b) => b.priority - a.priority); // High priority first

    return true;
  }

  dequeue(): Message | null {
    return this.queue.shift() || null;
  }

  peek(): Message | null {
    return this.queue[0] || null;
  }
}
```

#### 2.4 Communications Manager
```typescript
class CommunicationsManager {
  private relayNetwork: RelayNetwork;
  private messageQueues: Map<string, MessageQueue> = new Map();
  private messageGenerators: MessageGenerator[];

  // Performance
  private readonly MESSAGE_RATE_LIMIT = 10; // Messages per second
  private lastMessageTime: number = 0;

  /**
   * Main update loop
   */
  update(dt: number, system: StarSystem): void {
    // 1. Update relay network topology
    this.relayNetwork.update(system);

    // 2. Generate procedural messages
    this.generateMessages(dt, system);

    // 3. Route messages through network
    this.routeMessages(system);

    // 4. Process received messages
    this.processMessages(dt);
  }

  /**
   * Generate procedural messages
   */
  private generateMessages(dt: number, system: StarSystem): void {
    const currentTime = system.getTime();

    // Traffic control messages (frequent)
    if (currentTime - this.lastMessageTime > 5) { // Every 5 seconds
      for (const station of system.stations) {
        const msg = this.generateTrafficControl(station, system);
        if (msg) this.broadcast(msg);
      }
      this.lastMessageTime = currentTime;
    }

    // Trade broadcasts (hourly)
    if (currentTime % 3600 < dt) {
      for (const station of system.stations) {
        const msg = this.generateTradeBroadcast(station);
        this.broadcast(msg);
      }
    }

    // News updates (every 6 hours)
    if (currentTime % 21600 < dt) {
      const msg = this.generateNews(system);
      this.broadcast(msg);
    }

    // Random events (distress, etc.)
    if (Math.random() < 0.01 * dt) { // 1% chance per second
      const msg = this.generateRandomEvent(system);
      if (msg) this.broadcast(msg);
    }
  }

  /**
   * Generate traffic control message
   */
  private generateTrafficControl(station: SpaceStation, system: StarSystem): Message | null {
    // Get nearby traffic
    const nearbyVessels = system.traffic.getVesselsNear(station.position, 50000);

    if (nearbyVessels.length === 0) return null;

    // Pick a vessel to mention
    const vessel = nearbyVessels[Math.floor(Math.random() * nearbyVessels.length)];

    const messages = [
      `${vessel.name}, you are cleared for docking at port ${randomInt(1, 8)}`,
      `${vessel.name}, reduce velocity to 100 m/s for final approach`,
      `All vessels, maintain safe distance from station perimeter`,
      `${vessel.name}, standby for departure clearance`,
      `Traffic advisory: high volume of inbound vessels, expect delays`,
    ];

    return {
      id: generateId(),
      timestamp: system.getTime(),
      source: station.id,
      destination: 'BROADCAST',
      relay: [],
      type: MessageType.TRAFFIC_CONTROL,
      priority: MessagePriority.NORMAL,
      content: messages[Math.floor(Math.random() * messages.length)],
      data: { vesselId: vessel.id },
      transmitted: false,
      received: false,
      signalStrength: 1.0,
      latency: 0
    };
  }

  /**
   * Generate trade broadcast
   */
  private generateTradeBroadcast(station: SpaceStation): Message {
    const economy = station.economy;

    // Find highest demand commodity
    const topDemand = Array.from(economy.demandGoods)[0];
    const topSupply = Array.from(economy.supplyGoods)[0];

    const messages = [
      `${topDemand} prices up 15% at ${station.name}`,
      `High demand for ${topDemand} components`,
      `${station.name} now selling ${topSupply} at competitive rates`,
      `Bulk contracts available for ${topSupply} shipments`,
      `Station ${station.name} seeking cargo haulers`,
    ];

    return {
      id: generateId(),
      timestamp: system.getTime(),
      source: station.id,
      destination: 'BROADCAST',
      relay: [],
      type: MessageType.TRADE_BROADCAST,
      priority: MessagePriority.LOW,
      content: messages[Math.floor(Math.random() * messages.length)],
      data: {
        commodity: topDemand,
        price: economy.getPrice(topDemand)
      },
      transmitted: false,
      received: false,
      signalStrength: 1.0,
      latency: 0
    };
  }
}
```

### Integration Points

#### With Satellites:
- **Input**: Satellite positions for relay nodes
- **Input**: Communication satellite signal strength
- **Output**: Data routed through satellite network

#### With NPC Traffic:
- **Input**: Vessel positions and states
- **Output**: Traffic control messages
- **Output**: Ship-to-ship chatter

#### With Events:
- **Input**: Event notifications (solar flares disrupt comms)
- **Output**: Warning broadcasts

#### With Player:
- **Input**: Player hails
- **Output**: Responses from NPCs/stations
- **Output**: Mission offers via comms

---

## 3. Dynamic Economy System

### Purpose
Simulate supply and demand with real-time price fluctuations based on NPC traffic, production, and events.

### Physics/Mathematical Models

#### 3.1 Supply and Demand Curves
```typescript
/**
 * Economic physics using supply-demand equilibrium
 */
class EconomicModel {
  /**
   * Price calculation using supply-demand curves
   *
   * Basic equation:
   *   P = P_base * (demand / supply)^elasticity
   *
   * Where:
   *   P_base = Base price (production cost + markup)
   *   demand = Current demand level
   *   supply = Current supply level
   *   elasticity = How responsive price is to supply/demand (typically 0.5-2.0)
   */
  calculatePrice(
    commodity: Commodity,
    supply: number,
    demand: number
  ): number {
    const ratio = demand / Math.max(supply, 0.1); // Avoid division by zero
    const price = commodity.basePrice * Math.pow(ratio, commodity.elasticity);

    // Clamp to reasonable bounds
    return Math.max(
      commodity.minPrice,
      Math.min(commodity.maxPrice, price)
    );
  }

  /**
   * Supply dynamics (production and consumption)
   *
   * dS/dt = production - consumption - decay
   *
   * Where:
   *   production = Station output (depends on type)
   *   consumption = Local demand
   *   decay = Spoilage/degradation (for perishables)
   */
  updateSupply(
    station: SpaceStation,
    commodity: string,
    dt: number
  ): number {
    const current = station.inventory.get(commodity) || 0;

    // Production (if station produces this commodity)
    let production = 0;
    if (station.economy.supplyGoods.includes(commodity)) {
      production = this.getProductionRate(station, commodity) * dt;
    }

    // Consumption (local demand)
    const consumption = this.getConsumptionRate(station, commodity) * dt;

    // Decay (for perishables like food)
    const decayRate = COMMODITY_DECAY_RATES.get(commodity) || 0;
    const decay = current * decayRate * dt;

    // Update
    const newSupply = Math.max(0, current + production - consumption - decay);
    station.inventory.set(commodity, newSupply);

    return newSupply;
  }

  /**
   * Demand dynamics (population and industry needs)
   *
   * demand = baselineDemand + industrialDemand + eventDemand
   */
  calculateDemand(
    station: SpaceStation,
    commodity: string
  ): number {
    // Baseline from population
    const populationDemand =
      station.population * COMMODITY_CONSUMPTION_PER_CAPITA.get(commodity);

    // Industrial demand (what this station needs for production)
    const industrialDemand = this.getIndustrialDemand(station, commodity);

    // Event-driven demand spikes
    const eventDemand = this.getEventDemand(station, commodity);

    return populationDemand + industrialDemand + eventDemand;
  }
}
```

#### 3.2 Trade Routes and Arbitrage
```typescript
/**
 * Trade route optimization
 */
class TradeRouteCalculator {
  /**
   * Find profitable trade routes
   *
   * Profit = (sellPrice - buyPrice) * cargoCapacity - transportCost
   *
   * Where:
   *   transportCost = fuelCost + timeCost + riskCost
   */
  findProfitableRoutes(
    system: StarSystem,
    cargoCapacity: number,
    maxDistance: number
  ): TradeRoute[] {
    const routes: TradeRoute[] = [];

    for (const origin of system.stations) {
      for (const destination of system.stations) {
        if (origin === destination) continue;

        const distance = magnitude(sub(destination.position, origin.position));
        if (distance > maxDistance) continue;

        // Find best commodity to trade
        for (const commodity of TRADEABLE_COMMODITIES) {
          const buyPrice = origin.economy.getPrice(commodity);
          const sellPrice = destination.economy.getPrice(commodity);
          const priceMargin = sellPrice - buyPrice;

          if (priceMargin <= 0) continue; // Not profitable

          // Calculate costs
          const fuelCost = this.calculateFuelCost(distance);
          const timeCost = this.calculateTimeCost(distance);
          const riskCost = this.calculateRiskCost(origin, destination);

          const revenue = priceMargin * cargoCapacity;
          const costs = fuelCost + timeCost + riskCost;
          const profit = revenue - costs;

          if (profit > 0) {
            routes.push({
              origin: origin.id,
              destination: destination.id,
              commodity,
              buyPrice,
              sellPrice,
              profit,
              distance,
              estimatedTime: distance / AVERAGE_CARGO_SPEED
            });
          }
        }
      }
    }

    // Sort by profit margin
    routes.sort((a, b) => b.profit - a.profit);

    return routes;
  }
}
```

### Data Structures

#### 3.3 Station Economy
```typescript
interface StationEconomy {
  // Market data
  prices: Map<string, number>;           // commodity -> current price
  inventory: Map<string, number>;        // commodity -> quantity in tons
  production: Map<string, number>;       // commodity -> tons per hour
  consumption: Map<string, number>;      // commodity -> tons per hour

  // Trade history (for price trends)
  transactions: Transaction[];
  priceHistory: Map<string, PricePoint[]>; // For charts/trends

  // Market state
  wealthLevel: number;                   // 0-1
  tradeVolume: number;                   // Credits per day
  supplyGoods: string[];                 // What this station exports
  demandGoods: string[];                 // What this station imports

  // Market events
  activeEvents: EconomicEvent[];
}

interface Transaction {
  timestamp: number;
  commodity: string;
  quantity: number;
  price: number;
  buyer: string;
  seller: string;
}

interface EconomicEvent {
  type: 'SHORTAGE' | 'GLUT' | 'STRIKE' | 'BOOM' | 'RECESSION';
  commodity?: string;
  priceMultiplier: number;               // 0.5 = 50% off, 2.0 = double price
  duration: number;                      // seconds
  startTime: number;
}

interface Commodity {
  id: string;
  name: string;
  basePrice: number;                     // Credits per ton
  minPrice: number;                      // Floor price
  maxPrice: number;                      // Ceiling price
  elasticity: number;                    // Price responsiveness (0.5-2.0)
  massPerUnit: number;                   // kg
  category: CommodityCategory;
}

enum CommodityCategory {
  RAW_MATERIALS,    // Ore, ice, gases
  REFINED_GOODS,    // Metals, alloys, chemicals
  MANUFACTURED,     // Electronics, machinery, parts
  CONSUMABLES,      // Food, water, medicine
  LUXURY,           // Art, entertainment, exotic goods
  ILLEGAL,          // Contraband, weapons, drugs
}
```

#### 3.4 Market Simulator
```typescript
class MarketSimulator {
  private economicModel: EconomicModel;
  private tradeCalculator: TradeRouteCalculator;

  /**
   * Update all station economies
   */
  update(dt: number, system: StarSystem): void {
    // 1. Update supply/demand for each station
    for (const station of system.stations) {
      this.updateStationEconomy(station, dt);
    }

    // 2. Simulate NPC trading (cargo deliveries)
    this.simulateNPCTrading(system);

    // 3. Generate market events
    if (Math.random() < 0.001 * dt) { // 0.1% chance per second
      this.generateMarketEvent(system);
    }

    // 4. Update trade routes
    this.updateTradeRoutes(system);
  }

  /**
   * Update single station economy
   */
  private updateStationEconomy(station: SpaceStation, dt: number): void {
    for (const commodity of TRADEABLE_COMMODITIES) {
      // Update supply
      const supply = this.economicModel.updateSupply(station, commodity, dt);

      // Calculate demand
      const demand = this.economicModel.calculateDemand(station, commodity);

      // Update price
      const price = this.economicModel.calculatePrice(
        COMMODITIES.get(commodity)!,
        supply,
        demand
      );

      station.economy.prices.set(commodity, price);

      // Record price history
      this.recordPricePoint(station, commodity, price);
    }
  }

  /**
   * Simulate NPC cargo deliveries affecting economy
   */
  private simulateNPCTrading(system: StarSystem): void {
    // Get all cargo vessels that have arrived at stations
    const arrivals = system.traffic.getArrivals();

    for (const vessel of arrivals) {
      if (vessel.cargo) {
        const station = system.getStation(vessel.destination);
        if (!station) continue;

        // Unload cargo -> increases supply
        for (const [commodity, quantity] of vessel.cargo.items) {
          const current = station.inventory.get(commodity) || 0;
          station.inventory.set(commodity, current + quantity);

          // Record transaction
          station.economy.transactions.push({
            timestamp: system.getTime(),
            commodity,
            quantity,
            price: station.economy.prices.get(commodity)!,
            buyer: station.id,
            seller: vessel.id
          });
        }

        // Trigger price recalculation
        this.updateStationEconomy(station, 0);
      }
    }
  }

  /**
   * Generate random market event
   */
  private generateMarketEvent(system: StarSystem): void {
    const station = system.stations[Math.floor(Math.random() * system.stations.length)];
    const commodity = TRADEABLE_COMMODITIES[Math.floor(Math.random() * TRADEABLE_COMMODITIES.length)];

    const eventTypes: EconomicEvent['type'][] = ['SHORTAGE', 'GLUT', 'STRIKE', 'BOOM'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const event: EconomicEvent = {
      type,
      commodity,
      priceMultiplier: type === 'SHORTAGE' ? 2.0 : type === 'GLUT' ? 0.5 : 1.5,
      duration: 3600 + Math.random() * 3600, // 1-2 hours
      startTime: system.getTime()
    };

    station.economy.activeEvents.push(event);

    // Broadcast event
    system.comms.broadcast({
      type: MessageType.TRADE_BROADCAST,
      priority: MessagePriority.HIGH,
      content: this.getEventMessage(event, station, commodity),
      source: station.id
    });
  }
}
```

### Integration Points

#### With NPC Traffic:
- **Input**: Cargo deliveries (increase supply)
- **Output**: Trade routes for cargo vessels
- **Output**: Profitable destinations

#### With Stations:
- **Input**: Station type determines production
- **Output**: Inventory levels
- **Output**: Prices

#### With Events:
- **Input**: Disasters create shortages
- **Output**: Price spikes drive emergencies

#### With Player:
- **Input**: Player trades affect market
- **Output**: Buy/sell prices
- **Output**: Trade opportunities

---

## 4. Points of Interest System

### Purpose
Generate discoverable locations with rewards to encourage exploration.

### Physics Components

#### 4.1 Debris Field Physics
```typescript
/**
 * Derelict ships and debris follow orbital mechanics
 */
class DerelictPhysics {
  /**
   * Derelicts tumble in space
   *
   * Angular momentum conservation:
   *   L = I * ω (constant in vacuum)
   *
   * Tumbling motion:
   *   attitude(t) = attitude_0 + ω * t
   */
  updateDerelict(derelict: Derelict, dt: number): void {
    // Orbital motion (Keplerian)
    derelict.orbitalBody.update(dt);

    // Tumbling (angular momentum)
    derelict.attitude.pitch += derelict.angularVelocity.x * dt;
    derelict.attitude.yaw += derelict.angularVelocity.y * dt;
    derelict.attitude.roll += derelict.angularVelocity.z * dt;

    // Normalize angles
    derelict.attitude.pitch = normalizeAngle(derelict.attitude.pitch);
    derelict.attitude.yaw = normalizeAngle(derelict.attitude.yaw);
    derelict.attitude.roll = normalizeAngle(derelict.attitude.roll);
  }
}
```

#### 4.2 Scan Mechanics
```typescript
/**
 * Active sensor scanning to discover POIs
 */
class ScanMechanics {
  /**
   * Scan cone physics
   *
   * Detection probability:
   *   P = signalStrength * (1 - distance/maxRange) * targetCrossSection
   *
   * Where:
   *   signalStrength = sensor power / (4π * distance²)
   *   targetCrossSection = effective radar cross-section
   */
  performScan(
    scanner: Spacecraft,
    poi: PointOfInterest,
    scanPower: number,
    scanDuration: number
  ): ScanResult {
    const distance = magnitude(sub(poi.position, scanner.position));

    // Radar equation: P_r = P_t * G² * λ² * σ / ((4π)³ * R⁴)
    const wavelength = 0.03; // 10 GHz radar
    const gain = 35; // dB -> linear
    const sigma = poi.radarCrossSection;

    const signalReturn =
      (scanPower * Math.pow(gain, 2) * Math.pow(wavelength, 2) * sigma) /
      (Math.pow(4 * Math.PI, 3) * Math.pow(distance, 4));

    // Detection threshold
    const MIN_SIGNAL = 1e-15; // W
    const detected = signalReturn > MIN_SIGNAL;

    // Scan time affects detail level
    const detailLevel = Math.min(1.0, scanDuration / poi.requiredScanTime);

    return {
      detected,
      signalStrength: signalReturn,
      distance,
      detailLevel,
      classification: detailLevel > 0.8 ? poi.type : 'UNKNOWN',
      reward: detailLevel > 0.95 ? poi.reward : null
    };
  }
}
```

### Data Structures

#### 4.3 Point of Interest Types
```typescript
interface PointOfInterest {
  id: string;
  type: POIType;
  position: Vector3;
  velocity: Vector3;

  // Physics
  orbitalBody?: OrbitalBody;
  attitude: Attitude;
  angularVelocity: Vector3;

  // Scan properties
  radarCrossSection: number;     // m² (for radar detection)
  visualMagnitude: number;       // Brightness
  thermalSignature: number;      // K (for IR detection)
  requiredScanTime: number;      // seconds for full analysis

  // Discovery state
  discovered: boolean;
  scanned: boolean;
  scanProgress: number;          // 0-1

  // Reward
  reward: POIReward;
}

enum POIType {
  DERELICT_SHIP,
  CARGO_CONTAINER,
  HIDDEN_CACHE,
  ANOMALY,
  RESEARCH_STATION,
  ARCHAEOLOGICAL_SITE,
  DEBRIS_FIELD,
  ASTEROID_CLUSTER,
}

interface POIReward {
  credits?: number;
  cargo?: Map<string, number>;
  data?: string;                 // Research data, maps, etc.
  missionUnlock?: string;
  reputation?: Map<string, number>; // faction -> rep change
}

interface Derelict extends PointOfInterest {
  shipClass: string;
  condition: number;             // 0-1 (1 = pristine, 0 = wreckage)
  salvageableComponents: string[];
  dangerLevel: number;           // 0-1 (radiation, structural collapse risk)
}
```

#### 4.4 POI Generator
```typescript
class POIGenerator {
  /**
   * Generate POIs for a star system
   */
  generatePOIs(system: StarSystem, count: number): PointOfInterest[] {
    const pois: PointOfInterest[] = [];

    for (let i = 0; i < count; i++) {
      const type = this.selectPOIType(system);
      const poi = this.createPOI(type, system);
      pois.push(poi);
    }

    return pois;
  }

  /**
   * Create derelict ship
   */
  private createDerelict(system: StarSystem): Derelict {
    // Place in orbit around random planet or in asteroid belt
    const location = this.selectDerelictLocation(system);

    // Generate orbital parameters
    const orbitalElements = this.generateOrbit(location, 'unstable');

    // Create physics body
    const orbitalBody = new OrbitalBody({
      name: `Derelict-${generateId()}`,
      mass: 10000 + Math.random() * 40000, // 10-50 tons
      radius: 10 + Math.random() * 20,     // 10-30m
      ...orbitalElements
    });

    // Random tumble rate
    const angularVelocity = {
      x: (Math.random() - 0.5) * 0.1,
      y: (Math.random() - 0.5) * 0.1,
      z: (Math.random() - 0.5) * 0.1
    };

    // Generate salvageable cargo
    const condition = 0.1 + Math.random() * 0.5; // 10-60% intact
    const salvageComponents = this.generateSalvage(condition);

    return {
      id: generateId(),
      type: POIType.DERELICT_SHIP,
      position: orbitalBody.position,
      velocity: orbitalBody.velocity,
      orbitalBody,
      attitude: { pitch: 0, yaw: 0, roll: 0 },
      angularVelocity,
      radarCrossSection: 50 + Math.random() * 200, // 50-250 m²
      visualMagnitude: 10 + Math.random() * 5,     // Dim
      thermalSignature: 200 + Math.random() * 100, // Cold but detectable
      requiredScanTime: 30 + Math.random() * 60,   // 30-90 seconds
      discovered: false,
      scanned: false,
      scanProgress: 0,
      shipClass: this.selectDerelictClass(),
      condition,
      salvageableComponents,
      dangerLevel: Math.random() * 0.5,
      reward: {
        cargo: new Map(salvageComponents.map(c => [c, 1 + Math.random() * 10])),
        credits: Math.floor(condition * 50000)
      }
    };
  }

  /**
   * Create anomaly (mysterious signature)
   */
  private createAnomaly(system: StarSystem): PointOfInterest {
    // Place at interesting location (Lagrange point, deep space, near hazard)
    const location = this.selectAnomalyLocation(system);

    // Anomalies are stationary or slow-moving
    const velocity = {
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10
    };

    return {
      id: generateId(),
      type: POIType.ANOMALY,
      position: location,
      velocity,
      attitude: { pitch: 0, yaw: 0, roll: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      radarCrossSection: 5, // Very small
      visualMagnitude: 15,  // Very dim
      thermalSignature: 2000 + Math.random() * 3000, // HOT (unusual)
      requiredScanTime: 120, // 2 minutes of detailed scanning
      discovered: false,
      scanned: false,
      scanProgress: 0,
      reward: {
        data: 'anomaly_research',
        credits: 100000,
        missionUnlock: 'anomaly_investigation'
      }
    };
  }
}
```

### Integration Points

#### With StarSystem:
- **Input**: System layout for POI placement
- **Output**: POI positions for rendering

#### With Scanner/Sensors:
- **Input**: Player scan requests
- **Output**: Detection results

#### With Missions:
- **Output**: Mission triggers (investigate anomaly)
- **Input**: Mission completion (mark POI as looted)

#### With Economy:
- **Output**: Salvaged cargo
- **Input**: Market prices for salvage value

---

## 5. Random Events System

### Purpose
Create dynamic, unpredictable situations that require player response.

### Physics Components

#### 5.1 Solar Flare Physics
```typescript
/**
 * Solar flare propagation and effects
 */
class SolarFlarePhysics {
  /**
   * Flare intensity over time and distance
   *
   * Intensity(t, d) = I_0 * exp(-d/λ) * exp(-t/τ)
   *
   * Where:
   *   I_0 = Initial intensity
   *   d = Distance from star
   *   λ = Characteristic length (AU)
   *   t = Time since flare
   *   τ = Decay time constant
   */
  calculateFlareIntensity(
    flare: SolarFlare,
    position: Vector3,
    currentTime: number
  ): number {
    const distanceFromStar = magnitude(sub(position, flare.source));
    const timeSinceFlare = currentTime - flare.startTime;

    const distanceFactor = Math.exp(-distanceFromStar / flare.characteristicLength);
    const timeFactor = Math.exp(-timeSinceFlare / flare.decayTime);

    return flare.peakIntensity * distanceFactor * timeFactor;
  }

  /**
   * Effects on systems
   */
  applyFlareEffects(
    intensity: number,
    target: Spacecraft | Satellite
  ): void {
    // 1. Radiation damage to electronics
    const radiationDose = intensity * FLARE_RADIATION_FACTOR;
    target.systems.forEach(system => {
      system.health -= radiationDose * dt * system.radiationSensitivity;
    });

    // 2. Communication interference
    const commsNoiseFloor = intensity * COMMS_INTERFERENCE_FACTOR;
    target.communications.noiseFloor += commsNoiseFloor;

    // 3. Solar panel efficiency boost (more light!)
    if (target.power?.solarPanels) {
      target.power.solarPanels.forEach(panel => {
        panel.efficiency *= (1 + intensity * SOLAR_BOOST_FACTOR);
      });
    }

    // 4. Thermal load increase
    const thermalLoad = intensity * THERMAL_LOAD_FACTOR;
    target.thermal.addExternalHeat(thermalLoad);
  }
}
```

#### 5.2 Asteroid Impact Physics
```typescript
/**
 * Asteroid collision mechanics
 */
class AsteroidImpactPhysics {
  /**
   * Calculate impact energy
   *
   * E = 0.5 * m * v²
   *
   * Damage scales with kinetic energy
   */
  calculateImpactDamage(
    asteroid: Asteroid,
    target: Spacecraft,
    relativeVelocity: Vector3
  ): {
    damage: number;
    momentum: Vector3;
    debris: DebrisField;
  } {
    const impactVelocity = magnitude(relativeVelocity);
    const kineticEnergy = 0.5 * asteroid.mass * impactVelocity * impactVelocity;

    // Damage proportional to energy per unit area
    const impactArea = Math.PI * asteroid.radius * asteroid.radius;
    const energyDensity = kineticEnergy / impactArea;
    const damage = energyDensity / target.armor.strength;

    // Momentum transfer (elastic collision)
    const momentum = scale(
      normalize(relativeVelocity),
      asteroid.mass * impactVelocity
    );

    // Generate debris
    const debris = this.generateDebrisField(
      asteroid,
      target,
      impactVelocity
    );

    return { damage, momentum, debris };
  }
}
```

### Data Structures

#### 5.3 Event Types
```typescript
interface GameEvent {
  id: string;
  type: EventType;
  severity: number;              // 1-5

  // Spatial extent
  position: Vector3;
  radius: number;                // Area of effect (m)

  // Temporal extent
  startTime: number;
  duration: number;              // seconds

  // Effects
  effects: EventEffects;

  // State
  active: boolean;
  resolved: boolean;
  affectedEntities: string[];    // IDs of affected ships/stations
}

enum EventType {
  SOLAR_FLARE,
  PIRATE_RAID,
  STATION_EMERGENCY,
  ASTEROID_IMPACT,
  EQUIPMENT_MALFUNCTION,
  DISCOVERY,
  DIPLOMATIC_INCIDENT,
  MARKET_CRASH,
  PLAGUE_OUTBREAK,
  POWER_FAILURE,
}

interface EventEffects {
  // Damage
  hullDamagePerSecond?: number;
  systemDamagePerSecond?: number;

  // Environmental
  radiationPerSecond?: number;   // rads/s
  heatPerSecond?: number;        // W
  electricalInterference?: number; // 0-1

  // Economic
  priceMultipliers?: Map<string, number>;
  tradeVolumeDelta?: number;

  // Social
  reputationChanges?: Map<string, number>;
  lawLevelChange?: number;

  // Mission triggers
  missionOffers?: string[];
}

interface SolarFlare extends GameEvent {
  source: Vector3;               // Star position
  peakIntensity: number;         // W/m²
  characteristicLength: number;  // meters
  decayTime: number;             // seconds
}

interface PirateRaid extends GameEvent {
  pirateShips: NPCVessel[];
  targetStationOrRoute: string;
  bounty: number;                // Reward for defeating
}

interface StationEmergency extends GameEvent {
  station: string;
  emergencyType: 'FIRE' | 'LIFE_SUPPORT' | 'HULL_BREACH' | 'REACTOR_LEAK';
  casualties: number;
  evacuationRequired: boolean;
}
```

#### 5.4 Event System Manager
```typescript
class EventManager {
  private activeEvents: Map<string, GameEvent> = new Map();
  private eventHistory: GameEvent[] = [];
  private eventProbabilities: Map<EventType, number>;

  /**
   * Update active events
   */
  update(dt: number, system: StarSystem): void {
    const currentTime = system.getTime();

    // 1. Update active events
    for (const event of this.activeEvents.values()) {
      this.updateEvent(event, dt, currentTime, system);

      // Check if event expired
      if (currentTime - event.startTime > event.duration) {
        this.resolveEvent(event, system);
        this.activeEvents.delete(event.id);
        this.eventHistory.push(event);
      }
    }

    // 2. Trigger new events (probabilistic)
    this.triggerRandomEvents(dt, system);
  }

  /**
   * Probabilistic event triggering
   */
  private triggerRandomEvents(dt: number, system: StarSystem): void {
    for (const [eventType, baseProbability] of this.eventProbabilities) {
      // Modify probability based on system conditions
      let probability = baseProbability;

      // Example: Solar flares more likely with active star
      if (eventType === EventType.SOLAR_FLARE) {
        probability *= system.star.activity;
      }

      // Example: Pirate raids more likely in lawless systems
      if (eventType === EventType.PIRATE_RAID) {
        probability *= (1 - system.lawLevel);
      }

      // Roll for event
      if (Math.random() < probability * dt) {
        const event = this.createEvent(eventType, system);
        this.activeEvents.set(event.id, event);
        this.broadcastEventNotification(event, system);
      }
    }
  }

  /**
   * Create event instance
   */
  private createEvent(type: EventType, system: StarSystem): GameEvent {
    switch (type) {
      case EventType.SOLAR_FLARE:
        return this.createSolarFlare(system);
      case EventType.PIRATE_RAID:
        return this.createPirateRaid(system);
      case EventType.STATION_EMERGENCY:
        return this.createStationEmergency(system);
      // ... other types
    }
  }

  /**
   * Create solar flare event
   */
  private createSolarFlare(system: StarSystem): SolarFlare {
    const severity = 1 + Math.floor(Math.random() * 5);
    const peakIntensity = 1361 * (1 + severity * 0.5); // Up to 4× solar constant

    return {
      id: generateId(),
      type: EventType.SOLAR_FLARE,
      severity,
      position: system.star.position,
      radius: 5 * 1.496e11, // 5 AU
      startTime: system.getTime(),
      duration: 3600 + Math.random() * 7200, // 1-3 hours
      source: system.star.position,
      peakIntensity,
      characteristicLength: 1.496e11, // 1 AU
      decayTime: 1800, // 30 minutes
      effects: {
        radiationPerSecond: severity * 10,
        electricalInterference: severity * 0.2,
        heatPerSecond: peakIntensity * 0.1
      },
      active: true,
      resolved: false,
      affectedEntities: []
    };
  }

  /**
   * Apply event effects to entities
   */
  private updateEvent(
    event: GameEvent,
    dt: number,
    currentTime: number,
    system: StarSystem
  ): void {
    // Find entities in event radius
    const affected = system.findEntitiesInRadius(event.position, event.radius);

    for (const entity of affected) {
      // Apply effects based on event type
      if (event.type === EventType.SOLAR_FLARE) {
        const flare = event as SolarFlare;
        const intensity = this.calculateFlareIntensity(flare, entity.position, currentTime);
        this.applyFlareEffects(intensity, entity);
      }

      // Track affected entities
      if (!event.affectedEntities.includes(entity.id)) {
        event.affectedEntities.push(entity.id);
      }
    }
  }
}
```

### Integration Points

#### With All Systems:
Events can affect everything, so integration is bidirectional with all systems.

#### Solar Flare:
- **Output**: Satellite damage/degradation
- **Output**: Communication disruption
- **Output**: Power boost (solar panels)
- **Output**: Warning messages

#### Pirate Raid:
- **Output**: Spawn hostile NPCs
- **Output**: Station lockdown
- **Output**: Mission offers (bounty)

#### Station Emergency:
- **Output**: Rescue missions
- **Output**: Service disruptions
- **Output**: Price changes (shortages)

---

## 6. Faction & Security System

### Purpose
Manage territorial control, reputation, and law enforcement.

### Physics Components

#### 6.1 Reputation Dynamics
```typescript
/**
 * Reputation follows exponential decay
 */
class ReputationSystem {
  /**
   * Reputation decay over time
   *
   * R(t) = R_0 * exp(-t/τ) + R_equilibrium
   *
   * Where:
   *   R_0 = Initial reputation
   *   τ = Decay time constant (days)
   *   R_equilibrium = Neutral reputation (typically 0)
   */
  updateReputation(
    player: Player,
    faction: Faction,
    dt: number
  ): void {
    const current = player.reputation.get(faction.id) || 0;
    const decayRate = 1 / (30 * 86400); // 30 day half-life

    // Decay toward neutral (0)
    const decay = -current * decayRate * dt;
    const newRep = current + decay;

    player.reputation.set(faction.id, newRep);
  }

  /**
   * Add reputation change from action
   */
  applyReputationChange(
    player: Player,
    faction: Faction,
    delta: number,
    action: string
  ): void {
    const current = player.reputation.get(faction.id) || 0;
    const newRep = Math.max(-100, Math.min(100, current + delta));

    player.reputation.set(faction.id, newRep);

    // Trigger consequences
    if (newRep < -50 && current >= -50) {
      this.triggerHostility(faction, player);
    } else if (newRep > 75 && current <= 75) {
      this.unlockFactionBenefits(faction, player);
    }
  }
}
```

#### 6.2 Security Response Physics
```typescript
/**
 * Law enforcement response system
 */
class SecurityResponse {
  /**
   * Calculate response time based on distance and severity
   *
   * ResponseTime = BaseTime + Distance / PatrolSpeed
   *
   * PenaltyEscalation = BasePenalty * (1 + CrimeCount)^1.5
   */
  calculateResponse(
    crime: Crime,
    location: Vector3,
    system: StarSystem
  ): SecurityResponse {
    const zone = system.security.getZoneAt(location);

    // Response time based on zone
    const baseResponseTime = {
      [SecurityLevel.HIGH]: 30,      // 30 seconds
      [SecurityLevel.MEDIUM]: 180,   // 3 minutes
      [SecurityLevel.LOW]: 600,      // 10 minutes
      [SecurityLevel.LAWLESS]: Infinity // No response
    }[zone.level];

    // Distance to nearest patrol
    const nearestPatrol = system.traffic.findNearestPatrol(location);
    const distance = nearestPatrol ?
      magnitude(sub(location, nearestPatrol.position)) :
      100000; // 100 km default

    const travelTime = distance / PATROL_SPEED;
    const totalTime = baseResponseTime + travelTime;

    // Calculate penalty
    const baseFine = CRIME_FINES.get(crime.type) || 1000;
    const crimeHistory = this.getCrimeCount(crime.perpetrator);
    const fine = baseFine * Math.pow(1 + crimeHistory, 1.5);

    return {
      responseTime: totalTime,
      fine,
      bounty: crime.severity > 3 ? fine * 2 : 0,
      dispatchPatrols: Math.ceil(crime.severity / 2),
      wanted: crime.severity >= 4
    };
  }
}
```

### Data Structures

#### 6.3 Faction System
```typescript
interface Faction {
  id: string;
  name: string;
  description: string;

  // Territory
  controlledStations: string[];
  influence: Map<string, number>;    // systemId -> control (0-1)

  // Military
  militaryStrength: number;          // 0-100
  patrolRoutes: PatrolRoute[];
  fleetComposition: FleetData;

  // Economy
  economicPower: number;             // Credits
  tradeAgreements: string[];         // Other faction IDs

  // Diplomacy
  relationships: Map<string, number>; // factionId -> standing (-100 to 100)
  atWar: string[];                   // Faction IDs
  allied: string[];                  // Faction IDs

  // Player interaction
  playerReputation: number;          // -100 to 100
  missionOffers: Mission[];
  benefits: FactionBenefit[];
}

interface PatrolRoute {
  id: string;
  waypoints: Vector3[];
  schedule: number;                  // Hours per cycle
  shipCount: number;
  shipType: VesselType;
  active: boolean;
}

interface FactionBenefit {
  type: 'DISCOUNT' | 'ACCESS' | 'MISSION' | 'TECH' | 'PROTECTION';
  requiredReputation: number;
  value: any;
}

interface SecurityZone {
  level: SecurityLevel;
  center: Vector3;
  radius: number;
  patrolFrequency: number;           // Minutes between patrols
  responseTime: number;              // Seconds
  lawLevel: number;                  // 0-1 (1 = strict)
  scanProbability: number;           // Chance of cargo scan
}

enum SecurityLevel {
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  LAWLESS = 1
}

interface Crime {
  type: CrimeType;
  perpetrator: string;               // Ship/player ID
  location: Vector3;
  timestamp: number;
  severity: number;                  // 1-5
  witnessed: boolean;
  reported: boolean;
}

enum CrimeType {
  WEAPON_DISCHARGE,                  // Firing weapons
  ASSAULT,                           // Attacking ship
  MURDER,                            // Killing crew
  THEFT,                             // Stealing cargo
  CONTRABAND,                        // Illegal goods
  TRESPASSING,                       // Restricted area
  STATION_DAMAGE,                    // Damaging station
}
```

#### 6.4 Faction Manager
```typescript
class FactionManager {
  private factions: Map<string, Faction> = new Map();
  private securityZones: SecurityZone[] = [];
  private activeCrimes: Crime[] = [];

  /**
   * Update faction dynamics
   */
  update(dt: number, system: StarSystem): void {
    // 1. Update patrol routes
    this.updatePatrols(dt, system);

    // 2. Process crimes and responses
    this.processCrimes(dt, system);

    // 3. Update faction relationships
    this.updateRelationships(dt);

    // 4. Spawn faction-specific events
    this.spawnFactionEvents(dt, system);
  }

  /**
   * Update patrol ships
   */
  private updatePatrols(dt: number, system: StarSystem): void {
    for (const faction of this.factions.values()) {
      for (const route of faction.patrolRoutes) {
        if (!route.active) continue;

        // Check if patrol ships exist
        const patrols = system.traffic.vessels.filter(
          v => v.type === VesselType.PATROL_SHIP && v.faction === faction.id
        );

        // Spawn if needed
        if (patrols.length < route.shipCount) {
          this.spawnPatrol(faction, route, system);
        }
      }
    }
  }

  /**
   * Process crime reporting and response
   */
  private processCrimes(dt: number, system: StarSystem): void {
    for (const crime of this.activeCrimes) {
      // Check if in security zone
      const zone = this.getSecurityZone(crime.location);

      if (zone.level === SecurityLevel.LAWLESS) {
        // No law enforcement
        continue;
      }

      // Calculate response
      const response = this.security.calculateResponse(crime, crime.location, system);

      // Dispatch patrols
      if (response.dispatchPatrols > 0) {
        this.dispatchSecurityResponse(
          crime.location,
          response.dispatchPatrols,
          zone,
          system
        );
      }

      // Apply penalties
      const perpetrator = system.getEntity(crime.perpetrator);
      if (perpetrator) {
        perpetrator.bounty = (perpetrator.bounty || 0) + response.bounty;
        perpetrator.wanted = response.wanted;
      }

      // Reputation impact
      const controllingFaction = this.getFactionControllingZone(zone);
      if (controllingFaction) {
        this.reputation.applyReputationChange(
          perpetrator,
          controllingFaction,
          -crime.severity * 5,
          crime.type
        );
      }
    }

    // Clear processed crimes
    this.activeCrimes = [];
  }

  /**
   * Report crime
   */
  reportCrime(crime: Crime): void {
    this.activeCrimes.push(crime);

    // Broadcast warning
    this.comms.broadcast({
      type: MessageType.EMERGENCY,
      priority: MessagePriority.HIGH,
      content: `Security alert: ${crime.type} reported in sector ${this.getSectorName(crime.location)}`,
      source: 'SECURITY'
    });
  }
}
```

### Integration Points

#### With NPC Traffic:
- **Output**: Patrol ship spawns
- **Input**: Criminal activity detection

#### With Player:
- **Input**: Player actions (crimes, trades)
- **Output**: Reputation changes
- **Output**: Bounties/fines

#### With Stations:
- **Input**: Station ownership
- **Output**: Access restrictions
- **Output**: Service discounts

#### With Missions:
- **Output**: Faction-specific missions
- **Input**: Mission completion (rep rewards)

---

## Integration Matrix

| System | Inputs From | Outputs To |
|--------|-------------|------------|
| **NPC Traffic** | StarSystem (positions), Economy (routes), Events (emergencies) | Communications (chatter), Economy (deliveries), Rendering |
| **Communications** | NPC Traffic (ships), Stations, Events | UI (messages), Player, Missions |
| **Economy** | NPC Traffic (cargo), Player (trades), Events (disruptions) | Stations (prices), NPC Traffic (routes) |
| **POI** | StarSystem (placement), Scanner (detection) | Missions (triggers), Economy (salvage) |
| **Events** | Time (probability), System state | All systems (effects) |
| **Factions** | Player (actions), Events (wars) | NPC Traffic (patrols), Missions, Economy |

---

## Performance Considerations

### Update Rates
```typescript
const UPDATE_RATES = {
  NPCTraffic: 60,        // 60 Hz near player, 1 Hz far
  Communications: 10,    // 10 Hz (message processing)
  Economy: 1,            // 1 Hz (prices don't change that fast)
  POI: 1,                // 1 Hz (scan updates)
  Events: 1,             // 1 Hz (event checks)
  Factions: 0.1,         // 0.1 Hz (10 second updates)
};
```

### Culling and LOD
- **Spatial Hash Grids**: O(1) proximity queries
- **Distance-based LOD**: Reduce physics fidelity for distant objects
- **Despawn Radius**: Remove entities > 150km from player
- **Message Queue Limits**: Cap at 100 messages
- **Traffic Limits**: Max 50 active NPC ships

### Memory Optimization
- **Object Pooling**: Reuse vessel/message objects
- **Lazy Evaluation**: Don't compute until needed
- **Incremental Updates**: Spread expensive calculations over frames

---

## Implementation Order

### Phase 1: Core Infrastructure (Week 1)
1. **Day 1-2**: NPC vessel physics and basic navigation
2. **Day 3-4**: Traffic spawning and despawning
3. **Day 5**: Spatial hash grid for collisions
4. **Day 6-7**: Basic communications (message queue, broadcasts)

### Phase 2: Economic Foundation (Week 2)
1. **Day 1-2**: Supply/demand model
2. **Day 3-4**: NPC cargo deliveries affecting economy
3. **Day 5-6**: Trade route calculation
4. **Day 7**: Market events

### Phase 3: Exploration & Events (Week 3)
1. **Day 1-2**: POI generation system
2. **Day 3-4**: Scan mechanics
3. **Day 5-6**: Random event system
4. **Day 7**: Event effects integration

### Phase 4: Social Systems (Week 4)
1. **Day 1-2**: Faction data structures
2. **Day 3-4**: Reputation and relationships
3. **Day 5-6**: Security zones and patrols
4. **Day 7**: Integration and testing

**Total Estimated Time**: 4 weeks for complete implementation

---

## Testing Strategy

### Unit Tests
- Vessel physics (position, velocity integration)
- Signal propagation calculations
- Supply/demand economics
- Reputation decay
- Event probability

### Integration Tests
- NPC spawning and routing
- Message relay through satellite network
- Cargo deliveries affecting prices
- Crime detection and response

### Performance Tests
- 50 active vessels (target: 60 FPS)
- 100 messages/second (target: < 10ms latency)
- 1000 POIs in system (target: < 1ms query time)

### Gameplay Tests
- Universe feels "alive" (traffic visible)
- Communications are immersive
- Economy responds to actions
- Discoveries are rewarding
- Events create meaningful challenges

---

## Conclusion

This architecture provides:
1. **Realistic Physics**: Orbital mechanics, signal propagation, economics
2. **Scalable Performance**: Spatial hashing, LOD, culling
3. **Deep Integration**: All systems interact meaningfully
4. **Emergent Gameplay**: Simple rules create complex behaviors

Implementation should follow the phased approach, with each week building on the previous foundation. By Week 4, the universe will feel truly alive with autonomous traffic, dynamic economy, meaningful discoveries, and reactive factions.
