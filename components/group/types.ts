import { type Dispatch, type SetStateAction } from 'react'
import { type Group } from '../../lib/supabase'

export type GroupValue = {
  current?: GroupWithoutChannels
  setCurrentGroup?: SetCurrentGroup
  values?: GroupWithoutChannels[]
}

export type GroupWithoutChannels = Omit<Group, 'channels'>

export type SetCurrentGroup = Dispatch<
  SetStateAction<GroupWithoutChannels | undefined>
>
