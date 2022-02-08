import {
  SimpleHttpClientRequestConfig,
  SimpleHttpClientResponseInterface,
  SimpleHttpClientInterface
} from "@wymp/ts-simple-interfaces";
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosStatic,
  AxiosInstance
} from "axios";

export class SimpleHttpClientAxios implements SimpleHttpClientInterface {
  protected axios: AxiosInstance;

  constructor(config?: AxiosRequestConfig, deps?: { axios?: AxiosInstance }) {
    if (deps && deps.axios) {
      this.axios = deps.axios;
    } else {
      this.axios = axios.create(config);
    }
  }

  request<T extends any>(
    _config: Omit<AxiosRequestConfig, "headers"> & SimpleHttpClientRequestConfig
  ): Promise<SimpleHttpClientResponseInterface<T>> {
    const headers = Object.entries(_config.headers || {})
      .filter(
        (row): row is [string, string | Array<string>] => row[1] !== undefined
      )
      .reduce<{ [k: string]: string }>((obj, entry) => {
        obj[entry[0]] = Array.isArray(entry[1]) ? entry[1].join(",") : entry[1];
        return obj;
      }, {});

    const config = {
      ..._config,
      headers,
      validateStatus: _config.throwErrors === false ? () => true : null
    };

    console.log(`Axios config options: `, config);

    return this.axios.request<T>(config).then(
      (r: AxiosResponse<T>): SimpleHttpClientResponseInterface<T> => {
        return {
          data: r.data,
          status: r.status,
          headers: r.headers,
          config
        };
      }
    );
  }
}
