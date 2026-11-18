import { describe, expect, it } from 'vitest';
import { fetchPageTool } from '../src/tools/fetchPage.ts';

type Result = { url: string; title: string; text: string } | { error: string };

function html(body: string, type = 'text/html; charset=utf-8'): Response {
  return new Response(body, { status: 200, headers: { 'content-type': type } });
}

function run(t: ReturnType<typeof fetchPageTool>, url: string): Promise<Result> {
  return t.execute!({ url }, { toolCallId: 'c1', messages: [], context: {} }) as Promise<Result>;
}

function fakeFetch(handler: (url: string) => Response) {
  const calls: string[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.redirect).toBe('manual');
    const url = String(input);
    calls.push(url);
    return handler(url);
  }) as typeof fetch;
  return { f, calls };
}

describe('fetchPageTool', () => {
  it('returns stripped text and the title', async () => {
    const { f } = fakeFetch(() =>
      html(
        '<html><head><title> Acme &amp; Co </title><style>.a{color:red}</style></head><body>' +
          '<nav>Home About</nav><script>alert(1)</script><h1>We make   rockets</h1><p>For\n airlines</p></body></html>',
      ),
    );
    const r = await run(fetchPageTool({ fetch: f }), 'https://acme.test/');
    expect(r).toEqual({
      url: 'https://acme.test/',
      title: 'Acme & Co',
      text: 'We make rockets For airlines',
    });
    const text = (r as { text: string }).text;
    expect(text).not.toMatch(/alert|color:red|Home About|</);
  });

  it.each([
    'https://www.engaging.io/x',
    'https://ENGAGING.IO/',
    'https://engaging.io./',
    'http://127.0.0.1/',
    'http://localhost:8788/',
    'http://10.1.2.3/',
    'http://172.16.0.1/',
    'http://172.31.255.255/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest',
    'http://2130706433/',
    'http://[::1]/',
    'http://[fe80::1]/',
    'http://[fd00::1]/',
    'http://[::ffff:10.0.0.1]/',
    'file:///etc/passwd',
    'ftp://example.com/',
    'not a url',
  ])('refuses %s without fetching', async (url) => {
    const { f, calls } = fakeFetch(() => html('x'));
    const r = await run(fetchPageTool({ fetch: f }), url);
    expect(r).toHaveProperty('error');
    expect(calls).toHaveLength(0);
  });

  it('allows public addresses next to private ranges', async () => {
    const { f } = fakeFetch(() => html('<p>ok</p>'));
    expect(await run(fetchPageTool({ fetch: f }), 'http://172.32.0.1/')).toHaveProperty('text');
    expect(await run(fetchPageTool({ fetch: f }), 'https://notengaging.io/')).toHaveProperty(
      'text',
    );
  });

  it('refuses a redirect to a private address', async () => {
    const { f, calls } = fakeFetch(
      () => new Response(null, { status: 302, headers: { location: 'http://10.0.0.1/admin' } }),
    );
    const r = await run(fetchPageTool({ fetch: f }), 'https://acme.test/');
    expect(r).toHaveProperty('error');
    expect(calls).toEqual(['https://acme.test/']);
  });

  it('follows relative redirects and stops after 3 hops', async () => {
    const ok = fakeFetch((u) =>
      u.endsWith('/a')
        ? new Response(null, { status: 301, headers: { location: '/b' } })
        : html('<p>landed</p>'),
    );
    const r = await run(fetchPageTool({ fetch: ok.f }), 'https://acme.test/a');
    expect(r).toMatchObject({ url: 'https://acme.test/b', text: 'landed' });

    const loop = fakeFetch(
      () => new Response(null, { status: 302, headers: { location: '/again' } }),
    );
    const e = await run(fetchPageTool({ fetch: loop.f }), 'https://acme.test/');
    expect(e).toEqual({ error: 'too many redirects' });
    expect(loop.calls).toHaveLength(4);
  });

  it('cuts a 200k-character page to 80,000 characters', async () => {
    const { f } = fakeFetch(() => html(`<p>${'a'.repeat(200_000)}</p>`));
    const r = (await run(fetchPageTool({ fetch: f }), 'https://acme.test/')) as { text: string };
    expect(r.text).toHaveLength(80_000);
  });

  it('refuses the third call', async () => {
    const { f } = fakeFetch(() => html('<p>hi</p>'));
    const t = fetchPageTool({ fetch: f });
    expect(await run(t, 'https://acme.test/1')).toHaveProperty('text');
    expect(await run(t, 'https://acme.test/2')).toHaveProperty('text');
    expect(await run(t, 'https://acme.test/3')).toEqual({ error: 'fetch limit reached' });
  });

  it('rejects a PDF content type', async () => {
    const { f } = fakeFetch(() => html('%PDF', 'application/pdf'));
    const r = await run(fetchPageTool({ fetch: f }), 'https://acme.test/a.pdf');
    expect(r).toEqual({ error: expect.stringContaining('application/pdf') });
  });

  it('accepts text/plain and returns errors instead of throwing', async () => {
    const plain = fakeFetch(() => html('hello   world', 'text/plain'));
    expect(await run(fetchPageTool({ fetch: plain.f }), 'https://acme.test/')).toMatchObject({
      text: 'hello world',
    });
    const boom = (async () => {
      throw new Error('network down');
    }) as typeof fetch;
    expect(await run(fetchPageTool({ fetch: boom }), 'https://acme.test/')).toEqual({
      error: expect.stringContaining('network down'),
    });
    const bad = fakeFetch(
      () => new Response('nope', { status: 500, headers: { 'content-type': 'text/html' } }),
    );
    expect(await run(fetchPageTool({ fetch: bad.f }), 'https://acme.test/')).toEqual({
      error: expect.stringContaining('500'),
    });
  });
});
