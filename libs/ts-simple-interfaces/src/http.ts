/****************************************************
 * HTTP
 ***************************************************/

import { SimpleLoggerInterface } from './logging';

type LowerCaseHttpMethods = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch';
type UpperCaseHttpMethods = 'GET' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH';
export type HttpMethods = LowerCaseHttpMethods | UpperCaseHttpMethods;

/**
 * A simple HTTP Request config object (reduced clone of AxiosRequestConfig)
 */
export interface SimpleHttpClientRequestConfig {
  url?: string;
  baseURL?: string;
  method?: HttpMethods;
  headers?: { [headerName: string]: Array<string> | string | undefined };
  /** Query parameters to be included after the `?` in the request url */
  params?: { [paramKey: string]: string | number | null | undefined };
  /** Data to send in the body. Should be a string or buffer */
  data?: any;
  /** How long to wait (in MS before throwing a timeout error) */
  timeoutMs?: number;
  /**
   * If set to -1, a 3xx code throws an error; if set to 0, redirects are returned to you to handle manually, otherwise
   * the request will automatically follow redirects up to the number specified. If undefined, redirects are handled
   * automatically up to whatever maximum the implementation defaults to.
   */
  maxRedirects?: number;
  /** Whether or not to convert 4xx and 5xx responses to native JS errors. Default is implementation-dependent. */
  throwErrors?: boolean;
  /**
   * If false, disables checking of SSL certificates. If true or undefined, requires that SSL certs be valid and not
   * self-signed
   */
  requireValidCerts?: boolean;
}

/**
 * A simple HTTP Response interface (reduced clone of AxiosResponse) representing a response
 * object received by an HTTP Client in response to a request made to a server.
 */
export interface SimpleHttpClientResponseInterface<T = unknown> {
  data: T;
  status: number;
  headers: any;
  config: SimpleHttpClientRequestConfig;
}

/**
 * This defines a simple HTTP interface which can dress Axios, Request-Promise-Native, etc.
 *
 * It should throw a {@link SimpleHttpClientRequestError} on status codes >= 400.
 */
export interface SimpleHttpClientInterface {
  request: <T = unknown>(
    config: SimpleHttpClientRequestConfig,
    _log?: SimpleLoggerInterface,
  ) => Promise<SimpleHttpClientResponseInterface<T>>;
}

export interface SimpleHttpServerRequestInterface {
  /**
   * URL parameters as defined by the route
   *
   * Note: Because this is a runtime boundary, it's not useful to try to define this using
   * generics. It's much better to leave it vague and to force developers to do runtime checks
   * on the incoming data.
   */
  params: { [key: string]: string };

  /**
   * Query parameters
   *
   * See `params` for explanation of choice around "any" typing.
   */
  query: { [key: string]: any };

  /**
   * Get the value of a header
   */
  get(name: string): string | undefined;
  header(name: string): string | undefined;

  /**
   * Get the full path of the request
   */
  path: string;

  /**
   * Get the hostname of the request
   */
  hostname: string;

  /**
   * Get the body of the request
   *
   * See `params` for explanation of choice around "any" typing.
   */
  body: any;

  /**
   * The method by which the route was called
   */
  method: string;

  /**
   * The original URL for the request
   */
  originalUrl: string;

  /**
   * The final URL for the request
   */
  url: string;

  /**
   * Tests whether this request accepts the given content type(s). Returns false (or undefined?)
   * if it does not, otherwise returns the preffered type that was passed in. (See express type
   * documentation for more information.)
   */
  accepts(): Array<string>;
  accepts(type: string): string | false | undefined;
  accepts(type: Array<string>): string | false | undefined;
  accepts(...type: Array<string>): string | false | undefined;
}

/**
 * A response object, usually passed into request handlers and used to build up and eventually
 * send an HTTP response.
 */
export interface SimpleHttpServerResponseInterface {
  /**
   * Set status `code`.
   */
  status(code: number): SimpleHttpServerResponseInterface;

  /**
   * Send a response.
   *
   * Examples:
   *
   *     res.send(Buffer.from('wahoo'));
   *     res.send({ some: 'json' });
   *     res.send('<p>some html</p>');
   *     res.status(404).send('Sorry, cant find that');
   */
  send: (body?: unknown) => SimpleHttpServerResponseInterface;

  /**
   * Set header `field` to `val`, or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    res.set('Foo', ['bar', 'baz']);
   *    res.set('Accept', 'application/json');
   *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * Aliased as `res.header()`.
   */
  set(field: any): SimpleHttpServerResponseInterface;
  set(field: string, value?: string | string[]): SimpleHttpServerResponseInterface;

  header(field: any): SimpleHttpServerResponseInterface;
  header(field: string, value?: string | string[]): SimpleHttpServerResponseInterface;

  /** Get value for header `field`. */
  get(field: string): string;

  /**
   * Redirect to the given URL with the given status (defaults to 302 temporary)
   */
  redirect(url: string, status: number): void;

  /**
   * Variables to attach to the response
   *
   * While this is not a runtime boundary, there's no way to link handler functions together in
   * such a way that we can statically verify conformity with expectations for this variable.
   * Thus, it's better to type it as "any" because we will almost always be using it in a sort of
   * "if this is set, then use it" sort of way.
   */
  locals: any;
}

/**
 * This function is passed by the Webservice to all handlers and is responsible for chaining
 * middleware together and for handling errors generated by handlers. In the event that an
 * error occurs while processing a request, you can pass that error to this next function to
 * activate any error handling logic you've put in place. Otherwise, control is simply passed
 * to the next middleware in the stack.
 */
export type SimpleHttpServerNextFunction = (errOrOtherVal?: any) => void;

/**
 * This defines a function that accepts the standard request/response/next triad and utilizes
 * them to do something, including (sometimes) send responses or add variables to the request, etc.
 *
 * It additionally defines a special middleware that handles errors
 */
export interface SimpleHttpServerMiddleware {
  (
    req: SimpleHttpServerRequestInterface,
    res: SimpleHttpServerResponseInterface,
    next: SimpleHttpServerNextFunction,
  ): unknown;
}
export interface SimpleHttpServerErrorHandler {
  (
    e: any,
    req: SimpleHttpServerRequestInterface,
    res: SimpleHttpServerResponseInterface,
    next: SimpleHttpServerNextFunction,
  ): unknown;
}

export interface SimpleHttpRequestHandlerBasicInterface {
  all: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
  get: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
  post: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
  patch: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
  put: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
  delete: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
  head: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
  options: (
    route: string | RegExp | Array<string | RegExp>,
    handlers: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>,
  ) => SimpleHttpRequestHandlerInterface;
}

/**
 * This defines a simple request handler that allows you to add global middleware and error
 * handling, as well as routing per http method. It used to support the idea of a collection of
 * app-local variables, but upon further consideration it was determined that there is not enough
 * perceived value added by that system to really continue its existence.
 */
export interface SimpleHttpRequestHandlerInterface extends SimpleHttpRequestHandlerBasicInterface {
  use(middleware: SimpleHttpServerMiddleware | Array<SimpleHttpServerMiddleware>): SimpleHttpRequestHandlerInterface;
  catch(
    errorHandler: SimpleHttpServerErrorHandler | Array<SimpleHttpServerErrorHandler>,
  ): SimpleHttpRequestHandlerInterface;
}

/**
 * This defines a full webservice that accommodates request routing and additionally defines a
 * method for listening for requests on a port and host.
 *
 * This is separate from the request handler interface to facilitate configurations in which
 * more of the control around setup and listening is retained by a framework.
 */
export interface SimpleHttpServerInterface extends SimpleHttpRequestHandlerInterface {
  listen(port: number, hostname: string, listeningCallback?: (...args: any[]) => void): unknown;
  listen(port: number, listeningCallback?: (...args: any[]) => void): unknown;
}
