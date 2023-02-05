import { type PostgrestError } from '@supabase/supabase-js'
import { type FC, type ReactNode, useState } from 'react'
import useSWR, { type Fetcher } from 'swr'
import { supabase } from '../../lib/supabase'
import GroupContext from './context'
import { type Group } from './types'

const fetchAllGroups: Fetcher<Group[]> = async () => {
  const { data, error } = await supabase.from('groups').select('id, name, slug')

  if (error) {
    throw error
  }

  return data || []
}

type Props = {
  children: ReactNode
}

const GroupProvider: FC<Props> = ({ children }) => {
  const [currentGroup, setCurrentGroup] = useState<Group>()
  const { data: groups } = useSWR<Group[], PostgrestError>(
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
