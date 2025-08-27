import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as SqlClient from "@effect/sql/SqlClient"

// Service interface (to be expanded with prepared operations)
export interface CrSqlService {
  // Example API we will implement via prepared statements
  readonly getSiteIdHex: Effect.Effect<string>
}

export const CrSql = Context.GenericTag<CrSqlService>("@effect-native/crsql/CrSql")

// Live layer builder: requires an SqlClient.SqlClient
export const layer = Layer.effect(
  CrSql,
  Effect.gen(function* () {
    // Acquire the SQL client constructor/template
    const _sql = yield* SqlClient.SqlClient
    void _sql // Marking as intentionally unused during red phase

    // TODO: build prepared statements here using `_sql` and expose implementation
    // For the initial red test, we intentionally leave behavior unimplemented
    const notImplemented = Effect.dieMessage("@effect-native/crsql: getSiteIdHex not implemented yet")

    const service: CrSqlService = {
      getSiteIdHex: notImplemented
    }

    return service
  })
)

