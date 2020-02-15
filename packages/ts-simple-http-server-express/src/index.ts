import * as express from "express";
import { OptionsJson } from "body-parser";
import {
  HttpRequestParams,
  HttpRequestParamsDict,
  SimpleHttpRequestHandlerInterface,
  SimpleHttpServerMiddleware,
  SimpleHttpServerNextFunction,
  SimpleLoggerInterface,
} from "ts-simple-interfaces";

declare type Port = number;
declare type Host = string;
export interface SimpleHttpServerConfig {
  listeners: Array<[ Port, Host | undefined ]>;
  jsonBodyOptions?: OptionsJson;
}

export class SimpleHttpServerExpress implements SimpleHttpRequestHandlerInterface {
  protected app: express.Express;

  public constructor(
    protected config: SimpleHttpServerConfig,
    protected log: SimpleLoggerInterface,
  ) {
    // Instantiate express app
    this.app = express();

    // Parse json bodies
    this.config.jsonBodyOptions = this.config.jsonBodyOptions || {};
    this.config.jsonBodyOptions.type = this.config.jsonBodyOptions.type || [];
    if (typeof this.config.jsonBodyOptions.type === "string") {
      this.config.jsonBodyOptions.type = [ this.config.jsonBodyOptions.type ];
    }
    if (Array.isArray(this.config.jsonBodyOptions.type)) {
      this.config.jsonBodyOptions.type = this.config.jsonBodyOptions.type.concat([
        "application/json",
        "application/vnd.api+json",
        "application/json-rpc",
      ]);
    }
    this.app.use(express.json(this.config.jsonBodyOptions!));
  }

  public use<
    P extends HttpRequestParams = HttpRequestParamsDict,
    ReqBody extends unknown = unknown
  >(
    middlewareOrErrorHandler: SimpleHttpServerMiddleware<P, ReqBody> | SimpleHttpServerNextFunction
  ): SimpleHttpRequestHandlerInterface {
    this.app.use(<any>middlewareOrErrorHandler);
    return this;
  }

  public all<
    P extends HttpRequestParams = HttpRequestParamsDict,
    ReqBody extends unknown = unknown
  >(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,ReqBody> | Array<SimpleHttpServerMiddleware<P,ReqBody>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.all(route, <any>handlers);
    return this;
  }

  public get<
    P extends HttpRequestParams = HttpRequestParamsDict,
    ReqBody extends unknown = unknown
  >(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,ReqBody> | Array<SimpleHttpServerMiddleware<P,ReqBody>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.get(route, <any>handlers);
    return this;
  }

  public post<
    P extends HttpRequestParams = HttpRequestParamsDict,
    ReqBody extends unknown = unknown
  >(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,ReqBody> | Array<SimpleHttpServerMiddleware<P,ReqBody>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.post(route, <any>handlers);
    return this;
  }

  public patch<
    P extends HttpRequestParams = HttpRequestParamsDict,
    ReqBody extends unknown = unknown
  >(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,ReqBody> | Array<SimpleHttpServerMiddleware<P,ReqBody>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.patch(route, <any>handlers);
    return this;
  }

  public put<
    P extends HttpRequestParams = HttpRequestParamsDict,
    ReqBody extends unknown = unknown
  >(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,ReqBody> | Array<SimpleHttpServerMiddleware<P,ReqBody>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.put(route, <any>handlers);
    return this;
  }

  public delete<P extends HttpRequestParams = HttpRequestParamsDict>(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,unknown> | Array<SimpleHttpServerMiddleware<P,unknown>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.delete(route, <any>handlers);
    return this;
  }

  public head<P extends HttpRequestParams = HttpRequestParamsDict>(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,unknown> | Array<SimpleHttpServerMiddleware<P,unknown>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.head(route, <any>handlers);
    return this;
  }

  public options<P extends HttpRequestParams = HttpRequestParamsDict>(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware<P,unknown> | Array<SimpleHttpServerMiddleware<P,unknown>>
  ): SimpleHttpRequestHandlerInterface {
    this.app.options(route, <any>handlers);
    return this;
  }

  public listen(
    userCallback?: (listener: [ Port, Host | undefined ], args: Array<unknown>) => unknown
  ): Array<{ close: () => unknown }> {
    if (this.config.listeners.length === 0) {
      throw new Error(
        `You've called 'listen', but you haven't passed any listeners in your config.`
      );
    } else {
      return this.config.listeners.map((listener) => {
        const internalCallback = (...args: Array<unknown>) => {
          this.log.notice(`Listening on ${listener[1] ? `${listener[1]}:${listener[0]}` : `Port ${listener[0]}`}`);
          if (userCallback) {
            userCallback(listener, args);
          }
        }
        if (listener[1]) {
          return this.app.listen(listener[0], listener[1], internalCallback);
        } else {
          return this.app.listen(listener[0], internalCallback);
        }
      });
    }
  }
}

