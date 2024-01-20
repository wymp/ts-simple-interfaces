import { EventEmitter } from 'events';
import * as AmqpProps from 'amqplib/properties';
import { SimpleAmqpConnection, SimpleAmqpChannel } from './SimpleAmqp';
import { SimpleLoggerInterface, TaggedLogger } from '@wymp/ts-simple-interfaces';
import * as uuid from 'uuid';

export class MockAmqpCnx implements SimpleAmqpConnection {
  public manualResolve: boolean = false;
  protected emitter: EventEmitter;
  private ch: MockAmqpChannel | null = null;
  private _resolve: null | ((ch: MockAmqpChannel) => void) = null;

  public constructor(protected log: SimpleLoggerInterface) {
    this.log = new TaggedLogger('MockAmqpCnx:', this.log);
    this.emitter = new EventEmitter();
    this.log.debug(`created`);
  }

  public get channel() {
    return this.ch;
  }

  public resolve() {
    this.log.debug(`resolve`);
    if (this._resolve) {
      this.log.debug(`Calling resolve for channel`);
      this._resolve(this.ch!);
    }
  }

  close(): Promise<void> {
    this.log.debug(`close`);
    return Promise.resolve();
  }

  createChannel(): Promise<MockAmqpChannel> {
    this.log.debug(`createChannel`);

    this.ch = new MockAmqpChannel(this.log, this.ch?.publishReturnValueQueue);

    return new Promise((res, rej) => {
      if (!this.manualResolve) {
        this.log.debug(`resolving immediately`);
        res(this.ch!);
      } else {
        this.log.debug(`setting up to resolve later`);
        this._resolve = res;
      }
    });
  }

  on(ev: 'error', handler: (e: Error) => void): this;
  on(ev: 'close', handler: (e?: Error) => void): this;
  on(ev: 'error' | 'close', handler: ((e: Error) => void) | ((e?: Error) => void)): this {
    this.emitter.on(ev, handler);
    return this;
  }

  triggerError(e: Error) {
    this.emitter.emit('error', e);
  }
}

let channelIndex = 1;
export class MockAmqpChannel implements SimpleAmqpChannel {
  private emitter: EventEmitter;
  private _calls: { [method: string]: Array<Array<any>> } = {};
  private _index: number;
  protected subscriptions: { [queue: string]: Array<any> } = {};

  public constructor(
    protected log: SimpleLoggerInterface,
    public publishReturnValueQueue: Array<boolean | Error> = [],
  ) {
    this.log = new TaggedLogger('MockAmqpChannel:', this.log);
    this.emitter = new EventEmitter();
    this._index = channelIndex++;
  }

  public get calls() {
    return this._calls;
  }
  public get index() {
    return this._index;
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  assertExchange(exchange: string, ...rest: any[]): Promise<AmqpProps.Replies.AssertExchange> {
    this.register('assertExchange', [exchange, ...rest]);
    return Promise.resolve({ exchange });
  }

  assertQueue(queue: string, ...rest: any[]): Promise<AmqpProps.Replies.AssertQueue> {
    this.register('assertQueue', [queue, ...rest]);
    return Promise.resolve({ queue, messageCount: 0, consumerCount: 0 });
  }

  bindQueue(...rest: any[]): Promise<AmqpProps.Replies.Empty> {
    this.register('bindQueue', rest);
    return Promise.resolve({});
  }

  consume(
    queue: string,
    onMessage: (msg: AmqpProps.ConsumeMessage | null) => any,
    ...rest: any[]
  ): Promise<AmqpProps.Replies.Consume> {
    this.register('consume', [queue, onMessage, ...rest]);
    if (typeof this.subscriptions[queue] === 'undefined') {
      this.subscriptions[queue] = [];
    }
    this.subscriptions[queue].push(onMessage);
    return Promise.resolve({ consumerTag: 'abcde12345' });
  }

  ack(...rest: any[]): void {
    this.register('ack', rest);
  }

  nack(...rest: any[]): void {
    this.register('nack', rest);
  }

  publish(...rest: any[]): boolean {
    this.register('publish', rest);
    // Get the next value, if set
    let val: undefined | boolean | Error = this.publishReturnValueQueue.shift();

    // If not set, default to true
    if (val === undefined) {
      val = true;
    }

    // If it's an error, throw the error
    if (typeof val === 'object') {
      throw val;
    } else {
      // Otherwise, just return it
      return val;
    }
  }

  once(ev: 'drain', handler: () => unknown) {
    this.emitter.once(ev, handler);
    return this;
  }

  on(ev: 'error', handler: (e: Error) => void): this;
  on(ev: 'close', handler: (e?: Error) => void): this;
  on(ev: 'error' | 'close', handler: ((e: Error) => void) | ((e?: Error) => void)): this {
    this.emitter.on(ev, handler);
    return this;
  }

  public produceMessage(queue: string, msg: any) {
    if (!this.subscriptions[queue]) {
      throw new Error(
        `You've tried to produce a message on a queue that isn't registered. Please register the queue '${queue}' with \`consume\` first.`,
      );
    }

    if (!msg.content) {
      if (typeof msg !== 'string') {
        msg = JSON.stringify(msg);
      }
      msg = {
        content: Buffer.from(msg, 'utf8'),
        fields: {
          exchange: 'test-exchange',
          routingKey: 'test.key',
          redelivered: false,
        },
        properties: {
          timestamp: Date.now(),
          messageId: uuid.v4(),
        },
      };
    }

    this.subscriptions[queue].map((f) => f(msg));
  }

  protected register(method: string, args: { [i: number]: any; length: number }) {
    if (!this._calls[method]) {
      this._calls[method] = [];
    }
    const ar: Array<any> = [];
    for (let i = 0; i < args.length; i++) {
      ar.push(args[i]);
    }
    this._calls[method].push(ar);
  }
}
