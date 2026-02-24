/**
 * Root API: resolve extension path and expose version metadata.
 *
 * @since 0.0.0
 */

import { darwin_aarch64, darwin_x86_64, linux_aarch64, linux_x86_64, win_i686, win_x86_64 } from "./paths.js"
import { detectPlatform, isSupportedPlatform, type Platform, SUPPORTED_PLATFORMS } from "./platform.js"
import { GRAPH_EXT_VERSION } from "./version.js"

const runtimePaths: Record<Platform, string> = {
  "darwin-aarch64": darwin_aarch64,
  "darwin-x86_64": darwin_x86_64,
  "linux-x86_64": linux_x86_64,
  "linux-aarch64": linux_aarch64,
  "win-x86_64": win_x86_64,
  "win-i686": win_i686
}

/**
 * Resolve absolute extension path for this process platform.
 * @since 0.0.0
 */
export const getGraphExtPathSync = (platform?: Platform): string => {
  const target = platform ?? detectPlatform()
  if (!isSupportedPlatform(target)) {
    throw new Error(`Unsupported platform: ${target}`)
  }
  return runtimePaths[target]
}

/**
 * Absolute extension path resolved for current platform.
 * @since 0.0.0
 */
export const pathToGraphExt: string = getGraphExtPathSync()

/**
 * Current extension semver.
 * @since 0.0.0
 */
export const graphExtVersion = GRAPH_EXT_VERSION

/**
 * Supported platform identifiers.
 * @since 0.0.0
 */
export type { Platform }
export { SUPPORTED_PLATFORMS }

/**
 * Internal helper used in macro imports in Bun packaging.
 */
export const buildRelativeLibraryPath = (platform: Platform): string => {
  const map: Record<Platform, string> = {
    "darwin-aarch64": "lib/darwin-aarch64/sqlite3_graph_ext.dylib",
    "darwin-x86_64": "lib/darwin-x86_64/sqlite3_graph_ext.dylib",
    "linux-aarch64": "lib/linux-aarch64/sqlite3_graph_ext.so",
    "linux-x86_64": "lib/linux-x86_64/sqlite3_graph_ext.so",
    "win-x86_64": "lib/win-x86_64/sqlite3_graph_ext.dll",
    "win-i686": "lib/win-i686/sqlite3_graph_ext.dll"
  }
  return map[platform]
}
