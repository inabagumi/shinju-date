'use client'

import { Button } from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  syncTalentWithTwitch,
  syncTalentWithYouTube,
} from '../../_actions/sync'

interface Props {
  talentId: string
  hasYouTubeChannels: boolean
  hasTwitchUsers: boolean
}

export function SyncTalentButton({
  talentId,
  hasYouTubeChannels,
  hasTwitchUsers,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingPlatform, setPendingPlatform] = useState<
    'youtube' | 'twitch' | null
  >(null)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const runSync = (platform: 'youtube' | 'twitch') => {
    setMessage(null)
    setPendingPlatform(platform)
    startTransition(async () => {
      try {
        const result =
          platform === 'youtube'
            ? await syncTalentWithYouTube(talentId)
            : await syncTalentWithTwitch(talentId)

        if (result.success) {
          setMessage({
            text:
              result.message ??
              (result.unchanged
                ? platform === 'youtube'
                  ? 'チャンネル情報は既に最新です。'
                  : 'Twitchユーザー情報は既に最新です。'
                : platform === 'youtube'
                  ? 'チャンネル情報を同期しました。'
                  : 'Twitchユーザー情報を同期しました。'),
            type: 'success',
          })
          if (!result.unchanged) {
            router.refresh()
          }
        } else {
          setMessage({
            text: result.error || '同期に失敗しました。',
            type: 'error',
          })
        }
      } catch (_error) {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      } finally {
        setPendingPlatform(null)
      }
    })
  }

  if (!hasYouTubeChannels && !hasTwitchUsers) {
    return null
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasYouTubeChannels && (
          <Button
            className="whitespace-nowrap"
            disabled={isPending}
            onClick={() => runSync('youtube')}
            variant="primary"
          >
            {pendingPlatform === 'youtube' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {pendingPlatform === 'youtube' ? '同期中...' : 'YouTubeと同期'}
          </Button>
        )}
        {hasTwitchUsers && (
          <Button
            className="whitespace-nowrap"
            disabled={isPending}
            onClick={() => runSync('twitch')}
            variant="secondary"
          >
            {pendingPlatform === 'twitch' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {pendingPlatform === 'twitch' ? '同期中...' : 'Twitchと同期'}
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
