#!/usr/bin/env node

import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import and run the compiled CLI
const cliPath = join(__dirname, "..", "dist", "esm", "cli", "steps.js")
await import(cliPath)
