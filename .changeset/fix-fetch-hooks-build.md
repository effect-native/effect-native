---
"@effect-native/fetch-hooks": patch
---

Fix TypeScript build and ESLint issues

- Add `@types/node` to devDependencies for Node.js type declarations
- Add `.js` extension to all relative imports for ESM compatibility with `moduleResolution: NodeNext`
- Add explicit type annotations to KV implementation functions to resolve implicit `any` errors
- Fix FormData entry handling to properly convert File objects to strings
- Replace `require()` calls with imported `readdirSync` in tests
- Remove unused import in filesystem-storage.test.ts
- Fix spread in Array.push to use slice() instead
