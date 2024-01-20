import {
  SimpleHttpClientRequestConfig,
  SimpleHttpClientResponseInterface,
  SimpleHttpClientInterface,
  SimpleLoggerInterface,
} from '@wymp/ts-simple-interfaces';
import {
  HttpErrorStatuses,
  HttpStatusCodes,
  SimpleHttpClientRequestError,
} from '@wymp/ts-simple-interfaces/src/errors';
import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';

export class SimpleHttpClientAxios implements SimpleHttpClientInterface {
  protected axios: AxiosInstance;

  constructor(config?: AxiosRequestConfig, deps?: { axios?: AxiosInstance }) {
    if (deps && deps.axios) {
      this.axios = deps.axios;
    } else {
      this.axios = axios.create(config);
    }
  }

  public async request<T>(
    _config: Omit<AxiosRequestConfig, 'headers'> & SimpleHttpClientRequestConfig,
    log?: SimpleLoggerInterface,
  ): Promise<SimpleHttpClientResponseInterface<T>> {
    const headers = Object.entries(_config.headers || {})
      .filter((row): row is [string, string | Array<string>] => row[1] !== undefined)
      .reduce<{ [k: string]: string }>((obj, entry) => {
        obj[entry[0]] = Array.isArray(entry[1]) ? entry[1].join(',') : entry[1];
        return obj;
      }, {});

    const config = {
      ..._config,
      headers,
      validateStatus: _config.throwErrors === false ? () => true : null,
    };

    const raw = await this.axios.request<T>(config);
    const res: SimpleHttpClientResponseInterface<T> = {
      data: raw.data,
      status: raw.status,
      headers: raw.headers,
      config,
    };

    if (res.status >= 400 && config.throwErrors !== false) {
      // TODO: Figure out cleaner way to type error responses
      const errorBody: any = res.data;
      const errorData = errorBody
        ? errorBody.tag === 'HttpError'
          ? errorBody
          : errorBody.error?.tag === 'HttpError'
            ? errorBody.error
            : null
        : null;
      if (errorData) {
        throw SimpleHttpClientRequestError.fromJSON(errorData, res);
      } else {
        const status = <HttpStatusCodes>res.status;
        throw new SimpleHttpClientRequestError(status, `${status} ${HttpErrorStatuses[status]}`, { res });
      }
    }

    return res;
  }
}
