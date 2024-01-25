import {
  SimpleHttpClientRequestConfig,
  SimpleHttpClientResponseInterface,
  SimpleHttpClientInterface,
  SimpleLoggerInterface,
} from '@wymp/ts-simple-interfaces';
import { Errors } from '@wymp/ts-simple-interfaces';

/** Request config composed of both SimpleHttpClientRequestConfig and any additions that are fetch-specific */
export interface SimpleFetchRequestConfig extends SimpleHttpClientRequestConfig {
  keepalive?: boolean;
  /** A cryptographic hash of the resource being fetched. If the retreived resource does not match, an error is thrown */
  integrity?: string;
  /**
   * An AbortSignal object instance; allows you to communicate with a fetch request and abort it if desired via an
   * AbortController. See https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal for details.
   */
  signal?: AbortSignal;
  /**
   * Policy specifying whether to include credentials. See
   * https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#credentials
   */
  credentials?: 'include' | 'omit' | 'same-origin';
  /**
   * See https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#mode
   */
  mode?: 'cors' | 'navigate' | 'no-cors' | 'same-origin';
}

/**
 * A Simple-conformant HTTP client using Fetch as the underlying implementation.
 *
 * Note that you can pass in a custom fetch implementation to the constructor, which may be useful for testing or for
 * configuring.
 *
 * Also note that this library should work in both browser and node, but that it uses certain node types which may
 * require you to install the `@types/node` package in your project. It does not depend on these actual objects; rather,
 * they were necessary for typing only.
 *
 * This library defaults to throwing errors for non-2xx responses. If you want to handle these yourself, you can pass
 * `throwErrors: false` in the request config.
 *
 * **REGARDING SELF-SIGNED CERTS: Fetch does not provide any way to turn off cert verification. If you're in a browser,
 * you can do this yourself by visiting the sites with the bad certs and marking them as "trusted" (there's a dialog
 * for this that will pop up in the browser). If you're in node, you can use the `NODE_TLS_REJECT_UNAUTHORIZED` env var.
 */
export class SimpleHttpClientFetch implements SimpleHttpClientInterface {
  protected readonly f: typeof fetch;

  constructor(deps?: { fetch?: typeof fetch }) {
    this.f = deps?.fetch || fetch;
  }

  public async request<T = unknown>(
    config: SimpleFetchRequestConfig,
    log?: SimpleLoggerInterface,
  ): Promise<SimpleHttpClientResponseInterface<T>> {
    const url = new URL(`${config.baseURL ?? ''}${config.url}`);
    if (config.params) {
      for (const [k, v] of Object.entries(config.params)) {
        if (v !== null && v !== undefined) {
          url.searchParams.append(k, String(v));
        }
      }
    }

    // We have to handle both timeouts and also potentially external aborts. To do that, we're going to use our own
    // abort controller to control the request
    const abort = new AbortController();
    if (config.signal) {
      config.signal.addEventListener('abort', () => {
        abort.abort();
      });
    }

    // Handle timeouts
    const timeout = config.timeoutMs ? setTimeout(() => abort.abort(), config.timeoutMs) : null;

    const fetchConfig: RequestInit = {
      method: config.method,
      keepalive: config.keepalive,
      headers: config.headers as any,
      body: config.data ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : undefined,
      redirect: config.maxRedirects === -1 ? 'error' : config.maxRedirects === 0 ? 'manual' : 'follow',
      integrity: config.integrity,
      signal: abort.signal,
      credentials: config.credentials,
      mode: config.mode,
      // TODO: Figure out what to do with these
      // referrer?: string
      // referrerPolicy?: ReferrerPolicy
      // dispatcher?: Dispatcher
      // duplex?: RequestDuplex
    };

    const r = await this.f(url.href, fetchConfig);

    // Clear our timeout, if applicable
    if (timeout) {
      clearTimeout(timeout);
    }

    // Get the body data
    const body = r.ok ? await r.text() : null;
    let data: T | undefined = undefined;
    const headers: Record<string, string> = {};

    if (r.headers) {
      for (const [_k, v] of r.headers.entries()) {
        const k = _k.toLowerCase();

        if (headers[k]) {
          headers[k] += `,${v}`;
        } else {
          headers[k] = v;
        }
      }
    }

    if (headers['content-type']?.match(/^application\/.*json.*$/) && Number(body?.length) > 0) {
      if (log) {
        log.debug('SimpleHttpClientFetch: Parsing body from string');
      }
      data = <T>JSON.parse(body!);
    }

    if (data === undefined && Number(body?.length) > 0) {
      if (log) {
        log.debug('SimpleHttpClientFetch: Using raw body from response.');
      }
      data = <T>body;
    }

    const res: SimpleHttpClientResponseInterface<T> = {
      status: r.status,
      data: data!,
      headers,
      config,
    };

    // If we're throwing errors, do so
    if (config.throwErrors !== false && res.status >= 400) {
      // TODO: Figure out cleaner way to type error responses
      const errorBody: any = data;
      const errorData = errorBody
        ? errorBody.tag === 'HttpError'
          ? errorBody
          : errorBody.error?.tag === 'HttpError'
            ? errorBody.error
            : null
        : null;
      if (errorData) {
        throw Errors.SimpleHttpClientRequestError.fromJSON(errorData, res);
      } else {
        const status = <Errors.HttpStatusCodes>res.status;
        throw new Errors.SimpleHttpClientRequestError(status, `${status} ${Errors.HttpErrorStatuses[status]}`, { res });
      }
    }

    return res;
  }
}

export class SimpleHttpClientResponseError<E = unknown> extends Error {
  public constructor(
    msg: string,
    public readonly res: SimpleHttpClientResponseInterface<E>,
  ) {
    super(msg);
    this.name = 'SimpleHttpClientResponseError';
  }
}
