import React, { FC, ReactElement, createContext } from 'react'

const defaultValues = {
  baseUrl: 'http://localhost:3000',
  description: '...',
  title: 'Search'
}

export const SiteContext = createContext(defaultValues)

export const SiteProvider: FC = ({ children }): ReactElement => {
  const baseUrl = process.env.SHINJU_DATE_BASE_URL || defaultValues.baseUrl
  const description =
    process.env.SHINJU_DATE_DESCRIPTION || defaultValues.description
  const title = process.env.SHINJU_DATE_TITLE || defaultValues.title

  return (
    <SiteContext.Provider value={{ baseUrl, description, title }}>
      {children}
    </SiteContext.Provider>
  )
}
