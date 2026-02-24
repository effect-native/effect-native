import { describe, expect, it } from "@effect-native/bun-test"
import { makeGraphDb } from "@effect-native/graph-db"

describe("@effect-native/graph-db", () => {
  it("exports makeGraphDb", () => {
    expect(typeof makeGraphDb).toBe("function")
  })
})
