import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/session'
import { type TypedSupabaseClient, createSupabaseClient } from '@/lib/supabase'

const REFERENCE_DATE_TIME = Temporal.Instant.from('2023-03-21T00:00:00+09:00')

type Group = Pick<
  Database['public']['Tables']['channels']['Row'],
  'id' | 'slug'
>

async function getSurvivingGroups(
  supabaseClient: TypedSupabaseClient
): Promise<Group[]> {
  const { data: groups, error } = await supabaseClient
    .from('groups')
    .select('id, slug')
    .in('slug', ['official', 'solo'])
    .is('deleted_at', null)

  if (error) {
    throw error
  }

  return groups
}

function getErrorMessage(error: unknown): string | undefined {
  if (
    error === null ||
    typeof error !== 'object' ||
    !('message' in error) ||
    typeof error.message !== 'string'
  ) {
    return
  }

  return error.message
}

export async function GET() {
  const currentDateTime = Temporal.Now.instant()

  if (Temporal.Instant.compare(REFERENCE_DATE_TIME, currentDateTime) >= 0) {
    return createErrorResponse(403, 'Before the reference time.')
  }

  const supabaseClient = createSupabaseClient({
    token: process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  let groups: Group[]
  try {
    groups = await getSurvivingGroups(supabaseClient)
  } catch (error) {
    return createErrorResponse(500, getErrorMessage(error))
  }

  const solo = groups.find((group) => group.slug === 'solo')

  if (!solo) {
    return createErrorResponse(500, 'The appropriate group does not exist.')
  }

  const { error } = await supabaseClient
    .from('channels')
    .update({
      group_id: solo.id,
      updated_at: currentDateTime.toJSON()
    })
    .not('group_id', 'in', `(${groups.map((group) => group.id).join(', ')})`)
    .is('deleted_at', null)

  if (error) {
    return createErrorResponse(500, error.message)
  }

  const { error: deletionError } = await supabaseClient
    .from('groups')
    .update({
      deleted_at: currentDateTime.toJSON(),
      updated_at: currentDateTime.toJSON()
    })
    .not('id', 'in', `(${groups.map((group) => group.id).join(', ')})`)
    .is('deleted_at', null)

  if (deletionError) {
    return createErrorResponse(500, getErrorMessage(deletionError))
  }

  return new NextResponse(null, {
    status: 204
  })
}
