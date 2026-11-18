# Cloudie

A starter for projects that run on **Cloudflare Pages**, with an optional **Flutter** app for Android and iOS.
Out of the box it is a hello-world page and one API route, wired end to end: the same layout, tooling and
project CLI as Morse, with nothing project-specific left in.

| Part           | What it is                                                                                   | Where                                   |
| -------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- |
| Website        | SvelteKit 3 (Svelte 5), prerendered to static files, Tailwind CSS 4                          | `web/`                                  |
| API            | Cloudflare Pages Functions: TypeScript files that become routes under `/api`                 | `backend/api/functions/`                |
| Shared types   | Zod schemas for every API reply, used by the API, the website and the tests                  | `shared/protocol/`                      |
| Infrastructure | Terraform (Cloudflare provider v5): the Pages project, custom domains, DNS                   | `backend/infra/`                        |
| Mobile app     | One Flutter project for Android and iOS, calling the same `/api` routes                      | `mobile/`                               |
| Tooling        | Docker dev stack, gum menu CLI, Vitest (in workerd), Playwright, ESLint, Prettier, GitHub CI | `cli.sh`, `scripts/`, `docker/`, `e2e/` |

Your computer only needs **Docker** (and Git Bash on Windows). Node, pnpm, Wrangler, Terraform, gum and Flutter
all run in containers.

## Where to start

| You want to…                                | Read                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| Make a new project from this starter        | [Start a new project](guide/new-project.md)            |
| Run the site on your computer               | [Run it locally](guide/local-development.md)           |
| See every command                           | [The project CLI](guide/cli.md)                        |
| Understand what runs where                  | [Architecture and resources](architecture/overview.md) |
| Add a page, a route, a database or a secret | [Adding features](architecture/adding-features.md)     |
| Put it on the internet                      | [Deploy to Cloudflare](operations/deploy.md)           |
| Build the Android app, or the iOS one       | [Mobile app](guide/mobile.md)                          |

## Quick start

```bash
./cli.sh up
```

Then open <http://localhost:5173> (the site), <http://localhost:8788/api/hello> (the API) and
<http://localhost:3000> (these docs). `./cli.sh` with no arguments opens the menu.

## Versions

Chosen as the newest stable releases in November 2026. `./cli.sh outdated` lists what has moved on since.

| Tool                            | Version          | Pinned in                                                               |
| ------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| Node.js                         | 26               | `.nvmrc`, `docker/Dockerfile.dev`                                       |
| pnpm                            | 12.21            | `package.json` (`packageManager`), Dockerfile                           |
| SvelteKit / Svelte / Vite       | 3.3 / 5.58 / 8.3 | `web/package.json`                                                      |
| Tailwind CSS                    | 4.3              | `web/package.json`                                                      |
| TypeScript                      | 6.0              | every `package.json` (7.0 waits for svelte-check and typescript-eslint) |
| Wrangler                        | 4.164            | `backend/api/package.json`                                              |
| Vitest                          | 5.1              | root and package `package.json`                                         |
| ESLint                          | 10               | root `package.json`                                                     |
| Zod                             | 4.6 (`zod/mini`) | `shared/protocol/package.json`                                          |
| Terraform / Cloudflare provider | 1.17 / 5.29      | `docker/Dockerfile.dev`, `backend/infra/versions.tf`                    |
| Flutter / Dart                  | 3.50 / 3.14      | `docker/flutter.Dockerfile`, `mobile/pubspec.yaml`                      |
| gum                             | 2.0              | `docker/Dockerfile.dev`                                                 |
| Playwright                      | 1.65             | `e2e/package.json`, `docker-compose.yml`                                |
