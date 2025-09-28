/**
 * Internal WebDriver BiDi runtime helpers.
 *
 * @since 0.0.0
 * @internal
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import type * as Scope from "effect/Scope"

/** @internal */
export interface Command<Params = unknown> {
  readonly method: string
  readonly params?: Params
}

/** @internal */
export interface CommandResponse<Result = unknown> {
  readonly id: number
  readonly result: Result
}

/** @internal */
export interface CommandError {
  readonly id: number
  readonly error: {
    readonly error: string
    readonly message: string
    readonly stacktrace?: string
  }
}

/** @internal */
export interface Event<Params = unknown> {
  readonly method: string
  readonly params: Params
}

/** @internal */
export type IncomingMessage = CommandResponse | CommandError | Event

/** @internal */
export type OutgoingMessage<Params = unknown> = {
  readonly id: number
  readonly method: string
  readonly params?: Params
}

/** @internal */
export class TransportSendError extends Data.TaggedError("TransportSendError")<{
  readonly cause: unknown
}> {}

/** @internal */
export class TransportReceiveError extends Data.TaggedError("TransportReceiveError")<{
  readonly cause: unknown
}> {}

/** @internal */
export class TransportClosed extends Data.TaggedError("TransportClosed")<{
  readonly cause: TransportReceiveError
}> {}

/** @internal */
export class CommandFailed extends Data.TaggedError("CommandFailed")<{
  readonly id: number
  readonly method: string
  readonly error: CommandError["error"]
}> {}

/** @internal */
export interface Transport {
  readonly send: <Params>(message: OutgoingMessage<Params>) => Effect.Effect<void, TransportSendError>
  readonly receive: Effect.Effect<IncomingMessage, TransportReceiveError>
}

/** @internal */
export type EventHandler = (event: Event) => Effect.Effect<void>

/** @internal */
export interface BiDiService {
  readonly send: <Params>(
    command: Command<Params>
  ) => Effect.Effect<unknown, CommandFailed | TransportSendError | TransportClosed>
  readonly onEvent: (method: string, handler: EventHandler) => Effect.Effect<void, never, Scope.Scope>
}

/** @internal */
export const Transport = Context.GenericTag<Transport>("@effect-native/bidi/Transport")

/** @internal */
export const BiDi = Context.GenericTag<BiDiService>("@effect-native/bidi/BiDi")

interface PendingEntry {
  readonly method: string
  readonly deferred: Deferred.Deferred<unknown, CommandFailed | TransportClosed>
}

const isCommandResponse = (message: IncomingMessage): message is CommandResponse =>
  Object.prototype.hasOwnProperty.call(message, "id") &&
  Object.prototype.hasOwnProperty.call(message, "result")

const isCommandError = (message: IncomingMessage): message is CommandError =>
  Object.prototype.hasOwnProperty.call(message, "id") &&
  Object.prototype.hasOwnProperty.call(message, "error")

const toOutgoing = <Params>(id: number, command: Command<Params>): OutgoingMessage<Params> =>
  command.params === undefined
    ? { id, method: command.method }
    : { id, method: command.method, params: command.params }

/** @internal */
export const make = Effect.gen(function*(_) {
  const transport = yield* Transport
  const counter = yield* Ref.make(0)
  const pending = yield* Ref.make(new Map<number, PendingEntry>())
  const listeners = yield* Ref.make(new Map<string, ReadonlyArray<EventHandler>>())
  const closed = yield* Ref.make<Option.Option<TransportClosed>>(Option.none())

  const takePending = (id: number) =>
    Ref.modify(pending, (map) => {
      const next = new Map(map)
      const entry = next.get(id)
      if (entry !== undefined) {
        next.delete(id)
        return [Option.some(entry), next] as const
      }
      return [Option.none<PendingEntry>(), map] as const
    })

  const markClosed = (error: TransportReceiveError) =>
    Effect.gen(function*() {
      const current = yield* Ref.get(closed)
      if (Option.isSome(current)) {
        return current.value
      }
      const closure = new TransportClosed({ cause: error })
      yield* Ref.set(closed, Option.some(closure))
      const snapshot = yield* Ref.getAndSet(pending, new Map())
      yield* Effect.forEach(snapshot.values(), (entry) => Deferred.fail(entry.deferred, closure), {
        discard: true
      })
      return closure
    })

  const dispatchEvent = (event: Event) =>
    Effect.gen(function*() {
      const registry = yield* Ref.get(listeners)
      const handlers = registry.get(event.method)
      if (!handlers || handlers.length === 0) {
        return
      }
      yield* Effect.forEach(handlers, (handler) => handler(event), { discard: true })
    })

  const processMessage = (message: IncomingMessage) =>
    Effect.gen(function*() {
      if (isCommandResponse(message)) {
        const entry = yield* takePending(message.id)
        if (Option.isSome(entry)) {
          yield* Deferred.succeed(entry.value.deferred, message.result)
        }
        return
      }
      if (isCommandError(message)) {
        const entry = yield* takePending(message.id)
        if (Option.isSome(entry)) {
          yield* Deferred.fail(
            entry.value.deferred,
            new CommandFailed({ id: message.id, method: entry.value.method, error: message.error })
          )
        }
        return
      }
      yield* dispatchEvent(message)
    })

  const loop = Effect.forever(
    transport.receive.pipe(
      Effect.flatMap(processMessage),
      Effect.catchAll((error) => markClosed(error).pipe(Effect.flatMap((closure) => Effect.fail(closure))))
    )
  )

  const fiber = yield* Effect.forkDaemon(loop)
  yield* Effect.addFinalizer(() => Fiber.interrupt(fiber))

  const send = <Params>(command: Command<Params>) =>
    Effect.gen(function*() {
      const status = yield* Ref.get(closed)
      if (Option.isSome(status)) {
        return yield* Effect.fail(status.value)
      }
      const id = yield* Ref.updateAndGet(counter, (n) => n + 1)
      const deferred = yield* Deferred.make<unknown, CommandFailed | TransportClosed>()
      yield* Ref.update(pending, (map) => {
        const next = new Map(map)
        next.set(id, { method: command.method, deferred })
        return next
      })
      const request = toOutgoing(id, command)
      return yield* Effect.matchEffect(transport.send(request), {
        onFailure: (error) =>
          Effect.gen(function*() {
            yield* Ref.update(pending, (map) => {
              const next = new Map(map)
              next.delete(id)
              return next
            })
            return yield* Effect.fail(error)
          }),
        onSuccess: () => Deferred.await(deferred)
      })
    })

  const onEvent = (method: string, handler: EventHandler) =>
    Effect.acquireRelease(
      Ref.update(listeners, (map) => {
        const next = new Map(map)
        const existing = next.get(method) ?? []
        next.set(method, [...existing, handler])
        return next
      }),
      () =>
        Ref.update(listeners, (map) => {
          const next = new Map(map)
          const existing = next.get(method)
          if (!existing) {
            return next
          }
          const filtered = existing.filter((candidate) => candidate !== handler)
          if (filtered.length === 0) {
            next.delete(method)
          } else {
            next.set(method, filtered)
          }
          return next
        })
    )

  return {
    send,
    onEvent
  }
})

/** @internal */
export const layer = Layer.scoped(BiDi, make)
