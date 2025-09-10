import { layer as mkLayer } from "@effect-native/test/service/TestRunner"

import { expect, test as bunTest } from "bun:test"

const it = bunTest as unknown as (name: string, fn: () => unknown, options?: unknown) => unknown

export const layer = () => mkLayer({ it, expect })
