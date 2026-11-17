import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Log } from '../_lib/get-audit-logs'
import { LogItem } from './log-item'

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

  it('shows the record ID and no changes when details does not match the schemas', () => {
    render(
      <LogItem
        log={videoSyncLog({
          changes: { after: { title: 'New Title' } },
          entityName: 42,
        })}
      />,
    )

    expect(screen.getByRole('link', { name: videoId })).toBeInTheDocument()
    expect(screen.queryByText('→')).not.toBeInTheDocument()
  })

  it.each(['talents', 'channels'])(
    'links a talent sync logged against %s to the talent',
    (targetTable) => {
      const talentId = '10000000-0000-0000-0000-000000000001'

      render(
        <LogItem
          log={{
            ...videoSyncLog({ entityName: 'Talent Name', platform: 'youtube' }),
            action: 'CHANNEL_SYNC',
            target_record_id: talentId,
            target_table: targetTable,
          }}
        />,
      )

      expect(screen.getByRole('link', { name: 'Talent Name' })).toHaveAttribute(
        'href',
        `/talents/${talentId}`,
      )
    },
  )

  it.each([
    {
      action: 'TWITCH_USER_CREATE',
      details: {
        account: {
          id: '20000000-0000-0000-0000-000000000001',
          name: 'Account',
          twitch_login_name: 'account',
          twitch_user_id: '12345678',
        },
        entityName: 'Talent Name',
      },
    },
    {
      action: 'YOUTUBE_CHANNEL_DELETE',
      details: {
        account: {
          id: '20000000-0000-0000-0000-000000000002',
          name: 'Account',
          youtube_channel_id: 'UC1234567890123456789012',
          youtube_handle: '@account',
        },
        entityName: 'Talent Name',
      },
    },
  ] as const)(
    'links $action to the talent that the account belongs to',
    ({ action, details }) => {
      const talentId = '10000000-0000-0000-0000-000000000001'

      render(
        <LogItem
          log={{
            ...videoSyncLog(details),
            action,
            target_record_id: talentId,
            target_table: 'talents',
          }}
        />,
      )

      expect(screen.getByRole('link', { name: 'Talent Name' })).toHaveAttribute(
        'href',
        `/talents/${talentId}`,
      )
    },
  )

  it.each(['twitch_users', 'youtube_channels'])(
    'does not link an account logged against %s before it was logged against its talent',
    (targetTable) => {
      const accountId = '20000000-0000-0000-0000-000000000001'

      render(
        <LogItem
          log={{
            ...videoSyncLog({ talent_id: 'talent-1' }),
            action: 'TWITCH_USER_CREATE',
            target_record_id: accountId,
            target_table: targetTable,
          }}
        />,
      )

      expect(screen.getByText(accountId)).toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    },
  )

  it('links a feedback update to the feedback and shows the changed status', () => {
    const feedbackId = '70000000-0000-0000-0000-000000000001'

    render(
      <LogItem
        log={{
          ...videoSyncLog({
            changes: {
              after: { status: 'resolved' },
              before: { status: 'pending' },
            },
            entityName: '検索結果を配信日で絞り込みたいです',
          }),
          action: 'FEATURE_REQUEST_UPDATE',
          target_record_id: feedbackId,
          target_table: 'feature_requests',
        }}
      />,
    )

    expect(
      screen.getByText('がフィードバックを更新しました'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '検索結果を配信日で絞り込みたいです' }),
    ).toHaveAttribute('href', `/feedback/${feedbackId}`)
    expect(screen.getByText('status:')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('resolved')).toBeInTheDocument()
  })
})
