import {
  SimpleHttpRequestConfig,
  SimpleHttpResponseInterface,
  SimpleHttpClientInterface,
  SimpleLogLevels,
  SimpleLoggerInterface,
} from "ts-simple-interfaces";
import * as rpn from "request-promise-native";
import * as req from "request";

export interface SimpleRpnRequestConfig extends SimpleHttpRequestConfig {
  transform?: (
    body: any,
    response: req.Response,
    resolveWithFullResponse?: boolean
  ) => any;
  transform2xxOnly?: boolean;
  json?: any;
  removeRefererHeader?: boolean;
  rejectUnauthorized?: boolean;
}

export class SimpleHttpClientRpn implements SimpleHttpClientInterface {
  protected rpn: rpn.RequestPromiseAPI;

  constructor(deps?: { rpn?: rpn.RequestPromiseAPI }, protected logger?: SimpleLoggerInterface) {
    if (deps && deps.rpn) {
      this.rpn = deps.rpn;
    } else {
      this.rpn = rpn;
    }
  }

  // TODO: Implement handling for throwErrors option
  // TODO: Implement special data handling for rpn-specific options
  public request<T extends any>(
    config: SimpleRpnRequestConfig
  ): Promise<SimpleHttpResponseInterface<T>> {
    const rpnConfig: rpn.OptionsWithUrl = {
      baseUrl: config.baseURL,
      url: config.url || "/",
      method: config.method,
      headers: config.headers,
      transform: config.transform,
      transform2xxOnly: config.transform2xxOnly,
      json: config.json,
      maxRedirects: config.maxRedirects,
      removeRefererHeader: config.removeRefererHeader,
      timeout: config.timeout,
      rejectUnauthorized: config.rejectUnauthorized,
      followAllRedirects: true,
      resolveWithFullResponse: true,
      qs: config.params || null
    };
    config.url = config.url!;
    return this.rpn(rpnConfig).then(
      (r: rpn.FullResponse): SimpleHttpResponseInterface<T> => {
        let data: T | null = null;
        if (r.headers) {
          const contentType = Object.entries(r.headers).find(
            (v) => v[0].toLowerCase() === "content-type"
          );
          if (
            contentType &&
            (contentType[1] as string).match(/^application\/.*json.*$/) &&
            typeof r.body === "string" &&
            r.body.length > 0
          ) {
            this.log("debug", "SimpleHttpClientRPN: Parsing body from string");
            data = <T>JSON.parse(r.body);
          }
        }

        if (data === null) {
          this.log("debug", "SimpleHttpClientRPN: Using raw body from response.");
          data = r.body;
        }

        return {
          data: data!,
          status: r.statusCode,
          headers: r.headers,
          config
        };
      }
    );
  }

  protected log(level: keyof SimpleLogLevels, msg: string): this {
    if (this.logger) {
      this.logger.log(level, msg);
    }
    return this;
  }
}
