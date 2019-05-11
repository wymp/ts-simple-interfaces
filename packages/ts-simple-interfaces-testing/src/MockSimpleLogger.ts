import { SimpleLoggerInterface } from "simple-interfaces";

export class MockSimpleLogger implements SimpleLoggerInterface {
  protected _loggedMessages: string[] = [];

  get messages() {
    return this._loggedMessages;
  }

  public match(re: RegExp|string): boolean {
    for (let msg of this._loggedMessages) {
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
    this._loggedMessages.push(`emergency: ${message}`);
    return this;
  }

  public critical(message: string, ...meta: any[]): this {
    this._loggedMessages.push(`critical: ${message}`);
    return this;
  }

  public alert(message: string, ...meta: any[]): this {
    this._loggedMessages.push(`alert: ${message}`);
    return this;
  }

  public error(message: string, ...meta: any[]): this {
    this._loggedMessages.push(`error: ${message}`);
    return this;
  }

  public warning(message: string, ...meta: any[]): this {
    this._loggedMessages.push(`warning: ${message}`);
    return this;
  }

  public notice(message: string, ...meta: any[]): this {
    this._loggedMessages.push(`notice: ${message}`);
    return this;
  }

  public info(message: string, ...meta: any[]): this {
    this._loggedMessages.push(`info: ${message}`);
    return this;
  }

  public debug(message: string, ...meta: any[]): this {
    this._loggedMessages.push(`debug: ${message}`);
    return this;
  }

  public log(level: string, message: string, ...meta: any[]): this {
    this._loggedMessages.push(`${level}: ${message}`);
    return this;
  }
}

