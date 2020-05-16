import React, { FC, ReactElement, createContext, useContext } from 'react'

export type SiteMetadata = {
  baseURL: string
  description: string
  title: string
}

const defaultValues = {
  baseURL: 'http://localhost:3000',
  description: '...',
  title: 'Search'
}

const SiteContext = createContext<SiteMetadata>(defaultValues)

export const SiteProvider: FC = ({ children }): ReactElement => {
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL || defaultValues.baseURL
  const description =
    process.env.NEXT_PUBLIC_DESCRIPTION || defaultValues.description
  const title = process.env.NEXT_PUBLIC_TITLE || defaultValues.title

  return (
    <SiteContext.Provider value={{ baseURL, description, title }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSiteMetadata(): SiteMetadata {
  const siteMetadata = useContext(SiteContext)

  return siteMetadata
}

export default SiteContext
