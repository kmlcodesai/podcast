/**
 * AI Visibility Scoring Service
 * Calculates composite AI visibility scores for publishers
 * based on crawl signals, authority metrics, topical relevance, and AI-specific factors
 */

import {
  AIVisibilityScore,
  AuthoritySignals,
  CrawlSignals,
  PublisherSignals,
  RankingFactor,
  ScoreBreakdown,
  ScoringWeights,
  TopicalSignals,
  AIVisibilitySignals,
  Niche
} from '../types';
import { AI_VISIBILITY_WEIGHTS, DEFAULT_SCORING_WEIGHTS } from '../config/defaults';

export class ScoringService {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Update scoring weights
   */
  setWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Calculate the comprehensive AI visibility score for a publisher
   */
  calculateAIVisibilityScore(
    signals: PublisherSignals,
    targetNiche?: Niche
  ): AIVisibilityScore {
    const breakdown = this.calculateScoreBreakdown(signals, targetNiche);
    const overallScore = this.calculateOverallScore(breakdown);
    const topFactors = this.identifyTopFactors(signals, targetNiche);
    const weaknesses = this.identifyWeaknesses(signals, breakdown);
    const confidence = this.calculateConfidence(signals);

    return {
      overallScore,
      breakdown,
      topFactors,
      weaknesses,
      confidence
    };
  }

  /**
   * Calculate score breakdown by category
   */
  private calculateScoreBreakdown(
    signals: PublisherSignals,
    targetNiche?: Niche
  ): ScoreBreakdown {
    const crawlScore = this.calculateCrawlScore(signals.crawlSignals);
    const authorityScore = this.calculateAuthorityScore(signals.authoritySignals);
    const topicalScore = this.calculateTopicalScore(signals.topicalSignals, targetNiche);
    const aiSpecificScore = this.calculateAISpecificScore(signals.aiVisibilitySignals);

    return {
      crawlScore,
      authorityScore,
      topicalScore,
      aiSpecificScore
    };
  }

  /**
   * Calculate overall weighted score from breakdown
   */
  private calculateOverallScore(breakdown: ScoreBreakdown): number {
    const weightedScore =
      breakdown.crawlScore * this.weights.crawlWeight +
      breakdown.authorityScore * this.weights.authorityWeight +
      breakdown.topicalScore * this.weights.topicalWeight +
      breakdown.aiSpecificScore * this.weights.aiSpecificWeight;

    // Normalize to ensure total weight = 1
    const totalWeight =
      this.weights.crawlWeight +
      this.weights.authorityWeight +
      this.weights.topicalWeight +
      this.weights.aiSpecificWeight;

    return Math.round((weightedScore / totalWeight) * 100) / 100;
  }

  /**
   * Calculate crawl-based score component
   */
  private calculateCrawlScore(crawlSignals: CrawlSignals): number {
    let score = 0;

    // Crawl frequency contribution (0-30)
    const frequencyScore = Math.min(30, crawlSignals.crawlFrequency * 5);
    score += frequencyScore;

    // Pages indexed contribution (0-25)
    const pagesScore = Math.min(
      25,
      Math.log10(Math.max(1, crawlSignals.totalPagesIndexed)) * 5
    );
    score += pagesScore;

    // Content freshness contribution (0-25)
    score += crawlSignals.contentFreshnessScore * 0.25;

    // Archive presence contribution (0-20)
    const archiveScore = Math.min(20, crawlSignals.archivePresenceMonths * 0.4);
    score += archiveScore;

    return Math.round(Math.min(100, score));
  }

  /**
   * Calculate authority-based score component
   */
  private calculateAuthorityScore(authoritySignals: AuthoritySignals): number {
    let score = 0;

    // Domain authority (0-35)
    score += authoritySignals.domainAuthority * 0.35;

    // Trust flow (0-20)
    score += authoritySignals.trustFlow * 0.20;

    // Referring domains (0-25)
    const refDomainsScore = Math.min(
      25,
      Math.log10(Math.max(1, authoritySignals.referringDomains)) * 5
    );
    score += refDomainsScore;

    // Citation flow (0-15)
    score += authoritySignals.citationFlow * 0.15;

    // Spam score penalty (0 to -10)
    const spamPenalty = Math.min(10, authoritySignals.spamScore * 0.1);
    score -= spamPenalty;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate topical relevance score component
   */
  private calculateTopicalScore(
    topicalSignals: TopicalSignals,
    targetNiche?: Niche
  ): number {
    let score = 0;

    // Base niche depth score (0-30)
    score += topicalSignals.nicheDepthScore * 0.30;

    // Expert author presence (0-25)
    score += topicalSignals.expertAuthorScore * 0.25;

    // Original research contribution (0-20)
    score += topicalSignals.originalResearchScore * 0.20;

    // Topic relevance to target niche (0-25)
    if (targetNiche) {
      const relevanceScore = this.calculateNicheRelevance(
        topicalSignals,
        targetNiche
      );
      score += relevanceScore * 0.25;
    } else {
      // If no target niche, use average topic relevance
      const avgRelevance = this.getAverageTopicRelevance(topicalSignals);
      score += avgRelevance * 25;
    }

    return Math.round(Math.min(100, score));
  }

  /**
   * Calculate AI-specific visibility score component
   */
  private calculateAISpecificScore(aiSignals: AIVisibilitySignals): number {
    let score = 0;

    // Training data likelihood (0-30)
    score += aiSignals.trainingDataLikelihood * 0.30;

    // AI citation score (0-20)
    score += aiSignals.aiCitationScore * 0.20;

    // Structured data quality (0-15)
    score += aiSignals.structuredDataScore * 0.15;

    // Crawlability (0-15)
    score += aiSignals.crawlabilityScore * 0.15;

    // Semantic clarity (0-10)
    score += aiSignals.semanticClarityScore * 0.10;

    // E-E-A-T signals (0-10)
    score += aiSignals.eeatScore * 0.10;

    return Math.round(Math.min(100, score));
  }

  /**
   * Calculate relevance to a specific niche
   */
  private calculateNicheRelevance(
    topicalSignals: TopicalSignals,
    niche: Niche
  ): number {
    let relevanceScore = 0;
    let matchCount = 0;

    // Check primary topic overlap
    for (const topic of topicalSignals.primaryTopics) {
      const normalizedTopic = topic.toLowerCase();
      if (
        niche.keywords.some(k => normalizedTopic.includes(k.toLowerCase())) ||
        niche.relatedTopics.some(t => normalizedTopic.includes(t.toLowerCase()))
      ) {
        matchCount++;
      }
    }

    // Primary topic match contribution
    const primaryMatchRatio = Math.min(1, matchCount / 3);
    relevanceScore += primaryMatchRatio * 50;

    // Check topic relevance scores
    for (const keyword of niche.keywords) {
      const score = topicalSignals.topicRelevanceScores.get(keyword.toLowerCase());
      if (score !== undefined) {
        relevanceScore += score * 10;
      }
    }

    return Math.min(100, relevanceScore);
  }

  /**
   * Get average topic relevance from all topics
   */
  private getAverageTopicRelevance(topicalSignals: TopicalSignals): number {
    const scores = Array.from(topicalSignals.topicRelevanceScores.values());
    if (scores.length === 0) return 0.5;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  /**
   * Identify top contributing factors to the score
   */
  private identifyTopFactors(
    signals: PublisherSignals,
    targetNiche?: Niche
  ): RankingFactor[] {
    const factors: RankingFactor[] = [];

    // Crawl factors
    factors.push({
      name: 'Crawl Frequency',
      score: signals.crawlSignals.crawlFrequency,
      weight: AI_VISIBILITY_WEIGHTS.crawlFrequency,
      contribution: signals.crawlSignals.crawlFrequency * AI_VISIBILITY_WEIGHTS.crawlFrequency
    });

    factors.push({
      name: 'Content Freshness',
      score: signals.crawlSignals.contentFreshnessScore,
      weight: AI_VISIBILITY_WEIGHTS.contentFreshness,
      contribution: signals.crawlSignals.contentFreshnessScore * AI_VISIBILITY_WEIGHTS.contentFreshness
    });

    // Authority factors
    factors.push({
      name: 'Domain Authority',
      score: signals.authoritySignals.domainAuthority,
      weight: AI_VISIBILITY_WEIGHTS.domainAuthority,
      contribution: signals.authoritySignals.domainAuthority * AI_VISIBILITY_WEIGHTS.domainAuthority
    });

    factors.push({
      name: 'Trust Flow',
      score: signals.authoritySignals.trustFlow,
      weight: AI_VISIBILITY_WEIGHTS.trustFlow,
      contribution: signals.authoritySignals.trustFlow * AI_VISIBILITY_WEIGHTS.trustFlow
    });

    factors.push({
      name: 'Referring Domains',
      score: Math.min(100, Math.log10(signals.authoritySignals.referringDomains) * 20),
      weight: AI_VISIBILITY_WEIGHTS.referringDomains,
      contribution: Math.log10(signals.authoritySignals.referringDomains) * AI_VISIBILITY_WEIGHTS.referringDomains
    });

    // Topical factors
    factors.push({
      name: 'Niche Depth',
      score: signals.topicalSignals.nicheDepthScore,
      weight: AI_VISIBILITY_WEIGHTS.nicheDepth,
      contribution: signals.topicalSignals.nicheDepthScore * AI_VISIBILITY_WEIGHTS.nicheDepth
    });

    factors.push({
      name: 'Expert Authors',
      score: signals.topicalSignals.expertAuthorScore,
      weight: AI_VISIBILITY_WEIGHTS.expertAuthors,
      contribution: signals.topicalSignals.expertAuthorScore * AI_VISIBILITY_WEIGHTS.expertAuthors
    });

    // AI-specific factors
    factors.push({
      name: 'Training Data Likelihood',
      score: signals.aiVisibilitySignals.trainingDataLikelihood,
      weight: AI_VISIBILITY_WEIGHTS.trainingDataLikelihood,
      contribution: signals.aiVisibilitySignals.trainingDataLikelihood * AI_VISIBILITY_WEIGHTS.trainingDataLikelihood
    });

    factors.push({
      name: 'E-E-A-T Signals',
      score: signals.aiVisibilitySignals.eeatScore,
      weight: AI_VISIBILITY_WEIGHTS.eeat,
      contribution: signals.aiVisibilitySignals.eeatScore * AI_VISIBILITY_WEIGHTS.eeat
    });

    // Sort by contribution and return top 5
    return factors
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5);
  }

  /**
   * Identify weaknesses in the publisher's AI visibility
   */
  private identifyWeaknesses(
    signals: PublisherSignals,
    breakdown: ScoreBreakdown
  ): string[] {
    const weaknesses: string[] = [];

    // Crawl-related weaknesses
    if (signals.crawlSignals.crawlFrequency < 3) {
      weaknesses.push('Low crawl frequency in Common Crawl archives');
    }
    if (signals.crawlSignals.contentFreshnessScore < 50) {
      weaknesses.push('Content freshness could be improved');
    }

    // Authority weaknesses
    if (signals.authoritySignals.domainAuthority < 40) {
      weaknesses.push('Domain authority below average');
    }
    if (signals.authoritySignals.spamScore > 30) {
      weaknesses.push('Elevated spam score may affect credibility');
    }
    if (signals.authoritySignals.referringDomains < 100) {
      weaknesses.push('Limited referring domain diversity');
    }

    // Topical weaknesses
    if (signals.topicalSignals.nicheDepthScore < 50) {
      weaknesses.push('Limited depth in niche coverage');
    }
    if (signals.topicalSignals.expertAuthorScore < 40) {
      weaknesses.push('Few recognized expert authors');
    }
    if (signals.topicalSignals.originalResearchScore < 30) {
      weaknesses.push('Limited original research or data');
    }

    // AI-specific weaknesses
    if (signals.aiVisibilitySignals.structuredDataScore < 50) {
      weaknesses.push('Structured data implementation needs improvement');
    }
    if (signals.aiVisibilitySignals.semanticClarityScore < 50) {
      weaknesses.push('Content semantic clarity could be enhanced');
    }
    if (signals.aiVisibilitySignals.crawlabilityScore < 60) {
      weaknesses.push('Technical crawlability issues detected');
    }

    // Overall component weaknesses
    if (breakdown.crawlScore < 50) {
      weaknesses.push('Overall crawl presence is below optimal');
    }
    if (breakdown.authorityScore < 50) {
      weaknesses.push('Web authority metrics need strengthening');
    }
    if (breakdown.aiSpecificScore < 50) {
      weaknesses.push('AI-specific optimization opportunities exist');
    }

    return weaknesses.slice(0, 5); // Return top 5 weaknesses
  }

  /**
   * Calculate confidence level of the score
   */
  private calculateConfidence(signals: PublisherSignals): number {
    let confidence = 0;
    let dataPoints = 0;

    // Check data completeness
    if (signals.crawlSignals.crawlFrequency > 0) {
      confidence += 0.25;
      dataPoints++;
    }

    if (signals.authoritySignals.domainAuthority > 0) {
      confidence += 0.25;
      dataPoints++;
    }

    if (signals.topicalSignals.primaryTopics.length > 0) {
      confidence += 0.25;
      dataPoints++;
    }

    if (signals.aiVisibilitySignals.trainingDataLikelihood > 0) {
      confidence += 0.25;
      dataPoints++;
    }

    // Adjust confidence based on data freshness
    const daysSinceUpdate =
      (Date.now() - signals.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) {
      confidence *= 0.9;
    }
    if (daysSinceUpdate > 90) {
      confidence *= 0.8;
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Compare two publishers' AI visibility scores
   */
  comparePublishers(
    signals1: PublisherSignals,
    signals2: PublisherSignals,
    targetNiche?: Niche
  ): {
    score1: AIVisibilityScore;
    score2: AIVisibilityScore;
    comparison: {
      winner: string;
      scoreDifference: number;
      advantageAreas: string[];
    };
  } {
    const score1 = this.calculateAIVisibilityScore(signals1, targetNiche);
    const score2 = this.calculateAIVisibilityScore(signals2, targetNiche);

    const advantageAreas: string[] = [];

    if (score1.breakdown.crawlScore > score2.breakdown.crawlScore + 5) {
      advantageAreas.push(`${signals1.domain} has better crawl presence`);
    } else if (score2.breakdown.crawlScore > score1.breakdown.crawlScore + 5) {
      advantageAreas.push(`${signals2.domain} has better crawl presence`);
    }

    if (score1.breakdown.authorityScore > score2.breakdown.authorityScore + 5) {
      advantageAreas.push(`${signals1.domain} has stronger web authority`);
    } else if (score2.breakdown.authorityScore > score1.breakdown.authorityScore + 5) {
      advantageAreas.push(`${signals2.domain} has stronger web authority`);
    }

    if (score1.breakdown.topicalScore > score2.breakdown.topicalScore + 5) {
      advantageAreas.push(`${signals1.domain} has better topical relevance`);
    } else if (score2.breakdown.topicalScore > score1.breakdown.topicalScore + 5) {
      advantageAreas.push(`${signals2.domain} has better topical relevance`);
    }

    if (score1.breakdown.aiSpecificScore > score2.breakdown.aiSpecificScore + 5) {
      advantageAreas.push(`${signals1.domain} is better optimized for AI`);
    } else if (score2.breakdown.aiSpecificScore > score1.breakdown.aiSpecificScore + 5) {
      advantageAreas.push(`${signals2.domain} is better optimized for AI`);
    }

    return {
      score1,
      score2,
      comparison: {
        winner: score1.overallScore > score2.overallScore ? signals1.domain : signals2.domain,
        scoreDifference: Math.abs(score1.overallScore - score2.overallScore),
        advantageAreas
      }
    };
  }
}

export const scoringService = new ScoringService();
