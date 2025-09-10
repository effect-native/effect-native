import { it as vitestIt, expect } from "vitest"
import { layer as mkLayer } from "@effect-native/test/service/TestRunner"

export const layer = () => mkLayer({ it: vitestIt as any, expect })
