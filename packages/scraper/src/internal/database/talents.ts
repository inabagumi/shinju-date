import type { TypedSupabaseClient } from "../../types.js";
import { DatabaseError } from "../errors.js";

/**
 * A table of platform accounts, with the column that holds the ID of an
 * account on the platform.
 */
export type AccountTable =
  | { platformIdColumn: "twitch_user_id"; table: "twitch_users" }
  | { platformIdColumn: "youtube_channel_id"; table: "youtube_channels" };

export const YOUTUBE_CHANNELS = {
  platformIdColumn: "youtube_channel_id",
  table: "youtube_channels",
} as const satisfies AccountTable;

export const TWITCH_USERS = {
  platformIdColumn: "twitch_user_id",
  table: "twitch_users",
} as const satisfies AccountTable;

/** A platform account owned by a talent. */
export interface TalentAccount {
  /** Primary key of the account row */
  id: string;
  /** The ID of the account on the platform: `UC...` or a Helix user ID */
  platformId: string;
  talentId: string;
}

/** A row of an account table, keyed by column. */
type AccountRow = Record<string, string>;

/** A row of `talents` with the rows of one account table. */
type TalentRow = { id: string } & Partial<
  Record<AccountTable["table"], AccountRow[]>
>;

/**
 * Gets the accounts to crawl: those of active, non-deleted talents.
 */
export async function getActiveAccounts(
  supabaseClient: TypedSupabaseClient,
  { platformIdColumn, table }: AccountTable
): Promise<TalentAccount[]> {
  const { data, error } = await supabaseClient
    .from("talents")
    .select(`id, ${table}!inner(id, ${platformIdColumn})`)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    throw new DatabaseError(`Failed to load ${table}`, error);
  }

  // The columns depend on `table`, so the rows cannot be typed from them.
  const talents = data as unknown as TalentRow[];

  return talents.flatMap((talent) =>
    (talent[table] ?? []).map((account) => ({
      id: account["id"] as string,
      platformId: account[platformIdColumn] as string,
      talentId: talent.id,
    }))
  );
}

/**
 * Gets one account by the primary key of its row, provided its talent is not
 * deleted. Retired talents are included: their past videos are still listed
 * on the site.
 */
export async function findAccount(
  supabaseClient: TypedSupabaseClient,
  { platformIdColumn, table }: AccountTable,
  id: string
): Promise<TalentAccount | null> {
  const { data, error } = await supabaseClient
    .from(table)
    .select(`id, talent_id, ${platformIdColumn}, talents!inner(id)`)
    .eq("id", id)
    .is("talents.deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(`Failed to load a row of ${table}`, error);
  }

  // The columns depend on `table`, so the row cannot be typed from them.
  const account = data as unknown as AccountRow | null;

  return account
    ? {
        id: account["id"] as string,
        platformId: account[platformIdColumn] as string,
        talentId: account["talent_id"] as string,
      }
    : null;
}
