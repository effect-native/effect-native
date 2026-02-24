# Work Orders (from .gaps/sqlite-graph-ext.md)

1. Keep `.gaps/sqlite-graph-ext.md` and all six release artifacts in sync after future edits.

   done_when

   ```bash
   test -s packages/sqlite-graph-ext/lib/darwin-aarch64/sqlite3_graph_ext.dylib && test -s packages/sqlite-graph-ext/lib/darwin-x86_64/sqlite3_graph_ext.dylib && test -s packages/sqlite-graph-ext/lib/linux-aarch64/sqlite3_graph_ext.so && test -s packages/sqlite-graph-ext/lib/linux-x86_64/sqlite3_graph_ext.so && test -s packages/sqlite-graph-ext/lib/win-x86_64/sqlite3_graph_ext.dll && test -s packages/sqlite-graph-ext/lib/win-i686/sqlite3_graph_ext.dll && bun test ./packages/sqlite-graph-ext/test/graph-extension.contract.test.ts
   ```
