# access control

Like Scope
Can be revoked at any time
Gates access to any arbitrary resource 
Helpers to pick specific fields to gate and which ones to keep free
Can gate permissions and access in a fine grained way on any arbitrary effect


```ts
const getSecret = Effect.succeed(secret)

const alwaysAllowed = AccessControl.make(Effect.succeed(true))

const getSecretIfAllowed = getSecret.pipe(AccessControl.withPermission(alwaysAllowed))
```

```ts
const getSecret = Effect.succeed(secret)

const sometimesAllowed = AccessControl.make(Effect.sync(()=>Math.random()>0.5))

const getSecretIfAllowed = getSecret.pipe(AccessControl.withPermission(sometimesAllowed))
```

For layers


```ts
const program = Effect.gen(function*(){
  // randomly AccessControlError
  const sql = yield* SqlClient
})

const mainLayer = Layer.mergeAll(
  AccessControl.layer(sometimesAllowed, BunSqliteClient.layer)
)

runMain(program.pipe(Effect.provide(mainLayer))
```


For layers

Creates a proxy layer that provides a context that is indistinguishable from the real context except that each field is gated by the access controller effect


```ts
const program = Effect.gen(function*(){
  const sql = yield* SqlClient
  
  // …
  
  // randomly AccessControlError
  yield* sql.query(`SELECT 123`)
})

const mainLayer = Layer.mergeAll(
  AccessControl.layerProxy(sometimesAllowed, BunSqliteClient.layer)
)

runMain(program.pipe(Effect.provide(mainLayer))
```


