import "jest";
import { SimpleHttpServerExpress, Parsers } from "../src";
import { MockSimpleLogger } from "@wymp/ts-simple-interfaces-testing";
import { SimpleHttpClientRpn } from "simple-http-client-rpn";

describe("End-To-End Tests", () => {
  describe("SimpleHttpServerExpress", () => {
    const request = new SimpleHttpClientRpn();
    let instances: Array<{ close: () => unknown }>;

    beforeEach(() => {
      instances = [];
    });

    afterEach(() => {
      instances.map((i) => i.close());
    });

    test("should respond to basic GET calls", async () => {
      const srv = new SimpleHttpServerExpress({ listeners: [[3210, "localhost"]] }, new MockSimpleLogger());

      srv.get("/test/:path1/:path2", (req, res, next) => {
        res.status(201).send({
          path: req.path,
          params: req.params,
          query: req.query,

          // This just tests that the type of req.query is 'any' and not 'unknown'
          typeTest: req.query.typeTest ? true : false,

          // This should fail type-checking if uncommented
          //pathTest: req.params.path3,
        });
      });

      // Start the server
      await new Promise((res, rej) => {
        instances = srv.listen((listener) => res());
      });

      const res = await request.request<{
        path: string;
        params: any;
        query: any;
        typeTest: boolean;
      }>({
        baseURL: "http://localhost:3210",
        url: "/test/my/path?q=2&r=3",
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty("path");
      expect(res.data).toHaveProperty("params");
      expect(res.data).toHaveProperty("query");
      expect(res.data).toHaveProperty("typeTest");

      expect(res.data.path).toBe("/test/my/path");
      expect(JSON.stringify(res.data.params)).toBe(JSON.stringify({ path1: "my", path2: "path" }));
      expect(JSON.stringify(res.data.query)).toBe(JSON.stringify({ q: "2", r: "3" }));
    });

    test("should respond to basic POST requests", async () => {
      const srv = new SimpleHttpServerExpress(
        { listeners: [[3210, "localhost"]] },
        new MockSimpleLogger({ outputMessages: false }),
      );

      // Parse json requests
      srv.use(Parsers.json());

      // Handle the test endpoint
      srv.post("/test/:path1/:path2", (req, res, next) => {
        try {
          res.status(201).send({
            path: req.path,
            params: req.params,
            query: req.query,
            body: req.body,

            // These are just to make sure we don't get type errors
            typeTest: req.query.typeTest ? true : false,
            typeTest2: req.body.something === "else" ? true : false,

            // These should fail type-checking if uncommented
            //pathTest: req.params.path3,
            //bodyTest: req.body.otherThing,
          });
        } catch (e) {
          res.status(500).send({ error: e.message });
        }
      });

      // Start the server
      await new Promise((res, rej) => {
        instances = srv.listen((listener) => res());
      });

      const res = await request.request<{
        path: string;
        params: any;
        query: any;
        body: any;
        typeTest: boolean;
        typeTest2: boolean;
      }>({
        method: "post",
        baseURL: "http://localhost:3210",
        url: "/test/my/path?q=2&r=3",
        data: {
          something: "whiney",
          tasty: true,
        },
      });

      expect(JSON.stringify(res.data)).not.toContain("error");
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty("path");
      expect(res.data).toHaveProperty("params");
      expect(res.data).toHaveProperty("query");
      expect(res.data).toHaveProperty("body");
      expect(res.data).toHaveProperty("typeTest");
      expect(res.data).toHaveProperty("typeTest2");

      expect(res.data.path).toBe("/test/my/path");
      expect(JSON.stringify(res.data.params)).toBe(JSON.stringify({ path1: "my", path2: "path" }));
      expect(JSON.stringify(res.data.query)).toBe(JSON.stringify({ q: "2", r: "3" }));
      expect(JSON.stringify(res.data.body)).toBe(JSON.stringify({ something: "whiney", tasty: true }));
    });

    test("should properly handle errors on error handler registration", async () => {
      const log = new MockSimpleLogger({ outputMessages: false });
      const srv = new SimpleHttpServerExpress({ listeners: [[3210, "localhost"]] }, log);

      srv.post("/test/:path1/:path2", (req, res, next) => {
        log.notice(`Param: ${req.params.path1}`);
        log.notice(`Query: ${req.query.q}`);
        log.notice(`Body: ${req.body.something}`);
        next(new Error("This is a test error that should be caught"));
      });
      srv.catch((e, req, res, next) => {
        log.error(`Error: ${e.message}`);
        res.status(500).send({
          error: {
            message: e.message,
          },
        });
      });

      // Start the server
      await new Promise((res, rej) => {
        instances = srv.listen((listener) => res());
      });

      const res = await request.request<{ error: { message: string } }>({
        method: "post",
        baseURL: "http://localhost:3210",
        url: "/test/my/path?q=2&r=3",
        data: {
          something: "whiney",
          tasty: true,
        },
      });

      expect(JSON.stringify(res.data)).toContain('"error":');
      expect(res.status).toBe(500);
      expect(res.data).toHaveProperty("error");
      expect(res.data.error).toHaveProperty("message");
    });
  });
});
