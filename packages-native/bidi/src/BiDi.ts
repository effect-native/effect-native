/**
 * WebDriver BiDi runtime primitives that wrap the transport and routing rules.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
import * as internal from "./internal/BiDi.js"

/**
 * A WebDriver BiDi command envelope.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#commands | WebDriver BiDi § Commands}
 * @since 0.0.0
 */
export type Command<Params = unknown> = internal.Command<Params>

/**
 * The success response for a WebDriver BiDi command.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#commands | WebDriver BiDi § Commands}
 * @since 0.0.0
 */
export type CommandResponse<Result = unknown> = internal.CommandResponse<Result>

/**
 * The error response payload for a WebDriver BiDi command.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#errors | WebDriver BiDi § Errors}
 * @since 0.0.0
 */
export type CommandError = internal.CommandError

/**
 * A WebDriver BiDi event notification emitted by the remote end.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#events | WebDriver BiDi § Events}
 * @since 0.0.0
 */
export type Event<Params = unknown> = internal.Event<Params>

/**
 * Effectful handler invoked when a subscribed WebDriver BiDi event arrives.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#events | WebDriver BiDi § Events}
 * @since 0.0.0
 */
export type EventHandler = internal.EventHandler

/**
 * Any inbound WebDriver BiDi message from the transport.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export type IncomingMessage = internal.IncomingMessage

/**
 * Any outbound WebDriver BiDi message sent over the transport.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export type OutgoingMessage = internal.OutgoingMessage

/**
 * Service contract that sends commands and wires event subscriptions per the specification.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#commands | WebDriver BiDi § Commands}
 * @see {@link https://w3c.github.io/webdriver-bidi/#events | WebDriver BiDi § Events}
 * @since 0.0.0
 */
export interface BiDiService extends internal.BiDiService {}

/**
 * Context tag for the WebDriver BiDi service.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#commands | WebDriver BiDi § Commands}
 * @since 0.0.0
 */
export const BiDi = internal.BiDi

/**
 * Layer constructor that provides the WebDriver BiDi service scoped to a transport.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export const layer = internal.layer

/**
 * Creates a WebDriver BiDi service instance that manages request correlation and event dispatch.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export const make = internal.make

/**
 * Transport contract used by the WebDriver BiDi runtime.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export interface Transport extends internal.Transport {}

/**
 * Context tag for the active WebDriver BiDi transport.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export const Transport = internal.Transport

/**
 * Failure raised when the transport cannot send a message.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export class TransportSendError extends internal.TransportSendError {}

/**
 * Failure raised when receiving from the transport fails.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export class TransportReceiveError extends internal.TransportReceiveError {}

/**
 * Failure raised when the transport closes and pending commands are cancelled.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#transport | WebDriver BiDi § Transport}
 * @since 0.0.0
 */
export class TransportClosed extends internal.TransportClosed {}

/**
 * Failure raised when the remote end reports a command error.
 *
 * @see {@link https://w3c.github.io/webdriver-bidi/#errors | WebDriver BiDi § Errors}
 * @since 0.0.0
 */
export class CommandFailed extends internal.CommandFailed {}
