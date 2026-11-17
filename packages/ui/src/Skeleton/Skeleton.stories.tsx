import preview from '#.storybook/preview'
import { Skeleton } from './Skeleton'

const meta = preview.meta({
  component: Skeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  title: 'Components/Skeleton',
})

export const Default = meta.story({
  args: {
    className: 'h-4 w-48',
  },
})

/** サムネイルなど、入れ物の形の四角 */
export const Container = meta.story({
  args: {
    className: 'aspect-video w-48 rounded-container',
  },
})

/** 文字の行に並べる */
export const Inline = meta.story({
  render: () => (
    <p className="text-meta text-muted">
      全 <Skeleton className="inline-block h-4 w-16 align-middle" /> 件の動画
    </p>
  ),
})

/** 読み込み後の部品と同じ大きさで組み合わせる */
export const Composition = meta.story({
  render: () => (
    <div className="flex max-w-md items-center gap-4">
      <Skeleton className="aspect-video w-28 shrink-0 rounded-container" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  ),
})
