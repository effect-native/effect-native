/**
 * Edge repository implementation.
 *
 * @since 0.1.0
 */

import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as SqlClient from "effect/unstable/sql/SqlClient"
import type * as SqlError from "effect/unstable/sql/SqlError"
import * as SqlSchema from "effect/unstable/sql/SqlSchema"
import { GraphInvariantError } from "../errors.js"
import { placeholders, quoteIdentifierList, quoteQualifiedTableName } from "../internal/sql.js"
import type { GraphSpec } from "../spec.js"

export interface GraphEdge {
  readonly id: string
  readonly edgeType: string
  readonly src: string
  readonly dst: string
  readonly props: unknown
}

export interface EdgeRepository {
  readonly put: (
    edgeType: string,
    src: string,
    dst: string,
    props?: unknown
  ) => Effect.Effect<string, GraphInvariantError | SqlError.SqlError | Schema.SchemaError>
  readonly out: (
    src: string,
    edgeType?: string
  ) => Effect.Effect<ReadonlyArray<GraphEdge>, GraphInvariantError | SqlError.SqlError | Schema.SchemaError>
  readonly in: (
    dst: string,
    edgeType?: string
  ) => Effect.Effect<ReadonlyArray<GraphEdge>, GraphInvariantError | SqlError.SqlError | Schema.SchemaError>
}

const nullableString = Schema.Union([Schema.Null, Schema.String])

const edgeInsertRequest = Schema.Struct({
  id: Schema.String,
  edge_type: Schema.String,
  src: Schema.String,
  dst: Schema.String,
  props_json: nullableString
})

const edgeRowSchema = Schema.Struct({
  id: Schema.String,
  edge_type: Schema.String,
  src: Schema.String,
  dst: Schema.String,
  props_json: nullableString
})

const edgeIdParts = (edgeType: string, src: string, dst: string, propsJson: string | null): string =>
  [edgeType, src, dst, propsJson ?? ""].join("\u0000")

const hash32 = (value: string): string => {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    const charCode = value.charCodeAt(index)
    hash = Math.imul(hash ^ charCode, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

export const deterministicEdgeId = (
  edgeType: string,
  src: string,
  dst: string,
  propsJson: string | null
): string => {
  const basis = edgeIdParts(edgeType, src, dst, propsJson)
  return `${hash32(basis)}${hash32(`${basis}:${basis.length}`)}${hash32(`rev:${basis.split("").reverse().join("")}`)}${
    hash32(`dst:${dst}`)
  }`
}

const decodePropsJson = (propsJson: string | null): Effect.Effect<unknown, GraphInvariantError> => {
  if (propsJson === null) {
    return Effect.succeed(null)
  }

  return Effect.try({
    try: (): unknown => JSON.parse(propsJson),
    catch: (cause) =>
      new GraphInvariantError({
        context: "edge.decode",
        detail: `Unable to parse props_json: ${propsJson}`,
        cause
      })
  })
}

const encodePropsJson = (props: unknown | undefined): Effect.Effect<string | null, GraphInvariantError> => {
  if (props === undefined) {
    return Effect.succeed(null)
  }

  return Effect.try({
    try: (): string | undefined => JSON.stringify(props),
    catch: (cause) =>
      new GraphInvariantError({
        context: "edge.encode",
        detail: "Unable to serialize edge props to JSON",
        cause
      })
  }).pipe(Effect.map((encoded) => encoded ?? null))
}

const toEdge = (row: Schema.Schema.Type<typeof edgeRowSchema>): Effect.Effect<GraphEdge, GraphInvariantError> =>
  decodePropsJson(row.props_json).pipe(
    Effect.map((props) => ({
      id: row.id,
      edgeType: row.edge_type,
      src: row.src,
      dst: row.dst,
      props
    }))
  )

const buildInsertSql = (tableName: string): string => {
  const columns = ["id", "edge_type", "src", "dst", "props_json"]
  return (
    `INSERT INTO ${quoteQualifiedTableName(tableName)} (${quoteIdentifierList(columns)}) ` +
    `VALUES (${placeholders(columns.length)}) ON CONFLICT (id) DO NOTHING`
  )
}

const buildSelectOutSql = (tableName: string, withEdgeType: boolean): string =>
  withEdgeType
    ? `SELECT id, edge_type, src, dst, props_json FROM ${
      quoteQualifiedTableName(tableName)
    } WHERE src = ? AND edge_type = ? ORDER BY id`
    : `SELECT id, edge_type, src, dst, props_json FROM ${quoteQualifiedTableName(tableName)} WHERE src = ? ORDER BY id`

const buildSelectInSql = (tableName: string, withEdgeType: boolean): string =>
  withEdgeType
    ? `SELECT id, edge_type, src, dst, props_json FROM ${
      quoteQualifiedTableName(tableName)
    } WHERE dst = ? AND edge_type = ? ORDER BY id`
    : `SELECT id, edge_type, src, dst, props_json FROM ${quoteQualifiedTableName(tableName)} WHERE dst = ? ORDER BY id`

export interface EdgeRepositoryOptions {
  readonly spec: GraphSpec
  readonly sql: SqlClient.SqlClient
}

export const makeEdgeRepository = ({ spec, sql }: EdgeRepositoryOptions): EdgeRepository => {
  const tableName = spec.edgeTableName ?? "graph_edge"

  const put: EdgeRepository["put"] = (edgeType, src, dst, props) =>
    Effect.gen(function*() {
      const propsJson = yield* encodePropsJson(props)
      const id = deterministicEdgeId(edgeType, src, dst, propsJson)

      const insertEdge = SqlSchema.void({
        Request: edgeInsertRequest,
        execute: (request) =>
          sql.unsafe(buildInsertSql(tableName), [
            request.id,
            request.edge_type,
            request.src,
            request.dst,
            request.props_json
          ])
      })

      yield* insertEdge({
        id,
        edge_type: edgeType,
        src,
        dst,
        props_json: propsJson
      })

      return id
    })

  const out: EdgeRepository["out"] = (src, edgeType) =>
    Effect.gen(function*() {
      if (edgeType === undefined) {
        const query = SqlSchema.findAll({
          Request: Schema.Struct({ src: Schema.String }),
          Result: edgeRowSchema,
          execute: (request) => sql.unsafe(buildSelectOutSql(tableName, false), [request.src])
        })

        const rows = yield* query({ src })
        return yield* Effect.forEach(rows, toEdge)
      }

      const query = SqlSchema.findAll({
        Request: Schema.Struct({ src: Schema.String, edge_type: Schema.String }),
        Result: edgeRowSchema,
        execute: (request) => sql.unsafe(buildSelectOutSql(tableName, true), [request.src, request.edge_type])
      })

      const rows = yield* query({ src, edge_type: edgeType })
      return yield* Effect.forEach(rows, toEdge)
    })

  const incoming: EdgeRepository["in"] = (dst, edgeType) =>
    Effect.gen(function*() {
      if (edgeType === undefined) {
        const query = SqlSchema.findAll({
          Request: Schema.Struct({ dst: Schema.String }),
          Result: edgeRowSchema,
          execute: (request) => sql.unsafe(buildSelectInSql(tableName, false), [request.dst])
        })

        const rows = yield* query({ dst })
        return yield* Effect.forEach(rows, toEdge)
      }

      const query = SqlSchema.findAll({
        Request: Schema.Struct({ dst: Schema.String, edge_type: Schema.String }),
        Result: edgeRowSchema,
        execute: (request) => sql.unsafe(buildSelectInSql(tableName, true), [request.dst, request.edge_type])
      })

      const rows = yield* query({ dst, edge_type: edgeType })
      return yield* Effect.forEach(rows, toEdge)
    })

  return {
    put,
    out,
    in: incoming
  }
}
