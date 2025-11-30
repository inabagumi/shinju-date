import re
from collections import Counter

from janome.tokenizer import Tokenizer


def _is_valid_term(token, min_length: int = 3) -> bool:
    """Check if a token is a valid term for extraction."""
    return len(token.base_form) >= min_length and token.part_of_speech.startswith(
        "名詞"
    )


def extract_frequent_terms(
    titles: list[str],
    min_count: int = 2,
    min_length: int = 3,
    existing_terms: set = None,
) -> list[dict]:
    """Extract frequent nouns from video titles with their readings and counts.

    Args:
        titles: List of video titles
        min_count: Minimum occurrence count for term extraction
        min_length: Minimum character length for terms
        existing_terms: Set of existing terms to exclude from extraction

    Returns:
        List of dictionaries containing term, reading, and count
    """
    tokenizer = Tokenizer()

    if existing_terms is None:
        existing_terms = set()

    all_nouns = []
    for title in titles:
        cleaned_title = re.sub(r"[【】「」『』ー!?/#\s]", "", title)

        for token in tokenizer.tokenize(cleaned_title):
            if (
                _is_valid_term(token, min_length)
                and token.base_form not in existing_terms
            ):
                all_nouns.append(
                    {
                        "term": token.base_form,
                        "reading": token.reading,
                    }
                )

    term_counts = Counter(item["term"] for item in all_nouns)

    readings = {}
    for item in all_nouns:
        if item["term"] not in readings:
            readings[item["term"]] = item["reading"]

    frequent_terms = []
    for term, count in term_counts.most_common():
        if count >= min_count:
            frequent_terms.append(
                {
                    "term": term,
                    "reading": readings.get(term, "*"),
                    "count": count,
                }
            )

    return frequent_terms
