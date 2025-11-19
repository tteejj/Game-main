/**
 * SaveFileFormat.ts
 * Type definitions for Phase 3 save file format
 * Supports versioning, validation, and compression
 */

import { CommodityType } from './economy/commodity';
import { OreType } from './MiningSystem';
import { StationFaction } from './StationGenerator';
import { ConstructionProjectType } from './ConstructionSystem';
import { FacilityType } from './ManufacturingSystem';
import { TechCategory } from './ResearchSystem';
import { SkillCategory, AgeGroup, MigrationReason, UnrestType } from './PopulationSystem';
import { SiegeStatus, SiegeOutcome, OccupationStatus } from './ConquestSystem';
import { RelationshipType, ChainType } from './ChronicleSystem';

// ====================================================================
// VERSION CONTROL
// ====================================================================

export const SAVE_FILE_VERSION = '1.0.0';
export const MIN_COMPATIBLE_VERSION = '1.0.0';

// ====================================================================
// MAIN SAVE FILE STRUCTURE
// ====================================================================

export interface UniverseSaveFile {
  // Metadata
  version: string;
  timestamp: number;
  gameTime: number;

  // Compression settings
  compressed: boolean;
  compressionAlgorithm?: 'gzip' | 'lz4';

  // System states
  systems: SystemStates;

  // Checksums for validation
  checksums: {
    construction: string;
    manufacturing: string;
    research: string;
    population: string;
    conquest: string;
    chronicle: string;
  };
}

export interface SystemStates {
  construction: ConstructionSystemState;
  manufacturing: ManufacturingSystemState;
  research: ResearchSystemState;
  population: PopulationSystemState;
  conquest: ConquestSystemState;
  chronicle: ChronicleSystemState;
}

// ====================================================================
// CONSTRUCTION SYSTEM STATE
// ====================================================================

export interface ConstructionSystemState {
  activeProjects: SerializedConstructionProject[];
  nextProjectId: number;
}

export interface SerializedConstructionProject {
  id: string;
  type: ConstructionProjectType;
  position: { x: number; y: number; z: number };
  costs: Array<{ commodity: CommodityType; quantity: number }>;
  buildTime: number;
  progress: number;
  startTime: number;
  owner: string;
  systemId?: string;
}

// ====================================================================
// MANUFACTURING SYSTEM STATE
// ====================================================================

export interface ManufacturingSystemState {
  facilities: SerializedManufacturingFacility[];
  jobIdCounter: number;
}

export interface SerializedManufacturingFacility {
  id: string;
  stationId: string;
  facilityType: FacilityType;
  techLevel: number;
  maxConcurrentJobs: number;
  productionRateMultiplier: number;
  activeJobs: SerializedProductionJob[];
  inventory: Array<{ commodity: CommodityType; quantity: number }>;
  efficiency: number;
  condition: number;
  powerAvailable: number;
}

export interface SerializedProductionJob {
  id: string;
  recipeId: string;
  facilityId: string;
  startTime: number;
  estimatedCompletion: number;
  progress: number;
  inputsConsumed: Array<{ commodity: CommodityType; quantity: number }>;
  outputsProduced: Array<{ commodity: CommodityType; quantity: number }>;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason?: string;
}

// ====================================================================
// RESEARCH SYSTEM STATE
// ====================================================================

export interface ResearchSystemState {
  activeProjects: SerializedResearchProject[];
  completedResearch: Array<{ factionId: string; research: SerializedCompletedResearch[] }>;
  factionResearchSpeed: Array<{ factionId: string; speed: number }>;
}

export interface SerializedResearchProject {
  techId: string;
  factionId: string;
  startTime: number;
  progress: number;
  estimatedCompletion: number;
  priority: number;
}

export interface SerializedCompletedResearch {
  techId: string;
  factionId: string;
  completionTime: number;
  bonusesApplied: SerializedTechUnlocks;
}

export interface SerializedTechUnlocks {
  weaponDamage?: number;
  weaponRange?: number;
  weaponAccuracy?: number;
  engineSpeed?: number;
  fuelEfficiency?: number;
  jumpRange?: number;
  economicOutput?: number;
  tradeBonus?: number;
  miningEfficiency?: number;
  shieldStrength?: number;
  armorRating?: number;
  hullPoints?: number;
  sensorRange?: number;
  stealthRating?: number;
  researchSpeed?: number;
  newShipTypes?: string[];
  newWeaponTypes?: string[];
  newBuildingTypes?: string[];
  specialAbilities?: string[];
}

// ====================================================================
// POPULATION SYSTEM STATE
// ====================================================================

export interface PopulationSystemState {
  citizenGroups: SerializedCitizenGroup[];
  cityPopulations: Array<{ cityId: string; groupIds: string[] }>;
  migrationEvents: SerializedMigrationEvent[];
  unrestEvents: Array<{ cityId: string; unrest: SerializedSocialUnrest[] }>;
  laborMarkets: Array<{ cityId: string; market: SerializedLaborMarket }>;
  currentTime: number;
}

export interface SerializedCitizenGroup {
  id: string;
  cityId: string;
  count: number;
  ageGroup: AgeGroup;
  skillCategory: SkillCategory;
  happiness: number;
  health: number;
  education: number;
  wealth: number;
  needs: {
    food: number;
    water: number;
    shelter: number;
    healthcare: number;
    entertainment: number;
    employment: number;
    safety: number;
  };
  politicalEngagement: number;
  crimePropensity: number;
  migrationDesire: number;
}

export interface SerializedMigrationEvent {
  fromCityId: string;
  toCityId: string;
  citizenGroupId: string;
  count: number;
  reason: MigrationReason;
  timestamp: number;
}

export interface SerializedSocialUnrest {
  cityId: string;
  severity: number;
  type: UnrestType;
  participants: number;
  demands: string[];
  startTime: number;
  duration: number;
  economicImpact: number;
}

export interface SerializedLaborMarket {
  totalWorkforce: number;
  employed: number;
  unemployed: number;
  unemploymentRate: number;
  laborDemand: Array<{ skill: SkillCategory; count: number }>;
  laborSupply: Array<{ skill: SkillCategory; count: number }>;
  averageWage: number;
}

// ====================================================================
// CONQUEST SYSTEM STATE
// ====================================================================

export interface ConquestSystemState {
  activeSieges: SerializedSiegeOperation[];
  occupations: SerializedOccupationState[];
  conquestHistory: SerializedConquestRecord[];
}

export interface SerializedSiegeOperation {
  id: string;
  attackerFaction: StationFaction;
  defenderFaction: StationFaction;
  targetId: string;
  targetName: string;
  targetType: 'STATION' | 'CITY';
  targetLocation: { x: number; y: number; z: number };
  attackingForce: number;
  defendingForce: number;
  baseDefenseRating: number;
  currentDefenseStrength: number;
  structuralIntegrity: number;
  siegeStarted: number;
  siegeDuration: number;
  bombardmentIntensity: number;
  civilianCasualties: number;
  populationMorale: number;
  evacuees: number;
  defenderSupplies: number;
  attackerLogistics: number;
  estimatedDaysToCapture: number;
  captureProgress: number;
  status: SiegeStatus;
  outcome?: SiegeOutcome;
  endedAt?: number;
  battleEvents: SerializedBattleEvent[];
}

export interface SerializedBattleEvent {
  timestamp: number;
  type: 'BOMBARDMENT' | 'ASSAULT' | 'SORTIE' | 'SUPPLY_DROP' | 'CIVILIAN_EXODUS';
  description: string;
  attackerLosses: number;
  defenderLosses: number;
  civilianCasualties: number;
  impactOnProgress: number;
}

export interface SerializedOccupationState {
  id: string;
  territoryId: string;
  territoryName: string;
  territoryType: 'STATION' | 'CITY';
  originalOwner: StationFaction;
  occupier: StationFaction;
  garrisonSize: number;
  requiredGarrison: number;
  garrisonStrength: number;
  population: number;
  resistanceLevel: number;
  collaborationLevel: number;
  loyaltyToOccupier: number;
  controlLevel: number;
  stabilityIndex: number;
  resourceExtraction: number;
  occupationCost: number;
  economicProductivity: number;
  occupationStarted: number;
  daysSinceOccupation: number;
  insurgentAttacks: number;
  lastAttackTimestamp: number;
  insurgentStrength: number;
  pacificationLevel: number;
  heartsAndMinds: number;
  represionLevel: number;
  liberationAttempts: number;
  liberationProgress: number;
  status: OccupationStatus;
}

export interface SerializedConquestRecord {
  timestamp: number;
  type: 'SIEGE_STARTED' | 'SIEGE_LIFTED' | 'TERRITORY_CAPTURED' | 'LIBERATION';
  attacker: StationFaction;
  defender: StationFaction;
  target: string;
  outcome: SiegeOutcome;
  duration: number;
  consequences?: SerializedConquestConsequences;
}

export interface SerializedConquestConsequences {
  territoryTransferred: boolean;
  newOwner: StationFaction;
  oldOwner: StationFaction;
  militaryCasualties: Array<{ faction: StationFaction; casualties: number }>;
  civilianCasualties: number;
  infrastructureDamage: number;
  economicLoss: number;
  productionLoss: number;
  refugees: number;
  populationLoss: number;
  populationMoraleChange: number;
  reputationChange: Array<{ faction: StationFaction; change: number }>;
  warCrimesCommitted: boolean;
  strategicValue: number;
  borderChange: boolean;
  controllingPower: StationFaction;
}

// ====================================================================
// CHRONICLE SYSTEM STATE
// ====================================================================

export interface ChronicleSystemState {
  eventRelationships: Array<{ eventId: string; relationships: SerializedEventRelationship[] }>;
  chronicles: SerializedChronicle[];
  factionChronicles: Array<{ factionId: string; chronicleIds: string[] }>;
  significantEventsCache: SerializedHistoricalEvent[];
  lastCacheUpdate: number;
  queryCount: number;
  totalQueryTime: number;
}

export interface SerializedEventRelationship {
  eventId1: string;
  eventId2: string;
  relationshipType: RelationshipType;
  strength: number;
  description?: string;
}

export interface SerializedChronicle {
  id: string;
  title: string;
  timespan: { start: number; end: number };
  eventIds: string[];
  narrative: string;
  keyFigures: string[];
  majorConsequences: string[];
  turningPoints: SerializedTurningPoint[];
  factionId?: string;
  tags: string[];
  significance: number;
}

export interface SerializedTurningPoint {
  eventId: string;
  timestamp: number;
  description: string;
  impactScore: number;
  beforeState: string;
  afterState: string;
}

export interface SerializedHistoricalEvent {
  id: string;
  timestamp: number;
  type: string;
  severity: number;
  category: string;
  location: { x: number; y: number; z: number };
  systemId?: string;
  participants: string[];
  description: string;
  data?: any;
  consequences: string[];
  witnessed: boolean;
  priority: number;
  tags?: string[];
  actors: string[];
  outcome: string;
  significance: number;
  relatedEvents: string[];
}

// ====================================================================
// VALIDATION & MIGRATION
// ====================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changes: string[];
  errors: string[];
}

// ====================================================================
// COMPRESSION SETTINGS
// ====================================================================

export interface CompressionSettings {
  enabled: boolean;
  algorithm: 'gzip' | 'lz4';
  level: number;
  threshold: number; // Minimum file size in bytes to compress
}

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  enabled: true,
  algorithm: 'gzip',
  level: 6,
  threshold: 10240 // 10KB
};

// ====================================================================
// UTILITY TYPES
// ====================================================================

export interface SaveMetadata {
  version: string;
  timestamp: number;
  gameTime: number;
  systemCount: number;
  eventCount: number;
  compressed: boolean;
  fileSize: number;
}

export interface SaveLoadOptions {
  validate: boolean;
  autoMigrate: boolean;
  compression: CompressionSettings;
  backup: boolean;
  backupPath?: string;
}

export const DEFAULT_SAVE_LOAD_OPTIONS: SaveLoadOptions = {
  validate: true,
  autoMigrate: true,
  compression: DEFAULT_COMPRESSION_SETTINGS,
  backup: true
};
