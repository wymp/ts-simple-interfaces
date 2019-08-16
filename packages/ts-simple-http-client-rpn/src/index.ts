import {
  SimpleHttpRequestConfig,
  SimpleHttpResponseInterface,
  SimpleHttpClientInterface
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

  constructor(deps?: { rpn?: rpn.RequestPromiseAPI }) {
    if (deps && deps.rpn) {
      this.rpn = deps.rpn;
    } else {
      this.rpn = rpn;
    }
  }

  // TODO: Implement handling for throwErrors option
  // TODO: Implement special data handling for rpn-specific options
  request<T extends any>(
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
        return {
          data: r.body,
          status: r.statusCode,
          headers: r.headers,
          config
        };
      }
    );
  }
}
