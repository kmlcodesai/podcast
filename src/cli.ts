#!/usr/bin/env node

/**
 * Media List Builder CLI
 * Command-line interface for generating AI visibility-optimized publisher lists
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

import { PublisherService } from './services/publisherService';
import { OutputService } from './services/outputService';
import { ScoringService } from './services/scoringService';
import { getAllPublishers, getPublishersByNiche } from './data/samplePublishers';
import { PREDEFINED_NICHES, DEFAULT_SCORING_WEIGHTS } from './config/defaults';
import {
  OutputFormat,
  PublisherCategory,
  MediaListConfig,
  Niche,
  Publisher
} from './types';
import { createPublisher, parseCategory } from './utils/helpers';

const program = new Command();

program
  .name('media-list-builder')
  .description('AI visibility-optimized publisher identification tool for earned media and SEO teams')
  .version('1.0.0');

/**
 * Build command - Generate a media list
 */
program
  .command('build')
  .description('Build an AI visibility-optimized media list for a specific niche')
  .option('-n, --niche <niche>', 'Target niche (technology, marketing, finance, healthcare, ecommerce, sustainability, enterprise, media)')
  .option('-o, --output <format>', 'Output format (json, csv, markdown, html)', 'json')
  .option('-f, --file <path>', 'Output file path (defaults to stdout)')
  .option('-m, --max <number>', 'Maximum number of publishers', '50')
  .option('-s, --min-score <number>', 'Minimum AI visibility score threshold', '40')
  .option('--include-categories <categories>', 'Comma-separated categories to include')
  .option('--exclude-categories <categories>', 'Comma-separated categories to exclude')
  .option('--exclude-domains <domains>', 'Comma-separated domains to exclude')
  .action(async (options) => {
    const spinner = ora('Building media list...').start();

    try {
      // Parse options
      const niche = options.niche ? PREDEFINED_NICHES[options.niche.toLowerCase()] : undefined;
      const outputFormat = parseOutputFormat(options.output);
      const maxPublishers = parseInt(options.max) || 50;
      const minScore = parseInt(options.minScore) || 40;

      // Get publishers
      let publishers: Publisher[];
      if (options.niche) {
        publishers = getPublishersByNiche(options.niche.toLowerCase());
        spinner.text = `Analyzing ${publishers.length} publishers in ${options.niche} niche...`;
      } else {
        publishers = getAllPublishers();
        spinner.text = `Analyzing ${publishers.length} publishers across all niches...`;
      }

      // Build config
      const config: Partial<MediaListConfig> = {
        niches: niche ? [niche] : [],
        maxPublishers,
        minAIVisibilityScore: minScore,
        outputFormat
      };

      // Parse category filters
      if (options.includeCategories) {
        config.includeCategories = options.includeCategories
          .split(',')
          .map((c: string) => parseCategory(c.trim()));
      }

      if (options.excludeCategories) {
        config.excludeCategories = options.excludeCategories
          .split(',')
          .map((c: string) => parseCategory(c.trim()));
      }

      if (options.excludeDomains) {
        config.excludeDomains = options.excludeDomains.split(',').map((d: string) => d.trim());
      }

      // Build media list
      const publisherService = new PublisherService();
      const outputService = new OutputService();

      const result = await publisherService.buildMediaList(publishers, config);

      spinner.succeed(`Generated media list with ${result.publishers.length} publishers`);

      // Format output
      const formattedOutput = outputService.format(result, outputFormat);

      // Write to file or stdout
      if (options.file) {
        fs.writeFileSync(options.file, formattedOutput, 'utf-8');
        console.log(chalk.green(`\nOutput written to: ${options.file}`));
      } else {
        console.log('\n' + formattedOutput);
      }

      // Print summary
      console.log('\n' + chalk.cyan('Summary:'));
      console.log(outputService.generateSummary(result));

    } catch (error: any) {
      spinner.fail('Failed to build media list');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Analyze command - Analyze a specific domain
 */
program
  .command('analyze <domain>')
  .description('Analyze AI visibility signals for a specific domain')
  .option('-n, --niche <niche>', 'Target niche for relevance scoring')
  .option('-v, --verbose', 'Show detailed signal breakdown')
  .action(async (domain, options) => {
    const spinner = ora(`Analyzing ${domain}...`).start();

    try {
      const publisherService = new PublisherService();
      const scoringService = new ScoringService();

      // Create a publisher object for the domain
      const publisher = createPublisher(
        domain,
        domain,
        PublisherCategory.OTHER,
        []
      );

      // Analyze publisher
      const signals = await publisherService.analyzePublisher(publisher);

      // Get target niche if specified
      const niche = options.niche ? PREDEFINED_NICHES[options.niche.toLowerCase()] : undefined;

      // Calculate AI visibility score
      const score = scoringService.calculateAIVisibilityScore(signals, niche);

      spinner.succeed(`Analysis complete for ${domain}`);

      // Display results
      console.log('\n' + chalk.cyan.bold('AI Visibility Analysis'));
      console.log(chalk.cyan('═'.repeat(50)));

      console.log(`\n${chalk.bold('Domain:')} ${domain}`);
      console.log(`${chalk.bold('Overall Score:')} ${chalk.green.bold(score.overallScore.toFixed(1) + '%')}`);
      console.log(`${chalk.bold('Confidence:')} ${(score.confidence * 100).toFixed(0)}%`);

      console.log(`\n${chalk.bold('Score Breakdown:')}`);
      console.log(`  Crawl Presence:    ${formatScoreBar(score.breakdown.crawlScore)}`);
      console.log(`  Web Authority:     ${formatScoreBar(score.breakdown.authorityScore)}`);
      console.log(`  Topical Relevance: ${formatScoreBar(score.breakdown.topicalScore)}`);
      console.log(`  AI Optimization:   ${formatScoreBar(score.breakdown.aiSpecificScore)}`);

      if (score.topFactors.length > 0) {
        console.log(`\n${chalk.bold('Top Ranking Factors:')}`);
        score.topFactors.forEach((factor, i) => {
          console.log(`  ${i + 1}. ${factor.name} (${factor.score.toFixed(1)})`);
        });
      }

      if (score.weaknesses.length > 0) {
        console.log(`\n${chalk.bold('Areas for Improvement:')}`);
        score.weaknesses.forEach((weakness, i) => {
          console.log(`  ${chalk.yellow('•')} ${weakness}`);
        });
      }

      if (options.verbose) {
        console.log(`\n${chalk.bold('Detailed Signals:')}`);
        console.log('\nCrawl Signals:');
        console.log(`  Crawl Frequency: ${signals.crawlSignals.crawlFrequency}`);
        console.log(`  Pages Indexed: ${signals.crawlSignals.totalPagesIndexed}`);
        console.log(`  Content Freshness: ${signals.crawlSignals.contentFreshnessScore}`);
        console.log(`  Archive Presence: ${signals.crawlSignals.archivePresenceMonths} months`);

        console.log('\nAuthority Signals:');
        console.log(`  Domain Authority: ${signals.authoritySignals.domainAuthority}`);
        console.log(`  Trust Flow: ${signals.authoritySignals.trustFlow}`);
        console.log(`  Referring Domains: ${signals.authoritySignals.referringDomains}`);
        console.log(`  Spam Score: ${signals.authoritySignals.spamScore}`);

        console.log('\nAI Visibility Signals:');
        console.log(`  Training Data Likelihood: ${signals.aiVisibilitySignals.trainingDataLikelihood}`);
        console.log(`  AI Citation Score: ${signals.aiVisibilitySignals.aiCitationScore}`);
        console.log(`  Structured Data: ${signals.aiVisibilitySignals.structuredDataScore}`);
        console.log(`  E-E-A-T Score: ${signals.aiVisibilitySignals.eeatScore}`);
      }

    } catch (error: any) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Compare command - Compare two domains
 */
program
  .command('compare <domain1> <domain2>')
  .description('Compare AI visibility between two domains')
  .option('-n, --niche <niche>', 'Target niche for relevance scoring')
  .action(async (domain1, domain2, options) => {
    const spinner = ora('Comparing domains...').start();

    try {
      const publisherService = new PublisherService();
      const scoringService = new ScoringService();

      // Create publisher objects
      const publisher1 = createPublisher(domain1, domain1, PublisherCategory.OTHER, []);
      const publisher2 = createPublisher(domain2, domain2, PublisherCategory.OTHER, []);

      // Analyze both publishers
      const [signals1, signals2] = await Promise.all([
        publisherService.analyzePublisher(publisher1),
        publisherService.analyzePublisher(publisher2)
      ]);

      // Get target niche
      const niche = options.niche ? PREDEFINED_NICHES[options.niche.toLowerCase()] : undefined;

      // Compare
      const comparison = scoringService.comparePublishers(signals1, signals2, niche);

      spinner.succeed('Comparison complete');

      // Display results
      console.log('\n' + chalk.cyan.bold('Domain Comparison'));
      console.log(chalk.cyan('═'.repeat(60)));

      const maxLen = Math.max(domain1.length, domain2.length);

      console.log(`\n${chalk.bold('Overall Scores:')}`);
      console.log(`  ${domain1.padEnd(maxLen)} : ${chalk.green.bold(comparison.score1.overallScore.toFixed(1) + '%')}`);
      console.log(`  ${domain2.padEnd(maxLen)} : ${chalk.green.bold(comparison.score2.overallScore.toFixed(1) + '%')}`);

      console.log(`\n${chalk.bold('Winner:')} ${chalk.yellow.bold(comparison.comparison.winner)} (+${comparison.comparison.scoreDifference.toFixed(1)} points)`);

      console.log(`\n${chalk.bold('Score Breakdown:')}`);
      console.log(`\n  ${'Category'.padEnd(20)} | ${domain1.substring(0, 15).padEnd(15)} | ${domain2.substring(0, 15).padEnd(15)}`);
      console.log('  ' + '-'.repeat(56));
      console.log(`  ${'Crawl Presence'.padEnd(20)} | ${comparison.score1.breakdown.crawlScore.toString().padEnd(15)} | ${comparison.score2.breakdown.crawlScore}`);
      console.log(`  ${'Web Authority'.padEnd(20)} | ${comparison.score1.breakdown.authorityScore.toString().padEnd(15)} | ${comparison.score2.breakdown.authorityScore}`);
      console.log(`  ${'Topical Relevance'.padEnd(20)} | ${comparison.score1.breakdown.topicalScore.toString().padEnd(15)} | ${comparison.score2.breakdown.topicalScore}`);
      console.log(`  ${'AI Optimization'.padEnd(20)} | ${comparison.score1.breakdown.aiSpecificScore.toString().padEnd(15)} | ${comparison.score2.breakdown.aiSpecificScore}`);

      if (comparison.comparison.advantageAreas.length > 0) {
        console.log(`\n${chalk.bold('Key Differences:')}`);
        comparison.comparison.advantageAreas.forEach(area => {
          console.log(`  ${chalk.yellow('•')} ${area}`);
        });
      }

    } catch (error: any) {
      spinner.fail('Comparison failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Niches command - List available niches
 */
program
  .command('niches')
  .description('List available predefined niches')
  .action(() => {
    console.log('\n' + chalk.cyan.bold('Available Niches'));
    console.log(chalk.cyan('═'.repeat(60)));

    Object.entries(PREDEFINED_NICHES).forEach(([id, niche]) => {
      console.log(`\n${chalk.bold(niche.name)} (${chalk.gray(id)})`);
      console.log(`  ${niche.description}`);
      console.log(`  ${chalk.gray('Keywords:')} ${niche.keywords.slice(0, 5).join(', ')}...`);
    });

    console.log('\n' + chalk.gray('Use with: media-list-builder build --niche <niche-id>'));
  });

/**
 * Categories command - List publisher categories
 */
program
  .command('categories')
  .description('List available publisher categories')
  .action(() => {
    console.log('\n' + chalk.cyan.bold('Publisher Categories'));
    console.log(chalk.cyan('═'.repeat(40)));

    const categories = [
      { id: 'news', name: 'News', desc: 'News outlets and publications' },
      { id: 'magazine', name: 'Magazine', desc: 'Digital and print magazines' },
      { id: 'blog', name: 'Blog', desc: 'Company and independent blogs' },
      { id: 'trade_publication', name: 'Trade Publication', desc: 'Industry-specific publications' },
      { id: 'academic', name: 'Academic', desc: 'Academic journals and institutions' },
      { id: 'government', name: 'Government', desc: 'Government sources and agencies' },
      { id: 'industry_analyst', name: 'Industry Analyst', desc: 'Research and analyst firms' },
      { id: 'podcast', name: 'Podcast', desc: 'Podcast publishers' },
      { id: 'video', name: 'Video', desc: 'Video content publishers' },
      { id: 'social', name: 'Social', desc: 'Social media platforms' }
    ];

    categories.forEach(cat => {
      console.log(`\n  ${chalk.bold(cat.name)} (${chalk.gray(cat.id)})`);
      console.log(`    ${cat.desc}`);
    });

    console.log('\n' + chalk.gray('Use with: --include-categories or --exclude-categories'));
  });

/**
 * Helper function to parse output format
 */
function parseOutputFormat(format: string): OutputFormat {
  const formats: Record<string, OutputFormat> = {
    json: OutputFormat.JSON,
    csv: OutputFormat.CSV,
    markdown: OutputFormat.MARKDOWN,
    md: OutputFormat.MARKDOWN,
    html: OutputFormat.HTML
  };
  return formats[format.toLowerCase()] || OutputFormat.JSON;
}

/**
 * Helper function to format score as visual bar
 */
function formatScoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `${bar} ${score}%`;
}

// Parse CLI arguments
program.parse();

// Show help if no arguments
if (process.argv.length === 2) {
  program.help();
}
