# Effect Native

An ecosystem of native platform tools built on [Effect](https://effect.website).

|Status|Package|Purpose|
|---|---|---|
|![](https://img.shields.io/npm/v/note)|npx note|capture notes|
|![](https://img.shields.io/npm/v/@effect-native/bun-test)|@effect-native/bun-test|Unit test helpers for bun:test (clone of @effect/vitest)|
|![](https://img.shields.io/npm/v/@effect-native/libsqlite)|@effect-native/libsqlite|Latest native SQLite3 dynamic library, pre-compiled|
|![](https://img.shields.io/npm/v/@effect-native/libcrsql)|@effect-native/libcrsql|Latest native CR-SQLite extension, pre-compiled|
|![](https://img.shields.io/npm/v/@effect-native/crsql)|@effect-native/crsql|Effect Service for working with the CrSql extension|
|![](https://img.shields.io/npm/v/@effect-native/debug)|@effect-native/debug|JS runtime debugger automation tools|
|![](https://img.shields.io/npm/v/@effect-native/patterns)|@effect-native/patterns|Experimental patterns library|
|![](https://img.shields.io/npm/v/@effect-native/schemas)|@effect-native/schemas|Reusable Effect schemas|
|![](https://img.shields.io/npm/v/@effect-native/fetch-hooks)|@effect-native/fetch-hooks|globalThis.fetch wrapper with replay cache and lifecycle hooks|
|![](https://img.shields.io/npm/v/@effect-native/openrouter)|@effect-native/openrouter|effect native openrouter callModel|

## Roadmap

See [the Effect Native Project Board](https://github.com/orgs/effect-native/projects/1/views/1) to see what we're working on next.

## Development

This project uses Nix for reproducible builds. All commands should be run within the Nix development shell:

```bash
# Enter the development shell
nix develop

# Install dependencies
pnpm install

# Run all checks
pnpm ok

# Run tests
pnpm test

# Build all packages
pnpm build
```

## License

MIT
