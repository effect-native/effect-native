// import { getCrSqliteExtensionPathSync } from "@effect-native/libcrsql"
// import { getLibSqlitePathSync } from "@effect-native/libsqlite"
import { getCrSqliteExtensionPathSync } from "@effect-native/libcrsql" with { type: "macro" }
import { getLibSqlitePathSync } from "@effect-native/libsqlite" with { type: "macro" }
import { Database } from "bun:sqlite"

async function main() {
  console.log(
    "pathToCrSqliteExtension",
    (await import(getCrSqliteExtensionPathSync(), { assert: { type: "file" } })).default
  )
  console.log("pathToLibSqlite", (await import(getLibSqlitePathSync(), { assert: { type: "file" } })).default)
}

// main().catch((err) => {
//   console.error(err)
// })

console.log("embeddedFiles", Bun.embeddedFiles.length, Bun.embeddedFiles.map((it) => it.name))

console.log("Using SQLite library at:", { pathToLibSqlite: getLibSqlitePathSync() })
Database.setCustomSQLite(getLibSqlitePathSync())

const db = new Database(":memory:")
console.log("LibSqlite loaded successfully?", db.query("SELECT sqlite_version() AS sqliteVersion").get())

try {
  console.log("CRSQLite extension works before loading?", db.query("SELECT hex(crsql_site_id()) AS siteId").get())
} catch (cause) {
  console.log("CRSQLite extension works before loading?", String(cause))
}
db.loadExtension(getCrSqliteExtensionPathSync())
console.log("Using CRSQLite extension at:", { pathToCrSqliteExtension: getCrSqliteExtensionPathSync() })
console.log("CRSQLite extension loaded successfully?", db.query("SELECT hex(crsql_site_id()) AS siteId").get())
