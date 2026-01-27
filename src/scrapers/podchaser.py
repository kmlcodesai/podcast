"""Podchaser scraper for podcast discovery."""

import json
import re
import logging
from typing import Optional
from urllib.parse import quote_plus

from .base import BaseScraper
from ..models import ShowInfo, Category, SourceType

logger = logging.getLogger(__name__)


class PodchaserScraper(BaseScraper):
    """Scraper for Podchaser podcast directory."""

    BASE_URL = "https://www.podchaser.com"
    SEARCH_URL = "https://www.podchaser.com/search/podcasts"
    API_URL = "https://api.podchaser.com/graphql"

    def get_source_type(self) -> SourceType:
        return SourceType.PODCHASER

    def search_shows(self, category: Category, limit: int = 50) -> list[ShowInfo]:
        """
        Search Podchaser for podcasts.

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
            # Search via web interface
            results = self._search_podcasts(term)

            for show in results:
                if show.url not in seen_ids:
                    seen_ids.add(show.url)
                    show.category = category
                    shows.append(show)

            if len(shows) >= limit:
                break

        return shows[:limit]

    def _search_podcasts(self, query: str) -> list[ShowInfo]:
        """Search podcasts on Podchaser."""
        url = f"{self.SEARCH_URL}"
        params = {"q": query}

        response = self._make_request(url, params=params)
        if not response:
            return []

        soup = self._parse_html(response.text)
        return self._parse_search_results(soup)

    def _parse_search_results(self, soup) -> list[ShowInfo]:
        """Parse search results page."""
        shows = []

        # Look for podcast cards in search results
        cards = soup.select('a[href*="/podcasts/"]')

        for card in cards:
            try:
                href = card.get("href", "")
                if "/podcasts/" not in href or "/episode" in href:
                    continue

                # Build full URL
                if not href.startswith("http"):
                    url = f"{self.BASE_URL}{href}"
                else:
                    url = href

                # Get title
                title_elem = card.select_one('h3, h4, [class*="title"]')
                name = self._clean_text(title_elem.get_text()) if title_elem else ""

                if not name:
                    # Try getting text from the card itself
                    name = self._clean_text(card.get_text())

                if name and url:
                    show = ShowInfo(
                        name=name,
                        url=url,
                        source=SourceType.PODCHASER
                    )
                    shows.append(show)

            except Exception as e:
                logger.debug(f"Failed to parse search result: {e}")

        return shows

    def get_show_details(self, show_url: str) -> Optional[ShowInfo]:
        """
        Get detailed information about a podcast from Podchaser.

        Args:
            show_url: Podchaser podcast URL

        Returns:
            ShowInfo with full details
        """
        response = self._make_request(show_url)
        if not response:
            return None

        soup = self._parse_html(response.text)
        return self._parse_podcast_page(soup, show_url)

    def _parse_podcast_page(self, soup, url: str) -> Optional[ShowInfo]:
        """Parse Podchaser podcast page."""
        try:
            # Extract name
            name_elem = soup.select_one('h1')
            name = self._clean_text(name_elem.get_text()) if name_elem else ""

            # Extract description
            desc_elem = soup.select_one('meta[name="description"]')
            description = desc_elem.get("content", "") if desc_elem else ""

            # Try to find description in page content
            if not description:
                desc_elem = soup.select_one('[class*="description"], [class*="about"]')
                description = self._clean_text(desc_elem.get_text()) if desc_elem else ""

            # Extract author/creator
            author_elem = soup.select_one('[class*="creator"], [class*="author"]')
            author = self._clean_text(author_elem.get_text()) if author_elem else ""

            # Extract categories/genres for theme
            categories = soup.select('[class*="category"], [class*="genre"]')
            themes = [self._clean_text(c.get_text()) for c in categories if c.get_text()]
            theme = ", ".join(themes[:5]) if themes else ""

            # Extract episode count
            episode_count = self._extract_episode_count(soup)

            # Extract email
            emails = self._extract_emails_from_page(soup)
            email = emails[0] if emails else ""

            # Extract top episodes
            top_episodes = self._extract_top_episodes(soup)

            # Extract notable guests
            notable_guests = self._extract_guests(soup)

            # Extract website and social links
            links = self._extract_links(soup)

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
                website=links.get("website", ""),
                social_links=links,
                source=SourceType.PODCHASER
            )

            return show

        except Exception as e:
            logger.error(f"Failed to parse Podchaser page: {e}")
            return None

    def _extract_episode_count(self, soup) -> int:
        """Extract episode count from page."""
        # Look for episode count text
        text = soup.get_text()
        patterns = [
            r'(\d+)\s*[Ee]pisodes?',
            r'[Ee]pisodes?\s*:?\s*(\d+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))

        # Count episode elements
        episodes = soup.select('[class*="episode"]')
        if episodes:
            return len(episodes)

        return 0

    def _extract_top_episodes(self, soup) -> list[str]:
        """Extract top episode titles."""
        episodes = []

        # Look for episode listings
        episode_elems = soup.select('[class*="episode"] h3, [class*="episode"] h4')
        if not episode_elems:
            episode_elems = soup.select('a[href*="/episodes/"]')

        for elem in episode_elems[:5]:
            title = self._clean_text(elem.get_text())
            if title and len(title) > 3:
                episodes.append(title)

        return episodes

    def _extract_guests(self, soup) -> list[str]:
        """Extract notable guests from podcast page."""
        guests = []

        # Podchaser has a credits/guests section
        guest_elems = soup.select('[class*="guest"], [class*="credit"]')

        for elem in guest_elems:
            name = self._clean_text(elem.get_text())
            # Filter to likely person names (2-4 words, capitalized)
            words = name.split()
            if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
                guests.append(name)

        # Also look for guest patterns in episode titles
        episodes = soup.select('[class*="episode"]')
        for ep in episodes[:20]:
            text = ep.get_text()
            patterns = [
                r'(?:with|featuring|ft\.?|guest:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:on|talks|shares)',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, text)
                guests.extend(matches)

        # Deduplicate
        return list(dict.fromkeys(guests))[:10]

    def _extract_links(self, soup) -> dict:
        """Extract website and social links."""
        links = {}

        # Look for external links
        link_elems = soup.select('a[href^="http"]:not([href*="podchaser.com"])')

        for link in link_elems:
            href = link.get("href", "")
            text = self._clean_text(link.get_text()).lower()

            if "twitter" in href or "x.com" in href:
                links["twitter"] = href
            elif "facebook" in href:
                links["facebook"] = href
            elif "instagram" in href:
                links["instagram"] = href
            elif "linkedin" in href:
                links["linkedin"] = href
            elif "youtube" in href:
                links["youtube"] = href
            elif any(x in text for x in ["website", "site", "home"]):
                links["website"] = href
            elif href and "website" not in links:
                # Assume first external non-social link is website
                if not any(social in href for social in ["twitter", "facebook", "instagram", "linkedin"]):
                    links["website"] = href

        return links

    def _infer_theme(self, description: str, name: str) -> str:
        """Infer theme from description and name."""
        combined = f"{name} {description}".lower()

        themes = []
        theme_keywords = {
            "SEO": ["seo", "search engine", "ranking", "google"],
            "Marketing": ["marketing", "content", "brand", "advertising"],
            "Business": ["business", "entrepreneur", "startup", "founder"],
            "Technology": ["tech", "technology", "software", "digital"],
            "AI": ["ai", "artificial intelligence", "machine learning"],
        }

        for theme, keywords in theme_keywords.items():
            if any(kw in combined for kw in keywords):
                themes.append(theme)

        return ", ".join(themes) if themes else "General"
