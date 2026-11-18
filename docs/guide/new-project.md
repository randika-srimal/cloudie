# Start a new project

How to turn this starter into your own project. Do it once, before the first deploy: the Pages project name cannot
change after it is live.

## 1. Copy the starter

```bash
git clone <this repo> acme-notes
cd acme-notes
rm -rf .git && git init -b main
```

Or use GitHub's **Use this template** button if the starter is a template repository.

## 2. Rename it

```bash
./cli.sh rename
```

It asks for the project name and rewrites the repo:

| Asks for     | Example      | Changes                                                                                                                                                                       |
| ------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project name | `acme-notes` | Package names (`@acme-notes/protocol`), Pages project (`acme-notes.pages.dev`), Terraform state bucket, API token names, Docker image names, page titles, `AcmeNotes` in code |

It also refreshes `pnpm-lock.yaml` for the new package names and re-formats the Markdown tables. Then:

```bash
git diff                  # review what changed
./cli.sh check-all        # typecheck, lint, test
```

Display names (`Acme Notes` with a space) are worth a manual pass: `web/src/routes/+page.svelte`.

## 3. Make it yours

| What                  | Where                                                       |
| --------------------- | ----------------------------------------------------------- |
| Brand colours         | `web/src/app.css` (`@theme`)                                |
| Favicon               | `web/static/favicon.svg`                                    |
| Custom domain         | `backend/infra/variables.tf`: `zone_name`, `custom_domains` |
| Rules for Claude Code | `CLAUDE.md`                                                 |

## 4. Run and deploy

- [Run it locally](local-development.md)
- [Deploy to Cloudflare](../operations/deploy.md): `./cli.sh first-setup` creates everything on a new account.
