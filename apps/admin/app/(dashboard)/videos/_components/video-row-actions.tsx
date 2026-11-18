"use client";

import type { Tables } from "@shinju-date/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shinju-date/ui";
import { EllipsisVertical, ExternalLink } from "lucide-react";

import type { VideoAction } from "../_lib/video-actions";
import { useVideoSelection } from "./video-selection-provider";

interface VideoRowActionsProps {
  id: string;
  title: string;
  /** 削除済みか */
  isDeleted: boolean;
  platform: Tables<"videos">["platform"];
  /** YouTube や Twitch で開く URL。作れない動画は `null` */
  externalUrl: string | null;
}

/** 行ごとの操作のメニュー（外部のサイトで見る・表示の切り替え・削除・復元） */
export function VideoRowActions({
  externalUrl,
  id,
  isDeleted,
  platform,
  title,
}: VideoRowActionsProps) {
  const { openActionDialog } = useVideoSelection();

  const handleAction = (action: VideoAction) => {
    openActionDialog(action, [{ id, title }]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="アクションメニュー">
        <EllipsisVertical aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {externalUrl && (
          <DropdownMenuItem asChild>
            <a href={externalUrl} rel="noopener noreferrer" target="_blank">
              {platform === "twitch" ? "Twitchで見る" : "YouTubeで見る"}
              <ExternalLink aria-hidden="true" className="size-4 text-muted" />
            </a>
          </DropdownMenuItem>
        )}
        {isDeleted ? (
          <DropdownMenuItem onSelect={() => handleAction("restore")}>
            復元
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => handleAction("toggle")}>
              表示/非表示を切り替え
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => handleAction("delete")}
              variant="danger"
            >
              削除
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
