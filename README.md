# Podcast & YouTube Channel Scraper

A comprehensive scraping tool to build lists of podcasts and YouTube channels in **SEO**, **Digital PR**, **Content Marketing**, **AI**, and **Entrepreneurship** categories.

## Features

- **Multi-source scraping**: Apple Podcasts, YouTube, Podchaser, Listen Notes
- **Category filtering**: Target specific niches relevant to your outreach
- **Rich data extraction**:
  - Show name and URL
  - Theme/topics
  - Contact email
  - Episode count
  - Notable guests
  - Top 5 most viewed episodes
- **Multiple export formats**: CSV and Excel (with category/source sheets)
- **Deduplication**: Automatically merge duplicate shows across sources
- **Rate limiting**: Respectful scraping with configurable delays

## Output Columns

The generated spreadsheet includes:

| Column | Description |
|--------|-------------|
| Name | YouTube Channel/Podcast name |
| URL | Direct link to the show |
| Theme | Topics covered on the show |
| Email | Contact email (when available) |
| Episode Count | Number of videos or podcast episodes |
| Notable Guests | Names of previous guests in the industry |
| Top 5 Episodes | Titles of the most popular episodes |
| Source | Where the data came from |
| Category | Content category |

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd podcast
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up API keys (optional but recommended)**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

## Usage

### Basic Usage

```bash
# Scrape all sources and categories
python main.py

# Quick test run
python main.py --quick
```

### Filtering Sources

```bash
# Only YouTube and Apple Podcasts
python main.py --sources youtube apple_podcasts

# Only Podchaser
python main.py --sources podchaser
```

### Filtering Categories

```bash
# Only SEO and AI
python main.py --categories seo ai

# Only entrepreneurship
python main.py --categories entrepreneurship
```

### Adjusting Limits

```bash
# Get more results per category
python main.py --limit 100

# Quick sample
python main.py --limit 10
```

### Output Options

```bash
# Custom output directory
python main.py --output my_results

# Only CSV export
python main.py --format csv

# Only Excel export
python main.py --format excel
```

### Full Example

```bash
python main.py \
  --sources apple_podcasts youtube \
  --categories seo content_marketing ai \
  --limit 50 \
  --output outreach_list \
  --verbose
```

## API Keys

While the scrapers work without API keys using web scraping, having API keys provides:

- **Faster scraping**: Direct API access is more efficient
- **More reliable data**: Less parsing of HTML
- **Higher rate limits**: APIs typically allow more requests

### YouTube Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API key)
5. Add to `.env` file: `YOUTUBE_API_KEY=your_key`

### Listen Notes API

1. Sign up at [Listen Notes API](https://www.listennotes.com/api/)
2. Get your API key from the dashboard
3. Add to `.env` file: `LISTEN_NOTES_API_KEY=your_key`

## Categories

| Category | Search Focus |
|----------|--------------|
| `seo` | SEO, search engine optimization, link building |
| `digital_pr` | Public relations, media relations, brand PR |
| `content_marketing` | Content strategy, inbound marketing, blogging |
| `ai` | Artificial intelligence, machine learning, automation |
| `entrepreneurship` | Startups, founder stories, business growth |

## Sources

| Source | Description | API Needed? |
|--------|-------------|-------------|
| `apple_podcasts` | iTunes/Apple Podcasts catalog | No (uses iTunes Search API) |
| `youtube` | YouTube channels | Optional (recommended) |
| `podchaser` | Podchaser podcast directory | No |
| `listen_notes` | Listen Notes search engine | Optional (recommended) |

## Programmatic Usage

```python
from src.scraper import PodcastScraper
from src.models import Category, SourceType

# Initialize scraper
scraper = PodcastScraper(
    youtube_api_key="your_key",
    listen_notes_api_key="your_key"
)

# Scrape specific sources and categories
results = scraper.scrape_and_export(
    categories=[Category.SEO, Category.AI],
    sources=[SourceType.YOUTUBE, SourceType.APPLE_PODCASTS],
    limit_per_category=50,
    output_dir="output"
)

print(f"Found {results['total_count']} shows")
print(f"Exported to: {results['files']}")
```

## Output Files

After running, you'll find in your output directory:

- `podcasts_channels_TIMESTAMP.csv` - All data in CSV format
- `podcasts_channels_TIMESTAMP.xlsx` - All data in Excel format
- `podcasts_by_category_TIMESTAMP.xlsx` - Separate sheets per category
- `podcasts_by_source_TIMESTAMP.xlsx` - Separate sheets per source

## Notes

- Web scraping is used as a fallback when API keys aren't provided
- Rate limiting is built-in to avoid overwhelming servers
- Some contact emails may not be publicly available
- Guest extraction uses pattern matching on episode titles/descriptions

## Legal

This tool is for legitimate outreach and research purposes. Please:

- Respect rate limits and terms of service
- Use collected data responsibly
- Don't spam contacts

## License

MIT License
