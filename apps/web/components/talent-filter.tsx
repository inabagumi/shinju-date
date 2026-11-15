'use client'

import { MultiSelect } from '@shinju-date/ui'
import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'
import type { Talent } from '@/lib/fetchers'
import { getVideosPath, type VideoKindFilter } from '@/lib/video-kind-filter'

interface TalentFilterProps {
  kind: VideoKindFilter
  query: string
  /** 選択肢にする活動中のタレント。名前の昇順に並べておく */
  talents: Talent[]
  /** 選んでいるタレントの ID */
  value: string[]
}

/**
 * 動画一覧と検索結果をタレントで絞り込む複数選択。選ぶたびに条件を URL に
 * 反映する。何も選んでいないときは、すべてのタレントが対象になる。
 */
export default function TalentFilter({
  kind,
  query,
  talents,
  value,
}: TalentFilterProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  // 移動が終わるまでの間も、選んだ状態をすぐに表示する
  const [optimisticValue, setOptimisticValue] = useOptimistic(value)

  const handleChange = (nextValue: string[]) => {
    startTransition(() => {
      setOptimisticValue(nextValue)
      router.push(getVideosPath(query, kind, nextValue), { scroll: false })
    })
  }

  return (
    <MultiSelect
      className="h-9 w-auto max-w-full min-w-40 gap-2 rounded-full px-4 text-meta font-semibold"
      onChange={handleChange}
      options={talents.map((talent) => ({
        label: talent.name,
        value: talent.id,
      }))}
      placeholder="タレント"
      value={optimisticValue}
    />
  )
}
