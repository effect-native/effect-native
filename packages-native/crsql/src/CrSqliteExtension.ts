import * as SqlClient from "@effect/sql/SqlClient"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as CrSqlErrors from "./CrSqlErrors.js"
import * as CrSqlSchema from "./CrSqlSchema.js"
import * as SqliteClient from "./SqliteClient.js"

const importLibCrSql = Effect.tryPromise({
  try: () => import("@effect-native/libcrsql/effect"),
  catch: (cause) => new CrSqlErrors.CrSqliteExtensionMissing({ cause })
}).pipe(Effect.withSpan("import(@effect-native/libcrsql/effect)"))

export const sqlExtInfo = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const [info] = yield* sql<CrSqlSchema.ExtInfoSql>`SELECT crsql_sha() as sha, hex(crsql_site_id()) as siteId`
  return CrSqlSchema.ExtInfoSql.make(info)
}).pipe(
  Effect.catchAll((cause) => new CrSqlErrors.CrSqliteExtensionMissing({ cause })),
  Effect.withSpan("@effect-native/crsql/CrSqliteExtension.sqlExtInfo")
)

export const loadLibCrSql = Effect.gen(function*() {
  const LibCrSql = yield* importLibCrSql
  const path = yield* LibCrSql.getCrSqliteExtensionPath()
  yield* SqliteClient.loadExtension(path)
  return CrSqlSchema.ExtInfo.make({ ...yield* sqlExtInfo, path, loadedAt: yield* DateTime.now })
}).pipe(
  Effect.catchAll((cause) =>
    cause._tag === "CrSqliteExtensionMissing" ?
      Effect.fail(cause) :
      new CrSqlErrors.CrSqliteExtensionMissing({ cause })
  ),
  Effect.withSpan("@effect-native/crsql/CrSqliteExtension.loadLibCrSql")
)

export class ExtInfoLoaded extends Effect.Service<ExtInfoLoaded>()(
  "@effect-native/crsql/CrSqliteExtension.ExtInfoLoaded",
  { effect: loadLibCrSql }
) {}
