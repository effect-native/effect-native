import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = dirname(__dirname)

function fail(msg) {
  console.error(`verify-exports: ${msg}`)
  process.exit(1)
}

const distEsm = join(root, 'dist/dist/esm/effect.js')
const distCjs = join(root, 'dist/dist/cjs/effect.js')
const distDts = join(root, 'dist/dist/dts/effect.d.ts')

if (!existsSync(distEsm)) fail(`missing ${distEsm}`)
if (!existsSync(distCjs)) fail(`missing ${distCjs}`)
if (!existsSync(distDts)) fail(`missing ${distDts}`)

const pkgJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
if (!(pkgJson.exports && pkgJson.exports['./effect'])) fail('exports["./effect"] not present')

await import(pathToFileURL(distEsm).href).catch((e) => {
  console.error('verify-exports: ESM import failed:', e)
  process.exit(1)
})

console.log('verify-exports: OK')
