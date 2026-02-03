/**
 * MBFC Data Loader
 * Loads and parses publisher data from Media Bias/Fact Check datasets
 *
 * Data Sources:
 * - mbfc_bias.csv: 3,920 news sources with bias and factual reporting ratings
 *   Source: https://github.com/idiap/Factual-Reporting-and-Political-Bias-Web-Interactions
 *
 * - mbfc_corpus.tsv: 859 news sources with detailed MBFC analysis links
 *   Source: https://github.com/ramybaly/News-Media-Reliability
 *
 * Both datasets are derived from Media Bias/Fact Check (mediabiasfactcheck.com)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Publisher, PublisherCategory } from '../types';
import { generateId } from '../utils/helpers';

/**
 * Raw record from mbfc_bias.csv
 */
interface MBFCBiasRecord {
  source: string;
  bias: string;
  factual_reporting: string;
}

/**
 * Raw record from mbfc_corpus.tsv
 */
interface MBFCCorpusRecord {
  source_url: string;
  source_url_normalized: string;
  ref: string;
  fact: string;
  bias: string;
}

/**
 * Combined publisher data with MBFC ratings
 */
export interface MBFCPublisher extends Publisher {
  mbfcData: {
    bias: string;
    factualReporting: string;
    mbfcUrl?: string;
  };
}

/**
 * Map MBFC bias labels to topics
 */
const BIAS_TOPIC_MAP: Record<string, string[]> = {
  'left': ['progressive', 'liberal', 'politics'],
  'left-center': ['center-left', 'moderate', 'politics'],
  'neutral': ['news', 'journalism', 'current events'],
  'right-center': ['center-right', 'moderate', 'politics'],
  'right': ['conservative', 'politics'],
  'extreme-left': ['far-left', 'progressive', 'politics'],
  'extreme-right': ['far-right', 'conservative', 'politics'],
  'pro-science': ['science', 'research', 'education'],
  'conspiracy-pseudoscience': ['conspiracy', 'alternative'],
  'satire': ['satire', 'humor', 'entertainment'],
  'questionable': ['questionable', 'unreliable']
};

/**
 * Infer publisher category from domain and bias
 */
function inferCategory(domain: string, bias: string, factualReporting: string): PublisherCategory {
  const domainLower = domain.toLowerCase();

  // Academic/Research indicators
  if (domainLower.includes('.edu') || domainLower.includes('.ac.') ||
      domainLower.includes('university') || domainLower.includes('research')) {
    return PublisherCategory.ACADEMIC;
  }

  // Government indicators
  if (domainLower.includes('.gov') || domainLower.includes('.mil')) {
    return PublisherCategory.GOVERNMENT;
  }

  // News indicators
  if (domainLower.includes('news') || domainLower.includes('times') ||
      domainLower.includes('post') || domainLower.includes('tribune') ||
      domainLower.includes('herald') || domainLower.includes('gazette') ||
      domainLower.includes('journal') || domainLower.includes('daily')) {
    return PublisherCategory.NEWS;
  }

  // Magazine indicators
  if (domainLower.includes('magazine') || domainLower.includes('mag') ||
      domainLower.includes('weekly') || domainLower.includes('monthly')) {
    return PublisherCategory.MAGAZINE;
  }

  // Blog indicators
  if (domainLower.includes('blog') || domainLower.includes('medium.com')) {
    return PublisherCategory.BLOG;
  }

  // Trade publication indicators (tech, business, industry)
  if (domainLower.includes('tech') || domainLower.includes('wired') ||
      domainLower.includes('business') || domainLower.includes('industry')) {
    return PublisherCategory.TRADE_PUBLICATION;
  }

  // Default based on factual reporting
  if (factualReporting === 'high' && bias === 'neutral') {
    return PublisherCategory.NEWS;
  }

  return PublisherCategory.NEWS;
}

/**
 * Generate topics from domain name and bias
 */
function generateTopics(domain: string, bias: string): string[] {
  const topics: string[] = [];
  const domainLower = domain.toLowerCase();

  // Add bias-related topics
  const biasTopics = BIAS_TOPIC_MAP[bias.toLowerCase()] || ['news'];
  topics.push(...biasTopics);

  // Infer topics from domain name
  const topicKeywords: Record<string, string[]> = {
    'tech': ['technology', 'software', 'digital'],
    'science': ['science', 'research'],
    'health': ['healthcare', 'medicine', 'health'],
    'finance': ['finance', 'business', 'economy'],
    'sport': ['sports', 'athletics'],
    'entertainment': ['entertainment', 'culture'],
    'politics': ['politics', 'government'],
    'business': ['business', 'economy', 'markets'],
    'military': ['military', 'defense'],
    'environment': ['environment', 'climate', 'sustainability'],
    'education': ['education', 'learning'],
    'law': ['legal', 'law', 'justice'],
    'food': ['food', 'agriculture'],
    'travel': ['travel', 'tourism'],
    'auto': ['automotive', 'cars'],
    'real': ['real estate', 'property']
  };

  for (const [keyword, keywordTopics] of Object.entries(topicKeywords)) {
    if (domainLower.includes(keyword)) {
      topics.push(...keywordTopics);
    }
  }

  // Deduplicate and limit
  return [...new Set(topics)].slice(0, 5);
}

/**
 * Format domain name as publisher name
 */
function domainToName(domain: string): string {
  // Remove TLD and common prefixes
  let name = domain
    .replace(/\.(com|org|net|co\.uk|io|news|media)$/i, '')
    .replace(/^(www\.|the)/i, '');

  // Convert to title case with spaces
  name = name
    .split(/[-_.]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return name;
}

/**
 * Load publishers from mbfc_bias.csv
 */
export function loadMBFCBiasData(): MBFCPublisher[] {
  const filePath = path.join(__dirname, 'mbfc_bias.csv');

  if (!fs.existsSync(filePath)) {
    console.error('MBFC bias data file not found:', filePath);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const publishers: MBFCPublisher[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV (simple parser for this format)
    const parts = line.split(',');
    if (parts.length < 3) continue;

    const record: MBFCBiasRecord = {
      source: parts[0].trim(),
      bias: parts[1].trim(),
      factual_reporting: parts[2].trim()
    };

    // Skip invalid records
    if (!record.source || record.source.length < 3) continue;

    const publisher: MBFCPublisher = {
      id: generateId(),
      domain: record.source,
      name: domainToName(record.source),
      category: inferCategory(record.source, record.bias, record.factual_reporting),
      topics: generateTopics(record.source, record.bias),
      metadata: {},
      mbfcData: {
        bias: record.bias,
        factualReporting: record.factual_reporting
      }
    };

    publishers.push(publisher);
  }

  return publishers;
}

/**
 * Load publishers from mbfc_corpus.tsv
 */
export function loadMBFCCorpusData(): MBFCPublisher[] {
  const filePath = path.join(__dirname, 'mbfc_corpus.tsv');

  if (!fs.existsSync(filePath)) {
    console.error('MBFC corpus data file not found:', filePath);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const publishers: MBFCPublisher[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse TSV
    const parts = line.split('\t');
    if (parts.length < 5) continue;

    const record: MBFCCorpusRecord = {
      source_url: parts[0].trim(),
      source_url_normalized: parts[1].trim(),
      ref: parts[2].trim(),
      fact: parts[3].trim(),
      bias: parts[4].trim()
    };

    // Use normalized domain
    const domain = record.source_url_normalized;
    if (!domain || domain.length < 3) continue;

    const publisher: MBFCPublisher = {
      id: generateId(),
      domain: domain,
      name: domainToName(domain),
      category: inferCategory(domain, record.bias, record.fact),
      topics: generateTopics(domain, record.bias),
      metadata: {},
      mbfcData: {
        bias: record.bias,
        factualReporting: record.fact,
        mbfcUrl: record.ref
      }
    };

    publishers.push(publisher);
  }

  return publishers;
}

/**
 * Load all MBFC publishers (combined and deduplicated)
 */
export function loadAllMBFCPublishers(): MBFCPublisher[] {
  const biasPublishers = loadMBFCBiasData();
  const corpusPublishers = loadMBFCCorpusData();

  // Create a map to deduplicate by domain
  const publisherMap = new Map<string, MBFCPublisher>();

  // Add bias data first
  for (const pub of biasPublishers) {
    publisherMap.set(pub.domain.toLowerCase(), pub);
  }

  // Merge corpus data (may have MBFC URLs)
  for (const pub of corpusPublishers) {
    const existing = publisherMap.get(pub.domain.toLowerCase());
    if (existing) {
      // Merge MBFC URL if available
      if (pub.mbfcData.mbfcUrl) {
        existing.mbfcData.mbfcUrl = pub.mbfcData.mbfcUrl;
      }
    } else {
      publisherMap.set(pub.domain.toLowerCase(), pub);
    }
  }

  return Array.from(publisherMap.values());
}

/**
 * Filter publishers by factual reporting level
 */
export function filterByFactualReporting(
  publishers: MBFCPublisher[],
  levels: string[]
): MBFCPublisher[] {
  const normalizedLevels = levels.map(l => l.toLowerCase());
  return publishers.filter(p =>
    normalizedLevels.includes(p.mbfcData.factualReporting.toLowerCase())
  );
}

/**
 * Filter publishers by bias
 */
export function filterByBias(
  publishers: MBFCPublisher[],
  biases: string[]
): MBFCPublisher[] {
  const normalizedBiases = biases.map(b => b.toLowerCase());
  return publishers.filter(p =>
    normalizedBiases.includes(p.mbfcData.bias.toLowerCase())
  );
}

/**
 * Get statistics about the loaded data
 */
export function getDatasetStats(publishers: MBFCPublisher[]): {
  total: number;
  byBias: Record<string, number>;
  byFactualReporting: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const byBias: Record<string, number> = {};
  const byFactualReporting: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const pub of publishers) {
    const bias = pub.mbfcData.bias.toLowerCase();
    const fact = pub.mbfcData.factualReporting.toLowerCase();
    const cat = pub.category;

    byBias[bias] = (byBias[bias] || 0) + 1;
    byFactualReporting[fact] = (byFactualReporting[fact] || 0) + 1;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  return {
    total: publishers.length,
    byBias,
    byFactualReporting,
    byCategory
  };
}
