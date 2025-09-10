/**
 * CR-SQLite extension loading and information utilities.
 *
 * This module provides low-level utilities for loading the CR-SQLite extension
 * and retrieving information about it. It handles the dynamic import of the
 * native library, loads the extension into the SQLite connection, and provides
 * structured information about the loaded extension.
 *
 * The main operations include:
 * - Loading the CR-SQLite extension from the native library
 * - Querying extension information (SHA, site ID)
 * - Creating Effect services for dependency injection
 *
 * @since 0.1.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import * as Config from "effect/Config"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as CrSqlErrors from "./CrSqlErrors.js"
import * as CrSqlSchema from "./CrSqlSchema.js"
import * as SqliteClient from "./SqliteClient.js"

const LibCrSqlPath = Config.nonEmptyString("CRSQLITE_LIB_PATH")

/**
 * Query CR-SQLite extension information via SQL functions.
 *
 * Retrieves the extension's SHA and site ID by calling the built-in
 * CR-SQLite functions `crsql_sha()` and `crsql_site_id()`. This requires
 * the extension to already be loaded into the SQLite connection.
 *
 * @since 0.1.0
 * @category Queries
 */
export const sqlExtInfo = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const [info] = yield* sql<CrSqlSchema.ExtInfoSql>`SELECT crsql_sha() as sha, hex(crsql_site_id()) as siteId`
  return CrSqlSchema.ExtInfoSql.make(info)
}).pipe(
  Effect.catchAll((cause) => Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause }))),
  Effect.withSpan("@effect-native/crsql/CrSqliteExtension.sqlExtInfo")
)

/**
 * Load the CR-SQLite extension and return complete information.
 *
 * This function performs the complete extension loading sequence:
 * 1. Dynamically imports the native library
 * 2. Gets the extension file path
 * 3. Loads the extension into the SQLite connection
 * 4. Queries the extension for SHA and site ID
 * 5. Returns complete information including loading metadata
 *
 * @since 0.1.0
 * @category Operations
 */
export const loadLibCrSql = Effect.gen(function*() {
  // Prefer explicit config when provided; otherwise, fall back to dynamic detection
  const path = yield* LibCrSqlPath.pipe(
    Effect.catchAll(() =>
      Effect.gen(function*() {
        // Dynamic import to avoid static dependency (keeps docgen simple)
        const mod: any = yield* Effect.promise(() => import("@effect-native/libcrsql/effect"))
        const detected = yield* mod.getCrSqliteExtensionPath()
        return detected as string
      })
    )
  )
  yield* SqliteClient.loadExtension(path)
  return CrSqlSchema.ExtInfo.make({ ...(yield* sqlExtInfo), path, loadedAt: yield* DateTime.now })
}).pipe(
  Effect.catchAll((cause) => new CrSqlErrors.CrSqliteExtensionMissing({ cause })),
  Effect.withSpan("@effect-native/crsql/CrSqliteExtension.loadLibCrSql")
)

/**
 * Effect service for accessing loaded CR-SQLite extension information.
 *
 * This service automatically loads the CR-SQLite extension and provides
 * access to the complete extension information including SHA, site ID,
 * filesystem path, and loading timestamp.
 *
 * @since 0.1.0
 * @category Services
 */
export class ExtInfoLoaded extends Effect.Service<ExtInfoLoaded>()(
  "@effect-native/crsql/CrSqliteExtension.ExtInfoLoaded",
  { effect: loadLibCrSql }
) {}
