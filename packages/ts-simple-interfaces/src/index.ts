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
   * Publish a message to a stream.
   *
   * "stream" is the name of a message channel, and is based largely on AMQP's concept
   * of an "exchange". The idea is that you publish a message to a named stream, and
   * it is the stream's job to then route the message. The `msg` value should carry
   * all necessary information for your implementation of the publisher to specify
   * the correct routing parameters.
   */
  publish: (stream: string, msg: unknown, options?: unknown) => Promise<void>;
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
  subscribe: (
    streams: Array<string>,
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
    event: string | symbol,
    listener: (routingKey: string, msg: unknown) => void
  ) => this;
  removeListener: (
    event: string | symbol,
    listener: (routingKey: string, msg: unknown) => void
  ) => this;
  removeAllListeners: (event?: string | symbol) => this;
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
  save: <T = unknown>(resource: Partial<T>, force: boolean) => Promise<T>;

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
  query: <T extends unknown>(query: string, params?: Array<string | number | boolean | Buffer | Date>) => Promise<SimpleSqlResponseInterface<T>>;
}

export interface SimpleSqlResponseInterface<T extends unknown> extends SimpleDatasetInterface<T> {
  readonly affectedRows: number|null;
}



/****************************************************
 * HTTP
 ***************************************************/

/**
 * A simple HTTP Request config object (reduced clone of AxiosRequestConfig)
 */
export interface SimpleHttpRequestConfig {
  url?: string;
  baseURL?: string;
  method?:
    | 'get' | 'GET'
    | 'delete' | 'DELETE'
    | 'head' | 'HEAD'
    | 'options' | 'OPTIONS'
    | 'post' | 'POST'
    | 'put' | 'PUT'
    | 'patch' | 'PATCH';
  headers?: any;
  params?: any;
  data?: any;
  timeout?: number;
  maxRedirects?: number;
  throwErrors?: boolean;
}

/**
 * A simple HTTP Response interface (clone of AxiosResponse)
 */
export interface SimpleHttpResponseInterface<T = any>  {
  data: T;
  status: number;
  headers: any;
  config: SimpleHttpRequestConfig;
}

/**
 * This defines a simple HTTP interface which can be implemented in-house if
 * a hard dependency on axios is undesirable
 *
 * It should throw an HttpError (see [@openfinance/http-errors](https://npmjs.com/@openfinance/http-errors))
 * on status codes >= 400.
 */
export interface SimpleHttpClientInterface {
  request: <T = any>(config: SimpleHttpRequestConfig) => Promise<SimpleHttpResponseInterface<T>>;
}




/****************************************************
 * Logging
 * **************************************************/

export type SimpleLogMethod = (level: string, message: string, ...meta: any[]) => SimpleLoggerInterface;

export type SimpleLeveledLogMethod = (message: string, ...meta: any[]) => SimpleLoggerInterface;

/**
 * There is a lot of value in standardizing around syslog error levels. Thus, this
 * SimpleLoggerInterface defines these methods explicitly. Different loggers may implement
 * other levels (for whatever reason) if they must.
 */
export interface SimpleLoggerInterface {
  log: SimpleLogMethod;
  debug: SimpleLeveledLogMethod;
  info: SimpleLeveledLogMethod;
  notice: SimpleLeveledLogMethod;
  warning: SimpleLeveledLogMethod;
  error: SimpleLeveledLogMethod;
  alert: SimpleLeveledLogMethod;
  critical: SimpleLeveledLogMethod;
  emergency: SimpleLeveledLogMethod;
}

/**
 * A SimpleLoggerConsumer accepts and uses a SimpleLoggerInterface
 */
export interface SimpleLoggerConsumerInterface {
  setLogger: (logger: SimpleLoggerInterface) => unknown;
}

export * from "@openfinance/http-errors";
