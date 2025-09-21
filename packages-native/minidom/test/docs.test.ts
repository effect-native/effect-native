import { describe, expect, it } from "@effect/vitest"
import * as fs from "node:fs/promises"
import * as path from "node:path"

describe("MiniDom documentation [FR1.3][FR1.14][SC7.11]", () => {
  it("mentions Schema.samples registries in the README", async () => {
    const readmePath = path.join(__dirname, "..", "README.md")
    const readme = await fs.readFile(readmePath, "utf8")

    expect(readme).toContain("Schema.samples.sqlArticleRegistry")
    expect(readme).toContain("Schema.toStandardSchemaV1")
  })
})
