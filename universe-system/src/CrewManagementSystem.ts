/**
 * CrewManagementSystem - Hire crew members with skills and manage them
 * Crew skills affect ship performance: engineering, weapons, piloting, etc.
 */

export type CrewRole =
  | 'PILOT'
  | 'ENGINEER'
  | 'GUNNER'
  | 'NAVIGATOR'
  | 'MEDIC'
  | 'SCIENTIST'
  | 'SECURITY';

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;

  // Skills (0-100)
  skills: {
    piloting: number;
    engineering: number;
    weapons: number;
    navigation: number;
    medical: number;
    science: number;
    security: number;
  };

  // Status
  experience: number; // Total XP
  level: number; // 1-10
  morale: number; // 0-100
  health: number; // 0-100
  fatigue: number; // 0-100

  // Employment
  salary: number; // Credits per day
  hiredDate: number;
  loyalty: number; // 0-100

  // Traits
  traits: string[];
}

export class CrewManagementSystem {
  private crew: Map<string, CrewMember> = new Map();
  private crewIdCounter = 0;
  private maxCrewSize: number = 6;

  // Skill bonuses provided to ship
  private skillBonuses = {
    piloting: 0,
    engineering: 0,
    weapons: 0,
    navigation: 0
  };

  constructor(maxCrew: number = 6) {
    this.maxCrewSize = maxCrew;
  }

  /**
   * Generate crew member for hiring
   */
  public generateCrewMember(role: CrewRole, quality: number = 0.5): CrewMember {
    const names = [
      'Alex Chen', 'Sarah Martinez', 'James O\'Connor', 'Maya Patel',
      'David Kim', 'Elena Volkov', 'Marcus Johnson', 'Yuki Tanaka'
    ];

    const name = names[Math.floor(Math.random() * names.length)];

    // Generate skills based on role and quality
    const baseSkill = 30 + quality * 50; // 30-80 base
    const roleSkill = baseSkill + 20; // Role gets +20

    const skills = {
      piloting: role === 'PILOT' ? roleSkill : baseSkill + (Math.random() - 0.5) * 20,
      engineering: role === 'ENGINEER' ? roleSkill : baseSkill + (Math.random() - 0.5) * 20,
      weapons: role === 'GUNNER' ? roleSkill : baseSkill + (Math.random() - 0.5) * 20,
      navigation: role === 'NAVIGATOR' ? roleSkill : baseSkill + (Math.random() - 0.5) * 20,
      medical: role === 'MEDIC' ? roleSkill : baseSkill + (Math.random() - 0.5) * 20,
      science: role === 'SCIENTIST' ? roleSkill : baseSkill + (Math.random() - 0.5) * 20,
      security: role === 'SECURITY' ? roleSkill : baseSkill + (Math.random() - 0.5) * 20
    };

    // Clamp skills
    for (const key in skills) {
      skills[key as keyof typeof skills] = Math.max(10, Math.min(100, skills[key as keyof typeof skills]));
    }

    const avgSkill = Object.values(skills).reduce((sum, s) => sum + s, 0) / 7;
    const salary = Math.floor(50 + avgSkill * 5); // 50-550 credits/day

    // Random traits
    const possibleTraits = [
      'Veteran', 'Quick Learner', 'Brave', 'Cautious', 'Lucky',
      'Efficient', 'Inspiring', 'Resourceful', 'Disciplined'
    ];
    const traits: string[] = [];
    if (Math.random() > 0.5) {
      traits.push(possibleTraits[Math.floor(Math.random() * possibleTraits.length)]);
    }

    return {
      id: `crew_${this.crewIdCounter++}`,
      name,
      role,
      skills,
      experience: 0,
      level: 1,
      morale: 75,
      health: 100,
      fatigue: 0,
      salary,
      hiredDate: Date.now() / 1000,
      loyalty: 50,
      traits
    };
  }

  /**
   * Hire crew member
   */
  public hireCrew(crewMember: CrewMember): {
    success: boolean;
    message: string;
  } {
    if (this.crew.size >= this.maxCrewSize) {
      return {
        success: false,
        message: `Crew full (${this.maxCrewSize} maximum)`
      };
    }

    this.crew.set(crewMember.id, crewMember);
    this.recalculateBonuses();

    console.log(`[CREW] Hired ${crewMember.name} (${crewMember.role}) - ${crewMember.salary} credits/day`);

    return {
      success: true,
      message: `${crewMember.name} hired as ${crewMember.role}`
    };
  }

  /**
   * Fire crew member
   */
  public fireCrew(crewId: string): {
    success: boolean;
    message: string;
    severancePay: number;
  } {
    const crew = this.crew.get(crewId);

    if (!crew) {
      return {
        success: false,
        message: 'Crew member not found',
        severancePay: 0
      };
    }

    // Severance pay based on time served
    const daysServed = (Date.now() / 1000 - crew.hiredDate) / 86400;
    const severancePay = Math.floor(crew.salary * Math.min(30, daysServed) * 0.5);

    this.crew.delete(crewId);
    this.recalculateBonuses();

    console.log(`[CREW] Fired ${crew.name} - severance: ${severancePay} credits`);

    return {
      success: true,
      message: `${crew.name} dismissed`,
      severancePay
    };
  }

  /**
   * Update crew (fatigue, morale, pay salaries)
   */
  public update(deltaTime: number): {
    salariesDue: number;
    events: string[];
  } {
    const events: string[] = [];
    let salariesDue = 0;

    for (const crew of this.crew.values()) {
      // Fatigue increases
      crew.fatigue += deltaTime / 3600; // 1 point per hour
      crew.fatigue = Math.min(100, crew.fatigue);

      if (crew.fatigue > 80) {
        crew.morale -= 0.1 * (deltaTime / 3600);
        events.push(`${crew.name} is exhausted`);
      }

      // Recover health if healthy
      if (crew.health < 100 && crew.health > 0) {
        crew.health += 0.5 * (deltaTime / 3600);
        crew.health = Math.min(100, crew.health);
      }

      // Salary (paid daily)
      const daysPassed = deltaTime / 86400;
      salariesDue += crew.salary * daysPassed;

      // Level up
      if (crew.experience >= crew.level * 1000) {
        crew.level++;
        crew.experience = 0;
        events.push(`${crew.name} leveled up to ${crew.level}!`);

        // Increase skills slightly
        for (const key in crew.skills) {
          crew.skills[key as keyof typeof crew.skills] += 5;
        }
      }
    }

    return {
      salariesDue,
      events
    };
  }

  /**
   * Crew rest (reduce fatigue)
   */
  public crewRest(duration: number): void {
    for (const crew of this.crew.values()) {
      crew.fatigue = Math.max(0, crew.fatigue - duration / 3600 * 10); // 10 points per hour
      crew.morale = Math.min(100, crew.morale + 2);
    }

    console.log(`[CREW] Crew rested for ${(duration / 3600).toFixed(1)}h`);
  }

  /**
   * Get crew member
   */
  public getCrewMember(id: string): CrewMember | null {
    return this.crew.get(id) || null;
  }

  /**
   * Get all crew
   */
  public getAllCrew(): CrewMember[] {
    return Array.from(this.crew.values());
  }

  /**
   * Get crew by role
   */
  public getCrewByRole(role: CrewRole): CrewMember | null {
    for (const crew of this.crew.values()) {
      if (crew.role === role) {
        return crew;
      }
    }
    return null;
  }

  /**
   * Get skill bonuses
   */
  public getSkillBonuses() {
    return { ...this.skillBonuses };
  }

  /**
   * Get crew status
   */
  public getCrewStatus(): string {
    const lines: string[] = [];

    lines.push('=== CREW ROSTER ===');
    lines.push(`Crew: ${this.crew.size}/${this.maxCrewSize}`);
    lines.push('');

    if (this.crew.size === 0) {
      lines.push('No crew members');
    } else {
      for (const crew of this.crew.values()) {
        lines.push(`${crew.name} - ${crew.role} (Level ${crew.level})`);
        lines.push(`  Primary Skill: ${this.getPrimarySkill(crew).toFixed(0)}`);
        lines.push(`  Morale: ${crew.morale.toFixed(0)}%, Health: ${crew.health.toFixed(0)}%, Fatigue: ${crew.fatigue.toFixed(0)}%`);
        lines.push(`  Salary: ${crew.salary} credits/day`);

        if (crew.traits.length > 0) {
          lines.push(`  Traits: ${crew.traits.join(', ')}`);
        }

        lines.push('');
      }
    }

    lines.push('Ship Bonuses:');
    lines.push(`  Piloting: +${this.skillBonuses.piloting.toFixed(0)}%`);
    lines.push(`  Engineering: +${this.skillBonuses.engineering.toFixed(0)}%`);
    lines.push(`  Weapons: +${this.skillBonuses.weapons.toFixed(0)}%`);
    lines.push(`  Navigation: +${this.skillBonuses.navigation.toFixed(0)}%`);

    return lines.join('\n');
  }

  /**
   * Pay salaries
   */
  public paySalaries(credits: number): {
    success: boolean;
    paid: number;
    deficit: number;
  } {
    let totalSalary = 0;
    for (const crew of this.crew.values()) {
      totalSalary += crew.salary;
    }

    if (credits < totalSalary) {
      // Can't pay full salaries
      const deficit = totalSalary - credits;

      // Morale hit for unpaid crew
      for (const crew of this.crew.values()) {
        crew.morale -= 10;
        crew.loyalty -= 5;

        if (crew.loyalty < 20) {
          console.log(`[CREW] ⚠ ${crew.name} is considering leaving due to unpaid wages`);
        }
      }

      return {
        success: false,
        paid: credits,
        deficit
      };
    }

    // Pay everyone
    for (const crew of this.crew.values()) {
      crew.morale = Math.min(100, crew.morale + 2);
      crew.loyalty = Math.min(100, crew.loyalty + 1);
    }

    return {
      success: true,
      paid: totalSalary,
      deficit: 0
    };
  }

  // Private methods
  private recalculateBonuses(): void {
    this.skillBonuses = {
      piloting: 0,
      engineering: 0,
      weapons: 0,
      navigation: 0
    };

    for (const crew of this.crew.values()) {
      this.skillBonuses.piloting += crew.skills.piloting / 100 * 10;
      this.skillBonuses.engineering += crew.skills.engineering / 100 * 10;
      this.skillBonuses.weapons += crew.skills.weapons / 100 * 10;
      this.skillBonuses.navigation += crew.skills.navigation / 100 * 10;
    }
  }

  private getPrimarySkill(crew: CrewMember): number {
    switch (crew.role) {
      case 'PILOT': return crew.skills.piloting;
      case 'ENGINEER': return crew.skills.engineering;
      case 'GUNNER': return crew.skills.weapons;
      case 'NAVIGATOR': return crew.skills.navigation;
      case 'MEDIC': return crew.skills.medical;
      case 'SCIENTIST': return crew.skills.science;
      case 'SECURITY': return crew.skills.security;
    }
  }
}
