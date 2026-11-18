import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadKb, resetKbCache } from '../src/kb.ts';

async function seed(version: string): Promise<void> {
  const manifest = {
    version,
    builtAt: '2026-11-18T00:00:00.000Z',
    tokens: 10,
    files: 2,
    allowlist: ['https://example.com/a'],
  };
  await env.KB.put(`kb/${version}/instructions.md`, `instructions ${version}`);
  await env.KB.put(`kb/${version}/prompt.md`, `prompt ${version}`);
  await env.KB.put(`kb/${version}/manifest.json`, JSON.stringify(manifest));
}

describe('loadKb', () => {
  beforeEach(() => {
    resetKbCache();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the three objects and parses the manifest', async () => {
    await seed('v1');
    const kb = await loadKb(env, 'v1');
    expect(kb?.version).toBe('v1');
    expect(kb?.prompt).toBe('prompt v1');
    expect(kb?.instructions).toBe('instructions v1');
    expect(kb?.manifest.allowlist).toEqual(['https://example.com/a']);
  });

  it('does not hit R2 again for the cached version', async () => {
    await seed('v1');
    await loadKb(env, 'v1');
    const spy = vi.spyOn(env.KB, 'get');
    expect((await loadKb(env, 'v1'))?.version).toBe('v1');
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls back to the cached bundle when the version is missing', async () => {
    await seed('v1');
    await loadKb(env, 'v1');
    expect((await loadKb(env, 'v2'))?.version).toBe('v1');
  });

  it('returns null with a fresh cache and a missing version', async () => {
    expect(await loadKb(env, 'nope')).toBeNull();
  });

  it('treats an invalid manifest as unavailable', async () => {
    await seed('v3');
    await env.KB.put('kb/v3/manifest.json', '{"version":1}');
    expect(await loadKb(env, 'v3')).toBeNull();
    await env.KB.put('kb/v3/manifest.json', 'not json');
    expect(await loadKb(env, 'v3')).toBeNull();
  });

  it('treats a missing object as unavailable', async () => {
    await seed('v4');
    await env.KB.delete('kb/v4/prompt.md');
    expect(await loadKb(env, 'v4')).toBeNull();
  });

  it('skips R2 for an empty version', async () => {
    await seed('v1');
    await loadKb(env, 'v1');
    const spy = vi.spyOn(env.KB, 'get');
    expect((await loadKb(env, ''))?.version).toBe('v1');
    expect(spy).not.toHaveBeenCalled();
  });
});
