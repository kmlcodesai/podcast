"""Main scraper orchestration module."""

import logging
import os
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from tqdm import tqdm

from .models import ShowInfo, Category, SourceType
from .scrapers import (
    ApplePodcastsScraper,
    YouTubeScraper,
    PodchaserScraper,
    ListenNotesScraper
)
from .export import DataExporter, export_shows

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class PodcastScraper:
    """
    Main orchestrator for scraping podcasts and YouTube channels
    across multiple platforms and categories.
    """

    def __init__(
        self,
        youtube_api_key: str = None,
        listen_notes_api_key: str = None,
        rate_limit_delay: float = 1.5,
        max_workers: int = 3
    ):
        """
        Initialize the podcast scraper.

        Args:
            youtube_api_key: YouTube Data API key (optional)
            listen_notes_api_key: Listen Notes API key (optional)
            rate_limit_delay: Delay between requests
            max_workers: Max concurrent scrapers
        """
        self.rate_limit_delay = rate_limit_delay
        self.max_workers = max_workers

        # Initialize scrapers
        self.scrapers = {
            SourceType.APPLE_PODCASTS: ApplePodcastsScraper(rate_limit_delay),
            SourceType.YOUTUBE: YouTubeScraper(youtube_api_key, rate_limit_delay),
            SourceType.PODCHASER: PodchaserScraper(rate_limit_delay),
            SourceType.LISTEN_NOTES: ListenNotesScraper(listen_notes_api_key, rate_limit_delay),
        }

        self.exporter = DataExporter()

    def scrape_source(
        self,
        source: SourceType,
        categories: list[Category] = None,
        limit_per_category: int = 25
    ) -> list[ShowInfo]:
        """
        Scrape a single source across all or specified categories.

        Args:
            source: Source platform to scrape
            categories: Categories to scrape (all if None)
            limit_per_category: Max shows per category

        Returns:
            List of ShowInfo objects
        """
        if categories is None:
            categories = list(Category)

        scraper = self.scrapers.get(source)
        if not scraper:
            logger.error(f"Unknown source: {source}")
            return []

        all_shows = []

        for category in tqdm(categories, desc=f"Scraping {source.value}"):
            try:
                shows = scraper.scrape_category(category, limit_per_category)
                all_shows.extend(shows)
                logger.info(f"Found {len(shows)} shows for {category.value} from {source.value}")
            except Exception as e:
                logger.error(f"Error scraping {category.value} from {source.value}: {e}")

        return all_shows

    def scrape_all_sources(
        self,
        categories: list[Category] = None,
        sources: list[SourceType] = None,
        limit_per_category: int = 25,
        parallel: bool = False
    ) -> list[ShowInfo]:
        """
        Scrape all or specified sources across categories.

        Args:
            categories: Categories to scrape (all if None)
            sources: Sources to scrape (all if None)
            limit_per_category: Max shows per category per source
            parallel: Whether to run scrapers in parallel

        Returns:
            List of all ShowInfo objects
        """
        if categories is None:
            categories = list(Category)

        if sources is None:
            sources = list(SourceType)

        all_shows = []

        if parallel:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {
                    executor.submit(
                        self.scrape_source,
                        source,
                        categories,
                        limit_per_category
                    ): source
                    for source in sources
                }

                for future in tqdm(as_completed(futures), total=len(futures), desc="Scraping sources"):
                    source = futures[future]
                    try:
                        shows = future.result()
                        all_shows.extend(shows)
                    except Exception as e:
                        logger.error(f"Error scraping {source.value}: {e}")
        else:
            for source in sources:
                shows = self.scrape_source(source, categories, limit_per_category)
                all_shows.extend(shows)

        logger.info(f"Total shows scraped: {len(all_shows)}")
        return all_shows

    def scrape_and_export(
        self,
        categories: list[Category] = None,
        sources: list[SourceType] = None,
        limit_per_category: int = 25,
        output_dir: str = "output",
        export_format: str = "all",
        deduplicate: bool = True
    ) -> dict:
        """
        Scrape data and export to files.

        Args:
            categories: Categories to scrape
            sources: Sources to scrape
            limit_per_category: Max shows per category
            output_dir: Output directory
            export_format: Export format (csv, excel, all)
            deduplicate: Whether to merge duplicates

        Returns:
            Dictionary with results and file paths
        """
        # Scrape data
        shows = self.scrape_all_sources(
            categories=categories,
            sources=sources,
            limit_per_category=limit_per_category
        )

        if not shows:
            logger.warning("No shows found!")
            return {"shows": [], "files": {}}

        # Export data
        files = export_shows(
            shows=shows,
            output_dir=output_dir,
            format=export_format,
            deduplicate=deduplicate
        )

        return {
            "shows": shows,
            "files": files,
            "total_count": len(shows)
        }


def scrape_podcasts_and_channels(
    categories: list[str] = None,
    sources: list[str] = None,
    limit_per_category: int = 25,
    output_dir: str = "output",
    youtube_api_key: str = None,
    listen_notes_api_key: str = None
) -> dict:
    """
    Convenience function to scrape podcasts and YouTube channels.

    Args:
        categories: List of category names (seo, digital_pr, content_marketing, ai, entrepreneurship)
        sources: List of source names (apple_podcasts, youtube, podchaser, listen_notes)
        limit_per_category: Max shows per category per source
        output_dir: Output directory
        youtube_api_key: YouTube API key
        listen_notes_api_key: Listen Notes API key

    Returns:
        Dictionary with results and file paths
    """
    # Parse categories
    if categories:
        parsed_categories = []
        for cat in categories:
            try:
                parsed_categories.append(Category(cat.lower()))
            except ValueError:
                logger.warning(f"Unknown category: {cat}")
    else:
        parsed_categories = None

    # Parse sources
    if sources:
        parsed_sources = []
        for src in sources:
            try:
                parsed_sources.append(SourceType(src.lower()))
            except ValueError:
                logger.warning(f"Unknown source: {src}")
    else:
        parsed_sources = None

    # Create scraper and run
    scraper = PodcastScraper(
        youtube_api_key=youtube_api_key or os.getenv("YOUTUBE_API_KEY"),
        listen_notes_api_key=listen_notes_api_key or os.getenv("LISTEN_NOTES_API_KEY")
    )

    return scraper.scrape_and_export(
        categories=parsed_categories,
        sources=parsed_sources,
        limit_per_category=limit_per_category,
        output_dir=output_dir
    )
