/**
 * SQLite GraphDialect implementation.
 *
 * @since 0.1.0
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { GraphEnsureError, GraphSqlDialectError } from "../errors.js"
import { type GraphDialect, GraphDialect as GraphDialectTag } from "../GraphDialect.js"
import {
  parseQualifiedTableName,
  quoteIdentifier,
  quoteIdentifierList,
  quoteQualifiedTableName,
  quoteStringLiteral
} from "../internal/sql.js"
import {
  type ColumnDef,
  emptyTablePlan,
  type IndexDef,
  type ReplicationMode,
  type SchemaIncompatible,
  type TableDef,
  type TablePlan
} from "../SchemaPlan.js"

interface ExistingColumn {
  readonly name: string
  readonly sqlType: string
  readonly notNull: boolean
  readonly primaryKey: boolean
}

interface ExistingIndex {
  readonly name: string
  readonly unique: boolean
  readonly columns: ReadonlyArray<string>
}

interface ExistingTableState {
  readonly exists: boolean
  readonly columns: ReadonlyMap<string, ExistingColumn>
  readonly indexes: ReadonlyMap<string, ExistingIndex>
  readonly schemaIndexOwners: ReadonlyMap<string, string>
}

interface PragmaTableInfoRow {
  readonly name: unknown
  readonly type: unknown
  readonly notnull: unknown
  readonly pk: unknown
}

interface PragmaIndexListRow {
  readonly name: unknown
  readonly unique: unknown
  readonly origin: unknown
}

interface PragmaIndexInfoRow {
  readonly seqno: unknown
  readonly name: unknown
}

interface SqliteMasterIndexRow {
  readonly name: unknown
  readonly tbl_name: unknown
}

export interface GraphDialectSqliteOptions {
  readonly defaultReplication?: ReplicationMode | undefined
}

const normalizeType = (sqlType: string): string =>
  sqlType.split("(")[0]?.trim().toUpperCase() ?? sqlType.trim().toUpperCase()

const columnSql = (column: ColumnDef): string => {
  const pieces: Array<string> = [quoteIdentifier(column.name), column.sqlType]
  if (column.primaryKey === true) {
    pieces.push("PRIMARY KEY")
  }
  if (column.notNull === true) {
    pieces.push("NOT NULL")
  }
  if (column.defaultSql !== undefined) {
    pieces.push(`DEFAULT ${column.defaultSql}`)
  }
  return pieces.join(" ")
}

const createTableSql = (table: TableDef): string =>
  `CREATE TABLE IF NOT EXISTS ${quoteQualifiedTableName(table.name)} (${table.columns.map(columnSql).join(", ")})`

const createIndexSql = (tableName: string, index: IndexDef): string => {
  const qualified = parseQualifiedTableName(tableName)
  const uniquePrefix = index.unique === true ? "UNIQUE " : ""
  const columns = quoteIdentifierList(index.columns)
  const indexName = `${quoteIdentifier(qualified.schema)}.${quoteIdentifier(index.name)}`
  return `CREATE ${uniquePrefix}INDEX IF NOT EXISTS ${indexName} ON ${quoteIdentifier(qualified.table)} (${columns})`
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const readString = (value: unknown): string | null => (typeof value === "string" ? value : null)

const readNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const dialectError = (
  operation: string,
  tableName: string,
  detail: string,
  cause?: unknown
): GraphSqlDialectError =>
  new GraphSqlDialectError({
    operation,
    tableName,
    detail,
    cause
  })

const readExistingState = (
  table: TableDef
): Effect.Effect<ExistingTableState, GraphSqlDialectError, SqlClient.SqlClient> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    const qualified = parseQualifiedTableName(table.name)
    const schemaIndexOwnersQuery = `SELECT name, tbl_name FROM ${
      quoteIdentifier(qualified.schema)
    }.sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex%'`

    const schemaIndexOwnersRows = yield* sql.unsafe<SqliteMasterIndexRow>(schemaIndexOwnersQuery).pipe(
      Effect.mapError((cause) =>
        dialectError("read-schema-indexes", table.name, "Failed to read sqlite_master index info", cause)
      )
    )

    const schemaIndexOwners = new Map<string, string>()
    for (const row of schemaIndexOwnersRows) {
      const indexName = readString(isObject(row) ? row.name : undefined)
      const ownerTable = readString(isObject(row) ? row.tbl_name : undefined)

      if (indexName === null || ownerTable === null) {
        continue
      }

      schemaIndexOwners.set(indexName, ownerTable)
    }

    const existsQuery = `SELECT name FROM ${
      quoteIdentifier(qualified.schema)
    }.sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`

    const existsRows = yield* sql.unsafe<{ readonly name: unknown }>(existsQuery, [qualified.table]).pipe(
      Effect.mapError((cause) =>
        dialectError("read-existing-table", table.name, "Failed to read sqlite_master table info", cause)
      )
    )

    if (existsRows.length === 0) {
      return {
        exists: false,
        columns: new Map(),
        indexes: new Map(),
        schemaIndexOwners
      }
    }

    const tableInfoQuery = `PRAGMA ${quoteIdentifier(qualified.schema)}.table_info(${
      quoteStringLiteral(qualified.table)
    })`

    const tableInfoRows = yield* sql.unsafe<PragmaTableInfoRow>(tableInfoQuery).pipe(
      Effect.mapError((cause) => dialectError("read-table-info", table.name, "Failed to read PRAGMA table_info", cause))
    )

    const columns = new Map<string, ExistingColumn>()
    for (const row of tableInfoRows) {
      const name = readString(isObject(row) ? row.name : undefined)
      if (name === null) {
        continue
      }

      const rawType = readString(isObject(row) ? row.type : undefined) ?? ""
      columns.set(name, {
        name,
        sqlType: normalizeType(rawType),
        notNull: readNumber(isObject(row) ? row.notnull : undefined) === 1,
        primaryKey: readNumber(isObject(row) ? row.pk : undefined) > 0
      })
    }

    const indexListQuery = `PRAGMA ${quoteIdentifier(qualified.schema)}.index_list(${
      quoteStringLiteral(qualified.table)
    })`

    const indexListRows = yield* sql.unsafe<PragmaIndexListRow>(indexListQuery).pipe(
      Effect.mapError((cause) => dialectError("read-index-list", table.name, "Failed to read PRAGMA index_list", cause))
    )

    const indexes = new Map<string, ExistingIndex>()

    for (const row of indexListRows) {
      const indexName = readString(isObject(row) ? row.name : undefined)
      if (indexName === null || indexName.startsWith("sqlite_autoindex")) {
        continue
      }

      const origin = readString(isObject(row) ? row.origin : undefined)
      if (origin === "pk") {
        continue
      }

      const indexInfoQuery = `PRAGMA ${quoteIdentifier(qualified.schema)}.index_info(${quoteStringLiteral(indexName)})`

      const indexInfoRows = yield* sql.unsafe<PragmaIndexInfoRow>(indexInfoQuery).pipe(
        Effect.mapError((cause) =>
          dialectError("read-index-info", table.name, `Failed to read PRAGMA index_info for ${indexName}`, cause)
        )
      )

      const sorted = [...indexInfoRows].sort((left, right) => {
        const leftSeq = readNumber(isObject(left) ? left.seqno : undefined)
        const rightSeq = readNumber(isObject(right) ? right.seqno : undefined)
        return leftSeq - rightSeq
      })

      const columnsInIndex = sorted
        .map((item) => readString(isObject(item) ? item.name : undefined))
        .filter((item): item is string => item !== null)

      indexes.set(indexName, {
        name: indexName,
        unique: readNumber(isObject(row) ? row.unique : undefined) === 1,
        columns: columnsInIndex
      })
    }

    return {
      exists: true,
      columns,
      indexes,
      schemaIndexOwners
    }
  })

const missingPrimaryKey = (table: TableDef): boolean => table.columns.every((column) => column.primaryKey !== true)

const compareColumns = (
  table: TableDef,
  existingColumns: ReadonlyMap<string, ExistingColumn>
): {
  readonly alterStatements: ReadonlyArray<string>
  readonly incompatible: ReadonlyArray<SchemaIncompatible>
} => {
  const alterStatements: Array<string> = []
  const incompatible: Array<SchemaIncompatible> = []

  for (const column of table.columns) {
    const existing = existingColumns.get(column.name)
    if (!existing) {
      alterStatements.push(`ALTER TABLE ${quoteQualifiedTableName(table.name)} ADD COLUMN ${columnSql(column)}`)
      continue
    }

    const desiredType = normalizeType(column.sqlType)
    if (existing.sqlType !== desiredType) {
      incompatible.push({
        tableName: table.name,
        reason: "TypeMismatch",
        detail: `Column ${column.name} has type ${existing.sqlType}, expected ${desiredType}`
      })
    }

    if (column.notNull === true && existing.notNull === false) {
      incompatible.push({
        tableName: table.name,
        reason: "NotNullMismatch",
        detail: `Column ${column.name} is nullable but desired schema requires NOT NULL`
      })
    }

    if (column.primaryKey === true && existing.primaryKey === false) {
      incompatible.push({
        tableName: table.name,
        reason: "PrimaryKeyMismatch",
        detail: `Column ${column.name} is not part of the existing primary key`
      })
    }
  }

  return {
    alterStatements,
    incompatible
  }
}

const arrayEquals = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index])

const compareIndexes = (
  table: TableDef,
  existingIndexes: ReadonlyMap<string, ExistingIndex>,
  schemaIndexOwners: ReadonlyMap<string, string>
): {
  readonly createIndexStatements: ReadonlyArray<string>
  readonly incompatible: ReadonlyArray<SchemaIncompatible>
} => {
  const createIndexStatements: Array<string> = []
  const incompatible: Array<SchemaIncompatible> = []
  const desiredIndexes = table.indexes ?? []
  const qualified = parseQualifiedTableName(table.name)

  for (const index of desiredIndexes) {
    if (table.replication === "crr" && index.unique === true) {
      incompatible.push({
        tableName: table.name,
        reason: "UniqueIndexForbiddenInCrr",
        detail: `Secondary unique index ${index.name} is not allowed in CRR mode`
      })
      continue
    }

    const existing = existingIndexes.get(index.name)
    if (!existing) {
      const ownerTable = schemaIndexOwners.get(index.name)
      if (ownerTable !== undefined && ownerTable !== qualified.table) {
        incompatible.push({
          tableName: table.name,
          reason: "IndexNameCollision",
          detail: `Index ${index.name} already exists on table ${ownerTable} in schema ${qualified.schema}`
        })
        continue
      }

      if (ownerTable === qualified.table) {
        incompatible.push({
          tableName: table.name,
          reason: "IndexShapeMismatch",
          detail: `Index ${index.name} exists on ${qualified.table} but could not be validated from PRAGMA index_list`
        })
        continue
      }

      createIndexStatements.push(createIndexSql(table.name, index))
      continue
    }

    if (existing.unique !== (index.unique === true)) {
      incompatible.push({
        tableName: table.name,
        reason: "IndexShapeMismatch",
        detail: `Index ${index.name} has unique=${existing.unique} but desired unique=${index.unique === true}`
      })
      continue
    }

    if (!arrayEquals(existing.columns, index.columns)) {
      incompatible.push({
        tableName: table.name,
        reason: "IndexShapeMismatch",
        detail: `Index ${index.name} has columns (${existing.columns.join(",")}), desired (${index.columns.join(",")})`
      })
    }
  }

  return {
    createIndexStatements,
    incompatible
  }
}

const planTableWithDefaults = (
  table: TableDef,
  defaultReplication: ReplicationMode
): Effect.Effect<TablePlan, GraphSqlDialectError, SqlClient.SqlClient> =>
  Effect.gen(function*() {
    const replication = table.replication ?? defaultReplication
    const tableWithDefaults: TableDef = { ...table, replication }

    if (missingPrimaryKey(tableWithDefaults)) {
      return {
        ...emptyTablePlan(tableWithDefaults),
        incompatible: [
          {
            tableName: table.name,
            reason: "MissingPrimaryKey",
            detail: "Table definition requires at least one PRIMARY KEY column"
          }
        ]
      }
    }

    const existing = yield* readExistingState(tableWithDefaults)

    if (!existing.exists) {
      const indexEvaluation = compareIndexes(tableWithDefaults, new Map(), existing.schemaIndexOwners)

      return {
        table: tableWithDefaults,
        statements: [createTableSql(tableWithDefaults), ...indexEvaluation.createIndexStatements],
        incompatible: indexEvaluation.incompatible
      }
    }

    const columnEvaluation = compareColumns(tableWithDefaults, existing.columns)
    const indexEvaluation = compareIndexes(tableWithDefaults, existing.indexes, existing.schemaIndexOwners)

    const alterStatements = [...columnEvaluation.alterStatements]
    const wrappedAlterStatements = replication === "crr" && alterStatements.length > 0
      ? [
        `SELECT crsql_begin_alter(${quoteStringLiteral(parseQualifiedTableName(tableWithDefaults.name).table)})`,
        ...alterStatements,
        `SELECT crsql_commit_alter(${quoteStringLiteral(parseQualifiedTableName(tableWithDefaults.name).table)})`
      ]
      : alterStatements

    return {
      table: tableWithDefaults,
      statements: [...wrappedAlterStatements, ...indexEvaluation.createIndexStatements],
      incompatible: [...columnEvaluation.incompatible, ...indexEvaluation.incompatible]
    }
  })

export const make = (options: GraphDialectSqliteOptions = {}): GraphDialect => {
  const defaultReplication = options.defaultReplication ?? "none"

  const planTable: GraphDialect["planTable"] = (table) =>
    planTableWithDefaults(table, defaultReplication).pipe(
      Effect.catch((cause) =>
        cause instanceof GraphSqlDialectError
          ? Effect.fail(cause)
          : Effect.fail(
            new GraphSqlDialectError({
              operation: "plan-table",
              tableName: table.name,
              detail: "Unexpected failure while planning table",
              cause
            })
          )
      )
    )

  const ensureTable: GraphDialect["ensureTable"] = (table) =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const plan = yield* planTable(table)

      if (plan.incompatible.length > 0) {
        return yield* new GraphEnsureError({
          reason: "IncompatiblePlan",
          detail: `Schema plan has ${plan.incompatible.length} incompatible change(s)`,
          tableName: table.name,
          incompatible: plan.incompatible
        })
      }

      yield* Effect.forEach(plan.statements, (statement) =>
        sql.unsafe(statement).pipe(
          Effect.asVoid,
          Effect.mapError((cause) =>
            new GraphSqlDialectError({
              operation: "ensure-table",
              tableName: table.name,
              detail: `Failed executing statement: ${statement}`,
              cause
            })
          )
        ), { discard: true })

      return plan
    })

  return {
    planTable,
    ensureTable
  }
}

export const layer = (options: GraphDialectSqliteOptions = {}) => Layer.succeed(GraphDialectTag, make(options))
