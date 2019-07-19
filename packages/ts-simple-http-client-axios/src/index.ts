import {
  SimpleHttpRequestConfig,
  SimpleHttpResponseInterface,
  SimpleHttpClientInterface,
} from "ts-simple-interfaces";
import
  axios,
  {
    AxiosRequestConfig,
    AxiosResponse,
    AxiosStatic,
    AxiosInstance,
  }
from "axios";

export class SimpleHttpClientAxios implements SimpleHttpClientInterface {
  protected axios: AxiosInstance;

  constructor(
    config?: AxiosRequestConfig,
    deps?: { axios?: AxiosInstance }
  ) {
    if (deps && deps.axios) {
      this.axios = deps.axios;
    } else {
      this.axios = axios.create(config);
    }
  }

  request<T extends any>(
    config: SimpleHttpRequestConfig
  ): Promise<SimpleHttpResponseInterface<T>> {
    return this.axios.request<T>(config).then(
      (r: AxiosResponse<T>): SimpleHttpResponseInterface<T> => {
        return {
          data: r.data,
          status: r.status,
          headers: r.headers,
          config
        }
      }
    );
  }
}

