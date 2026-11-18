import { Constants } from "@shinju-date/database";
import type { Enums } from "@shinju-date/database";

export type FeatureRequestStatus = Enums<"feature_request_status">;

/** `feature_request_status` の値 */
export const FEATURE_REQUEST_STATUSES =
  Constants.public.Enums.feature_request_status;

/** `feature_request_status` の表示名 */
export const FEATURE_REQUEST_STATUS_LABELS: Record<
  FeatureRequestStatus,
  string
> = {
  in_progress: "対応中",
  pending: "未対応",
  rejected: "却下",
  resolved: "対応済み",
};
