"""Export utilities for podcast and channel data."""

import os
import logging
from datetime import datetime
from typing import Optional

import pandas as pd

from .models import ShowInfo

logger = logging.getLogger(__name__)


class DataExporter:
    """Export podcast/channel data to various formats."""

    def __init__(self, output_dir: str = "output"):
        """
        Initialize exporter.

        Args:
            output_dir: Directory for output files
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def to_dataframe(self, shows: list[ShowInfo]) -> pd.DataFrame:
        """
        Convert list of ShowInfo to pandas DataFrame.

        Args:
            shows: List of ShowInfo objects

        Returns:
            DataFrame with all show data
        """
        data = [show.to_dict() for show in shows]
        df = pd.DataFrame(data)

        # Reorder columns to match user's requested format
        column_order = [
            "Name",
            "URL",
            "Theme",
            "Email",
            "Episode Count",
            "Notable Guests",
            "Top 5 Episodes",
            "Source",
            "Category",
            "Description",
            "Author",
            "Website",
            "Social Links"
        ]

        # Only include columns that exist
        columns = [col for col in column_order if col in df.columns]
        df = df[columns]

        return df

    def to_csv(self, shows: list[ShowInfo], filename: str = None) -> str:
        """
        Export shows to CSV file.

        Args:
            shows: List of ShowInfo objects
            filename: Output filename (auto-generated if not provided)

        Returns:
            Path to the created CSV file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"podcasts_channels_{timestamp}.csv"

        filepath = os.path.join(self.output_dir, filename)
        df = self.to_dataframe(shows)
        df.to_csv(filepath, index=False, encoding="utf-8")

        logger.info(f"Exported {len(shows)} shows to {filepath}")
        return filepath

    def to_excel(self, shows: list[ShowInfo], filename: str = None) -> str:
        """
        Export shows to Excel file with formatting.

        Args:
            shows: List of ShowInfo objects
            filename: Output filename (auto-generated if not provided)

        Returns:
            Path to the created Excel file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"podcasts_channels_{timestamp}.xlsx"

        filepath = os.path.join(self.output_dir, filename)
        df = self.to_dataframe(shows)

        # Create Excel writer with formatting
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Shows")

            # Get workbook and worksheet
            workbook = writer.book
            worksheet = writer.sheets["Shows"]

            # Auto-adjust column widths
            for idx, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).map(len).max(),
                    len(col)
                )
                # Limit max width
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[chr(65 + idx)].width = adjusted_width

            # Freeze header row
            worksheet.freeze_panes = "A2"

        logger.info(f"Exported {len(shows)} shows to {filepath}")
        return filepath

    def to_excel_by_category(self, shows: list[ShowInfo], filename: str = None) -> str:
        """
        Export shows to Excel with separate sheets per category.

        Args:
            shows: List of ShowInfo objects
            filename: Output filename

        Returns:
            Path to the created Excel file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"podcasts_by_category_{timestamp}.xlsx"

        filepath = os.path.join(self.output_dir, filename)
        df = self.to_dataframe(shows)

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            # Write all data to first sheet
            df.to_excel(writer, index=False, sheet_name="All Shows")

            # Write each category to separate sheet
            if "Category" in df.columns:
                for category in df["Category"].unique():
                    category_df = df[df["Category"] == category]
                    sheet_name = category.replace("_", " ").title()[:31]  # Excel sheet name limit
                    category_df.to_excel(writer, index=False, sheet_name=sheet_name)

            # Format all sheets
            workbook = writer.book
            for sheet_name in workbook.sheetnames:
                worksheet = workbook[sheet_name]
                worksheet.freeze_panes = "A2"

        logger.info(f"Exported {len(shows)} shows to {filepath}")
        return filepath

    def to_excel_by_source(self, shows: list[ShowInfo], filename: str = None) -> str:
        """
        Export shows to Excel with separate sheets per source.

        Args:
            shows: List of ShowInfo objects
            filename: Output filename

        Returns:
            Path to the created Excel file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"podcasts_by_source_{timestamp}.xlsx"

        filepath = os.path.join(self.output_dir, filename)
        df = self.to_dataframe(shows)

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            # Write all data to first sheet
            df.to_excel(writer, index=False, sheet_name="All Shows")

            # Write each source to separate sheet
            if "Source" in df.columns:
                for source in df["Source"].unique():
                    source_df = df[df["Source"] == source]
                    sheet_name = source.replace("_", " ").title()[:31]
                    source_df.to_excel(writer, index=False, sheet_name=sheet_name)

            # Format all sheets
            workbook = writer.book
            for sheet_name in workbook.sheetnames:
                worksheet = workbook[sheet_name]
                worksheet.freeze_panes = "A2"

        logger.info(f"Exported {len(shows)} shows to {filepath}")
        return filepath

    def merge_duplicates(self, shows: list[ShowInfo]) -> list[ShowInfo]:
        """
        Merge duplicate shows (same name across different sources).

        Args:
            shows: List of ShowInfo objects

        Returns:
            Deduplicated list with merged data
        """
        # Group by normalized name
        show_map = {}

        for show in shows:
            key = show.name.lower().strip()

            if key in show_map:
                existing = show_map[key]
                # Merge data, preferring non-empty values
                if not existing.email and show.email:
                    existing.email = show.email
                if not existing.website and show.website:
                    existing.website = show.website
                if not existing.theme and show.theme:
                    existing.theme = show.theme
                if show.episode_count > existing.episode_count:
                    existing.episode_count = show.episode_count
                existing.notable_guests = list(set(existing.notable_guests + show.notable_guests))[:10]
                existing.top_episodes = list(dict.fromkeys(existing.top_episodes + show.top_episodes))[:5]
                existing.social_links.update(show.social_links)
            else:
                show_map[key] = show

        return list(show_map.values())


def export_shows(
    shows: list[ShowInfo],
    output_dir: str = "output",
    format: str = "all",
    deduplicate: bool = True
) -> dict[str, str]:
    """
    Convenience function to export shows.

    Args:
        shows: List of ShowInfo objects
        output_dir: Output directory
        format: Export format ("csv", "excel", "all")
        deduplicate: Whether to merge duplicates

    Returns:
        Dictionary of format -> filepath
    """
    exporter = DataExporter(output_dir)

    if deduplicate:
        shows = exporter.merge_duplicates(shows)
        logger.info(f"After deduplication: {len(shows)} unique shows")

    results = {}

    if format in ("csv", "all"):
        results["csv"] = exporter.to_csv(shows)

    if format in ("excel", "all"):
        results["excel"] = exporter.to_excel(shows)
        results["excel_by_category"] = exporter.to_excel_by_category(shows)
        results["excel_by_source"] = exporter.to_excel_by_source(shows)

    return results
