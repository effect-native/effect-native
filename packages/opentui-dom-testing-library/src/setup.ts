/**
 * Sets up happy-dom globals for testing.
 * Call this once at the top of your test file or in a setup file.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator"

let isRegistered = false

/**
 * Registers happy-dom globals (window, document, etc.) on globalThis.
 * Safe to call multiple times - only registers once.
 */
export function setupHappyDom(): void {
  if (isRegistered) return
  GlobalRegistrator.register()
  isRegistered = true
}

/**
 * Unregisters happy-dom globals from globalThis.
 * Generally not needed unless you need to restore the original environment.
 */
export function teardownHappyDom(): void {
  if (!isRegistered) return
  GlobalRegistrator.unregister()
  isRegistered = false
}

/**
 * Checks if happy-dom globals are available.
 */
export function isHappyDomSetup(): boolean {
  return typeof globalThis.document !== "undefined" && typeof globalThis.window !== "undefined"
}

/**
 * Ensures happy-dom is set up, throwing if not.
 * Used internally before rendering.
 */
export function ensureHappyDom(): void {
  if (!isHappyDomSetup()) {
    throw new Error(
      "happy-dom is not set up. Call setupHappyDom() before using render() or screen.\n" +
        "Example:\n" +
        "  import { setupHappyDom } from '@effect-native/opentui-dom-testing-library'\n" +
        "  setupHappyDom()"
    )
  }
}
