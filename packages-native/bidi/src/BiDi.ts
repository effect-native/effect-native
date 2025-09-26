/**
 * WebDriver BiDi runtime primitives.
 * @since 0.0.0
 */
import * as internal from "./internal/BiDi.js"

/** @since 0.0.0 */
export type Command<Params = unknown, Result = unknown> = internal.Command<Params, Result>

/** @since 0.0.0 */
export type CommandResponse<Result = unknown> = internal.CommandResponse<Result>

/** @since 0.0.0 */
export type CommandError = internal.CommandError

/** @since 0.0.0 */
export type Event<Params = unknown> = internal.Event<Params>

/** @since 0.0.0 */
export type EventHandler<Params = unknown> = internal.EventHandler<Params>

/** @since 0.0.0 */
export type IncomingMessage = internal.IncomingMessage

/** @since 0.0.0 */
export type OutgoingMessage = internal.OutgoingMessage

/** @since 0.0.0 */
export interface BiDiService extends internal.BiDiService {}

/** @since 0.0.0 */
export const BiDi = internal.BiDi

/** @since 0.0.0 */
export const layer = internal.layer

/** @since 0.0.0 */
export const make = internal.make

/** @since 0.0.0 */
export interface Transport extends internal.Transport {}

/** @since 0.0.0 */
export const Transport = internal.Transport

/** @since 0.0.0 */
export class TransportSendError extends internal.TransportSendError {}

/** @since 0.0.0 */
export class TransportReceiveError extends internal.TransportReceiveError {}

/** @since 0.0.0 */
export class TransportClosed extends internal.TransportClosed {}

/** @since 0.0.0 */
export class CommandFailed extends internal.CommandFailed {}
