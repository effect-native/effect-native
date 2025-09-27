/**
 * Core Debug service types and tagged errors.
 *
 * @category Debug
 * @since 0.0.0
 */
import type * as Socket from "@effect/platform/Socket"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"

/**
 * Unique symbol for Debug sessions.
 * @since 0.0.0
 */
export const SessionTypeId: unique symbol = Symbol.for("@effect-native/debug/Session")

/**
 * Transport descriptor for debugger protocols.
 * @since 0.0.0
 */
export interface CdpTransport {
  readonly _tag: "Cdp"
  readonly label?: string | undefined
}

/**
 * Union of supported transports.
 * @since 0.0.0
 */
export type Transport = CdpTransport

/**
 * Helpers for constructing transport descriptors.
 * @since 0.0.0
 */
export const Transport = {
  cdp(options: { readonly label?: string | undefined } = {}): CdpTransport {
    return { _tag: "Cdp", label: options.label }
  }
} as const

/**
 * Command envelope describing a debugger request.
 * @since 0.0.0
 */
export interface Command<A, I = unknown> {
  readonly transport: Transport
  readonly command: string
  readonly params?: I | undefined
  readonly sessionId?: string | undefined
  readonly targetId?: string | undefined
  readonly response: Schema.Schema<A>
}

/**
 * Construct a typed command envelope.
 * @since 0.0.0
 */
export const command = <A, I = unknown>(options: Command<A, I>): Command<A, I> => options

/**
 * Connection options for establishing a Debug session.
 * @since 0.0.0
 */
export interface ConnectOptions {
  readonly endpoint: string
  readonly transport: Transport
}

/**
 * Represents an active Debug session.
 * @since 0.0.0
 */
export interface Session {
  readonly [SessionTypeId]: typeof SessionTypeId
  readonly transport: Transport
  readonly endpoint: string
}

/**
 * Event emitted by a Debug session.
 * @since 0.0.0
 */
export interface Event {
  readonly transport: Transport
  readonly method: string
  readonly params?: unknown
  readonly sessionId?: string | undefined
  readonly targetId?: string | undefined
}

/**
 * Error produced when a session reference is invalid.
 * @since 0.0.0
 */
export class DebugStateError extends Data.TaggedError("DebugStateError")<{
  readonly transport: Transport
  readonly endpoint: string
  readonly reason: string
}> {}

/**
 * Error produced when the underlying transport fails.
 * @since 0.0.0
 */
export class DebugTransportError extends Data.TaggedError("DebugTransportError")<{
  readonly transport: Transport
  readonly endpoint: string
  readonly cause: unknown
}> {}

/**
 * Error produced when the remote protocol reports a failure.
 * @since 0.0.0
 */
export class DebugCommandError extends Data.TaggedError("DebugCommandError")<{
  readonly transport: Transport
  readonly endpoint: string
  readonly command: string
  readonly detail: unknown
}> {}

/**
 * Error produced when decoding a command response fails.
 * @since 0.0.0
 */
export class DebugDecodeError extends Data.TaggedError("DebugDecodeError")<{
  readonly transport: Transport
  readonly endpoint: string
  readonly command: string
  readonly cause: unknown
}> {}

/**
 * Error produced when incoming protocol data is malformed.
 * @since 0.0.0
 */
export class DebugInvalidMessage extends Data.TaggedError("DebugInvalidMessage")<{
  readonly transport: Transport
  readonly endpoint: string
  readonly cause: unknown
}> {}

/**
 * Union of errors emitted by the Debug service.
 * @since 0.0.0
 */
export type DebugError =
  | DebugStateError
  | DebugTransportError
  | DebugCommandError
  | DebugDecodeError
  | DebugInvalidMessage

/**
 * Debug service interface exposing protocol-agnostic operations.
 * @since 0.0.0
 */
export interface Service {
  readonly connect: (
    options: ConnectOptions
  ) => Effect.Effect<Session, DebugError, Scope.Scope | Socket.WebSocketConstructor>
  readonly disconnect: (session: Session) => Effect.Effect<void, DebugError>
  readonly sendCommand: <A, I = unknown>(session: Session, cmd: Command<A, I>) => Effect.Effect<A, DebugError>
  readonly subscribe: (session: Session) => Effect.Effect<Stream.Stream<Event>, DebugError, Scope.Scope>
}

/**
 * Debug service tag.
 * @since 0.0.0
 */
export const Debug = Context.GenericTag<Service>("@effect-native/debug/Debug")
