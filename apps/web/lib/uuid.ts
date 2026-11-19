const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Whether the value is in the form PostgreSQL accepts for a `uuid` column.
 *
 * Comparing a `uuid` column with any other value fails with an error instead
 * of matching no rows, so check IDs taken from URLs before querying them.
 */
export const isUUID = (value: string): boolean => UUID_PATTERN.test(value);
