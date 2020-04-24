import * as express from "express";
import * as bp from "body-parser";
import {
  SimpleHttpRequestHandlerInterface,
  SimpleHttpServerMiddleware,
  SimpleHttpServerRequestInterface,
  SimpleHttpServerResponseInterface,
  SimpleHttpServerNextFunction,
  SimpleHttpServerErrorHandler,
  SimpleLoggerInterface,
} from "ts-simple-interfaces";

/**
 * Body-Parser exports for convenience
 *
 * Because these deal with low-level properties of the request, we need to create adapters for them
 * to keep the interface simple. In this case, since it's assumed that we're using them with the
 * express version of SimpleHttpRequestHandlerInterface, we feel it is safe to cast.
 */

export const Parsers = {
  urlencoded: (opts?: bp.OptionsUrlencoded) => {
    const mw = bp.urlencoded(opts);
    return (
      req: SimpleHttpServerRequestInterface,
      res: SimpleHttpServerResponseInterface,
      next: SimpleHttpServerNextFunction
    ) => {
      return mw(<express.Request>req, <express.Response>res, <express.NextFunction>next);
    };
  },
  json: (opts?: bp.OptionsJson) => {
    const mw = bp.json(opts);
    return (
      req: SimpleHttpServerRequestInterface,
      res: SimpleHttpServerResponseInterface,
      next: SimpleHttpServerNextFunction
    ) => {
      return mw(<express.Request>req, <express.Response>res, <express.NextFunction>next);
    };
  },
  text: (opts?: bp.OptionsText) => {
    const mw = bp.text(opts);
    return (
      req: SimpleHttpServerRequestInterface,
      res: SimpleHttpServerResponseInterface,
      next: SimpleHttpServerNextFunction
    ) => {
      return mw(<express.Request>req, <express.Response>res, <express.NextFunction>next);
    };
  },
  raw: (opts?: bp.Options) => {
    const mw = bp.raw(opts);
    return (
      req: SimpleHttpServerRequestInterface,
      res: SimpleHttpServerResponseInterface,
      next: SimpleHttpServerNextFunction
    ) => {
      return mw(<express.Request>req, <express.Response>res, <express.NextFunction>next);
    };
  },
};

/**
 * Types
 */
declare type Port = number;
declare type Host = string;
export interface SimpleHttpServerConfig {
  listeners: Array<[Port, Host | undefined]>;
}

/**
 * Main class
 */
export class SimpleHttpServerExpress implements SimpleHttpRequestHandlerInterface {
  protected app: express.Express;

  public constructor(
    protected config: SimpleHttpServerConfig,
    protected log: SimpleLoggerInterface
  ) {
    // Instantiate express app
    this.app = express();
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
    userCallback?: (listener: [Port, Host | undefined], args: Array<unknown>) => unknown
  ): Array<{ close: () => unknown }> {
    if (this.config.listeners.length === 0) {
      throw new Error(
        `You've called 'listen', but you haven't passed any listeners in your config.`
      );
    } else {
      return this.config.listeners.map(listener => {
        const internalCallback = (...args: Array<unknown>) => {
          this.log.notice(
            `Listening on ${listener[1] ? `${listener[1]}:${listener[0]}` : `Port ${listener[0]}`}`
          );
          if (userCallback) {
            userCallback(listener, args);
          }
        };
        if (listener[1]) {
          return this.app.listen(listener[0], listener[1], internalCallback);
        } else {
          return this.app.listen(listener[0], internalCallback);
        }
      });
    }
  }
}
