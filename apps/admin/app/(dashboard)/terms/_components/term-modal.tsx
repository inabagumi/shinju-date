'use client'

import { Button } from '@shinju-date/ui'
import { Plus } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { ErrorMessage, FormField, Input, Label } from '@/components/form'
import { FormDialog } from '@/components/form-dialog'
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
  const isEditing = !!term

  return (
    <FormDialog
      action={isEditing ? updateTermAction : createTermAction}
      submitLabel={isEditing ? '更新' : '追加'}
      title={isEditing ? '用語を編集' : '新しい用語を追加'}
      trigger={
        isEditing ? (
          <Button
            onFocus={preloadSortableInputList}
            onPointerEnter={preloadSortableInputList}
            size="sm"
            variant="secondary"
          >
            編集
          </Button>
        ) : (
          <Button
            className="shrink-0 gap-2"
            onFocus={preloadSortableInputList}
            onPointerEnter={preloadSortableInputList}
          >
            <Plus aria-hidden="true" className="size-4" />
            新しい用語を追加
          </Button>
        )
      }
    >
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
    </FormDialog>
  )
}
