import "jest";
import { SimpleHttpClientAxios } from "../src";
import { SimpleHttpResponseInterface } from "ts-simple-interfaces";

test("Can get google.com", async () => {
  const client = new SimpleHttpClientAxios();
  const r: SimpleHttpResponseInterface = await client.request({ url: "https://google.com/" });
  expect(r.status).toBe(200);
  expect(r.data).not.toBeNull();
});
