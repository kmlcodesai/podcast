/**
 * Default configuration values for the Media List Builder
 */

import {
  MediaListConfig,
  Niche,
  OutputFormat,
  PublisherCategory,
  ScoringWeights
} from '../types';

/**
 * Default scoring weights optimized for AI visibility
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  crawlWeight: 0.25,
  authorityWeight: 0.25,
  topicalWeight: 0.25,
  aiSpecificWeight: 0.25
};

/**
 * Predefined niches for common use cases
 */
export const PREDEFINED_NICHES: Record<string, Niche> = {
  technology: {
    id: 'technology',
    name: 'Technology',
    description: 'Technology news, software, hardware, and digital innovation',
    keywords: [
      'technology', 'software', 'hardware', 'AI', 'artificial intelligence',
      'machine learning', 'cloud computing', 'cybersecurity', 'blockchain',
      'startups', 'tech industry', 'digital transformation'
    ],
    relatedTopics: ['business', 'science', 'innovation', 'entrepreneurship'],
    industries: ['software', 'hardware', 'telecommunications', 'internet'],
    audience: ['developers', 'IT professionals', 'tech executives', 'entrepreneurs']
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Healthcare, medical research, pharmaceuticals, and health tech',
    keywords: [
      'healthcare', 'medicine', 'pharmaceutical', 'biotech', 'clinical trials',
      'FDA', 'health tech', 'telemedicine', 'medical devices', 'patient care',
      'public health', 'medical research'
    ],
    relatedTopics: ['science', 'technology', 'policy', 'insurance'],
    industries: ['healthcare', 'pharmaceutical', 'biotech', 'medical devices'],
    audience: ['healthcare professionals', 'researchers', 'patients', 'policymakers']
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    description: 'Financial services, fintech, banking, and investment',
    keywords: [
      'finance', 'banking', 'fintech', 'investment', 'cryptocurrency',
      'stock market', 'venture capital', 'private equity', 'insurance',
      'payments', 'wealth management', 'financial regulation'
    ],
    relatedTopics: ['technology', 'business', 'economics', 'policy'],
    industries: ['banking', 'insurance', 'investment', 'payments'],
    audience: ['investors', 'financial professionals', 'executives', 'regulators']
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing & Advertising',
    description: 'Digital marketing, advertising, brand strategy, and martech',
    keywords: [
      'marketing', 'advertising', 'digital marketing', 'social media marketing',
      'content marketing', 'SEO', 'PPC', 'brand strategy', 'martech',
      'influencer marketing', 'email marketing', 'marketing automation'
    ],
    relatedTopics: ['technology', 'business', 'media', 'analytics'],
    industries: ['advertising', 'media', 'technology', 'retail'],
    audience: ['marketers', 'brand managers', 'CMOs', 'agency professionals']
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce & Retail',
    description: 'Online retail, e-commerce platforms, and retail technology',
    keywords: [
      'ecommerce', 'e-commerce', 'online retail', 'retail technology',
      'direct-to-consumer', 'marketplace', 'omnichannel', 'supply chain',
      'fulfillment', 'payments', 'customer experience', 'retail analytics'
    ],
    relatedTopics: ['technology', 'marketing', 'logistics', 'payments'],
    industries: ['retail', 'technology', 'logistics', 'payments'],
    audience: ['retailers', 'e-commerce managers', 'brand owners', 'logistics professionals']
  },
  sustainability: {
    id: 'sustainability',
    name: 'Sustainability & Climate',
    description: 'Climate tech, ESG, renewable energy, and sustainable business',
    keywords: [
      'sustainability', 'climate change', 'ESG', 'renewable energy',
      'clean tech', 'carbon neutral', 'green technology', 'circular economy',
      'sustainable business', 'environmental policy', 'climate tech'
    ],
    relatedTopics: ['technology', 'policy', 'business', 'science'],
    industries: ['energy', 'technology', 'manufacturing', 'transportation'],
    audience: ['sustainability professionals', 'investors', 'executives', 'policymakers']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Technology',
    description: 'Enterprise software, SaaS, cloud infrastructure, and IT',
    keywords: [
      'enterprise software', 'SaaS', 'cloud computing', 'IT infrastructure',
      'digital transformation', 'ERP', 'CRM', 'data analytics', 'DevOps',
      'enterprise security', 'IT management', 'business intelligence'
    ],
    relatedTopics: ['technology', 'business', 'security', 'cloud'],
    industries: ['software', 'IT services', 'consulting', 'cloud'],
    audience: ['CIOs', 'IT directors', 'enterprise architects', 'developers']
  },
  media: {
    id: 'media',
    name: 'Media & Entertainment',
    description: 'Media industry, streaming, content creation, and entertainment tech',
    keywords: [
      'media', 'entertainment', 'streaming', 'content creation', 'video',
      'podcast', 'publishing', 'journalism', 'social media', 'creator economy',
      'media technology', 'digital content'
    ],
    relatedTopics: ['technology', 'marketing', 'business', 'culture'],
    industries: ['media', 'entertainment', 'technology', 'publishing'],
    audience: ['media professionals', 'content creators', 'executives', 'journalists']
  }
};

/**
 * Default media list configuration
 */
export const DEFAULT_MEDIA_LIST_CONFIG: MediaListConfig = {
  niches: [],
  minAIVisibilityScore: 50,
  maxPublishers: 100,
  includeCategories: [
    PublisherCategory.NEWS,
    PublisherCategory.MAGAZINE,
    PublisherCategory.TRADE_PUBLICATION,
    PublisherCategory.INDUSTRY_ANALYST,
    PublisherCategory.BLOG
  ],
  excludeCategories: [],
  excludeDomains: [],
  scoringWeights: DEFAULT_SCORING_WEIGHTS,
  outputFormat: OutputFormat.JSON
};

/**
 * Common Crawl configuration
 */
export const COMMON_CRAWL_CONFIG = {
  baseUrl: 'https://index.commoncrawl.org',
  cdxServerUrl: 'https://index.commoncrawl.org/CC-MAIN-2024-10-index',
  collIndexUrl: 'https://index.commoncrawl.org/collinfo.json',
  maxResultsPerQuery: 10000,
  requestTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

/**
 * Tier thresholds for publisher classification
 */
export const TIER_THRESHOLDS = {
  tier1: 80, // Score >= 80
  tier2: 65, // Score >= 65
  tier3: 50, // Score >= 50
  tier4: 0   // Score < 50
};

/**
 * Score component weights for AI visibility calculation
 */
export const AI_VISIBILITY_WEIGHTS = {
  // Crawl signals
  crawlFrequency: 0.15,
  contentFreshness: 0.10,

  // Authority signals
  domainAuthority: 0.12,
  trustFlow: 0.08,
  referringDomains: 0.10,

  // Topical signals
  nicheDepth: 0.10,
  expertAuthors: 0.08,
  originalResearch: 0.07,

  // AI-specific signals
  trainingDataLikelihood: 0.08,
  structuredData: 0.05,
  semanticClarity: 0.04,
  eeat: 0.03
};
