import * as SqlClient from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"
import * as Errors from "./errors.js"
import type * as CrSqlSchema from "./schema.js"

// Type for a pre-serialized change row (derived from Schema).
// We purposefully use the Serialized (transport) shape throughout this service to:
// - align with what SQL actually returns (hex for blobs, bigint as string)
// - avoid bigint precision issues at the IO boundary
// Callers can convert to a parsed representation (e.g. bigint in code via S.BigInt) in their own layers.
export type ChangeRow = CrSqlSchema.ChangeRowSerialized

// Service class using Effect.Service pattern
export class CrSql extends Effect.Service<CrSql>()("@effect-native/crsql/CrSql", {
  accessors: true,
  // Service implementation will be provided by the scoped effect
  scoped: Effect.gen(function*() {
    // Acquire the SQL client constructor/template
    const sql = yield* SqlClient.SqlClient

    // Capability checks: verify required SQL functions are available
    // 1) unhex(): available in SQLite >= 3.41.0
    yield* sql`SELECT hex(unhex('00')) as ok`.pipe(
      Effect.catchAll((cause) => Effect.fail(new Errors.UnhexUnavailable({ cause })))
    )

    // 2) crsql_site_id(): indicates CR-SQLite extension is loaded
    yield* sql`SELECT hex(crsql_site_id()) as site_id`.pipe(
      Effect.catchAll((cause) => Effect.fail(new Errors.CrSqliteExtensionMissing({ cause })))
    )

    // Build prepared statement for getting site ID as hex (pre-serialized)
    const getSiteIdHex = Effect.fn("@effect-native/crsql/getSiteIdHex")(function*() {
      const rows = yield* sql<{ site_id: CrSqlSchema.SiteIdHex }>`SELECT hex(crsql_site_id()) AS site_id`
      return rows[0].site_id
    })()

    // Get database version using CR-SQLite function
    const getDbVersion = Effect.fn("@effect-native/crsql/getDbVersion")(function*() {
      const rows = yield* sql<
        { version: CrSqlSchema.VersionString }
      >`SELECT CAST(crsql_db_version() AS TEXT) AS version`
      return rows[0].version
    })()

    // Pull changes from the database (pre-serialized for transport/IO). Consumers may parse as needed.
    const pullChanges = Effect.fn("@effect-native/crsql/pullChanges")(function*(
      since: CrSqlSchema.VersionString = "0",
      excludeSites?: ReadonlyArray<CrSqlSchema.SiteIdHex>
    ) {
      if (excludeSites?.length) {
        return yield* sql<CrSqlSchema.ChangeRowSerialized>`
          SELECT
            "table",
            hex(pk) as pk,
            cid,
            CASE
              WHEN val IS NULL THEN NULL
              WHEN typeof(val) = 'blob' THEN hex(val)
              ELSE val
            END as val,
            typeof(val) as val_type,
            CAST(col_version AS TEXT) as col_version,
            CAST(db_version AS TEXT) as db_version,
            hex(site_id) as site_id,
            cl,
            seq
          FROM crsql_changes
          WHERE db_version > CAST(${since} AS INTEGER)
            AND hex(site_id) NOT IN (${sql.in(excludeSites)})
          ORDER BY db_version, seq
        `
      }
      return yield* sql<CrSqlSchema.ChangeRowSerialized>`
        SELECT
          "table",
          hex(pk) as pk,
          cid,
          CASE
            WHEN val IS NULL THEN NULL
            WHEN typeof(val) = 'blob' THEN hex(val)
            ELSE val
          END as val,
          typeof(val) as val_type,
          CAST(col_version AS TEXT) as col_version,
          CAST(db_version AS TEXT) as db_version,
          hex(site_id) as site_id,
          cl,
          seq
        FROM crsql_changes
        WHERE db_version > CAST(${since} AS INTEGER)
        ORDER BY db_version, seq
      `
    })

    // Apply changes to the database in a single transaction
    const applyChanges = Effect.fn("@effect-native/crsql/applyChanges")(function*(
      changes: ReadonlyArray<CrSqlSchema.ChangeRowSerialized>
    ) {
      yield* sql.withTransaction(
        Effect.forEach(
          changes,
          (change) =>
            sql`
              INSERT INTO crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq)
              VALUES (
                ${change.table},
                unhex(${change.pk}),
                ${change.cid},
                CASE
                  WHEN ${change.val_type} = 'null' THEN NULL
                  WHEN ${change.val_type} = 'blob' THEN unhex(${change.val})
                  ELSE ${change.val}
                END,
                CAST(${change.col_version} AS INTEGER),
                CAST(${change.db_version} AS INTEGER),
                unhex(${change.site_id}),
                ${change.cl},
                ${change.seq}
              )
            `,
          { concurrency: "unbounded", discard: true }
        )
      )
    })

    return {
      getSiteIdHex,
      getDbVersion,
      pullChanges,
      applyChanges
    } as const
  })
}) {}
