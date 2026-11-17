'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { use } from 'react'
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
  const router = useRouter()
  const pathname = usePathname()
  const urlSearchParams = useSearchParams()
  const { tab } = use(searchParams)

  const activeTab = tab || defaultTab

  const setActiveTab = (tabId: string) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    if (tabId === defaultTab) {
      params.delete('tab')
    } else {
      params.set('tab', tabId)
    }

    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(url)
  }

  return (
    <div className="border-b border-border">
      <div className="-mb-px flex gap-6" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={`border-b-2 px-1 py-2 text-meta font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
