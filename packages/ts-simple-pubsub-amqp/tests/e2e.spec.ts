import { SimplePubSubAmqp, MockAmqpCnx } from "../src";
import { SimplePubSubMessageInterface, SimpleLoggerInterface } from "@wymp/ts-simple-interfaces";
import { MockSimpleLogger } from "@wymp/ts-simple-interfaces-testing";
import { EventEmitter } from "events";
//import * as sinon from "sinon";

describe("SimplePubSubAmqp", () => {
  let mockCnx: MockAmqpCnx;
  let log: MockSimpleLogger;
  let amqpConnect = (opts: unknown) => {
    log.debug(`Returning connection`);
    return Promise.resolve(mockCnx);
  };

  beforeEach(() => {
    log = new MockSimpleLogger({ outputMessages: false });
    mockCnx = new MockAmqpCnx(log);
  });

  afterEach(() => {
    log.setOpt("outputMessages", false);
  });

  test("Sets up simple subscriptions correctly via amqp", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    ps.connect();
    await ps.subscribe(
      {
        "my-exchange": ["*.*.*"],
        "your-exchange": ["some.*.data", "other.*.*"],
      },
      (msg: SimplePubSubMessageInterface, log: SimpleLoggerInterface) => {
        return Promise.resolve(true);
      },
      { queue: { name: "my-queue" } }
    );

    expect(mockCnx.channel!.calls.assertQueue).toBeDefined();
    expect(mockCnx.channel!.calls.assertQueue.length).toBe(1);
    expect(mockCnx.channel!.calls.assertQueue[0][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.assertQueue[0][1]).toBeDefined();
    expect(mockCnx.channel!.calls.assertQueue[0][1].exclusive).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertQueue[0][1].durable).toBe(true);
    expect(mockCnx.channel!.calls.assertQueue[0][1].autoDelete).not.toBeDefined();

    expect(mockCnx.channel!.calls.assertExchange).toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange.length).toBe(2);
    expect(mockCnx.channel!.calls.assertExchange[0][0]).toBe("my-exchange");
    expect(mockCnx.channel!.calls.assertExchange[0][1]).toBe("topic");
    expect(mockCnx.channel!.calls.assertExchange[0][2]).toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[0][2].durable).toBe(true);
    expect(mockCnx.channel!.calls.assertExchange[0][2].internal).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[0][2].autoDelete).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[0][2].alternateExchange).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[1][0]).toBe("your-exchange");
    expect(mockCnx.channel!.calls.assertExchange[1][1]).toBe("topic");
    expect(mockCnx.channel!.calls.assertExchange[1][2]).toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[1][2].durable).toBe(true);
    expect(mockCnx.channel!.calls.assertExchange[1][2].internal).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[1][2].autoDelete).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[1][2].alternateExchange).not.toBeDefined();

    expect(mockCnx.channel!.calls.bindQueue).toBeDefined();
    expect(mockCnx.channel!.calls.bindQueue.length).toBe(3);
    expect(mockCnx.channel!.calls.bindQueue[0][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.bindQueue[0][1]).toBe("my-exchange");
    expect(mockCnx.channel!.calls.bindQueue[0][2]).toBe("*.*.*");
    expect(mockCnx.channel!.calls.bindQueue[1][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.bindQueue[1][1]).toBe("your-exchange");
    expect(mockCnx.channel!.calls.bindQueue[1][2]).toBe("some.*.data");
    expect(mockCnx.channel!.calls.bindQueue[2][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.bindQueue[2][1]).toBe("your-exchange");
    expect(mockCnx.channel!.calls.bindQueue[2][2]).toBe("other.*.*");
  });

  test("Sets up complex subscriptions correctly via amqp", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    ps.connect();
    await ps.subscribe(
      {
        "my-exchange": ["*.*.*"],
        "your-exchange": ["some.*.data", "other.*.*"],
      },
      (msg: SimplePubSubMessageInterface, log: SimpleLoggerInterface) => {
        return Promise.resolve(true);
      },
      {
        queue: {
          name: "my-queue",
          durable: false,
          exclusive: true,
          autoDelete: true,
        },
        exchanges: {
          "my-exchange": {
            type: "fanout",
            durable: false,
            internal: true,
            autoDelete: true,
            alternateExchange: "your-exchange",
          },
        },
      }
    );

    expect(mockCnx.channel!.calls.assertQueue).toBeDefined();
    expect(mockCnx.channel!.calls.assertQueue.length).toBe(1);
    expect(mockCnx.channel!.calls.assertQueue[0][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.assertQueue[0][1]).toBeDefined();
    expect(mockCnx.channel!.calls.assertQueue[0][1].exclusive).toBe(true);
    expect(mockCnx.channel!.calls.assertQueue[0][1].durable).toBe(false);
    expect(mockCnx.channel!.calls.assertQueue[0][1].autoDelete).toBe(true);

    expect(mockCnx.channel!.calls.assertExchange).toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange.length).toBe(2);
    expect(mockCnx.channel!.calls.assertExchange[0][0]).toBe("my-exchange");
    expect(mockCnx.channel!.calls.assertExchange[0][1]).toBe("fanout");
    expect(mockCnx.channel!.calls.assertExchange[0][2]).toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[0][2].durable).toBe(false);
    expect(mockCnx.channel!.calls.assertExchange[0][2].internal).toBe(true);
    expect(mockCnx.channel!.calls.assertExchange[0][2].autoDelete).toBe(true);
    expect(mockCnx.channel!.calls.assertExchange[0][2].alternateExchange).toBe("your-exchange");
    expect(mockCnx.channel!.calls.assertExchange[1][0]).toBe("your-exchange");
    expect(mockCnx.channel!.calls.assertExchange[1][1]).toBe("topic");
    expect(mockCnx.channel!.calls.assertExchange[1][2]).toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[1][2].durable).toBe(true);
    expect(mockCnx.channel!.calls.assertExchange[1][2].internal).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[1][2].autoDelete).not.toBeDefined();
    expect(mockCnx.channel!.calls.assertExchange[1][2].alternateExchange).not.toBeDefined();

    expect(mockCnx.channel!.calls.bindQueue).toBeDefined();
    expect(mockCnx.channel!.calls.bindQueue.length).toBe(3);
    expect(mockCnx.channel!.calls.bindQueue[0][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.bindQueue[0][1]).toBe("my-exchange");
    expect(mockCnx.channel!.calls.bindQueue[0][2]).toBe("*.*.*");
    expect(mockCnx.channel!.calls.bindQueue[1][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.bindQueue[1][1]).toBe("your-exchange");
    expect(mockCnx.channel!.calls.bindQueue[1][2]).toBe("some.*.data");
    expect(mockCnx.channel!.calls.bindQueue[2][0]).toBe("my-queue");
    expect(mockCnx.channel!.calls.bindQueue[2][1]).toBe("your-exchange");
    expect(mockCnx.channel!.calls.bindQueue[2][2]).toBe("other.*.*");
  });

  test("handles basic publish correctly", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    ps.connect();

    const msg = { my: "message", num: 1 };
    await ps.publish(`my-exchange`, msg, { routingKey: "message.created" });

    expect(mockCnx.channel!.calls.publish).toBeDefined();
    expect(mockCnx.channel!.calls.publish.length).toBe(1);
    expect(mockCnx.channel!.calls.publish[0][0]).toBe("my-exchange");
    expect(mockCnx.channel!.calls.publish[0][1]).toBe("message.created");
    expect(mockCnx.channel!.calls.publish[0][2].toString("utf8")).toBe(JSON.stringify(msg));
    expect(mockCnx.channel!.calls.publish[0][3]).toBeDefined();
    expect(mockCnx.channel!.calls.publish[0][3].appId).not.toBeDefined();
    expect(mockCnx.channel!.calls.publish[0][3].type).not.toBeDefined();
    expect(typeof mockCnx.channel!.calls.publish[0][3].timestamp).toBe("number");
    expect(typeof mockCnx.channel!.calls.publish[0][3].messageId).toBe("string");
    expect(mockCnx.channel!.calls.publish[0][3].headers).not.toBeDefined();
    expect(mockCnx.channel!.calls.publish[0][3].contentEncoding).not.toBeDefined();
    expect(mockCnx.channel!.calls.publish[0][3].contentType).not.toBeDefined();
    expect(mockCnx.channel!.calls.publish[0][3].expiration).not.toBeDefined();
    expect(mockCnx.channel!.calls.publish[0][3].persistent).toBe(true);
  });

  test("handles complex publish correctly", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    ps.connect();

    const msg = { my: "message", num: 1 };
    await ps.publish(`my-exchange`, msg, {
      routingKey: "message.created",
      appId: "my-app",
      type: "some-type",
      timestamp: 12345,
      messageId: "my-message",
      headers: { one: 1 },
      contentEncoding: "utf8",
      contentType: "application/json",
      expiration: 67890,
      persistent: false,
    });

    expect(mockCnx.channel!.calls.publish).toBeDefined();
    expect(mockCnx.channel!.calls.publish.length).toBe(1);
    expect(mockCnx.channel!.calls.publish[0][0]).toBe("my-exchange");
    expect(mockCnx.channel!.calls.publish[0][1]).toBe("message.created");
    expect(mockCnx.channel!.calls.publish[0][2].toString("utf8")).toBe(JSON.stringify(msg));
    expect(mockCnx.channel!.calls.publish[0][3]).toBeDefined();
    expect(mockCnx.channel!.calls.publish[0][3].appId).toBe("my-app");
    expect(mockCnx.channel!.calls.publish[0][3].type).toBe("some-type");
    expect(mockCnx.channel!.calls.publish[0][3].timestamp).toBe(12345);
    expect(mockCnx.channel!.calls.publish[0][3].messageId).toBe("my-message");
    expect(JSON.stringify(mockCnx.channel!.calls.publish[0][3].headers)).toBe(
      JSON.stringify({ one: 1 })
    );
    expect(mockCnx.channel!.calls.publish[0][3].contentEncoding).toBe("utf8");
    expect(mockCnx.channel!.calls.publish[0][3].contentType).toBe("application/json");
    expect(mockCnx.channel!.calls.publish[0][3].expiration).toBe(67890);
    expect(mockCnx.channel!.calls.publish[0][3].persistent).toBe(false);
  });

  test("handles connection delays correctly", async () => {
    mockCnx.manualResolve = true;
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    ps.connect();
    const p = ps.subscribe(
      { "my-exchange": ["*.*.*"] },
      (msg: SimplePubSubMessageInterface, log: SimpleLoggerInterface) => {
        return Promise.resolve(true);
      },
      { queue: { name: "my-queue" } }
    );

    // Wait a bit and make sure no calls are made
    await new Promise(res => setTimeout(() => res(), 800));
    expect(mockCnx.channel!.calls.assertQueue).not.toBeDefined();

    // Now resolve and check again
    mockCnx.resolve();
    await p;
    expect(mockCnx.channel!.calls.assertQueue).toBeDefined();
  });

  test("rebinds everything on connection and channel errors", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    // Set up error handling
    ps.on("error", (e: Error) => {
      log.debug(`Got error: ${e.message}`);
    });

    ps.connect();
    await ps.subscribe(
      { "my-exchange": ["*.*.*"] },
      (msg: SimplePubSubMessageInterface, log: SimpleLoggerInterface) => {
        return Promise.resolve(true);
      },
      { queue: { name: "my-queue" } }
    );
    expect(mockCnx.channel!.calls.assertQueue).toBeDefined();
    expect(mockCnx.channel!.calls.assertQueue.length).toBe(1);

    // Capture this channel for later comparison
    const ch1 = mockCnx.channel!;

    // Now throw an error and wait a minute and make sure assert queue was called again
    mockCnx.triggerError(new Error(`Something happened`));
    await new Promise(res => setTimeout(() => res(), 800));
    expect(mockCnx.channel!.calls.assertQueue.length).toBe(1);
    expect(mockCnx.channel!.index).not.toBe(ch1.index);
  });

  test("rebinds and retries on error during publish", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    // Set up error handling
    ps.on("error", (e: Error) => {
      log.debug(`Got error: ${e.message}`);
    });

    // Connect and then grab the channel
    await ps.connect();
    const ch = mockCnx.channel!;

    // Set the channel up to throw some errors on the next publish
    ch.publishReturnValueQueue = [
      new Error("Channel error!"),
      new Error("Another channel error!"),
      new Error("A third channel error!"),
      true,
    ];

    // Now try to publish
    const msg = { my: "message", num: 1 };
    await expect(
      ps.publish(`my-exchange`, msg, { routingKey: "message.created" })
    ).resolves.toBeUndefined();
    expect(mockCnx.channel!.index).not.toBe(ch.index);
  });

  test("runs handlers through backoff (and nacks unsuccessfully run handlers)", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    // Connect and subscribe
    ps.connect();
    await ps.subscribe(
      {
        "my-exchange": ["*.*.*"],
        "your-exchange": ["some.*.data", "other.*.*"],
      },
      (msg: SimplePubSubMessageInterface, log: SimpleLoggerInterface) => {
        return Promise.resolve(false);
      },
      { queue: { name: "my-queue" } }
    );

    // Produce a message
    mockCnx.channel!.produceMessage("my-queue", JSON.stringify({ one: 1 }));

    // Should wait one second to nack
    expect(mockCnx.channel!.calls.nack).not.toBeDefined();
    await new Promise(res => setTimeout(() => res(), 1010));
    expect(mockCnx.channel!.calls.nack).toBeDefined();
    expect(mockCnx.channel!.calls.nack.length).toBe(1);
  });

  test("acks successfully-run handlers", async () => {
    const ps = new SimplePubSubAmqp({}, log, { amqpConnect });

    // Connect and subscribe
    ps.connect();
    await ps.subscribe(
      {
        "my-exchange": ["*.*.*"],
        "your-exchange": ["some.*.data", "other.*.*"],
      },
      (msg: SimplePubSubMessageInterface, log: SimpleLoggerInterface) => {
        return Promise.resolve(true);
      },
      { queue: { name: "my-queue" } }
    );

    // Produce a message
    mockCnx.channel!.produceMessage("my-queue", JSON.stringify({ one: 1 }));

    // Should have acked
    await new Promise(res => setTimeout(() => res(), 50));
    expect(mockCnx.channel!.calls.ack).toBeDefined();
    expect(mockCnx.channel!.calls.ack.length).toBe(1);
  });
});
