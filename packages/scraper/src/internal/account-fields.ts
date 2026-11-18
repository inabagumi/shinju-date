import type { AccountChanges, AccountFields } from "../types.js";

/**
 * Picks the columns of an account whose value differs between the saved row
 * and the platform.
 *
 * @returns The changed columns, or `undefined` when nothing changed.
 */
export function diffAccountFields<TFields extends AccountFields>(
  before: TFields,
  after: TFields
): AccountChanges<TFields> | undefined {
  const changes: AccountChanges<TFields> = { after: {}, before: {} };
  let changed = false;

  for (const key of Object.keys(after) as (keyof TFields)[]) {
    if (before[key] !== after[key]) {
      changes.after[key] = after[key];
      changes.before[key] = before[key];
      changed = true;
    }
  }

  return changed ? changes : undefined;
}
