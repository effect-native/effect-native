# @effect-native/graph-db-demo

Private incubator package for `@effect-native/graph-db`.

Policy for this package:

- new graph-db ideas land here first
- once behavior feels right, extract stable pieces into `@effect-native/graph-db`

Run the end-to-end demo:

```bash
bun --filter @effect-native/graph-db-demo demo
```

Current showcase query:

- `photos liked by friends-of-friends`

The demo prints:

- ranked results (top photos + FoF support counts)
- query profile counters (edge calls, traversed rows, elapsed time)
- an affordance report proposing which helper APIs to extract into `@effect-native/graph-db`
