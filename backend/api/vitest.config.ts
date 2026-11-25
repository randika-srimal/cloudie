import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// A stand-in for the agent Worker behind the AGENT service binding: fetch echoes what it was sent (or answers
// GET /status), and allowConnect uses a real rate limiter with the agent's CONNECT_LIMIT settings.
const FAKE_AGENT = `
import { WorkerEntrypoint } from 'cloudflare:workers';
export default class extends WorkerEntrypoint {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/status') return Response.json({ kbVersion: 'v-test', model: 'model-test' });
    return Response.json({
      url: request.url,
      method: request.method,
      ip: request.headers.get('cf-connecting-ip'),
      cookie: request.headers.get('Cookie'),
    });
  }
  async allowConnect(ip) {
    return (await this.env.CONNECT_LIMIT.limit({ key: ip })).success;
  }
  async allowUnlock(ip) {
    return (await this.env.UNLOCK_LIMIT.limit({ key: ip })).success;
  }
}`;

// Pages Functions tests run inside workerd, the same runtime as production.
// Add D1/R2/KV here (d1Databases, r2Buckets, kvNamespaces) when wrangler.toml gets them.
export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: '2026-11-01',
        bindings: {
          APP_VERSION: 'test',
          ALLOWED_ORIGINS: 'https://chat.test, http://localhost:5173',
          TURNSTILE_SECRET: 'turnstile-test-secret',
          PASS_SECRET: 'pass-test-secret',
          CHAT_PASSWORD: 'chat-test-password',
        },
        serviceBindings: { AGENT: 'fake-agent' },
        workers: [
          {
            name: 'fake-agent',
            modules: true,
            script: FAKE_AGENT,
            compatibilityDate: '2026-11-01',
            ratelimits: {
              CONNECT_LIMIT: { namespace_id: '1002', simple: { limit: 10, period: 60 } },
              UNLOCK_LIMIT: { namespace_id: '1003', simple: { limit: 5, period: 60 } },
            },
          },
        ],
      },
    }),
  ],
  test: {
    name: 'api',
    include: ['functions-test/**/*.test.ts'],
  },
});
