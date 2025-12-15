/**
 * Protocol message schema tests.
 *
 * These tests specify the schema behavior for protocol messages:
 * - VersionSummary, DiffRequest, DiffResponse decode valid payloads
 * - Invalid payloads produce typed decode errors surfaced as ProtocolError
 * - Protocol types are structurally compatible with CrSqlSchema types (FR-PROTO-001)
 */
import { describe, it } from "@effect/vitest"
import { Effect, Schema as S } from "effect"
import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
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

/**
 * Schema type alignment tests (FR-PROTO-001).
 *
 * These tests verify that protocol schemas are structurally compatible with
 * the canonical CrSqlSchema types. This ensures the protocol uses the same
 * type definitions rather than structurally-identical copies.
 */
describe("Schema type alignment with CrSqlSchema (FR-PROTO-001)", () => {
  it.effect("SiteIdHex type is assignable to CrSqlSchema.SiteIdHex", () =>
    Effect.gen(function*() {
      // Compile-time check: this would fail if types don't match
      const protocolSiteId: Messages.SiteIdHex = "AABBCCDD11223344556677889900EEFF"
      const crsqlSiteId: CrSqlSchema.SiteIdHex = protocolSiteId
      yield* Effect.sync(() => {
        if (crsqlSiteId !== protocolSiteId) {
          throw new Error("SiteIdHex value mismatch")
        }
      })
    }))

  it.effect("VersionString type is assignable to CrSqlSchema.VersionString", () =>
    Effect.gen(function*() {
      // Compile-time check: this would fail if types don't match
      const protocolVersion: Messages.VersionString = "12345"
      const crsqlVersion: CrSqlSchema.VersionString = protocolVersion
      yield* Effect.sync(() => {
        if (crsqlVersion !== protocolVersion) {
          throw new Error("VersionString value mismatch")
        }
      })
    }))

  it.effect("ChangeRowSerialized type is assignable to CrSqlSchema.ChangeRowSerialized", () =>
    Effect.gen(function*() {
      // Compile-time check: this would fail if types don't match
      const changeRow: Messages.ChangeRowSerialized = {
        table: "todos",
        pk: "AABBCCDD",
        cid: "title",
        val: "Test",
        val_type: "text",
        col_version: "1",
        db_version: "1",
        site_id: "AABBCCDD11223344556677889900EEFF",
        cl: 0,
        seq: 0
      }
      const crsqlChangeRow: CrSqlSchema.ChangeRowSerialized = changeRow
      yield* Effect.sync(() => {
        if (crsqlChangeRow.table !== changeRow.table) {
          throw new Error("ChangeRowSerialized value mismatch")
        }
      })
    }))

  it.effect("CrSqlSchema.ChangeRowSerialized is assignable back to Messages.ChangeRowSerialized", () =>
    Effect.gen(function*() {
      // Bidirectional compile-time check: types are fully compatible
      const crsqlRow: CrSqlSchema.ChangeRowSerialized = {
        table: "todos",
        pk: "AABBCCDD",
        cid: "title",
        val: "Test",
        val_type: "text",
        col_version: "1",
        db_version: "1",
        site_id: "AABBCCDD11223344556677889900EEFF",
        cl: 0,
        seq: 0
      }
      // This assignment verifies CrSqlSchema type is assignable to Messages type
      const protocolRow: Messages.ChangeRowSerialized = crsqlRow
      yield* Effect.sync(() => {
        if (protocolRow.table !== crsqlRow.table) {
          throw new Error("ChangeRowSerialized bidirectional assignment mismatch")
        }
      })
    }))
})
