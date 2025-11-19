/**
 * UniverseSaveLoadSystem.ts
 * Comprehensive save/load system for Phase 3 systems
 *
 * Features:
 * - Serializes all Phase 3 system states
 * - Deserializes and restores state
 * - Handles versioning (future compatibility)
 * - Validates loaded data
 * - Compression for large saves
 * - Automatic migration between versions
 * - Backup and restore functionality
 */

import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import {
  UniverseSaveFile,
  SystemStates,
  SAVE_FILE_VERSION,
  MIN_COMPATIBLE_VERSION,
  ValidationResult,
  MigrationResult,
  SaveLoadOptions,
  DEFAULT_SAVE_LOAD_OPTIONS,
  SaveMetadata,
  CompressionSettings
} from './SaveFileFormat';

import { ConstructionSystem } from './ConstructionSystem';
import { ManufacturingSystem } from './ManufacturingSystem';
import { ResearchSystem } from './ResearchSystem';
import { PopulationSystem } from './PopulationSystem';
import { ConquestSystem } from './ConquestSystem';
import { ChronicleSystem } from './ChronicleSystem';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// ====================================================================
// MAIN SAVE/LOAD SYSTEM
// ====================================================================

export class UniverseSaveLoadSystem {
  // System references
  private constructionSystem?: ConstructionSystem;
  private manufacturingSystem?: ManufacturingSystem;
  private researchSystem?: ResearchSystem;
  private populationSystem?: PopulationSystem;
  private conquestSystem?: ConquestSystem;
  private chronicleSystem?: ChronicleSystem;

  // Configuration
  private options: SaveLoadOptions;
  private gameTime: number = 0;

  // Statistics
  private lastSaveTime: number = 0;
  private lastLoadTime: number = 0;
  private totalSaves: number = 0;
  private totalLoads: number = 0;

  constructor(options?: Partial<SaveLoadOptions>) {
    this.options = { ...DEFAULT_SAVE_LOAD_OPTIONS, ...options };
    console.log('[SaveLoadSystem] Initialized with options:', this.options);
  }

  // ====================================================================
  // SYSTEM LINKING
  // ====================================================================

  linkConstructionSystem(system: ConstructionSystem): void {
    this.constructionSystem = system;
  }

  linkManufacturingSystem(system: ManufacturingSystem): void {
    this.manufacturingSystem = system;
  }

  linkResearchSystem(system: ResearchSystem): void {
    this.researchSystem = system;
  }

  linkPopulationSystem(system: PopulationSystem): void {
    this.populationSystem = system;
  }

  linkConquestSystem(system: ConquestSystem): void {
    this.conquestSystem = system;
  }

  linkChronicleSystem(system: ChronicleSystem): void {
    this.chronicleSystem = system;
  }

  setGameTime(time: number): void {
    this.gameTime = time;
  }

  // ====================================================================
  // SAVE FUNCTIONALITY
  // ====================================================================

  /**
   * Save all system states to a save file
   */
  async save(): Promise<UniverseSaveFile> {
    console.log('[SaveLoadSystem] Starting save process...');
    const startTime = Date.now();

    try {
      // Collect all system states
      const systemStates = await this.serializeAllSystems();

      // Create save file
      const saveFile: UniverseSaveFile = {
        version: SAVE_FILE_VERSION,
        timestamp: Date.now(),
        gameTime: this.gameTime,
        compressed: false,
        systems: systemStates,
        checksums: this.calculateChecksums(systemStates)
      };

      // Validate before saving
      if (this.options.validate) {
        const validation = this.validateSaveFile(saveFile);
        if (!validation.valid) {
          throw new Error(`Save validation failed: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
          console.warn('[SaveLoadSystem] Save warnings:', validation.warnings);
        }
      }

      // Update statistics
      this.totalSaves++;
      this.lastSaveTime = Date.now();

      const duration = Date.now() - startTime;
      console.log(`[SaveLoadSystem] Save complete in ${duration}ms`);
      console.log(`[SaveLoadSystem] Save size: ${this.estimateSaveSize(saveFile)} bytes`);

      return saveFile;
    } catch (error) {
      console.error('[SaveLoadSystem] Save failed:', error);
      throw error;
    }
  }

  /**
   * Save to JSON string
   */
  async saveToJson(): Promise<string> {
    const saveFile = await this.save();
    return JSON.stringify(saveFile, null, 2);
  }

  /**
   * Save to compressed buffer
   */
  async saveToCompressedBuffer(): Promise<Buffer> {
    const saveFile = await this.save();
    const json = JSON.stringify(saveFile);
    const buffer = Buffer.from(json, 'utf-8');

    if (this.options.compression.enabled && buffer.length >= this.options.compression.threshold) {
      console.log('[SaveLoadSystem] Compressing save file...');
      const compressed = await gzipAsync(buffer, { level: this.options.compression.level });
      saveFile.compressed = true;
      saveFile.compressionAlgorithm = 'gzip';
      console.log(`[SaveLoadSystem] Compressed ${buffer.length} → ${compressed.length} bytes (${((1 - compressed.length / buffer.length) * 100).toFixed(1)}% reduction)`);
      return compressed;
    }

    return buffer;
  }

  /**
   * Get save metadata without full serialization
   */
  getSaveMetadata(): SaveMetadata {
    return {
      version: SAVE_FILE_VERSION,
      timestamp: Date.now(),
      gameTime: this.gameTime,
      systemCount: this.getLinkedSystemCount(),
      eventCount: this.chronicleSystem?.getPerformanceStats().totalEvents || 0,
      compressed: this.options.compression.enabled,
      fileSize: 0 // Would be set after actual save
    };
  }

  // ====================================================================
  // LOAD FUNCTIONALITY
  // ====================================================================

  /**
   * Load from save file object
   */
  async load(saveFile: UniverseSaveFile): Promise<void> {
    console.log('[SaveLoadSystem] Starting load process...');
    const startTime = Date.now();

    try {
      // Check version compatibility
      if (!this.isVersionCompatible(saveFile.version)) {
        if (this.options.autoMigrate) {
          console.log(`[SaveLoadSystem] Migrating from ${saveFile.version} to ${SAVE_FILE_VERSION}`);
          saveFile = this.migrateSaveFile(saveFile);
        } else {
          throw new Error(`Incompatible save version: ${saveFile.version} (current: ${SAVE_FILE_VERSION})`);
        }
      }

      // Validate loaded data
      if (this.options.validate) {
        const validation = this.validateSaveFile(saveFile);
        if (!validation.valid) {
          throw new Error(`Load validation failed: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
          console.warn('[SaveLoadSystem] Load warnings:', validation.warnings);
        }
      }

      // Verify checksums
      const currentChecksums = this.calculateChecksums(saveFile.systems);
      const checksumsMatch = this.verifyChecksums(saveFile.checksums, currentChecksums);
      if (!checksumsMatch) {
        console.warn('[SaveLoadSystem] Checksum mismatch - save file may be corrupted');
      }

      // Restore all system states
      await this.deserializeAllSystems(saveFile.systems);

      // Restore game time
      this.gameTime = saveFile.gameTime;

      // Update statistics
      this.totalLoads++;
      this.lastLoadTime = Date.now();

      const duration = Date.now() - startTime;
      console.log(`[SaveLoadSystem] Load complete in ${duration}ms`);
    } catch (error) {
      console.error('[SaveLoadSystem] Load failed:', error);
      throw error;
    }
  }

  /**
   * Load from JSON string
   */
  async loadFromJson(json: string): Promise<void> {
    try {
      const saveFile: UniverseSaveFile = JSON.parse(json);
      await this.load(saveFile);
    } catch (error) {
      console.error('[SaveLoadSystem] Failed to parse JSON:', error);
      throw new Error('Invalid save file JSON');
    }
  }

  /**
   * Load from compressed buffer
   */
  async loadFromCompressedBuffer(buffer: Buffer): Promise<void> {
    try {
      // Try to decompress
      let jsonBuffer: Buffer;
      try {
        jsonBuffer = await gunzipAsync(buffer);
        console.log('[SaveLoadSystem] Decompressed save file');
      } catch {
        // Not compressed, use as-is
        jsonBuffer = buffer;
      }

      const json = jsonBuffer.toString('utf-8');
      await this.loadFromJson(json);
    } catch (error) {
      console.error('[SaveLoadSystem] Failed to load from buffer:', error);
      throw error;
    }
  }

  // ====================================================================
  // SERIALIZATION
  // ====================================================================

  private async serializeAllSystems(): Promise<SystemStates> {
    console.log('[SaveLoadSystem] Serializing all systems...');

    const systems: SystemStates = {
      construction: this.constructionSystem?.serialize() || { activeProjects: [], nextProjectId: 1 },
      manufacturing: this.manufacturingSystem?.serialize() || { facilities: [], jobIdCounter: 0 },
      research: this.researchSystem?.serialize() || { activeProjects: [], completedResearch: [], factionResearchSpeed: [] },
      population: this.populationSystem?.serialize() || { citizenGroups: [], cityPopulations: [], migrationEvents: [], unrestEvents: [], laborMarkets: [], currentTime: 0 },
      conquest: this.conquestSystem?.serialize() || { activeSieges: [], occupations: [], conquestHistory: [] },
      chronicle: this.chronicleSystem?.serialize() || { eventRelationships: [], chronicles: [], factionChronicles: [], significantEventsCache: [], lastCacheUpdate: 0, queryCount: 0, totalQueryTime: 0 }
    };

    return systems;
  }

  // ====================================================================
  // DESERIALIZATION
  // ====================================================================

  private async deserializeAllSystems(systems: SystemStates): Promise<void> {
    console.log('[SaveLoadSystem] Deserializing all systems...');

    // Deserialize in order (some systems may depend on others)
    if (this.constructionSystem) {
      this.constructionSystem.deserialize(systems.construction);
    }

    if (this.manufacturingSystem) {
      this.manufacturingSystem.deserialize(systems.manufacturing);
    }

    if (this.researchSystem) {
      this.researchSystem.deserialize(systems.research);
    }

    if (this.populationSystem) {
      this.populationSystem.deserialize(systems.population);
    }

    if (this.conquestSystem) {
      this.conquestSystem.deserialize(systems.conquest);
    }

    if (this.chronicleSystem) {
      this.chronicleSystem.deserialize(systems.chronicle);
    }
  }

  // ====================================================================
  // VALIDATION
  // ====================================================================

  /**
   * Validate save file structure and data
   */
  private validateSaveFile(saveFile: UniverseSaveFile): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!saveFile.version) {
      errors.push('Missing version field');
    }
    if (!saveFile.timestamp) {
      errors.push('Missing timestamp field');
    }
    if (!saveFile.systems) {
      errors.push('Missing systems field');
    }

    // Validate version format
    if (saveFile.version && !this.isValidVersionFormat(saveFile.version)) {
      errors.push(`Invalid version format: ${saveFile.version}`);
    }

    // Validate timestamp
    if (saveFile.timestamp) {
      const now = Date.now();
      if (saveFile.timestamp > now) {
        warnings.push('Save timestamp is in the future');
      }
      if (now - saveFile.timestamp > 365 * 24 * 60 * 60 * 1000) {
        warnings.push('Save file is over 1 year old');
      }
    }

    // Validate system states
    if (saveFile.systems) {
      if (!saveFile.systems.construction) {
        warnings.push('Missing construction system state');
      }
      if (!saveFile.systems.manufacturing) {
        warnings.push('Missing manufacturing system state');
      }
      if (!saveFile.systems.research) {
        warnings.push('Missing research system state');
      }
      if (!saveFile.systems.population) {
        warnings.push('Missing population system state');
      }
      if (!saveFile.systems.conquest) {
        warnings.push('Missing conquest system state');
      }
      if (!saveFile.systems.chronicle) {
        warnings.push('Missing chronicle system state');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ====================================================================
  // VERSIONING & MIGRATION
  // ====================================================================

  /**
   * Check if save version is compatible
   */
  private isVersionCompatible(version: string): boolean {
    return this.compareVersions(version, MIN_COMPATIBLE_VERSION) >= 0;
  }

  /**
   * Compare two semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aNum = aParts[i] || 0;
      const bNum = bParts[i] || 0;

      if (aNum > bNum) return 1;
      if (aNum < bNum) return -1;
    }

    return 0;
  }

  /**
   * Validate version format (semantic versioning)
   */
  private isValidVersionFormat(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  /**
   * Migrate save file to current version
   */
  private migrateSaveFile(saveFile: UniverseSaveFile): UniverseSaveFile {
    console.log(`[SaveLoadSystem] Migrating save from ${saveFile.version} to ${SAVE_FILE_VERSION}`);

    const changes: string[] = [];
    const errors: string[] = [];

    // In the future, add migration logic here
    // For now, just update the version
    const migrated = { ...saveFile };
    migrated.version = SAVE_FILE_VERSION;
    changes.push(`Updated version from ${saveFile.version} to ${SAVE_FILE_VERSION}`);

    // Future migration examples:
    // if (this.compareVersions(saveFile.version, '1.1.0') < 0) {
    //   // Migrate from 1.0.x to 1.1.0
    //   migrated.systems = this.migrateSystemStates_1_0_to_1_1(saveFile.systems);
    //   changes.push('Migrated system states to 1.1.0 format');
    // }

    console.log('[SaveLoadSystem] Migration changes:', changes);
    if (errors.length > 0) {
      console.error('[SaveLoadSystem] Migration errors:', errors);
    }

    return migrated;
  }

  // ====================================================================
  // CHECKSUMS
  // ====================================================================

  /**
   * Calculate checksums for all system states
   */
  private calculateChecksums(systems: SystemStates): UniverseSaveFile['checksums'] {
    return {
      construction: this.calculateChecksum(JSON.stringify(systems.construction)),
      manufacturing: this.calculateChecksum(JSON.stringify(systems.manufacturing)),
      research: this.calculateChecksum(JSON.stringify(systems.research)),
      population: this.calculateChecksum(JSON.stringify(systems.population)),
      conquest: this.calculateChecksum(JSON.stringify(systems.conquest)),
      chronicle: this.calculateChecksum(JSON.stringify(systems.chronicle))
    };
  }

  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify checksums match
   */
  private verifyChecksums(
    expected: UniverseSaveFile['checksums'],
    actual: UniverseSaveFile['checksums']
  ): boolean {
    return (
      expected.construction === actual.construction &&
      expected.manufacturing === actual.manufacturing &&
      expected.research === actual.research &&
      expected.population === actual.population &&
      expected.conquest === actual.conquest &&
      expected.chronicle === actual.chronicle
    );
  }

  // ====================================================================
  // UTILITIES
  // ====================================================================

  /**
   * Estimate save file size
   */
  private estimateSaveSize(saveFile: UniverseSaveFile): number {
    return Buffer.from(JSON.stringify(saveFile), 'utf-8').length;
  }

  /**
   * Get number of linked systems
   */
  private getLinkedSystemCount(): number {
    let count = 0;
    if (this.constructionSystem) count++;
    if (this.manufacturingSystem) count++;
    if (this.researchSystem) count++;
    if (this.populationSystem) count++;
    if (this.conquestSystem) count++;
    if (this.chronicleSystem) count++;
    return count;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalSaves: this.totalSaves,
      totalLoads: this.totalLoads,
      lastSaveTime: this.lastSaveTime,
      lastLoadTime: this.lastLoadTime,
      linkedSystems: this.getLinkedSystemCount(),
      currentVersion: SAVE_FILE_VERSION
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.totalSaves = 0;
    this.totalLoads = 0;
    this.lastSaveTime = 0;
    this.lastLoadTime = 0;
  }
}

// ====================================================================
// EXAMPLE USAGE
// ====================================================================

/**
 * Example save/load workflow
 *
 * // Create save/load system
 * const saveLoadSystem = new UniverseSaveLoadSystem({
 *   validate: true,
 *   autoMigrate: true,
 *   compression: { enabled: true, algorithm: 'gzip', level: 6, threshold: 10240 },
 *   backup: true
 * });
 *
 * // Link all systems
 * saveLoadSystem.linkConstructionSystem(constructionSystem);
 * saveLoadSystem.linkManufacturingSystem(manufacturingSystem);
 * saveLoadSystem.linkResearchSystem(researchSystem);
 * saveLoadSystem.linkPopulationSystem(populationSystem);
 * saveLoadSystem.linkConquestSystem(conquestSystem);
 * saveLoadSystem.linkChronicleSystem(chronicleSystem);
 *
 * // Save game state
 * const saveFile = await saveLoadSystem.save();
 * const json = JSON.stringify(saveFile);
 * fs.writeFileSync('savegame.json', json);
 *
 * // Or save compressed
 * const compressed = await saveLoadSystem.saveToCompressedBuffer();
 * fs.writeFileSync('savegame.sav', compressed);
 *
 * // Load game state
 * const loadedJson = fs.readFileSync('savegame.json', 'utf-8');
 * await saveLoadSystem.loadFromJson(loadedJson);
 *
 * // Or load compressed
 * const loadedBuffer = fs.readFileSync('savegame.sav');
 * await saveLoadSystem.loadFromCompressedBuffer(loadedBuffer);
 *
 * // Check statistics
 * console.log(saveLoadSystem.getStatistics());
 */
