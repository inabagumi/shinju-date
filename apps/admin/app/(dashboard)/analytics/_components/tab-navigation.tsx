'use client'

import { use } from 'react'
import { useUpdateSearchParams } from '@/lib/use-update-search-params'
import type { AnalyticsSearchParams } from '../_lib/search-params-schema'

interface TabNavigationProps {
  searchParams: Promise<AnalyticsSearchParams>
  tabs: Array<{ id: string; label: string }>
  defaultTab: string
}

/**
 * Client component for tab navigation that updates URL with tab parameter
 */
export function TabNavigation({
  searchParams,
  tabs,
  defaultTab,
}: TabNavigationProps) {
  const updateSearchParams = useUpdateSearchParams()
  const { tab } = use(searchParams)

  const activeTab = tab || defaultTab

  const setActiveTab = (tabId: string) => {
    updateSearchParams(
      { tab: tabId === defaultTab ? null : tabId },
      { history: 'push' },
    )
  }

  return (
    <div className="border-b border-border">
      <div className="-mb-px flex gap-6" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={`border-b-2 px-1 py-2 text-meta font-semibold whitespace-nowrap transition-colors focus-ring ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-border hover:text-foreground'
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface TabNavigationSkeletonProps {
  tabs: TabNavigationProps['tabs']
}

/** 読み込み中の `TabNavigation`。タブの名前を、選ばれていない状態で並べる */
export function TabNavigationSkeleton({ tabs }: TabNavigationSkeletonProps) {
  return (
    <div aria-hidden="true" className="border-b border-border">
      <div className="-mb-px flex gap-6">
        {tabs.map((tab) => (
          <span
            className="border-b-2 border-transparent px-1 py-2 text-meta font-semibold whitespace-nowrap text-muted"
            key={tab.id}
          >
            {tab.label}
          </span>
        ))}
      </div>
    </div>
  )
}
