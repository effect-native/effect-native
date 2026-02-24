/**
 * Node repository implementation.
 *
 * @since 0.1.0
 */

import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as SqlClient from "effect/unstable/sql/SqlClient"
import type * as SqlError from "effect/unstable/sql/SqlError"
import * as SqlSchema from "effect/unstable/sql/SqlSchema"
import { GraphInvariantError } from "../errors.js"
import { placeholders, quoteIdentifier, quoteIdentifierList, quoteQualifiedTableName } from "../internal/sql.js"
import type { GraphSpec, NodeDef, RowShape } from "../spec.js"

export type NodeRepositoryError = GraphInvariantError | Schema.SchemaError | SqlError.SqlError

export interface NodeRepository {
  readonly put: (kind: string, value: unknown) => Effect.Effect<void, NodeRepositoryError>
  readonly queryById: (
    kind: string,
    id: string
  ) => Effect.Effect<Option.Option<unknown>, NodeRepositoryError>
  readonly get: (kind: string, id: string) => Effect.Effect<unknown | null, NodeRepositoryError>
}

const isRowShape = (value: unknown): value is RowShape =>
  typeof value === "object" && value !== null && Array.isArray(value) === false

const missingNodeError = (kind: string) =>
  new GraphInvariantError({
    context: "node.lookup",
    detail: `Unknown node kind: ${kind}`
  })

const resolveNodeDef = (spec: GraphSpec, kind: string): Effect.Effect<NodeDef<unknown>, GraphInvariantError> => {
  const node = spec.nodes.find((candidate) => candidate.kind === kind)
  return node
    ? Effect.succeed(node)
    : Effect.fail(missingNodeError(kind))
}

const rowFromEncoded = (kind: string, value: unknown): Effect.Effect<RowShape, GraphInvariantError> =>
  isRowShape(value)
    ? Effect.succeed(value)
    : Effect.fail(
      new GraphInvariantError({
        context: "node.encode",
        detail: `Schema for kind ${kind} must encode to a record object`
      })
    )

const buildUpsertSql = (tableName: string, columns: ReadonlyArray<string>, idColumn: string): string => {
  const quotedColumns = quoteIdentifierList(columns)
  const values = placeholders(columns.length)
  const updates = columns
    .filter((column) => column !== idColumn)
    .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)

  const conflictTarget = quoteIdentifier(idColumn)

  if (updates.length === 0) {
    return (
      `INSERT INTO ${quoteQualifiedTableName(tableName)} (${quotedColumns}) VALUES (${values}) ` +
      `ON CONFLICT (${conflictTarget}) DO NOTHING`
    )
  }

  return (
    `INSERT INTO ${quoteQualifiedTableName(tableName)} (${quotedColumns}) VALUES (${values}) ` +
    `ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates.join(", ")}`
  )
}

const buildSelectByIdSql = (tableName: string, idColumn: string): string =>
  `SELECT * FROM ${quoteQualifiedTableName(tableName)} WHERE ${quoteIdentifier(idColumn)} = ? LIMIT 1`

export interface NodeRepositoryOptions {
  readonly spec: GraphSpec
  readonly sql: SqlClient.SqlClient
}

export const makeNodeRepository = ({ spec, sql }: NodeRepositoryOptions): NodeRepository => {
  const put: NodeRepository["put"] = (kind, value) =>
    Effect.gen(function*() {
      const node = yield* resolveNodeDef(spec, kind)
      const row = yield* Schema.encodeEffect(node.schema)(value).pipe(
        Effect.flatMap((encoded) => rowFromEncoded(kind, encoded))
      )
      const columns = Object.keys(row)
      const idColumn = node.idColumn ?? "id"

      if (columns.length === 0) {
        return yield* new GraphInvariantError({
          context: "node.put",
          detail: `Encoded row for kind ${kind} produced no columns`
        })
      }

      if (!columns.includes(idColumn)) {
        return yield* new GraphInvariantError({
          context: "node.put",
          detail: `Encoded row for kind ${kind} is missing id column ${idColumn}`
        })
      }

      const values = columns.map((column) => row[column])
      const statement = buildUpsertSql(node.table.name, columns, idColumn)
      const executePut = SqlSchema.void({
        Request: Schema.Array(Schema.Unknown),
        execute: (requestValues) => sql.unsafe(statement, requestValues)
      })

      yield* executePut(values)
    })

  const queryById: NodeRepository["queryById"] = (kind, id) =>
    Effect.gen(function*() {
      const node = yield* resolveNodeDef(spec, kind)
      const statement = buildSelectByIdSql(node.table.name, node.idColumn ?? "id")

      const executeFind = SqlSchema.findOneOption({
        Request: Schema.Struct({ id: Schema.String }),
        Result: node.schema,
        execute: (request) => sql.unsafe(statement, [request.id])
      })

      return yield* executeFind({ id })
    })

  const get: NodeRepository["get"] = (kind, id) =>
    queryById(kind, id).pipe(
      Effect.map(
        Option.match({
          onNone: () => null,
          onSome: (value) => value
        })
      )
    )

  return {
    put,
    queryById,
    get
  }
}
