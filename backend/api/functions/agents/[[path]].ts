// /agents/*: the guarded proxy from the chat page to the agent Worker (cloudie-agent, the AGENT service
// binding). The chat page's URL is public, so every request (WebSocket upgrade, or the Agents SDK's HTTP
// GET/POST) must pass, in order: path, Origin, connect limit, then a chat_pass cookie or a Turnstile token.
import type { Env } from '../_lib/env.ts';
import {
  checkOrigin,
  PASS_SECONDS,
  originHostnames,
  parseOrigins,
  readCookie,
  signPass,
  verifyPass,
  verifyTurnstile,
} from '../_lib/guards.ts';
import { error } from '../_lib/http.ts';

const PREFIX = '/agents/sales-agent/';

/** Copies `res` with an extra Set-Cookie. A 101 upgrade must be rebuilt around its WebSocket. */
function withCookie(res: Response, cookie: string): Response {
  const headers = new Headers(res.headers);
  headers.append('Set-Cookie', cookie);
  if (res.status === 101)
    return new Response(null, { status: 101, webSocket: res.webSocket, headers });
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(PREFIX)) return error(404, 'Not found');
  const origins = parseOrigins(env.ALLOWED_ORIGINS);
  if (!checkOrigin(request, origins)) return error(403, 'Forbidden');

  // Cloudflare sets cf-connecting-ip itself in production, so clients cannot choose their key.
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await env.AGENT.allowConnect(ip))) return error(429, 'Too many connections');

  const now = Date.now();
  const token = url.searchParams.get('cf_turnstile');
  url.searchParams.delete('cf_turnstile'); // tokens stay out of the agent's URLs and logs
  let setCookie: string | undefined;
  if (!(await verifyPass(readCookie(request, 'chat_pass'), env.PASS_SECRET, now))) {
    if (
      !token ||
      !(await verifyTurnstile(token, env.TURNSTILE_SECRET, ip, fetch, originHostnames(origins)))
    ) {
      return error(401, 'Verification required');
    }
    const pass = await signPass(env.PASS_SECRET, now);
    setCookie = `chat_pass=${pass}; Path=/agents; Secure; HttpOnly; SameSite=None; Partitioned; Max-Age=${PASS_SECONDS}`;
  }

  // The original request (method, body, Upgrade and cf-connecting-ip intact), minus the token and cookies.
  const forward = new Request(url, request);
  forward.headers.delete('Cookie');
  const res = await env.AGENT.fetch(forward);
  return setCookie ? withCookie(res, setCookie) : res;
};
