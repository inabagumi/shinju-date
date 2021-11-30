import { type Group } from '../../lib/supabase'

export type GroupValue = {
  values?: GroupWithoutChannels[]
}

export type GroupWithoutChannels = Omit<Group, 'channels'>
