/**
 * Universe System
 * Complete procedural universe generation system for space games
 */

// Core celestial bodies
export {
  Vector3,
  OrbitalElements,
  PhysicalProperties,
  VisualProperties,
  RingSystem,
  CelestialBodyType,
  PlanetClass,
  StarClass,
  CelestialBody,
  Star,
  Planet,
  Moon,
  Asteroid
} from './CelestialBody';

// Planet generation
export {
  PlanetGenerator,
  PlanetGenerationConfig,
  MoonGenerationConfig
} from './PlanetGenerator';

// Space stations
export {
  StationType,
  StationFaction,
  StationServices,
  DockingPort,
  StationEconomy,
  SpaceStation,
  StationGenerator
} from './StationGenerator';

// Environmental hazards
export {
  HazardType,
  HazardSeverity,
  HazardEffect,
  HazardZone,
  Hazard,
  SolarStorm,
  RadiationBelt,
  DebrisField,
  IonStorm,
  HazardSystem
} from './HazardSystem';

// Star systems
export {
  StarSystemConfig,
  StarSystemData,
  StarSystem,
  generateStarSystem
} from './StarSystem';

// Universe designer and manager
export {
  JumpRoute,
  GameState,
  Mission,
  UniverseDesigner,
  createUniverse
} from './UniverseDesigner';

// Atmospheric Physics
export {
  AtmosphericLayer,
  AtmosphericProfile,
  AtmosphericPhysics
} from './AtmosphericPhysics';

// Radiation Physics
export {
  RadiationDose,
  RadiationEnvironment,
  RadiationType,
  RadiationPhysics,
  RadiationTracker
} from './RadiationPhysics';

// Thermal Balance
export {
  ThermalEnvironment,
  SurfaceEnergyBalance,
  ThermalBalance
} from './ThermalBalance';

// Habitability Analysis
export {
  HabitabilityScore,
  BiosphereCapability,
  HabitabilityAnalysis
} from './HabitabilityAnalysis';

// Economy System
export {
  Commodity,
  MarketData,
  TradeRoute,
  EconomicZone,
  COMMODITIES,
  EconomySystem
} from './EconomySystem';

// NPC Ship AI
export {
  ShipType,
  ShipState,
  ShipCargo,
  ShipStats,
  NPCShip,
  ShipPersonality,
  ShipMemory,
  NavigationPath,
  NPCShipAI
} from './NPCShipAI';

// Traffic Control
export {
  SpaceLane,
  TrafficZone,
  DockingQueue,
  TrafficWarning,
  CollisionPrediction,
  TrafficControl
} from './TrafficControl';

// Faction System
export {
  Faction,
  GovernmentType,
  Ideology,
  Territory,
  DiplomaticRelation,
  DiplomaticState,
  Treaty,
  TreatyType,
  DiplomaticEvent,
  EventType as FactionEventType,
  Reputation,
  ReputationRank,
  ReputationAction,
  ActionType,
  Conflict,
  FactionSystem
} from './FactionSystem';

// Weather System
export {
  WeatherPattern,
  WeatherType,
  Storm,
  StormType,
  WindPattern,
  PrecipitationEvent,
  ClimateZone,
  WeatherSystem
} from './WeatherSystem';

// Geological Activity
export {
  TectonicPlate,
  PlateType,
  PlateBoundary,
  BoundaryType,
  Volcano,
  VolcanoType,
  VolcanoActivity,
  MagmaType,
  Eruption,
  Earthquake,
  HotSpot,
  GeothermalVent,
  GeologicalActivity
} from './GeologicalActivity';

// Sensor System
export {
  SensorSuite,
  RadarSensor,
  InfraredSensor,
  OpticalSensor,
  GraviticSensor,
  NeutrinoSensor,
  DetectedObject,
  Signature,
  ScanResult,
  SensorSystem
} from './SensorSystem';

// Communication System
export {
  Message,
  MessagePriority,
  CommunicationDevice,
  SignalRelay,
  BroadcastMessage,
  DataPacket,
  CommunicationSystem
} from './CommunicationSystem';

// Propulsion System
export {
  FuelType,
  FUEL_TYPES,
  PropulsionEngine,
  EngineType,
  FuelTank,
  Maneuver,
  ManeuverType,
  TransferOrbit,
  PropulsionSystem
} from './PropulsionSystem';

// Life Support System
export {
  CrewMember,
  CrewRole,
  CrewStatus,
  AtmosphereComposition,
  OxygenGenerator,
  CO2Scrubber,
  TemperatureControl,
  WaterSystem,
  FoodSupply,
  WasteManagement,
  MedicalBay,
  LifeSupportAlert,
  LifeSupportSystem
} from './LifeSupportSystem';

// Dynamic Event System
export {
  GameEvent,
  EventCategory,
  EventSeverity,
  EventChoice,
  EventConsequence,
  EventOutcome,
  EventRewards,
  DerelictShip as DynamicDerelictShip,
  Anomaly,
  AnomalyType,
  AnomalyEffect,
  DynamicEventSystem
} from './DynamicEventSystem';

// Universe State Manager
export {
  PlayerShip,
  UniverseConfig as StateManagerUniverseConfig,
  UniverseState,
  UniverseStateManager
} from './UniverseStateManager';

// NPC Ship Types
export {
  ShipClass,
  ShipSpecification,
  SHIP_SPECS,
  getShipSpec,
  getCivilianShips,
  getCombatShips,
  getSpecializedShips,
  getShipsByPriceRange,
  getShipsByFaction
} from './NPCShipTypes';

// Planetary Cities
export {
  SettlementType,
  CityTechLevel,
  CityEnvironment,
  CityServices,
  CityEconomy,
  CityInfrastructure,
  CityDefense,
  CityPolitics,
  PointOfInterest,
  PlanetaryCity,
  CityDistrict,
  CityGenerator,
  FAMOUS_CITIES
} from './PlanetaryCities';

// Station Variants
export {
  StationVariant,
  STATION_VARIANTS,
  getStationVariant,
  getVariantsByType,
  getRandomVariant,
  getLegendaryStations,
  getFrontierStations,
  getPeacefulStations
} from './StationVariants';

// Examples
export {
  createSandboxUniverse,
  createOpenWorldUniverse,
  createCampaignUniverse,
  createSolSystem,
  createFrontierSystem,
  createCoreWorldSystem,
  demoUniversePlaythrough,
  demoCustomSystem,
  demoStationTrading
} from './examples';

// ====================================================================
// LIVING UNIVERSE SYSTEMS - Phases 1-4
// ====================================================================

// Phase 1: Core Simulation
export {
  UniverseSimulationController,
  SimulationConfig,
  SimulationState,
  UniverseState as SimulationUniverseState,
  SystemActivity
} from './simulation/UniverseSimulationController';

export {
  HistoricalMemorySystem,
  HistoricalEvent,
  HistoricalQuery,
  EntityMemory,
  RelationshipMemory,
  EventCategory as HistoricalEventCategory,
  EventType as HistoricalEventType,
  Chronicle as HistoricalChronicle
} from './simulation/HistoricalMemorySystem';

export {
  ConsequenceEngine,
  Consequence,
  ConsequenceImpact,
  ConsequenceRule,
  ConsequenceContext
} from './simulation/ConsequenceEngine';

// Phase 2: Entity AI
export {
  ExtendedNPCMemory,
  Experience,
  ExperienceType,
  Lesson,
  BehaviorModification,
  PersonalityTraits,
  DetailedRelationship,
  TraumaMemory,
  TriggerPattern,
  Achievement,
  AchievementType,
  Reputation as EntityReputation,
  Biography,
  CareerMilestone
} from './entity-ai/ExtendedNPCMemory';

export {
  NPCGoalSystem,
  NPCGoal,
  GoalType,
  GoalCategory,
  GoalStatus,
  SubGoal,
  GoalMotivation,
  ExpectedReward,
  ResourceRequirement,
  ActionPlan,
  PlannedAction,
  ActionType,
  GoalEvaluationContext
} from './entity-ai/NPCGoalSystem';

export {
  AdaptiveAI,
  LearningEvent,
  Strategy,
  Expertise,
  ExpertiseDomain,
  Skill,
  Milestone,
  DecisionContext,
  Decision
} from './entity-ai/AdaptiveAI';

// Phase 3: Faction Dynamics
export {
  FactionDiplomacyEngine,
  FactionRelationship,
  DiplomaticStatus,
  DiplomaticEvent as FactionDiplomaticEvent,
  WarRecord,
  WarPhase,
  Treaty as DiplomaticTreaty,
  TreatyType as DiplomaticTreatyType,
  AllianceRecord,
  DiplomaticAction,
  RelationshipChange
} from './faction-dynamics/FactionDiplomacyEngine';

export {
  FactionEconomicNeeds,
  FactionEconomicState,
  ResourceNeed,
  SupplyChain,
  CriticalShortage,
  EconomicAction,
  EconomicThreat,
  TradeAgreement
} from './faction-dynamics/FactionEconomicNeeds';

// Phase 4: Storytelling Systems
export {
  NewsGenerationEngine,
  NewsArticle,
  NewsBias,
  NewsTemplate,
  NewsImportance,
  ArticleSection
} from './storytelling/NewsGenerationEngine';

export {
  RumorPropagationSystem,
  Rumor,
  RumorNode,
  DistortionType,
  PropagationResult
} from './storytelling/RumorPropagationSystem';

export {
  AbsenceSimulator,
  AbsenceSummary,
  CrisisReport,
  WarUpdate,
  EconomicChange,
  DiplomaticChange,
  PersonalImpact,
  UniverseStateSnapshot
} from './storytelling/AbsenceSimulator';

export {
  ChronicleGenerator,
  Chronicle,
  ChronicleType,
  Legend,
  LegendCategory,
  LegendVariant,
  Prophecy,
  FactionHistory,
  Era
} from './storytelling/ChronicleGenerator';

// Universal Orchestrator - Integration Layer
export {
  UniverseOrchestrator,
  OrchestratorConfig,
  UniverseState as OrchestratorUniverseState,
  EntityRegistration,
  FactionRegistration
} from './UniverseOrchestrator';
