import { type Dispatch, type SetStateAction } from 'react'
import { type Database } from '../../lib/database.types'

export type Group = Pick<
  Database['public']['Tables']['groups']['Row'],
  'id' | 'name' | 'slug'
>

export type GroupValue = {
  current?: Group
  setCurrentGroup?: SetCurrentGroup
  values?: Group[]
}

export type SetCurrentGroup = Dispatch<SetStateAction<Group | undefined>>
