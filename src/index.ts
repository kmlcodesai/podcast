/**
 * Media List Builder
 * AI visibility-optimized publisher identification tool for earned media and SEO teams
 *
 * This tool helps identify publishers that matter most for AI visibility using:
 * - Common Crawl data and crawl frequency signals
 * - Web authority metrics (domain authority, trust flow, backlinks)
 * - Topical relevance and niche depth analysis
 * - AI-specific signals (training data likelihood, structured data, E-E-A-T)
 *
 * @module media-list-builder
 */

// Types
export * from './types';

// Configuration
export { PREDEFINED_NICHES, DEFAULT_SCORING_WEIGHTS, DEFAULT_MEDIA_LIST_CONFIG, TIER_THRESHOLDS, AI_VISIBILITY_WEIGHTS, COMMON_CRAWL_CONFIG } from './config/defaults';

// Services
export { CommonCrawlService, commonCrawlService } from './services/commonCrawlService';
export { ScoringService, scoringService } from './services/scoringService';
export { PublisherService, publisherService } from './services/publisherService';
export { OutputService, outputService } from './services/outputService';

// Utilities
export * from './utils/helpers';

// Sample Data
export { getAllPublishers, getPublishersByNiche, technologyPublishers, marketingPublishers, financePublishers, healthcarePublishers, ecommercePublishers, sustainabilityPublishers } from './data/samplePublishers';

/**
 * Quick start example:
 *
 * ```typescript
 * import {
 *   PublisherService,
 *   OutputService,
 *   getAllPublishers,
 *   PREDEFINED_NICHES,
 *   OutputFormat
 * } from 'media-list-builder';
 *
 * async function buildMediaList() {
 *   const publisherService = new PublisherService();
 *   const outputService = new OutputService();
 *
 *   // Get publishers for technology niche
 *   const publishers = getAllPublishers();
 *
 *   // Build media list
 *   const result = await publisherService.buildMediaList(publishers, {
 *     niches: [PREDEFINED_NICHES.technology],
 *     maxPublishers: 25,
 *     minAIVisibilityScore: 50
 *   });
 *
 *   // Output as markdown
 *   const markdown = outputService.format(result, OutputFormat.MARKDOWN);
 *   console.log(markdown);
 * }
 * ```
 */
