import * as Errors from '@wymp/http-errors';
import { SimpleHttpClientResponseInterface } from './http';
import { SimpleLogLevels } from './logging';

export * from '@wymp/http-errors';

type SimpleHttpClientRequestErrorMeta<
  Data,
  Obstructions extends Errors.ObstructionInterface = Errors.ObstructionInterface,
> = Errors.ErrorMeta<Obstructions> & {
  res: SimpleHttpClientResponseInterface<Data>;
};

/**
 * SimpleHttpClientRequestError
 *
 * This is an extension of a standard Wymp `HttpError` that includes the server `response` object (which is a
 * `SimpleHttpClientResponseInterface`). You can use this response object to, for example, inspect the headers of the
 * response or get the raw response body.
 *
 * This error is intended to be thrown by a client when it receives an error response from a server.
 */
export class SimpleHttpClientRequestError<
  Data,
  Status extends Errors.HttpStatusCodes = Errors.HttpStatusCodes,
  Obstructions extends Errors.ObstructionInterface = Errors.ObstructionInterface,
> extends Errors.HttpError<Status, Obstructions> {
  public readonly res: SimpleHttpClientResponseInterface<Data>;
  public constructor(status: Status, message: string, meta: SimpleHttpClientRequestErrorMeta<Data, Obstructions>) {
    super(status, message, meta);
    this.res = meta.res;
  }

  public static override fromJSON<
    Data,
    Status extends Errors.HttpStatusCodes = Errors.HttpStatusCodes,
    Obstructions extends Errors.ObstructionInterface = Errors.ObstructionInterface,
  >(json: string | Errors.HttpErrorJSON<Status, Obstructions>, res?: SimpleHttpClientResponseInterface<Data>) {
    const obj = typeof json === 'string' ? <Errors.HttpErrorJSON<Status, Obstructions>>JSON.parse(json) : json;
    const meta: Errors.ErrorMeta<Obstructions> = {
      subcode: obj.subcode,
      logLevel: obj.logLevel as keyof SimpleLogLevels,
      obstructions: obj.obstructions,
    };
    if (res) {
      return new SimpleHttpClientRequestError<Data, Status, Obstructions>(obj.status, obj.message, { ...meta, res });
    } else {
      return new Errors.HttpError<Status, Obstructions>(obj.status, obj.message, meta);
    }
  }
}
