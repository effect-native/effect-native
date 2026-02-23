/**
 * Test preload: configures bun:sqlite to use our custom libsqlite3
 * (built with enableLoadExtension=true) and sets CRSQLITE_PATH so
 * that CrSql.Default and friends can find the native extension
 * without requiring the env var to be set externally.
 *
 * IMPORTANT: setCustomSQLite MUST be called BEFORE any Database
 * instances are created, which is why this lives in the preload.
 */
import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
import { Database } from "bun:sqlite"
import { pathToLibSqlite } from "../../libsqlite/src/index.js"

Database.setCustomSQLite(pathToLibSqlite)
process.env.CRSQLITE_PATH ??= pathToCrSqliteExtension
