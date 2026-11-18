// The guarded proxy in functions/agents/[[path]].ts, called directly inside workerd. AGENT is the fake agent
// Worker from vitest.config.ts (it echoes what it received, and has a real 10/min CONNECT_LIMIT).
import { createExecutionContext, env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest as middleware } from '../functions/_middleware.ts';
import {
  originHostnames,
  signPass,
  verifyPass,
  verifyTurnstile,
} from '../functions/_lib/guards.ts';
import type { Env } from '../functions/_lib/env.ts';
import { onRequest as proxy } from '../functions/agents/[[path]].ts';

const ORIGIN = 'https://chat.test'; // ALLOWED_ORIGINS in vitest.config.ts
const HOUR = 3600_000;
let ipCounter = 0;

type Echo = { url: string; method: string; ip: string | null; cookie: string | null };

function context(
  path: string,
  init: { headers?: Record<string, string>; method?: string; ip?: string; env?: Partial<Env> } = {},
) {
  const headers: Record<string, string> = {
    Origin: ORIGIN,
    'cf-connecting-ip': init.ip ?? `10.7.0.${++ipCounter}`,
    ...init.headers,
  };
  const request = new Request(`https://cloudie.test${path}`, {
    method: init.method ?? 'GET',
    headers,
  });
  return {
    request,
    env: { ...env, ...init.env },
    params: {},
    data: {},
    functionPath: path,
    next: () => Promise.resolve(new Response(null, { status: 404 })),
    waitUntil: createExecutionContext().waitUntil,
    passThroughOnException: () => {},
  } as unknown as EventContext<Env, string, Record<string, unknown>>;
}

/** Makes Turnstile's siteverify answer `success` (and records what it was sent). */
function fakeSiteverify(success: boolean, hostname = 'chat.test') {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json({ success, hostname })));
}

async function passCookie(now = Date.now()): Promise<string> {
  return `chat_pass=${await signPass(env.PASS_SECRET, now)}`;
}

afterEach(() => vi.restoreAllMocks());

describe('/agents proxy guards', () => {
  it('answers 404 outside /agents/sales-agent/', async () => {
    const res = await proxy(context('/agents/other/x'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('refuses a wrong Origin with 403', async () => {
    const res = await proxy(
      context('/agents/sales-agent/s1?cf_turnstile=t', {
        headers: { Origin: 'https://evil.test' },
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('refuses a request with no Origin unless the browser marks it same-origin', async () => {
    const cookie = await passCookie();
    const none = context('/agents/sales-agent/s1', { headers: { Cookie: cookie } });
    none.request.headers.delete('Origin');
    expect((await proxy(none)).status).toBe(403);
    const same = context('/agents/sales-agent/s1', {
      headers: { Cookie: cookie, 'Sec-Fetch-Site': 'same-origin' },
    });
    same.request.headers.delete('Origin');
    expect((await proxy(same)).status).toBe(200);
  });

  it('asks for verification (401) with neither token nor cookie', async () => {
    const res = await proxy(context('/agents/sales-agent/s1'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Verification required' });
  });

  it('refuses a token siteverify rejects', async () => {
    fakeSiteverify(false);
    expect((await proxy(context('/agents/sales-agent/s1?cf_turnstile=bad'))).status).toBe(401);
  });

  it('refuses a valid token that was solved on another hostname', async () => {
    fakeSiteverify(true, 'evil.test');
    expect((await proxy(context('/agents/sales-agent/s1?cf_turnstile=good'))).status).toBe(401);
  });

  it('forwards with a valid token, strips it and sets a 12 h chat_pass cookie', async () => {
    const verify = fakeSiteverify(true);
    const res = await proxy(
      context('/agents/sales-agent/s1?cf_turnstile=good&_pk=abc', { ip: '10.6.0.1' }),
    );
    expect(res.status).toBe(200);
    const echo = (await res.json()) as Echo;
    expect(echo.url).toBe('https://cloudie.test/agents/sales-agent/s1?_pk=abc');
    expect(echo.ip).toBe('10.6.0.1');

    const cookie = res.headers.get('Set-Cookie') ?? '';
    expect(cookie).toMatch(
      /^chat_pass=\d+\.[\w-]+; Path=\/agents; Secure; HttpOnly; SameSite=None; Partitioned; Max-Age=43200$/,
    );
    const value = cookie.split(';')[0]!.slice('chat_pass='.length);
    expect(await verifyPass(value, env.PASS_SECRET, Date.now())).toBe(true);

    const [url, init] = verify.mock.calls[0]!;
    expect(String(url)).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const form = init?.body as FormData;
    expect(form.get('secret')).toBe(env.TURNSTILE_SECRET);
    expect(form.get('response')).toBe('good');
    expect(form.get('remoteip')).toBe('10.6.0.1');
  });

  it('passes a valid cookie without a token, sets no new cookie and does not forward the cookie', async () => {
    const verify = fakeSiteverify(false);
    const res = await proxy(
      context('/agents/sales-agent/s1', { headers: { Cookie: `a=1; ${await passCookie()}` } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(((await res.json()) as Echo).cookie).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it('passes POST through the same guards', async () => {
    const res = await proxy(
      context('/agents/sales-agent/s1/get-messages', {
        method: 'POST',
        headers: { Cookie: await passCookie() },
      }),
    );
    expect(((await res.json()) as Echo).method).toBe('POST');
  });

  it('refuses an expired or tampered cookie with 401', async () => {
    const old = await passCookie(Date.now() - 13 * HOUR);
    expect(
      (await proxy(context('/agents/sales-agent/s1', { headers: { Cookie: old } }))).status,
    ).toBe(401);
    const good = await passCookie();
    const tampered = good.replace(/\.(.)/, (_m, c: string) => `.${c === 'A' ? 'B' : 'A'}`);
    expect(
      (await proxy(context('/agents/sales-agent/s1', { headers: { Cookie: tampered } }))).status,
    ).toBe(401);
    const longer = good.replace(/=(\d+)\./, (_m, exp: string) => `=${Number(exp) + 3600}.`);
    expect(
      (await proxy(context('/agents/sales-agent/s1', { headers: { Cookie: longer } }))).status,
    ).toBe(401);
  });

  it('answers 429 on the 11th connect in a minute from one IP, before verification', async () => {
    const cookie = await passCookie();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await proxy(
        context('/agents/sales-agent/s1', { ip: '10.5.0.1', headers: { Cookie: cookie } }),
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
    const res = await proxy(context('/agents/sales-agent/s1', { ip: '10.5.0.1' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Too many connections' });
  });

  it('rebuilds a 101 upgrade with the WebSocket and adds the cookie', async () => {
    fakeSiteverify(true);
    const pair = new WebSocketPair();
    const agent = {
      fetch: () =>
        Promise.resolve(
          new Response(null, { status: 101, webSocket: pair[0], headers: { 'X-Agent': '1' } }),
        ),
      allowConnect: () => Promise.resolve(true),
    } as unknown as Env['AGENT'];
    const res = await proxy(
      context('/agents/sales-agent/s1?cf_turnstile=good', {
        headers: { Upgrade: 'websocket' },
        env: { AGENT: agent },
      }),
    );
    expect(res.status).toBe(101);
    expect(res.webSocket).toBe(pair[0]);
    expect(res.headers.get('X-Agent')).toBe('1');
    expect(res.headers.get('Set-Cookie')).toMatch(/^chat_pass=/);
  });
});

describe('verifyTurnstile', () => {
  it('is false when siteverify fails or the token is empty', async () => {
    const failing = () => Promise.reject(new Error('down'));
    expect(await verifyTurnstile('t', 's', '1.2.3.4', failing)).toBe(false);
    const ok = vi.fn(() => Promise.resolve(Response.json({ success: true })));
    expect(await verifyTurnstile('', 's', '1.2.3.4', ok)).toBe(false);
    expect(ok).not.toHaveBeenCalled();
  });
});

describe('verifyTurnstile hostname check', () => {
  const reply = (hostname: string) => () =>
    Promise.resolve(Response.json({ success: true, hostname }));
  const hosts = originHostnames(['https://chat.test', 'http://localhost:5173', 'not a url']);

  it('derives hostnames from origins, skipping invalid ones', () => {
    expect(hosts).toEqual(['chat.test', 'localhost']);
  });

  it('accepts a token solved on an allowed hostname', async () => {
    expect(await verifyTurnstile('t', 'live-secret', '1.2.3.4', reply('chat.test'), hosts)).toBe(
      true,
    );
  });

  it('refuses a token solved on another hostname, or with none reported', async () => {
    expect(await verifyTurnstile('t', 'live-secret', '1.2.3.4', reply('evil.test'), hosts)).toBe(
      false,
    );
    const none = () => Promise.resolve(Response.json({ success: true }));
    expect(await verifyTurnstile('t', 'live-secret', '1.2.3.4', none, hosts)).toBe(false);
  });

  it('does not check hostnames for Turnstile test secrets', async () => {
    const testSecret = '1x0000000000000000000000000000000AA';
    expect(await verifyTurnstile('t', testSecret, '1.2.3.4', reply('example.com'), hosts)).toBe(
      true,
    );
  });
});

describe('middleware', () => {
  it('adds nosniff to ordinary responses, including ones with immutable headers', async () => {
    const res = await middleware({
      ...context('/x'),
      next: () => Promise.resolve(Response.redirect('https://cloudie.test/y', 302)),
    } as unknown as Parameters<typeof middleware>[0]);
    expect(res.status).toBe(302);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('passes a 101 WebSocket upgrade through untouched', async () => {
    const pair = new WebSocketPair();
    const upgrade = new Response(null, { status: 101, webSocket: pair[0] });
    const res = await middleware({
      ...context('/x'),
      next: () => Promise.resolve(upgrade),
    } as unknown as Parameters<typeof middleware>[0]);
    expect(res.status).toBe(101);
    expect(res.webSocket).toBe(pair[0]);
  });
});
