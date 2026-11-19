"use client";

import { Button } from "@shinju-date/ui";
import { Eye, RotateCcw, Trash2 } from "lucide-react";

import type { VideoAction, VideoActionTarget } from "../_lib/video-actions";
import { useVideoSelection } from "./video-selection-provider";

/** 一括操作の対象を決めるのに使う、表示中の動画 */
export interface VideoBulkActionItem {
  id: string;
  title: string;
  /** 削除済みか */
  isDeleted: boolean;
}

/**
 * 操作の対象になる動画を求める。削除は未削除の動画だけ、復元は削除済みの動画
 * だけを対象にする。確認ダイアログの表示とアクションの実行で同じ結果を使う
 */
const getTargetVideos = (
  videos: readonly VideoBulkActionItem[],
  action: VideoAction
): VideoActionTarget[] =>
  videos
    .filter((video) => {
      if (action === "delete") {
        return !video.isDeleted;
      }
      if (action === "restore") {
        return video.isDeleted;
      }
      return true;
    })
    .map((video) => ({ id: video.id, title: video.title }));

interface VideoBulkActionsProps {
  /** 表示中の動画 */
  videos: readonly VideoBulkActionItem[];
}

/**
 * 一括操作の帯。「N 件選択中」と、選択した動画に使える操作のボタンを出す。
 * 選択の有無で表が上下に動かないよう、常に同じ高さで表の上に確保する。
 * 狭い画面ではボタンの文字を隠してアイコンだけにする
 */
export const VideoBulkActions = ({ videos }: VideoBulkActionsProps) => {
  const { openActionDialog, selectedIds } = useVideoSelection();
  const selectedVideos = videos.filter((video) =>
    selectedIds.includes(video.id)
  );
  const hasDeletedVideos = selectedVideos.some((video) => video.isDeleted);
  const hasNonDeletedVideos = selectedVideos.some((video) => !video.isDeleted);

  const handleBulkAction = (action: VideoAction) => {
    openActionDialog(action, getTargetVideos(selectedVideos, action));
  };

  return (
    <div
      aria-label="選択した動画の操作"
      className="mb-4 flex h-14 items-center justify-between gap-3 rounded-container bg-muted px-4"
      role="toolbar"
    >
      {selectedIds.length > 0 ? (
        <>
          <span
            aria-live="polite"
            className="text-meta font-semibold whitespace-nowrap tabular-nums"
          >
            {selectedIds.length} 件選択中
          </span>
          <div className="flex gap-2">
            {hasNonDeletedVideos && (
              <Button
                className="gap-1.5 whitespace-nowrap"
                onClick={() => handleBulkAction("toggle")}
                size="sm"
                variant="secondary"
              >
                <Eye aria-hidden="true" className="size-4" />
                <span className="sr-only sm:not-sr-only">
                  表示/非表示を切り替え
                </span>
              </Button>
            )}
            {hasDeletedVideos && (
              <Button
                className="gap-1.5 whitespace-nowrap"
                onClick={() => handleBulkAction("restore")}
                size="sm"
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                <span className="sr-only sm:not-sr-only">復元</span>
              </Button>
            )}
            {hasNonDeletedVideos && (
              <Button
                className="ml-2 gap-1.5 whitespace-nowrap sm:ml-4"
                onClick={() => handleBulkAction("delete")}
                size="sm"
                variant="danger"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                <span className="sr-only sm:not-sr-only">削除</span>
              </Button>
            )}
          </div>
        </>
      ) : (
        <span className="text-meta text-muted">
          動画を選択すると、まとめて操作できます。
        </span>
      )}
    </div>
  );
};
