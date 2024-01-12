import * as mysql from "mysql2";
import { SimpleSqlDbInterface, SimpleSqlResponseInterface, SqlValue } from "@wymp/ts-simple-interfaces";

/**
 * mysql2 types don't export PromisePool type, so we have to replicate what we need here
 */
declare interface MysqlConnection {
  query<T extends mysql.RowDataPacket[] | mysql.OkPacket>(sql: string): Promise<[T, mysql.FieldPacket[]]>;
  query<T extends mysql.RowDataPacket[] | mysql.OkPacket>(
    sql: string,
    values: any | any[] | { [param: string]: any },
  ): Promise<[T, mysql.FieldPacket[]]>;
}

declare interface PromisePool extends MysqlConnection {
  getConnection(): Promise<MysqlConnection & { release(): void }>;
  end: () => Promise<void>;
}

export class SimpleDbMysql implements SimpleSqlDbInterface {
  protected pool: PromisePool;

  constructor(protected config: mysql.PoolOptions) {
    this.pool = mysql.createPool(this.config).promise();
  }

  public async query<T = unknown>(q: string, params?: Array<SqlValue> | null): Promise<SimpleSqlResponseInterface<T>> {
    const cnx = await this.pool.getConnection();
    try {
      return await this._query<T>(q, params, cnx);
    } finally {
      cnx.release();
    }
  }

  protected async _query<T = unknown>(q: string, params: Array<SqlValue> | null | undefined, cnx: MysqlConnection) {
    const doit = async () => {
      const result = params ? await cnx.query(q, params) : await cnx.query(q);

      // Our main function doesn't support multiple queries, so we know it can't be an array of
      // results. That means it will either be an "OkPacket" or an array of rows.
      if (isOkPacket(result[0])) {
        return { rows: <Array<T>>[], affectedRows: result[0].affectedRows };
      } else {
        return { rows: <Array<T>>result[0] };
      }
    };

    // Try the query up to ${lim} times in the event of a deadlock
    let i = 0;
    const lim = 5;
    while (i < lim + 1) {
      try {
        return await doit();
      } catch (e) {
        // Throw if it's not a deadlock error or we've already tried ${lim} times
        if (e.code !== "ER_LOCK_DEADLOCK" || i === lim) {
          throw e;
        }
      }
      if (this.config.debug) {
        console.error(`SimpleDbMysql: Retrying query ${q} after deadlock.`);
      }
      i++;
    }
    throw new Error(`SimpleDbMysql: Query deadlocked.`);
  }

  public async transaction<T>(
    queries: (cnx: SimpleSqlDbInterface) => Promise<T>,
    txName?: string | null | unknown,
  ): Promise<T> {
    const cnx = await this.pool.getConnection();
    await cnx.query("START TRANSACTION");
    try {
      const res = await queries(<SimpleSqlDbInterface>{
        query: (q, params) => this._query(q, params, cnx),
        transaction: (q, txName) => this.transaction(q, txName),
        close: () => this.close(),
      });
      await cnx.query("COMMIT");
      return res;
    } catch (e) {
      await cnx.query("ROLLBACK");
      throw e;
    } finally {
      cnx.release();
    }
  }

  public close() {
    // Note: This returns a promise that we're not awaiting
    return this.pool.end();
  }
}

function isOkPacket(v: any): v is mysql.OkPacket {
  return Object.prototype.hasOwnProperty.call(v, "affectedRows");
}
