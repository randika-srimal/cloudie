# Cloudie

A starter for **Cloudflare Pages** projects. It ships a
hello-world page and one API route, wired end to end, with the tooling a real project needs from day one:

- **web/**: SvelteKit 3 + Svelte 5, prerendered to static files, Tailwind CSS 4
- **backend/api/**: Cloudflare Pages Functions (TypeScript), tested inside workerd
- **backend/infra/**: Terraform for the Pages project, domains and DNS, state in R2
- **shared/protocol/**: Zod schemas shared by the API, the website and tests
- **./cli.sh**: one gum-powered menu for every command
- **Docker** dev stack: your computer only needs Docker

## Start

```bash
./cli.sh up      # site http://localhost:5173 · API http://localhost:8788/api/hello · docs http://localhost:3000
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
| `./cli.sh help`        | Every action                                        |

## Docs

`docs/` is a docsify site, served at <http://localhost:3000> by the dev stack. Start at
[docs/README.md](docs/README.md).

## Layout

```
cli.sh                  entry point (host side)
scripts/                cli.sh (gum menu), tf.sh, tokens.sh, rename.sh, docs-serve.mjs
docker/                 Dockerfile.dev, dev-entrypoint.sh
docker-compose.yml      app, docs, e2e
web/                    SvelteKit site
backend/api/            Pages Functions + wrangler.toml
backend/infra/          Terraform
shared/protocol/        Zod schemas
e2e/                    Playwright tests
docs/                   developer docs
```
