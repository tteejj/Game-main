/**
 * Integration Module - Complete Universe Integration Layer
 *
 * This module provides the complete integration of:
 * - Space/Universe systems (procedural generation, physics, hazards)
 * - NPC AI with environmental awareness
 * - Faction-level strategic AI
 * - Dynamic event-driven behaviors
 *
 * Use IntegratedUniverseOrchestrator as the main entry point.
 */

// Core integration
export { UniverseContextProvider, UniverseContext, HazardInfo, POIInfo, ContextQuery } from './UniverseContextProvider';
export { UniverseAwareAI, UniverseDecisionContext, UniverseDecision, NavigationAdvice, HazardAvoidance, OpportunityAssessment } from './UniverseAwareAI';
export { FactionAI, FactionStrategy, FactionGoal, Territory, Fleet, FleetMission, StrategicAction } from './FactionAI';
export { IntegratedUniverseOrchestrator, IntegratedNPCShip, UniverseConfig } from './IntegratedUniverseOrchestrator';

// Re-export commonly used types for convenience
export { ShipType, ShipStatus } from '../npc-traffic/npc-ship';
export { PersonalityTraits } from '../entity-ai/ExtendedNPCMemory';
export { GoalType } from '../entity-ai/NPCGoalSystem';
export { ExpertiseDomain } from '../entity-ai/AdaptiveAI';
export { HazardType, HazardSeverity } from '../HazardSystem';
export { POIType } from '../poi';
export { DiplomaticStatus } from '../faction-dynamics/FactionDiplomacyEngine';

/**
 * Quick Start Example:
 *
 * ```typescript
 * import { StarSystem } from './StarSystem';
 * import { UniverseOrchestrator } from './UniverseOrchestrator';
 * import { IntegratedUniverseOrchestrator, FactionStrategy } from './integration';
 * import { NPCShip, ShipType } from './npc-traffic';
 *
 * // 1. Create star system
 * const starSystem = new StarSystem('sol', 'Solar System', {
 *   civilizationLevel: 8,
 *   allowHazards: true,
 *   allowStations: true
 * });
 *
 * // 2. Create orchestrators
 * const baseOrchestrator = new UniverseOrchestrator();
 * const integrated = new IntegratedUniverseOrchestrator(
 *   starSystem,
 *   baseOrchestrator
 * );
 *
 * // 3. Register factions
 * integrated.registerFaction('earth-gov', FactionStrategy.DIPLOMATIC);
 *
 * // 4. Create NPCs
 * const ship = new NPCShip('merchant-1', 'Trader', ShipType.CARGO_FREIGHTER);
 * integrated.registerIntegratedNPC(ship, {
 *   greed: 0.8,
 *   caution: 0.7,
 *   curiosity: 0.5
 * }, 'earth-gov');
 *
 * // 5. Run simulation
 * setInterval(() => {
 *   integrated.update(1.0); // 1 second per update
 * }, 1000);
 * ```
 */
