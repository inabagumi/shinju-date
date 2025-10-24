import re
from collections import Counter

from janome.tokenizer import Tokenizer


def _is_valid_term(token, min_length: int = 3, stopwords: set = None) -> bool:
    """Check if a token is a valid term for extraction."""
    if stopwords is None:
        stopwords = set()

    return (
        len(token.base_form) >= min_length
        and token.part_of_speech.startswith("名詞")
        and token.base_form not in stopwords
    )


def extract_frequent_terms(
    titles: list[str],
    min_count: int = 2,
    min_length: int = 3,
    stopwords: set = None,
    existing_terms: set = None,
) -> list[dict]:
    """Extract frequent nouns from video titles with their readings and counts.

    Args:
        titles: List of video titles
        min_count: Minimum occurrence count for term extraction
        min_length: Minimum character length for terms
        stopwords: Set of words to exclude from extraction
        existing_terms: Set of existing terms to exclude from extraction

    Returns:
        List of dictionaries containing term, reading, and count
    """
    tokenizer = Tokenizer()

    if stopwords is None:
        stopwords = {
            "方法",
            "解説",
            "入門",
            "初心者",
            "完全",
            "徹底",
            "講座",
            "基本",
            "使い方",
            "マスター",
            "ガイド",
            "実装",
            "違い",
            "比較",
            "開発",
            "連携",
            "最新",
            "基礎",
            "版",
            "こと",
            "もの",
            "ため",
            "よう",
        }

    if existing_terms is None:
        existing_terms = set()

    all_nouns = []
    for title in titles:
        cleaned_title = re.sub(r"[【】「」『』ー!?/#\s]", "", title)

        for token in tokenizer.tokenize(cleaned_title):
            if (
                _is_valid_term(token, min_length, stopwords)
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
