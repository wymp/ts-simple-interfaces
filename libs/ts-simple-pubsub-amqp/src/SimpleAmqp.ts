import * as amqp from 'amqplib';
import * as AmqpProps from 'amqplib/properties';
import * as uuid from 'uuid';
import {
  SimplePubSubInterface,
  SimplePubSubMessageInterface,
  SimpleLoggerInterface,
  TaggedLogger,
} from '@wymp/ts-simple-interfaces';
import { EventEmitter } from 'events';

//
//
//
//
// AMQP-Specific Types
//
//
//
//

/** RabbitMQ-specific "extra" properties */
export type AmqpExtra = {
  exchange: string;
  routingKey: string;
  redelivered: boolean;
  appId?: string;
  type?: string;
  timestamp: number;
  messageId: string;
  headers?: { [k: string]: string | number };
  contentEncoding?: string;
  contentType?: string;
  expiration?: number;
};

/** The actual type of a RabbitMQ message */
export type AmqpMessage = SimplePubSubMessageInterface<AmqpExtra> & {
  content: Buffer;
};

/** Subscription options */
export interface SimpleSubscriptionOptions {
  queue: {
    name: string;
    exclusive?: boolean;
    durable?: boolean;
    autoDelete?: boolean;
  };
  exchanges?: {
    [ex: string]: {
      type?: string;
      durable?: boolean;
      internal?: boolean;
      autoDelete?: boolean;
      alternateExchange?: string;
    };
  };
}

export interface SimplePublishOptions {
  routingKey: string;
  appId?: string;
  type?: string;
  timestamp?: number;
  messageId?: string;
  headers?: { [k: string]: string | number };
  contentEncoding?: string;
  contentType?: string;
  expiration?: number;
  persistent?: boolean;
}

/** An interface defining a retry controller for running jobs with retries on failure */
export interface Retry {
  run(job: () => Promise<boolean>, log: SimpleLoggerInterface, jobId?: string): Promise<boolean>;
}

//
// Private (internal) types
//

declare type RoutingKey = string;
declare type Subscription = {
  routes: { [exchange: string]: Array<RoutingKey> };
  handler: (msg: AmqpMessage, log: SimpleLoggerInterface) => Promise<boolean>;
  options: SimpleSubscriptionOptions;
};
declare type SubscriptionQueue = Array<Subscription>;

//
//
//
//
// Some AMQP definitions for purposes of improving testability
//
//
//
//

/** Configuration options for the SimplePubsubAmqp class */
export interface SimpleAmqpConfig extends amqp.Options.Connect {}

/** A simple AMQP connection */
export interface SimpleAmqpConnection {
  close(): Promise<void>;
  createChannel(): Promise<SimpleAmqpChannel>;
  on(ev: 'error', handler: (e: Error) => void | unknown): unknown;
  on(ev: 'close', handler: (e?: Error) => void | unknown): unknown;
}

/** A simple AMQP channel */
export interface SimpleAmqpChannel {
  close(): Promise<void>;
  assertExchange(
    exchange: string,
    type: string,
    options?: AmqpProps.Options.AssertExchange,
  ): Promise<AmqpProps.Replies.AssertExchange>;
  assertQueue(queue: string, options?: AmqpProps.Options.AssertQueue): Promise<AmqpProps.Replies.AssertQueue>;
  bindQueue(queue: string, source: string, pattern: string, args?: any): Promise<AmqpProps.Replies.Empty>;
  consume(
    queue: string,
    onMessage: (msg: AmqpProps.ConsumeMessage | null) => any,
    options?: AmqpProps.Options.Consume,
  ): Promise<AmqpProps.Replies.Consume>;
  ack(message: AmqpProps.Message, allUpTo?: boolean): void;
  nack(message: AmqpProps.Message, allUpTo?: boolean, requeue?: boolean): void;
  publish(exchange: string, routingKey: string, content: Buffer, options?: AmqpProps.Options.Publish): boolean;
  once(ev: 'drain', handler: () => unknown): unknown;
  on(ev: 'error', handler: (e: Error) => void | unknown): unknown;
  on(ev: 'close', handler: (e?: Error) => void | unknown): unknown;
}

//
//
//
//
//
//
// Main PubSub class
//
//
//
//
//
//

/**
 * The standard Simple PubSub implementation for AMQP.
 *
 * Because amqplib has such awful error handling properties, this class implements complex logic for managing the
 * connection. It will attempt to re-establish the both the channel and the connection in the case of errors in either,
 * and will queue subscription requests until the connection is established and restore subscriptions on reconnect.
 */
export class SimplePubSubAmqp<PubMsgType = unknown>
  implements SimplePubSubInterface<AmqpMessage, PubMsgType, SimpleSubscriptionOptions, SimplePublishOptions>
{
  protected cnx: SimpleAmqpConnection | null = null;
  protected ch: SimpleAmqpChannel | null = null;
  protected subscriptions: SubscriptionQueue = [];
  protected _waiting: boolean = true;
  protected retry: Retry;
  protected emitter: EventEmitter;
  protected closed: boolean = false;
  private amqpConnect: (url: string | AmqpProps.Options.Connect, socketOptions?: any) => Promise<SimpleAmqpConnection>;
  private reloads = 0;
  private reloadTimer: any = null;

  public constructor(
    protected config: SimpleAmqpConfig,
    protected log: SimpleLoggerInterface,
    deps?: {
      retry?: Retry;
      amqpConnect?: (url: string | AmqpProps.Options.Connect, socketOptions?: any) => Promise<SimpleAmqpConnection>;
    },
  ) {
    // If we don't pass in a retry mechanism, then wait 1 second before nacking failures (nacking will send it back
    // to the queue, which will then re-deliver it to us if configured to do so, so a waiting 1 second on failure is
    // like having a 1-second periodic retry mechanism)
    this.retry =
      deps && deps.retry
        ? deps.retry
        : {
            run: (j: () => Promise<boolean>, l: SimpleLoggerInterface, _jobId: string): Promise<boolean> => {
              return new Promise((r) => {
                j().then((result) => {
                  if (!result) {
                    setTimeout(() => r(false), 1000);
                  } else {
                    r(true);
                  }
                });
              });
            },
          };

    this.amqpConnect = deps && deps.amqpConnect ? deps.amqpConnect : amqp.connect;

    this.emitter = new EventEmitter();
  }

  public get waiting() {
    return this._waiting;
  }

  public async connect(): Promise<this> {
    // Establish the connection and failover
    this.cnx = await this.amqpConnect(this.config);
    this.cnx.on('error', (e: Error) => {
      this.emitter.emit('error', e);
      this.tryAgain(e);
    });

    // Establish the channel failover
    this.ch = await this.cnx.createChannel();
    this.ch.on('error', (e: Error) => {
      this.emitter.emit('error', e);
      this.tryAgain(e);
    });
    this.ch.on('close', (e?: Error) => this.emitter.emit('disconnect', e));

    this.emitter.emit('connect');
    this._waiting = false;
    return this;
  }

  public on(event: 'error', listener: (e: Error) => void): this;
  public on(event: 'connect', listener: () => void): this;
  public on(event: 'disconnect', listener: () => void): this;
  public on(event: 'connect' | 'disconnect' | 'error', listener: ((e: Error) => void) | (() => void)): this {
    this.emitter.on(event, listener);
    return this;
  }

  public once(event: 'error', listener: (e: Error) => void): this;
  public once(event: 'connect', listener: () => void): this;
  public once(event: 'disconnect', listener: () => void): this;
  public once(event: 'connect' | 'disconnect' | 'error', listener: ((e: Error) => void) | (() => void)): this {
    this.emitter.once(event, listener);
    return this;
  }

  public removeListener(event: 'connect' | 'disconnect' | 'error', listener: () => void): this {
    this.emitter.removeListener(event, listener);
    return this;
  }

  public removeAllListeners(event?: 'connect' | 'disconnect' | 'error'): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  public async close(): Promise<unknown> {
    this.closed = true;
    if (this.cnx) {
      await this.cnx.close();
    }
    return;
  }

  public subscribe(
    routes: Subscription['routes'],
    handler: Subscription['handler'],
    options: Subscription['options'],
  ): Promise<void> {
    return new Promise((res, rej) => {
      const sub = { routes, handler, options };
      this.subscriptions.push(sub);
      const subscribe = async () => {
        if (!this._waiting) {
          await this._subscribe(sub);
          res();
        } else {
          setTimeout(subscribe, 200);
        }
      };
      subscribe();
    });
  }

  protected async _subscribe(sub: Subscription) {
    // Make sure a queue for this subscription exists
    const qopts = sub.options.queue;
    this.log.info(`Asserting that queue ${qopts.name} exists.`);
    await this.ch!.assertQueue(qopts.name, {
      exclusive: qopts.exclusive,
      durable: typeof qopts.durable === 'undefined' ? true : qopts.durable,
      autoDelete: qopts.autoDelete,
    });

    // Bind the queue to each exchange for the given routes
    const p: Array<Promise<unknown>> = [];
    for (const exchange in sub.routes) {
      this.log.info(`Asserting that exchange ${exchange} exists.`);
      const exopts = sub.options.exchanges && sub.options.exchanges[exchange] ? sub.options.exchanges[exchange] : {};
      p.push(
        this.ch!.assertExchange(exchange, exopts.type || 'topic', {
          durable: typeof exopts.durable === 'undefined' ? true : exopts.durable,
          internal: exopts.internal,
          autoDelete: exopts.autoDelete,
          alternateExchange: exopts.alternateExchange,
        }).then(() => {
          const q: Array<Promise<unknown>> = [];
          for (const binding of sub.routes[exchange]) {
            this.log.info(`Binding ${qopts.name} to ${exchange} with key ${binding}`);
            q.push(this.ch!.bindQueue(qopts.name, exchange, binding));
          }
          return Promise.all(q);
        }),
      );
    }

    await Promise.all(p);

    // Now consume on the queue
    await this.ch!.consume(qopts.name, async (msg) => {
      if (!msg) {
        return;
      }

      const m = {
        content: msg.content,
        extra: {
          exchange: msg.fields.exchange,
          routingKey: msg.fields.routingKey,
          redelivered: msg.fields.redelivered,
          appId: msg.properties.appId,
          type: msg.properties.type,
          timestamp: msg.properties.timestamp,
          messageId: msg.properties.messageId,
          headers: msg.properties.headers,
          contentEncoding: msg.properties.contentEncoding,
          contentType: msg.properties.contentType,
          expiration: msg.properties.expiration,
        },
      };

      const log = new TaggedLogger(`MQ: ${qopts.name}:${m.extra.messageId ? ` ${m.extra.messageId}:` : ``}`, this.log);

      log.debug(`Received message: ${m.content.toString('utf8')}`);
      const result = await this.retry.run(() => sub.handler(m, log), log, m.extra.messageId);

      if (result) {
        this.ch!.ack(msg);
      } else {
        this.ch!.nack(msg);
      }
    });
  }

  public async publish(channel: string, msg: PubMsgType, options: SimplePublishOptions): Promise<void> {
    // Fill in default options
    options.timestamp = options.timestamp || Date.now();
    options.messageId = options.messageId || uuid.v4();
    options.persistent = typeof options.persistent === 'undefined' ? true : options.persistent;

    // Now try to publish
    return new Promise<void>((res, rej) => {
      const timeout = 10000;
      const maxAttempts = 5;
      let elapsed = 0;
      let attempts = 0;
      const publish = () => {
        if (this._waiting) {
          if (elapsed > timeout) {
            rej(
              new Error(
                `Timed out after 10 seconds waiting to publish message. Something is wrong with the connection.`,
              ),
            );
          } else {
            elapsed += 200;
            setTimeout(publish, 200);
          }
        } else {
          try {
            const success = this.ch!.publish(
              channel,
              options.routingKey,
              Buffer.isBuffer(msg) ? msg : Buffer.from(typeof msg === 'string' ? msg : JSON.stringify(msg), 'utf8'),
              options,
            );

            if (success) {
              res();
            } else {
              // If we return false, then the buffer is full. Try again after the 'drain' event
              this.ch!.once('drain', () => publish());
              return;
            }
          } catch (e) {
            // If we caught an error, then call "tryAgain" to re-estabslish the connection and then try the publish again
            const baseMsg = `Error publishing message: ${e.message} (attempt #${attempts}).`;
            if (attempts >= maxAttempts) {
              // If we've tried too many times, abort
              rej(new Error(`${baseMsg} Too many retries. Failing.`));
            } else {
              // Otherwise, try again
              this.log.error(`${baseMsg} Retrying.`);
              attempts++;
              this.tryAgain(e).then(() => {
                publish();
              });
            }
          }
        }
      };
      publish();
    });
  }

  // Reload in case of failure, but throttle after a little while
  protected async tryAgain(e: Error) {
    this._waiting = true;

    // If the connection is closed, just quit
    if (this.closed) {
      this.log.notice(`Connection closed while trying to be re-established. Honoring close.`);
      return;
    }

    // If we've reloaded too much too quickly, then move into a loop where reloads are spaced out
    // by 10 seconds.
    if (this.reloads > 5) {
      this.log.error(
        `MQ Connection or Channel reloaded too many times (${this.reloads}). ` +
          `Reason given: ${e && e.message ? e.message : '(none)'}. ` +
          `Slowing down retries.`,
      );
      setTimeout(async () => {
        this.log.warning(`Reloading MQ connection`);
        await this.connect();
        this.subscriptions.map((s) => this._subscribe(s));
      }, 10000);

      // Each time we try again, we reset the reload timer to 15 seconds, so that if we can
      // establish a stable connection for longer than 15 seconds, the reload counter goes back
      // to 0, giving us instant reloads the next time there's a problem.
      if (this.reloadTimer !== null) {
        clearTimeout(this.reloadTimer);
        this.reloadTimer = null;
      }
      this.reloadTimer = setTimeout(() => this.resetReloads(), 15000);
    } else {
      // If we've tried fewer than 5 times, then just try again immediately
      this.log.warning(`MQ Connection or Channel disconnected. Reloading....`);
      await this.connect();
      this.subscriptions.map((s) => this._subscribe(s));
    }
    this.reloads++;
  }

  private resetReloads() {
    this.reloads = 0;
    if (this.reloadTimer !== null) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
  }
}

/**
 * It will be common for projects to want to further specify their incoming and outgoing message
 * formats. However, doing so will be incompatible with the base PubSubInterface used by the
 * above class, and thus extending will not work.
 *
 * Following is an abstract adapter class allowing projects to define their message types more
 * specifically without having to do much work.
 *
 * You will generally extend this class and add `publish` and `subscribe` methods to accommodate
 * your desired pub-sub interface. These methods should use the underlying SimplePubSubAmqp class
 * provided by `this.driver` to do their actual work.
 *
 * @example
 *
 * ```ts
 * type MyActions = 'create' | 'update' | 'delete';
 *
 * type FooTypes = 'one' | 'two' | 'three';
 * type FooMsgs =
 *   | { domain: 'foo'; action: MyActions; resourceType: FooTypes; data: { foo: string } };
 *
 * type BarTypes = 'four' | 'five' | 'six';
 * type BarMsgs =
 *   | { domain: 'bar'; action: MyActions; resourceType: BarTypes; data: { bar: number } };
 *
 * type BazTypes = 'seven' | 'eight' | 'nine';
 * type BazMsgs =
 *   | { domain: 'baz'; action: MyActions; resourceType: BazTypes; data: { baz: boolean } };
 *
 * type MyMsgs = FooMsgs | BarMsgs | BazMsgs;
 *
 * // With this class, we greatly simplify and make more specific our pub-sub interface. We can do this because we're
 * // taking certain values (like the channel) up front (say, because you have only one exchange that you use for
 * // all MQ communication), and because we've defined our message types in a way that allows us to auto-generate
 * // publishing information about them (specifically, the routingKey).
 * //
 * // Now our publishing flow is greatly simplified and our subscription handlers can focus on simply processing the
 * // incoming data.
 * class MyFooPubSub extends AbstractPubSubAmqp<FooMsgs> {
 *   public constructor(protected channel: string, config: SimpleAmqpConfig, log: SimpleLoggerInterface, deps?: { retry?: Retry}) {
 *     super(config, log, deps);
 *   }
 *
 *   // Subscriptions have to handle messages from any domain, so the handler accepts messages of all our message types.
 *   public async subscribe(keys: Array<string>, handler: (msg: MyMsgs, log: SimpleLoggerInterface) => Promise<boolean>) {
 *     return this.driver.subscribe(
 *       { [this.channel]: keys },
 *       (msg, log) => {
 *         // Retry logic is already handled by our driver, so we just need to translate the message here
 *         const m: MyMsgs = JSON.parse(msg.content.toString('utf8'));
 *         return handler(m, log);
 *       },
 *       { queue: { name: 'foo-queue' } }
 *     );
 *   }
 *
 *   // However, you can only publish FooMsgs
 *   public async publish(msg: FooMsgs) {
 *     return this.driver.publish(this.channel, msg, { routingKey: `${msg.domain}.${msg.action}.${msg.resourceType}` });
 *   }
 * }
 *
 * ```
 */
export abstract class AbstractPubSubAmqp<PubMsgType = unknown> {
  private _driver: SimplePubSubAmqp<PubMsgType>;

  public constructor(
    protected config: SimpleAmqpConfig,
    protected log: SimpleLoggerInterface,
    deps?: {
      retry?: Retry;
      amqpConnect?: (url: string | SimpleAmqpConfig, socketOptions?: any) => Promise<SimpleAmqpConnection>;
    },
  ) {
    this._driver = new SimplePubSubAmqp<PubMsgType>(config, log, deps);
  }

  protected get driver() {
    return this._driver;
  }

  public get waiting() {
    return this.driver.waiting;
  }

  public async connect(): Promise<this> {
    return this.driver.connect().then(() => this);
  }

  public on(event: 'error', listener: (e: Error) => void): this;
  public on(event: 'connect', listener: () => void): this;
  public on(event: 'disconnect', listener: () => void): this;
  public on(event: 'connect' | 'disconnect' | 'error', listener: ((e: Error) => void) | (() => void)): this {
    this.driver.on(<any>event, listener);
    return this;
  }

  public once(event: 'error', listener: (e: Error) => void): this;
  public once(event: 'connect', listener: () => void): this;
  public once(event: 'disconnect', listener: () => void): this;
  public once(event: 'connect' | 'disconnect' | 'error', listener: ((e: Error) => void) | (() => void)): this {
    this.driver.once(<any>event, listener);
    return this;
  }

  public removeListener(event: 'connect' | 'disconnect' | 'error', listener: () => void): this {
    this.driver.removeListener(event, listener);
    return this;
  }

  public removeAllListeners(event?: 'connect' | 'disconnect' | 'error'): this {
    this.driver.removeAllListeners(event);
    return this;
  }

  public async close(): Promise<unknown> {
    return this.driver.close();
  }
}
