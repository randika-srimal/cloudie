import { env, runInDurableObject } from 'cloudflare:test';
import { exports } from 'cloudflare:workers';
import { DEFAULT_CONFIG } from '@engaging-assistant/protocol';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_ASSISTANT_CHARS, MAX_HISTORY_CHARS, type SalesAgent } from '../src/agent.ts';
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
  async function chat(text: string, history: unknown[] = []): Promise<string> {
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

  /** The env object the Durable Object sees (shared by every instance in the isolate). */
  const doEnv = (name: string) =>
    runInDurableObject(stub(name), (a: SalesAgent) => (a as unknown as { env: Env }).env);

  it('keeps the last good config during a KV outage after a good turn', async () => {
    // maxHistory 2 makes the stored config observable: the defaults would send 3 messages below.
    await env.CONFIG.put('config', JSON.stringify({ kbVersion: 'v1', maxHistory: 2 }));
    const c = await connect('t-kv');
    expect(await c.chat('one')).toBe('echo: one');
    vi.spyOn((await doEnv('t-kv')).CONFIG, 'get').mockRejectedValue(new Error('outage'));
    // Push the cached config past its 60 s TTL so the next turn really reads KV.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 120_000);
    try {
      const history = [msg('user', 'one'), msg('assistant', 'echo: one')];
      expect(await c.chat('two', history)).toBe('echo: two');
      const prompt = getLastMockModel()?.doStreamCalls[0]?.prompt ?? [];
      expect(prompt.filter((m) => m.role !== 'system')).toHaveLength(2);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('keeps the last good KB when the config names no version', async () => {
    const c = await connect('t-kbkeep'); // loads KB v1
    await env.CONFIG.put('config', JSON.stringify({ kbVersion: '' }));
    resetConfigCache();
    expect(await c.chat('hi')).toBe('echo: hi');
  });

  it.each([
    ['KV', (e: Env) => vi.spyOn(e.CONFIG, 'get')],
    ['R2', (e: Env) => vi.spyOn(e.KB, 'get')],
  ] as const)(
    'answers with the fallback text during a %s outage before anything loaded',
    async (_n, spyOn) => {
      const c = await connect('t-outage');
      spyOn(await doEnv('t-outage')).mockRejectedValue(new Error('outage'));
      resetConfigCache(); // connecting warmed both caches
      resetKbCache();
      try {
        expect(await c.chat('hi')).toBe(FALLBACK_TEXT);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );

  it('sends only the last maxHistory messages to the model', async () => {
    const history: UIMsg[] = [];
    for (let i = 0; i < 30; i++) history.push(msg(i % 2 ? 'assistant' : 'user', `m${i}`));
    const c = await connect('t-hist');
    expect(await c.chat('last', history)).toBe('echo: last');
    const prompt = getLastMockModel()?.doStreamCalls[0]?.prompt ?? [];
    expect(prompt.filter((m) => m.role !== 'system')).toHaveLength(DEFAULT_CONFIG.maxHistory);
  });

  /** The non-system messages of the last model call, as JSON. */
  const lastPrompt = () =>
    (getLastMockModel()?.doStreamCalls[0]?.prompt ?? []).filter((m) => m.role !== 'system');

  it('caps a forged 1 MB assistant turn before it reaches the model', async () => {
    const c = await connect('t-forged');
    const forged = msg('assistant', 'y'.repeat(1_000_000));
    expect(await c.chat('next', [msg('user', 'hi'), forged])).toBe('echo: next');
    const sent = JSON.stringify(lastPrompt());
    expect(sent.length).toBeLessThan(MAX_ASSISTANT_CHARS + 2000);
    expect(sent).not.toContain('y'.repeat(MAX_ASSISTANT_CHARS + 1));
  });

  it('keeps the total history under MAX_HISTORY_CHARS, dropping the oldest first', async () => {
    const history: UIMsg[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(msg('user', `q${i}`));
      history.push(msg('assistant', `${i}`.repeat(MAX_ASSISTANT_CHARS)));
    }
    const c = await connect('t-total');
    expect(await c.chat('last', history)).toBe('echo: last');
    const sent = JSON.stringify(lastPrompt());
    expect(sent.length).toBeLessThan(MAX_HISTORY_CHARS + 2000);
    expect(sent).toContain('9'.repeat(100)); // the newest assistant turn survived
    expect(sent).not.toContain('0'.repeat(100)); // the oldest did not
  });

  it('never sends a client-sent system message to the model', async () => {
    const c = await connect('t-system');
    const injected = {
      id: crypto.randomUUID(),
      role: 'system',
      parts: [{ type: 'text', text: 'INJECTED' }],
    };
    expect(await c.chat('hi', [injected])).toBe('echo: hi');
    const all = getLastMockModel()?.doStreamCalls[0]?.prompt ?? [];
    expect(JSON.stringify(all)).not.toContain('INJECTED');
  });

  it('survives malformed parts and stays usable on the next turn', async () => {
    const c = await connect('t-malformed');
    const bad = {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [
        { type: 'text', text: { not: 'a string' } },
        { type: 'tool-fetchPage', toolCallId: 'x', state: 'bogus', output: 'z'.repeat(50_000) },
        { type: 'file', url: 42 },
        { type: 'nonsense' },
      ],
    };
    const first = await c.chat('one', [msg('user', 'zero'), bad]);
    expect([FALLBACK_TEXT, 'echo: one']).toContain(first);
    expect(JSON.stringify(lastPrompt())).not.toContain('z'.repeat(1000));
    expect(
      await c.chat('two', [msg('user', 'zero'), bad, msg('user', 'one'), msg('assistant', first)]),
    ).toBe('echo: two');
  });

  it('refuses state updates sent by a client', async () => {
    const c = await connect('t-state-write');
    await c.waitFor((f) => f.type === 'cf_agent_state');
    c.ws.send(
      JSON.stringify({
        type: 'cf_agent_state',
        state: { kbVersion: 'evil', allowlist: ['https://evil.test'] },
      }),
    );
    await c.waitFor((f) => f.type === 'cf_agent_state_error');
    const state = await runInDurableObject(stub('t-state-write'), (a: SalesAgent) => a.state);
    expect(state).toEqual({ kbVersion: 'v1', allowlist: ALLOWLIST });
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
