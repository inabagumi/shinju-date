import { useCallback, useContext, useEffect } from 'react'
import GroupContext from './context'
import { type GroupWithoutChannels, type SetCurrentGroup } from './types'

export function useCurrentGroup(
  initialCurrentGroup?: GroupWithoutChannels
): [currentGroup: GroupWithoutChannels | undefined, set: SetCurrentGroup] {
  const { current, setCurrentGroup } = useContext(GroupContext)
  const set = useCallback<SetCurrentGroup>(
    (...args) => setCurrentGroup?.(...args),
    [setCurrentGroup]
  )

  useEffect(() => {
    set(initialCurrentGroup)

    return () => {
      set(undefined)
    }
  }, [initialCurrentGroup, set])

  return [current, set]
}

export function useGroups(): GroupWithoutChannels[] | undefined {
  const { values } = useContext(GroupContext)

  return values
}
