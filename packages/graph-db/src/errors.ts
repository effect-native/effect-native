/**
 * Tagged errors for graph-db operations.
 *
 * @since 0.1.0
 */

import * as Data from "effect/Data"
import type { SchemaIncompatible } from "./SchemaPlan.js"

export class GraphEnsureError extends Data.TaggedError("GraphEnsureError")<{
  readonly reason: "IncompatiblePlan" | "Execution"
  readonly detail: string
  readonly tableName?: string | undefined
  readonly incompatible?: ReadonlyArray<SchemaIncompatible> | undefined
  readonly cause?: unknown
}> {}

export class GraphInvariantError extends Data.TaggedError("GraphInvariantError")<{
  readonly detail: string
  readonly context?: string | undefined
  readonly cause?: unknown
}> {}

export class GraphSqlDialectError extends Data.TaggedError("GraphSqlDialectError")<{
  readonly operation: string
  readonly tableName?: string | undefined
  readonly detail: string
  readonly cause?: unknown
}> {}
