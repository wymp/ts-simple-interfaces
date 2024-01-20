import { BufferLike } from './infra';

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
  get: <T>(query: string) => Promise<SimpleDatasetInterface<T>>;

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
  save: <T>(resource: Partial<T>, force: boolean) => Promise<T>;

  /**
   * Should accept the ID of a resource to delete.
   */
  delete: (resourceId: string) => Promise<void>;
}

/**
 * A SimpleDataset is anything with rows of data.
 */
export interface SimpleDatasetInterface<T> {
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
  query: <T>(query: string, params?: Array<SqlValue>) => Promise<SimpleSqlResponseInterface<T>>;
  transaction: <T>(
    queries: (cnx: SimpleSqlDbInterface) => Promise<T>,
    txName?: string | null | undefined,
  ) => Promise<T>;
}

/**
 * Most of these properties are optional, since they are rarely used and many developers will
 * choose not to implement them.
 */
export interface SimpleSqlResponseInterface<T> extends SimpleDatasetInterface<T> {
  /**
   * The number of rows affected by a create, update or delete action
   */
  readonly affectedRows?: number | null;

  /**
   * The total number of rows a SELECT query would have returned had it not had a limit applied
   */
  readonly totalRows?: number | null;
}
