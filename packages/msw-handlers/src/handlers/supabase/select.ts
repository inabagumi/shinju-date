import { PostgrestError, parseError } from './errors.js'
import { type Filter, filtersAt, getColumn, matchesFilters } from './query.js'
import {
  type AnyTableDefinition,
  findTable,
  getRows,
  type TableName,
} from './tables.js'

/**
 * A single entry of a PostgREST `select` parameter.
 *
 * - `column`: a plain column such as `id` or an aliased one such as `name:title`
 * - `relation`: an embedded resource such as `talent:talents!inner(id,name)`.
 *   `inner` is whether it is embedded with `!inner`, which leaves out the
 *   rows without a related row (that matches the filters of the resource)
 * - `wildcard`: `*`
 */
type SelectNode =
  | { kind: 'column'; alias: string; column: string }
  | {
      kind: 'relation'
      alias: string
      fields: SelectNode[]
      inner: boolean
      relation: string
    }
  | { kind: 'wildcard' }

/**
 * Split a select string on commas that are not nested inside parentheses.
 *
 * `thumbnail:thumbnails(id,path),talent:talents(id,name)` becomes
 * `['thumbnail:thumbnails(id,path)', 'talent:talents(id,name)']`.
 */
function splitSelectFields(selectStr: string): string[] {
  const fields: string[] = []
  let depth = 0
  let current = ''

  for (const char of selectStr) {
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (char === ',' && depth === 0) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)

  return fields.map((field) => field.trim()).filter((field) => field !== '')
}

/**
 * Parse a PostgREST `select` parameter into a tree of select nodes. The
 * forms that the mock does not support, such as spreads (`...talents(name)`),
 * aggregates (`count()`) and JSON paths (`data->name`), are errors.
 */
function parseSelect(selectStr: string): SelectNode[] {
  return splitSelectFields(selectStr).map((field): SelectNode => {
    if (field === '*') {
      return { kind: 'wildcard' }
    }

    // alias:relation!hint(fields) where alias and hints are optional
    const relationMatch = field.match(
      /^(?:(\w+):)?(\w+)((?:!\w+)*)\s*\(([\s\S]*)\)$/,
    )
    if (relationMatch) {
      const [, alias, relation = '', hints = '', nestedFields = ''] =
        relationMatch
      return {
        alias: alias ?? relation,
        fields: parseSelect(nestedFields),
        inner: hints.split('!').includes('inner'),
        kind: 'relation',
        relation,
      }
    }

    // alias:column::cast where alias and cast are optional
    const columnMatch = field.match(/^(?:(\w+):)?(\w+)(?:::\w+)?$/)

    if (!columnMatch) {
      throw parseError(
        `failed to parse select parameter (${selectStr})`,
        `unsupported field "${field}": the mock supports columns, aliases, casts and embedded resources`,
      )
    }

    const [, alias, column = field] = columnMatch
    return { alias: alias ?? column, column, kind: 'column' }
  })
}

/** The paths of the embedded resources of a select, such as `['talent']`. */
function getEmbeddedPaths(
  nodes: readonly SelectNode[],
  parent: readonly string[] = [],
): string[][] {
  return nodes.flatMap((node) => {
    if (node.kind !== 'relation') {
      return []
    }

    const path = [...parent, node.alias]

    return [path, ...getEmbeddedPaths(node.fields, path)]
  })
}

/**
 * Check that every filter on an embedded resource, such as
 * `talents.deleted_at=is.null`, names an embedded resource of the select
 * (`PGRST108` of PostgREST otherwise).
 */
function checkEmbeddedFilters(
  nodes: readonly SelectNode[],
  filters: readonly Filter[],
): void {
  const paths = new Set(
    getEmbeddedPaths(nodes).map((path) => JSON.stringify(path)),
  )

  for (const { path } of filters) {
    if (path.length > 0 && !paths.has(JSON.stringify(path))) {
      const name = path.join('.')

      throw new PostgrestError(400, {
        code: 'PGRST108',
        hint: `Verify that '${name}' is included in the 'select' query parameter.`,
        message: `'${name}' is not an embedded resource in this request`,
      })
    }
  }
}

/**
 * The relation of a table to an embedded resource, and the table it refers
 * to. A relation that the table does not define is an error (`PGRST200` of
 * PostgREST).
 */
function findRelation(
  table: AnyTableDefinition | undefined,
  relationName: string,
) {
  const relation = table?.relations.find(({ table }) => table === relationName)
  const target = relation && findTable(relation.table)

  if (!relation || !target) {
    throw new PostgrestError(400, {
      code: 'PGRST200',
      details: `Searched for a foreign key relationship between '${table?.name}' and '${relationName}' in the schema 'public', but no matches were found.`,
      hint: 'Add the relation to the table definition of the mock (src/handlers/supabase/tables.ts).',
      message: `Could not find a relationship between '${table?.name}' and '${relationName}' in the schema cache`,
    })
  }

  return { relation, target }
}

/** Check that every embedded resource of a select has a relation. */
function checkRelations(
  nodes: readonly SelectNode[],
  table: AnyTableDefinition | undefined,
): void {
  for (const node of nodes) {
    if (node.kind === 'relation') {
      checkRelations(node.fields, findRelation(table, node.relation).target)
    }
  }
}

/**
 * Check a select and the filters on its embedded resources without reading
 * any rows, and throw the error of PostgREST for what is not supported. A
 * write checks them before it changes anything, as PostgREST does.
 */
export function validateSelect(
  selectStr: string,
  tableName: TableName,
  filters: readonly Filter[] = [],
): SelectNode[] {
  const nodes = parseSelect(selectStr)

  checkEmbeddedFilters(nodes, filters)
  checkRelations(nodes, findTable(tableName))

  return nodes
}

/** The rows of an embedded resource that match its filters. */
async function resolveRelation(
  table: AnyTableDefinition | undefined,
  relationName: string,
  row: object,
  filters: readonly Filter[],
): Promise<{ rows: object[]; table: AnyTableDefinition; many: boolean }> {
  const { relation, target } = findRelation(table, relationName)
  const value = getColumn(row, relation.column)
  const related =
    value == null
      ? []
      : (await getRows(target)).filter(
          (relatedRow) =>
            getColumn(relatedRow, relation.referencedColumn) === value &&
            matchesFilters(relatedRow, filters),
        )

  return { many: relation.many, rows: related, table: target }
}

/**
 * Project a single row according to parsed select nodes, resolving
 * embedded resources recursively. `null` when an embedded resource with
 * `!inner` has no rows, which leaves the row out.
 */
async function projectRow(
  row: object,
  nodes: readonly SelectNode[],
  table: AnyTableDefinition | undefined,
  filters: readonly Filter[],
  path: readonly string[],
): Promise<Record<string, unknown> | null> {
  const result: Record<string, unknown> = {}

  for (const node of nodes) {
    if (node.kind === 'wildcard') {
      Object.assign(result, row)
    } else if (node.kind === 'column') {
      if (node.column in row) {
        result[node.alias] = getColumn(row, node.column)
      }
    } else {
      const relationPath = [...path, node.alias]
      const related = await resolveRelation(
        table,
        node.relation,
        row,
        filtersAt(filters, relationPath),
      )
      const projected: Record<string, unknown>[] = []

      for (const relatedRow of related.rows) {
        const output = await projectRow(
          relatedRow,
          node.fields,
          related.table,
          filters,
          relationPath,
        )

        if (output) {
          projected.push(output)
        }
      }

      if (node.inner && projected.length === 0) {
        return null
      }

      result[node.alias] = related.many ? projected : (projected[0] ?? null)
    }
  }

  return result
}

/** A row of a table and what the select of a query returns for it. */
export interface SelectedRow<Row extends object = object> {
  output: object
  row: Row
}

/**
 * Handle Supabase select projection of the rows of a table, including nested
 * embedded resources such as `talent:talents(id,name)` or
 * `twitch_video:twitch_videos(type,twitch_user:twitch_users(twitch_user_id))`.
 *
 * The filters on embedded resources (such as `talent.deleted_at=is.null`)
 * narrow down the embedded rows, and the rows without a related row of an
 * embedded resource with `!inner` are left out. The filters on the rows of
 * the table itself have to be applied before.
 */
export async function selectRows<Row extends object>(
  rows: readonly Row[],
  selectStr: string,
  tableName: TableName,
  filters: readonly Filter[] = [],
): Promise<SelectedRow<Row>[]> {
  const nodes = validateSelect(selectStr, tableName, filters)

  if (selectStr === '*') {
    return rows.map((row) => ({ output: row, row }))
  }

  const table = findTable(tableName)
  const selected: SelectedRow<Row>[] = []

  for (const row of rows) {
    const output = await projectRow(row, nodes, table, filters, [])

    if (output) {
      selected.push({ output, row })
    }
  }

  return selected
}

/**
 * The outputs of `selectRows`, for the rows that a write returns or the
 * rows of a database function.
 */
export async function applySelect(
  rows: readonly object[],
  selectStr: string,
  tableName: TableName,
  filters: readonly Filter[] = [],
): Promise<object[]> {
  return (await selectRows(rows, selectStr, tableName, filters)).map(
    ({ output }) => output,
  )
}
