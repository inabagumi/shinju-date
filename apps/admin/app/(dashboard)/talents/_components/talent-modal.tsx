'use client'

import type { Tables } from '@shinju-date/database'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@shinju-date/ui'
import { useEffect, useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import { createTalentAction, updateTalentAction } from '../_actions'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

type Talent = Pick<Tables<'talents'>, 'id' | 'name'> & {
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
        <button
          className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90"
          type="button"
        >
          {isEditing ? '編集' : '新しいタレントを追加'}
        </button>
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
              <Label className="mb-2 block font-medium">タレント名</Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={talent?.name ?? ''}
                placeholder="表示に使用される名前"
                required
              />
              <p className="mt-1 text-gray-500 text-xs">
                管理画面から編集可能な表示名（YouTube
                APIによる自動更新の対象外）
              </p>
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="youtube_channel_id">
              <Label className="mb-2 block font-medium">
                YouTubeチャンネルID（任意）
              </Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={talent?.youtube_channel?.youtube_channel_id ?? ''}
                placeholder="UCから始まるチャンネルID"
              />
              <p className="mt-1 text-gray-500 text-xs">
                後から個別ページで設定することもできます
              </p>
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <GenericErrorMessage className="text-red-600 text-sm" />
            <div className="flex items-center justify-between gap-2 pt-2">
              {isEditing && talent ? (
                <DeleteConfirmDialog
                  talentId={talent.id}
                  talentName={talent.name}
                />
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <DialogClose asChild>
                  <button
                    className="rounded-md border border-774-blue-300 px-4 py-2 hover:bg-gray-50"
                    type="button"
                  >
                    キャンセル
                  </button>
                </DialogClose>
                <SubmitButton
                  className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90 disabled:opacity-50"
                  type="submit"
                >
                  {isEditing ? '更新' : '追加'}
                </SubmitButton>
              </div>
            </div>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
