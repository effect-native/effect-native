import * as SqlClient from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"

// Service class using Effect.Service pattern
export class CrSql extends Effect.Service<CrSql>()("@effect-native/crsql/CrSql", {
  accessors: true,
  // Service implementation will be provided by the scoped effect
  scoped: Effect.gen(function*() {
    // Acquire the SQL client constructor/template
    const _sql = yield* SqlClient.SqlClient
    void _sql // Marking as intentionally unused during red phase

    // TODO: build prepared statements here using `_sql` and expose implementation
    // For the initial red test, we intentionally leave behavior unimplemented
    const notImplemented = Effect.dieMessage("@effect-native/crsql: getSiteIdHex not implemented yet")

    return {
      // Example API we will implement via prepared statements
      getSiteIdHex: notImplemented as Effect.Effect<string>
    }
  })
}) {}
