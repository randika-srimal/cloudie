// The shapes the API sends and the web app (and tests) read, defined once with Zod.
// Add a schema here for every new route.
// zod/mini: the same schemas, tree-shakable, so the web bundle only carries what it uses.
import { z } from 'zod/mini';

/** GET /api/hello */
export const Hello = z.object({
  message: z.string(),
  /** Where the request was served from: a Cloudflare data center code (e.g. "SIN"), or "local". */
  colo: z.string(),
  /** ISO 8601 time the server answered. */
  at: z.iso.datetime(),
});
export type Hello = z.infer<typeof Hello>;

/** GET /api/health */
export const Health = z.object({
  ok: z.literal(true),
  version: z.string(),
});
export type Health = z.infer<typeof Health>;

/** Every error response: `{ "error": "..." }` with a 4xx or 5xx status. */
export const ApiError = z.object({ error: z.string() });
export type ApiError = z.infer<typeof ApiError>;
