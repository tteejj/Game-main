/**
 * NewsGenerationEngine - Converts events into news articles
 *
 * Creates a living information layer where:
 * - Events automatically become news
 * - Different factions report differently
 * - News spreads through communication networks
 * - Headlines reflect event importance
 * - Player learns about universe through news
 */

import { HistoricalEvent, EventType } from '../simulation/HistoricalMemorySystem';

export interface NewsArticle {
  id: string;
  timestamp: number;

  // Content
  headline: string;
  subheadline?: string;
  body: string;
  summary: string;                    // 1-2 sentence version

  // Classification
  category: NewsCategory;
  importance: number;                 // 0-10 (10 = breaking news)
  veracity: number;                   // 0-1 (how accurate, 1 = truth)

  // Source
  sourceEvent: HistoricalEvent;
  publisher: string;                  // Faction/station that published
  bias: NewsBias;
  perspective: string;                // Which faction's viewpoint

  // Propagation
  readership: number;                 // How many have seen this
  trustworthiness: number;            // 0-1 (how much readers trust it)
  spreadRate: number;                 // How fast it spreads

  // Metadata
  tags: string[];
  relatedArticles: string[];          // IDs of related news
  corrections?: string[];             // If later proven false
}

export type NewsCategory =
  | 'BREAKING_NEWS' | 'POLITICS' | 'ECONOMY' | 'MILITARY'
  | 'DISASTER' | 'SCIENCE' | 'SOCIAL' | 'CRIME'
  | 'SPORTS' | 'ENTERTAINMENT' | 'OBITUARY';

export type NewsBias =
  | 'NEUTRAL' | 'PRO_FACTION' | 'ANTI_FACTION'
  | 'SENSATIONALIST' | 'MINIMIZING' | 'PROPAGANDA';

export interface NewsTemplate {
  eventType: EventType;
  category: NewsCategory;

  // Template parts
  headlineTemplates: string[];
  bodyTemplates: string[];
  summaryTemplates: string[];

  // Bias variations
  biasedHeadlines?: Map<NewsBias, string[]>;

  // Importance calculation
  importanceCalculator: (event: HistoricalEvent) => number;
}

export class NewsGenerationEngine {
  private articles: Map<string, NewsArticle> = new Map();
  private templates: Map<EventType, NewsTemplate> = new Map();

  // Configuration
  private readonly MAX_ARTICLES = 1000;       // Keep last 1000 articles
  private readonly BREAKING_NEWS_THRESHOLD = 8;

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate news article from event
   */
  public generateNews(
    event: HistoricalEvent,
    publisher: string,
    bias: NewsBias = 'NEUTRAL'
  ): NewsArticle {
    const template = this.templates.get(event.type);

    if (!template) {
      // Generic template
      return this.generateGenericNews(event, publisher, bias);
    }

    // Calculate importance
    const importance = template.importanceCalculator(event);

    // Select templates based on bias
    const headlineTemplate = this.selectTemplate(
      template.biasedHeadlines?.get(bias) || template.headlineTemplates
    );
    const bodyTemplate = this.selectTemplate(template.bodyTemplates);
    const summaryTemplate = this.selectTemplate(template.summaryTemplates);

    // Fill in templates
    const headline = this.fillTemplate(headlineTemplate, event);
    const body = this.fillTemplate(bodyTemplate, event);
    const summary = this.fillTemplate(summaryTemplate, event);

    const article: NewsArticle = {
      id: `news_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: event.timestamp,
      headline,
      subheadline: importance > 7 ? this.generateSubheadline(event) : undefined,
      body,
      summary,
      category: template.category,
      importance,
      veracity: bias === 'PROPAGANDA' ? 0.5 : 0.9,
      sourceEvent: event,
      publisher,
      bias,
      perspective: publisher,
      readership: 0,
      trustworthiness: this.calculateTrustworthiness(publisher, bias),
      spreadRate: importance / 10,
      tags: [...event.tags],
      relatedArticles: []
    };

    this.articles.set(article.id, article);

    // Prune old articles
    if (this.articles.size > this.MAX_ARTICLES) {
      this.pruneOldArticles();
    }

    return article;
  }

  /**
   * Generate multiple perspectives on same event
   */
  public generateMultiplePerspectives(
    event: HistoricalEvent,
    factions: string[]
  ): NewsArticle[] {
    const articles: NewsArticle[] = [];

    for (const faction of factions) {
      // Determine bias based on event impact on faction
      const bias = this.determineBias(event, faction);

      const article = this.generateNews(event, faction, bias);
      articles.push(article);
    }

    // Link related articles
    for (let i = 0; i < articles.length; i++) {
      articles[i].relatedArticles = articles
        .filter((_, j) => j !== i)
        .map(a => a.id);
    }

    return articles;
  }

  /**
   * Get recent news
   */
  public getRecentNews(timeWindow: number, category?: NewsCategory): NewsArticle[] {
    const currentTime = Date.now() / 1000;
    let news = Array.from(this.articles.values())
      .filter(a => currentTime - a.timestamp < timeWindow);

    if (category) {
      news = news.filter(a => a.category === category);
    }

    // Sort by importance and recency
    news.sort((a, b) => {
      const scoreA = a.importance * 10 + (1 / (currentTime - a.timestamp + 1));
      const scoreB = b.importance * 10 + (1 / (currentTime - b.timestamp + 1));
      return scoreB - scoreA;
    });

    return news;
  }

  /**
   * Get breaking news
   */
  public getBreakingNews(): NewsArticle[] {
    return this.getRecentNews(3600) // Last hour
      .filter(a => a.importance >= this.BREAKING_NEWS_THRESHOLD);
  }

  /**
   * Generate news digest
   */
  public generateDigest(timeWindow: number): string {
    const news = this.getRecentNews(timeWindow);
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('UNIVERSE NEWS DIGEST');
    lines.push('═'.repeat(60));
    lines.push('');

    // Breaking news section
    const breaking = news.filter(a => a.importance >= this.BREAKING_NEWS_THRESHOLD);
    if (breaking.length > 0) {
      lines.push('🚨 BREAKING NEWS 🚨');
      lines.push('');
      for (const article of breaking.slice(0, 3)) {
        lines.push(`  ${article.headline}`);
        lines.push(`  ${article.summary}`);
        lines.push('');
      }
    }

    // Top stories by category
    const categories: NewsCategory[] = ['POLITICS', 'ECONOMY', 'MILITARY', 'DISASTER'];

    for (const category of categories) {
      const categoryNews = news.filter(a => a.category === category).slice(0, 2);
      if (categoryNews.length > 0) {
        lines.push(`${category}:`);
        for (const article of categoryNews) {
          lines.push(`  • ${article.headline}`);
        }
        lines.push('');
      }
    }

    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  // ====================================================================
  // PRIVATE METHODS
  // ====================================================================

  private initializeTemplates(): void {
    // PIRATE_RAID
    this.templates.set('PIRATE_RAID', {
      eventType: 'PIRATE_RAID',
      category: 'CRIME',
      headlineTemplates: [
        'Pirates Attack {target}, {casualties} Casualties',
        'Pirate Fleet Raids {target}',
        '{target} Under Pirate Attack',
        'Deadly Pirate Raid on {target}'
      ],
      bodyTemplates: [
        'In a brazen attack, pirates raided {target} earlier today, resulting in {casualties} casualties and significant damage. Authorities are investigating the incident and increasing patrols in the region.',
        'Pirates struck {target} in a coordinated assault that left {casualties} dead and extensive property damage. The attack has raised concerns about security in the region.',
        '{target} was the scene of a violent pirate raid that claimed {casualties} lives. Local security forces responded but the attackers escaped with stolen cargo.'
      ],
      summaryTemplates: [
        'Pirates raided {target}, killing {casualties}.',
        '{casualties} dead in pirate attack on {target}.'
      ],
      biasedHeadlines: new Map([
        ['SENSATIONALIST', [
          'TERROR: Massive Pirate Attack Devastates {target}!',
          'BLOODBATH at {target} - Pirates Strike Without Mercy!'
        ]],
        ['MINIMIZING', [
          'Minor Security Incident at {target}',
          'Security Forces Respond to Disturbance at {target}'
        ]]
      ]),
      importanceCalculator: (e) => Math.min(10, e.severity)
    });

    // STATION_DESTROYED
    this.templates.set('STATION_DESTROYED', {
      eventType: 'STATION_DESTROYED',
      category: 'DISASTER',
      headlineTemplates: [
        '{station} Catastrophically Destroyed - {casualties} Dead',
        'Disaster: {station} Lost, Hundreds Dead',
        'Breaking: {station} Destroyed in Catastrophic Failure'
      ],
      bodyTemplates: [
        '{station} was completely destroyed in a catastrophic event that claimed {casualties} lives. The cause is under investigation. Rescue operations are ongoing, though officials hold little hope for additional survivors.',
        'In one of the deadliest space disasters in recent memory, {station} was obliterated, killing {casualties}. The station, which housed thousands, experienced a catastrophic failure that left no time for evacuation.',
        'Tragedy struck today as {station} was destroyed, resulting in {casualties} fatalities. Emergency services are overwhelmed with the scale of the disaster.'
      ],
      summaryTemplates: [
        '{station} destroyed, {casualties} dead.',
        'Catastrophic loss of {station} - {casualties} casualties.'
      ],
      importanceCalculator: (e) => 10  // Always maximum importance
    });

    // WAR_DECLARED
    this.templates.set('WAR_DECLARED', {
      eventType: 'WAR_DECLARED',
      category: 'MILITARY',
      headlineTemplates: [
        '{factionA} Declares War on {factionB}',
        'War Erupts: {factionA} vs {factionB}',
        'Breaking: {factionA} and {factionB} at War'
      ],
      bodyTemplates: [
        'In a dramatic escalation of tensions, {factionA} has officially declared war on {factionB}. The declaration cites {reason} as the primary cause. Military analysts predict a prolonged conflict.',
        'War has broken out between {factionA} and {factionB} following months of deteriorating relations. The immediate cause appears to be {reason}, though underlying tensions have been building for years.',
        '{factionA} leadership announced a declaration of war against {factionB} in response to {reason}. Both sides are mobilizing military assets.'
      ],
      summaryTemplates: [
        '{factionA} declares war on {factionB} over {reason}.',
        'War begins between {factionA} and {factionB}.'
      ],
      biasedHeadlines: new Map([
        ['PRO_FACTION', [
          '{factionA} Forced to Defend Against {factionB} Aggression',
          '{factionA} Takes Righteous Stand Against {factionB}'
        ]],
        ['ANTI_FACTION', [
          '{factionA} Launches Unjustified War on {factionB}',
          'Warmonger {factionA} Attacks Peaceful {factionB}'
        ]]
      ]),
      importanceCalculator: (e) => 10
    });

    // TRADE_COMPLETED
    this.templates.set('TRADE_COMPLETED', {
      eventType: 'TRADE_COMPLETED',
      category: 'ECONOMY',
      headlineTemplates: [
        'Major Trade Deal: {commodity} Shipment Arrives at {station}',
        '{station} Receives {amount} Units of {commodity}',
        'Trade Flourishes as {commodity} Deliveries Continue'
      ],
      bodyTemplates: [
        'Economic activity continues to grow as {station} received {amount} units of {commodity} in a successful trade operation valued at {value} credits.',
        'Traders report successful delivery of {amount} units of {commodity} to {station}, representing a transaction worth {value} credits and demonstrating healthy market conditions.',
        'The arrival of {commodity} shipments at {station} signals ongoing economic stability in the region, with trade volumes remaining strong.'
      ],
      summaryTemplates: [
        '{amount} units of {commodity} delivered to {station}.',
        'Trade continues with {commodity} shipment.'
      ],
      importanceCalculator: (e) => Math.min(5, e.severity)
    });

    // RESCUE
    this.templates.set('RESCUE', {
      eventType: 'RESCUE',
      category: 'SOCIAL',
      headlineTemplates: [
        'Hero: {rescuer} Saves {rescued} from Certain Death',
        'Dramatic Rescue: {rescued} Saved by {rescuer}',
        'Rescue Operation Saves {rescued}'
      ],
      bodyTemplates: [
        'In a dramatic rescue operation, {rescuer} successfully saved {rescued} who were in distress. The rescue is being hailed as heroic, with {rescued} expressing deep gratitude.',
        '{rescuer} responded to a distress call and managed to save {rescued} in a daring operation that put their own life at risk. All survivors are reported to be in stable condition.',
        'Quick thinking and bravery allowed {rescuer} to rescue {rescued} from a life-threatening situation. The successful operation is a testament to the valor of those who risk their lives for others.'
      ],
      summaryTemplates: [
        '{rescuer} rescues {rescued} in heroic operation.',
        '{rescued} saved by {rescuer}.'
      ],
      importanceCalculator: (e) => 6
    });

    // Add more templates as needed...
  }

  private selectTemplate(templates: string[]): string {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private fillTemplate(template: string, event: HistoricalEvent): string {
    let filled = template;

    // Replace common placeholders
    filled = filled.replace('{target}', event.stationId || event.systemId || 'Unknown Location');
    filled = filled.replace('{station}', event.stationId || 'Unknown Station');
    filled = filled.replace('{casualties}', event.data?.casualties?.toString() || '0');
    filled = filled.replace('{factionA}', event.data?.factionA || 'Faction A');
    filled = filled.replace('{factionB}', event.data?.factionB || 'Faction B');
    filled = filled.replace('{reason}', event.data?.reason || 'unknown reasons');
    filled = filled.replace('{commodity}', event.data?.commodity || 'goods');
    filled = filled.replace('{amount}', event.data?.amount?.toString() || '0');
    filled = filled.replace('{value}', event.data?.value?.toString() || '0');
    filled = filled.replace('{rescuer}', event.participants[0] || 'Unknown Hero');
    filled = filled.replace('{rescued}', event.participants[1] || 'survivors');

    return filled;
  }

  private generateSubheadline(event: HistoricalEvent): string {
    // Generate contextual subheadline
    if (event.data?.casualties > 50) {
      return `Death toll continues to rise as rescue efforts struggle`;
    }
    if (event.type === 'WAR_DECLARED') {
      return `International community calls for immediate ceasefire`;
    }
    return `Authorities investigating cause of incident`;
  }

  private determineBias(event: HistoricalEvent, faction: string): NewsBias {
    // Determine bias based on faction involvement
    if (event.participants.includes(faction)) {
      if (event.severity > 7) {
        return 'MINIMIZING';  // Downplay bad news about self
      } else {
        return 'PRO_FACTION';
      }
    }

    // Check if event benefits faction
    if (event.data?.beneficiaries?.includes(faction)) {
      return 'PRO_FACTION';
    }

    // Check if event harms rivals
    if (event.data?.victims && event.data.victims.includes(faction)) {
      return 'SENSATIONALIST';
    }

    return 'NEUTRAL';
  }

  private calculateTrustworthiness(publisher: string, bias: NewsBias): number {
    let trust = 0.7;  // Base trust

    switch (bias) {
      case 'NEUTRAL':
        trust = 0.9;
        break;
      case 'PRO_FACTION':
      case 'ANTI_FACTION':
        trust = 0.6;
        break;
      case 'SENSATIONALIST':
        trust = 0.4;
        break;
      case 'MINIMIZING':
        trust = 0.5;
        break;
      case 'PROPAGANDA':
        trust = 0.2;
        break;
    }

    return trust;
  }

  private generateGenericNews(
    event: HistoricalEvent,
    publisher: string,
    bias: NewsBias
  ): NewsArticle {
    return {
      id: `news_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: event.timestamp,
      headline: `${event.type.replace(/_/g, ' ')}: ${event.description}`,
      body: event.detailedLog || event.description,
      summary: event.description,
      category: this.inferCategory(event.category),
      importance: Math.min(10, event.severity),
      veracity: 0.8,
      sourceEvent: event,
      publisher,
      bias,
      perspective: publisher,
      readership: 0,
      trustworthiness: 0.7,
      spreadRate: event.severity / 10,
      tags: event.tags,
      relatedArticles: []
    };
  }

  private inferCategory(eventCategory: string): NewsCategory {
    switch (eventCategory) {
      case 'ECONOMIC': return 'ECONOMY';
      case 'MILITARY': return 'MILITARY';
      case 'DIPLOMATIC': return 'POLITICS';
      case 'ENVIRONMENTAL': return 'DISASTER';
      default: return 'BREAKING_NEWS';
    }
  }

  private pruneOldArticles(): void {
    const sorted = Array.from(this.articles.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    const toKeep = sorted.slice(0, this.MAX_ARTICLES);
    this.articles.clear();

    for (const article of toKeep) {
      this.articles.set(article.id, article);
    }
  }

  // ====================================================================
  // PUBLIC API
  // ====================================================================

  public getArticle(id: string): NewsArticle | null {
    return this.articles.get(id) || null;
  }

  public getAllArticles(): NewsArticle[] {
    return Array.from(this.articles.values());
  }

  public getStatistics(): {
    totalArticles: number;
    breakingNews: number;
    byCategory: Map<NewsCategory, number>;
    averageImportance: number;
  } {
    const all = this.getAllArticles();
    const breaking = all.filter(a => a.importance >= this.BREAKING_NEWS_THRESHOLD);

    const byCategory = new Map<NewsCategory, number>();
    let totalImportance = 0;

    for (const article of all) {
      byCategory.set(article.category, (byCategory.get(article.category) || 0) + 1);
      totalImportance += article.importance;
    }

    return {
      totalArticles: all.length,
      breakingNews: breaking.length,
      byCategory,
      averageImportance: all.length > 0 ? totalImportance / all.length : 0
    };
  }
}
