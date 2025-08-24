import { describe } from "@effect/vitest"
import * as Kv from "../src/ExpoKeyValueStore.js"
// @ts-ignore
import { testLayer } from "../../../packages/platform/test/KeyValueStore.test.js"

describe("KeyValueStore / layerAsyncStorage", () => testLayer(Kv.layerAsyncStorage))
describe("KeyValueStore / layerSecureStore", () => testLayer(Kv.layerSecureStore))
