import { BackfillQueue, getBackfillJobId } from "@shinju-date/video-backfill";
import type {
  BackfillProvider,
  BackfillRunJobStatus,
} from "@shinju-date/video-backfill";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { TypedSupabaseClient } from "@/lib/supabase";

/** Progress of the backfill of one account of a talent. */
export interface VideoBackfillAccount {
  /** Primary key of the account row (`youtube_channels` / `twitch_users`). */
  accountId: string;
  /** Whether a job is queued or being read, so it cannot be requested again. */
  active: boolean;
  /** Videos saved so far. */
  added: number;
  error: string | null;
  finishedAt: string | null;
  name: string;
  /** Pages read so far. */
  pages: number;
  provider: BackfillProvider;
  requestedAt: string | null;
  /**
   * `interrupted` when the job stopped without finishing; `null` when the
   * account was never backfilled (or it was long ago).
   */
  status: BackfillRunJobStatus | null;
  updatedAt: string | null;
}

/** The accounts of a talent, with the progress of their backfills. */
export interface VideoBackfillStatus {
  accounts: VideoBackfillAccount[];
  success: true;
}

interface TalentAccounts {
  accounts: Pick<VideoBackfillAccount, "accountId" | "name" | "provider">[];
  name: string;
}

/**
 * Loads a talent that is not deleted, with its YouTube channels and Twitch
 * accounts.
 */
export async function getTalentAccounts(
  supabaseClient: TypedSupabaseClient,
  talentId: string
): Promise<TalentAccounts | null> {
  const { data, error } = await supabaseClient
    .from("talents")
    .select(
      "name, youtube_channels(id, name, youtube_channel_id), twitch_users(id, name, twitch_login_name, twitch_user_id)"
    )
    .eq("id", talentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    accounts: [
      ...data.youtube_channels.map((channel) => ({
        accountId: channel.id,
        name: channel.name ?? channel.youtube_channel_id,
        provider: "youtube" as const,
      })),
      ...data.twitch_users.map((user) => ({
        accountId: user.id,
        name: user.name ?? user.twitch_login_name ?? user.twitch_user_id,
        provider: "twitch" as const,
      })),
    ],
    name: data.name,
  };
}

/**
 * タレントの各アカウントの過去動画の取り込み状況を読む。
 *
 * 中断の判定に今の時刻（`Temporal.Now`）を使うので、Server Component からは
 * キャッシュする `getVideoBackfillStatus` を通して呼ぶ
 *
 * @returns タレントが見つからない（削除された）ときは `null`
 */
export async function readVideoBackfillStatus(
  supabaseClient: TypedSupabaseClient,
  talentId: string
): Promise<VideoBackfillStatus | null> {
  const talent = await getTalentAccounts(supabaseClient, talentId);

  if (!talent) {
    return null;
  }

  const queue = new BackfillQueue(getRedisClient());
  const states = await queue.getJobs(
    talent.accounts.map((account) =>
      getBackfillJobId(account.provider, account.accountId)
    )
  );

  return {
    accounts: talent.accounts.map((account, index) => {
      const state = states[index];

      return {
        ...account,
        active: state?.active ?? false,
        added: state?.job.added ?? 0,
        error: state?.job.error ?? null,
        finishedAt: state?.job.finishedAt ?? null,
        pages: state?.job.pages ?? 0,
        requestedAt: state?.job.requestedAt ?? null,
        status: state?.status ?? null,
        updatedAt: state?.job.updatedAt ?? null,
      };
    }),
    success: true,
  };
}

/**
 * タレントの各アカウントの過去動画の取り込み状況を返す。状況は刻々と変わるので、
 * `seconds` でキャッシュする
 *
 * @returns タレントが見つからない（削除された）ときは `null`
 */
export async function getVideoBackfillStatus(
  talentId: string
): Promise<VideoBackfillStatus | null> {
  "use cache: private";

  cacheLife("seconds");

  const supabaseClient = await createSupabaseServerClient();

  return readVideoBackfillStatus(supabaseClient, talentId);
}
