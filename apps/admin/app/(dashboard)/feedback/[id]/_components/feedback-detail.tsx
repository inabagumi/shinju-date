'use client'

import type { Tables } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import {
  markFeatureRequestAsRead,
  updateFeatureRequestMemo,
  updateFeatureRequestStatus,
} from '../../_actions/update-feedback'

interface FeatureRequestDetailProps {
  featureRequest: Tables<'feature_requests'>
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={pending} size="sm" type="submit" variant="primary">
      {pending ? '更新中...' : children}
    </Button>
  )
}

export function FeatureRequestDetail({
  featureRequest,
}: FeatureRequestDetailProps) {
  const [statusState, updateStatusAction] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const status = formData.get(
        'status',
      ) as Tables<'feature_requests'>['status']
      return await updateFeatureRequestStatus(featureRequest.id, status)
    },
    null,
  )

  const [memoState, updateMemoAction] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const memo = formData.get('admin_memo') as string
      return await updateFeatureRequestMemo(featureRequest.id, memo)
    },
    null,
  )

  const [readState, markAsReadAction] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const isRead = formData.get('is_read') === 'true'
      return await markFeatureRequestAsRead(featureRequest.id, isRead)
    },
    null,
  )

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-xl">基本情報</h2>
        <dl className="space-y-3">
          <div>
            <dt className="font-medium text-gray-600 text-sm">送信日時</dt>
            <dd className="mt-1">
              {new Date(featureRequest.created_at).toLocaleString('ja-JP')}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-600 text-sm">更新日時</dt>
            <dd className="mt-1">
              {new Date(featureRequest.updated_at).toLocaleString('ja-JP')}
            </dd>
          </div>
        </dl>
      </div>

      {/* Message */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-xl">機能要望内容</h2>
        <div className="whitespace-pre-wrap rounded bg-gray-50 p-4">
          {featureRequest.message}
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-xl">ステータス管理</h2>
        <form action={updateStatusAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="status">
              対応ステータス
            </label>
            <select
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              defaultValue={featureRequest.status}
              id="status"
              name="status"
            >
              <option value="pending">未対応</option>
              <option value="in_progress">対応中</option>
              <option value="resolved">対応済み</option>
              <option value="rejected">却下</option>
            </select>
          </div>
          <SubmitButton>ステータスを更新</SubmitButton>
          {statusState?.success === false && (
            <p className="text-red-600 text-sm">{statusState.error}</p>
          )}
          {statusState?.success === true && (
            <p className="text-green-600 text-sm">更新しました</p>
          )}
        </form>
      </div>

      {/* Read Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-xl">既読管理</h2>
        <form action={markAsReadAction} className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm">
              現在: {featureRequest.is_read ? '既読' : '未読'}
            </span>
            <input
              name="is_read"
              type="hidden"
              value={String(!featureRequest.is_read)}
            />
            <SubmitButton>
              {featureRequest.is_read ? '未読にする' : '既読にする'}
            </SubmitButton>
          </div>
          {readState?.success === false && (
            <p className="text-red-600 text-sm">{readState.error}</p>
          )}
          {readState?.success === true && (
            <p className="text-green-600 text-sm">更新しました</p>
          )}
        </form>
      </div>

      {/* Admin Memo */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-xl">管理メモ</h2>
        <form action={updateMemoAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="admin_memo">
              メモ（Markdown対応）
            </label>
            <textarea
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              defaultValue={featureRequest.admin_memo || ''}
              id="admin_memo"
              name="admin_memo"
              rows={8}
            />
          </div>
          <SubmitButton>メモを保存</SubmitButton>
          {memoState?.success === false && (
            <p className="text-red-600 text-sm">{memoState.error}</p>
          )}
          {memoState?.success === true && (
            <p className="text-green-600 text-sm">保存しました</p>
          )}
        </form>

        {/* Preview */}
        {featureRequest.admin_memo && (
          <div className="mt-6">
            <h3 className="mb-2 font-medium text-sm">プレビュー</h3>
            <div className="prose max-w-none rounded bg-gray-50 p-4 text-sm">
              <ReactMarkdown>{featureRequest.admin_memo}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
