import { type PostgrestError } from '@supabase/supabase-js'
import { type ReactNode, type VFC } from 'react'
import useSWR, { type BareFetcher } from 'swr'
import { supabase } from '../../lib/supabase'
import GroupContext from './context'
import { GroupWithoutChannels } from './types'

const fetchAllGroups: BareFetcher<GroupWithoutChannels[]> = async () => {
  const { data, error } = await supabase
    .from<GroupWithoutChannels>('groups')
    .select('id, name, slug')

  if (error) {
    throw error
  }

  return data || []
}

type Props = {
  children: ReactNode
}

const GroupProvider: VFC<Props> = ({ children }) => {
  const { data: groups } = useSWR<GroupWithoutChannels[], PostgrestError>(
    'group-list',
    fetchAllGroups
  )

  return (
    <GroupContext.Provider value={{ values: groups }}>
      {children}
    </GroupContext.Provider>
  )
}

export default GroupProvider
