import type { Tables } from "@shinju-date/database";

import { randomFuture, randomPast } from "./context.js";
import type { SeedContext } from "./context.js";

/**
 * An announcement that is shown now. Its message contains a link and GFM
 * syntax (strikethrough), so that the rendering of the Markdown message can
 * be checked.
 */
export function createAnnouncements(
  context: SeedContext
): Tables<"announcements">[] {
  const createdAt = randomPast(context, 30);

  return [
    {
      created_at: createdAt,
      enabled: true,
      end_at: randomFuture(context, 365),
      id: context.faker.string.uuid(),
      level: "info",
      message:
        "メンテナンスのお知らせ: 日時は~~11月20日~~11月27日に変わりました。詳しくは[メンテナンス情報](https://example.com/maintenance)をご覧ください。",
      start_at: randomPast(context, 1),
      updated_at: createdAt,
    },
  ];
}
