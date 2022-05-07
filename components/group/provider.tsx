import { type PostgrestError } from '@supabase/supabase-js'
import { type FC, type ReactNode, useState } from 'react'
import useSWR, { type Fetcher } from 'swr'
import { supabase } from '../../lib/supabase'
import GroupContext from './context'
import { type GroupWithoutChannels } from './types'

const fetchAllGroups: Fetcher<GroupWithoutChannels[]> = async () => {
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

const GroupProvider: FC<Props> = ({ children }) => {
  const [currentGroup, setCurrentGroup] = useState<GroupWithoutChannels>()
  const { data: groups } = useSWR<GroupWithoutChannels[], PostgrestError>(
    'group-list',
    fetchAllGroups
  )

  return (
    <GroupContext.Provider
      value={{ current: currentGroup, setCurrentGroup, values: groups }}
    >
      {children}
    </GroupContext.Provider>
  )
}

export default GroupProvider
