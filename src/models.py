"""Data models for podcast and YouTube channel information."""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class SourceType(Enum):
    """Source platform types."""
    APPLE_PODCASTS = "apple_podcasts"
    YOUTUBE = "youtube"
    SPOTIFY = "spotify"
    PODCHASER = "podchaser"
    LISTEN_NOTES = "listen_notes"


class Category(Enum):
    """Content categories we're targeting."""
    SEO = "seo"
    DIGITAL_PR = "digital_pr"
    CONTENT_MARKETING = "content_marketing"
    AI = "ai"
    ENTREPRENEURSHIP = "entrepreneurship"


@dataclass
class ShowInfo:
    """
    Represents a podcast or YouTube channel with all required information.

    Attributes:
        name: YouTube Channel/Podcast name
        url: URL of show
        theme: Theme of topics on the show
        email: Email for contact
        episode_count: Number of videos or podcasts
        notable_guests: Names of previous guests in the industry
        top_episodes: Titles of the top 5 most viewed shows
        source: Where this data was scraped from
        category: Primary content category
    """
    name: str
    url: str
    theme: str = ""
    email: str = ""
    episode_count: int = 0
    notable_guests: list[str] = field(default_factory=list)
    top_episodes: list[str] = field(default_factory=list)
    source: SourceType = SourceType.APPLE_PODCASTS
    category: Category = Category.SEO

    # Additional metadata
    description: str = ""
    author: str = ""
    website: str = ""
    social_links: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dictionary for DataFrame/CSV export."""
        return {
            "Name": self.name,
            "URL": self.url,
            "Theme": self.theme,
            "Email": self.email,
            "Episode Count": self.episode_count,
            "Notable Guests": "; ".join(self.notable_guests[:10]) if self.notable_guests else "",
            "Top 5 Episodes": "; ".join(self.top_episodes[:5]) if self.top_episodes else "",
            "Source": self.source.value,
            "Category": self.category.value,
            "Description": self.description,
            "Author": self.author,
            "Website": self.website,
            "Social Links": str(self.social_links) if self.social_links else ""
        }
