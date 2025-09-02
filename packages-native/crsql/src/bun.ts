import * as CrSql from "@effect-native/crsql/CrSql"
import * as LibCrSql from "@effect-native/libcrsql/effect"
import { Effect } from "effect"
import * as Data from "effect/Data"

export class BunSqliteImportError extends Data.TaggedError("BunSqliteImportError")<{ cause: unknown }> {}

const importSqlite = Effect.tryPromise({
  try: () => import("@effect/sql-sqlite-bun"),
  catch: (cause) => new BunSqliteImportError({ cause })
})

export const BunCrSqliteLayer = Effect.gen(function*() {
  const { SqliteClient } = yield* importSqlite
  const sql = yield* SqliteClient.SqliteClient
  yield* sql.loadExtension(yield* LibCrSql.getCrSqliteExtensionPath())
  yield* Effect.addFinalizer(() => CrSql.finalize.pipe(Effect.ignore))
  yield* CrSql.getSiteIdHex
})
