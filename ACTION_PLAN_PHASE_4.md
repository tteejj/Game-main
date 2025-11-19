# Complete Action Plan - Phase 4: Polish & Testing
## Visual Implementation & Quality Assurance

**Goal:** Add visual rendering and comprehensive test coverage
**Time Estimate:** 2-3 days (16-24 hours)
**Why Fourth:** Core systems complete. Now make it beautiful and bulletproof.
**Dependencies:** Phases 1-3 complete (all systems functional, UI polished)

---

## 1. Implement Visual Rendering (8-12 hours)

**File:** `game/src/game.ts:608-617`
**Issue:** Render method only clears canvas and shows stats

### Step 1: Create Rendering System (3 hours)

**New File:** `game/src/rendering/renderer.ts`

```typescript
import { Vector3 } from './types';
import { ColorPalette } from '../ui/ui-utils';

export class SpaceRenderer {
    private ctx: CanvasRenderingContext2D;
    private palette: ColorPalette;
    private camera: Camera;

    constructor(ctx: CanvasRenderingContext2D, palette: ColorPalette) {
        this.ctx = ctx;
        this.palette = palette;
        this.camera = new Camera();
    }

    /**
     * Render complete space scene
     */
    render(gameState: any): void {
        // 1. Clear and set background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // 2. Draw star field (static background)
        this.renderStarField();

        // 3. Update camera to follow spacecraft
        this.camera.update(gameState.spacecraft.position);

        // 4. Render celestial bodies (planets, moons)
        this.renderCelestialBodies(gameState.starSystem.bodies);

        // 5. Render space stations
        this.renderStations(gameState.starSystem.stations);

        // 6. Render NPC ships
        this.renderNPCShips(gameState.npcShips);

        // 7. Render player spacecraft
        this.renderSpacecraft(gameState.spacecraft);

        // 8. Render trajectories and UI overlays
        if (gameState.showTrajectory) {
            this.renderTrajectory(gameState.spacecraft);
        }

        // 9. Render hazard zones
        this.renderHazards(gameState.starSystem.hazards);

        // 10. Render targeting reticles
        if (gameState.targetedContact) {
            this.renderTargetingReticle(gameState.targetedContact);
        }
    }

    /**
     * Render static star field background
     */
    private renderStarField(): void {
        // Use deterministic random for consistent star positions
        const seed = 12345;
        let rng = seed;
        const next = () => {
            rng = (rng * 9301 + 49297) % 233280;
            return rng / 233280;
        };

        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 200; i++) {
            const x = next() * this.ctx.canvas.width;
            const y = next() * this.ctx.canvas.height;
            const brightness = next();

            this.ctx.globalAlpha = brightness * 0.5 + 0.5;
            this.ctx.fillRect(x, y, 1, 1);
        }
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render player spacecraft
     */
    private renderSpacecraft(spacecraft: any): void {
        const screenPos = this.camera.worldToScreen(spacecraft.position);

        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(spacecraft.rotation);

        // Draw ship as triangle
        this.ctx.beginPath();
        this.ctx.moveTo(15, 0);       // Nose
        this.ctx.lineTo(-10, -8);     // Left wing
        this.ctx.lineTo(-5, 0);       // Center back
        this.ctx.lineTo(-10, 8);      // Right wing
        this.ctx.closePath();

        this.ctx.fillStyle = this.palette.primary;
        this.ctx.fill();
        this.ctx.strokeStyle = this.palette.accent;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw engine thrust indicator
        if (spacecraft.engineFiring) {
            this.ctx.beginPath();
            this.ctx.moveTo(-5, 0);
            this.ctx.lineTo(-15, -3);
            this.ctx.lineTo(-15, 3);
            this.ctx.closePath();
            this.ctx.fillStyle = this.palette.warning;
            this.ctx.fill();
        }

        this.ctx.restore();

        // Draw ship label
        this.ctx.fillStyle = this.palette.primary;
        this.ctx.font = '10px "Courier New"';
        this.ctx.fillText('PLAYER', screenPos.x + 20, screenPos.y);
    }

    /**
     * Render celestial bodies
     */
    private renderCelestialBodies(bodies: any[]): void {
        bodies.forEach(body => {
            const screenPos = this.camera.worldToScreen(body.position);

            // Scale radius for visibility
            const screenRadius = Math.max(10, body.radius / 10000);

            // Draw body
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);

            // Color based on type
            const colors: Record<string, string> = {
                'star': '#ffff00',
                'planet': this.palette.primary,
                'moon': this.palette.secondary,
                'asteroid': '#888888'
            };
            this.ctx.fillStyle = colors[body.type] || this.palette.primary;
            this.ctx.fill();

            this.ctx.strokeStyle = this.palette.accent;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Draw atmosphere if present
            if (body.atmosphere && body.atmosphere.density > 0) {
                this.ctx.beginPath();
                this.ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.2, 0, Math.PI * 2);
                this.ctx.strokeStyle = this.palette.primary;
                this.ctx.globalAlpha = 0.3;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }

            // Draw label
            this.ctx.fillStyle = this.palette.secondary;
            this.ctx.font = '10px "Courier New"';
            this.ctx.fillText(body.name, screenPos.x + screenRadius + 5, screenPos.y);
        });
    }

    /**
     * Render space stations
     */
    private renderStations(stations: any[]): void {
        stations.forEach(station => {
            const screenPos = this.camera.worldToScreen(station.position);

            // Draw station as octagon
            this.ctx.beginPath();
            const sides = 8;
            const radius = 8;
            for (let i = 0; i <= sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = screenPos.x + Math.cos(angle) * radius;
                const y = screenPos.y + Math.sin(angle) * radius;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }

            this.ctx.strokeStyle = this.palette.accent;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw station label
            this.ctx.fillStyle = this.palette.accent;
            this.ctx.font = '10px "Courier New"';
            this.ctx.fillText(station.name, screenPos.x + 10, screenPos.y);
        });
    }

    /**
     * Render NPC ships
     */
    private renderNPCShips(ships: any[]): void {
        ships.forEach(ship => {
            const screenPos = this.camera.worldToScreen(ship.position);

            // Draw ship as small triangle
            this.ctx.save();
            this.ctx.translate(screenPos.x, screenPos.y);
            this.ctx.rotate(ship.heading || 0);

            this.ctx.beginPath();
            this.ctx.moveTo(6, 0);
            this.ctx.lineTo(-4, -3);
            this.ctx.lineTo(-4, 3);
            this.ctx.closePath();

            // Color by faction/threat
            const color = ship.hostile ? this.palette.critical : this.palette.secondary;
            this.ctx.fillStyle = color;
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    /**
     * Render trajectory prediction
     */
    private renderTrajectory(spacecraft: any): void {
        if (!spacecraft.trajectory || spacecraft.trajectory.length === 0) return;

        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = this.palette.warning;
        this.ctx.lineWidth = 1;

        spacecraft.trajectory.forEach((point: any, index: number) => {
            const screenPos = this.camera.worldToScreen(point);
            if (index === 0) {
                this.ctx.moveTo(screenPos.x, screenPos.y);
            } else {
                this.ctx.lineTo(screenPos.x, screenPos.y);
            }
        });

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Render hazard zones
     */
    private renderHazards(hazards: any[]): void {
        hazards.forEach(hazard => {
            const screenPos = this.camera.worldToScreen(hazard.position);
            const screenRadius = Math.max(20, hazard.radius / 1000);

            // Draw hazard zone as pulsing circle
            const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;

            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.palette.critical;
            this.ctx.globalAlpha = pulse * 0.5;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;

            // Draw hazard label
            this.ctx.fillStyle = this.palette.critical;
            this.ctx.font = '10px "Courier New"';
            this.ctx.fillText(`⚠️ ${hazard.type}`, screenPos.x + screenRadius + 5, screenPos.y);
        });
    }

    /**
     * Render targeting reticle
     */
    private renderTargetingReticle(target: any): void {
        const screenPos = this.camera.worldToScreen(target.position);

        // Draw targeting brackets
        const size = 20;
        const gap = 5;

        this.ctx.strokeStyle = this.palette.accent;
        this.ctx.lineWidth = 2;

        // Top-left bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - size, screenPos.y - size + gap);
        this.ctx.lineTo(screenPos.x - size, screenPos.y - size);
        this.ctx.lineTo(screenPos.x - size + gap, screenPos.y - size);
        this.ctx.stroke();

        // Top-right bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x + size, screenPos.y - size + gap);
        this.ctx.lineTo(screenPos.x + size, screenPos.y - size);
        this.ctx.lineTo(screenPos.x + size - gap, screenPos.y - size);
        this.ctx.stroke();

        // Bottom-left bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - size, screenPos.y + size - gap);
        this.ctx.lineTo(screenPos.x - size, screenPos.y + size);
        this.ctx.lineTo(screenPos.x - size + gap, screenPos.y + size);
        this.ctx.stroke();

        // Bottom-right bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x + size, screenPos.y + size - gap);
        this.ctx.lineTo(screenPos.x + size, screenPos.y + size);
        this.ctx.lineTo(screenPos.x + size - gap, screenPos.y + size);
        this.ctx.stroke();

        // Draw target info
        this.ctx.fillStyle = this.palette.accent;
        this.ctx.font = '10px "Courier New"';
        ctx.fillText(target.name || 'TARGET', screenPos.x + 25, screenPos.y - 5);
        ctx.fillText(`${target.distance.toFixed(0)} km`, screenPos.x + 25, screenPos.y + 5);
    }
}

/**
 * Camera for world-to-screen coordinate conversion
 */
class Camera {
    private position: Vector3 = { x: 0, y: 0, z: 0 };
    private zoom: number = 1.0;

    update(targetPosition: Vector3): void {
        // Smoothly follow target
        this.position.x += (targetPosition.x - this.position.x) * 0.1;
        this.position.y += (targetPosition.y - this.position.y) * 0.1;
        this.position.z += (targetPosition.z - this.position.z) * 0.1;
    }

    worldToScreen(worldPos: Vector3): { x: number; y: number } {
        // Convert 3D world coordinates to 2D screen coordinates
        const screenX = 640 + (worldPos.x - this.position.x) * this.zoom / 1000;
        const screenY = 360 + (worldPos.y - this.position.y) * this.zoom / 1000;

        return { x: screenX, y: screenY };
    }

    setZoom(zoom: number): void {
        this.zoom = Math.max(0.1, Math.min(10, zoom));
    }
}
```

### Step 2: Integrate Renderer into Game (1 hour)

**File:** `game/src/game.ts`

```typescript
import { SpaceRenderer } from './rendering/renderer';

// In Game class constructor:
this.renderer = new SpaceRenderer(this.ctx, this.palette);

// Update render method:
private render(): void {
    // Render space scene
    this.renderer.render({
        spacecraft: this.spacecraft.getState(),
        starSystem: {
            bodies: this.gameWorld.celestialBodies,
            stations: this.starSystem.stations,
            hazards: this.gameWorld.hazards
        },
        npcShips: this.trafficManager.getAllVessels(),
        targetedContact: this.targetedContact,
        showTrajectory: this.showTrajectory
    });

    // UI panels will be rendered on top by UIManager
    this.renderStats(); // Keep stats overlay
}
```

### Step 3: Add Rendering Options (1 hour)

Add keyboard controls:
```typescript
// In input.ts
case 'h':
    // Toggle HUD visibility
    this.hudVisible = !this.hudVisible;
    break;

case '[':
    // Zoom out
    this.renderer.camera.setZoom(this.renderer.camera.zoom * 0.8);
    break;

case ']':
    // Zoom in
    this.renderer.camera.setZoom(this.renderer.camera.zoom * 1.25);
    break;

case 't':
    // Toggle trajectory display
    this.showTrajectory = !this.showTrajectory;
    break;
```

### Step 4: Add Visual Effects (3-4 hours)

**New File:** `game/src/rendering/effects.ts`

```typescript
/**
 * Visual effects for space combat and events
 */

export class VisualEffects {
    private ctx: CanvasRenderingContext2D;
    private activeEffects: Effect[] = [];

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    /**
     * Add explosion effect
     */
    addExplosion(position: { x: number; y: number }, size: number = 20): void {
        this.activeEffects.push({
            type: 'explosion',
            position,
            size,
            startTime: Date.now(),
            duration: 1000 // 1 second
        });
    }

    /**
     * Add weapon fire effect
     */
    addWeaponFire(from: { x: number; y: number }, to: { x: number; y: number }): void {
        this.activeEffects.push({
            type: 'laser',
            from,
            to,
            startTime: Date.now(),
            duration: 100 // 0.1 second
        });
    }

    /**
     * Update and render all active effects
     */
    update(currentTime: number): void {
        // Remove expired effects
        this.activeEffects = this.activeEffects.filter(effect => {
            return currentTime - effect.startTime < effect.duration;
        });

        // Render each effect
        this.activeEffects.forEach(effect => {
            const progress = (currentTime - effect.startTime) / effect.duration;

            switch (effect.type) {
                case 'explosion':
                    this.renderExplosion(effect, progress);
                    break;
                case 'laser':
                    this.renderLaser(effect, progress);
                    break;
            }
        });
    }

    private renderExplosion(effect: any, progress: number): void {
        const radius = effect.size * (1 + progress * 2);
        const alpha = 1 - progress;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;

        // Draw expanding ring
        this.ctx.beginPath();
        this.ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw inner flash
        this.ctx.beginPath();
        this.ctx.arc(effect.position.x, effect.position.y, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fill();

        this.ctx.restore();
    }

    private renderLaser(effect: any, progress: number): void {
        this.ctx.save();
        this.ctx.globalAlpha = 1 - progress;

        this.ctx.beginPath();
        this.ctx.moveTo(effect.from.x, effect.from.y);
        this.ctx.lineTo(effect.to.x, effect.to.y);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }
}

interface Effect {
    type: string;
    startTime: number;
    duration: number;
    [key: string]: any;
}
```

---

## 2. Add Universe System Tests (4-6 hours)

**Issue:** Only 3 test files for 101 TypeScript files

### Step 1: Test StarSystem (2 hours)

**New File:** `universe-system/tests/StarSystem.test.ts`

```typescript
import { StarSystem } from '../src/StarSystem';

describe('StarSystem', () => {
    let system: StarSystem;

    beforeEach(() => {
        system = new StarSystem({
            name: 'Test System',
            seed: 12345,
            numPlanets: 5,
            civilizationLevel: 3
        });
    });

    test('generates star with correct properties', () => {
        expect(system.star).toBeDefined();
        expect(system.star.name).toContain('Test System');
        expect(system.star.mass).toBeGreaterThan(0);
    });

    test('generates planets with orbital mechanics', () => {
        expect(system.planets.length).toBeGreaterThan(0);
        expect(system.planets.length).toBeLessThanOrEqual(5);

        system.planets.forEach(planet => {
            expect(planet.orbitalRadius).toBeGreaterThan(0);
            expect(planet.mass).toBeGreaterThan(0);
        });
    });

    test('generates stations based on civilization level', () => {
        expect(system.stations.length).toBeGreaterThan(0);
        // Civ level 3 should have 2-4 stations
        expect(system.stations.length).toBeGreaterThanOrEqual(2);
        expect(system.stations.length).toBeLessThanOrEqual(4);
    });

    test('economy has commodity prices', () => {
        const station = system.stations[0];
        expect(station.economy).toBeDefined();
        expect(station.economy.prices.size).toBeGreaterThan(0);
    });

    test('NPC ships spawn with valid state', () => {
        system.update(1); // Update to trigger spawns

        const ships = system.getNPCShips();
        if (ships.length > 0) {
            const ship = ships[0];
            expect(ship.position).toBeDefined();
            expect(ship.velocity).toBeDefined();
            expect(ship.faction).toBeDefined();
        }
    });

    test('communications network has relays', () => {
        expect(system.satellites.length).toBeGreaterThan(0);
        const commSats = system.satellites.filter(s => s.type === 'communications');
        expect(commSats.length).toBeGreaterThan(0);
    });
});
```

### Step 2: Test Economy System (1.5 hours)

**New File:** `universe-system/tests/EconomySystem.test.ts`

```typescript
import { EconomySystem } from '../src/EconomySystem';

describe('EconomySystem', () => {
    test('price changes with supply and demand', () => {
        const economy = new EconomySystem();

        const initialPrice = economy.calculatePrice('ore', 100, 100);
        const highDemandPrice = economy.calculatePrice('ore', 100, 200);
        const lowDemandPrice = economy.calculatePrice('ore', 100, 50);

        expect(highDemandPrice).toBeGreaterThan(initialPrice);
        expect(lowDemandPrice).toBeLessThan(initialPrice);
    });

    test('supply decreases with consumption', () => {
        const economy = new EconomySystem();
        const station = createTestStation();

        const initialSupply = station.inventory.get('food');
        economy.updateSupply(station, 'food', 10); // 10 seconds
        const newSupply = station.inventory.get('food');

        expect(newSupply).toBeLessThan(initialSupply);
    });

    test('cargo delivery increases supply', () => {
        const economy = new EconomySystem();
        const station = createTestStation();

        const initialSupply = station.inventory.get('ore') || 0;
        station.inventory.set('ore', initialSupply + 100); // Delivery
        economy.updateSupply(station, 'ore', 0);

        expect(station.inventory.get('ore')).toBe(initialSupply + 100);
    });
});
```

### Step 3: Test NPC AI (1.5 hours)

**New File:** `universe-system/tests/NPCShipAI.test.ts`

```typescript
import { NPCShipAI } from '../src/NPCShipAI';

describe('NPCShipAI', () => {
    test('transitions between states correctly', () => {
        const ai = createTestAI();

        ai.setState('traveling');
        expect(ai.currentState).toBe('traveling');

        ai.setState('docking');
        expect(ai.currentState).toBe('docking');
    });

    test('records memory of trades', () => {
        const ai = createTestAI();

        ai.recordTradeExperience('ore', 1000, 'success');
        const memory = ai.memory.getRecentExperiences();

        expect(memory.length).toBeGreaterThan(0);
        expect(memory[0].type).toBe('trade');
    });

    test('learns from successful trades', () => {
        const ai = createTestAI();

        // Record multiple successful trades
        for (let i = 0; i < 5; i++) {
            ai.recordTradeExperience('ore', 1000, 'success');
        }

        const learned = ai.getLearnedPreference('trading');
        expect(learned).toBeDefined();
    });

    test('trauma affects future decisions', () => {
        const ai = createTestAI();

        ai.recordTrauma({
            type: 'combat',
            severity: 0.8,
            trigger: 'hostile_faction'
        });

        const willAvoid = ai.checkTraumaTrigger('hostile_faction');
        expect(willAvoid).toBe(true);
    });
});
```

### Step 4: Test POI System (1 hour)

**New File:** `universe-system/tests/POISystem.test.ts`

```typescript
import { POIGenerator } from '../src/poi/POIGenerator';

describe('POI System', () => {
    test('generates POIs with valid properties', () => {
        const generator = new POIGenerator();
        const system = createTestSystem();

        const pois = generator.generatePOIs(system, 10);

        expect(pois.length).toBe(10);
        pois.forEach(poi => {
            expect(poi.position).toBeDefined();
            expect(poi.type).toBeDefined();
            expect(poi.reward).toBeDefined();
        });
    });

    test('scan mechanics detect POIs at range', () => {
        const poi = createTestPOI();
        const scanner = createTestScanner();

        const result = scanner.performScan(poi, 100, 10); // 100 power, 10 sec

        expect(result.detected).toBeDefined();
        if (result.detected) {
            expect(result.distance).toBeGreaterThan(0);
        }
    });

    test('derelicts have tumbling physics', () => {
        const derelict = createTestDerelict();

        const initialAttitude = { ...derelict.attitude };
        derelict.update(1); // 1 second
        const newAttitude = derelict.attitude;

        expect(newAttitude.pitch).not.toBe(initialAttitude.pitch);
    });
});
```

---

## 3. Add Game/UI Tests (2-3 hours)

**Issue:** Game and UI layers have 0 tests

### Create Test Files:

**`game/tests/game.test.ts`**
**`game/tests/spacecraft-adapter.test.ts`**
**`game/tests/ui/helm-panel.test.ts`**

Focus on integration tests and critical paths.

---

## 4. Performance Profiling (2-3 hours)

### Step 1: Add Performance Monitoring

**New File:** `game/src/utils/performance-monitor.ts`

```typescript
export class PerformanceMonitor {
    private frameTimes: number[] = [];
    private updateTimes: Map<string, number[]> = new Map();

    startFrame(): number {
        return performance.now();
    }

    endFrame(startTime: number): void {
        const frameTime = performance.now() - startTime;
        this.frameTimes.push(frameTime);

        // Keep only last 60 frames
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
    }

    startUpdate(label: string): number {
        return performance.now();
    }

    endUpdate(label: string, startTime: number): void {
        const updateTime = performance.now() - startTime;

        if (!this.updateTimes.has(label)) {
            this.updateTimes.set(label, []);
        }

        const times = this.updateTimes.get(label)!;
        times.push(updateTime);

        if (times.length > 60) {
            times.shift();
        }
    }

    getStats(): {
        fps: number;
        avgFrameTime: number;
        updates: Record<string, { avg: number; max: number }>;
    } {
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        const fps = 1000 / avgFrameTime;

        const updates: Record<string, { avg: number; max: number }> = {};
        this.updateTimes.forEach((times, label) => {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const max = Math.max(...times);
            updates[label] = { avg, max };
        });

        return { fps, avgFrameTime, updates };
    }

    renderStats(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const stats = this.getStats();

        ctx.fillStyle = '#00ff00';
        ctx.font = '12px "Courier New"';

        ctx.fillText(`FPS: ${stats.fps.toFixed(1)}`, x, y);
        y += 15;
        ctx.fillText(`Frame: ${stats.avgFrameTime.toFixed(2)}ms`, x, y);
        y += 20;

        Object.entries(stats.updates).forEach(([label, times]) => {
            ctx.fillText(`${label}: ${times.avg.toFixed(2)}ms (max ${times.max.toFixed(2)}ms)`, x, y);
            y += 15;
        });
    }
}
```

### Step 2: Integrate into Game Loop

```typescript
// In game.ts
private perfMonitor = new PerformanceMonitor();

private update(deltaTime: number): void {
    const frameStart = this.perfMonitor.startFrame();

    let start = this.perfMonitor.startUpdate('spacecraft');
    this.spacecraft.update(deltaTime);
    this.perfMonitor.endUpdate('spacecraft', start);

    start = this.perfMonitor.startUpdate('traffic');
    this.trafficManager.update(deltaTime);
    this.perfMonitor.endUpdate('traffic', start);

    // ... other updates

    this.perfMonitor.endFrame(frameStart);
}

// Render perf stats (F3 toggle)
if (this.showPerfStats) {
    this.perfMonitor.renderStats(this.ctx, 10, 100);
}
```

---

## Phase 4 Summary

### What Gets Added:
1. ✅ Complete visual rendering (spacecraft, planets, stations, NPCs, effects)
2. ✅ Universe system test coverage (StarSystem, Economy, NPC AI, POI)
3. ✅ Game/UI test coverage (integration tests)
4. ✅ Performance monitoring and profiling

### Quality Improvements:
- Game is now visually complete (not just text stats)
- Test coverage increases from 20% to 50-60%
- Performance bottlenecks identified
- Production-ready quality

### Time Investment:
- Minimum: 16 hours (2 days)
- Maximum: 24 hours (3 days with thorough testing)

### Success Criteria:
- [ ] Spacecraft renders as vector triangle
- [ ] Planets and stations visible
- [ ] NPC ships render correctly
- [ ] Trajectory lines display
- [ ] Hazard zones pulse
- [ ] Targeting reticles work
- [ ] 30+ new tests passing
- [ ] Performance stays above 50 FPS with 50 NPCs
- [ ] No memory leaks detected

---

## Next Phase Preview

**Phase 5: Documentation & Deployment** will address:
- Update all documentation
- Deployment readiness checklist
- Build verification
- Browser compatibility
- Release preparation

**Why Phase 5 is separate:** Game is now complete and tested. Final phase is about shipping it.

---

**Ready for Phase 5?** Game is beautiful and bulletproof. Final phase: ship it!
