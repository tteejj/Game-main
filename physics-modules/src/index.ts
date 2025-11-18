/**
 * Moon Lander Physics - Complete Physical World
 *
 * Exports all physics systems for integration
 */

// Shared types
export * from './types';

// Export individual physics modules
export { TerrainSystem } from './terrain-system';
export { LandingGear } from './landing-gear';
export { OrbitalBody, OrbitalBodiesManager, createDefaultSatellite } from './orbital-bodies';
export { EnvironmentSystem } from './environment';
export { WaypointManager, createPracticeWaypoints } from './waypoints';

// Export satellite system (comprehensive satellite modeling)
export {
  Satellite,
  SatelliteManager,
  SatelliteFactory,
  SatelliteType,
  SatelliteMissionStatus,
  SatellitePowerSystem,
  SatelliteThermalSystem,
  SatelliteAttitudeControl,
  SatelliteCommunications,
  SatelliteSensorSystem
} from './satellite';
export type {
  SatelliteConfig,
  SatelliteLayout,
  SolarPanel,
  SatelliteBattery,
  PowerBus,
  ThermalComponent,
  Radiator,
  ReactionWheel,
  Magnetorquer,
  AttitudeThuster,
  Transponder,
  Antenna,
  SatelliteSensor
} from './satellite';

// Export integrated game systems
export { GameWorld } from './game-world';
export { GameSpacecraft } from './game-spacecraft';

// Export simple game systems (standalone, no external dependencies)
export { SimpleWorld } from './simple-world';
export { SimpleSpacecraft } from './simple-spacecraft';

// ========== ADVANCED PHYSICS MODULES ==========

// Atmospheric physics (drag, reentry, heating)
export {
  AtmospherePhysics,
  calculateAngleOfAttack
} from './atmosphere';
export type {
  AtmosphereConfig,
  VehicleAeroConfig,
  AtmosphericForces
} from './atmosphere';

// Advanced gravity effects (gradient torque, tidal forces, solar pressure, J2)
export {
  AdvancedGravityPhysics
} from './advanced-gravity';
export type {
  GravityGradientResult,
  TidalForceResult,
  SolarRadiationResult,
  J2PerturbationResult
} from './advanced-gravity';

// Propellant slosh dynamics
export {
  PropellantSloshPhysics,
  calculateOptimalBaffles
} from './propellant-slosh';
export type {
  PropellantTank,
  SloshState,
  SloshForces
} from './propellant-slosh';

// Enhanced collision physics (realistic impulses, debris generation)
export {
  EnhancedCollisionPhysics
} from './enhanced-collision';
export type {
  CollisionBody,
  CollisionPoint,
  CollisionResult,
  DebrisParticle
} from './enhanced-collision';

// Patched conics navigation (multi-body transfers, SOI, gravity assists)
export {
  PatchedConicsNavigator,
  createSolarSystemNavigator
} from './patched-conics';
export type {
  CelestialBody,
  OrbitalElements,
  TrajectorySegment,
  TransferPlan,
  TransferManeuver,
  SOITransition
} from './patched-conics';

// Unified physics engine (integrates all advanced systems)
export {
  UnifiedPhysicsEngine,
  createEarthMoonPhysics,
  createMoonPhysics,
  createMarsPhysics
} from './unified-physics-engine';
export type {
  PhysicsConfig,
  VehicleState,
  PhysicsForces
} from './unified-physics-engine';
