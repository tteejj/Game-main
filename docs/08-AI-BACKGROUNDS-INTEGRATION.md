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

## Part 4: Instrument Display Rendering

**Key Principle**: You're looking at PANELS and INSTRUMENTS, not out windows. This is a submarine simulator.

### 4.1 Tactical Radar Display

**What You Actually See**: Simple 2D top-down radar on Navigation panel

```typescript
class TacticalRadarDisplay {
  private centerX: number = 200;
  private centerY: number = 200;
  private radarRadius: number = 150;

  render(ctx: CanvasRenderingContext2D, contacts: Contact[], player: Ship, range: number, palette: ColorPalette): void {
    // Radar circle
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radarRadius, 0, Math.PI * 2);
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Range rings (25%, 50%, 75%, 100%)
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.radarRadius * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Range labels
    ctx.font = '10px monospace';
    ctx.fillStyle = palette.secondary;
    ctx.textAlign = 'right';
    ctx.fillText(`${(range * 0.25).toFixed(1)}km`, this.centerX - 5, this.centerY);
    ctx.fillText(`${(range * 0.5).toFixed(1)}km`, this.centerX - 5, this.centerY - this.radarRadius * 0.25);
    ctx.fillText(`${(range * 0.75).toFixed(1)}km`, this.centerX - 5, this.centerY - this.radarRadius * 0.5);
    ctx.fillText(`${range.toFixed(1)}km`, this.centerX - 5, this.centerY - this.radarRadius * 0.75);

    // Cardinal directions
    ctx.font = '12px monospace';
    ctx.fillStyle = palette.primary;
    ctx.textAlign = 'center';
    ctx.fillText('N', this.centerX, this.centerY - this.radarRadius - 10);
    ctx.fillText('S', this.centerX, this.centerY + this.radarRadius + 20);
    ctx.textAlign = 'left';
    ctx.fillText('E', this.centerX + this.radarRadius + 10, this.centerY + 5);
    ctx.textAlign = 'right';
    ctx.fillText('W', this.centerX - this.radarRadius - 10, this.centerY + 5);

    // Player ship (center)
    ctx.fillStyle = palette.accent;
    ctx.fillRect(this.centerX - 3, this.centerY - 3, 6, 6);
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('YOU', this.centerX + 8, this.centerY + 5);

    // Contacts
    for (const contact of contacts) {
      this.renderContact(ctx, contact, player, range, palette);
    }

    // Heading indicator
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    const headingLength = 20;
    ctx.lineTo(
      this.centerX + Math.sin(player.heading) * headingLength,
      this.centerY - Math.cos(player.heading) * headingLength
    );
    ctx.stroke();
  }

  private renderContact(ctx: CanvasRenderingContext2D, contact: Contact, player: Ship, range: number, palette: ColorPalette): void {
    // Calculate relative position
    const dx = contact.position.x - player.position.x;
    const dy = contact.position.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > range) return; // Out of radar range

    // Scale to radar
    const scale = this.radarRadius / range;
    const px = this.centerX + dx * scale;
    const py = this.centerY + dy * scale;

    // Symbol and color based on contact type
    const display = this.getContactDisplay(contact, player);

    ctx.fillStyle = display.color;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(display.symbol, px, py + 5);

    // Label if targeted or very close
    if (contact.targeted || distance < range * 0.1) {
      ctx.font = '8px monospace';
      ctx.fillText(contact.callsign || contact.id.substring(0, 6), px, py - 8);
    }
  }

  private getContactDisplay(contact: Contact, player: Ship): { symbol: string; color: string } {
    // Use palette.primary, palette.secondary, palette.accent, palette.good, palette.warning, palette.critical

    if (contact.type === 'STATION') {
      return { symbol: '■', color: palette.info };
    } else if (contact.type === 'DERELICT') {
      return { symbol: '○', color: palette.secondary };
    } else if (contact.type === 'DISTRESS') {
      return { symbol: '!', color: palette.critical };
    } else if (contact.type === 'ASTEROID') {
      return { symbol: '·', color: palette.secondary };
    } else if (contact.type === 'PLANET') {
      return { symbol: '◯', color: palette.primary };
    } else if (contact.hostile) {
      return { symbol: '×', color: palette.critical };
    } else if (contact.faction === player.faction) {
      return { symbol: '*', color: palette.good };
    } else {
      return { symbol: '*', color: palette.primary };
    }
  }
}
```

**What it looks like**:
```
      N
      ↑
   50km

W ●─────● E
  │  ■  │
  │ YOU │
  │  *  │
  └─────┘
      S

● = Player
■ = Station
* = Other ship
○ = Derelict
! = Distress
```

---

### 4.2 Contact List Display

**Text-based contact listing** on Navigation panel:

```typescript
class ContactListRenderer {
  render(ctx: CanvasRenderingContext2D, contacts: Contact[], player: Ship, x: number, y: number, palette: ColorPalette): void {
    ctx.font = '12px monospace';
    ctx.fillStyle = palette.primary;

    // Header
    ctx.fillText('CONTACTS', x, y);
    y += 20;

    ctx.font = '10px monospace';
    ctx.fillStyle = palette.secondary;
    ctx.fillText('ID   RNG     BRG    VEL     TYPE', x, y);
    y += 15;

    // Sort contacts by distance
    const sorted = contacts
      .map(c => ({
        contact: c,
        distance: this.calculateDistance(c.position, player.position)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8); // Show only 8 closest

    // List contacts
    for (let i = 0; i < sorted.length; i++) {
      const { contact, distance } = sorted[i];
      const bearing = this.calculateBearing(contact.position, player.position, player.heading);
      const relativeVel = this.calculateRelativeVelocity(contact.velocity, player.velocity);

      // Color code by type/status
      if (contact.targeted) {
        ctx.fillStyle = palette.accent;
      } else if (contact.type === 'DISTRESS') {
        ctx.fillStyle = palette.critical;
      } else if (contact.hostile) {
        ctx.fillStyle = palette.warning;
      } else {
        ctx.fillStyle = palette.primary;
      }

      const line = this.formatContactLine(i + 1, distance, bearing, relativeVel, contact.type);
      ctx.fillText(line, x, y);
      y += 15;

      // Status indicator
      if (distance < 1000) {
        ctx.fillStyle = palette.good;
        ctx.fillText('CLOSE', x + 280, y - 15);
      } else if (relativeVel < 0) {
        ctx.fillStyle = palette.warning;
        ctx.fillText('CLOSING', x + 280, y - 15);
      }
    }
  }

  private formatContactLine(id: number, distance: number, bearing: number, velocity: number, type: string): string {
    const distKm = (distance / 1000).toFixed(1);
    const bearingDeg = Math.floor(bearing * 180 / Math.PI);
    const velMs = velocity.toFixed(1);
    const typeStr = type.substring(0, 6).toUpperCase();

    return `${id}    ${distKm.padStart(6)}km ${bearingDeg.toString().padStart(3)}° ${velMs.padStart(6)}m/s ${typeStr}`;
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateBearing(targetPos: Vector3, playerPos: Vector3, playerHeading: number): number {
    const dx = targetPos.x - playerPos.x;
    const dy = targetPos.y - playerPos.y;
    let bearing = Math.atan2(dx, dy) - playerHeading;

    // Normalize to 0-2π
    while (bearing < 0) bearing += Math.PI * 2;
    while (bearing >= Math.PI * 2) bearing -= Math.PI * 2;

    return bearing;
  }

  private calculateRelativeVelocity(targetVel: Vector3, playerVel: Vector3): number {
    const dx = targetVel.x - playerVel.x;
    const dy = targetVel.y - playerVel.y;
    const dz = targetVel.z - playerVel.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
```

**What it looks like**:
```
CONTACTS
ID   RNG     BRG    VEL     TYPE
1      8.2km 045°   12.5m/s TRADER   CLOSING
2     15.7km 310°    5.2m/s MINER
3      2.1km 180°   18.3m/s STATION  CLOSE
4     45.3km 092°    8.1m/s PATROL
```

---

### 4.3 Docking Camera View

**Small viewport** for precision docking challenges (optional, could be text-only):

```typescript
class DockingCameraRenderer {
  // Minimal wireframe view for docking
  render(ctx: CanvasRenderingContext2D, target: Station | Ship, player: Ship, x: number, y: number, width: number, height: number, palette: ColorPalette): void {
    // Draw viewport border
    ctx.strokeStyle = palette.primary;
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.font = '10px monospace';
    ctx.fillStyle = palette.secondary;
    ctx.fillText('DOCKING CAM', x + 5, y - 5);

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Calculate relative position
    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Scale (closer = bigger)
    const scale = Math.min(1, 1000 / distance);
    const targetSize = 30 * scale;

    // Draw target (simple square/circle for station/ship)
    if (target.type === 'STATION') {
      ctx.strokeStyle = palette.accent;
      ctx.strokeRect(
        centerX - targetSize / 2,
        centerY - targetSize / 2,
        targetSize,
        targetSize
      );
    } else {
      ctx.beginPath();
      ctx.arc(centerX, centerY, targetSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = palette.accent;
      ctx.stroke();
    }

    // Docking alignment indicator
    const alignmentError = this.calculateAlignmentError(player, target);
    if (alignmentError < 0.1) {
      ctx.fillStyle = palette.good;
      ctx.fillText('ALIGNED', centerX - 20, y + height - 5);
    } else {
      ctx.fillStyle = palette.warning;
      ctx.fillText('MISALIGNED', centerX - 30, y + height - 5);
    }

    // Distance readout
    ctx.fillStyle = palette.primary;
    ctx.fillText(`${distance.toFixed(0)}m`, centerX - 15, y + 15);

    // Relative velocity indicator
    const relVel = this.calculateApproachVelocity(player, target);
    let velColor = palette.good;
    if (Math.abs(relVel) > 5) velColor = palette.critical;
    else if (Math.abs(relVel) > 2) velColor = palette.warning;

    ctx.fillStyle = velColor;
    ctx.fillText(`${relVel.toFixed(1)}m/s`, centerX - 20, y + height - 20);
  }

  private calculateAlignmentError(player: Ship, target: any): number {
    // Simplified - returns 0-1 (0 = perfect, 1 = 180° off)
    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const targetBearing = Math.atan2(dx, dy);
    const error = Math.abs(targetBearing - player.heading);
    return Math.min(error / Math.PI, 1);
  }

  private calculateApproachVelocity(player: Ship, target: any): number {
    // Velocity component along approach vector
    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const approachX = dx / distance;
    const approachY = dy / distance;

    const relVelX = player.velocity.x - (target.velocity?.x || 0);
    const relVelY = player.velocity.y - (target.velocity?.y || 0);

    return -(relVelX * approachX + relVelY * approachY); // Negative = approaching
  }
}
```

**What it looks like**:
```
┌─ DOCKING CAM ──────┐
│                    │
│      150m          │
│        ■           │
│                    │
│    MISALIGNED      │
│     2.3m/s         │
└────────────────────┘
```

---

### 4.4 Panel Background Effects

**CRT/Terminal aesthetics** for all panels:

```typescript
class PanelBackgroundRenderer {
  private scanlineOpacity: number = 0.1;
  private glowRadius: number = 10;

  renderPanelBackground(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, palette: ColorPalette): void {
    // Dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, width, height);

    // Panel border with glow
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    ctx.shadowBlur = this.glowRadius;
    ctx.shadowColor = palette.primary;
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;

    // Optional: Scanlines
    if (this.scanlineOpacity > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.scanlineOpacity})`;
      for (let i = y; i < y + height; i += 2) {
        ctx.fillRect(x, i, width, 1);
      }
    }
  }

  renderCRTGlow(ctx: CanvasRenderingContext2D, palette: ColorPalette): void {
    // Subtle screen glow effect over entire canvas
    const gradient = ctx.createRadialGradient(
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
      0,
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
      Math.max(ctx.canvas.width, ctx.canvas.height) / 2
    );

    gradient.addColorStop(0, `rgba(${this.hexToRgb(palette.primary)}, 0.05)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 255, 0';
  }
}
```

---

## Part 5: Game Loop Integration

### 5.1 What Actually Renders

**You are looking at CONTROL PANELS**, not space:

```
┌────────────────────────────────────────────────────────────┐
│ [HELM]  [ENGINEERING]  [NAVIGATION]  [LIFE SUPPORT]       │ ← Station selector
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─ NAVIGATION ─────────────┐  ┌─ TACTICAL ──────────┐   │
│  │                           │  │      N              │   │
│  │ SENSORS                   │  │      ↑              │   │
│  │  RADAR:  ACTIVE           │  │   50km              │   │
│  │  RANGE:  [||||] 50km      │  │                     │   │
│  │  LIDAR:  PASSIVE          │  │  W  ●──■──●  E      │   │
│  │                           │  │      │ YOU │        │   │
│  │ CONTACTS (8)              │  │      │  *  │        │   │
│  │  1   8.2km 045° TRADER    │  │      └─────┘        │   │
│  │  2  15.7km 310° MINER     │  │         S           │   │
│  │  3   2.1km 180° STATION   │  │                     │   │
│  │  4  45.3km 092° PATROL    │  │  ● = Player         │   │
│  │                           │  │  ■ = Station        │   │
│  │ TARGET: Contact #3        │  │  * = Ship           │   │
│  │  Δv: 8.5 m/s              │  └─────────────────────┘   │
│  │  Intercept: 145s          │                            │
│  └───────────────────────────┘                            │
│                                                            │
│  VEL: 15.2m/s @ 045°    FUEL: 450kg    POWER: 2.4kW      │ ← Status bar
└────────────────────────────────────────────────────────────┘
```

No starfields. No beautiful planet renders. Just **DATA**.

---

### 5.2 Update Loop (What Matters)

```typescript
class Game {
  private aiManager: AIManager;
  private trafficManager: SystemTrafficManager;
  private eventSpawner: DynamicEventSpawner;
  private currentStation: 'HELM' | 'ENGINEERING' | 'NAVIGATION' | 'LIFE_SUPPORT';

  update(deltaTime: number): void {
    // 1. Update universe (orbital mechanics)
    // Planets, asteroids move along orbits
    this.currentSystem.update(deltaTime);

    // 2. Update player ship physics & systems
    this.playerShip.update(deltaTime);

    // 3. Update NPC AI (LOD-based - THIS IS WHERE LOD MATTERS)
    // Ships far away: update 0.1 Hz (every 10 seconds)
    // Ships nearby: update 60 Hz (every frame)
    this.aiManager.update(deltaTime, this.npcShips, this.playerShip);

    // 4. Update station activity
    for (const station of this.currentSystem.stations) {
      station.dockingAI.update(deltaTime);
      station.economyAI.update(deltaTime);
    }

    // 5. Update ambient traffic
    // Ships docking/undocking, traders moving between stations
    this.trafficManager.update(deltaTime, this.playerShip);

    // 6. Check for dynamic events
    const event = this.eventSpawner.update(deltaTime, this.playerShip, this.currentSystem);
    if (event) {
      this.triggerEvent(event);
    }

    // 7. Update sensor data
    // What shows up on radar, contact list
    this.sensorSystem.scan(this.playerShip, this.currentSystem);
  }

  render(): void {
    const ctx = this.canvas.getContext('2d')!;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Optional: CRT glow effect
    this.panelBG.renderCRTGlow(ctx, this.settings.palette);

    // Render current station panel
    switch (this.currentStation) {
      case 'HELM':
        this.helmPanel.render(ctx, this.playerShip, this.settings.palette);
        break;
      case 'ENGINEERING':
        this.engineeringPanel.render(ctx, this.playerShip, this.settings.palette);
        break;
      case 'NAVIGATION':
        this.navigationPanel.render(ctx, this.playerShip, this.sensorSystem.contacts, this.settings.palette);
        break;
      case 'LIFE_SUPPORT':
        this.lifeSupportPanel.render(ctx, this.playerShip, this.settings.palette);
        break;
    }

    // Status bar at bottom (always visible)
    this.statusBar.render(ctx, this.playerShip, this.settings.palette);
  }
}
```

**Key Point**: The universe simulation runs in the background. You don't SEE it directly - you see its effects on instruments.

---

### 5.3 What "Background" Means

**NOT visual backgrounds (starfields, planets)**

**YES background simulation:**

1. **NPC ships moving** between stations
   - You see: Radar blips changing position
   - Background: AI navigating trade routes

2. **Station economy fluctuating**
   - You see: Commodity prices when docked
   - Background: Supply/demand simulation

3. **Orbital mechanics**
   - You see: Planet position on sensors
   - Background: Orbital physics calculations

4. **Traffic control**
   - You see: "Docking queue position 3"
   - Background: Other ships waiting in queue

5. **Events spawning**
   - You see: "Distress signal detected"
   - Background: Event system checking triggers

The universe is **alive** - you just perceive it through **instruments**, not visually.

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

This design integrates your existing universe systems (13k lines of star systems, stations, NPC AI, factions, economy) with the Vector Moon Lander gameplay model (submarine simulator - you see INSTRUMENTS, not space).

**Key Integration Points**:
1. **NPCShipAI** → Drives derelicts, distress signals, traders, patrols (you see them as radar blips)
2. **SpaceStation** → Docking, trading, services, ambient traffic (you see text readouts and numbers)
3. **StarSystem** → Provides celestial bodies, asteroid fields, hazards (you see sensor data)
4. **FactionSystem** → Reputation affects station access, prices (you see prices change)
5. **TrafficControl** → Manages docking queues, collision avoidance (you see "Queue position: 3")

**What "Background" Means**:
- **NOT**: Parallax starfields, beautiful planet renders, cinematic visuals
- **YES**: Simulated universe running in background that you perceive through instruments
  - Ships moving on trade routes → Radar blips
  - Economy simulation → Price readouts
  - Orbital mechanics → Sensor data
  - Traffic control → Text messages
  - Event triggers → Alert notifications

**What You Actually See**:
- Tactical radar (simple 2D top-down with dots/symbols)
- Contact list (text: distance, bearing, velocity, type)
- Docking camera (optional wireframe view)
- Panel backgrounds (CRT glow, scanlines, terminal aesthetic)
- Gauges, readouts, numbers, text

**Performance - LOD for AI Simulation** (NOT rendering):
- Near ships (< 10km): 60 Hz updates (full AI)
- Medium ships (< 50km): 10 Hz updates (simplified AI)
- Far ships (< 200km): 1 Hz updates (basic pathfollowing)
- Very far ships: 0.1 Hz updates (position extrapolation)
- Result: 60 FPS with 100+ ships

**Next Steps**:
1. Implement tactical radar display (dots and lines on Nav panel)
2. Implement contact list renderer (text readouts)
3. Hook NPCShipAI behaviors into event system (derelicts drift, traders dock, patrol ships scan)
4. Create station docking UI (text interface on Comms panel)
5. Implement dynamic event spawning (distress signals appear in contact list)
6. Add panel background effects (CRT glow, scanlines)

The universe simulates in background. You interact through control panels. This is Das Boot in space.
