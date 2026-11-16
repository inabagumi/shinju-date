/**
 * Parsing of the query parameters of PostgREST (`/rest/v1/*`) and the
 * filters, ordering and pagination that they describe.
 */

/** The parameters that are not filters. */
const RESERVED_PARAMETERS = new Set([
  'columns',
  'limit',
  'offset',
  'on_conflict',
  'order',
  'prefer',
  'select',
])

export interface SupabaseQuery {
  /**
   * Every filter in the order of the query, such as `['id', 'eq.1']`. A
   * column can appear more than once, so a range such as
   * `published_at=gte.X&published_at=lt.Y` applies both ends.
   */
  conditions: [column: string, filter: string][]
  limit: string | null
  offset: string | null
  /** The columns of `on_conflict`, for an upsert. */
  onConflict: string | null
  order: string | null
  /** Whether `prefer=count=exact` is given as a query parameter. */
  returnCount: boolean
  select: string
}

/**
 * Parse Supabase REST API query parameters
 */
export function parseSupabaseQuery(url: URL): SupabaseQuery {
  const select = url.searchParams.get('select') || '*'
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')
  // Prefer header is preferred for count, but also check query param
  const prefer = url.searchParams.get('prefer') || ''
  const returnCount = prefer.includes('count=exact')
  const order = url.searchParams.get('order')
  const onConflict = url.searchParams.get('on_conflict')
  const conditions: [column: string, filter: string][] = []

  for (const [key, value] of url.searchParams.entries()) {
    if (RESERVED_PARAMETERS.has(key)) {
      continue
    }

    // Handle Supabase query syntax like id.in.(1,2) where the filter is in the key
    if (key.includes('.')) {
      const [column, ...operator] = key.split('.')

      if (column) {
        conditions.push([
          column,
          operator.join('.') + (value ? `.${value}` : ''),
        ])
      }
    } else {
      conditions.push([key, value])
    }
  }

  return { conditions, limit, offset, onConflict, order, returnCount, select }
}

/** The value of a column of a row. */
export function getColumn(row: object, column: string): unknown {
  return (row as Record<string, unknown>)[column]
}

/**
 * Compare a value of a row with the value of a filter: as instants when both
 * are timestamps, as numbers when both are numbers, and as strings otherwise.
 */
function compareFilterValue(itemValue: unknown, filterValue: string): number {
  if (typeof itemValue === 'number' && !Number.isNaN(Number(filterValue))) {
    return itemValue - Number(filterValue)
  }

  const itemText = String(itemValue)

  try {
    return Temporal.Instant.compare(
      Temporal.Instant.from(itemText),
      Temporal.Instant.from(filterValue),
    )
  } catch {
    return itemText < filterValue ? -1 : itemText > filterValue ? 1 : 0
  }
}

const COMPARISON_OPERATORS = {
  gt: (result: number) => result > 0,
  gte: (result: number) => result >= 0,
  lt: (result: number) => result < 0,
  lte: (result: number) => result <= 0,
} as const

/**
 * Parse the value of a filter as PostgREST does for `eq`: booleans, `null`
 * and numbers become those values, and anything else stays a string.
 */
function parseFilterValue(value: string): boolean | number | string | null {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  if (value === 'null') {
    return null
  }

  return Number.isNaN(Number(value)) ? value : Number(value)
}

/**
 * Whether a row matches a single filter, such as `eq.1` or `in.(1,2)`.
 * Filters that are not supported match every row.
 */
function matchesFilter(row: object, column: string, filter: string): boolean {
  const value = getColumn(row, column)
  const [operator = '', ...rest] = filter.split('.')
  const operand = rest.join('.')

  if (operator in COMPARISON_OPERATORS) {
    // Handle range filters (e.g., published_at=gte.2026-11-09T15:00:00Z)
    const matches =
      COMPARISON_OPERATORS[operator as keyof typeof COMPARISON_OPERATORS]

    return value != null && matches(compareFilterValue(value, operand))
  }

  switch (operator) {
    case 'neq':
      // Handle not equals filter (e.g., video_kind=neq.short). As in SQL,
      // `NULL <> value` is not true, so rows with `null` do not match.
      return value != null && String(value) !== operand
    case 'eq':
      // Handle equals filter (e.g., visible=eq.true). Text columns may hold
      // digits only (e.g. twitch_user_id), so the raw string is accepted as
      // well.
      return value === parseFilterValue(operand) || value === operand
    case 'ilike': {
      // Handle case-insensitive pattern filter (e.g., login=ilike.alice*)
      const source = operand
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/[*%]/g, '.*')
        .replace(/_/g, '.')

      return (
        typeof value === 'string' && new RegExp(`^${source}$`, 'i').test(value)
      )
    }
    case 'is':
      // Handle is filter (e.g., deleted_at=is.null)
      return operand !== 'null' || value === null
    case 'not':
      // Handle not is filter (e.g., deleted_at=not.is.null)
      return operand !== 'is.null' || value !== null
    case 'in': {
      // Handle in filter (e.g., id=in.(1,2,3))
      if (!operand.startsWith('(') || !operand.endsWith(')')) {
        return true
      }

      const rawValues = operand
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())

      return rawValues.some(
        (item) =>
          value === item ||
          (!Number.isNaN(Number(item)) && value === Number(item)),
      )
    }
    default:
      return true
  }
}

/**
 * Apply the filters of a query, without pagination. Only the rows that match
 * all the filters are returned, as PostgREST combines them with AND. The rows
 * that match are what an exact count counts, and what an update or a delete
 * changes.
 */
export function applySupabaseConditions<Row extends object>(
  rows: readonly Row[],
  query: SupabaseQuery,
): Row[] {
  return rows.filter((row) =>
    query.conditions.every(([column, filter]) =>
      matchesFilter(row, column, filter),
    ),
  )
}

/**
 * Sort the rows by the `order` parameter of PostgREST, such as
 * `published_at.asc,id.desc`. `null` comes last in ascending order and first
 * in descending order unless `nullsfirst` or `nullslast` is given.
 */
export function applyOrder<Row extends object>(
  rows: readonly Row[],
  order: string | null,
): Row[] {
  if (!order) {
    return [...rows]
  }

  const keys = order.split(',').map((entry) => {
    const [column = '', ...modifiers] = entry.trim().split('.')
    const descending = modifiers.includes('desc')
    const nullsFirst = modifiers.includes('nullsfirst')
      ? true
      : modifiers.includes('nullslast')
        ? false
        : descending

    return { column, descending, nullsFirst }
  })

  return rows.toSorted((a, b) => {
    for (const { column, descending, nullsFirst } of keys) {
      const valueA = getColumn(a, column)
      const valueB = getColumn(b, column)

      if (valueA == null || valueB == null) {
        if (valueA == null && valueB == null) {
          continue
        }

        return (valueA == null) === nullsFirst ? -1 : 1
      }

      const result = compareFilterValue(valueA, String(valueB))

      if (result !== 0) {
        return descending ? -result : result
      }
    }

    return 0
  })
}

/** The offset of a query, which is 0 without one. */
export function getOffset(query: SupabaseQuery): number {
  return query.offset ? parseInt(query.offset, 10) : 0
}

/**
 * Apply the offset and limit of a query.
 */
export function applyPagination<Row>(
  rows: readonly Row[],
  query: SupabaseQuery,
): Row[] {
  // Apply offset before limit to match PostgREST pagination semantics
  const start = getOffset(query)

  return query.limit
    ? rows.slice(start, start + parseInt(query.limit, 10))
    : rows.slice(start)
}

/**
 * The `Content-Range` header of PostgREST, such as `0-2/63`: the range of the
 * returned rows (`*` when there are none) and the number of all the rows
 * that match (`*` when the count is not requested).
 */
export function formatContentRange(
  offset: number,
  length: number,
  count: number | '*',
): string {
  const range = length > 0 ? `${offset}-${offset + length - 1}` : '*'

  return `${range}/${count}`
}
