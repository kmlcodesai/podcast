/**
 * Utility helper functions for the Media List Builder
 */

import { Publisher, PublisherCategory } from '../types';

/**
 * Generate a unique identifier
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Normalize a topic/keyword string
 */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calculate similarity between two strings (Jaccard similarity)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Chunk an array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a score as a percentage string
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Parse category from string
 */
export function parseCategory(category: string): PublisherCategory {
  const normalized = category.toLowerCase().replace(/[^a-z_]/g, '_');
  const categoryMap: Record<string, PublisherCategory> = {
    news: PublisherCategory.NEWS,
    magazine: PublisherCategory.MAGAZINE,
    blog: PublisherCategory.BLOG,
    trade: PublisherCategory.TRADE_PUBLICATION,
    trade_publication: PublisherCategory.TRADE_PUBLICATION,
    academic: PublisherCategory.ACADEMIC,
    government: PublisherCategory.GOVERNMENT,
    analyst: PublisherCategory.INDUSTRY_ANALYST,
    industry_analyst: PublisherCategory.INDUSTRY_ANALYST,
    podcast: PublisherCategory.PODCAST,
    video: PublisherCategory.VIDEO,
    social: PublisherCategory.SOCIAL
  };

  return categoryMap[normalized] || PublisherCategory.OTHER;
}

/**
 * Validate a domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
}

/**
 * Create a publisher object from basic data
 */
export function createPublisher(
  domain: string,
  name: string,
  category: PublisherCategory | string,
  topics: string[]
): Publisher {
  const parsedCategory = typeof category === 'string'
    ? parseCategory(category)
    : category;

  return {
    id: generateId(),
    domain: extractDomain(domain),
    name,
    category: parsedCategory,
    topics: topics.map(normalizeTopic),
    metadata: {}
  };
}

/**
 * Sort publishers by a specific field
 */
export function sortPublishers<T extends { aiVisibilityScore: { overallScore: number } }>(
  publishers: T[],
  field: 'score' | 'name' | 'domain' = 'score',
  ascending: boolean = false
): T[] {
  const sorted = [...publishers].sort((a, b) => {
    switch (field) {
      case 'score':
        return b.aiVisibilityScore.overallScore - a.aiVisibilityScore.overallScore;
      default:
        return b.aiVisibilityScore.overallScore - a.aiVisibilityScore.overallScore;
    }
  });

  return ascending ? sorted.reverse() : sorted;
}

/**
 * Calculate percentile of a value in an array
 */
export function calculatePercentile(value: number, values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  return Math.round((index / sorted.length) * 100);
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    tier_1: 'Tier 1 - Essential',
    tier_2: 'Tier 2 - Recommended',
    tier_3: 'Tier 3 - Opportunity',
    tier_4: 'Tier 4 - Niche'
  };
  return labels[tier] || tier;
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: PublisherCategory): string {
  const labels: Record<PublisherCategory, string> = {
    [PublisherCategory.NEWS]: 'News',
    [PublisherCategory.MAGAZINE]: 'Magazine',
    [PublisherCategory.BLOG]: 'Blog',
    [PublisherCategory.TRADE_PUBLICATION]: 'Trade Publication',
    [PublisherCategory.ACADEMIC]: 'Academic',
    [PublisherCategory.GOVERNMENT]: 'Government',
    [PublisherCategory.INDUSTRY_ANALYST]: 'Industry Analyst',
    [PublisherCategory.PODCAST]: 'Podcast',
    [PublisherCategory.VIDEO]: 'Video',
    [PublisherCategory.SOCIAL]: 'Social',
    [PublisherCategory.OTHER]: 'Other'
  };
  return labels[category] || category;
}
