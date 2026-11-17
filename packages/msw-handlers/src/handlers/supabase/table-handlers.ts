import type { Tables } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { HttpResponse } from 'msw'
import { parseError } from './errors.js'
import {
  applyOrder,
  applyPagination,
  applySupabaseConditions,
  formatContentRange,
  getColumn,
  getOffset,
  parseSupabaseQuery,
  type SupabaseQuery,
} from './query.js'
import {
  acceptsSingleObject,
  REST_URL,
  rest,
  singleObjectError,
} from './rest.js'
import { applySelect, selectRows } from './select.js'
import {
  getRows,
  type TableDefinition,
  type TableName,
  type UniqueConstraint,
  type WritableTableDefinition,
} from './tables.js'

/** Whether the request asks for the rows that it changed. */
function returnsRepresentation(request: Request): boolean {
  return (request.headers.get('prefer') ?? '').includes('return=representation')
}

/**
 * The rows that a read returns, projected with the select of the query, and
 * the number of all the rows that match the filters (and the embedded
 * resources with `!inner`) before the pagination, which an exact count
 * returns.
 */
async function readRows<Name extends TableName>(
  table: TableDefinition<Name>,
  request: Request,
): Promise<{
  headers: Record<string, string>
  page: object[]
}> {
  const query = parseSupabaseQuery(new URL(request.url))
  const matched = applyOrder(
    await selectRows(
      applySupabaseConditions(await getRows(table), query),
      query.select,
      table.name,
      query.filters,
    ),
    query.order,
    ({ row }) => row,
  )
  const page = applyPagination(matched, query)
  const counts =
    (request.headers.get('prefer') ?? '').includes('count=exact') ||
    query.returnCount

  return {
    headers: {
      'Content-Range': formatContentRange(
        getOffset(query),
        page.length,
        counts ? matched.length : '*',
      ),
      'Content-Type': 'application/json',
    },
    page: page.map(({ output }) => output),
  }
}

/**
 * Parse the query of a write. Writes change the rows that match the filters
 * of the table itself, so filters on embedded resources are not supported.
 */
function parseWriteQuery(request: Request): SupabaseQuery {
  const query = parseSupabaseQuery(new URL(request.url))
  const embedded = query.filters.find(({ path }) => path.length > 0)

  if (embedded) {
    throw parseError(
      `unsupported filter on the embedded resource '${embedded.path.join('.')}' in a write`,
      'The mock supports filters on embedded resources only in reads (GET and HEAD)',
    )
  }

  return query
}

/** The primary key, which every table of the mock has. */
const PRIMARY_KEY_COLUMNS = ['id'] as const

/**
 * An error response of PostgreSQL when the rows that a write would leave
 * break a constraint: a `NOT NULL` column without a value in the written
 * rows, or two rows of the table with the same values of a unique
 * constraint. `null` when nothing breaks.
 */
function findViolation<Name extends TableName>(
  table: WritableTableDefinition<Name>,
  writtenRows: readonly Tables<Name>[],
  allRows: readonly Tables<Name>[],
): Response | null {
  for (const row of writtenRows) {
    for (const column of table.notNullColumns) {
      if (getColumn(row, column) == null) {
        return HttpResponse.json(
          {
            code: '23502',
            details: null,
            hint: null,
            message: `null value in column "${column}" of relation "${table.name}" violates not-null constraint`,
          },
          { status: 400 },
        )
      }
    }
  }

  const constraints: readonly UniqueConstraint<TableName>[] = [
    { columns: PRIMARY_KEY_COLUMNS, name: `${table.name}_pkey` },
    ...table.unique,
  ]

  for (const { columns, name } of constraints) {
    const seen = new Set<string>()

    for (const row of allRows) {
      const values = columns.map((column) => getColumn(row, column))

      // As in SQL, `NULL` does not equal anything, even `NULL`.
      if (values.some((value) => value == null)) {
        continue
      }

      const key = JSON.stringify(values)

      if (seen.has(key)) {
        return HttpResponse.json(
          {
            code: '23505',
            details: `Key (${columns.join(', ')})=(${values.join(', ')}) already exists.`,
            hint: null,
            message: `duplicate key value violates unique constraint "${name}"`,
          },
          { status: 409 },
        )
      }

      seen.add(key)
    }
  }

  return null
}

/** The row with the same values of the given columns, if any. */
function findConflict<Row extends object>(
  rows: readonly Row[],
  values: object,
  columns: readonly string[],
): Row | undefined {
  return rows.find((row) =>
    columns.every(
      (column) =>
        getColumn(values, column) != null &&
        getColumn(row, column) === getColumn(values, column),
    ),
  )
}

/**
 * The changes of an update, with `updated_at` set to the current time when
 * a trigger of the table does so (also for the updates of upserts).
 */
function withTriggers<Name extends TableName>(
  table: WritableTableDefinition<Name>,
  changes: Partial<Tables<Name>>,
): Partial<Tables<Name>> {
  return table.updatedAtTrigger
    ? { ...changes, updated_at: toDBString(Temporal.Now.instant()) }
    : changes
}

/**
 * The error of PostgreSQL when an upsert updates the same row twice, or a row
 * that the same request inserts.
 */
function cardinalityViolation(): Response {
  return HttpResponse.json(
    {
      code: '21000',
      details: null,
      hint: 'Ensure that no rows proposed for insertion within the same command have duplicate constrained values.',
      message: 'ON CONFLICT DO UPDATE command cannot affect row a second time',
    },
    { status: 400 },
  )
}

/** The changes that a write makes to a collection. */
interface WritePlan<Row> {
  inserts: Row[]
  updates: [record: Row, changes: Partial<Row>][]
}

/**
 * Apply the changes of a write to a collection as one transaction: when a
 * record does not match the schema of the collection, the changes made so
 * far are undone and an error is returned. The written records are returned
 * otherwise, updates first.
 */
async function applyWrite<Name extends TableName>(
  table: WritableTableDefinition<Name>,
  { inserts, updates }: WritePlan<Tables<Name>>,
): Promise<Tables<Name>[] | Response> {
  const { collection } = table
  const undo: (() => Promise<unknown>)[] = []
  const writtenRows: Tables<Name>[] = []

  try {
    for (const [record, changes] of updates) {
      const previous = { ...record }
      const updated = await collection.update(record, {
        data(draft) {
          Object.assign(draft, changes)
        },
      })

      if (updated) {
        undo.push(() =>
          collection.update(updated, {
            data(draft) {
              Object.assign(draft, previous)
            },
          }),
        )
        writtenRows.push(updated)
      }
    }

    for (const row of inserts) {
      const created = await collection.create(row)

      undo.push(async () => collection.delete(created))
      writtenRows.push(created)
    }
  } catch {
    for (const step of undo.toReversed()) {
      await step()
    }

    return HttpResponse.json(
      {
        code: '22P02',
        details: null,
        hint: null,
        message: `invalid input value for relation "${table.name}"`,
      },
      { status: 400 },
    )
  }

  return writtenRows
}

/**
 * The POST, PATCH and DELETE handlers of a table, which write to its
 * collection. Like PostgREST, a write changes nothing when it fails,
 * including when a single object is requested and the write would not
 * return exactly one row.
 */
function createWriteHandlers<Name extends TableName>(
  table: WritableTableDefinition<Name>,
) {
  const url = `${REST_URL}/${table.name}`
  const { collection } = table

  return [
    // Inserts, and upserts with `Prefer: resolution=merge-duplicates` or
    // `resolution=ignore-duplicates` on the columns of `on_conflict` (the
    // primary key without it)
    rest.post(url, async ({ request }) => {
      const query = parseWriteQuery(request)
      const prefer = request.headers.get('prefer') ?? ''
      const resolution = prefer.match(
        /resolution=(ignore|merge)-duplicates/,
      )?.[1]
      const conflictColumns =
        query.onConflict?.split(',').map((column) => column.trim()) ??
        PRIMARY_KEY_COLUMNS
      const body = (await request.json()) as
        | Partial<Tables<Name>>
        | Partial<Tables<Name>>[]
      const currentRows = collection.findMany()
      // The rows of the table after the write, and the rows that the write
      // inserts or updates, which an upsert cannot update again
      const nextRows: Tables<Name>[] = [...currentRows]
      const writtenRows = new Set<Tables<Name>>()
      // Every proposed row, with the defaults, is checked against the
      // `NOT NULL` columns before conflicts are resolved, as PostgreSQL does
      const proposedRows: Tables<Name>[] = []
      const plan: WritePlan<Tables<Name>> = { inserts: [], updates: [] }

      for (const values of Array.isArray(body) ? body : [body]) {
        // The `NOT NULL` columns are checked by `findViolation`.
        const proposed = { ...table.defaults(), ...values } as Tables<Name>

        proposedRows.push(proposed)

        const existing =
          resolution && findConflict(nextRows, values, conflictColumns)

        if (existing && resolution === 'ignore') {
          continue
        }

        if (existing) {
          if (writtenRows.has(existing)) {
            return cardinalityViolation()
          }

          const changes = withTriggers(table, values)
          const merged = { ...existing, ...changes }

          plan.updates.push([existing, changes])
          nextRows.splice(nextRows.indexOf(existing), 1, merged)
          writtenRows.add(merged)
        } else {
          plan.inserts.push(proposed)
          nextRows.push(proposed)
          writtenRows.add(proposed)
        }
      }

      const violation = findViolation(
        table,
        [...proposedRows, ...writtenRows],
        nextRows,
      )

      if (violation) {
        return violation
      }

      if (acceptsSingleObject(request) && writtenRows.size !== 1) {
        return singleObjectError(writtenRows.size)
      }

      const savedRows = await applyWrite(table, plan)

      if (savedRows instanceof Response) {
        return savedRows
      }

      if (returnsRepresentation(request)) {
        return HttpResponse.json(
          await applySelect(savedRows, query.select, table.name),
          { status: 201 },
        )
      }

      return new HttpResponse(null, { status: 201 })
    }),

    // Updates only the rows that match all the filters, such as
    // `id=in.(...)&visible=eq.false`
    rest.patch(url, async ({ request }) => {
      const query = parseWriteQuery(request)
      const changes = withTriggers(
        table,
        (await request.json()) as Partial<Tables<Name>>,
      )
      const currentRows = collection.findMany()
      const matches = applySupabaseConditions(currentRows, query)
      const changedRows = matches.map(
        (row): Tables<Name> => ({ ...row, ...changes }),
      )
      const violation = findViolation(table, changedRows, [
        ...currentRows.filter((row) => !matches.includes(row)),
        ...changedRows,
      ])

      if (violation) {
        return violation
      }

      if (acceptsSingleObject(request) && matches.length !== 1) {
        return singleObjectError(matches.length)
      }

      const updatedRows = await applyWrite(table, {
        inserts: [],
        updates: matches.map((record) => [record, changes]),
      })

      if (updatedRows instanceof Response) {
        return updatedRows
      }

      if (returnsRepresentation(request)) {
        return HttpResponse.json(
          await applySelect(updatedRows, query.select, table.name),
        )
      }

      return new HttpResponse(null, { status: 204 })
    }),

    // Deletes only the rows that match all the filters
    rest.delete(url, async ({ request }) => {
      const query = parseWriteQuery(request)
      const matches = applySupabaseConditions(collection.findMany(), query)

      if (acceptsSingleObject(request) && matches.length !== 1) {
        return singleObjectError(matches.length)
      }

      for (const record of matches) {
        collection.delete(record)
      }

      if (returnsRepresentation(request)) {
        return HttpResponse.json(
          await applySelect(matches, query.select, table.name),
        )
      }

      return new HttpResponse(null, { status: 204 })
    }),
  ]
}

/**
 * The handlers of a table at `/rest/v1/<name>`: GET and HEAD with filters,
 * ordering, pagination, embedded resources and exact counts, and POST,
 * PATCH and DELETE unless it is a view.
 */
export function createTableHandlers<Name extends TableName>(
  table: TableDefinition<Name>,
) {
  const url = `${REST_URL}/${table.name}`

  return [
    rest.get(url, async ({ request }) => {
      const { headers, page } = await readRows(table, request)

      return HttpResponse.json(page, { headers })
    }),
    rest.head(url, async ({ request }) => {
      const { headers } = await readRows(table, request)

      return new HttpResponse(null, { headers })
    }),
    ...(table.kind === 'table' ? createWriteHandlers(table) : []),
  ]
}
