/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/service/TestRunner"

import { layer } from "./layer.js"

TestRunner.setDefaultLayer(layer)
