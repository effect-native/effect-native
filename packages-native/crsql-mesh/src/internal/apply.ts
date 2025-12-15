/**
 * Transactional apply and version-vector update logic.
 *
 * @internal
 */
import type * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import type { VersionVector } from "../Mesh.js"
import type { ApplyFailed } from "../MeshError.js"

/**
 * Result of applying changes.
 *
 * @internal
 */
export interface ApplyResult {
  readonly success: boolean
  readonly appliedCount: number
  readonly maxDbVersion: Messages.VersionString | null
}

/**
 * Database abstraction for change application.
 * This allows unit testing without a real database.
 *
 * @internal
 */
export interface ChangeApplier {
  /**
   * Apply a batch of changes within a transaction.
   * Returns the number of changes applied on success.
   */
  readonly applyChanges: (
    changes: ReadonlyArray<Messages.ChangeRowSerialized>
  ) => Effect.Effect<number, ApplyFailed>
}

/**
 * Apply changes and update version vector on success.
 *
 * @internal
 */
export const applyAndUpdateVector = (
  applier: ChangeApplier,
  versionVectorRef: Ref.Ref<VersionVector>,
  changes: ReadonlyArray<Messages.ChangeRowSerialized>,
  senderSiteId: Messages.SiteIdHex
): Effect.Effect<ApplyResult, ApplyFailed> =>
  Effect.gen(function*() {
    if (changes.length === 0) {
      return { success: true, appliedCount: 0, maxDbVersion: null }
    }

    // Apply changes (in a transaction at the DB layer)
    const appliedCount = yield* applier.applyChanges(changes)

    // Find the max db_version from the applied changes
    const maxDbVersion = changes.reduce<Messages.VersionString | null>(
      (max, change) => {
        if (max === null) return change.db_version
        return BigInt(change.db_version) > BigInt(max) ? change.db_version : max
      },
      null
    )

    // Update version vector
    if (maxDbVersion) {
      yield* Ref.update(versionVectorRef, (v) => ({
        ...v,
        [senderSiteId]: maxDbVersion
      }))
    }

    return { success: true, appliedCount, maxDbVersion }
  })

/**
 * Compare version vectors to determine what changes are needed.
 *
 * @internal
 */
export const computeMissingVersions = (
  localVector: VersionVector,
  remoteSummary: Messages.VersionSummary
): Record<Messages.SiteIdHex, Messages.VersionString> => {
  const missing: Record<Messages.SiteIdHex, Messages.VersionString> = {}

  // Check what the remote has that we don't
  for (const [siteId, remoteVersion] of Object.entries(remoteSummary.peers)) {
    const localVersion = localVector[siteId as Messages.SiteIdHex]
    if (!localVersion || BigInt(remoteVersion) > BigInt(localVersion)) {
      // We need changes from this site starting from our local version (or 0)
      missing[siteId as Messages.SiteIdHex] = localVersion ?? "0"
    }
  }

  // Also check the remote's own site
  const remoteSiteVersion = remoteSummary.peers[remoteSummary.localSiteId]
  const localRemoteSiteVersion = localVector[remoteSummary.localSiteId]
  if (
    remoteSiteVersion &&
    (!localRemoteSiteVersion || BigInt(remoteSiteVersion) > BigInt(localRemoteSiteVersion))
  ) {
    missing[remoteSummary.localSiteId] = localRemoteSiteVersion ?? "0"
  }

  return missing
}
