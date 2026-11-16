import type { Tables } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { HttpResponse } from 'msw'
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
import { REST_URL, rest } from './rest.js'
import { applySelect } from './select.js'
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
 * The rows that a read returns, and the number of all the rows that match
 * the filters before the pagination, which an exact count returns.
 */
async function readRows<Name extends TableName>(
  table: TableDefinition<Name>,
  request: Request,
): Promise<{
  headers: Record<string, string>
  page: Tables<Name>[]
  query: SupabaseQuery
}> {
  const query = parseSupabaseQuery(new URL(request.url))
  const matched = applyOrder(
    applySupabaseConditions(await getRows(table), query),
    query.order,
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
    page,
    query,
  }
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
    for (const column of table.requiredColumns) {
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
 * a trigger of the table does so.
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
 * The POST, PATCH and DELETE handlers of a table, which write to its
 * collection. Like PostgREST, a write changes nothing when it fails.
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
      const query = parseSupabaseQuery(new URL(request.url))
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
      let nextRows = [...currentRows]
      const inserts: Tables<Name>[] = []
      const merges: [record: Tables<Name>, values: Partial<Tables<Name>>][] = []

      for (const values of Array.isArray(body) ? body : [body]) {
        const existing =
          resolution && findConflict(currentRows, values, conflictColumns)

        if (existing && resolution === 'ignore') {
          continue
        }

        if (existing) {
          merges.push([existing, values])
          nextRows = nextRows.map((row) =>
            row === existing ? { ...existing, ...values } : row,
          )
        } else {
          // The required columns are checked by `findViolation`.
          const row = { ...table.defaults(), ...values } as Tables<Name>

          inserts.push(row)
          nextRows.push(row)
        }
      }

      const violation = findViolation(
        table,
        nextRows.filter((row) => !currentRows.includes(row)),
        nextRows,
      )

      if (violation) {
        return violation
      }

      const savedRows: Tables<Name>[] = []

      for (const [record, values] of merges) {
        const updated = await collection.update(record, {
          data(draft) {
            Object.assign(draft, values)
          },
        })

        if (updated) {
          savedRows.push(updated)
        }
      }

      for (const row of inserts) {
        savedRows.push(await collection.create(row))
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
      const query = parseSupabaseQuery(new URL(request.url))
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

      const updatedRows: Tables<Name>[] = []

      for (const record of matches) {
        const updated = await collection.update(record, {
          data(draft) {
            Object.assign(draft, changes)
          },
        })

        if (updated) {
          updatedRows.push(updated)
        }
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
      const query = parseSupabaseQuery(new URL(request.url))
      const matches = applySupabaseConditions(collection.findMany(), query)

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
      const { headers, page, query } = await readRows(table, request)

      return HttpResponse.json(
        await applySelect(page, query.select, table.name),
        { headers },
      )
    }),
    rest.head(url, async ({ request }) => {
      const { headers } = await readRows(table, request)

      return new HttpResponse(null, { headers })
    }),
    ...(table.kind === 'table' ? createWriteHandlers(table) : []),
  ]
}
