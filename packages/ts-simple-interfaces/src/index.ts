/*****************************************************
 * Pub/Sub
 *****************************************************/

/**
 * An interface that presents a method for publishing a message
 *
 * Implementations of this interface are expected to specify a valid type for
 * the msg parameter. This allows implementations to choose their own valid message
 * formats.
 */
export interface SimplePublisherInterface {
  /**
   * Publish a message to a channel.
   *
   * "channel" is the name of a message channel, and is based largely on AMQP's concept
   * of an "exchange". The idea is that you publish a message to a named channel, and
   * it is the channel's job to then route the message. The `msg` value should carry
   * all necessary information for your implementation of the publisher to specify
   * the correct routing parameters.
   */
  publishToChannel: (
    channel: string,
    routingKey: string,
    msg: unknown,
    options?: unknown
  ) => Promise<void>;
}

/**
 * An interface that presents a method for subscribing to a message stream with optional
 * routing keys.
 *
 * In AMQP paradigm, 'stream' would be the exchange, while routingKey would be something
 * like 'app.created.users'.
 *
 * Note that in most cases, implementations of this interface will likely implement
 * some sort of EventEmitter behavior as well.
 */
export interface SimpleSubscriberInterface {
  subscribeToChannel: (
    channels: Array<string>,
    routingKeys?: string[],
    options?: unknown
  ) => Promise<SimpleSubscriptionInterface>;
}

/**
 * An interface describing an event subscription
 *
 * This is basically a very small subset of node's native EventEmitter interface, meaning
 * you can implement the interface by simply extending EventEmitter if you'd like.
 */
export interface SimpleSubscriptionInterface {
  on: (
    event: "receive" | "disconnect" | "error",
    listener: (routingKey: string, msg: unknown, options?: unknown) => void
  ) => this;
  removeListener: (
    event: "receive" | "disconnect" | "error",
    listener: (routingKey: string, msg: unknown, options?: unknown) => void
  ) => this;
  removeAllListeners: (event?: "receive" | "disconnect" | "error") => this;
}

/**
 * An interface that presents a pub/sub client
 */
export interface SimplePubSubInterface extends SimplePublisherInterface, SimpleSubscriberInterface { }




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
   * [dsl-queries](https://www.npmjs.com/package/@openfinance/dsl-queries) package.
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
export interface SimpleSqlDbInterface {
  query: <T extends unknown>(
    query: string,
    params?: Array<string | number | boolean | Buffer | Date>
  ) => Promise<SimpleSqlResponseInterface<T>>;
}

/**
 * Most of these properties are optional, since they are rarely used and many developers will
 * choose not to implement them.
 */
export interface SimpleSqlResponseInterface<T extends unknown> extends SimpleDatasetInterface<T> {
  /**
   * The number of rows affected by a create, update or delete action
   */
  readonly affectedRows?: number|null;

  /**
   * The total number of rows a SELECT query would have returned had it not had a limit applied
   */
  readonly totalRows?: number | null;
}



/****************************************************
 * HTTP
 ***************************************************/

type LowerCaseHttpMethods = "get" | "delete" | "head" | "options" | "post" | "put" | "patch";
type UpperCaseHttpMethods = "GET" | "DELETE" | "HEAD" | "OPTIONS" | "POST" | "PUT" | "PATCH";
export type HttpMethods = LowerCaseHttpMethods | UpperCaseHttpMethods;

/**
 * A simple HTTP Request config object (reduced clone of AxiosRequestConfig)
 */
export interface SimpleHttpClientRequestConfig {
  url?: string;
  baseURL?: string;
  method?: HttpMethods;
  headers?: { [headerName: string]: Array<string>|string|undefined };
  params?: { [paramKey: string]: string|number|null|undefined };
  data?: any;
  timeout?: number;
  maxRedirects?: number;
  throwErrors?: boolean;
  requireValidCerts?: boolean;
}

/**
 * A simple HTTP Response interface (reduced clone of AxiosResponse)
 */
export interface SimpleHttpClientResponseInterface<T = any>  {
  data: T;
  status: number;
  headers: any;
  config: SimpleHttpClientRequestConfig;
}

/**
 * This defines a simple HTTP interface which can dress Axios, Request-Promise-Native, etc.
 *
 * It should throw an HttpError (see [@openfinance/http-errors](https://npmjs.com/@openfinance/http-errors))
 * on status codes >= 400.
 */
export interface SimpleHttpClientInterface {
  request: <T = unknown>(
    config: SimpleHttpClientRequestConfig
  ) => Promise<SimpleHttpClientResponseInterface<T>>;
}

export interface SimpleHttpServerRequestInterface<
  Params = {},
  Query = {},
  AppLocals = {}
> {
  /**
   * URL parameters as defined by the route
   */
  params: Params;

  /**
   * Query parameters
   */
  query: Query;

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
   */
  body: unknown;

  /**
   * The method by which the route was called
   */
  method: LowerCaseHttpMethods;

  /**
   * The original URL for the request
   */
  originalUrl: string;

  /**
   * The final URL for the request
   */
  url: string;

  /**
   * This is a very small stub for a full Express app
   */
  app: { locals: AppLocals };
}

/**
 * A response object, usually passed into request handlers and used to build up and eventually
 * send an HTTP response.
 */
export interface SimpleHttpServerResponseInterface<ResLocals = {}, AppLocals = {}> {
  /**
   * Set status `code`.
   */
  status(code: number): this;

  /**
   * Send a response.
   *
   * Examples:
   *
   *     res.send(new Buffer('wahoo'));
   *     res.send({ some: 'json' });
   *     res.send('<p>some html</p>');
   *     res.status(404).send('Sorry, cant find that');
   */
  send: (body?: unknown) => this;

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
  set(field: any): this;
  set(field: string, value?: string | string[]): this;

  header(field: any): this;
  header(field: string, value?: string | string[]): this;

  /** Get value for header `field`. */
  get(field: string): string;

  /**
   * Redirect to the given URL with the given status (defaults to 302 temporary)
   */
  redirect(url: string, status: number): void;

  /**
   * Variables to attach to the response
   */
  locals: ResLocals

  /**
   * This is a very small stub for a full Express app
   */
  app: { locals: AppLocals };
}

/**
 * This function is passed by the Webservice to all handlers and is responsible for chaining
 * middleware together and for handling errors generated by handlers. In the event that an
 * error occurs while processing a request, you can pass that error to this next function to
 * activate any error handling logic you've put in place. Otherwise, control is simply passed
 * to the next middleware in the stack.
 */
export interface SimpleHttpServerNextFunction {
    (errOrOtherVal?: any): void;
}

/**
 * This defines a function that accepts the standard request/response/next triad and utilizes
 * them to do something, including (sometimes) send responses or add variables to the request, etc.
 */
export interface SimpleHttpServerMiddleware {
  (
    req: SimpleHttpServerRequestInterface,
    res: SimpleHttpServerResponseInterface,
    next: SimpleHttpServerNextFunction
  ): unknown;
}

/**
 * This defines a function that binds the given route with the given middleware. It is usually
 * used in the context of HTTP method methods (like 'get', or 'post') to define a route.
 */
export interface SimpleHttpServerHandlerFunction {
  (route: string | RegExp, handler: SimpleHttpServerMiddleware): this;
}

/**
 * This defines a simple webservice that allows you to add middleware, error handling, and request
 * handling per http method. It additionally allows you to set up a collection of local variables
 * that will be attached to every request and respones through those objects' respective
 * `app.locals` key.
 */
export interface SimpleHttpServerInterface<AppLocals = {}> {
  use(middleware: SimpleHttpServerMiddleware): this;
  use(errorHandler: SimpleHttpServerNextFunction): this;

  get: SimpleHttpServerHandlerFunction;
  post: SimpleHttpServerHandlerFunction;
  patch: SimpleHttpServerHandlerFunction;
  put: SimpleHttpServerHandlerFunction;
  delete: SimpleHttpServerHandlerFunction;
  head: SimpleHttpServerHandlerFunction;
  options: SimpleHttpServerHandlerFunction;

  locals: AppLocals;
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
export type SimpleLogMethod = (level: keyof SimpleLogLevels, message: string, ...meta: any[]) => SimpleLoggerInterface;
export type SimpleLeveledLogMethod = (message: string, ...meta: any[]) => SimpleLoggerInterface;

export interface SimpleLoggerInterface extends SimpleLogLevels {
  log: SimpleLogMethod;
}

/**
 * A SimpleLoggerConsumer accepts and uses a SimpleLoggerInterface
 */
export interface SimpleLoggerConsumerInterface {
  setLogger: (logger: SimpleLoggerInterface) => unknown;
}

/****************************************************
 * Errors
 * **************************************************/
import * as Errors from "@openfinance/http-errors";
export { Errors };

