import { describe, it } from "@effect/vitest"

/**
 * Capability Tests (Deferred)
 *
 * These tests require purpose-built harnesses that run SQLite under
 * constrained environments (e.g., with `unhex()` removed or the
 * CR-SQLite extension unavailable). Standing up those matrices is out of
 * scope for the first release, so we explicitly mark these as TODO and
 * not planned for v1.0.0.
 *
 * Rationale: We follow a fail-fast policy at runtime, but creating
 * synthetic environments in CI to remove capabilities is non-trivial and
 * better handled as a dedicated follow-up.
 */

describe("CrSql capability: unhex missing", () => {
  it.todo("fails with UnhexUnavailable when unhex() is missing")
})

describe("CrSql capability: crsqlite missing", () => {
  it.todo("fails with CrSqliteExtensionMissing when crsql_site_id() is missing")
})
