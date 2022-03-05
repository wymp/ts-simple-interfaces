/*****************************************************
 * Infrastructure
 *****************************************************/

/**
 * NOTE: In order to make BufferLike work without node types, we had to use some displeasingly
 * vague types, like "object". This is considered acceptable in light of the goal of not requiring
 * node typings for this library.
 */
export type CharacterEncodings = "utf8" | "hex" | "base64" | "utf16";
export interface BufferLike {
  equals(otherBuffer: object): boolean;
  toString(encoding?: string, start?: number, end?: number): string;
  slice(start?: number, end?: number): BufferLike;
  indexOf(
    value: string | number | object,
    byteOffset?: number,
    encoding?: string
  ): number;
  lastIndexOf(
    value: string | number | object,
    byteOffset?: number,
    encoding?: string
  ): number;
  includes(
    value: string | number | object,
    byteOffset?: number,
    encoding?: string
  ): boolean;
}

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
  on(event: "error", listener: (e: Error) => void): this;
  on(event: "connect", listener: () => void): this;
  on(event: "disconnect", listener: () => void): this;
  once(event: "error", listener: (e: Error) => void): this;
  once(event: "connect", listener: () => void): this;
  once(event: "disconnect", listener: () => void): this;
  removeListener(
    event: "connect" | "disconnect" | "error",
    listener: () => void
  ): this;
  removeAllListeners(event?: "connect" | "disconnect" | "error"): this;

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
export interface SimpleSubscriberInterface<
  MsgType = SimplePubSubMessageInterface,
  Options = unknown
> {
  subscribe(
    routes: { [channel: string]: Array<RoutingKey> },
    handler: (msg: MsgType, log: SimpleLoggerInterface) => Promise<boolean>,
    options?: Options
  ): Promise<void>;

  /**
   * Needs to accommodate connection-level error handling and events
   */
  on(event: "error", listener: (e: Error) => void): this;
  on(event: "connect", listener: () => void): this;
  on(event: "disconnect", listener: () => void): this;
  once(event: "error", listener: (e: Error) => void): this;
  once(event: "connect", listener: () => void): this;
  once(event: "disconnect", listener: () => void): this;
  removeListener(
    event: "connect" | "disconnect" | "error",
    listener: () => void
  ): this;
  removeAllListeners(event?: "connect" | "disconnect" | "error"): this;

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
  PubOptions = unknown
>
  extends SimplePublisherInterface<PubMsgType, PubOptions>,
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
  type: "event";
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
  type: "task";
  id: string;
  domain: string;
}

export type SimpleMessage = SimpleEvent | SimpleTask;

/*****************************************************
 * Datasource
 *****************************************************/

/**
 * A SimpleDatasource is imagined to be a generic, CRUD-enabled I/O layer.
 *
 * This may be a REST API, a SQL database, a document store, etc. - it's just
 * anything that you can save something to and retrieve something from.
 */
export interface SimpleDatasourceInterface {
  /**
   * `get` is meant to accept a structured DSL query serialized to string. This may
   * be a human-readable string, such as `email = 'me@myself.com' and active = true`,
   * or it may be a JSON-serialized DSL query such as those defined by the
   * [dsl-queries](https://github.com/wymp/ts-dsl-queries) package.
   *
   * Either way, this function is to return at least a simple dataset interface,
   * and may return something more complex depending on your implementation.
   */
  get: <T extends unknown>(query: string) => Promise<SimpleDatasetInterface<T>>;

  /**
   * Save is intended to be used for both creation and update. Some people prefer to use
   * complex Resource objects that offer interesting features like change tracking, etc.,
   * while others prefer simpler objects that act only as value stores. This interface
   * allows you to use anything, so long as you return the same.
   *
   * The second argument, "force", is a flag that allows you to either overwrite all fields
   * with the currently specified values, or just send changed fields. A value of "true"
   * translates roughly to a `PUT` request, while a value of "false" may translate to either
   * a `POST` or a `PATCH` request. Note that implementations of this interface should make
   * their own decisions about how to handle resources that do or don't already have assigned
   * IDs.
   */
  save: <T extends unknown>(resource: Partial<T>, force: boolean) => Promise<T>;

  /**
   * Should accept the ID of a resource to delete.
   */
  delete: (resourceId: string) => Promise<void>;
}

/**
 * A SimpleDataset is anything with rows of data.
 */
export interface SimpleDatasetInterface<T extends unknown> {
  rows: Array<T>;
}

/**
 * While any SQL datasource may be easily implemented as a SimpleDatasource, they may also
 * be implemented more specifically as a general SimpleSqlDbInterface. This interface is
 * intended to help unify the various implementations of SQL databases out in the wild, such
 * that they may be more plug-and-playable.
 */
export type SqlPrimitive = string | number | boolean | BufferLike | Date | null;
export type SqlValue = SqlPrimitive | Array<SqlValue>;
export interface SimpleSqlDbInterface {
  query: <T extends unknown>(
    query: string,
    params?: Array<SqlValue>
  ) => Promise<SimpleSqlResponseInterface<T>>;
  transaction: <T extends unknown>(
    queries: (cnx: SimpleSqlDbInterface) => Promise<T>,
    txName?: string | null | undefined
  ) => Promise<T>;
}

/**
 * Most of these properties are optional, since they are rarely used and many developers will
 * choose not to implement them.
 */
export interface SimpleSqlResponseInterface<T extends unknown>
  extends SimpleDatasetInterface<T> {
  /**
   * The number of rows affected by a create, update or delete action
   */
  readonly affectedRows?: number | null;

  /**
   * The total number of rows a SELECT query would have returned had it not had a limit applied
   */
  readonly totalRows?: number | null;
}

/****************************************************
 * HTTP
 ***************************************************/

type LowerCaseHttpMethods =
  | "get"
  | "delete"
  | "head"
  | "options"
  | "post"
  | "put"
  | "patch";
type UpperCaseHttpMethods =
  | "GET"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"
  | "POST"
  | "PUT"
  | "PATCH";
export type HttpMethods = LowerCaseHttpMethods | UpperCaseHttpMethods;

/**
 * A simple HTTP Request config object (reduced clone of AxiosRequestConfig)
 */
export interface SimpleHttpClientRequestConfig {
  url?: string;
  baseURL?: string;
  method?: HttpMethods;
  headers?: { [headerName: string]: Array<string> | string | undefined };
  params?: { [paramKey: string]: string | number | null | undefined };
  data?: any;
  timeout?: number;
  maxRedirects?: number;
  throwErrors?: boolean;
  requireValidCerts?: boolean;
}

/**
 * A simple HTTP Response interface (reduced clone of AxiosResponse) representing a response
 * object received by an HTTP Client in response to a request made to a server.
 */
export interface SimpleHttpClientResponseInterface<T = any> {
  data: T;
  status: number;
  headers: any;
  config: SimpleHttpClientRequestConfig;
}

/**
 * This defines a simple HTTP interface which can dress Axios, Request-Promise-Native, etc.
 *
 * It should throw an HttpError (see [@wymp/http-errors](https://github.com/wymp/ts-http-errors))
 * on status codes >= 400.
 */
export interface SimpleHttpClientInterface {
  request: <T = unknown>(
    config: SimpleHttpClientRequestConfig,
    _log?: SimpleLoggerInterface
  ) => Promise<SimpleHttpClientResponseInterface<T>>;
}

export interface SimpleHttpServerRequestInterface {
  /**
   * URL parameters as defined by the route
   *
   * Note: Because this is a runtime boundary, it's not useful to try to define this using
   * generics. It's much better to leave it vague and to force developers to do runtime checks
   * on the incoming data.
   */
  params: { [key: string]: string };

  /**
   * Query parameters
   *
   * See `params` for explanation of choice around "any" typing.
   */
  query: { [key: string]: any };

  /**
   * Get the value of a header
   */
  get(name: string): string | undefined;
  header(name: string): string | undefined;

  /**
   * Get the full path of the request
   */
  path: string;

  /**
   * Get the hostname of the request
   */
  hostname: string;

  /**
   * Get the body of the request
   *
   * See `params` for explanation of choice around "any" typing.
   */
  body: any;

  /**
   * The method by which the route was called
   */
  method: string;

  /**
   * The original URL for the request
   */
  originalUrl: string;

  /**
   * The final URL for the request
   */
  url: string;

  /**
   * Tests whether this request accepts the given content type(s). Returns false (or undefined?)
   * if it does not, otherwise returns the preffered type that was passed in. (See express type
   * documentation for more information.)
   */
  accepts(): Array<string>;
  accepts(type: string): string | false | undefined;
  accepts(type: Array<string>): string | false | undefined;
  accepts(...type: Array<string>): string | false | undefined;
}

/**
 * A response object, usually passed into request handlers and used to build up and eventually
 * send an HTTP response.
 */
export interface SimpleHttpServerResponseInterface {
  /**
   * Set status `code`.
   */
  status(code: number): SimpleHttpServerResponseInterface;

  /**
   * Send a response.
   *
   * Examples:
   *
   *     res.send(Buffer.from('wahoo'));
   *     res.send({ some: 'json' });
   *     res.send('<p>some html</p>');
   *     res.status(404).send('Sorry, cant find that');
   */
  send: (body?: unknown) => SimpleHttpServerResponseInterface;

  /**
   * Set header `field` to `val`, or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    res.set('Foo', ['bar', 'baz']);
   *    res.set('Accept', 'application/json');
   *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * Aliased as `res.header()`.
   */
  set(field: any): SimpleHttpServerResponseInterface;
  set(
    field: string,
    value?: string | string[]
  ): SimpleHttpServerResponseInterface;

  header(field: any): SimpleHttpServerResponseInterface;
  header(
    field: string,
    value?: string | string[]
  ): SimpleHttpServerResponseInterface;

  /** Get value for header `field`. */
  get(field: string): string;

  /**
   * Redirect to the given URL with the given status (defaults to 302 temporary)
   */
  redirect(url: string, status: number): void;

  /**
   * Variables to attach to the response
   *
   * While this is not a runtime boundary, there's no way to link handler functions together in
   * such a way that we can statically verify conformity with expectations for this variable.
   * Thus, it's better to type it as "any" because we will almost always be using it in a sort of
   * "if this is set, then use it" sort of way.
   */
  locals: any;
}

/**
 * This function is passed by the Webservice to all handlers and is responsible for chaining
 * middleware together and for handling errors generated by handlers. In the event that an
 * error occurs while processing a request, you can pass that error to this next function to
 * activate any error handling logic you've put in place. Otherwise, control is simply passed
 * to the next middleware in the stack.
 */
export type SimpleHttpServerNextFunction = (errOrOtherVal?: any) => void;

/**
 * This defines a function that accepts the standard request/response/next triad and utilizes
 * them to do something, including (sometimes) send responses or add variables to the request, etc.
 *
 * It additionally defines a special middleware that handles errors
 */
export interface SimpleHttpServerMiddleware {
  (
    req: SimpleHttpServerRequestInterface,
    res: SimpleHttpServerResponseInterface,
    next: SimpleHttpServerNextFunction
  ): unknown;
}
export interface SimpleHttpServerErrorHandler {
  (
    e: any,
    req: SimpleHttpServerRequestInterface,
    res: SimpleHttpServerResponseInterface,
    next: SimpleHttpServerNextFunction
  ): unknown;
}

export interface SimpleHttpRequestHandlerBasicInterface {
  all: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
  get: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
  post: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
  patch: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
  put: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
  delete: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
  head: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
  options: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ) => SimpleHttpRequestHandlerInterface;
}

/**
 * This defines a simple request handler that allows you to add global middleware and error
 * handling, as well as routing per http method. It used to support the idea of a collection of
 * app-local variables, but upon further consideration it was determined that there is not enough
 * perceived value added by that system to really continue its existence.
 */
export interface SimpleHttpRequestHandlerInterface
  extends SimpleHttpRequestHandlerBasicInterface {
  use(
    middleware: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface;
  catch(
    errorHandler:
      | SimpleHttpServerErrorHandler
      | Array<SimpleHttpServerErrorHandler>
  ): SimpleHttpRequestHandlerInterface;
}

/**
 * This defines a full webservice that accommodates request routing and additionally defines a
 * method for listening for requests on a port and host.
 *
 * This is separate from the request handler interface to facilitate configurations in which
 * more of the control around setup and listening is retained by a framework.
 */
export interface SimpleHttpServerInterface
  extends SimpleHttpRequestHandlerInterface {
  listen(
    port: number,
    hostname: string,
    listeningCallback?: (...args: any[]) => void
  ): unknown;
  listen(port: number, listeningCallback?: (...args: any[]) => void): unknown;
}

/****************************************************
 * Logging
 *
 * There is a lot of value in standardizing around syslog error levels. Thus, this
 * SimpleLoggerInterface defines these methods explicitly. Different loggers may implement
 * other levels (for whatever reason) if they must.
 * **************************************************/

// This is a hack because typescript won't let us use a union type as an index type :(
export interface SimpleLogLevels {
  debug: SimpleLeveledLogMethod;
  info: SimpleLeveledLogMethod;
  notice: SimpleLeveledLogMethod;
  warning: SimpleLeveledLogMethod;
  error: SimpleLeveledLogMethod;
  alert: SimpleLeveledLogMethod;
  critical: SimpleLeveledLogMethod;
  emergency: SimpleLeveledLogMethod;
}
export type SimpleLogMethod = (
  level: keyof SimpleLogLevels,
  message: string,
  ...meta: any[]
) => SimpleLoggerInterface;
export type SimpleLeveledLogMethod = (
  message: string,
  ...meta: any[]
) => SimpleLoggerInterface;

export interface SimpleLoggerInterface extends SimpleLogLevels {
  log: SimpleLogMethod;
}

/**
 * A SimpleLoggerConsumer accepts and uses a SimpleLoggerInterface
 */
export interface SimpleLoggerConsumerInterface {
  setLogger: (logger: SimpleLoggerInterface) => unknown;
}

/**
 * This is one of the few concrete implementations that is justified in being here, since it is so
 * commonly used and is so light weight.
 */
export class TaggedLogger implements SimpleLoggerInterface {
  protected logger: SimpleLoggerInterface;
  protected header: string;

  public constructor(header: string, logger: SimpleLoggerInterface) {
    if (this.isTaggedLogger(logger)) {
      this.header = `${logger.header} ${header}`;
      this.logger = logger.logger;
    } else {
      this.header = header;
      this.logger = logger;
    }
  }

  public log(
    level: keyof SimpleLogLevels,
    msg: string,
    ...meta: Array<any>
  ): SimpleLoggerInterface {
    return this.logger.log(level, `${this.header} ${msg}`, ...meta);
  }

  public debug(msg: string, ...meta: Array<any>) {
    return this.logger.debug(`${this.header} ${msg}`, ...meta);
  }

  public info(msg: string, ...meta: Array<any>) {
    return this.logger.info(`${this.header} ${msg}`, ...meta);
  }

  public notice(msg: string, ...meta: Array<any>) {
    return this.logger.notice(`${this.header} ${msg}`, ...meta);
  }

  public warning(msg: string, ...meta: Array<any>) {
    return this.logger.warning(`${this.header} ${msg}`, ...meta);
  }

  public error(msg: string, ...meta: Array<any>) {
    return this.logger.error(`${this.header} ${msg}`, ...meta);
  }

  public alert(msg: string, ...meta: Array<any>) {
    return this.logger.alert(`${this.header} ${msg}`, ...meta);
  }

  public critical(msg: string, ...meta: Array<any>) {
    return this.logger.critical(`${this.header} ${msg}`, ...meta);
  }

  public emergency(msg: string, ...meta: Array<any>) {
    return this.logger.emergency(`${this.header} ${msg}`, ...meta);
  }

  protected isTaggedLogger(l: any): l is TaggedLogger {
    return typeof l.header === "string";
  }
}

/****************************************************
 * Errors
 * **************************************************/
import * as Errors from "@wymp/http-errors";
export { Errors };
