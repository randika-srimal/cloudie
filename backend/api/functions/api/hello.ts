// GET /api/hello: the hello-world route. Replace it with your own.
import type { Hello } from '@cloudie/protocol';

export const onRequestGet: PagesFunction = ({ request }) => {
  const colo = (request.cf?.colo as string | undefined) ?? 'local';
  const body: Hello = { message: 'Hello, world!', colo, at: new Date().toISOString() };
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
};
