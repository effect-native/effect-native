/**
 * Mesh synchronization engine service.
 *
 * @since 0.1.0
 */
import type * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import { Transport } from "@effect-native/crsql-mesh-transport"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import { SyncInterrupted } from "./MeshError.js"
import type * as MeshError from "./MeshError.js"

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
 * Create the Mesh service.
 *
 * @since 0.1.0
 * @category Constructor
 */
const makeMesh = Effect.gen(function*() {
  // Dependencies (will be used in later phases)
  void (yield* MeshConfig)
  void (yield* Transport)

  // In-memory version vector state
  const versionVectorRef = yield* Ref.make<VersionVector>({})

  // Progress broadcast
  const progressHub = yield* PubSub.unbounded<ProgressEvent>()

  // Main fiber reference for shutdown
  const mainFiberRef = yield* Ref.make<Fiber.Fiber<never, MeshError.SyncInterrupted> | null>(null)

  const run: MeshService["run"] = Effect.never.pipe(
    Effect.interruptible,
    Effect.mapError(() => new SyncInterrupted({ reason: "interrupted" })),
    Effect.tap(() => Ref.set(mainFiberRef, null))
  )

  const shutdown: MeshService["shutdown"] = Effect.gen(function*() {
    const fiber = yield* Ref.get(mainFiberRef)
    if (fiber) {
      yield* Fiber.interrupt(fiber)
    }
  })

  const versionVector: MeshService["versionVector"] = Ref.get(versionVectorRef)

  const observeProgress: MeshService["observeProgress"] = Stream.fromPubSub(progressHub)

  return {
    run,
    shutdown,
    versionVector,
    observeProgress
  } satisfies MeshService
})

/**
 * Live layer for Mesh service.
 * Requires Transport and MeshConfig.
 *
 * @since 0.1.0
 * @category Layer
 */
export const MeshLive: Layer.Layer<Mesh, never, Transport | MeshConfig> = Layer.scoped(
  Mesh,
  makeMesh
)
