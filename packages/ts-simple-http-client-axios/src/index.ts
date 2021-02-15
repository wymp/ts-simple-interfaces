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
    config: SimpleHttpClientRequestConfig
  ): Promise<SimpleHttpClientResponseInterface<T>> {
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
