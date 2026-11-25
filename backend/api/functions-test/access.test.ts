// The chat password gate in functions/api/access.ts, called directly inside workerd. CHAT_PASSWORD and the
// fake agent's UNLOCK_LIMIT (5 a minute per IP) come from vitest.config.ts.
import { AccessStatus, ApiError } from '@engaging-assistant/protocol';
import { createExecutionContext, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { Env } from '../functions/_lib/env.ts';
import { ACCESS_SECONDS, passwordMatches, verifyAccess } from '../functions/_lib/guards.ts';
import { onRequestGet as get, onRequestPost as post } from '../functions/api/access.ts';

const ORIGIN = 'https://chat.test'; // ALLOWED_ORIGINS in vitest.config.ts
let ipCounter = 0;

function context(
  init: {
    method?: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
    ip?: string;
    env?: Partial<Env>;
  } = {},
) {
  const request = new Request('https://engaging-assistant.test/api/access', {
    method: init.method ?? 'GET',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'cf-connecting-ip': init.ip ?? `10.4.0.${++ipCounter}`,
      ...init.headers,
    },
    body:
      init.body === undefined
        ? undefined
        : typeof init.body === 'string'
          ? init.body
          : JSON.stringify(init.body),
  });
  return {
    request,
    env: { ...env, ...init.env },
    params: {},
    data: {},
    functionPath: '/api/access',
    next: () => Promise.resolve(new Response(null, { status: 404 })),
    waitUntil: createExecutionContext().waitUntil,
    passThroughOnException: () => {},
  } as unknown as EventContext<Env, string, Record<string, unknown>>;
}

const unlock = (password: string, init: Parameters<typeof context>[0] = {}) =>
  post(context({ method: 'POST', body: { password }, ...init }));

describe('POST /api/access', () => {
  it('sets a 7-day chat_access cookie for the right password', async () => {
    const res = await unlock(env.CHAT_PASSWORD);
    expect(res.status).toBe(200);
    expect(AccessStatus.parse(await res.json())).toEqual({ unlocked: true });
    const cookie = res.headers.get('Set-Cookie') ?? '';
    expect(cookie).toMatch(
      new RegExp(
        `^chat_access=\\d+\\.[\\w-]+; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${ACCESS_SECONDS}$`,
      ),
    );
    expect(cookie).not.toContain(env.CHAT_PASSWORD);
    const value = cookie.split(';')[0]!.slice('chat_access='.length);
    expect(await verifyAccess(value, env.PASS_SECRET, env.CHAT_PASSWORD, Date.now())).toBe(true);
  });

  it('refuses a wrong password with 401 and no cookie', async () => {
    const res = await unlock('nope');
    expect(res.status).toBe(401);
    expect(ApiError.parse(await res.json())).toEqual({ error: 'Wrong password' });
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('refuses another site (403) and a missing or malformed body (400)', async () => {
    expect(
      (await unlock(env.CHAT_PASSWORD, { headers: { Origin: 'https://evil.test' } })).status,
    ).toBe(403);
    expect((await post(context({ method: 'POST', body: 'not json' }))).status).toBe(400);
    expect((await post(context({ method: 'POST', body: { password: '' } }))).status).toBe(400);
  });

  it('answers 503 while CHAT_PASSWORD is not set, so an empty password never unlocks', async () => {
    const res = await unlock('anything', { env: { CHAT_PASSWORD: '' } });
    expect(res.status).toBe(503);
  });

  it('allows 5 attempts a minute per IP, then answers 429 even for the right password', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await unlock('wrong', { ip: '10.3.0.1' })).status);
    expect(statuses).toEqual(Array(5).fill(401));
    const res = await unlock(env.CHAT_PASSWORD, { ip: '10.3.0.1' });
    expect(res.status).toBe(429);
    expect((await unlock(env.CHAT_PASSWORD, { ip: '10.3.0.2' })).status).toBe(200);
  });
});

describe('GET /api/access', () => {
  it('is locked without a cookie and unlocked with the one POST set', async () => {
    expect(AccessStatus.parse(await (await get(context())).json())).toEqual({ unlocked: false });
    const cookie = (await unlock(env.CHAT_PASSWORD)).headers.get('Set-Cookie')!.split(';')[0]!;
    const res = await get(context({ headers: { Cookie: cookie } }));
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(AccessStatus.parse(await res.json())).toEqual({ unlocked: true });
  });

  it('is locked again once the password changes', async () => {
    const cookie = (await unlock(env.CHAT_PASSWORD)).headers.get('Set-Cookie')!.split(';')[0]!;
    const res = await get(
      context({ headers: { Cookie: cookie }, env: { CHAT_PASSWORD: 'a-new-password' } }),
    );
    expect(AccessStatus.parse(await res.json())).toEqual({ unlocked: false });
  });
});

describe('passwordMatches', () => {
  it('matches only the exact password and never an empty expected one', async () => {
    expect(await passwordMatches('secret', 'secret')).toBe(true);
    expect(await passwordMatches('Secret', 'secret')).toBe(false);
    expect(await passwordMatches('secret ', 'secret')).toBe(false);
    expect(await passwordMatches('', '')).toBe(false);
  });
});
