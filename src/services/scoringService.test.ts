/**
 * Tests for the AI Visibility Scoring Service
 */

import { ScoringService } from './scoringService';
import {
  PublisherSignals,
  CrawlSignals,
  AuthoritySignals,
  TopicalSignals,
  AIVisibilitySignals,
  Niche
} from '../types';

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  const createMockSignals = (overrides: Partial<PublisherSignals> = {}): PublisherSignals => {
    const crawlSignals: CrawlSignals = {
      crawlFrequency: 6,
      totalPagesIndexed: 10000,
      lastCrawlDate: new Date(),
      avgCrawlInterval: 30,
      contentFreshnessScore: 75,
      archivePresenceMonths: 48
    };

    const authoritySignals: AuthoritySignals = {
      domainAuthority: 70,
      referringDomains: 5000,
      totalBacklinks: 50000,
      trustFlow: 60,
      citationFlow: 55,
      spamScore: 5
    };

    const topicalSignals: TopicalSignals = {
      primaryTopics: ['technology', 'AI', 'software'],
      topicRelevanceScores: new Map([
        ['technology', 0.9],
        ['AI', 0.85],
        ['software', 0.8]
      ]),
      nicheDepthScore: 70,
      expertAuthorScore: 65,
      originalResearchScore: 50
    };

    const aiVisibilitySignals: AIVisibilitySignals = {
      trainingDataLikelihood: 75,
      aiCitationScore: 70,
      structuredDataScore: 65,
      crawlabilityScore: 80,
      semanticClarityScore: 72,
      eeatScore: 68
    };

    return {
      publisherId: 'test-publisher',
      domain: 'example.com',
      crawlSignals,
      authoritySignals,
      topicalSignals,
      aiVisibilitySignals,
      lastUpdated: new Date(),
      ...overrides
    };
  };

  describe('calculateAIVisibilityScore', () => {
    it('should calculate an overall score between 0 and 100', () => {
      const signals = createMockSignals();
      const score = scoringService.calculateAIVisibilityScore(signals);

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should return a breakdown of all score components', () => {
      const signals = createMockSignals();
      const score = scoringService.calculateAIVisibilityScore(signals);

      expect(score.breakdown).toHaveProperty('crawlScore');
      expect(score.breakdown).toHaveProperty('authorityScore');
      expect(score.breakdown).toHaveProperty('topicalScore');
      expect(score.breakdown).toHaveProperty('aiSpecificScore');
    });

    it('should identify top ranking factors', () => {
      const signals = createMockSignals();
      const score = scoringService.calculateAIVisibilityScore(signals);

      expect(score.topFactors).toBeDefined();
      expect(score.topFactors.length).toBeGreaterThan(0);
      expect(score.topFactors.length).toBeLessThanOrEqual(5);
    });

    it('should calculate confidence level', () => {
      const signals = createMockSignals();
      const score = scoringService.calculateAIVisibilityScore(signals);

      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it('should return higher scores for publishers with better signals', () => {
      const strongSignals = createMockSignals();
      const weakSignals = createMockSignals({
        crawlSignals: {
          crawlFrequency: 1,
          totalPagesIndexed: 100,
          lastCrawlDate: new Date(),
          avgCrawlInterval: 90,
          contentFreshnessScore: 30,
          archivePresenceMonths: 6
        },
        authoritySignals: {
          domainAuthority: 20,
          referringDomains: 50,
          totalBacklinks: 100,
          trustFlow: 15,
          citationFlow: 10,
          spamScore: 40
        }
      });

      const strongScore = scoringService.calculateAIVisibilityScore(strongSignals);
      const weakScore = scoringService.calculateAIVisibilityScore(weakSignals);

      expect(strongScore.overallScore).toBeGreaterThan(weakScore.overallScore);
    });
  });

  describe('setWeights', () => {
    it('should allow customizing scoring weights', () => {
      const signals = createMockSignals();

      // Default weights
      const defaultScore = scoringService.calculateAIVisibilityScore(signals);

      // Heavily weight authority
      scoringService.setWeights({
        crawlWeight: 0.1,
        authorityWeight: 0.6,
        topicalWeight: 0.1,
        aiSpecificWeight: 0.2
      });

      const customScore = scoringService.calculateAIVisibilityScore(signals);

      // Scores should differ due to different weights
      expect(customScore.overallScore).not.toEqual(defaultScore.overallScore);
    });
  });

  describe('comparePublishers', () => {
    it('should compare two publishers and identify the winner', () => {
      const signals1 = createMockSignals({ domain: 'strong-publisher.com' });
      const signals2 = createMockSignals({
        domain: 'weak-publisher.com',
        authoritySignals: {
          domainAuthority: 30,
          referringDomains: 100,
          totalBacklinks: 500,
          trustFlow: 25,
          citationFlow: 20,
          spamScore: 20
        }
      });

      const comparison = scoringService.comparePublishers(signals1, signals2);

      expect(comparison.comparison.winner).toBe('strong-publisher.com');
      expect(comparison.comparison.scoreDifference).toBeGreaterThan(0);
    });

    it('should identify advantage areas between publishers', () => {
      const signals1 = createMockSignals({ domain: 'publisher1.com' });
      const signals2 = createMockSignals({ domain: 'publisher2.com' });

      const comparison = scoringService.comparePublishers(signals1, signals2);

      expect(comparison.comparison.advantageAreas).toBeDefined();
      expect(Array.isArray(comparison.comparison.advantageAreas)).toBe(true);
    });
  });

  describe('niche relevance', () => {
    it('should boost scores for publishers matching target niche', () => {
      const signals = createMockSignals();

      const techNiche: Niche = {
        id: 'technology',
        name: 'Technology',
        description: 'Technology news and software',
        keywords: ['technology', 'software', 'AI', 'cloud'],
        relatedTopics: ['business', 'innovation'],
        industries: ['software', 'IT'],
        audience: ['developers', 'IT professionals']
      };

      const financeNiche: Niche = {
        id: 'finance',
        name: 'Finance',
        description: 'Financial services and banking',
        keywords: ['finance', 'banking', 'investment', 'stocks'],
        relatedTopics: ['business', 'economics'],
        industries: ['banking', 'insurance'],
        audience: ['investors', 'financial analysts']
      };

      const techScore = scoringService.calculateAIVisibilityScore(signals, techNiche);
      const financeScore = scoringService.calculateAIVisibilityScore(signals, financeNiche);

      // Tech-focused publisher should score higher for tech niche
      expect(techScore.breakdown.topicalScore).toBeGreaterThan(financeScore.breakdown.topicalScore);
    });
  });

  describe('weakness identification', () => {
    it('should identify weaknesses for low-scoring areas', () => {
      const signals = createMockSignals({
        crawlSignals: {
          crawlFrequency: 1,
          totalPagesIndexed: 50,
          lastCrawlDate: new Date(),
          avgCrawlInterval: 120,
          contentFreshnessScore: 20,
          archivePresenceMonths: 3
        },
        authoritySignals: {
          domainAuthority: 15,
          referringDomains: 20,
          totalBacklinks: 50,
          trustFlow: 10,
          citationFlow: 8,
          spamScore: 50
        }
      });

      const score = scoringService.calculateAIVisibilityScore(signals);

      expect(score.weaknesses.length).toBeGreaterThan(0);
      expect(score.weaknesses.some(w => w.toLowerCase().includes('crawl'))).toBe(true);
      expect(score.weaknesses.some(w => w.toLowerCase().includes('authority') || w.toLowerCase().includes('domain'))).toBe(true);
    });
  });
});
