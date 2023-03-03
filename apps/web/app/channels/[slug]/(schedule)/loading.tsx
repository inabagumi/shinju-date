import SimpleDocument from '@/ui/simple-document'
import Skeleton from '@/ui/skeleton'
import { TimelineSkeleton } from '@/ui/timeline'

export default function Loading(): JSX.Element {
  return (
    <SimpleDocument
      button={
        <a
          aria-disabled
          className="button button-lg button--secondary disabled"
          role="button"
        >
          動画一覧
        </a>
      }
      title={<Skeleton variant="text" />}
    >
      <h2 className="margin-top--lg">今後の配信予定</h2>

      <TimelineSkeleton />
    </SimpleDocument>
  )
}
