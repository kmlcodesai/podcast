# Media List Builder

AI visibility-optimized publisher identification tool for earned media and SEO teams.

## Overview

Media List Builder helps earned media and SEO teams identify the publishers that matter most for AI visibility. Using Common Crawl data and AI ranking signal proxies, the tool generates niche-specific publisher shortlists optimized for how large language models ingest and surface information.

### Key Features

- **Common Crawl Analysis**: Analyzes crawl frequency, indexing patterns, and archive presence
- **Authority Metrics**: Evaluates domain authority, trust flow, and backlink profiles
- **Topical Relevance**: Scores publishers based on niche depth, expert authorship, and original research
- **AI-Specific Signals**: Estimates training data likelihood, structured data quality, and E-E-A-T signals
- **Tiered Rankings**: Classifies publishers into priority tiers for media targeting
- **Multiple Output Formats**: Export lists as JSON, CSV, Markdown, or HTML

## Installation

```bash
npm install
```

## Usage

### CLI Commands

#### Build a Media List

Generate an AI visibility-optimized media list for a specific niche:

```bash
# Build list for technology niche
npm run dev -- build --niche technology --output markdown --file tech-list.md

# Build list with custom parameters
npm run dev -- build --niche marketing --max 25 --min-score 60 --output csv

# Build list excluding certain categories
npm run dev -- build --niche finance --exclude-categories blog,podcast
```

#### Analyze a Domain

Analyze AI visibility signals for a specific domain:

```bash
npm run dev -- analyze techcrunch.com

# With verbose output
npm run dev -- analyze techcrunch.com --verbose

# With niche relevance scoring
npm run dev -- analyze techcrunch.com --niche technology
```

#### Compare Domains

Compare AI visibility between two publishers:

```bash
npm run dev -- compare techcrunch.com wired.com --niche technology
```

#### List Available Niches

```bash
npm run dev -- niches
```

#### List Publisher Categories

```bash
npm run dev -- categories
```

### Programmatic Usage

```typescript
import {
  PublisherService,
  OutputService,
  getAllPublishers,
  PREDEFINED_NICHES,
  OutputFormat
} from './src';

async function buildMediaList() {
  const publisherService = new PublisherService();
  const outputService = new OutputService();

  // Get all sample publishers
  const publishers = getAllPublishers();

  // Build media list
  const result = await publisherService.buildMediaList(publishers, {
    niches: [PREDEFINED_NICHES.technology],
    maxPublishers: 25,
    minAIVisibilityScore: 50
  });

  // Output as markdown
  const markdown = outputService.format(result, OutputFormat.MARKDOWN);
  console.log(markdown);
}
```

## AI Visibility Scoring

Publishers are scored based on four main signal categories:

### 1. Crawl Signals (25%)
- **Crawl Frequency**: How often the domain appears in Common Crawl archives
- **Pages Indexed**: Total pages indexed from the domain
- **Content Freshness**: How often new content appears
- **Archive Presence**: Historical presence in crawl archives

### 2. Authority Signals (25%)
- **Domain Authority**: Overall domain strength (0-100)
- **Trust Flow**: Quality-weighted link metric
- **Referring Domains**: Unique linking domains
- **Spam Score**: Likelihood of spam (lower is better)

### 3. Topical Signals (25%)
- **Niche Depth**: Depth of coverage in target topic area
- **Expert Authors**: Presence of recognized experts
- **Original Research**: Frequency of original data/research

### 4. AI-Specific Signals (25%)
- **Training Data Likelihood**: Probability of inclusion in LLM training
- **AI Citation Score**: Estimated citation frequency in AI outputs
- **Structured Data**: Quality of schema markup
- **E-E-A-T Score**: Experience, Expertise, Authoritativeness, Trustworthiness

## Publisher Tiers

Publishers are classified into tiers based on their overall AI visibility score:

| Tier | Score Range | Description |
|------|-------------|-------------|
| Tier 1 | 80-100 | Must target - highest AI visibility |
| Tier 2 | 65-79 | Strongly recommended |
| Tier 3 | 50-64 | Good opportunities |
| Tier 4 | < 50 | Niche value |

## Available Niches

- **Technology**: Tech news, software, AI, startups
- **Marketing**: Digital marketing, advertising, SEO
- **Finance**: Banking, fintech, investment
- **Healthcare**: Medical, biotech, health tech
- **E-commerce**: Online retail, retail technology
- **Sustainability**: Clean tech, ESG, climate
- **Enterprise**: Enterprise software, SaaS, cloud
- **Media**: Publishing, content, streaming

## Output Formats

### JSON
Structured data with full scoring details and metadata.

### CSV
Spreadsheet-compatible format with key metrics.

### Markdown
Formatted report with executive summary and detailed analysis.

### HTML
Styled web page with visual score breakdown.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- <command>

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

## Project Structure

```
podcast/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Main exports
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── config/
│   │   └── defaults.ts           # Default configuration
│   ├── services/
│   │   ├── commonCrawlService.ts # Common Crawl data fetching
│   │   ├── scoringService.ts     # AI visibility scoring
│   │   ├── publisherService.ts   # Publisher analysis
│   │   └── outputService.ts      # Output formatting
│   ├── utils/
│   │   └── helpers.ts            # Utility functions
│   └── data/
│       └── samplePublishers.ts   # Sample publisher database
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
