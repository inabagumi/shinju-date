import { throwIfError } from "@shinju-date/scraper";

import type { TypedSupabaseClient } from "@/lib/supabase";

/**
 * How many terms one request reads. It must not exceed `max_rows` of
 * PostgREST (1,000 in `supabase/config.toml`).
 */
export const TERMS_PAGE_SIZE = 1_000;

interface Term {
  id: string;
  synonyms: string[];
  term: string;
}

/**
 * Gets every term with its synonyms, page by page in ascending order of `id`
 *
 * Each page starts after the last `id` of the previous one, like
 * `paginateById` of `@shinju-date/scraper`. Paging by offset over
 * `updated_at` skipped or repeated terms at the page boundaries, because the
 * popularity update gives many terms the same `updated_at`.
 *
 * @yields Terms in ascending order of `id`
 * @throws When a page does not move past the previous one, which would
 *   otherwise repeat the same page forever.
 */
export async function* getAllTerms(
  supabase: TypedSupabaseClient,
  { pageSize = TERMS_PAGE_SIZE }: { pageSize?: number } = {}
): AsyncGenerator<Term, void, undefined> {
  let cursor: string | undefined;

  while (true) {
    let query = supabase
      .from("terms")
      .select("id, term, synonyms")
      .order("id", { ascending: true })
      .limit(pageSize);

    if (cursor !== undefined) {
      query = query.gt("id", cursor);
    }

    const page = throwIfError(await query, "Failed to load terms");

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

    yield* page;
  }
}
