/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/service/TestRunner"
import * as EffectVitest from "@effect/vitest"

export const layer = TestRunner.layer(EffectVitest)
