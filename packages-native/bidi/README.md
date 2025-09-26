# @effect-native/bidi

Opinionated WebDriver BiDi runtime primitives for Effect.

> ⚠️ Work in progress. This package currently exposes the absolute minimum to bootstrap a request/response loop over an abstract transport.

## Usage

```ts
import * as BiDi from "@effect-native/bidi/BiDi"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"

const InMemoryTransportLive = Layer.scoped(
  BiDi.Transport,
  Effect.gen(function* () {
    const outgoing = yield* Queue.unbounded<BiDi.OutgoingMessage>()
    const incoming = yield* Queue.unbounded<BiDi.IncomingMessage>()

    return {
      send: (message: BiDi.OutgoingMessage) => Queue.offer(outgoing, message),
      receive: Queue.take(incoming)
    }
  })
)

const BiDiDemoLive = Layer.mergeAll(
  InMemoryTransportLive,
  BiDi.layer
)

// BunRuntime.runMain(Layer.launch(BiDiDemoLive))
```
