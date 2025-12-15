/**
 * Mesh synchronization engine service.
 *
 * @since 0.1.0
 */
import type * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import { Transport } from "@effect-native/crsql-mesh-transport"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"

import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import { SyncInterrupted } from "./MeshError.js"
import type * as MeshError from "./MeshError.js"
import { applyAndUpdateVector, computeMissingVersions } from "./internal/apply.js"
import type { ChangeApplier } from "./internal/apply.js"
import { buildLocalSummary, computeDiffResponse } from "./internal/diff.js"
import type { ChangeReader } from "./internal/diff.js"
import { addSeenSeq, isRecentlySeen, makePeerRegistry, updateLastSummary } from "./internal/peer.js"
import type { PeerRegistry } from "./internal/peer.js"
import { createReceiveStream } from "./internal/receive.js"

/**
 * Configuration for the Mesh synchronization engine.
 *
 * @since 0.1.0
 * @category Config
 */
export interface MeshConfigShape {
  /**
   * Time between periodic summary exchanges (per peer).
   */
  readonly syncInterval: Duration.DurationInput

  /**
   * Default batch cap when requesting or responding to diff requests.
   * If omitted, sender decides a safe cap.
   */
  readonly maxChangeRows?: number

  /**
   * Backoff policy for transient peer failures.
   * If omitted, use a conservative spaced retry.
   */
  readonly errorBackoff?: Duration.DurationInput
}

/**
 * MeshConfig service tag.
 *
 * @since 0.1.0
 * @category Config
 */
export class MeshConfig extends Context.Tag("@effect-native/crsql-mesh/MeshConfig")<
  MeshConfig,
  MeshConfigShape
>() {}

/**
 * Version vector: map from site ID to highest known db_version.
 *
 * @since 0.1.0
 * @category Models
 */
export type VersionVector = Record<Messages.SiteIdHex, Messages.VersionString>

/**
 * Progress event emitted when the local db_version advances.
 *
 * @since 0.1.0
 * @category Models
 */
export interface ProgressEvent {
  readonly dbVersion: Messages.VersionString
}

/**
 * Mesh service interface.
 *
 * @since 0.1.0
 * @category Service
 */
export interface MeshService {
  /**
   * Run the sync loop until the scope closes.
   * Returns an Effect that never resolves under normal operation.
   */
  readonly run: Effect.Effect<never, MeshError.SyncInterrupted>

  /**
   * Explicitly stop background work.
   * Semantically equivalent to closing the scope owning the Mesh.
   */
  readonly shutdown: Effect.Effect<void>

  /**
   * Get a snapshot of the current in-memory version vector.
   */
  readonly versionVector: Effect.Effect<VersionVector>

  /**
   * Stream of local db_version advances.
   * Used for UI refresh patterns.
   */
  readonly observeProgress: Stream.Stream<ProgressEvent>
}

/**
 * Mesh service tag.
 *
 * @since 0.1.0
 * @category Service
 */
export class Mesh extends Context.Tag("@effect-native/crsql-mesh/Mesh")<
  Mesh,
  MeshService
>() {}

/**
 * Database abstraction combining reader and applier.
 *
 * @since 0.1.0
 * @category Service
 */
export interface MeshDatabase extends ChangeReader, ChangeApplier {}

/**
 * MeshDatabase service tag for dependency injection.
 *
 * @since 0.1.0
 * @category Service
 */
export class MeshDatabaseTag extends Context.Tag("@effect-native/crsql-mesh/MeshDatabase")<
  MeshDatabaseTag,
  MeshDatabase
>() {}

/**
 * Encode a message to transport bytes.
 */
const encodeMessage = (msg: Messages.MeshMessage): Uint8Array => new TextEncoder().encode(JSON.stringify(msg))

/**
 * Create the Mesh service.
 *
 * @since 0.1.0
 * @category Constructor
 */
const makeMesh = Effect.gen(function*() {
  const config = yield* MeshConfig
  const transport = yield* Transport
  const db = yield* MeshDatabaseTag

  // In-memory version vector state
  const versionVectorRef = yield* Ref.make<VersionVector>({})

  // Progress broadcast
  const progressHub = yield* PubSub.unbounded<ProgressEvent>()

  // Peer registry for tracking peer state
  const peerRegistry = yield* makePeerRegistry()

  // Sequence counter for outgoing messages
  const seqRef = yield* Ref.make(0)
  const nextSeq = Ref.getAndUpdate(seqRef, (n) => n + 1)

  // Fiber refs for managing background fibers (using unknown for success type since loops never complete)
  const receiveFiberRef = yield* Ref.make<Fiber.RuntimeFiber<unknown, never> | null>(null)
  const syncFiberRef = yield* Ref.make<Fiber.RuntimeFiber<unknown, never> | null>(null)

  // Helper to publish progress
  const publishProgress = (dbVersion: Messages.VersionString) =>
    PubSub.publish(progressHub, { dbVersion })

  // Helper to send a message
  const sendMessage = (to: Messages.SiteIdHex, kind: Messages.MeshMessage["kind"], payload: Messages.MeshMessage["payload"]) =>
    Effect.gen(function*() {
      const localSiteId = yield* db.getSiteId()
      const seq = yield* nextSeq
      const message: Messages.MeshMessage = { kind, seq, sender: localSiteId, payload }
      yield* transport.send({ to, payload: encodeMessage(message) }).pipe(
        Effect.catchAll(() => Effect.void) // Best effort
      )
    })

  // Handle an incoming VersionSummary message
  const handleVersionSummary = (
    sender: Messages.SiteIdHex,
    summary: Messages.VersionSummary
  ): Effect.Effect<void> =>
    Effect.gen(function*() {
      // Update peer state
      yield* peerRegistry.update(sender, (s) => updateLastSummary(s, summary))

      // Check if we need to request changes
      const localVector = yield* Ref.get(versionVectorRef)
      const missing = computeMissingVersions(localVector, summary)

      if (Object.keys(missing).length > 0) {
        // Request diff from peer
        const ourSummary = yield* buildLocalSummary(db, localVector)
        const request: Messages.DiffRequest = {
          summary: ourSummary,
          maxChangeRows: config.maxChangeRows
        }
        yield* sendMessage(sender, "DiffRequest", request)
      }
    })

  // Handle an incoming DiffRequest message
  const handleDiffRequest = (
    sender: Messages.SiteIdHex,
    request: Messages.DiffRequest
  ): Effect.Effect<void> =>
    Effect.gen(function*() {
      const localVector = yield* Ref.get(versionVectorRef)
      const response = yield* computeDiffResponse(
        db,
        localVector,
        request.summary,
        request.maxChangeRows ?? config.maxChangeRows ?? 1000
      )

      yield* sendMessage(sender, "DiffResponse", response)
    })

  // Handle an incoming DiffResponse message
  const handleDiffResponse = (
    sender: Messages.SiteIdHex,
    response: Messages.DiffResponse
  ): Effect.Effect<void> =>
    Effect.gen(function*() {
      if (response.changeRows.length === 0) {
        return
      }

      // Apply changes transactionally
      const result = yield* applyAndUpdateVector(
        db,
        versionVectorRef,
        response.changeRows,
        sender
      ).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function*() {
            yield* Effect.logWarning(`Apply failed from ${sender}: ${error.message}`)
            return { success: false, appliedCount: 0, maxDbVersion: null as Messages.VersionString | null }
          })
        )
      )

      // Emit progress if changes were applied
      if (result.success && result.maxDbVersion) {
        yield* publishProgress(result.maxDbVersion)
      }

      // Update peer state with their summary
      yield* peerRegistry.update(sender, (s) => updateLastSummary(s, response.summary))

      // If there are more changes, request them
      if (response.hasMore) {
        const localVector = yield* Ref.get(versionVectorRef)
        const ourSummary = yield* buildLocalSummary(db, localVector)
        const request: Messages.DiffRequest = {
          summary: ourSummary,
          maxChangeRows: config.maxChangeRows
        }
        yield* sendMessage(sender, "DiffRequest", request)
      }
    })

  // Handle a decoded message
  const handleMessage = (
    sender: Messages.SiteIdHex,
    message: Messages.MeshMessage
  ): Effect.Effect<void> =>
    Effect.gen(function*() {
      // Check for duplicate
      const peerState = yield* peerRegistry.get(sender)
      if (isRecentlySeen(peerState, message.seq)) {
        return // Drop duplicate
      }
      yield* peerRegistry.update(sender, (s) => addSeenSeq(s, message.seq))

      // Route by message kind
      switch (message.kind) {
        case "VersionSummary":
          yield* handleVersionSummary(sender, message.payload as Messages.VersionSummary)
          break
        case "DiffRequest":
          yield* handleDiffRequest(sender, message.payload as Messages.DiffRequest)
          break
        case "DiffResponse":
          yield* handleDiffResponse(sender, message.payload as Messages.DiffResponse)
          break
      }
    })

  // Receive fiber: consume transport receive stream
  const receiveLoop = createReceiveStream(transport).pipe(
    Stream.mapEffect((decoded) =>
      handleMessage(decoded.message.sender, decoded.message).pipe(
        Effect.catchAll((error) =>
          Effect.logWarning(`Error handling message: ${error}`)
        )
      )
    ),
    Stream.runDrain,
    Effect.catchAll(() => Effect.void), // Transport closed
    Effect.forever
  )

  // Per-peer periodic sync: send version summary to known peers
  const periodicSyncLoop = Effect.gen(function*() {
    const localVector = yield* Ref.get(versionVectorRef)
    const summary = yield* buildLocalSummary(db, localVector)

    // Send to all known peers
    const peers = yield* peerRegistry.list()
    yield* Effect.forEach(peers, (peerId) =>
      sendMessage(peerId, "VersionSummary", summary), { concurrency: "unbounded" }
    )
  }).pipe(
    Effect.repeat(Schedule.spaced(Duration.decode(config.syncInterval)))
  )

  // Main fiber reference for shutdown
  const mainFiberRef = yield* Ref.make<Fiber.RuntimeFiber<never, MeshError.SyncInterrupted> | null>(null)

  const run: MeshService["run"] = Effect.gen(function*() {
    // Open transport
    yield* transport.open.pipe(
      Effect.catchAll(() => Effect.fail(new SyncInterrupted({ reason: "transport failed to open" })))
    )

    // Fork receive loop
    const receiveFiber = yield* Effect.fork(receiveLoop)
    yield* Ref.set(receiveFiberRef, receiveFiber)

    // Fork periodic sync loop
    const syncFiber = yield* Effect.fork(periodicSyncLoop)
    yield* Ref.set(syncFiberRef, syncFiber)

    // Wait forever until interrupted
    return yield* Effect.never
  }).pipe(
    Effect.interruptible,
    Effect.ensuring(
      Effect.gen(function*() {
        // Interrupt fibers on cleanup
        const receiveFiber = yield* Ref.get(receiveFiberRef)
        const syncFiber = yield* Ref.get(syncFiberRef)
        if (receiveFiber) yield* Fiber.interrupt(receiveFiber)
        if (syncFiber) yield* Fiber.interrupt(syncFiber)
        yield* transport.close
      })
    ),
    Effect.mapError((e) =>
      e instanceof SyncInterrupted ? e : new SyncInterrupted({ reason: String(e) })
    )
  )

  const shutdown: MeshService["shutdown"] = Effect.gen(function*() {
    const fiber = yield* Ref.get(mainFiberRef)
    if (fiber) {
      yield* Fiber.interrupt(fiber)
    }
    // Also close the transport
    yield* transport.close
  })

  const versionVector: MeshService["versionVector"] = Ref.get(versionVectorRef)

  const observeProgress: MeshService["observeProgress"] = Stream.fromPubSub(progressHub)

  /**
   * Register a peer so the mesh will send periodic summaries to them.
   */
  const registerPeer = (siteId: Messages.SiteIdHex): Effect.Effect<void> =>
    peerRegistry.get(siteId).pipe(Effect.asVoid)

  return {
    run,
    shutdown,
    versionVector,
    observeProgress,
    registerPeer,
    _internal: {
      peerRegistry,
      versionVectorRef,
      progressHub,
      db
    }
  } satisfies MeshService & {
    registerPeer: (siteId: Messages.SiteIdHex) => Effect.Effect<void>
    _internal: {
      peerRegistry: PeerRegistry
      versionVectorRef: Ref.Ref<VersionVector>
      progressHub: PubSub.PubSub<ProgressEvent>
      db: MeshDatabase
    }
  }
})

/**
 * Live layer for Mesh service.
 * Requires Transport, MeshConfig, and MeshDatabase.
 *
 * @since 0.1.0
 * @category Layer
 */
export const MeshLive: Layer.Layer<Mesh, never, Transport | MeshConfig | MeshDatabaseTag> = Layer.scoped(
  Mesh,
  makeMesh
)
