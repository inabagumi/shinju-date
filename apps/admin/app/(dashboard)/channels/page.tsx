import type { Metadata } from 'next'
import { ChannelsList } from './_components/channels-list'
import getChannels from './_lib/get-channels'

export const metadata: Metadata = {
  title: 'チャンネル管理',
}

export default async function ChannelsPage() {
  const channels = await getChannels()

  return <ChannelsList channels={channels} />
}
