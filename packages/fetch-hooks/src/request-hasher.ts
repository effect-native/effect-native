import { createHash } from "node:crypto"
import type { RawCachedRequest } from "./types.js"

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

function toBase62(n: bigint): string {
  if (n === 0n) return "0"
  let result = ""
  while (n > 0n) {
    result = BASE62[Number(n % 62n)] + result
    n = n / 62n
  }
  return result
}

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "api-key",
  "x-openrouter-api-key",
  "cookie",
  "set-cookie",
  "x-auth-token",
  "x-access-token",
  "bearer"
])

function normalizeUrl(url: string): string {
  const parsed = new URL(url)
  parsed.searchParams.sort()
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/"
  return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}`
}

function filterHeaders(
  headers: Record<string, string>,
  getOutputKey: (originalKey: string, lowerKey: string) => string
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_HEADERS.has(lowerKey)) {
      continue
    }
    const outputKey = getOutputKey(key, lowerKey)
    result[outputKey] = value
  }
  return result
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  return filterHeaders(headers, (_originalKey, lowerKey) => lowerKey)
}

function filterSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  return filterHeaders(headers, (originalKey) => originalKey)
}

export function hashRequest({ body, headers, method, url }: RawCachedRequest): string {
  // Build content string for hashing
  let content = normalizeUrl(url) + "\n" + method.toUpperCase()
  const normalizedHeaders = normalizeHeaders(headers)
  const sortedHeaderKeys = Object.keys(normalizedHeaders).sort()
  for (const key of sortedHeaderKeys) {
    content += `\n${key}:${normalizedHeaders[key]}`
  }
  if (body) {
    content += `\n${body}`
  }
  // Create a SHA256 hash and convert to base62 for a short string
  const hash = createHash("sha256").update(content).digest()
  const hashBigInt = BigInt("0x" + hash.toString("hex"))
  return toBase62(hashBigInt % 62n ** 11n) // Limit to base62 with ~11 chars max
}

export function getStorableHeaders(headers: Record<string, string>): Record<string, string> {
  return filterSensitiveHeaders(headers)
}

export function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}
