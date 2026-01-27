"""Base scraper class with common functionality."""

import time
import random
import re
import logging
from abc import ABC, abstractmethod
from typing import Optional

import requests
from bs4 import BeautifulSoup

from ..models import ShowInfo, Category, SourceType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base class for all scrapers."""

    # Common user agents for rotation
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    ]

    # Search terms for each category
    CATEGORY_SEARCH_TERMS = {
        Category.SEO: [
            "SEO podcast", "search engine optimization", "SEO marketing",
            "technical SEO", "link building", "SEO strategy"
        ],
        Category.DIGITAL_PR: [
            "digital PR podcast", "public relations marketing", "PR strategy",
            "media relations", "brand PR", "digital public relations"
        ],
        Category.CONTENT_MARKETING: [
            "content marketing podcast", "content strategy", "content creation",
            "blog marketing", "inbound marketing", "content marketing strategy"
        ],
        Category.AI: [
            "AI podcast", "artificial intelligence", "machine learning podcast",
            "AI technology", "AI business", "generative AI"
        ],
        Category.ENTREPRENEURSHIP: [
            "entrepreneurship podcast", "startup podcast", "business podcast",
            "founder stories", "entrepreneur interviews", "small business"
        ]
    }

    def __init__(self, rate_limit_delay: float = 1.0):
        """
        Initialize the scraper.

        Args:
            rate_limit_delay: Minimum delay between requests in seconds
        """
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        self._last_request_time = 0

    def _get_headers(self) -> dict:
        """Get request headers with random user agent."""
        return {
            "User-Agent": random.choice(self.USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }

    def _rate_limit(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - elapsed + random.uniform(0.1, 0.5)
            time.sleep(sleep_time)
        self._last_request_time = time.time()

    def _make_request(self, url: str, params: dict = None, retries: int = 3) -> Optional[requests.Response]:
        """
        Make an HTTP request with retry logic.

        Args:
            url: URL to request
            params: Query parameters
            retries: Number of retry attempts

        Returns:
            Response object or None if failed
        """
        self._rate_limit()

        for attempt in range(retries):
            try:
                response = self.session.get(
                    url,
                    params=params,
                    headers=self._get_headers(),
                    timeout=30
                )
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"All retries failed for URL: {url}")
                    return None

    def _parse_html(self, html: str) -> BeautifulSoup:
        """Parse HTML content."""
        return BeautifulSoup(html, "lxml")

    def _extract_email(self, text: str) -> str:
        """Extract email address from text."""
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        match = re.search(email_pattern, text)
        return match.group(0) if match else ""

    def _extract_emails_from_page(self, soup: BeautifulSoup) -> list[str]:
        """Extract all email addresses from a page."""
        text = soup.get_text()
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, text)
        # Filter out common non-contact emails
        filtered = [
            e for e in emails
            if not any(x in e.lower() for x in ['example.com', 'sentry.io', 'localhost'])
        ]
        return list(set(filtered))

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        if not text:
            return ""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @abstractmethod
    def get_source_type(self) -> SourceType:
        """Return the source type for this scraper."""
        pass

    @abstractmethod
    def search_shows(self, category: Category, limit: int = 50) -> list[ShowInfo]:
        """
        Search for shows in a given category.

        Args:
            category: The content category to search for
            limit: Maximum number of results to return

        Returns:
            List of ShowInfo objects
        """
        pass

    @abstractmethod
    def get_show_details(self, show_url: str) -> Optional[ShowInfo]:
        """
        Get detailed information about a specific show.

        Args:
            show_url: URL of the show

        Returns:
            ShowInfo object with full details or None if failed
        """
        pass

    def scrape_category(self, category: Category, limit: int = 50) -> list[ShowInfo]:
        """
        Scrape shows for a specific category.

        Args:
            category: The content category to scrape
            limit: Maximum number of shows to return

        Returns:
            List of ShowInfo objects with full details
        """
        logger.info(f"Scraping {category.value} from {self.get_source_type().value}")

        # First, search for shows
        shows = self.search_shows(category, limit)
        logger.info(f"Found {len(shows)} shows")

        # Then, get detailed info for each
        detailed_shows = []
        for i, show in enumerate(shows):
            logger.info(f"Getting details for show {i + 1}/{len(shows)}: {show.name}")
            detailed = self.get_show_details(show.url)
            if detailed:
                detailed.category = category
                detailed_shows.append(detailed)

        return detailed_shows

    def scrape_all_categories(self, limit_per_category: int = 50) -> list[ShowInfo]:
        """
        Scrape shows for all categories.

        Args:
            limit_per_category: Maximum shows per category

        Returns:
            List of all ShowInfo objects
        """
        all_shows = []
        for category in Category:
            shows = self.scrape_category(category, limit_per_category)
            all_shows.extend(shows)
        return all_shows
