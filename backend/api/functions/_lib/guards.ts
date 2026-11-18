// Checks the /agents proxy runs before a chat connection reaches the agent Worker. Pure functions, no env.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Turnstile tokens are at most 2048 characters. */
const MAX_TOKEN = 2048;
/** How long a chat_pass cookie lasts: 12 hours. */
export const PASS_SECONDS = 43200;

/** `ALLOWED_ORIGINS` (comma-separated, e.g. "https://a.example, https://b.example") as a list. */
export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * True when the browser says the request comes from an allowed page: its `Origin` is in `allowed`, or (for a
 * same-origin GET, where browsers send no Origin) there is no Origin and `Sec-Fetch-Site` is `same-origin`.
 * Both headers are set by the browser and cannot be changed by page scripts. A request without either is refused.
 */
export function checkOrigin(req: Request, allowed: string[]): boolean {
  const origin = req.headers.get('Origin');
  if (origin !== null) return allowed.includes(origin);
  return req.headers.get('Sec-Fetch-Site') === 'same-origin';
}

/** Turnstile's published test secrets (1x00..AA, 2x00..AA, 3x00..AA): siteverify reports hostname example.com. */
const isTestSecret = (secret: string) => /^[123]x0{20,}/.test(secret);

/** The hostnames of `ALLOWED_ORIGINS` entries (e.g. "https://a.example" gives "a.example"); invalid entries are skipped. */
export function originHostnames(origins: string[]): string[] {
  return origins.flatMap((o) => {
    try {
      return [new URL(o).hostname];
    } catch {
      return [];
    }
  });
}

/**
 * Asks Turnstile's siteverify whether `token` is a fresh, valid challenge answer. False on any failure.
 * With `hostnames`, the reply's `hostname` (the page that ran the widget) must also be one of them, so a token
 * solved on some other site that shares the widget's sitekey is refused. Not enforced for Turnstile's test secrets.
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string,
  fetchFn: typeof fetch = fetch,
  hostnames?: string[],
): Promise<boolean> {
  if (!token || token.length > MAX_TOKEN) return false;
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  body.set('remoteip', ip);
  try {
    const res = await fetchFn(SITEVERIFY, { method: 'POST', body });
    if (!res.ok) return false;
    const data: unknown = await res.json();
    if (typeof data !== 'object' || data === null || !('success' in data) || data.success !== true)
      return false;
    if (!hostnames || isTestSecret(secret)) return true;
    return (
      'hostname' in data && typeof data.hostname === 'string' && hostnames.includes(data.hostname)
    );
  } catch (e) {
    console.error('turnstile siteverify failed', String(e));
    return false;
  }
}

function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

function toBase64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function fromBase64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[\w-]+$/.test(s)) return null;
  try {
    const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** A chat_pass value valid for 12 hours from `now` (ms): `<expiry epoch seconds>.<base64url HMAC-SHA256(expiry)>`. */
export async function signPass(secret: string, now: number): Promise<string> {
  const expiry = String(Math.floor(now / 1000) + PASS_SECONDS);
  const sig = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret, 'sign'),
    new TextEncoder().encode(expiry),
  );
  return `${expiry}.${toBase64url(sig)}`;
}

/** True when `cookie` is a chat_pass value signed with `secret` that has not expired at `now` (ms). */
export async function verifyPass(
  cookie: string | null | undefined,
  secret: string,
  now: number,
): Promise<boolean> {
  const m = /^(\d{1,12})\.([\w-]+)$/.exec(cookie ?? '');
  if (!m || !secret) return false;
  const [, expiry, sig] = m as unknown as [string, string, string];
  if (Number(expiry) <= Math.floor(now / 1000)) return false;
  const bytes = fromBase64url(sig);
  if (!bytes) return false;
  // crypto.subtle.verify compares in constant time.
  return crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret, 'verify'),
    bytes,
    new TextEncoder().encode(expiry),
  );
}

/** The value of cookie `name` in the request's Cookie header, or null. */
export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('Cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
