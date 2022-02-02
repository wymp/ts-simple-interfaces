import * as amqp from "amqplib";
import * as AmqpProps from "amqplib/properties";
import * as uuid from "uuid";
import {
  SimplePubSubInterface,
  SimplePubSubMessageInterface,
  SimpleLoggerInterface,
  TaggedLogger,
} from "@wymp/ts-simple-interfaces";
import { EventEmitter } from "events";

/**
 *
 *
 *
 *
 * AMQP-Specific Types
 *
 *
 *
 *
 */

export interface SimpleAmqpMessage extends SimplePubSubMessageInterface {
  content: Buffer;
  extra: {
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
}

export interface SubscriptionOptions {
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

export interface PublishOptions {
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

export interface Backoff {
  run(job: () => Promise<boolean>, log: SimpleLoggerInterface): Promise<boolean>;
}

/**
 * Private (internal) types
 */
declare type RoutingKey = string;
declare type Subscription = {
  routes: { [exchange: string]: Array<RoutingKey> };
  handler: (msg: SimpleAmqpMessage, log: SimpleLoggerInterface) => Promise<boolean>;
  options: SubscriptionOptions;
};
declare type SubscriptionQueue = Array<Subscription>;

/**
 *
 *
 *
 *
 *
 * Some AMQP definitions for purposes of improving testability
 *
 *
 *
 *
 *
 */

export interface SimpleAmqpConfig extends amqp.Options.Connect {}

export interface SimpleAmqpConnection {
  close(): Promise<void>;
  createChannel(): Promise<SimpleAmqpChannel>;
  on(ev: "error", handler: (e: Error) => void | unknown): unknown;
  on(ev: "close", handler: (e?: Error) => void | unknown): unknown;
}

export interface SimpleAmqpChannel {
  close(): Promise<void>;
  assertExchange(
    exchange: string,
    type: string,
    options?: AmqpProps.Options.AssertExchange
  ): Promise<AmqpProps.Replies.AssertExchange>;
  assertQueue(
    queue: string,
    options?: AmqpProps.Options.AssertQueue
  ): Promise<AmqpProps.Replies.AssertQueue>;
  bindQueue(
    queue: string,
    source: string,
    pattern: string,
    args?: any
  ): Promise<AmqpProps.Replies.Empty>;
  consume(
    queue: string,
    onMessage: (msg: AmqpProps.ConsumeMessage | null) => any,
    options?: AmqpProps.Options.Consume
  ): Promise<AmqpProps.Replies.Consume>;
  ack(message: AmqpProps.Message, allUpTo?: boolean): void;
  nack(message: AmqpProps.Message, allUpTo?: boolean, requeue?: boolean): void;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options?: AmqpProps.Options.Publish
  ): boolean;
  once(ev: "drain", handler: () => unknown): unknown;
  on(ev: "error", handler: (e: Error) => void | unknown): unknown;
  on(ev: "close", handler: (e?: Error) => void | unknown): unknown;
}

/**
 *
 *
 *
 *
 *
 * Main PubSub class
 *
 *
 *
 *
 *
 */
export class SimplePubSubAmqp
  implements
    SimplePubSubInterface<SimpleAmqpMessage, unknown, SubscriptionOptions, PublishOptions> {
  protected cnx: SimpleAmqpConnection | null = null;
  protected ch: SimpleAmqpChannel | null = null;
  protected subscriptions: SubscriptionQueue = [];
  protected _waiting: boolean = true;
  protected backoff: Backoff;
  protected emitter: EventEmitter;
  protected closed: boolean = false;
  private amqpConnect: (
    url: string | AmqpProps.Options.Connect,
    socketOptions?: any
  ) => Promise<SimpleAmqpConnection>;
  private reloads = 0;
  private reloadTimer: any = null;

  public constructor(
    protected config: SimpleAmqpConfig,
    protected log: SimpleLoggerInterface,
    deps?: {
      backoff?: Backoff;
      amqpConnect?: (
        url: string | AmqpProps.Options.Connect,
        socketOptions?: any
      ) => Promise<SimpleAmqpConnection>;
    }
  ) {
    // If we don't pass in a backoff mechanism, then wait 1 second before nacking failures
    this.backoff =
      deps && deps.backoff
        ? deps.backoff
        : {
            run: (j: () => Promise<boolean>, l: SimpleLoggerInterface): Promise<boolean> => {
              return new Promise(r => {
                j().then(result => {
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
    this.cnx.on("error", (e: Error) => {
      this.emitter.emit("error", e);
      this.tryAgain(e);
    });

    // Establish the channel failover
    this.ch = await this.cnx.createChannel();
    this.ch.on("error", (e: Error) => {
      this.emitter.emit("error", e);
      this.tryAgain(e);
    });
    this.ch.on("close", (e?: Error) => this.emitter.emit("disconnect", e));

    this.emitter.emit("connect");
    this._waiting = false;
    return this;
  }

  public on(event: "error", listener: (e: Error) => void): this;
  public on(event: "connect", listener: () => void): this;
  public on(event: "disconnect", listener: () => void): this;
  public on(
    event: "connect" | "disconnect" | "error",
    listener: ((e: Error) => void) | (() => void)
  ): this {
    this.emitter.on(event, listener);
    return this;
  }

  public once(event: "error", listener: (e: Error) => void): this;
  public once(event: "connect", listener: () => void): this;
  public once(event: "disconnect", listener: () => void): this;
  public once(
    event: "connect" | "disconnect" | "error",
    listener: ((e: Error) => void) | (() => void)
  ): this {
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

  public async close(): Promise<unknown> {
    this.closed = true;
    if (this.cnx) {
      await this.cnx.close();
    }
    return;
  }

  public subscribe(
    routes: Subscription["routes"],
    handler: Subscription["handler"],
    options: Subscription["options"]
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
      durable: typeof qopts.durable === "undefined" ? true : qopts.durable,
      autoDelete: qopts.autoDelete,
    });

    // Bind the queue to each exchange for the given routes
    const p: Array<Promise<unknown>> = [];
    for (let exchange in sub.routes) {
      this.log.info(`Asserting that exchange ${exchange} exists.`);
      const exopts =
        sub.options.exchanges && sub.options.exchanges[exchange]
          ? sub.options.exchanges[exchange]
          : {};
      p.push(
        this.ch!.assertExchange(exchange, exopts.type || "topic", {
          durable: typeof exopts.durable === "undefined" ? true : exopts.durable,
          internal: exopts.internal,
          autoDelete: exopts.autoDelete,
          alternateExchange: exopts.alternateExchange,
        }).then(() => {
          const q: Array<Promise<unknown>> = [];
          for (let binding of sub.routes[exchange]) {
            this.log.info(`Binding ${qopts.name} to ${exchange} with key ${binding}`);
            q.push(this.ch!.bindQueue(qopts.name, exchange, binding));
          }
          return Promise.all(q);
        })
      );
    }

    await Promise.all(p);

    // Now consume on the queue
    await this.ch!.consume(qopts.name, async msg => {
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

      const log = new TaggedLogger(
        `MQ: ${qopts.name}:${m.extra.messageId ? ` ${m.extra.messageId}:` : ``}`,
        this.log
      );

      log.debug(`Received message: ${m.content.toString("utf8")}`);
      const result = await this.backoff.run(() => sub.handler(m, log), log);

      if (result) {
        this.ch!.ack(msg);
      } else {
        this.ch!.nack(msg);
      }
    });
  }

  public async publish(channel: string, msg: unknown, options: PublishOptions): Promise<void> {
    // Fill in default options
    options.timestamp = options.timestamp || Date.now();
    options.messageId = options.messageId || uuid.v4();
    options.persistent = typeof options.persistent === "undefined" ? true : options.persistent;

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
                `Timed out after 10 seconds waiting to publish message. Something is wrong with the connection.`
              )
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
              Buffer.isBuffer(msg)
                ? msg
                : Buffer.from(typeof msg === "string" ? msg : JSON.stringify(msg), "utf8"),
              options
            );

            if (success) {
              res();
            } else {
              // If we return false, then the buffer is full. Try again after the 'drain' event
              this.ch!.once("drain", () => publish());
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
          `Reason given: ${e && e.message ? e.message : "(none)"}. ` +
          `Slowing down retries.`
      );
      setTimeout(async () => {
        this.log.warning(`Reloading MQ connection`);
        await this.connect();
        this.subscriptions.map(s => this._subscribe(s));
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
      this.subscriptions.map(s => this._subscribe(s));
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
 */
export abstract class AbstractPubSubAmqp {
  private _driver: SimplePubSubAmqp;

  public constructor(
    protected config: SimpleAmqpConfig,
    protected log: SimpleLoggerInterface,
    deps?: {
      backoff?: Backoff;
      amqpConnect?: (
        url: string | SimpleAmqpConfig,
        socketOptions?: any
      ) => Promise<SimpleAmqpConnection>;
    }
  ) {
    this._driver = new SimplePubSubAmqp(config, log, deps);
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

  public on(event: "error", listener: (e: Error) => void): this;
  public on(event: "connect", listener: () => void): this;
  public on(event: "disconnect", listener: () => void): this;
  public on(
    event: "connect" | "disconnect" | "error",
    listener: ((e: Error) => void) | (() => void)
  ): this {
    this.driver.on(<any>event, listener);
    return this;
  }

  public once(event: "error", listener: (e: Error) => void): this;
  public once(event: "connect", listener: () => void): this;
  public once(event: "disconnect", listener: () => void): this;
  public once(
    event: "connect" | "disconnect" | "error",
    listener: ((e: Error) => void) | (() => void)
  ): this {
    this.driver.once(<any>event, listener);
    return this;
  }

  public removeListener(event: "connect" | "disconnect" | "error", listener: () => void): this {
    this.driver.removeListener(event, listener);
    return this;
  }

  public removeAllListeners(event?: "connect" | "disconnect" | "error"): this {
    this.driver.removeAllListeners(event);
    return this;
  }

  public async close(): Promise<unknown> {
    return this.driver.close();
  }
}
