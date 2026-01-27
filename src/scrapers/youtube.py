"""YouTube channel scraper using YouTube Data API and web scraping."""

import json
import os
import re
import logging
from typing import Optional
from urllib.parse import quote_plus, urlparse, parse_qs

from .base import BaseScraper
from ..models import ShowInfo, Category, SourceType

logger = logging.getLogger(__name__)


class YouTubeScraper(BaseScraper):
    """Scraper for YouTube channels."""

    YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
    YOUTUBE_SEARCH_URL = "https://www.youtube.com/results"

    def __init__(self, api_key: str = None, rate_limit_delay: float = 1.5):
        """
        Initialize YouTube scraper.

        Args:
            api_key: YouTube Data API key (optional, will use web scraping if not provided)
            rate_limit_delay: Delay between requests
        """
        super().__init__(rate_limit_delay)
        self.api_key = api_key or os.getenv("YOUTUBE_API_KEY")

    def get_source_type(self) -> SourceType:
        return SourceType.YOUTUBE

    def search_shows(self, category: Category, limit: int = 50) -> list[ShowInfo]:
        """
        Search for YouTube channels in a category.

        Args:
            category: Category to search for
            limit: Maximum results

        Returns:
            List of ShowInfo objects
        """
        if self.api_key:
            return self._search_with_api(category, limit)
        else:
            return self._search_with_scraping(category, limit)

    def _search_with_api(self, category: Category, limit: int) -> list[ShowInfo]:
        """Search using YouTube Data API."""
        shows = []
        seen_ids = set()
        search_terms = self.CATEGORY_SEARCH_TERMS.get(category, [])

        for term in search_terms:
            # Append "podcast" or "show" to find channels with regular content
            search_query = f"{term} podcast"

            params = {
                "part": "snippet",
                "q": search_query,
                "type": "channel",
                "maxResults": min(limit, 50),
                "key": self.api_key
            }

            response = self._make_request(f"{self.YOUTUBE_API_BASE}/search", params=params)
            if not response:
                continue

            try:
                data = response.json()
                for item in data.get("items", []):
                    channel_id = item["snippet"]["channelId"]
                    if channel_id in seen_ids:
                        continue
                    seen_ids.add(channel_id)

                    show = ShowInfo(
                        name=item["snippet"]["title"],
                        url=f"https://www.youtube.com/channel/{channel_id}",
                        description=item["snippet"]["description"],
                        source=SourceType.YOUTUBE,
                        category=category
                    )
                    show.social_links["channel_id"] = channel_id
                    shows.append(show)

                if len(shows) >= limit:
                    break

            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"Failed to parse YouTube API response: {e}")

        return shows[:limit]

    def _search_with_scraping(self, category: Category, limit: int) -> list[ShowInfo]:
        """Search using web scraping (no API key required)."""
        shows = []
        seen_ids = set()
        search_terms = self.CATEGORY_SEARCH_TERMS.get(category, [])

        for term in search_terms:
            search_query = f"{term} podcast"

            params = {
                "search_query": search_query,
                "sp": "EgIQAg%3D%3D"  # Filter for channels
            }

            response = self._make_request(self.YOUTUBE_SEARCH_URL, params=params)
            if not response:
                continue

            # YouTube returns data in JSON within the HTML
            channels = self._extract_channels_from_html(response.text, category)

            for show in channels:
                channel_id = show.social_links.get("channel_id", show.url)
                if channel_id not in seen_ids:
                    seen_ids.add(channel_id)
                    shows.append(show)

            if len(shows) >= limit:
                break

        return shows[:limit]

    def _extract_channels_from_html(self, html: str, category: Category) -> list[ShowInfo]:
        """Extract channel data from YouTube search results HTML."""
        shows = []

        # YouTube embeds data in a script tag
        pattern = r'var ytInitialData = ({.+?});'
        match = re.search(pattern, html)

        if not match:
            # Try alternative pattern
            pattern = r'ytInitialData\s*=\s*({.+?});'
            match = re.search(pattern, html)

        if match:
            try:
                data = json.loads(match.group(1))
                contents = self._extract_search_results(data)

                for item in contents:
                    channel = self._parse_channel_result(item)
                    if channel:
                        channel.category = category
                        shows.append(channel)

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse YouTube data: {e}")

        return shows

    def _extract_search_results(self, data: dict) -> list:
        """Navigate the nested YouTube data structure to find search results."""
        try:
            contents = (
                data.get("contents", {})
                .get("twoColumnSearchResultsRenderer", {})
                .get("primaryContents", {})
                .get("sectionListRenderer", {})
                .get("contents", [])
            )

            results = []
            for section in contents:
                items = (
                    section.get("itemSectionRenderer", {})
                    .get("contents", [])
                )
                results.extend(items)

            return results
        except (KeyError, AttributeError):
            return []

    def _parse_channel_result(self, item: dict) -> Optional[ShowInfo]:
        """Parse a single channel from search results."""
        channel_data = item.get("channelRenderer")
        if not channel_data:
            return None

        try:
            channel_id = channel_data.get("channelId", "")
            title = channel_data.get("title", {}).get("simpleText", "")

            # Get description
            desc_runs = channel_data.get("descriptionSnippet", {}).get("runs", [])
            description = "".join(run.get("text", "") for run in desc_runs)

            # Get subscriber count and video count
            subscriber_text = channel_data.get("subscriberCountText", {}).get("simpleText", "")
            video_count_text = channel_data.get("videoCountText", {}).get("simpleText", "")

            # Parse video count
            video_count = 0
            if video_count_text:
                match = re.search(r'([\d,]+)', video_count_text)
                if match:
                    video_count = int(match.group(1).replace(",", ""))

            show = ShowInfo(
                name=title,
                url=f"https://www.youtube.com/channel/{channel_id}",
                description=description,
                episode_count=video_count,
                source=SourceType.YOUTUBE
            )
            show.social_links["channel_id"] = channel_id
            show.social_links["subscribers"] = subscriber_text

            return show

        except (KeyError, AttributeError) as e:
            logger.debug(f"Failed to parse channel: {e}")
            return None

    def get_show_details(self, show_url: str) -> Optional[ShowInfo]:
        """
        Get detailed information about a YouTube channel.

        Args:
            show_url: YouTube channel URL

        Returns:
            ShowInfo with full details
        """
        # Extract channel ID from URL
        channel_id = self._extract_channel_id(show_url)
        if not channel_id:
            logger.error(f"Could not extract channel ID from URL: {show_url}")
            return None

        if self.api_key:
            return self._get_details_with_api(channel_id)
        else:
            return self._get_details_with_scraping(show_url, channel_id)

    def _extract_channel_id(self, url: str) -> Optional[str]:
        """Extract channel ID from various YouTube URL formats."""
        # Handle /channel/UC... format
        match = re.search(r'/channel/([^/?]+)', url)
        if match:
            return match.group(1)

        # Handle /@username format
        match = re.search(r'/@([^/?]+)', url)
        if match:
            return f"@{match.group(1)}"

        # Handle /c/channelname format
        match = re.search(r'/c/([^/?]+)', url)
        if match:
            return f"c/{match.group(1)}"

        # Handle /user/username format
        match = re.search(r'/user/([^/?]+)', url)
        if match:
            return f"user/{match.group(1)}"

        return None

    def _get_details_with_api(self, channel_id: str) -> Optional[ShowInfo]:
        """Get channel details using YouTube Data API."""
        # Get channel info
        params = {
            "part": "snippet,statistics,brandingSettings",
            "id": channel_id,
            "key": self.api_key
        }

        response = self._make_request(f"{self.YOUTUBE_API_BASE}/channels", params=params)
        if not response:
            return None

        try:
            data = response.json()
            if not data.get("items"):
                return None

            item = data["items"][0]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            branding = item.get("brandingSettings", {}).get("channel", {})

            show = ShowInfo(
                name=snippet.get("title", ""),
                url=f"https://www.youtube.com/channel/{channel_id}",
                description=snippet.get("description", ""),
                episode_count=int(stats.get("videoCount", 0)),
                source=SourceType.YOUTUBE
            )

            # Get email from description
            show.email = self._extract_email(show.description)

            # Get website
            custom_url = snippet.get("customUrl", "")
            if custom_url:
                show.social_links["custom_url"] = custom_url

            # Infer theme from description and keywords
            keywords = branding.get("keywords", "")
            show.theme = self._infer_theme_from_channel(show.description, keywords)

            # Get top videos
            show.top_episodes = self._get_top_videos(channel_id)

            # Get notable guests from video titles
            show.notable_guests = self._extract_guests_from_videos(channel_id)

            return show

        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse channel details: {e}")
            return None

    def _get_details_with_scraping(self, url: str, channel_id: str) -> Optional[ShowInfo]:
        """Get channel details using web scraping."""
        # Try to get the about page
        if channel_id.startswith("@"):
            about_url = f"https://www.youtube.com/{channel_id}/about"
        elif channel_id.startswith("c/") or channel_id.startswith("user/"):
            about_url = f"https://www.youtube.com/{channel_id}/about"
        else:
            about_url = f"https://www.youtube.com/channel/{channel_id}/about"

        response = self._make_request(about_url)
        if not response:
            return None

        show = self._parse_channel_page(response.text, url)

        if show:
            # Get top videos from videos page
            videos_url = url.replace("/about", "") + "/videos"
            show.top_episodes = self._scrape_top_videos(videos_url)

            # Try to extract guests
            show.notable_guests = self._scrape_guests_from_titles(videos_url)

        return show

    def _parse_channel_page(self, html: str, url: str) -> Optional[ShowInfo]:
        """Parse channel page HTML."""
        # Find ytInitialData
        pattern = r'var ytInitialData = ({.+?});'
        match = re.search(pattern, html)

        if not match:
            pattern = r'ytInitialData\s*=\s*({.+?});'
            match = re.search(pattern, html)

        if not match:
            return None

        try:
            data = json.loads(match.group(1))

            # Navigate to channel metadata
            metadata = self._find_channel_metadata(data)

            if metadata:
                show = ShowInfo(
                    name=metadata.get("title", ""),
                    url=url,
                    description=metadata.get("description", ""),
                    source=SourceType.YOUTUBE
                )

                # Get email from description
                show.email = self._extract_email(show.description)

                # Get video count
                show.episode_count = self._extract_video_count(data)

                # Get links for website and socials
                links = self._extract_channel_links(data)
                show.social_links = links
                if "website" in links:
                    show.website = links["website"]

                # Infer theme
                show.theme = self._infer_theme_from_channel(show.description, "")

                return show

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse channel page: {e}")

        return None

    def _find_channel_metadata(self, data: dict) -> Optional[dict]:
        """Find channel metadata in the nested data structure."""
        try:
            # Try different paths where metadata might be
            metadata = data.get("metadata", {}).get("channelMetadataRenderer", {})
            if metadata:
                return metadata

            # Alternative path
            header = data.get("header", {}).get("c4TabbedHeaderRenderer", {})
            if header:
                return {
                    "title": header.get("title", ""),
                    "description": ""  # Description is usually in about tab
                }

        except (KeyError, AttributeError):
            pass

        return None

    def _extract_video_count(self, data: dict) -> int:
        """Extract video count from channel data."""
        try:
            # Try to find video count in various places
            header = data.get("header", {}).get("c4TabbedHeaderRenderer", {})
            video_text = header.get("videosCountText", {}).get("simpleText", "")

            if video_text:
                match = re.search(r'([\d,]+)', video_text)
                if match:
                    return int(match.group(1).replace(",", ""))

        except (KeyError, AttributeError):
            pass

        return 0

    def _extract_channel_links(self, data: dict) -> dict:
        """Extract links from channel about page."""
        links = {}

        try:
            # Navigate to about tab data
            tabs = data.get("contents", {}).get("twoColumnBrowseResultsRenderer", {}).get("tabs", [])

            for tab in tabs:
                tab_renderer = tab.get("tabRenderer", {})
                if tab_renderer.get("title") == "About":
                    content = tab_renderer.get("content", {})
                    section = content.get("sectionListRenderer", {}).get("contents", [{}])[0]
                    items = section.get("itemSectionRenderer", {}).get("contents", [{}])[0]
                    about_renderer = items.get("channelAboutFullMetadataRenderer", {})

                    # Get links
                    primary_links = about_renderer.get("primaryLinks", [])
                    for link in primary_links:
                        title = link.get("title", {}).get("simpleText", "").lower()
                        url = link.get("navigationEndpoint", {}).get("urlEndpoint", {}).get("url", "")
                        if url:
                            # YouTube redirects through their tracking
                            if "redirect" in url:
                                parsed = urlparse(url)
                                params = parse_qs(parsed.query)
                                url = params.get("q", [url])[0]
                            links[title] = url

                    # Get email if visible
                    business_email = about_renderer.get("businessEmailText", {}).get("simpleText", "")
                    if business_email:
                        links["email"] = business_email

                    break

        except (KeyError, AttributeError, IndexError):
            pass

        return links

    def _get_top_videos(self, channel_id: str) -> list[str]:
        """Get top videos using API."""
        params = {
            "part": "snippet",
            "channelId": channel_id,
            "order": "viewCount",
            "maxResults": 5,
            "type": "video",
            "key": self.api_key
        }

        response = self._make_request(f"{self.YOUTUBE_API_BASE}/search", params=params)
        if not response:
            return []

        try:
            data = response.json()
            return [
                item["snippet"]["title"]
                for item in data.get("items", [])[:5]
            ]
        except (json.JSONDecodeError, KeyError):
            return []

    def _scrape_top_videos(self, videos_url: str) -> list[str]:
        """Scrape top video titles from videos page."""
        response = self._make_request(videos_url)
        if not response:
            return []

        pattern = r'var ytInitialData = ({.+?});'
        match = re.search(pattern, response.text)

        if match:
            try:
                data = json.loads(match.group(1))
                videos = self._extract_videos_from_data(data)
                return [v["title"] for v in videos[:5]]
            except json.JSONDecodeError:
                pass

        return []

    def _extract_videos_from_data(self, data: dict) -> list[dict]:
        """Extract video info from channel page data."""
        videos = []

        try:
            tabs = data.get("contents", {}).get("twoColumnBrowseResultsRenderer", {}).get("tabs", [])

            for tab in tabs:
                tab_renderer = tab.get("tabRenderer", {})
                if tab_renderer.get("title") == "Videos":
                    content = tab_renderer.get("content", {})
                    grid = content.get("richGridRenderer", {}).get("contents", [])

                    for item in grid[:10]:
                        video = item.get("richItemRenderer", {}).get("content", {}).get("videoRenderer", {})
                        if video:
                            title = video.get("title", {}).get("runs", [{}])[0].get("text", "")
                            view_count = video.get("viewCountText", {}).get("simpleText", "")

                            videos.append({
                                "title": title,
                                "views": view_count
                            })

        except (KeyError, AttributeError, IndexError):
            pass

        return videos

    def _extract_guests_from_videos(self, channel_id: str) -> list[str]:
        """Extract guest names from video titles using API."""
        params = {
            "part": "snippet",
            "channelId": channel_id,
            "maxResults": 50,
            "type": "video",
            "key": self.api_key
        }

        response = self._make_request(f"{self.YOUTUBE_API_BASE}/search", params=params)
        if not response:
            return []

        try:
            data = response.json()
            titles = [item["snippet"]["title"] for item in data.get("items", [])]
            return self._parse_guests_from_titles(titles)
        except (json.JSONDecodeError, KeyError):
            return []

    def _scrape_guests_from_titles(self, videos_url: str) -> list[str]:
        """Scrape guest names from video titles."""
        response = self._make_request(videos_url)
        if not response:
            return []

        pattern = r'var ytInitialData = ({.+?});'
        match = re.search(pattern, response.text)

        if match:
            try:
                data = json.loads(match.group(1))
                videos = self._extract_videos_from_data(data)
                titles = [v["title"] for v in videos]
                return self._parse_guests_from_titles(titles)
            except json.JSONDecodeError:
                pass

        return []

    def _parse_guests_from_titles(self, titles: list[str]) -> list[str]:
        """Parse guest names from video titles."""
        guests = []

        patterns = [
            r'(?:with|feat\.?|featuring|ft\.?|guest:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:on|talks|shares|reveals|explains)',
            r'(?:interview|conversation)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'\|\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*(?:\||$)',
        ]

        for title in titles:
            for pattern in patterns:
                matches = re.findall(pattern, title, re.IGNORECASE)
                for match in matches:
                    # Filter out common false positives
                    if len(match.split()) <= 4 and not any(
                        word.lower() in match.lower()
                        for word in ["episode", "part", "how to", "why", "what"]
                    ):
                        guests.append(match.strip())

        # Deduplicate
        return list(dict.fromkeys(guests))[:10]

    def _infer_theme_from_channel(self, description: str, keywords: str) -> str:
        """Infer channel theme from description and keywords."""
        combined = f"{description} {keywords}".lower()

        themes = []
        theme_keywords = {
            "SEO": ["seo", "search engine", "ranking", "google", "backlink"],
            "Marketing": ["marketing", "content", "brand", "social media"],
            "Business": ["business", "entrepreneur", "startup", "founder", "ceo"],
            "Technology": ["tech", "technology", "software", "digital", "coding"],
            "AI": ["ai", "artificial intelligence", "machine learning", "chatgpt", "automation"],
            "PR": ["public relations", "pr ", "media", "press"],
        }

        for theme, kw_list in theme_keywords.items():
            if any(kw in combined for kw in kw_list):
                themes.append(theme)

        return ", ".join(themes) if themes else "General"
