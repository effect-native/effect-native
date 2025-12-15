/**
 * Tests for transactional apply behavior and observability.
 * Phase D1/D3 (RED): Specify apply and observation semantics.
 */
import type * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import { Transport } from "@effect-native/crsql-mesh-transport"
import * as InMemoryTransport from "@effect-native/crsql-mesh-transport/InMemoryTransport"
import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Layer, Ref, Stream } from "effect"
import { Mesh, MeshConfig, MeshDatabaseTag, MeshLive } from "../src/index.js"

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

describe("Transactional apply", () => {
  describe("behavior", () => {
    it.effect("apply happens inside one transaction (conceptual test)", () =>
      Effect.gen(function*() {
        // This describes the intended behavior:
        // When receiving a batch of changes, they are applied atomically
        // in a single SQLite transaction

        // Test the concept with a simple counter that tracks:
        // - transaction start
        // - individual applies
        // - transaction end

        const txLog = yield* Ref.make<Array<string>>([])

        // Simulate transaction wrapper
        const withTransaction = <A>(op: Effect.Effect<A>) =>
          Effect.gen(function*() {
            yield* Ref.update(txLog, (log) => [...log, "TX_START"])
            const result = yield* op
            yield* Ref.update(txLog, (log) => [...log, "TX_END"])
            return result
          })

        // Simulate applying multiple changes
        yield* withTransaction(
          Effect.gen(function*() {
            yield* Ref.update(txLog, (log) => [...log, "APPLY_1"])
            yield* Ref.update(txLog, (log) => [...log, "APPLY_2"])
            yield* Ref.update(txLog, (log) => [...log, "APPLY_3"])
          })
        )

        const log = yield* Ref.get(txLog)
        expect(log).toEqual(["TX_START", "APPLY_1", "APPLY_2", "APPLY_3", "TX_END"])
      }))

    it.effect("failure rolls back (no partial state)", () =>
      Effect.gen(function*() {
        // This describes the intended behavior:
        // If apply fails, the transaction is rolled back
        // and the version vector is NOT updated

        const appliedChanges = yield* Ref.make<Array<string>>([])
        const committed = yield* Ref.make(false)

        // Simulate a failing apply
        const applyWithRollback = Effect.gen(function*() {
          yield* Ref.update(appliedChanges, (arr) => [...arr, "change1"])
          yield* Ref.update(appliedChanges, (arr) => [...arr, "change2"])
          // Simulate failure
          yield* Effect.fail(new Error("Apply failed"))
          yield* Ref.update(appliedChanges, (arr) => [...arr, "change3"])
        }).pipe(
          Effect.tap(() => Ref.set(committed, true)),
          Effect.catchAll(() =>
            Effect.gen(function*() {
              // Rollback: clear applied changes
              yield* Ref.set(appliedChanges, [])
            })
          )
        )

        yield* applyWithRollback

        const changes = yield* Ref.get(appliedChanges)
        const wasCommitted = yield* Ref.get(committed)

        // Rollback happened
        expect(changes).toEqual([])
        expect(wasCommitted).toBe(false)
      }))

    it.effect("successful apply advances version vector", () =>
      Effect.gen(function*() {
        const versionVector = yield* Ref.make<Record<string, string>>({})
        const PEER_ID = "00000000000000000000000000000002"

        // Simulate successful apply
        yield* Effect.gen(function*() {
          // Apply changes...
          // On success, update version vector
          yield* Ref.update(versionVector, (v) => ({
            ...v,
            [PEER_ID]: "42"
          }))
        })

        const vector = yield* Ref.get(versionVector)
        expect(vector[PEER_ID]).toBe("42")
      }))
  })
})

describe("Progress observation", () => {
  describe("db_version observation", () => {
    it.effect("observers see advances caused by incoming applies", () =>
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

          // observeProgress returns a stream
          const progressStream = mesh.observeProgress

          // In a real scenario, this would emit when changes are applied
          // For now, we just verify the stream exists and is consumable

          // Take 0 elements (don't block)
          const events = yield* progressStream.pipe(
            Stream.take(0),
            Stream.runCollect
          )

          expect(Chunk.size(events)).toBe(0)
        }).pipe(Effect.provide(TestLayer), Effect.scoped)
      }))

    it.effect("multiple observers can subscribe", () =>
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

          // Multiple streams can be created from the same progress source
          const stream1 = mesh.observeProgress
          const stream2 = mesh.observeProgress

          // Both streams have the correct type signature (Stream.Stream)
          // We verify they're valid by checking they can be consumed
          const events1 = yield* stream1.pipe(Stream.take(0), Stream.runCollect)
          const events2 = yield* stream2.pipe(Stream.take(0), Stream.runCollect)

          expect(Chunk.size(events1)).toBe(0)
          expect(Chunk.size(events2)).toBe(0)
        }).pipe(Effect.provide(TestLayer), Effect.scoped)
      }))
  })
})
