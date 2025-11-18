/**
 * npc-traffic/index.ts
 * NPC Traffic System - Exports
 */

export { VesselPhysics, VesselPhysicsState, VesselPresets } from './vessel-physics';
export { VesselNavigator, Waypoint, NavigationObstacle, NavigationResult } from './vessel-navigator';
export {
  CollisionAvoidance,
  CollisionPrediction,
  AvoidanceManeuver
} from './collision-avoidance';
export {
  SpatialHashGrid,
  TrafficManager,
  TrafficDensity,
  TrafficStatistics,
  ITrackableVessel
} from './traffic-manager';
export {
  NPCShip,
  ShipType,
  ShipStatus,
  CargoItem,
  ShipState
} from './npc-ship';
