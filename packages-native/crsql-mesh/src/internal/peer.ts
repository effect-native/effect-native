/**
 * Per-peer state model and peer loop orchestration.
 *
 * @internal
 */
import type * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"

/**
 * Per-peer operational state.
 *
 * @internal
 */
export interface PeerState {
  /**
   * The peer's site ID.
   */
  readonly siteId: Messages.SiteIdHex

  /**
   * Last exchanged VersionSummary from this peer.
   */
  readonly lastSummary: Messages.VersionSummary | null

  /**
   * Backoff state for retries after errors.
   */
  readonly backoffMs: number

  /**
   * Recently seen sequence numbers for deduplication.
   * Bounded to the last N values.
   */
  readonly recentSeqs: ReadonlyArray<number>
}

/**
 * Default window size for deduplication.
 */
const DEDUP_WINDOW_SIZE = 100

/**
 * Create initial peer state.
 *
 * @internal
 */
export const makePeerState = (siteId: Messages.SiteIdHex): PeerState => ({
  siteId,
  lastSummary: null,
  backoffMs: 0,
  recentSeqs: []
})

/**
 * Check if a sequence number has been recently seen.
 *
 * @internal
 */
export const isRecentlySeen = (state: PeerState, seq: number): boolean => state.recentSeqs.includes(seq)

/**
 * Add a sequence number to the recently seen window.
 *
 * @internal
 */
export const addSeenSeq = (state: PeerState, seq: number): PeerState => {
  const newSeqs = [...state.recentSeqs, seq].slice(-DEDUP_WINDOW_SIZE)
  return { ...state, recentSeqs: newSeqs }
}

/**
 * Update the last summary for a peer.
 *
 * @internal
 */
export const updateLastSummary = (
  state: PeerState,
  summary: Messages.VersionSummary
): PeerState => ({
  ...state,
  lastSummary: summary,
  backoffMs: 0 // Reset backoff on successful exchange
})

/**
 * Apply backoff after an error.
 *
 * @internal
 */
export const applyBackoff = (state: PeerState, baseMs: number): PeerState => ({
  ...state,
  backoffMs: Math.min(state.backoffMs === 0 ? baseMs : state.backoffMs * 2, 60000)
})

/**
 * Peer registry - tracks state for all known peers.
 *
 * @internal
 */
export interface PeerRegistry {
  readonly get: (siteId: Messages.SiteIdHex) => Effect.Effect<PeerState>
  readonly update: (
    siteId: Messages.SiteIdHex,
    fn: (state: PeerState) => PeerState
  ) => Effect.Effect<void>
  readonly list: () => Effect.Effect<ReadonlyArray<Messages.SiteIdHex>>
}

/**
 * Create an in-memory peer registry.
 *
 * @internal
 */
export const makePeerRegistry = (): Effect.Effect<PeerRegistry> =>
  Effect.gen(function*() {
    const peers = yield* Ref.make<Map<Messages.SiteIdHex, PeerState>>(new Map())

    const get = (siteId: Messages.SiteIdHex): Effect.Effect<PeerState> =>
      Effect.gen(function*() {
        const map = yield* Ref.get(peers)
        const existing = map.get(siteId)
        if (existing) return existing

        // Create new peer state
        const newState = makePeerState(siteId)
        yield* Ref.update(peers, (m) => new Map(m).set(siteId, newState))
        return newState
      })

    const update = (
      siteId: Messages.SiteIdHex,
      fn: (state: PeerState) => PeerState
    ): Effect.Effect<void> =>
      Effect.gen(function*() {
        const current = yield* get(siteId)
        const updated = fn(current)
        yield* Ref.update(peers, (m) => new Map(m).set(siteId, updated))
      })

    const list = (): Effect.Effect<ReadonlyArray<Messages.SiteIdHex>> =>
      Ref.get(peers).pipe(Effect.map((m) => Array.from(m.keys())))

    return { get, update, list }
  })
