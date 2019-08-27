import { SimpleLoggerInterface } from "ts-simple-interfaces";
import * as winston from "winston";

export class SimpleLoggerWinston implements SimpleLoggerInterface {
  protected winston: winston.Logger;
  public constructor(opts: winston.LoggerOptions = {}) {
    // force syslog methods
    opts.levels = winston.config.syslog.levels;
    this.winston = winston.createLogger(opts);
  }

  public log(level: string, message: string, ...meta: any[]): this {
    (this.winston.log as any).apply(this.winston, [ level, message ].concat(meta));
    return this;
  }

  public debug(message: string, ...meta: any[]): this {
    (this.winston.debug as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }

  public info(message: string, ...meta: any[]): this {
    (this.winston.info as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }

  public notice(message: string, ...meta: any[]): this {
    (this.winston.notice as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }

  public warning(message: string, ...meta: any[]): this {
    (this.winston.warning as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }

  public error(message: string, ...meta: any[]): this {
    (this.winston.error as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }

  public alert(message: string, ...meta: any[]): this {
    (this.winston.alert as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }

  public critical(message: string, ...meta: any[]): this {
    (this.winston.crit as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }

  public emergency(message: string, ...meta: any[]): this {
    (this.winston.emerg as any).apply(this.winston, [ message ].concat(meta));
    return this;
  }
}
