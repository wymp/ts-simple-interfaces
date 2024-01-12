import { SimpleSqlDbInterface, SimpleSqlResponseInterface, SqlValue } from "@wymp/ts-simple-interfaces";
import { Md5 } from "ts-md5";

interface MockDbConfig {
  throwOnClose: boolean;
}

export const md5 = function (str: string) {
  return Md5.hashStr(str).toString();
};

const isResponse = function <T>(val: any): val is SimpleSqlResponseInterface<T> {
  return typeof val.rows !== "undefined";
};

export class MockSimpleSqlDb implements SimpleSqlDbInterface {
  protected closed: boolean = false;
  protected config: MockDbConfig = {
    throwOnClose: false,
  };
  protected queryMockResultQueue: {
    [hash: string]: Array<SimpleSqlResponseInterface<any> | NodeJS.ErrnoException>;
  } = {};

  public constructor(config?: Partial<MockDbConfig>) {
    if (typeof config !== "undefined") {
      this.config = Object.assign({}, this.config, config);
    }
  }

  /**
   * If an exception is passed, it is thrown when the query is called. Otherwise, the given response is returned
   */
  public setQueryResult(hashOrQuery: string, result: SimpleSqlResponseInterface<any> | NodeJS.ErrnoException) {
    if (typeof this.queryMockResultQueue[hashOrQuery] === "undefined") {
      this.queryMockResultQueue[hashOrQuery] = [];
    }
    this.queryMockResultQueue[hashOrQuery].push(result);
  }

  public query(query: string, params?: Array<SqlValue>): Promise<SimpleSqlResponseInterface<any>> {
    if (this.closed) {
      throw new Error(
        "The 'close' method was previously called on this database connection, so no further queries may be made. Pass '{ throwOnClose: true }' to the constructor of this SimpleMockDb to see when the 'close' method was called.",
      );
    }

    const hash = md5(query);
    const queueKey = typeof this.queryMockResultQueue[hash] !== "undefined" ? hash : query;
    if (
      typeof this.queryMockResultQueue[queueKey] === "undefined" ||
      this.queryMockResultQueue[queueKey].length === 0
    ) {
      const msg =
        "This is a mock database. You must manually set the result you'd like to receive from each query using the 'setQueryResult' method. You should pass either the exact query string (below) or the hash of the query string ('" +
        hash +
        "') as the first argument of that function, then an array containing result objects as the second method.\n\nQuery:\n\n" +
        query +
        "\n\nwith params:\n\n" +
        JSON.stringify(params, null, 2);

      // Because of complexities of async functions and throwing errors, there is NO WAY TO CATCH AND DISPLAY THIS ERROR.
      // Thus, we must compromise and log the message as well as throw.
      console.log(msg);
      throw new Error(msg);
    }

    return new Promise((resolve, reject) => {
      const res = this.queryMockResultQueue[queueKey].shift();
      if (isResponse(res)) {
        resolve(res);
      } else {
        reject(res);
      }
    });
  }

  public async transaction<T>(
    queries: (cnx: SimpleSqlDbInterface) => Promise<T>,
    txName?: string | null | undefined,
  ): Promise<T> {
    return await queries(this);
  }

  public close(): void {
    if (this.config.throwOnClose) {
      throw new Error(
        "The 'close' method was just called on this database connection, and the 'throwOnClose' config option was set to 'true'.",
      );
    }
    this.closed = true;
  }
}
