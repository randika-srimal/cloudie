import { env, runInDurableObject } from 'cloudflare:test';
import { exports } from 'cloudflare:workers';
import { DEFAULT_CONFIG } from '@cloudie/protocol';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SalesAgent } from '../src/agent.ts';
import { resetConfigCache } from '../src/config.ts';
import type { Env } from '../src/env.ts';
import { resetKbCache } from '../src/kb.ts';
import { getLastMockModel } from '../src/models.ts';
import { buildSystem, FALLBACK_TEXT, RATE_LIMITED_TEXT, TOO_LONG_TEXT } from '../src/prompt.ts';

// The Worker's default export (the agent router), as the Pages proxy would reach it.
const worker = (exports as unknown as { default: Fetcher }).default;

const ALLOWLIST = ['https://www.engaging.io/case-studies/a'];

async function seed(config: object = { kbVersion: 'v1' }): Promise<void> {
  await env.CONFIG.put('config', JSON.stringify(config));
  const manifest = {
    version: 'v1',
    builtAt: '2026-11-18T00:00:00.000Z',
    tokens: 10,
    files: 1,
    allowlist: ALLOWLIST,
  };
  await env.KB.put('kb/v1/instructions.md', 'You answer case-study questions.');
  await env.KB.put('kb/v1/prompt.md', '# Case studies');
  await env.KB.put('kb/v1/manifest.json', JSON.stringify(manifest));
}

type Frame = { type: string; id?: string; body?: string; done?: boolean; state?: unknown };
type UIMsg = { id: string; role: 'user' | 'assistant'; parts: { type: 'text'; text: string }[] };

let ipCounter = 0;

/** Opens a WebSocket to the agent the way the browser client does, from a fresh IP so rate limits don't leak. */
async function connect(name: string) {
  const ip = `10.9.0.${++ipCounter}`;
  const res = await worker.fetch(`http://agent.test/agents/sales-agent/${name}`, {
    headers: { Upgrade: 'websocket', 'cf-connecting-ip': ip },
  });
  const ws = res.webSocket;
  if (!ws) throw new Error(`no websocket, status ${res.status}`);
  const frames: Frame[] = [];
  const waiters: (() => void)[] = [];
  ws.addEventListener('message', (e: MessageEvent) => {
    frames.push(JSON.parse(String(e.data)) as Frame);
    for (const w of waiters.splice(0)) w();
  });
  ws.accept();

  async function waitFor(pred: (f: Frame) => boolean, ms = 5000): Promise<Frame> {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = frames.find(pred);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`timed out; frames: ${JSON.stringify(frames)}`);
      await new Promise<void>((r) => {
        waiters.push(r);
        setTimeout(r, 50);
      });
    }
  }

  /** Sends the whole history plus a new user message; resolves with the streamed assistant text. */
  async function chat(text: string, history: UIMsg[] = []): Promise<string> {
    const id = crypto.randomUUID();
    const messages = [...history, msg('user', text)];
    ws!.send(
      JSON.stringify({
        type: 'cf_agent_use_chat_request',
        id,
        init: { method: 'POST', body: JSON.stringify({ messages, trigger: 'submit-message' }) },
      }),
    );
    await waitFor((f) => f.type === 'cf_agent_use_chat_response' && f.id === id && !!f.done);
    let out = '';
    for (const f of frames) {
      if (f.type !== 'cf_agent_use_chat_response' || f.id !== id || !f.body?.trim()) continue;
      const chunk = JSON.parse(f.body) as { type: string; delta?: string };
      if (chunk.type === 'text-delta') out += chunk.delta ?? '';
      if (chunk.type === 'error') throw new Error(`error chunk: ${f.body}`);
    }
    return out;
  }

  return { ws, frames, waitFor, chat, close: () => ws.close() };
}

function msg(role: 'user' | 'assistant', text: string): UIMsg {
  return { id: crypto.randomUUID(), role, parts: [{ type: 'text', text }] };
}

function stub(name: string) {
  return env.SalesAgent.get(env.SalesAgent.idFromName(name)) as DurableObjectStub<SalesAgent>;
}

describe('SalesAgent', () => {
  beforeEach(async () => {
    resetConfigCache();
    resetKbCache();
    await seed();
  });

  it('answers through the model and keeps the history across reconnects', async () => {
    const c = await connect('t1');
    expect(await c.chat('hi')).toBe('echo: hi');
    c.close();
    await connect('t1');
    const n = await runInDurableObject(stub('t1'), (a: SalesAgent) => a.messages.length);
    expect(n).toBe(2);
  });

  it('publishes the KB version and allowlist as state on connect', async () => {
    const c = await connect('t-state');
    const f = await c.waitFor(
      (f) => f.type === 'cf_agent_state' && (f.state as { kbVersion?: string })?.kbVersion === 'v1',
    );
    expect(f.state).toEqual({ kbVersion: 'v1', allowlist: ALLOWLIST });
  });

  it('rejects a message over 4000 characters without calling the model', async () => {
    const before = getLastMockModel();
    const c = await connect('t-long');
    expect(await c.chat('x'.repeat(4001))).toBe(TOO_LONG_TEXT);
    expect(getLastMockModel()).toBe(before);
    // The rejected message stays in the chat but is left out of the next model call.
    const long = msg('user', 'x'.repeat(4001));
    expect(await c.chat('short', [long, msg('assistant', TOO_LONG_TEXT)])).toBe('echo: short');
    const sent = getLastMockModel()?.doStreamCalls[0]?.prompt ?? [];
    expect(JSON.stringify(sent)).not.toContain('x'.repeat(4001));
  });

  it('streams the fallback text when the model fails', async () => {
    const c = await connect('t-fail');
    // The Durable Object's env is shared by every instance in the isolate, so put it back afterwards.
    const setMock = (v: string) =>
      runInDurableObject(stub('t-fail'), (a: SalesAgent) => {
        (a as unknown as { env: Env }).env.MOCK_MODEL = v;
      });
    await setMock('fail');
    try {
      expect(await c.chat('hi')).toBe(FALLBACK_TEXT);
    } finally {
      await setMock('echo');
    }
  });

  it('streams the fallback text when no KB is published', async () => {
    await env.CONFIG.put('config', JSON.stringify({ kbVersion: '' }));
    const c = await connect('t-nokb');
    expect(await c.chat('hi')).toBe(FALLBACK_TEXT);
  });

  it('tells the client to slow down after 20 messages a minute from one IP', async () => {
    const c = await connect('t-rate');
    for (let i = 0; i < 20; i++) expect(await c.chat(`q${i}`)).toBe(`echo: q${i}`);
    expect(await c.chat('one too many')).toBe(RATE_LIMITED_TEXT);
  });

  it.each([
    ['KV', (e: Env) => vi.spyOn(e.CONFIG, 'get')],
    ['R2', (e: Env) => vi.spyOn(e.KB, 'get')],
  ] as const)('answers with the fallback text during a %s outage', async (_n, spyOn) => {
    const c = await connect('t-outage');
    const doEnv = await runInDurableObject(stub('t-outage'), (a: SalesAgent) => {
      return (a as unknown as { env: Env }).env;
    });
    spyOn(doEnv).mockRejectedValue(new Error('outage'));
    resetConfigCache(); // connecting warmed both caches
    resetKbCache();
    try {
      expect(await c.chat('hi')).toBe(FALLBACK_TEXT);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('sends only the last maxHistory messages to the model', async () => {
    const history: UIMsg[] = [];
    for (let i = 0; i < 30; i++) history.push(msg(i % 2 ? 'assistant' : 'user', `m${i}`));
    const c = await connect('t-hist');
    expect(await c.chat('last', history)).toBe('echo: last');
    const prompt = getLastMockModel()?.doStreamCalls[0]?.prompt ?? [];
    expect(prompt.filter((m) => m.role !== 'system')).toHaveLength(DEFAULT_CONFIG.maxHistory);
  });

  it('keeps a single expire schedule, renewed by each turn', async () => {
    const c = await connect('t-expire');
    await c.chat('one');
    const first = await runInDurableObject(stub('t-expire'), (a: SalesAgent) =>
      a.getSchedules().filter((s) => s.callback === 'expire'),
    );
    await c.chat('two', [msg('user', 'one'), msg('assistant', 'echo: one')]);
    const second = await runInDurableObject(stub('t-expire'), (a: SalesAgent) =>
      a.getSchedules().filter((s) => s.callback === 'expire'),
    );
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second[0]?.id).not.toBe(first[0]?.id);
  });
});

describe('buildSystem', () => {
  const kb = {
    version: 'v1',
    instructions: 'rules',
    prompt: 'kb',
    manifest: { version: 'v1', builtAt: '', tokens: 0, files: 0, allowlist: [] },
  };

  it('marks the KB message for 1h caching and leaves the instructions alone', () => {
    const [a, b] = buildSystem(kb, true);
    expect(a).toEqual({ role: 'system', content: 'rules' });
    expect(b).toEqual({
      role: 'system',
      content: 'kb',
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } } },
    });
  });

  it('adds no cache marker when caching is off', () => {
    expect(buildSystem(kb, false)).toEqual([
      { role: 'system', content: 'rules' },
      { role: 'system', content: 'kb' },
    ]);
  });
});
