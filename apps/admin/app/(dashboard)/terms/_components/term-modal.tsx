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
import { lazy, Suspense, useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import { createTermAction, updateTermAction } from '../_actions'
import { SortableInputListFallback } from './sortable-input-list-fallback'

// dnd-kit は入力欄を並べ替えるときにしか使わないため、一覧の初期ロードに
// 含めず、モーダルを開く操作に入ったときに読み込む
function loadSortableInputList() {
  return import('./sortable-input-list')
}

const SortableInputList = lazy(() =>
  loadSortableInputList().then((mod) => ({ default: mod.SortableInputList })),
)

function preloadSortableInputList() {
  // 読み込みに失敗しても、モーダルを開いたときに React.lazy がもう一度読み込む
  loadSortableInputList().catch(() => undefined)
}

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

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        asChild
        onFocus={preloadSortableInputList}
        onPointerEnter={preloadSortableInputList}
      >
        {isEditing ? (
          <Button size="sm" variant="secondary">
            編集
          </Button>
        ) : (
          <Button className="shrink-0 gap-2">
            <Plus aria-hidden="true" className="size-4" />
            新しい用語を追加
          </Button>
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
              <Label>用語</Label>
              <Input defaultValue={term?.term ?? ''} required />
              <ErrorMessage />
            </FormField>
            <FormField name="readings">
              <Label>読み方</Label>
              <Suspense
                fallback={
                  <SortableInputListFallback
                    addButtonLabel="読み方を追加"
                    defaultValues={term?.readings ?? []}
                    name="readings"
                    placeholder="読み方を入力"
                  />
                }
              >
                <SortableInputList
                  addButtonLabel="読み方を追加"
                  defaultValues={term?.readings ?? []}
                  name="readings"
                  placeholder="読み方を入力"
                />
              </Suspense>
              <ErrorMessage />
            </FormField>
            <FormField name="synonyms">
              <Label>類義語</Label>
              <Suspense
                fallback={
                  <SortableInputListFallback
                    addButtonLabel="類義語を追加"
                    defaultValues={term?.synonyms ?? []}
                    name="synonyms"
                    placeholder="類義語を入力"
                  />
                }
              >
                <SortableInputList
                  addButtonLabel="類義語を追加"
                  defaultValues={term?.synonyms ?? []}
                  name="synonyms"
                  placeholder="類義語を入力"
                />
              </Suspense>
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
