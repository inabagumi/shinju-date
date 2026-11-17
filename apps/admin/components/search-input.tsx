'use client'

import { Input, type InputProps } from '@shinju-date/ui'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useUpdateSearchParams } from '@/lib/use-update-search-params'

/** 入力をやめてから URL に反映するまでの時間（ミリ秒） */
const DEFAULT_DEBOUNCE_MS = 500

export interface SearchInputProps
  extends Omit<InputProps, 'defaultValue' | 'onChange' | 'value'> {
  /** 入力をやめてから URL に反映するまでの時間（ミリ秒） */
  debounceMs?: number | undefined
  /** 検索語を持つ URL のパラメータの名前。既定は `search` */
  paramName?: string | undefined
}

/**
 * 入力欄の値を URL のパラメータと同期する検索ボックス。
 *
 * - 入力をやめてから少し待って、URL のパラメータに反映する（`replace`、`page` を消す）
 * - 「戻る」「進む」やリンクで URL のパラメータが変わったら、入力欄をその値に合わせる
 *
 * `useSearchParams` を使うため、中で Suspense に囲む。静的なシェルには、
 * 操作できない入力欄を出す。
 */
export function SearchInput({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  paramName = 'search',
  type = 'search',
  ...props
}: SearchInputProps) {
  return (
    <Suspense fallback={<Input {...props} disabled type={type} value="" />}>
      <SyncedSearchInput
        debounceMs={debounceMs}
        paramName={paramName}
        type={type}
        {...props}
      />
    </Suspense>
  )
}

interface SyncedSearchInputProps
  extends Omit<SearchInputProps, 'debounceMs' | 'paramName'> {
  debounceMs: number
  paramName: string
}

function SyncedSearchInput({
  debounceMs,
  paramName,
  ...props
}: SyncedSearchInputProps) {
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()
  const urlValue = searchParams.get(paramName) ?? ''
  const [value, setValue] = useState(urlValue)
  // URL のパラメータの値。自分で書いた値は、URL に反映される前から入れておく
  const knownUrlValueRef = useRef(urlValue)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // 自分で書いた値でなければ、外から変わったので、入力欄を合わせる
  useEffect(() => {
    if (urlValue === knownUrlValueRef.current) {
      return
    }

    knownUrlValueRef.current = urlValue
    clearTimeout(timerRef.current)
    setValue(urlValue)
  }, [urlValue])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleChange = (nextValue: string) => {
    setValue(nextValue)
    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const nextUrlValue = nextValue.trim() === '' ? '' : nextValue

      if (nextUrlValue === knownUrlValueRef.current) {
        return
      }

      knownUrlValueRef.current = nextUrlValue
      updateSearchParams({ [paramName]: nextUrlValue || null })
    }, debounceMs)
  }

  return (
    <Input
      {...props}
      onChange={(event) => handleChange(event.target.value)}
      value={value}
    />
  )
}
