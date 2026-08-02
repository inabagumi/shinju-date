import type { Tables } from '@shinju-date/database'
import { Badge, type BadgeProps } from '@shinju-date/ui'

type TalentStatus = Tables<'talents'>['status']

interface TalentStatusInfo {
  deleted_at: string | null
  status: TalentStatus
}

const STATUS_LABELS: Record<TalentStatus, string> = {
  active: 'アクティブ',
  retired: '引退',
}

function getBadgeVariant(talent: TalentStatusInfo): BadgeProps['variant'] {
  if (talent.deleted_at) {
    return 'error'
  }

  if (talent.status === 'retired') {
    return 'secondary'
  }

  return 'success'
}

function getStatusText(talent: TalentStatusInfo): string {
  if (talent.deleted_at) {
    return '削除済み'
  }

  return STATUS_LABELS[talent.status] ?? talent.status
}

interface TalentStatusBadgeProps {
  talent: TalentStatusInfo
  className?: string
}

export function TalentStatusBadge({
  talent,
  className,
}: TalentStatusBadgeProps) {
  return (
    <Badge className={className} variant={getBadgeVariant(talent)}>
      {getStatusText(talent)}
    </Badge>
  )
}
