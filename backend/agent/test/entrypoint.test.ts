import { env } from 'cloudflare:test';
import { exports } from 'cloudflare:workers';
import { AgentStatus } from '@engaging-assistant/protocol';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetConfigCache } from '../src/config.ts';
import type { AgentEntrypoint } from '../src/index.ts';

// The Worker's default export, as the Pages proxy reaches it through the AGENT service binding.
const worker = (exports as unknown as { default: Service<AgentEntrypoint> }).default;

describe('allowConnect', () => {
  it('allows 10 connects a minute from one IP, then refuses', async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 11; i++) results.push(await worker.allowConnect('10.8.0.1'));
    expect(results.slice(0, 10)).toEqual(Array(10).fill(true));
    expect(results[10]).toBe(false);
    // Another IP has its own budget.
    expect(await worker.allowConnect('10.8.0.2')).toBe(true);
  });
});

describe('GET /status', () => {
  beforeEach(() => resetConfigCache());

  it('reports the KB version and model from the config, nothing else', async () => {
    await env.CONFIG.put('config', JSON.stringify({ kbVersion: 'v7', model: 'claude-haiku-5-5' }));
    const res = await worker.fetch('https://agent/status');
    expect(res.status).toBe(200);
    expect(AgentStatus.parse(await res.json())).toEqual({
      kbVersion: 'v7',
      model: 'claude-haiku-5-5',
    });
  });

  it('answers 404 for other paths outside /agents', async () => {
    expect((await worker.fetch('https://agent/nope')).status).toBe(404);
  });
});
