'use client'

import type { Enums } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ActionToast, useActionToast } from '@/components/action-toast'
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
  const [pendingPlatform, setPendingPlatform] =
    useState<Enums<'platform_type'> | null>(null)
  const { showToast, toastProps } = useActionToast()

  const runSync = (platform: Enums<'platform_type'>) => {
    setPendingPlatform(platform)
    startTransition(async () => {
      try {
        const result =
          platform === 'youtube'
            ? await syncTalentWithYouTube(talentId)
            : await syncTalentWithTwitch(talentId)

        if (result.success) {
          showToast(
            'success',
            result.message ??
              (result.unchanged
                ? platform === 'youtube'
                  ? 'チャンネル情報は既に最新です。'
                  : 'Twitchユーザー情報は既に最新です。'
                : platform === 'youtube'
                  ? 'チャンネル情報を同期しました。'
                  : 'Twitchユーザー情報を同期しました。'),
          )
          if (!result.unchanged) {
            router.refresh()
          }
        } else {
          showToast('danger', result.error || '同期に失敗しました。')
        }
      } catch (_error) {
        showToast('danger', '予期しないエラーが発生しました。')
      } finally {
        setPendingPlatform(null)
      }
    })
  }

  if (!hasYouTubeChannels && !hasTwitchUsers) {
    return null
  }

  return (
    <>
      {hasYouTubeChannels && (
        <Button
          className="gap-2 whitespace-nowrap"
          disabled={isPending}
          onClick={() => runSync('youtube')}
          variant="secondary"
        >
          {pendingPlatform === 'youtube' && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          {pendingPlatform === 'youtube' ? '同期中...' : 'YouTubeと同期'}
        </Button>
      )}
      {hasTwitchUsers && (
        <Button
          className="gap-2 whitespace-nowrap"
          disabled={isPending}
          onClick={() => runSync('twitch')}
          variant="secondary"
        >
          {pendingPlatform === 'twitch' && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          {pendingPlatform === 'twitch' ? '同期中...' : 'Twitchと同期'}
        </Button>
      )}
      <ActionToast {...toastProps} />
    </>
  )
}
