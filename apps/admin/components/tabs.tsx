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
