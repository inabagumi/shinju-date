import type {
  PopularChannel,
  PopularChannelWithComparison,
} from '@/lib/analytics/get-popular-channels'

/**
 * Add comparison data to current period channels by comparing with previous period channels
 * @param currentChannels - Channels from current period
 * @param previousChannels - Channels from previous period
 * @returns Channels with comparison data added
 */
export function addComparisonData(
  currentChannels: PopularChannel[],
  previousChannels: PopularChannel[],
): PopularChannelWithComparison[] {
  // Create a map of previous channels for easy lookup
  const previousChannelMap = new Map(
    previousChannels.map((channel, index) => [
      channel.id,
      { ...channel, rank: index + 1 },
    ]),
  )

  return currentChannels.map((channel, currentIndex) => {
    const currentRank = currentIndex + 1
    const previousData = previousChannelMap.get(channel.id)

    let comparison: PopularChannelWithComparison['comparison']

    if (previousData) {
      const clicksChangePercent =
        previousData.clicks > 0
          ? ((channel.clicks - previousData.clicks) / previousData.clicks) * 100
          : 0

      const rankChange = previousData.rank - currentRank // positive means rank improved

      comparison = {
        clicksChangePercent,
        currentRank,
        previousClicks: previousData.clicks,
        previousRank: previousData.rank,
        rankChange,
      }
    } else {
      // New entry (wasn't in previous period's top results)
      comparison = {
        clicksChangePercent: 100, // 100% increase from 0
        currentRank,
        previousClicks: 0,
        previousRank: undefined,
        rankChange: undefined,
      }
    }

    return {
      ...channel,
      comparison,
    }
  })
}
