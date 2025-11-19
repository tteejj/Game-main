# Complete Action Plan - Phase 3: UI & Integration
## Player-Facing Polish (Make Everything Work Perfectly)

**Goal:** Complete all UI panels and fix player-facing issues
**Time Estimate:** 1 day (6-8 hours)
**Why Third:** Backend systems now complete (Phase 2). Focus on making player experience perfect.
**Dependencies:** Phase 1 & 2 complete (hull tracking working, repair system wired)

---

## 1. Complete Life Support Panel (3 hours)

**File:** `game/src/ui/panels/lifesupport-panel.ts`
**Issue:** Most simplified panel (60% vs design) - needs individual door controls, O2 rate, sequences

### Step 1: Add Individual Door Controls (1.5 hours)

**Problem:** Currently D key toggles only first adjacent door. Design specifies Q/W/E/R/T for each.

#### Update SpacecraftAdapter (45 min)
**File:** `game/src/spacecraft-adapter.ts`

Add more granular door control:
```typescript
/**
 * Get door configuration for compartment
 */
getCompartmentDoors(compartmentId: number): Array<{
    id: string;
    direction: 'forward' | 'aft' | 'port' | 'starboard' | 'up' | 'down';
    targetCompartment: number;
    isOpen: boolean;
    isLocked: boolean;
}> {
    // Define ship layout (6 compartments)
    const doorMap: Record<number, any[]> = {
        1: [ // Bow
            { direction: 'aft', target: 2 },
            { direction: 'starboard', target: 4 }
        ],
        2: [ // Bridge
            { direction: 'forward', target: 1 },
            { direction: 'aft', target: 3 },
            { direction: 'port', target: 5 },
            { direction: 'starboard', target: 4 }
        ],
        3: [ // Engineering
            { direction: 'forward', target: 2 },
            { direction: 'aft', target: 6 }
        ],
        4: [ // Starboard
            { direction: 'forward', target: 1 },
            { direction: 'port', target: 2 },
            { direction: 'aft', target: 6 }
        ],
        5: [ // Port (Center)
            { direction: 'starboard', target: 2 }
        ],
        6: [ // Stern
            { direction: 'forward', target: 3 },
            { direction: 'port', target: 4 }
        ]
    };

    const doors = doorMap[compartmentId] || [];
    return doors.map(door => ({
        id: `door_${compartmentId}_${door.target}`,
        direction: door.direction,
        targetCompartment: door.target,
        isOpen: this.getDoorStatus(compartmentId, door.target),
        isLocked: false // TODO: Implement door locking
    }));
}

/**
 * Toggle specific door by direction
 */
toggleDoorByDirection(compartmentId: number, direction: string): boolean {
    const doors = this.getCompartmentDoors(compartmentId);
    const door = doors.find(d => d.direction === direction);

    if (!door) {
        console.log(`No door ${direction} from compartment ${compartmentId}`);
        return false;
    }

    // Toggle the door
    this.toggleBulkheadDoor(compartmentId, door.targetCompartment);
    return true;
}
```

#### Update Life Support Panel Input (45 min)
**File:** `game/src/ui/panels/lifesupport-panel.ts`

Replace simple D key with Q/W/E/R/T:
```typescript
handleInput(key: string): void {
    const keyLower = key.toLowerCase();

    switch (keyLower) {
        // Compartment selection (1-6)
        case '1': case '2': case '3':
        case '4': case '5': case '6':
            this.selectedCompartment = parseInt(key);
            break;

        // Individual door controls by direction
        case 'q':
            // Forward door
            this.spacecraft.toggleDoorByDirection(this.selectedCompartment, 'forward');
            break;

        case 'w':
            // Aft door
            this.spacecraft.toggleDoorByDirection(this.selectedCompartment, 'aft');
            break;

        case 'e':
            // Port door
            this.spacecraft.toggleDoorByDirection(this.selectedCompartment, 'port');
            break;

        case 'r':
            // Starboard door
            this.spacecraft.toggleDoorByDirection(this.selectedCompartment, 'starboard');
            break;

        case 't':
            // Up door (if multi-deck)
            this.spacecraft.toggleDoorByDirection(this.selectedCompartment, 'up');
            break;

        // Fire suppression sequence
        case 'a':
            // Arm fire suppression
            this.fireSuppressionArmed = true;
            console.log('Fire suppression ARMED - press S to activate');
            break;

        case 's':
            // Fire suppression (only if armed)
            if (this.fireSuppressionArmed) {
                this.spacecraft.suppressFire(this.selectedCompartment);
                this.fireSuppressionArmed = false;
                console.log('Fire suppression ACTIVATED');
            } else {
                console.log('Fire suppression not armed - press A first');
            }
            break;

        // Vent sequence with safety
        case 'z':
            // Override safety interlock
            this.ventSafetyOverride = true;
            console.log('⚠️  VENT SAFETY OVERRIDE - press X to vent');
            break;

        case 'x':
            // Vent to space (only if override active)
            if (this.ventSafetyOverride) {
                this.spacecraft.ventCompartment(this.selectedCompartment);
                this.ventSafetyOverride = false;
                console.log('💨 VENTING TO SPACE');
            } else {
                console.log('Safety interlock active - press Z to override');
            }
            break;

        // Breach seal
        case 'b':
            this.spacecraft.sealBreach(this.selectedCompartment);
            break;

        // O2 generation rate
        case 'shift+q':
            this.adjustO2Rate(+5);
            break;

        case 'shift+a':
            this.adjustO2Rate(-5);
            break;

        // Pressure equalization
        case 'c':
            this.togglePressureEqualization();
            break;

        case 'v':
            this.openEqualizationValve();
            break;

        // Global systems
        case 'o':
            this.spacecraft.toggleO2Generator();
            break;

        case 'shift+s':
            this.spacecraft.toggleCO2Scrubber();
            break;
    }
}

// Add member variables at top of class
private fireSuppressionArmed: boolean = false;
private ventSafetyOverride: boolean = false;
private o2GenerationRate: number = 100; // Percentage
private autoEqualization: boolean = true;

// Add new methods
private adjustO2Rate(delta: number): void {
    this.o2GenerationRate = Math.max(0, Math.min(200, this.o2GenerationRate + delta));
    // Apply to spacecraft
    this.spacecraft.setO2GenerationRate(this.o2GenerationRate);
    console.log(`O2 generation: ${this.o2GenerationRate}%`);
}

private togglePressureEqualization(): void {
    this.autoEqualization = !this.autoEqualization;
    this.spacecraft.setAutoEqualization(this.autoEqualization);
    console.log(`Auto equalization: ${this.autoEqualization ? 'ON' : 'OFF'}`);
}

private openEqualizationValve(): void {
    if (!this.autoEqualization) {
        this.spacecraft.equalizeCompartmentPressure(this.selectedCompartment);
        console.log('Manual equalization valve opened');
    } else {
        console.log('Set to manual mode (C) first');
    }
}
```

#### Update SpacecraftAdapter for New Life Support Features (30 min)
```typescript
setO2GenerationRate(rate: number): void {
    const lifeSupport = this.spacecraft.lifeSupport;
    if (lifeSupport && lifeSupport.o2Generator) {
        lifeSupport.o2Generator.rate = rate / 100; // Convert percentage to 0-1
    }
}

setAutoEqualization(enabled: boolean): void {
    const lifeSupport = this.spacecraft.lifeSupport;
    if (lifeSupport) {
        lifeSupport.autoEqualization = enabled;
    }
}

equalizeCompartmentPressure(compartmentId: number): void {
    const lifeSupport = this.spacecraft.lifeSupport;
    if (lifeSupport && lifeSupport.compartments) {
        const compartment = lifeSupport.compartments[compartmentId];
        const avgPressure = this.calculateAveragePressure();
        compartment.pressure = avgPressure;
        console.log(`Compartment ${compartmentId} equalized to ${avgPressure.toFixed(1)} kPa`);
    }
}

private calculateAveragePressure(): number {
    const lifeSupport = this.spacecraft.lifeSupport;
    if (!lifeSupport || !lifeSupport.compartments) return 101.3;

    const pressures = lifeSupport.compartments.map(c => c.pressure);
    return pressures.reduce((a, b) => a + b, 0) / pressures.length;
}
```

#### Update Rendering (30 min)

Add visual indicators:
```typescript
// Show armed states
if (this.fireSuppressionArmed) {
    ctx.fillStyle = '#ff0000';
    ctx.fillText('⚠️  FIRE SUPPRESSION ARMED', x + 10, y);
    y += 20;
}

if (this.ventSafetyOverride) {
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 12px "Courier New"';
    ctx.fillText('⚠️  VENT SAFETY OVERRIDE ACTIVE', x + 10, y);
    ctx.font = '12px "Courier New"';
    y += 20;
}

// Show O2 generation rate
ctx.fillStyle = this.palette.primary;
ctx.fillText(`O2 Rate: ${this.o2GenerationRate}%`, x + 10, y);
y += 15;

// Show equalization mode
ctx.fillText(`Pressure EQ: ${this.autoEqualization ? 'AUTO' : 'MANUAL'}`, x + 10, y);
```

---

## 2. Complete Helm Panel (30 min)

**File:** `game/src/ui/panels/helm-panel.ts`
**Issue:** Only 10 RCS thrusters vs. 12 in design

### Add Missing RCS Thrusters

Update input handling:
```typescript
// RCS Thrusters (1-9, 0, -, =)
case '1': case '2': case '3': case '4':
case '5': case '6': case '7': case '8':
case '9': case '0': case '-': case '=':
    let num: number;
    if (key === '0') num = 9;
    else if (key === '-') num = 10;
    else if (key === '=') num = 11;
    else num = parseInt(key) - 1;

    this.rcsActive[num] = !this.rcsActive[num];
    this.spacecraft.fireRCS(num, this.rcsActive[num]);
    console.log(`RCS Thruster ${num + 1}: ${this.rcsActive[num] ? 'FIRING' : 'OFF'}`);
    break;
```

Update array size:
```typescript
private rcsActive: boolean[] = new Array(12).fill(false);  // Was 10, now 12
```

Update rendering to show all 12:
```typescript
// RCS layout (12 thrusters: 4 bow, 4 mid, 4 stern)
const rcsLayout = [
    { pos: 'Bow Fwd', index: 0 },
    { pos: 'Bow Aft', index: 1 },
    { pos: 'Bow Port', index: 2 },
    { pos: 'Bow Star', index: 3 },
    { pos: 'Mid Fwd', index: 4 },
    { pos: 'Mid Aft', index: 5 },
    { pos: 'Mid Port', index: 6 },
    { pos: 'Mid Star', index: 7 },
    { pos: 'Stern Fwd', index: 8 },
    { pos: 'Stern Aft', index: 9 },
    { pos: 'Stern Port', index: 10 },
    { pos: 'Stern Star', index: 11 }
];
```

Update keyboard hints:
```typescript
ctx.fillText('[1-9, 0, -, =] Fire RCS    [T/Y] Fuel Transfer', x, hintsY);
```

---

## 3. Replace HUD Placeholder Data (1 hour)

**File:** `universe-system/src/UniverseHUD.ts:456-460`
**Issue:** Returns hardcoded ['UEC', 'MCA'] factions

### Fix getFactionsInSystem

```typescript
getFactionsInSystem(systemId: string): string[] {
    // Query orchestrator for actual factions
    if (!this.orchestrator) {
        return []; // No orchestrator, no factions
    }

    const system = this.orchestrator.getStarSystem(systemId);
    if (!system) {
        return [];
    }

    // Get unique factions from stations in system
    const factions = new Set<string>();

    if (system.stations) {
        system.stations.forEach(station => {
            if (station.faction) {
                factions.add(station.faction);
            }
        });
    }

    // Get factions from NPC ships
    if (system.npcShips) {
        system.npcShips.forEach(ship => {
            if (ship.faction) {
                factions.add(ship.faction);
            }
        });
    }

    return Array.from(factions).sort();
}
```

### Fix NPCGoalSystem Distance Calculation

**File:** `universe-system/src/entity-ai/NPCGoalSystem.ts:1077`
**Issue:** Uses placeholder `h += 100`

Replace with actual distance:
```typescript
// Calculate actual distance heuristic
const dx = current.x - goal.targetPosition.x;
const dy = current.y - goal.targetPosition.y;
const dz = current.z - goal.targetPosition.z;
const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
h += distance / 1000; // Convert to km for scaling
```

---

## 4. Add SpacecraftAdapter Missing Methods (2 hours)

**File:** `game/src/spacecraft-adapter.ts`
**Issue:** Some panel features need adapter methods that don't exist yet

### Life Support Additions

```typescript
/**
 * Get filter life remaining
 */
getFilterLife(): { scrubber: number; o2Reserve: number } {
    const lifeSupport = this.spacecraft.lifeSupport;
    if (!lifeSupport) {
        return { scrubber: 100, o2Reserve: 100 };
    }

    return {
        scrubber: lifeSupport.scrubberFilterLife || 100, // Percentage
        o2Reserve: lifeSupport.o2ReserveLevel || 100     // Percentage
    };
}

/**
 * Replace scrubber filter
 */
replaceScrubberFilter(): boolean {
    const lifeSupport = this.spacecraft.lifeSupport;
    if (!lifeSupport) return false;

    // Check if spare filters available
    if (lifeSupport.spareFilters && lifeSupport.spareFilters > 0) {
        lifeSupport.scrubberFilterLife = 100;
        lifeSupport.spareFilters--;
        console.log(`Filter replaced. ${lifeSupport.spareFilters} spares remaining.`);
        return true;
    }

    console.log('No spare filters available');
    return false;
}
```

### Navigation Additions

```typescript
/**
 * Clear intercept solution
 */
clearInterceptSolution(): void {
    // Clear stored intercept data
    this.interceptSolution = null;
    console.log('Intercept solution cleared');
}

/**
 * Execute intercept burn automatically
 */
executeInterceptBurn(solution: any): void {
    // Point prograde to intercept
    this.setAutopilotMode('prograde');

    // Set throttle based on required acceleration
    const accel = solution.deltaV / solution.burnDuration;
    const throttle = Math.min(100, (accel / 10) * 100); // Assuming 10 m/s² max
    this.setThrottle(throttle);

    // Arm and fire engine
    this.setFuelValve(true);
    this.armIgnition();
    this.fireEngine();

    console.log(`Executing intercept burn: ${throttle.toFixed(0)}% for ${solution.burnDuration.toFixed(0)}s`);
}
```

### Engineering Additions

```typescript
/**
 * Get system health for damage display
 */
getSystemHealth(): Record<string, number> {
    // Aggregate health from all systems
    const electrical = this.getElectricalState();
    const thermal = this.getThermalState();
    const propulsion = this.getMainEngineState();

    return {
        reactor: electrical.reactor.health || 100,
        power: electrical.battery.health || 100,
        thermal: thermal.radiators?.health || 100,
        coolant: thermal.coolant?.health || 100,
        engine: propulsion.health || 100,
        rcs: 100, // TODO: Get actual RCS health
        navigation: 100, // TODO: Get actual nav health
        sensors: 100, // TODO: Get actual sensor health
        lifesupport: 100 // TODO: Get actual LS health
    };
}

/**
 * Emergency reactor shutdown with venting
 */
emergencyVentReactor(): void {
    // SCRAM reactor
    this.scramReactor();

    // Vent coolant for rapid cooling
    const thermal = this.spacecraft.thermal;
    if (thermal && thermal.coolant) {
        thermal.coolant.emergencyVent = true;
        console.log('⚠️  EMERGENCY COOLANT VENT - Rapid reactor cooling');
    }
}
```

---

## 5. Fix Panel Rendering Consistency (1.5 hours)

**Issue:** Panels have slightly different styles, layouts, keyboard hint formats

### Create Shared UI Utility

**New File:** `game/src/ui/ui-utils.ts`

```typescript
/**
 * Shared UI rendering utilities for consistency
 */

export interface ColorPalette {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    good: string;
    warning: string;
    critical: string;
}

export class UIUtils {
    /**
     * Draw standardized panel box
     */
    static drawPanelBox(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        title: string,
        palette: ColorPalette
    ): void {
        // Outer border
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Title bar
        ctx.fillStyle = palette.background;
        ctx.fillRect(x, y, width, 30);
        ctx.strokeRect(x, y, width, 30);

        // Title text
        ctx.fillStyle = palette.primary;
        ctx.font = 'bold 16px "Courier New"';
        ctx.fillText(title, x + 10, y + 20);
    }

    /**
     * Draw standardized gauge
     */
    static drawGauge(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        value: number,
        max: number,
        label: string,
        palette: ColorPalette
    ): void {
        const fillWidth = (value / max) * width;
        const percent = (value / max) * 100;

        // Label
        ctx.fillStyle = palette.primary;
        ctx.font = '12px "Courier New"';
        ctx.fillText(label, x, y - 5);

        // Outline
        ctx.strokeStyle = palette.primary;
        ctx.strokeRect(x, y, width, height);

        // Fill with color based on percentage
        let fillColor = palette.good;
        if (percent < 30) fillColor = palette.critical;
        else if (percent < 60) fillColor = palette.warning;

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, fillWidth, height);

        // Percentage text
        ctx.fillStyle = palette.primary;
        ctx.fillText(`${percent.toFixed(0)}%`, x + width + 10, y + height - 2);
    }

    /**
     * Draw standardized status indicator
     */
    static drawStatusIndicator(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        label: string,
        status: 'on' | 'off' | 'warning' | 'critical',
        palette: ColorPalette
    ): void {
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = palette.primary;
        ctx.fillText(label + ':', x, y);

        const statusColors = {
            on: palette.good,
            off: palette.secondary,
            warning: palette.warning,
            critical: palette.critical
        };

        ctx.fillStyle = statusColors[status];
        ctx.fillText(status.toUpperCase(), x + 100, y);
    }

    /**
     * Draw standardized keyboard hints
     */
    static drawKeyboardHints(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        hints: string[],
        palette: ColorPalette
    ): void {
        ctx.fillStyle = palette.secondary;
        ctx.font = '11px "Courier New"';

        hints.forEach((hint, index) => {
            ctx.fillText(hint, x, y + (index * 15));
        });
    }
}
```

### Apply to All Panels

Update each panel to use UIUtils:
```typescript
import { UIUtils } from '../ui-utils';

// In render method:
UIUtils.drawPanelBox(this.ctx, x, y, width, height, 'HELM CONTROL [1/5]', this.palette);
UIUtils.drawGauge(this.ctx, x, y, 100, 10, fuelPercent, 100, 'Fuel', this.palette);
UIUtils.drawStatusIndicator(this.ctx, x, y, 'Engine', engineOn ? 'on' : 'off', this.palette);
UIUtils.drawKeyboardHints(this.ctx, x, y, [
    '[F] Fuel Valve    [G] Arm    [H] Fire',
    '[Q/A] Throttle    [R] Cutoff'
], this.palette);
```

---

## Phase 3 Summary

### What Gets Fixed:
1. ✅ Life Support panel complete (individual doors, O2 rate, fire/vent sequences)
2. ✅ Helm panel complete (all 12 RCS thrusters)
3. ✅ HUD placeholder data replaced (real faction data)
4. ✅ NPCGoalSystem distance calculation fixed
5. ✅ SpacecraftAdapter complete (all needed methods)
6. ✅ Panel rendering consistent (shared UI utilities)

### Player Experience Improvements:
- All control panels fully functional as designed
- Consistent UI styling across all panels
- No more placeholder data
- Complete procedural complexity (multi-step sequences)

### Time Investment:
- Minimum: 6 hours
- Maximum: 8 hours (with thorough testing)

### Success Criteria:
- [ ] Q/W/E/R/T keys control individual doors in Life Support
- [ ] A then S fires fire suppression (armed sequence)
- [ ] Z then X vents compartment (safety override)
- [ ] Shift+Q/A adjusts O2 generation rate
- [ ] - and = keys fire RCS thrusters 11 and 12
- [ ] HUD shows actual factions present in system
- [ ] All panels use consistent box/gauge/status rendering
- [ ] No console errors or placeholder warnings

---

## Next Phase Preview

**Phase 4: Polish & Testing** will address:
- Visual rendering (spacecraft, planets, trajectories)
- Test coverage (add universe/game tests)
- Documentation updates
- Performance profiling
- Bug fixes from testing

**Why Phase 4 is separate:** UI is now complete. Phase 4 makes it beautiful and bulletproof.

---

**Ready for Phase 4?** Player-facing UI is now perfect. Next we add visuals and tests.
