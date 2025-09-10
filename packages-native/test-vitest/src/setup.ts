import * as Equal from "effect/Equal"
import * as Utils from "effect/Utils"
import type { Tester, TesterContext } from "@vitest/expect"
import { expect, it as vitestIt } from "vitest"
import { layer, setDefaultLayer } from "@effect-native/test/service/TestRunner"

function customTester(this: TesterContext, a: unknown, b: unknown, customTesters: Array<Tester>) {
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
  // add equality testers once
  expect.addEqualityTesters([customTester])
  // set default TestRunner layer for helpers
  setDefaultLayer(layer({ it: vitestIt as any, expect }))
}

setup()
