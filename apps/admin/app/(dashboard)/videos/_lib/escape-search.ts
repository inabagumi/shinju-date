/**
 * Escapes special characters in search strings to prevent SQL injection
 * when used with Supabase's ilike filter.
 *
 * @param search - The search string to escape
 * @returns The escaped search string with \, %, and _ characters escaped
 */
export const escapeSearchString = (search: string): string =>
  // Escape all of them at once, so that the added backslashes are not escaped
  // again
  search.replaceAll(/[\\%_]/gu, "\\$&");
