import type { Tables } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";

import { MOCK_SUPABASE_USER } from "../session.js";
import type { SeedContext } from "./context.js";

interface AuditLogsDependencies {
  talents: readonly Tables<"talents">[];
  terms: readonly Tables<"terms">[];
  videos: readonly Tables<"videos">[];
}

/**
 * Audit logs of the mock user, shaped like the ones the admin app records,
 * so that the recent activity of the system page can be checked: an update
 * of the first talent, a hidden video, the first term and the maintenance
 * mode.
 */
export function createAuditLogs(
  { faker, now }: SeedContext,
  { talents, terms, videos }: AuditLogsDependencies
): Tables<"audit_logs">[] {
  const [talent] = talents;
  const [term] = terms;
  const hiddenVideo = videos.find((video) => !video.visible);
  const logs = [
    {
      action: "CHANNEL_UPDATE" as const,
      details: talent ? { entityName: talent.name } : null,
      minutesAgo: 15,
      target_record_id: talent?.id ?? null,
      target_table: "talents",
    },
    {
      action: "VIDEO_VISIBILITY_TOGGLE" as const,
      details: hiddenVideo ? { entityName: hiddenVideo.title } : null,
      minutesAgo: 90,
      target_record_id: hiddenVideo?.id ?? null,
      target_table: "videos",
    },
    {
      action: "TERM_CREATE" as const,
      details: term ? { entityName: term.term } : null,
      minutesAgo: 60 * 26,
      target_record_id: term?.id ?? null,
      target_table: "terms",
    },
    {
      action: "MAINTENANCE_MODE_ENABLE" as const,
      details: null,
      minutesAgo: 60 * 24 * 5,
      target_record_id: null,
      target_table: "redis:system",
    },
  ];

  return logs.map(({ minutesAgo, ...log }) => ({
    ...log,
    created_at: toDBString(now.subtract({ minutes: minutesAgo })),
    id: faker.string.uuid(),
    user_id: MOCK_SUPABASE_USER.id,
  }));
}
