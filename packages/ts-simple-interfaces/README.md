Simple Interfaces for Typescript
===============================================================================

> 
> **NOTE:** This library is experimental right now and in active alpha development.
> While you may feel free to use it, it is expected to change considerably.
> 

This library attempts to define a set of simplified interfaces for typescript that are compatible
with common tools in the ecosystem. Most of these tools are I/O-based, such as pub/subs (amqp),
relational databases (mysql, postgres), key-value stores (redis), and loggers (winston), but
technically any complex tool is fair game for a simplified interface. 

The problem is that many of these tools have unnecessarily complex native interfaces that make
them problematic for testing and portability. For example, Winston is a wonderful logger, but
its `LoggerInterface` defines a bunch of methods that are not very useful to the average user,
and furthermore extends `NodeJSStream.Transport`, yielding a final interface that defines over
40 methods that have little to do with logging messages. Thus, incorporating these interfaces
into your code unnecessarily expands the contracts that your code uses, making your applications
less flexible, more difficult to test, and more difficult to migrate to new technologies.

Another issue is that Winston's `LoggerInterface` is defined in the library itself, meaning that
if you want to use that `LoggerInterface`, you have to depend on the whole Winston package. This
isn't technically a huge deal, but it also tends to hamper the responsible specification of
general interfaces that are independent of any single project.

As an added convenience, this library attempts to define useful test classes that implement these
interfaces, such that you can simply instantiate them in your unit tests and gain functionality
that's immediately useful to unit testing. For example, you can instantiate a `SimpleMockSqlDb`
that implements `SimpleSqlDbInterface` and gives you the ability to easily analyze query requests
and define responses.

(Note that the testing classes indicated above are being developed
[here](https://github.com/kael-shipman/ts-simple-interfaces/tree/master/packages/ts-simple-interfaces-testing)
and may not be usable yet. PRs welcome.)


## Usage

To use this library, just list it as a dependency[1] and then define classes that implement
these interfaces. For example:

```ts
// src/MyDatasource.ts
import { SimpleDatasourceInterface } from "simple-interfaces";

export class MyDatasource implements SimpleDataInterface {
  ....
}
```


## API

The best way to understand the API is by just looking at the declarations file
[here](https://github.com/kael-shipman/ts-simple-interfaces/blob/master/packages/ts-simple-interfaces/src/index.ts).


## Footnotes

[1] Note that this library should be included as a proper dependency, not a dev dependency,
because it may define enums that actually compile down to javascript that your project uses
at runtime.

