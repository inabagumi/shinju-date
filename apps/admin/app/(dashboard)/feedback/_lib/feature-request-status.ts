import type { Tables } from '@shinju-date/database'

export type FeatureRequestStatus = Tables<'feature_requests'>['status']

/**
 * `feature_request_status` の値。クライアントコンポーネントでも使うため、
 * zod を使わずに判定する
 */
export const FEATURE_REQUEST_STATUSES = [
  'pending',
  'in_progress',
  'resolved',
  'rejected',
] as const satisfies readonly FeatureRequestStatus[]

export function isFeatureRequestStatus(
  value: unknown,
): value is FeatureRequestStatus {
  return (
    typeof value === 'string' &&
    (FEATURE_REQUEST_STATUSES as readonly string[]).includes(value)
  )
}
