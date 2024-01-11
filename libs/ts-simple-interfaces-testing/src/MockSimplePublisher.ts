import { SimplePublisherInterface } from "@wymp/ts-simple-interfaces";
import { EventEmitter } from "events";

interface MethodCall {
  method: string;
  args: any[];
}

export class MockSimplePublisher implements SimplePublisherInterface<unknown, unknown> {
  protected emitter: EventEmitter;
  protected _calls: MethodCall[] = [];

  public constructor() {
    this.emitter = new EventEmitter();
  }

  public publish(
    channel: string,
    routingKey: string,
    event: unknown,
    options?: unknown,
    ...rest: any[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.register("publish", [channel, routingKey, event, options].concat(rest));
      resolve();
    });
  }

  public async close(...rest: any[]) {
    this.register("close", rest);
  }

  public on(event: "error", listener: (e: Error) => void): this;
  public on(event: "connect", listener: () => void): this;
  public on(event: "disconnect", listener: () => void): this;
  public on(event: "connect" | "disconnect" | "error", listener: ((e: Error) => void) | (() => void)): this {
    this.emitter.on(event, listener);
    return this;
  }

  public once(event: "error", listener: (e: Error) => void): this;
  public once(event: "connect", listener: () => void): this;
  public once(event: "disconnect", listener: () => void): this;
  public once(event: "connect" | "disconnect" | "error", listener: ((e: Error) => void) | (() => void)): this {
    this.emitter.once(event, listener);
    return this;
  }

  public removeListener(event: "connect" | "disconnect" | "error", listener: () => void): this {
    this.emitter.removeListener(event, listener);
    return this;
  }

  public removeAllListeners(event?: "connect" | "disconnect" | "error"): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  get calls(): any[] {
    return this._calls;
  }

  protected register(method: string, args: any[]) {
    this._calls.push({ method, args });
  }
}
