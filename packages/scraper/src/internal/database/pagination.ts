/**
 * Walks a table page by page, in ascending order of `id`.
 *
 * `getPage` receives the last ID of the previous page (nothing for the first
 * page) and must return the rows that come after it. Compared to paging by
 * offset, rows that are deleted along the way cannot shift later pages and
 * make the walk skip rows.
 *
 * @param getPage - Gets the rows after the given ID, in ascending order of
 *   `id`
 * @yields {T[]} The pages, each of them not empty
 * @throws {Error} When a page does not move past the previous one, which would
 *   otherwise repeat the same page forever.
 */
export const paginateById = async function* paginateById<
  T extends { id: string },
>(
  getPage: (cursor: string | undefined) => Promise<T[]>
): AsyncGenerator<T[], void, undefined> {
  let cursor: string | undefined;

  while (true) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- each page starts after the last ID of the previous one
    const page = await getPage(cursor);
    const lastId = page.at(-1)?.id;

    if (lastId === undefined) {
      return;
    }

    if (cursor !== undefined && lastId <= cursor) {
      throw new Error(
        `Pagination did not advance: the page after "${cursor}" ends at "${lastId}"`
      );
    }

    cursor = lastId;

    yield page;
  }
};
