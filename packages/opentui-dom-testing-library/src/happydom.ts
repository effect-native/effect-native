/**
 * Preload script for bun test to register happy-dom globals.
 *
 * Includes a workaround for happy-dom bug where native error constructors
 * (SyntaxError, TypeError, etc.) are undefined on Window in bun.
 * The fix: patch Window.prototype BEFORE GlobalRegistrator.register() creates
 * the Window instance, so the instance inherits the patched properties.
 * See: https://github.com/capricorn86/happy-dom/issues/1762
 *
 * @since 0.1.0
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { Window } from "happy-dom"

// Patch Window.prototype BEFORE register() creates the instance.
const nativeErrors = [
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "AggregateError"
] as const
for (const name of nativeErrors) {
  if (typeof (Window.prototype as any)[name] === "undefined") {
    ;(Window.prototype as any)[name] = (globalThis as any)[name]
  }
}

GlobalRegistrator.register()
