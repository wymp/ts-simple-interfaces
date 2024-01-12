# Simple PubSub, AMQP

_A Simple™-conformant wrapper for the AMQP PubSub Implementation. "Simple" is intended to be a highly reduced interface
that allows for better interoperability and dependency choice for consumers._

This package provides a light wrapper around amqplib that enforces conformity with the `SimplePubSubInterface` defined
in [`ts-simple-interfaces`](https://github.com/wymp/ts-simple-interfaces/tree/current/packages/ts-simple-interfaces).
See that package for information about the interface.

This implementation provides for the definition of exchange and queue options via the optional `options` argument
supplied to the `subscribe` function. For publishing, you must first call the `assertChannel` method, which is a
pass-through to the underlying `assertExchange` method of `amqplib` and accepts the same arguments.
