import SimpleDocument from '@/components/simple-document'
import { TimelineSkeleton } from '@/components/timeline'

export default function ChannelScheduleLoading() {
  return (
    <SimpleDocument
      button={
        <a
          aria-disabled
          className="inline-block rounded-lg bg-primary-foreground px-6 py-1.5 text-primary"
          role="button"
        >
          動画一覧
        </a>
      }
      title={
        <span className="inline-block h-6 w-32 animate-pulse bg-774-nevy-100 dark:bg-zinc-800" />
      }
    >
      <h2 className="margin-top--lg">今後の配信予定</h2>

      <TimelineSkeleton />
    </SimpleDocument>
  )
}
