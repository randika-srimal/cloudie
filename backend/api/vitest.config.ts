import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Pages Functions tests run inside workerd, the same runtime as production.
// Add D1/R2/KV here (d1Databases, r2Buckets, kvNamespaces) when wrangler.toml gets them.
export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: '2026-11-01',
        bindings: { APP_VERSION: 'test' },
      },
    }),
  ],
  test: {
    name: 'api',
    include: ['functions-test/**/*.test.ts'],
  },
});
