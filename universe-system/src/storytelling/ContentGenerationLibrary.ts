/**
 * ContentGenerationLibrary - Rich content templates and generators
 *
 * Comprehensive library of templates, vocabulary, and generation utilities
 * for creating compelling narratives across all storytelling systems.
 */

import { HistoricalEvent } from '../simulation/HistoricalMemorySystem';

// ====================================================================
// VOCABULARY BANKS
// ====================================================================

export const VOCABULARY = {
  // Action verbs for different event types
  military: {
    attack: ['assaulted', 'ambushed', 'raided', 'struck', 'bombarded', 'engaged', 'besieged'],
    defend: ['repelled', 'countered', 'resisted', 'held off', 'defended against', 'rebuffed'],
    victory: ['triumphed', 'prevailed', 'vanquished', 'defeated', 'routed', 'crushed'],
    retreat: ['withdrew', 'fled', 'retreated', 'evacuated', 'pulled back', 'disengaged'],
    destroy: ['annihilated', 'obliterated', 'decimated', 'destroyed', 'razed', 'eliminated']
  },

  economic: {
    trade: ['negotiated', 'brokered', 'finalized', 'secured', 'concluded', 'arranged'],
    profit: ['profited', 'gained', 'earned', 'reaped', 'harvested', 'accumulated'],
    loss: ['lost', 'squandered', 'forfeited', 'hemorrhaged', 'sacrificed'],
    growth: ['expanded', 'grew', 'flourished', 'prospered', 'thrived', 'boomed'],
    decline: ['declined', 'faltered', 'slumped', 'crashed', 'collapsed', 'plummeted']
  },

  diplomatic: {
    alliance: ['allied with', 'partnered with', 'joined forces with', 'united with', 'formed pact with'],
    hostility: ['declared war on', 'severed ties with', 'condemned', 'denounced', 'broke with'],
    negotiation: ['negotiated with', 'parlayed with', 'conferred with', 'discussed terms with'],
    treaty: ['signed treaty with', 'ratified agreement with', 'formalized pact with', 'sealed accord with']
  },

  discovery: {
    find: ['discovered', 'uncovered', 'unearthed', 'detected', 'located', 'identified', 'stumbled upon'],
    analyze: ['analyzed', 'examined', 'investigated', 'studied', 'scrutinized', 'probed'],
    reveal: ['revealed', 'unveiled', 'exposed', 'brought to light', 'made known']
  },

  crisis: {
    disaster: ['catastrophe', 'disaster', 'calamity', 'tragedy', 'cataclysm', 'devastation'],
    emergency: ['crisis', 'emergency', 'critical situation', 'dire circumstances', 'peril'],
    damage: ['devastated', 'ravaged', 'crippled', 'damaged', 'impaired', 'compromised']
  },

  // Descriptive adjectives
  adjectives: {
    positive: ['remarkable', 'outstanding', 'exceptional', 'impressive', 'magnificent', 'extraordinary', 'stellar'],
    negative: ['devastating', 'catastrophic', 'disastrous', 'terrible', 'horrific', 'dreadful', 'calamitous'],
    neutral: ['significant', 'notable', 'considerable', 'substantial', 'major', 'important'],
    epic: ['legendary', 'historic', 'monumental', 'momentous', 'epoch-making', 'unprecedented', 'groundbreaking']
  },

  // Intensity modifiers
  intensifiers: {
    high: ['extremely', 'incredibly', 'remarkably', 'exceptionally', 'extraordinarily', 'tremendously'],
    medium: ['very', 'quite', 'rather', 'fairly', 'notably', 'considerably'],
    low: ['somewhat', 'slightly', 'moderately', 'relatively', 'marginally']
  },

  // Transition phrases
  transitions: {
    consequence: ['As a result', 'Consequently', 'Therefore', 'Thus', 'Hence', 'Subsequently'],
    contrast: ['However', 'Nevertheless', 'Nonetheless', 'Yet', 'Still', 'On the other hand'],
    addition: ['Furthermore', 'Moreover', 'Additionally', 'In addition', 'Also', 'Besides'],
    time: ['Meanwhile', 'Subsequently', 'Later', 'Afterwards', 'Following this', 'In the aftermath']
  }
};

// ====================================================================
// NEWS TEMPLATES
// ====================================================================

export interface NewsTemplate {
  eventType: string;
  headlineTemplates: string[];
  leadTemplates: string[];
  bodyTemplates: string[];
  quoteTemplates: string[];
}

export const NEWS_TEMPLATES: NewsTemplate[] = [
  // MILITARY EVENTS
  {
    eventType: 'PIRATE_RAID',
    headlineTemplates: [
      '{intensity} Pirate Attack {location}',
      'Pirates Strike {location}, {casualties} Casualties',
      '{faction} Convoy Ambushed by Pirates',
      'Brazen Pirate Raid Rocks {location}',
      'Space Lanes Unsafe: Pirates Hit {faction} Fleet'
    ],
    leadTemplates: [
      'In a {adjective} assault, pirate forces attacked {target} near {location}, resulting in {casualties} casualties and {damage} credits in damages.',
      '{faction} officials confirmed that pirates struck {location} early {timeOfDay}, catching defenders off guard.',
      'Witnesses report seeing {shipCount} pirate vessels emerge from {hidingSpot} before launching their attack on {target}.'
    ],
    bodyTemplates: [
      'The raid began at approximately {time} when sensors detected multiple unidentified vessels approaching {location}. {faction} security forces responded within minutes, but the attackers had already {action}.',
      'Local authorities are investigating how the pirates managed to evade detection. Some analysts suggest {theory}.',
      'This marks the {ordinal} pirate attack in the region this {timeUnit}. Security experts warn that {warning}.'
    ],
    quoteTemplates: [
      '"This is an outrage," declared {speaker}. "We will not tolerate such lawlessness in our space."',
      '"Our thoughts are with the families of the victims," said {speaker}. "We are mobilizing additional patrols to prevent future incidents."',
      '"These pirates are becoming increasingly bold," warned {speaker}. "Without greater coordination, this problem will only get worse."'
    ]
  },

  {
    eventType: 'BATTLE',
    headlineTemplates: [
      'Fierce Battle Erupts in {location}',
      '{factionA} and {factionB} Clash in {location}',
      'Major Engagement: {casualties} Casualties in {location} Battle',
      '{location} Becomes Battlefield as {factionA} Attacks',
      'Space Battle Rages: {shipCount} Ships Engaged'
    ],
    leadTemplates: [
      'Heavy fighting broke out in {location} today as forces from {factionA} engaged {factionB} in what military analysts are calling {description}.',
      'The battle, which lasted {duration}, saw {shipCount} vessels from both sides exchange fire in a desperate struggle for {objective}.',
      'Early reports indicate {outcome}, though both sides claim victory in what has become a pivotal engagement.'
    ],
    bodyTemplates: [
      'The engagement began when {factionA} forces moved to {objective}. {factionB} responded by deploying {response}.',
      'Casualties are estimated at {casualties}, with {destroyed} ships confirmed destroyed. The economic impact is projected at {economicImpact} credits.',
      'Military experts note that this battle represents {significance}. Diplomatic channels remain {diplomaticState}.'
    ],
    quoteTemplates: [
      '"Our forces fought with exceptional courage," stated {commander}. "This victory demonstrates our commitment to {cause}."',
      '"The enemy underestimated our resolve," {commander} declared. "We will continue to defend our {territory} at any cost."',
      '"Both sides suffered grievous losses," observed {analyst}. "This conflict is far from over."'
    ]
  },

  {
    eventType: 'WAR_DECLARED',
    headlineTemplates: [
      '{factionA} Declares War on {factionB}',
      'War: {factionA} and {factionB} Formal Hostilities Begin',
      'Breaking: {factionA} Issues Declaration of War',
      '{region} Plunges Into War as {factionA} Attacks',
      'Full-Scale War Erupts Between {factionA} and {factionB}'
    ],
    leadTemplates: [
      'In a historic announcement, {factionA} has formally declared war on {factionB}, citing {casusBelli} as justification for military action.',
      'Diplomatic efforts have collapsed as {factionA} leadership issued an official declaration of war against {factionB}, effective immediately.',
      'The long-simmering tensions between {factionA} and {factionB} have erupted into open warfare following {triggerEvent}.'
    ],
    bodyTemplates: [
      'The declaration comes after months of escalating rhetoric and failed negotiations. Key grievances include {grievances}.',
      'Military mobilization has already begun, with {factionA} forces moving toward {objectives}. {factionB} has responded by {response}.',
      'Economic analysts predict {economicImpact}. Civilian populations in contested zones are being evacuated as {civilianImpact}.',
      'Allied nations have called for {diplomaticResponse}. The galactic community watches anxiously as {implications}.'
    ],
    quoteTemplates: [
      '"We have exhausted all peaceful options," {leader} announced. "Now we must defend our interests through force of arms."',
      '"This is a dark day for our civilization," lamented {diplomat}. "War benefits no one, but we will not shirk from our duty."',
      '"History will judge who was in the right," declared {leader}. "We fight not for conquest, but for {principle}."'
    ]
  },

  // ECONOMIC EVENTS
  {
    eventType: 'TRADE_AGREEMENT',
    headlineTemplates: [
      '{factionA} and {factionB} Sign Historic Trade Deal',
      'Landmark Trade Agreement Promises {benefit}',
      'Economic Cooperation: {factionA}-{factionB} Pact Signed',
      'Trade Barriers Fall as {factionA}, {factionB} Reach Accord',
      '{commodity} Trade Opens Between {factionA} and {factionB}'
    ],
    leadTemplates: [
      'Leaders from {factionA} and {factionB} gathered today to sign a comprehensive trade agreement worth an estimated {value} credits annually.',
      'In a ceremony attended by {attendees}, representatives formalized a trade partnership that economists predict will {impact}.',
      'The long-negotiated agreement removes tariffs on {commodities} and establishes {framework} for future cooperation.'
    ],
    bodyTemplates: [
      'Key provisions include: {provisions}. Implementation will begin {timeline}.',
      'Trade volumes are expected to increase {percentage}% within the first {timeframe}. Primary beneficiaries include {beneficiaries}.',
      'The agreement represents a significant shift from {previousPolicy}. Critics argue {criticism}, while supporters claim {benefit}.'
    ],
    quoteTemplates: [
      '"This partnership represents our shared commitment to prosperity," stated {leader}. "Together, we are stronger."',
      '"Free trade benefits everyone," {economist} explained. "This agreement will create {jobs} new jobs and lower prices for consumers."',
      '"We\'ve shown that cooperation trumps conflict," declared {diplomat}. "May this be the first of many such agreements."'
    ]
  },

  {
    eventType: 'ECONOMIC_CRISIS',
    headlineTemplates: [
      'Economic Crisis Grips {location}',
      '{faction} Economy in Freefall',
      'Market Crash: {faction} Currency Plummets',
      'Economic Emergency Declared in {location}',
      '{commodity} Shortage Triggers Economic Panic'
    ],
    leadTemplates: [
      '{faction} declared a state of economic emergency today as {trigger} sent markets into a tailspin.',
      'The crisis, which began {timeframe} ago, has intensified dramatically with {indicator} falling {percentage}%.',
      'Economists warn of {consequences} as the {faction} economy contracts at an unprecedented rate.'
    ],
    bodyTemplates: [
      'The immediate cause appears to be {cause}, though underlying factors include {underlyingFactors}.',
      'Government officials are implementing emergency measures including {measures}. However, analysts remain {sentiment}.',
      'The ripple effects are being felt across {region}, with {tradingPartners} also experiencing {secondaryEffects}.'
    ],
    quoteTemplates: [
      '"We are taking decisive action to stabilize the economy," assured {leader}. "These measures will {promise}."',
      '"This is the worst crisis in a generation," warned {economist}. "Recovery will require {requirements}."',
      '"Ordinary citizens are bearing the brunt of this disaster," noted {observer}. "Food prices have {foodPrices} and unemployment is {unemployment}."'
    ]
  },

  // DISCOVERY EVENTS
  {
    eventType: 'DISCOVERY',
    headlineTemplates: [
      'Groundbreaking Discovery in {location}',
      'Scientists Unveil {discovery}',
      '{discovery} Could Revolutionize {field}',
      'Unexpected Find: {discovery} Detected in {location}',
      'Major Scientific Breakthrough: {discovery}'
    ],
    leadTemplates: [
      'In what scientists are calling a {adjective} breakthrough, researchers have discovered {discovery} in {location}.',
      'The {discovery}, detected using {method}, could fundamentally change our understanding of {field}.',
      '{organization} announced today that their team has successfully {achievement}, marking a major milestone in {field}.'
    ],
    bodyTemplates: [
      'The discovery was made when {circumstance}. Lead researcher {scientist} explained that {explanation}.',
      'Potential applications include {applications}. Commercial development could begin within {timeframe}.',
      'The scientific community has responded with {reaction}. However, some experts caution that {caution}.'
    ],
    quoteTemplates: [
      '"This changes everything we thought we knew about {subject}," {scientist} declared. "The implications are staggering."',
      '"We\'ve only scratched the surface," explained {researcher}. "Further study will undoubtedly reveal {predictions}."',
      '"This is exactly the kind of breakthrough humanity needs," stated {official}. "It gives us hope for {hope}."'
    ]
  },

  // CRISIS EVENTS
  {
    eventType: 'STATION_DESTRUCTION',
    headlineTemplates: [
      'Tragedy: {station} Destroyed',
      '{casualties} Dead as {station} Explodes',
      'Catastrophe in Space: {station} Lost',
      '{station} Disaster Claims {casualties} Lives',
      'Breaking: {station} Suffers Catastrophic Failure'
    ],
    leadTemplates: [
      'The space community mourns tonight as {station} was destroyed in {cause}, claiming {casualties} lives.',
      'In one of the worst disasters in recent history, {station} suffered catastrophic {failure}, resulting in total loss of the facility.',
      'Emergency crews are searching for survivors after {station} {event}. Officials confirm {casualties} dead and {missing} missing.'
    ],
    bodyTemplates: [
      'The disaster occurred at approximately {time} when {sequence}. Witnesses report {witnessAccount}.',
      'Rescue operations are complicated by {complications}. Survivors describe {survivorAccount}.',
      'Investigators are examining {evidenceType} to determine the exact cause. Preliminary findings suggest {findings}.',
      'The tragedy has prompted calls for {safetyMeasures}. Regulators are reviewing {regulations}.'
    ],
    quoteTemplates: [
      '"Our hearts break for the families of those lost," said {official}. "We will determine what happened and ensure it never happens again."',
      '"I heard the explosion from {distance} away," {survivor} recounted. "It was {description}."',
      '"This is a preventable tragedy," {expert} argued. "We\'ve known about {risk} for years, but nothing was done."'
    ]
  },

  // DIPLOMATIC EVENTS
  {
    eventType: 'ALLIANCE_FORMED',
    headlineTemplates: [
      '{factionA} and {factionB} Form Alliance',
      'Historic Alliance: {members} Unite',
      'Strategic Partnership Announced Between {factionA}, {factionB}',
      '{allianceName} Alliance Formalized',
      'Mutual Defense Pact: {factionA} and {factionB} Join Forces'
    ],
    leadTemplates: [
      'In a ceremony marking a new era of cooperation, {factionA} and {factionB} have formalized a {typeAlliance} alliance.',
      'Leaders from {members} gathered today to sign a comprehensive partnership agreement covering {scope}.',
      'The newly formed {allianceName} alliance represents {percentage}% of {region}\'s economic and military power.'
    ],
    bodyTemplates: [
      'Key provisions include mutual defense commitments, joint economic initiatives, and {additionalProvisions}.',
      'The alliance is seen as a response to {threat}. Military cooperation will begin with {militaryCooperation}.',
      'Analysts predict this alliance will {predictions}. Critics warn of {concerns}.'
    ],
    quoteTemplates: [
      '"United we stand, divided we fall," declared {leader}. "This alliance makes us all safer and more prosperous."',
      '"Our shared values and common interests make this partnership natural," explained {diplomat}.',
      '"This changes the balance of power in the region," noted {analyst}. "Other factions will need to {response}."'
    ]
  }
];

// ====================================================================
// CHRONICLE NARRATIVE TEMPLATES
// ====================================================================

export const CHRONICLE_TEMPLATES = {
  war: {
    openings: [
      'The {warName} began not with a single shot, but with {triggerEvent}. What followed would reshape the political landscape of {region} for generations.',
      'Historians trace the roots of the {warName} to {underlyingCause}, though the immediate catalyst was {trigger}.',
      'When {initiatingFaction} moved against {defendingFaction}, few could have predicted the {duration}-long conflict that would ensue.',
      'The war that would come to be known as {warName} erupted from {cause}, quickly engulfing {region} in flames.'
    ],

    progressions: [
      'Early victories for {faction} gave way to {reversal} as {opposingFaction} adapted their tactics.',
      'The tide turned at {location} when {event}.',
      'As the conflict dragged on, both sides resorted to {escalation}, causing {consequences}.',
      'Civilian populations bore the brunt of the fighting, with {impact}.'
    ],

    closings: [
      'The war finally ended with {conclusion}, though the scars would remain for decades.',
      'Peace came at a terrible price: {cost}. The post-war order would be fundamentally different from what came before.',
      'When the last shots were fired, {winningFaction} emerged victorious, but {reflectionOnCost}.',
      'The {warName} taught a harsh lesson: {lesson}. Those who survived would never forget.'
    ]
  },

  goldenAge: {
    openings: [
      'The period now known as the {eraName} began when {trigger}, ushering in an age of unprecedented {aspect}.',
      'For {duration}, {region} experienced what historians call a golden age—a time when {achievements}.',
      'The {eraName} stands as a testament to what is possible when {conditions}.'
    ],

    achievements: [
      'Trade flourished, with {tradeVolume} exchanged annually across {routes}.',
      'Scientific advances included {discoveries}, fundamentally changing {field}.',
      'Cultural renaissance produced {culturalAchievements}.',
      'Living standards rose dramatically, with {metric} improving by {percentage}%.'
    ],

    closings: [
      'Though the golden age eventually gave way to {transition}, its legacy endures in {legacy}.',
      'The end came when {endingEvent}, but the prosperity of the {eraName} had laid foundations that would last centuries.',
      'All golden ages must end. When this one did, those who lived through it looked back with {emotion}.'
    ]
  },

  rise: {
    openings: [
      'The rise of {faction} is a story of {qualities}—a journey from {humbleBeginnings} to {pinnacle}.',
      'Few could have predicted that {faction}, once {pastState}, would become {currentState}.',
      '{faction}\'s ascent began with {catalyst}, though the seeds had been planted long before.'
    ],

    milestones: [
      'A turning point came when {event}, demonstrating {quality}.',
      'Strategic {decision} proved crucial, allowing {faction} to {achievement}.',
      'By securing {resource}, {faction} positioned itself for {nextPhase}.',
      'The conquest of {territory} marked {faction}\'s emergence as {status}.'
    ],

    reflections: [
      'The rise was not without cost: {sacrifices}.',
      'Critics pointed to {controversies}, even as supporters celebrated {achievements}.',
      'Whether this ascent can be sustained remains to be seen, as {challenges} loom ahead.'
    ]
  },

  tragedy: {
    openings: [
      'The {eventName} stands as one of the darkest moments in {region}\'s history—a tragedy that claimed {victims} and changed {aspect} forever.',
      'On that terrible day when {event}, the course of history was irrevocably altered.',
      'Some disasters announce themselves. Others, like {eventName}, strike without warning, leaving {aftermath} in their wake.'
    ],

    accounts: [
      'Survivors describe {description}. "{quote}," recalled {survivor}.',
      'The scale of the devastation became clear when {revelation}.',
      'In the immediate aftermath, {response}. But for many, {permanentImpact}.',
      'Rescue efforts were hampered by {obstacles}, resulting in {consequences}.'
    ],

    closings: [
      'Memorials now stand where {locationDescription}. The dead are remembered. The lessons, one hopes, will not be forgotten.',
      'From tragedy came {outcome}—small comfort for those who lost {loss}.',
      'The {eventName} serves as a grim reminder that {lesson}. May we never forget.'
    ]
  }
};

// ====================================================================
// LEGEND EMBELLISHMENT TEMPLATES
// ====================================================================

export const LEGEND_EMBELLISHMENTS = {
  heroic: [
    'single-handedly',
    'against impossible odds',
    'with courage that inspired all who witnessed it',
    'defying death itself',
    'when all hope seemed lost',
    'through sheer force of will'
  ],

  dramatic: [
    'in a moment that would be spoken of for generations',
    'as the stars themselves seemed to watch',
    'in defiance of fate',
    'changing the course of history',
    'in an act that transcended mortal understanding',
    'with consequences that echo to this day'
  ],

  mysterious: [
    'though some details remain shrouded in mystery',
    'in circumstances that scholars still debate',
    'under strange and portentous signs',
    'in ways not fully understood even now',
    'leaving questions that may never be answered',
    'amid omens and prophecies'
  ],

  exaggeration: [
    '(some say {multiplier}x that number)',
    'beyond counting',
    'more than can be believed',
    'in numbers that defy comprehension',
    'countless',
    'beyond measure'
  ]
};

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

export class ContentGenerator {
  private rng: () => number;

  constructor(seed?: number) {
    // Simple seeded random for consistent generation
    if (seed !== undefined) {
      let s = seed;
      this.rng = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    } else {
      this.rng = Math.random;
    }
  }

  /**
   * Select random item from array
   */
  public pick<T>(array: T[]): T {
    return array[Math.floor(this.rng() * array.length)];
  }

  /**
   * Get appropriate vocabulary for event type and action
   */
  public getVerb(category: keyof typeof VOCABULARY, action: string): string {
    const categoryVocab = VOCABULARY[category];
    if (categoryVocab && action in categoryVocab) {
      const verbs = (categoryVocab as any)[action];
      return this.pick(verbs);
    }
    return action; // fallback
  }

  /**
   * Get appropriate adjective
   */
  public getAdjective(tone: keyof typeof VOCABULARY.adjectives): string {
    return this.pick(VOCABULARY.adjectives[tone]);
  }

  /**
   * Get appropriate intensifier
   */
  public getIntensifier(intensity: keyof typeof VOCABULARY.intensifiers): string {
    return this.pick(VOCABULARY.intensifiers[intensity]);
  }

  /**
   * Get transition phrase
   */
  public getTransition(type: keyof typeof VOCABULARY.transitions): string {
    return this.pick(VOCABULARY.transitions[type]);
  }

  /**
   * Fill template with variables
   */
  public fillTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Generate a number with appropriate formatting
   */
  public formatNumber(num: number, exaggerate: number = 0): string {
    const multiplier = 1 + (exaggerate * 2);
    const value = Math.floor(num * multiplier);

    if (exaggerate > 0.5) {
      return `${this.formatLargeNumber(value)} ${this.pick(LEGEND_EMBELLISHMENTS.exaggeration)}`;
    }

    return this.formatLargeNumber(value);
  }

  /**
   * Format large numbers with appropriate units
   */
  private formatLargeNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)} million`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)} thousand`;
    }
    return num.toString();
  }

  /**
   * Generate dramatic description of event
   */
  public dramatize(baseDescription: string, intensity: number): string {
    const parts = [baseDescription];

    if (intensity >= 0.7) {
      parts.push(this.pick(LEGEND_EMBELLISHMENTS.dramatic));
    } else if (intensity >= 0.4) {
      parts.push(this.pick(LEGEND_EMBELLISHMENTS.heroic));
    }

    if (this.rng() < 0.3) {
      parts.push(this.pick(LEGEND_EMBELLISHMENTS.mysterious));
    }

    return parts.join(' ');
  }

  /**
   * Convert event to narrative prose
   */
  public narrativize(event: HistoricalEvent, perspective: 'heroic' | 'tragic' | 'neutral' = 'neutral'): string {
    const location = event.systemId || 'unknown space';
    const participants = event.participants.join(', ');

    let description = event.description;

    // Apply perspective
    if (perspective === 'heroic') {
      const enhancement = this.pick(LEGEND_EMBELLISHMENTS.heroic);
      description = `${description}, ${enhancement}`;
    } else if (perspective === 'tragic') {
      description = `Tragically, ${description.toLowerCase()}`;
    }

    // Add context
    const context = this.generateContext(event);

    return `${description}. ${context}`;
  }

  /**
   * Generate contextual information for event
   */
  private generateContext(event: HistoricalEvent): string {
    const contexts = [];

    if (event.severity >= 8) {
      contexts.push(`The ${this.getAdjective('epic')} event sent shockwaves across the region.`);
    } else if (event.severity >= 5) {
      contexts.push(`The incident had ${this.getAdjective('neutral')} ramifications.`);
    }

    if (event.participants.length > 2) {
      contexts.push(`Multiple factions became entangled in the affair.`);
    }

    if (event.witnessed) {
      contexts.push(`Eyewitnesses reported ${this.pick(['scenes of chaos', 'remarkable events', 'unprecedented activity'])}.`);
    }

    return contexts.length > 0 ? this.pick(contexts) : '';
  }

  /**
   * Generate quote from unnamed speaker
   */
  public generateQuote(eventType: string, tone: 'supportive' | 'critical' | 'neutral'): string {
    const quotes = {
      supportive: [
        "This represents a significant step forward.",
        "We fully support this decision and its implications.",
        "History will vindicate this course of action.",
        "The courage demonstrated here is commendable."
      ],
      critical: [
        "This is a grave mistake that will have lasting consequences.",
        "We strongly oppose this reckless action.",
        "The decision-makers failed to consider the full implications.",
        "This represents a dangerous precedent."
      ],
      neutral: [
        "Only time will tell if this was the right decision.",
        "The situation remains fluid and requires careful observation.",
        "Both sides present compelling arguments.",
        "The full ramifications may not be clear for some time."
      ]
    };

    return this.pick(quotes[tone]);
  }

  /**
   * Generate list of items with natural language
   */
  public formatList(items: string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;

    const allButLast = items.slice(0, -1).join(', ');
    const last = items[items.length - 1];
    return `${allButLast}, and ${last}`;
  }

  /**
   * Generate time description
   */
  public describeTime(timestamp: number, currentTime: number): string {
    const diff = currentTime - timestamp;

    if (diff < 60) return 'moments ago';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
    return `${Math.floor(diff / 31536000)} years ago`;
  }
}

/**
 * Get template for specific event type
 */
export function getNewsTemplate(eventType: string): NewsTemplate | undefined {
  return NEWS_TEMPLATES.find(t => t.eventType === eventType);
}

/**
 * Get chronicle template for type
 */
export function getChronicleTemplate(type: string): typeof CHRONICLE_TEMPLATES.war | undefined {
  const templates: Record<string, any> = CHRONICLE_TEMPLATES;
  return templates[type.toLowerCase()];
}
