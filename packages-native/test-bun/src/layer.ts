import { layer as mkLayer } from "@effect-native/test/service/TestRunner"
// eslint-disable-next-line import/no-unresolved
import { test as bunTest, expect } from "bun:test"

const it = bunTest as unknown as (name: string, fn: () => unknown, options?: unknown) => unknown

export const layer = () => mkLayer({ it, expect })
