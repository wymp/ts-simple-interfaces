# Simple PubSub, AMQP

_A Simple™-conformant wrapper for the AMQP PubSub Implementation_

**NOTE: As of v0.5.0 this project is now mantained by [Wymp](https://github.com/wymp) and the
package is published on github. Please use `@wymp/simple-pubsub-amqp` for future versions of
this package. (This will require setting up an `.npmrc` file at some level with the following line:
`@wymp:registry=https://npm.pkg.github.com/wymp`.)**

This package provides a light wrapper around amqplib that enforces conformity with the
`SimplePubSubInterface` defined in
[`ts-simple-interfaces`](https://github.com/wymp/ts-simple-interfaces/tree/current/packages/ts-simple-interfaces).
See that package for information about the interface.

This implementation provides for the definition of exchange and queue options via the optional
`options` argument supplied to the `subscribe` function. For publishing, you must first call the
`assertChannel` method, which is a pass-through to the underlying `assertExchange` method of
`amqplib` and accepts the same arguments.

