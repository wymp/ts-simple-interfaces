Simple Interfaces for Typescript
===============================================================================

> 
> **NOTE:** This library is experimental right now and in active alpha development. While you may
> feel free to use it, it is expected to change considerably.
> 

## TL;DR

The "Simple" suite of packages should be considered a collection of interfaces (defined in this
package) along with a collection of concrete implementations (defined in other packages prefaced
with `simple-`) that allow you to write code that is highly portable and highly testable.

The idea is that your code should always use the _simple interfaces,_ for function argument types
and return types, and that you should then pass in the concrete implementations that you wish to
use.

For example, your application may require an HTTP client, like Axios or Request Promise Native.
To set your application up, you would type the variable holding the client as
`SimpleHttpClientInterface` and then set it to a concrete implementation, such as
`SimpleHttpClientAxios` from the
[`simple-http-client-axios` package](../ts-simple-http-client-axios):

```ts
// src/MyClient.ts
import { SimpleHttpClientInterface } from "ts-simple-interfaces";
import { SomeData } from "./Types";

export class MyClient {
  public constructor(protected httpClient: SimpleHttpClientInterface) { }

  public getSomeData() {
    return this.httpClient.request<SomeData>({
      //...
    });
  }
}

// --------------------------------------------------------------------

// src/index.ts
import { MyClient } from "./MyClient";
import { SimpleHttpClientAxios } from "simple-http-client-axios";

const axios = new SimpleHttpClientAxios();
const myClient = new MyClient(axios);

const data = myClient.getSomeData();
// ....
```


## Longer Overview

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


## TOC for Simple Suite of Packages

As mentioned in the TL;DR, the "simple" concept is actually a collection of repositories/packages.
For each interface defined, the goal is to create one or more "official" concrete implementations
based on current popular libraries.

>
> Because the Simple suite is still very much a work in progress, very few concrete implementations
> have been defined. However, as the interfaces stabilize and are used in production environments,
> the hope is to deliver more. Feel free to let me know about any concrete implementations that
> spring up in the wild....
>

Following is a list of implementations by interface:

### `SimpleHttpClientInterface`

* [`simple-http-client-rpn`](../ts-simple-http-client-rpn)
* [`simple-http-client-axios`](../ts-simple-http-client-axios)

### `SimpleLoggerInterface`

* [`simple-logger-winston`](../ts-simple-logger-winston)

### `SimpleSqlDbInterface`

* [`simple-db-mysql`](../ts-simple-db-mysql)


## Testing

One of the advantages of referencing these interfaces in your code is that you can use potentially
powerful pre-built testing mocks/spies/stubs that conform to them. At the time of this writing,
these are being developed [here](../ts-simple-interfaces-testing).

For example, you can instantiate a `SimpleMockSqlDb` that implements `SimpleSqlDbInterface` and
gives you the ability to easily analyze query requests and define responses.


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

