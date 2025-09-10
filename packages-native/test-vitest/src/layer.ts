import { layer as mkLayer } from "@effect-native/test/service/TestRunner"
import { expect, it as vitestIt } from "vitest"

export const layer = () => mkLayer({ it: vitestIt as any, expect })
