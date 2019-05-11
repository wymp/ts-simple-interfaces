import { SimplePublisherInterface } from "simple-interfaces";

interface MethodCall {
  method: string;
  args: any[];
}


export class SimpleMockPublisher implements SimplePublisherInterface {
  protected _calls: MethodCall[] = [];

  public publish(domain: string, event: unknown, ...rest: any[]): Promise<void> {
    const t = this;
    return new Promise(function(resolve, reject) {
      t.register("publish", [ domain, event ].concat(rest));
      resolve();
    });
  }

  public close(...rest: any[]) {
    this.register("close", rest);
  }

  get calls(): any[] {
    return this._calls;
  }

  protected register(method: string, args: any[]) {
    this._calls.push({ method, args });
  }
}
