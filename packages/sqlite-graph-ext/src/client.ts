/**
 * Typed Effect client for sqlite-graph-ext SQL functions.
 *
 * @since 0.1.0
 */

import { Data, Effect } from "effect"
import { idsetDiff, idsetEmpty, type IdSetExpression, idsetFromValues, idsetIntersect, idsetUnion } from "./idset.js"
import {
  decodeGraphInIdsetPayload,
  decodeGraphInManyPayload,
  decodeGraphOutIdsetPayload,
  decodeGraphOutManyPayload,
  decodeIdsetEachPayload,
  decodeRankedDiffPayload,
  decodeTwoHopCountPayload,
  type GraphInIdsetRow,
  type GraphInManyRow,
  type GraphOutIdsetRow,
  type GraphOutManyRow,
  type IdsetEachRow,
  payloadPreview,
  type RankedDiffRow,
  type TwoHopCountRow
} from "./schema.js"

export type SqlBinding = string | number | bigint | Uint8Array | null

export interface SqliteStatementLike {
  get(...bindings: Array<unknown>): unknown
}

export interface SqliteDatabaseLike {
  query(sql: string): SqliteStatementLike
}

type GraphExtOperation =
  | "graph_ext_version"
  | "idset_hash"
  | "idset_each"
  | "graph_out_many"
  | "graph_in_many"
  | "graph_out_idset"
  | "graph_in_idset"
  | "graph_two_hop_counts"
  | "ranked_diff"

export class GraphExtQueryError extends Data.TaggedError("GraphExtQueryError")<{
  readonly operation: GraphExtOperation
  readonly sql: string
  readonly cause: unknown
}> {}

export class GraphExtDecodeError extends Data.TaggedError("GraphExtDecodeError")<{
  readonly operation: GraphExtOperation
  readonly payload: string
  readonly cause: unknown
}> {}

export type GraphExtClientError = GraphExtQueryError | GraphExtDecodeError

export interface GraphOutManyInput {
  readonly edgeTable: string
  readonly edgeType: string
  readonly srcSet: IdSetExpression
  readonly whereSql?: string
}

export interface GraphInManyInput {
  readonly edgeTable: string
  readonly edgeType: string
  readonly dstSet: IdSetExpression
  readonly whereSql?: string
}

export interface GraphOutIdsetInput {
  readonly edgeTable: string
  readonly edgeType: string
  readonly srcSet: IdSetExpression
}

export interface GraphInIdsetInput {
  readonly edgeTable: string
  readonly edgeType: string
  readonly dstSet: IdSetExpression
}

export interface TwoHopCountInput {
  readonly edgeTable: string
  readonly hop1EdgeType: string
  readonly hop2EdgeType: string
  readonly startSet: IdSetExpression
}

export interface RankedDiffInput {
  readonly oldSerpId: string
  readonly newSerpId: string
  readonly table: string
}

export interface TwoHopRecommendationInput {
  readonly edgeTable: string
  readonly hop1EdgeType: string
  readonly hop2EdgeType: string
  readonly seedIds: ReadonlyArray<string>
  readonly excludeIds?: ReadonlyArray<string>
  readonly firstHopWhereSql?: string
  readonly inboundWhereSql?: string
}

export interface TwoHopRecommendationRow {
  readonly rank: number
  readonly deterministicOrd: number
  readonly candidate: string
  readonly supportCount: number
  readonly via: string
}

export interface TwoHopRecommendationResult {
  readonly recommendationSetHash: string
  readonly rows: ReadonlyArray<TwoHopRecommendationRow>
}

export interface GraphExtClientOptions {
  readonly onStatement?: (sql: string) => void
}

export interface GraphExtClient {
  readonly version: Effect.Effect<string, GraphExtClientError>
  readonly idsetHash: (set: IdSetExpression) => Effect.Effect<string, GraphExtClientError>
  readonly idsetEach: (set: IdSetExpression) => Effect.Effect<ReadonlyArray<IdsetEachRow>, GraphExtClientError>
  readonly graphOutMany: (
    input: GraphOutManyInput
  ) => Effect.Effect<ReadonlyArray<GraphOutManyRow>, GraphExtClientError>
  readonly graphInMany: (input: GraphInManyInput) => Effect.Effect<ReadonlyArray<GraphInManyRow>, GraphExtClientError>
  readonly graphOutIdset: (
    input: GraphOutIdsetInput
  ) => Effect.Effect<ReadonlyArray<GraphOutIdsetRow>, GraphExtClientError>
  readonly graphInIdset: (
    input: GraphInIdsetInput
  ) => Effect.Effect<ReadonlyArray<GraphInIdsetRow>, GraphExtClientError>
  readonly graphTwoHopCounts: (
    input: TwoHopCountInput
  ) => Effect.Effect<ReadonlyArray<TwoHopCountRow>, GraphExtClientError>
  readonly rankedDiff: (input: RankedDiffInput) => Effect.Effect<ReadonlyArray<RankedDiffRow>, GraphExtClientError>
  readonly recommendByTwoHop: (
    input: TwoHopRecommendationInput
  ) => Effect.Effect<TwoHopRecommendationResult, GraphExtClientError>
}

const uniqueSorted = (values: ReadonlyArray<string>) =>
  Array.from(new Set(values.filter((value) => value.length > 0))).sort((a, b) => a.localeCompare(b))

const readColumn = (row: unknown, column: string) => {
  if (row == null || typeof row !== "object") return ""
  const value = Reflect.get(row, column)
  return value ?? ""
}

const decodeTextValue = (value: unknown) => {
  if (typeof value === "string") return value
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  return String(value)
}

/**
 * Create a typed graph extension client around a sqlite-compatible database.
 *
 * @since 0.1.0
 */
export const createGraphExtClient = (
  db: SqliteDatabaseLike,
  options?: GraphExtClientOptions
): GraphExtClient => {
  const runPayloadQuery = <A>(
    operation: GraphExtOperation,
    sql: string,
    bindings: ReadonlyArray<SqlBinding>,
    decode: (payload: unknown) => Effect.Effect<ReadonlyArray<A>, unknown>
  ) =>
    Effect.gen(function*() {
      const payload = yield* Effect.try({
        try: () => {
          options?.onStatement?.(sql)
          const row = db.query(sql).get(...Array.from(bindings))
          return readColumn(row, "payload")
        },
        catch: (cause) => new GraphExtQueryError({ operation, sql, cause })
      })

      return yield* decode(payload).pipe(
        Effect.mapError((cause) => new GraphExtDecodeError({ operation, payload: payloadPreview(payload), cause }))
      )
    })

  const runTextQuery = (
    operation: GraphExtOperation,
    sql: string,
    bindings: ReadonlyArray<SqlBinding>
  ) =>
    Effect.gen(function*() {
      const value = yield* Effect.try({
        try: () => {
          options?.onStatement?.(sql)
          const row = db.query(sql).get(...Array.from(bindings))
          return readColumn(row, "payload")
        },
        catch: (cause) => new GraphExtQueryError({ operation, sql, cause })
      })

      return decodeTextValue(value)
    })

  const version = runTextQuery("graph_ext_version", "SELECT graph_ext_version() AS payload", [])

  const idsetHash = (set: IdSetExpression) =>
    runTextQuery("idset_hash", `SELECT idset_hash(${set.expression}) AS payload`, set.bindings)

  const idsetEach = (set: IdSetExpression) =>
    runPayloadQuery(
      "idset_each",
      `SELECT idset_each(${set.expression}) AS payload`,
      set.bindings,
      decodeIdsetEachPayload
    )

  const graphOutMany = (input: GraphOutManyInput) => {
    const whereSql = input.whereSql ?? ""
    return runPayloadQuery(
      "graph_out_many",
      `SELECT graph_out_many(?, ?, ${input.srcSet.expression}, ?) AS payload`,
      [input.edgeTable, input.edgeType, ...input.srcSet.bindings, whereSql],
      decodeGraphOutManyPayload
    )
  }

  const graphInMany = (input: GraphInManyInput) => {
    const whereSql = input.whereSql ?? ""
    return runPayloadQuery(
      "graph_in_many",
      `SELECT graph_in_many(?, ?, ${input.dstSet.expression}, ?) AS payload`,
      [input.edgeTable, input.edgeType, ...input.dstSet.bindings, whereSql],
      decodeGraphInManyPayload
    )
  }

  const graphOutIdset = (input: GraphOutIdsetInput) =>
    runPayloadQuery(
      "graph_out_idset",
      `SELECT graph_out_idset(?, ?, ${input.srcSet.expression}) AS payload`,
      [input.edgeTable, input.edgeType, ...input.srcSet.bindings],
      decodeGraphOutIdsetPayload
    )

  const graphInIdset = (input: GraphInIdsetInput) =>
    runPayloadQuery(
      "graph_in_idset",
      `SELECT graph_in_idset(?, ?, ${input.dstSet.expression}) AS payload`,
      [input.edgeTable, input.edgeType, ...input.dstSet.bindings],
      decodeGraphInIdsetPayload
    )

  const graphTwoHopCounts = (input: TwoHopCountInput) =>
    runPayloadQuery(
      "graph_two_hop_counts",
      `SELECT graph_two_hop_counts(?, ?, ?, ${input.startSet.expression}) AS payload`,
      [input.edgeTable, input.hop1EdgeType, input.hop2EdgeType, ...input.startSet.bindings],
      decodeTwoHopCountPayload
    )

  const rankedDiff = (input: RankedDiffInput) =>
    runPayloadQuery(
      "ranked_diff",
      "SELECT ranked_diff(?, ?, ?) AS payload",
      [input.oldSerpId, input.newSerpId, input.table],
      decodeRankedDiffPayload
    )

  const recommendByTwoHop = (input: TwoHopRecommendationInput) =>
    Effect.gen(function*() {
      const seedSet = idsetFromValues(input.seedIds)
      if (seedSet.bindings.length === 0) {
        return {
          recommendationSetHash: yield* idsetHash(idsetEmpty),
          rows: []
        }
      }

      const firstHopWhereSql = input.firstHopWhereSql ?? "deleted_at IS NULL AND dst NOT LIKE 'bot-%'"
      const inboundWhereSql = input.inboundWhereSql ?? "deleted_at IS NULL"
      const firstHopEdges = yield* graphOutMany({
        edgeTable: input.edgeTable,
        edgeType: input.hop1EdgeType,
        srcSet: seedSet,
        whereSql: firstHopWhereSql
      })

      const firstHopTargets = uniqueSorted(firstHopEdges.map((edge) => edge.dst))

      const secondHopCounts = firstHopTargets.length === 0
        ? []
        : yield* graphTwoHopCounts({
          edgeTable: input.edgeTable,
          hop1EdgeType: input.hop1EdgeType,
          hop2EdgeType: input.hop2EdgeType,
          startSet: idsetFromValues(firstHopTargets)
        })

      const candidateSet = idsetFromValues(secondHopCounts.map((row) => row.dst))
      const excludedSet = idsetFromValues([...input.seedIds, ...firstHopTargets, ...(input.excludeIds ?? [])])
      const recommendationSet = idsetDiff(candidateSet, excludedSet)

      const recommendationSetHash = yield* idsetHash(recommendationSet)
      const deterministicRows = yield* idsetEach(recommendationSet)
      const inboundRows = yield* graphInMany({
        edgeTable: input.edgeTable,
        edgeType: input.hop2EdgeType,
        dstSet: recommendationSet,
        whereSql: inboundWhereSql
      })

      const supportByCandidate = new Map(secondHopCounts.map((row) => [row.dst, row.supportCount]))
      const connectorsByCandidate = new Map<string, Array<string>>()
      for (const row of inboundRows) {
        const connectors = connectorsByCandidate.get(row.dst) ?? []
        connectors.push(row.src)
        connectorsByCandidate.set(row.dst, connectors)
      }

      const scoredRows = deterministicRows
        .map((row) => {
          const connectors = uniqueSorted(connectorsByCandidate.get(row.id) ?? [])

          return {
            deterministicOrd: row.ord,
            candidate: row.id,
            supportCount: supportByCandidate.get(row.id) ?? 0,
            via: connectors.join(", ")
          }
        })
        .sort((left, right) => {
          if (left.supportCount !== right.supportCount) {
            return right.supportCount - left.supportCount
          }

          return left.candidate.localeCompare(right.candidate)
        })

      return {
        recommendationSetHash,
        rows: scoredRows.map((row, index) => ({
          rank: index + 1,
          ...row
        }))
      }
    })

  return {
    version,
    idsetHash,
    idsetEach,
    graphOutMany,
    graphInMany,
    graphOutIdset,
    graphInIdset,
    graphTwoHopCounts,
    rankedDiff,
    recommendByTwoHop
  }
}

export { idsetDiff, idsetEmpty, idsetFromValues, idsetIntersect, idsetUnion }
export type {
  GraphInIdsetRow,
  GraphInManyRow,
  GraphOutIdsetRow,
  GraphOutManyRow,
  IdsetEachRow,
  IdSetExpression,
  RankedDiffRow,
  TwoHopCountRow
}
