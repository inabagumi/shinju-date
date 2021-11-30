import { createContext } from 'react'
import { type GroupValue } from './types'

const GroupContext = createContext<GroupValue>({})

export default GroupContext
