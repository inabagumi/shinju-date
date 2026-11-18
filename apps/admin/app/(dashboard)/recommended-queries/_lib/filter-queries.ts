/**
 * おすすめクエリを、検索語を含むもの（大文字と小文字を区別しない）に絞り込む。
 * 検索語がなければ、すべてのクエリ
 */
export function filterQueries<T>(
  queries: readonly T[],
  search: string | undefined,
  getQuery: (item: T) => string
): T[] {
  if (!search) {
    return [...queries];
  }

  const query = search.toLowerCase();

  return queries.filter((item) => getQuery(item).toLowerCase().includes(query));
}
