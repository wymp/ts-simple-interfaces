import "jest";
import { SimpleHttpClientAxios } from "../src";
import { SimpleHttpResponseInterface } from "ts-simple-interfaces";

declare interface Todo {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

test("Can get API response", async () => {
  const client = new SimpleHttpClientAxios();
  const r: SimpleHttpResponseInterface = await client.request<Todo>({
    url: "https://jsonplaceholder.typicode.com/todos/1",
  });

  expect(r.status).toBe(200);
  expect(typeof r.data).toBe("object");
  expect(typeof r.data.id).toBe("number");
  expect(typeof r.data.userId).toBe("number");
  expect(typeof r.data.completed).toBe("boolean");
  expect(typeof r.data.title).toBe("string");
});
