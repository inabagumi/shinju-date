'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import Form, {
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
} from '@/components/form'
import { createTermAction, updateTermAction } from '../_actions'

type Term = {
  id: number
  term: string
  readings: string[]
  synonyms: string[]
}

type TermModalProps = {
  term?: Term
  onSuccess?: () => void
}

export function TermModal({ term, onSuccess }: TermModalProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!term

  useEffect(() => {
    if (!open) {
      // Reset form state when modal closes
      setTimeout(() => {
        onSuccess?.()
      }, 100)
    }
  }, [open, onSuccess])

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90"
          type="button"
        >
          {isEditing ? '編集' : '新しい用語を追加'}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content className="-translate-x-1/2 -translate-y-1/2 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-[500px] overflow-y-auto rounded-lg bg-white p-6 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in">
          <Dialog.Title className="mb-4 font-semibold text-xl">
            {isEditing ? '用語を編集' : '新しい用語を追加'}
          </Dialog.Title>
          <Form
            action={isEditing ? updateTermAction : createTermAction}
            className="space-y-4"
          >
            {isEditing && (
              <input name="id" type="hidden" value={term.id.toString()} />
            )}
            <FormField name="term">
              <Label className="mb-2 block font-medium">用語</Label>
              <Input
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={term?.term ?? ''}
                required
              />
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="readings">
              <Label className="mb-2 block font-medium">
                読み方（1行に1つ）
              </Label>
              <textarea
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={term?.readings.join('\n') ?? ''}
                name="readings"
                rows={3}
              />
              <ErrorMessage className="mt-1 text-red-600 text-sm" />
            </FormField>
            <FormField name="synonyms">
              <Label className="mb-2 block font-medium">
                類義語（1行に1つ）
              </Label>
              <textarea
                className="w-full rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
                defaultValue={term?.synonyms.join('\n') ?? ''}
                name="synonyms"
                rows={3}
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
