"use client";

import { useVideoSelection } from "./video-selection-provider";

interface VideoSelectCheckboxProps {
  id: string;
  /** 動画のタイトル。チェックボックスの名前に使う */
  title: string;
}

/** 1件の動画を選択するチェックボックス */
export const VideoSelectCheckbox = ({
  id,
  title,
}: VideoSelectCheckboxProps) => {
  const { selectedIds, setSelected } = useVideoSelection();

  return (
    <input
      aria-label={`「${title}」を選択`}
      checked={selectedIds.includes(id)}
      className="size-4 accent-accent"
      onChange={(event) => setSelected(id, event.target.checked)}
      type="checkbox"
    />
  );
};

/** 表示中の動画を、すべて選択するチェックボックス */
export const VideoSelectAllCheckbox = () => {
  const { selectedIds, setAllSelected, videoIds } = useVideoSelection();
  const allSelected =
    videoIds.length > 0 && videoIds.every((id) => selectedIds.includes(id));

  return (
    <input
      aria-label="すべて選択"
      checked={allSelected}
      className="size-4 accent-accent"
      onChange={(event) => setAllSelected(event.target.checked)}
      type="checkbox"
    />
  );
};
