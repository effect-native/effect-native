/**
 * Check if the current platform is supported by libsqlite
 * Uses the actual detection logic from the library
 */
export const isSupportedPlatform = (() => {
  try {
    // Try to import the library - it will throw on unsupported platforms
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@effect-native/libsqlite")
    return true
  } catch {
    // Platform not supported
    return false
  }
})()
