'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Activity, use } from 'react'
import type { AnalyticsSearchParams } from '../_lib/search-params-schema'

type ServerTab = {
  id: string
  label: string
  content: React.ReactNode
}

type ServerTabsProps = {
  tabs: ServerTab[]
  defaultTab?: string
  className?: string
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Server-compatible tabs component that uses query string state
 * This allows tabs to work with server components while maintaining state in the URL
 */
export function ServerTabs({
  tabs,
  defaultTab,
  className = '',
  searchParams,
}: ServerTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const urlSearchParams = useSearchParams()
  const { tab } = use(searchParams)

  const currentTab = tab || defaultTab || tabs[0]?.id || ''

  const setActiveTab = (tabId: string) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    if (tabId === defaultTab) {
      params.delete('tab') // Remove tab param if it's the default
    } else {
      params.set('tab', tabId)
    }

    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(url)
  }

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className="border-gray-200 border-b">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              className={`whitespace-nowrap border-b-2 px-1 py-2 font-medium text-sm transition-colors ${
                currentTab === tab.id
                  ? 'border-blue-500 text-blue-600'
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

      {/* Tab Content */}
      {tabs.map((tab) => (
        <Activity
          key={tab.id}
          mode={tab.id === currentTab ? 'visible' : 'hidden'}
        >
          <div className="mt-6">{tab.content}</div>
        </Activity>
      ))}
    </div>
  )
}
