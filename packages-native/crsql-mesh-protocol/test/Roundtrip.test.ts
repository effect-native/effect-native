/**
 * Roundtrip encode/decode tests.
 *
 * These tests specify that encoding then decoding a message yields equivalent structure.
 */
import { describe, it } from "@effect/vitest"
import { Effect, Schema as S } from "effect"
import * as Messages from "../src/Messages.js"

describe("Roundtrip encode/decode", () => {
  it.effect("VersionSummary roundtrips through JSON", () =>
    Effect.gen(function*() {
      const original: Messages.VersionSummary = {
        localSiteId: "AABBCCDD11223344556677889900EEFF",
        peers: {
          "AABBCCDD11223344556677889900EEFF": "42",
          "11223344556677889900AABBCCDDEEFF": "100"
        }
      }
      const encoded = yield* S.encode(Messages.VersionSummary)(original)
      const decoded = yield* S.decode(Messages.VersionSummary)(encoded)
      yield* Effect.sync(() => {
        if (decoded.localSiteId !== original.localSiteId) {
          throw new Error("localSiteId mismatch after roundtrip")
        }
        if (Object.keys(decoded.peers).length !== Object.keys(original.peers).length) {
          throw new Error("peers length mismatch after roundtrip")
        }
      })
    }))

  it.effect("DiffRequest roundtrips through JSON", () =>
    Effect.gen(function*() {
      const original: Messages.DiffRequest = {
        summary: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: {}
        },
        maxChangeRows: 500
      }
      const encoded = yield* S.encode(Messages.DiffRequest)(original)
      const decoded = yield* S.decode(Messages.DiffRequest)(encoded)
      yield* Effect.sync(() => {
        if (decoded.maxChangeRows !== original.maxChangeRows) {
          throw new Error("maxChangeRows mismatch after roundtrip")
        }
      })
    }))

  it.effect("DiffResponse roundtrips through JSON", () =>
    Effect.gen(function*() {
      const changeRow: Messages.ChangeRowSerialized = {
        table: "todos",
        pk: "AABBCCDD",
        cid: "title",
        val: "Test item",
        val_type: "text",
        col_version: "1",
        db_version: "1",
        site_id: "AABBCCDD11223344556677889900EEFF",
        cl: 0,
        seq: 0
      }
      const original: Messages.DiffResponse = {
        changeRows: [changeRow],
        hasMore: true,
        summary: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: { "AABBCCDD11223344556677889900EEFF": "1" }
        }
      }
      const encoded = yield* S.encode(Messages.DiffResponse)(original)
      const decoded = yield* S.decode(Messages.DiffResponse)(encoded)
      yield* Effect.sync(() => {
        if (decoded.changeRows.length !== original.changeRows.length) {
          throw new Error("changeRows length mismatch after roundtrip")
        }
        if (decoded.hasMore !== original.hasMore) {
          throw new Error("hasMore mismatch after roundtrip")
        }
      })
    }))

  it.effect("MeshMessage with VersionSummary payload roundtrips", () =>
    Effect.gen(function*() {
      const original: Messages.MeshMessage = {
        kind: "VersionSummary",
        seq: 42,
        sender: "AABBCCDD11223344556677889900EEFF",
        payload: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: {}
        }
      }
      const encoded = yield* S.encode(Messages.MeshMessage)(original)
      const decoded = yield* S.decode(Messages.MeshMessage)(encoded)
      yield* Effect.sync(() => {
        if (decoded.kind !== original.kind) {
          throw new Error("kind mismatch after roundtrip")
        }
        if (decoded.seq !== original.seq) {
          throw new Error("seq mismatch after roundtrip")
        }
        if (decoded.sender !== original.sender) {
          throw new Error("sender mismatch after roundtrip")
        }
      })
    }))

  it.effect("MeshMessage with DiffRequest payload roundtrips", () =>
    Effect.gen(function*() {
      const original: Messages.MeshMessage = {
        kind: "DiffRequest",
        seq: 1,
        sender: "AABBCCDD11223344556677889900EEFF",
        payload: {
          summary: {
            localSiteId: "AABBCCDD11223344556677889900EEFF",
            peers: {}
          }
        }
      }
      const encoded = yield* S.encode(Messages.MeshMessage)(original)
      const decoded = yield* S.decode(Messages.MeshMessage)(encoded)
      yield* Effect.sync(() => {
        if (decoded.kind !== "DiffRequest") {
          throw new Error("kind mismatch after roundtrip")
        }
      })
    }))

  it.effect("MeshMessage with DiffResponse payload roundtrips", () =>
    Effect.gen(function*() {
      const original: Messages.MeshMessage = {
        kind: "DiffResponse",
        seq: 99,
        sender: "AABBCCDD11223344556677889900EEFF",
        payload: {
          changeRows: [],
          hasMore: false,
          summary: {
            localSiteId: "AABBCCDD11223344556677889900EEFF",
            peers: {}
          }
        }
      }
      const encoded = yield* S.encode(Messages.MeshMessage)(original)
      const decoded = yield* S.decode(Messages.MeshMessage)(encoded)
      yield* Effect.sync(() => {
        if (decoded.kind !== "DiffResponse") {
          throw new Error("kind mismatch after roundtrip")
        }
        if (decoded.seq !== 99) {
          throw new Error("seq mismatch after roundtrip")
        }
      })
    }))
})
