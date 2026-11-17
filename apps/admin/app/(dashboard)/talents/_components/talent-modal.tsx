'use client'

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
import { useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import { createTalentAction } from '../_actions'
import {
  TALENT_READING_DESCRIPTION,
  TALENT_READING_PLACEHOLDER,
} from '../_lib/talent-reading-description'

export function TalentModal() {
  const [open, setOpen] = useState(false)

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const result = await createTalentAction(currentState, formData)

    // Close modal if there are no errors
    if (!result.errors || Object.keys(result.errors).length === 0) {
      setOpen(false)
    }

    return result
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="shrink-0 gap-2">
          <Plus aria-hidden="true" className="size-4" />
          新しいタレントを追加
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="overflow-y-auto">
          <DialogTitle>新しいタレントを追加</DialogTitle>
          <Form action={handleAction} className="space-y-4">
            <FormField name="name">
              <Label>タレント名</Label>
              <Input placeholder="表示に使用される名前" required />
              <p className="mt-1 text-caption text-muted">
                管理画面から編集可能な表示名（YouTube
                APIによる自動更新の対象外）
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
            <div className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="secondary">キャンセル</Button>
              </DialogClose>
              <SubmitButton>追加</SubmitButton>
            </div>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
