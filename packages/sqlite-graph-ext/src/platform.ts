/**
 * Platform identifiers used for native extension binaries.
 *
 * @since 0.0.0
 */
export type Platform =
  | "darwin-aarch64"
  | "darwin-x86_64"
  | "linux-x86_64"
  | "linux-aarch64"
  | "win-x86_64"
  | "win-i686"

/**
 * Supported platform tags.
 *
 * @since 0.0.0
 */
export const SUPPORTED_PLATFORMS: ReadonlyArray<Platform> = [
  "darwin-aarch64",
  "darwin-x86_64",
  "linux-x86_64",
  "linux-aarch64",
  "win-x86_64",
  "win-i686"
]

function detectFromProcess(): string {
  if (process.platform === "darwin" && process.arch === "arm64") return "darwin-aarch64"
  if (process.platform === "darwin" && process.arch === "x64") return "darwin-x86_64"
  if (process.platform === "linux" && process.arch === "x64") return "linux-x86_64"
  if (process.platform === "linux" && process.arch === "arm64") return "linux-aarch64"
  if (process.platform === "win32" && process.arch === "x64") return "win-x86_64"
  if (process.platform === "win32" && process.arch === "ia32") return "win-i686"
  return `${process.platform}-${process.arch}`
}

/**
 * Returns true if the detected platform is in the supported set.
 *
 * @since 0.0.0
 */
export const isSupportedPlatform = (platform: string): platform is Platform => {
  return SUPPORTED_PLATFORMS.includes(platform as Platform)
}

/**
 * Detects platform tag from `process`.
 *
 * @since 0.0.0
 */
export const detectPlatform = (): Platform => {
  const p = detectFromProcess()
  if (!isSupportedPlatform(p)) {
    throw new Error(`Unsupported platform: ${p}`)
  }
  return p
}
