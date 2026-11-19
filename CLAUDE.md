# Engaging Assistant: Cloudflare Pages starter

Docs: docs/README.md (docsify). Read the page for the area you change.

## Stack

- Node.js 26, pnpm 12 workspaces (web, backend/_, shared/_), TypeScript 6 strict everywhere
- web/: SvelteKit 3 (config lives in web/vite.config.ts; there is no svelte.config.js), Svelte 5 runes, Tailwind 4, adapter-static, every page prerendered
- backend/api: Pages Functions in backend/api/functions; its wrangler.toml deploys web/build and the functions as one Pages project
- backend/agent: the sales-assistant Worker engaging-assistant-agent (Agents SDK SalesAgent Durable Object, AI SDK through AI Gateway, config in KV, knowledge base in R2); docs/guide/assistant.md
- knowledge/: the assistant's knowledge base (one markdown file per case study), built and published by scripts/kb, separately from code deploys
- shared/protocol: Zod (zod/mini) schemas for every API reply, imported by the API, the website and tests
- backend/infra/: Terraform (Cloudflare provider v5) owns the Pages project, domains, DNS, KV, R2, AI Gateway, Turnstile; state in R2. Wrangler owns code, secrets, bindings, migrations

## Commands (always inside the containers)

- Dev stack: ./cli.sh up (site :5173, API :8788, docs :3000; ports from .env)
- Shell: docker compose exec app <cmd>
- Tests: docker compose exec -T app pnpm test
- Typecheck: docker compose exec -T app pnpm typecheck
- Lint: docker compose exec -T app pnpm lint
- E2E: ./cli.sh e2e [filter] (publishes the knowledge base to local KV/R2 first; the agent runs MOCK_MODEL=echo locally)
- Knowledge base: docker compose exec -T app pnpm kb:check; ./cli.sh kb-publish-local (dev stack)
- Assistant (production, only when I ask): ./cli.sh kb-publish | ai-config | set-agent-secret NAME
- Terraform: docker compose exec -T app pnpm tf fmt | validate | plan (apply only when I ask)

Don't run pnpm/node/wrangler/terraform on the host.

## Rules

- Every new API route: schema in shared/protocol, Function in backend/api/functions, test in backend/api/functions-test
- Errors from Functions are `{ "error": "..." }` via error() in functions/_lib/http.ts
- Secrets never go in wrangler.toml or the repo; they go through ./cli.sh set-secret and .dev.vars
- A new binding needs: the Terraform resource, the wrangler.toml binding, Env in functions/_lib/env.ts, the test config, and the deploy token permission in scripts/tokens.sh
- New CLI commands go in scripts/cli.sh as act_<name> plus a MENU_* line
- Knowledge base changes go through knowledge/ (see knowledge/README.md) and must pass pnpm kb:check; never upload to the R2 bucket by hand
- The agent Worker is reachable only through the Pages proxy functions/agents/[[path]].ts (AGENT service binding); keep workers_dev = false and preview_urls = false
- Never run anything with --remote, wrangler deploy or pages deploy unless I ask

## Docs

Developer docs live in docs/ (docsify; add new pages to docs/_sidebar.md). Plain sentences with the real
technical terms, defined the first time (or in the glossary in docs/architecture/overview.md). Tables for lists,
mermaid for flows, one copy of each fact. When a change adds or rewires a resource, binding, route or outside
service, update docs/architecture/overview.md in the same change.

## Definition of done

typecheck, lint and tests pass.
