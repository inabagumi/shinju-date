import { type PostgrestError } from '@supabase/supabase-js'

export class DatabaseError extends Error {
  code: string
  details: string
  hint: string

  constructor(baseError: PostgrestError) {
    super(baseError.message)

    this.code = baseError.code
    this.details = baseError.details
    this.hint = baseError.hint
  }
}
