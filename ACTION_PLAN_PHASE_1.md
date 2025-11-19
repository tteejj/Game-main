# Complete Action Plan - Phase 1: Critical Infrastructure
## Foundation Fixes (Everything Else Depends On This)

**Goal:** Fix critical bugs and infrastructure issues that block all other work
**Time Estimate:** 2-3 hours
**Why First:** These bugs break core functionality. Must fix before building on top.

---

## 1. Fix Critical NPC Navigation Bug ⚠️ GAME-BREAKING

**File:** `game/src/game.ts:414`
**Issue:** Typo causes NPCs to never reach destinations (dz always = 0)
**Impact:** Traffic system, economy, entire universe simulation broken
**Time:** 5 minutes

### Current Code (WRONG):
```typescript
const dz = ship.destination.z - ship.destination.z;  // Always 0!
```

### Fix:
```typescript
const dz = ship.position.z - ship.destination.z;
```

### Verification:
1. After fix, run game and check console for NPC distance calculations
2. Verify NPCs actually reach stations (check "Ship reached destination" logs)
3. Test that economy cargo deliveries work

---

## 2. Install Missing Dependencies ⚠️ BLOCKS TESTING

**Location:** `physics-modules/`
**Issue:** simplex-noise dependency missing, tests won't run
**Impact:** Can't verify 99.5% test pass claim, can't run tests during development
**Time:** 10 minutes

### Actions:
```bash
cd /home/user/Game-main/physics-modules
npm install
npm test  # Verify 218/219 tests pass
```

### If Tests Fail:
- Document which test is failing
- Check if it's a real bug or flaky test
- Fix or document as known issue

### Expected Output:
```
✓ 218 tests passing
✗ 1 test failing (documented as acceptable)
Pass rate: 99.5%
```

---

## 3. Decide on Hull Integrity System ⚠️ CRITICAL DECISION

**Files Affected:**
- `game-engine/src/SpaceGame.ts` (has TODOs)
- `game-engine/src/SpaceGameEnhanced.ts` (already has it!)
- `game/src/ui/panels/engineering-panel.ts` (shows mock data)

**Issue:** Hull damage is calculated but not tracked. Engineering panel fakes the data.

### Decision Point: CHOOSE ONE

**Option A: Use SpaceGameEnhanced** (RECOMMENDED - 30 min)
- SpaceGameEnhanced already has hull AND radiation tracking
- Just switch game.ts to use Enhanced version
- Wire Engineering panel to real data
- **Pros:** No new code, already tested
- **Cons:** None

**Option B: Implement in SpaceGame** (3-4 hours)
- Add hull integrity tracking to SpaceGame
- Add radiation health tracking
- Wire to damage sources
- **Pros:** Learn the codebase
- **Cons:** Duplicates existing work

### Recommended: Option A - Use SpaceGameEnhanced

#### Step 1: Switch Game to Use Enhanced Version (15 min)
**File:** `game/src/game.ts`

Find where SpaceGame is imported and instantiated (probably around line 10-50), change:
```typescript
// OLD:
import { SpaceGame } from '../../game-engine/src/SpaceGame';
const engine = new SpaceGame(...);

// NEW:
import { SpaceGameEnhanced } from '../../game-engine/src/SpaceGameEnhanced';
const engine = new SpaceGameEnhanced(...);
```

#### Step 2: Wire Engineering Panel to Real Hull Data (15 min)
**File:** `game/src/ui/panels/engineering-panel.ts:315-334`

Replace mock calculation with:
```typescript
private getHullIntegrity(): number {
    const state = this.spacecraft.getState();
    // SpaceGameEnhanced provides hullIntegrity in state
    return state.hullIntegrity || 100;  // Default to 100 if not available
}
```

#### Step 3: Update SpacecraftAdapter (if needed)
**File:** `game/src/spacecraft-adapter.ts`

Add method to expose hull integrity:
```typescript
getHullIntegrity(): number {
    // Get from SpaceGameEnhanced state
    const state = this.spacecraft.getState();
    return state.hullIntegrity || 100;
}
```

#### Step 4: Test
1. Start game with SpaceGameEnhanced
2. Expose ship to hazard (fly into hazard zone)
3. Check Engineering panel shows decreasing hull integrity
4. Verify radiation tracking also works
5. Check for console errors

---

## 4. Decide on Faction Diplomacy Engine ⚠️ CRITICAL DECISION

**File:** `universe-system/src/faction-dynamics/FactionDiplomacyEngine.ts`
**Issue:** 8 empty stub functions, entire system non-functional
**Impact:** Player actions don't affect faction relationships, wars/alliances never trigger

### Decision Point: CHOOSE ONE

**Option A: Remove Non-Functional Code** (RECOMMENDED - 1 hour)
- Delete or comment out empty functions
- Add TODO comments for future implementation
- Document in README that diplomacy is "planned feature"
- **Pros:** Clean, honest about state
- **Cons:** Feature not available

**Option B: Implement Minimal Diplomacy** (6-8 hours)
- Implement basic logic for all 8 functions
- Simple reputation changes based on events
- **Pros:** Feature works
- **Cons:** Significant time investment

**Option C: Implement Full Diplomacy** (3-5 days)
- Complex relationship modeling
- Dynamic wars and alliances
- Full consequence system
- **Pros:** Feature complete
- **Cons:** Way too much time for this phase

### Recommended: Option A - Remove and Document

#### Step 1: Update FactionDiplomacyEngine.ts (30 min)
```typescript
// At top of file, add documentation
/**
 * PLANNED FEATURE - v2.0
 *
 * This system is currently non-functional. Event processing methods
 * are stubbed out and will be implemented in a future release.
 *
 * For now, faction relationships are static and set at initialization.
 * Player actions do not dynamically affect faction standing.
 */

// For each empty function, add clear comment:
private processPirateRaid(event: HistoricalEvent, factions: string[]): DiplomaticInteraction[] {
    // TODO v2.0: Implement pirate raid diplomacy
    // - Attacked faction becomes hostile to pirates
    // - Defender factions gain reputation with victim
    // - Neutral factions may take sides
    return [];  // Currently non-functional
}
```

#### Step 2: Update StarSystem Integration (15 min)
**File:** `universe-system/src/StarSystem.ts`

Find where diplomacy engine is called, add conditional:
```typescript
// Only process diplomacy if enabled
if (this.config.enableDiplomacy) {  // Add config flag
    this.diplomacyEngine.processEvents(...);
} else {
    // Diplomacy disabled - relationships are static
    console.log('[Diplomacy] System disabled - relationships are static');
}
```

#### Step 3: Document in README (15 min)
**File:** `universe-system/README.md`

Add section:
```markdown
## Known Limitations

### Faction Diplomacy (v2.0 Planned)
The faction diplomacy system is currently non-functional. While the data structures
and event recording are in place, the event processing logic is not implemented.

**Current Behavior:**
- Faction relationships are set at star system generation
- Player actions do not affect faction standing dynamically
- Wars and alliances do not trigger from events

**Workaround:**
- Initial faction relationships are realistic and playable
- Manual reputation changes can be made via debug console if needed

**Timeline:**
- Planned for v2.0 release
- Estimated 1-2 weeks of development time
```

---

## 5. Fix Collision Handler Stub

**File:** `game-engine/src/SpaceGame.ts:282-284`
**Issue:** Collision just pauses game, no damage or consequences
**Time:** 30 minutes

### Current Code:
```typescript
private handleCollision(body: any): void {
    console.log(`💥 COLLISION with ${body.name}!`);
    // TODO: Implement crash handling
    this.paused = true;
}
```

### Fix (Minimal Implementation):
```typescript
private handleCollision(body: any): void {
    console.log(`💥 COLLISION with ${body.name}!`);

    // Calculate impact damage based on relative velocity
    const impactSpeed = this.spacecraft.velocity.magnitude();
    const damageFactor = Math.min(impactSpeed / 100, 1.0); // Scale to 0-1

    // Apply hull damage (if SpaceGameEnhanced)
    if (this.spacecraft.hullIntegrity !== undefined) {
        const damage = damageFactor * 50; // Up to 50% damage
        this.spacecraft.hullIntegrity = Math.max(0, this.spacecraft.hullIntegrity - damage);

        console.log(`⚠️  Hull damage: ${damage.toFixed(1)}%`);

        // Check for mission failure
        if (this.spacecraft.hullIntegrity <= 0) {
            console.log('💀 CRITICAL HULL FAILURE - Mission Failed');
            this.gameOver('collision');
        }
    }

    // Pause game to let player see what happened
    this.paused = true;
}
```

### Also Add (if missing):
```typescript
private gameOver(reason: string): void {
    console.log(`🎮 GAME OVER: ${reason}`);
    // Emit game over event or set state
    this.state = 'GAME_OVER';
}
```

---

## Phase 1 Summary

### What Gets Fixed:
1. ✅ NPC navigation works (entire universe simulation functional)
2. ✅ Tests can run (development workflow works)
3. ✅ Hull damage tracked (engineering panel shows real data)
4. ✅ Radiation tracked (if using SpaceGameEnhanced)
5. ✅ Diplomacy documented (clear what's working vs not)
6. ✅ Collisions have consequences (game over on crash)

### What's Still Broken (Fixed in Later Phases):
- Repair system UI (Phase 2)
- Life Support simplified controls (Phase 3)
- Missing RCS thrusters (Phase 3)
- Visual rendering (Phase 4)
- Test coverage gaps (Phase 4)

### Time Investment:
- Minimum: 2 hours (if choosing recommended options)
- Maximum: 3 hours (if testing thoroughly)

### Success Criteria:
- [ ] NPCs reach destinations and deliver cargo
- [ ] npm test passes in physics-modules
- [ ] Engineering panel shows real hull integrity that decreases with damage
- [ ] Collisions cause hull damage and game over
- [ ] Diplomacy documented as non-functional
- [ ] No console errors on game start

---

## Next Phase Preview

**Phase 2: Foundation Systems** will address:
- Repair system UI integration
- BiomeSystem empty generators
- NPC learning system (AdaptiveAI)
- Engineering panel coolant flow controls
- Navigation panel plot intercept

**Why Phase 2 is separate:** These depend on Phase 1 being solid. No point wiring repair UI if hull tracking doesn't exist yet.

---

**Ready to proceed with Phase 1 fixes?** All changes are low-risk and take 2-3 hours total.
