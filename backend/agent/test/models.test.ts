import { env } from 'cloudflare:test';
import { DEFAULT_CONFIG } from '@engaging-assistant/protocol';
import { streamText } from 'ai';
import { describe, expect, it } from 'vitest';
import type { Env } from '../src/env.ts';
import { getLastMockModel, MissingKeyError, resolveModel } from '../src/models.ts';

// The global test env sets MOCK_MODEL; these build their own env for the real-provider path.
const real = (extra: Partial<Env> = {}): Env => ({
  ...env,
  MOCK_MODEL: undefined,
  AI_GATEWAY_URL: 'http://gw.test',
  ...extra,
});

describe('resolveModel', () => {
  it('builds an anthropic model with prompt caching and effort', () => {
    const r = resolveModel(DEFAULT_CONFIG, real({ CF_AIG_TOKEN: 't' }));
    expect(typeof r.model !== 'string' && r.model.provider).toMatch(/^anthropic/);
    expect(r.cacheSystem).toBe(true);
    expect(r.providerOptions).toEqual({ anthropic: { effort: 'low' } });
  });

  it('builds an openai model without system caching', () => {
    const r = resolveModel(
      { ...DEFAULT_CONFIG, provider: 'openai', model: 'gpt-5', effort: 'high' },
      real({ OPENAI_API_KEY: 'k' }),
    );
    expect(typeof r.model !== 'string' && r.model.provider).toMatch(/^openai/);
    expect(r.cacheSystem).toBe(false);
    expect(r.providerOptions).toEqual({ openai: { reasoningEffort: 'high' } });
  });

  it('builds a google model with no provider options', () => {
    const r = resolveModel(
      { ...DEFAULT_CONFIG, provider: 'google', model: 'gemini-3-pro' },
      real({ CF_AIG_TOKEN: 't' }),
    );
    expect(typeof r.model !== 'string' && r.model.provider).toMatch(/^google/);
    expect(r.cacheSystem).toBe(false);
    expect(r.providerOptions).toEqual({});
  });

  it('omits effort options when effort is unset', () => {
    const { effort: _e, ...noEffort } = DEFAULT_CONFIG;
    const r = resolveModel(noEffort, real({ CF_AIG_TOKEN: 't' }));
    expect(r.providerOptions).toEqual({});
  });

  it('throws MissingKeyError with neither token nor key', () => {
    expect(() => resolveModel(DEFAULT_CONFIG, real())).toThrow(MissingKeyError);
  });

  it.each([
    ['anthropic', DEFAULT_CONFIG, 'http://gw.test/anthropic/v1/messages'],
    [
      'openai',
      { ...DEFAULT_CONFIG, provider: 'openai', model: 'gpt-5' },
      'http://gw.test/openai/responses',
    ],
    [
      'google',
      { ...DEFAULT_CONFIG, provider: 'google', model: 'gemini-3-pro' },
      'http://gw.test/google-ai-studio/v1beta/models/gemini-3-pro:streamGenerateContent?alt=sse',
    ],
  ] as const)('sends %s requests to the gateway path with the token', async (_n, config, url) => {
    const calls: { url: string; headers: Headers }[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = ((input: Request | string | URL, init?: RequestInit) => {
      calls.push({ url: String(input), headers: new Headers(init?.headers) });
      return Promise.resolve(new Response('{}', { status: 500 }));
    }) as typeof fetch;
    try {
      const r = resolveModel(config, real({ CF_AIG_TOKEN: 'tok' }));
      const res = streamText({ model: r.model, prompt: 'hi', maxRetries: 0, onError: () => {} });
      await res.consumeStream({ onError: () => {} });
    } finally {
      globalThis.fetch = orig;
    }
    expect(calls[0]?.url).toBe(url);
    expect(calls[0]?.headers.get('cf-aig-authorization')).toBe('Bearer tok');
  });

  // AI Gateway adds a stored (BYOK) key only when the request has no provider auth header of its own; any
  // value there, even a placeholder, is forwarded and the provider rejects it ("invalid x-api-key").
  it.each([
    ['anthropic', DEFAULT_CONFIG, 'x-api-key', { ANTHROPIC_API_KEY: 'own' }, 'own'],
    [
      'openai',
      { ...DEFAULT_CONFIG, provider: 'openai', model: 'gpt-5' },
      'authorization',
      { OPENAI_API_KEY: 'own' },
      'Bearer own',
    ],
    [
      'google',
      { ...DEFAULT_CONFIG, provider: 'google', model: 'gemini-3-pro' },
      'x-goog-api-key',
      { GOOGLE_API_KEY: 'own' },
      'own',
    ],
  ] as const)(
    'sends no %s key header when the gateway holds the key, and the own key otherwise',
    async (_n, config, header, keys, expected) => {
      const seen: (string | null)[] = [];
      const orig = globalThis.fetch;
      globalThis.fetch = ((_input: Request | string | URL, init?: RequestInit) => {
        seen.push(new Headers(init?.headers).get(header));
        return Promise.resolve(new Response('{}', { status: 500 }));
      }) as typeof fetch;
      try {
        for (const extra of [{}, keys]) {
          const r = resolveModel(config, real({ CF_AIG_TOKEN: 'tok', ...extra }));
          const res = streamText({
            model: r.model,
            prompt: 'hi',
            maxRetries: 0,
            onError: () => {},
          });
          await res.consumeStream({ onError: () => {} });
        }
      } finally {
        globalThis.fetch = orig;
      }
      expect(seen).toEqual([null, expected]);
    },
  );

  it.each([
    [
      'anthropic',
      DEFAULT_CONFIG,
      { ANTHROPIC_API_KEY: 'k' },
      'https://api.anthropic.com/v1/messages',
    ],
    [
      'openai',
      { ...DEFAULT_CONFIG, provider: 'openai', model: 'gpt-5' },
      { OPENAI_API_KEY: 'k' },
      'https://api.openai.com/v1/responses',
    ],
    [
      'google',
      { ...DEFAULT_CONFIG, provider: 'google', model: 'gemini-3-pro' },
      { GOOGLE_API_KEY: 'k' },
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:streamGenerateContent?alt=sse',
    ],
  ] as const)(
    'calls %s directly when AI_GATEWAY_URL is empty (local dev)',
    async (_n, config, keys, url) => {
      const calls: { url: string; headers: Headers }[] = [];
      const orig = globalThis.fetch;
      globalThis.fetch = ((input: Request | string | URL, init?: RequestInit) => {
        calls.push({ url: String(input), headers: new Headers(init?.headers) });
        return Promise.resolve(new Response('{}', { status: 500 }));
      }) as typeof fetch;
      try {
        const r = resolveModel(config, real({ AI_GATEWAY_URL: '', CF_AIG_TOKEN: 'tok', ...keys }));
        const res = streamText({ model: r.model, prompt: 'hi', maxRetries: 0, onError: () => {} });
        await res.consumeStream({ onError: () => {} });
      } finally {
        globalThis.fetch = orig;
      }
      expect(calls[0]?.url).toBe(url);
      expect(calls[0]?.headers.get('cf-aig-authorization')).toBeNull();
    },
  );

  it('needs the provider key when AI_GATEWAY_URL is empty, even with a gateway token', () => {
    expect(() =>
      resolveModel(DEFAULT_CONFIG, real({ AI_GATEWAY_URL: '', CF_AIG_TOKEN: 'tok' })),
    ).toThrow(MissingKeyError);
  });

  it('echoes the last user text with MOCK_MODEL=echo', async () => {
    const r = resolveModel(DEFAULT_CONFIG, { ...env, MOCK_MODEL: 'echo' });
    const res = streamText({
      model: r.model,
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'ok' },
        { role: 'user', content: 'hello there' },
      ],
    });
    expect(await res.text).toBe('echo: hello there');
    expect(getLastMockModel()?.doStreamCalls).toHaveLength(1);
  });

  it('throws on use with MOCK_MODEL=fail', async () => {
    const r = resolveModel(DEFAULT_CONFIG, { ...env, MOCK_MODEL: 'fail' });
    const res = streamText({ model: r.model, prompt: 'x', maxRetries: 0, onError: () => {} });
    await expect(res.text).rejects.toThrow();
  });
});
