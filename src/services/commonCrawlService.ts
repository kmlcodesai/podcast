/**
 * Common Crawl Service
 * Fetches and analyzes crawl data from Common Crawl archives
 * to determine crawl frequency and indexing patterns for publishers
 */

import axios, { AxiosInstance } from 'axios';
import {
  CommonCrawlIndex,
  CommonCrawlResult,
  CrawlSignals,
  ApiResponse
} from '../types';
import { COMMON_CRAWL_CONFIG } from '../config/defaults';

export class CommonCrawlService {
  private client: AxiosInstance;
  private availableIndexes: CommonCrawlIndex[] = [];

  constructor() {
    this.client = axios.create({
      timeout: COMMON_CRAWL_CONFIG.requestTimeout,
      headers: {
        'User-Agent': 'MediaListBuilder/1.0 (AI Visibility Tool)'
      }
    });
  }

  /**
   * Fetch available Common Crawl indexes
   */
  async getAvailableIndexes(): Promise<CommonCrawlIndex[]> {
    if (this.availableIndexes.length > 0) {
      return this.availableIndexes;
    }

    try {
      const response = await this.client.get(COMMON_CRAWL_CONFIG.collIndexUrl);
      this.availableIndexes = response.data.map((index: any) => ({
        id: index.id,
        name: index.name,
        timegate: index.timegate,
        cdxApi: index['cdx-api']
      }));
      return this.availableIndexes;
    } catch (error) {
      console.error('Failed to fetch Common Crawl indexes:', error);
      return [];
    }
  }

  /**
   * Query Common Crawl CDX API for a specific domain
   */
  async queryDomain(
    domain: string,
    indexId?: string
  ): Promise<ApiResponse<CommonCrawlResult[]>> {
    const startTime = Date.now();
    const indexes = await this.getAvailableIndexes();

    if (indexes.length === 0) {
      return {
        success: false,
        error: 'No Common Crawl indexes available'
      };
    }

    const targetIndex = indexId
      ? indexes.find(i => i.id === indexId)
      : indexes[0];

    if (!targetIndex) {
      return {
        success: false,
        error: `Index ${indexId} not found`
      };
    }

    try {
      const params = new URLSearchParams({
        url: `*.${domain}/*`,
        output: 'json',
        limit: String(COMMON_CRAWL_CONFIG.maxResultsPerQuery)
      });

      const response = await this.client.get(
        `${targetIndex.cdxApi}?${params.toString()}`
      );

      const results = this.parseNDJSON(response.data);

      return {
        success: true,
        data: results,
        metadata: {
          requestId: `cc-${Date.now()}`,
          timestamp: new Date(),
          processingTime: Date.now() - startTime
        }
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: true,
          data: [],
          metadata: {
            requestId: `cc-${Date.now()}`,
            timestamp: new Date(),
            processingTime: Date.now() - startTime
          }
        };
      }

      return {
        success: false,
        error: `CDX query failed: ${error.message}`
      };
    }
  }

  /**
   * Analyze crawl patterns across multiple indexes
   */
  async analyzeCrawlHistory(
    domain: string,
    numIndexes: number = 6
  ): Promise<ApiResponse<CrawlSignals>> {
    const startTime = Date.now();
    const indexes = await this.getAvailableIndexes();
    const targetIndexes = indexes.slice(0, Math.min(numIndexes, indexes.length));

    const crawlResults: Array<{
      indexId: string;
      timestamp: Date;
      pageCount: number;
    }> = [];

    for (const index of targetIndexes) {
      const result = await this.queryDomain(domain, index.id);
      if (result.success && result.data) {
        const timestamps = result.data.map(r => this.parseTimestamp(r.timestamp));
        const latestTimestamp = timestamps.length > 0
          ? new Date(Math.max(...timestamps.map(t => t.getTime())))
          : new Date();

        crawlResults.push({
          indexId: index.id,
          timestamp: latestTimestamp,
          pageCount: result.data.length
        });
      }
    }

    if (crawlResults.length === 0) {
      return {
        success: false,
        error: 'No crawl data found for domain'
      };
    }

    const signals = this.calculateCrawlSignals(crawlResults);

    return {
      success: true,
      data: signals,
      metadata: {
        requestId: `cc-analysis-${Date.now()}`,
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Calculate crawl signals from historical data
   */
  private calculateCrawlSignals(
    crawlResults: Array<{
      indexId: string;
      timestamp: Date;
      pageCount: number;
    }>
  ): CrawlSignals {
    const totalPages = crawlResults.reduce((sum, r) => sum + r.pageCount, 0);
    const avgPages = totalPages / crawlResults.length;

    const sortedByTime = [...crawlResults].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    const lastCrawlDate = sortedByTime[0]?.timestamp || new Date();

    // Calculate average interval between crawls
    let totalInterval = 0;
    for (let i = 0; i < sortedByTime.length - 1; i++) {
      const diff = sortedByTime[i].timestamp.getTime() -
                   sortedByTime[i + 1].timestamp.getTime();
      totalInterval += diff;
    }
    const avgInterval = sortedByTime.length > 1
      ? totalInterval / (sortedByTime.length - 1) / (1000 * 60 * 60 * 24)
      : 30;

    // Calculate content freshness score (0-100)
    const daysSinceLastCrawl =
      (Date.now() - lastCrawlDate.getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 100 - (daysSinceLastCrawl * 0.5));

    // Calculate archive presence in months
    const oldestCrawl = sortedByTime[sortedByTime.length - 1]?.timestamp || new Date();
    const archiveMonths = Math.floor(
      (Date.now() - oldestCrawl.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    return {
      crawlFrequency: crawlResults.length,
      totalPagesIndexed: totalPages,
      lastCrawlDate,
      avgCrawlInterval: Math.round(avgInterval),
      contentFreshnessScore: Math.round(freshnessScore),
      archivePresenceMonths: archiveMonths
    };
  }

  /**
   * Parse NDJSON response from CDX API
   */
  private parseNDJSON(data: string): CommonCrawlResult[] {
    if (!data || typeof data !== 'string') {
      return [];
    }

    const lines = data.trim().split('\n');
    const results: CommonCrawlResult[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        results.push({
          url: parsed.url || '',
          timestamp: parsed.timestamp || '',
          status: parsed.status || '',
          mime: parsed.mime || '',
          length: parseInt(parsed.length) || 0,
          digest: parsed.digest || ''
        });
      } catch {
        // Skip malformed lines
      }
    }

    return results;
  }

  /**
   * Parse Common Crawl timestamp format (YYYYMMDDHHmmss)
   */
  private parseTimestamp(timestamp: string): Date {
    if (!timestamp || timestamp.length < 14) {
      return new Date();
    }

    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1;
    const day = parseInt(timestamp.substring(6, 8));
    const hour = parseInt(timestamp.substring(8, 10));
    const minute = parseInt(timestamp.substring(10, 12));
    const second = parseInt(timestamp.substring(12, 14));

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Estimate crawl frequency score (0-100) based on signals
   */
  calculateCrawlFrequencyScore(signals: CrawlSignals): number {
    let score = 0;

    // Factor 1: Number of crawls (max 30 points)
    score += Math.min(30, signals.crawlFrequency * 5);

    // Factor 2: Total pages indexed (max 25 points)
    const pageScore = Math.log10(Math.max(1, signals.totalPagesIndexed)) * 5;
    score += Math.min(25, pageScore);

    // Factor 3: Content freshness (max 25 points)
    score += signals.contentFreshnessScore * 0.25;

    // Factor 4: Archive presence (max 20 points)
    score += Math.min(20, signals.archivePresenceMonths * 0.5);

    return Math.round(Math.min(100, score));
  }
}

export const commonCrawlService = new CommonCrawlService();
