/**
 * ResearchSystem.ts
 * Comprehensive technology research system with 30+ technologies across 5 tiers
 * Enables factions to progress through tech trees and unlock new capabilities
 */

export type TechCategory = 'WEAPONS' | 'PROPULSION' | 'ECONOMY' | 'DEFENSE' | 'EXPLORATION';

export interface Technology {
  id: string;
  name: string;
  description: string;
  category: TechCategory;
  tier: number;                    // 1-5 (increasing advancement)
  prerequisites: string[];         // Tech IDs that must be researched first
  researchCost: number;           // Research points required
  researchTime: number;           // Base time in hours
  unlocks: TechUnlocks;
  conflictsWith?: string[];       // Mutually exclusive techs
}

export interface TechUnlocks {
  weaponDamage?: number;          // Multiplier (1.0 = no change, 1.2 = 20% increase)
  weaponRange?: number;           // Multiplier
  weaponAccuracy?: number;        // Multiplier
  engineSpeed?: number;           // Multiplier
  fuelEfficiency?: number;        // Multiplier
  jumpRange?: number;             // Multiplier
  economicOutput?: number;        // Multiplier
  tradeBonus?: number;            // Multiplier
  miningEfficiency?: number;      // Multiplier
  shieldStrength?: number;        // Multiplier
  armorRating?: number;           // Multiplier
  hullPoints?: number;            // Multiplier
  sensorRange?: number;           // Multiplier
  stealthRating?: number;         // Multiplier (higher = harder to detect)
  researchSpeed?: number;         // Multiplier for future research
  newShipTypes?: string[];        // Unlock new ship classes
  newWeaponTypes?: string[];      // Unlock new weapon systems
  newBuildingTypes?: string[];    // Unlock new station modules
  specialAbilities?: string[];    // Unique capabilities
}

export interface ResearchProject {
  techId: string;
  factionId: string;
  startTime: number;              // Timestamp when research started
  progress: number;               // Research points accumulated (0 to tech.researchCost)
  estimatedCompletion: number;    // Timestamp when expected to complete
  priority: number;               // 0-10 (higher = more resources allocated)
}

export interface CompletedResearch {
  techId: string;
  factionId: string;
  completionTime: number;
  bonusesApplied: TechUnlocks;
}

/**
 * Technology Tree Definition
 * 30+ technologies organized by category and tier
 */
export class TechTree {
  private static technologies: Map<string, Technology> = new Map();

  /**
   * Initialize the complete technology tree
   */
  static initialize(): void {
    // =====================================================================
    // TIER 1: Early Game Technologies (Basic improvements)
    // =====================================================================

    // WEAPONS - Tier 1
    this.addTech({
      id: 'basic_ballistics',
      name: 'Basic Ballistics',
      description: 'Improved kinetic weapon design and targeting systems',
      category: 'WEAPONS',
      tier: 1,
      prerequisites: [],
      researchCost: 100,
      researchTime: 2,
      unlocks: {
        weaponDamage: 1.1,
        weaponAccuracy: 1.05,
      },
    });

    this.addTech({
      id: 'laser_focusing',
      name: 'Laser Focusing',
      description: 'Enhanced laser beam coherence and power output',
      category: 'WEAPONS',
      tier: 1,
      prerequisites: [],
      researchCost: 120,
      researchTime: 2.5,
      unlocks: {
        weaponDamage: 1.15,
        weaponRange: 1.1,
        newWeaponTypes: ['basic_laser'],
      },
    });

    // PROPULSION - Tier 1
    this.addTech({
      id: 'efficient_thrusters',
      name: 'Efficient Thrusters',
      description: 'Optimized reaction control systems for better fuel economy',
      category: 'PROPULSION',
      tier: 1,
      prerequisites: [],
      researchCost: 90,
      researchTime: 2,
      unlocks: {
        fuelEfficiency: 1.2,
        engineSpeed: 1.05,
      },
    });

    this.addTech({
      id: 'jump_calibration',
      name: 'Jump Drive Calibration',
      description: 'Fine-tuned hyperspace field generators',
      category: 'PROPULSION',
      tier: 1,
      prerequisites: [],
      researchCost: 110,
      researchTime: 2.5,
      unlocks: {
        jumpRange: 1.15,
      },
    });

    // ECONOMY - Tier 1
    this.addTech({
      id: 'automated_mining',
      name: 'Automated Mining',
      description: 'Robotic mining equipment and ore processing',
      category: 'ECONOMY',
      tier: 1,
      prerequisites: [],
      researchCost: 80,
      researchTime: 1.5,
      unlocks: {
        miningEfficiency: 1.25,
        economicOutput: 1.1,
      },
    });

    this.addTech({
      id: 'trade_logistics',
      name: 'Trade Logistics',
      description: 'Advanced supply chain management and market analysis',
      category: 'ECONOMY',
      tier: 1,
      prerequisites: [],
      researchCost: 100,
      researchTime: 2,
      unlocks: {
        tradeBonus: 1.15,
        economicOutput: 1.05,
      },
    });

    // DEFENSE - Tier 1
    this.addTech({
      id: 'reinforced_hulls',
      name: 'Reinforced Hulls',
      description: 'Composite armor plating and structural reinforcement',
      category: 'DEFENSE',
      tier: 1,
      prerequisites: [],
      researchCost: 90,
      researchTime: 2,
      unlocks: {
        hullPoints: 1.15,
        armorRating: 1.1,
      },
    });

    this.addTech({
      id: 'basic_shields',
      name: 'Basic Deflector Shields',
      description: 'Energy field projection for defense against weapons',
      category: 'DEFENSE',
      tier: 1,
      prerequisites: [],
      researchCost: 130,
      researchTime: 3,
      unlocks: {
        shieldStrength: 1.2,
        newBuildingTypes: ['shield_generator'],
      },
    });

    // EXPLORATION - Tier 1
    this.addTech({
      id: 'sensor_arrays',
      name: 'Advanced Sensor Arrays',
      description: 'Long-range scanning and detection systems',
      category: 'EXPLORATION',
      tier: 1,
      prerequisites: [],
      researchCost: 100,
      researchTime: 2,
      unlocks: {
        sensorRange: 1.3,
      },
    });

    // =====================================================================
    // TIER 2: Mid-Early Game (Specialization begins)
    // =====================================================================

    // WEAPONS - Tier 2
    this.addTech({
      id: 'plasma_weapons',
      name: 'Plasma Weaponry',
      description: 'Superheated ionized gas projection systems',
      category: 'WEAPONS',
      tier: 2,
      prerequisites: ['laser_focusing', 'basic_ballistics'],
      researchCost: 250,
      researchTime: 4,
      unlocks: {
        weaponDamage: 1.25,
        weaponRange: 1.15,
        newWeaponTypes: ['plasma_cannon'],
      },
    });

    this.addTech({
      id: 'guided_missiles',
      name: 'Guided Missile Systems',
      description: 'Self-tracking warheads with improved AI targeting',
      category: 'WEAPONS',
      tier: 2,
      prerequisites: ['basic_ballistics'],
      researchCost: 200,
      researchTime: 3.5,
      unlocks: {
        weaponAccuracy: 1.3,
        weaponRange: 1.2,
        newWeaponTypes: ['missile_launcher'],
      },
    });

    // PROPULSION - Tier 2
    this.addTech({
      id: 'fusion_drives',
      name: 'Fusion Drive Technology',
      description: 'Nuclear fusion-powered propulsion systems',
      category: 'PROPULSION',
      tier: 2,
      prerequisites: ['efficient_thrusters'],
      researchCost: 220,
      researchTime: 4,
      unlocks: {
        engineSpeed: 1.3,
        fuelEfficiency: 1.25,
      },
    });

    this.addTech({
      id: 'wormhole_theory',
      name: 'Wormhole Navigation Theory',
      description: 'Understanding of spacetime manipulation for faster travel',
      category: 'PROPULSION',
      tier: 2,
      prerequisites: ['jump_calibration'],
      researchCost: 280,
      researchTime: 5,
      unlocks: {
        jumpRange: 1.4,
        specialAbilities: ['stable_wormholes'],
      },
    });

    // ECONOMY - Tier 2
    this.addTech({
      id: 'industrial_automation',
      name: 'Industrial Automation',
      description: 'AI-controlled manufacturing and production facilities',
      category: 'ECONOMY',
      tier: 2,
      prerequisites: ['automated_mining', 'trade_logistics'],
      researchCost: 240,
      researchTime: 4,
      unlocks: {
        economicOutput: 1.3,
        miningEfficiency: 1.2,
        newBuildingTypes: ['automated_factory'],
      },
    });

    this.addTech({
      id: 'quantum_computing',
      name: 'Quantum Computing',
      description: 'Advanced computational systems for complex calculations',
      category: 'ECONOMY',
      tier: 2,
      prerequisites: ['trade_logistics'],
      researchCost: 300,
      researchTime: 5,
      unlocks: {
        researchSpeed: 1.15,
        tradeBonus: 1.2,
        economicOutput: 1.15,
      },
    });

    // DEFENSE - Tier 2
    this.addTech({
      id: 'adaptive_shields',
      name: 'Adaptive Shield Technology',
      description: 'Dynamic shields that adjust to incoming weapon types',
      category: 'DEFENSE',
      tier: 2,
      prerequisites: ['basic_shields'],
      researchCost: 260,
      researchTime: 4.5,
      unlocks: {
        shieldStrength: 1.4,
        specialAbilities: ['shield_adaptation'],
      },
    });

    this.addTech({
      id: 'ablative_armor',
      name: 'Ablative Armor Plating',
      description: 'Self-repairing armor that dissipates weapon energy',
      category: 'DEFENSE',
      tier: 2,
      prerequisites: ['reinforced_hulls'],
      researchCost: 230,
      researchTime: 4,
      unlocks: {
        armorRating: 1.35,
        hullPoints: 1.2,
      },
    });

    // EXPLORATION - Tier 2
    this.addTech({
      id: 'deep_space_scanners',
      name: 'Deep Space Scanning',
      description: 'Long-range sensors capable of system-wide detection',
      category: 'EXPLORATION',
      tier: 2,
      prerequisites: ['sensor_arrays'],
      researchCost: 210,
      researchTime: 3.5,
      unlocks: {
        sensorRange: 1.6,
        specialAbilities: ['system_wide_scan'],
      },
    });

    this.addTech({
      id: 'cloaking_theory',
      name: 'Cloaking Theory',
      description: 'Basic stealth technology for avoiding detection',
      category: 'EXPLORATION',
      tier: 2,
      prerequisites: ['sensor_arrays'],
      researchCost: 270,
      researchTime: 5,
      unlocks: {
        stealthRating: 1.5,
        specialAbilities: ['basic_cloak'],
      },
    });

    // =====================================================================
    // TIER 3: Mid Game (Advanced capabilities)
    // =====================================================================

    // WEAPONS - Tier 3
    this.addTech({
      id: 'antimatter_weapons',
      name: 'Antimatter Weaponry',
      description: 'Matter-antimatter annihilation weapons',
      category: 'WEAPONS',
      tier: 3,
      prerequisites: ['plasma_weapons'],
      researchCost: 500,
      researchTime: 8,
      unlocks: {
        weaponDamage: 1.5,
        weaponRange: 1.25,
        newWeaponTypes: ['antimatter_torpedo'],
      },
    });

    this.addTech({
      id: 'point_defense',
      name: 'Point Defense Systems',
      description: 'Automated weapon systems for intercepting incoming fire',
      category: 'WEAPONS',
      tier: 3,
      prerequisites: ['guided_missiles'],
      researchCost: 450,
      researchTime: 7,
      unlocks: {
        weaponAccuracy: 1.4,
        specialAbilities: ['missile_interception'],
        newBuildingTypes: ['point_defense_grid'],
      },
    });

    // PROPULSION - Tier 3
    this.addTech({
      id: 'antimatter_drives',
      name: 'Antimatter Propulsion',
      description: 'Antimatter-powered engines for extreme velocities',
      category: 'PROPULSION',
      tier: 3,
      prerequisites: ['fusion_drives'],
      researchCost: 550,
      researchTime: 9,
      unlocks: {
        engineSpeed: 1.6,
        fuelEfficiency: 1.4,
        newShipTypes: ['capital_ship'],
      },
    });

    this.addTech({
      id: 'hyperspace_mastery',
      name: 'Hyperspace Mastery',
      description: 'Complete understanding of hyperspace mechanics',
      category: 'PROPULSION',
      tier: 3,
      prerequisites: ['wormhole_theory'],
      researchCost: 600,
      researchTime: 10,
      unlocks: {
        jumpRange: 1.8,
        specialAbilities: ['instant_jump', 'jump_anywhere'],
      },
    });

    // ECONOMY - Tier 3
    this.addTech({
      id: 'megastructures',
      name: 'Megastructure Engineering',
      description: 'Construction of massive space-based facilities',
      category: 'ECONOMY',
      tier: 3,
      prerequisites: ['industrial_automation'],
      researchCost: 700,
      researchTime: 12,
      unlocks: {
        economicOutput: 1.6,
        newBuildingTypes: ['orbital_ring', 'space_elevator', 'mega_shipyard'],
      },
    });

    this.addTech({
      id: 'nanofabrication',
      name: 'Molecular Nanofabrication',
      description: 'Atomic-level manufacturing and material synthesis',
      category: 'ECONOMY',
      tier: 3,
      prerequisites: ['quantum_computing', 'industrial_automation'],
      researchCost: 650,
      researchTime: 11,
      unlocks: {
        economicOutput: 1.5,
        miningEfficiency: 1.6,
        researchSpeed: 1.25,
      },
    });

    // DEFENSE - Tier 3
    this.addTech({
      id: 'phase_shields',
      name: 'Phase-Shift Shields',
      description: 'Dimensional shields that phase matter out of sync',
      category: 'DEFENSE',
      tier: 3,
      prerequisites: ['adaptive_shields'],
      researchCost: 580,
      researchTime: 10,
      unlocks: {
        shieldStrength: 1.8,
        specialAbilities: ['phase_defense', 'projectile_immunity'],
      },
    });

    this.addTech({
      id: 'regenerative_armor',
      name: 'Self-Regenerating Armor',
      description: 'Nanobot-infused armor that repairs itself in combat',
      category: 'DEFENSE',
      tier: 3,
      prerequisites: ['ablative_armor'],
      researchCost: 520,
      researchTime: 9,
      unlocks: {
        armorRating: 1.6,
        hullPoints: 1.4,
        specialAbilities: ['auto_repair'],
      },
    });

    // EXPLORATION - Tier 3
    this.addTech({
      id: 'subspace_sensors',
      name: 'Subspace Sensor Network',
      description: 'FTL communication and detection via subspace',
      category: 'EXPLORATION',
      tier: 3,
      prerequisites: ['deep_space_scanners'],
      researchCost: 480,
      researchTime: 8,
      unlocks: {
        sensorRange: 2.0,
        specialAbilities: ['ftl_detection', 'galaxy_map'],
      },
    });

    this.addTech({
      id: 'advanced_cloaking',
      name: 'Advanced Cloaking Devices',
      description: 'Near-perfect invisibility to sensors and visual detection',
      category: 'EXPLORATION',
      tier: 3,
      prerequisites: ['cloaking_theory'],
      researchCost: 550,
      researchTime: 9,
      unlocks: {
        stealthRating: 2.5,
        specialAbilities: ['perfect_cloak', 'cloak_while_moving'],
      },
    });

    // =====================================================================
    // TIER 4: Late Game (Cutting-edge technology)
    // =====================================================================

    // WEAPONS - Tier 4
    this.addTech({
      id: 'singularity_weapons',
      name: 'Singularity Cannons',
      description: 'Weaponized micro black holes for devastating effect',
      category: 'WEAPONS',
      tier: 4,
      prerequisites: ['antimatter_weapons'],
      researchCost: 1200,
      researchTime: 16,
      unlocks: {
        weaponDamage: 2.0,
        weaponRange: 1.5,
        newWeaponTypes: ['singularity_cannon'],
        specialAbilities: ['gravitational_pull'],
      },
    });

    this.addTech({
      id: 'disruptor_tech',
      name: 'Quantum Disruptors',
      description: 'Weapons that tear apart molecular bonds',
      category: 'WEAPONS',
      tier: 4,
      prerequisites: ['antimatter_weapons', 'point_defense'],
      researchCost: 1100,
      researchTime: 15,
      unlocks: {
        weaponDamage: 1.8,
        weaponAccuracy: 1.6,
        newWeaponTypes: ['quantum_disruptor'],
        specialAbilities: ['shield_penetration'],
      },
    });

    // PROPULSION - Tier 4
    this.addTech({
      id: 'zero_point_energy',
      name: 'Zero-Point Energy Extraction',
      description: 'Harnessing vacuum energy for unlimited power',
      category: 'PROPULSION',
      tier: 4,
      prerequisites: ['antimatter_drives'],
      researchCost: 1400,
      researchTime: 18,
      unlocks: {
        engineSpeed: 2.0,
        fuelEfficiency: 3.0,
        specialAbilities: ['infinite_fuel'],
      },
    });

    // ECONOMY - Tier 4
    this.addTech({
      id: 'dyson_sphere',
      name: 'Dyson Sphere Construction',
      description: 'Star-encompassing megastructure for massive energy',
      category: 'ECONOMY',
      tier: 4,
      prerequisites: ['megastructures'],
      researchCost: 2000,
      researchTime: 25,
      unlocks: {
        economicOutput: 3.0,
        newBuildingTypes: ['dyson_sphere', 'stellar_forge'],
        specialAbilities: ['stellar_energy'],
      },
    });

    this.addTech({
      id: 'matter_replication',
      name: 'Universal Matter Replicators',
      description: 'Create any material from energy',
      category: 'ECONOMY',
      tier: 4,
      prerequisites: ['nanofabrication'],
      researchCost: 1600,
      researchTime: 20,
      unlocks: {
        economicOutput: 2.5,
        miningEfficiency: 3.0,
        specialAbilities: ['create_anything'],
      },
    });

    // DEFENSE - Tier 4
    this.addTech({
      id: 'temporal_shields',
      name: 'Temporal Displacement Shields',
      description: 'Shields that exist outside normal timeflow',
      category: 'DEFENSE',
      tier: 4,
      prerequisites: ['phase_shields'],
      researchCost: 1500,
      researchTime: 19,
      unlocks: {
        shieldStrength: 2.5,
        specialAbilities: ['temporal_immunity', 'time_distortion'],
      },
    });

    // EXPLORATION - Tier 4
    this.addTech({
      id: 'omniscient_sensors',
      name: 'Omniscient Sensor Grid',
      description: 'Galaxy-wide real-time awareness network',
      category: 'EXPLORATION',
      tier: 4,
      prerequisites: ['subspace_sensors'],
      researchCost: 1300,
      researchTime: 17,
      unlocks: {
        sensorRange: 5.0,
        specialAbilities: ['galaxy_vision', 'predict_movements'],
      },
    });

    // =====================================================================
    // TIER 5: End Game (Game-changing supremacy)
    // =====================================================================

    // WEAPONS - Tier 5
    this.addTech({
      id: 'reality_warpers',
      name: 'Reality Warping Technology',
      description: 'Manipulation of fundamental physics',
      category: 'WEAPONS',
      tier: 5,
      prerequisites: ['singularity_weapons', 'disruptor_tech'],
      researchCost: 3000,
      researchTime: 35,
      unlocks: {
        weaponDamage: 5.0,
        weaponRange: 3.0,
        newWeaponTypes: ['reality_warper'],
        specialAbilities: ['rewrite_physics', 'instant_destruction'],
      },
    });

    // PROPULSION - Tier 5
    this.addTech({
      id: 'dimensional_travel',
      name: 'Dimensional Travel',
      description: 'Travel between parallel universes and dimensions',
      category: 'PROPULSION',
      tier: 5,
      prerequisites: ['hyperspace_mastery', 'zero_point_energy'],
      researchCost: 3500,
      researchTime: 40,
      unlocks: {
        jumpRange: 10.0,
        specialAbilities: ['dimension_hop', 'parallel_universe'],
      },
    });

    // ECONOMY - Tier 5
    this.addTech({
      id: 'transcendent_ai',
      name: 'Transcendent AI',
      description: 'Post-singularity artificial superintelligence',
      category: 'ECONOMY',
      tier: 5,
      prerequisites: ['matter_replication', 'dyson_sphere'],
      researchCost: 4000,
      researchTime: 45,
      unlocks: {
        economicOutput: 10.0,
        researchSpeed: 5.0,
        specialAbilities: ['ai_governance', 'perfect_efficiency'],
      },
    });

    // DEFENSE - Tier 5
    this.addTech({
      id: 'invulnerability',
      name: 'Perfect Invulnerability Field',
      description: 'Complete immunity to all known weapons',
      category: 'DEFENSE',
      tier: 5,
      prerequisites: ['temporal_shields', 'regenerative_armor'],
      researchCost: 3800,
      researchTime: 42,
      unlocks: {
        shieldStrength: 10.0,
        armorRating: 10.0,
        specialAbilities: ['total_immunity'],
      },
    });

    // EXPLORATION - Tier 5
    this.addTech({
      id: 'cosmic_awareness',
      name: 'Cosmic Awareness',
      description: 'Omniscient knowledge of all spacetime',
      category: 'EXPLORATION',
      tier: 5,
      prerequisites: ['omniscient_sensors', 'advanced_cloaking'],
      researchCost: 3200,
      researchTime: 38,
      unlocks: {
        sensorRange: 100.0,
        stealthRating: 10.0,
        specialAbilities: ['omniscience', 'future_sight'],
      },
    });
  }

  private static addTech(tech: Technology): void {
    this.technologies.set(tech.id, tech);
  }

  static getTechnology(id: string): Technology | undefined {
    return this.technologies.get(id);
  }

  static getAllTechnologies(): Technology[] {
    return Array.from(this.technologies.values());
  }

  static getTechnologiesByCategory(category: TechCategory): Technology[] {
    return this.getAllTechnologies().filter(tech => tech.category === category);
  }

  static getTechnologiesByTier(tier: number): Technology[] {
    return this.getAllTechnologies().filter(tech => tech.tier === tier);
  }

  static getAvailableTechnologies(completedTechIds: string[]): Technology[] {
    const completedSet = new Set(completedTechIds);
    return this.getAllTechnologies().filter(tech => {
      // Must not already be completed
      if (completedSet.has(tech.id)) return false;

      // All prerequisites must be completed
      return tech.prerequisites.every(prereq => completedSet.has(prereq));
    });
  }
}

/**
 * Main Research System
 * Manages research projects, progress tracking, and tech unlocks
 */
export class ResearchSystem {
  private activeProjects: Map<string, ResearchProject> = new Map();
  private completedResearch: Map<string, CompletedResearch[]> = new Map();
  private factionResearchSpeed: Map<string, number> = new Map();

  constructor() {
    // Initialize the technology tree
    TechTree.initialize();
  }

  /**
   * Start a new research project for a faction
   */
  startResearch(factionId: string, techId: string, currentTime: number): boolean {
    const tech = TechTree.getTechnology(techId);
    if (!tech) {
      console.warn(`Technology ${techId} not found`);
      return false;
    }

    // Check if already researching this tech
    const projectKey = `${factionId}_${techId}`;
    if (this.activeProjects.has(projectKey)) {
      console.warn(`Faction ${factionId} is already researching ${techId}`);
      return false;
    }

    // Check if already completed
    const completed = this.getCompletedResearch(factionId);
    if (completed.some(cr => cr.techId === techId)) {
      console.warn(`Faction ${factionId} has already researched ${techId}`);
      return false;
    }

    // Check prerequisites
    const completedIds = completed.map(cr => cr.techId);
    const prerequisitesMet = tech.prerequisites.every(prereq =>
      completedIds.includes(prereq)
    );

    if (!prerequisitesMet) {
      console.warn(`Faction ${factionId} hasn't met prerequisites for ${techId}`);
      return false;
    }

    // Calculate research time based on faction's research speed
    const researchSpeed = this.factionResearchSpeed.get(factionId) || 1.0;
    const adjustedTime = tech.researchTime / researchSpeed;
    const estimatedCompletion = currentTime + (adjustedTime * 3600); // Convert hours to seconds

    // Create the research project
    const project: ResearchProject = {
      techId,
      factionId,
      startTime: currentTime,
      progress: 0,
      estimatedCompletion,
      priority: 5, // Default medium priority
    };

    this.activeProjects.set(projectKey, project);
    return true;
  }

  /**
   * Update research progress for all active projects
   */
  updateResearch(deltaTime: number, currentTime: number): CompletedResearch[] {
    const newlyCompleted: CompletedResearch[] = [];

    for (const [projectKey, project] of this.activeProjects.entries()) {
      const tech = TechTree.getTechnology(project.techId);
      if (!tech) continue;

      // Calculate research points generated this tick
      const researchSpeed = this.factionResearchSpeed.get(project.factionId) || 1.0;
      const basePointsPerSecond = tech.researchCost / (tech.researchTime * 3600);
      const pointsThisTick = basePointsPerSecond * researchSpeed * deltaTime * (project.priority / 5);

      project.progress += pointsThisTick;

      // Check if research is complete
      if (project.progress >= tech.researchCost) {
        const completed: CompletedResearch = {
          techId: project.techId,
          factionId: project.factionId,
          completionTime: currentTime,
          bonusesApplied: tech.unlocks,
        };

        // Store completed research
        if (!this.completedResearch.has(project.factionId)) {
          this.completedResearch.set(project.factionId, []);
        }
        this.completedResearch.get(project.factionId)!.push(completed);

        // Remove from active projects
        this.activeProjects.delete(projectKey);

        newlyCompleted.push(completed);

        // Apply research speed bonus if this tech provides it
        if (tech.unlocks.researchSpeed) {
          const currentSpeed = this.factionResearchSpeed.get(project.factionId) || 1.0;
          this.factionResearchSpeed.set(
            project.factionId,
            currentSpeed * tech.unlocks.researchSpeed
          );
        }
      }
    }

    return newlyCompleted;
  }

  /**
   * Get all active research projects for a faction
   */
  getActiveResearch(factionId: string): ResearchProject[] {
    return Array.from(this.activeProjects.values())
      .filter(project => project.factionId === factionId);
  }

  /**
   * Get all completed research for a faction
   */
  getCompletedResearch(factionId: string): CompletedResearch[] {
    return this.completedResearch.get(factionId) || [];
  }

  /**
   * Get available technologies for a faction (prerequisites met, not yet researched)
   */
  getAvailableTechnologies(factionId: string): Technology[] {
    const completedIds = this.getCompletedResearch(factionId).map(cr => cr.techId);
    return TechTree.getAvailableTechnologies(completedIds);
  }

  /**
   * Calculate cumulative bonuses from all completed research
   */
  calculateCumulativeBonuses(factionId: string): TechUnlocks {
    const completed = this.getCompletedResearch(factionId);
    const cumulative: TechUnlocks = {};

    // Multiplicative bonuses are multiplied together
    const multipliers: (keyof TechUnlocks)[] = [
      'weaponDamage', 'weaponRange', 'weaponAccuracy',
      'engineSpeed', 'fuelEfficiency', 'jumpRange',
      'economicOutput', 'tradeBonus', 'miningEfficiency',
      'shieldStrength', 'armorRating', 'hullPoints',
      'sensorRange', 'stealthRating', 'researchSpeed',
    ];

    for (const key of multipliers) {
      let total = 1.0;
      for (const cr of completed) {
        const value = cr.bonusesApplied[key];
        if (typeof value === 'number') {
          total *= value;
        }
      }
      if (total !== 1.0) {
        (cumulative as any)[key] = total;
      }
    }

    // Collect all unlocked items
    const arrays: (keyof TechUnlocks)[] = [
      'newShipTypes', 'newWeaponTypes', 'newBuildingTypes', 'specialAbilities',
    ];

    for (const key of arrays) {
      const allItems: string[] = [];
      for (const cr of completed) {
        const items = cr.bonusesApplied[key];
        if (Array.isArray(items)) {
          allItems.push(...items);
        }
      }
      if (allItems.length > 0) {
        (cumulative as any)[key] = Array.from(new Set(allItems)); // Remove duplicates
      }
    }

    return cumulative;
  }

  /**
   * Cancel an active research project
   */
  cancelResearch(factionId: string, techId: string): boolean {
    const projectKey = `${factionId}_${techId}`;
    return this.activeProjects.delete(projectKey);
  }

  /**
   * Set research priority for a project (affects research speed)
   */
  setResearchPriority(factionId: string, techId: string, priority: number): boolean {
    const projectKey = `${factionId}_${techId}`;
    const project = this.activeProjects.get(projectKey);
    if (!project) return false;

    project.priority = Math.max(0, Math.min(10, priority));
    return true;
  }

  /**
   * Get faction's current research speed multiplier
   */
  getFactionResearchSpeed(factionId: string): number {
    return this.factionResearchSpeed.get(factionId) || 1.0;
  }

  /**
   * Set faction's base research speed (from other game systems)
   */
  setFactionResearchSpeed(factionId: string, speed: number): void {
    this.factionResearchSpeed.set(factionId, Math.max(0.1, speed));
  }

  /**
   * Get research progress as percentage
   */
  getResearchProgress(factionId: string, techId: string): number {
    const projectKey = `${factionId}_${techId}`;
    const project = this.activeProjects.get(projectKey);
    if (!project) return 0;

    const tech = TechTree.getTechnology(techId);
    if (!tech) return 0;

    return (project.progress / tech.researchCost) * 100;
  }

  /**
   * Check if a faction has researched a specific technology
   */
  hasTechnology(factionId: string, techId: string): boolean {
    const completed = this.getCompletedResearch(factionId);
    return completed.some(cr => cr.techId === techId);
  }

  /**
   * Get technology tier distribution for a faction
   */
  getTechProgress(factionId: string): { [tier: number]: number } {
    const completed = this.getCompletedResearch(factionId);
    const distribution: { [tier: number]: number } = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };

    for (const cr of completed) {
      const tech = TechTree.getTechnology(cr.techId);
      if (tech) {
        distribution[tech.tier]++;
      }
    }

    return distribution;
  }

  /**
   * Apply bonuses to a ship based on faction's completed technologies
   * This modifies the ship's stats directly
   */
  applyBonusesToShip(ship: any, factionId: string): void {
    const bonuses = this.calculateCumulativeBonuses(factionId);
    const techIds = this.getCompletedResearch(factionId).map(cr => cr.techId);

    // Import and use TechnologyEffectApplicator
    const { TechnologyEffectApplicator } = require('./TechnologyEffectApplicator');
    const applicator = new TechnologyEffectApplicator();
    applicator.applyBonusesToShip(ship, bonuses, techIds);
  }

  /**
   * Apply bonuses to a station based on faction's completed technologies
   * This modifies the station's capabilities directly
   */
  applyBonusesToStation(station: any, factionId: string): void {
    const bonuses = this.calculateCumulativeBonuses(factionId);
    const techIds = this.getCompletedResearch(factionId).map(cr => cr.techId);

    // Import and use TechnologyEffectApplicator
    const { TechnologyEffectApplicator } = require('./TechnologyEffectApplicator');
    const applicator = new TechnologyEffectApplicator();
    applicator.applyBonusesToStation(station, bonuses, techIds);
  }

  /**
   * Apply bonuses to a faction based on completed technologies
   * This modifies faction capabilities directly
   */
  applyBonusesToFaction(faction: any, factionId: string): void {
    const bonuses = this.calculateCumulativeBonuses(factionId);
    const techIds = this.getCompletedResearch(factionId).map(cr => cr.techId);

    // Import and use TechnologyEffectApplicator
    const { TechnologyEffectApplicator } = require('./TechnologyEffectApplicator');
    const applicator = new TechnologyEffectApplicator();
    applicator.applyBonusesToFaction(faction, bonuses, techIds);
  }

  /**
   * Get ship template with tech upgrades applied
   * This returns a new ship configuration without modifying the original
   */
  getShipTemplate(shipType: string, factionId: string): {
    baseStats: any;
    bonuses: TechUnlocks;
    upgradedStats: any;
  } {
    const bonuses = this.calculateCumulativeBonuses(factionId);

    // Base stats vary by ship type
    const baseStats = this.getBaseShipStats(shipType);

    // Calculate upgraded stats
    const upgradedStats = this.calculateUpgradedShipStats(baseStats, bonuses);

    return {
      baseStats,
      bonuses,
      upgradedStats
    };
  }

  /**
   * Get base ship stats before tech bonuses
   */
  private getBaseShipStats(shipType: string): any {
    // These match the VesselPresets from vessel-physics
    const baseStats: any = {
      cargoCapacity: 0,
      maxAcceleration: 0,
      maxVelocity: 0,
      weaponDamage: 0,
      weaponRange: 0,
      shieldStrength: 0,
      hullPoints: 1.0,
      fuelCapacity: 1000,
      sensorRange: 10000
    };

    switch (shipType) {
      case 'CARGO_FREIGHTER':
        baseStats.cargoCapacity = 1000;
        baseStats.maxAcceleration = 5;
        baseStats.maxVelocity = 100;
        baseStats.fuelCapacity = 5000;
        break;

      case 'CARGO_SHUTTLE':
        baseStats.cargoCapacity = 50;
        baseStats.maxAcceleration = 15;
        baseStats.maxVelocity = 150;
        baseStats.fuelCapacity = 1000;
        break;

      case 'MINING_VESSEL':
        baseStats.cargoCapacity = 200;
        baseStats.maxAcceleration = 8;
        baseStats.maxVelocity = 80;
        baseStats.fuelCapacity = 2000;
        break;

      case 'PATROL_SHIP':
        baseStats.cargoCapacity = 0;
        baseStats.maxAcceleration = 25;
        baseStats.maxVelocity = 250;
        baseStats.weaponDamage = 100;
        baseStats.weaponRange = 5000;
        baseStats.shieldStrength = 500;
        baseStats.fuelCapacity = 3000;
        break;

      case 'PASSENGER_LINER':
        baseStats.cargoCapacity = 0;
        baseStats.maxAcceleration = 10;
        baseStats.maxVelocity = 120;
        baseStats.fuelCapacity = 4000;
        break;

      case 'PIRATE':
        baseStats.cargoCapacity = 100;
        baseStats.maxAcceleration = 30;
        baseStats.maxVelocity = 280;
        baseStats.weaponDamage = 120;
        baseStats.weaponRange = 4500;
        baseStats.shieldStrength = 300;
        baseStats.fuelCapacity = 2500;
        break;

      case 'RESEARCH':
        baseStats.cargoCapacity = 0;
        baseStats.maxAcceleration = 12;
        baseStats.maxVelocity = 140;
        baseStats.sensorRange = 50000;
        baseStats.fuelCapacity = 6000;
        break;

      case 'SALVAGE':
        baseStats.cargoCapacity = 150;
        baseStats.maxAcceleration = 10;
        baseStats.maxVelocity = 100;
        baseStats.fuelCapacity = 3000;
        break;

      default:
        baseStats.maxAcceleration = 10;
        baseStats.maxVelocity = 100;
        baseStats.fuelCapacity = 2000;
    }

    return baseStats;
  }

  /**
   * Calculate upgraded ship stats with tech bonuses applied
   */
  private calculateUpgradedShipStats(baseStats: any, bonuses: TechUnlocks): any {
    const upgraded = { ...baseStats };

    // Apply multipliers
    if (bonuses.weaponDamage) upgraded.weaponDamage *= bonuses.weaponDamage;
    if (bonuses.weaponRange) upgraded.weaponRange *= bonuses.weaponRange;
    if (bonuses.engineSpeed) {
      upgraded.maxAcceleration *= bonuses.engineSpeed;
      upgraded.maxVelocity *= bonuses.engineSpeed;
    }
    if (bonuses.fuelEfficiency) upgraded.fuelCapacity *= bonuses.fuelEfficiency;
    if (bonuses.shieldStrength) upgraded.shieldStrength *= bonuses.shieldStrength;
    if (bonuses.hullPoints) upgraded.hullPoints *= bonuses.hullPoints;
    if (bonuses.sensorRange) upgraded.sensorRange *= bonuses.sensorRange;
    if (bonuses.economicOutput) upgraded.cargoCapacity *= bonuses.economicOutput;
    if (bonuses.miningEfficiency) upgraded.cargoCapacity *= bonuses.miningEfficiency;

    return upgraded;
  }

  /**
   * Check if faction has access to a ship type
   */
  hasShipTypeUnlocked(factionId: string, shipType: string): boolean {
    const bonuses = this.calculateCumulativeBonuses(factionId);
    if (!bonuses.newShipTypes) return true; // All base types available

    // Check if this is a special ship type that needs unlocking
    const specialTypes = ['CAPITAL_SHIP', 'DREADNOUGHT', 'CARRIER', 'BATTLECRUISER'];
    if (specialTypes.includes(shipType)) {
      return bonuses.newShipTypes.includes(shipType.toLowerCase());
    }

    return true; // Regular ships always available
  }

  /**
   * Get all unlocked ship types for a faction
   */
  getUnlockedShipTypes(factionId: string): string[] {
    const baseTypes = [
      'CARGO_FREIGHTER',
      'CARGO_SHUTTLE',
      'MINING_VESSEL',
      'PATROL_SHIP',
      'PASSENGER_LINER',
      'PIRATE',
      'RESEARCH',
      'SALVAGE'
    ];

    const bonuses = this.calculateCumulativeBonuses(factionId);
    const unlockedTypes = [...baseTypes];

    if (bonuses.newShipTypes) {
      for (const shipType of bonuses.newShipTypes) {
        const upperType = shipType.toUpperCase();
        if (!unlockedTypes.includes(upperType)) {
          unlockedTypes.push(upperType);
        }
      }
    }

    return unlockedTypes;
  }

  /**
   * Get all unlocked weapon types for a faction
   */
  getUnlockedWeaponTypes(factionId: string): string[] {
    const baseWeapons = ['BALLISTIC', 'LASER'];
    const bonuses = this.calculateCumulativeBonuses(factionId);

    if (!bonuses.newWeaponTypes) return baseWeapons;

    return [...baseWeapons, ...bonuses.newWeaponTypes.map(w => w.toUpperCase())];
  }

  /**
   * Get all unlocked building types for a faction
   */
  getUnlockedBuildingTypes(factionId: string): string[] {
    const baseBuildings = ['HABITAT', 'FACTORY', 'WAREHOUSE'];
    const bonuses = this.calculateCumulativeBonuses(factionId);

    if (!bonuses.newBuildingTypes) return baseBuildings;

    return [...baseBuildings, ...bonuses.newBuildingTypes.map(b => b.toUpperCase())];
  }

  // ====================================================================
  // SAVE/LOAD SUPPORT
  // ====================================================================

  /**
   * Serialize system state for saving
   */
  serialize(): import('./SaveFileFormat').ResearchSystemState {
    // Serialize active projects
    const activeProjects = Array.from(this.activeProjects.values()).map(project => ({
      techId: project.techId,
      factionId: project.factionId,
      startTime: project.startTime,
      progress: project.progress,
      estimatedCompletion: project.estimatedCompletion,
      priority: project.priority
    }));

    // Serialize completed research
    const completedResearch: Array<{ factionId: string; research: import('./SaveFileFormat').SerializedCompletedResearch[] }> = [];
    for (const [factionId, researchList] of this.completedResearch.entries()) {
      const research = researchList.map(cr => ({
        techId: cr.techId,
        factionId: cr.factionId,
        completionTime: cr.completionTime,
        bonusesApplied: { ...cr.bonusesApplied }
      }));
      completedResearch.push({ factionId, research });
    }

    // Serialize faction research speeds
    const factionResearchSpeed = Array.from(this.factionResearchSpeed.entries()).map(([factionId, speed]) => ({
      factionId,
      speed
    }));

    return {
      activeProjects,
      completedResearch,
      factionResearchSpeed
    };
  }

  /**
   * Deserialize and restore system state
   */
  deserialize(state: import('./SaveFileFormat').ResearchSystemState): void {
    console.log('[ResearchSystem] Deserializing state...');

    // Clear existing state
    this.activeProjects.clear();
    this.completedResearch.clear();
    this.factionResearchSpeed.clear();

    // Restore active projects
    for (const serializedProject of state.activeProjects) {
      const projectKey = `${serializedProject.factionId}_${serializedProject.techId}`;
      const project: ResearchProject = {
        techId: serializedProject.techId,
        factionId: serializedProject.factionId,
        startTime: serializedProject.startTime,
        progress: serializedProject.progress,
        estimatedCompletion: serializedProject.estimatedCompletion,
        priority: serializedProject.priority
      };
      this.activeProjects.set(projectKey, project);
    }

    // Restore completed research
    for (const { factionId, research } of state.completedResearch) {
      const researchList: CompletedResearch[] = research.map(cr => ({
        techId: cr.techId,
        factionId: cr.factionId,
        completionTime: cr.completionTime,
        bonusesApplied: { ...cr.bonusesApplied }
      }));
      this.completedResearch.set(factionId, researchList);
    }

    // Restore faction research speeds
    for (const { factionId, speed } of state.factionResearchSpeed) {
      this.factionResearchSpeed.set(factionId, speed);
    }

    console.log(`[ResearchSystem] Restored ${this.activeProjects.size} active projects and ${this.completedResearch.size} faction research histories`);
  }
}
