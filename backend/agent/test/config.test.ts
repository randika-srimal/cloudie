import { env } from 'cloudflare:test';
import { DEFAULT_CONFIG } from '@cloudie/protocol';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, resetConfigCache } from '../src/config.ts';

describe('loadConfig', () => {
  beforeEach(async () => {
    resetConfigCache();
    await env.CONFIG.delete('config');
  });

  it('returns the defaults when no key is stored', async () => {
    expect(await loadConfig(env)).toEqual(DEFAULT_CONFIG);
  });

  it('merges stored values over the defaults', async () => {
    await env.CONFIG.put('config', JSON.stringify({ model: 'claude-haiku-5-5' }));
    expect(await loadConfig(env)).toEqual({ ...DEFAULT_CONFIG, model: 'claude-haiku-5-5' });
  });

  it('falls back to the defaults on invalid JSON', async () => {
    await env.CONFIG.put('config', 'not json');
    expect(await loadConfig(env)).toEqual(DEFAULT_CONFIG);
  });

  it('falls back to the defaults on a schema violation', async () => {
    await env.CONFIG.put('config', JSON.stringify({ provider: 'mistral' }));
    expect(await loadConfig(env)).toEqual(DEFAULT_CONFIG);
  });

  it('caches for 60 s', async () => {
    const t = 1_000_000;
    await env.CONFIG.put('config', JSON.stringify({ model: 'a' }));
    expect((await loadConfig(env, t)).model).toBe('a');
    await env.CONFIG.put('config', JSON.stringify({ model: 'b' }));
    expect((await loadConfig(env, t + 1000)).model).toBe('a');
    expect((await loadConfig(env, t + 61_000)).model).toBe('b');
  });
});
