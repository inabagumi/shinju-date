'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { use } from 'react'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

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
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            className={`border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-774-blue-500 text-774-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
