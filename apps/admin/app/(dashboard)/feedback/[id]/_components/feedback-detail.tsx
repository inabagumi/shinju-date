'use client'

import type { Tables } from '@shinju-date/database'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import { Skeleton } from '@shinju-date/ui'
import Form, {
  FormField,
  Label,
  Select,
  SubmitButton,
  SuccessMessage,
  Textarea,
} from '@/components/form'
import { Markdown } from '@/components/markdown'
import { Panel, PanelSkeleton } from '@/components/panel'
import {
  markFeatureRequestAsRead,
  updateFeatureRequestMemo,
  updateFeatureRequestStatus,
} from '../../_actions/update-feedback'
import {
  FEATURE_REQUEST_STATUS_LABELS,
  FEATURE_REQUEST_STATUSES,
} from '../../_lib/feature-request-status'

interface FeatureRequestDetailProps {
  featureRequest: Tables<'feature_requests'>
}

const successMessageClassName = 'text-meta text-success'

export function FeatureRequestDetail({
  featureRequest,
}: FeatureRequestDetailProps) {
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
          <Form action={updateFeatureRequestMemo} className="space-y-4">
            <input name="id" type="hidden" value={featureRequest.id} />
            <FormField name="admin_memo">
              <Label>メモ（Markdown対応）</Label>
              <Textarea
                defaultValue={featureRequest.admin_memo ?? ''}
                rows={8}
              />
            </FormField>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton>メモを保存</SubmitButton>
              <SuccessMessage
                className={successMessageClassName}
                message="保存しました。"
              />
            </div>
          </Form>

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
          <Form action={updateFeatureRequestStatus} className="space-y-4">
            <input name="id" type="hidden" value={featureRequest.id} />
            <FormField name="status">
              <Label>対応ステータス</Label>
              <Select defaultValue={featureRequest.status}>
                {FEATURE_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {FEATURE_REQUEST_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton>ステータスを更新</SubmitButton>
              <SuccessMessage
                className={successMessageClassName}
                message="更新しました。"
              />
            </div>
          </Form>
        </Panel>

        {/* Read Status */}
        <Panel title="既読管理">
          <Form action={markFeatureRequestAsRead} className="space-y-4">
            <p className="text-meta">
              現在: {featureRequest.is_read ? '既読' : '未読'}
            </p>
            <input name="id" type="hidden" value={featureRequest.id} />
            <input
              name="is_read"
              type="hidden"
              value={String(!featureRequest.is_read)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton variant="secondary">
                {featureRequest.is_read ? '未読にする' : '既読にする'}
              </SubmitButton>
              <SuccessMessage
                className={successMessageClassName}
                message="更新しました。"
              />
            </div>
          </Form>
        </Panel>
      </div>
    </div>
  )
}

/**
 * 読み込み中の `FeatureRequestDetail`。広い画面では、本文（左の2列）に内容と管理メモ、
 * 操作（右の1列）に基本情報・ステータス管理・既読管理を並べる
 */
export function FeatureRequestDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="space-y-6 lg:col-span-2">
        <PanelSkeleton title="機能要望内容">
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </PanelSkeleton>

        <PanelSkeleton title="管理メモ">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-52 w-full" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </PanelSkeleton>
      </div>

      <div className="space-y-6">
        <PanelSkeleton title="基本情報">
          <div className="space-y-3">
            {['created_at', 'updated_at'].map((item) => (
              <div className="space-y-1" key={item}>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-6 w-40" />
              </div>
            ))}
          </div>
        </PanelSkeleton>

        <PanelSkeleton title="ステータス管理">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-9 w-36" />
          </div>
        </PanelSkeleton>

        <PanelSkeleton title="既読管理">
          <div className="space-y-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </PanelSkeleton>
      </div>
    </div>
  )
}
