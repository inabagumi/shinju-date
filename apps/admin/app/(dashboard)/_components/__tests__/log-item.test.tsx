import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Log } from '../../_lib/get-audit-logs'
import { LogItem } from '../log-item'

const videoId = '30000000-0000-0000-0000-000000000101'

function videoSyncLog(details: Log['details']): Log {
  return {
    action: 'VIDEO_SYNC',
    created_at: '2024-11-24T17:00:00Z',
    details,
    id: '50000000-0000-0000-0000-000000000001',
    target_record_id: videoId,
    target_table: 'videos',
    user_email: 'admin@example.com',
    user_id: '60000000-0000-0000-0000-000000000001',
  }
}

describe('LogItem', () => {
  it('shows the video title and the synced changes', () => {
    render(
      <LogItem
        log={videoSyncLog({
          changes: {
            after: { duration: 'PT1H', title: 'New Title' },
            before: { duration: 'PT3H', title: 'Old Title' },
          },
          entityName: 'New Title',
        })}
      />,
    )

    expect(screen.getByRole('link', { name: 'New Title' })).toHaveAttribute(
      'href',
      `/videos/${videoId}`,
    )
    expect(screen.getByText('title:')).toBeInTheDocument()
    expect(screen.getByText('Old Title')).toBeInTheDocument()
    expect(screen.getByText('duration:')).toBeInTheDocument()
    expect(screen.getByText('PT3H')).toBeInTheDocument()
    expect(screen.getByText('PT1H')).toBeInTheDocument()
  })

  it('shows the changes of a sync logged with before and after directly under details', () => {
    render(
      <LogItem
        log={videoSyncLog({
          after: { title: 'New Title' },
          before: { title: 'Old Title' },
          platform: 'twitch',
        })}
      />,
    )

    // Older entries carry no entityName, so the record ID stands in.
    expect(screen.getByRole('link', { name: videoId })).toBeInTheDocument()
    expect(screen.getByText('title:')).toBeInTheDocument()
    expect(screen.getByText('Old Title')).toBeInTheDocument()
    expect(screen.getByText('New Title')).toBeInTheDocument()
  })

  it('shows no changes when details has neither changes nor before and after', () => {
    render(<LogItem log={videoSyncLog({ entityName: 'Title' })} />)

    expect(screen.getByRole('link', { name: 'Title' })).toBeInTheDocument()
    expect(screen.queryByText('→')).not.toBeInTheDocument()
  })
})
