import { supabaseClient } from '@/lib/supabase'

export default async function getTerms() {
  const { data: terms, error } = await supabaseClient
    .from('terms')
    .select('readings, synonyms, term')
    .order('updated_at', {
      ascending: true
    })

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  return terms
}
