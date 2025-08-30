/**
 * Root entrypoint: absolute path getters with zero external dependencies.
 *
 * @since 0.16.3
 */
import * as fs from "node:fs"
import { fileURLToPath } from "node:url"
import {
  buildRelativeLibraryPath,
  detectPlatform,
  isSupportedPlatform,
  SUPPORTED_PLATFORMS as _SUPPORTED_PLATFORMS
} from "./platform.js"

import type { Platform as _Platform } from "./platform.js"

/**
 * Return absolute path to cr-sqlite extension binary for the given or detected platform.
 * Throws native Error with `code` set when unsupported or missing.
 *
 * @since 0.16.3
 */
/**
 * Synchronous absolute path resolution for the cr-sqlite extension binary.
 *
 * - Returns an absolute path string that you can pass to `db.loadExtension()`.
 * - Throws native Error with `code` set to `ERR_PLATFORM_UNSUPPORTED` or
 *   `ERR_EXTENSION_NOT_FOUND`.
 *
 * @since 0.16.3
 * @example
 * import { getCrSqliteExtensionPathSync } from "@effect-native/libcrsql"
 *
 * const path = getCrSqliteExtensionPathSync()
 * console.log(path)
 */
export const getCrSqliteExtensionPathSync = (platform?: Platform): string => {
  const target = platform ?? detectPlatform()
  if (!isSupportedPlatform(target)) {
    const err: NodeJS.ErrnoException = new Error(
      `Unsupported platform: ${target} (supported: ${SUPPORTED_PLATFORMS.join(", ")})`
    )
    err.code = "ERR_PLATFORM_UNSUPPORTED"
    throw err
  }
  const abs = fileURLToPath(new URL(`../${buildRelativeLibraryPath(target)}`, import.meta.url))
  // Best-effort existence check without external deps
  try {
    fs.accessSync(abs)
  } catch {
    const err: NodeJS.ErrnoException = new Error(`Extension not found: ${abs}`)
    err.code = "ERR_EXTENSION_NOT_FOUND"
    throw err
  }
  return abs
}

/**
 * Absolute path for current platform at import time.
 * Throws if unsupported or binary missing.
 *
 * @since 0.16.3
 */
/**
 * Absolute path to the cr-sqlite binary for the current platform, computed at import time.
 *
 * - Useful for the simplest use cases: just import and load.
 * - Throws on unsupported platform or if the binary is not present.
 *
 * @since 0.16.3
 * @example
 * import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
 * console.log(pathToCrSqliteExtension)
 */
export const pathToCrSqliteExtension: string = getCrSqliteExtensionPathSync()

/**
 * Supported platform-arch identifiers.
 * @since 0.16.3
 */
export type Platform = _Platform

/**
 * List of supported platforms.
 * @since 0.16.3
 */
export const SUPPORTED_PLATFORMS = _SUPPORTED_PLATFORMS
