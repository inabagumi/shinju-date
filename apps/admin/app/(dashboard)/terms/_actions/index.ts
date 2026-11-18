'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import {
  ActionError,
  type ActionResult,
  adminAction,
  adminFormAction,
} from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'

const TERM_REQUIRED_ERROR = '用語を入力してください。'
const ID_REQUIRED_ERROR = 'IDが指定されていません。'

/** 読み方と同義語の並び。前後の空白を除き、空の値は捨てる */
const termValuesSchema = z
  .array(z.string().trim())
  .transform((values) => values.filter(Boolean))
  .default([])

const createTermSchema = z.object({
  readings: termValuesSchema,
  synonyms: termValuesSchema,
  term: z
    .string({ error: TERM_REQUIRED_ERROR })
    .trim()
    .min(1, TERM_REQUIRED_ERROR),
})

const updateTermSchema = createTermSchema.extend({
  id: z.string({ error: ID_REQUIRED_ERROR }).min(1, ID_REQUIRED_ERROR),
})

async function revalidateTerms(): Promise<void> {
  revalidatePath('/terms')
  await revalidateTags([CACHE_TAGS.VIDEOS])
}

export const createTermAction = adminFormAction(
  'createTermAction',
  createTermSchema,
  async ({ supabaseClient }, { readings, synonyms, term }) => {
    const { data: newTerm, error } = await supabaseClient
      .from('terms')
      .insert({ readings, synonyms, term })
      .select('id, term')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog(supabaseClient, 'TERM_CREATE', newTerm.id, {
      entityName: newTerm.term,
    })

    await revalidateTerms()
  },
)

export const updateTermAction = adminFormAction(
  'updateTermAction',
  updateTermSchema,
  async ({ supabaseClient }, { id, readings, synonyms, term }) => {
    const { data: updatedTerm, error } = await supabaseClient
      .from('terms')
      .update({
        readings,
        synonyms,
        term,
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', id)
      .select('term')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog(supabaseClient, 'TERM_UPDATE', id, {
      entityName: updatedTerm.term,
    })

    await revalidateTerms()
  },
  // `id` は隠しフィールドで、画面に対応する入力欄がない
  { hiddenFields: ['id'] },
)

export const deleteTermAction = adminAction(
  'deleteTermAction',
  async ({ supabaseClient }, id: string): Promise<ActionResult> => {
    if (!id) {
      throw new ActionError(ID_REQUIRED_ERROR)
    }

    const { data: deletedTerm, error } = await supabaseClient
      .from('terms')
      .delete()
      .eq('id', id)
      .select('term')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog(supabaseClient, 'TERM_DELETE', id, {
      entityName: deletedTerm.term,
    })

    await revalidateTerms()

    return { success: true }
  },
)
