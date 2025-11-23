'use client'

import { Activity, useState } from 'react'

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

export function Tabs({ tabs, defaultTab, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className="border-gray-200 border-b">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              className={`whitespace-nowrap border-b-2 px-1 py-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
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
          mode={tab.id === activeTab ? 'visible' : 'hidden'}
        >
          <div className="mt-6">{tab.content}</div>
        </Activity>
      ))}
    </div>
  )
}
