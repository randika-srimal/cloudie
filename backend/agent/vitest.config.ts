import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// The agent Worker's tests run inside workerd with in-memory KV, R2 and the SalesAgent Durable Object.
export default defineConfig({
  plugins: [
    cloudflareTest({
      main: './src/index.ts',
      miniflare: {
        compatibilityDate: '2026-11-01',
        compatibilityFlags: ['nodejs_compat'],
        kvNamespaces: ['CONFIG'],
        r2Buckets: ['KB'],
        durableObjects: { SalesAgent: 'SalesAgent' },
        bindings: { MOCK_MODEL: 'echo', AI_GATEWAY_URL: 'http://gw.test' },
      },
    }),
  ],
  test: {
    name: 'agent',
    include: ['test/**/*.test.ts'],
  },
});
