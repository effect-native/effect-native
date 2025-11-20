#!/usr/bin/env node
import { register } from "tsx/esm/api"

await register({})

await import("../src/bin.ts")
