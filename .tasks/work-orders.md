# Work Orders (from .gaps/sqlite-graph-ext.md)

1. Keep demo DX contract and helper ergonomics stable when changing `packages/sqlite-graph-ext-demo/src/demo.ts` or `packages/sqlite-graph-ext/src/bun.ts`.

   done_when

   ```bash
   bun run check:tsgo && bun run --filter @effect-native/sqlite-graph-ext-demo run && node -e "const fs=require('fs');const src=fs.readFileSync('packages/sqlite-graph-ext-demo/src/demo.ts','utf8');if(!src.includes('withBunGraphRuntime')) process.exit(1);if(/\bsetCustomSQLite\s*\(/.test(src)||/\bloadExtension\s*\(/.test(src)) process.exit(1);if(!src.includes('PARITY_CONFIRMED')||!src.includes('MISMATCH_DETECTED')) process.exit(1)"
   ```

2. Keep typed client decode-path and extension contract checks green together.

   done_when

   ```bash
   bun test ./packages/sqlite-graph-ext/test/client.decode-path.test.ts && bun test ./packages/sqlite-graph-ext/test/graph-extension.contract.test.ts && nix develop --command bun run --filter @effect-native/sqlite-graph-ext test-zig
   ```
