"""Database service for Supabase operations."""

from typing import List, Set


def get_video_titles(supabase_client) -> List[str]:
    """Fetch video titles from the videos table.

    Args:
        supabase_client: Supabase client instance

    Returns:
        List of video titles
    """
    response = supabase_client.table("videos").select("title").execute()
    return [item["title"] for item in response.data]


def get_existing_terms(supabase_client) -> Set[str]:
    """Fetch existing terms from the terms table to avoid duplicates.

    Args:
        supabase_client: Supabase client instance

    Returns:
        Set of existing terms
    """
    try:
        response = supabase_client.table("terms").select("term").execute()
        return {item["term"] for item in response.data}
    except Exception:
        # If terms table doesn't exist or query fails, return empty set
        return set()
