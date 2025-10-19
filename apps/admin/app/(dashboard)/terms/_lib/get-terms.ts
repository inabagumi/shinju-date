import { cookies } from 'next/headers'
import { createSupabaseClient } from '@/lib/supabase'

export default async function getTerms() {
  const cookieStore = await cookies()
  const supabaseClient = createSupabaseClient({
    cookieStore,
  })

  const { data: terms, error } = await supabaseClient
    .from('terms')
    .select('id, readings, synonyms, term')
    .order('readings->0', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return terms
}
