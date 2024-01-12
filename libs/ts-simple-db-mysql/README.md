Simple Db, MySQL
=================================================================================================

_A Simple™-conformant wrapper around the `mysql2` library_

**NOTE: As of v0.5.0 this project is now mantained by [Wymp](https://github.com/wymp) and the
package is published on github. Please use `@wymp/simple-db-mysql` for future versions of this
package. (This will require setting up an `.npmrc` file at some level with the following line:
`@wymp:registry=https://npm.pkg.github.com/wymp`.)**

This package provides a light wrapper around mysql2 that enforces conformity
with the `SimpleSqlDbInterface` defined in
[`ts-simple-interfaces`](https://github.com/wymp/ts-simple-interfaces/tree/current/packages/ts-simple-interfaces).
See that package for information about the interface.

## Running Tests

You must have a mysql database server running somewhere on your system in order to run the tests.
It may be either a native install or a docker instance, and for convenience, a docker-compose file
is provided that establishes a database that works with the settings provided in the
`tests/config.example.json` file. To use that file, make sure docker is installed on your system
and simply run `docker compose -f tests/docker-compose.yml up -d`.

When you have a working database server up and running, copy `tests/config.example.json` over to
`tests/config.json` and adjust the values to match your database server.

Once that's all set up, you should be able to successfully run the tests using `npm t`.

