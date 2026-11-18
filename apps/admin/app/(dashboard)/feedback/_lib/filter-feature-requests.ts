import type { Tables } from '@shinju-date/database'
import type { FeedbackSearchParams } from './search-params-schema'

type FilterableFeatureRequest = Pick<
  Tables<'feature_requests'>,
  'is_read' | 'status'
>

/**
 * 機能要望の一覧を、URL のパラメータで絞り込む。`undefined` の項目では絞り込まない
 */
export function filterFeatureRequests<T extends FilterableFeatureRequest>(
  featureRequests: readonly T[],
  { read, status }: FeedbackSearchParams,
): T[] {
  return featureRequests.filter(
    (item) =>
      (status === undefined || item.status === status) &&
      (read === undefined || item.is_read === (read === 'read')),
  )
}
