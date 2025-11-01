import type { PopularTalent } from '@/lib/analytics/get-popular-talents'

export type PopularTalentWithComparison = PopularTalent & {
  comparison: {
    previousClicks: number
    previousRank?: number | undefined
    currentRank: number
    clicksChangePercent: number
    rankChange?: number | undefined // positive means rank improved (lower number), negative means rank worsened
  }
}

/**
 * Add comparison data to current period talents by comparing with previous period talents
 * @param currentTalents - Talents from current period
 * @param previousTalents - Talents from previous period
 * @returns Talents with comparison data added
 */
export function addComparisonData(
  currentTalents: PopularTalent[],
  previousTalents: PopularTalent[],
): PopularTalentWithComparison[] {
  // Create a map of previous talents for easy lookup
  const previousTalentsMap = new Map(
    previousTalents.map((talent, index) => [
      talent.id,
      { ...talent, rank: index + 1 },
    ]),
  )

  return currentTalents.map((talent, currentIndex) => {
    const currentRank = currentIndex + 1
    const previousData = previousTalentsMap.get(talent.id)

    let comparison: PopularTalentWithComparison['comparison']

    if (previousData) {
      const clicksChangePercent =
        previousData.clicks > 0
          ? ((talent.clicks - previousData.clicks) / previousData.clicks) * 100
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
      ...talent,
      comparison,
    }
  })
}
