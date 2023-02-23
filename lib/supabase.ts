import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'
import { type Database } from './database.types'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const getAllChannels = cache(async function getAllChannels() {
  const { data, error } = await supabase
    .from('channels')
    .select('id, name, slug')
    .is('deleted_at', null)
    .order('created_at', {
      ascending: true
    })

  if (error) {
    throw error
  }

  return data ?? []
})

export const getAllGroups = cache(async function getAllGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, slug, short_name')
    .is('deleted_at', null)
    .order('created_at', {
      ascending: true
    })

  if (error) {
    throw error
  }

  return data ?? []
})

export const getChannelBySlug = cache(async function getChannelBySlug(
  slug: string
) {
  const { data: channel, error } = await supabase
    .from('channels')
    .select('id, name, slug')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return channel
})

export function getChannelsByGroup(
  group: Awaited<ReturnType<typeof getGroupBySlug>>
) {
  return group?.channels
    ? Array.isArray(group.channels)
      ? group.channels
      : [group.channels]
    : []
}

export const getGroupBySlug = cache(async function getGroupBySlug(
  slug: string
) {
  const { data: group, error } = await supabase
    .from('groups')
    .select('channels (id, name, slug), id, name, slug, short_name')
    .eq('slug', slug)
    .is('deleted_at', null)
    .is('channels.deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return group
})
