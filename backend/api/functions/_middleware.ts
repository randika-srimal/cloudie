// Runs before every Function. One place for headers and for turning a thrown error into JSON.
import { error } from './_lib/http.ts';

export const onRequest: PagesFunction = async ({ next }) => {
  try {
    const res = await next();
    // A WebSocket upgrade (101) cannot be rebuilt without its socket and needs no content headers.
    if (res.status === 101 || res.webSocket) return res;
    // Copy, since responses from fetch() or service bindings have immutable headers.
    const out = new Response(res.body, res);
    out.headers.set('X-Content-Type-Options', 'nosniff');
    return out;
  } catch (err) {
    console.error(err);
    return error(500, 'Something went wrong');
  }
};
