# Cloudie

Engaging's **sales assistant** on Cloudflare: a chat page (`/chat`) that HubSpot embeds, answering sales reps'
questions from a case-study knowledge base through a model behind AI Gateway. Built on the Cloudie starter for
**Cloudflare Pages** projects, with the tooling a real project needs from day one:

- **web/**: SvelteKit 3 + Svelte 5, prerendered to static files, Tailwind CSS 4
- **backend/api/**: Cloudflare Pages Functions (TypeScript), tested inside workerd; `/agents/*` is the guarded chat proxy
- **backend/agent/**: the agent Worker (Cloudflare Agents SDK Durable Object per chat, AI SDK through AI Gateway)
- **knowledge/**: the knowledge base, one markdown file per case study, published to R2 without a deploy
- **backend/infra/**: Terraform for the Pages project, domains, DNS, KV, R2, AI Gateway and Turnstile, state in R2
- **shared/protocol/**: Zod schemas shared by the API, the website and tests
- **./cli.sh**: one gum-powered menu for every command
- **Docker** dev stack: your computer only needs Docker

## Start

```bash
./cli.sh up      # site http://localhost:5173 (chat at /chat) · API http://localhost:8788/api/hello · docs http://localhost:3000
./cli.sh kb-publish-local   # give the local assistant a knowledge base (it answers "echo: …" locally)
./cli.sh         # the project menu
```

New project from this starter: `./cli.sh rename`, then see [docs/guide/new-project.md](docs/guide/new-project.md).

## Commands

| Command                | Does                                                |
| ---------------------- | --------------------------------------------------- |
| `./cli.sh up` / `down` | Start or stop the dev stack                         |
| `./cli.sh check-all`   | Typecheck, lint, tests                              |
| `./cli.sh e2e`         | Playwright end-to-end tests                         |
| `./cli.sh first-setup` | Everything on a new Cloudflare account              |
| `./cli.sh deploy`      | Terraform (if changed), build, deploy, health check |
| `./cli.sh kb-check`    | Check the knowledge base                            |
| `./cli.sh ai-config`   | Change the assistant's model or `kbVersion`         |
| `./cli.sh help`        | Every action                                        |

## Docs

`docs/` is a docsify site, served at <http://localhost:3000> by the dev stack. Start at
[docs/README.md](docs/README.md); running the assistant is [docs/guide/assistant.md](docs/guide/assistant.md).

## Layout

```
cli.sh                  entry point (host side)
scripts/                cli.sh (gum menu), tf.sh, tokens.sh, rename.sh, docs-serve.mjs, kb/ (knowledge base check, build, publish)
docker/                 Dockerfile.dev, dev-entrypoint.sh
docker-compose.yml      app, docs, e2e
web/                    SvelteKit site, incl. the chat page (src/routes/chat)
backend/api/            Pages Functions + wrangler.toml
backend/agent/          the agent Worker + its wrangler.toml
knowledge/              the assistant's knowledge base
backend/infra/          Terraform
shared/protocol/        Zod schemas
e2e/                    Playwright tests
docs/                   developer docs
```
