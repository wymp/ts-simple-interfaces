import * as express from "express";
import { OptionsJson } from "body-parser";
import {
  SimpleHttpRequestHandlerInterface,
  SimpleHttpServerMiddleware,
  SimpleHttpServerNextFunction,
  SimpleHttpServerErrorHandler,
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

  public use(
    middleware: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.use(middleware);
    return this;
  }

  public catch(
    errorHandler: SimpleHttpServerErrorHandler | Array<SimpleHttpServerErrorHandler>
  ): SimpleHttpRequestHandlerInterface {
    this.app.use(errorHandler);
    return this;
  }

  public all(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.all(route, handlers);
    return this;
  }

  public get(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.get(route, handlers);
    return this;
  }

  public post(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.post(route, handlers);
    return this;
  }

  public patch(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.patch(route, handlers);
    return this;
  }

  public put(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.put(route, handlers);
    return this;
  }

  public delete(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.delete(route, handlers);
    return this;
  }

  public head(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.head(route, handlers);
    return this;
  }

  public options(
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>
  ): SimpleHttpRequestHandlerInterface {
    this.app.options(route, handlers);
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

