// /api/access: the chat page's password gate, like the HubSpot password page it replaces.
// GET tells the page whether this browser has entered the password (a valid chat_access cookie).
// POST { password } checks it against the CHAT_PASSWORD secret and sets the cookie for 7 days. The /agents
// proxy refuses every chat request without that cookie, so the password protects the assistant itself, not
// only the page. Attempts are limited to 5 a minute per IP (UNLOCK_LIMIT on the agent Worker, over RPC).
import { AccessRequest, type AccessStatus } from '@engaging-assistant/protocol';
import type { Env } from '../_lib/env.ts';
import {
  accessCookie,
  checkOrigin,
  parseOrigins,
  passwordMatches,
  readCookie,
  signAccess,
  verifyAccess,
} from '../_lib/guards.ts';
import { error } from '../_lib/http.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unlocked = await verifyAccess(
    readCookie(request, 'chat_access'),
    env.PASS_SECRET,
    env.CHAT_PASSWORD,
    Date.now(),
  );
  return Response.json({ unlocked } satisfies AccessStatus, { headers: NO_STORE });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Only the chat page itself may submit the password (no login from other sites).
  if (!checkOrigin(request, parseOrigins(env.ALLOWED_ORIGINS))) return error(403, 'Forbidden');
  if (!env.CHAT_PASSWORD) return error(503, 'The chat password is not set');

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await env.AGENT.allowUnlock(ip))) return error(429, 'Too many attempts. Wait a minute.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, 'Send JSON: { "password": "..." }');
  }
  const parsed = AccessRequest.safeParse(body);
  if (!parsed.success) return error(400, 'Enter the password');
  if (!(await passwordMatches(parsed.data.password, env.CHAT_PASSWORD)))
    return error(401, 'Wrong password');

  const value = await signAccess(env.PASS_SECRET, env.CHAT_PASSWORD, Date.now());
  return Response.json({ unlocked: true } satisfies AccessStatus, {
    headers: { ...NO_STORE, 'Set-Cookie': accessCookie(value) },
  });
};
