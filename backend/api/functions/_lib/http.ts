import type { ApiError } from '@cloudie/protocol';

/** A JSON error reply in the shape every client expects: `{ "error": "..." }`. */
export function error(status: number, message: string): Response {
  return Response.json({ error: message } satisfies ApiError, { status });
}
