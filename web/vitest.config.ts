import { defineConfig } from 'vitest/config';

// Unit tests for the website's plain TypeScript (no Svelte components). jsdom gives DOMPurify a DOM.
export default defineConfig({
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
});
