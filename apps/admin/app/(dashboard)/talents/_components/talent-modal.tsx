'use client'

import type { Tables } from '@shinju-date/database'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@shinju-date/ui'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import {
  createTalentAction,
  deleteTalentAction,
  updateTalentAction,
} from '../_actions'
import {
  TALENT_READING_DESCRIPTION,
  TALENT_READING_PLACEHOLDER,
} from '../_lib/talent-reading-description'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'reading'> & {
  youtube_channel: Pick<
    Tables<'youtube_channels'>,
    'name' | 'youtube_channel_id'
  > | null
}

interface TalentModalProps {
  talent?: Talent
}

export function TalentModal({ talent }: TalentModalProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!talent

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const action = isEditing ? updateTalentAction : createTalentAction
    const result = await action(currentState, formData)

    // Close modal if there are no errors
    if (!result.errors || Object.keys(result.errors).length === 0) {
      setOpen(false)
    }

    return result
  }

  useEffect(() => {
    if (!open) {
      // Small delay to allow the modal to close before resetting
      const timer = setTimeout(() => {
        // Any cleanup if needed
      }, 100)
      return () => {
        clearTimeout(timer)
      }
    }
    return undefined
  }, [open])

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="shrink-0 gap-2"
          variant={isEditing ? 'secondary' : 'primary'}
        >
          {!isEditing && <Plus aria-hidden="true" className="size-4" />}
          {isEditing ? '編集' : '新しいタレントを追加'}
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="overflow-y-auto">
          <DialogTitle>
            {isEditing ? 'タレントを編集' : '新しいタレントを追加'}
          </DialogTitle>
          <Form action={handleAction} className="space-y-4">
            {isEditing && (
              <input name="id" type="hidden" value={talent.id.toString()} />
            )}
            <FormField name="name">
              <Label>タレント名</Label>
              <Input
                defaultValue={talent?.name ?? ''}
                placeholder="表示に使用される名前"
                required
              />
              <p className="mt-1 text-caption text-muted">
                管理画面から編集可能な表示名（YouTube
                APIによる自動更新の対象外）
              </p>
              <ErrorMessage />
            </FormField>
            <FormField name="reading">
              <Label>読み仮名（任意）</Label>
              <Input
                defaultValue={talent?.reading ?? ''}
                placeholder={TALENT_READING_PLACEHOLDER}
              />
              <p className="mt-1 text-caption text-muted">
                {TALENT_READING_DESCRIPTION}
              </p>
              <ErrorMessage />
            </FormField>
            <FormField name="youtube_channel_id">
              <Label>YouTubeチャンネル（任意）</Label>
              <Input
                defaultValue={talent?.youtube_channel?.youtube_channel_id ?? ''}
                placeholder="@handle または https://youtube.com/@handle"
              />
              <p className="mt-1 text-caption text-muted">
                ハンドル・チャンネルID・URLに対応。追加時にYouTube
                APIから名前とハンドルを取得します。後から個別ページで設定することもできます。
              </p>
              <ErrorMessage />
            </FormField>
            <div className="flex items-center justify-between gap-2 pt-2">
              {isEditing && talent ? (
                <ConfirmDialog
                  confirmLabel="削除"
                  confirmVariant="danger"
                  description={`「${talent.name}」を削除しますか？紐づく動画も非公開になります。`}
                  onConfirm={() => deleteTalentAction(talent.id)}
                  title="タレントを削除"
                  trigger={<Button variant="danger">削除</Button>}
                />
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button variant="secondary">キャンセル</Button>
                </DialogClose>
                <SubmitButton>{isEditing ? '更新' : '追加'}</SubmitButton>
              </div>
            </div>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
