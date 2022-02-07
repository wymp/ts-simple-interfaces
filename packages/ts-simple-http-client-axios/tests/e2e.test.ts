import { SimpleHttpClientAxios } from "../src";
import { SimpleHttpClientResponseInterface } from "@wymp/ts-simple-interfaces";

declare interface Todo {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

describe("SimpleHttpClientAxios", () => {
  test("Can get API response", async () => {
    const client = new SimpleHttpClientAxios();
    const r: SimpleHttpClientResponseInterface = await client.request<Todo>({
      url: "https://jsonplaceholder.typicode.com/todos/1"
    });

    expect(r.status).toBe(200);
    expect(typeof r.data).toBe("object");
    expect(typeof r.data.id).toBe("number");
    expect(typeof r.data.userId).toBe("number");
    expect(typeof r.data.completed).toBe("boolean");
    expect(typeof r.data.title).toBe("string");
  });

  // TODO: This doesn't actually prove much. Need to try a test that will allow us to verify that
  // the header is properly aggregated
  test("Can get API response with array headers", async () => {
    const client = new SimpleHttpClientAxios();
    const r: SimpleHttpClientResponseInterface = await client.request<Todo>({
      url: "https://jsonplaceholder.typicode.com/todos/1",
      headers: {
        "X-Test": ["one", "two"]
      }
    });

    expect(r.status).toBe(200);
    expect(typeof r.data).toBe("object");
    expect(typeof r.data.id).toBe("number");
    expect(typeof r.data.userId).toBe("number");
    expect(typeof r.data.completed).toBe("boolean");
    expect(typeof r.data.title).toBe("string");
  });
});
