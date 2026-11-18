"use server";

import { CACHE_TAGS } from "@shinju-date/constants";
import { toDBString } from "@shinju-date/temporal-fns";
import { revalidateTags } from "@shinju-date/web-cache";
import { revalidatePath } from "next/cache";

import { PLATFORM_LABELS } from "@/components/platform-badge";
import { ActionError, adminAction, parseActionInput } from "@/lib/action";
import type { ActionResult } from "@/lib/action";
import { createAuditLog } from "@/lib/audit-log";
import { createScraper } from "@/lib/scraper";

import { videoIdSchema } from "../_lib/schema";

/** 動画の同期が成功したときに、画面に知らせること */
export interface SyncVideoSummary {
  /** 成功のトーストに出す文 */
  message: string;
  /** 動画がすでにプラットフォームと一致していた */
  unchanged?: boolean;
}

const NOT_FOUND_ERROR_MESSAGE = "動画が見つかりませんでした。";

const revalidateVideo = async (videoId: string): Promise<void> => {
  revalidatePath(`/videos/${videoId}`);
  revalidatePath("/videos");
  await revalidateTags([CACHE_TAGS.VIDEOS]);
};

/**
 * 動画1件を、YouTube や Twitch の今の状態に合わせる。
 *
 * 見直しは `@shinju-date/scraper` の `refreshVideo` が行う。定期の見直しと同じ
 * 関数を使うので、同じ項目（タイトル、長さ、開始日時、状態、種別）が同じ値に
 * 更新され、プラットフォームから消えた動画は同じ理由（`unavailable`）で
 * 論理削除される。Twitch の配信中の行とアーカイブの結び付け、クリップの
 * 確認も含む。
 */
export const syncVideoAction = adminAction(
  "syncVideoAction",
  async (
    { supabaseClient },
    id: string
  ): Promise<ActionResult<SyncVideoSummary>> => {
    const videoId = parseActionInput(videoIdSchema, id);
    const { data: video, error: fetchError } = await supabaseClient
      .from("videos")
      .select("platform, title")
      .eq("id", videoId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!video) {
      throw new ActionError(NOT_FOUND_ERROR_MESSAGE);
    }

    const now = Temporal.Now.instant();
    const result = await createScraper(video.platform).refreshVideo(
      videoId,
      now
    );

    switch (result.status) {
      case "not-found": {
        throw new ActionError(NOT_FOUND_ERROR_MESSAGE);
      }

      case "unchanged": {
        return {
          data: { message: "動画情報は既に最新です。", unchanged: true },
          success: true,
        };
      }

      case "unavailable": {
        await createAuditLog(supabaseClient, "VIDEO_SYNC", videoId, {
          changes: {
            after: {
              deleted_at: toDBString(now),
              deleted_reason: "unavailable",
            },
            before: { deleted_at: null },
          },
          entityName: video.title,
        });
        await revalidateVideo(videoId);

        return {
          data: {
            message: `${PLATFORM_LABELS[video.platform]}で動画が見つからなかったため、動画を削除しました。`,
          },
          success: true,
        };
      }

      case "updated": {
        await createAuditLog(supabaseClient, "VIDEO_SYNC", videoId, {
          changes: { after: result.after, before: result.before },
          entityName: result.title,
        });
        await revalidateVideo(videoId);

        return { data: { message: "動画情報を同期しました。" }, success: true };
      }
    }
  }
);
