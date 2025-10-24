"""Tests for term extractor service."""

from services.term_extractor import _is_valid_term, extract_frequent_terms


class MockToken:
    """Mock token for testing."""

    def __init__(self, base_form: str, part_of_speech: str, reading: str = None):
        self.base_form = base_form
        self.part_of_speech = part_of_speech
        self.reading = reading or base_form


class TestIsValidTerm:
    """Test cases for _is_valid_term function."""

    def test_valid_noun_with_sufficient_length(self):
        """Test that valid nouns with sufficient length pass validation."""
        token = MockToken("プログラミング", "名詞-一般", "プログラミング")
        assert _is_valid_term(token, min_length=3) is True

    def test_invalid_part_of_speech(self):
        """Test that non-nouns are rejected."""
        token = MockToken("実行する", "動詞-自立", "ジッコウスル")
        assert _is_valid_term(token, min_length=3) is False

    def test_insufficient_length(self):
        """Test that short terms are rejected."""
        token = MockToken("の", "名詞-非自立", "ノ")
        assert _is_valid_term(token, min_length=3) is False

    def test_exact_minimum_length(self):
        """Test that terms with exact minimum length are accepted."""
        token = MockToken("API", "名詞-一般", "エーピーアイ")
        assert _is_valid_term(token, min_length=3) is True


class TestExtractFrequentTerms:
    """Test cases for extract_frequent_terms function."""

    def test_empty_titles(self):
        """Test that empty title list returns empty results."""
        result = extract_frequent_terms([])
        assert result == []

    def test_basic_extraction(self):
        """Test basic term extraction functionality."""
        titles = [
            "Pythonプログラミング入門",
            "Pythonプログラミング応用",
            "JavaScript開発技法"
        ]
        result = extract_frequent_terms(titles, min_count=1, min_length=3)

        # Should extract terms that appear at least once
        assert len(result) > 0
        # Check that results have required structure
        for term in result:
            assert "term" in term
            assert "reading" in term
            assert "count" in term
            assert isinstance(term["count"], int)

    def test_min_count_filtering(self):
        """Test that min_count parameter filters terms correctly."""
        titles = [
            "Pythonプログラミング",
            "JavaScript開発"
        ]

        # With min_count=1, should get all valid terms
        result_min1 = extract_frequent_terms(titles, min_count=1, min_length=3)

        # With min_count=2, should get fewer or no terms (since each appears only once)
        result_min2 = extract_frequent_terms(titles, min_count=2, min_length=3)

        assert len(result_min2) <= len(result_min1)

    def test_existing_terms_exclusion(self):
        """Test that existing terms are properly excluded."""
        titles = ["Pythonプログラミング入門"]
        existing_terms = {"Python"}

        result = extract_frequent_terms(
            titles,
            min_count=1,
            min_length=3,
            existing_terms=existing_terms
        )

        # Python should be excluded from results
        term_names = [term["term"] for term in result]
        assert "Python" not in term_names

    def test_min_length_filtering(self):
        """Test that min_length parameter filters terms correctly."""
        titles = ["の解説とプログラミングAPI"]

        # With min_length=3, short terms should be excluded
        result = extract_frequent_terms(titles, min_count=1, min_length=3)

        term_names = [term["term"] for term in result]
        # Short terms like "の" should not appear
        assert "の" not in term_names
