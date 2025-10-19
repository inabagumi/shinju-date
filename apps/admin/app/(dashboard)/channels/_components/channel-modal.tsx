'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
} from '@/components/form'
import { createChannelAction, updateChannelAction } from '../_actions'

type Channel = {
  id: number
  name: string
  slug: string
}

type ChannelModalProps = {
  channel?: Channel
}

export function ChannelModal({ channel }: ChannelModalProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!channel

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const action = isEditing ? updateChannelAction : createChannelAction
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
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90"
          type="button"
        >
          {isEditing ? '編集' : '新しいチャンネルを追加'}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content className="-translate-x-1/2 -translate-y-1/2 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-[500px] overflow-y-auto rounded-lg bg-white p-6 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in">
          <Dialog.Title className="mb-4 font-semibold text-xl">
            {isEditing ? 'チャンネルを編集' : '新しいチャンネルを追加'}
          </Dialog.Title>
          <Form action={handleAction} className="space-y-4">
            {isEditing && (
              <input name="id" type="hidden" value={channel.id.toString()} />
            )}
            <FormField name="name">
              <Label className="mb-2 block font-medium">チャンネル名</Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={channel?.name ?? ''}
                required
              />
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="slug">
              <Label className="mb-2 block font-medium">チャンネルID</Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={channel?.slug ?? ''}
                required
              />
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
