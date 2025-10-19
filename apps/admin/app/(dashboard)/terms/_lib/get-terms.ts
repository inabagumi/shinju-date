import { supabaseClient } from '@/lib/supabase'

export default async function getTerms() {
  const { data: terms, error } = await supabaseClient
    .from('terms')
    .select('id, readings, synonyms, term')
    .order('term', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return terms
}
