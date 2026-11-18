// Runs before every Function. One place for headers and for turning a thrown error into JSON.
import { error } from './_lib/http.ts';

export const onRequest: PagesFunction = async ({ next }) => {
  try {
    const res = await next();
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  } catch (err) {
    console.error(err);
    return error(500, 'Something went wrong');
  }
};
