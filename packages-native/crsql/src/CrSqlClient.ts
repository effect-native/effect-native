import * as LibCrSql from "@effect-native/libcrsql/effect"
import * as SqlClient from "@effect/sql/SqlClient"
import { Effect } from "effect"
import * as Layer from "effect/Layer"
import * as CrSql from "./CrSql.js"
import { SqliteClient } from "./SqliteClient.js"

const makeCrSqliteClient = Effect.gen(function*() {
  const sql = yield* SqliteClient
  yield* sql.loadExtension(yield* LibCrSql.getCrSqliteExtensionPath())
  yield* Effect.addFinalizer(() => CrSql.finalize.pipe(Effect.ignore))
  return yield* Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    yield* CrSql.getSiteIdHex
    return {
      sql,
      getSiteIdHex: CrSql.getSiteIdHex
    } as const
  }).pipe(Effect.provide(Layer.succeed(SqlClient.SqlClient, sql)))
})

export class CrSqliteClient extends Effect.Service<CrSqliteClient>()("CrSqliteClient", {
  effect: makeCrSqliteClient
}) {}
