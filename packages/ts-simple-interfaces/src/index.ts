/*****************************************************
 * Pub/Sub
 *****************************************************/

/**
 * An interface that presents a method for publishing a message
 */
export interface SimplePublisherInterface {
  publish: (stream: string, msg: unknown) => Promise<void>;
  close: () => void;
}

/**
 * An interface that presents a method for subscribing to a message stream with optional
 * routing keys.
 */
export interface SimpleSubscriberInterface {
  subscribe: (stream: string, routingKeys?: string[]) => Promise<void>;
  close: () => void;
}

/**
 * An interface that presents a pub/sub client
 */
export interface SimplePubSubInterface extends SimplePublisherInterface, SimpleSubscriberInterface { }




/*****************************************************
 * Database
 *****************************************************/

export interface SimpleSqlDbInterface {
  query: (query: string, params?: Array<string | number | boolean | Buffer | Date>) => Promise<SimpleSqlResponseInterface>;
  close: () => void;
}

export interface SimpleSqlResponseInterface {
  readonly rows: unknown[];
  readonly affectedRows: number|null;
}




/****************************************************
 * Logging
 * **************************************************/

export type LogMethod = (level: string, message: string, ...meta: any[]) => SimpleLoggerInterface;

export type LeveledLogMethod = (message: string, ...meta: any[]) => SimpleLoggerInterface;

export interface SimpleLoggerInterface {
  log: LogMethod;
  debug: LeveledLogMethod;
  info: LeveledLogMethod;
  notice: LeveledLogMethod;
  warning: LeveledLogMethod;
  error: LeveledLogMethod;
  alert: LeveledLogMethod;
  critical: LeveledLogMethod;
  emergency: LeveledLogMethod;
}




/*********************************************************
 * Errors
 *********************************************************/

/**
 * HTMLError is a base class that provides common attributes (name and status, in addition
 * to the standard message) that allow it to be consumed directly by error handlers and
 * converted into useful HTTP errors.
 *
 * In addition, it provides strings that may be set either statically or at runtime to
 * aid in logging.
 *
 * Calling `log` on such an error, and passing it a `SimpleLoggerInterface`, will case it
 * to dump any information it has to the appropriate log levels.
 */
export class HTTPError extends Error {
  public readonly name: string = "InternalServerError";
  public readonly loggable: boolean = true;
  public readonly status: 400|401|402|403|404|406|409|415|429|500|501|502|503 = 500;

  public debug: string|null = null;
  public info: string|null = null;
  public notice: string|null = null;
  public warning: string|null = null;
  public error: string|null = null;
  public alert: string|null = null;
  public critical: string|null = null;
  public emergency: string|null = null;

  public log(logger: SimpleLoggerInterface): void {
    if (this.emergency) {
      logger.emergency(this.emergency);
    }
    if (this.critical) {
      logger.critical(this.critical);
    }
    if (this.alert) {
      logger.alert(this.alert);
    }
    if (this.error) {
      logger.error(this.error);
    }
    if (this.warning) {
      logger.warning(this.warning);
    }
    if (this.notice) {
      logger.notice(this.notice);
    }
    if (this.info) {
      logger.info(this.info);
    }
    if (this.debug) {
      logger.debug(this.debug);
    }

    const stack = (this as NodeJS.ErrnoException).stack;
    if (typeof stack !== "undefined") {
      logger.debug(stack);
    }
  }
}

export class BadRequestError extends HTTPError {
  public readonly name: string = "BadRequest";
  public readonly status = 400;
}

export class UnauthorizedError extends HTTPError {
  public readonly name = "Unauthorized";
  public readonly status = 401;
}

export class PaymentRequiredError extends HTTPError {
  public readonly name = "PaymentRequired";
  public readonly status = 402;
}

export class ForbiddenError extends HTTPError {
  public readonly name = "Forbidden";
  public readonly status = 403;
}

export class NotFoundError extends HTTPError {
  public readonly name = "NotFound";
  public readonly status = 404;
}

export class NotAcceptableError extends HTTPError {
  public readonly name = "NotAcceptable";
  public readonly status = 406;
}

export class ConflictError extends HTTPError {
  public readonly name = "Conflict";
  public readonly status = 409;
}

export class UnsupportedMediaTypeError extends HTTPError {
  public readonly name = "UnsupportedMediaType";
  public readonly status = 415;
}

export class TooManyRequestsError extends HTTPError {
  public readonly name = "TooManyRequests";
  public readonly status = 429;
}

export class InternalServerError extends HTTPError {
  public readonly name = "InternalServerError";
  public readonly status = 500;
}

export class NotImplementedError extends HTTPError {
  public readonly name = "NotImplemented";
  public readonly status = 501;
}

export class BadGatewayError extends HTTPError {
  public readonly name = "BadGateway";
  public readonly status = 502;
}

export class ServiceUnavailableError extends HTTPError {
  public readonly name = "ServiceUnavailable";
  public readonly status = 503;
}


