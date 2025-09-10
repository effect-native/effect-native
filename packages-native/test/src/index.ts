/**
 * Effect-first test SPI bindings and helpers.
 * @since 0.0.1
 */
/**
 * Runs an Effect as a test using the active runner's `it` implementation.
 * @since 0.0.1
 */
export { itEffect } from "./it.js"

/**
 * Constructs a Layer providing the TestRunner service (bindings to `it`/`expect`).
 * @since 0.0.1
 */
export { layer } from "./service/TestRunner.js"

/**
 * Installs a default Layer used by helpers when none is explicitly provided.
 * @since 0.0.1
 */
export { setDefaultLayer } from "./service/TestRunner.js"

/**
 * Effect Tag for accessing the current TestRunner (bound `it`/`expect`).
 * @since 0.0.1
 */
export { TestRunner } from "./service/TestRunner.js"
