import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type {
  ProfileImage,
  TalentTwitchUser,
  TalentYouTubeChannel,
} from '@/lib/fetchers'
import TalentIcon, { getTalentProfileImage } from '../talent-icon'

function createProfileImage(id: string): ProfileImage {
  return { blur_data_url: 'data:image/png;base64,AAAA', id }
}

function createYouTubeChannel(
  profileImage: ProfileImage | null,
): TalentYouTubeChannel {
  return {
    name: 'YouTube',
    profile_image: profileImage,
    youtube_channel_id: 'UC1',
    youtube_handle: '@youtube',
  }
}

function createTwitchUser(profileImage: ProfileImage | null): TalentTwitchUser {
  return {
    name: 'Twitch',
    profile_image: profileImage,
    twitch_login_name: 'twitch',
    twitch_user_id: '1',
  }
}

describe('getTalentProfileImage', () => {
  test('should prefer the icon of a YouTube channel', () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(createProfileImage('twitch'))],
        youtube_channels: [createYouTubeChannel(createProfileImage('youtube'))],
      }),
    ).toEqual(createProfileImage('youtube'))
  })

  test('should use the first channel that has an icon', () => {
    expect(
      getTalentProfileImage({
        twitch_users: [],
        youtube_channels: [
          createYouTubeChannel(null),
          createYouTubeChannel(createProfileImage('second')),
        ],
      }),
    ).toEqual(createProfileImage('second'))
  })

  test('should fall back to the icon of a Twitch user', () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(createProfileImage('twitch'))],
        youtube_channels: [createYouTubeChannel(null)],
      }),
    ).toEqual(createProfileImage('twitch'))
  })

  test('should return null without any icon', () => {
    expect(
      getTalentProfileImage({
        twitch_users: [createTwitchUser(null)],
        youtube_channels: [],
      }),
    ).toBeNull()
  })
})

describe('TalentIcon', () => {
  test('should show the icon as a decoration', () => {
    const { container } = render(
      <TalentIcon
        size={64}
        talent={{
          twitch_users: [],
          youtube_channels: [createYouTubeChannel(createProfileImage('icon'))],
        }}
      />,
    )
    const image = container.querySelector('img')

    expect(image).toHaveAttribute('alt', '')
    expect(image?.getAttribute('src')).toContain('profile-images%2Ficon')
    expect(screen.getByTestId('talent-icon')).toHaveStyle({
      height: '64px',
      width: '64px',
    })
  })

  test('should leave the size to the class names without a size', () => {
    const { container } = render(
      <TalentIcon
        className="size-20 sm:size-24"
        sizes="(min-width: 640px) 96px, 80px"
        talent={{
          twitch_users: [],
          youtube_channels: [createYouTubeChannel(createProfileImage('icon'))],
        }}
      />,
    )
    const icon = screen.getByTestId('talent-icon')

    expect(icon).toHaveClass('size-20', 'sm:size-24')
    expect(icon).not.toHaveAttribute('style')
    expect(container.querySelector('img')).toHaveAttribute(
      'sizes',
      '(min-width: 640px) 96px, 80px',
    )
  })

  test('should show the default icon without any icon', () => {
    const { container } = render(
      <TalentIcon
        size={64}
        talent={{ twitch_users: [], youtube_channels: [] }}
      />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByTestId('talent-default-icon')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})
