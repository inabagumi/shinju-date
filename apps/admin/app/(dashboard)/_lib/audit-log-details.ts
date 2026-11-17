import { z } from 'zod'
import type { Log } from './get-audit-logs'

const entityRefSchema = z.object({ entityName: z.string() })

const changesSchema = z.object({
  after: z.record(z.string(), z.unknown()),
  before: z.record(z.string(), z.unknown()),
})

const changeDetailsSchema = z.union([
  z.object({ changes: changesSchema }).transform(({ changes }) => changes),
  // Older VIDEO_SYNC entries keep `before` and `after` directly under
  // `details` instead of under `details.changes`.
  changesSchema,
])

export type AuditLogChanges = z.infer<typeof changesSchema>

/** Returns the name of the record that the entry recorded, if any. */
export function getEntityName(details: Log['details']): string | null {
  const result = entityRefSchema.safeParse(details)

  return result.success ? result.data.entityName : null
}

/**
 * Returns the values before and after the change that the entry recorded,
 * or `null` when the details hold no changes.
 */
export function getChanges(details: Log['details']): AuditLogChanges | null {
  const result = changeDetailsSchema.safeParse(details)

  return result.success ? result.data : null
}
