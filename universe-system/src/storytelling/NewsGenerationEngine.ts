/**
 * Enhanced NewsGenerationEngine - Rich, dynamic news generation
 *
 * Uses ContentGenerationLibrary for sophisticated narrative generation
 * with proper vocabulary, templates, and dynamic content.
 */

import { HistoricalEvent, EventType, EventCategory } from '../simulation/HistoricalMemorySystem';
import {
  ContentGenerator,
  getNewsTemplate,
  NEWS_TEMPLATES,
  VOCABULARY
} from './ContentGenerationLibrary';

export interface NewsArticle {
  id: string;
  timestamp: number;

  // Content
  headline: string;
  subheadline?: string;
  lead: string;                       // First paragraph (lead paragraph)
  body: string;                       // Full article body
  summary: string;                    // 1-2 sentence version
  quotes?: string[];                  // Quotes from sources

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
  sections?: ArticleSection[];        // Structured sections
}

export interface ArticleSection {
  heading: string;
  content: string;
  importance: number;                 // 0-1
}

export type NewsCategory =
  | 'BREAKING_NEWS' | 'POLITICS' | 'ECONOMY' | 'MILITARY'
  | 'DISASTER' | 'SCIENCE' | 'SOCIAL' | 'CRIME'
  | 'SPORTS' | 'ENTERTAINMENT' | 'OBITUARY';

export type NewsBias =
  | 'NEUTRAL'
  | 'PRO_PARTICIPANT'
  | 'ANTI_PARTICIPANT'
  | 'SENSATIONALIST'
  | 'MINIMIZING'
  | 'PROPAGANDA';

export type NewsImportance =
  | 'BREAKING'       // 9-10
  | 'MAJOR'          // 7-8
  | 'SIGNIFICANT'    // 5-6
  | 'MINOR'          // 3-4
  | 'TRIVIAL';       // 0-2

export class NewsGenerationEngine {
  private articles: Map<string, NewsArticle> = new Map();
  private contentGen: ContentGenerator;

  // Configuration
  private readonly MAX_ARTICLES = 1000;
  private readonly BREAKING_NEWS_THRESHOLD = 8;

  constructor(seed?: number) {
    this.contentGen = new ContentGenerator(seed);
  }

  /**
   * Generate comprehensive news article from event
   */
  public generateNews(
    event: HistoricalEvent,
    publisher: string,
    bias: NewsBias = 'NEUTRAL'
  ): NewsArticle {
    // Get template for this event type
    const template = getNewsTemplate(event.type);

    if (!template) {
      return this.generateGenericNews(event, publisher, bias);
    }

    // Calculate importance
    const importance = this.calculateImportance(event);

    // Extract variables from event
    const variables = this.extractVariables(event, importance);

    // Generate headline
    const headline = this.generateHeadline(template, variables, bias, importance);

    // Generate lead (first paragraph)
    const lead = this.generateLead(template, variables, bias);

    // Generate body
    const body = this.generateBody(template, variables, bias, event);

    // Generate quotes
    const quotes = this.generateQuotes(template, variables, bias, event);

    // Generate summary
    const summary = this.generateSummary(event, headline);

    // Calculate metadata
    const veracity = this.calculateVeracity(bias, event);
    const trustworthiness = this.calculateTrustworthiness(publisher, bias, veracity);
    const spreadRate = this.calculateSpreadRate(importance, bias);

    const article: NewsArticle = {
      id: `news_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: event.timestamp,
      headline,
      subheadline: importance >= 8 ? this.generateSubheadline(event, variables) : undefined,
      lead,
      body,
      summary,
      quotes: quotes.length > 0 ? quotes : undefined,
      category: this.determineCategory(event),
      importance,
      veracity,
      sourceEvent: event,
      publisher,
      bias,
      perspective: publisher,
      readership: 0,
      trustworthiness,
      spreadRate,
      tags: this.generateTags(event),
      relatedArticles: [],
      sections: this.generateSections(event, variables, bias)
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
      // Determine bias based on faction involvement
      const bias = this.determineBiasForFaction(event, faction);

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
    return this.getRecentNews(3600)
      .filter(a => a.importance >= this.BREAKING_NEWS_THRESHOLD);
  }

  /**
   * Generate formatted news article for display
   */
  public formatArticle(article: NewsArticle): string {
    const lines: string[] = [];

    // Header
    lines.push('═'.repeat(70));
    lines.push(article.headline.toUpperCase());
    if (article.subheadline) {
      lines.push(article.subheadline);
    }
    lines.push('─'.repeat(70));
    lines.push(`${article.publisher} | ${article.category} | ${this.contentGen.describeTime(article.timestamp, Date.now() / 1000)}`);
    lines.push('═'.repeat(70));
    lines.push('');

    // Lead
    lines.push(article.lead);
    lines.push('');

    // Body
    lines.push(article.body);
    lines.push('');

    // Quotes
    if (article.quotes && article.quotes.length > 0) {
      for (const quote of article.quotes) {
        lines.push(`  "${quote}"`);
        lines.push('');
      }
    }

    // Tags
    if (article.tags.length > 0) {
      lines.push(`Tags: ${article.tags.join(', ')}`);
    }

    lines.push('─'.repeat(70));

    return lines.join('\n');
  }

  /**
   * Generate news digest
   */
  public generateDigest(timeWindow: number): string {
    const news = this.getRecentNews(timeWindow);
    const lines: string[] = [];

    lines.push('═'.repeat(70));
    lines.push('UNIVERSE NEWS DIGEST');
    lines.push('═'.repeat(70));
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

    lines.push('═'.repeat(70));

    return lines.join('\n');
  }

  // ====================================================================
  // PRIVATE METHODS - GENERATION
  // ====================================================================

  private generateHeadline(
    template: any,
    variables: Record<string, any>,
    bias: NewsBias,
    importance: number
  ): string {
    const templates = template.headlineTemplates;
    const headlineTemplate = this.contentGen.pick(templates);
    let headline = this.contentGen.fillTemplate(headlineTemplate, variables);

    // Apply bias modifications
    if (bias === 'SENSATIONALIST') {
      headline = headline.toUpperCase();
      if (importance >= 8) {
        headline = `BREAKING: ${headline}`;
      }
    } else if (bias === 'MINIMIZING') {
      headline = headline.replace(/destroyed/gi, 'damaged');
      headline = headline.replace(/catastrophic/gi, 'significant');
      headline = headline.replace(/disaster/gi, 'incident');
    }

    return headline;
  }

  private generateLead(
    template: any,
    variables: Record<string, any>,
    bias: NewsBias
  ): string {
    const leadTemplate = this.contentGen.pick(template.leadTemplates);
    let lead = this.contentGen.fillTemplate(leadTemplate, variables);

    // Add bias coloring
    if (bias === 'PRO_PARTICIPANT') {
      lead = lead.replace(/attacked/gi, 'defended against');
      lead = lead.replace(/aggressive/gi, 'protective');
    } else if (bias === 'ANTI_PARTICIPANT') {
      lead = lead.replace(/defended/gi, 'aggressed against');
      lead = lead.replace(/protective/gi, 'hostile');
    }

    return lead;
  }

  private generateBody(
    template: any,
    variables: Record<string, any>,
    bias: NewsBias,
    event: HistoricalEvent
  ): string {
    const paragraphs: string[] = [];

    // Main content paragraphs
    const numParagraphs = event.severity >= 7 ? 3 : 2;
    for (let i = 0; i < numParagraphs && i < template.bodyTemplates.length; i++) {
      const bodyTemplate = template.bodyTemplates[i];
      const paragraph = this.contentGen.fillTemplate(bodyTemplate, variables);
      paragraphs.push(paragraph);
    }

    // Add context based on event
    if (event.consequences && event.consequences.length > 0) {
      const transition = this.contentGen.getTransition('consequence');
      const consequenceDesc = this.describeConsequences(event.consequences);
      paragraphs.push(`${transition}, ${consequenceDesc}`);
    }

    return paragraphs.join('\n\n');
  }

  private generateQuotes(
    template: any,
    variables: Record<string, any>,
    bias: NewsBias,
    event: HistoricalEvent
  ): string[] {
    if (!template.quoteTemplates || template.quoteTemplates.length === 0) {
      return [];
    }

    const quotes: string[] = [];

    // Generate 1-2 quotes
    const numQuotes = event.severity >= 7 ? 2 : 1;

    for (let i = 0; i < numQuotes && i < template.quoteTemplates.length; i++) {
      const quoteTemplate = this.contentGen.pick(template.quoteTemplates);
      variables.speaker = this.generateSpeakerName(event, bias);
      variables.commander = this.generateCommanderName(event);
      variables.analyst = this.generateAnalystName();

      const quote = this.contentGen.fillTemplate(quoteTemplate, variables);
      quotes.push(quote);
    }

    return quotes;
  }

  private generateSubheadline(event: HistoricalEvent, variables: Record<string, any>): string {
    const subheadlines = [
      `Authorities respond to ${event.category.toLowerCase()} crisis`,
      `Officials investigating cause of incident`,
      `International community watches developments closely`,
      `Economic impact estimated at ${variables.economicImpact || 'millions'} credits`,
      `Casualties continue to mount as situation develops`
    ];

    if (event.data?.casualties && event.data.casualties > 100) {
      return `Death toll reaches ${event.data.casualties} as rescue efforts continue`;
    }

    if (event.type === 'WAR_DECLARED') {
      return `Diplomatic efforts collapse as military mobilization begins`;
    }

    if (event.category === 'ECONOMIC') {
      return `Market volatility expected to continue`;
    }

    return this.contentGen.pick(subheadlines);
  }

  private generateSummary(event: HistoricalEvent, headline: string): string {
    // Create 1-2 sentence summary
    const location = event.systemId || event.location?.x ? `at ${event.systemId || 'unknown location'}` : '';
    const when = this.contentGen.describeTime(event.timestamp, Date.now() / 1000);

    return `${event.description} ${location} ${when}.`;
  }

  private generateSections(
    event: HistoricalEvent,
    variables: Record<string, any>,
    bias: NewsBias
  ): ArticleSection[] {
    const sections: ArticleSection[] = [];

    // What happened
    sections.push({
      heading: 'What Happened',
      content: event.description,
      importance: 1.0
    });

    // Impact
    if (event.severity >= 6) {
      sections.push({
        heading: 'Impact',
        content: this.describeImpact(event, variables),
        importance: 0.8
      });
    }

    // Response
    if (event.participants.length > 0) {
      sections.push({
        heading: 'Response',
        content: this.describeResponse(event, variables, bias),
        importance: 0.6
      });
    }

    // What's Next
    sections.push({
      heading: "What's Next",
      content: this.predictFuture(event),
      importance: 0.5
    });

    return sections;
  }

  // ====================================================================
  // PRIVATE METHODS - VARIABLES & CONTEXT
  // ====================================================================

  private extractVariables(event: HistoricalEvent, importance: number): Record<string, any> {
    const variables: Record<string, any> = {
      // Basic info
      location: event.systemId || 'unknown location',
      timestamp: event.timestamp,
      timeAgo: this.contentGen.describeTime(event.timestamp, Date.now() / 1000),

      // Common fields
      casualties: event.data?.casualties || 0,
      damage: event.data?.damage || 0,
      shipCount: event.data?.shipCount || event.participants.length,

      // Descriptive
      intensity: this.getIntensityWord(event.severity),
      adjective: this.getAdjectiveForEvent(event),

      // Economic
      economicImpact: this.formatEconomicImpact(event),
      value: this.contentGen.formatNumber(event.data?.value || 0),

      // Military
      factionA: event.participants[0] || 'Unknown Faction',
      factionB: event.participants[1] || 'Unknown Faction',
      faction: event.participants[0] || 'Unknown Faction',

      // Discovery
      discovery: event.data?.discovery || 'new phenomenon',

      // Trade
      commodity: event.data?.commodity || 'goods',
      amount: event.data?.amount || 0,

      // Time
      timeOfDay: this.getTimeOfDay(event.timestamp),
      duration: event.data?.duration || '1 hour',
      timeframe: 'the coming days',

      // Causes
      cause: event.data?.cause || 'unknown factors',
      trigger: event.data?.trigger || 'recent events',
      casusBelli: event.data?.casusBelli || 'territorial disputes',

      // Misc
      target: event.stationId || event.systemId || 'Unknown Target',
      station: event.stationId || 'Unknown Station',
      hidingSpot: 'nearby asteroid field',
      theory: 'insider involvement',
      warning: 'the situation will deteriorate further',
      ordinal: this.getOrdinal(event.data?.count || 1),
      timeUnit: 'month'
    };

    return variables;
  }

  private calculateImportance(event: HistoricalEvent): number {
    let importance = event.severity;

    // Adjust based on category
    if (event.category === 'MILITARY' || event.category === 'DIPLOMATIC') {
      importance += 1;
    }

    // Adjust based on participants
    if (event.participants.length >= 3) {
      importance += 1;
    }

    // Adjust based on casualties
    if (event.data?.casualties) {
      if (event.data.casualties > 100) importance += 2;
      else if (event.data.casualties > 10) importance += 1;
    }

    return Math.min(10, Math.max(0, importance));
  }

  private calculateVeracity(bias: NewsBias, event: HistoricalEvent): number {
    let veracity = 0.9; // Base truth

    switch (bias) {
      case 'NEUTRAL':
        veracity = 0.95;
        break;
      case 'PRO_PARTICIPANT':
      case 'ANTI_PARTICIPANT':
        veracity = 0.75;
        break;
      case 'SENSATIONALIST':
        veracity = 0.6;
        break;
      case 'MINIMIZING':
        veracity = 0.7;
        break;
      case 'PROPAGANDA':
        veracity = 0.3;
        break;
    }

    return veracity;
  }

  private calculateTrustworthiness(publisher: string, bias: NewsBias, veracity: number): number {
    let trust = veracity * 0.8;

    // Adjust based on bias
    if (bias === 'NEUTRAL') {
      trust += 0.1;
    } else if (bias === 'PROPAGANDA') {
      trust -= 0.3;
    }

    return Math.min(1, Math.max(0, trust));
  }

  private calculateSpreadRate(importance: number, bias: NewsBias): number {
    let rate = importance / 10;

    if (bias === 'SENSATIONALIST') {
      rate *= 1.5; // Sensationalist news spreads faster
    }

    return Math.min(1, rate);
  }

  private determineCategory(event: HistoricalEvent): NewsCategory {
    const categoryMap: Record<EventCategory, NewsCategory> = {
      MILITARY: 'MILITARY',
      ECONOMIC: 'ECONOMY',
      DIPLOMATIC: 'POLITICS',
      ENVIRONMENTAL: 'DISASTER',
      SOCIAL: 'SOCIAL',
      TECHNOLOGICAL: 'SCIENCE'
    };

    return categoryMap[event.category] || 'BREAKING_NEWS';
  }

  private determineBiasForFaction(event: HistoricalEvent, faction: string): NewsBias {
    // Is faction directly involved?
    if (event.participants.includes(faction)) {
      // If event is negative, minimize
      if (event.severity >= 7 && event.category === 'MILITARY') {
        return 'MINIMIZING';
      }
      return 'PRO_PARTICIPANT';
    }

    // Check if faction benefits or is harmed
    if (event.data?.beneficiaries?.includes(faction)) {
      return 'NEUTRAL';
    }

    if (event.data?.victims?.includes(faction)) {
      return 'SENSATIONALIST';
    }

    // Check if event involves rivals
    // (Would need faction relationship data for this)

    return 'NEUTRAL';
  }

  private generateTags(event: HistoricalEvent): string[] {
    const tags = [...event.tags];

    // Add category tag
    tags.push(event.category.toLowerCase());

    // Add severity tag
    if (event.severity >= 8) tags.push('crisis');
    else if (event.severity >= 5) tags.push('major');

    // Add location tag
    if (event.systemId) tags.push(event.systemId);

    return [...new Set(tags)]; // Deduplicate
  }

  // ====================================================================
  // PRIVATE METHODS - UTILITY
  // ====================================================================

  private getIntensityWord(severity: number): string {
    if (severity >= 9) return 'devastating';
    if (severity >= 7) return 'major';
    if (severity >= 5) return 'significant';
    if (severity >= 3) return 'notable';
    return 'minor';
  }

  private getAdjectiveForEvent(event: HistoricalEvent): string {
    if (event.severity >= 8) {
      return this.contentGen.getAdjective('epic');
    } else if (event.severity >= 5) {
      return this.contentGen.getAdjective('neutral');
    }
    return this.contentGen.getAdjective('positive');
  }

  private formatEconomicImpact(event: HistoricalEvent): string {
    const damage = event.data?.damage || event.data?.value || 0;
    return this.contentGen.formatNumber(damage);
  }

  private getTimeOfDay(timestamp: number): string {
    const hour = new Date(timestamp * 1000).getHours();
    if (hour < 6) return 'early morning';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getOrdinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = num % 100;
    return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  }

  private describeConsequences(consequences: any[]): string {
    if (consequences.length === 0) return '';

    const descriptions = consequences.slice(0, 2).map(c =>
      c.description || 'additional effects are expected'
    );

    return this.contentGen.formatList(descriptions);
  }

  private describeImpact(event: HistoricalEvent, variables: Record<string, any>): string {
    const impacts: string[] = [];

    if (event.data?.casualties) {
      impacts.push(`${event.data.casualties} casualties reported`);
    }

    if (event.data?.damage) {
      impacts.push(`Economic damage estimated at ${variables.economicImpact} credits`);
    }

    if (event.participants.length > 2) {
      impacts.push(`Multiple factions affected`);
    }

    return impacts.length > 0 ? this.contentGen.formatList(impacts) : 'Full extent of impact still being assessed.';
  }

  private describeResponse(event: HistoricalEvent, variables: Record<string, any>, bias: NewsBias): string {
    const responses = [
      `${variables.faction} has mobilized emergency response teams`,
      `Authorities are investigating the incident`,
      `Security measures have been increased in the region`,
      `Officials are calling for calm as they assess the situation`,
      `Emergency services are on scene providing assistance`
    ];

    return this.contentGen.pick(responses);
  }

  private predictFuture(event: HistoricalEvent): string {
    const predictions = [
      'The situation remains fluid and is being closely monitored.',
      'Further developments are expected in the coming hours.',
      'Analysts predict this will have lasting implications for the region.',
      'Authorities have promised a full investigation into the cause.',
      'The full ramifications may not be clear for some time.'
    ];

    return this.contentGen.pick(predictions);
  }

  private generateSpeakerName(event: HistoricalEvent, bias: NewsBias): string {
    const titles = ['Admiral', 'Commander', 'Director', 'Minister', 'Ambassador', 'Governor'];
    const title = this.contentGen.pick(titles);
    const faction = event.participants[0] || 'Unknown';
    return `${title} of ${faction}`;
  }

  private generateCommanderName(event: HistoricalEvent): string {
    return `Commander ${event.participants[0] || 'Unknown'}`;
  }

  private generateAnalystName(): string {
    const analysts = ['political analyst', 'military expert', 'economic commentator', 'independent observer'];
    return this.contentGen.pick(analysts);
  }

  private generateGenericNews(
    event: HistoricalEvent,
    publisher: string,
    bias: NewsBias
  ): NewsArticle {
    const importance = this.calculateImportance(event);
    const variables = this.extractVariables(event, importance);

    return {
      id: `news_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: event.timestamp,
      headline: `${event.type.replace(/_/g, ' ')}: ${event.description}`,
      lead: event.description,
      body: event.detailedLog || event.description,
      summary: event.description,
      category: this.determineCategory(event),
      importance,
      veracity: 0.8,
      sourceEvent: event,
      publisher,
      bias,
      perspective: publisher,
      readership: 0,
      trustworthiness: 0.7,
      spreadRate: importance / 10,
      tags: this.generateTags(event),
      relatedArticles: []
    };
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

  public getAllNews(): NewsArticle[] {
    return Array.from(this.articles.values());
  }

  public getStatistics(): {
    totalArticles: number;
    breakingNews: number;
    byCategory: Map<NewsCategory, number>;
    averageImportance: number;
    averageVeracity: number;
  } {
    const all = this.getAllNews();
    const breaking = all.filter(a => a.importance >= this.BREAKING_NEWS_THRESHOLD);

    const byCategory = new Map<NewsCategory, number>();
    let totalImportance = 0;
    let totalVeracity = 0;

    for (const article of all) {
      byCategory.set(article.category, (byCategory.get(article.category) || 0) + 1);
      totalImportance += article.importance;
      totalVeracity += article.veracity;
    }

    return {
      totalArticles: all.length,
      breakingNews: breaking.length,
      byCategory,
      averageImportance: all.length > 0 ? totalImportance / all.length : 0,
      averageVeracity: all.length > 0 ? totalVeracity / all.length : 0
    };
  }
}
