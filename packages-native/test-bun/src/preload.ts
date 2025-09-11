/**
 * @since 0.0.1
 */
import * as TestRunner from "@effect-native/test/services/TestRunner"

import { layer } from "./layer.js"

TestRunner.setDefaultLayer(layer)
