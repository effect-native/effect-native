import { describe, it } from "@effect-native/bun-test"

// Integration test is opt-in: set RUN_INTEGRATION=1 and install better-sqlite3
const run = process.env.RUN_INTEGRATION === "1"

const _describe = run ? describe : describe.skip
_describe("integration: load extension with better-sqlite3", () => {
  it("loads extension", async () => {
    const { default: Database } = await import("better-sqlite3")
    const { pathToCrSqliteExtension } = await import("../src/index.js")
    const db = new Database(":memory:")
    db.loadExtension(pathToCrSqliteExtension)
    // Simple query to ensure DB remains usable
    db.prepare("SELECT 1").get()
    db.close()
  })
})
