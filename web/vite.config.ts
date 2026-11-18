import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    // SvelteKit 3 takes its options here (there is no svelte.config.js any more).
    sveltekit({
      // Every page is prerendered to static HTML in web/build (see src/routes/+layout.ts), which
      // Cloudflare Pages serves from its CDN. For browser-only routes (e.g. /item/[id] with
      // `prerender = false`), add `fallback: '404.html'` here: SvelteKit then renders them client-side.
      adapter: adapter(),
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      // Docker on Windows/macOS: file events don't cross the bind mount, so poll
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
      ignored: ['**/.wrangler/**'],
    },
    // /api is served by the Pages Functions in `wrangler pages dev` (backend/api)
    proxy: {
      '/api': { target: 'http://localhost:8788', ws: true },
    },
  },
});
