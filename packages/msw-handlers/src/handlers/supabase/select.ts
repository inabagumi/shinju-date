import { PostgrestError, parseError } from "./errors.js";
import { filtersAt, getColumn, matchesFilters } from "./query.js";
import type { Filter } from "./query.js";
import { findTable, getRows } from "./tables.js";
import type { AnyTableDefinition, TableName } from "./tables.js";

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
  | { kind: "column"; alias: string; column: string }
  | {
      kind: "relation";
      alias: string;
      fields: SelectNode[];
      inner: boolean;
      relation: string;
    }
  | { kind: "wildcard" };

/**
 * Split a select string on commas that are not nested inside parentheses.
 *
 * `thumbnail:thumbnails(id,path),talent:talents(id,name)` becomes
 * `['thumbnail:thumbnails(id,path)', 'talent:talents(id,name)']`.
 */
const splitSelectFields = (selectStr: string): string[] => {
  const fields: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of selectStr) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (char === "," && depth === 0) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields.map((field) => field.trim()).filter((field) => field !== "");
};

/**
 * Parse a PostgREST `select` parameter into a tree of select nodes. The
 * forms that the mock does not support, such as spreads (`...talents(name)`),
 * aggregates (`count()`) and JSON paths (`data->name`), are errors.
 */
const parseSelect = (selectStr: string): SelectNode[] =>
  splitSelectFields(selectStr).map((field): SelectNode => {
    if (field === "*") {
      return { kind: "wildcard" };
    }

    // alias:relation!hint(fields) where alias and hints are optional
    const relationMatch = field.match(
      /^(?:(?<alias>\w+):)?(?<relation>\w+)(?<hints>(?:!\w+)*)\s*\((?<nestedFields>[\s\S]*)\)$/u
    );
    if (relationMatch) {
      const relationGroups: Record<string, string | undefined> =
        relationMatch.groups ?? {};
      const {
        alias,
        relation = "",
        hints = "",
        nestedFields = "",
      } = relationGroups;
      return {
        alias: alias ?? relation,
        fields: parseSelect(nestedFields),
        inner: hints.split("!").includes("inner"),
        kind: "relation",
        relation,
      };
    }

    // alias:column::cast where alias and cast are optional
    const columnMatch = field.match(
      /^(?:(?<alias>\w+):)?(?<column>\w+)(?:::\w+)?$/u
    );

    if (!columnMatch) {
      throw parseError(
        `failed to parse select parameter (${selectStr})`,
        `unsupported field "${field}": the mock supports columns, aliases, casts and embedded resources`
      );
    }

    const columnGroups: Record<string, string | undefined> =
      columnMatch.groups ?? {};
    const { alias, column = field } = columnGroups;
    return { alias: alias ?? column, column, kind: "column" };
  });

/** The paths of the embedded resources of a select, such as `['talent']`. */
const getEmbeddedPaths = (
  nodes: readonly SelectNode[],
  parent: readonly string[] = []
): string[][] =>
  nodes.flatMap((node) => {
    if (node.kind !== "relation") {
      return [];
    }

    const path = [...parent, node.alias];

    return [path, ...getEmbeddedPaths(node.fields, path)];
  });

/**
 * Check that every filter on an embedded resource, such as
 * `talents.deleted_at=is.null`, names an embedded resource of the select
 * (`PGRST108` of PostgREST otherwise).
 */
const checkEmbeddedFilters = (
  nodes: readonly SelectNode[],
  filters: readonly Filter[]
): void => {
  const paths = new Set(
    getEmbeddedPaths(nodes).map((path) => JSON.stringify(path))
  );

  for (const { path } of filters) {
    if (path.length > 0 && !paths.has(JSON.stringify(path))) {
      const name = path.join(".");

      throw new PostgrestError(400, {
        code: "PGRST108",
        hint: `Verify that '${name}' is included in the 'select' query parameter.`,
        message: `'${name}' is not an embedded resource in this request`,
      });
    }
  }
};

/**
 * The relation of a table to an embedded resource, and the table it refers
 * to. A relation that the table does not define is an error (`PGRST200` of
 * PostgREST).
 */
const findRelation = (
  table: AnyTableDefinition | undefined,
  relationName: string
) => {
  const relation = table?.relations.find(
    (candidate) => candidate.table === relationName
  );
  const target = relation && findTable(relation.table);

  if (!relation || !target) {
    throw new PostgrestError(400, {
      code: "PGRST200",
      details: `Searched for a foreign key relationship between '${table?.name}' and '${relationName}' in the schema 'public', but no matches were found.`,
      hint: "Add the relation to the table definition of the mock (src/handlers/supabase/tables.ts).",
      message: `Could not find a relationship between '${table?.name}' and '${relationName}' in the schema cache`,
    });
  }

  return { relation, target };
};

/** Check that every embedded resource of a select has a relation. */
const checkRelations = (
  nodes: readonly SelectNode[],
  table: AnyTableDefinition | undefined
): void => {
  for (const node of nodes) {
    if (node.kind === "relation") {
      checkRelations(node.fields, findRelation(table, node.relation).target);
    }
  }
};

/**
 * Check a select and the filters on its embedded resources without reading
 * any rows, and throw the error of PostgREST for what is not supported. A
 * write checks them before it changes anything, as PostgREST does.
 */
export const validateSelect = (
  selectStr: string,
  tableName: TableName,
  filters: readonly Filter[] = []
): SelectNode[] => {
  const nodes = parseSelect(selectStr);

  checkEmbeddedFilters(nodes, filters);
  checkRelations(nodes, findTable(tableName));

  return nodes;
};

/** The rows of an embedded resource that match its filters. */
const resolveRelation = async (
  table: AnyTableDefinition | undefined,
  relationName: string,
  row: object,
  filters: readonly Filter[]
): Promise<{ rows: object[]; table: AnyTableDefinition; many: boolean }> => {
  const { relation, target } = findRelation(table, relationName);
  const value = getColumn(row, relation.column);
  const targetRows =
    value === null || value === undefined ? [] : await getRows(target);
  const related = targetRows.filter(
    (relatedRow) =>
      getColumn(relatedRow, relation.referencedColumn) === value &&
      matchesFilters(relatedRow, filters, target.uuidColumns)
  );

  return { many: relation.many, rows: related, table: target };
};

/**
 * The value of an embedded resource in a projected row, or `null` when the
 * resource has `!inner` and no rows.
 */
const projectEmbedded = async (
  row: object,
  node: Extract<SelectNode, { kind: "relation" }>,
  table: AnyTableDefinition | undefined,
  filters: readonly Filter[],
  path: readonly string[]
): Promise<{ value: unknown } | null> => {
  const relationPath = [...path, node.alias];
  const related = await resolveRelation(
    table,
    node.relation,
    row,
    filtersAt(filters, relationPath)
  );
  const outputs = await Promise.all(
    related.rows.map((relatedRow) =>
      projectRow(relatedRow, node.fields, related.table, filters, relationPath)
    )
  );
  const projected = outputs.filter((output) => output !== null);

  if (node.inner && projected.length === 0) {
    return null;
  }

  return { value: related.many ? projected : (projected[0] ?? null) };
};

/**
 * Project a single row according to parsed select nodes, resolving
 * embedded resources recursively. `null` when an embedded resource with
 * `!inner` has no rows, which leaves the row out.
 */
const projectRow = async (
  row: object,
  nodes: readonly SelectNode[],
  table: AnyTableDefinition | undefined,
  filters: readonly Filter[],
  path: readonly string[]
): Promise<Record<string, unknown> | null> => {
  const result: Record<string, unknown> = {};

  for (const node of nodes) {
    if (node.kind === "wildcard") {
      Object.assign(result, row);
    } else if (node.kind === "column") {
      if (node.column in row) {
        result[node.alias] = getColumn(row, node.column);
      }
    } else {
      // oxlint-disable-next-line no-await-in-loop -- the nodes are projected in order, so the keys of the output follow the select and a missing `!inner` row stops early
      const embedded = await projectEmbedded(row, node, table, filters, path);

      if (!embedded) {
        return null;
      }

      result[node.alias] = embedded.value;
    }
  }

  return result;
};

/** A row of a table and what the select of a query returns for it. */
export interface SelectedRow<Row extends object = object> {
  output: object;
  row: Row;
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
export const selectRows = async <Row extends object>(
  rows: readonly Row[],
  selectStr: string,
  tableName: TableName,
  filters: readonly Filter[] = []
): Promise<SelectedRow<Row>[]> => {
  const nodes = validateSelect(selectStr, tableName, filters);

  if (selectStr === "*") {
    return rows.map((row) => ({ output: row, row }));
  }

  const table = findTable(tableName);
  const outputs = await Promise.all(
    rows.map((row) => projectRow(row, nodes, table, filters, []))
  );

  return rows.flatMap((row, index) => {
    const output = outputs[index];

    return output ? [{ output, row }] : [];
  });
};

/**
 * The outputs of `selectRows`, for the rows that a write returns or the
 * rows of a database function.
 */
export const applySelect = async (
  rows: readonly object[],
  selectStr: string,
  tableName: TableName,
  filters: readonly Filter[] = []
): Promise<object[]> => {
  const selected = await selectRows(rows, selectStr, tableName, filters);

  return selected.map(({ output }) => output);
};
