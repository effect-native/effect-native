export function isProduction(): boolean {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return true
  }
  return process.env.OR_ENV === "production"
}

export function isCacheEnabled(): boolean {
  if (isProduction()) {
    return false
  }
  if (process.env.DEV_FETCH_CACHE === "0") {
    return false
  }
  if (process.argv.includes("--no-fetch-cache")) {
    return false
  }
  return process.env.DEV_FETCH_CACHE === "1"
}

export function isReplayOnly(): boolean {
  return process.env.DEV_FETCH_CACHE_RECORD === "0"
}

export function getCacheDir(): string {
  return process.env.DEV_FETCH_CACHE_DIR ?? ".cache/fetch"
}
