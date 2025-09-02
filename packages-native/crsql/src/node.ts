import * as CrSql from "@effect-native/crsql/CrSql"
import * as LibCrSql from "@effect-native/libcrsql/effect"
import { Effect } from "effect"
import * as Data from "effect/Data"

export class NodeSqliteImportError extends Data.TaggedError("NodeSqliteImportError")<{ cause: unknown }> {}

const importSqlite = Effect.tryPromise({
  try: () => import("@effect/sql-sqlite-node"),
  catch: (cause) => new NodeSqliteImportError({ cause })
})

export const NodeCrSqliteLayer = Effect.gen(function*() {
  const { SqliteClient } = yield* importSqlite
  const sql = yield* SqliteClient.SqliteClient
  yield* sql.loadExtension(yield* LibCrSql.getCrSqliteExtensionPath())
  yield* Effect.addFinalizer(() => CrSql.finalize.pipe(Effect.ignore))
  yield* CrSql.getSiteIdHex
})
