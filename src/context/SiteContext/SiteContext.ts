import { createContext } from 'react'

import type SiteMetadata from './SiteMetadata'

export const defaultValues = {
  baseURL: 'http://localhost:3000',
  description: '...',
  title: 'Search'
}

const SiteContext = createContext<SiteMetadata>(defaultValues)

export default SiteContext
