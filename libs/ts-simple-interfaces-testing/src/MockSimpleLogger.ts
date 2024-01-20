import { SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';

declare type Opts = {
  outputMessages?: boolean;
};

export class MockSimpleLogger implements SimpleLoggerInterface {
  protected _loggedMessages: string[] = [];
  public readonly opts: Opts;

  public constructor(opts: Opts = {}) {
    if (!opts) {
      opts = {};
    }
    this.opts = opts;
  }

  public setOpt<T extends keyof Opts>(opt: T, val: Opts[T]): void {
    this.opts[opt] = val;
  }

  public get messages() {
    return this._loggedMessages;
  }

  public match(re: RegExp | string): boolean {
    for (const msg of this._loggedMessages) {
      if (msg.match(re)) {
        return true;
      }
    }
    return false;
  }

  public clear(): this {
    this._loggedMessages = [];
    return this;
  }

  public emergency(message: string, ...meta: any[]): this {
    return this.log('emergency', message, meta);
  }

  public critical(message: string, ...meta: any[]): this {
    return this.log('critical', message, meta);
  }

  public alert(message: string, ...meta: any[]): this {
    return this.log('alert', message, meta);
  }

  public error(message: string, ...meta: any[]): this {
    return this.log('error', message, meta);
  }

  public warning(message: string, ...meta: any[]): this {
    return this.log('warning', message, meta);
  }

  public notice(message: string, ...meta: any[]): this {
    return this.log('notice', message, meta);
  }

  public info(message: string, ...meta: any[]): this {
    return this.log('info', message, meta);
  }

  public debug(message: string, ...meta: any[]): this {
    return this.log('debug', message, meta);
  }

  public log(level: string, message: string, ...meta: any[]): this {
    this._loggedMessages.push(`${level}: ${message}`);
    if (this.opts.outputMessages) {
      console.log(`${level}: ${message}` + (meta.length > 0 ? JSON.stringify(meta) : ''));
    }
    return this;
  }
}
