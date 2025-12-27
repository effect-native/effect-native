# Changelog

## 0.0.2

### Patch Changes

- [`38245e0`](https://github.com/effect-native/effect-native/commit/38245e07c7922fe6c56c233b014d6d9067e3f2b8) Thanks [@subtleGradient](https://github.com/subtleGradient)! - Fix TypeScript build and ESLint issues
  - Add `@types/node` to devDependencies for Node.js type declarations
  - Add `.js` extension to all relative imports for ESM compatibility with `moduleResolution: NodeNext`
  - Add explicit type annotations to KV implementation functions to resolve implicit `any` errors
  - Fix FormData entry handling to properly convert File objects to strings
  - Replace `require()` calls with imported `readdirSync` in tests
  - Remove unused import in filesystem-storage.test.ts
  - Fix spread in Array.push to use slice() instead

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
