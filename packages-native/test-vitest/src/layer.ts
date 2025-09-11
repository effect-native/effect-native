/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/service/TestRunner"
import * as EffectVitest from "@effect/vitest"

/**
 * Layer that provides `TestRunner` using Vitest's Effect integration.
 *
 * @since 0.0.1
 */
export const layer = TestRunner.layer(EffectVitest)
