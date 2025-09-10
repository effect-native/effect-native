import { layer as mkLayer, setDefaultLayer } from "@effect-native/test/service/TestRunner"
// eslint-disable-next-line import/no-unresolved
import { test as bunTest, expect } from "bun:test"

const it = bunTest as unknown as (name: string, fn: () => unknown, options?: unknown) => unknown

setDefaultLayer(mkLayer({ it, expect }))
