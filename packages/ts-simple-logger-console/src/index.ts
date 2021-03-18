import { SimpleLoggerInterface, SimpleLogLevels as SLL } from "@wymp/ts-simple-interfaces";
type SimpleLogLevels = keyof SLL;

export class SimpleLoggerConsole implements SimpleLoggerInterface {
  protected _level: number = 20;
  protected format: string = "[${level}] ${message}";

  public constructor(opts?: Partial<Opts>) {
    if (opts) {
      if (opts.level) {
        this._level = this.levelMap[opts.level];
      }
      if (opts.format) {
        this.format = opts.format;
      }
    }
  }

  public get level(): SimpleLogLevels {
    for (const _l in this.levelMap) {
      const l = <SimpleLogLevels>_l;
      if (this.levelMap[l] === this._level) {
        return l;
      }
    }
    return "debug";
  }
  public set level(l: SimpleLogLevels) {
    this._level = this.levelMap[l];
  }

  public log(_level: string, message: string, ...meta: any[]): this {
    const level = this.levelMap[<SimpleLogLevels>_level] || 10;
    if (level >= this._level) {
      if (level < 40) {
        console.log(this.formatMessage(_level, message, meta));
      } else if (level === 40) {
        console.warn(this.formatMessage(_level, message, meta));
      } else {
        console.error(this.formatMessage(_level, message, meta));
      }
    }
    return this;
  }

  public debug(message: string, ...meta: any[]): this {
    this.log("debug", message, ...meta);
    return this;
  }

  public info(message: string, ...meta: any[]): this {
    this.log("info", message, ...meta);
    return this;
  }

  public notice(message: string, ...meta: any[]): this {
    this.log("notice", message, ...meta);
    return this;
  }

  public warning(message: string, ...meta: any[]): this {
    this.log("warning", message, ...meta);
    return this;
  }

  public error(message: string, ...meta: any[]): this {
    this.log("error", message, ...meta);
    return this;
  }

  public alert(message: string, ...meta: any[]): this {
    this.log("alert", message, ...meta);
    return this;
  }

  public critical(message: string, ...meta: any[]): this {
    this.log("critical", message, ...meta);
    return this;
  }

  public emergency(message: string, ...meta: any[]): this {
    this.log("emergency", message, ...meta);
    return this;
  }

  protected formatMessage(level: string, message: string, meta: Array<any>) {
    return this.format
      .replace(/\$\{timestamp\}/g, new Date().toISOString())
      .replace(/\$\{level\}/g, level)
      .replace(/\$\{message\}/g, message)
      .replace(/\$\{meta\}/g, JSON.stringify(meta));
  }

  private levelMap: { [l in SimpleLogLevels]: number } = {
    debug: 10,
    info: 20,
    notice: 30,
    warning: 40,
    error: 50,
    alert: 60,
    critical: 70,
    emergency: 80
  };
}

export type Opts = {
  /**
   * The level at which to start displaying messages
   */
  level: SimpleLogLevels;

  /**
   * Should be a string template with variables in standard `${var}` format. Available variables
   * include:
   *
   * * timestamp
   * * level
   * * message
   * * meta
   */
  format: string;
};
