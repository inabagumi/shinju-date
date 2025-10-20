import { ChannelsList } from './_components/channels-list'
import getChannels from './_lib/get-channels'

export default async function ChannelsPage() {
  const channels = await getChannels()

  return <ChannelsList channels={channels} />
}
