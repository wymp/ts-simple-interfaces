import { SimpleLoggerInterface, SimpleLogLevels as SLL } from "@wymp/ts-simple-interfaces";
type SimpleLogLevels = keyof SLL;

export class SimpleLoggerConsole implements SimpleLoggerInterface {
  protected _level: number = 20;
  protected formatter: Opts["formatter"];
  protected legacyFormat: string = "[${level}] ${message}";

  public constructor(opts?: Partial<Opts & LegacyOpts>) {
    if (opts?.level) {
      this._level = this.levelMap[opts.level];
    }
    if (opts?.formatter) {
      this.formatter = opts.formatter;
    } else {
      this.formatter = (level: string, message: string, ...args: Array<any>) => {
        return this.legacyFormat
          .replace(/\$\{timestamp\}/g, new Date().toISOString())
          .replace(/\$\{level\}/g, level)
          .replace(/\$\{message\}/g, message)
          .replace(/\$\{meta\}/g, JSON.stringify(args));
      };
    }

    // If we passed the legacy option "format", set it and warn
    if (opts?.format) {
      this.legacyFormat = opts.format;
      console.warn(
        `SimpleLoggerConsole: The logger option 'format' is deprecated. The new way is to ` +
          `pass a function under the \`formatter\` key whose signature is as follows: ` +
          `\`(level: string, message: string, ...args: Array<any>) => string;\`. ` +
          `The \`format\` option will be removed in the future.`
      );
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
      console.debug(this.formatter(_level, message, ...meta), ...meta);
    }
    return this;
  }

  public debug(message: string, ...meta: any[]): this {
    if (this.levelMap.debug >= this._level) {
      console.debug(this.formatter("debug", message, ...meta), ...meta);
    }
    return this;
  }

  public info(message: string, ...meta: any[]): this {
    if (this.levelMap.info >= this._level) {
      console.info(this.formatter("info", message, ...meta), ...meta);
    }
    return this;
  }

  public notice(message: string, ...meta: any[]): this {
    if (this.levelMap.notice >= this._level) {
      console.log(this.formatter("notice", message, ...meta), ...meta);
    }
    return this;
  }

  public warning(message: string, ...meta: any[]): this {
    if (this.levelMap.warning >= this._level) {
      console.warn(this.formatter("warning", message, ...meta), ...meta);
    }
    return this;
  }

  public error(message: string, ...meta: any[]): this {
    if (this.levelMap.error >= this._level) {
      console.error(this.formatter("error", message, ...meta), ...meta);
    }
    return this;
  }

  public alert(message: string, ...meta: any[]): this {
    if (this.levelMap.alert >= this._level) {
      console.error(this.formatter("alert", message, ...meta), ...meta);
    }
    return this;
  }

  public critical(message: string, ...meta: any[]): this {
    if (this.levelMap.critical >= this._level) {
      console.error(this.formatter("critical", message, ...meta), ...meta);
    }
    return this;
  }

  public emergency(message: string, ...meta: any[]): this {
    if (this.levelMap.emergency >= this._level) {
      console.error(this.formatter("emergency", message, ...meta), ...meta);
    }
    return this;
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
   * A function that formats a log string for output
   */
  formatter: (level: string, message: string, ...args: Array<any>) => string;
};

export type LegacyOpts = {
  format: string;
};
