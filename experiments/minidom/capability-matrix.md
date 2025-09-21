# MiniDom Adapter Capability Matrix (E2)

| Adapter | Baseline Contract (`Effect` ops) | Sync Capability | Transactions | Observation Streams | Attribute Bag Mode | Schema Extensions Support | Notes |
|---------|----------------------------------|-----------------|--------------|---------------------|--------------------|---------------------------|-------|
| WindowMiniDom (browser window) | Native DOM mapped into Effect wrappers | Yes (`Effect.sync`) | No | Via MutationObserver (optional `Events`) | Snapshot bag (sync) | Metadata ignored | Uses live DOM; emits events through observer bridge. |
| HappyMiniDom | happy-dom backing store | Yes (`Effect.sync`) | No | Via mutation hooks (needs adapter) | Snapshot bag (sync) | Metadata ignored | Runs in Node, purely synchronous. |
| jsdom | jsdom document | Yes (`Effect.sync`) | No | Requires polling or mutation observer shim | Snapshot bag (sync) | Metadata ignored | Similar to happy-dom but slightly slower; observation optional. |
| MemoryMiniDom | Custom in-memory tree | Yes (`Effect.sync`) | Planned via batched operations | Optional stream emitter | Snapshot bag (sync) | Metadata consumed for validation only | Serves as default deterministic backend. |
| SqlMiniDom (Effect SQL) | Database-backed tree via SqlClient | Partial (reads sync via snapshot) | Yes (`withTransaction`) | Emits change stream via triggers / channel | Attribute bag is effectful (lazy loads) | Uses `extensions.sql` for table/column hints | Async boundaries captured by `Effect` return values. |
| KvMiniDom | Key-value store (e.g., Redis) | Partial (reads require Effect) | Optional (`multi` support) | PubSub feed for changes | Attribute bag effectful | Uses `extensions.kv` for key prefixes | Capabilities flag asynchronous behaviour. |
| RemoteMiniDom (HTTP/gRPC) | Always async | No | Depends on remote service | Server-sent events / long-poll | Attribute bag effectful (fetched per access) | Metadata informs payload shapes | Requires Suspense integration. |

**Conclusion:** All adapters obey the shared Effect-based API. Divergences manifest as optional capabilities (`Sync`, `Transaction`, `Events`, `LazyAttributes`, `SchemaExtensions`). By detecting capabilities at runtime, consumers avoid undefined behaviour while still composing multiple backends.
