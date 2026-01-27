#!/usr/bin/env python3
"""
Podcast and YouTube Channel Scraper

Scrape Apple Podcasts, YouTube, Podchaser, and Listen Notes to build
a comprehensive list of shows in SEO, digital PR, content marketing,
AI, and entrepreneurship categories.

Usage:
    python main.py                              # Scrape all sources and categories
    python main.py --sources youtube apple      # Scrape specific sources
    python main.py --categories seo ai          # Scrape specific categories
    python main.py --limit 50                   # Set limit per category
    python main.py --output results             # Custom output directory
"""

import argparse
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from src.scraper import PodcastScraper, scrape_podcasts_and_channels
from src.models import Category, SourceType


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Scrape podcasts and YouTube channels for outreach",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Scrape everything
    python main.py

    # Scrape only YouTube and Apple Podcasts
    python main.py --sources youtube apple_podcasts

    # Scrape only SEO and AI categories
    python main.py --categories seo ai

    # Scrape with higher limits
    python main.py --limit 100

    # Quick test run
    python main.py --quick

Categories:
    - seo: SEO and search engine marketing
    - digital_pr: Digital public relations
    - content_marketing: Content marketing and strategy
    - ai: Artificial intelligence and machine learning
    - entrepreneurship: Business and startup topics

Sources:
    - apple_podcasts: Apple Podcasts / iTunes
    - youtube: YouTube channels
    - podchaser: Podchaser directory
    - listen_notes: Listen Notes search engine
        """
    )

    parser.add_argument(
        "--sources",
        nargs="+",
        choices=["apple_podcasts", "youtube", "podchaser", "listen_notes"],
        help="Sources to scrape (default: all)"
    )

    parser.add_argument(
        "--categories",
        nargs="+",
        choices=["seo", "digital_pr", "content_marketing", "ai", "entrepreneurship"],
        help="Categories to scrape (default: all)"
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=25,
        help="Maximum shows per category per source (default: 25)"
    )

    parser.add_argument(
        "--output",
        type=str,
        default="output",
        help="Output directory (default: output)"
    )

    parser.add_argument(
        "--format",
        choices=["csv", "excel", "all"],
        default="all",
        help="Export format (default: all)"
    )

    parser.add_argument(
        "--no-dedupe",
        action="store_true",
        help="Don't deduplicate results"
    )

    parser.add_argument(
        "--quick",
        action="store_true",
        help="Quick test run with minimal data"
    )

    parser.add_argument(
        "--youtube-api-key",
        type=str,
        help="YouTube Data API key (or set YOUTUBE_API_KEY env var)"
    )

    parser.add_argument(
        "--listen-notes-api-key",
        type=str,
        help="Listen Notes API key (or set LISTEN_NOTES_API_KEY env var)"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )

    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()

    # Set up logging
    import logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    logger = logging.getLogger(__name__)

    # Quick mode for testing
    if args.quick:
        args.limit = 5
        args.sources = ["apple_podcasts"]
        args.categories = ["seo"]
        logger.info("Running in quick test mode...")

    logger.info("Starting Podcast & YouTube Channel Scraper")
    logger.info(f"Sources: {args.sources or 'all'}")
    logger.info(f"Categories: {args.categories or 'all'}")
    logger.info(f"Limit per category: {args.limit}")
    logger.info(f"Output directory: {args.output}")

    # Get API keys
    youtube_api_key = args.youtube_api_key or os.getenv("YOUTUBE_API_KEY")
    listen_notes_api_key = args.listen_notes_api_key or os.getenv("LISTEN_NOTES_API_KEY")

    if not youtube_api_key:
        logger.warning("No YouTube API key provided. YouTube scraping will use web scraping (slower).")
    if not listen_notes_api_key:
        logger.warning("No Listen Notes API key provided. Listen Notes scraping will use web scraping (slower).")

    # Run scraper
    try:
        results = scrape_podcasts_and_channels(
            categories=args.categories,
            sources=args.sources,
            limit_per_category=args.limit,
            output_dir=args.output,
            youtube_api_key=youtube_api_key,
            listen_notes_api_key=listen_notes_api_key
        )

        # Print summary
        print("\n" + "=" * 60)
        print("SCRAPING COMPLETE")
        print("=" * 60)
        print(f"Total shows found: {results.get('total_count', 0)}")
        print("\nExported files:")
        for format_name, filepath in results.get("files", {}).items():
            print(f"  - {format_name}: {filepath}")
        print("=" * 60)

        return 0

    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Error during scraping: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
