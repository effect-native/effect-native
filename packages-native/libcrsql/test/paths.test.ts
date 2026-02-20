import * as path from "node:path"
import { describe, expect, it } from "bun:test"

import * as Paths from "../src/paths.js"

describe("paths entrypoint", () => {
  for (const [key, value] of Object.entries(Paths)) {
    it(`${key} is absolute`, () => {
      expect(typeof value).toBe("string")
      expect(path.isAbsolute(value)).toBe(true)
    })
  }
})
