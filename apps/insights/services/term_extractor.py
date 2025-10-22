import re
from collections import Counter
from janome.tokenizer import Tokenizer

# 用語集に含めたくない一般的な単語（ストップワード）
STOPWORDS = [
    '方法', '解説', '入門', '初心者', '完全', '徹底', '講座', '基本',
    '使い方', 'マスター', 'ガイド', '実装', '違い', '比較', '開発',
    '連携', '最新', '基礎', '完全', '版', 'こと', 'もの', 'ため', 'よう'
]


def extract_frequent_terms(titles: list[str], min_count: int = 2) -> list[dict]:
    """
    動画タイトルのリストから頻出する名詞を抽出し、読み仮名と出現回数を返す

    Args:
        titles (list[str]): 動画タイトルのリスト
        min_count (int): 用語として抽出するための最低出現回数

    Returns:
        list[dict]: 抽出された用語のリスト [{'term': '単語', 'reading': 'ヨミ', 'count': 回数}]
    """
    tokenizer = Tokenizer()

    all_nouns = []
    for title in titles:
        # 【】や記号、空白などの不要な文字を除去
        cleaned_title = re.sub(r'[【】「」『』ー!?/#\s]', '', title)

        for token in tokenizer.tokenize(cleaned_title):
            # 品詞が「名詞」で、原型がストップワードに含まれないものを抽出
            if len(token.base_form) > 2 and token.part_of_speech.startswith('名詞') and token.base_form not in STOPWORDS:
                all_nouns.append({
                    "term": token.base_form,  # 単語の原型 (例: API)
                    "reading": token.reading  # 読み仮名 (例: エーピーアイ)
                })

    # 単語の出現回数を集計
    term_counts = Counter(item["term"] for item in all_nouns)

    # 各単語の読み仮名候補を整理 (最初に見つかった読みを採用)
    readings = {item["term"]: item["reading"] for item in reversed(all_nouns)}

    # 結果を整形
    frequent_terms = []
    for term, count in term_counts.most_common():
        if count >= min_count:
            frequent_terms.append({
                "term": term,
                "reading": readings.get(term, "*"),  # 辞書にない場合は"*"
                "count": count
            })

    return frequent_terms
