/**
 * Parsing of the query parameters of PostgREST (`/rest/v1/*`) and the
 * filters, ordering and pagination that they describe.
 *
 * A filter that the mock does not support is not ignored: parsing it throws
 * a `PostgrestError` (`PGRST100`), so that a query does not silently get a
 * result that differs from PostgREST.
 */

import { PostgrestError, parseError } from './errors.js'

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

/** The operators of the filters that the mock supports. */
export const SUPPORTED_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'match',
  'imatch',
  'in',
  'is',
  'isdistinct',
] as const

export type FilterOperator = (typeof SUPPORTED_OPERATORS)[number]

/**
 * A column, optionally followed by a JSON path such as `readings->0` or
 * `data->>name` (keys and array indexes).
 */
// A key starts with a letter or `_` and an index with a digit or `-`, so the
// two do not overlap and the pattern does not backtrack exponentially.
const COLUMN_PATTERN = /^[A-Za-z_]\w*(?:->>?(?:-?\d+|[A-Za-z_]\w*))*$/

/** The values that `is` accepts. */
const IS_VALUES = new Set(['false', 'not_null', 'null', 'true', 'unknown'])

/** A condition on a column, such as `deleted_at=not.is.null`. */
export interface FilterCondition {
  column: string
  kind: 'condition'
  negated: boolean
  operand: string
  operator: FilterOperator
}

/** A logical operator, such as `or=(a.eq.1,b.eq.2)`. */
export interface FilterGroup {
  children: FilterExpression[]
  kind: 'and' | 'or'
  negated: boolean
}

export type FilterExpression = FilterCondition | FilterGroup

/**
 * A filter of a query. `path` is the embedded resource that it applies to,
 * such as `['talent']` for `talent.deleted_at=is.null`, and is empty for the
 * rows of the table itself.
 */
export interface Filter {
  expression: FilterExpression
  path: readonly string[]
}

export interface SupabaseQuery {
  /**
   * Every filter in the order of the query. A column can appear more than
   * once, so a range such as `published_at=gte.X&published_at=lt.Y` applies
   * both ends.
   */
  filters: Filter[]
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
 * Split a list on the commas that are outside parentheses and double quotes,
 * such as the conditions of `or=(a.eq.1,b.in.(2,3))`.
 */
function splitTopLevel(list: string): string[] {
  const items: string[] = []
  let current = ''
  let depth = 0
  let escaped = false
  let inQuotes = false

  for (const char of list) {
    if (escaped) {
      escaped = false
    } else if (inQuotes && char === '\\') {
      escaped = true
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes && char === '(') {
      depth += 1
    } else if (!inQuotes && char === ')') {
      depth -= 1
    } else if (!inQuotes && depth === 0 && char === ',') {
      items.push(current)
      current = ''
      continue
    }

    current += char
  }
  items.push(current)

  return items
}

/**
 * Parse the value of a condition, such as `not.is.null` or `in.(1,2)`, for
 * `column`. `source` is the whole filter for the error messages.
 */
function parseCondition(
  column: string,
  value: string,
  source: string,
): FilterCondition {
  let negated = false
  let rest = value

  if (rest.startsWith('not.')) {
    negated = true
    rest = rest.slice('not.'.length)
  }

  const dot = rest.indexOf('.')
  const operator = dot === -1 ? rest : rest.slice(0, dot)
  const operand = dot === -1 ? '' : rest.slice(dot + 1)

  if (!COLUMN_PATTERN.test(column)) {
    throw parseError(
      `failed to parse filter (${source})`,
      `unsupported column "${column}": the mock supports columns and JSON paths such as data->items->0 or data->>name`,
    )
  }

  if (!(SUPPORTED_OPERATORS as readonly string[]).includes(operator)) {
    throw parseError(
      `unsupported operator "${operator}" in the filter (${source})`,
      `The mock supports: ${SUPPORTED_OPERATORS.join(', ')} (and "not." before them)`,
    )
  }

  if (dot === -1) {
    throw parseError(
      `failed to parse filter (${source})`,
      `the operator "${operator}" has no value`,
    )
  }

  if (operator === 'in' && !/^\(.*\)$/s.test(operand)) {
    throw parseError(
      `failed to parse filter (${source})`,
      'the value of "in" has to be a list in parentheses, such as in.(1,2)',
    )
  }

  if (operator === 'is' && !IS_VALUES.has(operand.toLowerCase())) {
    throw parseError(
      `failed to parse filter (${source})`,
      `the value of "is" has to be one of: ${[...IS_VALUES].join(', ')}`,
    )
  }

  return {
    column,
    kind: 'condition',
    negated,
    operand,
    operator: operator as FilterOperator,
  }
}

/**
 * Parse the conditions of a logical operator, such as
 * `(deleted_at.is.null,deleted_at.gte.2026-01-01T00:00:00Z)`.
 */
function parseGroup(
  kind: 'and' | 'or',
  negated: boolean,
  value: string,
  source: string,
): FilterGroup {
  if (!value.startsWith('(') || !value.endsWith(')')) {
    throw parseError(
      `failed to parse logic tree (${source})`,
      `the value of "${kind}" has to be a list in parentheses, such as ${kind}=(a.eq.1,b.eq.2)`,
    )
  }

  const children = splitTopLevel(value.slice(1, -1)).map(
    (item): FilterExpression => {
      const text = item.trim()
      const group = text.match(/^(not\.)?(and|or)(\(.*\))$/s)

      if (group) {
        const [, not, childKind, childValue = ''] = group

        return parseGroup(
          childKind as 'and' | 'or',
          not !== undefined,
          childValue,
          source,
        )
      }

      const dot = text.indexOf('.')

      if (dot === -1) {
        throw parseError(
          `failed to parse logic tree (${source})`,
          `"${text}" is not a condition such as column.eq.value`,
        )
      }

      const condition = parseCondition(
        text.slice(0, dot),
        text.slice(dot + 1),
        source,
      )

      // In a logic tree, a value with commas or parentheses is quoted.
      return condition.operator === 'in'
        ? condition
        : { ...condition, operand: unquote(condition.operand) }
    },
  )

  return { children, kind, negated }
}

/**
 * Parse a filter of the query string, such as `deleted_at=is.null`,
 * `talents.deleted_at=not.is.null` (an embedded resource) or
 * `or=(a.eq.1,b.eq.2)`.
 */
function parseFilter(key: string, value: string): Filter {
  const source = `${key}=${value}`
  const segments = key.split('.')
  const last = segments.at(-1) ?? ''

  if (last === 'and' || last === 'or') {
    const negated = segments.at(-2) === 'not'
    const path = segments.slice(0, negated ? -2 : -1)

    return { expression: parseGroup(last, negated, value, source), path }
  }

  return {
    expression: parseCondition(last, value, source),
    path: segments.slice(0, -1),
  }
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
  const filters: Filter[] = []

  for (const [key, value] of url.searchParams.entries()) {
    if (!RESERVED_PARAMETERS.has(key)) {
      filters.push(parseFilter(key, value))
    }
  }

  return { filters, limit, offset, onConflict, order, returnCount, select }
}

/** The value of a column of a row. */
export function getColumn(row: object, column: string): unknown {
  return (row as Record<string, unknown>)[column]
}

/**
 * The value of a column of a row, or of a JSON path in it such as
 * `readings->0` (JSON) or `data->>name` (text), like PostgreSQL: a key or an
 * index that does not exist is `NULL`.
 */
export function getColumnPath(row: object, path: string): unknown {
  const [column = '', ...steps] = path.split(/(?=->)/)
  let value = getColumn(row, column)

  for (const step of steps) {
    const asText = step.startsWith('->>')
    const key = step.slice(asText ? 3 : 2)

    if (Array.isArray(value) && /^-?\d+$/.test(key)) {
      value = value.at(Number(key))
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      value = (value as Record<string, unknown>)[key]
    } else {
      value = undefined
    }

    value ??= null

    if (asText && value !== null) {
      value = typeof value === 'object' ? JSON.stringify(value) : String(value)
    }
  }

  return value
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
 * Whether the value of a column equals the value of a filter. Text columns
 * may hold digits only (e.g. twitch_user_id), so the raw string is accepted
 * as well.
 */
function matchesValue(value: unknown, text: string): boolean {
  return value === parseFilterValue(text) || value === text
}

/**
 * Whether the value of a `uuid` column equals the value of a filter. The
 * `uuid` type of PostgreSQL does not distinguish upper and lower case, so
 * `id=eq.0F6B7C84-…` matches `0f6b7c84-…`.
 */
function matchesUuid(value: unknown, text: string): boolean {
  return typeof value === 'string' && value.toLowerCase() === text.toLowerCase()
}

/**
 * Remove the double quotes around a value of a list or a logic tree, such as
 * `"a,b"`, with `\"` and `\\` unescaped. Values without quotes are trimmed.
 */
function unquote(text: string): string {
  const trimmed = text.trim()

  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return trimmed
  }

  return trimmed.slice(1, -1).replace(/\\(.)/g, '$1')
}

/**
 * Split the values of a list such as `in.(a,"b,c")` on commas outside double
 * quotes, like PostgREST does. The quotes only keep commas (and spaces) in a
 * value; the value is compared like the others. An empty list has no values.
 */
function parseListValues(list: string): string[] {
  if (list.trim() === '') {
    return []
  }

  return splitTopLevel(list).map(unquote)
}

/**
 * A regular expression for a pattern of `like` and `ilike`, where `*` (or
 * `%`) matches any characters and `_` matches one.
 */
function likePattern(pattern: string, flags: string): RegExp {
  const source = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[*%]/g, '.*')
    .replace(/_/g, '.')

  return new RegExp(`^${source}$`, `s${flags}`)
}

/** A regular expression for `match` and `imatch`. */
function toRegExp(pattern: string, flags: string): RegExp {
  try {
    return new RegExp(pattern, flags)
  } catch {
    throw new PostgrestError(400, {
      code: '2201B',
      message: `invalid regular expression: ${pattern}`,
    })
  }
}

/**
 * The result of a condition as in SQL: `null` (unknown) when a comparison
 * involves `NULL`, which neither `not` nor the result of the query turns into
 * a match. `uuidColumns` are the columns of the `uuid` type of the table,
 * whose values `eq`, `neq`, `in` and `isdistinct` compare regardless of case.
 */
function evaluateCondition(
  row: object,
  { column, operand, operator }: FilterCondition,
  uuidColumns: readonly string[],
): boolean | null {
  const value = getColumnPath(row, column) ?? null
  const matches = uuidColumns.includes(column) ? matchesUuid : matchesValue

  switch (operator) {
    case 'is': {
      const expected = operand.toLowerCase()

      if (expected === 'null' || expected === 'unknown') {
        return value === null
      }

      if (expected === 'not_null') {
        return value !== null
      }

      return value === (expected === 'true')
    }
    case 'isdistinct': {
      const expected = parseFilterValue(operand)

      return value === null || expected === null
        ? value !== expected
        : !matches(value, operand)
    }
    default:
      break
  }

  if (value === null) {
    return null
  }

  switch (operator) {
    case 'eq':
      return matches(value, operand)
    case 'neq':
      return !matches(value, operand)
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return COMPARISON_OPERATORS[operator](compareFilterValue(value, operand))
    case 'like':
    case 'ilike':
      return likePattern(operand, operator === 'ilike' ? 'i' : '').test(
        String(value),
      )
    case 'match':
    case 'imatch':
      return toRegExp(operand, operator === 'imatch' ? 'i' : '').test(
        String(value),
      )
    case 'in':
      return parseListValues(operand.slice(1, -1)).some((text) =>
        matches(value, text),
      )
  }
}

/** `NOT` of three-valued logic, which keeps unknown as it is. */
function not(result: boolean | null): boolean | null {
  return result === null ? null : !result
}

/**
 * The result of an expression for a row, in three-valued logic like SQL.
 */
function evaluate(
  row: object,
  expression: FilterExpression,
  uuidColumns: readonly string[],
): boolean | null {
  if (expression.kind === 'condition') {
    const result = evaluateCondition(row, expression, uuidColumns)

    return expression.negated ? not(result) : result
  }

  const results = expression.children.map((child) =>
    evaluate(row, child, uuidColumns),
  )
  // A false condition decides AND, and a true one decides OR.
  const decisive = expression.kind === 'or'
  const result = results.includes(decisive)
    ? decisive
    : results.includes(null)
      ? null
      : !decisive

  return expression.negated ? not(result) : result
}

/**
 * Whether a row matches all the given filters, as PostgREST combines them
 * with AND. A filter whose result is unknown (`NULL`) does not match.
 * `uuidColumns` are the columns of the `uuid` type of the table of the row.
 */
export function matchesFilters(
  row: object,
  filters: readonly Filter[],
  uuidColumns: readonly string[],
): boolean {
  return filters.every(
    ({ expression }) => evaluate(row, expression, uuidColumns) === true,
  )
}

/** The filters of a query that apply to an embedded resource at `path`. */
export function filtersAt(
  filters: readonly Filter[],
  path: readonly string[],
): Filter[] {
  return filters.filter(
    (filter) =>
      filter.path.length === path.length &&
      filter.path.every((segment, index) => segment === path[index]),
  )
}

/**
 * Apply the filters of a query on the rows of the table itself (not on its
 * embedded resources), without pagination. Only the rows that match all the
 * filters are returned. The rows that match are what an update or a delete
 * changes. `uuidColumns` are the columns of the `uuid` type of the table.
 */
export function applySupabaseConditions<Row extends object>(
  rows: readonly Row[],
  query: SupabaseQuery,
  uuidColumns: readonly string[],
): Row[] {
  const filters = filtersAt(query.filters, [])

  return rows.filter((row) => matchesFilters(row, filters, uuidColumns))
}

/**
 * Parse the `order` parameter of PostgREST, such as
 * `published_at.asc,id.desc`. Ordering by the columns of an embedded
 * resource, such as `talent(name).asc`, is not supported.
 */
function parseOrder(order: string) {
  return order.split(',').map((entry) => {
    const [column = '', ...modifiers] = entry.trim().split('.')

    if (
      !COLUMN_PATTERN.test(column) ||
      modifiers.some(
        (modifier) =>
          !['asc', 'desc', 'nullsfirst', 'nullslast'].includes(modifier),
      )
    ) {
      throw parseError(
        `failed to parse order (${order})`,
        'The mock supports the columns of the table (and JSON paths in them), followed by asc, desc, nullsfirst or nullslast',
      )
    }

    const descending = modifiers.includes('desc')
    const nullsFirst = modifiers.includes('nullsfirst')
      ? true
      : modifiers.includes('nullslast')
        ? false
        : descending

    return { column, descending, nullsFirst }
  })
}

/**
 * Sort the rows by the `order` parameter of PostgREST, such as
 * `published_at.asc,id.desc`. `null` comes last in ascending order and first
 * in descending order unless `nullsfirst` or `nullslast` is given. `getRow`
 * gives the row of the table of each item.
 */
export function applyOrder<Item>(
  items: readonly Item[],
  order: string | null,
  getRow: (item: Item) => object = (item) => item as object,
): Item[] {
  if (!order) {
    return [...items]
  }

  const keys = parseOrder(order)

  return items.toSorted((itemA, itemB) => {
    const a = getRow(itemA)
    const b = getRow(itemB)

    for (const { column, descending, nullsFirst } of keys) {
      const valueA = getColumnPath(a, column)
      const valueB = getColumnPath(b, column)

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
