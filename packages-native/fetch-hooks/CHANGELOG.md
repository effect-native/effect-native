# Changelog

## 0.1.1

### Patch Changes

- [#215](https://github.com/effect-native/effect-native/pull/215) [`12dfc0f`](https://github.com/effect-native/effect-native/commit/12dfc0f3bb86b29ada7947fab807249fe5aa61ad) Thanks [@subtleGradient](https://github.com/subtleGradient)! - Fix SSE cache persistence so streaming responses return immediately while still being recorded safely to cache.

  Also harden cache tests against concurrent execution by isolating filesystem storage per test and removing shared cache-dir races.

## 0.1.0

### Minor Changes

- [#207](https://github.com/effect-native/effect-native/pull/207) [`e6866e9`](https://github.com/effect-native/effect-native/commit/e6866e9ac1c0d031cfa1492ddef13a80e199394e) Thanks [@subtleGradient](https://github.com/subtleGradient)! - Add binary data URL extraction to sidecar files for cache storage
  - Add `createRequestFileKV()` for request caching that extracts inline base64 data URLs (e.g., `data:image/png;base64,...`) to separate sidecar files like `request.json.assets/0001.png`
  - Add `createTextFileKV()` for response body caching with the same binary extraction behavior
  - Update `createFilesystemStorage()` to use these new KV implementations, improving cache readability and reducing JSON file bloat
  - Add comprehensive JSDoc documentation with examples for new functions

## 0.0.2

### Patch Changes

- [`38245e0`](https://github.com/effect-native/effect-native/commit/38245e07c7922fe6c56c233b014d6d9067e3f2b8) Thanks [@subtleGradient](https://github.com/subtleGradient)! - Fix TypeScript build and ESLint issues

## [0.0.1] - 2025-12-26

### Added

- Initial release
- Request caching system with deterministic replay
- Binary response extraction and handling
- Filesystem-based storage backend
- SSE (Server-Sent Events) stream replay support
- Request hashing for cache key generation
- Environment detection for Bun/Node.js runtime
- Comprehensive test coverage

### Notes

This is the initial v0.0.1 release providing foundational fetch caching functionality. Future releases will add Effect.ts integration and additional runtime support.
