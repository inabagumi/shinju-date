'use client'

import { Button } from '@shinju-date/ui'
import { Plus } from 'lucide-react'
import { ErrorMessage, FormField, Input, Label } from '@/components/form'
import { FormDialog } from '@/components/form-dialog'
import { createTalentAction } from '../_actions'
import {
  TALENT_READING_DESCRIPTION,
  TALENT_READING_PLACEHOLDER,
} from '../_lib/talent-reading-description'

export function TalentModal() {
  return (
    <FormDialog
      action={createTalentAction}
      submitLabel="追加"
      title="新しいタレントを追加"
      trigger={
        <Button className="shrink-0 gap-2">
          <Plus aria-hidden="true" className="size-4" />
          新しいタレントを追加
        </Button>
      }
    >
      <FormField name="name">
        <Label>タレント名</Label>
        <Input placeholder="表示に使用される名前" required />
        <p className="mt-1 text-caption text-muted">
          管理画面から編集可能な表示名（YouTube APIによる自動更新の対象外）
        </p>
        <ErrorMessage />
      </FormField>
      <FormField name="reading">
        <Label>読み仮名（任意）</Label>
        <Input placeholder={TALENT_READING_PLACEHOLDER} />
        <p className="mt-1 text-caption text-muted">
          {TALENT_READING_DESCRIPTION}
        </p>
        <ErrorMessage />
      </FormField>
      <FormField name="youtube_channel_id">
        <Label>YouTubeチャンネル（任意）</Label>
        <Input placeholder="@handle または https://youtube.com/@handle" />
        <p className="mt-1 text-caption text-muted">
          ハンドル・チャンネルID・URLに対応。追加時にYouTube
          APIから名前とハンドルを取得します。後から個別ページで設定することもできます。
        </p>
        <ErrorMessage />
      </FormField>
    </FormDialog>
  )
}
