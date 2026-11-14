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
import { createTermAction, updateTermAction } from '../_actions'
import { SortableInputList } from './sortable-input-list'

interface Term {
  id: string
  term: string
  readings: string[]
  synonyms: string[]
}

interface TermModalProps {
  term?: Term
}

export function TermModal({ term }: TermModalProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!term

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const action = isEditing ? updateTermAction : createTermAction
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
        {isEditing ? (
          <Button size="sm" variant="secondary">
            編集
          </Button>
        ) : (
          <Button>新しい用語を追加</Button>
        )}
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="overflow-y-auto">
          <DialogTitle>
            {isEditing ? '用語を編集' : '新しい用語を追加'}
          </DialogTitle>
          <Form action={handleAction} className="space-y-4">
            {isEditing && (
              <input name="id" type="hidden" value={term.id.toString()} />
            )}
            <FormField name="term">
              <Label className="mb-2 block text-meta font-semibold">用語</Label>
              <Input defaultValue={term?.term ?? ''} required />
              <ErrorMessage className="mt-1 text-meta text-danger" />
            </FormField>
            <FormField name="readings">
              <Label className="mb-2 block text-meta font-semibold">
                読み方
              </Label>
              <SortableInputList
                addButtonLabel="読み方を追加"
                defaultValues={term?.readings ?? []}
                name="readings"
                placeholder="読み方を入力"
              />
              <ErrorMessage className="mt-1 text-meta text-danger" />
            </FormField>
            <FormField name="synonyms">
              <Label className="mb-2 block text-meta font-semibold">
                類義語
              </Label>
              <SortableInputList
                addButtonLabel="類義語を追加"
                defaultValues={term?.synonyms ?? []}
                name="synonyms"
                placeholder="類義語を入力"
              />
              <ErrorMessage className="mt-1 text-meta text-danger" />
            </FormField>
            <GenericErrorMessage className="rounded-control bg-danger/10 p-3 text-meta text-danger" />
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="secondary">キャンセル</Button>
              </DialogClose>
              <SubmitButton type="submit">
                {isEditing ? '更新' : '追加'}
              </SubmitButton>
            </div>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
