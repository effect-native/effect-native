/**
 * Computing missing rows and creating responses (DB read path).
 *
 * @internal
 */
import type * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import * as Effect from "effect/Effect"
import type { VersionVector } from "../Mesh.js"

/**
 * Database abstraction for reading changes.
 * This allows unit testing without a real database.
 *
 * @internal
 */
export interface ChangeReader {
  /**
   * Get the local site ID.
   */
  readonly getSiteId: () => Effect.Effect<Messages.SiteIdHex>

  /**
   * Get the current db_version.
   */
  readonly getDbVersion: () => Effect.Effect<Messages.VersionString>

  /**
   * Pull changes since a given version, optionally excluding sites.
   */
  readonly pullChanges: (
    since: Messages.VersionString,
    excludeSites?: ReadonlyArray<Messages.SiteIdHex>,
    limit?: number
  ) => Effect.Effect<ReadonlyArray<Messages.ChangeRowSerialized>>
}

/**
 * Build a VersionSummary from the local state.
 *
 * @internal
 */
export const buildLocalSummary = (
  reader: ChangeReader,
  versionVector: VersionVector
): Effect.Effect<Messages.VersionSummary> =>
  Effect.gen(function*() {
    const localSiteId = yield* reader.getSiteId()
    const dbVersion = yield* reader.getDbVersion()

    // Build peers map including our own site
    const peers: Record<string, string> = { ...versionVector }

    // Always include our own site with current db_version
    peers[localSiteId] = dbVersion

    return {
      localSiteId,
      peers: peers as Messages.PeersMap
    }
  })

/**
 * Compute which changes a requester is missing based on their summary.
 *
 * @internal
 */
export const computeDiffResponse = (
  reader: ChangeReader,
  localVector: VersionVector,
  requesterSummary: Messages.VersionSummary,
  maxChangeRows: number = 1000
): Effect.Effect<Messages.DiffResponse> =>
  Effect.gen(function*() {
    const localSiteId = yield* reader.getSiteId()
    const dbVersion = yield* reader.getDbVersion()

    // Find the minimum version the requester needs
    // For simplicity, we pull all changes since the lowest version they report
    let sinceVersion = "0"
    for (const [siteId, version] of Object.entries(requesterSummary.peers)) {
      const ourVersion = localVector[siteId as Messages.SiteIdHex]
      if (ourVersion && BigInt(ourVersion) > BigInt(version)) {
        // We have newer data for this site
        if (sinceVersion === "0" || BigInt(version) < BigInt(sinceVersion)) {
          sinceVersion = version
        }
      }
    }

    // Pull changes, excluding the requester's site
    const changes = yield* reader.pullChanges(
      sinceVersion as Messages.VersionString,
      [requesterSummary.localSiteId],
      maxChangeRows + 1 // Get one extra to check hasMore
    )

    const hasMore = changes.length > maxChangeRows
    const changeRows = hasMore ? changes.slice(0, maxChangeRows) : changes

    // Build our summary
    const peersCopy: Record<string, string> = { ...localVector }
    peersCopy[localSiteId] = dbVersion

    const summary: Messages.VersionSummary = {
      localSiteId,
      peers: peersCopy as Messages.PeersMap
    }

    return {
      changeRows,
      hasMore,
      summary
    }
  })
