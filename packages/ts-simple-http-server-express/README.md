# Simple HTTP Server, Express

_A Simple™-conformant wrapper around ExpressJS_

> 
> **NOTE:** This library is experimental right now and in active alpha development. While you may
> feel free to use it, it is expected to change considerably.
> 

This package provides a light wrapper around ExpressJS that enforces conformity with the
`SimpleHttpServerInterface` defined in
[`ts-simple-interfaces`](https://github.com/kael-shipman/ts-simple-interfaces/tree/master/packages/ts-simple-interfaces).

See that package for information about the interface.

At the time of this writing, this package is not meant to be a fully-functional, do-it-all web
service framework. To the contrary, it is meant to be a pared down, simplified building block
that _just_ does routing and listening. It may grow to be more in the future, but for now, the goal
is that it remain Simple.

