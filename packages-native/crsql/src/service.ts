import * as SqlClient from "@effect/sql/SqlClient"
import type * as Statement from "@effect/sql/Statement"
import * as Effect from "effect/Effect"

// Type for a change row from crsql_changes
export interface ChangeRow {
  table: string
  pk: string // hex-encoded primary key
  cid: string // column id
  val: unknown // value (can be null, string, number, or hex for blob)
  val_type: string // typeof(val) from SQLite
  col_version: string // as TEXT to avoid JS precision issues
  db_version: string // as TEXT to avoid JS precision issues
  site_id: string // hex-encoded site id
  cl: number // causal length
  seq: number // sequence number
}

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

    // Get database version using CR-SQLite function
    const getDbVersion = sql<{ version: string }>`SELECT CAST(crsql_db_version() AS TEXT) AS version`.pipe(
      Effect.map((rows) => rows[0].version)
    )

    // Pull changes from the database
    const pullChanges = (since: string = "0", excludeSites?: ReadonlyArray<string>) => {
      if (excludeSites && excludeSites.length > 0) {
        return sql<ChangeRow>`
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
      } else {
        return sql<ChangeRow>`
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
      }
    }

    // Apply changes to the database in a single transaction
    const applyChanges = (changes: ReadonlyArray<ChangeRow>) => {
      return sql.withTransaction(
        Effect.forEach(changes, (change) =>
          sql`
            INSERT INTO crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq)
            VALUES (
              ${change.table},
              unhex(${change.pk}),
              ${change.cid},
              CASE 
                WHEN ${change.val_type} = 'null' THEN NULL
                WHEN ${change.val_type} = 'blob' THEN unhex(${change.val as Statement.Primitive})
                ELSE ${change.val as Statement.Primitive}
              END,
              CAST(${change.col_version} AS INTEGER),
              CAST(${change.db_version} AS INTEGER),
              unhex(${change.site_id}),
              ${change.cl},
              ${change.seq}
            )
          `, { concurrency: "unbounded" })
      ).pipe(Effect.asVoid)
    }

    return {
      getSiteIdHex,
      getDbVersion,
      pullChanges,
      applyChanges
    }
  })
}) {}
