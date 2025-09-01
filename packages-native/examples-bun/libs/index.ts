/* eslint-disable @typescript-eslint/no-require-imports */
// GOAL: embed and use libsqlite and crsqlite in a compiled Bun single file executable

import { Database } from "bun:sqlite"

// 1. get the original paths at compile time
import { getCrSqliteExtensionPathSync } from "@effect-native/libcrsql" with { type: "macro" }
import { getLibSqlitePathSync } from "@effect-native/libsqlite" with { type: "macro" }

// 2. embed the files so they are included in the compiled binary
// NOTE: use require to make it synchronous
const embeddedCrSqliteExtensionPath: string = require(getCrSqliteExtensionPathSync())
const embeddedLibSqlitePath: string = require(getLibSqlitePathSync())

// 3. enable the embedded files to be loaded by writing them out to the filesystem
// causes bun build to include them in the compiled binary
const embeddedCrSqliteExtensionFile = Bun.file(embeddedCrSqliteExtensionPath)
const embeddedLibSqliteFile = Bun.file(embeddedLibSqlitePath)

const exportedCrSqliteExtensionPath = `./.${embeddedCrSqliteExtensionFile.name}`
const exportedLibSqlitePath = `./.${embeddedLibSqliteFile.name}`

Bun.write(exportedCrSqliteExtensionPath, embeddedCrSqliteExtensionFile)
Bun.write(exportedLibSqlitePath, embeddedLibSqliteFile)

// 4. use the exported paths at runtime
Database.setCustomSQLite(exportedLibSqlitePath)

const db = new Database(":memory:")
console.log("LibSqlite loaded successfully?", db.query("SELECT sqlite_version() AS sqliteVersion").get())

db.loadExtension(exportedCrSqliteExtensionPath, "sqlite3_crsqlite_init")
console.log("CRSQLite extension loaded successfully?", db.query("SELECT hex(crsql_site_id()) AS siteId").get())
