import { env } from 'cloudflare:test';
import { DEFAULT_CONFIG } from '@engaging-assistant/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig, resetConfigCache } from '../src/config.ts';

describe('loadConfig', () => {
  beforeEach(async () => {
    resetConfigCache();
    await env.CONFIG.delete('config');
  });
  afterEach(() => {
    vi.restoreAllMocks();
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

  it('keeps the last good config, past its TTL, while KV fails', async () => {
    const t = 1_000_000;
    await env.CONFIG.put('config', JSON.stringify({ model: 'good', kbVersion: 'v7' }));
    expect((await loadConfig(env, t)).model).toBe('good');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(env.CONFIG, 'get').mockRejectedValue(new Error('kv down'));
    const later = await loadConfig(env, t + 120_000);
    expect(later).toEqual({ ...DEFAULT_CONFIG, model: 'good', kbVersion: 'v7' });
    await loadConfig(env, t + 180_000);
    expect(err).toHaveBeenCalledTimes(1);
  });

  it('uses a copy of the defaults when KV fails before anything loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(env.CONFIG, 'get').mockRejectedValue(new Error('kv down'));
    const c = await loadConfig(env);
    expect(c).toEqual(DEFAULT_CONFIG);
    expect(c).not.toBe(DEFAULT_CONFIG);
  });
});
