import { useContext } from 'react'

import SiteContext from './SiteContext'
import type SiteMetadata from './SiteMetadata'

function useSiteMetadata(): SiteMetadata {
  const siteMetadata = useContext(SiteContext)

  return siteMetadata
}

export default useSiteMetadata
