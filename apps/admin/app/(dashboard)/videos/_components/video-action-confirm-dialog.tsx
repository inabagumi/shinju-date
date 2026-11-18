"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";

import type { VideoActionDialogProps } from "../_lib/use-video-action";
import { VIDEO_ACTIONS } from "../_lib/video-actions";
import type { VideoActionConfirmConfig } from "../_lib/video-actions";

/**
 * 動画の表示の切り替え・削除・復元を確かめてから実行するダイアログ。
 * 実行中の表示、エラーの表示、削除のときのキーワードの入力は `ConfirmDialog` が
 * 受け持つ。文言は `VIDEO_ACTIONS` に従う。
 */
export const VideoActionConfirmDialog = ({
  action,
  videos,
  open,
  onOpenChange,
  onConfirm,
}: VideoActionDialogProps) => {
  const config: VideoActionConfirmConfig = VIDEO_ACTIONS[action].confirm;

  return (
    <ConfirmDialog
      confirmLabel={config.confirmLabel}
      confirmVariant={config.confirmVariant}
      description={config.description(videos.length)}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      pendingLabel="処理中..."
      requireKeyword={config.requireKeyword}
      size="lg"
      title={config.title}
    >
      <p className="mb-2 font-semibold tabular-nums">
        対象動画 ({videos.length}件):
      </p>
      <ul className="max-h-60 space-y-2 overflow-y-auto">
        {videos.map((video) => (
          <li
            className="border-l-2 border-border pl-2 text-muted"
            key={video.id}
          >
            {video.title}
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  );
};
