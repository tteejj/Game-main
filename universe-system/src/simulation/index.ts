/**
 * Living Universe Simulation System
 *
 * Phase 1: Critical Foundation
 * - UniverseSimulationController: Macro/Meso/Micro tick system
 * - HistoricalMemorySystem: Event logging and entity memory
 * - ConsequenceEngine: Cascading consequence processing
 */

export { UniverseSimulationController, SimulationConfig, UniverseState } from './UniverseSimulationController';
export {
  HistoricalMemorySystem,
  HistoricalEvent,
  EventType,
  EventCategory,
  EntityMemory,
  Relationship,
  TraumaRecord,
  Achievement,
  LearnedBehavior,
  HistoricalQuery,
  Chronicle
} from './HistoricalMemorySystem';
export {
  ConsequenceEngine,
  Consequence,
  ConsequenceType,
  ConsequenceRule,
  ConsequenceCondition,
  ConsequenceTemplate
} from './ConsequenceEngine';
