import { formatNumber } from "@shinju-date/helpers";
import { logger } from "@shinju-date/logger";
import { Alert } from "@shinju-date/ui";
import Link from "next/link";

import { countVideoBackfillFailures } from "../_lib/count-video-backfill-failures";

/**
 * Tells admins that the latest backfill of some accounts failed, so that they
 * can request them again. Renders nothing while there is no failure, or when
 * the failures cannot be counted.
 */
export const VideoBackfillFailureAlert = async () => {
  let failures: number;

  try {
    failures = await countVideoBackfillFailures();
  } catch (error) {
    logger.warn("失敗した過去動画の取り込みを数えられませんでした", { error });

    return null;
  }

  if (failures === 0) {
    return null;
  }

  return (
    <Alert
      action={
        <Link
          className="font-semibold underline"
          href="/system#video-backfill-history"
        >
          履歴を確認して再試行する
        </Link>
      }
      tone="danger"
    >
      過去動画の取り込みが失敗したアカウントが{formatNumber(failures)}
      件あります。
    </Alert>
  );
};
