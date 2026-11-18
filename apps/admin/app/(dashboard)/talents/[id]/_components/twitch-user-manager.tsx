"use client";

import type { Tables } from "@shinju-date/database";

import {
  addTwitchUserAction,
  removeTwitchUserAction,
} from "../../_actions/twitch-users";
import { LinkedAccountManager } from "./linked-account-manager";
import type { LinkedAccountListProps } from "./linked-account-manager";

type TwitchUser = Pick<
  Tables<"twitch_users">,
  "id" | "name" | "twitch_user_id" | "twitch_login_name"
>;

export function TwitchUserManager(props: LinkedAccountListProps<TwitchUser>) {
  return (
    <LinkedAccountManager
      {...props}
      addAction={addTwitchUserAction}
      field={{
        description: "例: example、https://www.twitch.tv/example、123456789",
        label: "ログイン名 / ユーザーID / URL",
        name: "twitch_user",
        placeholder: "login または https://twitch.tv/login",
      }}
      getAccount={(user) => ({
        handle: user.twitch_login_name,
        id: user.id,
        name: user.name,
        serviceId: user.twitch_user_id,
        url: user.twitch_login_name
          ? `https://www.twitch.tv/${encodeURIComponent(user.twitch_login_name)}`
          : null,
      })}
      labels={{
        account: "Twitchユーザー",
        add: "ユーザーを追加",
        addDescription:
          "ログイン名、ユーザーID、またはTwitch URLを入力してください。追加時にTwitch APIから表示名とログイン名を取得します。",
        empty: "登録されているTwitchユーザーがありません",
        handle: "ログイン名",
        name: "表示名",
        service: "Twitch",
        serviceId: "ユーザーID",
      }}
      removeAction={removeTwitchUserAction}
    />
  );
}
