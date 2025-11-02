'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { TIME_ZONE } from '@shinju-date/constants'
import { useEffect, useState } from 'react'
import { Temporal } from 'temporal-polyfill'
import type { FormState } from '@/components/form'
import Form, {
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/form'
import { createAnnouncementAction, updateAnnouncementAction } from '../_actions'

type Announcement = {
  id: string
  message: string
  level: string
  enabled: boolean
  start_at: string
  end_at: string
}

type AnnouncementModalProps = {
  announcement?: Announcement
}

// Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
function toDateTimeLocal(isoString: string): string {
  const instant = Temporal.Instant.from(isoString)
  const zonedDateTime = instant.toZonedDateTimeISO(TIME_ZONE)

  return zonedDateTime
    .toString({
      smallestUnit: 'minute',
      timeZoneName: 'never',
    })
    .replace('[Asia/Tokyo]', '')
}

// Convert datetime-local format to ISO string
function toISOString(dateTimeLocal: string): string {
  // Parse as plain datetime in JST timezone
  const plainDateTime = Temporal.PlainDateTime.from(dateTimeLocal)
  const zonedDateTime = plainDateTime.toZonedDateTime(TIME_ZONE)
  return zonedDateTime.toInstant().toString()
}

export function AnnouncementModal({ announcement }: AnnouncementModalProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!announcement

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    // Convert datetime-local values to ISO strings
    const startAtLocal = formData.get('start_at_local') as string
    const endAtLocal = formData.get('end_at_local') as string

    if (startAtLocal && endAtLocal) {
      formData.set('start_at', toISOString(startAtLocal))
      formData.set('end_at', toISOString(endAtLocal))
    }

    const action = isEditing
      ? updateAnnouncementAction
      : createAnnouncementAction
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

  // Get default datetime values
  const now = Temporal.Now.instant()
  const defaultStart = announcement?.start_at
    ? toDateTimeLocal(announcement.start_at)
    : toDateTimeLocal(now.toString())
  const defaultEnd = announcement?.end_at
    ? toDateTimeLocal(announcement.end_at)
    : toDateTimeLocal(now.add({ hours: 24 }).toString())

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90"
          type="button"
        >
          {isEditing ? '編集' : '新しいお知らせを追加'}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content className="-translate-x-1/2 -translate-y-1/2 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-[500px] overflow-y-auto rounded-lg bg-white p-6 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in">
          <Dialog.Title className="mb-4 font-semibold text-xl">
            {isEditing ? 'お知らせを編集' : '新しいお知らせを追加'}
          </Dialog.Title>
          <Form action={handleAction} className="space-y-4">
            {isEditing && (
              <input name="id" type="hidden" value={announcement.id} />
            )}
            <FormField name="message">
              <Label className="mb-2 block font-medium">メッセージ</Label>
              <Textarea
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={announcement?.message ?? ''}
                required
                rows={3}
              />
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="level">
              <Label className="mb-2 block font-medium">レベル</Label>
              <Select
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={announcement?.level ?? 'info'}
              >
                <option value="info">情報 (青)</option>
                <option value="warning">警告 (黄)</option>
                <option value="alert">重要 (赤)</option>
              </Select>
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="start_at_local">
              <Label className="mb-2 block font-medium">開始日時 (JST)</Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={defaultStart}
                required
                type="datetime-local"
              />
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="end_at_local">
              <Label className="mb-2 block font-medium">終了日時 (JST)</Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={defaultEnd}
                required
                type="datetime-local"
              />
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="enabled">
              <Label className="flex items-center gap-2">
                <input
                  className="h-4 w-4"
                  defaultChecked={announcement?.enabled ?? false}
                  name="enabled"
                  type="checkbox"
                  value="true"
                />
                <span className="font-medium">有効化</span>
              </Label>
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <GenericErrorMessage className="text-red-600 text-sm" />
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  className="rounded-md border border-774-blue-300 px-4 py-2 hover:bg-gray-50"
                  type="button"
                >
                  キャンセル
                </button>
              </Dialog.Close>
              <Button
                className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90 disabled:opacity-50"
                type="submit"
              >
                {isEditing ? '更新' : '追加'}
              </Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
