/**
 * Output Service
 * Formats media list results in various output formats (JSON, CSV, Markdown, HTML)
 */

import {
  MediaListResult,
  RankedPublisher,
  OutputFormat,
  PublisherTier
} from '../types';
import {
  formatDate,
  formatScore,
  getTierLabel,
  getCategoryLabel,
  formatNumber
} from '../utils/helpers';

export class OutputService {
  /**
   * Format media list result based on specified output format
   */
  format(result: MediaListResult, outputFormat: OutputFormat): string {
    switch (outputFormat) {
      case OutputFormat.JSON:
        return this.toJSON(result);
      case OutputFormat.CSV:
        return this.toCSV(result);
      case OutputFormat.MARKDOWN:
        return this.toMarkdown(result);
      case OutputFormat.HTML:
        return this.toHTML(result);
      default:
        return this.toJSON(result);
    }
  }

  /**
   * Format as JSON
   */
  toJSON(result: MediaListResult): string {
    const output = {
      metadata: {
        id: result.id,
        generatedAt: result.generatedAt.toISOString(),
        totalPublishers: result.summary.totalPublishers,
        avgScore: result.summary.avgAIVisibilityScore,
        scoreRange: result.summary.scoreRange
      },
      summary: {
        tierDistribution: result.summary.tierDistribution,
        topCategories: result.summary.topCategories,
        topTopics: result.summary.topTopics
      },
      publishers: result.publishers.map(rp => ({
        rank: rp.rank,
        domain: rp.publisher.domain,
        name: rp.publisher.name,
        category: rp.publisher.category,
        topics: rp.publisher.topics,
        tier: rp.tier,
        scores: {
          overall: rp.aiVisibilityScore.overallScore,
          crawl: rp.aiVisibilityScore.breakdown.crawlScore,
          authority: rp.aiVisibilityScore.breakdown.authorityScore,
          topical: rp.aiVisibilityScore.breakdown.topicalScore,
          aiSpecific: rp.aiVisibilityScore.breakdown.aiSpecificScore
        },
        confidence: rp.aiVisibilityScore.confidence,
        topFactors: rp.aiVisibilityScore.topFactors.map(f => f.name),
        weaknesses: rp.aiVisibilityScore.weaknesses,
        recommendation: rp.recommendation
      }))
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Format as CSV
   */
  toCSV(result: MediaListResult): string {
    const headers = [
      'Rank',
      'Domain',
      'Name',
      'Category',
      'Tier',
      'Overall Score',
      'Crawl Score',
      'Authority Score',
      'Topical Score',
      'AI-Specific Score',
      'Confidence',
      'Topics',
      'Top Factors',
      'Recommendation'
    ];

    const rows = result.publishers.map(rp => [
      rp.rank.toString(),
      rp.publisher.domain,
      this.escapeCSV(rp.publisher.name),
      getCategoryLabel(rp.publisher.category),
      getTierLabel(rp.tier),
      rp.aiVisibilityScore.overallScore.toFixed(1),
      rp.aiVisibilityScore.breakdown.crawlScore.toString(),
      rp.aiVisibilityScore.breakdown.authorityScore.toString(),
      rp.aiVisibilityScore.breakdown.topicalScore.toString(),
      rp.aiVisibilityScore.breakdown.aiSpecificScore.toString(),
      rp.aiVisibilityScore.confidence.toFixed(2),
      this.escapeCSV(rp.publisher.topics.join('; ')),
      this.escapeCSV(rp.aiVisibilityScore.topFactors.map(f => f.name).join('; ')),
      this.escapeCSV(rp.recommendation)
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Format as Markdown
   */
  toMarkdown(result: MediaListResult): string {
    const lines: string[] = [];

    // Header
    lines.push('# AI Visibility Media List');
    lines.push('');
    lines.push(`**Generated:** ${formatDate(result.generatedAt)}`);
    lines.push(`**List ID:** ${result.id}`);
    lines.push('');

    // Executive Summary
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`This media list contains **${result.summary.totalPublishers} publishers** optimized for AI visibility.`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Publishers | ${result.summary.totalPublishers} |`);
    lines.push(`| Average AI Visibility Score | ${formatScore(result.summary.avgAIVisibilityScore)} |`);
    lines.push(`| Score Range | ${formatScore(result.summary.scoreRange.min)} - ${formatScore(result.summary.scoreRange.max)} |`);
    lines.push('');

    // Tier Distribution
    lines.push('### Tier Distribution');
    lines.push('');
    lines.push('| Tier | Count | Description |');
    lines.push('|------|-------|-------------|');
    lines.push(`| Tier 1 | ${result.summary.tierDistribution[PublisherTier.TIER_1]} | Must target - highest AI visibility |`);
    lines.push(`| Tier 2 | ${result.summary.tierDistribution[PublisherTier.TIER_2]} | Strongly recommended |`);
    lines.push(`| Tier 3 | ${result.summary.tierDistribution[PublisherTier.TIER_3]} | Good opportunities |`);
    lines.push(`| Tier 4 | ${result.summary.tierDistribution[PublisherTier.TIER_4]} | Niche value |`);
    lines.push('');

    // Top Categories
    if (result.summary.topCategories.length > 0) {
      lines.push('### Top Categories');
      lines.push('');
      lines.push('| Category | Count |');
      lines.push('|----------|-------|');
      result.summary.topCategories.forEach(cat => {
        lines.push(`| ${getCategoryLabel(cat.category)} | ${cat.count} |`);
      });
      lines.push('');
    }

    // Publisher Rankings by Tier
    lines.push('## Publisher Rankings');
    lines.push('');

    // Group by tier
    const tiers = [
      PublisherTier.TIER_1,
      PublisherTier.TIER_2,
      PublisherTier.TIER_3,
      PublisherTier.TIER_4
    ];

    for (const tier of tiers) {
      const tierPublishers = result.publishers.filter(rp => rp.tier === tier);
      if (tierPublishers.length === 0) continue;

      lines.push(`### ${getTierLabel(tier)}`);
      lines.push('');
      lines.push('| Rank | Publisher | Domain | Score | Category |');
      lines.push('|------|-----------|--------|-------|----------|');

      for (const rp of tierPublishers) {
        lines.push(
          `| ${rp.rank} | ${rp.publisher.name} | ${rp.publisher.domain} | ${formatScore(rp.aiVisibilityScore.overallScore)} | ${getCategoryLabel(rp.publisher.category)} |`
        );
      }
      lines.push('');
    }

    // Detailed Analysis for Top 10
    lines.push('## Detailed Analysis - Top 10 Publishers');
    lines.push('');

    const topPublishers = result.publishers.slice(0, 10);
    for (const rp of topPublishers) {
      lines.push(`### ${rp.rank}. ${rp.publisher.name}`);
      lines.push('');
      lines.push(`**Domain:** ${rp.publisher.domain}`);
      lines.push(`**Category:** ${getCategoryLabel(rp.publisher.category)}`);
      lines.push(`**Tier:** ${getTierLabel(rp.tier)}`);
      lines.push('');
      lines.push('**Score Breakdown:**');
      lines.push('');
      lines.push(`- Overall: **${formatScore(rp.aiVisibilityScore.overallScore)}**`);
      lines.push(`- Crawl Presence: ${formatScore(rp.aiVisibilityScore.breakdown.crawlScore)}`);
      lines.push(`- Web Authority: ${formatScore(rp.aiVisibilityScore.breakdown.authorityScore)}`);
      lines.push(`- Topical Relevance: ${formatScore(rp.aiVisibilityScore.breakdown.topicalScore)}`);
      lines.push(`- AI Optimization: ${formatScore(rp.aiVisibilityScore.breakdown.aiSpecificScore)}`);
      lines.push('');

      if (rp.aiVisibilityScore.topFactors.length > 0) {
        lines.push('**Top Ranking Factors:**');
        rp.aiVisibilityScore.topFactors.forEach(factor => {
          lines.push(`- ${factor.name}`);
        });
        lines.push('');
      }

      if (rp.publisher.topics.length > 0) {
        lines.push(`**Topics:** ${rp.publisher.topics.join(', ')}`);
        lines.push('');
      }

      lines.push(`**Recommendation:** ${rp.recommendation}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Methodology
    lines.push('## Methodology');
    lines.push('');
    lines.push('This media list was generated using AI visibility signals including:');
    lines.push('');
    lines.push('- **Crawl Frequency**: Analysis of Common Crawl archive presence');
    lines.push('- **Web Authority**: Domain authority, trust flow, and backlink metrics');
    lines.push('- **Topical Relevance**: Niche depth, expert authorship, and original research');
    lines.push('- **AI-Specific Signals**: Training data likelihood, structured data, E-E-A-T signals');
    lines.push('');
    lines.push('Publishers are ranked by their overall AI visibility score and tiered based on their likelihood to influence LLM training data, in-model citations, and generative search results.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format as HTML
   */
  toHTML(result: MediaListResult): string {
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    lines.push('  <title>AI Visibility Media List</title>');
    lines.push('  <style>');
    lines.push(this.getCSS());
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');

    lines.push('  <div class="container">');
    lines.push('    <header>');
    lines.push('      <h1>AI Visibility Media List</h1>');
    lines.push(`      <p class="meta">Generated: ${formatDate(result.generatedAt)} | ID: ${result.id}</p>`);
    lines.push('    </header>');

    // Summary Cards
    lines.push('    <section class="summary">');
    lines.push('      <div class="card">');
    lines.push(`        <div class="card-value">${result.summary.totalPublishers}</div>`);
    lines.push('        <div class="card-label">Publishers</div>');
    lines.push('      </div>');
    lines.push('      <div class="card">');
    lines.push(`        <div class="card-value">${formatScore(result.summary.avgAIVisibilityScore)}</div>`);
    lines.push('        <div class="card-label">Avg Score</div>');
    lines.push('      </div>');
    lines.push('      <div class="card">');
    lines.push(`        <div class="card-value">${result.summary.tierDistribution[PublisherTier.TIER_1]}</div>`);
    lines.push('        <div class="card-label">Tier 1</div>');
    lines.push('      </div>');
    lines.push('      <div class="card">');
    lines.push(`        <div class="card-value">${result.summary.tierDistribution[PublisherTier.TIER_2]}</div>`);
    lines.push('        <div class="card-label">Tier 2</div>');
    lines.push('      </div>');
    lines.push('    </section>');

    // Publisher Table
    lines.push('    <section class="publishers">');
    lines.push('      <h2>Publisher Rankings</h2>');
    lines.push('      <table>');
    lines.push('        <thead>');
    lines.push('          <tr>');
    lines.push('            <th>Rank</th>');
    lines.push('            <th>Publisher</th>');
    lines.push('            <th>Domain</th>');
    lines.push('            <th>Category</th>');
    lines.push('            <th>Tier</th>');
    lines.push('            <th>Score</th>');
    lines.push('            <th>Breakdown</th>');
    lines.push('          </tr>');
    lines.push('        </thead>');
    lines.push('        <tbody>');

    for (const rp of result.publishers) {
      const tierClass = `tier-${rp.tier.replace('tier_', '')}`;
      lines.push(`          <tr class="${tierClass}">`);
      lines.push(`            <td>${rp.rank}</td>`);
      lines.push(`            <td><strong>${this.escapeHTML(rp.publisher.name)}</strong></td>`);
      lines.push(`            <td>${rp.publisher.domain}</td>`);
      lines.push(`            <td>${getCategoryLabel(rp.publisher.category)}</td>`);
      lines.push(`            <td><span class="tier-badge ${tierClass}">${getTierLabel(rp.tier)}</span></td>`);
      lines.push(`            <td><strong>${formatScore(rp.aiVisibilityScore.overallScore)}</strong></td>`);
      lines.push('            <td>');
      lines.push('              <div class="score-breakdown">');
      lines.push(`                <span title="Crawl">C:${rp.aiVisibilityScore.breakdown.crawlScore}</span>`);
      lines.push(`                <span title="Authority">A:${rp.aiVisibilityScore.breakdown.authorityScore}</span>`);
      lines.push(`                <span title="Topical">T:${rp.aiVisibilityScore.breakdown.topicalScore}</span>`);
      lines.push(`                <span title="AI">AI:${rp.aiVisibilityScore.breakdown.aiSpecificScore}</span>`);
      lines.push('              </div>');
      lines.push('            </td>');
      lines.push('          </tr>');
    }

    lines.push('        </tbody>');
    lines.push('      </table>');
    lines.push('    </section>');

    lines.push('  </div>');
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Get CSS styles for HTML output
   */
  private getCSS(): string {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      header { text-align: center; margin-bottom: 30px; }
      h1 { color: #2c3e50; margin-bottom: 10px; }
      .meta { color: #7f8c8d; font-size: 14px; }
      .summary { display: flex; gap: 20px; justify-content: center; margin-bottom: 30px; }
      .card { background: white; border-radius: 8px; padding: 20px 30px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .card-value { font-size: 32px; font-weight: bold; color: #3498db; }
      .card-label { color: #7f8c8d; font-size: 14px; }
      .publishers { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      h2 { margin-bottom: 20px; color: #2c3e50; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
      th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }
      tr:hover { background: #f8f9fa; }
      .tier-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
      .tier-1, .tier-badge.tier-1 { background: #27ae60; color: white; }
      .tier-2, .tier-badge.tier-2 { background: #3498db; color: white; }
      .tier-3, .tier-badge.tier-3 { background: #f39c12; color: white; }
      .tier-4, .tier-badge.tier-4 { background: #95a5a6; color: white; }
      .score-breakdown { display: flex; gap: 8px; font-size: 12px; color: #7f8c8d; }
      .score-breakdown span { background: #ecf0f1; padding: 2px 6px; border-radius: 3px; }
    `;
  }

  /**
   * Escape string for CSV output
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Escape string for HTML output
   */
  private escapeHTML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate a compact summary string
   */
  generateSummary(result: MediaListResult): string {
    const { summary } = result;
    return [
      `Media List Summary (${formatDate(result.generatedAt)})`,
      `Total: ${summary.totalPublishers} publishers`,
      `Avg Score: ${formatScore(summary.avgAIVisibilityScore)}`,
      `Tier 1: ${summary.tierDistribution[PublisherTier.TIER_1]}`,
      `Tier 2: ${summary.tierDistribution[PublisherTier.TIER_2]}`,
      `Tier 3: ${summary.tierDistribution[PublisherTier.TIER_3]}`,
      `Tier 4: ${summary.tierDistribution[PublisherTier.TIER_4]}`
    ].join(' | ');
  }
}

export const outputService = new OutputService();
