"""Apple Podcasts scraper using iTunes Search API and web scraping."""

import json
import re
import logging
from typing import Optional
from urllib.parse import quote_plus

from .base import BaseScraper
from ..models import ShowInfo, Category, SourceType

logger = logging.getLogger(__name__)


class ApplePodcastsScraper(BaseScraper):
    """Scraper for Apple Podcasts using iTunes Search API."""

    ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
    ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup"

    def get_source_type(self) -> SourceType:
        return SourceType.APPLE_PODCASTS

    def search_shows(self, category: Category, limit: int = 50) -> list[ShowInfo]:
        """
        Search Apple Podcasts using iTunes Search API.

        Args:
            category: Category to search for
            limit: Maximum results per search term

        Returns:
            List of ShowInfo objects
        """
        shows = []
        seen_ids = set()
        search_terms = self.CATEGORY_SEARCH_TERMS.get(category, [])

        for term in search_terms:
            results = self._search_itunes(term, limit=min(limit, 50))
            for show in results:
                # Deduplicate by podcast ID
                if show.url not in seen_ids:
                    seen_ids.add(show.url)
                    show.category = category
                    shows.append(show)

            if len(shows) >= limit:
                break

        return shows[:limit]

    def _search_itunes(self, query: str, limit: int = 50) -> list[ShowInfo]:
        """
        Search iTunes API for podcasts.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of ShowInfo objects
        """
        params = {
            "term": query,
            "media": "podcast",
            "entity": "podcast",
            "limit": limit,
            "country": "US"
        }

        response = self._make_request(self.ITUNES_SEARCH_URL, params=params)
        if not response:
            return []

        try:
            data = response.json()
            shows = []

            for result in data.get("results", []):
                show = ShowInfo(
                    name=result.get("collectionName", ""),
                    url=result.get("collectionViewUrl", ""),
                    description=result.get("description", "") or result.get("collectionName", ""),
                    author=result.get("artistName", ""),
                    episode_count=result.get("trackCount", 0),
                    source=SourceType.APPLE_PODCASTS
                )

                # Extract theme from genres
                genres = result.get("genres", [])
                show.theme = ", ".join(genres) if genres else ""

                # Store podcast ID for later lookup
                show.social_links["podcast_id"] = result.get("collectionId")
                show.social_links["feed_url"] = result.get("feedUrl", "")

                shows.append(show)

            return shows

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse iTunes response: {e}")
            return []

    def get_show_details(self, show_url: str) -> Optional[ShowInfo]:
        """
        Get detailed information about a podcast.

        Args:
            show_url: Apple Podcasts URL

        Returns:
            ShowInfo with full details
        """
        # First try to get basic info from the web page
        response = self._make_request(show_url)
        if not response:
            return None

        soup = self._parse_html(response.text)
        show = self._parse_podcast_page(soup, show_url)

        if show:
            # Try to get RSS feed for more details
            feed_url = self._extract_feed_url(soup)
            if feed_url:
                self._enrich_from_feed(show, feed_url)

        return show

    def _parse_podcast_page(self, soup, url: str) -> Optional[ShowInfo]:
        """Parse Apple Podcasts web page for show information."""
        try:
            # Extract name
            name_elem = soup.select_one('h1[class*="headings__title"]')
            if not name_elem:
                name_elem = soup.find("h1")
            name = self._clean_text(name_elem.get_text()) if name_elem else ""

            # Extract author
            author_elem = soup.select_one('span[class*="headings__subtitles"]')
            if not author_elem:
                author_elem = soup.select_one('a[href*="/artist/"]')
            author = self._clean_text(author_elem.get_text()) if author_elem else ""

            # Extract description
            desc_elem = soup.select_one('section[class*="product-hero-desc"] p')
            if not desc_elem:
                desc_elem = soup.select_one('meta[name="description"]')
                description = desc_elem.get("content", "") if desc_elem else ""
            else:
                description = self._clean_text(desc_elem.get_text())

            # Extract episode count from page
            episode_count = self._extract_episode_count(soup)

            # Extract top episodes
            top_episodes = self._extract_top_episodes(soup)

            # Try to find email on the page
            emails = self._extract_emails_from_page(soup)
            email = emails[0] if emails else ""

            # Extract website link
            website = self._extract_website(soup)

            # Create ShowInfo
            show = ShowInfo(
                name=name,
                url=url,
                description=description,
                author=author,
                email=email,
                episode_count=episode_count,
                top_episodes=top_episodes,
                website=website,
                source=SourceType.APPLE_PODCASTS
            )

            # Infer theme from description
            show.theme = self._infer_theme(description, name)

            return show

        except Exception as e:
            logger.error(f"Failed to parse podcast page: {e}")
            return None

    def _extract_episode_count(self, soup) -> int:
        """Extract episode count from the page."""
        # Look for episode count in various places
        text = soup.get_text()

        # Pattern like "100 Episodes" or "100 episodes"
        match = re.search(r'(\d+)\s*[Ee]pisodes?', text)
        if match:
            return int(match.group(1))

        # Count episode elements
        episodes = soup.select('li[class*="episode"]')
        if episodes:
            return len(episodes)

        return 0

    def _extract_top_episodes(self, soup) -> list[str]:
        """Extract top/featured episode titles."""
        episodes = []

        # Look for episode list items
        episode_elems = soup.select('li[class*="episode"] h2')
        if not episode_elems:
            episode_elems = soup.select('div[class*="episode"] h3')
        if not episode_elems:
            episode_elems = soup.select('a[href*="/episode/"]')

        for elem in episode_elems[:5]:
            title = self._clean_text(elem.get_text())
            if title and len(title) > 3:
                episodes.append(title)

        return episodes

    def _extract_website(self, soup) -> str:
        """Extract podcast website link."""
        # Look for website link
        website_link = soup.select_one('a[class*="link"][href*="http"]:not([href*="apple.com"])')
        if website_link:
            return website_link.get("href", "")

        # Look in meta tags
        meta_url = soup.select_one('meta[property="og:see_also"]')
        if meta_url:
            return meta_url.get("content", "")

        return ""

    def _extract_feed_url(self, soup) -> str:
        """Extract RSS feed URL from the page."""
        # Look for feed URL in script tags
        scripts = soup.find_all("script", type="application/ld+json")
        for script in scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and "feedUrl" in data:
                    return data["feedUrl"]
            except (json.JSONDecodeError, TypeError):
                continue

        return ""

    def _enrich_from_feed(self, show: ShowInfo, feed_url: str):
        """Enrich show info from RSS feed."""
        response = self._make_request(feed_url)
        if not response:
            return

        soup = self._parse_html(response.text)

        # Extract email from feed
        if not show.email:
            email_elem = soup.find("itunes:email")
            if email_elem:
                show.email = email_elem.get_text()
            else:
                # Look for owner email
                owner = soup.find("itunes:owner")
                if owner:
                    email_elem = owner.find("itunes:email")
                    if email_elem:
                        show.email = email_elem.get_text()

        # Extract categories/keywords for theme
        categories = soup.find_all("itunes:category")
        if categories:
            cats = [c.get("text", "") for c in categories if c.get("text")]
            if cats:
                show.theme = ", ".join(cats)

        # Extract top episodes from feed
        if not show.top_episodes:
            items = soup.find_all("item")[:5]
            show.top_episodes = [
                self._clean_text(item.find("title").get_text())
                for item in items
                if item.find("title")
            ]

        # Update episode count
        if show.episode_count == 0:
            items = soup.find_all("item")
            show.episode_count = len(items)

        # Extract guests from episode descriptions
        show.notable_guests = self._extract_guests_from_feed(soup)

    def _extract_guests_from_feed(self, soup) -> list[str]:
        """Extract guest names from episode descriptions."""
        guests = []
        items = soup.find_all("item")[:20]  # Check recent episodes

        guest_patterns = [
            r'(?:guest|featuring|with|interview(?:ing)?)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            r'([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:joins|shares|discusses)',
        ]

        for item in items:
            desc = item.find("description")
            if desc:
                text = desc.get_text()
                for pattern in guest_patterns:
                    matches = re.findall(pattern, text, re.IGNORECASE)
                    guests.extend(matches)

            # Also check title for guest names
            title = item.find("title")
            if title:
                text = title.get_text()
                for pattern in guest_patterns:
                    matches = re.findall(pattern, text, re.IGNORECASE)
                    guests.extend(matches)

        # Deduplicate and limit
        return list(dict.fromkeys(guests))[:10]

    def _infer_theme(self, description: str, name: str) -> str:
        """Infer theme from description and name."""
        combined = f"{name} {description}".lower()

        themes = []
        theme_keywords = {
            "SEO": ["seo", "search engine", "ranking", "google"],
            "Marketing": ["marketing", "content", "brand", "advertising"],
            "Business": ["business", "entrepreneur", "startup", "founder"],
            "Technology": ["tech", "technology", "software", "digital"],
            "AI": ["ai", "artificial intelligence", "machine learning", "ml"],
        }

        for theme, keywords in theme_keywords.items():
            if any(kw in combined for kw in keywords):
                themes.append(theme)

        return ", ".join(themes) if themes else "General"
