Simple Logger, Winston
==================================================================================================================

_A Simple™-conformant wrapper around winston logger. "Simple" is intended to be a highly reduced interface that allows
for better interoperability and dependency choice for consumers._

**NOTE: While this package is still alive and well, you should consider using
[`@wymp/simple-logger-console`](https://npmjs.com/package/@wymp/simple-logger-console) instead, as the features of
Winston are largely irrelevant in a modern containerized environment.**

This package provides a light wrapper around the winston logger that enforces conformity
with the `SimpleLoggerInterface` defined in
[`ts-simple-interfaces`](https://npmjs.com/packages/@wymp/ts-simple-interfaces).
