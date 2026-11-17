'use client'

import type { Tables } from '@shinju-date/database'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import { Select, Textarea } from '@shinju-date/ui'
import { useActionState } from 'react'
import { SubmitButton } from '@/components/form'
import { Markdown } from '@/components/markdown'
import { Panel } from '@/components/panel'
import {
  markFeatureRequestAsRead,
  updateFeatureRequestMemo,
  updateFeatureRequestStatus,
} from '../../_actions/update-feedback'
import {
  FEATURE_REQUEST_STATUS_LABELS,
  FEATURE_REQUEST_STATUSES,
  isFeatureRequestStatus,
} from '../../_lib/feature-request-status'

interface FeatureRequestDetailProps {
  featureRequest: Tables<'feature_requests'>
}

const labelClassName = 'block text-meta font-semibold'

export function FeatureRequestDetail({
  featureRequest,
}: FeatureRequestDetailProps) {
  const [statusState, updateStatusAction] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const statusValue = formData.get('status')

      if (!isFeatureRequestStatus(statusValue)) {
        return {
          error: 'Invalid status value',
          success: false,
        }
      }

      return updateFeatureRequestStatus(featureRequest.id, statusValue)
    },
    null,
  )

  const [memoState, updateMemoAction] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const memoValue = formData.get('admin_memo')

      if (typeof memoValue !== 'string') {
        return {
          error: 'Invalid memo value',
          success: false,
        }
      }

      return updateFeatureRequestMemo(featureRequest.id, memoValue)
    },
    null,
  )

  const [readState, markAsReadAction] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const isRead = formData.get('is_read') === 'true'
      return markFeatureRequestAsRead(featureRequest.id, isRead)
    },
    null,
  )

  const createdAtFormatted = formatDateTimeFromISO(featureRequest.created_at)
  const updatedAtFormatted = formatDateTimeFromISO(featureRequest.updated_at)

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="space-y-6 lg:col-span-2">
        {/* Message */}
        <Panel title="機能要望内容">
          <Markdown>{featureRequest.message}</Markdown>
        </Panel>

        {/* Admin Memo */}
        <Panel title="管理メモ">
          <form action={updateMemoAction} className="space-y-4">
            <div className="space-y-2">
              <label className={labelClassName} htmlFor="admin_memo">
                メモ（Markdown対応）
              </label>
              <Textarea
                defaultValue={featureRequest.admin_memo || ''}
                id="admin_memo"
                name="admin_memo"
                rows={8}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton>メモを保存</SubmitButton>
              <ActionResult message="保存しました" state={memoState} />
            </div>
          </form>

          {/* Preview */}
          {featureRequest.admin_memo && (
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="mb-2 text-body leading-normal font-semibold">
                プレビュー
              </h3>
              <Markdown>{featureRequest.admin_memo}</Markdown>
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Panel title="基本情報">
          <dl className="space-y-3">
            <div>
              <dt className="text-meta text-muted">送信日時</dt>
              <dd className="mt-1 tabular-nums">{createdAtFormatted}</dd>
            </div>
            <div>
              <dt className="text-meta text-muted">更新日時</dt>
              <dd className="mt-1 tabular-nums">{updatedAtFormatted}</dd>
            </div>
          </dl>
        </Panel>

        {/* Status */}
        <Panel title="ステータス管理">
          <form action={updateStatusAction} className="space-y-4">
            <div className="space-y-2">
              <label className={labelClassName} htmlFor="status">
                対応ステータス
              </label>
              <Select
                defaultValue={featureRequest.status}
                id="status"
                name="status"
              >
                {FEATURE_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {FEATURE_REQUEST_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton>ステータスを更新</SubmitButton>
              <ActionResult message="更新しました" state={statusState} />
            </div>
          </form>
        </Panel>

        {/* Read Status */}
        <Panel title="既読管理">
          <form action={markAsReadAction} className="space-y-4">
            <p className="text-meta">
              現在: {featureRequest.is_read ? '既読' : '未読'}
            </p>
            <input
              name="is_read"
              type="hidden"
              value={String(!featureRequest.is_read)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton variant="secondary">
                {featureRequest.is_read ? '未読にする' : '既読にする'}
              </SubmitButton>
              <ActionResult message="更新しました" state={readState} />
            </div>
          </form>
        </Panel>
      </div>
    </div>
  )
}

interface ActionResultProps {
  message: string
  state: { error?: string; success: boolean } | null
}

/** フォームを送信した結果。失敗は `text-danger`、成功は `text-success` で示す */
function ActionResult({ message, state }: ActionResultProps) {
  if (state?.success === false) {
    return (
      <p className="text-meta text-danger" role="alert">
        {state.error}
      </p>
    )
  }

  if (state?.success === true) {
    return (
      <p className="text-meta text-success" role="status">
        {message}
      </p>
    )
  }

  return null
}
