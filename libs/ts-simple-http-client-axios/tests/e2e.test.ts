import { isHttpError } from '@wymp/ts-simple-interfaces/src/errors';
import { SimpleHttpClientAxios } from '../src';
import { MockSimpleLogger } from '@wymp/ts-simple-interfaces-testing';

const log = new MockSimpleLogger();

declare interface Todo {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

declare interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

describe(`SimpleHttpClientRequestFetch`, () => {
  test('Can get API response', async () => {
    const client = new SimpleHttpClientAxios();
    const r = await client.request<Todo>(
      {
        url: 'https://jsonplaceholder.typicode.com/todos/1',
      },
      log,
    );

    expect(r.status).toBe(200);
    expect(typeof r.data).toBe('object');
    expect(typeof r.data.id).toBe('number');
    expect(typeof r.data.userId).toBe('number');
    expect(typeof r.data.completed).toBe('boolean');
    expect(typeof r.data.title).toBe('string');
  });

  test('Can POST to an API', async () => {
    const client = new SimpleHttpClientAxios();
    const r = await client.request<Post>(
      {
        method: 'POST',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          userId: 1,
          title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
          body:
            'quia et suscipit\nsuscipit recusandae consequuntur expedita et ' +
            'cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet ' +
            'architecto',
        },
      },
      log,
    );

    expect(r.status).toBe(201);
    expect(typeof r.data).toBe('object');
    expect(typeof r.data.id).toBe('number');
    expect(typeof r.data.userId).toBe('number');
    expect(typeof r.data.title).toBe('string');
    expect(typeof r.data.body).toBe('string');
  });

  test('Throws a SimpleHttpClientRequestError on error response by default', async () => {
    expect.assertions(4);
    const client = new SimpleHttpClientAxios();
    return client
      .request<Todo>(
        {
          url: 'https://jsonplaceholder.typicode.com/todos/0',
        },
        log,
      )
      .catch((e) => {
        expect(isHttpError(e)).toBe(true);
        expect(e.message).toMatch(/404/);
        expect(typeof e.res).not.toBeUndefined();
        expect(e.res?.status).toBe(404);
      });
  });

  test('Returns error response when requested not to throw', async () => {
    const client = new SimpleHttpClientAxios();
    const res = await client.request<Todo>(
      {
        url: 'https://jsonplaceholder.typicode.com/todos/0',
        throwErrors: false,
      },
      log,
    );
    expect(res.status).toBe(404);
    // We would like for this to actually be undefined, since the response body is empty, but not sure how to get axios
    // to do that and don't care enough right now.
    expect(JSON.stringify(res.data)).toBe('{}');
  });
});
