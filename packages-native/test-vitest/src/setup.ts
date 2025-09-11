/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/service/TestRunner"
import * as EffectVitest from "@effect/vitest"
import type { Tester } from "@vitest/expect"
import * as Equal from "effect/Equal"
import * as Utils from "effect/Utils"
import * as vitest from "vitest"
import * as VitestRunner from "./index.js"

const customTester: Tester = function(a, b, customTesters) {
  if (!Equal.isEqual(a) || !Equal.isEqual(b)) {
    return undefined
  }
  // Use structural region to respect Equal.equals for Effect data types
  return Utils.structuralRegion(
    () => Equal.equals(a, b),
    (x, y) => this.equals(x, y, customTesters.filter((t) => t !== customTester))
  )
}

export const setup = () => {
  EffectVitest.addEqualityTesters()
  // add equality testers once
  vitest.expect.addEqualityTesters([customTester])
  // set default TestRunner layer for helpers
  TestRunner.setDefaultLayer(TestRunner.layer(VitestRunner.layer))
}

setup()
