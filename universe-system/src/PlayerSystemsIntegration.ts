/**
 * PlayerSystemsIntegration - Additional player systems (crew, research, intel, smuggling)
 * This extends PlayerShipIntegration with advanced features
 */

import { CrewManagementSystem, CrewMember, CrewRole } from './CrewManagementSystem';
import { ResearchSystem, ResearchProject } from './ResearchSystem';
import { NewsGenerationSystem, NewsArticle } from './NewsGenerationSystem';

export interface ContrabandItem {
  commodity: string;
  quantity: number;
  illegalIn: string[]; // List of factions where this is illegal
  baseValue: number;
  blackMarketMultiplier: number; // 1.5-3.0x normal price
}

export interface IntelligenceData {
  id: string;
  type: 'TRADE_ROUTE' | 'PIRATE_ACTIVITY' | 'FACTION_MOVEMENT' | 'COMMODITY_PRICE' | 'RUMOR';
  content: string;
  location: string;
  timestamp: number;
  value: number; // How much this intel could be sold for
  reliability: number; // 0-1, how accurate it is
}

export class PlayerSystemsIntegration {
  private crewSystem: CrewManagementSystem;
  private researchSystem: ResearchSystem;
  private newsSystem: NewsGenerationSystem;

  // Crew
  private dailySalaryDue: number = 0;
  private lastSalaryPayment: number = Date.now() / 1000;

  // Research
  private activeResearch: ResearchProject | null = null;
  private completedResearch: Set<string> = new Set();
  private researchPoints: number = 0;

  // Intel
  private gatheredIntel: Map<string, IntelligenceData> = new Map();

  // Smuggling
  private contrabandCargo: Map<string, ContrabandItem> = new Map();

  constructor(
    crewSystem: CrewManagementSystem,
    researchSystem: ResearchSystem,
    newsSystem: NewsGenerationSystem
  ) {
    this.crewSystem = crewSystem;
    this.researchSystem = researchSystem;
    this.newsSystem = newsSystem;
  }

  // ===== CREW MANAGEMENT =====

  /**
   * Get available crew members for hire at station
   */
  public getAvailableCrewForHire(count: number = 5): CrewMember[] {
    const available: CrewMember[] = [];
    const roles: CrewRole[] = ['PILOT', 'ENGINEER', 'GUNNER', 'NAVIGATOR', 'MEDIC', 'SCIENTIST', 'SECURITY'];

    for (let i = 0; i < count; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const quality = Math.random(); // 0-1
      const crew = this.crewSystem.generateCrewMember(role, quality);
      available.push(crew);
    }

    return available;
  }

  /**
   * Hire a crew member
   */
  public hireCrew(crewMember: CrewMember, playerCredits: number): {
    success: boolean;
    hiringBonus?: number;
    message: string;
  } {
    // Hiring bonus (1 month salary upfront)
    const hiringBonus = crewMember.salary * 30;

    if (playerCredits < hiringBonus) {
      return {
        success: false,
        message: `Insufficient credits. Hiring bonus required: ${hiringBonus} credits`
      };
    }

    const result = this.crewSystem.hireCrew(crewMember);

    if (result.success) {
      return {
        success: true,
        hiringBonus,
        message: `${result.message}. Hiring bonus: ${hiringBonus} credits`
      };
    }

    return {
      success: false,
      message: result.message
    };
  }

  /**
   * Fire a crew member
   */
  public fireCrew(crewId: string): {
    success: boolean;
    severancePay?: number;
    message: string;
  } {
    const crew = this.crewSystem.getCrewMember(crewId);

    if (!crew) {
      return {
        success: false,
        message: 'Crew member not found'
      };
    }

    // Severance pay (2 weeks salary)
    const severancePay = crew.salary * 14;

    const result = this.crewSystem.fireCrew(crewId);

    return {
      success: result.success,
      severancePay,
      message: `${result.message}. Severance pay: ${severancePay} credits`
    };
  }

  /**
   * Get all current crew
   */
  public getCrew(): CrewMember[] {
    return this.crewSystem.getAllCrew();
  }

  /**
   * Get crew status summary
   */
  public getCrewStatus(): string {
    return this.crewSystem.getCrewStatus();
  }

  /**
   * Pay crew salaries (called daily)
   */
  public payCrewSalaries(playerCredits: number): {
    success: boolean;
    totalPaid: number;
    remaining: number;
    message: string;
  } {
    const now = Date.now() / 1000;
    const daysSinceLastPayment = (now - this.lastSalaryPayment) / 86400;

    if (daysSinceLastPayment < 1) {
      return {
        success: true,
        totalPaid: 0,
        remaining: playerCredits,
        message: 'Salaries already paid today'
      };
    }

    const result = this.crewSystem.paySalaries(playerCredits);

    if (result.success) {
      this.lastSalaryPayment = now;
    }

    return {
      success: result.success,
      totalPaid: result.totalPaid,
      remaining: result.remainingCredits,
      message: result.message
    };
  }

  /**
   * Get crew skill bonuses
   */
  public getCrewSkillBonuses() {
    return this.crewSystem.getSkillBonuses();
  }

  // ===== RESEARCH & UPGRADES =====

  /**
   * Get available research projects
   */
  public getAvailableResearch(): ResearchProject[] {
    return this.researchSystem.getAvailableProjects(this.completedResearch);
  }

  /**
   * Start a research project
   */
  public startResearch(projectId: string, playerCredits: number): {
    success: boolean;
    cost?: number;
    message: string;
  } {
    const project = this.researchSystem.getProject(projectId);

    if (!project) {
      return {
        success: false,
        message: 'Research project not found'
      };
    }

    if (this.completedResearch.has(projectId)) {
      return {
        success: false,
        message: 'Already researched'
      };
    }

    if (this.activeResearch) {
      return {
        success: false,
        message: `Already researching: ${this.activeResearch.name}`
      };
    }

    // Check if player has required research
    if (project.requires && project.requires.length > 0) {
      const missing = project.requires.filter(req => !this.completedResearch.has(req));
      if (missing.length > 0) {
        return {
          success: false,
          message: `Requires research: ${missing.join(', ')}`
        };
      }
    }

    if (playerCredits < project.cost) {
      return {
        success: false,
        message: `Insufficient credits. Cost: ${project.cost}`
      };
    }

    this.activeResearch = { ...project };
    this.activeResearch.progress = 0;

    return {
      success: true,
      cost: project.cost,
      message: `Started research: ${project.name}`
    };
  }

  /**
   * Update research progress
   */
  public updateResearch(deltaTime: number): {
    completed: boolean;
    project?: ResearchProject;
  } {
    if (!this.activeResearch) {
      return { completed: false };
    }

    // Research progress per day
    const progressPerDay = 1 / this.activeResearch.timeRequired; // days to complete
    const progressThisUpdate = (deltaTime / 86400) * progressPerDay;

    this.activeResearch.progress = (this.activeResearch.progress || 0) + progressThisUpdate;

    if (this.activeResearch.progress >= 1.0) {
      // Research complete!
      this.completedResearch.add(this.activeResearch.id);
      const completed = this.activeResearch;
      this.activeResearch = null;

      console.log(`[RESEARCH] Completed: ${completed.name}`);

      return {
        completed: true,
        project: completed
      };
    }

    return { completed: false };
  }

  /**
   * Get active research
   */
  public getActiveResearch(): ResearchProject | null {
    return this.activeResearch;
  }

  /**
   * Get completed research
   */
  public getCompletedResearch(): string[] {
    return Array.from(this.completedResearch);
  }

  /**
   * Check if player has researched something
   */
  public hasResearched(projectId: string): boolean {
    return this.completedResearch.has(projectId);
  }

  // ===== INTELLIGENCE & INFORMATION =====

  /**
   * Gather intelligence from news
   */
  public gatherIntelFromNews(playerLocation: string): IntelligenceData[] {
    const recent News = this.newsSystem.getRecentNews(20);
    const intel: IntelligenceData[] = [];

    for (const article of recentNews) {
      // Convert news to intel
      const intelData: IntelligenceData = {
        id: `intel_${article.id}`,
        type: this.categorizeNews(article),
        content: article.headline,
        location: article.systemId,
        timestamp: article.timestamp,
        value: this.calculateIntelValue(article),
        reliability: 0.8 // News is fairly reliable
      };

      intel.push(intelData);
      this.gatheredIntel.set(intelData.id, intelData);
    }

    return intel;
  }

  /**
   * Buy intelligence from an NPC
   */
  public buyIntel(intelId: string, playerCredits: number): {
    success: boolean;
    cost?: number;
    intel?: IntelligenceData;
    message: string;
  } {
    const intel = this.gatheredIntel.get(intelId);

    if (!intel) {
      // Generate new intel
      const newIntel = this.generateRandomIntel();
      const cost = newIntel.value;

      if (playerCredits < cost) {
        return {
          success: false,
          message: `Insufficient credits. Cost: ${cost}`
        };
      }

      this.gatheredIntel.set(newIntel.id, newIntel);

      return {
        success: true,
        cost,
        intel: newIntel,
        message: `Intel acquired: ${newIntel.content}`
      };
    }

    return {
      success: true,
      cost: 0,
      intel,
      message: 'Intel already known'
    };
  }

  /**
   * Sell intelligence to interested parties
   */
  public sellIntel(intelId: string): {
    success: boolean;
    payment?: number;
    message: string;
  } {
    const intel = this.gatheredIntel.get(intelId);

    if (!intel) {
      return {
        success: false,
        message: 'Intel not found'
      };
    }

    // Intel loses value over time
    const age = (Date.now() / 1000 - intel.timestamp) / 3600; // hours
    const depreciation = Math.max(0.2, 1 - age * 0.1);
    const payment = Math.floor(intel.value * depreciation);

    // Remove from inventory
    this.gatheredIntel.delete(intelId);

    return {
      success: true,
      payment,
      message: `Intel sold for ${payment} credits`
    };
  }

  /**
   * Get all gathered intel
   */
  public getAllIntel(): IntelligenceData[] {
    return Array.from(this.gatheredIntel.values());
  }

  // ===== CARGO SCANNING & SMUGGLING =====

  /**
   * Add contraband to cargo
   */
  public addContraband(item: ContrabandItem): {
    success: boolean;
    message: string;
  } {
    this.contrabandCargo.set(item.commodity, item);

    return {
      success: true,
      message: `${item.quantity} ${item.commodity} loaded (CONTRABAND)`
    };
  }

  /**
   * Check if cargo contains contraband for a faction
   */
  public hasContrabandFor(faction: string): boolean {
    for (const item of this.contrabandCargo.values()) {
      if (item.illegalIn.includes(faction)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Station cargo scan
   */
  public performCargoScan(stationFaction: string): {
    contraband: ContrabandItem[];
    totalValue: number;
    fine: number;
  } {
    const contraband: ContrabandItem[] = [];
    let totalValue = 0;

    for (const item of this.contrabandCargo.values()) {
      if (item.illegalIn.includes(stationFaction)) {
        contraband.push(item);
        totalValue += item.baseValue * item.quantity;
      }
    }

    const fine = totalValue * 2; // Fine is 2x value of contraband

    return {
      contraband,
      totalValue,
      fine
    };
  }

  /**
   * Confiscate contraband
   */
  public confiscateContraband(faction: string): {
    confiscated: ContrabandItem[];
    value: number;
  } {
    const confiscated: ContrabandItem[] = [];
    let value = 0;

    for (const [commodity, item] of this.contrabandCargo.entries()) {
      if (item.illegalIn.includes(faction)) {
        confiscated.push(item);
        value += item.baseValue * item.quantity;
        this.contrabandCargo.delete(commodity);
      }
    }

    return {
      confiscated,
      value
    };
  }

  /**
   * Sell contraband on black market
   */
  public sellContrabandOnBlackMarket(commodity: string): {
    success: boolean;
    payment?: number;
    message: string;
  } {
    const item = this.contrabandCargo.get(commodity);

    if (!item) {
      return {
        success: false,
        message: 'Contraband not found in cargo'
      };
    }

    const payment = Math.floor(item.baseValue * item.quantity * item.blackMarketMultiplier);
    this.contrabandCargo.delete(commodity);

    return {
      success: true,
      payment,
      message: `Sold ${item.quantity} ${commodity} for ${payment} credits`
    };
  }

  /**
   * Get all contraband
   */
  public getContraband(): ContrabandItem[] {
    return Array.from(this.contrabandCargo.values());
  }

  /**
   * Bribe official to skip cargo scan
   */
  public bribeOfficial(playerCredits: number): {
    success: boolean;
    cost?: number;
    message: string;
  } {
    const bribeAmount = 500 + Math.floor(Math.random() * 1000); // 500-1500 credits

    if (playerCredits < bribeAmount) {
      return {
        success: false,
        message: `Bribe amount too low. Official wants ${bribeAmount} credits.`
      };
    }

    // 70% success rate for bribes
    const success = Math.random() > 0.3;

    if (success) {
      return {
        success: true,
        cost: bribeAmount,
        message: `Official accepts bribe of ${bribeAmount} credits. Scan waived.`
      };
    } else {
      return {
        success: false,
        cost: bribeAmount,
        message: `Official rejects bribe and reports you! Bounty added.`
      };
    }
  }

  // Private helper methods

  private categorizeNews(article: NewsArticle): 'TRADE_ROUTE' | 'PIRATE_ACTIVITY' | 'FACTION_MOVEMENT' | 'COMMODITY_PRICE' | 'RUMOR' {
    // Simple categorization based on news type
    if (article.type === 'ECONOMIC') return 'COMMODITY_PRICE';
    if (article.type === 'COMBAT' || article.type === 'MILITARY') return 'PIRATE_ACTIVITY';
    if (article.type === 'POLITICAL') return 'FACTION_MOVEMENT';
    return 'RUMOR';
  }

  private calculateIntelValue(article: NewsArticle): number {
    // More severe/important news is more valuable
    return article.severity * 100 + Math.floor(Math.random() * 200);
  }

  private generateRandomIntel(): IntelligenceData {
    const types: IntelligenceData['type'][] = ['TRADE_ROUTE', 'PIRATE_ACTIVITY', 'FACTION_MOVEMENT', 'COMMODITY_PRICE'];
    const type = types[Math.floor(Math.random() * types.length)];

    const contents = {
      'TRADE_ROUTE': 'Profitable trade route: Electronics from Alpha to Beta paying 150% margin',
      'PIRATE_ACTIVITY': 'Pirate squadron spotted in Gamma sector, avoiding merchant traffic',
      'FACTION_MOVEMENT': 'Military buildup detected near contested border',
      'COMMODITY_PRICE': 'Medical supplies shortage expected to drive prices up 200%'
    };

    return {
      id: `intel_${Date.now()}_${Math.random()}`,
      type,
      content: contents[type],
      location: 'Unknown',
      timestamp: Date.now() / 1000,
      value: 500 + Math.floor(Math.random() * 1500),
      reliability: 0.5 + Math.random() * 0.4
    };
  }
}
