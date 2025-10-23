import re
from collections import Counter

from janome.tokenizer import Tokenizer

STOPWORDS = [
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
    "完全",
    "版",
    "こと",
    "もの",
    "ため",
    "よう",
]


def extract_frequent_terms(titles: list[str], min_count: int = 2) -> list[dict]:
    """Extract frequent nouns from video titles with their readings and counts.

    Args:
        titles: List of video titles
        min_count: Minimum occurrence count for term extraction

    Returns:
        List of dictionaries containing term, reading, and count
    """
    tokenizer = Tokenizer()

    all_nouns = []
    for title in titles:
        cleaned_title = re.sub(r"[【】「」『』ー!?/#\s]", "", title)

        for token in tokenizer.tokenize(cleaned_title):
            if (
                len(token.base_form) > 2
                and token.part_of_speech.startswith("名詞")
                and token.base_form not in STOPWORDS
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
