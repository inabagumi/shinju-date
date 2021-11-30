import { useContext } from 'react'
import GroupContext from './context'
import { type GroupWithoutChannels } from './types'

export function useGroups(): GroupWithoutChannels[] | undefined {
  const { values } = useContext(GroupContext)

  return values
}
