/**
 * Publisher Analysis and Ranking Service
 * Analyzes publishers, generates signals, and creates ranked media lists
 */

import {
  Publisher,
  PublisherCategory,
  PublisherSignals,
  RankedPublisher,
  PublisherTier,
  MediaListConfig,
  MediaListResult,
  MediaListSummary,
  Niche,
  CrawlSignals,
  AuthoritySignals,
  TopicalSignals,
  AIVisibilitySignals
} from '../types';
import { CommonCrawlService, commonCrawlService } from './commonCrawlService';
import { ScoringService, scoringService } from './scoringService';
import { TIER_THRESHOLDS, DEFAULT_MEDIA_LIST_CONFIG } from '../config/defaults';
import { generateId } from '../utils/helpers';

export class PublisherService {
  private crawlService: CommonCrawlService;
  private scoreService: ScoringService;

  constructor(
    crawlService: CommonCrawlService = commonCrawlService,
    scoreService: ScoringService = scoringService
  ) {
    this.crawlService = crawlService;
    this.scoreService = scoreService;
  }

  /**
   * Analyze a single publisher and generate all signals
   */
  async analyzePublisher(publisher: Publisher): Promise<PublisherSignals> {
    // Fetch crawl signals from Common Crawl
    const crawlResult = await this.crawlService.analyzeCrawlHistory(publisher.domain);
    const crawlSignals: CrawlSignals = crawlResult.success && crawlResult.data
      ? crawlResult.data
      : this.getDefaultCrawlSignals();

    // Generate authority signals (in production, these would come from external APIs)
    const authoritySignals = this.estimateAuthoritySignals(publisher, crawlSignals);

    // Generate topical signals based on publisher data
    const topicalSignals = this.analyzeTopicalSignals(publisher);

    // Generate AI visibility signals
    const aiVisibilitySignals = this.estimateAIVisibilitySignals(
      publisher,
      crawlSignals,
      authoritySignals
    );

    return {
      publisherId: publisher.id,
      domain: publisher.domain,
      crawlSignals,
      authoritySignals,
      topicalSignals,
      aiVisibilitySignals,
      lastUpdated: new Date()
    };
  }

  /**
   * Rank a list of publishers for AI visibility
   */
  async rankPublishers(
    publishers: Publisher[],
    config: Partial<MediaListConfig> = {}
  ): Promise<RankedPublisher[]> {
    const fullConfig = { ...DEFAULT_MEDIA_LIST_CONFIG, ...config };
    const targetNiche = fullConfig.niches.length > 0 ? fullConfig.niches[0] : undefined;

    // Filter publishers by category
    const filteredPublishers = this.filterPublishers(publishers, fullConfig);

    // Analyze and score each publisher
    const rankedPublishers: RankedPublisher[] = [];

    for (const publisher of filteredPublishers) {
      const signals = await this.analyzePublisher(publisher);
      const aiVisibilityScore = this.scoreService.calculateAIVisibilityScore(
        signals,
        targetNiche
      );

      // Skip publishers below minimum score threshold
      if (aiVisibilityScore.overallScore < fullConfig.minAIVisibilityScore) {
        continue;
      }

      const tier = this.determineTier(aiVisibilityScore.overallScore);
      const recommendation = this.generateRecommendation(publisher, aiVisibilityScore, tier);

      rankedPublishers.push({
        publisher,
        signals,
        aiVisibilityScore,
        rank: 0, // Will be set after sorting
        tier,
        recommendation
      });
    }

    // Sort by overall score descending
    rankedPublishers.sort((a, b) =>
      b.aiVisibilityScore.overallScore - a.aiVisibilityScore.overallScore
    );

    // Assign ranks and limit results
    return rankedPublishers
      .slice(0, fullConfig.maxPublishers)
      .map((rp, index) => ({
        ...rp,
        rank: index + 1
      }));
  }

  /**
   * Build a complete media list with summary statistics
   */
  async buildMediaList(
    publishers: Publisher[],
    config: Partial<MediaListConfig> = {}
  ): Promise<MediaListResult> {
    const fullConfig = { ...DEFAULT_MEDIA_LIST_CONFIG, ...config };
    const rankedPublishers = await this.rankPublishers(publishers, fullConfig);
    const summary = this.calculateSummary(rankedPublishers);

    return {
      id: generateId(),
      generatedAt: new Date(),
      config: fullConfig,
      publishers: rankedPublishers,
      summary
    };
  }

  /**
   * Filter publishers based on configuration
   */
  private filterPublishers(
    publishers: Publisher[],
    config: MediaListConfig
  ): Publisher[] {
    return publishers.filter(publisher => {
      // Check category inclusion
      if (
        config.includeCategories.length > 0 &&
        !config.includeCategories.includes(publisher.category)
      ) {
        return false;
      }

      // Check category exclusion
      if (config.excludeCategories.includes(publisher.category)) {
        return false;
      }

      // Check domain exclusion
      if (config.excludeDomains.includes(publisher.domain)) {
        return false;
      }

      // Check niche relevance if specified
      if (config.niches.length > 0) {
        const isRelevant = config.niches.some(niche =>
          this.isPublisherRelevantToNiche(publisher, niche)
        );
        if (!isRelevant) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if a publisher is relevant to a specific niche
   */
  private isPublisherRelevantToNiche(publisher: Publisher, niche: Niche): boolean {
    const publisherTopics = publisher.topics.map(t => t.toLowerCase());

    // Check keyword overlap
    for (const keyword of niche.keywords) {
      if (publisherTopics.some(t => t.includes(keyword.toLowerCase()))) {
        return true;
      }
    }

    // Check related topic overlap
    for (const topic of niche.relatedTopics) {
      if (publisherTopics.some(t => t.includes(topic.toLowerCase()))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine publisher tier based on score
   */
  private determineTier(score: number): PublisherTier {
    if (score >= TIER_THRESHOLDS.tier1) {
      return PublisherTier.TIER_1;
    } else if (score >= TIER_THRESHOLDS.tier2) {
      return PublisherTier.TIER_2;
    } else if (score >= TIER_THRESHOLDS.tier3) {
      return PublisherTier.TIER_3;
    } else {
      return PublisherTier.TIER_4;
    }
  }

  /**
   * Generate a recommendation based on publisher analysis
   */
  private generateRecommendation(
    publisher: Publisher,
    score: any,
    tier: PublisherTier
  ): string {
    const tierMessages = {
      [PublisherTier.TIER_1]: 'High-priority target for AI visibility. Strong likelihood of influencing LLM training data and citations.',
      [PublisherTier.TIER_2]: 'Recommended target with solid AI visibility signals. Good potential for in-model recognition.',
      [PublisherTier.TIER_3]: 'Moderate AI visibility potential. Consider for niche-specific campaigns.',
      [PublisherTier.TIER_4]: 'Lower AI visibility but may offer niche value for specific audiences.'
    };

    let recommendation = tierMessages[tier];

    // Add specific guidance based on top factors
    if (score.topFactors && score.topFactors.length > 0) {
      const topFactor = score.topFactors[0];
      recommendation += ` Strongest signal: ${topFactor.name}.`;
    }

    // Add improvement suggestions
    if (score.weaknesses && score.weaknesses.length > 0) {
      recommendation += ` Note: ${score.weaknesses[0]}`;
    }

    return recommendation;
  }

  /**
   * Calculate summary statistics for a media list
   */
  private calculateSummary(publishers: RankedPublisher[]): MediaListSummary {
    if (publishers.length === 0) {
      return {
        totalPublishers: 0,
        avgAIVisibilityScore: 0,
        tierDistribution: {
          [PublisherTier.TIER_1]: 0,
          [PublisherTier.TIER_2]: 0,
          [PublisherTier.TIER_3]: 0,
          [PublisherTier.TIER_4]: 0
        },
        topCategories: [],
        topTopics: [],
        scoreRange: { min: 0, max: 0 }
      };
    }

    const scores = publishers.map(p => p.aiVisibilityScore.overallScore);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    // Calculate tier distribution
    const tierDistribution = {
      [PublisherTier.TIER_1]: 0,
      [PublisherTier.TIER_2]: 0,
      [PublisherTier.TIER_3]: 0,
      [PublisherTier.TIER_4]: 0
    };
    publishers.forEach(p => {
      tierDistribution[p.tier]++;
    });

    // Calculate category distribution
    const categoryCounts: Record<string, number> = {};
    publishers.forEach(p => {
      const cat = p.publisher.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category: category as PublisherCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate topic distribution
    const topicCounts: Record<string, number> = {};
    publishers.forEach(p => {
      p.publisher.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    const topTopics = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalPublishers: publishers.length,
      avgAIVisibilityScore: Math.round(avgScore * 100) / 100,
      tierDistribution,
      topCategories,
      topTopics,
      scoreRange: {
        min: Math.min(...scores),
        max: Math.max(...scores)
      }
    };
  }

  /**
   * Get default crawl signals when Common Crawl data is unavailable
   */
  private getDefaultCrawlSignals(): CrawlSignals {
    return {
      crawlFrequency: 0,
      totalPagesIndexed: 0,
      lastCrawlDate: new Date(),
      avgCrawlInterval: 0,
      contentFreshnessScore: 50,
      archivePresenceMonths: 0
    };
  }

  /**
   * Estimate authority signals based on available data
   * In production, these would come from external APIs (Moz, Ahrefs, etc.)
   */
  private estimateAuthoritySignals(
    publisher: Publisher,
    crawlSignals: CrawlSignals
  ): AuthoritySignals {
    // Estimate domain authority based on crawl presence and category
    let baseDA = 30;

    // Boost for high crawl frequency
    baseDA += Math.min(20, crawlSignals.crawlFrequency * 3);

    // Boost for archive presence
    baseDA += Math.min(15, crawlSignals.archivePresenceMonths * 0.5);

    // Category-based adjustments
    const categoryBoosts: Record<PublisherCategory, number> = {
      [PublisherCategory.NEWS]: 15,
      [PublisherCategory.MAGAZINE]: 12,
      [PublisherCategory.TRADE_PUBLICATION]: 10,
      [PublisherCategory.ACADEMIC]: 18,
      [PublisherCategory.GOVERNMENT]: 20,
      [PublisherCategory.INDUSTRY_ANALYST]: 10,
      [PublisherCategory.BLOG]: 0,
      [PublisherCategory.PODCAST]: 5,
      [PublisherCategory.VIDEO]: 5,
      [PublisherCategory.SOCIAL]: 0,
      [PublisherCategory.OTHER]: 0
    };
    baseDA += categoryBoosts[publisher.category] || 0;

    const domainAuthority = Math.min(100, Math.round(baseDA));

    return {
      domainAuthority,
      referringDomains: Math.round(Math.pow(10, domainAuthority / 25)),
      totalBacklinks: Math.round(Math.pow(10, domainAuthority / 20)),
      trustFlow: Math.round(domainAuthority * 0.8),
      citationFlow: Math.round(domainAuthority * 0.7),
      spamScore: Math.max(0, 30 - domainAuthority * 0.3)
    };
  }

  /**
   * Analyze topical signals from publisher data
   */
  private analyzeTopicalSignals(publisher: Publisher): TopicalSignals {
    const topicRelevanceScores = new Map<string, number>();

    // Assign relevance scores to publisher topics
    publisher.topics.forEach((topic, index) => {
      // Primary topics get higher scores
      const score = Math.max(0.3, 1 - (index * 0.15));
      topicRelevanceScores.set(topic.toLowerCase(), score);
    });

    // Estimate niche depth based on topic count and category
    let nicheDepth = Math.min(100, publisher.topics.length * 15);
    if (publisher.category === PublisherCategory.TRADE_PUBLICATION) {
      nicheDepth = Math.min(100, nicheDepth + 20);
    }

    // Estimate expert author score based on category
    const expertAuthorScores: Record<PublisherCategory, number> = {
      [PublisherCategory.ACADEMIC]: 90,
      [PublisherCategory.INDUSTRY_ANALYST]: 80,
      [PublisherCategory.TRADE_PUBLICATION]: 70,
      [PublisherCategory.NEWS]: 60,
      [PublisherCategory.MAGAZINE]: 55,
      [PublisherCategory.GOVERNMENT]: 85,
      [PublisherCategory.BLOG]: 40,
      [PublisherCategory.PODCAST]: 50,
      [PublisherCategory.VIDEO]: 45,
      [PublisherCategory.SOCIAL]: 30,
      [PublisherCategory.OTHER]: 35
    };

    return {
      primaryTopics: publisher.topics.slice(0, 5),
      topicRelevanceScores,
      nicheDepthScore: nicheDepth,
      expertAuthorScore: expertAuthorScores[publisher.category] || 40,
      originalResearchScore: this.estimateResearchScore(publisher)
    };
  }

  /**
   * Estimate original research score
   */
  private estimateResearchScore(publisher: Publisher): number {
    const researchScores: Record<PublisherCategory, number> = {
      [PublisherCategory.ACADEMIC]: 95,
      [PublisherCategory.INDUSTRY_ANALYST]: 85,
      [PublisherCategory.GOVERNMENT]: 75,
      [PublisherCategory.TRADE_PUBLICATION]: 60,
      [PublisherCategory.NEWS]: 50,
      [PublisherCategory.MAGAZINE]: 45,
      [PublisherCategory.BLOG]: 30,
      [PublisherCategory.PODCAST]: 25,
      [PublisherCategory.VIDEO]: 20,
      [PublisherCategory.SOCIAL]: 10,
      [PublisherCategory.OTHER]: 20
    };

    return researchScores[publisher.category] || 30;
  }

  /**
   * Estimate AI visibility signals
   */
  private estimateAIVisibilitySignals(
    publisher: Publisher,
    crawlSignals: CrawlSignals,
    authoritySignals: AuthoritySignals
  ): AIVisibilitySignals {
    // Estimate training data likelihood based on multiple factors
    let trainingLikelihood = 30;
    trainingLikelihood += Math.min(25, crawlSignals.archivePresenceMonths * 0.5);
    trainingLikelihood += Math.min(20, authoritySignals.domainAuthority * 0.2);
    trainingLikelihood += Math.min(15, crawlSignals.crawlFrequency * 2);

    // Category adjustments for training data
    if ([PublisherCategory.NEWS, PublisherCategory.ACADEMIC, PublisherCategory.GOVERNMENT]
        .includes(publisher.category)) {
      trainingLikelihood += 10;
    }

    // Estimate AI citation score
    const aiCitationScore = Math.round(
      authoritySignals.domainAuthority * 0.6 +
      crawlSignals.contentFreshnessScore * 0.4
    );

    // Estimate structured data score
    const structuredDataScore = this.estimateStructuredDataScore(publisher);

    // Estimate crawlability
    const crawlabilityScore = Math.min(100, 60 + crawlSignals.crawlFrequency * 5);

    // Estimate semantic clarity
    const semanticClarityScore = this.estimateSemanticClarityScore(publisher);

    // Calculate E-E-A-T score
    const eeatScore = Math.round(
      authoritySignals.trustFlow * 0.3 +
      (100 - authoritySignals.spamScore) * 0.2 +
      this.getExpertiseScore(publisher) * 0.5
    );

    return {
      trainingDataLikelihood: Math.min(100, Math.round(trainingLikelihood)),
      aiCitationScore: Math.min(100, aiCitationScore),
      structuredDataScore,
      crawlabilityScore,
      semanticClarityScore,
      eeatScore: Math.min(100, eeatScore)
    };
  }

  /**
   * Estimate structured data implementation score
   */
  private estimateStructuredDataScore(publisher: Publisher): number {
    const baseScores: Record<PublisherCategory, number> = {
      [PublisherCategory.NEWS]: 75,
      [PublisherCategory.MAGAZINE]: 65,
      [PublisherCategory.TRADE_PUBLICATION]: 60,
      [PublisherCategory.ACADEMIC]: 55,
      [PublisherCategory.GOVERNMENT]: 50,
      [PublisherCategory.INDUSTRY_ANALYST]: 70,
      [PublisherCategory.BLOG]: 45,
      [PublisherCategory.PODCAST]: 55,
      [PublisherCategory.VIDEO]: 60,
      [PublisherCategory.SOCIAL]: 70,
      [PublisherCategory.OTHER]: 40
    };

    return baseScores[publisher.category] || 50;
  }

  /**
   * Estimate semantic clarity score
   */
  private estimateSemanticClarityScore(publisher: Publisher): number {
    const baseScores: Record<PublisherCategory, number> = {
      [PublisherCategory.ACADEMIC]: 85,
      [PublisherCategory.INDUSTRY_ANALYST]: 80,
      [PublisherCategory.TRADE_PUBLICATION]: 75,
      [PublisherCategory.NEWS]: 70,
      [PublisherCategory.GOVERNMENT]: 70,
      [PublisherCategory.MAGAZINE]: 65,
      [PublisherCategory.BLOG]: 55,
      [PublisherCategory.PODCAST]: 50,
      [PublisherCategory.VIDEO]: 45,
      [PublisherCategory.SOCIAL]: 40,
      [PublisherCategory.OTHER]: 50
    };

    return baseScores[publisher.category] || 55;
  }

  /**
   * Get expertise score based on publisher characteristics
   */
  private getExpertiseScore(publisher: Publisher): number {
    const expertiseScores: Record<PublisherCategory, number> = {
      [PublisherCategory.ACADEMIC]: 95,
      [PublisherCategory.GOVERNMENT]: 85,
      [PublisherCategory.INDUSTRY_ANALYST]: 80,
      [PublisherCategory.TRADE_PUBLICATION]: 75,
      [PublisherCategory.NEWS]: 65,
      [PublisherCategory.MAGAZINE]: 60,
      [PublisherCategory.BLOG]: 45,
      [PublisherCategory.PODCAST]: 50,
      [PublisherCategory.VIDEO]: 45,
      [PublisherCategory.SOCIAL]: 35,
      [PublisherCategory.OTHER]: 40
    };

    return expertiseScores[publisher.category] || 50;
  }
}

export const publisherService = new PublisherService();
