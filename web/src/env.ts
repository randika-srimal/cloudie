// Environment variables the website reads, made available by SvelteKit as `$app/env/public` (see
// https://svelte.dev/docs/kit/environment-variables). Values come from the build environment or web/.env.
import { defineEnvVars } from '@sveltejs/kit/env';

/** Cloudflare's always-pass Turnstile test sitekey; pairs with the test secret in backend/api/.dev.vars. */
const TEST_SITEKEY = '1x00000000000000000000AA';

export const variables = defineEnvVars({
  PUBLIC_TURNSTILE_SITEKEY: {
    public: true,
    // Inlined into the bundle at build time (the page is prerendered and served as static files).
    static: true,
    description:
      'Turnstile sitekey for the chat page; set at build time from the Terraform output.',
    schema: (value) => {
      if (value) return value;
      // A production build with the test key would fail every siteverify, so refuse to build without it.
      if (import.meta.env.MODE === 'production') {
        throw new Error('PUBLIC_TURNSTILE_SITEKEY must be set for a production build');
      }
      return TEST_SITEKEY;
    },
  },
});
