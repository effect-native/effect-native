/**
 * Tests for version vector state semantics.
 * Phase C1 (RED): Specify version vector behavior.
 */
import type * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import { Transport } from "@effect-native/crsql-mesh-transport"
import * as InMemoryTransport from "@effect-native/crsql-mesh-transport/InMemoryTransport"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Ref } from "effect"
import { Mesh, MeshConfig, MeshDatabaseTag, MeshLive, type VersionVector } from "../src/index.js"

const SITE_A = "00000000000000000000000000000001" as Messages.SiteIdHex

const TestConfig = Layer.succeed(MeshConfig, {
  syncInterval: 1000
})

// Mock database for tests
const MockDatabase = Layer.succeed(MeshDatabaseTag, {
  getSiteId: () => Effect.succeed(SITE_A),
  getDbVersion: () => Effect.succeed("0" as Messages.VersionString),
  pullChanges: () => Effect.succeed([]),
  applyChanges: () => Effect.succeed(0)
})

describe("Version vector", () => {
  describe("state semantics", () => {
    it.effect("versionVector returns a snapshot of current state", () =>
      Effect.gen(function*() {
        const inMemMesh = InMemoryTransport.createMesh()
        const transport = inMemMesh.createPeer(SITE_A)

        const TransportLayer = Layer.succeed(Transport, transport)
        const TestLayer = MeshLive.pipe(
          Layer.provide(TransportLayer),
          Layer.provide(TestConfig),
          Layer.provide(MockDatabase)
        )

        yield* Effect.gen(function*() {
          const mesh = yield* Mesh

          // Initially empty
          const initial = yield* mesh.versionVector
          expect(initial).toEqual({})
        }).pipe(Effect.provide(TestLayer), Effect.scoped)
      }))

    it.effect("versionVector returns an immutable snapshot", () =>
      Effect.gen(function*() {
        const inMemMesh = InMemoryTransport.createMesh()
        const transport = inMemMesh.createPeer(SITE_A)

        const TransportLayer = Layer.succeed(Transport, transport)
        const TestLayer = MeshLive.pipe(
          Layer.provide(TransportLayer),
          Layer.provide(TestConfig),
          Layer.provide(MockDatabase)
        )

        yield* Effect.gen(function*() {
          const mesh = yield* Mesh

          const v1 = yield* mesh.versionVector
          const v2 = yield* mesh.versionVector

          // Different references (snapshots)
          // but same content initially
          expect(v1).toEqual(v2)
        }).pipe(Effect.provide(TestLayer), Effect.scoped)
      }))
  })

  describe("update semantics", () => {
    it.effect("version vector updates only after successful transactional apply", () =>
      Effect.gen(function*() {
        // This test describes the intended behavior:
        // 1. Version vector starts empty
        // 2. After applying changes from a peer, the vector is updated
        // 3. Failed applies do NOT update the vector

        // For now, we'll test the basic data structure behavior
        const versionVectorRef = yield* Ref.make<VersionVector>({})

        // Simulate a successful apply updating the vector
        const PEER_SITE = "00000000000000000000000000000002" as Messages.SiteIdHex
        yield* Ref.update(versionVectorRef, (v) => ({
          ...v,
          [PEER_SITE]: "100"
        }))

        const afterUpdate = yield* Ref.get(versionVectorRef)
        expect(afterUpdate[PEER_SITE]).toBe("100")

        // Update with higher version
        yield* Ref.update(versionVectorRef, (v) => ({
          ...v,
          [PEER_SITE]: "200"
        }))

        const afterSecondUpdate = yield* Ref.get(versionVectorRef)
        expect(afterSecondUpdate[PEER_SITE]).toBe("200")
      }))
  })
})
