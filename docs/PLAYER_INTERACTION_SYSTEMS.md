# Player Interaction Systems - Implementation Summary

This document describes the 8 core player interaction systems implemented to make the game playable and give players meaningful agency in the universe.

---

## 1. Active Combat Controls ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:498-658` - Combat methods
- `universe-system/src/PlayerCombatInputHandler.ts` - Input handler
- `universe-system/src/CombatSystem.ts` - Core combat engine (already existed)

### What Players Can Do

**Targeting:**
- `T` - Target nearest hostile ship
- `TAB` - Cycle through all targetable ships
- Target selection displays: name, distance, hull %, shields %

**Weapons:**
- `SPACE` or Left Click - Fire primary weapon (Pulse Laser)
- `F` or Right Click - Fire secondary weapon (Railgun)
- Weapons have heat management, ammo (for railgun), reload times
- Accuracy based on range, target movement, weapon stats

**Tactical Systems:**
- `W` - Toggle weapons armed/safe
- `S` - Toggle shields up/down
- `E` - Toggle evasive maneuvers

### Combat Features

- **Damage Model:** Shield absorption → hull damage → subsystem damage
- **Critical Hits:** 5% chance for 2x damage
- **Heat Management:** Weapons overheat at 100%, require cooldown
- **Power Management:** Weapons consume power per shot
- **Ammunition Tracking:** Railgun uses ammo, laser does not
- **Target Destruction:** Tracked in player stats

### Integration

```typescript
// Example usage
const player = new PlayerShipIntegration(spacecraft, orchestrator, system);

// In game loop, update with nearby contacts
player.update(deltaTime, nearbyContacts);

// Combat input handler
const combatInput = new PlayerCombatInputHandler(player, inputManager);
combatInput.update(); // Call every frame

// Manual combat control
player.targetNearestHostile();
player.firePrimaryWeapon();
player.fireSec ondaryWeapon();
player.toggleWeapons();
```

---

## 2. Mission System ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:660-807` - Mission methods
- `universe-system/src/MissionSystem.ts` - Mission generation engine (already existed)

### What Players Can Do

**At Stations:**
- View available missions (generated dynamically)
- Accept missions (added to active missions list)
- Turn in completed missions for rewards

**Mission Types Available:**
- CARGO_DELIVERY, CARGO_PICKUP
- PASSENGER_TRANSPORT
- ASSASSINATION, COMBAT
- ESCORT, PATROL
- SURVEY, EXPLORATION
- MINING, RESCUE
- SMUGGLING, RECONNAISSANCE

### Mission Features

- **Dynamic Generation:** Missions generated based on universe state, faction needs
- **Multi-Objective:** Missions can have multiple phases
- **Time Limits:** Optional time limits with expiration
- **Rewards:**
  - Credits
  - Reputation changes (multiple factions)
  - Items/equipment
  - Experience points

- **Requirements:**
  - Minimum faction reputation
  - Ship class restrictions
  - Combat/trade ratings

### Mission Progression

Missions auto-update based on player state:
- Position (for travel-to objectives)
- Current system
- Docked status
- Cargo inventory

### Integration

```typescript
// View missions at station (while docked)
const missions = player.getAvailableMissions();

// Accept mission
const result = player.acceptMission(missionId);
if (result.success) {
  console.log(result.message); // "Mission accepted: Deliver Medical Supplies to Alpha Station"
}

// Check active missions
const active = player.getActiveMissions();

// Complete mission
const completion = player.completeMission(missionId);
if (completion.success) {
  console.log(`Earned ${completion.credits} credits`);
  console.log(`Reputation changes:`, completion.reputation);
}

// Abandon mission
player.abandonMission(missionId);

// Get mission summary
console.log(player.getMissionSummary());
```

---

## 3. NPC Interaction System ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:817-908` - Player-facing methods
- `universe-system/src/NPCInteractionInterface.ts` - Interaction logic

### What Players Can Do

**Hailing Ships:**
- Hail any nearby NPC ship (within 10km)
- Receive contextual response based on:
  - NPC type (TRADER, PIRATE, PATROL, etc.)
  - Faction reputation
  - NPC personality

**Interaction Options:**

1. **REQUEST_TRADE** - Initiate trading with traders/miners
2. **REQUEST_ASSISTANCE** - Ask for fuel, repairs (costs credits)
3. **THREATEN** - Hostile action, may force cargo drop or trigger combat
4. **SCAN_CARGO** - Scan their cargo (most NPCs dislike this)
5. **ASK_INFORMATION** - Get intel about trade routes, pirates, factions
6. **OFFER_ESCORT** - Offer escort service for payment
7. **END_CONVERSATION** - Close comm channel

### NPC Response System

NPCs respond differently based on:
- **Reputation:** High rep = friendly, low rep = hostile
- **NPC Type:**
  - Traders: Willing to trade, share information
  - Pirates: Hostile unless high rep with pirates
  - Patrols: Professional, may demand inspections
  - Civilians: Fearful, cooperative

**Example Responses:**

```
[PIRATE, Low Reputation]
"Well, well. Look who it is. You've got a lot of nerve hailing us."

[TRADER, High Reputation]
"Greetings, friend! Good to hear from you. What can I do for you?"

[PATROL, Neutral Reputation]
"Trade Federation patrol. State your business in this sector."
```

### Integration

```typescript
// Get nearby NPCs
const npcs = player.getNearbyNPCs();

// Hail an NPC
const hail = player.hailNPC(npcId);
if (hail) {
  console.log(hail.response);
  console.log('Options:', hail.availableOptions);
}

// Interact
const result = player.interactWithNPC(npcId, 'REQUEST_TRADE');
console.log(result.message);
console.log(result.npcResponse);

// Handle consequences
if (result.consequences) {
  // Credits transferred, reputation changed, or hostility triggered
}

// End conversation
player.endNPCConversation(npcId);
```

---

## 4. Reputation & Consequences System ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:910-1105` - Reputation methods
- Integrated into: docking, missions, NPC interactions

### What Players Experience

**Faction Standings:**
- Reputation scale: -100 (Enemy) to +100 (Allied)
- Standings: Enemy, Hostile, Disliked, Neutral, Liked, Friendly, Allied

**Reputation Changes From:**
- Completing missions
- Combat (destroying faction ships)
- Trading with faction stations
- NPC interactions (threats, assistance, information sharing)
- Smuggling/contraband activities
- Bounties

### Consequences

**Positive Reputation (50+):**
- Access to exclusive missions
- Better trade prices
- NPCs more willing to help
- Faction patrols assist in combat

**Negative Reputation (-50 or below):**
- **Docking Denied:** Can't dock at hostile faction stations
- **KOS (Kill on Sight):** Faction patrols attack on sight
- **Mission Restrictions:** High-value missions not available
- **Bounty Hunters:** NPCs hunt player for bounty

### Bounty System

**Bounties Placed For:**
- Attacking faction ships
- Smuggling contraband (if caught)
- Attempted bribery (if failed)
- Violating faction laws

**Bounty Effects:**
- Can't dock at lawful stations (pirates may still allow)
- Bounty hunters spawn and pursue
- Wanted status displayed

**Clearing Bounties:**
- Pay 150% of bounty value as fine
- Complete "justice" missions
- Bribe officials (risky)

### Integration

```typescript
// Check reputation
const rep = player.getReputationWith('Trade Federation');
const standing = player.getReputationStanding('Trade Federation');
console.log(`Trade Federation: ${standing} (${rep})`);

// Display all reputations
console.log(player.getReputationSummary());

// Modify reputation
player.modifyReputation('Pirates', -20, 'Destroyed pirate vessel');

// Check if can dock
const canDock = player.canDockAt(station);
if (!canDock.allowed) {
  console.log(canDock.reason); // "Docking denied: You are Hostile with Trade Federation"
}

// Bounty management
player.addBounty(5000, 'Trade Federation', 'Illegal weapons trafficking');
const clearResult = player.clearBounty('Trade Federation');
if (clearResult.success) {
  console.log(`Paid ${clearResult.cost} credits to clear bounty`);
}

// Get visual reputation bar
// Trade Federation: [==========          ] Liked (42)
// Pirates:          [                    ] Enemy (-87)
```

---

## 5. Crew Management System ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:1107-1147` - Player methods
- `universe-system/src/PlayerSystemsIntegration.ts:29-161` - Crew logic
- `universe-system/src/CrewManagementSystem.ts` - Core crew system

### What Players Can Do

**At Stations:**
- View available crew for hire (random generation)
- Hire crew members (pay hiring bonus = 1 month salary)
- Fire crew (pay severance = 2 weeks salary)

**Crew Roles:**
- PILOT - Improves maneuverability
- ENGINEER - Faster repairs, better efficiency
- GUNNER - Increased weapon accuracy/damage
- NAVIGATOR - Better jump calculations, fuel efficiency
- MEDIC - Crew health management
- SCIENTIST - Research speed bonus
- SECURITY - Boarding defense

### Crew Attributes

**Skills (0-100):**
- Piloting, Engineering, Weapons, Navigation, Medical, Science, Security
- Role gets +20 to their specialty skill
- Skills affect ship performance

**Status:**
- Morale (0-100) - Affects performance
- Health (0-100) - Can be injured
- Fatigue (0-100) - Needs rest
- Loyalty (0-100) - Risk of mutiny if low

**Traits:**
- Veteran, Quick Learner, Brave, Cautious, Lucky, Efficient, Inspiring, Resourceful, Disciplined

### Crew Economics

**Costs:**
- **Hiring Bonus:** 30 days salary upfront
- **Daily Salary:** 50-550 credits/day (based on skill average)
- **Severance:** 14 days salary when fired

**Salary Example:**
- Skilled Engineer (avg 70 skill) = 400 credits/day
- Hiring bonus = 12,000 credits
- Monthly cost = 12,000 credits
- Severance if fired = 5,600 credits

### Crew Bonuses

Crew provides skill bonuses to ship:
- Pilot → Maneuverability bonus
- Engineer → Repair speed, system efficiency
- Gunner → Weapon accuracy, damage
- Navigator → Jump range, fuel efficiency

### Integration

```typescript
// View available crew at station
const availableCrew = player.getAvailableCrewForHire(5);

availableCrew.forEach(crew => {
  console.log(`${crew.name} (${crew.role}) - ${crew.salary} credits/day`);
  console.log(`Skills: Engineering ${crew.skills.engineering}, Weapons ${crew.skills.weapons}`);
  console.log(`Traits: ${crew.traits.join(', ')}`);
});

// Hire crew
const result = player.hireCrew(crewMember);
if (result.success) {
  console.log(result.message); // "Alex Chen hired as ENGINEER. Hiring bonus: 12000 credits"
}

// View current crew
const crew = player.getCrew();
console.log(player.getCrewStatus());

// Get skill bonuses
const bonuses = player.getCrewSkillBonuses();
console.log(`Engineering bonus: +${bonuses.engineering}%`);

// Pay salaries (call daily)
const salaryResult = player.payCrewSalaries();
console.log(salaryResult.message); // "Paid 1200 credits in salaries. Remaining: 48800"

// Fire crew
player.fireCrew(crewId);
```

---

## 6. Research & Ship Upgrades ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:1149-1173` - Player methods
- `universe-system/src/PlayerSystemsIntegration.ts:163-252` - Research logic
- `universe-system/src/ResearchSystem.ts` - Research tree (already existed)

### What Players Can Do

**Research Projects:**
- View available research at stations
- Start research (costs credits + time)
- Track research progress
- Unlock ship upgrades and capabilities

**Research Categories:**
- **Weapons:** Better guns, missiles, targeting systems
- **Shields:** Stronger shields, faster recharge
- **Engines:** Better thrust, fuel efficiency
- **Systems:** Improved sensors, life support, cargo
- **Special:** Cloaking, jump drives, experimental tech

### Research Mechanics

**Requirements:**
- **Credits:** Upfront research cost (varies by project)
- **Time:** Research takes X days to complete (real-time or accelerated)
- **Prerequisites:** Some research requires earlier research completion
- **Station Access:** Can only start research while docked

**Progress:**
- Auto-progresses based on time
- Research points accumulated
- Can only have 1 active research at a time
- Completion grants permanent upgrade

### Research Tree Example

```
Basic Weapons (5,000 credits, 3 days)
  ↓
Advanced Targeting (10,000 credits, 5 days)
  ↓
Railgun Mk2 (25,000 credits, 7 days)
```

### Integration

```typescript
// View available research
const projects = player.getAvailableResearch();

projects.forEach(project => {
  console.log(`${project.name} - ${project.cost} credits, ${project.timeRequired} days`);
  console.log(`Description: ${project.description}`);
  if (project.requires) {
    console.log(`Requires: ${project.requires.join(', ')}`);
  }
});

// Start research
const result = player.startResearch(projectId);
if (result.success) {
  console.log(result.message); // "Started research: Advanced Targeting System"
}

// Check active research
const active = player.getActiveResearch();
if (active) {
  console.log(`Researching: ${active.name}`);
  console.log(`Progress: ${(active.progress * 100).toFixed(1)}%`);
  const remaining = active.timeRequired * (1 - active.progress);
  console.log(`Time remaining: ${remaining.toFixed(1)} days`);
}

// Check completed research
const completed = player.getCompletedResearch();
console.log('Unlocked technologies:', completed);

// Check if specific tech is researched
if (player.hasResearched('advanced_shields')) {
  // Player has advanced shields unlocked
}
```

---

## 7. Intelligence & Information System ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:1175-1199` - Player methods
- `universe-system/src/PlayerSystemsIntegration.ts:254-333` - Intel logic

### What Players Can Do

**Gather Intelligence:**
- Read news at stations (free)
- Buy intel from NPCs (costs credits)
- Sell gathered intel (earn credits)
- Intel degrades in value over time

**Intel Types:**
- **TRADE_ROUTE:** Profitable trade routes and price data
- **PIRATE_ACTIVITY:** Pirate locations and threat levels
- **FACTION_MOVEMENT:** Military buildups, fleet movements
- **COMMODITY_PRICE:** Supply shortages, price predictions
- **RUMOR:** Unverified information (lower reliability)

### Intel Attributes

**Each intel piece has:**
- **Content:** The actual information
- **Location:** Where it's relevant
- **Value:** How much it can be sold for (500-2000 credits)
- **Reliability:** Accuracy rating (0-1)
  - News articles: 0.8 (reliable)
  - NPC rumors: 0.5-0.9 (varies)
  - Black market: 0.3-0.7 (sketchy)
- **Timestamp:** When gathered (affects value)

### Value Degradation

Intel loses value over time:
- Fresh (0-1 hour): 100% value
- Moderate (1-5 hours): 70-90% value
- Old (5-10 hours): 40-60% value
- Stale (10+ hours): 20% value minimum

### Intel Economy

**Buying:**
- From NPCs during interactions
- From info brokers at stations
- Costs vary by intel quality

**Selling:**
- To factions (intel on their enemies)
- To traders (market intelligence)
- To news networks (breaking stories)

### Integration

```typescript
// Gather intel from news
const newsIntel = player.gatherIntelFromNews();
console.log(`Gathered ${newsIntel.length} intelligence reports from recent news`);

// View all intel
const allIntel = player.getAllIntel();
allIntel.forEach(intel => {
  console.log(`[${intel.type}] ${intel.content}`);
  console.log(`  Value: ${intel.value} credits, Reliability: ${(intel.reliability * 100).toFixed(0)}%`);
});

// Buy intel from NPC or broker
const buyResult = player.buyIntel(intelId);
if (buyResult.success) {
  console.log(`Acquired: ${buyResult.intel.content}`);
  console.log(`Cost: ${buyResult.cost} credits`);
}

// Sell intel
const sellResult = player.sellIntel(intelId);
if (sellResult.success) {
  console.log(`Intel sold for ${sellResult.payment} credits`);
}

// Example intel usage:
// "Profitable trade route: Medical Supplies from Sol to Alpha Centauri (240% margin)"
// "Pirate activity reported in Sector 7, avoid if carrying valuable cargo"
// "War brewing between Trade Federation and Mining Consortium - weapons prices rising"
```

---

## 8. Cargo Scanning & Smuggling ✅

**Status:** COMPLETE
**Files:**
- `universe-system/src/PlayerShipIntegration.ts:1201-1241` - Player methods
- `universe-system/src/PlayerSystemsIntegration.ts:335-446` - Smuggling logic

### What Players Can Do

**Smuggling:**
- Carry contraband cargo
- Sell on black market for 1.5-3x normal price
- Risk getting scanned at stations
- Bribe officials to skip scans

**Contraband Types:**
- Illegal weapons
- Narcotics
- Stolen goods
- Military tech
- Restricted AI cores
- Each item is illegal in specific factions

### Cargo Scanning

**When Docked:**
- Chance of cargo scan (varies by station)
- Higher for military/authority stations
- Lower for pirate/fringe stations

**Scan Results:**
- Clean: "Cargo clear. Welcome aboard."
- Contraband Found:
  - Fine = 2x value of contraband
  - Contraband confiscated
  - Reputation loss (-20 to -40)
  - Bounty added

### Smuggling Mechanics

**Avoiding Detection:**
- Bribe officials (70% success rate, 500-1500 credits)
- High reputation (scans less thorough)
- Use "hidden cargo" upgrades (from research)
- Dock at pirate stations (no scans)

**Black Market:**
- Sell contraband for premium prices
- Available at pirate stations, fringe systems
- No questions asked
- No reputation penalty

### Risk vs Reward

**Example Smuggling Run:**
- Buy: 100 units illegal weapons at 50 cr/unit = 5,000 credits
- Sell: 100 units on black market at 150 cr/unit = 15,000 credits
- Profit: 10,000 credits (200% margin)

**Risks:**
- 30% chance of scan at authority station
- If caught: 10,000 credit fine, contraband lost, bounty added
- If escaped: 10,000 credit profit

### Integration

```typescript
// Add contraband to cargo
const contraband = {
  commodity: 'Illegal Weapons',
  quantity: 100,
  illegalIn: ['Trade Federation', 'Alliance', 'Corporate'],
  baseValue: 50,
  blackMarketMultiplier: 3.0
};

player.addContraband(contraband);

// Check if carrying contraband for a faction
const hasIllegalGoods = player.hasContrabandFor('Trade Federation');
if (hasIllegalGoods) {
  console.log('WARNING: Carrying contraband illegal in this jurisdiction');
}

// Station performs scan (automatic on docking)
const scanResult = player.performCargoScan(stationFaction);
if (scanResult.contraband.length > 0) {
  console.log(`SCAN ALERT: ${scanResult.contraband.length} illegal items detected`);
  console.log(`Total value: ${scanResult.totalValue} credits`);
  console.log(`Fine: ${scanResult.fine} credits`);

  // Confiscate
  const confiscated = player.confiscateContraband(stationFaction);
  console.log(`Confiscated ${confiscated.confiscated.length} items worth ${confiscated.value} credits`);
}

// Bribe official to avoid scan
const bribeResult = player.bribeOfficial();
if (bribeResult.success) {
  console.log(bribeResult.message); // "Official accepts bribe. Scan waived."
} else {
  console.log(bribeResult.message); // "Official rejects bribe and reports you!"
  // Bounty added, reputation loss
}

// Sell contraband on black market (at pirate station)
const sellResult = player.sellContrabandOnBlackMarket('Illegal Weapons');
if (sellResult.success) {
  console.log(`Sold contraband for ${sellResult.payment} credits`);
}

// View all contraband in cargo
const allContraband = player.getContraband();
allContraband.forEach(item => {
  console.log(`${item.quantity}x ${item.commodity} - Black market value: ${item.baseValue * item.quantity * item.blackMarketMultiplier} credits`);
  console.log(`Illegal in: ${item.illegalIn.join(', ')}`);
});
```

---

## Complete Player Interaction API

Here's a complete reference of all player interaction methods:

### Combat
```typescript
player.targetNearestHostile()
player.cycleTargets()
player.targetSpecific(targetId)
player.firePrimaryWeapon()
player.fireSecondaryWeapon()
player.toggleWeapons()
player.toggleShields()
player.toggleEvasion()
player.getCombatState()
player.getCombatStatus()
player.getTargetableShips()
```

### Missions
```typescript
player.getAvailableMissions()
player.acceptMission(missionId)
player.getActiveMissions()
player.completeMission(missionId)
player.abandonMission(missionId)
player.getMissionSummary()
```

### NPC Interaction
```typescript
player.getNearbyNPCs()
player.hailNPC(npcId)
player.interactWithNPC(npcId, option)
player.endNPCConversation(npcId)
```

### Reputation
```typescript
player.getReputationWith(faction)
player.getReputationStanding(faction)
player.getAllReputations()
player.modifyReputation(faction, change, reason)
player.canDockAt(station)
player.getReputationSummary()
player.addBounty(amount, faction, reason)
player.clearBounty(faction)
```

### Crew
```typescript
player.getAvailableCrewForHire(count)
player.hireCrew(crewMember)
player.fireCrew(crewId)
player.getCrew()
player.getCrewStatus()
player.payCrewSalaries()
player.getCrewSkillBonuses()
```

### Research
```typescript
player.getAvailableResearch()
player.startResearch(projectId)
player.getActiveResearch()
player.getCompletedResearch()
player.hasResearched(projectId)
```

### Intelligence
```typescript
player.gatherIntelFromNews()
player.buyIntel(intelId)
player.sellIntel(intelId)
player.getAllIntel()
```

### Smuggling
```typescript
player.addContraband(item)
player.hasContrabandFor(faction)
player.performCargoScan(faction)
player.confiscateContraband(faction)
player.sellContrabandOnBlackMarket(commodity)
player.getContraband()
player.bribeOfficial()
```

---

## Example Gameplay Loop

```typescript
// === DOCKING AND STATION ACTIVITIES ===

// Approach station
console.log(player.getStatusString());

// Request docking
const dockResult = await player.requestDocking();
if (!dockResult.success) {
  console.log(dockResult.message); // Could be denied due to reputation
} else {
  console.log(`Docked at ${dockResult.station.name}. Fee: ${dockResult.fee} credits`);

  // === AT STATION ===

  // Check available missions
  const missions = player.getAvailableMissions();
  player.acceptMission(missions[0].id);

  // Hire crew
  const crew = player.getAvailableCrewForHire(5);
  player.hireCrew(crew[0]); // Hire best engineer

  // Start research
  const research = player.getAvailableResearch();
  player.startResearch(research[0].id);

  // Gather intel
  const intel = player.gatherIntelFromNews();

  // Refuel and repair
  player.refuel('HYDROGEN', 1000);
  player.repair('HULL');

  // Undock
  player.undock();
}

// === IN SPACE ===

// Combat encounter
const npcs = player.getNearbyNPCs();
const hostile = npcs.find(npc => npc.hostile);

if (hostile) {
  player.targetSpecific(hostile.id);
  player.toggleWeapons(); // Arm weapons
  player.firePrimaryWeapon();
}

// Non-hostile encounter - hail and interact
const trader = npcs.find(npc => npc.type === 'TRADER');
if (trader) {
  const hail = player.hailNPC(trader.id);
  console.log(hail.response);

  const interaction = player.interactWithNPC(trader.id, 'REQUEST_TRADE');
  console.log(interaction.message);
}

// === MISSION COMPLETION ===

// Mission objective complete
player.completeMission(missionId);

// === SMUGGLING RUN ===

// Pick up contraband
player.addContraband({
  commodity: 'Illegal Narcotics',
  quantity: 50,
  illegalIn: ['Alliance', 'Corporate'],
  baseValue: 100,
  blackMarketMultiplier: 2.5
});

// Try to dock at pirate station (no scan)
await player.requestDocking();

// Sell contraband
player.sellContrabandOnBlackMarket('Illegal Narcotics');

// === REPUTATION MANAGEMENT ===

console.log(player.getReputationSummary());

// Clear bounty if needed
if (player.getState().bounty > 0) {
  player.clearBounty('Trade Federation');
}
```

---

## Summary

All 8 core features are now implemented and integrated:

1. ✅ **Combat** - Full weapon controls, targeting, tactical systems
2. ✅ **Missions** - Accept, track, complete missions with rewards
3. ✅ **NPC Interaction** - Hail ships, menu-driven interactions
4. ✅ **Reputation** - Faction standings with consequences
5. ✅ **Crew** - Hire/fire crew, skill bonuses, salaries
6. ✅ **Research** - Unlock ship upgrades over time
7. ✅ **Intel** - Gather, buy, sell intelligence
8. ✅ **Smuggling** - Contraband trading, scans, bribes

The player now has meaningful agency in the universe and can:
- Fight other ships
- Accept and complete missions for rewards
- Interact with NPCs through dialogue
- Build reputation with factions
- Manage a crew
- Research ship upgrades
- Trade intelligence
- Smuggle contraband for profit

**Next Steps:**
- UI implementation for mission boards, crew roster, research lab
- Balancing (rewards, costs, difficulty)
- Additional mission types
- More NPC personality variation
- Expanded research tree
- Tutorial/onboarding for new players
