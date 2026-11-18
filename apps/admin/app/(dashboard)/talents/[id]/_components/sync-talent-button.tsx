"use client";

import { Button } from "@shinju-date/ui";
import { Loader2 } from "lucide-react";

import { useServerAction } from "@/lib/use-server-action";

import {
  syncTalentWithTwitchAction,
  syncTalentWithYouTubeAction,
} from "../../_actions/sync";

interface Props {
  talentId: string;
  hasYouTubeChannels: boolean;
  hasTwitchUsers: boolean;
}

export const SyncTalentButton = ({
  talentId,
  hasYouTubeChannels,
  hasTwitchUsers,
}: Props) => {
  const youtube = useServerAction(syncTalentWithYouTubeAction, {
    errorText: "同期に失敗しました。",
    successText: ({ data }) =>
      data?.message ??
      (data?.unchanged
        ? "チャンネル情報は既に最新です。"
        : "チャンネル情報を同期しました。"),
  });
  const twitch = useServerAction(syncTalentWithTwitchAction, {
    errorText: "同期に失敗しました。",
    successText: ({ data }) =>
      data?.message ??
      (data?.unchanged
        ? "Twitchユーザー情報は既に最新です。"
        : "Twitchユーザー情報を同期しました。"),
  });
  const isPending = youtube.isPending || twitch.isPending;

  if (!hasYouTubeChannels && !hasTwitchUsers) {
    return null;
  }

  return (
    <>
      {hasYouTubeChannels && (
        <Button
          className="gap-2 whitespace-nowrap"
          disabled={isPending}
          onClick={() => youtube.run(talentId)}
          variant="secondary"
        >
          {youtube.isPending && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          {youtube.isPending ? "同期中..." : "YouTubeと同期"}
        </Button>
      )}
      {hasTwitchUsers && (
        <Button
          className="gap-2 whitespace-nowrap"
          disabled={isPending}
          onClick={() => twitch.run(talentId)}
          variant="secondary"
        >
          {twitch.isPending && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          {twitch.isPending ? "同期中..." : "Twitchと同期"}
        </Button>
      )}
    </>
  );
};
