import { BufferLike } from './infra';
import { SimpleLoggerInterface } from './logging';

/*****************************************************
 * Pub/Sub
 *****************************************************/

/**
 * An interface that presents a method for publishing a message
 *
 * Implementations of this interface are expected to specify a concrete type for
 * the msg parameter. This allows implementations to choose their own valid message
 * formats.
 */
export interface SimplePublisherInterface<MsgType, Options = unknown> {
  /**
   * Publish a message to a channel.
   *
   * "channel" is the name of a message channel, and is based largely on AMQP's concept
   * of an "exchange". The idea is that you publish a message to a named channel, and
   * it is the channel's job to then route the message. The `msg` value should carry
   * all necessary information for your implementation of the publisher to specify
   * the correct routing parameters.
   */
  publish(channel: string, msg: MsgType, options?: Options): Promise<void>;

  /**
   * Needs to accommodate connection-level error handling and events
   */
  on(event: 'error', listener: (e: Error) => void): this;
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  once(event: 'error', listener: (e: Error) => void): this;
  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  removeListener(event: 'connect' | 'disconnect' | 'error', listener: () => void): this;
  removeAllListeners(event?: 'connect' | 'disconnect' | 'error'): this;

  /**
   * Close the connection
   */
  close(): Promise<unknown>;
}

/**
 * An interface that presents a method for subscribing to a message stream.
 *
 * In AMQP paradigm, `Channel` would be the exchange, while `RoutingKey` would be something
 * like 'app.created.users'.
 */
declare type RoutingKey = string;
export interface SimpleSubscriberInterface<MsgType = SimplePubSubMessageInterface, Options = unknown> {
  subscribe(
    routes: { [channel: string]: Array<RoutingKey> },
    handler: (msg: MsgType, log: SimpleLoggerInterface) => Promise<boolean>,
    options?: Options,
  ): Promise<void>;

  /**
   * Needs to accommodate connection-level error handling and events
   */
  on(event: 'error', listener: (e: Error) => void): this;
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  once(event: 'error', listener: (e: Error) => void): this;
  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  removeListener(event: 'connect' | 'disconnect' | 'error', listener: () => void): this;
  removeAllListeners(event?: 'connect' | 'disconnect' | 'error'): this;

  /**
   * Close the connection
   */
  close(): Promise<unknown>;
}

/**
 * An interface describing the simplest type of message. All messages must have at minimum a
 * `content` field containing a string or buffer with their contents. Implementations of this
 * interface should resist the temptation to deserialize messages, as it gets very confusing
 * trying to figure out when and where a message is expected to be in it's final form. That
 * job should be delegated to higher level libraries.
 */
export interface SimplePubSubMessageInterface<Extra = unknown> {
  content: string | BufferLike;
  extra?: Extra;
}

/**
 * An interface that presents a pub/sub client
 */
export interface SimplePubSubInterface<
  SubMsgType = SimplePubSubMessageInterface,
  PubMsgType = unknown,
  SubOptions = unknown,
  PubOptions = unknown,
> extends SimplePublisherInterface<PubMsgType, PubOptions>,
    SimpleSubscriberInterface<SubMsgType, SubOptions> {}

/**
 * An interface that provides a good starting point for a typical Event
 *
 * Note that this is intended to be extended in your domain to include whatever other data you
 * might want in an event. This is not meant to be a complete event object.
 */
export interface SimpleSubmittedEvent {
  /** A UUID for the event */
  id?: string;

  /** The time in MS at which the event occurred */
  timestamp?: number;

  /** The domain in which the event was produced*/
  domain?: string;

  /** A stack of event ID that caused this event to be produced, if applicable */
  parentIds?: Array<string> | null;

  /** A field for miscellaneous data */
  meta?: unknown;
}
export interface SimpleEvent extends SimpleSubmittedEvent {
  type: 'event';
  id: string;
  timestamp: number;
  domain: string;
}

/**
 * An interface that provides a good starting point (based on JsonRpc) for a task-type message
 */
export interface SimpleSubmittedTask {
  /** A UUID for the task */
  id?: string;

  /** A stack of event ID that caused this event to be produced, if applicable */
  parents?: Array<string> | null;

  /** The domain in which the task was produced*/
  domain?: string;

  /** The method to be called (see JsonRpc spec) */
  method: string;

  /** The parameters to be supplied (see JsonRpc spec) */
  params?:
    | { [name: string]: string | number | boolean | object | null }
    | Array<string | number | boolean | object | null>;

  /** Misc extra data */
  meta?: unknown;
}
export interface SimpleTask extends SimpleSubmittedTask {
  type: 'task';
  id: string;
  domain: string;
}

export type SimpleMessage = SimpleEvent | SimpleTask;
