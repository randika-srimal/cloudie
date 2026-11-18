# Troubleshooting

| Symptom                                                   | Cause and fix                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `Bind for 0.0.0.0:3000 failed: port is already allocated` | Another project uses the port. `cp .env.example .env` and change `WEB_PORT`, `API_PORT`, `DOCS_PORT`                     |
| The page says “The API is not answering”                  | Wrangler isn't up yet or crashed: `./cli.sh logs-dev`                                                                    |
| Edits don't reload (Windows, macOS)                       | Set `CHOKIDAR_USEPOLLING=true` in `.env`, then `./cli.sh up`                                                             |
| `ERR_PNPM_OUTDATED_LOCKFILE` on start                     | A `package.json` changed without the lockfile: `./cli.sh install` and commit `pnpm-lock.yaml`                            |
| `ERR_PNPM_IGNORED_BUILDS`                                 | A new package wants an install script. If you trust it, add it to `allowBuilds` in `pnpm-workspace.yaml`                 |
| pnpm refuses a just-released version                      | pnpm blocks versions under a day old. Wait, or add it to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`             |
| `tf: CLOUDFLARE_API_TOKEN is not set`                     | `./cli.sh tokens` first                                                                                                  |
| `terraform init failed`                                   | The state bucket doesn't exist yet (`./cli.sh infra-bootstrap`) or the R2 key is new: wait a minute                      |
| Deploy: `Project not found`                               | The Pages project doesn't exist: `./cli.sh infra-apply` (or let `deploy-pages` create it with a Pages Write token)       |
| Health check fails right after a custom domain was added  | Certificate still being issued: `./cli.sh infra-output` shows the status. Try the `pages.dev` address                    |
| `./cli.sh app …`: `No phone found over adb`               | `adb kill-server; adb -a start-server` on your computer, USB debugging on. Or use `./cli.sh app share`                   |
| Phone can't reach `--local` build                         | Same Wi-Fi as this computer, dev stack running, firewall allows port 8788 (or your `API_PORT`)                           |
| Gradle wants an SDK package                               | It downloads it once into the `android-sdk` volume. To bake it in, add it to `sdkmanager` in `docker/flutter.Dockerfile` |
| Start over locally                                        | `docker compose down -v` removes the volumes (packages, local data, caches); `./cli.sh up` rebuilds them                 |
