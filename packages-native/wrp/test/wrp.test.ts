import { assert, describe, it } from "@effect/vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import { tmpdir } from "node:os"
import * as Effect from "effect/Effect"
import { addWish, evaluateManual, initWorkspace, listNodes } from "../src/core.js"
import { loadConfig } from "../src/config.js"
import { readNodeById } from "../src/fsNodes.js"

const makeTempDir = () =>
  Effect.tryPromise({
    try: () => fs.mkdtemp(path.join(tmpdir(), "wrp-")),
    catch: (error) => error as Error
  })

describe("wrp cli core", () => {
  it.effect("creates wishes and lists them by tag", () =>
    Effect.gen(function*() {
      const dir = yield* makeTempDir()
      yield* initWorkspace(dir)
      yield* addWish(dir, "Review PR 123", ["work", "tomorrow"])

      const wishes = yield* listNodes(dir, { kind: "wish", tag: "tomorrow" })
      const ids = wishes.map((wish) => wish.id)

      assert.ok(ids.some((id) => id === "w-use-system-tomorrow"))
      assert.ok(ids.some((id) => id.includes("review-pr-123")))
    }))

  it.effect("manual evaluation updates claim status and logs", () =>
    Effect.gen(function*() {
      const dir = yield* makeTempDir()
      const { promptgraphDir } = yield* loadConfig(dir)
      yield* initWorkspace(dir)
      const node = yield* readNodeById(dir, promptgraphDir, "w-use-system-tomorrow")
      assert.exists(node)

      const result = yield* evaluateManual(dir, node!, "y")
      assert.strictEqual(result.updated.claimStatus, "supported")

      const logContent = yield* Effect.tryPromise({
        try: () => fs.readFile(result.logPath, "utf8"),
        catch: (error) => error as Error
      })

      assert.match(logContent, /w-use-system-tomorrow unexamined -> supported/)
    }))
})
