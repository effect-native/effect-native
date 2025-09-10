/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/service/TestRunner"
import * as vitest from "vitest"

export const layer = TestRunner.layer(vitest)
