/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/services/TestRunner"

import { expect, it, test } from "bun:test"

/**
 * Layer that provides `TestRunner` using Bun's `bun:test` primitives.
 *
 * @since 0.0.1
 */
export const layer = TestRunner.layer({ expect, it, test })
