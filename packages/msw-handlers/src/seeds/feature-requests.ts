import type { Tables } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";

import type { SeedContext } from "./context.js";

const FEATURE_REQUESTS = [
  {
    admin_memo: null,
    hoursAgo: 3,
    is_read: false,
    message: "配信予定をカレンダーアプリに登録できるようにしてほしいです。",
    status: "pending",
  },
  {
    admin_memo: "検索画面のタレント絞り込みで対応済み。",
    hoursAgo: 72,
    is_read: true,
    message:
      "特定のタレントの動画だけを表示できるようにしてください。\n\n- 複数選択できると嬉しいです",
    status: "resolved",
  },
] as const;

/**
 * Feature requests sent from the feedback form of the public site: one that
 * has not been read yet, and one that has been handled with a memo, so both
 * states of the list can be checked.
 */
export function createFeatureRequests({
  faker,
  now,
}: SeedContext): Tables<"feature_requests">[] {
  return FEATURE_REQUESTS.map(({ hoursAgo, ...values }) => {
    const createdAt = toDBString(now.subtract({ hours: hoursAgo }));

    return {
      ...values,
      created_at: createdAt,
      id: faker.string.uuid(),
      updated_at: createdAt,
    };
  });
}
