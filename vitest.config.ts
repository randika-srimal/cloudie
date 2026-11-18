import { defineConfig } from 'vitest/config';

// One Vitest run for the whole repo; each project has its own vitest.config.ts.
export default defineConfig({
  test: {
    projects: ['shared/protocol', 'backend/api', 'backend/agent', 'web', 'scripts/kb'],
  },
});
