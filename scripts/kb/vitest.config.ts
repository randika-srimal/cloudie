import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'kb',
    include: ['test/**/*.test.ts'],
  },
});
