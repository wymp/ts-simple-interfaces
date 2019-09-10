import {
  SimpleHttpClientInterface,
  SimpleHttpRequestConfig,
  SimpleHttpResponseInterface,
} from "ts-simple-interfaces";

export class MockSimpleHttpClient implements SimpleHttpClientInterface {
  protected responses: {
    [key: string]: Array<SimpleHttpResponseInterface|NodeJS.ErrnoException>
  } = {};

  protected _requests: Array<SimpleHttpRequestConfig> = [];

  public setNextResponse(
    key: string,
    response: SimpleHttpResponseInterface|NodeJS.ErrnoException
  ): void {
    if (!this.responses.hasOwnProperty(key)) {
      this.responses[key] = [response];
    } else {
      this.responses[key].push(response);
    }
  }

  public async request<T = any>(
    config: SimpleHttpRequestConfig
  ): Promise<SimpleHttpResponseInterface<T>> {
    // Copy config object and add method, if necessary
    config = Object.assign({}, config);
    if (typeof config.method === "undefined") {
      config.method = "GET";
    }

    // Derive key
    const key = `${config.method || ""} ${config.baseURL || ""}${config.url || ""}`;

    // Throw if no response set
    if (!this.responses.hasOwnProperty(key) || this.responses[key].length === 0) {
      throw new Error(
        `Received HTTP request for ${key}, but there is no response configured for that ` +
        `request. Use 'setNextResponse("${key}", yourResponse)' to set a response. (Note that ` +
        `'yourResponse' should be either a SimpleHttpResponseInterface or an ErrnoException.)` +
        `\n\nRequest Config:\n\n${JSON.stringify(config, null, 2)}`
      );
    }

    this._requests.push(config);

    // Otherwise, throw or return according to set response
    const res = this.responses[key].shift()!;
    if (typeof (res as NodeJS.ErrnoException).stack !== "undefined") {
      throw <NodeJS.ErrnoException>res;
    } else {
      return <SimpleHttpResponseInterface<T>>res;
    }
  }

  public resetRequestLog() {
    this._requests = [];
  }

  public get requestLog() {
    return this._requests;
  }
}
