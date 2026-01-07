---
"@effect-native/fetch-hooks": minor
---

Add binary data URL extraction to sidecar files for cache storage

- Add `createRequestFileKV()` for request caching that extracts inline base64 data URLs (e.g., `data:image/png;base64,...`) to separate sidecar files like `request.json.assets/0001.png`
- Add `createTextFileKV()` for response body caching with the same binary extraction behavior
- Update `createFilesystemStorage()` to use these new KV implementations, improving cache readability and reducing JSON file bloat
- Add comprehensive JSDoc documentation with examples for new functions
