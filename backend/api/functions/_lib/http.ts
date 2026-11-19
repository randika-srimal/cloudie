import type { ApiError } from '@engaging-assistant/protocol';

/** A JSON error reply in the shape every client expects: `{ "error": "..." }`. */
export function error(status: number, message: string): Response {
  return Response.json({ error: message } satisfies ApiError, { status });
}
