import { SimplePublisherInterface } from "ts-simple-interfaces";

interface MethodCall {
  method: string;
  args: any[];
}

export class MockSimplePublisher implements SimplePublisherInterface {
  protected _calls: MethodCall[] = [];

  public publishToChannel(
    channel: string,
    routingKey: string,
    event: unknown,
    options?: unknown,
    ...rest: any[]
  ): Promise<void> {
    const t = this;
    return new Promise(function(resolve, reject) {
      t.register("publish", [channel, routingKey, event, options].concat(rest));
      resolve();
    });
  }

  public async close(...rest: any[]) {
    this.register("close", rest);
  }

  get calls(): any[] {
    return this._calls;
  }

  protected register(method: string, args: any[]) {
    this._calls.push({ method, args });
  }
}
