// GET /api/health: answers when the Functions are up. `./cli.sh health` calls it.
// When you add a database, check it here too (e.g. SELECT 1), so a broken binding shows up.
import type { Health } from '@cloudie/protocol';
import type { Env } from '../_lib/env.ts';

export const onRequestGet: PagesFunction<Env> = ({ env }) => {
  const body: Health = { ok: true, version: env.APP_VERSION };
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
};
