import * as amqp from "amqplib";
import {
  SimplePubSubInterface,
  SimpleSubscriptionInterface,
  SimpleSubscriptionMessageInterface
} from "ts-simple-interfaces";

export class SimplePubSubAmqp implements SimplePubSubInterface {
  public constructor(protected config: amqp.Options.Connect) {
  }
}
