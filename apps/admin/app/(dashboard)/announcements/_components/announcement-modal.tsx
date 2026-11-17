'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@shinju-date/ui'
import { useMemo, useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  Select,
  SubmitButton,
  Textarea,
} from '@/components/form'
import { createAnnouncementAction, updateAnnouncementAction } from '../_actions'

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
  announcement?: Tables<'announcements'>
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
        {isEditing ? (
          <Button size="sm" variant="secondary">
            編集
          </Button>
        ) : (
          <Button>新しいお知らせを追加</Button>
        )}
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-lg overflow-y-auto">
          <DialogTitle>
            {isEditing ? 'お知らせを編集' : '新しいお知らせを追加'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'お知らせの内容を編集してください。'
              : 'サイト全体に表示するお知らせを作成してください。'}
          </DialogDescription>
          <Form action={handleAction} className="space-y-4">
            {isEditing && (
              <input name="id" type="hidden" value={announcement.id} />
            )}
            <FormField name="message">
              <Label>メッセージ</Label>
              <Textarea
                defaultValue={announcement?.message ?? ''}
                required
                rows={3}
              />
              <ErrorMessage />
            </FormField>
            <FormField name="level">
              <Label>レベル</Label>
              <Select defaultValue={announcement?.level ?? 'info'}>
                <option value="info">情報 (青)</option>
                <option value="warning">警告 (黄)</option>
                <option value="alert">重要 (赤)</option>
              </Select>
              <ErrorMessage />
            </FormField>
            <FormField name="start_at_local">
              <Label>開始日時 (JST)</Label>
              <Input
                defaultValue={defaultStartAt
                  .toPlainDateTime()
                  .toString({ smallestUnit: 'minute' })}
                required
                step={60 * 30}
                type="datetime-local"
              />
              <ErrorMessage />
            </FormField>
            <FormField name="end_at_local">
              <Label>終了日時 (JST)</Label>
              <Input
                defaultValue={defaultEndAt
                  .toPlainDateTime()
                  .toString({ smallestUnit: 'minute' })}
                required
                step={60 * 30}
                type="datetime-local"
              />
              <ErrorMessage />
            </FormField>
            <FormField name="enabled">
              <Label className="mb-0 flex items-center gap-2">
                <input
                  className="size-4 accent-accent"
                  defaultChecked={announcement?.enabled ?? false}
                  name="enabled"
                  type="checkbox"
                  value="true"
                />
                有効化
              </Label>
              <ErrorMessage />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="secondary">キャンセル</Button>
              </DialogClose>
              <SubmitButton>{isEditing ? '更新' : '追加'}</SubmitButton>
            </div>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
