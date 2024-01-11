import {
  SimpleHttpClientRequestConfig,
  SimpleHttpClientResponseInterface,
  SimpleHttpClientInterface,
  SimpleLoggerInterface,
} from "@wymp/ts-simple-interfaces";
import * as rpn from "request-promise-native";
import * as req from "request";

export interface SimpleRpnRequestConfig extends SimpleHttpClientRequestConfig {
  transform?: (body: any, response: req.Response, resolveWithFullResponse?: boolean) => any;
  transform2xxOnly?: boolean;
  json?: any;
  removeRefererHeader?: boolean;
  rejectUnauthorized?: boolean;
}

export class SimpleHttpClientRpn implements SimpleHttpClientInterface {
  protected rpn: (conf: rpn.OptionsWithUrl) => Promise<rpn.FullResponse>;

  constructor(deps?: { rpn?: (conf: rpn.OptionsWithUrl) => Promise<rpn.FullResponse> }) {
    if (deps && deps.rpn) {
      this.rpn = deps.rpn;
    } else {
      this.rpn = rpn;
    }
  }

  // TODO: Implement special data handling for rpn-specific options
  public request<T>(
    config: SimpleRpnRequestConfig,
    log?: SimpleLoggerInterface,
  ): Promise<SimpleHttpClientResponseInterface<T>> {
    config.url = config.url!;
    const rpnConfig: rpn.OptionsWithUrl = {
      baseUrl: config.baseURL,
      url: config.url || "/",
      method: config.method,
      headers: config.headers,
      transform: config.transform,
      transform2xxOnly: config.transform2xxOnly,
      json: config.json,
      body: config.data,
      maxRedirects: config.maxRedirects,
      removeRefererHeader: config.removeRefererHeader,
      timeout: config.timeout,
      rejectUnauthorized: config.rejectUnauthorized,
      followAllRedirects: true,
      resolveWithFullResponse: true,
      qs: config.params || null,
      simple: config.throwErrors || false,
    };

    // Set json property if necessary
    if (
      rpnConfig.body &&
      typeof rpnConfig.body !== "string" &&
      !(rpnConfig.body instanceof Buffer) &&
      rpnConfig.json !== true &&
      rpnConfig.json !== false
    ) {
      rpnConfig.json = true;
    }

    return this.rpn(rpnConfig).then((r: rpn.FullResponse): SimpleHttpClientResponseInterface<T> => {
      let data: T | null = null;
      if (r.headers) {
        const contentType = Object.entries(r.headers).find((v) => v[0].toLowerCase() === "content-type");
        if (
          contentType &&
          (contentType[1] as string).match(/^application\/.*json.*$/) &&
          typeof r.body === "string" &&
          r.body.length > 0
        ) {
          if (log) {
            log.debug("SimpleHttpClientRPN: Parsing body from string");
          }
          data = <T>JSON.parse(r.body);
        }
      }

      if (data === null) {
        if (log) {
          log.debug("SimpleHttpClientRPN: Using raw body from response.");
        }
        data = r.body;
      }

      return {
        status: r.statusCode,
        data: data!,
        headers: r.headers,
        config,
      };
    });
  }

  public async requestAndThrow<T = unknown, E = unknown>(
    config: Omit<SimpleRpnRequestConfig, "throwErrors">,
    log?: SimpleLoggerInterface,
  ): Promise<T> {
    // Watch out! We're using `any` here because there's no reliable way to separate error responses
    // from success
    const res = await this.request<any>({
      ...config,
      throwErrors: false,
    });

    // TODO: In this case, we're considering 300's errors as well because we're not handling them.
    // We should figure out a better way to do this at some point.
    if (res.status >= 300) {
      throw new ResponseError<E>(`Request resulted in a ${res.status} response.`, res);
    }

    return res.data;
  }
}

export class ResponseError<E = unknown> extends Error {
  public constructor(
    msg: string,
    public readonly res: SimpleHttpClientResponseInterface<E>,
  ) {
    super(msg);
  }
}
