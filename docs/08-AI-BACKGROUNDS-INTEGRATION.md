# AI and Background Systems Integration Design

## Overview

This document describes how NPC ships, stations, and background universe systems integrate with **Vector Moon Lander**'s event-driven gameplay and retro terminal aesthetic.

**Context**: Player operates a single spacecraft through 4-5 control stations while encountering a living universe of NPC ships, stations, and celestial bodies.

**Existing Infrastructure** (13k lines):
- Star system generation (stars, planets, moons, asteroids)
- Space station system (docking, trading, services, factions)
- NPC ship AI (traders, miners, pirates, patrol, explorers)
- Faction/reputation system
- Traffic control & economy

---

## Part 1: NPC Ship AI for Gameplay Events

### 1.1 Ship Encounter Types

The player encounters NPC ships through events defined in `03-EVENTS-PROGRESSION.md`:

#### **A. Derelict Vessels** (Event 3.1)

**Purpose**: Salvage opportunity with precision docking challenge

**AI Behavior**:
```typescript
interface DerelictShip {
  state: 'DRIFTING' | 'TUMBLING' | 'STABLE';
  rotation: Vector3;         // rad/s
  salvage: SalvageContent;
  structural: {
    integrity: number;       // 0-100
    unstable: boolean;       // May break apart
    radiation: number;       // Hazard level
  };
}

class DerelictAI {
  update(deltaTime: number): void {
    // Derelicts don't actively pilot
    // Just physics simulation:
    // - Continue drift velocity
    // - Rotation (tumbling)
    // - Structural decay if unstable

    if (this.structural.unstable) {
      this.structural.integrity -= 0.1 * deltaTime;
      if (this.structural.integrity <= 0) {
        this.breakApart(); // Spawns debris
      }
    }
  }

  // Player interaction
  onPlayerDock(): SalvageResult {
    if (this.structural.unstable && Math.random() < 0.2) {
      return {
        success: false,
        damage: 15,
        message: "Hull collapsed during docking!"
      };
    }

    return {
      success: true,
      salvage: this.salvage,
      message: `Recovered ${this.salvage.fuel}kg fuel, ${this.salvage.parts} parts`
    };
  }
}
```

**Rendering**:
- Gray/dim ship outline (vector graphics)
- Drifting slowly across radar
- Damage indicators (sparks, venting atmosphere)
- Warning indicators if radioactive

---

#### **B. Distress Signal Ships** (Event 3.2)

**Purpose**: Rescue mission / moral choice

**AI Behavior**:
```typescript
interface DistressShip {
  type: 'GENUINE' | 'ALREADY_DEAD' | 'ABOUT_TO_EXPLODE';
  problem: 'FIRE' | 'POWER_LOSS' | 'HULL_BREACH' | 'ENGINE_FAILURE';
  timeRemaining: number;   // seconds until death/explosion
  crew: number;
  reward: RewardType | null;
}

class DistressAI {
  private emergency: EmergencyState;

  update(deltaTime: number): void {
    this.timeRemaining -= deltaTime;

    if (this.timeRemaining <= 0) {
      switch (this.type) {
        case 'GENUINE':
          this.killCrew();
          break;
        case 'ABOUT_TO_EXPLODE':
          this.explode();
          break;
      }
    }

    // Transmit distress signal
    if (this.timeRemaining > 0 && this.type === 'GENUINE') {
      this.broadcastSOS();
    }
  }

  // Player interaction
  onPlayerRescue(): RescueResult {
    if (this.timeRemaining <= 0) {
      return {
        success: false,
        message: "Too late. No survivors."
      };
    }

    return {
      success: true,
      crew: this.crew,
      reward: this.reward,
      reputation: +10, // Faction gratitude
      message: `${this.crew} crew rescued. They offer you ${this.reward.description}.`
    };
  }
}
```

**Rendering**:
- Red pulsing icon on radar (emergency beacon)
- Flashing lights
- Visible damage/smoke
- SOS text overlay when in range

---

#### **C. Trading Ships** (Background & Encounters)

**Purpose**: Ambient traffic, optional encounters

**AI Behavior**:
```typescript
interface TraderShip {
  route: TradeRoute;         // From NPCShipAI
  cargo: Commodity[];
  state: 'TRAVELING' | 'DOCKING' | 'DOCKED' | 'DEPARTING';
  destination: string;       // Station ID
}

class TraderAI {
  update(deltaTime: number, gameState: GameState): void {
    switch (this.state) {
      case 'TRAVELING':
        this.navigateToDestination(deltaTime);

        // Check if near station
        if (this.distanceToDestination() < 1000) {
          this.state = 'DOCKING';
          this.requestDockingClearance();
        }
        break;

      case 'DOCKING':
        this.approachDock(deltaTime);
        if (this.isDocked()) {
          this.state = 'DOCKED';
          this.startTrading();
        }
        break;

      case 'DOCKED':
        this.tradeTime -= deltaTime;
        if (this.tradeTime <= 0) {
          this.state = 'DEPARTING';
          this.completeTrade();
        }
        break;

      case 'DEPARTING':
        this.departFromDock(deltaTime);
        if (this.clearOfStation()) {
          this.selectNextDestination();
          this.state = 'TRAVELING';
        }
        break;
    }
  }

  // Player interaction (optional event: trade in space)
  onPlayerHail(): TradeOffer | null {
    if (this.faction.reputation < -20) {
      return null; // Hostile, won't trade
    }

    return {
      selling: this.cargo.filter(c => c.surplus),
      buying: this.cargo.filter(c => c.demand),
      prices: this.calculatePrices()
    };
  }
}
```

**Rendering**:
- Standard ship icon on radar (white/cyan)
- Cargo indicator (if scanned)
- Faction color coding
- Engine trail when moving

---

#### **D. Patrol Ships** (Background Security)

**Purpose**: Enforce laws, create tension near restricted zones

**AI Behavior**:
```typescript
interface PatrolShip {
  faction: StationFaction;
  route: PatrolRoute;
  alertLevel: 'ROUTINE' | 'SUSPICIOUS' | 'HOSTILE';
  scanTarget: string | null;  // Ship ID being scanned
}

class PatrolAI {
  update(deltaTime: number, nearbyShips: Ship[]): void {
    // Follow patrol route
    this.patrolRoute(deltaTime);

    // Scan nearby ships
    for (const ship of nearbyShips) {
      if (this.shouldScan(ship)) {
        this.scanShip(ship);

        const threat = this.assessThreat(ship);
        if (threat > 0.7) {
          this.alertLevel = 'HOSTILE';
          this.engageTarget(ship);
        } else if (threat > 0.3) {
          this.alertLevel = 'SUSPICIOUS';
          this.hailShip(ship);
        }
      }
    }
  }

  private shouldScan(ship: Ship): boolean {
    // Scan ships near stations
    if (ship.nearStation && !ship.hasTransponder) return true;

    // Scan ships with hostile faction rep
    if (this.faction.isHostile(ship.faction)) return true;

    return false;
  }

  // Player interaction
  onPlayerScanned(): ScanResult {
    if (this.playerHasContraband()) {
      return {
        warning: "Contraband detected. Prepare to be boarded.",
        alertLevel: 'HOSTILE',
        reputation: -15
      };
    }

    return {
      message: "Scan complete. Safe travels.",
      alertLevel: 'ROUTINE'
    };
  }
}
```

**Rendering**:
- Military faction colors
- Scanning beam effect (animated arc)
- Alert level indicator (green/yellow/red)
- Weapons hot indicator if hostile

---

### 1.2 AI Performance Management

**Level of Detail System**:
```typescript
interface AIPerformanceConfig {
  updateFrequency: Map<number, number>; // distance -> Hz
  maxActiveAI: number;
  priorityCalculation: (ship: Ship, player: Ship) => number;
}

class AIManager {
  private config: AIPerformanceConfig = {
    updateFrequency: new Map([
      [10000, 60],    // < 10km: 60 FPS
      [50000, 10],    // < 50km: 10 FPS
      [200000, 1],    // < 200km: 1 FPS
      [Infinity, 0.1] // Far: 0.1 FPS (10 second updates)
    ]),
    maxActiveAI: 50,
    priorityCalculation: (ship, player) => {
      const distance = this.distance(ship.position, player.position);
      const importance = ship.type === 'DISTRESS' ? 2 : 1;
      return (1 / distance) * importance;
    }
  };

  update(deltaTime: number, ships: NPCShip[], player: Ship): void {
    // Calculate priorities
    const shipPriorities = ships.map(ship => ({
      ship,
      priority: this.config.priorityCalculation(ship, player)
    })).sort((a, b) => b.priority - a.priority);

    // Update top priority ships
    let updated = 0;
    for (const { ship, priority } of shipPriorities) {
      if (updated >= this.config.maxActiveAI) break;

      const distance = this.distance(ship.position, player.position);
      const updateHz = this.getUpdateFrequency(distance);

      if (this.shouldUpdate(ship, updateHz, deltaTime)) {
        ship.ai.update(deltaTime);
        updated++;
      }
    }

    // Far ships: simple position extrapolation
    for (let i = updated; i < ships.length; i++) {
      const ship = shipPriorities[i].ship;
      ship.position.x += ship.velocity.x * deltaTime;
      ship.position.y += ship.velocity.y * deltaTime;
    }
  }
}
```

**Result**: Smooth performance even with 100+ ships in system

---

## Part 2: Station AI & Interaction

### 2.1 Docking Procedures

**Station Docking Controller**:
```typescript
interface DockingRequest {
  shipId: string;
  shipSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  urgency: 'ROUTINE' | 'EMERGENCY';
}

class StationDockingAI {
  private queue: DockingRequest[] = [];
  private assignedDocks: Map<string, DockingPort> = new Map();

  requestDocking(request: DockingRequest): DockingResponse {
    // Check reputation
    if (this.station.getFactionReputation(request.shipFaction) < -40) {
      return {
        granted: false,
        reason: "Docking clearance denied. You are not welcome here."
      };
    }

    // Find available dock
    const dock = this.station.findAvailableDock(request.shipSize);

    if (!dock) {
      // Queue
      this.queue.push(request);
      return {
        granted: false,
        queued: true,
        position: this.queue.length,
        estimatedWait: this.queue.length * 120, // 2 min per ship
        message: `Docking queue position ${this.queue.length}. Estimated wait: ${this.formatTime(this.queue.length * 120)}`
      };
    }

    // Grant clearance
    this.assignedDocks.set(request.shipId, dock);
    return {
      granted: true,
      dockId: dock.id,
      approachVector: this.calculateApproachVector(dock),
      message: `Docking clearance granted. Proceed to dock ${dock.id}. Approach vector: ${approachVector}`
    };
  }

  update(deltaTime: number): void {
    // Process queue
    for (const request of this.queue) {
      const dock = this.station.findAvailableDock(request.shipSize);
      if (dock) {
        this.assignedDocks.set(request.shipId, dock);
        this.notifyShip(request.shipId, "Dock available");
        this.queue = this.queue.filter(r => r !== request);
      }
    }

    // Timeout abandoned requests (ship left area)
    this.cleanupAbandonedRequests();
  }

  private calculateApproachVector(dock: DockingPort): Vector3 {
    // Return safe approach trajectory
    // Accounts for station rotation, other traffic
    return {
      x: dock.position.x - 1000,
      y: dock.position.y,
      z: dock.position.z
    };
  }
}
```

**Player Experience**:
1. Approach station (within 10km)
2. Request docking (Comms station, future)
3. Receive clearance or queue position
4. Follow approach vector (shown on Nav panel)
5. Precision docking challenge
6. Access station services

---

### 2.2 Station Services Interface

**Trading System**:
```typescript
interface TradingInterface {
  station: SpaceStation;
  playerShip: Ship;

  getCommodities(): CommodityListing[] {
    return this.station.economy.supplyGoods.map(commodity => ({
      name: commodity,
      basePrice: COMMODITY_BASE_PRICES.get(commodity),
      stationPrice: this.station.getCommodityPrice(commodity, basePrice),
      available: this.station.inventory.get(commodity),
      playerHas: this.playerShip.cargo.get(commodity) || 0
    }));
  }

  executeTrade(commodity: string, amount: number, buying: boolean): TradeResult {
    const price = this.station.getCommodityPrice(commodity, BASE_PRICE);
    const cost = price * amount;

    if (buying) {
      if (this.playerShip.credits < cost) {
        return { success: false, reason: "Insufficient funds" };
      }

      if (this.playerShip.cargoSpace < amount) {
        return { success: false, reason: "Insufficient cargo space" };
      }

      this.playerShip.credits -= cost;
      this.playerShip.cargo.add(commodity, amount);
      this.station.inventory.remove(commodity, amount);

      return {
        success: true,
        message: `Purchased ${amount} ${commodity} for ${cost} credits`
      };
    } else {
      // Selling to station
      if (!this.playerShip.cargo.has(commodity, amount)) {
        return { success: false, reason: "Not enough in cargo" };
      }

      this.playerShip.credits += cost;
      this.playerShip.cargo.remove(commodity, amount);
      this.station.inventory.add(commodity, amount);

      return {
        success: true,
        message: `Sold ${amount} ${commodity} for ${cost} credits`
      };
    }
  }
}
```

**Repair Services**:
```typescript
interface RepairService {
  getDamageReport(): SystemDamageReport[] {
    return this.playerShip.getSystems()
      .filter(s => s.health < 100)
      .map(s => ({
        system: s.name,
        health: s.health,
        repairCost: this.calculateRepairCost(s),
        repairTime: this.calculateRepairTime(s),
        priority: s.critical ? 'CRITICAL' : 'NORMAL'
      }));
  }

  repairSystem(systemName: string): RepairResult {
    const system = this.playerShip.getSystem(systemName);
    const cost = this.calculateRepairCost(system);

    if (this.playerShip.credits < cost) {
      return { success: false, reason: "Insufficient funds" };
    }

    this.playerShip.credits -= cost;
    system.health = 100;

    return {
      success: true,
      message: `${systemName} fully repaired for ${cost} credits`
    };
  }
}
```

**UI Integration** (Comms/Station panel):
```
┌─────────────────────────────────────────────────────┐
│ STATION SERVICES - Mars Orbital Hub        [DOCKED] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [1] REFUELING                                      │
│      Fuel available: 5000kg @ 10cr/kg              │
│      Your tank: 450/1000kg                         │
│      [Purchase] [Amount: ___]                      │
│                                                     │
│  [2] REPAIRS                                        │
│      Propulsion: 75% - Repair: 150cr               │
│      Thermal: 60% - Repair: 300cr                  │
│      [Select system to repair]                     │
│                                                     │
│  [3] TRADING                                        │
│      ┌──────────┬──────┬────────┬──────┐          │
│      │ Item     │ Buy  │ Sell   │ Have │          │
│      ├──────────┼──────┼────────┼──────┤          │
│      │ Water    │ 5cr  │ 3cr    │ 10   │ [B][S]   │
│      │ Food     │ 8cr  │ 6cr    │ 5    │ [B][S]   │
│      │ Parts    │ 50cr │ 40cr   │ 2    │ [B][S]   │
│      └──────────┴──────┴────────┴──────┘          │
│                                                     │
│  [4] MISSIONS (future)                              │
│  [5] UNDOCK                                         │
│                                                     │
│  CREDITS: 2,450cr                                   │
└─────────────────────────────────────────────────────┘
```

---

### 2.3 Background Station Activity

**Ambient Traffic**:
```typescript
class StationTrafficManager {
  private trafficShips: NPCShip[] = [];
  private spawnTimer: number = 0;

  update(deltaTime: number, station: SpaceStation): void {
    this.spawnTimer += deltaTime;

    // Spawn background traffic based on station type
    const spawnRate = this.getSpawnRate(station.stationType);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTrafficShip(station);
      this.spawnTimer = 0;
    }

    // Update traffic ships
    for (const ship of this.trafficShips) {
      this.updateTrafficShip(ship, station, deltaTime);
    }

    // Despawn ships that have departed
    this.trafficShips = this.trafficShips.filter(s => !s.departed);
  }

  private getSpawnRate(stationType: StationType): number {
    switch (stationType) {
      case 'TRADING_HUB': return 60;  // Ship every minute
      case 'MILITARY_BASE': return 120; // Every 2 minutes
      case 'MINING_PLATFORM': return 300; // Every 5 minutes
      default: return 180;
    }
  }

  private spawnTrafficShip(station: SpaceStation): void {
    // Create trader/courier approaching station
    const ship = new NPCShip({
      type: this.selectShipType(station),
      faction: station.faction,
      position: this.generateApproachPosition(station),
      destination: station.id,
      behavior: 'DOCK_AND_TRADE'
    });

    this.trafficShips.push(ship);
  }
}
```

**Player Experience**:
- See ships approaching/departing on radar
- Docking queue affected by traffic
- Occasional "Hold position, traffic inbound" messages
- Makes universe feel alive

---

## Part 3: Background Universe Activity

### 3.1 Ambient Ship Spawning

**System Traffic Manager**:
```typescript
class SystemTrafficManager {
  private ambientShips: NPCShip[] = [];

  generateAmbientTraffic(system: StarSystem, density: number): void {
    // Density based on civilization level (0-10)
    const numShips = Math.floor(density * 10);

    for (let i = 0; i < numShips; i++) {
      const ship = this.createAmbientShip(system);
      this.ambientShips.push(ship);
    }
  }

  private createAmbientShip(system: StarSystem): NPCShip {
    const type = this.weightedChoice([
      { type: 'TRADER', weight: 0.5 },
      { type: 'MINER', weight: 0.2 },
      { type: 'PATROL', weight: 0.2 },
      { type: 'COURIER', weight: 0.1 }
    ]);

    // Spawn near stations or in transit
    const station1 = this.randomStation(system);
    const station2 = this.randomStation(system);

    return new NPCShip({
      type,
      position: station1.position,
      destination: station2.id,
      route: this.calculateRoute(station1, station2)
    });
  }

  update(deltaTime: number, player: Ship): void {
    // Only update ships near player (LOD)
    const nearbyShips = this.ambientShips.filter(s =>
      this.distance(s.position, player.position) < 100000
    );

    for (const ship of nearbyShips) {
      ship.ai.update(deltaTime);
    }

    // Far ships: simplified updates
    const farShips = this.ambientShips.filter(s =>
      this.distance(s.position, player.position) >= 100000
    );

    for (const ship of farShips) {
      // Just move along route, no detailed AI
      ship.position.x += ship.velocity.x * deltaTime;
      ship.position.y += ship.velocity.y * deltaTime;
    }
  }
}
```

**Purpose**:
- Makes radar feel alive
- Background context for events
- Emergent encounters possible

---

### 3.2 Dynamic Event Spawning

**Event Trigger System**:
```typescript
class DynamicEventSpawner {
  private eventCooldown: number = 0;
  private lastEventPosition: Vector3 | null = null;

  update(deltaTime: number, player: Ship, system: StarSystem): Event | null {
    this.eventCooldown -= deltaTime;

    if (this.eventCooldown > 0) return null;

    // Don't spawn events too close together
    if (this.lastEventPosition &&
        this.distance(player.position, this.lastEventPosition) < 50000) {
      return null;
    }

    // Check for triggerable events
    const event = this.trySpawnEvent(player, system);

    if (event) {
      this.eventCooldown = 300; // 5 minute cooldown
      this.lastEventPosition = { ...player.position };
    }

    return event;
  }

  private trySpawnEvent(player: Ship, system: StarSystem): Event | null {
    // Random chance based on location
    const roll = Math.random();

    // Near asteroid field -> higher chance of derelict
    if (this.isNearAsteroidField(player, system) && roll < 0.1) {
      return this.spawnDerelictEvent(player);
    }

    // In open space -> distress signal possible
    if (this.isInOpenSpace(player, system) && roll < 0.05) {
      return this.spawnDistressEvent(player);
    }

    // Near stations -> trader encounter
    if (this.isNearStation(player, system) && roll < 0.15) {
      return this.spawnTraderEvent(player);
    }

    return null;
  }

  private spawnDerelictEvent(player: Ship): DerelictEvent {
    // Spawn derelict ahead of player
    const ahead = this.getAheadPosition(player, 5000);

    const derelict = new DerelictShip({
      position: ahead,
      salvage: this.generateSalvage(),
      structural: {
        integrity: Math.random() * 100,
        unstable: Math.random() < 0.3,
        radiation: Math.random() < 0.2 ? Math.random() * 10 : 0
      }
    });

    return {
      type: 'DERELICT_SALVAGE',
      target: derelict,
      description: "Sensors detect a derelict vessel ahead.",
      objective: "Dock with the derelict to salvage resources."
    };
  }
}
```

---

## Part 4: Visual Rendering Systems

### 4.1 Starfield Background

**Multi-Layer Parallax Starfield**:
```typescript
interface StarfieldLayer {
  stars: Star[];
  depth: number;      // 0-1 (0 = far, 1 = close)
  brightness: number;
  parallaxFactor: number;
}

interface Star {
  x: number;
  y: number;
  brightness: number; // 0-1
  size: number;       // 0.5-2 pixels
  color: string;
}

class StarfieldRenderer {
  private layers: StarfieldLayer[] = [];
  private canvas: HTMLCanvasElement;

  constructor(width: number, height: number) {
    this.generateStarfield(width, height);
  }

  private generateStarfield(width: number, height: number): void {
    // 3 layers for parallax
    this.layers = [
      this.generateLayer(width, height, 0.2, 200, 0.1),  // Far dim stars
      this.generateLayer(width, height, 0.5, 400, 0.3),  // Mid stars
      this.generateLayer(width, height, 0.8, 100, 0.7)   // Close bright stars
    ];
  }

  private generateLayer(w: number, h: number, depth: number, count: number, parallax: number): StarfieldLayer {
    const stars: Star[] = [];

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        brightness: 0.3 + Math.random() * 0.7,
        size: this.getStarSize(),
        color: this.getStarColor()
      });
    }

    return { stars, depth, brightness: depth, parallaxFactor: parallax };
  }

  private getStarSize(): number {
    const r = Math.random();
    if (r < 0.7) return 1;       // 70% normal
    if (r < 0.95) return 1.5;    // 25% bright
    return 2;                     // 5% very bright
  }

  private getStarColor(): string {
    const r = Math.random();
    if (r < 0.7) return '#ffffff';   // White
    if (r < 0.85) return '#ffffcc';  // Yellow-white
    if (r < 0.95) return '#ccccff';  // Blue-white
    return '#ffcccc';                 // Red
  }

  render(ctx: CanvasRenderingContext2D, cameraOffset: Vector2, palette: ColorPalette): void {
    for (const layer of this.layers) {
      ctx.fillStyle = palette.primary;
      ctx.globalAlpha = layer.brightness * 0.8;

      for (const star of layer.stars) {
        // Apply parallax
        const offsetX = cameraOffset.x * layer.parallaxFactor;
        const offsetY = cameraOffset.y * layer.parallaxFactor;

        // Wrap coordinates
        let x = (star.x - offsetX) % ctx.canvas.width;
        let y = (star.y - offsetY) % ctx.canvas.height;
        if (x < 0) x += ctx.canvas.width;
        if (y < 0) y += ctx.canvas.height;

        // Draw star
        ctx.fillRect(
          Math.floor(x),
          Math.floor(y),
          Math.ceil(star.size),
          Math.ceil(star.size)
        );
      }

      ctx.globalAlpha = 1.0;
    }
  }
}
```

**Result**: Depth through parallax, retro aesthetic, minimal performance impact

---

### 4.2 Planet Rendering

**When Player Near Planet**:
```typescript
class PlanetRenderer {
  renderPlanet(ctx: CanvasRenderingContext2D, planet: Planet, camera: Camera, palette: ColorPalette): void {
    const screenPos = this.worldToScreen(planet.position, camera);
    const screenRadius = this.worldToScreenScale(planet.physical.radius, camera);

    // Don't render if off-screen
    if (!this.isOnScreen(screenPos, screenRadius)) return;

    // Planet circle
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Atmosphere glow (if has atmosphere)
    if (planet.physical.atmospherePressure && planet.physical.atmospherePressure > 0) {
      const atmosphereRadius = screenRadius * 1.1;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, atmosphereRadius, 0, Math.PI * 2);
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Label (if close enough)
    if (screenRadius > 20) {
      ctx.font = '12px monospace';
      ctx.fillStyle = palette.primary;
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, screenPos.x, screenPos.y - screenRadius - 10);

      // Info (if very close)
      if (screenRadius > 100) {
        ctx.font = '10px monospace';
        ctx.fillStyle = palette.secondary;
        ctx.fillText(`${planet.planetClass}`, screenPos.x, screenPos.y - screenRadius - 25);
      }
    }
  }
}
```

**Atmosphere When in Orbit**:
```typescript
class AtmosphereRenderer {
  renderAtmosphericView(ctx: CanvasRenderingContext2D, planet: Planet, altitude: number, palette: ColorPalette): void {
    if (!planet.physical.atmospherePressure) return;

    // Gradient sky based on altitude
    const gradient = ctx.createLinearGradient(0, ctx.canvas.height, 0, 0);

    const skyColor = this.getSkyColor(planet, altitude);
    const altitudeFactor = Math.min(1, altitude / 100000); // Fade to black above 100km

    gradient.addColorStop(0, skyColor);
    gradient.addColorStop(altitudeFactor, `rgba(0, 0, 0, 0.5)`);
    gradient.addColorStop(1, '#000000');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Horizon line (if close to surface)
    if (altitude < 50000) {
      const horizonY = ctx.canvas.height - (altitude / 50000) * ctx.canvas.height;
      ctx.strokeStyle = palette.secondary;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(ctx.canvas.width, horizonY);
      ctx.stroke();
    }
  }

  private getSkyColor(planet: Planet, altitude: number): string {
    const atmos = planet.physical.atmosphereComposition;

    if (atmos?.includes('O2')) {
      // Earth-like
      return `rgb(135, 206, 235)`; // Sky blue
    } else if (atmos?.includes('CO2')) {
      // Mars-like
      return `rgb(255, 179, 102)`; // Butterscotch
    } else if (atmos?.includes('CH4')) {
      // Titan-like
      return `rgb(255, 153, 51)`;  // Orange
    }

    return `rgb(50, 50, 50)`;      // Generic gray
  }
}
```

---

### 4.3 Ship Contact Rendering

**Radar Display**:
```typescript
class RadarRenderer {
  renderContacts(ctx: CanvasRenderingContext2D, contacts: Contact[], player: Ship, range: number, palette: ColorPalette): void {
    const centerX = 200;
    const centerY = 200;
    const radarRadius = 150;

    // Radar circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.strokeStyle = palette.primary;
    ctx.stroke();

    // Range rings
    ctx.strokeStyle = palette.secondary;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cardinal directions
    ctx.fillStyle = palette.primary;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, centerY - radarRadius - 5);
    ctx.fillText('S', centerX, centerY + radarRadius + 15);
    ctx.textAlign = 'left';
    ctx.fillText('E', centerX + radarRadius + 5, centerY + 5);
    ctx.textAlign = 'right';
    ctx.fillText('W', centerX - radarRadius - 5, centerY + 5);
    ctx.textAlign = 'left';

    // Player (center)
    ctx.fillStyle = palette.accent;
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4);

    // Contacts
    for (const contact of contacts) {
      this.renderContact(ctx, contact, player, centerX, centerY, radarRadius, range, palette);
    }
  }

  private renderContact(ctx: CanvasRenderingContext2D, contact: Contact, player: Ship, centerX: number, centerY: number, radarRadius: number, range: number, palette: ColorPalette): void {
    // Calculate relative position
    const dx = contact.position.x - player.position.x;
    const dy = contact.position.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > range) return; // Out of range

    // Scale to radar
    const scale = radarRadius / range;
    const px = centerX + dx * scale;
    const py = centerY + dy * scale;

    // Color based on type
    let color = palette.primary;
    let symbol = '*';

    if (contact.type === 'STATION') {
      color = palette.info;
      symbol = '■';
    } else if (contact.type === 'DERELICT') {
      color = palette.secondary;
      symbol = '○';
    } else if (contact.type === 'DISTRESS') {
      color = palette.danger;
      symbol = '!';
    } else if (contact.faction === player.faction) {
      color = palette.good;
    } else if (contact.hostile) {
      color = palette.danger;
    }

    ctx.fillStyle = color;
    ctx.font = '14px monospace';
    ctx.fillText(symbol, px - 4, py + 4);

    // Label if targeted
    if (contact.targeted) {
      ctx.font = '10px monospace';
      ctx.fillText(contact.name, px + 10, py);
    }
  }
}
```

---

### 4.4 Asteroid Field Rendering

**Visual Asteroid Field**:
```typescript
class AsteroidFieldRenderer {
  private asteroidSprites: Vector2[][] = []; // Pre-generated vector shapes

  constructor() {
    // Generate 10 different asteroid shapes
    for (let i = 0; i < 10; i++) {
      this.asteroidSprites.push(this.generateAsteroidShape());
    }
  }

  private generateAsteroidShape(): Vector2[] {
    const points: Vector2[] = [];
    const numPoints = 6 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = 5 + Math.random() * 10;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }

    return points;
  }

  render(ctx: CanvasRenderingContext2D, asteroids: Asteroid[], camera: Camera, palette: ColorPalette): void {
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1;

    for (const asteroid of asteroids) {
      const screenPos = this.worldToScreen(asteroid.position, camera);

      if (!this.isOnScreen(screenPos)) continue;

      // Select sprite
      const spriteIndex = asteroid.id % this.asteroidSprites.length;
      const sprite = this.asteroidSprites[spriteIndex];

      // Draw
      ctx.beginPath();
      const first = sprite[0];
      ctx.moveTo(screenPos.x + first.x, screenPos.y + first.y);

      for (let i = 1; i < sprite.length; i++) {
        const point = sprite[i];
        ctx.lineTo(screenPos.x + point.x, screenPos.y + point.y);
      }

      ctx.closePath();
      ctx.stroke();
    }
  }
}
```

---

## Part 5: Integration with Game Loop

### 5.1 Rendering Pipeline

```typescript
class GameRenderer {
  private starfield: StarfieldRenderer;
  private planetRenderer: PlanetRenderer;
  private asteroidRenderer: AsteroidFieldRenderer;
  private radarRenderer: RadarRenderer;
  private shipRenderer: ShipRenderer;

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { player, system, camera, palette } = gameState;

    // 1. Background layers (static or slow-moving)
    this.starfield.render(ctx, camera.offset, palette);

    // 2. Distant objects
    if (gameState.nearPlanet) {
      this.planetRenderer.renderAtmosphericView(ctx, gameState.nearPlanet, gameState.altitude, palette);
    } else {
      this.planetRenderer.renderPlanets(ctx, system.planets, camera, palette);
    }

    // 3. Asteroid fields
    if (gameState.inAsteroidField) {
      this.asteroidRenderer.render(ctx, gameState.nearbyAsteroids, camera, palette);
    }

    // 4. Stations
    this.renderStations(ctx, system.stations, camera, palette);

    // 5. NPC ships
    this.shipRenderer.renderNPCShips(ctx, gameState.nearbyShips, camera, palette);

    // 6. Player ship (if external view - for debugging)
    if (gameState.viewMode === 'EXTERNAL') {
      this.shipRenderer.renderPlayerShip(ctx, player, camera, palette);
    }

    // 7. UI overlays (panels rendered separately)
    // This is just the space view background
  }
}
```

### 5.2 Game Loop Integration

```typescript
class Game {
  private aiManager: AIManager;
  private trafficManager: SystemTrafficManager;
  private eventSpawner: DynamicEventSpawner;
  private renderer: GameRenderer;

  update(deltaTime: number): void {
    // 1. Update universe (orbital mechanics)
    this.currentSystem.update(deltaTime);

    // 2. Update player ship
    this.playerShip.update(deltaTime);

    // 3. Update NPC AI (LOD-based)
    this.aiManager.update(deltaTime, this.npcShips, this.playerShip);

    // 4. Update station activity
    for (const station of this.currentSystem.stations) {
      station.dockingAI.update(deltaTime);
    }

    // 5. Update ambient traffic
    this.trafficManager.update(deltaTime, this.playerShip);

    // 6. Check for dynamic events
    const event = this.eventSpawner.update(deltaTime, this.playerShip, this.currentSystem);
    if (event) {
      this.triggerEvent(event);
    }

    // 7. Update camera
    this.camera.follow(this.playerShip.position);
  }

  render(): void {
    const ctx = this.canvas.getContext('2d')!;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render game world
    this.renderer.render(ctx, {
      player: this.playerShip,
      system: this.currentSystem,
      camera: this.camera,
      palette: this.settings.palette,
      nearPlanet: this.findNearestPlanet(),
      altitude: this.calculateAltitude(),
      inAsteroidField: this.isInAsteroidField(),
      nearbyShips: this.getNearbyShips(),
      nearbyAsteroids: this.getNearbyAsteroids(),
      viewMode: 'COCKPIT' // or 'EXTERNAL' for debug
    });

    // UI panels rendered on top
    this.uiManager.render(ctx);
  }
}
```

---

## Part 6: Performance Budget

### 6.1 Target Performance

- **60 FPS** on modern hardware
- **AI updates**: < 3ms per frame
- **Rendering**: < 5ms per frame
- **Total frame time**: < 16.67ms

### 6.2 Optimization Strategies

**1. Spatial Partitioning**
```typescript
class Quadtree {
  // Fast queries for nearby ships/objects
  // O(log n) instead of O(n)
  query(bounds: Rectangle): GameObject[] {
    // Returns only objects in view
  }
}
```

**2. Object Pooling**
```typescript
class ShipPool {
  private pool: NPCShip[] = [];

  acquire(): NPCShip {
    return this.pool.pop() || new NPCShip();
  }

  release(ship: NPCShip): void {
    ship.reset();
    this.pool.push(ship);
  }
}
```

**3. Rendering Culling**
```typescript
if (!isOnScreen(object.position, camera)) {
  continue; // Skip rendering
}
```

**4. LOD for AI**
- Near: Full AI (60 FPS)
- Medium: Simple AI (10 FPS)
- Far: Position extrapolation (1 FPS)

---

## Part 7: Configuration & Tuning

### 7.1 Game Settings

```typescript
interface GameSettings {
  ai: {
    maxActiveShips: number;        // Default: 50
    ambientTrafficDensity: number; // 0-1, default: 0.5
    eventFrequency: number;        // Default: 0.1 (10% chance per check)
  };

  graphics: {
    starfieldDensity: number;      // Default: 400 stars
    showAmbientShips: boolean;     // Default: true
    radarRange: number;            // Default: 50km
    enableParallax: boolean;       // Default: true
  };

  gameplay: {
    easyDocking: boolean;          // Larger docking tolerance
    friendlyTraffic: boolean;      // No hostile encounters
    unlimitedFuel: boolean;        // Debug mode
  };
}
```

### 7.2 Balance Parameters

```typescript
const BALANCE_CONFIG = {
  // NPC encounter rates
  derelictChance: 0.1,        // 10% in appropriate areas
  distressChance: 0.05,       // 5% in open space
  traderChance: 0.15,         // 15% near stations

  // Rewards
  derelictSalvage: {
    fuel: [10, 50],           // kg
    parts: [1, 3],
    credits: [0, 500]
  },

  distressReward: {
    reputation: 10,
    credits: [100, 500],
    fuel: [0, 20]           // Gratitude fuel
  },

  // Station pricing
  fuelPricePerKg: 10,         // credits
  repairCostPerPercent: 5,     // credits per 1% health

  // Traffic density
  tradingHubTraffic: 60,      // seconds between ships
  militaryBaseTraffic: 120,
  remoteStationTraffic: 300
};
```

---

## Part 8: Future Enhancements

### Post-MVP Features

**1. Combat System** (if added)
- Hostile NPC ships
- Weapons systems
- Shield mechanics
- Damage from combat

**2. Advanced Trading**
- Dynamic economy
- Supply/demand simulation
- Trade routes
- Commodity speculation

**3. Faction Reputation**
- Faction standings affect prices, access
- Reputation missions
- Faction-specific storylines

**4. Procedural Missions**
- Delivery contracts
- Rescue missions
- Bounty hunting
- Exploration contracts

**5. Visual Enhancements**
- Animated engine trails
- Explosion effects
- Station detail models
- Planetary surfaces

---

## Conclusion

This design integrates your existing universe systems (13k lines of star systems, stations, NPC AI, factions, economy) with the Vector Moon Lander gameplay.

**Key Integration Points**:
1. **NPCShipAI** → Drives derelicts, distress signals, traders, patrols
2. **SpaceStation** → Docking, trading, services, ambient traffic
3. **StarSystem** → Provides celestial bodies, asteroid fields, hazards
4. **FactionSystem** → Reputation affects station access, prices
5. **TrafficControl** → Manages docking queues, collision avoidance

**Visual Style**: Retro vector graphics, monochrome terminal aesthetic, consistent with `06-VISUAL-DESIGN-REFERENCE.md`

**Performance**: LOD systems ensure 60 FPS even with 100+ ships

**Next Steps**:
1. Implement basic starfield renderer
2. Hook NPCShipAI into event system
3. Create station docking interface
4. Add radar contact rendering
5. Implement dynamic event spawning

The universe is ready - now we just need to render it and let the player interact with it.
