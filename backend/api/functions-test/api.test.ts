// The Functions called directly, inside workerd (the Workers runtime), with a real `env`.
import { Health, Hello } from '@cloudie/protocol';
import { createExecutionContext, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { onRequestGet as health } from '../functions/api/health.ts';
import { onRequestGet as hello } from '../functions/api/hello.ts';

// The smallest EventContext a Pages Function needs; add params or data when a route reads them.
function context(path: string, envOverride: Partial<typeof env> = {}) {
  const request = new Request(`http://localhost${path}`);
  return {
    request,
    env: { ...env, ...envOverride },
    params: {},
    data: {},
    functionPath: path,
    next: () => Promise.resolve(new Response(null, { status: 404 })),
    waitUntil: createExecutionContext().waitUntil,
    passThroughOnException: () => {},
  } as unknown as EventContext<typeof env, string, Record<string, unknown>>;
}

describe('GET /api/hello', () => {
  it('says hello', async () => {
    const res = await hello(context('/api/hello'));
    expect(res.status).toBe(200);
    const body = Hello.parse(await res.json());
    expect(body.message).toBe('Hello, world!');
  });
});

describe('GET /api/health', () => {
  it('reports the version from wrangler.toml [vars] and the agent KB version and model', async () => {
    const res = await health(context('/api/health'));
    expect(Health.parse(await res.json())).toEqual({
      ok: true,
      version: 'test',
      kbVersion: 'v-test',
      model: 'model-test',
    });
  });

  it('stays ok without the agent fields when the agent Worker is unreachable', async () => {
    const AGENT = {
      fetch: () => Promise.reject(new Error('no such service')),
    } as unknown as typeof env.AGENT;
    const res = await health(context('/api/health', { AGENT }));
    expect(res.status).toBe(200);
    expect(Health.parse(await res.json())).toEqual({ ok: true, version: 'test' });
  });
});
