import { describe, it } from "@effect/vitest"

// Keep capability tests as TODOs for now. We'll add explicit harnesses
// that disable capabilities and assert the precise failures later.

describe("CrSql capability: unhex missing", () => {
  it.todo("fails with UnhexUnavailable when unhex() is missing")
})

describe("CrSql capability: crsqlite missing", () => {
  it.todo("fails with CrSqliteExtensionMissing when crsql_site_id() is missing")
})
