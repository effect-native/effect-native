/**
 * Protocol message schema tests.
 *
 * These tests specify the schema behavior for protocol messages:
 * - VersionSummary, DiffRequest, DiffResponse decode valid payloads
 * - Invalid payloads produce typed decode errors surfaced as ProtocolError
 */
import { describe, it } from "@effect/vitest"
import { Effect, Schema as S } from "effect"
import * as Messages from "../src/Messages.js"

describe("VersionSummary schema", () => {
  it.effect("decodes a valid VersionSummary payload", () =>
    Effect.gen(function*() {
      const payload = {
        localSiteId: "AABBCCDD11223344556677889900EEFF",
        peers: {
          "AABBCCDD11223344556677889900EEFF": "42"
        }
      }
      const decoded = yield* S.decodeUnknown(Messages.VersionSummary)(payload)
      yield* Effect.sync(() => {
        if (decoded.localSiteId !== payload.localSiteId) {
          throw new Error("localSiteId mismatch")
        }
        if (decoded.peers["AABBCCDD11223344556677889900EEFF"] !== "42") {
          throw new Error("peers mismatch")
        }
      })
    }))

  it.effect("rejects invalid VersionSummary with ProtocolError", () =>
    Effect.gen(function*() {
      const invalid = { localSiteId: "not-hex", peers: {} }
      const result = yield* Messages.decodeVersionSummary(invalid).pipe(
        Effect.flip
      )
      if (result._tag !== "ProtocolError") {
        yield* Effect.fail(new Error(`Expected ProtocolError, got ${result._tag}`))
      }
    }))
})

describe("DiffRequest schema", () => {
  it.effect("decodes a valid DiffRequest payload", () =>
    Effect.gen(function*() {
      const payload = {
        summary: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: {}
        }
      }
      const decoded = yield* S.decodeUnknown(Messages.DiffRequest)(payload)
      yield* Effect.sync(() => {
        if (decoded.summary.localSiteId !== "AABBCCDD11223344556677889900EEFF") {
          throw new Error("summary.localSiteId mismatch")
        }
      })
    }))

  it.effect("decodes DiffRequest with optional maxChangeRows", () =>
    Effect.gen(function*() {
      const payload = {
        summary: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: {}
        },
        maxChangeRows: 100
      }
      const decoded = yield* S.decodeUnknown(Messages.DiffRequest)(payload)
      yield* Effect.sync(() => {
        if (decoded.maxChangeRows !== 100) {
          throw new Error("maxChangeRows mismatch")
        }
      })
    }))

  it.effect("rejects invalid DiffRequest with ProtocolError", () =>
    Effect.gen(function*() {
      const invalid = { summary: "not-an-object" }
      const result = yield* Messages.decodeDiffRequest(invalid).pipe(
        Effect.flip
      )
      if (result._tag !== "ProtocolError") {
        yield* Effect.fail(new Error(`Expected ProtocolError, got ${result._tag}`))
      }
    }))
})

describe("DiffResponse schema", () => {
  it.effect("decodes a valid DiffResponse payload", () =>
    Effect.gen(function*() {
      const payload = {
        changeRows: [],
        hasMore: false,
        summary: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: {}
        }
      }
      const decoded = yield* S.decodeUnknown(Messages.DiffResponse)(payload)
      yield* Effect.sync(() => {
        if (decoded.hasMore !== false) {
          throw new Error("hasMore mismatch")
        }
      })
    }))

  it.effect("decodes DiffResponse with changeRows", () =>
    Effect.gen(function*() {
      const changeRow = {
        table: "todos",
        pk: "AABBCCDD",
        cid: "title",
        val: "Test",
        val_type: "text" as const,
        col_version: "1",
        db_version: "1",
        site_id: "AABBCCDD11223344556677889900EEFF",
        cl: 0,
        seq: 0
      }
      const payload = {
        changeRows: [changeRow],
        hasMore: true,
        summary: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: { "AABBCCDD11223344556677889900EEFF": "1" }
        }
      }
      const decoded = yield* S.decodeUnknown(Messages.DiffResponse)(payload)
      yield* Effect.sync(() => {
        if (decoded.changeRows.length !== 1) {
          throw new Error("changeRows length mismatch")
        }
        if (decoded.hasMore !== true) {
          throw new Error("hasMore mismatch")
        }
      })
    }))

  it.effect("rejects invalid DiffResponse with ProtocolError", () =>
    Effect.gen(function*() {
      const invalid = { changeRows: "not-array", hasMore: false, summary: {} }
      const result = yield* Messages.decodeDiffResponse(invalid).pipe(
        Effect.flip
      )
      if (result._tag !== "ProtocolError") {
        yield* Effect.fail(new Error(`Expected ProtocolError, got ${result._tag}`))
      }
    }))
})

describe("MeshMessage schema", () => {
  it.effect("decodes a VersionSummary message", () =>
    Effect.gen(function*() {
      const payload = {
        kind: "VersionSummary",
        seq: 1,
        sender: "AABBCCDD11223344556677889900EEFF",
        payload: {
          localSiteId: "AABBCCDD11223344556677889900EEFF",
          peers: {}
        }
      }
      const decoded = yield* S.decodeUnknown(Messages.MeshMessage)(payload)
      yield* Effect.sync(() => {
        if (decoded.kind !== "VersionSummary") {
          throw new Error("kind mismatch")
        }
        if (decoded.seq !== 1) {
          throw new Error("seq mismatch")
        }
      })
    }))

  it.effect("decodes a DiffRequest message", () =>
    Effect.gen(function*() {
      const payload = {
        kind: "DiffRequest",
        seq: 2,
        sender: "AABBCCDD11223344556677889900EEFF",
        payload: {
          summary: {
            localSiteId: "AABBCCDD11223344556677889900EEFF",
            peers: {}
          }
        }
      }
      const decoded = yield* S.decodeUnknown(Messages.MeshMessage)(payload)
      yield* Effect.sync(() => {
        if (decoded.kind !== "DiffRequest") {
          throw new Error("kind mismatch")
        }
      })
    }))

  it.effect("decodes a DiffResponse message", () =>
    Effect.gen(function*() {
      const payload = {
        kind: "DiffResponse",
        seq: 3,
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
      const decoded = yield* S.decodeUnknown(Messages.MeshMessage)(payload)
      yield* Effect.sync(() => {
        if (decoded.kind !== "DiffResponse") {
          throw new Error("kind mismatch")
        }
      })
    }))

  it.effect("rejects unknown kind with ProtocolError", () =>
    Effect.gen(function*() {
      const invalid = {
        kind: "InvalidKind",
        seq: 1,
        sender: "AABBCCDD11223344556677889900EEFF",
        payload: {}
      }
      const result = yield* Messages.decodeMeshMessage(invalid).pipe(
        Effect.flip
      )
      if (result._tag !== "ProtocolError") {
        yield* Effect.fail(new Error(`Expected ProtocolError, got ${result._tag}`))
      }
    }))

  it.effect("rejects invalid seq (negative) with ProtocolError", () =>
    Effect.gen(function*() {
      const invalid = {
        kind: "VersionSummary",
        seq: -1,
        sender: "AABBCCDD11223344556677889900EEFF",
        payload: { localSiteId: "AABBCCDD11223344556677889900EEFF", peers: {} }
      }
      const result = yield* Messages.decodeMeshMessage(invalid).pipe(
        Effect.flip
      )
      if (result._tag !== "ProtocolError") {
        yield* Effect.fail(new Error(`Expected ProtocolError, got ${result._tag}`))
      }
    }))
})
