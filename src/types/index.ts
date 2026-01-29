/**
 * Core types for the Media List Builder tool
 * Defines publishers, AI visibility signals, rankings, and configuration
 */

/**
 * Represents a publisher/media outlet with its metadata
 */
export interface Publisher {
  id: string;
  domain: string;
  name: string;
  description?: string;
  category: PublisherCategory;
  topics: string[];
  metadata: PublisherMetadata;
}

/**
 * Publisher categorization for filtering
 */
export enum PublisherCategory {
  NEWS = 'news',
  MAGAZINE = 'magazine',
  BLOG = 'blog',
  TRADE_PUBLICATION = 'trade_publication',
  ACADEMIC = 'academic',
  GOVERNMENT = 'government',
  INDUSTRY_ANALYST = 'industry_analyst',
  PODCAST = 'podcast',
  VIDEO = 'video',
  SOCIAL = 'social',
  OTHER = 'other'
}

/**
 * Additional metadata about a publisher
 */
export interface PublisherMetadata {
  foundedYear?: number;
  headquarters?: string;
  parentCompany?: string;
  editorInChief?: string;
  socialProfiles?: SocialProfiles;
  contactInfo?: ContactInfo;
}

export interface SocialProfiles {
  twitter?: string;
  linkedin?: string;
  facebook?: string;
}

export interface ContactInfo {
  email?: string;
  pressEmail?: string;
  phone?: string;
}

/**
 * Common Crawl data signals
 */
export interface CrawlSignals {
  /** Number of times the domain appears in Common Crawl archives */
  crawlFrequency: number;
  /** Total pages indexed from this domain */
  totalPagesIndexed: number;
  /** Most recent crawl date */
  lastCrawlDate: Date;
  /** Average time between crawls (in days) */
  avgCrawlInterval: number;
  /** Content freshness score (how often new content appears) */
  contentFreshnessScore: number;
  /** Historical presence in crawl archives (months) */
  archivePresenceMonths: number;
}

/**
 * Web authority metrics
 */
export interface AuthoritySignals {
  /** Domain authority score (0-100) */
  domainAuthority: number;
  /** Number of unique referring domains */
  referringDomains: number;
  /** Backlink count */
  totalBacklinks: number;
  /** Trust flow score (0-100) */
  trustFlow: number;
  /** Citation flow score (0-100) */
  citationFlow: number;
  /** Spam score (0-100, lower is better) */
  spamScore: number;
}

/**
 * Topical relevance signals
 */
export interface TopicalSignals {
  /** Primary topics this publisher covers */
  primaryTopics: string[];
  /** Topic relevance scores (topic -> score 0-1) */
  topicRelevanceScores: Map<string, number>;
  /** Content depth score for the niche (0-100) */
  nicheDepthScore: number;
  /** Expert author presence score (0-100) */
  expertAuthorScore: number;
  /** Original research/data publication frequency */
  originalResearchScore: number;
}

/**
 * AI-specific visibility signals
 */
export interface AIVisibilitySignals {
  /** Likelihood of being in LLM training data (0-100) */
  trainingDataLikelihood: number;
  /** Citation frequency in AI-generated content (estimated) */
  aiCitationScore: number;
  /** Structured data quality score (0-100) */
  structuredDataScore: number;
  /** Content accessibility for crawlers (0-100) */
  crawlabilityScore: number;
  /** Semantic clarity of content (0-100) */
  semanticClarityScore: number;
  /** E-E-A-T signal strength (Experience, Expertise, Authority, Trust) */
  eeatScore: number;
}

/**
 * Combined signals for a publisher
 */
export interface PublisherSignals {
  publisherId: string;
  domain: string;
  crawlSignals: CrawlSignals;
  authoritySignals: AuthoritySignals;
  topicalSignals: TopicalSignals;
  aiVisibilitySignals: AIVisibilitySignals;
  lastUpdated: Date;
}

/**
 * Calculated AI visibility score with breakdown
 */
export interface AIVisibilityScore {
  /** Overall composite score (0-100) */
  overallScore: number;
  /** Score breakdown by category */
  breakdown: ScoreBreakdown;
  /** Ranking factors that contributed most */
  topFactors: RankingFactor[];
  /** Areas for improvement */
  weaknesses: string[];
  /** Confidence level of the score (0-1) */
  confidence: number;
}

export interface ScoreBreakdown {
  crawlScore: number;
  authorityScore: number;
  topicalScore: number;
  aiSpecificScore: number;
}

export interface RankingFactor {
  name: string;
  score: number;
  weight: number;
  contribution: number;
}

/**
 * Publisher with full scoring for ranking
 */
export interface RankedPublisher {
  publisher: Publisher;
  signals: PublisherSignals;
  aiVisibilityScore: AIVisibilityScore;
  rank: number;
  tier: PublisherTier;
  recommendation: string;
}

/**
 * Publisher tier classification
 */
export enum PublisherTier {
  /** Highest AI visibility - must target */
  TIER_1 = 'tier_1',
  /** High AI visibility - strongly recommended */
  TIER_2 = 'tier_2',
  /** Moderate AI visibility - good opportunities */
  TIER_3 = 'tier_3',
  /** Lower AI visibility - niche value */
  TIER_4 = 'tier_4'
}

/**
 * Niche/vertical definition for targeting
 */
export interface Niche {
  id: string;
  name: string;
  description: string;
  /** Primary keywords defining this niche */
  keywords: string[];
  /** Related/adjacent topics */
  relatedTopics: string[];
  /** Industry verticals */
  industries: string[];
  /** Target audience descriptors */
  audience: string[];
}

/**
 * Configuration for building a media list
 */
export interface MediaListConfig {
  /** Target niche(s) for the list */
  niches: Niche[];
  /** Minimum AI visibility score threshold */
  minAIVisibilityScore: number;
  /** Maximum number of publishers to include */
  maxPublishers: number;
  /** Publisher categories to include */
  includeCategories: PublisherCategory[];
  /** Publisher categories to exclude */
  excludeCategories: PublisherCategory[];
  /** Specific domains to exclude */
  excludeDomains: string[];
  /** Weight adjustments for scoring */
  scoringWeights: ScoringWeights;
  /** Output format preferences */
  outputFormat: OutputFormat;
}

/**
 * Customizable weights for the scoring algorithm
 */
export interface ScoringWeights {
  /** Weight for crawl frequency signals (0-1) */
  crawlWeight: number;
  /** Weight for authority signals (0-1) */
  authorityWeight: number;
  /** Weight for topical relevance (0-1) */
  topicalWeight: number;
  /** Weight for AI-specific signals (0-1) */
  aiSpecificWeight: number;
}

/**
 * Output format options
 */
export enum OutputFormat {
  JSON = 'json',
  CSV = 'csv',
  MARKDOWN = 'markdown',
  HTML = 'html'
}

/**
 * Generated media list result
 */
export interface MediaListResult {
  /** Unique identifier for this list */
  id: string;
  /** When the list was generated */
  generatedAt: Date;
  /** Configuration used to generate */
  config: MediaListConfig;
  /** Ranked publishers in the list */
  publishers: RankedPublisher[];
  /** Summary statistics */
  summary: MediaListSummary;
}

/**
 * Summary statistics for a media list
 */
export interface MediaListSummary {
  totalPublishers: number;
  avgAIVisibilityScore: number;
  tierDistribution: Record<PublisherTier, number>;
  topCategories: Array<{ category: PublisherCategory; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  scoreRange: { min: number; max: number };
}

/**
 * Common Crawl index metadata
 */
export interface CommonCrawlIndex {
  id: string;
  name: string;
  timegate: string;
  cdxApi: string;
}

/**
 * Common Crawl query result
 */
export interface CommonCrawlResult {
  url: string;
  timestamp: string;
  status: string;
  mime: string;
  length: number;
  digest: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: Date;
    processingTime: number;
  };
}
