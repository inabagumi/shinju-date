import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExternalVideoLink, getExternalVideoUrl } from './external-video-link'

describe('ExternalVideoLink', () => {
  it('links a YouTube video to its watch page in a new tab', () => {
    render(
      <ExternalVideoLink
        video={{
          platform: 'youtube',
          youtube_video: { youtube_video_id: 'abc123' },
        }}
      >
        YouTubeで見る
      </ExternalVideoLink>,
    )

    const link = screen.getByRole('link', { name: 'YouTubeで見る' })

    expect(link).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abc123',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('links a Twitch video to Twitch, not to YouTube', () => {
    render(
      <ExternalVideoLink
        video={{
          platform: 'twitch',
          status: 'ENDED',
          twitch_video: {
            twitch_user: { twitch_login_name: 'example' },
            twitch_video_id: '2000000001',
            type: 'archive',
          },
          youtube_video: null,
        }}
      >
        Twitchで見る
      </ExternalVideoLink>,
    )

    expect(screen.getByRole('link', { name: 'Twitchで見る' })).toHaveAttribute(
      'href',
      'https://www.twitch.tv/videos/2000000001',
    )
  })

  it('links a Twitch clip to its clip page', () => {
    expect(
      getExternalVideoUrl({
        platform: 'twitch',
        twitch_video: {
          twitch_user: null,
          twitch_video_id: 'FunnyClip',
          type: 'clip',
        },
      }),
    ).toBe('https://clips.twitch.tv/FunnyClip')
  })

  it('passes other props to the link', () => {
    render(
      <ExternalVideoLink
        className="text-accent"
        video={{
          platform: 'youtube',
          youtube_video: { youtube_video_id: 'abc123' },
        }}
      >
        開く
      </ExternalVideoLink>,
    )

    expect(screen.getByRole('link', { name: '開く' })).toHaveClass(
      'text-accent',
    )
  })

  it.each([
    ['youtube', { platform: 'youtube', youtube_video: null }],
    ['twitch', { platform: 'twitch', twitch_video: null }],
  ] as const)(
    'renders only the content of a %s video without an ID',
    (_, video) => {
      render(<ExternalVideoLink video={video}>動画を見る</ExternalVideoLink>)

      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('動画を見る')).toBeInTheDocument()
    },
  )
})
