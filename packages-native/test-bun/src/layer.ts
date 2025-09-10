/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/service/TestRunner"

import * as BunTest from "bun:test"

export const layer = TestRunner.layer(BunTest)
