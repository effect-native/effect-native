/**
 * Graph dialect service contract.
 *
 * @since 0.1.0
 */

import type * as Effect from "effect/Effect"
import * as ServiceMap from "effect/ServiceMap"
import type * as SqlClient from "effect/unstable/sql/SqlClient"
import type { GraphEnsureError, GraphSqlDialectError } from "./errors.js"
import type { TableDef, TablePlan } from "./SchemaPlan.js"

export interface GraphDialect {
  readonly planTable: (
    table: TableDef
  ) => Effect.Effect<TablePlan, GraphSqlDialectError, SqlClient.SqlClient>

  readonly ensureTable: (
    table: TableDef
  ) => Effect.Effect<TablePlan, GraphEnsureError | GraphSqlDialectError, SqlClient.SqlClient>
}

export const GraphDialect = ServiceMap.Service<GraphDialect>("@effect-native/graph-db/GraphDialect")
