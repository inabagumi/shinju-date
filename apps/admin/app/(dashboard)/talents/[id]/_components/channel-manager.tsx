"use client";

import type { Tables } from "@shinju-date/database";

import {
  addYouTubeChannelAction,
  removeYouTubeChannelAction,
} from "../../_actions/channels";
import {
  type LinkedAccountListProps,
  LinkedAccountManager,
} from "./linked-account-manager";

type Channel = Pick<
  Tables<"youtube_channels">,
  "id" | "name" | "youtube_channel_id" | "youtube_handle"
>;

export function ChannelManager(props: LinkedAccountListProps<Channel>) {
  return (
    <LinkedAccountManager
      {...props}
      addAction={addYouTubeChannelAction}
      field={{
        description: "例: @example、https://www.youtube.com/@example、UCxxx...",
        label: "ハンドル / チャンネルID / URL",
        name: "youtube_channel_id",
        placeholder: "@handle または https://youtube.com/@handle",
      }}
      getAccount={(channel) => ({
        handle: channel.youtube_handle,
        id: channel.id,
        name: channel.name,
        serviceId: channel.youtube_channel_id,
        url: `https://www.youtube.com/channel/${channel.youtube_channel_id}`,
      })}
      labels={{
        account: "YouTubeチャンネル",
        add: "チャンネルを追加",
        addDescription:
          "ハンドル、チャンネルID、またはYouTube URLを入力してください。追加時にYouTube APIから名前とハンドルを取得します。",
        empty: "登録されているチャンネルがありません",
        handle: "ハンドル",
        name: "チャンネル名",
        service: "YouTube",
        serviceId: "チャンネルID",
      }}
      removeAction={removeYouTubeChannelAction}
    />
  );
}
