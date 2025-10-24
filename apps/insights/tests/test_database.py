"""Tests for database service."""

from unittest.mock import Mock

from services.database import get_existing_terms, get_video_titles


class TestGetVideoTitles:
    """Test cases for get_video_titles function."""

    def test_successful_fetch(self):
        """Test successful fetching of video titles."""
        # Mock supabase client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = [
            {"title": "Python入門講座"},
            {"title": "JavaScript基礎"},
            {"title": "React開発ガイド"}
        ]

        (
            mock_client.table.return_value.select.return_value.execute.return_value
        ) = mock_response

        # Call function
        result = get_video_titles(mock_client)

        # Verify results
        expected = ["Python入門講座", "JavaScript基礎", "React開発ガイド"]
        assert result == expected

        # Verify correct table and column were queried
        mock_client.table.assert_called_once_with("videos")
        mock_client.table.return_value.select.assert_called_once_with("title")

    def test_empty_results(self):
        """Test handling of empty results."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = []

        (
            mock_client.table.return_value.select.return_value.execute.return_value
        ) = mock_response

        result = get_video_titles(mock_client)
        assert result == []


class TestGetExistingTerms:
    """Test cases for get_existing_terms function."""

    def test_successful_fetch(self):
        """Test successful fetching of existing terms."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = [
            {"term": "Python"},
            {"term": "JavaScript"},
            {"term": "React"}
        ]

        (
            mock_client.table.return_value.select.return_value.execute.return_value
        ) = mock_response

        result = get_existing_terms(mock_client)

        expected = {"Python", "JavaScript", "React"}
        assert result == expected

        # Verify correct table and column were queried
        mock_client.table.assert_called_once_with("terms")
        mock_client.table.return_value.select.assert_called_once_with("term")

    def test_empty_results(self):
        """Test handling of empty results."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = []

        (
            mock_client.table.return_value.select.return_value.execute.return_value
        ) = mock_response

        result = get_existing_terms(mock_client)
        assert result == set()

    def test_exception_handling(self):
        """Test that exceptions are handled gracefully."""
        mock_client = Mock()
        mock_client.table.side_effect = Exception("Database error")

        result = get_existing_terms(mock_client)

        # Should return empty set on exception
        assert result == set()

    def test_query_exception_handling(self):
        """Test handling of query execution exceptions."""
        mock_client = Mock()
        (
            mock_client.table.return_value.select.return_value.execute.side_effect
        ) = Exception("Query failed")

        result = get_existing_terms(mock_client)

        # Should return empty set on exception
        assert result == set()
