import { getColumn } from './query.js'
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
 * - `relation`: an embedded resource such as `talent:talents!inner(id,name)`
 * - `wildcard`: `*`
 */
type SelectNode =
  | { kind: 'column'; alias: string; column: string }
  | { kind: 'relation'; alias: string; fields: SelectNode[]; relation: string }
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
 * Parse a PostgREST `select` parameter into a tree of select nodes.
 */
function parseSelect(selectStr: string): SelectNode[] {
  return splitSelectFields(selectStr).map((field): SelectNode => {
    if (field === '*') {
      return { kind: 'wildcard' }
    }

    // alias:relation!hint(fields) where alias and hint are optional
    const relationMatch = field.match(
      /^(?:(\w+):)?(\w+)(?:!\w+)*\s*\(([\s\S]*)\)$/,
    )
    if (relationMatch) {
      const [, alias, relation = '', nestedFields = ''] = relationMatch
      return {
        alias: alias ?? relation,
        fields: parseSelect(nestedFields),
        kind: 'relation',
        relation,
      }
    }

    // alias:column::cast where alias and cast are optional
    const columnMatch = field.match(/^(?:(\w+):)?(\w+)(?:::\w+)?$/)
    const [, alias, column = field] = columnMatch ?? []
    return { alias: alias ?? column, column, kind: 'column' }
  })
}

/** The rows of an embedded resource, and the table they come from. */
interface RelatedRows {
  rows: object | object[] | null
  table: AnyTableDefinition | undefined
}

/**
 * Resolve an embedded resource of a row from the relations of its table.
 * Relations that the table does not define embed `null`.
 */
async function resolveRelation(
  table: AnyTableDefinition | undefined,
  relationName: string,
  row: object,
): Promise<RelatedRows> {
  const relation = table?.relations.find(({ table }) => table === relationName)
  const target = relation && findTable(relation.table)

  if (!relation || !target) {
    return { rows: null, table: undefined }
  }

  const value = getColumn(row, relation.column)
  const related =
    value == null
      ? []
      : (await getRows(target)).filter(
          (relatedRow) =>
            getColumn(relatedRow, relation.referencedColumn) === value,
        )

  return {
    rows: relation.many ? related : (related[0] ?? null),
    table: target,
  }
}

/**
 * Project a single row according to parsed select nodes, resolving
 * embedded resources recursively.
 */
async function projectRow(
  row: object,
  nodes: SelectNode[],
  table: AnyTableDefinition | undefined,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}

  for (const node of nodes) {
    if (node.kind === 'wildcard') {
      Object.assign(result, row)
    } else if (node.kind === 'column') {
      if (node.column in row) {
        result[node.alias] = getColumn(row, node.column)
      }
    } else {
      const related = await resolveRelation(table, node.relation, row)

      if (Array.isArray(related.rows)) {
        result[node.alias] = await Promise.all(
          related.rows.map((relatedRow) =>
            projectRow(relatedRow, node.fields, related.table),
          ),
        )
      } else if (related.rows) {
        result[node.alias] = await projectRow(
          related.rows,
          node.fields,
          related.table,
        )
      } else {
        result[node.alias] = null
      }
    }
  }

  return result
}

/**
 * Handle Supabase select projection of the rows of a table, including nested
 * embedded resources such as `talent:talents(id,name)` or
 * `twitch_video:twitch_videos(type,twitch_user:twitch_users(twitch_login_name))`.
 */
export async function applySelect(
  rows: readonly object[],
  selectStr: string,
  tableName: TableName,
): Promise<object[]> {
  if (selectStr === '*') {
    return [...rows]
  }

  const nodes = parseSelect(selectStr)
  const table = findTable(tableName)

  return await Promise.all(rows.map((row) => projectRow(row, nodes, table)))
}
