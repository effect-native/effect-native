/**
 * Tests for Mesh public surface.
 * Phase A1 (RED): Define the public API expectations.
 */
import { describe, expect, it } from "@effect/vitest"
import type { Stream } from "effect"
import { Context, Effect, Layer } from "effect"
import type { Mesh as MeshTag, MeshService } from "../src/index.js"

describe("Mesh", () => {
  describe("public surface", () => {
    it.effect("is a Context.Tag", () =>
      Effect.gen(function*() {
        const { Mesh } = yield* Effect.promise(() => import("../src/index.js"))
        expect(Context.isTag(Mesh)).toBe(true)
      }))

    it.effect("MeshLive is a Layer", () =>
      Effect.gen(function*() {
        const { MeshLive } = yield* Effect.promise(() => import("../src/index.js"))
        expect(Layer.isLayer(MeshLive)).toBe(true)
      }))

    it.effect("MeshConfig is exported", () =>
      Effect.gen(function*() {
        const mod = yield* Effect.promise(() => import("../src/index.js"))
        expect(mod.MeshConfig).toBeDefined()
        expect(Context.isTag(mod.MeshConfig)).toBe(true)
      }))
  })

  describe("service capabilities", () => {
    it("exposes run capability that returns an Effect", () => {
      // Type assertion to verify the shape at compile time
      const _typeCheck: MeshService["run"] extends Effect.Effect<never, unknown, unknown> ? true : false = true
      expect(_typeCheck).toBe(true)
    })

    it("exposes shutdown capability that returns an Effect", () => {
      const _typeCheck: MeshService["shutdown"] extends Effect.Effect<void, unknown, unknown> ? true : false = true
      expect(_typeCheck).toBe(true)
    })

    it("exposes versionVector capability that returns an Effect", () => {
      const _typeCheck: MeshService["versionVector"] extends Effect.Effect<unknown, unknown, unknown> ? true : false =
        true
      expect(_typeCheck).toBe(true)
    })

    it("exposes observeProgress capability that returns a Stream", () => {
      // Stream<A, E, R> - check it extends Stream with any type parameters
      type IsStream = MeshService["observeProgress"] extends Stream.Stream<infer _A, infer _E, infer _R> ? true : false
      const _typeCheck: IsStream = true
      expect(_typeCheck).toBe(true)
    })
  })
})

// Type-level test to ensure Mesh is a Tag
declare const _meshTagCheck: MeshTag extends Context.Tag<infer _I, infer _S> ? true : false
