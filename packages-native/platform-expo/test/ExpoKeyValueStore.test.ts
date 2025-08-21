import * as Kv from "../src/ExpoKeyValueStore"
import { describe } from "@effect/vitest"
// @ts-ignore
import { testLayer } from "../../../packages/platform/test/KeyValueStore.test.js"

describe("KeyValueStore / layerAsyncStorage", () => testLayer(Kv.layerAsyncStorage))
describe("KeyValueStore / layerSecureStore", () => testLayer(Kv.layerSecureStore))