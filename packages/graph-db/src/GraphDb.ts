/**
 * GraphDb service constructor.
 *
 * @since 0.1.0
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ServiceMap from "effect/ServiceMap"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { GraphEnsureError, GraphSqlDialectError } from "./errors.js"
import { GraphDialect } from "./GraphDialect.js"
import type { EdgeRepository } from "./repos/edgeRepo.js"
import { makeEdgeRepository } from "./repos/edgeRepo.js"
import type { NodeRepository } from "./repos/nodeRepo.js"
import { makeNodeRepository } from "./repos/nodeRepo.js"
import { mergeTablePlans, type SchemaPlan } from "./SchemaPlan.js"
import type { GraphSpec } from "./spec.js"
import { tablesFromSpec } from "./spec.js"

export interface GraphDbService {
  readonly ensure: Effect.Effect<SchemaPlan, GraphEnsureError | GraphSqlDialectError>
  readonly node: NodeRepository
  readonly edge: EdgeRepository
}

let graphDbServiceCounter = 0

const nextGraphDbTagName = (name?: string): string => {
  graphDbServiceCounter = graphDbServiceCounter + 1
  const label = name ?? "default"
  return `@effect-native/graph-db/GraphDb/${label}/${graphDbServiceCounter}`
}

export const makeGraphDb = (spec: GraphSpec) => {
  const GraphDb = ServiceMap.Service<GraphDbService>(nextGraphDbTagName(spec.name))

  const layer = Layer.effect(
    GraphDb,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const dialect = yield* GraphDialect

      const ensure = sql.withTransaction(
        Effect.forEach(
          tablesFromSpec(spec),
          (table) => dialect.ensureTable(table).pipe(Effect.provideService(SqlClient.SqlClient, sql))
        )
      ).pipe(
        Effect.map(mergeTablePlans),
        Effect.catch((cause) =>
          cause instanceof GraphEnsureError || cause instanceof GraphSqlDialectError
            ? Effect.fail(cause)
            : Effect.fail(
              new GraphSqlDialectError({
                operation: "ensure",
                detail: "Unexpected SQL transaction failure during ensure",
                cause
              })
            )
        )
      )

      const node = makeNodeRepository({ spec, sql })
      const edge = makeEdgeRepository({ spec, sql })

      return {
        ensure,
        node,
        edge
      }
    })
  )

  return {
    GraphDb,
    layer
  } as const
}
