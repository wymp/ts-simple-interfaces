import * as mysql from "mysql2";
import { SimpleSqlDbInterface, SimpleSqlResponseInterface } from "ts-simple-interfaces";

/**
 * mysql2 types don't export PromisePool type, so we have to replicate what we need here
 */
declare interface PromisePool {
  query<T extends mysql.RowDataPacket[] | mysql.OkPacket>(
    sql: string
  ): Promise<[T, mysql.FieldPacket[]]>;
  query<T extends mysql.RowDataPacket[] | mysql.OkPacket>(
    sql: string,
    values: any | any[] | { [param: string]: any }
  ): Promise<[T, mysql.FieldPacket[]]>;

  end: () => Promise<void>;
}

export class SimpleDbMysql implements SimpleSqlDbInterface {
  protected pool: PromisePool;

  constructor(protected config: mysql.PoolOptions) {
    this.pool = mysql.createPool(this.config).promise();
  }

  public async query<T = unknown>(
    q: string,
    params?: Array<string | number | boolean | Buffer | Date | null> | null
  ): Promise<SimpleSqlResponseInterface<T>> {
    const result = params ? await this.pool.query(q, params) : await this.pool.query(q);

    // Our main function doesn't support multiple queries, so we know it can't be an array of
    // results. That means it will either be an "OkPacket" or an array of rows.
    if (isOkPacket(result[0])) {
      return { rows: <Array<T>>[], affectedRows: result[0].affectedRows }
    } else {
      return { rows: <Array<T>>result[0] }
    }
  }

  public close() {
    // Note: This returns a promise that we're not awaiting
    this.pool.end();
  }
}

function isOkPacket(v: any): v is mysql.OkPacket {
  return v.hasOwnProperty("affectedRows");
}
