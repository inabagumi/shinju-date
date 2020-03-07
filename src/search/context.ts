import { createContext } from 'react'

type SearchOptions = {
  apiKey?: string
  applicationId?: string
  indexName?: string
}

const defaultValue = {}

export default createContext<SearchOptions>(defaultValue)
