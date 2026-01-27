"""Listen Notes scraper for podcast discovery."""

import json
import os
import re
import logging
from typing import Optional
from urllib.parse import quote_plus

from .base import BaseScraper
from ..models import ShowInfo, Category, SourceType

logger = logging.getLogger(__name__)


class ListenNotesScraper(BaseScraper):
    """Scraper for Listen Notes podcast search engine."""

    BASE_URL = "https://www.listennotes.com"
    SEARCH_URL = "https://www.listennotes.com/search/"
    API_URL = "https://listen-api.listennotes.com/api/v2"

    def __init__(self, api_key: str = None, rate_limit_delay: float = 1.5):
        """
        Initialize Listen Notes scraper.

        Args:
            api_key: Listen Notes API key (optional)
            rate_limit_delay: Delay between requests
        """
        super().__init__(rate_limit_delay)
        self.api_key = api_key or os.getenv("LISTEN_NOTES_API_KEY")

    def get_source_type(self) -> SourceType:
        return SourceType.LISTEN_NOTES

    def search_shows(self, category: Category, limit: int = 50) -> list[ShowInfo]:
        """
        Search Listen Notes for podcasts.

        Args:
            category: Category to search for
            limit: Maximum results

        Returns:
            List of ShowInfo objects
        """
        shows = []
        seen_ids = set()
        search_terms = self.CATEGORY_SEARCH_TERMS.get(category, [])

        for term in search_terms:
            if self.api_key:
                results = self._search_with_api(term, limit)
            else:
                results = self._search_with_scraping(term)

            for show in results:
                if show.url not in seen_ids:
                    seen_ids.add(show.url)
                    show.category = category
                    shows.append(show)

            if len(shows) >= limit:
                break

        return shows[:limit]

    def _search_with_api(self, query: str, limit: int = 50) -> list[ShowInfo]:
        """Search using Listen Notes API."""
        headers = {
            "X-ListenAPI-Key": self.api_key
        }

        params = {
            "q": query,
            "type": "podcast",
            "only_in": "title,description",
            "language": "English",
            "sort_by_date": 0,  # Sort by relevance
            "offset": 0,
            "len_min": 10,
        }

        # Override session headers for API
        original_headers = self.session.headers.copy()
        self.session.headers.update(headers)

        try:
            response = self._make_request(f"{self.API_URL}/search", params=params)
            if not response:
                return []

            data = response.json()
            shows = []

            for result in data.get("results", []):
                show = ShowInfo(
                    name=result.get("title_original", ""),
                    url=result.get("listennotes_url", ""),
                    description=result.get("description_original", ""),
                    author=result.get("publisher_original", ""),
                    episode_count=result.get("total_episodes", 0),
                    source=SourceType.LISTEN_NOTES
                )

                # Get genres for theme
                genres = result.get("genre_ids", [])
                show.social_links["genre_ids"] = genres

                # Store podcast ID
                show.social_links["podcast_id"] = result.get("id")

                shows.append(show)

            return shows

        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse Listen Notes API response: {e}")
            return []

        finally:
            self.session.headers = original_headers

    def _search_with_scraping(self, query: str) -> list[ShowInfo]:
        """Search using web scraping."""
        params = {
            "q": query,
            "sort_by_date": "0",
            "type": "podcast"
        }

        response = self._make_request(self.SEARCH_URL, params=params)
        if not response:
            return []

        soup = self._parse_html(response.text)
        return self._parse_search_results(soup)

    def _parse_search_results(self, soup) -> list[ShowInfo]:
        """Parse search results page."""
        shows = []

        # Look for podcast cards
        cards = soup.select('[class*="podcast-card"], [class*="search-result"]')

        if not cards:
            # Try alternative selectors
            cards = soup.select('a[href*="/podcasts/"]')

        for card in cards:
            try:
                # Get link
                link = card if card.name == "a" else card.select_one('a[href*="/podcasts/"]')
                if not link:
                    continue

                href = link.get("href", "")
                if not href or "/podcasts/" not in href:
                    continue

                # Build full URL
                if not href.startswith("http"):
                    url = f"{self.BASE_URL}{href}"
                else:
                    url = href

                # Get title
                title_elem = card.select_one('h2, h3, [class*="title"]')
                name = self._clean_text(title_elem.get_text()) if title_elem else ""

                # Get description
                desc_elem = card.select_one('p, [class*="description"]')
                description = self._clean_text(desc_elem.get_text()) if desc_elem else ""

                # Get author
                author_elem = card.select_one('[class*="publisher"], [class*="author"]')
                author = self._clean_text(author_elem.get_text()) if author_elem else ""

                if name:
                    show = ShowInfo(
                        name=name,
                        url=url,
                        description=description,
                        author=author,
                        source=SourceType.LISTEN_NOTES
                    )
                    shows.append(show)

            except Exception as e:
                logger.debug(f"Failed to parse search result: {e}")

        return shows

    def get_show_details(self, show_url: str) -> Optional[ShowInfo]:
        """
        Get detailed information about a podcast from Listen Notes.

        Args:
            show_url: Listen Notes podcast URL

        Returns:
            ShowInfo with full details
        """
        # If we have API key and a podcast ID, use API
        if self.api_key:
            podcast_id = self._extract_podcast_id(show_url)
            if podcast_id:
                return self._get_details_with_api(podcast_id, show_url)

        # Fall back to web scraping
        return self._get_details_with_scraping(show_url)

    def _extract_podcast_id(self, url: str) -> Optional[str]:
        """Extract podcast ID from URL."""
        # Listen Notes URLs look like: /podcasts/podcast-name-XXXX/
        match = re.search(r'/podcasts/[^/]+-([a-zA-Z0-9]+)/?', url)
        if match:
            return match.group(1)
        return None

    def _get_details_with_api(self, podcast_id: str, url: str) -> Optional[ShowInfo]:
        """Get podcast details using API."""
        headers = {
            "X-ListenAPI-Key": self.api_key
        }

        original_headers = self.session.headers.copy()
        self.session.headers.update(headers)

        try:
            response = self._make_request(f"{self.API_URL}/podcasts/{podcast_id}")
            if not response:
                return None

            data = response.json()

            show = ShowInfo(
                name=data.get("title", ""),
                url=url,
                description=data.get("description", ""),
                author=data.get("publisher", ""),
                episode_count=data.get("total_episodes", 0),
                email=data.get("email", ""),
                website=data.get("website", ""),
                source=SourceType.LISTEN_NOTES
            )

            # Get genres for theme
            genres = data.get("genre_ids", [])
            genre_map = self._get_genre_map()
            theme_names = [genre_map.get(g, "") for g in genres]
            show.theme = ", ".join(filter(None, theme_names))

            # Get top episodes
            episodes = data.get("episodes", [])[:5]
            show.top_episodes = [ep.get("title", "") for ep in episodes]

            # Social links
            if data.get("twitter_handle"):
                show.social_links["twitter"] = f"https://twitter.com/{data['twitter_handle']}"

            # Extract guests from recent episodes
            show.notable_guests = self._extract_guests_from_episodes(data.get("episodes", []))

            return show

        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse Listen Notes API response: {e}")
            return None

        finally:
            self.session.headers = original_headers

    def _get_details_with_scraping(self, url: str) -> Optional[ShowInfo]:
        """Get podcast details using web scraping."""
        response = self._make_request(url)
        if not response:
            return None

        soup = self._parse_html(response.text)
        return self._parse_podcast_page(soup, url)

    def _parse_podcast_page(self, soup, url: str) -> Optional[ShowInfo]:
        """Parse Listen Notes podcast page."""
        try:
            # Extract name
            name_elem = soup.select_one('h1')
            name = self._clean_text(name_elem.get_text()) if name_elem else ""

            # Extract description
            desc_elem = soup.select_one('meta[name="description"]')
            description = desc_elem.get("content", "") if desc_elem else ""

            if not description:
                desc_elem = soup.select_one('[class*="description"]')
                description = self._clean_text(desc_elem.get_text()) if desc_elem else ""

            # Extract author
            author_elem = soup.select_one('[class*="publisher"], [class*="author"]')
            author = self._clean_text(author_elem.get_text()) if author_elem else ""

            # Extract episode count
            episode_count = self._extract_episode_count(soup)

            # Extract categories for theme
            categories = soup.select('[class*="category"], [class*="genre"]')
            themes = [self._clean_text(c.get_text()) for c in categories]
            theme = ", ".join(filter(None, themes[:5]))

            # Extract email
            emails = self._extract_emails_from_page(soup)
            email = emails[0] if emails else ""

            # Extract top episodes
            top_episodes = self._extract_top_episodes(soup)

            # Extract website
            website = self._extract_website(soup)

            # Extract social links
            social_links = self._extract_social_links(soup)

            # Extract notable guests
            notable_guests = self._extract_guests_from_page(soup)

            show = ShowInfo(
                name=name,
                url=url,
                description=description,
                author=author,
                theme=theme or self._infer_theme(description, name),
                email=email,
                episode_count=episode_count,
                top_episodes=top_episodes,
                notable_guests=notable_guests,
                website=website,
                social_links=social_links,
                source=SourceType.LISTEN_NOTES
            )

            return show

        except Exception as e:
            logger.error(f"Failed to parse Listen Notes page: {e}")
            return None

    def _extract_episode_count(self, soup) -> int:
        """Extract episode count from page."""
        text = soup.get_text()
        patterns = [
            r'(\d+)\s*[Ee]pisodes?',
            r'[Ee]pisodes?\s*:?\s*(\d+)',
            r'(\d+)\s*(?:total\s*)?episodes?'
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))

        return 0

    def _extract_top_episodes(self, soup) -> list[str]:
        """Extract top episode titles."""
        episodes = []

        # Look for episode listings
        episode_elems = soup.select('[class*="episode"] h3, [class*="episode"] h4')
        if not episode_elems:
            episode_elems = soup.select('a[href*="/e/"]')

        for elem in episode_elems[:5]:
            title = self._clean_text(elem.get_text())
            if title and len(title) > 3:
                episodes.append(title)

        return episodes

    def _extract_website(self, soup) -> str:
        """Extract podcast website."""
        # Look for website link
        website_link = soup.select_one('a[rel="noopener"][href^="http"]:not([href*="listennotes.com"])')
        if website_link:
            href = website_link.get("href", "")
            if not any(social in href for social in ["twitter", "facebook", "instagram", "linkedin"]):
                return href
        return ""

    def _extract_social_links(self, soup) -> dict:
        """Extract social media links."""
        links = {}

        social_patterns = {
            "twitter": ["twitter.com", "x.com"],
            "facebook": ["facebook.com"],
            "instagram": ["instagram.com"],
            "linkedin": ["linkedin.com"],
            "youtube": ["youtube.com"]
        }

        all_links = soup.select('a[href^="http"]')

        for link in all_links:
            href = link.get("href", "")
            for platform, patterns in social_patterns.items():
                if any(p in href for p in patterns) and platform not in links:
                    links[platform] = href
                    break

        return links

    def _extract_guests_from_page(self, soup) -> list[str]:
        """Extract guest names from episode descriptions."""
        guests = []

        episode_elems = soup.select('[class*="episode"]')

        for ep in episode_elems[:20]:
            text = ep.get_text()
            patterns = [
                r'(?:with|featuring|ft\.?|guest:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:on|talks|shares|discusses)',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, text)
                guests.extend(matches)

        return list(dict.fromkeys(guests))[:10]

    def _extract_guests_from_episodes(self, episodes: list) -> list[str]:
        """Extract guest names from episode data (API response)."""
        guests = []

        for ep in episodes[:20]:
            title = ep.get("title", "")
            description = ep.get("description", "")
            text = f"{title} {description}"

            patterns = [
                r'(?:with|featuring|ft\.?|guest:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:on|talks|shares|discusses)',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                guests.extend(matches)

        return list(dict.fromkeys(guests))[:10]

    def _get_genre_map(self) -> dict:
        """Return mapping of genre IDs to names."""
        # Listen Notes genre IDs
        return {
            67: "Religion & Spirituality",
            68: "TV & Film",
            69: "News",
            70: "Kids & Family",
            71: "Leisure",
            72: "Music",
            73: "Science",
            74: "Sports",
            75: "Business",
            76: "History",
            77: "Society & Culture",
            78: "Comedy",
            79: "Health & Fitness",
            81: "Technology",
            82: "True Crime",
            83: "Arts",
            84: "Fiction",
            85: "Games",
            86: "Government",
            88: "Education",
            93: "Marketing",
            94: "Entrepreneurship",
            95: "Management",
            97: "Investing",
            98: "Careers",
            99: "Non-Profit",
            100: "SEO",
            101: "Self-Improvement",
            127: "Crypto & Blockchain",
            132: "AI & Machine Learning",
        }

    def _infer_theme(self, description: str, name: str) -> str:
        """Infer theme from description and name."""
        combined = f"{name} {description}".lower()

        themes = []
        theme_keywords = {
            "SEO": ["seo", "search engine", "ranking", "google", "backlink"],
            "Marketing": ["marketing", "content", "brand", "advertising"],
            "Business": ["business", "entrepreneur", "startup", "founder"],
            "Technology": ["tech", "technology", "software", "digital"],
            "AI": ["ai", "artificial intelligence", "machine learning", "chatgpt"],
            "PR": ["public relations", "pr ", "media", "press"],
        }

        for theme, keywords in theme_keywords.items():
            if any(kw in combined for kw in keywords):
                themes.append(theme)

        return ", ".join(themes) if themes else "General"
