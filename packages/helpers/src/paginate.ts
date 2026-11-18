/**
 * One page of a paginated API, as {@link paginate} reads it.
 */
export interface Page<T> {
  items: readonly T[];
  /**
   * Position of the next page (a page token or a cursor), or `null` /
   * `undefined` when this was the last page.
   */
  next: string | null | undefined;
}

/**
 * Walks every page of a paginated API: calls `fetchPage` with the position of
 * the next page until a page has none, and yields the items of each page in
 * order.
 *
 * Pages are fetched one at a time and only as far as the caller reads, so
 * stopping the iteration early stops the requests too. An error thrown by
 * `fetchPage` ends the iteration and reaches the caller after the items of
 * the earlier pages.
 *
 * @param fetchPage - Fetches one page. Called with `undefined` for the first
 *   page, then with the `next` of the previous page.
 */
export async function* paginate<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>
): AsyncGenerator<T, void, undefined> {
  let cursor: string | undefined;

  do {
    const { items, next } = await fetchPage(cursor);

    yield* items;

    cursor = next ?? undefined;
  } while (cursor);
}
