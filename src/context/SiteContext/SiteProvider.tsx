import React, { FC } from 'react'

import SiteContext, { defaultValues } from './SiteContext'

const SiteProvider: FC = ({ children }) => {
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

export default SiteProvider
