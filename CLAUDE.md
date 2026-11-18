# Cloudie: Cloudflare Pages starter + Flutter app

Docs: docs/README.md (docsify). Read the page for the area you change.

## Stack

- Node.js 26, pnpm 12 workspaces (web, backend/_, shared/_), TypeScript 6 strict everywhere
- web/: SvelteKit 3 (config lives in web/vite.config.ts; there is no svelte.config.js), Svelte 5 runes, Tailwind 4, adapter-static, every page prerendered
- backend/api: Pages Functions in backend/api/functions; its wrangler.toml deploys web/build and the functions as one Pages project
- shared/protocol: Zod (zod/mini) schemas for every API reply, imported by the API, the website and tests
- backend/infra/: Terraform (Cloudflare provider v5) owns the Pages project, domains, DNS; state in R2. Wrangler owns code, secrets, bindings, migrations
- mobile/: one Flutter project for Android and iOS. Plain ChangeNotifier state, go_router, package:http; screens in lib/features/<name>/. Reply classes in lib/api/client.dart mirror shared/protocol

## Commands (always inside the containers)

- Dev stack: ./cli.sh up (site :5173, API :8788, docs :3000; ports from .env)
- Shell: docker compose exec app <cmd>
- Tests: docker compose exec -T app pnpm test
- Typecheck: docker compose exec -T app pnpm typecheck
- Lint: docker compose exec -T app pnpm lint
- E2E: ./cli.sh e2e [filter]
- Terraform: docker compose exec -T app pnpm tf fmt | validate | plan (apply only when I ask)
- Mobile: ./cli.sh app analyze | test | apk [--local|--usb]

Don't run pnpm/node/wrangler/terraform/flutter on the host.

## Rules

- Every new API route: schema in shared/protocol, Function in backend/api/functions, test in backend/api/functions-test, Dart class in mobile/lib/api/client.dart
- Errors from Functions are `{ "error": "..." }` via error() in functions/_lib/http.ts
- Secrets never go in wrangler.toml or the repo; they go through ./cli.sh set-secret and .dev.vars
- A new binding needs: the Terraform resource, the wrangler.toml binding, Env in functions/_lib/env.ts, the test config, and the deploy token permission in scripts/tokens.sh
- New CLI commands go in scripts/cli.sh as act_<name> plus a MENU_* line
- Never run anything with --remote, wrangler deploy or pages deploy unless I ask

## Docs

Developer docs live in docs/ (docsify; add new pages to docs/_sidebar.md). Plain sentences with the real
technical terms, defined the first time (or in the glossary in docs/architecture/overview.md). Tables for lists,
mermaid for flows, one copy of each fact. When a change adds or rewires a resource, binding, route or outside
service, update docs/architecture/overview.md in the same change.

## Definition of done

typecheck, lint and tests pass (and ./cli.sh app analyze + test when mobile/ changed).
