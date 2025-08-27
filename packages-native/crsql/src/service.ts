import * as SqlClient from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"

// Service class using Effect.Service pattern
export class CrSql extends Effect.Service<CrSql>()("@effect-native/crsql/CrSql", {
  accessors: true,
  // Service implementation will be provided by the scoped effect
  scoped: Effect.gen(function*() {
    // Acquire the SQL client constructor/template
    const sql = yield* SqlClient.SqlClient

    // Build prepared statement for getting site ID as hex
    const getSiteIdHex = sql<{ site_id: string }>`SELECT hex(crsql_site_id()) AS site_id`.pipe(
      Effect.map((rows) => rows[0].site_id)
    )

    return {
      getSiteIdHex
    }
  })
}) {}
