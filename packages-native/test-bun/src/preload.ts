import { layer as mkLayer, setDefaultLayer } from "@effect-native/test/service/TestRunner"

import { expect, test as bunTest } from "bun:test"

const it = bunTest as unknown as (name: string, fn: () => unknown, options?: unknown) => unknown

setDefaultLayer(mkLayer({ it, expect }))
