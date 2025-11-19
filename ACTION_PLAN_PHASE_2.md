# Complete Action Plan - Phase 2: Foundation Systems
## Core Backend Systems (UI Will Wire To These)

**Goal:** Complete backend systems that UI panels need to integrate with
**Time Estimate:** 1 day (6-8 hours)
**Why Second:** Phase 1 fixed infrastructure. Now build the backend systems that UI will connect to.
**Dependencies:** Phase 1 must be complete (hull tracking working, tests passing)

---

## 1. Wire Repair System to Engineering Panel (2 hours)

**Files:**
- `physics-modules/src/damage-control.ts` (system exists ✓)
- `game/src/ui/panels/engineering-panel.ts:403-407` (returns empty array ❌)
- `game/src/spacecraft-adapter.ts` (add method)

**Issue:** DamageControl system exists but Engineering panel doesn't show repairs

### Step 1: Add Adapter Method (30 min)
**File:** `game/src/spacecraft-adapter.ts`

Add after existing damage methods:
```typescript
/**
 * Get active repair tasks
 */
getActiveRepairs(): Array<{
    id: string;
    type: 'BREACH' | 'SYSTEM' | 'STRUCTURAL';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    progress: number;
    timeRemaining: number;
    assignedCrew: string[];
}> {
    // Get from damage control system
    const damageControl = this.spacecraft.damageControl;
    if (!damageControl) return [];

    return damageControl.getActiveTasks().map(task => ({
        id: task.id,
        type: task.type,
        priority: task.priority,
        progress: task.progress,
        timeRemaining: task.estimatedTimeRemaining,
        assignedCrew: task.assignedCrew.map(c => c.name)
    }));
}

/**
 * Get crew status for damage control
 */
getRepairCrew(): Array<{
    id: string;
    name: string;
    location: string;
    status: 'IDLE' | 'WORKING' | 'RESTING';
    skill: number;
    fatigue: number;
    efficiency: number;
}> {
    const damageControl = this.spacecraft.damageControl;
    if (!damageControl) return [];

    return damageControl.getCrew().map(crew => ({
        id: crew.id,
        name: crew.name,
        location: crew.location,
        status: crew.status,
        skill: crew.repairSkill,
        fatigue: crew.fatigueLevel,
        efficiency: crew.efficiency
    }));
}

/**
 * Initiate repair on damaged system
 */
initiateRepair(systemName: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): boolean {
    const damageControl = this.spacecraft.damageControl;
    if (!damageControl) return false;

    return damageControl.createRepairTask({
        type: 'SYSTEM',
        targetSystem: systemName,
        priority: priority,
        location: this.getSystemLocation(systemName)
    });
}

/**
 * Cycle to next damaged system for repair UI
 */
getNextDamagedSystem(): string | null {
    // Get list of damaged systems from spacecraft state
    const systems = ['reactor', 'engine', 'lifesupport', 'thermal', 'coolant'];
    const damaged = systems.filter(sys => {
        const state = this.getSystemState(sys);
        return state && state.health < 100;
    });

    return damaged.length > 0 ? damaged[0] : null;
}

private getSystemLocation(systemName: string): string {
    // Map systems to compartments
    const locations: Record<string, string> = {
        'reactor': 'engineering',
        'engine': 'engineering',
        'lifesupport': 'center',
        'thermal': 'engineering',
        'coolant': 'engineering',
        'navigation': 'bridge',
        'sensors': 'bow'
    };
    return locations[systemName] || 'center';
}

private getSystemState(systemName: string): { health: number } | null {
    // Get system health from spacecraft
    const electrical = this.getElectricalState();
    const thermal = this.getThermalState();

    switch (systemName) {
        case 'reactor':
            return { health: electrical.reactor.health || 100 };
        case 'thermal':
            return { health: thermal.radiators?.health || 100 };
        // Add other systems as needed
        default:
            return { health: 100 };
    }
}
```

### Step 2: Update Engineering Panel (45 min)
**File:** `game/src/ui/panels/engineering-panel.ts:403-407`

Replace stub:
```typescript
private getActiveRepairs(): any[] {
    // Get actual repair data from spacecraft state
    return this.spacecraft.getActiveRepairs();
}
```

Add new rendering section for repairs (around line 250):
```typescript
/**
 * Render active repairs section
 */
private renderRepairs(y: number): number {
    const ctx = this.ctx;
    const repairs = this.getActiveRepairs();

    ctx.fillStyle = this.palette.primary;
    ctx.font = '14px "Courier New"';
    ctx.fillText('ACTIVE REPAIRS', 20, y);
    y += 20;

    if (repairs.length === 0) {
        ctx.fillStyle = this.palette.secondary;
        ctx.font = '12px "Courier New"';
        ctx.fillText('No active repairs', 30, y);
        return y + 20;
    }

    repairs.forEach((repair, index) => {
        // Repair type and priority
        const priorityColor = this.getPriorityColor(repair.priority);
        ctx.fillStyle = priorityColor;
        ctx.fillText(`[${repair.priority}] ${repair.type}`, 30, y);
        y += 15;

        // Progress bar
        ctx.fillStyle = this.palette.secondary;
        ctx.fillRect(50, y, 200, 10);
        ctx.fillStyle = this.palette.primary;
        ctx.fillRect(50, y, repair.progress * 2, 10);

        // Progress percentage
        ctx.fillStyle = this.palette.primary;
        ctx.fillText(`${repair.progress.toFixed(0)}%`, 260, y + 10);

        // Time remaining
        const minutes = Math.floor(repair.timeRemaining / 60);
        const seconds = Math.floor(repair.timeRemaining % 60);
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, 310, y + 10);

        // Assigned crew
        if (repair.assignedCrew.length > 0) {
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`Crew: ${repair.assignedCrew.join(', ')}`, 50, y + 25);
            y += 25;
        }

        y += 20;
    });

    return y;
}

private getPriorityColor(priority: string): string {
    switch (priority) {
        case 'CRITICAL': return '#ff0000';
        case 'HIGH': return '#ff8800';
        case 'MEDIUM': return '#ffaa00';
        case 'LOW': return this.palette.secondary;
        default: return this.palette.primary;
    }
}
```

### Step 3: Add Repair Controls (30 min)

Update `handleInput()` method:
```typescript
handleInput(key: string): void {
    const keyLower = key.toLowerCase();

    switch (keyLower) {
        // ... existing controls ...

        case 'm':
            // Cycle to next damaged system
            this.selectedDamagedSystem = this.spacecraft.getNextDamagedSystem();
            if (this.selectedDamagedSystem) {
                console.log(`Selected damaged system: ${this.selectedDamagedSystem}`);
            } else {
                console.log('No damaged systems');
            }
            break;

        case 'n':
            // Initiate repair on selected system
            if (this.selectedDamagedSystem) {
                const success = this.spacecraft.initiateRepair(
                    this.selectedDamagedSystem,
                    'HIGH'
                );
                if (success) {
                    console.log(`Initiated repair on ${this.selectedDamagedSystem}`);
                } else {
                    console.log('Failed to initiate repair (no crew available?)');
                }
            } else {
                console.log('No system selected for repair');
            }
            break;
    }
}
```

Add member variable at top of class:
```typescript
private selectedDamagedSystem: string | null = null;
```

### Step 4: Update Keyboard Hints (15 min)

In `render()` method, update hints section:
```typescript
// Add to keyboard hints
ctx.fillText('[M] Cycle Damaged Systems    [N] Initiate Repair', x, hintsY);
hintsY += 15;
```

---

## 2. Fill BiomeSystem Empty Generators (1 hour)

**File:** `universe-system/src/BiomeSystem.ts:783-789`
**Issue:** Two biome generators are empty functions

### Step 1: Implement Extreme Temperature Biomes (30 min)

Replace empty function at line 783:
```typescript
private addExtremeBiomes(): void {
    const temp = this.planet.surfaceTemp;

    // Extreme Cold Biomes (< 200K)
    if (temp < 200) {
        if (temp < 100) {
            // Ultra-cold (< 100K): Cryogenic conditions
            this.biomes.push({
                name: 'Cryogenic Wasteland',
                type: 'extreme_cold',
                description: 'Temperatures near absolute zero. Exotic ice formations.',
                area: 0.3,
                features: ['nitrogen_ice', 'methane_seas', 'exotic_ices'],
                temperature: temp,
                pressure: this.planet.surfacePressure,
                resources: ['helium-3', 'deuterium', 'exotic_ices']
            });
        } else {
            // Very cold (100-200K): Frozen volatiles
            this.biomes.push({
                name: 'Frozen Volatile Plains',
                type: 'extreme_cold',
                description: 'Frozen nitrogen, methane, and CO2. Sublimation zones.',
                area: 0.4,
                features: ['frozen_volatiles', 'sublimation_zones', 'ice_cliffs'],
                temperature: temp,
                pressure: this.planet.surfacePressure,
                resources: ['water_ice', 'methane', 'ammonia']
            });
        }
    }

    // Extreme Heat Biomes (> 500K)
    if (temp > 500) {
        if (temp > 800) {
            // Ultra-hot (> 800K): Molten surface
            this.biomes.push({
                name: 'Molten Hellscape',
                type: 'extreme_heat',
                description: 'Surface temperatures melt rock. Lava seas.',
                area: 0.5,
                features: ['lava_seas', 'volcanic_plains', 'toxic_atmosphere'],
                temperature: temp,
                pressure: this.planet.surfacePressure,
                resources: ['rare_metals', 'sulfur', 'heavy_elements']
            });
        } else {
            // Very hot (500-800K): Scorched surface
            this.biomes.push({
                name: 'Scorched Wastes',
                type: 'extreme_heat',
                description: 'Extreme heat. Thermal degradation of surface materials.',
                area: 0.4,
                features: ['heat_cracks', 'thermal_vents', 'glassy_plains'],
                temperature: temp,
                pressure: this.planet.surfacePressure,
                resources: ['silicon', 'metals', 'sulfur']
            });
        }
    }

    // Extreme Pressure Biomes (> 100 bar)
    if (this.planet.surfacePressure > 100) {
        this.biomes.push({
            name: 'Crushing Depths',
            type: 'extreme_pressure',
            description: 'Atmospheric pressure crushes most materials.',
            area: 0.6,
            features: ['pressure_zones', 'supercritical_fluids', 'compressed_atmosphere'],
            temperature: temp,
            pressure: this.planet.surfacePressure,
            resources: ['compressed_gases', 'dense_materials']
        });
    }
}
```

### Step 2: Implement High Gravity Biomes (30 min)

Replace empty function at line 787:
```typescript
private addHighGravityBiomes(): void {
    const gravity = this.planet.gravity;

    // High Gravity (> 1.5 G)
    if (gravity > 1.5) {
        if (gravity > 3.0) {
            // Extreme Gravity (> 3 G): Flattened terrain
            this.biomes.push({
                name: 'Gravity-Compressed Plains',
                type: 'high_gravity',
                description: 'Extreme gravity creates perfectly flat terrain. Dense atmosphere.',
                area: 0.7,
                features: ['flat_terrain', 'dense_atmosphere', 'heavy_materials'],
                temperature: this.planet.surfaceTemp,
                pressure: this.planet.surfacePressure * (gravity / 1.0), // Pressure scales with gravity
                resources: ['heavy_metals', 'dense_ores', 'gravitational_anomalies']
            });
        } else {
            // High Gravity (1.5-3 G): Low relief terrain
            this.biomes.push({
                name: 'Low-Relief Highlands',
                type: 'high_gravity',
                description: 'High gravity prevents tall mountains. Broad, flat plateaus.',
                area: 0.5,
                features: ['plateaus', 'low_mountains', 'wide_valleys'],
                temperature: this.planet.surfaceTemp,
                pressure: this.planet.surfacePressure * (gravity / 1.0),
                resources: ['metals', 'dense_minerals']
            });
        }

        // High-G adapted features
        this.biomes.push({
            name: 'Gravity Well Basin',
            type: 'high_gravity',
            description: 'Natural low points where everything accumulates.',
            area: 0.3,
            features: ['accumulation_zones', 'sediment_traps', 'resource_concentration'],
            temperature: this.planet.surfaceTemp - 10, // Slightly cooler in basins
            pressure: this.planet.surfacePressure * 1.2, // Higher pressure in basins
            resources: ['concentrated_ores', 'sediments', 'volatiles']
        });
    }

    // Low Gravity (< 0.3 G) - Opposite effects
    if (gravity < 0.3) {
        this.biomes.push({
            name: 'Low-G Highlands',
            type: 'low_gravity',
            description: 'Low gravity allows towering mountains and deep canyons.',
            area: 0.4,
            features: ['tall_peaks', 'deep_canyons', 'unstable_terrain'],
            temperature: this.planet.surfaceTemp,
            pressure: this.planet.surfacePressure * (gravity / 1.0),
            resources: ['light_materials', 'gases']
        });
    }
}
```

---

## 3. Enable NPC Learning System (1.5 hours)

**File:** `universe-system/src/entity-ai/AdaptiveAI.ts:284-289`
**Issue:** Learning system commented out with TODO

### Step 1: Implement addLearnedBehavior in ExtendedNPCMemory (45 min)

**File:** `universe-system/src/entity-ai/ExtendedNPCMemory.ts`

Add method (around line 200-300 where other methods are):
```typescript
/**
 * Add a learned behavior from experience
 */
addLearnedBehavior(behavior: {
    context: string;
    action: string;
    outcome: 'success' | 'failure';
    value: number;
}): void {
    // Find or create behavior entry
    const key = `${behavior.context}:${behavior.action}`;

    if (!this.learnedBehaviors) {
        this.learnedBehaviors = new Map();
    }

    let entry = this.learnedBehaviors.get(key);
    if (!entry) {
        entry = {
            context: behavior.context,
            action: behavior.action,
            successCount: 0,
            failureCount: 0,
            averageValue: 0,
            confidence: 0
        };
        this.learnedBehaviors.set(key, entry);
    }

    // Update statistics
    if (behavior.outcome === 'success') {
        entry.successCount++;
    } else {
        entry.failureCount++;
    }

    // Update average value (running average)
    const totalAttempts = entry.successCount + entry.failureCount;
    entry.averageValue = ((entry.averageValue * (totalAttempts - 1)) + behavior.value) / totalAttempts;

    // Calculate confidence (0-1 based on number of attempts)
    entry.confidence = Math.min(totalAttempts / 10, 1.0); // Max confidence at 10 attempts

    console.log(`[Learning] ${key}: ${entry.successCount}/${totalAttempts} success, value ${entry.averageValue.toFixed(2)}, confidence ${entry.confidence.toFixed(2)}`);
}

/**
 * Get learned behavior value
 */
getLearnedBehaviorValue(context: string, action: string): number {
    const key = `${context}:${action}`;
    const entry = this.learnedBehaviors?.get(key);

    if (!entry || entry.confidence < 0.3) {
        return 0.5; // Default value if not learned yet
    }

    return entry.averageValue;
}

/**
 * Get best learned action for context
 */
getBestLearnedAction(context: string, possibleActions: string[]): string | null {
    let bestAction: string | null = null;
    let bestValue = -Infinity;

    for (const action of possibleActions) {
        const value = this.getLearnedBehaviorValue(context, action);
        const entry = this.learnedBehaviors?.get(`${context}:${action}`);
        const confidence = entry?.confidence || 0;

        // Weighted by confidence
        const weightedValue = value * confidence;

        if (weightedValue > bestValue) {
            bestValue = weightedValue;
            bestAction = action;
        }
    }

    return bestAction;
}
```

Add type definition at top of file:
```typescript
interface LearnedBehavior {
    context: string;
    action: string;
    successCount: number;
    failureCount: number;
    averageValue: number;
    confidence: number;
}
```

Add to class properties:
```typescript
private learnedBehaviors?: Map<string, LearnedBehavior>;
```

### Step 2: Enable Learning in AdaptiveAI (30 min)

**File:** `universe-system/src/entity-ai/AdaptiveAI.ts:284-289`

Uncomment and update:
```typescript
// Record learning
this.memory.addLearnedBehavior({
    context: 'trading',
    action: trade.commodity,
    outcome: profit > 0 ? 'success' : 'failure',
    value: profit / 1000  // Normalize to 0-1 range
});
```

### Step 3: Apply Learning to Decision Making (15 min)

In NPCShipAI or wherever trade decisions are made:
```typescript
private selectTradeCommodity(station: SpaceStation): string {
    // Get available commodities
    const available = Array.from(station.economy.prices.keys());

    // Check if we have learned preferences
    if (this.adaptiveAI && this.adaptiveAI.memory) {
        const learned = this.adaptiveAI.memory.getBestLearnedAction('trading', available);
        if (learned) {
            console.log(`[AI] Using learned preference: ${learned}`);
            return learned;
        }
    }

    // Fallback to default logic
    return available[Math.floor(Math.random() * available.length)];
}
```

---

## 4. Add Engineering Panel Coolant Flow Controls (45 min)

**File:** `game/src/ui/panels/engineering-panel.ts`
**Issue:** Missing V/F keys for coolant flow adjustment

### Step 1: Add Flow Control to SpacecraftAdapter (20 min)

**File:** `game/src/spacecraft-adapter.ts`

Add methods:
```typescript
/**
 * Adjust coolant flow rate
 */
adjustCoolantFlow(loopId: number, delta: number): void {
    // Increase or decrease flow rate (delta is -1 or +1)
    const coolant = this.spacecraft.coolant;
    if (!coolant || !coolant.loops[loopId]) return;

    const loop = coolant.loops[loopId];
    const newFlow = Math.max(0, Math.min(100, loop.flowRate + delta * 5)); // Adjust by 5% increments
    loop.flowRate = newFlow;

    console.log(`Coolant loop ${loopId} flow: ${newFlow.toFixed(0)}%`);
}

/**
 * Set coolant flow rate directly
 */
setCoolantFlow(loopId: number, flowRate: number): void {
    const coolant = this.spacecraft.coolant;
    if (!coolant || !coolant.loops[loopId]) return;

    loop.flowRate = Math.max(0, Math.min(100, flowRate));
}
```

### Step 2: Add Input Handling (15 min)

**File:** `game/src/ui/panels/engineering-panel.ts`

Update `handleInput()`:
```typescript
case 'v':
    // Increase coolant flow (primary loop)
    this.spacecraft.adjustCoolantFlow(0, 1);
    break;

case 'f':
    // Decrease coolant flow (primary loop)
    this.spacecraft.adjustCoolantFlow(0, -1);
    break;

case 'shift+v':
    // Increase coolant flow (secondary loop)
    this.spacecraft.adjustCoolantFlow(1, 1);
    break;

case 'shift+f':
    // Decrease coolant flow (secondary loop)
    this.spacecraft.adjustCoolantFlow(1, -1);
    break;
```

### Step 3: Update Rendering to Show Flow Rate (10 min)

In coolant loop rendering section, add:
```typescript
// Show flow rate
ctx.fillStyle = this.palette.primary;
ctx.fillText(`Flow: ${loop.flowRate.toFixed(0)}%`, loopX + 150, loopY);

// Show flow rate bar
const flowBarWidth = 80;
ctx.strokeStyle = this.palette.primary;
ctx.strokeRect(loopX + 200, loopY - 8, flowBarWidth, 10);
ctx.fillStyle = this.palette.accent;
ctx.fillRect(loopX + 200, loopY - 8, (loop.flowRate / 100) * flowBarWidth, 10);
```

Update keyboard hints:
```typescript
ctx.fillText('[V/F] Coolant Flow    [P] Primary Pump    [C] Secondary Pump', x, hintsY);
```

---

## 5. Implement Navigation Plot Intercept (1 hour)

**File:** `game/src/ui/panels/navigation-panel.ts:154`
**Issue:** Plot intercept just logs to console

### Step 1: Add Intercept Calculator to SpacecraftAdapter (40 min)

**File:** `game/src/spacecraft-adapter.ts`

```typescript
/**
 * Calculate intercept solution for selected target
 */
plotIntercept(targetId: string): {
    success: boolean;
    burnTime: number;
    burnDuration: number;
    deltaV: number;
    interceptTime: number;
    interceptPoint: { x: number; y: number; z: number };
} | null {
    // Get target from contacts
    const contacts = this.getRadarContacts();
    const target = contacts.find(c => c.id === targetId);
    if (!target) {
        console.log('Target not found');
        return null;
    }

    // Get current spacecraft state
    const nav = this.getNavigationTelemetry();
    const shipPos = { x: nav.position.x, y: nav.position.y, z: nav.position.z };
    const shipVel = { x: nav.velocity.x, y: nav.velocity.y, z: nav.velocity.z };

    // Target state (assuming constant velocity for simple intercept)
    const targetPos = target.position;
    const targetVel = target.velocity || { x: 0, y: 0, z: 0 };

    // Calculate relative position and velocity
    const relPos = {
        x: targetPos.x - shipPos.x,
        y: targetPos.y - shipPos.y,
        z: targetPos.z - shipPos.z
    };
    const relVel = {
        x: targetVel.x - shipVel.x,
        y: targetVel.y - shipVel.y,
        z: targetVel.z - shipVel.z
    };

    // Time to closest approach (TCA)
    const relPosSquared = relPos.x ** 2 + relPos.y ** 2 + relPos.z ** 2;
    const relVelSquared = relVel.x ** 2 + relVel.y ** 2 + relVel.z ** 2;
    const dotProduct = relPos.x * relVel.x + relPos.y * relVel.y + relPos.z * relVel.z;

    if (relVelSquared < 0.01) {
        console.log('Target has negligible relative velocity');
        return null;
    }

    const tca = -dotProduct / relVelSquared;

    if (tca < 0) {
        console.log('Target is receding');
        return null;
    }

    // Intercept point
    const interceptPoint = {
        x: targetPos.x + targetVel.x * tca,
        y: targetPos.y + targetVel.y * tca,
        z: targetPos.z + targetVel.z * tca
    };

    // Required velocity change
    const requiredVel = {
        x: (interceptPoint.x - shipPos.x) / tca,
        y: (interceptPoint.y - shipPos.y) / tca,
        z: (interceptPoint.z - shipPos.z) / tca
    };

    const deltaVel = {
        x: requiredVel.x - shipVel.x,
        y: requiredVel.y - shipVel.y,
        z: requiredVel.z - shipVel.z
    };

    const deltaV = Math.sqrt(deltaVel.x ** 2 + deltaVel.y ** 2 + deltaVel.z ** 2);

    // Get engine performance for burn calculation
    const engine = this.getMainEngineState();
    const thrust = engine.thrust || 10000; // N
    const mass = 5000; // kg (TODO: get actual mass)
    const acceleration = thrust / mass;

    const burnDuration = deltaV / acceleration;

    return {
        success: true,
        burnTime: tca - burnDuration, // Start burn this many seconds before intercept
        burnDuration,
        deltaV,
        interceptTime: tca,
        interceptPoint
    };
}
```

### Step 2: Update Navigation Panel (20 min)

Replace stub at line 154:
```typescript
case 'p':
    // Plot intercept
    if (this.selectedContactId) {
        const solution = this.spacecraft.plotIntercept(this.selectedContactId);
        if (solution) {
            this.interceptSolution = solution;
            console.log(`Intercept plotted:`);
            console.log(`  Burn in: ${solution.burnTime.toFixed(0)}s`);
            console.log(`  Burn duration: ${solution.burnDuration.toFixed(0)}s`);
            console.log(`  Delta-V: ${solution.deltaV.toFixed(1)} m/s`);
            console.log(`  Intercept in: ${solution.interceptTime.toFixed(0)}s`);
        } else {
            console.log('Failed to calculate intercept');
        }
    } else {
        console.log('No target selected');
    }
    break;
```

Add to class properties:
```typescript
private interceptSolution: any = null;
```

Add rendering in sensors mode:
```typescript
// Show intercept solution if available
if (this.interceptSolution) {
    y += 20;
    ctx.fillStyle = this.palette.accent;
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('INTERCEPT SOLUTION', x + 10, y);
    y += 20;

    ctx.font = '12px "Courier New"';
    ctx.fillStyle = this.palette.primary;
    ctx.fillText(`Burn in: ${this.interceptSolution.burnTime.toFixed(0)}s`, x + 20, y);
    y += 15;
    ctx.fillText(`Duration: ${this.interceptSolution.burnDuration.toFixed(0)}s`, x + 20, y);
    y += 15;
    ctx.fillText(`Delta-V: ${this.interceptSolution.deltaV.toFixed(1)} m/s`, x + 20, y);
    y += 15;
    ctx.fillText(`Intercept: ${this.interceptSolution.interceptTime.toFixed(0)}s`, x + 20, y);
}
```

---

## Phase 2 Summary

### What Gets Fixed:
1. ✅ Repair system wired to Engineering panel (M/N keys work)
2. ✅ BiomeSystem generates extreme/high-G biomes
3. ✅ NPC learning system functional (adapts from experience)
4. ✅ Coolant flow control working (V/F keys)
5. ✅ Plot intercept calculates real solutions

### Dependencies Resolved:
- Repair UI now has backend to connect to
- All biome types generate properly
- NPCs can learn and improve
- Engineering panel fully functional
- Navigation provides complete tactical data

### Time Investment:
- Minimum: 6 hours (efficient work)
- Maximum: 8 hours (with testing)

### Success Criteria:
- [ ] Engineering panel shows active repairs when damage occurs
- [ ] M key cycles damaged systems, N initiates repairs
- [ ] Extreme temperature and high-G planets have appropriate biomes
- [ ] NPCs adapt trade preferences based on past success
- [ ] V/F keys adjust coolant flow with visual feedback
- [ ] P key calculates intercept with burn time/duration/delta-V

---

## Next Phase Preview

**Phase 3: UI & Integration** will address:
- All remaining panel gaps (Life Support doors, Helm RCS, etc.)
- SpacecraftAdapter completion
- HUD placeholder data
- Panel-to-panel consistency

**Why Phase 3 is separate:** Backend systems are now complete. Phase 3 focuses purely on UI polish and making everything player-facing work perfectly.

---

**Ready for Phase 3?** Backend systems are now solid. Next we polish the player-facing UI.
