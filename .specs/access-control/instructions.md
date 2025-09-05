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





