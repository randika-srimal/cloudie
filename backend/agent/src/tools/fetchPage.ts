import { tool } from 'ai';
import { z } from 'zod/mini';

// Provider-neutral page reader. The model calls it with a prospect URL and classifies the industry from the text.
// Replaces Anthropic's server-side web_fetch so any provider works. Security-sensitive (SSRF): see isBlockedHost.
//
// Known limit: guards check the hostname only. DNS rebinding (a public name that resolves to a private IP) is not
// covered; Workers fetch cannot reach private networks or the Cloudflare internal network anyway.

const MAX_REDIRECTS = 3;
const MAX_CHARS = 80_000;
const MAX_RAW_CHARS = 500_000;
const TIMEOUT_MS = 8000;

const inputSchema = z.object({ url: z.string() });

export type FetchPageResult = { url: string; title: string; text: string } | { error: string };

function ipv4Blocked(a: number, b: number): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isBlockedHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().replace(/\.$/, '');
  if (host === 'engaging.io' || host.endsWith('.engaging.io')) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) return ipv4Blocked(Number(v4[1]), Number(v4[2]));

  if (host.startsWith('[')) {
    const v6 = host.slice(1, -1);
    if (v6 === '::1' || v6 === '::') return true;
    const first = v6.split(':')[0] ?? '';
    if (/^f[cd][0-9a-f]{2}$/.test(first)) return true; // fc00::/7
    if (/^fe[89ab][0-9a-f]$/.test(first)) return true; // fe80::/10
    // The URL parser normalises IPv4-mapped addresses to ::ffff:a00:1 (hex pairs).
    const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v6);
    if (mapped) {
      const hi = parseInt(mapped[1]!, 16);
      return ipv4Blocked(hi >> 8, hi & 0xff);
    }
  }
  return false;
}

/** Returns the parsed URL, or an error message when the target is not allowed. */
function checkUrl(raw: string, base?: string): URL | string {
  let u: URL;
  try {
    u = new URL(raw, base);
  } catch {
    return 'invalid url';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:')
    return 'only http and https urls are allowed';
  if (isBlockedHost(u.hostname)) return 'this host is not allowed';
  return u;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// ASCII-only lowercase keeps string length, so indexes found in the copy are valid in the original.
function asciiLower(s: string): string {
  return s.replace(/[A-Z]+/g, (m) => m.toLowerCase());
}

function extractTitle(html: string): string {
  const lower = asciiLower(html);
  const open = lower.indexOf('<title');
  if (open === -1) return '';
  const gt = lower.indexOf('>', open);
  if (gt === -1) return '';
  const close = lower.indexOf('</title', gt);
  if (close === -1) return '';
  return collapse(decodeEntities(html.slice(gt + 1, close)));
}

const SKIPPED = new Set(['script', 'style', 'nav', 'head']);

// Single forward pass: every step moves the cursor past what it consumed, so cost is linear in the input
// (regex versions were quadratic on unmatched "<").
function htmlToText(html: string): string {
  const lower = asciiLower(html);
  const out: string[] = [];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out.push(html.slice(i));
      break;
    }
    out.push(html.slice(i, lt), ' ');
    if (lower.startsWith('<!--', lt)) {
      const end = lower.indexOf('-->', lt + 4);
      if (end === -1) break;
      i = end + 3;
      continue;
    }
    const gt = html.indexOf('>', lt + 1);
    if (gt === -1) {
      out.push(html.slice(lt)); // no tag can close: the rest is plain text
      break;
    }
    const m = /^<([a-z]+)(?![a-z0-9])/.exec(lower.slice(lt, lt + 12));
    const name = m?.[1];
    if (name && SKIPPED.has(name)) {
      const close = lower.indexOf(`</${name}`, gt);
      if (close === -1) break; // unclosed: drop the rest
      const closeGt = html.indexOf('>', close);
      if (closeGt === -1) break;
      i = closeGt + 1;
      continue;
    }
    i = gt + 1;
  }
  return collapse(decodeEntities(out.join('')));
}

// Reads at most maxChars of the body and cancels the stream, so a huge page cannot exhaust Worker memory.
async function readCapped(res: Response, maxChars: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length >= maxChars) break;
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
  return text.slice(0, maxChars);
}

async function load(doFetch: typeof fetch, startUrl: string): Promise<FetchPageResult> {
  let current = checkUrl(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (typeof current === 'string') return { error: current };
    const res = await doFetch(current.href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'text/html,text/plain;q=0.9', 'user-agent': 'EngagingSalesAssistant/1.0' },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      void res.body?.cancel();
      if (!loc) return { error: 'redirect without location' };
      current = checkUrl(loc, current.href);
      continue;
    }
    if (!res.ok) {
      void res.body?.cancel();
      return { error: `fetch failed with status ${res.status}` };
    }
    const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
    if (type !== 'text/html' && type !== 'text/plain') {
      void res.body?.cancel();
      return { error: `unsupported content type: ${type || 'unknown'}` };
    }
    const raw = await readCapped(res, MAX_RAW_CHARS);
    const isHtml = type === 'text/html';
    return {
      url: current.href,
      title: isHtml ? extractTitle(raw) : '',
      text: (isHtml ? htmlToText(raw) : collapse(raw)).slice(0, MAX_CHARS),
    };
  }
  return { error: 'too many redirects' };
}

/** Build a new tool every turn: the use counter is per instance. */
export function fetchPageTool(opts: { fetch?: typeof fetch; maxUses?: number } = {}) {
  const doFetch = opts.fetch ?? fetch;
  const maxUses = opts.maxUses ?? 2;
  let uses = 0;
  return tool({
    description:
      "Fetch a web page (http or https) and return its title and readable text. Use it to read a prospect's website before classifying their industry.",
    inputSchema,
    execute: async ({ url }): Promise<FetchPageResult> => {
      if (uses >= maxUses) return { error: 'fetch limit reached' };
      uses++;
      try {
        return await load(doFetch, url);
      } catch (e) {
        return { error: `fetch failed: ${e instanceof Error ? e.message : String(e)}` };
      }
    },
  });
}
