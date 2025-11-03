'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@shinju-date/ui'
import { useMemo, useState } from 'react'
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
import type { Announcement } from '../_lib/types'

// Convert datetime-local format to ISO string
function toISOString(dateTimeLocal: string): string {
  // Parse as plain datetime in JST timezone
  const plainDateTime = Temporal.PlainDateTime.from(dateTimeLocal)
  const zonedDateTime = plainDateTime.toZonedDateTime(TIME_ZONE)
  return zonedDateTime.toInstant().toString()
}

export function AnnouncementModal({
  announcement,
}: {
  announcement?: Announcement
}) {
  const [open, setOpen] = useState(false)
  const defaultStartAt = useMemo(
    () =>
      (announcement
        ? Temporal.Instant.from(announcement.start_at)
        : Temporal.Now.instant().round({
            roundingIncrement: 30,
            roundingMode: 'expand',
            smallestUnit: 'minute',
          })
      ).toZonedDateTimeISO(TIME_ZONE),
    [announcement],
  )
  const defaultEndAt = useMemo(
    () =>
      announcement
        ? Temporal.Instant.from(announcement.end_at).toZonedDateTimeISO(
            TIME_ZONE,
          )
        : defaultStartAt.add({ weeks: 1 }),
    [announcement, defaultStartAt],
  )

  const isEditing = !!announcement

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    // Convert datetime-local values to ISO strings
    const startAtLocal = formData.get('start_at_local') as string
    const endAtLocal = formData.get('end_at_local') as string

    // Always set start_at and end_at, even if empty (for validation)
    if (startAtLocal && startAtLocal.trim() !== '') {
      formData.set('start_at', toISOString(startAtLocal))
    } else {
      formData.set('start_at', '')
    }

    if (endAtLocal && endAtLocal.trim() !== '') {
      formData.set('end_at', toISOString(endAtLocal))
    } else {
      formData.set('end_at', '')
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

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <button
          className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90"
          type="button"
        >
          {isEditing ? '編集' : '新しいお知らせを追加'}
        </button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[500px] overflow-y-auto">
          <DialogTitle>
            {isEditing ? 'お知らせを編集' : '新しいお知らせを追加'}
          </DialogTitle>
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
                className="w-full appearance-none rounded-md border border-gray-300 bg-[url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2016%2016%27%3e%3cpath%20fill=%27none%27%20stroke=%27%23333%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27m2%205%206%206%206-6%27/%3e%3c/svg%3e')] bg-position-[right_0.5rem_center] bg-size-[1em] bg-no-repeat px-3 py-2 pr-8"
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
                defaultValue={defaultStartAt
                  .toPlainDateTime()
                  .toString({ smallestUnit: 'minute' })}
                required
                step={60 * 30}
                type="datetime-local"
              />
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="end_at_local">
              <Label className="mb-2 block font-medium">終了日時 (JST)</Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={defaultEndAt
                  .toPlainDateTime()
                  .toString({ smallestUnit: 'minute' })}
                required
                step={60 * 30}
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
              <DialogClose asChild>
                <button
                  className="rounded-md border border-774-blue-300 px-4 py-2 hover:bg-gray-50"
                  type="button"
                >
                  キャンセル
                </button>
              </DialogClose>
              <Button
                className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90 disabled:opacity-50"
                type="submit"
              >
                {isEditing ? '更新' : '追加'}
              </Button>
            </div>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
