/****************************************************
 * Logging
 *
 * There is a lot of value in standardizing around syslog error levels. Thus, this
 * SimpleLoggerInterface defines these methods explicitly. Different loggers may implement
 * other levels (for whatever reason) if they must.
 * **************************************************/

// This is a hack because typescript won't let us use a union type as an index type :(
export interface SimpleLogLevels {
  debug: SimpleLeveledLogMethod;
  info: SimpleLeveledLogMethod;
  notice: SimpleLeveledLogMethod;
  warning: SimpleLeveledLogMethod;
  error: SimpleLeveledLogMethod;
  alert: SimpleLeveledLogMethod;
  critical: SimpleLeveledLogMethod;
  emergency: SimpleLeveledLogMethod;
}
export type SimpleLogMethod = (level: keyof SimpleLogLevels, message: string, ...meta: any[]) => SimpleLoggerInterface;
export type SimpleLeveledLogMethod = (message: string, ...meta: any[]) => SimpleLoggerInterface;

export interface SimpleLoggerInterface extends SimpleLogLevels {
  log: SimpleLogMethod;
}

/**
 * A SimpleLoggerConsumer accepts and uses a SimpleLoggerInterface
 */
export interface SimpleLoggerConsumerInterface {
  setLogger: (logger: SimpleLoggerInterface) => unknown;
}

/**
 * This is one of the few concrete implementations that is justified in being here, since it is so
 * commonly used and is so light weight.
 */
export class TaggedLogger implements SimpleLoggerInterface {
  protected logger: SimpleLoggerInterface;
  protected header: string;

  public constructor(header: string, logger: SimpleLoggerInterface) {
    if (this.isTaggedLogger(logger)) {
      this.header = `${logger.header} ${header}`;
      this.logger = logger.logger;
    } else {
      this.header = header;
      this.logger = logger;
    }
  }

  public log(level: keyof SimpleLogLevels, msg: string, ...meta: Array<any>): SimpleLoggerInterface {
    return this.logger.log(level, `${this.header} ${msg}`, ...meta);
  }

  public debug(msg: string, ...meta: Array<any>) {
    return this.logger.debug(`${this.header} ${msg}`, ...meta);
  }

  public info(msg: string, ...meta: Array<any>) {
    return this.logger.info(`${this.header} ${msg}`, ...meta);
  }

  public notice(msg: string, ...meta: Array<any>) {
    return this.logger.notice(`${this.header} ${msg}`, ...meta);
  }

  public warning(msg: string, ...meta: Array<any>) {
    return this.logger.warning(`${this.header} ${msg}`, ...meta);
  }

  public error(msg: string, ...meta: Array<any>) {
    return this.logger.error(`${this.header} ${msg}`, ...meta);
  }

  public alert(msg: string, ...meta: Array<any>) {
    return this.logger.alert(`${this.header} ${msg}`, ...meta);
  }

  public critical(msg: string, ...meta: Array<any>) {
    return this.logger.critical(`${this.header} ${msg}`, ...meta);
  }

  public emergency(msg: string, ...meta: Array<any>) {
    return this.logger.emergency(`${this.header} ${msg}`, ...meta);
  }

  protected isTaggedLogger(l: any): l is TaggedLogger {
    return typeof l.header === 'string';
  }
}
