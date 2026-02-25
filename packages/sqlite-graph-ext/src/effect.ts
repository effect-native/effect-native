/**
 * Effect-native wrappers for graph extension path resolution errors.
 *
 * @since 0.0.0
 */
import { Brand, Data, Effect } from "effect"
import * as fs from "node:fs"
import { fileURLToPath } from "node:url"
import { buildRelativeLibraryPath } from "./index.js"
import { isSupportedPlatform, type Platform, SUPPORTED_PLATFORMS } from "./platform.js"

const detectProcessPlatform = (): string => {
  if (process.platform === "darwin" && process.arch === "arm64") return "darwin-aarch64"
  if (process.platform === "darwin" && process.arch === "x64") return "darwin-x86_64"
  if (process.platform === "linux" && process.arch === "x64") return "linux-x86_64"
  if (process.platform === "linux" && process.arch === "arm64") return "linux-aarch64"
  if (process.platform === "win32" && process.arch === "x64") return "win-x86_64"
  if (process.platform === "win32" && process.arch === "ia32") return "win-i686"
  return `${process.platform}-${process.arch}`
}

/**
 * Error when the host platform is unsupported.
 */
export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly supportedPlatforms: ReadonlyArray<string>
  readonly detectedPlatform: string
  readonly detectedArch: string
}> {}

/**
 * Error when the binary path cannot be located.
 */
export class ExtensionPathMissingError extends Data.TaggedError("ExtensionPathMissingError")<{
  readonly path: string
  readonly platform: string
}> {}

/**
 * Branded absolute path for sql extension binary.
 */
export type GraphExtPath = string & Brand.Brand<"GraphExtPath">

/**
 * Brand constructor for GraphExtPath.
 */
export const GraphExtPath = Brand.nominal<GraphExtPath>()

/**
 * Resolve graph extension path with explicit typed failures.
 */
export const getGraphExtPath = (
  platform?: Platform
): Effect.Effect<GraphExtPath, PlatformNotSupportedError | ExtensionPathMissingError> => {
  return Effect.gen(function*() {
    const target = platform ?? detectProcessPlatform()
    if (!isSupportedPlatform(target)) {
      return yield* new PlatformNotSupportedError({
        platform: target,
        supportedPlatforms: SUPPORTED_PLATFORMS,
        detectedPlatform: process.platform,
        detectedArch: process.arch
      })
    }

    const abs = fileURLToPath(new URL(`../${buildRelativeLibraryPath(target)}`, import.meta.url))
    const exists = yield* Effect.sync(() => fs.existsSync(abs))

    if (!exists) {
      return yield* Effect.fail(new ExtensionPathMissingError({ path: abs, platform: target }))
    }

    return GraphExtPath(abs)
  })
}
