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
  publish: (stream: string, msg: unknown) => Promise<void>;
  close: () => void;
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
    stream: string,
    routingKeys?: string[]
  ) => Promise<SimpleSubscriptionInterface>;
  close: () => void;
}

/**
 * An interface describe an event subscription
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
  get: (query: string) => Promise<SimpleDatasetInterface>;

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
  save: <T = unknown>(resource: T, force: boolean) => Promise<T>;

  /**
   * Should accept the ID of a resource to delete.
   */
  delete: (resourceId: string) => Promise<void>;
}

/**
 * A SimpleDataset is anything with rows of data.
 */
export interface SimpleDatasetInterface {
  rows: Array<unknown>;
}

/**
 * While any SQL datasource may be easily implemented as a SimpleDatasource, they may also
 * be implemented more specifically as a general SimpleSqlDbInterface. This interface is
 * intended to help unify the various implementations of SQL databases out in the wild, such
 * that they may be more plug-and-playable.
 */
export interface SimpleSqlDbInterface {
  query: (query: string, params?: Array<string | number | boolean | Buffer | Date>) => Promise<SimpleSqlResponseInterface>;
}

export interface SimpleSqlResponseInterface extends SimpleDatasetInterface {
  readonly affectedRows: number|null;
}




/****************************************************
 * Logging
 * **************************************************/

export type LogMethod = (level: string, message: string, ...meta: any[]) => SimpleLoggerInterface;

export type LeveledLogMethod = (message: string, ...meta: any[]) => SimpleLoggerInterface;

/**
 * There is a lot of value in standardizing around syslog error levels. Thus, this
 * SimpleLoggerInterface defines these methods explicitly. Different loggers may implement
 * other levels (for whatever reason) if they must.
 */
export interface SimpleLoggerInterface {
  log: LogMethod;
  debug: LeveledLogMethod;
  info: LeveledLogMethod;
  notice: LeveledLogMethod;
  warning: LeveledLogMethod;
  error: LeveledLogMethod;
  alert: LeveledLogMethod;
  critical: LeveledLogMethod;
  emergency: LeveledLogMethod;
}

export * from "@openfinance/http-errors";
