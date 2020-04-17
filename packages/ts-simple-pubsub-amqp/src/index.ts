import * as amqp from "amqplib";
import * as uuid from "uuid/v4";
import {
  SimplePubSubInterface,
  SimplePubSubMessageInterface,
  SimpleLoggerInterface,
  TaggedLogger,
} from "ts-simple-interfaces";
import { EventEmitter } from "events";

declare type RoutingKey = string;

/**
 * An AMQP message returns a bunch of additional properties in the `extra` key
 */
export interface SimpleAmqpMessage extends SimplePubSubMessageInterface {
  content: Buffer;
  extra: {
    exchange: string;
    routingKey: string;
    redelivered: boolean;
    appId?: string;
    type?: string;
    timestamp?: number;
    messageId?: string;
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
  exchange?: {
    type?: string;
    durable?: boolean;
    internal?: boolean;
    autoDelete?: boolean;
    alternateExchange?: string;
  };
  [k: string]: unknown;
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
  [k: string]: unknown;
}

export interface Backoff {
  run(job: () => Promise<boolean>, log: SimpleLoggerInterface): Promise<boolean>;
}

declare type Subscription = {
  routes: { [exchange: string]: Array<RoutingKey> };
  handler: (msg: SimplePubSubMessageInterface, log: SimpleLoggerInterface) => Promise<boolean>;
  options: SubscriptionOptions;
};
declare type SubscriptionQueue = Array<Subscription>;

/**
 * PubSub class
 */
export class SimplePubSubAmqp implements SimplePubSubInterface {
  protected cnx: amqp.Connection | null = null;
  protected ch: amqp.Channel | null = null;
  protected subscriptions: SubscriptionQueue = [];
  protected waiting: boolean = true;
  protected backoff: Backoff;
  protected emitter: EventEmitter;
  protected closed: boolean = false;
  private reloads = 0;
  private reloadTimer: any = null;

  public constructor(
    protected config: amqp.Options.Connect,
    protected log: SimpleLoggerInterface,
    backoff?: Backoff
  ) {
    // If we don't pass in a backoff mechanism, then wait 1 second before nacking failures
    this.backoff = backoff || {
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

    this.emitter = new EventEmitter();
  }

  public async connect(): Promise<void> {
    // Establish the connection and failover
    this.cnx = await amqp.connect(this.config);
    this.cnx.on("error", (e: Error) => this.tryAgain(e));

    // Establish the channel failover
    this.ch = await this.cnx.createChannel();
    this.ch.on("error", (e: Error) => this.tryAgain(e));
    this.waiting = false;
  }

  public on(event: "connect", listener: () => void): this;
  public on(event: "disconnect", listener: () => void): this;
  public on(event: "error", listener: (e: Error) => void): this;
  // Requiring the 'e' parameter here is INCORRECT, but for some reason tsc is requiring it....
  public on(event: "connect" | "disconnect" | "error", listener: (e: Error) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  public removeListener(event: "receive" | "disconnect" | "error", listener: () => void): this {
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
  ): this {
    const sub = { routes, handler, options };
    this.subscriptions.push(sub);
    const subscribe = () => {
      if (!this.waiting) {
        this._subscribe(sub);
      } else {
        setTimeout(subscribe, 500);
      }
    };
    subscribe();
    return this;
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
      const exopts = sub.options.exchange || {};
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
        `MQ: ${qopts.name}: ${m.extra.messageId ? `${m.extra.messageId}: ` : ``}`,
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
    return new Promise((res, rej) => {
      const timeout = 10000;
      let elapsed = 0;
      const publish = () => {
        if (this.waiting) {
          if (elapsed > timeout) {
            rej(
              new Error(
                `Timed out after 10 seconds waiting to publish message. Something is wrong.`
              )
            );
          } else {
            elapsed += 500;
            setTimeout(publish, 500);
          }
        } else {
          const doit = () => {
            return this.ch!.publish(
              channel,
              options.routingKey,
              Buffer.isBuffer(msg)
                ? msg
                : Buffer.from(typeof msg === "string" ? msg : JSON.stringify(msg), "utf8"),
              {
                appId: options.appId,
                type: options.type,
                timestamp: options.timestamp || Date.now(),
                messageId: options.messageId || uuid(),
                headers: options.headers,
                contentEncoding: options.contentEncoding,
                contentType: options.contentType,
                expiration: options.expiration,
                persistent: typeof options.persistent === "undefined" ? true : options.persistent,
              }
            );
          };

          if (doit()) {
            res();
          } else {
            this.ch!.once("drain", () => {
              if (doit()) {
                res();
              } else {
                rej(new Error(`Can't publish message to full buffer. Tried twice.`));
              }
            });
          }
        }
      };
      publish();
    });
  }

  // Reload in case of failure, but throttle after a little while
  protected async tryAgain(e: Error) {
    this.waiting = true;

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
