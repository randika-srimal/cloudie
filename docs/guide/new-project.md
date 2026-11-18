# Start a new project

How to turn this starter into your own project. Do it once, before the first deploy: the Pages project name,
the Android app id and the iOS bundle id cannot change after they are live.

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

It asks for two things and rewrites the repo:

| Asks for       | Example       | Changes                                                                                                                                                                       |
| -------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project name   | `acme-notes`  | Package names (`@acme-notes/protocol`), Pages project (`acme-notes.pages.dev`), Terraform state bucket, API token names, Docker image names, page titles, `AcmeNotes` in code |
| Mobile app org | `com.example` | Android `applicationId` and iOS bundle id: `com.example.acme_notes`; the Kotlin source folder moves                                                                           |

Then:

It also refreshes `pnpm-lock.yaml` for the new package names and re-formats the Markdown tables. Then:

```bash
git diff                  # review what changed
./cli.sh check-all        # typecheck, lint, test
./cli.sh app analyze      # the Flutter app still builds
```

Display names (`Acme Notes` with a space) are worth a manual pass: `web/src/routes/+page.svelte`,
`mobile/lib/main.dart`, `mobile/android/app/src/main/AndroidManifest.xml` (`android:label`) and
`mobile/ios/Runner/Info.plist` (`CFBundleDisplayName`).

## 3. Make it yours

| What                         | Where                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand colours                | `web/src/app.css` (`@theme`), `mobile/lib/main.dart` (`seed`)                                                                                                 |
| Favicon                      | `web/static/favicon.svg`                                                                                                                                      |
| App icon and splash          | `mobile/assets/branding/icon.png`, `icon-foreground.png`, then `./cli.sh app icons`                                                                           |
| Custom domain                | `backend/infra/variables.tf`: `zone_name`, `custom_domains`                                                                                                   |
| Deployed address for the app | `mobile/lib/config.dart` (`apiOrigin`), `docker/app.sh` (`deployed_origin`)                                                                                   |
| Rules for Claude Code        | `CLAUDE.md`                                                                                                                                                   |
| Remove what you don't need   | No mobile app? Delete `mobile/`, the `flutter`/`share` services in `docker-compose.yml`, `docker/flutter.Dockerfile`, `docker/app.sh` and the `mobile` CI job |

## 4. Run and deploy

- [Run it locally](local-development.md)
- [Deploy to Cloudflare](../operations/deploy.md): `./cli.sh first-setup` creates everything on a new account.
